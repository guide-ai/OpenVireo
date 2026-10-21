import{describe,it,expect}from'vitest';
import{ccdOverlayScale,ccdOverlayPlan,addCCDOverlay,type CameraOverlayCalibration}from'./cameraOverlay';
import{cameraBackgroundStage}from'./cameraBackground';
import{cameraPointPlan,addCameraPointSource}from'./cameraPointSource';
import{cameraExtendedPlan,addCameraExtendedSource}from'./cameraExtendedSource';
import{finalizeCameraPlane,compiledCameraFinalParameters}from'./cameraFinal';
import controls from'./cameraOverlay.controls.json';
const bits=(v:number)=>{const d=new DataView(new ArrayBuffer(4));d.setFloat32(0,v);return d.getUint32(0).toString(16).padStart(8,'0');};
const background=(width=5,height=1,bias=1000)=>cameraBackgroundStage({width,height,bias,mean:0,gain:1},Array(width*height).fill(.5));
const calibration:CameraOverlayCalibration={baseMagnitude:22,baseCount:1,baseSeconds:1,seconds:1,opticalMagnitudeFactor:0};
describe('CCD post-GDI low-byte overlay numerical contract,not a raster resampler',()=>{
 it.each(controls.cases)('matches independent Decimal95/IEEE32 synthetic control $name',c=>{
  const b=background(c.width,c.height,c.bias),scale=ccdOverlayScale(c.calibration),plan=ccdOverlayPlan(c.width,c.height,c.red,scale),out=addCCDOverlay(b,plan,c.draws);expect(plan.indices).toEqual(c.expected.indices);expect(out.pixels.map(bits)).toEqual(c.expected.bits);expect(out.localDrawsConsumed).toBe(c.draws.length);expect(out.histogram).toBe(b.histogram);expect(out.phase).toBe('ccd-overlay-before-sources');
  c.expected.means.forEach((m,i)=>expect(Math.abs(plan.means[i]-m)).toBeLessThanOrEqual(1e-12*Math.max(1,Math.abs(m))));
 });
 it('uses only exact low bytes with strict red37/38 threshold and one draw per positive level even for zero mean',()=>{
  const scale=ccdOverlayScale(calibration),p=ccdOverlayPlan(5,1,[0,37,38,100,255],scale);expect(p.indices).toEqual([2,3,4]);expect(p.means).toEqual([2,250,870]);
  const z=ccdOverlayPlan(1,1,[255],ccdOverlayScale({...calibration,baseCount:0}));expect(z.means).toEqual([0]);expect(addCCDOverlay(background(1),z,[.5]).localDrawsConsumed).toBe(1);expect(()=>addCCDOverlay(background(1),z,[])).toThrow('uniforms');
 });
 it('retains the initial histogram while subsequent point,extended and final stages accept the overlay plane',()=>{
  const b=background(5,5),overlay=addCCDOverlay(b,ccdOverlayPlan(5,5,Array(25).fill(38),ccdOverlayScale(calibration)),Array(25).fill(.5)),before=JSON.stringify(b);
  const point=cameraPointPlan({width:5,height:5,x:2,y:2,sigmaX:1,sigmaY:1,referencePeak:5,exposureScale:1}),p=addCameraPointSource(overlay,point,Array(point.indices.length).fill(.5));
  const extended=cameraExtendedPlan({width:5,height:5,x1:1,y1:2,x2:3,y2:2,sigmaX:1,sigmaY:1,referencePeak:5,exposureScale:1}),e=addCameraExtendedSource(overlay,extended,Array(extended.indices.length).fill(.5));
  for(const stage of[overlay,p,e]){const f=finalizeCameraPlane(stage,compiledCameraFinalParameters('ccd',1));expect(f.histogram).toBe(b.histogram);expect(f.pixels).not.toEqual(b.pixels);}expect(JSON.stringify(b)).toBe(before);
 });
 it('owns immutable raster/scale/plan/results and rejects a repeated,imported or forged phase/plan',()=>{
  const red=[38],scale={referenceScale:1,exposureScale:1},p=ccdOverlayPlan(1,1,red,scale),b=background(1),o=addCCDOverlay(b,p,[.5]);red[0]=0;scale.referenceScale=0;expect(p.redBytes).toEqual([38]);expect(p.means).toEqual([2]);
  for(const x of[p,p.redBytes,p.indices,p.means,p.scale,o,o.pixels])expect(Object.isFrozen(x)).toBe(true);expect(()=>addCCDOverlay(o as unknown as typeof b,p,[.5])).toThrow('plane');expect(()=>addCCDOverlay({...b,phase:'fits-import' as typeof b.phase},p,[.5])).toThrow('plane');for(const fake of[{...p},JSON.parse(JSON.stringify(p))])expect(()=>addCCDOverlay(b,fake,[.5])).toThrow('plan');
 });
 it('rejects malformed raster,scale,uniforms and late bad pixels atomically',()=>{
  for(const red of[[],[256],[-1],[NaN],[1.5]])expect(()=>ccdOverlayPlan(1,1,red,{referenceScale:1,exposureScale:1})).toThrow('raster');expect(()=>ccdOverlayPlan(1025,1,Array(1025).fill(0),{referenceScale:1,exposureScale:1})).toThrow('raster');
  for(const invalid of[{...calibration,baseSeconds:0},{...calibration,seconds:0},{...calibration,baseCount:-1},{...calibration,baseMagnitude:12.1},{...calibration,opticalMagnitudeFactor:NaN}])expect(()=>ccdOverlayScale(invalid)).toThrow('scale');
  const b=background(),p=ccdOverlayPlan(5,1,Array(5).fill(38),ccdOverlayScale(calibration)),before=JSON.stringify(b);for(const draws of[[],[.5,.5,.5,.5,NaN],[.5,.5,.5,.5,1]])expect(()=>addCCDOverlay(b,p,draws)).toThrow('uniforms');expect(JSON.stringify(b)).toBe(before);expect(()=>addCCDOverlay({...b,pixels:[1000,1000,1000,1000,NaN]},p,Array(5).fill(.5))).toThrow('plane');
 });
});
