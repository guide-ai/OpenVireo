import { describe, expect, it } from 'vitest';
import { admitPlrRecording, type PlrRecording } from './pulsarRecording';
import {
  INITIAL_PULSAR_ANALYSIS, PULSAR_SILENT_OUTCOMES, pulsarAnswerClear, pulsarBeginRecord, pulsarConfirmRecord, pulsarFactor, pulsarLoad, pulsarMode, pulsarModalOpen,
  pulsarPan, pulsarPanRate, pulsarPanTick, pulsarPointer, pulsarPointerRelease, pulsarRequestClear, pulsarReset, pulsarZoom,
  type PulsarAnalysisState, type PulsarEntryFields, type PulsarMeasurementEntry, type PulsarTransition,
} from './pulsarAnalysis';
import {
  PULSAR_REVIEW_LITERALS, pulsarReviewAnswerDelete, pulsarReviewCancel, pulsarReviewConfirm, pulsarReviewDismissNotice, pulsarReviewEscape,
  pulsarReviewOpen, pulsarReviewRequestDelete, pulsarReviewSelect,
} from './pulsarReview';
import { PULSAR_MESSAGES_EN } from '../components/PulsarMessages';

// SYNTHETIC fixtures written for the Review contract (contract/acceptance-cases.json). Not CLEA output.
// 11/22/33 are web stable sequence IDs, not ordinals. 22 and 33 carry identical field text and candidate.
function synthetic(name = 'Obj, "Q" E2E'): PlrRecording {
  const lines = [`'${name}',25,1`, '400.00,1400.00,0', '1.0,2.0,1.0', '50000.5,0.01'];
  for (let i = 0; i < 100; i++) lines.push(`${i},10,0`);
  const a = admitPlrRecording(new TextEncoder().encode(lines.join('\r\n') + '\r\n'), 'src, "a".plr');
  if (a.status !== 'admitted') throw new Error(a.reason);
  return a.recording;
}
const fields = (comment: string): PulsarEntryFields => Object.freeze({
  object: 'Obj, "Q" E2E', frequency: '179769313486231570000000000000000000000.00', gain: '0.001', reference: null, vertical: '-0.000001', horizontal: '9.9999E+307',
  start: '50000.50000000', comment, points: '100', intervalMs: '10.00', aperture: '25', file: 'src, "a".plr',
});
// Opaque candidates: deliberately not parseable as CSV. Nothing may parse, re-escape or rewrite them.
const entry = (sequence: number, comment: string, line: string): PulsarMeasurementEntry => Object.freeze({ sequence, panel: 0, fields: fields(comment), nativeLineCandidate: line });
const E11 = entry(11, 'one, "first"', '"Obj, "Q" E2E",x,"",,"one, "first""');
const E22 = entry(22, 'same', '"Obj, "Q" E2E",y,"",,"same"');
const E33 = entry(33, 'same', '"Obj, "Q" E2E",y,"",,"same"');
const ENTRIES: Record<number, PulsarMeasurementEntry> = { 11: E11, 22: E22, 33: E33 };

type Init = Partial<Pick<PulsarAnalysisState, 'listSaved' | 'saveEnabled' | 'recordEnabled' | 'reviewEnabled' | 'nextSequence' | 'pending'>>;
/** Loaded recording with a confirmed list of the given IDs. Defaults follow the vectors' initial flags. */
function initial(ids: readonly number[], init: Init = {}): PulsarAnalysisState {
  const loaded = pulsarLoad(INITIAL_PULSAR_ANALYSIS, synthetic()).state;
  return Object.freeze({ ...loaded, propertiesOpen: false, list: Object.freeze(ids.map(id => ENTRIES[id])), reviewEnabled: true, listSaved: true, saveEnabled: false, nextSequence: 44, ...init });
}
type Action = 'open' | 'requestDelete' | 'yes' | 'no' | 'cancelReview' | 'confirmReview' | 'escapeDelete' | 'escapeReview' | { selectOrdinal: number };
function apply(s: PulsarAnalysisState, a: Action): PulsarTransition {
  if (typeof a === 'object') return pulsarReviewSelect(s, a.selectOrdinal);
  switch (a) {
    case 'open': return pulsarReviewOpen(s);
    case 'requestDelete': return pulsarReviewRequestDelete(s);
    case 'yes': return pulsarReviewAnswerDelete(s, 'yes');
    case 'no': return pulsarReviewAnswerDelete(s, 'no');
    case 'cancelReview': return pulsarReviewCancel(s);
    case 'confirmReview': return pulsarReviewConfirm(s);
    case 'escapeDelete': case 'escapeReview': return pulsarReviewEscape(s);
  }
}
/** Runs the actions; each must be taken (re-selecting the current ordinal is a taken no-op) so a refused step cannot pass silently. */
function run(s: PulsarAnalysisState, actions: readonly Action[]): PulsarAnalysisState {
  for (const a of actions) {
    const tr = apply(s, a);
    expect(tr.changed || tr.outcome === 'review-selected', `${JSON.stringify(a)} → ${tr.outcome}`).toBe(true);
    s = tr.state;
  }
  return s;
}
const ids = (list: readonly PulsarMeasurementEntry[]) => list.map(e => e.sequence);
const draft = (s: PulsarAnalysisState) => ids(s.reviewSession!.draft);
const flags = (s: PulsarAnalysisState) => [s.listSaved, s.saveEnabled, s.recordEnabled, s.reviewEnabled, s.nextSequence, s.pending];

