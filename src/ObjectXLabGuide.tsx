import {memo,type RefObject} from 'react';
import {sameData} from './renderStability';
import {OBJECT_X_GUIDE_EN as G} from './objectx/ObjectXMessages';
import {OBJECT_X_LAB_STEPS,type ObjectXLabProgress,type ObjectXLabStep} from './core/objectXLab';
import './hubble-lab.css';
export type ObjectXLabDestination='object-x'|'observatory';
const STEP_DESTINATION:Readonly<Record<ObjectXLabStep,ObjectXLabDestination|null>>={target:'object-x',clock:'object-x',list:'object-x',image:'observatory',repeat:'observatory',measure:'object-x',classify:'object-x',describe:'object-x',reveal:'object-x',save:null};
/** E08 guide (HubbleLabGuide layout). Check marks are recomputed from the current lab by objectXLabProgress; nothing is
 * stored, and the answer is never judged before the reveal. */
function ObjectXLabGuide({dialogRef,progress,onNavigate}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:ObjectXLabProgress;onNavigate:(destination:ObjectXLabDestination)=>void}){
 function go(destination:ObjectXLabDestination){dialogRef.current?.close();onNavigate(destination);}
 const done=OBJECT_X_LAB_STEPS.filter(step=>progress.done[step]).length;
 return <dialog ref={dialogRef} className="hubble-lab-dialog" aria-labelledby="objectx-lab-heading" aria-describedby="objectx-lab-intro" data-testid="objectx-guide">
  <div className="lab-heading"><div><div className="eyebrow">{G.eyebrow}</div><h2 id="objectx-lab-heading">{G.title}</h2></div><button className="secondary-button" autoFocus onClick={()=>dialogRef.current?.close()}>{G.close}</button></div>
  <p id="objectx-lab-intro">{G.intro}</p>
  <section className="lab-progress" aria-labelledby="objectx-lab-progress"><h3 id="objectx-lab-progress">{G.progress}</h3><p role="status" data-testid="objectx-guide-counts">{G.counts(done,OBJECT_X_LAB_STEPS.length,progress.summary.imagesOfTarget)}</p></section>
  <ol className="lab-steps">{OBJECT_X_LAB_STEPS.map(step=>{const d=STEP_DESTINATION[step],[title,help]=G.steps[step];return <li key={step} data-testid={`objectx-guide-step-${step}`} data-done={progress.done[step]?'true':'false'}>
   <h3>{title} <span>{progress.done[step]?G.done:G.todo}</span></h3><p>{help}</p>
   {d&&<button className="secondary-button" onClick={()=>go(d)}>{d==='observatory'?G.goObservatory:G.go}</button>}</li>;})}</ol>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{G.return}</button>
 </dialog>;
}
// Front Perf: the closed guide re-renders only when its progress (plain data), ref or handler changes.
export default memo(ObjectXLabGuide,(a,b)=>a.dialogRef===b.dialogRef&&a.onNavigate===b.onNavigate&&sameData(a.progress,b.progress));
