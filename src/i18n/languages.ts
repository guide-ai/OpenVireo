import data from './languages.json' with {type:'json'};
/** Front SC8 [W] (docs/I18N.md, "Script groundwork: the language registry, detection and selector (SC8)"): the one list of the
 * translated UI languages. Its data is src/i18n/languages.json, which the Node build scripts read too (scripts/i18n-split.mjs
 * plans each language's chunks, scripts/check-i18n-dist.mjs checks them), so it stays plain JSON; this module types it and holds
 * the pure rules the app needs: which language a browser tag asks for, which languages are released, what the selector lists,
 * <html lang> and the failure notices. English is the source language and is not in the list. No DOM or storage here. */
export type LanguageEntry=Readonly<{
 /** The `?lang=` value, the stored value and the bundle's `language` (exact, case-sensitive). */
 tag:string;
 /** src/i18n/<dir>/: the catalog, originals.json, maps/, index.ts (the manifest) and, with `help`, help/<NAME>.ts. */
 dir:string;
 catalog:string;
 /** Multiplies the chunk budgets of scripts/check-i18n-dist.mjs (1 for Latin and Cyrillic scripts). */
 budgetFactor:number;
 htmlLang:string;
 /** The site path of the language's own static pages (its SEO home and lab pages): dist/<pagePath>/… (`es`, later `pt-br`). Those
  * HTML files may carry the language's text (scripts/check-i18n-dist.mjs). */
 pagePath:string;
 /** The language's own name, shown in the selector (with `englishName` when it has no Latin letter). */
 autonym:string;
 englishName:string;
 /** Browser language ranges (RFC 4647 basic filtering, any case): a tag equal to a range or starting with range + '-'. */
 match:readonly string[];
 /** Ranges this language does not take although a shorter `match` range covers them (zh-TW under zh while zh-Hant is absent). */
 except?:readonly string[];
 /** The release gate (user decision 5 of 2026-11-09): until true, only a `?lang=<tag>` preview link reaches the language; it is
  * never detected, stored or offered, and its catalog and maps may be partial (completed with English). */
 released:boolean;
 /** Front PT-REL (user decision of 2026-11-10, AGENTS.md): the separator between thousands on screen in this language, replacing
  * en-US's comma in formatNumber's output («24 000» in Portuguese, U+202F). Absent: the comma, as English and Spanish keep. The
  * decimal point never changes (decision 4), and files the site writes never pass through it. */
 thousands?:string;
 /** The language translates VIREO's help files (all of them: src/i18n/<dir>/help/); `related` is its "RELATED TOPICS" marker. */
 help?:Readonly<{related:string}>;
 /** The language's own sentence for "<language> could not be loaded…" and "Part of the <language> text…" (src/OpenVireo.tsx). */
 notices:Readonly<{language:string;area:string}>;
 /** Tests only: a root-relative directory used instead of src/i18n/<dir> (a fixture language outside src/). */
 path?:string;
}>;
export const LANGUAGES:readonly LanguageEntry[]=Object.freeze(data as LanguageEntry[]);
/** English, the source language: always offered, always released, no bundle. */
export const SOURCE_LANGUAGE=Object.freeze({tag:'en',htmlLang:'en',autonym:'English',englishName:'English'});
export const languageEntry=(tag:string|null|undefined,registry:readonly LanguageEntry[]=LANGUAGES):LanguageEntry|undefined=>registry.find(l=>l.tag===tag);
/** A translated language that has passed its release gate. English is not in the list and is always available. */
export const isReleased=(tag:string,registry:readonly LanguageEntry[]=LANGUAGES):boolean=>languageEntry(tag,registry)?.released===true;
const subtags=(range:string)=>range.split('-').length;
const covers=(range:string,tag:string)=>{const r=range.toLowerCase(),t=tag.toLowerCase();return t===r||t.startsWith(`${r}-`);};
const longest=(ranges:readonly string[]|undefined,tag:string)=>Math.max(0,...(ranges??[]).filter(r=>covers(r,tag)).map(subtags));
/** The language a browser tag asks for, released or not, or undefined (English): the most specific covering `match` range wins
 * (zh-Hant-CN is zh-Hant, zh-Hans-TW zh-Hans), and a language whose `except` covers the tag at least as specifically does not
 * take it. */
export function matchLanguage(tag:string,registry:readonly LanguageEntry[]=LANGUAGES):LanguageEntry|undefined{
 let best:LanguageEntry|undefined,length=0;
 for(const l of registry){const m=longest(l.match,tag);if(m>length&&longest(l.except,tag)<m){best=l;length=m;}}
 return best;
}
/** The separator between thousands on screen for `tag` (`thousands`), or undefined for en-US's comma. */
export const thousandsSeparator=(tag:string,registry:readonly LanguageEntry[]=LANGUAGES):string|undefined=>languageEntry(tag,registry)?.thousands;
/** The dev-only pseudo-locales (qps, qps-cjk, qps-deva, qps-cyrl): never in the registry, never offered. */
export const isPseudoLocale=(tag:string):boolean=>tag==='qps'||tag.startsWith('qps-');
/** What the selector lists for a load in `current`: English, every released language, and `current` when it is a preview (a
 * registered language before its release), in registry order. */
export const selectorLanguages=(current:string,registry:readonly LanguageEntry[]=LANGUAGES):readonly Readonly<{tag:string;htmlLang:string;autonym:string;englishName:string}>[]=>
 [SOURCE_LANGUAGE,...registry.filter(l=>l.released||l.tag===current)];
/** The selector is shown when it offers a choice; never under the dev-only pseudo-locales (Front SC2's contract). */
export const selectorShown=(current:string,registry:readonly LanguageEntry[]=LANGUAGES):boolean=>!isPseudoLocale(current)&&selectorLanguages(current,registry).length>1;
/** An option's text: the autonym, followed by the English name when the autonym has no Latin letter (日本語 (Japanese)). */
export const optionLabel=(l:Readonly<{autonym:string;englishName:string}>):string=>/\p{Script=Latin}/u.test(l.autonym)?l.autonym:`${l.autonym} (${l.englishName})`;
/** The notice shown when a language's core chunk (`language`) or a route area's text (`area`) could not be used, in English and
 * in that language (its own text, since its catalog is what failed). Undefined for a tag outside the registry. */
export function failureNotice(kind:'language'|'area',tag:string,registry:readonly LanguageEntry[]=LANGUAGES):Readonly<{en:string;own:string;lang:string}>|undefined{
 const l=languageEntry(tag,registry);if(!l)return undefined;
 const en=kind==='language'?`${l.englishName} could not be loaded; English is shown. Reload to try again.`:`Part of the ${l.englishName} text could not be loaded; that part is shown in English. Reload to try again.`;
 return Object.freeze({en,own:l.notices[kind],lang:l.htmlLang});
}
