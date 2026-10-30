/** Front R2: the field-object input of a camera exposure at its pointing and JD. It reads the certified field population
 * (io/fieldInfoPacks.ts, used read-only; any pointing once Front G2's population is merged) and turns its TRUE-kept variable
 * stars into positions and magnitudes (core/cameraFieldObjects.ts). Loaded lazily: nothing is fetched unless an exposure is
 * prepared. No certified population at the pointing is 'not-certified'; a population with a blocking reason is 'blocked'; a
 * load failure is 'failed' (review 1 L1, closure Info). Neither runs the pass, and no field is guessed. */
import {cameraFieldObjects} from '../core/cameraFieldObjects';
import type {CameraColourFilter} from '../core/cameraColourTerm';
import type {CameraFieldObjectInput} from '../core/cameraExposure';

/** The CCD form's filter byte (form+0x405), written at CCD Go (0x5126c1) and read by the pass for both cameras. It lives for
 * the page, as the form does for the process (review 1 L5); 0 (NF) before any CCD exposure [I]. */
let ccdFilter=0;
export const ccdFilterByte=()=>ccdFilter;
export function setCcdFilterByte(position:number){if(Number.isInteger(position)&&position>=0&&position<=4)ccdFilter=position;}

export type CameraFieldInputs=Readonly<{status:'run'|'none'|'not-certified'|'failed'|'blocked'|'values';objects:readonly CameraFieldObjectInput[]|null}>;
export async function cameraFieldInputs(pointing:Readonly<{ra:number;dec:number}>,jd:number,ccdFilterPosition:number):Promise<CameraFieldInputs>{
 try{
  const {findCertifiedPopulation}=await import('../io/fieldInfoPacks');
  const found=await findCertifiedPopulation({ra:pointing.ra,dec:pointing.dec},{jd,source:'observatory-clock'});
  // A population-blocking reason is deterministic (closure Info): 'blocked', not 'failed' (a load failure, worth a retry).
  if(found.status!=='ready')return Object.freeze({status:found.reason==='field-not-certified'?'not-certified':'blocked',objects:null});
  const r=cameraFieldObjects(found.population,Math.min(4,Math.max(0,Math.trunc(ccdFilterPosition))) as CameraColourFilter);
  if(r.status==='none')return Object.freeze({status:'none',objects:null});
  if(r.status==='unavailable')return Object.freeze({status:'values',objects:null});
  return Object.freeze({status:'run',objects:r.objects.map(o=>Object.freeze({raHours:o.raHours,decDegrees:o.decDegrees,magnitude:o.magnitude}))});
 }catch{return Object.freeze({status:'failed',objects:null});}
}
