import {StrictMode,useEffect,useId,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore,type FocusEvent,type KeyboardEvent,type ReactNode,type RefObject} from 'react';
import {createRoot} from 'react-dom/client';
import {
 INITIAL_RADIO_CONTROL,NATIVE_CAPTIONS,RANDOM_ACCESS_RANGE_MS,clickRadioSwitch,closeRadioPanel,enterRadioPulsarsExercise,menuCaptionText,
 parseDishDiameter,pressRadioSwitchKey,radioIdCaptionLabel,reopenRadioPanel,scopeTimerTick,selectRadioAccess,
 type DomeByte,type RadioControlState,type RadioEnvironment,type RadioOutcome,type RadioTransition,
} from '../core/radioControl';
import {
 INITIAL_RADIO_LAB,NOTICE_BUTTONS,RADIO_COMPILED_ENVIRONMENT,RADIO_COMPILED_OPTIONS,RADIO_LAB_CAPTIONS,RADIO_LAB_CONSTANTS,RADIO_WEB_OPTION_PROFILE,SKY_COORDS_CAPTIONS,
 SKY_COORDS_FIELD_MAX_LENGTH,SKY_COORDS_WEB_DOMAIN,activateRadioLab,answerNotice,cancelSkyCoords,changeSlewRate,confirmSkyCoords,editSkyCoordsField,formatFixed,
 isRadioLabModal,isRadioLabOptions,isSupportedRadioLabProfile,openSetCoordinates,radioClockTick,radioLabProfileIssues,radioLabRateIssues,radioLabTickRefusal,selectSkyCoordsEpoch,slewTimerTick,splitSexagesimal,toggleTracking,
 MANUAL_DIRECTIONS,RADIO_MANUAL_WEB_DOMAIN,RADIO_OPTIONS_CAPTIONS,heldManualDirection,manualButtonCaption,manualButtonEnabled,manualSlewTick,pressManualSlew,radioLabManualRefusal,radioLabManualTickRefusal,releaseManualSlew,
 releaseManualSlewThrough,RADIO_HOT_LIST_LITERALS,closeRadioHotList,openRadioHotList,selectRadioHotListIndex,slewToHotListSelection,skyCoordsDraftTarget,skyCoordsPrefillMinusLost,
 type ManualDirection,type NoticeAnswer,type RadioLabManualRefusal,type RadioLabManualTickRefusal,type RadioLabNotice,type RadioLabNoticeKind,type RadioLabOptions,type RadioLabOutcome,type RadioLabProfileIssue,type RadioLabRateIssue,
 type RadioLabState,type RadioLabTransition,type SkyCoordsDialog,type SkyCoordsField,
} from '../core/radioAntenna';
import {RADIO_EPOCH_POLE_THRESHOLD_DEGREES} from '../core/radioEpoch';
import {MANUAL_HOLD_KEYS,manualInputStep,type ManualCancelReason,type ManualExternalCancel,type ManualInputEvent,type ManualInputOwner} from '../core/radioManualInput';
import {browserTableKey,type BrowserKeyInput} from '../core/radioKeyboard';
import {RADIO_CLOCK_CONSTANTS,type RadioClockRead,type RadioClockReading} from '../core/radioClock';
import {startRadioTimer,type RadioTimerHost} from '../core/radioTimer';
import {createRadioTranslator,type RadioMessageKey,type RadioTranslate} from './RadioMessages';
import {createRadioAntennaTranslator,type RadioAntennaMessageKey,type RadioAntennaTranslate} from './RadioAntennaMessages';
import {HTL_MAX_BYTES,HtlError,parseHtl,type HtlErrorCode} from '../core/hotList';
import {radioHotListProjection,type RadioHotListRow} from '../core/radioHotList';
import {beginHotListRead,cancelHotListRead,commitHotListRead,failHotListRead,type SharedHotList} from '../core/sharedHotList';
import type {SharedHotListHandle} from '../useSharedHotList';
import RadioHotListDialog from './RadioHotListDialog';
import {ignoreHeldKey,nativeModalOpen,noNativeModal,observeNativeModals,observeNothing,trapTab} from './radioModal';
import './RadioControlPanel.css';

export type RadioControlPanelProps=Readonly<{
 /** Controlled recovered control state; apply `transition.state` in onTransition. */
 state:RadioControlState;
 /** Inputs owned outside this slice (dome byte, option byte, diameter, other Window items). */
 environment:RadioEnvironment;
 onTransition:(transition:RadioTransition)=>void;
 /** When given, the panel shows explicit scenario-input controls. Omit when the host owns them. */
 onEnvironmentChange?:(environment:RadioEnvironment)=>void;
 translate?:RadioTranslate;
 /** Deliver the recovered 1 ms ScopeTimer ticks automatically (default true). Timer callbacks are not user actions:
  * they also run while an antenna dialog or message box is open. */
 autoScopeTimer?:boolean;
 /** Controlled TRadioLab antenna state (start from INITIAL_RADIO_LAB). Without it the panel window shows no antenna controls. */
 antenna?:RadioLabState;
 onAntennaTransition?:(transition:RadioLabTransition)=>void;
 /** Telescope options; default RADIO_COMPILED_OPTIONS (compiled defaults, no options file). Values outside the
  * supported web profile (radioLabProfileIssues, WEB-OPT-01) are shown as a browser limit and suspend the antenna. */
 antennaOptions?:RadioLabOptions;
 antennaTranslate?:RadioAntennaTranslate;
 /** Deliver SlewTimer2 callbacks on a nominal 100 ms browser interval (default true); otherwise a manual tick button is shown. */
 autoSlewTimer?:boolean;
 /** WEB host adapter (default true). Pass false while the host hides the panel (for example an inactive route): the
  * coordinate dialog and message boxes are then not presented and take no focus, while their state (draft, open box) is
  * kept and presented again when the panel is active. Timers are not affected: a TTimer keeps running while its form is
  * hidden, so a slew continues and can arrive in the background. */
 active?:boolean;
 /** WEB safety policy (default false), for a host project operation: no dialog or box is presented and the ScopeTimer and
  * SlewTimer2 registrations are cancelled. When it ends a fresh registration starts; elapsed time is not caught up. */
 hostBusy?:boolean;
 /** Reports whether a coordinate dialog or message box is actually presented: active, not host-busy and no native modal
  * <dialog> of the page open (those stay topmost; ours waits for them to close). Called only when the value changes,
  * false once at mount, and false when the panel unmounts while presenting. The latest callback receives each change. */
 onModalPresentedChange?:(presented:boolean)=>void;
 /** RA-13 radio clock owned by the host (an explicit web UT scenario, radioClock.ts). Without it no clock tick runs and
  * Right Ascension does not drift. `read` is called only from callbacks and handlers, never while rendering. */
 radioClock?:RadioClockSource;
 /** When given, the panel shows the explicit radio options scenario (web subset: the recovered Limit Slewing flag with
  * the options' horizon limit read only) and calls this with the applied options. Omit when the host owns the options. */
 onAntennaOptionsChange?:(options:RadioLabOptions)=>void;
 /** The shared HTL document (sharedHotList.ts). When given, Slew ▸ Hot List (View/Select, the disabled Add, Load) is
  * shown; radio Load is its only radio writer. Without it no hot-list item is rendered. */
 hotList?:SharedHotListHandle;
 /** When given, the TRadioLab Receiver button (Rcvr1Btn, TabOrder 6) is rendered; the host owns the receiver windows and
  * names why the button is unavailable. Without it no button is rendered. */
 receiver?:RadioReceiverButton;
 /** R-RX9 (default false): the dish diameter env+0x37ab is record+0x916 of the radio options, owned by the host's numeric
  * authority. The scenario's diameter editor, Apply, Cancel and Clear are disabled with a note, the compiled-defaults preset
  * writes only the access option byte, and the handlers re-check the latest value; the other inputs stay usable. */
 managedDiameter?:boolean;
}>;
export type RadioReceiverButtonReason='available'|'not-activated'|'receiver-disabled'|'no-catalog'|'catalog-reading'|'seed-invalid'|'modal'|'inactive';
export type RadioReceiverButton=Readonly<{available:boolean;reason:RadioReceiverButtonReason;onOpen:()=>void;buttonRef:RefObject<HTMLButtonElement|null>}>;
export type RadioClockSource=Readonly<{
 /** The scenario reading now; the host stops its scenario itself when this reports a domain overrun. */
 read:()=>RadioClockRead;
 /** UT and longitude are applied and the scenario has not stopped at the range limit (enables the manual tick). */
 supplied:boolean;
 /** UT and longitude are applied but the scenario stopped at the range limit: the panel names the limit instead of
  * reporting nothing supplied. */
 domain:boolean;
 /** Deliver ClocktimerTimer callbacks on the nominal 1000 ms browser interval (WEB-TIMER-02). */
 autoTick:boolean;
 /** Scenario generation: a new value restarts the registration and late callbacks of the earlier one are ignored. */
 run:number;
}>;

/** Browser interval host for the timer registrations (WEB-TIMER-01). */
const BROWSER_TIMER:RadioTimerHost={setInterval:(callback,ms)=>window.setInterval(callback,ms),clearInterval:handle=>window.clearInterval(handle as number)};

const DOME_BYTES:readonly DomeByte[]=[0,1,2,3];
const englishRadio=createRadioTranslator(),englishAntenna=createRadioAntennaTranslator();
/** RC outcomes whose wording lives in the scoped antenna catalog (shared en.json is outside this slice). */
const SCOPED_RC_OUTCOMES:Partial<Record<RadioOutcome,RadioAntennaMessageKey>>={'panel-hidden-switch-off':'antenna.outcome.panel-hidden-switch-off'};
const outcomeText=(o:RadioOutcome,t:RadioTranslate,ta:RadioAntennaTranslate)=>{const scoped=SCOPED_RC_OUTCOMES[o];return scoped?ta(scoped):t(`radio.outcome.${o}` as RadioMessageKey);};
/** Per-keystroke and per-tick outcomes are not announced in the live status line. */
const QUIET_OUTCOMES:ReadonlySet<RadioLabOutcome>=new Set(['slew-tick','field-edited','epoch-selected','clock-tick','manual-tick','manual-idle','hot-list-index-selected']);
const antennaOutcomeText=(o:RadioLabOutcome,ta:RadioAntennaTranslate)=>o==='field-too-long'?ta('antenna.outcome.field-too-long',{max:SKY_COORDS_FIELD_MAX_LENGTH}):ta(`antenna.outcome.${o}` as RadioAntennaMessageKey);

/** Message-box category and MessageBox flags operand (0x47e09c); null flags = browser box, explained by `note`. With
 * flags, `note` (default antenna.notice.native) explains the wording and receives the flags. */
const NOTICE_META:Readonly<Record<RadioLabNoticeKind,{title:RadioAntennaMessageKey;flags:string|null;note?:RadioAntennaMessageKey}>>={
 'ra-invalid':{title:'antenna.notice.title.error',flags:'0x10'},'dec-invalid':{title:'antenna.notice.title.error',flags:'0x10'},
 'ra-unsupported':{title:'antenna.notice.title.unsupported',flags:null,note:'antenna.notice.webDomain'},
 'dec-unsupported':{title:'antenna.notice.title.unsupported',flags:null,note:'antenna.notice.webDomain'},
 'no-slew-needed':{title:'antenna.notice.title.warning',flags:'0x30'},
 'transit-dec-only':{title:'antenna.notice.title.info',flags:'0x41'},'confirm-slew':{title:'antenna.notice.title.question',flags:'0x24'},
 'stop-slew':{title:'antenna.notice.title.question',flags:'0x24'},'slew-complete':{title:'antenna.notice.title.info',flags:'0x40'},
 // RA-12 boxes: the original literals are typed-decoded, but the wording here is OpenVireo's (nativeParaphrase).
 'altitude-limit-tracking':{title:'antenna.notice.title.limit',flags:'0x10',note:'antenna.notice.nativeParaphrase'},
 'altitude-limit-manual':{title:'antenna.notice.title.limit',flags:'0x10',note:'antenna.notice.nativeParaphrase'},
 'altitude-limit-request':{title:'antenna.notice.title.limit',flags:'0x10',note:'antenna.notice.nativeParaphrase'},
 'altitude-undecided':{title:'antenna.notice.title.limitUndecided',flags:null,note:'antenna.notice.altitudePolicy'},
 // RA-HL-06: decoded caption/text (RADIO_HOT_LIST_LITERALS). RA-HL-05: text 0x591f38 not decoded.
 'hot-list-empty':{title:'antenna.notice.title.hot-list-empty',flags:'0x40',note:'antenna.notice.nativeLiteral'},
 'hot-list-no-selection':{title:'antenna.notice.title.warning',flags:'0x30'},
};
const BUTTON_KEYS:Readonly<Record<NoticeAnswer,RadioAntennaMessageKey>>={ok:'antenna.button.ok',cancel:'antenna.button.cancel',yes:'antenna.button.yes',no:'antenna.button.no'};
/** Windows MessageBox convention (inference): Escape answers OK on an OK box and Cancel on OK/Cancel; Yes/No boxes ignore it. */
const escapeAnswer=(kind:RadioLabNoticeKind):NoticeAnswer|null=>{const b=NOTICE_BUTTONS[kind];return b.includes('cancel')?'cancel':b.length===1?'ok':null;};

