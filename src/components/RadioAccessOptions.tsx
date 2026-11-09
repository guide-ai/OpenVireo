import {Fragment,useEffect,useId,useLayoutEffect,useRef,useState,useSyncExternalStore,type KeyboardEvent,type ReactNode,type RefObject} from 'react';
import {SITE_INFORMATION_LITERALS as SIL,STATION_DIALOG_CAPTIONS as SC,parseStationDraft,siteInformationAngle,stationDraft,type StationDraft} from '../core/observatorySite';
import {StationFields} from '../observatory/SiteDialogs';
import {OBSERVATORY_MESSAGES} from '../observatory/ObservatoryMessages';
import {RADIO_R1_MESSAGES as R1} from './RadioR1Messages';
import ResearchNotes from './ResearchNotes';
import {menuCaptionText} from '../core/radioControl';
import {RADIO_OPTIONS_CAPTIONS,type RadioLabOptions,type RadioLabTransition} from '../core/radioAntenna';
import type {RadioReceiverOptions} from '../core/radioReceiver';
import {
 INITIAL_RADIO_ACCESS,RADIO_ACCESS_DFM,RADIO_ACCESS_LITERALS,applyCompiledOptionsBranch,cancelRadioOptions,closePreferences,dismissRadioOptionsFailure,
 dismissUserOptions,editAccessPulsarList,editRadioOptionsFlag,editRadioOptionsText,okRadioOptions,okRadioSimulationOptions,openPreferences,openRadioOptions,pulsarListAvailability,
 followPageGate,radioLabFirstActivation,receiverCloseMessage,receiverOpened,setCloseRecipient,
 RADIO_SITE_DFM,cancelRadioSite,okRadioSite,openRadioSite,radioSiteNonDefault,radioStationSite,resetRadioSite,type RadioSiteRecord,
 type RadioAccessHostRefusal,type RadioAccessOutcome,type RadioAccessState,type RadioAccessTransition,type RadioCloseRecipient,type RadioOptionsAuthority,
 type RadioOptionsFullRecord,type RadioOptionsNumericChild,type RadioOptionsNumericFailure,type RadioOptionsRecord,type RadioPageGate,type RadioPulsarListMenu,
} from '../core/radioAccessOptions';
import {
 RADIO_OPTIONS_DFM_ORDER,RADIO_OPTIONS_NUMERIC_CONSTANTS,RADIO_OPTIONS_OK_ORDER,RADIO_OPTIONS_TEXT_MAX_LENGTH,formatRadioOptionsValue,radioOptionsFixedText,
 type RadioOptionsNumberField,
} from '../core/radioOptionsNumeric';
import type {
 AntennaField,RadioAntennaProjection,RadioClockProjection,RadioOptionsChange,RadioOptionsConsumerMismatch,RadioOptionsProjectionReport,RadioPanelProjection,RadioReceiverProjectionReport,ReceiverField,
} from '../core/radioOptionsProjection';
import type {PulsarListCommandRefusal,PulsarListCommandResult} from '../core/radioPulsarListCommand';
import {ignoreHeldKey,nativeModalOpen,noNativeModal,observeNativeModals,observeNothing,trapTab} from './radioModal';
import {t,type PlainMessageKey} from '../i18n';
import {vireo,vireoList} from '../i18n/vireo';
import {OBSERVATORY_VIREO_CAPTIONS as VB} from '../observatory/ObservatoryMessages';

const D=RADIO_ACCESS_DFM,L=RADIO_ACCESS_LITERALS;
/** Card status texts of user outcomes (other outcomes are shown elsewhere or not announced). */
const STATUS:Readonly<Partial<Record<RadioAccessOutcome,PlainMessageKey>>>={
 'refused-surface-open':'radioAccess.status.refused-surface-open',
 'refused-inactive':'radioAccess.status.refused-inactive','refused-busy':'radioAccess.status.refused-busy','refused-modal':'radioAccess.status.refused-modal',
 'refused-receiver-box':'radioAccess.status.refused-receiver-box','refused-parent-open':'radioAccess.status.refused-parent-open',
 'refused-refusal-open':'radioAccess.status.refused-refusal-open','user-options-dismissed':'radioAccess.status.user-options-dismissed',
 'preferences-closed-ok':'radioAccess.status.preferences-closed-ok','preferences-closed-cancel':'radioAccess.status.preferences-closed-cancel',
};
type MenuEvent='activation-shown'|'activation-hidden'|'open-disabled'|'open-skipped'|'close-environment'|'close-enabled'|'close-skipped';
/** The last File ▸ Pulsar List... result: the shared name written and the record the window shows, or the refusal. On a
 * hit, name '' means the copied record has an empty J2000 name (from the command's result, never the seed). */
type ListStatus=Readonly<{outcome:'hit'|'miss'|PulsarListCommandRefusal;name:string;position:number;shown:string}>;
/** R-RX9 the last opt-in answer (the branch asked for and, on refused-consumers-differ, what to restore). */
type OptInStatus=Readonly<{outcome:RadioAccessOutcome;hostPredicate:boolean;mismatches:readonly RadioOptionsConsumerMismatch[]}>;
const OPT_IN_STATUS:Readonly<Partial<Record<RadioAccessOutcome,PlainMessageKey>>>={
 'refused-authority-set':'radioAccess.numeric.status.refused-authority-set','refused-record-changed':'radioAccess.numeric.status.refused-record-changed',
 'refused-consumers-differ':'radioAccess.numeric.status.refused-consumers-differ','refused-surface-open':'radioAccess.status.refused-surface-open',
};
/** The two compiled Sound Sync Singles as short decimals for the branch labels (presentation only). */
const syncText=(hostPredicate:boolean)=>String(Number((hostPredicate?RADIO_OPTIONS_NUMERIC_CONSTANTS.syncHostTrue:RADIO_OPTIONS_NUMERIC_CONSTANTS.syncHostFalse).toPrecision(7)));
/** Native DFM labels of the consumer fields a projection changed (original strings, never translated). */
const CHANGE_LABEL:Readonly<Record<AntennaField|ReceiverField,string>>={
 limitsEnabled:D.checkBoxes.limitSlewing93a,minimumAltitudeRadians:D.labels.horizon90c,maxRateIndex:D.checkBoxes.maxRateIndex93b,rateBase:D.labels.baseSlew91a,
 transitTelescope:menuCaptionText(D.scopeGroup),instantSlew:D.checkBoxes.testMode940,latitudeRadians:SC.latitude,
 dishDiameterMeters:D.labels.aperture916,gain924:D.labels.gain924,background928:D.labels.background928,beamWidth92c:D.labels.beamWidth92c,temperature930:D.labels.temperature930,
};
const changeList=(changes:readonly RadioOptionsChange<string>[])=>changes.map(c=>vireo(CHANGE_LABEL[c.field as AntennaField|ReceiverField])).join(', ');
const MENU_EVENT:Readonly<Partial<Record<RadioAccessOutcome,MenuEvent>>>={
 'menu-receiver-open-disable':'open-disabled','menu-receiver-open-skip':'open-skipped',
 'close-not-delivered':'close-environment','menu-close-enable':'close-enabled','menu-close-skip':'close-skipped',
};

