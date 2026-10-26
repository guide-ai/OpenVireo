import type {RefObject} from 'react';
import {t} from './i18n';
import {PULSAR_LAB_REQUIRED_STEPS,PULSAR_LAB_STEPS,type PulsarLabProgress,type PulsarLabStep} from './core/pulsarLab';
import {PULSAR_EXERCISE_SCENARIO} from './core/pulsarExerciseStart';
import {BUNDLED_PULSAR_CATALOG} from './io/bundledPulsarCatalog';
import './hubble-lab.css';
import './pulsar-lab.css';
export type PulsarLabDestination='radio-control'|'pulsar-analysis';
/** Where each step is carried out. */
const STEP_DESTINATION:Readonly<Record<PulsarLabStep,PulsarLabDestination>>={setup:'radio-control',catalog:'radio-control',point:'radio-control',channels:'radio-control',
 capture:'radio-control',period:'pulsar-analysis',delay:'pulsar-analysis',investigation:'pulsar-analysis',save:'pulsar-analysis'};
/** Steps whose "done" is a reading recorded by the learner (never a correctness judgement). */
const READING_STEPS:ReadonlySet<PulsarLabStep>=new Set(['period','delay']);

/** WEB-PULSAR-GUIDE-01: the Pulsars (E06) guide, with the HubbleLabGuide layout. Every check mark is recomputed from the current
 * state by pulsarLabProgress; nothing is stored. The guide explains manual arithmetic; it computes no measurement itself. */
