import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from '../core/radioControl';
import {EDIT_MODE_CAPTIONS} from '../core/editMode';
import {VARIABLE_STARS_MENU as VM,QSO_LIST_MENU,HST_ARCHIVE} from '../core/observatoryMenuLiterals';
import {FIELD_INFO_MESSAGES as M} from './FieldInfoMessages';
import {QSO_LIST_MESSAGES as Q} from './QsoListMessages';
import './field-info.css';
import PrintSkyImage from '../polish/PrintSkyImage';
import {PRINT_SKY_LITERALS} from '../polish/PolishMessages';
import type {Pointing} from '../core/sky';
/** TEnvironment1 ClusterData1 (DFM) [D]. */
const CLUSTER_DATA_MENU='&Cluster Data...';

export type FieldInfoRequestKind='stars'|'gcvs'|'modeled';
/** TEnvironment1 File and Tools items of the optical observatory (Front O, O2):
 * - File › Field Information › … (Edit Mode only);
 * - File › QSO List... only with Virtual Observatory on (VObsBox; VIREO shows the item after Run Exercise › Virtual Observatory
 *   (All Instruments), which that box enables; review 1 M1).
 * - File › Print Sky Image... (TObsrvtry PrintSkyImage1Click 0x53f934), always present as in VIREO, so File always shows
 *   (Front P): a web print of the sky view [W].
 * - Tools › HST Image Archive...: the archive page as an external link, opened in a new tab only on click (user decision of
 *   2026-10-28, AGENTS.md; docs/QSO-LIST-HST.md).
 * The windows live in their own lazy components; this menu only sends open requests. Disabled only while a project is busy. */
export default function ObservatoryFileMenu({editMode,qsoList,disabled,onFieldInfo,onQsoList,onClusterData,pointing,view}:{editMode:boolean;qsoList:boolean;disabled:boolean;onFieldInfo:(kind:FieldInfoRequestKind)=>void;onQsoList:()=>void;
 /** Front K: File › Cluster Data... (TEnvironment1 ClusterData1). */
 onClusterData?:()=>void;
 /** Front P: the current pointing and view for the Print Sky Image header. */
 pointing?:Pointing;view?:'finder'|'instrument'}){
 const id=useId(),[menu,setMenu]=useState<'file'|'field'|'variables'|'tools'|null>(null),[printSky,setPrintSky]=useState(false);
 const fileTrigger=useRef<HTMLButtonElement>(null),toolsTrigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!editMode)setMenu(m=>m==='field'||m==='variables'?'file':m);},[editMode]);
 useEffect(()=>{if(disabled){setMenu(null);setPrintSky(false);}},[disabled]);
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
    <button type="button" data-testid="print-sky-menu" onClick={()=>pick(()=>setPrintSky(true))}>{menuCaptionText(PRINT_SKY_LITERALS.menu)}</button>
    {/* TEnvironment1 File order: Print Sky Image, Cluster Data (ClusterData1 sits directly before QSOList1), QSO List. */}
    {onClusterData&&<button type="button" data-testid="cluster-data-menu" onClick={()=>pick(onClusterData)}>{menuCaptionText(CLUSTER_DATA_MENU)}</button>}
    {qsoList&&<button type="button" data-testid="qso-menu" onClick={()=>pick(onQsoList)}>{menuCaptionText(QSO_LIST_MENU)}</button>}
   </div>}
  </div>
  {printSky&&<PrintSkyImage pointing={pointing} view={view} onClose={()=>{setPrintSky(false);fileTrigger.current?.focus();}}/>}
  <div className="fi-menu" onKeyDown={e=>escape(e,toolsTrigger)}>
   <button type="button" ref={toolsTrigger} disabled={disabled} aria-expanded={menu==='tools'} aria-controls={`${id}-tools`} data-testid="ob-tools-menu" onClick={()=>setMenu(m=>m==='tools'?null:'tools')}>{menuCaptionText(HST_ARCHIVE.tools)}</button>
   {menu==='tools'&&<div id={`${id}-tools`} role="group" aria-label={menuCaptionText(HST_ARCHIVE.tools)} className="fi-menu-list">
    <a href={HST_ARCHIVE.webUrl} target="_blank" rel="noopener noreferrer" data-testid="hst-menu" className="fi-menu-link" onClick={()=>setMenu(null)}>{menuCaptionText(HST_ARCHIVE.menu)} <span aria-hidden="true">↗</span><span className="visually-hidden"> {Q.hst.newTab}</span></a>
    <p className="fi-note fi-menu-note" data-testid="hst-note">{Q.hst.note}</p>
   </div>}
  </div>
 </div>;
}

