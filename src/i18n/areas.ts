/** Front ES-SPLIT [W] (docs/I18N.md, "Spanish: the chunk split by route area"): a non-English language arrives as a core module,
 * which boot waits for, and one module per route area, which the area's routes fetch in parallel with their own JavaScript
 * (src/components/lazyArea.ts). English, the pseudo-locales and a load whose language failed have no areas: loadArea resolves at
 * once and nothing is fetched. scripts/i18n-split.mjs reads AREAS from this file; keep it a plain array literal. */
import {current,extendLocale,markAreaFailed} from './active';
import {LANGUAGE_TIMEOUT_MS} from './settle';
export const AREAS=['classification','cluster','photometer','pulsar','radio','lss','exposure','fits'] as const;
export type AreaName=typeof AREAS[number];
/** Per activation (the bundle's `areas` object, which extendLocale keeps): one load per area. */
const loads=new WeakMap<object,Map<string,Promise<void>>>();
const listeners=new Set<()=>void>();
const timer=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
/** Fetches the area's text once per load and adds it to the active language. Never rejects: an area that fails or does not arrive
 * within LANGUAGE_TIMEOUT_MS is marked failed (its text stays English, AREA_FAILURE_NOTICE is shown), and a part that arrives
 * after that is ignored, as at boot. */
export function loadArea(name:AreaName,wait:(ms:number)=>Promise<void>=timer):Promise<void>{
 const active=current(),areas=active.bundle?.areas;
 if(!areas)return Promise.resolve();
 let started=loads.get(areas);if(!started)loads.set(areas,started=new Map());
 let settled=started.get(name);
 if(!settled){
  const fail=(error:unknown)=>{markAreaFailed(name);console.error(`OpenVireo: area ${name} could not be loaded; English is shown.`,error);for(const l of listeners)l();};
  settled=Promise.race([Promise.resolve().then(()=>areas[name]!()).then(m=>m.default),wait(LANGUAGE_TIMEOUT_MS).then(()=>{throw new Error(`timeout ${LANGUAGE_TIMEOUT_MS} ms`);})]).then(part=>{try{extendLocale(name,part);}catch(error){fail(error);}},fail);
  started.set(name,settled);
 }
 return settled;
}
/** True when an area of this load failed (the shell shows AREA_FAILURE_NOTICE once). */
export const areaFailed=():boolean=>[...current().areas.values()].includes('failed');
export function subscribeAreaFailures(listener:()=>void):()=>void{listeners.add(listener);return ()=>{listeners.delete(listener);};}
