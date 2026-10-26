import {useEffect,useId,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore,type KeyboardEvent,type MouseEvent as ReactMouseEvent,type MutableRefObject,type PointerEvent,type ReactNode,type RefObject} from 'react';
import './RadioReceiverWindows.css';
import type {RadioLabTransition,RadioPointing} from '../core/radioAntenna';
import type {PulsarCatalog} from '../core/radioPulsarCatalog';
import type {RadioReceiver,RadioReceiverControl,RadioReceiverEvent,RadioSourceBuffer} from '../core/radioReceiver';
import {
 PULSAR_RESERVED_DATA_NAME,acquirePulsarCaptureLease,claimPulsarOutput,commitPulsarCapture,pulsarClaimBytes,pulsarClaimReadback,pulsarCurrentSaved,pulsarDataProperties,pulsarDataRows,
 pulsarHeaderCells,pulsarMemoryRecording,recordPulsarFinishWrittenCopy,recordPulsarWrittenCopy,releasePulsarCaptureLease,releasePulsarOutput,setPulsarCapturePhase,
 type PulsarCaptureLease,type PulsarWriteClaim,
} from '../core/pulsarCurrentData';
import {RAW_EXPORT_FILE_NAME,type RawExportField,type RawExportProblem} from '../core/pulsarRawExport';
import {PULSAR_SAVE_PENDING,PULSAR_SAVE_READBACK_MAX_BYTES,pulsarSaveRefusalNotice,type PulsarSaveNotice,type PulsarSaveSupport} from '../core/pulsarSavedCopy';
import {
 radioRecordEraseNote,radioRecordSaveAbandoned,radioRecordSaveBegin,radioRecordSaveFailed,radioRecordSaveNoticed,radioRecordSaveRefused,radioRecordSaveSettled,radioRecordSaveStarted,
 type RadioRecordSave,type RadioRecordSaveBegin,
} from '../core/radioRecordSave';
import {radioFinishSaveBegin} from '../core/radioFinishSave';
import {browserPulsarSaveSupport,continuePulsarSave,invokePulsarSavePicker,type SaveHandle} from './pulsarSaveHost';
import {createPulsarTranslator,type PulsarMessageKey} from './PulsarMessages';
import {createRadioSaveTranslator} from './RadioRecordSaveMessages';
import {createFinishSaveTranslator} from './RadioFinishSaveMessages';
import {RADIO_IDENTIFY_DFM,RADIO_IDENTIFY_POLICY,RADIO_RECORD_LITERALS,radioCaptureInput,radioIdentifyIssue} from '../core/radioReceiverRecord';
import type {SharedPulsarDataHandle} from '../useSharedPulsarData';
import {
 RECEIVER_DFM_CAPTIONS,RECEIVER_DISPLAY_COLOURS,RECEIVER_DISPLAY_GEOMETRY,RECEIVER_DISPLAY_LITERALS,receiverCaption,receiverLabels,receiverPaintOps,
 type ReceiverDisplayOp,type ReceiverPen,
} from '../core/radioReceiverDisplay';
import {RECEIVER_MARK_LABEL_BACKGROUND,RECEIVER_MARK_WEB_POLICY,receiverMarkOverlayOps,type ReceiverMarkOverlay,type ReceiverMarkSelector} from '../core/radioReceiverMarks';
import {receiverMarkCode,receiverMarkColumn,receiverMarkMoveReleases,type ReceiverMarkButton} from '../core/radioReceiverMarkInput';
import {
 RADIO_RECEIVER_SESSION_POLICY,addReceiverWindow,answerRecordIdentify,answerRecordPrompt,answerRecordSave,clearReceiverNextMark,closeRecordProperties,completeRecordArming,
 completedRadioClockTick,createRadioReceiverSession,dismissReceiverCloseBox,dismissRecordFull,editReceiverSeed,editRecordIdentify,endMarkGesture,leaveFinishSave,leaveRecordSave,markPointerDown,
 markPointerMove,markPointerUp,moveReceiverWindow,nextReceiverSeed,openFinishSave,openReceiverWindow,openRecordSave,paintReceiverWindow,placeReceiverMark,pressRecord,reassociateReceivers,receiverBoxRefusal,
 receiverControlAvailability,receiverMarkAvailability,receiverSessionOpen,receiverWindowMoveAvailability,recordDialogOpen,requestReceiverClose,stepFinishSave,stepReceiver,stepReceiverMark,stepRecordSave,tickReceivers,
 toggleReceiverAlignment,toggleReceiverMode,
 type RadioReceiverSession,type ReceiverCanvasLog,type ReceiverControlState,type ReceiverMarkAvailability,type ReceiverMarkLease,type ReceiverRecordArmingResult,
 type ReceiverRecordFinish,type ReceiverRecordHostRequest,type ReceiverRecordHostSnapshot,type ReceiverRecordPrompt,type ReceiverRecordVerified,type ReceiverSessionOutcome,
 type ReceiverSessionTransition,
} from '../core/radioReceiverSession';
import {receiverWindowRank,type ReceiverMoveDirection} from '../core/radioReceiverArrangement';
import {startRadioTimer,type RadioTimerHost} from '../core/radioTimer';
import {
 createReceiverAuditionState,pressReceiverAudition,pruneReceiverAudition,receiverAuditionEnded,receiverAuditionFailed,receiverAuditionInvalidation,receiverAuditionRunning,
 receiverAuditionSource,refuseReceiverAudition,stopReceiverAudition,
 type ReceiverAuditionCause,type ReceiverAuditionEnvironment,type ReceiverAuditionNotice,type ReceiverAuditionState,type ReceiverAuditionStep,
} from '../core/radioReceiverAudition';
import {browserReceiverAuditionDeps,createReceiverAuditionHost,type ReceiverAuditionHost,type ReceiverAuditionHostEvent} from './receiverAuditionHost';
import {ignoreHeldKey,nativeModalOpen,noNativeModal,observeNativeModals,observeNothing,trapTab} from './radioModal';
import {t,type PlainMessageKey} from '../i18n';

/** Host access for the route: open from the panel's Receiver button, the antenna transitions (clock reassociation), the
 * catalog lock, and two read-only views for Pulsar Parameters: the shared +0x5f7 buffer (sourceBuffer, read live; Receiver
 * Open, the clock reassociation and File ▸ Pulsar List... write it) and whether the close box or a Record dialog is modal
 * (boxRefusal). R-RX8 (WEB-PP-LIST-04): sessionNow is the latest accepted session; commitPulsarList commits a prepared
 * 'pulsar-list' transition only while that session is still the latest (false otherwise, nothing changed). It runs no
 * notice, picker callback, onReceiverOpened, host request, focus, paint or seed step. Set while the workspace is mounted.
 * R-RX9 (WEB-RSO-PROJ-01): commitLiveOptions commits a prepared 'live-options' transition (copyReceiverLiveOptions) under
 * the same compare-and-swap rule and with the same absence of side effects. */
export type RadioReceiverApi=Readonly<{open:()=>void;antennaTransition:(tr:RadioLabTransition)=>void;hasReceivers:()=>boolean;
 sourceBuffer:()=>RadioSourceBuffer;boxRefusal:()=>'close-box-open'|'record-dialog-open'|null;
 sessionNow:()=>RadioReceiverSession;commitPulsarList:(expected:RadioReceiverSession,t:ReceiverSessionTransition)=>boolean;
 commitLiveOptions:(expected:RadioReceiverSession,t:ReceiverSessionTransition)=>boolean}>;
/** sourceInBeam, receivers, frequencies and record are presentation summaries for the pulsar guide (WEB-PULSAR-GUIDE-01):
 * the name the main receiver's heading shows (null without a main window or with "No Pulsar in Beam!"), the open windows,
 * their distinct frequency texts and the main Record phase. They never gate a receiver action. */
export type RadioReceiverSummary=Readonly<{hasReceivers:boolean;seedValid:boolean;boxPending:boolean;boxPresented:boolean;
 sourceInBeam:string|null;receivers:number;frequencies:number;record:'idle'|'armed'|'capturing'}>;
export const INITIAL_RADIO_RECEIVER_SUMMARY:RadioReceiverSummary=Object.freeze({hasReceivers:false,seedValid:true,boxPending:false,boxPresented:false,
 sourceInBeam:null,receivers:0,frequencies:0,record:'idle'});
/** The source named by a main receiver heading ("Pulsar <name>   Aperture: …"), or null ("No Pulsar in Beam!", no window). */
const PULSAR_TITLE_PREFIX='Pulsar ';
const headingSource=(r:RadioReceiver|null):string|null=>{
 if(!r)return null;
 const caption=String(receiverCaption(r.title,r.apertureText));
 if(!caption.startsWith(PULSAR_TITLE_PREFIX))return null;
 const name=caption.slice(PULSAR_TITLE_PREFIX.length).split(/\s{2,}/)[0].trim();
 return name===''?null:name;
};

type Props=Readonly<{
 /** The route is shown. Hidden, the timer keeps running and the close box stays pending. */
 active:boolean;
 /** A project operation runs: the receiver timer is cancelled (no catch-up) and no box is presented. */
 busy:boolean;
 /** An antenna dialog/box, the date dialog or a presented Pulsar Parameters surface: the cards are behind it. */
 antennaModal:boolean;dateOpen:boolean;parametersPresented:boolean;
 /** R-RX7 a Radio configuration box or dialog exists: the cards are behind it. */
 configurationOpen?:boolean;
 /** Latest accepted reference catalog, antenna pointing and side-effect-free radio clock JD; read only in handlers and callbacks. */
 catalogNow:()=>PulsarCatalog|null;pointingNow:()=>RadioPointing;readClockJD:()=>number|null;
 /** Monotonic milliseconds (the route's perfNow). */
 perfNow:()=>number;
 apiRef:MutableRefObject<RadioReceiverApi|null>;
 receiverButtonRef:RefObject<HTMLButtonElement|null>;
 /** Called in the layout phase, only when the summary changes. */
 onSummaryChange:(summary:RadioReceiverSummary)=>void;
 /** R-RX4 the App's current pulsar dataset (absent: Record stays disabled) and the No → Pulsar Analysis navigation. */
 pulsarData?:SharedPulsarDataHandle;onOpenPulsarAnalysis?:()=>void;
 /** WEB-PP-CUR-01: called synchronously after a committed Receiver Open or clock reassociation whose picker ran (a source-hit
  * or source-miss event), with exactly the catalog and pointing that transition used. */
 onSourcePicker?:(catalog:PulsarCatalog|null,pointing:RadioPointing)=>void;
 /** R-RX7 (docs/RADIO-ACCESS-OPTIONS.md): called after a committed Receiver Open whose picker ran (source-hit or
  * source-miss, the paths that converge at 0x567a44), also when reopening the existing main window. Never for a refusal. */
 onReceiverOpened?:()=>void;
 /** R-RX7: called after a committed main close whose events include send-0x53a. Never for a refused close or the close box. */
 onMainCloseMessage?:()=>void;
}>;