export type RadioAccessHostInput=Readonly<{
 /** The route is shown. */
 active:boolean;
 /** A project operation runs. */
 busy:boolean;
 /** An antenna dialog or box is open: the dialogs yield to it (kept, unpresented). */
 antennaModal:boolean;
 /** The receiver close box or a Record dialog is pending (would be presented on this route outside a project operation,
  * whether or not it is presented now): the dialogs yield to it, and do not present in the commit in which it presents. */
 receiverBoxPending:boolean;
 /** Handler-time web guard: another radio surface is open now (latest state), or null. */
 surfaceNow:()=>'modal'|'receiver-box'|null;
 /** R-RX8 File ▸ Pulsar List... (WEB-ACC-LIST-01, WEB-PP-LIST-04): the route's synchronous admission, preparation and
  * two-owner commit. Its result is only announced here; this host writes no source, window or menu flag for it. */
 runPulsarList:()=>PulsarListCommandResult;
 /** R-RX9 (docs/RADIO-SIMULATION-OPTIONS.md) the route's live consumers of the radio options. */
 numeric:RadioAccessNumericHost;
 /** Phase 1 item 1.5: the applied configuration restored from an investigation file (read once, at mount; no box or dialog). */
 initial?:RadioAccessState|null;
 /** Front T1: the page's one instructor gate (core/instructorMode.ts); the card follows it (followPageGate). */
 pageGate:RadioPageGate;
}>;
export type RadioAccessNumericHost=Readonly<{
 /** Handler-time opt-in check on the latest consumer values against the chosen compiled branch (empty: compatible). */
 mismatchesFor:(hostPredicate:boolean)=>readonly RadioOptionsConsumerMismatch[];
 /** Called synchronously after a committed Preferences close under an authority, with the env copy just written; the
  * route projects and commits it and reports each consumer's outcome (WEB-RSO-PROJ-01). Front T11a: with the env copy's
  * site fields, also after the site Reset. */
 onEnvironmentCopied:(env:RadioOptionsRecord,site:RadioSiteRecord)=>RadioOptionsProjectionReport;
 /** The consumer values in use, for the card. */
 view:Readonly<{antenna:RadioLabOptions;receiver:RadioReceiverOptions|null;panelDiameter:number|null}>;
}>;
export type RadioAccessHost=Readonly<{
 /** The refusal box or the options dialog exists (presented or not): the other radio cards are behind it. */
 open:boolean;
 /** Latest accepted state, for same-task handler checks. */
 openNow:()=>boolean;
 /** Latest accepted PulsarList1 flags (a Receiver Open earlier in the same task already counts). Read only. */
 menuNow:()=>RadioPulsarListMenu;
 /** It would be presented on this route outside a project operation. */
 pending:boolean;
 /** It is presented. */
 presented:boolean;
 /** The card; inert while another surface is over it. */
 card:(inert:boolean)=>ReactNode;
 layer:ReactNode;
 /** Committed antenna transition: an 'activated' outcome is TRadioLab's first FormActivate (T9). */
 antennaTransition:(tr:RadioLabTransition)=>void;
 /** A committed Receiver Open whose picker ran (T10). */
 receiverOpened:()=>void;
 /** A committed receiver main close with its send-0x53a event (T11). */
 mainCloseMessage:()=>void;
 /** R-RX9 numeric authority (rendered) and its latest accepted value, for same-task ownership guards. */
 authority:RadioOptionsAuthority;
 authorityNow:()=>RadioOptionsAuthority;
 /** Phase 1 item 1.5: the latest accepted state, read by Save investigation. */
 stateNow:()=>RadioAccessState;
 /** Front T11a: the env copy holds a radio site that is not the compiled one (rendered). */
 siteNonDefault:boolean;
 /** Front T11a: the env copy's site (rendered). */
 siteEnv:RadioSiteRecord;
}>;

/** A target that can take focus: connected, enabled, rendered and not under an inert ancestor. */
const canTakeFocus=(el:HTMLElement|null):el is HTMLElement=>
 !!el&&el.isConnected&&!(el as HTMLButtonElement).disabled&&el.getClientRects().length>0&&!el.closest('[inert]');

/**
 * WEB host of the R-RX7 Radio configuration (docs/RADIO-ACCESS-OPTIONS.md): a card with the gate scenario, the Preferences
 * opener, read-only values, the PulsarList1 readout and the close-recipient adaptation; and, as application-modal
 * surfaces, the USER OPTIONS! box and the partial Optical/Radio Simulation Options dialogs. Every change goes through the
 * pure transitions on the latest accepted state (stateRef). Nothing is sent anywhere; Phase 1 item 1.5 Save investigation
 * keeps the applied configuration (never a box, dialog or draft) and `initial` restores it. R-RX8: while the
 * item is shown the card also renders the File ▸ Pulsar List... command (disabled while the item is disabled); its click
 * runs the route's runPulsarList, which alone writes the shared source buffer and activates Pulsar Parameters. This host
 * never touches the receivers, source buffer, cursor, records, clocks or RNG, and the command never writes the menu flags.
 */
