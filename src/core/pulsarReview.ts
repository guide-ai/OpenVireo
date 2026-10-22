/**
 * Review transaction of the recorded-measurement list (TMeasListDlg, class ref 0x5631f8, VMT 0x563244).
 * Pure TypeScript, with no React or i18n. The outer working-copy transaction and the confirmed Delete are
 * implemented here; the comment-only Edit (0x56373c) on a proven round-trip subset is in pulsarReviewEdit.ts.
 * Find (0x5634c8) is recovered (PLR-REVIEW-FIND-STATIC-01) but not ported: the row text it searches holds native number
 * text and the exact open-dialog FileName text of the loaded file, which the web does not have. Undo and every native
 * writer stay gated.
 *
 * Evidence IDs are the contract IDs of contract/native-contract.json, documented in
 * docs/PULSAR-ANALYSIS-PROVENANCE.json. Behavior comes from bounded GNU disassembly and the Delphi
 * VMT/TPF0 decode of CLEA_VEO.exe SHA-256 781bc970…c54c, not from a runtime witness. Web-only rules are
 * marked WEB: the empty-selection sentinel, Escape and close-request mapping, and host inactivity.
 *
 * Entries are the immutable objects appended by Record (0x570b3c). The working copy holds the same
 * object references; nothing here parses, formats, escapes, renumbers or writes an entry or its opaque
 * nativeLineCandidate.
 */
import { pulsarModalOpen, type PulsarAnalysisState, type PulsarMeasurementEntry, type PulsarOutcome, type PulsarTransition } from './pulsarAnalysis';
import { pulsarReviewEditCancel } from './pulsarReviewEdit';

/**
 * 'confirm-delete': MessageBox flags 0x24 (Yes/No, question). 'no-selection' (Delete) and 'edit-no-selection'
 * (Edit, 0x563766): flags 0x30 (OK, exclamation).
 */
export type PulsarReviewPrompt = 'confirm-delete' | 'no-selection' | 'edit-no-selection';
/**
 * The open comment editor (pulsarReviewEdit.ts): the working-copy ordinal and entry captured when it opened,
 * and the comment draft. WEB: one inline layer; the ordinal cannot change while it is open.
 */
export type PulsarReviewEdit = Readonly<{ ordinal: number; entry: PulsarMeasurementEntry; draft: string }>;
/**
 * The open Review dialog. `draft` is the ListBox1 working copy (Items.Assign from the shared list at
 * activation). `selected` is the ListBox ItemIndex as an ordinal into `draft`, never a sequence ID.
 * WEB: null stands for "no selection" and occurs only while `draft` is empty. At most one of `prompt` and
 * `edit` is open; while either is, every other Review action is refused.
 */
export type PulsarReviewSession = Readonly<{ draft: readonly PulsarMeasurementEntry[]; selected: number | null; prompt: PulsarReviewPrompt | null; edit: PulsarReviewEdit | null }>;

/**
 * Literals decoded from the image: MessageBox caption/text at 0x563958/0x56396c and 0x563988/0x56399c
 * (DelBtnClick 0x56388c), and the TMEASLISTDLG Caption (resource payload SHA-256 4a65cda6…86d2).
 */
export const PULSAR_REVIEW_LITERALS = Object.freeze({
  noSelectionCaption: 'No Item Selected!',
  noSelectionText: 'Select Item for Deletion.',
  confirmationCaption: 'Confirm Deletion',
  confirmationText: 'Delete Selected Item from List?',
  dialogCaption: 'Select Measurement Record',
});

const TX = 'PLR-REVIEW-TRANSACTION-STATIC-01', DELETE = 'PLR-REVIEW-DELETE-STATIC-01', CALLER = 'PLR-REVIEW-CALLER-STATIC-01', EDIT = 'PLR-REVIEW-EDIT-STATIC-01';
/** An inner MessageBox or the comment editor is open over the list. */
const layered = (r: PulsarReviewSession) => r.prompt !== null || r.edit !== null;

const done = (state: PulsarAnalysisState, outcome: PulsarOutcome, evidence: readonly string[]): PulsarTransition =>
  Object.freeze({ state: Object.freeze(state), outcome, changed: true, placed: false, evidence: Object.freeze([...evidence]) });
const keep = (state: PulsarAnalysisState, outcome: PulsarOutcome): PulsarTransition =>
  Object.freeze({ state, outcome, changed: false, placed: false, evidence: Object.freeze([]) });
const session = (s: PulsarAnalysisState, next: Partial<PulsarReviewSession>): PulsarAnalysisState =>
  ({ ...s, reviewSession: Object.freeze({ ...(s.reviewSession as PulsarReviewSession), ...next }) });

/**
 * Review menu → caller 0x56f74c: create the dialog and ShowModal. FormActivate 0x563464 assigns the
 * shared TStringList into ListBox1 and sets ItemIndex 0. Gated by the Review control (+0x388), which
 * Load disables and Record enables.
 * WEB: an empty working copy gets selection null. Natively ItemIndex := 0 on an empty list box is
 * expected to leave no selection, but that getter result is not recovered from this image.
 */
export function pulsarReviewOpen(s: PulsarAnalysisState): PulsarTransition {
  if (pulsarModalOpen(s)) return keep(s, 'blocked-modal');
  if (!s.reviewEnabled) return keep(s, 'review-disabled');
  const draft = Object.freeze([...s.list]);
  return done({ ...s, reviewSession: Object.freeze({ draft, selected: draft.length > 0 ? 0 : null, prompt: null, edit: null }) }, 'review-opened', [CALLER, TX]);
}

