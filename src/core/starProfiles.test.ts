import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import vectors from '../../data/hubble/star-profile-vectors.json';
import { nativeStarBase, prepareNativeStarProfile, prepareNativeStarProfiles, StarProfileError } from './starProfiles';
import { paintNativeStar } from './detectorRaster';
import { slitPixelLevel } from './photons';

describe('bounded native star profile preparation; no original-run oracle', () => {
  it('checks every base cell against independent Decimal integer-table digests', () => {
    for (const vector of vectors.bases) {
      const base = nativeStarBase(vector.index), bytes = Buffer.alloc(base.length * 4);
      base.forEach((value, i) => bytes.writeInt32LE(value, i * 4));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(vector.sha256);
      for (const sample of vector.samples) expect(base[sample.x * 99 + sample.y]).toBe(sample.value);
    }
    expect(nativeStarBase(0)[49 * 99 + 50]).toBe(2952);
    expect(nativeStarBase(0)[50 * 99 + 49]).toBe(2472);
  });
  it('pins all fifteen adapter levels, including table-switch boundaries and saturation', () => {
    const bank = prepareNativeStarProfiles();
    expect(bank.radius).toBe(50); expect(bank.levels).toHaveLength(15);
    for (const vector of vectors.levels) {
      const profile = bank.levels[vector.level];
      expect(profile).toHaveLength(99 * 99);
      expect(createHash('sha256').update(profile).digest('hex')).toBe(vector.sha256);
      for (const sample of vector.samples) expect(profile[sample.x * 99 + sample.y]).toBe(sample.value);
    }
    // Explicit Number policy at a sensitivity tie, not an original x87 claim.
    expect(prepareNativeStarProfile(1)[4 * 99 + 48]).toBe(32);
  });
  it('does not expose cached bases or share mutable profile buffers', () => {
    const original = nativeStarBase(0)[0], first = nativeStarBase(0);
    first[0] = 12345; expect(nativeStarBase(0)[0]).toBe(original);
    const bank = prepareNativeStarProfiles(), second = prepareNativeStarProfiles();
    const before = second.levels[0][49 * 99 + 49]; bank.levels[0][49 * 99 + 49] = 0;
    expect(second.levels[0][49 * 99 + 49]).toBe(before);
    expect(bank.levels[0].buffer).not.toBe(bank.levels[1].buffer);
  });
  it('connects prepared levels to the existing painter and slit on a synthetic black field', () => {
    // Independent Fraction sums of the Decimal-base vectors, after threshold30.
    // Black100x100 and center50 are a test fixture, not original scene settings.
    for (const [level, expected] of [[0, 765], [6, 651], [9, 314], [12, 121], [13, 77], [14, 41]]) {
      const field = { width: 100, height: 100, rgb: new Uint8Array(100 * 100 * 3) };
      const painted = paintNativeStar(field, prepareNativeStarProfile(level), { x: 50, y: 50 });
      expect(slitPixelLevel(painted)).toBe(expected);
      expect(field.rgb.every(value => value === 0)).toBe(true);
    }
  });
  it('rejects unsupported table indices and levels without inventing configuration', () => {
    for (const value of [-1, .5, 4, NaN, Infinity]) expect(() => nativeStarBase(value)).toThrow(StarProfileError);
    for (const value of [-1, .5, 15, NaN, Infinity]) expect(() => prepareNativeStarProfile(value)).toThrow(StarProfileError);
  });
});
