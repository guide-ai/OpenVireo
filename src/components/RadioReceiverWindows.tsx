import {useEffect,useId,useLayoutEffect,useRef,useState,useSyncExternalStore,type KeyboardEvent,type MutableRefObject,type PointerEvent,type RefObject} from 'react';
import './RadioReceiverWindows.css';
import type {RadioLabTransition,RadioPointing} from '../core/radioAntenna';
import type {PulsarCatalog} from '../core/radioPulsarCatalog';
import type {RadioReceiver,RadioReceiverControl,RadioReceiverEvent} from '../core/radioReceiver';
import {
 RECEIVER_DFM_CAPTIONS,RECEIVER_DISPLAY_COLOURS,RECEIVER_DISPLAY_GEOMETRY,RECEIVER_DISPLAY_LITERALS,receiverCaption,receiverLabels,receiverPaintOps,
 type ReceiverDisplayOp,type ReceiverPen,
} from '../core/radioReceiverDisplay';
import {RECEIVER_MARK_LABEL_BACKGROUND,RECEIVER_MARK_WEB_POLICY,receiverMarkOverlayOps,type ReceiverMarkOverlay,type ReceiverMarkSelector} from '../core/radioReceiverMarks';
import {receiverMarkCode,receiverMarkColumn,receiverMarkMoveReleases,type ReceiverMarkButton} from '../core/radioReceiverMarkInput';
import {
 RADIO_RECEIVER_SESSION_POLICY,addReceiverWindow,clearReceiverNextMark,completedRadioClockTick,createRadioReceiverSession,dismissReceiverCloseBox,editReceiverSeed,
 endMarkGesture,markPointerDown,markPointerMove,markPointerUp,nextReceiverSeed,openReceiverWindow,paintReceiverWindow,placeReceiverMark,reassociateReceivers,
 receiverControlAvailability,receiverMarkAvailability,receiverSessionOpen,requestReceiverClose,stepReceiver,stepReceiverMark,tickReceivers,toggleReceiverMode,
 type RadioReceiverSession,type ReceiverCanvasLog,type ReceiverControlState,type ReceiverMarkAvailability,type ReceiverMarkLease,type ReceiverSessionOutcome,
 type ReceiverSessionTransition,
} from '../core/radioReceiverSession';
import {startRadioTimer,type RadioTimerHost} from '../core/radioTimer';
import {ignoreHeldKey,nativeModalOpen,noNativeModal,observeNativeModals,observeNothing,trapTab} from './radioModal';
import {t,type PlainMessageKey} from '../i18n';

/** Host access for the route: open from the panel's Receiver button, the antenna transitions (clock reassociation) and
 * the catalog lock. Set while the workspace is mounted. */
export type RadioReceiverApi=Readonly<{open:()=>void;antennaTransition:(tr:RadioLabTransition)=>void;hasReceivers:()=>boolean}>;
export type RadioReceiverSummary=Readonly<{hasReceivers:boolean;seedValid:boolean;boxPending:boolean;boxPresented:boolean}>;
export const INITIAL_RADIO_RECEIVER_SUMMARY:RadioReceiverSummary=Object.freeze({hasReceivers:false,seedValid:true,boxPending:false,boxPresented:false});

type Props=Readonly<{
 /** The route is shown. Hidden, the timer keeps running and the close box stays pending. */
 active:boolean;
 /** A project operation runs: the receiver timer is cancelled (no catch-up) and no box is presented. */
 busy:boolean;
 /** An antenna dialog/box, the date dialog or a presented Pulsar Parameters surface: the cards are behind it. */
 antennaModal:boolean;dateOpen:boolean;parametersPresented:boolean;
 /** Latest accepted reference catalog, antenna pointing and side-effect-free radio clock JD; read only in handlers and callbacks. */
 catalogNow:()=>PulsarCatalog|null;pointingNow:()=>RadioPointing;readClockJD:()=>number|null;
 /** Monotonic milliseconds (the route's perfNow). */
 perfNow:()=>number;
 apiRef:MutableRefObject<RadioReceiverApi|null>;
 receiverButtonRef:RefObject<HTMLButtonElement|null>;
 /** Called in the layout phase, only when the summary changes. */
 onSummaryChange:(summary:RadioReceiverSummary)=>void;
}>;

/** Browser interval host for the receiver Timer1 registration (WEB-RX-CAD-01). */
const BROWSER_TIMER:RadioTimerHost={setInterval:(callback,ms)=>window.setInterval(callback,ms),clearInterval:handle=>window.clearInterval(handle as number)};
const G=RECEIVER_DISPLAY_GEOMETRY,L=RECEIVER_DISPLAY_LITERALS,D=RECEIVER_DFM_CAPTIONS;
/** TColor (BGR) as CSS rgb [I]. */
const css=(c:number)=>`rgb(${c&0xff},${(c>>8)&0xff},${(c>>16)&0xff})`;
const canTakeFocus=(el:HTMLElement|null):el is HTMLElement=>
 !!el&&el.isConnected&&!(el as HTMLButtonElement).disabled&&el.getClientRects().length>0&&!el.closest('[inert]');
type FocusTarget=Readonly<{kind:'heading'|'after-child-close'|'after-main-close'|'close1';slot:number;serial:number}>;
type Notice=Readonly<{slot:number|null;outcome:ReceiverSessionOutcome}>;
const CONTROL_NAME:Readonly<Record<RadioReceiverControl,PlainMessageKey>>={
 frequency:'radioReceiver.control.frequency','frequency-step':'radioReceiver.control.step',vertical:'radioReceiver.control.vertical',horizontal:'radioReceiver.control.horizontal',
};

