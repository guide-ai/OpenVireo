/** Front F: the Hubble.HTL targets added after the frozen eight (docs/HUBBLE-13.md). This module is the single source of the
 * routes, telescopes and journal policies that the session wrapper (v29), the observing banks, telescope support and the
 * hot-list status read. hubbleHotList.ts still names each row's target by identifier (the 13-row table), and the target data
 * files (umi-*.json, engine-targets.json) carry the identities. Routes:
 *  - 'cached-umi': the recovered cached-pan branch over the verified 36773 (UM-I – 2) field on the 0.4 m
 *    (data/hubble/umi-cached-provenance.json), coordinator decision 2026-10-27;
 *  - 'engine': a fresh general-field-engine field at the exact catalogue centre (fieldEngine.ts, QSO 'merge') from a bounded
 *    derived pack (data/hubble/engine-*.json), prepared here (pure) and registered into galaxyExposure.ts by the asynchronous,
 *    hash-checked loader io/hubbleEngineTargets.ts. Every recorded integer in data/hubble/engine-targets.json must match.
 * A target's telescopes are the records on which its configuration is verified; any other record is 'telescope' (never
 * switched automatically); recorded reasons (e.g. the existing mean bound) explain why. */
import umiCached from '../../data/hubble/umi-cached-provenance.json';
import engineTargets from '../../data/hubble/engine-targets.json';

export type ExtendedTelescope=0|1|2;
export type HubbleExtendedRoute='cached-umi'|'engine';
export type HubbleExtendedTarget=Readonly<{id:string;route:HubbleExtendedRoute;telescopes:readonly ExtendedTelescope[];policies:Readonly<Partial<Record<ExtendedTelescope,string>>>}>;
const umi=umiCached.targets.map(t=>Object.freeze({id:t.id,route:'cached-umi' as const,telescopes:Object.freeze([0 as const]),policies:Object.freeze({0:t.policyId})}));
export type Recorded=(typeof engineTargets.targets)[number];
export type RecordedTelescope=Readonly<{telescope:number;status:string;policyId?:string;reasons?:readonly string[];cropSHA256?:string;pixelLevel?:number;fraction?:number;stars?:number;galaxies?:number;sourceFile?:string}>;
const available=(t:Recorded)=>(t.telescopes as readonly RecordedTelescope[]).filter(x=>x.status==='available');
const engine=engineTargets.targets.filter(t=>available(t).length).map(t=>Object.freeze({id:t.id,route:'engine' as const,telescopes:Object.freeze(available(t).map(x=>x.telescope as ExtendedTelescope)),policies:Object.freeze(Object.fromEntries(available(t).map(x=>[x.telescope,x.policyId!])))}));
export const HUBBLE_EXTENDED_TARGETS:readonly HubbleExtendedTarget[]=Object.freeze([...umi,...engine]);
export const HUBBLE_EXTENDED_IDS:readonly string[]=Object.freeze(HUBBLE_EXTENDED_TARGETS.map(t=>t.id));
export function hubbleExtendedTarget(id:unknown):HubbleExtendedTarget|null{return HUBBLE_EXTENDED_TARGETS.find(t=>t.id===id)??null;}
export function isHubbleExtendedId(id:unknown):boolean{return hubbleExtendedTarget(id)!==null;}
export function isHubbleEngineId(id:unknown):boolean{return hubbleExtendedTarget(id)?.route==='engine';}
/** Telescope record of an extended-target journal policy, or null when the policy is not an extended one. */
export function hubbleExtendedPolicyTelescope(policy:unknown):ExtendedTelescope|null{
 for(const t of HUBBLE_EXTENDED_TARGETS)for(const i of t.telescopes)if(t.policies[i]===policy)return i;
 return null;
}
export function extendedBankKey(id:string,telescope:ExtendedTelescope):string{return `${telescope}:${id}`;}
/** Every (target, telescope) bank key carried by the v29 wrapper, in table order. */
export const HUBBLE_EXTENDED_BANKS:readonly string[]=Object.freeze(HUBBLE_EXTENDED_TARGETS.flatMap(t=>t.telescopes.map(i=>extendedBankKey(t.id,i))));
export function parseExtendedBankKey(key:string):Readonly<{id:string;telescope:ExtendedTelescope}>{
 const m=/^([012]):(.+)$/.exec(key);if(!m||!HUBBLE_EXTENDED_BANKS.includes(key))throw new Error('Unsupported extended bank');
 return Object.freeze({id:m[2],telescope:Number(m[1]) as ExtendedTelescope});
}
export const HUBBLE_ENGINE_RECORD=engineTargets;
export function hubbleEngineRecord(id:string):Recorded{const t=engineTargets.targets.find(t=>t.id===id);if(!t)throw new HubbleEngineError('target');return t;}
export class HubbleEngineError extends Error{
 constructor(readonly code:'target'|'pack'|'evidence'|'spectrum'){super(`Hubble engine target: ${code}`);this.name='HubbleEngineError';}
}
/** Types of the prepared definitions (implemented in hubbleEnginePrepare.ts, which galaxyExposure.ts only references by type). */
export type {HubbleEngineDefinition,HubbleEngineConfiguration} from './hubbleEnginePrepare';
