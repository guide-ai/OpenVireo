import { describe, expect, it } from 'vitest';
import { galaxySlitFraction, magnitudeAmplitude, photonAmplitudes, PhotonCalibrationError, slitPixelLevel, telescopeZeroPoint } from './photons';

describe('recovered slit and photon calibration (synthetic pixels, not observations)', () => {
  it('reads exactly the centered 3 by 19 pixels and sums channels before dividing by 57', () => {
    const width = 312, height = 312, rgb = new Uint8Array(width * height * 3);
    for (let x = 155; x <= 157; x++) for (let y = 147; y <= 165; y++) {
      const i = (y * width + x) * 3; rgb[i] = 40; rgb[i + 1] = 70; rgb[i + 2] = 90;
    }
    // Bright pixels immediately beyond every edge must not contaminate the slit.
    for (const [x, y] of [[154, 156], [158, 156], [156, 146], [156, 166]]) {
      const i = (y * width + x) * 3; rgb.fill(255, i, i + 3);
    }
    const before = rgb.slice();
    expect(slitPixelLevel({ width, height, rgb })).toBe(200);
    expect(rgb).toEqual(before);
  });
  it('uses declared nearest-even image centers and integer conversion at the output', () => {
    const rgb = new Uint8Array(25 * 25 * 3);
    // For 25/2=12.5, center 12 includes x=11; half-up center 13 would not.
    rgb[(12 * 25 + 11) * 3] = 255;
    expect(slitPixelLevel({ width: 25, height: 25, rgb })).toBe(4);
    expect(slitPixelLevel({ width: 25, height: 25, rgb: new Uint8Array(rgb.length).fill(255) })).toBe(765);
  });
  it('applies the recovered galaxy level threshold without normalizing by RGB channel count', () => {
    expect(galaxySlitFraction(0)).toBe(0);
    expect(galaxySlitFraction(100)).toBe(0.25);
    expect(galaxySlitFraction(199)).toBe(0.990025);
    expect(galaxySlitFraction(200)).toBe(1);
    expect(galaxySlitFraction(765)).toBe(1);
    for (const level of [-1, 0.5, 766, NaN]) expect(() => galaxySlitFraction(level)).toThrow(PhotonCalibrationError);
  });
  it('calibrates the recovered magnitude differences and keeps source and sky distinct', () => {
    expect(magnitudeAmplitude(16, 16)).toBe(1);
    expect(magnitudeAmplitude(18.5, 16)).toBe(0.1);
    expect(magnitudeAmplitude(13.5, 16)).toBe(10);
    expect(photonAmplitudes(13.5, 18.5, 16, 0.25)).toEqual({ source: 2.5, sky: 0.1 });
    expect(photonAmplitudes(null, 18.5, 16, 0)).toEqual({ source: 0, sky: 0.1 });
    expect(telescopeZeroPoint(6, -2)).toBe(4);
    expect(telescopeZeroPoint(6, 0)).toBe(6);
    expect(telescopeZeroPoint(6, 3)).toBe(9);
    expect(telescopeZeroPoint(16_777_216, 1)).toBe(16_777_216);
  });
  it('rejects truncated/slit-outside images and unrepresentable calibrations explicitly', () => {
    expect(() => slitPixelLevel({ width: 312, height: 312, rgb: new Uint8Array(1) })).toThrow(PhotonCalibrationError);
    expect(() => slitPixelLevel({ width: 3, height: 19, rgb: new Uint8Array(171) })).toThrow(PhotonCalibrationError);
    expect(() => slitPixelLevel({ width: 0.5, height: 312, rgb: new Uint8Array(0) })).toThrow(PhotonCalibrationError);
    for (const magnitude of [Infinity, NaN, -1e9, 1e9]) expect(() => magnitudeAmplitude(magnitude, 16)).toThrow(PhotonCalibrationError);
    expect(() => photonAmplitudes(16, 16, 16, 1.1)).toThrow(PhotonCalibrationError);
  });
});
