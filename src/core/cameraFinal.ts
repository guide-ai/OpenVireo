import {compiledCameraInformation,type CameraKind} from './cameraInformation';
import preparation from '../../docs/CAMERA-PREPARATION-PROVENANCE.json';
import type {CameraBackgroundStage} from './cameraBackground';
import type {CameraPointStage} from './cameraPointSource';
import type {CameraExtendedStage} from './cameraExtendedSource';

/** Final numerical conversion only. Source CCD521b3b../IR51e60a..,
 * complete parents pinned in CAMERA-FINAL-PROVENANCE. No acquisition/header. */
export class CameraFinalError extends Error {
 constructor(readonly code:'parameters'|'pixel'|'plane'){super(`Camera final contract: ${code}`);this.name='CameraFinalError';}
}
export type CameraFinalParameters=Readonly<{well:number;gain:number;adBits:number}>;
export type CameraUnclippedPlane=CameraBackgroundStage|CameraPointStage|CameraExtendedStage;
export type CameraFinalStage=Readonly<Omit<CameraBackgroundStage,'phase'>&{
 phase:'well-gain-adc-only';parameters:CameraFinalParameters;
}>;
const gains=[1,2,4,5,8];
/** Explicit bounded adapter domain,not native instructor validation parity. */
export function cameraFinalParameters(well:number,gain:number,adBits:number):CameraFinalParameters {
 if(!Number.isInteger(well)||well<1||well>0x7fffffff||!gains.includes(gain)||!Number.isInteger(adBits)||adBits<1||adBits>32)throw new CameraFinalError('parameters');
 return Object.freeze({well,gain,adBits});
}
export function compiledCameraFinalParameters(kind:CameraKind,gain:number):CameraFinalParameters {
 const r=compiledCameraInformation(kind),positions=preparation.forms.find(r=>r.kind===kind)!.gainsElectronsPerADU;
 if(!positions.includes(gain))throw new CameraFinalError('parameters');
 return cameraFinalParameters(r.wellDepthElectrons,gain,r.adBits);
}
const single=(v:number)=>Number.isFinite(v)&&Object.is(v,Math.fround(v));
function parameters(p:CameraFinalParameters):CameraFinalParameters {
 if(!p||typeof p!=='object')throw new CameraFinalError('parameters');
 return cameraFinalParameters(p.well,p.gain,p.adBits);
}
function convert(v:number,p:CameraFinalParameters,limit:number):number {
 // Preserve operation order,negative pixels and signed zero. No FISTP here.
 if(v>p.well)v=p.well;
 v/=p.gain;
 if(v>limit)v=limit;
 return Math.fround(v);
}
export function cameraFinalPixel(value:number,p:CameraFinalParameters):number {
 const checked=parameters(p);if(!single(value))throw new CameraFinalError('pixel');
 return convert(value,checked,2**checked.adBits);
}
/** Pure phase transition after background or source additions;rejects
 * already converted/imported/unsupported planes.
 * Preserves the exact pre-source histogram and consumes no random samples. */
export function finalizeCameraPlane(stage:CameraUnclippedPlane,p:CameraFinalParameters):CameraFinalStage {
 const checked=parameters(p);
 if(!stage||!['background-before-sources','point-sources-before-clipping','extended-sources-before-clipping'].includes(stage.phase)||
  !Number.isInteger(stage.width)||stage.width<1||stage.width>1024||!Number.isInteger(stage.height)||stage.height<1||stage.height>1024||
  !Array.isArray(stage.pixels)||stage.pixels.length!==stage.width*stage.height||!stage.histogram||stage.histogram.binWidth!==256||
  !Array.isArray(stage.histogram.bins)||stage.histogram.bins.length!==256||stage.histogram.count!==stage.width*stage.height)throw new CameraFinalError('plane');
 const owned=Array.from(stage.pixels);if(owned.some(v=>!single(v)))throw new CameraFinalError('pixel');
 const limit=2**checked.adBits,pixels=owned.map(v=>convert(v,checked,limit));
 return Object.freeze({phase:'well-gain-adc-only' as const,width:stage.width,height:stage.height,localDrawsConsumed:0,pixels:Object.freeze(pixels),histogram:stage.histogram,parameters:checked});
}
