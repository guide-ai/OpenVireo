/**
 * Supplied saved PLR measurement rows: a WEB interoperability reader for files in the layout of the recovered
 * measurement-list writer 0x56feac..0x570340 (fresh-file branch), and the recovered Review Find
 * (PLR-REVIEW-FIND-STATIC-01) over the exact row text those files carry.
 *
 * Contract and evidence: docs/PULSAR-SAVED-ROWS.md and docs/PULSAR-SAVED-ROWS-PROVENANCE.json (SRC-*).
 * - This is a web reader; no original reload command for this layout has been established. Nothing here is a
 *   native writer, Record producer or x87 formatter; nothing is regenerated, converted or reserialized.
 * - Admission is lexical. A valid layout does not show that CLEA wrote a file, and the hand-written test files are
 *   controls, not a writer oracle.
 * - The source is read-only and separate from the current PLR recording, cursors, pending readings and recorded
 *   measurement list (src/core/pulsarAnalysis.ts), which this module never imports or changes.
 * Pure TypeScript: no React, no DOM, no clock, no storage.
 */

/** Explicit WEB bounds of this reader. They are not native limits. */
export const SAVED_ROWS_LIMITS = Object.freeze({ maxBytes: 1_048_576, maxRows: 2000, maxRowBytes: 1024, maxDateTimeBytes: 64, maxNumberBytes: 40 });

/** AnsiString 0x570400 (length 151), written by 0x570286..0x5702a6 after the second blank line. */
export const SAVED_ROWS_HEADER = '"Object","Freq (MHz)","Gain (Rel)","Ref (Secs)","Vert (Secs)","Horz (Rel)","Start (JD)","Comments","Data Pts","Del T (msec)","Aperture (M)","File Name"';
/** The twelve column names of SAVED_ROWS_HEADER, in order. */
export const SAVED_ROWS_HEADER_NAMES = Object.freeze(['Object', 'Freq (MHz)', 'Gain (Rel)', 'Ref (Secs)', 'Vert (Secs)', 'Horz (Rel)', 'Start (JD)', 'Comments', 'Data Pts', 'Del T (msec)', 'Aperture (M)', 'File Name'] as const);
/** ShortString 0x5703e4 (length 15). Line 2 is this, the table text appended with total cap 19 (0x570072), then ShortString 0x5703f4 '"' with cap 20 (0x570095). */
export const SAVED_ROWS_TABLE_PREFIX = '"Table Number: ';
/** Table text: 19 − 15 bytes at most (ShortString append 0x403c20 keeps the total within its cap). */
export const SAVED_ROWS_TABLE_MAX = 4;
/** Optional identity lines: four ShortString[40] slots at [0x5b5990]+0/+0x29/+0x52/+0x7b, each written only when its length byte is non-zero. */
export const SAVED_ROWS_IDENTITY_SLOTS = 4;
export const SAVED_ROWS_IDENTITY_MAX = 40;
/** WEB allocation bound: five fixed header lines, up to four identities and the admitted measurement rows. */
export const SAVED_ROWS_MAX_PHYSICAL_LINES = 5 + SAVED_ROWS_IDENTITY_SLOTS + SAVED_ROWS_LIMITS.maxRows;

/** Field order of a row appended by the Record writer 0x570b3c (12 columns when header byte +0x96 is non-zero at 0x570e7e). */
export const SAVED_ROW_FIELDS = Object.freeze(['object', 'frequency', 'gain', 'reference', 'vertical', 'horizontal', 'start', 'comment', 'points', 'intervalMs', 'aperture', 'file'] as const);
export type SavedRowField = typeof SAVED_ROW_FIELDS[number];

