import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {RadioLabTransition} from './radioAntenna';
import type {PulsarRecord} from './radioPulsarCatalog';
import {
 RADIO_RECEIVER_SESSION_POLICY,addReceiverWindow,clearReceiverNextMark,completeRecordArming,completedRadioClockTick,copyReceiverLiveOptions,createRadioReceiverSession,dismissReceiverCloseBox,
 editReceiverSeed,endMarkGesture,markPointerDown,markPointerMove,markPointerUp,moveReceiverWindow,nextReceiverSeed,openReceiverWindow,overwriteReceiverSourceBuffer,paintReceiverWindow,parseReceiverSeed,
 placeReceiverMark,pressRecord,reassociateReceivers,receiverBoxRefusal,receiverControlAvailability,receiverMarkAvailability,receiverSessionOpen,receiverWindowMoveAvailability,requestReceiverClose,
 stepReceiver,stepReceiverMark,tickReceivers,toggleReceiverAlignment,toggleReceiverMode,type RadioReceiverSession,type ReceiverMarkPress,type ReceiverSessionTransition,
} from './radioReceiverSession';
import {receiverPaintOps} from './radioReceiverDisplay';
import {EMPTY_RADIO_RECORD_HEADER,RADIO_RECEIVER_COMPILED_OPTIONS,type RadioReceiverOptions} from './radioReceiver';
import {isStackedReceiverArrangement,type ReceiverMoveDirection} from './radioReceiverArrangement';

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
  // R-RX4: Record is enabled while the main timer is off (Receive disables it, the finish enables it).
  expect(receiverControlAvailability(s,0)).toEqual({frequency:'enabled','frequency-step':'enabled',vertical:'enabled',horizontal:'enabled',add:'enabled',mode:'enabled',
   align:'enabled',record:'enabled',close:'enabled'});
  s=take(addReceiverWindow(take(addReceiverWindow(s))));
  expect(receiverControlAvailability(s,0).add).toBe('disabled');
  expect(receiverControlAvailability(s,2)).toEqual({frequency:'enabled','frequency-step':'enabled',vertical:'enabled',horizontal:'absent',add:'absent',mode:'absent',
   align:'absent',record:'absent',close:'enabled'});
  s=take(mode(s));expect(receiverControlAvailability(s,0)).toMatchObject({horizontal:'disabled',add:'disabled',mode:'enabled',frequency:'enabled',record:'disabled'});
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

