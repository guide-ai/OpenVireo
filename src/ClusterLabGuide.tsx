import type {RefObject} from 'react';
import {t} from './i18n';
import {CLUSTER_LAB_STEPS,type ClusterLabProgress,type ClusterLabStep,type ClusterOwnStatus} from './core/clusterLab';
import {clusterNextText,clusterStepBody,clusterStepTitle} from './ClusterLabGuideText';
import {moreDetail,stepTitle} from './guideMoreDetail';
import {whatNext,whyLead} from './guideLead';
import type {LabSlug} from './seo/labSlugs';
import './hubble-lab.css';

/** WEB-CLUSTER-GUIDE-01: the cluster HR (E05) guide for the database route, with the HubbleLabGuide layout. Every check
 * mark is recomputed from the current state by clusterLabProgress; nothing is stored. Saving is listed as instructions
 * without a check mark. The own-observation route (phase1 item1.9) is shown as separate live status with a link; it is
 * never one of the counted database steps and never marks the whole E05 exercise complete. */
export default function ClusterLabGuide({dialogRef,progress,cluster,onNavigate,own,onOpenOwn,onNext}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:ClusterLabProgress;cluster:string|null;onNavigate:(step:ClusterLabStep)=>void;own:ClusterOwnStatus;onOpenOwn?:()=>void;/** Front NEWCOMER NC4: opens another lab's guide (What next); without it, What next is not shown. */onNext?:(lab:LabSlug)=>void}){
 function go(step:ClusterLabStep){dialogRef.current?.close();onNavigate(step);}
 /** The guide's counts line, in its progress block and as What next's recap (Front NEWCOMER NC4). */
 const counts=t('clusterLab.counts',{done:progress.doneCount,total:CLUSTER_LAB_STEPS.length});
 return <dialog ref={dialogRef} className="hubble-lab-dialog cluster-lab-dialog" aria-labelledby="cluster-lab-heading" aria-describedby="cluster-lab-why" data-testid="cluster-lab-dialog">
  <div className="lab-heading"><div><div className="eyebrow">{t('clusterLab.eyebrow')}</div><h2 id="cluster-lab-heading">{t('clusterLab.title')}</h2></div>
   <button className="secondary-button" autoFocus data-testid="cluster-lab-close" onClick={()=>dialogRef.current?.close()}>{t('clusterLab.close')}</button></div>
  {whyLead('cluster-lab-why',t('clusterLab.why'))}<details className="research-notes"><summary>{t('notes.summary')}</summary><p>{t('clusterLab.intro')}</p><p>{t('clusterLab.introOptions')}</p></details>
  <section className="lab-progress" aria-labelledby="cluster-lab-progress-heading">
   <h3 id="cluster-lab-progress-heading">{t('clusterLab.progress')}</h3>
   <p data-testid="cluster-lab-counts" role="status">{counts}</p>
   <p data-testid="cluster-lab-active">{cluster===null?t('clusterLab.noDataset'):t('clusterLab.dataset',{cluster})}</p>
   <p className="cluster-lab-next" data-testid="cluster-lab-next" data-next={progress.next}>{clusterNextText(progress.next)}</p>
   {progress.next!=='preserve'&&<button className="secondary-button" data-testid="cluster-lab-continue" onClick={()=>{if(progress.next!=='preserve')go(progress.next);}}>{t('clusterLab.continue')}</button>}
   <p>{t('clusterLab.progressHelp')}</p>
  </section>
  <ol className="lab-steps">
   {CLUSTER_LAB_STEPS.map(step=><li key={step} data-testid={`cluster-lab-step-${step}`} data-done={progress.done[step]} data-next={progress.next===step||undefined}>
    <h3><span aria-hidden="true">{progress.done[step]?'✓':'○'}</span> {stepTitle(`cluster-lab-step-${step}`,clusterStepTitle(step))}</h3>
    <p data-testid={`cluster-lab-status-${step}`}>{t(progress.done[step]?'clusterLab.status.done':'clusterLab.status.notYet')}</p>
    <button className="secondary-button" onClick={()=>go(step)}>{t('clusterLab.go')}</button>
    {moreDetail(`cluster-lab-step-${step}`,progress.next===step,clusterStepBody(step))}
   </li>)}
  </ol>
  <section aria-labelledby="cluster-lab-preserve-heading" data-testid="cluster-lab-preserve">
   <h3 id="cluster-lab-preserve-heading">{t('clusterLab.preserve.heading')}</h3>
   <p>{t('clusterLab.preserve.save')}</p><p>{t('clusterLab.preserve.restore')}</p>
  </section>
  {progress.next==='preserve'&&onNext&&whatNext('cluster-lab','cluster-hr',next=>{dialogRef.current?.close();onNext(next);},counts)}
  <section aria-labelledby="cluster-lab-own-heading" data-testid="cluster-lab-own">
   <h3 id="cluster-lab-own-heading">{t('clusterLab.own.heading')}</h3>
   <p>{t('clusterLab.own.help')}</p>
   <p data-testid="cluster-lab-own-pairs">{t('clusterLab.own.pairs',{count:own.pairs,total:own.total})}</p>
   <p data-testid="cluster-lab-own-fit" data-confirmed={own.confirmed}>{t(own.confirmed?'clusterLab.own.confirmed':own.canFit?'clusterLab.own.canFit':'clusterLab.own.tooFew')}</p>
   <p className="lab-recovery" data-testid="cluster-lab-own-minimum">{t('clusterLab.own.minimum')}</p>
   {onOpenOwn&&<button className="secondary-button" data-testid="cluster-lab-own-open" onClick={()=>{dialogRef.current?.close();onOpenOwn();}}>{t('clusterLab.own.open')}</button>}
   <p className="lab-recovery">{t('clusterLab.limits')}</p>
  </section>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('clusterLab.return')}</button>
 </dialog>;
}
