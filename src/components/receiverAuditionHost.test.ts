import {afterEach,describe,expect,it} from 'vitest';
import {receiverAuditionPcm,type ReceiverAuditionPcm,type ReceiverAuditionSource} from '../core/radioReceiverAudition';
import type {RadioReceiverTrace} from '../core/radioReceiverDisplay';
import {browserReceiverAuditionDeps,createReceiverAuditionHost,type AuditionContextLike,type ReceiverAuditionDeps,type ReceiverAuditionHostEvent} from './receiverAuditionHost';

// [W] Host lifecycle checks of the R-RX13 web audition with fake contexts and a fake timer queue (deterministic, no device).
// They check this implementation's call order and ownership, not browser audibility or any native audio behaviour.
const trace=Object.freeze({maxIndex:399,dt:0.01,rows:Object.freeze([110,0]),lastX:1}) as RadioReceiverTrace;
const SOURCE:ReceiverAuditionSource=Object.freeze({slot:1,trace,firstColumn:0,lastColumn:1,rows:Object.freeze([110,0]),key:Object.freeze({verticalGain:1,frequencyMHz:600,horizontal:4})});
const PCM:ReceiverAuditionPcm=receiverAuditionPcm(SOURCE);

type CloseMode='sync'|'deferred'|'reject-open'|'reject-closed'|'throw-open'|'throw-closed';
type Behaviour=Partial<{initial:string;ctor:boolean;buffer:boolean;copy:boolean;source:boolean;connect:boolean;start:boolean;resume:'resolve'|'reject'|'never'|'throw'|'resolve-suspended';
 close:CloseMode;stateThrows:boolean}>;
class Fake implements AuditionContextLike{
 static all:Fake[]=[];
 private s:string;destination={kind:'destination'};onstatechange:(()=>void)|null=null;
 log:string[]=[];copied:Float32Array|null=null;bufferArgs:number[]=[];
 source:{buffer:unknown;onended:(()=>void)|null;connect:(d:unknown)=>unknown;disconnect:()=>void;start:()=>void;stop:()=>void}|null=null;
 resumeSettle:{resolve:()=>void;reject:(e:unknown)=>void}|null=null;closeSettle:{resolve:()=>void;reject:(e:unknown)=>void}|null=null;
 constructor(readonly b:Behaviour){if(b.ctor)throw new Error('ctor');this.s=b.initial??'running';Fake.all.push(this);this.log.push('ctor');}
 get state(){if(this.b.stateThrows&&this.log.includes('start'))throw new Error('state');return this.s;}
 set(state:string){this.s=state;this.onstatechange?.();}
 createBuffer(channels:number,length:number,rate:number){
  this.log.push('createBuffer');this.bufferArgs=[channels,length,rate];if(this.b.buffer)throw new Error('buffer');
  return {copyToChannel:(data:Float32Array,ch:number)=>{this.log.push(`copy:${ch}`);if(this.b.copy)throw new Error('copy');this.copied=data;}};
 }
 createBufferSource(){
  this.log.push('createBufferSource');if(this.b.source)throw new Error('source');
  const self=this;
  this.source={buffer:null,onended:null,connect(d){self.log.push(d===self.destination?'connect:destination':'connect:other');if(self.b.connect)throw new Error('connect');return d;},
   disconnect(){self.log.push('disconnect');},start(){self.log.push('start');if(self.b.start)throw new Error('start');},stop(){self.log.push('stop');}};
  return this.source;
 }
 resume(){
  this.log.push('resume');const m=this.b.resume??'resolve';
  if(m==='throw')throw new Error('resume');
  return new Promise<void>((resolve,reject)=>{
   this.resumeSettle={resolve:()=>{this.set('running');resolve();},reject};
   if(m==='resolve')this.resumeSettle.resolve();else if(m==='reject')reject(new Error('blocked'));else if(m==='resolve-suspended')resolve();
  });
 }
 close(){
  this.log.push('close');const m=this.b.close??'sync';
  if(m==='throw-open')throw new Error('close');
  if(m==='throw-closed'){this.set('closed');throw new Error('close');}
  if(m==='reject-open')return Promise.reject(new Error('close'));
  if(m==='reject-closed'){this.set('closed');return Promise.reject(new Error('close'));}
  if(m==='deferred')return new Promise<void>((resolve,reject)=>{this.closeSettle={resolve:()=>{this.set('closed');resolve();},reject};});
  this.set('closed');return Promise.resolve();
 }
}
type Timer={f:()=>void;ms:number;cleared:boolean};
function harness(behaviours:Behaviour[]|Behaviour={},supported=true){
 const timers:Timer[]=[],events:ReceiverAuditionHostEvent[]=[];let n=0;
 const next=()=>Array.isArray(behaviours)?behaviours[Math.min(n++,behaviours.length-1)]:behaviours;
 const deps:ReceiverAuditionDeps={createContext:supported?()=>new Fake(next()):null,
  setTimeout:(f,ms)=>{const t={f,ms,cleared:false};timers.push(t);return t;},clearTimeout:h=>{(h as Timer).cleared=true;}};
 const host=createReceiverAuditionHost(deps,e=>events.push(e));
 const live=()=>timers.filter(t=>!t.cleared);
 const fire=(ms:number)=>{for(const t of live().filter(t=>t.ms===ms)){t.cleared=true;t.f();}};
 return {host,timers,events,live,fire};
}
const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
const notClosed=()=>Fake.all.filter(c=>c.state!=='closed').length;
afterEach(()=>{Fake.all=[];});

