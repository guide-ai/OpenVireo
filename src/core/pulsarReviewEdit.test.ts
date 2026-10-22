import { describe, expect, it } from 'vitest';
import { admitPlrRecording, type PlrRecording } from './pulsarRecording';
import {
  INITIAL_PULSAR_ANALYSIS, PULSAR_COMMENT_MAX, PULSAR_SILENT_OUTCOMES, pulsarBeginRecord, pulsarConfirmRecord, pulsarLoad, pulsarModalOpen, pulsarPointer, pulsarPointerRelease,
  pulsarRecordDraft, pulsarReset, pulsarZoom, type PulsarAnalysisState, type PulsarEntryFields, type PulsarMeasurementEntry, type PulsarTransition,
} from './pulsarAnalysis';
import {
  pulsarReviewAnswerDelete, pulsarReviewCancel, pulsarReviewConfirm, pulsarReviewDismissNotice, pulsarReviewEscape, pulsarReviewOpen, pulsarReviewRequestDelete, pulsarReviewSelect,
} from './pulsarReview';
import {
  PULSAR_EDITOR_CAPACITIES, PULSAR_REVIEW_EDIT_DFM, PULSAR_REVIEW_EDIT_LITERALS, pulsarEditedCandidate, pulsarEditorParse, pulsarEditorRebuild, pulsarEntryTail,
  pulsarReviewEditCancel, pulsarReviewEditConfirm, pulsarReviewEditDraft, pulsarReviewEditSupport, pulsarReviewEditView, pulsarReviewRequestEdit,
  rtlAnsiToShort, rtlCopy, rtlDelete, rtlPos, rtlShortAppend, rtlShortCopy, rtlShortIsQuotedEmpty,
} from './pulsarReviewEdit';
import { PULSAR_MESSAGES_EN } from '../components/PulsarMessages';

// SYNTHETIC vectors written for this contract. They are not CLEA output and not an oracle for the original:
// they check the chosen literal models of 0x570498/0x5710d0 and the web policy against hand-written strings.

// ---------------------------------------------------------------- independent literal vectors
/** V1 (claude-feasibility report): every expected string below is written out by hand, not built by the module. */
const V1_LINE = '"PSR 0329+54",408.00,1.000,"",0.714520,1.2345E+02,51234.56789012,"pulse A",4000,1.00,26,"B0329.PLR"';
const V1_FIELDS: PulsarEntryFields = Object.freeze({
  object: 'PSR 0329+54', frequency: '408.00', gain: '1.000', reference: null, vertical: '0.714520', horizontal: '1.2345E+02',
  start: '51234.56789012', comment: 'pulse A', points: '4000', intervalMs: '1.00', aperture: '26', file: 'B0329.PLR',
});
const literal = (fields: PulsarEntryFields, line: string, sequence = 7): PulsarMeasurementEntry => Object.freeze({ sequence, panel: 1, fields: Object.freeze(fields), nativeLineCandidate: line });
const V1 = literal(V1_FIELDS, V1_LINE);
/** Test-local third copy of the record-line template, used only to build boundary rows. */
const lineOf = (f: PulsarEntryFields) =>
  `"${f.object}",${f.frequency},${f.gain},${f.reference ?? '""'},${f.vertical ?? '""'},${f.horizontal ?? '""'},${f.start},"${f.comment}",${f.points},${f.intervalMs},${f.aperture},"${f.file}"`;
const row = (patch: Partial<PulsarEntryFields>, line?: string) => { const f = Object.freeze({ ...V1_FIELDS, ...patch }); return literal(f, line ?? lineOf(f)); };
const why = (e: PulsarMeasurementEntry) => { const r = pulsarReviewEditSupport(e); return r.supported ? 'supported' : [r.reason, r.field, r.length, r.capacity]; };

