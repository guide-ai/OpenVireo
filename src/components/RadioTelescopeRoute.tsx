import {useEffect,useId,useLayoutEffect,useRef,useState,useSyncExternalStore,type KeyboardEvent,type MutableRefObject,type RefObject} from 'react';
import {radioWorkspaceSnapshot,type RadioSnapshotResult,type RadioWorkspaceSnapshot,type RestoredRadioWorkspace} from '../core/radioInvestigation';
import RadioControlPanel,{type RadioClockSource,type RadioReceiverButton,type RadioReceiverButtonReason} from './RadioControlPanel';
import {INITIAL_RADIO_RECEIVER_SUMMARY,RadioReceiverWorkspace,type RadioReceiverApi,type RadioReceiverSummary} from './RadioReceiverWindows';
import {INITIAL_RADIO_CONTROL,RANDOM_ACCESS_RANGE_MS,menuCaptionText,type RadioControlState,type RadioEnvironment} from '../core/radioControl';
import {INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS,RADIO_LAB_CONSTANTS,isRadioLabModal,type RadioLabOptions,type RadioLabState,type RadioLabTransition} from '../core/radioAntenna';
import {PULSAR_EXERCISE_SCENARIO,UNSUPPLIED_RADIO_ENVIRONMENT,pulsarSetupComplete,startPulsarExercise,type PulsarSetupStep} from '../core/pulsarExerciseStart';
import {sameRadioExerciseSummary,type RadioExerciseSummary} from '../core/pulsarLab';
import {
 INITIAL_RADIO_CLOCK_SCENARIO,RADIO_CLOCK_CONSTANTS,applyCompiledRadioLongitude,applyRadioClockDialogUT,applyRadioClockUTC,cancelRadioClockDraft,editRadioClockDraft,
 freezeRadioClock,pauseRadioClock,radioClockDomainWaitMS,radioClockInstant,radioClockSnapshot,readRadioClock,startRadioClock,stopRadioClockPastEnd,thawRadioClock,
 type RadioClockScenario,type RadioClockScenarioOutcome,type RadioClockScenarioTransition,
} from '../core/radioClock';
import {
 ID_MAX_LENGTH,INITIAL_RADIO_DATE,RADIO_DATE_WEB_LIMITS,SET_DATE_MENU_CAPTION,UT_DIALOG_CAPTIONS,cancelRadioDateDialog,confirmRadioDateDialog,dismissRadioDateError,
 editRadioDateField,markRadioActivationReached,openRadioDateDialog,radioDateGate,
 type DialogEntryFailure,type RadioDateDialog,type RadioDateField,type RadioDateState,type RadioDateTransition,
} from '../core/radioDateDialog';
import {ignoreHeldKey,nativeModalOpen,noNativeModal,observeNativeModals,observeNothing,trapTab} from './radioModal';
import {usePulsarParametersHost} from './RadioPulsarParameters';
import {useRadioAccessHost} from './RadioAccessOptions';
import {preparePulsarListCommand,type PulsarListCommandResult} from '../core/radioPulsarListCommand';
import {radioOptionsCompiledRecord,type RadioOptionsRecord} from '../core/radioAccessOptions';
import {projectRadioOptionsEnv,radioOptionsConsumerMismatches,type RadioOptionsProjectionReport,type RadioReceiverProjectionReport} from '../core/radioOptionsProjection';
import {RADIO_RECEIVER_COMPILED_OPTIONS,type RadioReceiverOptions} from '../core/radioReceiver';
import {copyReceiverLiveOptions} from '../core/radioReceiverSession';
import {t,type PlainMessageKey} from '../i18n';
import type {SharedHotListHandle} from '../useSharedHotList';
import type {SharedPulsarDataHandle} from '../useSharedPulsarData';

/** Scenario inputs at first use: the FormCreate dome byte 0 (RC-01) and nothing supplied. The learner applies the recovered
 * compiled defaults (diameter 100, access option off) or other values explicitly, or Start pulsar exercise applies them while
 * they are still unsupplied; the observatory dome is not linked. */
const UNSUPPLIED_ENVIRONMENT:RadioEnvironment=UNSUPPLIED_RADIO_ENVIRONMENT;
/** Why Start pulsar exercise is unavailable now (first failing gate), on the latest refs. */
type ExerciseBlock='inactive'|'modal'|'receiver-box'|'hold';
type ExerciseStatus=Readonly<{kind:'started'|'incomplete';applied:number;kept:number}|{kind:'blocked';reason:ExerciseBlock}|{kind:'refused';step:PulsarSetupStep;outcome:string}>;
/** Refusal outcomes with their own wording; any other is named generically. */
const EXERCISE_OUTCOMES=new Set(['diameter-required','timer-waiting-dome','draft-pending','options-unsupported','modal-open','manual-latched','changed','exercise-required','switch-unavailable']);
/** Monotonic browser time injected into the pure scenario transitions. */
const perfNow=()=>performance.now();
/** Largest setTimeout delay (2^31 − 1 ms): browsers overflow a larger one and fire it at once, so the range-end deadline
 * is capped and re-armed. */
const MAX_TIMER_DELAY_MS=2147483647;
const UT_MAX_TEXT=new Date(RADIO_CLOCK_CONSTANTS.maxUTMS).toISOString();
/** Scenario outcomes announced in the clock status line (per-keystroke and host freeze/thaw outcomes are not). */
const CLOCK_OUTCOME_KEYS:Readonly<Partial<Record<RadioClockScenarioOutcome,PlainMessageKey>>>={
 'utc-applied':'radioRoute.clock.outcome.utc-applied','utc-invalid':'radioRoute.clock.outcome.utc-invalid','draft-cancelled':'radioRoute.clock.outcome.draft-cancelled',
 'longitude-applied':'radioRoute.clock.outcome.longitude-applied','longitude-unchanged':'radioRoute.clock.outcome.longitude-unchanged',
 started:'radioRoute.clock.outcome.started','start-needs-utc':'radioRoute.clock.outcome.start-needs-utc','start-needs-longitude':'radioRoute.clock.outcome.start-needs-longitude',
 'already-running':'radioRoute.clock.outcome.already-running',paused:'radioRoute.clock.outcome.paused','not-running':'radioRoute.clock.outcome.not-running',
 'utc-dialog-applied':'radioRoute.clock.outcome.utc-dialog-applied',
};
/** WEB-DATE-02 domain bounds of the dialog result (whole seconds), for the browser-limit box. */
const DATE_MIN_TEXT=new Date(RADIO_DATE_WEB_LIMITS.minUTMS).toISOString().slice(0,19)+'Z',DATE_MAX_TEXT=new Date(RADIO_DATE_WEB_LIMITS.maxUTMS).toISOString().slice(0,19)+'Z';
const DATE_MENU_TEXT=menuCaptionText(SET_DATE_MENU_CAPTION);
const LIST_UNAVAILABLE:PulsarListCommandResult=Object.freeze({ok:false,reason:'unavailable'});
const LIST_PREPARE_FAILED:PulsarListCommandResult=Object.freeze({ok:false,reason:'prepare-failed'});
type DateFieldRefusal=Readonly<{field:RadioDateField;outcome:'field-too-long'|'field-not-ascii'}>;

