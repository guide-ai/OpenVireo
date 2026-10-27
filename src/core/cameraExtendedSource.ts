import type {CameraOverlayStage} from './cameraOverlay';
import {cameraScalarJitter,type CameraBackgroundStage} from './cameraBackground';
import type {CameraPointStage} from './cameraPointSource';
import {roundNearestEven} from './numericPolicy';

/** Explicit paired endpoints from0x524a6c..0x525095; no catalog admission. */
export class CameraExtendedError extends Error {
 constructor(readonly code:'parameters'|'geometry'|'budget'|'uniforms'|'plane'){super(`Camera extended contract: ${code}`);this.name='CameraExtendedError';}
}
export type CameraExtendedParameters=Readonly<{width:number;height:number;x1:number;y1:number;x2:number;y2:number;sigmaX:number;sigmaY:number;referencePeak:number;exposureScale:number}>;
const planBrand:unique symbol=Symbol('camera-extended-plan');
export type CameraExtendedPlan=Readonly<{
 [planBrand]:true;width:number;height:number;support:number;xRadius:number;yRadius:number;
 centerX:number;centerY:number;normalizedLength:number;geometricScale:number;spikesEnabled:boolean;
 gaussianVisits:number;indices:readonly number[];means:readonly number[];
}>;
export type CameraExtendedStage=Readonly<Omit<CameraBackgroundStage,'phase'>&{phase:'extended-sources-before-clipping'}>;
export type CameraSourcePlane=CameraBackgroundStage|CameraPointStage|CameraExtendedStage|CameraOverlayStage;
export const CAMERA_EXTENDED_VISIT_LIMIT=65_536;
/** Largest clipped Gaussian rectangle (the 1024^2 plane) plus a cross pass. */
export const CAMERA_STREAK_VISIT_LIMIT=1024*1024+65_536;

/** visitLimit [W]: web guard on ordered visits (default 65,536). The composer passes a plane-sized limit for moving
 * streaks, because the recovered Gaussian rectangle is clipped to the plane (front C review 2). */
