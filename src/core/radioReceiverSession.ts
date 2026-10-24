// WEB session of the silent receiver monitor (R-RX2): the receiver bank, the seed policy WEB-RX-SEED-01, one bounded
// canvas op log per window (pen and ops; the drawing state of the presentation, WEB-RX-PAINT-01/02), the persistent tick
// refusal (WEB-RX-ERR-01) and the recovered close-refusal box. Pure TypeScript: no React, DOM, host clock, RNG, audio or
// storage; the caller supplies JD (radio clock scenario) and `now` (a monotonic day scalar, WEB-RX-TIME-01). Nothing here
// is saved or restored (WEB-RX-PERSIST-01). See docs/RADIO-RECEIVER-MONITOR.md.
import type {RadioLabTransition,RadioPointing} from './radioAntenna';
import type {PulsarCatalog} from './radioPulsarCatalog';
import {
 RADIO_RECEIVER_COMPILED_OPTIONS,activateReceiver,addReceiverChannel,closeReceiver,createRadioReceiverBank,openMainReceiver,paintReceiver,queryCloseReceiver,
 reassociateReceiverOnClock,receiverTimerTick,stepFrequency,stepFrequencyIncrement,stepHorizontal,stepVertical,toggleReceive,
 type RadioReceiverBank,type RadioReceiverControl,type RadioReceiverError,type RadioReceiverEvent,type RadioReceiverResult,
} from './radioReceiver';
import {RECEIVER_DISPLAY_GEOMETRY,receiverAnnotationOps,receiverFrameOps,receiverPaintOps,type ReceiverDisplayOp,type ReceiverPen} from './radioReceiverDisplay';

export const RADIO_RECEIVER_SESSION_POLICY=Object.freeze({
 /** WEB-RX-CAD-01: Timer1 interval 40 ms (NT-branch reading of 0x48c394); no host OS claim. */
 timerIntervalMs:40,
 /** WEB-RX-TIME-01: the caller's monotonic milliseconds / 86 400 000 (a day scalar, explicit deviation from Time 0x40d448). */
 msPerDay:86_400_000,
 /** Ops kept per canvas log; older ones are dropped (a later redraw is a pure repaint, WEB-RX-PAINT-02). */
 opLogLimit:4096,
 /** WEB-RX-SEED-01 default base. */
 defaultSeedText:'1',
 seedMaxText:10,
});

/** WEB-RX-SEED-01: the k-th Randomize site of the route session uses (base + k) >>> 0. base null: invalid text. */
export type ReceiverSeed=Readonly<{text:string;base:number|null;used:number}>;
export type ReceiverCanvasEntry=Readonly<{seq:number;op:ReceiverDisplayOp}>;
/** Pen after the last op (null before any); ops numbered by seq. dropped: ops before ops[0] were discarded and ops[0] is
 * not a full repaint (the presentation then redraws purely from the state). */
export type ReceiverCanvasLog=Readonly<{pen:ReceiverPen|null;nextSeq:number;ops:readonly ReceiverCanvasEntry[];dropped:boolean}>;
export type ReceiverCloseBox=Readonly<{slot:1;text:string;caption:string}>;
export type RadioReceiverSession=Readonly<{
 bank:RadioReceiverBank;
 seed:ReceiverSeed;
 canvases:readonly [ReceiverCanvasLog|null,ReceiverCanvasLog|null,ReceiverCanvasLog|null];
 /** Persistent coupling/tick refusal: the timer keeps retrying; Close of the main recovers (WEB-RX-ERR-01). */
 tickError:RadioReceiverError|null;
 closeBox:ReceiverCloseBox|null;
}>;
export type ReceiverAction='seed'|'open'|'add'|'mode'|'tick'|'reassociate'|'step'|'paint'|'close'|'dismiss-box';
export type ReceiverWebRefusal='seed-invalid'|'seed-locked'|'no-catalog'|'close-box-open';
export type ReceiverSessionOutcome=Readonly<
 |{kind:'ok';action:ReceiverAction;events:readonly RadioReceiverEvent[]}
 |{kind:'refused';action:ReceiverAction;error:RadioReceiverError}
 |{kind:'web-refused';action:ReceiverAction;reason:ReceiverWebRefusal}>;
