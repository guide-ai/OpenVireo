import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {PulsarRecord} from './radioPulsarCatalog';
import {RADIO_RECEIVER_COMPILED_OPTIONS,type RadioReceiverBank} from './radioReceiver';
import {
 RECEIVER_AUDITION_POLICY,createReceiverAuditionState,pressReceiverAudition,pruneReceiverAudition,receiverAuditionEnded,receiverAuditionFailed,receiverAuditionInvalidation,
 receiverAuditionPcm,receiverAuditionRunning,receiverAuditionSource,refuseReceiverAudition,stopReceiverAudition,
 type ReceiverAuditionEnvironment,type ReceiverAuditionSource,
} from './radioReceiverAudition';
import {
 addReceiverWindow,clearReceiverNextMark,copyReceiverLiveOptions,createRadioReceiverSession,openReceiverWindow,overwriteReceiverSourceBuffer,placeReceiverMark,stepReceiver,
 tickReceivers,toggleReceiverAlignment,toggleReceiverMode,
 type RadioReceiverSession,type ReceiverSessionTransition,
} from './radioReceiverSession';

// [W] contract checks of the R-RX13 web audition (docs/RADIO-RECEIVER-AUDITION.md). Expected vectors are written by hand from
// the declared mapping; synthetic traces only, never CLEA observations or native audio. Not an oracle for the original.
// Every mock slot carries sensitivity and the cached displayGain = verticalGain · sensitivity (as FormCreate sets them).
type SlotSpec=Readonly<{rows:readonly (number|null)[];lastX:number;receiving?:boolean;verticalGain?:number;sensitivity?:number;frequencyMHz?:number;horizontal?:number;maxIndex?:number}>;
const traceOf=(rows:readonly (number|null)[],lastX:number,maxIndex=399)=>Object.freeze({maxIndex,dt:0.01,rows:Object.freeze([...rows]),lastX});
const rx=(index:0|1|2,s:SlotSpec)=>{
 const verticalGain=s.verticalGain??1,sensitivity=s.sensitivity??1;
 return Object.freeze({index,receiving:s.receiving??false,verticalGain,sensitivity,displayGain:verticalGain*sensitivity,frequencyMHz:s.frequencyMHz??600,horizontal:s.horizontal??4,
  trace:traceOf(s.rows,s.lastX,s.maxIndex)});
};
const bankOf=(slots:readonly (SlotSpec|null)[],timerEnabled=false)=>
 Object.freeze({slots:Object.freeze([0,1,2].map(i=>slots[i]?rx(i as 0|1|2,slots[i]!):null)),timerEnabled}) as unknown as RadioReceiverBank;
const rows400=(f:(x:number)=>number|null)=>Array.from({length:400},(_,x)=>f(x));
const ok=(bank:RadioReceiverBank,slot:number):ReceiverAuditionSource=>{const r=receiverAuditionSource(bank,slot);if(!r.ok)throw new Error(r.reason);return r.source;};
const pcmOf=(bank:RadioReceiverBank,slot:number)=>receiverAuditionPcm(ok(bank,slot));
/** float32 comparison: the sample is a float32 value within one float32 ulp of the binary64 expectation. */
function f32(actual:number,expected:number){
 expect(Math.fround(actual)).toBe(actual);
 expect(Math.abs(actual-expected)).toBeLessThanOrEqual(Math.max(Math.abs(expected)*2**-23,2**-149));
}
const PEAK32=Math.fround(RECEIVER_AUDITION_POLICY.peak);

