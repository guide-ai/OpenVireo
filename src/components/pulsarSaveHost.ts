/**
 * R-RX15 browser I/O of the verified Save (docs/PULSAR-SAVE-VERIFIED.md, WEB-SAVE-03..06). React-independent: the component
 * supplies liveness and phase callbacks and commits the result through the pure core (src/core/pulsarCurrentData.ts).
 *
 * Primary APIs: showSaveFilePicker (https://wicg.github.io/file-system-access/#api-showsavefilepicker) returns one
 * user-chosen handle and may already create or clear that file before it resolves; createWritable / write / close
 * (https://fs.spec.whatwg.org/#api-filesystemfilehandle-createwritable) stage output that becomes visible at close; getFile
 * gives a fresh read-back. No fsync, physical durability or rollback is claimed: after close the file may hold the new
 * bytes even if the attempt is later reported as not verified.
 *
 * Liveness is checked after every await and before every new filesystem stage: a dead continuation never creates a
 * writable after the picker, aborts a stream that is open and not yet closing, and returns 'dead' only after that cleanup
 * settled. A rejected close() is followed by one awaited best-effort abort() on any path; whether the provider then released
 * the stream is not claimed when that abort also rejects. No retry, permission request, directory access or persisted handle.
 */
import { PULSAR_SAVE_PICKER_OPTIONS, pulsarSaveExtensionOk, pulsarSaveSupport, type PulsarSavePhase, type PulsarSaveSupport } from '../core/pulsarSavedCopy';

/** The parts of FileSystemWritableFileStream used here. */
export type SaveWritable = Readonly<{ write: (data: Uint8Array<ArrayBuffer>) => Promise<void>; close: () => Promise<void>; abort: (reason?: unknown) => Promise<void> }>;
/** The parts of a FileSystemFileHandle used here. */
export type SaveHandle = Readonly<{ name: string; createWritable: () => Promise<SaveWritable>; getFile: () => Promise<Readonly<{ size: number; arrayBuffer: () => Promise<ArrayBuffer> }>> }>;
type PickerWindow = Readonly<{ showSaveFilePicker?: unknown }>;

/** Feature detection for WEB-SAVE-01; reads only globals, changes nothing. */
export function browserPulsarSaveSupport(g: typeof globalThis = globalThis): PulsarSaveSupport {
  const handle: unknown = (g as { FileSystemFileHandle?: unknown }).FileSystemFileHandle;
  const proto: unknown = typeof handle === 'function' ? (handle as { prototype?: unknown }).prototype : undefined;
  return pulsarSaveSupport({
    secure: (g as { isSecureContext?: unknown }).isSecureContext === true,
    picker: typeof (g as PickerWindow).showSaveFilePicker === 'function',
    writable: typeof proto === 'object' && proto !== null && 'createWritable' in proto,
  });
}

/**
 * Calls the picker synchronously (it needs the click's user activation, so the caller must not await anything first).
 * A synchronous throw or a missing function is 'refused'; the returned promise is not awaited here.
 */
export function invokePulsarSavePicker(w: object): Readonly<{ ok: true; picked: Promise<SaveHandle> }> | Readonly<{ ok: false }> {
  // `object` plus `in` narrowing: the DOM Window type has no showSaveFilePicker, so a weak picker type would not accept it.
  const picker: unknown = 'showSaveFilePicker' in w ? w.showSaveFilePicker : undefined;
  if (typeof picker !== 'function') return { ok: false };
  try {
    return { ok: true, picked: Promise.resolve(picker.call(w, PULSAR_SAVE_PICKER_OPTIONS) as Promise<SaveHandle>) };
  } catch {
    return { ok: false };
  }
}

export type PulsarSaveIo = Readonly<{
  /** The attempt still belongs to a shown, active, mounted panel with the same attempt token. */
  live: () => boolean;
  /** A new phase started (called only while live). */
  phase: (code: Exclude<PulsarSavePhase, 'picking'>, fileName: string) => void;
}>;
export type PulsarSaveHostResult =
  | Readonly<{ kind: 'dead' }>
  | Readonly<{ kind: 'picker-cancelled' | 'picker-refused' }>
  | Readonly<{ kind: 'extension' | 'write-failed' | 'close-failed' | 'readback-failed' | 'readback-too-large'; fileName: string }>
  | Readonly<{ kind: 'readback'; fileName: string; bytes: Uint8Array }>;

const isAbort = (e: unknown) => typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';
/** Abort an open stream and wait for it to settle; its own errors are not reported (nothing else to release). */
async function abortQuietly(stream: SaveWritable) {
  try { await stream.abort(); } catch { /* already errored or closed */ }
}

/**
 * The rest of one attempt after the synchronous picker call: the chosen handle, the extension rule, one writable, one write
 * of fresh payload bytes, close, then getFile with its size bounded by maxBytes before arrayBuffer. Every failure returns
 * once; nothing is retried, deleted or repaired. 'dead' means the attempt was abandoned and any open stream was aborted.
 */
export async function continuePulsarSave(picked: Promise<SaveHandle>, payload: () => Uint8Array<ArrayBuffer>, maxBytes: number, io: PulsarSaveIo): Promise<PulsarSaveHostResult> {
  const dead: PulsarSaveHostResult = { kind: 'dead' };
  let handle: SaveHandle;
  try {
    handle = await picked;
  } catch (e) {
    if (!io.live()) return dead;
    return { kind: isAbort(e) ? 'picker-cancelled' : 'picker-refused' };
  }
  if (!io.live()) return dead;
  const fileName = typeof handle?.name === 'string' ? handle.name : '';
  if (!pulsarSaveExtensionOk(fileName)) return { kind: 'extension', fileName };

  io.phase('writing', fileName);
  let stream: SaveWritable;
  try {
    stream = await handle.createWritable();
  } catch {
    return io.live() ? { kind: 'write-failed', fileName } : dead;
  }
  if (!io.live()) { await abortQuietly(stream); return dead; }
  try {
    await stream.write(payload());
  } catch {
    await abortQuietly(stream);
    return io.live() ? { kind: 'write-failed', fileName } : dead;
  }
  if (!io.live()) { await abortQuietly(stream); return dead; }

  io.phase('closing', fileName);
  try {
    await stream.close();
  } catch {
    // A rejected close may leave the stream writable: one best-effort abort, awaited before the result (and so before the
    // claim is released). The abort's own rejection is not reported over close-failed. Not a rollback.
    await abortQuietly(stream);
    return io.live() ? { kind: 'close-failed', fileName } : dead;
  }
  // From here the file may hold the new bytes: an abandoned attempt claims nothing and rolls nothing back.
  if (!io.live()) return dead;

  io.phase('reading', fileName);
  let file: Awaited<ReturnType<SaveHandle['getFile']>>;
  try {
    file = await handle.getFile();
  } catch {
    return io.live() ? { kind: 'readback-failed', fileName } : dead;
  }
  if (!io.live()) return dead;
  if (!(typeof file?.size === 'number' && file.size >= 0 && file.size <= maxBytes)) return { kind: 'readback-too-large', fileName };
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return io.live() ? { kind: 'readback-failed', fileName } : dead;
  }
  if (!io.live()) return dead;
  return { kind: 'readback', fileName, bytes: new Uint8Array(buffer) };
}
