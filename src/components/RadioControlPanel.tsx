import {StrictMode,useEffect,useId,useMemo,useRef,useState,type KeyboardEvent,type ReactNode,type RefObject} from 'react';
import {createRoot} from 'react-dom/client';
import {
 INITIAL_RADIO_CONTROL,NATIVE_CAPTIONS,RANDOM_ACCESS_RANGE_MS,clickRadioSwitch,closeRadioPanel,enterRadioPulsarsExercise,menuCaptionText,
 parseDishDiameter,pressRadioSwitchKey,radioIdCaptionLabel,reopenRadioPanel,scopeTimerTick,selectRadioAccess,
 type DomeByte,type RadioControlState,type RadioEnvironment,type RadioOutcome,type RadioTransition,
} from '../core/radioControl';
import {
 INITIAL_RADIO_LAB,NOTICE_BUTTONS,RADIO_COMPILED_ENVIRONMENT,RADIO_COMPILED_OPTIONS,RADIO_LAB_CAPTIONS,RADIO_LAB_CONSTANTS,SKY_COORDS_CAPTIONS,
 SKY_COORDS_FIELD_MAX_LENGTH,SKY_COORDS_WEB_DOMAIN,activateRadioLab,answerNotice,cancelSkyCoords,changeSlewRate,confirmSkyCoords,editSkyCoordsField,formatFixed,
 isRadioLabModal,openSetCoordinates,selectSkyCoordsEpoch,slewTimerTick,splitSexagesimal,toggleTracking,
 type NoticeAnswer,type RadioLabNotice,type RadioLabNoticeKind,type RadioLabOptions,type RadioLabOutcome,type RadioLabState,type RadioLabTransition,
 type SkyCoordsDialog,type SkyCoordsField,
} from '../core/radioAntenna';
import {createRadioTranslator,type RadioMessageKey,type RadioTranslate} from './RadioMessages';
import {createRadioAntennaTranslator,type RadioAntennaMessageKey,type RadioAntennaTranslate} from './RadioAntennaMessages';
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
 /** Deliver the recovered 1 ms ScopeTimer ticks automatically (default true). */
 autoScopeTimer?:boolean;
 /** Controlled TRadioLab antenna state (start from INITIAL_RADIO_LAB). Without it the panel window shows no antenna controls. */
 antenna?:RadioLabState;
 onAntennaTransition?:(transition:RadioLabTransition)=>void;
 /** Telescope options; default RADIO_COMPILED_OPTIONS (compiled defaults, no options file). */
 antennaOptions?:RadioLabOptions;
 antennaTranslate?:RadioAntennaTranslate;
 /** Deliver SlewTimer2 callbacks every 100 ms (default true); otherwise a manual tick button is shown. */
 autoSlewTimer?:boolean;
}>;

const DOME_BYTES:readonly DomeByte[]=[0,1,2,3];
const englishRadio=createRadioTranslator(),englishAntenna=createRadioAntennaTranslator();
/** RC outcomes whose wording lives in the scoped antenna catalog (shared en.json is outside this slice). */
const SCOPED_RC_OUTCOMES:Partial<Record<RadioOutcome,RadioAntennaMessageKey>>={'panel-hidden-switch-off':'antenna.outcome.panel-hidden-switch-off'};
const outcomeText=(o:RadioOutcome,t:RadioTranslate,ta:RadioAntennaTranslate)=>{const scoped=SCOPED_RC_OUTCOMES[o];return scoped?ta(scoped):t(`radio.outcome.${o}` as RadioMessageKey);};
/** Per-keystroke and per-tick outcomes are not announced in the live status line. */
const QUIET_OUTCOMES:ReadonlySet<RadioLabOutcome>=new Set(['slew-tick','field-edited','epoch-selected']);
const antennaOutcomeText=(o:RadioLabOutcome,ta:RadioAntennaTranslate)=>o==='field-too-long'?ta('antenna.outcome.field-too-long',{max:SKY_COORDS_FIELD_MAX_LENGTH}):ta(`antenna.outcome.${o}` as RadioAntennaMessageKey);

