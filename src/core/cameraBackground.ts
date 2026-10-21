import {compiledCameraInformation, type CameraKind} from './cameraInformation';
import preparation from '../../docs/CAMERA-PREPARATION-PROVENANCE.json';
import {roundNearestEven} from './numericPolicy';

/** Initial background only, before sources/overlay/well/gain/ADC clipping.
 * Explicit uniforms are a supplied local segment, never an invented native seed.
 * Number + Single store + nearest/even are declared port policies, not x87 parity.
 * See NATIVE-CAMERA-BACKGROUND-01 and docs/CAMERA-BACKGROUND.md. */
export class CameraBackgroundError extends Error {
 constructor(readonly code:'parameters'|'uniforms'|'range'|'precision') {
  super(`Camera background contract: ${code}`);this.name='CameraBackgroundError';
 }
}
export type CameraBackgroundParameters=Readonly<{width:number;height:number;mean:number;bias:number;gain:number}>;
export type CameraBackgroundStage=Readonly<{
 phase:'background-before-sources';width:number;height:number;localDrawsConsumed:number;
 pixels:readonly number[];
 histogram:Readonly<{binWidth:256;bins:readonly number[];count:number;sum:number;sumSquares:number}>;
}>;
const int32=(n:number)=>Number.isInteger(n)&&n>=-0x80000000&&n<=0x7fffffff;

/** Both original preparation routes read the CCD background record. IR's own
 * dimensions and gain remain separate. Compiled defaults only; no host options. */
export function compiledCameraBackgroundParameters(kind:CameraKind,seconds:number,gain:number):CameraBackgroundParameters {
 const dimensions=compiledCameraInformation(kind),background=compiledCameraInformation('ccd');
 const gains=preparation.forms.find(r=>r.kind===kind)!.gainsElectronsPerADU;
 if(!int32(seconds)||seconds<=0||!gains.includes(gain))throw new CameraBackgroundError('parameters');
 return Object.freeze({width:dimensions.width,height:dimensions.height,mean:background.readNoiseElectronsPerPixel+(background.cooling==='thermoelectric'?seconds*background.darkNoiseElectronsPerPixelSecond:0),bias:background.biasElectronsPerPixel,gain});
}

/** 0x520ec0: b - (3*sqrt(b))/2 + uniform*(3*sqrt(b)). It consumes one draw
 * even at b=0. This is a recovered scalar jitter, not Poisson/Gaussian sampling. */
export function cameraScalarJitter(mean:number,uniform:number):number {
 if(!Number.isFinite(mean)||mean<0)throw new CameraBackgroundError('parameters');
 if(!Number.isFinite(uniform)||uniform<0||uniform>=1)throw new CameraBackgroundError('uniforms');
 const spread=3*Math.sqrt(mean);
 return (mean-spread/2)+uniform*spread;
}

/** 0x521635/0x51e4f3, row-major. Single storage precedes the gain conversion
 * and histogram insertion. No final-image statistics or global RNG state implied. */
export function cameraBackgroundStage(parameters:CameraBackgroundParameters,uniforms:readonly number[]):CameraBackgroundStage {
 if(!parameters||typeof parameters!=='object')throw new CameraBackgroundError('parameters');
 const {width,height,mean,bias,gain}=parameters;
 if(!Number.isInteger(width)||width<1||width>1024||!Number.isInteger(height)||height<1||height>1024||
    !Number.isFinite(mean)||mean<0||!int32(bias)||!int32(gain)||gain<=0)throw new CameraBackgroundError('parameters');
 const count=width*height;
 if(!Array.isArray(uniforms)||uniforms.length!==count)throw new CameraBackgroundError('uniforms');
 // Dense owned copy rejects sparse/nonfinite/late invalid inputs before constructing output.
 const draws=Array.from(uniforms);
 if(draws.some(u=>!Number.isFinite(u)||u<0||u>=1))throw new CameraBackgroundError('uniforms');
 const pixels:number[]=[],bins:number[]=Array(256).fill(0);let sum=0,sumSquares=0;
 for(let i=0;i<count;i++){
  const pixel=Math.fround(cameraScalarJitter(mean,draws[i])+bias),adu=roundNearestEven(pixel/gain);
  if(!Number.isFinite(pixel)||!int32(adu))throw new CameraBackgroundError('range');
  pixels.push(pixel);
  // 0x55fb48 clamps negative integer inputs before bins AND moment sums.
  const sample=Math.max(0,adu),square=sample*sample;
  if(!Number.isSafeInteger(square)||!Number.isSafeInteger(sum+sample)||!Number.isSafeInteger(sumSquares+square))throw new CameraBackgroundError('precision');
  bins[Math.min(255,Math.floor(sample/256))]++;sum+=sample;sumSquares+=square;
 }
 return Object.freeze({phase:'background-before-sources' as const,width,height,localDrawsConsumed:count,pixels:Object.freeze(pixels),histogram:Object.freeze({binWidth:256 as const,bins:Object.freeze(bins),count,sum,sumSquares})});
}
