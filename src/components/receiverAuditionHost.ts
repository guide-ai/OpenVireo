// R-RX13 Web Audio host of the receiver trace audition (docs/RADIO-RECEIVER-AUDITION.md, WEB-RX-AUDITION-04). The only
// module that touches AudioContext. It plays one finite PCM buffer per admitted user gesture and nothing else: no microphone,
// network, storage, worker thread, randomness or direct clock read (it only schedules its two declared timers through the
// injected setTimeout). Dependencies are injected so tests can use fakes; the browser deps read
// the constructor lazily. It never creates a context or starts a source after an await: every async callback can only
// promote a still-owned lease to running or stop it. A broken host API cannot be made to release audio; the host only calls
// stop/disconnect/close best effort and then refuses to construct more contexts (cleanup-failed).
import {RECEIVER_AUDITION_POLICY,type ReceiverAuditionFailure,type ReceiverAuditionPcm} from '../core/radioReceiverAudition';

/** The subset of AudioBuffer, AudioBufferSourceNode and AudioContext the host calls. */
export type AuditionBufferLike={copyToChannel(source:Float32Array,channel:number):void};
export type AuditionSourceLike={buffer:unknown;onended:(()=>void)|null;connect(destination:unknown):unknown;disconnect():void;start():void;stop():void};
export type AuditionContextLike={readonly state:string;readonly destination:unknown;onstatechange:(()=>void)|null;
 createBuffer(channels:number,length:number,sampleRate:number):AuditionBufferLike;createBufferSource():AuditionSourceLike;
 resume():Promise<void>;close():Promise<void>};
export type ReceiverAuditionDeps=Readonly<{createContext:(()=>AuditionContextLike)|null;setTimeout:(f:()=>void,ms:number)=>unknown;clearTimeout:(h:unknown)=>void}>;
/** Self-detected ends: finished (onended or the end guard after running), blocked (resume rejected, timed out, or not running
 * after it resolved; an end before running), interrupted (an unexpected statechange of a still-owned context). */
export type ReceiverAuditionHostEvent=Readonly<{kind:'running'|'finished'|'blocked'|'interrupted';generation:number}>;
export type ReceiverAuditionReadiness='idle'|'owned'|'retiring'|'cleanup-failed';
export type ReceiverAuditionHost=Readonly<{
 start:(generation:number,pcm:ReceiverAuditionPcm)=>'running'|'pending'|ReceiverAuditionFailure;
 stop:(generation:number)=>void;stopAll:()=>void;readiness:()=>ReceiverAuditionReadiness}>;

type Ctor=new()=>AuditionContextLike;
/** Browser dependencies: the standard constructor or the prefixed one, read when called (the first admitted press). */
export function browserReceiverAuditionDeps():ReceiverAuditionDeps{
 const g=globalThis as unknown as{AudioContext?:Ctor;webkitAudioContext?:Ctor};
 const C=g.AudioContext??g.webkitAudioContext;
 return Object.freeze({createContext:typeof C==='function'?()=>new C():null,
  setTimeout:(f:()=>void,ms:number)=>globalThis.setTimeout(f,ms),clearTimeout:(h:unknown)=>globalThis.clearTimeout(h as number)});
}

type Lease={generation:number;ctx:AuditionContextLike;source:AuditionSourceLike|null;started:boolean;phase:'pending'|'running';durationMs:number;
 resumeTimer:unknown;endTimer:unknown};
type Retiring={ctx:AuditionContextLike};
const thenable=(v:unknown):v is PromiseLike<unknown>=>typeof v==='object'&&v!==null&&typeof (v as {then?:unknown}).then==='function';

/**
 * One owned lease at most, and at most one retiring (closing) context; never both, since start refuses while a close is
 * pending. Every given-up context has had close() called; its settlement is tracked by identity, so a stale callback cannot
 * clear a newer record. A close that throws or rejects (or settles) with state ≠ 'closed' sets a permanent cleanup-failed
 * guard. emit is called only for self-detected changes of the still-owned lease, never for stop()/stopAll().
 */