const MARK_NAME:readonly [PlainMessageKey,PlainMessageKey]=['radioReceiver.marks.first','radioReceiver.marks.second'];
/** Window numbers (slot + 1, as on the cards) of a list of slots. */
const windowList=(slots:readonly number[])=>slots.map(s=>String(s+1)).join(', ');
/** Status text of a mark transition: per-window line outcomes of one press/release/placement (a collision is named, the
 * stored mark is not replaced by the requested one), the Clear result, or the end of a gesture. Moves are not announced. */
function markOutcomeText(action:string,events:readonly RadioReceiverEvent[]):string{
 if(events.some(e=>e.kind==='mark-gated'))return t('radioReceiver.marks.status.gated');
 if(action==='mark-end')return t('radioReceiver.marks.status.ended');
 if(action==='mark-clear'){
  const cleared=events.flatMap(e=>e.kind==='mark-cleared'?[e]:[]);
  if(cleared.length===0)return t('radioReceiver.marks.status.clearNone');
  return cleared[0].selector===1?t('radioReceiver.marks.status.clearedSecond',{windows:windowList(cleared.map(e=>e.slot))}):t('radioReceiver.marks.status.clearedFirst');
 }
 const lines=events.flatMap(e=>e.kind==='mark-line'?[e]:[]);
 if(lines.length===0)return '';
 const mark=t(MARK_NAME[lines[0].selector]),x=lines[0].x;
 if(lines.some(e=>e.outcome==='timer'))return t('radioReceiver.marks.status.timer',{mark});
 const stored=lines.filter(e=>e.outcome==='stored').map(e=>e.slot),collided=lines.filter(e=>e.outcome==='collision').map(e=>e.slot);
 if(collided.length===0)return lines.length===1?t('radioReceiver.marks.status.placed',{mark,x}):t('radioReceiver.marks.status.placedAll',{mark,x,windows:windowList(stored)});
 if(stored.length===0)return t('radioReceiver.marks.status.collision',{mark,x,windows:windowList(collided)});
 return t('radioReceiver.marks.status.placedSome',{mark,x,stored:windowList(stored),collided:windowList(collided)});
}

/** The product text of a session outcome for the status line ('' when nothing is announced). */
function outcomeText(o:ReceiverSessionOutcome):string{
 if(o.kind==='refused')return t('radioReceiver.status.refused',{reason:t(`radioReceiver.error.${o.error.kind}`)});
 if(o.kind==='web-refused')return t(`radioReceiver.status.web.${o.reason}`);
 if(o.action.startsWith('mark-'))return markOutcomeText(o.action,o.events);
 const kinds=o.events.map(e=>e.kind);
 const limit=o.events.find(e=>e.kind==='at-limit');
 if(limit&&limit.kind==='at-limit')return t('radioReceiver.status.atLimit',{control:t(CONTROL_NAME[limit.control])});
 if(o.action==='open')return t('radioReceiver.status.opened');
 if(o.action==='add')return kinds.includes('add-nothing')?t('radioReceiver.status.addNothing'):t('radioReceiver.status.added');
 if(o.action==='mode')return kinds.includes('receive-started')?t('radioReceiver.status.receiving'):t('radioReceiver.status.stopRequested');
 if(o.action==='close'&&kinds.includes('closed'))return t('radioReceiver.status.closed');
 return '';
}

/**
 * WEB workspace of the silent receiver monitor (docs/RADIO-RECEIVER-MONITOR.md): TRcvr_Form1 main and up to two child
 * channels as cards, each with its logical 401 × 142 display. The session (radioReceiverSession) is pure; this component
 * holds it and the 40 ms timer so the 25 Hz updates re-render only this subtree. Every step runs on the latest accepted
 * session (sessionRef), as the route's stepDate does. Nothing is saved, restored or sent anywhere; no audio is produced.
 */
