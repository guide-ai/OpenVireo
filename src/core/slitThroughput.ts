import { galaxySlitFraction } from './photons';

/**0x50f338..0x50f467, selected defined branches only. Pointing is a Number
 * projection of the original Extended fields, object coordinates are Double.
 * This does not recover a selected object or manufacture its detector pixels. */
export const NATIVE_STELLAR_RA_LIMIT_HOURS=.00028;
export const NATIVE_STELLAR_DEC_LIMIT_DEGREES=.0064;
export class SlitThroughputError extends Error {
  constructor(readonly code:'type'|'coordinate'|'level'|'precision-required'){
    super(`Slit throughput contract: ${code}`);this.name='SlitThroughputError';
  }
}
export type NativeSlitPosition=Readonly<{raHours:number;decDegrees:number}>;
export type NativeSlitInput=
  | Readonly<{objectPresent:false}>
  | Readonly<{objectPresent:true;objectType:1;pixelLevel:number}>
  | Readonly<{objectPresent:true;objectType:0|2|3;pixelLevel:number;object:NativeSlitPosition;pointing:NativeSlitPosition}>;
function position(value:NativeSlitPosition):void {
  if(!value||!Number.isFinite(value.raHours)||value.raHours<0||value.raHours>24||!Number.isFinite(value.decDegrees)||Math.abs(value.decDegrees)>90)throw new SlitThroughputError('coordinate');
}
/** Conservative new support guard around a projected Extended comparison.
 * It is not a measured x87 error bound. No equality decision is silently
 * inferred from rounding the original Extended constant to Number. */
function within(a:number,b:number,limit:number):boolean {
  const difference=Math.abs(a-b),guard=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
  if(Math.abs(difference-limit)<=guard)throw new SlitThroughputError('precision-required');
  return difference<limit;
}
/** Angular part only. A rejection proves stellar throughput zero for every
 * valid pixel level; it does not manufacture or sample a detector image. */
export function nativeStellarAngularAdmission(object:NativeSlitPosition,pointing:NativeSlitPosition):boolean {
  position(object);position(pointing);
  return within(object.raHours,pointing.raHours,NATIVE_STELLAR_RA_LIMIT_HOURS)&&within(object.decDegrees,pointing.decDegrees,NATIVE_STELLAR_DEC_LIMIT_DEGREES);
}
/** Presence zero ->0. Type1 uses galaxy level/200 squared, saturated at1.
 * Types0/2/3 require BOTH strict raw-coordinate cuts and pixelLevel>0, then
 * return1. RA is not wrapped, multiplied by15 or cosine-corrected here.
 * Other present types have no defined local result in the inspected body;
 * reject them rather than interpreting type4 as a recovered sky return. */
export function nativeObjectSlitFraction(input:NativeSlitInput):number {
  if(!input||typeof input!=='object')throw new SlitThroughputError('type');
  if(input.objectPresent===false)return 0;
  if(input.objectPresent!==true||![0,1,2,3].includes(input.objectType))throw new SlitThroughputError('type');
  if(!Number.isInteger(input.pixelLevel)||input.pixelLevel<0||input.pixelLevel>765)throw new SlitThroughputError('level');
  if(input.objectType===1)return galaxySlitFraction(input.pixelLevel);
  if(!nativeStellarAngularAdmission(input.object,input.pointing))return 0;
  return input.pixelLevel>0?1:0;
}