/** ListBox1 selection by ordinal. Refused while a MessageBox or the editor is open over the dialog. */
export function pulsarReviewSelect(s: PulsarAnalysisState, ordinal: number): PulsarTransition {
  const r = s.reviewSession;
  if (!r || !Number.isInteger(ordinal) || ordinal < 0 || ordinal >= r.draft.length) return keep(s, 'invalid-input');
  if (layered(r)) return keep(s, 'blocked-modal');
  if (r.selected === ordinal) return keep(s, 'review-selected');
  return done(session(s, { selected: ordinal }), 'review-selected', [TX]);
}

/**
 * DelBtnClick 0x56388c: ItemIndex < 0 → MessageBox 'No Item Selected!' (flags 0x30) and nothing else;
 * otherwise the confirmation (flags 0x24). Nothing is deleted before an explicit Yes.
 */
export function pulsarReviewRequestDelete(s: PulsarAnalysisState): PulsarTransition {
  const r = s.reviewSession;
  if (!r) return keep(s, 'invalid-input');
  if (layered(r)) return keep(s, 'blocked-modal');
  return r.selected === null
    ? done(session(s, { prompt: 'no-selection' }), 'review-no-selection', [DELETE])
    : done(session(s, { prompt: 'confirm-delete' }), 'review-delete-confirm', [DELETE]);
}

/**
 * Answer to the confirmation. Only IDYES (6) deletes (0x5638d8). After Items.Delete(i), when rows remain,
 * ItemIndex := i if i < Count, else Count − 1 (0x563906..0x563944). ModalResult := 0 (0x56394c), so Review
 * stays open. WEB: no rows left gives selection null.
 */
export function pulsarReviewAnswerDelete(s: PulsarAnalysisState, answer: 'yes' | 'no'): PulsarTransition {
  const r = s.reviewSession;
  if (!r || r.prompt !== 'confirm-delete' || r.selected === null || (answer !== 'yes' && answer !== 'no')) return keep(s, 'invalid-input');
  if (answer === 'no') return done(session(s, { prompt: null }), 'review-delete-declined', [DELETE]);
  const i = r.selected, draft = Object.freeze(r.draft.filter((_, k) => k !== i));
  const selected = draft.length === 0 ? null : i < draft.length ? i : draft.length - 1;
  return done(session(s, { draft, selected, prompt: null }), 'review-deleted', [DELETE]);
}

/** OK on the Delete or Edit no-selection notice. ModalResult := 0, so Review stays open. */
export function pulsarReviewDismissNotice(s: PulsarAnalysisState): PulsarTransition {
  const r = s.reviewSession;
  if (r?.prompt === 'no-selection') return done(session(s, { prompt: null }), 'review-notice-closed', [DELETE]);
  if (r?.prompt === 'edit-no-selection') return done(session(s, { prompt: null }), 'review-edit-notice-closed', [EDIT]);
  return keep(s, 'invalid-input');
}

/**
 * CnclBtnClick 0x563494: ModalResult := 2 without copying back. The caller (0x56f781) skips its updates
 * for result 2, so the confirmed list and every flag stay as they were.
 */
export function pulsarReviewCancel(s: PulsarAnalysisState): PulsarTransition {
  const r = s.reviewSession;
  if (!r) return keep(s, 'invalid-input');
  if (layered(r)) return keep(s, 'blocked-modal');
  return done({ ...s, reviewSession: null }, 'review-cancelled', [TX, CALLER]);
}

/**
 * OkBtnClick 0x5634a0: the shared list Assigns ListBox1.Items, then ModalResult := 1. The caller
 * (0x56f78a..0x56f799) then clears form byte 0x5db (listSaved) and enables +0x38c (Save) for any
 * non-Cancel result: no count check, even when nothing changed or every row was deleted. It is not
 * Clear (0x56f7ac): Record, Review, pending flags, cursors and the measurement record are untouched.
 * The native CSV writer stays gated, so saveEnabled enables no web control.
 */
export function pulsarReviewConfirm(s: PulsarAnalysisState): PulsarTransition {
  const r = s.reviewSession;
  if (!r) return keep(s, 'invalid-input');
  if (layered(r)) return keep(s, 'blocked-modal');
  return done({ ...s, list: r.draft, reviewSession: null, listSaved: false, saveEnabled: true }, 'review-confirmed', [TX, CALLER]);
}

/**
 * WEB Escape / dialog close request, one layer at a time: the comment editor is cancelled, the delete
 * question answers No, a no-selection notice is dismissed, otherwise Review is cancelled (outer Cancel).
 * Native parity is not claimed: the DFMs give CnclBtn no Cancel property, a Yes/No MessageBox has no Escape
 * answer, and the window close buttons (VCL mrCancel) are not modelled from this image.
 */
export function pulsarReviewEscape(s: PulsarAnalysisState): PulsarTransition {
  const r = s.reviewSession;
  if (r?.edit) return pulsarReviewEditCancel(s);
  if (r?.prompt === 'confirm-delete') return pulsarReviewAnswerDelete(s, 'no');
  if (r?.prompt === 'no-selection' || r?.prompt === 'edit-no-selection') return pulsarReviewDismissNotice(s);
  return pulsarReviewCancel(s);
}
