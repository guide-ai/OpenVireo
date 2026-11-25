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
import {HELP_VIEWER_EN} from '../../help/HelpViewerMessages';
import {WEB_HELP_EN} from '../../help/webHelp';

// Front HI0 (docs/I18N.md, "Hindi: the folder, the digit notice and the shell (HI0)"; plan front-i18n-hi.md §4, §6.2): the
// structural checks of the partial Hindi bundle and every Hindi string through the SC4 lint framework, profile hi. Errors fail the
// batch; length ratios are reported for the independent reviewer. Later HI fronts add their maps to ENGLISH_MAPS and COMPLETE_MAPS,
// and their areas to the coverage checks.
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,camera:CAMERA_MESSAGES_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,nakedEye:NAKED_EYE_MESSAGES_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,engineView:ENGINE_VIEW_EN,spectralRange:SPECTRAL_RANGE_EN,wedge:WEDGE_MESSAGES_EN,clusterHr:CLUSTER_HR_EN,clusterData:CLUSTER_DATA_MESSAGES_EN,
 radioAntenna:RADIO_ANTENNA_MESSAGES_EN,radioFinishSave:FINISH_SAVE_MESSAGES_EN,radioR1:RADIO_R1_MESSAGES_EN,radioRecordSave:RADIO_SAVE_MESSAGES_EN,
 pulsar:PULSAR_MESSAGES_EN,pulsarSavedRows:SAVED_ROWS_MESSAGES_EN,pulsarLoadSave:LOAD_SAVE_MESSAGES_EN,objectXGuide:OBJECT_X_GUIDE_EN,objectXMeasure:OBJECT_X_MEASURE_EN,objectXSession:OBJECT_X_SESSION_EN,
 helpViewer:HELP_VIEWER_EN,webHelp:WEB_HELP_EN};
/** The maps translated completely: HI0's shell maps; HI1's observatory maps, the camera card and polish; HI2's engineView, spectralRange and wedge; HI4's clusterHr, clusterData and variableStars; HI5's four radio maps; HI6's pulsar analysis maps and the four Object X maps; HI-HELP's helpViewer and webHelp. */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','observatory','fieldInfo','fieldReadDetails','nakedEye','polish','qsoList','sound','observationMetadata','camera','engineView','spectralRange','wedge','clusterHr','clusterData','variableStars','radioAntenna','radioFinishSave','radioR1','radioRecordSave',
 'pulsar','pulsarSavedRows','pulsarLoadSave','objectXLab','objectXGuide','objectXMeasure','objectXSession','helpViewer','webHelp'];
/** HI0's area of en.json: the shell (header, menu, first steps, toolbar, errors, instructor mode, document title), as FR0's and
 * PT0's, and the welcome's home.* keys (Front HOME, after FR0). */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
const HOME_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
/** The shell's footer (Front LAUNCH-2, after FR0): observatory-prefixed keys that every page shows. */
const FOOTER_KEYS:readonly MessageKey[]=['sky.attribution','sky.labsLink','sky.aboutPrivacy'];
/** Front HI1's area of en.json (FR1's): PT1's observatory keys (the observatory route, its instruments' cards and the guide keys those
 * files render; docs/I18N.md "Brazilian Portuguese: the observatory and VIREO's names (PT1)"), every key of their prefixes. */
const OBSERVATORY_PREFIXES=/^(sky|optical|motion|horizon|siteClock|runningClock|scopeAccess|instrumentAccess|instrumentParameters|cameraParameters|cameraInfo|cameraPrepare|palette|testMode|optionsFile|photometerTab|htl|multispec|nativeMirror|hubblePoint)\./;
const HI1_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>OBSERVATORY_PREFIXES.test(k)||/^hubbleHtl\.reason\./.test(k));
/** Front HI2's area of en.json: exercises E01 (Hubble's law) and E02 (large-scale structure) as PT2 and FR2 scoped them (every key of
 * their prefixes, which include the shared core keys continuity.* and ssp.header, and classLink.open, the star exposure's button). */