/** Browser interval host for the receiver Timer1 registration (WEB-RX-CAD-01). */
const BROWSER_TIMER:RadioTimerHost={setInterval:(callback,ms)=>window.setInterval(callback,ms),clearInterval:handle=>window.clearInterval(handle as number)};
const G=RECEIVER_DISPLAY_GEOMETRY,L=RECEIVER_DISPLAY_LITERALS,D=RECEIVER_DFM_CAPTIONS;
/** TColor (BGR) as CSS rgb [I]. */
const css=(c:number)=>`rgb(${c&0xff},${(c>>8)&0xff},${(c>>16)&0xff})`;
const canTakeFocus=(el:HTMLElement|null):el is HTMLElement=>
 !!el&&el.isConnected&&!(el as HTMLButtonElement).disabled&&el.getClientRects().length>0&&!el.closest('[inert]');
/** R-RX5 'align' and 'move-up'/'move-down' restore focus on the pressed control after the cards were reordered (a moved DOM
 * node loses focus in browsers). */
type FocusTarget=Readonly<{kind:'heading'|'after-child-close'|'after-main-close'|'close1'|'record'|'align'|'move-up'|'move-down';slot:number;serial:number}>;
/** text: an explicit status that replaces the outcome's text (Record answers and the main close, whose outcome alone is ambiguous). */
type Notice=Readonly<{slot:number|null;outcome:ReceiverSessionOutcome;text?:string}>;
const noticeText=(n:Notice)=>n.text??outcomeText(n.outcome);
/** R-RX16 (docs/RADIO-RECORD-SAVE.md): the reused R-RX15/R-RX14 Save texts and the Radio Save catalog; R-RX17
 * (docs/RADIO-FINISH-SAVE.md): the finish Save catalog. */
const PT=createPulsarTranslator(),RS=createRadioSaveTranslator(),FS=createFinishSaveTranslator();
/** Which Radio Save dialog: R-RX16 from the Record arming question, R-RX17 from the finish Save question. */
type RadioSaveKind='arming'|'finish';
/** The texts and test ids that differ between the two Radio Save dialogs; everything else is shared. */
type RadioSaveTexts=Readonly<{testId:string;heading:string;intro:string;back:string;pendingNote:string;notReady:string;abandoned:string;busy:string}>;
const RADIO_SAVE_TEXTS:Readonly<Record<RadioSaveKind,RadioSaveTexts>>={
 arming:{testId:'receiver-record-save',heading:RS('radioSave.heading'),intro:RS('radioSave.intro'),back:RS('radioSave.back'),pendingNote:RS('radioSave.pendingNote'),
  notReady:RS('radioSave.refusal.not-ready'),abandoned:RS('radioSave.fail.abandoned'),busy:RS('radioSave.busy')},
 finish:{testId:'receiver-finish-save',heading:FS('finishSave.heading'),intro:FS('finishSave.intro'),back:FS('finishSave.back'),pendingNote:FS('finishSave.pendingNote'),
  notReady:FS('finishSave.refusal.not-ready'),abandoned:FS('finishSave.fail.abandoned'),busy:FS('finishSave.busy')},
};
const RAW_FIELD_LABEL:Readonly<Record<RawExportField,PulsarMessageKey>>={
 frequency1:'pulsar.rawExport.field.frequency1',frequency2:'pulsar.rawExport.field.frequency2',frequency3:'pulsar.rawExport.field.frequency3',
 gain1:'pulsar.rawExport.field.gain1',gain2:'pulsar.rawExport.field.gain2',gain3:'pulsar.rawExport.field.gain3',start:'pulsar.rawExport.field.start',interval:'pulsar.rawExport.field.interval',
};
/** The R-RX14 build problem text (the same wording as the analysis Save dialog). */
const rawProblemText=(p:RawExportProblem)=>PT(`pulsar.rawExport.problem.${p.code}` as PulsarMessageKey,{
 count:'count' in p?p.count:'',max:'max' in p?p.max:'',position:'position' in p?p.position:'',length:'length' in p?p.length:'',bytes:'bytes' in p?p.bytes:'',
 field:'field' in p?PT(RAW_FIELD_LABEL[p.field]):'',receiver:'receiver' in p?p.receiver+1:'',row:'row' in p?p.row:'',channel:'channel' in p?p.channel+1:'',
});
/** A Save phase or result: the R-RX15 wording, except the abandoned text, which names this route and the dialog's buttons. */
function recordSaveNoticeText(n:PulsarSaveNotice,abandoned:string):string{
 const file=n.fileName??'';
 if(PULSAR_SAVE_PENDING.has(n.code))return PT(`pulsar.save.phase.${n.code}` as PulsarMessageKey,{file});
 if(n.code==='verified')return PT('pulsar.save.verifiedShort',{file});
 if(n.code==='abandoned')return abandoned;
 return PT(`pulsar.save.fail.${n.code}` as PulsarMessageKey,{file});
}
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
 if(kinds.includes('record-disarmed'))return t('radioReceiver.record.status.formCreate');
 if(o.action==='record-arming')return t('radioReceiver.record.status.armed');
 if(o.action==='record'||o.action==='record-prompt')return kinds.includes('beam')?t('radioReceiver.record.status.disarmed'):'';
 if(o.action==='record-identify')return t('radioReceiver.record.status.committed');
 if(o.action==='align'){const a=o.events.find(e=>e.kind==='align-toggled');return a?.kind==='align-toggled'?t(a.on?'radioReceiver.align.status.on':'radioReceiver.align.status.off'):'';}
 const limit=o.events.find(e=>e.kind==='at-limit');
 if(limit&&limit.kind==='at-limit')return t('radioReceiver.status.atLimit',{control:t(CONTROL_NAME[limit.control])});
 if(o.action==='open')return t('radioReceiver.status.opened');
 if(o.action==='add')return kinds.includes('add-nothing')?t('radioReceiver.status.addNothing'):t('radioReceiver.status.added');
 if(o.action==='mode')return kinds.includes('receive-started')?t('radioReceiver.status.receiving'):t('radioReceiver.status.stopRequested');
 if(o.action==='close'&&kinds.includes('closed'))return t('radioReceiver.status.closed');
 return '';
}

/** R-RX13 text of an audition refusal reason. */
function auditionReasonText(reason:Extract<ReceiverAuditionNotice,{kind:'refused'}>['reason'],column:number|undefined):string{
 if(reason==='missing-row'||reason==='invalid-row')return t(`radioReceiver.audition.reason.${reason}`,{column:column??''});
 return t(`radioReceiver.audition.reason.${reason}`);
}
/** R-RX13 text of a card's audition status line ('' when nothing is announced). */
function auditionText(n:ReceiverAuditionNotice|null):string{
 if(!n)return '';
 if(n.kind==='refused')return auditionReasonText(n.reason,n.column);
 if(n.kind==='starting')return t('radioReceiver.audition.status.starting');
 if(n.kind==='ended')return t(`radioReceiver.audition.status.end.${n.cause}`);
 if(n.kind==='failed')return t(`radioReceiver.audition.status.failed.${n.failure}`);
 const p=n.pcm,parts=[t('radioReceiver.audition.status.playing',{n:n.slot+1,first:p.firstColumn,last:p.lastColumn,ms:p.durationMs})];
 if(p.silent)parts.push(t('radioReceiver.audition.status.silent'));
 if(p.clippedHigh>0)parts.push(t('radioReceiver.audition.status.clipped',{count:p.clippedHigh}));
 return parts.join(' ');
}
/** What a card shows of the audition: its phase, whether a press can start one, the reason when not, and its status. */
type CardAudition=Readonly<{phase:'idle'|'starting'|'playing';available:boolean;reason:string;status:string}>;

/**
 * WEB workspace of the silent receiver monitor (docs/RADIO-RECEIVER-MONITOR.md): TRcvr_Form1 main and up to two child
 * channels as cards, each with its logical 401 × 142 display. The session (radioReceiverSession) is pure; this component
 * holds it and the 40 ms timer so the 25 Hz updates re-render only this subtree. Every step runs on the latest accepted
 * session (sessionRef), as the route's stepDate does. Nothing is saved, restored or sent anywhere. The native receiver audio
 * is not produced; R-RX13 adds only the web trace audition (docs/RADIO-RECEIVER-AUDITION.md), whose host is created at the
 * first admitted press and which never steps the session.
 */