describe('RTL helper ports (bounded captures 0x40640c, 0x406328, 0x406368, 0x4060cc, 0x403c5c, 0x403c20, 0x403cfc)', () => {
  it('Pos is 1-based and 0 for a missing, empty or longer needle or an empty haystack', () => {
    expect(rtlPos('"', 'ab"c"')).toBe(3);
    expect(rtlPos(',', 'abc')).toBe(0);
    expect(rtlPos('', 'abc')).toBe(0);
    expect(rtlPos(',', '')).toBe(0);
    expect(rtlPos('abcd', 'abc')).toBe(0);
  });
  it('Copy clamps the start and count, and a negative count or a start past the end gives an empty string', () => {
    expect(rtlCopy('abcdef', 2, 3)).toBe('bcd');
    expect(rtlCopy('abcdef', 0, 2)).toBe('ab');
    expect(rtlCopy('abcdef', -3, 2)).toBe('ab');
    expect(rtlCopy('abcdef', 5, 99)).toBe('ef');
    expect(rtlCopy('abcdef', 7, 1)).toBe('');
    expect(rtlCopy('abcdef', 1, -1)).toBe('');
    expect(rtlCopy('abcdef', 1, 0)).toBe('');
    expect(rtlCopy('', 1, 1)).toBe('');
  });
  it('Delete ignores an index outside the string or a nonpositive count and clamps the count', () => {
    expect(rtlDelete('abcdef', 2, 2)).toBe('adef');
    expect(rtlDelete('abcdef', 5, 99)).toBe('abcd');
    expect(rtlDelete('abcdef', 0, 2)).toBe('abcdef');
    expect(rtlDelete('abcdef', 7, 1)).toBe('abcdef');
    expect(rtlDelete('abcdef', 1, 0)).toBe('abcdef');
    expect(rtlDelete('abcdef', 1, -1)).toBe('abcdef');
    expect(rtlDelete('', 1, 1)).toBe('');
  });
  it('ShortString copies keep the first min(length, cap) bytes; append fills only up to its total cap', () => {
    expect(rtlAnsiToShort('x'.repeat(300), 255)).toHaveLength(255);
    expect(rtlShortCopy('abcdef', 4)).toBe('abcd');
    expect(rtlShortCopy('ab', 4)).toBe('ab');
    expect(rtlShortAppend('abc', 'de', 5)).toBe('abcde');
    expect(rtlShortAppend('abc', 'defg', 5)).toBe('abcde');
    expect(rtlShortAppend('abcde', 'x', 5)).toBe('abcde');
    expect(rtlShortAppend('abcdef', 'x', 5)).toBe('abcdef'); // cap below the current length: unchanged (0x403c47 jbe)
    expect(rtlShortAppend('a'.repeat(200), 'b'.repeat(100), 255)).toBe('a'.repeat(200) + 'b'.repeat(55));
  });
  it('the ShortString comparison with literal 0x570894 matches only the exact two-byte quoted empty', () => {
    expect(rtlShortIsQuotedEmpty('""')).toBe(true);
    for (const v of ['', '"', '"""', '" ', ' "', "''", '""x']) expect(rtlShortIsQuotedEmpty(v), v).toBe(false);
  });
});

