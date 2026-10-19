import { AcquisitionError, randomDraw, sampleUniformSpectrum, uniformSpectrum } from './acquisition';
import type { UniformSpectrum } from './acquisition';
import type { Sample } from './spectrum';
import { GalaxySpectrumError, galaxyChannelGrid, galaxyLibrarySpectrum } from './galaxySpectrum';

export class GalaxyContinuumError extends Error {
  constructor(readonly code: 'temperature' | 'morphology' | 'redshift' | 'range' | 'continuum-negative' | 'precision' | 'normalization' | 'alignment' | 'extension-range' | 'seed' | 'overflow' | 'negative-source') {
    super(`Galaxy continuation contract: ${code}`); this.name = 'GalaxyContinuumError';
  }
}
const C = 29979245800, TWO_H = 1.3252151e-26, H = 6.6260755e-27, K = 1.380658e-16;
const ANGSTROM_CM = 1e-8;
const extensionBrand: unique symbol = Symbol('galaxy-extension');
export type GalaxyExtension = Readonly<{
  [extensionBrand]: true; source: UniformSpectrum; continuum: UniformSpectrum;
  temperature: number; blueCorrection: number; redCorrection: number; blueProbe: number; redProbe: number;
}>;

/** Catalog reader 0x598f35–0x599068 assigns Single field+0x27 from
 * signed morphology byte+0x22. Temperature constructor 0x55e780–0x55e7bc (FSTP Extended at0x55e7ba)
 * uses that field and Single z. No physical color interpretation is needed.
 * FDIVRP at0x55e7b8 gives base*(1-z)/sqrt(1-z*z), not its inverse factor.
 * Unassigned morphology branches and invalid square roots are explicit errors.
 */
export function galaxyCatalogContinuumContext(morphology: number, catalogZ: number): Readonly<{ field27: number; redshift: number; temperature: number }> {
  if (!Number.isInteger(morphology) || morphology < -128 || morphology > 127) throw new GalaxyContinuumError('morphology');
  let field27: number;
  if (morphology === -9) field27 = -0.35;
  else if (morphology <= 0) field27 = 0.92;
  else if (morphology <= 2) field27 = 0.82;
  else if (morphology === 3) field27 = 0.81;
  else if (morphology === 4) field27 = 0.63;
  else if (morphology <= 9) field27 = 0.52;
  else if (morphology <= 16) field27 = 0.5;
  else if (morphology === 20) field27 = 0.7;
  else throw new GalaxyContinuumError('morphology');
  field27 = Math.fround(field27);
  const redshift = Math.fround(catalogZ);
  if (!Number.isFinite(redshift) || redshift <= -1 || redshift >= 1) throw new GalaxyContinuumError('redshift');
  const base = 8540 / (0.865 + field27);
  const temperature = ((1 - redshift) * base) / Math.sqrt(1 - redshift * redshift);
  if (!Number.isFinite(temperature) || temperature <= 0 || temperature > 1e8) throw new GalaxyContinuumError('temperature');
  return Object.freeze({ field27, redshift, temperature });
}

/** Caller supplies its already selected/shifted SP; no object matcher or
 * image throughput is implied by this catalog-temperature preparation. */
export function prepareCatalogGalaxyExtension(source: UniformSpectrum, morphology: number, catalogZ: number, minimum: number, maximum: number): GalaxyExtension {
  return prepareGalaxyExtension(source, galaxyCatalogContinuumContext(morphology, catalogZ).temperature, minimum, maximum);
}

/** 0x55de04, 0x55de58, 0x55de7c, 0x55def4, 0x55e154.
 * The original builds 601 B_nu samples (lastIndex=600), repeatedly adding its
 * centimetre step, then divides by the greatest sample. This is NOT B_lambda.
 * Temperature is explicit here; the catalog adapter above supplies a separately recovered path.
 * Constants are binary64 projections of the recovered Extended literals;
 * Math.exp(x)-1 and Number arithmetic are a declared adapter, not an x87 oracle.
 */
