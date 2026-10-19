import {MAYALL_PROOF_SHA256} from '../core/starTelescope';
import proof from '../../data/hubble/kpno09-galaxy-provenance.json';
import {galaxyTelescopeIndex,KPNO09_GALAXY_PROOF_SHA256} from '../core/galaxyTelescope';
import {MAX_JOURNAL_EVENTS,JournalError,type JournalEvent} from '../core/exposureJournal';
import {replayGalaxy,galaxyStateDefinition,galaxyPolicyDefinition,type GalaxyState} from '../core/galaxyExposure';
export const MAX_GALAXY_SESSION_BYTES=2*1024*1024;
const FORMAT='OpenCLEA catalog galaxy exposure',NUMERICAL='Number_Math_nearest_center_stretch_v1_native_equivalence_unvalidated';
export function serializeGalaxySession(state:GalaxyState):string {
  const index=galaxyTelescopeIndex(state),d=galaxyStateDefinition(state);if(state.exposure.phase==='running')throw new JournalError('phase');
  const result=JSON.stringify({format:FORMAT,version:index+1,policy:d.policyId,...(index!==0?{telescopeIndex:index,opticalProfileSHA256:proof.opticalProfileSHA256,configurationSHA256:index===2?MAYALL_PROOF_SHA256:KPNO09_GALAXY_PROOF_SHA256}:{}),numericalPolicy:NUMERICAL,fieldSnapshotSHA256:d.fieldSnapshotSHA256,sourceSnapshotSHA256:d.sourceSnapshotSHA256,domain:d.domain,seedAtReset:state.seedAtReset,events:state.events},null,2)+'\n';
  if(new TextEncoder().encode(result).byteLength>MAX_GALAXY_SESSION_BYTES)throw new JournalError('session');return result;
}
export function parseGalaxySession(value:unknown):GalaxyState {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new JournalError('session');
  const r=value as Record<string,unknown>,index=r.version===3?2:1,alternate=r.version===2||r.version===3,keys=['format','version','policy','numericalPolicy','fieldSnapshotSHA256','domain','sourceSnapshotSHA256','seedAtReset','events',...(alternate?['telescopeIndex','opticalProfileSHA256','configurationSHA256']:[])];
  const d=galaxyPolicyDefinition(r.policy);
  if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||r.format!==FORMAT||(r.version!==1&&r.version!==2&&r.version!==3)||d.domain.telescopeRecord!==(alternate?index:0)||alternate&&(r.telescopeIndex!==index||r.opticalProfileSHA256!==proof.opticalProfileSHA256||r.configurationSHA256!==(index===2?MAYALL_PROOF_SHA256:KPNO09_GALAXY_PROOF_SHA256))||r.policy!==d.policyId||r.sourceSnapshotSHA256!==d.sourceSnapshotSHA256||r.numericalPolicy!==NUMERICAL||r.fieldSnapshotSHA256!==d.fieldSnapshotSHA256||typeof r.seedAtReset!=='number'||!Array.isArray(r.events)||r.events.length>MAX_JOURNAL_EVENTS)throw new JournalError('session');
  // Exact known-domain fields; imported files cannot provide amplitudes or counts.
  function equal(a:unknown,b:unknown):boolean {if(!b||typeof b!=='object')return Object.is(a,b);if(!a||typeof a!=='object'||Array.isArray(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>;return Object.keys(x).length===Object.keys(y).length&&Object.keys(y).every(k=>Object.hasOwn(x,k)&&equal(x[k],y[k]));}
  if(!equal(r.domain,d.domain))throw new JournalError('session');
  return replayGalaxy(r.seedAtReset,r.events as JournalEvent[],d.target.id,alternate?index:0);
}
export async function readGalaxySession(file:File):Promise<GalaxyState> {
  if(file.size>MAX_GALAXY_SESSION_BYTES)throw new JournalError('session');
  const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_GALAXY_SESSION_BYTES)throw new JournalError('session');
  let parsed:unknown;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new JournalError('session');}
  return parseGalaxySession(parsed);
}
