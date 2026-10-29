import {useEffect,useId,useRef,useState} from 'react';
import contract from '../../data/photometry/cluster-comparison-contract.json';
import certificate from '../../data/clusters/cluster-dialog-certificate.json';
import {menuCaptionText} from '../core/radioControl';
import {HtlError,addHtlRow,newHtlEditor,serializeHtl,type HtlFields} from '../core/hotList';
import {addHtlRowRaOrdered} from '../core/hotListEntry';
import {keepHotList,setHotListEditor} from '../core/sharedHotList';
import {VARIABLE_FIELD_LITERALS as VL,variableAddedText,variableNewListText} from '../core/variableFieldList';
import {FIELD_STAR_LITERALS as FL,fieldStarCsvLines} from '../core/fieldStarReport';
import {variableStarSaveText} from '../core/variableStars';
import {fieldInfoReasonText} from '../observatory/FieldInfoMessages';
import {CLUSTER_DIALOG_LITERALS as L,CLUSTER_STUDY_LITERALS as SL,EMPTY_CLUSTER_RECORD,addClusterStudyRecord,clusterDataReport,clusterDialogActivate,clusterDialogValidate,clusterEntireListStem,clusterStudyList,clusterUseTelescope,
 type ClusterDataReport,type ClusterDialogField,type ClusterDialogRecord,type ClusterDialogState,type ClusterStudyRecord} from '../core/clusterDialog';
import {CLUSTER_DATASET_IDS,type ClusterDatasetId} from '../core/clusterComparison';
import {clusterBankOrder} from '../core/clusterHrSelect';
import type {ClusterReferencePoint} from '../core/clusterDatabase';
import {loadClusterDetail,type ClusterDetailIndex} from '../io/clusterDetail';
import {loadClusterDataset} from '../io/clusterComparison';
import type {Pointing} from '../core/sky';
import type {SharedHotListHandle} from '../useSharedHotList';
import FieldInfoListWindow,{MessageBox,downloadText,type FieldInfoBox} from '../observatory/FieldInfoListWindow';
import {HelpListBox} from '../clusters/CleaHelp';
import ClusterPrintPreview from '../clusters/ClusterPrintPreview';
import {ListPrintBody} from '../clusters/ClusterListWindow';
import PopupMenu,{usePopupMenu} from '../polish/PopupMenu';
import {CLUSTER_DATA_MESSAGES as M} from './ClusterDataMessages';
import {FIELD_INFO_MESSAGES as FM} from '../observatory/FieldInfoMessages';
import '../observatory/observatory-dialogs.css';
import '../observatory/field-info.css';
import '../clusters/cluster-hr.css';

/** The record 0x5bca0c and the list 0x53f live for the process: here, for the page session (module state). */
let sessionRecord:ClusterDialogRecord=EMPTY_CLUSTER_RECORD;
let sessionList:readonly ClusterStudyRecord[]|null=null,sessionSaved=true;
const ENTIRE_LITERALS=Object.freeze({caption:'New Hot List Created',head:'All stars from cluster ',tail:' placed in Hot List'});
type Certified=Readonly<{id:ClusterDatasetId;name:string}>;
/** The certified cluster whose dialog key equals the validated record exactly (centre and Diam; Front K census). */
function certifiedCluster(r:ClusterDialogRecord):Certified|null{
 const c=certificate.clusters.find(x=>x.equal&&x.keyRa===r.ra&&x.keyDec===r.dec&&Math.fround(x.keyDiam)===r.diam);
 return c&&(CLUSTER_DATASET_IDS as readonly string[]).includes(c.id)?{id:c.id as ClusterDatasetId,name:c.name}:null;
}
function studyRecords(detail:ClusterDetailIndex):readonly ClusterStudyRecord[]{
 return clusterBankOrder(contract.clusters.map(c=>Object.freeze({id:c.id,name:c.name,ra:c.catalogRa,dec:c.catalogDec,diam:c.angularLimitArcmin,ebv:c.catalogEbvSingle,comment:detail.comment(c.id)??''})),(a,b)=>a.ra>b.ra);
}
type Report=Readonly<{report:ClusterDataReport}|{loading:true}|{reason:string}>;

