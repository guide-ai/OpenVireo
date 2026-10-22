/**
 * Review → Edit (comment only) of the recorded-measurement list. Pure TypeScript, with no React or i18n.
 *
 * Source: CLEA_VEO.exe SHA-256 781bc970…c54c, bounded GNU disassembly and Delphi VMT/TPF0 decode, static only
 * (contract PLR-REVIEW-EDIT-STATIC-01 in docs/PULSAR-ANALYSIS-PROVENANCE.json). No runtime witness.
 * - EditBtnClick 0x56373c..0x56385c: ItemIndex < 0 → MessageBox(PChar 0x563874 'Select Item for Edit.',
 *   caption 0x563860 'No Item Selected!', flags 0x30). Otherwise it creates a new TMeasForm2 (VMT 0x56fcf0,
 *   parent TMeasForm) per click, copies the selected row into that instance's AnsiString +0x4c4, ShowModal, and
 *   re-reads ItemIndex afterwards. Only ModalResult 2 skips the replacement; any other result Puts +0x4c4 at
 *   the re-read ordinal. The instance is freed and Review's ModalResult := 0, so Review stays open.
 * - TMeasForm2.FormActivate 0x570f6c: caption := AnsiString 0x5710bc 'Measurement Data'; when +0x4c4 is not
 *   empty, parser 0x570498 fills the ShortString record at +0x3a8, then the group caption, JD, frequency and
 *   gain captions, Ref1Ed/Vert1Ed/Horz1Ed and Cmnt1Ed get the record text.
 * - TMeasForm2.OkBtnClick 0x5710d0: an empty +0x4c4 gives ModalResult 2. Otherwise only Cmnt1Ed.Text is read
 *   (0x45df24); it is stored in comment[81] and the whole line is rebuilt from the record, ModalResult 1.
 * - Inherited TMeasForm.CnclBtnClick 0x570b30..0x570b3a: ModalResult := 2 (coordinator entry capture).
 *
 * The web port: pulsarEditorParse/pulsarEditorRebuild are literal models of 0x570498/0x5710d0 over the bound RTL
 * helpers (byte strings; caps count bytes). pulsarReviewEditSupport admits an entry only when its candidate is
 * printable ASCII (one byte per character), every structured field fits its ShortString capacity, the candidate
 * equals the structured-field template, and the literal parse/rebuild reproduces the candidate exactly with every
 * parsed field equal to its structured field. Only then does OK keep the raw prefix and suffix and splice the new
 * comment, after checking that the splice equals both the literal rebuild and the template. Everything else is
 * refused with a reason and nothing changes. The template duplicates the web Record writer's lineCandidate
 * (pulsarAnalysis.ts), so it is not an independent model: agreement with it only guards that the candidate still has
 * the web writer's layout, and fails closed ('layout') if the two copies diverge. Only the literal parse/rebuild is
 * traced to the editor captures, and its agreement with a web-built candidate is self-consistency, not a native
 * Record-writer witness (x87 number text and writer caps stay unbound, and the native file field is the open-dialog
 * FileName, PLR-REVIEW-FIND-STATIC-01): NativeLineCandidate stays an internal opaque candidate.
 *
 * WEB: the editor is one inline layer of the Review dialog. It keeps the working copy and the ordinal captured
 * when it opened (all other Review actions are refused while it is open). Natively Review's OnActivate may re-run
 * when the nested VCL form closes, re-assigning the shared list and ItemIndex 0 before the re-read; that is
 * unwitnessed, so no native window, ModalResult or reactivation behavior is modelled. OK and Cancel are the only
 * results; Escape is Cancel.
 */
import { pulsarCommentValid, type PulsarAnalysisState, type PulsarEntryFields, type PulsarMeasurementEntry, type PulsarOutcome, type PulsarTransition } from './pulsarAnalysis';
import type { PulsarReviewSession } from './pulsarReview';

/** Decoded literals: PChar 0x563860/0x563874 (EditBtnClick) and AnsiString 0x5710bc (FormActivate caption). */
export const PULSAR_REVIEW_EDIT_LITERALS = Object.freeze({
  noSelectionCaption: 'No Item Selected!',
  noSelectionText: 'Select Item for Edit.',
  formCaption: 'Measurement Data',
});
/**
 * TMEASFORM DFM captions (resource SHA-256 6e25ed87…14c9), which TMeasForm2 is inferred to inherit (there is no
 * TMEASFORM2 resource). Trailing blanks and the '&' accelerators are dropped.
 */