export function useRadioAccessHost({active,busy,antennaModal,receiverBoxPending,surfaceNow,runPulsarList,numeric,initial,pageGate}:RadioAccessHostInput):RadioAccessHost{
 const id=useId();
 const [state,setState]=useState<RadioAccessState>(()=>followPageGate(initial&&initial.refusal===null&&initial.parent===null?initial:INITIAL_RADIO_ACCESS,pageGate).state);
 const stateRef=useRef(state);
 const [status,setStatus]=useState<RadioAccessOutcome|null>(null);
 const [childStatus,setChildStatus]=useState<'radio-ok'|'radio-cancelled'|null>(null);
 const [menuEvent,setMenuEvent]=useState<MenuEvent|null>(null);
 const [listStatus,setListStatus]=useState<ListStatus|null>(null);
 // R-RX9: the last opt-in answer, the last projection report and the field whose over-long edit was refused.
 const [optIn,setOptIn]=useState<OptInStatus|null>(null);
 const [projection,setProjection]=useState<RadioOptionsProjectionReport|null>(null);
 const [textRefusal,setTextRefusal]=useState<RadioOptionsNumberField|null>(null);
 // Front T11a: the TStationDlg fields while Site... is open (kept across a suppression) and its error box text.
 const [stationDraftState,setStationDraft]=useState<StationDraft|null>(null);
 const [stationError,setStationError]=useState('');
 const [siteStatus,setSiteStatus]=useState<'site-ok'|'site-cancelled'|'site-reset'|'site-reset-unchanged'|null>(null);
 const latest=useRef({active,busy,surfaceNow,runPulsarList,numeric});
 useLayoutEffect(()=>{latest.current={active,busy,surfaceNow,runPulsarList,numeric};});
 const step=(fn:(s:RadioAccessState)=>RadioAccessTransition)=>{
  const r=fn(stateRef.current);if(r.changed){stateRef.current=r.state;setState(r.state);}return r;
 };
 // Front T1: the card follows the page's instructor gate (enter, Edit Mode 0x5887f0 / 0x587f70, Leave); only the byte is written.
 useEffect(()=>{step(s=>followPageGate(s,{open:pageGate.open,source:pageGate.source}));},[pageGate.open,pageGate.source]);// eslint-disable-line react-hooks/exhaustive-deps
 const admitted=()=>latest.current.active&&!latest.current.busy;
 /** A surface that takes priority over this host exists now (latest antenna state, receiver close box/Record dialog, date
  * dialog or Pulsar Parameters, through surfaceNow), or a foreign native <dialog>. */
 const yieldNow=()=>latest.current.surfaceNow()!==null||nativeModalOpen();
 /** This host's own box or dialog exists (latest accepted state). */
 const openNow=()=>stateRef.current.refusal!==null||stateRef.current.parent!==null;
 /** Dialog actions (own surfaces): only on the shown route outside a project operation, with nothing over them now. */
 const user=(fn:(s:RadioAccessState)=>RadioAccessTransition)=>admitted()&&!yieldNow()?step(fn):null;
 /** Card actions: also refused while this host's own box or dialog exists (the card is behind it). */
 const cardUser=(fn:(s:RadioAccessState)=>RadioAccessTransition)=>admitted()&&!openNow()&&!yieldNow()?step(fn):null;

 // ---- Card actions (a refused one leaves the status unchanged).
 const hostRefusal=():RadioAccessHostRefusal|null=>{
  const l=latest.current;if(!l.active)return 'inactive';if(l.busy)return 'busy';
  return l.surfaceNow()??(nativeModalOpen()?'modal':null);
 };
 const openPrefs=()=>{
  const r=step(s=>openPreferences(s,hostRefusal()));
  setStatus(r.outcome==='user-options-shown'||r.outcome==='preferences-opened'?null:r.outcome);setChildStatus(null);
 };
 const chooseRecipient=(recipient:RadioCloseRecipient)=>{cardUser(s=>setCloseRecipient(s,recipient));};
 /** WEB-ACC-LIST-01: File ▸ Pulsar List.... The route checks every gate on the latest state (menuNow included) and commits;
  * here only the outcome is announced: the shared name written and the record the window shows, which are named apart. */
 const runList=()=>{
  const r=latest.current.runPulsarList();
  if(!r.ok){setListStatus({outcome:r.reason,name:'',position:0,shown:''});return;}
  const w=r.window;
  setListStatus({outcome:r.source,name:r.name??'',position:w.shownIndex+1,shown:w.source.j2000===''?w.source.b1950:w.source.j2000});
 };
 const menuNow=()=>stateRef.current.menu;
 const authorityNow=()=>stateRef.current.authority;
 /** WEB-RSO-AUTH-01 opt-in (card action): the route reports the latest consumer values against the chosen branch; a
  * refusal names what to restore. A card action refused by the web guards leaves the status unchanged. `focused`: the
  * activated button had focus; only an applied opt-in from it requests the one-shot heading focus (a refusal requests
  * nothing and leaves a pending request alone). */
 const applyBranch=(hostPredicate:boolean,focused:boolean)=>{
  if(!admitted()||openNow()||yieldNow())return;
  const mismatches=latest.current.numeric.mismatchesFor(hostPredicate);
  const r=cardUser(s=>applyCompiledOptionsBranch(s,hostPredicate,mismatches.length===0));
  if(r)setOptIn({outcome:r.outcome,hostPredicate,mismatches:r.outcome==='refused-consumers-differ'?mismatches:[]});
  if(r?.outcome==='authority-applied'&&focused)optInFocus.current=true;
 };

 // ---- Dialog actions.
 const dismiss=()=>{const r=user(dismissUserOptions);if(r?.changed)setStatus(r.outcome);};
 const openChild=()=>{const r=user(openRadioOptions);if(r?.changed){setChildStatus(null);setTextRefusal(null);}};
 const editChild=(checked:boolean)=>{user(s=>editAccessPulsarList(s,checked));};
 const okChild=()=>{const r=user(s=>okRadioOptions(s,'not-ported'));if(r?.outcome==='radio-ok')setChildStatus('radio-ok');};
 const cancelChild=()=>{const r=user(cancelRadioOptions);if(r?.outcome==='radio-cancelled')setChildStatus('radio-cancelled');};
 const editText=(field:RadioOptionsNumberField,text:string)=>{
  const r=user(s=>editRadioOptionsText(s,field,text));
  if(r?.outcome==='refused-field-too-long')setTextRefusal(field);else if(r?.outcome==='numeric-edited')setTextRefusal(null);
 };
 const editFlag=(flag:'limitSlewing'|'fastSlewing',checked:boolean)=>{user(s=>editRadioOptionsFlag(s,flag,checked));};
 const okFull=()=>{const r=user(okRadioSimulationOptions);if(r?.outcome==='radio-ok'){setChildStatus('radio-ok');setTextRefusal(null);}};
 const dismissFailure=()=>{user(dismissRadioOptionsFailure);};
 // ---- Front T11a: Site... (SiteBtnClick 0x5a9810 → TStationDlg) and the card's Reset.
 const openSite=()=>{
  const r=user(openRadioSite);if(r?.outcome!=='site-opened')return;
  const v=radioStationSite(r.state)!;setStationError('');setSiteStatus(null);
  setStationDraft(stationDraft({name:v.name,longitudeRadians:v.longitudeRadians,latitudeRadians:v.latitudeRadians,horizonRadians:v.horizonRadians,heightMetres:v.heightMetres,utMinusLocalHours:v.utMinusLocalHours}));
 };
 /** TStationDlg OKBtnClick (OB-ST-03, parseStationDraft): a failure shows its box and keeps the dialog. */
 const okSite=()=>{
  if(!stationDraftState||stationError||!admitted()||yieldNow())return;
  // The radio copy-back discards the horizon (0x5a98d5..0x5a9928), so its web range check does not apply here (it is still parsed).
 const p=parseStationDraft(stationDraftState,{horizonDiscarded:true});
  if(p.status==='error'){setStationError(p.message);return;}
  if(p.status==='unsupported'){setStationError(p.field==='name'?OBSERVATORY_MESSAGES.site.nameUnsupported:OBSERVATORY_MESSAGES.site.horizonUnsupported);return;}
  const r=user(s=>okRadioSite(s,p.site));
  if(r?.outcome==='site-ok'){setStationDraft(null);setSiteStatus('site-ok');}
 };
 const cancelSite=()=>{if(stationError)return;const r=user(cancelRadioSite);if(r?.outcome==='site-cancelled'){setStationDraft(null);setSiteStatus('site-cancelled');}};
 const dismissStationError=()=>{if(admitted()&&!yieldNow())setStationError('');};
 /** [W] Reset (card action): the five site fields to the compiled defaults in the object and the panel's copy, then the
  * same projection as a Preferences close, also when the site was already compiled (consumers left at another site). */
 const resetSite=()=>{
  const r=cardUser(resetRadioSite);if(!r)return;
  if(r.outcome!=='site-reset'&&r.outcome!=='site-reset-unchanged')return;
  setSiteStatus(r.outcome);setProjection(latest.current.numeric.onEnvironmentCopied(r.state.env,r.state.site.env));
 };
 /** T8, then under an authority the projection at the recovered copy point (0x588751..0x588767), synchronously. */
 const closeParent=(result:'ok'|'cancel')=>{
  const r=user(s=>closePreferences(s,result));if(!r?.changed)return;
  setStatus(r.outcome);setChildStatus(null);
  if(r.state.authority.kind!=='absent')setProjection(latest.current.numeric.onEnvironmentCopied(r.state.env,r.state.site.env));
 };

 // ---- Committed host events (refs only; also on a hidden route: they follow committed antenna/receiver transitions).
 const antennaTransition=(tr:RadioLabTransition)=>{
  if(tr.outcome!=='activated'||!tr.changed)return;
  const r=step(radioLabFirstActivation);
  if(r.outcome==='menu-first-activation')setMenuEvent(r.state.env.accessPulsarList?'activation-shown':'activation-hidden');
 };
 const menuStep=(fn:(s:RadioAccessState)=>RadioAccessTransition)=>{const e=MENU_EVENT[step(fn).outcome];if(e)setMenuEvent(e);};
 const onReceiverOpened=()=>menuStep(receiverOpened);
 const onMainClose=()=>menuStep(receiverCloseMessage);

 // ---- Presentation: only on the active route, outside a project operation, with no foreign native <dialog>, and yielding
 // (kept) to an antenna surface or a pending receiver box/Record dialog that arrives meanwhile.
 const open=state.refusal!==null||state.parent!==null;
 const pending=open&&active&&!busy;
 const foreign=useSyncExternalStore(pending?observeNativeModals:observeNothing,pending?nativeModalOpen:noNativeModal,noNativeModal);
 const presented=pending&&!foreign&&!antennaModal&&!receiverBoxPending;
 // A surface removed by a suppression must not move focus; read by the views' cleanups after this commit's layout effects.
 const suppressed=useRef(false);
 useLayoutEffect(()=>{suppressed.current=open&&!presented;});
 const prefsRef=useRef<HTMLButtonElement>(null),headingRef=useRef<HTMLHeadingElement>(null),radioRef=useRef<HTMLButtonElement>(null),siteRef=useRef<HTMLButtonElement>(null);
 // WEB-RSO-AUTH-01 focus: an applied opt-in removes the focused branch button; its one-shot request moves focus to the
 // numeric section heading. Consumed before the guards, so it never fires on a later commit; no move on a hidden or busy
 // route, with this host's box/dialog, another radio surface or a foreign native <dialog>, or when focus is already elsewhere.
 const numericHeadingRef=useRef<HTMLHeadingElement>(null),optInFocus=useRef(false);
 useEffect(()=>{
  const want=optInFocus.current;optInFocus.current=false;
  if(!want||!latest.current.active||latest.current.busy||openNow()||yieldNow())return;
  if(document.activeElement&&document.activeElement!==document.body)return;
  const heading=numericHeadingRef.current;
  if(canTakeFocus(heading))heading.focus();
 },[state.authority]);// the refs and latest guards are read at run time

 const menu=state.menu,availability=pulsarListAvailability(menu);
 const flag=(v:boolean)=>t(v?'radioAccess.menu.flagTrue':'radioAccess.menu.flagFalse');
 const onOff=(v:boolean)=>t(v?'radioAccess.values.on':'radioAccess.values.off');
 const last=state.lastChildOk===null?t('radioAccess.values.lastUnknown'):t(state.lastChildOk?'radioAccess.values.lastOk':'radioAccess.values.lastNotOk');
 const statusKey=status===null?undefined:STATUS[status];
 const listText=listStatus===null?'':listStatus.outcome==='hit'
  ?listStatus.name===''?t('radioAccess.list.status.unnamed',{shown:listStatus.shown})
  :t('radioAccess.list.status.hit',{name:listStatus.name,position:listStatus.position,shown:listStatus.shown})
  :listStatus.outcome==='miss'?t('radioAccess.list.status.miss'):t(`radioAccess.list.refused.${listStatus.outcome}`);
 const card=(inert:boolean)=><section className="card radio-control radio-control-env radio-access" aria-labelledby={`${id}-title`} data-testid="radio-access-card"
  inert={inert||open||undefined} data-gate={state.gate.open?'open':'closed'}>
  <h2 ref={headingRef} id={`${id}-title`} tabIndex={-1}>{t('radioAccess.heading')}</h2>
  <ResearchNotes><p className="radio-control-note">{t('radioAccess.intro')}</p></ResearchNotes>
  <p className="radio-control-note" data-testid="radio-access-persistence">{t('radioAccess.persistence')}</p>
  <h3 className="radio-access-subheading">{t('radioAccess.gate.heading')}</h3>
  <p data-testid="radio-access-gate" data-source={state.gate.source} style={{overflowWrap:'anywhere'}}>{state.gate.open?t(state.gate.source==='edit-mode'?'radioAccess.gate.editMode':'radioAccess.gate.instructor'):t('radioAccess.gate.closed')}</p>
  <p className="radio-control-note" data-testid="radio-access-gate-note">{t('radioAccess.gate.note')}</p>
  <div className="button-row">
   <button ref={prefsRef} type="button" className="primary-button" data-testid="radio-access-preferences" aria-describedby={`${id}-prefs-help`}
    onKeyDown={ignoreHeldKey} onClick={openPrefs}>{t('radioAccess.preferences.button')}</button>
  </div>
  <p id={`${id}-prefs-help`} className="radio-control-note">{t('radioAccess.preferences.help')}</p>
  <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-access-status" data-outcome={status??undefined}>{statusKey?t(statusKey):''}</p>
  <h3 className="radio-access-subheading">{t('radioAccess.values.heading')}</h3>
  <dl className="radio-control-state">
   <dt>{t('radioAccess.values.root')}</dt><dd data-testid="radio-access-root" data-value={state.root.accessPulsarList}>{onOff(state.root.accessPulsarList)}</dd>
   <dt>{t('radioAccess.values.env')}</dt><dd data-testid="radio-access-env" data-value={state.env.accessPulsarList}>{onOff(state.env.accessPulsarList)}</dd>
   <dt>{t('radioAccess.values.last')}</dt><dd data-testid="radio-access-last" data-value={state.lastChildOk===null?'unknown':String(state.lastChildOk)}>{last}</dd>
  </dl>
  <p className="radio-control-note" data-testid="radio-access-origin">{t('radioAccess.values.origin')}</p>
  <h3 className="radio-access-subheading">{t('radioAccess.menu.heading')}</h3>
  <p data-testid="radio-access-menu" data-availability={availability} data-enabled={menu.enabled} data-visible={menu.visible} data-activation-seen={menu.activationSeen}>
   {t(`radioAccess.menu.state.${availability}`)}</p>
  <p className="radio-control-note" data-testid="radio-access-menu-flags">{t('radioAccess.menu.flags',{enabled:flag(menu.enabled),visible:flag(menu.visible)})}</p>
  <p className="radio-control-note" data-testid="radio-access-menu-history">{menu.activationSeen?t('radioAccess.menu.activationDone'):t('radioAccess.menu.activationPending')}</p>
  <p className="radio-control-note" data-testid="radio-access-menu-event" data-event={menuEvent??undefined}>{menuEvent===null?'':t(`radioAccess.menu.event.${menuEvent}`)}</p>
  {menu.visible&&<div className="button-row">
   <button type="button" className="secondary-button" data-testid="radio-access-pulsar-list" disabled={!menu.enabled} aria-describedby={`${id}-list-note`}
    onKeyDown={ignoreHeldKey} onClick={runList}>{menuCaptionText(vireo(D.pulsarListCaption))}</button>
  </div>}
  <p id={`${id}-list-note`} className="radio-control-note" data-testid="radio-access-command-note">{t('radioAccess.menu.command')}</p>
  <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-access-list-status" data-outcome={listStatus?.outcome}
   style={{overflowWrap:'anywhere'}}>{listText}</p>
  <fieldset className="antenna-group radio-access-recipient" data-testid="radio-access-recipient" data-recipient={state.closeRecipient} aria-describedby={`${id}-recipient-note`}>
   <legend>{t('radioAccess.recipient.legend')}</legend>
   <label><input type="radio" name={`${id}-recipient`} data-testid="radio-access-recipient-environment" checked={state.closeRecipient==='environment'}
    onChange={()=>chooseRecipient('environment')}/> {t('radioAccess.recipient.environment')}</label>
   <label><input type="radio" name={`${id}-recipient`} data-testid="radio-access-recipient-radio-lab" checked={state.closeRecipient==='radio-lab'}
    onChange={()=>chooseRecipient('radio-lab')}/> {t('radioAccess.recipient.radioLab')}</label>
  </fieldset>
  <p id={`${id}-recipient-note`} className="radio-control-note">{t('radioAccess.recipient.note')}</p>
  <NumericSection state={state} view={numeric.view} optIn={optIn} projection={projection} headingRef={numericHeadingRef} onBranch={applyBranch} siteStatus={siteStatus} onResetSite={resetSite}/>
  <h3 className="radio-access-subheading">{t('radioAccess.behaviour.heading')}</h3>
  <ul className="radio-control-note" data-testid="radio-access-behaviour">
   <li>{t('radioAccess.behaviour.childOk')}</li><li>{t('radioAccess.behaviour.childCancel')}</li><li>{t('radioAccess.behaviour.parent')}</li>
   <li>{t('radioAccess.behaviour.last')}</li><li>{t(state.authority.kind==='absent'?'radioAccess.behaviour.notPorted':'radioAccess.behaviour.numeric')}</li>
  </ul>
 </section>;
 const child=state.parent?.child??null;
 const layer=<div className="radio-control" style={{display:'contents'}} data-testid="radio-access-layer" data-modal-pending={pending} data-modal-presented={presented}>
  {presented&&state.refusal!==null&&<UserOptionsBox onDismiss={dismiss} returnFocus={prefsRef} fallbackFocus={headingRef} suppressed={suppressed}/>}
  {presented&&state.parent!==null&&<OptionsParentDialog blocked={child!==null} status={childStatus} full={state.authority.kind!=='absent'} radioRef={radioRef} onRadio={openChild} onClose={closeParent}
   returnFocus={prefsRef} fallbackFocus={headingRef} suppressed={suppressed}/>}
  {presented&&child!==null&&(child.numeric
   ?<RadioSimulationOptionsDialog snapshot={child.snapshot as RadioOptionsFullRecord} checked={child.checked} numeric={child.numeric} refusal={textRefusal}
     onText={editText} onFlag={editFlag} onAccess={editChild} onOk={okFull} onCancel={cancelChild} returnFocus={radioRef} suppressed={suppressed}
     station={state.site.station} siteRef={siteRef} onSite={openSite}/>
   :<RadioOptionsChildDialog checked={child.checked} onEdit={editChild} onOk={okChild} onCancel={cancelChild} returnFocus={radioRef} suppressed={suppressed}/>)}
  {presented&&child?.numeric?.failure&&<RadioOptionsFailureBox failure={child.numeric.failure} onDismiss={dismissFailure}/>}
  {presented&&state.site.station&&stationDraftState&&<RadioStationDialog draft={stationDraftState} setDraft={setStationDraft} error={stationError} onOk={okSite} onCancel={cancelSite}
   returnFocus={siteRef} suppressed={suppressed}/>}
  {presented&&state.site.station&&stationError!==''&&<RadioStationErrorBox text={stationError} onDismiss={dismissStationError}/>}
 </div>;
 return {open,openNow,menuNow,pending,presented,card,layer,
  antennaTransition,receiverOpened:onReceiverOpened,mainCloseMessage:onMainClose,authority:state.authority,authorityNow,stateNow:()=>stateRef.current,
  siteNonDefault:radioSiteNonDefault(state),siteEnv:state.site.env};
}