describe('WEB-RX-AUDITION-04 host: synchronous start inside the gesture',()=>{
 it('a running context: buffer (1, L, 8000) with the exact samples, connect, start; end guard after running',()=>{
  const h=harness();
  expect(h.host.start(1,PCM)).toBe('running');
  const c=Fake.all[0];
  expect(c.log).toEqual(['ctor','createBuffer','copy:0','createBufferSource','connect:destination','start']);
  expect(c.bufferArgs).toEqual([1,40,8000]);expect([...c.copied!]).toEqual([...PCM.samples]);
  expect(h.live().map(t=>t.ms)).toEqual([PCM.durationMs+1000]);
  expect(h.host.readiness()).toBe('owned');expect(h.events).toEqual([]);
 });
 it('stop: handlers detached, stop, disconnect and one close; timers cleared; no event; stale generations ignored',()=>{
  const h=harness();h.host.start(4,PCM);const c=Fake.all[0];
  h.host.stop(3);expect(c.log).not.toContain('close');
  h.host.stop(4);h.host.stop(4);h.host.stopAll();
  expect(c.log.slice(6)).toEqual(['stop','disconnect','close']);
  expect(c.source!.onended).toBeNull();expect(c.onstatechange).toBeNull();
  expect(h.live()).toEqual([]);expect(h.events).toEqual([]);expect(h.host.readiness()).toBe('idle');
 });
 it('every failure branch closes what it created and reports its kind',async()=>{
  const cases:[Behaviour,string,string[]][]=[
   [{ctor:true},'create',[]],
   [{buffer:true},'buffer',['ctor','createBuffer','close']],
   [{copy:true},'buffer',['ctor','createBuffer','copy:0','close']],
   [{source:true},'connect',['ctor','createBuffer','copy:0','createBufferSource','close']],
   [{connect:true},'connect',['ctor','createBuffer','copy:0','createBufferSource','connect:destination','disconnect','close']],
   [{start:true},'start',['ctor','createBuffer','copy:0','createBufferSource','connect:destination','start','disconnect','close']],
   [{initial:'closed'},'start',['ctor','createBuffer','copy:0','createBufferSource','connect:destination','start','stop','disconnect','close']],
   [{initial:'suspended',resume:'throw'},'resume',['ctor','createBuffer','copy:0','createBufferSource','connect:destination','start','resume','stop','disconnect','close']],
   [{stateThrows:true},'start',['ctor','createBuffer','copy:0','createBufferSource','connect:destination','start','stop','disconnect','close']],
  ];
  for(const [b,kind,log] of cases){
   Fake.all=[];const h=harness(b);
   expect(h.host.start(1,PCM),kind).toBe(kind);
   expect(Fake.all[0]?.log??[],kind).toEqual(log);
   expect(h.live(),kind).toEqual([]);expect(h.events,kind).toEqual([]);
   await flush();
   // A context whose state cannot be read is never taken as closed: the guard refuses further contexts.
   expect(h.host.readiness(),kind).toBe(b.stateThrows?'cleanup-failed':'idle');
  }
  expect(harness({},false).host.start(1,PCM)).toBe('unsupported');
 });
});

