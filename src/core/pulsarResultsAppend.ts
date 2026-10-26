/**
 * Append export of the confirmed measurement list to a supplied saved-results file (R-RX12): a WEB interoperability
 * download made of the exact bytes of a strictly admitted target file followed by the confirmed rows. The selected file
 * is never changed; the result is a NEW download with a fixed name.
 *
 * Contract and evidence: docs/PULSAR-RESULTS-APPEND.md and docs/PULSAR-RESULTS-APPEND-PROVENANCE.json (NAP-*, WEB-NAP-*).
 * - Recovered statically [S]: the empty-list refusal precedes the append branch (0x56fee4..0x56ff0a before 0x56ff2d); with
 *   the append flag a successful 0x4037bc open (mode 0xd7b3) skips the header and goes to the row loop 0x5702ab, which
 *   writes the stored string of each ordinal followed by WriteLn (0x5702ab..0x5702e8). The 0xd7b3 backend
 *   (0x403874..0x403a20) opens an existing file, reads its last 128 bytes and truncates at a byte 0x0e when present;
 *   otherwise the file pointer stays at the end. WriteLn 0x40460c ends a line with CR LF or LF by an unknown runtime flag.
 * - WEB policy [W]: only a target the strict saved-rows reader admits (printable ASCII and one line ending, so the 0x0e
 *   truncation domain is excluded; analyst inference: on that domain native append is "existing bytes, then rows"); the
 *   target's own line ending for the new rows; combined bounds checked before the output is allocated; a strict readback
 *   of the complete result. admitSavedRows lexically admits the metadata lines and the field structure of the rows
 *   (target and result); the prefix is never rebuilt from them, and no date/time, metadata or number text is interpreted,
 *   converted or reformatted. No deduplication.
 * - Not ported: the rewrite fallback with a fresh header after a failed open (0x56ff50..), the 0x0e truncation, the
 *   in-place file modification, the close, the post-write reset 0x56fe6c and the saved byte. Nothing claims a save.
 * Pure TypeScript: no React, no DOM, no clock, no storage.
 */
import { admitSavedRows, savedRowsBytes, SAVED_ROWS_LIMITS, type SavedNewline, type SavedReadResult, type SavedRow, type SavedRowsError, type SavedRowsErrorCode, type SavedRowsSource } from './pulsarSavedRows';
import { resultsExportAgreement, type ResultsExportRowCheck, type ResultsExportRowCode, type ResultsExportRowProblem } from './pulsarResultsExport';
import type { PulsarMeasurementEntry } from './pulsarAnalysis';

/** WEB: the fixed basename of every append download. Never derived from the target's name. */
export const RESULTS_APPEND_FILE_NAME = 'pulsar-results-appended.csv';
export const RESULTS_APPEND_MEDIA_TYPE = 'text/csv';
/** WEB bounds of the combined result: those of the saved-rows reader. None is a native limit. */
export const RESULTS_APPEND_LIMITS = Object.freeze({ maxRows: SAVED_ROWS_LIMITS.maxRows, maxBytes: SAVED_ROWS_LIMITS.maxBytes, maxRowBytes: SAVED_ROWS_LIMITS.maxRowBytes });

export type ResultsAppendListProblem =
  | Readonly<{ code: 'no-rows' }>
  | Readonly<{ code: 'too-many-rows'; old: number; added: number; max: number }>
  | Readonly<{ code: 'too-large'; bytes: number; max: number }>
  | Readonly<{ code: 'target-unowned' }>
  | Readonly<{ code: 'profile' }>;
/** Row problems use the export row codes; `ordinal` is the position among the NEW rows (the confirmed list order). */
export type ResultsAppendRefused = Readonly<{ ok: false; list: ResultsAppendListProblem | null; row: ResultsExportRowProblem | null }>;
export type ResultsAppendBuild =
  | Readonly<{ ok: true; bytes: Uint8Array<ArrayBuffer>; newline: SavedNewline; prefixBytes: number; oldRows: number; addedRows: number; totalRows: number }>
  | ResultsAppendRefused;

