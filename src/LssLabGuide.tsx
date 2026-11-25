import {memo,type RefObject} from 'react';
import {sameData} from './renderStability';
import {t} from './i18n';
import {LSS_LAB_REPEAT_RECORDS,LSS_LAB_STEPS,type LssLabProgress,type LssLabStep} from './core/lssLab';
import {moreDetail,stepTitle} from './guideMoreDetail';
import {whatNext,whyLead} from './guideLead';
import type {LabSlug} from './seo/labSlugs';
import './hubble-lab.css';
export type LssLabDestination='lss-survey'|'lss-wedge';
const STEP_DESTINATION:Readonly<Record<LssLabStep,LssLabDestination|null>>={load:'lss-survey',observe:'lss-survey',record:'lss-survey',repeat:'lss-survey',wedge:'lss-wedge',describe:'lss-survey',save:null};
/** Where a step is carried out. Front GUIDE-COMPANION: "Plot my records in the wedge" is a button of the survey page, so until
 * something is plotted the wedge step leads there; once records are plotted it leads to the wedge itself. */
export const lssStepDestination=(step:LssLabStep,progress:LssLabProgress):LssLabDestination|null=>step==='wedge'&&!progress.done.wedge?'lss-survey':STEP_DESTINATION[step];
/** The guide's counts line (steps, records, galaxies, fields, plotted), shared with the companion strip. */
export const lssCountsText=(progress:LssLabProgress)=>{const s=progress.summary;return t('lssLab.counts',{done:LSS_LAB_STEPS.filter(step=>progress.done[step]).length,total:LSS_LAB_STEPS.length,records:s.records,galaxies:s.galaxies,fields:s.fields,plotted:s.plotted});};
/** What the guide says under a step's heading, shared with the companion strip's Step details. */
export const lssStepHelp=(step:LssLabStep)=>step==='repeat'?t('lssLab.help.repeat',{n:LSS_LAB_REPEAT_RECORDS}):t(`lssLab.help.${step}`);
/** E02 guide (HubbleLabGuide layout). Check marks are recomputed from the current survey by lssLabProgress; nothing is stored,
 * and no redshift is judged. */
function LssLabGuide({dialogRef,progress,onNavigate,onNext}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:LssLabProgress;onNavigate:(destination:LssLabDestination)=>void;/** Front NEWCOMER NC4: opens another lab's guide (What next); a stable callback. */onNext:(lab:LabSlug)=>void}){
 function go(destination:LssLabDestination){dialogRef.current?.close();onNavigate(destination);}
 return <dialog ref={dialogRef} className="hubble-lab-dialog" aria-labelledby="lss-lab-heading" aria-describedby="lss-lab-why" data-testid="lss-lab">
  <div className="lab-heading"><div><div className="eyebrow">{t('lssLab.eyebrow')}</div><h2 id="lss-lab-heading">{t('lssLab.title')}</h2></div><button className="secondary-button" autoFocus onClick={()=>dialogRef.current?.close()}>{t('lssLab.close')}</button></div>
  {whyLead('lss-lab-why',t('lssLab.why'),'large-scale-structure')}<details className="research-notes"><summary>{t('notes.summary')}</summary><p>{t('lssLab.intro')}</p><p>{t('lssLab.introOptions')}</p></details>
  <section className="lab-progress" aria-labelledby="lss-lab-progress"><h3 id="lss-lab-progress">{t('lssLab.progress')}</h3><p role="status" data-testid="lss-lab-counts">{lssCountsText(progress)}</p></section>
  <ol className="lab-steps">{LSS_LAB_STEPS.map(step=>{const d=lssStepDestination(step,progress);return <li key={step} data-testid={`lss-lab-step-${step}`} data-done={progress.done[step]?'true':'false'} data-next={progress.next===step||undefined}><h3>{stepTitle(`lss-lab-step-${step}`,t(`lssLab.step.${step}`))} <span>{progress.done[step]?t('lssLab.done'):t('lssLab.todo')}</span></h3>{d&&<button className="secondary-button" onClick={()=>go(d)}>{t(d==='lss-wedge'?'lssLab.goWedge':'lssLab.goSurvey')}</button>}{moreDetail(`lss-lab-step-${step}`,progress.next===step,<p>{lssStepHelp(step)}</p>)}</li>;})}</ol>
  <section><h3>{t('lssLab.interpretTitle')}</h3><ul>{(['wall','voids','fingers','limits'] as const).map(k=><li key={k}>{t(`lssLab.reflect.${k}`)}</li>)}</ul></section>
  {progress.next==='done'&&whatNext('lss-lab','large-scale-structure',next=>{dialogRef.current?.close();onNext(next);},lssCountsText(progress))}
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('lssLab.return')}</button>
 </dialog>;
}
// Front Perf: the closed guide re-renders only when its progress (plain data), ref or handler changes.
export default memo(LssLabGuide,(a,b)=>a.dialogRef===b.dialogRef&&a.onNavigate===b.onNavigate&&a.onNext===b.onNext&&sameData(a.progress,b.progress));
