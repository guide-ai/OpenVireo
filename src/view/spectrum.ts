import {scientific} from '../i18n';
import type { Sample } from '../core/spectrum';

/** New SVG presentation adapter. Keep every visible input sample: uniform
 * subsampling can erase the narrow features used for measuring redshift. */
export function spectrumPoints(samples: readonly Sample[], min: number, max: number, range: Readonly<{min:number; max:number}> = {min:0,max:1}): string {
  return samples.filter(p => p.wavelength >= min && p.wavelength <= max)
    .map(p => `${60 + (p.wavelength - min) / (max - min) * 860},${306 - (p.intensity - range.min) / (range.max - range.min || 1) * 250}`)
    .join(' ');
}

/** New display policy, not VIREO's recovered FloatToStr formatting. */
export function formatZ(z: number): string {
  if (z === 0) return Object.is(z, -0) ? '−0.000000' : '+0.000000';
  const value = Math.abs(z);
  const digits = value < 1e-4 || value >= 1e4 ? value.toExponential(8) : scientific(value,9);
  return (z < 0 ? '−' : '+') + digits;
}

/** Nine significant decimal digits distinguish binary32 values. Keep −0 visible. */
export function formatFloat32(value: number): string {
  return Object.is(value, -0) ? '−0.00000000' : scientific(value,9);
}
