import type {LanguageEntry} from '../../../src/i18n/languages';
import {LANGUAGES} from '../../../src/i18n/languages';
/** Front SC8 (docs/I18N.md): a registry of the languages the user has ordered (AGENTS.md, 2026-11-09), for the detection and
 * selector tests only. Nothing here reaches the app: the production registry is src/i18n/languages.json, where each language is
 * added by its own first front. The detection ranges are those of the scripts plan §7 and the pt-BR plan §4; `dir`, `catalog` and
 * the notices are stand-ins. Every language is before its release unless a test releases it. */
const entry=(tag:string,autonym:string,englishName:string,match:readonly string[],except?:readonly string[]):LanguageEntry=>Object.freeze({
 tag,dir:tag.toLowerCase(),catalog:`${tag.toLowerCase()}.json`,budgetFactor:1,htmlLang:tag,pagePath:tag.toLowerCase(),autonym,englishName,match,...(except?{except}:{}),released:false,
 notices:Object.freeze({language:`(${tag}) language notice`,area:`(${tag}) area notice`})});
const SPANISH=LANGUAGES.find(l=>l.tag==='es-419')!;
/** Front PT0: Brazilian Portuguese's own line of the production registry (released since PT-REL). */
const PORTUGUESE=LANGUAGES.find(l=>l.tag==='pt-BR')!;
const TRADITIONAL=['zh-Hant','zh-TW','zh-HK','zh-MO'];
export const ZH_HANT=entry('zh-Hant','繁體中文','Chinese, Traditional',TRADITIONAL);
/** Spanish and pt-BR as released, then French, Indonesian, Hindi, Japanese, Simplified Chinese and Russian, before their release. */
export const PLANNED:readonly LanguageEntry[]=Object.freeze([
 SPANISH,
 PORTUGUESE,
 entry('fr','Français','French',['fr']),
 entry('id','Bahasa Indonesia','Indonesian',['id']),
 entry('hi','हिन्दी','Hindi',['hi']),
 entry('ja','日本語','Japanese',['ja']),
 entry('zh-Hans','简体中文','Chinese, Simplified',['zh-Hans','zh-CN','zh-SG','zh-MY','zh'],TRADITIONAL),
 entry('ru','Русский','Russian',['ru']),
]);
/** The registry with `tags` released. */
export const releasing=(registry:readonly LanguageEntry[],...tags:string[]):readonly LanguageEntry[]=>registry.map(l=>tags.includes(l.tag)?{...l,released:true}:l);
/** Front RTL-1 (RT1; plan front-i18n-rtl.md § 7): right-to-left languages for the direction tests only. Arabic is not in the
 * user's order (2026-11-10: groundwork only), and Hebrew and Persian are checks, not plans. Detection ranges are the plan's: one
 * Modern Standard Arabic for every `ar` region, `he` with the old `iw` code, `fa` (Iran and Afghanistan's Dari). */
export const RTL:readonly LanguageEntry[]=Object.freeze([
 Object.freeze({...entry('ar','العربية','Arabic',['ar']),direction:'rtl' as const}),
 Object.freeze({...entry('he','עברית','Hebrew',['he','iw']),direction:'rtl' as const}),
 Object.freeze({...entry('fa','فارسی','Persian',['fa']),direction:'rtl' as const}),
]);
