import {useEffect,useId,useRef,type ReactNode,type RefObject} from 'react';
import {SKY_COORDS_CAPTIONS as C,SKY_COORDS_FIELD_MAX_LENGTH,skyCoordsDraftTarget,type SkyCoordsField} from '../core/radioAntenna';
import {menuCaptionText} from '../core/radioControl';
import type {OpticalSkyCoordsState} from '../core/opticalSkyCoords';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import './observatory-dialogs.css';
const M=OBSERVATORY_MESSAGES.skyCoords;

/** Web presentation of the shared TSkyCoordsDlg for the optical observatory (OB-SC). Native <dialog> modal: focus starts in
 * RA hours with its text selected (ActiveControl RAHrEd), Enter in a field is OK, Escape is Cancel. The RA-09 error box is a
 * second modal above it; the dialog keeps its draft. Presentation only: every change goes through opticalSkyCoords.ts. */
export default function OpticalSkyCoordsDialog({state,onEdit,onEpoch,onOk,onCancel,onDismiss}:{state:OpticalSkyCoordsState;onEdit:(f:SkyCoordsField,text:string)=>void;onEpoch:(i:0|1)=>void;onOk:()=>void;onCancel:()=>void;onDismiss:()=>void}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),box=useRef<HTMLDialogElement>(null),first=useRef<HTMLInputElement>(null),d=state.dialog,open=d!==null;
 useEffect(()=>{const el=dialog.current;if(!el)return;if(open&&!el.open){el.showModal();first.current?.focus();first.current?.select();}else if(!open&&el.open)el.close();},[open]);
 useEffect(()=>{const el=box.current;if(!el)return;if(state.notice&&!el.open)el.showModal();else if(!state.notice&&el.open)el.close();},[state.notice]);
 const draftPole=d?.epochIndex===1&&skyCoordsDraftTarget(d)?.conversion?.southPoleSignLost===true;
 const field=(name:SkyCoordsField,label:ReactNode,ref?:RefObject<HTMLInputElement|null>)=><label className="ob-field"><span>{label}</span>
  <input ref={ref} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} maxLength={SKY_COORDS_FIELD_MAX_LENGTH} data-testid={`ob-sky-${name}`} value={d?.fields[name]??''} onChange={e=>onEdit(name,e.target.value)}
   onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();onOk();}}}/></label>;
 return <>
  <dialog ref={dialog} className="ob-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} data-testid="ob-sky-coords" onCancel={e=>{e.preventDefault();if(!state.notice)onCancel();}}>
   {d&&<>
    <h2 id={`${id}-title`} className="ob-native">{C.form.trim()}</h2>
    <p id={`${id}-help`} className="ob-note">{M.help}</p>
    <fieldset className="ob-group"><legend className="ob-native">{C.raGroup}</legend>{field('raHours',C.hours,first)}{field('raMinutes',C.minutes)}{field('raSeconds',C.seconds)}</fieldset>
    <fieldset className="ob-group"><legend className="ob-native">{C.decGroup}</legend>{field('decDegrees',C.degrees)}
     {field('decMinutes',<>{C.arcminutes}<span className="visually-hidden">{M.arcminutes}</span></>)}
     {field('decSeconds',<>{C.arcseconds}<span className="visually-hidden">{M.arcseconds}</span></>)}</fieldset>
    <fieldset className="ob-group ob-epoch" disabled={!d.epochEnabled}><legend className="ob-native">{C.epochGroup}</legend>
     {C.epochs.map((caption,index)=><label key={caption} className="ob-check"><input type="radio" name={`${id}-epoch`} data-testid={`ob-sky-epoch-${index}`} checked={d.epochIndex===index} onChange={()=>onEpoch(index as 0|1)}/>{caption}</label>)}</fieldset>
    {d.epochEnabled&&d.epochIndex===1&&<p className="ob-note" data-testid="ob-sky-b1950-note">{M.b1950Note}</p>}
    {d.origin!=='hot-list'&&state.targetHoldsB1950&&<p className="ob-note" data-testid="ob-sky-b1950-reopen">{M.b1950Reopen}</p>}
    <div role="status" aria-live="polite">{(draftPole||d.openSouthPoleSignLost)&&<p className="ob-note" data-testid="ob-sky-b1950-pole">{M.b1950Pole}</p>}</div>
    {d.origin==='hot-list'&&<p className="ob-note" data-testid="ob-sky-hotlist-origin">{M.hotListOrigin}</p>}
    <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-sky-ok" onClick={onOk}>{menuCaptionText(C.ok)}</button><button type="button" className="secondary-button" data-testid="ob-sky-cancel" onClick={onCancel}>{menuCaptionText(C.cancel)}</button></div>
   </>}
   <dialog ref={box} className="ob-dialog ob-box" role="alertdialog" aria-labelledby={`${id}-box-title`} aria-describedby={`${id}-box-text`} data-testid="ob-sky-error" onCancel={e=>{e.preventDefault();onDismiss();}}>
    <h2 id={`${id}-box-title`}>{M.errorTitle}</h2>
    <p id={`${id}-box-text`}>{state.notice?M.notice[state.notice.kind]:''}</p>
    <div className="ob-actions"><button type="button" className="primary-button" autoFocus onClick={onDismiss}>{M.ok}</button></div>
   </dialog>
  </dialog>
 </>;
}