describe('WEB-RX-AUDITION-02 replayable range and refusals',()=>{
 const main=(rows:readonly (number|null)[],lastX:number,more:Partial<SlotSpec>={})=>bankOf([{rows,lastX,...more}]);
 const child=(rows:readonly (number|null)[],lastX:number,more:Partial<SlotSpec>={})=>bankOf([{rows:rows400(()=>50),lastX:399},{rows,lastX,...more}]);
 it('V1 main: index 0 excluded, 399 columns, 7980 samples, flat trace silent',()=>{
  const p=pcmOf(main(rows400(x=>x===0?0:50),399),0);
  expect([p.firstColumn,p.lastColumn,p.columns,p.samples.length,p.durationMs,p.silent,p.clippedHigh]).toEqual([1,399,399,7980,997.5,true,0]);
  expect(p.samples.every(v=>Object.is(v,0))).toBe(true);
 });
 it('V4 main: a full-level row 0 does not play (it is the reset zero, not a sample)',()=>{
  const p=pcmOf(main(rows400(x=>x===0?0:110),399),0);
  expect(p.firstColumn).toBe(1);expect(p.silent).toBe(true);
  // A child with the same rows plays column 0.
  expect(pcmOf(child(rows400(x=>x===0?0:110),399),1).silent).toBe(false);
 });
 it('V2 channel [110, 0]: 40 samples, −k/800 then (39 − k)/800, both ends 0',()=>{
  const p=pcmOf(child([110,0,...rows400(()=>null).slice(2)],1),1);
  expect([p.firstColumn,p.lastColumn,p.columns,p.samples.length,p.durationMs,p.clippedHigh,p.silent]).toEqual([0,1,2,40,5,0,false]);
  for(let k=0;k<40;k++)f32(p.samples[k],k<=19?-k/800:(39-k)/800);
  expect(Object.is(p.samples[0],0)).toBe(true);expect(Object.is(p.samples[39],0)).toBe(true);
 });
 it('V3 a Word above 110 is clipped high (full level); 110 is level 0 and 111 is clipped',()=>{
  const a=pcmOf(child([65535,110],1),1),b=pcmOf(child([111,110],1),1),c=pcmOf(child([110,110],1),1);
  expect(a.clippedHigh).toBe(1);expect(b.clippedHigh).toBe(1);expect(c.clippedHigh).toBe(0);expect(c.silent).toBe(true);
  for(let k=0;k<40;k++){f32(a.samples[k],k<=19?k/800:-(39-k)/800);expect(b.samples[k]).toBe(a.samples[k]);}
  // A row of 0 (top of the display) is level 1 without counting as clipped.
  expect(pcmOf(child([0,110],1),1).clippedHigh).toBe(0);
 });
 it('removes the mean in column order and fades 80 samples at both ends',()=>{
  const p=pcmOf(child([0,55,110],2),1);// levels 1, 0.5, 0; mean 0.5
  expect(p.samples.length).toBe(60);
  f32(p.samples[10],0.1*(10/80));f32(p.samples[25],0);f32(p.samples[50],-0.1*(9/80));
  expect(p.samples.slice(20,40).every(v=>v===0)).toBe(true);
 });
 it('V5 a null row in the range is refused with its column; main index 0 is outside the range',()=>{
  expect(receiverAuditionSource(main(rows400(x=>x===37?null:50),399),0)).toEqual({ok:false,reason:'missing-row',column:37});
  expect(receiverAuditionSource(child(rows400(x=>x===0?null:50),399),1)).toEqual({ok:false,reason:'missing-row',column:0});
  expect(receiverAuditionSource(main(rows400(x=>x===0?null:50),399),0).ok).toBe(true);
 });
 it('V6 a value that is not a Word is refused',()=>{
  for(const bad of [70000,1.5,-1,Number.NaN,Number.POSITIVE_INFINITY])
   expect(receiverAuditionSource(child([50,bad,50],2),1)).toEqual({ok:false,reason:'invalid-row',column:1});
 });
 it('V7 no stored trace, V8 too short, V10 the 400-column maximum, V10b a malformed store',()=>{
  expect(receiverAuditionSource(main(rows400(()=>0),0),0)).toEqual({ok:false,reason:'no-trace'});
  expect(receiverAuditionSource(main(rows400(()=>50),1),0)).toEqual({ok:false,reason:'too-short'});
  expect(receiverAuditionSource(child(rows400(()=>50),1),1).ok).toBe(true);
  const p=pcmOf(child(rows400(x=>x%2?20:90),399),1);
  expect([p.columns,p.samples.length,p.durationMs]).toEqual([400,RECEIVER_AUDITION_POLICY.maxSamples,1000]);
  expect(receiverAuditionSource(child(rows400(()=>50),400),1)).toEqual({ok:false,reason:'invalid-trace'});
  expect(receiverAuditionSource(child(rows400(()=>50),1.5),1)).toEqual({ok:false,reason:'invalid-trace'});
  expect(receiverAuditionSource(child(rows400(()=>50).slice(0,9),9),1)).toEqual({ok:false,reason:'invalid-trace'});
  expect(receiverAuditionSource(child(rows400(()=>50),20,{maxIndex:10}),1)).toEqual({ok:false,reason:'invalid-trace'});
 });
 it('V9 receiving, a pending stop and a tick error with the timer on are refused; empty and foreign slots too',()=>{
  const s:SlotSpec={rows:rows400(()=>50),lastX:399};
  expect(receiverAuditionSource(bankOf([{...s,receiving:true}],true),0)).toEqual({ok:false,reason:'receiving'});
  expect(receiverAuditionSource(bankOf([s,s],true),0)).toEqual({ok:false,reason:'finishing'});
  expect(receiverAuditionSource(bankOf([s,s],true),1)).toEqual({ok:false,reason:'finishing'});
  for(const slot of [2,3,-1,0.5,Number.NaN])expect(receiverAuditionSource(bankOf([s,s]),slot)).toEqual({ok:false,reason:'no-receiver'});
 });
 it('V11 a partial range reads nothing after lastX',()=>{
  const p=pcmOf(child(rows400(x=>x<=9?(x%2?30:80):x===10?null:70000),9),1);
  expect([p.firstColumn,p.lastColumn,p.columns,p.samples.length]).toEqual([0,9,10,200]);
 });
 it('V12 non-silent output: zero ends and |s| ≤ peak',()=>{
  for(const b of [child([0,110],1),child(rows400(x=>(x*37)%111),399),main(rows400(x=>(x*53)%140),399),child([65535,0,110,7],3)]){
   const p=pcmOf(b,b.slots[1]?1:0);
   expect(p.silent).toBe(false);expect(p.samples[0]).toBe(0);expect(p.samples.at(-1)).toBe(0);
   expect(Math.max(...p.samples.map(Math.abs))).toBeLessThanOrEqual(PEAK32);
   expect(p.samples.every(v=>Math.fround(v)===v)).toBe(true);
  }
 });
 it('V13 deterministic, frozen output, input untouched; V14 the current Vert. Gain is not applied',()=>{
  const b=child(rows400(x=>(x*29)%120),399),before=JSON.stringify(b);
  const p1=pcmOf(b,1),p2=pcmOf(b,1);
  expect(p2.samples).toEqual(p1.samples);expect(JSON.stringify(b)).toBe(before);
  expect(Object.isFrozen(p1)).toBe(true);expect(Object.isFrozen(p1.samples)).toBe(true);
  const src=ok(b,1);expect(Object.isFrozen(src)).toBe(true);expect(Object.isFrozen(src.rows)).toBe(true);expect(Object.isFrozen(src.key)).toBe(true);
  expect(src.trace).toBe(b.slots[1]!.trace);
  expect(pcmOf(child(rows400(x=>(x*29)%120),399,{verticalGain:8}),1).samples).toEqual(p1.samples);
 });
 it('V15 a negative cached display gain is refused before receiving, finishing and lastX = 0; a press starts nothing',()=>{
  const neg:SlotSpec={rows:rows400(x=>(x*7)%111),lastX:399,sensitivity:-1};
  expect(receiverAuditionSource(bankOf([neg]),0)).toEqual({ok:false,reason:'negative-gain'});
  expect(receiverAuditionSource(bankOf([{...neg,receiving:true}],true),0)).toEqual({ok:false,reason:'negative-gain'});
  expect(receiverAuditionSource(bankOf([{rows:rows400(()=>50),lastX:399},neg],true),1)).toEqual({ok:false,reason:'negative-gain'});
  expect(receiverAuditionSource(bankOf([{...neg,lastX:0}]),0)).toEqual({ok:false,reason:'negative-gain'});
  expect(receiverAuditionSource(bankOf([{...neg,verticalGain:0.125}]),0)).toEqual({ok:false,reason:'negative-gain'});
  const step=pressReceiverAudition(createReceiverAuditionState(),bankOf([neg]),0);
  expect(step.start).toBeNull();expect(step.stop).toBeNull();expect(step.state.active).toBeNull();
  expect(step.state.notices[0]).toEqual({slot:0,kind:'refused',reason:'negative-gain'});
 });
 it('V16 a zero or −0 cached display gain is admitted (flat 110, silent); a missing or non-finite one is invalid-trace',()=>{
  for(const sensitivity of [0,-0]){
   const p=pcmOf(child(rows400(()=>110),399,{sensitivity}),1);
   expect([p.columns,p.samples.length,p.silent,p.clippedHigh]).toEqual([400,8000,true,0]);
  }
  const s0=bankOf([{rows:rows400(()=>50),lastX:399}]),slot=s0.slots[0]!;
  const patched=(patch:object)=>Object.freeze({...s0,slots:Object.freeze([Object.freeze({...slot,...patch}),null,null])}) as unknown as RadioReceiverBank;
  const withoutGain:Record<string,unknown>={...slot};delete withoutGain.displayGain;
  const missing=Object.freeze({...s0,slots:Object.freeze([Object.freeze(withoutGain),null,null])}) as unknown as RadioReceiverBank;
  expect(receiverAuditionSource(missing,0)).toEqual({ok:false,reason:'invalid-trace'});
  for(const displayGain of [Number.NaN,Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY])
   expect(receiverAuditionSource(patched({displayGain}),0)).toEqual({ok:false,reason:'invalid-trace'});
 });
});

