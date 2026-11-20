import {describe,expect,it} from 'vitest';
import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import en from '../en.json';
import zh from './zh-hans.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import esIdentical from '../es/identical.json';
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
import {fixSourceLiterals} from '../lint/frenchSpacing';
import {fixCjkPunctuation,SIMPLIFIED_CHINESE_STYLE} from '../lint/cjkPunctuation';
import {chineseHanzi} from '../lint/chinese';
import {APP_SHELL_MESSAGES_EN} from '../../components/AppShellMessages';
import {HELP_MENU_EN} from '../../help/HelpMessages';
import {LANGUAGE_CHOICE_EN} from '../../components/LanguageChoiceMessages';
import {OBJECT_X_LAB_EN} from '../../objectx/ObjectXMessages';
import {POLISH_MESSAGES_EN} from '../../polish/PolishMessages';
import {PROJECT_LINKS_EN} from '../../help/projectLinks';
import {TOUR_EN} from '../../help/tour';
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

// Front ZH0 (docs/I18N.md, "Simplified Chinese: the folder, lints and shell (ZH0)"; plan front-i18n-zh.md §1.2, §6.2): the
// structural checks of the partial Simplified Chinese bundle and every string through the SC4 lint framework, profile zh-Hans
// (full-width punctuation next to Han, “ ” quotes, no space between Han and Latin text, 你 not 您, no Traditional character, the
// glossary). Errors fail the batch; length ratios are reported for the independent reviewer. Later ZH fronts add their maps to
// ENGLISH_MAPS and COMPLETE_MAPS, and their areas to the coverage checks. The CJK punctuation fixer that Front JA0 built
// (src/i18n/lint/cjkPunctuation.ts, SIMPLIFIED_CHINESE_STYLE) must leave every string unchanged, and since Front ZH1 the profile's
// typographyCheck (src/i18n/lint/chinese.ts) also reports any Han character outside GB2312.
//
// Fix mode (plan §4.3, as ja.test.ts): `env -u CI OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/zh-hans/zh-hans.test.ts` rewrites
// zh-hans.json, originals.json and the string literals of maps/*.ts and help/*.ts with the fixer, writing the characters literally,
// then checks as usual. A VIREO `fragment|` original keeps its straight quotes (another piece or the program closes them).
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,
 camera:CAMERA_MESSAGES_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,nakedEye:NAKED_EYE_MESSAGES_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN,
 engineView:ENGINE_VIEW_EN,spectralRange:SPECTRAL_RANGE_EN,wedge:WEDGE_MESSAGES_EN};
/** The maps translated completely (ZH0's shell maps; ZH1's observatory maps, the camera card the observatory shows, and polish; ZH2's
 * engineView, spectralRange and wedge); the
 * others hold only their header-menu names until their front (variableStars ZH4, objectXLab ZH6). */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','observatory','fieldInfo','fieldReadDetails','nakedEye','polish','qsoList','sound','observationMetadata','camera','engineView','spectralRange','wedge'];
/** Front ZH1's area of en.json: FR1's observatory keys (the instruments' prefixes and the Hubble hot-list reasons) and the 104 guide
 * keys the observatory files render (src/i18n/fr/fr.test.ts FR1_GUIDE_KEYS, read from there so the two never drift), as JA1's. */
const OBSERVATORY_PREFIXES=/^(sky|optical|motion|horizon|siteClock|runningClock|scopeAccess|instrumentAccess|instrumentParameters|cameraParameters|cameraInfo|cameraPrepare|palette|testMode|optionsFile|photometerTab|htl|multispec|nativeMirror|hubblePoint)\./;
const ZH1_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>OBSERVATORY_PREFIXES.test(k)||/^hubbleHtl\.reason\./.test(k));
const ZH1_GUIDE_KEYS=JSON.parse(`[${/const FR1_GUIDE_KEYS:readonly MessageKey\[\]=\[([^\]]*)\]/.exec(readFileSync(path.join(import.meta.dirname,'../fr/fr.test.ts'),'utf8'))![1].replace(/'/g,'"')}]`) as MessageKey[];
/** Front ZH2's area of en.json: exercises E01 (Hubble's law) and E02 (large-scale structure) as FR2 and JA2 scoped them (every key of
 * their prefixes, which include the shared core keys continuity.* and ssp.header, and classLink.open, the star exposure's button). */
