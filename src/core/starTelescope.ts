import mayall from '../../data/hubble/mayall-provenance.json';
export const MAYALL_PROOF_SHA256='6a1e6fd5f8b876967adfc0f549e0e95036ceaf9f3a1f51aa1d02f14842ab118b';
import kpno09 from '../../data/hubble/kpno09-star-provenance.json';
import provenance from '../../data/hubble/star-exposure-provenance.json';
import {JournalError,type JournalState} from './exposureJournal';
const STAR_POLICY_ID=provenance.policyId;
export const KPNO09_STAR_POLICY=kpno09.policyId,KPNO09_STAR_PROOF_SHA256='41d12e419961090c8685996203ab48576a121b3c720b7ccdb3da6e23a889bbc6';
export type StarTelescopeIndex=0|1|2;
export function starTelescopeIndex(s:JournalState):StarTelescopeIndex{if(s?.policy===mayall.star.policyId)return 2;if(s?.policy===STAR_POLICY_ID)return 0;if(s?.policy===KPNO09_STAR_POLICY)return 1;throw new JournalError('phase');}
export function starTickLimit(index:StarTelescopeIndex){return index===1?300:1000;}
