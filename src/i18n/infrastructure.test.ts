import {describe,it,expect,vi,afterEach} from 'vitest';
import {createHash} from 'node:crypto';
import en from './en.json';
import baseline from '../../tests/fixtures/p01-scientific-baseline.json';
import {activateLocale,createI18n,fixed,formatNumber,scientific,t,uiLanguage,type MessageKey} from './index';
import {pickMessages,pickedMessages} from './registry';
import {normalizeOriginal,vireo} from './vireo';
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
const IDS=['appShell','camera','clusterData','clusterHr','clusterNativeHr','engineView','fieldInfo','fieldReadDetails','helpMenu','nakedEye','objectXGuide','objectXLab','objectXMeasure','objectXSession','observationMetadata','observatory','polish','pulsar','pulsarLoadSave','pulsarSavedRows','qsoList','radio','radioAntenna','radioFinishSave','radioR1','radioRecordSave','sound','spectralRange','variableStars','wedge'];
afterEach(()=>{activateLocale(null);});
describe('Front ES0: the per-load language infrastructure (docs/I18N.md), English by default',()=>{
 it('the 25 *Messages.ts files pick 30 maps by unique id; in English every picked map is the English map itself',()=>{
  expect(Object.keys(maps)).toHaveLength(25);
  for(const create of [createPulsarTranslator,createLoadSaveTranslator,createSavedRowsTranslator,createRadioAntennaTranslator,createFinishSaveTranslator,createRadioSaveTranslator,createRadioTranslator])create();
  expect([...pickedMessages().keys()].sort()).toEqual(IDS);
  for(const module of Object.values(maps))for(const [name,value] of Object.entries(module))if(Object.hasOwn(module,`${name}_EN`))expect(value,name).toBe(module[`${name}_EN`]);
  for(const [id,english] of pickedMessages())expect(pickMessages(id,english),id).toBe(english);
  expect(uiLanguage()).toBe('en');
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
  expect(()=>createI18n(partial,'es-419')).toThrow('Invalid message catalog keys');
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
  expect(t('app.name')).toBe(en['app.name']);
 });
});
describe('Front ES0: the dev-only pseudo-locale qps',()=>{
 it('marks, accents and pads every catalog string, keeping {params}; the strict catalog check accepts it',()=>{
  expect(pseudo('Telescope centered on {target}.')).toBe('⟦Téléscópé céntéréd ón {target}.·········⟧');
  const bundle=pseudoBundle();expect(()=>createI18n(bundle.messages,'qps')).not.toThrow();
  activateLocale(bundle);expect(uiLanguage()).toBe('qps');
  expect(t('sky.pointed',{target:'M82'})).toMatch(/^⟦.*M82\..*⟧$/);
  for(const key of Object.keys(en) as MessageKey[])if(en[key])expect((t as (k:MessageKey,v?:Record<string,string>)=>string)(key,Object.fromEntries([...en[key].matchAll(/\{(\w+)\}/g)].map(m=>[m[1],'x']))).startsWith(PSEUDO_OPEN)).toBe(true);
  expect(vireo('&Print Sky Image...')).toBe(pseudo('&Print Sky Image...'));
 });
 it('derives every picked map with the same shape, parameters and arities, and marks function results',()=>{
  for(const [id,english] of pickedMessages()){const derived=pseudoMap(english);expect(mapParity(english,derived),id).toEqual([]);expect(JSON.stringify(derived)).not.toBe(JSON.stringify(english));}
  activateLocale(pseudoBundle());
  const english=Object.freeze({a:'Open dome',f:(n:number)=>`${n} stars`,list:Object.freeze(['One','Two']),n:3});
  const picked=pickMessages('probe',english);
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
