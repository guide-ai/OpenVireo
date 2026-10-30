import {useEffect,useRef,useState,type RefObject} from 'react';
import {clusterHrPrintPage,type ClusterHrPrintLine,type ClusterHrPrintOrientation} from '../core/clusterHrPrint';
import {CLUSTER_HR_EN as M} from './ClusterHrMessages';
import ClusterPrintPreview from './ClusterPrintPreview';
import './cluster-hr.css';

type Trial=Readonly<{zamsShown:boolean;modulusTicks:number;ebvTicks:number}>;
const gapStyle=(g:ClusterHrPrintLine['gap'])=>'h' in g?{marginTop:`${Math.max(0,g.h-1)*1.2}em`}:{marginTop:g.px>0?'2.4em':0};

/** A print-colour copy of the HR plot on screen (WEB: VIREO prints a capture of the whole window, GetFormImage). Element ids
 * are suffixed so the copy never duplicates the page's ids; url(#id) references follow. */
function PlotCopy({source}:{source:RefObject<SVGSVGElement|null>}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const svg=source.current,el=host.current;if(!svg||!el)return;
  const copy=svg.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll('[id]').forEach(n=>n.setAttribute('id',n.id+'-print'));
  copy.querySelectorAll('[clip-path]').forEach(n=>n.setAttribute('clip-path',(n.getAttribute('clip-path')??'').replace(/url\(#([^)]+)\)/,'url(#$1-print)')));
  copy.removeAttribute('aria-labelledby');copy.removeAttribute('data-testid');copy.setAttribute('aria-label',M.hrPrintImage);
  copy.querySelectorAll('[data-testid]').forEach(n=>n.removeAttribute('data-testid'));
  el.replaceChildren(copy);
  return ()=>{el.replaceChildren();};
 },[source]);
 return <div ref={host} className="cluster-print-image" data-testid="cluster-hr-print-image"/>;
}

/** File › Display/Print Data for the own photometer pairs (0x542f1c → RsltsListForm1): typed unavailable, those pairs are not
 * native records (the photometer Record writer is not ported). Saved DAT records use RecordedResultsWindow (Front K2). */
export function ObservationDataUnavailable({testId}:{testId:string}){
 return <><button type="button" className="secondary-button" disabled aria-describedby={`${testId}-reason`} data-testid={testId}>{M.displayData}</button>
  <span id={`${testId}-reason`} className="cluster-hr-note" data-testid={`${testId}-reason`} data-reason="row-writer-not-recovered">{M.observationDataUnavailable}</span></>;
}

/** File › Print (0x542f44): the recovered page body in either orientation, then the plot. */
export default function HrPrint({trial,plot,testId,disabled=false}:{trial:Trial|null;plot:RefObject<SVGSVGElement|null>;testId:string;disabled?:boolean}){
 const [open,setOpen]=useState(false),[orientation,setOrientation]=useState<ClusterHrPrintOrientation>('portrait'),[date]=useState(()=>new Date().toLocaleString());
 const button=useRef<HTMLButtonElement>(null);
 const page=clusterHrPrintPage({dateText:date,zamsShown:trial?.zamsShown??false,modulusTicks:trial?.modulusTicks??0,ebvTicks:trial?.ebvTicks??0,orientation});
 const line=(l:ClusterHrPrintLine,i:number)=>{
  const style={...gapStyle(l.gap),paddingInlineStart:`${l.x/10}ch`};
  if(l.kind==='page-2')return <div key={i} className="cluster-print-page"><p className="cluster-print-line" style={{paddingInlineStart:`${l.x/10}ch`}} data-testid={`${testId}-page2`}><span className="cluster-print-placeholder">{M.printPlaceholder}</span>{l.suffix}</p></div>;
  return <p key={i} style={style} className={`cluster-print-line${l.text===null?' cluster-print-placeholder':''}`} data-kind={l.kind}>{l.text??M.printPlaceholder}</p>;
 };
 return <>
  <button type="button" ref={button} className="secondary-button" data-testid={`${testId}-open`} disabled={disabled} onClick={()=>setOpen(true)}>{M.hrPrint}</button>
  {open&&<ClusterPrintPreview caption={M.hrPrintCaption} note={M.hrPrintNote} onClose={()=>{setOpen(false);requestAnimationFrame(()=>button.current?.focus());}} testId={testId}>
   <fieldset className="cluster-print-chrome cluster-print-orientation"><legend>{M.hrPrintOrientation}</legend>
    {(['portrait','landscape'] as const).map(o=><label key={o}><input type="radio" name={`${testId}-orientation`} value={o} checked={orientation===o} onChange={()=>setOrientation(o)}/> {o==='portrait'?M.portrait:M.landscape}</label>)}
   </fieldset>
   <div className="cluster-print-body" data-testid={`${testId}-body`}>{page.lines.map(line)}<div style={gapStyle('h' in page.imageGap?page.imageGap:{px:0})}/><PlotCopy source={plot}/></div>
  </ClusterPrintPreview>}
 </>;
}
