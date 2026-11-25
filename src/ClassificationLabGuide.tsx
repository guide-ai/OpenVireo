import {memo,type RefObject} from 'react';
import {sameData} from './renderStability';
import {t} from './i18n';
import {CLASSIFICATION_LAB_COUNTED_STEPS,CLASSIFICATION_LAB_STEPS,type ClassificationLabProgress,type ClassificationLabStep} from './core/classificationLab';
import {CLASSIFICATION_CATALOG} from './core/classification';
import {moreDetail,stepTitle} from './guideMoreDetail';
import {whatNext,whyLead} from './guideLead';
import type {LabSlug} from './seo/labSlugs';
import './hubble-lab.css';
import './pulsar-lab.css';
import './pleiades-lab.css';

/** Front NEWCOMER NC3: a step's title (numbered, as the window shows it), shared with the companion strip's line. */
export const classificationStepTitle=(step:ClassificationLabStep)=>t(`classLab.step.${step}.title`);
/** Front GUIDE-COMPANION: what the guide says under a step's heading and status, shared with the companion strip's Step
 * details. `ids` false (the companion) leaves out the test ids: the closed guide is still in the document. */
export function classificationStepBody(step:ClassificationLabStep,ids=true){
 return <>
    <p>{t(`classLab.step.${step}.help`)}</p>
    {step==='inspect'&&<ul data-testid={ids?'classification-lab-tools':undefined}><li>{t('classLab.step.inspect.table')}</li><li>{t('classLab.step.inspect.width')}</li><li>{t('classLab.step.inspect.reverse')}</li></ul>}
 </>;
}

/** WEB-CLASSIFICATION-GUIDE-01: the Stellar classification (E03) guide, with the PleiadesLabGuide layout. Every mark is
 * recomputed from the current state by classificationLabProgress; nothing is stored. It gives no answer and grades nothing. */
function ClassificationLabGuide({dialogRef,progress,onNavigate,onNext}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:ClassificationLabProgress;onNavigate:()=>void;/** Front NEWCOMER NC4: opens another lab's guide (What next); a stable callback. */onNext:(lab:LabSlug)=>void}){
 function go(){dialogRef.current?.close();onNavigate();}
 const doneCount=CLASSIFICATION_LAB_COUNTED_STEPS.filter(s=>progress.done[s]).length;
 /** The guide's counts line, in its progress block and as What next's recap (Front NEWCOMER NC4). */
 const counts=t('classLab.counts',{done:doneCount,total:CLASSIFICATION_LAB_COUNTED_STEPS.length});
 const practice=CLASSIFICATION_CATALOG.practice.find(p=>p.id===progress.practiceId);
 const statusText=(step:ClassificationLabStep)=>step==='save'?t('classLab.status.save'):t(progress.done[step]?'classLab.status.done':'classLab.status.notYet');
 return <dialog ref={dialogRef} className="hubble-lab-dialog pulsar-lab-dialog pleiades-lab-dialog classification-lab-dialog" aria-labelledby="classification-lab-heading" aria-describedby="classification-lab-why" data-testid="classification-lab-dialog">
  <div className="lab-heading"><div><div className="eyebrow">{t('classLab.eyebrow')}</div><h2 id="classification-lab-heading">{t('classLab.title')}</h2></div>
   <button className="secondary-button" autoFocus data-testid="classification-lab-close" onClick={()=>dialogRef.current?.close()}>{t('classLab.close')}</button></div>
  {whyLead('classification-lab-why',t('classLab.why'),'stellar-classification')}<details className="research-notes"><summary>{t('notes.summary')}</summary><p>{t('classLab.intro')}</p><p>{t('classLab.introOptions')}</p>
   {/* Front NEWCOMER NC3: the adaptation note is a research note (NC4: with the former intro, below the why-line). */}
   <p className="lab-recovery" data-testid="classification-lab-adaptation">{t('classLab.adaptation')}</p></details>
  <section className="lab-progress" aria-labelledby="classification-lab-progress-heading">
   <h3 id="classification-lab-progress-heading">{t('classLab.progress')}</h3>
   <p data-testid="classification-lab-counts" role="status">{counts}</p>
   {progress.scope==='practice'?practice&&<p data-testid="classification-lab-practice">{t('classLab.practice',{label:practice.label})}</p>:<p className="lab-recovery" data-testid="classification-lab-scope">{t('classLab.scopeOther')}</p>}
   <p className="pulsar-lab-next" data-testid="classification-lab-next" data-next={progress.next}>{t(`classLab.next.${progress.next}`)}</p>
   <button className="secondary-button" data-testid="classification-lab-continue" onClick={go}>{t('classLab.continue')}</button>
   <details className="lab-progress-help"><summary>{t('classLab.progressMeaning')}</summary><p>{t('classLab.progressHelp')}</p></details>
  </section>
  <ol className="lab-steps pulsar-lab-steps pleiades-lab-steps">
   {CLASSIFICATION_LAB_STEPS.map(step=><li key={step} data-testid={`classification-lab-step-${step}`} data-done={progress.done[step]} data-next={progress.next===step||undefined} data-counted={step!=='save'}>
    <h3><span className="pleiades-lab-mark" aria-hidden="true" data-done={progress.done[step]}/>{stepTitle(`classification-lab-step-${step}`,classificationStepTitle(step))}</h3>
    <p className="pulsar-lab-status" data-testid={`classification-lab-status-${step}`}>{statusText(step)}</p>
    <button className="secondary-button" onClick={go}>{t('classLab.goClassification')}</button>
    {moreDetail(`classification-lab-step-${step}`,progress.next===step,classificationStepBody(step))}
   </li>)}
  </ol>
  {progress.next==='save'&&whatNext('classification-lab','stellar-classification',next=>{dialogRef.current?.close();onNext(next);},counts)}
  <details className="lab-troubleshooting"><summary>{t('classLab.troubleshooting')}</summary><dl>{(['load','draft','limit','width','import']as const).map(key=><div key={key}>
   <dt>{t(`classLab.problem.${key}`)}</dt><dd>{t(`classLab.recover.${key}`)}</dd></div>)}</dl></details>
  <details className="lab-sources"><summary>{t('classLab.sources')}</summary><p>{t('classLab.sourceHelp')}</p>
   <ul><li data-testid="classification-lab-dataset">{t('classLab.dataset',{fingerprint:CLASSIFICATION_CATALOG.fingerprint})}</li><li>{t('classLab.lineList',{sha256:CLASSIFICATION_CATALOG.lineListSha256})}</li></ul><p>{t('classLab.limits')}</p></details>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('classLab.return')}</button>
 </dialog>;
}
// Front Perf: the closed guide re-renders only when its progress (plain data), ref or handler changes.
export default memo(ClassificationLabGuide,(a,b)=>a.dialogRef===b.dialogRef&&a.onNavigate===b.onNavigate&&a.onNext===b.onNext&&sameData(a.progress,b.progress));
