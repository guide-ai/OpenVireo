import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {RadioLabTransition} from './radioAntenna';
import type {PulsarRecord} from './radioPulsarCatalog';
import {
 RADIO_RECEIVER_SESSION_POLICY,addReceiverWindow,completedRadioClockTick,createRadioReceiverSession,dismissReceiverCloseBox,editReceiverSeed,nextReceiverSeed,
 openReceiverWindow,paintReceiverWindow,parseReceiverSeed,reassociateReceivers,receiverControlAvailability,receiverSessionOpen,requestReceiverClose,stepReceiver,
 tickReceivers,toggleReceiverMode,type RadioReceiverSession,type ReceiverSessionTransition,
} from './radioReceiverSession';

// [W] contract checks of the web session (docs/RADIO-RECEIVER-MONITOR.md), synthetic records only; not native oracles.
const rec=(o:Partial<PulsarRecord>={}):PulsarRecord=>Object.freeze({primaryName:'J0000+00',legacyName:'B0000+00',ra:6,dec:10,x2a:0.5,x34:0,x3e:2451545,
 s48:Math.fround(30),s4c:Math.fround(10),s50:Math.fround(5),s54:Math.fround(8),s58:Math.fround(4),s5c:Math.fround(2),...o});
const A=rec(),POINT=Object.freeze({ra:6,dec:10}),FAR=Object.freeze({ra:18,dec:-40}),JD=2451545.25;
let clock=1000;
const now=()=>(clock+=1e-6);
const take=(t:ReceiverSessionTransition)=>{if(t.outcome.kind!=='ok')throw new Error(JSON.stringify(t.outcome));return t.session;};
const open=(s=createRadioReceiverSession(),catalog=[A])=>take(openReceiverWindow(s,{catalog,pointing:POINT}));
const mode=(s:RadioReceiverSession,jd:number|null=JD)=>toggleReceiverMode(s,{jd,now:now()});
const tick=(s:RadioReceiverSession)=>tickReceivers(s,{jd:JD,now:now()});
const seeds=(s:RadioReceiverSession)=>s.bank.random!.ledger.flatMap(e=>e.kind==='randomize'?[e.seed]:[]);

describe('seed policy WEB-RX-SEED-01',()=>{
 it('uses base + k for the k-th Randomize site: Open +1, Add +1, first Receive +1, later Receive +0, reopen +1',()=>{
  let s=take(editReceiverSeed(createRadioReceiverSession(),'41'));
  expect(nextReceiverSeed(s)).toBe(41);
  s=open(s);expect(s.seed.used).toBe(1);
  s=take(addReceiverWindow(s));expect(s.seed.used).toBe(2);
  s=take(mode(s));expect(s.seed.used).toBe(3);
  s=take(mode(s));while(s.bank.timerEnabled)s=tick(s).session;
  s=take(mode(s));expect(s.seed.used).toBe(3);
  expect(seeds(s)).toEqual([41,42,43]);
  expect(editReceiverSeed(s,'7').outcome).toEqual({kind:'web-refused',action:'seed',reason:'seed-locked'});
  s=take(requestReceiverClose(s,0));expect(receiverSessionOpen(s)).toBe(false);
  s=open(s);expect(seeds(s).at(-1)).toBe(44);expect(s.seed.used).toBe(4);
 });
 it('admits 1..10 digits up to 4294967295; invalid text refuses a new Open; a change restarts the count',()=>{
  expect(['0','4294967295','007'].map(parseReceiverSeed)).toEqual([0,4294967295,7]);
  expect(['','4294967296','-1','1.5',' 1','12345678901','1e3'].map(parseReceiverSeed)).toEqual(new Array(7).fill(null));
  const bad=take(editReceiverSeed(createRadioReceiverSession(),'x'));
  expect(openReceiverWindow(bad,{catalog:[A],pointing:POINT}).outcome).toEqual({kind:'web-refused',action:'open',reason:'seed-invalid'});
  const wrap=open(take(editReceiverSeed(createRadioReceiverSession(),'4294967295')));
  expect(nextReceiverSeed(wrap)).toBe(0);
  expect(createRadioReceiverSession().seed).toEqual({text:RADIO_RECEIVER_SESSION_POLICY.defaultSeedText,base:1,used:0});
 });
 it('refuses Open without a catalog (WEB-RX-CAT-01)',()=>{
  expect(openReceiverWindow(createRadioReceiverSession(),{catalog:null,pointing:POINT}).outcome).toEqual({kind:'web-refused',action:'open',reason:'no-catalog'});
 });
});

