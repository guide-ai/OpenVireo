import {skyTelescopeIndex,skyProfile,SKY_TELESCOPE_PROOF_SHA256,type SkyTelescopeIndex} from '../core/skyTelescope';
import {PINNED_FIELD_DOMAIN} from '../core/pinnedNativeField';
import {MAX_SKY_EVENTS,replaySky,SKY_FIELD_SHA256,SKY_POLICY_ID,SkyExposureError,type SkyState,type SkyEvent} from '../core/skyExposure';
export const MAX_SKY_SESSION_BYTES=2*1024*1024;
const FORMAT='OpenCLEA sky background exposure',NUMERICAL='Number_Math_native_x87_equivalence_unvalidated';
export function serializeSkySession(state:SkyState):string {
  const index=skyTelescopeIndex(state);if(state.exposure.phase==='running')throw new SkyExposureError('phase');
  const result=JSON.stringify(index===0?{format:FORMAT,version:1,policy:SKY_POLICY_ID,numericalPolicy:NUMERICAL,fieldSnapshotSHA256:SKY_FIELD_SHA256,domain:PINNED_FIELD_DOMAIN,seedAtReset:state.seedAtReset,events:state.events}:{format:FORMAT,version:2,policy:state.policy,numericalPolicy:NUMERICAL,fieldSnapshotSHA256:SKY_FIELD_SHA256,domain:skyProfile(index).domain,seedAtReset:state.seedAtReset,events:state.events,telescopeRecord:index,configurationSHA256:SKY_TELESCOPE_PROOF_SHA256},null,2)+'\n';
  if(new TextEncoder().encode(result).byteLength>MAX_SKY_SESSION_BYTES)throw new SkyExposureError('session');return result;
}
export function parseSkySession(value:unknown):SkyState {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new SkyExposureError('session');
  const r=value as Record<string,unknown>,index=r.version===1?0:r.telescopeRecord;if(index!==0&&index!==1&&index!==2)throw new SkyExposureError('session');const keys=['format','version','policy','numericalPolicy','fieldSnapshotSHA256','domain','seedAtReset','events',...(r.version===2?['telescopeRecord','configurationSHA256']:[])];
  if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||r.format!==FORMAT||(r.version!==1&&r.version!==2)||r.version===2&&(index===0||r.configurationSHA256!==SKY_TELESCOPE_PROOF_SHA256)||r.policy!==skyProfile(index as SkyTelescopeIndex).policyId||r.numericalPolicy!==NUMERICAL||r.fieldSnapshotSHA256!==SKY_FIELD_SHA256||typeof r.seedAtReset!=='number'||!Array.isArray(r.events)||r.events.length>MAX_SKY_EVENTS)throw new SkyExposureError('session');
  // Exact known-domain fields; imported files cannot provide amplitudes or counts.
  function equal(a:unknown,b:unknown):boolean {if(!b||typeof b!=='object')return Object.is(a,b);if(!a||typeof a!=='object'||Array.isArray(a))return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>;return Object.keys(x).length===Object.keys(y).length&&Object.keys(y).every(k=>Object.hasOwn(x,k)&&equal(x[k],y[k]));}
  if(!equal(r.domain,index===0?PINNED_FIELD_DOMAIN:skyProfile(index as SkyTelescopeIndex).domain))throw new SkyExposureError('session');
  return replaySky(r.seedAtReset,r.events as SkyEvent[],index as SkyTelescopeIndex);
}
export async function readSkySession(file:File):Promise<SkyState> {
  if(file.size>MAX_SKY_SESSION_BYTES)throw new SkyExposureError('session');
  const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_SKY_SESSION_BYTES)throw new SkyExposureError('session');
  let parsed:unknown;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new SkyExposureError('session');}
  return parseSkySession(parsed);
}
