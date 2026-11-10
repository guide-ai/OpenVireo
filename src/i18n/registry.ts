import {activeBundle} from './index';
import {current,notePendingText,pendingTextRequests} from './active';
import {completeWithEnglish,mapParity} from './parity';
import {SPANISH_RELEASED} from './locale';
import type {MapId,MessageMaps} from './maps';
export type {MapId,MessageMaps,Translation} from './maps';
/** Front ES0 [W]: the `*Messages.ts` maps are chosen per load (docs/I18N.md). Each English map stays the typed source; a module
 * exports `X=pickMessages('x',X_EN)`, and consumers keep reading `X.some.text`. The choice is made on first use, not when the
 * module evaluates: in the production build Rolldown evaluates shared chunks before the entry chunk's own code, so a module-level
 * choice could run before src/boot.ts settled the language (ES0 review 1, finding 1). */

/** An object whose contents are built on first use and then kept. Reads, `in`, Object.keys, spread and JSON see the built object;
 * the view itself cannot be changed. Used for every pickMessages map and for catalog-backed maps built from t.
 * Front ES1: with `shape` (the English map) a read of a nested object or a function does not build yet: it returns a view of
 * that part, or a function that builds when called. So module-level aliases such as `const M=OBSERVATORY_MESSAGES.entry` stay
 * lazy while a Spanish load waits for its chunk; only reading a string builds. */
export function lazyMessages<T extends object>(build:()=>T,shape?:unknown):T{
 let built:T|undefined;
 return lazyView(()=>built??keep(build,value=>{built=value;}),shape) as T;
}
/** Front ES-SPLIT: builds, and keeps the result only when no read during the build found its text's area still loading
 * (pendingTextRequests did not move), so text read too early becomes the language's once its area arrives. */
function keep<T>(build:()=>T,store:(value:T)=>void):T{
 const before=pendingTextRequests(),value=build();
 if(pendingTextRequests()===before)store(value);
 return value;
}
const deferred=(v:unknown)=>v!==null&&typeof v==='object';
function lazyView(value:()=>object,shape:unknown):object{
 const parts=new Map<PropertyKey,unknown>();
 return new Proxy(Array.isArray(shape)?[]:{},{
  get:(_target,key)=>{
   // Front ES-SPLIT review: React Refresh (dev server only) probes `$$typeof` of every capitalised module-level value when its
   // module evaluates (`const RADIO_SAVE_TEXTS=lazyMessages(…)`). A message map is never a React type, so that probe must not build
   // it: in a route area's module it would read text before the area arrived.
   if(key==='$$typeof')return undefined;
   const english=shape!==undefined&&shape!==null&&typeof shape==='object'&&Object.hasOwn(shape,key)?(shape as Record<PropertyKey,unknown>)[key]:undefined;
   if(english!==undefined&&(deferred(english)||typeof english==='function')){
    if(!parts.has(key))parts.set(key,deferred(english)
     ?lazyView(()=>Reflect.get(value(),key) as object,english)
     :Object.defineProperty((...args:unknown[])=>(Reflect.get(value(),key) as (...a:unknown[])=>unknown)(...args),'length',{value:(english as ()=>unknown).length}));
    return parts.get(key);
   }
   return Reflect.get(value(),key);
  },
  has:(_target,key)=>Reflect.has(value(),key),
  ownKeys:()=>{const keys=Reflect.ownKeys(value());return Array.isArray(shape)&&!keys.includes('length')?[...keys,'length']:keys;},
  getOwnPropertyDescriptor:(_target,key)=>{
   if(Array.isArray(shape)&&key==='length')return {value:(value() as unknown[]).length,writable:true,enumerable:false,configurable:false};
   const d=Reflect.getOwnPropertyDescriptor(value(),key);return d&&{...d,configurable:true};
  },
  getPrototypeOf:()=>Reflect.getPrototypeOf(value()),
  set:()=>false,defineProperty:()=>false,deleteProperty:()=>false,setPrototypeOf:()=>false,
 });
}
const strict=()=>(import.meta.env as {DEV?:boolean}|undefined)?.DEV===true;
const registered=new Map<MapId,unknown>();
/** The map for `id` in this load's language: the bundle's own map (checked against the English shape with mapParity; a map of a
 * language still behind its release gate may be partial and is completed with English), a derived
 * one (the dev pseudo-locale), or `english`. A map whose shape does not match throws in the dev server and tests; in production
 * that map stays English and the problem is logged. */
export function resolveMessages<K extends MapId>(id:K,english:MessageMaps[K]):MessageMaps[K]{
 const bundle=activeBundle();if(!bundle)return english;
 if(bundle.maps&&Object.hasOwn(bundle.maps,id)){
  const own=bundle.maps[id];
  if(!mapParity(english,own).length)return own as MessageMaps[K];
  // Before ES-REL a Spanish map could be partial (the sub-fronts merged so far); its missing strings stayed English. Since ES-REL
  // a Spanish map must be complete (src/i18n/es/es.test.ts checks every map id statically).
  const partial=bundle.language==='es-419'&&!SPANISH_RELEASED,problems=mapParity(english,own,'$',{partial});
  if(!problems.length)return completeWithEnglish(english,own);
  const message=`OpenVireo: the ${bundle.language} map "${id}" does not match the English map (${problems.slice(0,5).join('; ')}); English is used.`;
  if(strict())throw new Error(message);
  console.error(message);return english;
 }
 // Front ES-SPLIT: a map of a route area that has not arrived (or failed: then English without an error).
 const areas=bundle.mapModules?.[id];
 if(areas){notePendingText(current(),`map "${id}"`,areas);return english;}
 return bundle.deriveMap?bundle.deriveMap(english):english;
}
/** The registered map for `id`, chosen on first use (see resolveMessages). */
export function pickMessages<K extends MapId>(id:K,english:MessageMaps[K]):MessageMaps[K]{
 registered.set(id,english);
 return lazyMessages(()=>resolveMessages(id,english) as object,english) as MessageMaps[K];
}
/** Every id picked so far in this load, with its English map (tests check the full list and the parity of each map). */
export const pickedMessages=():ReadonlyMap<MapId,unknown>=>registered;
/** Front ES1: a translator made on its first call, for module-level translators (`const PT=lazyTranslator(createPulsarTranslator)`):
 * making one reads its whole map, which must not happen while a Spanish load waits for its chunk. */
export function lazyTranslator<F extends (...args:never[])=>unknown>(make:()=>F):F{
 let made:F|undefined;
 return ((...args:Parameters<F>)=>(made??keep(make,value=>{made=value;}))(...args)) as unknown as F;
}
