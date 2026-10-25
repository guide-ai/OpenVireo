// WEB session of the silent receiver monitor (R-RX2): the receiver bank, the seed policy WEB-RX-SEED-01, one bounded
// canvas op log per window (pen and ops; the drawing state of the presentation, WEB-RX-PAINT-01/02), the persistent tick
// refusal (WEB-RX-ERR-01) and the recovered close-refusal box. Pure TypeScript: no React, DOM, host clock, RNG, audio or
// storage; the caller supplies JD (radio clock scenario) and `now` (a monotonic day scalar, WEB-RX-TIME-01). Nothing here
// is saved or restored (WEB-RX-PERSIST-01). See docs/RADIO-RECEIVER-MONITOR.md.
// R-RX3 (docs/RADIO-RECEIVER-MARKS.md): one pointer lease across the bank (WEB-MARK-INPUT/CANCEL), one mark overlay per
// window composed from the mark events (WEB-MARK-RENDER), keyboard placement/steps (WEB-MARK-KEYBOARD) and Clear.
// R-RX4 (docs/RADIO-RECEIVER-RECORD.md): the Record prompts (RC-REC-03), the finish dialogs (RC-REC-08) and the host
// requests (lease, phase, commit, release, open analysis) that the presentation applies to the shared current dataset.
// R-RX5 (docs/RADIO-RECEIVER-ALIGN.md): the Align toggle, the web card order of the windows (radioReceiverArrangement,
// reconciled at every commit from the bank's window-placed events) and the Move up/down controls that deliver message 3.
import type {RadioLabTransition,RadioPointing} from './radioAntenna';
import type {PulsarCatalog} from './radioPulsarCatalog';
import {
 RADIO_RECEIVER_COMPILED_OPTIONS,activateReceiver,addReceiverChannel,armRecordCapture,clearReceiverMarks,clearRecordByte,closeReceiver,createRadioReceiverBank,endReceiverMarkDrag,
 openMainReceiver,overwriteSourceBufferFromPulsarList,paintReceiver,queryCloseReceiver,reassociateReceiverOnClock,receiverMarkDown,receiverMarkMove,receiverMarkUp,receiverTimerTick,refreshRecordLabel,stepFrequency,
 receiverWindowMoved,stepFrequencyIncrement,stepHorizontal,stepVertical,toggleReceive,toggleReceiverAlign,toggleRecordByte,
 type RadioReceiverBank,type RadioReceiverControl,type RadioReceiverError,type RadioReceiverEvent,type RadioReceiverResult,type RadioRecordHeader,
} from './radioReceiver';
import {RADIO_IDENTIFY_POLICY,radioIdentifyIssue,type RadioRecordCapture} from './radioReceiverRecord';
import {RECEIVER_DISPLAY_GEOMETRY,receiverAnnotationOps,receiverFrameOps,receiverPaintOps,type ReceiverDisplayOp,type ReceiverPen} from './radioReceiverDisplay';
import {EMPTY_RECEIVER_MARK_OVERLAY,isReceiverMarkColumn,overlayWithLabel,overlayWithLine,type ReceiverMarkOverlay,type ReceiverMarkSelector} from './radioReceiverMarks';
import {parseReceiverMarkPosition,type ReceiverMarkButton} from './radioReceiverMarkInput';
import {
 EMPTY_RECEIVER_ARRANGEMENT,moveReceiverWindowOrder,receiverArrangementAfter,type ReceiverArrangement,type ReceiverMoveDirection,type ReceiverWindowSlot,
} from './radioReceiverArrangement';

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
/** WEB-MARK-INPUT: the single active mark gesture of the bank. pointerId/pointerType/button identify the browser pointer;
 * slot is the origin window, code the mark (0 first, 1 second); lastX the last column delivered to the core. */
export type ReceiverMarkLease=Readonly<{pointerId:number;pointerType:string;button:ReceiverMarkButton;slot:0|1|2;code:ReceiverMarkSelector;lastX:number}>;
export type ReceiverMarkOverlays=readonly [ReceiverMarkOverlay|null,ReceiverMarkOverlay|null,ReceiverMarkOverlay|null];
export type RadioReceiverSession=Readonly<{
 bank:RadioReceiverBank;
 seed:ReceiverSeed;
 canvases:readonly [ReceiverCanvasLog|null,ReceiverCanvasLog|null,ReceiverCanvasLog|null];
 /** Persistent coupling/tick refusal: the timer keeps retrying; Close of the main recovers (WEB-RX-ERR-01). */
 tickError:RadioReceiverError|null;
 closeBox:ReceiverCloseBox|null;
 /** R-RX3 active mark gesture (null: none). Never coexists with the main timer. */
 markLease:ReceiverMarkLease|null;
 /** R-RX3 mark overlay per window (null: no window), separate from the base canvas logs. */
 markOverlays:ReceiverMarkOverlays;
 /** R-RX4 Record prompts, finish dialogs and the capture lease this session holds. */
 record:ReceiverRecordState;
 /** R-RX5 WEB card order of the open windows (WEB-RX-ALIGN-ARR-01); page lifetime only. */
 arrangement:ReceiverArrangement;
}>;
/** RC-REC-03 prompts. unsaved: 0x575958 (flags 0x13); erase: 0x575a08 (flags 0x41). generation: the current dataset's
 * generation when the Record press was taken; the erase OK is refused when it changed (WEB-REC-TXN). */
export type ReceiverRecordPrompt=Readonly<{kind:'unsaved'|'erase';generation:number}>;
/** RC-REC-08 finish stages in order: 'full' (only when +0x98), 'identify', 'properties' (modal), 'save'. The capture is
 * committed to the current dataset when Identify closes (committed: true from 'properties' on); the session keeps its lease
 * (WEB 'committed' phase) until the Save answer releases it. */