const refused = (list: ResultsAppendListProblem | null, row: ResultsExportRowProblem | null): ResultsAppendRefused =>
  Object.freeze({ ok: false, list: list && Object.freeze(list), row: row && Object.freeze(row) });
const ROW_READER_CODES: ReadonlySet<SavedRowsErrorCode> = new Set<SavedRowsErrorCode>(['row-blank', 'row-length', 'row-quote', 'row-columns', 'row-field']);

/** Lexical checks of one new row before assembly: a string, not empty, printable ASCII, at most maxRowBytes. */
function rowPrecheck(text: unknown, ordinal: number): ResultsExportRowProblem | null {
  if (typeof text !== 'string') return { ordinal, code: 'row-text' };
  if (text.length === 0) return { ordinal, code: 'row-blank' };
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); if (c < 0x20 || c > 0x7e) return { ordinal, code: 'row-text', position: i + 1 }; }
  if (text.length > RESULTS_APPEND_LIMITS.maxRowBytes) return { ordinal, code: 'row-length', length: text.length };
  return null;
}

/**
 * The lexical layer: an admitted target and new row texts to the bytes of a new file, or a refusal with no bytes. Every
 * step fails closed, in this order:
 * 1. an empty list (NAP-01: the native refusal precedes the append branch);
 * 2. the target's owned bytes (a source not created by admitSavedRows, for example a spread or cloned copy, is
 *    'target-unowned'); 3. those bytes are admitted again and must give the same line ending, length, lines and rows;
 * 4. each new row (first failure, new-row position); 5. combined rows and bytes, before the output is allocated;
 * 6. one new Uint8Array: the prefix, then each row followed by the target's line ending;
 * 7. strict readback: every prefix byte is equal, the old lines and rows are text-equal, the new rows equal the input,
 *    every '"' of a new row is a field delimiter, and rowCheck accepts each new row (its ordinal re-based to the new rows).
 * Old rows stay opaque to field agreement: they are not compared with any structured field. The metadata is lexically
 * admitted, never interpreted or rebuilt.
 */
