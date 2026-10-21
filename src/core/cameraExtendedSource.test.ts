import{describe,it,expect}from'vitest';
import controls from './cameraExtendedSource.controls.json';
import{cameraExtendedPlan,addCameraExtendedSource,CameraExtendedError,type CameraExtendedParameters,type CameraSourcePlane}from'./cameraExtendedSource';
import{cameraBackgroundStage}from'./cameraBackground';
import{cameraPointPlan,addCameraPointSource}from'./cameraPointSource';
import{finalizeCameraPlane,compiledCameraFinalParameters}from'./cameraFinal';
const bits=(v:number)=>{const d=new DataView(new ArrayBuffer(4));d.setFloat32(0,v);return'0x'+d.getUint32(0).toString(16).padStart(8,'0');};
const p:CameraExtendedParameters={width:17,height:17,x1:8,y1:8,x2:8.25,y2:8,sigmaX:1,sigmaY:1,referencePeak:1000,exposureScale:1};
const background=(w=17,h=17)=>cameraBackgroundStage({width:w,height:h,mean:25,bias:1000,gain:2},Array(w*h).fill(.5));
const fails=(f:()=>unknown,code:CameraExtendedError['code'])=>{try{f();expect.fail('Expected admission rejection');}catch(e){expect(e).toBeInstanceOf(CameraExtendedError);expect((e as CameraExtendedError).code).toBe(code);}};
describe('explicit paired-source numerical phase;not an authenticated extended observation',()=>{
 it.each(controls.cases)('matches independent Decimal vector/segment synthetic controls $name',c=>{
  const plan=cameraExtendedPlan(c.parameters);
  for(const key of['support','xRadius','yRadius','centerX','centerY','gaussianVisits','spikesEnabled']as const)expect(plan[key]).toBe(c[key]);
  expect(plan.indices).toEqual(c.indices);
  for(let i=0;i<plan.means.length;i++){const expected=Number(c.means[i]);expect(Math.abs(plan.means[i]-expected)).toBeLessThanOrEqual(Math.max(1e-14,Math.abs(expected)*1e-12));}
  const initial=background(c.parameters.width,c.parameters.height),result=addCameraExtendedSource(initial,plan,c.uniforms);
  expect(result.pixels.map(bits)).toEqual(c.finalBits);expect(result.histogram).toBe(initial.histogram);expect(result.localDrawsConsumed).toBe(c.indices.length);
 });
 it('suppresses the entire cross at the strict geometric scale boundary and retains it below',()=>{
  const boundary=1.25**4-1,below=cameraExtendedPlan({...p,x2:8+boundary-1e-6}),at=cameraExtendedPlan({...p,x2:8+boundary}),above=cameraExtendedPlan({...p,x2:8+boundary+1e-6});
  expect(below.spikesEnabled).toBe(true);expect(below.indices.length).toBeGreaterThan(below.gaussianVisits);
  expect(at.geometricScale).toBe(1.25);expect(at.spikesEnabled).toBe(false);expect(at.indices.length).toBe(at.gaussianVisits);expect(above.spikesEnabled).toBe(false);
 });
 it('retains capsule interior/endcaps,midpoint rounding and geometry support independent of time',()=>{
  const a=cameraExtendedPlan({...p,x1:4,x2:12,referencePeak:100}),b=cameraExtendedPlan({...p,x1:4,x2:12,referencePeak:100,exposureScale:2});
  const mean=(x:number,y:number)=>a.means[a.indices.indexOf(y*17+x)];
  expect(a.centerX).toBe(8);expect(mean(4,8)).toBe(mean(8,8));expect(mean(8,8)).toBe(mean(12,8));expect(mean(3,8)/mean(4,8)).toBeCloseTo(Math.exp(-.5),14);
  expect(a.indices).toEqual(b.indices);expect(a.support).toBe(b.support);expect(a.xRadius).toBe(b.xRadius);
  const short=cameraExtendedPlan(p),twice=cameraExtendedPlan({...p,exposureScale:2});
  for(let i=0;i<short.means.length;i++)expect(twice.means[i]).toBe(short.means[i]*(i<short.gaussianVisits?2:4));
 });
 it('keeps ordered point/extended additions reversible by retaining immutable input and finalizes only once',()=>{
  const b=background(),before=b.pixels.slice(),plan=cameraExtendedPlan(p),draws=Array(plan.indices.length).fill(.5),e=addCameraExtendedSource(b,plan,draws);
  const point=cameraPointPlan({width:17,height:17,x:8,y:8,sigmaX:1,sigmaY:1,referencePeak:50,exposureScale:1}),mixed=addCameraPointSource(e,point,Array(point.indices.length).fill(.5));
  const again=addCameraExtendedSource(mixed,plan,draws),final=finalizeCameraPlane(again,compiledCameraFinalParameters('ccd',2));
  expect(b.pixels).toEqual(before);expect(e.histogram).toBe(b.histogram);expect(mixed.histogram).toBe(b.histogram);expect(final.histogram).toBe(b.histogram);expect(again.pixels[8*17+8]).toBeGreaterThan(e.pixels[8*17+8]);
  expect(Object.isFrozen(plan)).toBe(true);expect(Object.isFrozen(plan.indices)).toBe(true);expect(Object.isFrozen(plan.means)).toBe(true);expect(Object.isFrozen(e.pixels)).toBe(true);
  fails(()=>addCameraExtendedSource(final as unknown as CameraSourcePlane,plan,draws),'plane');
  expect(addCameraExtendedSource(b,plan,draws)).toEqual(e);expect(e).not.toHaveProperty('catalog');expect(e).not.toHaveProperty('seed');
 });
 it('rejects unsupported geometry,budget and invalid late uniforms atomically',()=>{
  for(const change of[{x2:p.x1,y2:p.y1},{sigmaX:1e-300}])fails(()=>cameraExtendedPlan({...p,...change}),'geometry');
  for(const change of[{width:1025},{x1:NaN},{sigmaY:0},{referencePeak:-1},{exposureScale:Infinity}])fails(()=>cameraExtendedPlan({...p,...change}),'parameters');
  fails(()=>cameraExtendedPlan({...p,width:1024,height:1024,x1:300,y1:400,x2:500,y2:600,sigmaX:100,sigmaY:100}),'budget');
  const b=background(),before=b.pixels.slice(),plan=cameraExtendedPlan(p),draws=Array(plan.indices.length).fill(.5);draws[draws.length-1]=1;
  fails(()=>addCameraExtendedSource(b,plan,draws),'uniforms');fails(()=>addCameraExtendedSource(b,plan,Array(plan.indices.length)),'uniforms');fails(()=>addCameraExtendedSource(b,plan,[]),'uniforms');
  fails(()=>addCameraExtendedSource({...b,pixels:Array(b.pixels.length)},plan,Array(plan.indices.length).fill(.5)),'plane');
  fails(()=>addCameraExtendedSource(b,JSON.parse(JSON.stringify(plan)),[]),'geometry');
  expect(b.pixels).toEqual(before);
 });
});