export type RadioTelescopeRouteProps=Readonly<{
 /** The route is shown. While false the panel presents no dialog or box; its timers keep running. */
 active:boolean;
 /** A project operation runs: presentation is suppressed, the panel timers pause without catch-up and the radio clock
  * scenario time is frozen (re-anchored afterwards, without catch-up). */
 busy:boolean;
 /** Whether a radio surface is presented: a panel dialog or box, or the Set Date/Time, ID dialog or its error box. */
 onModalPresentedChange:(presented:boolean)=>void;
 /** The shared HTL document owned by the App (forwarded to the panel's Slew ▸ Hot List). */
 hotList?:SharedHotListHandle;
 /** R-RX4 the App's current pulsar dataset and the navigation to Pulsar Analysis (forwarded to the receiver Record). */
 pulsarData?:SharedPulsarDataHandle;onOpenPulsarAnalysis?:()=>void;
 /** WEB-PULSAR-GUIDE-01: the exercise state the pulsar guide reads, reported in the layout phase only when it changes. */
 onExerciseProgress?:(summary:RadioExerciseSummary)=>void;
 /** Phase 1 item 1.5: the workspace restored from an investigation file, read once at mount (the host remounts the route
  * with a new key, so every timer, hold, slew, dialog and read of the previous workspace ends with it). */
 restored?:RestoredRadioWorkspace|null;
 /** Phase 1 item 1.5: Save investigation reads the workspace through this controller (latest refs; refuses while unsafe). */
 controllerRef?:MutableRefObject<RadioRouteController|null>;
}>;
export type RadioRouteController=Readonly<{snapshot:()=>RadioSnapshotResult<RadioWorkspaceSnapshot>}>;

/**
 * WEB route workspace for the recovered radio telescope controls (docs/RADIO-SAVED-ROWS-INTEGRATION.md). The control,
 * scenario, antenna and radio clock states live here, so the 100 ms slew and 1000 ms clock updates re-render only this
 * subtree. The chosen scenario starts at the recovered compiled option defaults; nothing is read from a classroom options
 * file, the observatory dome or clock, the host clock or a random source: the radio UT and longitude are applied
 * explicitly (RA-13, WEB-CLOCK-01). The only option the learner may change is the recovered Limit Slewing flag, through
 * the panel's explicit radio options scenario (WEB-ALT-03); the horizon limit stays compiled. Before activation, File ▸
 * Set Observation Date/Time, ID (RC-12…RC-17, WEB-DATE-01…04) sets the applied UT from the dialog and stores the typed ID
 * for this window only; nothing reads that ID. The Pulsar Parameters utility (docs/RADIO-PULSAR-PARAMETERS.md) reads a
 * learner-loaded reference catalog, the radio clock scenario at Open/Reset and, at Open and Find, the receiver session's
 * shared source buffer; it writes none of them. The panel's Receiver button opens the silent receiver monitor (docs/RADIO-RECEIVER-MONITOR.md), which reads the
 * same catalog (locked while receivers exist), the pointing, the radio clock JD and perfNow; it writes none of them. The
 * R-RX7 Radio configuration card (docs/RADIO-ACCESS-OPTIONS.md) owns the Preferences gate scenario, the Access Pulsar List
 * option and the PulsarList1 readout; it only observes the antenna's first activation and committed receiver Open/close
 * events. R-RX8: that card also shows File ▸ Pulsar List... while the item is shown; its click runs runPulsarList here,
 * which writes only the receivers' shared source buffer and activates Pulsar Parameters (WEB-PP-LIST-04), never the menu
 * flags, a receiver Open or the picker callback. R-RX9 (docs/RADIO-SIMULATION-OPTIONS.md): once the learner chooses a
 * compiled numeric branch there, the radio options own the antenna options, the receivers' live options view and the
 * panel's dish diameter (env+0x37ab = env+0x2e95 + 0x916); each Preferences close projects the env copy onto them
 * (projectOptions), the panel's Limit Slewing scenario is withdrawn and legacy diameter writes are shielded here. Phase 1
 * item 1.5: Save investigation reads this workspace through controllerRef, and a restore mounts it from `restored`.
 */