describe('R-RX5 Align and the window order (WEB-RX-ALIGN-*)',()=>{
 // [W] web-policy regressions of the session (docs/RADIO-RECEIVER-ALIGN.md); synthetic records only, no native geometry claim.
 const order=(s:RadioReceiverSession)=>[...s.arrangement.order];
 const move=(s:RadioReceiverSession,slot:number,dir:ReceiverMoveDirection)=>moveReceiverWindow(s,slot,dir);
 const snap=(rows:number)=>({generation:1,rows,saved:false,analysisBusy:false,leaseHeld:false});
 it('Open stacks [0], Add stacks 1 and 2; Align is enabled on the main in every timer state; edge and input refusals keep the session',()=>{
  let s=open();expect(order(s)).toEqual([0]);expect(s.bank.align).toEqual({on:true,guard:true});
  expect(receiverWindowMoveAvailability(s,0)).toEqual({up:'edge',down:'edge'});expect(receiverWindowMoveAvailability(s,1)).toEqual({up:'absent',down:'absent'});
  const edge=move(s,0,'up');expect(edge.outcome).toEqual({kind:'web-refused',action:'move',reason:'window-edge'});expect(edge.session).toBe(s);expect(edge.changed).toBe(false);
  for(const [slot,dir] of [[3,'up'],[1,'up'],[0,'left'],[-1,'down'],[0.5,'up']] as const){
   const r=move(s,slot,dir as ReceiverMoveDirection);expect(r.outcome,`${slot} ${dir}`).toEqual({kind:'web-refused',action:'move',reason:'window-input'});expect(r.session).toBe(s);
  }
  s=take(addReceiverWindow(take(addReceiverWindow(s))));expect(order(s)).toEqual([0,1,2]);
  expect([0,1,2].map(i=>receiverWindowMoveAvailability(s,i))).toEqual([{up:'edge',down:'enabled'},{up:'enabled',down:'enabled'},{up:'enabled',down:'edge'}]);
  expect(receiverControlAvailability(s,1).align).toBe('absent');
  s=take(mode(s));expect(receiverControlAvailability(s,0).align).toBe('enabled');
  s=take(mode(s));expect(s.bank.slots[0]!.stopPending).toBe(true);expect(receiverControlAvailability(s,0).align).toBe('enabled');
  expect(toggleReceiverAlignment(createRadioReceiverSession()).outcome).toMatchObject({kind:'refused',action:'align',error:{kind:'receiver-unavailable'}});
 });
 it('Align on: a move snaps back at once; Off repositions nothing; Off moves reorder; On re-stacks',()=>{
  let s=take(addReceiverWindow(take(addReceiverWindow(open()))));
  const back=move(s,2,'up');expect(order(take(back))).toEqual([0,1,2]);
  if(back.outcome.kind!=='ok')throw new Error('expected ok');
  expect(back.outcome.events.flatMap(e=>e.kind==='window-placed'?[`${e.cause}${e.slot}`]:[])).toEqual(['move2','move1']);
  s=take(toggleReceiverAlignment(s));expect(s.bank.align.on).toBe(false);expect(order(s)).toEqual([0,1,2]);expect(s.bank.slots[0]!.alignLabel).toBe('No');
  s=take(move(s,2,'up'));expect(order(s)).toEqual([0,2,1]);
  s=take(move(s,2,'up'));expect(order(s)).toEqual([2,0,1]);
  expect(receiverWindowMoveAvailability(s,2)).toEqual({up:'edge',down:'enabled'});expect(move(s,2,'up').outcome).toMatchObject({reason:'window-edge'});
  s=take(toggleReceiverAlignment(s));expect(order(s)).toEqual([0,1,2]);expect(s.bank.slots[0]!.alignLabel).toBe('Yes');
 });
 it('Off → Add turns Align on and stacks, AlignDisp stays No until the main refresh; close the highest and re-add; main close and reopen',()=>{
  let s=take(addReceiverWindow(open()));
  s=take(toggleReceiverAlignment(s));s=take(move(s,1,'up'));expect(order(s)).toEqual([1,0]);
  s=take(addReceiverWindow(s));expect(order(s)).toEqual([0,1,2]);expect(s.bank.align.on).toBe(true);expect(s.bank.slots[0]!.alignLabel).toBe('No');
  s=take(stepReceiver(s,0,'vertical','up'));expect(s.bank.slots[0]!.alignLabel).toBe('Yes');
  s=take(toggleReceiverAlignment(s));s=take(move(s,2,'up'));s=take(move(s,2,'up'));expect(order(s)).toEqual([2,0,1]);
  s=take(requestReceiverClose(s,2));expect(order(s)).toEqual([0,1]);expect(s.bank.align.on).toBe(false);
  s=take(addReceiverWindow(s));expect(order(s)).toEqual([0,1,2]);expect(s.bank.align.on).toBe(true);
  s=take(toggleReceiverAlignment(s));s=take(move(s,0,'down'));expect(order(s)).toEqual([1,0,2]);
  s=take(requestReceiverClose(s,0));expect(order(s)).toEqual([]);
  s=open(s);expect(order(s)).toEqual([0]);expect(s.bank.align).toEqual({on:true,guard:true});expect(s.bank.slots[0]!.alignLabel).toBe('Yes');
 });
 it('toggle and move end a mark lease (marks kept, no attempt); the close box and the Record dialogs refuse with the session untouched',()=>{
  const s=take(addReceiverWindow(open()));
  const leased=take(markPointerDown(s,{pointerId:1,pointerType:'touch',button:0,slot:1,code:0,x:80}));
  for(const t of [toggleReceiverAlignment(leased),move(leased,1,'up')]){
   const n=take(t);expect(n.markLease).toBeNull();expect(n.bank.slots[1]!.marks).toEqual([80,-1]);expect(n.bank.slots[1]!.markDrag).toEqual([false,false]);
   expect(n.markOverlays).toBe(leased.markOverlays);expect(n.canvases).toBe(leased.canvases);expect(n.bank.random).toBe(leased.bank.random);expect(n.seed).toBe(leased.seed);
  }
  const boxed=take(requestReceiverClose(take(addReceiverWindow(s)),1));expect(boxed.closeBox).not.toBeNull();
  for(const t of [toggleReceiverAlignment(boxed),move(boxed,2,'up')]){expect(t.outcome).toMatchObject({kind:'web-refused',reason:'close-box-open'});expect(t.session).toBe(boxed);}
  const prompt=take(pressRecord(s,snap(3)));expect(prompt.record.prompt).not.toBeNull();
  for(const t of [toggleReceiverAlignment(prompt),move(prompt,1,'up')]){expect(t.outcome).toMatchObject({kind:'web-refused',reason:'record-dialog-open'});expect(t.session).toBe(prompt);}
 });
 it('toggling and moving while capturing send no host request and keep the record state and capture rows',()=>{
  let s=take(addReceiverWindow(take(addReceiverWindow(open()))));
  const press=pressRecord(s,snap(0));expect(press.host?.map(h=>h.kind)).toEqual(['acquire']);s=take(press);
  s=take(completeRecordArming(s,{ok:true,seed:EMPTY_RADIO_RECORD_HEADER}));
  s=take(mode(s));for(let i=0;i<3;i++)s=tick(s).session;
  expect(s.record.receiving).toBe(true);expect(s.bank.recording.rows.length).toBeGreaterThan(0);
  const t1=toggleReceiverAlignment(s),a=take(t1);expect(t1.host).toBeUndefined();
  const t2=move(a,2,'up'),b=take(t2);expect(t2.host).toBeUndefined();expect(order(b)).toEqual([0,2,1]);
  for(const x of [a,b]){expect(x.record).toBe(s.record);expect(x.bank.recording.rows).toBe(s.bank.recording.rows);expect(x.bank.recording.header).toBe(s.bank.recording.header);}
  expect(tick(b).session.bank.recording.rows.length).toBeGreaterThan(s.bank.recording.rows.length);
 });
 it('a seeded operation sequence keeps I1–I4 after every step',()=>{
  let x=20261025;const rnd=(n:number)=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return (x>>>16)%n;};// in-test LCG (high bits)
  let s=createRadioReceiverSession(),offMoved=false;const stats={offMoves:0,onMoves:0,toggles:0};
  for(let i=0;i<500;i++){
   if(s.closeBox)s=take(dismissReceiverCloseBox(s));
   const op=rnd(10),slot=rnd(3),dir:ReceiverMoveDirection=rnd(2)?'up':'down';
   const before=s,wasOn=s.bank.align.on,wasGuard=s.bank.align.guard;
   const t:ReceiverSessionTransition=op===0?openReceiverWindow(s,{catalog:[A],pointing:POINT}):op===1?addReceiverWindow(s):op===2?requestReceiverClose(s,slot)
    :op===3?toggleReceiverAlignment(s):op<=6?move(s,slot,dir):op===7?mode(s):op===8?tick(s):placeReceiverMark(s,slot,0,String(rnd(401)));
   s=t.session;
   const openSlots=[0,1,2].filter(k=>s.bank.slots[k]!==null);
   expect([...s.arrangement.order].sort(),`I1 step ${i}`).toEqual(openSlots);
   if(s.bank.align.on)expect(isStackedReceiverArrangement(s.arrangement),`I2 step ${i}`).toBe(true);
   if(!wasGuard&&s.bank.align.guard)offMoved=false;
   const okAlign=(op===3||(op>=4&&op<=6))&&t.outcome.kind==='ok';
   if(okAlign&&op!==3){if(wasOn)stats.onMoves++;else{stats.offMoves++;offMoved=true;}}
   if(okAlign&&op===3)stats.toggles++;
   if(s.bank.align.guard)expect(offMoved,`I4 step ${i}`).toBe(false);
   if(okAlign&&t.outcome.kind==='ok'){
    const b=before.bank,a=s.bank,cleared=t.outcome.events.some(e=>e.kind==='trace-cleared');
    expect(a.random,`I3 step ${i}`).toBe(b.random);expect(a.profile).toBe(b.profile);expect(a.sourceBuffer).toBe(b.sourceBuffer);
    expect(a.recording.rows).toBe(b.recording.rows);expect(s.record).toBe(before.record);expect(s.seed.used).toBe(before.seed.used);
    expect(s.canvases).toBe(before.canvases);expect(s.markOverlays).toBe(before.markOverlays);
    for(const k of [0,1,2]){
     const r0=b.slots[k],r1=a.slots[k];if(!r0){expect(r1).toBeNull();continue;}
     expect(r1!.marks).toEqual(r0.marks);if(!cleared)expect(r1!.trace).toBe(r0.trace);
    }
   }
  }
  // The sequence reaches both Align states with accepted moves (coverage of the invariants, not a count contract).
  expect(stats.offMoves).toBeGreaterThan(0);expect(stats.onMoves).toBeGreaterThan(0);expect(stats.toggles).toBeGreaterThan(0);
 });
});

