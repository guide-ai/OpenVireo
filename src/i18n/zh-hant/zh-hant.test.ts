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
import esIdentical from '../es/identical.json';
import zhHansOriginals from '../zh-hans/originals.json';
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
import {HELP_VIEWER_EN} from '../../help/HelpViewerMessages';
import {WEB_HELP_EN} from '../../help/webHelp';
import {VARIABLE_STARS_EN} from '../../variables/VariableStarMessages';
import {FIELD_INFO_MESSAGES_EN,FIELD_READ_DETAILS_EN,NAKED_EYE_MESSAGES_EN} from '../../observatory/FieldInfoMessages';
import {OBSERVATORY_MESSAGES_EN} from '../../observatory/ObservatoryMessages';
import {QSO_LIST_MESSAGES_EN} from '../../observatory/QsoListMessages';
import {SOUND_MESSAGES_EN} from '../../sound/SoundMessages';
import {OBSERVATION_METADATA_EN} from '../../ObservationMetadataMessages';
import {CAMERA_MESSAGES_EN} from '../../camera/CameraMessages';
import {ENGINE_VIEW_EN} from '../../SpectrumEngineMessages';
import {SPECTRAL_RANGE_EN} from '../../SpectralRangeMessages';
import {WEDGE_MESSAGES_EN} from '../../components/WedgeMessages';
import {CLUSTER_HR_EN} from '../../clusters/ClusterHrMessages';
import {CLUSTER_DATA_MESSAGES_EN} from '../../clusterdata/ClusterDataMessages';
import {RADIO_ANTENNA_MESSAGES_EN} from '../../components/RadioAntennaMessages';
import {FINISH_SAVE_MESSAGES_EN} from '../../components/RadioFinishSaveMessages';
import {RADIO_R1_MESSAGES_EN} from '../../components/RadioR1Messages';
import {RADIO_SAVE_MESSAGES_EN} from '../../components/RadioRecordSaveMessages';
import {PULSAR_MESSAGES_EN} from '../../components/PulsarMessages';
import {SAVED_ROWS_MESSAGES_EN} from '../../components/PulsarSavedRowsMessages';
import {LOAD_SAVE_MESSAGES_EN} from '../../components/PulsarLoadSaveMessages';
import {OBJECT_X_GUIDE_EN,OBJECT_X_MEASURE_EN,OBJECT_X_SESSION_EN} from '../../objectx/ObjectXMessages';

// Front ZT0 (docs/I18N.md, "Traditional Chinese: the folder, lints and shell (ZT0)"; plan front-i18n-zh.md §1.2 #7–#8, §6.3): the
// structural checks of the partial Traditional Chinese bundle and every string through the SC4 lint framework, profile zh-Hant
// (full-width punctuation next to Han, 「」 quotes, no space between Han and Latin text, 你 not 您, no Simplified character, Big5's
// standard hanzi only, the glossary with its Taiwan-vocabulary `forbidden` list). Errors fail the batch; length ratios are reported for
// the independent reviewer. Later ZT fronts add their maps to ENGLISH_MAPS and COMPLETE_MAPS, and their areas to the coverage checks.
//
// Fix mode (as zh-hans.test.ts): `env -u CI OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/zh-hant/zh-hant.test.ts` rewrites
// zh-hant.json, originals.json and the string literals of maps/*.ts and help/*.ts with the CJK punctuation fixer in its Traditional
// Chinese style (「」 and 『』), writing the characters literally, then checks as usual.
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,
 camera:CAMERA_MESSAGES_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,nakedEye:NAKED_EYE_MESSAGES_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN,
 engineView:ENGINE_VIEW_EN,spectralRange:SPECTRAL_RANGE_EN,wedge:WEDGE_MESSAGES_EN,clusterHr:CLUSTER_HR_EN,clusterData:CLUSTER_DATA_MESSAGES_EN,
 radioAntenna:RADIO_ANTENNA_MESSAGES_EN,radioFinishSave:FINISH_SAVE_MESSAGES_EN,radioR1:RADIO_R1_MESSAGES_EN,radioRecordSave:RADIO_SAVE_MESSAGES_EN,
 pulsar:PULSAR_MESSAGES_EN,pulsarSavedRows:SAVED_ROWS_MESSAGES_EN,pulsarLoadSave:LOAD_SAVE_MESSAGES_EN,objectXGuide:OBJECT_X_GUIDE_EN,objectXMeasure:OBJECT_X_MEASURE_EN,objectXSession:OBJECT_X_SESSION_EN,
 helpViewer:HELP_VIEWER_EN,webHelp:WEB_HELP_EN};