export function RadioReceiverWorkspace({active,busy,antennaModal,dateOpen,parametersPresented,configurationOpen=false,catalogNow,pointingNow,readClockJD,perfNow,apiRef,receiverButtonRef,onSummaryChange,
 pulsarData,onOpenPulsarAnalysis,onSourcePicker,onReceiverOpened,onMainCloseMessage}:Props){
 const id=useId();
 const [session,setSession]=useState<RadioReceiverSession>(createRadioReceiverSession);
 const sessionRef=useRef(session);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [focus,setFocus]=useState<FocusTarget|null>(null);
 const serial=useRef(0);
 // R-RX17 WEB-RX17-10: the one-shot Record focus intent of a verified finish exit under a foreign modal (effect below the marks
 // refs). Any newer focus request or admitted action drops it.
 const [finishFocus,setFinishFocus]=useState<number|null>(null),finishFocusRef=useRef<number|null>(null);
 const dropFinishFocus=()=>{if(finishFocusRef.current!==null){finishFocusRef.current=null;setFinishFocus(null);}};
 const requestFocus=(kind:FocusTarget['kind'],slot:number)=>{dropFinishFocus();setFocus({kind,slot,serial:++serial.current});};
 const latest=useRef({active,busy,catalogNow,pointingNow,readClockJD,perfNow,pulsarData,onOpenPulsarAnalysis,onSourcePicker,onReceiverOpened,onMainCloseMessage});
 useLayoutEffect(()=>{latest.current={active,busy,catalogNow,pointingNow,readClockJD,perfNow,pulsarData,onOpenPulsarAnalysis,onSourcePicker,onReceiverOpened,onMainCloseMessage};});
 /** R-RX4 host requests, applied synchronously in order to the shared current dataset (WEB-REC-TXN). An 'acquire' is
  * answered at once through completeRecordArming, whose outcome becomes the notice. */
 const applyHost=(requests:readonly ReceiverRecordHostRequest[])=>{
  const data=latest.current.pulsarData;
  for(const h of requests){
   if(h.kind==='open-analysis'){latest.current.onOpenPulsarAnalysis?.();continue;}
   if(!data){if(h.kind==='acquire'){const r=stepSession(s=>completeRecordArming(s,{ok:false,reason:'lease-mismatch'}));setNotice({slot:0,outcome:r.outcome});}continue;}
   if(h.kind==='acquire'){
    const r=data.update(d=>acquirePulsarCaptureLease(d,h.id,h.generation,h.erase));
    const result:ReceiverRecordArmingResult=r.ok?{ok:true,seed:pulsarHeaderCells(r.doc.data)}:{ok:false,reason:r.reason};
    const done=stepSession(s=>completeRecordArming(s,result));setNotice({slot:0,outcome:done.outcome});
   }else if(h.kind==='release')data.update(d=>releasePulsarCaptureLease(d,h.id));
   else if(h.kind==='phase')data.update(d=>setPulsarCapturePhase(d,h.id,h.phase));
   else{
    // A capture without a header leaves the data unchanged; the session's explicit release still ends the lease.
    const input=radioCaptureInput(h.capture,h.name);
    if(input)data.update(d=>commitPulsarCapture(d,h.id,pulsarMemoryRecording(input)));
   }
  }
 };
 // [W] Defensive disposal: an unmount releases only the lease this session still holds, on the latest owner (a missing or
 // foreign lease is refused by id and changes nothing). The App never unmounts the workspace; review-only, no App witness.
 // R-RX17: a finish Save attempt pending at unmount is dead (epoch bump, mounted false) and its output claim is released only by
 // its own cleanup; the pure recorder would also refuse it once this lease object is gone (no mounted teardown witness exists).
 useEffect(()=>()=>{
  const id=sessionRef.current.record.leaseId;
  if(id!==null)latest.current.pulsarData?.update(d=>releasePulsarCaptureLease(d,id));
 },[]);
 const stepSession=(step:(s:RadioReceiverSession)=>ReceiverSessionTransition):ReceiverSessionTransition=>{
  const result=step(sessionRef.current);if(result.changed){sessionRef.current=result.session;setSession(result.session);}
  if(result.host)applyHost(result.host);
  return result;
 };
 const recordSnapshot=():ReceiverRecordHostSnapshot=>{
  const doc=latest.current.pulsarData?.current();
  if(!doc)return {generation:0,rows:0,saved:false,analysisBusy:false,leaseHeld:true};
  // R-RX15: +0x97 of the document: an imported file, or a memory capture whose verified copy is still valid (the unsaved
  // question is then skipped; the erase question is unchanged).
  return {generation:doc.generation,rows:pulsarDataRows(doc.data),saved:pulsarCurrentSaved(doc),analysisBusy:doc.analysis.modal||doc.analysis.reading,leaseHeld:doc.lease!==null};
 };
 /** User actions: only on the shown route outside a project operation. */
 const userAction=(slot:number|null,step:(s:RadioReceiverSession)=>ReceiverSessionTransition,text?:(r:ReceiverSessionTransition)=>string|undefined)=>{
  if(!latest.current.active||latest.current.busy)return null;
  dropFinishFocus();
  const result=stepSession(step);setNotice({slot,outcome:result.outcome,text:text?.(result)});return result;
 };
 const clockNow=()=>({jd:latest.current.readClockJD(),now:latest.current.perfNow()/RADIO_RECEIVER_SESSION_POLICY.msPerDay});

 // ---- Host API (the panel's Receiver button and the antenna transitions).
 /** WEB-PP-CUR-01: a committed transition whose picker 0x562830 ran reports it with the input it used. */
 const pickerRan=(r:ReceiverSessionTransition,input:Readonly<{catalog:PulsarCatalog|null;pointing:RadioPointing}>)=>{
  if(r.outcome.kind==='ok'&&r.outcome.events.some(e=>e.kind==='source-hit'||e.kind==='source-miss'))latest.current.onSourcePicker?.(input.catalog,input.pointing);
 };
 const open=()=>{
  const input={catalog:latest.current.catalogNow(),pointing:latest.current.pointingNow()};
  const r=userAction(null,s=>openReceiverWindow(s,input));
  if(r?.outcome.kind==='ok'){
   pickerRan(r,input);setNotice({slot:0,outcome:r.outcome});requestFocus('heading',0);
   if(r.outcome.events.some(e=>e.kind==='source-hit'||e.kind==='source-miss'))latest.current.onReceiverOpened?.();
  }
 };
 /** WEB-RX-CLK-01: a completed RA-13 tick reassociates with limit 5 from the latest catalog and the tick's pointing. */
 const antennaTransition=(tr:RadioLabTransition)=>{
  if(!completedRadioClockTick(tr)||!receiverSessionOpen(sessionRef.current))return;
  const input={catalog:latest.current.catalogNow(),pointing:tr.state.pointing};
  pickerRan(stepSession(s=>reassociateReceivers(s,input)),input);
 };
 const apiImpl=useRef({open,antennaTransition});
 useLayoutEffect(()=>{apiImpl.current={open,antennaTransition};});
 useLayoutEffect(()=>{
  apiRef.current=Object.freeze({open:()=>apiImpl.current.open(),antennaTransition:(tr:RadioLabTransition)=>apiImpl.current.antennaTransition(tr),
   hasReceivers:()=>receiverSessionOpen(sessionRef.current),
   sourceBuffer:()=>sessionRef.current.bank.sourceBuffer,boxRefusal:()=>receiverBoxRefusal(sessionRef.current),
   sessionNow:()=>sessionRef.current,
   commitPulsarList:(expected:RadioReceiverSession,t:ReceiverSessionTransition)=>{
    const o=t.outcome;
    if(sessionRef.current!==expected||o.kind!=='ok'||o.action!=='pulsar-list'||!t.changed||t.host!==undefined)return false;
    sessionRef.current=t.session;setSession(t.session);return true;
   },
   commitLiveOptions:(expected:RadioReceiverSession,t:ReceiverSessionTransition)=>{
    const o=t.outcome;
    if(sessionRef.current!==expected||o.kind!=='ok'||o.action!=='live-options'||!t.changed||t.host!==undefined)return false;
    sessionRef.current=t.session;setSession(t.session);return true;
   }});
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

 // ---- Close box and R-RX4 Record surfaces: presented only on the active route, with no project operation, no antenna
 // surface and no foreign native dialog. Otherwise they stay latent with their state (prompt, stage and Identify draft).
 const closePending=session.closeBox!==null&&active&&!busy,recordPending=recordDialogOpen(session)&&active&&!busy;
 const boxPending=closePending||recordPending;
 const foreign=useSyncExternalStore(boxPending?observeNativeModals:observeNothing,boxPending?nativeModalOpen:noNativeModal,noNativeModal);
 const boxPresented=boxPending&&!foreign&&!antennaModal;
 const closePresented=boxPresented&&closePending,recordPresented=boxPresented&&recordPending&&!closePending;
 // R-RX16 Save attempt bookkeeping (see the Save handlers below).
 const [saveSupport]=useState(()=>browserPulsarSaveSupport());
 const saveEpoch=useRef(0),saveRun=useRef<number|null>(null),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;saveEpoch.current++;};},[]);
 // R-RX16: the Save dialog's handlers act only while the Record surface is presented (read in handlers, set in the layout phase).
 const presentedRef=useRef(recordPresented);
 useLayoutEffect(()=>{presentedRef.current=recordPresented;});
 // R-RX16/R-RX17: a hidden route or a project operation makes a running Save attempt (arming or finish dialog) dead before
 // paint. Its continuation aborts an open stream and releases the output claim only after that cleanup settled; the dialog then
 // shows 'abandoned'. Never resumed: the epoch bump keeps it dead when the route returns. The finish lease stays held.
 useLayoutEffect(()=>{
  if(active&&!busy)return;
  const {prompt:p,finish:f}=sessionRef.current.record;
  if(p?.kind==='save'&&p.save.attempt!==null&&!p.save.abandoned){saveEpoch.current++;stepSession(s=>stepRecordSave(s,radioRecordSaveAbandoned));}
  else if(f?.stage==='save-file'&&f.save&&f.save.attempt!==null&&!f.save.abandoned){saveEpoch.current++;stepSession(s=>stepFinishSave(s,radioRecordSaveAbandoned));}
 },[active,busy]);// stepSession reads refs and stable setters only
 const hasReceivers=receiverSessionOpen(session),seedValid=session.seed.base!==null;
 const openSlots=session.bank.slots.filter((r):r is RadioReceiver=>r!==null);
 const sourceInBeam=headingSource(session.bank.slots[0]??null),receiverCount=openSlots.length;
 const frequencyCount=new Set(openSlots.map(r=>receiverLabels(r).frequency)).size;
 const recordPhase:RadioReceiverSummary['record']=session.record.receiving?'capturing':session.bank.recording.armed?'armed':'idle';
 const reported=useRef<RadioReceiverSummary|null>(null),reportTo=useRef(onSummaryChange);
 useLayoutEffect(()=>{reportTo.current=onSummaryChange;});
 useLayoutEffect(()=>{
  const prev=reported.current;
  if(prev&&prev.hasReceivers===hasReceivers&&prev.seedValid===seedValid&&prev.boxPending===boxPending&&prev.boxPresented===boxPresented
   &&prev.sourceInBeam===sourceInBeam&&prev.receivers===receiverCount&&prev.frequencies===frequencyCount&&prev.record===recordPhase)return;
  const next=Object.freeze({hasReceivers,seedValid,boxPending,boxPresented,sourceInBeam,receivers:receiverCount,frequencies:frequencyCount,record:recordPhase});
  reported.current=next;reportTo.current(next);
 },[hasReceivers,seedValid,boxPending,boxPresented,sourceInBeam,receiverCount,frequencyCount,recordPhase]);
 useLayoutEffect(()=>()=>{if(reported.current?.boxPresented)reportTo.current({...reported.current,boxPresented:false});},[]);

 // ---- Focus (WEB-RX-FOCUS-01, web policy only: native SetFocus/activation order is not reproduced).
 const headings=useRef<(HTMLHeadingElement|null)[]>([null,null,null]),closes=useRef<(HTMLButtonElement|null)[]>([null,null,null]);
 const addRef=useRef<HTMLButtonElement>(null),setupHeading=useRef<HTMLHeadingElement>(null),recordButton=useRef<HTMLButtonElement>(null),alignButton=useRef<HTMLButtonElement>(null);
 const moveButtons=useRef<Record<ReceiverMoveDirection,(HTMLButtonElement|null)[]>>({up:[null,null,null],down:[null,null,null]});
 useEffect(()=>{
  if(focus===null||nativeModalOpen())return;
  const m=moveButtons.current;
  const order=focus.kind==='heading'?[headings.current[focus.slot]]
   :focus.kind==='after-child-close'?[addRef.current,headings.current[0]]
   :focus.kind==='after-main-close'?[receiverButtonRef.current,setupHeading.current]
   :focus.kind==='record'?[recordButton.current,headings.current[0]]
   :focus.kind==='align'?[alignButton.current,headings.current[0]]
   :focus.kind==='move-up'?[m.up[focus.slot],m.down[focus.slot],headings.current[focus.slot]]
   :focus.kind==='move-down'?[m.down[focus.slot],m.up[focus.slot],headings.current[focus.slot]]
   :[closes.current[1]];
  order.find(canTakeFocus)?.focus();
 },[focus,receiverButtonRef]);

 const step=(slot:number,control:RadioReceiverControl,direction:'down'|'up')=>userAction(slot,s=>stepReceiver(s,slot,control,direction));
 const add=()=>{
  // R-RX5: a child FormCreate turns Align on (0x572614); after an Off the stack and the stale AlignDisp are announced.
  const wasOff=!sessionRef.current.bank.align.on,before=sessionRef.current.bank.slots;
  const r=userAction(0,addReceiverWindow,r=>{
   if(r.outcome.kind!=='ok'||!wasOff||!r.session.bank.align.on)return undefined;
   const reset=t('radioReceiver.status.addedAlignReset');
   return r.outcome.events.some(e=>e.kind==='record-disarmed')?`${t('radioReceiver.record.status.formCreate')} ${reset}`:reset;
  });
  const slot=[1,2].find(i=>before[i]===null&&r?.session.bank.slots[i]);
  if(slot!==undefined)requestFocus('heading',slot);
 };
 // ---- R-RX5 Align (docs/RADIO-RECEIVER-ALIGN.md). A lease the transition ended also releases its pointer capture.
 const align=()=>{
  const l=sessionRef.current.markLease,r=userAction(0,toggleReceiverAlignment);
  if(r?.outcome.kind!=='ok')return;
  if(l)releaseCapture(l);
  requestFocus('align',0);
 };
 /** WEB-RX-ALIGN-MOVE-01: one message-3 delivery for the pressed window. An edge press is answered by the session's refusal. */
 const move=(slot:number,dir:ReceiverMoveDirection)=>{
  const l=sessionRef.current.markLease;
  const r=userAction(slot,s=>moveReceiverWindow(s,slot,dir),r=>{
   if(r.outcome.kind!=='ok')return undefined;
   const a=r.session.arrangement;
   return r.session.bank.align.on?t('radioReceiver.window.status.restacked')
    :t('radioReceiver.window.status.moved',{n:slot+1,rank:receiverWindowRank(a,slot)??0,count:a.order.length});
  });
  if(r?.outcome.kind!=='ok')return;
  if(l)releaseCapture(l);
  requestFocus(dir==='up'?'move-up':'move-down',slot);
 };
 /** Mode is aria-disabled (not disabled) while a stop is pending, so focus stays on it; such a press does nothing. */
 const mode=(slot:number)=>{
  if(receiverControlAvailability(sessionRef.current,slot).mode!=='enabled')return;
  const input=clockNow();userAction(slot,s=>toggleReceiverMode(s,input));
 };
 const close=(slot:number)=>{
  // WEB-REC-TXN 7: the partial-rows text only when the close requested the capture commit (after Receive started).
  const r=userAction(slot,s=>requestReceiverClose(s,slot),r=>r.host?.some(h=>h.kind==='commit')?t('radioReceiver.record.status.partial'):undefined);
  if(r?.outcome.kind==='ok'&&r.session.bank.slots[slot]===null)requestFocus(slot===0?'after-main-close':'after-child-close',slot);
  if(r?.outcome.kind==='ok'&&r.outcome.events.some(e=>e.kind==='send-0x53a'))latest.current.onMainCloseMessage?.();
 };
 const dismissBox=()=>{if(stepSession(dismissReceiverCloseBox).changed)requestFocus('close1',1);};
 const paint=(slot:number)=>{stepSession(s=>paintReceiverWindow(s,slot));};

 // ---- R-RX4 Record (docs/RADIO-RECEIVER-RECORD.md). Each answer reads the latest current-dataset snapshot.
 const recordAdmitted=()=>latest.current.active&&!latest.current.busy;
 const recordStep=(step:(s:RadioReceiverSession)=>ReceiverSessionTransition,text?:(r:ReceiverSessionTransition)=>string|undefined)=>{
  if(!recordAdmitted())return null;
  dropFinishFocus();
  const r=stepSession(step);
  if(!r.host?.some(h=>h.kind==='acquire'))setNotice({slot:0,outcome:r.outcome,text:text?.(r)});
  return r;
 };
 const record=()=>{const snap=recordSnapshot();recordStep(s=>pressRecord(s,snap));};
 const answerPrompt=(answer:'no'|'ok'|'cancel')=>{
  const kind=sessionRef.current.record.prompt?.kind,snap=recordSnapshot();
  const r=recordStep(s=>answerRecordPrompt(s,answer,snap),r=>r.outcome.kind==='ok'&&answer==='cancel'&&kind==='unsaved'?t('radioReceiver.record.status.cancelled'):undefined);
  if(r&&!recordDialogOpen(r.session))requestFocus('record',0);
 };
 const recordFull=()=>{recordStep(dismissRecordFull);};
 const recordDraft=(text:string)=>{
  if(!recordAdmitted())return;
  stepSession(s=>editRecordIdentify(s,text));setNotice(n=>n?.outcome.action==='record-identify'&&n.outcome.kind==='web-refused'?null:n);
 };
 const recordIdentify=(answer:'ok'|'cancel')=>{recordStep(s=>answerRecordIdentify(s,answer));};
 const recordProperties=()=>{recordStep(closeRecordProperties);};
 const recordSave=(answer:'no'|'cancel')=>{
  const r=recordStep(s=>answerRecordSave(s,answer),()=>t(answer==='no'?'radioReceiver.record.status.analysis':'radioReceiver.record.status.kept'));
  if(r?.outcome.kind==='ok'&&answer==='cancel')requestFocus('record',0);
 };

 // ---- R-RX16 Radio-owned verified Save from the unsaved prompt (docs/RADIO-RECORD-SAVE.md). The session (stepSession) and the
 // shared document (pulsarData.update) are the only writers. saveEpoch: attempt tokens, never reset; a hidden route, a project
 // operation or an unmount makes the running attempt dead. saveRun: the token whose continuation still holds the shared output
 // claim; it is cleared only by that continuation. Support is detected once per mount (WEB-SAVE-01). The refs are declared
 // with the presentation state above.
 const saveStep=(step:(save:RadioRecordSave)=>RadioRecordSave)=>stepSession(s=>stepRecordSave(s,step));
 /** Yes (6) of the unsaved prompt: opens the Save dialog (no I/O, no picker) or, for a changed dataset, ends Record (Off). */
 const recordSaveYes=()=>{
  if(saveSupport!=='ok'||!presentedRef.current||nativeModalOpen())return;
  if(sessionRef.current.record.prompt?.kind!=='unsaved')return;
  const doc=latest.current.pulsarData?.current();if(!doc)return;
  const r=recordStep(s=>openRecordSave(s,doc),r=>r.outcome.kind==='ok'?RS('radioSave.status.opened'):undefined);
  if(r&&!recordDialogOpen(r.session))requestFocus('record',0);
 };
 /** Back (and Escape): the unsaved prompt again. Inert while an attempt holds the claim; a second click of a double-click is ignored. */
 const recordSaveBack=(detail=0)=>{
  if(detail>1||!presentedRef.current||saveRun.current!==null)return;
  const p=sessionRef.current.record.prompt;if(p?.kind!=='save'||p.save.attempt!==null)return;
  recordStep(s=>leaveRecordSave(s,{kind:'back'},recordSnapshot()),r=>r.outcome.kind==='ok'?RS('radioSave.status.back'):undefined);
 };
 // ---- R-RX17 Radio-owned verified Save from the finish Save question (docs/RADIO-FINISH-SAVE.md). Same refs, guards, host and
 // continuation as R-RX16; the finish dialog keeps the committed lease object and records through the owner-aware recorder.
 const finishSaveStep=(step:(save:RadioRecordSave)=>RadioRecordSave)=>stepSession(s=>stepFinishSave(s,step));
 /** Yes (6) of the finish Save question: opens the finish Save dialog (no I/O, no picker, the lease stays held). */
 const finishSaveYes=()=>{
  if(saveSupport!=='ok'||!presentedRef.current||nativeModalOpen())return;
  if(sessionRef.current.record.finish?.stage!=='save')return;
  const doc=latest.current.pulsarData?.current();if(!doc)return;
  recordStep(s=>openFinishSave(s,doc),r=>FS(r.outcome.kind==='ok'?'finishSave.status.opened':'finishSave.status.unavailable'));
 };
 /** Back (and Escape): the finish question again, lease kept. Inert while an attempt holds the claim; detail > 1 is ignored. */
 const finishSaveBack=(detail=0)=>{
  if(detail>1||!presentedRef.current||saveRun.current!==null)return;
  const f=sessionRef.current.record.finish;if(f?.stage!=='save-file'||!f.save||f.save.attempt!==null)return;
  recordStep(s=>leaveFinishSave(s,{kind:'back'}),r=>r.outcome.kind==='ok'?FS('finishSave.status.back'):undefined);
 };
 /**
  * Choose file and save… of either Radio Save dialog: synchronous up to showSaveFilePicker (no await before it, so the click's
  * user activation applies). A second click of a double-click (detail > 1) is ignored, so a double-click on Yes never reaches the
  * picker. Order: the guards, the R-RX14/R-RX15 request and owned claim (for the finish dialog bound to its lease object), the
  * shared output claim (radio, token), then the picker. A synchronous picker failure releases the claim at once.
  */
 const radioSaveChoose=(kind:RadioSaveKind,e:ReactMouseEvent<HTMLButtonElement>)=>{
  if(e.detail>1||saveSupport!=='ok'||!recordAdmitted()||!presentedRef.current||nativeModalOpen()||!mounted.current||saveRun.current!==null)return;
  const {prompt:p,finish:f}=sessionRef.current.record,data=latest.current.pulsarData;
  if(!data)return;
  let begun:RadioRecordSaveBegin,lease:PulsarCaptureLease|null=null;
  if(kind==='arming'){
   if(p?.kind!=='save'||p.save.attempt!==null)return;
   begun=radioRecordSaveBegin(p.save,data.current());
  }else{
   if(f?.stage!=='save-file'||!f.save||!f.lease||f.save.attempt!==null)return;
   lease=f.lease;begun=radioFinishSaveBegin(f.save,f.lease,data.current());
  }
  const step=kind==='arming'?saveStep:finishSaveStep;
  if(begun.kind==='refused'){const refused=begun.save;step(()=>refused);return;}
  const token=++saveEpoch.current;
  if(!data.update(d=>claimPulsarOutput(d,'radio',token)).ok){step(x=>radioRecordSaveRefused(x,{code:'not-ready'}));return;}
  const invoked=invokePulsarSavePicker(window);
  if(!invoked.ok){
   data.update(d=>releasePulsarOutput(d,'radio',token));
   step(x=>radioRecordSaveFailed(x,Object.freeze({code:'picker-refused' as const,fileName:null})));
   return;
  }
  saveRun.current=token;
  step(x=>radioRecordSaveStarted(x,token));
  void runRadioSave(kind,token,begun.claim,invoked.picked,lease);
 };
 /**
  * The asynchronous rest of one attempt (R-RX15 continuePulsarSave, unchanged). Live: the same token, mounted, the route shown
  * and no project operation; a foreign modal dialog does not stop it. Only recordPulsarWrittenCopy (arming) or
  * recordPulsarFinishWrittenCopy (finish, with the dialog's lease object and this token) makes a receipt. The output claim
  * (radio, token) is released only here, after the stream cleanup settled; then a verified attempt that is still live continues
  * in the same task: the arming dialog to the erase question (never the erase itself), the finish dialog to the end of the
  * finish (one release of the session's lease; the route stays Radio and no analysis opens).
  */
 async function runRadioSave(kind:RadioSaveKind,token:number,claim:PulsarWriteClaim,picked:Promise<SaveHandle>,lease:PulsarCaptureLease|null){
  const step=kind==='arming'?saveStep:finishSaveStep;
  const live=()=>token===saveEpoch.current&&mounted.current&&latest.current.active&&!latest.current.busy;
  const note=(n:PulsarSaveNotice)=>{if(live())step(x=>radioRecordSaveNoticed(x,token,n));};
  let verified:Readonly<{fileName:string;byteLength:number}>|null=null;
  try{
   const r=await continuePulsarSave(picked,()=>pulsarClaimBytes(claim),PULSAR_SAVE_READBACK_MAX_BYTES,{live,phase:(code,fileName)=>note(Object.freeze({code,fileName}))});
   if(r.kind==='dead'||!live())return;
   if(r.kind!=='readback'){note(Object.freeze({code:r.kind,fileName:'fileName' in r?r.fileName:null}));return;}
   const data=latest.current.pulsarData;if(!data)return;
   const check=pulsarClaimReadback(claim,r.bytes);
   const owner=kind==='finish'&&lease!==null?Object.freeze({lease,outputToken:token}):null;
   const written=owner?data.update(d=>recordPulsarFinishWrittenCopy(d,claim,owner,r.bytes,r.fileName)):data.update(d=>recordPulsarWrittenCopy(d,claim,r.bytes,r.fileName));
   if(!written.ok){note(pulsarSaveRefusalNotice(written.reason,check,r.fileName));return;}
   note(Object.freeze({code:'verified' as const,fileName:r.fileName}));
   verified=Object.freeze({fileName:r.fileName,byteLength:claim.text.length});
  }catch{
   // Not expected (every browser failure is mapped by the host); still reported as unverified, never as success.
   note(Object.freeze({code:'unverified' as const,fileName:null}));
  }finally{
   latest.current.pulsarData?.update(d=>releasePulsarOutput(d,'radio',token));
   if(saveRun.current===token)saveRun.current=null;
   if(mounted.current)step(x=>radioRecordSaveSettled(x,token));
  }
  const done=verified;
  if(done===null||!live())return;
  if(kind==='finish'){
   const doc=latest.current.pulsarData?.current();
   const r=stepSession(s=>leaveFinishSave(s,{kind:'verified',fileName:done.fileName,byteLength:done.byteLength},doc));
   setNotice({slot:0,outcome:r.outcome,text:r.outcome.kind==='ok'?FS('finishSave.status.verified',{file:done.fileName,bytes:done.byteLength}):undefined});
   // Under a foreign modal the generic focus effect would drop the request; a one-shot intent waits for the last modal to close.
   if(r.outcome.kind==='ok'){if(nativeModalOpen()){const k=++serial.current;finishFocusRef.current=k;setFinishFocus(k);}else requestFocus('record',0);}
   return;
  }
  const snap=recordSnapshot();
  const r=stepSession(s=>leaveRecordSave(s,{kind:'verified',fileName:done.fileName,byteLength:done.byteLength},snap));
  if(!r.host?.some(h=>h.kind==='acquire'))setNotice({slot:0,outcome:r.outcome,text:r.outcome.kind==='ok'?PT('pulsar.save.verified',{file:done.fileName,bytes:done.byteLength}):undefined});
 }

 // ---- R-RX3 marks (docs/RADIO-RECEIVER-MARKS.md). One pointer lease across the bank, read from sessionRef (never from a
 // rendered snapshot). Presses need the shown route, no project operation, no surface over the cards and no foreign dialog.
 const cardsInert=antennaModal||dateOpen||parametersPresented||configurationOpen||boxPresented;
 const inertRef=useRef(cardsInert);
 useLayoutEffect(()=>{inertRef.current=cardsInert;});
 // R-RX17 WEB-RX17-10 (web policy): a verified finish exit under a foreign modal focuses Record once, at the first moment no
 // modal dialog is open. The modal subscription exists only while the intent is pending, so a later unrelated dialog never
 // refocuses Record. A hidden route, a project operation, an unmount or a newer admitted action or focus request drops it.
 const finishForeign=useSyncExternalStore(finishFocus!==null?observeNativeModals:observeNothing,finishFocus!==null?nativeModalOpen:noNativeModal,noNativeModal);
 useEffect(()=>{
  if(finishFocus===null||finishForeign)return;
  const ok=finishFocusRef.current===finishFocus&&latest.current.active&&!latest.current.busy&&!inertRef.current&&!nativeModalOpen()&&!recordDialogOpen(sessionRef.current);
  finishFocusRef.current=null;setFinishFocus(null);// one attempt, whatever happens
  if(ok)[recordButton.current,headings.current[0]].find(canTakeFocus)?.focus();
 },[finishFocus,finishForeign]);// reads refs and a stable setter only
 useLayoutEffect(()=>{if(!active||busy)dropFinishFocus();},[active,busy]);
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

 // ---- R-RX13 trace audition (docs/RADIO-RECEIVER-AUDITION.md). The pure lease state is kept like the session (ref plus
 // state); the host exists only after the first admitted press. Nothing here steps the session.
 const [audition,setAudition]=useState<ReceiverAuditionState>(createReceiverAuditionState);
 const auditionRef=useRef(audition),hostRef=useRef<ReceiverAuditionHost|null>(null);
 const applyAudition=(step:ReceiverAuditionStep)=>{
  if(step.state!==auditionRef.current){auditionRef.current=step.state;setAudition(step.state);}
  if(step.stop!==null)hostRef.current?.stop(step.stop);
 };
 const auditionEnv=():ReceiverAuditionEnvironment=>({active:latest.current.active,busy:latest.current.busy,modal:inertRef.current||nativeModalOpen(),
  hidden:document.visibilityState==='hidden'});
 const stopAudition=(cause:ReceiverAuditionCause)=>applyAudition(stopReceiverAudition(auditionRef.current,cause));
 /** Host events re-check the latest route and session before a lease is shown as playing. */
 const hostEvent=(e:ReceiverAuditionHostEvent)=>{
  if(e.kind!=='running'){applyAudition(receiverAuditionEnded(auditionRef.current,e.generation,e.kind));return;}
  const cause=receiverAuditionInvalidation(auditionRef.current,sessionRef.current.bank,auditionEnv());
  if(cause){hostRef.current?.stop(e.generation);applyAudition(receiverAuditionEnded(auditionRef.current,e.generation,cause));return;}
  applyAudition(receiverAuditionRunning(auditionRef.current,e.generation));
 };
 const hostEventRef=useRef(hostEvent);
 useLayoutEffect(()=>{hostEventRef.current=hostEvent;});
 /** One press: refused without any host call unless admitted; a stop is applied before a start, all inside the gesture. */
 const pressAudition=(slot:number)=>{
  const env=auditionEnv();
  if(!env.active||env.busy||env.modal||env.hidden){applyAudition({state:refuseReceiverAudition(auditionRef.current,slot,'unavailable'),stop:null,start:null});return;}
  const step=pressReceiverAudition(auditionRef.current,sessionRef.current.bank,slot);
  applyAudition(step);
  if(!step.start)return;
  const host=hostRef.current??=createReceiverAuditionHost(browserReceiverAuditionDeps(),e=>hostEventRef.current(e));
  const g=step.start.generation,result=host.start(g,step.start.pcm);
  if(result==='running')applyAudition(receiverAuditionRunning(auditionRef.current,g));
  else if(result!=='pending')applyAudition(receiverAuditionFailed(auditionRef.current,g,result));
 };
 // Session, route, project operation or a surface over the cards: the lease is checked before paint; never resumed.
 useLayoutEffect(()=>{
  const cause=receiverAuditionInvalidation(auditionRef.current,sessionRef.current.bank,auditionEnv());
  if(cause)stopAudition(cause);
  const pruned=pruneReceiverAudition(auditionRef.current,sessionRef.current.bank);
  if(pruned!==auditionRef.current)applyAudition({state:pruned,stop:null,start:null});
 },[session,active,busy,cardsInert]);// applyAudition/auditionEnv read refs and a stable setter only
 // While a lease exists: page hidden, pagehide and a foreign modal dialog (checked; ordinary DOM changes do not stop it).
 const auditioning=audition.active!==null;
 useEffect(()=>{
  if(!auditioning)return;
  const hidden=()=>{if(document.visibilityState==='hidden')stopAudition('document-hidden');};
  const pagehide=()=>stopAudition('document-hidden');
  const unobserve=observeNativeModals(()=>{if(nativeModalOpen())stopAudition('modal');});
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',pagehide);
  return ()=>{unobserve();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',pagehide);};
 },[auditioning]);
 useEffect(()=>()=>{hostRef.current?.stopAll();},[]);
 const auditionAdmitted=active&&!busy&&!cardsInert;
 const cardAudition=(slot:number):CardAudition=>{
  const a=audition.active,phase=a&&a.slot===slot?a.phase==='playing'?'playing':'starting':'idle';
  const source=receiverAuditionSource(session.bank,slot);
  const reason=!source.ok?auditionReasonText(source.reason,source.column):auditionAdmitted?'':t('radioReceiver.audition.reason.unavailable');
  return {phase,available:auditionAdmitted&&source.ok,reason,status:auditionText(audition.notices[slot as 0|1|2]??null)};
 };

 const next=nextReceiverSeed(session);
 const order=session.arrangement.order;
 // WEB-RX16-04: the verified note follows the committed document's current receipt; the prompt's `verified` keeps its origin.
 const shownPrompt=session.record.prompt;
 const eraseNote=shownPrompt?.kind==='erase'&&pulsarData?radioRecordEraseNote(shownPrompt.verified,shownPrompt.generation,pulsarData.doc):null;
 return <div className="radio-receiver-workspace" data-testid="receiver-workspace" data-timer={session.bank.timerEnabled} data-align={session.bank.align.on?'on':'off'}
  data-order={order.join(',')}>
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
    {notice&&(notice.slot===null||session.bank.slots[notice.slot]===null)?noticeText(notice):''}</p>
  </section>
  {/* WEB-RX-ALIGN-NOREMOUNT: keyed by slot in one parent, so a reorder moves the same card instances (no Paint, no overlay
     reset, canvas bitmaps kept). */}
  {order.map(slot=>{const r=session.bank.slots[slot];return r&&<ReceiverCard key={slot} r={r} session={session} log={session.canvases[slot]} overlay={session.markOverlays[slot]}
   inert={cardsInert} notice={notice&&notice.slot===slot?noticeText(notice):''} headingRef={el=>{headings.current[slot]=el;}} closeRef={el=>{closes.current[slot]=el;}}
   addRef={slot===0?addRef:undefined} onStep={step} onAdd={add} onMode={mode} onClose={close} onPaint={paint} marks={markHandlers}
   recordHost={!!pulsarData} recordRef={slot===0?recordButton:undefined} onRecord={record}
   alignRef={slot===0?alignButton:undefined} onAlign={align} onMove={move} moveRef={(dir,el)=>{moveButtons.current[dir][slot]=el;}}
   audition={cardAudition(slot)} onAudition={pressAudition}/>;})}
  {closePresented&&session.closeBox&&<ReceiverCloseBox caption={session.closeBox.caption} text={session.closeBox.text} onDismiss={dismissBox}
   closeFirst={session.bank.slots.reduce((h,r,i)=>r?i+1:h,1)}/>}
  <div className="radio-control" style={{display:'contents'}} data-testid="receiver-record-layer" data-modal-pending={recordPending} data-modal-presented={recordPresented}>
   {recordPresented&&session.record.prompt&&(session.record.prompt.kind==='save'
    ?<RecordSaveBox kind="arming" save={session.record.prompt.save} onChoose={e=>radioSaveChoose('arming',e)} onBack={recordSaveBack}/>
    :<RecordPromptBox prompt={session.record.prompt} note={eraseNote} support={saveSupport} onAnswer={answerPrompt} onYes={recordSaveYes}/>)}
   {recordPresented&&session.record.finish&&(session.record.finish.stage==='save-file'&&session.record.finish.save
    ?<RecordSaveBox kind="finish" save={session.record.finish.save} onChoose={e=>radioSaveChoose('finish',e)} onBack={finishSaveBack}/>
    :<RecordFinishSurface finish={session.record.finish} support={saveSupport} onFull={recordFull} onDraft={recordDraft} onIdentify={recordIdentify}
     onProperties={recordProperties} onSave={recordSave} onSaveYes={finishSaveYes}
     refusal={notice?.outcome.kind==='web-refused'&&notice.outcome.action==='record-identify'?noticeText(notice):''}/>)}
  </div>
 </div>;
}

