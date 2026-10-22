import { describe, expect, it } from 'vitest';
import { admitPlrRecording, type PlrRecording } from './pulsarRecording';
import {
  INITIAL_PULSAR_ANALYSIS, PULSAR_BASES, PULSAR_PANEL_HEIGHTS, pulsarAnswerClear, pulsarAxisTicks, pulsarBeginRecord, pulsarCancelRecord, pulsarConfirmRecord,
  pulsarAnnouncement, pulsarFactor, pulsarLoad, pulsarMode, pulsarPan, pulsarPanRate, pulsarPanTick, pulsarPointer, pulsarPointerRelease, pulsarProperties, pulsarReadouts, pulsarRecordDialog,
  pulsarRecordDraft, pulsarRequestClear, pulsarReset, pulsarTrace, pulsarZoom, type PulsarAnalysisState, type PulsarPointer, type PulsarTransition,
} from './pulsarAnalysis';

// SYNTHETIC fixture: 1000 rows with a ramp in channel 0, a constant in channel 1 and zeros in
// channel 2. Interval 0.01 s, highest recorded index 1. Not an acquired observation.
function synthetic(rows = 1000, highest = 1, gain1 = '2.0', interval = '0.01'): PlrRecording {
  const lines = [`'SYNTH',25,${highest}`, '400.00,1400.00,0', `1.0,${gain1},1.0`, `50000.5,${interval}`];
  for (let i = 0; i < rows; i++) lines.push(`${i},10,0`);
  const a = admitPlrRecording(new TextEncoder().encode(lines.join('\r\n') + '\r\n'), 'synthetic.plr');
  if (a.status !== 'admitted') throw new Error(a.reason);
  return a.recording;
}
const st = (t: PulsarTransition) => t.state;
const loaded = (rec = synthetic()) => st(pulsarLoad(INITIAL_PULSAR_ANALYSIS, rec));
const ptr = (phase: PulsarPointer['phase'], button: PulsarPointer['button'], x: number, y = 100, held = { leftHeld: false, rightHeld: false }): PulsarPointer => ({ phase, button, x, y, ...held });
const click = (s: PulsarAnalysisState, ch: 0 | 1 | 2, x: number, y = 100, button: 'left' | 'right' = 'left') =>
  st(pulsarPointer(st(pulsarPointer(s, ch, ptr('down', button, x, y))), ch, ptr('up', button, x, y)));

it('admits the compiled manual comment limit80 and rejects81 without changing an existing record or draft', () => {
  let s = st(pulsarBeginRecord(click(loaded(), 0, 40)));
  s = st(pulsarRecordDraft(s, 'x'.repeat(80)));
  expect(pulsarRecordDialog(s)?.draftValid).toBe(true);
  const accepted = st(pulsarConfirmRecord(s));
  expect(accepted.list[0].fields.comment).toBe('x'.repeat(80));
  s = st(pulsarBeginRecord(click(accepted, 0, 60)));
  s = st(pulsarRecordDraft(s, 'x'.repeat(81)));
  expect(pulsarConfirmRecord(s)).toMatchObject({ outcome: 'comment-invalid', changed: false, state: s });
  expect(pulsarRecordDialog(s)?.draft).toBe('x'.repeat(81));
  expect(s.list).toBe(accepted.list);
});

describe('load and reset (PLR-LOAD-01, PLR-RANGE-01, PLR-RESET-01)', () => {
  it('opens properties and resets the window to [0, 400·dt] at zoom 1 and pan rate 10', () => {
    const s = loaded();
    expect([s.propertiesOpen, s.zoom, s.windowStart, s.windowEnd, s.panRate]).toEqual([true, 1, 0, 4, 10]);
    expect(pulsarReadouts(s)).toMatchObject({ zoom: '1.00', windowStart: '0.000', windowEnd: '4.000', factors: ['1.00', '1.00', '1.00'] });
    expect([s.recordEnabled, s.reviewEnabled, s.saveEnabled]).toEqual([false, false, false]);
  });
  it('properties are non-modal and can be reopened', () => {
    let s = st(pulsarProperties(loaded(), false));
    expect(s.propertiesOpen).toBe(false);
    s = st(pulsarZoom(s, 'in'));
    expect(st(pulsarProperties(s, true)).propertiesOpen).toBe(true);
  });
  it('a later load keeps the measurement list but clears cursors and pending flags', () => {
    let s = click(loaded(), 0, 50);
    s = st(pulsarBeginRecord(s)); s = st(pulsarConfirmRecord(s));
    expect(s.list).toHaveLength(1);
    s = click(s, 0, 70);
    const r = pulsarLoad(s, synthetic(10));
    expect(r.state.list).toHaveLength(1);
    expect(r.state.cursors[0].verticalTime).toBe(-1);
    expect(r.state.pending).toEqual([false, false, false]);
    expect(r.state.measurement.vertical).toEqual([0, 0, 0]);
    expect(r.state.reviewEnabled).toBe(false);
  });
});

describe('panel geometry (PLR-GEOM-01)', () => {
  it('uses the DFM DispBox heights and the FormCreate baseline formula Height − 1, − 1, − 16', () => {
    expect(PULSAR_PANEL_HEIGHTS).toEqual([120, 125, 140]);
    expect(PULSAR_BASES).toEqual([119, 124, 124]);
  });
});