describe('host: pending resume, end guard and statechange',()=>{
 it('the resume timeout starts at the gesture; the end guard starts only once running',async()=>{
  const h=harness({initial:'suspended',resume:'never'});
  expect(h.host.start(2,PCM)).toBe('pending');
  expect(h.live().map(t=>t.ms)).toEqual([2000]);
  Fake.all[0].resumeSettle!.resolve();await flush();
  expect(h.events).toEqual([{kind:'running',generation:2}]);
  expect(h.live().map(t=>t.ms)).toEqual([PCM.durationMs+1000]);
  h.fire(PCM.durationMs+1000);
  expect(h.events.at(-1)).toEqual({kind:'finished',generation:2});expect(Fake.all[0].state).toBe('closed');
 });
 it('a resume that never settles is blocked after 2000 ms, closed, and a late resolve starts nothing',async()=>{
  const h=harness({initial:'suspended',resume:'never'});h.host.start(1,PCM);
  h.fire(2000);
  expect(h.events).toEqual([{kind:'blocked',generation:1}]);expect(Fake.all[0].log.slice(-3)).toEqual(['stop','disconnect','close']);
  Fake.all[0].resumeSettle!.resolve();await flush();
  expect(h.events).toHaveLength(1);expect(h.live()).toEqual([]);
 });
 it('a rejected resume, or one that resolves while still suspended, is blocked (never finished)',async()=>{
  for(const resume of ['reject','resolve-suspended'] as const){
   Fake.all=[];const h=harness({initial:'suspended',resume});
   expect(h.host.start(1,PCM)).toBe('pending');await flush();
   expect(h.events,resume).toEqual([{kind:'blocked',generation:1}]);expect(Fake.all[0].state).toBe('closed');
  }
 });
 it('a resume settling after stop emits nothing',async()=>{
  const h=harness({initial:'suspended',resume:'never'});h.host.start(1,PCM);h.host.stop(1);
  Fake.all[0].resumeSettle!.resolve();await flush();
  expect(h.events).toEqual([]);
 });
 it('onended while pending is blocked; while running it is finished',()=>{
  const a=harness({initial:'suspended',resume:'never'});a.host.start(1,PCM);
  Fake.all[0].source!.onended!();expect(a.events).toEqual([{kind:'blocked',generation:1}]);
  Fake.all=[];const b=harness();b.host.start(2,PCM);
  Fake.all[0].source!.onended!();expect(b.events).toEqual([{kind:'finished',generation:2}]);
  Fake.all[0].source!.onended?.();expect(b.events).toHaveLength(1);
 });
 it('statechange: running while pending promotes once; an unexpected suspend, interruption or close stops once',async()=>{
  const a=harness({initial:'suspended',resume:'never'});a.host.start(1,PCM);
  Fake.all[0].set('running');expect(a.events).toEqual([{kind:'running',generation:1}]);
  Fake.all[0].resumeSettle!.resolve();await flush();expect(a.events).toHaveLength(1);
  for(const state of ['suspended','interrupted','closed']){
   Fake.all=[];const h=harness();h.host.start(3,PCM);const c=Fake.all[0];
   c.set(state);
   expect(h.events,state).toEqual([{kind:'interrupted',generation:3}]);
   expect(c.log.filter(x=>x==='close'),state).toHaveLength(1);
   c.set('running');expect(h.events).toHaveLength(1);
  }
  // A suspended statechange while pending is expected and ignored; a close while pending is an interruption.
  Fake.all=[];const p=harness({initial:'suspended',resume:'never'});p.host.start(1,PCM);
  Fake.all[0].set('suspended');expect(p.events).toEqual([]);
  Fake.all[0].set('closed');expect(p.events).toEqual([{kind:'interrupted',generation:1}]);
 });
});

