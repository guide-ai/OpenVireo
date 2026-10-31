/** Front R2: the field-object input of a camera exposure at its pointing and JD. It reads the field population
 * (io/fieldInfoPacks.ts, used read-only) and turns its TRUE-kept variable stars into positions and magnitudes
 * (core/cameraFieldObjects.ts). Loaded lazily: nothing is fetched unless an exposure is prepared.
 * Front G merge: the population exists at every pointing (a bundled pack where one is listed, otherwise one assembled from the
 * compact GSC tiles), as VIREO builds the field at every pointing (G-RE3), so the pass runs everywhere.
 * - Object X: within the 2° Object X mask (plus the population's farthest corner, fieldMaskReach: 0.53–0.66°) of an ObjectX.HTL position or the lab's hidden
 *   target, nothing is loaded and the pass does not run ('masked'), as G's other consumers do. A failed ObjectX.HTL read fails
 *   closed as 'unchecked', with its own constant text (review L3).
 * - A tile that cannot be fetched or checked is 'failed' (a retry can help); a polar field, an unreadable band or a
 *   population-blocking reason is 'blocked' (deterministic). An abort rejects with AbortError. */
import {cameraFieldObjects} from '../core/cameraFieldObjects';
import type {CameraColourFilter} from '../core/cameraColourTerm';
import type {CameraFieldObjectInput} from '../core/cameraExposure';
import type {Pointing} from '../core/sky';

/** The CCD form's filter byte (form+0x405), written at CCD Go (0x5126c1) and read by the pass for both cameras. It lives for
 * the page, as the form does for the process (review 1 L5); 0 (NF) before any CCD exposure [I]. */
let ccdFilter=0;
export const ccdFilterByte=()=>ccdFilter;
export function setCcdFilterByte(position:number){if(Number.isInteger(position)&&position>=0&&position<=4)ccdFilter=position;}

export type CameraFieldInputs=Readonly<{status:'run'|'none'|'masked'|'unchecked'|'failed'|'blocked'|'values';objects:readonly CameraFieldObjectInput[]|null}>;
export async function cameraFieldInputs(pointing:Readonly<{ra:number;dec:number}>,jd:number,ccdFilterPosition:number,options:Readonly<{signal?:AbortSignal;hidden?:Pointing|null}>={}):Promise<CameraFieldInputs>{
 const {signal}=options;signal?.throwIfAborted();
 const {fieldMaskReach,objectXMaskState}=await import('../io/objectXMask');
 const at={ra:pointing.ra,dec:pointing.dec},mask=await objectXMaskState(options.hidden??null,at,fieldMaskReach(at));
 if(mask!=='clear')return Object.freeze({status:mask==='near'?'masked':'unchecked',objects:null});
 signal?.throwIfAborted();
 try{
  const {findCertifiedPopulation}=await import('../io/fieldInfoPacks');
  const found=await findCertifiedPopulation({ra:pointing.ra,dec:pointing.dec},{jd,source:'observatory-clock'},signal);
  if(found.status!=='ready')return Object.freeze({status:found.reason==='field-tiles'?'failed':'blocked',objects:null});
  const r=cameraFieldObjects(found.population,Math.min(4,Math.max(0,Math.trunc(ccdFilterPosition))) as CameraColourFilter);
  if(r.status==='none')return Object.freeze({status:'none',objects:null});
  if(r.status==='unavailable')return Object.freeze({status:'values',objects:null});
  return Object.freeze({status:'run',objects:r.objects.map(o=>Object.freeze({raHours:o.raHours,decDegrees:o.decDegrees,magnitude:o.magnitude}))});
 }catch(e){if(signal?.aborted)throw e;return Object.freeze({status:'failed',objects:null});}
}
