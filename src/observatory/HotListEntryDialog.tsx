import {useEffect,useId,useRef} from 'react';
import {OBSERVATORY_VIREO_CAPTIONS as OV} from './ObservatoryMessages';
import {vireo} from '../i18n/vireo';
import {HOT_LIST_ENTRY_CAPTIONS as C,type HotListEntryDraft,type HotListEntryField} from '../core/hotListEntry';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import './observatory-dialogs.css';
import {imeComposing} from '../dialogKeyboard';
const M=OBSERVATORY_MESSAGES.entry;

/** Web presentation of THOVerifyDlg "Add/Edit Hot List Entry" (OB-AC-02/03): recovered labels, hints and MaxLengths; OK and
 * Cancel are the VCL defaults. An OK error is a box above the dialog, which keeps its draft. Presentation only. */
export default function HotListEntryDialog({draft,error,onEdit,onOk,onCancel,onDismiss,testId='ob-entry'}:{draft:HotListEntryDraft|null;error:string;onEdit:(f:HotListEntryField,v:string)=>void;onOk:()=>void;onCancel:()=>void;onDismiss:()=>void;testId?:string}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),box=useRef<HTMLDialogElement>(null),first=useRef<HTMLInputElement>(null),open=draft!==null;
 useEffect(()=>{const el=dialog.current;if(!el)return;if(open&&!el.open){el.showModal();first.current?.focus();first.current?.select();}else if(!open&&el.open)el.close();},[open]);
 useEffect(()=>{const el=box.current;if(!el)return;if(error&&!el.open)el.showModal();else if(!error&&el.open)el.close();},[error]);
 const field=(name:HotListEntryField,label:string,numeric=true)=><label className="ob-field"><span>{label}</span>
  <input ref={name==='id'?first:undefined} type="text" inputMode={numeric?'decimal':undefined} autoComplete="off" spellCheck={false} title={vireo(C.hints[name])} maxLength={C.maxLength[name]} data-testid={`${testId}-${name}`} value={draft?.[name]??''} onChange={e=>onEdit(name,e.target.value)}
   onKeyDown={e=>{if(e.key==='Enter'&&!imeComposing(e)){e.preventDefault();onOk();}}}/><small>{vireo(C.hints[name])}</small></label>;
 return <dialog ref={dialog} className="ob-dialog" aria-labelledby={`${id}-title`} data-testid={testId} onCancel={e=>{e.preventDefault();if(!error)onCancel();}}>
  {draft&&<>
   <h2 id={`${id}-title`} className="ob-native">{vireo(C.form)}</h2>
   <div className="ob-group">{field('id',vireo(C.id),false)}{field('remarks',vireo(C.remarks),false)}</div>
   <fieldset className="ob-group"><legend className="ob-native">{vireo(C.raGroup)}</legend>{field('raHours',vireo(C.hours))}{field('raMinutes',vireo(C.minutes))}{field('raSeconds',vireo(C.seconds))}</fieldset>
   <fieldset className="ob-group"><legend className="ob-native">{vireo(C.decGroup)}</legend>{field('decDegrees',vireo(C.degrees))}{field('decMinutes',vireo(C.minutes))}{field('decSeconds',vireo(C.seconds))}</fieldset>
   <p className="ob-note">{M.help}</p>
   <div className="ob-actions"><button type="button" className="primary-button" data-testid={`${testId}-ok`} onClick={onOk}>{vireo(OV.ok)}</button><button type="button" className="secondary-button" data-testid={`${testId}-cancel`} onClick={onCancel}>{vireo(OV.cancel)}</button></div>
  </>}
  <dialog ref={box} className="ob-dialog ob-box" role="alertdialog" aria-labelledby={`${id}-box`} data-testid={`${testId}-error`} onCancel={e=>{e.preventDefault();onDismiss();}}>
   <h2 id={`${id}-box`}>{OBSERVATORY_MESSAGES.skyCoords.errorTitle}</h2><p className="ob-native">{error}</p>
   <div className="ob-actions"><button type="button" className="primary-button" onClick={onDismiss}>{vireo(OV.ok)}</button></div>
  </dialog>
 </dialog>;
}
