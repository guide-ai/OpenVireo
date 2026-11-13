import {memo} from 'react';
import {vireo} from './i18n/vireo';
import CameraPreparation from './CameraPreparation';
import {INITIAL_OPTICAL,opticalProfile,OPTICAL_PROFILES,type OpticalWorkspace,type OpticalIndex} from './core/opticalTelescope';
import {SCOPE_MENU_CAPTIONS,scopeAccessOffered,type RequestScope,type ScopeAccessState} from './core/scopeAccess';
import {menuCaptionText} from './core/radioControl';
import {POLISH_MESSAGES} from './polish/PolishMessages';
import {formatNumber,t} from './i18n';
/** Review 1 M2: the guide whose exercise menu set the restriction. */
const restrictingGuide=(code:ScopeAccessState['restrictedBy'])=>code===3?t('pleiadesLab.nav'):code===7?POLISH_MESSAGES.clusterGuide.nav:code===2?t('classLab.nav'):'';
const n=(value:number,digits=3)=>formatNumber(value,{maximumFractionDigits:digits});
export function OpticalCompatibility({workspace,onUseSupported,busy}:{workspace:OpticalWorkspace;onUseSupported:()=>void;busy:boolean}){
 return <section className="card optical-compatibility" aria-label={t('optical.compatibility')}><h2>{t('optical.selected',{name:opticalProfile(workspace.selectedIndex).name})}</h2><p>{t('optical.acquisitionLimit')}</p><button className="secondary-button" disabled={busy} onClick={onUseSupported}>{t('optical.useSupported',{name:opticalProfile(INITIAL_OPTICAL.selectedIndex).name})}</button></section>;
}
/** Front T5: Telescopes › Optical › Request Time and the Access items (core/scopeAccess.ts). The menu's Enabled states are VIREO's
 * (0x589bd8, the request handler 0x58ba88, the timers 0x58c094 / 0x58c1d8); the page shows the boxes. */
function RequestTime({scope,busy,onRequest}:{scope:ScopeAccessState;busy:boolean;onRequest:(s:RequestScope)=>void}){
 return <fieldset className="optical-request-time" data-testid="scope-request-time" data-enabled={scope.requestTime} disabled={busy||!scope.requestTime}>
  <legend>{vireo(menuCaptionText(SCOPE_MENU_CAPTIONS.requestTime))}</legend>
  <div className="sky-actions">{([1,2] as const).map(s=><button key={s} type="button" className="secondary-button" data-testid={`scope-request-${s}`} disabled={!scope.request[s-1]||scope.pending!==null} onClick={()=>onRequest(s)}>{vireo(menuCaptionText(SCOPE_MENU_CAPTIONS.request[s]))}</button>)}</div>
  {([1,2] as const).filter(s=>scope.waiting[s-1]).map(s=><p key={s} className="ob-note" data-testid={`scope-waiting-${s}`}>{t('scopeAccess.waiting',{name:opticalProfile(s).name,minutes:opticalProfile(s).reapplyWaitMinutes})}</p>)}
 </fieldset>;
}
function OpticalTelescope({workspace,busy,onDraft,onApply,onCancel,scope,onRequest}:{workspace:OpticalWorkspace;busy:boolean;onDraft:(index:OpticalIndex)=>void;onApply:()=>void;onCancel:()=>void;scope:ScopeAccessState;onRequest:(s:RequestScope)=>void}){
 const current=opticalProfile(workspace.selectedIndex),p=opticalProfile(workspace.draftIndex),changed=workspace.selectedIndex!==workspace.draftIndex,offered=scopeAccessOffered(scope,workspace.draftIndex);
 const fields=[['aperture',n(p.apertureMM)],['focal',n(p.focalLengthMM)],['seeing',n(p.seeingArcsec)],['scopeFactor',n(p.scopeFactorMag)],['finderFactor',n(p.finderFactorMag)],['site',p.site.name],['longitude',n(p.site.longitudeDegrees,6)],['latitude',n(p.site.latitudeDegrees,6)],['height',n(p.site.heightMetres)],['utOffset',n(p.site.utMinusLocalStandardHours)],['horizon',n(p.site.horizonDegrees)]]as const;
 return <section className="card optical-telescope" aria-labelledby="optical-heading" data-testid="optical-telescope" data-restricted={scope.restricted} data-access={scope.access.map(Number).join('')} data-uses={scope.uses.join(',')}><h2 id="optical-heading" tabIndex={-1}>{t('optical.title')}</h2><p className="optical-current">{t('optical.selected',{name:current.name})}</p>
  <p role="status" data-testid="scope-access-status">{scope.restricted?t('scopeAccess.restricted',{guide:restrictingGuide(scope.restrictedBy)}):t('scopeAccess.unrestricted')}</p>
  <label htmlFor="optical-profile">{t('optical.choose')}</label><select id="optical-profile" value={workspace.draftIndex} disabled={busy} onChange={e=>onDraft(Number(e.target.value)as OpticalIndex)}>{OPTICAL_PROFILES.map(p=><option key={p.recordIndex} value={p.recordIndex}>{p.name}</option>)}</select><div className="sky-actions"><button className="secondary-button" disabled={busy||!changed||!offered} onClick={onApply}>{t('optical.apply')}</button><button className="secondary-button" disabled={busy||!changed} onClick={onCancel}>{t('optical.cancel')}</button></div>{changed&&<p role="status">{t('optical.pending',{name:p.name})}</p>}
  {changed&&!offered&&<p className="ob-note" data-testid="scope-access-locked">{t('scopeAccess.accessLocked',{access:vireo(menuCaptionText(SCOPE_MENU_CAPTIONS.access[workspace.draftIndex])),name:p.name})}</p>}
  {scope.restricted&&<RequestTime scope={scope} busy={busy} onRequest={onRequest}/>}
  <details><summary>{t('optical.siteInformation')}</summary><h3>{p.name}</h3><p>{t('optical.nominal')}</p><dl>{fields.map(([key,value])=><div key={key}><dt>{t(`optical.field.${key}`)}</dt><dd data-optical-field={key}>{value}</dd></div>)}</dl><p>{t('optical.hubbleAccess')}</p><p>{t('optical.storedAvailability',{chance:formatNumber(p.availability,{style:'percent',maximumFractionDigits:0})})}</p>{p.recordIndex===0?<p>{t('optical.always')}</p>:<p>{t('optical.requestMetadata',{min:p.minimumAllocationUses,max:p.maximumAllocationUses-1,wait:p.reapplyWaitMinutes})}</p>}<p>{t('optical.siteLimit')}</p><details><summary>{t('optical.evidence')}</summary><p>{t('optical.evidenceHelp')}</p></details></details><CameraPreparation appliedIndex={workspace.selectedIndex}/><details className="research-notes"><summary>{t('notes.summary')}</summary><p>{t('optical.defaults')}</p><p>{t('optical.switchHelp')}</p><p>{t('scopeAccess.research')}</p></details></section>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(OpticalTelescope);
