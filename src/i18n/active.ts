import {createI18n,english,locale,type I18n,type LocaleBundle} from './catalog';
import {HTML_LANG,SPANISH_RELEASED,type UiLanguage} from './locale';
/** Front ES0: the language of this load, set once by src/boot.ts (docs/I18N.md). Import from src/i18n/index.ts. */
type Active=Readonly<{language:UiLanguage;i18n:I18n;bundle:LocaleBundle|null}>;
/** The active language lives on globalThis (as src/focusAfterLayout.ts keeps its state), so a re-evaluated copy of this module
 * (dev-server hot update, a test's vi.resetModules) keeps the language boot settled instead of tripping the wire below. */
const ACTIVE=Symbol.for('openvireo.i18n.active');
const holder=globalThis as typeof globalThis&{[ACTIVE]?:Active};
/** Dev server and Vitest only: text requested before the language was settled fails loudly (in Vitest the English setup file
 * src/i18n/useEnglish.ts settles it). Production falls back to English. */
const tripwire=()=>(import.meta.env as {DEV?:boolean}|undefined)?.DEV===true;
export function current():Active{
 const active=holder[ACTIVE];if(active)return active;
 if(tripwire())throw new Error('OpenVireo text was requested before src/boot.ts settled the language.');
 return holder[ACTIVE]=Object.freeze({language:'en',i18n:english,bundle:null});
}
/** Called by src/boot.ts once per load (and by the English test setup). null is English. */
export function activateLocale(bundle:LocaleBundle|null):UiLanguage{
 const active:Active=holder[ACTIVE]=Object.freeze(bundle?{language:bundle.language,i18n:createI18n(bundle.messages,HTML_LANG[bundle.language],{fallback:bundle.language==='es-419'&&!SPANISH_RELEASED,numberLocale:locale}),bundle}:{language:'en' as const,i18n:english,bundle:null});
 return active.language;
}
