/** Front NEWCOMER NC6 [W] (plan analysis/front-plans/front-newcomer.md §2.6): a lab's facts as screen text, for its home card and
 * its guide window: the full exercise's rough time, its level and, on the two labs with a quick version, the quick time. Literal
 * keys (the i18n split and the catalog checks see them); minutes go through formatNumber, each language's own number rule. */
import {Fragment,type ReactNode} from 'react';
import {formatNumber,t} from '../i18n';
import type {LabSlug} from '../seo/labSlugs';
import {LAB_FACTS,type LabLevel,type Minutes} from './labFacts';

const range=(m:Minutes)=>({low:formatNumber(m[0]),high:formatNumber(m[1])});
export function levelText(level:LabLevel):string{
 switch(level){
  case 1:return t('home.level1');
  case 2:return t('home.level2');
  case 3:return t('home.level3');
 }
}
/** The parts in their screen order: time, level, then the quick time where there is one. */
export function labFactsParts(lab:LabSlug):string[]{
 const f=LAB_FACTS[lab];
 return [t('home.time',range(f.full)),levelText(f.level),...(f.quick?[t('home.quickTime',range(f.quick))]:[])];
}
/** One line, the parts joined as the site's other screen lists are (« · »). Each part is an inline block (`lab-fact`), so the line
 * breaks between parts, at « · », and inside a part only when the part alone is wider than the line (NC6 review N5). The text
 * content, and so the accessible description, is the plain joined line. */
export const labFactsLine=(lab:LabSlug):ReactNode=>labFactsParts(lab).map((part,i)=><Fragment key={i}>{i>0&&' · '}<span className="lab-fact">{part}</span></Fragment>);