export function prepareGalaxyContinuum(temperature: number, minimum: number, maximum: number): UniformSpectrum {
  if (!Number.isFinite(temperature) || temperature <= 0 || temperature > 1e8) throw new GalaxyContinuumError('temperature');
  const min = Math.fround(minimum), max = Math.fround(maximum);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= min || max - min > 100_000) throw new GalaxyContinuumError('range');
  const coefficient = TWO_H / (C * C), thermal = K * temperature;
  if (!Number.isFinite(thermal) || thermal <= 0) throw new GalaxyContinuumError('temperature');
  // The1e8K adapter ceiling bounds exp(x)-1 cancellation on the supported
  // optical intervals; it is not a recovered physical temperature cutoff.
  const stepCm = ((max - min) / 600) * ANGSTROM_CM;
  let lambdaCm = min * ANGSTROM_CM, greatest = 0;
  const values: number[] = [];
  for (let i = 0; i <= 600; i++) {
    if (i > 0) lambdaCm += stepCm;
    const frequency = C / lambdaCm;
    const numerator = ((coefficient * frequency) * frequency) * frequency;
    const exponent = (H * frequency) / thermal;
    if (exponent < 1e-4) throw new GalaxyContinuumError('precision');
    const denominator = Math.exp(exponent) - 1;
    //0x55e202 loads Extended1e-8;0x55e208 FDIVP divides the Planck
    // result before each sample store (repeated at0x55e268/0x55e26e).
    const value = (numerator / denominator) / ANGSTROM_CM;
    if (!Number.isFinite(value) || value < 0) throw new GalaxyContinuumError('overflow');
    values.push(value); greatest = Math.max(greatest, value);
  }
  // An all-zero Number continuum cannot provide the constructor's nonzero
  // endpoint denominator. Report the adapter limit instead of looping forever.
  if (greatest <= 0) throw new GalaxyContinuumError('normalization');
  return uniformSpectrum(min, max, values.map(value => value / greatest));
}

/** 0x55e826–0x55e8f3: search inward in 10-Angstrom steps for nonzero
 * continuum, then divide the main SP sample by it. Admitted probes must also
 * lie inside the SP, so this path consumes no RNG. The 10,000-probe budget and
 * overlap guard replace unsupported original recursive/unbounded branches.
 */
export function prepareGalaxyExtension(source: UniformSpectrum, temperature: number, minimum: number, maximum: number): GalaxyExtension {
  const continuum = prepareGalaxyContinuum(temperature, minimum, maximum);
  function correction(blue: boolean): Readonly<{ wavelength: number; value: number }> {
    let wavelength = blue ? source.minimum : source.maximum;
    for (let probe = 0; probe < 10_000; probe++) {
      wavelength += blue ? 10 : -10;
      if (!Number.isFinite(wavelength)) throw new GalaxyContinuumError('overflow');
      const denominator = sampleUniformSpectrum(continuum, wavelength);
      if (!denominator.valid || denominator.value === 0) continue;
      if (denominator.value < 0) throw new GalaxyContinuumError('continuum-negative');
      const numerator = sampleUniformSpectrum(source, wavelength);
      if (!numerator.valid) throw new GalaxyContinuumError('alignment');
      const result = numerator.value / denominator.value;
      if (!Number.isFinite(result)) throw new GalaxyContinuumError('overflow');
      if (result < 0) throw new GalaxyContinuumError('negative-source');
      return { wavelength, value: result };
    }
    throw new GalaxyContinuumError('alignment');
  }
  try {
    const blue = correction(true), red = correction(false);
    return Object.freeze({ [extensionBrand]: true as const, source, continuum, temperature, blueCorrection: blue.value, redCorrection: red.value, blueProbe: blue.wavelength, redProbe: red.wavelength });
  } catch (error) { return normalizeError(error); }
}