export const PULSAR_REVIEW_EDIT_DFM = Object.freeze({
  julianDate: 'Julian Date (-2,400,000):', frequency: 'Frequency (MHz):', gain: 'Gain:', readings: 'Cursor Readings:',
  reference: 'Reference (Sec)', vertical: 'Vertical (Sec)', horizontal: 'Horizontal (Rel)', comment: 'Comment:', ok: 'OK', cancel: 'Cancel',
});

// ---------------------------------------------------------------- RTL helpers over byte strings
// Each JS string here is a byte string: the supported domain is printable ASCII, so one character is one byte.

/** Pos 0x40640c: 1-based index of the first occurrence; 0 when either string is empty or the needle is longer. */
export function rtlPos(needle: string, haystack: string): number {
  if (needle.length === 0 || haystack.length === 0 || needle.length > haystack.length) return 0;
  return haystack.indexOf(needle) + 1;
}
/** Copy 0x406328: index ≤ 0 starts at 1 (count unchanged); index past the end or count < 0 gives ''; count is clamped to the rest. */
export function rtlCopy(s: string, index: number, count: number): string {
  if (s.length === 0) return '';
  const i = Math.max(0, index - 1);
  if (i >= s.length || count < 0) return '';
  return s.slice(i, i + Math.min(count, s.length - i));
}
/** Delete 0x406368: no change for an empty string, index < 1 or past the end, or count ≤ 0; count is clamped to the rest. */
export function rtlDelete(s: string, index: number, count: number): string {
  const i = index - 1;
  if (s.length === 0 || i < 0 || i >= s.length || count <= 0) return s;
  return s.slice(0, i) + s.slice(i + Math.min(count, s.length - i));
}
/** AnsiString → ShortString 0x4060cc: the first min(length, cap) bytes. */
export const rtlAnsiToShort = (s: string, cap: number) => s.slice(0, Math.min(s.length, cap));
/** ShortString copy 0x403c5c: the first min(length, cap) bytes (cap in CL). */
export const rtlShortCopy = (s: string, cap: number) => s.slice(0, Math.min(s.length, cap));
/**
 * ShortString append 0x403c20 with total capacity cap: appends everything when length(dst) + length(src) ≤ cap
 * (and ≤ 255); otherwise only cap − length(dst) bytes, or nothing when dst already holds cap bytes.
 */
export function rtlShortAppend(dst: string, src: string, cap: number): string {
  const total = dst.length + src.length;
  if (total <= 255 && total <= cap) return dst + src;
  return cap > dst.length ? dst + src.slice(0, cap - dst.length) : dst;
}
/** ShortString literal 0x570894: length byte 2, '""', then 0x00 (typed-bound to 0x403cfc at 0x57067a). */
const QUOTED_EMPTY = [2, 0x22, 0x22, 0];
/**
 * 0x403cfc called with ECX = length + 1 (0x570676..0x57067a): compares the field's length byte and its bytes
 * with the literal. Equal only for the exact two-byte '""'.
 */
export function rtlShortIsQuotedEmpty(field: string): boolean {
  const bytes = [field.length, ...[...field].map(c => c.charCodeAt(0))];
  return bytes.every((b, i) => b === QUOTED_EMPTY[i]);
}

// ---------------------------------------------------------------- editor record: parse 0x570498, rebuild 0x5710d0
/** ShortString capacities of the TMeasForm2 record at +0x3a8 (parser CL values; comment also 0x571164). */
export const PULSAR_EDITOR_CAPACITIES = Object.freeze({ object: 40, frequency: 7, gain: 5, reference: 9, vertical: 9, horizontal: 10, start: 14, comment: 81, tail: 100 });
export type PulsarEditorField = keyof typeof PULSAR_EDITOR_CAPACITIES;
/** The record as parser 0x570498 leaves it. A field equal to '""' is stored empty (reference/vertical/horizontal only). */
export type PulsarEditorRecord = Readonly<Record<PulsarEditorField, string>>;

/**
 * Parser 0x570498. Delete the first byte unchecked; object runs to the next '"' (AnsiString 0x570884), then
 * Delete(p+1) also drops the byte after it; frequency, gain, reference, vertical, horizontal run to the next
 * ',' (0x570890); start runs to ',' and Delete(p+1) drops the byte after it; comment runs to the next '"' and
 * Delete(p+1) drops the byte after it; the tail is the remainder. Every field goes Copy → 0x4060cc (cap 255) →
 * 0x403c5c (field cap). Each of reference/vertical/horizontal equal to ShortString '""' is cleared.
 */
