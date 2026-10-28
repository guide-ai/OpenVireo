import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from '../core/radioControl';
import {EDIT_MODE_CAPTIONS} from '../core/editMode';
import {VARIABLE_STARS_MENU as VM,QSO_LIST_MENU,HST_ARCHIVE} from '../core/observatoryMenuLiterals';
import {FIELD_INFO_MESSAGES as M} from './FieldInfoMessages';
import {QSO_LIST_MESSAGES as Q} from './QsoListMessages';
import './observatory-dialogs.css';
import './field-info.css';

export type FieldInfoRequestKind='stars'|'gcvs'|'modeled';
/** TEnvironment1 File and Tools items of the optical observatory (Front O, O2): File › QSO List... (always, as in VIREO's
 * all-instruments observatory), File › Field Information › … (Edit Mode only) and Tools › HST Image Archive... (typed
 * unavailable: an external site). The windows live in their own lazy components; this menu only sends open requests. */
export default function ObservatoryFileMenu({editMode,disabled,onFieldInfo,onQsoList}:{editMode:boolean;disabled:boolean;onFieldInfo:(kind:FieldInfoRequestKind)=>void;onQsoList:()=>void}){
 const id=useId(),[menu,setMenu]=useState<'file'|'field'|'variables'|'tools'|null>(null),[hst,setHst]=useState(false);
 const fileTrigger=useRef<HTMLButtonElement>(null),toolsTrigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!editMode)setMenu(m=>m==='field'||m==='variables'?null:m);},[editMode]);
 useEffect(()=>{if(disabled)setMenu(null);},[disabled]);
 const escape=(e:React.KeyboardEvent,trigger:React.RefObject<HTMLButtonElement|null>)=>{if(e.key==='Escape'&&menu){e.stopPropagation();setMenu(null);trigger.current?.focus();}};
 const pick=(f:()=>void)=>{setMenu(null);f();};
 const fileOpen=menu==='file'||menu==='field'||menu==='variables';
 return <div className="fi-menubar ob-file-menu" data-testid="ob-file-menubar">
  <div className="fi-menu" onKeyDown={e=>escape(e,fileTrigger)}>
   <button type="button" ref={fileTrigger} disabled={disabled} aria-expanded={fileOpen} aria-controls={`${id}-file`} data-testid="fi-file-menu" onClick={()=>setMenu(m=>m==='file'||m==='field'||m==='variables'?null:'file')}>{M.fileMenu}</button>
   {fileOpen&&<div id={`${id}-file`} role="group" aria-label={M.fileMenu} className="fi-menu-list">
    {editMode&&<><button type="button" aria-expanded={menu==='field'||menu==='variables'} data-testid="fi-field-information" onClick={()=>setMenu(m=>m==='file'?'field':'file')}>{menuCaptionText(EDIT_MODE_CAPTIONS.fieldInformation)} ›</button>
     {(menu==='field'||menu==='variables')&&<div role="group" aria-label={menuCaptionText(EDIT_MODE_CAPTIONS.fieldInformation)} className="fi-submenu">
      <button type="button" data-testid="fi-star-list" onClick={()=>pick(()=>onFieldInfo('stars'))}>{menuCaptionText(EDIT_MODE_CAPTIONS.starList)}</button>
      <button type="button" aria-expanded={menu==='variables'} data-testid="fi-variable-stars" onClick={()=>setMenu(m=>m==='variables'?'field':'variables')}>{menuCaptionText(VM.variableStars)} ›</button>
      {menu==='variables'&&<div role="group" aria-label={menuCaptionText(VM.variableStars)} className="fi-submenu">
       <button type="button" data-testid="fi-variables-gcvs" onClick={()=>pick(()=>onFieldInfo('gcvs'))}>{menuCaptionText(VM.gcvs)}</button>
       <button type="button" data-testid="fi-variables-modeled" onClick={()=>pick(()=>onFieldInfo('modeled'))}>{menuCaptionText(VM.modeled)}</button>
      </div>}
     </div>}</>}
    <button type="button" data-testid="qso-menu" onClick={()=>pick(onQsoList)}>{menuCaptionText(QSO_LIST_MENU)}</button>
   </div>}
  </div>
  <div className="fi-menu" onKeyDown={e=>escape(e,toolsTrigger)}>
   <button type="button" ref={toolsTrigger} disabled={disabled} aria-expanded={menu==='tools'} aria-controls={`${id}-tools`} data-testid="ob-tools-menu" onClick={()=>setMenu(m=>m==='tools'?null:'tools')}>{menuCaptionText(HST_ARCHIVE.tools)}</button>
   {menu==='tools'&&<div id={`${id}-tools`} role="group" aria-label={menuCaptionText(HST_ARCHIVE.tools)} className="fi-menu-list">
    <button type="button" data-testid="hst-menu" onClick={()=>pick(()=>setHst(true))}>{menuCaptionText(HST_ARCHIVE.menu)}</button>
   </div>}
  </div>
  {hst&&<HstBox onClose={()=>{setHst(false);requestAnimationFrame(()=>toolsTrigger.current?.focus());}}/>}
 </div>;
}

/** Tools › HST Image Archive... [W]: a typed reason instead of WebBrowser1.Navigate; no link and no request. */
function HstBox({onClose}:{onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();el.querySelector<HTMLButtonElement>('button')?.focus();}},[]);
 return <dialog ref={ref} className="ob-dialog ob-box" role="alertdialog" aria-label={Q.hst.caption} data-testid="hst-box" data-reason="external-site-not-approved" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2>{Q.hst.caption}</h2><p className="fi-box-text" data-testid="hst-reason">{Q.hst.reason}</p>
  <div className="ob-actions"><button type="button" className="primary-button" onClick={onClose}>{M.ok}</button></div>
 </dialog>;
}
