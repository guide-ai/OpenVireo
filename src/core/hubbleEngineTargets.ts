/** Front F: the Hubble.HTL targets added after the frozen eight (docs/HUBBLE-13.md). This module is the single table that the
 * session wrapper (v29), the observing banks, telescope support and the hot-list status read; nothing outside it lists these
 * identifiers. Routes:
 *  - 'cached-umi': the recovered cached-pan branch over the verified 36773 (UM-I – 2) field on the 0.4 m
 *    (data/hubble/umi-cached-provenance.json), coordinator decision 2026-10-27;
 *  - 'engine': a fresh general-field-engine field at the exact catalogue centre (fieldEngine.ts) from a bounded derived pack,
 *    registered into galaxyExposure.ts after an asynchronous, hash-checked load.
 * A target's telescopes are the records on which its configuration is verified; any other record is 'telescope' (never
 * switched automatically). */
import umiCached from '../../data/hubble/umi-cached-provenance.json';

export type ExtendedTelescope=0|1|2;
export type HubbleExtendedRoute='cached-umi'|'engine';
export type HubbleExtendedTarget=Readonly<{id:string;route:HubbleExtendedRoute;telescopes:readonly ExtendedTelescope[];policies:Readonly<Partial<Record<ExtendedTelescope,string>>>}>;
const umi=umiCached.targets.map(t=>Object.freeze({id:t.id,route:'cached-umi' as const,telescopes:Object.freeze([0 as const]),policies:Object.freeze({0:t.policyId})}));
export const HUBBLE_EXTENDED_TARGETS:readonly HubbleExtendedTarget[]=Object.freeze([...umi]);
export const HUBBLE_EXTENDED_IDS:readonly string[]=Object.freeze(HUBBLE_EXTENDED_TARGETS.map(t=>t.id));
export function hubbleExtendedTarget(id:unknown):HubbleExtendedTarget|null{return HUBBLE_EXTENDED_TARGETS.find(t=>t.id===id)??null;}
export function isHubbleExtendedId(id:unknown):boolean{return hubbleExtendedTarget(id)!==null;}
/** Telescope record of an extended-target journal policy, or null when the policy is not an extended one. */
export function hubbleExtendedPolicyTelescope(policy:unknown):ExtendedTelescope|null{
 for(const t of HUBBLE_EXTENDED_TARGETS)for(const i of t.telescopes)if(t.policies[i]===policy)return i;
 return null;
}
/** Every (target, telescope) bank key carried by the v29 wrapper, in table order. */
export const HUBBLE_EXTENDED_BANKS:readonly string[]=Object.freeze(HUBBLE_EXTENDED_TARGETS.flatMap(t=>t.telescopes.map(i=>extendedBankKey(t.id,i))));
export function extendedBankKey(id:string,telescope:ExtendedTelescope):string{return `${telescope}:${id}`;}
export function parseExtendedBankKey(key:string):Readonly<{id:string;telescope:ExtendedTelescope}>{
 const m=/^([012]):(.+)$/.exec(key);if(!m||!HUBBLE_EXTENDED_BANKS.includes(key))throw new Error('Unsupported extended bank');
 return Object.freeze({id:m[2],telescope:Number(m[1]) as ExtendedTelescope});
}