const E01_E02_PREFIXES=/^(continuity|lab|lssLab|hubble|velocity|ownResults|spectrum|spectrometer|galaxyExposure|skyExposure|starExposure|ssp|exposureIO|drift|skyProfiles|fieldSpec|lss|wedge)\./;
const HI2_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E01_E02_PREFIXES.test(k)||k==='classLink.open');
/** Front HI3's area of en.json: exercise E03 (spectral classification) as PT3 and FR3 scoped it: every key of the classification
 * module and of classification+cluster, and the core keys E03 renders (the rest of classLab, class, classLink, classImport, combined,
 * probe); continuity.restoreExposure and ssp.header, which E03 also renders, are HI2's (their prefixes are E01/E02's). */
const E03_PREFIXES=/^(class|classLines|classLink|classAtlas|classImport|classLab|feature|cursor|probe|photo|combined|combinedWidth|viewport|inspection|sampledTrace|reverseTrace|sampledDiff|range|widthSource|widthCoordinates|sharedMarks|comparisonMark|paneSource|panMarks|obs|nativeResults|nativeEdit|nativeDelete|nativeList|nativeText|nativeCsv|program|programImport)\./;
/** HI4's area: exercises E04 (Pleiades photometry) and E05 (cluster H-R diagrams and variable stars), as FR4's. */
const E04_E05_PREFIXES=/^(ph|pa|pleiadesLab|nc|db|ce|clusterLab|ownHr|obsHr)\./;
const HI4_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E04_E05_PREFIXES.test(k));
/** HI5's area: the radio telescope, as FR5's. */
const HI5_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(radio|radioRoute|radioAccess|radioReceiver|radioSimOptions|pulsarParameters)\./.test(k));
/** HI6's area: exercise E06 (the recorded pulsar analysis route, the Pulsar guide, `.PLR`) and E08's saved-images route (`fits`), as FR6's. */
const HI6_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(pulsarLab|plr|fits)\./.test(k));
const HI3_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E03_PREFIXES.test(k)||k==='continuity.restoreExposure'||k==='ssp.header');
/** PT1's keys outside those prefixes that the observatory files render (the classification and Pleiades guides' pointing
 * steps, the photometer card, the continuity notes the route shows): 104 keys, pinned so a lost key fails. */