const raText=(ta:RadioAntennaTranslate,ra:number)=>{const p=splitSexagesimal(ra,2);return ta('antenna.format.ra',{h:p.whole,m:p.minutes,s:formatFixed(p.seconds,2)});};
const decText=(ta:RadioAntennaTranslate,dec:number)=>{const p=splitSexagesimal(dec,1);return ta('antenna.format.dec',{sign:p.sign<0?'−':'+',d:p.whole,m:p.minutes,s:formatFixed(p.seconds,1)});};
function noticeText(n:RadioLabNotice,ta:RadioAntennaTranslate):string{
 if(n.kind==='confirm-slew')return n.transit?ta('antenna.notice.confirm-slew-transit',{dec:decText(ta,n.target.dec)}):ta('antenna.notice.confirm-slew',{ra:raText(ta,n.target.ra),dec:decText(ta,n.target.dec)});
 if(n.kind==='ra-unsupported'||n.kind==='dec-unsupported')return ta(`antenna.notice.${n.kind}.${n.reason}`,{limit:SKY_COORDS_WEB_DOMAIN.magnitudeLimit});
 if(n.kind==='altitude-limit-manual')return ta('antenna.notice.altitude-limit-manual',{direction:ta(`antenna.direction.${n.direction}`)});
 if(n.kind==='altitude-limit-request')return ta(n.transit?'antenna.notice.altitude-limit-request-transit':'antenna.notice.altitude-limit-request');
 if(n.kind==='altitude-undecided')return ta(`antenna.notice.altitude-undecided.${n.reason}`);
 if(n.kind==='hot-list-empty')return ta('antenna.notice.hot-list-empty',{text:RADIO_HOT_LIST_LITERALS.emptyText});
 return ta(`antenna.notice.${n.kind}` as RadioAntennaMessageKey);
}
const noticeTitle=(n:RadioLabNotice,ta:RadioAntennaTranslate)=>n.kind==='hot-list-empty'?ta('antenna.notice.title.hot-list-empty',{caption:RADIO_HOT_LIST_LITERALS.emptyCaption}):ta(NOTICE_META[n.kind].title);
/** Radio Load status (WEB-HL-05/06). */
type HotLoadStatus=Readonly<{kind:'reading';name:string}|{kind:'loaded';name:string;count:number}|{kind:'cancelled'}|{kind:'stale'}
 |{kind:'refused';reason:'optical-draft'|'read-pending'|'modal'|'menu'|'inactive'}|{kind:'error';code:HtlErrorCode|'read';row:number}>;
function hotLoadText(s:HotLoadStatus,ta:RadioAntennaTranslate):string{
 switch(s.kind){
  case 'reading':return ta('antenna.hotList.reading',{name:s.name});
  case 'loaded':return ta('antenna.hotList.loaded',{name:s.name,count:s.count});
  case 'cancelled':return ta('antenna.hotList.cancelled');
  case 'stale':return ta('antenna.hotList.stale');
  case 'refused':return ta(`antenna.hotList.refused.${s.reason}`);
  case 'error':{const message=ta(`antenna.hotList.error.${s.code}`);return s.row?ta('antenna.hotList.errorAt',{row:s.row,message}):ta('antenna.hotList.errorMessage',{message});}
 }
}
/** The options' horizon limit in degrees (× Extended 0x5a93ec ≈ 180/π, as TRadiOptsDlg.FormActivate 0x5a9255 converts
 * it) with six decimals, and in radians; presentation only. */
const horizonText=(o:RadioLabOptions)=>({degrees:formatFixed(o.minimumAltitudeRadians*RADIO_LAB_CONSTANTS.radiansToDegrees,6),radians:String(o.minimumAltitudeRadians)});
function profileIssueText(issue:RadioLabProfileIssue,options:RadioLabOptions,ta:RadioAntennaTranslate):string{
 if(issue.kind==='initial-declination')return ta('antenna.profile.initial-declination',{latitude:String(options.latitudeRadians)});
 if(issue.kind==='rate-not-advancing')return ta('antenna.profile.rate-not-advancing',{base:options.rateBase,index:issue.index});
 return ta('antenna.profile.ra-step',{index:issue.index,hours:issue.raStepHours.toPrecision(4),limit:RADIO_WEB_OPTION_PROFILE.raStepLimitHours});
}
/** SlewTimer2 Extended 0x5678d0 as shown in the notes: hours and the same value in seconds of time. */
const TOLERANCE_TEXT={tolerance:String(RADIO_LAB_CONSTANTS.initialRaToleranceHours),seconds:(RADIO_LAB_CONSTANTS.initialRaToleranceHours*3600).toPrecision(2)};
/** Source |Dec| from which the recovered precession takes its polar branch ((π/2 − 0.01) rad in degrees), rounded for
 * display ("about"); the branch itself is decided in radians. */
const POLE_THRESHOLD_TEXT=formatFixed(RADIO_EPOCH_POLE_THRESHOLD_DEGREES,3);
type StartRateIssue=Extract<RadioLabRateIssue,{context:'start'}>;
/** The way back from a refused start, from the live panel controls: enabled Slew Rate buttons or a Tracking button that
 * enables them (both behind an open dialog or box first need it closed, as every press returns modal-open there), or
 * neither: trackingVisible is fixed at the first FormActivate, so the remaining routes are the live alternatives. */
function startRecovery(i:StartRateIssue,lab:RadioLabState,ta:RadioAntennaTranslate):string{
 if(lab.rateSpinEnabled||lab.trackingVisible){
  const recovery=ta(lab.rateSpinEnabled?'antenna.rateLimit.recovery.enabled':'antenna.rateLimit.recovery.tracking');
  // The transit note's OK leads on to the slew confirmation, so only its Cancel releases the buttons at once.
  const kind=lab.notice?.kind;
  const first=lab.dialog?'antenna.rateLimit.recovery.firstDialog':kind==='confirm-slew'?'antenna.rateLimit.recovery.firstConfirm':kind==='transit-dec-only'?'antenna.rateLimit.recovery.firstTransit':kind?'antenna.rateLimit.recovery.firstNotice':null;
  return first?ta('antenna.rateLimit.recovery.afterModal',{first:ta(first),recovery}):recovery;
 }
 const raise=maximumRaisePossible(lab.rateIndex);
 const items=[...(raise?[ta('antenna.rateLimit.alternative.maximum',{index:lab.rateIndex})]:[]),ta('antenna.rateLimit.alternative.instant')];
 // raStepOnly: live options are non-transit and only the RA step fails, so transit on or a Dec-only target also start.
 if(i.raStepOnly)items.push(ta('antenna.rateLimit.alternative.transit'),ta('antenna.rateLimit.alternative.coordinates',TOLERANCE_TEXT));
 const alternatives=items.length===1?items[0]:ta('antenna.rateLimit.alternative.last',{items:items.slice(0,-1).join(ta('antenna.rateLimit.alternative.separator')),last:items[items.length-1]});
 return raise?ta('antenna.rateLimit.recovery.hidden',{alternatives}):ta('antenna.rateLimit.recovery.hiddenNoMaximum',{alternatives,index:lab.rateIndex});
}
/** Whether some option record inside the supported web profile has a maximum index above `index`, so that the start loop
 * would raise a kept index. Rate base 1 (the smallest positive Integer) gives the smallest Dec and RA steps at every index,
 * so when it is outside the profile at maximum index + 1 every rate base is. Under WEB-OPT-01 this is false from index 8
 * on (index 9 would need an RA step of about 18.5 h). Presentation only: no option or rate is changed. */
function maximumRaisePossible(index:number):boolean{
 return Number.isInteger(index)&&index>=0&&index<255&&isSupportedRadioLabProfile({...RADIO_COMPILED_OPTIONS,transitTelescope:false,instantSlew:false,limitsEnabled:false,rateBase:1,maxRateIndex:index+1});
}
function rateIssueText(i:RadioLabRateIssue,lab:RadioLabState,ta:RadioAntennaTranslate):string{
 const {rate,issue}=i,cause=issue.kind==='ra-step'?ta('antenna.rateLimit.cause.ra-step',{hours:issue.raStepHours.toPrecision(4),limit:RADIO_WEB_OPTION_PROFILE.raStepLimitHours}):ta('antenna.rateLimit.cause.rate-not-advancing');
 const values={index:issue.index,rate:String(rate),cause,...TOLERANCE_TEXT};
 if(i.context!=='start')return ta(`antenna.rateLimit.${i.context}`,values);
 const start={...values,recovery:startRecovery(i,lab,ta)};
 // A pending target (the valid draft or the committed confirmation target) is named; otherwise the note says which coordinates it covers.
 if(i.target)return ta(i.raStepOnly?'antenna.rateLimit.startTargetRaStep':'antenna.rateLimit.startTarget',{...start,ra:raText(ta,i.target.ra),dec:decText(ta,i.target.dec)});
 return ta(i.raStepOnly?'antenna.rateLimit.startRaStep':'antenna.rateLimit.start',start);
}
/** Browser-limit reasons shown inside the open dialog or confirmation box (WEB-OPT-01), next to the refused OK/Yes. */
function ModalLimit({lead,reasons,testId}:Readonly<{lead:string;reasons:readonly string[];testId:string}>){
 return <div className="antenna-modal-limit" aria-live="polite">
  {reasons.length>0&&<div data-testid={testId}><p>{lead}</p><ul>{reasons.map(text=><li key={text}>{text}</li>)}</ul></div>}
 </div>;
}
/** The KeyboardEvent fields the RA-19 decoder reads (never keyCode/which/charCode). */
const domKey=(e:KeyboardEvent<HTMLElement>):BrowserKeyInput=>({key:e.key,code:e.code,location:e.location,ctrlKey:e.ctrlKey,altKey:e.altKey,metaKey:e.metaKey,
 altGraph:e.getModifierState('AltGraph'),isComposing:e.nativeEvent.isComposing});
/** WEB-KEY-03 key scope: the TRadioLab controls the DFM wires to FormKeyDown/FormKeyUp that the panel renders (Tracking and
 * N/S/E/W; RateSpin has no key handler; Receiver stays outside: whether Rcvr1Btn is wired to FormKeyDown is not established). */
const KEY_SCOPE='[data-antenna-key-scope]';

