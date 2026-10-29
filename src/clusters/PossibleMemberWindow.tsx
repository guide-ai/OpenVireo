import {useEffect,useId,useRef,useState} from 'react';
import {CLUSTER_REMOVE_CAPTION,CLUSTER_REMOVE_QUESTION,POSSIBLE_MEMBER_CAPTION,possibleMemberFields} from '../core/clusterHrSelect';
import type {ClusterReferencePoint} from '../core/clusterDatabase';
import {nativeSpectralText} from '../core/catalogObject';
import type {ClusterPointDetail} from '../core/clusterReport';
import {delphiFixed} from '../core/variableStars';
import {CLUSTER_HR_EN as M} from './ClusterHrMessages';
import './cluster-hr.css';

/** TClstrStrForm1 "Possible Cluster Member" (0x5408ac): a modeless window over the plot (VIREO: fsStayOnTop). Its Item menu
 * keeps VIREO's order; Remove asks VIREO's question (0x540b90) and then applies the existing exclusion. Exit and Escape close
 * it (FormClose 0x54088c hides the marker). Fields VIREO fills from unpublished per-star data stay empty with a note. */
export default function PossibleMemberWindow({clusterName,point,detail,removed,busy,onRemove,onClose,onAddHotList,notice}:{clusterName:string;point:ClusterReferencePoint;detail:ClusterPointDetail|null;removed:boolean;busy:boolean;onRemove:()=>void;onClose:()=>void;
 /** Item › Add to Hot List (0x540ccc); absent: shown disabled. */ onAddHotList?:()=>void;
 /** The Observation List confirmation text after an addition. */ notice?:string}){
 const id=useId(),heading=useRef<HTMLHeadingElement>(null),trigger=useRef<HTMLButtonElement>(null),[menu,setMenu]=useState(false),[asking,setAsking]=useState(false),[status,setStatus]=useState('');
 const f=possibleMemberFields(clusterName,point);
 // From the approved sidecar: ID, U−B (FloatToStrF 3 when below 30) and the spectral text 0x55d4f4.
 const ub=detail?Math.fround(detail[1]/1000):null,sp=detail?nativeSpectralText(detail[3]):null;
 useEffect(()=>{heading.current?.focus();setStatus('');setAsking(false);},[point.id]);
 const field=(label:string,value:string,testId:string,missing=false)=><div className="cluster-member-field"><span>{label}</span><output data-testid={testId} data-missing={missing||undefined}>{missing?M.memberNotPublished:value}</output></div>;
 return <section className="cluster-member-window" role="dialog" aria-labelledby={`${id}-t`} data-testid="cluster-member"
  onKeyDown={e=>{if(e.key!=='Escape')return;e.stopPropagation();if(asking){setAsking(false);return;}if(menu){setMenu(false);trigger.current?.focus();return;}onClose();}}>
  <h3 id={`${id}-t`} ref={heading} tabIndex={-1}>{POSSIBLE_MEMBER_CAPTION}</h3>
  <div className="cluster-hr-menubar"><div className="cluster-hr-menu">
   <button type="button" ref={trigger} aria-expanded={menu} aria-controls={`${id}-m`} data-testid="cluster-member-menu" onClick={()=>setMenu(!menu)}>{M.memberItemMenu}</button>
   {menu&&<div id={`${id}-m`} role="group" aria-label={M.memberItemMenu} className="cluster-hr-menu-list">
    <button type="button" data-testid="cluster-member-add-hot-list" disabled={!onAddHotList||busy} title={onAddHotList?undefined:M.memberHotListUnavailable} onClick={()=>{setMenu(false);onAddHotList?.();}}>{M.memberAddHotList}</button>
    <button type="button" data-testid="cluster-member-remove" disabled={busy||removed} onClick={()=>{setMenu(false);setAsking(true);}}>{M.memberRemove}</button>
    <hr/>
    <button type="button" data-testid="cluster-member-exit" onClick={onClose}>{M.memberExit}</button>
   </div>}
  </div></div>
  <div className="cluster-member-grid">
   {field(M.memberName,f.name,'cluster-member-name')}{field(M.memberId,detail?.[0]??'','cluster-member-id',!detail)}
   {field(M.memberRa,f.ra,'cluster-member-ra')}{field(M.memberV,f.v,'cluster-member-v')}
   {field(M.memberDec,f.dec,'cluster-member-dec')}{field(M.memberBmV,f.bMinusV,'cluster-member-bmv')}
   {field(M.memberUmB,ub!==null&&ub<30?delphiFixed(ub,3):'','cluster-member-umb',!detail)}{field(M.memberSp,sp??'','cluster-member-sp',!detail||sp===null)}
  </div>
  {asking&&<div role="alertdialog" aria-labelledby={`${id}-q`} aria-describedby={`${id}-qd`} className="cluster-member-question" data-testid="cluster-member-question">
   <h4 id={`${id}-q`}>{CLUSTER_REMOVE_CAPTION}</h4><p id={`${id}-qd`} className="cluster-hr-message">{CLUSTER_REMOVE_QUESTION}</p>
   <div className="ob-actions"><button type="button" className="primary-button" autoFocus onClick={()=>{setAsking(false);onRemove();setStatus(M.memberRemoved);}}>{M.yes}</button><button type="button" className="secondary-button" onClick={()=>setAsking(false)}>{M.no}</button></div>
  </div>}
  <p role="status" className="cluster-hr-note" data-testid="cluster-member-status">{notice||(removed&&!status?M.memberAlreadyRemoved:status)}</p>
  {!detail&&<p className="cluster-hr-note">{M.memberDataNote}</p>}
  <p className="cluster-hr-note">{M.memberRemoveNote}</p>
 </section>;
}