export function createReceiverAuditionHost(deps:ReceiverAuditionDeps,emit:(e:ReceiverAuditionHostEvent)=>void):ReceiverAuditionHost{
 const P=RECEIVER_AUDITION_POLICY;
 let owned:Lease|null=null,retiring:Retiring|null=null,cleanupFailed=false;
 const safe=(f:()=>void)=>{try{f();}catch{/* best effort on a host API */}};
 const clear=(h:unknown)=>{if(h!==null)safe(()=>deps.clearTimeout(h));};
 /** A throwing state getter reads as 'broken': never running, never closed. */
 const stateOf=(ctx:AuditionContextLike)=>{try{return String(ctx.state);}catch{return 'broken';}};
 const closed=(ctx:AuditionContextLike)=>stateOf(ctx)==='closed';
 const settle=(record:Retiring,ok:boolean)=>{
  if(retiring!==record)return;
  retiring=null;if(!ok)cleanupFailed=true;
 };
 const retire=(ctx:AuditionContextLike)=>{
  const record:Retiring={ctx};retiring=record;
  let result:unknown;
  try{result=ctx.close();}catch{settle(record,closed(ctx));return;}
  if(thenable(result))result.then(()=>settle(record,closed(ctx)),()=>settle(record,closed(ctx)));
  else settle(record,closed(ctx));
 };
 /** Stops and gives up the lease (no event). Handlers are detached first, so the close's own statechange cannot recurse. */
 const release=(l:Lease)=>{
  if(owned!==l)return;
  owned=null;clear(l.resumeTimer);clear(l.endTimer);l.resumeTimer=null;l.endTimer=null;
  const src=l.source;
  safe(()=>{l.ctx.onstatechange=null;});
  if(src){
   safe(()=>{src.onended=null;});
   if(l.started)safe(()=>src.stop());
   safe(()=>src.disconnect());
  }
  retire(l.ctx);
 };
 const end=(l:Lease,kind:'finished'|'blocked'|'interrupted')=>{
  if(owned!==l)return;
  release(l);emit(Object.freeze({kind,generation:l.generation}));
 };
 const running=(l:Lease,announce:boolean)=>{
  if(owned!==l||l.phase==='running')return;
  l.phase='running';clear(l.resumeTimer);l.resumeTimer=null;
  l.endTimer=deps.setTimeout(()=>end(l,'finished'),l.durationMs+P.endGuardMs);
  if(announce)emit(Object.freeze({kind:'running',generation:l.generation}));
 };
 const stateChanged=(l:Lease)=>{
  if(owned!==l)return;
  const s=stateOf(l.ctx);
  if(l.phase==='pending'){if(s==='running')running(l,true);else if(s!=='suspended')end(l,'interrupted');}
  else if(s!=='running')end(l,'interrupted');
 };

 const start=(generation:number,pcm:ReceiverAuditionPcm):'running'|'pending'|ReceiverAuditionFailure=>{
  if(owned)release(owned);
  if(retiring&&closed(retiring.ctx))retiring=null;
  if(cleanupFailed)return 'cleanup-failed';
  if(retiring)return 'cleanup-pending';
  if(!deps.createContext)return 'unsupported';
  let ctx:AuditionContextLike;
  try{ctx=deps.createContext();}catch{return 'create';}
  const l:Lease={generation,ctx,source:null,started:false,phase:'pending',durationMs:pcm.durationMs,resumeTimer:null,endTimer:null};
  owned=l;
  const fail=(f:ReceiverAuditionFailure)=>{release(l);return f;};
  let buffer:AuditionBufferLike;
  try{buffer=ctx.createBuffer(1,pcm.samples.length,pcm.sampleRate);buffer.copyToChannel(Float32Array.from(pcm.samples),0);}catch{return fail('buffer');}
  try{const src=ctx.createBufferSource();l.source=src;src.buffer=buffer;src.connect(ctx.destination);}catch{return fail('connect');}
  const src=l.source!;
  try{ctx.onstatechange=()=>stateChanged(l);src.onended=()=>{if(owned===l)end(l,l.phase==='running'?'finished':'blocked');};src.start();l.started=true;}
  catch{return fail('start');}
  const s=stateOf(ctx);
  if(s==='running'){running(l,false);return 'running';}
  if(s==='closed'||s==='broken')return fail('start');
  // Pending: the timeout counts from the gesture; the end guard starts only once the context actually runs.
  l.resumeTimer=deps.setTimeout(()=>end(l,'blocked'),P.resumeTimeoutMs);
  let resumed:unknown;
  try{resumed=ctx.resume();}catch{return fail('resume');}
  if(!thenable(resumed)){if(stateOf(ctx)!=='running')return fail('resume');running(l,false);return 'running';}
  resumed.then(()=>{if(owned===l){if(stateOf(l.ctx)==='running')running(l,true);else end(l,'blocked');}},()=>end(l,'blocked'));
  return owned===l&&l.phase==='running'?'running':'pending';
 };
 return Object.freeze({start,
  stop:(generation:number)=>{if(owned&&owned.generation===generation)release(owned);},
  stopAll:()=>{if(owned)release(owned);},
  readiness:():ReceiverAuditionReadiness=>{
   if(retiring&&closed(retiring.ctx))retiring=null;
   return cleanupFailed?'cleanup-failed':owned?'owned':retiring?'retiring':'idle';
  }});
}
