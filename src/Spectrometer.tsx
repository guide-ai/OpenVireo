import { useEffect, useMemo, useState } from 'react';
import { prepareCatalogGalaxyChannels } from './core/galaxyContinuum';
import type { Sample } from './core/spectrum';
import { loadVerifiedLibrarySpectrum } from './io/spectrumFiles';
import type { SkyObject } from './core/sky';
import { formatNumber, t } from './i18n';
import catalog from '../data/hubble/galaxy-catalog-samples.json';
import CleaHelp from './clusters/CleaHelp';
import {HELP_FILES} from './help/helpFiles';

const fallback = { url: '/original/spectra/GLXYTMPL.SP', name: 'GLXYTMPL.SP', sha256: '05602de89d005ddd5ea1bdd97f50b6519e1a17e222dc855930208792ac679cc5' };
type LoadedSource = Readonly<{ targetId: string; samples: readonly Sample[]; file: string; matched: boolean }>;

/** New web source-preparation view. A pointed navigation target is not claimed
 * to be the original object under the slit. No detector image, amplitude,
 * acquired spectrum or elapsed-time/noise state is manufactured here. */
export default function Spectrometer({ target, enabled, onReturn, verifiedLibrary, libraryFailed, seedText, onSeedTextChange }: { target: SkyObject; enabled: boolean; onReturn: () => void; verifiedLibrary:Readonly<{targetId:string;name:string;sha256:string;samples:readonly Sample[]}>|null;libraryFailed:boolean;seedText:string;onSeedTextChange:(text:string)=>void }) {
  const record = catalog.samples.find(row => row.identifier.replace(/\s/g, '') === target.id);
  const [loaded, setLoaded] = useState<LoadedSource | null>(null), [loadError, setLoadError] = useState(false), [loading, setLoading] = useState(false);
  const file = target.spectrum ?? fallback;
  useEffect(() => {
    setLoaded(null); setLoadError(false); setLoading(false);
    if (!enabled || !record) return;
    if(target.spectrum){
      if(verifiedLibrary?.targetId===target.id && verifiedLibrary.sha256.toLowerCase()===file.sha256.toLowerCase() && verifiedLibrary.name===file.name) setLoaded({targetId:target.id,samples:verifiedLibrary.samples,file:verifiedLibrary.name,matched:true});
      else if(libraryFailed)setLoadError(true);else setLoading(true);
      return;
    }
    const abort = new AbortController(); let current = true; setLoading(true);
    (async () => {
      const {samples}=await loadVerifiedLibrarySpectrum(file,abort.signal);
      if (current) setLoaded({ targetId: target.id, samples, file: file.name, matched: !!target.spectrum });
    })().catch(() => { if (current) setLoadError(true); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; abort.abort(); };
  }, [enabled, target.id, record, file.url, file.sha256, file.name, target.spectrum, verifiedLibrary, libraryFailed]);
  const source = useMemo(() => {
    if (!enabled || !record || loaded?.targetId !== target.id) return null;
    const text=seedText.trim();
    if (!/^\d{1,10}$/.test(text)) return { error: t('spectrometer.invalidSeed') };
    const seed=Number(text);
    if (seed > 0xffffffff) return { error: t('spectrometer.invalidSeed') };
    try { return { profile: prepareCatalogGalaxyChannels(loaded.samples, loaded.matched, record.morphology, record.redshift, 3700, 4700, seed) }; }
    catch { return { error: t('spectrometer.preparationError') }; }
  }, [enabled, loaded, record, seedText, target.id]);
  const profile = source && 'profile' in source ? source.profile : null;
  const maximum = profile ? Math.max(...profile.values) : 1;
  const points = profile?.values.map((value, index) => `${50 + (profile.wavelengths[index] - 3700) * .9},${250 - value / (maximum || 1) * 210}`).join(' ');
  return <main className="observatory-main spectrometer-main">
    <button className="back-observatory" onClick={onReturn}>{t('sky.back')}</button>
    <section className="observatory-heading"><div className="eyebrow">{t('spectrometer.eyebrow')}</div><h1 tabIndex={-1}>{t('spectrometer.title')}</h1>{/* TSpectrometer Help1Click 0x510f4c, FormShow 0x50da3d, options +0x914 (docs/CLEA-HELP.md) */}<CleaHelp list={HELP_FILES['SPECHLP.LST']} testId="spectrometer-help"/><p>{t('spectrometer.intro')}</p></section>
    <div className="spectrometer-layout"><section className="card spectrometer-chart-card"><div className="card-heading"><div><div className="eyebrow">{t('spectrometer.pointedTarget')}</div><h2>{target.label}</h2></div><span className="source-badge">{t('spectrometer.preview')}</span></div>
    {!enabled ? <div className="spectrometer-empty"><h3>{t('spectrometer.pointFirst')}</h3><p>{t('spectrometer.pointHelp')}</p><button className="primary-button" onClick={onReturn}>{t('spectrometer.toObservatory')}</button></div> : !record ? <div className="spectrometer-empty"><h3>{t('spectrometer.unsupported')}</h3><p>{t('spectrometer.supportedTargets')}</p></div> : <>
      {loading && <p role="status" className="spectrometer-message">{t('spectrometer.loading')}</p>}
      {loadError && <p role="alert" className="spectrometer-message">{t('spectrometer.loadError')}</p>}
      {source && 'error' in source && <p role="alert" className="spectrometer-message">{source.error}</p>}
      {profile && <><svg className="source-spectrum" viewBox="0 0 1000 300" role="img" aria-label={t('spectrometer.chartLabel')}><line x1="50" x2="950" y1="250" y2="250"/><line x1="50" x2="50" y1="35" y2="250"/>{[0,1,2,3,4,5].map(i=><g key={i}><line x1={50+i*180} x2={50+i*180} y1="250" y2="255"/><text x={50+i*180} y="277" textAnchor="middle">{3700+i*200}</text></g>)}<text x="60" y="28">{t('spectrometer.intensity')}</text><text x="950" y="28" textAnchor="end">{formatNumber(maximum,{maximumFractionDigits:3})}</text><polyline data-testid="prepared-source-curve" points={points} fill="none"/></svg><p className="spectrometer-caption">{t('spectrometer.wavelength')} · {t('spectrometer.channels',{count:profile.values.length})}</p><div className="source-summary"><span>{t('spectrometer.sourceFile')}<strong data-testid="source-file">{loaded?.file}</strong></span><span>{t('spectrometer.sourceKind')}<strong>{t(loaded?.matched ? 'spectrometer.matched' : profile.draws>0 ? 'spectrometer.fallback' : 'spectrometer.fallbackInRange')}</strong></span><span>{t('spectrometer.temperature')}<strong>{formatNumber(profile.temperature,{maximumFractionDigits:2})} K</strong></span></div></>}
    </>}
    <p className="spectrometer-message source-disclaimer">{t('spectrometer.notObservation')}</p></section>
    <aside className="spectrometer-controls"><section className="card target-card"><div className="eyebrow">{t('spectrometer.acquisition')}</div><h2>{t('spectrometer.acquisitionTitle')}</h2><p>{t('spectrometer.acquisitionHelp')}</p><button className="primary-button" disabled>{t('spectrometer.unavailable')}</button><p className="observatory-note">{t('spectrometer.noCounts')}</p><a className="secondary-button" href="#sky-exposure">{t('skyExposure.open')}</a><a className="secondary-button" href="#star-exposure">{t('starExposure.open')}</a></section>
    <section className="card target-card"><h2>{t('spectrometer.previewSettings')}</h2><p>{t('spectrometer.band')}</p><details><summary>{t('spectrometer.repeatability')}</summary><label htmlFor="source-seed">{t('spectrometer.seed')}</label><input id="source-seed" type="text" inputMode="numeric" value={seedText} maxLength={80} onChange={event=>onSeedTextChange(event.target.value)}/><p className="observatory-note">{t('spectrometer.seedHelp')}</p>{profile && <p>{t('spectrometer.draws',{count:profile.draws})}</p>}</details></section></aside></div>
  </main>;
}
