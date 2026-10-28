import{projectResource}from'./projectMetadata';
import oldReferences from '../../data/hubble/galaxy-distance-references.json';
import addedReferences from '../../data/hubble/corbor-distance-references.json';
import pegasusReferences from '../../data/hubble/pegasus-distance-references.json';
import umiReferences from '../../data/hubble/umi-distance-references.json';
const engineReferences=engineTargets.targets.filter(t=>t.telescopes.some(x=>x.status==='available')).map(t=>({id:t.id,apparentV:t.workbook.apparentV,source:t.workbook.source,sha256:'09ac2e0bd4499e4a4796cf64981b3958d264f92b710b1ac9e3324340054fc7ed'}));
const references=[...oldReferences,...addedReferences,...pegasusReferences,...umiReferences,...engineReferences];

import targetsSource from '../../data/hubble/galaxy-targets.json';
import addedTargets from '../../data/hubble/corbor-targets.json';
import pegasusTargets from '../../data/hubble/pegasus-targets.json';
// Front F (docs/HUBBLE-13.md): extended Hubble.HTL targets, appended after the frozen eight.
import umiTargets from '../../data/hubble/umi-targets.json';
import engineTargets from '../../data/hubble/engine-targets.json';
// Engine targets (hubbleEngineTargets.ts): identity from the recorded engine metadata; counts from the first verified telescope.
const engineIdentities=engineTargets.targets.filter(t=>t.telescopes.some(x=>x.status==='available')).map(t=>{const first=t.telescopes.find(x=>x.status==='available') as {policyId:string;stars:number;galaxies:number;sourceFile:string};
 return {id:t.id,label:t.label,ra:t.pointing.ra,dec:t.pointing.dec,magnitude:t.catalogMagnitude,recordIndex:t.glxIndex,policyId:first.policyId,fieldSnapshotSHA256:(engineTargets.packs as Record<string,{sha256:string}>)[t.pack].sha256,sourceSnapshotSHA256:t.librarySpectrum?.sha256??'fe18d9e24e6d4b7fd7ec5ce7c69b97c4cd900b3b018c75fd475750f71a472787',stars:first.stars,galaxies:first.galaxies,sourceFile:first.sourceFile};});
const targets=projectResource([...targetsSource,...addedTargets,...pegasusTargets,...umiTargets,...engineIdentities]);

export const GALAXY_TARGETS=Object.freeze(targets.map(t=>Object.freeze({...t})));
export function knownGalaxyTarget(id:unknown):id is string{return typeof id==='string'&&GALAXY_TARGETS.some(t=>t.id===id);}
export function galaxyIdentity(id:string){const t=GALAXY_TARGETS.find(t=>t.id===id);if(!t)throw Error('Unsupported acquisition galaxy.');return t;}
/** Missing targetId belongs only to the original36773 measurement schema. */
export function measurementGalaxyTarget(origin:Readonly<{kind:string;targetId?:string}>|undefined){return origin?.kind==='catalog-galaxy-acquisition'?origin.targetId??'36773':undefined;}

export function galaxyDistanceReference(id:string){const r=references.find(r=>r.id===id);if(!r)throw Error('Unknown magnitude reference.');return r;}
