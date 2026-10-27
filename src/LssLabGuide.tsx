import type {RefObject} from 'react';
import {t} from './i18n';
import {LSS_LAB_REPEAT_RECORDS,LSS_LAB_STEPS,type LssLabProgress,type LssLabStep} from './core/lssLab';
import './hubble-lab.css';
export type LssLabDestination='lss-survey'|'lss-wedge';
const STEP_DESTINATION:Readonly<Record<LssLabStep,LssLabDestination|null>>={load:'lss-survey',observe:'lss-survey',record:'lss-survey',repeat:'lss-survey',wedge:'lss-wedge',describe:'lss-survey',save:null};
/** E02 guide (HubbleLabGuide layout). Check marks are recomputed from the current survey by lssLabProgress; nothing is stored,
 * and no redshift is judged. */
export default function LssLabGuide({dialogRef,progress,onNavigate}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:LssLabProgress;onNavigate:(destination:LssLabDestination)=>void}){
 function go(destination:LssLabDestination){dialogRef.current?.close();onNavigate(destination);}
 const s=progress.summary,done=LSS_LAB_STEPS.filter(step=>progress.done[step]).length;
 return <dialog ref={dialogRef} className="hubble-lab-dialog" aria-labelledby="lss-lab-heading" aria-describedby="lss-lab-intro" data-testid="lss-lab">
  <div className="lab-heading"><div><div className="eyebrow">{t('lssLab.eyebrow')}</div><h2 id="lss-lab-heading">{t('lssLab.title')}</h2></div><button className="secondary-button" autoFocus onClick={()=>dialogRef.current?.close()}>{t('lssLab.close')}</button></div>
  <p id="lss-lab-intro">{t('lssLab.intro')}</p>
  <section className="lab-progress" aria-labelledby="lss-lab-progress"><h3 id="lss-lab-progress">{t('lssLab.progress')}</h3><p role="status" data-testid="lss-lab-counts">{t('lssLab.counts',{done,total:LSS_LAB_STEPS.length,records:s.records,fields:s.fields,plotted:s.plotted})}</p></section>
  <ol className="lab-steps">{LSS_LAB_STEPS.map(step=>{const d=STEP_DESTINATION[step];return <li key={step} data-testid={`lss-lab-step-${step}`} data-done={progress.done[step]?'true':'false'}><h3>{t(`lssLab.step.${step}`)} <span>{progress.done[step]?t('lssLab.done'):t('lssLab.todo')}</span></h3><p>{step==='repeat'?t('lssLab.help.repeat',{n:LSS_LAB_REPEAT_RECORDS}):t(`lssLab.help.${step}`)}</p>{d&&<button className="secondary-button" onClick={()=>go(d)}>{t(d==='lss-wedge'?'lssLab.goWedge':'lssLab.goSurvey')}</button>}</li>;})}</ol>
  <section><h3>{t('lssLab.interpretTitle')}</h3><ul>{(['wall','voids','fingers','limits'] as const).map(k=><li key={k}>{t(`lssLab.reflect.${k}`)}</li>)}</ul></section>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('lssLab.return')}</button>
 </dialog>;
}