describe('literal parser 0x570498 and rebuild 0x5710d0', () => {
  it('V1: parse gives every field and the opaque tail; rebuild with a new comment is the hand-written line', () => {
    expect(pulsarEditorParse(V1_LINE)).toEqual({
      object: 'PSR 0329+54', frequency: '408.00', gain: '1.000', reference: '', vertical: '0.714520', horizontal: '1.2345E+02',
      start: '51234.56789012', comment: 'pulse A', tail: '4000,1.00,26,"B0329.PLR"',
    });
    expect(pulsarEditorRebuild(pulsarEditorParse(V1_LINE), 'pulse A')).toBe(V1_LINE);
    expect(pulsarEditorRebuild(pulsarEditorParse(V1_LINE), 'beam B, second look'))
      .toBe('"PSR 0329+54",408.00,1.000,"",0.714520,1.2345E+02,51234.56789012,"beam B, second look",4000,1.00,26,"B0329.PLR"');
  });
  it('model-only normalizations that the web refuses rather than performs', () => {
    // An empty middle field is rebuilt as '"",'.
    const blank = '"A",1.00,1.000,,0.5,1.0E+00,5.0,"c",1,1.00,1,"f"';
    expect(pulsarEditorRebuild(pulsarEditorParse(blank), 'c')).toBe('"A",1.00,1.000,"",0.5,1.0E+00,5.0,"c",1,1.00,1,"f"');
    // The first byte is deleted unchecked: a missing opening quote loses the first object character.
    expect(pulsarEditorParse('PSR",408.00,1.000,"",0.7,1.2E+02,5.0,"c",1,1.00,1,"f"').object).toBe('SR');
    // An unescaped quote in the object ends it early and shifts every later field.
    const shifted = pulsarEditorParse('"PSR "X"",408.00,1.000,"",0.7,1.2E+02,5.0,"c",1,1.00,1,"f"');
    expect([shifted.object, shifted.frequency, shifted.gain]).toEqual(['PSR ', '""', '408.0']);
    // Over-long fields are cut by bytes: frequency cap 7, tail cap 100.
    expect(pulsarEditorParse('"A",10000.00,1.000,"",0.7,1.2E+02,5.0,"c",1,1.00,1,"f"').frequency).toBe('10000.0');
    expect(pulsarEditorParse(`"A",1.00,1.000,"",0.7,1.2E+02,5.0,"c",1,1.00,1,"${'f'.repeat(120)}"`).tail).toHaveLength(100);
  });
  it('comment storage is 81 bytes: an 81-byte comment round-trips in the model, an 82-byte one is cut; control text is capped at 255 then 81', () => {
    const at = (n: number) => `"A",1.00,1.000,"",0.7,1.2E+02,5.0,"${'c'.repeat(n)}",1,1.00,1,"f"`;
    expect(pulsarEditorRebuild(pulsarEditorParse(at(81)), 'c'.repeat(81))).toBe(at(81));
    expect(pulsarEditorParse(at(82)).comment).toHaveLength(81);
    expect(pulsarEditorRebuild(pulsarEditorParse(at(82)), pulsarEditorParse(at(82)).comment)).not.toBe(at(82));
    expect(pulsarEditorRebuild(pulsarEditorParse(at(1)), 'k'.repeat(300))).toBe(at(1).replace('"c"', `"${'k'.repeat(81)}"`));
  });
  it('the capacities are the parser CL values', () => {
    expect(PULSAR_EDITOR_CAPACITIES).toEqual({ object: 40, frequency: 7, gain: 5, reference: 9, vertical: 9, horizontal: 10, start: 14, comment: 81, tail: 100 });
  });
});

