import {useEffect,useId,useRef} from 'react';
import CleaHelp from '../clusters/CleaHelp';
import {HELP_FILES} from '../help/helpFiles';
import type {MultiSpecState,MultiSpecAction} from '../core/multiSpec';
import {MULTISPEC_MESSAGES as N} from '../core/multiSpecFormat';
import {t} from '../i18n';
import {multiSpecSnrText} from './multiSpecText';

const C=N.control;
/** A native message box or Yes/No question as a modal <dialog> (role alertdialog); Escape answers Cancel/No. */
export function MultiSpecBox({caption,text,question,onAnswer,testId='ms-box'}:Readonly<{caption:string;text:string;question:boolean;onAnswer:(yes:boolean)=>void;testId?:string}>){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),first=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const d=dialog.current;if(d&&!d.open){d.showModal();first.current?.focus();}return()=>{if(d?.open)d.close();};},[]);
 return <dialog ref={dialog} className="ob-dialog ob-box ms-box" role="alertdialog" aria-labelledby={`${id}-c`} aria-describedby={`${id}-t`} data-testid={testId} onCancel={e=>{e.preventDefault();onAnswer(false);}}>
  <h2 id={`${id}-c`} className="ob-native">{caption}</h2><p id={`${id}-t`} className="ms-box-text" data-testid={`${testId}-text`}>{text}</p>
  <div className="ob-actions">{question?<><button type="button" className="primary-button" ref={first} onClick={()=>onAnswer(true)}>{t('multispec.yes')}</button><button type="button" className="secondary-button" onClick={()=>onAnswer(false)}>{t('multispec.no')}</button></>
   :<button type="button" className="primary-button" ref={first} onClick={()=>onAnswer(true)}>{t('multispec.ok')}</button>}</div>
 </dialog>;
}
const clockText=(c:Readonly<{minutes:number;seconds:number}>)=>`${c.minutes}:${String(c.seconds).padStart(2,'0')}`;
/** TMultSpCntrl ("CLEA Multi-Channel Spectrometer Control", plan §2.1): the Objects menu, the three seven-segment displays,
 * the Select LED, Exposure Minutes, Init/Go/Stop. Every enable state is the reducer's (core/multiSpec.ts). Print Selection Field
 * (Print Sky Image is not ported) and Help (its options index name +0xb54 is empty by default, docs/CLEA-HELP.md) stay disabled with their reason. */
export default function MultiSpecControl({state,dispatch,busy,masked}:Readonly<{state:MultiSpecState;dispatch:(a:MultiSpecAction)=>void;busy:boolean;
 /** Object X rule (plan §4): the typed S/N reason is replaced by one neutral text. */masked:boolean}>){
 const c=state.controls,menu=c.objects&&!busy,id=useId();
 const snr=state.displays.snr===null?t('multispec.snrIndeterminate'):state.displays.snr.toFixed(1);
 return <section className="ms-control" aria-labelledby={`${id}-title`} data-testid="ms-control">
  <h3 id={`${id}-title`} className="ob-native">{C.caption}</h3>
  <div className="ms-menu" role="group" aria-label={C.objects}>
   <button type="button" className="secondary-button" disabled={!menu||!c.select} onClick={()=>dispatch({type:'select'})} data-testid="ms-select">{C.select}</button>
   <button type="button" className="secondary-button" disabled={!menu||!c.clear} onClick={()=>dispatch({type:'clear'})} data-testid="ms-clear">{C.clear}</button>
   <button type="button" className="secondary-button" disabled={!menu||!c.viewSave} onClick={()=>dispatch({type:'view-save'})} data-testid="ms-view-save">{C.viewSave}</button>
   <button type="button" className="secondary-button" disabled aria-describedby={`${id}-print`}>{C.printField}</button>
   <button type="button" className="secondary-button" disabled={busy} onClick={()=>dispatch({type:'close'})} data-testid="ms-close">{C.close}</button>
   {/* TMultSpCntrl Help1: Help1.Enabled := Length(+0xb54) > 0, empty by default (0x529bb5). */}<CleaHelp list={HELP_FILES['MLTSPHLP.LST']} label={C.help} disabledReason={t('multispec.helpEmpty')} testId="ms-control-help"/>
  </div>
  <p className="observatory-note" id={`${id}-print`}>{t('multispec.printFieldTyped')}</p>
  <div className="ms-displays">
   <div className="ms-display"><span>{C.objectsDisplay}</span><output data-testid="ms-objects">{state.displays.objects}</output></div>
   <div className="ms-display"><span>{C.snr}</span><output data-testid="ms-snr">{snr}</output><small>{N.snrLabel}</small></div>
   <div className="ms-display"><span>{C.timer}</span><output data-testid="ms-clock" data-colour={state.displays.clockColour}>{clockText(state.displays.clock)}</output></div>
  </div>
  {state.signalToNoise.status==='indeterminate'&&<p className="observatory-note" data-testid="ms-snr-typed">{multiSpecSnrText(state.signalToNoise,masked)}</p>}
  <div className="ms-row">
   <span className="ms-led-label">{C.selectLed}<span className="ms-led" data-on={state.selecting} role="img" aria-label={t(state.selecting?'multispec.ledOn':'multispec.ledOff')} data-testid="ms-led"/></span>
   <label className="ms-exp">{C.minutes}<input value={state.expText} inputMode="decimal" maxLength={64} title={N.hint} disabled={state.running||busy} onChange={e=>dispatch({type:'edit-exposure',text:e.target.value})} data-testid="ms-minutes"/></label>
  </div>
  <p className="observatory-note">{t('multispec.timerNote')}</p>
  <div className="ms-row ms-buttons"><span>{C.exposure}</span>
   <button type="button" className="primary-button" disabled={!c.init||busy} onClick={()=>dispatch({type:'init'})} data-testid="ms-init">{C.init}</button>
   <button type="button" className="secondary-button" disabled={!c.go||busy} onClick={()=>dispatch({type:'go'})} data-testid="ms-go">{C.go}</button>
   <button type="button" className="secondary-button" disabled={!c.stop} onClick={()=>dispatch({type:'stop'})} data-testid="ms-stop">{C.stop}</button>
  </div>
 </section>;
}
