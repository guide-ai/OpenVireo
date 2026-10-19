import mayall from '../../data/hubble/mayall-provenance.json';
import {MAYALL_PROOF_SHA256} from '../core/starTelescope';
import kpno09 from '../../data/hubble/kpno09-star-provenance.json';
import {PINNED_MAYALL_STAR_DOMAIN,PINNED_STAR_DOMAIN,PINNED_KPNO09_STAR_DOMAIN} from '../core/pinnedNativeField';
import {MAX_JOURNAL_EVENTS,JournalError,type JournalEvent} from '../core/exposureJournal';
import {starTelescopeIndex,KPNO09_STAR_POLICY,KPNO09_STAR_PROOF_SHA256,replayStar,STAR_FIELD_SHA256,STAR_SOURCE_SHA256,STAR_POLICY_ID,type StarState} from '../core/starExposure';
export const MAX_STAR_SESSION_BYTES=2*1024*1024;
const FORMAT='OpenCLEA catalog star exposure',NUMERICAL='Number_Math_native_x87_equivalence_unvalidated';
export function serializeStarSession(state:StarState):string {
  const index=starTelescopeIndex(state);if(state.exposure.phase==='running')throw new JournalError('phase');
  const result=JSON.stringify({format:FORMAT,version:index+1,policy:state.policy,...(index!==0?{telescopeIndex:index,opticalProfileSHA256:kpno09.opticalProfileSHA256,configurationSHA256:index===2?MAYALL_PROOF_SHA256:KPNO09_STAR_PROOF_SHA256}:{}),numericalPolicy:NUMERICAL,fieldSnapshotSHA256:STAR_FIELD_SHA256,sourceSnapshotSHA256:STAR_SOURCE_SHA256,domain:index===2?PINNED_MAYALL_STAR_DOMAIN:index===1?PINNED_KPNO09_STAR_DOMAIN:PINNED_STAR_DOMAIN,seedAtReset:state.seedAtReset,events:state.events},null,2)+'\n';
  if(new TextEncoder().encode(result).byteLength>MAX_STAR_SESSION_BYTES)throw new JournalError('session');return result;
}
export function parseStarSession(value:unknown):StarState {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new JournalError('session');
  const r=value as Record<string,unknown>,index=r.version===3?2:1,alternate=r.version===2||r.version===3,keys=['format','version','policy','numericalPolicy','fieldSnapshotSHA256','domain','sourceSnapshotSHA256','seedAtReset','events',...(alternate?['telescopeIndex','opticalProfileSHA256','configurationSHA256']:[])];
  if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||r.format!==FORMAT||(r.version!==1&&r.version!==2&&r.version!==3)||r.policy!==(alternate?(index===2?mayall.star.policyId:KPNO09_STAR_POLICY):STAR_POLICY_ID)||alternate&&(r.telescopeIndex!==index||r.opticalProfileSHA256!==kpno09.opticalProfileSHA256||r.configurationSHA256!==(index===2?MAYALL_PROOF_SHA256:KPNO09_STAR_PROOF_SHA256))||r.sourceSnapshotSHA256!==STAR_SOURCE_SHA256||r.numericalPolicy!==NUMERICAL||r.fieldSnapshotSHA256!==STAR_FIELD_SHA256||typeof r.seedAtReset!=='number'||!Array.isArray(r.events)||r.events.length>MAX_JOURNAL_EVENTS)throw new JournalError('session');
  // Exact known-domain fields; imported files cannot provide amplitudes or counts.
  function equal(a:unknown,b:unknown):boolean {if(!b||typeof b!=='object')return Object.is(a,b);if(!a||typeof a!=='object'||Array.isArray(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>;return Object.keys(x).length===Object.keys(y).length&&Object.keys(y).every(k=>Object.hasOwn(x,k)&&equal(x[k],y[k]));}
  if(!equal(r.domain,alternate?(index===2?PINNED_MAYALL_STAR_DOMAIN:PINNED_KPNO09_STAR_DOMAIN):PINNED_STAR_DOMAIN))throw new JournalError('session');
  return replayStar(r.seedAtReset,r.events as JournalEvent[],alternate?index:0);
}
export async function readStarSession(file:File):Promise<StarState> {
  if(file.size>MAX_STAR_SESSION_BYTES)throw new JournalError('session');
  const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_STAR_SESSION_BYTES)throw new JournalError('session');
  let parsed:unknown;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new JournalError('session');}
  return parseStarSession(parsed);
}
