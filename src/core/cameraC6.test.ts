import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {cameraRegionRecord,cameraRegionSelection,CAMERA_REGION_HALF_DEGREES} from './cameraRegion';
import {freshFieldArea} from './fieldEngine';
import {nativeNomadCandidateInSelection} from './nativeNomadRows';
import {cameraOverlaySource,overlayGate,overlayRect,overlayStretch,OVERLAY_FRAME,M31_ID} from './cameraOverlaySource';
import {applyCcdOverlayInPlace,addCCDOverlay,ccdOverlayPlan,ccdOverlayScale} from './cameraOverlay';
import {cameraBackgroundStage} from './cameraBackground';
import {cameraPreparationReference} from './cameraPreparation';
import {composeCameraExposure,CameraExposureError,type CameraExposureRecipe} from './cameraExposure';
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection} from './vizierNomad';

describe('Front C6: region record [0x5b5b30] (writer 0x53be70)',()=>{
 test('equals the field engine area away from the pole, with one fold across 0 h and 24 h',()=>{
  for(const p of [{ra:3.78,dec:24.12},{ra:15.3657,dec:31.22},{ra:.01,dec:-12},{ra:23.995,dec:40},{ra:12,dec:-75}]){
   const r=cameraRegionRecord(p),f=freshFieldArea(p);
   expect([r.minimumRa,r.maximumRa,r.minimumDec,r.maximumDec,r.limitingMagnitude]).toEqual([f.minimumRa,f.maximumRa,f.minimumDec,f.maximumDec,f.limitingMagnitude]);
   expect([r.centreRa,r.centreDec]).toEqual([p.ra,p.dec]);
  }
  expect(CAMERA_REGION_HALF_DEGREES).toBe(.375);
  const wrap=cameraRegionRecord({ra:.01,dec:0});expect(wrap.minimumRa).toBeGreaterThan(wrap.maximumRa);
 });
 test('near the pole it keeps VIREO\'s out-of-range bounds (no throw) and the selection then passes every RA',()=>{
  expect(()=>freshFieldArea({ra:6,dec:90})).toThrow();
  const r=cameraRegionRecord({ra:6,dec:90});
  expect(r.minimumRa<0||r.maximumRa>24).toBe(true);
  const s=cameraRegionSelection(r,21.5);
  for(const ra of [0,5.9,12,23.9])expect(nativeNomadCandidateInSelection({raHours:ra,decDegrees:89.8,selectedMagnitude:Math.fround(15)},s)).toBe(true);
  expect(nativeNomadCandidateInSelection({raHours:6,decDegrees:89.5,selectedMagnitude:Math.fround(15)},s)).toBe(false);
 });
 test('the selection keeps the four bounds and takes Select\'s raised limit; rows outside the loaded field are dropped',()=>{
  const r=cameraRegionRecord({ra:3.78,dec:24.12}),s=cameraRegionSelection(r,21.5);
  expect(s).toEqual({minRAHours:r.minimumRa,maxRAHours:r.maximumRa,minDecDegrees:r.minimumDec,maxDecDegrees:r.maximumDec,magnitudeLimit:21.5});
  const row=(dec:number)=>({raHours:3.78,decDegrees:dec,selectedMagnitude:Math.fround(12)});
  expect(nativeNomadCandidateInSelection(row(24.12+.374),s)).toBe(true);
  expect(nativeNomadCandidateInSelection(row(24.12+.376),s)).toBe(false);
 });
});