describe('R-RX6 PulsarList1Click on the shared buffer, modelled (WEB-PP-LIST-03), delivered by File ▸ Pulsar List... since R-RX8 (WEB-PP-LIST-04)',()=>{
 // [W] contract checks of the modelled session action (the reference Open never calls it); synthetic records only. Later ticks may
 // legitimately run the existing name coupling (rebuild, RNG draws): only the click itself is claimed to leave the receivers untouched.
 const B=rec({primaryName:'J0001+01',legacyName:'B0001+01',ra:6.1,dec:10});
 const list=(s:RadioReceiverSession,catalog:readonly PulsarRecord[]|null=[B],pointing:Readonly<{ra:number;dec:number}>=POINT)=>overwriteReceiverSourceBuffer(s,{catalog,pointing});
 const snap=(rows:number)=>({generation:1,rows,saved:false,analysisBusy:false,leaseHeld:false});
 const events=(t:ReceiverSessionTransition)=>t.outcome.kind==='ok'?t.outcome.events:[];
 it('hit copies, miss clears the J2000 name only; no receiver field, seed, canvas, overlay, record or arrangement changes',()=>{
  const s=take(paintReceiverWindow(open(),0));
  const hit=list(s);expect(events(hit)).toEqual([{kind:'buffer-overwritten',name:'J0001+01'}]);
  const h=take(hit);
  expect(h.bank.sourceBuffer).toEqual({record:B,primaryNameCleared:false});expect(h.bank.sourceBuffer.record).not.toBe(B);
  expect(h.bank.slots).toEqual(s.bank.slots);expect(h.bank.slots[0]!.trace).toBe(s.bank.slots[0]!.trace);
  for(const k of ['profile','random','options','timerEnabled'] as const)expect(h.bank[k],k).toBe(s.bank[k]);
  expect(h.bank.recording).toEqual(s.bank.recording);expect(h.bank.recording.rows).toBe(s.bank.recording.rows);expect(h.bank.align).toEqual(s.bank.align);
  expect(h.seed).toBe(s.seed);expect(h.canvases).toBe(s.canvases);expect(h.markOverlays).toBe(s.markOverlays);expect(h.record).toBe(s.record);expect(h.arrangement).toBe(s.arrangement);
  expect(h.bank.slots[0]).toMatchObject({sourceAttached:true,offset:0,title:s.bank.slots[0]!.title,identifiedName:s.bank.slots[0]!.identifiedName});
  const miss=list(h,[B],FAR);expect(events(miss)).toEqual([{kind:'buffer-name-cleared'}]);
  const m=take(miss);expect(m.bank.sourceBuffer).toEqual({record:{...B,primaryName:''},primaryNameCleared:true});expect(m.bank.slots).toEqual(s.bank.slots);
  expect(take(list(s,[A])).bank.sourceBuffer.record).toEqual(A);// the same name: equal buffer, still no receiver change
  // Without receivers the buffer is written as well (TRadioLab owns it).
  const none=take(list(createRadioReceiverSession()));expect(none.bank.sourceBuffer.record).toEqual(B);expect(receiverSessionOpen(none)).toBe(false);
  expect(list(s,null).outcome).toEqual({kind:'web-refused',action:'pulsar-list',reason:'no-catalog'});
 });
 it('the close box and the Record prompt or finish refuse atomically; a mark lease and a tick error stay',()=>{
  const boxed=take(requestReceiverClose(take(addReceiverWindow(take(addReceiverWindow(open())))),1));
  const b=list(boxed);expect(b.outcome).toEqual({kind:'web-refused',action:'pulsar-list',reason:'close-box-open'});expect(b.session).toBe(boxed);expect(b.changed).toBe(false);
  const prompt=take(pressRecord(open(),snap(3)));
  const p=list(prompt);expect(p.outcome).toMatchObject({kind:'web-refused',reason:'record-dialog-open'});expect(p.session).toBe(prompt);
  const leased=take(markPointerDown(open(),{pointerId:1,pointerType:'mouse',button:0,slot:0,code:0,x:80}));
  const l=take(list(leased));expect(l.markLease).toBe(leased.markLease);expect(l.bank.slots[0]!.markDrag).toEqual([true,false]);expect(l.bank.slots[0]!.marks).toEqual(leased.bank.slots[0]!.marks);
  const P=rec({primaryName:'J0001+00',legacyName:'B0001+00',x2a:0.04});
  let e=take(mode(open()));e=tick(e).session;e=take(reassociateReceivers(e,{catalog:[P],pointing:POINT}));e=tick(e).session;
  expect(e.tickError).toMatchObject({kind:'poisson-mean-domain'});
  expect(take(list(e,[P])).tickError).toBe(e.tickError);
 });
 it('armed Record: the next Receive header takes the new legacy name; capturing and a pending stop also accept the write',()=>{
  let s=open();s=take(pressRecord(s,snap(0)));s=take(completeRecordArming(s,{ok:true,seed:EMPTY_RADIO_RECORD_HEADER}));
  const armed=take(list(s));expect(armed.record).toBe(s.record);expect(armed.bank.recording).toEqual(s.bank.recording);
  const r=take(mode(armed));expect(r.bank.recording.header!.name).toBe('B0001+01');
  const capturing=take(list(r,[A]));expect(capturing.bank.recording).toEqual(r.bank.recording);expect(capturing.bank.recording.rows).toBe(r.bank.recording.rows);
  expect(capturing.record).toBe(r.record);
  const stopping=take(mode(capturing));expect(stopping.bank.slots[0]!.stopPending).toBe(true);
  expect(take(list(stopping)).bank.sourceBuffer.record).toEqual(B);
 });
 it('while receiving: the same name rebuilds nothing; another name rebuilds and draws at the next tick, not at the click',()=>{
  let s=take(mode(open()));s=tick(s).session;
  const same=take(list(s,[A]));expect(same.bank.random).toBe(s.bank.random);expect(same.bank.profile).toBe(s.bank.profile);
  expect(events(tick(same)).some(e=>e.kind==='refresh')).toBe(false);
  const other=take(list(s));expect(other.bank.random).toBe(s.bank.random);expect(other.bank.profile).toBe(s.bank.profile);expect(other.seed).toBe(s.seed);
  const next=tick(other);
  expect(events(next)).toContainEqual({kind:'refresh',cause:'coupling',attached:true,name:'J0001+01'});
  expect(next.session.bank.random!.events).toBeGreaterThan(other.bank.random!.events);
 });
 it('a miss: the next master frame rebuilds from the stale record under an empty name; a detached main does not couple',()=>{
  let s=take(mode(open()));s=tick(s).session;
  const cleared=take(list(s,[A],FAR));
  expect(events(tick(cleared))).toContainEqual({kind:'refresh',cause:'coupling',attached:true,name:''});
  let d=take(mode(take(openReceiverWindow(createRadioReceiverSession(),{catalog:[A],pointing:FAR}))));d=tick(d).session;
  expect(d.bank.slots[0]!.sourceAttached).toBe(false);
  const written=take(list(d,[A]));expect(events(tick(written)).some(e=>e.kind==='refresh')).toBe(false);
 });
 it('the main title changes only at its next parameter refresh (Align)',()=>{
  const s=open(),before=s.bank.slots[0]!.title;
  const w=take(list(s));expect(w.bank.slots[0]!.title).toBe(before);
  const a=take(toggleReceiverAlignment(w));expect(a.bank.slots[0]!.title).not.toBe(before);expect(a.bank.slots[0]!.title).toContain('B0001+01');
 });
 it('receiverBoxRefusal: the read-only gate of the reference Open names the reason the session gate refuses with',()=>{
  const fresh=createRadioReceiverSession(),opened=open();
  expect(receiverBoxRefusal(fresh)).toBeNull();expect(receiverBoxRefusal(opened)).toBeNull();
  const boxed=take(requestReceiverClose(take(addReceiverWindow(take(addReceiverWindow(open())))),1));
  const prompt=take(pressRecord(open(),snap(3)));
  let f=take(completeRecordArming(take(pressRecord(open(),snap(0))),{ok:true,seed:EMPTY_RADIO_RECORD_HEADER}));
  f=take(mode(f));for(let i=0;i<3;i++)f=tick(f).session;f=take(mode(f));while(f.bank.timerEnabled)f=tick(f).session;
  expect(f.record.finish).not.toBeNull();expect(f.record.prompt).toBeNull();
  const cases:[RadioReceiverSession,string][]=[[boxed,'close-box-open'],[prompt,'record-dialog-open'],[f,'record-dialog-open']];
  for(const [s,reason] of cases){
   const before={...s};
   expect(receiverBoxRefusal(s)).toBe(reason);
   for(const k of Object.keys(before) as (keyof RadioReceiverSession)[])expect(s[k],k).toBe(before[k]);
   expect(list(s).outcome).toEqual({kind:'web-refused',action:'pulsar-list',reason});
  }
  for(const s of [fresh,opened])expect(list(s).outcome.kind).toBe('ok');
 });
 it('a persistent coupling refusal recovers after a hit whose name equals the identified name',()=>{
  const P=rec({primaryName:'J0001+00',legacyName:'B0001+00',x2a:0.04});
  let s=take(mode(open()));s=tick(s).session;s=take(reassociateReceivers(s,{catalog:[P],pointing:POINT}));s=tick(s).session;
  expect(s.tickError).not.toBeNull();expect(s.bank.slots[0]!.identifiedName).toBe('J0000+00');
  const back=take(list(s,[A]));expect(back.tickError).toBe(s.tickError);
  const ok=tick(back);expect(ok.outcome.kind).toBe('ok');expect(ok.session.tickError).toBeNull();
 });
});

