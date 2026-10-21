import {describe,it,expect} from 'vitest';
import {compiledCameraProjection,projectCameraSource,cameraProjectionInBounds,type CameraProjectionContext} from './cameraProjection';
import controls from './cameraProjection.controls.json';
describe('bounded compiled camera projection with two explicit uniform draws',()=>{
 it('matches294 independent Decimal85 sky-vector/dot-product synthetic controls',()=>{
  expect(controls.cases).toHaveLength(294);
  for(const c of controls.cases){const context=compiledCameraProjection(c.camera,c.index,c.center,c.seeingEnabled),r=projectCameraSource(context,c.source,c.uniforms),e=c.expected;
   expect(r.inside,c.name).toBe(e.inside);expect(r.localDrawsConsumed).toBe(2);expect(Math.abs(r.planeX-e.planeX),c.name).toBeLessThan(5e-14);expect(Math.abs(r.planeY-e.planeY),c.name).toBeLessThan(5e-14);expect(Math.abs(r.denominator-e.denominator),c.name).toBeLessThan(5e-14);expect(Math.abs(context.seeingWidthRadians-e.seeingWidthRadians),c.name).toBeLessThan(1e-20);
   if(e.inside){expect(Math.abs(r.pixelX!-e.pixelX!),c.name).toBeLessThan(5e-8);expect(Math.abs(r.pixelY!-e.pixelY!),c.name).toBeLessThan(5e-8);}else{expect(r.pixelX).toBeNull();expect(r.pixelY).toBeNull();}
  }
 });
 it('uses each camera dimensions/pixels and selected compiled focal owner without inferring them from an image',()=>{
  const c=compiledCameraProjection('ccd',0,{raHours:0,decDegrees:0},false),ir=compiledCameraProjection('ir',0,{raHours:0,decDegrees:0},false);expect(c.width).toBe(1024);expect(ir.width).toBe(512);expect(c.halfX).toBeGreaterThan(ir.halfX);expect(c.originX).toBe(-c.halfX);expect(c.originY).toBe(c.halfY);expect(c.stepX).toBeGreaterThan(0);expect(c.stepY).toBeLessThan(0);expect(compiledCameraProjection('ccd',2,{raHours:0,decDegrees:0},false).halfX).toBeLessThan(c.halfX);expect(c).not.toHaveProperty('image');expect(c).not.toHaveProperty('observation');
 });
 it('consumes RA then DEC uniforms even with seeing disabled and retains source signs/continuous pixels',()=>{
  const source={raHours:0,decDegrees:0},c=compiledCameraProjection('ccd',0,source,false),a=projectCameraSource(c,source,[0,.999]),b=projectCameraSource(c,source,[.5,.5]);expect(a.localDrawsConsumed).toBe(2);expect(a.planeX).toBe(b.planeX);expect(a.planeY).toBe(b.planeY);expect(b.pixelX).toBe(512);expect(b.pixelY).toBe(512);
  const seen=compiledCameraProjection('ccd',0,source,true),ra=projectCameraSource(seen,source,[.875,.5]),dec=projectCameraSource(seen,source,[.5,.875]);expect(ra.planeX).toBeLessThan(0);expect(ra.pixelX!).toBeLessThan(512);expect(dec.planeY).toBeGreaterThan(0);expect(dec.pixelY!).toBeLessThan(512);expect(Number.isInteger(ra.pixelX)).toBe(false);
 });
 it('keeps inclusive rectangular edges without clamping pixel coordinates or adding a front-hemisphere cut',()=>{
  const c=compiledCameraProjection('ccd',0,{raHours:0,decDegrees:0},false);for(const x of[-c.halfX,c.halfX])for(const y of[-c.halfY,c.halfY])expect(cameraProjectionInBounds(c,x,y)).toBe(true);expect(cameraProjectionInBounds(c,c.halfX+1e-12,0)).toBe(false);expect(cameraProjectionInBounds(c,0,-c.halfY-1e-12)).toBe(false);
  const opposite=projectCameraSource(c,{raHours:12,decDegrees:0},[.5,.5]);expect(opposite.denominator).toBeLessThan(0);expect(opposite.inside).toBe(true);
  const outside=projectCameraSource(c,{raHours:.1,decDegrees:.1},[.5,.5]);expect(outside.inside).toBe(false);expect(outside.pixelX).toBeNull();
 });
 it('owns immutable context/results and cannot be relabelled via JSON or object spread',()=>{
  const source={raHours:12,decDegrees:45},u=[.125,.875],before=JSON.stringify({source,u}),c=compiledCameraProjection('ir',1,source,true),r=projectCameraSource(c,source,u);expect(JSON.stringify({source,u})).toBe(before);expect(Object.isFrozen(c)).toBe(true);expect(Object.isFrozen(r)).toBe(true);
  for(const forged of[JSON.parse(JSON.stringify(c)),{...c}])expect(()=>projectCameraSource(forged,source,u)).toThrow('ownership');expect(()=>cameraProjectionInBounds({} as CameraProjectionContext,0,0)).toThrow('ownership');
 });
 it('rejects unsupported contexts,coordinates and uniform segments without filling seed/time or missing values',()=>{
  const source={raHours:0,decDegrees:0},c=compiledCameraProjection('ccd',0,source,false);
  for(const center of[{raHours:-1,decDegrees:0},{raHours:25,decDegrees:0},{raHours:0,decDegrees:91},{raHours:NaN,decDegrees:0}])expect(()=>compiledCameraProjection('ccd',0,center,false)).toThrow();expect(()=>compiledCameraProjection('ccd',3,source,false)).toThrow();expect(()=>compiledCameraProjection('CCD',0,source,false)).toThrow();expect(()=>compiledCameraProjection('ccd',0,source,undefined as unknown as boolean)).toThrow();
  for(const u of[[],[.5],[.5,.5,.5],[1,.5],[-.1,.5],[NaN,.5]])expect(()=>projectCameraSource(c,source,u)).toThrow('uniforms');for(const bad of[{raHours:49,decDegrees:0},{raHours:0,decDegrees:181},{raHours:Infinity,decDegrees:0}])expect(()=>projectCameraSource(c,bad,[.5,.5])).toThrow('coordinates');expect(()=>cameraProjectionInBounds(c,NaN,0)).toThrow('Nonfinite');
 });
});
