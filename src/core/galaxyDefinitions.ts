/** Front D3: the galaxy exposure definitions (provenance, policies and the engine registry), split out unchanged from
 * core/galaxyExposure so that looking up a definition (the analyzer's acquired-galaxy note) does not load the pinned field
 * data; core/galaxyExposure imports and re-exports these same objects. */
import{projectResource}from'./projectMetadata';
import mayallSource from '../../data/hubble/mayall-provenance.json';
const mayall=projectResource(mayallSource);
import kpno09Source from '../../data/hubble/kpno09-galaxy-provenance.json';
const kpno09=projectResource(kpno09Source);
import provenance1Source from '../../data/hubble/galaxy-36747-provenance.json';
const provenance1=projectResource(provenance1Source);

import provenance2Source from '../../data/hubble/galaxy-54876-provenance.json';
const provenance2=projectResource(provenance2Source);

import provenanceSource from '../../data/hubble/galaxy-exposure-provenance.json';
const provenance=projectResource(provenanceSource);

import cachedSource from '../../data/hubble/corbor-cached-provenance.json';
import pegasusProvenance from '../../data/hubble/pegasus-field-provenance.json';
import pegasusCached from '../../data/hubble/pegasus-cached-provenance.json';
import umiCached from '../../data/hubble/umi-cached-provenance.json';
import {galaxyIdentity} from './galaxyIdentity';
import {JournalError,type JournalState} from './exposureJournal';
const originalDefinitions=[provenance,provenance1,provenance2];
/** Route B (corbor-cached-provenance.json): the same calibration and source as the verified 54876 base on the 0.4 m, the
 * base field snapshot unchanged, and an explicit view with the requested telescope pointing (exact catalogue centre). The
 * domain's own pointing remains the base field centre: nothing is recentred or relabelled. The target's catalogue values
 * come from galaxy-targets.json and are checked against the base population record at the recorded index. */
const cachedDefinitions=cachedSource.targets.map(t=>{const identity=galaxyIdentity(t.id),pointing=Object.freeze({ra:identity.ra,dec:identity.dec});
 return Object.freeze({...provenance2,policyId:t.policyId,fieldSnapshotSHA256:cachedSource.baseFieldSnapshotSHA256,target:Object.freeze({id:t.id,recordIndex:t.recordIndex,ra:identity.ra,dec:identity.dec,magnitude:identity.magnitude}),domain:Object.freeze({...provenance2.domain,view:Object.freeze({policy:cachedSource.viewPolicy,baseFieldId:cachedSource.baseFieldId,pointing})})});});
/** Pegasus (pegasus-field-provenance.json): the fresh NGC 7501 field on telescope record 0 only. It is deliberately not an
 * original definition, which would also project the 0.9 m/4 m records. NGC 7499/7503 are cached pans of that field with the
 * same calibration and source; their view pointing is the exact catalogue centre (pegasus-targets.json via galaxyIdentity). */
const pegasusFresh=Object.freeze({policyId:pegasusProvenance.policyId,fieldSnapshotSHA256:pegasusProvenance.fieldSnapshotSHA256,sourceSnapshotSHA256:pegasusProvenance.sourceSnapshotSHA256,calibration:Object.freeze({...pegasusProvenance.calibration}),target:Object.freeze({...pegasusProvenance.target}),domain:Object.freeze({...pegasusProvenance.domain,pointing:Object.freeze({...pegasusProvenance.domain.pointing})})});
const pegasusCachedDefinitions=pegasusCached.targets.map(t=>{const identity=galaxyIdentity(t.id),pointing=Object.freeze({ra:identity.ra,dec:identity.dec});
 return Object.freeze({...pegasusFresh,policyId:t.policyId,fieldSnapshotSHA256:pegasusCached.baseFieldSnapshotSHA256,target:Object.freeze({id:t.id,recordIndex:t.recordIndex,ra:identity.ra,dec:identity.dec,magnitude:identity.magnitude}),domain:Object.freeze({...pegasusFresh.domain,view:Object.freeze({policy:pegasusCached.viewPolicy,baseFieldId:pegasusCached.baseFieldId,pointing})})});});
/** Front F M1 (umi-cached-provenance.json): 36805 as a cached pan of the verified 36773 fresh 0.4 m definition, built exactly as
 * route B over 54876; the view pointing is the exact catalogue centre (umi-targets.json via galaxyIdentity). */
const umiCachedDefinitions=umiCached.targets.map(t=>{const identity=galaxyIdentity(t.id),pointing=Object.freeze({ra:identity.ra,dec:identity.dec});
 return Object.freeze({...provenance,policyId:t.policyId,fieldSnapshotSHA256:umiCached.baseFieldSnapshotSHA256,target:Object.freeze({id:t.id,recordIndex:t.recordIndex,ra:identity.ra,dec:identity.dec,magnitude:identity.magnitude}),domain:Object.freeze({...provenance.domain,view:Object.freeze({policy:umiCached.viewPolicy,baseFieldId:umiCached.baseFieldId,pointing})})});});
export const definitions=[...originalDefinitions,...originalDefinitions.map(d=>({...d,policyId:kpno09.records.find(r=>r.id===d.target.id)!.policyId,domain:{...d.domain,telescopeRecord:1},calibration:{...d.calibration,telescopeCorrection:0,magnitudeShift:0}})),...originalDefinitions.map(d=>({...d,policyId:mayall.galaxies.find(r=>r.id===d.target.id)!.policyId,domain:{...d.domain,telescopeRecord:2},calibration:{...d.calibration,telescopeCorrection:3,magnitudeShift:3}})),...cachedDefinitions,pegasusFresh,...pegasusCachedDefinitions,...umiCachedDefinitions];
export type Definition=(typeof definitions)[number];
/** Front F engine targets (hubbleEngineTargets.ts): definitions and configurations registered only after the asynchronous,
 * hash-checked preparation (io/hubbleEngineTargets.ts). Before that, every use is a typed 'proof' error. */
export const engineDefinitions:Definition[]=[];
export function engineGalaxyRegistered(id:string,index:0|1|2):boolean{return engineDefinitions.some(d=>d.target.id===id&&d.domain.telescopeRecord===index);}
export function galaxyDefinition(id='36773',index:0|1|2=0){galaxyIdentity(id);const d=definitions.find(d=>d.target.id===id&&d.domain.telescopeRecord===index)??engineDefinitions.find(d=>d.target.id===id&&d.domain.telescopeRecord===index);if(!d)throw new JournalError('proof');return d;}
export function galaxyPolicyDefinition(policy:unknown){const d=definitions.find(d=>d.policyId===policy)??engineDefinitions.find(d=>d.policyId===policy);if(!d)throw new JournalError('session');return d;}
export function galaxyStateDefinition(s:JournalState){return galaxyPolicyDefinition(s?.policy);}
export {mayall,kpno09,provenance,cachedSource,pegasusProvenance,pegasusCached,umiCached};
