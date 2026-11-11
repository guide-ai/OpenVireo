/** Front SC11 (scripts plan §8 "Numbers, dates", RTL plan "Dates"; user decision 2026-11-09 (9): prints follow the screen
 * language): the date and time a print preview or a screen line shows. They used `new Date().toLocaleString()`, which follows
 * the browser's region, not the page: a Spanish page in an English browser printed an English date, an English page in an
 * Egyptian browser printed Arabic-Indic digits, and a Persian browser printed the year 1405.
 *
 * - English (and the `qps` pseudo-locale, English in disguise) keeps the browser's own date format, as before;
 * - every other language writes the date as the page language does (es-419, pt-BR, and later ja, hi, ru…);
 * - always with Western digits (`-u-nu-latn`) and the Gregorian calendar (`-u-ca-gregory`), whatever the browser's region.
 *
 * Screen and print only. Files the site writes keep their own formats (VIREO's, or the US Windows defaults of the pulsar
 * measurement header, AGENTS.md 2026-10-30 (2)); none of them may call this. */
import {current} from './active';
import {HTML_LANG,type UiLanguage} from './locale';

const browserLocale=()=>{try{return new Intl.DateTimeFormat().resolvedOptions().locale;}catch{return 'en-US';}};
const FALLBACK='en-US-u-ca-gregory-nu-latn';

/** The BCP 47 tag a screen date of `language` is formatted with. `browser` is the browser's default locale (a parameter for tests). */
export function screenDateLocale(language:UiLanguage,browser:string=browserLocale()):string{
 const base=language==='en'||language==='qps'?browser:Object.hasOwn(HTML_LANG,language)?HTML_LANG[language]:language;
 try{return new Intl.Locale(base,{calendar:'gregory',numberingSystem:'latn'}).toString();}catch{return FALLBACK;}
}
/** A date and time for the screen or a print preview, in the page language (see the module note). */
export function screenDateTime(date:Date,language:UiLanguage=current().language):string{
 return date.toLocaleString(screenDateLocale(language));
}