describe('R-RX9 live options copy (WEB-RSO-PROJ-01, OA-03 copyLiveRadioOptions)',()=>{
 // [W] contract checks of the session action the route calls after a Preferences close; synthetic options only.
 const NEW:RadioReceiverOptions=Object.freeze({provenance:'supplied-record',dishDiameterMeters:50,gain924:2,background928:9,beamWidth92c:Math.fround(0.25),temperature930:Math.fround(30)});
 const snap=(rows:number)=>({generation:1,rows,saved:false,analysisBusy:false,leaseHeld:false});
 const copy=(s:RadioReceiverSession,o:RadioReceiverOptions=NEW)=>copyReceiverLiveOptions(s,o);
 it('replaces only bank.options: receivers, caches, canvases, overlays, seed, record and arrangement are kept; no event',()=>{
  const s=take(paintReceiverWindow(open(),0)),t=copy(s);
  expect(t.outcome).toEqual({kind:'ok',action:'live-options',events:[]});expect(t.host).toBeUndefined();
  const c=take(t);
  expect(c.bank.options).toEqual(NEW);expect(c.bank.options).not.toBe(NEW);expect(s.bank.options).toEqual(RADIO_RECEIVER_COMPILED_OPTIONS);
  expect(c.bank.slots).toEqual(s.bank.slots);expect(c.bank.slots[0]!.trace).toBe(s.bank.slots[0]!.trace);
  for(const k of ['sensitivity','backgroundFactor','area','detectorThermal','apertureText','title'] as const)expect(c.bank.slots[0]![k],k).toEqual(s.bank.slots[0]![k]);
  for(const k of ['profile','random','sourceBuffer','timerEnabled'] as const)expect(c.bank[k],k).toBe(s.bank[k]);
  expect(c.bank.recording).toEqual(s.bank.recording);
  expect(c.seed).toBe(s.seed);expect(c.canvases).toBe(s.canvases);expect(c.markOverlays).toBe(s.markOverlays);expect(c.record).toBe(s.record);expect(c.arrangement).toBe(s.arrangement);
  // Without receivers the view is replaced too (the first Open's FormCreate takes it).
  expect(take(copy(createRadioReceiverSession())).bank.options).toEqual(NEW);
 });
 it('refuses atomically under the close box, a Record prompt or finish, an armed capture and a held capture lease',()=>{
  const boxed=take(requestReceiverClose(take(addReceiverWindow(take(addReceiverWindow(open())))),1));
  expect(copy(boxed)).toMatchObject({session:boxed,changed:false,outcome:{kind:'web-refused',action:'live-options',reason:'close-box-open'}});
  const prompt=take(pressRecord(open(),snap(3)));
  expect(copy(prompt)).toMatchObject({session:prompt,changed:false,outcome:{kind:'web-refused',reason:'record-dialog-open'}});
  const armed=take(completeRecordArming(take(pressRecord(open(),snap(0))),{ok:true,seed:EMPTY_RADIO_RECORD_HEADER}));
  expect(armed.record.leaseId).not.toBeNull();
  const a=copy(armed);expect(a).toMatchObject({changed:false,outcome:{kind:'web-refused',reason:'record-lease-held'}});expect(a.session).toBe(armed);
  const capturing=take(mode(armed));expect(capturing.bank.recording.header).not.toBeNull();
  expect(copy(capturing).outcome).toMatchObject({kind:'web-refused',reason:'record-lease-held'});
  // The header the Receive start wrote still names the aperture in use then.
  expect(capturing.bank.recording.header!.aperture).toBe(100);
  expect(copy(open(),{...NEW,dishDiameterMeters:20000}).outcome).toMatchObject({kind:'refused',action:'live-options',error:{kind:'options-domain'}});
 });
 it('existing receivers keep their FormCreate caches; a child added later takes the new ones; the aperture text follows a paint',()=>{
  const s=take(paintReceiverWindow(open(),0)),before=s.bank.slots[0]!;
  const c=take(copy(s));
  expect(c.bank.slots[0]!.apertureText).toBe(before.apertureText);
  const added=take(addReceiverWindow(c)),child=added.bank.slots[1]!;
  expect(child.sensitivity).toBe(2);expect(child.area).not.toBe(before.area);expect(added.bank.slots[0]!.sensitivity).toBe(before.sensitivity);
  expect(added.bank.slots[0]!.area).toBe(before.area);
  const painted=take(paintReceiverWindow(c,0));
  expect(painted.bank.slots[0]!.apertureText).not.toBe(before.apertureText);
  expect(painted.bank.slots[0]!.apertureText).toContain('50');
 });
});

