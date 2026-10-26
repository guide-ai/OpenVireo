/**
 * R-RX15 verified browser Save of the current MEMORY capture (docs/PULSAR-SAVE-VERIFIED.md, WEB-SAVE-01..08). Pure TypeScript:
 * no React, DOM, clock or storage. The browser calls live in src/components/pulsarSaveHost.ts.
 *
 * Recovered statically (CLEA_VEO.exe SHA-256 781bc970…c54c, RECOVERED-CONTRACT.json): [S] SAVE-WRITTEN, the writer 0x56a518
 * sets +0x97 and the name +0x9a only after close 0x403bc8 and the I/O check 0x4030f8 (0x56a838..0x56a868); [S]
 * SAVE-ORIGIN-INDEPENDENT, +0x96 is not stored by the writer; [S] SAVE-EXTENSION, the caller 0x56b36c warns when the name
 * does not end in .PLR (caption 0x56b798, text 0x56b6ec, MessageBoxA flags 0x23: Yes reopens the chooser, No writes,
 * Cancel writes nothing). That warning is not an overwrite question.
 * WEB policy [W]: the bytes are the R-RX14 canonical bytes (same refusals and rounding); the browser chooses one file; a
 * name without .PLR, or ".PLR" with an empty stem (the non-empty stem is web policy, not a recovered native predicate), is
 * not written (only "choose again" or Cancel: the native No path is not offered); the receipt needs
 * write, close and an exact fresh read-back while the claimed data is still current. No native dialog, default, path,
 * code page, x87, FPU, locale or durability equivalence is claimed.
 */
import { RAW_EXPORT_FILE_NAME, rawExportRequest, type RawExportSession } from './pulsarRawExport';
import { pulsarWriteClaim, type PulsarCurrentData, type PulsarWriteClaim, type PulsarWriteRefusal } from './pulsarCurrentData';
import { PLR_MAX_BYTES } from './pulsarRecording';

/** WEB-SAVE-05 read-back bound: the strict .PLR reader limit itself (PLR_MAX_BYTES, pulsarRecording.ts), named here for
 *  Save owners that must not import the PLR reader (the R-RX16 Radio arming Save). Not a separate number. */
export const PULSAR_SAVE_READBACK_MAX_BYTES: number = PLR_MAX_BYTES;

export type PulsarSaveSupport = 'ok' | 'insecure-context' | 'no-api';
/** WEB-SAVE-01: a secure context, a callable showSaveFilePicker and FileSystemFileHandle.prototype.createWritable. */
export function pulsarSaveSupport(env: Readonly<{ secure: boolean; picker: boolean; writable: boolean }>): PulsarSaveSupport {
  if (env.secure !== true) return 'insecure-context';
  return env.picker === true && env.writable === true ? 'ok' : 'no-api';
}

/**
 * WEB-SAVE-02 picker options: the R-RX14 suggested name and one .PLR type. No `id` and no `startIn`, so no directory is
 * remembered or suggested; nothing is reused between attempts.
 */
export const PULSAR_SAVE_PICKER_OPTIONS = Object.freeze({
  suggestedName: RAW_EXPORT_FILE_NAME,
  types: Object.freeze([Object.freeze({ description: '.PLR', accept: Object.freeze({ 'application/octet-stream': Object.freeze(['.PLR']) }) })]),
});

/**
 * [W] rule derived from [S] SAVE-EXTENSION: the name ends in ".plr" (ASCII case-insensitive) after at least one character.
 * The non-empty stem is web policy, not a recovered native predicate.
 */
export function pulsarSaveExtensionOk(name: string): boolean {
  return typeof name === 'string' && name.length > 4 && name.slice(-4).toLowerCase() === '.plr';
}

export type PulsarSavePhase = 'picking' | 'writing' | 'closing' | 'reading';
export type PulsarSaveFailure =
  | 'picker-cancelled' | 'picker-refused' | 'extension' | 'write-failed' | 'close-failed' | 'readback-failed' | 'readback-too-large' | 'file-name' | 'abandoned' | 'unverified';
/**
 * The phase or result of one Save attempt, shown in the dialog. fileName: the chosen file's basename once the picker
 * returned (null before). 'mismatch': the read-back differs or could not be compared with current data; 'verified-stale':
 * the read-back equals the bytes of the data as it was when Save was pressed, but the current data changed meanwhile, so
 * nothing is marked. 'verified' is the success: normally the Save dialog closes and the status announces it. When a
 * foreign modal is open (or the dialog is not presented) the session stays open with this 'verified' notice and the status
 * is still announced. The receipt already exists then; a later neutral Cancel or Escape closes the dialog and does not undo it.
 */
export type PulsarSaveNotice =
  | Readonly<{ code: PulsarSavePhase | PulsarSaveFailure | 'verified'; fileName: string | null }>
  | Readonly<{ code: 'mismatch' | 'verified-stale'; fileName: string | null; reason: PulsarWriteRefusal }>;
export const PULSAR_SAVE_PENDING: ReadonlySet<PulsarSaveNotice['code']> = new Set(['picking', 'writing', 'closing', 'reading']);

export type PulsarSaveBegin =
  | Readonly<{ kind: 'claim'; claim: PulsarWriteClaim; rowCount: number }>
  | Readonly<{ kind: 'refused'; session: RawExportSession }>;
/**
 * Save request. R-RX14's order applies unchanged (rawExportRequest: not-ready, stale, a fresh build and its problem, preview
 * equality), then an owned claim of the current memory capture and the fresh text, taken in the same task. A claim that
 * cannot be taken is refused as 'stale'. Nothing in the document changes.
 */
export function pulsarSaveBegin(s: RawExportSession, doc: PulsarCurrentData, ready: boolean): PulsarSaveBegin {
  const r = rawExportRequest(s, { data: doc.data, generation: doc.generation, ready });
  if (r.kind === 'refused') return r;
  const claim = pulsarWriteClaim(doc, r.text);
  if (!claim) return Object.freeze({ kind: 'refused', session: Object.freeze({ ...s, refusal: Object.freeze({ code: 'stale' as const }), failure: false }) });
  return Object.freeze({ kind: 'claim', claim, rowCount: r.rowCount });
}

/**
 * The notice after a read-back reached recordPulsarWrittenCopy and was refused. A size or byte refusal is a mismatch; a
 * file-name refusal is 'file-name'; a lease, newer data or a mutated source is 'verified-stale' when the read-back still
 * equals the claim's bytes (pulsarClaimReadback 'ok'), otherwise a mismatch.
 */
export function pulsarSaveRefusalNotice(reason: PulsarWriteRefusal, readback: 'ok' | 'readback-size' | 'readback-bytes', fileName: string): PulsarSaveNotice {
  if (reason === 'file-name') return Object.freeze({ code: 'file-name', fileName });
  if (reason === 'readback-size' || reason === 'readback-bytes' || reason === 'claim' || readback !== 'ok') return Object.freeze({ code: 'mismatch', fileName, reason });
  return Object.freeze({ code: 'verified-stale', fileName, reason });
}
