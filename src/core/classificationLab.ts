/** WEB-CLASSIFICATION-GUIDE-01: progress of the Stellar classification (E03) student guide, recomputed from the current
 * classification workspace and the lab's reported view state on every render. Nothing is stored: a reload loses the temporary
 * "compared" and "inspected" marks, and a Restore clears them and derives Inspect only from the practice's own records (a
 * classification record with a line ≥ 0 or a width record); a retained line index alone never counts. "Done" means the learner
 * loaded, compared, inspected or recorded something; it never judges whether a type is correct, and no answer key exists.
 * The guide follows the original practice library only: while an acquired or imported source is active every counted step is
 * false (records, drafts and the marker are kept) and the guide points back to the practice. Pure: no React, i18n, clock or I/O. */
import type {ClassificationWorkspace} from './classification';

/** What the lab reports (only when it changes). unknownId binds the report to the source it describes. */
export type ClassificationExerciseSummary=Readonly<{
 unknownId:string;
 /** The original practice library is selected and its verified spectra are loaded for unknownId. */
 ready:boolean;
 /** The learner made a comparison action (atlas, standard pair, Previous/Next or difference) for unknownId. Temporary. */
 compared:boolean;
 /** The learner explicitly chose a diagnostic line row (click, Space or arrow keys) for unknownId. Temporary. */
 inspected:boolean;
}>;
export const EMPTY_CLASSIFICATION_EXERCISE_SUMMARY:ClassificationExerciseSummary=Object.freeze({unknownId:'',ready:false,compared:false,inspected:false});
export const sameClassificationExerciseSummary=(a:ClassificationExerciseSummary,b:ClassificationExerciseSummary)=>
 a.unknownId===b.unknownId&&a.ready===b.ready&&a.compared===b.compared&&a.inspected===b.inspected;

/** 'save' is an instruction (Save complete investigation, reload, Restore) and is never counted. */
export type ClassificationLabStep='choose'|'compare'|'inspect'|'record'|'save';
export const CLASSIFICATION_LAB_STEPS:readonly ClassificationLabStep[]=Object.freeze(['choose','compare','inspect','record','save']);
export const CLASSIFICATION_LAB_COUNTED_STEPS:readonly ClassificationLabStep[]=Object.freeze(CLASSIFICATION_LAB_STEPS.filter(s=>s!=='save'));
export type ClassificationLabProgress=Readonly<{
 done:Readonly<Record<ClassificationLabStep,boolean>>;
 /** First counted step not done; 'save' when all are done. */
 next:ClassificationLabStep;
 /** 'other' while an acquired or imported source is selected: the guide then only points back to the practice library. */
 scope:'practice'|'other';
 /** Practice the marks describe. */
 practiceId:string;
}>;

export function classificationLabProgress(w:ClassificationWorkspace,summary:ClassificationExerciseSummary):ClassificationLabProgress{
 const practice=w.practice,id=practice.unknownId,scope=w.active==='practice'?'practice' as const:'other' as const;
 const owned=scope==='practice',current=owned&&summary.unknownId===id;
 const recorded=owned&&practice.records.some(r=>r.unknownId===id);
 const inspected=owned&&(practice.records.some(r=>r.unknownId===id&&r.line>=0)||!!practice.features?.records.some(r=>r.unknownId===id));
 const done:Record<ClassificationLabStep,boolean>={
  choose:current&&summary.ready,
  compare:recorded||current&&summary.compared,
  inspect:inspected||current&&summary.inspected,
  record:recorded,
  save:false,
 };
 const next=CLASSIFICATION_LAB_COUNTED_STEPS.find(s=>!done[s])??'save';
 return Object.freeze({done:Object.freeze(done),next,scope,practiceId:id});
}
