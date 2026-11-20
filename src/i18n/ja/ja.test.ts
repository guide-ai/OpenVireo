import {describe,expect,it} from 'vitest';
import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import en from '../en.json';
import ja from './ja.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import {JAPANESE} from './index';
import {createI18n,english,locale,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {MAP_IDS,type MapId} from '../maps';
import {languageEntry,thousandsSeparator} from '../languages';
import {pluralCategory} from '../plural';
import {collectPairs} from '../lint/pairs';
import {PROFILES} from '../lint/profiles';
import {fixSourceLiterals} from '../lint/frenchSpacing';
import {fixCjkPunctuation,JAPANESE_STYLE} from '../lint/cjkPunctuation';
import {japaneseKanji} from '../lint/japanese';
import {describeFindings,errorsOf,glossaryFrom,lintPairs,reportsOf,type Allowance,type LintData} from '../lint/rules';
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
import esIdentical from '../es/identical.json';

// Front JA0 (docs/I18N.md, "Japanese: the folder, lints and shell (JA0)"; plan front-i18n-ja.md §1.2, §6.2): the structural checks
// of the partial Japanese bundle, the CJK punctuation fixer as a no-op over every Japanese string, and every string through the SC4
// lint framework, profile ja (です/ます, the Japanese style rules of src/i18n/lint/japanese.ts, Han characters Japanese encodes).
// Errors fail the batch; length ratios are reported for the independent reviewer. Later JA fronts add their maps to ENGLISH_MAPS and
// COMPLETE_MAPS, and their areas to the coverage checks.
//
// Fix mode (plan §4.5): `env -u CI OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/ja/ja.test.ts` rewrites ja.json,
// originals.json, the string literals of maps/*.ts and help/*.ts with the fixer (src/i18n/lint/cjkPunctuation.ts), writing the
// characters literally, then checks as usual. A VIREO `fragment|` original keeps its straight quotes (another piece closes them).
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,
 camera:CAMERA_MESSAGES_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,nakedEye:NAKED_EYE_MESSAGES_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN};
/** The maps translated completely (JA0's shell maps; JA1's observatory maps, the camera card the observatory shows, and polish); the
 * others hold only their header-menu names until their front (variableStars JA4, objectXLab JA6). */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','observatory','fieldInfo','fieldReadDetails','nakedEye','polish','qsoList','sound','observationMetadata','camera'];
/** Front JA1's area of en.json: FR1's observatory keys (the instruments' prefixes and the Hubble hot-list reasons) and the 104 guide
 * keys the observatory files render (src/i18n/fr/fr.test.ts FR1_GUIDE_KEYS, read from there so the two never drift), as RU1's. */
const OBSERVATORY_PREFIXES=/^(sky|optical|motion|horizon|siteClock|runningClock|scopeAccess|instrumentAccess|instrumentParameters|cameraParameters|cameraInfo|cameraPrepare|palette|testMode|optionsFile|photometerTab|htl|multispec|nativeMirror|hubblePoint)\./;
const JA1_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>OBSERVATORY_PREFIXES.test(k)||/^hubbleHtl\.reason\./.test(k));
const JA1_GUIDE_KEYS=JSON.parse(`[${/const FR1_GUIDE_KEYS:readonly MessageKey\[\]=\[([^\]]*)\]/.exec(readFileSync(path.join(import.meta.dirname,'../fr/fr.test.ts'),'utf8'))![1].replace(/'/g,'"')}]`) as MessageKey[];
/** VIREO originals that Spanish keeps with no entry, as for Hindi: the options dialog's General tab («全般») and the Site Information
 * compass letters E «東», N «北» and S «南» (W «西» is in Spanish's list). */