export type ReceiverSessionTransition=Readonly<{session:RadioReceiverSession;outcome:ReceiverSessionOutcome;changed:boolean}>;
export type ReceiverSourceNow=Readonly<{catalog:PulsarCatalog|null;pointing:RadioPointing}>;
export type ReceiverClockNow=Readonly<{jd:number|null;now:number}>;

type Canvases=RadioReceiverSession['canvases'];
const EMPTY_LOG:ReceiverCanvasLog=Object.freeze({pen:null,nextSeq:0,ops:Object.freeze([]),dropped:false});
const MAX_SEED=0xffff_ffff;

/** Seed text admission: 1..10 decimal digits, at most 4294967295; otherwise base null. */
export function parseReceiverSeed(text:string):number|null{
 if(!/^\d{1,10}$/.test(text))return null;const v=Number(text);return v<=MAX_SEED?v:null;
}
const seedOf=(text:string,used:number):ReceiverSeed=>Object.freeze({text,base:parseReceiverSeed(text),used});
/** The seed the next Randomize site receives, or undefined when the text is invalid. */
export const nextReceiverSeed=(s:RadioReceiverSession):number|undefined=>s.seed.base===null?undefined:(s.seed.base+s.seed.used)>>>0;
export const receiverSessionOpen=(s:RadioReceiverSession)=>s.bank.slots.some(r=>r!==null);

export function createRadioReceiverSession():RadioReceiverSession{
 const created=createRadioReceiverBank(RADIO_RECEIVER_COMPILED_OPTIONS);
 if(!created.ok)throw new Error('compiled receiver options refused');
 return Object.freeze({bank:created.bank,seed:seedOf(RADIO_RECEIVER_SESSION_POLICY.defaultSeedText,0),canvases:Object.freeze([null,null,null]) as Canvases,tickError:null,closeBox:null});
}

const keep=(session:RadioReceiverSession,outcome:ReceiverSessionOutcome):ReceiverSessionTransition=>Object.freeze({session,outcome:Object.freeze(outcome),changed:false});
const webRefused=(s:RadioReceiverSession,action:ReceiverAction,reason:ReceiverWebRefusal)=>keep(s,{kind:'web-refused',action,reason});
const refused=(s:RadioReceiverSession,action:ReceiverAction,error:RadioReceiverError)=>keep(s,{kind:'refused',action,error});
/** Randomize events added between two streams (at most one per transition on the ported paths). */
function randomizeCount(before:RadioReceiverBank,after:RadioReceiverBank):number{
 const added=(after.random?.events??0)-(before.random?.events??0),ledger=after.random?.ledger??[];
 if(added<=0)return 0;
 return ledger.slice(ledger.length-Math.min(added,ledger.length)).filter(e=>e.kind==='randomize').length;
}
function commit(s:RadioReceiverSession,action:ReceiverAction,events:readonly RadioReceiverEvent[],bank:RadioReceiverBank,
 patch:Partial<Pick<RadioReceiverSession,'canvases'|'tickError'|'closeBox'>>={}):ReceiverSessionTransition{
 const used=s.seed.used+randomizeCount(s.bank,bank);
 const session:RadioReceiverSession=Object.freeze({...s,bank,seed:used===s.seed.used?s.seed:seedOf(s.seed.text,used),...patch});
 return Object.freeze({session,outcome:Object.freeze({kind:'ok',action,events}),changed:true});
}

