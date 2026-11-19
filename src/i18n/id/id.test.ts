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
import esIdentical from '../es/identical.json';
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
import {FIELD_INFO_MESSAGES_EN,FIELD_READ_DETAILS_EN,NAKED_EYE_MESSAGES_EN} from '../../observatory/FieldInfoMessages';
import {OBSERVATORY_MESSAGES_EN} from '../../observatory/ObservatoryMessages';
import {QSO_LIST_MESSAGES_EN} from '../../observatory/QsoListMessages';
import {SOUND_MESSAGES_EN} from '../../sound/SoundMessages';
import {OBSERVATION_METADATA_EN} from '../../ObservationMetadataMessages';
import {CAMERA_MESSAGES_EN} from '../../camera/CameraMessages';
import {ENGINE_VIEW_EN} from '../../SpectrumEngineMessages';
import {SPECTRAL_RANGE_EN} from '../../SpectralRangeMessages';
import {WEDGE_MESSAGES_EN} from '../../components/WedgeMessages';

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
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,objectXLab:OBJECT_X_LAB_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,
 camera:CAMERA_MESSAGES_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,nakedEye:NAKED_EYE_MESSAGES_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN,
 engineView:ENGINE_VIEW_EN,spectralRange:SPECTRAL_RANGE_EN,wedge:WEDGE_MESSAGES_EN};
/** The maps translated completely (ID0's shell maps; ID1's observatory maps, the camera card the observatory shows, and polish); the
 * others are partial until their front (objectXLab ID6, variableStars ID4). */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','observatory','fieldInfo','fieldReadDetails','nakedEye','polish','qsoList','sound','observationMetadata','camera','engineView','spectralRange','wedge'];
/** ID0's area of en.json: the shell (header, menu, home and first steps, toolbar, errors, instructor mode, document title), as FR0's,
 * and the welcome's home.* keys (plan §6.1: Front HOME added them after FR0, and FR1 translated them). */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
/** Front ID1's area of en.json: FR1's (and PT1's) observatory keys, every key of the instruments' prefixes, and the 104 guide keys the
 * observatory files render, pinned so a lost key fails. */
const OBSERVATORY_PREFIXES=/^(sky|optical|motion|horizon|siteClock|runningClock|scopeAccess|instrumentAccess|instrumentParameters|cameraParameters|cameraInfo|cameraPrepare|palette|testMode|optionsFile|photometerTab|htl|multispec|nativeMirror|hubblePoint)\./;
const ID1_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>OBSERVATORY_PREFIXES.test(k)||/^hubbleHtl\.reason\./.test(k));
const ID1_GUIDE_KEYS:readonly MessageKey[]=['spectrum.licenseHelp','spectrometer.open','continuity.starSource','continuity.acquireFromObservatory','continuity.pointingHelp','galaxyExposure.acquireFromObservatory','galaxyExposure.pointingHelp','galaxyExposure.source','classLab.next.choose','classLab.next.compare','classLab.next.inspect','classLab.next.record','classLab.next.save','classLab.step.choose.title','classLab.step.choose.help','classLab.step.compare.title','classLab.step.compare.help','classLab.step.inspect.title','classLab.step.inspect.help','classLab.step.record.title','classLab.step.record.help','classLab.step.save.title','classLab.step.save.help','classLab.problem.load','classLab.recover.load','classLab.problem.draft','classLab.recover.draft','classLab.problem.limit','classLab.recover.limit','classLab.problem.width','classLab.recover.width','classLab.problem.import','classLab.recover.import','ph.readingOption','ph.unavailableMixed','ph.unavailableAssociation','ph.access.ready','ph.access.pointing','ph.access.dome','ph.access.finder','ph.access.moving','ph.domainLimit.Poisson-mean-bound','ph.domainLimit.all-duration-count-domain','ph.apertureReadingOption','pleiadesPoint.eyebrow','pleiadesPoint.title','pleiadesPoint.admitted','pleiadesPoint.open','pleiadesPoint.unavailable','pleiadesPoint.telescope','pleiadesPoint.checking','pleiadesPoint.help','pleiadesLab.next.list','pleiadesLab.next.point','pleiadesLab.next.activate','pleiadesLab.next.measure','pleiadesLab.next.record','pleiadesLab.next.color','pleiadesLab.next.sample','pleiadesLab.next.distance','pleiadesLab.next.save','pleiadesLab.step.list.title','pleiadesLab.step.list.help','pleiadesLab.step.point.title','pleiadesLab.step.point.help','pleiadesLab.step.activate.title','pleiadesLab.step.activate.help','pleiadesLab.step.measure.title','pleiadesLab.step.measure.help','pleiadesLab.step.record.title','pleiadesLab.step.record.help','pleiadesLab.step.color.title','pleiadesLab.step.color.help','pleiadesLab.step.sample.title','pleiadesLab.step.sample.help','pleiadesLab.step.distance.title','pleiadesLab.step.distance.help','pleiadesLab.step.save.title','pleiadesLab.step.save.help','pleiadesLab.problem.card','pleiadesLab.recover.card','pleiadesLab.problem.blocked','pleiadesLab.recover.blocked','pleiadesLab.problem.start','pleiadesLab.recover.start','pleiadesLab.problem.sky','pleiadesLab.recover.sky','pleiadesLab.problem.budget','pleiadesLab.recover.budget','notes.summary','ph.tiledReason.object-x-hidden','ph.tiledReason.field-polar','ph.tiledReason.photometer-galaxy-name','ph.tiledReason.photometer-variable','ph.tiledReason.photometer-selection','ph.tiledReason.photometer-empty','ph.tiledReason.photometer-population','ph.tiledLimit.Poisson-mean-bound','ph.tiledLimit.all-duration-count-domain','ph.tiledLimit.photometer-galaxy-sky-stamp','demonstrationMode.adaptation','ph.parametersDomain.base-count','ph.parametersDomain.timer','ph.parametersDomain.magnitude'];
/** VIREO originals that Spanish keeps with no entry, as for Portuguese and French: the options dialog's General tab («Umum») and
 * the Site Information longitude letter E («BT», Bujur Timur). */
