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
import esIdentical from '../es/identical.json';
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

// Front FR0 (docs/I18N.md, "French: the folder, lints and shell (FR0)"; plan front-i18n-fr.md §4, §6.2): the structural checks of
// the partial French bundle, the French typography fixer as a no-op over every French string, and every string through the SC4
// lint framework, profile fr. Errors fail the batch; length ratios are reported for the independent reviewer. Later FR fronts add
// their maps to ENGLISH_MAPS and COMPLETE_MAPS, and their areas to the coverage check.
//
// Fix mode (plan §4.5): `OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/fr/fr.test.ts` rewrites fr.json, originals.json, the
// string literals of maps/*.ts and help/*.ts with the fixer (src/i18n/lint/frenchSpacing.ts), writing the characters literally
// (never `\u202f` or `\u2019` escapes: scripts/check-i18n-dist.mjs reads map literals as written), then checks as usual. A VIREO
// `fragment|` original keeps its straight quotes (another piece of VIREO's text closes them).
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,camera:CAMERA_MESSAGES_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,nakedEye:NAKED_EYE_MESSAGES_EN,objectXLab:OBJECT_X_LAB_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,engineView:ENGINE_VIEW_EN,spectralRange:SPECTRAL_RANGE_EN,wedge:WEDGE_MESSAGES_EN,clusterHr:CLUSTER_HR_EN,clusterData:CLUSTER_DATA_MESSAGES_EN,
 radioAntenna:RADIO_ANTENNA_MESSAGES_EN,radioFinishSave:FINISH_SAVE_MESSAGES_EN,radioR1:RADIO_R1_MESSAGES_EN,radioRecordSave:RADIO_SAVE_MESSAGES_EN,
 pulsar:PULSAR_MESSAGES_EN,pulsarSavedRows:SAVED_ROWS_MESSAGES_EN,pulsarLoadSave:LOAD_SAVE_MESSAGES_EN,objectXGuide:OBJECT_X_GUIDE_EN,objectXMeasure:OBJECT_X_MEASURE_EN,objectXSession:OBJECT_X_SESSION_EN,
 helpViewer:HELP_VIEWER_EN,webHelp:WEB_HELP_EN};
/** The maps translated completely (FR0's shell maps; FR1's observatory maps, the camera card the observatory shows, and polish; FR2's
 * engineView, spectralRange and wedge; FR4's clusterHr, clusterData and variableStars; FR5's four radio maps; FR6's
 * pulsar analysis maps and the four Object X maps; FR-HELP's helpViewer and webHelp): every French map. */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','observatory','fieldInfo','fieldReadDetails','nakedEye','polish','qsoList','sound','observationMetadata','camera','engineView','spectralRange','wedge','clusterHr','clusterData','variableStars','radioAntenna','radioFinishSave','radioR1','radioRecordSave',
 'pulsar','pulsarSavedRows','pulsarLoadSave','objectXLab','objectXGuide','objectXMeasure','objectXSession','helpViewer','webHelp'];
/** FR0's area of en.json: the shell (header, menu, home and first steps, toolbar, errors, instructor mode, document title), as PT0's. */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
/** Front FR1's area of en.json: PT1's observatory keys (the observatory route, its instruments' cards and the guide keys those
 * files render; docs/I18N.md "Brazilian Portuguese: the observatory and VIREO's names (PT1)"), every key of their prefixes. */
const OBSERVATORY_PREFIXES=/^(sky|optical|motion|horizon|siteClock|runningClock|scopeAccess|instrumentAccess|instrumentParameters|cameraParameters|cameraInfo|cameraPrepare|palette|testMode|optionsFile|photometerTab|htl|multispec|nativeMirror|hubblePoint)\./;
const FR1_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>OBSERVATORY_PREFIXES.test(k)||/^hubbleHtl\.reason\./.test(k));
/** PT1's keys outside those prefixes that the observatory files render (the classification and Pleiades guides' pointing
 * steps, the photometer card, the continuity notes the route shows): 104 keys, pinned so a lost key fails. */