/** Message-box category and MessageBox flags operand (0x47e09c); null flags = browser box, explained by `note`. */
const NOTICE_META:Readonly<Record<RadioLabNoticeKind,{title:RadioAntennaMessageKey;flags:string|null;note?:RadioAntennaMessageKey}>>={
 'ra-invalid':{title:'antenna.notice.title.error',flags:'0x10'},'dec-invalid':{title:'antenna.notice.title.error',flags:'0x10'},
 'ra-unsupported':{title:'antenna.notice.title.unsupported',flags:null,note:'antenna.notice.webDomain'},
 'dec-unsupported':{title:'antenna.notice.title.unsupported',flags:null,note:'antenna.notice.webDomain'},
 'b1950-gated':{title:'antenna.notice.title.warning',flags:null,note:'antenna.notice.gate'},'no-slew-needed':{title:'antenna.notice.title.warning',flags:'0x30'},
 'transit-dec-only':{title:'antenna.notice.title.info',flags:'0x41'},'confirm-slew':{title:'antenna.notice.title.question',flags:'0x24'},
 'stop-slew':{title:'antenna.notice.title.question',flags:'0x24'},'slew-complete':{title:'antenna.notice.title.info',flags:'0x40'},
};
const BUTTON_KEYS:Readonly<Record<NoticeAnswer,RadioAntennaMessageKey>>={ok:'antenna.button.ok',cancel:'antenna.button.cancel',yes:'antenna.button.yes',no:'antenna.button.no'};
/** Windows MessageBox convention (inference): Escape answers OK on an OK box and Cancel on OK/Cancel; Yes/No boxes ignore it. */
const escapeAnswer=(kind:RadioLabNoticeKind):NoticeAnswer|null=>{const b=NOTICE_BUTTONS[kind];return b.includes('cancel')?'cancel':b.length===1?'ok':null;};
/** Browser policy (not recovered behavior): auto-repeated Enter/Escape do nothing inside the dialog, a message box or their Set Coordinates return-focus trigger,
 * so a held key cannot choose OK, answer the box that opens next and keep going (reproduced before this guard). */
const ignoreHeldKey=(e:KeyboardEvent<HTMLElement>)=>{if(e.repeat&&(e.key==='Enter'||e.key==='Escape')){e.preventDefault();return true;}return false;};

const raText=(ta:RadioAntennaTranslate,ra:number)=>{const p=splitSexagesimal(ra,2);return ta('antenna.format.ra',{h:p.whole,m:p.minutes,s:formatFixed(p.seconds,2)});};
const decText=(ta:RadioAntennaTranslate,dec:number)=>{const p=splitSexagesimal(dec,1);return ta('antenna.format.dec',{sign:p.sign<0?'−':'+',d:p.whole,m:p.minutes,s:formatFixed(p.seconds,1)});};
function noticeText(n:RadioLabNotice,ta:RadioAntennaTranslate):string{
 if(n.kind==='confirm-slew')return n.transit?ta('antenna.notice.confirm-slew-transit',{dec:decText(ta,n.target.dec)}):ta('antenna.notice.confirm-slew',{ra:raText(ta,n.target.ra),dec:decText(ta,n.target.dec)});
 if(n.kind==='ra-unsupported'||n.kind==='dec-unsupported')return ta(`antenna.notice.${n.kind}.${n.reason}`,{limit:SKY_COORDS_WEB_DOMAIN.magnitudeLimit});
 return ta(`antenna.notice.${n.kind}` as RadioAntennaMessageKey);
}
const FOCUSABLE='button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
/** Keeps Tab inside an application-modal surface. */
function trapTab(e:KeyboardEvent<HTMLElement>,root:HTMLElement|null){
 if(e.key!=='Tab'||!root)return;
 const items=[...root.querySelectorAll<HTMLElement>(FOCUSABLE)];if(!items.length)return;
 const first=items[0],last=items[items.length-1],active=document.activeElement;
 if(e.shiftKey&&(active===first||!root.contains(active))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&(active===last||!root.contains(active))){e.preventDefault();first.focus();}
}