export function RadioReceiverWorkspace({active,busy,antennaModal,dateOpen,parametersPresented,catalogNow,pointingNow,readClockJD,perfNow,apiRef,receiverButtonRef,onSummaryChange}:Props){
 const id=useId();
 const [session,setSession]=useState<RadioReceiverSession>(createRadioReceiverSession);
 const sessionRef=useRef(session);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [focus,setFocus]=useState<FocusTarget|null>(null);
 const serial=useRef(0);
 const requestFocus=(kind:FocusTarget['kind'],slot:number)=>setFocus({kind,slot,serial:++serial.current});
 const latest=useRef({active,busy,catalogNow,pointingNow,readClockJD,perfNow});
 useLayoutEffect(()=>{latest.current={active,busy,catalogNow,pointingNow,readClockJD,perfNow};});
 const stepSession=(step:(s:RadioReceiverSession)=>ReceiverSessionTransition)=>{
  const result=step(sessionRef.current);if(result.changed){sessionRef.current=result.session;setSession(result.session);}return result;
 };
 /** User actions: only on the shown route outside a project operation. */
 const userAction=(slot:number|null,step:(s:RadioReceiverSession)=>ReceiverSessionTransition)=>{
  if(!latest.current.active||latest.current.busy)return null;
  const result=stepSession(step);setNotice({slot,outcome:result.outcome});return result;
 };
 const clockNow=()=>({jd:latest.current.readClockJD(),now:latest.current.perfNow()/RADIO_RECEIVER_SESSION_POLICY.msPerDay});

 // ---- Host API (the panel's Receiver button and the antenna transitions).
 const open=()=>{
  const r=userAction(null,s=>openReceiverWindow(s,{catalog:latest.current.catalogNow(),pointing:latest.current.pointingNow()}));
  if(r?.outcome.kind==='ok'){setNotice({slot:0,outcome:r.outcome});requestFocus('heading',0);}
 };
 /** WEB-RX-CLK-01: a completed RA-13 tick reassociates with limit 5 from the latest catalog and the tick's pointing. */
 const antennaTransition=(tr:RadioLabTransition)=>{
  if(!completedRadioClockTick(tr)||!receiverSessionOpen(sessionRef.current))return;
  stepSession(s=>reassociateReceivers(s,{catalog:latest.current.catalogNow(),pointing:tr.state.pointing}));
 };
 const apiImpl=useRef({open,antennaTransition});
 useLayoutEffect(()=>{apiImpl.current={open,antennaTransition};});
 useLayoutEffect(()=>{
  apiRef.current=Object.freeze({open:()=>apiImpl.current.open(),antennaTransition:(tr:RadioLabTransition)=>apiImpl.current.antennaTransition(tr),
   hasReceivers:()=>receiverSessionOpen(sessionRef.current)});
  return ()=>{apiRef.current=null;};
 },[apiRef]);

 // ---- Timer1 (WEB-RX-CAD-01): one 40 ms registration while the main timer is enabled and no project operation runs.
 // It keeps running on a hidden route and under modals; each delivery checks ownership and reads the latest inputs.
 const timerActive=session.bank.timerEnabled&&!busy;
 useEffect(()=>{
  if(!timerActive)return;
  const registration=startRadioTimer(BROWSER_TIMER,RADIO_RECEIVER_SESSION_POLICY.timerIntervalMs,()=>({}),()=>{
   if(!registration.active()||latest.current.busy||!sessionRef.current.bank.timerEnabled)return;
   const input=clockNow();
   stepSession(s=>tickReceivers(s,input));
  });
  return registration.cancel;
 },[timerActive]);// stepSession/clockNow read refs and stable setters only

 // ---- Close box presentation: the active route, no project operation, no antenna surface and no foreign native dialog.
 const boxPending=session.closeBox!==null&&active&&!busy;
 const foreign=useSyncExternalStore(boxPending?observeNativeModals:observeNothing,boxPending?nativeModalOpen:noNativeModal,noNativeModal);
 const boxPresented=boxPending&&!foreign&&!antennaModal;
 const hasReceivers=receiverSessionOpen(session),seedValid=session.seed.base!==null;
 const reported=useRef<RadioReceiverSummary|null>(null),reportTo=useRef(onSummaryChange);
 useLayoutEffect(()=>{reportTo.current=onSummaryChange;});
 useLayoutEffect(()=>{
  const prev=reported.current;
  if(prev&&prev.hasReceivers===hasReceivers&&prev.seedValid===seedValid&&prev.boxPending===boxPending&&prev.boxPresented===boxPresented)return;
  const next=Object.freeze({hasReceivers,seedValid,boxPending,boxPresented});reported.current=next;reportTo.current(next);
 },[hasReceivers,seedValid,boxPending,boxPresented]);
 useLayoutEffect(()=>()=>{if(reported.current?.boxPresented)reportTo.current({...reported.current,boxPresented:false});},[]);

 // ---- Focus (WEB-RX-FOCUS-01, web policy only: native SetFocus/activation order is not reproduced).
 const headings=useRef<(HTMLHeadingElement|null)[]>([null,null,null]),closes=useRef<(HTMLButtonElement|null)[]>([null,null,null]);
 const addRef=useRef<HTMLButtonElement>(null),setupHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  if(focus===null||nativeModalOpen())return;
  const order=focus.kind==='heading'?[headings.current[focus.slot]]
   :focus.kind==='after-child-close'?[addRef.current,headings.current[0]]
   :focus.kind==='after-main-close'?[receiverButtonRef.current,setupHeading.current]
   :[closes.current[1]];
  order.find(canTakeFocus)?.focus();
 },[focus,receiverButtonRef]);

 const step=(slot:number,control:RadioReceiverControl,direction:'down'|'up')=>userAction(slot,s=>stepReceiver(s,slot,control,direction));
 const add=()=>{
  const before=sessionRef.current.bank.slots,r=userAction(0,addReceiverWindow);
  const slot=[1,2].find(i=>before[i]===null&&r?.session.bank.slots[i]);
  if(slot!==undefined)requestFocus('heading',slot);
 };
 /** Mode is aria-disabled (not disabled) while a stop is pending, so focus stays on it; such a press does nothing. */
 const mode=(slot:number)=>{
  if(receiverControlAvailability(sessionRef.current,slot).mode!=='enabled')return;
  const input=clockNow();userAction(slot,s=>toggleReceiverMode(s,input));
 };
 const close=(slot:number)=>{
  const r=userAction(slot,s=>requestReceiverClose(s,slot));
  if(r?.outcome.kind==='ok'&&r.session.bank.slots[slot]===null)requestFocus(slot===0?'after-main-close':'after-child-close',slot);
 };
 const dismissBox=()=>{if(stepSession(dismissReceiverCloseBox).changed)requestFocus('close1',1);};
 const paint=(slot:number)=>{stepSession(s=>paintReceiverWindow(s,slot));};

 // ---- R-RX3 marks (docs/RADIO-RECEIVER-MARKS.md). One pointer lease across the bank, read from sessionRef (never from a
 // rendered snapshot). Presses need the shown route, no project operation, no surface over the cards and no foreign dialog.
 const cardsInert=antennaModal||dateOpen||parametersPresented||boxPresented;
 const inertRef=useRef(cardsInert);
 useLayoutEffect(()=>{inertRef.current=cardsInert;});
 const overlays=useRef<(HTMLCanvasElement|null)[]>([null,null,null]),displays=useRef<(HTMLDivElement|null)[]>([null,null,null]);
 const marksAdmitted=()=>latest.current.active&&!latest.current.busy&&!inertRef.current&&!nativeModalOpen();
 const releaseCapture=(l:ReceiverMarkLease)=>{
  const el=overlays.current[l.slot];
  try{if(el?.hasPointerCapture(l.pointerId))el.releasePointerCapture(l.pointerId);}catch{/* already released by the browser */}
 };
 /** WEB-MARK-CANCEL: ends the gesture (no attempt; last accepted marks kept). Runs on an inactive or busy route too. */
 const endGesture=()=>{
  const l=sessionRef.current.markLease;if(!l)return;
  const r=stepSession(endMarkGesture);releaseCapture(l);
  if(r.changed)setNotice({slot:l.slot,outcome:r.outcome});
 };
 const endGestureRef=useRef(endGesture);
 useLayoutEffect(()=>{endGestureRef.current=endGesture;});
 /** Logical column of a pointer on a window's overlay ('press' refuses outside 0..400, 'drag' clamps). */
 const columnOf=(slot:number,clientX:number,mode:'press'|'drag')=>{
  const el=overlays.current[slot];if(!el)return null;const rect=el.getBoundingClientRect();
  return receiverMarkColumn(clientX,rect.left,rect.width,mode);
 };
 const markDown=(slot:number,e:PointerEvent<HTMLCanvasElement>,selected:ReceiverMarkSelector)=>{
  const code=receiverMarkCode({pointerType:e.pointerType,button:e.button,isPrimary:e.isPrimary},selected);
  if(code===null||sessionRef.current.markLease||!marksAdmitted())return;
  const x=columnOf(slot,e.clientX,'press');if(x===null)return;
  const press={pointerId:e.pointerId,pointerType:e.pointerType,button:e.button as ReceiverMarkButton,slot,code,x};
  if(receiverMarkAvailability(sessionRef.current,slot)!=='enabled'){userAction(slot,s=>markPointerDown(s,press));return;}
  e.preventDefault();
  displays.current[slot]?.focus({preventScroll:true});
  const el=e.currentTarget;
  try{el.setPointerCapture(e.pointerId);}catch{return;}
  const r=userAction(slot,s=>markPointerDown(s,press));
  if(!r?.session.markLease)try{el.releasePointerCapture(e.pointerId);}catch{/* not captured */}
 };
 const markRelease=(l:ReceiverMarkLease,clientX:number)=>{
  const x=columnOf(l.slot,clientX,'drag');
  if(x===null||!marksAdmitted()){endGesture();return;}
  userAction(l.slot,s=>markPointerUp(s,{pointerId:l.pointerId,x}));releaseCapture(l);
 };
 const markMove=(e:PointerEvent<HTMLCanvasElement>)=>{
  const l=sessionRef.current.markLease;if(!l||l.pointerId!==e.pointerId)return;
  if(!marksAdmitted()){endGesture();return;}
  if(receiverMarkMoveReleases(l.button,e.button,e.buttons)){markRelease(l,e.clientX);return;}
  const x=columnOf(l.slot,e.clientX,'drag');if(x===null)return;
  stepSession(s=>markPointerMove(s,{pointerId:e.pointerId,x}));
 };
 const markUp=(e:PointerEvent<HTMLCanvasElement>)=>{
  const l=sessionRef.current.markLease;if(!l||l.pointerId!==e.pointerId)return;
  markRelease(l,e.clientX);
 };
 /** pointercancel and lostpointercapture of the lease's pointer (after a release the lease is already gone). */
 const markCancel=(e:PointerEvent<HTMLCanvasElement>)=>{const l=sessionRef.current.markLease;if(l&&l.pointerId===e.pointerId)endGesture();};
 /** Focus leaving the origin display, or Escape on it. */
 const markLeave=(slot:number)=>{const l=sessionRef.current.markLease;if(l&&l.slot===slot)endGesture();};
 const markPlace=(slot:number,selector:ReceiverMarkSelector,text:string)=>userAction(slot,s=>placeReceiverMark(s,slot,selector,text));
 const markStep=(slot:number,selector:ReceiverMarkSelector,delta:1|-1)=>userAction(slot,s=>stepReceiverMark(s,slot,selector,delta));
 const markClear=(slot:number)=>{userAction(slot,s=>clearReceiverNextMark(s,slot));};
 const markHandlers:MarkHandlers={down:markDown,move:markMove,up:markUp,cancel:markCancel,leave:markLeave,place:markPlace,step:markStep,clear:markClear,
  overlayRef:(slot,el)=>{overlays.current[slot]=el;},displayRef:(slot,el)=>{displays.current[slot]=el;}};
 // Window/document listeners and the foreign-dialog subscription exist only while a lease does (no document key listener).
 const leased=session.markLease!==null;
 useEffect(()=>{
  if(!leased)return;
  const end=()=>endGestureRef.current();
  const hidden=()=>{if(document.visibilityState==='hidden')end();};
  const stop=observeNativeModals(()=>{if(nativeModalOpen())end();});
  window.addEventListener('blur',end);document.addEventListener('visibilitychange',hidden);
  return ()=>{stop();window.removeEventListener('blur',end);document.removeEventListener('visibilitychange',hidden);};
 },[leased]);
 // Route hidden, project operation or a surface over the cards: the gesture ends before paint.
 useLayoutEffect(()=>{if(!active||busy||cardsInert)endGestureRef.current();},[active,busy,cardsInert]);

 const next=nextReceiverSeed(session);
 return <div className="radio-receiver-workspace" data-testid="receiver-workspace" data-timer={session.bank.timerEnabled}>
  <section className="card radio-control radio-control-env radio-receiver-setup" aria-labelledby={`${id}-setup`} data-testid="receiver-setup" inert={cardsInert||undefined}>
   <h2 ref={setupHeading} id={`${id}-setup`} tabIndex={-1}>{t('radioReceiver.setup.heading')}</h2>
   <ul className="radio-receiver-notes" data-testid="receiver-notes">
    <li>{t('radioReceiver.note.display')}</li><li>{t('radioReceiver.note.temporary')}</li><li>{t('radioReceiver.note.silent')}</li><li>{t('radioReceiver.note.unavailable')}</li>
   </ul>
   <label htmlFor={`${id}-seed`}>{t('radioReceiver.setup.seedLabel')}</label>
   <input id={`${id}-seed`} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} data-testid="receiver-seed" value={session.seed.text} disabled={hasReceivers}
    aria-invalid={!seedValid||undefined} aria-describedby={`${id}-seed-help`} onChange={e=>{if(latest.current.active&&!latest.current.busy)stepSession(s=>editReceiverSeed(s,e.target.value));}}/>
   <p id={`${id}-seed-help`} className="radio-control-note" data-testid="receiver-seed-help">
    {hasReceivers?t('radioReceiver.setup.seedLocked'):seedValid?t('radioReceiver.setup.seedHelp'):t('radioReceiver.setup.seedInvalid')}</p>
   <p data-testid="receiver-seed-next">{next===undefined?t('radioReceiver.setup.nextNone'):t('radioReceiver.setup.next',{seed:next})}</p>
   {/* Outcomes without a window (a refused Open, the last close) are announced here. */}
   <p className="radio-control-status" role="status" aria-live="polite" data-testid="receiver-setup-status">
    {notice&&(notice.slot===null||session.bank.slots[notice.slot]===null)?outcomeText(notice.outcome):''}</p>
  </section>
  {session.bank.slots.map((r,slot)=>r&&<ReceiverCard key={slot} r={r} session={session} log={session.canvases[slot]} overlay={session.markOverlays[slot]} inert={cardsInert}
   notice={notice&&notice.slot===slot?outcomeText(notice.outcome):''} headingRef={el=>{headings.current[slot]=el;}} closeRef={el=>{closes.current[slot]=el;}}
   addRef={slot===0?addRef:undefined} onStep={step} onAdd={add} onMode={mode} onClose={close} onPaint={paint} marks={markHandlers}/>)}
  {boxPresented&&session.closeBox&&<ReceiverCloseBox caption={session.closeBox.caption} text={session.closeBox.text} onDismiss={dismissBox}/>}
 </div>;
}

