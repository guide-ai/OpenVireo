/** WEB-PLEIADES-GUIDE-01: progress of the Pleiades photometry (E04) student guide, recomputed from the current state on every
 * render. Nothing is stored: a page reload loses the list/pointing marks, and a Restore derives the measurement marks again from
 * the replayed photometer state. "Done" means the learner acquired, transcribed or confirmed something; it never judges whether a
 * value is correct. The 16-star sample step is explicit web exercise coverage of the admitted original targets, not a historical
 * classroom minimum or a grade; the existing two-pair fit minimum stays a technical guard. Pure: no React, i18n, clock or I/O. */
import type {PhotometerState} from './photometer';
import {pleiadesSkyContext} from './pleiadesAnalysis';
import {PLEIADES_ADMITTED_ROWS,type PhotometerPointingAccess} from './pleiadesHotList';

/** What the photometer reports (only when it changes). */
export type PleiadesExerciseSummary=Readonly<{
 armed:boolean;
 /** Browser pointing guard for the current photometer field. */
 access:PhotometerPointingAccess;
 /** Admitted targets with available-reduction B and V object readings. */
 measuredTargets:number;
 /** Admitted targets with confirmed notebook entries for one B and one V object reading. */
 recordedTargets:number;
 /** Admitted targets with a confirmed B−V pair of their own. */
 colorTargets:number;
 /** A confirmed manual cluster fit exists (a new color clears it in the photometer core). */
 fit:boolean;
}>;
export const EMPTY_PLEIADES_EXERCISE_SUMMARY:PleiadesExerciseSummary=Object.freeze({armed:false,access:'pointing',measuredTargets:0,recordedTargets:0,colorTargets:0,fit:false});
export const samePleiadesExerciseSummary=(a:PleiadesExerciseSummary,b:PleiadesExerciseSummary)=>
 a.armed===b.armed&&a.access===b.access&&a.measuredTargets===b.measuredTargets&&a.recordedTargets===b.recordedTargets&&a.colorTargets===b.colorTargets&&a.fit===b.fit;
/** Number of admitted original targets the sample step covers. */
export const PLEIADES_SAMPLE_TARGETS=PLEIADES_ADMITTED_ROWS.length;

export function pleiadesExerciseSummary(state:PhotometerState|null,access:PhotometerPointingAccess):PleiadesExerciseSummary{
 if(!state)return Object.freeze({...EMPTY_PLEIADES_EXERCISE_SUMMARY,access});
 const entered=new Set(state.entries.map(e=>e.readingId));
 let measuredTargets=0,recordedTargets=0,colorTargets=0;
 for(const row of PLEIADES_ADMITTED_ROWS){
  const objects=state.readings.filter(r=>r.kind==='object'&&r.targetId===row.catalogId&&r.reduction?.status==='available'&&pleiadesSkyContext(state,r));
  const has=(filter:'B'|'V',confirmed:boolean)=>objects.some(r=>r.filter===filter&&(!confirmed||entered.has(r.id)));
  if(has('B',false)&&has('V',false))measuredTargets++;
  if(has('B',true)&&has('V',true))recordedTargets++;
  const color=state.colors[row.catalogId];
  if(color&&color.targetId===row.catalogId&&entered.has(color.bReadingId)&&entered.has(color.vReadingId)&&[color.bReadingId,color.vReadingId].every(id=>objects.some(r=>r.id===id)))colorTargets++;
 }
 return Object.freeze({armed:state.armed,access,measuredTargets,recordedTargets,colorTargets,fit:!!state.clusterFit});
}

/** 'save' is an instruction (Save investigation, reload, Restore) and is never counted. */
export type PleiadesLabStep='list'|'point'|'activate'|'measure'|'record'|'color'|'sample'|'distance'|'save';
export const PLEIADES_LAB_STEPS:readonly PleiadesLabStep[]=Object.freeze(['list','point','activate','measure','record','color','sample','distance','save']);
export const PLEIADES_LAB_COUNTED_STEPS:readonly PleiadesLabStep[]=Object.freeze(PLEIADES_LAB_STEPS.filter(s=>s!=='save'));
export type PleiadesLabProgress=Readonly<{
 done:Readonly<Record<PleiadesLabStep,boolean>>;
 /** First counted step not done, skipping list/point/activate once a B/V measurement exists; 'save' when all are done. */
 next:PleiadesLabStep;
 colorTargets:number;
 sampleTargets:number;
}>;

/** list: the shared Hot List currently holds the 24 exercise rows in order. pointed: the App pointing equals an admitted row. */
export function pleiadesLabProgress(i:Readonly<{list:boolean;pointed:boolean;photometer:PleiadesExerciseSummary}>):PleiadesLabProgress{
 const p=i.photometer,ready=p.armed&&p.access==='ready';
 const done:Record<PleiadesLabStep,boolean>={
  list:i.list,
  point:i.pointed||ready,
  activate:ready,
  measure:p.measuredTargets>=1,
  record:p.recordedTargets>=1,
  color:p.colorTargets>=1,
  sample:p.colorTargets>=PLEIADES_SAMPLE_TARGETS,
  distance:p.fit,
  save:false,
 };
 const measured=done.measure;
 const next=PLEIADES_LAB_COUNTED_STEPS.find(s=>!done[s]&&!(measured&&(s==='list'||s==='point'||s==='activate')))??'save';
 return Object.freeze({done:Object.freeze(done),next,colorTargets:p.colorTargets,sampleTargets:PLEIADES_SAMPLE_TARGETS});
}