/** Keys of a Record box: held Enter/Escape ignored, Escape answers the box's Cancel path, Tab stays inside. */
const boxKeys=(e:KeyboardEvent<HTMLDivElement>,root:HTMLElement|null,escape:()=>void)=>{
 if(ignoreHeldKey(e))return;
 if(e.key==='Escape'){e.preventDefault();escape();return;}
 trapTab(e,root);
};
/** RC-REC-03 prompts as application-modal boxes with the recovered captions and texts. unsaved (flags 0x13): R-RX16 Yes opens
 * the Radio-owned web Save dialog (WEB-RX16-01; disabled with its reason when the browser lacks the save file picker); No and
 * Cancel are the recovered paths; WEB default button Cancel (the native default is Yes). erase (flags 0x41): OK (the native
 * default) and Cancel; after a verified Save (WEB-RX16-08) the prompt arrives asynchronously, so Cancel is the web default
 * instead. The verified note (`note`, WEB-RX16-04) is shown only while the current receipt still matches it; a later dataset
 * change hides it and keeps the Cancel default. Escape is Cancel. Enter activates the focused button (no global Enter). Held
 * keys are ignored. */
function RecordPromptBox({prompt,note,support,onAnswer,onYes}:Readonly<{prompt:Exclude<ReceiverRecordPrompt,{kind:'save'}>;note:ReceiverRecordVerified|null;
 support:PulsarSaveSupport;onAnswer:(a:'no'|'ok'|'cancel')=>void;onYes:()=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),first=useRef<HTMLButtonElement>(null);
 useEffect(()=>{first.current?.focus();},[prompt.kind]);
 const L=RADIO_RECORD_LITERALS,unsaved=prompt.kind==='unsaved',saveOk=support==='ok';
 // arrived: how the question was reached (asynchronously after a verified Save): the Cancel default, its paragraph and
 // data-verified. note: whether the receipt is still current: the verified paragraph and its aria-describedby entry.
 const arrived=prompt.kind==='erase'&&prompt.verified!==undefined;
 const reason=saveOk?`${RS('radioSave.yes.reason')} ${RS('radioSave.yes.webDefault')}`
  :`${RS(support==='insecure-context'?'radioSave.yes.unsupported.insecure-context':'radioSave.yes.unsupported.no-api')} ${RS('radioSave.yes.webDefaultUnsupported')}`;
 const okButton=<button ref={arrived?undefined:first} type="button" className="primary-button" data-testid="receiver-record-ok" onClick={()=>onAnswer('ok')}>{t('radioReceiver.record.ok')}</button>;
 const cancelButton=(primary:boolean)=><button ref={primary?first:undefined} type="button" className={primary?'primary-button':'secondary-button'} data-testid="receiver-record-cancel"
  onClick={()=>onAnswer('cancel')}>{t('radioReceiver.record.cancel')}</button>;
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={note?`${id}-body ${id}-verified`:`${id}-body`}
   className="antenna-dialog antenna-notice radio-receiver-save" data-testid="receiver-record-prompt" data-kind={prompt.kind} data-verified={arrived||undefined}
   onKeyDown={e=>boxKeys(e,root.current,()=>onAnswer('cancel'))}>
   <h3 id={`${id}-title`} className="radio-control-native">{unsaved?L.unsavedCaption:L.eraseCaption}</h3>
   <p id={`${id}-body`} className="radio-control-native" style={{whiteSpace:'pre-line'}} data-testid="receiver-record-prompt-text">{unsaved?L.unsavedText:L.eraseText}</p>
   {unsaved&&<p id={`${id}-gated`} className="radio-control-note" data-testid="receiver-record-yes-reason" data-support={support}>{reason}</p>}
   {note&&<p id={`${id}-verified`} className="radio-control-note" data-testid="receiver-record-erase-verified">{RS('radioSave.erase.verified',{file:note.fileName,bytes:note.byteLength})}</p>}
   {arrived&&<p className="radio-control-note" data-testid="receiver-record-erase-default">{RS('radioSave.erase.webDefault')}</p>}
   <p className="radio-control-note">{t('radioReceiver.record.boxNote')}</p>
   <div className="button-row">
    {unsaved?<>
     <button type="button" className="secondary-button" disabled={!saveOk} aria-haspopup={saveOk?'dialog':undefined} aria-describedby={`${id}-gated`} data-testid="receiver-record-yes"
      onClick={onYes}>{t('radioReceiver.record.yes')}</button>
     <button type="button" className="secondary-button" data-testid="receiver-record-no" onClick={()=>onAnswer('no')}>{t('radioReceiver.record.no')}</button>
     {cancelButton(true)}
    </>:<>{okButton}{cancelButton(arrived)}</>}
   </div>
  </div>
 </div>;
}

