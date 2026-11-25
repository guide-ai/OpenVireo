import {memo,type RefObject} from 'react';
import {sameData} from './renderStability';
import {OBJECT_X_GUIDE as G} from './objectx/ObjectXMessages';
import {OBJECT_X_LAB_STEPS,type ObjectXLabProgress,type ObjectXLabStep} from './core/objectXLab';
import {t} from './i18n';
import {moreDetail,stepTitle} from './guideMoreDetail';
import {whatNext,whyLead} from './guideLead';
import {glossText,termScope,wordsUsed} from './help/glossary';
import type {LabSlug} from './seo/labSlugs';
import './hubble-lab.css';
export type ObjectXLabDestination='object-x'|'observatory';
const STEP_DESTINATION:Readonly<Record<ObjectXLabStep,ObjectXLabDestination|null>>={target:'object-x',clock:'object-x',list:'object-x',image:'observatory',repeat:'observatory',measure:'object-x',classify:'object-x',describe:'object-x',reveal:'object-x',save:null};
/** Where each step is carried out (the companion's Show me where goes there too). */
export const objectXStepDestination=(step:ObjectXLabStep):ObjectXLabDestination|null=>STEP_DESTINATION[step];
/** Front NEWCOMER NC7: what the guide says under a step, with its glossary terms marked (help/glossary.tsx; the snapshot names a
 * map string by its path in the objectXGuide map), shared with the companion strip's Step details; `found` collects the window's. */
export const objectXStepHelp=(step:ObjectXLabStep,found?:Set<string>)=>glossText(termScope(found),`objectXGuide.steps.${step}.1`,G.steps[step][1]);
/** E08 guide (HubbleLabGuide layout). Check marks are recomputed from the current lab by objectXLabProgress; nothing is
 * stored, and the answer is never judged before the reveal. */
function ObjectXLabGuide({dialogRef,progress,onNavigate,onNext}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:ObjectXLabProgress;onNavigate:(destination:ObjectXLabDestination)=>void;/** Front NEWCOMER NC4: opens another lab's guide (What next); a stable callback. */onNext:(lab:LabSlug)=>void}){
 function go(destination:ObjectXLabDestination){dialogRef.current?.close();onNavigate(destination);}
 const done=OBJECT_X_LAB_STEPS.filter(step=>progress.done[step]).length;
 /** The guide's counts line, in its progress block and as What next's recap (Front NEWCOMER NC4). */
 const counts=G.counts(done,OBJECT_X_LAB_STEPS.length,progress.summary.imagesOfTarget);
 /** Front NEWCOMER NC7: the glossary terms marked in this window, for its «Words used in this guide». */
 const found=new Set<string>();
 return <dialog ref={dialogRef} className="hubble-lab-dialog" aria-labelledby="objectx-lab-heading" aria-describedby="objectx-lab-why" data-testid="objectx-guide">
  <div className="lab-heading"><div><div className="eyebrow">{G.eyebrow}</div><h2 id="objectx-lab-heading">{G.title}</h2></div><button className="secondary-button" autoFocus onClick={()=>dialogRef.current?.close()}>{G.close}</button></div>
  {whyLead('objectx-lab-why',glossText(termScope(found),'objectXGuide.why',G.why),'object-x')}<details className="research-notes"><summary>{t('notes.summary')}</summary><p>{G.intro}</p></details>
  <section className="lab-progress" aria-labelledby="objectx-lab-progress"><h3 id="objectx-lab-progress">{G.progress}</h3><p role="status" data-testid="objectx-guide-counts">{counts}</p></section>
  <ol className="lab-steps">{OBJECT_X_LAB_STEPS.map(step=>{const d=STEP_DESTINATION[step],[title]=G.steps[step];return <li key={step} data-testid={`objectx-guide-step-${step}`} data-done={progress.done[step]?'true':'false'} data-next={progress.next===step||undefined}>
   <h3>{stepTitle(`objectx-guide-step-${step}`,title)} <span>{progress.done[step]?G.done:G.todo}</span></h3>
   {d&&<button className="secondary-button" onClick={()=>go(d)}>{d==='observatory'?G.goObservatory:G.go}</button>}
   {moreDetail(`objectx-guide-step-${step}`,progress.next===step,<p>{objectXStepHelp(step,found)}</p>)}</li>;})}</ol>
  {progress.next==='done'&&whatNext('objectx-lab','object-x',next=>{dialogRef.current?.close();onNext(next);},counts)}
  {wordsUsed('objectx-lab-terms',found)}
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{G.return}</button>
 </dialog>;
}
// Front Perf: the closed guide re-renders only when its progress (plain data), ref or handler changes.
export default memo(ObjectXLabGuide,(a,b)=>a.dialogRef===b.dialogRef&&a.onNavigate===b.onNavigate&&a.onNext===b.onNext&&sameData(a.progress,b.progress));
