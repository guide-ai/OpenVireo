// Front G5 (analysis/front-plans/front-g5.md §1): the field the observatory's sky view draws at any pointing, as VIREO's render
// 0x53a40c does (the build itself is io/skyFieldBuild.ts). This front end applies the Object X mask (2° plus max(0.62°, the
// field's farthest corner), the G4b rule; an unreadable ObjectX.HTL masks with its own reason), freezes the JD once per field,
// and shares ONE build per field key between its callers (the sky view and Edit Mode's layer; review 1 M4): each caller can
// cancel its own wait, and the build is cancelled only when no caller waits any more. In the browser the build runs in the
// Worker io/skyFieldWorker.ts; tests run it in process. A typed reason is returned where the field cannot be drawn exactly; the
// caller then keeps its ≤ 12 mag preview [W]. Same-origin files only; nothing is sent anywhere.
import {frozenObservatoryTime,type FieldTelescope,type FieldVariableTime} from '../core/fieldEngine';
import type {Pointing} from '../core/sky';
import {fieldMaskReach,objectXMaskState} from './objectXMask';
import {buildSkyField,type SkyField,type SkyFieldBuildRequest,type SkyFieldView} from './skyFieldBuild';
import {workerClient} from './workerClient';
import type {SkyFieldWorkerRequest} from './skyFieldWorker';
export type {SkyField,SkyFieldReason,SkyFieldView} from './skyFieldBuild';

export type SkyFieldRequest=Readonly<{view:SkyFieldView;anchor:Pointing;telescope:FieldTelescope;hidden:Pointing|null;finderMagnitudeLimit:number;signal?:AbortSignal;
 /** The observatory clock; its JD is frozen when the field is first built (frozenObservatoryTime) and kept with the field. */currentJd?:()=>number;variableTime?:FieldVariableTime}>;
/** Half-heights used for the Object X reach (fieldEngine.FIELD_HALF_DEGREES). */
const HALF={telescope:.375,finder:3.75} as const;
/** G4b: the observatory's floor for an assembled field's Object X reach (multiSpecFields.ts MULTISPEC_MASK_REACH). */
export const OBJECT_X_FIELD_REACH_FLOOR=0.62;

type Builder=(r:SkyFieldBuildRequest,signal:AbortSignal)=>Promise<SkyField>;
let builder:Builder|null=null;
/** Test seam: the build function (default: the Worker in a browser, in process elsewhere). */
export function setSkyFieldBuilder(b:Builder|null){builder=b;built.clear();inflight.clear();}
const ask=typeof Worker==='undefined'?null:workerClient(()=>new Worker(new URL('./skyFieldWorker.ts',import.meta.url),{type:'module'}));
type WorkerRequest=SkyFieldWorkerRequest extends infer R?R extends unknown?Omit<R,'ticket'>:never:never;
async function viaWorker(r:SkyFieldBuildRequest,signal:AbortSignal):Promise<SkyField>{
 const reply=await ask!({op:'build',request:r} satisfies WorkerRequest,signal);
 if(!reply.ok)throw new Error(`Sky field build failed: ${reply.kind??'load'}`);
 return reply.field as SkyField;
}
const build:Builder=(r,signal)=>(builder??(ask?viaWorker:buildSkyField))(r,signal);

/** Built fields (a few), so leaving and re-entering a view or the observatory does not rebuild; a pointing change past the cache or
 * a view change builds anew, as 0x53a40c reloads. The JD a field was built with stays with it (VIREO keeps a loaded field). */
const built=new Map<string,SkyField>();
type Shared={promise:Promise<SkyField>;controller:AbortController;waiting:number};
/** One in-flight build per key, shared by its waiting callers. */
const inflight=new Map<string,Shared>();
const keyOf=(r:SkyFieldRequest)=>[r.view,r.anchor.ra,r.anchor.dec,r.telescope,r.view==='finder'?Math.fround(r.finderMagnitudeLimit):''].join('|');
export function clearSkyFieldCache(){built.clear();}

function shared(key:string,r:SkyFieldBuildRequest):Shared{
 let e=inflight.get(key);
 if(!e){
  const controller=new AbortController(),promise=build(r,controller.signal).then(f=>{
   if(inflight.get(key)?.promise===promise){inflight.delete(key);built.set(key,f);while(built.size>4)built.delete(built.keys().next().value!);}
   return f;
  },err=>{if(inflight.get(key)?.promise===promise)inflight.delete(key);throw err;});
  promise.catch(()=>{});
  e={promise,controller,waiting:0};inflight.set(key,e);
 }
 return e;
}
/** Waits for the shared build; an abort of this caller rejects its own wait, and cancels the build when nobody else waits. */
function wait(key:string,e:Shared,signal?:AbortSignal):Promise<SkyField>{
 if(signal?.aborted)return Promise.reject(new DOMException('Sky field request was cancelled','AbortError'));
 e.waiting++;
 return new Promise<SkyField>((resolve,reject)=>{
  let done=false;
  const leave=()=>{done=true;signal?.removeEventListener('abort',abort);e.waiting--;};
  const abort=()=>{if(done)return;leave();if(e.waiting===0&&inflight.get(key)===e){inflight.delete(key);e.controller.abort();}reject(new DOMException('Sky field request was cancelled','AbortError'));};
  signal?.addEventListener('abort',abort,{once:true});
  e.promise.then(f=>{if(!done){leave();resolve(f);}},err=>{if(!done){leave();reject(err);}});
 });
}

export async function loadSkyField(r:SkyFieldRequest):Promise<SkyField>{
 const {view,anchor,signal}=r,key=keyOf(r);
 const reach=Math.max(OBJECT_X_FIELD_REACH_FLOOR,fieldMaskReach(anchor,HALF[view]));
 const mask=await objectXMaskState(r.hidden,anchor,reach);signal?.throwIfAborted();
 // Review 1 L2: an unreadable ObjectX.HTL masks (fail closed) with its own reason, not "near a target".
 if(mask!=='clear')return Object.freeze({status:'unavailable',view,anchor,reason:mask==='near'?'object-x-hidden':'object-x-unreadable'});
 const hit=built.get(key);if(hit){built.delete(key);built.set(key,hit);return hit;}
 const variableTime=r.variableTime??frozenObservatoryTime(r.currentJd);
 return wait(key,shared(key,{view,anchor,telescope:r.telescope,finderMagnitudeLimit:r.finderMagnitudeLimit,...(variableTime?{variableTime}:{})}),signal);
}
