import {Fragment,useEffect,useId,useRef,useState} from 'react';
import {COMPILED_SESSION_OPTICAL_OPTIONS,OPTICAL_OPTIONS_CAPTIONS as C,OPTIONS_RESET_DEFAULTS,OPTIONS_RESET_LITERALS as R,SESSION_OPTION_CAPTIONS as SC,visibleOptionTabs,type OpticalOptions,type SessionOpticalOptions} from '../core/opticalOptions';
import {menuCaptionText} from '../core/radioControl';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import {EDIT_MODE_CAPTIONS,limitSlewingBox} from '../core/editMode';
import QuestionBox from '../polish/QuestionBox';
import {TEACHER_DEFERRED} from '../core/teacherDeferred';
import {FIELD_INFO_MESSAGES} from './FieldInfoMessages';
import {VIRTUAL_OBSERVATORY_CAPTIONS as VO} from '../core/observatoryMenuLiterals';
import {QSO_LIST_MESSAGES} from './QsoListMessages';
import {RADIO_ACCESS_LITERALS as UL} from '../core/radioAccessOptions';
import type {PreferencesGateResult} from '../core/instructorMode';
import {t} from '../i18n';
import './observatory-dialogs.css';
const M=OBSERVATORY_MESSAGES.options,S=M.session;
const SESSION_KEYS=Object.keys(SC) as (keyof SessionOpticalOptions)[];
const SESSION_HINTS:Readonly<Record<keyof SessionOpticalOptions,string>>={fastSlewing:S.fastSlewing,fastScopeChange:S.fastScopeChange,computeRedshiftVelocity:S.computeRedshiftVelocity,infraredCamera:S.infraredCamera,monochromeDisplays:S.monochromeDisplays,printInColor:S.printInColor,timeDependentData:S.timeDependentData,showObjectId:S.showObjectId,showObjectMag:S.showObjectMag,allowUserChange:S.allowUserChange};
const SESSION_NOTES:Partial<Record<keyof SessionOpticalOptions,string>>={fastScopeChange:S.fastScopeChangeNote,computeRedshiftVelocity:S.computeRedshiftVelocityNote,printInColor:S.colorNote,timeDependentData:S.timeDependentDataNote,showObjectId:S.showObjectIdNote};
const testId=(k:string)=>`ob-options-${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}`;

/** "Optical Simulation Options" (OB-LS-01, WEB-LS-01): Limit Slewing, Edit Mode (Front O, WEB-EM-01) and Virtual Observatory
 * (Front O2) are live, and so are Front R3's ported options (`sessionOptions`, page session only, WEB-OPT-R3). The tab parameters
 * are shown read-only with their compiled values; every other control is listed with its compiled state. OK commits the drafts;
 * Cancel discards them. Front T1: the button is VIREO's File › Preferences (Preferences1Click 0x5886ac): with the page's
 * instructor gate closed (0x5886c9) it shows the INSTRUCTOR / USER OPTIONS! box (0x588a84 / 0x588b70, MessageBox flags 0x30)
 * instead of the dialog, plus one web line on instructor mode. */
