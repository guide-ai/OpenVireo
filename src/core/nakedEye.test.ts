import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,test} from 'vitest';
import {NKDEYE_FILE,NakedEyeError,decodeNakedEyeFile,nakedEyeFormFields,nakedEyeMagnitudeAdmits,nakedEyeMarker,pickNakedEye,type NakedEyeRecord} from './nakedEye';

/** Authored 20-byte record (Double RA h, Double Dec °, Single V). */
function rec(ra:number,dec:number,v:number){const b=new Uint8Array(20),d=new DataView(b.buffer);d.setFloat64(0,ra,true);d.setFloat64(8,dec,true);d.setFloat32(16,v,true);return b;}
const join=(...parts:Uint8Array[])=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;};

describe('NkdEye.dat reader (0x554e78)',()=>{
 test('authored records; size and non-finite refusals',()=>{
  const r=decodeNakedEyeFile(join(rec(1.5,-20.25,3.25),rec(23.999,89,5.5)));
  expect(r).toEqual([{index:0,raHours:1.5,decDegrees:-20.25,magnitude:3.25},{index:1,raHours:23.999,decDegrees:89,magnitude:5.5}]);
  expect(()=>decodeNakedEyeFile(rec(1,2,3).slice(0,19))).toThrow(NakedEyeError);
  expect(()=>decodeNakedEyeFile(rec(Number.NaN,2,3))).toThrow(NakedEyeError);
  expect(()=>decodeNakedEyeFile(rec(24,2,3))).toThrow(NakedEyeError);
 });
 test('bundled file: identity, 2887 records, ranges, first records (HR 3, HR 15 [I])',()=>{
  const bytes=new Uint8Array(readFileSync('public'+NKDEYE_FILE.path));
  expect(bytes.byteLength).toBe(NKDEYE_FILE.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(NKDEYE_FILE.sha256);
  const r=decodeNakedEyeFile(bytes);
  expect(r).toHaveLength(2887);
  expect(r[0].raHours).toBeCloseTo(.08892,5);expect(r[0].decDegrees).toBeCloseTo(-5.7075,4);expect(r[0].magnitude).toBeCloseTo(4.61,5);
  expect(r[1].raHours).toBeCloseTo(.13981,5);expect(r[1].decDegrees).toBeCloseTo(29.0906,4);expect(r[1].magnitude).toBeCloseTo(2.06,5);
  expect(r.every(x=>nakedEyeMagnitudeAdmits(x))).toBe(true);
  expect(Math.min(...r.map(x=>x.magnitude))).toBeCloseTo(-1.46,5);
 });
});
describe('form and pick',()=>{
 test('FormActivate 0x55334c fields',()=>{
  expect(nakedEyeFormFields({index:0,raHours:1.5,decDegrees:-20.25,magnitude:Math.fround(3.25)})).toEqual({ra:'   1h 30m 00.00s',dec:' -20° 15\' 00.0"',mag:'3.250'});
 });
 test('V limit 5.5 inclusive (Single)',()=>{
  const at=(v:number)=>nakedEyeMagnitudeAdmits({index:0,raHours:0,decDegrees:0,magnitude:Math.fround(v)});
  expect([at(5.5),at(5.51)]).toEqual([true,false]);
 });
 test('pick 0x55526c: strict < 10 px, first wins ties; marker y × 1.01',()=>{
  const r=(i:number):NakedEyeRecord=>({index:i,raHours:0,decDegrees:0,magnitude:1});
  const pts=[{record:r(0),x:100,y:100},{record:r(1),x:100,y:100},{record:r(2),x:110,y:100}];
  expect(pickNakedEye(pts,100,100)?.record.index).toBe(0);
  expect(pickNakedEye(pts,105,100)?.record.index).toBe(0);
  expect(pickNakedEye([{record:r(0),x:0,y:0}],10,0)).toBeNull();
  expect(nakedEyeMarker({record:r(0),x:100.4,y:200})).toEqual({x:100,y:202});
 });
});
