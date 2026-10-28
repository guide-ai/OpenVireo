import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cameraMovingMagnitude,composeCameraExposure,CameraExposureError,CAMERA_EXPOSURE_ADAPTATIONS,CAMERA_MAX_SECONDS,type CameraExposureRecipe,type CameraExtraSource} from './cameraExposure';
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
  expect(()=>composeCameraExposure(recipe,selection(),[{raHours:1,decDeg:1,storedMag:10,kind:'pair'} as unknown as CameraExtraSource])).toThrow(CameraExposureError);
 });
 test('further control cases: NF and B pairs, three B stars, I with an authored USNO-B1 table and an off-detector row',()=>{
  const usno=selectVizierCatalog(readVizierCatalog(new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/authored-usnob1-control.xml',import.meta.url))),{catalog:'I/284',band:'I2',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
  const pair={raHours:56.744/15,decDeg:24.117,storedMag:14,kind:'pair' as const,end:{raHours:56.7445/15,decDeg:24.1172}};
  const pin=(x:ReturnType<typeof composeCameraExposure>)=>({sha256:sha(x.plane.pixels),draws:x.drawsConsumed,finalState:x.finalRandomState,records:x.records.length});
  expect(pin(composeCameraExposure({...recipe,seed:7},selection(),[pair]))).toEqual(controls.cases['nf-pair-catalog']);
  expect(pin(composeCameraExposure({...recipe,filterPosition:1,seconds:30,gain:1,seed:99},selection('B'),[pair]))).toEqual(controls.cases['b-pair-three-stars']);
  const i=composeCameraExposure({...recipe,filterPosition:4,seconds:5,gain:5,seed:4242},usno,[pair]);
  expect(pin(i)).toEqual(controls.cases['i-pair-authored-offdetector']);expect(i.catalog).toEqual({rows:4,selected:4,onDetector:3});
  expect(i.records[0].magnitude).toBe(Math.fround(14-0.88));
 });
 test('a moving pair far off-axis is skipped with a typed reason, after consuming its four draws',()=>{
  const far={raHours:(56.745/15+6)%24,decDeg:24,storedMag:12,kind:'pair' as const,end:{raHours:(56.745/15+6.01)%24,decDeg:24}};
  const x=composeCameraExposure(recipe,selection(),[far]),plain=composeCameraExposure(recipe,selection());
  expect(x.skipped).toEqual([{extraIndex:0,reason:'moving-pair-off-detector'}]);expect(x.records.map(r=>r.origin)).toEqual(['catalog']);
  expect(x.drawsConsumed).toBe(plain.drawsConsumed+4);
 });
 test.each([0.15,0.5])('a %s deg diagonal moving streak (600 s) is drawn, not refused',degrees=>{
  // 1994 CC moves 0.091 deg/h at the ObjectX default date (2009-06-01 04:00 UT, ObjX_MPC.CMO.sav), so these exceed it.
  const dec0=recipe.centerDecDegrees,ra0=recipe.centerRaHours,half=degrees/2/Math.SQRT2;
  const pair={raHours:ra0-half/15/Math.cos(dec0*Math.PI/180),decDeg:dec0-half,storedMag:13,kind:'pair' as const,end:{raHours:ra0+half/15/Math.cos(dec0*Math.PI/180),decDeg:dec0+half}};
  const t=performance.now(),x=composeCameraExposure({...recipe,seconds:600,filterPosition:2},selection(),[pair]);
  expect(performance.now()-t).toBeLessThan(5000);
  expect(x.skipped).toEqual([]);expect(x.records.filter(r=>r.kind===2).map(r=>r.extraIndex)).toEqual([0,0]);
  const length=Math.hypot(x.records[1].pixelX-x.records[0].pixelX,x.records[1].pixelY-x.records[0].pixelY);
  expect(length).toBeGreaterThan(degrees*3600/1.1);
  // The streak brightens pixels along its middle relative to the same exposure without it.
  const plain=composeCameraExposure({...recipe,seconds:600,filterPosition:2},selection());
  const mid=Math.round((x.records[0].pixelY+x.records[1].pixelY)/2)*1024+Math.round((x.records[0].pixelX+x.records[1].pixelX)/2);
  expect(x.plane.pixels[mid]).toBeGreaterThan(plain.plane.pixels[mid]);
 });
});
describe('IR exposure composer (C6)',()=>{
 const jhk=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/authored-nomad-jhk-control.xml',import.meta.url)));
 const irSelection=(band:'J'|'H'|'K')=>selectVizierCatalog(readVizierCatalog(jhk,{catalog:'I/297',band,epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
 const ir:CameraExposureRecipe={...recipe,camera:'ir',gain:4};
 const pin=(x:ReturnType<typeof composeCameraExposure>)=>({sha256:sha(x.plane.pixels),draws:x.drawsConsumed,finalState:x.finalRandomState,records:x.records.length});
 const pair={raHours:56.744/15,decDeg:24.117,storedMag:14,kind:'pair' as const,end:{raHours:56.7445/15,decDeg:24.1172}};
 test('J field: 512x512 plane, three stars on the detector, matches the Python control',()=>{
  const x=composeCameraExposure(ir,irSelection('J'));
  expect(x.plane.width).toBe(512);expect(x.plane.height).toBe(512);
  expect(x.catalog).toEqual({rows:4,selected:4,onDetector:3});
  expect(x.records.map(r=>r.magnitude).sort((p,q)=>p-q)).toEqual([11.25,13.5,15.75].map(Math.fround));expect(x.records.every(r=>r.origin==='catalog')).toBe(true);
  expect(pin(x)).toEqual(controls.cases['ir-j-catalog']);
 });
 test('K field with a moving pair: blank K is rejected, pair first, matches the control',()=>{
  const x=composeCameraExposure({...ir,filterPosition:2,seconds:30,gain:8,seed:31},irSelection('K'),[pair]);
  expect(x.records.map(r=>r.origin)).toEqual(['moving-start','moving-end','catalog','catalog']);
  expect(x.records[0].magnitude).toBe(cameraMovingMagnitude('ir',2,14));
  expect(pin(x)).toEqual(controls.cases['ir-k-pair-catalog']);
 });
 test('H field with a moving pair: H offset on the pair, matches the control',()=>{
  const x=composeCameraExposure({...ir,filterPosition:1,seconds:20,gain:2,seed:53},irSelection('H'),[pair]);
  expect(x.records[0].origin).toBe('moving-start');expect(x.records[0].magnitude).toBe(cameraMovingMagnitude('ir',1,14));
  expect(pin(x)).toEqual(controls.cases['ir-h-pair-catalog']);
 });
 test('IR moving offsets 0x51e110 are cumulative steps of 1.13, 0.29 and 0.07, stored Single; no NF -0.25',()=>{
  expect(cameraMovingMagnitude('ir',0,14)).toBe(Math.fround(14-1.13));
  expect(cameraMovingMagnitude('ir',1,14)).toBe(Math.fround((14-1.13)-0.29));
  expect(cameraMovingMagnitude('ir',2,14)).toBe(Math.fround(((14-1.13)-0.29)-0.07));
  expect(cameraMovingMagnitude('ccd',0,14)).toBe(Math.fround(14-0.54));
  const j=composeCameraExposure(ir,irSelection('J'),[pair]);
  expect(j.records[0].magnitude).toBe(Math.fround(14-1.13));
 });
 test('IR refusals: CCD-only gain 5 and filter positions past K; IR gains 1/2/4/8 accepted; CCD refuses gain 4',()=>{
  expect(()=>composeCameraExposure({...ir,gain:5},irSelection('J'))).toThrow(CameraExposureError);
  expect(()=>composeCameraExposure({...ir,filterPosition:3},irSelection('J'))).toThrow(CameraExposureError);
  expect(()=>composeCameraExposure({...recipe,gain:4},selection())).toThrow(CameraExposureError);
  for(const gain of [1,2,8])expect(composeCameraExposure({...ir,gain,seconds:1},irSelection('H')).plane.width).toBe(512);
 });
 test('unrecovered IR exposure limit and overlay follow the CCD web adaptation',()=>{
  expect(CAMERA_EXPOSURE_ADAPTATIONS.some(a=>a.startsWith('ir-like-ccd:'))).toBe(true);
  expect(()=>composeCameraExposure({...ir,seconds:CAMERA_MAX_SECONDS+1},irSelection('J'))).toThrow(CameraExposureError);
  expect(composeCameraExposure({...ir,seconds:CAMERA_MAX_SECONDS},irSelection('J')).recipe.seconds).toBe(CAMERA_MAX_SECONDS);
 });
});
