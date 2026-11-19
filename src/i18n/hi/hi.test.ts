import {describe,expect,it} from 'vitest';
import en from '../en.json';
import hi from './hi.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import esIdentical from '../es/identical.json';
import {HINDI} from './index';
import {createI18n,english,locale,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {MAP_IDS,type MapId} from '../maps';
import {languageEntry,thousandsSeparator} from '../languages';
import {pluralCategory} from '../plural';
import {collectPairs} from '../lint/pairs';
import {PROFILES} from '../lint/profiles';
import {describeFindings,errorsOf,glossaryFrom,lintPairs,reportsOf,type Allowance,type LintData} from '../lint/rules';
import {APP_SHELL_MESSAGES_EN} from '../../components/AppShellMessages';
import {HELP_MENU_EN} from '../../help/HelpMessages';
import {LANGUAGE_CHOICE_EN} from '../../components/LanguageChoiceMessages';
import {OBJECT_X_LAB_EN} from '../../objectx/ObjectXMessages';
import {POLISH_MESSAGES_EN} from '../../polish/PolishMessages';
import {PROJECT_LINKS_EN} from '../../help/projectLinks';
import {TOUR_EN} from '../../help/tour';
import {VARIABLE_STARS_EN} from '../../variables/VariableStarMessages';

// Front HI0 (docs/I18N.md, "Hindi: the folder, the digit notice and the shell (HI0)"; plan front-i18n-hi.md §4, §6.2): the
// structural checks of the partial Hindi bundle and every Hindi string through the SC4 lint framework, profile hi. Errors fail the
// batch; length ratios are reported for the independent reviewer. Later HI fronts add their maps to ENGLISH_MAPS and COMPLETE_MAPS,
// and their areas to the coverage checks.
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN};
/** The maps translated completely: HI0's shell maps. */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour'];
/** HI0's area of en.json: the shell (header, menu, first steps, toolbar, errors, instructor mode, document title), as FR0's and
 * PT0's, and the welcome's home.* keys (Front HOME, after FR0). */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const HOME_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
/** The shell's footer (Front LAUNCH-2, after FR0): observatory-prefixed keys that every page shows. */
const FOOTER_KEYS:readonly MessageKey[]=['sky.attribution','sky.labsLink','sky.aboutPrivacy'];
const profile=PROFILES.hi;
const data:LintData={glossary:glossaryFrom(glossaryJson,'hi'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:hi,english:en,maps:HINDI.maps,englishMaps:ENGLISH_MAPS,originals});
const strings=()=>[...Object.values(hi),...Object.values(originals),...pairs().map(p=>p.text)];

describe('Front HI0: the Hindi (hi) bundle',()=>{
 it('is registered unreleased (only a ?lang=hi preview reaches it), with the en-US thousands comma (user decision Q1, 2026-11-19)',()=>{
  expect(languageEntry('hi')).toMatchObject({dir:'hi',catalog:'hi.json',htmlLang:'hi',pagePath:'hi',autonym:'हिन्दी',englishName:'Hindi',match:['hi'],released:false});
  expect(languageEntry('hi')?.thousands).toBeUndefined();
  expect(languageEntry('hi')?.help).toBeUndefined();
  expect(HINDI.language).toBe('hi');
  for(const notice of Object.values(languageEntry('hi')!.notices)){expect(notice).toMatch(/।$/u);expect(notice.normalize('NFC')).toBe(notice);}
 });
 it('the catalog is a valid partial catalog (en.json keys, the same {params}) and covers the whole shell, the welcome and the footer',()=>{
  expect(()=>createI18n(hi as Partial<Record<MessageKey,string>>,'hi',{fallback:true})).not.toThrow();
  for(const key of Object.keys(hi))expect(Object.hasOwn(en,key),key).toBe(true);
  expect(SHELL_KEYS.length).toBe(131);expect(HOME_KEYS.length).toBe(27);
  expect([...SHELL_KEYS,...HOME_KEYS,...FOOTER_KEYS].filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
  expect(Object.keys(hi).length).toBe(SHELL_KEYS.length+HOME_KEYS.length+FOOTER_KEYS.length);
 });
 it('every map has its English shape: the shell maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(HINDI.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(HINDI.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also knows (src/i18n/es/es.test.ts checks those against the source)',()=>{
  const esSame=(key:string)=>Object.hasOwn(esIdentical.entries,`original:${key}`);
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key)||esSame(key),key).toBe(true);}
 });
 it('writes NFC Devanagari with Western digits only (user decision Q2, 2026-11-19), and the language name always «हिन्दी»',()=>{
  for(const s of strings()){expect(s.normalize('NFC'),s).toBe(s);expect(s,s).not.toMatch(/[०-९]/u);}
  expect(strings().filter(s=>s.includes('हिंदी'))).toEqual([]);
 });
 it('formats numbers with the en-US comma and the decimal point; plurals follow CLDR (0 and 1 are one)',()=>{
  expect(thousandsSeparator('hi')).toBeUndefined();
  const hiI18n=createI18n(hi as Partial<Record<MessageKey,string>>,'hi',{fallback:true,numberLocale:locale,thousands:thousandsSeparator('hi')});
  expect([24000,50000,2400000,999,1234.5,-31147].map(v=>hiI18n.formatNumber(v))).toEqual(['24,000','50,000','2,400,000','999','1,234.5','-31,147']);
  expect(english.formatNumber(2400000)).toBe('2,400,000');
  // Coordinator C2 (2026-11-19): CLDR's hi rule stays (i = 0 or n = 1): 0, 0.5 and 1 are `one`, 1.5 and 2 `other`.
  expect([0,0.5,1,1.5,2,1000000].map(n=>pluralCategory('hi',n))).toEqual(['one','one','one','other','other','other']);
 });
 it('passes every rule of the hi profile with the glossary, identical.json and lint-allowed.json',()=>{
  const findings=lintPairs(pairs(),profile,data);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  const reports=reportsOf(findings);
  if(reports.length)console.info(`hi reports for the reviewer (not failures):\n${describeFindings(reports).join('\n')}`);
 });
});