describe('source and route audits',()=>{
 const read=(p:string)=>readFileSync(new URL(p,import.meta.url),'utf8');
 const FORBIDDEN=/Date\.now|new Date|performance\.now|Math\.random|crypto\.|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|WebSocket|AudioContext|new Audio|HTMLAudioElement|navigator\.mediaDevices/;
 const files=['./radioReceiver.ts','./radioReceiverDisplay.ts','./radioReceiverSession.ts','./radioReceiverMarks.ts','./radioReceiverMarkInput.ts','./radioReceiverRecord.ts',
  './pulsarCurrentData.ts','../useSharedPulsarData.ts','../components/RadioReceiverWindows.tsx','./radioReceiverAudition.ts','./radioFinishSave.ts'];
 it('keeps host clocks, RNG, storage, network and audio out of the receiver modules',()=>{
  for(const f of files)expect(read(f),f).not.toMatch(FORBIDDEN);
 });
 it('R-RX13: AudioContext is reached only through the audition host, which has no other host surface',()=>{
  const host=read('../components/receiverAuditionHost.ts');
  expect(host).toMatch(/AudioContext/);
  expect(host).not.toMatch(/Date\.now|new Date|performance\.now|Math\.random|crypto\.|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|WebSocket|new Audio|HTMLAudioElement|navigator|mediaDevices|getUserMedia|Worker/);
  expect([...host.matchAll(/from '([^']+)'/g)].map(m=>m[1])).toEqual(['../core/radioReceiverAudition']);
  const windows=read('../components/RadioReceiverWindows.tsx');
  expect(windows).toMatch(/from '\.\/receiverAuditionHost'/);
  for(const f of files)expect(read(f),f).not.toMatch(/AudioContext/);
 });
 it('the route reads performance.now once (perfNow) and no other host clock or random source',()=>{
  const route=read('../components/RadioTelescopeRoute.tsx');
  expect(route.match(/performance\.now/g)).toHaveLength(1);expect(route).toMatch(/const perfNow=\(\)=>performance\.now\(\);/);
  expect(route).not.toMatch(/Date\.now|new Date\(\)|Math\.random|crypto\./);
 });
 it('imports nothing from the PLR, notebook, io or optical modules',()=>{
  // R-RX4: the receiver side reaches the shared current dataset only through pulsarCurrentData (and its App hook), which
  // owns the PLR accessors; pulsarCurrentData itself reads pulsarRecording and is not a receiver module.
  for(const f of files.filter(f=>!f.includes('pulsarCurrentData'))){
   const imports=[...read(f).matchAll(/from '([^']+)'/g)].map(m=>m[1]);
   for(const i of imports)expect(i,`${f}: ${i}`).not.toMatch(/pulsarRecording|pulsarAnalysis|pulsarSavedRows|pulsarReview|\/io\/|optical|spectrum|hubble/i);
  }
  const current=[...read('./pulsarCurrentData.ts').matchAll(/from '([^']+)'/g)].map(m=>m[1]);
  expect(current).toEqual(['./pulsarRecording']);
 });
 it('R-RX17: the finish claim and recorder are reached only by the finish Save core and the Radio presentation',()=>{
  // docs/RADIO-FINISH-SAVE.md WEB-RX17-03: the Analysis Save and the R-RX16 arming Save keep the generic, lease-refusing recorder.
  const FINISH=/pulsarFinishWriteClaim|recordPulsarFinishWrittenCopy/;
  for(const f of ['../components/PulsarAnalysis.tsx','./radioRecordSave.ts','./pulsarSavedCopy.ts','../components/pulsarSaveHost.ts','./radioReceiverSession.ts'])
   expect(read(f),f).not.toMatch(FINISH);
  expect(read('./radioFinishSave.ts')).toMatch(/pulsarFinishWriteClaim/);expect(read('./radioFinishSave.ts')).not.toMatch(/recordPulsarFinishWrittenCopy\(/);
  const windows=read('../components/RadioReceiverWindows.tsx');
  expect(windows.match(/recordPulsarFinishWrittenCopy\(/g)).toHaveLength(1);expect(windows).not.toMatch(/pulsarFinishWriteClaim/);
 });
});
