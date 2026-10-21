import {StrictMode,useEffect,useId,useMemo,useState,type KeyboardEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {
 INITIAL_RADIO_CONTROL,NATIVE_CAPTIONS,RANDOM_ACCESS_RANGE_MS,clickRadioSwitch,closeRadioPanel,enterRadioPulsarsExercise,menuCaptionText,
 parseDishDiameter,pressRadioSwitchKey,radioIdCaptionLabel,reopenRadioPanel,scopeTimerTick,selectRadioAccess,
 type DomeByte,type RadioControlState,type RadioEnvironment,type RadioOutcome,type RadioTransition,
} from '../core/radioControl';
import {createRadioTranslator,type RadioMessageKey,type RadioTranslate} from './RadioMessages';
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
}>;

const DOME_BYTES:readonly DomeByte[]=[0,1,2,3];
const englishRadio=createRadioTranslator();
const outcomeKey=(o:RadioOutcome)=>`radio.outcome.${o}` as RadioMessageKey;

export default function RadioControlPanel({state,environment,onTransition,onEnvironmentChange,translate=englishRadio,autoScopeTimer=true}:RadioControlPanelProps){
 const t=translate,id=useId();
 const [outcome,setOutcome]=useState<RadioOutcome|null>(null),[envError,setEnvError]=useState(false);
 const [draft,setDraft]=useState(environment.dishDiameterMeters===null?'':String(environment.dishDiameterMeters)),[draftInvalid,setDraftInvalid]=useState(false);
 useEffect(()=>{setDraft(environment.dishDiameterMeters===null?'':String(environment.dishDiameterMeters));setDraftInvalid(false);},[environment.dishDiameterMeters]);
 const run=(step:()=>RadioTransition)=>{
  let transition:RadioTransition|null=null;
  try{transition=step();}catch{transition=null;}
  if(!transition){setEnvError(true);return;}
  setEnvError(false);setOutcome(transition.outcome);if(transition.changed)onTransition(transition);
 };
 useEffect(()=>{
  if(!autoScopeTimer||!state.scopeTimerEnabled||state.scopeTimerIntervalMs!==1||environment.domeByte===3)return;
  const timer=setTimeout(()=>run(()=>scopeTimerTick(state,environment)),1);
  return ()=>clearTimeout(timer);
 },[autoScopeTimer,state,environment]);// run is recreated each render; state/environment are the real inputs.
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
 return <section className="card radio-control" aria-labelledby={`${id}-title`} data-testid="radio-control">
  <h2 id={`${id}-title`}>{t('radio.title')}</h2>
  <p>{t('radio.scope')}</p>
  <div className="radio-control-grid">
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
  {state.scopeTimerEnabled&&<section className="radio-control-block" aria-labelledby={`${id}-timer`} data-testid="radio-timer">
   <h3 id={`${id}-timer`}>{t('radio.timer.heading')}</h3>
   <p>{timerText}</p>
   {environment.domeByte===3&&<p>{t('radio.timer.domeWait')}</p>}
   {(state.scopeTimerIntervalMs===null||!autoScopeTimer)&&<button type="button" className="secondary-button" data-testid="radio-timer-deliver" onClick={()=>run(()=>scopeTimerTick(state,environment))}>{t('radio.timer.deliver')}</button>}
  </section>}
  {state.radioPanelShown&&<section role="dialog" aria-modal="false" aria-labelledby={`${id}-panel`} className="radio-panel-window" data-testid="radio-panel-window">
   <h3 id={`${id}-panel`}>{t('radio.panel.heading')}</h3>
   <p>{t('radio.panel.gap')}</p>
   <button type="button" className="secondary-button" data-testid="radio-panel-close" onClick={()=>run(()=>closeRadioPanel(state))}>{t('radio.panel.close')}</button>
  </section>}
  <p className="radio-control-status" role="status" aria-live="polite" data-testid="radio-status">{envError?t('radio.error.environment'):outcome?t(outcomeKey(outcome)):''}</p>
  {onEnvironmentChange&&<fieldset className="radio-control-block radio-control-env" data-testid="radio-env">
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
  </fieldset>}
  <details className="radio-control-block" data-testid="radio-state">
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
 </section>;
}

/** Self-contained stateful wrapper (harness/demo). Starts from the recovered
 * initial state with every external input explicit and the diameter unset. */
export function RadioControlWorkbench({initialEnvironment,translate}:Readonly<{initialEnvironment?:RadioEnvironment;translate?:RadioTranslate}>){
 const [state,setState]=useState<RadioControlState>(INITIAL_RADIO_CONTROL);
 const [environment,setEnvironment]=useState<RadioEnvironment>(initialEnvironment??{domeByte:0,accessOptionByte:false,dishDiameterMeters:null,otherWindowItemsVisible:false});
 return <RadioControlPanel state={state} environment={environment} onTransition={tr=>setState(tr.state)} onEnvironmentChange={setEnvironment} translate={translate}/>;
}

/** Standalone mount for the loopback harness; App integration should render RadioControlPanel directly. */
export function mountRadioWorkbench(element:Element){
 const root=createRoot(element);root.render(<StrictMode><RadioControlWorkbench/></StrictMode>);return root;
}
