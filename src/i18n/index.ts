import en from './en.json';
import type {MessageParameters} from './params.generated';
export type MessageKey=keyof typeof en;
export type PlainMessageKey={[K in MessageKey]:MessageParameters[K]extends never?K:never}[MessageKey];
type ParameterNames<K extends MessageKey>=K extends keyof MessageParameters?MessageParameters[K]:never;
export type MessageValues<K extends MessageKey>={readonly[P in ParameterNames<K>]:string|number};
export type MessageArgs<K extends MessageKey>=[ParameterNames<K>]extends[never]?[values?:never]:[values:MessageValues<K>];
export type Translate=<K extends MessageKey>(key:K,...args:MessageArgs<K>)=>string;
export const locale='en-US';
const parameters=(text:string)=>[...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))].sort();
/** Explicit instances allow later language providers without global mutation.
 * Only presentation consumes them; inputs, original labels, journals and files
 * never pass through a translator or locale number parser. */
export function createI18n(messages:Readonly<Record<MessageKey,string>>,language:string){
 const keys=Object.keys(en);if(!messages||Object.keys(messages).length!==keys.length||keys.some(k=>!Object.hasOwn(messages,k)))throw new Error('Invalid message catalog keys');
 for(const key of keys as MessageKey[])if(typeof messages[key]!=='string'||parameters(messages[key]).join('|')!==parameters(en[key]).join('|'))throw new Error(`Invalid message parameters: ${key}`);
 new Intl.NumberFormat(language);const catalog=Object.freeze({...messages});
 const translate=((key:MessageKey,values:Readonly<Record<string,string|number>>={})=>{
  if(!Object.hasOwn(catalog,key))throw new Error('Unknown message key');
  const text=catalog[key];for(const name of parameters(text))if(!Object.hasOwn(values,name)||!['string','number'].includes(typeof values[name]))throw new Error(`Missing message parameter: ${key}.${name}`);
  return text.replace(/\{(\w+)\}/g,(_,name:string)=>String(values[name]));
 })as Translate;
 const decimal=new Intl.NumberFormat(language,{minimumFractionDigits:1}).formatToParts(1.1).find(p=>p.type==='decimal')!.value;
 const fixed=(value:number,digits:number)=>value.toFixed(digits).replace('.',decimal);
 const scientific=(value:number,digits:number,trim=false)=>{const text=value.toPrecision(digits);return (trim?Number(text).toString():text).replace('.',decimal);};
 return Object.freeze({locale:language,t:translate,fixed,scientific,formatNumber:(value:number,options:Intl.NumberFormatOptions={})=>new Intl.NumberFormat(language,options).format(value)});
}
const english=createI18n(en,locale);
export const t:Translate=english.t;
export const formatNumber=english.formatNumber;
export const fixed=english.fixed;
export const scientific=english.scientific;
// Decimal input syntax, source bytes, precision readouts and scientific exports
// deliberately retain their declared machine policies, independent of locale.
