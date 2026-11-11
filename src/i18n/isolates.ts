/** Front RT4 (docs/I18N.md "RTL groundwork: the bidi runtime"; plan analysis/front-plans/front-i18n-rtl.md § 3.2): the Unicode
 * isolates the bidi runtime puts around mixed-direction text in a right-to-left load. Pure, no imports, so src/i18n/catalog.ts and
 * src/i18n/active.ts can use it; the load-aware helpers (iso, plotText) are src/i18n/bidi.ts. Translators never type these
 * characters (the lint's bidi-control rule refuses them): the runtime adds them, only when the load is right-to-left, so an
 * English, Spanish or Portuguese load never sees one. */

/** U+2068 FIRST STRONG ISOLATE: the content takes the direction of its first strong letter, and ltr when it has none
 * ("-12.5", "12h 30m", "+26° 42′", "Hubble.HTL" keep their order; an Arabic name reads right to left). */
export const FSI='\u2068';
/** U+2066 LEFT-TO-RIGHT ISOLATE: the content is left to right whatever it holds (English text shown in a right-to-left page). */
export const LRI='\u2066';
/** U+2069 POP DIRECTIONAL ISOLATE: closes FSI or LRI. */
export const PDI='\u2069';
/** Every bidi control a string may carry: LRM, RLM, ALM, the embeddings and overrides (U+202A–E), the isolates (U+2066–9). */
export const BIDI_CONTROLS=/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/u;

/** A letter of a right-to-left script (Arabic, Hebrew, Syriac, Thaana, N'Ko, Samaritan, Mandaic, Adlam). */
const RTL_LETTER=/(?=\p{L})[\p{sc=Arabic}\p{sc=Hebrew}\p{sc=Syriac}\p{sc=Thaana}\p{sc=Nko}\p{sc=Samaritan}\p{sc=Mandaic}\p{sc=Adlam}]/u;
/** Whether `text` has a right-to-left letter of its own. Text without one (English, a file name, a format such as "{a}: {b}" or
 * "{n} km/s") is shown left to right as a whole in a right-to-left load: alone in a right-to-left paragraph its pieces would be
 * drawn in reverse order ("R NOMAD :NF", "km/s 12.5", "…Save As"). */
export const hasRtlLetter=(text:string):boolean=>RTL_LETTER.test(text);
/** Whether `body` is one isolate from its first character to its last (FSI, LRI or RLI and its matching PDI): the runtime's
 * output passed on again, such as `t()` or `vireo()` text given to `t()` as a parameter. */
function wholeIsolate(body:string):boolean{
 const first=body.charCodeAt(0);
 if(first<0x2066||first>0x2068||body.charCodeAt(body.length-1)!==0x2069)return false;
 for(let i=1,depth=1;i<body.length;i++){
  const c=body.charCodeAt(i);
  if(c>=0x2066&&c<=0x2068)depth++;
  else if(c===0x2069&&!--depth)return i===body.length-1;
 }
 return false;
}
/** `text` in an isolate opened by `open`, with its leading and trailing white space left outside (a head such as 'RA:  ' that
 * coordinates follow keeps its spacing in the sentence). Text with nothing but white space is returned unchanged, so an empty
 * string stays empty (falsy) and a separator stays a separator; so is text that is already one whole isolate (an isolate that
 * holds only another isolate draws exactly as the inner one, so the runtime never nests its own output: `t()` or `vireo()` text
 * passed to `t()` as a parameter keeps its one isolate). */
function isolate(open:string,text:string):string{
 const head=/^\s*/.exec(text)![0];if(head.length===text.length)return text;
 const tail=/\s*$/.exec(text)![0],body=text.slice(head.length,text.length-tail.length);
 return wholeIsolate(body)?text:head+open+body+PDI+tail;
}
/** A value inside right-to-left text (a `t()` parameter, a map function's data, a plot label): FSI…PDI. */
export const firstStrongIsolate=(text:string):string=>isolate(FSI,text);
/** English text inside a right-to-left page (a fallback key, map leaf or VIREO original): LRI…PDI, so "Save As…" keeps its
 * ellipsis at the right and "RA:" its colon. */
export const ltrIsolate=(text:string):string=>isolate(LRI,text);

/** A message map with its English made left to right for a right-to-left load (src/i18n/registry.ts): `strings` wraps every
 * string leaf, and every function's string result is wrapped either way (a map function returns English text with its data).
 * The shape is kept: the same keys, arrays, function arity and frozenness, so mapParity and lazyMessages see the English map's
 * shape. Non-string leaves are unchanged. */
export function isolateMap<T>(english:T,{strings}:Readonly<{strings:boolean}>):T{
 const seen=new WeakMap<object,unknown>();
 const walk=(value:unknown):unknown=>{
  if(typeof value==='string')return strings?ltrIsolate(value):value;
  if(typeof value==='function'){
   const fn=value as (...args:unknown[])=>unknown;
   const wrapped=function(this:unknown,...args:unknown[]){const result=fn.apply(this,args);return typeof result==='string'?ltrIsolate(result):result;};
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
