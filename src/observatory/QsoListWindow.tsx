import {useEffect,useId,useRef,useState} from 'react';
import {menuCaptionText} from '../core/radioControl';
import {HtlError,addHtlRow,newHtlEditor,serializeHtl} from '../core/hotList';
import {keepHotList,setHotListEditor} from '../core/sharedHotList';
import {QSO_LIST_INITIAL_OPTIONS,QSO_LIST_LITERALS as QL,QSO_LIST_SAVE_NAME,buildQsoList,decodeQsoCatalog,parseQsoMagnitudeLimit,qsoHotListFields,qsoOptionsActivate,type QsoList,type QsoListOptions,type QsoSort} from '../core/qsoList';
import type {NativeQso} from '../core/qsoMerge';
import {VARIABLE_FIELD_LITERALS as VL,variableAddedText,variableNewListText} from '../core/variableFieldList';
import {FIELD_STAR_LITERALS as FL} from '../core/fieldStarReport';
import {BUNDLED_QSO_CATALOG,BundledQsoCatalogError,fetchBundledQsoCatalog} from '../io/bundledQsoCatalog';
import {loadObjectXPositions,objectXOnTarget} from '../io/objectXMask';
import type {Pointing} from '../core/sky';
import type {SharedHotListHandle} from '../useSharedHotList';
import FieldInfoListWindow,{MessageBox,downloadText,type FieldInfoBox} from './FieldInfoListWindow';
import {FIELD_INFO_MESSAGES as M} from './FieldInfoMessages';
import {QSO_LIST_MESSAGES as Q} from './QsoListMessages';
import './observatory-dialogs.css';
import './field-info.css';

/** The dialog's globals 0x5bce38/0x5bce3c live for the process: here, for the page session (module state). */
let sessionOptions:QsoListOptions=QSO_LIST_INITIAL_OPTIONS;
let catalog:Promise<readonly NativeQso[]>|null=null;
/** CLEA_QSO.DAT, size and SHA-256 checked by the bundled adapter; a failure is not cached. */
function loadQsoCatalog(){
 if(!catalog){catalog=fetchBundledQsoCatalog(fetch,new AbortController().signal).then(c=>decodeQsoCatalog(c.bytes));catalog.catch(()=>{catalog=null;});}
 return catalog;
}
type Shown=Readonly<{list:QsoList;editMode:boolean}|{loading:true}|{reason:'object-x'}>;

/** File › QSO List... (QSOList1Click 0x58e600): TQSOListDlg modal, then on OK the builder 0x5776f0 fills the modeless
 * TQSORptForm1 (one window, refilled on every OK). Without Edit Mode the list shows Name, RA, Dec and V only. Rows within 0.25°
 * of an Object X target are withheld [W]. */
export default function QsoListWindow({request,editMode,hotList,hidden}:{request:number;editMode:boolean;hotList:SharedHotListHandle;hidden:Pointing|null}){
 const [dialog,setDialog]=useState(false),[shown,setShown]=useState<Shown|null>(null),[box,setBox]=useState<FieldInfoBox|null>(null),[fileBox,setFileBox]=useState<FieldInfoBox|null>(null);
 const [confirm,setConfirm]=useState<NativeQso|null>(null);
 const latest=useRef({editMode,hidden});latest.current={editMode,hidden};
 useEffect(()=>{if(request>0)setDialog(true);},[request]);
 function build(options:QsoListOptions){
  sessionOptions=options;setDialog(false);const {editMode:edit,hidden:target}=latest.current;
  setShown(s=>s&&'list' in s?s:{loading:true});
  Promise.all([loadQsoCatalog(),loadObjectXPositions().then(l=>({ok:true as const,l}),()=>({ok:false as const}))]).then(([records,positions])=>{
   if(!positions.ok){setShown({reason:'object-x'});return;}
   const near=objectXOnTarget(positions.l,target);
   setBox(null);setShown({list:buildQsoList(records,options,edit,q=>near({ra:q.ra,dec:q.dec})),editMode:edit});
  }).catch(e=>{
   setShown(s=>s&&'list' in s?s:null);
   const code=e instanceof BundledQsoCatalogError?e.code:'download';
   setFileBox({caption:QL.fileErrorCaption,text:QL.fileErrorHead+BUNDLED_QSO_CATALOG.name+'\r\n'+Q.fileError(Q.fileReasons[code])});
  });
 }
 const list=shown&&'list' in shown?shown.list:null;
 const row=(selection:number)=>list?.rows[selection]??null;
 function add(selection:number){
  const r=row(selection);if(!r)return;
  if(hotList.current().read){setBox({caption:VL.confirmation,text:M.busy});return;}
  const f=qsoHotListFields(r);
  try{hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,addHtlRow(d.editor??newHtlEditor(),f),d.editor?d.name:''));}
  catch(e){setBox({caption:VL.confirmation,text:e instanceof HtlError?e.message:M.busy});return;}
  setBox({caption:VL.confirmation,text:variableAddedText(f.id)});
 }
 function startNew(r:NativeQso,saveFirst:boolean){
  setConfirm(null);const doc=hotList.current(),f=qsoHotListFields(r);
  if(doc.read){setBox({caption:VL.confirmation,text:M.busy});return;}
  if(saveFirst&&doc.editor)downloadText(serializeHtl(doc.editor.list),doc.name||'HotList.HTL');
  try{hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,addHtlRow(newHtlEditor(),f),''));}
  catch(e){setBox({caption:VL.confirmation,text:e instanceof HtlError?e.message:M.busy});return;}
  setBox({caption:VL.confirmation,text:variableNewListText(f.id)});
 }
 function start(selection:number){const r=row(selection);if(!r)return;if(hotList.current().editor?.list.length)setConfirm(r);else startNew(r,false);}
 return <>
  {dialog&&<QsoOptionsDialog editMode={editMode} onOk={build} onCancel={()=>setDialog(false)}/>}
  {shown&&('list' in shown?<FieldInfoListWindow testId="qso-list" caption={shown.list.caption} lines={shown.list.lines} first={shown.list.first} last={shown.list.last}
    notice={<><p className="fi-note" data-testid="qso-withheld">{Q.withheld}</p>{shown.editMode&&<p className="fi-note">{Q.editModeColumns}</p>}
     <p className="fi-note">{Q.noActivate} {Q.csvDisabled} {Q.modeless}</p><p className="fi-note">{M.printAdaptation} {shown.editMode?'':Q.printStudent} {M.saveAdaptation}</p></>}
    selectionItems={[{key:'add',label:FL.menu.add,onClick:add},{key:'start',label:FL.menu.start,onClick:start}]}
    saveName={QSO_LIST_SAVE_NAME} csv={{disabled:true}} printStudent={!shown.editMode} noSelection={Q.noSelection}
    onClose={()=>setShown(null)} box={box} onBox={setBox}/>
   :<section className="card fi-window" data-testid="qso-list-status"><h2 className="ob-native">{QL.caption}</h2>
    <p role="status" className={'loading' in shown?'fi-note':'fi-unavailable'} data-reason={'loading' in shown?'loading':'object-x-positions'}>{'loading' in shown?Q.loading:Q.objectXUnavailable}</p>
    <button type="button" className="secondary-button" onClick={()=>setShown(null)}>{M.close}</button></section>)}
  {fileBox&&<MessageBox box={fileBox} onClose={()=>setFileBox(null)}/>}
  {confirm&&<MessageBox box={{caption:VL.unsavedCaption,text:VL.unsavedText}} onClose={()=>setConfirm(null)} actions={<>
   <button type="button" className="primary-button" data-testid="qso-unsaved-yes" onClick={()=>startNew(confirm,true)}>{M.yes}</button>
   <button type="button" className="secondary-button" data-testid="qso-unsaved-no" onClick={()=>startNew(confirm,false)}>{M.no}</button></>}/>}
 </>;
}

