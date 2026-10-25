import {useEffect,useId,useLayoutEffect,useRef,useState,useSyncExternalStore,type KeyboardEvent,type ReactNode,type RefObject} from 'react';
import {menuCaptionText} from '../core/radioControl';
import type {RadioLabTransition} from '../core/radioAntenna';
import {
 INITIAL_RADIO_ACCESS,RADIO_ACCESS_DFM,RADIO_ACCESS_LITERALS,applyDemonstrationGate,cancelRadioOptions,closePreferences,dismissUserOptions,editAccessPulsarList,
 okRadioOptions,openPreferences,openRadioOptions,pulsarListAvailability,radioLabFirstActivation,receiverCloseMessage,receiverOpened,setCloseRecipient,
 type RadioAccessHostRefusal,type RadioAccessOutcome,type RadioAccessState,type RadioAccessTransition,type RadioCloseRecipient,type RadioPulsarListMenu,
} from '../core/radioAccessOptions';
import type {PulsarListCommandRefusal,PulsarListCommandResult} from '../core/radioPulsarListCommand';
import {ignoreHeldKey,nativeModalOpen,noNativeModal,observeNativeModals,observeNothing,trapTab} from './radioModal';
import {t,type PlainMessageKey} from '../i18n';

const D=RADIO_ACCESS_DFM,L=RADIO_ACCESS_LITERALS;
/** Card status texts of user outcomes (other outcomes are shown elsewhere or not announced). */
const STATUS:Readonly<Partial<Record<RadioAccessOutcome,PlainMessageKey>>>={
 'gate-opened':'radioAccess.status.gate-opened','gate-already-open':'radioAccess.status.gate-already-open','refused-surface-open':'radioAccess.status.refused-surface-open',
 'refused-inactive':'radioAccess.status.refused-inactive','refused-busy':'radioAccess.status.refused-busy','refused-modal':'radioAccess.status.refused-modal',
 'refused-receiver-box':'radioAccess.status.refused-receiver-box','refused-parent-open':'radioAccess.status.refused-parent-open',
 'refused-refusal-open':'radioAccess.status.refused-refusal-open','user-options-dismissed':'radioAccess.status.user-options-dismissed',
 'preferences-closed-ok':'radioAccess.status.preferences-closed-ok','preferences-closed-cancel':'radioAccess.status.preferences-closed-cancel',
};
type MenuEvent='activation-shown'|'activation-hidden'|'open-disabled'|'open-skipped'|'close-environment'|'close-enabled'|'close-skipped';
/** The last File ▸ Pulsar List... result: the shared name written and the record the window shows, or the refusal. On a
 * hit, name '' means the copied record has an empty J2000 name (from the command's result, never the seed). */
type ListStatus=Readonly<{outcome:'hit'|'miss'|PulsarListCommandRefusal;name:string;position:number;shown:string}>;
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
}>;

/** A target that can take focus: connected, enabled, rendered and not under an inert ancestor. */
const canTakeFocus=(el:HTMLElement|null):el is HTMLElement=>
 !!el&&el.isConnected&&!(el as HTMLButtonElement).disabled&&el.getClientRects().length>0&&!el.closest('[inert]');

/**
 * WEB host of the R-RX7 Radio configuration (docs/RADIO-ACCESS-OPTIONS.md): a card with the gate scenario, the Preferences
 * opener, read-only values, the PulsarList1 readout and the close-recipient adaptation; and, as application-modal
 * surfaces, the USER OPTIONS! box and the partial Optical/Radio Simulation Options dialogs. Every change goes through the
 * pure transitions on the latest accepted state (stateRef). Nothing is saved, restored or sent anywhere. R-RX8: while the
 * item is shown the card also renders the File ▸ Pulsar List... command (disabled while the item is disabled); its click
 * runs the route's runPulsarList, which alone writes the shared source buffer and activates Pulsar Parameters. This host
 * never touches the receivers, source buffer, cursor, records, clocks or RNG, and the command never writes the menu flags.
 */
