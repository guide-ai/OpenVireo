/**
 * Raw .PLR download of the current MEMORY capture (R-RX14): a WEB download in the layout of the recovered PLR writer
 * 0x56a518, built from a model-generated receiver capture held in this tab.
 *
 * Contract and evidence: docs/PULSAR-RAW-EXPORT.md and docs/PULSAR-RAW-EXPORT-PROVENANCE.json (RAW-*, WEB-RAW-*).
 * - Recovered statically [S] (CLEA_VEO.exe SHA-256 781bc970…c54c, listing signal-write.asm): line 1 is the literal 0x56a8c0
 *   "'", the name ShortString, the literal 0x56a8c4 "'," and the Word and Byte at header +0x29/+0x2b through 0x40ac14 joined
 *   by 0x56a8d0 ","; line 2 the three frequencies (cells at or below the highest index through 0x486268 with 2 digits, the
 *   others the literal 0x56a8dc "0.0"); line 3 the three gains (3 digits, same rule); line 4 the start (8 digits) "," the
 *   interval (5 digits); then one line per row item with its three Doubles (3 digits each). 0x486268 passes 18 and the digit
 *   count to 0x40cf28 with AL = 2; reading that as FloatToStrF(ffFixed, 18, digits) is an inference [I].
 * - WEB policy [W]: every number goes through formatFixed (Number.prototype.toFixed on the binary64 value, '.' decimal mark,
 *   a rounded zero without '-'); CR LF after every line, including the last; the fixed download name
 *   openvireo-model-capture.PLR; only memory data; every refusal below fails closed and nothing is repaired. No native byte,
 *   x87, FPU, locale or line-terminator equivalence is claimed.
 * - Not ported: the writer's +0x97/+0x9a stores, its cursor calls and file handling, and the whole caller 0x56b36c (empty
 *   check, generated name, dialog, question, path store). The source data is never written to. R-RX15 reuses these bytes
 *   for the separate verified browser Save (pulsarSavedCopy.ts); a download here still never marks anything saved.
 * - The output passes the strict reader as a self-consistency check, not as a native oracle. The PLR layout has no field for
 *   the model origin: a re-imported copy is ordinary file data.
 * Pure TypeScript: no React, no DOM, no clock, no storage.
 */
import {
  admitPlrRecording, formatFixed, PLR_MAX_BYTES, PLR_MAX_NAME_CHARS, PLR_MAX_ROWS, PLR_RESERVED_NAME, PLR_VALUE_BOUNDS, type PlrReceiverIndex,
} from './pulsarRecording';
import { isMemoryData, type PulsarCurrentValue, type PulsarMemoryRecording } from './pulsarCurrentData';
// Type-only: pulsarSavedCopy imports this module at runtime, so there is no runtime cycle.
import type { PulsarSaveNotice } from './pulsarSavedCopy';

/** WEB: the fixed basename of every raw export. It names the model origin, which the PLR layout cannot carry. */
export const RAW_EXPORT_FILE_NAME = 'openvireo-model-capture.PLR';
/** WEB: a generic binary type, so a browser does not add a text extension. */
export const RAW_EXPORT_MEDIA_TYPE = 'application/octet-stream';
/** WEB: the line terminator chosen for every line (the runtime flag of WriteLn 0x40460c is unknown). */
export const RAW_EXPORT_NEWLINE = '\r\n';
/** AnsiString 0x56a8dc, written for a frequency or gain cell above the highest recorded index. */
export const RAW_EXPORT_INACTIVE = '0.0';
/** Digit counts passed to 0x486268 at 0x56a67b, 0x56a6f8, 0x56a75d, 0x56a780 and 0x56a7e4. */
export const RAW_EXPORT_DIGITS = Object.freeze({ frequency: 2, gain: 3, start: 8, interval: 5, sample: 3 });
export const RAW_EXPORT_FIELDS = Object.freeze(['frequency1', 'frequency2', 'frequency3', 'gain1', 'gain2', 'gain3', 'start', 'interval'] as const);
export type RawExportField = typeof RAW_EXPORT_FIELDS[number];

