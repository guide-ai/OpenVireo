import{projectResource}from'./projectMetadata';
import mayallSource from '../../data/hubble/mayall-provenance.json';
const mayall=projectResource(mayallSource);

import proofSource from '../../data/hubble/kpno09-galaxy-provenance.json';
const proof=projectResource(proofSource);

import cachedSource from '../../data/hubble/corbor-cached-provenance.json';
// Only the small target list: the Pegasus field snapshot stays out of the main bundle.
import pegasusTargets from '../../data/hubble/pegasus-targets.json';

import {JournalError,type JournalState} from './exposureJournal';
import {hubbleExtendedTarget,hubbleExtendedPolicyTelescope} from './hubbleEngineTargets';
export const KPNO09_GALAXY_PROOF_SHA256='3e45415e61cb61faafde7a3abceb97d1390ae0d836a3e680816727e0b4b72cf6';
/** Cached-pan targets (route B) are verified on the 0.4 m (telescope record 0) only. */
export const CACHED_GALAXY_TARGET_IDS:readonly string[]=Object.freeze(cachedSource.targets.map(t=>t.id));
export function isCachedGalaxyTarget(id:unknown):boolean{return typeof id==='string'&&CACHED_GALAXY_TARGET_IDS.includes(id);}
/** Pegasus targets (fresh NGC 7501, cached NGC 7499/7503) are verified on the 0.4 m (telescope record 0) only. */
export const PEGASUS_GALAXY_TARGET_IDS:readonly string[]=Object.freeze(pegasusTargets.map(t=>t.id));
export function isPegasusGalaxyTarget(id:unknown):boolean{return typeof id==='string'&&PEGASUS_GALAXY_TARGET_IDS.includes(id);}
/** Whether a supported acquisition target has a verified definition on this telescope. No telescope is switched to enable it. */
export function galaxyTargetTelescopeSupported(id:string,index:number):boolean{const extended=hubbleExtendedTarget(id);if(extended)return extended.telescopes.includes(index as 0|1|2);return isCachedGalaxyTarget(id)||isPegasusGalaxyTarget(id)?index===0:index===0||index===1||index===2;}
export function galaxyTelescopeIndex(s:JournalState):0|1|2{
 if(mayall.galaxies.some(r=>s?.policy===r.policyId))return 2;
 if(proof.records.some(r=>s?.policy===r.policyId))return 1;
 if(proof.records.some(r=>s?.policy===`openvireo-pinned-galaxy-${r.id}-v1`))return 0;
 if(cachedSource.targets.some(r=>s?.policy===r.policyId))return 0;
 if(pegasusTargets.some(r=>s?.policy===r.policyId))return 0;
 const extended=hubbleExtendedPolicyTelescope(s?.policy);if(extended!==null)return extended;
 throw new JournalError('phase');
}
