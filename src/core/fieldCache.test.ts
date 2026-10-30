import {describe,expect,it} from 'vitest';
import {nativeFieldCacheHolds} from './fieldCache';

// G2 review 1 M2: VIREO keeps the loaded field while the 312-pixel crop origin stays strictly inside (0, 624) of the 936-pixel
// cache (0x53af28): an offset under 312 px, 0.25° of the 0.75° field.
describe('cached-field reload rule (0x53af28)',()=>{
 it('keeps the field inside 0.25° and reloads at or beyond it, in RA and Dec',()=>{
  const c={ra:10,dec:20},px=.75/936;
  expect(nativeFieldCacheHolds(c,c)).toBe(true);
  expect(nativeFieldCacheHolds(c,{ra:10,dec:20+311*px})).toBe(true);expect(nativeFieldCacheHolds(c,{ra:10,dec:20+312*px})).toBe(false);
  expect(nativeFieldCacheHolds(c,{ra:10,dec:20-311*px})).toBe(true);expect(nativeFieldCacheHolds(c,{ra:10,dec:20-312*px})).toBe(false);
  const raPx=px/(15*Math.cos(20*Math.PI/180));
  expect(nativeFieldCacheHolds(c,{ra:10+311*raPx,dec:20})).toBe(true);expect(nativeFieldCacheHolds(c,{ra:10+313*raPx,dec:20})).toBe(false);
 });
 it('follows RA across 0 h, and a sidereal drift of a minute stays inside',()=>{
  expect(nativeFieldCacheHolds({ra:23.9999,dec:0},{ra:0.0001,dec:0})).toBe(true);
  // Tracking off: a minute of sidereal drift (about 0.0042 h, 0.063° at Dec 0) stays inside the cache; 0.02 h (0.3°) does not.
  expect(nativeFieldCacheHolds({ra:5,dec:0},{ra:5+60/3600/1.0027379,dec:0})).toBe(true);
  expect(nativeFieldCacheHolds({ra:5,dec:0},{ra:5+0.02,dec:0})).toBe(false);
  expect(nativeFieldCacheHolds({ra:NaN,dec:0},{ra:5,dec:0})).toBe(false);
 });
});