const FR1_GUIDE_KEYS:readonly MessageKey[]=['spectrum.licenseHelp','spectrometer.open','continuity.starSource','continuity.acquireFromObservatory','continuity.pointingHelp','galaxyExposure.acquireFromObservatory','galaxyExposure.pointingHelp','galaxyExposure.source','classLab.next.choose','classLab.next.compare','classLab.next.inspect','classLab.next.record','classLab.next.save','classLab.step.choose.title','classLab.step.choose.help','classLab.step.compare.title','classLab.step.compare.help','classLab.step.inspect.title','classLab.step.inspect.help','classLab.step.record.title','classLab.step.record.help','classLab.step.save.title','classLab.step.save.help','classLab.problem.load','classLab.recover.load','classLab.problem.draft','classLab.recover.draft','classLab.problem.limit','classLab.recover.limit','classLab.problem.width','classLab.recover.width','classLab.problem.import','classLab.recover.import','ph.readingOption','ph.unavailableMixed','ph.unavailableAssociation','ph.access.ready','ph.access.pointing','ph.access.dome','ph.access.finder','ph.access.moving','ph.domainLimit.Poisson-mean-bound','ph.domainLimit.all-duration-count-domain','ph.apertureReadingOption','pleiadesPoint.eyebrow','pleiadesPoint.title','pleiadesPoint.admitted','pleiadesPoint.open','pleiadesPoint.unavailable','pleiadesPoint.telescope','pleiadesPoint.checking','pleiadesPoint.help','pleiadesLab.next.list','pleiadesLab.next.point','pleiadesLab.next.activate','pleiadesLab.next.measure','pleiadesLab.next.record','pleiadesLab.next.color','pleiadesLab.next.sample','pleiadesLab.next.distance','pleiadesLab.next.save','pleiadesLab.step.list.title','pleiadesLab.step.list.help','pleiadesLab.step.point.title','pleiadesLab.step.point.help','pleiadesLab.step.activate.title','pleiadesLab.step.activate.help','pleiadesLab.step.measure.title','pleiadesLab.step.measure.help','pleiadesLab.step.record.title','pleiadesLab.step.record.help','pleiadesLab.step.color.title','pleiadesLab.step.color.help','pleiadesLab.step.sample.title','pleiadesLab.step.sample.help','pleiadesLab.step.distance.title','pleiadesLab.step.distance.help','pleiadesLab.step.save.title','pleiadesLab.step.save.help','pleiadesLab.problem.card','pleiadesLab.recover.card','pleiadesLab.problem.blocked','pleiadesLab.recover.blocked','pleiadesLab.problem.start','pleiadesLab.recover.start','pleiadesLab.problem.sky','pleiadesLab.recover.sky','pleiadesLab.problem.budget','pleiadesLab.recover.budget','notes.summary','ph.tiledReason.object-x-hidden','ph.tiledReason.field-polar','ph.tiledReason.photometer-galaxy-name','ph.tiledReason.photometer-variable','ph.tiledReason.photometer-selection','ph.tiledReason.photometer-empty','ph.tiledReason.photometer-population','ph.tiledLimit.Poisson-mean-bound','ph.tiledLimit.all-duration-count-domain','ph.tiledLimit.photometer-galaxy-sky-stamp','demonstrationMode.adaptation','ph.parametersDomain.base-count','ph.parametersDomain.timer','ph.parametersDomain.magnitude'];
/** Front FR2's area of en.json: PT2's keys (exercise E01, Hubble's law, and E02, large-scale structure: the two guides, the Hubble
 * diagram, velocities and own Observational Results, the analyser, the galaxy, sky and star exposures, `.SSP`, drift and sky
 * profiles, the single-slit spectrometer at a free pointing, the LSS survey and the wedge), every key of their prefixes, and
 * `classLink.open` (the star exposure's button the E01 walk shows). */
const E01_E02_PREFIXES=/^(continuity|lab|lssLab|hubble|velocity|ownResults|spectrum|spectrometer|galaxyExposure|skyExposure|starExposure|ssp|exposureIO|drift|skyProfiles|fieldSpec|lss|wedge)\./;
const FR2_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E01_E02_PREFIXES.test(k)||k==='classLink.open');
/** Front FR3's area of en.json: exercise E03 as PT3 scoped it (docs/I18N.md "Brazilian Portuguese: E03 spectral classification
 * (PT3)"): every key of the classification module and of classification+cluster, and the core keys E03 renders (the rest of
 * classLab, class, classLink, classImport, combined, probe, continuity.restoreExposure and ssp.header); every key of their
 * prefixes. */
