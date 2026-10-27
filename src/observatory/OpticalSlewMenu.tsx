import {useEffect,useMemo,useRef,useState} from 'react';
import {HtlError,newHtlEditor} from '../core/hotList';
import {appendAddCurrentEntry,HOT_LIST_ENTRY_CAPTIONS,addCurrentPrefill,hotListEntryAddedText,hotListEntryDraft,parseHotListEntry,type HotListEntryDraft} from '../core/hotListEntry';
import {keepHotList,setHotListEditor} from '../core/sharedHotList';
import type {SharedHotListHandle} from '../useSharedHotList';
import {t} from '../i18n';
import HotListEntryDialog from './HotListEntryDialog';
import OpticalOptionsDialog from './OpticalOptionsDialog';
import type {OpticalOptions} from '../core/opticalOptions';
import {hotListPrintSnapshot,type HotListPrintSnapshot} from '../core/hotListPrint';
import {INITIAL_OPTICAL_HOT_LIST,cancelOpticalHotListSearch,closeOpticalHotList,dismissOpticalHotListNotice,editOpticalHotListSearch,openOpticalHotList,openOpticalHotListSearch,opticalHotListCaption,opticalHotListRowText,opticalHotListRows,reopenOpticalHotList,selectOpticalHotListIndex,slewToOpticalHotListSelection,submitOpticalHotListSearch,type OpticalHotListWindow as HotListState} from '../core/opticalHotList';
import {INITIAL_OPTICAL_SKY_COORDS,cancelOpticalSkyCoords,confirmOpticalSkyCoords,dismissOpticalSkyCoordsNotice,editOpticalSkyCoordsField,openOpticalSkyCoords,openOpticalSkyCoordsFromHotList,selectOpticalSkyCoordsEpoch,opticalSlewConfirmText,type OpticalSkyCoordsState} from '../core/opticalSkyCoords';
import type {Pointing} from '../core/sky';
import HotListPrintPreview from './HotListPrintPreview';
import OpticalHotListWindow from './OpticalHotListWindow';
import OpticalSkyCoordsDialog from './OpticalSkyCoordsDialog';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
const M=OBSERVATORY_MESSAGES.skyCoords,H=OBSERVATORY_MESSAGES.hotList,E=OBSERVATORY_MESSAGES.entry;

/** Optical Slew menu (Front B): Set Coordinates (OB-SC) and Hot List ▸ View/Select (OB-HL) with Search and Print. The
 * confirmed J2000 target goes to the existing programmed-slew confirmation through `request`; a disabled menu (telescope
 * moving, dome closed, other route) closes every open window without committing. */