type FocusBack=Readonly<{returnFocus:RefObject<HTMLElement|null>;fallbackFocus?:RefObject<HTMLElement|null>;suppressed:RefObject<boolean>}>;
/** Mount: focus the initial control (unless blocked). Unmount (passive, after the commit removed the inert ancestors): back
 * to the opener, or the fallback; a suppression or a foreign native modal moves no focus. */
function useModalFocus(initial:RefObject<HTMLElement|null>,blocked:boolean,{returnFocus,fallbackFocus,suppressed}:FocusBack){
 useEffect(()=>{
  if(!blocked)initial.current?.focus();
  return ()=>{if(suppressed.current||nativeModalOpen())return;[returnFocus.current,fallbackFocus?.current??null].find(canTakeFocus)?.focus();};
 },[]);// mount-time `blocked` only; the refs are stable
 // Unblocked (the child closed): focus the initial control unless the child's cleanup already moved focus inside.
 const wasBlocked=useRef(blocked);
 useEffect(()=>{if(wasBlocked.current&&!blocked&&!initial.current?.closest('[role="dialog"]')?.contains(document.activeElement))initial.current?.focus();wasBlocked.current=blocked;},[blocked,initial]);
}
/** Keys of a surface: held Enter/Escape ignored; Escape answers its Cancel path and does not reach another surface; Tab
 * stays inside. Enter activates the focused button only (no global default button). */
