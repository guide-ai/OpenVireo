import { AcquisitionError, sampleUniformSpectrum, uniformSpectrum } from './acquisition';
import type { Sample } from './spectrum';
import { EXPOSURE_BINS } from './exposure';

export class GalaxySpectrumError extends Error {
  constructor(readonly code: 'grid' | 'range' | 'redshift' | 'extension-required' | 'negative-source' | 'overflow') {
    super(`Galaxy source contract: ${code}`); this.name = 'GalaxySpectrumError';
  }
}
export type GalaxyProfile = Readonly<{ wavelengths: readonly number[]; values: readonly number[]; step: number; wavelengthFactor: number }>;
/** 0x50ec98 calibrates step from a range rounded outward to 100-Angstrom
 * boundaries. Go (0x50f484) starts samples at the actual configured minimum.
 * Config values are Single; all following arithmetic is a Number adapter. */
export function galaxyChannelGrid(minimum: number, maximum: number): Readonly<{ wavelengths: readonly number[]; step: number }> {
  const min = Math.fround(minimum), max = Math.fround(maximum);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= min || max - min > 100_000) throw new GalaxySpectrumError('range');
  const roundedMin = Math.trunc(min / 100) * 100;
  const roundedMax = Math.ceil(max / 100) * 100;
  const step = (roundedMax - roundedMin) / EXPOSURE_BINS;
  const wavelengths = Array.from({ length: EXPOSURE_BINS }, (_, i) => min + i * step);
  return { wavelengths: Object.freeze(wavelengths), step };
}
/** 0x55e55c: matched SP wavelengths are already shifted (factor 1).
 * Only fallback GLXYTMPL.SP multiplies its wavelengths by 1+catalog Single z.
 * 0x55e97c uses the ordinary sampler inside the SP's inclusive bounds; its
 * prepareGalaxyProfile keeps a bounded in-SP API. The separate
 * prepareCatalogGalaxyChannels API composes the recovered continuation.
 */
/** Shared selected-library/fallback grid preparation. It does not match an
 * object or supply temperature, magnitude, image throughput or session state. */
export function galaxyLibrarySpectrum(samples: readonly Sample[], matchedLibrary: boolean, catalogZ: number): Readonly<{ source: ReturnType<typeof uniformSpectrum>; wavelengthFactor: number }> {
  if (samples.length < 3 || samples.length > 50_000) throw new GalaxySpectrumError('grid');
  const dense = [...samples];
  if (dense.some(value => !value || !Number.isFinite(value.wavelength) || !Number.isFinite(value.intensity))) throw new GalaxySpectrumError('grid');
  const first = dense[0].wavelength, last = dense[dense.length - 1].wavelength;
  const sampleStep = (last - first) / (dense.length - 1);
  if (first <= 0 || sampleStep <= 0 || !Number.isFinite(sampleStep) || dense.some((sample, i) => Math.abs(sample.wavelength - (first + i * sampleStep)) > sampleStep * 1e-7)) throw new GalaxySpectrumError('grid');
  const z = Math.fround(catalogZ);
  if (!Number.isFinite(z) || z <= -1) throw new GalaxySpectrumError('redshift');
  const factor = matchedLibrary ? 1 : 1 + z;
  const shiftedFirst = first * factor, shiftedLast = last * factor;
  if (!Number.isFinite(shiftedFirst) || !Number.isFinite(shiftedLast)) throw new GalaxySpectrumError('overflow');
  try {
    return Object.freeze({ source: uniformSpectrum(shiftedFirst, shiftedLast, dense.map(sample => sample.intensity)), wavelengthFactor: factor });
  } catch (error) {
    if (error instanceof AcquisitionError) throw new GalaxySpectrumError(error.code === 'overflow' ? 'overflow' : 'grid');
    throw error;
  }
}

export function prepareGalaxyProfile(samples: readonly Sample[], matchedLibrary: boolean, catalogZ: number, minimum: number, maximum: number): GalaxyProfile {
  const { source, wavelengthFactor } = galaxyLibrarySpectrum(samples, matchedLibrary, catalogZ);
  try {
    const grid = galaxyChannelGrid(minimum, maximum);
    const values = grid.wavelengths.map(wavelength => {
      const sample = sampleUniformSpectrum(source, wavelength);
      if (!sample.valid) throw new GalaxySpectrumError('extension-required');
      if (sample.value < 0) throw new GalaxySpectrumError('negative-source');
      return sample.value;
    });
    return Object.freeze({ ...grid, values: Object.freeze(values), wavelengthFactor });
  } catch (error) {
    // The lower-level sampler owns the finite-result check. Normalize its
    // typed failures at this public galaxy-preparation boundary.
    if (error instanceof AcquisitionError) throw new GalaxySpectrumError(error.code === 'overflow' ? 'overflow' : 'grid');
    throw error;
  }
}
