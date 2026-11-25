import type {ReactNode} from 'react';
import {t} from './i18n';
import {LAB_NEXT} from './home/labNext';
import type {LabSlug} from './seo/labSlugs';
import type {LabVersion} from './core/labVersion';

/** Front NEWCOMER NC4 [W] (plan analysis/front-plans/front-newcomer.md §2.4; user decision of 2026-11-24): the top and the end
 * of each guide's window. Plain functions, not components: the seven windows render closed on every load
 * (tests/render-budget.spec.ts).
 * The why-line asks the question the visitor will answer, then says what they will do; it never states the lab's result, not
 * even qualitatively (src/guideLead.test.ts checks every language). It is the dialog's description (`aria-describedby`); the
 * guide's former intro is a research note below it. */
export const whyLead=(id:string,text:string)=><p id={id} className="lab-why">{text}</p>;

/** Front NEWCOMER NC5 [W] (plan §2.5; user decision of 2026-11-24): the version choice of the Hubble and Pleiades windows, under
 * the why-line. A native radio group (one tab stop, arrows move between the two); a change is announced by the radio button's own
 * checked state, as every native radio group (NC5 review N3: the counts line does not always change). The shared note says that the quick version is a web suggestion, a part of the original exercise, and the
 * full version the original. Once the quick version is finished (`quickDone`: the guide's closing state while quick is chosen) it
 * says so and offers Continue with the full exercise, which chooses Full and leaves the focus on its radio button (the pressed
 * button goes away). `id` prefixes the ids and the radio name; `labels` are the lab's own quick and full labels; `tip` is an
 * extra line (Hubble's). `version` is the shell's own state, never derived from the progress, which follows it one effect later
 * (NC5 review S1). The choice is held by the shell (core/labVersion.ts) and never stored; nothing here is an answer,
 * expected value or grade. */
export function versionChoice(id:string,version:LabVersion,labels:Readonly<{quick:string;full:string}>,onChange:(version:LabVersion)=>void,quickDone:boolean,tip?:string){
 const radio=(value:LabVersion)=><label className="lab-version-option"><input type="radio" id={`${id}-version-${value}`} name={`${id}-version`} value={value} checked={version===value} onChange={()=>onChange(value)}/>{labels[value]}</label>;
 const full=()=>{document.getElementById(`${id}-version-full`)?.focus({preventScroll:true});onChange('full');};
 return <div className="lab-version">
  <fieldset aria-describedby={`${id}-version-note`}>
   <legend>{t('lab.version.legend')}</legend>
   {radio('quick')}{radio('full')}
  </fieldset>
  <p id={`${id}-version-note`} className="lab-version-note">{t('lab.version.note')}</p>
  {tip!==undefined&&<p className="lab-version-note">{tip}</p>}
  {quickDone&&<div className="lab-version-done"><p>{t('lab.version.quickDone')}</p><button type="button" className="secondary-button" onClick={full}>{t('lab.version.continueFull')}</button></div>}
 </div>;
}

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