/** File › Cluster Data... (ClusterData1Click 0x58e650): TClstrDlgForm1 ShowModal; on OK the query 0x534254 and the report
 * 0x534680 with AL = 1 (Selection menu visible). The dialog's File button pops View/Select Cluster from List (TClstrListForm1)
 * and Add Cluster to List. */
export default function ClusterDataWindow({request,editMode,driveOn,pointing,hotList}:{request:number;editMode:boolean;driveOn:boolean;pointing:Pointing;hotList:SharedHotListHandle}){
 const [dialog,setDialog]=useState(false),[report,setReport]=useState<Report|null>(null),[box,setBox]=useState<FieldInfoBox|null>(null),[confirm,setConfirm]=useState<(()=>void)|null>(null);
 const latest=useRef({editMode,driveOn,pointing});latest.current={editMode,driveOn,pointing};
 useEffect(()=>{if(request>0)setDialog(true);},[request]);
 function ok(record:ClusterDialogRecord){
  setDialog(false);const c=certifiedCluster(record);
  if(!c){setReport({reason:M.unavailable});return;}
  setReport({loading:true});
  Promise.all([loadClusterDataset(c.id),loadClusterDetail()]).then(([d,detail])=>{
   try{setReport({report:clusterDataReport(record.name,record.type,record.sort,record.limit,d.points,detail.detail)});}catch{setReport({reason:M.loadError});}
  },()=>setReport({reason:M.loadError}));
 }
 // Report Selection items (Front O M12/M13/M15 on the listed bank: ID, RA, Dec, no remarks).
 const shown=report&&'report' in report&&!('unavailable' in report.report)?report.report:null;
 const fields=(p:ClusterReferencePoint,id:string):HtlFields=>({id:id.slice(0,24),remarks:'',ra:p.ra,dec:p.dec});
 const rowId=(i:number)=>shown?shown.lines[shown.first+i].slice(0,18).replace(/\s+$/,''):'';
 function addFields(f:HtlFields,fresh:boolean,name=''):boolean{
  if(hotList.current().read){setBox({caption:VL.confirmation,text:M.loadError});return false;}
  try{hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,fresh?addHtlRow(newHtlEditor(),f):addHtlRowRaOrdered(d.editor??newHtlEditor(),f),fresh?name:d.editor?d.name:''));return true;}
  catch(e){setBox({caption:VL.confirmation,text:e instanceof HtlError?e.message:M.loadError});return false;}
 }
 /** 0x592120: a modified current list asks `Current Hot List not Saved!` first (Yes saves it as a download [W]). */
 function startNew(then:()=>void){if(hotList.current().editor?.list.length){setConfirm(()=>then);return;}then();}
 function answer(save:boolean){const then=confirm;setConfirm(null);if(!then)return;const doc=hotList.current();if(save&&doc.editor)downloadText(serializeHtl(doc.editor.list),doc.name||'HotList.HTL');then();}
 return <>
  {dialog&&<ClusterDialog editMode={editMode} driveOn={driveOn} pointing={pointing} hotList={hotList} onOk={ok} onCancel={()=>setDialog(false)}/>}
  {report&&('report' in report&&'lines' in report.report?<FieldInfoListWindow testId="cluster-data" caption={report.report.caption} lines={report.report.lines} first={report.report.first} last={report.report.last}
    notice={<p className="fi-note">{M.reportNote}</p>}
    selectionItems={[
     {key:'add',label:FL.menu.add,onClick:i=>{const r=shown;if(!r)return;const id=rowId(i);if(addFields(fields(r.bank[i],id),false))setBox({caption:VL.confirmation,text:variableAddedText(id)});}},
     {key:'start',label:FL.menu.start,onClick:i=>{const r=shown;if(!r)return;const id=rowId(i);startNew(()=>{if(addFields(fields(r.bank[i],id),true))setBox({caption:VL.confirmation,text:variableNewListText(id)});});}},
     {key:'entire',label:FL.menu.entire,onClick:()=>{const r=shown;if(!r)return;startNew(()=>{const stem=clusterEntireListStem(r.stem);let e=newHtlEditor();
      try{r.bank.forEach((p,i)=>{e=addHtlRowRaOrdered(e,fields(p,rowId(i)));});hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,e,stem+'.HTL'));}catch(x){setBox({caption:VL.confirmation,text:x instanceof HtlError?x.message:M.loadError});return;}
      setBox({caption:ENTIRE_LITERALS.caption,text:ENTIRE_LITERALS.head+r.stem+ENTIRE_LITERALS.tail});});}},
    ]}
    saveName={`${report.report.stem}.TXT`} csv={{disabled:false,bytes:()=>{const r=report.report;const l='lines' in r?fieldStarCsvLines(r.lines):null;return l?{bytes:variableStarSaveText(l),name:`${r.stem}.CSV`}:{caption:FL.csvTitle,text:fieldInfoReasonText('csv-row-short')};}}}
    onClose={()=>setReport(null)} box={box} onBox={setBox}/>
   :<section className="card fi-window" data-testid="cluster-data-status"><h2 className="ob-native">{M.unavailableCaption}</h2>
    <p role="status" className={'loading' in report?'fi-note':'fi-unavailable'} data-testid="cluster-data-reason">{'loading' in report?M.loading:'reason' in report?report.reason:M.spectral}</p>
    <button type="button" className="secondary-button" onClick={()=>setReport(null)}>{menuCaptionText(SL.close)}</button></section>)}
  {confirm&&<UnsavedHotList onAnswer={answer}/>}
 </>;
}

