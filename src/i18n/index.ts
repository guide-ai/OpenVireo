// Front ES0 (docs/I18N.md): src/boot.ts settles the language of this load; t, the pickMessages maps and vireo() read it when they
// are used, never when a module evaluates.
import en from './en.json';
import {english,type MessageKey,type Translate} from './catalog';
import {activateLocale,current} from './active';
import type {UiLanguage} from './locale';
export {createI18n,locale,type I18n,type LocaleBundle,type MessageArgs,type MessageKey,type MessageValues,type PlainMessageKey,type Translate} from './catalog';
export type {UiLanguage};
export {activateLocale};
/** The UI language of this load. */
export const uiLanguage=():UiLanguage=>current().language;
/** The registered non-English bundle of this load, or null for English (src/i18n/registry.ts and vireo.ts). */
export const activeBundle=()=>current().bundle;
type Render=(key:MessageKey,values?:Readonly<Record<string,string|number>>)=>string;
export const t:Translate=((key:MessageKey,values?:Readonly<Record<string,string|number>>)=>(current().i18n.t as Render)(key,values))as Translate;
/** A field engine reason code in words (the field spectrometer's `fieldSpec.reason.*` text), or the code itself when it has none. */
export function fieldReasonText(code:string):string{const key=`fieldSpec.reason.${code}`;return Object.hasOwn(en,key)?(t as Render)(key as MessageKey):code;}
// Numbers are formatted with `locale` in every UI language (decision 4), so these stay bound to the English instance.
export const formatNumber=english.formatNumber;
export const fixed=english.fixed;
export const scientific=english.scientific;
// Decimal input syntax, source bytes, precision readouts and scientific exports
// deliberately retain their declared machine policies, independent of locale.
