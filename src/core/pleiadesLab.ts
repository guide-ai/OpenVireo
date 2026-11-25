/** WEB-PLEIADES-GUIDE-01: progress of the Pleiades photometry (E04) student guide, recomputed from the current state on every
 * render. Nothing is stored: a page reload loses the list/pointing marks, and a Restore derives the measurement marks again from
 * the replayed photometer state. "Done" means the learner acquired, transcribed or confirmed something; it never judges whether a
 * value is correct. The sample step (all 24 admitted stars since 2026-10-28; 16 before) is explicit web exercise coverage of the admitted original targets, not a historical
 * classroom minimum or a grade; the existing two-pair fit minimum stays a technical guard. Pure: no React, i18n, clock or I/O. */
import type {PhotometerState} from './photometer';
import {pleiadesSkyContext} from './pleiadesSkyContext';
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
 /** Front GUIDE-COMPANION, for Show me where only (never a mark): what the selected photometry target still needs when it is
  * an admitted row (null otherwise). */
 current:PleiadesTargetNeed|null;
}>;
/** B and V readings of the star ('measure'), their notebook entries ('record'), its B−V ('color'), or nothing: choose the next star ('done'). */
export type PleiadesTargetNeed='measure'|'record'|'color'|'done';
export const EMPTY_PLEIADES_EXERCISE_SUMMARY:PleiadesExerciseSummary=Object.freeze({armed:false,access:'pointing',measuredTargets:0,recordedTargets:0,colorTargets:0,fit:false,current:null});
export const samePleiadesExerciseSummary=(a:PleiadesExerciseSummary,b:PleiadesExerciseSummary)=>
 a.armed===b.armed&&a.access===b.access&&a.measuredTargets===b.measuredTargets&&a.recordedTargets===b.recordedTargets&&a.colorTargets===b.colorTargets&&a.fit===b.fit&&a.current===b.current;
/** Number of admitted original targets the sample step covers. */
export const PLEIADES_SAMPLE_TARGETS=PLEIADES_ADMITTED_ROWS.length;

export function pleiadesExerciseSummary(state:PhotometerState|null,access:PhotometerPointingAccess):PleiadesExerciseSummary{
 if(!state)return Object.freeze({...EMPTY_PLEIADES_EXERCISE_SUMMARY,access});
 const entered=new Set(state.entries.map(e=>e.readingId));
 let measuredTargets=0,recordedTargets=0,colorTargets=0,current:PleiadesTargetNeed|null=null;
 for(const row of PLEIADES_ADMITTED_ROWS){
  const objects=state.readings.filter(r=>r.kind==='object'&&r.targetId===row.catalogId&&r.reduction?.status==='available'&&pleiadesSkyContext(state,r));
  const has=(filter:'B'|'V',confirmed:boolean)=>objects.some(r=>r.filter===filter&&(!confirmed||entered.has(r.id)));
  const measured=has('B',false)&&has('V',false),recorded=has('B',true)&&has('V',true);
  if(measured)measuredTargets++;
  if(recorded)recordedTargets++;
  const color=state.colors[row.catalogId];
  const colored=!!color&&color.targetId===row.catalogId&&entered.has(color.bReadingId)&&entered.has(color.vReadingId)&&[color.bReadingId,color.vReadingId].every(id=>objects.some(r=>r.id===id));
  if(colored)colorTargets++;
  if(row.catalogId===state.targetId)current=colored?'done':recorded?'color':measured?'record':'measure';
 }
 return Object.freeze({armed:state.armed,access,measuredTargets,recordedTargets,colorTargets,fit:!!state.clusterFit,current});
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
 /** Front NEWCOMER NC5: the admitted stars the visitor's version covers (PLEIADES_QUICK_GOAL or PLEIADES_SAMPLE_TARGETS). */
 goal:number;
 /** Front GUIDE-COMPANION, for Show me where only: during the sample step, what the selected star still needs (see
  * PleiadesExerciseSummary.current); null in every other step. */
 sampleNeed:PleiadesTargetNeed|null;
}>;

/** Front NEWCOMER NC5 (user decision, 2026-11-24): the quick version covers any 8 admitted stars, the visitor's choice; a web
 * suggestion, a part of the original exercise. */
export const PLEIADES_QUICK_GOAL=8;
/** list: the shared Hot List currently holds the 24 exercise rows in order. pointed: the App pointing equals an admitted row.
 * goal (Front NEWCOMER NC5): the confirmed B−V stars the sample step needs, all the admitted stars by default (the full
 * version); colorTargets is never clamped to it. */
export function pleiadesLabProgress(i:Readonly<{list:boolean;pointed:boolean;photometer:PleiadesExerciseSummary;goal?:number}>):PleiadesLabProgress{
 const p=i.photometer,ready=p.armed&&p.access==='ready',goal=i.goal??PLEIADES_SAMPLE_TARGETS;
 const done:Record<PleiadesLabStep,boolean>={
  list:i.list,
  point:i.pointed||ready,
  activate:ready,
  measure:p.measuredTargets>=1,
  record:p.recordedTargets>=1,
  color:p.colorTargets>=1,
  sample:p.colorTargets>=goal,
  distance:p.fit,
  save:false,
 };
 const measured=done.measure;
 const next=PLEIADES_LAB_COUNTED_STEPS.find(s=>!done[s]&&!(measured&&(s==='list'||s==='point'||s==='activate')))??'save';
 return Object.freeze({done:Object.freeze(done),next,colorTargets:p.colorTargets,goal,sampleNeed:next==='sample'?p.current:null});
}
