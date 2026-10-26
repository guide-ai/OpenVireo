// R-RX13 web audition of a stopped receiver trace (docs/RADIO-RECEIVER-AUDITION.md, RADIO-RECEIVER-AUDITION-PROVENANCE.json).
// A finite WEB sonification of the +0x587 trace store as the ported model holds it (RXD-01/02 store, RXD-03 replay range,
// FRAME row formula and Word store; radioReceiver.ts and radioReceiverDisplay.ts). It is not the native receiver sound: the
// audio path 0x57724c/0x576c28/0x576b04, waveOut*, the options sound fields and +0x42f are not used, PRE-01 is neither
// repaired nor reproduced, and no waveform, timing, device, pitch or loudness equivalence is claimed. Pure TypeScript: the
// functions read a bank snapshot and never change the bank, profile, trace, random stream, marks or recording. The only
// host module that turns the PCM into sound is components/receiverAuditionHost.ts.
import type {RadioReceiverBank} from './radioReceiver';
import type {RadioReceiverTrace} from './radioReceiverDisplay';

/** [W] Mapping and lifecycle constants (binary64; the samples are rounded to float32 last). */
export const RECEIVER_AUDITION_POLICY=Object.freeze({
 sampleRate:8000,samplesPerColumn:20,fadeSamples:80,peak:0.2,
 /** FRAME baseline 0x6e: a stored Word ≤ 110 is 0x6e − Round(signal · displayGain) with a non-negative signal and a
  * non-negative cached display gain [S/I] (a negative one is refused, WEB-RX-AUDITION-02). */
 baselineRow:0x6e,minColumns:2,maxColumns:400,maxSamples:8000,
 /** Host timers: a resume that has not run after resumeTimeoutMs (from the gesture) is blocked; a running audition ends at
  * the latest durationMs + endGuardMs after it actually started running. */
 resumeTimeoutMs:2000,endGuardMs:1000,
});
const P=RECEIVER_AUDITION_POLICY;

export type ReceiverAuditionSlot=0|1|2;
export type ReceiverAuditionRefusal='no-receiver'|'negative-gain'|'receiving'|'finishing'|'no-trace'|'too-short'|'missing-row'|'invalid-row'|'invalid-trace';
/** Frozen snapshot of the replayable range. trace is the bank's own (frozen) store object, kept for identity checks only. */
export type ReceiverAuditionSource=Readonly<{slot:ReceiverAuditionSlot;trace:RadioReceiverTrace;firstColumn:number;lastColumn:number;rows:readonly number[];
 key:Readonly<{verticalGain:number;frequencyMHz:number;horizontal:number}>}>;
export type ReceiverAuditionSourceResult=Readonly<{ok:true;source:ReceiverAuditionSource}|{ok:false;reason:ReceiverAuditionRefusal;column?:number}>;

const isSlot=(slot:number):slot is ReceiverAuditionSlot=>slot===0||slot===1||slot===2;
const refuse=(reason:ReceiverAuditionRefusal,column?:number):ReceiverAuditionSourceResult=>
 Object.freeze(column===undefined?{ok:false as const,reason}:{ok:false as const,reason,column});
/** The slot's cached display gain (+0x565) outside the admitted domain, or null. Read from the receiver only, never from the
 * live options: FormCreate caches verticalGain · sensitivity and Vert. Gain steps keep the sign of that sensitivity, so the
 * sign holds for every row of the slot's store [I, ported formCreate/stepVertical]. +0 and −0 are admitted (flat 110,
 * silence); a missing or non-finite value fails closed. */
const gainRefusal=(r:Readonly<{displayGain:number}>):ReceiverAuditionRefusal|null=>{
 const g=r.displayGain;
 return typeof g!=='number'||!Number.isFinite(g)?'invalid-trace':g<0?'negative-gain':null;
};

/**
 * WEB-RX-AUDITION-02: the replayable range of a stopped receiver, or why there is none. Refusals in this order: no receiver;
 * a negative cached display gain (negative-gain; a malformed one is invalid-trace), which holds for the slot's whole life and
 * so comes before any temporary reason; receiving; the main Timer1 still enabled (a pending stop finishing its sweep, or a
 * persistent tick error); lastX = 0 (never received, or erased by a title change: the store's replay range, not the canvas
 * bitmap); a malformed store; fewer than two columns; a null row (the frame stored no Word because its row was not an Int32
 * [W], for example with a very large Gain); a row that is not a Word. Range: main 1..lastX (the main's frame never writes
 * index 0, which holds the reset zero [I]); channels 0..lastX. Rows after lastX are never read. A partial range (lastX < 399)
 * is valid.
 */
