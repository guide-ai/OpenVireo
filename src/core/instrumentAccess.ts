import proof from '../../data/observatory/instrument-access-provenance.json';
export const INSTRUMENT_ACCESS_POLICY=proof.policy,INSTRUMENT_ACCESS_PROOF_SHA256='80a3681d78039496bba397abaa057e9dfaa978525036168998ae8402e78acdae';
export type AccessReason='ready'|'tracking'|'moving'|'finder'|'dome'|'configuration'|'pointing';
/** Native tracking/finder read gates combined with bounded browser domain guards.
 * Moving states are not admitted; no native motor transition is claimed. No arbitrary source-offset or horizon physics is admitted. */
export function instrumentAccess(s:Readonly<{tracking:boolean;moving:boolean;finder:boolean;domeOpen:boolean;configurationAvailable:boolean;pointingMatches:boolean}>):AccessReason{
 if(s.moving)return 'moving';if(!s.tracking)return 'tracking';if(s.finder)return 'finder';if(!s.domeOpen)return 'dome';if(!s.configurationAvailable)return 'configuration';if(!s.pointingMatches)return 'pointing';return 'ready';
}
export function portableInstrumentAccess(){return {policy:INSTRUMENT_ACCESS_POLICY,proofSHA256:INSTRUMENT_ACCESS_PROOF_SHA256};}
export function readInstrumentAccess(value:unknown):true{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid instrument control');const r=value as Record<string,unknown>;if(Object.keys(r).length!==2||!Object.hasOwn(r,'policy')||!Object.hasOwn(r,'proofSHA256')||r.policy!==INSTRUMENT_ACCESS_POLICY||r.proofSHA256!==INSTRUMENT_ACCESS_PROOF_SHA256)throw new Error('Unsupported instrument control');return true;}