export default function RadioControlPanel({state,environment,onTransition,onEnvironmentChange,translate=englishRadio,autoScopeTimer=true,
 antenna,onAntennaTransition,antennaOptions=RADIO_COMPILED_OPTIONS,antennaTranslate=englishAntenna,autoSlewTimer=true,active=true,hostBusy=false,onModalPresentedChange,radioClock,onAntennaOptionsChange,hotList,receiver,managedDiameter=false}:RadioControlPanelProps){
 const t=translate,ta=antennaTranslate,id=useId();
 const managedRef=useRef(managedDiameter);
 useLayoutEffect(()=>{managedRef.current=managedDiameter;});
 const [outcome,setOutcome]=useState<RadioOutcome|null>(null),[envError,setEnvError]=useState(false);
 const [antennaOutcome,setAntennaOutcome]=useState<RadioLabOutcome|null>(null),[antennaError,setAntennaError]=useState(false);
 const envDiameterText=environment.dishDiameterMeters===null?'':String(environment.dishDiameterMeters);
 const [draft,setDraft]=useState(envDiameterText),[draftInvalid,setDraftInvalid]=useState(false);
 useEffect(()=>{setDraft(envDiameterText);setDraftInvalid(false);},[envDiameterText]);
 // WEB-RSO-OWN-01: the hand-over to a managed diameter withdraws an earlier draft's invalid mark; the unapplied draft text
 // is kept but neither shown nor applied while managed (the editor shows the current value).
 useEffect(()=>{if(managedDiameter)setDraftInvalid(false);},[managedDiameter]);
 const antennaModal=antenna?isRadioLabModal(antenna):false;
 // WEB presentation ownership: the pending dialog or box (logical state, kept in `antenna`) is rendered only while the
 // host shows the panel, no project operation runs and no native modal dialog of the page is open.
 const modalPending=antennaModal&&active&&!hostBusy;
 // A manual hold also observes foreign modals, which cancel it (WEB-MANUAL-01).
 const manualLatched=antenna?.manualPress??false,observeModals=modalPending||manualLatched;
 const foreignModal=useSyncExternalStore(observeModals?observeNativeModals:observeNothing,observeModals?nativeModalOpen:noNativeModal,noNativeModal);
 const presented=antennaModal&&active&&!hostBusy&&!foreignModal;
 // A dialog or box removed because presentation was suppressed must not move focus (to a hidden or inert control); it
 // takes focus again when it is presented. Read by the views' cleanups, which run after this commit's layout effects.
 const suppressed=useRef(false);
 useLayoutEffect(()=>{suppressed.current=antennaModal&&!presented;});
 // The latest host callback receives each change; a new callback identity alone reports nothing. Reported in the layout
 // phase so the host can make its own controls inert before paint; an unmount while presenting reports false.
 const reportTo=useRef(onModalPresentedChange),reported=useRef<boolean|null>(null);
 useLayoutEffect(()=>{reportTo.current=onModalPresentedChange;});
 const [reportPresented]=useState(()=>(value:boolean)=>{if(reported.current!==value){reported.current=value;reportTo.current?.(value);}});
 useLayoutEffect(()=>{reportPresented(presented);if(presented)return ()=>reportPresented(false);},[reportPresented,presented]);
 // Shape-invalid options keep surfacing as the generic error from the transitions themselves.
 const profileIssues=useMemo(()=>isRadioLabOptions(antennaOptions)?radioLabProfileIssues(antennaOptions):[],[antennaOptions]);
 const profileSupported=profileIssues.length===0;
 // State-context rate limits (radioLabRateIssues) only matter once the option record itself is supported.
 const rateIssues=useMemo(()=>antenna&&profileSupported&&isRadioLabOptions(antennaOptions)?radioLabRateIssues(antenna,antennaOptions):[],[antenna,antennaOptions,profileSupported]);
 // The same pure gate slewTimerTick applies (radioLabTickRefusal): no registration while the next callback would be
 // refused, and the refusal names the cause shown in Motion. A stored rate no step of the slew takes any more (RA
 // phase, transit, a switch within the RA tolerance) or not yet (Dec callbacks) never suspends it.
 const slewRefusal=useMemo(()=>!profileSupported?'options-unsupported':antenna!==undefined&&isRadioLabOptions(antennaOptions)?radioLabTickRefusal(antenna,antennaOptions):null,[antenna,antennaOptions,profileSupported]);
 const slewSuspended=slewRefusal!==null;
 // Reasons OK and Yes are refused, rendered inside the modal surface that holds those buttons.
 const startRefusal=[...profileIssues.map(issue=>profileIssueText(issue,antennaOptions,ta)),...(antenna?rateIssues.filter(i=>i.context==='start').map(i=>rateIssueText(i,antenna,ta)):[])];
 const applyControl=(transition:RadioTransition|null,handler:(transition:RadioTransition)=>void)=>{
  if(!transition){setEnvError(true);return;}
  setEnvError(false);setOutcome(transition.outcome);if(transition.changed)handler(transition);
 };
 const applyAntenna=(transition:RadioLabTransition|null,handler:(transition:RadioLabTransition)=>void)=>{
  if(!transition){setAntennaError(true);return;}
  setAntennaError(false);if(!QUIET_OUTCOMES.has(transition.outcome))setAntennaOutcome(transition.outcome);
  // The accepted state becomes the working state at once, so a timer callback or user action later in the same task
  // continues from it instead of from the not yet committed prop.
  if(transition.changed){latest.current.antenna=transition.state;handler(transition);}
 };
 const attempt=<T,>(step:()=>T):T|null=>{try{return step();}catch{return null;}};
 /** User actions. ShowModal and MessageBox disable every other window of the application. */
 const run=(step:()=>RadioTransition)=>{
  const working=latest.current.antenna;
  if(working&&isRadioLabModal(working)){setAntennaOutcome('modal-open');return;}
  applyControl(attempt(step),onTransition);
 };
 /** Antenna user actions step from the latest accepted antenna state (see applyAntenna), not the rendered prop. */
 const runAntenna=(step:(a:RadioLabState)=>RadioLabTransition)=>{
  const working=latest.current.antenna;
  if(onAntennaTransition&&working)applyAntenna(attempt(()=>step(working)),onAntennaTransition);
 };
 // Timer callbacks are not user actions: they read the latest inputs and handlers when they fire; the antenna input is the
 // latest accepted antenna state.
 const scopeInput=useMemo(()=>({state,environment}),[state,environment]);
 const hasAntennaHost=antenna!==undefined&&onAntennaTransition!==undefined;
 // hostBusy cancels both registrations (WEB safety policy); hiding the panel (active=false) does not.
 const scopeActive=autoScopeTimer&&!hostBusy&&state.scopeTimerEnabled&&state.scopeTimerIntervalMs===1&&environment.domeByte!==3;
 const slewActive=hasAntennaHost&&autoSlewTimer&&!hostBusy&&antenna.slewTimerEnabled&&!slewSuspended;
 const slewRun=antenna?.slewRun??0;
 // RA-13/RA-15: the clocktimer runs from the first FormActivate on, also while a dialog or box is open and while the
 // panel or route is hidden; only a host project operation cancels the registration (scenario time is frozen by the host).
 const clockActive=hasAntennaHost&&radioClock!==undefined&&radioClock.autoTick&&!hostBusy&&antenna.clockTimerEnabled;
 const clockRun=radioClock?.run??0;
 // WEB-MANUAL-01: a manual hold may continue only while the panel window is shown on the active route, no project
 // operation runs and no dialog or box (ours or a foreign one) is open; the first failing condition names the cancellation.
 const manualCancelCause:ManualExternalCancel|null=!state.radioPanelShown?'panel-closed':!active?'route-inactive':hostBusy?'host-busy':antennaModal||foreignModal?'modal':null;
 // RA-18 SlewTimer on a nominal 100 ms interval while a hold is latched and the core would accept its callback.
 const manualRefusal=useMemo(()=>antenna&&isRadioLabOptions(antennaOptions)?radioLabManualTickRefusal(antenna,antennaOptions):null,[antenna,antennaOptions]);
 const manualActive=hasAntennaHost&&autoSlewTimer&&manualLatched&&manualRefusal===null&&manualCancelCause===null;
 const manualRun=antenna?.manualRun??0;
 // WEB-HL-05: a radio hot-list read may run only while the route is shown and no project operation runs.
 const hotLoadOpen=active&&!hostBusy;
 const latest=useRef({scopeInput,onTransition,antenna,antennaOptions,onAntennaTransition,scopeActive,slewActive,slewRun,radioClock,clockActive,clockRun,manualCancelCause,manualActive,manualRun,hotList,hotLoadOpen});
 // A new host antenna prop (by identity) replaces the working state; any other commit keeps the state accepted since,
 // which the host may not have committed yet. The host must commit each handed-over transition's state.
 const hostAntenna=useRef(antenna);
 useLayoutEffect(()=>{
  const adopt=!Object.is(antenna,hostAntenna.current);hostAntenna.current=antenna;
  latest.current={scopeInput,onTransition,antenna:adopt?antenna:latest.current.antenna,antennaOptions,onAntennaTransition,scopeActive,slewActive,slewRun,radioClock,clockActive,clockRun,manualCancelCause,manualActive,manualRun,hotList,hotLoadOpen};
 });
 // ---- Slew ▸ Hot List (RA-HL-05..07, WEB-HL-01..07). Rows are the RA projection of the shared file-order list; event
 // handlers read the latest shared document, never the rendered one.
 const hotRows=useMemo<readonly RadioHotListRow[]>(()=>{const list=hotList?.doc.editor?.list;return list?attempt(()=>radioHotListProjection(list).rows)??[]:[];},[hotList?.doc.editor?.list]);
 const currentHotRows=():readonly RadioHotListRow[]=>{const list=latest.current.hotList?.current().editor?.list;return list?radioHotListProjection(list).rows:[];};
 const [hotLoad,setHotLoad]=useState<HotLoadStatus|null>(null);
 /** Token of this panel's pending shared read (null: none). */
 const radioRead=useRef<number|null>(null);
 const hotFile=useRef<HTMLInputElement>(null),viewSelectRef=useRef<HTMLButtonElement>(null);
 const cancelRadioRead=(status:'cancelled'|'stale')=>{
  const token=radioRead.current;if(token===null)return;radioRead.current=null;
  latest.current.hotList?.update(d=>cancelHotListRead(d,'radio',token));setHotLoad({kind:status});
 };
 /** Gates read from the latest working state at the click, at the file choice and again when the read completes. */
 const hotLoadRefusal=():'menu'|'modal'|'inactive'|null=>{
  const c=latest.current,a=c.antenna;
  return !c.hotLoadOpen?'inactive':!a||isRadioLabModal(a)?'modal':!a.slewMenuEnabled?'menu':null;
 };
 const sharedRefusal=(d:SharedHotList):'read-pending'|'optical-draft'|null=>d.read?'read-pending':d.opticalDraft?'optical-draft':null;
 /** LoadHotList1Click 0x568024 → shared Load 0x53f498 → reader 0x5903d8 (RA-HL-02): on success the list is replaced.
  * Natively only a Reset/IOResult failure (0x590434..0x590483) keeps the old list; the reader clears it at 0x590494
  * before the record loop, and behaviour after that clear is not runtime-certified. Validating the whole file, replacing
  * atomically and keeping the current list on every failure is a declared web policy. WEB-HL-05: begin → size →
  * arrayBuffer → parseHtl → commit, with every late completion after a cancellation, route/busy/modal change or a newer
  * list revision ignored. */
 const loadRadioHotList=async(file:File|undefined)=>{
  const handle=latest.current.hotList;
  if(!file||!handle)return;
  const refusal=hotLoadRefusal();if(refusal){setHotLoad({kind:'refused',reason:refusal});return;}
  const begun=handle.update(d=>beginHotListRead(d,'radio'));
  if(begun.outcome!=='ok'||begun.token===undefined){setHotLoad({kind:'refused',reason:begun.outcome==='optical-draft'?'optical-draft':'read-pending'});return;}
  const token=begun.token,name=file.name.slice(0,128);radioRead.current=token;setHotLoad({kind:'reading',name});
  try{
   if(file.size>HTL_MAX_BYTES)throw new HtlError('size');
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(radioRead.current!==token)return;
   if(hotLoadRefusal()){cancelRadioRead('stale');return;}
   const list=parseHtl(bytes);
   radioRead.current=null;
   const result=handle.update(d=>commitHotListRead(d,'radio',token,list,name));
   setHotLoad(result.outcome==='loaded'?{kind:'loaded',name,count:list.length}:{kind:'stale'});
  }catch(value){
   if(radioRead.current!==token)return;
   radioRead.current=null;handle.update(d=>failHotListRead(d,'radio',token));
   setHotLoad(value instanceof HtlError?{kind:'error',code:value.code,row:value.row}:{kind:'error',code:'read',row:0});
  }
 };
 // Cancellation causes of a pending read: an antenna dialog/box or the list opening, the route hidden, a project
 // operation, a hidden page and unmount (the Cancel button calls cancelRadioRead directly).
 useEffect(()=>{if(antennaModal||!active||hostBusy)cancelRadioRead('cancelled');},[antennaModal,active,hostBusy]);// refs and stable setters only
 useEffect(()=>{
  const hide=()=>{if(document.visibilityState==='hidden')cancelRadioRead('cancelled');};
  document.addEventListener('visibilitychange',hide);return ()=>document.removeEventListener('visibilitychange',hide);
 },[]);
 useEffect(()=>()=>{const token=radioRead.current;radioRead.current=null;if(token!==null)latest.current.hotList?.update(d=>cancelHotListRead(d,'radio',token));},[]);
 const onHotListLoadClick=()=>{
  const refusal=hotLoadRefusal()??(latest.current.hotList?sharedRefusal(latest.current.hotList.current()):null);
  if(refusal){setHotLoad({kind:'refused',reason:refusal});return;}
  hotFile.current?.click();
 };
 const hotMenu:HotListMenu|null=hotList?{doc:hotList.doc,load:hotLoad,viewSelectRef,fileRef:hotFile,
  onView:()=>runAntenna(a=>openRadioHotList(a,antennaOptions,currentHotRows().length)),onLoad:onHotListLoadClick,
  onFile:file=>{void loadRadioHotList(file);},onCancelLoad:()=>cancelRadioRead('cancelled')}:null;
 /** The clock reading at a user request (OK, a box answer): null when the host supplies none. */
 const clockNow=():RadioClockReading|null=>{const r=radioClock?.read();return r?.status==='ok'?r.reading:null;};
 // RC-06: the 1 ms ScopeTimer is delivered while it is enabled, admitted (option byte) and not held by dome byte 3,
 // also while an antenna dialog or box is open. The Random(8000) interval stays a manual stand-in.
 useEffect(()=>{
  if(!scopeActive)return;
  return startRadioTimer(BROWSER_TIMER,1,()=>latest.current.scopeInput,input=>{
   // A commit can disable the timer before this passive effect has cleaned up its interval. Such a queued callback
   // has lost ownership and must not replace the completion message with an idle-timer result.
   if(!latest.current.scopeActive)return;
   applyControl(attempt(()=>scopeTimerTick(input.state,input.environment)),t=>latest.current.onTransition(t));
  }).cancel;
 },[scopeActive]);// apply*/attempt only call stable state setters and the latest handler
 // RA-04: the first Show activates the form once (refused while the options are outside the web profile).
 useEffect(()=>{
  if(state.radioPanelShown&&antenna&&!antenna.activated)runAntenna(a=>activateRadioLab(a,antennaOptions));
 },[state.radioPanelShown,antenna,antennaOptions]);
 // RA-11: one SlewTimer2 registration per enabled run, on a nominal 100 ms interval. Unrelated antenna changes do not
 // restart it; pause (stop question), completion, a new run, unsupported options, a Dec→RA switch that would take its
 // RA step from an unsupported stored rate (radioLabTickRefusal), or unmount cancel it. A TTimer keeps running while the form is
 // hidden, so closing the panel window does not.
 useEffect(()=>{
  if(!slewActive)return;
  return startRadioTimer(BROWSER_TIMER,RADIO_LAB_CONSTANTS.slewTimerIntervalMs,()=>latest.current.antenna,lab=>{
   const current=latest.current;
   if(!current.slewActive||current.slewRun!==slewRun)return;
   const {antennaOptions:options,onAntennaTransition:handler}=current;
   if(lab&&handler)applyAntenna(attempt(()=>slewTimerTick(lab,options,slewRun)),handler);
  }).cancel;
 },[slewActive,slewRun]);
 // RA-13 ClocktimerTimer on a nominal 1000 ms browser interval (WEB-TIMER-02; RA-15 pins only the compiled TTimer
 // default). The scenario is read on every callback, so a range overrun stops it even while the antenna input is
 // unchanged and the delivery is skipped; each tick reads the absolute scenario time, so missed ticks are not caught up.
 useEffect(()=>{
  if(!clockActive)return;
  let reading:RadioClockReading|null=null;
  return startRadioTimer(BROWSER_TIMER,RADIO_CLOCK_CONSTANTS.nominalIntervalMs,()=>{
   const current=latest.current;reading=null;
   if(current.clockActive&&current.clockRun===clockRun){const r=current.radioClock?.read();if(r?.status==='ok')reading=r.reading;}
   return current.antenna;
  },lab=>{
   const current=latest.current,now=reading;
   if(!current.clockActive||current.clockRun!==clockRun||!now)return;
   const {antennaOptions:options,onAntennaTransition:handler}=current;
   if(lab&&handler)applyAntenna(attempt(()=>radioClockTick(lab,options,now)),handler);
  }).cancel;
 },[clockActive,clockRun]);
 // ---- Manual N/S/E/W hold (RA-16..RA-18, WEB-MANUAL-01/02). Press, ticks, release and cancellation all step from the
 // latest accepted antenna state (applyAntenna), so they chain with the clocktimer and SlewTimer2 within one task.
 /** Input owner of the hold and the manualRun its accepted press created. */
 const manualOwner=useRef<{input:ManualInputOwner;run:number}|null>(null);
 const [manualCancel,setManualCancel]=useState<ManualCancelReason|null>(null);
 /** The clock reading now for a release from any callback: the latest host source, null when none is supplied. */
 const latestClockNow=():RadioClockReading|null=>{const r=latest.current.radioClock?.read();return r?.status==='ok'?r.reading:null;};
 /** RA-17 on the latest working state. 'release' needs the latched hold to be the owner's run; 'cancel' ends any latched
  * hold (also one adopted from the host without an owner). `via` (release only): the RA-19 KeyUp ran that direction's
  * MouseUp (releaseManualSlewThrough). Returns whether a hold was ended. */
 const endManual=(mode:'release'|'cancel',run:number|null,via?:ManualDirection):boolean=>{
  const current=latest.current,working=current.antenna,handler=current.onAntennaTransition;
  if(!working?.manualPress||!handler||(mode==='release'&&working.manualRun!==run))return false;
  const options=current.antennaOptions,now=latestClockNow();
  applyAntenna(attempt(()=>mode==='release'&&via?releaseManualSlewThrough(working,options,now,via):releaseManualSlew(working,options,now,mode)),handler);
  return true;
 };
 /** One browser input event through the pure owner reducer; returns the owner afterwards. */
 const manualInput=(event:ManualInputEvent):ManualInputOwner|null=>{
  const prior=manualOwner.current,{owner,effect}=manualInputStep(prior?.input??null,event);
  if(effect.kind==='press'&&owner){
   manualOwner.current=null;
   const current=latest.current,working=current.antenna,handler=current.onAntennaTransition;
   // Gated against the latest presentation state at the press itself, not only by the effects after a commit.
   if(!working||!handler||current.manualCancelCause!==null||nativeModalOpen()||document.visibilityState==='hidden')return null;
   const t=attempt(()=>pressManualSlew(working,current.antennaOptions,effect.direction));
   applyAntenna(t,handler);
   if(t?.outcome!=='manual-started')return null;
   manualOwner.current={input:owner,run:t.state.manualRun};setManualCancel(null);
   return owner;
  }
  manualOwner.current=owner&&prior?{input:owner,run:prior.run}:null;
  if(effect.kind==='release'){if(!endManual('release',prior?.run??null,effect.via))endManual('cancel',null);}// a stale owner never keeps a hold
  else if(effect.kind==='cancel'||event.type==='cancel'){
   const reason=effect.kind==='cancel'?effect.reason:event.type==='cancel'?event.reason:null;
   if(endManual('cancel',null)&&reason)setManualCancel(reason);
  }
  return manualOwner.current?.input??null;
 };
 const manualInputRef=useRef(manualInput);
 useLayoutEffect(()=>{manualInputRef.current=manualInput;});
 /** The rendered direction buttons, for the focus step of an accepted table press. */
 const manualButtons=useRef<Partial<Record<ManualDirection,HTMLButtonElement|null>>>({});
 /** RA-19 keydown inside the key scope (WEB-KEY-02/03). Only admitted table keys are consumed (preventDefault); every
  * other key, a modifier combination, F4/F8 and keypad 5 pass through untouched. A decoded press is preflighted against
  * the latest state and web gates; only then does focus move to that enabled, visible button (a browser focus step
  * informed by the compiled +0xd4 → SetFocus method, not native WM/exception timing), and manualInput re-checks and
  * applies the press from the latest state. Latched, repeated and refused keys never move focus. */
 const onTableKeyDown=(e:KeyboardEvent<HTMLElement>)=>{
  const current=latest.current,working=current.antenna;
  if(!working)return;
  const decoded=browserTableKey(domKey(e),'down',working.manualPress);
  if(decoded.kind!=='decoded'||!decoded.admitted)return;
  e.preventDefault();
  if(decoded.dispatch.kind!=='press')return;// the latch: FormKeyDown exits
  const direction=decoded.dispatch.direction,target=manualButtons.current[direction];
  const admitted=!manualOwner.current&&!e.repeat&&current.manualCancelCause===null&&!nativeModalOpen()&&document.visibilityState!=='hidden'
   &&isRadioLabOptions(current.antennaOptions)&&radioLabManualRefusal(working,current.antennaOptions,direction)===null;
  if(admitted&&target&&!target.disabled&&target.isConnected&&document.activeElement!==target)target.focus();
  manualInput({type:'table-key-down',code:e.code,repeat:e.repeat,direction});
 };
 /** RA-19 keyup inside the key scope: the decoded release (any table key: cross release), or the owner's physical key as
  * a fallback; unrelated keys are kept and pass through. Modifiers never block a release. */
 const onTableKeyUp=(e:KeyboardEvent<HTMLElement>)=>{
  const working=latest.current.antenna,decoded=browserTableKey(domKey(e),'up',working?.manualPress??false);
  const admitted=decoded.kind==='decoded'&&decoded.admitted;
  if(manualOwner.current?.input.kind==='table'){
   const direction=decoded.kind==='decoded'&&decoded.dispatch.kind==='release'?decoded.dispatch.direction:null;
   if(!manualInput({type:'table-key-up',code:e.code,direction})){e.preventDefault();return;}
  }
  if(admitted)e.preventDefault();
 };
 /** Focus leaving the key scope inside the document cancels a table owner; a window blur is the window-blur cancel. */
 const onKeyScopeBlur=(e:FocusEvent<HTMLElement>)=>{
  if(!document.hasFocus())return;
  const next=e.relatedTarget;
  if(next instanceof Element&&next.closest(KEY_SCOPE)&&panelRoot.current?.contains(next))return;
  manualInput({type:'key-scope-left'});
 };
 const tableKeys:ManualTableKeys={down:onTableKeyDown,up:onTableKeyUp,blur:onKeyScopeBlur,buttons:manualButtons};
 // Cancellation causes after a commit: panel closed, route hidden, project operation, our or a foreign modal. No resume.
 useLayoutEffect(()=>{if(manualCancelCause)manualInputRef.current({type:'cancel',reason:manualCancelCause});},[manualCancelCause,manualLatched]);
 // A latched hold without an owner (adopted host state) is cancelled at once.
 useLayoutEffect(()=>{if(manualLatched&&!manualOwner.current)endManual('cancel',null);},[manualLatched,manualRun]);// endManual reads only refs and stable setters
 // A latch cleared outside the input path (the RA-12 failure in a SlewTimer callback) drops the stale owner, so the
 // still-held pointer or key cannot block a fresh press; its late release finds no owner and does nothing.
 useLayoutEffect(()=>{if(!manualLatched)manualOwner.current=null;},[manualLatched]);
 // While a hold is latched: window blur, a hidden page and the owner's pointer released (also by a chorded move) or
 // cancelled anywhere.
 useLayoutEffect(()=>{
  if(!manualLatched)return;
  const dispatch=(event:ManualInputEvent)=>manualInputRef.current(event);
  const blur=()=>dispatch({type:'cancel',reason:'window-blur'});
  const visibility=()=>{if(document.visibilityState==='hidden')dispatch({type:'cancel',reason:'page-hidden'});};
  const up=(e:PointerEvent)=>dispatch({type:'pointer-up',pointerId:e.pointerId});
  // Chorded buttons: the left release while another button stays down is a pointermove; the reducer decides.
  const move=(e:PointerEvent)=>dispatch({type:'pointer-move',pointerId:e.pointerId,button:e.button,buttons:e.buttons});
  const cancel=(e:PointerEvent)=>dispatch({type:'pointer-cancel',pointerId:e.pointerId});
  window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  window.addEventListener('pointerup',up,true);window.addEventListener('pointermove',move,true);window.addEventListener('pointercancel',cancel,true);
  return ()=>{
   window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);
   window.removeEventListener('pointerup',up,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointercancel',cancel,true);
  };
 },[manualLatched]);
 useEffect(()=>()=>{manualInputRef.current({type:'cancel',reason:'unmount'});},[]);
 // RA-18: one SlewTimer registration per hold. Each callback re-checks the run, the cancellation causes (also a foreign
 // modal or a hidden page not yet committed) and the owner before stepping, so a queued callback after a release,
 // cancellation or owner loss neither moves the telescope nor resurrects the hold.
 useEffect(()=>{
  if(!manualActive)return;
  return startRadioTimer(BROWSER_TIMER,RADIO_LAB_CONSTANTS.manualTimerIntervalMs,()=>latest.current.antenna,lab=>{
   const current=latest.current;
   if(current.manualRun!==manualRun)return;
   const cause=current.manualCancelCause??(nativeModalOpen()?'modal':document.visibilityState==='hidden'?'page-hidden':null);
   if(cause){manualInputRef.current({type:'cancel',reason:cause});return;}
   if(manualOwner.current?.run!==manualRun){endManual('cancel',null);return;}
   const {antennaOptions:options,onAntennaTransition:handler}=current;
   if(current.manualActive&&lab&&handler)applyAntenna(attempt(()=>manualSlewTick(lab,options,manualRun)),handler);
  }).cancel;
 },[manualActive,manualRun]);
 const onSwitchKey=(e:KeyboardEvent<HTMLButtonElement>)=>{
  // The main switch is also the return target of an arrival box when the panel window is closed.
  // A held Enter answering that box must not toggle this newly focused control on the next repeat.
  if(ignoreHeldKey(e))return;
  // OnKeyPress receives characters only; Enter arrives as #13.
  if(e.key==='Enter'){e.preventDefault();run(()=>pressRadioSwitchKey(state,environment,'\r'));}
  else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();run(()=>pressRadioSwitchKey(state,environment,e.key));}
 };
 const idText=radioIdCaptionLabel(state);
 const timerText=useMemo(()=>state.scopeTimerIntervalMs===1?t('radio.timer.fast'):t('radio.timer.random',{range:RANDOM_ACCESS_RANGE_MS}),[state.scopeTimerIntervalMs,t]);
 const yesNo=(v:boolean|null)=>v===null?t('radio.state.unknown'):v?t('radio.state.yes'):t('radio.state.no');
 const byte=(v:number|null)=>v===null?t('radio.state.none'):String(v);
 const changeEnv=(patch:Partial<RadioEnvironment>)=>onEnvironmentChange?.({...environment,...patch});
 const applyDraft=()=>{if(managedRef.current)return;try{changeEnv({dishDiameterMeters:parseDishDiameter(draft)});setDraftInvalid(false);}catch{setDraftInvalid(true);}};
 const windowCaption=menuCaptionText(NATIVE_CAPTIONS.window);
 const setCoordinatesRef=useRef<HTMLButtonElement>(null),radioSwitchRef=useRef<HTMLButtonElement>(null);
 // WEB focus return: closing the panel removes Set Coordinates and its close button, so the live main-window switch
 // is the fallback after that window or its arrival box closes. Only a closure edge of this panel's own surfaces counts:
 // a presented dialog/box closing with no other one left, or the panel window closing. Route entry and the end of a
 // project operation are not closures (the host focuses its h1, or focus stays where it is). The prior values are taken
 // on every run, also hidden/busy ones, so an edge is consumed where it happens and never fires later. A hidden/busy
 // route, a foreign modal, a valid existing focus or a disabled/absent/inert target never yields focus.
 const closurePrior=useRef({presented,panelShown:state.radioPanelShown});
 // The surface that started the current modal sequence: View/Select (the list, its coordinate dialog and the empty box)
 // or Set Coordinates (its dialog or the stop question). Boxes that follow (errors, confirmation, arrival) keep it.
 const hotListOrigin=antenna?.hotListShown||antenna?.dialog?.origin==='hot-list'||antenna?.notice?.kind==='hot-list-empty'||antenna?.notice?.kind==='hot-list-no-selection';
 const setCoordinatesOrigin=!hotListOrigin&&(antenna?.dialog!=null||antenna?.notice?.kind==='stop-slew');
 const returnToHotList=useRef(false);
 useLayoutEffect(()=>{if(hotListOrigin)returnToHotList.current=true;else if(setCoordinatesOrigin)returnToHotList.current=false;},[hotListOrigin,setCoordinatesOrigin]);
 useEffect(()=>{
  const prior=closurePrior.current;closurePrior.current={presented,panelShown:state.radioPanelShown};
  const closed=prior.presented&&!antennaModal||prior.panelShown&&!state.radioPanelShown;
  if(!closed||antennaModal||!active||hostBusy||nativeModalOpen()||document.activeElement&&document.activeElement!==document.body)return;
  const order=returnToHotList.current?[viewSelectRef.current,setCoordinatesRef.current,radioSwitchRef.current]:[setCoordinatesRef.current,radioSwitchRef.current];
  const target=order.find(button=>button&&!button.disabled&&button.getClientRects().length>0&&!button.closest('[inert]'));
  target?.focus();
 },[presented,antennaModal,active,hostBusy,state.radioPanelShown]);
 const panelRoot=useRef<HTMLElement>(null);
 return <section ref={panelRoot} className="card radio-control" aria-labelledby={`${id}-title`} data-testid="radio-control" data-modal-pending={modalPending} data-modal-presented={presented}>
  <h2 id={`${id}-title`}>{t('radio.title')}</h2>
  <p>{ta('antenna.scope')}</p>
  <div className="radio-control-grid" inert={antennaModal||undefined}>
   <section className="radio-control-block" aria-labelledby={`${id}-menu`}>
    <h3 id={`${id}-menu`}>{t('radio.menu.heading')}</h3>
    <div className="button-row radio-control-menu">
     <button type="button" className="secondary-button" data-testid="radio-exercise" onClick={()=>run(()=>enterRadioPulsarsExercise(state))}>{t('radio.menu.exercise',{caption:menuCaptionText(NATIVE_CAPTIONS.exercise)})}</button>
     <button type="button" className="secondary-button" data-testid="radio-access" aria-pressed={state.radioMenuChecked} onClick={()=>run(()=>selectRadioAccess(state,environment))}>{t('radio.menu.access',{caption:menuCaptionText(NATIVE_CAPTIONS.access)})}</button>
     {state.radioWinVisible&&<button type="button" className="secondary-button" data-testid="radio-window" disabled={!state.windowMenuEnabled} onClick={()=>run(()=>reopenRadioPanel(state))}>{t('radio.menu.window',{caption:windowCaption})}</button>}
    </div>
    {!state.windowMenuEnabled&&<p className="radio-control-note">{t('radio.menu.windowDisabled')}</p>}
   </section>
   <section className="radio-control-block" aria-labelledby={`${id}-switch`}>
    <h3 id={`${id}-switch`}>{t('radio.switch.heading')}</h3>
    <p className="radio-control-native" data-testid="radio-switch-panel-caption">{NATIVE_CAPTIONS.switchPanel}</p>
    {state.radioSwitchVisible&&<div className="radio-switch-row">
     <span id={`${id}-radlbl`} className="radio-control-native">{NATIVE_CAPTIONS.switchLabel}</span>
     <button ref={radioSwitchRef} type="button" role="switch" className="radio-switch" data-testid="radio-switch" aria-checked={state.radioSwitchActive} aria-labelledby={`${id}-radlbl ${id}-swcap`} aria-describedby={`${id}-swhint`} disabled={!state.radioSwitchEnabled} onClick={()=>run(()=>clickRadioSwitch(state,environment))} onKeyDown={onSwitchKey} onKeyUp={e=>{if(e.key===' ')e.preventDefault();}}>
      <span className="radio-switch-led" aria-hidden="true"/><span id={`${id}-swcap`} data-testid="radio-switch-caption">{state.radioSwitchCaption}</span>
     </button>
    </div>}
    <p id={`${id}-swhint`} className="radio-control-note">{state.radioSwitchEnabled?t('radio.switch.hint'):t('radio.switch.disabled')}</p>
    <h3>{t('radio.id.heading')}</h3>
    <p className="radio-control-id" data-testid="radio-id-caption">{idText??t('radio.id.request')}</p>
   </section>
  </div>
  {state.scopeTimerEnabled&&<section className="radio-control-block" aria-labelledby={`${id}-timer`} data-testid="radio-timer" inert={antennaModal||undefined}>
   <h3 id={`${id}-timer`}>{t('radio.timer.heading')}</h3>
   <p>{timerText}</p>
   {environment.domeByte===3&&<p>{t('radio.timer.domeWait')}</p>}
   {(state.scopeTimerIntervalMs===null||!autoScopeTimer)&&<button type="button" className="secondary-button" data-testid="radio-timer-deliver" onClick={()=>run(()=>scopeTimerTick(state,environment))}>{t('radio.timer.deliver')}</button>}
  </section>}
  {state.radioPanelShown&&<section role="region" aria-labelledby={`${id}-panel`} className="radio-panel-window" data-testid="radio-panel-window" inert={antennaModal||undefined}>
   <h3 id={`${id}-panel`}>{t('radio.panel.heading')}</h3>
   <p className="radio-control-native" data-testid="antenna-form-caption">{RADIO_LAB_CAPTIONS.form}</p>
   {antenna&&onAntennaTransition&&antenna.activated
    ?<AntennaControls antenna={antenna} options={antennaOptions} ta={ta} run={runAntenna} autoSlewTimer={autoSlewTimer} suspended={slewRefusal} setCoordinatesRef={setCoordinatesRef} hotList={hotMenu}
      clockSupplied={radioClock?.supplied??false} clockDomain={radioClock?.domain??false} onClockTick={()=>{const now=clockNow();if(now)runAntenna(a=>radioClockTick(a,antennaOptions,now));}}
      manual={{input:manualInput,cancel:manualCancel,suspended:manualRefusal,keys:tableKeys}} receiver={receiver}/>
    :<p className="radio-control-note">{ta(profileSupported?'antenna.notActivated':'antenna.profile.notActivated')}</p>}
   <button type="button" className="secondary-button" data-testid="radio-panel-close" onClick={()=>run(()=>closeRadioPanel(state,environment))}>{t('radio.panel.close')}</button>
  </section>}
  {antenna&&!profileSupported&&<section className="radio-control-block antenna-profile" aria-labelledby={`${id}-profile`} aria-live="polite" data-testid="antenna-profile">
   <h3 id={`${id}-profile`}>{ta('antenna.profile.heading')}</h3>
   <p className="radio-control-note">{ta('antenna.profile.help')}</p>
   <ul>{profileIssues.map(issue=><li key={issue.kind} data-testid={`antenna-profile-${issue.kind}`}>{profileIssueText(issue,antennaOptions,ta)}</li>)}</ul>
  </section>}
  {antenna&&rateIssues.length>0&&<section className="radio-control-block antenna-profile" aria-labelledby={`${id}-rate-limit`} aria-live="polite" data-testid="antenna-rate-limit">
   <h3 id={`${id}-rate-limit`}>{ta('antenna.rateLimit.heading')}</h3>
   <p className="radio-control-note">{ta('antenna.rateLimit.help',{limit:RADIO_WEB_OPTION_PROFILE.raStepLimitHours,...TOLERANCE_TEXT})}</p>
   <ul>{rateIssues.map(issue=><li key={issue.context} data-testid={`antenna-rate-limit-${issue.context}`}>{rateIssueText(issue,antenna,ta)}</li>)}</ul>
  </section>}
  <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-status">{envError?t('radio.error.environment'):outcome?outcomeText(outcome,t,ta):''}</p>
  {antenna&&<p className="radio-control-status" role="status" aria-live="polite" data-testid="antenna-status">{antennaError?t('radio.error.environment'):antennaOutcome?antennaOutcomeText(antennaOutcome,ta):''}</p>}
  {antenna&&onAntennaOptionsChange&&isRadioLabOptions(antennaOptions)&&<RadioOptionsScenario options={antennaOptions} ta={ta} blocked={antennaModal?'modal':manualLatched?'hold':null} onApply={next=>{
   // Declared web guard: applied only with no dialog or box open and no hold latched, checked on the latest working state.
   const working=latest.current.antenna;
   if(working&&(isRadioLabModal(working)||working.manualPress))return false;
   onAntennaOptionsChange(next);return true;
  }}/>}
  {onEnvironmentChange&&<fieldset className="radio-control-block radio-control-env" data-testid="radio-env" disabled={antennaModal}>
   <legend>{t('radio.env.heading')}</legend>
   <p className="radio-control-note">{t('radio.env.help')}</p>
   <label htmlFor={`${id}-dome`}>{t('radio.env.dome')}</label>
   <select id={`${id}-dome`} data-testid="radio-env-dome" value={environment.domeByte} onChange={e=>changeEnv({domeByte:Number(e.target.value) as DomeByte})}>
    {DOME_BYTES.map(b=><option key={b} value={b}>{t(`radio.env.dome.${b}` as RadioMessageKey)}</option>)}
   </select>
   <label className="radio-control-check"><input type="checkbox" data-testid="radio-env-option" checked={environment.accessOptionByte} onChange={e=>changeEnv({accessOptionByte:e.target.checked})}/>{t('radio.env.option')}</label>
   <label className="radio-control-check"><input type="checkbox" data-testid="radio-env-other" checked={environment.otherWindowItemsVisible} onChange={e=>changeEnv({otherWindowItemsVisible:e.target.checked})}/>{t('radio.env.otherWindows')}</label>
   <label htmlFor={`${id}-diameter`}>{t('radio.env.diameter')}</label>
   <input id={`${id}-diameter`} data-testid="radio-env-diameter" type="text" inputMode="numeric" maxLength={11} value={managedDiameter?envDiameterText:draft} aria-invalid={!managedDiameter&&draftInvalid}aria-describedby={`${id}-diameter-help`} disabled={managedDiameter} onChange={e=>{setDraft(e.target.value);setDraftInvalid(false);}} onKeyDown={e=>{if(e.key==='Enter')applyDraft();}}/>
   <p id={`${id}-diameter-help`} className="radio-control-note">{t('radio.env.diameterHelp')}</p>
   {managedDiameter&&<p className="radio-control-note" data-testid="radio-env-diameter-managed">{t('radio.env.diameterManaged')}</p>}
   <p className="radio-control-note" data-testid="radio-env-diameter-current">{environment.dishDiameterMeters===null?t('radio.env.diameterNone'):String(environment.dishDiameterMeters)}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-env-apply" disabled={managedDiameter} onClick={applyDraft}>{t('radio.env.apply')}</button>
    <button type="button" className="secondary-button" data-testid="radio-env-cancel" disabled={managedDiameter} onClick={()=>{setDraft(envDiameterText);setDraftInvalid(false);}}>{t('radio.env.cancel')}</button>
    <button type="button" className="secondary-button" data-testid="radio-env-clear" disabled={managedDiameter} onClick={()=>{if(managedRef.current)return;changeEnv({dishDiameterMeters:null});setDraftInvalid(false);}}>{t('radio.env.clear')}</button>
   </div>
   {!managedDiameter&&draftInvalid&&<p role="alert" data-testid="radio-env-error">{t('radio.env.invalid')}</p>}
   <h3>{ta('antenna.defaults.heading')}</h3>
   <p className="radio-control-note">{ta('antenna.defaults.help')}</p>
   <div className="button-row"><button type="button" className="secondary-button" data-testid="radio-env-compiled" onClick={()=>{changeEnv(managedRef.current?{accessOptionByte:RADIO_COMPILED_ENVIRONMENT.accessOptionByte}:{...RADIO_COMPILED_ENVIRONMENT});setDraftInvalid(false);}}>{ta('antenna.defaults.apply')}</button></div>
  </fieldset>}
  <details className="radio-control-block" data-testid="radio-state" inert={antennaModal||undefined}>
   <summary>{t('radio.state.heading')}</summary>
   <dl className="radio-control-state">
    <dt>{t('radio.state.radioByte')}</dt><dd data-testid="radio-state-radio">{byte(state.radioScopeByte)}</dd>
    <dt>{t('radio.state.currentByte')}</dt><dd data-testid="radio-state-current">{byte(state.currentScopeByte)}</dd>
    <dt>{t('radio.state.requestedByte')}</dt><dd data-testid="radio-state-requested">{byte(state.requestedScopeByte)}</dd>
    <dt>{t('radio.state.timer')}</dt><dd data-testid="radio-state-timer">{state.scopeTimerEnabled?t('radio.state.timerOn',{interval:state.scopeTimerIntervalMs===1?String(1):t('radio.state.random')}):t('radio.state.timerOff')}</dd>
    <dt>{t('radio.state.busy')}</dt><dd>{yesNo(state.busyCursor)}</dd>
    <dt>{t('radio.state.item408')}</dt><dd>{yesNo(state.item408Enabled)}</dd>
    <dt>{t('radio.state.item454')}</dt><dd>{yesNo(state.item454Enabled)}</dd>
   </dl>
  </details>
  {presented&&antenna?.hotListShown&&<RadioHotListDialog rows={hotRows} index={antenna.hotListIndex} blocked={antenna.notice!==null||antenna.dialog!==null} ta={ta}
   onSelect={i=>runAntenna(a=>selectRadioHotListIndex(a,i,currentHotRows().length))}
   onSlew={()=>runAntenna(a=>slewToHotListSelection(a,antennaOptions,currentHotRows().map(r=>({ra:r.record.ra,dec:r.record.dec}))))}
   onClose={()=>runAntenna(a=>closeRadioHotList(a))} returnFocus={viewSelectRef} suppressed={suppressed} ignoreHeld={ignoreHeldKey} trap={trapTab}/>}
  {presented&&antenna?.dialog&&<SkyCoordsDialogView dialog={antenna.dialog} blocked={antenna.notice!==null} ta={ta} limitReasons={startRefusal}
   storedB1950={antenna.targetHoldsB1950?{dec:antenna.target.dec}:null}
   onEdit={(field,text)=>runAntenna(a=>editSkyCoordsField(a,field,text))} onEpoch={i=>runAntenna(a=>selectSkyCoordsEpoch(a,i))}
   onOk={()=>{const now=clockNow();runAntenna(a=>confirmSkyCoords(a,antennaOptions,now));}} onCancel={()=>runAntenna(a=>cancelSkyCoords(a))}
   returnFocus={antenna.dialog.origin==='hot-list'?viewSelectRef:setCoordinatesRef} suppressed={suppressed}/>}
  {/* The answer names the rendered box kind, so an answer to a box that has since changed is refused as notice-stale. */}
  {presented&&antenna?.notice&&<NoticeView notice={antenna.notice} ta={ta} limitReasons={antenna.notice.kind==='confirm-slew'?startRefusal:[]} onAnswer={answer=>{const now=clockNow(),kind=antenna.notice!.kind;runAntenna(a=>answerNotice(a,antennaOptions,kind,answer,now));}}
   panel={panelRoot} suppressed={suppressed}/>}
 </section>;
}

