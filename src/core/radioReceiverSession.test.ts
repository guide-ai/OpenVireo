import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {RadioLabTransition} from './radioAntenna';
import type {PulsarRecord} from './radioPulsarCatalog';
import {
 RADIO_RECEIVER_SESSION_POLICY,addReceiverWindow,clearReceiverNextMark,completedRadioClockTick,createRadioReceiverSession,dismissReceiverCloseBox,editReceiverSeed,
 endMarkGesture,markPointerDown,markPointerMove,markPointerUp,nextReceiverSeed,openReceiverWindow,paintReceiverWindow,parseReceiverSeed,placeReceiverMark,
 reassociateReceivers,receiverControlAvailability,receiverMarkAvailability,receiverSessionOpen,requestReceiverClose,stepReceiver,stepReceiverMark,tickReceivers,
 toggleReceiverMode,type RadioReceiverSession,type ReceiverMarkPress,type ReceiverSessionTransition,
} from './radioReceiverSession';
import {receiverPaintOps} from './radioReceiverDisplay';

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

describe('R-RX3 marks: pointer lease, overlays, keyboard, Clear and lifecycle (WEB-MARK-*)',()=>{
 // [W] web-policy regressions of the session (docs/RADIO-RECEIVER-MARKS.md) with plain pointer numbers; no browser, OS
 // pointer or multitouch claim.
 const press=(s:RadioReceiverSession,o:Partial<ReceiverMarkPress>={})=>markPointerDown(s,{pointerId:1,pointerType:'mouse',button:0,slot:0,code:0,x:100,...o});
 const marks=(s:RadioReceiverSession)=>s.bank.slots.map(r=>r?[...r.marks]:null);
 const finish=(s:RadioReceiverSession)=>{let x=take(mode(s));while(x.bank.timerEnabled)x=tick(x).session;return x;};
 it('one lease: the press attempts and leases; other pointers cannot move, end or steal it; equal columns are not redelivered',()=>{
  const s0=open(),t=press(s0),s=take(t);
  expect(s.markLease).toEqual({pointerId:1,pointerType:'mouse',button:0,slot:0,code:0,lastX:100});
  expect(marks(s)).toEqual([[100,-1],null,null]);expect(s.bank.slots[0]!.markDrag).toEqual([true,false]);
  expect(s.markOverlays[0]).toEqual({lines:[100,null],labels:[{x:100,text:'1.00 Sec'},null]});
  const steal=press(s,{pointerId:2,x:300});expect(steal.outcome).toEqual({kind:'web-refused',action:'mark-down',reason:'mark-lease-held'});expect(steal.session).toBe(s);
  for(const other of [markPointerMove(s,{pointerId:2,x:300}),markPointerUp(s,{pointerId:2,x:300})]){expect(other.changed).toBe(false);expect(other.session).toBe(s);}
  const m=take(markPointerMove(s,{pointerId:1,x:150}));expect(marks(m)).toEqual([[150,-1],null,null]);expect(m.markLease!.lastX).toBe(150);
  expect(markPointerMove(m,{pointerId:1,x:150}).changed).toBe(false);
  const u=take(markPointerUp(m,{pointerId:1,x:160}));
  expect(u.markLease).toBeNull();expect(marks(u)).toEqual([[160,-1],null,null]);expect(u.bank.slots[0]!.markDrag).toEqual([false,false]);
  expect(u.canvases).toBe(s0.canvases);expect(u.bank.random).toBe(s0.bank.random);expect(u.seed).toBe(s0.seed);
 });
 it('refuses presses outside 0..400, bad codes or buttons and absent windows; a press while the timer runs is gated without a lease',()=>{
  const s=open();
  for(const o of [{x:-1},{x:401},{x:1.5},{slot:1},{code:2 as 0},{button:1 as 0},{pointerId:Number.NaN}])
   expect(press(s,o).outcome,JSON.stringify(o)).toEqual({kind:'web-refused',action:'mark-down',reason:'mark-input'});
  const r=take(mode(s)),g=press(r);
  expect(g.outcome).toEqual({kind:'ok',action:'mark-down',events:[{kind:'mark-gated',slot:0}]});expect(g.changed).toBe(false);expect(g.session).toBe(r);
 });
 it('ending the gesture keeps the last accepted mark, clears the flag, attempts nothing and ignores the later release',()=>{
  const s=take(markPointerMove(take(press(open())),{pointerId:1,x:120}));
  const e=take(endMarkGesture(s));
  expect(e.markLease).toBeNull();expect(marks(e)).toEqual([[120,-1],null,null]);expect(e.bank.slots[0]!.markDrag).toEqual([false,false]);
  expect(e.canvases).toBe(s.canvases);expect(e.markOverlays).toBe(s.markOverlays);expect(e.bank.random).toBe(s.bank.random);
  const late=markPointerUp(e,{pointerId:1,x:300});expect(late.changed).toBe(false);expect(late.session).toBe(e);
  expect(endMarkGesture(e).changed).toBe(false);
 });
 it('Mode starting a Receive ends the lease first (flag cleared, marks −1, overlay emptied); a refused Mode keeps it; never lease and timer together',()=>{
  const s=take(press(open()));
  const refusedMode=mode(s,null);expect(refusedMode.outcome.kind).toBe('refused');expect(refusedMode.session).toBe(s);
  const r=take(mode(s));
  expect(r.markLease).toBeNull();expect(r.bank.timerEnabled).toBe(true);
  expect(r.bank.slots[0]).toMatchObject({marks:[-1,-1],markDrag:[false,false]});
  expect(r.markOverlays[0]).toEqual({lines:[null,null],labels:[null,null]});
 });
 it('Open (activation), Add and Close end the lease; overlays follow the windows',()=>{
  const s=take(press(open()));
  for(const t of [openReceiverWindow(s,{catalog:[A],pointing:POINT}),addReceiverWindow(s)])expect(take(t).markLease).toBeNull();
  const two=take(addReceiverWindow(open()));expect(two.markOverlays.map(o=>o!==null)).toEqual([true,true,false]);
  const leased=take(press(two,{slot:1,x:50})),closed=take(requestReceiverClose(leased,1));
  expect(closed.markLease).toBeNull();expect(closed.markOverlays.map(o=>o!==null)).toEqual([true,false,false]);
  const all=take(requestReceiverClose(take(press(two,{x:60})),0));expect(all.markLease).toBeNull();expect(all.markOverlays).toEqual([null,null,null]);
  // The close-refusal box also ends it (the cards are then inert).
  const three=take(press(take(addReceiverWindow(two)),{slot:2,x:70})),box=take(requestReceiverClose(three,1));
  expect(box.closeBox).not.toBeNull();expect(box.markLease).toBeNull();expect(box.bank.slots[2]!.markDrag).toEqual([false,false]);
 });
 it('keyboard placement validates the draft text; steps need a placed mark and stay within 0..400; the timer gates both',()=>{
  const s=open();
  for(const text of ['','401','abc','-1','1.5'])expect(placeReceiverMark(s,0,0,text).outcome).toEqual({kind:'web-refused',action:'mark-place',reason:'mark-position-invalid'});
  expect(stepReceiverMark(s,0,1,1).outcome).toEqual({kind:'web-refused',action:'mark-step',reason:'mark-unset'});
  const p=take(placeReceiverMark(s,0,0,'100'));
  expect(marks(p)).toEqual([[100,-1],null,null]);expect(p.bank.slots[0]!.markDrag).toEqual([false,false]);expect(p.markLease).toBeNull();
  expect(marks(take(stepReceiverMark(p,0,0,1)))).toEqual([[101,-1],null,null]);
  const top=take(placeReceiverMark(p,0,0,'400'));expect(stepReceiverMark(top,0,0,1).outcome).toMatchObject({reason:'mark-bound'});
  const bottom=take(placeReceiverMark(p,0,0,'0'));expect(stepReceiverMark(bottom,0,0,-1).outcome).toMatchObject({reason:'mark-bound'});
  // A placement during a lease ends it first (one set of attempts, flag cleared).
  const l=take(press(s,{x:30})),k=take(placeReceiverMark(l,0,0,'40'));
  expect(k.markLease).toBeNull();expect(marks(k)).toEqual([[40,-1],null,null]);expect(k.bank.slots[0]!.markDrag).toEqual([false,false]);
  const r=take(mode(p)),gated=placeReceiverMark(r,0,0,'50');
  expect(gated.outcome).toMatchObject({kind:'ok',events:[{kind:'mark-gated',slot:0}]});expect(gated.changed).toBe(false);
  // Receive reset the marks, so an arrow step has nothing placed to move.
  expect(stepReceiverMark(r,0,0,1).outcome).toMatchObject({reason:'mark-unset'});
 });
 it('a collision in one channel only: the other windows store the second, the colliding one keeps its mark and shows the requested label',()=>{
  let s=take(addReceiverWindow(take(addReceiverWindow(open()))));
  s=take(placeReceiverMark(s,2,0,'100'));
  const t=placeReceiverMark(s,0,1,'100');s=take(t);
  if(t.outcome.kind!=='ok')throw new Error('expected ok');
  expect(t.outcome.events.flatMap(e=>e.kind==='mark-line'?[[e.slot,e.outcome]]:[])).toEqual([[0,'stored'],[1,'stored'],[2,'collision']]);
  expect(marks(s)).toEqual([[-1,100],[-1,100],[100,-1]]);
  expect(s.markOverlays[2]).toEqual({lines:[100,null],labels:[{x:100,text:'1.00 Sec'},{x:100,text:'1.00 Sec'}]});
 });
 it('Clear: Paints restart the base log and empty the overlay, the tail redraws the remaining first mark; then the first; then nothing',()=>{
  let s=take(paintReceiverWindow(open(),0));
  s=take(placeReceiverMark(s,0,0,'50'));s=take(placeReceiverMark(s,0,1,'300'));
  expect(s.markOverlays[0]!.lines).toEqual([50,300]);
  const c1=take(clearReceiverNextMark(s,0));
  expect(marks(c1)).toEqual([[50,-1],null,null]);expect(c1.markOverlays[0]).toEqual({lines:[50,null],labels:[{x:50,text:'0.50 Sec'},null]});
  expect(c1.canvases[0]!.ops[0].op).toEqual({kind:'fill',x0:0,y0:0,x1:401,y1:142});expect(c1.canvases[0]!.ops[0].seq).toBeGreaterThan(s.canvases[0]!.ops.at(-1)!.seq);
  const c2=take(clearReceiverNextMark(c1,0));expect(marks(c2)).toEqual([[-1,-1],null,null]);expect(c2.markOverlays[0]).toEqual({lines:[null,null],labels:[null,null]});
  const c3=clearReceiverNextMark(c2,0);expect(c3.changed).toBe(false);expect(c3.outcome).toMatchObject({kind:'ok',events:[{kind:'marks-none',slot:0}]});
  expect(c3.session.seed).toBe(s.seed);expect(c3.session.bank.random).toBe(s.bank.random);
 });
 it('Clear draws each Paint from the receiver as that stage drew it, not from the end state',()=>{
  let s=take(addReceiverWindow(open()));s=take(paintReceiverWindow(take(paintReceiverWindow(s,0)),1));
  s=take(mode(s));for(let i=0;i<3;i++)s=tick(s).session;s=finish(s);
  s=take(reassociateReceivers(s,{catalog:[A],pointing:FAR}));
  s=take(placeReceiverMark(s,1,1,'50'));
  const t=clearReceiverNextMark(s,1),c=take(t);
  if(t.outcome.kind!=='ok')throw new Error('expected ok');
  const childPaint=t.outcome.events.find(e=>e.kind==='paint'&&e.slot===1);
  if(!childPaint||childPaint.kind!=='paint'||!childPaint.painted)throw new Error('expected a painted snapshot');
  expect(childPaint.painted.trace.lastX).toBeGreaterThan(0);expect(c.bank.slots[1]!.trace.lastX).toBe(0);
  const drawn=c.canvases[1]!.ops.map(e=>e.op);
  expect(drawn).toEqual(receiverPaintOps(childPaint.painted).ops);
  expect(drawn).not.toEqual(receiverPaintOps(c.bank.slots[1]!).ops);
 });
 it('availability: disabled while the timer runs (also a pending Stop and for children), enabled after the finish, absent without a window',()=>{
  let s=take(addReceiverWindow(open()));
  expect([0,1,2].map(i=>receiverMarkAvailability(s,i))).toEqual(['enabled','enabled','absent']);
  s=take(mode(s));expect(receiverMarkAvailability(s,1)).toBe('disabled');
  s=take(mode(s));expect(s.bank.slots[0]!.stopPending).toBe(true);expect([0,1].map(i=>receiverMarkAvailability(s,i))).toEqual(['disabled','disabled']);
  while(s.bank.timerEnabled)s=tick(s).session;
  expect([0,1].map(i=>receiverMarkAvailability(s,i))).toEqual(['enabled','enabled']);
  expect(receiverControlAvailability(s,0).mode).toBe('enabled');// the R-RX2 record is unchanged
 });
 it('mark actions take no seed and the close box blocks them (cancellation still works)',()=>{
  let s=take(addReceiverWindow(take(addReceiverWindow(open()))));const used=s.seed.used;
  s=take(placeReceiverMark(s,0,1,'20'));s=take(clearReceiverNextMark(s,0));expect(s.seed.used).toBe(used);
  const leased=take(press(s,{slot:2,x:10})),boxed=Object.freeze({...leased,closeBox:Object.freeze({slot:1 as const,text:'t',caption:'c'})});// constructed
  for(const t of [press(boxed,{pointerId:5}),placeReceiverMark(boxed,0,0,'5'),stepReceiverMark(boxed,2,0,1),clearReceiverNextMark(boxed,0),markPointerMove(boxed,{pointerId:1,x:20})])
   expect(t.outcome).toMatchObject({kind:'web-refused',reason:'close-box-open'});
  expect(take(endMarkGesture(boxed)).markLease).toBeNull();
 });
});

describe('source and route audits',()=>{
 const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
 const FORBIDDEN=/Date\.now|new Date|performance\.now|Math\.random|crypto\.|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|WebSocket|AudioContext|new Audio|HTMLAudioElement|navigator\.mediaDevices/;
 const files=['./radioReceiver.ts','./radioReceiverDisplay.ts','./radioReceiverSession.ts','./radioReceiverMarks.ts','./radioReceiverMarkInput.ts','../components/RadioReceiverWindows.tsx'];
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