export default function RadioTelescopeRoute({active,busy,onModalPresentedChange,hotList,pulsarData,onOpenPulsarAnalysis,onExerciseProgress,restored=null,controllerRef}:RadioTelescopeRouteProps){
 const [initial]=useState(()=>restored);
 const [state,setState]=useState<RadioControlState>(()=>initial?.control??INITIAL_RADIO_CONTROL);
 // Latest accepted control state, read by Start pulsar exercise.
 const controlRef=useRef(state);
 useLayoutEffect(()=>{controlRef.current=state;},[state]);
 const [environment,setEnvironment]=useState<RadioEnvironment>(()=>initial?.environment??UNSUPPLIED_ENVIRONMENT);
 const [antenna,setAntenna]=useState<RadioLabState>(()=>initial?.antenna??INITIAL_RADIO_LAB);
 // Latest accepted antenna state (committed or handed over by the panel in this task), read by the receiver handlers.
 const antennaRef=useRef(antenna);
 useLayoutEffect(()=>{antennaRef.current=antenna;},[antenna]);
 // ---- Silent receiver monitor (R-RX2): the workspace owns its session; the route owns the button and the gates.
 const receiverApiRef=useRef<RadioReceiverApi|null>(null),receiverButtonRef=useRef<HTMLButtonElement>(null);
 const [receiverSummary,setReceiverSummary]=useState<RadioReceiverSummary>(INITIAL_RADIO_RECEIVER_SUMMARY);
 const [options,setOptions]=useState<RadioLabOptions>(()=>initial?.options??RADIO_COMPILED_OPTIONS);
 const [scenario,setScenario]=useState<RadioClockScenario>(()=>initial?.clock??INITIAL_RADIO_CLOCK_SCENARIO);
 const [clockOutcome,setClockOutcome]=useState<RadioClockScenarioOutcome|'domain-stopped'|null>(null);
 // The scenario of the latest commit, read by Start pulsar exercise (a user click, so no functional update is pending).
 const scenarioRef=useRef(scenario);
 useLayoutEffect(()=>{scenarioRef.current=scenario;},[scenario]);
 const [exerciseStatus,setExerciseStatus]=useState<ExerciseStatus|null>(null);
 // ---- File ▸ Set Observation Date/Time, ID before activation (RC-12…RC-17, WEB-DATE-01…04). Steps run on the latest
 // accepted date state (dateRef), so two actions in one task chain instead of reading the not yet committed state.
 const [dateState,setDateState]=useState<RadioDateState>(()=>initial?.date??INITIAL_RADIO_DATE);
 const dateRef=useRef(dateState);
 const [dateOutcome,setDateOutcome]=useState<RadioDateTransition|null>(null);
 const [fieldRefusal,setFieldRefusal]=useState<DateFieldRefusal|null>(null);
 const stepDate=(step:(s:RadioDateState)=>RadioDateTransition)=>{
  const result=step(dateRef.current);if(result.changed){dateRef.current=result.state;setDateState(result.state);}return result;
 };
 const id=useId(),o=RADIO_COMPILED_OPTIONS;
 // R-RX9: the latest accepted antenna options and panel inputs, read by the opt-in check and the projection in handlers.
 const optionsRef=useRef(options),environmentRef=useRef(environment);
 useLayoutEffect(()=>{optionsRef.current=options;},[options]);
 useLayoutEffect(()=>{environmentRef.current=environment;},[environment]);
 /** The receivers' live options view as last committed here (the workspace starts from the compiled defaults and only the
  * R-RX9 projection replaces it). Presentation only. */
 const [liveReceiverOptions,setLiveReceiverOptions]=useState<RadioReceiverOptions>(()=>initial?.liveReceiverOptions??RADIO_RECEIVER_COMPILED_OPTIONS);
 /** Only Limit Slewing comes from the scenario; every other value stays the compiled default (no other owner exists here).
  * R-RX9: under a numeric authority the radio options own the antenna options; a scenario apply that reaches this handler
  * anyway (same task, programmatic) is ignored. */
 const applyOptions=(next:RadioLabOptions)=>{
  if(access.authorityNow().kind!=='absent')return;
  const value=Object.freeze({...RADIO_COMPILED_OPTIONS,limitsEnabled:next.limitsEnabled===true});optionsRef.current=value;setOptions(value);
 };
 /** The panel's scenario inputs. R-RX9: under a numeric authority env+0x37ab is record+0x916, so no legacy write (the
  * diameter editor, Clear or the compiled-defaults preset) may change the diameter; the other inputs are kept as sent. */
 const changeEnvironment=(next:RadioEnvironment)=>{
  const value=access.authorityNow().kind==='absent'?next:Object.freeze({...next,dishDiameterMeters:environmentRef.current.dishDiameterMeters});
  environmentRef.current=value;setEnvironment(value);
 };
 // A project operation freezes scenario time; its end re-anchors it without catch-up (the panel also cancels its timers).
 useEffect(()=>{setScenario(s=>(busy?freezeRadioClock:thawRadioClock)(s,perfNow()).scenario);},[busy]);
 const apply=(step:(s:RadioClockScenario)=>RadioClockScenarioTransition)=>{
  const result=step(scenario);setClockOutcome(result.outcome);if(result.changed)setScenario(result.scenario);
 };
 /** The range end: stop at the last valid reading; the antenna keeps its last accepted tick. Nothing is clamped. The
  * updater re-checks the latest queued scenario, so a pending Apply, Pause or freeze is never overridden; `seen` is the
  * scenario of the caller's render and only its own stop is announced. */
 const stopPastEnd=(seen:RadioClockScenario)=>{
  const perf=perfNow();
  setScenario(s=>stopRadioClockPastEnd(s,perf).scenario);
  if(stopRadioClockPastEnd(seen,perf).changed)setClockOutcome('domain-stopped');
 };
 // WEB range-end deadline owned by the scenario, independent of the antenna, panel activation and route visibility. None
 // while paused, frozen (host busy), stopped or unsupplied; a capped or early timeout re-arms; thaw re-arms from the
 // remaining scenario time without catch-up. A new run or anchor is a new scenario object and so a new deadline.
 useEffect(()=>{
  let handle:number|undefined;
  const arm=()=>{
   const wait=radioClockDomainWaitMS(scenario,perfNow());
   if(wait===null)return;
   if(wait===0){stopPastEnd(scenario);return;}
   handle=window.setTimeout(arm,Math.min(wait,MAX_TIMER_DELAY_MS));
  };
  arm();
  return ()=>window.clearTimeout(handle);
 },[scenario]);// stopPastEnd only calls stable state setters
 const radioClock:RadioClockSource={
  read:()=>{
   const r=readRadioClock(scenario,perfNow());
   if(r.status==='domain')stopPastEnd(scenario);
   return r;
  },
  supplied:scenario.utc!==null&&scenario.longitudeRadians!==null&&scenario.limit===null,
  domain:scenario.limit==='domain'&&scenario.utc!==null&&scenario.longitudeRadians!==null,
  autoTick:scenario.running&&scenario.limit===null,
  run:scenario.run,
 };
 // Paused, stopped or frozen scenarios have a fixed instant; a running one is shown through the panel's last accepted tick.
 const fixedInstant=scenario.anchorPerfMS===null?radioClockInstant(scenario,0):null;
 const outcomeKey=clockOutcome&&clockOutcome!=='domain-stopped'?CLOCK_OUTCOME_KEYS[clockOutcome]:undefined;
 const stateText=scenario.utc===null?t('radioRoute.clock.state.unsupplied'):scenario.longitudeRadians===null?t('radioRoute.clock.state.needsLongitude')
  :scenario.limit==='domain'?t('radioRoute.clock.state.domain',{max:UT_MAX_TEXT})
  :scenario.running?(busy?t('radioRoute.clock.state.frozen'):t('radioRoute.clock.state.running'))
  :t('radioRoute.clock.state.paused',{ut:fixedInstant===null?'':new Date(fixedInstant).toISOString()});
 // Native application modality: an open radio dialog or box disables every other control, this card included.
 const modal=isRadioLabModal(antenna);
 /** WEB-DATE-01 gate on a date state at a performance time: the scenario instant then, the exercise entry and activation. */
 const dateGateFor=(s:RadioDateState,perf:number)=>radioDateGate(s,{exerciseEntered:state.exerciseEntered,antennaActivated:antenna.activated,
  panelShown:state.radioPanelShown,utMs:radioClockInstant(scenario,perf),stoppedAtEnd:scenario.limit==='domain'});
 const dateGate=dateGateFor(dateState,perfNow());
 const dateOpen=dateState.dialog!==null;
 // Presentation ownership as for the panel's own surfaces: only on the active route, outside a project operation and with
 // no native modal <dialog> of the page open. Hidden, the dialog keeps its state and fields.
 const datePending=dateOpen&&active&&!busy;
 const dateForeign=useSyncExternalStore(datePending?observeNativeModals:observeNothing,datePending?nativeModalOpen:noNativeModal,noNativeModal);
 const datePresented=datePending&&!dateForeign;
 // Pulsar Parameters utility (WEB-PP-*): its Find dialog and boxes yield to an antenna surface and are presented under the
 // same route, busy and foreign-dialog rules. The clock is read without side effects (no range-end stop from here).
 /** Side-effect-free JD of the radio clock scenario now (no range-end stop from here), or null without an ok reading. */
 const readClockJD=()=>{const r=readRadioClock(scenario,perfNow());return r.status==='ok'?r.reading.jd:null;};
 // The receiver close box and the R-RX4 Record prompts and finish dialogs make the card application-modal behind them (as
 // the date dialog does).
 const receiverBoxPresented=receiverSummary.boxPresented&&active&&!busy;
 // R-RX7 Radio configuration: its box and dialogs are application-modal over every radio card and yield (kept) to an antenna
 // surface or a pending receiver box/Record dialog. Pending, not presented: a receiver box that became pending behind an
 // antenna box is committed before that box closes, so the configuration never mounts (and takes focus) in the same commit
 // as the receiver box it must yield to. Preferences is refused, before any native step, while another radio surface
 // exists (latest state).
 const parametersOpenRef=useRef(false);
 // R-RX8 File ▸ Pulsar List...: the card calls the latest runPulsarList (set below, after both owners exist) through a ref.
 const listRunner=useRef<()=>PulsarListCommandResult>(()=>LIST_UNAVAILABLE);
 const routeLatest=useRef({active,busy}),panelPresentedRef=useRef(false);
 useLayoutEffect(()=>{routeLatest.current={active,busy};});
 /** WEB-RSO-AUTH-01 opt-in check on the latest consumer values (antenna options, receiver live view, panel diameter). */
 const optionsMismatches=(hostPredicate:boolean)=>radioOptionsConsumerMismatches(radioOptionsCompiledRecord(hostPredicate),
  {antenna:optionsRef.current,receiver:receiverApiRef.current?.sessionNow().bank.options??null,environment:environmentRef.current});
 /** WEB-RSO-PROJ-01: synchronously after a committed Preferences close under an authority. Each consumer commits on its own
  * latest owner state; a refused consumer keeps its value and is reported as refused (no retry, no Open, reseed,
  * reassociation or paint). The receiver copy is a compare-and-swap on the session it was prepared from. */
 const projectOptions=(env:RadioOptionsRecord):RadioOptionsProjectionReport=>{
  const api=receiverApiRef.current,session=api?.sessionNow()??null;
  const p=projectRadioOptionsEnv(env,{antenna:optionsRef.current,antennaHeld:antennaRef.current.manualPress,receiver:session?.bank.options??null,environment:environmentRef.current});
  if(p.antenna.kind==='applied'){optionsRef.current=p.antenna.options;setOptions(p.antenna.options);}
  if(p.panel.kind==='applied'){environmentRef.current=p.panel.environment;setEnvironment(p.panel.environment);}
  let receiver:RadioReceiverProjectionReport;
  if(p.receiver.kind!=='apply')receiver=p.receiver;
  else if(api===null||session===null)receiver={kind:'unavailable'};
  else{
   const tr=copyReceiverLiveOptions(session,p.receiver.options),o=tr.outcome;
   if(o.kind==='web-refused')receiver={kind:o.reason==='record-lease-held'?'refused-record-lease':'refused-box'};
   else if(o.kind==='refused')receiver={kind:'refused-error'};
   else if(api.commitLiveOptions(session,tr)){receiver={kind:'applied',changes:p.receiver.changes};setLiveReceiverOptions(p.receiver.options);}
   else receiver={kind:'refused-stale'};
  }
  return Object.freeze({antenna:p.antenna,receiver:Object.freeze(receiver),panel:p.panel});
 };
 const access=useRadioAccessHost({active,busy,antennaModal:modal,receiverBoxPending:receiverSummary.boxPending&&active&&!busy,
  surfaceNow:()=>isRadioLabModal(antennaRef.current)||dateRef.current.dialog!==null||parametersOpenRef.current?'modal'
   :receiverApiRef.current?.boxRefusal()?'receiver-box':null,
  runPulsarList:()=>listRunner.current(),
  numeric:{mismatchesFor:optionsMismatches,onEnvironmentCopied:projectOptions,view:{antenna:options,receiver:liveReceiverOptions,panelDiameter:environment.dishDiameterMeters}},
  initial:initial?.access??null});
 const optionsManaged=access.authority.kind!=='absent';
 // R-RX6: Open and Find read the receiver session's shared +0x5f7 buffer live and write nothing; the receiver close box and
 // Record dialogs refuse Open (WEB-PP-LIST-01..03); the receivers' picker runs move the window's shared list cursor (WEB-PP-CUR-01).
 const parameters=usePulsarParametersHost({active,busy,antennaModal:modal,dateOpen:dateOpen||receiverBoxPresented||access.open,
  antennaNow:()=>antennaRef.current,dateOpenNow:()=>dateRef.current.dialog!==null||access.openNow(),readClockJD,
  sharedSource:()=>receiverApiRef.current?.sourceBuffer()??null,receiverBoxNow:()=>receiverApiRef.current?.boxRefusal()??null,
  catalogLocked:receiverSummary.hasReceivers,catalogLockedNow:()=>receiverApiRef.current?.hasReceivers()??false,initialReference:initial?.reference??null});
 useLayoutEffect(()=>{parametersOpenRef.current=parameters.open;});
 /** WEB-PP-LIST-04 File ▸ Pulsar List...: synchronous, no await. Every gate reads the latest refs (a Receiver Open, antenna
  * dialog or date dialog earlier in the same task counts), the pure preparation runs on one snapshot, and both owners are
  * re-checked BEFORE the first commit; each commit is then a compare-and-swap that cannot run another owner's request. A
  * refusal changes nothing. No onReceiverOpened, picker callback, Receiver Open, menu step, paint or seed step follows.
  * This all-or-nothing admission is web policy: the native entry stores the buffer before its form calls, with no rollback. */
 const runPulsarList=():PulsarListCommandResult=>{
  const api=receiverApiRef.current,list=parameters.listSnapshot(),route=routeLatest.current;
  const prepared=preparePulsarListCommand({host:{active:route.active,busy:route.busy,pageVisible:document.visibilityState!=='hidden'},menu:access.menuNow(),
   catalog:list.catalog,reading:list.reading,
   modal:isRadioLabModal(antennaRef.current)||dateRef.current.dialog!==null||access.openNow()||nativeModalOpen()||panelPresentedRef.current,
   session:api?.sessionNow()??null,window:list.window,pointing:antennaRef.current.pointing,clockJD:readClockJD()});
  if(!prepared.ok)return prepared;
  const now=parameters.listSnapshot();
  if(api===null||receiverApiRef.current!==api||api.sessionNow()!==prepared.before.session||now.window!==prepared.before.window||now.catalog!==list.catalog)return LIST_PREPARE_FAILED;
  if(!api.commitPulsarList(prepared.before.session,prepared.session))return LIST_PREPARE_FAILED;
  // Unreachable after the checks above (no reentrant request between the two synchronous commits); never reported as success.
  if(!parameters.commitListActivation(prepared.before.window,prepared.window,{source:prepared.source,name:prepared.name}))throw new Error('File ▸ Pulsar List...: Pulsar Parameters changed between two synchronous commits');
  return prepared;
 };
 useLayoutEffect(()=>{listRunner.current=runPulsarList;});
 // A dialog removed by a suppression must not move focus; read by the view's cleanup after this commit's layout effects.
 const dateSuppressed=useRef(false);
 useLayoutEffect(()=>{dateSuppressed.current=dateOpen&&!datePresented;});
 const dateMenuRef=useRef<HTMLButtonElement>(null),utInputRef=useRef<HTMLInputElement>(null);
 // The host learns whether the panel or the date dialog is presented: called only on change, false once at mount, and
 // false on unmount while presenting. Reported in the layout phase so the host makes its controls inert before paint.
 const [panelPresented,setPanelPresented]=useState(false);
 useLayoutEffect(()=>{panelPresentedRef.current=panelPresented&&active&&!busy;});
 // The panel's report reaches this state one commit late. Gate it with the same route inputs the panel derives in this
 // render (active route, no project operation), so a stale true left by hiding the route or starting a project operation
 // is cleared in this commit, before the App's route-focus effect reads it (as the panel's former direct callback did).
 // On entry, true still arrives one commit later; the App waits on data-modal-pending meanwhile.
 const modalPresented=(panelPresented&&active&&!busy)||datePresented||parameters.presented||receiverBoxPresented||access.presented;
 const reportTo=useRef(onModalPresentedChange),reported=useRef<boolean|null>(null);
 useLayoutEffect(()=>{reportTo.current=onModalPresentedChange;});
 useLayoutEffect(()=>{if(reported.current!==modalPresented){reported.current=modalPresented;reportTo.current(modalPresented);}},[modalPresented]);
 useLayoutEffect(()=>()=>{if(reported.current){reported.current=false;reportTo.current(false);}},[]);
 const openDate=()=>{setFieldRefusal(null);const result=stepDate(s=>openRadioDateDialog(s,dateGateFor(s,perfNow())));setDateOutcome(result.outcome==='opened'?null:result);};
 const editDate=(field:RadioDateField,text:string)=>{
  const result=stepDate(s=>editRadioDateField(s,field,text));
  if(result.outcome==='field-too-long'||result.outcome==='field-not-ascii')setFieldRefusal({field,outcome:result.outcome});
  else if(result.outcome==='field-edited')setFieldRefusal(null);
 };
 const confirmDate=()=>{
  const result=stepDate(s=>confirmRadioDateDialog(s,dateGateFor(s,perfNow())));
  if(result.outcome==='applied'&&result.utMs!==undefined){
   const utMs=result.utMs,perf=perfNow();
   setScenario(s=>applyRadioClockDialogUT(s,utMs,perf).scenario);setClockOutcome('utc-dialog-applied');
  }
  if(result.outcome==='applied'||result.outcome==='gate-closed'){setFieldRefusal(null);setDateOutcome(result);}
 };
 const cancelDate=()=>{const result=stepDate(cancelRadioDateDialog);if(result.outcome==='cancelled'){setFieldRefusal(null);setDateOutcome(result);}};
 const dateGateText=dateGate.status==='available'?t('radioRoute.date.available')
  :dateGate.reason==='ut-domain'?t('radioRoute.date.refused.ut-domain',{max:UT_MAX_TEXT}):t(`radioRoute.date.refused.${dateGate.reason}`);
 const dateStatusText=dateOutcome?.outcome==='applied'&&dateOutcome.utMs!==undefined
  ?t('radioRoute.date.outcome.applied',{ut:t('radioRoute.clock.utcValue',{ut:new Date(dateOutcome.utMs).toISOString().slice(0,19)})})
  :dateOutcome?.outcome==='cancelled'?t('radioRoute.date.outcome.cancelled'):dateOutcome?.outcome==='gate-closed'?t('radioRoute.date.outcome.gate-closed'):'';
 const storedIdText=dateState.storedId===''?t('radioRoute.date.storedNone'):t('radioRoute.date.storedValue',{id:dateState.storedId});
 // Receiver button (Rcvr1Btn) gates, first failing one named: activation, Tracking (RA-04/RA-05 Receiver.Enabled), the
 // learner-loaded catalog and its pending read (WEB-RX-CAT-01), the seed of a new main, an open surface, the route state.
 const receiverReason:RadioReceiverButtonReason=!antenna.activated?'not-activated':!antenna.receiverEnabled?'receiver-disabled'
  :parameters.catalog===null?'no-catalog':parameters.catalogReading?'catalog-reading'
  :!receiverSummary.seedValid&&!receiverSummary.hasReceivers?'seed-invalid'
  :modal||dateOpen||parameters.presented||receiverBoxPresented||access.open?'modal':!active||busy?'inactive':'available';
 const receiverGate=useRef(receiverReason);
 useLayoutEffect(()=>{receiverGate.current=receiverReason;});
 /** The press re-checks the latest accepted antenna state and the committed gate before the workspace opens. */
 const openReceiver=()=>{
  const a=antennaRef.current;
  if(!a.activated||!a.receiverEnabled||isRadioLabModal(a)||access.openNow()||receiverGate.current!=='available')return;
  receiverApiRef.current?.open();
 };
 const receiverButton:RadioReceiverButton={available:receiverReason==='available',reason:receiverReason,onOpen:openReceiver,buttonRef:receiverButtonRef};
 /** The one commit path of a main-window control state (panel transitions and Start). */
 const commitControl=(next:RadioControlState)=>{controlRef.current=next;setState(next);if(next.radioPanelShown)stepDate(markRadioActivationReached);};
 /** The one commit path of an antenna transition (panel transitions and Start): the receivers and the Radio configuration
  * observe every committed transition, so a Start activation is seen exactly as a panel activation. */
 const commitAntenna=(tr:RadioLabTransition)=>{
  setAntenna(tr.state);antennaRef.current=tr.state;if(tr.state.activated)stepDate(markRadioActivationReached);
  receiverApiRef.current?.antennaTransition(tr);access.antennaTransition(tr);
 };
 // ---- WEB-PULSAR-START-01 Start pulsar exercise: gates on the latest refs, one pure snapshot, gates again, then commit.
 const exerciseBlockNow=():ExerciseBlock|null=>{
  const r=routeLatest.current,a=antennaRef.current;
  if(!r.active||r.busy)return 'inactive';
  if(isRadioLabModal(a)||dateRef.current.dialog!==null||parametersOpenRef.current||access.openNow()||nativeModalOpen()||panelPresentedRef.current)return 'modal';
  if(receiverApiRef.current?.boxRefusal())return 'receiver-box';
  return a.manualPress?'hold':null;
 };
 const exerciseBlock:ExerciseBlock|null=!active||busy?'inactive':modal||dateOpen||parameters.open||access.open?'modal'
  :receiverSummary.boxPending?'receiver-box':antenna.manualPress?'hold':null;
 const startExercise=()=>{
  const blocked=exerciseBlockNow();if(blocked){setExerciseStatus({kind:'blocked',reason:blocked});return;}
  const snapshot={control:controlRef.current,environment:environmentRef.current,antenna:antennaRef.current,options:optionsRef.current,clock:scenarioRef.current,
   managedDiameter:access.authorityNow().kind!=='absent'};
  const result=startPulsarExercise(snapshot);
  if(!result.ok){setExerciseStatus({kind:'refused',step:result.step,outcome:result.outcome});return;}
  if(exerciseBlockNow()!==null||controlRef.current!==snapshot.control||environmentRef.current!==snapshot.environment||antennaRef.current!==snapshot.antenna
   ||scenarioRef.current!==snapshot.clock){setExerciseStatus({kind:'refused',step:'exercise',outcome:'changed'});return;}
  if(result.control!==snapshot.control)commitControl(result.control);
  if(result.environment!==snapshot.environment)changeEnvironment(result.environment);
  for(const tr of result.antennaSteps)commitAntenna(tr);
  if(result.clock!==snapshot.clock){scenarioRef.current=result.clock;setScenario(result.clock);if(result.applied.includes('ut'))setClockOutcome('utc-applied');}
  // A kept Tracking that is off leaves setup incomplete: say so and name the control instead of reporting success.
  setExerciseStatus({kind:result.trackingOff?'incomplete':'started',applied:result.applied.length,kept:result.kept.length});
  // WEB-PP-SRC-04: the bundled reference catalog, only when none is loaded or being read (a loaded catalog is never replaced).
  const list=parameters.listSnapshot();
  if(list.catalog===null&&!list.reading)void parameters.loadBundled();
 };
 // ---- Phase 1 item 1.5 Save investigation: one synchronous snapshot of the latest accepted states (refs). The clock is
 // folded as Pause would fold it, without committing anything. Any open radio surface, slew, hold, receiving, armed Record or
 // catalog read refuses it (core radioWorkspaceSnapshot names the reason); nothing changes either way.
 useLayoutEffect(()=>{
  if(!controllerRef)return;
  controllerRef.current=Object.freeze({snapshot:():RadioSnapshotResult<RadioWorkspaceSnapshot>=>{
   const api=receiverApiRef.current;
   if(dateRef.current.dialog!==null||parametersOpenRef.current||access.openNow()||panelPresentedRef.current||nativeModalOpen())return Object.freeze({ok:false,reason:'radio-dialog'});
   if(api===null)return Object.freeze({ok:false,reason:'radio-profile'});
   return radioWorkspaceSnapshot({control:controlRef.current,environment:environmentRef.current,antenna:antennaRef.current,options:optionsRef.current,
    clock:radioClockSnapshot(scenarioRef.current,perfNow()),date:dateRef.current,access:access.stateNow(),receivers:api.sessionNow(),pendingWindows:api.pendingWindows(),reference:parameters.referenceNow()});
  }});
  return ()=>{controllerRef.current=null;};
 });
 const setupDone=pulsarSetupComplete({control:state,antenna,clock:scenario});
 const catalogState:RadioExerciseSummary['catalog']=parameters.catalog!==null?(parameters.source?.recorded?'recorded':'supplied'):parameters.catalogReading?'reading':'none';
 const exerciseSummary:RadioExerciseSummary={setup:setupDone,catalog:catalogState,sourceInBeam:receiverSummary.sourceInBeam,receivers:receiverSummary.receivers,
  frequencies:receiverSummary.frequencies,record:receiverSummary.record,trackingOff:antenna.activated&&!antenna.tracking};
 const progressTo=useRef(onExerciseProgress),progressReported=useRef<RadioExerciseSummary|null>(null);
 useLayoutEffect(()=>{progressTo.current=onExerciseProgress;});
 useLayoutEffect(()=>{
  const prev=progressReported.current;if(prev&&sameRadioExerciseSummary(prev,exerciseSummary))return;
  progressReported.current=exerciseSummary;progressTo.current?.(exerciseSummary);
 });
 const exerciseStatusText=exerciseStatus===null?''
  :exerciseStatus.kind==='blocked'?t(`radioRoute.exercise.blocked.${exerciseStatus.reason}`)
  :exerciseStatus.kind==='refused'?t('radioRoute.exercise.status.refused',{step:t(`radioRoute.exercise.step.${exerciseStatus.step}`),
   reason:EXERCISE_OUTCOMES.has(exerciseStatus.outcome)?t(`radioRoute.exercise.outcome.${exerciseStatus.outcome}` as PlainMessageKey):t('radioRoute.exercise.outcome.other',{outcome:exerciseStatus.outcome})})
  :exerciseStatus.kind==='started'&&!setupDone?t(antenna.activated&&!antenna.tracking?'radioRoute.exercise.trackingOff':'radioRoute.exercise.available')
  :exerciseStatus.kind==='incomplete'?(setupDone?t('radioRoute.exercise.ready'):antenna.activated&&!antenna.tracking?t('radioRoute.exercise.status.trackingOff',{applied:exerciseStatus.applied,kept:exerciseStatus.kept}):t('radioRoute.exercise.available'))
  :exerciseStatus.applied===0?t('radioRoute.exercise.status.nothing'):t('radioRoute.exercise.status.started',{applied:exerciseStatus.applied,kept:exerciseStatus.kept});
 const catalogText=parameters.catalog!==null?t(parameters.source?.recorded?'radioRoute.exercise.catalog.recorded':parameters.source?.valuesOnly?'radioRoute.exercise.catalog.restoredValues':'radioRoute.exercise.catalog.supplied',{name:parameters.source?.name??''})
  :parameters.catalogReading?t('radioRoute.exercise.catalog.reading'):parameters.bundledError?t(`radioRoute.exercise.catalog.error.${parameters.bundledError}`):t('radioRoute.exercise.catalog.none');
 const behindReceiverBox=receiverBoxPresented||undefined;
 const behindAccess=access.open||undefined,panelBehindAccess=access.presented||undefined;
 const restoredInstant=initial===null?null:radioClockInstant(initial.clock,0);
 return <div className="radio-route" data-testid="radio-route">
  {initial!==null&&<section className="card radio-control radio-control-env" aria-labelledby={`${id}-restored`} data-testid="radio-restored-note">
   <h2 id={`${id}-restored`}>{t('radioRoute.restored.heading')}</h2>
   <p>{t('radioRoute.restored.help')}</p>
   {restoredInstant!==null&&<p data-testid="radio-restored-clock">{t('radioRoute.restored.paused',{ut:new Date(restoredInstant).toISOString()})}</p>}
   <p className="radio-control-note" data-testid="radio-restored-adaptation">{t('radioRoute.restored.adaptation')}</p>
  </section>}
  <section className="card radio-control radio-control-env radio-route-exercise" aria-labelledby={`${id}-exercise`} data-testid="radio-exercise-card" data-setup={setupDone}
   data-catalog={catalogState} inert={modal||dateOpen||parameters.presented||behindReceiverBox||behindAccess}>
   <h2 id={`${id}-exercise`}>{t('radioRoute.exercise.heading')}</h2>
   <p>{t('radioRoute.exercise.intro')}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-exercise-start" disabled={exerciseBlock!==null} aria-describedby={`${id}-exercise-reason ${id}-exercise-adaptation`}
     onKeyDown={ignoreHeldKey} onClick={startExercise}>{t('radioRoute.exercise.start')}</button>
    {parameters.catalog===null&&parameters.bundledError!==null&&!parameters.catalogReading&&<button type="button" className="secondary-button" data-testid="radio-exercise-catalog-retry"
     disabled={!active||busy||parameters.open||receiverSummary.hasReceivers} onClick={()=>{void parameters.loadBundled();}}>{t('radioRoute.exercise.catalogRetry')}</button>}
   </div>
   <p id={`${id}-exercise-reason`} className="radio-control-note" data-testid="radio-exercise-reason" data-reason={exerciseBlock??undefined}>
    {exerciseBlock===null?(setupDone?t('radioRoute.exercise.ready'):antenna.activated&&!antenna.tracking?t('radioRoute.exercise.trackingOff'):t('radioRoute.exercise.available')):t(`radioRoute.exercise.blocked.${exerciseBlock}`)}</p>
   <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-exercise-status" data-kind={exerciseStatus&&(exerciseStatus.kind==='started'||exerciseStatus.kind==='incomplete')?(setupDone?'started':'incomplete'):exerciseStatus?.kind}
    data-step={exerciseStatus?.kind==='refused'?exerciseStatus.step:undefined}>{exerciseStatusText}</p>
   <p data-testid="radio-exercise-catalog" data-catalog={catalogState} data-error={parameters.bundledError??undefined}
    role={parameters.bundledError&&parameters.catalog===null?'alert':undefined} style={{overflowWrap:'anywhere'}}>{catalogText}</p>
   <p id={`${id}-exercise-adaptation`} className="radio-control-note" data-testid="radio-exercise-adaptation">{t('radioRoute.exercise.adaptation',{ut:PULSAR_EXERCISE_SCENARIO.ut})}</p>
   <p className="radio-control-note">{t('radioRoute.exercise.guideHint')}</p>
  </section>
  <section className="card radio-route-scenario" aria-labelledby="radio-route-scenario-title" data-testid="radio-route-scenario" inert={dateOpen||parameters.presented||behindReceiverBox||behindAccess}>
   <h2 id="radio-route-scenario-title">{t('radioRoute.scenario.heading')}</h2>
   <p className="radio-route-persistence" data-testid="radio-route-persistence">{t('radioRoute.persistence')}</p>
   {/* Phase 1 item 1.11: technical and provenance notes are collapsed; they are reading material, not controls or refusal reasons. */}
   <details className="radio-research-notes" data-testid="radio-research-notes">
    <summary>{t('radioRoute.notes.summary')}</summary>
    <p className="radio-control-note">{t('radioRoute.notes.help')}</p>
    <ul>
     <li data-testid="radio-route-scenario-options" data-managed={optionsManaged}>{optionsManaged?t('radioRoute.scenario.optionsManaged',{max:options.maxRateIndex,base:options.rateBase})
      :t('radioRoute.scenario.options',{max:o.maxRateIndex,base:o.rateBase})}</li>
     <li data-testid="radio-route-scenario-environment">{t('radioRoute.scenario.environment')}</li>
     <li data-testid="radio-route-scenario-access">{t('radioRoute.scenario.access',{range:RANDOM_ACCESS_RANGE_MS})}</li>
     <li data-testid="radio-route-scenario-slew">{t('radioRoute.scenario.slew',{interval:RADIO_LAB_CONSTANTS.slewTimerIntervalMs})}</li>
     <li data-testid="radio-route-scenario-clock">{t('radioRoute.scenario.clock',{interval:RADIO_CLOCK_CONSTANTS.nominalIntervalMs})}</li>
     <li data-testid="radio-route-scenario-gates">{t('radioRoute.scenario.gates')}</li>
    </ul>
    <p className="radio-control-note" data-testid="radio-clock-limits">{t('radioRoute.clock.limits')}</p>
   </details>
  </section>
  <section className="card radio-control radio-control-env radio-route-clock" aria-labelledby={`${id}-clock`} data-testid="radio-route-clock" data-running={scenario.running} inert={modal||dateOpen||parameters.presented||behindReceiverBox||behindAccess}>
   <h2 id={`${id}-clock`}>{t('radioRoute.clock.heading')}</h2>
   <p className="radio-control-note">{t('radioRoute.clock.help',{min:'1900-01-01T00:00:00',max:UT_MAX_TEXT})}</p>
   <label htmlFor={`${id}-utc`}>{t('radioRoute.clock.utLabel')}</label>
   <input ref={utInputRef} id={`${id}-utc`} data-testid="radio-clock-utc" type="text" autoComplete="off" spellCheck={false} maxLength={RADIO_CLOCK_CONSTANTS.draftMaxLength}
    value={scenario.draftUTC} aria-describedby={`${id}-utc-help`} aria-invalid={clockOutcome==='utc-invalid'}
    onChange={e=>apply(s=>editRadioClockDraft(s,e.target.value))} onKeyDown={e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();apply(applyRadioClockUTC);}}}/>
   <p id={`${id}-utc-help`} className="radio-control-note">{t('radioRoute.clock.utHelp')}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-clock-apply" onClick={()=>apply(applyRadioClockUTC)}>{t('radioRoute.clock.apply')}</button>
    <button type="button" className="secondary-button" data-testid="radio-clock-cancel" onClick={()=>apply(cancelRadioClockDraft)}>{t('radioRoute.clock.cancel')}</button>
    <button type="button" className="secondary-button" data-testid="radio-clock-longitude" onClick={()=>apply(applyCompiledRadioLongitude)}>{t('radioRoute.clock.longitude')}</button>
   </div>
   <dl className="radio-control-state">
    <dt>{t('radioRoute.clock.applied')}</dt><dd data-testid="radio-clock-applied">{scenario.utc===null?t('radioRoute.clock.none'):t('radioRoute.clock.utcValue',{ut:scenario.utc})}</dd>
    <dt>{t('radioRoute.clock.longitudeLabel')}</dt><dd data-testid="radio-clock-lon" data-longitude-radians={scenario.longitudeRadians===null?'':String(scenario.longitudeRadians)}>
     {scenario.longitudeRadians===null?t('radioRoute.clock.none'):t('radioRoute.clock.longitudeValue',{radians:String(scenario.longitudeRadians)})}</dd>
   </dl>
   <p data-testid="radio-clock-state">{stateText}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-clock-start" disabled={scenario.running} onClick={()=>apply(s=>startRadioClock(s,perfNow()))}>{t('radioRoute.clock.start')}</button>
    <button type="button" className="secondary-button" data-testid="radio-clock-pause" disabled={!scenario.running} onClick={()=>apply(s=>pauseRadioClock(s,perfNow()))}>{t('radioRoute.clock.pause')}</button>
   </div>
   <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-clock-status">
    {clockOutcome==='domain-stopped'?t('radioRoute.clock.outcome.domain-stopped',{max:UT_MAX_TEXT}):clockOutcome==='start-domain'?t('radioRoute.clock.outcome.start-domain',{max:UT_MAX_TEXT}):outcomeKey?t(outcomeKey):''}
   </p>
  </section>
  <section className="card radio-control radio-control-env radio-route-date" aria-labelledby={`${id}-date`} data-testid="radio-route-date" data-available={dateGate.status==='available'} inert={modal||dateOpen||parameters.presented||behindReceiverBox||behindAccess}>
   <h2 id={`${id}-date`}>{t('radioRoute.date.heading')}</h2>
   <p className="radio-control-note">{t('radioRoute.date.help')}</p>
   <div className="button-row">
    <button ref={dateMenuRef} type="button" className="secondary-button" data-testid="radio-date-menu" disabled={dateGate.status!=='available'} aria-describedby={`${id}-date-reason`}
     onKeyDown={ignoreHeldKey} onClick={openDate}>{DATE_MENU_TEXT}</button>
   </div>
   <p id={`${id}-date-reason`} className="radio-control-note" data-testid="radio-date-reason" data-reason={dateGate.status==='refused'?dateGate.reason:undefined}>{dateGateText}</p>
   <dl className="radio-control-state">
    <dt>{t('radioRoute.date.storedLabel')}</dt><dd data-testid="radio-date-stored" data-stored-id={dateState.storedId} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{storedIdText}</dd>
   </dl>
   <p className="radio-control-note">{t('radioRoute.date.storedNote')}</p>
   <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-date-status">{dateStatusText}</p>
  </section>
  {access.card(modal||dateOpen||parameters.presented||receiverBoxPresented)}
  {parameters.card}
  {/* A box-less wrapper: while the date dialog, a presented Pulsar Parameters surface, the receiver close box or a presented
      Radio configuration surface is open, the whole panel is behind it (application-modal). An antenna box that arrives
      meanwhile takes over: the utility's surface, the receiver box and the configuration surfaces yield to it. A
      configuration that has yielded (open, not presented) must not make the panel, and so that antenna box, inert. */}
  <div style={{display:'contents'}} inert={dateOpen||parameters.presented||behindReceiverBox||panelBehindAccess} data-testid="radio-route-panel-wrapper">
   <RadioControlPanel state={state} environment={environment}
    onTransition={tr=>commitControl(tr.state)} onEnvironmentChange={changeEnvironment}
    antenna={antenna} onAntennaTransition={commitAntenna} antennaOptions={options} onAntennaOptionsChange={optionsManaged?undefined:applyOptions} managedDiameter={optionsManaged}
    active={active} hostBusy={busy} onModalPresentedChange={setPanelPresented} radioClock={radioClock} hotList={hotList} receiver={receiverButton}/>
  </div>
  <RadioReceiverWorkspace active={active} busy={busy} antennaModal={modal} dateOpen={dateOpen} parametersPresented={parameters.presented} configurationOpen={access.open}
   onReceiverOpened={access.receiverOpened} onMainCloseMessage={access.mainCloseMessage}
   catalogNow={parameters.currentCatalog} pointingNow={()=>antennaRef.current.pointing} readClockJD={readClockJD} perfNow={perfNow}
   apiRef={receiverApiRef} receiverButtonRef={receiverButtonRef} onSummaryChange={setReceiverSummary} pulsarData={pulsarData} onOpenPulsarAnalysis={onOpenPulsarAnalysis}
   onSourcePicker={parameters.pickerMoved} restored={initial===null?null:{session:initial.receiverSession,windows:initial.receiverWindows}}/>
  {/* .radio-control (box-less) only scopes the shared dialog styles; the layer itself is never inert. */}
  <div className="radio-control" style={{display:'contents'}} data-testid="radio-date-layer" data-modal-pending={datePending} data-modal-presented={datePresented}>
   {datePresented&&dateState.dialog&&<RadioDateDialogView dialog={dateState.dialog} refusal={fieldRefusal} onEdit={editDate} onOk={confirmDate} onCancel={cancelDate}
    returnFocus={dateMenuRef} fallbackFocus={utInputRef} suppressed={dateSuppressed}/>}
   {datePresented&&dateState.dialog?.error&&<RadioDateErrorBox failure={dateState.dialog.error} dialog={dateState.dialog} storedId={dateState.storedId} onDismiss={()=>stepDate(dismissRadioDateError)}/>}
  </div>
  {parameters.layer}
  {access.layer}
 </div>;
}