export type ReceiverRecordFinish=Readonly<{stage:'full'|'identify'|'properties'|'save';capture:RadioRecordCapture;draft:string;name:string;committed:boolean}>;
export type ReceiverRecordState=Readonly<{prompt:ReceiverRecordPrompt|null;finish:ReceiverRecordFinish|null;
 /** The lease this session holds on the current dataset, or null. receiving: Receive started under it. */
 leaseId:number|null;receiving:boolean;nextId:number}>;
/** The current dataset as the Record press sees it (WEB-REC-TXN). */
export type ReceiverRecordHostSnapshot=Readonly<{generation:number;rows:number;saved:boolean;analysisBusy:boolean;leaseHeld:boolean}>;
/** Requests the presentation applies to the shared current dataset, in order. 'acquire' needs completeRecordArming. */
export type ReceiverRecordHostRequest=Readonly<
 |{kind:'acquire';id:number;generation:number;erase:boolean}
 |{kind:'release';id:number}
 |{kind:'phase';id:number;phase:'receiving'|'finishing'}
 |{kind:'commit';id:number;capture:RadioRecordCapture;name:string}
 |{kind:'open-analysis'}>;
export type ReceiverRecordArmingResult=Readonly<{ok:true;seed:RadioRecordHeader}|{ok:false;reason:'capture-lease'|'superseded'|'analysis-busy'|'lease-mismatch'}>;
export type ReceiverAction='seed'|'open'|'add'|'mode'|'tick'|'reassociate'|'step'|'paint'|'close'|'dismiss-box'
 |'mark-down'|'mark-move'|'mark-up'|'mark-end'|'mark-place'|'mark-step'|'mark-clear'
 |'record'|'record-prompt'|'record-arming'|'record-full'|'record-identify'|'record-draft'|'record-properties'|'record-save'
 |'align'|'move'|'pulsar-list';
export type ReceiverWebRefusal='seed-invalid'|'seed-locked'|'no-catalog'|'close-box-open'
 |'mark-lease-held'|'mark-input'|'mark-position-invalid'|'mark-unset'|'mark-bound'
 |'record-dialog-open'|'record-locked'|'record-analysis-busy'|'record-lease-held'|'record-superseded'|'record-input'|'identify-length'|'identify-text'
 |'window-edge'|'window-input';
export type ReceiverSessionOutcome=Readonly<
 |{kind:'ok';action:ReceiverAction;events:readonly RadioReceiverEvent[]}
 |{kind:'refused';action:ReceiverAction;error:RadioReceiverError}
 |{kind:'web-refused';action:ReceiverAction;reason:ReceiverWebRefusal}>;
/** host: R-RX4 requests for the shared current dataset (absent: none). */
export type ReceiverSessionTransition=Readonly<{session:RadioReceiverSession;outcome:ReceiverSessionOutcome;changed:boolean;host?:readonly ReceiverRecordHostRequest[]}>;
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
const INITIAL_RECORD_STATE:ReceiverRecordState=Object.freeze({prompt:null,finish:null,leaseId:null,receiving:false,nextId:1});