function surfaceKeys(e:KeyboardEvent<HTMLDivElement>,root:HTMLElement|null,escape:()=>void,enter?:()=>void){
 if(ignoreHeldKey(e)){e.stopPropagation();return;}
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();escape();return;}
 if(e.key==='Enter'&&enter){e.preventDefault();e.stopPropagation();enter();return;}
 trapTab(e,root);
}

/** Preferences1Click with the gate closed: the recovered message 0x588a84 with caption 0x588b70 (WEB box, OK only).
 * Enter or Escape closes it. */
function UserOptionsBox({onDismiss,...focus}:Readonly<{onDismiss:()=>void}>&FocusBack){
 const id=useId(),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useModalFocus(button,false,focus);
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} className="antenna-dialog antenna-notice"
   data-testid="radio-access-refusal" onKeyDown={e=>surfaceKeys(e,root.current,onDismiss,onDismiss)}>
   <h3 id={`${id}-title`} className="radio-control-native" data-testid="radio-access-refusal-title">{vireo(L.userOptionsCaption)}</h3>
   <p id={`${id}-body`} className="radio-control-native" style={{whiteSpace:'pre-line',overflowWrap:'anywhere'}} data-testid="radio-access-refusal-text">{vireo(L.instructorText)}</p>
   <p className="radio-control-note">{t('radioAccess.refusal.note')}</p>
   <div className="button-row">
    <button ref={button} type="button" className="primary-button" data-testid="radio-access-refusal-ok" onClick={onDismiss}>{vireo(VB.ok)}</button>
   </div>
  </div>
 </div>;
}

type ParentProps=Readonly<{blocked:boolean;status:'radio-ok'|'radio-cancelled'|null;full:boolean;radioRef:RefObject<HTMLButtonElement|null>;onRadio:()=>void;onClose:(r:'ok'|'cancel')=>void}>&FocusBack;
/** TOptionsDlg as a partial form (Radio..., OK, Cancel). Inert while the Radio child is open; Escape is Cancel. */
function OptionsParentDialog({blocked,status,full,radioRef,onRadio,onClose,...focus}:ParentProps){
 const id=useId(),root=useRef<HTMLDivElement>(null);
 useModalFocus(radioRef,blocked,focus);
 return <div className="antenna-backdrop">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-note`} className="antenna-dialog" data-testid="radio-access-parent"
   data-blocked={blocked} inert={blocked||undefined} onKeyDown={e=>{if(!blocked)surfaceKeys(e,root.current,()=>onClose('cancel'));}}>
   <h3 id={`${id}-title`} className="radio-control-native">{vireo(D.parentCaption)}</h3>
   <p id={`${id}-note`} className="radio-control-note" style={{overflowWrap:'anywhere'}}>{t('radioAccess.parent.note')}</p>
   <div className="button-row">
    <button ref={radioRef} type="button" className="secondary-button" data-testid="radio-access-radio" aria-describedby={`${id}-radio-help`}
     onClick={onRadio}>{menuCaptionText(vireo(D.radioButton))}</button>
   </div>
   <p id={`${id}-radio-help`} className="radio-control-note">{t('radioAccess.parent.radioHelp')}</p>
   <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-access-parent-status" data-status={status??undefined}>
    {status===null?'':t(full&&status==='radio-ok'?'radioAccess.parent.status.radio-ok-full':`radioAccess.parent.status.${status}`)}</p>
   <p className="radio-control-note">{t('radioAccess.parent.closeNote')}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-access-parent-ok" onClick={()=>onClose('ok')}>{menuCaptionText(vireo(D.parentOk))}</button>
    <button type="button" className="secondary-button" data-testid="radio-access-parent-cancel" onClick={()=>onClose('cancel')}>{menuCaptionText(vireo(D.parentCancel))}</button>
   </div>
  </div>
 </div>;
}

type ChildProps=Readonly<{checked:boolean;onEdit:(checked:boolean)=>void;onOk:()=>void;onCancel:()=>void;returnFocus:RefObject<HTMLButtonElement|null>;suppressed:RefObject<boolean>}>;
/** TRadiOptsDlg as a partial form: AccessPlsrBox, OK, Cancel. Focus starts on the checkbox; Escape is Cancel and is not
 * passed on to the parent. */
function RadioOptionsChildDialog({checked,onEdit,onOk,onCancel,returnFocus,suppressed}:ChildProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),box=useRef<HTMLInputElement>(null);
 useModalFocus(box,false,{returnFocus,suppressed});
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-note`} className="antenna-dialog" data-testid="radio-access-child"
   onKeyDown={e=>surfaceKeys(e,root.current,onCancel)}>
   <h3 id={`${id}-title`} className="radio-control-native">{vireo(D.childCaption)}</h3>
   <p id={`${id}-note`} className="radio-control-note" style={{overflowWrap:'anywhere'}}>{t('radioAccess.child.note')}</p>
   <label className="radio-control-native">
    <input ref={box} type="checkbox" data-testid="radio-access-checkbox" checked={checked} aria-describedby={`${id}-ok-note`}
     onChange={e=>onEdit(e.target.checked)}/> {vireo(D.accessBox)}</label>
   <p id={`${id}-ok-note`} className="radio-control-note" style={{overflowWrap:'anywhere'}}>{t('radioAccess.child.okNote')}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-access-child-ok" onClick={onOk}>{menuCaptionText(vireo(D.childOk))}</button>
    <button type="button" className="secondary-button" data-testid="radio-access-child-cancel" onClick={onCancel}>{menuCaptionText(vireo(D.childCancel))}</button>
   </div>
  </div>
 </div>;
}

// ---- R-RX9 (docs/RADIO-SIMULATION-OPTIONS.md): the card's numeric section, the full TRadiOptsDlg form and its failure box.
const FLAG_ROWS=['telescopeType938','pulsarId939','limitSlewing93a','maxRateIndex93b','plotPulsars93c','hotListFile93d','hotListExact93e','soundFeatures93f','testMode940','accessPulsarList'] as const;
type FlagRow=typeof FLAG_ROWS[number];
const flagLabel=(k:FlagRow)=>k==='telescopeType938'?menuCaptionText(D.scopeGroup):k==='pulsarId939'?menuCaptionText(D.idGroup):D.checkBoxes[k];
function flagValue(k:FlagRow,r:RadioOptionsFullRecord):string{
 if(k==='telescopeType938')return D.scopeItems[r.telescopeType938];
 if(k==='pulsarId939')return D.idItems[r.pulsarId939];
 if(k==='maxRateIndex93b')return t('radioAccess.numeric.flags.index',{index:r.maxRateIndex93b});
 return t(r[k]?'radioAccess.numeric.flags.checked':'radioAccess.numeric.flags.unchecked');
}
const notSupplied=(v:number|null)=>v===null?t('radioAccess.numeric.mismatch.notSupplied'):String(v);
function mismatchText(m:RadioOptionsConsumerMismatch,panelDiameter:number|null):string{
 if(m==='panel-diameter')return t('radioAccess.numeric.mismatch.panel-diameter',{value:notSupplied(panelDiameter)});
 return t(`radioAccess.numeric.mismatch.${m}`);
}
const antennaReportKind=(a:RadioAntennaProjection)=>a.kind==='refused'?`refused-${a.reason}`:a.kind==='applied'&&a.issues.length>0?'applied-unsupported':a.kind;
function antennaReportText(a:RadioAntennaProjection):string{
 if(a.kind==='unchanged')return t('radioAccess.numeric.report.antenna.unchanged');
 if(a.kind==='refused')return t(`radioAccess.numeric.report.antenna.refused.${a.reason}`);
 return t(a.issues.length>0?'radioAccess.numeric.report.antenna.appliedUnsupported':'radioAccess.numeric.report.antenna.applied',{changes:changeList(a.changes)});
}
function receiverReportText(r:RadioReceiverProjectionReport):string{
 if(r.kind==='applied')return t('radioAccess.numeric.report.receiver.applied',{changes:changeList(r.changes)});
 if(r.kind==='refused-domain')return t('radioAccess.numeric.report.receiver.refused-domain',{field:CHANGE_LABEL[r.field as ReceiverField]??r.field});
 return t(`radioAccess.numeric.report.receiver.${r.kind}`);
}
const panelReportText=(p:RadioPanelProjection)=>p.kind==='unchanged'?t('radioAccess.numeric.report.panel.unchanged')
 :t('radioAccess.numeric.report.panel.applied',{before:notSupplied(p.before),after:String(p.after)});