type AntennaControlsProps=Readonly<{antenna:RadioLabState;options:RadioLabOptions;ta:RadioAntennaTranslate;run:(step:(a:RadioLabState)=>RadioLabTransition)=>void;autoSlewTimer:boolean;
 suspended:'options-unsupported'|'rate-unsupported'|null;setCoordinatesRef:RefObject<HTMLButtonElement|null>;clockSupplied:boolean;clockDomain:boolean;onClockTick:()=>void;
 manual:ManualPadInput;hotList:HotListMenu|null;receiver?:RadioReceiverButton}>;
/** Slew ▸ Hot List items (RA-HL-06) and the radio Load state. */
type HotListMenu=Readonly<{doc:SharedHotList;load:HotLoadStatus|null;viewSelectRef:RefObject<HTMLButtonElement|null>;fileRef:RefObject<HTMLInputElement|null>;
 onView:()=>void;onLoad:()=>void;onFile:(file:File|undefined)=>void;onCancelLoad:()=>void}>;
/** WEB-KEY-03 handlers for the key-scope controls and the direction-button refs of the focus step. */
type ManualTableKeys=Readonly<{down:(e:KeyboardEvent<HTMLElement>)=>void;up:(e:KeyboardEvent<HTMLElement>)=>void;blur:(e:FocusEvent<HTMLElement>)=>void;
 buttons:RefObject<Partial<Record<ManualDirection,HTMLButtonElement|null>>>}>;
