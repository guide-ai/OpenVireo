import recovered from '../../docs/CAMERA-PROJECTION-PROVENANCE.json';
import {compiledCameraInformation,type CameraKind} from './cameraInformation';
import {opticalProfile,opticalIndex,type OpticalIndex} from './opticalTelescope';
export type CameraProjectionContext=Readonly<{kind:CameraKind;opticalIndex:OpticalIndex;width:number;height:number;centerRaRadians:number;centerDecRadians:number;centerCosDec:number;centerSinDec:number;seeingEnabled:boolean;seeingWidthRadians:number;halfX:number;halfY:number;originX:number;originY:number;stepX:number;stepY:number}>;
export type CameraSourceProjection=Readonly<{planeX:number;planeY:number;denominator:number;jitteredRaRadians:number;jitteredDecRadians:number;inside:boolean;pixelX:number|null;pixelY:number|null;localDrawsConsumed:2}>;
const contexts=new WeakSet<object>();
const k=Object.freeze(Object.fromEntries(Object.entries(recovered.constants).map(([name,c])=>[name,c.numberPolicyValue])));
/** Compiled reference owners only;seeing enable is explicit,not inferred from
 * an image or live camera. Source initializers0x5220f4/0x51dd10. */
export function compiledCameraProjection(kind:unknown,index:unknown,center:Readonly<{raHours:number;decDegrees:number}>,seeingEnabled:boolean):CameraProjectionContext {
 const camera=compiledCameraInformation(kind),i=opticalIndex(index),optics=opticalProfile(i);
 if(!center||!Number.isFinite(center.raHours)||center.raHours<0||center.raHours>24||!Number.isFinite(center.decDegrees)||Math.abs(center.decDegrees)>90||typeof seeingEnabled!=='boolean')throw new Error('Unsupported projection reference context');
 const centerRaRadians=(center.raHours*k.hoursToDegrees)*k.radiansPerDegree,centerDecRadians=center.decDegrees*k.radiansPerDegree;
 const halfX=((camera.width*camera.pixelWidthMicrons)*k.micronsToMM)/(k.two*optics.focalLengthMM),halfY=((camera.height*camera.pixelHeightMicrons)*k.micronsToMM)/(k.two*optics.focalLengthMM);
 const originX=-halfX,originY=halfY;
 const context=Object.freeze({kind:camera.kind,opticalIndex:i,width:camera.width,height:camera.height,centerRaRadians,centerDecRadians,centerCosDec:Math.cos(centerDecRadians),centerSinDec:Math.sin(centerDecRadians),seeingEnabled,seeingWidthRadians:seeingEnabled?(k.seeingNumerator*optics.seeingArcsec)/k.seeingDenominator:0,halfX,halfY,originX,originY,stepX:(originX*k.negativeTwo)/camera.width,stepY:(originY*k.negativeTwo)/camera.height});
 contexts.add(context);return context;
}
function owned(context:CameraProjectionContext){if(!context||!contexts.has(context))throw new Error('Projection reference ownership mismatch');}
/** Source0x522698 rectangular comparisons;no new front-hemisphere predicate. */
export function cameraProjectionInBounds(context:CameraProjectionContext,planeX:number,planeY:number):boolean {
 owned(context);if(!Number.isFinite(planeX)||!Number.isFinite(planeY))throw new Error('Nonfinite projection plane');
 return planeX>= -context.halfX&&planeX<=context.halfX&&planeY>= -context.halfY&&planeY<=context.halfY;
}
/** Two explicit local uniforms,RA then DEC,even when jitter width is zero.
 * Number/Math trig is declared web policy,not x87/global RNG equivalence. */
export function projectCameraSource(context:CameraProjectionContext,source:Readonly<{raHours:number;decDegrees:number}>,uniforms:readonly number[]):CameraSourceProjection {
 owned(context);
 if(!source||!Number.isFinite(source.raHours)||Math.abs(source.raHours)>48||!Number.isFinite(source.decDegrees)||Math.abs(source.decDegrees)>180)throw new Error('Unsupported projection source coordinates');
 if(!Array.isArray(uniforms)||uniforms.length!==2||uniforms.some(u=>!Number.isFinite(u)||u<0||u>=1))throw new Error('Exactly two explicit projection uniforms required');
 const jitteredRaRadians=(source.raHours*k.hoursToDegrees)*k.radiansPerDegree+(uniforms[0]-k.halfUniform)*context.seeingWidthRadians;
 const jitteredDecRadians=source.decDegrees*k.radiansPerDegree+(uniforms[1]-k.halfUniform)*context.seeingWidthRadians;
 const cosDec=Math.cos(jitteredDecRadians),sinDec=Math.sin(jitteredDecRadians),delta=jitteredRaRadians-context.centerRaRadians,cosDelta=Math.cos(delta),sinDelta=Math.sin(delta);
 const denominator=((context.centerCosDec*cosDec)*cosDelta)+(context.centerSinDec*sinDec);
 const planeX=-(cosDec*sinDelta)/denominator,planeY=-(((context.centerSinDec*cosDec)*cosDelta)-(context.centerCosDec*sinDec))/denominator;
 if(!Number.isFinite(denominator)||!Number.isFinite(planeX)||!Number.isFinite(planeY))throw new Error('Nonfinite projection result');
 const inside=cameraProjectionInBounds(context,planeX,planeY),pixelX=inside?(planeX-context.originX)/context.stepX:null,pixelY=inside?(planeY-context.originY)/context.stepY:null;
 return Object.freeze({planeX,planeY,denominator,jitteredRaRadians,jitteredDecRadians,inside,pixelX,pixelY,localDrawsConsumed:2 as const});
}
