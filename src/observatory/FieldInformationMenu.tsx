import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {menuCaptionText} from '../core/radioControl';
import {HtlError,addHtlRow,newHtlEditor,serializeHtl} from '../core/hotList';
import {keepHotList,setHotListEditor} from '../core/sharedHotList';
import {decodeVariableStarCatalog,type VariableStarRecord} from '../core/variableStars';
import {VARIABLE_FIELD_LITERALS as VL,VARIABLE_FIELD_SAVE_NAME,variableAddedText,variableFieldList,variableHotListFields,variableNewListText,type VariableFieldList,type VariableFieldMode,type VariableFieldView} from '../core/variableFieldList';
import {EDIT_MODE_CAPTIONS} from '../core/editMode';
import {BUNDLED_VARIABLE_STARS,fetchBundledVariableFile} from '../io/bundledVariableStars';
import type {Pointing} from '../core/sky';
import type {SharedHotListHandle} from '../useSharedHotList';
import FieldInfoListWindow,{MessageBox,downloadText,type FieldInfoBox} from './FieldInfoListWindow';
import {FIELD_INFO_MESSAGES as M,fieldInfoReasonText,type FieldInfoReason} from './FieldInfoMessages';
import './field-info.css';

let variableCatalog:Promise<readonly VariableStarRecord[]>|null=null;
/** CLEA_VStrs.dat, size and SHA-256 checked by the Front V adapter; a failure is not cached. */
export function loadFieldVariables():Promise<readonly VariableStarRecord[]>{
 if(!variableCatalog){variableCatalog=fetchBundledVariableFile(fetch,new AbortController().signal,BUNDLED_VARIABLE_STARS).then(decodeVariableStarCatalog);variableCatalog.catch(()=>{variableCatalog=null;});}
 return variableCatalog;
}

export type FieldInformationProps=Readonly<{
 editMode:boolean;
 /** Telescope view slider: finder or instrument (telescope). */
 view:VariableFieldView;
 /** Opens the Variable stars page on a CLEA_VStrs.dat record index (Get Selection Data). */
 onOpenVariable:(index:number)=>void;
 /** The Star Data List window (certified fields), rendered by the host. */
 starList?:(close:()=>void)=>ReactNode;
}>;
type VariableWindow=Readonly<{mode:VariableFieldMode;list:VariableFieldList}|{mode:VariableFieldMode;loading:true}|{mode:VariableFieldMode;error:true}>;

/** File › Field Information (FO-EM, FO-VF; docs/OBJECT-INFO-FORMS.md). Shown only in Edit Mode; turning Edit Mode off closes the
 * windows. The windows are modeless and keep their lines until reopened from the menu (every Show refills, 0x52e464). */