type ManualPadInput=Readonly<{input:(event:ManualInputEvent)=>ManualInputOwner|null;cancel:ManualCancelReason|null;suspended:RadioLabManualTickRefusal|null;keys:ManualTableKeys}>;
/** Refusals named under the pad (the latch itself and modal-open are shown by the held button and the open surface). */
const MANUAL_LIMIT_REFUSALS:ReadonlySet<RadioLabManualRefusal>=new Set(['manual-unavailable','manual-programmed-slew','options-unsupported','manual-limits-clock','manual-step-unsupported']);
/** The button a cross release left disabled, when it is rendered (E/W are not on a transit panel) and no hold runs. */
const leftoverButton=(a:RadioLabState):ManualDirection|null=>{
 const d=a.manualButtonLeftDisabled;return d&&!a.manualPress&&a.manualButtonsEnabled&&(d==='north'||d==='south'||a.eastWestVisible)?d:null;
};
/** manual-unavailable during a running or paused programmed slew (the core's slewHeld) names the slew, not Tracking, and
 * with a button left disabled by a cross release it names that button: presentation only, the refusal value and its
 * priority are unchanged. */
const manualLimitText=(refusal:RadioLabManualRefusal|RadioLabManualTickRefusal,a:RadioLabState,ta:RadioAntennaTranslate)=>{
 const left=refusal==='manual-unavailable'?leftoverButton(a):null;
 return ta(
  left?'antenna.manual.limit.manual-unavailable-leftover':refusal==='manual-unavailable'&&(a.slewing||a.slewTimerEnabled)?'antenna.manual.limit.manual-unavailable-slew':`antenna.manual.limit.${refusal}` as RadioAntennaMessageKey,
  {rate:String(a.rate),dec:RADIO_MANUAL_WEB_DOMAIN.decStepLimitDegrees,ra:RADIO_MANUAL_WEB_DOMAIN.raStepLimitHours,
   caption:left?manualButtonCaption(a,left):'',original:left?RADIO_LAB_CAPTIONS[left]:''});
};
/** The N/S/E/W pad: DOM in DFM TabOrder (N 1, S 2, E 3, W 4), laid out as the DFM cross (N top, E left, W right, S bottom).
 * WEB-MANUAL-01/02: pointer, touch or Space/Enter on the focused button hold it; a click alone does nothing. WEB-KEY-03:
 * the RA-19 letter/keypad keys work while Tracking or a direction button has focus. */