/**
 * R-RX16 Radio-owned Save dialog (WEB-RX16-02/08). The R-RX14 canonical preview of the capture (scope, model-origin warning,
 * inactive receivers, rounding list or the build refusal) and the R-RX15 warnings, phases and results, with the shared R-RX15
 * wording. Choose file and save… is its own click (synchronous up to the picker). Back (also Escape) returns to the Record
 * question. While an attempt holds the output claim, Choose and Back are aria-disabled (focus stays) and do nothing. Back
 * takes focus when the dialog opens. Every text that can hold a chosen name wraps anywhere.
 * R-RX17 (docs/RADIO-FINISH-SAVE.md): kind 'finish' is the same dialog opened by the finish Save question's Yes, with its own
 * heading, intro, Back, pending, not-ready, abandoned and busy texts and the receiver-finish-save test ids; Back returns to the
 * finish question. kind 'arming' renders exactly the R-RX16 dialog.
 */
function RecordSaveBox({kind,save,onChoose,onBack}:Readonly<{kind:RadioSaveKind;save:RadioRecordSave;onChoose:(e:ReactMouseEvent<HTMLButtonElement>)=>void;onBack:(detail?:number)=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),back=useRef<HTMLButtonElement>(null);
 useEffect(()=>{back.current?.focus();},[]);
 const X=RADIO_SAVE_TEXTS[kind],T=X.testId;
 const s=save.session,d=s.data,p=s.preview,notice=s.save??null,pending=save.attempt!==null;
 const inactive=([0,1,2] as const).filter(i=>i>d.highestIndex).map(i=>i+1);
 const shown=notice!==null&&(PULSAR_SAVE_PENDING.has(notice.code)||notice.code==='verified');
 const status=notice!==null&&shown&&!save.abandoned?recordSaveNoticeText(notice,X.abandoned):pending&&save.abandoned?X.busy:'';
 const failure=notice!==null&&!shown?notice:null;
 const refusal=s.refusal===null?'':s.refusal.code==='build'?rawProblemText(s.refusal.problem)
  :s.refusal.code==='not-ready'?X.notReady:PT('pulsar.save.refusal.stale');
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro ${id}-scope`} aria-busy={pending||undefined}
   className="antenna-dialog antenna-notice radio-receiver-save" data-testid={T} data-pending={pending} data-abandoned={save.abandoned}
   onKeyDown={e=>boxKeys(e,root.current,()=>onBack())}>
   <h3 id={`${id}-title`}>{X.heading}</h3>
   <p id={`${id}-intro`} className="radio-control-note" data-testid={`${T}-intro`}>{X.intro}</p>
   <p id={`${id}-scope`} className="radio-control-note" data-testid={`${T}-scope`}>
    {PT('pulsar.rawExport.scope',{rows:d.rowCount,capture:d.captureId,name:d.name,receivers:d.highestIndex+1})}</p>
   <p className="radio-control-note radio-receiver-save-warning" data-testid={`${T}-origin`}>{PT('pulsar.save.origin',{file:RAW_EXPORT_FILE_NAME})}</p>
   <p className="radio-control-note" data-testid={`${T}-format`}>{PT('pulsar.rawExport.format')}</p>
   <p className="radio-control-note" data-testid={`${T}-inactive`}>{inactive.length?PT('pulsar.rawExport.inactive',{list:inactive.join(', ')}):PT('pulsar.rawExport.inactiveNone')}</p>
   <p className="radio-control-note radio-receiver-save-warning" data-testid={`${T}-warning`}>{PT('pulsar.save.warning')}</p>
   <p className="radio-control-note" data-testid={`${T}-how`}>{PT('pulsar.save.how')}</p>
   <p className="radio-control-note" data-testid={`${T}-extension`}>{PT('pulsar.save.extensionRule')}</p>
   {p.ok?<section aria-labelledby={`${id}-loss`} data-testid={`${T}-loss`}>
    <h4 id={`${id}-loss`}>{PT('pulsar.rawExport.loss.heading')}</h4>
    <ul>
     <li data-testid={`${T}-loss-header`}>{p.loss.header.length?PT('pulsar.rawExport.loss.header',{fields:p.loss.header.map(f=>PT(RAW_FIELD_LABEL[f])).join(', ')}):PT('pulsar.rawExport.loss.headerNone')}</li>
     <li data-testid={`${T}-loss-samples`}>{PT('pulsar.rawExport.loss.samples',{changed:p.loss.samplesChanged,total:p.rowCount*3,zeroed:p.loss.samplesZeroed})}</li>
     <li>{PT('pulsar.rawExport.loss.memory')}</li>
    </ul>
   </section>:<p role="alert" className="radio-receiver-alert" data-testid={`${T}-problem`} data-code={p.problem.code}>{rawProblemText(p.problem)}</p>}
   {refusal&&<p role="alert" className="radio-receiver-alert" data-testid={`${T}-refusal`} data-code={s.refusal?.code}>{refusal}</p>}
   <p className="radio-control-status" role="status" aria-live="polite" data-testid={`${T}-status`}
    data-code={shown&&!save.abandoned&&notice?notice.code:pending&&save.abandoned?'busy':''}>{status}</p>
   {failure&&<p role="alert" className="radio-receiver-alert" data-testid={`${T}-alert`} data-code={failure.code}
    data-reason={'reason' in failure?failure.reason:undefined}>{recordSaveNoticeText(failure,X.abandoned)}</p>}
   {pending&&<p className="radio-control-note" data-testid={`${T}-pending`}>{X.pendingNote}</p>}
   <div className="button-row">
    <button type="button" className="primary-button" disabled={!p.ok} aria-disabled={pending||undefined} data-testid={`${T}-choose`}
     onClick={onChoose}>{PT(notice?.code==='extension'?'pulsar.save.chooseAgain':'pulsar.save.choose')}</button>
    <button ref={back} type="button" className="secondary-button" aria-disabled={pending||undefined} data-testid={`${T}-back`}
     onClick={e=>onBack(e.detail)}>{X.back}</button>
   </div>
  </div>
 </div>;
}

type FinishProps=Readonly<{finish:ReceiverRecordFinish;support:PulsarSaveSupport;onFull:()=>void;onDraft:(text:string)=>void;onIdentify:(a:'ok'|'cancel')=>void;onProperties:()=>void;
 onSave:(a:'no'|'cancel')=>void;onSaveYes:()=>void;refusal:string}>;
/** RC-REC-08 finish dialogs, one at a time (WEB-REC-BATCH: after the tick batch): the full box, Identify (TStrIpDlg), the
 * modal Properties of the committed capture, then the Save question (flags 0x23). R-RX17 (WEB-RX17-01): its Yes opens the
 * Radio-owned finish Save dialog where the browser offers the save file picker (otherwise disabled with its reason); No and
 * Cancel are the R-RX4 answers; WEB default button Cancel (the native default is Yes). */
function RecordFinishSurface({finish,support,onFull,onDraft,onIdentify,onProperties,onSave,onSaveYes,refusal}:FinishProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),focusTarget=useRef<HTMLElement|null>(null);
 const stage=finish.stage,L=RADIO_RECORD_LITERALS;
 useEffect(()=>{const el=focusTarget.current;el?.focus();if(el instanceof HTMLInputElement)el.select();},[stage]);
 // The committed memory recording, for the Properties text (the same formatter as Pulsar Analysis).
 const memory=useMemo(()=>{const input=finish.committed?radioCaptureInput(finish.capture,finish.name):null;return input?pulsarMemoryRecording(input):null;},[finish.committed,finish.capture,finish.name]);
 const escape=stage==='full'?onFull:stage==='identify'?()=>onIdentify('cancel'):stage==='properties'?onProperties:()=>onSave('cancel');
 const box=(caption:string,body:ReactNode,buttons:ReactNode,note?:string)=><div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role={stage==='identify'||stage==='properties'?'dialog':'alertdialog'} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`}
   className="antenna-dialog antenna-notice" data-testid="receiver-record-finish" data-stage={stage} onKeyDown={e=>boxKeys(e,root.current,escape)}>
   <h3 id={`${id}-title`} className="radio-control-native">{caption}</h3>
   <div id={`${id}-body`}>{body}</div>
   {note&&<p className="radio-control-note">{note}</p>}
   <div className="button-row">{buttons}</div>
  </div>
 </div>;
 const ref=(el:HTMLElement|null)=>{focusTarget.current=el;};
 if(stage==='full')return box(L.fullCaption,<p className="radio-control-native" data-testid="receiver-record-full-text">{L.fullText}</p>,
  <button ref={ref} type="button" className="primary-button" data-testid="receiver-record-full-ok" onClick={onFull}>{t('radioReceiver.record.ok')}</button>,t('radioReceiver.record.fullNote'));
 if(stage==='identify'){
  const issue=radioIdentifyIssue(finish.draft);
  return box(L.identifyCaption,<div className="antenna-field">
   <label htmlFor={`${id}-name`} className="radio-control-native">{L.identifyLabel}</label>
   <input ref={ref} id={`${id}-name`} type="text" autoComplete="off" spellCheck={false} data-testid="receiver-record-identify-input" value={finish.draft}
    aria-invalid={issue!==null||undefined} aria-describedby={`${id}-help ${id}-refusal`} maxLength={RADIO_IDENTIFY_POLICY.draftLimit}
    onChange={e=>onDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();onIdentify('ok');}}}/>
   <span id={`${id}-help`} className="radio-control-note">{t('radioReceiver.record.identifyHelp')}</span>
   {finish.draft===PULSAR_RESERVED_DATA_NAME&&<span className="radio-control-note" data-testid="receiver-record-identify-nodata">{t('radioReceiver.record.identifyNoData')}</span>}
   <span id={`${id}-refusal`} className="radio-control-note" role="status" aria-live="polite" data-testid="receiver-record-identify-refusal">{refusal}</span>
  </div>,<>
   <button type="button" className="primary-button" data-testid="receiver-record-identify-ok" onClick={()=>onIdentify('ok')}>{RADIO_IDENTIFY_DFM.ok}</button>
   <button type="button" className="secondary-button" data-testid="receiver-record-identify-cancel" onClick={()=>onIdentify('cancel')}>{RADIO_IDENTIFY_DFM.cancel}</button>
  </>);
 }
 if(stage==='properties'){
  const props=memory?pulsarDataProperties(memory):null,P='radioReceiver.record.properties.';
  return box(t('radioReceiver.record.propertiesHeading'),props&&<>
   <p className="radio-control-note">{t('radioReceiver.record.propertiesNote')}</p>
   <dl className="radio-control-state">
    {(['object','start','aperture','interval','points','file'] as const).map(k=><div key={k}><dt>{t(`${P}${k}` as `radioReceiver.record.properties.${typeof k}`)}</dt>
     <dd className="radio-control-native" data-testid={`receiver-record-prop-${k}`}>{props.fields[k]}</dd></div>)}
   </dl>
   <table className="radio-receiver-record-table">
    <thead><tr><th scope="col">{t('radioReceiver.record.properties.receiver')}</th><th scope="col">{t('radioReceiver.record.properties.frequency')}</th><th scope="col">{t('radioReceiver.record.properties.gain')}</th></tr></thead>
    <tbody>{props.receivers.map(r=><tr key={r.receiver} data-testid={`receiver-record-prop-receiver-${r.receiver+1}`}><th scope="row">{r.receiver+1}</th><td>{r.frequency}</td><td>{r.gain}</td></tr>)}</tbody>
   </table>
  </>,<button ref={ref} type="button" className="primary-button" data-testid="receiver-record-properties-ok" onClick={onProperties}>{t('radioReceiver.record.ok')}</button>);
 }
 const saveOk=support==='ok';
 const reason=saveOk?`${FS('finishSave.yes.reason')} ${FS('finishSave.yes.webDefault')}`
  :`${FS(support==='insecure-context'?'finishSave.yes.unsupported.insecure-context':'finishSave.yes.unsupported.no-api')} ${FS('finishSave.yes.webDefaultUnsupported')}`;
 return box(L.saveCaption,<>
  <p className="radio-control-native" style={{whiteSpace:'pre-line'}} data-testid="receiver-record-save-text">{L.saveText}</p>
  <p id={`${id}-gated`} className="radio-control-note" data-testid="receiver-record-save-yes-reason" data-support={support}>{reason}</p>
 </>,<>
  <button type="button" className="secondary-button" disabled={!saveOk} aria-haspopup={saveOk?'dialog':undefined} aria-describedby={`${id}-gated`}
   data-testid="receiver-record-save-yes" onClick={onSaveYes}>{t('radioReceiver.record.yes')}</button>
  <button type="button" className="secondary-button" data-testid="receiver-record-save-no" onClick={()=>onSave('no')}>{t('radioReceiver.record.no')}</button>
  <button ref={ref} type="button" className="primary-button" data-testid="receiver-record-save-cancel" onClick={()=>onSave('cancel')}>{t('radioReceiver.record.cancel')}</button>
 </>,t('radioReceiver.record.boxNote'));
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
 marks:MarkHandlers;recordHost:boolean;recordRef?:RefObject<HTMLButtonElement|null>;onRecord:()=>void;
 alignRef?:RefObject<HTMLButtonElement|null>;onAlign:()=>void;onMove:(slot:number,dir:ReceiverMoveDirection)=>void;moveRef:(dir:ReceiverMoveDirection,el:HTMLButtonElement|null)=>void;
 audition:CardAudition;onAudition:(slot:number)=>void}>;
