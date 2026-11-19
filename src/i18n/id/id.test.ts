import {describe,expect,it} from 'vitest';
import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import en from '../en.json';
import idCatalog from './id.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import {INDONESIAN} from './index';
import {createI18n,english,locale,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {MAP_IDS,type MapId} from '../maps';
import {languageEntry,thousandsSeparator} from '../languages';
import {pluralCategories,pluralCategory} from '../plural';
import {collectPairs} from '../lint/pairs';
import {PROFILES} from '../lint/profiles';
import {fixIndonesianSource,fixIndonesianTypography} from '../lint/indonesianTypography';
import {fixSourceLiterals} from '../lint/frenchSpacing';
import {describeFindings,errorsOf,glossaryFrom,lintPairs,reportsOf,type Allowance,type LintData} from '../lint/rules';
import {APP_SHELL_MESSAGES_EN} from '../../components/AppShellMessages';
import {HELP_MENU_EN} from '../../help/HelpMessages';
import {LANGUAGE_CHOICE_EN} from '../../components/LanguageChoiceMessages';
import {OBJECT_X_LAB_EN} from '../../objectx/ObjectXMessages';
import {POLISH_MESSAGES_EN} from '../../polish/PolishMessages';
import {PROJECT_LINKS_EN} from '../../help/projectLinks';
import {TOUR_EN} from '../../help/tour';
import {VARIABLE_STARS_EN} from '../../variables/VariableStarMessages';

// Front ID0 (docs/I18N.md, "Indonesian: the folder, lints and shell (ID0)"; plan front-i18n-id.md §4, §6.2): the structural checks
// of the partial Indonesian bundle, the Indonesian typography fixer as a no-op over every Indonesian string, and every string through
// the SC4 lint framework, profile id. Errors fail the batch; length ratios are reported for the independent reviewer. Later ID fronts
// add their maps to ENGLISH_MAPS and COMPLETE_MAPS, and their areas to the coverage checks.
//
// Fix mode (plan §4.5): `env -u CI OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/id/id.test.ts` rewrites id.json,
// originals.json and the string literals of maps/*.ts and help/*.ts with the fixer (src/i18n/lint/indonesianTypography.ts: straight
// quotes to “ ”, thousands to U+202F), writing the characters literally (never `\u202f` escapes: scripts/check-i18n-dist.mjs reads
// map literals as written), then checks as usual; run it once more without the variable (the imports were read before the rewrite).
// A VIREO `fragment|` original keeps its straight quotes (another piece of VIREO's text closes them).
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN};
/** The maps translated completely; the others are partial until their front (objectXLab ID6, polish ID1, variableStars ID4). */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour'];
/** ID0's area of en.json: the shell (header, menu, home and first steps, toolbar, errors, instructor mode, document title), as FR0's,
 * and the welcome's home.* keys (plan §6.1: Front HOME added them after FR0, and FR1 translated them). */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const HOME_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
const profile=PROFILES.id;
const data:LintData={glossary:glossaryFrom(glossaryJson,'id'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:idCatalog,english:en,maps:INDONESIAN.maps,englishMaps:ENGLISH_MAPS,originals});
const DIR=import.meta.dirname;
const sources=(sub:string)=>existsSync(path.join(DIR,sub))?readdirSync(path.join(DIR,sub)).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(DIR,sub,f)):[];
const fixOriginal=(key:string,text:string)=>fixIndonesianTypography(text,{quotes:!key.startsWith('fragment|')});
/** Help sources keep VIREO's straight quotes (plan §4.6: Indonesian help is Latin-1, which has no “ ”): thousands only. */
const fixHelp=(source:string)=>fixSourceLiterals(source,text=>fixIndonesianTypography(text,{quotes:false}));
const fixFile=(file:string,source:string)=>file.includes(`${path.sep}help${path.sep}`)?fixHelp(source):fixIndonesianSource(source);
const writeJson=(file:string,value:unknown)=>writeFileSync(path.join(DIR,file),JSON.stringify(value,null,1)+'\n');

if(process.env.OPENVIREO_FIX_TYPOGRAPHY==='1'){
 // Refused in CI, as OPENVIREO_REFRESH_PINS is (src/i18n/sourceScan.ts): CI must check, never rewrite.
 if(process.env.CI)throw new Error('OPENVIREO_FIX_TYPOGRAPHY=1 is refused in CI: run the fixer locally and commit the reviewed diff');
 const catalog=JSON.parse(readFileSync(path.join(DIR,'id.json'),'utf8')) as Record<string,string>;
 writeJson('id.json',Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,fixIndonesianTypography(v)])));
 const own=JSON.parse(readFileSync(path.join(DIR,'originals.json'),'utf8')) as Record<string,string>;
 writeJson('originals.json',Object.fromEntries(Object.entries(own).map(([k,v])=>[k,fixOriginal(k,v)])));
 for(const file of [...sources('maps'),...sources('help')]){const before=readFileSync(file,'utf8'),after=fixFile(file,before);if(after!==before)writeFileSync(file,after);}
}

