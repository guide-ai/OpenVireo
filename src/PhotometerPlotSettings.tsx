import type{PleiadesPoint}from'./core/pleiadesAnalysis';
import{opticalProfile}from'./core/opticalTelescope';
import{t}from'./i18n';
/** Presentation of retained acquisition provenance; no photometric correction. */
export default function PhotometerPlotSettings({points,prefix}:{points:readonly PleiadesPoint[];prefix:'pleiades'|'native'}){
 const mixed=new Set(points.map(p=>`${p.telescopeIndex??0}:${p.apertureSelector??10}`)).size>1;
 return <><p data-testid={prefix+'-membership-scope'}>{t('ph.plotMembershipScope')}</p>{prefix==='pleiades'&&<p>{t('ph.plotPairPolicy')}</p>}{mixed&&<p role="status" data-testid={prefix+'-settings-warning'}>{t('ph.plotMixedSettings')}</p>}{points.length>0&&<ul aria-label={t('ph.plotSettings')}>{points.map(p=><li key={p.targetId}>{t('ph.plotPointSettings',{star:p.hotlistNumber,telescope:opticalProfile(p.telescopeIndex??0).name,aperture:p.apertureSelector??10})}</li>)}</ul>}</>;
}