/** row is the 1-based data row; channel and receiver are 0-based indexes; position is 1-based. */
export type RawExportProblem =
  | Readonly<{ code: 'not-memory' }> | Readonly<{ code: 'no-rows' }> | Readonly<{ code: 'too-many-rows'; count: number; max: number }> | Readonly<{ code: 'samples-shape' }>
  | Readonly<{ code: 'name-text'; position: number }> | Readonly<{ code: 'name-apostrophe'; position: number }>
  | Readonly<{ code: 'name-length'; length: number; max: number }> | Readonly<{ code: 'name-reserved' }>
  | Readonly<{ code: 'aperture' }> | Readonly<{ code: 'highest' }>
  | Readonly<{ code: 'metadata-missing'; field: RawExportField }> | Readonly<{ code: 'metadata-range'; field: RawExportField }>
  | Readonly<{ code: 'gain-zero'; receiver: PlrReceiverIndex }> | Readonly<{ code: 'interval-zero' }>
  | Readonly<{ code: 'sample-range'; row: number; channel: PlrReceiverIndex }> | Readonly<{ code: 'channel-erased'; receiver: PlrReceiverIndex }>
  | Readonly<{ code: 'too-large'; bytes: number; max: number }> | Readonly<{ code: 'profile' }>;
/**
 * What the decimal text loses. header: recorded fields whose written text reads back as a different number (inactive cells
 * are the 0.0 policy and are not listed). samplesChanged: samples in any column whose text reads back differently.
 * samplesZeroed: nonzero samples written as 0.000.
 */
export type RawExportLoss = Readonly<{ header: readonly RawExportField[]; samplesChanged: number; samplesZeroed: number }>;
export type RawExportBuild =
  | Readonly<{ ok: true; text: string; bytes: Uint8Array<ArrayBuffer>; rowCount: number; highestIndex: PlrReceiverIndex; loss: RawExportLoss }>
  | Readonly<{ ok: false; problem: RawExportProblem }>;

const fail = (problem: RawExportProblem): RawExportBuild => Object.freeze({ ok: false, problem: Object.freeze(problem) });
const RECEIVERS = [0, 1, 2] as const;
const field = (kind: 'frequency' | 'gain', i: PlrReceiverIndex) => `${kind}${i + 1}` as RawExportField;
/** null/undefined: missing. Anything else must be a finite number with |v| ≤ max. */
function metadataProblem(v: number | null | undefined, max: number, f: RawExportField): RawExportProblem | null {
  if (v === null || v === undefined) return { code: 'metadata-missing', field: f };
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max ? null : { code: 'metadata-range', field: f };
}

/**
 * The bytes of one memory capture, or the first problem (nothing is repaired). In order: memory data; 1..65536 rows and a
 * rows×3 Float64Array; the name (printable ASCII, no apostrophe, at most 40, not 'No Data'); aperture 0..65535; highest
 * 0..2; recorded frequencies and gains present, finite and in the reader bounds; start and interval likewise; a recorded
 * gain whose text reads back as 0 (the reader would replace it with 1); an interval whose text is not > 0; every sample
 * finite and in bounds; a recorded channel with nonzero samples that all become 0.000; the byte budget; then the strict
 * reader must admit the bytes with exactly the written lexemes.
 */