/** Byte offsets [start, end) into the supplied file. Admitted files are ASCII, so byte and character offsets agree. */
export type SavedSpan = Readonly<{ start: number; end: number }>;
export type SavedNewline = 'CRLF' | 'LF';
export type SavedLine = Readonly<{ line: number; text: string; span: SavedSpan; terminator: SavedSpan }>;
/** One field exactly as it appears in the row. `inner` is the text between the quotes of a quoted field. */
export type SavedField = Readonly<{ field: SavedRowField; raw: string; span: SavedSpan; quoted: boolean; inner: string }>;
/** One retained list string. `text` is the complete row without its line terminator; it is what Find searches. */
export type SavedRow = Readonly<{ ordinal: number; line: number; text: string; span: SavedSpan; columns: 11 | 12; fields: readonly SavedField[] }>;
/** Opaque header text. Nothing is interpreted: no date, time, table or identity meaning is asserted. */
export type SavedOpaqueLine = Readonly<{ line: number; text: string; value: string }>;
export type SavedMetadata = Readonly<{
  dateTime: Readonly<{ line: number; text: string; first: string; second: string }>;
  table: SavedOpaqueLine;
  identities: readonly SavedOpaqueLine[];
  header: Readonly<{ line: number; text: string }>;
}>;
export type SavedRowsSource = Readonly<{ fileName: string; byteLength: number; newline: SavedNewline; lines: readonly SavedLine[]; metadata: SavedMetadata; rows: readonly SavedRow[] }>;

export type SavedRowsErrorCode =
  | 'empty' | 'too-large' | 'bom' | 'nul' | 'non-ascii' | 'control' | 'bare-cr' | 'mixed-newlines' | 'unterminated'
  | 'too-many-lines' | 'truncated' | 'date-time' | 'table' | 'blank-expected' | 'identity' | 'identity-count' | 'metadata-quote' | 'header'
  | 'no-rows' | 'too-many-rows' | 'row-blank' | 'row-length' | 'row-quote' | 'row-columns' | 'row-field';
export type SavedRowsError = Readonly<{ code: SavedRowsErrorCode; line?: number; offset?: number; field?: SavedRowField; count?: number }>;
export type SavedRowsAdmission = Readonly<{ ok: true; source: SavedRowsSource }> | Readonly<{ ok: false; error: SavedRowsError }>;

// The admitted bytes are private copies, reachable only through savedRowsBytes (a new copy each time).
const ownedBytes = new WeakMap<SavedRowsSource, Uint8Array>();

/** A fresh copy of the exact supplied bytes of an admitted source. */
export function savedRowsBytes(source: SavedRowsSource): Uint8Array<ArrayBuffer> {
  const bytes = ownedBytes.get(source);
  if (!bytes) throw new Error('Unknown saved-rows source');
  return new Uint8Array(bytes);
}

const fail = (code: SavedRowsErrorCode, extra: Omit<SavedRowsError, 'code'> = {}): SavedRowsAdmission => Object.freeze({ ok: false, error: Object.freeze({ code, ...extra }) });
const span = (start: number, end: number): SavedSpan => Object.freeze({ start, end });

/**
 * Byte layer (TextIO evidence SRC-TEXTIO): payloads are copied by exact length; WriteLn 0x40460c appends CR LF when
 * TextRec+6 bit 0 is set, else LF. Which branch a given host took is not established, so either is admitted when the
 * whole file uses one. Only printable ASCII 0x20..0x7E plus those terminators; nothing is repaired or skipped.
 */
