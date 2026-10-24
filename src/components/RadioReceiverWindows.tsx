import {useEffect,useId,useLayoutEffect,useRef,useState,useSyncExternalStore,type KeyboardEvent,type MutableRefObject,type RefObject} from 'react';
import './RadioReceiverWindows.css';
import type {RadioLabTransition,RadioPointing} from '../core/radioAntenna';
import type {PulsarCatalog} from '../core/radioPulsarCatalog';
import type {RadioReceiver,RadioReceiverControl} from '../core/radioReceiver';
import {
 RECEIVER_DFM_CAPTIONS,RECEIVER_DISPLAY_COLOURS,RECEIVER_DISPLAY_GEOMETRY,RECEIVER_DISPLAY_LITERALS,receiverCaption,receiverLabels,receiverPaintOps,
 type ReceiverDisplayOp,type ReceiverPen,
} from '../core/radioReceiverDisplay';
import {
 RADIO_RECEIVER_SESSION_POLICY,addReceiverWindow,completedRadioClockTick,createRadioReceiverSession,dismissReceiverCloseBox,editReceiverSeed,nextReceiverSeed,
 openReceiverWindow,paintReceiverWindow,reassociateReceivers,receiverControlAvailability,receiverSessionOpen,requestReceiverClose,stepReceiver,tickReceivers,
 toggleReceiverMode,type RadioReceiverSession,type ReceiverCanvasLog,type ReceiverControlState,type ReceiverSessionOutcome,type ReceiverSessionTransition,
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

/** The product text of a session outcome for the status line ('' when nothing is announced). */
function outcomeText(o:ReceiverSessionOutcome):string{
 if(o.kind==='refused')return t('radioReceiver.status.refused',{reason:t(`radioReceiver.error.${o.error.kind}`)});
 if(o.kind==='web-refused')return t(`radioReceiver.status.web.${o.reason}`);
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

 const cardsInert=antennaModal||dateOpen||parametersPresented||boxPresented;
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
  {session.bank.slots.map((r,slot)=>r&&<ReceiverCard key={slot} r={r} session={session} log={session.canvases[slot]} inert={cardsInert}
   notice={notice&&notice.slot===slot?outcomeText(notice.outcome):''} headingRef={el=>{headings.current[slot]=el;}} closeRef={el=>{closes.current[slot]=el;}}
   addRef={slot===0?addRef:undefined} onStep={step} onAdd={add} onMode={mode} onClose={close} onPaint={paint}/>)}
  {boxPresented&&session.closeBox&&<ReceiverCloseBox caption={session.closeBox.caption} text={session.closeBox.text} onDismiss={dismissBox}/>}
 </div>;
}

type CardProps=Readonly<{r:RadioReceiver;session:RadioReceiverSession;log:ReceiverCanvasLog|null;inert:boolean;notice:string;
 headingRef:(el:HTMLHeadingElement|null)=>void;closeRef:(el:HTMLButtonElement|null)=>void;addRef?:RefObject<HTMLButtonElement|null>;
 onStep:(slot:number,control:RadioReceiverControl,direction:'down'|'up')=>void;onAdd:()=>void;onMode:(slot:number)=>void;onClose:(slot:number)=>void;onPaint:(slot:number)=>void}>;
/** One TRcvr_Form1 as a card: the native caption, the display and the controls in DFM TabOrder. */
function ReceiverCard({r,session,log,inert,notice,headingRef,closeRef,addRef,onStep,onAdd,onMode,onClose,onPaint}:CardProps){
 const id=useId(),slot=r.index,main=slot===0,labels=receiverLabels(r),avail=receiverControlAvailability(session,slot);
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
  <ReceiverCanvas slot={slot} r={r} log={log} onPaint={onPaint}/>
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
  <p className="radio-control-status" role="status" aria-live="polite" data-testid={`receiver-status-${slot}`}>{notice}</p>
 </section>;
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