const JA_ONLY_ORIGINALS:readonly string[]=['General','E','N','S'];
/** JA0's area of en.json: the shell (header, menu, home and first steps, toolbar, errors, instructor mode, document title), as FR0's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
/** The welcome page (Front HOME, after FR0), which JA0 translates with the shell. */
const HOME_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
const profile=PROFILES.ja;
const data:LintData={glossary:glossaryFrom(glossaryJson,'ja'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:ja,english:en,maps:JAPANESE.maps,englishMaps:ENGLISH_MAPS,originals});
const DIR=import.meta.dirname;
const sources=(sub:string)=>existsSync(path.join(DIR,sub))?readdirSync(path.join(DIR,sub)).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(DIR,sub,f)):[];
const fix=(text:string,options?:{quotes?:boolean;valueMarks?:RegExp})=>fixCjkPunctuation(text,JAPANESE_STYLE,options);
/** VIREO originals whose ASCII bracket VIREO itself closes after a value (`Object: (` + number + `) `): the fixer leaves them. */
const ASCII_BRACKET_PIECES:readonly string[]=['Object: ('];
const fixOriginal=(key:string,text:string)=>ASCII_BRACKET_PIECES.includes(key)?text:fix(text,{quotes:!key.startsWith('fragment|')});
const fixSource=(source:string)=>fixSourceLiterals(source,(text,options)=>fix(text,options));
const writeJson=(file:string,value:unknown)=>writeFileSync(path.join(DIR,file),JSON.stringify(value,null,1)+'\n');

if(process.env.OPENVIREO_FIX_TYPOGRAPHY==='1'){
 // As FR0: refused in CI (CI must check, never rewrite).
 if(process.env.CI)throw new Error('OPENVIREO_FIX_TYPOGRAPHY=1 is refused in CI: run the fixer locally and commit the reviewed diff');
 const catalog=JSON.parse(readFileSync(path.join(DIR,'ja.json'),'utf8')) as Record<string,string>;
 writeJson('ja.json',Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,fix(v)])));
 const own=JSON.parse(readFileSync(path.join(DIR,'originals.json'),'utf8')) as Record<string,string>;
 writeJson('originals.json',Object.fromEntries(Object.entries(own).map(([k,v])=>[k,fixOriginal(k,v)])));
 for(const file of [...sources('maps'),...sources('help')]){const before=readFileSync(file,'utf8'),after=fixSource(before);if(after!==before)writeFileSync(file,after);}
}

