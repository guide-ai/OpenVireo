import {describe,expect,it} from 'vitest';
import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import en from '../en.json';
import ru from './ru.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import pluralSites from '../plural-sites.json';
import {RUSSIAN} from './index';
import {createI18n,english,locale,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {MAP_IDS,type MapId} from '../maps';
import {languageEntry,thousandsSeparator} from '../languages';
import {pluralCategory,pluralFamilyKeys,pluralFormBase} from '../plural';
import {collectPairs} from '../lint/pairs';
import {PROFILES} from '../lint/profiles';
import {fixSourceLiterals} from '../lint/frenchSpacing';
import {countBeforeNoun,fixRussianTypography} from '../lint/russianTypography';
import {describeFindings,errorsOf,glossaryFrom,lintPairs,pluralForms,reportsOf,type Allowance,type LintData} from '../lint/rules';
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

// Front RU0 (docs/I18N.md, "Russian: plural families, the folder, lints and shell (RU0)"; plan front-i18n-ru.md §1.2, §4, §6.2): the
// structural checks of the partial Russian bundle, the Russian typography fixer as a no-op over every Russian string, every string
// through the SC4 lint framework (profile ru), counted messages in count-neutral wordings, and every plural family the catalog
// starts in all four forms. Errors fail the batch; length ratios are reported for the independent reviewer. Later RU fronts add
// their maps to ENGLISH_MAPS and COMPLETE_MAPS, and their areas to the coverage checks.
//
// Fix mode (plan §4.5): `env -u CI OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/ru/ru.test.ts` rewrites ru.json, originals.json
// and the string literals of maps/*.ts and help/*.ts with the fixer (src/i18n/lint/russianTypography.ts), writing the characters
// literally (never ` ` or ` ` escapes: scripts/check-i18n-dist.mjs reads map literals as written), then checks as usual.
// A VIREO `fragment|` original keeps its straight quotes (another piece of VIREO's text closes them).
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,
 camera:CAMERA_MESSAGES_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,nakedEye:NAKED_EYE_MESSAGES_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN};
/** The maps translated completely (RU0's shell maps; RU1's observatory maps, the camera card the observatory shows, and polish). */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','observatory','fieldInfo','fieldReadDetails','nakedEye','polish','qsoList','sound','observationMetadata','camera'];
/** Front RU1's area of en.json: FR1's and ID1's observatory keys (the instruments' prefixes and the Hubble hot-list reasons) and the
 * 104 guide keys the observatory files render (src/i18n/fr/fr.test.ts FR1_GUIDE_KEYS, read from there so the two never drift). */
const OBSERVATORY_PREFIXES=/^(sky|optical|motion|horizon|siteClock|runningClock|scopeAccess|instrumentAccess|instrumentParameters|cameraParameters|cameraInfo|cameraPrepare|palette|testMode|optionsFile|photometerTab|htl|multispec|nativeMirror|hubblePoint)\./;
const RU1_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>OBSERVATORY_PREFIXES.test(k)||/^hubbleHtl\.reason\./.test(k));
const RU1_GUIDE_KEYS=JSON.parse(`[${/const FR1_GUIDE_KEYS:readonly MessageKey\[\]=\[([^\]]*)\]/.exec(readFileSync(path.join(import.meta.dirname,'../fr/fr.test.ts'),'utf8'))![1].replace(/'/g,'"')}]`) as MessageKey[];
/** VIREO originals that Spanish keeps with no entry (its word equals VIREO's), as for Portuguese, French and Indonesian: the options
 * dialog's General tab («Общие») and the Site Information longitude letter E («В», восток). */
