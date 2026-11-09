import {activeBundle} from './index';
import {mapParity} from './parity';
import type {MapId,MessageMaps} from './maps';
export type {MapId,MessageMaps,Translation} from './maps';
/** Front ES0 [W]: the `*Messages.ts` maps are chosen per load (docs/I18N.md). Each English map stays the typed source; a module
 * exports `X=pickMessages('x',X_EN)`, and consumers keep reading `X.some.text`. The choice is made on first use, not when the
 * module evaluates: in the production build Rolldown evaluates shared chunks before the entry chunk's own code, so a module-level
 * choice could run before src/boot.ts settled the language (ES0 review 1, finding 1). */

/** An object whose contents are built on first use and then kept. Reads, `in`, Object.keys, spread and JSON see the built object;
 * the view itself cannot be changed. Used for every pickMessages map and for catalog-backed maps built from t. */
export function lazyMessages<T extends object>(build:()=>T):T{
 let built:T|undefined;
 const value=()=>built??=build();
 return new Proxy({} as T,{
  get:(_target,key)=>Reflect.get(value(),key),
  has:(_target,key)=>Reflect.has(value(),key),
  ownKeys:()=>Reflect.ownKeys(value()),
  getOwnPropertyDescriptor:(_target,key)=>{const d=Reflect.getOwnPropertyDescriptor(value(),key);return d&&{...d,configurable:true};},
  getPrototypeOf:()=>Reflect.getPrototypeOf(value()),
  set:()=>false,defineProperty:()=>false,deleteProperty:()=>false,setPrototypeOf:()=>false,
 });
}
const strict=()=>(import.meta.env as {DEV?:boolean}|undefined)?.DEV===true;
const registered=new Map<MapId,unknown>();
/** The map for `id` in this load's language: the bundle's own map (checked against the English shape with mapParity), a derived
 * one (the dev pseudo-locale), or `english`. A map whose shape does not match throws in the dev server and tests; in production
 * that map stays English and the problem is logged. */
export function resolveMessages<K extends MapId>(id:K,english:MessageMaps[K]):MessageMaps[K]{
 const bundle=activeBundle();if(!bundle)return english;
 if(bundle.maps&&Object.hasOwn(bundle.maps,id)){
  const own=bundle.maps[id],problems=mapParity(english,own);
  if(!problems.length)return own as MessageMaps[K];
  const message=`OpenVireo: the ${bundle.language} map "${id}" does not match the English map (${problems.slice(0,5).join('; ')}); English is used.`;
  if(strict())throw new Error(message);
  console.error(message);return english;
 }
 return bundle.deriveMap?bundle.deriveMap(english):english;
}
/** The registered map for `id`, chosen on first use (see resolveMessages). */
export function pickMessages<K extends MapId>(id:K,english:MessageMaps[K]):MessageMaps[K]{
 registered.set(id,english);
 return lazyMessages(()=>resolveMessages(id,english) as object) as MessageMaps[K];
}
/** Every id picked so far in this load, with its English map (tests check the full list and the parity of each map). */
export const pickedMessages=():ReadonlyMap<MapId,unknown>=>registered;