export default function PulsarLabGuide({dialogRef,progress,onNavigate}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:PulsarLabProgress;onNavigate:(destination:PulsarLabDestination)=>void}){
 function go(destination:PulsarLabDestination){dialogRef.current?.close();onNavigate(destination);}
 const doneCount=PULSAR_LAB_REQUIRED_STEPS.filter(s=>progress.done[s]).length;
 const statusText=(step:PulsarLabStep)=>step==='save'
  ?t(progress.done.save?'pulsarLab.status.saveCopy':'pulsarLab.status.saveNone')
  :step==='investigation'?t(`pulsarLab.status.investigation.${progress.investigation}`)
  :progress.done[step]?t(READING_STEPS.has(step)?'pulsarLab.status.recorded':'pulsarLab.status.done'):t('pulsarLab.status.notYet');
 return <dialog ref={dialogRef} className="hubble-lab-dialog pulsar-lab-dialog" aria-labelledby="pulsar-lab-heading" aria-describedby="pulsar-lab-intro" data-testid="pulsar-lab-dialog">
  <div className="lab-heading"><div><div className="eyebrow">{t('pulsarLab.eyebrow')}</div><h2 id="pulsar-lab-heading">{t('pulsarLab.title')}</h2></div>
   <button className="secondary-button" autoFocus data-testid="pulsar-lab-close" onClick={()=>dialogRef.current?.close()}>{t('pulsarLab.close')}</button></div>
  <p id="pulsar-lab-intro">{t('pulsarLab.intro')}</p>
  <section className="lab-progress" aria-labelledby="pulsar-lab-progress-heading">
   <h3 id="pulsar-lab-progress-heading">{t('pulsarLab.progress')}</h3>
   <p data-testid="pulsar-lab-counts" role="status">{t('pulsarLab.counts',{done:doneCount,total:PULSAR_LAB_REQUIRED_STEPS.length})}</p>
   {/* Start keeps a Tracking that is off once the panel is on: name the control that finishes setup. */}
   <p className="pulsar-lab-next" data-testid="pulsar-lab-next" data-next={progress.next} data-tracking-off={progress.next==='setup'&&progress.trackingOff||undefined}>
    {progress.next==='setup'&&progress.trackingOff?t('pulsarLab.next.tracking'):t(`pulsarLab.next.${progress.next}`)}</p>
   <p className="lab-recovery" data-testid="pulsar-lab-backup" data-backup={progress.investigationBackup}>{t('pulsarLab.backup')}</p>
   {progress.recordArmed&&<p className="lab-recovery" data-testid="pulsar-lab-armed">{t('pulsarLab.armed')}</p>}
   <button className="secondary-button" data-testid="pulsar-lab-continue" onClick={()=>go(STEP_DESTINATION[progress.next])}>{t('pulsarLab.continue')}</button>
   <details className="lab-progress-help"><summary>{t('pulsarLab.progressMeaning')}</summary><p>{t('pulsarLab.progressHelp')}</p></details>
  </section>
  <ol className="lab-steps pulsar-lab-steps">
   {PULSAR_LAB_STEPS.map(step=><li key={step} data-testid={`pulsar-lab-step-${step}`} data-done={progress.done[step]} data-next={progress.next===step||undefined}>
    <h3><span className="pulsar-lab-mark" aria-hidden="true">{progress.done[step]?'✓':'○'}</span> {t(`pulsarLab.step.${step}.title`)}</h3>
    <p className="pulsar-lab-status" data-testid={`pulsar-lab-status-${step}`}>{statusText(step)}</p>
    <p>{step==='setup'?t('pulsarLab.step.setup.help',{ut:PULSAR_EXERCISE_SCENARIO.ut}):step==='catalog'?t('pulsarLab.step.catalog.help',{file:BUNDLED_PULSAR_CATALOG.name}):t(`pulsarLab.step.${step}.help`)}</p>
    {step==='channels'&&<p className="lab-recovery" data-testid="pulsar-lab-add-disarms">{t('pulsarLab.step.channels.disarm')}</p>}
    {step==='channels'&&<p>{t('pulsarLab.step.channels.factor')}</p>}
    {step==='period'&&<p data-testid="pulsar-lab-period-formula">{t('pulsarLab.step.period.formula')}</p>}
    {step==='delay'&&<><p data-testid="pulsar-lab-delay-formula"><code>{t('pulsarLab.step.delay.formula')}</code></p><p>{t('pulsarLab.step.delay.source')}</p></>}
    {step==='investigation'&&<p className="lab-recovery" data-testid="pulsar-lab-investigation-note" data-investigation={progress.investigation}>{t('pulsarLab.step.investigation.note')}</p>}
    {step==='save'&&<p data-testid="pulsar-lab-save-optional">{t('pulsarLab.step.save.optional')}</p>}
    <button className="secondary-button" onClick={()=>go(STEP_DESTINATION[step])}>{t(STEP_DESTINATION[step]==='radio-control'?'pulsarLab.goRadio':'pulsarLab.goAnalysis')}</button>
   </li>)}
  </ol>
  <section aria-labelledby="pulsar-lab-data-heading" data-testid="pulsar-lab-data-kinds">
   <h3 id="pulsar-lab-data-heading">{t('pulsarLab.data.heading')}</h3>
   <dl className="pulsar-lab-kinds">{(['reference','model','supplied'] as const).map(k=><div key={k}><dt>{t(`pulsarLab.data.${k}.term`)}</dt><dd>{t(`pulsarLab.data.${k}.help`)}</dd></div>)}</dl>
  </section>
  <details className="lab-troubleshooting"><summary>{t('pulsarLab.troubleshooting')}</summary><dl>{(['beam','clock','tick','disarm','clip','catalog','tracking']as const).map(key=><div key={key}>
   <dt>{t(`pulsarLab.problem.${key}`)}</dt><dd>{t(`pulsarLab.recover.${key}`)}</dd></div>)}</dl></details>
  <details className="lab-sources"><summary>{t('pulsarLab.sources')}</summary><p>{t('pulsarLab.sourceHelp')}</p>
   <ul><li>{BUNDLED_PULSAR_CATALOG.name}<br/>{t('pulsarParameters.reference.sha')} <code>{BUNDLED_PULSAR_CATALOG.sha256}</code></li></ul><p>{t('pulsarLab.limits')}</p></details>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('pulsarLab.return')}</button>
 </dialog>;
}