/** TQSOListDlg "Options for QSO List " (227×213, bsDialog): FormActivate 0x57836c, OKBtnClick 0x578430. OK is the Default
 * button (Enter); Escape is Cancel. An invalid limit shows `Invalid Magnitude Limit` / `Numeric Error!` and keeps the dialog. */
function QsoOptionsDialog({editMode,onOk,onCancel}:{editMode:boolean;onOk:(o:QsoListOptions)=>void;onCancel:()=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
 const [activated]=useState(()=>qsoOptionsActivate(sessionOptions,editMode));
 const [text,setText]=useState(activated.limitText),[sort,setSort]=useState<QsoSort>(activated.options.sort),[invalid,setInvalid]=useState(false);
 useEffect(()=>{sessionOptions=activated.options;const el=ref.current;if(el&&!el.open){el.showModal();input.current?.focus();input.current?.select();}},[activated]);
 const D=QL.dialog;
 function ok(){const limit=parseQsoMagnitudeLimit(text);if(limit===null){setInvalid(true);return;}onOk({limit,sort});}
 return <dialog ref={ref} className="ob-dialog ob-box qso-options" aria-labelledby={`${id}-t`} data-testid="qso-options" onCancel={e=>{e.preventDefault();onCancel();}}>
  <h2 id={`${id}-t`} className="ob-native">{D.caption}</h2>
  <form method="dialog" onSubmit={e=>{e.preventDefault();ok();}}>
   <label className="ob-field qso-limit"><span className="ob-native">{D.magnitude}</span>
    <input ref={input} data-testid="qso-limit" maxLength={5} title={D.magnitudeHint} aria-label={Q.limitLabel} inputMode="decimal" value={text} onChange={e=>setText(e.target.value)}/></label>
   <fieldset className="qso-sort" disabled={!activated.sortEnabled} data-testid="qso-sort"><legend className="ob-native">{D.sort}</legend>
    {D.sorts.map((s,i)=><label key={s} className="ob-check"><input type="radio" name={`${id}-sort`} value={i} checked={sort===i} data-testid={`qso-sort-${i}`} onChange={()=>setSort(i as QsoSort)}/>{s}</label>)}
   </fieldset>
   {!activated.sortEnabled&&<p className="fi-note">{Q.sortDisabled}</p>}
   <div className="ob-actions"><button type="submit" className="primary-button" data-testid="qso-ok">{menuCaptionText(D.ok)}</button><button type="button" className="secondary-button" data-testid="qso-cancel" onClick={onCancel}>{menuCaptionText(D.cancel)}</button></div>
  </form>
  {invalid&&<MessageBox box={{caption:D.errorCaption,text:D.errorText}} onClose={()=>{setInvalid(false);input.current?.focus();}}/>}
 </dialog>;
}
