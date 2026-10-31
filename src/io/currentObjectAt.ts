/** Front R4: the current object at a pointing, as VIREO refreshes it at Add Current and camera Save (0x53cf94), behind the Object X
 * gate. Loaded lazily; reads the certified field population read-only (io/fieldInfoPacks.ts), as the camera field-object pass does.
 * - The Object X mask is checked first, with the field's farthest corner (fieldMaskReach), so nothing is loaded near an
 *   ObjectX.HTL position or the hidden target; a failed ObjectX.HTL read fails closed (hidden).
 * - A field that cannot be built (polar, tiles, population reason) gives no object: the readers then use their no-object text
 *   [W: VIREO always has a field]. An abort rejects with AbortError. */
import {currentObjectInPopulation,shownCurrentObject,type ShownCurrentObject} from '../core/currentObject';
import type {Pointing} from '../core/sky';

export async function currentObjectAt(pointing:Readonly<{ra:number;dec:number}>,options:Readonly<{hidden?:Pointing|null;currentJd?:()=>number;signal?:AbortSignal}>={}):Promise<ShownCurrentObject>{
 const {signal}=options;signal?.throwIfAborted();
 const {fieldMaskReach,objectXMaskState}=await import('./objectXMask');
 const at={ra:pointing.ra,dec:pointing.dec},mask=await objectXMaskState(options.hidden??null,at,fieldMaskReach(at));
 if(mask!=='clear')return shownCurrentObject({status:'object',name:'',kind:0,v:0,ra:at.ra,dec:at.dec},mask==='near'?'near':'unknown');
 signal?.throwIfAborted();
 try{
  const [{findCertifiedPopulation},{frozenObservatoryTime}]=await Promise.all([import('./fieldInfoPacks'),import('../core/fieldEngine')]);
  // The field at the observatory clock's JD, as Field Information builds it (variable stars follow the clock).
  const found=await findCertifiedPopulation(at,frozenObservatoryTime(options.currentJd),signal);
  if(found.status!=='ready')return shownCurrentObject(null,'clear');
  return shownCurrentObject(currentObjectInPopulation(found.population,at,`field pack ${found.packId}`),'clear');
 }catch(e){if(signal?.aborted)throw e;return shownCurrentObject(null,'clear');}
}