type MarkHandlers=Readonly<{
 down:(slot:number,e:PointerEvent<HTMLCanvasElement>,selected:ReceiverMarkSelector)=>void;move:(e:PointerEvent<HTMLCanvasElement>)=>void;
 up:(e:PointerEvent<HTMLCanvasElement>)=>void;cancel:(e:PointerEvent<HTMLCanvasElement>)=>void;leave:(slot:number)=>void;
 place:(slot:number,selector:ReceiverMarkSelector,text:string)=>ReceiverSessionTransition|null;step:(slot:number,selector:ReceiverMarkSelector,delta:1|-1)=>void;
 clear:(slot:number)=>void;overlayRef:(slot:number,el:HTMLCanvasElement|null)=>void;displayRef:(slot:number,el:HTMLDivElement|null)=>void;
}>;
type CardProps=Readonly<{r:RadioReceiver;session:RadioReceiverSession;log:ReceiverCanvasLog|null;overlay:ReceiverMarkOverlay|null;inert:boolean;notice:string;
 headingRef:(el:HTMLHeadingElement|null)=>void;closeRef:(el:HTMLButtonElement|null)=>void;addRef?:RefObject<HTMLButtonElement|null>;
 onStep:(slot:number,control:RadioReceiverControl,direction:'down'|'up')=>void;onAdd:()=>void;onMode:(slot:number)=>void;onClose:(slot:number)=>void;onPaint:(slot:number)=>void;
 marks:MarkHandlers}>;
