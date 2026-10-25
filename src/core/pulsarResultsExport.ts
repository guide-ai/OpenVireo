/**
 * Fresh-format export of the confirmed measurement list (R-RX10): a WEB interoperability download in the layout of the
 * recovered measurement-list writer 0x56feac..0x570340 (fresh-file branch), with metadata the learner types.
 *
 * Contract and evidence: docs/PULSAR-RESULTS-EXPORT.md and docs/PULSAR-RESULTS-EXPORT-PROVENANCE.json (NWE-*, WEB-NWE-*).
 * - Recovered statically [S]: the empty-list refusal (0x56fee4..0x56ff0a), the header layout (two quoted texts, the
 *   'Table Number: ' line with at most 4 table bytes, a blank line, the non-empty identity slots of at most 40 bytes in
 *   slot order, a blank line, the 151-byte column header 0x570400), the row copy by ordinal (0x5702ab..0x5702e8) and the
 *   unescaped exact-length text output (0x4065e0/0x404598/0x404444). WriteLn 0x40460c ends a line with CR LF or LF by a
 *   runtime flag whose value is unknown.
 * - WEB policy [W]: every metadata text is supplied by the learner and starts empty (nothing is read from a clock, locale,
 *   login, catalog or classroom file); printable ASCII without '"' only, refused and never repaired, escaped or cut; CR LF
 *   after every line; the fixed download name pulsar-results.csv; only the confirmed list; rows are the stored row texts
 *   verbatim and must be admitted by the strict saved-rows reader and agree with the stored fields. No number is parsed,
 *   formatted or recomputed here.
 * - Not ported: the host date/time and its format owners (0x40d47c, 0x40e07c), the stored identity owner 0x5b5990, the
 *   append and open-error paths, the close and the post-write reset 0x56fe6c, the saved byte 0x5db and Save itself.
 * - The rows are web-generated measurement text (no x87 or code-page parity), including rows measured on model-generated
 *   receiver recordings. A file this module builds certifies nothing about original observations, and the reader agreeing
 *   with it is self-consistency, not a native oracle.
 * Pure TypeScript: no React, no DOM, no clock, no storage.
 */
import {
  admitSavedRows, SAVED_ROW_FIELDS, SAVED_ROWS_HEADER, SAVED_ROWS_IDENTITY_MAX, SAVED_ROWS_IDENTITY_SLOTS, SAVED_ROWS_LIMITS, SAVED_ROWS_TABLE_MAX,
  SAVED_ROWS_TABLE_PREFIX, type SavedRow, type SavedRowField, type SavedRowsErrorCode,
} from './pulsarSavedRows';
import type { PulsarEntryFields, PulsarMeasurementEntry } from './pulsarAnalysis';

/** WEB: the fixed basename of every export. No path or supplied name is used. */
export const RESULTS_EXPORT_FILE_NAME = 'pulsar-results.csv';
export const RESULTS_EXPORT_MEDIA_TYPE = 'text/csv';
/** WEB: the line terminator chosen for every export (the native flag at TextRec+6 is unknown). */
export const RESULTS_EXPORT_NEWLINE = '\r\n';
/**
 * Bounds. tableMax and nameMax follow the recovered ShortString caps (19 − 15 and 0x29 − 1); dateTimeMax, maxRows,
 * maxRowBytes and maxBytes are the WEB bounds of the saved-rows reader; maxDraft is the WEB editing bound of one field.
 * None of the WEB values is a native limit.
 */
export const RESULTS_EXPORT_LIMITS = Object.freeze({
  dateTimeMax: SAVED_ROWS_LIMITS.maxDateTimeBytes, tableMax: SAVED_ROWS_TABLE_MAX, nameMax: SAVED_ROWS_IDENTITY_MAX, nameSlots: SAVED_ROWS_IDENTITY_SLOTS,
  maxRows: SAVED_ROWS_LIMITS.maxRows, maxRowBytes: SAVED_ROWS_LIMITS.maxRowBytes, maxBytes: SAVED_ROWS_LIMITS.maxBytes, maxDraft: 256,
});

