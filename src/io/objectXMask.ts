// Front O (review 1, Object X mask gap): the Edit Mode forms are masked near every ObjectX.HTL position, whether or not the
// Object X lab holds a target, because web Edit Mode has no instructor login and would reveal E08 identities. The positions
// come from the bundled, hash-checked ObjectX.HTL (moving rows at their listed positions). A failed read masks everything.
import {parseHtl} from '../core/hotList';
import {separationDegrees} from '../core/ephemeris';
import {OBJECT_X_HIDE_DEGREES} from '../core/objectXLab';
import type {Pointing} from '../core/sky';

let positions:Promise<readonly Pointing[]>|null=null;
export function loadObjectXPositions():Promise<readonly Pointing[]>{
 if(!positions){positions=import('./bundledOrbitFile').then(m=>m.fetchObjectXHotList(fetch,new AbortController().signal)).then(b=>Object.freeze(parseHtl(b.bytes).map(r=>Object.freeze({ra:r.ra,dec:r.dec}))));positions.catch(()=>{positions=null;});}
 return positions;
}
/** True when an Object X position (or the lab's hidden target) lies within the hide radius plus `reach` degrees. */
export function objectXNear(list:readonly Pointing[],hidden:Pointing|null,p:Pointing,reach=0):boolean{
 return [...list,...(hidden?[hidden]:[])].some(q=>separationDegrees(p.ra,p.dec,q.ra,q.dec)<=OBJECT_X_HIDE_DEGREES+reach);
}
/** Resolves to true (masked) or false; a failed ObjectX.HTL read masks (fail closed). */
export async function objectXMasked(hidden:Pointing|null,p:Pointing,reach=0):Promise<boolean>{
 try{return objectXNear(await loadObjectXPositions(),hidden,p,reach);}catch{return true;}
}
