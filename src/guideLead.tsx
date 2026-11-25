import type {ReactNode} from 'react';
import {t} from './i18n';
import {LAB_NEXT} from './home/labNext';
import type {LabSlug} from './seo/labSlugs';

/** Front NEWCOMER NC4 [W] (plan analysis/front-plans/front-newcomer.md §2.4; user decision of 2026-11-24): the top and the end
 * of each guide's window. Plain functions, not components: the seven windows render closed on every load
 * (tests/render-budget.spec.ts).
 * The why-line asks the question the visitor will answer, then says what they will do; it never states the lab's result, not
 * even qualitatively (src/guideLead.test.ts checks every language). It is the dialog's description (`aria-describedby`); the
 * guide's former intro is a research note below it. */
export const whyLead=(id:string,text:string)=><p id={id} className="lab-why">{text}</p>;

/** A lab's name as on its home card (literal keys, so the i18n split and the catalog checks see them). */
export function labName(lab:LabSlug):string{
 switch(lab){
  case 'hubble':return t('home.hubble');
  case 'large-scale-structure':return t('home.lss');
  case 'stellar-classification':return t('home.classification');
  case 'pleiades':return t('home.pleiades');
  case 'cluster-hr':return t('home.clusterHr');
  case 'pulsars':return t('home.pulsars');
  case 'object-x':return t('home.objectX');
 }
}

/** What next, once the guide's counted steps are all done (core/guideCompanion.ts `allDone`): a recap made only of the guide's
 * own counts line (`recap`, left out where that line is already beside it, as in the companion strip), the lab to try next
 * (home/labNext.ts) and a button that opens its guide. `id` prefixes the heading's id; `onOpen` receives the next lab. It shows
 * no answer, expected value or grade, and nothing is stored. */
export function whatNext(id:string,lab:LabSlug,onOpen:(next:LabSlug)=>void,recap?:ReactNode){
 const next=LAB_NEXT[lab];
 return <section className="lab-what-next" aria-labelledby={`${id}-what-next`} data-next-lab={next}>
  <h3 id={`${id}-what-next`}>{t('lab.whatNext')}</h3>
  {recap!==undefined&&<p>{recap}</p>}
  <p>{t('lab.tryNext',{lab:labName(next)})}</p>
  <button type="button" className="secondary-button" onClick={()=>onOpen(next)}>{t('lab.openNext')}</button>
 </section>;
}