describe('trace projection (PLR-PAINT-01)', () => {
  it('zoom 1 draws one sample per pixel from each panel baseline, scaled by the effective gain and display factor', () => {
    const s = loaded(), t0 = pulsarTrace(s, 0), t1 = pulsarTrace(s, 1), t2 = pulsarTrace(s, 2);
    expect(t0).toHaveLength(401);
    expect(t0[0]).toEqual({ x: 0, y: 119 });
    expect(t0[37]).toEqual({ x: 37, y: 82 });  // 119 − 37
    expect(t1[5].y).toBe(104);                 // 124 − value 10 × gain 2
    expect(t2[5].y).toBe(124);                 // panel 3: zeros sit on base 124, 16 px above its 140 px bottom
  });
  it('zoom 2 draws two pixels per sample, and rows past the end draw the baseline', () => {
    let s = st(pulsarZoom(loaded(synthetic(120)), 'in'));
    expect(s.windowStart).toBeCloseTo(1, 12);
    const t = pulsarTrace(s, 0);
    expect(t).toHaveLength(201);
    expect(t[0]).toEqual({ x: 0, y: 19 });     // 119 − 100
    expect(t[19]).toEqual({ x: 38, y: 0 });    // 119 − 119
    expect(t[20]).toEqual({ x: 40, y: 119 });
    s = st(pulsarPan(st(pulsarPanRate(s, 100)), 'left'));
    expect(s.windowStart).toBeCloseTo(0, 12);
  });
  it('zoom 0.5 averages two samples per pixel, and the first point keeps the native unnormalized sum', () => {
    const s = st(pulsarZoom(loaded(), 'out'));
    expect([s.zoom, s.windowStart, s.windowEnd]).toEqual([0.5, -2, 6]);
    const t = pulsarTrace(s, 0);
    expect(t).toHaveLength(401);
    expect(t[0].y).toBe(119); // rows −201..−200 are missing → 0
    expect(t[101].y).toBe(117); // rows 1,2 averaged = 1.5, rounded to even = 2
  });
  it('y-axis ticks follow the recovered tick parameters above each panel baseline', () => {
    const rel = [[10, 8], [20, 8], [30, 8], [40, 8], [50, 15], [60, 8], [70, 8], [80, 8], [90, 8], [100, 15]];
    for (const ch of [0, 1, 2] as const) expect(pulsarAxisTicks(ch).map(t => [PULSAR_BASES[ch] - t.y, t.length])).toEqual(rel);
    expect(pulsarAxisTicks(0).filter(t => t.length === 15).map(t => t.y)).toEqual([69, 19]);
    expect(pulsarAxisTicks(2).filter(t => t.length === 15).map(t => t.y)).toEqual([74, 24]);
  });
});

describe('zoom, display factor and pan (PLR-ZOOM-01, PLR-GAIN-01, PLR-PAN-01)', () => {
  it('zoom in keeps the centre, stops at 8 and disables the button', () => {
    let s = loaded();
    for (const z of [2, 4]) { s = st(pulsarZoom(s, 'in')); expect(s.zoom).toBe(z); }
    const last = pulsarZoom(s, 'in');
    expect([last.outcome, last.state.zoom, last.state.zoomInEnabled]).toEqual(['zoom-limit', 8, false]);
    expect((last.state.windowStart + last.state.windowEnd) / 2).toBeCloseTo(2, 12);
    expect(last.state.windowEnd - last.state.windowStart).toBeCloseTo(0.5, 12);
    expect(pulsarZoom(last.state, 'in').changed).toBe(false);
  });
  it('zoom out stops at 0.125; the click that reaches the bound disables the button (0x56ce85..0x56cea1)', () => {
    let s = loaded();
    for (let i = 0; i < 2; i++) s = st(pulsarZoom(s, 'out'));
    const last = pulsarZoom(s, 'out');
    expect(last.outcome).toBe('zoom-limit');
    s = last.state;
    expect([s.zoom, s.zoomOutEnabled, s.zoomInEnabled]).toEqual([0.125, false, true]);
    expect(s.windowEnd - s.windowStart).toBeCloseTo(32, 12);
  });
  it('display factors halve or double within [0.125, 8]; a limit changes nothing', () => {
    let s = loaded();
    for (let i = 0; i < 3; i++) s = st(pulsarFactor(s, 2, 'down'));
    expect(s.factors[2]).toBe(0.125);
    const r = pulsarFactor(s, 2, 'down');
    expect([r.outcome, r.changed]).toEqual(['factor-limit', false]);
    for (let i = 0; i < 6; i++) s = st(pulsarFactor(s, 2, 'up'));
    expect(s.factors[2]).toBe(8);
    expect(pulsarFactor(s, 2, 'up').outcome).toBe('factor-limit');
  });
  it('pan moves the window by ∓rate·dt with no native bound', () => {
    let s = st(pulsarPanRate(loaded(), 1));
    s = st(pulsarPan(s, 'left'));
    expect(s.windowStart).toBe(-0.01);
    expect(s.windowEnd).toBeCloseTo(3.99, 12);
    expect(pulsarPanRate(s, 5).outcome).toBe('invalid-input');
  });
  it('a timer tick repeats the step stored by the press, even after the rate changes', () => {
    let s = st(pulsarPan(st(pulsarPanRate(loaded(), 1)), 'right'));
    expect([s.windowStart, s.panStep]).toEqual([0.01, 0.01]);
    s = st(pulsarPanRate(s, 100));
    s = st(pulsarPanTick(s));
    expect(s.windowStart).toBeCloseTo(0.02, 12);
    s = st(pulsarPan(s, 'left'));            // a new press stores the new step −100·dt
    expect(s.windowStart).toBeCloseTo(-0.98, 12);
    expect(st(pulsarPanTick(s)).windowStart).toBeCloseTo(-1.98, 12);
  });
  it('a timer tick does nothing without a recording or while a modal is open', () => {
    expect(pulsarPanTick(INITIAL_PULSAR_ANALYSIS).outcome).toBe('no-recording');
    const s = st(pulsarBeginRecord(click(loaded(), 0, 10)));
    expect(pulsarPanTick(st(pulsarPan(loaded(), 'right'))).outcome).toBe('panned');
    expect(pulsarPanTick(s)).toMatchObject({ outcome: 'blocked-modal', changed: false });
  });
});