describe('supported round-trip subset (WEB predicate)', () => {
  it('V1 and boundary rows at every capacity are supported; commas in the object and quotes or commas in the file are allowed', () => {
    expect(why(V1)).toBe('supported');
    const file85 = 'f'.repeat(81) + '.plr';
    const boundary = row({ object: 'PSR, B' + 'x'.repeat(34), frequency: '1400.00', gain: '1.000', reference: '12.345678', vertical: '99.999999', horizontal: '1.2345E+02', start: '51234.56789012', comment: '', file: file85 });
    expect(boundary.fields.object).toHaveLength(40);
    expect(pulsarEntryTail(boundary.fields)).toHaveLength(100);
    expect(why(boundary)).toBe('supported');
    expect(why(row({ object: 'PSR, B' }))).toBe('supported');
    expect(why(row({ file: 'a"b,c.plr' }))).toBe('supported');
    expect(why(row({ comment: 'one, two, three' }))).toBe('supported');
    expect(why(row({ comment: 'c'.repeat(PULSAR_COMMENT_MAX) }))).toBe('supported');
    expect(why(row({ frequency: '-999.99', reference: '0.000000', horizontal: '-1.234E+02' }))).toBe('supported');
  });
  it('limits are actual byte lengths of the stored text and the computed tail, not number magnitudes or a fixed file-name length', () => {
    // 86-character file name with a 3-character point count still gives a 100-byte tail.
    const f86 = row({ points: '100', file: 'g'.repeat(82) + '.plr' });
    expect(pulsarEntryTail(f86.fields)).toHaveLength(100);
    expect(why(f86)).toBe('supported');
    expect(why(row({ points: '4000', file: 'g'.repeat(82) + '.plr' }))).toEqual(['length', 'tail', 101, 100]);
    expect(why(row({ object: 'o'.repeat(41) }))).toEqual(['length', 'object', 41, 40]);
    expect(why(row({ frequency: '10000.00' }))).toEqual(['length', 'frequency', 8, 7]);
    expect(why(row({ gain: '10.000' }))).toEqual(['length', 'gain', 6, 5]);
    expect(why(row({ gain: '-1.000' }))).toEqual(['length', 'gain', 6, 5]);
    expect(why(row({ reference: '123.456789' }))).toEqual(['length', 'reference', 10, 9]);
    expect(why(row({ vertical: '-12.345678' }))).toEqual(['length', 'vertical', 10, 9]);
    expect(why(row({ horizontal: '-1.2345E+02' }))).toEqual(['length', 'horizontal', 11, 10]);
    expect(why(row({ start: '151234.56789012' }))).toEqual(['length', 'start', 15, 14]);
  });
  it('refuses unsupported characters, a quoted object and any row the template and literal reconstruction do not reproduce byte for byte', () => {
    expect(why(row({ file: 'pulsé.plr' }))).toEqual(['text', null, null, null]);
    expect(why(row({ file: 'tab\there.plr' }))).toEqual(['text', null, null, null]);
    expect(why(row({ comment: 'line\nbreak' }))).toEqual(['text', null, null, null]);
    expect(why(literal(V1_FIELDS, ''))).toEqual(['text', null, null, null]);
    expect(why(row({ object: 'PSR "X"' }))[0]).toBe('object-quote');
    expect(why(row({ comment: 'say "hi"' }))[0]).toBe('layout');      // a quoted comment cannot come from Record, and mis-splits
    expect(why(row({ frequency: '1,5' }))[0]).toBe('layout');
    expect(why(row({ reference: '' }))[0]).toBe('layout');           // blank text must be null, not ''
    expect(why(row({ reference: '""' }))[0]).toBe('layout');
    expect(why(row({}, V1_LINE.replace('"",', ',')))[0]).toBe('layout');     // stored ',,' instead of '"",'
    expect(why(row({}, V1_LINE + ' '))[0]).toBe('layout');
    expect(why(row({}, V1_LINE.replace('408.00', '408.0')))[0]).toBe('layout'); // candidate disagrees with a field
  });
  it('the splice equals both models for valid comments, and the edited candidate is supported again (closure)', () => {
    const rows = [V1, row({ object: 'PSR, B', file: 'a"b,c.plr', reference: '12.345678' }), row({ comment: '' }), row({ vertical: null, horizontal: null })];
    for (const e of rows) for (const c of ['', 'x', 'beam B, second look', ' leading and trailing ', 'c'.repeat(80), "a'b,c;d"]) {
      const next = pulsarEditedCandidate(e, c);
      expect(next, c).toBe(pulsarEditorRebuild(pulsarEditorParse(e.nativeLineCandidate), c));
      const edited = literal({ ...e.fields, comment: c }, next!);
      expect(why(edited)).toBe('supported');
      // The raw prefix and suffix are kept: editing back gives the original bytes.
      expect(pulsarEditedCandidate(edited, e.fields.comment)).toBe(e.nativeLineCandidate);
    }
    for (const c of ['"', 'é', '\t', '\n', 'c'.repeat(81)]) expect(pulsarEditedCandidate(V1, c), JSON.stringify(c)).toBeNull();
    expect(pulsarEditedCandidate(row({ object: 'PSR "X"' }), 'ok')).toBeNull();
  });
});

