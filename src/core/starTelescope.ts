import{projectResource}from'./projectMetadata';
import mayallSource from '../../data/hubble/mayall-provenance.json';
const mayall=projectResource(mayallSource);

export const MAYALL_PROOF_SHA256='6a1e6fd5f8b876967adfc0f549e0e95036ceaf9f3a1f51aa1d02f14842ab118b';
import kpno09Source from '../../data/hubble/kpno09-star-provenance.json';
const kpno09=projectResource(kpno09Source);

import provenanceSource from '../../data/hubble/star-exposure-provenance.json';
const provenance=projectResource(provenanceSource);

import {JournalError,type JournalState} from './exposureJournal';
import {RANGE_MARK,policyRange,policyWithRange,type SpectralRange} from './spectralRange';
const STAR_POLICY_ID=provenance.policyId;
export const KPNO09_STAR_POLICY=kpno09.policyId,KPNO09_STAR_PROOF_SHA256='41d12e419961090c8685996203ab48576a121b3c720b7ccdb3da6e23a889bbc6';
export type StarTelescopeIndex=0|1|2;
/** Front S (S1, docs/SPECTRAL-RANGE.md): a star exposure on a non-default spectrometer range carries "#R<min>-<max>" after its
 * telescope policy; the default range (3700–4700 Å) keeps the policy unchanged, so earlier states and sessions are identical. */
export const STAR_RANGE_MARK=RANGE_MARK;
export function starPolicyRange(policy:unknown):Readonly<{base:string;range:SpectralRange}>{const r=policyRange(policy);if(!r)throw new JournalError('phase');return r;}
export const starPolicyWithRange=policyWithRange;
export function starSpectralRange(s:JournalState):SpectralRange{return starPolicyRange(s?.policy).range;}
export function starTelescopeIndex(s:JournalState):StarTelescopeIndex{const p=starPolicyRange(s?.policy).base;if(p===mayall.star.policyId)return 2;if(p===STAR_POLICY_ID)return 0;if(p===KPNO09_STAR_POLICY)return 1;throw new JournalError('phase');}
export function starTickLimit(index:StarTelescopeIndex){return index===1?300:1000;}