const HI1_GUIDE_KEYS:readonly MessageKey[]=['spectrum.licenseHelp','spectrometer.open','continuity.starSource','continuity.acquireFromObservatory','continuity.pointingHelp','galaxyExposure.acquireFromObservatory','galaxyExposure.pointingHelp','galaxyExposure.source','classLab.next.choose','classLab.next.compare','classLab.next.inspect','classLab.next.record','classLab.next.save','classLab.step.choose.title','classLab.step.choose.help','classLab.step.compare.title','classLab.step.compare.help','classLab.step.inspect.title','classLab.step.inspect.help','classLab.step.record.title','classLab.step.record.help','classLab.step.save.title','classLab.step.save.help','classLab.problem.load','classLab.recover.load','classLab.problem.draft','classLab.recover.draft','classLab.problem.limit','classLab.recover.limit','classLab.problem.width','classLab.recover.width','classLab.problem.import','classLab.recover.import','ph.readingOption','ph.unavailableMixed','ph.unavailableAssociation','ph.access.ready','ph.access.pointing','ph.access.dome','ph.access.finder','ph.access.moving','ph.domainLimit.Poisson-mean-bound','ph.domainLimit.all-duration-count-domain','ph.apertureReadingOption','pleiadesPoint.eyebrow','pleiadesPoint.title','pleiadesPoint.admitted','pleiadesPoint.open','pleiadesPoint.unavailable','pleiadesPoint.telescope','pleiadesPoint.checking','pleiadesPoint.help','pleiadesLab.next.list','pleiadesLab.next.point','pleiadesLab.next.activate','pleiadesLab.next.measure','pleiadesLab.next.record','pleiadesLab.next.color','pleiadesLab.next.sample','pleiadesLab.next.distance','pleiadesLab.next.save','pleiadesLab.step.list.title','pleiadesLab.step.list.help','pleiadesLab.step.point.title','pleiadesLab.step.point.help','pleiadesLab.step.activate.title','pleiadesLab.step.activate.help','pleiadesLab.step.measure.title','pleiadesLab.step.measure.help','pleiadesLab.step.record.title','pleiadesLab.step.record.help','pleiadesLab.step.color.title','pleiadesLab.step.color.help','pleiadesLab.step.sample.title','pleiadesLab.step.sample.help','pleiadesLab.step.distance.title','pleiadesLab.step.distance.help','pleiadesLab.step.save.title','pleiadesLab.step.save.help','pleiadesLab.problem.card','pleiadesLab.recover.card','pleiadesLab.problem.blocked','pleiadesLab.recover.blocked','pleiadesLab.problem.start','pleiadesLab.recover.start','pleiadesLab.problem.sky','pleiadesLab.recover.sky','pleiadesLab.problem.budget','pleiadesLab.recover.budget','notes.summary','ph.tiledReason.object-x-hidden','ph.tiledReason.field-polar','ph.tiledReason.photometer-galaxy-name','ph.tiledReason.photometer-variable','ph.tiledReason.photometer-selection','ph.tiledReason.photometer-empty','ph.tiledReason.photometer-population','ph.tiledLimit.Poisson-mean-bound','ph.tiledLimit.all-duration-count-domain','ph.tiledLimit.photometer-galaxy-sky-stamp','demonstrationMode.adaptation','ph.parametersDomain.base-count','ph.parametersDomain.timer','ph.parametersDomain.magnitude'];
/** VIREO originals that Spanish keeps with no entry (src/i18n/vireoSites.test.ts), as for Portuguese and French: the options
 * dialog's General tab («सामान्य») and the Site Information compass letters E «पू» and, since Spanish and French keep them, N «उ»
 * and S «द» (W is «प» in Spanish's list too). */
const HI_ONLY_ORIGINALS:readonly string[]=['General','E','N','S'];
const profile=PROFILES.hi;
const data:LintData={glossary:glossaryFrom(glossaryJson,'hi'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:hi,english:en,maps:HINDI.maps,englishMaps:ENGLISH_MAPS,originals});
const strings=()=>[...Object.values(hi),...Object.values(originals),...pairs().map(p=>p.text)];

