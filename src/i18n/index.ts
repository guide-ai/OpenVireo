// Front ES0 (docs/I18N.md): src/boot.ts settles the language of this load; t, the pickMessages maps and vireo() read it when they
// are used, never when a module evaluates.
import en from './en.json';
import {english,type MessageKey,type Translate} from './catalog';
import {activateLocale,current,notePendingText} from './active';
import type {UiLanguage} from './locale';
export {createI18n,locale,type I18n,type LocaleBundle,type MessageArgs,type MessageKey,type MessageValues,type PlainMessageKey,type Translate} from './catalog';
export type {UiLanguage};
export {activateLocale};
/** The UI language of this load. */
export const uiLanguage=():UiLanguage=>current().language;
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
