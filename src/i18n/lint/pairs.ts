/** Front SC4: every translated string of a language with its English source, as the rules read them. Generalised from
 * `pairs()` in src/i18n/es/es.test.ts (which SC9 moves onto this): catalog values, map leaves (functions called with sample
 * arguments that print as «An») and originals. Pure: the caller loads its own files and passes them in. */
import type {Pair} from './rules';
export type PairSources=Readonly<{
 /** The language's catalog (partial while the language is in progress) and en.json. */
 catalog?:Readonly<Record<string,string>>;
 english?:Readonly<Record<string,string>>;
 /** The language's pickMessages maps by id, and the English maps by the same ids. */
 maps?:Readonly<Record<string,unknown>>;
 englishMaps?:Readonly<Record<string,unknown>>;
 /** originals.json: VIREO literal (optionally `context|literal`) → translation. */
 originals?:Readonly<Record<string,string>>;
}>;
/** A sample argument that prints as «An» and acts as the number n+2 in comparisons and number methods (toFixed…). */
export function sampleArgument(i:number):unknown{
 const text=`«A${i+1}»`;
 return new Proxy(Object(i+2),{get:(target,key)=>key===Symbol.toPrimitive?(hint:string)=>hint==='number'?i+2:text:key==='toString'||typeof key==='string'&&key.startsWith('to')?()=>text:Reflect.get(target,key)});
}
/** Ids: `catalog:<key>`, `map:<id>.<path>`, `original:<key>`. A catalog key with no English is paired with '' (the structural
 * checks report it); an original's English is its literal without the `context|` prefix. */
export function collectPairs(s:PairSources):Pair[]{
 const out:Pair[]=[];
 for(const [key,text] of Object.entries(s.catalog??{}))out.push({id:`catalog:${key}`,en:s.english?.[key]??'',text});
 const walk=(e:unknown,t:unknown,at:string)=>{
  if(typeof t==='string'&&typeof e==='string')out.push({id:at,en:e,text:t});
  else if(typeof t==='function'&&typeof e==='function'){
   // String arguments first; a function that formats numbers gets an argument that reads as «An» in text and as a number
   // in comparisons and number methods; one that takes a record or list gets plain numbers.
   for(const make of [(i:number)=>`«A${i+1}»`,sampleArgument,(i:number)=>i+2]){
    const args=Array.from({length:e.length},(_,i)=>make(i));
    try{out.push({id:at,en:String((e as (...a:unknown[])=>unknown)(...args)),text:String((t as (...a:unknown[])=>unknown)(...args))});break;}catch{/* next kind of argument */}
   }
  }
  else if(t&&typeof t==='object'&&e&&typeof e==='object')for(const k of Object.keys(t))walk((e as Record<string,unknown>)[k],(t as Record<string,unknown>)[k],`${at}.${k}`);
 };
 for(const [id,map] of Object.entries(s.maps??{}))walk(s.englishMaps?.[id],map,`map:${id}`);
 for(const [key,text] of Object.entries(s.originals??{}))out.push({id:`original:${key}`,en:key.replace(/^[\p{L}\p{N}_-]+\|/u,''),text});
 return out;
}