const E01_E02_PREFIXES=/^(continuity|lab|lssLab|hubble|velocity|ownResults|spectrum|spectrometer|galaxyExposure|skyExposure|starExposure|ssp|exposureIO|drift|skyProfiles|fieldSpec|lss|wedge)\./;
const ZH2_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E01_E02_PREFIXES.test(k)||k==='classLink.open');
/** VIREO originals that Spanish keeps with no entry, as for Hindi and Japanese: the options dialog's General tab («常规») and the
 * Site Information compass letters E «东», N «北» and S «南» (W «西» is in Spanish's list). */
const ZH_ONLY_ORIGINALS:readonly string[]=['General','E','N','S'];
/** ZH0's area of en.json: the shell (header, menu, first steps, toolbar, errors, instructor mode, document title), as FR0's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const HOME_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
const profile=PROFILES['zh-Hans'];
const data:LintData={glossary:glossaryFrom(glossaryJson,'zh-Hans'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:zh,english:en,maps:CHINESE_SIMPLIFIED.maps,englishMaps:ENGLISH_MAPS,originals});
const DIR=import.meta.dirname;
const sources=(sub:string)=>existsSync(path.join(DIR,sub))?readdirSync(path.join(DIR,sub)).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(DIR,sub,f)):[];
const fix=(text:string,options?:{quotes?:boolean;valueMarks?:RegExp})=>fixCjkPunctuation(text,SIMPLIFIED_CHINESE_STYLE,options);
/** VIREO originals whose ASCII bracket VIREO itself closes after a value (`Object: (` + number + `) `): the fixer leaves them, as ja. */
const ASCII_BRACKET_PIECES:readonly string[]=['Object: ('];
const fixOriginal=(key:string,text:string)=>ASCII_BRACKET_PIECES.includes(key)?text:fix(text,{quotes:!key.startsWith('fragment|')});
const fixSource=(source:string)=>fixSourceLiterals(source,(text,options)=>fix(text,options));
const writeJson=(file:string,value:unknown)=>writeFileSync(path.join(DIR,file),JSON.stringify(value,null,1)+'\n');

