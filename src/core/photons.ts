import { roundNearestEven } from './numericPolicy';
/** Static contracts: docs/HUBBLE-RECOVERY.md; inputs are explicitly supplied.
 * These functions do not turn a reference PNG into a detector image. */
export class PhotonCalibrationError extends Error {
  constructor(readonly code: 'image' | 'level' | 'magnitude' | 'throughput' | 'overflow') {
    super(`Photon calibration contract: ${code}`);
    this.name = 'PhotonCalibrationError';
  }
}

export type RgbImage = Readonly<{ width: number; height: number; rgb: Uint8Array | Uint8ClampedArray }>;
/** 0x53e338: x=Round(width/2)-1..+1, y=Round(height/2)-9..+9;
 * sum R+G+B at all 57 pixels, divide by 57, then integer conversion.
 * Explicit nearest-even is an adapter policy, not a verified x87 control word.
 */
export function slitPixelLevel(image: RgbImage): number {
  const { width, height, rgb } = image;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 3 || height < 19 ||
      width * height > 4_000_000 || rgb.length !== width * height * 3) throw new PhotonCalibrationError('image');
  const centerX = roundNearestEven(width / 2), centerY = roundNearestEven(height / 2);
  // Original out-of-bounds GetPixel semantics are not ported; require a full slit.
  if (centerX - 1 < 0 || centerX + 1 >= width || centerY - 9 < 0 || centerY + 9 >= height) throw new PhotonCalibrationError('image');
  let sum = 0;
  for (let x = centerX - 1; x <= centerX + 1; x++) {
    for (let y = centerY - 9; y <= centerY + 9; y++) {
      const offset = (y * width + x) * 3;
      sum += rgb[offset] + rgb[offset + 1] + rgb[offset + 2];
    }
  }
  return roundNearestEven(sum / 57);
}
/** 0x50f42c–0x50f45a. Level is the rounded sum of channels per pixel, 0..765. */
export function galaxySlitFraction(level: number): number {
  if (!Number.isInteger(level) || level < 0 || level > 765) throw new PhotonCalibrationError('level');
  return level >= 200 ? 1 : (level / 200) ** 2;
}
/** 0x50df64: original power base 10, magnitude difference / -2.5.
 * No default magnitude, telescope, zero point or count/time unit is inferred.
 */
export function magnitudeAmplitude(magnitude: number, zeroPoint: number): number {
  if (!Number.isFinite(magnitude) || !Number.isFinite(zeroPoint)) throw new PhotonCalibrationError('magnitude');
  const result = 10 ** ((magnitude - zeroPoint) / -2.5);
  if (!Number.isFinite(result) || result <= 0) throw new PhotonCalibrationError('overflow');
  return result;
}
export type PhotonAmplitudes = Readonly<{ source: number; sky: number }>;
/** 0x53df4f–0x53df5e: two Single inputs, add in x87, store Single. */
export function telescopeZeroPoint(base: number, correction: number): number {
  if (!Number.isFinite(base) || !Number.isFinite(correction)) throw new PhotonCalibrationError('magnitude');
  const result = Math.fround(Math.fround(base) + Math.fround(correction));
  if (!Number.isFinite(result)) throw new PhotonCalibrationError('overflow');
  return result;
}
/** Caller supplies already prepared source magnitude (including any galaxy
 * correction), recovered sky magnitude/zero point and slit fraction.
 * These are amplitudes before elapsed multiplier and spectral sampling. */
export function photonAmplitudes(sourceMagnitude: number | null, skyMagnitude: number, zeroPoint: number, slitFraction: number): PhotonAmplitudes {
  if (!Number.isFinite(slitFraction) || slitFraction < 0 || slitFraction > 1) throw new PhotonCalibrationError('throughput');
  const sky = magnitudeAmplitude(skyMagnitude, zeroPoint);
  const source = sourceMagnitude === null ? 0 : magnitudeAmplitude(sourceMagnitude, zeroPoint) * slitFraction;
  if (sourceMagnitude !== null && slitFraction > 0 && source === 0) throw new PhotonCalibrationError('overflow');
  return { source, sky };
}
