import { describe, expect, it } from 'vitest';
import vectors from '../../data/hubble/spectrum-accumulation-vectors.json';
import { advanceExposure, createExposure, pauseExposure, resetExposure, startExposure } from './exposure';
import { photonAmplitudes } from './photons';
import { parseLegacySpectrumFile, serializeDotDecimalVireoSpectrum } from './legacySpectrumFile';

// Generated outside this module with integer LCG and Decimal80/100 product
// Poisson. No production sampler generates these expected counts or seeds.
const means = Array.from({ length: 600 }, (_, i) => vectors.sourcePattern[i % vectors.sourcePattern.length]);
type ExpectedTick = typeof vectors.sourceAndSky[number];
function checkTick(actual: ReturnType<typeof advanceExposure>, expected: ExpectedTick): void {
  expect(actual.counts).toEqual(expected.counts);
  expect(actual.sourceTotal).toBe(expected.sourceTotal);
  expect(actual.skyTotal).toBe(expected.skyTotal);
  expect(actual.seed).toBe(expected.seed);
  expect(actual.draws).toBe(expected.draws);
  expect(actual.counts.reduce((sum, value) => sum + value, 0)).toBe(actual.sourceTotal + actual.skyTotal);
}

describe('source-plus-sky acquisition/save amendment, synthetic counts only', () => {
  it('retains both positive draws per channel from calibration through the saved spectrum', () => {
    const amplitudes = photonAmplitudes(16, 16, 16, .5);
    expect(amplitudes).toEqual({ source: .5, sky: 1 });
    const suppliedProfile = [1, 2, 3, 4]; // Explicit synthetic source, not slit or catalog recovery.
    const source = Array.from({ length: 600 }, (_, i) => suppliedProfile[i % 4] * amplitudes.source);
    expect(source).toEqual(means);
    const initial = startExposure(createExposure(source, amplitudes.sky, vectors.multiplier, vectors.initialSeed));
    const expected = vectors.sourceAndSky[0], acquired = advanceExposure(initial, expected.deltaMs);
    checkTick(acquired, expected);
    expect(acquired.sourceTotal).toBeGreaterThan(0); expect(acquired.skyTotal).toBeGreaterThan(0);
    expect(acquired.counts).not.toEqual(expected.sourceDraws);
    expect(acquired.counts).not.toEqual(expected.sourceDraws.map((draw, i) => draw - expected.skyDraws[i]));
    expect(initial.counts.every(value => value === 0)).toBe(true); expect(initial.seed).toBe(vectors.initialSeed);
    const saved = serializeDotDecimalVireoSpectrum({ object: 'Synthetic S+K', pointingRa: 1, pointingDec: 0,
      apparentMagnitude: 16, minimum: 3700, step: 1, counts: acquired.counts });
    const parsed = parseLegacySpectrumFile(saved);
    expect(parsed.kind).toBe('vireo-headered-600');
    expect(parsed.samples.map(sample => sample.intensity)).toEqual(expected.normalizedSixDecimals.map(Number));
    expect(acquired.counts).toEqual(expected.counts); // Saving does not replace counts with a corrected buffer.
  });

  it('distinguishes positive sky-only exposure from a present zero-valued source', () => {
    const sky = advanceExposure(startExposure(createExposure(null, vectors.skyMean, 1, vectors.initialSeed)), 1);
    const presentZero = advanceExposure(startExposure(createExposure(Array<number>(600).fill(0), vectors.skyMean, 1, vectors.initialSeed)), 1);
    checkTick(sky, vectors.skyOnly); checkTick(presentZero, vectors.presentZeroSource);
    expect(sky.sourceTotal).toBe(0); expect(sky.skyTotal).toBeGreaterThan(0);
    expect(sky.counts).toEqual(vectors.skyOnly.skyDraws);
    expect(presentZero.counts).toEqual(vectors.presentZeroSource.skyDraws);
    expect(sky.seed).not.toBe(presentZero.seed); expect(sky.counts).not.toEqual(presentZero.counts);
  });

  it('preserves nonzero source and sky on pause/resume and clears both on reset without reseeding', () => {
    const first = advanceExposure(startExposure(createExposure(means, vectors.skyMean, 1, vectors.initialSeed)), 1);
    const paused = pauseExposure(first);
    expect(paused.counts).toBe(first.counts); expect(paused.sourceTotal).toBe(first.sourceTotal);
    expect(paused.skyTotal).toBe(first.skyTotal); expect(paused.seed).toBe(first.seed);
    const second = advanceExposure(startExposure(paused), vectors.sourceAndSky[1].deltaMs);
    checkTick(second, vectors.sourceAndSky[1]); expect(second.elapsedMs).toBe(3);
    const reset = resetExposure(pauseExposure(second));
    expect(reset.counts.every(value => value === 0)).toBe(true);
    expect(reset.sourceTotal).toBe(0); expect(reset.skyTotal).toBe(0);
    expect(reset.elapsedMs).toBe(0); expect(reset.draws).toBe(0); expect(reset.seed).toBe(vectors.resetSeed);
    checkTick(advanceExposure(startExposure(reset), vectors.afterReset.deltaMs), vectors.afterReset);
    expect(second.counts).toEqual(vectors.sourceAndSky[1].counts);
  });
});