export default function OpticalSlewMenu({pointing,enabled,request,hotList,objectId,options,onOptions}:{pointing:Pointing;enabled:boolean;request:(p:Pointing,note?:string)=>void;hotList:SharedHotListHandle;objectId:string|null;options:OpticalOptions;onOptions:(o:OpticalOptions)=>void}){
 const [sky,setSky]=useState<OpticalSkyCoordsState>(INITIAL_OPTICAL_SKY_COORDS),[hot,setHot]=useState<HotListState>(INITIAL_OPTICAL_HOT_LIST),[print,setPrint]=useState<HotListPrintSnapshot|null>(null),[entry,setEntry]=useState<HotListEntryDraft|null>(null),[entryError,setEntryError]=useState(''),[info,setInfo]=useState<Readonly<{caption:string;text:string}>|null>(null);
 const list=hotList.doc.editor?.list??null,fileName=hotList.doc.name;
 const rows=useMemo(()=>opticalHotListRows(list),[list]),texts=useMemo(()=>rows.map((r,i)=>opticalHotListRowText(r.record,i+1)),[rows]),caption=opticalHotListCaption(fileName);
 useEffect(()=>{if(!enabled){setSky(s=>s.dialog?{...s,dialog:null,notice:null}:s);setHot(h=>h.shown||h.notice?{...INITIAL_OPTICAL_HOT_LIST,index:h.index}:h);setPrint(null);setEntry(null);setEntryError('');}},[enabled]);
 // A list replaced while the window is hidden keeps the remembered index only when it is still a row.
 useEffect(()=>{setHot(h=>h.index>=rows.length?{...h,index:-1}:h);},[rows]);
 function ok(){const step=confirmOpticalSkyCoords(sky);setSky(step.state);if(step.slew){const {target,conversion}=step.slew;request(target,opticalSlewConfirmText(target,conversion!==null));}}
 function cancel(){const fromList=sky.dialog?.origin==='hot-list';setSky(cancelOpticalSkyCoords);if(fromList)setHot(reopenOpticalHotList);}
 function addEntry(){if(!entry)return;const r=parseHotListEntry(entry);if(r.status!=='ok'){setEntryError(r.status==='ra-invalid'?HOT_LIST_ENTRY_CAPTIONS.raError:r.status==='dec-invalid'?HOT_LIST_ENTRY_CAPTIONS.decError:E.raUnsupported);return;}
  if(hotList.current().read){setEntryError(E.busy);return;}
  try{hotList.update(d=>d.read?keepHotList(d):setHotListEditor(d,appendAddCurrentEntry(d.editor??newHtlEditor(),r.fields),d.editor?d.name:''));}catch(e){setEntryError(e instanceof HtlError?t(`htl.error.${e.code}`):E.busy);return;}
  setEntry(null);setInfo({caption:HOT_LIST_ENTRY_CAPTIONS.addedCaption,text:hotListEntryAddedText(r.fields.id)});}
 function slew(){const step=slewToOpticalHotListSelection(hot,rows);setHot(step.window);if(step.row)setSky(s=>openOpticalSkyCoordsFromHotList(s,step.row!));}
 return <div className="ob-slew-menu">
  <div className="ob-menu">
   <button type="button" className="secondary-button" disabled={!enabled} data-testid="ob-set-coordinates" onClick={()=>setSky(s=>openOpticalSkyCoords(s,pointing))}>{M.open}</button>
   <button type="button" className="secondary-button" disabled={!enabled} data-testid="ob-view-select" onClick={()=>setHot(h=>openOpticalHotList(h,rows.length))}>{H.open}</button>
   <OpticalOptionsDialog options={options} onOptions={onOptions} disabled={!enabled}/>
   <button type="button" className="secondary-button" disabled={!enabled} data-testid="ob-add-current" onClick={()=>{setEntryError('');setEntry(hotListEntryDraft(addCurrentPrefill(pointing,objectId)));}}>{E.open}</button>
  </div>
  <p className="observatory-note">{M.openHelp} {H.openHelp} {E.openHelp} {M.adaptation} {E.adaptation}</p>
  <OpticalHotListWindow caption={caption} texts={texts} state={hot} rows={rows} onSelect={i=>setHot(h=>selectOpticalHotListIndex(h,i,rows.length))} onSlew={slew} onClose={()=>setHot(closeOpticalHotList)}
   onSearch={()=>setHot(openOpticalHotListSearch)} onSearchEdit={(q,c)=>setHot(h=>editOpticalHotListSearch(h,q,c))} onSearchSubmit={mode=>setHot(h=>submitOpticalHotListSearch(h,mode,texts))} onSearchCancel={()=>setHot(cancelOpticalHotListSearch)}
   onDismiss={()=>setHot(dismissOpticalHotListNotice)} onPrint={()=>setPrint(hotListPrintSnapshot(caption,rows,(r,i)=>opticalHotListRowText(r,i+1)))}/>
  <OpticalSkyCoordsDialog state={sky} onEdit={(f,text)=>setSky(s=>editOpticalSkyCoordsField(s,f,text))} onEpoch={i=>setSky(s=>selectOpticalSkyCoordsEpoch(s,i))} onOk={ok} onCancel={cancel} onDismiss={()=>setSky(dismissOpticalSkyCoordsNotice)}/>
  <HotListEntryDialog draft={entry} error={entryError} onEdit={(f,v)=>setEntry(e=>e&&{...e,[f]:v})} onOk={addEntry} onCancel={()=>setEntry(null)} onDismiss={()=>setEntryError('')}/>
  {info&&<InfoBox caption={info.caption} text={info.text} onClose={()=>setInfo(null)}/>}
  {print&&<HotListPrintPreview snapshot={print} onClose={()=>setPrint(null)}/>}
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