export function buildPulsarRawExport(d: PulsarCurrentValue | null): RawExportBuild {
  if (!isMemoryData(d)) return fail({ code: 'not-memory' });
  const { rowCount, samples, name, aperture, highestIndex: h } = d;
  if (!Number.isInteger(rowCount) || rowCount < 1) return fail({ code: 'no-rows' });
  if (rowCount > PLR_MAX_ROWS) return fail({ code: 'too-many-rows', count: rowCount, max: PLR_MAX_ROWS });
  if (!(samples instanceof Float64Array) || samples.length !== rowCount * 3) return fail({ code: 'samples-shape' });

  if (typeof name !== 'string') return fail({ code: 'name-text', position: 1 });
  for (let i = 0; i < name.length; i++) { const c = name.charCodeAt(i); if (c < 0x20 || c > 0x7e) return fail({ code: 'name-text', position: i + 1 }); }
  // The reader closes the name at its first apostrophe after the opening one.
  const quote = name.indexOf("'");
  if (quote >= 0) return fail({ code: 'name-apostrophe', position: quote + 1 });
  if (name.length > PLR_MAX_NAME_CHARS) return fail({ code: 'name-length', length: name.length, max: PLR_MAX_NAME_CHARS });
  if (name === PLR_RESERVED_NAME) return fail({ code: 'name-reserved' });
  if (!Number.isInteger(aperture) || aperture < 0 || aperture > 0xffff) return fail({ code: 'aperture' });
  if (h !== 0 && h !== 1 && h !== 2) return fail({ code: 'highest' });

  // Only recorded cells are read; the others are written as 0.0 whatever they hold.
  for (const i of RECEIVERS) {
    if (i > h) break;
    const p = metadataProblem(d.frequencies[i], PLR_VALUE_BOUNDS.frequency, field('frequency', i)) ?? metadataProblem(d.gains[i], PLR_VALUE_BOUNDS.gain, field('gain', i));
    if (p) return fail(p);
  }
  const timing = metadataProblem(d.start, PLR_VALUE_BOUNDS.start, 'start') ?? metadataProblem(d.interval, PLR_VALUE_BOUNDS.interval, 'interval');
  if (timing) return fail(timing);

  const D = RAW_EXPORT_DIGITS;
  const freqText = RECEIVERS.map(i => (i <= h ? formatFixed(d.frequencies[i] as number, D.frequency) : RAW_EXPORT_INACTIVE));
  const gainText = RECEIVERS.map(i => (i <= h ? formatFixed(d.gains[i] as number, D.gain) : RAW_EXPORT_INACTIVE));
  for (const i of RECEIVERS) if (i <= h && Number(gainText[i]) === 0) return fail({ code: 'gain-zero', receiver: i });
  const startText = formatFixed(d.start, D.start), intervalText = formatFixed(d.interval, D.interval);
  if (!(Number(intervalText) > 0)) return fail({ code: 'interval-zero' });

  for (let k = 0; k < samples.length; k++) {
    const v = samples[k];
    if (!Number.isFinite(v) || Math.abs(v) > PLR_VALUE_BOUNDS.sample) return fail({ code: 'sample-range', row: Math.floor(k / 3) + 1, channel: (k % 3) as PlrReceiverIndex });
  }
  const sampleText = Array.from(samples, v => formatFixed(v, D.sample));
  for (const c of RECEIVERS) {
    if (c > h) break;
    let nonzero = false, kept = false;
    for (let r = 0; r < rowCount && !kept; r++) { const k = r * 3 + c; if (samples[k] !== 0) { nonzero = true; kept = Number(sampleText[k]) !== 0; } }
    if (nonzero && !kept) return fail({ code: 'channel-erased', receiver: c });
  }

  const lines = [`'${name}',${String(aperture)},${String(h)}`, freqText.join(','), gainText.join(','), `${startText},${intervalText}`];
  for (let r = 0; r < rowCount; r++) lines.push(`${sampleText[r * 3]},${sampleText[r * 3 + 1]},${sampleText[r * 3 + 2]}`);
  const size = lines.reduce((n, l) => n + l.length + RAW_EXPORT_NEWLINE.length, 0);
  if (size > PLR_MAX_BYTES) return fail({ code: 'too-large', bytes: size, max: PLR_MAX_BYTES });
  const text = lines.map(l => l + RAW_EXPORT_NEWLINE).join('');
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);

  // Read-back by the strict reader: the exact written lexemes, no zero replacement on a recorded gain, the same rows.
  const back = admitPlrRecording(bytes, RAW_EXPORT_FILE_NAME);
  if (back.status !== 'admitted') return fail({ code: 'profile' });
  const rec = back.recording;
  const cellsOk = RECEIVERS.every(i => rec.frequencies[i].lexeme === freqText[i] && rec.gains[i].lexeme === gainText[i] && (i > h || !rec.gains[i].zeroReplaced));
  if (rec.lineEnding !== 'CRLF' || rec.name !== name || rec.aperture.value !== aperture || rec.highestIndex.value !== h || !cellsOk
    || rec.start.lexeme !== startText || rec.interval.lexeme !== intervalText || rec.rowCount !== rowCount || rec.samples.some((v, k) => v !== Number(sampleText[k])))
    return fail({ code: 'profile' });

  const header: RawExportField[] = [];
  for (const i of RECEIVERS) if (i <= h && Number(freqText[i]) !== d.frequencies[i]) header.push(field('frequency', i));
  for (const i of RECEIVERS) if (i <= h && Number(gainText[i]) !== d.gains[i]) header.push(field('gain', i));
  if (Number(startText) !== d.start) header.push('start');
  if (Number(intervalText) !== d.interval) header.push('interval');
  let samplesChanged = 0, samplesZeroed = 0;
  for (let k = 0; k < samples.length; k++) {
    const written = Number(sampleText[k]);
    if (written !== samples[k]) samplesChanged++;
    if (samples[k] !== 0 && written === 0) samplesZeroed++;
  }
  const loss: RawExportLoss = Object.freeze({ header: Object.freeze(header), samplesChanged, samplesZeroed });
  return Object.freeze({ ok: true, text, bytes, rowCount, highestIndex: h, loss });
}