const RU_ONLY_ORIGINALS:readonly string[]=['General','E'];
/** RU0's area of en.json: the shell (header, menu, first steps, toolbar, errors, instructor mode, document title), as FR0's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const profile=PROFILES.ru;
const data:LintData={glossary:glossaryFrom(glossaryJson,'ru'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const catalog=ru as Readonly<Record<string,string>>;
const pairs=()=>collectPairs({catalog:Object.fromEntries(Object.entries(catalog).filter(([k])=>Object.hasOwn(en,k))),english:en,maps:RUSSIAN.maps,englishMaps:ENGLISH_MAPS,originals});
/** Plural forms en.json lacks, paired with their base's English for the lint. */
const formPairs=()=>Object.entries(catalog).filter(([k])=>!Object.hasOwn(en,k)).map(([k,text])=>({id:`catalog:${k}`,en:(en as Record<string,string>)[pluralFormBase(k,en,'ru')!],text}));
const DIR=import.meta.dirname;
const sources=(sub:string)=>existsSync(path.join(DIR,sub))?readdirSync(path.join(DIR,sub)).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(DIR,sub,f)):[];
const fixOriginal=(key:string,text:string)=>fixRussianTypography(text,{quotes:!key.startsWith('fragment|')});
const fixSource=(source:string)=>fixSourceLiterals(source,(text,options)=>fixRussianTypography(text,options));
const writeJson=(file:string,value:unknown)=>writeFileSync(path.join(DIR,file),JSON.stringify(value,null,1)+'\n');
/** The heads of the plural key families (src/i18n/plural-sites.json) and every key Russian needs for each. */
const FAMILIES=[...new Set(pluralSites.pluralKeyFamilies.map(f=>f.split(' ')[0]))];

if(process.env.OPENVIREO_FIX_TYPOGRAPHY==='1'){
 // Refused in CI, as OPENVIREO_REFRESH_PINS is (src/i18n/sourceScan.ts): CI must check, never rewrite.
 if(process.env.CI)throw new Error('OPENVIREO_FIX_TYPOGRAPHY=1 is refused in CI: run the fixer locally and commit the reviewed diff');
 const own=JSON.parse(readFileSync(path.join(DIR,'ru.json'),'utf8')) as Record<string,string>;
 writeJson('ru.json',Object.fromEntries(Object.entries(own).map(([k,v])=>[k,fixRussianTypography(v)])));
 const vireo=JSON.parse(readFileSync(path.join(DIR,'originals.json'),'utf8')) as Record<string,string>;
 writeJson('originals.json',Object.fromEntries(Object.entries(vireo).map(([k,v])=>[k,fixOriginal(k,v)])));
 for(const file of [...sources('maps'),...sources('help')]){const before=readFileSync(file,'utf8'),after=fixSource(before);if(after!==before)writeFileSync(file,after);}
}

