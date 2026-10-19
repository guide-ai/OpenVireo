import { roundNearestEven } from './numericPolicy';
import { describe, expect, it } from 'vitest';
import { AcquisitionError, poissonDraw, randomDraw, recoveredLogGamma, sampleUniformSpectrum, uniformSpectrum } from './acquisition';

describe('recovered acquisition building blocks (synthetic vectors, no original-run oracle)', () => {
  it('shares one explicit nearest-even policy across positive and negative integer ties', () => {
    for (const [input, expected] of [[-2.5, -2], [-1.5, -2], [-.5, 0], [.5, 0], [1.5, 2], [2.5, 2], [3.5, 4], [229.5, 230]]) expect(roundNearestEven(input)).toBe(expected);
  });
  it('matches independent BigInt LCG arithmetic over signed boundaries and long sequences', () => {
    for (const initial of [0, 1, 0x7fff_ffff, 0x8000_0000, 0xffff_ffff]) {
      let expected = BigInt(initial), actual = initial;
      for (let i = 0; i < 1000; i++) {
        expected = (expected * 0x08088405n + 1n) & 0xffff_ffffn;
        const draw = randomDraw(actual);
        expect(draw.seed).toBe(Number(expected));
        expect(draw.value).toBe(Number(expected) / 4294967296);
        expect(draw.value).toBeGreaterThanOrEqual(0);
        expect(draw.value).toBeLessThan(1);
        actual = draw.seed;
      }
    }
    for (const seed of [-1, 0.5, 0x1_0000_0000, NaN, Infinity]) expect(() => randomDraw(seed)).toThrow(AcquisitionError);
  });

  it('preserves samples, does not clamp flux, and reproduces a quadratic including both edges', () => {
    const values = [0, 1, 4, 9, 16];
    const grid = uniformSpectrum(4000, 4004, values);
    values[2] = 99;
    for (const u of [0, 0.2, 0.8, 1, 1.25, 2.75, 3.8, 4]) {
      expect(sampleUniformSpectrum(grid, 4000 + u).value).toBeCloseTo(u * u, 10);
    }
    expect(Object.isFrozen(grid.intensities)).toBe(true);
    expect(sampleUniformSpectrum(grid, 3999.9)).toEqual({ valid: false, value: 0 });
    expect(sampleUniformSpectrum(grid, 4004.1)).toEqual({ valid: false, value: 0 });
    expect(() => sampleUniformSpectrum(grid, NaN)).toThrow(AcquisitionError);
  });

  it('uses the declared nearest-even tie policy and original near-index snap threshold', () => {
    const grid = uniformSpectrum(4000, 4004, [0, 1, 8, 27, 64]);
    expect(sampleUniformSpectrum(grid, 4001.5).value).toBe(3);
    expect(sampleUniformSpectrum(grid, 4002.5).value).toBe(16);
    expect(sampleUniformSpectrum(grid, 4002 + 0.9e-5).value).toBe(8);
    expect(sampleUniformSpectrum(grid, 4002 + 1.1e-5).value).toBeGreaterThan(8);
    const fine = uniformSpectrum(4000, 4000.4, [0, 1, 8, 27, 64]);
    expect(sampleUniformSpectrum(fine, 4000.2 + 0.9e-6).value).toBe(8);
    // 0.9e-5 Angstrom is within a wavelength tolerance but outside 1e-5 index units.
    expect(sampleUniformSpectrum(fine, 4000.2 + 0.9e-5).value).toBeGreaterThan(8);
  });

  it('rejects unusable grids instead of constructing degenerate interpolation state', () => {
    for (const [min, max, values] of [[0, 4, [0, 1, 2]], [4, 4, [0, 1, 2]], [1, 4, [0, 1]], [1, 4, [0, NaN, 2]], [1, Infinity, [0, 1, 2]]] as const) {
      expect(() => uniformSpectrum(min, max, values)).toThrow(AcquisitionError);
    }
    expect(() => uniformSpectrum(1, 4, new Array<number>(3))).toThrow(AcquisitionError);
  });

  it('checks recovered gamma against factorial sums and a noninteger closed form', () => {
    let logFactorial = 0;
    for (let n = 1; n <= 200; n++) {
      if (n > 1) logFactorial += Math.log(n - 1);
      expect(Math.abs(recoveredLogGamma(n) - logFactorial)).toBeLessThan(3e-8);
    }
    expect(recoveredLogGamma(1.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI) / 2), 8);
    for (const argument of [0, 0.5, Infinity, NaN]) expect(() => recoveredLogGamma(argument)).toThrow(AcquisitionError);
  });

  it('consumes one uniform even for mean zero and reproduces the product stopping rule independently', () => {
    expect(poissonDraw(0, 0)).toEqual({ value: 0, seed: 1, draws: 1 });
    let seed = 0xfeedn, product = 1, draws = 0;
    while (product > Math.exp(-3.25)) {
      seed = (seed * 0x08088405n + 1n) & 0xffff_ffffn;
      product *= Number(seed) / 4294967296;
      draws++;
    }
    expect(poissonDraw(3.25, 0xfeed)).toEqual({ value: draws - 1, seed: Number(seed), draws });
  });

  it('gives reproducible nonnegative integer noise with expected mean and variance across both branches', () => {
    for (const mean of [3, 11.999, 12, 12.5, 100]) {
      const count = 20_000;
      let seed = 0x1234abcd, sum = 0, squareSum = 0;
      for (let i = 0; i < count; i++) {
        const draw = poissonDraw(mean, seed);
        expect(Number.isSafeInteger(draw.value)).toBe(true);
        expect(draw.value).toBeGreaterThanOrEqual(0);
        sum += draw.value; squareSum += draw.value * draw.value; seed = draw.seed;
      }
      const average = sum / count, variance = squareSum / count - average * average;
      // Generous fixed tolerances: a regression diagnostic, not original fidelity evidence.
      expect(Math.abs(average - mean)).toBeLessThan(6 * Math.sqrt(mean / count));
      expect(Math.abs(variance - mean)).toBeLessThan(0.06 * mean);
      expect(poissonDraw(mean, 123)).toEqual(poissonDraw(mean, 123));
    }
  });

  it('pins rejection-branch draw order with independent integer/factorial reference vectors', () => {
    // Python integer LCG + Fraction(12**(k-12) * 12! / k!), independent of recovered gamma.
    // Research artifact: analysis/hubble-acquisition/poisson-independent-vectors.json.
    expect(poissonDraw(12, 4138751795)).toEqual({ value: 12, seed: 1342177281, draws: 2 });
    // Candidate 61 triggers exponent < -30, consumes acceptance draw, then accepts 7.
    expect(poissonDraw(12, 1051744051)).toEqual({ value: 7, seed: 1953344543, draws: 4 });
    // A negative candidate consumes no acceptance draw, then a rejection and acceptance.
    expect(poissonDraw(12, 246437683)).toEqual({ value: 17, seed: 1004296348, draws: 5 });
    // This valid seed reaches uniform exactly 0.5. Original x87 pole behavior is unresolved.
    expect(randomDraw(2796574515).value).toBe(0.5);
    expect(() => poissonDraw(12, 2796574515)).toThrow(expect.objectContaining({ code: 'precision' }));
  });

  it('fails explicitly on invalid domains and exhausted draw budgets', () => {
    for (const mean of [-1, NaN, Infinity, 1_000_001]) expect(() => poissonDraw(mean, 1)).toThrow(AcquisitionError);
    expect(() => poissonDraw(3, -1)).toThrow(AcquisitionError);
    for (const budget of [0, 0.5, 100_001]) expect(() => poissonDraw(3, 1, budget)).toThrow(AcquisitionError);
    expect(() => poissonDraw(12, 0, 1)).toThrow(expect.objectContaining({ code: 'budget' }));
    expect(() => poissonDraw(10, 1, 1)).toThrow(expect.objectContaining({ code: 'budget' }));
  });
});