describe('cursors (PLR-MOUSE-01, PLR-CURSOR-V-01, PLR-CURSOR-H-01, PLR-REDRAW-01)', () => {
  it('a left click sets the vertical cursor at t = start + x·dt/zoom and marks the panel pending', () => {
    const s = click(loaded(), 0, 123);
    expect(s.cursors[0]).toMatchObject({ verticalX: 123, verticalText: '1.230000' });
    expect(s.measurement.vertical[0]).toBeCloseTo(1.23, 12);
    expect([s.pending, s.recordEnabled]).toEqual([[true, false, false], true]);
  });
  it('a right drag moves one reference cursor on all panels; moves without a held button are ignored', () => {
    let s = st(pulsarPointer(loaded(), 1, ptr('down', 'right', 10)));
    s = st(pulsarPointer(s, 1, ptr('move', 'other', 200, 100, { leftHeld: false, rightHeld: true })));
    expect(s.cursors.map(c => c.referenceX)).toEqual([200, 200, 200]);
    expect(s.referenceText).toBe('2.000000');
    expect(pulsarPointer(s, 1, ptr('move', 'other', 300)).outcome).toBe('pointer-ignored');
    s = st(pulsarPointer(s, 1, ptr('up', 'right', 250)));
    expect([s.rightDrag, s.pending[1]]).toEqual([false, true]);
    expect(s.measurement.reference).toBeCloseTo(2.5, 12);
  });
  it('horizontal mode reads (base[ch] − y)/(gain·100·factor) and stays within 0 ≤ y < base[ch]', () => {
    let s = st(pulsarMode(loaded(), 1, 'horizontal'));
    s = click(s, 1, 50, 74);
    expect(s.cursors[1].horizontalValue).toBe(0.25); // (124−74)/(2·100·1)
    expect(s.cursors[1].horizontalText).toBe('2.5000E-01');
    s = st(pulsarPointer(s, 1, ptr('down', 'left', 50, 124))); // y = base: inside the 125 px box, not accepted
    expect(s.cursors[1].horizontalY).toBe(74);
    s = click(st(pulsarMode(s, 0, 'horizontal')), 0, 9, 69);
    expect(s.cursors[0].horizontalValue).toBe(0.5);  // panel 1: (119−69)/(1·100·1)
  });
  it('panel 3 rows between its baseline and its bottom are valid input but never set a horizontal cursor', () => {
    let s = st(pulsarMode(loaded(), 2, 'horizontal'));
    s = click(s, 2, 10, 123);
    expect(s.cursors[2].horizontalValue).toBe(0.01); // (124−123)/(1·100·1)
    for (const y of [124, 139]) {
      const r = pulsarPointer(s, 2, ptr('down', 'left', 10, y));
      expect(r.outcome).toBe('cursor');
      expect(r.state.cursors[2].horizontalY).toBe(123);
    }
    expect(pulsarPointer(s, 2, ptr('down', 'left', 10, 140)).outcome).toBe('invalid-input');
  });
  it('a horizontal cursor keeps its value when the display factor changes and moves in pixels', () => {
    let s = click(st(pulsarMode(loaded(), 0, 'horizontal')), 0, 0, 69);
    s = st(pulsarFactor(s, 0, 'up'));
    expect([s.cursors[0].horizontalValue, s.cursors[0].horizontalY]).toEqual([0.5, 19]); // Round(119 − 0.5·100·1·2)
  });
  it('a redraw after zoom re-quantizes vertical times to the pixel grid (ties to even)', () => {
    // dt = 0.5 s is exact in binary, so the tie is deterministic.
    let s = click(loaded(synthetic(1000, 1, '2.0', '0.5')), 0, 3); // t = 1.5
    s = st(pulsarZoom(s, 'out'));                   // start −100, zoom 0.5: x = Round(101.5) = 102 → t = 2
    expect([s.cursors[0].verticalX, s.measurement.vertical[0], s.cursors[0].verticalText]).toEqual([102, 2, '2.000000']);
  });
  it('a negative time is drawn right after the click, then hidden by a redraw that skips it; the measurement is kept', () => {
    let s = st(pulsarZoom(loaded(), 'out'));            // window [−2, 6], zoom 0.5
    s = click(s, 0, 50);                                // t = −2 + 50·0.01/0.5 = −1
    expect(s.cursors[0]).toMatchObject({ verticalX: 50, verticalTime: -1, verticalText: '-1.000000', verticalVisible: true });
    s = st(pulsarZoom(s, 'in'));                        // window [0, 4]: pixel 50 now means t = 0.5
    expect(s.cursors[0]).toMatchObject({ verticalX: 50, verticalTime: -1, verticalText: '-1.000000', verticalVisible: false });
    expect([s.measurement.vertical[0], s.pending[0]]).toEqual([-1, true]);
    s = st(pulsarPan(s, 'right'));                      // every later redraw skips it too
    expect(s.cursors[0].verticalVisible).toBe(false);
    s = st(pulsarConfirmRecord(st(pulsarBeginRecord(s))));
    expect(s.list[0].fields.vertical).toBe('-1.000000');
  });
  it('a negative reference time is hidden on every panel after a redraw, with its readout kept', () => {
    let s = st(pulsarZoom(loaded(), 'out'));
    s = click(s, 1, 20, 100, 'right');                  // t = −2 + 20·0.01/0.5 = −1.6
    expect(s.cursors.map(c => c.referenceVisible)).toEqual([true, true, true]);
    s = st(pulsarZoom(s, 'in'));
    expect(s.cursors.map(c => [c.referenceX, c.referenceVisible])).toEqual([[20, false], [20, false], [20, false]]);
    expect([s.referenceText, s.measurement.reference]).toEqual(['-1.600000', -1.6]);
  });
  it('a time before the window start is hidden and shows again once the window moves back over it', () => {
    let s = click(loaded(), 0, 10);                     // t = 0.1
    s = st(pulsarPan(st(pulsarPanRate(s, 100)), 'right')); // window [1, 5]: x = −90
    expect([s.cursors[0].verticalX, s.cursors[0].verticalVisible]).toEqual([-90, false]);
    s = st(pulsarPan(s, 'left'));
    expect([s.cursors[0].verticalX, s.cursors[0].verticalVisible, s.cursors[0].verticalText]).toEqual([10, true, '0.100000']);
  });
  it('an out-of-range horizontal projection is hidden after a factor redraw and drawn again when valid', () => {
    let s = click(st(pulsarMode(loaded(), 0, 'horizontal')), 0, 0, 19); // (119 − 19)/(1·100·1) = 1
    expect(s.cursors[0]).toMatchObject({ horizontalY: 19, horizontalValue: 1, horizontalVisible: true });
    s = st(pulsarFactor(s, 0, 'up'));                   // Round(119 − 1·100·1·2) = −81 is rejected by 0x56c6dc
    expect(s.cursors[0]).toMatchObject({ horizontalY: 19, horizontalValue: 1, horizontalText: '1.0000E+00', horizontalVisible: false });
    expect(s.measurement.horizontal[0]).toBe(1);
    s = st(pulsarFactor(s, 0, 'down'));
    expect(s.cursors[0]).toMatchObject({ horizontalY: 19, horizontalValue: 1, horizontalVisible: true });
  });
  it('a negative horizontal value (negative gain) is drawn after the click and hidden by the next redraw of its panel', () => {
    let s = click(st(pulsarMode(loaded(synthetic(1000, 1, '-2.0')), 1, 'horizontal')), 1, 0, 74);
    expect(s.cursors[1]).toMatchObject({ horizontalY: 74, horizontalValue: -0.25, horizontalVisible: true });
    s = st(pulsarFactor(s, 0, 'up'));                   // only panel 1 is redrawn
    expect(s.cursors[1].horizontalVisible).toBe(true);
    s = st(pulsarFactor(s, 1, 'up'));
    expect(s.cursors[1]).toMatchObject({ horizontalY: 74, horizontalValue: -0.25, horizontalText: '-2.5000E-01', horizontalVisible: false });
    expect(s.measurement.horizontal[1]).toBe(-0.25);
  });
  it('pointer cancel clears the drag latches without a MouseUp: no pending flag, and a later move needs a new press', () => {
    let s = st(pulsarConfirmRecord(st(pulsarBeginRecord(click(loaded(), 0, 30)))));
    s = st(pulsarPointer(s, 0, ptr('down', 'left', 50)));
    expect([s.leftDrag, s.cursors[0].verticalText, s.pending[0]]).toEqual([true, '0.500000', false]);
    const r = pulsarPointerRelease(s);
    expect([r.outcome, r.state.leftDrag, r.state.rightDrag, r.state.pending[0], r.state.cursors[0].verticalText, r.state.list.length]).toEqual(['pointer-released', false, false, false, '0.500000', 1]);
    expect(pulsarPointer(r.state, 0, ptr('move', 'other', 80, 100, { leftHeld: true, rightHeld: false })).outcome).toBe('pointer-ignored');
    const right = pulsarPointerRelease(st(pulsarPointer(r.state, 2, ptr('down', 'right', 60))));
    expect(right.state.rightDrag).toBe(false);
    expect(pulsarPointer(right.state, 2, ptr('move', 'other', 90, 100, { leftHeld: false, rightHeld: true })).outcome).toBe('pointer-ignored');
    expect(pulsarPointerRelease(right.state)).toMatchObject({ outcome: 'pointer-ignored', changed: false });
  });
  it('panel 3 is never pending when the highest recorded index is 1', () => {
    expect(click(loaded(), 2, 30).pending).toEqual([false, false, false]);
  });
  it('rejects pointer coordinates outside each 400 × Height client pixel domain', () => {
    expect(pulsarPointer(loaded(), 0, ptr('down', 'left', 400)).outcome).toBe('invalid-input');
    expect(pulsarPointer(loaded(), 0, ptr('down', 'left', 399)).outcome).toBe('cursor');
    expect(pulsarPointer(loaded(), 0, ptr('down', 'left', 1.5)).outcome).toBe('invalid-input');
    expect(pulsarPointer(loaded(), 0, ptr('down', 'left', 5, 120)).outcome).toBe('invalid-input');
    expect(pulsarPointer(loaded(), 1, ptr('down', 'left', 5, 124)).outcome).toBe('cursor');
    expect(pulsarPointer(loaded(), 1, ptr('down', 'left', 5, 125)).outcome).toBe('invalid-input');
  });
  it('reset clears cursors, factors, modes, the measurement record and pending flags', () => {
    let s = st(pulsarFactor(st(pulsarMode(click(loaded(), 0, 40), 1, 'horizontal')), 0, 'up'));
    s = st(pulsarReset(st(pulsarZoom(s, 'in'))));
    expect([s.zoom, s.windowStart, s.factors, s.modes, s.pending, s.recordEnabled, s.cursors[0].verticalTime, s.measurement.vertical[0]])
      .toEqual([1, 0, [1, 1, 1], ['vertical', 'vertical', 'vertical'], [false, false, false], false, -1, 0]);
  });
});

