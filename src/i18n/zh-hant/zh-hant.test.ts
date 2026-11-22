import {describe,expect,it} from 'vitest';
import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import en from '../en.json';
import zh from './zh-hant.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import zhHans from '../zh-hans/zh-hans.json';
import {CHINESE_TRADITIONAL} from './index';
import {createI18n,english,locale,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {MAP_IDS,type MapId} from '../maps';
import {languageEntry,thousandsSeparator} from '../languages';
import {pluralCategory} from '../plural';
import {collectPairs} from '../lint/pairs';
import {PROFILES} from '../lint/profiles';
import {describeFindings,errorsOf,glossaryFrom,graphemeLength,lintPairs,reportsOf,type Allowance,type LintData} from '../lint/rules';
import {fixSourceLiterals} from '../lint/frenchSpacing';
import {fixCjkPunctuation,TRADITIONAL_CHINESE_STYLE} from '../lint/cjkPunctuation';
import {chineseHanzi} from '../lint/chinese';
import {SIMPLIFIED_ONLY} from '../lint/hanVariants';
import {APP_SHELL_MESSAGES_EN} from '../../components/AppShellMessages';
import {HELP_MENU_EN} from '../../help/HelpMessages';
import {LANGUAGE_CHOICE_EN} from '../../components/LanguageChoiceMessages';
import {OBJECT_X_LAB_EN} from '../../objectx/ObjectXMessages';
import {POLISH_MESSAGES_EN} from '../../polish/PolishMessages';
import {PROJECT_LINKS_EN} from '../../help/projectLinks';
import {TOUR_EN} from '../../help/tour';
import {VARIABLE_STARS_EN} from '../../variables/VariableStarMessages';

// Front ZT0 (docs/I18N.md, "Traditional Chinese: the folder, lints and shell (ZT0)"; plan front-i18n-zh.md §1.2 #7–#8, §6.3): the
// structural checks of the partial Traditional Chinese bundle and every string through the SC4 lint framework, profile zh-Hant
// (full-width punctuation next to Han, 「」 quotes, no space between Han and Latin text, 你 not 您, no Simplified character, Big5's
// standard hanzi only, the glossary with its Taiwan-vocabulary `forbidden` list). Errors fail the batch; length ratios are reported for
// the independent reviewer. Later ZT fronts add their maps to ENGLISH_MAPS and COMPLETE_MAPS, and their areas to the coverage checks.
//
// Fix mode (as zh-hans.test.ts): `env -u CI OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/zh-hant/zh-hant.test.ts` rewrites
// zh-hant.json, originals.json and the string literals of maps/*.ts and help/*.ts with the CJK punctuation fixer in its Traditional
// Chinese style (「」 and 『』), writing the characters literally, then checks as usual.
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN};
/** The maps translated completely; the others hold only their menu names until their front (objectXLab, polish, variableStars). */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour'];
/** ZT0's area of en.json: the shell (header, menu, first steps, toolbar, errors, instructor mode, document title), as ZH0's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const HOME_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
const profile=PROFILES['zh-Hant'];
const data:LintData={glossary:glossaryFrom(glossaryJson,'zh-Hant'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:zh,english:en,maps:CHINESE_TRADITIONAL.maps,englishMaps:ENGLISH_MAPS,originals});
const DIR=import.meta.dirname;
const sources=(sub:string)=>existsSync(path.join(DIR,sub))?readdirSync(path.join(DIR,sub)).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(DIR,sub,f)):[];
const fix=(text:string,options?:{quotes?:boolean;valueMarks?:RegExp})=>fixCjkPunctuation(text,TRADITIONAL_CHINESE_STYLE,options);
const fixOriginal=(key:string,text:string)=>fix(text,{quotes:!key.startsWith('fragment|')});
const fixSource=(source:string)=>fixSourceLiterals(source,(text,options)=>fix(text,options));
const writeJson=(file:string,value:unknown)=>writeFileSync(path.join(DIR,file),JSON.stringify(value,null,1)+'\n');

if(process.env.OPENVIREO_FIX_TYPOGRAPHY==='1'){
 // As FR0, JA0 and ZH0: refused in CI (CI must check, never rewrite).
 if(process.env.CI)throw new Error('OPENVIREO_FIX_TYPOGRAPHY=1 is refused in CI: run the fixer locally and commit the reviewed diff');
 const catalog=JSON.parse(readFileSync(path.join(DIR,'zh-hant.json'),'utf8')) as Record<string,string>;
 writeJson('zh-hant.json',Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,fix(v)])));
 const own=JSON.parse(readFileSync(path.join(DIR,'originals.json'),'utf8')) as Record<string,string>;
 writeJson('originals.json',Object.fromEntries(Object.entries(own).map(([k,v])=>[k,fixOriginal(k,v)])));
 for(const file of [...sources('maps'),...sources('help')]){const before=readFileSync(file,'utf8'),after=fixSource(before);if(after!==before)writeFileSync(file,after);}
}

describe('Front ZT0: the Traditional Chinese (zh-Hant) bundle',()=>{
 it('is registered before its release: a ?lang=zh-Hant preview only, never detected or offered; comma thousands as en-US',()=>{
  expect(languageEntry('zh-Hant')).toMatchObject({dir:'zh-hant',catalog:'zh-hant.json',budgetFactor:1.4,htmlLang:'zh-Hant',pagePath:'zh-hant',autonym:'繁體中文',englishName:'Traditional Chinese',
   match:['zh-Hant','zh-TW','zh-HK','zh-MO'],released:false});
  expect(languageEntry('zh-Hant')?.except).toBeUndefined();
  expect(languageEntry('zh-Hant')?.thousands).toBeUndefined();expect(languageEntry('zh-Hant')?.help).toBeUndefined();
  expect(CHINESE_TRADITIONAL.language).toBe('zh-Hant');
  // The notices pass the profile too (full-width marks, no Simplified character, Taiwan wording: 載入, 重新整理).
  const notices=Object.entries(languageEntry('zh-Hant')!.notices).map(([k,text])=>({id:`notice:${k}`,en:k==='language'?'Traditional Chinese could not be loaded; English is shown. Reload to try again.':'Part of the Traditional Chinese text could not be loaded; that part is shown in English. Reload to try again.',text}));
  expect(describeFindings(errorsOf(lintPairs(notices,profile,data)))).toEqual([]);
  for(const n of notices)expect(fix(n.text),n.id).toBe(n.text);
 });
 it('the catalog is a valid partial catalog (en.json keys, the same {params}) and covers the whole shell and the welcome',()=>{
  expect(()=>createI18n(zh as Partial<Record<MessageKey,string>>,'zh-Hant',{fallback:true})).not.toThrow();
  for(const key of Object.keys(zh))expect(Object.hasOwn(en,key),key).toBe(true);
  expect(SHELL_KEYS.length).toBe(131);
  expect(SHELL_KEYS.filter(k=>!Object.hasOwn(zh,k))).toEqual([]);
  expect(HOME_KEYS.length).toBe(27);expect(HOME_KEYS.filter(k=>!Object.hasOwn(zh,k))).toEqual([]);
  // Adapted, not converted (user decision of 2026-11-19): every key it holds is also in the reviewed zh-Hans catalog it adapts.
  expect(Object.keys(zh).filter(k=>!Object.hasOwn(zhHans,k))).toEqual([]);
 });
 it('every map has its English shape: the shell maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(CHINESE_TRADITIONAL.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(CHINESE_TRADITIONAL.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also translates (src/i18n/es/es.test.ts checks those against the source)',()=>{
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key),key).toBe(true);}
 });
 it('map and help sources write their characters literally, never as \\u escapes (scripts/check-i18n-dist.mjs reads them as written)',()=>{
  for(const file of [...sources('maps'),...sources('help')])expect(readFileSync(file,'utf8'),path.relative(DIR,file)).not.toMatch(/\\u[0-9a-fA-F]{4}/);
 });
 it('formats numbers as en-US (comma thousands, decimal point: native Chinese practice, no thousands field); plurals have one form',()=>{
  expect(thousandsSeparator('zh-Hant')).toBeUndefined();
  const zhI18n=createI18n(zh as Partial<Record<MessageKey,string>>,'zh-Hant',{fallback:true,numberLocale:locale});
  expect([24000,2400000,1234.5,-31147].map(v=>zhI18n.formatNumber(v))).toEqual(['24,000','2,400,000','1,234.5','-31,147']);
  expect(zhI18n.formatNumber(0.25,{style:'percent'})).toBe('25%');expect(english.formatNumber(24000)).toBe('24,000');
  expect([0,1,1.5,2,1000000].map(n=>pluralCategory('zh-Hant',n))).toEqual(['other','other','other','other','other']);
 });
 it('passes every rule of the zh-Hant profile with the glossary (Taiwan vocabulary included), identical.json and lint-allowed.json',()=>{
  const findings=lintPairs(pairs(),profile,data);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  const reports=reportsOf(findings);
  if(reports.length)console.info(`zh-Hant reports for the reviewer (not failures):\n${describeFindings(reports).join('\n')}`);
 });
 it('the CJK punctuation fixer (Traditional Chinese style, 「」) has nothing left to change: catalog, originals, maps and help sources',()=>{
  expect(Object.entries(zh).filter(([,v])=>fix(v)!==v).map(([k])=>k)).toEqual([]);
  expect(Object.entries(originals).filter(([k,v])=>fixOriginal(k,v)!==v).map(([k])=>k)).toEqual([]);
  for(const file of [...sources('maps'),...sources('help')]){const text=readFileSync(file,'utf8');expect(fixSource(text)===text,path.relative(DIR,file)).toBe(true);}
 });
 it('the glossary: every term, name and forbidden form is Traditional (no Simplified-only character), and the Taiwan-vocabulary rule is in force',()=>{
  const g=glossaryJson as {terms:{'zh-Hant':string}[];names:{'zh-Hant':string}[];forbidden:{words?:string[]}[]};
  const simplified=(s:string)=>[...s].filter(c=>SIMPLIFIED_ONLY.has(c));
  for(const t of [...g.terms,...g.names])expect(simplified(t['zh-Hant']),t['zh-Hant']).toEqual([]);
  const words=g.forbidden.flatMap(f=>f.words??[]);
  for(const w of words)expect(simplified(w),w).toEqual([]);
  // Plan §1.2 #8: mainland words written in Traditional characters, which the script-purity check cannot see.
  for(const w of ['您','軟件','信息','默認','屏幕','鼠標','網絡','視頻','打印','菜單','窗口','加載','導出','導入','用戶','搜索','字符','鏈接','射電','多普勒','哈勃','信噪比','數據','保存','點擊','光標','刷新'])expect(words,w).toContain(w);
  // Legitimate Taiwan usage in another sense stays allowed (程序 procedure, 質量 mass, 文件 document…).
  for(const w of ['程序','質量','文件','設置','支持'])expect(words,w).not.toContain(w);
 });
 it('uses only Big5\'s standard hanzi (the out-of-set check of the profile) and builds that set from the runtime decoder (no download)',()=>{
  expect(chineseHanzi('zh-Hant').size).toBe(13060);
  const set=chineseHanzi('zh-Hant');
  const outside=pairs().flatMap(p=>[...p.text].filter(c=>/\p{sc=Han}/u.test(c)&&!set.has(c)).map(c=>`${p.id}: ${c}`));
  expect(outside).toEqual([]);
 });
 it('calibration (plan §1.2 #7): the grapheme ratio of the shell strings to their English, printed for docs/I18N.md',()=>{
  const ratios=pairs().filter(p=>p.en.length>=12).map(p=>graphemeLength(p.text)/graphemeLength(p.en)).sort((a,b)=>a-b);
  const q=(f:number)=>ratios[Math.min(ratios.length-1,Math.floor(f*ratios.length))].toFixed(2);
  console.info(`zh-Hant grapheme ratio over ${ratios.length} strings: p10 ${q(.1)}, median ${q(.5)}, p90 ${q(.9)}`);
  expect(ratios.length).toBeGreaterThan(150);
 });
});