export default function RadioControlPanel({state,environment,onTransition,onEnvironmentChange,translate=englishRadio,autoScopeTimer=true,
 antenna,onAntennaTransition,antennaOptions=RADIO_COMPILED_OPTIONS,antennaTranslate=englishAntenna,autoSlewTimer=true}:RadioControlPanelProps){
 const t=translate,ta=antennaTranslate,id=useId();
 const [outcome,setOutcome]=useState<RadioOutcome|null>(null),[envError,setEnvError]=useState(false);
 const [antennaOutcome,setAntennaOutcome]=useState<RadioLabOutcome|null>(null),[antennaError,setAntennaError]=useState(false);
 const [draft,setDraft]=useState(environment.dishDiameterMeters===null?'':String(environment.dishDiameterMeters)),[draftInvalid,setDraftInvalid]=useState(false);
 useEffect(()=>{setDraft(environment.dishDiameterMeters===null?'':String(environment.dishDiameterMeters));setDraftInvalid(false);},[environment.dishDiameterMeters]);
 const antennaModal=antenna?isRadioLabModal(antenna):false;
 const run=(step:()=>RadioTransition)=>{
  // ShowModal and MessageBox disable every other window of the application.
  if(antennaModal){setAntennaOutcome('modal-open');return;}
  let transition:RadioTransition|null=null;
  try{transition=step();}catch{transition=null;}
  if(!transition){setEnvError(true);return;}
  setEnvError(false);setOutcome(transition.outcome);if(transition.changed)onTransition(transition);
 };
 const runAntenna=(step:()=>RadioLabTransition)=>{
  if(!onAntennaTransition)return;
  let transition:RadioLabTransition|null=null;
  try{transition=step();}catch{transition=null;}
  if(!transition){setAntennaError(true);return;}
  setAntennaError(false);if(!QUIET_OUTCOMES.has(transition.outcome))setAntennaOutcome(transition.outcome);if(transition.changed)onAntennaTransition(transition);
 };
 useEffect(()=>{
  if(!autoScopeTimer||!state.scopeTimerEnabled||state.scopeTimerIntervalMs!==1||environment.domeByte===3)return;
  const timer=setTimeout(()=>run(()=>scopeTimerTick(state,environment)),1);
  return ()=>clearTimeout(timer);
 },[autoScopeTimer,state,environment]);// run is recreated each render; state/environment are the real inputs.
 // RA-04: the first Show activates the form once.
 useEffect(()=>{
  if(state.radioPanelShown&&antenna&&!antenna.activated)runAntenna(()=>activateRadioLab(antenna,antennaOptions));
 },[state.radioPanelShown,antenna,antennaOptions]);
 // RA-11: one SlewTimer2 callback per committed state. A TTimer keeps running while the form is hidden.
 useEffect(()=>{
  if(!antenna||!autoSlewTimer||!antenna.slewTimerEnabled)return;
  const slewRun=antenna.slewRun,timer=setTimeout(()=>runAntenna(()=>slewTimerTick(antenna,antennaOptions,slewRun)),RADIO_LAB_CONSTANTS.slewTimerIntervalMs);
  return ()=>clearTimeout(timer);
 },[antenna,antennaOptions,autoSlewTimer]);
 const onSwitchKey=(e:KeyboardEvent<HTMLButtonElement>)=>{
  // OnKeyPress receives characters only; Enter arrives as #13.
  if(e.key==='Enter'){e.preventDefault();run(()=>pressRadioSwitchKey(state,environment,'\r'));}
  else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();run(()=>pressRadioSwitchKey(state,environment,e.key));}
 };
 const idText=radioIdCaptionLabel(state);
 const timerText=useMemo(()=>state.scopeTimerIntervalMs===1?t('radio.timer.fast'):t('radio.timer.random',{range:RANDOM_ACCESS_RANGE_MS}),[state.scopeTimerIntervalMs,t]);
 const yesNo=(v:boolean|null)=>v===null?t('radio.state.unknown'):v?t('radio.state.yes'):t('radio.state.no');
 const byte=(v:number|null)=>v===null?t('radio.state.none'):String(v);
 const changeEnv=(patch:Partial<RadioEnvironment>)=>onEnvironmentChange?.({...environment,...patch});
 const applyDraft=()=>{try{changeEnv({dishDiameterMeters:parseDishDiameter(draft)});setDraftInvalid(false);}catch{setDraftInvalid(true);}};
 const windowCaption=menuCaptionText(NATIVE_CAPTIONS.window);
 const setCoordinatesRef=useRef<HTMLButtonElement>(null);
 // After the last modal surface closes, focus that fell to <body> returns to Set Coordinates.
 useEffect(()=>{if(!antennaModal&&(document.activeElement===null||document.activeElement===document.body))setCoordinatesRef.current?.focus();},[antennaModal]);
 return <section className="card radio-control" aria-labelledby={`${id}-title`} data-testid="radio-control">
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
     <button type="button" role="switch" className="radio-switch" data-testid="radio-switch" aria-checked={state.radioSwitchActive} aria-labelledby={`${id}-radlbl ${id}-swcap`} aria-describedby={`${id}-swhint`} disabled={!state.radioSwitchEnabled} onClick={()=>run(()=>clickRadioSwitch(state,environment))} onKeyDown={onSwitchKey} onKeyUp={e=>{if(e.key===' ')e.preventDefault();}}>
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
    ?<AntennaControls antenna={antenna} options={antennaOptions} ta={ta} run={runAntenna} autoSlewTimer={autoSlewTimer} setCoordinatesRef={setCoordinatesRef}/>
    :<p className="radio-control-note">{ta('antenna.notActivated')}</p>}
   <button type="button" className="secondary-button" data-testid="radio-panel-close" onClick={()=>run(()=>closeRadioPanel(state,environment))}>{t('radio.panel.close')}</button>
  </section>}
  <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-status">{envError?t('radio.error.environment'):outcome?outcomeText(outcome,t,ta):''}</p>
  {antenna&&<p className="radio-control-status" role="status" aria-live="polite" data-testid="antenna-status">{antennaError?t('radio.error.environment'):antennaOutcome?antennaOutcomeText(antennaOutcome,ta):''}</p>}
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
   <input id={`${id}-diameter`} data-testid="radio-env-diameter" type="text" inputMode="numeric" maxLength={11} value={draft} aria-invalid={draftInvalid} aria-describedby={`${id}-diameter-help`} onChange={e=>{setDraft(e.target.value);setDraftInvalid(false);}} onKeyDown={e=>{if(e.key==='Enter')applyDraft();}}/>
   <p id={`${id}-diameter-help`} className="radio-control-note">{t('radio.env.diameterHelp')}</p>
   <p className="radio-control-note" data-testid="radio-env-diameter-current">{environment.dishDiameterMeters===null?t('radio.env.diameterNone'):String(environment.dishDiameterMeters)}</p>
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="radio-env-apply" onClick={applyDraft}>{t('radio.env.apply')}</button>
    <button type="button" className="secondary-button" data-testid="radio-env-cancel" onClick={()=>{setDraft(environment.dishDiameterMeters===null?'':String(environment.dishDiameterMeters));setDraftInvalid(false);}}>{t('radio.env.cancel')}</button>
    <button type="button" className="secondary-button" data-testid="radio-env-clear" onClick={()=>{changeEnv({dishDiameterMeters:null});setDraftInvalid(false);}}>{t('radio.env.clear')}</button>
   </div>
   {draftInvalid&&<p role="alert" data-testid="radio-env-error">{t('radio.env.invalid')}</p>}
   <h3>{ta('antenna.defaults.heading')}</h3>
   <p className="radio-control-note">{ta('antenna.defaults.help')}</p>
   <div className="button-row"><button type="button" className="secondary-button" data-testid="radio-env-compiled" onClick={()=>{changeEnv({...RADIO_COMPILED_ENVIRONMENT});setDraftInvalid(false);}}>{ta('antenna.defaults.apply')}</button></div>
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
  {antenna?.dialog&&<SkyCoordsDialogView dialog={antenna.dialog} blocked={antenna.notice!==null} ta={ta}
   onEdit={(field,text)=>runAntenna(()=>editSkyCoordsField(antenna,field,text))} onEpoch={i=>runAntenna(()=>selectSkyCoordsEpoch(antenna,i))}
   onOk={()=>runAntenna(()=>confirmSkyCoords(antenna,antennaOptions))} onCancel={()=>runAntenna(()=>cancelSkyCoords(antenna))} returnFocus={setCoordinatesRef}/>}
  {antenna?.notice&&<NoticeView notice={antenna.notice} ta={ta} onAnswer={answer=>runAntenna(()=>answerNotice(antenna,antennaOptions,antenna.notice!.kind,answer))}/>}
 </section>;
}

