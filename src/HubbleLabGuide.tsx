import type {RefObject} from 'react';
import {t,formatNumber} from './i18n';
import {galaxyIdentity,galaxyDistanceReference} from './core/galaxyIdentity';
import {HUBBLE_SOURCES} from './core/hubbleAnalysis';
import type {HubbleLabProgress} from './core/hubbleLab';
import './hubble-lab.css';
export type LabDestination='galaxy-exposure'|'spectrum'|'hubble';
export default function HubbleLabGuide({dialogRef,progress,onNavigate}:{dialogRef:RefObject<HTMLDialogElement|null>;progress:HubbleLabProgress;onNavigate:(destination:LabDestination)=>void}){
 function go(destination:LabDestination){dialogRef.current?.close();onNavigate(destination);}
 return <dialog ref={dialogRef} className="hubble-lab-dialog" aria-labelledby="hubble-lab-heading" aria-describedby="hubble-lab-intro">
  <div className="lab-heading"><div><div className="eyebrow">{t('lab.eyebrow')}</div><h2 id="hubble-lab-heading">{t('lab.title')}</h2></div><button className="secondary-button" autoFocus onClick={()=>dialogRef.current?.close()}>{t('lab.close')}</button></div>
  <p id="hubble-lab-intro">{t('lab.intro')}</p>
  <section className="lab-progress" aria-labelledby="lab-progress-heading"><h3 id="lab-progress-heading">{t('lab.progress')}</h3><p data-testid="lab-progress-counts" role="status">{t('lab.counts',{archived:progress.archived,measured:progress.measured,rows:progress.inHubble})}</p><p data-testid="lab-next">{t(`lab.next.${progress.next}`)}</p>{progress.duplicateTargets&&<p className="lab-recovery">{t('lab.duplicate')}</p>}<button className="secondary-button" onClick={()=>go(progress.next==='acquire'?'galaxy-exposure':progress.next==='measure'?'spectrum':'hubble')}>{t('lab.continue')}</button><details className="lab-progress-help"><summary>{t('lab.progressMeaning')}</summary><p>{t('lab.progressHelp')}</p></details></section>
  <ol className="lab-steps">
   <li><h3>{t('lab.acquireTitle')}</h3><p>{t('lab.acquireHelp')}</p><p>{t('lab.acquisitionTime')}</p><button className="secondary-button" onClick={()=>go('galaxy-exposure')}>{t('lab.goExposure')}</button></li>
   <li><h3>{t('lab.measureTitle')}</h3><p>{t('lab.measureHelp')}</p><p>{t('lab.stepHelp')}</p><button className="secondary-button" onClick={()=>go('spectrum')}>{t('lab.goAnalyzer')}</button></li>
   <li><h3>{t('lab.hubbleTitle')}</h3><p>{t('lab.hubbleHelp')}</p><p>{t('lab.recipeHelp')}</p><button className="secondary-button" onClick={()=>go('hubble')}>{t('lab.goHubble')}</button></li>
   <li><h3>{t('lab.saveTitle')}</h3><p>{t('lab.saveHelp')}</p><p>{t('lab.sspHelp')}</p></li>
   <li><h3>{t('lab.interpretTitle')}</h3><p>{t('lab.interpretHelp')}</p><ul>{(['data','fit','errors','environment']as const).map(key=><li key={key}>{t(`lab.reflect.${key}`)}</li>)}</ul></li>
  </ol>
  <section aria-labelledby="lab-targets-heading"><h3 id="lab-targets-heading">{t('lab.targets')}</h3><p>{t('lab.referencesHelp')}</p><ul className="lab-targets">{progress.targets.map(p=>{const identity=galaxyIdentity(p.id),reference=galaxyDistanceReference(p.id);return <li key={p.id} data-testid={`lab-target-${p.id}`}><h4>{p.id} · {identity.label}</h4><dl>{(['archived','measured','inHubble']as const).map(key=><div key={key}><dt>{t(`lab.status.${key}`)}</dt><dd>{t(p[key]?'lab.yes':'lab.no')}</dd></div>)}</dl><p>{t('lab.magnitude',{value:formatNumber(reference.apparentV,{minimumFractionDigits:1,maximumFractionDigits:1}),source:reference.source})}</p></li>;})}</ul></section>
  <details className="lab-troubleshooting"><summary>{t('lab.troubleshooting')}</summary><dl>{(['start','noisy','rows','repeat','files','limits']as const).map(key=><div key={key}><dt>{t(`lab.problem.${key}`)}</dt><dd>{t(`lab.recover.${key}`)}</dd></div>)}</dl></details>
  <details className="lab-sources"><summary>{t('lab.sources')}</summary><p>{t('lab.sourceHelp')}</p><ul>{Object.entries(HUBBLE_SOURCES).map(([key,source])=><li key={key}>{source.name}<br/>SHA-256 <code>{source.sha256}</code></li>)}</ul><p>{t('lab.limits')}</p></details>
  <button className="secondary-button" onClick={()=>dialogRef.current?.close()}>{t('lab.return')}</button>
 </dialog>;
}