export default function FieldInformationMenu({info,pointing,enabled,hotList,onSlew}:{info:FieldInformationProps;pointing:Pointing;enabled:boolean;hotList:SharedHotListHandle;onSlew:(p:Pointing)=>void}){
 const id=useId(),[menu,setMenu]=useState<'file'|'field'|'variables'|null>(null),trigger=useRef<HTMLButtonElement>(null);
 const [variable,setVariable]=useState<VariableWindow|null>(null),[star,setStar]=useState(false),[box,setBox]=useState<FieldInfoBox|null>(null);
 const [confirm,setConfirm]=useState<VariableStarRecord|null>(null);
 useEffect(()=>{if(!info.editMode){setMenu(null);setVariable(null);setStar(false);setBox(null);setConfirm(null);}},[info.editMode]);
 if(!info.editMode)return null;
 function openVariables(mode:VariableFieldMode){
  setMenu(null);setBox(null);const at=pointing,view=info.view;
  setVariable({mode,loading:true});
  loadFieldVariables().then(records=>setVariable(v=>v&&v.mode===mode?{mode,list:variableFieldList(records,at,view,mode)}:v)).catch(()=>setVariable(v=>v&&v.mode===mode?{mode,error:true}:v));
 }
 const record=(selection:number)=>variable&&'list' in variable?variable.list.records[selection]??null:null;
 function add(selection:number){
  const r=record(selection);if(!r)return;
  if(hotList.current().read){setBox({caption:VL.confirmation,text:M.busy});return;}
  try{hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,addHtlRow(d.editor??newHtlEditor(),variableHotListFields(r)),d.editor?d.name:''));}
  catch(e){setBox({caption:VL.confirmation,text:e instanceof HtlError?e.message:M.busy});return;}
  setBox({caption:VL.confirmation,text:variableAddedText(r.name)});
 }
 function startNew(r:VariableStarRecord,saveFirst:boolean){
  setConfirm(null);
  const doc=hotList.current();
  if(doc.read){setBox({caption:VL.confirmation,text:M.busy});return;}
  if(saveFirst&&doc.editor)downloadText(serializeHtl(doc.editor.list),doc.name||'HotList.HTL');
  try{hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,addHtlRow(newHtlEditor(),variableHotListFields(r)),''));}
  catch(e){setBox({caption:VL.confirmation,text:e instanceof HtlError?e.message:M.busy});return;}
  setBox({caption:VL.confirmation,text:variableNewListText(r.name)});
 }
 function start(selection:number){
  const r=record(selection);if(!r)return;
  // 0x592120: the original asks only when the list is marked modified; the shared web list has no modified flag, so the
  // prompt is shown whenever the current list has rows [W].
  if(hotList.current().editor?.list.length)setConfirm(r);else startNew(r,false);
 }
 const slew=(selection:number)=>{const r=record(selection);if(r&&enabled)onSlew({ra:r.raHours,dec:r.decDegrees});};
 const SM=VL.selectionMenu,menuId=`${id}-file`;
 const reason=variable&&'list' in variable?variable.list.reason:null;
 return <div className="fi-area" data-testid="fi-area">
  <div className="fi-file-menu">
   <div className="fi-menu" onKeyDown={e=>{if(e.key==='Escape'&&menu){e.stopPropagation();setMenu(null);trigger.current?.focus();}}}>
    <button type="button" ref={trigger} aria-expanded={menu!==null} aria-controls={menuId} data-testid="fi-file-menu" onClick={()=>setMenu(m=>m?null:'file')}>{M.fileMenu}</button>
    {menu&&<div id={menuId} role="group" aria-label={M.fileMenu} className="fi-menu-list">
     <button type="button" aria-expanded={menu==='field'||menu==='variables'} data-testid="fi-field-information" onClick={()=>setMenu(m=>m==='file'?'field':'file')}>{menuCaptionText(EDIT_MODE_CAPTIONS.fieldInformation)} ›</button>
     {(menu==='field'||menu==='variables')&&<div role="group" aria-label={menuCaptionText(EDIT_MODE_CAPTIONS.fieldInformation)} className="fi-submenu">
      <button type="button" data-testid="fi-star-list" onClick={()=>{setMenu(null);setStar(true);}}>{menuCaptionText(EDIT_MODE_CAPTIONS.starList)}</button>
      <button type="button" aria-expanded={menu==='variables'} data-testid="fi-variable-stars" onClick={()=>setMenu(m=>m==='variables'?'field':'variables')}>{menuCaptionText(VL.menu.variableStars)} ›</button>
      {menu==='variables'&&<div role="group" aria-label={menuCaptionText(VL.menu.variableStars)} className="fi-submenu">
       <button type="button" data-testid="fi-variables-gcvs" onClick={()=>openVariables('gcvs')}>{menuCaptionText(VL.menu.gcvs)}</button>
       <button type="button" data-testid="fi-variables-modeled" onClick={()=>openVariables('modeled')}>{menuCaptionText(VL.menu.modeled)}</button>
      </div>}
     </div>}
    </div>}
   </div>
   <p className="fi-note">{M.menuHelp}</p>
  </div>
  {star&&info.starList?.(()=>setStar(false))}
  {variable&&('list' in variable?<FieldInfoListWindow testId="fi-vlist" caption={variable.list.caption} lines={variable.list.lines} first={variable.list.first} last={variable.list.last}
    notice={<>{reason&&<p className="fi-unavailable" role="status" data-testid="fi-vlist-reason" data-reason={reason}>{fieldInfoReasonText(reason as FieldInfoReason)}</p>}<p className="fi-note">{M.modelessNote} {M.printAdaptation} {M.saveAdaptation}</p></>}
    selectionItems={[
     {key:'data',label:SM.data,onClick:s=>{const r=record(s);if(r)info.onOpenVariable(r.index);}},
     {key:'slew',label:SM.slew,onClick:slew,unavailable:enabled?null:M.slewBusy},
     {key:'add',label:SM.add,onClick:add},
     {key:'start',label:SM.start,onClick:start},
    ]}
    onActivate={slew} saveName={VARIABLE_FIELD_SAVE_NAME}
    csv={{disabled:true,unavailable:{caption:VL.csvCaption,text:VL.csvText}}}
    onClose={()=>setVariable(null)} box={box} onBox={setBox}/>
   :<section className="card fi-window" data-testid="fi-vlist-loading"><p role="status" className={'error' in variable?'fi-unavailable':'fi-note'}>{fieldInfoReasonText('error' in variable?'load-error':'loading')}</p></section>)}
  {confirm&&<MessageBox box={{caption:VL.unsavedCaption,text:VL.unsavedText}} onClose={()=>setConfirm(null)} actions={<>
   <button type="button" className="primary-button" data-testid="fi-unsaved-yes" onClick={()=>startNew(confirm,true)}>{M.yes}</button>
   <button type="button" className="secondary-button" data-testid="fi-unsaved-no" onClick={()=>startNew(confirm,false)}>{M.no}</button></>}/>}
  {confirm&&<p className="fi-note">{M.startNewAdaptation}</p>}
 </div>;
}