function normalizeError(error: unknown): never {
  if (error instanceof GalaxySpectrumError) throw new GalaxyContinuumError(error.code === 'redshift' ? 'redshift' : error.code === 'grid' || error.code === 'range' ? 'range' : error.code === 'negative-source' ? 'negative-source' : error.code === 'extension-required' ? 'extension-range' : 'overflow');
  if (error instanceof AcquisitionError) throw new GalaxyContinuumError(error.code === 'seed' ? 'seed' : error.code === 'grid' || error.code === 'wavelength' ? 'range' : 'overflow');
  throw error;
}
export type GalaxyContinuationValue = Readonly<{ value: number; seed: number; draws: number }>;
/** 0x55e97c–0x55ea62. Inclusive in-SP samples consume no RNG. Each outside
 * sample consumes exactly one uniform, preserving multiply/add order:
 * blue=(U*0.16*C + 0.92*C)*correction; red=(U*0.08*C + 0.96*C)*correction.
 * No stochastic draw occurs during supported endpoint preparation.
 */
export function sampleGalaxyExtension(extension: GalaxyExtension, wavelength: number, seed: number): GalaxyContinuationValue {
  try {
    randomDraw(seed); // Validate explicit state even on the zero-draw path.
    if (!Number.isFinite(wavelength)) throw new GalaxyContinuumError('range');
    const inside = wavelength >= extension.source.minimum && wavelength <= extension.source.maximum;
    let value: number, nextSeed = seed, draws = 0;
    if (inside) value = sampleUniformSpectrum(extension.source, wavelength).value;
    else {
      const continuum = sampleUniformSpectrum(extension.continuum, wavelength);
      // The original can return an invalid/zero auxiliary sample and still draw.
      // This adapter rejects that unsupported range without returning RNG state.
      if (!continuum.valid) throw new GalaxyContinuumError('extension-range');
      if (continuum.value < 0) throw new GalaxyContinuumError('continuum-negative');
      const blue = wavelength < extension.source.minimum, draw = randomDraw(seed);
      nextSeed = draw.seed; draws = 1;
      value = ((draw.value * (blue ? 0.16 : 0.08)) * continuum.value + (blue ? 0.92 : 0.96) * continuum.value) * (blue ? extension.blueCorrection : extension.redCorrection);
    }
    if (!Number.isFinite(value)) throw new GalaxyContinuumError('overflow');
    if (value < 0) throw new GalaxyContinuumError('negative-source');
    return Object.freeze({ value, seed: nextSeed, draws });
  } catch (error) { return normalizeError(error); }
}

/** Caller supplies the already matched/shifted SP, temperature, continuum
 * bounds and seed. This is source preparation, not photon/exposure calibration.
 * Failure returns no partial profile or seed. The existing bounded preparer
 * remains gated when this additional source context is unavailable.
 */
export function prepareExtendedGalaxyChannels(extension: GalaxyExtension, minimum: number, maximum: number, seed: number): Readonly<{ wavelengths: readonly number[]; values: readonly number[]; step: number; seed: number; draws: number }> {
  try {
    randomDraw(seed);
    if (Math.fround(minimum) !== extension.continuum.minimum || Math.fround(maximum) !== extension.continuum.maximum) throw new GalaxyContinuumError('range');
    const grid = galaxyChannelGrid(minimum, maximum), values: number[] = [];
    let nextSeed = seed, draws = 0;
    for (const wavelength of grid.wavelengths) {
      const sample = sampleGalaxyExtension(extension, wavelength, nextSeed);
      values.push(sample.value); nextSeed = sample.seed; draws += sample.draws;
    }
    return Object.freeze({ ...grid, values: Object.freeze(values), seed: nextSeed, draws });
  } catch (error) { return normalizeError(error); }
}

/** Selected-object source-shape preparation only. The caller explicitly selects
 * matched versus fallback input and supplies original morphology/z. This
 * composes recovered contracts without assuming a detector frame or amplitude.
 * Returned intensities are library/source-shape values, not photon counts.
 */
export function prepareCatalogGalaxyChannels(samples: readonly Sample[], matchedLibrary: boolean, morphology: number, catalogZ: number, minimum: number, maximum: number, seed: number) {
  try {
    const { source, wavelengthFactor } = galaxyLibrarySpectrum(samples, matchedLibrary, catalogZ);
    const extension = prepareCatalogGalaxyExtension(source, morphology, catalogZ, minimum, maximum);
    return Object.freeze({ ...prepareExtendedGalaxyChannels(extension, minimum, maximum, seed), wavelengthFactor, temperature: extension.temperature });
  } catch (error) { return normalizeError(error); }
}
