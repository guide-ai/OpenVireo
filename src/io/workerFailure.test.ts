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
import {WORKER_REPLY_TIMEOUT_MS} from './workerFailure';
describe('Object X Worker replies',()=>{
 it('a silent Worker is evicted after the timeout and the next call starts afresh; an evidence reply is final',async()=>{
  const made:FakeWorker[]=[];let reply:((w:FakeWorker,ticket:number)=>void)|null=null;
  class FakeWorker{onmessage:((e:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;terminated=false;constructor(){made.push(this);}
   postMessage(m:{ticket:number}){if(reply)reply(this,m.ticket);}terminate(){this.terminated=true;}}
  vi.stubGlobal('Worker',FakeWorker);vi.useFakeTimers();setObjectXSpectrometerResources(null);
  try{
   const first=observeObjectXSpectrum({ra:1,dec:2},0);const caught=first.catch(e=>e);
   await vi.advanceTimersByTimeAsync(WORKER_REPLY_TIMEOUT_MS+1);
   expect(await caught).toBeInstanceOf(ObjectXSpectrometerLoadError);expect(made[0].terminated).toBe(true);
   reply=(w,ticket)=>queueMicrotask(()=>w.onmessage!({data:{ticket,ok:false,kind:'evidence'}}));
   await expect(observeObjectXSpectrum({ra:1,dec:2},0)).rejects.toBeInstanceOf(ObjectXSpectrometerEvidenceError);
   expect(made).toHaveLength(2);// the pending entry was evicted: a fresh Worker and request
  }finally{vi.useRealTimers();vi.unstubAllGlobals();setObjectXSpectrometerResources(null);}
 });
});
