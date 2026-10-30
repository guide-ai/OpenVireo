import type {CameraOverlayStage} from './cameraOverlay';
import {cameraScalarJitter,type CameraBackgroundStage} from './cameraBackground';
import {roundNearestEven} from './numericPolicy';
import type {CameraExtendedStage} from './cameraExtendedSource';
/** Source0x5245d0..0x524a41: mathematical point stage only,with explicit peak,
 * geometry and local draws. No catalog/source/time/seed authority is inferred. */
export class CameraPointError extends Error {
 constructor(readonly code:'parameters'|'geometry'|'budget'|'uniforms'|'plane'){super(`Camera point contract: ${code}`);this.name='CameraPointError';}
}
export type CameraPointParameters=Readonly<{width:number;height:number;x:number;y:number;sigmaX:number;sigmaY:number;referencePeak:number;exposureScale:number}>;
const planBrand:unique symbol=Symbol('camera-point-plan');
export type CameraPointPlan=Readonly<{
 [planBrand]:true;width:number;height:number;support:number;xRadius:number;yRadius:number;
 gaussianVisits:number;indices:readonly number[];means:readonly number[];
}>;
export type CameraPointStage=Readonly<Omit<CameraBackgroundStage,'phase'>&{phase:'point-sources-before-clipping'}>;
type CameraPlane=CameraBackgroundStage|CameraPointStage|CameraExtendedStage|CameraOverlayStage;
export const CAMERA_POINT_VISIT_LIMIT=65_536;
/** Bounded admission protects loops and unsupported zero-radius divisions.
 * nearest/even geometry and Number exp/constants are explicit web policies. */
/** `maxReferencePeak` is the web admission bound (1e12; the saturated tail passes its own Float32-safe bound). */
export function cameraPointPlan(p:CameraPointParameters,maxReferencePeak=1e12):CameraPointPlan {
 if(!p||typeof p!=='object')throw new CameraPointError('parameters');
 const {width,height,x,y,sigmaX,sigmaY,referencePeak,exposureScale}=p;
 if(!Number.isInteger(width)||width<1||width>1024||!Number.isInteger(height)||height<1||height>1024||
   !Number.isFinite(x)||Math.abs(x)>1e6||!Number.isFinite(y)||Math.abs(y)>1e6||
   !Number.isFinite(sigmaX)||sigmaX<=0||sigmaX>1024||!Number.isFinite(sigmaY)||sigmaY<=0||sigmaY>1024||
   !Number.isFinite(referencePeak)||referencePeak<0||referencePeak>maxReferencePeak||!Number.isFinite(exposureScale)||exposureScale<0||exposureScale>1e6)throw new CameraPointError('parameters');
 let support=3;
 // Original support depends on reference peak,not exposure scale.
 while(Math.exp(-(support*support)/2)*referencePeak>1)support++;
 const cx=roundNearestEven(x),cy=roundNearestEven(y),rx=roundNearestEven(support*sigmaX),ry=roundNearestEven(support*sigmaY);
 if(rx<1||ry<1)throw new CameraPointError('geometry');
 const indices:number[]=[],means:number[]=[],peak=exposureScale*referencePeak;
 const visit=(px:number,py:number,mean:number)=>{if(indices.length===CAMERA_POINT_VISIT_LIMIT)throw new CameraPointError('budget');indices.push(py*width+px);means.push(mean);};
 const bounds=(rX:number,rY:number)=>({x0:Math.max(0,cx-rX),x1:Math.min(width-1,cx+rX),y0:Math.max(0,cy-rY),y1:Math.min(height-1,cy+rY)});
 const g=bounds(rx,ry);
 if(Math.max(0,g.x1-g.x0+1)*Math.max(0,g.y1-g.y0+1)>CAMERA_POINT_VISIT_LIMIT)throw new CameraPointError('budget');
 for(let py=g.y0;py<=g.y1;py++)for(let px=g.x0;px<=g.x1;px++){
  const dx=(px-x)/sigmaX,dy=(py-y)/sigmaY;
  visit(px,py,Math.exp(-(dx*dx+dy*dy)/2)*peak);
 }
 const gaussianVisits=indices.length,s=bounds(4*rx,4*ry),multipliers=[1,1.4,2,4],spikeAmplitude=.01*peak;
 for(let py=s.y0;py<=s.y1;py++)for(let px=s.x0;px<=s.x1;px++){
  const ax=Math.abs(px-cx),ay=Math.abs(py-cy);if(ax>3&&ay>3)continue;
  let ratio=0;
  if(ax<=3)ratio=(ay*multipliers[ax])/ry;
  // Source explicitly overwrites the first ratio. Do not symmetrize or sum.
  if(ay<=3)ratio=(ax*multipliers[ay])/rx;
  if(ratio<=0)continue;
  const e=Math.exp(-ratio);
  // Native coefficient contains exposureScale twice;not a normalized PSF.
  visit(px,py,(e*e)*(exposureScale*spikeAmplitude));
 }
 return Object.freeze({[planBrand]:true as const,width,height,support,xRadius:rx,yRadius:ry,gaussianVisits,indices:Object.freeze(indices),means:Object.freeze(means)});
}
/** Gaussian then thin-cross additions,one explicit uniform per visited pixel,
 * Single after EACH addition. Original pre-source histogram remains owned. */
export function addCameraPointSource(stage:CameraPlane,plan:CameraPointPlan,uniforms:readonly number[]):CameraPointStage {
 if(!plan||plan[planBrand]!==true)throw new CameraPointError('geometry');
 if(!stage||!['background-before-sources','ccd-overlay-before-sources','point-sources-before-clipping','extended-sources-before-clipping'].includes(stage.phase)||stage.width!==plan.width||stage.height!==plan.height||
  !Array.isArray(stage.pixels)||stage.pixels.length!==plan.width*plan.height||!stage.histogram||stage.histogram.binWidth!==256||!Array.isArray(stage.histogram.bins)||stage.histogram.bins.length!==256||stage.histogram.count!==plan.width*plan.height)throw new CameraPointError('plane');
 const original=Array.from(stage.pixels);if(original.some(p=>!Number.isFinite(p)||!Object.is(Math.fround(p),p)))throw new CameraPointError('plane');
 if(!Array.isArray(uniforms)||uniforms.length!==plan.indices.length)throw new CameraPointError('uniforms');
 const draws=Array.from(uniforms);if(draws.some(u=>!Number.isFinite(u)||u<0||u>=1))throw new CameraPointError('uniforms');
 const pixels=original;
 for(let i=0;i<plan.indices.length;i++){
  const at=plan.indices[i],value=Math.fround(pixels[at]+cameraScalarJitter(plan.means[i],draws[i]));
  if(!Number.isFinite(value))throw new CameraPointError('plane');pixels[at]=value;
 }
 return Object.freeze({phase:'point-sources-before-clipping' as const,width:stage.width,height:stage.height,localDrawsConsumed:draws.length,pixels:Object.freeze(pixels),histogram:stage.histogram});
}