export type ResultsExportNames = readonly [string, string, string, string];
export type ResultsExportMetadata = Readonly<{ date: string; time: string; table: string; names: ResultsExportNames }>;
/** WEB-NWE-02: every field starts empty. */
export const EMPTY_RESULTS_EXPORT_METADATA: ResultsExportMetadata = Object.freeze({ date: '', time: '', table: '', names: Object.freeze(['', '', '', ''] as const) });
export const RESULTS_EXPORT_FIELDS = Object.freeze(['date', 'time', 'table', 'name1', 'name2', 'name3', 'name4'] as const);
export type ResultsExportField = typeof RESULTS_EXPORT_FIELDS[number];

export type ResultsExportFieldProblem = Readonly<{ field: ResultsExportField; code: 'required' | 'text' | 'quote' | 'length'; position?: number; length?: number; max?: number }>;
export type ResultsExportRowCode = 'row-blank' | 'row-text' | 'row-length' | 'row-quote' | 'row-columns' | 'row-field' | 'row-fields-mismatch';
/** ordinal: zero-based index into the exported rows (the confirmed list order). */
export type ResultsExportRowProblem = Readonly<{ ordinal: number; code: ResultsExportRowCode; field?: SavedRowField; position?: number; length?: number; count?: number }>;
export type ResultsExportListProblem =
  | Readonly<{ code: 'no-rows' }> | Readonly<{ code: 'too-many-rows'; count: number; max: number }>
  | Readonly<{ code: 'too-large'; bytes: number; max: number }> | Readonly<{ code: 'profile' }>;
export type ResultsExportRefused = Readonly<{ ok: false; fields: readonly ResultsExportFieldProblem[]; list: ResultsExportListProblem | null; row: ResultsExportRowProblem | null }>;
export type ResultsExportBuild = Readonly<{ ok: true; text: string; bytes: Uint8Array<ArrayBuffer>; rowCount: number }> | ResultsExportRefused;
export type ResultsExportRowCheck = (row: SavedRow) => ResultsExportRowProblem | null;

export const resultsExportValue = (m: ResultsExportMetadata, field: ResultsExportField): string =>
  field === 'date' ? m.date : field === 'time' ? m.time : field === 'table' ? m.table : m.names[Number(field.slice(4)) - 1];
const fieldMax = (field: ResultsExportField) =>
  field === 'date' || field === 'time' ? RESULTS_EXPORT_LIMITS.dateTimeMax : field === 'table' ? RESULTS_EXPORT_LIMITS.tableMax : RESULTS_EXPORT_LIMITS.nameMax;
/** 1-based position of the first character outside printable ASCII 0x20..0x7E, or 0. */
function unprintable(text: string): number {
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); if (c < 0x20 || c > 0x7e) return i + 1; }
  return 0;
}

/**
 * At most one problem per field, checked in this order: required (date and time only), printable ASCII, no '"', length.
 * Because the length check follows the ASCII check, it counts bytes. Values are never trimmed: a name of spaces is non-empty.
 */
export function resultsExportFieldProblem(m: ResultsExportMetadata, field: ResultsExportField): ResultsExportFieldProblem | null {
  const value = resultsExportValue(m, field);
  if (typeof value !== 'string') return Object.freeze({ field, code: 'text' });
  if ((field === 'date' || field === 'time') && value.length === 0) return Object.freeze({ field, code: 'required' });
  const bad = unprintable(value);
  if (bad) return Object.freeze({ field, code: 'text', position: bad });
  const quote = value.indexOf('"');
  if (quote >= 0) return Object.freeze({ field, code: 'quote', position: quote + 1 });
  const max = fieldMax(field);
  if (value.length > max) return Object.freeze({ field, code: 'length', length: value.length, max });
  return null;
}
export function resultsExportFieldProblems(m: ResultsExportMetadata): readonly ResultsExportFieldProblem[] {
  const out: ResultsExportFieldProblem[] = [];
  for (const field of RESULTS_EXPORT_FIELDS) { const p = resultsExportFieldProblem(m, field); if (p) out.push(p); }
  return Object.freeze(out);
}

