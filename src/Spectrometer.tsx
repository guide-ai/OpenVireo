import {memo,type ComponentProps} from 'react';
import {propsEqual} from './renderStability';
import type { Sample } from './core/spectrum';
import type { SkyObject } from './core/sky';
import { t } from './i18n';
import { POLISH_MESSAGES as PM } from './polish/PolishMessages';
import CleaHelp from './clusters/CleaHelp';
import {HELP_FILES} from './help/helpFiles';
import {lazy,Suspense} from 'react';
import type {FieldSpectrometerLink} from './FieldSpectrometer';
const FieldSpectrometer=lazy(()=>import('./FieldSpectrometer'));

/** #spectrometer (Front P): an index of the routes where the single-slit spectrometer is used. The earlier source-profile
 * preview (M82/Coma1/Coma2, "Exposure acquisition is pending") predated those routes and was retired. The props are kept
 * so the page and saved investigations stay unchanged (the preparation seed is still saved and restored, but unused). */
function Spectrometer({ onReturn, field }: { field?: FieldSpectrometerLink; target: SkyObject; enabled: boolean; onReturn: () => void; verifiedLibrary:Readonly<{targetId:string;name:string;sha256:string;samples:readonly Sample[]}>|null;libraryFailed:boolean;seedText:string;onSeedTextChange:(text:string)=>void }) {
  const S = PM.spectrometerIndex;
  // The field spectrometer's chunk loads only once this screen is opened: the page gives `field` only from then on.
  return <main className="observatory-main spectrometer-main">
    <button className="back-observatory" onClick={onReturn}>{t('sky.back')}</button>
    <section className="observatory-heading"><div className="eyebrow">{t('spectrometer.eyebrow')}</div><h1 tabIndex={-1}>{S.title}</h1>{/* TSpectrometer Help1Click 0x510f4c, FormShow 0x50da3d, options +0x914 (docs/CLEA-HELP.md) */}<CleaHelp list={HELP_FILES['SPECHLP.LST']} testId="spectrometer-index-help"/><p>{S.intro}</p></section>
    <section className="card spectrometer-index" aria-labelledby="spectrometer-routes"><h2 id="spectrometer-routes">{S.routesTitle}</h2>
      <ul data-testid="spectrometer-routes">{S.routes.map(r => <li key={r.href}><a href={r.href}>{r.label}</a> — {r.help}</li>)}</ul>
      <div className="button-row"><a className="secondary-button" href="#sky-exposure">{t('skyExposure.open')}</a><a className="secondary-button" href="#star-exposure">{t('starExposure.open')}</a></div>
      <p className="observatory-note">{S.retired}</p>
    </section>
    {/* Front G (G4a): the spectrometer wherever the telescope points, from the compact GSC tiles. */}
    {field&&<Suspense fallback={<p>{t('sky.loading')}</p>}><FieldSpectrometer link={field}/></Suspense>}
  </main>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(Spectrometer,propsEqual<ComponentProps<typeof Spectrometer>>(['target']));
