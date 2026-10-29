import {useEffect,useRef,useState} from 'react';
import {HtlError,addHtlRow,newHtlEditor,serializeHtl} from '../core/hotList';
import {addHtlRowRaOrdered} from '../core/hotListEntry';
import {keepHotList,setHotListEditor} from '../core/sharedHotList';
import {decodeVariableStarCatalog,type VariableStarRecord} from '../core/variableStars';
import {VARIABLE_FIELD_LITERALS as VL,VARIABLE_FIELD_SAVE_NAME,variableAddedText,variableFieldList,variableHotListFields,variableNewListText,type VariableFieldList,type VariableFieldMode,type VariableFieldView} from '../core/variableFieldList';
import {BUNDLED_VARIABLE_STARS,fetchBundledVariableFile} from '../io/bundledVariableStars';
import type {Pointing} from '../core/sky';
import type {SharedHotListHandle} from '../useSharedHotList';
import FieldInfoListWindow,{MessageBox,downloadText,type FieldInfoBox} from './FieldInfoListWindow';
import {FIELD_INFO_MESSAGES as M,fieldInfoReasonText,type FieldInfoReason} from './FieldInfoMessages';
import {objectXListedNear,objectXMasked} from '../io/objectXMask';
import {freshFieldArea,frozenObservatoryTime} from '../core/fieldEngine';
import {catalogRecords} from '../core/catalogObject';
import {FIELD_STAR_LITERALS as FL,FIELD_STAR_SAVE_NAMES,fieldStarCsvLines,fieldStarReport,type FieldStarReport} from '../core/fieldStarReport';
import {variableStarSaveText} from '../core/variableStars';
import {findCertifiedPopulation} from '../io/fieldInfoPacks';
import type {FieldInfoRequestKind} from './ObservatoryFileMenu';
import './field-info.css';

let variableCatalog:Promise<readonly VariableStarRecord[]>|null=null;
/** CLEA_VStrs.dat, size and SHA-256 checked by the Front V adapter; a failure is not cached. */
export function loadFieldVariables():Promise<readonly VariableStarRecord[]>{
 if(!variableCatalog){variableCatalog=fetchBundledVariableFile(fetch,new AbortController().signal,BUNDLED_VARIABLE_STARS).then(decodeVariableStarCatalog);variableCatalog.catch(()=>{variableCatalog=null;});}
 return variableCatalog;
}

export type FieldInfoRequest=Readonly<{kind:FieldInfoRequestKind;token:number}>;
export type FieldInformationProps=Readonly<{
 editMode:boolean;
 /** Front K: dome open and tracking on (TObsrvtry +0x649/+0x64b, [I] panel active and drive on). */
 driveOn?:boolean;
 /** Front O2 review 1 L1: the File and Tools menus are disabled only while a project is read or written (VIREO's main menu
  * does not depend on the dome or on motion). */
 busy?:boolean;
 /** Telescope view slider: finder or instrument (telescope). */
 view:VariableFieldView;
 /** Opens the Variable stars page on a CLEA_VStrs.dat record index (Get Selection Data). */
 onOpenVariable:(index:number,riseWordDefaulted?:boolean)=>void;
 /** Front T: the observatory clock; the Star Data List freezes its JD when the field is built. */
 currentJd?:()=>number;
 /** An unrevealed Object X target (E08): both lists are masked near it. */
 hidden?:Pointing|null;
}>;
type StarWindow=Readonly<{report:FieldStarReport}|{loading:true}|{reason:FieldInfoReason;detail?:string}>;
type VariableWindow=Readonly<{mode:VariableFieldMode;list:VariableFieldList}|{mode:VariableFieldMode;loading:true}|{mode:VariableFieldMode;error:true}|{mode:VariableFieldMode;hidden:true}>;

/** File › Field Information windows (FO-EM, FO-VF; docs/OBJECT-INFO-FORMS.md). Shown only in Edit Mode; turning Edit Mode off
 * closes the windows. The menu items live in ObservatoryFileMenu (Front O2), which sends `request` (a new token per click). The
 * windows are modeless and keep their lines until reopened from the menu (every Show refills, 0x52e464). */