export function pulsarEditorParse(line: string): PulsarEditorRecord {
  let rest = line, p = 0;
  const field = (cap: number) => rtlShortCopy(rtlAnsiToShort(rtlCopy(rest, 1, p - 1), 255), cap);
  const next = (literal: '"' | ',') => { p = rtlPos(literal, rest); };
  rest = rtlDelete(rest, 1, 1);
  next('"'); const object = field(40); rest = rtlDelete(rest, 1, p + 1);
  next(','); const frequency = field(7); rest = rtlDelete(rest, 1, p);
  next(','); const gain = field(5); rest = rtlDelete(rest, 1, p);
  const measured = (cap: number) => { next(','); const v = field(cap); rest = rtlDelete(rest, 1, p); return rtlShortIsQuotedEmpty(v) ? '' : v; };
  const reference = measured(9), vertical = measured(9), horizontal = measured(10);
  next(','); const start = field(14); rest = rtlDelete(rest, 1, p + 1);
  next('"'); const comment = field(81); rest = rtlDelete(rest, 1, p + 1);
  const tail = rtlShortCopy(rtlAnsiToShort(rest, 255), 100);
  return Object.freeze({ object, frequency, gain, reference, vertical, horizontal, start, comment, tail });
}

/**
 * OkBtnClick 0x5710d0 for a non-empty source line. The control text goes 0x4060cc (cap 255) → comment[81]. The
 * opening part is ShortString: '"' (0x5713f4) then appends with caps 0x29/0x2a/0x2b/0x32/0x33/0x38/0x39 of object,
 * '"', ',' (0x5713f8), frequency, ',', gain, ','. Then AnsiString: each of reference/vertical/horizontal is
 * text + ',' (0x571404, CatN 0x4061c4) or, when its length byte is 0, '"",' (0x571410, 0x4060fc); finally CatN of
 * start, ',', '"' (0x57141c), comment, '"', ',', tail, left to right. Nothing is escaped.
 */
export function pulsarEditorRebuild(record: PulsarEditorRecord, controlText: string): string {
  const comment = rtlShortCopy(rtlAnsiToShort(controlText, 255), 81);
  let head = '"';
  for (const [part, cap] of [[record.object, 0x29], ['"', 0x2a], [',', 0x2b], [record.frequency, 0x32], [',', 0x33], [record.gain, 0x38], [',', 0x39]] as const)
    head = rtlShortAppend(head, part, cap);
  let line = head;
  for (const v of [record.reference, record.vertical, record.horizontal]) line = v.length > 0 ? line + v + ',' : line + '"",';
  return line + record.start + ',' + '"' + comment + '"' + ',' + record.tail;
}

// ---------------------------------------------------------------- supported subset
/** The opaque tail of a record line: points, interval (ms), aperture and the quoted file name, as Record appends them. */
export const pulsarEntryTail = (f: PulsarEntryFields) => `${f.points},${f.intervalMs},${f.aperture},"${f.file}"`;
/**
 * The record-line template of the structured fields with comment c. A duplicate of the web Record writer's
 * lineCandidate (pulsarAnalysis.ts), kept as a self-consistency guard; not an independent model or a native witness.
 */
const template = (f: PulsarEntryFields, c: string) =>
  `"${f.object}",${f.frequency},${f.gain},` + [f.reference, f.vertical, f.horizontal].map(v => (v === null ? '"",' : `${v},`)).join('') + `${f.start},"${c}",${pulsarEntryTail(f)}`;
/** WEB supported byte domain: printable ASCII 0x20..0x7e, so each character is exactly one byte under any ANSI code page. */
const PRINTABLE = /^[\x20-\x7e]*$/;

export type PulsarEditUnsupported = 'text' | 'object-quote' | 'length' | 'layout';
export type PulsarEditSupport =
  | Readonly<{ supported: true; record: PulsarEditorRecord }>
  | Readonly<{ supported: false; reason: PulsarEditUnsupported; field: PulsarEditorField | null; length: number | null; capacity: number | null }>;
const refuse = (reason: PulsarEditUnsupported, field: PulsarEditorField | null = null, length: number | null = null, capacity: number | null = null): PulsarEditSupport =>
  Object.freeze({ supported: false, reason, field, length, capacity });