type AntennaControlsProps=Readonly<{antenna:RadioLabState;options:RadioLabOptions;ta:RadioAntennaTranslate;run:(step:()=>RadioLabTransition)=>void;autoSlewTimer:boolean;setCoordinatesRef:RefObject<HTMLButtonElement|null>}>;
/** TRadioLab controls in DFM order (TabOrder: DriveBtn 0, N 1, S 2, E 3, W 4, RateSpin 5, Receiver 6). */
function AntennaControls({antenna:a,options,ta,run,autoSlewTimer,setCoordinatesRef}:AntennaControlsProps){
 const id=useId(),onOff=(v:boolean)=>ta(v?'antenna.state.enabled':'antenna.state.disabled'),yes=(v:boolean)=>ta(v?'antenna.options.yes':'antenna.options.no');
 const ra=splitSexagesimal(a.pointing.ra,2),dec=splitSexagesimal(a.pointing.dec,1);
 const storedEntered=!(a.target.ra===0&&a.target.dec===0);
 return <div className="antenna-controls" data-testid="antenna-controls">
  <div className="antenna-menu" role="group" aria-labelledby={`${id}-menu`}>
   <span id={`${id}-menu`} className="radio-control-note">{ta('antenna.menu.heading')}</span>
   <button ref={setCoordinatesRef} type="button" className="secondary-button" data-testid="antenna-set-coordinates" onKeyDown={ignoreHeldKey} disabled={!a.slewMenuEnabled} aria-describedby={a.slewMenuEnabled?undefined:`${id}-menu-off`} onClick={()=>run(()=>openSetCoordinates(a,options))}>
    {ta('antenna.menu.item',{menu:menuCaptionText(RADIO_LAB_CAPTIONS.slewMenu),item:RADIO_LAB_CAPTIONS.setCoordinates})}
   </button>
   {!a.slewMenuEnabled&&<p id={`${id}-menu-off`} className="radio-control-note" data-testid="antenna-menu-disabled">{ta('antenna.menu.slewDisabled')}</p>}
  </div>
  <section className="radio-control-block" aria-labelledby={`${id}-pos`}>
   <h4 id={`${id}-pos`}>{ta('antenna.readout.heading')}</h4>
   <dl className="antenna-readout">
    <dt className="radio-control-native">{RADIO_LAB_CAPTIONS.ra}</dt>
    <dd data-testid="antenna-ra">{ra.whole} {RADIO_LAB_CAPTIONS.hours} {ra.minutes} {RADIO_LAB_CAPTIONS.minutes} {formatFixed(ra.seconds,2)} {RADIO_LAB_CAPTIONS.seconds}</dd>
    <dt className="radio-control-native">{RADIO_LAB_CAPTIONS.dec}</dt>
    <dd data-testid="antenna-dec">{dec.sign<0?'−':'+'}{dec.whole} {RADIO_LAB_CAPTIONS.degrees} {dec.minutes} {RADIO_LAB_CAPTIONS.minutes} {formatFixed(dec.seconds,1)} {RADIO_LAB_CAPTIONS.seconds}</dd>
   </dl>
   <p className="radio-control-note">{ta('antenna.readout.note')}</p>
   <p data-testid="antenna-target"><span className="antenna-label">{ta('antenna.target.heading')}</span> {storedEntered?`${raText(ta,a.target.ra)}, ${decText(ta,a.target.dec)}`:ta('antenna.target.none')}</p>
  </section>
  <div className="radio-control-grid">
   <section className="radio-control-block" aria-labelledby={`${id}-drive`}>
    <h4 id={`${id}-drive`}>{ta('antenna.tracking.heading')}</h4>
    {a.trackingVisible
     ?<button type="button" className="secondary-button" data-testid="antenna-tracking" aria-pressed={a.tracking} onClick={()=>run(()=>toggleTracking(a,options))}>{RADIO_LAB_CAPTIONS.tracking}</button>
     :<p className="radio-control-note">{ta('antenna.tracking.transit')}</p>}
    {a.trackingVisible&&<p data-testid="antenna-tracking-state">{ta(a.tracking?'antenna.tracking.on':'antenna.tracking.off')}</p>}
    <p className="radio-control-note" data-testid="antenna-manual">{ta('antenna.manual.state',{state:onOff(a.manualButtonsEnabled)})}</p>
    <p className="radio-control-note" data-testid="antenna-receiver">{ta('antenna.receiver.state',{state:onOff(a.receiverEnabled)})}</p>
   </section>
   <section className="radio-control-block" aria-labelledby={`${id}-rate`}>
    <h4 id={`${id}-rate`}><span className="radio-control-native">{RADIO_LAB_CAPTIONS.slewRate}</span></h4>
    <div className="button-row">
     <button type="button" className="secondary-button antenna-spin" data-testid="antenna-rate-down" aria-label={ta('antenna.rate.down')} disabled={!a.rateSpinEnabled} onClick={()=>run(()=>changeSlewRate(a,options,'down'))}>−</button>
     <button type="button" className="secondary-button antenna-spin" data-testid="antenna-rate-up" aria-label={ta('antenna.rate.up')} disabled={!a.rateSpinEnabled} onClick={()=>run(()=>changeSlewRate(a,options,'up'))}>+</button>
    </div>
    <p data-testid="antenna-rate" aria-live="polite">{ta('antenna.rate.value',{index:a.rateIndex,rate:a.rate})}</p>
    <p className="radio-control-note">{ta('antenna.rate.gap')}</p>
   </section>
   <section className="radio-control-block" aria-labelledby={`${id}-motion`}>
    <h4 id={`${id}-motion`}>{ta('antenna.status.heading')}</h4>
    <p data-testid="antenna-motion">{ta(a.status==='slewing'?'antenna.status.slewing':a.status==='slewing-ra'?'antenna.status.slewingRa':'antenna.status.none')}</p>
    {a.slewing&&<p className="radio-control-note" data-testid="antenna-ticks">{ta('antenna.status.ticks',{ticks:a.slewTicks})}</p>}
    {!autoSlewTimer&&a.slewTimerEnabled&&<button type="button" className="secondary-button" data-testid="antenna-tick" onClick={()=>run(()=>slewTimerTick(a,options,a.slewRun))}>{ta('antenna.timer.deliver')}</button>}
   </section>
  </div>
  <p className="radio-control-note" data-testid="antenna-options">{ta('antenna.options.summary',{transit:yes(options.transitTelescope),limits:yes(options.limitsEnabled),max:options.maxRateIndex,base:options.rateBase,instant:yes(options.instantSlew)})}</p>
 </div>;
}

