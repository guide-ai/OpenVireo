import type {ReactNode} from 'react';
import {t} from './i18n';

/** Front NEWCOMER NC3 [W] (plan analysis/front-plans/front-newcomer.md §2.3): each step of an exercise guide's window shows its
 * plain title, its status and its button, and folds the rest of what the guide says under the step (body text, formulas and
 * warnings, reordered, never deleted) into a «More detail» disclosure, open for the current step and closed for the others. A plain
 * function, not a component: the seven windows render closed on every load (tests/render-budget.spec.ts).
 * `id` names the step (`<guide>-step-<step>`): the step's title carries `${id}-title` (stepTitle), and the summary's name is its
 * visible text followed by that title («More detail Measure the period»), so a list of summaries is not fifty identical ones. */
export function moreDetail(id:string,open:boolean,body:ReactNode){
 return <details className="lab-step-more" open={open}>
  <summary aria-labelledby={`${id}-more ${id}-title`}><span id={`${id}-more`}>{t('lab.moreDetail')}</span></summary>
  {body}
 </details>;
}
/** The step's title text, with the id moreDetail's summary names (the status beside it stays out of that name). */
export const stepTitle=(id:string,title:string)=><span id={`${id}-title`}>{title}</span>;
