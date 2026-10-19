import proof from '../../data/hubble/sky-telescope-provenance.json';
import {JournalError} from './exposureJournal';
export type SkyTelescopeIndex=0|1|2;
export const SKY_TELESCOPE_PROOF_SHA256='2b0927bee17b01b190d4efc30a1c42892b63fb07425719a38315253742468fda';
export function skyProfile(index:SkyTelescopeIndex){const p=proof.profiles.find(p=>p.index===index);if(!p)throw new JournalError('proof');return p;}
export function skyTelescopeIndex(s:Readonly<{policy:string}>):SkyTelescopeIndex{const p=proof.profiles.find(p=>p.policyId===s?.policy);if(!p)throw new JournalError('phase');return p.index as SkyTelescopeIndex;}
export function portableSkyProfilesProof(){return {policy:proof.policy,proofSHA256:SKY_TELESCOPE_PROOF_SHA256};}
export function readSkyProfilesProof(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))throw new JournalError('proof');const r=value as Record<string,unknown>;if(Object.keys(r).length!==2||!Object.hasOwn(r,'policy')||!Object.hasOwn(r,'proofSHA256')||r.policy!==proof.policy||r.proofSHA256!==SKY_TELESCOPE_PROOF_SHA256)throw new JournalError('proof');}