type SkyCoordsDialogProps=Readonly<{dialog:SkyCoordsDialog;blocked:boolean;ta:RadioAntennaTranslate;onEdit:(field:SkyCoordsField,text:string)=>void;onEpoch:(index:0|1)=>void;onOk:()=>void;onCancel:()=>void;returnFocus:RefObject<HTMLButtonElement|null>}>;
/** TSkyCoordsDlg (bsDialog, poScreenCenter): ActiveControl RAHrEd with its text selected; OK is the Default (bkOK) and Cancel the Cancel (bkCancel) button. */
function SkyCoordsDialogView({dialog,blocked,ta,onEdit,onEpoch,onOk,onCancel,returnFocus}:SkyCoordsDialogProps){
 const id=useId(),root=useRef<HTMLDivElement>(null),first=useRef<HTMLInputElement>(null),lastFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{first.current?.focus();first.current?.select();const back=returnFocus.current;return ()=>{back?.focus();};},[returnFocus]);
 // OKBtnClick has no SetFocus: after an error box, focus returns to the control that chose OK.
 useEffect(()=>{if(blocked)return;const el=lastFocus.current;lastFocus.current=null;if(el&&root.current?.contains(el))el.focus();},[blocked]);
 const ok=()=>{lastFocus.current=document.activeElement as HTMLElement|null;onOk();};
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
  <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} className="antenna-dialog" data-testid="antenna-dialog" onKeyDown={onKeyDown} inert={blocked||undefined}>
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
   {dialog.epochIndex===1&&<p className="radio-control-note" data-testid="antenna-b1950-gap">{ta('antenna.dialog.b1950Gap')}</p>}
   <div className="button-row">
    <button type="button" className="primary-button" data-testid="antenna-dialog-ok" onClick={ok}>{menuCaptionText(SKY_COORDS_CAPTIONS.ok)}</button>
    <button type="button" className="secondary-button" data-testid="antenna-dialog-cancel" onClick={onCancel}>{menuCaptionText(SKY_COORDS_CAPTIONS.cancel)}</button>
   </div>
  </div>
 </div>;
}