function splitLines(bytes: Uint8Array): Readonly<{ lines: SavedLine[]; newline: SavedNewline }> | SavedRowsError {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { code: 'bom', offset: 0 };
  const lines: SavedLine[] = [];
  let newline: SavedNewline | null = null, start = 0, text = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 0x20 && b <= 0x7e) { text += String.fromCharCode(b); continue; }
    const line = lines.length + 1;
    // Bound allocation before retaining another line and its two spans. The byte limit alone would allow a million
    // empty lines. No admitted layout can exceed this count; this WEB refusal can precede later framing errors.
    if (line > SAVED_ROWS_MAX_PHYSICAL_LINES) return { code: 'too-many-lines', line, count: line };
    if (b === 0) return { code: 'nul', offset: i, line };
    if (b >= 0x80) return { code: 'non-ascii', offset: i, line };
    let kind: SavedNewline;
    if (b === 0x0d) { if (bytes[i + 1] !== 0x0a) return { code: 'bare-cr', offset: i, line }; kind = 'CRLF'; }
    else if (b === 0x0a) kind = 'LF';
    else return { code: 'control', offset: i, line };
    if (newline === null) newline = kind; else if (newline !== kind) return { code: 'mixed-newlines', offset: i, line };
    const end = i, after = kind === 'CRLF' ? i + 2 : i + 1;
    lines.push(Object.freeze({ line, text, span: span(start, end), terminator: span(end, after) }));
    i = after - 1; start = after; text = '';
  }
  // Every writer line ends with WriteLn, so a final line without a terminator is incomplete.
  if (start !== bytes.length) return { code: 'unterminated', offset: start, line: lines.length + 1 };
  return { lines, newline: newline as SavedNewline };
}

// Lexical classes of the Record writer's numeric texts. They are kept verbatim; nothing is parsed into a Number.
// Dot-decimal only: a comma decimal separator splits a field and fails the column layout instead.
const FIXED = /^-?[0-9]+(?:\.[0-9]*)?$/;          // FloatToStrF ffFixed 0x486268 spellings (and their cut-down forms)
const EXPONENT = /^-?[0-9](?:\.[0-9]+)?E[+-][0-9]+$/; // FloatToStrF ffExponent 0x48634c spellings
const INTEGER = /^-?[0-9]+$/;                     // IntToStr 0x40ac14
const UNSIGNED = /^[0-9]+$/;                      // IntToStr of a word (aperture +0x29)
type Rule = Readonly<{ quoted?: number; bare?: RegExp; emptyQuoted?: true }>;
/** Per column: quoted text with a maximum inner length, a bare numeric class, or (reference/vertical/horizontal) the literal '""' 0x570f48 written for 0.0. */
const RULES: Readonly<Record<SavedRowField, Rule>> = {
  object: { quoted: 40 }, frequency: { bare: FIXED }, gain: { bare: FIXED },
  reference: { bare: FIXED, emptyQuoted: true }, vertical: { bare: FIXED, emptyQuoted: true }, horizontal: { bare: EXPONENT, emptyQuoted: true },
  start: { bare: FIXED }, comment: { quoted: 81 }, points: { bare: INTEGER }, intervalMs: { bare: FIXED }, aperture: { bare: UNSIGNED }, file: { quoted: 255 },
};

type Token = Readonly<{ raw: string; start: number; end: number; quoted: boolean; inner: string }>;
/**
 * Splits a row at commas outside quotes. The writer escapes nothing, so a quoted field ends at the next '"', which must
 * be followed by ',' or the end of the row; a '"' anywhere else makes the boundaries ambiguous and is rejected.
 */
function tokenize(text: string): Token[] | null {
  const out: Token[] = [];
  let p = 0;
  for (;;) {
    if (text[p] === '"') {
      const close = text.indexOf('"', p + 1);
      if (close < 0 || (close + 1 < text.length && text[close + 1] !== ',')) return null;
      out.push({ raw: text.slice(p, close + 1), start: p, end: close + 1, quoted: true, inner: text.slice(p + 1, close) });
      p = close + 1;
    } else {
      const comma = text.indexOf(',', p), end = comma < 0 ? text.length : comma, raw = text.slice(p, end);
      if (raw.includes('"')) return null;
      out.push({ raw, start: p, end, quoted: false, inner: raw });
      p = end;
    }
    if (p === text.length) return out;
    p++; // the comma
    if (p === text.length) { out.push({ raw: '', start: p, end: p, quoted: false, inner: '' }); return out; }
  }
}