/** The maps translated completely (ZT0's shell maps; ZT1's observatory maps, the camera card, polish, engineView, spectralRange and
 * wedge; ZT2's cluster, variable-star, radio, pulsar and Object X maps): and ZT-HELP's help maps webHelp and helpViewer: every Traditional Chinese map is complete. */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','observatory','fieldInfo','fieldReadDetails','nakedEye','polish','qsoList','sound','observationMetadata','camera','engineView','spectralRange','wedge','clusterHr','clusterData','variableStars','radioAntenna','radioFinishSave','radioR1','radioRecordSave','pulsar','pulsarSavedRows','pulsarLoadSave','objectXLab','objectXGuide','objectXMeasure','objectXSession','helpViewer','webHelp'];
/** ZT2's area of en.json (the zh-Hans fronts ZH4–ZH6: E04, E05, the radio telescope, E06, E08); ZT1 covered every other key. */
const ZT2_PREFIXES=/^(ph|pa|pleiadesLab|nc|db|ce|clusterLab|ownHr|obsHr|radio|radioRoute|radioAccess|radioReceiver|radioSimOptions|pulsarParameters|pulsarLab|plr|fits)\./;
/** ZT0's area of en.json: the shell (header, menu, first steps, toolbar, errors, instructor mode, document title), as ZH0's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const HOME_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
const profile=PROFILES['zh-Hant'];
const data:LintData={glossary:glossaryFrom(glossaryJson,'zh-Hant'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:zh,english:en,maps:CHINESE_TRADITIONAL.maps,englishMaps:ENGLISH_MAPS,originals});
const DIR=import.meta.dirname;
const sources=(sub:string)=>existsSync(path.join(DIR,sub))?readdirSync(path.join(DIR,sub)).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(DIR,sub,f)):[];
const fix=(text:string,options?:{quotes?:boolean;valueMarks?:RegExp})=>fixCjkPunctuation(text,TRADITIONAL_CHINESE_STYLE,options);
/** VIREO originals whose ASCII bracket VIREO itself closes after a value (`Object: (` + number + `) `): the fixer leaves them, as zh-Hans. */
const ASCII_BRACKET_PIECES:readonly string[]=['Object: ('];
const fixOriginal=(key:string,text:string)=>ASCII_BRACKET_PIECES.includes(key)?text:fix(text,{quotes:!key.startsWith('fragment|')});
/** As zh-Hans (ZH3): field names of VIREO's files that a catalog string quotes as the file writes them (`MJD(Days)`): the fixer keeps
 * their ASCII brackets beside Chinese text. */
const ASCII_FIELD_NAMES:readonly string[]=['MJD(Days)'];
const fixCatalog=(text:string)=>{const kept:string[]=[];const masked=ASCII_FIELD_NAMES.reduce((t,name)=>t.split(name).join(`\uE000${kept.push(name)-1}\uE001`),text);
 return fix(masked).replace(/\uE000(\d+)\uE001/g,(_,i:string)=>kept[Number(i)]!);};
/** As zh-Hans: the four originals that Spanish keeps identical but Chinese translates (VIREO's General, and the E, N, S buttons). */
const ZH_ONLY_ORIGINALS:readonly string[]=['General','E','N','S'];
const fixSource=(source:string)=>fixSourceLiterals(source,(text,options)=>fix(text,options));
/** Front ZT-HELP, as ZH-HELP: a run of two or more spaces between two characters is a column gap of VIREO's help tables, which the
 * fixer keeps (it would otherwise drop the spaces between Han and Latin text). */