describe('acceptance vectors R01–R17 (contract/acceptance-cases.json)', () => {
  it('R01 open nonempty: the working copy holds the confirmed entries, ordinal 0 is selected, nothing else changes', () => {
    const s0 = initial([11, 22, 33]), s = run(s0, ['open']);
    expect(ids(s.list)).toEqual([11, 22, 33]);
    expect(s.list).toBe(s0.list);
    expect(draft(s)).toEqual([11, 22, 33]);
    expect(s.reviewSession!.selected).toBe(0);
    expect(s.reviewSession!.prompt).toBeNull();
    expect(flags(s)).toEqual(flags(s0));
  });
  it('R02 no selection: an empty working copy has selection null and Delete shows the source notice, Review stays open', () => {
    const s = run(initial([]), ['open', 'requestDelete']);
    expect(s.list).toEqual([]);
    expect(draft(s)).toEqual([]);
    expect(s.reviewSession).toMatchObject({ selected: null, prompt: 'no-selection' });
    expect(PULSAR_REVIEW_LITERALS.noSelectionCaption).toBe('No Item Selected!');
    expect(pulsarReviewRequestDelete(s).outcome).toBe('blocked-modal');
    const closed = run(s, ['escapeDelete']);
    expect(closed.reviewSession).toMatchObject({ selected: null, prompt: null });
    expect(pulsarReviewDismissNotice(s).state.reviewSession).toEqual(closed.reviewSession);
  });
  it.each([
    ['R03-first', 0, [22, 33], 0],
    ['R04-middle', 1, [11, 33], 1],
    ['R05-last', 2, [11, 22], 1],
  ] as const)('%s: Yes removes only the working-copy row and keeps the old ordinal if valid, else the new last', (_id, ordinal, after, selected) => {
    const s0 = initial([11, 22, 33]), s = run(s0, ['open', { selectOrdinal: ordinal }, 'requestDelete', 'yes']);
    expect(s.list).toBe(s0.list);
    expect(draft(s)).toEqual(after);
    expect(s.reviewSession).toMatchObject({ selected, prompt: null });
    expect(flags(s)).toEqual(flags(s0));
  });
  it('R06 only row: deleting the last row leaves an empty open working copy with selection null', () => {
    const s = run(initial([22]), ['open', 'requestDelete', 'yes']);
    expect(ids(s.list)).toEqual([22]);
    expect(draft(s)).toEqual([]);
    expect(s.reviewSession).toMatchObject({ selected: null, prompt: null });
  });
  it('R07 No: nothing is removed and the selection stays', () => {
    const s = run(initial([11, 22, 33]), ['open', { selectOrdinal: 1 }, 'requestDelete', 'no']);
    expect(draft(s)).toEqual([11, 22, 33]);
    expect(s.reviewSession).toMatchObject({ selected: 1, prompt: null });
  });
  it('R08 confirmation required: requesting Delete only opens the question (negative control: no Yes, no delete)', () => {
    const s0 = initial([11, 22, 33]), s = run(s0, ['open', { selectOrdinal: 1 }, 'requestDelete']);
    expect(draft(s)).toEqual([11, 22, 33]);
    expect(s.reviewSession!.prompt).toBe('confirm-delete');
    expect(PULSAR_REVIEW_LITERALS.confirmationText).toBe('Delete Selected Item from List?');
    // While the question is open the outer dialog cannot be answered or changed.
    for (const tr of [pulsarReviewConfirm(s), pulsarReviewCancel(s), pulsarReviewSelect(s, 0), pulsarReviewRequestDelete(s), pulsarReviewDismissNotice(s)])
      expect(tr).toMatchObject({ changed: false, state: s });
    // Negative control: without any Delete request, Yes is refused.
    const open = run(s0, ['open']);
    expect(pulsarReviewAnswerDelete(open, 'yes')).toMatchObject({ changed: false, outcome: 'invalid-input', state: open });
  });
  it('R09 outer Cancel restores: the confirmed list and flags are untouched and reopening starts again from them', () => {
    const s0 = initial([11, 22, 33]), staged = run(s0, ['open', { selectOrdinal: 1 }, 'requestDelete', 'yes']);
    const cancelled = run(staged, ['cancelReview']);
    expect(cancelled.reviewSession).toBeNull();
    expect(cancelled.list).toBe(s0.list);
    expect([cancelled.listSaved, cancelled.saveEnabled]).toEqual([true, false]);
    expect(flags(cancelled)).toEqual(flags(s0));
    const reopened = run(cancelled, ['open']);
    expect(draft(reopened)).toEqual([11, 22, 33]);
    expect(reopened.reviewSession!.selected).toBe(0);
  });
  it('R10 outer OK commits the working copy, closes Review, marks the list unsaved and enables Save, without renumbering', () => {
    const s = run(initial([11, 22, 33]), ['open', { selectOrdinal: 1 }, 'requestDelete', 'yes', 'confirmReview']);
    expect(ids(s.list)).toEqual([11, 33]);
    expect(s.reviewSession).toBeNull();
    expect([s.listSaved, s.saveEnabled, s.nextSequence]).toEqual([false, true, 44]);
  });
  it('R11 OK without edits still runs the caller update: listSaved false, saveEnabled true, same entries', () => {
    const s0 = initial([11, 22, 33]), s = run(s0, ['open', 'confirmReview']);
    expect(ids(s.list)).toEqual([11, 22, 33]);
    s.list.forEach((e, i) => expect(e).toBe(s0.list[i]));
    expect([s.listSaved, s.saveEnabled, s.nextSequence]).toEqual([false, true, 44]);
  });
  it('R12 OK with an empty working copy is not Clear: Record, Review and pending flags stay', () => {
    const s0 = initial([22], { pending: Object.freeze([true, false, false] as const), recordEnabled: true, reviewEnabled: true });
    const s = run(s0, ['open', 'requestDelete', 'yes', 'confirmReview']);
    expect(s.list).toEqual([]);
    expect([s.recordEnabled, s.reviewEnabled, s.pending, s.saveEnabled, s.listSaved, s.nextSequence]).toEqual([true, true, [true, false, false], true, false, 44]);
    expect(s.measurement).toBe(s0.measurement);
    expect(s.cursors).toBe(s0.cursors);
    // Negative control: Clear's Yes is the different reset (0x56f7ac) that disables Record, Review and Save.
    const cleared = pulsarAnswerClear(pulsarRequestClear(s0).state, 'yes').state;
    const viaClear = pulsarAnswerClear(pulsarAnswerClear(pulsarRequestClear({ ...s0, listSaved: false }).state, 'discard').state, 'yes').state;
    for (const c of [cleared, viaClear]) expect([c.list.length, c.recordEnabled, c.reviewEnabled, c.saveEnabled]).toEqual([0, false, false, false]);
    // An empty list keeps Review available after OK, as the native caller does not check the count.
    expect(pulsarReviewOpen(s).changed).toBe(true);
  });
  it('R13 duplicate text keeps the identity of the row actually selected', () => {
    expect(E22.fields).toEqual(E33.fields);
    expect(E22.nativeLineCandidate).toBe(E33.nativeLineCandidate);
    const s = run(initial([11, 22, 33]), ['open', { selectOrdinal: 1 }, 'requestDelete', 'yes', 'confirmReview']);
    expect(ids(s.list)).toEqual([11, 33]);
    expect(s.list[0]).toBe(E11);
    expect(s.list[1]).toBe(E33);
    expect(s.list[1]).not.toBe(E22);
    expect(s.list[1].nativeLineCandidate).toBe('"Obj, "Q" E2E",y,"",,"same"');
  });
  it('R14 retained entries, opaque candidates, recording bytes and the whole display state are unchanged', () => {
    // R-RX4: recording is the shared PulsarData union; this fixture is an admitted file.
    const file = (st: PulsarAnalysisState) => st.recording as PlrRecording;
    const s0 = initial([11, 22, 33]), bytes = file(s0).bytes, copy = Uint8Array.from(bytes);
    const s = run(s0, ['open', { selectOrdinal: 0 }, 'requestDelete', 'yes', 'confirmReview']);
    expect(ids(s.list)).toEqual([22, 33]);
    expect(s.list[0]).toBe(E22);
    expect(s.list[1]).toBe(E33);
    for (const e of s.list) { expect(Object.isFrozen(e)).toBe(true); expect(e.fields).toBe(ENTRIES[e.sequence].fields); }
    expect(s.list[0].nativeLineCandidate).toBe('"Obj, "Q" E2E",y,"",,"same"');
    expect(s.recording).toBe(s0.recording);
    expect(file(s).bytes).toBe(bytes);
    expect(Array.from(file(s).bytes)).toEqual(Array.from(copy));
    const changedKeys = (Object.keys(s0) as (keyof PulsarAnalysisState)[]).filter(k => s[k] !== s0[k]).sort();
    expect(changedKeys).toEqual(['list', 'listSaved', 'saveEnabled']);
  });
  it('R15 WEB Escape on the delete question answers No and keeps Review open', () => {
    const s = run(initial([11, 22, 33]), ['open', 'requestDelete', 'escapeDelete']);
    expect(draft(s)).toEqual([11, 22, 33]);
    expect(s.reviewSession).toMatchObject({ prompt: null, selected: 0 });
  });
  it('R16 WEB Escape on Review is outer Cancel: the staged deletion is discarded', () => {
    const s0 = initial([11, 22, 33]), s = run(s0, ['open', 'requestDelete', 'yes', 'escapeReview']);
    expect(s.reviewSession).toBeNull();
    expect(s.list).toBe(s0.list);
    expect(flags(s)).toEqual(flags(s0));
    const reopened = run(s, ['open']);
    expect(draft(reopened)).toEqual([11, 22, 33]);
    expect(reopened.reviewSession!.selected).toBe(0);
  });
  it('R17 WEB host inactivity: releasing a held latch keeps the staged working copy and selection', () => {
    // A latch held from before Review opened (keyboard opened it while a button was down). Deactivation releases it.
    const pressed = pulsarPointer(initial([11, 22, 33]), 0, { phase: 'down', button: 'left', leftHeld: true, rightHeld: false, x: 10, y: 10 }).state;
    const staged = run(pressed, ['open', { selectOrdinal: 1 }, 'requestDelete', 'yes']);
    const released = pulsarPointerRelease(staged);
    expect(released.changed).toBe(true);
    expect(released.state.reviewSession).toBe(staged.reviewSession);
    expect(draft(released.state)).toEqual([11, 33]);
    expect(released.state.reviewSession!.selected).toBe(1);
    expect(ids(released.state.list)).toEqual([11, 22, 33]);
    // Without a latch, deactivation has no core transition at all.
    expect(pulsarPointerRelease(released.state)).toMatchObject({ changed: false, state: released.state });
  });
});