function admitRow(line: SavedLine, ordinal: number): SavedRow | SavedRowsError {
  const { text } = line, at = line.line;
  if (text === '') return { code: 'row-blank', line: at };
  if (text.length > SAVED_ROWS_LIMITS.maxRowBytes) return { code: 'row-length', line: at, count: text.length };
  const tokens = tokenize(text);
  if (!tokens) return { code: 'row-quote', line: at };
  if (tokens.length !== 11 && tokens.length !== 12) return { code: 'row-columns', line: at, count: tokens.length };
  const fields: SavedField[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i], field = SAVED_ROW_FIELDS[i], rule = RULES[field];
    const ok = t.quoted
      ? (rule.quoted !== undefined && t.inner.length <= rule.quoted) || (rule.emptyQuoted === true && t.inner === '')
      : rule.bare !== undefined && t.raw.length <= SAVED_ROWS_LIMITS.maxNumberBytes && rule.bare.test(t.raw);
    if (!ok) return { code: 'row-field', line: at, field };
    fields.push(Object.freeze({ field, raw: t.raw, span: span(line.span.start + t.start, line.span.start + t.end), quoted: t.quoted, inner: t.inner }));
  }
  return Object.freeze({ ordinal, line: at, text, span: line.span, columns: tokens.length as 11 | 12, fields: Object.freeze(fields) });
}

const isError = (v: object): v is SavedRowsError => 'code' in v;
/** A metadata value with an embedded '"' is outside this profile (WEB: no escaping is recovered, and none is assumed). */
const quoteFree = (s: string) => !s.includes('"');

/**
 * Admits a complete supplied file or rejects it with the first problem found. The bytes are copied first, so later
 * changes to the caller's buffer cannot reach the source. A rejection creates nothing.
 *
 * Layout (fresh-file branch of 0x56feac, every line written by WriteLn):
 *   1 '"' first '","' second '"'      opaque (0x56ffcd..0x570045: two values of 0x40d47c formatted by 0x40e07c)
 *   2 '"Table Number: ' T '"'          opaque T, 0..4 bytes (0x57004f..0x5700bd)
 *   3 blank                            (0x5700c2)
 *     0..4 '"' identity '"'            opaque, 1..40 bytes each (0x5700d9..0x57026a)
 *     blank                            (0x57026f)
 *     SAVED_ROWS_HEADER                (0x570286..0x5702a6)
 *     1..n rows                        list strings by ordinal (0x5702ab..0x5702e8); an empty list is refused natively (0x56feee)
 * An append save (0x4037bc succeeded) writes rows only, after the existing content, so rows of several saves can
 * follow one header; they are indistinguishable here and are kept in file order.
 */
