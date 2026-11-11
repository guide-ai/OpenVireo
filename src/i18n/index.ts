// Front ES0 (docs/I18N.md): src/boot.ts settles the language of this load; t, the pickMessages maps and vireo() read it when they
// are used, never when a module evaluates.
import en from './en.json';
import {english,type MessageKey,type Translate} from './catalog';
import {activateLocale,current,notePendingText} from './active';
import type {TextDirection,UiLanguage} from './locale';
import {plural,type PluralForms} from './plural';
export {createI18n,locale,type I18n,type LocaleBundle,type MessageArgs,type MessageKey,type MessageValues,type PlainMessageKey,type Translate} from './catalog';
export type {UiLanguage};
export {activateLocale};
/** The UI language of this load. */
export const uiLanguage=():UiLanguage=>current().language;
/** Front RTL-1 (RT1): the text direction of this load's UI language (its <html dir>), for code that places things by side
 * (popup menus, the tour: RT6). Fixed for a whole load: a language change reloads the page. Front RT4: read from the settled
 * load (src/i18n/active.ts `rtl`, set from the page's registry), so it always agrees with <html dir> and the bidi runtime. */
export const uiDirection=():TextDirection=>current().rtl?'rtl':'ltr';
export type {TextDirection};
/** Front SC11: the catalog key of a count's plural form in this load's language (src/i18n/plural.ts), from literal keys per category
 * (`t(pluralKey(n,{one:'x.one',other:'x.other'}),{count:n})`), so the area split and the key audits still see every key. A
 * category the forms leave out uses `other`. */
export function pluralKey<K extends MessageKey>(count:number,forms:PluralForms<K>,options?:Intl.PluralRulesOptions):K{return plural(current().language,count,forms,options);}
/** The registered non-English bundle of this load, or null for English (src/i18n/registry.ts and vireo.ts). */
export const activeBundle=()=>current().bundle;
type Render=(key:MessageKey,values?:Readonly<Record<string,string|number>>)=>string;
/** Front ES-SPLIT: in a split language, a key that the active messages lack may belong to a route area that has not arrived; see
 * notePendingText (src/i18n/active.ts). English pays one null test. */
export const t:Translate=((key:MessageKey,values?:Readonly<Record<string,string|number>>)=>{
 const active=current(),bundle=active.bundle;
 if(bundle?.areas&&!Object.hasOwn(bundle.messages,key)){const modules=bundle.keyModules;if(!modules||modules[key])notePendingText(active,`text "${key}"`,modules?.[key]?.split('+'));}
 return (active.i18n.t as Render)(key,values);
})as Translate;
/** A field engine reason code in words (the field spectrometer's `fieldSpec.reason.*` text), or the code itself when it has none. */
export function fieldReasonText(code:string):string{const key=`fieldSpec.reason.${code}`;return Object.hasOwn(en,key)?(t as Render)(key as MessageKey):code;}
// Numbers are formatted with `locale` in every UI language (decision 4): the decimal point and these fixed and scientific forms
// stay bound to the English instance. Front PT-REL (user decision of 2026-11-10): formatNumber reads this load's language, since a
// language may separate thousands its own way on screen (the registry's `thousands`: «24 000» in Portuguese); English, Spanish
// and the pseudo-locales keep en-US's comma.
export const formatNumber:typeof english.formatNumber=(value,options)=>current().i18n.formatNumber(value,options);
export const fixed=english.fixed;
export const scientific=english.scientific;
// Decimal input syntax, source bytes, precision readouts and scientific exports
// deliberately retain their declared machine policies, independent of locale.