/** TClstrDlgForm1 "Cluster Data Parameters" (modal; OK is the Default button, Escape is Cancel). */
function ClusterDialog({editMode,driveOn,pointing,hotList,onOk,onCancel}:{editMode:boolean;driveOn:boolean;pointing:Pointing;hotList:SharedHotListHandle;onOk:(r:ClusterDialogRecord)=>void;onCancel:()=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),nameRef=useRef<HTMLInputElement>(null),fileRef=useRef<HTMLButtonElement>(null);
 const activate=()=>{const a=clusterDialogActivate(sessionRecord,editMode,driveOn);sessionRecord=a.record;return a.state;};
 const [state,setState]=useState<ClusterDialogState>(activate),[error,setError]=useState(''),[menu,setMenu]=useState(false),[list,setList]=useState(false);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();nameRef.current?.focus();nameRef.current?.select();}},[]);
 const edit=(f:ClusterDialogField,v:string)=>setState(s=>({...s,fields:{...s.fields,[f]:v}}));
 const coordsReadOnly=state.useTelescope;
 function ok(){const r=clusterDialogValidate(sessionRecord,state);sessionRecord=r.record;if(r.status==='error'){setError(r.text);return;}onOk(r.record);}
 function addToList(){setMenu(false);const r=clusterDialogValidate(sessionRecord,state);sessionRecord=r.record;if(r.status==='error'){setError(r.text);return;}
  // 0x536734 creates the list form (loading the list) if it does not exist yet, then inserts the record.
  const record=r.record;
  if(sessionList){sessionList=addClusterStudyRecord(sessionList,record);sessionSaved=false;return;}
  loadClusterDetail().then(d=>{sessionList=addClusterStudyRecord(sessionList??studyRecords(d),record);sessionSaved=false;},()=>setError(M.loadError));}
 const D=L,F=state.fields,field=(f:ClusterDialogField,label:string,hint?:string,readOnly=false)=><label className="ob-field"><span className={f==='name'?'visually-hidden':'ob-native'}>{label}</span>
  <input data-testid={`cd-${f}`} value={F[f]} maxLength={D.maxLength[f==='diameter'?'diameter':f==='limit'?'limit':f]} title={hint} readOnly={readOnly} onChange={e=>edit(f,e.target.value)} ref={f==='name'?nameRef:undefined}/></label>;
 return <dialog ref={ref} className="ob-dialog ob-box cluster-data-dialog" aria-labelledby={`${id}-t`} data-testid="cd-dialog" onCancel={e=>{e.preventDefault();if(e.target!==e.currentTarget)return;if(menu){setMenu(false);return;}onCancel();}}>
  <h2 id={`${id}-t`} className="ob-native">{D.caption}</h2>
  <form method="dialog" onSubmit={e=>{e.preventDefault();ok();}}>
   <fieldset><legend className="ob-native">{D.nameGroup}</legend>{field('name',D.nameGroup)}</fieldset>
   <fieldset><legend className="ob-native">{D.center}</legend>
    <div className="ob-row">{field('raHours',D.raHours,D.hints.raHours,coordsReadOnly)}{field('raMinutes',D.raMinutes,D.hints.raMinutes,coordsReadOnly)}{field('raSeconds',D.raSeconds,D.hints.raSeconds,coordsReadOnly)}</div>
    <div className="ob-row">{field('decDegrees',D.decDegrees,D.hints.decDegrees,coordsReadOnly)}{field('decMinutes',D.decMinutes,D.hints.decMinutes,coordsReadOnly)}{field('decSeconds',D.decSeconds,D.hints.decSeconds,coordsReadOnly)}</div>
    <label className="ob-check"><input type="checkbox" data-testid="cd-use-telescope" checked={state.useTelescope} disabled={!state.useTelescopeEnabled} onChange={e=>setState(s=>clusterUseTelescope(s,e.target.checked,pointing))}/>{D.useTelescope}</label>
    {!state.useTelescopeEnabled&&<p className="fi-note">{M.useTelescopeOff}</p>}
   </fieldset>
   <div className="ob-row">{field('diameter',D.diameter)}{field('limit',D.limit)}</div>
   <fieldset disabled={!state.groupsEnabled} data-testid="cd-type"><legend className="ob-native">{D.type}</legend>
    {D.types.map((t,i)=><label key={t} className="ob-check"><input type="radio" name={`${id}-type`} checked={state.type===i} data-testid={`cd-type-${i}`} onChange={()=>setState(s=>({...s,type:i as 0|1}))}/>{menuCaptionText(t)}</label>)}</fieldset>
   <fieldset disabled={!state.groupsEnabled} data-testid="cd-sort"><legend className="ob-native">{D.sort}</legend>
    {D.sorts.map((t,i)=><label key={t} className="ob-check"><input type="radio" name={`${id}-sort`} checked={state.sort===i} data-testid={`cd-sort-${i}`} onChange={()=>setState(s=>({...s,sort:i as 0|1}))}/>{menuCaptionText(t)}</label>)}</fieldset>
   {!state.groupsEnabled&&<p className="fi-note">{M.groupsDisabled}</p>}
   <div className="ob-actions">
    <div className="fi-menu"><button type="button" ref={fileRef} className="secondary-button" aria-expanded={menu} data-testid="cd-file" onClick={()=>setMenu(m=>!m)}>{menuCaptionText(D.file)}</button>
     {menu&&<div role="group" aria-label={menuCaptionText(D.file)} className="fi-menu-list">
      <button type="button" data-testid="cd-view-select" onClick={()=>{setMenu(false);setList(true);}}>{menuCaptionText(D.viewSelect)}</button><hr/>
      <button type="button" data-testid="cd-add-to-list" onClick={addToList}>{menuCaptionText(D.addToList)}</button></div>}</div>
    <button type="button" className="secondary-button" data-testid="cd-cancel" onClick={onCancel}>{menuCaptionText(D.cancel)}</button>
    <button type="submit" className="primary-button" data-testid="cd-ok">{menuCaptionText(D.ok)}</button>
   </div>
   <p className="fi-note">{M.menuNote}</p>
  </form>
  {error&&<MessageBox box={{caption:D.errorCaption,text:error}} onClose={()=>{setError('');nameRef.current?.focus();}}/>}
  {list&&<StudyList editMode={editMode} hotList={hotList} onClose={()=>{setList(false);fileRef.current?.focus();}}
   onData={r=>{sessionRecord={...sessionRecord,name:r.name,ra:r.ra,dec:r.dec,diam:r.diam,ebv:r.ebv??sessionRecord.ebv};setList(false);setState(activate());}}/>}
 </dialog>;
}