export function admitSavedRows(input: Uint8Array, fileName: string): SavedRowsAdmission {
  if (input.length === 0) return fail('empty');
  if (input.length > SAVED_ROWS_LIMITS.maxBytes) return fail('too-large', { count: input.length });
  const bytes = new Uint8Array(input);
  const split = splitLines(bytes);
  if ('code' in split) return fail(split.code, split);
  const { lines, newline } = split;
  const at = (i: number) => (i < lines.length ? lines[i] : null);

  const first = at(0);
  if (!first) return fail('truncated', { line: 1 });
  const dt = /^"([^"]*)","([^"]*)"$/.exec(first.text);
  if (!dt || dt[1].length > SAVED_ROWS_LIMITS.maxDateTimeBytes || dt[2].length > SAVED_ROWS_LIMITS.maxDateTimeBytes) return fail('date-time', { line: 1 });

  const second = at(1);
  if (!second) return fail('truncated', { line: 2 });
  const t = second.text;
  if (!t.startsWith(SAVED_ROWS_TABLE_PREFIX) || !t.endsWith('"') || t.length < SAVED_ROWS_TABLE_PREFIX.length + 1 || t.length > SAVED_ROWS_TABLE_PREFIX.length + SAVED_ROWS_TABLE_MAX + 1)
    return fail('table', { line: 2 });
  const tableValue = t.slice(SAVED_ROWS_TABLE_PREFIX.length, -1);
  if (!quoteFree(tableValue)) return fail('metadata-quote', { line: 2 });

  const third = at(2);
  if (!third) return fail('truncated', { line: 3 });
  if (third.text !== '') return fail('blank-expected', { line: 3 });

  const identities: SavedOpaqueLine[] = [];
  let i = 3;
  for (;;) {
    const l = at(i);
    if (!l) return fail('truncated', { line: i + 1 });
    if (l.text === '') break;
    if (identities.length === SAVED_ROWS_IDENTITY_SLOTS) return fail('identity-count', { line: l.line });
    const m = /^"(.{1,40})"$/.exec(l.text);
    if (!m) return fail('identity', { line: l.line });
    if (!quoteFree(m[1])) return fail('metadata-quote', { line: l.line });
    identities.push(Object.freeze({ line: l.line, text: l.text, value: m[1] }));
    i++;
  }
  const headerLine = at(i + 1);
  if (!headerLine) return fail('truncated', { line: i + 2 });
  if (headerLine.text !== SAVED_ROWS_HEADER) return fail('header', { line: headerLine.line });

  const body = lines.slice(i + 2);
  if (body.length === 0) return fail('no-rows', { line: i + 3 });
  if (body.length > SAVED_ROWS_LIMITS.maxRows) return fail('too-many-rows', { count: body.length });
  const rows: SavedRow[] = [];
  for (const l of body) {
    const row = admitRow(l, rows.length);
    if (isError(row)) return fail(row.code, row);
    rows.push(row);
  }

  const metadata: SavedMetadata = Object.freeze({
    dateTime: Object.freeze({ line: 1, text: first.text, first: dt[1], second: dt[2] }),
    table: Object.freeze({ line: 2, text: t, value: tableValue }),
    identities: Object.freeze(identities),
    header: Object.freeze({ line: headerLine.line, text: headerLine.text }),
  });
  const source: SavedRowsSource = Object.freeze({ fileName, byteLength: bytes.length, newline, lines: Object.freeze(lines), metadata, rows: Object.freeze(rows) });
  ownedBytes.set(source, bytes);
  return Object.freeze({ ok: true, source });
}

/** Rebuilds the byte sequence from the line texts and their terminator spans (a self-check of losslessness). */
export function savedRowsReassemble(source: SavedRowsSource): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(source.byteLength), crlf = source.newline === 'CRLF';
  let p = 0;
  for (const l of source.lines) {
    for (let k = 0; k < l.text.length; k++) out[p++] = l.text.charCodeAt(k);
    if (crlf) out[p++] = 0x0d;
    out[p++] = 0x0a;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Find (PLR-REVIEW-FIND-STATIC-01 over the owned rows)

/** Decoded literals and DFM captions (find-literal-recovery/literals.json; TGETSRCHSTRDLG, '&' accelerators removed). */
export const SAVED_FIND_LITERALS = Object.freeze({
  caption: 'Find Record Containing...', // AnsiString 0x5636e8
  notFoundCaption: 'String Not Found',  // PChar 0x563728
  quote: '"',                           // AnsiString 0x56370c
  notFoundTail: '" Not Found.',         // AnsiString 0x563718
  searchString: 'Search String:', beginSearch: 'Begin Search:', fromTop: 'From Top', fromCursor: 'From Cursor', cancel: 'Cancel', caseDependent: 'Case Dependent',
});
/** SrchStr1 MaxLength (DFM). */
export const SAVED_FIND_MAX_QUERY = 80;

/** The dialog's remembered state: PChar query +0x380 and case byte +0x3d3. FormCreate 0x492a8c: '' and 0. */
export type SavedFindMemory = Readonly<{ query: string; caseDependent: boolean }>;
export const SAVED_FIND_INITIAL: SavedFindMemory = Object.freeze({ query: '', caseDependent: false });
export type SavedFindDraft = Readonly<{ text: string; caseDependent: boolean }>;
export type SavedFindAction = 'top' | 'cursor' | 'cancel';
export type SavedFindOutcome =
  | Readonly<{ kind: 'cancelled' }>
  | Readonly<{ kind: 'refused'; reason: 'query-length' | 'query-text' }>
  | Readonly<{ kind: 'empty' }>
  | Readonly<{ kind: 'found'; ordinal: number; start: number; scanned: number }>
  | Readonly<{ kind: 'miss'; start: number; scanned: number; caption: string; body: string }>;
export type SavedFindResult = Readonly<{ memory: SavedFindMemory; selection: number | null; outcome: SavedFindOutcome }>;

/** StrLower 0x40bb04 / LowerCase 0x40a4a0 on ASCII text: only 'A'..'Z' change, by +0x20. */
export const savedFindLower = (s: string) => s.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x20));
/** WEB query bound: printable ASCII only (no code page or locale is modelled), at most SrchStr1.MaxLength characters. */
export const savedFindQueryProblem = (text: string): 'query-length' | 'query-text' | null =>
  text.length > SAVED_FIND_MAX_QUERY ? 'query-length' : /^[\x20-\x7e]*$/.test(text) ? null : 'query-text';

