/** Front ES0 [W]: settles the UI language of this page load (docs/I18N.md). src/main.tsx imports this module first. In the dev
 * server its body runs before any later import of main.tsx evaluates; in the production build Rolldown evaluates the shared
 * chunks before the entry chunk's own code, so no module may build text when it evaluates: the pickMessages maps and the
 * catalog-backed maps are built on first use (src/i18n/registry.ts lazyMessages). Text asked for before the language is settled
 * is answered in English, counted and reported (src/i18n/active.ts), and tests/release/pages-smoke.pages.ts requires that it
 * never happens. Keep the imports here to the catalog machinery and the dev-only pseudo-locale. No inline script: the release
 * CSP is unchanged.
 * Front ES1 (option c of docs/I18N.md): English and the pseudo-locale settle synchronously, so English renders exactly as before.
 * Spanish loads its chunk (src/i18n/es/index.ts, fetched only for a Spanish load) and `languageReady` resolves once it is
 * active or replaced by English; src/main.tsx renders the app only then, so no text is read before activation.
 * Front ES-SPLIT: that chunk is now the language's core module (virtual:openvireo-i18n/<tag>); each route area's text follows
 * with its route (src/i18n/areas.ts). */
import type {LocaleBundle} from './i18n/catalog';
import {LANGUAGE_STORAGE_KEY,VIREO_ORIGINALS_KEY,type UiLanguage} from './i18n/locale';
import {settleLanguage} from './i18n/settle';
// Front ES-SPLIT: the core module of each split language, by tag (scripts/i18n-split.mjs; src/i18n/languages.json). Only the
// loader functions are in the entry; a language's modules are fetched when it is asked for.
import LANGUAGE_LOADERS from 'virtual:openvireo-i18n/loaders';
// Dev server and tests only: the import is dropped from the production build with the DEV branch below
// (scripts/check-i18n-dist.mjs checks that dist/ carries no pseudo-locale).
import {pseudoBundle} from './i18n/pseudo';
// Front SC2: the script-stress pseudo-locales qps-cjk, qps-deva and qps-cyrl (and Front RTL-1's qps-rtl), dropped from the
// production build the same way.
import {isPseudoScriptLanguage,pseudoScriptBundle} from './i18n/pseudoScripts';

/** The bundle of a non-English language, or null for English. */
function bundleFor(language:UiLanguage):LocaleBundle|null|Promise<LocaleBundle|null>{
 if(import.meta.env.DEV&&language==='qps')return pseudoBundle();
 if(import.meta.env.DEV&&isPseudoScriptLanguage(language))return pseudoScriptBundle(language);
 const load=Object.hasOwn(LANGUAGE_LOADERS,language)?LANGUAGE_LOADERS[language]:undefined;
 return load?load().then(m=>m.default):null;
}
const settled=settleLanguage({
 search:location.search,
 stored:()=>localStorage.getItem(LANGUAGE_STORAGE_KEY),
 languages:navigator.languages?.length?navigator.languages:[navigator.language??''],
 dev:import.meta.env.DEV,
 bundleFor,
 originals:()=>localStorage.getItem(VIREO_ORIGINALS_KEY)==='1',
 setLang:lang=>{document.documentElement.lang=lang;},
 // Front RTL-1 (RT1): ltr for every language today (index.html has no dir; the attribute arrives here, with lang).
 setDir:dir=>{document.documentElement.dir=dir;},
 setTitle:title=>{document.title=title;},
 error:(message,detail)=>{if(detail===undefined)console.error(message);else console.error(message,detail);},
});
/** null when the language is already active (English and the dev pseudo-locales); otherwise resolves when the Spanish chunk is active or English
 * replaced it. */
export const languageReady:Promise<unknown>|null=settled instanceof Promise?settled:null;