describe('Front ID0: the Indonesian (id) bundle',()=>{
 it('is registered before its release: a ?lang=id preview only, never detected or offered; thousands with U+202F from the start',()=>{
  expect(languageEntry('id')).toMatchObject({dir:'id',catalog:'id.json',htmlLang:'id',pagePath:'id',autonym:'Bahasa Indonesia',englishName:'Indonesian',match:['id','in'],released:false,thousands:'\u202f'});
  expect(languageEntry('id')?.help).toBeUndefined();
  expect(INDONESIAN.language).toBe('id');
  // The notices are plain ASCII Indonesian the fixer leaves alone.
  for(const notice of Object.values(languageEntry('id')!.notices)){expect(fixIndonesianTypography(notice)).toBe(notice);expect(notice).toMatch(/^[\x20-\x7e]+$/);}
 });
 it('the catalog is a valid partial catalog (en.json keys, the same {params}) and covers the whole shell and the welcome',()=>{
  expect(()=>createI18n(idCatalog as Partial<Record<MessageKey,string>>,'id',{fallback:true})).not.toThrow();
  for(const key of Object.keys(idCatalog))expect(Object.hasOwn(en,key),key).toBe(true);
  expect(SHELL_KEYS.length).toBe(131);expect(HOME_KEYS.length).toBe(27);// 131 since Front HI0 (app.digitNotice, the digit notice)
  expect([...SHELL_KEYS,...HOME_KEYS].filter(k=>!Object.hasOwn(idCatalog,k))).toEqual([]);
 });
 it('every map has its English shape: the shell maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(INDONESIAN.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(INDONESIAN.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also translates (src/i18n/es/es.test.ts checks those against the source)',()=>{
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key),key).toBe(true);}
 });
 it('the typography fixer has nothing left to change: catalog, originals, maps and help sources',()=>{
  expect(Object.entries(idCatalog).filter(([,v])=>fixIndonesianTypography(v)!==v).map(([k])=>k)).toEqual([]);
  expect(Object.entries(originals).filter(([k,v])=>fixOriginal(k,v)!==v).map(([k])=>k)).toEqual([]);
  for(const file of [...sources('maps'),...sources('help')]){const text=readFileSync(file,'utf8');expect(fixFile(file,text)===text,path.relative(DIR,file)).toBe(true);
   // Characters, never escapes (PT-REL: an escaped U+202F cost a core marker in scripts/check-i18n-dist.mjs).
   expect(text,path.relative(DIR,file)).not.toMatch(/\\u(?:202[fF]|201[cdCD89]|00[aA]0)/);}
 });
 it('formats numbers with U+202F between thousands and the decimal point, English unchanged; every count takes the one form `other`',()=>{
  const sep=thousandsSeparator('id');expect(sep).toBe('\u202f');
  const idI18n=createI18n(idCatalog as Partial<Record<MessageKey,string>>,'id',{fallback:true,numberLocale:locale,thousands:sep});
  expect([24000,50000,2400000,999,1234.5,-31147,31147].map(v=>idI18n.formatNumber(v))).toEqual(['24\u202f000','50\u202f000','2\u202f400\u202f000','999','1\u202f234.5','-31\u202f147','31\u202f147']);
  expect(idI18n.formatNumber(24000,{useGrouping:false})).toBe('24000');expect(idI18n.formatNumber(0.25,{style:'percent'})).toBe('25%');
  expect(english.formatNumber(24000)).toBe('24,000');
  // Plan §1.1: CLDR Indonesian has only `other` («1 bintang», «3 bintang»), like Japanese and Chinese; no English override as for pt.
  expect(pluralCategories('id')).toEqual(['other']);
  expect([0,1,1.5,2,1000000].map(n=>pluralCategory('id',n))).toEqual(['other','other','other','other','other']);
 });
 it('passes every rule of the id profile with the glossary, identical.json and lint-allowed.json',()=>{
  const findings=lintPairs(pairs(),profile,data);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  const reports=reportsOf(findings);
  if(reports.length)console.info(`id reports for the reviewer (not failures):\n${describeFindings(reports).join('\n')}`);
 });
});