describe('refusals, tick errors and the project-operation gap',()=>{
 it('a refused Receive leaves bank, seed, canvases and box untouched',()=>{
  const s=take(paintReceiverWindow(open(),0)),t=mode(s,null);
  expect(t.outcome).toMatchObject({kind:'refused',action:'mode',error:{kind:'clock-required'}});
  expect(t.session).toBe(s);expect(t.changed).toBe(false);
 });
 it('[pin] P = 0.04 at H = 4 (dt = 0.01 within 0.2P..0.3P) refuses Receive with poisson-mean-domain; H = 8 succeeds',()=>{
  // Values of the synthetic E2E row B (BASE columns of tests/radio-receiver-app.spec.ts) and its 2026-10-24T12:00:00Z JD.
  const B=rec({primaryName:'J1200+3824',legacyName:'B1157+38',ra:12,dec:38.4,x2a:0.04,x34:1e-15,x3e:50000,s48:Math.fround(28.2),s4c:Math.fround(30),s50:Math.fround(12.5),
   s54:Math.fround(14),s58:Math.fround(9),s5c:Math.fround(3)});
  const s=take(openReceiverWindow(createRadioReceiverSession(),{catalog:[B],pointing:{ra:12,dec:38.4}}));
  const r=mode(s,2461338);expect(r.outcome).toMatchObject({kind:'refused',error:{kind:'poisson-mean-domain'}});expect(r.session).toBe(s);
  const h8=take(stepReceiver(s,0,'horizontal','up'));
  expect(h8.bank.slots[0]!.horizontal).toBe(8);expect(mode(h8,2461338).outcome.kind).toBe('ok');
 });
 it('a coupling refusal persists across ticks; Stop stays pending; Mode, Add and Horz are refused; Close recovers',()=>{
  const B=rec({primaryName:'J0001+00',legacyName:'B0001+00',x2a:0.04});
  let s=take(mode(open()));s=tick(s).session;
  // Clock reassociation picks B at the same pointing: the next tick rebuilds inside the signal and is refused.
  s=take(reassociateReceivers(s,{catalog:[B],pointing:POINT}));
  const r1=tick(s);expect(r1.outcome).toMatchObject({kind:'refused',error:{kind:'poisson-mean-domain'}});expect(r1.changed).toBe(true);
  expect(r1.session.bank).toBe(s.bank);
  const r2=tick(r1.session);expect(r2.changed).toBe(false);expect(r2.session.tickError).toEqual(r1.session.tickError);
  const stopped=take(mode(r2.session));
  expect(receiverControlAvailability(stopped,0)).toMatchObject({mode:'disabled',add:'disabled',horizontal:'disabled'});
  expect(mode(stopped).outcome).toMatchObject({kind:'refused',error:{kind:'receiver-unavailable'}});
  expect(tick(stopped).session.bank.timerEnabled).toBe(true);
  const closed=take(requestReceiverClose(stopped,0));
  expect(closed.tickError).toBeNull();expect(receiverSessionOpen(closed)).toBe(false);expect(closed.canvases).toEqual([null,null,null]);
 });
 it('gated and disabled ticks keep a stored tick error, the session and changed = false (constructed caller states, not reached by the monotonic UI)',()=>{
  const B=rec({primaryName:'J0001+00',legacyName:'B0001+00',x2a:0.04});
  let s=take(mode(open()));s=tick(s).session;s=take(reassociateReceivers(s,{catalog:[B],pointing:POINT}));
  const stored=tick(s).session;expect(stored.tickError).toMatchObject({kind:'poisson-mean-domain'});
  const gated=tickReceivers(stored,{jd:JD,now:stored.bank.slots[0]!.lastTick!});// non-increasing caller time
  expect(gated.outcome).toEqual({kind:'ok',action:'tick',events:[{kind:'timer-gated'}]});
  expect(gated.changed).toBe(false);expect(gated.session).toBe(stored);expect(gated.session.tickError).toBe(stored.tickError);
  expect(Object.isFrozen(gated)&&Object.isFrozen(gated.outcome)&&Object.isFrozen((gated.outcome as {events:readonly unknown[]}).events)).toBe(true);
  const off=Object.freeze({...stored,bank:Object.freeze({...stored.bank,timerEnabled:false})});// constructed: unreachable while the error persists
  const disabled=tickReceivers(off,{jd:JD,now:now()});
  expect(disabled.outcome).toEqual({kind:'ok',action:'tick',events:[{kind:'timer-disabled'}]});
  expect(disabled.changed).toBe(false);expect(disabled.session).toBe(off);expect(disabled.session.tickError).toBe(stored.tickError);
  const back=take(reassociateReceivers(stored,{catalog:[A],pointing:POINT}));const ok=tick(back);
  expect(ok.outcome.kind).toBe('ok');expect(ok.session.tickError).toBeNull();// a successful delivery clears it
 });
 it('one batch after a long gap (no catch-up)',()=>{
  const s=take(mode(open())),t=tickReceivers(s,{jd:JD,now:clock+=10});
  expect(t.session.bank.slots[0]!.position).toBe(5);
 });
});