// ---- The ported session gives the store this contract reads (main 1..399 and channel 0..399 after a finished stop).
const rec=(o:Partial<PulsarRecord>={}):PulsarRecord=>Object.freeze({primaryName:'J0000+00',legacyName:'B0000+00',ra:6,dec:10,x2a:0.5,x34:0,x3e:2451545,
 s48:Math.fround(30),s4c:Math.fround(10),s50:Math.fround(5),s54:Math.fround(8),s58:Math.fround(4),s5c:Math.fround(2),...o});
const POINT=Object.freeze({ra:6,dec:10}),JD=2451545.25;
let clock=1000;
const now=()=>(clock+=1e-6);
const take=(t:ReceiverSessionTransition)=>{if(t.outcome.kind!=='ok')throw new Error(JSON.stringify(t.outcome));return t.session;};
const mode=(s:RadioReceiverSession)=>take(toggleReceiverMode(s,{jd:JD,now:now()}));
const openMain=(s:RadioReceiverSession)=>take(openReceiverWindow(s,{catalog:[rec()],pointing:POINT}));
function finishedSession(){
 return sweep(take(addReceiverWindow(openMain(createRadioReceiverSession()))));
}
/** Receive, ten ticks, Stop, then ticks until the sweep finishes. */
function sweep(start:RadioReceiverSession){
 let s=mode(start);
 const receiving=s;
 for(let i=0;i<10;i++)s=tickReceivers(s,{jd:JD,now:now()}).session;
 s=mode(s);
 const finishing=s;
 for(let i=0;i<400&&s.bank.timerEnabled;i++)s=tickReceivers(s,{jd:JD,now:now()}).session;
 return {receiving,finishing,done:s};
}