describe('Front HI0: the Hindi (hi) bundle',()=>{
 it('Front HI-REL: is released (detected from every hi and hi-* browser, stored, offered), with the en-US thousands comma (user decision Q1, 2026-11-19)',()=>{
  expect(languageEntry('hi')).toMatchObject({dir:'hi',catalog:'hi.json',htmlLang:'hi',pagePath:'hi',autonym:'हिन्दी',englishName:'Hindi',match:['hi'],released:true});
  expect(languageEntry('hi')?.thousands).toBeUndefined();
  // Front HI-HELP: Hindi translates VIREO's help files, with its related-topics marker.
  expect(languageEntry('hi')?.help).toEqual({related:'संबंधित विषय'});
  expect(HINDI.language).toBe('hi');
  for(const notice of Object.values(languageEntry('hi')!.notices)){expect(notice).toMatch(/।$/u);expect(notice.normalize('NFC')).toBe(notice);}
 });
 it('Front HI-REL: the catalog is complete and strict: every en.json key, the same {params}, strings only, no extra key; every map complete',()=>{
  // As the ES-REL, PT-REL and FR-REL checks: strictness lives here, since the split bundle builds each module with the English
  // fallback.
  expect(()=>createI18n(hi as Record<MessageKey,string>,'hi')).not.toThrow();
  expect(Object.keys(en).filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
  for(const [id,map] of Object.entries(HINDI.maps??{}))expect(mapParity(ENGLISH_MAPS[id as MapId],map),id).toEqual([]);
  expect(MAP_IDS.filter(id=>!Object.hasOwn(HINDI.maps??{},id))).toEqual([]);
  expect(MAP_IDS.filter(id=>!Object.hasOwn(ENGLISH_MAPS,id)),'every map is compared with its English').toEqual([]);
 });
 it('the catalog is a valid partial catalog (en.json keys, the same {params}) and covers the whole shell, the welcome and the footer',()=>{
  expect(()=>createI18n(hi as Partial<Record<MessageKey,string>>,'hi',{fallback:true})).not.toThrow();
  for(const key of Object.keys(hi))expect(Object.hasOwn(en,key),key).toBe(true);
  expect(SHELL_KEYS.length).toBe(131);expect(HOME_KEYS.length).toBe(27);
  expect([...SHELL_KEYS,...HOME_KEYS,...FOOTER_KEYS].filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
  expect(Object.keys(hi).length).toBe(new Set([...SHELL_KEYS,...HOME_KEYS,...FOOTER_KEYS,...HI1_KEYS,...HI1_GUIDE_KEYS,...HI2_KEYS,...HI3_KEYS,...HI4_KEYS,...HI5_KEYS,...HI6_KEYS]).size);
 });
 it('Front HI1: the catalog covers the observatory (every key of its instruments\' prefixes) and the guide keys it renders',()=>{
  expect(HI1_KEYS.length).toBeGreaterThan(450);
  expect(HI1_KEYS.filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
  expect(HI1_GUIDE_KEYS.length).toBe(104);
  expect(HI1_GUIDE_KEYS.filter(k=>!Object.hasOwn(en,k)||!Object.hasOwn(hi,k))).toEqual([]);
 });
 it('Front HI2: the catalog covers E01 and E02 (every key of their prefixes, and classLink.open)',()=>{
  expect(HI2_KEYS.length).toBeGreaterThan(780);
  expect(HI2_KEYS.filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
 });
 it('Front HI3: the catalog covers exercise E03 (every key of its prefixes, continuity.restoreExposure and ssp.header)',()=>{
  expect(HI3_KEYS.length).toBe(773); // 773: Front NEWCOMER NC4 adds classLab.why
  expect(HI3_KEYS.filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
 });
 it('Front HI4: the catalog covers exercises E04 and E05 (every key of their prefixes)',()=>{
  expect(HI4_KEYS.length).toBe(655); // 653: Front NEWCOMER NC4 adds pleiadesLab.why and clusterLab.why // 655: NC5 adds pleiadesLab.version.quick and pleiadesLab.version.full
  expect(HI4_KEYS.filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
 });
 it('Front HI5: the catalog covers the radio telescope (every key of its prefixes)',()=>{
  expect(HI5_KEYS.length).toBe(646);
  expect(HI5_KEYS.filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
 });
 it('Front HI6: the catalog covers E06 and E08 (every key of their prefixes), and with them every en.json key',()=>{
  expect(HI6_KEYS.length).toBe(138);// 138: Front NEWCOMER NC4 adds pulsarLab.why
  expect(HI6_KEYS.filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
  expect(Object.keys(en).filter(k=>!Object.hasOwn(hi,k))).toEqual([]);
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
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key)||esSame(key)||HI_ONLY_ORIGINALS.includes(key),key).toBe(true);}
 });
 it('Front HI1: every VIREO original is translated at once, or kept with an identical.json reason, never both',()=>{
  const english=[...Object.keys(esOriginals),...Object.keys(esIdentical.entries).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length))];
  expect(new Set(english).size).toBe(760);english.push(...HI_ONLY_ORIGINALS);
  const same=identical.entries as Record<string,string>,kept=Object.keys(same).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length));
  expect(english.filter(k=>!Object.hasOwn(originals,k)&&!Object.hasOwn(same,`original:${k}`))).toEqual([]);
  for(const k of kept){expect(english,k).toContain(k);expect(Object.hasOwn(originals,k),k).toBe(false);}
  expect(Object.keys(originals).length+kept.length).toBe(764);
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