function ManualPad({a,options,ta,manual,autoSlewTimer,run,keysNoteId}:Readonly<{a:RadioLabState;options:RadioLabOptions;ta:RadioAntennaTranslate;manual:ManualPadInput;autoSlewTimer:boolean;
 run:(step:(a:RadioLabState)=>RadioLabTransition)=>void;keysNoteId:string}>){
 const id=useId(),held=heldManualDirection(a),valid=isRadioLabOptions(options);
 const directions=MANUAL_DIRECTIONS.filter(d=>d==='north'||d==='south'||a.eastWestVisible);
 const refusal=(d:ManualDirection)=>valid?radioLabManualRefusal(a,options,d):null;
 const limits=held?[]:[...new Set(directions.map(refusal).filter((r):r is RadioLabManualRefusal=>r!==null&&MANUAL_LIMIT_REFUSALS.has(r)))];
 const heldCaption=held&&manualButtonCaption(a,held),left=leftoverButton(a),keys=manual.keys;
 return <div className="antenna-manual" role="group" aria-labelledby={`${id}-heading`}>
  <span id={`${id}-heading`} className="antenna-label">{ta('antenna.manual.heading')}</span>
  <div className="antenna-manual-pad">
   {directions.map(d=>{
    const caption=manualButtonCaption(a,d),isHeld=held===d,enabled=isHeld||(valid&&manualButtonEnabled(a,d)&&refusal(d)===null);
    return <button key={d} ref={el=>{keys.buttons.current[d]=el;}} type="button" className={`antenna-manual-button antenna-manual-${d}`} data-testid={`antenna-manual-${d}`} data-held={isHeld||undefined}
     data-antenna-key-scope="" data-left-disabled={left===d||undefined}
     aria-label={ta('antenna.manual.button',{caption,original:RADIO_LAB_CAPTIONS[d]})} aria-describedby={`${id}-hint ${keysNoteId}${left===d?` ${id}-leftover`:''}`} disabled={!enabled}
     onPointerDown={e=>{
      const owner=manual.input({type:'pointer-down',pointerId:e.pointerId,button:e.button,direction:d});
      // Capture only for the accepted owner, so its release is seen wherever it happens.
      if(owner?.kind==='pointer'&&owner.pointerId===e.pointerId)try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* inactive synthetic pointer: window listeners still see its release */}
     }}
     onPointerUp={e=>manual.input({type:'pointer-up',pointerId:e.pointerId})} onPointerCancel={e=>manual.input({type:'pointer-cancel',pointerId:e.pointerId})}
     onLostPointerCapture={e=>manual.input({type:'pointer-cancel',pointerId:e.pointerId})}
     onKeyDown={e=>{if(MANUAL_HOLD_KEYS.includes(e.key)){e.preventDefault();manual.input({type:'key-down',key:e.key,repeat:e.repeat,direction:d});}else keys.down(e);}}
     onKeyUp={e=>{if(MANUAL_HOLD_KEYS.includes(e.key)){e.preventDefault();manual.input({type:'key-up',key:e.key});}else keys.up(e);}}
     onBlur={e=>{manual.input({type:'focus-lost',direction:d});keys.blur(e);}} onClick={e=>e.preventDefault()} onContextMenu={e=>e.preventDefault()}>{caption}</button>;
   })}
  </div>
  <p id={`${id}-hint`} className="radio-control-note">{ta('antenna.manual.hint',{interval:RADIO_LAB_CONSTANTS.manualTimerIntervalMs})}</p>
  <p id={keysNoteId} className="radio-control-note" data-testid="antenna-manual-keys">{ta('antenna.manual.keys')}</p>
  {heldCaption&&<p data-testid="antenna-manual-held">{ta('antenna.manual.held',{caption:heldCaption})}</p>}
  {left&&<p id={`${id}-leftover`} className="radio-control-note" data-testid="antenna-manual-leftover" data-direction={left}>{ta('antenna.manual.leftover',{caption:manualButtonCaption(a,left),original:RADIO_LAB_CAPTIONS[left]})}</p>}
  {a.poleReversed&&<p className="radio-control-note" data-testid="antenna-pole">{ta('antenna.manual.pole')}</p>}
  {limits.length>0&&<div className="antenna-modal-limit" data-testid="antenna-manual-limit"><div><p>{ta('antenna.manual.limit.lead')}</p><ul>{limits.map(r=><li key={r} data-refusal={r}>{manualLimitText(r,a,ta)}</li>)}</ul></div></div>}
  {manual.cancel&&!held&&<p className="radio-control-note" data-testid="antenna-manual-cancelled" data-reason={manual.cancel}>{ta(`antenna.manual.cancel.${manual.cancel}`)}</p>}
  {!autoSlewTimer&&held&&<button type="button" className="secondary-button" data-testid="antenna-manual-tick" onClick={()=>run(lab=>manualSlewTick(lab,options,lab.manualRun))}>{ta('antenna.manual.tick')}</button>}
 </div>;
}
const CLOCK_MAX_TEXT=new Date(RADIO_CLOCK_CONSTANTS.maxUTMS).toISOString();
/** Decimal hours with the JD label's ffFixed 6 policy (web diagnostics; the original LED images are not reproduced). */
const hoursText=(ta:RadioAntennaTranslate,hours:number)=>ta('antenna.clock.hoursValue',{hours:formatFixed(hours,6)});
/** TRadioLab controls in DFM order (TabOrder: DriveBtn 0, N 1, S 2, E 3, W 4, RateSpin 5, Receiver 6). */
function AntennaControls({antenna:a,options,ta,run,autoSlewTimer,suspended,setCoordinatesRef,clockSupplied,clockDomain,onClockTick,manual,hotList:hot,receiver}:AntennaControlsProps){
 const id=useId(),onOff=(v:boolean)=>ta(v?'antenna.state.enabled':'antenna.state.disabled'),yes=(v:boolean)=>ta(v?'antenna.options.yes':'antenna.options.no');
 const ra=splitSexagesimal(a.pointing.ra,2),dec=splitSexagesimal(a.pointing.dec,1);
 const storedEntered=!(a.target.ra===0&&a.target.dec===0),leftover=leftoverButton(a);
 const C=RADIO_LAB_CAPTIONS,hotItem=(item:string)=>ta('antenna.hotList.item',{menu:menuCaptionText(C.slewMenu),group:menuCaptionText(C.hotList),item:menuCaptionText(item)});
 const reading=hot?.load?.kind==='reading'&&hot.doc.read?.owner==='radio';
 const loadBlocked=hot?(hot.doc.opticalDraft?'draft':hot.doc.read?'pending':null):null;
 return <div className="antenna-controls" data-testid="antenna-controls">
  <div className="antenna-menu" role="group" aria-labelledby={`${id}-menu`}>
   <span id={`${id}-menu`} className="radio-control-note">{ta('antenna.menu.heading')}</span>
   {hot&&<div className="antenna-hotlist-menu" role="group" aria-labelledby={`${id}-hot`} data-testid="antenna-hotlist-menu">
    <span id={`${id}-hot`} className="antenna-label">{ta('antenna.hotList.heading')}</span>
    <div className="button-row">
     <button ref={hot.viewSelectRef} type="button" className="secondary-button" data-testid="antenna-hotlist-open" onKeyDown={ignoreHeldKey} disabled={!a.slewMenuEnabled} aria-describedby={a.slewMenuEnabled?undefined:`${id}-menu-off`} onClick={hot.onView}>{hotItem(C.viewSelect)}</button>
     <button type="button" className="secondary-button" data-testid="antenna-hotlist-add" disabled aria-describedby={`${id}-hot-add`}>{hotItem(C.addCurrent)}</button>
     <button type="button" className="secondary-button" data-testid="antenna-hotlist-load" onKeyDown={ignoreHeldKey} disabled={!a.slewMenuEnabled||loadBlocked!==null}
      aria-describedby={loadBlocked?`${id}-hot-load`:a.slewMenuEnabled?undefined:`${id}-menu-off`} onClick={hot.onLoad}>{hotItem(C.loadHotList)}</button>
     {reading&&<button type="button" className="secondary-button" data-testid="antenna-hotlist-cancel-load" onClick={hot.onCancelLoad}>{ta('antenna.hotList.cancelLoad')}</button>}
    </div>
    <input ref={hot.fileRef} type="file" accept=".htl" hidden data-testid="antenna-hotlist-file" aria-label={ta('antenna.hotList.file')} onChange={e=>{const file=e.target.files?.[0];e.target.value='';hot.onFile(file);}}/>
    <p id={`${id}-hot-add`} className="radio-control-note">{ta('antenna.hotList.addDisabled')}</p>
    {loadBlocked&&<p id={`${id}-hot-load`} className="radio-control-note" data-testid="antenna-hotlist-load-blocked" data-reason={loadBlocked}>{ta(loadBlocked==='draft'?'antenna.hotList.loadDraft':'antenna.hotList.loadPending')}</p>}
    <p data-testid="antenna-hotlist-source">{hot.doc.editor?ta(hot.doc.name?'antenna.hotList.source':'antenna.hotList.sourceNew',{name:hot.doc.name,count:hot.doc.editor.list.length}):ta('antenna.hotList.none')}</p>
    {hot.load?.kind==='error'
     ?<p role="alert" data-testid="antenna-hotlist-error">{hotLoadText(hot.load,ta)}</p>
     :<p className="radio-control-status" role="status" aria-live="polite" data-testid="antenna-hotlist-status">{hot.load?hotLoadText(hot.load,ta):''}</p>}
    <p className="radio-control-note">{ta('antenna.hotList.note')}</p>
   </div>}
   <button ref={setCoordinatesRef} type="button" className="secondary-button" data-testid="antenna-set-coordinates" onKeyDown={ignoreHeldKey} disabled={!a.slewMenuEnabled} aria-describedby={a.slewMenuEnabled?undefined:`${id}-menu-off`} onClick={()=>run(lab=>openSetCoordinates(lab,options))}>
    {ta('antenna.menu.item',{menu:menuCaptionText(RADIO_LAB_CAPTIONS.slewMenu),item:RADIO_LAB_CAPTIONS.setCoordinates})}
   </button>
   {!a.slewMenuEnabled&&<p id={`${id}-menu-off`} className="radio-control-note" data-testid="antenna-menu-disabled">{ta(a.manualPress?'antenna.menu.slewDisabledHold':'antenna.menu.slewDisabled')}</p>}
  </div>
  <section className="radio-control-block" aria-labelledby={`${id}-pos`}>
   <h4 id={`${id}-pos`}>{ta('antenna.readout.heading')}</h4>
   <dl className="antenna-readout">
    <dt className="radio-control-native">{RADIO_LAB_CAPTIONS.ra}</dt>
    <dd data-testid="antenna-ra" data-ra-hours={String(a.pointing.ra)}>{ra.whole} {RADIO_LAB_CAPTIONS.hours} {ra.minutes} {RADIO_LAB_CAPTIONS.minutes} {formatFixed(ra.seconds,2)} {RADIO_LAB_CAPTIONS.seconds}</dd>
    <dt className="radio-control-native">{RADIO_LAB_CAPTIONS.dec}</dt>
    <dd data-testid="antenna-dec" data-dec-degrees={String(a.pointing.dec)}>{dec.sign<0?'−':'+'}{dec.whole} {RADIO_LAB_CAPTIONS.degrees} {dec.minutes} {RADIO_LAB_CAPTIONS.minutes} {formatFixed(dec.seconds,1)} {RADIO_LAB_CAPTIONS.seconds}</dd>
   </dl>
   <p className="radio-control-note">{ta('antenna.readout.note')}</p>
   <p data-testid="antenna-target" data-epoch={a.targetHoldsB1950?'B1950':'J2000'}><span className="antenna-label">{ta('antenna.target.heading')}</span> {storedEntered?`${raText(ta,a.target.ra)}, ${decText(ta,a.target.dec)}`:ta('antenna.target.none')}</p>
   {a.targetHoldsB1950&&<p className="radio-control-note" data-testid="antenna-target-b1950">{ta('antenna.target.b1950')}</p>}
  </section>
  <section className="radio-control-block" aria-labelledby={`${id}-clock`} data-testid="antenna-clock">
   <h4 id={`${id}-clock`}>{ta('antenna.clock.heading')}</h4>
   {a.clock
    ?<dl className="antenna-readout">
     <dt>{ta('antenna.clock.ut')}</dt><dd data-testid="antenna-clock-ut" data-ut-ms={String(a.clock.utMs)}>{ta('antenna.clock.utValue',{ut:new Date(a.clock.utMs).toISOString()})}</dd>
     <dt>{ta('antenna.clock.jd')}</dt><dd data-testid="antenna-clock-jd" data-jd={String(a.clock.jd)}>{formatFixed(a.clock.jd,6)}</dd>
     <dt>{ta('antenna.clock.lst')}</dt><dd data-testid="antenna-clock-lst" data-lst-hours={String(a.clock.lstHours)}>{`${raText(ta,a.clock.lstHours)} · ${hoursText(ta,a.clock.lstHours)}`}</dd>
    </dl>
    :<p className="radio-control-note" data-testid="antenna-clock-none">{ta('antenna.clock.none')}</p>}
   <p data-testid="antenna-hour-angle" data-ha-hours={a.hourAngle===null?'':String(a.hourAngle)}><span className="antenna-label">{ta('antenna.clock.hourAngle')}</span> {a.hourAngle===null?ta('antenna.clock.hourAngleUnknown'):hoursText(ta,a.hourAngle)}</p>
   <p className="radio-control-note">{ta('antenna.clock.note',{interval:RADIO_CLOCK_CONSTANTS.nominalIntervalMs})}</p>
   {!clockSupplied&&(clockDomain
    ?<p className="radio-control-note" data-testid="antenna-clock-domain">{ta('antenna.clock.domain',{max:CLOCK_MAX_TEXT})}</p>
    :<p className="radio-control-note" data-testid="antenna-clock-unsupplied">{ta('antenna.clock.unsupplied')}</p>)}
   <button type="button" className="secondary-button" data-testid="antenna-clock-tick" disabled={!clockSupplied||!a.clockTimerEnabled} onClick={onClockTick}>{ta('antenna.clock.deliver')}</button>
  </section>
  <div className="radio-control-grid">
   <section className="radio-control-block" aria-labelledby={`${id}-drive`}>
    <h4 id={`${id}-drive`}>{ta('antenna.tracking.heading')}</h4>
    {a.trackingVisible
     ?<button type="button" className="secondary-button" data-testid="antenna-tracking" aria-pressed={a.tracking} data-antenna-key-scope="" aria-describedby={`${id}-keys`}
      onKeyDown={manual.keys.down} onKeyUp={manual.keys.up} onBlur={manual.keys.blur} onClick={()=>run(lab=>toggleTracking(lab,options))}>{RADIO_LAB_CAPTIONS.tracking}</button>
     :<p className="radio-control-note">{ta('antenna.tracking.transit')}</p>}
    {a.trackingVisible&&<p data-testid="antenna-tracking-state">{ta(a.tracking?'antenna.tracking.on':'antenna.tracking.off')}</p>}
    {leftover
     ?<p className="radio-control-note" data-testid="antenna-manual" data-left-disabled={leftover}>{ta('antenna.manual.stateLeftover',{caption:manualButtonCaption(a,leftover),original:RADIO_LAB_CAPTIONS[leftover]})}</p>
     :<p className="radio-control-note" data-testid="antenna-manual">{ta('antenna.manual.state',{state:onOff(a.manualButtonsEnabled)})}</p>}
    <ManualPad a={a} options={options} ta={ta} manual={manual} autoSlewTimer={autoSlewTimer} run={run} keysNoteId={`${id}-keys`}/>
    {!receiver&&<p className="radio-control-note" data-testid="antenna-receiver">{ta('antenna.receiver.state',{state:onOff(a.receiverEnabled)})} {ta('antenna.receiver.unhosted')}</p>}
   </section>
   <section className="radio-control-block" aria-labelledby={`${id}-rate`}>
    <h4 id={`${id}-rate`}><span className="radio-control-native">{RADIO_LAB_CAPTIONS.slewRate}</span></h4>
    <div className="button-row">
     <button type="button" className="secondary-button antenna-spin" data-testid="antenna-rate-down" aria-label={ta('antenna.rate.down')} disabled={!a.rateSpinEnabled} onClick={()=>run(lab=>changeSlewRate(lab,options,'down'))}>−</button>
     <button type="button" className="secondary-button antenna-spin" data-testid="antenna-rate-up" aria-label={ta('antenna.rate.up')} disabled={!a.rateSpinEnabled} onClick={()=>run(lab=>changeSlewRate(lab,options,'up'))}>+</button>
    </div>
    <p data-testid="antenna-rate" aria-live="polite">{ta('antenna.rate.value',{index:a.rateIndex,rate:a.rate})}</p>
    <p className="radio-control-note">{ta('antenna.rate.gap')}</p>
   </section>
   {receiver&&<section className="radio-control-block" aria-labelledby={`${id}-receiver-button`} data-testid="antenna-receiver-block">
    <button ref={receiver.buttonRef} id={`${id}-receiver-button`} type="button" className="secondary-button" data-testid="antenna-receiver-button" disabled={!receiver.available}
     aria-describedby={`${id}-receiver`} onKeyDown={ignoreHeldKey} onClick={receiver.onOpen}>{RADIO_LAB_CAPTIONS.receiver}</button>
    <p id={`${id}-receiver`} className="radio-control-note" data-testid="antenna-receiver" data-reason={receiver.reason}>
     {ta('antenna.receiver.state',{state:onOff(a.receiverEnabled)})} {ta(`antenna.receiver.reason.${receiver.reason}`)}</p>
   </section>}
   <section className="radio-control-block" aria-labelledby={`${id}-motion`}>
    <h4 id={`${id}-motion`}>{ta('antenna.status.heading')}</h4>
    <p data-testid="antenna-motion" data-manual={a.manualPress||undefined}>{a.manualPress
     ?ta('antenna.status.manual',{caption:manualButtonCaption(a,heldManualDirection(a)!),interval:RADIO_LAB_CONSTANTS.manualTimerIntervalMs})
     :ta(a.status==='slewing'?'antenna.status.slewing':a.status==='slewing-ra'?'antenna.status.slewingRa':'antenna.status.none')}</p>
    {a.slewing&&<p className="radio-control-note" data-testid="antenna-ticks">{ta('antenna.status.ticks',{ticks:a.slewTicks})}</p>}
    {a.slewTimerEnabled&&suspended&&<p className="radio-control-note" data-testid="antenna-suspended">{ta(suspended==='rate-unsupported'?'antenna.status.suspendedRate':'antenna.status.suspended')}</p>}
    {!autoSlewTimer&&a.slewTimerEnabled&&<button type="button" className="secondary-button" data-testid="antenna-tick" onClick={()=>run(lab=>slewTimerTick(lab,options,a.slewRun))}>{ta('antenna.timer.deliver')}</button>}
    {a.manualPress&&manual.suspended&&<p className="radio-control-note" data-testid="antenna-manual-suspended" data-refusal={manual.suspended}>{ta('antenna.status.manualSuspended',{cause:manualLimitText(manual.suspended,a,ta)})}</p>}
   </section>
  </div>
  <p className="radio-control-note" data-testid="antenna-options">{ta('antenna.options.summary',{transit:yes(options.transitTelescope),limits:yes(options.limitsEnabled),minimum:horizonText(options).degrees,radians:horizonText(options).radians,max:options.maxRateIndex,base:options.rateBase,instant:yes(options.instantSlew)})}</p>
 </div>;
}