const COLUMN_GAP=/(?<=\S) {2,}(?=\S)/g;
const fixHelp=(text:string,options?:{quotes?:boolean})=>{const gaps:string[]=[];
 return fix(text.replace(COLUMN_GAP,g=>`\uE003${gaps.push(g)-1}\uE004`),options).replace(/\uE003(\d+)\uE004/g,(_,i:string)=>gaps[Number(i)]!);};
const fixHelpSource=(source:string)=>fixSourceLiterals(source,(text,options)=>fixHelp(text,options));
const fixAny=(file:string,source:string)=>file.includes(`${path.sep}help${path.sep}`)?fixHelpSource(source):fixSource(source);
const writeJson=(file:string,value:unknown)=>writeFileSync(path.join(DIR,file),JSON.stringify(value,null,1)+'\n');

if(process.env.OPENVIREO_FIX_TYPOGRAPHY==='1'){
 // As FR0, JA0 and ZH0: refused in CI (CI must check, never rewrite).
 if(process.env.CI)throw new Error('OPENVIREO_FIX_TYPOGRAPHY=1 is refused in CI: run the fixer locally and commit the reviewed diff');
 const catalog=JSON.parse(readFileSync(path.join(DIR,'zh-hant.json'),'utf8')) as Record<string,string>;
 writeJson('zh-hant.json',Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,fixCatalog(v)])));
 const own=JSON.parse(readFileSync(path.join(DIR,'originals.json'),'utf8')) as Record<string,string>;
 writeJson('originals.json',Object.fromEntries(Object.entries(own).map(([k,v])=>[k,fixOriginal(k,v)])));
 for(const file of [...sources('maps'),...sources('help')]){const before=readFileSync(file,'utf8'),after=fixAny(file,before);if(after!==before)writeFileSync(file,after);}
}