/** One TRcvr_Form1 as a card: the native caption, the display and the controls in DFM TabOrder, then the web mark controls. */
function ReceiverCard({r,session,log,overlay,inert,notice,headingRef,closeRef,addRef,onStep,onAdd,onMode,onClose,onPaint,marks}:CardProps){
 const id=useId(),slot=r.index,main=slot===0,labels=receiverLabels(r),avail=receiverControlAvailability(session,slot);
 const [selected,setSelected]=useState<ReceiverMarkSelector>(0);
 const caption=receiverCaption(r.title,r.apertureText),finishing=r.stopPending===true&&session.bank.timerEnabled;
 const error=session.tickError;
 const spin=(control:RadioReceiverControl,caption:string,value:string,down:PlainMessageKey,up:PlainMessageKey,state:ReceiverControlState)=>
  <div className="radio-receiver-spin" role="group" aria-labelledby={`${id}-${control}`} data-testid={`receiver-${control}-${slot}`}>
   <span id={`${id}-${control}`} className="radio-control-native">{caption}</span>
   <span className="radio-receiver-value radio-control-native" data-testid={`receiver-${control}-value-${slot}`}>{value}</span>
   <button type="button" className="secondary-button antenna-spin" aria-label={t(down)} data-testid={`receiver-${control}-down-${slot}`} disabled={state!=='enabled'}
    onKeyDown={ignoreHeldKey} onClick={()=>onStep(slot,control,'down')}>−</button>
   <button type="button" className="secondary-button antenna-spin" aria-label={t(up)} data-testid={`receiver-${control}-up-${slot}`} disabled={state!=='enabled'}
    onKeyDown={ignoreHeldKey} onClick={()=>onStep(slot,control,'up')}>+</button>
  </div>;
 return <section className="card radio-control radio-receiver-card" aria-labelledby={`${id}-caption`} data-testid={`receiver-card-${slot}`} inert={inert||undefined}>
  <h3 ref={headingRef} id={`${id}-caption`} tabIndex={-1} className="radio-control-native radio-receiver-caption" data-testid={`receiver-heading-${slot}`}>{caption}</h3>
  <p className="radio-control-note">{main?t('radioReceiver.card.main'):t('radioReceiver.card.child',{n:slot+1})}</p>
  <div ref={el=>marks.displayRef(slot,el)} className="radio-receiver-display" role="group" tabIndex={-1} aria-label={t('radioReceiver.marks.display',{n:slot+1})}
   data-testid={`receiver-display-${slot}`} onKeyDown={e=>{if(e.key==='Escape')marks.leave(slot);}}
   onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))marks.leave(slot);}}>
   <ReceiverCanvas slot={slot} r={r} log={log} onPaint={onPaint}/>
   <ReceiverMarkCanvas slot={slot} overlay={overlay} selected={selected} marks={marks}/>
  </div>
  <div className="radio-receiver-controls">
   {spin('frequency',D.frequency,labels.frequency,'radioReceiver.control.frequencyDown','radioReceiver.control.frequencyUp',avail.frequency)}
   {spin('frequency-step',D.step,labels.step,'radioReceiver.control.stepDown','radioReceiver.control.stepUp',avail['frequency-step'])}
   {spin('vertical',D.vertical,labels.vertical,'radioReceiver.control.verticalDown','radioReceiver.control.verticalUp',avail.vertical)}
   {main?spin('horizontal',D.horizontal,labels.horizontal,'radioReceiver.control.horizontalDown','radioReceiver.control.horizontalUp',avail.horizontal)
    :<div className="radio-receiver-spin" data-testid={`receiver-horizontal-${slot}`}><span className="radio-control-native">{D.horizontal}</span>
     <span className="radio-receiver-value radio-control-native" data-testid={`receiver-horizontal-value-${slot}`}>{labels.horizontal}</span></div>}
  </div>
  <div className="button-row radio-receiver-buttons">
   {main&&<button ref={addRef} type="button" className="secondary-button" data-testid="receiver-add" disabled={avail.add!=='enabled'} onKeyDown={ignoreHeldKey} onClick={onAdd}>{D.add}</button>}
   {main&&<button type="button" className="secondary-button" data-testid="receiver-align" disabled aria-describedby={`${id}-unported`}>{D.align}</button>}
   {main&&<button type="button" className="primary-button" data-testid="receiver-mode" aria-disabled={avail.mode!=='enabled'||undefined} aria-describedby={finishing?`${id}-sweep`:undefined}
    onKeyDown={ignoreHeldKey} onClick={()=>{if(avail.mode==='enabled')onMode(slot);}}>{D.mode}</button>}
   {main&&<button type="button" className="secondary-button" data-testid="receiver-record" disabled aria-describedby={`${id}-unported`}>{D.record}</button>}
   <button ref={closeRef} type="button" className="secondary-button" data-testid={`receiver-close-${slot}`} onKeyDown={ignoreHeldKey} onClick={()=>onClose(slot)}>{t('radioReceiver.control.close')}</button>
  </div>
  {main&&<p id={`${id}-unported`} className="radio-control-note">{t('radioReceiver.card.unported')}</p>}
  <dl className="radio-control-state radio-receiver-indicators">
   <dt>{t('radioReceiver.card.modeDisp')}</dt><dd className="radio-control-native" data-testid={`receiver-mode-disp-${slot}`}>{labels.mode}</dd>
   {labels.align!==null&&<><dt>{t('radioReceiver.card.alignDisp')}</dt><dd className="radio-control-native" data-testid="receiver-align-disp">{labels.align}</dd></>}
   {main&&<><dt>{t('radioReceiver.card.recordDisp')}</dt><dd className="radio-control-native" data-testid="receiver-record-disp">{labels.record}</dd></>}
  </dl>
  <p id={`${id}-sweep`} data-testid={`receiver-sweep-${slot}`} data-position={r.position??''} data-receiving={r.receiving} data-stop-pending={r.stopPending===true} data-timer={session.bank.timerEnabled}>
   {r.position===null?t('radioReceiver.card.sweepNone'):finishing?t('radioReceiver.card.finishing',{position:r.position,width:r.sweepWidth}):t('radioReceiver.card.sweep',{position:r.position,width:r.sweepWidth})}</p>
  {main&&<p data-testid="receiver-source">{r.identifiedName===null?t('radioReceiver.card.sourceNone'):t('radioReceiver.card.source',{name:r.identifiedName})}</p>}
  {main&&error?<p role="alert" className="radio-receiver-alert" data-testid="receiver-tick-error" data-kind={error.kind}>{t('radioReceiver.tickError',{reason:t(`radioReceiver.error.${error.kind}`)})}</p>:null}
  <ReceiverMarks slot={slot} r={r} overlay={overlay} availability={receiverMarkAvailability(session,slot)} selected={selected} onSelect={setSelected} marks={marks}/>
  <p className="radio-control-status" role="status" aria-live="polite" data-testid={`receiver-status-${slot}`}>{notice}</p>
 </section>;
}

