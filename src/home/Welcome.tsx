/** Front HOME: the welcome, the app's own page `home` (the address `/` with no hash, or `#home`), the first screen of
 * https://openvireo.space/. It says what the site is (an unofficial web reconstruction of Project CLEA's VIREO), three facts
 * for a first-time visitor, one button to the free-exploration page (`observatory`), and the seven labs as cards. A card opens
 * its guide through the same opener as its Guides menu button and the #lab= links (openGuide in OpenVireo.tsx), so there is one
 * handler per lab. Presentation only: no state of its own. src/seo/pages.ts (homeBoot) mirrors the English text for crawlers. */
import {t} from '../i18n';
import type {LabSlug} from '../seo/labSlugs';

/** The seven labs in the /labs/ order; keys are literal so the i18n split and the catalog checks see them. */
const cards=():{slug:LabSlug;name:string;summary:string}[]=>[
 {slug:'hubble',name:t('home.hubble'),summary:t('home.hubbleSummary')},
 {slug:'large-scale-structure',name:t('home.lss'),summary:t('home.lssSummary')},
 {slug:'stellar-classification',name:t('home.classification'),summary:t('home.classificationSummary')},
 {slug:'pleiades',name:t('home.pleiades'),summary:t('home.pleiadesSummary')},
 {slug:'cluster-hr',name:t('home.clusterHr'),summary:t('home.clusterHrSummary')},
 {slug:'pulsars',name:t('home.pulsars'),summary:t('home.pulsarsSummary')},
 {slug:'object-x',name:t('home.objectX'),summary:t('home.objectXSummary')},
];

export default function Welcome({openGuide,onExplore}:{openGuide:Readonly<Record<LabSlug,()=>void>>;onExplore:()=>void}){
 return <section className="home-welcome" aria-labelledby="home-title">
  <div className="eyebrow">{t('home.eyebrow')}</div>
  <h1 id="home-title" tabIndex={-1}>{t('home.title')}</h1>
  <p className="home-lead">{t('home.lead')}</p>
  <ul className="home-facts" aria-label={t('home.factsLabel')}>
   <li>{t('home.factInstall')}</li><li>{t('home.factFree')}</li><li>{t('home.factFaithful')}</li>
  </ul>
  <p className="home-explore"><button type="button" className="home-explore-button" onClick={onExplore}>{t('home.explore')} <span aria-hidden="true">→</span></button><span>{t('home.exploreHint')}</span></p>
  <h2 className="home-labs-heading" id="home-labs">{t('home.labsHeading')}</h2>
  <p className="home-labs-hint">{t('home.labsHint')}</p>
  <ul className="home-labs" aria-labelledby="home-labs">
   {cards().map(c=><li key={c.slug}><button type="button" className="home-lab" data-lab={c.slug} aria-labelledby={`home-lab-${c.slug}`} aria-describedby={`home-lab-${c.slug}-summary`} onClick={openGuide[c.slug]}>
    <strong id={`home-lab-${c.slug}`}>{c.name}</strong><span id={`home-lab-${c.slug}-summary`}>{c.summary}</span>
   </button></li>)}
  </ul>
 </section>;
}
