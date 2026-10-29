import {memo,type RefObject} from 'react';
import {t} from '../i18n';
import {POLISH_MESSAGES as PM} from './PolishMessages';
import {ABOUT_BOX} from '../help/mainHelp';
import {AboutBoxPanel} from '../help/HelpMenus';
import './polish.css';

/** Help › About (TAboutBox, DFM "About This Exercise", 324×220, bsDialog): the native panel, shared with Help › About...
 * (src/help/HelpMenus.tsx AboutBoxPanel; texts in src/help/mainHelp.ts) with the Version label 0x58982c sets at run time,
 * "Version 1.504" (the DFM's design-time "Version 0.5" is never shown), then the web section [W]: what this site is, what works, credits and licence basis. ProgramIcon (CLEA logo) is not an
 * approved resource and is omitted. Opened by the observatory's "What works in this version" button. */
function AboutDialog({dialogRef}:{dialogRef:RefObject<HTMLDialogElement|null>}){
 const A=ABOUT_BOX,W=PM.about;
 return <dialog ref={dialogRef} className="about-dialog" aria-labelledby="scope-heading" data-testid="about-dialog">
  <button className="dialog-close" aria-label={t('app.close')} onClick={()=>dialogRef.current?.close()}>×</button>
  <h2 id="scope-heading">{t('sky.about')}</h2>
  <section className="about-native" aria-label={A.caption} data-testid="about-native">
   <p className="about-native-caption ob-native">{A.caption}</p>
   <div className="about-native-panel"><AboutBoxPanel version={A.mainVersion} testId="about-native"/></div>
   <p className="observatory-note">{W.nativeNote}</p>
  </section>
  <section aria-labelledby="about-site"><h3 id="about-site">{W.siteTitle}</h3><p>{W.site}</p></section>
  <section aria-labelledby="about-works"><h3 id="about-works">{W.worksTitle}</h3>
   <ul data-testid="about-works">{W.works.map(w=><li key={w}>{w}</li>)}</ul>
   <p>{t('sky.limitHelp')}</p>
   <p><strong>{t('sky.instruments')}.</strong> {t('sky.pendingInstruments')}</p>
  </section>
  <section aria-labelledby="about-credits"><h3 id="about-credits">{W.creditsTitle}</h3>
   <ul data-testid="about-credits">{W.credits.map(c=><li key={c}>{c}</li>)}</ul>
   <p>{t('spectrum.licenseHelp')}</p>
  </section>
 </dialog>;
}
// Front Perf: no state of its own depends on the shell; re-render only when its props change.
export default memo(AboutDialog);