// ---------------------------------------------------------------- transactions through the real record path
/** SYNTHETIC recording: object with a comma, file name with a comma and a quote (opaque tail). */
function synthetic(name = 'PSR, B', file = 'b0329, "x".plr'): PlrRecording {
  const lines = [`'${name}',26,1`, '408.00,1400.00,0', '1.0,2.0,1.0', '51234.56789012,0.001'];
  for (let i = 0; i < 50; i++) lines.push(`${i},10,0`);
  const a = admitPlrRecording(new TextEncoder().encode(lines.join('\r\n') + '\r\n'), file);
  if (a.status !== 'admitted') throw new Error(a.reason);
  return a.recording;
}
const tap = (s: PulsarAnalysisState, x: number) => {
  const p = { leftHeld: false, rightHeld: false, x, y: 10 } as const;
  return pulsarPointer(pulsarPointer(s, 0, { ...p, phase: 'down', button: 'left' }).state, 0, { ...p, phase: 'up', button: 'left' }).state;
};
const record = (s: PulsarAnalysisState, x: number, comment: string) => {
  const opened = pulsarBeginRecord(tap(s, x)).state;
  return pulsarConfirmRecord(pulsarRecordDraft(opened, comment).state).state;
};
/** Confirmed list #1 'first, kept', #2 and #3 identical 'same', plus a pending placement on panel 1. */
function initial(name?: string, file?: string): PulsarAnalysisState {
  let s = pulsarLoad(INITIAL_PULSAR_ANALYSIS, synthetic(name, file)).state;
  s = record(record(record(s, 20, 'first, kept'), 40, 'same'), 40, 'same');
  return Object.freeze(tap(s, 60));
}
function step(s: PulsarAnalysisState, tr: (st: PulsarAnalysisState) => PulsarTransition, outcome: string) {
  const t = tr(s);
  expect(t.outcome).toBe(outcome);
  return t.state;
}
const comments = (list: readonly PulsarMeasurementEntry[]) => list.map(e => [e.sequence, e.fields.comment]);
const changedKeys = (a: PulsarAnalysisState, b: PulsarAnalysisState) => (Object.keys(a) as (keyof PulsarAnalysisState)[]).filter(k => a[k] !== b[k]).sort();