type SiteStatus='site-ok'|'site-cancelled'|'site-reset'|'site-reset-unchanged';
type NumericSectionProps=Readonly<{state:RadioAccessState;view:RadioAccessNumericHost['view'];optIn:OptInStatus|null;projection:RadioOptionsProjectionReport|null;
 headingRef:RefObject<HTMLHeadingElement|null>;onBranch:(hostPredicate:boolean,focused:boolean)=>void;siteStatus:SiteStatus|null;onResetSite:()=>void}>;
/** Front T11a: the site fields as TRadioLab's FormActivate labels show them (0x564868..0x56497a: |angle| × 180/π through
 * 0x486ca0 with digits 0, then ' W'/' E' and ' S'/' N' by sign), the Singles with one decimal (presentation only). */
const R2D=RADIO_OPTIONS_NUMERIC_CONSTANTS.radiansToDegrees;
const SITE_ROWS=[
 ['name',SC.name,(v:RadioSiteRecord)=>v.name],
 ['longitudeRadians',SC.longitude,(v:RadioSiteRecord)=>siteInformationAngle(v.longitudeRadians*R2D).trim()+(v.longitudeRadians<0?SIL.west:SIL.east)],
 ['latitudeRadians',SC.latitude,(v:RadioSiteRecord)=>siteInformationAngle(v.latitudeRadians*R2D).trim()+(v.latitudeRadians<0?SIL.south:SIL.north)],
 ['heightMetres',SC.altitude,(v:RadioSiteRecord)=>radioOptionsFixedText(v.heightMetres,1)+SIL.meters],
 ['utMinusLocalHours',SC.utLocal,(v:RadioSiteRecord)=>radioOptionsFixedText(v.utMinusLocalHours,1)],
] as const;
const clockReportText=(c:RadioClockProjection)=>c.kind==='unchanged'?t('radioAccess.site.report.clock.unchanged')
 :t('radioAccess.site.report.clock.applied',{before:c.before===null?t('radioAccess.numeric.mismatch.notSupplied'):String(c.before),after:String(c.after)});
/** WEB-RSO-AUTH-01 / WEB-RSO-PROJ-01 card section: the authority, the two explicit compiled branches (absent only), the
 * object and panel copy per field, the consumers in use and the last projection, consumer by consumer. */
function NumericSection({state,view,optIn,projection,headingRef,onBranch,siteStatus,onResetSite}:NumericSectionProps){
 const id=useId(),a=state.authority;
 const authorityText=a.kind==='absent'?t('radioAccess.numeric.absent'):a.kind==='supplied'?t('radioAccess.numeric.supplied'):t('radioAccess.numeric.compiled',{sync:syncText(a.hostPredicate)});
 const statusKey=optIn===null?undefined:OPT_IN_STATUS[optIn.outcome];
 const optInText=optIn?.outcome==='authority-applied'?t('radioAccess.numeric.status.authority-applied',{sync:syncText(optIn.hostPredicate)}):statusKey?t(statusKey):'';
 const onOff=(v:boolean)=>t(v?'radioAccess.values.on':'radioAccess.values.off');
 const o=view.antenna,r=view.receiver;
 const horizon=radioOptionsFixedText(o.minimumAltitudeRadians*RADIO_OPTIONS_NUMERIC_CONSTANTS.radiansToDegrees,6);
 const root=state.root as RadioOptionsFullRecord,env=state.env as RadioOptionsFullRecord;
 return <section className="radio-access-numeric" aria-labelledby={`${id}-title`} data-testid="radio-access-numeric" data-authority={a.kind}
  data-host-predicate={a.kind==='compiled-branch'?String(a.hostPredicate):undefined}>
  <h3 ref={headingRef} id={`${id}-title`} className="radio-access-subheading" tabIndex={-1}>{t('radioAccess.numeric.heading')}</h3>
  <p data-testid="radio-access-numeric-authority">{authorityText}</p>
  {a.kind==='absent'&&<>
   <p id={`${id}-help`} className="radio-control-note">{t('radioAccess.numeric.optInHelp')}</p>
   <div className="button-row">
    {[true,false].map(h=><button key={String(h)} type="button" className="secondary-button" data-testid={`radio-access-numeric-optin-${h}`} aria-describedby={`${id}-help`}
     onKeyDown={ignoreHeldKey} onClick={e=>onBranch(h,e.currentTarget===document.activeElement)}>{t('radioAccess.numeric.optIn',{sync:syncText(h)})}</button>)}
   </div>
  </>}
  <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-access-numeric-status" data-outcome={optIn?.outcome}>{optInText}</p>
  {optIn!==null&&optIn.mismatches.length>0&&<ul className="radio-control-note" data-testid="radio-access-numeric-mismatches">
   {optIn.mismatches.map(m=><li key={m} data-mismatch={m}>{mismatchText(m,view.panelDiameter)}</li>)}
  </ul>}
  {a.kind!=='absent'&&<>
   <h4>{t('radioAccess.numeric.values.heading')}</h4>
   <dl className="radio-control-state" data-testid="radio-access-numeric-values">
    {RADIO_OPTIONS_DFM_ORDER.map(f=><Fragment key={f}>
     <dt className="radio-control-native">{vireo(D.labels[f])}</dt>
     <dd data-testid={`radio-access-numeric-${f}`} data-root={String(root[f])} data-env={String(env[f])}>
      {t('radioAccess.numeric.values.pair',{root:formatRadioOptionsValue(f,root[f]),env:formatRadioOptionsValue(f,env[f])})}</dd>
    </Fragment>)}
    {FLAG_ROWS.map(k=><Fragment key={k}>
     <dt className="radio-control-native">{vireo(flagLabel(k))}</dt>
     <dd data-testid={`radio-access-numeric-${k}`} data-root={String(root[k])} data-env={String(env[k])}>{t('radioAccess.numeric.values.pair',{root:flagValue(k,root),env:flagValue(k,env)})}</dd>
    </Fragment>)}
   </dl>
   <h4>{t('radioAccess.numeric.consumers.heading')}</h4>
   <p className="radio-control-note">{t('radioAccess.numeric.consumers.note')}</p>
   <ul data-testid="radio-access-numeric-consumers">
    <li data-testid="radio-access-numeric-antenna" data-limits={o.limitsEnabled} data-horizon={String(o.minimumAltitudeRadians)} data-max={o.maxRateIndex} data-base={o.rateBase}
     data-transit={o.transitTelescope} data-instant={o.instantSlew} data-latitude={String(o.latitudeRadians)}>
     {t('radioAccess.numeric.consumers.antenna',{limits:onOff(o.limitsEnabled),degrees:horizon,max:o.maxRateIndex,base:o.rateBase,transit:onOff(o.transitTelescope)})}</li>
    <li data-testid="radio-access-numeric-receiver" data-provenance={r?.provenance} data-dish={r?.dishDiameterMeters} data-gain={r===null?undefined:String(r.gain924)}
     data-background={r?.background928} data-beam={r===null?undefined:String(r.beamWidth92c)} data-temperature={r===null?undefined:String(r.temperature930)}>
     {r===null?t('radioAccess.numeric.consumers.receiverNone'):t('radioAccess.numeric.consumers.receiver',{
      provenance:t(r.provenance==='supplied-record'?'radioAccess.numeric.consumers.provenanceRecord':'radioAccess.numeric.consumers.provenanceCompiled'),
      dish:r.dishDiameterMeters,gain:radioOptionsFixedText(r.gain924,2),background:r.background928,beam:radioOptionsFixedText(r.beamWidth92c,2),temperature:radioOptionsFixedText(r.temperature930,1)})}</li>
    <li data-testid="radio-access-numeric-panel" data-diameter={view.panelDiameter===null?'':String(view.panelDiameter)}>
     {t('radioAccess.numeric.consumers.panel',{value:notSupplied(view.panelDiameter)})}</li>
   </ul>
   <p className="radio-control-note" data-testid="radio-access-numeric-not-applied">{t('radioAccess.numeric.consumers.notApplied')}</p>
   <h4>{t('radioAccess.numeric.report.heading')}</h4>
   {projection===null?<p data-testid="radio-access-numeric-report">{t('radioAccess.numeric.report.none')}</p>
    :<ul data-testid="radio-access-numeric-report" data-antenna={antennaReportKind(projection.antenna)} data-receiver={projection.receiver.kind} data-panel={projection.panel.kind}>
     <li data-testid="radio-access-numeric-report-antenna">{antennaReportText(projection.antenna)}</li>
     <li data-testid="radio-access-numeric-report-receiver">{receiverReportText(projection.receiver)}</li>
     <li data-testid="radio-access-numeric-report-panel">{panelReportText(projection.panel)}</li>
     {projection.clock&&<li data-testid="radio-access-numeric-report-clock" data-clock={projection.clock.kind}>{clockReportText(projection.clock)}</li>}
    </ul>}
   <h4>{t('radioAccess.site.heading')}</h4>
   <p className="radio-control-note">{t('radioAccess.site.note')}</p>
   <dl className="radio-control-state" data-testid="radio-access-site-values">
    {SITE_ROWS.map(([k,label,text])=><Fragment key={k}>
     <dt className="radio-control-native">{vireo(label)}</dt>
     <dd data-testid={`radio-access-site-${k}`} data-root={String(state.site.root[k])} data-env={String(state.site.env[k])} style={{overflowWrap:'anywhere'}}>
      {t('radioAccess.numeric.values.pair',{root:text(state.site.root),env:text(state.site.env)})}</dd>
    </Fragment>)}
   </dl>
   <p data-testid="radio-access-site-status" data-site={radioSiteNonDefault(state)?'non-default':'compiled'}>{t(radioSiteNonDefault(state)?'radioAccess.site.nonDefault':'radioAccess.site.compiled')}</p>
   <div className="button-row">
    <button type="button" className="secondary-button" data-testid="radio-access-site-reset" aria-describedby={`${id}-site-reset`} onKeyDown={ignoreHeldKey} onClick={onResetSite}>{t('radioAccess.site.reset')}</button>
   </div>
   <p id={`${id}-site-reset`} className="radio-control-note">{t('radioAccess.site.resetHelp')}</p>
   <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-access-site-outcome" data-outcome={siteStatus??undefined}>{siteStatus===null?'':t(`radioAccess.site.outcome.${siteStatus}`)}</p>
  </>}
 </section>;
}

