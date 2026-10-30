import {memo,type RefObject} from 'react';
import {sameData} from './renderStability';
import {t} from './i18n';
import {CLASSIFICATION_LAB_COUNTED_STEPS,CLASSIFICATION_LAB_STEPS,type ClassificationLabProgress,type ClassificationLabStep} from './core/classificationLab';
import {CLASSIFICATION_CATALOG} from './core/classification';
import './hubble-lab.css';
import './pulsar-lab.css';
import './pleiades-lab.css';

/** WEB-CLASSIFICATION-GUIDE-01: the Stellar classification (E03) guide, with the PleiadesLabGuide layout. Every mark is
 * recomputed from the current state by classificationLabProgress; nothing is stored. It gives no answer and grades nothing. */
function ClassificationLabGuide({dialogRef,progress,onNavigate}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:ClassificationLabProgress;onNavigate:()=>void}){
 function go(){dialogRef.current?.close();onNavigate();}
 const doneCount=CLASSIFICATION_LAB_COUNTED_STEPS.filter(s=>progress.done[s]).length;
 const practice=CLASSIFICATION_CATALOG.practice.find(p=>p.id===progress.practiceId);
 const statusText=(step:ClassificationLabStep)=>step==='save'?t('classLab.status.save'):t(progress.done[step]?'classLab.status.done':'classLab.status.notYet');
 return <dialog ref={dialogRef} className="hubble-lab-dialog pulsar-lab-dialog pleiades-lab-dialog classification-lab-dialog" aria-labelledby="classification-lab-heading" aria-describedby="classification-lab-intro" data-testid="classification-lab-dialog">
  <div className="lab-heading"><div><div className="eyebrow">{t('classLab.eyebrow')}</div><h2 id="classification-lab-heading">{t('classLab.title')}</h2></div>
   <button className="secondary-button" autoFocus data-testid="classification-lab-close" onClick={()=>dialogRef.current?.close()}>{t('classLab.close')}</button></div>
  <p id="classification-lab-intro">{t('classLab.intro')}</p>
  <p className="lab-recovery" data-testid="classification-lab-adaptation">{t('classLab.adaptation')}</p>
  <section className="lab-progress" aria-labelledby="classification-lab-progress-heading">
   <h3 id="classification-lab-progress-heading">{t('classLab.progress')}</h3>
   <p data-testid="classification-lab-counts" role="status">{t('classLab.counts',{done:doneCount,total:CLASSIFICATION_LAB_COUNTED_STEPS.length})}</p>
   {progress.scope==='practice'?practice&&<p data-testid="classification-lab-practice">{t('classLab.practice',{label:practice.label})}</p>:<p className="lab-recovery" data-testid="classification-lab-scope">{t('classLab.scopeOther')}</p>}
   <p className="pulsar-lab-next" data-testid="classification-lab-next" data-next={progress.next}>{t(`classLab.next.${progress.next}`)}</p>
   <button className="secondary-button" data-testid="classification-lab-continue" onClick={go}>{t('classLab.continue')}</button>
   <details className="lab-progress-help"><summary>{t('classLab.progressMeaning')}</summary><p>{t('classLab.progressHelp')}</p></details>
  </section>
  <ol className="lab-steps pulsar-lab-steps pleiades-lab-steps">
   {CLASSIFICATION_LAB_STEPS.map(step=><li key={step} data-testid={`classification-lab-step-${step}`} data-done={progress.done[step]} data-next={progress.next===step||undefined} data-counted={step!=='save'}>
    <h3><span className="pleiades-lab-mark" aria-hidden="true" data-done={progress.done[step]}/>{t(`classLab.step.${step}.title`)}</h3>
    <p className="pulsar-lab-status" data-testid={`classification-lab-status-${step}`}>{statusText(step)}</p>
    <p>{t(`classLab.step.${step}.help`)}</p>
    {step==='inspect'&&<ul data-testid="classification-lab-tools"><li>{t('classLab.step.inspect.table')}</li><li>{t('classLab.step.inspect.width')}</li><li>{t('classLab.step.inspect.reverse')}</li></ul>}
    <button className="secondary-button" onClick={go}>{t('classLab.goClassification')}</button>
   </li>)}
  </ol>
  <details className="lab-troubleshooting"><summary>{t('classLab.troubleshooting')}</summary><dl>{(['load','draft','limit','width','import']as const).map(key=><div key={key}>
   <dt>{t(`classLab.problem.${key}`)}</dt><dd>{t(`classLab.recover.${key}`)}</dd></div>)}</dl></details>
  <details className="lab-sources"><summary>{t('classLab.sources')}</summary><p>{t('classLab.sourceHelp')}</p>
   <ul><li data-testid="classification-lab-dataset">{t('classLab.dataset',{fingerprint:CLASSIFICATION_CATALOG.fingerprint})}</li><li>{t('classLab.lineList',{sha256:CLASSIFICATION_CATALOG.lineListSha256})}</li></ul><p>{t('classLab.limits')}</p></details>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('classLab.return')}</button>
 </dialog>;
}
// Front Perf: the closed guide re-renders only when its progress (plain data), ref or handler changes.
export default memo(ClassificationLabGuide,(a,b)=>a.dialogRef===b.dialogRef&&a.onNavigate===b.onNavigate&&sameData(a.progress,b.progress));