export function cameraExtendedPlan(p:CameraExtendedParameters,visitLimit:number=CAMERA_EXTENDED_VISIT_LIMIT):CameraExtendedPlan {
 if(!p||typeof p!=='object')throw new CameraExtendedError('parameters');
 const {width,height,x1,y1,x2,y2,sigmaX,sigmaY,referencePeak,exposureScale}=p;
 if(!Number.isInteger(width)||width<1||width>1024||!Number.isInteger(height)||height<1||height>1024||
  [x1,y1,x2,y2].some(v=>!Number.isFinite(v)||Math.abs(v)>1e6)||
  !Number.isFinite(sigmaX)||sigmaX<=0||sigmaX>1024||!Number.isFinite(sigmaY)||sigmaY<=0||sigmaY>1024||
  !Number.isFinite(referencePeak)||referencePeak<0||referencePeak>1e12||!Number.isFinite(exposureScale)||exposureScale<0||exposureScale>1e6)throw new CameraExtendedError('parameters');
 const dx=(x2-x1)/sigmaX,dy=(y2-y1)/sigmaY,d=Math.sqrt(dx*dx+dy*dy),scale=Math.sqrt(Math.sqrt(d+1));
 if(!Number.isFinite(d)||d<=0||!Number.isFinite(scale))throw new CameraExtendedError('geometry');
 const hx=(x2-x1)/2,hy=(y2-y1)/2,cx=roundNearestEven(x1+hx),cy=roundNearestEven(y1+hy);
 let support=3;while(Math.exp(-(support*support)/2)*referencePeak>1)support++;
 const rx=roundNearestEven(Math.abs(hx)+support*sigmaX),ry=roundNearestEven(Math.abs(hy)+support*sigmaY);
 if(rx<1||ry<1)throw new CameraExtendedError('geometry');
 const indices:number[]=[],means:number[]=[],time=exposureScale/scale,peak=time*referencePeak;
 const visit=(px:number,py:number,mean:number)=>{
  if(!Number.isFinite(mean)||mean<0)throw new CameraExtendedError('geometry');
  if(indices.length===visitLimit)throw new CameraExtendedError('budget');
  indices.push(py*width+px);means.push(mean);
 };
 const bounds=(rX:number,rY:number)=>({x0:Math.max(0,cx-rX),x1:Math.min(width-1,cx+rX),y0:Math.max(0,cy-rY),y1:Math.min(height-1,cy+rY)});
 const g=bounds(rx,ry);
 if(!Number.isInteger(visitLimit)||visitLimit<1||visitLimit>CAMERA_STREAK_VISIT_LIMIT)throw new CameraExtendedError('parameters');
 if(Math.max(0,g.x1-g.x0+1)*Math.max(0,g.y1-g.y0+1)>visitLimit)throw new CameraExtendedError('budget');
 for(let py=g.y0;py<=g.y1;py++)for(let px=g.x0;px<=g.x1;px++){
  const ax=(px-x1)/sigmaX,ay=(py-y1)/sigmaY,bx=(px-x2)/sigmaX,by=(py-y2)/sigmaY;
  const a=ax*ax+ay*ay,b=bx*bx+by*by,t=(d*d+(b-a))/(2*d);
  // Retain the recovered subtraction, including finite cancellation effects.
  const rho=t<0?b:t>d?a:b-t*t;
  visit(px,py,Math.exp(-rho/2)*peak);
 }
 const gaussianVisits=indices.length,spikesEnabled=scale<1.25;
 if(spikesEnabled){
  const s=bounds(4*rx,4*ry),multipliers=[1,1.4,2,4],spikeAmplitude=.01*peak;
  for(let py=s.y0;py<=s.y1;py++)for(let px=s.x0;px<=s.x1;px++){
   const ax=Math.abs(px-cx),ay=Math.abs(py-cy);if(ax>3&&ay>3)continue;
   let ratio=0;if(ax<=3)ratio=(ay*multipliers[ax])/ry;
   if(ay<=3)ratio=(ax*multipliers[ay])/rx;
   if(ratio<=0)continue;
   const e=Math.exp(-ratio);visit(px,py,(e*e)*(time*spikeAmplitude));
  }
 }
 return Object.freeze({[planBrand]:true as const,width,height,support,xRadius:rx,yRadius:ry,centerX:cx,centerY:cy,normalizedLength:d,geometricScale:scale,spikesEnabled,gaussianVisits,indices:Object.freeze(indices),means:Object.freeze(means)});
}

/** One explicit uniform per ordered visit; Single after each addition. */
export function addCameraExtendedSource(stage:CameraSourcePlane,plan:CameraExtendedPlan,uniforms:readonly number[]):CameraExtendedStage {
 if(!plan||plan[planBrand]!==true)throw new CameraExtendedError('geometry');
 if(!stage||!['background-before-sources','ccd-overlay-before-sources','point-sources-before-clipping','extended-sources-before-clipping'].includes(stage.phase)||stage.width!==plan.width||stage.height!==plan.height||
  !Array.isArray(stage.pixels)||stage.pixels.length!==plan.width*plan.height||!stage.histogram||stage.histogram.binWidth!==256||!Array.isArray(stage.histogram.bins)||stage.histogram.bins.length!==256||stage.histogram.count!==plan.width*plan.height)throw new CameraExtendedError('plane');
 const pixels=Array.from(stage.pixels);if(pixels.some(p=>!Number.isFinite(p)||!Object.is(Math.fround(p),p)))throw new CameraExtendedError('plane');
 if(!Array.isArray(uniforms)||uniforms.length!==plan.indices.length)throw new CameraExtendedError('uniforms');
 const draws=Array.from(uniforms);if(draws.some(u=>!Number.isFinite(u)||u<0||u>=1))throw new CameraExtendedError('uniforms');
 for(let i=0;i<plan.indices.length;i++){
  const at=plan.indices[i],value=Math.fround(pixels[at]+cameraScalarJitter(plan.means[i],draws[i]));
  if(!Number.isFinite(value))throw new CameraExtendedError('plane');pixels[at]=value;
 }
 return Object.freeze({phase:'extended-sources-before-clipping' as const,width:stage.width,height:stage.height,localDrawsConsumed:draws.length,pixels:Object.freeze(pixels),histogram:stage.histogram});
}
