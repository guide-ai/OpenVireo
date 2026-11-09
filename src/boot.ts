/** Front ES0 [W]: settles the UI language of this page load (docs/I18N.md). src/main.tsx imports this module first. In the dev
 * server its body runs before any later import of main.tsx evaluates; in the production build Rolldown evaluates the shared
 * chunks before the entry chunk's own code, so no module may build text when it evaluates: the pickMessages maps and the
 * catalog-backed maps are built on first use (src/i18n/registry.ts lazyMessages). Text asked for before this ran is answered in
 * English, counted and reported here (src/i18n/active.ts), and tests/release/pages-smoke.pages.ts requires that it never
 * happens. index.html, the chunks, Vite's preloads and the window load event stay as before. Keep the imports here to the
 * catalog machinery and the dev-only pseudo-locale. No inline script: the release CSP is unchanged. */
import type {LocaleBundle} from './i18n/catalog';
import {LANGUAGE_STORAGE_KEY,type UiLanguage} from './i18n/locale';
import {settleLanguage} from './i18n/settle';
// Dev server and tests only: the import is dropped from the production build with the DEV branch below
// (scripts/check-i18n-dist.mjs checks that dist/ carries no pseudo-locale).
import {pseudoBundle} from './i18n/pseudo';

/** The bundle of a non-English language, or null when this build has none for it (English is used then). Spanish (es-419) has
 * no bundle until ES1 adds src/i18n/es/, so a `?lang=es-419` load is entirely English in ES0. */
function bundleFor(language:UiLanguage):LocaleBundle|null{
 if(import.meta.env.DEV&&language==='qps')return pseudoBundle();
 return null;
}
settleLanguage({
 search:location.search,
 stored:()=>localStorage.getItem(LANGUAGE_STORAGE_KEY),
 languages:navigator.languages?.length?navigator.languages:[navigator.language??''],
 dev:import.meta.env.DEV,
 bundleFor,
 setLang:lang=>{document.documentElement.lang=lang;},
 setTitle:title=>{document.title=title;},
 error:(message,detail)=>{if(detail===undefined)console.error(message);else console.error(message,detail);},
});