describe('host: retirement and bounded contexts',()=>{
 it('play → stop → play with a deferred close: refused while retiring, a fresh start after the close settles',async()=>{
  const h=harness({close:'deferred'});
  h.host.start(1,PCM);h.host.stop(1);
  expect(h.host.readiness()).toBe('retiring');
  expect(h.host.start(2,PCM)).toBe('cleanup-pending');expect(Fake.all).toHaveLength(1);
  Fake.all[0].closeSettle!.resolve();await flush();
  expect(h.host.readiness()).toBe('idle');
  expect(h.host.start(3,PCM)).toBe('running');expect(Fake.all).toHaveLength(2);expect(notClosed()).toBe(1);
 });
 it('a start while another lease is owned closes it first; with a synchronous close the next context is built',()=>{
  const h=harness();
  h.host.start(1,PCM);
  expect(h.host.start(2,PCM)).toBe('running');
  expect(Fake.all[0].log.at(-1)).toBe('close');expect(Fake.all[0].state).toBe('closed');expect(notClosed()).toBe(1);
  for(let g=3;g<20;g++){h.host.start(g,PCM);h.host.stop(g);}
  expect(notClosed()).toBe(0);expect(h.events).toEqual([]);
 });
 it('a close that rejects or throws with the state not closed leaves a cleanup-failed guard: no more contexts',async()=>{
  for(const close of ['reject-open','throw-open'] as const){
   Fake.all=[];const h=harness({close});
   h.host.start(1,PCM);h.host.stop(1);await flush();
   expect(h.host.readiness(),close).toBe('cleanup-failed');
   expect(h.host.start(2,PCM)).toBe('cleanup-failed');expect(Fake.all).toHaveLength(1);
  }
  for(const close of ['reject-closed','throw-closed'] as const){
   Fake.all=[];const h=harness({close});
   h.host.start(1,PCM);h.host.stop(1);await flush();
   expect(h.host.readiness(),close).toBe('idle');expect(h.host.start(2,PCM)).toBe('running');
  }
 });
 it('a deferred close whose state is already closed is settled at the next press; a stale settlement clears nothing',async()=>{
  const h=harness([{close:'deferred'},{close:'deferred'}]);
  h.host.start(1,PCM);h.host.stop(1);
  const first=Fake.all[0];first.set('closed');
  expect(h.host.start(2,PCM)).toBe('running');
  // The first close's promise settles later: the new lease and its readiness are untouched.
  first.closeSettle!.resolve();await flush();
  expect(h.host.readiness()).toBe('owned');
  h.host.stop(2);expect(h.host.readiness()).toBe('retiring');
  first.closeSettle!.resolve();await flush();expect(h.host.readiness()).toBe('retiring');
 });
});

describe('browser deps',()=>{
 const g=globalThis as unknown as{AudioContext?:unknown;webkitAudioContext?:unknown};
 afterEach(()=>{delete g.AudioContext;delete g.webkitAudioContext;});
 it('reads the standard or prefixed constructor when called; none gives no factory',()=>{
  expect(browserReceiverAuditionDeps().createContext).toBeNull();
  class C{constructor(){Fake.all.push(this as unknown as Fake);}}
  g.webkitAudioContext=C;
  const deps=browserReceiverAuditionDeps();expect(deps.createContext!()).toBeInstanceOf(C);
  g.AudioContext=class D{};expect(browserReceiverAuditionDeps().createContext!()).not.toBeInstanceOf(C);
 });
});