/** Application.MessageBox stand-in: application-modal, default button first, Escape per escapeAnswer. */
function NoticeView({notice,ta,onAnswer}:Readonly<{notice:RadioLabNotice;ta:RadioAntennaTranslate;onAnswer:(answer:NoticeAnswer)=>void}>){
 const id=useId(),root=useRef<HTMLDivElement>(null),defaultButton=useRef<HTMLButtonElement>(null);
 const meta=NOTICE_META[notice.kind],buttons=NOTICE_BUTTONS[notice.kind];
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;defaultButton.current?.focus();return ()=>{if(previous?.isConnected)previous.focus();};},[notice]);
 const onKeyDown=(e:KeyboardEvent<HTMLDivElement>)=>{
  if(ignoreHeldKey(e))return;
  if(e.key==='Escape'){e.preventDefault();const answer=escapeAnswer(notice.kind);if(answer)onAnswer(answer);return;}
  trapTab(e,root.current);
 };
 return <div className="antenna-backdrop antenna-backdrop-top">
  <div ref={root} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} className="antenna-dialog antenna-notice" data-testid="antenna-notice" data-kind={notice.kind} onKeyDown={onKeyDown}>
   <h3 id={`${id}-title`}>{ta(meta.title)}</h3>
   <p id={`${id}-body`} data-testid="antenna-notice-text">{noticeText(notice,ta)}</p>
   <p className="radio-control-note" data-testid="antenna-notice-note">{meta.flags?ta('antenna.notice.native',{flags:meta.flags}):ta(meta.note??'antenna.notice.gate')}</p>
   <div className="button-row">
    {buttons.map((answer,index)=><button key={answer} ref={index===0?defaultButton:undefined} type="button" className={index===0?'primary-button':'secondary-button'} data-testid={`antenna-notice-${answer}`} onClick={()=>onAnswer(answer)}>{ta(BUTTON_KEYS[answer])}</button>)}
   </div>
  </div>
 </div>;
}

