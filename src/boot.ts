/** Front ES0 [W]: settles the UI language of this page load (docs/I18N.md). src/main.tsx imports this module first, and its
 * body runs synchronously before any later import of main.tsx evaluates, so every module that builds text at import time
 * (module-level t() calls, the pickMessages maps) sees the chosen language and the static importers of t need no change.
 * index.html, the entry chunk, Vite's preloads and the window load event stay exactly as before (an asynchronous app import
 * was measured and changed all three; see docs/I18N.md, "Why boot is synchronous in ES0"). Keep the imports here to the
 * catalog machinery (src/i18n/active.ts, catalog.ts, locale.ts) and the dev-only pseudo-locale. No inline script: the release
 * CSP is unchanged. */
import {activateLocale} from './i18n/active';
import type {LocaleBundle} from './i18n/catalog';
import {decideLocale,HTML_LANG,LANGUAGE_STORAGE_KEY,SPANISH_RELEASED,type UiLanguage} from './i18n/locale';
// Dev server and tests only: the import is dropped from the production build with the DEV branch below
// (scripts/check-i18n-dist.mjs checks that dist/ carries no pseudo-locale).
import {pseudoBundle} from './i18n/pseudo';

function storedChoice():string|null{try{return localStorage.getItem(LANGUAGE_STORAGE_KEY);}catch{return null;}}
function browserLanguages():readonly string[]{return navigator.languages?.length?navigator.languages:[navigator.language??''];}
/** The bundle of a non-English language, or null when this build has none for it (English is used then). Spanish (es-419) has
 * no bundle until ES1 adds src/i18n/es/, so a `?lang=es-419` load is entirely English in ES0. */
function bundleFor(language:UiLanguage):LocaleBundle|null{
 if(import.meta.env.DEV&&language==='qps')return pseudoBundle();
 return null;
}
function boot(){
 const wanted=decideLocale({param:new URLSearchParams(location.search).get('lang'),stored:storedChoice(),languages:browserLanguages(),released:SPANISH_RELEASED,dev:import.meta.env.DEV});
 let bundle:LocaleBundle|null=null;
 try{bundle=bundleFor(wanted);}catch(error){console.error('OpenVireo: the language bundle could not be used; English is used.',error);}
 const language=activateLocale(bundle);
 document.documentElement.lang=HTML_LANG[language];
 if(bundle?.messages['app.documentTitle'])document.title=bundle.messages['app.documentTitle'];
}
boot();
