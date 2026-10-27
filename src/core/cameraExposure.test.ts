import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {composeCameraExposure,CameraExposureError,type CameraExposureRecipe} from './cameraExposure';
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection} from './vizierNomad';
import {CameraRandomCursor} from './cameraRandom';
import {randomDraw} from './acquisition';
import controls from './cameraExposure.controls.json';

const recorded=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
const selection=(band:'R'|'B'='R')=>selectVizierCatalog(readVizierCatalog(recorded,{catalog:'I/297',band,epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
const recipe:CameraExposureRecipe={camera:'ccd',opticalIndex:0,filterPosition:0,seconds:10,gain:2,centerRaHours:56.745/15,centerDecDegrees:24.118,seed:20261027};
const sha=(px:readonly number[])=>{const b=Buffer.alloc(px.length*4);px.forEach((v,i)=>b.writeFloatBE(v,i*4));return createHash('sha256').update(b).digest('hex');};

describe('camera random stream',()=>{
 test('steps the recovered Random recurrence from the supplied seed',()=>{
  const c=new CameraRandomCursor(1);const a=c.take(3);let s=1;const e=[0,1,2].map(()=>{const d=randomDraw(s);s=d.seed;return d.value;});
  expect(a).toEqual(e);expect(c.drawsConsumed).toBe(3);expect(c.finalState).toBe(s);
  expect(()=>new CameraRandomCursor(-1)).toThrow();expect(()=>new CameraRandomCursor(2**32)).toThrow();
 });
});
describe('CCD exposure composer',()=>{
 test('recorded field, NF: one catalog star, draw accounting, deterministic',()=>{
  const t=performance.now();const x=composeCameraExposure(recipe,selection());const ms=performance.now()-t;
  expect(x.records.map(r=>[r.origin,r.identifier])).toEqual([['catalog','1141-0043644']]);
  expect(x.plane.width*x.plane.height).toBe(1024*1024);
  expect(x.drawsConsumed).toBeGreaterThan(2+1024*1024);
  const again=composeCameraExposure(recipe,selection());
  expect(sha(again.plane.pixels)).toBe(sha(x.plane.pixels));expect(again.finalRandomState).toBe(x.finalRandomState);
  expect(ms).toBeLessThan(5000);
  expect({sha256:sha(x.plane.pixels),draws:x.drawsConsumed,finalState:x.finalRandomState,records:x.records.length}).toEqual(controls.cases['nf-catalog']);
 });
 test('moving pair goes first, consumes 4 projection draws and becomes one extended source',()=>{
  const pair={raHours:56.744/15,decDeg:24.117,storedMag:14,kind:'pair' as const,end:{raHours:56.7445/15,decDeg:24.1172}};
  const x=composeCameraExposure({...recipe,filterPosition:2},selection(),[pair]);
  expect(x.records.map(r=>r.origin)).toEqual(['moving-start','moving-end','catalog']);
  expect(x.records[0].magnitude).toBe(Math.fround(14));expect(x.records[1].kind).toBe(2);
  const b=composeCameraExposure({...recipe,filterPosition:1},selection('B'),[pair]);
  expect(b.records[0].magnitude).toBe(Math.fround(14+0.65));
  expect({sha256:sha(x.plane.pixels),draws:x.drawsConsumed,finalState:x.finalRandomState,records:x.records.length}).toEqual(controls.cases['v-pair-catalog']);
 });
 test('typed refusals',()=>{
  expect(()=>composeCameraExposure({...recipe,gain:3},selection())).toThrow(CameraExposureError);
  expect(()=>composeCameraExposure({...recipe,seconds:0},selection())).toThrow(CameraExposureError);
  expect(()=>composeCameraExposure(recipe,selection(),[{raHours:1,decDeg:1,storedMag:10,kind:'pair'}])).toThrow(CameraExposureError);
 });
});
