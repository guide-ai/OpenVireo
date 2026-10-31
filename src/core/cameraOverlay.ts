import {cameraScalarJitter,type CameraBackgroundStage} from './cameraBackground';
/** Post-GDI low-byte numerical stage521914..521a43 only. No FITS conversion,
 * luminance/resampler,livecalibrationoractualimageauthorityisassumed. */
export class CameraOverlayError extends Error {
 constructor(readonly code:'scale'|'raster'|'plan'|'plane'|'uniforms'|'range'){super(`CCD overlay contract: ${code}`);this.name='CameraOverlayError';}
}
export type CameraOverlayScale=Readonly<{referenceScale:number;exposureScale:number}>;
export type CameraOverlayCalibration=Readonly<{baseMagnitude:number;baseCount:number;baseSeconds:number;seconds:number;opticalMagnitudeFactor:number}>;
export type CameraOverlayStage=Readonly<Omit<CameraBackgroundStage,'phase'>&{phase:'ccd-overlay-before-sources'}>;
const brand:unique symbol=Symbol('ccd-post-gdi-overlay-plan');
const plans=new WeakSet<object>();
export type CameraOverlayPlan=Readonly<{[brand]:true;width:number;height:number;redBytes:readonly number[];indices:readonly number[];means:readonly number[];scale:CameraOverlayScale}>;
const int32=(n:number)=>Number.isInteger(n)&&n>=0&&n<=0x7fffffff;
/** Explicit inputs from two distinct native owners. No selected-optics or
 * compiled default is substituted for unknown root+3818 overlay context. */
export function ccdOverlayScale(p:CameraOverlayCalibration):CameraOverlayScale {
 if(!p||!Number.isFinite(p.baseMagnitude)||Math.abs(p.baseMagnitude)>50||!Object.is(p.baseMagnitude,Math.fround(p.baseMagnitude))||!Number.isFinite(p.opticalMagnitudeFactor)||Math.abs(p.opticalMagnitudeFactor)>50||!Object.is(p.opticalMagnitudeFactor,Math.fround(p.opticalMagnitudeFactor))||!int32(p.baseCount)||!int32(p.baseSeconds)||p.baseSeconds===0||!int32(p.seconds)||p.seconds===0)throw new CameraOverlayError('scale');
 const delta=(p.baseMagnitude-22)+p.opticalMagnitudeFactor,referenceScale=p.baseCount/Math.pow(10,-delta/2.5),exposureScale=p.seconds/p.baseSeconds;
 if(!Number.isFinite(referenceScale)||referenceScale>1e12||exposureScale>1e6)throw new CameraOverlayError('scale');
 return Object.freeze({referenceScale,exposureScale});
}
/** 0x5219c4..0x5219f4: level = r · Single 4 − Single 150; only a strict positive level is drawn. */
export const ccdOverlayLevel=(red:number)=>red*4-150;
/** 0x521a09..: mean = (exposureScale · referenceScale) · level. */
export const ccdOverlayMean=(scale:CameraOverlayScale,level:number)=>(scale.exposureScale*scale.referenceScale)*level;
/** Front C6: the same stage applied in place to the composer's Single plane (a Float32Array store rounds like Math.fround), one
 * draw per positive level in row-major order. Returns the number of draws. */
export function applyCcdOverlayInPlace(plane:Float32Array,redBytes:Uint8Array,scale:CameraOverlayScale,next:()=>number):number{
 if(redBytes.length!==plane.length)throw new CameraOverlayError('raster');
 let draws=0;
 for(let i=0;i<redBytes.length;i++){const level=ccdOverlayLevel(redBytes[i]);if(level<=0)continue;plane[i]=plane[i]+cameraScalarJitter(ccdOverlayMean(scale,level),next());draws++;}
 return draws;
}
/** Row-major exact post-GDI GetPixel low bytes. Threshold controls draws,
 * including one draw for positive level when the resulting mean is zero. */
export function ccdOverlayPlan(width:number,height:number,redBytes:readonly number[],scale:CameraOverlayScale):CameraOverlayPlan {
 if(!Number.isInteger(width)||width<1||width>1024||!Number.isInteger(height)||height<1||height>1024||!Array.isArray(redBytes)||redBytes.length!==width*height)throw new CameraOverlayError('raster');
 if(!scale||!Number.isFinite(scale.referenceScale)||scale.referenceScale<0||scale.referenceScale>1e12||!Number.isFinite(scale.exposureScale)||scale.exposureScale<0||scale.exposureScale>1e6)throw new CameraOverlayError('scale');
 const owned=Array.from(redBytes);if(owned.some(b=>!Number.isInteger(b)||b<0||b>255))throw new CameraOverlayError('raster');
 const indices:number[]=[],means:number[]=[];for(let i=0;i<owned.length;i++){const level=ccdOverlayLevel(owned[i]);if(level<=0)continue;indices.push(i);means.push(ccdOverlayMean(scale,level));}
 const plan=Object.freeze({[brand]:true as const,width,height,redBytes:Object.freeze(owned),indices:Object.freeze(indices),means:Object.freeze(means),scale:Object.freeze({referenceScale:scale.referenceScale,exposureScale:scale.exposureScale})});plans.add(plan);return plan;
}
/** The original overlay occurs once after background statistics,before sources.
 * Single after each addition;initial owned histogram remains unchanged. */
export function addCCDOverlay(stage:CameraBackgroundStage,plan:CameraOverlayPlan,uniforms:readonly number[]):CameraOverlayStage {
 if(!plan||!plans.has(plan))throw new CameraOverlayError('plan');
 if(!stage||stage.phase!=='background-before-sources'||stage.width!==plan.width||stage.height!==plan.height||!Array.isArray(stage.pixels)||stage.pixels.length!==plan.width*plan.height||!stage.histogram||stage.histogram.binWidth!==256||!Array.isArray(stage.histogram.bins)||stage.histogram.bins.length!==256||stage.histogram.count!==plan.width*plan.height)throw new CameraOverlayError('plane');
 const pixels=Array.from(stage.pixels);if(pixels.some(v=>!Number.isFinite(v)||!Object.is(v,Math.fround(v))))throw new CameraOverlayError('plane');
 if(!Array.isArray(uniforms)||uniforms.length!==plan.indices.length)throw new CameraOverlayError('uniforms');const draws=Array.from(uniforms);if(draws.some(u=>!Number.isFinite(u)||u<0||u>=1))throw new CameraOverlayError('uniforms');
 for(let i=0;i<plan.indices.length;i++){const index=plan.indices[i],pixel=Math.fround(pixels[index]+cameraScalarJitter(plan.means[i],draws[i]));if(!Number.isFinite(pixel))throw new CameraOverlayError('range');pixels[index]=pixel;}
 return Object.freeze({phase:'ccd-overlay-before-sources' as const,width:stage.width,height:stage.height,localDrawsConsumed:draws.length,pixels:Object.freeze(pixels),histogram:stage.histogram});
}
