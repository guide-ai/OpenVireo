import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { admitPlrRecording } from './pulsarRecording';
import { INITIAL_PULSAR_ANALYSIS, pulsarBeginRecord, pulsarLoad, pulsarPan, pulsarPanRate, pulsarPanTick, pulsarPointer, type PulsarAnalysisState } from './pulsarAnalysis';
import { createPulsarPanHold, PULSAR_PAN_TIMER_MS } from './pulsarPanHold';

// SYNTHETIC fixture (dt = 0.01 s); not an acquired observation.
function loaded(): PulsarAnalysisState {
  const lines = ["'SYNTH',25,1", '400.00,1400.00,0', '1.0,1.0,1.0', '50000.5,0.01', ...Array.from({ length: 50 }, (_, i) => `${i},0,0`)];
  const a = admitPlrRecording(new TextEncoder().encode(lines.join('\r\n') + '\r\n'), 'synthetic.plr');
  if (a.status !== 'admitted') throw new Error(a.reason);
  return pulsarPanRate(pulsarLoad(INITIAL_PULSAR_ANALYSIS, a.recording).state, 1).state; // window [0, 4], step ±0.01
}

/** The component wiring: one state holder, Vitest fake timers as the clock. */
function rig(initial: PulsarAnalysisState) {
  let s = initial;
  const every = vi.fn((ms: number, fn: () => void) => setInterval(fn, ms));
  const cancel = vi.fn((h: ReturnType<typeof setInterval>) => clearInterval(h));
  const apply = (tr: { state: PulsarAnalysisState; outcome: string }) => { s = tr.state; return tr.outcome === 'panned'; };
  const hold = createPulsarPanHold({ every, cancel }, () => apply(pulsarPanTick(s)));
  const press = (d: 'left' | 'right') => hold.press(() => apply(pulsarPan(s, d)));
  return { hold, press, every, cancel, start: () => s.windowStart, get: () => s, set: (n: PulsarAnalysisState) => { s = n; } };
}

describe('pan hold lifecycle (PLR-PAN-01, DFM PanTimer.Interval = 100)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('a press steps once at once, then repeats every 100 ms until release', () => {
    const r = rig(loaded());
    r.press('right');
    expect(PULSAR_PAN_TIMER_MS).toBe(100);
    expect(r.start()).toBeCloseTo(0.01, 12);
    expect(r.every).toHaveBeenCalledTimes(1);
    expect(r.every.mock.calls[0][0]).toBe(100);
    vi.advanceTimersByTime(99);
    expect(r.start()).toBeCloseTo(0.01, 12);
    vi.advanceTimersByTime(1);
    expect(r.start()).toBeCloseTo(0.02, 12);
    vi.advanceTimersByTime(300);
    expect(r.start()).toBeCloseTo(0.05, 12);
    r.hold.release();
    expect(r.hold.held()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(r.start()).toBeCloseTo(0.05, 12);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a press while held changes the step but keeps the single running timer (SetEnabled 0x448ff4 is a no-op when unchanged)', () => {
    const r = rig(loaded());
    r.press('right');
    vi.advanceTimersByTime(150);                 // +0.01 press, +0.01 at 100 ms
    r.press('left');                              // −0.01 at once; the 200 ms phase is kept
    expect(r.start()).toBeCloseTo(0.01, 12);
    expect(r.every).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(50);
    expect(r.start()).toBeCloseTo(0, 12);         // tick at 200 ms uses the new step
    r.hold.release(); r.hold.release();
    expect(r.cancel).toHaveBeenCalledTimes(1);
  });

  it('re-entry after release starts a fresh 100 ms timer', () => {
    const r = rig(loaded());
    r.press('right'); r.hold.release();
    vi.advanceTimersByTime(250);
    r.press('right');
    expect(r.every).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(99);
    expect(r.start()).toBeCloseTo(0.02, 12);
    vi.advanceTimersByTime(1);
    expect(r.start()).toBeCloseTo(0.03, 12);
    r.hold.release();
  });

  it('a tick that cannot pan (modal opened) stops the hold; a press that cannot pan starts nothing', () => {
    const r = rig(loaded());
    r.press('right');
    const withCursor = pulsarPointer(pulsarPointer(r.get(), 0, { phase: 'down', button: 'left', leftHeld: false, rightHeld: false, x: 5, y: 5 }).state, 0, { phase: 'up', button: 'left', leftHeld: false, rightHeld: false, x: 5, y: 5 }).state;
    r.set(pulsarBeginRecord(withCursor).state);
    vi.advanceTimersByTime(100);
    expect(r.hold.held()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    r.press('left');
    expect(r.hold.held()).toBe(false);
    expect(r.every).toHaveBeenCalledTimes(1);
  });

  it('release before the first interval leaves exactly the press step (a short click is one step)', () => {
    const r = rig(loaded());
    r.press('left');
    vi.advanceTimersByTime(40);
    r.hold.release();
    vi.advanceTimersByTime(500);
    expect(r.start()).toBeCloseTo(-0.01, 12);
  });
});