/** WEB radio options scenario: an explicit subset of TRadiOptsDlg (VMT 0x5a7c84). The draft Limit Slewing check box
 * (SlewBox +0x3a8, written by OKBtnClick 0x5a9428 to record+0x93a) is applied only with Apply; Cancel or Escape restores
 * the draft from the options in use (as CancelBtnClick 0x5a9940 restores the record copy FormActivate 0x5a9138 took).
 * The horizon limit (record+0x90c) is shown read only from the options. The full dialog (Files, Site, the other
 * parameters), the options file and the instructor workflow are not ported; nothing is persisted. */
function RadioOptionsScenario({options,ta,blocked,onApply}:Readonly<{options:RadioLabOptions;ta:RadioAntennaTranslate;blocked:'modal'|'hold'|null;onApply:(next:RadioLabOptions)=>boolean}>){
 const id=useId(),yes=(v:boolean)=>ta(v?'antenna.options.yes':'antenna.options.no'),h=horizonText(options);
 const [draft,setDraft]=useState(options.limitsEnabled),[status,setStatus]=useState<'applied'|'cancelled'|null>(null);
 useEffect(()=>{setDraft(options.limitsEnabled);},[options.limitsEnabled]);
 const cancel=()=>{setDraft(options.limitsEnabled);setStatus('cancelled');};
 const apply=()=>{if(blocked===null&&onApply({...options,limitsEnabled:draft}))setStatus('applied');};
 return <fieldset className="radio-control-block radio-control-env" data-testid="antenna-radio-options" disabled={blocked==='modal'} aria-describedby={`${id}-help`}
  onKeyDown={e=>{if(e.key==='Escape'&&!e.repeat){e.preventDefault();cancel();}}}>
  <legend>{ta('antenna.radioOptions.heading')}</legend>
  <p id={`${id}-help`} className="radio-control-note">{ta('antenna.radioOptions.help')}</p>
  <p className="radio-control-native" data-testid="antenna-radio-options-caption">{RADIO_OPTIONS_CAPTIONS.form}</p>
  <label className="radio-control-check"><input type="checkbox" data-testid="antenna-radio-options-limit" checked={draft} aria-describedby={`${id}-hint`}
   onChange={e=>{setDraft(e.target.checked);setStatus(null);}}/><span className="radio-control-native">{RADIO_OPTIONS_CAPTIONS.limitSlewing}</span></label>
  <p id={`${id}-hint`} className="radio-control-note">{ta('antenna.radioOptions.limitHint',{hint:RADIO_OPTIONS_CAPTIONS.limitSlewingHint})}</p>
  <p data-testid="antenna-radio-options-horizon" data-radians={h.radians}>{ta('antenna.radioOptions.horizon',{caption:RADIO_OPTIONS_CAPTIONS.horizonLimit,degrees:h.degrees,radians:h.radians,hint:RADIO_OPTIONS_CAPTIONS.horizonLimitHint})}</p>
  <p className="radio-control-note">{ta('antenna.radioOptions.clockNote')}</p>
  <p data-testid="antenna-radio-options-current" data-limits={options.limitsEnabled}>{ta('antenna.radioOptions.current',{limits:yes(options.limitsEnabled)})}</p>
  <div className="button-row">
   <button type="button" className="primary-button" data-testid="antenna-radio-options-apply" disabled={blocked!==null} onClick={apply}>{ta('antenna.radioOptions.apply')}</button>
   <button type="button" className="secondary-button" data-testid="antenna-radio-options-cancel" onClick={cancel}>{ta('antenna.radioOptions.cancel')}</button>
  </div>
  {blocked&&<p className="radio-control-note" data-testid="antenna-radio-options-blocked">{ta(blocked==='modal'?'antenna.radioOptions.blockedModal':'antenna.radioOptions.blockedHold')}</p>}
  <p className="radio-control-status" role="status" aria-live="polite" data-testid="antenna-radio-options-status">
   {status==='applied'?ta('antenna.radioOptions.applied',{limits:yes(options.limitsEnabled)}):status==='cancelled'?ta('antenna.radioOptions.cancelled'):''}
  </p>
 </fieldset>;
}