describe('canvas op logs',()=>{
 it('Paint at mount, Receive Paint, frames in order with the pen; children get their own logs',()=>{
  let s=open();expect(s.canvases[0]).toEqual({pen:null,nextSeq:0,ops:[],dropped:false});
  s=take(paintReceiverWindow(s,0));
  const log0=s.canvases[0]!;expect(log0.ops[0].op).toEqual({kind:'fill',x0:0,y0:0,x1:401,y1:142});expect(log0.pen).toEqual({x:640,y:111});
  s=take(addReceiverWindow(s));expect(s.canvases[1]).toEqual({pen:null,nextSeq:0,ops:[],dropped:false});
  s=take(paintReceiverWindow(s,1));
  s=take(mode(s));
  const after=s.canvases[0]!;expect(after.ops[0].seq).toBeGreaterThan(log0.ops.at(-1)!.seq);// Receive Paint restarts the log
  s=tick(s).session;
  const ops=s.canvases[0]!.ops.map(e=>e.op);
  expect(ops.slice(-12).filter(o=>o.kind==='fill')).toHaveLength(6);
  expect(s.canvases[0]!.pen).toEqual({x:5,y:s.bank.slots[0]!.lastRow});
  expect(s.canvases[1]!.pen).toEqual({x:5,y:s.bank.slots[1]!.lastRow});
  const seqs=s.canvases[0]!.ops.map(e=>e.seq);expect(seqs).toEqual([...seqs].sort((a,b)=>a-b));
 });
 it('bounds the log and marks dropped ops; frequency changes while receiving add the annotation',()=>{
  let s=take(mode(take(paintReceiverWindow(open(),0))));
  for(let i=0;i<RADIO_RECEIVER_SESSION_POLICY.opLogLimit/12+5;i++)s=tick(s).session;
  expect(s.canvases[0]!.ops).toHaveLength(RADIO_RECEIVER_SESSION_POLICY.opLogLimit);expect(s.canvases[0]!.dropped).toBe(true);
  const f=take(stepReceiver(s,0,'frequency','up'));
  expect(f.canvases[0]!.ops.slice(-2).map(e=>e.op.kind)).toEqual(['text','text']);
  expect(f.canvases[0]!.ops.at(-1)!.op).toMatchObject({text:'700.00 MHz  '});
 });
});

