import type {RefObject} from 'react';
import {t} from './i18n';
import {CLUSTER_LAB_PENDING,CLUSTER_LAB_STEPS,type ClusterLabProgress,type ClusterLabStep} from './core/clusterLab';
import './hubble-lab.css';

/** WEB-CLUSTER-GUIDE-01: the cluster HR (E05) guide for the database route, with the HubbleLabGuide layout. Every check
 * mark is recomputed from the current state by clusterLabProgress; nothing is stored. Saving is listed as instructions
 * without a check mark, and the observation steps of E05 stay explicitly pending (phase1 items1.7/1.9). */
export default function ClusterLabGuide({dialogRef,progress,cluster,onNavigate}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:ClusterLabProgress;cluster:string|null;onNavigate:(step:ClusterLabStep)=>void}){
 function go(step:ClusterLabStep){dialogRef.current?.close();onNavigate(step);}
 return <dialog ref={dialogRef} className="hubble-lab-dialog cluster-lab-dialog" aria-labelledby="cluster-lab-heading" aria-describedby="cluster-lab-intro" data-testid="cluster-lab-dialog">
  <div className="lab-heading"><div><div className="eyebrow">{t('clusterLab.eyebrow')}</div><h2 id="cluster-lab-heading">{t('clusterLab.title')}</h2></div>
   <button className="secondary-button" autoFocus data-testid="cluster-lab-close" onClick={()=>dialogRef.current?.close()}>{t('clusterLab.close')}</button></div>
  <p id="cluster-lab-intro">{t('clusterLab.intro')}</p>
  <section className="lab-progress" aria-labelledby="cluster-lab-progress-heading">
   <h3 id="cluster-lab-progress-heading">{t('clusterLab.progress')}</h3>
   <p data-testid="cluster-lab-counts" role="status">{t('clusterLab.counts',{done:progress.doneCount,total:CLUSTER_LAB_STEPS.length})}</p>
   <p data-testid="cluster-lab-active">{cluster===null?t('clusterLab.noDataset'):t('clusterLab.dataset',{cluster})}</p>
   <p className="cluster-lab-next" data-testid="cluster-lab-next" data-next={progress.next}>{t(`clusterLab.next.${progress.next}`)}</p>
   {progress.next!=='preserve'&&<button className="secondary-button" data-testid="cluster-lab-continue" onClick={()=>{if(progress.next!=='preserve')go(progress.next);}}>{t('clusterLab.continue')}</button>}
   <p>{t('clusterLab.progressHelp')}</p>
  </section>
  <ol className="lab-steps">
   {CLUSTER_LAB_STEPS.map(step=><li key={step} data-testid={`cluster-lab-step-${step}`} data-done={progress.done[step]} data-next={progress.next===step||undefined}>
    <h3><span aria-hidden="true">{progress.done[step]?'✓':'○'}</span> {t(`clusterLab.step.${step}.title`)}</h3>
    <p data-testid={`cluster-lab-status-${step}`}>{t(progress.done[step]?'clusterLab.status.done':'clusterLab.status.notYet')}</p>
    <p>{t(`clusterLab.step.${step}.help`)}</p>
    <button className="secondary-button" onClick={()=>go(step)}>{t('clusterLab.go')}</button>
   </li>)}
  </ol>
  <section aria-labelledby="cluster-lab-preserve-heading" data-testid="cluster-lab-preserve">
   <h3 id="cluster-lab-preserve-heading">{t('clusterLab.preserve.heading')}</h3>
   <p>{t('clusterLab.preserve.save')}</p><p>{t('clusterLab.preserve.restore')}</p>
  </section>
  <section aria-labelledby="cluster-lab-pending-heading" data-testid="cluster-lab-pending">
   <h3 id="cluster-lab-pending-heading">{t('clusterLab.pending.heading')}</h3>
   <ul>{CLUSTER_LAB_PENDING.map(k=><li key={k} data-testid={`cluster-lab-pending-${k}`}>{t(`clusterLab.pending.${k}`)}</li>)}</ul>
   <p className="lab-recovery">{t('clusterLab.limits')}</p>
  </section>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('clusterLab.return')}</button>
 </dialog>;
}
