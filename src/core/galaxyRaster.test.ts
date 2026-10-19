import { describe, expect, it } from 'vitest';
import { composeGalaxyPixel, galaxyBaseProfile, galaxyToneProfile, GALAXY_STAMP_SIZE } from './galaxyRaster';
import vectors from '../../data/hubble/galaxy-raster-vectors.json';

describe('original galaxy table stages, before unresolved native rasterization', () => {
  it('matches independent independently calculated adapter vectors, including center, wings and cutoff', () => {
    const base = galaxyBaseProfile();
    expect(base).toHaveLength(249 * 249);
    for (const point of vectors.points) {
      const index = (point.y - 1) * GALAXY_STAMP_SIZE + point.x - 1;
      expect(base[index]).toBe(point.base);
      for (let i = 0; i < point.toneLevels.length; i++) expect(galaxyToneProfile(point.toneLevels[i])[index]).toBe(point.tones[i]);
    }
  });
  it('keeps independent mutable table outputs and the recovered rotational symmetry', () => {
    const base = galaxyBaseProfile();
    expect(base[124 * 249 + 124]).toBe(255);
    expect(base[124 * 249 + 79]).toBe(base[169 * 249 + 124]);
    base[0] = 99;
    expect(galaxyBaseProfile()[0]).toBe(0);
    const toned = galaxyToneProfile(14); toned[124 * 249 + 124] = 0;
    expect(galaxyToneProfile(14)[124 * 249 + 124]).toBeGreaterThan(0);
  });
  it('uses source red as replacement predicate, including ties, without per-channel maxima', () => {
    expect(composeGalaxyPixel([11, 0, 0], [10, 250, 255])).toEqual([11, 0, 0]);
    expect(composeGalaxyPixel([10, 255, 255], [10, 0, 0])).toEqual([10, 0, 0]);
    expect(composeGalaxyPixel([0, 255, 255], [0, 0, 0])).toEqual([0, 0, 0]);
    expect(composeGalaxyPixel([1, 2, 3], [0, 200, 200])).toEqual([1, 2, 3]);
  });
  it('rejects unsupported brightness levels and malformed RGB channels', () => {
    for (const level of [-1, .5, 15, NaN]) expect(() => galaxyToneProfile(level)).toThrow();
    for (const value of [-1, .5, 256, NaN]) expect(() => composeGalaxyPixel([value, 1, 2], [0, 0, 0])).toThrow();
  });
});