const refused = (fields: readonly ResultsExportFieldProblem[], list: ResultsExportListProblem | null, row: ResultsExportRowProblem | null): ResultsExportRefused =>
  Object.freeze({ ok: false, fields: Object.freeze([...fields]), list: list && Object.freeze(list), row: row && Object.freeze(row) });
const ROW_READER_CODES: ReadonlySet<SavedRowsErrorCode> = new Set<SavedRowsErrorCode>(['row-blank', 'row-length', 'row-quote', 'row-columns', 'row-field']);

/** Lexical checks of one row before assembly: not empty, printable ASCII, at most maxRowBytes. */
function rowPrecheck(text: unknown, ordinal: number): ResultsExportRowProblem | null {
  if (typeof text !== 'string') return { ordinal, code: 'row-text' };
  if (text.length === 0) return { ordinal, code: 'row-blank' };
  const bad = unprintable(text);
  if (bad) return { ordinal, code: 'row-text', position: bad };
  if (text.length > RESULTS_EXPORT_LIMITS.maxRowBytes) return { ordinal, code: 'row-length', length: text.length };
  return null;
}

/**
 * The lexical layer: metadata and row texts to file bytes, or a refusal with no bytes. Every step fails closed.
 * 1. field problems (all fields); 2. list: no rows, too many rows; 3. rows by ordinal (first failure); 4. total size;
 * 5. assembly with CR LF after every line, into a new Uint8Array; 6. the strict saved-rows reader admits the bytes (a row
 *    error on physical line 6 + k, k the number of non-empty names, is row ordinal 0); 7. the admitted rows equal the input
 *    texts, the metadata reads back unchanged, every '"' of a row is a field delimiter, and rowCheck accepts each row.
 */
export function buildResultsExport(m: ResultsExportMetadata, rows: readonly string[], rowCheck?: ResultsExportRowCheck): ResultsExportBuild {
  const fields = resultsExportFieldProblems(m);
  let list: ResultsExportListProblem | null = null, row: ResultsExportRowProblem | null = null;
  if (!Array.isArray(rows) || rows.length === 0) list = { code: 'no-rows' };
  else if (rows.length > RESULTS_EXPORT_LIMITS.maxRows) list = { code: 'too-many-rows', count: rows.length, max: RESULTS_EXPORT_LIMITS.maxRows };
  else for (let i = 0; i < rows.length && !row; i++) row = rowPrecheck(rows[i], i);
  if (fields.length > 0 || list || row) return refused(fields, list, row);

  const names = m.names.filter(n => n.length > 0);
  const lines = [`"${m.date}","${m.time}"`, `${SAVED_ROWS_TABLE_PREFIX}${m.table}"`, '', ...names.map(n => `"${n}"`), '', SAVED_ROWS_HEADER, ...rows];
  const size = lines.reduce((n, l) => n + l.length + RESULTS_EXPORT_NEWLINE.length, 0);
  if (size > RESULTS_EXPORT_LIMITS.maxBytes) return refused([], { code: 'too-large', bytes: size, max: RESULTS_EXPORT_LIMITS.maxBytes }, null);
  const text = lines.map(l => l + RESULTS_EXPORT_NEWLINE).join('');
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);

  const admission = admitSavedRows(bytes, RESULTS_EXPORT_FILE_NAME);
  const firstRowLine = 6 + names.length;
  if (!admission.ok) {
    const e = admission.error;
    if (ROW_READER_CODES.has(e.code) && e.line !== undefined && e.line >= firstRowLine) {
      const problem: ResultsExportRowProblem = { ordinal: e.line - firstRowLine, code: e.code as ResultsExportRowCode };
      return refused([], null, { ...problem, ...(e.field ? { field: e.field } : {}), ...(e.count !== undefined ? { count: e.count } : {}) });
    }
    return refused([], { code: 'profile' }, null);
  }
  const source = admission.source, md = source.metadata;
  if (source.newline !== 'CRLF' || source.byteLength !== bytes.length || md.dateTime.first !== m.date || md.dateTime.second !== m.time || md.table.value !== m.table ||
    md.identities.length !== names.length || md.identities.some((id, i) => id.value !== names[i]) || source.rows.length !== rows.length || source.rows.some((r, i) => r.text !== rows[i]))
    return refused([], { code: 'profile' }, null);
  for (const r of source.rows) {
    const quotes = r.text.split('"').length - 1, quoted = r.fields.filter(f => f.quoted).length;
    if (quotes !== 2 * quoted) return refused([], null, { ordinal: r.ordinal, code: 'row-quote' });
    const problem = rowCheck?.(r) ?? null;
    if (problem) return refused([], null, problem);
  }
  return Object.freeze({ ok: true, text, bytes, rowCount: rows.length });
}