describe('Review gating and guards', () => {
  it('opens only while Review is enabled and no other modal is open', () => {
    const afterLoad = pulsarLoad(initial([11]), synthetic()).state;
    expect(afterLoad.reviewEnabled).toBe(false);
    expect(ids(afterLoad.list)).toEqual([11]);
    expect(pulsarReviewOpen(afterLoad)).toMatchObject({ changed: false, outcome: 'review-disabled' });
    const s = initial([11]);
    expect(pulsarReviewOpen(pulsarRequestClear(s).state)).toMatchObject({ changed: false, outcome: 'blocked-modal' });
    const open = pulsarReviewOpen(s).state;
    expect(pulsarModalOpen(open)).toBe(true);
    expect(pulsarReviewOpen(open)).toMatchObject({ changed: false, outcome: 'blocked-modal' });
  });
  it('every analysis, record, clear and load action is refused while Review is open', () => {
    const open = run(initial([11, 22]), ['open', 'requestDelete', 'yes']);
    const refused: PulsarTransition[] = [
      pulsarLoad(open, synthetic()), pulsarReset(open), pulsarZoom(open, 'in'), pulsarFactor(open, 0, 'up'), pulsarPan(open, 'left'), pulsarPanTick(open),
      pulsarPanRate(open, 100), pulsarMode(open, 0, 'horizontal'), pulsarBeginRecord(open), pulsarRequestClear(open),
      pulsarPointer(open, 0, { phase: 'down', button: 'left', leftHeld: true, rightHeld: false, x: 5, y: 5 }),
    ];
    for (const tr of refused) expect(tr).toMatchObject({ changed: false, outcome: 'blocked-modal', state: open });
  });
  it('refuses Review actions without a session and out-of-range or non-integer selections', () => {
    const s = initial([11, 22]);
    for (const tr of [pulsarReviewSelect(s, 0), pulsarReviewRequestDelete(s), pulsarReviewAnswerDelete(s, 'yes'), pulsarReviewDismissNotice(s), pulsarReviewCancel(s), pulsarReviewConfirm(s), pulsarReviewEscape(s)])
      expect(tr).toMatchObject({ changed: false, outcome: 'invalid-input', state: s });
    const open = pulsarReviewOpen(s).state;
    for (const o of [-1, 2, 0.5, Number.NaN]) expect(pulsarReviewSelect(open, o)).toMatchObject({ changed: false, outcome: 'invalid-input' });
    expect(pulsarReviewSelect(open, 0)).toMatchObject({ changed: false, outcome: 'review-selected' });
    expect(PULSAR_SILENT_OUTCOMES.has('review-selected')).toBe(true);
    expect(pulsarReviewDismissNotice(open)).toMatchObject({ changed: false, outcome: 'invalid-input' });
  });
  it('the working copy is a separate frozen array; staged deletions never reach the confirmed list before OK', () => {
    const s0 = initial([11, 22, 33]), open = pulsarReviewOpen(s0).state;
    expect(Object.isFrozen(open.reviewSession)).toBe(true);
    expect(Object.isFrozen(open.reviewSession!.draft)).toBe(true);
    const staged = run(open, ['requestDelete', 'yes', 'requestDelete', 'yes']);
    expect(draft(staged)).toEqual([33]);
    expect(staged.list).toBe(s0.list);
    expect(ids(s0.list)).toEqual([11, 22, 33]);
  });
});