// ---------------------------------------------------------------------------------------------------------------
// Dialog session (WEB-RAW-02): one memory capture object, the dataset generation and the preview shown when it opened.

export type RawExportRefusal = Readonly<{ code: 'not-ready' }> | Readonly<{ code: 'stale' }> | Readonly<{ code: 'build'; problem: RawExportProblem }>;
export type RawExportSession = Readonly<{
  data: PulsarMemoryRecording; generation: number;
  /** The build shown in the dialog. It is never refreshed: a request whose fresh build differs is refused as 'stale'. */
  preview: RawExportBuild;
  refusal: RawExportRefusal | null;
  /** The last download request threw in the browser; the session is kept for a new request. */
  failure: boolean;
  /** R-RX15: 'save' is the verified browser Save dialog (src/core/pulsarSavedCopy.ts); 'download' (default) is R-RX14. */
  purpose?: 'download' | 'save';
  /** R-RX15: the phase or result of the latest Save attempt of this session; kept by refusals and download failures. */
  save?: PulsarSaveNotice | null;
}>;
const session = (s: RawExportSession, patch: Partial<RawExportSession>): RawExportSession => Object.freeze({ ...s, ...patch });

export const rawExportOpen = (data: PulsarMemoryRecording, generation: number, purpose: 'download' | 'save' = 'download'): RawExportSession =>
  Object.freeze({ data, generation, preview: buildPulsarRawExport(data), refusal: null, failure: false, purpose, save: null });

export type RawExportContext = Readonly<{ data: PulsarCurrentValue | null; generation: number; ready: boolean }>;
export type RawExportRequest =
  | Readonly<{ kind: 'artifact'; text: string; bytes: Uint8Array<ArrayBuffer>; rowCount: number }>
  | Readonly<{ kind: 'refused'; session: RawExportSession }>;

const sameBuild = (a: RawExportBuild, b: RawExportBuild) => a.ok && b.ok && a.text === b.text && a.loss.samplesChanged === b.loss.samplesChanged
  && a.loss.samplesZeroed === b.loss.samplesZeroed && a.loss.header.join() === b.loss.header.join();

/**
 * Download request. In order: 'not-ready' (a read, lease or other dialog is pending), 'stale' (the current data is not the
 * session's object or the generation changed), a fresh build of the session's data (its Float64Array is mutable, so the
 * preview is not reused): its problem, or 'stale' when it differs from the preview. The session is never consumed here.
 */
export function rawExportRequest(s: RawExportSession, ctx: RawExportContext): RawExportRequest {
  const refuse = (refusal: RawExportRefusal): RawExportRequest => Object.freeze({ kind: 'refused', session: session(s, { refusal: Object.freeze(refusal), failure: false }) });
  if (!ctx.ready) return refuse({ code: 'not-ready' });
  if (ctx.data !== s.data || ctx.generation !== s.generation) return refuse({ code: 'stale' });
  const build = buildPulsarRawExport(s.data);
  if (!build.ok) return refuse({ code: 'build', problem: build.problem });
  if (!sameBuild(build, s.preview)) return refuse({ code: 'stale' });
  return Object.freeze({ kind: 'artifact', text: build.text, bytes: build.bytes, rowCount: build.rowCount });
}

/** The browser refused to start the download: the session stays for a new request. */
export const rawExportDownloadFailed = (s: RawExportSession): RawExportSession => session(s, { failure: true, refusal: null });
/** R-RX15: the latest Save phase or result. A new phase replaces an earlier refusal or download failure, which no longer applies. */
export const rawExportSaveNotice = (s: RawExportSession, save: PulsarSaveNotice): RawExportSession => session(s, { save, refusal: null, failure: false });