export function createRadioReceiverSession():RadioReceiverSession{
 const created=createRadioReceiverBank(RADIO_RECEIVER_COMPILED_OPTIONS);
 if(!created.ok)throw new Error('compiled receiver options refused');
 return Object.freeze({bank:created.bank,seed:seedOf(RADIO_RECEIVER_SESSION_POLICY.defaultSeedText,0),canvases:Object.freeze([null,null,null]) as Canvases,tickError:null,closeBox:null,
  markLease:null,markOverlays:Object.freeze([null,null,null]) as ReceiverMarkOverlays,record:INITIAL_RECORD_STATE,arrangement:EMPTY_RECEIVER_ARRANGEMENT});
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
/** Mark overlays after a transition's events, in order: paint → empty (its fill covers everything), mark-line stored → the
 * visible line (collision/timer: unchanged), mark-label → that label. Base canvas logs are not involved. */
function overlayEvents(o:ReceiverMarkOverlays,events:readonly RadioReceiverEvent[]):ReceiverMarkOverlays{
 let next=o;
 const set=(slot:number,f:(x:ReceiverMarkOverlay)=>ReceiverMarkOverlay)=>{
  const cur=next[slot];if(!cur)return;const v=f(cur);if(v===cur)return;
  const a=[...next] as [ReceiverMarkOverlay|null,ReceiverMarkOverlay|null,ReceiverMarkOverlay|null];a[slot]=v;next=Object.freeze(a) as ReceiverMarkOverlays;
 };
 for(const e of events){
  if(e.kind==='paint')set(e.slot,()=>EMPTY_RECEIVER_MARK_OVERLAY);
  else if(e.kind==='mark-line'&&e.outcome==='stored')set(e.slot,x=>overlayWithLine(x,e.selector,e.x));
  else if(e.kind==='mark-label')set(e.slot,x=>overlayWithLabel(x,e.selector,{x:e.x,text:e.text}));
 }
 return next;
}
type CommitPatch=Partial<Pick<RadioReceiverSession,'canvases'|'tickError'|'closeBox'|'markLease'|'markOverlays'|'record'|'arrangement'>>;
/** R-RX4 bookkeeping of a transition's record events: a FormCreate disarm releases the lease; the Receive header moves it to
 * 'receiving'; the finish opens the dialogs on the capture taken from the bank (no append follows a finish); a main close
 * commits a capture whose Receive had started (WEB partial commit, no dialogs), then releases the lease once. */
function recordFromEvents(r:ReceiverRecordState,bank:RadioReceiverBank,events:readonly RadioReceiverEvent[]){
 let record=r;const host:ReceiverRecordHostRequest[]=[];
 const capture=(id:number,full:boolean):RadioRecordCapture|null=>bank.recording.header?Object.freeze({captureId:id,header:bank.recording.header,rows:bank.recording.rows,full}):null;
 for(const e of events){
  const id=record.leaseId;if(id===null)continue;
  if(e.kind==='record-disarmed'){host.push({kind:'release',id});record={...record,leaseId:null,receiving:false};}
  else if(e.kind==='record-header'){host.push({kind:'phase',id,phase:'receiving'});record={...record,receiving:true};}
  else if(e.kind==='record-finished'){
   const c=capture(id,e.full);if(!c)continue;
   const name=c.header.name??'';
   host.push({kind:'phase',id,phase:'finishing'});
   record={...record,receiving:false,finish:Object.freeze({stage:e.full?'full':'identify',capture:c,draft:name,name,committed:false})};
  }else if(e.kind==='record-orphaned'){
   const c=record.receiving?capture(id,bank.recording.full):null;
   if(c)host.push({kind:'commit',id,capture:c,name:c.header.name??''});
   host.push({kind:'release',id});
   record={...record,leaseId:null,receiving:false};
  }
 }
 return {record:record===r?r:Object.freeze(record),host};
}
function commit(s:RadioReceiverSession,action:ReceiverAction,events:readonly RadioReceiverEvent[],bank:RadioReceiverBank,patch:CommitPatch={},extraHost:readonly ReceiverRecordHostRequest[]=[]):ReceiverSessionTransition{
 const used=s.seed.used+randomizeCount(s.bank,bank);
 const markOverlays=overlayEvents(patch.markOverlays??s.markOverlays,events);
 const rec=recordFromEvents(patch.record??s.record,bank,events),host=[...extraHost,...rec.host];
 // R-RX5: every committed transition reconciles the card order with the open windows and its window-placed events.
 const arrangement=receiverArrangementAfter(patch.arrangement??s.arrangement,bank.slots,events);
 const session:RadioReceiverSession=Object.freeze({...s,bank,seed:used===s.seed.used?s.seed:seedOf(s.seed.text,used),...patch,markOverlays,record:rec.record,arrangement});
 return Object.freeze({session,outcome:Object.freeze({kind:'ok',action,events}),changed:true,...(host.length?{host:Object.freeze(host.map(h=>Object.freeze(h)))}:{})});
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
/** Draws the paint and annotation events of a transition on the slots' logs, from the resulting state, or for a paint event
 * that carries it, from the receiver as that Paint drew it (Clear Paints several receivers in one transition). */
function drawEvents(c:Canvases,bank:RadioReceiverBank,events:readonly RadioReceiverEvent[]):Canvases{
 let next=c;
 for(const e of events){
  if(e.kind!=='paint'&&e.kind!=='annotation')continue;
  const r=e.kind==='paint'&&e.painted?e.painted:bank.slots[e.slot];if(!r)continue;
  if(e.kind==='paint'){const p=receiverPaintOps(r);next=withLog(next,e.slot,log=>appendOps(log,p.ops,p.pen));}
  else next=withLog(next,e.slot,log=>appendOps(log,receiverAnnotationOps(r),log.pen));
 }
 return next;
}
/** A recovered box or an R-RX4 Record prompt or finish dialog is modal over the windows. Read-only: the reason, or null. */
export const receiverBoxRefusal=(s:RadioReceiverSession):'close-box-open'|'record-dialog-open'|null=>
 s.closeBox!==null?'close-box-open':recordDialogOpen(s)?'record-dialog-open':null;
const blockedByBox=(s:RadioReceiverSession,action:ReceiverAction)=>{const reason=receiverBoxRefusal(s);return reason===null?null:webRefused(s,action,reason);};
export const recordDialogOpen=(s:RadioReceiverSession)=>s.record.prompt!==null||s.record.finish!==null;
/** WEB-MARK-CANCEL: the session without its lease; the origin's drag flag is cleared with no attempt, no rollback and no
 * invented final column. Used before Open/activate, Add, Mode, Close, keyboard placement and Clear. */
function withoutLease(s:RadioReceiverSession):RadioReceiverSession{
 const l=s.markLease;if(!l)return s;
 const r=s.bank.slots[l.slot]?endReceiverMarkDrag(s.bank,l.slot,l.code):null;
 return Object.freeze({...s,bank:r&&r.ok?r.bank:s.bank,markLease:null});
}
const withOverlay=(o:ReceiverMarkOverlays,slot:number,v:ReceiverMarkOverlay|null):ReceiverMarkOverlays=>{
 const a=[...o] as [ReceiverMarkOverlay|null,ReceiverMarkOverlay|null,ReceiverMarkOverlay|null];a[slot]=v;return Object.freeze(a) as ReceiverMarkOverlays;
};

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
 const b=withoutLease(s);
 const opened=openMainReceiver(b.bank,{catalog:input.catalog,pointing:input.pointing,createSeed:created?nextReceiverSeed(s):undefined});
 if(!opened.ok)return refused(s,'open',opened.error);
 const active=activateReceiver(opened.bank,0);
 if(!active.ok)return refused(s,'open',active.error);
 const canvases=created?Object.freeze([EMPTY_LOG,null,null]) as Canvases:s.canvases;
 const markOverlays=created?Object.freeze([EMPTY_RECEIVER_MARK_OVERLAY,null,null]) as ReceiverMarkOverlays:s.markOverlays;
 return commit(b,'open',Object.freeze([...opened.events,...active.events]),active.bank,{canvases,tickError:created?null:s.tickError,markOverlays});
}

/** Add Channel 0x574e90, then Show → FormActivate of the new child [I]; add-nothing creates no child form. */
export function addReceiverWindow(s:RadioReceiverSession):ReceiverSessionTransition{
 const box=blockedByBox(s,'add');if(box)return box;
 const b=withoutLease(s);
 const added=addReceiverChannel(b.bank,{createSeed:nextReceiverSeed(s)});
 if(!added.ok)return refused(s,'add',added.error);
 const slot=[1,2].find(i=>s.bank.slots[i]===null&&added.bank.slots[i]!==null);
 if(slot===undefined)return commit(b,'add',added.events,added.bank);
 const active=activateReceiver(added.bank,slot);
 if(!active.ok)return refused(s,'add',active.error);
 const canvases=[...s.canvases] as [ReceiverCanvasLog|null,ReceiverCanvasLog|null,ReceiverCanvasLog|null];canvases[slot]=EMPTY_LOG;
 return commit(b,'add',Object.freeze([...added.events,...active.events]),active.bank,{canvases:Object.freeze(canvases) as Canvases,
  markOverlays:withOverlay(s.markOverlays,slot,EMPTY_RECEIVER_MARK_OVERLAY)});
}

/** Mode 0x5745f8. The first profile allocation takes the next session seed (0x562ba0). A mark lease (only possible while
 * the timer is off, so before a start) ends first; a refused Mode leaves the session, lease included, untouched. */
export function toggleReceiverMode(s:RadioReceiverSession,input:ReceiverClockNow):ReceiverSessionTransition{
 const box=blockedByBox(s,'mode');if(box)return box;
 const allocateSeed=s.bank.profile?.allocated===false?nextReceiverSeed(s):undefined;
 const b=withoutLease(s);
 const r=toggleReceive(b.bank,{jd:input.jd,now:input.now,allocateSeed});
 if(!r.ok)return refused(s,'mode',r.error);
 return commit(b,'mode',r.events,r.bank,{canvases:drawEvents(s.canvases,r.bank,r.events)});
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

/**
 * WEB-PP-LIST-03 modelled TRadioLab.PulsarList1Click 0x567f80, delivered by File ▸ Pulsar List... (WEB-PP-LIST-04, through
 * preparePulsarListCommand in radioPulsarListCommand.ts) under the R-RX7 menu history; the native item's classroom
 * availability stays unproven (G9), and the reference Pulsar Parameters Open only reads the buffer.
 * The existing overwriteSourceBufferFromPulsarList (picker limit 2): a hit copies the record into +0x5f7, a miss clears its
 * J2000 name. No receiver field, pointer, offset, refresh, paint, title, trace, mark or lease, Record byte, arrangement or
 * seed changes, and the persistent tick error stays; a later tick may then run the existing name coupling. Admitted with or
 * without receivers and while receiving, armed, capturing or with a stop pending; the close box and the Record prompts and
 * finish dialogs refuse it atomically (they are modal over the windows). A mark lease is not ended (no withoutLease).
 */
export function overwriteReceiverSourceBuffer(s:RadioReceiverSession,input:ReceiverSourceNow):ReceiverSessionTransition{
 const box=blockedByBox(s,'pulsar-list');if(box)return box;
 if(input.catalog===null)return webRefused(s,'pulsar-list','no-catalog');
 const r=overwriteSourceBufferFromPulsarList(s.bank,input);
 if(!r.ok)return refused(s,'pulsar-list',r.error);
 return commit(s,'pulsar-list',r.events,r.bank);
}

/** Freq MHz, Freq Incr., Vert. Gain and Horz. Secs spin buttons. */
export function stepReceiver(s:RadioReceiverSession,slot:number,control:RadioReceiverControl,direction:'down'|'up'):ReceiverSessionTransition{
 const box=blockedByBox(s,'step');if(box)return box;
 if(control!=='horizontal'&&recordLocked(s))return webRefused(s,'step','record-locked');
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
 const b=withoutLease(s);
 if(!q.canClose)return Object.freeze({session:Object.freeze({...b,closeBox:Object.freeze({slot:1,text:q.text,caption:q.caption})}),
  outcome:Object.freeze({kind:'ok',action:'close',events:Object.freeze([])}),changed:true});
 const r=closeReceiver(b.bank,slot);
 if(!r.ok)return refused(s,'close',r.error);
 const canvases=Object.freeze(s.canvases.map((log,i)=>r.bank.slots[i]?log:null)) as Canvases;
 const markOverlays=Object.freeze(s.markOverlays.map((o,i)=>r.bank.slots[i]?o:null)) as ReceiverMarkOverlays;
 return commit(b,'close',r.events,r.bank,{canvases,tickError:r.bank.slots[0]===null?null:s.tickError,markOverlays});
}
export function dismissReceiverCloseBox(s:RadioReceiverSession):ReceiverSessionTransition{
 if(s.closeBox===null)return keep(s,{kind:'ok',action:'dismiss-box',events:[]});
 return Object.freeze({session:Object.freeze({...s,closeBox:null}),outcome:Object.freeze({kind:'ok',action:'dismiss-box',events:Object.freeze([])}),changed:true});
}

export type ReceiverControlName='frequency'|'frequency-step'|'vertical'|'horizontal'|'add'|'mode'|'align'|'record'|'close';
export type ReceiverControlState='enabled'|'disabled'|'not-ported'|'absent';
/** RC-REC-09: the receiving helper 0x575c6c disables Vert/Freq/Incr on the main and the children only when 0x5bce28 is set;
 * the finish's idle helper 0x575a38 enables them again. */
const recordLocked=(s:RadioReceiverSession)=>s.bank.timerEnabled&&s.bank.recording.armed;
/** RC-REC-09. Main: Freq/Incr/Vert while not receiving armed; Horz while the timer is off; Add while its own enable holds
 * and the timer is off; Mode unless a stop is pending with the timer on; Record while the timer is off (Receive disables it,
 * the finish enables it); Close always; Align always (R-RX5: the receiving helper 0x575c6c does not touch it). Children:
 * Freq/Incr/Vert (same record lock) and Close only (FormCreate hides HorzSpin, Mode, Add, Align and Record). */
export function receiverControlAvailability(s:RadioReceiverSession,slot:number):Readonly<Record<ReceiverControlName,ReceiverControlState>>{
 const r=s.bank.slots[slot],on=(v:boolean):ReceiverControlState=>v?'enabled':'disabled';
 const all=(v:ReceiverControlState)=>({frequency:v,'frequency-step':v,vertical:v,horizontal:v,add:v,mode:v,align:v,record:v,close:v});
 if(!r)return Object.freeze(all('absent'));
 const free=on(!recordLocked(s));
 if(r.index!==0)return Object.freeze({...all('absent'),frequency:free,'frequency-step':free,vertical:free,close:'enabled'});
 const timer=s.bank.timerEnabled;
 return Object.freeze({frequency:free,'frequency-step':free,vertical:free,horizontal:on(!timer),add:on(r.addEnabled&&!timer),
  mode:on(!(r.stopPending===true&&timer)),align:'enabled',record:on(!timer),close:'enabled'});
}

// ---------------------------------------------------------------- R-RX5 Align and window order
/**
 * Align button 0x575034 on the main (AL-TOGGLE). Modal boxes block it; any mark lease ends first (WEB-MARK-CANCEL, marks
 * kept); then the toggle, its refresh of the main and, when now on, the layout, whose window-placed events re-stack the
 * cards. Off moves nothing. No seed, clock, catalog, canvas log or record state is involved; a refusal leaves the session
 * (lease included) untouched.
 */
export function toggleReceiverAlignment(s:RadioReceiverSession):ReceiverSessionTransition{
 const box=blockedByBox(s,'align');if(box)return box;
 const b=withoutLease(s);
 const r=toggleReceiverAlign(b.bank);
 if(!r.ok)return refused(s,'align',r.error);
 return commit(b,'align',r.events,r.bank);
}
/**
 * WEB-RX-ALIGN-MOVE-01 Move up/down of one window card: the card swaps ranks with its neighbour (the pressed card is the one
 * moved form: one message-3 delivery, 0x57296c; the neighbour only follows the document flow). Under Align off the guard is
 * cleared and the new order stays; under Align on, with slot 1 open, the handler places 2 then 1 below the main again, so
 * the column re-stacks. Refused (session untouched) at a column edge ('window-edge') and for a bad slot or direction.
 */
export function moveReceiverWindow(s:RadioReceiverSession,slot:number,dir:ReceiverMoveDirection):ReceiverSessionTransition{
 const box=blockedByBox(s,'move');if(box)return box;
 const i=slotIndex(slot);
 if(i===null||!s.bank.slots[i]||(dir!=='up'&&dir!=='down'))return webRefused(s,'move','window-input');
 const swapped=moveReceiverWindowOrder(s.arrangement,i,dir);
 if(!swapped)return webRefused(s,'move','window-edge');
 const b=withoutLease(s);
 const r=receiverWindowMoved(b.bank,i);
 if(!r.ok)return refused(s,'move',r.error);
 return commit(b,'move',r.events,r.bank,{arrangement:swapped});
}
export type ReceiverWindowMoveState='enabled'|'edge'|'absent';
/** Move up/down of a window: 'edge' at the top/bottom of the column (also with a single window), 'absent' without it. Under
 * Align on a move is admitted and snaps back (the original's response to moving an aligned window). */
export function receiverWindowMoveAvailability(s:RadioReceiverSession,slot:number):Readonly<{up:ReceiverWindowMoveState;down:ReceiverWindowMoveState}>{
 const i=slotIndex(slot),rank=i===null||!s.bank.slots[i]?-1:s.arrangement.order.indexOf(i as ReceiverWindowSlot);
 if(rank<0)return Object.freeze({up:'absent',down:'absent'});
 return Object.freeze({up:rank===0?'edge':'enabled',down:rank===s.arrangement.order.length-1?'edge':'enabled'});
}

// ---------------------------------------------------------------- R-RX4 Record
const recordPatch=(s:RadioReceiverSession,next:Partial<ReceiverRecordState>):ReceiverRecordState=>Object.freeze({...s.record,...next});
/** The bank result as a committed transition (events drive the lease bookkeeping), or the refusal. */
function recordCommit(s:RadioReceiverSession,action:ReceiverAction,r:RadioReceiverResult,record:Partial<ReceiverRecordState>,host:readonly ReceiverRecordHostRequest[]=[]):ReceiverSessionTransition{
 if(!r.ok)return refused(s,action,r.error);
 return commit(s,action,r.events,r.bank,{record:recordPatch(s,record),canvases:drawEvents(s.canvases,r.bank,r.events)},host);
}
/**
 * Record button 0x57581c on the main (RC-REC-03). Arming (byte 0 → 1): the unsaved prompt when the current dataset has rows
 * and +0x97 = 0; otherwise the erase prompt when it has rows; otherwise the lease is requested at once. [W] Arming is refused
 * while the analysis window has a modal session or a pending read, or another lease is held (WEB-REC-TXN). Disarming
 * (1 → 0): the refresh shows 'Off' and the lease is released. [W] The native disarm also asks the erase question when the
 * list is non-empty; under the web lease the list is always empty while the byte is set, so that branch is not reached.
 */
export function pressRecord(s:RadioReceiverSession,snap:ReceiverRecordHostSnapshot):ReceiverSessionTransition{
 const box=blockedByBox(s,'record');if(box)return box;
 const wasArmed=s.bank.recording.armed;
 if(!wasArmed){
  if(snap.analysisBusy)return webRefused(s,'record','record-analysis-busy');
  if(snap.leaseHeld||s.record.leaseId!==null)return webRefused(s,'record','record-lease-held');
 }
 const b=withoutLease(s);
 const toggled=toggleRecordByte(b.bank);
 if(!toggled.ok)return refused(s,'record',toggled.error);
 if(wasArmed){
  const refreshed=refreshRecordLabel(toggled.bank);
  const id=s.record.leaseId;
  return recordCommit(b,'record',refreshed.ok?Object.freeze({...refreshed,events:[...toggled.events,...refreshed.events]}):refreshed,{receiving:false,leaseId:null},
   id===null?[]:[{kind:'release',id}]);
 }
 if(snap.rows>0)return recordCommit(b,'record',toggled,{prompt:Object.freeze({kind:snap.saved?'erase':'unsaved',generation:snap.generation})});
 return recordCommit(b,'record',toggled,{},[{kind:'acquire',id:s.record.nextId,generation:snap.generation,erase:false}]);
}
/**
 * Prompt answers. unsaved (0x13): 'cancel' (2) clears the byte and skips the refresh (0x5758ab → 0x57592c); 'no' (7) falls
 * through to the second check, which asks the erase question while the list is non-empty. [W] 'yes' (6, the Save wrapper
 * 0x56b36c) is not offered: its body is not recovered. erase (0x41): 'ok' (1) requests the clear and the lease for the
 * prompt's generation; 'cancel' clears the byte, then the refresh shows 'Off'.
 */
export function answerRecordPrompt(s:RadioReceiverSession,answer:'no'|'ok'|'cancel',snap:ReceiverRecordHostSnapshot):ReceiverSessionTransition{
 const p=s.record.prompt;
 if(!p||(p.kind==='unsaved'&&answer==='ok')||(p.kind==='erase'&&answer==='no'))return webRefused(s,'record-prompt','record-input');
 if(answer==='cancel')return recordCommit(s,'record-prompt',clearRecordByte(s.bank,p.kind==='erase'),{prompt:null});
 if(answer==='no'){
  if(snap.rows>0)return recordCommit(s,'record-prompt',ok0(s.bank),{prompt:Object.freeze({kind:'erase',generation:p.generation})});
  return recordCommit(s,'record-prompt',ok0(s.bank),{prompt:null},[{kind:'acquire',id:s.record.nextId,generation:p.generation,erase:false}]);
 }
 return recordCommit(s,'record-prompt',ok0(s.bank),{prompt:null},[{kind:'acquire',id:s.record.nextId,generation:p.generation,erase:true}]);
}
const ok0=(bank:RadioReceiverBank):RadioReceiverResult=>Object.freeze({ok:true,bank,events:Object.freeze([]),frames:Object.freeze([])});
/** The host's answer to an 'acquire': the scratch cells := 0.0, the capture starts with the dataset's header cells and the
 * refresh shows 'On' (0x57590e..0x575927); a refusal clears the byte and the refresh shows 'Off' (nothing was erased). */
export function completeRecordArming(s:RadioReceiverSession,result:ReceiverRecordArmingResult):ReceiverSessionTransition{
 if(!s.bank.recording.armed||s.record.leaseId!==null||recordDialogOpen(s))return webRefused(s,'record-arming','record-input');
 if(!result.ok){
  const r=clearRecordByte(s.bank,true);
  if(!r.ok)return refused(s,'record-arming',r.error);
  const reason:ReceiverWebRefusal=result.reason==='analysis-busy'?'record-analysis-busy':result.reason==='superseded'?'record-superseded':'record-lease-held';
  const t=commit(s,'record-arming',r.events,r.bank,{canvases:drawEvents(s.canvases,r.bank,r.events)});
  return Object.freeze({...t,outcome:Object.freeze({kind:'web-refused',action:'record-arming',reason})});
 }
 return recordCommit(s,'record-arming',armRecordCapture(s.bank,result.seed),{leaseId:s.record.nextId,receiving:false,nextId:s.record.nextId+1});
}
const finishStep=(s:RadioReceiverSession,action:ReceiverAction,finish:ReceiverRecordFinish|null,host:readonly ReceiverRecordHostRequest[]=[]):ReceiverSessionTransition=>
 commit(s,action,[],s.bank,{record:recordPatch(s,{finish})},host);
/** 'Data Buffer Filled' (flags 0x40) OK, then Identify. */
export function dismissRecordFull(s:RadioReceiverSession):ReceiverSessionTransition{
 const f=s.record.finish;if(f?.stage!=='full')return webRefused(s,'record-full','record-input');
 return finishStep(s,'record-full',Object.freeze({...f,stage:'identify'}));
}
/** EditStr draft (bounded; an invalid draft stays visible and is refused at OK). */
export function editRecordIdentify(s:RadioReceiverSession,text:string):ReceiverSessionTransition{
 const f=s.record.finish;if(f?.stage!=='identify'||typeof text!=='string'||text.length>RADIO_IDENTIFY_POLICY.draftLimit)return webRefused(s,'record-draft','record-input');
 if(text===f.draft)return keep(s,{kind:'ok',action:'record-draft',events:[]});
 return finishStep(s,'record-draft',Object.freeze({...f,draft:text}));
}
/** Identify (TStrIpDlg) result: OK (1) copies EditStr back as the name (OKBtnClick 0x525308, copy-back 0x573cc3..0x573cf3);
 * Cancel keeps the header name. Either way the capture is committed once (WEB buffered commit) and the modal Properties
 * (0x5b59d4, ShowModal) follow. The lease stays held (WEB-REC-TXN) until the Save answer. [W] An over-long or non-ASCII OK
 * is refused in the dialog. */
export function answerRecordIdentify(s:RadioReceiverSession,answer:'ok'|'cancel'):ReceiverSessionTransition{
 const f=s.record.finish;if(f?.stage!=='identify'||s.record.leaseId!==f.capture.captureId)return webRefused(s,'record-identify','record-input');
 let name=f.name;
 if(answer==='ok'){
  const issue=radioIdentifyIssue(f.draft);
  if(issue)return webRefused(s,'record-identify',issue==='length'?'identify-length':'identify-text');
  name=f.draft;
 }
 return commit(s,'record-identify',[],s.bank,{record:recordPatch(s,{finish:Object.freeze({...f,stage:'properties',name,committed:true})})},
  [{kind:'commit',id:f.capture.captureId,capture:f.capture,name}]);
}
/** The modal Properties closed: the Save question (flags 0x23). */
export function closeRecordProperties(s:RadioReceiverSession):ReceiverSessionTransition{
 const f=s.record.finish;if(f?.stage!=='properties')return webRefused(s,'record-properties','record-input');
 return finishStep(s,'record-properties',Object.freeze({...f,stage:'save'}));
}
/** Save question: 'no' (7) opens the analysis window (Show of [0x5b5d84], 0x573d75..0x573d8a); 'cancel' ends the finish
 * (the main+0x468 enable at 0x573d5b..0x573d6a is not ported). [W] 'yes' (6, 0x56b36c) is not offered (body not recovered).
 * WEB-REC-TXN: either answer ends the finish and releases the session's lease exactly once, before the analysis opens (so
 * its Load is enabled). The answer is never refused for a missing lease, so the dialog cannot trap the user. */
export function answerRecordSave(s:RadioReceiverSession,answer:'no'|'cancel'):ReceiverSessionTransition{
 const f=s.record.finish;if(f?.stage!=='save'||(answer!=='no'&&answer!=='cancel'))return webRefused(s,'record-save','record-input');
 const id=s.record.leaseId,host:ReceiverRecordHostRequest[]=id!==null&&id===f.capture.captureId?[{kind:'release',id}]:[];
 if(answer==='no')host.push({kind:'open-analysis'});
 return commit(s,'record-save',[],s.bank,{record:recordPatch(s,{finish:null,leaseId:id===f.capture.captureId?null:id})},host);
}

// ---------------------------------------------------------------- R-RX3 marks
export type ReceiverMarkAvailability='enabled'|'disabled'|'absent';
/** WEB-MARK-INPUT availability of a new mark gesture or keyboard placement in a window: disabled while the main Timer1 runs
 * (receiving or finishing a sweep after Stop), for every window; Clear has no timer gate (FormDblClick has none). */
export function receiverMarkAvailability(s:RadioReceiverSession,slot:number):ReceiverMarkAvailability{
 const r=Number.isInteger(slot)&&slot>=0&&slot<=2?s.bank.slots[slot]:null;
 return r===null?'absent':s.bank.timerEnabled?'disabled':'enabled';
}
const resultOrRefused=(s:RadioReceiverSession,action:ReceiverAction,r:RadioReceiverResult,patch:CommitPatch):ReceiverSessionTransition=>{
 if(!r.ok)return refused(s,action,r.error);
 if(r.bank===s.bank&&patch.markLease===undefined)return keep(s,{kind:'ok',action,events:r.events});
 return commit(s,action,r.events,r.bank,patch);
};
const slotIndex=(slot:number):0|1|2|null=>slot===0||slot===1||slot===2?slot:null;

export type ReceiverMarkPress=Readonly<{pointerId:number;pointerType:string;button:ReceiverMarkButton;slot:number;code:ReceiverMarkSelector;x:number}>;
/** Pointer press on a window's display: ignored while another gesture holds the lease (no steal); the column must be an
 * integer 0..400 (WEB-MARK-DOMAIN). While the main timer runs the core gate refuses (mark-gated, unchanged session).
 * Otherwise MouseDown with the code and the new lease. */
export function markPointerDown(s:RadioReceiverSession,p:ReceiverMarkPress):ReceiverSessionTransition{
 const box=blockedByBox(s,'mark-down');if(box)return box;
 if(s.markLease)return webRefused(s,'mark-down','mark-lease-held');
 const slot=slotIndex(p.slot);
 if(slot===null||!s.bank.slots[slot]||!Number.isInteger(p.pointerId)||(p.button!==0&&p.button!==2)||(p.code!==0&&p.code!==1)||!isReceiverMarkColumn(p.x))
  return webRefused(s,'mark-down','mark-input');
 const r=receiverMarkDown(s.bank,slot,p.code,p.x);
 if(!r.ok)return refused(s,'mark-down',r.error);
 if(r.bank===s.bank)return keep(s,{kind:'ok',action:'mark-down',events:r.events});
 return commit(s,'mark-down',r.events,r.bank,{markLease:Object.freeze({pointerId:p.pointerId,pointerType:String(p.pointerType),button:p.button,slot,code:p.code,lastX:p.x})});
}
/** Captured pointer movement: only the lease's own pointer; an unchanged column is not delivered again (a repeated attempt
 * at the same column changes nothing). MouseMove with the lease's shift bit (first: ssLeft, second: ssRight). */
export function markPointerMove(s:RadioReceiverSession,p:Readonly<{pointerId:number;x:number}>):ReceiverSessionTransition{
 const l=s.markLease;
 if(!l||l.pointerId!==p.pointerId||!isReceiverMarkColumn(p.x)||p.x===l.lastX)return keep(s,{kind:'ok',action:'mark-move',events:[]});
 const box=blockedByBox(s,'mark-move');if(box)return box;
 const r=receiverMarkMove(s.bank,l.slot,{left:l.code===0,right:l.code===1},p.x);
 return resultOrRefused(s,'mark-move',r,{markLease:Object.freeze({...l,lastX:p.x})});
}
/** Release of the lease's own pointer: MouseUp with its code at the final column, then the lease ends. Other pointers are
 * ignored. */
export function markPointerUp(s:RadioReceiverSession,p:Readonly<{pointerId:number;x:number}>):ReceiverSessionTransition{
 const l=s.markLease;
 if(!l||l.pointerId!==p.pointerId)return keep(s,{kind:'ok',action:'mark-up',events:[]});
 if(!isReceiverMarkColumn(p.x)||!s.bank.slots[l.slot])return endMarkGesture(s);
 const r=receiverMarkUp(s.bank,l.slot,l.code,p.x);
 if(!r.ok)return refused(s,'mark-up',r.error);
 return commit(s,'mark-up',r.events,r.bank,{markLease:null});
}
/** WEB-MARK-CANCEL end of the gesture (cancel, lost capture, Escape, focus loss, hidden page, route change, project
 * operation, modality, lifecycle): the drag flag is cleared with no attempt and the last accepted marks stay. Not gated by
 * the close box. */
export function endMarkGesture(s:RadioReceiverSession):ReceiverSessionTransition{
 if(!s.markLease)return keep(s,{kind:'ok',action:'mark-end',events:[]});
 const b=withoutLease(s);
 return commit(s,'mark-end',[],b.bank,{markLease:null});
}
/** Keyboard placement (WEB-MARK-KEYBOARD) of the selected mark: the text must be 1..3 digits with a value 0..400. Any lease
 * ends first; then MouseDown with code = selector and the end of its drag flag: one set of attempts, the same local or
 * broadcast order, collision and timer gate as a press. */
export function placeReceiverMark(s:RadioReceiverSession,slot:number,selector:ReceiverMarkSelector,text:string):ReceiverSessionTransition{
 const box=blockedByBox(s,'mark-place');if(box)return box;
 const x=parseReceiverMarkPosition(text);
 if(x===null)return webRefused(s,'mark-place','mark-position-invalid');
 return place(s,'mark-place',slot,selector,x);
}
function place(s:RadioReceiverSession,action:'mark-place'|'mark-step',slot:number,selector:ReceiverMarkSelector,x:number):ReceiverSessionTransition{
 const i=slotIndex(slot);
 if(i===null||!s.bank.slots[i]||(selector!==0&&selector!==1))return webRefused(s,action,'mark-input');
 const b=withoutLease(s);
 const down=receiverMarkDown(b.bank,i,selector,x);
 if(!down.ok)return refused(s,action,down.error);
 if(down.bank===b.bank)return b===s?keep(s,{kind:'ok',action,events:down.events}):commit(b,action,down.events,b.bank,{markLease:null});
 const end=endReceiverMarkDrag(down.bank,i,selector);
 if(!end.ok)return refused(s,action,end.error);
 return commit(b,action,down.events,end.bank,{markLease:null});
}
/** Arrow step ±1 of the selected mark from its stored column (after a placement only: unset refuses). A step beyond 0..400
 * makes no attempt. Otherwise as a placement at the new column. */
export function stepReceiverMark(s:RadioReceiverSession,slot:number,selector:ReceiverMarkSelector,delta:1|-1):ReceiverSessionTransition{
 const box=blockedByBox(s,'mark-step');if(box)return box;
 const i=slotIndex(slot),r=i===null?null:s.bank.slots[i];
 if(!r||(selector!==0&&selector!==1)||(delta!==1&&delta!==-1))return webRefused(s,'mark-step','mark-input');
 const stored=r.marks[selector];
 if(stored<0)return webRefused(s,'mark-step','mark-unset');
 if(s.bank.timerEnabled)return place(s,'mark-step',slot,selector,stored);// the core gate answers (mark-gated)
 const x=stored+delta;
 if(!isReceiverMarkColumn(x))return webRefused(s,'mark-step','mark-bound');
 return place(s,'mark-step',slot,selector,x);
}
/** Clear (FormDblClick 0x57546c, WEB-MARK-CLEAR): any lease ends first; every Paint of the transition is drawn on its
 * window's base log from the receiver as that Paint drew it; the overlays follow the events in order. */
export function clearReceiverNextMark(s:RadioReceiverSession,slot:number):ReceiverSessionTransition{
 const box=blockedByBox(s,'mark-clear');if(box)return box;
 const i=slotIndex(slot);
 if(i===null||!s.bank.slots[i])return webRefused(s,'mark-clear','mark-input');
 const b=withoutLease(s);
 const r=clearReceiverMarks(b.bank,i);
 if(!r.ok)return refused(s,'mark-clear',r.error);
 if(r.bank===b.bank&&b===s)return keep(s,{kind:'ok',action:'mark-clear',events:r.events});
 return commit(b,'mark-clear',r.events,r.bank,{canvases:drawEvents(s.canvases,r.bank,r.events),markLease:null});
}

/** A completed RA-13 ClocktimerTimer tick of the antenna (also the one a manual E/W release chains). */
export const completedRadioClockTick=(tr:RadioLabTransition)=>tr.changed&&tr.steps.includes('RA-13');
