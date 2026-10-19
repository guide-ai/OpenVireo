import references from '../../data/hubble/galaxy-distance-references.json';
import targets from '../../data/hubble/galaxy-targets.json';
export const GALAXY_TARGETS=Object.freeze(targets.map(t=>Object.freeze({...t})));
export function knownGalaxyTarget(id:unknown):id is string{return typeof id==='string'&&GALAXY_TARGETS.some(t=>t.id===id);}
export function galaxyIdentity(id:string){const t=GALAXY_TARGETS.find(t=>t.id===id);if(!t)throw Error('Unsupported acquisition galaxy.');return t;}
/** Missing targetId belongs only to the original36773 measurement schema. */
export function measurementGalaxyTarget(origin:Readonly<{kind:string;targetId?:string}>|undefined){return origin?.kind==='catalog-galaxy-acquisition'?origin.targetId??'36773':undefined;}

export function galaxyDistanceReference(id:string){const r=references.find(r=>r.id===id);if(!r)throw Error('Unknown magnitude reference.');return r;}