export function receiverAuditionSource(bank:RadioReceiverBank,slot:number):ReceiverAuditionSourceResult{
 if(!isSlot(slot))return refuse('no-receiver');
 const r=bank.slots[slot];
 if(!r)return refuse('no-receiver');
 const gain=gainRefusal(r);
 if(gain)return refuse(gain);
 if(r.receiving)return refuse('receiving');
 if(bank.timerEnabled)return refuse('finishing');
 const trace=r.trace,lastX=trace?.lastX;
 if(lastX===0)return refuse('no-trace');
 if(!trace||!Array.isArray(trace.rows)||!Number.isInteger(trace.maxIndex)||!Number.isInteger(lastX)||lastX<0||lastX>trace.maxIndex||lastX>=trace.rows.length)
  return refuse('invalid-trace');
 const first=slot===0?1:0,last=lastX;
 const columns=last-first+1;
 if(columns<P.minColumns)return refuse('too-short');
 if(columns>P.maxColumns)return refuse('invalid-trace');
 const rows:number[]=[];
 for(let x=first;x<=last;x++){
  const w=trace.rows[x];
  if(w===null||w===undefined)return refuse('missing-row',x);
  if(typeof w!=='number'||!Number.isInteger(w)||w<0||w>0xffff)return refuse('invalid-row',x);
  rows.push(w);
 }
 return Object.freeze({ok:true as const,source:Object.freeze({slot,trace,firstColumn:first,lastColumn:last,rows:Object.freeze(rows),
  key:Object.freeze({verticalGain:r.verticalGain,frequencyMHz:r.frequencyMHz,horizontal:r.horizontal})})});
}

/** Frozen mono PCM at 8000 Hz. samples are float32 values held in a frozen number[] (Object.freeze rejects a non-empty
 * typed array); the host copies them into a Float32Array. clippedHigh: columns whose Word was above 110. */
export type ReceiverAuditionPcm=Readonly<{sampleRate:8000;samples:readonly number[];columns:number;firstColumn:number;lastColumn:number;clippedHigh:number;
 silent:boolean;durationMs:number}>;

/**
 * WEB-RX-AUDITION-01 mapping, operation order fixed:
 * 1. level per column a/110 with the integer a = 110 − w for w ≤ 110, a = 110 (full level) for w > 110, counted in
 *    clippedHigh. Within the admitted domain (cached display gain ≥ 0) a Word above 110 can only be a negative row truncated
 *    to a Word: the signal was above the top of the display [I]. Rows with Round(signal · gain) in [65536k, 65536k + 110],
 *    k ≥ 1, alias back into 0..110 and cannot be detected. No signed waveform is modelled.
 * 2. mean removal on exact integers: c = (n · a − Σa) / (110 · n), one binary64 division (|c| < 1; a flat trace gives
 *    exactly 0, which a binary64 running mean would not).
 * 3. hold: L = n · 20 samples, sample k uses column ⌊k / 20⌋.
 * 4. fade w(k) = min(1, k/80, (L − 1 − k)/80).
 * 5. s = (0.2 · c) · w(k), clamped to ±0.2, then Math.fround (−0 written as 0).
 * No normalisation: the stored rows already carry the display gain of each frame, and the current Vert. Gain is never applied.
 */
export function receiverAuditionPcm(source:ReceiverAuditionSource):ReceiverAuditionPcm{
 const rows=source.rows,n=rows.length,base=P.baselineRow;
 const levels:number[]=[];let clippedHigh=0,sum=0;
 for(const w of rows){
  const a=w<=base?base-w:base;
  if(w>base)clippedHigh++;
  levels.push(a);sum+=a;
 }
 const centred=levels.map(a=>(n*a-sum)/(base*n));
 const length=n*P.samplesPerColumn,samples:number[]=new Array<number>(length);
 let silent=true;
 for(let k=0;k<length;k++){
  const c=centred[Math.floor(k/P.samplesPerColumn)];
  const fade=Math.min(1,k/P.fadeSamples,(length-1-k)/P.fadeSamples);
  const s=Math.max(-P.peak,Math.min(P.peak,(P.peak*c)*fade));
  const v=Math.fround(s)||0;
  if(v!==0)silent=false;
  samples[k]=v;
 }
 return Object.freeze({sampleRate:8000 as const,samples:Object.freeze(samples),columns:n,firstColumn:source.firstColumn,lastColumn:source.lastColumn,clippedHigh,silent,
  durationMs:length*1000/P.sampleRate});
}