const E03_PREFIXES=/^(class|classLines|classLink|classAtlas|classImport|classLab|feature|cursor|probe|photo|combined|combinedWidth|viewport|inspection|sampledTrace|reverseTrace|sampledDiff|range|widthSource|widthCoordinates|sharedMarks|comparisonMark|paneSource|panMarks|obs|nativeResults|nativeEdit|nativeDelete|nativeList|nativeText|nativeCsv|program|programImport)\./;
const FR3_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E03_PREFIXES.test(k)||k==='continuity.restoreExposure'||k==='ssp.header');
/** Front FR4's area of en.json: exercises E04 and E05 as PT4 scoped them (docs/I18N.md "Brazilian Portuguese: E04 Pleiades and E05
 * clusters (PT4)"): every key of the photometer route (ph), the Pleiades analysis and guide (pa, pleiadesLab), the native cluster
 * model fit (nc), the cluster reference database, its exclusions and guide (db, ce, clusterLab), and Data from Observations and the
 * saved-observation HR tool (ownHr, obsHr). */
const E04_E05_PREFIXES=/^(ph|pa|pleiadesLab|nc|db|ce|clusterLab|ownHr|obsHr)\./;
const FR4_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E04_E05_PREFIXES.test(k));
/** Front FR5's area of en.json: the radio telescope as PT5 scoped it (docs/I18N.md "Brazilian Portuguese: the radio telescope
 * (PT5)"): every key of radio, radioRoute, radioAccess, radioReceiver, radioSimOptions and pulsarParameters (646). */
const FR5_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(radio|radioRoute|radioAccess|radioReceiver|radioSimOptions|pulsarParameters)\./.test(k));
/** Front FR6's area of en.json: exercise E06 (the recorded pulsar analysis route, the Pulsar guide, `.PLR`) and E08's saved-images
 * route (`fits`) as PT6 scoped them: every key of pulsarLab, plr and fits (137). With it every en.json key has its French. */
const FR6_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(pulsarLab|plr|fits)\./.test(k));
/** VIREO originals that Spanish keeps with no entry (its word equals VIREO's, and the vireo() site is one the source guard cannot
 * resolve, src/i18n/vireoSites.test.ts), as for Portuguese: the options dialog's General tab («Général») and the Site Information
 * longitude letter E (Est, kept: identical.json). */
const FR_ONLY_ORIGINALS:readonly string[]=['General','E'];
const profile=PROFILES.fr;
const data:LintData={glossary:glossaryFrom(glossaryJson,'fr'),identical:identical.entries,allowed:lintAllowed.entries as Readonly<Record<string,Allowance>>};
const pairs=()=>collectPairs({catalog:fr,english:en,maps:FRENCH.maps,englishMaps:ENGLISH_MAPS,originals});
const DIR=import.meta.dirname;
const sources=(sub:string)=>existsSync(path.join(DIR,sub))?readdirSync(path.join(DIR,sub)).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(DIR,sub,f)):[];
const fixOriginal=(key:string,text:string)=>fixFrenchTypography(text,{quotes:!key.startsWith('fragment|')});
const fixSource=(source:string)=>fixSourceLiterals(source,(text,options)=>fixFrenchTypography(text,options));
const writeJson=(file:string,value:unknown)=>writeFileSync(path.join(DIR,file),JSON.stringify(value,null,1)+'\n');

if(process.env.OPENVIREO_FIX_TYPOGRAPHY==='1'){
 // Review (FR0): refused in CI, as OPENVIREO_REFRESH_PINS is (src/i18n/sourceScan.ts): CI must check, never rewrite.
 if(process.env.CI)throw new Error('OPENVIREO_FIX_TYPOGRAPHY=1 is refused in CI: run the fixer locally and commit the reviewed diff');
 const catalog=JSON.parse(readFileSync(path.join(DIR,'fr.json'),'utf8')) as Record<string,string>;
 writeJson('fr.json',Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,fixFrenchTypography(v)])));
 const own=JSON.parse(readFileSync(path.join(DIR,'originals.json'),'utf8')) as Record<string,string>;
 writeJson('originals.json',Object.fromEntries(Object.entries(own).map(([k,v])=>[k,fixOriginal(k,v)])));
 for(const file of [...sources('maps'),...sources('help')]){const before=readFileSync(file,'utf8'),after=fixSource(before);if(after!==before)writeFileSync(file,after);}
}

