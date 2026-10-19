import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { uniformSpectrum } from './acquisition';
import { galaxyCatalogContinuumContext, prepareCatalogGalaxyExtension, prepareCatalogGalaxyChannels, prepareGalaxyContinuum, prepareGalaxyExtension, sampleGalaxyExtension, prepareExtendedGalaxyChannels, GalaxyContinuumError } from './galaxyContinuum';
import { parseLibrarySpectrum } from './spectrum';
import vectors from '../../data/hubble/galaxy-continuum-vectors.json';
import catalogFixtures from '../../data/hubble/galaxy-catalog-samples.json';

const source = uniformSpectrum(4000, 4500, [1, 2, 4]);
describe('recovered B_nu continuum and explicitly supplied galaxy extension', () => {
  it('maps signed morphology to the exact Single field and the independently calculated temperature', () => {
    for (const fixture of vectors.catalogContext) {
      const context = galaxyCatalogContinuumContext(fixture.morphology, fixture.catalogZ);
      expect(context.field27).toBe(fixture.field27);
      expect(context.redshift).toBe(fixture.catalogZ);
      expect(context.temperature).toBeCloseTo(fixture.temperature, 9);
      expect(Object.isFrozen(context)).toBe(true);
    }
    // Positive redshift cools this recovered continuum. Reversing FDIVRP
    // gives the opposite direction and fails these independent references.
    expect(galaxyCatalogContinuumContext(-3, .1).temperature).toBeLessThan(galaxyCatalogContinuumContext(-3, 0).temperature);
    for (const morphology of [-129, 1.5, 17, 18, 19, 21, 127, 128, NaN]) expect(() => galaxyCatalogContinuumContext(morphology, 0)).toThrowError(expect.objectContaining({ code: 'morphology' }));
    for (const z of [-1, 1, -2, 2, .99999999, NaN, Infinity]) expect(() => galaxyCatalogContinuumContext(-3, z)).toThrowError(expect.objectContaining({ code: 'redshift' }));
  });
  it('prepares original Coma1 default channels from the recovered catalog morphology and redshift', () => {
    const fixture = vectors.profiles[2];
    const catalog = catalogFixtures.samples.find(row => row.identifier === 'NGC 4874')!;
    expect(fixture.morphology).toBe(catalog.morphology); expect(fixture.catalogZ).toBe(catalog.redshift);
    const bytes = readFileSync(new URL('../../data/original/GLXYTMPL.SP', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(fixture.sha256);
    const samples = parseLibrarySpectrum(bytes.toString('utf8'));
    const shifted = uniformSpectrum(fixture.minimum, fixture.maximum, samples.map(s => s.intensity));
    const extension = prepareCatalogGalaxyExtension(shifted, fixture.morphology!, fixture.catalogZ!, 3700, 4700);
    expect(extension.temperature).toBeCloseTo(fixture.temperature, 9);
    expect(extension.blueProbe).toBeCloseTo(fixture.blueProbe, 8);
    expect(extension.redProbe).toBeCloseTo(fixture.redProbe, 8);
    expect(extension.blueCorrection).toBeCloseTo(fixture.blueCorrection, 10);
    expect(extension.redCorrection).toBeCloseTo(fixture.redCorrection, 10);
    const profile = prepareExtendedGalaxyChannels(extension, 3700, 4700, fixture.initialSeed);
    expect(profile.seed).toBe(fixture.seed); expect(profile.draws).toBe(23);
    for (let i = 0; i < 600; i++) expect(profile.values[i], `catalog Coma1 channel ${i}`).toBeCloseTo(fixture.values[i], 9);
  });
  it('composes selected catalog source preparation without changing matched wavelengths or inventing an exposure', () => {
    const fixture = vectors.profiles[2];
    const bytes = readFileSync(new URL('../../data/original/GLXYTMPL.SP', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(fixture.sha256);
    const samples = parseLibrarySpectrum(bytes.toString('utf8'));
    const result = prepareCatalogGalaxyChannels(samples, false, -3, fixture.catalogZ!, 3700, 4700, fixture.initialSeed);
    expect(result.wavelengthFactor).toBe(1 + Math.fround(fixture.catalogZ!));
    expect(result.temperature).toBeCloseTo(fixture.temperature, 9);
    expect(result.seed).toBe(fixture.seed); expect(result.draws).toBe(23);
    for (let i = 0; i < 600; i++) expect(result.values[i]).toBeCloseTo(fixture.values[i], 9);
    const matched = prepareCatalogGalaxyChannels(samples, true, -3, fixture.catalogZ!, 3700, 4700, 123);
    expect(matched.wavelengthFactor).toBe(1); expect(matched.seed).toBe(123); expect(matched.draws).toBe(0);
    expect(Object.isFrozen(result)).toBe(true);
  });
  it('normalizes composed-source domain errors to one public error class', () => {
    const samples=[{wavelength:3700,intensity:1},{wavelength:4200,intensity:1},{wavelength:4700,intensity:1}];
    for (const z of [-1,1,NaN]) {
      const run=()=>prepareCatalogGalaxyChannels(samples,false,-3,z,3700,4700,1);
      expect(run).toThrow(GalaxyContinuumError);expect(run).toThrowError(expect.objectContaining({code:'redshift'}));
    }
    const invalid=()=>prepareCatalogGalaxyChannels(samples.slice(0,2),false,-3,0,3700,4700,1);
    expect(invalid).toThrow(GalaxyContinuumError);expect(invalid).toThrowError(expect.objectContaining({code:'range'}));
  });
  it('matches independent high precision Planck vectors, including shape and 601-point normalization', () => {
    for (const fixture of vectors.continuum) {
      const continuum = prepareGalaxyContinuum(fixture.temperature, 3700, 4700);
      expect(continuum.intensities).toHaveLength(601);
      expect(Math.max(...continuum.intensities)).toBe(1);
      expect(continuum.intensities.indexOf(1)).toBe(fixture.peakIndex);
      for (const sample of fixture.samples) expect(continuum.intensities[sample.index]).toBeCloseTo(sample.value, 11);
      expect(Object.isFrozen(continuum.intensities)).toBe(true);
    }
  });
  it('matches 600 independent Fraction/Decimal/integer-LCG channels with both continuations', () => {
    const fixture = vectors.profiles[0], extension = prepareGalaxyExtension(source, fixture.temperature, 3700, 4700);
    expect(extension.blueProbe).toBeCloseTo(fixture.blueProbe, 8);
    expect(extension.redProbe).toBeCloseTo(fixture.redProbe, 8);
    expect(extension.blueCorrection).toBeCloseTo(fixture.blueCorrection, 11);
    expect(extension.redCorrection).toBeCloseTo(fixture.redCorrection, 11);
    const profile = prepareExtendedGalaxyChannels(extension, 3700, 4700, fixture.initialSeed);
    expect(profile.values).toHaveLength(600);
    for (let i = 0; i < 600; i++) expect(profile.values[i], `channel ${i}`).toBeCloseTo(fixture.values[i], 10);
    expect(profile.seed).toBe(fixture.seed);
    expect(profile.draws).toBe(299);
    expect(profile.draws).toBe(fixture.draws);
    expect(Object.isFrozen(profile.values)).toBe(true);
    expect(Object.isFrozen(profile)).toBe(true);
  });
  it('can extend the hashed Coma1 fallback at the default range with a clearly synthetic supplied temperature', () => {
    const fixture = vectors.profiles[1];
    const bytes = readFileSync(new URL('../../data/original/GLXYTMPL.SP', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(fixture.sha256);
    const samples = parseLibrarySpectrum(bytes.toString('utf8'));
    expect(samples).toHaveLength(fixture.samples!);
    const shifted = uniformSpectrum(fixture.minimum, fixture.maximum, samples.map(s => s.intensity));
    const extension = prepareGalaxyExtension(shifted, fixture.temperature, 3700, 4700);
    expect(extension.blueProbe).toBeCloseTo(fixture.blueProbe, 8);
    expect(extension.redProbe).toBeCloseTo(fixture.redProbe, 8);
    expect(extension.blueCorrection).toBeCloseTo(fixture.blueCorrection, 10);
    expect(extension.redCorrection).toBeCloseTo(fixture.redCorrection, 10);
    const profile = prepareExtendedGalaxyChannels(extension, 3700, 4700, fixture.initialSeed);
    expect(profile.seed).toBe(fixture.seed);
    expect(profile.draws).toBe(fixture.draws);
    for (let i = 0; i < 600; i++) expect(profile.values[i], `Coma1 test channel ${i}`).toBeCloseTo(fixture.values[i], 9);
  });
  it('keeps inclusive SP endpoints and interior RNG-free; blue and red consume one draw in order', () => {
    const extension = prepareGalaxyExtension(source, 6000, 3700, 4700);
    for (const wavelength of [4000, 4250, 4500]) {
      const value = sampleGalaxyExtension(extension, wavelength, 0);
      expect(value.seed).toBe(0); expect(value.draws).toBe(0);
      expect(value.value).toBe(wavelength === 4000 ? 1 : wavelength === 4250 ? 2 : 4);
    }
    const blue = sampleGalaxyExtension(extension, 3900, 0);
    expect(blue.seed).toBe(1); expect(blue.draws).toBe(1);
    const red = sampleGalaxyExtension(extension, 4600, blue.seed);
    expect(red.seed).toBe(0x08088406); expect(red.draws).toBe(1);
    expect(Object.isFrozen(extension)).toBe(true);
  });
  it('normalizes the supplied Single interval and reports unsupported domains and endpoint overlap', () => {
    expect(prepareGalaxyContinuum(6000, 3700.0001, 4700).minimum).toBe(Math.fround(3700.0001));
    for (const t of [0, -1, NaN, Infinity, 1e19, 1e300, Number.MIN_VALUE]) expect(() => prepareGalaxyContinuum(t, 3700, 4700)).toThrowError(expect.objectContaining({ code: 'temperature' }));
    for (const [min, max] of [[0, 4700], [4700, 3700], [1, 100002], [NaN, 4700]]) expect(() => prepareGalaxyContinuum(6000, min, max)).toThrowError(expect.objectContaining({ code: 'range' }));
    expect(() => prepareGalaxyContinuum(1e-300, 3700, 4700)).toThrowError(expect.objectContaining({ code: 'normalization' }));
    expect(() => prepareGalaxyContinuum(6000, 1e9, 1e9+10000)).toThrowError(expect.objectContaining({ code: 'precision' }));
    expect(() => prepareGalaxyExtension(uniformSpectrum(4800, 4900, [1, 2, 3]), 6000, 3700, 4700)).toThrowError(expect.objectContaining({ code: 'alignment' }));
    expect(() => prepareGalaxyExtension(uniformSpectrum(3690, 3695, [1, 2, 3]), 6000, 3700, 4700)).toThrowError(expect.objectContaining({ code: 'alignment' }));
  });
  it('distinguishes negative continuum interpolation from negative source and pins the declared probe budget', () => {
    const steep = uniformSpectrum(140, 1000, [1,1,1]);
    expect(() => prepareGalaxyExtension(steep, 6000, 100, 100000)).toThrowError(expect.objectContaining({ code: 'continuum-negative' }));
    // The original finite search would take about19530 red steps; this adapter
    // explicitly rejects beyond10000 even if all requested channels are in-SP.
    expect(() => prepareGalaxyExtension(uniformSpectrum(3000,200000,[1,1,1]),6000,3700,4700)).toThrowError(expect.objectContaining({code:'alignment'}));
    const same = prepareGalaxyExtension(source,6000,3720,4680);
    expect(() => prepareExtendedGalaxyChannels(same,3720,4680,123)).toThrowError(expect.objectContaining({code:'extension-range'}));
  });
  it('rejects invalid range, seed, negative flux and failed profiles without mutating preparation', () => {
    const extension = prepareGalaxyExtension(source, 6000, 3700, 4700);
    const before = JSON.stringify(extension);
    for (const seed of [-1, 1.5, NaN, 2 ** 32]) {
      expect(() => sampleGalaxyExtension(extension, 4250, seed)).toThrowError(expect.objectContaining({ code: 'seed' }));
    }
    expect(() => sampleGalaxyExtension(extension, NaN, 0)).toThrowError(expect.objectContaining({ code: 'range' }));
    expect(() => sampleGalaxyExtension(extension, 3699, 0)).toThrowError(expect.objectContaining({ code: 'extension-range' }));
    // A different channel interval is not the original shared configuration.
    // Rejection must not expose a partial profile or seed.
    expect(() => prepareExtendedGalaxyChannels(extension, 3720, 4680, 123)).toThrowError(expect.objectContaining({ code: 'range' }));
    expect(JSON.stringify(extension)).toBe(before);
    const negative = uniformSpectrum(4000, 4500, [-1, -1, -1]);
    expect(() => prepareGalaxyExtension(negative, 6000, 3700, 4700)).toThrowError(expect.objectContaining({ code: 'negative-source' }));
  });
});