// ---------------------------------------------------------------- generation lease (WEB-RX-AUDITION-03)
export type ReceiverAuditionCause='finished'|'user'|'replaced'|'receiver-changed'|'route-hidden'|'document-hidden'|'busy'|'modal'|'unmount'|'blocked'|'interrupted';
export type ReceiverAuditionFailure='unsupported'|'create'|'buffer'|'connect'|'start'|'resume'|'cleanup-pending'|'cleanup-failed';
export type ReceiverAuditionNotice=Readonly<{slot:ReceiverAuditionSlot}&(
 |{kind:'refused';reason:ReceiverAuditionRefusal|'unavailable';column?:number}
 |{kind:'starting'}
 |{kind:'playing';pcm:ReceiverAuditionPcm}
 |{kind:'ended';cause:ReceiverAuditionCause}
 |{kind:'failed';failure:ReceiverAuditionFailure})>;
export type ReceiverAuditionLease=Readonly<{generation:number;slot:ReceiverAuditionSlot;source:ReceiverAuditionSource;pcm:ReceiverAuditionPcm;phase:'starting'|'playing'}>;
type Notices=readonly [ReceiverAuditionNotice|null,ReceiverAuditionNotice|null,ReceiverAuditionNotice|null];
export type ReceiverAuditionState=Readonly<{nextGeneration:number;active:ReceiverAuditionLease|null;notices:Notices}>;
/** stop: the generation the host must stop now (before any start); start: the generation and PCM to start in this gesture. */
export type ReceiverAuditionStep=Readonly<{state:ReceiverAuditionState;stop:number|null;start:Readonly<{generation:number;pcm:ReceiverAuditionPcm}>|null}>;
/** Inputs of the invalidation check, read by the presentation from its latest route state. */
export type ReceiverAuditionEnvironment=Readonly<{active:boolean;busy:boolean;modal:boolean;hidden:boolean}>;

const NO_NOTICES:Notices=Object.freeze([null,null,null] as const);
export const createReceiverAuditionState=():ReceiverAuditionState=>Object.freeze({nextGeneration:1,active:null,notices:NO_NOTICES});
const same=(state:ReceiverAuditionState):ReceiverAuditionStep=>Object.freeze({state,stop:null,start:null});
function withNotices(notices:Notices,...set:readonly ReceiverAuditionNotice[]):Notices{
 const next=[...notices] as [ReceiverAuditionNotice|null,ReceiverAuditionNotice|null,ReceiverAuditionNotice|null];
 for(const n of set)next[n.slot]=Object.freeze(n);
 return Object.freeze(next);
}
const state=(nextGeneration:number,active:ReceiverAuditionLease|null,notices:Notices):ReceiverAuditionState=>Object.freeze({nextGeneration,active,notices});

/** A press on a slot's audition button. The same slot active → stop ('user'). A refusal → notice only (another slot's lease
 * continues). Otherwise the active lease (if any) is stopped as 'replaced' and a new generation starts. */