/** TClstrListForm1 "Clusters for Study" (§5): left click/keys select a data row; right-click on a selected data row pops the
 * hot-list items; double-click/Enter or Get Selection Data copies the row into the dialog and closes the list. */
function StudyList({editMode,hotList,onClose,onData}:{editMode:boolean;hotList:SharedHotListHandle;onClose:()=>void;onData:(r:ClusterStudyRecord)=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),[records,setRecords]=useState<readonly ClusterStudyRecord[]|null>(sessionList);
 const [index,setIndex]=useState(-1),[menu,setMenu]=useState<'list'|'selection'|null>(null),[box,setBox]=useState<FieldInfoBox|null>(null),[printing,setPrinting]=useState(false),[unsaved,setUnsaved]=useState(false);
 const popup=usePopupMenu(),[confirm,setConfirm]=useState<(()=>void)|null>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open)el.showModal();},[]);
 useEffect(()=>{if(records)return;loadClusterDetail().then(d=>{sessionList??=studyRecords(d);setRecords(sessionList);},()=>setBox({caption:SL.caption,text:M.loadError}));},[records]);
 const list=records?clusterStudyList(records,editMode):null;
 const selection=list&&index>=list.first&&index<=list.last?index-list.first:-1;
 const close=()=>{if(!sessionSaved){setUnsaved(true);return;}onClose();};
 function hot(fresh:boolean){setMenu(null);if(!list||selection<0){setBox({caption:SL.caption,text:M.noSelection});return;}
  const r=list.records[selection],f:HtlFields={id:r.name.slice(0,24),remarks:r.comment.slice(0,40),ra:r.ra,dec:r.dec};
  const run=()=>{try{hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,fresh?addHtlRow(newHtlEditor(),f):addHtlRowRaOrdered(d.editor??newHtlEditor(),f),fresh?'':d.editor?d.name:''));}
   catch(e){setBox({caption:VL.confirmation,text:e instanceof HtlError?e.message:M.loadError});return;}setBox({caption:VL.confirmation,text:fresh?variableNewListText(f.id):variableAddedText(f.id)});};
  if(fresh&&hotList.current().editor?.list.length){setConfirm(()=>run);return;}
  run();}
 function answer(save:boolean){const then=confirm;setConfirm(null);if(!then)return;const doc=hotList.current();if(save&&doc.editor)downloadText(serializeHtl(doc.editor.list),doc.name||'HotList.HTL');then();}
 const data=()=>{setMenu(null);if(list&&selection>=0)onData(list.records[selection]);};
 return <dialog ref={ref} className="ob-dialog ob-wide cluster-list-window" aria-labelledby={`${id}-t`} data-testid="cd-study-list" onCancel={e=>{e.preventDefault();if(e.target!==e.currentTarget)return;if(menu){setMenu(null);return;}close();}}>
  <h2 id={`${id}-t`} className="ob-native">{SL.caption}</h2>
  <div className="cluster-hr-menubar">
   <div className="cluster-hr-menu"><button type="button" aria-expanded={menu==='list'} data-testid="cd-study-list-menu" onClick={()=>setMenu(menu==='list'?null:'list')}>{menuCaptionText(SL.list)}</button>
    {menu==='list'&&<div role="group" aria-label={menuCaptionText(SL.list)} className="cluster-hr-menu-list">
     <button type="button" data-testid="cd-study-print" disabled={!list} onClick={()=>{setMenu(null);setPrinting(true);}}>{menuCaptionText(SL.print)}</button><hr/>
     <button type="button" data-testid="cd-study-save" disabled={sessionSaved} onClick={()=>{setMenu(null);setBox({caption:SL.caption,text:M.saveListUnavailable});}}>{SL.saveList}</button><hr/>
     <button type="button" data-testid="cd-study-close" onClick={()=>{setMenu(null);close();}}>{menuCaptionText(SL.close)}</button>
    </div>}</div>
   <div className="cluster-hr-menu"><button type="button" aria-expanded={menu==='selection'} data-testid="cd-study-selection-menu" onClick={()=>setMenu(menu==='selection'?null:'selection')}>{menuCaptionText(SL.selection)}</button>
    {menu==='selection'&&<div role="group" aria-label={menuCaptionText(SL.selection)} className="cluster-hr-menu-list">
     <button type="button" data-testid="cd-study-data" disabled={selection<0} onClick={data}>{menuCaptionText(SL.getData)}</button><hr/>
     <button type="button" data-testid="cd-study-add" disabled={selection<0} onClick={()=>hot(false)}>{menuCaptionText(SL.add)}</button><hr/>
     <button type="button" data-testid="cd-study-start" disabled={selection<0} onClick={()=>hot(true)}>{menuCaptionText(SL.start)}</button>
    </div>}</div>
  </div>
  {list?<div onContextMenu={e=>{e.preventDefault();if(selection>=0)popup.open(e);}}>
    <HelpListBox rows={list.lines} selected={index} onSelect={setIndex} onActivate={i=>{if(list&&i>=list.first&&i<=list.last)onData(list.records[i-list.first]);}} label={SL.caption} testId="cd-study-lines" columns/></div>
   :<p role="status" className="fi-note">{M.loading}</p>}
  <PopupMenu at={popup.at} label={menuCaptionText(SL.selection)} onClose={popup.close} items={[{key:'cd-add',label:SL.add,onSelect:()=>hot(false)},{key:'cd-start',label:SL.start,onSelect:()=>hot(true)}]}/>
  <p className="fi-note">{M.listNote}</p>{editMode&&<p className="fi-note" data-testid="cd-study-edit-note">{M.editModeColumns}</p>}
  {box&&<MessageBox box={box} onClose={()=>setBox(null)}/>}
  {confirm&&<UnsavedHotList onAnswer={answer}/>}
  {unsaved&&<MessageBox box={{caption:SL.notSavedCaption,text:SL.notSavedText}} onClose={()=>{setUnsaved(false);onClose();}} actions={<>
   <button type="button" className="primary-button" data-testid="cd-unsaved-yes" onClick={()=>{setUnsaved(false);setBox({caption:SL.caption,text:M.saveListUnavailable});}}>{FM.yes}</button>
   <button type="button" className="secondary-button" data-testid="cd-unsaved-no" onClick={()=>{setUnsaved(false);sessionSaved=true;onClose();}}>{FM.no}</button></>}/>}
  {printing&&list&&<ClusterPrintPreview caption={SL.caption} note={M.printNote} onClose={()=>setPrinting(false)} testId="cd-study-print-preview"><ListPrintBody caption={SL.caption} lines={list.lines}/></ClusterPrintPreview>}
 </dialog>;
}

/** 0x592120's question before a new hot list replaces a modified one. */
function UnsavedHotList({onAnswer}:{onAnswer:(save:boolean)=>void}){
 return <MessageBox box={{caption:VL.unsavedCaption,text:VL.unsavedText}} onClose={()=>onAnswer(false)} actions={<>
  <button type="button" className="primary-button" data-testid="cd-hot-unsaved-yes" onClick={()=>onAnswer(true)}>{FM.yes}</button>
  <button type="button" className="secondary-button" data-testid="cd-hot-unsaved-no" onClick={()=>onAnswer(false)}>{FM.no}</button></>}/>;
}