const ID_ONLY_ORIGINALS:readonly string[]=['General','E'];
/** Front ID2's area of en.json: FR2's (and PT2's) keys of exercises E01 and E02, every key of their prefixes, and classLink.open. */
const E01_E02_PREFIXES=/^(continuity|lab|lssLab|hubble|velocity|ownResults|spectrum|spectrometer|galaxyExposure|skyExposure|starExposure|ssp|exposureIO|drift|skyProfiles|fieldSpec|lss|wedge)\./;
const ID2_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>E01_E02_PREFIXES.test(k)||k==='classLink.open');
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
 it('Front ID1: the catalog covers the observatory (every key of its instruments\' prefixes) and the guide keys it renders',()=>{
  expect(ID1_KEYS.length).toBeGreaterThan(450);
  expect(ID1_KEYS.filter(k=>!Object.hasOwn(idCatalog,k))).toEqual([]);
  expect(ID1_GUIDE_KEYS.length).toBe(104);
  expect(ID1_GUIDE_KEYS.filter(k=>!Object.hasOwn(en,k)||!Object.hasOwn(idCatalog,k))).toEqual([]);
 });
 it('Front ID2: the catalog covers E01 and E02 (every key of their prefixes, and classLink.open)',()=>{
  expect(ID2_KEYS.length).toBeGreaterThan(780);
  expect(ID2_KEYS.filter(k=>!Object.hasOwn(idCatalog,k))).toEqual([]);
 });
 it('Front ID1: every VIREO original is translated at once, or kept with an identical.json reason, never both',()=>{
  const english=[...Object.keys(esOriginals),...Object.keys(esIdentical.entries).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length))];
  expect(new Set(english).size).toBe(760);english.push(...ID_ONLY_ORIGINALS);
  const same=identical.entries as Record<string,string>,kept=Object.keys(same).filter(k=>k.startsWith('original:')).map(k=>k.slice('original:'.length));
  expect(english.filter(k=>!Object.hasOwn(originals,k)&&!Object.hasOwn(same,`original:${k}`))).toEqual([]);
  for(const k of kept){expect(english,k).toContain(k);expect(Object.hasOwn(originals,k),k).toBe(false);}
  expect((originals as Record<string,string>).E).toBe('BT');expect((originals as Record<string,string>).W).toBe('BB');
 });
 it('every map has its English shape: the shell and observatory maps complete, the header-name maps partial',()=>{
  for(const [id,map] of Object.entries(INDONESIAN.maps??{})){
   expect(MAP_IDS,id).toContain(id);
   const englishMap=ENGLISH_MAPS[id as MapId];expect(englishMap,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(englishMap,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
  for(const id of COMPLETE_MAPS)expect(Object.hasOwn(INDONESIAN.maps??{},id),id).toBe(true);
 });
 it('originals are normalised keys that Spanish also knows (src/i18n/es/es.test.ts checks those against the source)',()=>{
  const esSame=(key:string)=>Object.hasOwn(esIdentical.entries,`original:${key}`);
  for(const key of Object.keys(originals)){expect(normalizeOriginal(key),key).toBe(key);expect(Object.hasOwn(esOriginals,key)||esSame(key)||ID_ONLY_ORIGINALS.includes(key),key).toBe(true);}
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