export function pressReceiverAudition(s:ReceiverAuditionState,bank:RadioReceiverBank,slot:number):ReceiverAuditionStep{
 if(!isSlot(slot))return same(s);
 const a=s.active;
 if(a&&a.slot===slot)return Object.freeze({state:state(s.nextGeneration,null,withNotices(s.notices,{slot,kind:'ended',cause:'user'})),stop:a.generation,start:null});
 const r=receiverAuditionSource(bank,slot);
 if(!r.ok)return same(state(s.nextGeneration,a,withNotices(s.notices,{slot,kind:'refused',reason:r.reason,...(r.column===undefined?{}:{column:r.column})})));
 const generation=s.nextGeneration,pcm=receiverAuditionPcm(r.source);
 const lease:ReceiverAuditionLease=Object.freeze({generation,slot,source:r.source,pcm,phase:'starting'});
 const notices=a?withNotices(s.notices,{slot:a.slot,kind:'ended',cause:'replaced'},{slot,kind:'starting'}):withNotices(s.notices,{slot,kind:'starting'});
 return Object.freeze({state:state(generation+1,lease,notices),stop:a?a.generation:null,start:Object.freeze({generation,pcm})});
}
/** A refusal decided by the presentation before the core (route hidden, busy, a surface over the cards, page hidden). */
export function refuseReceiverAudition(s:ReceiverAuditionState,slot:number,reason:'unavailable'):ReceiverAuditionState{
 if(!isSlot(slot))return s;
 return state(s.nextGeneration,s.active,withNotices(s.notices,{slot,kind:'refused',reason}));
}
/** The host reports that generation actually runs. Any other generation or phase returns the same state object. */
export function receiverAuditionRunning(s:ReceiverAuditionState,generation:number):ReceiverAuditionStep{
 const a=s.active;
 if(!a||a.generation!==generation||a.phase!=='starting')return same(s);
 return same(state(s.nextGeneration,Object.freeze({...a,phase:'playing' as const}),withNotices(s.notices,{slot:a.slot,kind:'playing',pcm:a.pcm})));
}
/** The lease of generation ended (host event or presentation decision). Stale generations return the same state object. */
export function receiverAuditionEnded(s:ReceiverAuditionState,generation:number,cause:ReceiverAuditionCause):ReceiverAuditionStep{
 const a=s.active;
 if(!a||a.generation!==generation)return same(s);
 return Object.freeze({state:state(s.nextGeneration,null,withNotices(s.notices,{slot:a.slot,kind:'ended',cause})),stop:generation,start:null});
}
export function receiverAuditionFailed(s:ReceiverAuditionState,generation:number,failure:ReceiverAuditionFailure):ReceiverAuditionStep{
 const a=s.active;
 if(!a||a.generation!==generation)return same(s);
 return Object.freeze({state:state(s.nextGeneration,null,withNotices(s.notices,{slot:a.slot,kind:'failed',failure})),stop:generation,start:null});
}
/** Ends the active lease, whatever its generation, with cause (no lease: the same state). */
export const stopReceiverAudition=(s:ReceiverAuditionState,cause:ReceiverAuditionCause):ReceiverAuditionStep=>s.active?receiverAuditionEnded(s,s.active.generation,cause):same(s);

const keyChanged=(a:ReceiverAuditionSource['key'],r:Readonly<{verticalGain:number;frequencyMHz:number;horizontal:number}>)=>
 !Object.is(a.verticalGain,r.verticalGain)||!Object.is(a.frequencyMHz,r.frequencyMHz)||!Object.is(a.horizontal,r.horizontal);
/**
 * Why the active lease must stop now, or null. Priority: busy > route-hidden > modal > document-hidden > receiver-changed
 * (an unmount stops every lease directly). receiver-changed: the slot is empty, its trace store is another object (Receive
 * reset, title-change erase, close and re-create), the timer is on, it is receiving, Vert. Gain, Freq or Horz. Secs changed,
 * or its cached display gain is outside the admitted domain (a defensive branch: the same store object implies the same
 * FormCreate and so the same sign on the ported paths). Mark placement and drag, moves and other slots keep the store
 * object. Align, mark Clear and other paths that run the main's parameter refresh keep it only while the main title is
 * unchanged; when the title was left out of date (Pulsar List, clock reassociation), they erase lastX through a new store
 * object and the audition stops.
 */
export function receiverAuditionInvalidation(s:ReceiverAuditionState,bank:RadioReceiverBank,env:ReceiverAuditionEnvironment):ReceiverAuditionCause|null{
 const a=s.active;if(!a)return null;
 if(env.busy)return 'busy';
 if(!env.active)return 'route-hidden';
 if(env.modal)return 'modal';
 if(env.hidden)return 'document-hidden';
 const r=bank.slots[a.slot];
 if(!r||r.trace!==a.source.trace||bank.timerEnabled||r.receiving||keyChanged(a.source.key,r)||gainRefusal(r)!==null)return 'receiver-changed';
 return null;
}
/** Clears the notices of empty slots (a closed card's audition status disappears with the card). Unchanged: the same object. */
export function pruneReceiverAudition(s:ReceiverAuditionState,bank:RadioReceiverBank):ReceiverAuditionState{
 if(!s.notices.some((n,i)=>n!==null&&bank.slots[i]===null))return s;
 return state(s.nextGeneration,s.active,Object.freeze(s.notices.map((n,i)=>bank.slots[i]===null?null:n)) as unknown as Notices);
}
