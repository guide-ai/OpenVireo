// Front O (review 1, Object X mask gap): the Edit Mode forms are masked near every ObjectX.HTL position, whether or not the
// Object X lab holds a target, because web Edit Mode has no instructor login and would reveal E08 identities. The positions
// come from the bundled, hash-checked ObjectX.HTL (moving rows at their listed positions). A failed read masks everything.
import {parseHtl} from '../core/hotList';
import {separationDegrees} from '../core/ephemeris';
import {OBJECT_X_HIDE_DEGREES,OBJECT_X_ON_TARGET_DEGREES} from '../core/objectXLab';
import type {Pointing} from '../core/sky';

let positions:Promise<readonly Pointing[]>|null=null,loaded:readonly Pointing[]|null=null;
export function loadObjectXPositions():Promise<readonly Pointing[]>{
 if(!positions){positions=import('./bundledOrbitFile').then(m=>m.fetchObjectXHotList(fetch,new AbortController().signal)).then(b=>Object.freeze(parseHtl(b.bytes).map(r=>Object.freeze({ra:r.ra,dec:r.dec}))));positions.then(l=>{loaded=l;},()=>{positions=null;});}
 return positions;
}
/** The positions once loadObjectXPositions has resolved, else null: lets a caller whose pointing changes on every clock tick
 * evaluate the mask during render instead of resetting state from an effect on each tick. */
export function loadedObjectXPositions():readonly Pointing[]|null{return loaded;}
/** True when an Object X position (or the lab's hidden target) lies within the hide radius plus `reach` degrees. */
export function objectXNear(list:readonly Pointing[],hidden:Pointing|null,p:Pointing,reach=0):boolean{
 return [...list,...(hidden?[hidden]:[])].some(q=>separationDegrees(p.ra,p.dec,q.ra,q.dec)<=OBJECT_X_HIDE_DEGREES+reach);
}
/** Resolves to true (masked) or false; a failed ObjectX.HTL read masks (fail closed). */
export async function objectXMasked(hidden:Pointing|null,p:Pointing,reach=0):Promise<boolean>{
 try{return objectXNear(await loadObjectXPositions(),hidden,p,reach);}catch{return true;}
}
/** Variable Stars list (review 1 closure N2): the risk is a listed variable that an Object X camera or spectrometer image would
 * contain, so the list is masked only when one of its rows lies within OBJECT_X_ON_TARGET_DEGREES (0.25°, about half the largest
 * camera field diagonal; the spectrometer field is smaller) of an Object X position or of the lab's hidden target. Fail closed. */
export async function objectXListedNear(hidden:Pointing|null,rows:readonly Pointing[]):Promise<boolean>{
 let list:readonly Pointing[];try{list=await loadObjectXPositions();}catch{return true;}
 const on=objectXOnTarget(list,hidden);
 return rows.some(on);
}
/** Front O2 (QSO List): a per-row test, true when the row lies within OBJECT_X_ON_TARGET_DEGREES of an Object X position or of
 * the lab's hidden target. The caller loads `list` (loadObjectXPositions) and fails closed itself. */
export function objectXOnTarget(list:readonly Pointing[],hidden:Pointing|null):(r:Pointing)=>boolean{
 const targets=[...list,...(hidden?[hidden]:[])];
 return r=>targets.some(q=>separationDegrees(r.ra,r.dec,q.ra,q.dec)<=OBJECT_X_ON_TARGET_DEGREES);
}