/** One TRcvr_Form1 as a card: the native caption, the display and the controls in DFM TabOrder, then the web mark controls,
 * the R-RX5 window-position group and the R-RX13 web trace audition group. */
function ReceiverCard({r,session,log,overlay,inert,notice,headingRef,closeRef,addRef,onStep,onAdd,onMode,onClose,onPaint,marks,recordHost,recordRef,onRecord,
 alignRef,onAlign,onMove,moveRef,audition,onAudition}:CardProps){
 const id=useId(),slot=r.index,main=slot===0,labels=receiverLabels(r),avail=receiverControlAvailability(session,slot);
 // R-RX5: AlignDisp is the stored caption; after a FormCreate reset it can say No while Align is on (WEB-RX-ALIGN-LABEL-01).
 const aligned=session.bank.align.on,alignStale=main&&aligned&&labels.align===L.no;
 const rank=receiverWindowRank(session.arrangement,slot)??0,count=session.arrangement.order.length,moves=receiverWindowMoveAvailability(session,slot);
 const moveButton=(dir:ReceiverMoveDirection)=><button ref={el=>moveRef(dir,el)} type="button" className="secondary-button" data-testid={`receiver-move-${dir}-${slot}`}
  aria-label={t(dir==='up'?'radioReceiver.window.upLabel':'radioReceiver.window.downLabel',{n:slot+1})} aria-disabled={moves[dir]!=='enabled'||undefined}
  aria-describedby={`${id}-window-help`} onKeyDown={ignoreHeldKey} onClick={()=>onMove(slot,dir)}>{t(dir==='up'?'radioReceiver.window.up':'radioReceiver.window.down')}</button>;
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
 return <section className="card radio-control radio-receiver-card" aria-labelledby={`${id}-caption`} data-testid={`receiver-card-${slot}`} inert={inert||undefined}
  data-rank={rank} data-stacked={!main&&aligned||undefined}>
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
   {main&&<button ref={addRef} type="button" className="secondary-button" data-testid="receiver-add" disabled={avail.add!=='enabled'}
    aria-describedby={session.bank.recording.armed?`${id}-add-disarms`:undefined} onKeyDown={ignoreHeldKey} onClick={onAdd}>{D.add}</button>}
   {main&&<button ref={alignRef} type="button" className="secondary-button" data-testid="receiver-align" disabled={avail.align!=='enabled'} aria-pressed={aligned}
    aria-describedby={alignStale?`${id}-align ${id}-align-stale`:`${id}-align`} onKeyDown={ignoreHeldKey} onClick={onAlign}>{D.align}</button>}
   {main&&<button type="button" className="primary-button" data-testid="receiver-mode" aria-disabled={avail.mode!=='enabled'||undefined} aria-describedby={finishing?`${id}-sweep`:undefined}
    onKeyDown={ignoreHeldKey} onClick={()=>{if(avail.mode==='enabled')onMode(slot);}}>{D.mode}</button>}
   {main&&<button ref={recordRef} type="button" className="secondary-button" data-testid="receiver-record" disabled={avail.record!=='enabled'||!recordHost}
    aria-describedby={`${id}-record`} onKeyDown={ignoreHeldKey} onClick={onRecord}>{D.record}</button>}
   <button ref={closeRef} type="button" className="secondary-button" data-testid={`receiver-close-${slot}`} onKeyDown={ignoreHeldKey} onClick={()=>onClose(slot)}>{t('radioReceiver.control.close')}</button>
  </div>
  {main&&session.bank.recording.armed&&<p id={`${id}-add-disarms`} role="note" className="radio-control-note radio-receiver-alert" data-testid="receiver-add-disarms">{t('radioReceiver.record.addDisarms')}</p>}
  {main&&<p id={`${id}-align`} className="radio-control-note" data-testid="receiver-align-note" data-on={aligned}>{t(aligned?'radioReceiver.align.on':'radioReceiver.align.off')}</p>}
  {alignStale&&<p id={`${id}-align-stale`} className="radio-control-note" data-testid="receiver-align-stale">{t('radioReceiver.align.staleOn')}</p>}
  {main&&<div id={`${id}-record`} className="radio-control-note" data-testid="receiver-record-state" data-armed={session.bank.recording.armed} data-capturing={session.record.receiving}
   data-rows={session.bank.recording.rows.length/3} data-full={session.bank.recording.full}>
   <p>{recordHost?RS('radioSave.scope'):t('radioReceiver.record.noHost')}</p>
   {session.record.receiving?<p data-testid="receiver-record-capturing">{t('radioReceiver.record.capturing',{rows:session.bank.recording.rows.length/3})}</p>
    :session.bank.recording.armed&&session.record.leaseId!==null?<p data-testid="receiver-record-armed">{t('radioReceiver.record.armed')}</p>:null}
  </div>}
  <dl className="radio-control-state radio-receiver-indicators">
   <dt>{t('radioReceiver.card.modeDisp')}</dt><dd className="radio-control-native" data-testid={`receiver-mode-disp-${slot}`}>{labels.mode}</dd>
   {labels.align!==null&&<><dt>{t('radioReceiver.card.alignDisp')}</dt><dd className="radio-control-native" data-testid="receiver-align-disp">{labels.align}</dd></>}
   {main&&<><dt>{t('radioReceiver.card.recordDisp')}</dt><dd className="radio-control-native" data-testid="receiver-record-disp" data-native-record-display={labels.record} data-armed={session.bank.recording.armed}>{t(session.bank.recording.armed?'radioAccess.values.on':'radioAccess.values.off')}</dd></>}
  </dl>
  <p id={`${id}-sweep`} data-testid={`receiver-sweep-${slot}`} data-position={r.position??''} data-receiving={r.receiving} data-stop-pending={r.stopPending===true} data-timer={session.bank.timerEnabled}>
   {r.position===null?t('radioReceiver.card.sweepNone'):finishing?t('radioReceiver.card.finishing',{position:r.position,width:r.sweepWidth}):t('radioReceiver.card.sweep',{position:r.position,width:r.sweepWidth})}</p>
  {main&&<p data-testid="receiver-source">{r.identifiedName===null?t('radioReceiver.card.sourceNone'):t('radioReceiver.card.source',{name:r.identifiedName})}</p>}
  {main&&error?<p role="alert" className="radio-receiver-alert" data-testid="receiver-tick-error" data-kind={error.kind}>{t('radioReceiver.tickError',{reason:t(`radioReceiver.error.${error.kind}`)})}</p>:null}
  <ReceiverMarks slot={slot} r={r} overlay={overlay} availability={receiverMarkAvailability(session,slot)} selected={selected} onSelect={setSelected} marks={marks}/>
  <div className="radio-receiver-window" role="group" aria-labelledby={`${id}-window`} data-testid={`receiver-window-${slot}`} data-rank={rank} data-count={count}>
   <span id={`${id}-window`} className="radio-receiver-window-legend">{t('radioReceiver.window.legend')}</span>
   <span data-testid={`receiver-window-position-${slot}`}>{t('radioReceiver.window.position',{rank,count})}</span>
   <div className="button-row">{moveButton('up')}{moveButton('down')}</div>
   <p id={`${id}-window-help`} className="radio-control-note">{t('radioReceiver.window.help')}</p>
  </div>
  {/* R-RX13: aria-disabled (not disabled) when idle and unavailable, so focus stays and a press announces the reason. */}
  <div className="radio-receiver-audition" role="group" aria-labelledby={`${id}-audition`} data-testid={`receiver-audition-${slot}`} data-phase={audition.phase}
   data-available={audition.available}>
   <span id={`${id}-audition`} className="radio-receiver-window-legend">{t('radioReceiver.audition.legend')}</span>
   <div className="button-row">
    <button type="button" className="secondary-button" data-testid={`receiver-audition-button-${slot}`}
     aria-label={t(audition.phase==='idle'?'radioReceiver.audition.playLabel':'radioReceiver.audition.stopLabel',{n:slot+1})}
     aria-disabled={audition.phase==='idle'&&!audition.available||undefined} aria-describedby={`${id}-audition-help ${id}-audition-reason`}
     onKeyDown={ignoreHeldKey} onClick={()=>onAudition(slot)}>{t(audition.phase==='idle'?'radioReceiver.audition.play':'radioReceiver.audition.stop')}</button>
   </div>
   <p id={`${id}-audition-help`} className="radio-control-note">{t('radioReceiver.audition.help')}</p>
   <p id={`${id}-audition-reason`} className="radio-control-note" data-testid={`receiver-audition-reason-${slot}`}>{audition.reason}</p>
   <p className="radio-control-status" role="status" aria-live="polite" data-testid={`receiver-audition-status-${slot}`}>{audition.status}</p>
  </div>
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
 * Escape closes it. Focus returns to the slot-1 Close button. WEB-RX-ALIGN-CLOSE-01: the refusal is by slot, not position;
 * the native literal stays verbatim and a web note names the highest open receiver (closeFirst) wherever its card is. */
function ReceiverCloseBox({caption,text,closeFirst,onDismiss}:Readonly<{caption:string;text:string;closeFirst:number;onDismiss:()=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{button.current?.focus();},[]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(ignoreHeldKey(e))return;
  if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();onDismiss();return;}
  trapTab(e,root.current);
 };
 return <div className="radio-control" style={{display:'contents'}}>
  <div className="antenna-backdrop antenna-backdrop-top">
   <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body ${id}-order`} className="antenna-dialog antenna-notice" data-testid="receiver-close-box" onKeyDown={onKeyDown}>
    <h3 id={`${id}-title`} className="radio-control-native">{caption}</h3>
    <p id={`${id}-body`} className="radio-control-native" data-testid="receiver-close-box-text">{text}</p>
    <p id={`${id}-order`} className="radio-control-note" data-testid="receiver-close-box-order">{t('radioReceiver.box.closeOrder',{n:closeFirst})}</p>
    <p className="radio-control-note">{t('radioReceiver.box.note')}</p>
    <div className="button-row">
     <button ref={button} type="button" className="primary-button" data-testid="receiver-close-box-ok" onClick={onDismiss}>{t('radioReceiver.box.ok')}</button>
    </div>
   </div>
  </div>
 </div>;
}