export default function OpticalOptionsDialog({gate='user-options-box',options,onOptions,disabled,editMode=false,onEditMode,virtualObservatory=false,onVirtualObservatory,sessionOptions,onSessionOptions,horizonRadians}:{
 /** Front T1: the page's instructor gate test (core/instructorMode.ts preferencesGate); absent: closed, as VIREO starts. */
 gate?:PreferencesGateResult;
 options:OpticalOptions;onOptions:(o:OpticalOptions)=>void;disabled:boolean;editMode?:boolean;onEditMode?:(on:boolean)=>void;
 /** Front O2 (review 1 M1): VObsBox, shown when `onVirtualObservatory` is given; not persisted. */
 virtualObservatory?:boolean;onVirtualObservatory?:(on:boolean)=>void;
 /** Front R3: shown when both are given; not persisted. */
 sessionOptions?:SessionOpticalOptions;onSessionOptions?:(o:SessionOpticalOptions)=>void;
 /** R3 review L2: the selected site's horizon (radians). */horizonRadians?:number}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),[draft,setDraft]=useState<OpticalOptions|null>(null),[resetAsked,setResetAsked]=useState(false),[editDraft,setEditDraft]=useState(editMode),[vobsDraft,setVobsDraft]=useState(virtualObservatory),[sessionDraft,setSessionDraft]=useState(sessionOptions);
 useEffect(()=>{const el=ref.current;if(!el)return;if(draft&&!el.open){el.showModal();el.querySelector<HTMLInputElement>('input:not([disabled])')?.focus();}else if(!draft&&el.open)el.close();},[draft!==null]);
 const [refused,setRefused]=useState(false);
 useEffect(()=>{if(disabled){setDraft(null);setResetAsked(false);setRefused(false);}},[disabled]);
 // Front R5: with Edit Mode live, SlewBox follows it (FormActivate 0x5a5985, EditModeBoxClick 0x5a6edc); without it, as before.
 const slew=draft?(onEditMode?limitSlewingBox(editDraft,draft.limitSlewing):Object.freeze({enabled:true,checked:draft.limitSlewing})):null;
 const editModeClick=(on:boolean)=>{setEditDraft(on);if(on)setDraft(d=>d&&{limitSlewing:false});};
 /** ResetBtnClick Yes: every live draft to its compiled value (0x5a21d0); OK still commits and Cancel still discards. */
 const reset=(yes:boolean)=>{setResetAsked(false);if(!yes)return;setDraft(OPTIONS_RESET_DEFAULTS.options);setEditDraft(OPTIONS_RESET_DEFAULTS.editMode);setVobsDraft(OPTIONS_RESET_DEFAULTS.virtualObservatory);if(sessionDraft)setSessionDraft(COMPILED_SESSION_OPTICAL_OPTIONS);};
 const live=sessionDraft&&onSessionOptions?sessionDraft:null;
 const ported=new Set<string>(live?SESSION_KEYS.map(k=>SC[k]):[]);
 return <>
  <button type="button" className="secondary-button" disabled={disabled} data-testid="ob-options" data-gate={gate} onClick={()=>{if(gate!=='options'){setRefused(true);return;}setDraft(onEditMode&&editMode?{limitSlewing:false}:options);setEditDraft(editMode);setVobsDraft(virtualObservatory);setSessionDraft(sessionOptions);}}>{M.open}</button>
  <dialog ref={ref} className="ob-dialog" aria-labelledby={`${id}-title`} data-testid="ob-options-dialog" onCancel={e=>{e.preventDefault();if(!resetAsked)setDraft(null);}}>
   {draft&&<>
    <h2 id={`${id}-title`} className="ob-native">{C.form}</h2>
    <p className="ob-note ob-native">{menuCaptionText(C.general)}</p>
    <fieldset className="ob-group"><legend className="ob-native">{menuCaptionText(C.options)}</legend>
     <label className="ob-check" title={C.limitSlewingHint}><input type="checkbox" data-testid="ob-options-limit" checked={slew!.checked} disabled={!slew!.enabled} onChange={e=>setDraft({limitSlewing:e.target.checked})}/>{C.limitSlewing}</label>
     <small className="ob-note">{C.limitSlewingHint}</small>{!slew!.enabled&&<small className="ob-note" data-testid="ob-options-limit-edit-mode">{M.limitSlewingEditMode}</small>}
     {onEditMode&&<><label className="ob-check" title={EDIT_MODE_CAPTIONS.hint}><input type="checkbox" data-testid="ob-options-edit-mode" checked={editDraft} onChange={e=>editModeClick(e.target.checked)}/>{FIELD_INFO_MESSAGES.editModeLabel}</label>
      <small className="ob-note">{EDIT_MODE_CAPTIONS.hint}</small><small className="ob-note" data-testid="ob-options-edit-mode-note">{FIELD_INFO_MESSAGES.editModeAdaptation}</small></>}
     {onVirtualObservatory&&<><label className="ob-check" title={VO.hint}><input type="checkbox" data-testid="ob-options-virtual-observatory" checked={vobsDraft} onChange={e=>setVobsDraft(e.target.checked)}/>{QSO_LIST_MESSAGES.virtualObservatoryLabel}</label>
      <small className="ob-note">{VO.hint}</small><small className="ob-note" data-testid="ob-options-virtual-observatory-note">{QSO_LIST_MESSAGES.virtualObservatoryAdaptation}</small></>}
     {live&&<>{SESSION_KEYS.map(k=><Fragment key={k}><label className="ob-check" title={SESSION_HINTS[k]}><input type="checkbox" data-testid={testId(k)} checked={live[k]} onChange={e=>setSessionDraft({...live,[k]:e.target.checked})}/>{SC[k]}</label>
      <small className="ob-note">{SESSION_HINTS[k]}</small>{SESSION_NOTES[k]&&<small className="ob-note">{SESSION_NOTES[k]}</small>}</Fragment>)}
      <small className="ob-note" data-testid="ob-options-session-note">{S.sessionNote}</small></>}
     <p className="ob-note">{M.othersHeading}</p>
     <ul className="ob-option-list" data-testid="ob-options-others">{C.otherOptions.filter(o=>!(onEditMode&&o===EDIT_MODE_CAPTIONS.box)&&!(onVirtualObservatory&&o===VO.box)&&!ported.has(o)).map(o=><li key={o}><span className="ob-native">{o}</span>{o==='Fast Slewing'?<small> — {M.fastSlewing}</small>:null}</li>)}</ul>
     {live&&<small className="ob-note" data-testid="ob-options-not-ported">{S.notPorted}</small>}
    </fieldset>
    {live?<section className="ob-group" data-testid="ob-options-tabs" aria-label={S.tabsHeading}><p className="ob-note">{S.tabsHeading}</p>
     {visibleOptionTabs(live.infraredCamera,horizonRadians).map(tab=><fieldset key={tab.tab} className="ob-group" data-testid={`ob-options-tab-${tab.tab}`}><legend className="ob-native">{menuCaptionText(tab.caption)}</legend>
      <dl className="ob-values">{tab.values.map(v=><div key={v.label}><dt className="ob-native">{v.label}</dt><dd>{v.text}</dd></div>)}</dl></fieldset>)}
     <small className="ob-note" data-testid="ob-options-tabs-note">{S.tabsNote}</small></section>
    :<><fieldset className="ob-group" disabled><legend className="ob-native">{menuCaptionText(C.parameters)}</legend>{C.parameterLabels.map(l=><span key={l} className="ob-check">{l} <small>— {M.unavailable}</small></span>)}</fieldset>
     <p className="ob-note">{C.otherTabs.map(menuCaptionText).join(', ')}: {M.unavailable}. {M.help}</p></>}
    <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-options-ok" onClick={()=>{onOptions(draft);if(onEditMode&&editDraft!==editMode)onEditMode(editDraft);if(onVirtualObservatory&&vobsDraft!==virtualObservatory)onVirtualObservatory(vobsDraft);if(live&&onSessionOptions&&SESSION_KEYS.some(k=>live[k]!==sessionOptions?.[k]))onSessionOptions(Object.freeze({...live}));setDraft(null);}}>{menuCaptionText(C.ok)}</button><button type="button" className="secondary-button" onClick={()=>setDraft(null)}>{menuCaptionText(C.cancel)}</button>
     <button type="button" className="secondary-button" title={R.hint} data-testid="ob-options-reset" onClick={()=>setResetAsked(true)}>{menuCaptionText(R.caption)}</button></div>
    <small className="ob-note" data-testid="ob-options-reset-note">{M.resetNote}</small>
    <p className="ob-note">{M.teacherDeferred}</p>
    <ul className="ob-option-list" data-testid="ob-options-teacher-deferred">{TEACHER_DEFERRED.map(d=><li key={d.key} data-reason={d.reason}><span className="ob-native">{menuCaptionText(d.caption)}</span></li>)}</ul>
    {resetAsked&&<QuestionBox caption={R.questionCaption} text={R.questionText} testId="ob-options-reset-box" onAnswer={reset}/>}
   </>}
  </dialog>
  {refused&&<UserOptionsBox onClose={()=>setRefused(false)}/>}
 </>;
}

/** Preferences1Click with the gate closed (0x5889a6..0x5889cb): the recovered body 0x588a84 (passed through 0x405ec8 and the
 * helper 0x486ae0 before the box, as in the radio port) with caption 0x588b70, OK only; one web line follows. */
function UserOptionsBox({onClose}:{onClose:()=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();el.querySelector<HTMLButtonElement>('button')?.focus();}},[]);
 return <dialog ref={ref} className="ob-dialog ob-box ob-user-options" role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} data-testid="ob-user-options" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-title`} className="ob-native" data-testid="ob-user-options-title">{UL.userOptionsCaption}</h2>
  <p id={`${id}-body`} className="ob-native" style={{whiteSpace:'pre-line',overflowWrap:'anywhere'}} data-testid="ob-user-options-text">{UL.instructorText}</p>
  <p className="ob-note" data-testid="ob-user-options-note">{t('instructorMode.optionsClosed')}</p>
  <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-user-options-ok" onClick={onClose}>{t('instructorMode.optionsClosedOk')}</button></div>
 </dialog>;
}
