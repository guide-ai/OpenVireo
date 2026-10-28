// Front F: asynchronous, hash-checked, lazy preparation of the general-field-engine Hubble targets (core/hubbleEngineTargets.ts,
// core/hubbleEnginePrepare.ts). Review 2 finding 1: a field is prepared only when its (target, telescope) is needed, one at a
// time, in a Worker (io/hubbleEngineWorker.ts) so the page never blocks; recorded-unavailable telescopes are never evaluated at
// runtime (their recorded reasons are verified by the tests). The crop digest is checked against data/hubble/engine-targets.json
// before the definition is registered into core/galaxyExposure.ts. The status is shared by every panel (one subscription), and a
// failure is reported and retryable. Nothing is persisted or sent anywhere.
import {HUBBLE_ENGINE_RECORD,HUBBLE_EXTENDED_TARGETS,HubbleEngineError,type ExtendedTelescope} from '../core/hubbleEngineTargets';
import {continuationSourcePreparer,type FieldContinuationSource} from '../core/fieldContinuation';
import type {HubbleEngineResources,PreparedEngineEntry} from './hubbleEngineEntry';
import type {HubbleEngineWorkerRequest} from './hubbleEngineWorker';
import {resourceSha256} from './boundedResource';

export type {HubbleEngineResources};
export type HubbleEngineStatus='idle'|'loading'|'ready'|'error';
/** A preparation that failed for a transient reason (network, worker): the caller may offer a retry. */
export class HubbleEngineLoadError extends Error{constructor(){super('Hubble engine field could not be prepared');this.name='HubbleEngineLoadError';}}
let resources:HubbleEngineResources|null=null;// null: the browser path (Worker)
const status=new Map<string,HubbleEngineStatus>(),pending=new Map<string,Promise<void>>(),listeners=new Set<()=>void>();
const key=(id:string,t:ExtendedTelescope)=>`${id}:${t}`;
function set(k:string,s:HubbleEngineStatus){status.set(k,s);for(const l of listeners)l();}
/** Test seam (recorded local bytes, prepared in process); null restores the browser Worker path. Clears statuses, not registrations. */
export function setHubbleEngineResources(r:HubbleEngineResources|null){resources=r;pending.clear();status.clear();for(const l of listeners)l();}
export function hubbleEngineTargetStatus(id:string,t:ExtendedTelescope):HubbleEngineStatus{return status.get(key(id,t))??'idle';}
export function subscribeHubbleEngineTargets(listener:()=>void):()=>void{listeners.add(listener);return()=>{listeners.delete(listener);};}

let worker:Worker|null=null,ticket=0;
const waiting=new Map<number,(m:{ok:boolean;definition?:PreparedEngineEntry['definition'];configuration?:Omit<PreparedEngineEntry['configuration'],'sourcePreparer'>})=>void>();
function viaWorker(id:string,telescope:ExtendedTelescope):Promise<PreparedEngineEntry>{
 if(!worker){
  worker=new Worker(new URL('./hubbleEngineWorker.ts',import.meta.url),{type:'module'});
  worker.onmessage=e=>{const w=waiting.get(e.data.ticket);waiting.delete(e.data.ticket);w?.(e.data);};
  worker.onerror=()=>{for(const w of waiting.values())w({ok:false});waiting.clear();worker?.terminate();worker=null;};
 }
 const mine=++ticket;
 return new Promise((resolve,reject)=>{
  waiting.set(mine,m=>{
   if(!m.ok||!m.definition||!m.configuration){reject(new HubbleEngineLoadError());return;}
   const c=m.configuration as PreparedEngineEntry['configuration']&{continuationSource?:FieldContinuationSource};
   const configuration=Object.freeze({...c,...(c.continuationSource?{sourcePreparer:continuationSourcePreparer(c.continuationSource)}:{})}) as PreparedEngineEntry['configuration'];
   resolve(Object.freeze({definition:m.definition,configuration}));
  });
  worker!.postMessage({ticket:mine,id,telescope} satisfies HubbleEngineWorkerRequest);
 });
}
async function prepare(id:string,telescope:ExtendedTelescope):Promise<void>{
 const target=HUBBLE_EXTENDED_TARGETS.find(t=>t.route==='engine'&&t.id===id);
 if(!target||!target.telescopes.includes(telescope))throw new HubbleEngineError('evidence');// only recorded-available telescopes
 let entry:PreparedEngineEntry;
 try{entry=resources?await (await import('./hubbleEngineEntry')).prepareEngineEntry(id,telescope,resources):await viaWorker(id,telescope);}
 catch(e){if(e instanceof HubbleEngineError)throw e;throw new HubbleEngineLoadError();}
 const recorded=(HUBBLE_ENGINE_RECORD.targets.find(t=>t.id===id)!.telescopes as readonly {telescope:number;cropSHA256?:string}[]).find(x=>x.telescope===telescope);
 if(!recorded||entry.definition.domain.telescopeRecord!==telescope||await resourceSha256(entry.configuration.viewport.rgb as Uint8Array<ArrayBuffer>)!==recorded.cropSHA256)throw new HubbleEngineError('evidence');
 (await import('../core/galaxyExposure')).registerEngineGalaxy(entry.definition,entry.configuration);
}
/** Resolves when this (target, telescope) is registered; rejects with a typed error (and allows a retry) otherwise. */
export function ensureHubbleEngineTarget(id:string,telescope:ExtendedTelescope):Promise<void>{
 const k=key(id,telescope);if(status.get(k)==='ready')return Promise.resolve();
 let p=pending.get(k);
 if(!p){
  set(k,'loading');
  p=prepare(id,telescope).then(()=>{pending.delete(k);set(k,'ready');},e=>{pending.delete(k);set(k,'error');throw e;});
  pending.set(k,p);
 }
 return p;
}
/** Every listed (target, telescope), sequentially; with no list, every recorded-available one (tests and full restores). */
export async function ensureHubbleEngineTargets(keys?:readonly (readonly [string,ExtendedTelescope])[]):Promise<void>{
 const all=keys??HUBBLE_EXTENDED_TARGETS.filter(t=>t.route==='engine').flatMap(t=>t.telescopes.map(i=>[t.id,i] as const));
 for(const [id,t] of all)await ensureHubbleEngineTarget(id,t);
}