describe('Front ZT0: the Traditional Chinese (zh-Hant) bundle',()=>{
 it('Front ZT-REL: is released (detected from Traditional browsers, Hong Kong and Macau included, never Simplified ones; stored, offered); comma thousands as en-US',()=>{
  expect(languageEntry('zh-Hant')).toMatchObject({dir:'zh-hant',catalog:'zh-hant.json',budgetFactor:1.4,htmlLang:'zh-Hant',pagePath:'zh-hant',autonym:'繁體中文',englishName:'Traditional Chinese',
   match:['zh-Hant','zh-TW','zh-HK','zh-MO'],released:true});
  expect(languageEntry('zh-Hant')?.except).toBeUndefined();
  expect(languageEntry('zh-Hant')?.thousands).toBeUndefined();expect(languageEntry('zh-Hant')?.help).toEqual({related:'相關主題'});// Front ZT-HELP
  expect(CHINESE_TRADITIONAL.language).toBe('zh-Hant');
  // The notices pass the profile too (full-width marks, no Simplified character, Taiwan wording: 載入, 重新整理).
  const notices=Object.entries(languageEntry('zh-Hant')!.notices).map(([k,text])=>({id:`notice:${k}`,en:k==='language'?'Traditional Chinese could not be loaded; English is shown. Reload to try again.':'Part of the Traditional Chinese text could not be loaded; that part is shown in English. Reload to try again.',text}));
  expect(describeFindings(errorsOf(lintPairs(notices,profile,{glossary:data.glossary})))).toEqual([]);
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
 it('Front ZT1 and ZT2: the catalog covers every en.json key (ZT1 the observatory, VIREO\'s names and E01–E03; ZT2 E04, E05, the radio telescope, E06 and E08), and no other key',()=>{
  const zt2=(Object.keys(en) as MessageKey[]).filter(k=>ZT2_PREFIXES.test(k));
  expect(zt2.length).toBe(1439);// 1437: Front NEWCOMER NC4 adds pleiadesLab.why, clusterLab.why and pulsarLab.why; 1439: NC5 adds pleiadesLab.version.quick and pleiadesLab.version.full
  expect(Object.keys(en).filter(k=>!Object.hasOwn(zh,k))).toEqual([]);
  expect(Object.keys(zh).filter(k=>!Object.hasOwn(en,k))).toEqual([]);
 });
 it('Front ZT-REL: the catalog is complete and strict: every en.json key, the same {params}, strings only, no extra key; every map complete',()=>{
  // As the earlier releases' checks: strictness lives here, since the split bundle builds each module with the English fallback.
  expect(()=>createI18n(zh as Record<MessageKey,string>,'zh-Hant')).not.toThrow();
  expect(Object.keys(en).filter(k=>!Object.hasOwn(zh,k))).toEqual([]);
  expect(Object.keys(zh).filter(k=>!Object.hasOwn(en,k))).toEqual([]);
  for(const [id,map] of Object.entries(CHINESE_TRADITIONAL.maps??{}))expect(mapParity(ENGLISH_MAPS[id as MapId],map),id).toEqual([]);
  expect(MAP_IDS.filter(id=>!Object.hasOwn(CHINESE_TRADITIONAL.maps??{},id))).toEqual([]);
 });
 it('every map has its English shape: the shell maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(CHINESE_TRADITIONAL.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(CHINESE_TRADITIONAL.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also knows (src/i18n/es/es.test.ts checks those against the source)',()=>{
  const esSame=(key:string)=>Object.hasOwn(esIdentical.entries,`original:${key}`);
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key)||esSame(key)||ZH_ONLY_ORIGINALS.includes(key),key).toBe(true);}
 });
 it('Front ZT1: every VIREO original is translated at once, or kept with an identical.json reason, never both (as zh-Hans)',()=>{
  const english=[...Object.keys(esOriginals),...Object.keys(esIdentical.entries).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length))];
  expect(new Set(english).size).toBe(760);english.push(...ZH_ONLY_ORIGINALS);
  const same=identical.entries as Record<string,string>,kept=Object.keys(same).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length));
  expect(english.filter(k=>!Object.hasOwn(originals,k)&&!Object.hasOwn(same,`original:${k}`))).toEqual([]);
  for(const k of kept){expect(english,k).toContain(k);expect(Object.hasOwn(originals,k),k).toBe(false);}
  const own=originals as Record<string,string>;
  expect([own.N,own.S,own.E,own.W]).toEqual(['北','南','東','西']);
  // The same originals as the reviewed zh-Hans it adapts: adapted, never dropped or added.
  expect(Object.keys(own).sort()).toEqual(Object.keys(zhHansOriginals).sort());
 });
 it('Front ZT1: a VIREO original keeps its line breaks, and a `fragment|` piece has no edge space (Chinese joins a value with no space)',()=>{
  const own=originals as Record<string,string>,breaks=(v:string)=>(v.match(/\r\n/g)??[]).length;
  expect(Object.keys(own).filter(k=>breaks(own[k])!==breaks(k.replace(/^fragment\|/,'')))).toEqual([]);
  const fragments=Object.keys(own).filter(k=>k.startsWith('fragment|'));
  expect(fragments.length).toBeGreaterThan(10);
  expect(fragments.filter(k=>/^\s|\s$/.test(own[k]))).toEqual([]);
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
  expect(Object.entries(zh).filter(([,v])=>fixCatalog(v)!==v).map(([k])=>k)).toEqual([]);
  expect(Object.entries(originals).filter(([k,v])=>fixOriginal(k,v)!==v).map(([k])=>k)).toEqual([]);
  for(const file of [...sources('maps'),...sources('help')]){const text=readFileSync(file,'utf8');expect(fixAny(file,text)===text,path.relative(DIR,file)).toBe(true);}
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