describe('R-RX13 on the ported session store',()=>{
 const {receiving,finishing,done}=finishedSession();
 it('refuses while receiving and finishing; after the finish the main plays 1..399 and the channel 0..399',()=>{
  expect(receiverAuditionSource(receiving.bank,0)).toEqual({ok:false,reason:'receiving'});
  expect(receiverAuditionSource(finishing.bank,0)).toEqual({ok:false,reason:'finishing'});
  expect(receiverAuditionSource(finishing.bank,1)).toEqual({ok:false,reason:'finishing'});
  expect(done.bank.timerEnabled).toBe(false);
  const m=ok(done.bank,0),c=ok(done.bank,1);
  expect([m.firstColumn,m.lastColumn,m.rows.length]).toEqual([1,399,399]);
  expect([c.firstColumn,c.lastColumn,c.rows.length]).toEqual([0,399,400]);
  expect(receiverAuditionPcm(m).samples.length).toBe(7980);expect(receiverAuditionPcm(c).samples.length).toBe(8000);
 });
 it('reads a snapshot only: the bank, random stream, profile and trace stay the same objects and values',()=>{
  const b=done.bank,json=JSON.stringify(b),random=b.random,profile=b.profile,trace=b.slots[0]!.trace;
  let st=createReceiverAuditionState();
  st=pressReceiverAudition(st,b,0).state;st=receiverAuditionRunning(st,1).state;
  receiverAuditionInvalidation(st,b,{active:true,busy:false,modal:false,hidden:false});
  expect(JSON.stringify(b)).toBe(json);expect(b.random).toBe(random);expect(b.profile).toBe(profile);expect(b.slots[0]!.trace).toBe(trace);
 });
 it('a mark keeps the store object (no stop); Vert. Gain and a new Receive stop the lease',()=>{
  const env={active:true,busy:false,modal:false,hidden:false};
  const st=pressReceiverAudition(createReceiverAuditionState(),done.bank,0).state;
  const marked=take(placeReceiverMark(done,0,0,'100'));
  expect(marked.bank.slots[0]!.trace).toBe(done.bank.slots[0]!.trace);
  expect(receiverAuditionInvalidation(st,marked.bank,env)).toBeNull();
  expect(receiverAuditionInvalidation(st,take(stepReceiver(done,0,'vertical','up')).bank,env)).toBe('receiver-changed');
  expect(receiverAuditionInvalidation(st,mode(done).bank,env)).toBe('receiver-changed');
 });
});

