import {createI18n,english,locale,type I18n,type LocaleAreaPart,type LocaleBundle} from './catalog';
import {HTML_LANG,SPANISH_RELEASED,type UiLanguage} from './locale';
import {MAP_IDS} from './maps';
/** Front ES0: the language of this load, set once by src/boot.ts (docs/I18N.md). App code imports from src/i18n/index.ts. */
/** Front ES-SPLIT: `areas` records the route areas of a split bundle that arrived ('loaded') or will not ('failed'). */
export type Active=Readonly<{language:UiLanguage;i18n:I18n;bundle:LocaleBundle|null;areas:ReadonlyMap<string,'loaded'|'failed'>}>;
/** The active language lives on globalThis (as src/focusAfterLayout.ts keeps its state), so a re-evaluated copy of this module
 * (dev-server hot update, a test's vi.resetModules) keeps the language boot settled instead of tripping the wire below. */
const ACTIVE=Symbol.for('openvireo.i18n.active'),EARLY=Symbol.for('openvireo.i18n.early'),FAILED=Symbol.for('openvireo.i18n.failed');
const holder=globalThis as typeof globalThis&{[ACTIVE]?:Active;[EARLY]?:number;[FAILED]?:UiLanguage|null};
const NO_AREAS:ReadonlyMap<string,'loaded'|'failed'>=new Map();
const ENGLISH:Active=Object.freeze({language:'en',i18n:english,bundle:null,areas:NO_AREAS});
/** Dev server and Vitest only: text requested before the language was settled fails loudly (in Vitest the English setup file
 * src/i18n/useEnglish.ts settles it). In production the request is answered in English and counted (earlyTextRequests), and
 * src/boot.ts reports the count; the holder itself is set only by activateLocale. */
const tripwire=()=>(import.meta.env as {DEV?:boolean}|undefined)?.DEV===true;
export function current():Active{
 const active=holder[ACTIVE];if(active)return active;
 if(tripwire())throw new Error('OpenVireo text was requested before src/boot.ts settled the language.');
 holder[EARLY]=(holder[EARLY]??0)+1;return ENGLISH;
}
/** How many text requests were answered before the language was settled (0 when boot ran first, as it must). */
export const earlyTextRequests=():number=>holder[EARLY]??0;
/** Settles the language: src/boot.ts once per load, and the English test setup. null is English. A bundle with a wrong
 * catalog or an unknown map id throws, and nothing is set. */
export function activateLocale(bundle:LocaleBundle|null):UiLanguage{
 let next=ENGLISH;
 if(bundle){
  checkMapIds([...Object.keys(bundle.maps??{}),...Object.keys(bundle.mapModules??{})]);
  // Front ES-SPLIT: a split bundle always builds with the English fallback, since its catalog is never complete in one module
  // (completeness is checked statically: src/i18n/split.test.ts). ES-REL must keep `bundle.areas` here when it flips the gate.
  next=Object.freeze({language:bundle.language,i18n:createI18n(bundle.messages,HTML_LANG[bundle.language],{fallback:!!bundle.areas||(bundle.language==='es-419'&&!SPANISH_RELEASED),numberLocale:locale}),bundle,areas:NO_AREAS});
 }
 holder[ACTIVE]=next;return next.language;
}
function checkMapIds(ids:readonly string[]){
 const unknown=ids.filter(id=>!(MAP_IDS as readonly string[]).includes(id));
 if(unknown.length)throw new Error(`Unknown message map id: ${unknown.join(', ')}`);
}
/** Front ES-SPLIT: adds one route area's text to the active split language (src/i18n/areas.ts loadArea, once per area). The
 * holder is replaced, never edited: the catalog is rebuilt with the area's keys and its maps join the bundle's. A part of another
 * language or area, or one with an unknown map id, throws and nothing changes. */
export function extendLocale(area:string,part:LocaleAreaPart):void{
 const active=holder[ACTIVE],bundle=active?.bundle;
 if(!active||!bundle?.areas||part?.language!==active.language||part.area!==area)throw new Error(`OpenVireo: not a part of area ${area}`);
 checkMapIds(Object.keys(part.maps??{}));
 const next:LocaleBundle=Object.freeze({...bundle,messages:{...bundle.messages,...part.messages},maps:{...bundle.maps,...part.maps}});
 holder[ACTIVE]=Object.freeze({...active,i18n:createI18n(next.messages,HTML_LANG[active.language],{fallback:true,numberLocale:locale}),bundle:next,areas:new Map([...active.areas,[area,'loaded' as const]])});
}
/** Front ES-SPLIT: the area's text did not arrive (an error, or LANGUAGE_TIMEOUT_MS); it stays English for this load. */
export function markAreaFailed(area:string):void{
 const active=holder[ACTIVE];if(active?.bundle?.areas&&!active.areas.has(area))holder[ACTIVE]=Object.freeze({...active,areas:new Map([...active.areas,[area,'failed' as const]])});
}
let pendingReads=0;const logged=new Set<string>();
/** Front ES-SPLIT: how many reads found their text's area not yet loaded. src/i18n/registry.ts keeps a built map or translator only
 * when this did not move while it was built, so text read too early becomes the language's once its area arrives. */
export const pendingTextRequests=():number=>pendingReads;
/** A read of `what` (a key or a map) that the active split language does not hold. `areas` are the areas that bring it, when
 * known (the maps, and the keys in the dev server and Vitest); unknown, only a complete catalog tells that the text is pending.
 * Text of a loaded or failed area is English without an error. Pending text throws in the dev server and Vitest (the tripwire);
 * in production it is answered in English, counted, and logged once per area (once per load for keys, whose area production
 * does not know; not at all once an area has failed). */
export function notePendingText(active:Active,what:string,areas?:readonly string[]):void{
 if(areas?areas.some(a=>active.areas.has(a)):!active.bundle?.complete)return;
 const name=areas?.join('+')??'',message=`OpenVireo: ${what} was read before its area${areas?` ${name}`:''} loaded`;
 if(areas&&tripwire())throw new Error(message);
 pendingReads++;
 if(!logged.has(name)&&(areas||![...active.areas.values()].includes('failed'))){logged.add(name);console.error(message);}
}
/** The language this load asked for but could not use (its chunk failed, timed out or did not validate), or null. */
export const languageFailure=():UiLanguage|null=>holder[FAILED]??null;
export function noteLanguageFailure(failed:UiLanguage|null){holder[FAILED]=failed;}
/** ES1 review 1, C1: shown when the Spanish chunk could not be used. Its own bilingual text, since the Spanish catalog is the
 * part that failed. */
export const LANGUAGE_FAILURE_NOTICE=Object.freeze({
 en:'Spanish could not be loaded; English is shown. Reload to try again.',
 es:'No se pudo cargar el español; se muestra en inglés. Recarga para intentarlo de nuevo.',
});
/** Front ES-SPLIT: shown once per load when a route area's text could not be used (src/i18n/areas.ts). Its own bilingual text,
 * like LANGUAGE_FAILURE_NOTICE, since the part that failed is the translation. */
export const AREA_FAILURE_NOTICE=Object.freeze({
 en:'Part of the Spanish text could not be loaded; that part is shown in English. Reload to try again.',
 es:'No se pudo cargar parte del texto en español; esa parte se muestra en inglés. Recarga para intentarlo de nuevo.',
});
