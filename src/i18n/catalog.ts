/** Front ES0: the catalog machinery behind src/i18n/index.ts, split out so src/boot.ts can settle the language with only these
 * small modules (catalog.ts, active.ts, locale.ts) in its static graph. App code imports from src/i18n/index.ts. */
import en from './en.json';
import type {MessageParameters} from './params.generated';
import type {UiLanguage} from './locale';
import type {BundleMaps} from './maps';
export type MessageKey=keyof typeof en;
export type PlainMessageKey={[K in MessageKey]:MessageParameters[K]extends never?K:never}[MessageKey];
type ParameterNames<K extends MessageKey>=K extends keyof MessageParameters?MessageParameters[K]:never;
export type MessageValues<K extends MessageKey>={readonly[P in ParameterNames<K>]:string|number};
export type MessageArgs<K extends MessageKey>=[ParameterNames<K>]extends[never]?[values?:never]:[values:MessageValues<K>];
export type Translate=<K extends MessageKey>(key:K,...args:MessageArgs<K>)=>string;
export type {UiLanguage};
/** The number locale of every UI language: Spanish keeps the decimal point on screen, as typed inputs and files do (user
 * decision 4, 2026-11-09). */
export const locale='en-US';
const parameters=(text:string)=>[...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))].sort();
type CatalogOptions=Readonly<{
 /** Accept a partial catalog whose missing keys fall back to English (only before the Spanish release, ES-REL). */
 fallback?:boolean;
 /** Number formatting locale; it defaults to `language` for explicit instances, and is `locale` for the UI languages. */
 numberLocale?:string;
}>;
/** Explicit instances allow later language providers without global mutation.
 * Only presentation consumes them; inputs, original labels, journals and files
 * never pass through a translator or locale number parser.
 * A complete catalog is required at compile time unless `fallback` is given explicitly. */
export function createI18n(messages:Readonly<Record<MessageKey,string>>,language:string,options?:CatalogOptions&Readonly<{fallback?:false}>):I18n;
export function createI18n(messages:Readonly<Partial<Record<MessageKey,string>>>,language:string,options:CatalogOptions&Readonly<{fallback:boolean}>):I18n;
export function createI18n(messages:Readonly<Partial<Record<MessageKey,string>>>,language:string,options:CatalogOptions={}):I18n{return build(messages,language,options);}
function build(messages:Readonly<Partial<Record<MessageKey,string>>>,language:string,{fallback=false,numberLocale=language}:CatalogOptions){
 const keys=Object.keys(en) as MessageKey[];
 if(!messages||typeof messages!=='object'||Object.keys(messages).some(k=>!Object.hasOwn(en,k))||(!fallback&&(Object.keys(messages).length!==keys.length||keys.some(k=>!Object.hasOwn(messages,k)))))throw new Error('Invalid message catalog keys');
 for(const key of keys)if(Object.hasOwn(messages,key)&&(typeof messages[key]!=='string'||parameters(messages[key]!).join('|')!==parameters(en[key]).join('|')))throw new Error(`Invalid message parameters: ${key}`);
 new Intl.NumberFormat(numberLocale);const catalog:Readonly<Record<MessageKey,string>>=Object.freeze({...en,...messages});
 const translate=((key:MessageKey,values:Readonly<Record<string,string|number>>={})=>{
  if(!Object.hasOwn(catalog,key))throw new Error('Unknown message key');
  const text=catalog[key];for(const name of parameters(text))if(!Object.hasOwn(values,name)||!['string','number'].includes(typeof values[name]))throw new Error(`Missing message parameter: ${key}.${name}`);
  return text.replace(/\{(\w+)\}/g,(_,name:string)=>String(values[name]));
 })as Translate;
 const decimal=new Intl.NumberFormat(numberLocale,{minimumFractionDigits:1}).formatToParts(1.1).find(p=>p.type==='decimal')!.value;
 const fixed=(value:number,digits:number)=>value.toFixed(digits).replace('.',decimal);
 const scientific=(value:number,digits:number,trim=false)=>{const text=value.toPrecision(digits);return (trim?Number(text).toString():text).replace('.',decimal);};
 return Object.freeze({locale:language,t:translate,fixed,scientific,formatNumber:(value:number,options:Intl.NumberFormatOptions={})=>new Intl.NumberFormat(numberLocale,options).format(value)});
}
export type I18n=ReturnType<typeof build>;
/** What a non-English load registers before the app is imported (docs/I18N.md). The Spanish bundle arrives with ES1 in
 * src/i18n/es/; the dev-only pseudo-locale is src/i18n/pseudo.ts. */
export type LocaleBundle=Readonly<{
 language:Exclude<UiLanguage,'en'>;
 /** Catalog text by key; missing keys fall back to English until ES-REL. */
 messages:Readonly<Partial<Record<MessageKey,string>>>;
 /** `*Messages.ts` maps by their pickMessages id (src/i18n/maps.ts), each checked against its English map on first use. */
 maps?:BundleMaps;
 /** VIREO's own literals by normalised original (src/i18n/vireo.ts). */
 originals?:Readonly<Record<string,string>>;
 /** Dev-only pseudo-locale: derive a map or an original that the bundle does not list. */
 deriveMap?:<T>(english:T)=>T;
 deriveOriginal?:(text:string)=>string;
}>;
/** The English instance; numbers are formatted with `locale` in every UI language (decision 4). */
export const english=createI18n(en,locale);