export function useRadioAccessHost({active,busy,antennaModal,receiverBoxPending,surfaceNow,runPulsarList}:RadioAccessHostInput):RadioAccessHost{
 const id=useId();
 const [state,setState]=useState<RadioAccessState>(INITIAL_RADIO_ACCESS);
 const stateRef=useRef(state);
 const [status,setStatus]=useState<RadioAccessOutcome|null>(null);
 const [childStatus,setChildStatus]=useState<'radio-ok'|'radio-cancelled'|null>(null);
 const [menuEvent,setMenuEvent]=useState<MenuEvent|null>(null);
 const [listStatus,setListStatus]=useState<ListStatus|null>(null);
 const latest=useRef({active,busy,surfaceNow,runPulsarList});
 useLayoutEffect(()=>{latest.current={active,busy,surfaceNow,runPulsarList};});
 const step=(fn:(s:RadioAccessState)=>RadioAccessTransition)=>{
  const r=fn(stateRef.current);if(r.changed){stateRef.current=r.state;setState(r.state);}return r;
 };
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
 const applyGate=()=>{const r=cardUser(applyDemonstrationGate);if(r)setStatus(r.outcome);};
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

 // ---- Dialog actions.
 const dismiss=()=>{const r=user(dismissUserOptions);if(r?.changed)setStatus(r.outcome);};
 const openChild=()=>{const r=user(openRadioOptions);if(r?.changed)setChildStatus(null);};
 const editChild=(checked:boolean)=>{user(s=>editAccessPulsarList(s,checked));};
 const okChild=()=>{const r=user(s=>okRadioOptions(s,'not-ported'));if(r?.outcome==='radio-ok')setChildStatus('radio-ok');};
 const cancelChild=()=>{const r=user(cancelRadioOptions);if(r?.outcome==='radio-cancelled')setChildStatus('radio-cancelled');};
 const closeParent=(result:'ok'|'cancel')=>{const r=user(s=>closePreferences(s,result));if(r?.changed){setStatus(r.outcome);setChildStatus(null);}};

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
 const prefsRef=useRef<HTMLButtonElement>(null),headingRef=useRef<HTMLHeadingElement>(null),radioRef=useRef<HTMLButtonElement>(null);

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
  <p className="radio-control-note">{t('radioAccess.intro')}</p>
  <p className="radio-control-note" data-testid="radio-access-persistence">{t('radioAccess.persistence')}</p>
  <h3 className="radio-access-subheading">{t('radioAccess.gate.heading')}</h3>
  <p data-testid="radio-access-gate" data-source={state.gate.source} style={{overflowWrap:'anywhere'}}>{state.gate.open?t('radioAccess.gate.open'):t('radioAccess.gate.closed')}</p>
  <div className="button-row">
   <button type="button" className="secondary-button" data-testid="radio-access-demo" disabled={state.gate.open} aria-describedby={`${id}-demo-note`}
    onKeyDown={ignoreHeldKey} onClick={applyGate}>{t('radioAccess.gate.apply')}</button>
  </div>
  <p id={`${id}-demo-note`} className="radio-control-note" data-testid="radio-access-demo-note">{t('radioAccess.gate.note')}</p>
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
    onKeyDown={ignoreHeldKey} onClick={runList}>{menuCaptionText(D.pulsarListCaption)}</button>
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
  <h3 className="radio-access-subheading">{t('radioAccess.behaviour.heading')}</h3>
  <ul className="radio-control-note" data-testid="radio-access-behaviour">
   <li>{t('radioAccess.behaviour.childOk')}</li><li>{t('radioAccess.behaviour.childCancel')}</li><li>{t('radioAccess.behaviour.parent')}</li>
   <li>{t('radioAccess.behaviour.last')}</li><li>{t('radioAccess.behaviour.notPorted')}</li>
  </ul>
 </section>;
 const child=state.parent?.child??null;
 const layer=<div className="radio-control" style={{display:'contents'}} data-testid="radio-access-layer" data-modal-pending={pending} data-modal-presented={presented}>
  {presented&&state.refusal!==null&&<UserOptionsBox onDismiss={dismiss} returnFocus={prefsRef} fallbackFocus={headingRef} suppressed={suppressed}/>}
  {presented&&state.parent!==null&&<OptionsParentDialog blocked={child!==null} status={childStatus} radioRef={radioRef} onRadio={openChild} onClose={closeParent}
   returnFocus={prefsRef} fallbackFocus={headingRef} suppressed={suppressed}/>}
  {presented&&child!==null&&<RadioOptionsChildDialog checked={child.checked} onEdit={editChild} onOk={okChild} onCancel={cancelChild} returnFocus={radioRef} suppressed={suppressed}/>}
 </div>;
 return {open,openNow,menuNow,pending,presented,card,layer,
  antennaTransition,receiverOpened:onReceiverOpened,mainCloseMessage:onMainClose};
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
   <h3 id={`${id}-title`} className="radio-control-native" data-testid="radio-access-refusal-title">{L.userOptionsCaption}</h3>
   <p id={`${id}-body`} className="radio-control-native" style={{whiteSpace:'pre-line',overflowWrap:'anywhere'}} data-testid="radio-access-refusal-text">{L.instructorText}</p>
   <p className="radio-control-note">{t('radioAccess.refusal.note')}</p>
   <div className="button-row">
    <button ref={button} type="button" className="primary-button" data-testid="radio-access-refusal-ok" onClick={onDismiss}>{t('radioAccess.refusal.ok')}</button>
   </div>
  </div>
 </div>;
}