/** WEB-MARK-RENDER overlay above the base display: cleared and redrawn from the session's overlay alone (never Paint, a
 * refresh or the random stream), with its own pen and stroke so nothing leaks into the base canvas's next trace segment.
 * Pointer input (WEB-MARK-INPUT) is taken here; touch-action none only on this element; the context menu is suppressed
 * only here. Double-click with the primary button runs Clear (declared web binding, WEB-MARK-CLEAR). */
function ReceiverMarkCanvas({slot,overlay,selected,marks}:Readonly<{slot:number;overlay:ReceiverMarkOverlay|null;selected:ReceiverMarkSelector;marks:MarkHandlers}>){
 const ref=useRef<HTMLCanvasElement>(null);
 useLayoutEffect(()=>{
  const ctx=ref.current?.getContext('2d');if(!ctx)return;
  ctx.clearRect(0,0,G.width,G.height);if(!overlay)return;
  let pen={x:0,y:0},stroke=0;
  for(const op of receiverMarkOverlayOps(overlay)){
   if(op.kind==='pen')stroke=op.colour;
   else if(op.kind==='move')pen={x:op.x,y:op.y};
   else if(op.kind==='line'){
    ctx.strokeStyle=css(stroke);ctx.lineWidth=1;ctx.lineCap='square';ctx.beginPath();ctx.moveTo(pen.x+0.5,pen.y+0.5);ctx.lineTo(op.x+0.5,op.y+0.5);ctx.stroke();
    pen={x:op.x,y:op.y};
   }else if(op.kind==='text'){
    ctx.font='bold 13px sans-serif';ctx.textBaseline='top';
    const width=Math.ceil(ctx.measureText(op.text).width);
    ctx.fillStyle=css(RECEIVER_MARK_LABEL_BACKGROUND);ctx.fillRect(op.x,op.y,width,16);
    ctx.fillStyle=css(op.colour);ctx.fillText(op.text,op.x,op.y);
   }
  }
 },[overlay]);
 return <canvas ref={el=>{ref.current=el;marks.overlayRef(slot,el);}} width={G.width} height={G.height} className="radio-receiver-overlay" aria-hidden="true"
  data-testid={`receiver-overlay-${slot}`} onPointerDown={e=>marks.down(slot,e,selected)} onPointerMove={marks.move} onPointerUp={marks.up}
  onPointerCancel={marks.cancel} onLostPointerCapture={marks.cancel} onContextMenu={e=>e.preventDefault()}
  onDoubleClick={e=>{if(e.button===0)marks.clear(slot);}}/>;
}

