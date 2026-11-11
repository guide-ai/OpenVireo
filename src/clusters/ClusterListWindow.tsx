import {useEffect,useId,useRef,useState} from 'react';
import {CLUSTER_LIST_LITERALS as L,type ClusterList} from '../core/clusterList';
import {CLUSTER_HR_CAPTIONS as C} from '../core/clusterHrCaptions';
import {CLUSTER_HR_PRINT_LITERALS as PL} from '../core/clusterHrPrint';
import {menuCaptionText} from '../core/radioControl';
import {vireo} from '../i18n/vireo';
import NativeMirrorCaption from '../components/NativeMirrorCaption';
import {HelpListBox} from './CleaHelp';
import {CLUSTER_HR as M} from './ClusterHrMessages';
import ClusterPrintPreview from './ClusterPrintPreview';
import './cluster-hr.css';
import {screenDateTime} from '../i18n/screenDate';

/** Page body of TObjctListForm1 Print (Front O M6; TClstrListForm2 0x5451a4 keeps the user's orientation): date + laboratory
 * line, student lines (not recovered: placeholder), the caption and every list line. */
export function ListPrintBody({caption,lines}:{caption:string;lines:readonly string[]}){
 const [date]=useState(()=>screenDateTime(new Date()));
 return <div data-testid="cluster-list-print-body">
  <p className="cluster-print-line">{date+vireo(PL.lab)}</p>
  <p className="cluster-print-line cluster-print-placeholder">{M.printPlaceholder}</p>
  <p className="cluster-print-line cluster-print-indent">{caption}</p>
  {lines.map((l,i)=><p key={i} lang="en" className="cluster-print-line cluster-print-indent">{l||' '}</p>)}
 </div>;
}

/** TClstrListForm2 "Clusters for Study" (ShowModal from Select Cluster Data…). Left click or keys select a data row;
 * double-click / Enter or Selection › Plot plots it; with no selection Plot answers with VIREO's box. */
export default function ClusterListWindow({list,onPlot,onClose,busy}:{list:ClusterList;onPlot:(id:string)=>void;onClose:()=>void;busy:boolean}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),[index,setIndex]=useState(-1),[menu,setMenu]=useState<'list'|'selection'|null>(null);
 const [box,setBox]=useState<string|null>(null),[printing,setPrinting]=useState(false);
 useEffect(()=>{const d=dialog.current;if(d&&!d.open)d.showModal();},[]);
 const selection=index>=list.first&&index<=list.last?index-list.first:-1;
 const caption=vireo(L.caption);
 function plot(sel:number){setMenu(null);if(sel<0){setBox(vireo(L.noSelection));return;}onPlot(list.records[sel].id);}
 return <dialog ref={dialog} className="ob-dialog ob-wide cluster-list-window" aria-labelledby={`${id}-t`} data-testid="cluster-list" onCancel={e=>{e.preventDefault();if(menu){setMenu(null);return;}onClose();}}>
  <h2 id={`${id}-t`}>{caption}</h2>
  <div className="cluster-hr-menubar">
   <div className="cluster-hr-menu"><button type="button" aria-expanded={menu==='list'} data-testid="cluster-list-list-menu" onClick={()=>setMenu(menu==='list'?null:'list')}>{vireo(C.listMenu)}</button>
    {menu==='list'&&<div role="group" aria-label={vireo(C.listMenu)} className="cluster-hr-menu-list">
     <button type="button" disabled title={M.listSearchNote}>{vireo(C.searchItem)}</button><hr/>
     <button type="button" data-testid="cluster-list-print" onClick={()=>{setMenu(null);setPrinting(true);}}>{vireo(C.printItem)}</button><hr/>
     <button type="button" disabled>{vireo(C.saveList)}</button><hr/>
     <button type="button" data-testid="cluster-list-close" onClick={onClose}>{vireo(C.closeItem)}</button>
    </div>}</div>
   <div className="cluster-hr-menu"><button type="button" aria-expanded={menu==='selection'} data-testid="cluster-list-selection-menu" onClick={()=>setMenu(menu==='selection'?null:'selection')}>{menuCaptionText(vireo(L.selection))}</button>
    {menu==='selection'&&<div role="group" aria-label={menuCaptionText(vireo(L.selection))} className="cluster-hr-menu-list">
     <button type="button" data-testid="cluster-list-plot" disabled={busy} onClick={()=>plot(selection)}>{menuCaptionText(vireo(L.plot))}</button>
    </div>}</div>
  </div>
  <HelpListBox rows={list.lines} selected={index} onSelect={setIndex} onActivate={i=>{if(i>=list.first&&i<=list.last&&!busy)plot(i-list.first);}} label={caption} testId="cluster-list-lines" columns lang="en"/>
  <NativeMirrorCaption/>
  <p className="cluster-hr-note">{M.listCaptionNote}</p>
  <p className="cluster-hr-note">{M.listSearchNote}</p>
  <p className="cluster-hr-note">{M.listPlotNote}</p>
  <div className="ob-actions"><button type="button" className="secondary-button" onClick={onClose}>{vireo(C.closeItem)}</button></div>
  {box&&<div role="alertdialog" aria-labelledby={`${id}-b`} className="cluster-member-question" data-testid="cluster-list-box"><h3 id={`${id}-b`}>{vireo(C.information)}</h3><p>{box}</p>
   <div className="ob-actions"><button type="button" className="primary-button" autoFocus onClick={()=>setBox(null)}>{M.ok}</button></div></div>}
  {printing&&<ClusterPrintPreview caption={caption} note={M.listPrintNote} mirror onClose={()=>setPrinting(false)} testId="cluster-list-print-preview"><ListPrintBody caption={caption} lines={list.lines}/></ClusterPrintPreview>}
 </dialog>;
}
