import {memo,type RefObject} from 'react';
import {sameData} from './renderStability';
import {t,formatNumber} from './i18n';
import {galaxyIdentity,galaxyDistanceReference} from './core/galaxyIdentity';
import {HUBBLE_SOURCES} from './core/hubbleAnalysis';
import {HUBBLE_QUICK_GOAL,type HubbleLabProgress} from './core/hubbleLab';
import {moreDetail,stepTitle} from './guideMoreDetail';
import {versionChoice,whatNext,whyLead} from './guideLead';
import type {LabVersion,VersionedLab} from './core/labVersion';
import type {LabSlug} from './seo/labSlugs';
import './hubble-lab.css';
export type LabDestination='galaxy-exposure'|'spectrum'|'hubble';
type Phase=HubbleLabProgress['next'];
/** Front GUIDE-COMPANION: the guide's five list items; the progress reports a phase, and item 4 (keep the investigation) has
 * no mark, so no phase points at it. */
export type HubbleGuideItem='acquire'|'measure'|'hubble'|'save'|'interpret';
export const hubblePhaseItem=(next:Phase):HubbleGuideItem=>next==='acquire'||next==='measure'||next==='interpret'?next:'hubble';
/** Where each phase is carried out (the Continue button and the companion's Show me where). */
export const hubblePhaseDestination=(next:Phase):LabDestination=>next==='acquire'?'galaxy-exposure':next==='measure'?'spectrum':'hubble';
/** The "Next:" line, shared by the guide and the companion strip (components/GuideCompanion.tsx). */
export const hubbleNextText=(progress:HubbleLabProgress)=>progress.next==='interpret'?t('lab.next.interpretSupported',{count:progress.inHubble,supported:progress.total,original:progress.original}):t(`lab.next.${progress.next}`);
/** The guide's counts line (archived, measured and complete targets), shared with the companion strip. Front NEWCOMER NC5: the
 * counts are never clamped and the goal is the version's (3 or all 13: «4 (goal 3)»). */
