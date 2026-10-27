import {useEffect,useId,useRef,useState} from 'react';
import {OPTICAL_OPTIONS_CAPTIONS as C,type OpticalOptions} from '../core/opticalOptions';
import {menuCaptionText} from '../core/radioControl';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import './observatory-dialogs.css';
const M=OBSERVATORY_MESSAGES.options;

/** Minimal "Optical Simulation Options" (OB-LS-01, WEB-LS-01): Limit Slewing is the only live control; every other General
 * control and tab of the original is listed disabled. OK commits the draft; Cancel discards it. */
export default function OpticalOptionsDialog({options,onOptions,disabled}:{options:OpticalOptions;onOptions:(o:OpticalOptions)=>void;disabled:boolean}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),[draft,setDraft]=useState<OpticalOptions|null>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;if(draft&&!el.open){el.showModal();el.querySelector<HTMLInputElement>('input:not([disabled])')?.focus();}else if(!draft&&el.open)el.close();},[draft!==null]);
 useEffect(()=>{if(disabled)setDraft(null);},[disabled]);
 return <>
  <button type="button" className="secondary-button" disabled={disabled} data-testid="ob-options" onClick={()=>setDraft(options)}>{M.open}</button>
  <dialog ref={ref} className="ob-dialog" aria-labelledby={`${id}-title`} data-testid="ob-options-dialog" onCancel={e=>{e.preventDefault();setDraft(null);}}>
   {draft&&<>
    <h2 id={`${id}-title`} className="ob-native">{C.form}</h2>
    <p className="ob-note ob-native">{menuCaptionText(C.general)}</p>
    <fieldset className="ob-group"><legend className="ob-native">{menuCaptionText(C.options)}</legend>
     <label className="ob-check" title={C.limitSlewingHint}><input type="checkbox" data-testid="ob-options-limit" checked={draft.limitSlewing} onChange={e=>setDraft({limitSlewing:e.target.checked})}/>{C.limitSlewing}</label>
     <small className="ob-note">{C.limitSlewingHint}</small>
     {C.otherOptions.map(o=><label key={o} className="ob-check"><input type="checkbox" disabled checked={false} onChange={()=>{}}/>{o} <small>— {M.unavailable}</small></label>)}
    </fieldset>
    <fieldset className="ob-group" disabled><legend className="ob-native">{menuCaptionText(C.parameters)}</legend>{C.parameterLabels.map(l=><span key={l} className="ob-check">{l} <small>— {M.unavailable}</small></span>)}</fieldset>
    <p className="ob-note">{C.otherTabs.map(menuCaptionText).join(', ')}: {M.unavailable}. {M.help}</p>
    <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-options-ok" onClick={()=>{onOptions(draft);setDraft(null);}}>{menuCaptionText(C.ok)}</button><button type="button" className="secondary-button" onClick={()=>setDraft(null)}>{menuCaptionText(C.cancel)}</button></div>
   </>}
  </dialog>
 </>;
}
