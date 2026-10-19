import { describe, expect, it } from 'vitest';
import { advanceExposure, createExposure, exposureStatistics, pauseExposure, resetExposure, startExposure } from './exposure';

function independentSeed(seed: number, draws: number): number {
  let state = BigInt(seed);
  for (let i = 0; i < draws; i++) state = (state * 0x08088405n + 1n) & 0xffff_ffffn;
  return Number(state);
}
describe('600-bin exposure reducer, supplied synthetic means only', () => {
  it('preserves source-then-sky ordering, including zero means, against integer reference state', () => {
    const means = Array<number>(600).fill(0); means[0] = 12;
    const initial = startExposure(createExposure(means, 0, 1, 4138751795));
    const next = advanceExposure(initial, 1);
    expect(next.counts[0]).toBe(12);
    expect(next.counts.slice(1).every(x => x === 0)).toBe(true);
    expect(next.sourceTotal).toBe(12); expect(next.skyTotal).toBe(0);
    expect(next.draws).toBe(1201);
    expect(next.seed).toBe(independentSeed(4138751795, 1201));
    expect(initial.counts.every(x => x === 0)).toBe(true);
    expect(initial.seed).toBe(4138751795);
    expect(exposureStatistics(next)).toEqual({ averageCount: 0.02, legacySignalToNoise: Math.sqrt(0.02), displayScale: 200 / 12 });
  });
  it('sky-only skips source draws while a present zero-valued source still consumes them', () => {
    const sky = advanceExposure(startExposure(createExposure(null, 0, 1, 99)), 1);
    const source = advanceExposure(startExposure(createExposure(Array<number>(600).fill(0), 0, 1, 99)), 1);
    expect(sky.draws).toBe(600); expect(source.draws).toBe(1200);
    expect(sky.seed).toBe(independentSeed(99, 600));
    expect(source.seed).toBe(independentSeed(99, 1200));
  });
  it('pause/resume preserves accumulated counters and reset retains current RNG state', () => {
    const first = advanceExposure(startExposure(createExposure(null, 0, 50, 123)), 20);
    const paused = pauseExposure(first);
    expect(() => advanceExposure(paused, 1)).toThrow();
    const resumed = advanceExposure(startExposure(paused), 30);
    expect(resumed.elapsedMs).toBe(50); expect(resumed.draws).toBe(1200);
    expect(resumed.seed).toBe(independentSeed(123, 1200));
    const reset = resetExposure(pauseExposure(resumed));
    expect(reset.phase).toBe('idle'); expect(reset.elapsedMs).toBe(0);
    expect(reset.draws).toBe(0); expect(reset.seed).toBe(resumed.seed);
  });
  it('preserves low32 multiplication and fails a tick atomically at the precision boundary', () => {
    const wrapped = advanceExposure(startExposure(createExposure(null, 1, 65536, 5)), 65536);
    expect(wrapped.skyTotal).toBe(0); expect(wrapped.draws).toBe(600);
    const means = Array<number>(600).fill(0); means[0] = 12;
    const state = startExposure(createExposure(means, 0, 1, 2796574515));
    expect(() => advanceExposure(state, 1)).toThrow(expect.objectContaining({ code: 'precision' }));
    expect(state.draws).toBe(0); expect(state.seed).toBe(2796574515);
    expect(state.counts.every(x => x === 0)).toBe(true);
  });
  it('stops at the recovered legacy S/N limit and requires reset before another start', () => {
    const state = startExposure(createExposure(Array<number>(600).fill(1_000_000), 1_000_000, 1, 123));
    const result = advanceExposure(state, 1);
    expect(exposureStatistics(result).legacySignalToNoise).toBeGreaterThan(1000);
    expect(result.phase).toBe('paused');
    expect(result.stopReason).toBe('signal-to-noise-limit');
    expect(() => startExposure(result)).toThrow();
    expect(startExposure(resetExposure(result)).phase).toBe('running');
  });
  it('rejects malformed configuration, invalid transitions and unsupported negative wrapped means', () => {
    expect(() => createExposure(new Array<number>(600), 0, 1, 1)).toThrow();
    expect(() => createExposure([], 0, 1, 1)).toThrow();
    expect(() => createExposure(null, -1, 1, 1)).toThrow();
    const state = createExposure(null, 1, 65536, 1);
    expect(() => advanceExposure(state, 1)).toThrow();
    const running = startExposure(state);
    expect(() => startExposure(running)).toThrow(); expect(() => resetExposure(running)).toThrow();
    expect(() => advanceExposure(running, 32768)).toThrow(expect.objectContaining({ code: 'mean' }));
    expect(() => advanceExposure(running, -1)).toThrow();
  });
});