// ---- The cached display gain domain on ported sessions created with a given Radio Simulation Options Gain (+0x924).
const withGain=(s:RadioReceiverSession,gain:number)=>
 take(copyReceiverLiveOptions(s,{...RADIO_RECEIVER_COMPILED_OPTIONS,provenance:'supplied-record',gain924:Math.fround(gain)}));
/** Live Gain set, main opened, channel added, one finished sweep. */
const finishedWith=(gain:number)=>sweep(take(addReceiverWindow(openMain(withGain(createRadioReceiverSession(),gain)))));
/** The stored rows of the audition range (main 1..lastX, channel 0..lastX). */
const rangeRows=(bank:RadioReceiverBank,slot:0|1)=>{const t=bank.slots[slot]!.trace;return t.rows.slice(slot===0?1:0,t.lastX+1);};

describe('R-RX13 cached display gain domain on the ported session',()=>{
 it('a negative Gain (−1, −1000) gives rows above 110 and is refused as negative-gain in every phase',()=>{
  for(const gain of [-1,-1000]){
   const {receiving,finishing,done}=finishedWith(gain);
   for(const slot of [0,1] as const){
    expect(done.bank.slots[slot]!.sensitivity).toBeLessThan(0);
    expect(done.bank.slots[slot]!.trace.lastX).toBe(399);
    expect(rangeRows(done.bank,slot).some(w=>w!==null&&w>110)).toBe(true);
    for(const s of [receiving,finishing,done])expect(receiverAuditionSource(s.bank,slot)).toEqual({ok:false,reason:'negative-gain'});
   }
   const step=pressReceiverAudition(createReceiverAuditionState(),done.bank,0);
   expect(step.start).toBeNull();expect(step.state.notices[0]).toEqual({slot:0,kind:'refused',reason:'negative-gain'});
  }
 });
 it('a zero or −0 Gain is admitted: every row in range is 110 and the audition is silent',()=>{
  for(const gain of [0,-0]){
   const {done}=finishedWith(gain);
   expect(Object.is(done.bank.slots[0]!.displayGain,gain)).toBe(true);
   for(const slot of [0,1] as const)expect(rangeRows(done.bank,slot).every(w=>w===110)).toBe(true);
   const m=receiverAuditionPcm(ok(done.bank,0)),c=receiverAuditionPcm(ok(done.bank,1));
   expect([m.samples.length,m.silent,m.clippedHigh,c.samples.length,c.silent,c.clippedHigh]).toEqual([7980,true,0,8000,true,0]);
  }
 });
 it('a very large positive Gain stores null rows: missing-row at the first null column, no point invented',()=>{
  const {done}=finishedWith(1e30);
  for(const slot of [0,1] as const){
   const first=slot===0?1:0,rows=done.bank.slots[slot]!.trace.rows,lastX=done.bank.slots[slot]!.trace.lastX;
   let column:number|undefined;
   for(let x=first;x<=lastX&&column===undefined;x++)if(rows[x]===null)column=x;
   expect(column).toBeDefined();
   expect(receiverAuditionSource(done.bank,slot)).toEqual({ok:false,reason:'missing-row',column});
   expect(pressReceiverAudition(createReceiverAuditionState(),done.bank,slot).start).toBeNull();
  }
 });
 it('a live Gain change does not reclassify a receiver: only its own cached gain counts',()=>{
  // Created at +1, live −1 before the sweep: both admitted, the live options hold −1.
  const pos=sweep(withGain(take(addReceiverWindow(openMain(withGain(createRadioReceiverSession(),1)))),-1)).done;
  expect(pos.bank.options?.gain924).toBe(-1);
  for(const slot of [0,1])expect(receiverAuditionSource(pos.bank,slot).ok).toBe(true);
  // Created at −1, live +1: still negative-gain.
  const neg=sweep(withGain(take(addReceiverWindow(openMain(withGain(createRadioReceiverSession(),-1)))),1)).done;
  expect(neg.bank.options?.gain924).toBe(1);
  for(const slot of [0,1])expect(receiverAuditionSource(neg.bank,slot)).toEqual({ok:false,reason:'negative-gain'});
  // Main at +1, live −1, then Add Channel: the channel caches −1 in its own FormCreate (mixed signs in one bank).
  const mixed=sweep(take(addReceiverWindow(withGain(openMain(withGain(createRadioReceiverSession(),1)),-1)))).done;
  expect([mixed.bank.slots[0]!.sensitivity,mixed.bank.slots[1]!.sensitivity]).toEqual([1,-1]);
  expect(receiverAuditionSource(mixed.bank,0).ok).toBe(true);
  expect(receiverAuditionSource(mixed.bank,1)).toEqual({ok:false,reason:'negative-gain'});
 });
});

