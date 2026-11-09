import {describe,it,expect,vi,afterEach} from 'vitest';
import {createHash} from 'node:crypto';
import en from './en.json';
const english=en;
import baseline from '../../tests/fixtures/p01-scientific-baseline.json';
import {activateLocale,createI18n,fixed,formatNumber,scientific,t,uiLanguage,type MessageKey} from './index';
import {lazyMessages,pickMessages,pickedMessages,resolveMessages} from './registry';
import {MAP_IDS} from './maps';
import {earlyTextRequests} from './active';
import {LANGUAGE_TIMEOUT_MS,settleLanguage,type Settled,type SettlePage} from './settle';
import {languageFailure} from './active';
const sync=(r:Settled|Promise<Settled>)=>{if(r instanceof Promise)throw new Error('expected a synchronous settle');return r;};
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {CLUSTER_NATIVE_HR_MESSAGES} from '../components/ClusterNativeObservationHrMessages';
import {SOUND_MESSAGES,SOUND_MESSAGES_EN} from '../sound/SoundMessages';
import {normalizeOriginal,vireo,vireoMenuItem} from './vireo';
import {PSEUDO_CLOSE,PSEUDO_OPEN,pseudo,pseudoBundle,pseudoMap} from './pseudo';
import {mapParity} from './parity';
import {createMeasurement,measurementCsv} from '../core/spectrum';
import {hubbleAnalysisCsv,workbookExampleRows} from '../core/hubbleAnalysis';
import {createPulsarTranslator} from '../components/PulsarMessages';
import {createLoadSaveTranslator} from '../components/PulsarLoadSaveMessages';
import {createSavedRowsTranslator} from '../components/PulsarSavedRowsMessages';
import {createRadioAntennaTranslator} from '../components/RadioAntennaMessages';
import {createFinishSaveTranslator} from '../components/RadioFinishSaveMessages';
import {createRadioSaveTranslator} from '../components/RadioRecordSaveMessages';
import {createRadioTranslator} from '../components/RadioMessages';
const maps=import.meta.glob<Record<string,unknown>>('../**/*Messages.ts',{eager:true});
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const IDS_UNSORTED=['appShell','languageChoice','projectLinks','tour','camera','clusterData','clusterHr','engineView','fieldInfo','fieldReadDetails','helpMenu','helpViewer','webHelp','nakedEye','objectXGuide','objectXLab','objectXMeasure','objectXSession','observationMetadata','observatory','polish','pulsar','pulsarLoadSave','pulsarSavedRows','qsoList','radioAntenna','radioFinishSave','radioR1','radioRecordSave','sound','spectralRange','variableStars','wedge'];
const IDS=[...IDS_UNSORTED].sort();
const root=path.resolve(import.meta.dirname,'../..');
const page=(over:Partial<SettlePage>={}):SettlePage&{errors:string[];lang:string[]}=>{const errors:string[]=[],lang:string[]=[];return {search:'',stored:()=>null,languages:['en-US'],dev:true,bundleFor:()=>null,setLang:l=>{lang.push(l);},setTitle:()=>{},error:m=>{errors.push(m);},...over,errors,lang};};
afterEach(()=>{activateLocale(null);});
describe('Front ES0: the per-load language infrastructure (docs/I18N.md), English by default',()=>{
 it('the 27 *Messages.ts files, tour.ts, projectLinks.ts and webHelp.ts pick 33 maps by unique id, chosen on first use; in English each reads the English map',async()=>{
  expect(Object.keys(maps)).toHaveLength(27);await import('../help/tour');await import('../help/webHelp');await import('../help/projectLinks');
  for(const create of [createPulsarTranslator,createLoadSaveTranslator,createSavedRowsTranslator,createRadioAntennaTranslator,createFinishSaveTranslator,createRadioSaveTranslator,createRadioTranslator])create();
  expect([...pickedMessages().keys()].sort()).toEqual(IDS);expect([...MAP_IDS].sort()).toEqual(IDS);
  // Each id is picked by exactly one source line (a duplicate id would make two maps share one translation).
  const ids:string[]=[];(function scan(dir:string){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())scan(f);else if(/Messages\.ts$|^tour\.ts$|^projectLinks\.ts$|^webHelp\.ts$/.test(e.name))for(const m of readFileSync(f,'utf8').matchAll(/pickMessages\('(\w+)'/g))ids.push(m[1]);}})(path.join(root,'src'));
  expect(ids.sort()).toEqual(IDS);
  for(const module of Object.values(maps))for(const [name,value] of Object.entries(module))if(Object.hasOwn(module,`${name}_EN`)){const english=module[`${name}_EN`] as Record<string,unknown>;expect(Object.keys(value as object),name).toEqual(Object.keys(english));for(const k of Object.keys(english))if(typeof english[k]==='string')expect((value as Record<string,unknown>)[k],`${name}.${k}`).toBe(english[k]);expect(JSON.stringify(value)).toBe(JSON.stringify(english));}
  for(const [id,english] of pickedMessages())expect(resolveMessages(id,english as never),id).toBe(english);
  expect(uiLanguage()).toBe('en');
 });
 it('builds a picked map when it is first read, after the language is settled, not when its module evaluates',()=>{
  const built:string[]=[];const map=lazyMessages(()=>{built.push('now');return Object.freeze({a:'A',f:(n:number)=>`${n}`});});
  expect(built).toEqual([]);expect(map.a).toBe('A');expect(map.f(2)).toBe('2');expect('a' in map).toBe(true);expect({...map}).toEqual({a:'A',f:map.f});expect(built).toEqual(['now']);
  expect(()=>{(map as {a:string}).a='B';}).toThrow();expect(map.a).toBe('A');
  activateLocale(pseudoBundle());const late=pickMessages('sound',SOUND_MESSAGES_EN);
  expect(JSON.stringify(late)).toBe(JSON.stringify(pseudoMap(SOUND_MESSAGES_EN)));
  expect(JSON.stringify(SOUND_MESSAGES)).toBe(JSON.stringify(SOUND_MESSAGES_EN));// already read in English above, kept for this load
 });
 it('checks a bundle map against the English map: unknown ids are refused, a wrong shape throws in dev and tests',()=>{
  expect(()=>activateLocale({language:'es-419',messages:{},maps:{nope:{}} as never})).toThrow('Unknown message map id: nope');expect(uiLanguage()).toBe('en');
  activateLocale({language:'es-419',messages:{},maps:{sound:{...SOUND_MESSAGES_EN,extra:'x'} as never}});
  expect(()=>resolveMessages('sound',SOUND_MESSAGES_EN)).toThrow(/map "sound" does not match/);
  const translated=Object.fromEntries(Object.entries(SOUND_MESSAGES_EN).map(([k,v])=>[k,typeof v==='string'?`ES ${v}`:v]));
  activateLocale({language:'es-419',messages:{},maps:{sound:translated as never}});
  expect(resolveMessages('sound',SOUND_MESSAGES_EN)).toBe(translated);
 });
 it('keeps the two catalog-backed maps out of the registry: their text comes from t, so qps marks it once',()=>{
  expect(IDS).not.toContain('clusterNativeHr');expect(IDS).not.toContain('radio');
  activateLocale(pseudoBundle());const radio=createRadioTranslator();
  expect(radio('radio.title')).toBe(pseudo(en['radio.title']));
  expect(CLUSTER_NATIVE_HR_MESSAGES.title).toBe(pseudo(en['obsHr.title']));
  for(const text of [radio('radio.title'),CLUSTER_NATIVE_HR_MESSAGES.title,CLUSTER_NATIVE_HR_MESSAGES.current(2)])expect(text).not.toContain('⟦⟦');
 });
 it('throws in dev and tests when text is requested before boot settled the language',async()=>{
  const key=Symbol.for('openvireo.i18n.active'),global=globalThis as Record<symbol,unknown>,kept=global[key];
  try{delete global[key];vi.resetModules();const fresh=await import('./index');
   expect(()=>fresh.t('app.name')).toThrow(/before src\/boot\.ts/);expect(()=>fresh.uiLanguage()).toThrow();
   fresh.activateLocale(null);expect(fresh.t('app.name')).toBe('OpenVireo');
  }finally{global[key]=kept;vi.resetModules();}
  // A re-evaluated copy (hot update, vi.resetModules) keeps the language that boot settled.
  activateLocale(pseudoBundle());const again=await import('./index');expect(again.uiLanguage()).toBe('qps');expect(again.t('app.name')).toBe(pseudo('OpenVireo'));
 });
 it('accepts a partial catalog only in fallback mode, with matching parameters, and English for the missing keys',()=>{
  const partial={'sky.pointed':'Telescopio centrado en {target}.'};
  expect(()=>createI18n(partial as never,'es-419')).toThrow('Invalid message catalog keys');
  const es=createI18n(partial,'es-419',{fallback:true,numberLocale:'en-US'});
  expect(es.t('sky.pointed',{target:'M82'})).toBe('Telescopio centrado en M82.');expect(es.t('app.name')).toBe(en['app.name']);
  expect(()=>createI18n({'sky.pointed':'{objetivo}'},'es-419',{fallback:true})).toThrow('Invalid message parameters');
  expect(()=>createI18n({'no.such.key':'x'} as never,'es-419',{fallback:true})).toThrow('Invalid message catalog keys');
  expect(es.formatNumber(12345.5)).toBe('12,345.5');expect(es.fixed(1.25,1)).toBe((1.25).toFixed(1));
 });
 it('vireo() returns the literal in English and keys its dictionary by the normalised original',()=>{
  for(const text of ['&Print Sky Image...','Set Coordinates','Slew && Track'])expect(vireo(text)).toBe(text);
  expect(normalizeOriginal('  &Print Sky Image... ')).toBe('Print Sky Image...');expect(normalizeOriginal('Slew && &Track')).toBe('Slew & Track');
  activateLocale({language:'es-419',messages:{},originals:{'Set Coordinates':'Fijar coordenadas','verb|Open':'Abrir',Open:'Abierto'}});
  expect(vireo('Set &Coordinates')).toBe('Fijar coordenadas');expect(vireo('Open','verb')).toBe('Abrir');expect(vireo('Open')).toBe('Abierto');expect(vireo('Open','noun')).toBe('Abierto');expect(vireo('Close')).toBe('Close');
  // Front ES2: a plain entry keeps the literal's own spacing; a context entry carries its own (review 1, C3).
  activateLocale({language:'es-419',messages:{},originals:{'RA:':'AR:','fragment|Remove Selection #':'¿Quitar la selección #','fragment|?\r\n\r\n(Remaining Selections Will Be Re-Numbered.)':'?\r\n\r\n(Las selecciones restantes se volverán a numerar).'}});
  expect(vireo('RA:  ')).toBe('AR:  ');
  expect(vireo('Remove Selection #','fragment')+2+vireo(' ?\r\n\r\n(Remaining Selections Will Be Re-Numbered.)','fragment')).toBe('¿Quitar la selección #2?\r\n\r\n(Las selecciones restantes se volverán a numerar).');
  expect(vireoMenuItem('&Set Coordinates...')).toBe('Set Coordinates…');
  expect(t('app.name')).toBe(en['app.name']);
 });
});
describe('Front ES0: the dev-only pseudo-locale qps',()=>{
 it('marks, accents and pads every catalog string, keeping {params}; the strict catalog check accepts it',()=>{
  expect(pseudo('Telescope centered on {target}.')).toBe('⟦Téléscópé céntéréd ón {target}.·········⟧');
  const bundle=pseudoBundle();expect(()=>createI18n(bundle.messages,'qps',{fallback:false})).not.toThrow();
  activateLocale(bundle);expect(uiLanguage()).toBe('qps');
  expect(t('sky.pointed',{target:'M82'})).toMatch(/^⟦.*M82\..*⟧$/);
  for(const key of Object.keys(en) as MessageKey[])if(en[key])expect((t as (k:MessageKey,v?:Record<string,string>)=>string)(key,Object.fromEntries([...en[key].matchAll(/\{(\w+)\}/g)].map(m=>[m[1],'x']))).startsWith(PSEUDO_OPEN)).toBe(true);
  expect(vireo('&Print Sky Image...')).toBe(pseudo('&Print Sky Image...'));
 });
 it('derives every picked map with the same shape, parameters and arities, and marks function results',()=>{
  for(const [id,english] of pickedMessages()){const derived=pseudoMap(english);expect(mapParity(english,derived),id).toEqual([]);expect(JSON.stringify(derived)).not.toBe(JSON.stringify(english));}
  const english=Object.freeze({a:'Open dome',f:(n:number)=>`${n} stars`,list:Object.freeze(['One','Two']),n:3});
  const picked=pseudoMap(english);
  expect(picked.a).toBe(pseudo('Open dome'));expect(picked.f(2)).toBe(`${PSEUDO_OPEN}2 stars···${PSEUDO_CLOSE}`);expect(picked.f.length).toBe(1);expect(picked.list).toEqual([pseudo('One'),pseudo('Two')]);expect(picked.n).toBe(3);expect(Object.isFrozen(picked)).toBe(true);
  expect(mapParity(english,{...english,a:'{x}'})).toEqual(['$.a: parameters {x} instead of {}']);expect(mapParity(english,{a:'x',f:()=>'',list:[],n:3,extra:''})).toEqual(['$.f: function arity 0 instead of 1','$.list.0: missing','$.list.1: missing','$.extra: not in the English map']);
 });
 it('keeps the decimal point and the export bytes of every UI language (decisions 3 and 4)',()=>{
  const values=[1234.5,12345.5,1e-10,-0.5,0,Number.NaN,98765.4321],english=values.map(v=>[formatNumber(v),fixed(v,3),scientific(v,4),scientific(v,4,true)]);
  activateLocale(pseudoBundle());
  expect(values.map(v=>[formatNumber(v),fixed(v,3),scientific(v,4),scientific(v,4,true)])).toEqual(english);expect(formatNumber(12345.5)).toBe('12,345.5');
  const m=createMeasurement(1,'Operator <b>σ</b> {target}','retained σ.csv','a'.repeat(64),{base:.015625,position:0,factor:1,step:.001},'GLXYLNS.LST');
  expect(sha(measurementCsv([m]))).toBe(baseline.nodeSHA256.measurement);
  expect(sha(hubbleAnalysisCsv({recipeId:'workbook',rows:workbookExampleRows()},[]))).toBe(baseline.nodeSHA256.workbook);
  expect(sha(hubbleAnalysisCsv({recipeId:'vireo',rows:workbookExampleRows()},[]))).toBe(baseline.nodeSHA256.vireo);
 });
});
describe('Front ES0: settling the language of a load (src/boot.ts)',()=>{
 it('activates the decided language and sets <html lang>; es-419 has no bundle in ES0 and stays English',()=>{
  const en=page();expect(sync(settleLanguage(en))).toEqual({language:'en',failed:null});expect(en.lang).toEqual(['en']);expect(en.errors).toEqual([]);
  // A build without a bundle for the asked language shows English and reports it as failed.
  const es=page({search:'?lang=es-419',languages:['es-MX']});expect(sync(settleLanguage(es))).toEqual({language:'en',failed:'es-419'});expect(es.lang).toEqual(['en']);
  const titles:string[]=[],qps=page({search:'?lang=qps',bundleFor:l=>l==='qps'?pseudoBundle():null,setTitle:x=>{titles.push(x);}});
  expect(sync(settleLanguage(qps)).language).toBe('qps');expect(titles).toEqual([pseudo(english['app.documentTitle'])]);
  const blocked=page({stored:()=>{throw new Error('storage blocked');}});expect(sync(settleLanguage(blocked)).language).toBe('en');
 });
 it('falls back to English and logs when a bundle fails to build or validate, so the page never goes blank',()=>{
  for(const broken of [()=>{throw new Error('chunk failed');},()=>({language:'es-419' as const,messages:{'sky.pointed':'{objetivo}'}}),()=>({language:'es-419' as const,messages:{},maps:{nope:{}} as never})]){
   const p=page({search:'?lang=es-419',bundleFor:broken});
   expect(sync(settleLanguage(p))).toEqual({language:'en',failed:'es-419'});expect(languageFailure()).toBe('es-419');expect(uiLanguage()).toBe('en');expect(p.lang).toEqual(['en']);
   expect(p.errors).toEqual(['OpenVireo: the language bundle could not be used; English is used.']);
  }
 });
 it('waits for an asynchronous bundle, falls back to English on failure or timeout, and never activates a late chunk (ES1 review 1)',async()=>{
  const ok=page({search:'?lang=es-419',bundleFor:()=>Promise.resolve({language:'es-419' as const,messages:{'app.name':'OpenVireo'}})});
  expect(await settleLanguage(ok)).toEqual({language:'es-419',failed:null});expect(languageFailure()).toBeNull();expect(ok.lang).toEqual(['es-419']);
  const rejected=page({search:'?lang=es-419',bundleFor:()=>Promise.reject(new Error('chunk 404'))});
  expect(await settleLanguage(rejected)).toEqual({language:'en',failed:'es-419'});expect(rejected.errors).toEqual(['OpenVireo: the language bundle could not be used; English is used.']);
  // Timeout: the wait resolves first; the chunk arrives later and must not change the language.
  let deliver:((b:never)=>void)|undefined;const waited:number[]=[];
  const slow=page({search:'?lang=es-419',bundleFor:()=>new Promise(resolve=>{deliver=resolve as never;}),wait:ms=>{waited.push(ms);return Promise.resolve();}});
  expect(await settleLanguage(slow)).toEqual({language:'en',failed:'es-419'});expect(waited).toEqual([LANGUAGE_TIMEOUT_MS]);expect(LANGUAGE_TIMEOUT_MS).toBe(10_000);
  deliver!({language:'es-419',messages:{}} as never);await new Promise(r=>setTimeout(r,0));
  expect(uiLanguage()).toBe('en');expect(slow.lang).toEqual(['en']);expect(languageFailure()).toBe('es-419');
 });
 it('reports text that was requested before the language was settled (production answers it in English)',()=>{
  expect(earlyTextRequests()).toBe(0);
  const key=Symbol.for('openvireo.i18n.early'),global=globalThis as Record<symbol,unknown>;
  try{global[key]=3;const p=page();settleLanguage(p);expect(p.errors).toEqual(['OpenVireo: 3 text request(s) ran before the language was settled and stayed English.']);}
  finally{delete global[key];}
 });
});