describe('record and clear (PLR-RECORD-01, PLR-CLEAR-01)', () => {
  const measured = () => click(click(st(pulsarMode(click(loaded(), 0, 100), 1, 'horizontal')), 1, 10, 74), 1, 77, 0, 'right');
  it('opens one dialog per pending panel in order; cancel skips, OK appends', () => {
    let s = measured();
    expect(s.pending).toEqual([true, true, false]);
    s = st(pulsarBeginRecord(s));
    expect(pulsarRecordDialog(s)).toMatchObject({ panel: 0, vertical: '1.000000', reference: '0.770000', horizontal: '0.0000E+00', remaining: 1 });
    s = st(pulsarRecordDraft(s, 'first pulse'));
    s = st(pulsarConfirmRecord(s));
    expect(pulsarRecordDialog(s)).toMatchObject({ panel: 1, horizontal: '2.5000E-01', draft: '' });
    s = st(pulsarRecordDraft(s, 'discarded'));
    const c = pulsarCancelRecord(s);
    expect(c.outcome).toBe('record-finished');
    s = c.state;
    expect([s.recordSession, s.pending, s.recordEnabled, s.listSaved, s.reviewEnabled]).toEqual([null, [false, true, false], true, false, true]);
    expect(s.list).toHaveLength(1);
    expect(s.list[0].fields).toEqual({ object: 'SYNTH', frequency: '400.00', gain: '1.000', reference: '0.770000', vertical: '1.000000', horizontal: null, start: '50000.50000000', comment: 'first pulse', points: '1000', intervalMs: '10.00', aperture: '25', file: 'synthetic.plr' });
    expect(s.list[0].nativeLineCandidate).toBe('"SYNTH",400.00,1.000,0.770000,1.000000,"",50000.50000000,"first pulse",1000,10.00,25,"synthetic.plr"');
    expect(s.measurement.comments).toEqual(['first pulse', '', '']);
  });
  it('blocks other actions while a record dialog is open and rejects an invalid comment', () => {
    let s = st(pulsarBeginRecord(measured()));
    expect(pulsarZoom(s, 'in').outcome).toBe('blocked-modal');
    expect(pulsarLoad(s, synthetic(5)).outcome).toBe('blocked-modal');
    s = st(pulsarRecordDraft(s, 'has "quote"'));
    expect(pulsarConfirmRecord(s).outcome).toBe('comment-invalid');
    expect(pulsarConfirmRecord(st(pulsarRecordDraft(s, 'x'.repeat(82)))).outcome).toBe('comment-invalid');
  });
  it('a zero cursor value is blank in the appended line (0x570f48)', () => {
    let s = click(loaded(), 0, 0);
    s = st(pulsarConfirmRecord(st(pulsarBeginRecord(s))));
    expect(s.list[0].fields.vertical).toBeNull();
  });
  it('clear asks about unsaved records, then for confirmation; no or cancel keeps the list', () => {
    let s = st(pulsarConfirmRecord(st(pulsarBeginRecord(measured()))));
    expect(pulsarRequestClear(s).outcome).toBe('blocked-modal'); // panel 2 dialog still open
    s = st(pulsarCancelRecord(s));
    s = st(pulsarRequestClear(s));
    expect(s.clearPrompt).toBe('unsaved');
    expect(st(pulsarAnswerClear(s, 'cancel')).list).toHaveLength(1);
    s = st(pulsarAnswerClear(s, 'discard'));
    expect(s.clearPrompt).toBe('confirm');
    expect(st(pulsarAnswerClear(s, 'no')).list).toHaveLength(1);
    s = st(pulsarAnswerClear(s, 'yes'));
    expect([s.list.length, s.clearPrompt, s.recordEnabled, s.reviewEnabled, s.saveEnabled]).toEqual([0, null, false, false, false]);
  });
  it('an admitted tiny gain cannot store Infinity: the click is refused and the bytes and prior state are kept', () => {
    // Gain 1e-320 is a nonzero admitted lexeme; (124 − y)/(1e-320·100·factor) overflows Number for every y.
    const rec = synthetic(1000, 1, '1e-320');
    let s = st(pulsarMode(loaded(rec), 1, 'horizontal'));
    for (let i = 0; i < 3; i++) s = st(pulsarFactor(s, 1, 'down'));
    const down = pulsarPointer(s, 1, ptr('down', 'left', 5, 0));
    expect(down.outcome).toBe('number-unsupported');
    expect([down.state.leftDrag, down.state.cursors[1].horizontalValue, down.state.cursors[1].horizontalText, down.state.cursors[1].horizontalVisible, down.state.measurement.horizontal[1]]).toEqual([true, -1, '', false, 0]);
    expect(pulsarPointer(down.state, 1, ptr('move', 'other', 5, 3, { leftHeld: true, rightHeld: false }))).toMatchObject({ outcome: 'number-unsupported', changed: false });
    const up = pulsarPointer(down.state, 1, ptr('up', 'left', 5, 0));
    // WEB: a MouseUp whose own placement is refused is not taken, so it does not mark the panel pending.
    expect([up.outcome, up.state.leftDrag, up.state.pending[1], up.state.recordEnabled]).toEqual(['number-unsupported', false, false, false]);
    expect(up.state.recording).toBe(rec);
    expect(up.state.measurement.horizontal.every(Number.isFinite)).toBe(true);
    expect(pulsarBeginRecord(up.state)).toMatchObject({ outcome: 'record-disabled', changed: false });
  });
  it('a refused MouseUp keeps the earlier pending flags and Record state; other panels still record', () => {
    // Panel 1 has a valid unrecorded vertical measurement; panel 2 (gain 1e-320) refuses every horizontal value.
    let s = st(pulsarMode(click(loaded(synthetic(1000, 1, '1e-320')), 0, 40), 1, 'horizontal'));
    expect([s.pending, s.recordEnabled]).toEqual([[true, false, false], true]);
    const r = pulsarPointer(st(pulsarPointer(s, 1, ptr('down', 'left', 5, 50))), 1, ptr('up', 'left', 5, 50));
    expect([r.outcome, r.state.pending, r.state.recordEnabled, r.state.measurement.horizontal[1]]).toEqual(['number-unsupported', [true, false, false], true, 0]);
    s = st(pulsarConfirmRecord(st(pulsarBeginRecord(r.state))));
    expect([s.list.length, s.list[0].panel, s.list[0].fields.vertical, s.pending]).toEqual([1, 0, '0.400000', [false, false, false]]);
    // A panel that was already pending stays pending through a refused MouseUp.
    s = click(s, 1, 0, 0, 'right');                      // reference cursor + MouseUp on panel 2 marks it pending
    expect(s.pending[1]).toBe(true);
    const again = pulsarPointer(st(pulsarPointer(s, 1, ptr('down', 'left', 5, 50))), 1, ptr('up', 'left', 5, 50));
    expect([again.outcome, again.state.pending[1], again.state.recordEnabled]).toEqual(['number-unsupported', true, true]);
  });
  it('a MouseUp outside the horizontal range still follows the native pending rule (0x56c6dc rejection is not a web refusal)', () => {
    const s = st(pulsarMode(loaded(), 1, 'horizontal'));
    const r = pulsarPointer(st(pulsarPointer(s, 1, ptr('down', 'left', 5, 124))), 1, ptr('up', 'left', 5, 124)); // y = base is rejected natively
    expect([r.outcome, r.state.pending[1], r.state.recordEnabled, r.state.cursors[1].horizontalText]).toEqual(['cursor', true, true, '']);
  });
  it('a refused nonfinite click keeps the previous valid horizontal measurement and readout', () => {
    // Gain 1e-308: y = 123 at factor 1 gives a finite 1/(1e-306); y = 0 at factor 0.125 overflows.
    let s = click(st(pulsarMode(loaded(synthetic(1000, 1, '1e-308')), 1, 'horizontal')), 1, 0, 123);
    const prior = s.cursors[1];
    expect(Number.isFinite(prior.horizontalValue) && prior.horizontalValue > 1e305).toBe(true);
    for (let i = 0; i < 3; i++) s = st(pulsarFactor(s, 1, 'down'));
    const r = pulsarPointer(s, 1, ptr('down', 'left', 5, 0));
    expect(r.outcome).toBe('number-unsupported');
    expect([r.state.cursors[1].horizontalValue, r.state.cursors[1].horizontalText, r.state.measurement.horizontal[1]]).toEqual([prior.horizontalValue, prior.horizontalText, prior.horizontalValue]);
  });
  it('a redraw whose Number product overflows is refused atomically, without hiding the line or re-quantizing other panels', () => {
    // Gain 1e-309 on receiver 2: y = 123 stores 1/(1e-309·100·1) = 1e307 (finite). The redraw product
    // 1e307·100 overflows Number before the gain and factor bring it back to the true projection y = 123.
    // Panel 1 first gets a vertical cursor at zoom 0.5: t = 0.37 → x = Round(2.37·0.5/0.01) = Round(118.5) = 118.
    let s = st(pulsarZoom(click(loaded(synthetic(1000, 1, '1e-309')), 0, 37), 'out'));
    expect(s.cursors[0]).toMatchObject({ verticalX: 118, verticalVisible: true });
    s = click(st(pulsarMode(s, 1, 'horizontal')), 1, 0, 123);
    const placed = s.cursors[1];
    expect(placed).toMatchObject({ horizontalY: 123, horizontalVisible: true });
    expect(placed.horizontalValue * 100).toBe(Infinity);
    expect(Number.isFinite(placed.horizontalValue)).toBe(true);
    for (const r of [pulsarFactor(s, 1, 'up'), pulsarFactor(s, 1, 'down'), pulsarZoom(s, 'in'), pulsarZoom(s, 'out'), pulsarPan(s, 'right')]) {
      expect([r.outcome, r.changed]).toEqual(['display-unsupported', false]);
      expect(r.state).toBe(s);                          // same factors, zoom, window and every cursor: no partial quantization
    }
    expect([s.zoom, s.factors[1], s.cursors[0].verticalX]).toEqual([0.5, 1, 118]);
    expect(s.cursors[1]).toBe(placed);
    // A factor change on another panel does not redraw panel 2, so it is not refused.
    expect(pulsarFactor(s, 0, 'up').outcome).toBe('factor-changed');
    // Reset is not a redraw: it clears the cursors and is always allowed.
    expect(pulsarReset(s).outcome).toBe('reset');
  });
  it('a held pan tick that would overflow a redraw is refused, so the hold stops without moving the window', () => {
    let s = click(st(pulsarMode(loaded(synthetic(1000, 1, '1e-309')), 1, 'horizontal')), 1, 0, 123);
    s = { ...s, panStep: 0.1 };
    expect(pulsarPanTick(s)).toMatchObject({ outcome: 'display-unsupported', changed: false });
  });
  it('controls: a finite redraw of the same tiny gain still quantizes, and a finite out-of-range y is still hidden silently', () => {
    // At factor 8, y = 123 stores 1/(1e-309·100·8) = 1.25e306; the redraw product stays finite.
    let s = st(pulsarMode(loaded(synthetic(1000, 1, '1e-309')), 1, 'horizontal'));
    for (let i = 0; i < 3; i++) s = st(pulsarFactor(s, 1, 'up'));
    s = click(s, 1, 0, 123);
    const z = pulsarZoom(s, 'in');
    expect([z.outcome, z.state.cursors[1].horizontalY, z.state.cursors[1].horizontalVisible]).toEqual(['zoomed-in', 123, true]);
    // Factor 4: Round(124 − 1.25e306·100·1e-309·4) = Round(123.5) = 124 is outside 0 ≤ y < base: native rejection, hidden.
    const f = pulsarFactor(z.state, 1, 'down');
    expect([f.outcome, f.state.factors[1], f.state.cursors[1].horizontalVisible, f.state.cursors[1].horizontalY, f.state.cursors[1].horizontalText])
      .toEqual(['factor-changed', 4, false, 123, z.state.cursors[1].horizontalText]);
    expect(f.state.cursors[1].horizontalText).toMatch(/^1\.2500E\+306$/);
  });
  it('record validation refuses a nonfinite number and keeps the dialog and its draft', () => {
    let s = st(pulsarRecordDraft(st(pulsarBeginRecord(click(loaded(), 0, 20))), 'kept'));
    s = { ...s, measurement: { ...s.measurement, horizontal: [Infinity, 0, 0] } };
    const r = pulsarConfirmRecord(s);
    expect([r.outcome, r.changed, r.state.list.length, r.state.recordSession?.draft]).toEqual(['number-unsupported', false, 0, 'kept']);
  });
  it('object and file names with quotes and commas are kept verbatim; the native line candidate stays opaque', () => {
    const text = [`'AB"C,D',25,1`, '430,0,0', '1,1,1', '50000,0.01', '1,2,3'].join('\r\n') + '\r\n';
    const a = admitPlrRecording(new TextEncoder().encode(text), 'quote"file,a.plr');
    if (a.status !== 'admitted') throw new Error(a.reason);
    const s = st(pulsarConfirmRecord(st(pulsarBeginRecord(click(loaded(a.recording), 0, 5)))));
    expect([s.list[0].fields.object, s.list[0].fields.file]).toEqual(['AB"C,D', 'quote"file,a.plr']);
    // Unescaped, as the decoded literals suggest: a naive split no longer yields the 12 fields, so the
    // candidate is not a parseable or exportable CSV line (CSV save is gated and nothing reads it).
    expect(s.list[0].nativeLineCandidate).toBe('"AB"C,D",430.00,1.000,"",0.050000,"",50000.00000000,"",1,10.00,25,"quote"file,a.plr"');
    expect(s.list[0].nativeLineCandidate.split(',')).not.toHaveLength(12);
  });
  it('transitions do not mutate the previous state', () => {
    const s = loaded(), copy = JSON.stringify({ ...s, recording: null });
    click(s, 0, 10); pulsarZoom(s, 'in'); pulsarFactor(s, 0, 'up');
    expect(JSON.stringify({ ...s, recording: null })).toBe(copy);
  });
});