/** Browser wording of a refused OK (WEB-DATE-04): native errors name the cause; browser limits name the subset. */
function dateFailureText(f:DialogEntryFailure,d:RadioDateDialog):string{
 if(f.field==='date')return t(`radioRoute.date.error.date.${f.reason}`,{text:d.date});
 if(f.field==='time')return f.reason==='large'?t('radioRoute.date.error.time.large',{text:d.time,max:RADIO_DATE_WEB_LIMITS.timePartMagnitude}):t(`radioRoute.date.error.time.${f.reason}`,{text:d.time});
 return t('radioRoute.date.error.range.domain',{min:DATE_MIN_TEXT,max:DATE_MAX_TEXT});
}

type RadioDateDialogProps=Readonly<{dialog:RadioDateDialog;refusal:DateFieldRefusal|null;onEdit:(field:RadioDateField,text:string)=>void;onOk:()=>void;onCancel:()=>void;
 returnFocus:RefObject<HTMLButtonElement|null>;fallbackFocus:RefObject<HTMLInputElement|null>;suppressed:RefObject<boolean>}>;
/** A target that can take focus: connected, enabled, rendered and not under an inert ancestor. */
const canTakeFocus=(el:HTMLButtonElement|HTMLInputElement|null):el is HTMLButtonElement|HTMLInputElement=>
 !!el&&el.isConnected&&!el.disabled&&el.getClientRects().length>0&&!el.closest('[inert]');
