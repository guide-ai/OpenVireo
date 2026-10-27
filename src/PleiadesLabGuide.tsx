import type {RefObject} from 'react';
import {t} from './i18n';
import {PLEIADES_LAB_COUNTED_STEPS,PLEIADES_LAB_STEPS,type PleiadesLabProgress,type PleiadesLabStep} from './core/pleiadesLab';
import {PLEIADES_HTL} from './core/pleiadesHotList';
import './hubble-lab.css';
import './pulsar-lab.css';
import './pleiades-lab.css';
/** 'observations' opens the own-pairs Data from Observations view (phase1 item1.9); it is a link, not a counted step. */
export type PleiadesLabDestination='observatory'|'photometer'|'observations';
/** Where each step is carried out. */
const STEP_DESTINATION:Readonly<Record<PleiadesLabStep,PleiadesLabDestination>>={list:'observatory',point:'observatory',activate:'photometer',
 measure:'photometer',record:'photometer',color:'photometer',sample:'photometer',distance:'photometer',save:'photometer'};

/** WEB-PLEIADES-GUIDE-01: the Pleiades photometry (E04) guide, with the PulsarLabGuide layout. Every mark is recomputed from the
 * current state by pleiadesLabProgress; nothing is stored. The guide explains the paper-and-overlay procedure; it computes no
 * magnitude, color or distance itself, and it does not mark the whole E05 exercise complete. */
export default function PleiadesLabGuide({dialogRef,progress,onNavigate}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:PleiadesLabProgress;onNavigate:(destination:PleiadesLabDestination)=>void}){
 function go(destination:PleiadesLabDestination){dialogRef.current?.close();onNavigate(destination);}
 const doneCount=PLEIADES_LAB_COUNTED_STEPS.filter(s=>progress.done[s]).length;
 const statusText=(step:PleiadesLabStep)=>step==='save'?t('pleiadesLab.status.save')
  :step==='sample'?t('pleiadesLab.status.sample',{count:progress.colorTargets,total:progress.sampleTargets})
  :t(progress.done[step]?'pleiadesLab.status.done':'pleiadesLab.status.notYet');
 return <dialog ref={dialogRef} className="hubble-lab-dialog pulsar-lab-dialog pleiades-lab-dialog" aria-labelledby="pleiades-lab-heading" aria-describedby="pleiades-lab-intro" data-testid="pleiades-lab-dialog">
  <div className="lab-heading"><div><div className="eyebrow">{t('pleiadesLab.eyebrow')}</div><h2 id="pleiades-lab-heading">{t('pleiadesLab.title')}</h2></div>
   <button className="secondary-button" autoFocus data-testid="pleiades-lab-close" onClick={()=>dialogRef.current?.close()}>{t('pleiadesLab.close')}</button></div>
  <p id="pleiades-lab-intro">{t('pleiadesLab.intro')}</p>
  <p className="lab-recovery" data-testid="pleiades-lab-adaptation">{t('pleiadesLab.adaptation')}</p>
  <section className="lab-progress" aria-labelledby="pleiades-lab-progress-heading">
   <h3 id="pleiades-lab-progress-heading">{t('pleiadesLab.progress')}</h3>
   <p data-testid="pleiades-lab-counts" role="status">{t('pleiadesLab.counts',{done:doneCount,total:PLEIADES_LAB_COUNTED_STEPS.length})}</p>
   <p data-testid="pleiades-lab-coverage">{t('pleiadesLab.coverage',{count:progress.colorTargets,total:progress.sampleTargets})}</p>
   <p className="pulsar-lab-next" data-testid="pleiades-lab-next" data-next={progress.next}>{t(`pleiadesLab.next.${progress.next}`)}</p>
   <p className="lab-recovery" data-testid="pleiades-lab-e05">{t('pleiadesLab.e05')}</p>
   <button className="secondary-button" data-testid="pleiades-lab-observations" onClick={()=>go('observations')}>{t('pleiadesLab.goObservations')}</button>
   <button className="secondary-button" data-testid="pleiades-lab-continue" onClick={()=>go(STEP_DESTINATION[progress.next])}>{t('pleiadesLab.continue')}</button>
   <details className="lab-progress-help"><summary>{t('pleiadesLab.progressMeaning')}</summary><p>{t('pleiadesLab.progressHelp')}</p></details>
  </section>
  <ol className="lab-steps pulsar-lab-steps pleiades-lab-steps">
   {PLEIADES_LAB_STEPS.map(step=><li key={step} data-testid={`pleiades-lab-step-${step}`} data-done={progress.done[step]} data-next={progress.next===step||undefined} data-counted={step!=='save'}>
    <h3><span className="pleiades-lab-mark" aria-hidden="true" data-done={progress.done[step]}/>{t(`pleiadesLab.step.${step}.title`)}</h3>
    <p className="pulsar-lab-status" data-testid={`pleiades-lab-status-${step}`}>{statusText(step)}</p>
    <p>{t(`pleiadesLab.step.${step}.help`)}</p>
    {step==='sample'&&<p className="lab-recovery" data-testid="pleiades-lab-fit-minimum">{t('pleiadesLab.step.sample.minimum')}</p>}
    {step==='distance'&&<p data-testid="pleiades-lab-distance-formula">{t('pleiadesLab.step.distance.formula')}</p>}
    {step==='distance'&&<p>{t('pleiadesLab.step.distance.optional')}</p>}
    <button className="secondary-button" onClick={()=>go(STEP_DESTINATION[step])}>{t(STEP_DESTINATION[step]==='observatory'?'pleiadesLab.goObservatory':'pleiadesLab.goPhotometer')}</button>
   </li>)}
  </ol>
  <details className="lab-troubleshooting"><summary>{t('pleiadesLab.troubleshooting')}</summary><dl>{(['card','blocked','start','sky','budget']as const).map(key=><div key={key}>
   <dt>{t(`pleiadesLab.problem.${key}`)}</dt><dd>{t(`pleiadesLab.recover.${key}`)}</dd></div>)}</dl></details>
  <details className="lab-sources"><summary>{t('pleiadesLab.sources')}</summary><p>{t('pleiadesLab.sourceHelp')}</p>
   <ul><li data-testid="pleiades-lab-source-file">{t('pleiadesLab.sourceFile',{name:PLEIADES_HTL.name,bytes:PLEIADES_HTL.bytes,sha256:PLEIADES_HTL.sha256})}</li><li>{t('pleiadesLab.archiveMember',{member:PLEIADES_HTL.archiveMember,sha256:PLEIADES_HTL.archiveSha256})}</li></ul><p>{t('pleiadesLab.limits')}</p></details>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('pleiadesLab.return')}</button>
 </dialog>;
}
