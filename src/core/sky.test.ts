import { describe, expect, it } from 'vitest';
import { decodeGsc, FIELDS, hourDifference, pan, project, requiredTiles, requiredSkyTiles, targetCentered, validatePointing } from './sky';

describe('recovered sky coordinate contracts', () => {
  it('uses object declination, east left and north up with original field sizes', () => {
    const center = { ra: 10, dec: 60 };
    expect(FIELDS).toEqual({ finder: 2.5, telescope: .25 });
    expect(project(center, center, 2.5)).toEqual({ x: 350, y: 350, visible: true });
    expect(project({ ra: 10.1, dec: 60 }, center, 2.5).x).toBeCloseTo(140, 8);
    expect(project({ ra: 10, dec: 60.5 }, center, 2.5).y).toBe(210);
    expect(project({ ra: 10.1, dec: 61 }, center, 2.5).x).toBeCloseTo(350 - .1 * Math.cos(61 * Math.PI / 180) * 4200, 8);
  });
  it('wraps RA through zero and preserves original +/-12h tie behavior', () => {
    expect(hourDifference(.01, 23.99)).toBeCloseTo(.02);
    expect(hourDifference(23.99, .01)).toBeCloseTo(-.02);
    expect(hourDifference(0, 12)).toBe(-12);
    expect(hourDifference(12, 0)).toBe(12);
    expect(project({ ra: 23.99, dec: 0 }, { ra: .01, dec: 0 }, 2.5).visible).toBe(true);
  });
  it('loads necessary tiles at RA wrap and polar fields, and clips the field', () => {
    expect(requiredTiles({ ra: .01, dec: 0 }, 2.5)).toEqual([0, 23]);
    expect(requiredTiles({ ra: 10, dec: 89.9 }, 2.5)).toHaveLength(24);
    expect(project({ ra: 9, dec: 0 }, { ra: 10, dec: 0 }, 2.5).visible).toBe(false);
    expect(project({ ra: 10, dec: 1.25 }, { ra: 10, dec: 0 }, 2.5).visible).toBe(true);
  });
  it('reflects browsing across poles and validates direct coordinates', () => {
    expect(pan({ ra: 23, dec: 89.9 }, 'north', 2.5)).toEqual({ ra: 11, dec: 89.475 });
    expect(() => validatePointing(24, 0)).toThrow();
    expect(() => validatePointing(1, 90.1)).toThrow();
    expect(() => validatePointing(NaN, 0)).toThrow();
  });
  it('decodes original GSC bytes without spurious intermediate single rounding', () => {
    // Original N2230.DAT record 6, byte offset 162, decoded independently
    // with Python struct. FILD/FDIV/FSTP double at 0x59b055–0x59b071.
    const [star] = decodeGsc([[1463, 2269658, 11775]]);
    expect(star.ra).toBe(0.0001463);
    expect(star.dec).toBe(22.69658);
    expect(star.magnitude).toBe(11.774999618530273);
    const [rounding] = decodeGsc([[129930917, 2796000, 11300]]);
    expect(rounding.ra).toBe(12.9930917);
    expect(rounding.ra).not.toBe(Math.fround(Math.fround(129930917) / 10000000));
    expect(() => decodeGsc([[1, 9000001, 1000]])).toThrow();
  });
  it('loads RA x declination tiles at wrap and poles without other declinations',()=>{
    expect(requiredSkyTiles({ra:.01,dec:0},2.5)).toEqual(['00/17','00/18','23/17','23/18']);
    const polar=requiredSkyTiles({ra:10,dec:89.9},2.5);
    expect(polar).toHaveLength(24);expect(polar.every(key=>key.endsWith('/35'))).toBe(true);
    expect(requiredSkyTiles({ra:10,dec:-89.9},2.5).every(key=>key.endsWith('/00'))).toBe(true);
  });
  it('keeps display-rounding-sized offsets centered but rejects a quarter-field pan',()=>{
    const target={ra:9.926666667,dec:69.06666667};
    expect(targetCentered(target,{ra:9.92667,dec:69.06667},.25)).toBe(true);
    expect(targetCentered(target,pan(target,'north',.25),.25)).toBe(false);
  });

});