/** Parsed '' stands for a blank (null) structured value; any other parsed text must equal the field exactly. */
const agrees = (r: PulsarEditorRecord, f: PulsarEntryFields) =>
  r.object === f.object && r.frequency === f.frequency && r.gain === f.gain &&
  r.reference === (f.reference ?? '') && f.reference !== '' && r.vertical === (f.vertical ?? '') && f.vertical !== '' &&
  r.horizontal === (f.horizontal ?? '') && f.horizontal !== '' &&
  r.start === f.start && r.comment === f.comment && r.tail === pulsarEntryTail(f);

/**
 * WEB predicate for Edit. In order:
 * 'text' — the candidate or a structured field has a character outside printable ASCII (for example a Unicode
 *   file name, a tab or a line break), so its byte length and code-page bytes are not established;
 * 'object-quote' — the object contains '"', which the parser treats as the end of the object;
 * 'length' — a structured field, or the computed tail, is longer in bytes than its ShortString capacity;
 * 'layout' — the candidate is not exactly the structured template, or the literal parse disagrees with a field,
 *   or the literal rebuild of the parsed record is not byte-identical to the candidate.
 * Commas in the object or comment and quotes or commas inside the file name (opaque tail) are not refused as such.
 */
export function pulsarReviewEditSupport(entry: PulsarMeasurementEntry): PulsarEditSupport {
  const line = entry.nativeLineCandidate, f = entry.fields;
  const lengths: readonly (readonly [PulsarEditorField, string | null])[] = [
    ['object', f.object], ['frequency', f.frequency], ['gain', f.gain], ['reference', f.reference], ['vertical', f.vertical],
    ['horizontal', f.horizontal], ['start', f.start], ['comment', f.comment], ['tail', pulsarEntryTail(f)],
  ];
  if (typeof line !== 'string' || line.length === 0 || !PRINTABLE.test(line) || !lengths.every(([, v]) => v === null || PRINTABLE.test(v))) return refuse('text');
  if (f.object.includes('"')) return refuse('object-quote', 'object');
  for (const [k, v] of lengths) if (v !== null && v.length > PULSAR_EDITOR_CAPACITIES[k]) return refuse('length', k, v.length, PULSAR_EDITOR_CAPACITIES[k]);
  if (line !== template(f, f.comment)) return refuse('layout');
  const record = pulsarEditorParse(line);
  if (!agrees(record, f) || pulsarEditorRebuild(record, record.comment) !== line) return refuse('layout');
  return Object.freeze({ supported: true, record });
}

/**
 * The candidate after OK with comment c, or null when the subset does not hold or c is not a valid comment. The
 * raw prefix (through the opening '"' of the comment) and suffix ('",' and the tail) of the stored candidate are
 * kept, and the splice is used only when it equals both the literal rebuild and the template.
 */
export function pulsarEditedCandidate(entry: PulsarMeasurementEntry, c: string): string | null {
  const support = pulsarReviewEditSupport(entry);
  if (!support.supported || !pulsarCommentValid(c)) return null;
  const line = entry.nativeLineCandidate, suffix = 2 + pulsarEntryTail(entry.fields).length;
  const spliced = line.slice(0, line.length - suffix - entry.fields.comment.length) + c + line.slice(line.length - suffix);
  return spliced === pulsarEditorRebuild(support.record, c) && spliced === template(entry.fields, c) ? spliced : null;
}

// ---------------------------------------------------------------- transitions
const EDIT = 'PLR-REVIEW-EDIT-STATIC-01';
const UNSUPPORTED: Readonly<Record<PulsarEditUnsupported, PulsarOutcome>> = Object.freeze({
  text: 'review-edit-unsupported-text', 'object-quote': 'review-edit-unsupported-quote', length: 'review-edit-unsupported-length', layout: 'review-edit-unsupported-layout',
});
const done = (state: PulsarAnalysisState, outcome: PulsarOutcome, evidence: readonly string[] = [EDIT]): PulsarTransition =>
  Object.freeze({ state: Object.freeze(state), outcome, changed: true, placed: false, evidence: Object.freeze([...evidence]) });
const keep = (state: PulsarAnalysisState, outcome: PulsarOutcome): PulsarTransition =>
  Object.freeze({ state, outcome, changed: false, placed: false, evidence: Object.freeze([]) });
const session = (s: PulsarAnalysisState, next: Partial<PulsarReviewSession>): PulsarAnalysisState =>
  ({ ...s, reviewSession: Object.freeze({ ...(s.reviewSession as PulsarReviewSession), ...next }) });