/** Appends ops to a log; a full-canvas fill starts it afresh (it covers everything before). Bounded by opLogLimit. */
function appendOps(log:ReceiverCanvasLog,ops:readonly ReceiverDisplayOp[],pen:ReceiverPen|null):ReceiverCanvasLog{
 let entries:ReceiverCanvasEntry[]=[...log.ops],dropped=log.dropped,seq=log.nextSeq;
 for(const op of ops){
  if(op.kind==='fill'&&op.x0<=0&&op.y0<=0&&op.x1>=RECEIVER_DISPLAY_GEOMETRY.width&&op.y1>=RECEIVER_DISPLAY_GEOMETRY.height){entries=[];dropped=false;}
  entries.push(Object.freeze({seq:seq++,op}));
 }
 const limit=RADIO_RECEIVER_SESSION_POLICY.opLogLimit;
 if(entries.length>limit){entries=entries.slice(entries.length-limit);dropped=true;}
 return Object.freeze({pen,nextSeq:seq,ops:Object.freeze(entries),dropped});
}
function withLog(c:Canvases,slot:number,update:(log:ReceiverCanvasLog)=>ReceiverCanvasLog):Canvases{
 const next=[...c] as [ReceiverCanvasLog|null,ReceiverCanvasLog|null,ReceiverCanvasLog|null];
 const log=next[slot];if(log)next[slot]=update(log);
 return Object.freeze(next) as Canvases;
}
/** Draws the paint and annotation events of a transition on the slots' logs, from the resulting state. */
function drawEvents(c:Canvases,bank:RadioReceiverBank,events:readonly RadioReceiverEvent[]):Canvases{
 let next=c;
 for(const e of events){
  if(e.kind!=='paint'&&e.kind!=='annotation')continue;
  const r=bank.slots[e.slot];if(!r)continue;
  if(e.kind==='paint'){const p=receiverPaintOps(r);next=withLog(next,e.slot,log=>appendOps(log,p.ops,p.pen));}
  else next=withLog(next,e.slot,log=>appendOps(log,receiverAnnotationOps(r),log.pen));
 }
 return next;
}
const blockedByBox=(s:RadioReceiverSession,action:ReceiverAction)=>s.closeBox!==null?webRefused(s,action,'close-box-open'):null;

/** Seed edit: only while no receiver exists (the seed of an open session is locked). A change restarts the count. */
export function editReceiverSeed(s:RadioReceiverSession,text:string):ReceiverSessionTransition{
 if(receiverSessionOpen(s))return webRefused(s,'seed','seed-locked');
 const t=typeof text==='string'?text.slice(0,32):'';
 if(t===s.seed.text)return keep(s,{kind:'ok',action:'seed',events:[]});
 return Object.freeze({session:Object.freeze({...s,seed:seedOf(t,0)}),outcome:Object.freeze({kind:'ok',action:'seed',events:Object.freeze([])}),changed:true});
}

/** Rcvr1Btn 0x567958 (FormCreate when the main slot is empty, then the picker with limit 2), then Show → FormActivate
 * [I] in one transition (WEB-RX-ACT-01). WEB-RX-CAT-01: a learner-loaded catalog is required. */
export function openReceiverWindow(s:RadioReceiverSession,input:ReceiverSourceNow):ReceiverSessionTransition{
 const box=blockedByBox(s,'open');if(box)return box;
 if(input.catalog===null)return webRefused(s,'open','no-catalog');
 const created=s.bank.slots[0]===null;
 if(created&&s.seed.base===null)return webRefused(s,'open','seed-invalid');
 const opened=openMainReceiver(s.bank,{catalog:input.catalog,pointing:input.pointing,createSeed:created?nextReceiverSeed(s):undefined});
 if(!opened.ok)return refused(s,'open',opened.error);
 const active=activateReceiver(opened.bank,0);
 if(!active.ok)return refused(s,'open',active.error);
 const canvases=created?Object.freeze([EMPTY_LOG,null,null]) as Canvases:s.canvases;
 return commit(s,'open',Object.freeze([...opened.events,...active.events]),active.bank,{canvases,tickError:created?null:s.tickError});
}