type ParentProps=Readonly<{blocked:boolean;status:'radio-ok'|'radio-cancelled'|null;radioRef:RefObject<HTMLButtonElement|null>;onRadio:()=>void;onClose:(r:'ok'|'cancel')=>void}>&FocusBack;
/** TOptionsDlg as a partial form (Radio..., OK, Cancel). Inert while the Radio child is open; Escape is Cancel. */
function OptionsParentDialog({blocked,status,radioRef,onRadio,onClose,...focus}:ParentProps){
 const id=useId(),root=useRef<HTMLDivElement>(null);
 useModalFocus(radioRef,blocked,focus);
 return <div className="antenna-backdrop">
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-note`} className="antenna-dialog" data-testid="radio-access-parent"
   data-blocked={blocked} inert={blocked||undefined} onKeyDown={e=>{if(!blocked)surfaceKeys(e,root.current,()=>onClose('cancel'));}}>
   <h3 id={`${id}-title`} className="radio-control-native">{D.parentCaption}</h3>
   <p id={`${id}-note`} className="radio-control-note" style={{overflowWrap:'anywhere'}}>{t('radioAccess.parent.note')}</p>
   <div className="button-row">
    <button ref={radioRef} type="button" className="secondary-button" data-testid="radio-access-radio" aria-describedby={`${id}-radio-help`}
     onClick={onRadio}>{menuCaptionText(D.radioButton)}</button>
   </div>
   <p id={`${id}-radio-help`} className="radio-control-note">{t('radioAccess.parent.radioHelp')}</p>
   <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-access-parent-status" data-status={status??undefined}>
    {status===null?'':t(`radioAccess.parent.status.${status}`)}</p>
   <p className="radio-control-note">{t('radioAccess.parent.closeNote')}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-access-parent-ok" onClick={()=>onClose('ok')}>{menuCaptionText(D.parentOk)}</button>
    <button type="button" className="secondary-button" data-testid="radio-access-parent-cancel" onClick={()=>onClose('cancel')}>{menuCaptionText(D.parentCancel)}</button>
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
   <h3 id={`${id}-title`} className="radio-control-native">{D.childCaption}</h3>
   <p id={`${id}-note`} className="radio-control-note" style={{overflowWrap:'anywhere'}}>{t('radioAccess.child.note')}</p>
   <label className="radio-control-native">
    <input ref={box} type="checkbox" data-testid="radio-access-checkbox" checked={checked} aria-describedby={`${id}-ok-note`}
     onChange={e=>onEdit(e.target.checked)}/> {D.accessBox}</label>
   <p id={`${id}-ok-note`} className="radio-control-note" style={{overflowWrap:'anywhere'}}>{t('radioAccess.child.okNote')}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-access-child-ok" onClick={onOk}>{menuCaptionText(D.childOk)}</button>
    <button type="button" className="secondary-button" data-testid="radio-access-child-cancel" onClick={onCancel}>{menuCaptionText(D.childCancel)}</button>
   </div>
  </div>
 </div>;
}