describe('WEB Number refusal inside one pointer gesture (PLR-MOUSE-01, PLR-CURSOR-H-01)', () => {
  // SYNTHETIC: gain 1e-308 on panel 2 at factor 0.125. y = 123 stores 1/(1e-308·100·0.125), about 8e306; y = 0 overflows Number.
  const tiny = (rec = synthetic(1000, 1, '1e-308')) => { let s = st(pulsarMode(loaded(rec), 1, 'horizontal')); for (let i = 0; i < 3; i++) s = st(pulsarFactor(s, 1, 'down')); return s; };
  const held = { leftHeld: true, rightHeld: false };
  it('an accepted press, then a refused move and MouseUp, keeps the last accepted value and marks the panel pending', () => {
    const down = pulsarPointer(tiny(), 1, ptr('down', 'left', 5, 123));
    expect([down.outcome, down.placed, down.state.pending[1], down.state.recordEnabled]).toEqual(['cursor', true, false, false]);
    const accepted = down.state.measurement.horizontal[1], text = down.state.cursors[1].horizontalText;
    expect(Number.isFinite(accepted) && accepted > 7e306).toBe(true);
    expect(text).toMatch(/^8\.0000E\+306$/);
    const move = pulsarPointer(down.state, 1, ptr('move', 'other', 5, 0, held));
    expect([move.outcome, move.changed, move.placed]).toEqual(['number-unsupported', false, false]);
    const up = pulsarPointer(move.state, 1, ptr('up', 'left', 5, 0));
    expect([up.outcome, up.placed, up.state.leftDrag, up.state.pending, up.state.recordEnabled]).toEqual(['number-unsupported', false, false, [false, true, false], true]);
    expect([up.state.measurement.horizontal[1], up.state.cursors[1].horizontalText, up.state.cursors[1].horizontalY]).toEqual([accepted, text, 123]);
    const recorded = st(pulsarConfirmRecord(st(pulsarBeginRecord(up.state))));
    expect([recorded.list.length, recorded.list[0].panel, recorded.list[0].fields.horizontal, recorded.pending]).toEqual([1, 1, text, [false, false, false]]);
  });
  it('a refused press followed by an accepted move also leaves the accepted value recordable after a refused MouseUp', () => {
    const down = pulsarPointer(tiny(), 1, ptr('down', 'left', 5, 0));
    expect([down.outcome, down.placed, down.state.leftDrag]).toEqual(['number-unsupported', false, true]);
    const move = pulsarPointer(down.state, 1, ptr('move', 'other', 5, 123, held));
    expect([move.outcome, move.placed]).toEqual(['cursor', true]);
    const up = pulsarPointer(move.state, 1, ptr('up', 'left', 5, 0));
    expect([up.outcome, up.state.pending[1], up.state.recordEnabled, up.state.measurement.horizontal[1]]).toEqual(['number-unsupported', true, true, move.state.measurement.horizontal[1]]);
  });
  it('control: a completely refused click creates no pending or recordable blank entry', () => {
    const s = tiny();
    const up = pulsarPointer(st(pulsarPointer(s, 1, ptr('down', 'left', 5, 0))), 1, ptr('up', 'left', 5, 0));
    expect([up.outcome, up.state.pending, up.state.recordEnabled, up.state.measurement.horizontal[1], up.state.cursors[1].horizontalText]).toEqual(['number-unsupported', [false, false, false], false, 0, '']);
    expect(pulsarBeginRecord(up.state)).toMatchObject({ outcome: 'record-disabled', changed: false });
  });
  it('control: an already recorded value does not become pending again through a new refused click', () => {
    const recorded = st(pulsarConfirmRecord(st(pulsarBeginRecord(click(tiny(), 1, 5, 123)))));
    expect([recorded.list.length, recorded.pending[1], recorded.recordEnabled]).toEqual([1, false, false]);
    const up = pulsarPointer(st(pulsarPointer(recorded, 1, ptr('down', 'left', 5, 0))), 1, ptr('up', 'left', 5, 0));
    expect([up.outcome, up.state.pending[1], up.state.recordEnabled, up.state.list]).toEqual(['number-unsupported', false, false, recorded.list]);
    expect(up.state.measurement).toBe(recorded.measurement);
  });
  it('a confirmed value is not made pending again by a refused click while the other drag latch is still held', () => {
    // y = 102 stores about 1.76e308 on panel 2; y = 101 overflows Number.
    const right = st(pulsarPointer(tiny(), 1, ptr('down', 'right', 5, 102)));
    const placed = click(right, 1, 5, 102);
    expect([placed.rightDrag, placed.leftDrag, placed.pending[1], placed.gesturePlaced[1]]).toEqual([true, false, true, true]);
    const recorded = st(pulsarConfirmRecord(st(pulsarBeginRecord(placed))));
    expect([recorded.list.length, recorded.pending[1], recorded.recordEnabled, recorded.rightDrag, recorded.gesturePlaced]).toEqual([1, false, false, true, [false, false, false]]);
    const refused = pulsarPointer(st(pulsarPointer(recorded, 1, ptr('down', 'left', 5, 101))), 1, ptr('up', 'left', 5, 101));
    expect([refused.outcome, refused.state.pending[1], refused.state.recordEnabled, refused.state.rightDrag, refused.state.list]).toEqual(['number-unsupported', false, false, true, recorded.list]);
    expect(refused.state.measurement).toBe(recorded.measurement);
    expect(pulsarBeginRecord(refused.state)).toMatchObject({ outcome: 'record-disabled', changed: false });
    // A new accepted press during the same held latch is recordable again through a refused MouseUp.
    const again = pulsarPointer(st(pulsarPointer(refused.state, 1, ptr('down', 'left', 5, 102))), 1, ptr('up', 'left', 5, 101));
    expect([again.outcome, again.state.pending[1], again.state.recordEnabled, again.state.rightDrag]).toEqual(['number-unsupported', true, true, true]);
  });
  it('control: cancel keeps the held gesture recordable, and confirming one panel keeps another panel\'s placement', () => {
    const right = st(pulsarPointer(tiny(), 1, ptr('down', 'right', 5, 102)));
    const cancelled = st(pulsarCancelRecord(st(pulsarBeginRecord(click(right, 1, 5, 102)))));
    expect([cancelled.list.length, cancelled.pending[1], cancelled.gesturePlaced[1]]).toEqual([0, true, true]);
    const refused = pulsarPointer(st(pulsarPointer(cancelled, 1, ptr('down', 'left', 5, 101))), 1, ptr('up', 'left', 5, 101));
    expect([refused.state.pending[1], refused.state.recordEnabled]).toEqual([true, true]);
    // Panel 1 is confirmed alone; the reference placed on panel 2 by the held right press is not recorded for panel 2.
    const panel1 = st(pulsarConfirmRecord(st(pulsarBeginRecord(click(right, 0, 40)))));
    expect([panel1.list.map(e => e.panel), panel1.gesturePlaced, panel1.pending]).toEqual([[0], [false, true, false], [false, false, false]]);
    const other = pulsarPointer(st(pulsarPointer(panel1, 1, ptr('down', 'left', 5, 101))), 1, ptr('up', 'left', 5, 101));
    expect([other.outcome, other.state.pending, other.state.recordEnabled]).toEqual(['number-unsupported', [false, true, false], true]);
  });
  it('control: a valid pending measurement on another panel is kept through refused gestures on panel 2', () => {
    const s = click(tiny(), 0, 40);
    expect([s.pending, s.recordEnabled]).toEqual([[true, false, false], true]);
    const fresh = pulsarPointer(st(pulsarPointer(s, 1, ptr('down', 'left', 5, 0))), 1, ptr('up', 'left', 5, 0));
    expect([fresh.state.pending, fresh.state.recordEnabled]).toEqual([[true, false, false], true]);
    const dragged = pulsarPointer(st(pulsarPointer(s, 1, ptr('down', 'left', 5, 123))), 1, ptr('up', 'left', 5, 0));
    expect([dragged.state.pending, dragged.state.recordEnabled, dragged.state.measurement.vertical[0]]).toEqual([[true, true, false], true, s.measurement.vertical[0]]);
  });
  it('control: pointer cancel commits nothing and forgets the gesture, so the next fully refused gesture is not taken', () => {
    const down = st(pulsarPointer(tiny(), 1, ptr('down', 'left', 5, 123)));
    const released = pulsarPointerRelease(down);
    expect([released.outcome, released.placed, released.state.leftDrag, released.state.pending[1], released.state.recordEnabled]).toEqual(['pointer-released', false, false, false, false]);
    expect(released.state.measurement.horizontal[1]).toBe(down.measurement.horizontal[1]);
    // The component filters an owner's late MouseUp after cancel. The core's native MouseUp
    // handler is not redefined here: check a new complete, fully refused gesture instead.
    const stray = pulsarPointer(st(pulsarPointer(released.state, 1, ptr('down', 'left', 5, 0))), 1, ptr('up', 'left', 5, 0));
    expect([stray.outcome, stray.state.pending[1], stray.state.recordEnabled]).toEqual(['number-unsupported', false, false]);
  });
  it('control: a reset or load during the gesture forgets its accepted placement, so a refused MouseUp records no blank entry', () => {
    const down = st(pulsarPointer(tiny(), 1, ptr('down', 'left', 5, 123)));
    const reset = st(pulsarReset(down));
    expect([reset.leftDrag, reset.measurement.horizontal[1], reset.gesturePlaced]).toEqual([true, 0, [false, false, false]]);
    // Reset restores factor 1 and vertical mode; back to horizontal at factor 0.125, y = 0 is refused again.
    let s = st(pulsarMode(reset, 1, 'horizontal'));
    for (let i = 0; i < 3; i++) s = st(pulsarFactor(s, 1, 'down'));
    const up = pulsarPointer(s, 1, ptr('up', 'left', 5, 0));
    expect([up.outcome, up.state.pending[1], up.state.recordEnabled, up.state.measurement.horizontal[1]]).toEqual(['number-unsupported', false, false, 0]);
    expect(st(pulsarLoad(down, synthetic())).gesturePlaced).toEqual([false, false, false]);
  });
});

