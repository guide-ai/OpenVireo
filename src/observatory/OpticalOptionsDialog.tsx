import {useEffect,useId,useRef,useState} from 'react';
import {OPTICAL_OPTIONS_CAPTIONS as C,type OpticalOptions} from '../core/opticalOptions';
import {menuCaptionText} from '../core/radioControl';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import {EDIT_MODE_CAPTIONS} from '../core/editMode';
import {FIELD_INFO_MESSAGES} from './FieldInfoMessages';
import './observatory-dialogs.css';
const M=OBSERVATORY_MESSAGES.options;

/** Minimal "Optical Simulation Options" (OB-LS-01, WEB-LS-01): Limit Slewing is the only live control besides Edit Mode (Front O,
 * WEB-EM-01, shown when `onEditMode` is given; not persisted); every other General control and tab of the original is listed
 * disabled. OK commits the draft; Cancel discards it. */
export default function OpticalOptionsDialog({options,onOptions,disabled,editMode=false,onEditMode}:{options:OpticalOptions;onOptions:(o:OpticalOptions)=>void;disabled:boolean;editMode?:boolean;onEditMode?:(on:boolean)=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),[draft,setDraft]=useState<OpticalOptions|null>(null),[editDraft,setEditDraft]=useState(editMode);
 useEffect(()=>{const el=ref.current;if(!el)return;if(draft&&!el.open){el.showModal();el.querySelector<HTMLInputElement>('input:not([disabled])')?.focus();}else if(!draft&&el.open)el.close();},[draft!==null]);
 useEffect(()=>{if(disabled)setDraft(null);},[disabled]);
 return <>
  <button type="button" className="secondary-button" disabled={disabled} data-testid="ob-options" onClick={()=>{setDraft(options);setEditDraft(editMode);}}>{M.open}</button>
  <dialog ref={ref} className="ob-dialog" aria-labelledby={`${id}-title`} data-testid="ob-options-dialog" onCancel={e=>{e.preventDefault();setDraft(null);}}>
   {draft&&<>
    <h2 id={`${id}-title`} className="ob-native">{C.form}</h2>
    <p className="ob-note ob-native">{menuCaptionText(C.general)}</p>
    <fieldset className="ob-group"><legend className="ob-native">{menuCaptionText(C.options)}</legend>
     <label className="ob-check" title={C.limitSlewingHint}><input type="checkbox" data-testid="ob-options-limit" checked={draft.limitSlewing} onChange={e=>setDraft({limitSlewing:e.target.checked})}/>{C.limitSlewing}</label>
     <small className="ob-note">{C.limitSlewingHint}</small>
     {onEditMode&&<><label className="ob-check" title={EDIT_MODE_CAPTIONS.hint}><input type="checkbox" data-testid="ob-options-edit-mode" checked={editDraft} onChange={e=>setEditDraft(e.target.checked)}/>{FIELD_INFO_MESSAGES.editModeLabel}</label>
      <small className="ob-note">{EDIT_MODE_CAPTIONS.hint}</small><small className="ob-note" data-testid="ob-options-edit-mode-note">{FIELD_INFO_MESSAGES.editModeAdaptation}</small></>}
     <p className="ob-note">{M.othersHeading}</p>
     <ul className="ob-option-list" data-testid="ob-options-others">{C.otherOptions.filter(o=>!(onEditMode&&o===EDIT_MODE_CAPTIONS.box)).map(o=><li key={o}><span className="ob-native">{o}</span>{o==='Fast Slewing'?<small> — {M.fastSlewing}</small>:null}</li>)}</ul>
    </fieldset>
    <fieldset className="ob-group" disabled><legend className="ob-native">{menuCaptionText(C.parameters)}</legend>{C.parameterLabels.map(l=><span key={l} className="ob-check">{l} <small>— {M.unavailable}</small></span>)}</fieldset>
    <p className="ob-note">{C.otherTabs.map(menuCaptionText).join(', ')}: {M.unavailable}. {M.help}</p>
    <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-options-ok" onClick={()=>{onOptions(draft);if(onEditMode&&editDraft!==editMode)onEditMode(editDraft);setDraft(null);}}>{menuCaptionText(C.ok)}</button><button type="button" className="secondary-button" onClick={()=>setDraft(null)}>{menuCaptionText(C.cancel)}</button></div>
   </>}
  </dialog>
 </>;
}