if(process.env.OPENVIREO_FIX_TYPOGRAPHY==='1'){
 // As FR0 and JA0: refused in CI (CI must check, never rewrite).
 if(process.env.CI)throw new Error('OPENVIREO_FIX_TYPOGRAPHY=1 is refused in CI: run the fixer locally and commit the reviewed diff');
 const catalog=JSON.parse(readFileSync(path.join(DIR,'zh-hans.json'),'utf8')) as Record<string,string>;
 writeJson('zh-hans.json',Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,fix(v)])));
 const own=JSON.parse(readFileSync(path.join(DIR,'originals.json'),'utf8')) as Record<string,string>;
 writeJson('originals.json',Object.fromEntries(Object.entries(own).map(([k,v])=>[k,fixOriginal(k,v)])));
 for(const file of [...sources('maps'),...sources('help')]){const before=readFileSync(file,'utf8'),after=fixSource(before);if(after!==before)writeFileSync(file,after);}
}

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
 it('Front ZH1: the catalog covers the observatory (every key of its instruments\' prefixes) and the guide keys it renders',()=>{
  expect(ZH1_KEYS.length).toBeGreaterThan(450);
  expect(ZH1_KEYS.filter(k=>!Object.hasOwn(zh,k))).toEqual([]);
  expect(ZH1_GUIDE_KEYS.length).toBe(104);
  expect(ZH1_GUIDE_KEYS.filter(k=>!Object.hasOwn(en,k)||!Object.hasOwn(zh,k))).toEqual([]);
 });
 it('Front ZH2: the catalog covers E01 and E02 (every key of their prefixes, and classLink.open)',()=>{
  expect(ZH2_KEYS.length).toBeGreaterThan(780);
  expect(ZH2_KEYS.filter(k=>!Object.hasOwn(zh,k))).toEqual([]);
 });
 it('Front ZH1: every VIREO original is translated at once, or kept with an identical.json reason, never both',()=>{
  const english=[...Object.keys(esOriginals),...Object.keys(esIdentical.entries).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length))];
  expect(new Set(english).size).toBe(760);english.push(...ZH_ONLY_ORIGINALS);
  const same=identical.entries as Record<string,string>,kept=Object.keys(same).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length));
  expect(english.filter(k=>!Object.hasOwn(originals,k)&&!Object.hasOwn(same,`original:${k}`))).toEqual([]);
  for(const k of kept){expect(english,k).toContain(k);expect(Object.hasOwn(originals,k),k).toBe(false);}
  const own=originals as Record<string,string>;
  expect([own.N,own.S,own.E,own.W,own.General]).toEqual(['北','南','东','西','常规']);
 });
 it('Front ZH1: a VIREO original keeps its line breaks, and a `fragment|` piece has no edge space (Chinese joins a value with no space)',()=>{
  const own=originals as Record<string,string>,breaks=(v:string)=>(v.match(/\r\n/g)??[]).length;
  expect(Object.keys(own).filter(k=>breaks(own[k])!==breaks(k.replace(/^fragment\|/,'')))).toEqual([]);
  const fragments=Object.keys(own).filter(k=>k.startsWith('fragment|'));
  expect(fragments.length).toBeGreaterThan(10);
  expect(fragments.filter(k=>/^\s|\s$/.test(own[k]))).toEqual([]);
 });
 it('every map has its English shape: the shell and observatory maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(CHINESE_SIMPLIFIED.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(CHINESE_SIMPLIFIED.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also knows (src/i18n/es/es.test.ts checks those against the source)',()=>{
  const esSame=(key:string)=>Object.hasOwn(esIdentical.entries,`original:${key}`);
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key)||esSame(key)||ZH_ONLY_ORIGINALS.includes(key),key).toBe(true);}
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
 it('the CJK punctuation fixer (Simplified Chinese style) has nothing left to change: catalog, originals, maps and help sources',()=>{
  expect(Object.entries(zh).filter(([,v])=>fix(v)!==v).map(([k])=>k)).toEqual([]);
  expect(Object.entries(originals).filter(([k,v])=>fixOriginal(k,v)!==v).map(([k])=>k)).toEqual([]);
  for(const file of [...sources('maps'),...sources('help')]){const text=readFileSync(file,'utf8');expect(fixSource(text)===text,path.relative(DIR,file)).toBe(true);}
 });
 it('Front ZH1: builds GB2312\'s 6,763 hanzi from the runtime\'s GBK decoder (no download) for the out-of-set check',()=>{
  const set=chineseHanzi('zh-Hans');
  expect(set.size).toBe(6763);
  for(const c of '天文台望远镜银河星团红移探究保存观测谱')expect(set.has(c),c).toBe(true);
  for(const c of '図対駅観測譜鏡')expect(set.has(c),c).toBe(false);
  expect(chineseHanzi('zh-Hant').size).toBe(13060);
 });
 it('calibration (plan §6.2): the grapheme ratio of the shell strings to their English, printed for docs/I18N.md',()=>{
  const ratios=pairs().filter(p=>p.en.length>=12).map(p=>graphemeLength(p.text)/graphemeLength(p.en)).sort((a,b)=>a-b);
  const q=(f:number)=>ratios[Math.min(ratios.length-1,Math.floor(f*ratios.length))].toFixed(2);
  console.info(`zh-Hans grapheme ratio over ${ratios.length} strings: p10 ${q(.1)}, median ${q(.5)}, p90 ${q(.9)}`);
  expect(ratios.length).toBeGreaterThan(150);
 });
});
