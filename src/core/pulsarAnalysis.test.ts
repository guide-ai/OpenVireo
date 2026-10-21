import { describe, expect, it } from 'vitest';
import { admitPlrRecording, type PlrRecording } from './pulsarRecording';
import {
  INITIAL_PULSAR_ANALYSIS, PULSAR_BASES, PULSAR_PANEL_HEIGHTS, pulsarAnswerClear, pulsarAxisTicks, pulsarBeginRecord, pulsarCancelRecord, pulsarConfirmRecord,
  pulsarFactor, pulsarLoad, pulsarMode, pulsarPan, pulsarPanRate, pulsarPanTick, pulsarPointer, pulsarProperties, pulsarReadouts, pulsarRecordDialog,
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
  it('zoom out stops at 0.125', () => {
    let s = loaded();
    for (let i = 0; i < 3; i++) s = st(pulsarZoom(s, 'out'));
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
  it('transitions do not mutate the previous state', () => {
    const s = loaded(), copy = JSON.stringify({ ...s, recording: null });
    click(s, 0, 10); pulsarZoom(s, 'in'); pulsarFactor(s, 0, 'up');
    expect(JSON.stringify({ ...s, recording: null })).toBe(copy);
  });
});