export function buildResultsAppend(target: SavedRowsSource, rows: readonly string[], rowCheck?: ResultsExportRowCheck): ResultsAppendBuild {
  if (!Array.isArray(rows) || rows.length === 0) return refused({ code: 'no-rows' }, null);
  let prefix: Uint8Array<ArrayBuffer>;
  try { prefix = savedRowsBytes(target); } catch { return refused({ code: 'target-unowned' }, null); }
  const again = admitSavedRows(prefix, target.fileName);
  if (!again.ok) return refused({ code: 'profile' }, null);
  const s = again.source;
  if (s.newline !== target.newline || s.byteLength !== prefix.length || s.byteLength !== target.byteLength || s.lines.length !== target.lines.length
    || s.lines.some((l, i) => l.text !== target.lines[i].text) || s.rows.length !== target.rows.length || s.rows.some((r, i) => r.text !== target.rows[i].text))
    return refused({ code: 'profile' }, null);
  for (let i = 0; i < rows.length; i++) { const problem = rowPrecheck(rows[i], i); if (problem) return refused(null, problem); }

  const oldRows = s.rows.length, addedRows = rows.length, totalRows = oldRows + addedRows;
  if (totalRows > RESULTS_APPEND_LIMITS.maxRows) return refused({ code: 'too-many-rows', old: oldRows, added: addedRows, max: RESULTS_APPEND_LIMITS.maxRows }, null);
  const newline = s.newline === 'CRLF' ? '\r\n' : '\n';
  const size = rows.reduce((n, r) => n + r.length + newline.length, prefix.length);
  if (size > RESULTS_APPEND_LIMITS.maxBytes) return refused({ code: 'too-large', bytes: size, max: RESULTS_APPEND_LIMITS.maxBytes }, null);

  const bytes = new Uint8Array(size);
  bytes.set(prefix, 0);
  let p = prefix.length;
  for (const r of rows) {
    for (let k = 0; k < r.length; k++) bytes[p++] = r.charCodeAt(k);
    for (let k = 0; k < newline.length; k++) bytes[p++] = newline.charCodeAt(k);
  }

  const admission = admitSavedRows(bytes, RESULTS_APPEND_FILE_NAME);
  const firstNewLine = s.lines.length + 1;
  if (!admission.ok) {
    const e: SavedRowsError = admission.error;
    if (ROW_READER_CODES.has(e.code) && e.line !== undefined && e.line >= firstNewLine)
      return refused(null, { ordinal: e.line - firstNewLine, code: e.code as ResultsExportRowCode, ...(e.field ? { field: e.field } : {}), ...(e.count !== undefined ? { count: e.count } : {}) });
    return refused({ code: 'profile' }, null);
  }
  const out = admission.source;
  for (let i = 0; i < prefix.length; i++) if (bytes[i] !== prefix[i]) return refused({ code: 'profile' }, null);
  if (out.newline !== s.newline || out.byteLength !== size || out.lines.length !== s.lines.length + addedRows || s.lines.some((l, i) => out.lines[i].text !== l.text)
    || out.rows.length !== totalRows || s.rows.some((r, i) => out.rows[i].text !== r.text) || rows.some((r, i) => out.rows[oldRows + i].text !== r))
    return refused({ code: 'profile' }, null);
  for (let i = 0; i < addedRows; i++) {
    const r = out.rows[oldRows + i];
    const quotes = r.text.split('"').length - 1, quoted = r.fields.filter(f => f.quoted).length;
    if (quotes !== 2 * quoted) return refused(null, { ordinal: i, code: 'row-quote' });
    const problem = rowCheck?.(Object.freeze({ ...r, ordinal: i }) as SavedRow) ?? null;
    if (problem) return refused(null, problem);
  }
  return Object.freeze({ ok: true, bytes, newline: s.newline, prefixBytes: prefix.length, oldRows, addedRows, totalRows });
}

/** The confirmed entries in list order after the target: their stored row texts verbatim, in agreement with their fields. */
export function appendPulsarResults(target: SavedRowsSource, entries: readonly Pick<PulsarMeasurementEntry, 'nativeLineCandidate' | 'fields'>[]): ResultsAppendBuild {
  const list = Array.isArray(entries) ? entries : [];
  return buildResultsAppend(target, list.map(e => e.nativeLineCandidate), resultsExportAgreement(list));
}

// ---------------------------------------------------------------------------------------------------------------
// Dialog session (WEB-NAP-05): one snapshot of the confirmed list and dataset generation, and the owned target.

/** An admitted target: the reader's owned source (its bytes stay private to the reader) and the SHA-256 of those bytes. */
export type ResultsAppendTarget = Readonly<{ source: SavedRowsSource; sha256: string }>;
/** A selected file that is not the target: the reader's refusal, an oversize file refused unread, or a read error. */
export type ResultsAppendRejection = Readonly<{ fileName: string; error: SavedRowsError | Readonly<{ code: 'read' }> }>;
export type ResultsAppendRefusal =
  | Readonly<{ code: 'not-ready' }> | Readonly<{ code: 'stale' }> | Readonly<{ code: 'reading' }> | Readonly<{ code: 'no-target' }>
  | Readonly<{ code: 'row'; problem: ResultsExportRowProblem }> | Readonly<{ code: 'list'; problem: ResultsAppendListProblem }>;
export type ResultsAppendSession = Readonly<{
  list: readonly PulsarMeasurementEntry[]; generation: number;
  target: ResultsAppendTarget | null;
  /** The running target read. Its token is supplied by the host and must be unique across sessions. */
  reading: Readonly<{ token: number; fileName: string }> | null;
  rejection: ResultsAppendRejection | null;
  refusal: ResultsAppendRefusal | null;
  /** The last download request threw in the browser; the target is kept for a new request. */
  failure: boolean;
  /** An explicit learner Cancel reading left the dialog's notice; a new selection clears it. Host cancellation sets none. */
  notice: 'read-cancelled' | null;
}>;
const session = (s: ResultsAppendSession, patch: Partial<ResultsAppendSession>): ResultsAppendSession => Object.freeze({ ...s, ...patch });