export default function FieldInformationMenu({info,pointing,enabled,hotList,onSlew,request}:{info:FieldInformationProps;pointing:Pointing;enabled:boolean;hotList:SharedHotListHandle;onSlew:(p:Pointing)=>void;request:FieldInfoRequest|null}){
 const [variable,setVariable]=useState<VariableWindow|null>(null),[star,setStar]=useState<StarWindow|null>(null),[box,setBox]=useState<FieldInfoBox|null>(null),[starBox,setStarBox]=useState<FieldInfoBox|null>(null);
 const [confirm,setConfirm]=useState<VariableStarRecord|null>(null);
 const handled=useRef(0);
 useEffect(()=>{if(!info.editMode){setVariable(null);setStar(null);setBox(null);setConfirm(null);}},[info.editMode]);
 useEffect(()=>{
  if(!request||request.token===handled.current||!info.editMode)return;handled.current=request.token;
  if(request.kind==='stars')openStars();else openVariables(request.kind);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[request,info.editMode]);
 if(!info.editMode)return null;
 /** StarList1Click 0x5404e0 → 0x534e18: the instrument (NewGSC) field at the current pointing, in either view. */
 function openStars(){
  setStarBox(null);const at=pointing,variableTime=frozenObservatoryTime(info.currentJd);
  setStar({loading:true});
  objectXMasked(info.hidden??null,at).then(async masked=>{
   if(masked){setStar({reason:'object-x-hidden'});return;}
   const r=await findCertifiedPopulation(at,variableTime);
   if(r.status!=='ready'){setStar('detail' in r?{reason:r.reason,detail:r.detail}:{reason:r.reason});return;}
   setStar({report:fieldStarReport(freshFieldArea(at),at,catalogRecords(r.population).stars)});
  }).catch(()=>setStar({reason:'load-error'}));
 }
 function openVariables(mode:VariableFieldMode){
  setBox(null);const at=pointing,view=info.view;
  setVariable({mode,loading:true});
  loadFieldVariables().then(async records=>{
   const list=variableFieldList(records,at,view,'gcvs');
   if(await objectXListedNear(info.hidden??null,list.records.map(r=>({ra:r.raHours,dec:r.decDegrees})))){setVariable(v=>v&&v.mode===mode?{mode,hidden:true}:v);return;}
   setVariable(v=>v&&v.mode===mode?{mode,list:mode==='gcvs'?list:variableFieldList(records,at,view,mode)}:v);
  }).catch(()=>setVariable(v=>v&&v.mode===mode?{mode,error:true}:v));
 }
 const record=(selection:number)=>variable&&'list' in variable?variable.list.records[selection]??null:null;
 function add(selection:number){
  const r=record(selection);if(!r)return;
  if(hotList.current().read){setBox({caption:VL.confirmation,text:M.busy});return;}
  try{hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,addHtlRowRaOrdered(d.editor??newHtlEditor(),variableHotListFields(r)),d.editor?d.name:''));}
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
 const SM=VL.selectionMenu;
 const reason=variable&&'list' in variable?variable.list.reason:null;
 return <div className="fi-area" data-testid="fi-area">
  <div className="fi-file-menu">
   <p className="fi-note">{M.menuHelp}</p>
   <details className="fi-guide" data-testid="fi-guide"><summary>{M.guideTitle}</summary><ol>{M.guide.map(g=><li key={g}>{g}</li>)}</ol></details>
  </div>
  {star&&('report' in star?<FieldInfoListWindow testId="fi-slist" caption={star.report.caption} lines={star.report.lines} first={star.report.first} last={star.report.last}
    notice={<>{star.report.reason&&<p className="fi-unavailable" role="status" data-testid="fi-slist-reason" data-reason={star.report.reason}>{fieldInfoReasonText(star.report.reason)}</p>}<p className="fi-note">{M.modelessNote} {M.printAdaptation} {M.saveAdaptation}</p></>}
    selectionItems={[
     {key:'add',label:FL.menu.add,onClick:()=>{},unavailable:fieldInfoReasonText('starlist-hotlist-cluster-bank')},
     {key:'start',label:FL.menu.start,onClick:()=>{},unavailable:fieldInfoReasonText('starlist-hotlist-cluster-bank')},
     {key:'entire',label:FL.menu.entire,onClick:()=>{},unavailable:fieldInfoReasonText('starlist-hotlist-cluster-bank')},
    ]}
    saveName={FIELD_STAR_SAVE_NAMES.text}
    csv={{disabled:false,bytes:()=>{const l=fieldStarCsvLines(star.report.lines);return l?{bytes:variableStarSaveText(l),name:FIELD_STAR_SAVE_NAMES.csv}:{caption:FL.csvTitle,text:fieldInfoReasonText('csv-row-short')};}}}
    onClose={()=>setStar(null)} box={starBox} onBox={setStarBox}/>
   :<section className="card fi-window" data-testid="fi-slist-status"><h2 className="ob-native">{FL.caption}</h2><p role="status" className={'loading' in star?'fi-note':'fi-unavailable'} data-reason={'reason' in star?star.reason:'loading'}>{'reason' in star?fieldInfoReasonText(star.reason,star.detail):fieldInfoReasonText('loading')}</p>
    <button type="button" className="secondary-button" onClick={()=>setStar(null)}>{M.close}</button></section>)}
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
   :<section className="card fi-window" data-testid="fi-vlist-status"><p role="status" className={'loading' in variable?'fi-note':'fi-unavailable'} data-reason={'hidden' in variable?'object-x-hidden':'error' in variable?'load-error':'loading'}>{fieldInfoReasonText('hidden' in variable?'object-x-hidden':'error' in variable?'load-error':'loading')}</p>
    <button type="button" className="secondary-button" onClick={()=>setVariable(null)}>{M.close}</button></section>)}
  {confirm&&<MessageBox box={{caption:VL.unsavedCaption,text:VL.unsavedText}} onClose={()=>setConfirm(null)} actions={<>
   <button type="button" className="primary-button" data-testid="fi-unsaved-yes" onClick={()=>startNew(confirm,true)}>{M.yes}</button>
   <button type="button" className="secondary-button" data-testid="fi-unsaved-no" onClick={()=>startNew(confirm,false)}>{M.no}</button></>}/>}
  {confirm&&<p className="fi-note">{M.startNewAdaptation}</p>}
 </div>;
}