describe('Front JA0: the Japanese (ja) bundle',()=>{
 it('is registered before its release: a ?lang=ja preview only, never detected or offered; no thousands field (24,000 as English)',()=>{
  expect(languageEntry('ja')).toMatchObject({dir:'ja',catalog:'ja.json',htmlLang:'ja',pagePath:'ja',autonym:'日本語',englishName:'Japanese',match:['ja'],released:false});
  expect(languageEntry('ja')?.thousands).toBeUndefined();expect(languageEntry('ja')?.help).toBeUndefined();
  expect(JAPANESE.language).toBe('ja');
  for(const notice of Object.values(languageEntry('ja')!.notices))expect(fix(notice)).toBe(notice);
 });
 it('the catalog is a valid partial catalog (en.json keys, the same {params}) and covers the whole shell and the welcome page',()=>{
  expect(()=>createI18n(ja as Partial<Record<MessageKey,string>>,'ja',{fallback:true})).not.toThrow();
  for(const key of Object.keys(ja))expect(Object.hasOwn(en,key),key).toBe(true);
  expect(SHELL_KEYS.length).toBe(131);// 131 since Front HI0 (app.digitNotice, the shared digit notice)
  expect(HOME_KEYS.length).toBe(27);
  expect([...SHELL_KEYS,...HOME_KEYS].filter(k=>!Object.hasOwn(ja,k))).toEqual([]);
 });
 it('Front JA1: the catalog covers the observatory (every key of its instruments\' prefixes) and the guide keys it renders',()=>{
  expect(JA1_KEYS.length).toBeGreaterThan(450);
  expect(JA1_KEYS.filter(k=>!Object.hasOwn(ja,k))).toEqual([]);
  expect(JA1_GUIDE_KEYS.length).toBe(104);
  expect(JA1_GUIDE_KEYS.filter(k=>!Object.hasOwn(en,k)||!Object.hasOwn(ja,k))).toEqual([]);
 });
 it('Front JA1: every VIREO original is translated at once, or kept with an identical.json reason, never both',()=>{
  const english=[...Object.keys(esOriginals),...Object.keys(esIdentical.entries).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length))];
  expect(new Set(english).size).toBe(760);english.push(...JA_ONLY_ORIGINALS);
  const same=identical.entries as Record<string,string>,kept=Object.keys(same).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length));
  expect(english.filter(k=>!Object.hasOwn(originals,k)&&!Object.hasOwn(same,`original:${k}`))).toEqual([]);
  for(const k of kept){expect(english,k).toContain(k);expect(Object.hasOwn(originals,k),k).toBe(false);}
  const own=originals as Record<string,string>;
  expect([own.N,own.S,own.E,own.W,own.General]).toEqual(['北','南','東','西','全般']);
 });
 it('Front JA1: a VIREO original keeps its line breaks, and a `fragment|` piece has no edge space (Japanese joins a value with no space)',()=>{
  const own=originals as Record<string,string>,breaks=(v:string)=>(v.match(/\r\n/g)??[]).length;
  expect(Object.keys(own).filter(k=>breaks(own[k])!==breaks(k.replace(/^fragment\|/,'')))).toEqual([]);
  const fragments=Object.keys(own).filter(k=>k.startsWith('fragment|'));
  expect(fragments.length).toBeGreaterThan(10);
  expect(fragments.filter(k=>/^\s|\s$/.test(own[k]))).toEqual([]);
 });
 it('every map has its English shape: the shell and observatory maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(JAPANESE.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(JAPANESE.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also knows (src/i18n/es/es.test.ts checks those against the source)',()=>{
  const esSame=(key:string)=>Object.hasOwn(esIdentical.entries,`original:${key}`);
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key)||esSame(key)||JA_ONLY_ORIGINALS.includes(key),key).toBe(true);}
 });
 it('the CJK punctuation fixer has nothing left to change: catalog, originals, maps and help sources (characters, never escapes)',()=>{
  expect(Object.entries(ja).filter(([,v])=>fix(v)!==v).map(([k])=>k)).toEqual([]);
  expect(Object.entries(originals).filter(([k,v])=>fixOriginal(k,v)!==v).map(([k])=>k)).toEqual([]);
  for(const file of [...sources('maps'),...sources('help')]){const text=readFileSync(file,'utf8');expect(fixSource(text)===text,path.relative(DIR,file)).toBe(true);
   expect(text,path.relative(DIR,file)).not.toMatch(/\\u[0-9a-fA-F]{4}/);}
 });
 it('formats numbers as English does (24,000 and 1.5: what Japanese writes natively); one plural category',()=>{
  expect(thousandsSeparator('ja')).toBeUndefined();
  const jaI18n=createI18n(ja as Partial<Record<MessageKey,string>>,'ja',{fallback:true,numberLocale:locale});
  expect([24000,1234.5,-31147].map(v=>jaI18n.formatNumber(v))).toEqual(['24,000','1,234.5','-31,147']);
  expect(english.formatNumber(24000)).toBe('24,000');
  expect([0,1,1.5,2,1000000].map(n=>pluralCategory('ja',n))).toEqual(['other','other','other','other','other']);
 });
 it('builds the set of Han characters Japanese encodes from the runtime\'s Shift_JIS decoder (no download)',()=>{
  const set=japaneseKanji();
  expect(set.size).toBeGreaterThan(6300);expect(set.size).toBeLessThan(7000);
  for(const c of '天文台望遠鏡銀河星団赤方偏移調査保存据々髙')expect(set.has(c),c).toBe(true);
  for(const c of '图设显时间选键观测谱')expect(set.has(c),c).toBe(false);
 });
 it('passes every rule of the ja profile with the glossary, identical.json and lint-allowed.json',()=>{
  const findings=lintPairs(pairs(),profile,data);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  const reports=reportsOf(findings);
  if(reports.length)console.info(`ja reports for the reviewer (not failures):\n${describeFindings(reports).join('\n')}`);
 });
});
