import {describe,it,expect} from 'vitest';
import controls from './cameraQueryReference.controls.json';
import {compiledCameraQueryReference,readCameraNomadReferenceResponse,CameraQueryReferenceError,type CameraQueryContext,type CameraQueryReference} from './cameraQueryReference';
import {NativeNomadResponseError,nativeNomadSourceLists} from './nativeNomadResponse';

const context:CameraQueryContext={centerRAHours:12,centerDecDegrees:-30,selectionMagnitudeLimit:15,suppliedDateDouble:2451545,dateBias:0};
const keys=['id','RA','DEC','MuRA','MuDEC','B','V','R','J','H','K'];
const header=keys.map(k=>(' '+k+'|').padStart(24,' ')).join('');
const line=['SYNTHETIC-ONLY','12','-30','1000','-2000','14','13','12','11','10','9'].map(v=>v.padStart(23,' ')+' ').join('');
const text=['# SYNTHETIC ONLY','END',header,'hh.hhh dd.ddd',line].join('\n');
const bytes=()=>new TextEncoder().encode(text);
describe('compiled camera query/date reference,not service or cache authority',()=>{
 it('matches864 independently calculated Decimal95 contexts including both camera geometries and all filter routes',()=>{
  for(const c of controls.vectors){
   const r=compiledCameraQueryReference(c.camera,c.index,c.position,c.context);
   for(const [key,value]of Object.entries(c.expected)){
    const actual=r[key as keyof typeof c.expected];
    if(key==='epochOffsetYears')expect(Math.abs(actual-value)).toBeLessThan(2e-12);
    else expect(Math.abs(actual-value)).toBeLessThanOrEqual(Math.max(Math.abs(value)*3e-15,1e-15));
   }
  }
 });
 it('keeps query cut21.5 separate from a higher Single selection limit and preserves endpoint coordinates',()=>{
  const a=compiledCameraQueryReference('ccd',0,0,{...context,centerRAHours:24,centerDecDegrees:90}),b=compiledCameraQueryReference('ir',0,0,{...context,selectionMagnitudeLimit:25});
  expect(a.centerRADegrees).toBe(360);expect(a.centerDecDegrees).toBe(90);expect(a.selectionMagnitudeLimit).toBe(21.5);
  expect(b.queryFaintMagnitude).toBe(21.5);expect(b.selectionMagnitudeLimit).toBe(25);expect(a.searchRadiusDegrees).toBeGreaterThan(b.searchRadiusDegrees);
  for(const r of[a,b]){expect(r.queryBrightMagnitude).toBe(1);expect(r).not.toHaveProperty('url');expect(r).not.toHaveProperty('cache');expect(r).not.toHaveProperty('request');}
 });
 it('rejects absent/nonfinite/outside context and implicit magnitude rounding even for an otherwise valid camera',()=>{
  const invalid=[null,undefined,{...context,centerRAHours:-.01},{...context,centerRAHours:24.01},{...context,centerDecDegrees:90.01},{...context,centerDecDegrees:NaN},{...context,selectionMagnitudeLimit:13.1},{...context,selectionMagnitudeLimit:Infinity},{...context,selectionMagnitudeLimit:51},{...context,suppliedDateDouble:NaN},{...context,dateBias:Infinity},{...context,dateBias:1e7+1},{...context,suppliedDateDouble:1e7+1},{...context,suppliedDateDouble:2451545+365.25*1001}];
  for(const c of invalid)expect(()=>compiledCameraQueryReference('ccd',0,0,c as CameraQueryContext)).toThrow(CameraQueryReferenceError);
  for(const args of[['other',0,0],['ccd',3,0],['ir',0,3]])expect(()=>compiledCameraQueryReference(...args as [unknown,unknown,unknown],context)).toThrow();
 });
 it('snapshots/freeze context and admits only actual factory identity to the NOMAD bridge',()=>{
  const c={...context},r=compiledCameraQueryReference('ccd',0,2,c);c.dateBias=999;c.centerRAHours=0;
  expect(r.dateBias).toBe(0);expect(r.centerRAHours).toBe(12);expect(Object.isFrozen(r)).toBe(true);expect(Object.isFrozen(r.lookup)).toBe(true);
  for(const copy of[{...r},JSON.parse(JSON.stringify(r)),null])expect(()=>readCameraNomadReferenceResponse(bytes(),copy as CameraQueryReference)).toThrow(CameraQueryReferenceError);
  const original=bytes(),parsed=readCameraNomadReferenceResponse(original,r);original.fill(88);expect(parsed.originalText).toBe(text);expect(parsed.context).toEqual({band:'V',epochOffsetYears:0});
 });
 it('binds every admitted NOMAD route to its original band and explicit temporal correction;no selection bounds are invented',()=>{
  for(const [camera,position,band,mag]of[['ccd',0,'R',12],['ccd',1,'B',14],['ccd',2,'V',13],['ccd',3,'R',12],['ir',0,'J',11],['ir',1,'H',10],['ir',2,'K',9]]as const){
   // Explicit date bias contributes one year;there is no host-clock default.
   const reference=compiledCameraQueryReference(camera,0,position,{...context,suppliedDateDouble:2451545+365.25*19,dateBias:365.25});
   const response=readCameraNomadReferenceResponse(bytes(),reference),entry=response.entries[0];
   expect(response.context).toEqual({band,epochOffsetYears:20});expect(entry.result.kind).toBe('candidate');
   if(entry.result.kind!=='candidate')throw new Error('Expected synthetic candidate');
   expect(entry.result.row.selectedMagnitude).toBe(mag);expect(entry.result.row.raHours).toBeCloseTo(12+20/54000,13);expect(entry.result.row.decDegrees).toBeCloseTo(-30-40/3600,13);
   const lists=nativeNomadSourceLists(response,{minRAHours:11,maxRAHours:13,minDecDegrees:-31,maxDecDegrees:-29,magnitudeLimit:reference.selectionMagnitudeLimit});
   expect(lists.selectedEntries).toHaveLength(1);expect(lists.response).toBe(response);
  }
 });
 it('rejects CCD I before parsing NOMAD,retains framing errors and leaves an earlier response intact',()=>{
  const r=compiledCameraQueryReference('ccd',0,0,context),valid=readCameraNomadReferenceResponse(bytes(),r),i=compiledCameraQueryReference('ccd',0,4,context);
  expect(i.lookup.catalog).toBe('USNO-B1');expect(i.lookup.queryBand).toBe('I2');expect(()=>readCameraNomadReferenceResponse(new Uint8Array(),i)).toThrow('USNO-B1');
  expect(()=>readCameraNomadReferenceResponse(new TextEncoder().encode('missing marker'),r)).toThrow(NativeNomadResponseError);
  expect(()=>readCameraNomadReferenceResponse(new TextEncoder().encode(text+'\r'),r)).toThrow(NativeNomadResponseError);
  expect(valid.originalText).toBe(text);expect(readCameraNomadReferenceResponse(bytes(),r)).not.toBe(valid);
 });
});
