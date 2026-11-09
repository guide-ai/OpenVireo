import {createI18n,english,locale,type I18n,type LocaleBundle} from './catalog';
import {HTML_LANG,SPANISH_RELEASED,type UiLanguage} from './locale';
import {MAP_IDS} from './maps';
/** Front ES0: the language of this load, set once by src/boot.ts (docs/I18N.md). App code imports from src/i18n/index.ts. */
type Active=Readonly<{language:UiLanguage;i18n:I18n;bundle:LocaleBundle|null}>;
/** The active language lives on globalThis (as src/focusAfterLayout.ts keeps its state), so a re-evaluated copy of this module
 * (dev-server hot update, a test's vi.resetModules) keeps the language boot settled instead of tripping the wire below. */
const ACTIVE=Symbol.for('openvireo.i18n.active'),EARLY=Symbol.for('openvireo.i18n.early'),FAILED=Symbol.for('openvireo.i18n.failed');
const holder=globalThis as typeof globalThis&{[ACTIVE]?:Active;[EARLY]?:number;[FAILED]?:UiLanguage|null};
const ENGLISH:Active=Object.freeze({language:'en',i18n:english,bundle:null});
/** Dev server and Vitest only: text requested before the language was settled fails loudly (in Vitest the English setup file
 * src/i18n/useEnglish.ts settles it). In production the request is answered in English and counted (earlyTextRequests), and
 * src/boot.ts reports the count; the holder itself is set only by activateLocale. */
const tripwire=()=>(import.meta.env as {DEV?:boolean}|undefined)?.DEV===true;
export function current():Active{
 const active=holder[ACTIVE];if(active)return active;
 if(tripwire())throw new Error('OpenVireo text was requested before src/boot.ts settled the language.');
 holder[EARLY]=(holder[EARLY]??0)+1;return ENGLISH;
}
/** How many text requests were answered before the language was settled (0 when boot ran first, as it must). */
export const earlyTextRequests=():number=>holder[EARLY]??0;
/** Settles the language: src/boot.ts once per load, and the English test setup. null is English. A bundle with a wrong
 * catalog or an unknown map id throws, and nothing is set. */
export function activateLocale(bundle:LocaleBundle|null):UiLanguage{
 let next=ENGLISH;
 if(bundle){
  const unknown=Object.keys(bundle.maps??{}).filter(id=>!(MAP_IDS as readonly string[]).includes(id));
  if(unknown.length)throw new Error(`Unknown message map id: ${unknown.join(', ')}`);
  next=Object.freeze({language:bundle.language,i18n:createI18n(bundle.messages,HTML_LANG[bundle.language],{fallback:bundle.language==='es-419'&&!SPANISH_RELEASED,numberLocale:locale}),bundle});
 }
 holder[ACTIVE]=next;return next.language;
}
/** The language this load asked for but could not use (its chunk failed, timed out or did not validate), or null. */
export const languageFailure=():UiLanguage|null=>holder[FAILED]??null;
export function noteLanguageFailure(failed:UiLanguage|null){holder[FAILED]=failed;}
/** ES1 review 1, C1: shown when the Spanish chunk could not be used. Its own bilingual text, since the Spanish catalog is the
 * part that failed. */
export const LANGUAGE_FAILURE_NOTICE=Object.freeze({
 en:'Spanish could not be loaded; English is shown. Reload to try again.',
 es:'No se pudo cargar el español; se muestra en inglés. Recarga para intentarlo de nuevo.',
});