const ARROW_STEP:Readonly<Record<string,1|-1>>={ArrowUp:1,ArrowDown:-1};
/** Per-window mark controls (WEB-MARK-KEYBOARD): First/Second selection (component state; selecting places nothing), the
 * position spinbutton (blank while unset; Enter or Place commits a validated draft; Home/End place at 0/400; ArrowUp/Down
 * step a placed mark by one; ArrowLeft/Right keep caret movement; Escape restores the stored value; held keys are
 * ignored), Clear, and the readout of stored columns and last drawn labels. */
function ReceiverMarks({slot,r,overlay,availability,selected,onSelect,marks}:Readonly<{slot:number;r:RadioReceiver;overlay:ReceiverMarkOverlay|null;
 availability:ReceiverMarkAvailability;selected:ReceiverMarkSelector;onSelect:(s:ReceiverMarkSelector)=>void;marks:MarkHandlers}>){
 const id=useId(),stored=r.marks[selected],enabled=availability==='enabled';
 const [draft,setDraft]=useState<string|null>(null),[invalid,setInvalid]=useState(false);
 // A stored change from any input shows the stored column again.
 useEffect(()=>{setDraft(null);setInvalid(false);},[stored,selected]);
 const value=draft??(stored>=0?String(stored):'');
 const place=(text:string)=>{
  const result=marks.place(slot,selected,text),o=result?.outcome;
  const bad=o?.kind==='web-refused'&&o.reason==='mark-position-invalid';
  setInvalid(bad);if(!bad&&result)setDraft(null);
 };
 const onKeyDown=(e:KeyboardEvent<HTMLInputElement>)=>{
  const plain=!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey;
  if(!plain||!['Enter','Home','End','ArrowUp','ArrowDown','Escape'].includes(e.key))return;
  e.preventDefault();if(e.repeat)return;
  if(e.key==='Enter')place(value);
  else if(e.key==='Home')place(String(RECEIVER_MARK_WEB_POLICY.minColumn));
  else if(e.key==='End')place(String(RECEIVER_MARK_WEB_POLICY.maxColumn));
  else if(e.key==='Escape'){setDraft(null);setInvalid(false);}
  else marks.step(slot,selected,ARROW_STEP[e.key]);
 };
 const shown=(sel:ReceiverMarkSelector)=>r.marks[sel]<0?t('radioReceiver.marks.unset'):t('radioReceiver.marks.column',{x:r.marks[sel]});
 const label=(sel:ReceiverMarkSelector)=>{const l=overlay?.labels[sel];return l?t('radioReceiver.marks.labelValue',{text:l.text,x:l.x}):t('radioReceiver.marks.labelNone');};
 const l0=overlay?.labels[0]??null,l1=overlay?.labels[1]??null;
 return <fieldset className="radio-receiver-marks" data-testid={`receiver-marks-${slot}`}>
  <legend>{t('radioReceiver.marks.legend')}</legend>
  <p className="radio-control-note">{t('radioReceiver.marks.scope')}</p>
  <div className="radio-receiver-mark-select" role="radiogroup" aria-label={t('radioReceiver.marks.selectLabel')}>
   {([0,1] as const).map(sel=><label key={sel}>
    <input type="radio" name={`${id}-mark`} value={sel} checked={selected===sel} data-testid={`receiver-mark-select-${sel===0?'first':'second'}-${slot}`}
     onChange={()=>onSelect(sel)}/>{t(MARK_NAME[sel])}</label>)}
  </div>
  <div className="radio-receiver-mark-position">
   <label htmlFor={`${id}-position`}>{t('radioReceiver.marks.position',{mark:t(MARK_NAME[selected])})}</label>
   <input id={`${id}-position`} type="text" inputMode="numeric" role="spinbutton" autoComplete="off" spellCheck={false} maxLength={8} data-testid={`receiver-mark-position-${slot}`}
    value={value} disabled={!enabled} aria-valuemin={RECEIVER_MARK_WEB_POLICY.minColumn} aria-valuemax={RECEIVER_MARK_WEB_POLICY.maxColumn}
    aria-valuenow={stored>=0?stored:undefined} aria-invalid={invalid||undefined} aria-describedby={`${id}-help ${id}-timer`}
    onChange={e=>{setDraft(e.target.value);setInvalid(false);}} onKeyDown={onKeyDown}/>
   <button type="button" className="secondary-button" data-testid={`receiver-mark-place-${slot}`} disabled={!enabled} onKeyDown={ignoreHeldKey} onClick={()=>place(value)}>
    {t('radioReceiver.marks.place')}</button>
   <button type="button" className="secondary-button" data-testid={`receiver-mark-clear-${slot}`} aria-describedby={`${id}-clear`} onKeyDown={ignoreHeldKey}
    onClick={()=>marks.clear(slot)}>{t('radioReceiver.marks.clear')}</button>
  </div>
  <p id={`${id}-help`} className="radio-control-note">{t('radioReceiver.marks.help')}</p>
  <p id={`${id}-timer`} className="radio-control-note" data-testid={`receiver-mark-timer-${slot}`}>{enabled?'':t('radioReceiver.marks.timerHelp')}</p>
  <p id={`${id}-clear`} className="radio-control-note">{t('radioReceiver.marks.clearHelp')}</p>
  <dl className="radio-control-state radio-receiver-mark-readout" data-testid={`receiver-mark-readout-${slot}`} data-mark-first={r.marks[0]} data-mark-second={r.marks[1]}
   data-label-first={l0?.text??''} data-label-first-x={l0?.x??''} data-label-second={l1?.text??''} data-label-second-x={l1?.x??''}>
   <dt>{t('radioReceiver.marks.firstStored')}</dt><dd data-testid={`receiver-mark-first-${slot}`}>{shown(0)}</dd>
   <dt>{t('radioReceiver.marks.secondStored')}</dt><dd data-testid={`receiver-mark-second-${slot}`}>{shown(1)}</dd>
   <dt>{t('radioReceiver.marks.firstLabel')}</dt><dd className="radio-control-native radio-receiver-mark-label" data-testid={`receiver-mark-label-first-${slot}`}>{label(0)}</dd>
   <dt>{t('radioReceiver.marks.secondLabel')}</dt><dd className="radio-control-native radio-receiver-mark-label" data-testid={`receiver-mark-label-second-${slot}`}>{label(1)}</dd>
  </dl>
 </fieldset>;
}