/** FormActivate 0x492aa4 shows the remembered query and case flag. */
export const savedFindOpen = (memory: SavedFindMemory): SavedFindDraft => Object.freeze({ text: memory.query, caseDependent: memory.caseDependent });

/**
 * One dialog answer followed by the caller FndBtnClick 0x5634c8, over the exact row strings (`rows`, by ordinal).
 * - Cancel 0x492c5c: mode 2; the draft is not copied, so query and case flag stay as remembered.
 * - From Top 0x492b24 / From Cursor 0x492bc0: the draft text and case flag are stored first; an empty text then gives
 *   mode 2, so nothing is searched and the selection is unchanged.
 * - Otherwise the caller lowercases the stored query in place (it stays lowercase), starts at 0 (Top) or selection + 1
 *   (Cursor; no selection counts as −1), and for each row from there to the end compares a separate lowercased copy
 *   with Pos; the first row containing the query is selected. No wrap. When the row count is ≤ start no row is read.
 *   A miss leaves the selection and builds '"' + query + '" Not Found.' with caption 'String Not Found'.
 * - The case flag is stored but never read by this caller.
 * WEB: a draft outside savedFindQueryProblem is refused and changes nothing (the dialog stays open).
 */
export function savedFindRun(rows: readonly string[], selection: number | null, memory: SavedFindMemory, draft: SavedFindDraft, action: SavedFindAction): SavedFindResult {
  const result = (m: SavedFindMemory, sel: number | null, outcome: SavedFindOutcome): SavedFindResult => Object.freeze({ memory: m, selection: sel, outcome: Object.freeze(outcome) });
  if (action === 'cancel') return result(memory, selection, { kind: 'cancelled' });
  const problem = savedFindQueryProblem(draft.text);
  if (problem) return result(memory, selection, { kind: 'refused', reason: problem });
  if (draft.text.length === 0) return result(Object.freeze({ query: '', caseDependent: draft.caseDependent }), selection, { kind: 'empty' });
  const query = savedFindLower(draft.text);
  const stored: SavedFindMemory = Object.freeze({ query, caseDependent: draft.caseDependent });
  const start = action === 'top' ? 0 : (selection ?? -1) + 1;
  let scanned = 0;
  for (let i = start; i < rows.length; i++) {
    scanned++;
    if (savedFindLower(rows[i]).includes(query)) return result(stored, i, { kind: 'found', ordinal: i, start, scanned });
  }
  return result(stored, selection, { kind: 'miss', start, scanned, caption: SAVED_FIND_LITERALS.notFoundCaption, body: SAVED_FIND_LITERALS.quote + query + SAVED_FIND_LITERALS.notFoundTail });
}

// ---------------------------------------------------------------------------------------------------------------
// Workspace: read ownership, candidate confirmation, selection and Find memory (WEB state, not a native form)

