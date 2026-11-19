import {describe,expect,it} from 'vitest';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import en from '../en.json';
import zh from './zh-hans.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import {CHINESE_SIMPLIFIED} from './index';
import {createI18n,english,locale,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {MAP_IDS,type MapId} from '../maps';
import {languageEntry,thousandsSeparator} from '../languages';
import {pluralCategory} from '../plural';
import {collectPairs} from '../lint/pairs';
import {PROFILES} from '../lint/profiles';
import {describeFindings,errorsOf,glossaryFrom,graphemeLength,lintPairs,reportsOf,type Allowance,type LintData} from '../lint/rules';
import {APP_SHELL_MESSAGES_EN} from '../../components/AppShellMessages';
import {HELP_MENU_EN} from '../../help/HelpMessages';
import {LANGUAGE_CHOICE_EN} from '../../components/LanguageChoiceMessages';
import {OBJECT_X_LAB_EN} from '../../objectx/ObjectXMessages';
import {POLISH_MESSAGES_EN} from '../../polish/PolishMessages';
import {PROJECT_LINKS_EN} from '../../help/projectLinks';
import {TOUR_EN} from '../../help/tour';
import {VARIABLE_STARS_EN} from '../../variables/VariableStarMessages';

// Front ZH0 (docs/I18N.md, "Simplified Chinese: the folder, lints and shell (ZH0)"; plan front-i18n-zh.md §1.2, §6.2): the
// structural checks of the partial Simplified Chinese bundle and every string through the SC4 lint framework, profile zh-Hans
// (full-width punctuation next to Han, “ ” quotes, no space between Han and Latin text, 你 not 您, no Traditional character, the
// glossary). Errors fail the batch; length ratios are reported for the independent reviewer. Later ZH fronts add their maps to
// ENGLISH_MAPS and COMPLETE_MAPS, and their areas to the coverage checks. There is no Chinese fixer yet: the lint's typography rule
// reports each mark to change; the CJK punctuation fixer that Front JA0 builds (shared notes, 2026-11-19) is reused once merged.
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN};
/** The maps translated completely; the others are partial until their front (objectXLab ZH6, polish ZH1, variableStars ZH4). */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour'];
/** ZH0's area of en.json: the shell (header, menu, first steps, toolbar, errors, instructor mode, document title), as FR0's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const HOME_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
const profile=PROFILES['zh-Hans'];
const data:LintData={glossary:glossaryFrom(glossaryJson,'zh-Hans'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:zh,english:en,maps:CHINESE_SIMPLIFIED.maps,englishMaps:ENGLISH_MAPS,originals});
const DIR=import.meta.dirname;
const sources=(sub:string)=>existsSync(path.join(DIR,sub))?readdirSync(path.join(DIR,sub)).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(DIR,sub,f)):[];

describe('Front ZH0: the Simplified Chinese (zh-Hans) bundle',()=>{
 it('is registered before its release: a ?lang=zh-Hans preview only, never detected or offered; comma thousands as en-US',()=>{
  expect(languageEntry('zh-Hans')).toMatchObject({dir:'zh-hans',catalog:'zh-hans.json',budgetFactor:1.4,htmlLang:'zh-Hans',pagePath:'zh-hans',autonym:'简体中文',englishName:'Simplified Chinese',
   match:['zh-Hans','zh-CN','zh-SG','zh-MY','zh'],except:['zh-Hant','zh-TW','zh-HK','zh-MO'],released:false});
  expect(languageEntry('zh-Hans')?.thousands).toBeUndefined();expect(languageEntry('zh-Hans')?.help).toBeUndefined();
  expect(CHINESE_SIMPLIFIED.language).toBe('zh-Hans');
  // The notices pass the profile too (full-width marks, no Traditional character).
  const notices=Object.entries(languageEntry('zh-Hans')!.notices).map(([k,text])=>({id:`notice:${k}`,en:k==='language'?'Simplified Chinese could not be loaded; English is shown. Reload to try again.':'Part of the Simplified Chinese text could not be loaded; that part is shown in English. Reload to try again.',text}));
  expect(describeFindings(errorsOf(lintPairs(notices,profile,{})))).toEqual([]);
 });
 it('the catalog is a valid partial catalog (en.json keys, the same {params}) and covers the whole shell and the welcome',()=>{
  expect(()=>createI18n(zh as Partial<Record<MessageKey,string>>,'zh-Hans',{fallback:true})).not.toThrow();
  for(const key of Object.keys(zh))expect(Object.hasOwn(en,key),key).toBe(true);
  expect(SHELL_KEYS.length).toBe(131);// 131 since Front HI0 (app.digitNotice, the digit notice)
  expect(SHELL_KEYS.filter(k=>!Object.hasOwn(zh,k))).toEqual([]);
  expect(HOME_KEYS.length).toBe(27);expect(HOME_KEYS.filter(k=>!Object.hasOwn(zh,k))).toEqual([]);
 });
 it('every map has its English shape: the shell maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(CHINESE_SIMPLIFIED.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(CHINESE_SIMPLIFIED.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also translates (src/i18n/es/es.test.ts checks those against the source)',()=>{
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key),key).toBe(true);}
 });
 it('map and help sources write their characters literally, never as \\u escapes (scripts/check-i18n-dist.mjs reads them as written)',()=>{
  for(const file of [...sources('maps'),...sources('help')])expect(readFileSync(file,'utf8'),path.relative(DIR,file)).not.toMatch(/\\u[0-9a-fA-F]{4}/);
 });
 it('formats numbers as en-US (comma thousands, decimal point: native Chinese practice, no thousands field); plurals have one form',()=>{
  expect(thousandsSeparator('zh-Hans')).toBeUndefined();
  const zhI18n=createI18n(zh as Partial<Record<MessageKey,string>>,'zh-Hans',{fallback:true,numberLocale:locale});
  expect([24000,2400000,1234.5,-31147].map(v=>zhI18n.formatNumber(v))).toEqual(['24,000','2,400,000','1,234.5','-31,147']);
  expect(zhI18n.formatNumber(0.25,{style:'percent'})).toBe('25%');expect(english.formatNumber(24000)).toBe('24,000');
  expect([0,1,1.5,2,1000000].map(n=>pluralCategory('zh-Hans',n))).toEqual(['other','other','other','other','other']);
 });
 it('passes every rule of the zh-Hans profile with the glossary, identical.json and lint-allowed.json',()=>{
  const findings=lintPairs(pairs(),profile,data);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  const reports=reportsOf(findings);
  if(reports.length)console.info(`zh-Hans reports for the reviewer (not failures):\n${describeFindings(reports).join('\n')}`);
 });
 it('calibration (plan §6.2): the grapheme ratio of the shell strings to their English, printed for docs/I18N.md',()=>{
  const ratios=pairs().filter(p=>p.en.length>=12).map(p=>graphemeLength(p.text)/graphemeLength(p.en)).sort((a,b)=>a-b);
  const q=(f:number)=>ratios[Math.min(ratios.length-1,Math.floor(f*ratios.length))].toFixed(2);
  console.info(`zh-Hans grapheme ratio over ${ratios.length} strings: p10 ${q(.1)}, median ${q(.5)}, p90 ${q(.9)}`);
  expect(ratios.length).toBeGreaterThan(150);
 });
});
