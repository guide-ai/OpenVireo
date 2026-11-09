/** Front ES0 [W]: the language of one page load, decided once by src/boot.ts (docs/I18N.md). Pure: no DOM, storage or
 * navigator access here; boot passes them in. User decisions of 2026-11-09 (AGENTS.md): any `es-*` browser opens Spanish
 * (es-419) and everything else English, with a selector remembered only in that browser (1, 2); Spanish stays hidden, reachable
 * only through a `?lang=es-419` preview link, until every translation sub-front is merged (5). */
export type UiLanguage='en'|'es-419'|'qps';
/** localStorage key of the selector's choice (the selector arrives with ES1 and is shown from ES-REL). */
export const LANGUAGE_STORAGE_KEY='openvireo-language';
/** Release gate (decision 5): false until ES-REL. While false, neither the stored choice nor the browser language is used. */
export const SPANISH_RELEASED=false;
/** `<html lang>` for each UI language. The dev-only pseudo-locale keeps English's tag: its text is marked English. */
export const HTML_LANG:Readonly<Record<UiLanguage,string>>=Object.freeze({en:'en','es-419':'es-419',qps:'en'});
export type LocaleInputs=Readonly<{
 /** The `lang` link parameter of this load (not stored). */
 param:string|null;
 /** The stored choice, or null when storage is empty or unreadable. */
 stored:string|null;
 /** navigator.languages, most preferred first. */
 languages:readonly string[];
 released:boolean;
 /** The pseudo-locale `qps` is accepted only in the dev server and tests. */
 dev:boolean;
}>;
const offered=(value:string|null,dev:boolean):UiLanguage|null=>value==='en'||value==='es-419'?value:dev&&value==='qps'?'qps':null;
/** The order is the link parameter, then (after release) the stored choice, then (after release) the first browser language:
 * `es`, `es-MX`, `es-ES`… give es-419; `['en-US','es-MX']` gives English, because only the first preference decides. */
export function decideLocale({param,stored,languages,released,dev}:LocaleInputs):UiLanguage{
 const asked=offered(param,dev);if(asked)return asked;
 if(!released)return 'en';
 const kept=offered(stored,false);if(kept)return kept;
 return /^es(?:-|$)/i.test(languages[0]??'')?'es-419':'en';
}