type ReadOnlyBox='plotPulsars93c'|'hotListFile93d'|'hotListExact93e'|'soundFeatures93f'|'testMode940';
const READ_ONLY_BOXES:readonly ReadOnlyBox[]=['plotPulsars93c','hotListFile93d','hotListExact93e','soundFeatures93f','testMode940'];
type SimProps=Readonly<{snapshot:RadioOptionsFullRecord;checked:boolean;numeric:RadioOptionsNumericChild;refusal:RadioOptionsNumberField|null;
 onText:(field:RadioOptionsNumberField,text:string)=>void;onFlag:(flag:'limitSlewing'|'fastSlewing',checked:boolean)=>void;onAccess:(checked:boolean)=>void;
 onOk:()=>void;onCancel:()=>void;returnFocus:RefObject<HTMLButtonElement|null>;suppressed:RefObject<boolean>;
 /** Front T11a: TStationDlg is open over the form (inert behind it); Site... opens it. */
 station:boolean;siteRef:RefObject<HTMLButtonElement|null>;onSite:()=>void}>;
/** TRadiOptsDlg (VMT 0x5a7c84) under a numeric authority. The nine edits in DFM order, Limit Slewing, Fast Slewing and
 * Access Pulsar List editable; the other check boxes and both groups shown read only from the activation snapshot.
 * WEB-RSO-KEY-01: focus on HorzEd with its text selected (0x5a938f..0x5a93a2); a fresh Enter in a field or check box chooses
 * OK (DFM OKBtn Default = True), Enter on a button activates that button; Escape is Cancel and stops here; held Enter and
 * Escape are ignored; Tab stays inside. Inert while the failure box is open; after it, focus returns to the control that
 * chose OK (OKBtnClick has no SetFocus). */
