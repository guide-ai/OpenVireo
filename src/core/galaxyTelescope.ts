import{projectResource}from'./projectMetadata';
import mayallSource from '../../data/hubble/mayall-provenance.json';
const mayall=projectResource(mayallSource);

import proofSource from '../../data/hubble/kpno09-galaxy-provenance.json';
const proof=projectResource(proofSource);

import cachedSource from '../../data/hubble/corbor-cached-provenance.json';

import {JournalError,type JournalState} from './exposureJournal';
export const KPNO09_GALAXY_PROOF_SHA256='3e45415e61cb61faafde7a3abceb97d1390ae0d836a3e680816727e0b4b72cf6';
/** Cached-pan targets (route B) are verified on the 0.4 m (telescope record 0) only. */
export const CACHED_GALAXY_TARGET_IDS:readonly string[]=Object.freeze(cachedSource.targets.map(t=>t.id));
export function isCachedGalaxyTarget(id:unknown):boolean{return typeof id==='string'&&CACHED_GALAXY_TARGET_IDS.includes(id);}
/** Whether a supported acquisition target has a verified definition on this telescope. No telescope is switched to enable it. */
export function galaxyTargetTelescopeSupported(id:string,index:number):boolean{return isCachedGalaxyTarget(id)?index===0:index===0||index===1||index===2;}
export function galaxyTelescopeIndex(s:JournalState):0|1|2{
 if(mayall.galaxies.some(r=>s?.policy===r.policyId))return 2;
 if(proof.records.some(r=>s?.policy===r.policyId))return 1;
 if(proof.records.some(r=>s?.policy===`openvireo-pinned-galaxy-${r.id}-v1`))return 0;
 if(cachedSource.targets.some(r=>s?.policy===r.policyId))return 0;
 throw new JournalError('phase');
}