describe('status policy: pulsarAnnouncement', () => {
  const tiny = () => { let s = st(pulsarMode(loaded(synthetic(1000, 1, '1e-308')), 1, 'horizontal')); for (let i = 0; i < 3; i++) s = st(pulsarFactor(s, 1, 'down')); return s; };
  it('announces every non-silent outcome, and a silent one keeps the shown status', () => {
    const s = loaded();
    expect(pulsarAnnouncement(null, pulsarZoom(s, 'in'))).toBe('zoomed-in');
    expect(pulsarAnnouncement('cursor', pulsarPointer(tiny(), 1, ptr('down', 'left', 5, 0)))).toBe('number-unsupported');
    expect(pulsarAnnouncement('zoomed-in', pulsarPointer(s, 0, ptr('down', 'left', 5)))).toBeNull();
    expect(pulsarAnnouncement('number-unsupported', pulsarPointer(s, 0, ptr('move', 'other', 5)))).toBeNull(); // pointer-ignored
  });
  it('an accepted placement replaces a refusal status, also when it stores the same value as before', () => {
    const before = click(tiny(), 1, 5, 123);
    const refused = pulsarPointer(before, 1, ptr('down', 'left', 5, 0));
    expect(pulsarAnnouncement('cursor', refused)).toBe('number-unsupported');
    const same = pulsarPointer(st(pulsarPointer(refused.state, 1, ptr('up', 'left', 5, 0))), 1, ptr('down', 'left', 5, 123));
    expect([same.outcome, same.placed, same.state.measurement.horizontal[1]]).toEqual(['cursor', true, before.measurement.horizontal[1]]);
    expect(pulsarAnnouncement('number-unsupported', same)).toBe('cursor');
    expect(pulsarAnnouncement('display-unsupported', pulsarPointer(loaded(), 0, ptr('down', 'right', 5)))).toBe('cursor');
  });
  it('a transition that stores no placement keeps a refusal status; file and read statuses are never replaced by a placement', () => {
    const outside = pulsarPointer(st(pulsarMode(loaded(), 1, 'horizontal')), 1, ptr('down', 'left', 5, 124)); // native 0x56c6dc rejection
    expect([outside.outcome, outside.changed, outside.placed]).toEqual(['cursor', true, false]);
    expect(pulsarAnnouncement('number-unsupported', outside)).toBeNull();
    const latched = st(pulsarPointer(loaded(), 0, ptr('down', 'left', 5)));
    expect(pulsarAnnouncement('number-unsupported', pulsarPointerRelease(latched))).toBeNull();
    expect(pulsarAnnouncement(null, pulsarPointer(loaded(), 0, ptr('down', 'left', 5)))).toBeNull();
  });
});
