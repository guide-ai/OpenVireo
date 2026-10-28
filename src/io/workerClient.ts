// Review 4 item 6 (monotonic clock: performance.now, review 5): one request/reply client for the page's Workers, with an inactivity timeout instead of a reply deadline.
// While a Worker holds requests it posts a heartbeat every WORKER_HEARTBEAT_MS (its timers run whenever it awaits a download or
// a decode); the page evicts it only after WORKER_INACTIVITY_TIMEOUT_MS with no message at all (no heartbeat, no reply), so a slow
// but working Worker is never killed and a hung or crashed one is. Eviction rejects every held request as a retryable load failure.
import type {WorkerFailureKind} from './workerFailure';

export const WORKER_HEARTBEAT_MS=5_000;
/** How long a page waits with no message from a busy Worker before evicting it (and every request it holds). */
export const WORKER_INACTIVITY_TIMEOUT_MS=60_000;
export type WorkerReply=Readonly<{ticket:number;ok:boolean;kind?:WorkerFailureKind}>&Record<string,unknown>;
type Waiter=(m:WorkerReply)=>void;

export function workerClient(create:()=>Worker){
 let worker:Worker|null=null,ticket=0,last=0,watch:ReturnType<typeof setInterval>|null=null;
 const waiting=new Map<number,Waiter>();
 function drop(){
  if(watch!==null)clearInterval(watch);watch=null;
  const held=[...waiting.values()];waiting.clear();worker?.terminate();worker=null;
  for(const w of held)w({ticket:0,ok:false,kind:'load'});
 }
 function start(){
  worker=create();last=performance.now();
  worker.onmessage=(e:MessageEvent)=>{last=performance.now();const d=e.data as WorkerReply&{heartbeat?:true};if(d?.heartbeat)return;const w=waiting.get(d.ticket);waiting.delete(d.ticket);w?.(d);};
  worker.onerror=drop;
  watch=setInterval(()=>{if(waiting.size===0)last=performance.now();else if(performance.now()-last>WORKER_INACTIVITY_TIMEOUT_MS)drop();},WORKER_HEARTBEAT_MS);
 }
 /** Posts one request; resolves with the Worker's reply, or a {ok:false,kind:'load'} reply when the Worker is evicted. */
 return function request<T extends object>(message:T):Promise<WorkerReply>{
  if(!worker)start();
  if(waiting.size===0)last=performance.now();// the silence clock starts when the Worker becomes busy
  const mine=++ticket;
  return new Promise(resolve=>{waiting.set(mine,resolve);worker!.postMessage({...message,ticket:mine});});
 };
}
/** Worker side: heartbeats while at least one request is in flight; call the returned function when a request settles. */
export function workerBusy(post:(m:unknown)=>void):()=>void{
 const g=globalThis as unknown as {__openvireoBusy?:{n:number;id:ReturnType<typeof setInterval>|null}};
 const b=(g.__openvireoBusy??={n:0,id:null});
 if(b.n++===0)b.id=setInterval(()=>post({heartbeat:true}),WORKER_HEARTBEAT_MS);
 let done=false;
 return()=>{if(done)return;done=true;if(--b.n===0&&b.id!==null){clearInterval(b.id);b.id=null;}};
}