export const resultsAppendOpen = (list: readonly PulsarMeasurementEntry[], generation: number): ResultsAppendSession =>
  Object.freeze({ list, generation, target: null, reading: null, rejection: null, refusal: null, failure: false, notice: null });
/**
 * A new selection owns the target slot: the previous target is cleared at once (a failed replacement never leaves the old
 * target in use) and any running read is superseded.
 */
export const resultsAppendBeginRead = (s: ResultsAppendSession, token: number, fileName: string): ResultsAppendSession =>
  session(s, { target: null, reading: Object.freeze({ token, fileName }), rejection: null, refusal: null, failure: false, notice: null });
/**
 * Explicit learner Cancel reading or host deactivation: its result will be ignored. No target remains. Only the learner's
 * cancellation leaves the 'read-cancelled' notice. With no running read the session is returned unchanged.
 */
export const resultsAppendCancelRead = (s: ResultsAppendSession, by: 'learner' | 'host' = 'host'): ResultsAppendSession =>
  (s.reading ? session(s, by === 'learner' ? { reading: null, notice: 'read-cancelled' } : { reading: null }) : s);
/** A result whose token is not the running read (cancelled, superseded or from another session) changes nothing. */
export function resultsAppendReadFinished(s: ResultsAppendSession, token: number, r: SavedReadResult): ResultsAppendSession {
  if (s.reading === null || s.reading.token !== token) return s;
  const fileName = s.reading.fileName;
  return r.ok
    ? session(s, { reading: null, target: Object.freeze({ source: r.source, sha256: r.sha256 }) })
    : session(s, { reading: null, rejection: Object.freeze({ fileName, error: r.error }) });
}

export type ResultsAppendContext = Readonly<{ list: readonly PulsarMeasurementEntry[]; generation: number; ready: boolean }>;
export type ResultsAppendRequest =
  | Readonly<{ kind: 'artifact'; bytes: Uint8Array<ArrayBuffer>; newline: SavedNewline; oldRows: number; addedRows: number; totalRows: number }>
  | Readonly<{ kind: 'refused'; session: ResultsAppendSession }>;

/**
 * Download request. In order: 'not-ready' (the host is not able to show the dialog, or a PLR read, lease or other dialog
 * is pending), 'stale' (the live confirmed list is not the snapshot's list object, or the dataset generation changed),
 * 'reading' (a target read is running), 'no-target', then the build. The session is never consumed here.
 */
export function resultsAppendRequest(s: ResultsAppendSession, ctx: ResultsAppendContext): ResultsAppendRequest {
  const refuse = (refusal: ResultsAppendRefusal): ResultsAppendRequest => Object.freeze({ kind: 'refused', session: session(s, { refusal: Object.freeze(refusal), failure: false }) });
  if (!ctx.ready) return refuse({ code: 'not-ready' });
  if (ctx.list !== s.list || ctx.generation !== s.generation) return refuse({ code: 'stale' });
  if (s.reading) return refuse({ code: 'reading' });
  if (!s.target) return refuse({ code: 'no-target' });
  const build = appendPulsarResults(s.target.source, s.list);
  if (!build.ok) return refuse(build.row ? { code: 'row', problem: build.row } : { code: 'list', problem: build.list ?? { code: 'profile' as const } });
  return Object.freeze({ kind: 'artifact', bytes: build.bytes, newline: build.newline, oldRows: build.oldRows, addedRows: build.addedRows, totalRows: build.totalRows });
}

/** The browser refused to start the download: the session and its target stay for a new request. */
export const resultsAppendDownloadFailed = (s: ResultsAppendSession): ResultsAppendSession => session(s, { failure: true, refusal: null });