/**
 * Edit button. No selection → the 'No Item Selected!' / 'Select Item for Edit.' notice. A selected entry outside
 * the supported subset is refused with its reason and nothing changes (WEB safeguard; the original would silently
 * normalize, truncate or mis-split it). Otherwise the editor opens on that entry, with its working-copy comment.
 */
export function pulsarReviewRequestEdit(s: PulsarAnalysisState): PulsarTransition {
  const r = s.reviewSession;
  if (!r) return keep(s, 'invalid-input');
  if (r.prompt || r.edit) return keep(s, 'blocked-modal');
  if (r.selected === null) return done(session(s, { prompt: 'edit-no-selection' }), 'review-edit-no-selection');
  const entry = r.draft[r.selected], support = pulsarReviewEditSupport(entry);
  if (!support.supported) return keep(s, UNSUPPORTED[support.reason]);
  return done(session(s, { edit: Object.freeze({ ordinal: r.selected, entry, draft: entry.fields.comment }) }), 'review-edit-opened');
}

/** The comment draft belongs to the open editor; an invalid draft stays visible and uncommitted. */
export function pulsarReviewEditDraft(s: PulsarAnalysisState, draft: string): PulsarTransition {
  const edit = s.reviewSession?.edit;
  if (!edit || typeof draft !== 'string' || draft.length > 256) return keep(s, 'invalid-input');
  if (edit.draft === draft) return keep(s, 'review-edit-draft');
  return done(session(s, { edit: Object.freeze({ ...edit, draft }) }), 'review-edit-draft', []);
}

/**
 * Editor OK. An invalid comment keeps the editor open ('comment-invalid'). Otherwise only the captured ordinal of
 * the working copy is replaced by a new frozen entry: same sequence, panel and other field strings, the new comment
 * and the spliced candidate. Every other row keeps its identity. The confirmed list, measurement comments, pending
 * flags, cursors, readouts, nextSequence, listSaved and saveEnabled wait for Review's Ok (OkBtnClick 0x5710d0 writes
 * no global). An unchanged comment keeps the entry object itself.
 */
export function pulsarReviewEditConfirm(s: PulsarAnalysisState): PulsarTransition {
  const r = s.reviewSession, edit = r?.edit;
  if (!r || !edit || r.draft[edit.ordinal] !== edit.entry) return keep(s, 'invalid-input');
  if (!pulsarCommentValid(edit.draft)) return keep(s, 'comment-invalid');
  if (edit.draft === edit.entry.fields.comment) return done(session(s, { edit: null }), 'review-edited');
  const candidate = pulsarEditedCandidate(edit.entry, edit.draft);
  if (candidate === null) return keep(s, 'review-edit-unsupported-layout');
  const entry: PulsarMeasurementEntry = Object.freeze({ ...edit.entry, fields: Object.freeze({ ...edit.entry.fields, comment: edit.draft }), nativeLineCandidate: candidate });
  const draft = Object.freeze(r.draft.map((e, i) => (i === edit.ordinal ? entry : e)));
  return done(session(s, { draft, edit: null }), 'review-edited');
}

/** Editor Cancel (inherited CnclBtnClick 0x570b30: ModalResult 2, so the caller skips the Put). Nothing changes. */
export function pulsarReviewEditCancel(s: PulsarAnalysisState): PulsarTransition {
  if (!s.reviewSession?.edit) return keep(s, 'invalid-input');
  return done(session(s, { edit: null }), 'review-edit-cancelled');
}

export type PulsarReviewEditView = Readonly<{
  sequence: number; panel: number; object: string; start: string; frequency: string; gain: string;
  reference: string; vertical: string; horizontal: string; draft: string; draftValid: boolean;
}>;
/** What FormActivate 0x570f6c shows: the parsed record, with a cleared reference/vertical/horizontal shown empty. */
export function pulsarReviewEditView(s: PulsarAnalysisState): PulsarReviewEditView | null {
  const edit = s.reviewSession?.edit;
  if (!edit) return null;
  const r = pulsarEditorParse(edit.entry.nativeLineCandidate);
  return Object.freeze({
    sequence: edit.entry.sequence, panel: edit.entry.panel, object: r.object, start: r.start, frequency: r.frequency, gain: r.gain,
    reference: r.reference, vertical: r.vertical, horizontal: r.horizontal, draft: edit.draft, draftValid: pulsarCommentValid(edit.draft),
  });
}
