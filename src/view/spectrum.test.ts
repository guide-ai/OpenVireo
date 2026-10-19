import { describe, expect, it } from 'vitest';
import { formatFloat32, formatZ, spectrumPoints } from './spectrum';

describe('spectral presentation', () => {
  it('preserves a narrow absorption feature between old stride positions', () => {
    const samples = Array.from({ length: 3600 }, (_, i) => ({ wavelength: 3700 + i * .25, intensity: i === 1 ? .1 : .9 }));
    const points = spectrumPoints(samples, 3700, 4700).split(' ').map(point => point.split(',').map(Number));
    expect(Math.max(...points.map(point => point[1]))).toBe(281);
  });
  it('shows a nonzero tiny adjustment and preserves signed zero', () => {
    expect(formatZ(1e-50)).toBe('+1.00000000e-50');
    expect(formatZ(-1e-9)).toBe('−1.00000000e-9');
    expect(formatFloat32(-0)).toBe('−0.00000000');
  });
  it('round-trips stored float32 values in the displayed precision', () => {
    const bits = new DataView(new ArrayBuffer(4));
    for (const pattern of [0x3e000001, 0x38d1b718, 0x00800001, 0x7f7fffff]) {
      bits.setUint32(0, pattern, false);
      const value = bits.getFloat32(0, false);
      expect(Math.fround(Number(formatFloat32(value)))).toBe(value);
    }
  });
});