describe('Front RU0: the Russian (ru) bundle',()=>{
 it('is registered before its release: a ?lang=ru preview only, never detected or offered; thousands with U+202F from the start',()=>{
  expect(languageEntry('ru')).toMatchObject({dir:'ru',catalog:'ru.json',budgetFactor:1.2,htmlLang:'ru',pagePath:'ru',autonym:'Русский',englishName:'Russian',match:['ru'],released:false,thousands:' '});
  expect(languageEntry('ru')?.help).toBeUndefined();
  expect(RUSSIAN.language).toBe('ru');
  for(const notice of Object.values(languageEntry('ru')!.notices)){expect(fixRussianTypography(notice)).toBe(notice);expect(notice).toMatch(/ещё/);}
 });
 it('the catalog is a valid partial catalog (en.json keys or plural forms of them, the same {params}) and covers the shell and the welcome',()=>{
  expect(()=>createI18n(catalog as Partial<Record<MessageKey,string>>,'ru',{fallback:true})).not.toThrow();
  for(const key of Object.keys(catalog))expect(Object.hasOwn(en,key)||pluralFormBase(key,en,'ru')!==null,key).toBe(true);
  expect(SHELL_KEYS.length).toBe(131);
  expect(SHELL_KEYS.filter(k=>!Object.hasOwn(catalog,k))).toEqual([]);
  const home=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
  expect(home.length).toBe(27);expect(home.filter(k=>!Object.hasOwn(catalog,k))).toEqual([]);
 });
 it('Front RU1: the catalog covers the observatory (every key of its instruments\' prefixes) and the guide keys it renders',()=>{
  expect(RU1_KEYS.length).toBeGreaterThan(450);
  expect(RU1_KEYS.filter(k=>!Object.hasOwn(catalog,k))).toEqual([]);
  expect(RU1_GUIDE_KEYS.length).toBe(104);
  expect(RU1_GUIDE_KEYS.filter(k=>!Object.hasOwn(en,k)||!Object.hasOwn(catalog,k))).toEqual([]);
 });
 it('Front RU1: every VIREO original is translated at once, or kept with an identical.json reason, never both',()=>{
  const english=[...Object.keys(esOriginals),...Object.keys(esIdentical.entries).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length))];
  expect(new Set(english).size).toBe(760);english.push(...RU_ONLY_ORIGINALS);
  const same=identical.entries as Record<string,string>,kept=Object.keys(same).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length));
  expect(english.filter(k=>!Object.hasOwn(originals,k)&&!Object.hasOwn(same,`original:${k}`))).toEqual([]);
  for(const k of kept){expect(english,k).toContain(k);expect(Object.hasOwn(originals,k),k).toBe(false);}
  expect((originals as Record<string,string>).E).toBe('В');expect((originals as Record<string,string>).W).toBe('З');
 });
 it('every map has its English shape: the shell and observatory maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(RUSSIAN.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(RUSSIAN.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also knows (src/i18n/es/es.test.ts checks those against the source)',()=>{
  const esSame=(key:string)=>Object.hasOwn(esIdentical.entries,`original:${key}`);
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key)||esSame(key)||RU_ONLY_ORIGINALS.includes(key),key).toBe(true);}
 });
 it('the typography fixer has nothing left to change: catalog, originals, maps and help sources',()=>{
  expect(Object.entries(catalog).filter(([,v])=>fixRussianTypography(v)!==v).map(([k])=>k)).toEqual([]);
  expect(Object.entries(originals).filter(([k,v])=>fixOriginal(k,v)!==v).map(([k])=>k)).toEqual([]);
  for(const file of [...sources('maps'),...sources('help')]){const text=readFileSync(file,'utf8');expect(fixSource(text)===text,path.relative(DIR,file)).toBe(true);
   // Characters, never escapes (PT-REL: an escaped U+202F cost a core marker in scripts/check-i18n-dist.mjs).
   expect(text,path.relative(DIR,file)).not.toMatch(/\\u(?:202[fF]|00[aA]0)/);}
 });
 it('formats numbers with U+202F between thousands and the decimal point, English unchanged; plurals follow CLDR',()=>{
  const sep=thousandsSeparator('ru');expect(sep).toBe(' ');
  const i18n=createI18n(catalog as Partial<Record<MessageKey,string>>,'ru',{fallback:true,numberLocale:locale,thousands:sep});
  expect([24000,50000,2400000,999,1234.5,-31147].map(v=>i18n.formatNumber(v))).toEqual(['24 000','50 000','2 400 000','999','1 234.5','-31 147']);
  expect(i18n.formatNumber(24000,{useGrouping:false})).toBe('24000');expect(i18n.formatNumber(0.25,{style:'percent'})).toBe('25%');
  expect(english.formatNumber(24000)).toBe('24,000');
  expect([1,21,2,4,22,0,5,11,25,1.5].map(n=>pluralCategory('ru',n))).toEqual(['one','one','few','few','few','many','many','many','many','other']);
 });
 it('passes every rule of the ru profile with the glossary, identical.json and lint-allowed.json',()=>{
  const findings=lintPairs([...pairs(),...formPairs()],profile,data);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  const reports=reportsOf(findings);
  if(reports.length)console.info(`ru reports for the reviewer (not failures):\n${describeFindings(reports).join('\n')}`);
 });
 it('plan §1.2 #2: a counted message never puts a noun right after its count (a count-neutral wording or a plural family)',()=>{
  const families=new Set(FAMILIES.flatMap(h=>pluralFamilyKeys(h,en,'ru')));
  const counted=pluralSites.countedMessages.filter(k=>!families.has(k)&&Object.hasOwn(catalog,k));
  expect(counted.map(k=>[k,countBeforeNoun(catalog[k]!)]).filter(([,nouns])=>nouns.length)).toEqual([]);
 });
 it('plan §1.2 #1: a plural family the catalog starts has all four Russian forms, at every axis',()=>{
  const wanted=FAMILIES.flatMap(h=>{const keys=pluralFamilyKeys(h,en,'ru');return keys.some(k=>Object.hasOwn(catalog,k))?keys:[];});
  expect(wanted.filter(k=>!Object.hasOwn(catalog,k))).toEqual([]);
  // The same through the lint's pluralForms: each axis as a `*` key.
  const axes=[...new Set(wanted.map(k=>k.replace(/\.(?:one|few|many|other)(?=\.|$)/,'.*')))];
  expect(describeFindings(pluralForms(catalog,axes,profile))).toEqual([]);
 });
});