/** TUTTimeDlg (bsDialog, fsStayOnTop): FormActivate 0x4fdc5c focuses DateEd with its text selected; OK is the Default
 * (bkOK) and Cancel the Cancel (bkCancel) button, always enabled before activation. WEB: the fields follow the visual
 * layout (ID first; native TabOrder Date, Time, OK, Cancel, ID); no system-menu close; presented again after a
 * suppression, the dialog takes focus the same way and keeps its fields. On close, focus returns to the menu item, or to
 * the Radio UT field when the item is no longer available (the range-end gate closed while the dialog was open). */
function RadioDateDialogView({dialog,refusal,onEdit,onOk,onCancel,returnFocus,fallbackFocus,suppressed}:RadioDateDialogProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),dateField=useRef<HTMLInputElement>(null),lastFocus=useRef<HTMLElement|null>(null);
 const blocked=dialog.error!==null;
 // Presented again under its error box (blocked at mount), the dialog is inert: the date field takes focus when the box closes.
 // Cleanup (passive, after this commit removed the cards' inert): the menu item; when it is no longer available, the Radio
 // UT field, where a new UT can be applied. A suppression, a hidden or busy route or a native modal moves no focus.
 useEffect(()=>{if(blocked)lastFocus.current=dateField.current;else{dateField.current?.focus();dateField.current?.select();}
  const back=returnFocus.current,fallback=fallbackFocus.current;
  return ()=>{if(suppressed.current||nativeModalOpen())return;[back,fallback].find(canTakeFocus)?.focus();};},[returnFocus,fallbackFocus,suppressed]);// mount-time `blocked` only
 // OKBtnClick has no SetFocus: after the error box, focus returns to the control that chose OK.
 useEffect(()=>{if(blocked)return;const el=lastFocus.current;lastFocus.current=null;if(el&&root.current?.contains(el))el.focus();},[blocked]);
 const ok=()=>{lastFocus.current=document.activeElement as HTMLElement|null;onOk();};
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(blocked||ignoreHeldKey(e))return;
  if(e.key==='Escape'){e.preventDefault();onCancel();return;}
  if(e.key==='Enter'&&(e.target as HTMLElement).tagName==='INPUT'){e.preventDefault();ok();return;}
  trapTab(e,root.current);
 };
 const C=UT_DIALOG_CAPTIONS;
 // No maxLength attribute: the browser would truncate a paste silently; over-long or non-ASCII edits are refused instead.
 const field=(name:RadioDateField,label:string,hint:string,format?:string,focus?:RefObject<HTMLInputElement|null>)=><div className="antenna-field">
  <label htmlFor={`${id}-${name}`} className="radio-control-native">{label}</label>
  <input ref={focus} id={`${id}-${name}`} type="text" autoComplete="off" spellCheck={false} data-testid={`radio-date-field-${name}`} value={dialog[name]} aria-invalid={refusal?.field===name||undefined}
   aria-describedby={`${id}-${name}-hint ${id}-refusal`} onChange={e=>onEdit(name,e.target.value)}/>
  {format&&<span className="radio-control-native" aria-hidden="true">{format}</span>}
  <span id={`${id}-${name}-hint`} className="radio-control-note">{hint}</span>
 </div>;
 const refusalText=refusal?refusal.outcome==='field-not-ascii'?t('radioRoute.date.field.not-ascii')
  :t('radioRoute.date.field.too-long',{max:refusal.field==='id'?ID_MAX_LENGTH:RADIO_DATE_WEB_LIMITS.fieldMaxLength}):null;
 return <div className="antenna-backdrop">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-bounds`} className="antenna-dialog" data-testid="radio-date-dialog" onKeyDown={onKeyDown} inert={blocked||undefined}>
   <h3 id={`${id}-title`} className="radio-control-native">{C.form}</h3>
   <div className="antenna-group">{field('id',C.id,`${C.idSource} ${C.idHint}`)}</div>
   <div className="antenna-group">
    {field('date',C.date,C.dateHint,C.dateFormat,dateField)}
    {field('time',C.time.trim(),C.timeHint,C.timeFormat)}
   </div>
   <p id={`${id}-bounds`} className="radio-control-note" data-testid="radio-date-bounds">{t('radioRoute.date.dialog.bounds',{field:RADIO_DATE_WEB_LIMITS.fieldMaxLength,id:ID_MAX_LENGTH})}</p>
   <p id={`${id}-refusal`} className="radio-control-note" role="status" aria-live="polite" data-testid="radio-date-field-refusal" data-field={refusal?.field}>{refusalText}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-date-ok" onClick={ok}>{t('radioRoute.date.dialog.ok')}</button>
    <button type="button" className="secondary-button" data-testid="radio-date-cancel" onClick={onCancel}>{t('radioRoute.date.dialog.cancel')}</button>
   </div>
  </div>
 </div>;
}

/** The error box of a refused OK: application-modal above the dialog; Enter or Escape closes only the box. The text is
 * OpenVireo's (the runtime library's message is not reproduced); browser limits say so. */
function RadioDateErrorBox({failure,dialog,storedId,onDismiss}:Readonly<{failure:DialogEntryFailure;dialog:RadioDateDialog;storedId:string;onDismiss:()=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{button.current?.focus();},[]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(ignoreHeldKey(e))return;
  if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();onDismiss();return;}
  trapTab(e,root.current);
 };
 const native=failure.kind==='error';
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} className="antenna-dialog antenna-notice" data-testid="radio-date-error"
   data-field={failure.field} data-kind={failure.kind} data-reason={failure.reason} onKeyDown={onKeyDown}>
   <h3 id={`${id}-title`}>{native?t('radioRoute.date.error.title.native'):t('radioRoute.date.error.title.web')}</h3>
   <p id={`${id}-body`} data-testid="radio-date-error-text" style={{overflowWrap:'anywhere'}}>{dateFailureText(failure,dialog)}</p>
   <p className="radio-control-note" data-testid="radio-date-error-note">{native?t('radioRoute.date.error.nativeNote'):t('radioRoute.date.error.webNote')}</p>
   <p data-testid="radio-date-error-id" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{t('radioRoute.date.error.id',{id:storedId})}</p>
   <div className="button-row">
    <button ref={button} type="button" className="primary-button" data-testid="radio-date-error-ok" onClick={onDismiss}>{t('radioRoute.date.error.ok')}</button>
   </div>
  </div>
 </div>;
}
