import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { GalaxySpectrumError, galaxyChannelGrid, prepareGalaxyProfile } from './galaxySpectrum';
import { parseLibrarySpectrum } from './spectrum';
import vectors from '../../data/hubble/galaxy-profile-vectors.json';

function originalFixture(fixture: typeof vectors.profiles[number]): string {
  const relative = fixture.file === 'GLXYTMPL.SP' ? `data/original/${fixture.file}` : `public/original/spectra/${fixture.file}`;
  let bytes: Buffer;
  try { bytes = readFileSync(new URL(`../../${relative}`, import.meta.url)); }
  catch { throw new Error(`Required original fixture is unavailable: ${relative}. Restore the exact locally authorized artifact; this check cannot be skipped.`); }
  expect(createHash('sha256').update(bytes).digest('hex'), `Original artifact mismatch: ${relative}`).toBe(fixture.sha256);
  return bytes.toString('utf8');
}
const quadratic = Array.from({ length: 1101 }, (_, i) => ({ wavelength: 3600 + i, intensity: ((3600 + i) / 1000) ** 2 }));
describe('galaxy preparation, bounded to the original in-range branch', () => {
  it('calibrates 600 channels from rounded bounds, starting at the actual Single minimum', () => {
    const grid = galaxyChannelGrid(3700, 4700);
    expect(grid.wavelengths).toHaveLength(600);
    expect(grid.step).toBe(5 / 3);
    expect(grid.wavelengths[0]).toBe(3700);
    expect(grid.wavelengths[599]).toBeCloseTo(4698 + 1 / 3, 10);
    const unaligned = galaxyChannelGrid(3720, 4680);
    expect(unaligned.wavelengths[0]).toBe(3720);
    expect(unaligned.wavelengths[599]).toBeCloseTo(4718 + 1 / 3, 10);
    // The original uses the configured minimum even when the last bin exceeds maximum.
    const single = galaxyChannelGrid(3700.0001, 4700);
    expect(single.wavelengths[0]).toBe(Math.fround(3700.0001));
    expect(Object.isFrozen(grid.wavelengths)).toBe(true);
  });
  it('preserves matched spectra at factor1 and matches an independent analytic quadratic', () => {
    const profile = prepareGalaxyProfile(quadratic, true, .2, 3700, 4700);
    expect(profile.wavelengthFactor).toBe(1);
    for (const i of [0, 1, 200, 599]) expect(profile.values[i]).toBeCloseTo((profile.wavelengths[i] / 1000) ** 2, 10);
    expect(profile.values[0]).toBeGreaterThan(1);
    expect(Object.isFrozen(profile.values)).toBe(true);
    expect(Object.isFrozen(profile)).toBe(true);
  });
  it('shifts only a fallback template by the original float32 catalog redshift', () => {
    const z = .0123456789, factor = 1 + Math.fround(z);
    const source = Array.from({ length: 1101 }, (_, i) => ({ wavelength: 3500 + i * 2, intensity: (3500 + i * 2) / 1000 }));
    const fallback = prepareGalaxyProfile(source, false, z, 3700, 4700);
    expect(fallback.wavelengthFactor).toBe(factor);
    for (const i of [0, 200, 599]) expect(fallback.values[i]).toBeCloseTo(fallback.wavelengths[i] / factor / 1000, 10);
  });
  it('matches hashed original SP files and exact Lagrange vectors including100 half-index channels per matched file', () => {
    for (const fixture of vectors.profiles) {
      const source = parseLibrarySpectrum(originalFixture(fixture));
      expect(source).toHaveLength(fixture.samples);
      const profile = prepareGalaxyProfile(source, fixture.matchedLibrary, fixture.catalogZ, fixture.gridMinimum, fixture.gridMaximum);
      for (const expected of fixture.vectors) {
        expect(profile.wavelengths[expected.bin]).toBeCloseTo(expected.wavelength, 9);
        expect(profile.values[expected.bin]).toBeCloseTo(expected.value, 10);
      }
    }
  });
  it('allows inclusive bounds and fails explicitly before randomized out-of-range continuation', () => {
    const source = [{ wavelength: 3700, intensity: 1 }, { wavelength: 3750, intensity: 2 }, { wavelength: 3800, intensity: 3 }];
    expect(prepareGalaxyProfile(source, true, 0, 3700, 3800).values[0]).toBe(1);
    expect(() => prepareGalaxyProfile(source, true, 0, 3699, 3700)).toThrowError(expect.objectContaining({ code: 'extension-required' }));
  });
  it('gates default Coma1 because its shifted fallback starts above the configured minimum', () => {
    const source = parseLibrarySpectrum(originalFixture(vectors.profiles.find(f => f.file === 'GLXYTMPL.SP')!));
    expect(() => prepareGalaxyProfile(source, false, .0239365566521883, 3700, 4700)).toThrowError(expect.objectContaining({ code: 'extension-required' }));
  });
  it('rejects nonfinite interpolation produced from finite extreme fluxes', () => {
    const source = [{ wavelength: 3700, intensity: 1e308 }, { wavelength: 3750, intensity: 1e-308 }, { wavelength: 3800, intensity: 1e308 }];
    const interpolate = () => prepareGalaxyProfile(source, true, 0, 3700, 3800);
    expect(interpolate).toThrow(GalaxySpectrumError);
    expect(interpolate).toThrowError(expect.objectContaining({ code: 'overflow' }));
    const shifted = () => prepareGalaxyProfile([{ wavelength: 1e308, intensity: 1 }, { wavelength: 1.1e308, intensity: 1 }, { wavelength: 1.2e308, intensity: 1 }], false, 1, 3700, 4700);
    expect(shifted).toThrow(GalaxySpectrumError);
    expect(shifted).toThrowError(expect.objectContaining({ code: 'overflow' }));
  });
  it('rejects sparse, irregular, nonfinite and negative-source inputs as declared adapter guards', () => {
    for (const samples of [new Array(3), [{ wavelength: 1, intensity: 1 }, { wavelength: 2, intensity: NaN }, { wavelength: 3, intensity: 1 }], [{ wavelength: 1, intensity: 1 }, { wavelength: 1.5, intensity: 1 }, { wavelength: 3, intensity: 1 }]]) {
      expect(() => prepareGalaxyProfile(samples, true, 0, 1, 2)).toThrow(GalaxySpectrumError);
    }
    for (const matched of [false, true]) for (const z of [-1, NaN, Infinity]) expect(() => prepareGalaxyProfile(quadratic, matched, z, 3700, 4700)).toThrowError(expect.objectContaining({ code: 'redshift' }));
    expect(() => prepareGalaxyProfile(quadratic.map(s => ({ ...s, intensity: -1 })), true, 0, 3700, 4700)).toThrowError(expect.objectContaining({ code: 'negative-source' }));
    for (const pair of [[0, 10], [10, 10], [10, Infinity], [1, 100_002]]) expect(() => galaxyChannelGrid(pair[0], pair[1])).toThrow(GalaxySpectrumError);
  });
});
