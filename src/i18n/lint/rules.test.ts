import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {FIXTURES,RULES_WITH_FIXTURES,type Fixture} from './fixtures';
import {PROFILE_IDS,PROFILES,REGISTER,profileFor} from './profiles';
import {SIMPLIFIED_ONLY,TRADITIONAL_ONLY} from './hanVariants';
import {collectPairs} from './pairs';
import {allowances,describeFindings,errorsOf,glossaryFrom,graphemeLength,lintPair,lintPairs,normalizeName,pluralForms,reportsOf,unbalanced,wordSource,type LintData,type LocaleProfile,type Pair} from './rules';
import {pluralCategories} from '../plural';
import {normalizeOriginal} from '../vireo';
// Front SC4 (plan front-i18n-scripts.md §6): every rule catches its bad fixture and passes its good one, per language.
const profileOf=(f:Fixture):LocaleProfile=>f.registers?profileFor(f.profile,{...REGISTER,...f.registers}):PROFILES[f.profile];
const dataOf=(f:Fixture):LintData=>f.glossary?{glossary:f.glossary}:{};
const name=(f:Fixture,which:'good'|'bad')=>`${f.profile} ${f.rule}${f.note?` (${f.note})`:''} ${which}: ${f[which]}`;
describe('Front SC4: per-locale lint profiles',()=>{
 it('has one profile per planned language, each with the register setting of REGISTER',()=>{
  expect(Object.keys(PROFILES)).toEqual(['ja','hi','zh-Hans','zh-Hant','ru']);
  expect(REGISTER).toEqual({ja:'desu-masu',hi:'aap',ru:'vy',zh:'ni'});// plan §13 Q1–Q3: recommendations until the user decides
  expect(PROFILE_IDS.map(id=>PROFILES[id].register.setting)).toEqual(['desu-masu','aap','ni','ni','vy']);
 });
 it('declares the plural categories that Intl.PluralRules gives each language',()=>{
  for(const id of PROFILE_IDS)expect(PROFILES[id].pluralCategories,id).toEqual(pluralCategories(id));
 });
 it('keeps the Simplified/Traditional seed table one-to-one and disjoint',()=>{
  expect(SIMPLIFIED_ONLY.size).toBe(TRADITIONAL_ONLY.size);expect(SIMPLIFIED_ONLY.size).toBeGreaterThan(60);
  for(const [s,t] of SIMPLIFIED_ONLY){expect(TRADITIONAL_ONLY.get(t),s).toBe(s);expect(TRADITIONAL_ONLY.has(s),s).toBe(false);expect(s).not.toBe(t);}
 });
 it('uses no ASCII-only \\b or \\w in a rule (plan §6: Unicode classes only)',()=>{
  for(const file of ['rules.ts','profiles.ts']){
   const code=readFileSync(new URL(`./${file}`,import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
   expect(code,file).not.toMatch(/\\\\?[bwBW]/);
  }
 });
});
describe('Front SC4: mutation fixtures',()=>{
 it('covers every rule in every profile it applies to',()=>{
  for(const id of PROFILE_IDS){
   const p=PROFILES[id],rules=RULES_WITH_FIXTURES.filter(r=>r!=='purity'||p.otherScript||p.kanaInSentences);
   expect(rules.filter(r=>!FIXTURES.some(f=>f.profile===id&&f.rule===r)),id).toEqual([]);
   expect(FIXTURES.some(f=>f.profile===id&&f.rule==='register'&&f.registers),`${id}: a fixture with the register flipped`).toBe(true);
  }
 });
 it.each(FIXTURES.map(f=>[name(f,'good'),f] as const))('passes %s',(_,f)=>{
  const findings=lintPair({id:'fixture',en:f.en,text:f.good},profileOf(f),dataOf(f));
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  if(f.rule==='length')expect(describeFindings(reportsOf(findings))).toEqual([]);
 });
 it.each(FIXTURES.map(f=>[name(f,'bad'),f] as const))('catches %s',(_,f)=>{
  const findings=lintPair({id:'fixture',en:f.en,text:f.bad},profileOf(f),dataOf(f));
  expect(findings.map(x=>x.rule)).toContain(f.rule);
  expect(findings.filter(x=>x.rule===f.rule).every(x=>x.severity===(f.rule==='length'?'report':'error'))).toBe(true);
 });
});
describe('Front SC4: rule details',()=>{
 it('matches words with the profile boundary: substring for CJK, letters for Russian, letters and marks for Hindi, stems with *',()=>{
  const re=(w:string,b:Parameters<typeof wordSource>[1])=>new RegExp(wordSource(w,b),'iu');
  expect(re('ты','letters').test('Ты открыл')).toBe(true);expect(re('ты','letters').test('крышка тыквы')).toBe(false);
  expect(re('вы','letters').test('выберите')).toBe(false);expect(re('зрительн*','letters').test('зрительную')).toBe(true);expect(re('зрительн*','letters').test('незрительный')).toBe(false);
  expect(re('तुम','letters-marks').test('तुम्हारा')).toBe(false);expect(re('तुम','letters-marks').test('क्या तुम')).toBe(true);
  expect(re('您','none').test('请您打开')).toBe(true);
 });
 it('counts glyph classes longest first and lets a profile allow extra marks',()=>{
  const zh=PROFILES['zh-Hans'],ru=PROFILES.ru;
  expect(lintPair({id:'x',en:'A — B',text:'甲——乙'},zh).filter(f=>f.rule==='glyphs')).toEqual([]);
  expect(lintPair({id:'x',en:'A — B',text:'甲——乙——丙'},zh).map(f=>f.rule)).toContain('glyphs');
  expect(lintPair({id:'x',en:'Edwin Hubble',text:'埃德温·哈勃'},zh).filter(f=>f.rule==='glyphs')).toEqual([]);
  expect(lintPair({id:'x',en:'Open the dome',text:'Купол — открыть'},ru).filter(f=>f.rule==='glyphs')).toEqual([]);
 });
 it('balances marks with closer contexts, which is how SC9 can express Spanish ¿? and ¡!',()=>{
  const q={open:'¿',close:'?',closeAfter:/[\p{L}\d)»”…}]/u,closeBefore:/[\s)»”.,;:]|$/};
  expect(unbalanced('¿Cambiar el idioma?',q)).toBeNull();expect(unbalanced('Cambiar el idioma?',q)).toBe('? without ¿');expect(unbalanced('¿Cambiar el idioma.',q)).toBe('¿ without ?');
  expect(unbalanced('presiona la tecla ? o abre ?lang=es',q)).toBeNull();expect(unbalanced('¿Restaurar {file}?',q)).toBeNull();
  const latin:LocaleProfile={...PROFILES.ru,id:'es-test',name:'Spanish (test)',script:null,pairs:[q],register:{setting:'test',patterns:[]},typography:[],forbiddenMarks:[]};
  expect(lintPair({id:'x',en:'Restore {file}?',text:'Restaurar {file}?'},latin).map(f=>f.rule)).toContain('pairs');
  expect(lintPair({id:'original:fragment|x',en:'Restore {file}?',text:'Restaurar {file}?'},latin).map(f=>f.rule)).not.toContain('pairs');
  expect(lintPair({id:'x',en:'1) first',text:'1) первый'},PROFILES.ru).map(f=>f.rule)).not.toContain('pairs');// unbalanced in English too
 });
 it('treats identical strings and strings without the script the same way: allowed only with a reason in identical.json',()=>{
  const p:Pair={id:'catalog:app.name',en:'OpenVireo',text:'OpenVireo'},q:Pair={id:'catalog:units',en:'km/s',text:'km/s · Mpc'};
  for(const id of PROFILE_IDS){
   expect(lintPair(p,PROFILES[id]).map(f=>f.rule),id).toContain('identical');
   expect(lintPair(p,PROFILES[id],{identical:{'catalog:app.name':'product name (OpenVireo)'}}),id).toEqual([]);
   expect(lintPair(q,PROFILES[id]).map(f=>f.rule),id).toContain('script');
  }
 });
 it('accepts a finding only where lint-allowed names it, and flags allowances that are vague or no longer needed',()=>{
  const ru=PROFILES.ru,all:Pair[]=[{id:'catalog:quote',en:'Type ты.',text:'Введите «ты».'},{id:'catalog:other',en:'Open',text:'Открой'}];
  const data:LintData={allowed:{'catalog:quote':{words:['ты'],reason:'the pronoun is quoted as an example of input, not an address'}}};
  expect(describeFindings(lintPairs(all,ru,data))).toEqual(['catalog:other: [register] register vy, ты imperative: «Открой», use the вы form (-те)']);
  const stale:LintData={allowed:{'catalog:other':{rules:['typography'],reason:'kept for a reason that no longer applies here'},'catalog:quote':{words:['ты'],reason:'short'},'catalog:gone':{rules:['register'],reason:'a string that has since been removed from the catalog'}}};
  expect(describeFindings(allowances(all,ru,stale))).toEqual([
   'catalog:other: [allowances] allows rule typography, which no longer fires',
   'catalog:quote: [allowances] lint-allowed.json entry needs a reason',
   'catalog:gone: [allowances] lint-allowed.json entry for a string that does not exist',
  ]);
  expect(describeFindings(allowances([],ru,{identical:{'catalog:x':'kept'}}))).toEqual(['catalog:x: [allowances] identical.json entry needs a reason']);
 });
 it('requires exactly the plural categories of the language for keys marked plural',()=>{
  const forms=(cats:string[])=>Object.fromEntries(cats.map(c=>[`files.count.${c}`,`${c} form`]));
  expect(pluralForms(forms(['one','few','many','other']),['files.count'],PROFILES.ru)).toEqual([]);
  expect(describeFindings(pluralForms(forms(['one','other']),['files.count'],PROFILES.ru))).toEqual(['catalog:files.count: [plural] lacks the few form (Russian needs one, few, many, other)','catalog:files.count: [plural] lacks the many form (Russian needs one, few, many, other)']);
  expect(pluralForms(forms(['other']),['files.count'],PROFILES.ja)).toEqual([]);
  expect(describeFindings(pluralForms(forms(['one','other']),['files.count'],PROFILES['zh-Hans']))).toEqual(['catalog:files.count: [plural] has a one form, which Simplified Chinese never selects']);
  expect(pluralForms(forms(['one','other']),['files.count'],PROFILES.hi)).toEqual([]);
 });
 it('counts length in grapheme clusters, not UTF-16 units',()=>{
  expect(graphemeLength('क्षत्रिय')).toBe(3);expect(graphemeLength('望遠鏡')).toBe(3);expect(graphemeLength('👩\u200d🔬')).toBe(1);
 });
 it('reads a glossary in the Spanish shape for any language field, and normalises names as vireo.ts does',()=>{
  const g=glossaryFrom({terms:[{en:'\\bdomes?\\b',es:'cúpula',ru:'купол'}],names:[{en:'OK',es:'Aceptar',ru:'ОК',exact:true}],forbidden:[{words:['fichero'],use:'archivo'},{es:'\\busted\\b',ru:'Вы',use:'tú'}]},'ru');
  expect(g).toEqual({terms:[{en:'\\bdomes?\\b',text:'купол'}],names:[{en:'OK',text:'ОК',exact:true}],forbidden:[{words:['fichero'],use:'archivo'},{pattern:'Вы',use:'tú'}]});
  for(const s of ['&File','Save &As...','R&&D',' &Help '])expect(normalizeName(s),s).toBe(normalizeOriginal(s));
 });
 it('collects catalog, map and original pairs with sample arguments',()=>{
  const english={'a.b':'Open {file}','a.c':'Close'},maps={m:{title:'Hot list',count:(n:number)=>`${n} row${n===1?'':'s'}`,size:(x:number)=>`${x.toFixed(1)} m`}};
  const pairs=collectPairs({catalog:{'a.b':'Открыть {file}','a.x':'Лишний'},english,maps:{m:{title:'Список',count:(n:number)=>`строк: ${n}`,size:(x:number)=>`${x.toFixed(1)} м`}},englishMaps:maps,originals:{'Topics...':'Темы...','fragment|Error ':'Ошибка '}});
  expect(pairs).toEqual([
   {id:'catalog:a.b',en:'Open {file}',text:'Открыть {file}'},{id:'catalog:a.x',en:'',text:'Лишний'},
   {id:'map:m.title',en:'Hot list',text:'Список'},{id:'map:m.count',en:'«A1» rows',text:'строк: «A1»'},{id:'map:m.size',en:'«A1» m',text:'«A1» м'},
   {id:'original:Topics...',en:'Topics...',text:'Темы...'},{id:'original:fragment|Error ',en:'Error ',text:'Ошибка '},
  ]);
 });
});
