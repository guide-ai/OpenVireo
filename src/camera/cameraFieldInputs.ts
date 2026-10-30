/** Front R2: the field-object input of a camera exposure at its pointing and JD. It reads the certified field population
 * (io/fieldInfoPacks.ts, used read-only; any pointing once Front G2's population is merged) and turns its TRUE-kept variable
 * stars into positions and magnitudes (core/cameraFieldObjects.ts). Loaded lazily: nothing is fetched unless an exposure is
 * prepared. A failure to build the population is 'not-certified' (the pass does not run), never a guessed field. */
import {cameraFieldObjects} from '../core/cameraFieldObjects';
import type {CameraColourFilter} from '../core/cameraColourTerm';
import type {CameraFieldObjectInput} from '../core/cameraExposure';

export type CameraFieldInputs=Readonly<{status:'run'|'none'|'not-certified'|'values';objects:readonly CameraFieldObjectInput[]|null}>;
export async function cameraFieldInputs(pointing:Readonly<{ra:number;dec:number}>,jd:number,ccdFilterPosition:number):Promise<CameraFieldInputs>{
 try{
  const {findCertifiedPopulation}=await import('../io/fieldInfoPacks');
  const found=await findCertifiedPopulation({ra:pointing.ra,dec:pointing.dec},{jd,source:'observatory-clock'});
  if(found.status!=='ready')return Object.freeze({status:'not-certified',objects:null});
  const r=cameraFieldObjects(found.population,Math.min(4,Math.max(0,Math.trunc(ccdFilterPosition))) as CameraColourFilter);
  if(r.status==='none')return Object.freeze({status:'none',objects:null});
  if(r.status==='unavailable')return Object.freeze({status:'values',objects:null});
  return Object.freeze({status:'run',objects:r.objects.map(o=>Object.freeze({raHours:o.raHours,decDegrees:o.decDegrees,magnitude:o.magnitude}))});
 }catch{return Object.freeze({status:'not-certified',objects:null});}
}