export type SavedRowsCandidate = Readonly<{ token: number; source: SavedRowsSource; sha256: string }>;
export type SavedRowsAccepted = Readonly<{ source: SavedRowsSource; sha256: string }>;
export type SavedRowsWorkspace = Readonly<{
  accepted: SavedRowsAccepted | null;
  selection: number | null;
  find: SavedFindMemory;
  reading: Readonly<{ token: number; fileName: string }> | null;
  candidate: SavedRowsCandidate | null;
  rejection: Readonly<{ fileName: string; error: SavedRowsError | Readonly<{ code: 'read' }> }> | null;
  nextToken: number;
}>;
export const INITIAL_SAVED_ROWS: SavedRowsWorkspace = Object.freeze({ accepted: null, selection: null, find: SAVED_FIND_INITIAL, reading: null, candidate: null, rejection: null, nextToken: 1 });
export type SavedReadResult =
  | Readonly<{ ok: true; source: SavedRowsSource; sha256: string }>
  | Readonly<{ ok: false; error: SavedRowsError | Readonly<{ code: 'read' }> }>;

const next = (ws: SavedRowsWorkspace, patch: Partial<SavedRowsWorkspace>): SavedRowsWorkspace => Object.freeze({ ...ws, ...patch });

/** A newer read owns the result: it replaces any running read and any unconfirmed candidate. The accepted source stays. */
export const savedRowsBeginRead = (ws: SavedRowsWorkspace, fileName: string): SavedRowsWorkspace =>
  next(ws, { reading: Object.freeze({ token: ws.nextToken, fileName }), candidate: null, rejection: null, nextToken: ws.nextToken + 1 });
/** Explicit Cancel reading (or host deactivation): its result will be ignored. */
export const savedRowsCancelRead = (ws: SavedRowsWorkspace): SavedRowsWorkspace => (ws.reading ? next(ws, { reading: null }) : ws);
/** A result whose token is not the running read (cancelled or superseded) changes nothing. */
export function savedRowsReadFinished(ws: SavedRowsWorkspace, token: number, r: SavedReadResult): SavedRowsWorkspace {
  if (ws.reading?.token !== token) return ws;
  const fileName = ws.reading.fileName;
  return r.ok
    ? next(ws, { reading: null, candidate: Object.freeze({ token, source: r.source, sha256: r.sha256 }) })
    : next(ws, { reading: null, rejection: Object.freeze({ fileName, error: r.error }) });
}
/** Explicit confirmation replaces the accepted source; the selection starts on row 0. Find memory is kept (one dialog). */
export const savedRowsConfirm = (ws: SavedRowsWorkspace): SavedRowsWorkspace =>
  ws.candidate ? next(ws, { accepted: Object.freeze({ source: ws.candidate.source, sha256: ws.candidate.sha256 }), selection: 0, candidate: null }) : ws;
export const savedRowsDiscardCandidate = (ws: SavedRowsWorkspace): SavedRowsWorkspace => (ws.candidate ? next(ws, { candidate: null }) : ws);
export const savedRowsDismissRejection = (ws: SavedRowsWorkspace): SavedRowsWorkspace => (ws.rejection ? next(ws, { rejection: null }) : ws);
export function savedRowsSelect(ws: SavedRowsWorkspace, ordinal: number): SavedRowsWorkspace {
  const n = ws.accepted?.source.rows.length ?? 0;
  return Number.isInteger(ordinal) && ordinal >= 0 && ordinal < n && ordinal !== ws.selection ? next(ws, { selection: ordinal }) : ws;
}
/** Find over the accepted rows. Without an accepted source nothing happens. */
export function savedRowsFind(ws: SavedRowsWorkspace, draft: SavedFindDraft, action: SavedFindAction): Readonly<{ workspace: SavedRowsWorkspace; outcome: SavedFindOutcome | null }> {
  if (!ws.accepted) return { workspace: ws, outcome: null };
  const r = savedFindRun(ws.accepted.source.rows.map(row => row.text), ws.selection, ws.find, draft, action);
  const changed = r.memory !== ws.find || r.selection !== ws.selection;
  return { workspace: changed ? next(ws, { find: r.memory, selection: r.selection }) : ws, outcome: r.outcome };
}
