import {afterEach,describe,expect,it,vi} from 'vitest';
import {SOUND_MESSAGES_EN} from '../sound/SoundMessages';
import {SOUND_ES} from './es/maps/sound';
import {pseudoBundle} from './pseudo';
import {pseudoScriptBundle} from './pseudoScripts';
import type {LocaleAreaPart,LocaleBundle} from './catalog';
// Front ES-SPLIT (docs/I18N.md, "Spanish: the chunk split by route area"): the runtime of a split language on a synthetic bundle.
// Each test imports fresh copies of the i18n modules (the active language lives on globalThis, the area loads and the pending
// counter in the modules), so the order of the tests does not matter.
const CORE_KEY='project.save',AREA_KEY='fits.title',AREA_ES='Examinar una imagen FITS guardada';
type Modules={index:typeof import('./index');active:typeof import('./active');areas:typeof import('./areas');registry:typeof import('./registry');vireo:typeof import('./vireo')};
async function fresh():Promise<Modules>{
 vi.resetModules();
 return {index:await import('./index'),active:await import('./active'),areas:await import('./areas'),registry:await import('./registry'),vireo:await import('./vireo')};
}
const part=(over:Partial<LocaleAreaPart>={}):LocaleAreaPart=>({language:'es-419',area:'fits',messages:{[AREA_KEY]:AREA_ES},maps:{sound:SOUND_ES},...over});
/** A split bundle: the core holds CORE_KEY and an original; the area fits holds AREA_KEY and the map sound. */
function bundle(load:()=>Promise<{default:LocaleAreaPart}>,over:Partial<LocaleBundle>={}):LocaleBundle{
 return {language:'es-419',messages:{[CORE_KEY]:'Guardar investigación'},originals:{'Close':'Cerrar'},
  areas:{fits:load,cluster:()=>Promise.resolve({default:part({area:'cluster',messages:{},maps:{}})})},
  mapModules:{sound:['fits']},complete:false,keyModules:{[AREA_KEY]:'fits'},...over};
}
const never=()=>new Promise<never>(()=>{});
/** A promise and its resolve function, made before the loader runs (loadArea calls it a microtask later). */
function deferred<T>(){let resolve:(v:T)=>void=()=>{};const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}
afterEach(async()=>{vi.unstubAllEnvs();vi.restoreAllMocks();(await import('./index')).activateLocale(null);});