describe('controls, close box and clock ticks',()=>{
 it('availability for idle, receiving, stop-pending and both-slot states (RC-REC-09)',()=>{
  let s=open();
  expect(receiverControlAvailability(s,0)).toEqual({frequency:'enabled','frequency-step':'enabled',vertical:'enabled',horizontal:'enabled',add:'enabled',mode:'enabled',
   align:'not-ported',record:'not-ported',close:'enabled'});
  s=take(addReceiverWindow(take(addReceiverWindow(s))));
  expect(receiverControlAvailability(s,0).add).toBe('disabled');
  expect(receiverControlAvailability(s,2)).toEqual({frequency:'enabled','frequency-step':'enabled',vertical:'enabled',horizontal:'absent',add:'absent',mode:'absent',
   align:'absent',record:'absent',close:'enabled'});
  s=take(mode(s));expect(receiverControlAvailability(s,0)).toMatchObject({horizontal:'disabled',add:'disabled',mode:'enabled',frequency:'enabled'});
  s=take(mode(s));expect(receiverControlAvailability(s,0).mode).toBe('disabled');
  while(s.bank.timerEnabled)s=tick(s).session;
  expect(receiverControlAvailability(s,0)).toMatchObject({horizontal:'enabled',add:'enabled',mode:'enabled'});
  // After the finish with both slots used, Add creates nothing.
  const n=addReceiverWindow(s);expect(n.outcome).toMatchObject({kind:'ok',events:[{kind:'add-nothing'}]});expect(n.session.canvases).toEqual(s.canvases);
  expect(receiverControlAvailability(createRadioReceiverSession(),0).close).toBe('absent');
 });
 it('slot 1 close with slot 2 open shows the recovered box; it blocks user actions until dismissed; ticks continue',()=>{
  let s=take(mode(take(addReceiverWindow(take(addReceiverWindow(open()))))));
  s=take(requestReceiverClose(s,1));
  expect(s.closeBox).toEqual({slot:1,text:'Close the Lowest Receiver First, or Close the Master Receiver to Close All.',caption:'Cannot Close Receiver!'});
  expect(s.bank.slots[1]).not.toBeNull();
  for(const t of [addReceiverWindow(s),mode(s),stepReceiver(s,0,'vertical','up'),requestReceiverClose(s,2),openReceiverWindow(s,{catalog:[A],pointing:POINT})])
   expect(t.outcome).toMatchObject({kind:'web-refused',reason:'close-box-open'});
  expect(tick(s).session.bank.slots[0]!.position).toBe(5);
  s=take(dismissReceiverCloseBox(s));expect(s.closeBox).toBeNull();
  s=take(requestReceiverClose(s,2));expect(s.canvases[2]).toBeNull();expect(s.bank.slots[0]!.addEnabled).toBe(true);
  s=take(requestReceiverClose(s,1));expect(s.bank.slots.map(r=>r!==null)).toEqual([true,false,false]);
 });
 it('completedRadioClockTick: RA-13 ticks and manual E/W release chains, not refusals or other steps',()=>{
  const tr=(changed:boolean,steps:string[])=>({changed,steps,outcome:'clock-tick',state:{}} as unknown as RadioLabTransition);
  expect(completedRadioClockTick(tr(true,['RA-13']))).toBe(true);
  expect(completedRadioClockTick(tr(true,['RA-19','RA-17','RA-13']))).toBe(true);
  expect(completedRadioClockTick(tr(false,[]))).toBe(false);
  expect(completedRadioClockTick(tr(true,['RA-17']))).toBe(false);
 });
 it('clock reassociation without receivers does nothing; a miss keeps the session open',()=>{
  const none=createRadioReceiverSession();expect(reassociateReceivers(none,{catalog:[A],pointing:FAR}).changed).toBe(false);
  const s=take(reassociateReceivers(open(),{catalog:[A],pointing:FAR}));expect(s.bank.slots[0]!.sourceAttached).toBe(false);
 });
});

describe('source and route audits',()=>{
 const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
 const FORBIDDEN=/Date\.now|new Date|performance\.now|Math\.random|crypto\.|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|WebSocket|AudioContext|new Audio|HTMLAudioElement|navigator\.mediaDevices/;
 const files=['./radioReceiver.ts','./radioReceiverDisplay.ts','./radioReceiverSession.ts','../components/RadioReceiverWindows.tsx'];
 it('keeps host clocks, RNG, storage, network and audio out of the receiver modules',()=>{
  for(const f of files)expect(read(f),f).not.toMatch(FORBIDDEN);
 });
 it('the route reads performance.now once (perfNow) and no other host clock or random source',()=>{
  const route=read('../components/RadioTelescopeRoute.tsx');
  expect(route.match(/performance\.now/g)).toHaveLength(1);expect(route).toMatch(/const perfNow=\(\)=>performance\.now\(\);/);
  expect(route).not.toMatch(/Date\.now|new Date\(\)|Math\.random|crypto\./);
 });
 it('imports nothing from the PLR, notebook, io or optical modules',()=>{
  for(const f of files){
   const imports=[...read(f).matchAll(/from '([^']+)'/g)].map(m=>m[1]);
   for(const i of imports)expect(i,`${f}: ${i}`).not.toMatch(/pulsarRecording|pulsarAnalysis|pulsarSavedRows|pulsarReview|\/io\/|optical|spectrum|hubble/i);
  }
 });
});