/** Logical 401 × 142 display (WEB-RX-DISP-01/PAINT-01/02): the canvas bitmap is retained; ops newer than the last drawn
 * sequence are drawn after each commit. When unseen ops were dropped from the bounded log, it is repainted purely from the
 * current state (no state transition) and the pen is then set to the log's pen. Paint runs once per mount (a stable
 * callback; re-renders never repaint). */
function ReceiverCanvas({slot,r,log,onPaint}:Readonly<{slot:number;r:RadioReceiver;log:ReceiverCanvasLog|null;onPaint:(slot:number)=>void}>){
 const ref=useRef<HTMLCanvasElement>(null),lastSeq=useRef(-1),pen=useRef<ReceiverPen>({x:0,y:0}),stroke=useRef<number>(RECEIVER_DISPLAY_COLOURS.trace);
 const paintRef=useRef(onPaint);
 useLayoutEffect(()=>{paintRef.current=onPaint;});
 useEffect(()=>{paintRef.current(slot);},[slot]);
 useLayoutEffect(()=>{
  const ctx=ref.current?.getContext('2d');if(!ctx||!log)return;
  const draw=(op:ReceiverDisplayOp)=>{
   if(op.kind==='pen'){stroke.current=op.colour;return;}
   if(op.kind==='move'){pen.current={x:op.x,y:op.y};return;}
   if(op.kind==='fill'){ctx.fillStyle=css(RECEIVER_DISPLAY_COLOURS.background);ctx.fillRect(op.x0,op.y0,op.x1-op.x0,op.y1-op.y0);return;}
   if(op.kind==='line'){
    // Square caps cover both end pixels, so the 1-pixel steps of the trace stay crisp instead of half-covered blends.
    ctx.strokeStyle=css(stroke.current);ctx.lineWidth=1;ctx.lineCap='square';ctx.beginPath();ctx.moveTo(pen.current.x+0.5,pen.current.y+0.5);ctx.lineTo(op.x+0.5,op.y+0.5);ctx.stroke();
    pen.current={x:op.x,y:op.y};return;
   }
   ctx.font='bold 13px sans-serif';ctx.textBaseline='top';
   const width=Math.ceil(ctx.measureText(op.text).width);
   ctx.fillStyle=css(RECEIVER_DISPLAY_COLOURS.background);ctx.fillRect(op.x,op.y,width,16);
   ctx.fillStyle=css(op.colour);ctx.fillText(op.text,op.x,op.y);
  };
  const first=log.ops[0];
  if(log.dropped&&first&&first.seq>lastSeq.current+1){
   for(const op of receiverPaintOps(r).ops)draw(op);
   // The session decided the following Move/Line ops from log.pen, not from the repaint's final pen.
   if(log.pen)pen.current=log.pen;
  }
  else for(const e of log.ops)if(e.seq>lastSeq.current)draw(e.op);
  lastSeq.current=log.nextSeq-1;
 },[log,r]);
 return <canvas ref={ref} width={G.width} height={G.height} className="radio-receiver-canvas" role="img" data-testid={`receiver-canvas-${slot}`}
  aria-label={t('radioReceiver.canvas.label',{n:slot+1,mode:r.receiving?L.receive:L.stop})}/>;
}

/** FormCloseQuery box (MessageBox flags 0x40, MB_ICONINFORMATION | MB_OK) with the recovered caption and text; Enter or
 * Escape closes it. Focus returns to the slot-1 Close button. */
function ReceiverCloseBox({caption,text,onDismiss}:Readonly<{caption:string;text:string;onDismiss:()=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{button.current?.focus();},[]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(ignoreHeldKey(e))return;
  if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();onDismiss();return;}
  trapTab(e,root.current);
 };
 return <div className="radio-control" style={{display:'contents'}}>
  <div className="antenna-backdrop antenna-backdrop-top">
   <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} className="antenna-dialog antenna-notice" data-testid="receiver-close-box" onKeyDown={onKeyDown}>
    <h3 id={`${id}-title`} className="radio-control-native">{caption}</h3>
    <p id={`${id}-body`} className="radio-control-native" data-testid="receiver-close-box-text">{text}</p>
    <p className="radio-control-note">{t('radioReceiver.box.note')}</p>
    <div className="button-row">
     <button ref={button} type="button" className="primary-button" data-testid="receiver-close-box-ok" onClick={onDismiss}>{t('radioReceiver.box.ok')}</button>
    </div>
   </div>
  </div>
 </div>;
}
