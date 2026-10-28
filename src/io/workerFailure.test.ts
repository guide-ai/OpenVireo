import {describe,it,expect} from 'vitest';
import {workerFailureKind} from './workerFailure';
import {HubbleEngineError} from '../core/hubbleEngineTargets';
import {FieldEngineError} from '../core/fieldEngine';
import {ObjectXSpectrometerError} from './objectXSpectrometerInputs';
import {BoundedResourceError} from './boundedResource';
describe('Worker failure kinds (review 3 finding 4)',()=>{
 it('deterministic evidence mismatches are final; transport and resource problems are retryable',()=>{
  expect(workerFailureKind(new HubbleEngineError('evidence'))).toBe('evidence');expect(workerFailureKind(new FieldEngineError('evidence'))).toBe('evidence');
  expect(workerFailureKind(new ObjectXSpectrometerError('pack'))).toBe('evidence');expect(workerFailureKind(new ObjectXSpectrometerError('resource'))).toBe('load');
  expect(workerFailureKind(new TypeError('Failed to fetch'))).toBe('load');expect(workerFailureKind('x')).toBe('load');
  expect(workerFailureKind(Object.assign(new Error('x'),{name:'BoundedResourceError'}))).toBe('load');void BoundedResourceError;
 });
});
import {vi} from 'vitest';
import {observeObjectXSpectrum,setObjectXSpectrometerResources,ObjectXSpectrometerEvidenceError,ObjectXSpectrometerLoadError} from './objectXSpectrometer';
import {WORKER_HEARTBEAT_MS,WORKER_INACTIVITY_TIMEOUT_MS,workerBusy} from './workerClient';
class FakeWorker{static made:FakeWorker[]=[];static reply:((w:FakeWorker,ticket:number)=>void)|null=null;
 onmessage:((e:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;terminated=false;constructor(){FakeWorker.made.push(this);}
 postMessage(m:{ticket:number}){FakeWorker.reply?.(this,m.ticket);}terminate(){this.terminated=true;}}
function fakeWorkers(){FakeWorker.made=[];FakeWorker.reply=null;vi.stubGlobal('Worker',FakeWorker);vi.useFakeTimers();}
function restore(){vi.useRealTimers();vi.unstubAllGlobals();}
describe('Object X Worker replies (inactivity timeout, review 4 item 6)',()=>{
 it('a silent Worker is evicted after the inactivity timeout and the next call starts afresh; an evidence reply is final',async()=>{
  fakeWorkers();setObjectXSpectrometerResources(null);
  try{
   const first=observeObjectXSpectrum({ra:1,dec:2},0);const caught=first.catch(e=>e);
   await vi.advanceTimersByTimeAsync(WORKER_INACTIVITY_TIMEOUT_MS+WORKER_HEARTBEAT_MS+1);
   expect(await caught).toBeInstanceOf(ObjectXSpectrometerLoadError);expect(FakeWorker.made[0].terminated).toBe(true);
   FakeWorker.reply=(w,ticket)=>queueMicrotask(()=>w.onmessage!({data:{ticket,ok:false,kind:'evidence'}}));
   await expect(observeObjectXSpectrum({ra:1,dec:2},0)).rejects.toBeInstanceOf(ObjectXSpectrometerEvidenceError);
   expect(FakeWorker.made).toHaveLength(2);// the pending entry was evicted: a fresh Worker and request
  }finally{restore();setObjectXSpectrometerResources(null);}
 });
 it('a slow Worker that keeps sending heartbeats is never evicted, however long the reply takes',async()=>{
  fakeWorkers();setObjectXSpectrometerResources(null);
  try{
   let pending:{w:FakeWorker;ticket:number}|null=null;FakeWorker.reply=(w,ticket)=>{pending={w,ticket};};
   const settled=observeObjectXSpectrum({ra:3,dec:4},1).then(()=>'ok',e=>e);
   for(let t=0;t<5*WORKER_INACTIVITY_TIMEOUT_MS;t+=WORKER_HEARTBEAT_MS){pending!.w.onmessage!({data:{heartbeat:true}});await vi.advanceTimersByTimeAsync(WORKER_HEARTBEAT_MS);}
   expect(pending!.w.terminated).toBe(false);
   pending!.w.onmessage!({data:{ticket:pending!.ticket,ok:false,kind:'evidence'}});
   expect(await settled).toBeInstanceOf(ObjectXSpectrometerEvidenceError);// the reply, not an eviction
  }finally{restore();setObjectXSpectrometerResources(null);}
 });
 it('the Worker side heartbeats only while a request is in flight',async()=>{
  vi.useFakeTimers();
  try{
   const posts:unknown[]=[];const a=workerBusy(m=>posts.push(m)),b=workerBusy(m=>posts.push(m));
   await vi.advanceTimersByTimeAsync(WORKER_HEARTBEAT_MS*2);expect(posts).toEqual([{heartbeat:true},{heartbeat:true}]);
   a();await vi.advanceTimersByTimeAsync(WORKER_HEARTBEAT_MS);expect(posts).toHaveLength(3);
   b();b();await vi.advanceTimersByTimeAsync(WORKER_HEARTBEAT_MS*3);expect(posts).toHaveLength(3);
  }finally{vi.useRealTimers();}
 });
});
import {ensureHubbleEngineTarget,hubbleEngineTargetStatus,HubbleEngineLoadError,setHubbleEngineResources} from './hubbleEngineTargets';
import {HUBBLE_EXTENDED_TARGETS} from '../core/hubbleEngineTargets';
describe('Hubble engine preparation: a transient failure after the reply is retryable',()=>{
 it('crypto.subtle failing on the returned crop is a load error (status error), not final evidence',async()=>{
  const t=HUBBLE_EXTENDED_TARGETS.find(x=>x.route==='engine')!,tel=t.telescopes[0];
  vi.stubGlobal('Worker',FakeWorker);FakeWorker.made=[];
  FakeWorker.reply=(w,ticket)=>queueMicrotask(()=>w.onmessage!({data:{ticket,ok:true,definition:{domain:{telescopeRecord:tel}},configuration:{viewport:{rgb:new Uint8Array(3)}}}}));
  const subtle=vi.spyOn(globalThis.crypto.subtle,'digest').mockRejectedValue(new DOMException('transient','OperationError'));
  setHubbleEngineResources(null);
  try{
   await expect(ensureHubbleEngineTarget(t.id,tel)).rejects.toBeInstanceOf(HubbleEngineLoadError);
   expect(hubbleEngineTargetStatus(t.id,tel)).toBe('error');
  }finally{subtle.mockRestore();vi.unstubAllGlobals();setHubbleEngineResources(null);}
 });
});
import {FieldEngineError as FE} from '../core/fieldEngine';
describe('Hubble engine preparation in process: failures typed as in the Worker path (review 5)',()=>{
 const t=HUBBLE_EXTENDED_TARGETS.find(x=>x.route==='engine')!,tel=t.telescopes[0];
 const seam=(e:unknown)=>({glx:async()=>{throw e;},qso:async()=>{throw e;},spectrum:async()=>{throw e;}});
 it('a deterministic error is final (invalid); an unexpected runtime error is retryable (error)',async()=>{
  try{
   setHubbleEngineResources(seam(new FE('evidence')));
   await expect(ensureHubbleEngineTarget(t.id,tel)).rejects.toMatchObject({name:'HubbleEngineError'});expect(hubbleEngineTargetStatus(t.id,tel)).toBe('invalid');
   setHubbleEngineResources(seam(new TypeError('transient')));
   await expect(ensureHubbleEngineTarget(t.id,tel)).rejects.toBeInstanceOf(HubbleEngineLoadError);expect(hubbleEngineTargetStatus(t.id,tel)).toBe('error');
  }finally{setHubbleEngineResources(null);}
 });
});
