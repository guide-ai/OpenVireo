import {describe,expect,it} from 'vitest';
import en from '../en.json';
import pt from './pt-br.json';
import originals from './originals.json';
import glossaryJson from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import esOriginals from '../es/originals.json';
import esIdentical from '../es/identical.json';
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

// Front PT0 (docs/I18N.md, "Brazilian Portuguese: the folder, lints and shell (PT0)"; plan front-i18n-pt-br.md §3.4): the
// structural checks of the partial pt-BR bundle and every Portuguese string through the SC4 lint framework, profile pt-BR. Errors
// fail the batch; length ratios are reported for the independent reviewer. Later PT fronts add their maps to ENGLISH_MAPS and
// COMPLETE_MAPS, and their areas to the coverage check.
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,camera:CAMERA_MESSAGES_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,nakedEye:NAKED_EYE_MESSAGES_EN,objectXLab:OBJECT_X_LAB_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,engineView:ENGINE_VIEW_EN,spectralRange:SPECTRAL_RANGE_EN,wedge:WEDGE_MESSAGES_EN,clusterHr:CLUSTER_HR_EN,clusterData:CLUSTER_DATA_MESSAGES_EN,
  radioAntenna:RADIO_ANTENNA_MESSAGES_EN,radioFinishSave:FINISH_SAVE_MESSAGES_EN,radioR1:RADIO_R1_MESSAGES_EN,radioRecordSave:RADIO_SAVE_MESSAGES_EN};
/** The maps translated completely (PT0's shell maps; PT1's observatory maps, the camera card the observatory shows, and polish); the others are partial until their
 * front (objectXLab PT6). PT4 completes clusterHr, clusterData and variableStars; PT5 the four radio maps. */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','observatory','fieldInfo','fieldReadDetails','nakedEye','polish','qsoList','sound','observationMetadata','camera','engineView','spectralRange','wedge','clusterHr','clusterData','variableStars',
  'radioAntenna','radioFinishSave','radioR1','radioRecordSave'];
/** PT0's area of en.json: the shell (header, menu, home and first steps, toolbar, errors, instructor mode, document title), as ES1's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
/** Front PT1's area of en.json: ES2's observatory keys (the 546 keys Spanish translated in ES2: the observatory route, its
 * instruments' cards and the guide keys those files render) and the seven observatory keys added since (the M31 note, the
 * Hubble pointing hints and the hot list's Hubble reasons). The list is pinned so a lost key fails. */
const OBSERVATORY_PREFIXES=/^(sky|optical|motion|horizon|siteClock|runningClock|scopeAccess|instrumentAccess|instrumentParameters|cameraParameters|cameraInfo|cameraPrepare|palette|testMode|optionsFile|photometerTab|htl|multispec|nativeMirror|hubblePoint)\./;
const PT1_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>OBSERVATORY_PREFIXES.test(k)||/^hubbleHtl\.reason\./.test(k));
/** Front PT2's area of en.json: ES3's and ES4's keys (exercise E01, Hubble's law, and E02, large-scale structure: the two guides,
 * the galaxy, sky and star exposures, the analyser, velocities, the Hubble diagram, Observational Results of your redshifts, the
 * single-slit spectrometer at a free pointing, the LSS survey and the wedge), every key of their prefixes. */
const E01_E02_PREFIXES=/^(continuity|lab|lssLab|hubble|velocity|ownResults|spectrum|spectrometer|galaxyExposure|skyExposure|starExposure|ssp|exposureIO|drift|skyProfiles|fieldSpec|lss|wedge)\./;
const PT2_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E01_E02_PREFIXES.test(k));
/** Front PT4's area of en.json: ES6's and ES7's keys (exercise E04, the Pleiades photometer, guide and colour–magnitude analysis,
 * and E05, the cluster reference database, the native model fit, the own-observation and saved-observation HR tools and the
 * cluster guide), every key of their prefixes. */
const E04_E05_PREFIXES=/^(ph|pa|pleiadesLab|nc|db|ce|clusterLab|ownHr|obsHr)\./;
const PT4_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E04_E05_PREFIXES.test(k));
/** Front PT5's area of en.json: ES8a's keys (the radio telescope route: the route page, its scenario, the radio clock, Set
 * Observation Date/Time, ID, the main-window radio controls, the control panel's catalog texts, Radio Simulation Options, Pulsar
 * Parameters and the receiver), every key of their prefixes. `plr.*` and `pulsarLab.*` are E06's (PT6). */
const RADIO_PREFIXES=/^(radio|radioRoute|radioAccess|radioReceiver|radioSimOptions|pulsarParameters)\./;
const PT5_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>RADIO_PREFIXES.test(k));
/** VIREO originals that Spanish keeps with no entry (its word equals VIREO's, and the vireo() site is one the source guard cannot
 * resolve, src/i18n/vireoSites.test.ts), but Portuguese translates: the options dialog's General tab and the Site Information
 * longitude letter E (East, «L» for Leste). tests/i18n/observatory.spec.ts checks both on screen. */
const PT_ONLY_ORIGINALS:readonly string[]=['General','E'];
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
 it('Front PT1: the catalog covers the observatory (every key of its instruments\' prefixes)',()=>{
  expect(PT1_KEYS.length).toBeGreaterThan(450);
  expect(PT1_KEYS.filter(k=>!Object.hasOwn(pt,k))).toEqual([]);
 });
 it('Front PT2: the catalog covers E01 and E02 (every key of their prefixes)',()=>{
  expect(PT2_KEYS.length).toBeGreaterThan(700);
  expect(PT2_KEYS.filter(k=>!Object.hasOwn(pt,k))).toEqual([]);
 });
 it('Front PT4: the catalog covers E04 and E05 (every key of their prefixes)',()=>{
  expect(PT4_KEYS.length).toBeGreaterThan(600);
  expect(PT4_KEYS.filter(k=>!Object.hasOwn(pt,k))).toEqual([]);
 });
 it('Front PT5: the catalog covers the radio telescope (every key of its prefixes)',()=>{
  expect(PT5_KEYS.length).toBeGreaterThan(640);
  expect(PT5_KEYS.filter(k=>!Object.hasOwn(pt,k))).toEqual([]);
 });
 it('every map has its English shape: the shell maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(PORTUGUESE.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const english=ENGLISH_MAPS[id as MapId];expect(english,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(english,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(PORTUGUESE.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also knows (src/i18n/es/es.test.ts checks those against the source)',()=>{
  const esSame=(key:string)=>Object.hasOwn(esIdentical.entries,`original:${key}`);
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key)||esSame(key)||PT_ONLY_ORIGINALS.includes(key),key).toBe(true);}
 });
 it('Front PT1: every VIREO original is translated at once, or kept with an identical.json reason',()=>{
  const english=[...Object.keys(esOriginals),...Object.keys(esIdentical.entries).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length))];
  expect(english.length).toBe(762);english.push(...PT_ONLY_ORIGINALS);
  const same=identical.entries as Record<string,string>;
  expect(english.filter(k=>!Object.hasOwn(originals,k)&&!Object.hasOwn(same,`original:${k}`))).toEqual([]);
  // A kept original is not also translated, and an identical.json original names a real one.
  for(const k of Object.keys(same).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length)))expect(english,k).toContain(k);
 });
 it('passes every rule of the pt-BR profile with the glossary, identical.json and lint-allowed.json',()=>{
  const findings=lintPairs(pairs(),profile,data);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  const reports=reportsOf(findings);
  if(reports.length)console.info(`pt-BR reports for the reviewer (not failures):\n${describeFindings(reports).join('\n')}`);
 });
});