describe('Front ES-SPLIT: route areas of a split language',()=>{
 it('English and the pseudo-locales load nothing: loadArea resolves at once',async()=>{
  const m=await fresh(),load=vi.fn(never);
  m.index.activateLocale(null);await m.areas.loadArea('fits');
  for(const b of [pseudoBundle(),pseudoScriptBundle('qps-cjk')]){m.index.activateLocale(b);await m.areas.loadArea('fits');expect(m.active.current().areas.size).toBe(0);}
  expect(load).not.toHaveBeenCalled();
 });
 it('a split bundle builds with the English fallback; a key of a loading area throws in the dev server and Vitest, and is Spanish once the area arrives',async()=>{
  const m=await fresh(),load=vi.fn(()=>Promise.resolve({default:part()}));
  m.index.activateLocale(bundle(load));
  expect(m.index.t(CORE_KEY)).toBe('Guardar investigación');
  expect(()=>m.index.t(AREA_KEY)).toThrow(/text "fits\.title" was read before its area fits loaded/);
  // A key outside every area that the catalog lacks (untranslated before ES-REL) is English, without an error.
  expect(m.index.t('fits.nav')).toBe('Saved images');
  await Promise.all([m.areas.loadArea('fits'),m.areas.loadArea('fits')]);
  expect(load).toHaveBeenCalledTimes(1);
  expect(m.index.t(AREA_KEY)).toBe(AREA_ES);expect(m.active.current().areas.get('fits')).toBe('loaded');
  expect(m.index.uiLanguage()).toBe('es-419');expect(m.index.t(CORE_KEY)).toBe('Guardar investigación');
 });
 it('a map of a loading area throws in the dev server and Vitest, and is the area\'s once it arrives',async()=>{
  const m=await fresh();
  m.index.activateLocale(bundle(()=>Promise.resolve({default:part()})));
  expect(()=>m.registry.resolveMessages('sound',SOUND_MESSAGES_EN)).toThrow(/map "sound" was read before its area fits loaded/);
  await m.areas.loadArea('fits');
  expect(m.registry.resolveMessages('sound',SOUND_MESSAGES_EN)).toBe(SOUND_ES);
 });
 it('in production a pending read is English, counted and logged once; lazy maps and translators are not kept until their area arrives',async()=>{
  vi.stubEnv('DEV',false);
  const m=await fresh(),error=vi.spyOn(console,'error').mockImplementation(()=>{});
  const late=deferred<{default:LocaleAreaPart}>(),arrive=late.resolve;
  m.index.activateLocale(bundle(()=>late.promise,{complete:true,keyModules:undefined}));
  const table=m.registry.lazyMessages(()=>({title:m.index.t(AREA_KEY)}));
  const sound=m.registry.lazyMessages(()=>m.registry.resolveMessages('sound',SOUND_MESSAGES_EN) as object) as typeof SOUND_MESSAGES_EN;
  const translate=m.registry.lazyTranslator(()=>{const title=m.index.t(AREA_KEY);return ()=>title;});
  expect([m.index.t(AREA_KEY),table.title,sound.title,translate()]).toEqual(['Inspect a saved FITS image','Inspect a saved FITS image','Sound effects','Inspect a saved FITS image']);
  expect(m.active.pendingTextRequests()).toBe(4);
  expect(error.mock.calls.map(c=>String(c[0]))).toEqual(['OpenVireo: text "fits.title" was read before its area loaded','OpenVireo: map "sound" was read before its area fits loaded']);
  const loading=m.areas.loadArea('fits');arrive({default:part()});await loading;
  expect([m.index.t(AREA_KEY),table.title,sound.title,translate()]).toEqual([AREA_ES,AREA_ES,'Efectos de sonido',AREA_ES]);
  expect(m.active.pendingTextRequests()).toBe(4);
  // Before ES-REL (an incomplete catalog) production cannot tell a pending key from an untranslated one: English, not counted.
  m.index.activateLocale(bundle(never,{complete:false,keyModules:undefined}));
  expect(m.index.t(AREA_KEY)).toBe('Inspect a saved FITS image');expect(m.active.pendingTextRequests()).toBe(4);
 });
 it('an area that times out is failed: its text is English without an error, the notice state is set, and a late part is ignored',async()=>{
  const m=await fresh(),error=vi.spyOn(console,'error').mockImplementation(()=>{}),notified=vi.fn();
  const late=deferred<{default:LocaleAreaPart}>(),arrive=late.resolve;
  m.index.activateLocale(bundle(()=>late.promise));
  const unsubscribe=m.areas.subscribeAreaFailures(notified);
  expect(m.areas.areaFailed()).toBe(false);
  await m.areas.loadArea('fits',()=>Promise.resolve());
  expect(m.active.current().areas.get('fits')).toBe('failed');expect(m.areas.areaFailed()).toBe(true);expect(notified).toHaveBeenCalledTimes(1);
  expect(String(error.mock.calls[0][0])).toBe('OpenVireo: area fits could not be loaded; English is shown.');
  arrive({default:part()});await Promise.resolve();await Promise.resolve();
  expect(m.active.current().areas.get('fits')).toBe('failed');
  expect([m.index.t(AREA_KEY),m.registry.resolveMessages('sound',SOUND_MESSAGES_EN).title]).toEqual(['Inspect a saved FITS image','Sound effects']);
  // Loading it again does not retry within this load.
  await m.areas.loadArea('fits');expect(m.active.current().areas.get('fits')).toBe('failed');
  unsubscribe();
 });
 it('an area chunk that fails, or a part of another area, language or map id, marks the area failed and changes nothing else',async()=>{
  const m=await fresh();vi.spyOn(console,'error').mockImplementation(()=>{});
  for(const [load,expected] of [
   [()=>Promise.reject(new TypeError('Failed to fetch dynamically imported module')),'failed'],
   [()=>Promise.resolve({default:part({area:'cluster'})}),'failed'],
   [()=>Promise.resolve({default:part({language:'qps' as never})}),'failed'],
   [()=>Promise.resolve({default:part({maps:{nope:{}} as never})}),'failed'],
  ] as const){
   const fresher=await fresh();fresher.index.activateLocale(bundle(load));
   await fresher.areas.loadArea('fits');
   expect(fresher.active.current().areas.get('fits')).toBe(expected);
   expect(fresher.index.t(AREA_KEY)).toBe('Inspect a saved FITS image');expect(fresher.index.t(CORE_KEY)).toBe('Guardar investigación');
  }
  void m;
 });
 it('extendLocale refuses a part when no split language is active, and markAreaFailed does nothing then',async()=>{
  const m=await fresh();m.index.activateLocale(null);
  expect(()=>m.active.extendLocale('fits',part())).toThrow(/not a part of area fits/);
  m.active.markAreaFailed('fits');expect(m.active.current().areas.size).toBe(0);
 });
 it('vireo() and View original (English) are unchanged by areas: the originals stay in the core',async()=>{
  const m=await fresh();
  m.index.activateLocale(bundle(()=>Promise.resolve({default:part()})));
  expect(m.vireo.vireo('&Close')).toBe('Cerrar');
  await m.areas.loadArea('fits');expect(m.vireo.vireo('&Close')).toBe('Cerrar');
  m.index.activateLocale({...bundle(()=>Promise.resolve({default:part()})),originals:{}});
  await m.areas.loadArea('fits');expect(m.vireo.vireo('&Close')).toBe('&Close');expect(m.index.t(AREA_KEY)).toBe(AREA_ES);
 });
});
