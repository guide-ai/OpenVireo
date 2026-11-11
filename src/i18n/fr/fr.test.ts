import {describe,expect,it} from 'vitest';
import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import en from '../en.json';
import fr from './fr.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import {FRENCH} from './index';
import {createI18n,english,locale,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {MAP_IDS,type MapId} from '../maps';
import {languageEntry,thousandsSeparator} from '../languages';
import {pluralCategory} from '../plural';
import {collectPairs} from '../lint/pairs';
import {PROFILES} from '../lint/profiles';
import {fixFrenchTypography,fixSourceLiterals} from '../lint/frenchSpacing';
import {describeFindings,errorsOf,glossaryFrom,lintPairs,reportsOf,type Allowance,type LintData} from '../lint/rules';
import {APP_SHELL_MESSAGES_EN} from '../../components/AppShellMessages';
import {HELP_MENU_EN} from '../../help/HelpMessages';
import {LANGUAGE_CHOICE_EN} from '../../components/LanguageChoiceMessages';
import {OBJECT_X_LAB_EN} from '../../objectx/ObjectXMessages';
import {POLISH_MESSAGES_EN} from '../../polish/PolishMessages';
import {PROJECT_LINKS_EN} from '../../help/projectLinks';
import {TOUR_EN} from '../../help/tour';
import {VARIABLE_STARS_EN} from '../../variables/VariableStarMessages';

// Front FR0 (docs/I18N.md, "French: the folder, lints and shell (FR0)"; plan front-i18n-fr.md §4, §6.2): the structural checks of
// the partial French bundle, the French typography fixer as a no-op over every French string, and every string through the SC4
// lint framework, profile fr. Errors fail the batch; length ratios are reported for the independent reviewer. Later FR fronts add
// their maps to ENGLISH_MAPS and COMPLETE_MAPS, and their areas to the coverage check.
//
// Fix mode (plan §4.5): `OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/fr/fr.test.ts` rewrites fr.json, originals.json, the
// string literals of maps/*.ts and help/*.ts with the fixer (src/i18n/lint/frenchSpacing.ts), writing the characters literally
// (never ` ` or `’` escapes: scripts/check-i18n-dist.mjs reads map literals as written), then checks as usual. A VIREO
// `fragment|` original keeps its straight quotes (another piece of VIREO's text closes them).
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN};
/** The maps translated completely; the others are partial until their front (objectXLab FR6, polish FR1, variableStars FR4). */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour'];
/** FR0's area of en.json: the shell (header, menu, home and first steps, toolbar, errors, instructor mode, document title), as PT0's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const profile=PROFILES.fr;
const data:LintData={glossary:glossaryFrom(glossaryJson,'fr'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:fr,english:en,maps:FRENCH.maps,englishMaps:ENGLISH_MAPS,originals});
const DIR=import.meta.dirname;
const sources=(sub:string)=>existsSync(path.join(DIR,sub))?readdirSync(path.join(DIR,sub)).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(DIR,sub,f)):[];
const fixOriginal=(key:string,text:string)=>fixFrenchTypography(text,{quotes:!key.startsWith('fragment|')});
const fixSource=(source:string)=>fixSourceLiterals(source,(text,options)=>fixFrenchTypography(text,options));
const writeJson=(file:string,value:unknown)=>writeFileSync(path.join(DIR,file),JSON.stringify(value,null,1)+'\n');

if(process.env.OPENVIREO_FIX_TYPOGRAPHY==='1'){
 const catalog=JSON.parse(readFileSync(path.join(DIR,'fr.json'),'utf8')) as Record<string,string>;
 writeJson('fr.json',Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,fixFrenchTypography(v)])));
 const own=JSON.parse(readFileSync(path.join(DIR,'originals.json'),'utf8')) as Record<string,string>;
 writeJson('originals.json',Object.fromEntries(Object.entries(own).map(([k,v])=>[k,fixOriginal(k,v)])));
 for(const file of [...sources('maps'),...sources('help')]){const before=readFileSync(file,'utf8'),after=fixSource(before);if(after!==before)writeFileSync(file,after);}
}

describe('Front FR0: the French (fr) bundle',()=>{
 it('is registered before its release: a ?lang=fr preview only, never detected or offered; thousands with U+202F from the start',()=>{
  expect(languageEntry('fr')).toMatchObject({dir:'fr',catalog:'fr.json',htmlLang:'fr',pagePath:'fr',autonym:'Français',englishName:'French',match:['fr'],released:false,thousands:' '});
  expect(languageEntry('fr')?.help).toBeUndefined();
  expect(FRENCH.language).toBe('fr');
  // The notices hold U+202F before «;» as a character, and the typographic apostrophe.
  for(const notice of Object.values(languageEntry('fr')!.notices))expect(fixFrenchTypography(notice)).toBe(notice);
 });
 it('the catalog is a valid partial catalog (en.json keys, the same {params}) and covers the whole shell',()=>{
  expect(()=>createI18n(fr as Partial<Record<MessageKey,string>>,'fr',{fallback:true})).not.toThrow();
  for(const key of Object.keys(fr))expect(Object.hasOwn(en,key),key).toBe(true);
  expect(SHELL_KEYS.length).toBe(130);
  expect(SHELL_KEYS.filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
 });
 it('every map has its English shape: the shell maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(FRENCH.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(FRENCH.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also translates (src/i18n/es/es.test.ts checks those against the source)',()=>{
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key),key).toBe(true);}
 });
 it('the typography fixer has nothing left to change: catalog, originals, maps and help sources',()=>{
  expect(Object.entries(fr).filter(([,v])=>fixFrenchTypography(v)!==v).map(([k])=>k)).toEqual([]);
  expect(Object.entries(originals).filter(([k,v])=>fixOriginal(k,v)!==v).map(([k])=>k)).toEqual([]);
  for(const file of [...sources('maps'),...sources('help')]){const text=readFileSync(file,'utf8');expect(fixSource(text)===text,path.relative(DIR,file)).toBe(true);
   // Characters, never escapes (PT-REL: an escaped U+202F cost a core marker in scripts/check-i18n-dist.mjs).
   expect(text,path.relative(DIR,file)).not.toMatch(/\\u(?:202[fF]|2019|00[aA]0)/);}
 });
 it('formats numbers with U+202F between thousands and the decimal point, English unchanged; plurals follow CLDR',()=>{
  const sep=thousandsSeparator('fr');expect(sep).toBe(' ');
  const frI18n=createI18n(fr as Partial<Record<MessageKey,string>>,'fr',{fallback:true,numberLocale:locale,thousands:sep});
  expect([24000,50000,2400000,999,1234.5,-31147].map(v=>frI18n.formatNumber(v))).toEqual(['24 000','50 000','2 400 000','999','1 234.5','-31 147']);
  expect(frI18n.formatNumber(24000,{useGrouping:false})).toBe('24000');expect(frI18n.formatNumber(0.25,{style:'percent'})).toBe('25%');
  expect(english.formatNumber(24000)).toBe('24,000');
  // Plan §1.1: 0 and 1.5 are `one` in French («0 étoile», «1.5 heure»), exact millions `many`; no English override as for pt.
  expect([0,1,1.5,2,1000000,1000001].map(n=>pluralCategory('fr',n))).toEqual(['one','one','one','other','many','other']);
 });
 it('passes every rule of the fr profile with the glossary, identical.json and lint-allowed.json',()=>{
  const findings=lintPairs(pairs(),profile,data);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  const reports=reportsOf(findings);
  if(reports.length)console.info(`fr reports for the reviewer (not failures):\n${describeFindings(reports).join('\n')}`);
 });
});