/** Self-contained stateful wrapper (harness/demo). Starts from the recovered initial states with every
 * external input explicit and the diameter unset; the antenna uses the compiled options. */
export function RadioControlWorkbench({initialEnvironment,translate,antennaOptions,autoSlewTimer}:Readonly<{initialEnvironment?:RadioEnvironment;translate?:RadioTranslate;antennaOptions?:RadioLabOptions;autoSlewTimer?:boolean}>){
 const [state,setState]=useState<RadioControlState>(INITIAL_RADIO_CONTROL);
 const [environment,setEnvironment]=useState<RadioEnvironment>(initialEnvironment??{domeByte:0,accessOptionByte:false,dishDiameterMeters:null,otherWindowItemsVisible:false});
 const [antenna,setAntenna]=useState<RadioLabState>(INITIAL_RADIO_LAB);
 return <RadioControlPanel state={state} environment={environment} onTransition={tr=>setState(tr.state)} onEnvironmentChange={setEnvironment} translate={translate}
  antenna={antenna} onAntennaTransition={tr=>setAntenna(tr.state)} antennaOptions={antennaOptions} autoSlewTimer={autoSlewTimer}/>;
}

/** Standalone mount for the loopback harness; App integration should render RadioControlPanel directly. */
export function mountRadioWorkbench(element:Element,props:Readonly<{antennaOptions?:RadioLabOptions;autoSlewTimer?:boolean}>={}){
 const root=createRoot(element);root.render(<StrictMode><RadioControlWorkbench {...props}/></StrictMode>);return root;
}
