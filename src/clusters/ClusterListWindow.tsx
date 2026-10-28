import {useEffect,useId,useRef,useState} from 'react';
import {CLUSTER_LIST_LITERALS as L,type ClusterList} from '../core/clusterList';
import {HelpListBox} from './CleaHelp';
import {CLUSTER_HR_EN as M} from './ClusterHrMessages';
import ClusterPrintPreview from './ClusterPrintPreview';
import './cluster-hr.css';

/** Page body of TObjctListForm1 Print (Front O M6; TClstrListForm2 0x5451a4 keeps the user's orientation): date + laboratory
 * line, student lines (not recovered: placeholder), the caption and every list line. */
export function ListPrintBody({caption,lines}:{caption:string;lines:readonly string[]}){
 const [date]=useState(()=>new Date().toLocaleString());
 return <div data-testid="cluster-list-print-body">
  <p className="cluster-print-line">{date+'     Laboratory Table Number (Not Recorded)'}</p>
  <p className="cluster-print-line cluster-print-placeholder">{M.printPlaceholder}</p>
  <p className="cluster-print-line cluster-print-indent">{caption}</p>
  {lines.map((l,i)=><p key={i} className="cluster-print-line cluster-print-indent">{l||' '}</p>)}
 </div>;
}

/** TClstrListForm2 "Clusters for Study" (ShowModal from Select Cluster Data…). Left click or keys select a data row;
 * double-click / Enter or Selection › Plot plots it; with no selection Plot answers with VIREO's box. */
export default function ClusterListWindow({list,onPlot,onClose,busy}:{list:ClusterList;onPlot:(id:string)=>void;onClose:()=>void;busy:boolean}){
 const id=useId(),dialog=useRef<HTMLDialogElement>(null),[index,setIndex]=useState(-1),[menu,setMenu]=useState<'list'|'selection'|null>(null);
 const [box,setBox]=useState<string|null>(null),[printing,setPrinting]=useState(false);
 useEffect(()=>{const d=dialog.current;if(d&&!d.open)d.showModal();},[]);
 const selection=index>=list.first&&index<=list.last?index-list.first:-1;
 function plot(sel:number){setMenu(null);if(sel<0){setBox(L.noSelection);return;}onPlot(list.records[sel].id);}
 return <dialog ref={dialog} className="ob-dialog ob-wide cluster-list-window" aria-labelledby={`${id}-t`} data-testid="cluster-list" onCancel={e=>{e.preventDefault();if(menu){setMenu(null);return;}onClose();}}>
  <h2 id={`${id}-t`}>{list.caption}</h2>
  <div className="cluster-hr-menubar">
   <div className="cluster-hr-menu"><button type="button" aria-expanded={menu==='list'} data-testid="cluster-list-list-menu" onClick={()=>setMenu(menu==='list'?null:'list')}>{M.listMenu}</button>
    {menu==='list'&&<div role="group" aria-label={M.listMenu} className="cluster-hr-menu-list">
     <button type="button" disabled title={M.listSearchNote}>{M.searchItem}</button><hr/>
     <button type="button" data-testid="cluster-list-print" onClick={()=>{setMenu(null);setPrinting(true);}}>{M.printItem}</button><hr/>
     <button type="button" disabled>{M.saveList}</button><hr/>
     <button type="button" data-testid="cluster-list-close" onClick={onClose}>{M.closeItem}</button>
    </div>}</div>
   <div className="cluster-hr-menu"><button type="button" aria-expanded={menu==='selection'} data-testid="cluster-list-selection-menu" onClick={()=>setMenu(menu==='selection'?null:'selection')}>{M.selectionMenu}</button>
    {menu==='selection'&&<div role="group" aria-label={M.selectionMenu} className="cluster-hr-menu-list">
     <button type="button" data-testid="cluster-list-plot" disabled={busy} onClick={()=>plot(selection)}>{M.plotItem}</button>
    </div>}</div>
  </div>
  <HelpListBox rows={list.lines} selected={index} onSelect={setIndex} onActivate={i=>{if(i>=list.first&&i<=list.last&&!busy)plot(i-list.first);}} label={list.caption} testId="cluster-list-lines"/>
  <p className="cluster-hr-note">{M.listCaptionNote}</p>
  <p className="cluster-hr-note">{M.listSearchNote}</p>
  <p className="cluster-hr-note">{M.listPlotNote}</p>
  <div className="ob-actions"><button type="button" className="secondary-button" onClick={onClose}>{M.closeItem}</button></div>
  {box&&<div role="alertdialog" aria-labelledby={`${id}-b`} className="cluster-member-question" data-testid="cluster-list-box"><h3 id={`${id}-b`}>{M.noticeCaption}</h3><p>{box}</p>
   <div className="ob-actions"><button type="button" className="primary-button" autoFocus onClick={()=>setBox(null)}>{M.ok}</button></div></div>}
  {printing&&<ClusterPrintPreview caption={list.caption} note={M.listPrintNote} onClose={()=>setPrinting(false)} testId="cluster-list-print-preview"><ListPrintBody caption={list.caption} lines={list.lines}/></ClusterPrintPreview>}
 </dialog>;
}