// [W] contract over ported transitions; not native evidence. A title left out of date by Pulsar List is refreshed by Align
// or mark Clear, which erase lastX through new store objects and so end an active lease by store identity.
describe('R-RX13 stale title refreshed by Align or mark Clear',()=>{
 const {done}=finishedSession();
 const env={active:true,busy:false,modal:false,hidden:false};
 const events=(t:ReceiverSessionTransition)=>t.outcome.kind==='ok'?t.outcome.events.map(e=>e.kind):[];
 const stale=take(overwriteReceiverSourceBuffer(done,{catalog:[rec({primaryName:'J0000+01',legacyName:'B0000+01'})],pointing:POINT}));
 const lease=pressReceiverAudition(createReceiverAuditionState(),done.bank,0).state;
 it('Pulsar List alone keeps the store objects (no stop)',()=>{
  for(const slot of [0,1])expect(stale.bank.slots[slot]!.trace).toBe(done.bank.slots[slot]!.trace);
  expect(receiverAuditionInvalidation(lease,stale.bank,env)).toBeNull();
 });
 const refreshed:readonly [string,()=>ReceiverSessionTransition][]=[
  ['Align',()=>toggleReceiverAlignment(stale)],
  ['mark Clear',()=>clearReceiverNextMark(take(placeReceiverMark(stale,0,0,'100')),0)],
 ];
 for(const [name,run] of refreshed)it(`${name} erases the trace through new store objects and ends the lease`,()=>{
  const t=run(),s=take(t);
  expect(events(t)).toContain('trace-cleared');
  for(const slot of [0,1]){
   expect(s.bank.slots[slot]!.trace).not.toBe(done.bank.slots[slot]!.trace);
   expect(receiverAuditionSource(s.bank,slot)).toEqual({ok:false,reason:'no-trace'});
  }
  expect(receiverAuditionInvalidation(lease,s.bank,env)).toBe('receiver-changed');
 });
 it('control: Align without a stale title keeps the store objects',()=>{
  const t=toggleReceiverAlignment(done),s=take(t);
  expect(events(t)).not.toContain('trace-cleared');
  for(const slot of [0,1])expect(s.bank.slots[slot]!.trace).toBe(done.bank.slots[slot]!.trace);
  expect(receiverAuditionInvalidation(lease,s.bank,env)).toBeNull();
 });
});