type EntryField = keyof PulsarEntryFields;
const QUOTED: ReadonlySet<SavedRowField> = new Set<SavedRowField>(['object', 'comment', 'file']);
const NULLABLE: ReadonlySet<SavedRowField> = new Set<SavedRowField>(['reference', 'vertical', 'horizontal']);
/**
 * Field agreement of an admitted row with its stored structured fields (an independent comparison of parsed tokens, not a
 * third copy of the row template): 11 columns without a file, 12 with one; object, comment and file are the quoted inner
 * texts; a blank reference, vertical or horizontal value is '""', otherwise the bare text; the other numbers are the bare
 * texts. Strings are compared exactly; nothing is parsed into a number.
 */
export function resultsExportAgreement(entries: readonly Pick<PulsarMeasurementEntry, 'fields'>[]): ResultsExportRowCheck {
  return row => {
    const f = entries[row.ordinal]?.fields, mismatch = (field?: SavedRowField): ResultsExportRowProblem => ({ ordinal: row.ordinal, code: 'row-fields-mismatch', ...(field ? { field } : {}), count: row.columns });
    if (!f || row.columns !== (f.file === null ? 11 : 12)) return mismatch();
    for (let i = 0; i < row.columns; i++) {
      const name = SAVED_ROW_FIELDS[i], token = row.fields[i], want = f[name as EntryField];
      const ok = QUOTED.has(name) ? token.quoted && token.inner === want
        : NULLABLE.has(name) && want === null ? token.quoted && token.inner === ''
        : !token.quoted && typeof want === 'string' && token.raw === want;
      if (!ok) return mismatch(name);
    }
    return null;
  };
}

/** The confirmed entries in list order: their stored row texts verbatim, admitted and in agreement with their fields. */
export function exportPulsarResults(m: ResultsExportMetadata, entries: readonly Pick<PulsarMeasurementEntry, 'nativeLineCandidate' | 'fields'>[]): ResultsExportBuild {
  const rows = Array.isArray(entries) ? entries.map(e => e.nativeLineCandidate) : [];
  return buildResultsExport(m, rows, resultsExportAgreement(Array.isArray(entries) ? entries : []));
}

// ---------------------------------------------------------------------------------------------------------------
// Dialog session (WEB-NWE-05): one snapshot of the confirmed list and dataset generation, and the learner's draft.

/** A refusal shown in the dialog. 'row' and 'list' describe the snapshot; 'stale' means it no longer matches. */
export type ResultsExportRefusal =
  | Readonly<{ code: 'metadata' }> | Readonly<{ code: 'oversize' }>
  | Readonly<{ code: 'row'; problem: ResultsExportRowProblem }> | Readonly<{ code: 'list'; problem: ResultsExportListProblem }>
  | Readonly<{ code: 'stale' }> | Readonly<{ code: 'not-ready' }>;
/** A field whose last edit exceeded maxDraft. It was not taken, and the field stays latched until it is edited within bounds. */
export type ResultsExportOversize = Readonly<{ field: ResultsExportField; length: number }>;
export type ResultsExportSession = Readonly<{
  list: readonly PulsarMeasurementEntry[]; generation: number; draft: ResultsExportMetadata;
  oversize: readonly ResultsExportOversize[];
  refusal: ResultsExportRefusal | null;
  /** A download was requested at least once in this session (field problems are then shown for empty required fields too). */
  attempted: boolean;
  /** The last download request threw in the browser; the draft is kept for a new request. */
  failure: boolean;
}>;
const session = (s: ResultsExportSession, patch: Partial<ResultsExportSession>): ResultsExportSession => Object.freeze({ ...s, ...patch });