describe('Front FR0: the French (fr) bundle',()=>{
 it('Front FR-REL: is released (detected from every fr and fr-* browser, stored, offered); thousands with U+202F since FR0',()=>{
  expect(languageEntry('fr')).toMatchObject({dir:'fr',catalog:'fr.json',htmlLang:'fr',pagePath:'fr',autonym:'Français',englishName:'French',match:['fr'],released:true,thousands:' '});
  // Front FR-HELP: French translates VIREO's help files (src/i18n/fr/help, src/help/helpTranslation.test.ts).
  expect(languageEntry('fr')?.help).toEqual({related:'RUBRIQUES CONNEXES'});
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
 it('Front FR1: the catalog covers the observatory (every key of its instruments\' prefixes), the guide keys it renders and the welcome',()=>{
  expect(FR1_KEYS.length).toBeGreaterThan(450);
  expect(FR1_KEYS.filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
  expect(FR1_GUIDE_KEYS.length).toBe(104);
  expect(FR1_GUIDE_KEYS.filter(k=>!Object.hasOwn(en,k)||!Object.hasOwn(fr,k))).toEqual([]);
  // The welcome's home.* keys (Front HOME, 2026-11-10, after FR0): the observatory walk starts on the welcome page. 27 since Front
  // LAZY-OBS (home.loadingObservatory, the welcome's line while the rest of the site loads).
  const home=(Object.keys(en) as MessageKey[]).filter(k=>k.startsWith('home.'));
  expect(home.length).toBe(27);expect(home.filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
 });
 it('Front FR2: the catalog covers E01 and E02 (every key of their prefixes, and classLink.open)',()=>{
  expect(FR2_KEYS.length).toBeGreaterThan(780);
  expect(FR2_KEYS.filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
 });
 it('Front FR3: the catalog covers exercise E03 (every key of its prefixes, continuity.restoreExposure and ssp.header)',()=>{
  expect(FR3_KEYS.length).toBe(772);// Front LAUNCH-2: classLab.introOptions
  expect(FR3_KEYS.filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
 });
 it('Front FR4: the catalog covers exercises E04 and E05 (every key of their prefixes)',()=>{
  expect(FR4_KEYS.length).toBe(650);// 650: Front LAUNCH-1 adds pleiadesLab.goHotList
  expect(FR4_KEYS.filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
 });
 it('Front FR5: the catalog covers the radio telescope (every key of its six prefixes)',()=>{
  expect(FR5_KEYS.length).toBe(646);
  expect(FR5_KEYS.filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
 });
 it('Front FR6: the catalog covers E06 and E08 (every key of their prefixes), and with them every en.json key',()=>{
  expect(FR6_KEYS.length).toBe(137);
  expect(FR6_KEYS.filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
  expect(Object.keys(en).filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
 });
 it('Front FR-REL: the catalog is complete and strict: every en.json key, the same {params}, strings only, no extra key; every map complete',()=>{
  // As Spanish's ES-REL and Portuguese's PT-REL checks: strictness lives here, since the split bundle builds each module with the
  // English fallback.
  expect(()=>createI18n(fr as Record<MessageKey,string>,'fr')).not.toThrow();
  expect(Object.keys(en).filter(k=>!Object.hasOwn(fr,k))).toEqual([]);
  for(const [id,map] of Object.entries(FRENCH.maps??{}))expect(mapParity(ENGLISH_MAPS[id as MapId],map),id).toEqual([]);
  expect(MAP_IDS.filter(id=>!Object.hasOwn(FRENCH.maps??{},id))).toEqual([]);
 });
 it('every map has its English shape: the shell maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(FRENCH.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(FRENCH.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also knows (src/i18n/es/es.test.ts checks those against the source)',()=>{
  const esSame=(key:string)=>Object.hasOwn(esIdentical.entries,`original:${key}`);
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key)||esSame(key)||FR_ONLY_ORIGINALS.includes(key),key).toBe(true);}
 });
 it('Front FR1: every VIREO original is translated at once, or kept with an identical.json reason, never both',()=>{
  const english=[...Object.keys(esOriginals),...Object.keys(esIdentical.entries).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length))];
  expect(new Set(english).size).toBe(760);english.push(...FR_ONLY_ORIGINALS);
  const same=identical.entries as Record<string,string>,kept=Object.keys(same).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length));
  expect(english.filter(k=>!Object.hasOwn(originals,k)&&!Object.hasOwn(same,`original:${k}`))).toEqual([]);
  for(const k of kept){expect(english,k).toContain(k);expect(Object.hasOwn(originals,k),k).toBe(false);}
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