export const hubbleCountsText=(progress:HubbleLabProgress)=>t('lab.counts',{archived:progress.archived,measured:progress.measured,rows:progress.inHubble,total:progress.goal});
/** Front NEWCOMER NC3: an item's plain title, shared with the companion strip's line. */
export function hubbleItemTitle(item:HubbleGuideItem){
 switch(item){case 'acquire':return t('lab.acquireTitle');case 'measure':return t('lab.measureTitle');case 'hubble':return t('lab.hubbleTitle');case 'save':return t('lab.saveTitle');case 'interpret':return t('lab.interpretTitle');}
}
/** What the guide says under an item's heading, shared with the companion strip's Step details. */
export function hubbleItemBody(item:HubbleGuideItem){
 switch(item){
  case 'acquire':return <><p>{t('lab.acquireHelp')}</p><p>{t('lab.acquisitionTime')}</p></>;
  case 'measure':return <><p>{t('lab.measureHelp')}</p><p>{t('lab.stepHelp')}</p></>;
  case 'hubble':return <><p>{t('lab.hubbleHelp')}</p><p>{t('lab.recipeHelp')}</p></>;
  case 'save':return <><p>{t('lab.saveHelp')}</p><p>{t('lab.resultsHelp')}</p><p>{t('lab.sspHelp')}</p></>;
  case 'interpret':return <><p>{t('lab.interpretHelp')}</p><ul>{(['data','fit','errors','environment']as const).map(key=><li key={key}>{t(`lab.reflect.${key}`)}</li>)}</ul></>;
 }
}
function HubbleLabGuide({dialogRef,progress,version,onNavigate,onNext,onVersion}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:HubbleLabProgress;/** Front NEWCOMER NC5 review (S1): the version the visitor chose, from the shell's state (the progress follows it one effect later). */version:LabVersion;onNavigate:(destination:LabDestination)=>void;/** Front NEWCOMER NC4: opens another lab's guide (What next); a stable callback. */onNext:(lab:LabSlug)=>void;/** Front NEWCOMER NC5: chooses the quick or full version (core/labVersion.ts); a stable callback. */onVersion:(lab:VersionedLab,version:LabVersion)=>void}){
 function go(destination:LabDestination){dialogRef.current?.close();onNavigate(destination);}
 const item=hubblePhaseItem(progress.next);
 return <dialog ref={dialogRef} className="hubble-lab-dialog" aria-labelledby="hubble-lab-heading" aria-describedby="hubble-lab-why">
  <div className="lab-heading"><div><div className="eyebrow">{t('lab.eyebrow')}</div><h2 id="hubble-lab-heading">{t('lab.title')}</h2></div><button className="secondary-button" autoFocus onClick={()=>dialogRef.current?.close()}>{t('lab.close')}</button></div>
  {whyLead('hubble-lab-why',t('lab.why'),'hubble')}{versionChoice('hubble-lab',version,{quick:t('lab.version.quick',{count:HUBBLE_QUICK_GOAL}),full:t('lab.version.full',{count:progress.total})},v=>onVersion('hubble',v),version==='quick'&&progress.next==='interpret',t('lab.version.tip'))}<details className="research-notes"><summary>{t('notes.summary')}</summary><p>{t('lab.intro')}</p><p>{t('lab.introOptions')}</p></details>
  <section className="lab-progress" aria-labelledby="lab-progress-heading"><h3 id="lab-progress-heading">{t('lab.progress')}</h3><p data-testid="lab-progress-counts" role="status">{hubbleCountsText(progress)}</p><p data-testid="lab-original-coverage">{t('lab.coverage',{supported:progress.total,original:progress.original})}</p><p data-testid="lab-next">{hubbleNextText(progress)}</p>{progress.duplicateTargets&&<p className="lab-recovery">{t('lab.duplicate')}</p>}<button className="secondary-button" onClick={()=>go(hubblePhaseDestination(progress.next))}>{t('lab.continue')}</button><details className="lab-progress-help"><summary>{t('lab.progressMeaning')}</summary><p>{t('lab.progressHelp')}</p></details></section>
  <ol className="lab-steps">
   {/* Front NEWCOMER NC3: title and button visible, what the guide says under the item folded under More detail. */}
   <li data-next={item==='acquire'||undefined}><h3>{stepTitle('hubble-lab-step-acquire',hubbleItemTitle('acquire'))}</h3><button className="secondary-button" onClick={()=>go('galaxy-exposure')}>{t('lab.goExposure')}</button>{moreDetail('hubble-lab-step-acquire',item==='acquire',hubbleItemBody('acquire'))}</li>
   <li data-next={item==='measure'||undefined}><h3>{stepTitle('hubble-lab-step-measure',hubbleItemTitle('measure'))}</h3><button className="secondary-button" onClick={()=>go('spectrum')}>{t('lab.goAnalyzer')}</button>{moreDetail('hubble-lab-step-measure',item==='measure',hubbleItemBody('measure'))}</li>
   <li data-next={item==='hubble'||undefined}><h3>{stepTitle('hubble-lab-step-hubble',hubbleItemTitle('hubble'))}</h3><button className="secondary-button" onClick={()=>go('hubble')}>{t('lab.goHubble')}</button>{moreDetail('hubble-lab-step-hubble',item==='hubble',hubbleItemBody('hubble'))}</li>
   <li><h3>{stepTitle('hubble-lab-step-save',hubbleItemTitle('save'))}</h3>{/* Item 4 has no mark; its advice opens with interpret, the step that ends with saving (NC3 review N1c). */}{moreDetail('hubble-lab-step-save',item==='interpret',hubbleItemBody('save'))}</li>
   <li data-next={item==='interpret'||undefined}><h3>{stepTitle('hubble-lab-step-interpret',hubbleItemTitle('interpret'))}</h3>{moreDetail('hubble-lab-step-interpret',item==='interpret',hubbleItemBody('interpret'))}</li>
  </ol>
  {progress.next==='interpret'&&whatNext('hubble-lab','hubble',next=>{dialogRef.current?.close();onNext(next);},hubbleCountsText(progress))}
  <section aria-labelledby="lab-targets-heading"><h3 id="lab-targets-heading">{t('lab.targets')}</h3><p>{t('lab.referencesHelp')}</p><ul className="lab-targets">{progress.targets.map(p=>{const identity=galaxyIdentity(p.id),reference=galaxyDistanceReference(p.id);return <li key={p.id} data-testid={`lab-target-${p.id}`}><h4>{p.id} · {identity.label}</h4><dl>{(['archived','measured','inHubble']as const).map(key=><div key={key}><dt>{t(`lab.status.${key}`)}</dt><dd>{t(p[key]?'lab.yes':'lab.no')}</dd></div>)}</dl><p>{t('lab.magnitude',{value:formatNumber(reference.apparentV,{minimumFractionDigits:1,maximumFractionDigits:1}),source:reference.source})}</p></li>;})}</ul></section>
  <details className="lab-troubleshooting"><summary>{t('lab.troubleshooting')}</summary><dl>{(['start','noisy','rows','repeat','files','limits']as const).map(key=><div key={key}><dt>{t(`lab.problem.${key}`)}</dt><dd>{t(`lab.recover.${key}`)}</dd></div>)}</dl></details>
  <details className="lab-sources"><summary>{t('lab.sources')}</summary><p>{t('lab.sourceHelp')}</p><ul>{Object.entries(HUBBLE_SOURCES).map(([key,source])=><li key={key}>{source.name}<br/>SHA-256 <code>{source.sha256}</code></li>)}</ul><p>{t('lab.limitsExtended')}</p></details>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('lab.return')}</button>
 </dialog>;
}
// Front Perf: the closed guide re-renders only when its progress (plain data), ref or handler changes.
export default memo(HubbleLabGuide,(a,b)=>a.dialogRef===b.dialogRef&&a.onNavigate===b.onNavigate&&a.onNext===b.onNext&&a.onVersion===b.onVersion&&a.version===b.version&&sameData(a.progress,b.progress));
