import {lazy,Suspense,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {ProgrammedSlewContext} from '../polish/programmedSlew';
import TerminateSlewBox from '../polish/TerminateSlewBox';
import QuestionBox from '../polish/QuestionBox';
import {HOT_LIST_EDIT_LITERALS as HE,POLISH_MESSAGES as PM} from '../polish/PolishMessages';
import ResearchNotes from '../components/ResearchNotes';
import {HtlError,editHtlRow,newHtlEditor,removeHtlRow,undoHtl,type HtlList} from '../core/hotList';
import {appendAddCurrentEntry,HOT_LIST_ENTRY_CAPTIONS,addCurrentPrefill,hotListEntryAddedText,hotListEntryDraft,parseHotListEntry,type HotListEntryDraft} from '../core/hotListEntry';
import {keepHotList,setHotListEditor} from '../core/sharedHotList';
import type {SharedHotListHandle} from '../useSharedHotList';
import {t} from '../i18n';
import HotListEntryDialog from './HotListEntryDialog';
import OpticalOptionsDialog from './OpticalOptionsDialog';
import type {OpticalOptions,SessionOpticalOptions} from '../core/opticalOptions';
import {hotListPrintSnapshot,type HotListPrintSnapshot} from '../core/hotListPrint';
import {INITIAL_OPTICAL_HOT_LIST,cancelOpticalHotListSearch,closeOpticalHotList,dismissOpticalHotListNotice,editOpticalHotListSearch,openOpticalHotList,openOpticalHotListSearch,opticalHotListCaption,opticalHotListRowText,opticalHotListRows,reopenOpticalHotList,selectOpticalHotListIndex,slewToOpticalHotListSelection,submitOpticalHotListSearch,type OpticalHotListWindow as HotListState} from '../core/opticalHotList';
import {INITIAL_OPTICAL_SKY_COORDS,cancelOpticalSkyCoords,confirmOpticalSkyCoords,dismissOpticalSkyCoordsNotice,editOpticalSkyCoordsField,openOpticalSkyCoords,openOpticalSkyCoordsFromHotList,selectOpticalSkyCoordsEpoch,opticalSlewConfirmText,type OpticalSkyCoordsState} from '../core/opticalSkyCoords';
import type {Pointing} from '../core/sky';
import {addCurrentId,addCurrentRemark,type ShownCurrentObject} from '../core/currentObject';
import HotListPrintPreview from './HotListPrintPreview';
import OpticalHotListWindow from './OpticalHotListWindow';
import OpticalSkyCoordsDialog from './OpticalSkyCoordsDialog';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import type {FieldInformationProps,FieldInfoRequest} from './FieldInformationMenu';
import ObservatoryFileMenu from './ObservatoryFileMenu';
const FieldInformationMenu=lazy(()=>import('./FieldInformationMenu'));
const QsoListWindow=lazy(()=>import('./QsoListWindow'));
const ClusterDataWindow=lazy(()=>import('../clusterdata/ClusterDataWindow'));// Front K
import {openOpticalSkyCoordsAt} from '../core/opticalSkyCoords';
const M=OBSERVATORY_MESSAGES.skyCoords,H=OBSERVATORY_MESSAGES.hotList,E=OBSERVATORY_MESSAGES.entry;

/** Optical Slew menu (Front B): Set Coordinates (OB-SC) and Hot List ▸ View/Select (OB-HL) with Search and Print. The
 * confirmed J2000 target goes to the existing programmed-slew confirmation through `request`; a disabled menu (telescope
 * moving, dome closed, other route) closes every open window without committing. */
export default function OpticalSlewMenu({pointing,enabled,request,hotList,currentObject,exerciseCode=0,options,onOptions,fieldInfo}:{pointing:Pointing;enabled:boolean;request:(p:Pointing,note?:string)=>void;hotList:SharedHotListHandle;
 /** Front R4: VIREO's current object at a pointing (0x53cf94), already behind the Object X gate; the session exercise code (0 none). */
 currentObject:(p:Pointing)=>Promise<ShownCurrentObject>;exerciseCode?:number;options:OpticalOptions;onOptions:(o:OpticalOptions)=>void;
 /** Front O: Edit Mode (not persisted) and File › Field Information. Absent: the menu is exactly as before. */
 fieldInfo?:FieldInformationProps&Readonly<{onEditMode:(on:boolean)=>void;
  /** Front M: the Virtual Observatory state lifted to the page (also gates Multi-Spec mode 0); absent: kept here. */
  virtualObservatory?:boolean;onVirtualObservatory?:(on:boolean)=>void;
  /** Front R3: the other ported options (page session); absent: the dialog lists them with their compiled state. */
  sessionOptions?:SessionOpticalOptions;onSessionOptions?:(o:SessionOpticalOptions)=>void;
  /** R3 review L2: the selected site's horizon (radians), shown read-only as Horizon Limit. */horizonRadians?:number}>}){
 const [sky,setSky]=useState<OpticalSkyCoordsState>(INITIAL_OPTICAL_SKY_COORDS),[hot,setHot]=useState<HotListState>(INITIAL_OPTICAL_HOT_LIST),[print,setPrint]=useState<HotListPrintSnapshot|null>(null),[entry,setEntry]=useState<HotListEntryDraft|null>(null),[entryError,setEntryError]=useState(''),[info,setInfo]=useState<Readonly<{caption:string;text:string}>|null>(null);
 const [fieldRequest,setFieldRequest]=useState<FieldInfoRequest|null>(null),[qsoRequest,setQsoRequest]=useState(0),[clusterRequest,setClusterRequest]=useState(0);
 // Front O2 review 1 M1: VIREO's VObsBox (options+0x27d5, default off), the only student route to File › QSO List; not persisted.
 const [localVirtualObservatory,setLocalVirtualObservatory]=useState(false);
 const virtualObservatory=fieldInfo?.virtualObservatory??localVirtualObservatory,setVirtualObservatory=fieldInfo?.onVirtualObservatory??setLocalVirtualObservatory;
 const editMode=fieldInfo?.editMode??false;
 const addCurrentTicket=useRef(0);
 // A request made in an earlier Edit Mode session must not reopen windows when Edit Mode is switched on again.
 useEffect(()=>{if(!editMode)setFieldRequest(null);},[editMode]);
 const list=hotList.doc.editor?.list??null,fileName=hotList.doc.name;
 const rows=useMemo(()=>opticalHotListRows(list),[list]),texts=useMemo(()=>rows.map((r,i)=>opticalHotListRowText(r.record,i+1)),[rows]),caption=opticalHotListCaption(fileName);
 useEffect(()=>{if(!enabled){addCurrentTicket.current++;setSky(s=>s.dialog?{...s,dialog:null,notice:null}:s);setHot(h=>h.shown||h.notice?{...INITIAL_OPTICAL_HOT_LIST,index:h.index}:h);setPrint(null);setEntry(null);setEntryError('');}},[enabled]);
 // A list replaced while the window is hidden keeps the remembered index only when it is still a row.
 useEffect(()=>{setHot(h=>h.index>=rows.length?{...h,index:-1}:h);},[rows]);
 // Add Current (0x53f0fc): refresh the current object (0x53cf94), then prefill ID (its name), the kind remark (exercise code 0 only)
 // and the pointing. A lookup that resolves after the menu was disabled or a newer click is dropped.
 async function addCurrent(){const ticket=++addCurrentTicket.current,at=pointing;setEntryError('');
  let object:ShownCurrentObject;try{object=await currentObject(at);}catch{object=Object.freeze({status:'none'});}
  if(ticket!==addCurrentTicket.current)return;
  setEntry(hotListEntryDraft(addCurrentPrefill(at,addCurrentId(object)||null,addCurrentRemark(object,exerciseCode))));}
 function ok(){const step=confirmOpticalSkyCoords(sky);setSky(step.state);if(step.slew){const {target,conversion}=step.slew;request(target,opticalSlewConfirmText(target,conversion!==null));}}
 function cancel(){const fromList=sky.dialog?.origin==='hot-list';setSky(cancelOpticalSkyCoords);if(fromList)setHot(reopenOpticalHotList);}
 function addEntry(){if(!entry)return;const r=parseHotListEntry(entry);if(r.status!=='ok'){setEntryError(r.status==='ra-invalid'?HOT_LIST_ENTRY_CAPTIONS.raError:r.status==='dec-invalid'?HOT_LIST_ENTRY_CAPTIONS.decError:E.raUnsupported);return;}
  if(hotList.current().read){setEntryError(E.busy);return;}
  if(editing!==null){const at=editing;let after:HtlList|null=null;
   try{hotList.update(d=>{if(d.read||!d.editor)return keepHotList(d);const e=editHtlRow(d.editor,at,r.fields);after=e.list;return setHotListEditor(d,e,d.name);});}catch(e){setEntryError(e instanceof HtlError?t(`htl.error.${e.code}`):E.busy);return;}
   setEditing(null);setEntry(null);setUndoList(after);return;}
  try{hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,appendAddCurrentEntry(d.editor??newHtlEditor(),r.fields),d.editor?d.name:''));}catch(e){setEntryError(e instanceof HtlError?t(`htl.error.${e.code}`):E.busy);return;}
  setEntry(null);setInfo({caption:HOT_LIST_ENTRY_CAPTIONS.addedCaption,text:hotListEntryAddedText(r.fields.id)});}
 const programmed=useContext(ProgrammedSlewContext),[terminate,setTerminate]=useState(false),setCoordinates=useRef<HTMLButtonElement>(null);
 // L3: focus returns to Set Coordinates after the answer, and when the slew ends while the question is open.
 const endTerminate=()=>setTerminate(false),wasTerminate=useRef(false);
 // Runs after the question's dialog has closed (its cleanup runs first), so the page is no longer inert.
 useEffect(()=>{if(wasTerminate.current&&!terminate)setCoordinates.current?.focus();wasTerminate.current=terminate;},[terminate]);
 // Front P, THotListForm1 Edit/Delete/Undo (0x591488 / 0x59172c / 0x5918d0). `editing` is the file index under Edit;
 // `undoList` is the list the window's last Edit/Delete produced (Undo is one level and only while that list is current).
 const [editing,setEditing]=useState<number|null>(null),[deleting,setDeleting]=useState<number|null>(null),[undoList,setUndoList]=useState<HtlList|null>(null);
 // N2: after the Delete question closes (Yes, No or Escape) focus returns to the list's selected row, else to Delete; this
 // runs after the question's dialog has closed, so the hot-list window is the top modal again.
 const wasDeleting=useRef(false);
 useEffect(()=>{if(wasDeleting.current&&deleting===null){const w=document.querySelector('[data-testid="ob-hotlist"]');
  (w?.querySelector<HTMLInputElement>('[data-testid="ob-hotlist-rows"] input:checked')??w?.querySelector<HTMLButtonElement>('[data-testid="ob-hotlist-delete"]'))?.focus();}
  wasDeleting.current=deleting!==null;},[deleting]);
 const shownRow=()=>hot.index>=0&&hot.index<rows.length?rows[hot.index]:null;
 const noSelection=()=>setInfo({caption:HE.noSelectionCaption,text:HE.noSelectionText});
 function editRow(){const r=shownRow();if(!r){noSelection();return;}setEntryError('');setEditing(r.sourceIndex);setEntry(hotListEntryDraft(r.record));}
 function deleteRow(){const r=shownRow();if(!r){noSelection();return;}setDeleting(r.sourceIndex);}
 function confirmDelete(yes:boolean){const at=deleting;setDeleting(null);if(!yes||at===null)return;let after:HtlList|null=null;const shown=hot.index;
  try{hotList.update(d=>{if(d.read||!d.editor)return keepHotList(d);const e=removeHtlRow(d.editor,at);after=e.list;return setHotListEditor(d,e,d.name);});}catch{return;}
  setUndoList(after);setHot(h=>({...h,index:after&&(after as HtlList).length?Math.max(0,shown-1):-1}));}
 function undoRow(){if(!undoList)return;try{hotList.update(d=>d.editor&&d.editor.list===undoList&&!d.read?setHotListEditor(d,undoHtl(d.editor),d.name):keepHotList(d));}catch{}setUndoList(null);}
 const undoEnabled=undoList!==null&&hotList.doc.editor?.list===undoList;
 // The question goes away with the slew (it ended, or was stopped elsewhere).
 useEffect(()=>{if(!programmed?.moving)setTerminate(false);},[programmed?.moving]);
 function slew(){const step=slewToOpticalHotListSelection(hot,rows);setHot(step.window);if(step.row)setSky(s=>openOpticalSkyCoordsFromHotList(s,step.row!));}
 return <div className="ob-slew-menu">
  <div className="ob-menu">
   {/* OB-SC-02 (Front P): during a programmed slew Set Coordinates asks "Terminate Current Slew?" instead of opening. */}
   <button type="button" ref={setCoordinates} className="secondary-button" disabled={!enabled&&!programmed?.moving} data-testid="ob-set-coordinates" onClick={()=>{if(programmed?.moving){setTerminate(true);return;}setSky(s=>openOpticalSkyCoords(s,pointing));}}>{M.open}</button>
   {terminate&&programmed?.moving&&<TerminateSlewBox onYes={()=>{endTerminate();programmed.terminate();}} onNo={endTerminate}/>}
   <button type="button" className="secondary-button" disabled={!enabled} data-testid="ob-view-select" onClick={()=>setHot(h=>openOpticalHotList(h,rows.length))}>{H.open}</button>
   <OpticalOptionsDialog options={options} onOptions={onOptions} disabled={!enabled} editMode={fieldInfo?.editMode} onEditMode={fieldInfo?.onEditMode} virtualObservatory={virtualObservatory} onVirtualObservatory={fieldInfo?setVirtualObservatory:undefined} sessionOptions={fieldInfo?.sessionOptions} onSessionOptions={fieldInfo?.onSessionOptions} horizonRadians={fieldInfo?.horizonRadians}/>
   <button type="button" className="secondary-button" disabled={!enabled} data-testid="ob-add-current" onClick={()=>void addCurrent()}>{E.open}</button>
  </div>
  {fieldInfo&&<ObservatoryFileMenu editMode={editMode} qsoList={virtualObservatory} disabled={fieldInfo.busy??false} pointing={pointing} view={fieldInfo.view} telescope={fieldInfo.telescopeName??''} onFieldInfo={kind=>setFieldRequest(r=>({kind,token:(r?.token??0)+1}))} onQsoList={()=>setQsoRequest(n=>n+1)} onClusterData={()=>setClusterRequest(n=>n+1)}/>}
  <ResearchNotes><p>{M.openHelp} {H.openHelp} {E.openHelp} {M.adaptation} {E.adaptation}</p></ResearchNotes>
  <OpticalHotListWindow caption={caption} texts={texts} state={hot} rows={rows} onSelect={i=>setHot(h=>selectOpticalHotListIndex(h,i,rows.length))} onSlew={slew} onClose={()=>setHot(closeOpticalHotList)}
   onSearch={()=>setHot(openOpticalHotListSearch)} onSearchEdit={(q,c)=>setHot(h=>editOpticalHotListSearch(h,q,c))} onSearchSubmit={mode=>setHot(h=>submitOpticalHotListSearch(h,mode,texts))} onSearchCancel={()=>setHot(cancelOpticalHotListSearch)}
   onDismiss={()=>setHot(dismissOpticalHotListNotice)} onPrint={()=>setPrint(hotListPrintSnapshot(caption,rows,(r,i)=>opticalHotListRowText(r,i+1)))}
   onEdit={editRow} onDelete={deleteRow} onUndo={undoRow} undoEnabled={undoEnabled} editBlocked={!!hotList.doc.read}/>
  {deleting!==null&&<QuestionBox caption={HE.deleteCaption} text={HE.deleteText} note={PM.hotListEdit.deleteNote} testId="ob-hotlist-delete-box" onAnswer={confirmDelete}/>}
  <OpticalSkyCoordsDialog state={sky} onEdit={(f,text)=>setSky(s=>editOpticalSkyCoordsField(s,f,text))} onEpoch={i=>setSky(s=>selectOpticalSkyCoordsEpoch(s,i))} onOk={ok} onCancel={cancel} onDismiss={()=>setSky(dismissOpticalSkyCoordsNotice)}/>
  <HotListEntryDialog draft={entry} error={entryError} onEdit={(f,v)=>setEntry(e=>e&&{...e,[f]:v})} onOk={addEntry} onCancel={()=>{setEntry(null);setEditing(null);}} onDismiss={()=>setEntryError('')}/>
  {fieldInfo?.editMode&&<Suspense fallback={null}><FieldInformationMenu info={fieldInfo} pointing={pointing} enabled={enabled} hotList={hotList} request={fieldRequest} onSlew={target=>setSky(s=>openOpticalSkyCoordsAt(s,target))}/></Suspense>}
  {fieldInfo&&clusterRequest>0&&<Suspense fallback={null}><ClusterDataWindow request={clusterRequest} editMode={editMode} driveOn={!!fieldInfo.driveOn} pointing={pointing} hotList={hotList}/></Suspense>}
  {fieldInfo&&qsoRequest>0&&<Suspense fallback={null}><QsoListWindow request={qsoRequest} editMode={editMode} hotList={hotList} hidden={fieldInfo.hidden??null}/></Suspense>}
  {info&&<InfoBox caption={info.caption} text={info.text} onClose={()=>setInfo(null)}/>}
  {print&&<HotListPrintPreview snapshot={print} editMode={editMode} onClose={()=>setPrint(null)}/>}
 </div>;
}

/** Application.MessageBox stand-in for an information box (OK/Cancel natively, result ignored). */
function InfoBox({caption,text,onClose}:{caption:string;text:string;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(el&&!el.open)el.showModal();},[]);
 return <dialog ref={ref} className="ob-dialog ob-box" role="alertdialog" aria-label={caption} data-testid="ob-info-box" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 className="ob-native">{caption}</h2><p className="ob-native">{text}</p><div className="ob-actions"><button type="button" className="primary-button" onClick={onClose}>{OBSERVATORY_MESSAGES.common.ok}</button></div>
 </dialog>;
}
