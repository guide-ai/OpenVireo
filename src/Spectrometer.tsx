import type { Sample } from './core/spectrum';
import type { SkyObject } from './core/sky';
import { t } from './i18n';
import { POLISH_MESSAGES as PM } from './polish/PolishMessages';
import CleaHelp from './clusters/CleaHelp';
import {HELP_FILES} from './help/helpFiles';

/** #spectrometer (Front P): an index of the routes where the single-slit spectrometer is used. The earlier source-profile
 * preview (M82/Coma1/Coma2, "Exposure acquisition is pending") predated those routes and was retired. The props are kept
 * so the page and saved investigations stay unchanged (the preparation seed is still saved and restored, but unused). */
export default function Spectrometer({ onReturn }: { target: SkyObject; enabled: boolean; onReturn: () => void; verifiedLibrary:Readonly<{targetId:string;name:string;sha256:string;samples:readonly Sample[]}>|null;libraryFailed:boolean;seedText:string;onSeedTextChange:(text:string)=>void }) {
  const S = PM.spectrometerIndex;
  return <main className="observatory-main spectrometer-main">
    <button className="back-observatory" onClick={onReturn}>{t('sky.back')}</button>
    <section className="observatory-heading"><div className="eyebrow">{t('spectrometer.eyebrow')}</div><h1 tabIndex={-1}>{S.title}</h1>{/* TSpectrometer Help1Click 0x510f4c, FormShow 0x50da3d, options +0x914 (docs/CLEA-HELP.md) */}<CleaHelp list={HELP_FILES['SPECHLP.LST']} testId="spectrometer-help"/><p>{S.intro}</p></section>
    <section className="card spectrometer-index" aria-labelledby="spectrometer-routes"><h2 id="spectrometer-routes">{S.routesTitle}</h2>
      <ul data-testid="spectrometer-routes">{S.routes.map(r => <li key={r.href}><a href={r.href}>{r.label}</a> — {r.help}</li>)}</ul>
      <div className="button-row"><a className="secondary-button" href="#sky-exposure">{t('skyExposure.open')}</a><a className="secondary-button" href="#star-exposure">{t('starExposure.open')}</a></div>
      <p className="observatory-note">{S.retired}</p>
    </section>
  </main>;
}
