import {memo,useEffect,useState,type ComponentProps} from 'react';
import {propsEqual} from './renderStability';
import {t,formatNumber} from './i18n';
import {applySiteClock,cancelSiteClock,siteClockReading,type SiteClockWorkspace} from './core/siteClock';
import type {OpticalIndex} from './core/opticalTelescope';
import type {ObservatorySite} from './core/observatorySite';
import SiteDialogs from './observatory/SiteDialogs';
/** `site` (WEB-ST-01): the effective observatory site of the selected telescope (compiled or a student override); it drives
 * this card's local time and sidereal time only. */
function SiteClock({workspace,index,onChange,onApply,site,overridden=false,limitSlewing=false,onSite}:{workspace:SiteClockWorkspace;index:OpticalIndex;onChange:(w:SiteClockWorkspace)=>void;onApply?:(w:SiteClockWorkspace)=>void;site?:ObservatorySite;overridden?:boolean;limitSlewing?:boolean;onSite?:(site:ObservatorySite|null)=>void}){
 const [error,setInvalid]=useState(false),r=siteClockReading(workspace.utc,index,site);
 useEffect(()=>setInvalid(false),[workspace]);
 return <section className="card site-clock" style={{padding:24,marginBottom:24}}><details><summary>{t('siteClock.title')}</summary><p>{t('siteClock.scope')}</p>{site&&onSite&&<SiteDialogs utc={workspace.utc} site={site} overridden={overridden} index={index} limitSlewing={limitSlewing} onApplyUTC={utc=>(onApply??onChange)({utc,draftUTC:utc})} onSite={onSite}/>}<p><strong>{r.site}</strong></p><label htmlFor="site-clock-utc">{t('siteClock.input')}</label><input id="site-clock-utc" type="text" maxLength={80} value={workspace.draftUTC} onChange={e=>{onChange({...workspace,draftUTC:e.target.value});setInvalid(false);}} aria-describedby="site-clock-format"/><p id="site-clock-format">{t('siteClock.format')}</p><div className="button-row"><button className="primary-button" onClick={()=>{try{(onApply??onChange)(applySiteClock(workspace));setInvalid(false);}catch{setInvalid(true);}}}>{t('siteClock.apply')}</button><button className="secondary-button" onClick={()=>{onChange(cancelSiteClock(workspace));setInvalid(false);}}>{t('siteClock.cancel')}</button></div>{error&&<p role="alert">{t('siteClock.error')}</p>}<dl className="site-clock-readings"><dt>{t('siteClock.ut')}</dt><dd data-testid="site-clock-ut">{t('siteClock.utValue',{utc:workspace.utc.replace('T',' ')})}</dd><dt>{t('siteClock.local')}</dt><dd data-testid="site-clock-local">{r.localStandard.replace('T',' ')}</dd><dt>{t('siteClock.jd')}</dt><dd data-testid="site-clock-jd">{formatNumber(r.jd,{minimumFractionDigits:8,maximumFractionDigits:8,useGrouping:false})}</dd><dt>{t('siteClock.sidereal')}</dt><dd data-testid="site-clock-sidereal">{t('siteClock.hoursValue',{value:formatNumber(r.hours,{minimumFractionDigits:8,maximumFractionDigits:8,useGrouping:false})})}</dd></dl><p>{t('siteClock.limits')}</p></details></section>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(SiteClock,propsEqual<ComponentProps<typeof SiteClock>>(['site']));
