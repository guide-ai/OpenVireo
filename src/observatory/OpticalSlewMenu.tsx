import {useEffect,useMemo,useState} from 'react';
import type {HtlList} from '../core/hotList';
import {hotListPrintSnapshot,type HotListPrintSnapshot} from '../core/hotListPrint';
import {INITIAL_OPTICAL_HOT_LIST,cancelOpticalHotListSearch,closeOpticalHotList,dismissOpticalHotListNotice,editOpticalHotListSearch,openOpticalHotList,openOpticalHotListSearch,opticalHotListCaption,opticalHotListRowText,opticalHotListRows,reopenOpticalHotList,selectOpticalHotListIndex,slewToOpticalHotListSelection,submitOpticalHotListSearch,type OpticalHotListWindow as HotListState} from '../core/opticalHotList';
import {INITIAL_OPTICAL_SKY_COORDS,cancelOpticalSkyCoords,confirmOpticalSkyCoords,dismissOpticalSkyCoordsNotice,editOpticalSkyCoordsField,openOpticalSkyCoords,openOpticalSkyCoordsFromHotList,selectOpticalSkyCoordsEpoch,opticalSlewConfirmText,type OpticalSkyCoordsState} from '../core/opticalSkyCoords';
import type {Pointing} from '../core/sky';
import HotListPrintPreview from './HotListPrintPreview';
import OpticalHotListWindow from './OpticalHotListWindow';
import OpticalSkyCoordsDialog from './OpticalSkyCoordsDialog';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
const M=OBSERVATORY_MESSAGES.skyCoords,H=OBSERVATORY_MESSAGES.hotList;

/** Optical Slew menu (Front B): Set Coordinates (OB-SC) and Hot List ▸ View/Select (OB-HL) with Search and Print. The
 * confirmed J2000 target goes to the existing programmed-slew confirmation through `request`; a disabled menu (telescope
 * moving, dome closed, other route) closes every open window without committing. */
export default function OpticalSlewMenu({pointing,enabled,request,list,fileName}:{pointing:Pointing;enabled:boolean;request:(p:Pointing,note?:string)=>void;list:HtlList|null;fileName:string}){
 const [sky,setSky]=useState<OpticalSkyCoordsState>(INITIAL_OPTICAL_SKY_COORDS),[hot,setHot]=useState<HotListState>(INITIAL_OPTICAL_HOT_LIST),[print,setPrint]=useState<HotListPrintSnapshot|null>(null);
 const rows=useMemo(()=>opticalHotListRows(list),[list]),texts=useMemo(()=>rows.map((r,i)=>opticalHotListRowText(r.record,i+1)),[rows]),caption=opticalHotListCaption(fileName);
 useEffect(()=>{if(!enabled){setSky(s=>s.dialog?{...s,dialog:null,notice:null}:s);setHot(h=>h.shown||h.notice?{...INITIAL_OPTICAL_HOT_LIST,index:h.index}:h);setPrint(null);}},[enabled]);
 // A list replaced while the window is hidden keeps the remembered index only when it is still a row.
 useEffect(()=>{setHot(h=>h.index>=rows.length?{...h,index:-1}:h);},[rows]);
 function ok(){const step=confirmOpticalSkyCoords(sky);setSky(step.state);if(step.slew){const {target,conversion}=step.slew;request(target,opticalSlewConfirmText(target,conversion!==null));}}
 function cancel(){const fromList=sky.dialog?.origin==='hot-list';setSky(cancelOpticalSkyCoords);if(fromList)setHot(reopenOpticalHotList);}
 function slew(){const step=slewToOpticalHotListSelection(hot,rows);setHot(step.window);if(step.row)setSky(s=>openOpticalSkyCoordsFromHotList(s,step.row!));}
 return <div className="ob-slew-menu">
  <div className="ob-menu">
   <button type="button" className="secondary-button" disabled={!enabled} data-testid="ob-set-coordinates" onClick={()=>setSky(s=>openOpticalSkyCoords(s,pointing))}>{M.open}</button>
   <button type="button" className="secondary-button" disabled={!enabled} data-testid="ob-view-select" onClick={()=>setHot(h=>openOpticalHotList(h,rows.length))}>{H.open}</button>
  </div>
  <p className="observatory-note">{M.openHelp} {H.openHelp} {M.adaptation}</p>
  <OpticalHotListWindow caption={caption} texts={texts} state={hot} rows={rows} onSelect={i=>setHot(h=>selectOpticalHotListIndex(h,i,rows.length))} onSlew={slew} onClose={()=>setHot(closeOpticalHotList)}
   onSearch={()=>setHot(openOpticalHotListSearch)} onSearchEdit={(q,c)=>setHot(h=>editOpticalHotListSearch(h,q,c))} onSearchSubmit={mode=>setHot(h=>submitOpticalHotListSearch(h,mode,texts))} onSearchCancel={()=>setHot(cancelOpticalHotListSearch)}
   onDismiss={()=>setHot(dismissOpticalHotListNotice)} onPrint={()=>setPrint(hotListPrintSnapshot(caption,rows,(r,i)=>opticalHotListRowText(r,i+1)))}/>
  <OpticalSkyCoordsDialog state={sky} onEdit={(f,text)=>setSky(s=>editOpticalSkyCoordsField(s,f,text))} onEpoch={i=>setSky(s=>selectOpticalSkyCoordsEpoch(s,i))} onOk={ok} onCancel={cancel} onDismiss={()=>setSky(dismissOpticalSkyCoordsNotice)}/>
  {print&&<HotListPrintPreview snapshot={print} onClose={()=>setPrint(null)}/>}
 </div>;
}
