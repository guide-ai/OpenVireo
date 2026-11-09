import en from './en.json' with {type:'json'};
import type {LocaleBundle,MessageKey} from './catalog';
/** Front ES0 [W], dev server and tests only: the pseudo-locale `qps` (`?lang=qps`, accepted only when import.meta.env.DEV;
 * src/boot.ts imports this module only behind that check, so the production build does not contain it). Every translated
 * string is wrapped in ⟦…⟧, its vowels are accented and it is padded about 35 % longer, the expected Spanish length; {params}
 * are kept. Visible text without ⟦ is text that does not go through the catalog, a map or vireo(); a download that contains ⟦
 * is presentation text that reached a file (docs/I18N.md, tests/i18n/exports-identity.spec.ts). */
export const PSEUDO_OPEN='⟦',PSEUDO_CLOSE='⟧',PSEUDO_PAD='·';
const ACCENTS:Readonly<Record<string,string>>={a:'á',e:'é',i:'í',o:'ó',u:'ú',A:'Á',E:'É',I:'Í',O:'Ó',U:'Ú'};
const padding=(length:number)=>PSEUDO_PAD.repeat(Math.ceil(length*.35));
/** A catalog or literal string: accented outside its {params}, padded and marked. */
export function pseudo(text:string):string{
 if(!text)return text;
 let length=0;
 const body=text.split(/(\{\w+\})/).map((part,i)=>{if(i%2)return part;length+=part.length;return part.replace(/[aeiouAEIOU]/g,c=>ACCENTS[c]);}).join('');
 return `${PSEUDO_OPEN}${body}${padding(length)}${PSEUDO_CLOSE}`;
}
/** The result of a map function: it may carry data (names, numbers), so it is only padded and marked. */
export const pseudoMark=(text:string):string=>text?`${PSEUDO_OPEN}${text}${padding(text.length)}${PSEUDO_CLOSE}`:text;
/** A map with every string leaf pseudo-localized and every function's string result marked; other leaves are unchanged.
 * Front SC2: `text` is the string transform (the script-stress pseudo-locales of src/i18n/pseudoScripts.ts pass theirs). */
export function pseudoMap<T>(english:T,text:(value:string)=>string=pseudo):T{
 const seen=new WeakMap<object,unknown>();
 const walk=(value:unknown):unknown=>{
  if(typeof value==='string')return text(value);
  if(typeof value==='function'){
   const fn=value as (...args:unknown[])=>unknown;
   const wrapped=function(this:unknown,...args:unknown[]){const result=fn.apply(this,args);return typeof result==='string'?pseudoMark(result):result;};
   Object.defineProperty(wrapped,'length',{value:fn.length});return wrapped;
  }
  if(!value||typeof value!=='object')return value;
  if(seen.has(value))return seen.get(value);
  const out:Record<string,unknown>|unknown[]=Array.isArray(value)?[]:{};seen.set(value,out);
  for(const [k,v] of Object.entries(value))(out as Record<string,unknown>)[k]=walk(v);
  return Object.isFrozen(value)?Object.freeze(out):out;
 };
 return walk(english) as T;
}
export function pseudoBundle():LocaleBundle{
 const messages=Object.fromEntries(Object.entries(en).map(([key,text])=>[key,pseudo(text)]))as Record<MessageKey,string>;
 return Object.freeze({language:'qps',messages,deriveMap:pseudoMap,deriveOriginal:pseudo});
}