/** Add Channel 0x574e90, then Show → FormActivate of the new child [I]; add-nothing creates no child form. */
export function addReceiverWindow(s:RadioReceiverSession):ReceiverSessionTransition{
 const box=blockedByBox(s,'add');if(box)return box;
 const added=addReceiverChannel(s.bank,{createSeed:nextReceiverSeed(s)});
 if(!added.ok)return refused(s,'add',added.error);
 const slot=[1,2].find(i=>s.bank.slots[i]===null&&added.bank.slots[i]!==null);
 if(slot===undefined)return commit(s,'add',added.events,added.bank);
 const active=activateReceiver(added.bank,slot);
 if(!active.ok)return refused(s,'add',active.error);
 const canvases=[...s.canvases] as [ReceiverCanvasLog|null,ReceiverCanvasLog|null,ReceiverCanvasLog|null];canvases[slot]=EMPTY_LOG;
 return commit(s,'add',Object.freeze([...added.events,...active.events]),active.bank,{canvases:Object.freeze(canvases) as Canvases});
}

/** Mode 0x5745f8. The first profile allocation takes the next session seed (0x562ba0). */
export function toggleReceiverMode(s:RadioReceiverSession,input:ReceiverClockNow):ReceiverSessionTransition{
 const box=blockedByBox(s,'mode');if(box)return box;
 const allocateSeed=s.bank.profile?.allocated===false?nextReceiverSeed(s):undefined;
 const r=toggleReceive(s.bank,{jd:input.jd,now:input.now,allocateSeed});
 if(!r.ok)return refused(s,'mode',r.error);
 return commit(s,'mode',r.events,r.bank,{canvases:drawEvents(s.canvases,r.bank,r.events)});
}

/** Timer 0x574ad4 delivery: frames are drawn in order on their slots' logs. A refusal keeps the bank and is held as the
 * persistent tick error (repeated equal refusals change nothing). Gated or disabled ticks change nothing, including a
 * stored tick error: only a successful delivery or closing the main window clears it. */
export function tickReceivers(s:RadioReceiverSession,input:ReceiverClockNow):ReceiverSessionTransition{
 const r=receiverTimerTick(s.bank,input);
 if(!r.ok){
  const same=s.tickError!==null&&s.tickError.kind===r.error.kind&&s.tickError.detail===r.error.detail;
  if(same)return refused(s,'tick',r.error);
  return Object.freeze({session:Object.freeze({...s,tickError:r.error}),outcome:Object.freeze({kind:'refused',action:'tick',error:r.error}),changed:true});
 }
 if(r.frames.length===0&&r.events.every(e=>e.kind==='timer-gated'||e.kind==='timer-disabled'))
  return keep(s,{kind:'ok',action:'tick',events:r.events});
 let canvases=s.canvases;
 for(const f of r.frames)canvases=withLog(canvases,f.slot,log=>{const d=receiverFrameOps(f,log.pen);return appendOps(log,d.ops,d.pen);});
 return commit(s,'tick',r.events,r.bank,{canvases,tickError:null});
}

/** ClocktimerTimer reassociation 0x565715..0x5657cb after a completed RA-13 tick (WEB-RX-CLK-01). */
export function reassociateReceivers(s:RadioReceiverSession,input:ReceiverSourceNow):ReceiverSessionTransition{
 if(!receiverSessionOpen(s))return keep(s,{kind:'ok',action:'reassociate',events:[]});
 const r=reassociateReceiverOnClock(s.bank,input);
 if(!r.ok)return refused(s,'reassociate',r.error);
 return commit(s,'reassociate',r.events,r.bank);
}

/** Freq MHz, Freq Incr., Vert. Gain and Horz. Secs spin buttons. */
export function stepReceiver(s:RadioReceiverSession,slot:number,control:RadioReceiverControl,direction:'down'|'up'):ReceiverSessionTransition{
 const box=blockedByBox(s,'step');if(box)return box;
 const step=control==='frequency'?stepFrequency:control==='frequency-step'?stepFrequencyIncrement:control==='vertical'?stepVertical:stepHorizontal;
 const r:RadioReceiverResult=step(s.bank,slot,direction);
 if(!r.ok)return refused(s,'step',r.error);
 return commit(s,'step',r.events,r.bank,{canvases:drawEvents(s.canvases,r.bank,r.events)});
}