describe('Review Edit transaction (PLR-REVIEW-EDIT-STATIC-01; WEB inline editor)', () => {
  it('real Record entries are in the subset; inner Cancel changes nothing and reopening shows the working-copy comment', () => {
    const s0 = initial(), open = pulsarReviewOpen(s0).state;
    for (const e of s0.list) expect(why(e)).toBe('supported');
    expect(s0.list[0].nativeLineCandidate).toContain('"PSR, B",');
    expect(s0.list[0].nativeLineCandidate).toContain(',"b0329, "x".plr"');
    const editing = step(open, pulsarReviewRequestEdit, 'review-edit-opened');
    expect(editing.reviewSession!.edit).toEqual({ ordinal: 0, entry: s0.list[0], draft: 'first, kept' });
    expect(editing.reviewSession!.edit!.entry).toBe(open.reviewSession!.draft[0]);
    expect(pulsarModalOpen(editing)).toBe(true);
    const typed = step(editing, st => pulsarReviewEditDraft(st, 'discard me'), 'review-edit-draft');
    const cancelled = step(typed, pulsarReviewEditCancel, 'review-edit-cancelled');
    expect(cancelled.reviewSession!.draft).toBe(open.reviewSession!.draft);
    expect(cancelled.reviewSession).toMatchObject({ selected: 0, prompt: null, edit: null });
    expect(changedKeys(open, cancelled)).toEqual(['reviewSession']);
    expect(step(cancelled, pulsarReviewRequestEdit, 'review-edit-opened').reviewSession!.edit!.draft).toBe('first, kept');
  });
  it('inner OK replaces only the selected ordinal of two identical rows; nothing outside the working copy changes until outer Ok', () => {
    const s0 = Object.freeze({ ...initial(), listSaved: true, saveEnabled: false }), open = pulsarReviewSelect(pulsarReviewOpen(s0).state, 2).state;
    const [e1, e2, e3] = s0.list;
    expect(e2.fields).toEqual(e3.fields);
    expect(e2.nativeLineCandidate).toBe(e3.nativeLineCandidate);
    let s = step(open, pulsarReviewRequestEdit, 'review-edit-opened');
    s = step(s, st => pulsarReviewEditDraft(st, 'third, edited'), 'review-edit-draft');
    const edited = step(s, pulsarReviewEditConfirm, 'review-edited');
    const d = edited.reviewSession!.draft;
    expect(d[0]).toBe(e1);
    expect(d[1]).toBe(e2);
    expect(d[2]).not.toBe(e3);
    expect(Object.isFrozen(d) && Object.isFrozen(d[2]) && Object.isFrozen(d[2].fields)).toBe(true);
    expect([d[2].sequence, d[2].panel]).toEqual([e3.sequence, e3.panel]);
    for (const k of Object.keys(e3.fields) as (keyof PulsarEntryFields)[]) if (k !== 'comment') expect(d[2].fields[k]).toBe(e3.fields[k]);
    expect(d[2].fields.comment).toBe('third, edited');
    expect(d[2].nativeLineCandidate).toBe(e3.nativeLineCandidate.replace(',"same",', ',"third, edited",'));
    expect(edited.reviewSession).toMatchObject({ selected: 2, prompt: null, edit: null });
    // The list, measurement comments, pending flags, cursors, readouts, nextSequence and save flags wait for outer Ok.
    expect(changedKeys(s0, edited)).toEqual(['reviewSession']);
    expect(edited.list).toBe(s0.list);
    // Outer Cancel restores the confirmed list exactly.
    const cancelled = pulsarReviewCancel(edited).state;
    expect(cancelled.list).toBe(s0.list);
    expect(changedKeys(s0, cancelled)).toEqual([]);
    // Outer Ok keeps the same caller semantics.
    const confirmed = pulsarReviewConfirm(edited).state;
    expect(comments(confirmed.list)).toEqual([[1, 'first, kept'], [2, 'same'], [3, 'third, edited']]);
    expect(confirmed.list[0]).toBe(e1);
    expect(confirmed.list[2]).toBe(d[2]);
    expect(changedKeys(s0, confirmed)).toEqual(['listSaved', 'list', 'saveEnabled'].sort());
    expect([confirmed.listSaved, confirmed.saveEnabled, confirmed.nextSequence]).toEqual([false, true, 4]);
    expect(confirmed.measurement).toBe(s0.measurement);
    expect(confirmed.pending).toBe(s0.pending);
    // The next record continues the sequence, and the edited entry can be edited again.
    const next = record(confirmed, 80, 'fourth');
    expect(comments(next.list)).toEqual([[1, 'first, kept'], [2, 'same'], [3, 'third, edited'], [4, 'fourth']]);
  });
  it('edit after edit, then edit then Delete of the same row, then outer Ok', () => {
    let s = pulsarReviewSelect(pulsarReviewOpen(initial()).state, 1).state;
    for (const c of ['once', 'twice, again']) {
      s = step(s, pulsarReviewRequestEdit, 'review-edit-opened');
      s = step(s, st => pulsarReviewEditDraft(st, c), 'review-edit-draft');
      s = step(s, pulsarReviewEditConfirm, 'review-edited');
    }
    expect(s.reviewSession!.draft[1].fields.comment).toBe('twice, again');
    expect(step(s, pulsarReviewRequestEdit, 'review-edit-opened').reviewSession!.edit!.draft).toBe('twice, again');
    s = step(s, pulsarReviewRequestDelete, 'review-delete-confirm');
    s = step(s, st => pulsarReviewAnswerDelete(st, 'yes'), 'review-deleted');
    s = pulsarReviewConfirm(s).state;
    expect(comments(s.list)).toEqual([[1, 'first, kept'], [3, 'same']]);
  });
  it('OK with the unchanged comment keeps the entry object; an invalid comment keeps the editor open with its draft', () => {
    const open = step(pulsarReviewOpen(initial()).state, pulsarReviewRequestEdit, 'review-edit-opened');
    const same = step(open, pulsarReviewEditConfirm, 'review-edited');
    expect(same.reviewSession!.draft).toBe(open.reviewSession!.draft);
    for (const bad of ['say "hi"', 'é', 'tab\there', 'line\nbreak', 'c'.repeat(PULSAR_COMMENT_MAX + 1)]) {
      const typed = pulsarReviewEditDraft(open, bad).state;
      const tr = pulsarReviewEditConfirm(typed);
      expect(tr, JSON.stringify(bad)).toMatchObject({ changed: false, outcome: 'comment-invalid', state: typed });
      expect(typed.reviewSession!.edit!.draft).toBe(bad);
      expect(pulsarReviewEditView(typed)!.draftValid).toBe(false);
    }
    expect(pulsarReviewEditDraft(open, 'x'.repeat(257))).toMatchObject({ changed: false, outcome: 'invalid-input' });
    expect(pulsarReviewEditDraft(open, 'first, kept')).toMatchObject({ changed: false, outcome: 'review-edit-draft' });
    expect(PULSAR_SILENT_OUTCOMES.has('review-edit-draft')).toBe(true);
  });
  it('an empty working copy shows the Edit notice, which OK or Escape closes without changes', () => {
    let s = pulsarReviewOpen(initial()).state;
    for (let i = 0; i < 3; i++) s = pulsarReviewAnswerDelete(pulsarReviewRequestDelete(s).state, 'yes').state;
    expect(s.reviewSession).toMatchObject({ draft: [], selected: null });
    const notice = step(s, pulsarReviewRequestEdit, 'review-edit-no-selection');
    expect(notice.reviewSession).toMatchObject({ prompt: 'edit-no-selection', edit: null });
    for (const tr of [pulsarReviewRequestEdit(notice), pulsarReviewRequestDelete(notice), pulsarReviewCancel(notice), pulsarReviewConfirm(notice)])
      expect(tr).toMatchObject({ changed: false, outcome: 'blocked-modal', state: notice });
    expect(step(notice, pulsarReviewDismissNotice, 'review-edit-notice-closed').reviewSession).toEqual(s.reviewSession);
    expect(step(notice, pulsarReviewEscape, 'review-edit-notice-closed').reviewSession).toEqual(s.reviewSession);
    expect(PULSAR_MESSAGES_EN['pulsar.review.editNoSelectionText']).toBe(PULSAR_REVIEW_EDIT_LITERALS.noSelectionText);
  });
  it('an unsupported selected row is refused with its reason and nothing changes, other rows stay editable', () => {
    const quoted = pulsarReviewOpen(initial('Obj, "Q"')).state;
    expect(pulsarReviewRequestEdit(quoted)).toMatchObject({ changed: false, outcome: 'review-edit-unsupported-quote', state: quoted });
    // Load and Record keep admitting a long file name (no new restriction); only Edit refuses the 102-byte tail.
    const longFile = initial(undefined, 'n'.repeat(85) + '.plr');
    expect(longFile.list).toHaveLength(3);
    expect(pulsarEntryTail(longFile.list[0].fields)).toHaveLength(102);
    const long = pulsarReviewOpen(longFile).state;
    expect(pulsarReviewRequestEdit(long)).toMatchObject({ changed: false, outcome: 'review-edit-unsupported-length', state: long });
    expect(why(longFile.list[0])).toEqual(['length', 'tail', 102, 100]);
    const unicode = Object.freeze({ ...quoted, reviewSession: Object.freeze({ ...quoted.reviewSession!, draft: Object.freeze([row({ file: 'pulsé.plr' }), V1]) }) });
    expect(pulsarReviewRequestEdit(unicode)).toMatchObject({ changed: false, outcome: 'review-edit-unsupported-text', state: unicode });
    const tooLong = Object.freeze({ ...unicode, reviewSession: Object.freeze({ ...unicode.reviewSession!, draft: Object.freeze([row({ gain: '10.000' })]) }) });
    expect(pulsarReviewRequestEdit(tooLong)).toMatchObject({ changed: false, outcome: 'review-edit-unsupported-length' });
    const layout = Object.freeze({ ...unicode, reviewSession: Object.freeze({ ...unicode.reviewSession!, draft: Object.freeze([row({ reference: '' })]) }) });
    expect(pulsarReviewRequestEdit(layout)).toMatchObject({ changed: false, outcome: 'review-edit-unsupported-layout' });
    // Selecting the supported row opens the editor on it.
    expect(step(pulsarReviewSelect(unicode, 1).state, pulsarReviewRequestEdit, 'review-edit-opened').reviewSession!.edit!.entry).toBe(V1);
  });
  it('while the editor is open every other Review and analysis action is refused; Escape is inner Cancel, then outer Cancel', () => {
    const s0 = initial(), open = step(pulsarReviewOpen(s0).state, pulsarReviewRequestEdit, 'review-edit-opened');
    const refused = [
      pulsarReviewSelect(open, 1), pulsarReviewRequestDelete(open), pulsarReviewRequestEdit(open), pulsarReviewCancel(open), pulsarReviewConfirm(open),
      pulsarReset(open), pulsarZoom(open, 'in'), pulsarBeginRecord(open),
    ];
    for (const tr of refused) expect(tr).toMatchObject({ changed: false, outcome: 'blocked-modal', state: open });
    expect(pulsarReviewAnswerDelete(open, 'yes')).toMatchObject({ changed: false, state: open });
    expect(pulsarReviewDismissNotice(open)).toMatchObject({ changed: false, state: open });
    // The delete question blocks Edit as well.
    const question = pulsarReviewRequestDelete(pulsarReviewOpen(s0).state).state;
    expect(pulsarReviewRequestEdit(question)).toMatchObject({ changed: false, outcome: 'blocked-modal' });
    const typed = pulsarReviewEditDraft(open, 'escape discards').state;
    const inner = step(typed, pulsarReviewEscape, 'review-edit-cancelled');
    expect(inner.reviewSession!.draft).toBe(open.reviewSession!.draft);
    const outer = step(inner, pulsarReviewEscape, 'review-cancelled');
    expect(outer.reviewSession).toBeNull();
    expect(outer.list).toBe(s0.list);
    // Without an open editor the edit transitions are refused.
    for (const tr of [pulsarReviewEditConfirm(inner), pulsarReviewEditCancel(inner), pulsarReviewEditDraft(inner, 'x'), pulsarReviewRequestEdit(s0)])
      expect(tr).toMatchObject({ changed: false, outcome: 'invalid-input' });
  });
  it('WEB host inactivity releases a held latch but keeps the editor, its draft and the staged copy', () => {
    const pressed = pulsarPointer(initial(), 0, { phase: 'down', button: 'left', leftHeld: true, rightHeld: false, x: 10, y: 10 }).state;
    const typed = pulsarReviewEditDraft(pulsarReviewRequestEdit(pulsarReviewOpen(pressed).state).state, 'kept while hidden').state;
    const released = pulsarPointerRelease(typed);
    expect(released.changed).toBe(true);
    expect(released.state.reviewSession).toBe(typed.reviewSession);
    expect(released.state.reviewSession!.edit!.draft).toBe('kept while hidden');
  });
  it('the editor view is the parsed record: object, JD, frequency, gain and cleared readings shown empty', () => {
    const s = initial(), open = pulsarReviewRequestEdit(pulsarReviewOpen(s).state).state, f = s.list[0].fields;
    expect(pulsarReviewEditView(open)).toEqual({
      sequence: 1, panel: 0, object: 'PSR, B', start: f.start, frequency: f.frequency, gain: f.gain,
      reference: '', vertical: f.vertical, horizontal: '', draft: 'first, kept', draftValid: true,
    });
    expect([f.reference, f.horizontal]).toEqual([null, null]);
    expect(pulsarReviewEditView(s)).toBeNull();
  });
});

describe('decoded editor literals and DFM captions (PLR-REVIEW-EDIT-STATIC-01)', () => {
  it('the English catalog uses the decoded literals and the TMEASFORM captions', () => {
    expect(PULSAR_REVIEW_EDIT_LITERALS).toEqual({ noSelectionCaption: 'No Item Selected!', noSelectionText: 'Select Item for Edit.', formCaption: 'Measurement Data' });
    expect(PULSAR_MESSAGES_EN['pulsar.review.noSelectionCaption']).toBe(PULSAR_REVIEW_EDIT_LITERALS.noSelectionCaption);
    expect(PULSAR_MESSAGES_EN['pulsar.reviewEdit.heading']).toBe(PULSAR_REVIEW_EDIT_LITERALS.formCaption);
    for (const [k, v] of Object.entries(PULSAR_REVIEW_EDIT_DFM)) expect(PULSAR_MESSAGES_EN[`pulsar.reviewEdit.${k}` as keyof typeof PULSAR_MESSAGES_EN], k).toBe(v);
  });
});
