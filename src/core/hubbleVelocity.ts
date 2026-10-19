import {measurementGalaxyTarget} from './galaxyIdentity';
import type { Measurement } from './spectrum';
/** VIREO0x54aef3..0x54aeff auto-fill and0x54b155..0x54b17f check.
 * Number projections of the immutable Extended constants, not modern
 * cosmological distance, relativistic Doppler velocity or an x87 oracle. */
export const HUBBLE_C_KM_S=299792.458;
export const HUBBLE_VELOCITY_TOLERANCE=.01;
export class HubbleVelocityError extends Error {
  constructor(readonly code:'redshift'|'velocity'|'zero-reference'|'precision-boundary'|'overflow'){super(`Hubble velocity contract: ${code}`);this.name='HubbleVelocityError';}
}
export type HubbleVelocity=Readonly<{zSingle:number;referenceKmS:number;storedKmS:number;storedHex:string}>;
export function hubbleVelocity(z:number):HubbleVelocity {
  const zSingle=Math.fround(z);
  if(!Number.isFinite(z)||!Number.isFinite(zSingle)||zSingle<=-1)throw new HubbleVelocityError('redshift');
  const referenceKmS=HUBBLE_C_KM_S*zSingle,storedKmS=Math.fround(referenceKmS);
  if(!Number.isFinite(storedKmS))throw new HubbleVelocityError('overflow');
  const bits=new DataView(new ArrayBuffer(4));bits.setFloat32(0,storedKmS,false);
  return Object.freeze({zSingle,referenceKmS,storedKmS,storedHex:bits.getUint32(0,false).toString(16).padStart(8,'0')});
}
/** Original check compares the entered Single against the unrounded Extended
 * c*zSingle reference, not the displayed/auto-filled Single. Original divide
 * by zero and FPU exception policy are not guessed. Boundary guard is new. */
export function checkHubbleVelocity(z:number,answer:number):Readonly<{accepted:boolean;answerSingle:number;relativeError:number}> {
  const {referenceKmS}=hubbleVelocity(z),answerSingle=Math.fround(answer);
  if(!Number.isFinite(answer)||!Number.isFinite(answerSingle))throw new HubbleVelocityError('velocity');
  if(referenceKmS===0)throw new HubbleVelocityError('zero-reference');
  const relativeError=Math.abs((answerSingle-referenceKmS)/referenceKmS);
  if(Math.abs(relativeError-HUBBLE_VELOCITY_TOLERANCE)<=1e-12)throw new HubbleVelocityError('precision-boundary');
  return Object.freeze({accepted:relativeError<=HUBBLE_VELOCITY_TOLERANCE,answerSingle,relativeError});
}
const cell=(value:string)=>'"'+(/^[\s]*[=+\-@]/.test(value)||/^[\t\r\n]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';
/** Separate new adapter export. Unsupported rows are retained with a status,
 * not silently omitted or assigned a finite substitute. Original log remains
 * schema2; values here are derived from its already stored zFloat32. */
export function hubbleVelocityCsv(rows:readonly Measurement[]):string {
  const traced=rows.some(r=>r.origin);
  const header='schema,id,object,file,sha256,z_float32,z_float32_hex,c_km_s,reference_cz_km_s,velocity_float32_km_s,velocity_float32_hex,status,numerical_policy'+(traced?',source_kind,acquisition_id,acquired_target_id':'');
  return header+'\r\n'+rows.map(row=>{
    let result:HubbleVelocity|undefined,status='derived';
    try{if(row.origin?.kind==='catalog-star-acquisition'){status='stellar-excluded';}else result=hubbleVelocity(row.zFloat32);}catch(e){status=e instanceof HubbleVelocityError?e.code:'invalid';}
    return [traced?2:1,row.id,cell(row.object),cell(row.file),row.sha256,row.zFloat32,row.zFloat32Hex,HUBBLE_C_KM_S,result?.referenceKmS??'',result?.storedKmS??'',result?.storedHex??'',status,'Number_x87_equivalence_unvalidated',...(traced?[row.origin?.kind??'imported-spectrum',row.origin?.acquisitionId??'',measurementGalaxyTarget(row.origin)??'']:[])].join(',');
  }).join('\r\n')+'\r\n';
}
