import{projectResource}from'./projectMetadata';
import oldReferences from '../../data/hubble/galaxy-distance-references.json';
import addedReferences from '../../data/hubble/corbor-distance-references.json';
import pegasusReferences from '../../data/hubble/pegasus-distance-references.json';
import umiReferences from '../../data/hubble/umi-distance-references.json';
const references=[...oldReferences,...addedReferences,...pegasusReferences,...umiReferences];

import targetsSource from '../../data/hubble/galaxy-targets.json';
import addedTargets from '../../data/hubble/corbor-targets.json';
import pegasusTargets from '../../data/hubble/pegasus-targets.json';
// Front F (docs/HUBBLE-13.md): extended Hubble.HTL targets, appended after the frozen eight.
import umiTargets from '../../data/hubble/umi-targets.json';
const targets=projectResource([...targetsSource,...addedTargets,...pegasusTargets,...umiTargets]);

export const GALAXY_TARGETS=Object.freeze(targets.map(t=>Object.freeze({...t})));
export function knownGalaxyTarget(id:unknown):id is string{return typeof id==='string'&&GALAXY_TARGETS.some(t=>t.id===id);}
export function galaxyIdentity(id:string){const t=GALAXY_TARGETS.find(t=>t.id===id);if(!t)throw Error('Unsupported acquisition galaxy.');return t;}
/** Missing targetId belongs only to the original36773 measurement schema. */
export function measurementGalaxyTarget(origin:Readonly<{kind:string;targetId?:string}>|undefined){return origin?.kind==='catalog-galaxy-acquisition'?origin.targetId??'36773':undefined;}

export function galaxyDistanceReference(id:string){const r=references.find(r=>r.id===id);if(!r)throw Error('Unknown magnitude reference.');return r;}
