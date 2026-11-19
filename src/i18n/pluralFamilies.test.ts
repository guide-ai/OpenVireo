import {afterEach,describe,expect,it} from 'vitest';
import en from './en.json';
import {activateLocale,createI18n,pluralKey,t} from './index';
import {pluralFamilyKeys,pluralFormBase,pluralFormKey} from './plural';
// @ts-expect-error The planner is a plain JS script (as in src/i18n/split.test.ts).
import {pluralFormBase as scriptPluralFormBase,planLanguage} from '../../scripts/i18n-split.mjs';
import {CLUSTER_NATIVE_HR_MESSAGES} from '../components/ClusterNativeObservationHrMessages';
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {PARTIAL} from '../../tests/fixtures/i18n/partial';
// Front RU0 (plan analysis/front-plans/front-i18n-ru.md §1.2 #1): catalog plural families with the language's own categories.
// Russian needs «1 запись / 3 записи / 5 записей / 1.5 записи»; en.json has only `.one` and `.other`, so a Russian catalog may add
// `.few` and `.many` keys of a family (and the 20 keys of the two-level `obsHr.kindWarning`). English, Spanish, Portuguese and
// French have no such key, so they behave exactly as before.
afterEach(()=>{activateLocale(null);});
const ENGLISH=en as Readonly<Record<string,string>>;
const RU_FORMS:Readonly<Record<string,string>>={
 'sky.searchMatches.one':'Найдена {count} цель (1).','sky.searchMatches.few':'Найдено {count} цели (few).','sky.searchMatches.many':'Найдено {count} целей (many).','sky.searchMatches.other':'Найдено {count} цели (other).',
 'obsHr.current.one':'one {count}','obsHr.current.few':'few {count}','obsHr.current.many':'many {count}','obsHr.current.other':'other {count}',
 ...Object.fromEntries(['one','few','many','other'].flatMap(a=>['none','one','few','many','other'].map(b=>[`obsHr.kindWarning.${a}.${b}`,b==='none'?`${a}/${b} {counts}`:`${a}/${b} {counts} {other}`]))),
};
describe('Front RU0: which added keys a catalog accepts',()=>{
 it('a plural form of an en.json family in a category the language selects, with its base and {params}',()=>{
  expect(pluralFormBase('sky.searchMatches.few',ENGLISH,'ru')).toBe('sky.searchMatches.other');
  expect(pluralFormBase('sky.searchMatches.many',ENGLISH,'ru')).toBe('sky.searchMatches.other');
  expect(pluralFormBase('obsHr.kindWarning.few.none',ENGLISH,'ru')).toBe('obsHr.kindWarning.other.none');
  expect(pluralFormBase('obsHr.kindWarning.one.many',ENGLISH,'ru')).toBe('obsHr.kindWarning.other.other');
  expect(pluralFormBase('obsHr.kindWarning.few.few',ENGLISH,'ru')).toBe('obsHr.kindWarning.other.other');
  // In en.json already; a category Russian never selects; Japanese has no few; a word that is no plural axis; no family.
  for(const [key,lang] of [['sky.searchMatches.one','ru'],['sky.searchMatches.two','ru'],['sky.searchMatches.few','ja'],['sky.searchMatches.few','fr'],['radioRoute.exercise.outcome.few','ru'],['app.name.few','ru'],['no.such.few','ru']] as const)
   expect(pluralFormBase(key,ENGLISH,lang),`${key} ${lang}`).toBeNull();
  // French selects many (exact millions): its many form would be accepted, though French has none.
  expect(pluralFormBase('sky.searchMatches.many',ENGLISH,'fr')).toBe('sky.searchMatches.other');
 });
 it('the build scripts\' copy agrees with src/i18n/plural.ts on every candidate',()=>{
  const candidates=[...Object.keys(RU_FORMS),'sky.searchMatches.two','radioRoute.exercise.outcome.few','app.name.few','obsHr.current.zero',
   ...Object.keys(en).filter(k=>/\.other(?:\.|$)/.test(k)).flatMap(k=>['few','many','two'].map(c=>k.replace(/\.other(?=\.|$)/,`.${c}`)))];
  for(const lang of ['ru','fr','ja','hi','ar','pt-BR'])for(const key of candidates)expect(scriptPluralFormBase(key,ENGLISH,lang),`${key} ${lang}`).toBe(pluralFormBase(key,ENGLISH,lang));
 });
 it('createI18n accepts Russian forms and refuses anything else; English and the released languages are unchanged',()=>{
  expect(()=>createI18n(RU_FORMS as never,'ru',{fallback:true})).not.toThrow();
  expect(()=>createI18n({...RU_FORMS,'no.such.key':'x'} as never,'ru',{fallback:true})).toThrow('Invalid message catalog keys');
  expect(()=>createI18n({'sky.searchMatches.two':'x'} as never,'ru',{fallback:true})).toThrow('Invalid message catalog keys');
  expect(()=>createI18n({'sky.searchMatches.few':'x {count}'} as never,'ja',{fallback:true})).toThrow('Invalid message catalog keys');
  expect(()=>createI18n({'sky.searchMatches.few':'x'} as never,'ru',{fallback:true})).toThrow('Invalid message parameters: sky.searchMatches.few');
  expect(()=>createI18n({'obsHr.kindWarning.few.none':'{counts} {other}'} as never,'ru',{fallback:true})).toThrow('Invalid message parameters: obsHr.kindWarning.few.none');
  // A strict catalog: every en.json key, plus forms; a forms-only catalog is still incomplete.
  const full={...ENGLISH,...RU_FORMS};
  expect(()=>createI18n(full as never,'ru')).not.toThrow();
  expect(()=>createI18n(RU_FORMS as never,'ru')).toThrow('Invalid message catalog keys');
  const i18n=createI18n(RU_FORMS as never,'ru',{fallback:true});
  expect((i18n.t as (k:string,v:object)=>string)('sky.searchMatches.few',{count:3})).toBe('Найдено 3 цели (few).');
 });
});
describe('Front RU0: pluralKey chooses the form the active messages hold',()=>{
 const pick=(n:number)=>t(pluralKey(n,{one:'sky.searchMatches.one',other:'sky.searchMatches.other'}),{count:n});
 it('Russian: one (1, 21, 101), few (2–4, 22), many (0, 5–20, 25, 111), other (fractions)',()=>{
  activateLocale({language:'ru',messages:RU_FORMS as never});
  expect([1,21,101].map(pick)).toEqual(['Найдена 1 цель (1).','Найдена 21 цель (1).','Найдена 101 цель (1).']);
  expect([2,3,4,22].map(pick).every(s=>s.endsWith('(few).'))).toBe(true);
  expect([0,5,11,12,20,25,111].map(pick).every(s=>s.endsWith('(many).'))).toBe(true);
  expect(pick(1.5)).toBe('Найдено 1.5 цели (other).');
 });
 it('a two-level family resolves each count by its own segment (obsHr.kindWarning: 4 × 5 forms)',()=>{
  activateLocale({language:'ru',messages:RU_FORMS as never});
  const w=CLUSTER_NATIVE_HR_MESSAGES.kindWarning;
  expect([w(1,0),w(3,0),w(5,0),w(1.5,0)]).toEqual(['one/none 1','few/none 3','many/none 5','other/none 1.5']);
  expect([w(1,1),w(1,3),w(1,7),w(3,1),w(3,3),w(5,22),w(21,11),w(2,1.5)]).toEqual(['one/one 1 1','one/few 1 3','one/many 1 7','few/one 3 1','few/few 3 3','many/few 5 22','one/many 21 11','few/other 2 1.5']);
  expect(CLUSTER_NATIVE_HR_MESSAGES.current(4)).toBe('few 4');
 });
 it('a form the messages lack falls back to other; English and Spanish choose as plural() did',()=>{
  activateLocale({language:'ru',messages:{'sky.searchMatches.other':'other {count}'} as never});
  expect([1,3,5].map(pick)).toEqual(['1 matching target.','other 3','other 5']);
  activateLocale(null);
  expect([1,3,1_000_000].map(pick)).toEqual(['1 matching target.','3 matching targets.','1000000 matching targets.']);
  expect(pluralFormKey('few',{one:'a.one.x',other:'a.other.x'})).toBe('a.few.x');
  expect(pluralFormKey('many',{one:'a.one.one',other:'a.one.other'})).toBe('a.one.many');
  expect(pluralFormKey('few',{other:'a.other'})).toBe('a.few');
  expect(pluralFormKey('few',{other:'a.b'})).toBeNull();
 });
});
describe('Front RU0: the families a language must complete, and the split',()=>{
 it('expands every family of en.json to the language\'s categories',()=>{
  expect(pluralFamilyKeys('sky.searchMatches',ENGLISH,'ru')).toEqual(['sky.searchMatches.few','sky.searchMatches.many','sky.searchMatches.one','sky.searchMatches.other']);
  const kind=pluralFamilyKeys('obsHr.kindWarning',ENGLISH,'ru');
  expect(kind).toHaveLength(20);expect(kind).toContain('obsHr.kindWarning.few.none');expect(kind).toContain('obsHr.kindWarning.many.few');
  expect(pluralFamilyKeys('obsHr.kindWarning',ENGLISH,'en')).toEqual(Object.keys(en).filter(k=>k.startsWith('obsHr.kindWarning.')).sort());
  for(const key of kind)expect(Object.hasOwn(en,key)||pluralFormBase(key,ENGLISH,'ru')!==null,key).toBe(true);
 });
 it('the split puts an added form in its base key\'s module, and refuses a form without its base or of no family',()=>{
  // A stand-in language directory (as src/i18n/split.test.ts builds one), with Russian plural rules through htmlLang.
  const root=path.resolve(import.meta.dirname,'../..'),scratch=path.join(homedir(),'.cache','openvireo-tests');mkdirSync(scratch,{recursive:true});const dir=mkdtempSync(path.join(scratch,'ru0-split-'));
  try{
   const write=(catalog:Record<string,string>)=>{writeFileSync(path.join(dir,'c.json'),JSON.stringify(catalog));writeFileSync(path.join(dir,'originals.json'),'{}');
    writeFileSync(path.join(dir,'index.ts'),"export const B=Object.freeze({language:'qru-XR',messages:{},maps:Object.freeze({}),originals:{}});\n");};
   const language={...PARTIAL,tag:'qru-XR',dir:'qru-xr',catalog:'c.json',htmlLang:'ru',path:path.relative(root,dir)};
   write(RU_FORMS as Record<string,string>);
   const plan=planLanguage(language,root) as {keyModule:Record<string,string>;problems:string[];modules:{name:string;keys:string[]}[]};
   expect(plan.problems).toEqual([]);
   for(const key of Object.keys(RU_FORMS)){const base=Object.hasOwn(en,key)?key:pluralFormBase(key,ENGLISH,'ru')!;expect(plan.keyModule[key],key).toBe(plan.keyModule[base]);}
   expect(plan.keyModule['sky.searchMatches.few']).toBeDefined();expect(plan.keyModule['obsHr.kindWarning.many.few']).toBe(plan.keyModule['obsHr.kindWarning.other.other']);
   expect(plan.modules.find(m=>m.name===plan.keyModule['sky.searchMatches.few'])?.keys).toContain('sky.searchMatches.few');
   write({'sky.searchMatches.few':'x {count}','sky.searchMatches.two':'y {count}'});
   expect((planLanguage(language,root) as {problems:string[]}).problems).toEqual(['c.json has the plural form sky.searchMatches.few without its base sky.searchMatches.other','c.json has a key that en.json lacks: sky.searchMatches.two']);
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
});