describe('WEB-RX-AUDITION-03 generation lease reducer',()=>{
 const s0:SlotSpec={rows:rows400(x=>(x*7)%111),lastX:399};
 const B=bankOf([s0,s0,s0]);
 const ENV:ReceiverAuditionEnvironment=Object.freeze({active:true,busy:false,modal:false,hidden:false});
 it('press → starting; running → playing; the same slot again stops (user)',()=>{
  const a=pressReceiverAudition(createReceiverAuditionState(),B,0);
  expect(a.stop).toBeNull();expect(a.start?.generation).toBe(1);expect(a.start?.pcm.samples.length).toBe(7980);
  expect(a.state.active?.phase).toBe('starting');expect(a.state.notices[0]).toEqual({slot:0,kind:'starting'});expect(a.state.nextGeneration).toBe(2);
  const b=receiverAuditionRunning(a.state,1);
  expect(b.state.active?.phase).toBe('playing');expect(b.state.notices[0]?.kind).toBe('playing');
  expect(receiverAuditionRunning(b.state,1).state).toBe(b.state);
  const c=pressReceiverAudition(b.state,B,0);
  expect(c.stop).toBe(1);expect(c.start).toBeNull();expect(c.state.active).toBeNull();expect(c.state.notices[0]).toEqual({slot:0,kind:'ended',cause:'user'});
 });
 it('stale running/ended/failed events return the same state object',()=>{
  const a=pressReceiverAudition(createReceiverAuditionState(),B,0).state;
  const ended=receiverAuditionEnded(a,1,'finished').state;
  for(const st of [a,ended]){
   expect(receiverAuditionRunning(st,7).state).toBe(st);expect(receiverAuditionEnded(st,7,'finished').state).toBe(st);
   expect(receiverAuditionFailed(st,7,'start').state).toBe(st);
  }
  expect(receiverAuditionRunning(ended,1).state).toBe(ended);expect(receiverAuditionEnded(ended,1,'blocked')).toEqual({state:ended,stop:null,start:null});
  const empty=createReceiverAuditionState();expect(stopReceiverAudition(empty,'busy').state).toBe(empty);
 });
 it('replace: another slot stops the old generation first and starts the next; at most one lease',()=>{
  let st=receiverAuditionRunning(pressReceiverAudition(createReceiverAuditionState(),B,0).state,1).state;
  const r=pressReceiverAudition(st,B,2);
  expect(r.stop).toBe(1);expect(r.start?.generation).toBe(2);expect(r.state.active?.slot).toBe(2);
  expect(r.state.notices[0]).toEqual({slot:0,kind:'ended',cause:'replaced'});expect(r.state.notices[2]).toEqual({slot:2,kind:'starting'});
  st=r.state;
  // A late event of the replaced generation changes nothing.
  expect(receiverAuditionEnded(st,1,'finished').state).toBe(st);expect(receiverAuditionRunning(st,1).state).toBe(st);
 });
 it('a refusal is a notice only and leaves another slot playing; failures end the lease',()=>{
  const st=receiverAuditionRunning(pressReceiverAudition(createReceiverAuditionState(),B,0).state,1).state;
  const b2=bankOf([s0,{rows:rows400(()=>50),lastX:0}]);
  const r=pressReceiverAudition(st,b2,1);
  expect(r.stop).toBeNull();expect(r.start).toBeNull();expect(r.state.active).toBe(st.active);expect(r.state.notices[1]).toEqual({slot:1,kind:'refused',reason:'no-trace'});
  expect(refuseReceiverAudition(st,1,'unavailable').notices[1]).toEqual({slot:1,kind:'refused',reason:'unavailable'});
  expect(refuseReceiverAudition(st,5,'unavailable')).toBe(st);
  expect(pressReceiverAudition(st,B,5).state).toBe(st);
  const f=receiverAuditionFailed(st,1,'cleanup-pending');
  expect(f.stop).toBe(1);expect(f.state.active).toBeNull();expect(f.state.notices[0]).toEqual({slot:0,kind:'failed',failure:'cleanup-pending'});
  expect(f.state.nextGeneration).toBe(2);
 });
 it('invalidation causes and priority: busy > route-hidden > modal > document-hidden > receiver-changed',()=>{
  const st=pressReceiverAudition(createReceiverAuditionState(),B,1).state;
  const inv=(env:Partial<ReceiverAuditionEnvironment>,bank=B)=>receiverAuditionInvalidation(st,bank,{...ENV,...env});
  const gone=bankOf([s0,null,s0]);
  expect(inv({busy:true,active:false,modal:true,hidden:true},gone)).toBe('busy');
  expect(inv({active:false,modal:true,hidden:true},gone)).toBe('route-hidden');
  expect(inv({modal:true,hidden:true},gone)).toBe('modal');
  expect(inv({hidden:true},gone)).toBe('document-hidden');
  expect(inv({},gone)).toBe('receiver-changed');
  expect(inv({})).toBeNull();
  expect(receiverAuditionInvalidation(createReceiverAuditionState(),gone,{...ENV,busy:true})).toBeNull();
  // Same store object and keys in a new bank: no stop. Another store object, the timer, receiving or a key: stop.
  const sameTrace=Object.freeze({...B,slots:Object.freeze(B.slots.map(r=>r&&Object.freeze({...r})))}) as RadioReceiverBank;
  expect(inv({},sameTrace)).toBeNull();
  const withSlot=(patch:object)=>Object.freeze({...B,slots:Object.freeze(B.slots.map((r,i)=>i===1&&r?Object.freeze({...r,...patch}):r))}) as RadioReceiverBank;
  expect(inv({},withSlot({trace:traceOf(s0.rows,399)}))).toBe('receiver-changed');
  expect(inv({},withSlot({receiving:true}))).toBe('receiver-changed');
  expect(inv({},Object.freeze({...B,timerEnabled:true}) as RadioReceiverBank)).toBe('receiver-changed');
  for(const k of ['verticalGain','frequencyMHz','horizontal'])expect(inv({},withSlot({[k]:2}))).toBe('receiver-changed');
  // Defensive branch (unreachable on the ported paths: the same store object implies the same FormCreate and gain sign).
  expect(inv({},withSlot({sensitivity:-1,displayGain:-1}))).toBe('receiver-changed');
  expect(inv({},withSlot({displayGain:Number.NaN}))).toBe('receiver-changed');
  expect(inv({},withSlot({sensitivity:-0,displayGain:-0}))).toBeNull();
  expect(stopReceiverAudition(st,'modal')).toMatchObject({stop:1,state:{active:null,notices:[null,{slot:1,kind:'ended',cause:'modal'},null]}});
 });
 it('prune clears the notices of empty slots only',()=>{
  const st=pressReceiverAudition(createReceiverAuditionState(),bankOf([s0,{rows:rows400(()=>50),lastX:0}]),1).state;
  expect(pruneReceiverAudition(st,B)).toBe(st);
  const pruned=pruneReceiverAudition(st,bankOf([s0]));
  expect(pruned.notices).toEqual([null,null,null]);expect(Object.isFrozen(pruned.notices)).toBe(true);
 });
});

describe('R-RX13 core source audit',()=>{
 const src=readFileSync(new URL('./radioReceiverAudition.ts',import.meta.url),'utf8');
 it('imports types only from the ported store and reaches no React, DOM, host audio or i18n',()=>{
  expect([...src.matchAll(/^import .*$/gm)].map(m=>m[0])).toEqual([
   "import type {RadioReceiverBank} from './radioReceiver';","import type {RadioReceiverTrace} from './radioReceiverDisplay';"]);
  expect(src).not.toMatch(/react|document\.|window\.|globalThis|AudioContext|i18n|setTimeout|Date|performance|Math\.random|stepSession/);
 });
});