export const resultsExportOpen = (list: readonly PulsarMeasurementEntry[], generation: number): ResultsExportSession =>
  Object.freeze({ list, generation, draft: EMPTY_RESULTS_EXPORT_METADATA, oversize: Object.freeze([]), refusal: null, attempted: false, failure: false });

function withValue(m: ResultsExportMetadata, field: ResultsExportField, value: string): ResultsExportMetadata {
  if (field === 'date') return Object.freeze({ ...m, date: value });
  if (field === 'time') return Object.freeze({ ...m, time: value });
  if (field === 'table') return Object.freeze({ ...m, table: value });
  const i = Number(field.slice(4)) - 1;
  return Object.freeze({ ...m, names: Object.freeze(m.names.map((n, k) => (k === i ? value : n)) as unknown as ResultsExportNames) });
}
/**
 * Refusals about the snapshot (its rows, its list or its staleness). They stay visible across metadata edits and are
 * recomputed on the next download request. The metadata can still change their outcome: it counts in the total file bytes
 * ('too-large').
 */
const SNAPSHOT_REFUSALS: ReadonlySet<ResultsExportRefusal['code']> = new Set<ResultsExportRefusal['code']>(['row', 'list', 'stale']);

/**
 * One edit of one field. A non-string value or an unknown field changes nothing (the same object). A value longer than
 * maxDraft is not taken: the draft keeps its previous text and the field is latched as oversize, which only a later
 * within-bound edit of the same field clears. A taken edit clears a metadata, oversize or not-ready refusal and a download
 * failure; a refusal about the snapshot stays.
 */
export function resultsExportEdit(s: ResultsExportSession, field: ResultsExportField, value: unknown): ResultsExportSession {
  if (typeof value !== 'string' || !(RESULTS_EXPORT_FIELDS as readonly string[]).includes(field)) return s;
  const others = s.oversize.filter(o => o.field !== field);
  if (value.length > RESULTS_EXPORT_LIMITS.maxDraft)
    return session(s, { oversize: Object.freeze([...others, Object.freeze({ field, length: value.length })]), failure: false });
  const refusal = s.refusal && SNAPSHOT_REFUSALS.has(s.refusal.code) ? s.refusal : null;
  return session(s, { draft: withValue(s.draft, field, value), oversize: Object.freeze(others), refusal, failure: false });
}

export type ResultsExportContext = Readonly<{ list: readonly PulsarMeasurementEntry[]; generation: number; ready: boolean }>;
export type ResultsExportRequest =
  | Readonly<{ kind: 'artifact'; text: string; bytes: Uint8Array<ArrayBuffer>; rowCount: number }>
  | Readonly<{ kind: 'refused'; session: ResultsExportSession }>;

/**
 * Download request. In order: 'not-ready' (the host is not able to show the dialog, or a read, lease or other dialog is
 * pending), 'stale' (the live confirmed list is not the snapshot's list object, or the dataset generation changed),
 * 'oversize' (a field is latched), then the build of the snapshot with the draft. The session is never consumed here: the
 * caller ends it after a successful download request.
 */
export function resultsExportRequest(s: ResultsExportSession, ctx: ResultsExportContext): ResultsExportRequest {
  const refuse = (refusal: ResultsExportRefusal): ResultsExportRequest =>
    Object.freeze({ kind: 'refused', session: session(s, { refusal: Object.freeze(refusal), attempted: true, failure: false }) });
  if (!ctx.ready) return refuse({ code: 'not-ready' });
  if (ctx.list !== s.list || ctx.generation !== s.generation) return refuse({ code: 'stale' });
  if (s.oversize.length > 0) return refuse({ code: 'oversize' });
  const build = exportPulsarResults(s.draft, s.list);
  if (!build.ok) return refuse(build.row ? { code: 'row', problem: build.row } : build.list ? { code: 'list', problem: build.list } : { code: 'metadata' });
  return Object.freeze({ kind: 'artifact', text: build.text, bytes: build.bytes, rowCount: build.rowCount });
}

/** The browser refused to start the download: the session, its draft and every other state stay for a new request. */
export const resultsExportDownloadFailed = (s: ResultsExportSession): ResultsExportSession => session(s, { failure: true, refusal: null });