/** storedB1950: the stored coordinates hold the B1950.0 values this open's conversion wrote (targetHoldsB1950), with the
 * stored Dec for the lost-minus remark; null otherwise. */
type SkyCoordsDialogProps=Readonly<{dialog:SkyCoordsDialog;blocked:boolean;ta:RadioAntennaTranslate;limitReasons:readonly string[];storedB1950:Readonly<{dec:number}>|null;
 onEdit:(field:SkyCoordsField,text:string)=>void;onEpoch:(index:0|1)=>void;onOk:()=>void;onCancel:()=>void;returnFocus:RefObject<HTMLButtonElement|null>;suppressed:RefObject<boolean>}>;
/** TSkyCoordsDlg (bsDialog, poScreenCenter): ActiveControl RAHrEd with its text selected; OK is the Default (bkOK) and Cancel the Cancel (bkCancel) button.
 * WEB: presented again after a suppression (hidden route, project operation, native modal), it takes focus the same way; the draft is kept in the state. */
function SkyCoordsDialogView({dialog,blocked,ta,limitReasons,storedB1950,onEdit,onEpoch,onOk,onCancel,returnFocus,suppressed}:SkyCoordsDialogProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),first=useRef<HTMLInputElement>(null),lastFocus=useRef<HTMLElement|null>(null);
 // Presented again under a pending message box (blocked at mount), the dialog is inert and cannot take focus yet: its
 // first field then receives focus when the box closes, through the same path as after an OK error box below.
 useEffect(()=>{if(blocked)lastFocus.current=first.current;else{first.current?.focus();first.current?.select();}
  const back=returnFocus.current;return ()=>{if(!suppressed.current)back?.focus();};},[returnFocus,suppressed]);// mount-time `blocked` only
 // OKBtnClick has no SetFocus: after an error box, focus returns to the control that chose OK.
 useEffect(()=>{if(blocked)return;const el=lastFocus.current;lastFocus.current=null;if(el&&root.current?.contains(el))el.focus();},[blocked]);
 const ok=()=>{lastFocus.current=document.activeElement as HTMLElement|null;onOk();};
 // RA-EP-03 on the current draft: OK would take the polar branch with a southern entry and store a northern Dec.
 const draftPoleSignLost=dialog.epochIndex===1&&skyCoordsDraftTarget(dialog)?.conversion?.southPoleSignLost===true;
 // WEB-EP-03 on the current fields: the stored B1950 Dec is southern but these fields read as northern with a bare 0°.
 const reopenSign=dialog.origin!=='hot-list'&&storedB1950!==null&&skyCoordsPrefillMinusLost(dialog.fields,storedB1950.dec);
 const reopenPole=dialog.openSouthPoleSignLost===true;
 const describedBy=[`${id}-help`,reopenPole&&`${id}-reopen-pole`,reopenSign&&`${id}-reopen-sign`].filter(Boolean).join(' ');
 const field=(name:SkyCoordsField,label:ReactNode,ref?:RefObject<HTMLInputElement|null>)=><label className="antenna-field">
  <span>{label}</span>
  <input ref={ref} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={SKY_COORDS_FIELD_MAX_LENGTH} data-testid={`antenna-field-${name}`} value={dialog.fields[name]} onChange={e=>onEdit(name,e.target.value)}/>
 </label>;
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(blocked||ignoreHeldKey(e))return;
  if(e.key==='Escape'){e.preventDefault();onCancel();return;}
  if(e.key==='Enter'&&(e.target as HTMLElement).tagName==='INPUT'&&(e.target as HTMLInputElement).type==='text'){e.preventDefault();ok();return;}
  trapTab(e,root.current);
 };
 return <div className="antenna-backdrop">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={describedBy} className="antenna-dialog" data-testid="antenna-dialog" onKeyDown={onKeyDown} inert={blocked||undefined}>
   <h3 id={`${id}-title`} className="radio-control-native">{SKY_COORDS_CAPTIONS.form.trim()}</h3>
   <p id={`${id}-help`} className="radio-control-note">{ta('antenna.dialog.help')}</p>
   <fieldset className="antenna-group"><legend className="radio-control-native">{SKY_COORDS_CAPTIONS.raGroup}</legend>
    {field('raHours',SKY_COORDS_CAPTIONS.hours,first)}{field('raMinutes',SKY_COORDS_CAPTIONS.minutes)}{field('raSeconds',SKY_COORDS_CAPTIONS.seconds)}
   </fieldset>
   <fieldset className="antenna-group"><legend className="radio-control-native">{SKY_COORDS_CAPTIONS.decGroup}</legend>
    {field('decDegrees',SKY_COORDS_CAPTIONS.degrees)}
    {field('decMinutes',<>{SKY_COORDS_CAPTIONS.arcminutes}<span className="visually-hidden">{ta('antenna.dialog.arcminutes')}</span></>)}
    {field('decSeconds',<>{SKY_COORDS_CAPTIONS.arcseconds}<span className="visually-hidden">{ta('antenna.dialog.arcseconds')}</span></>)}
   </fieldset>
   <fieldset className="antenna-group antenna-epoch" disabled={!dialog.epochEnabled}><legend className="radio-control-native">{SKY_COORDS_CAPTIONS.epochGroup}</legend>
    {SKY_COORDS_CAPTIONS.epochs.map((caption,index)=><label key={caption} className="radio-control-check"><input type="radio" name={`${id}-epoch`} data-testid={`antenna-epoch-${index}`} checked={dialog.epochIndex===index} onChange={()=>onEpoch(index as 0|1)}/>{caption}</label>)}
   </fieldset>
   {dialog.epochEnabled&&dialog.epochIndex===1&&<p className="radio-control-note" data-testid="antenna-b1950-note">{ta('antenna.dialog.b1950Note',{threshold:POLE_THRESHOLD_TEXT})}</p>}
   {/* Always mounted while the epoch group is enabled, so a warning that appears while typing is announced politely. */}
   {dialog.epochEnabled&&<div role="status" aria-live="polite" data-testid="antenna-b1950-pole-status">
    {draftPoleSignLost&&<p className="radio-control-note" data-testid="antenna-b1950-pole">{ta('antenna.dialog.b1950Pole',{threshold:POLE_THRESHOLD_TEXT})}</p>}
   </div>}
   {reopenPole&&<p id={`${id}-reopen-pole`} className="radio-control-note" data-testid="antenna-b1950-reopen-pole">{ta('antenna.dialog.b1950ReopenPole')}</p>}
   {dialog.origin!=='hot-list'&&storedB1950&&<p className="radio-control-note" data-testid="antenna-b1950-reopen">{ta('antenna.dialog.b1950Reopen')}</p>}
   {reopenSign&&<p id={`${id}-reopen-sign`} className="radio-control-note" data-testid="antenna-b1950-reopen-sign">{ta('antenna.dialog.b1950ReopenSign')}</p>}
   {dialog.origin==='hot-list'&&<p className="radio-control-note" data-testid="antenna-dialog-hotlist-origin">{ta('antenna.hotList.origin')}</p>}
   <ModalLimit lead={ta('antenna.modalLimit.dialog')} reasons={limitReasons} testId="antenna-dialog-limit"/>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="antenna-dialog-ok" onClick={ok}>{menuCaptionText(SKY_COORDS_CAPTIONS.ok)}</button>
    <button type="button" className="secondary-button" data-testid="antenna-dialog-cancel" onClick={onCancel}>{menuCaptionText(SKY_COORDS_CAPTIONS.cancel)}</button>
   </div>
  </div>
 </div>;
}

/** Application.MessageBox stand-in: application-modal, default button first, Escape per escapeAnswer. */
function NoticeView({notice,ta,limitReasons,onAnswer,panel,suppressed}:Readonly<{notice:RadioLabNotice;ta:RadioAntennaTranslate;limitReasons:readonly string[];onAnswer:(answer:NoticeAnswer)=>void;
 panel:RefObject<HTMLElement|null>;suppressed:RefObject<boolean>}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),defaultButton=useRef<HTMLButtonElement>(null);
 const meta=NOTICE_META[notice.kind],buttons=NOTICE_BUTTONS[notice.kind];
 // Keyed on the box kind, not the notice object: a transition committed while the same box stays open must not move focus.
 // WEB: focus goes back only to a control of this panel, and not when the box was removed by a suppression. A box
 // presented again (for example an arrival reached while the route was hidden) may have found focus in the App header;
 // it does not send focus there, and Set Coordinates takes it as after any last box.
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;defaultButton.current?.focus();
  return ()=>{if(!suppressed.current&&previous?.isConnected&&panel.current?.contains(previous))previous.focus();};},[notice.kind,panel,suppressed]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(ignoreHeldKey(e))return;
  // Browser policy: a Space held on a direction button (key-owned hold) can open a horizon-limit box mid-hold; its
  // auto-repeated keydowns would arm the newly focused button and the release would answer it. Only repeats are
  // dropped here, so a fresh Space still activates a button; text fields elsewhere keep held Space (not ignoreHeldKey).
  if(e.repeat&&e.key===' '){e.preventDefault();return;}
  if(e.key==='Escape'){e.preventDefault();const answer=escapeAnswer(notice.kind);if(answer)onAnswer(answer);return;}
  trapTab(e,root.current);
 };
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} className="antenna-dialog antenna-notice" data-testid="antenna-notice" data-kind={notice.kind} onKeyDown={onKeyDown}>
   <h3 id={`${id}-title`}>{noticeTitle(notice,ta)}</h3>
   <p id={`${id}-body`} data-testid="antenna-notice-text">{noticeText(notice,ta)}</p>
   <p className="radio-control-note" data-testid="antenna-notice-note">{meta.flags?ta(meta.note??'antenna.notice.native',{flags:meta.flags}):ta(meta.note??'antenna.notice.gate')}</p>
   {notice.kind==='confirm-slew'&&notice.b1950&&<p className="radio-control-note" data-testid="antenna-notice-b1950" data-pole-sign-lost={notice.b1950.southPoleSignLost||undefined}>
    {ta('antenna.notice.b1950')}{notice.b1950.southPoleSignLost?` ${ta('antenna.notice.b1950PoleSign')}`:''}</p>}
   <ModalLimit lead={ta('antenna.modalLimit.confirm')} reasons={limitReasons} testId="antenna-notice-limit"/>
   <div className="button-row">
    {buttons.map((answer,index)=><button key={answer} ref={index===0?defaultButton:undefined} type="button" className={index===0?'primary-button':'secondary-button'} data-testid={`antenna-notice-${answer}`} onClick={()=>onAnswer(answer)}>{ta(BUTTON_KEYS[answer])}</button>)}
   </div>
  </div>
 </div>;
}

/** Self-contained stateful wrapper (harness/demo). Starts from the recovered initial states with every
 * external input explicit and the diameter unset; the antenna uses the compiled options. `fixedRadioClock` is an
 * optional explicit radio clock reading the harness supplies (no automatic ticks; OK, box answers, the manual clock
 * button and releases read it); without it no clock is supplied. */
export function RadioControlWorkbench({initialEnvironment,translate,antennaOptions,autoSlewTimer,fixedRadioClock}:Readonly<{initialEnvironment?:RadioEnvironment;translate?:RadioTranslate;antennaOptions?:RadioLabOptions;autoSlewTimer?:boolean;fixedRadioClock?:RadioClockReading}>){
 const [state,setState]=useState<RadioControlState>(INITIAL_RADIO_CONTROL);
 const [environment,setEnvironment]=useState<RadioEnvironment>(initialEnvironment??{domeByte:0,accessOptionByte:false,dishDiameterMeters:null,otherWindowItemsVisible:false});
 const [antenna,setAntenna]=useState<RadioLabState>(INITIAL_RADIO_LAB);
 const radioClock=useMemo<RadioClockSource|undefined>(()=>fixedRadioClock&&{read:()=>({status:'ok',reading:fixedRadioClock}),supplied:true,domain:false,autoTick:false,run:0},[fixedRadioClock]);
 return <RadioControlPanel state={state} environment={environment} onTransition={tr=>setState(tr.state)} onEnvironmentChange={setEnvironment} translate={translate}
  antenna={antenna} onAntennaTransition={tr=>setAntenna(tr.state)} antennaOptions={antennaOptions} autoSlewTimer={autoSlewTimer} radioClock={radioClock}/>;
}

/** Standalone mount for the loopback harness; App integration should render RadioControlPanel directly. */
export function mountRadioWorkbench(element:Element,props:Readonly<{antennaOptions?:RadioLabOptions;autoSlewTimer?:boolean;fixedRadioClock?:RadioClockReading}>={}){
 const root=createRoot(element);root.render(<StrictMode><RadioControlWorkbench {...props}/></StrictMode>);return root;
}
