/** Front ES0 [W]: the language of one page load, decided once by src/boot.ts (docs/I18N.md). Pure: no DOM, storage or
 * navigator access here; boot passes them in. User decisions of 2026-11-09 (AGENTS.md): a browser whose first language a released
 * language matches opens it (any `es-*` opens Spanish, es-419) and everything else English, with a selector remembered only in that
 * browser (1, 2); a language stays hidden, reachable only through its `?lang=<tag>` preview link, until every one of its
 * translation sub-fronts is merged (5). Front SC8: the languages and their gates are the registry of src/i18n/languages.ts. */
import {LANGUAGES,languageEntry,matchLanguage,textDirection,type LanguageEntry,type TextDirection} from './languages';
export type {TextDirection};
/** English, a registered language's tag (src/i18n/languages.json), or a dev-only pseudo-locale. */
export type UiLanguage='en'|'qps'|PseudoScriptLanguage|(string&{});
// Front SC2 [dev server and tests only]: the script-stress pseudo-locales of src/i18n/pseudoScripts.ts, offered like qps. Their
// <html lang> is the real tag of the script they stress, so :lang() rules apply. The production build drops them (import.meta.env
// .DEV is false there); the typeof guard keeps this module loadable outside Vite, where the Playwright specs import app modules.
// Front RTL-1 (RT2): `qps-rtl` (lang `ar`, dir `rtl`, src/i18n/pseudoRtl.ts) is one of them, under the same gate.
export type PseudoScriptLanguage='qps-cjk'|'qps-deva'|'qps-cyrl'|'qps-rtl';
const PSEUDO_SCRIPT_LANG:Readonly<Record<PseudoScriptLanguage,string>>|false=typeof import.meta.env!=='undefined'&&import.meta.env.DEV===true&&{'qps-cjk':'ja','qps-deva':'hi','qps-cyrl':'ru','qps-rtl':'ar'};
/** The right-to-left pseudo-locales, under the same gate (so the production build holds no pseudo-locale name). */
const PSEUDO_RTL:readonly string[]|false=typeof import.meta.env!=='undefined'&&import.meta.env.DEV===true&&['qps-rtl'];
/** localStorage key of the selector's choice (the selector arrived with ES1 and is shown since ES-REL). */
export const LANGUAGE_STORAGE_KEY='openvireo-language';
/** localStorage key of "View original (English)" for VIREO's menus and dialogs (decision 9): '1' when on. Applied at load. */
export const VIREO_ORIGINALS_KEY='openvireo-vireo-originals';
/** `<html lang>` for each UI language: English, each registered language's `htmlLang`, the dev-only pseudo-locale qps with
 * English's tag (its text is marked English), and the script-stress pseudo-locales with the real tag of their script (ja, hi, ru).
 * Front SC8: the per-language release gate that replaced Front ES-REL's SPANISH_RELEASED is each registry entry's `released`. */
export const HTML_LANG:Readonly<Record<UiLanguage,string>>=Object.freeze(Object.fromEntries([['en','en'],...LANGUAGES.map(l=>[l.tag,l.htmlLang]),['qps','en'],...Object.entries(PSEUDO_SCRIPT_LANG||{})]));
/** Front RTL-1 (RT1): `<html dir>` for each UI language, beside HTML_LANG: each registered language's `direction` (ltr when
 * absent: every language today), ltr for English and qps, and rtl for the dev-only `qps-rtl`. */
export const HTML_DIR:Readonly<Record<UiLanguage,TextDirection>>=Object.freeze(Object.fromEntries([['en','ltr'],...LANGUAGES.map(l=>[l.tag,textDirection(l.tag)]),['qps','ltr'],...Object.keys(PSEUDO_SCRIPT_LANG||{}).map(l=>[l,PSEUDO_RTL&&PSEUDO_RTL.includes(l)?'rtl':'ltr'])]));
/** The `<html dir>` of a load in `language`: a registered language's own `direction` (a test registry's too), else HTML_DIR's
 * own entry (never an inherited Object property such as `constructor`), else ltr. */
export function htmlDir(language:UiLanguage,registry:readonly LanguageEntry[]=LANGUAGES):TextDirection{
 return languageEntry(language,registry)?textDirection(language,registry):Object.hasOwn(HTML_DIR,language)?HTML_DIR[language]:'ltr';
}
export type LocaleInputs=Readonly<{
 /** The `lang` link parameter of this load (not stored). */
 param:string|null;
 /** The stored choice, or null when storage is empty or unreadable. */
 stored:string|null;
 /** navigator.languages, most preferred first. */
 languages:readonly string[];
 /** The registered languages and their release gates (src/i18n/languages.ts; tests pass their own). */
 registry?:readonly LanguageEntry[];
 /** The pseudo-locales (`qps`, and the script-stress `qps-cjk`, `qps-deva`, `qps-cyrl`, `qps-rtl`) are accepted only in the dev
  * server and tests. */
 dev:boolean;
}>;
/** A link (`preview`) may name any registered language; a stored choice only a released one. The pseudo-locales are dev-only
 * link values. Exact values only: `ES-419` or `es` is not a tag. */
function offered(value:string|null,dev:boolean,preview:boolean,registry:readonly LanguageEntry[]):UiLanguage|null{
 if(value==='en')return 'en';
 const l=languageEntry(value,registry);if(l&&(preview||l.released))return l.tag;
 if(dev&&value==='qps')return 'qps';
 return PSEUDO_SCRIPT_LANG&&dev&&value!==null&&Object.hasOwn(PSEUDO_SCRIPT_LANG,value)?value as PseudoScriptLanguage:null;
}
/** The order is the link parameter (any registered language: the preview), then the stored choice (released languages), then the
 * first browser language (released languages: `es`, `es-MX`, `es-ES`… give es-419); `['en-US','es-MX']` gives English, because
 * only the first preference decides, and a browser language whose match is not released gives English, never another language. */
export function decideLocale({param,stored,languages,registry=LANGUAGES,dev}:LocaleInputs):UiLanguage{
 const asked=offered(param,dev,true,registry);if(asked)return asked;
 const kept=offered(stored,false,false,registry);if(kept)return kept;
 const browser=matchLanguage(languages[0]??'',registry);
 return browser?.released?browser.tag:'en';
}