function RadioSimulationOptionsDialog({snapshot,checked,numeric,refusal,onText,onFlag,onAccess,onOk,onCancel,returnFocus,suppressed,station,siteRef,onSite}:SimProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),horizon=useRef<HTMLInputElement>(null),lastFocus=useRef<HTMLElement|null>(null);
 // Front T11a: inert while TStationDlg is open; FormActivate does not run again after it (focus returns to Site...).
 const blocked=numeric.failure!==null||station;
 useModalFocus(horizon,blocked,{returnFocus,suppressed});
 useEffect(()=>{if(!blocked)horizon.current?.select();},[]);// mount-time `blocked` only
 useEffect(()=>{if(blocked)return;const el=lastFocus.current;lastFocus.current=null;if(el&&root.current?.contains(el)&&canTakeFocus(el))el.focus();},[blocked]);
 const ok=()=>{lastFocus.current=document.activeElement as HTMLElement|null;onOk();};
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(blocked)return;
  if(ignoreHeldKey(e)){e.stopPropagation();return;}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onCancel();return;}
  if(e.key==='Enter'&&(e.target as HTMLElement).tagName==='INPUT'){e.preventDefault();e.stopPropagation();ok();return;}
  trapTab(e,root.current);
 };
 const max=RADIO_OPTIONS_TEXT_MAX_LENGTH;
 // No maxLength attribute: a paste is never truncated silently; an over-long edit is refused and named instead.
 const field=(f:RadioOptionsNumberField)=><div className="antenna-field" key={f}>
  <label htmlFor={`${id}-${f}`} className="radio-control-native">{vireo(D.labels[f])}</label>
  <input ref={f==='horizon90c'?horizon:undefined} id={`${id}-${f}`} type="text" autoComplete="off" spellCheck={false} data-testid={`radio-options-field-${f}`} value={numeric.texts[f]}
   aria-invalid={numeric.failure?.field===f||refusal===f||undefined} aria-describedby={f==='horizon90c'?`${id}-grammar ${id}-horizon-hint`:`${id}-grammar`} onChange={e=>onText(f,e.target.value)}/>
  {f==='horizon90c'&&<span id={`${id}-horizon-hint`} className="radio-control-note radio-control-native">{vireo(RADIO_OPTIONS_CAPTIONS.horizonLimitHint)}</span>}
 </div>;
 const readOnlyBox=(k:ReadOnlyBox)=><label key={k} className="radio-control-check radio-control-native">
  <input type="checkbox" data-testid={`radio-options-readonly-${k}`} checked={snapshot[k]} disabled readOnly aria-describedby={`${id}-readonly`}/> {vireo(D.checkBoxes[k])}</label>;
 const group=(k:'pulsarId939'|'telescopeType938',caption:string,items:readonly string[])=><fieldset className="antenna-group" data-testid={`radio-options-readonly-${k}`} data-value={snapshot[k]} disabled aria-describedby={`${id}-readonly`}>
  <legend className="radio-control-native">{menuCaptionText(caption)}</legend>
  {items.map((item,i)=><label key={item} className="radio-control-check radio-control-native"><input type="radio" name={`${id}-${k}`} checked={snapshot[k]===i} disabled readOnly/> {item}</label>)}
 </fieldset>;
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-note`} className="antenna-dialog radio-options-full" data-testid="radio-options-full"
   data-blocked={blocked} inert={blocked||undefined} onKeyDown={onKeyDown}>
   <h3 id={`${id}-title`} className="radio-control-native">{vireo(D.childCaption)}</h3>
   <p id={`${id}-note`} className="radio-control-note">{t('radioSimOptions.note')}</p>
   <fieldset className="antenna-group radio-options-parameters">
    <legend className="radio-control-native">{menuCaptionText(vireo(D.parametersGroup))}</legend>
    {RADIO_OPTIONS_DFM_ORDER.map(field)}
   </fieldset>
   <p id={`${id}-grammar`} className="radio-control-note">{t('radioSimOptions.grammar',{max})}</p>
   <p className="radio-control-note" role="status" aria-live="polite" data-testid="radio-options-field-refusal" data-field={refusal??undefined}>
    {refusal===null?'':t('radioSimOptions.fieldTooLong',{label:vireo(D.labels[refusal]),max})}</p>
   <fieldset className="antenna-group radio-options-flags">
    <legend className="radio-control-native">{menuCaptionText(vireo(D.optionsGroup))}</legend>
    <label className="radio-control-check radio-control-native"><input type="checkbox" data-testid="radio-options-flag-limitSlewing" checked={numeric.limitSlewing}
     aria-describedby={`${id}-limit-hint`} onChange={e=>onFlag('limitSlewing',e.target.checked)}/> {vireo(D.checkBoxes.limitSlewing93a)}</label>
    <span id={`${id}-limit-hint`} className="radio-control-note radio-control-native">{vireo(RADIO_OPTIONS_CAPTIONS.limitSlewingHint)}</span>
    <label className="radio-control-check radio-control-native"><input type="checkbox" data-testid="radio-options-flag-fastSlewing" checked={numeric.fastSlewing}
     aria-describedby={`${id}-fast-note`} onChange={e=>onFlag('fastSlewing',e.target.checked)}/> {vireo(D.checkBoxes.maxRateIndex93b)}</label>
    <span id={`${id}-fast-note`} className="radio-control-note">{t('radioSimOptions.fastNote')}</span>
    {READ_ONLY_BOXES.map(readOnlyBox)}
    {/* Front R1: the effect of each read-only setting (dossier C, compiled defaults 0x5a8fcb..0x5a90ad). */}
    <details className="radio-control-note" data-testid="radio-options-effects"><summary data-testid="radio-options-effects-summary">{R1.optionEffectsTitle}</summary><ul>{R1.optionEffects.map(e=><li key={e}>{e}</li>)}</ul></details>
    <label className="radio-control-check radio-control-native"><input type="checkbox" data-testid="radio-access-checkbox" checked={checked}
     onChange={e=>onAccess(e.target.checked)}/> {vireo(D.checkBoxes.accessPulsarList)}</label>
   </fieldset>
   {group('pulsarId939',vireo(D.idGroup),vireoList(D.idItems))}
   {group('telescopeType938',vireo(D.scopeGroup),vireoList(D.scopeItems))}
   <p id={`${id}-readonly`} className="radio-control-note" data-testid="radio-options-readonly-note">{t('radioSimOptions.readonlyNote')}</p>
   <div className="button-row">
    <button type="button" className="secondary-button" data-testid="radio-options-files" disabled aria-describedby={`${id}-files`}>{menuCaptionText(vireo(D.filesButton))}</button>
    <button ref={siteRef} type="button" className="secondary-button" data-testid="radio-options-site" title={vireo(RADIO_SITE_DFM.hint)} aria-describedby={`${id}-files`} onClick={onSite}>{menuCaptionText(vireo(D.siteButton))}</button>
   </div>
   <p id={`${id}-files`} className="radio-control-note">{t('radioSimOptions.filesSiteNote')}</p>
   <p className="radio-control-note">{t('radioSimOptions.okNote')}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-access-child-ok" onClick={ok}>{menuCaptionText(vireo(D.childOk))}</button>
    <button type="button" className="secondary-button" data-testid="radio-access-child-cancel" onClick={onCancel}>{menuCaptionText(vireo(D.childCancel))}</button>
   </div>
  </div>
 </div>;
}

/** The numeric failure box (RSO-09): application-modal above the dialog; Enter or Escape closes only the box (held keys
 * ignored), focus starts on its OK. grammar: the recovered caption 0x5a97c4 with an OpenVireo explanation (the helper
 * 0x486ae0's final text is not established); web-limit: a browser limit, labelled as such. It names the field, the text,
 * what OK already wrote and what keeps its value. */
function RadioOptionsFailureBox({failure,onDismiss}:Readonly<{failure:RadioOptionsNumericFailure;onDismiss:()=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{button.current?.focus();},[]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(ignoreHeldKey(e)){e.stopPropagation();return;}
  if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();e.stopPropagation();onDismiss();return;}
  trapTab(e,root.current);
 };
 const native=failure.kind==='grammar',label=vireo(D.labels[failure.field]);
 const earlier=RADIO_OPTIONS_OK_ORDER.slice(0,failure.position).map(f=>vireo(D.labels[f])).join(', '),later=RADIO_OPTIONS_OK_ORDER.slice(failure.position+1).map(f=>vireo(D.labels[f])).join(', ');
 const written=failure.position===0?t('radioSimOptions.failure.writtenFirst',{label,later})
  :later===''?t('radioSimOptions.failure.writtenLast',{label,earlier}):t('radioSimOptions.failure.writtenSome',{label,earlier,later});
 return <div className="antenna-backdrop antenna-backdrop-top radio-options-failure-layer">
  <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} className="antenna-dialog antenna-notice" data-testid="radio-options-failure"
   data-field={failure.field} data-kind={failure.kind} data-reason={failure.reason} data-position={failure.position} onKeyDown={onKeyDown}>
   <h3 id={`${id}-title`} className={native?'radio-control-native':undefined} data-testid="radio-options-failure-title">{native?vireo(L.numericErrorCaption):t('radioSimOptions.failure.title.web')}</h3>
   <div id={`${id}-body`}>
    <p data-testid="radio-options-failure-text" style={{overflowWrap:'anywhere',whiteSpace:'pre-wrap'}}>{t('radioSimOptions.failure.field',{label,text:failure.text})}</p>
    <p>{t(`radioSimOptions.failure.reason.${failure.reason}`)}</p>
    <p data-testid="radio-options-failure-written">{written}</p>
    <p>{t('radioSimOptions.failure.stay')}</p>
   </div>
   <p className="radio-control-note" data-testid="radio-options-failure-note">{native?t('radioSimOptions.failure.nativeNote',{literal:L.numericErrorHelperInput.replace(/\r\n/g,' ')}):t('radioSimOptions.failure.webNote')}</p>
   <div className="button-row">
    <button ref={button} type="button" className="primary-button" data-testid="radio-options-failure-ok" onClick={onDismiss}>{vireo(VB.ok)}</button>
   </div>
  </div>
 </div>;
}

// ---- Front T11a: TStationDlg over the Radio Simulation Options form (SiteBtnClick 0x5a9810) and its Input Error! box.
type StationProps=Readonly<{draft:StationDraft;setDraft:(f:(d:StationDraft|null)=>StationDraft|null)=>void;error:string;onOk:()=>void;onCancel:()=>void;
 returnFocus:RefObject<HTMLButtonElement|null>;suppressed:RefObject<boolean>}>;
/** The same TStationDlg fields as the observatory's Site Parameters (observatory/SiteDialogs.tsx StationFields), in this
 * card's own application-modal frame (a native <dialog> here would count as a foreign modal). FormActivate 0x5928e8 focuses
 * LocEd; Escape is Cancel and stops here; Tab stays inside; Enter in a field is OK; inert while its error box is open. */
function RadioStationDialog({draft,setDraft,error,onOk,onCancel,returnFocus,suppressed}:StationProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),first=useRef<HTMLElement|null>(null),blocked=error!=='';
 useEffect(()=>{first.current=root.current?.querySelector<HTMLInputElement>('input')??null;},[]);
 useModalFocus(first,blocked,{returnFocus,suppressed});
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-note`} className="antenna-dialog radio-station" data-testid="radio-station-dialog"
   data-blocked={blocked} inert={blocked||undefined} onKeyDown={e=>{if(!blocked)surfaceKeys(e,root.current,onCancel);}}>
   <h3 id={`${id}-title`} className="radio-control-native">{vireo(SC.form)}</h3>
   <StationFields station={draft} setStation={setDraft as Parameters<typeof StationFields>[0]['setStation']} onOk={onOk} testId="radio-station"/>
   <p id={`${id}-note`} className="radio-control-note" style={{overflowWrap:'anywhere'}}>{t('radioAccess.site.dialogNote')}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-station-ok" onClick={onOk}>{menuCaptionText(vireo(SC.ok))}</button>
    <button type="button" className="secondary-button" data-testid="radio-station-cancel" onClick={onCancel}>{menuCaptionText(vireo(SC.cancel))}</button>
   </div>
  </div>
 </div>;
}
/** TStationDlg OK's MB_ICONSTOP box (OB-ST-03, caption "Input Error!"), or the web domain note for a name or horizon the web
 * does not support. Enter or Escape closes it; focus starts on its OK. */
function RadioStationErrorBox({text,onDismiss}:Readonly<{text:string;onDismiss:()=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{button.current?.focus();},[]);
 return <div className="antenna-backdrop antenna-backdrop-top radio-options-failure-layer">
  <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} className="antenna-dialog antenna-notice" data-testid="radio-station-error"
   onKeyDown={e=>surfaceKeys(e,root.current,onDismiss,onDismiss)}>
   <h3 id={`${id}-title`} className="radio-control-native">{vireo(SC.errorCaption)}</h3>
   <p id={`${id}-body`} className="radio-control-native" data-testid="radio-station-error-text" style={{overflowWrap:'anywhere'}}>{text}</p>
   <div className="button-row">
    <button ref={button} type="button" className="primary-button" data-testid="radio-station-error-ok" onClick={onDismiss}>{vireo(VB.ok)}</button>
   </div>
  </div>
 </div>;
}
