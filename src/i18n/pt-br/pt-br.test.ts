import {describe,expect,it} from 'vitest';
import en from '../en.json';
import pt from './pt-br.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import {PORTUGUESE} from './index';
import {createI18n,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {MAP_IDS,type MapId} from '../maps';
import {languageEntry} from '../languages';
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

// Front PT0 (docs/I18N.md, "Brazilian Portuguese: the folder, lints and shell (PT0)"; plan front-i18n-pt-br.md §3.4): the
// structural checks of the partial pt-BR bundle and every Portuguese string through the SC4 lint framework, profile pt-BR. Errors
// fail the batch; length ratios are reported for the independent reviewer. Later PT fronts add their maps to ENGLISH_MAPS and
// COMPLETE_MAPS, and their areas to the coverage check.
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN};
/** The maps translated completely; the others are partial until their front (objectXLab PT6, polish PT1, variableStars PT4). */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour'];
/** PT0's area of en.json: the shell (header, menu, home and first steps, toolbar, errors, instructor mode, document title), as ES1's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const profile=PROFILES['pt-BR'];
const data:LintData={glossary:glossaryFrom(glossaryJson,'pt'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:pt,english:en,maps:PORTUGUESE.maps,englishMaps:ENGLISH_MAPS,originals});

describe('Front PT0: the Brazilian Portuguese (pt-BR) bundle',()=>{
 it('is registered before its release: a ?lang=pt-BR preview only, never detected or offered',()=>{
  expect(languageEntry('pt-BR')).toMatchObject({dir:'pt-br',catalog:'pt-br.json',htmlLang:'pt-BR',pagePath:'pt-br',autonym:'Português (Brasil)',match:['pt'],released:false});
  expect(languageEntry('pt-BR')?.help).toBeUndefined();
  expect(PORTUGUESE.language).toBe('pt-BR');
 });
 it('the catalog is a valid partial catalog (en.json keys, the same {params}) and covers the whole shell',()=>{
  expect(()=>createI18n(pt as Partial<Record<MessageKey,string>>,'pt-BR',{fallback:true})).not.toThrow();
  for(const key of Object.keys(pt))expect(Object.hasOwn(en,key),key).toBe(true);
  expect(SHELL_KEYS.length).toBe(130);
  expect(SHELL_KEYS.filter(k=>!Object.hasOwn(pt,k))).toEqual([]);
 });
 it('every map has its English shape: the shell maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(PORTUGUESE.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const english=ENGLISH_MAPS[id as MapId];expect(english,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(english,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(PORTUGUESE.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also translates (src/i18n/es/es.test.ts checks those against the source)',()=>{
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key),key).toBe(true);}
 });
 it('passes every rule of the pt-BR profile with the glossary, identical.json and lint-allowed.json',()=>{
  const findings=lintPairs(pairs(),profile,data);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  const reports=reportsOf(findings);
  if(reports.length)console.info(`pt-BR reports for the reviewer (not failures):\n${describeFindings(reports).join('\n')}`);
 });
});