describe('Review through the real record path', () => {
  it('a committed deletion keeps the remaining entries and the next record continues the sequence', () => {
    const tap = (s: PulsarAnalysisState, x: number) => {
      const p = { leftHeld: false, rightHeld: false, x, y: 10 } as const;
      return pulsarPointer(pulsarPointer(s, 0, { ...p, phase: 'down', button: 'left' }).state, 0, { ...p, phase: 'up', button: 'left' }).state;
    };
    const record = (s: PulsarAnalysisState, x: number) => pulsarConfirmRecord(pulsarBeginRecord(tap(s, x)).state).state;
    let s = pulsarLoad(INITIAL_PULSAR_ANALYSIS, synthetic()).state;
    for (const x of [10, 20, 20]) s = record(s, x);
    const before = s.list;
    expect(ids(before)).toEqual([1, 2, 3]);
    expect(before[1].fields).toEqual(before[2].fields);
    s = run(s, ['open', { selectOrdinal: 1 }, 'requestDelete', 'yes', 'confirmReview']);
    expect(s.list[0]).toBe(before[0]);
    expect(s.list[1]).toBe(before[2]);
    expect(s.nextSequence).toBe(4);
    s = record(s, 30);
    expect(ids(s.list)).toEqual([1, 3, 4]);
    // A later load keeps the list and disables Review until the next record, as before.
    s = pulsarLoad(s, synthetic()).state;
    expect([ids(s.list), s.reviewEnabled]).toEqual([[1, 3, 4], false]);
  });
});