/** Paint at canvas mount (WEB-RX-PAINT-01). */
export function paintReceiverWindow(s:RadioReceiverSession,slot:number):ReceiverSessionTransition{
 if(s.canvases[slot]==null)return keep(s,{kind:'ok',action:'paint',events:[]});
 const r=paintReceiver(s.bank,slot);
 if(!r.ok)return refused(s,'paint',r.error);
 return commit(s,'paint',r.events,r.bank,{canvases:drawEvents(s.canvases,r.bank,r.events)});
}

/** System close of a receiver window: FormCloseQuery 0x5727e8 refuses slot 1 while slot 2 exists with the recovered box
 * (MB_ICONINFORMATION | MB_OK); otherwise FormClose 0x5726f0 and the closed windows' logs are dropped. */
export function requestReceiverClose(s:RadioReceiverSession,slot:number):ReceiverSessionTransition{
 const box=blockedByBox(s,'close');if(box)return box;
 const q=queryCloseReceiver(s.bank,slot);
 if(!q.canClose)return Object.freeze({session:Object.freeze({...s,closeBox:Object.freeze({slot:1,text:q.text,caption:q.caption})}),
  outcome:Object.freeze({kind:'ok',action:'close',events:Object.freeze([])}),changed:true});
 const r=closeReceiver(s.bank,slot);
 if(!r.ok)return refused(s,'close',r.error);
 const canvases=Object.freeze(s.canvases.map((log,i)=>r.bank.slots[i]?log:null)) as Canvases;
 return commit(s,'close',r.events,r.bank,{canvases,tickError:r.bank.slots[0]===null?null:s.tickError});
}
export function dismissReceiverCloseBox(s:RadioReceiverSession):ReceiverSessionTransition{
 if(s.closeBox===null)return keep(s,{kind:'ok',action:'dismiss-box',events:[]});
 return Object.freeze({session:Object.freeze({...s,closeBox:null}),outcome:Object.freeze({kind:'ok',action:'dismiss-box',events:Object.freeze([])}),changed:true});
}

export type ReceiverControlName='frequency'|'frequency-step'|'vertical'|'horizontal'|'add'|'mode'|'align'|'record'|'close';
export type ReceiverControlState='enabled'|'disabled'|'not-ported'|'absent';
/** RC-REC-09 in monitor mode. Main: Freq/Incr/Vert/Close always; Horz while the timer is off; Add while its own enable
 * holds and the timer is off; Mode unless a stop is pending with the timer on; Align/Record not ported. Children:
 * Freq/Incr/Vert/Close only (FormCreate hides HorzSpin, Mode, Add, Align and Record). */
export function receiverControlAvailability(s:RadioReceiverSession,slot:number):Readonly<Record<ReceiverControlName,ReceiverControlState>>{
 const r=s.bank.slots[slot],on=(v:boolean):ReceiverControlState=>v?'enabled':'disabled';
 const all=(v:ReceiverControlState)=>({frequency:v,'frequency-step':v,vertical:v,horizontal:v,add:v,mode:v,align:v,record:v,close:v});
 if(!r)return Object.freeze(all('absent'));
 if(r.index!==0)return Object.freeze({...all('absent'),frequency:'enabled','frequency-step':'enabled',vertical:'enabled',close:'enabled'});
 const timer=s.bank.timerEnabled;
 return Object.freeze({frequency:'enabled','frequency-step':'enabled',vertical:'enabled',horizontal:on(!timer),add:on(r.addEnabled&&!timer),
  mode:on(!(r.stopPending===true&&timer)),align:'not-ported',record:'not-ported',close:'enabled'});
}

/** A completed RA-13 ClocktimerTimer tick of the antenna (also the one a manual E/W release chains). */
export const completedRadioClockTick=(tr:RadioLabTransition)=>tr.changed&&tr.steps.includes('RA-13');