describe('Front C6: overlay source (0x53b628 gate, 0x5216a4 rect, 0x5218d4 StretchBlt)',()=>{
 const {width:W,height:H}=OVERLAY_FRAME,ccd=cameraPreparationReference('ccd',0);
 const red=()=>{const r=new Uint8Array(W*H);for(let i=0;i<r.length;i++)r[i]=(i*7)%256;return r;};
 test('the gate is any galaxy other than NGC 224',()=>{
  expect(overlayGate([])).toBe(false);expect(overlayGate([M31_ID])).toBe(false);expect(overlayGate(['NGC 5924'])).toBe(true);
  const at={ra:15,dec:31};
  expect(cameraOverlaySource({anchor:at,galaxyIds:[M31_ID],galaxyRed:red(),unpaintedGalaxies:0},at,ccd.widthArcminutes,ccd.heightArcminutes)).toEqual({status:'off'});
  expect(cameraOverlaySource({anchor:at,galaxyIds:[M31_ID,'NGC 205'],galaxyRed:red(),unpaintedGalaxies:0},at,ccd.widthArcminutes,ccd.heightArcminutes)).toEqual({status:'unavailable',reason:'m31'});
  expect(cameraOverlaySource({anchor:at,galaxyIds:['NGC 5924'],galaxyRed:red(),unpaintedGalaxies:1},at,ccd.widthArcminutes,ccd.heightArcminutes)).toEqual({status:'unavailable',reason:'unpainted'});
  expect(cameraOverlaySource({anchor:at,galaxyIds:['NGC 5924'],galaxyRed:null,unpaintedGalaxies:0},at,ccd.widthArcminutes,ccd.heightArcminutes)).toEqual({status:'unavailable',reason:'field'});
 });
 test('the 0.4 m rect at the loaded centre is 380² from (278, 278): 312 × CCD width′ / 15, half-even rounding',()=>{
  const at={ra:15,dec:31},r=overlayRect(at,at,ccd.widthArcminutes,ccd.heightArcminutes);
  expect(r.exactWidth).toBeCloseTo(312*18.257387161254883/15,9);
  expect([r.left,r.top,r.width,r.height]).toEqual([278,278,380,380]);
  for(const i of [1,2] as const){const c=cameraPreparationReference('ccd',i),q=overlayRect(at,at,c.widthArcminutes,c.heightArcminutes);expect(q.width).toBe(Math.round(312*c.widthArcminutes/15));}
 });
 test('replication to 1023², last column and row white; a drift past the field is typed outside',()=>{
  const at={ra:15,dec:31},src=red(),rect=overlayRect(at,at,ccd.widthArcminutes,ccd.heightArcminutes),out=overlayStretch(src,rect);
  expect(out.length).toBe(1024*1024);
  expect(out[0]).toBe(src[278*W+278]);
  expect(out[1022]).toBe(src[278*W+278+Math.floor(1022.5*380/1023)]);
  expect(out[1022*1024]).toBe(src[(278+Math.floor(1022.5*380/1023))*W+278]);
  for(let i=0;i<1024;i++){expect(out[i*1024+1023]).toBe(255);expect(out[1023*1024+i]).toBe(255);}
  const drifted={ra:15,dec:31+.24};
  expect(cameraOverlaySource({anchor:at,galaxyIds:['NGC 5924'],galaxyRed:src,unpaintedGalaxies:0},drifted,ccd.widthArcminutes,ccd.heightArcminutes)).toEqual({status:'unavailable',reason:'outside'});
  const near=cameraOverlaySource({anchor:at,galaxyIds:['NGC 5924'],galaxyRed:src,unpaintedGalaxies:0},{ra:15,dec:31+.2},ccd.widthArcminutes,ccd.heightArcminutes);
  expect(near.status).toBe('ready');
 });
 test('the in-place apply equals the reviewed plan stage (draw order, Single stores)',()=>{
  const width=16,height=16,bytes=Array.from({length:width*height},(_,i)=>i),stage=cameraBackgroundStage({width,height,bias:1000,mean:3,gain:1},Array(width*height).fill(.37));
  const scale=ccdOverlayScale({baseMagnitude:Math.fround(17.5),baseCount:4000,baseSeconds:10,seconds:30,opticalMagnitudeFactor:Math.fround(-1.5)});
  const plan=ccdOverlayPlan(width,height,bytes,scale),uniforms=plan.indices.map((_,i)=>((i*37)%100)/100);
  const reviewed=addCCDOverlay(stage,plan,uniforms);
  const plane=Float32Array.from(stage.pixels);let k=0;
  const draws=applyCcdOverlayInPlace(plane,Uint8Array.from(bytes),scale,()=>uniforms[k++]);
  expect(draws).toBe(plan.indices.length);expect(Array.from(plane)).toEqual(reviewed.pixels);
 });
});

describe('Front C6: overlay step in the composer (after the background, before the sources)',()=>{
 const recorded=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
 const selection=()=>selectVizierCatalog(readVizierCatalog(recorded,{catalog:'I/297',band:'R',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
 const recipe:CameraExposureRecipe={camera:'ccd',opticalIndex:0,filterPosition:0,seconds:10,gain:2,centerRaHours:56.745/15,centerDecDegrees:24.118,seed:20261027};
 test('levels ≤ 0 draw nothing and change nothing; positive levels add one draw each, then the sources follow',()=>{
  const plain=composeCameraExposure(recipe,selection());
  expect(plain.overlay).toBeNull();
  const dark=composeCameraExposure(recipe,selection(),[],null,{red:new Uint8Array(1024*1024).fill(37)});
  expect(dark.overlay).toEqual({draws:0});expect(dark.plane.pixels).toEqual(plain.plane.pixels);expect(dark.drawsConsumed).toBe(plain.drawsConsumed);
  const red=new Uint8Array(1024*1024);for(let i=0;i<1024;i++){red[i*1024+1023]=255;red[1023*1024+i]=255;}
  const lit=composeCameraExposure(recipe,selection(),[],null,{red});
  expect(lit.overlay).toEqual({draws:2047});expect(lit.drawsConsumed).toBe(plain.drawsConsumed+2047);
  expect(lit.plane.pixels[1023]).toBeGreaterThan(plain.plane.pixels[1023]);
 });
 test('IR has no overlay, and a wrong size is refused',()=>{
  expect(()=>composeCameraExposure({...recipe,camera:'ir',gain:1},selection(),[],null,{red:new Uint8Array(1024*1024)})).toThrow(CameraExposureError);
  expect(()=>composeCameraExposure(recipe,selection(),[],null,{red:new Uint8Array(10)})).toThrow(CameraExposureError);
 });
});