describe('source literals (PLR-REVIEW-DELETE-STATIC-01, TMEASLISTDLG TPF0)', () => {
  it('decoded MessageBox literals and DFM captions are the English catalog values', () => {
    expect(PULSAR_REVIEW_LITERALS).toEqual({
      noSelectionCaption: 'No Item Selected!', noSelectionText: 'Select Item for Deletion.',
      confirmationCaption: 'Confirm Deletion', confirmationText: 'Delete Selected Item from List?',
      dialogCaption: 'Select Measurement Record',
    });
    expect(PULSAR_MESSAGES_EN['pulsar.review.noSelectionCaption']).toBe(PULSAR_REVIEW_LITERALS.noSelectionCaption);
    expect(PULSAR_MESSAGES_EN['pulsar.review.noSelectionText']).toBe(PULSAR_REVIEW_LITERALS.noSelectionText);
    expect(PULSAR_MESSAGES_EN['pulsar.review.confirmCaption']).toBe(PULSAR_REVIEW_LITERALS.confirmationCaption);
    expect(PULSAR_MESSAGES_EN['pulsar.review.confirmText']).toBe(PULSAR_REVIEW_LITERALS.confirmationText);
    expect(PULSAR_MESSAGES_EN['pulsar.review.heading']).toBe(PULSAR_REVIEW_LITERALS.dialogCaption);
  });
});
