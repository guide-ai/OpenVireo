import { poissonDraw, randomDraw } from './acquisition';

/** 600-bin acquisition state; original source/image preparation is still a gate.
 * Callers supply per-bin source means, uniform sky mean and elapsed multiplier.
 * Explicit delta milliseconds replace GetTickCount/event scheduling. */
export const EXPOSURE_BINS = 600;
export class ExposureError extends Error {
  constructor(readonly code: 'configuration' | 'phase' | 'elapsed' | 'counter') {
    super(`Exposure state contract: ${code}`); this.name = 'ExposureError';
  }
}
export type Exposure = Readonly<{
  phase: 'idle' | 'running' | 'paused';
  sourceMeans: readonly number[] | null;
  skyMean: number;
  multiplier: number;
  counts: readonly number[];
  sourceTotal: number;
  skyTotal: number;
  elapsedMs: number;
  seed: number;
  draws: number;
  stopReason: 'signal-to-noise-limit' | null;
}>;
function frozen(state: Exposure): Exposure { return Object.freeze(state); }
export function createExposure(sourceMeans: readonly number[] | null, skyMean: number, multiplier: number, seed: number): Exposure {
  randomDraw(seed); // Validate without advancing this explicit state.
  if (!Number.isFinite(skyMean) || skyMean < 0 || !Number.isInteger(multiplier) || multiplier < 0 || multiplier > 0x7fff_ffff) throw new ExposureError('configuration');
  let source: readonly number[] | null = null;
  if (sourceMeans !== null) {
    if (sourceMeans.length !== EXPOSURE_BINS) throw new ExposureError('configuration');
    const values = [...sourceMeans];
    if (values.some(value => !Number.isFinite(value) || value < 0)) throw new ExposureError('configuration');
    source = Object.freeze(values);
  }
  return frozen({ phase: 'idle', sourceMeans: source, skyMean, multiplier, counts: Object.freeze(Array<number>(EXPOSURE_BINS).fill(0)), sourceTotal: 0, skyTotal: 0, elapsedMs: 0, seed, draws: 0, stopReason: null });
}
export function startExposure(state: Exposure): Exposure {
  if (state.phase === 'running' || state.stopReason !== null) throw new ExposureError('phase');
  return frozen({ ...state, phase: 'running' });
}
export function pauseExposure(state: Exposure): Exposure {
  if (state.phase !== 'running') throw new ExposureError('phase');
  return frozen({ ...state, phase: 'paused' });
}
/** Original reset clears bins/counters but does not reinitialize the global RNG. */
export function resetExposure(state: Exposure): Exposure {
  if (state.phase === 'running') throw new ExposureError('phase');
  return createExposure(state.sourceMeans, state.skyMean, state.multiplier, state.seed);
}
export function exposureStatistics(state: Exposure): Readonly<{ averageCount: number; legacySignalToNoise: number; displayScale: number }> {
  const averageCount = (state.sourceTotal + state.skyTotal) / EXPOSURE_BINS;
  return { averageCount, legacySignalToNoise: Math.sqrt(averageCount), displayScale: 200 / Math.max(1, ...state.counts) };
}
/** 0x50f76c: signed low32 multiplier*delta, source then sky for each bin.
 * All writes are local until the complete tick succeeds, so a numeric/precision
 * failure leaves the caller's state intact. No partial observation is returned.
 */
export function advanceExposure(state: Exposure, deltaMs: number): Exposure {
  if (state.phase !== 'running') throw new ExposureError('phase');
  if (!Number.isInteger(deltaMs) || deltaMs < 0 || deltaMs > 0xffff_ffff || !Number.isSafeInteger(state.elapsedMs + deltaMs)) throw new ExposureError('elapsed');
  const product = Math.imul(state.multiplier, deltaMs);
  const counts = [...state.counts];
  let seed = state.seed, draws = state.draws, sourceTotal = state.sourceTotal, skyTotal = state.skyTotal;
  for (let i = 0; i < EXPOSURE_BINS; i++) {
    let source = 0;
    if (state.sourceMeans !== null) {
      const draw = poissonDraw(product * state.sourceMeans[i], seed);
      source = draw.value; seed = draw.seed; draws += draw.draws;
    }
    const sky = poissonDraw(product * state.skyMean, seed);
    seed = sky.seed; draws += sky.draws;
    counts[i] += source + sky.value;
    sourceTotal += source; skyTotal += sky.value;
    // Original bins and sky counter are signed int32; do not silently wrap into
    // negative rendered counts. Source/int64 totals use a safe-integer adapter.
    if (counts[i] > 0x7fff_ffff || skyTotal > 0x7fff_ffff || !Number.isSafeInteger(sourceTotal) ||
        !Number.isSafeInteger(sourceTotal + skyTotal) || !Number.isSafeInteger(draws)) throw new ExposureError('counter');
  }
  const legacySignalToNoise = Math.sqrt((sourceTotal + skyTotal) / EXPOSURE_BINS);
  const limit = legacySignalToNoise > 1000;
  return frozen({ ...state, counts: Object.freeze(counts), sourceTotal, skyTotal, seed, draws, elapsedMs: state.elapsedMs + deltaMs,
    phase: limit ? 'paused' : 'running', stopReason: limit ? 'signal-to-noise-limit' : null });
}
