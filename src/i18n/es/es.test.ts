import {describe,expect,it} from 'vitest';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import en from '../en.json';
import es from './es.json';
import originals from './originals.json';
import glossary from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import {SPANISH} from './index';
import {manualLimitText} from '../../core/slewLimit';
import {createI18n,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {collectPairs} from '../lint/pairs';
import {PROFILES,SPANISH_VIREO_PULSAR_NAMES} from '../lint/profiles';
import {allowances,describeFindings,errorsOf,glossaryFrom,lintPair,lintPairs,reportsOf,unbalanced,type LintData,type Pair} from '../lint/rules';
import {MAP_IDS,type MapId} from '../maps';
import {APP_SHELL_MESSAGES_EN} from '../../components/AppShellMessages';
import {HELP_MENU_EN} from '../../help/HelpMessages';
import {HELP_VIEWER_EN} from '../../help/HelpViewerMessages';
import {WEB_HELP_EN} from '../../help/webHelp';
import {LANGUAGE_CHOICE_EN} from '../../components/LanguageChoiceMessages';
import {OBJECT_X_GUIDE_EN,OBJECT_X_LAB_EN,OBJECT_X_MEASURE_EN,OBJECT_X_SESSION_EN} from '../../objectx/ObjectXMessages';
import {POLISH_MESSAGES_EN} from '../../polish/PolishMessages';
import {PROJECT_LINKS_EN} from '../../help/projectLinks';
import {TOUR_EN} from '../../help/tour';
import {VARIABLE_STARS_EN} from '../../variables/VariableStarMessages';
import {CAMERA_MESSAGES_EN} from '../../camera/CameraMessages';
import {FIELD_INFO_MESSAGES_EN,FIELD_READ_DETAILS_EN,NAKED_EYE_MESSAGES_EN} from '../../observatory/FieldInfoMessages';
import {OBSERVATION_METADATA_EN} from '../../ObservationMetadataMessages';
import {OBSERVATORY_MESSAGES_EN} from '../../observatory/ObservatoryMessages';
import {QSO_LIST_MESSAGES_EN} from '../../observatory/QsoListMessages';
import {SOUND_MESSAGES_EN} from '../../sound/SoundMessages';
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
import {LOAD_SAVE_MESSAGES_EN} from '../../components/PulsarLoadSaveMessages';
import {SAVED_ROWS_MESSAGES_EN} from '../../components/PulsarSavedRowsMessages';

// Front ES1 (docs/I18N.md; plan §3.2 and §5.3 step 1): automatic checks of every Spanish string. They fail the batch; the
// independent reviewer agent then reads the strings in context. Length ratios outside 0.7–1.6 are reported, not failed.
// Front SC9: the per-string lints run on the framework of src/i18n/lint/ with the es-419 profile (profiles.ts); this file
// loads the Spanish files, keeps the Spanish structural checks (strict catalog, map parity, originals keys, the shell) and
// proves on the real glossary that the lints catch what they must.
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,camera:CAMERA_MESSAGES_EN,engineView:ENGINE_VIEW_EN,spectralRange:SPECTRAL_RANGE_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,nakedEye:NAKED_EYE_MESSAGES_EN,objectXGuide:OBJECT_X_GUIDE_EN,objectXLab:OBJECT_X_LAB_EN,objectXMeasure:OBJECT_X_MEASURE_EN,objectXSession:OBJECT_X_SESSION_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,wedge:WEDGE_MESSAGES_EN};
/** The maps translated completely (ES1: the shell; ES2: the observatory; ES3: the E01 spectrometer maps; ES4: the wedge; ES9: Object X); the others are partial until their sub-front. */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','camera','fieldInfo','fieldReadDetails','nakedEye','observationMetadata','observatory','polish','qsoList','sound','engineView','spectralRange','wedge','objectXGuide','objectXLab','objectXMeasure','objectXSession'];
// Front ES8a: the radio telescope maps (complete).
Object.assign(ENGLISH_MAPS,{radioAntenna:RADIO_ANTENNA_MESSAGES_EN,radioFinishSave:FINISH_SAVE_MESSAGES_EN,radioR1:RADIO_R1_MESSAGES_EN,radioRecordSave:RADIO_SAVE_MESSAGES_EN});
(COMPLETE_MAPS as MapId[]).push('radioAntenna','radioFinishSave','radioR1','radioRecordSave');
// Front ES8b: the pulsar analysis maps (complete).
Object.assign(ENGLISH_MAPS,{pulsar:PULSAR_MESSAGES_EN,pulsarLoadSave:LOAD_SAVE_MESSAGES_EN,pulsarSavedRows:SAVED_ROWS_MESSAGES_EN});
(COMPLETE_MAPS as MapId[]).push('pulsar','pulsarLoadSave','pulsarSavedRows');
// Front ES7: the cluster HR, Cluster Data and variable-star maps (complete).
Object.assign(ENGLISH_MAPS,{clusterHr:CLUSTER_HR_EN,clusterData:CLUSTER_DATA_MESSAGES_EN});
(COMPLETE_MAPS as MapId[]).push('clusterHr','clusterData','variableStars');
// Front ES-HELP: the help viewer's web text and OpenVireo's own help (complete).
Object.assign(ENGLISH_MAPS,{helpViewer:HELP_VIEWER_EN,webHelp:WEB_HELP_EN});
(COMPLETE_MAPS as MapId[]).push('helpViewer','webHelp');
/** ES1's area of en.json: the shell (header, menu, home and portal, toolbar, errors, instructor mode, document title). */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
/** The string literals of a TypeScript source (escapes decoded; template literals with substitutions skipped). */
export function stringLiterals(source:string):string[]{
 const out:string[]=[],ESC:Record<string,string>={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(c==='/'&&source[i+1]==='/'){i=source.indexOf('\n',i);if(i<0)break;continue;}
  if(c==='/'&&source[i+1]==='*'){i=source.indexOf('*/',i+2)+1;if(i<=0)break;continue;}
  if(c!=='\''&&c!=='"'&&c!=='`')continue;
  let value='',j=i+1,substituted=false;
  for(;j<source.length&&source[j]!==c;j++){
   if(source[j]==='\\'){const n=source[++j];if(n==='u'){const m=/^\{([0-9a-f]+)\}|^([0-9a-f]{4})/i.exec(source.slice(j+1))!;value+=String.fromCodePoint(parseInt(m[1]??m[2],16));j+=m[0].length;}else if(n==='\n'){/* line continuation */}else value+=ESC[n]??n;}
   else if(c==='`'&&source[j]==='$'&&source[j+1]==='{'){substituted=true;let depth=0;for(;j<source.length;j++){if(source[j]==='{')depth++;else if(source[j]==='}'&&--depth===0)break;}}
   else value+=source[j];
  }
  if(!substituted)out.push(value);
  i=j;
 }
 return out;
}
const PROFILE=PROFILES['es-419'];
/** The Spanish lint data: glossary.json in the framework's neutral form, identical.json and lint-allowed.json. */
const DATA:LintData={glossary:glossaryFrom(glossary,'es'),identical:identical.entries,allowed:lintAllowed.entries as LintData['allowed']};
/** Every translated string with its English source: catalog values, map leaves (functions called with sample arguments) and
 * originals (an original's English is its literal without the `context|` prefix). */
const pairs=():Pair[]=>collectPairs({catalog:es,english:en,maps:SPANISH.maps,englishMaps:ENGLISH_MAPS,originals});
/** The glossary and register findings for a text (en 'x' requires no term or name), with or without the allowances. */
const hits=(text:string,id='catalog:x',data:LintData={glossary:DATA.glossary})=>lintPair({id,en:'x',text},PROFILE,data).filter(f=>f.rule==='glossary'||f.rule==='register').map(f=>f.message);
describe('Front ES1 review 1: the lint catches what it must',()=>{
 it('finds usted, voseo, Spain-only words and unpaired ¿ ¡ with Unicode-aware boundaries',()=>{
  for(const bad of ['Haga clic aquí','Elija un objeto','Pulse el botón','Pulsá Aceptar','Abrí la cúpula','Guardá tu trabajo','Mirá esto','Guarde su trabajo','¿Tenés tiempo?','Copia su investigación','Usá el móvil','Abre el fichero'])expect(hits(bad),bad).not.toEqual([]);
  for(const good of ['Haz clic en el púlsar','Elige un objeto','Presiona el botón','Abre la cúpula','Guarda tu trabajo','Los púlsares'])expect(hits(good),good).toEqual([]);
  // A word allowed for one string only (lint-allowed.json), never for others; every allowance names a reason and is used.
  expect(hits('la próxima vez que se cargue la página','map:languageChoice.originalsNote',DATA)).toEqual([]);
  expect(hits('la próxima vez que se cargue la página','catalog:other',DATA)).not.toEqual([]);
  expect(hits('Haga clic','map:languageChoice.originalsNote',DATA)).not.toEqual([]);
  // Front ES8a review: only the exact English VIREO names with "Pulsar" are exempt, never the verb or a lower-case form.
  expect(PROFILE.forbiddenSetAside).toBe(SPANISH_VIREO_PULSAR_NAMES);
  expect(hits('Abre Parámetros de púlsares (Pulsar Parameters) o Archivo ▸ Lista de púlsares... [Pulsar List...]',undefined,DATA)).toEqual([]);
  expect(hits('Abre Parámetros de púlsares (Pulsar Parameters) y pulsar el botón',undefined,DATA)).not.toEqual([]);
  expect(hits('Abre el pulsar (Pulsar Analysis)',undefined,DATA)).not.toEqual([]);
  expect(hits('(pulsar parameters)',undefined,DATA)).not.toEqual([]);
  // usted and ustedes fail in every string, even an identical one or one with an allowance (es.test.ts's ASCII edges kept).
  for(const text of ['Abra usted','Ustedes abren','ustedés'])expect(lintPair({id:'catalog:x',en:text,text},PROFILE,{...DATA,identical:{'catalog:x':'a test string kept on purpose'}}).map(f=>f.rule),text).toContain('register');
  expect(lintPair({id:'catalog:x',en:'x',text:'Traducción oficial'},PROFILE,DATA).map(f=>f.rule)).toContain('claim');
  const [q,e]=PROFILE.pairs;
  expect(unbalanced('¿Cambiar el idioma?',q)).toBeNull();expect(unbalanced('Cambiar el idioma?',q)).toBe('? without ¿');expect(unbalanced('¿Cambiar el idioma.',q)).toBe('¿ without ?');
  expect(unbalanced('presiona la tecla ? o abre ?lang=es',q)).toBeNull();expect(unbalanced('¡Listo!',e)).toBeNull();expect(unbalanced('¿Restaurar {file}?',q)).toBeNull();expect(unbalanced('Restaurar {file}?',q)).toBe('? without ¿');expect(unbalanced('¡Listo.',e)).toBe('¡ without !');
 });
 it('Front SC9: an allowance exempts only a forbidden glossary word, never usted, a claim or a forbidden pattern',()=>{
  // es.test.ts applied lint-allowed.json to the glossary's forbidden words only; the framework accepts any finding whose
  // matched text an allowance names, so this keeps the old reach.
  const byId=new Map(pairs().map(p=>[p.id,p]));
  for(const [id,a] of Object.entries(DATA.allowed??{})){
   const p=byId.get(id);if(!p)continue;// allowances() reports it
   const raw=lintPair(p,PROFILE,{...DATA,allowed:{}});
   for(const w of a.words??[])for(const f of raw.filter(f=>f.match!==undefined&&f.match.toLocaleLowerCase('es')===w.toLocaleLowerCase('es')))expect(f.rule==='glossary'&&f.message.startsWith('forbidden «'),`${id}: «${w}» exempts ${f.rule} ${f.message}`).toBe(true);
  }
 });
});
describe('Front ES1: the Spanish (es-419) catalog, maps and originals',()=>{
 it('Front ES-REL: the catalog is complete and strict: every en.json key, the same {params}, strings only, no extra key',()=>{
  // Strict mode (no fallback) is what createI18n checks at compile time. The split bundle still builds each module with the
  // English fallback (src/i18n/active.ts), so this static check is where strictness lives (docs/I18N.md, ES-REL).
  expect(()=>createI18n(es as Record<MessageKey,string>,'es-419')).not.toThrow();
  expect(Object.keys(en).filter(k=>!Object.hasOwn(es,k))).toEqual([]);
  for(const key of Object.keys(es))expect(Object.hasOwn(en,key),key).toBe(true);
 });
 it('Front ES-REL: every pickMessages id has a complete Spanish map with the English shape (keys, kinds, {params}, arities)',()=>{
  for(const id of Object.keys(SPANISH.maps??{}))expect(MAP_IDS,id).toContain(id);
  expect(MAP_IDS.filter(id=>!Object.hasOwn(SPANISH.maps??{},id))).toEqual([]);
  expect(MAP_IDS.filter(id=>!COMPLETE_MAPS.includes(id))).toEqual([]);
  for(const [id,map] of Object.entries(SPANISH.maps??{})){
   const english=ENGLISH_MAPS[id as MapId];expect(english,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(english,map),id).toEqual([]);
  }
 });
 it('originals are keyed by a normalised literal that exists in the source, so stale keys fail',()=>{
  const literals=new Set<string>();
  // Front ES2: a small tokenizer reads '…', "…" and `…` literals (without substitutions) with their escapes decoded and skips
  // comments, so \r\n texts and quotes inside other literals are read exactly.
  (function scan(dir:string){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()){if(!['i18n'].includes(e.name))scan(f);}else if(/\.tsx?$/.test(e.name)&&!/\.test\.ts$/.test(e.name))for(const text of stringLiterals(readFileSync(f,'utf8')))literals.add(normalizeOriginal(text));}})(path.resolve(import.meta.dirname,'../..'));
  // Front ES2: VIREO texts the core composes from literals (the manual slew-limit box) are keyed whole.
  for(const d of ['N','S','E','W'] as const)literals.add(manualLimitText(d));
  for(const key of Object.keys(originals))expect(literals.has(key.replace(/^[\w-]+\|/,'')),key).toBe(true);
  for(const key of Object.keys(originals))expect(normalizeOriginal(key),key).toBe(key);
 });
 it('the shell (ES1\'s area) is 100 % Spanish: catalog keys and the shell maps',()=>{
  expect(SHELL_KEYS.filter(k=>!Object.hasOwn(es,k))).toEqual([]);
  expect(SHELL_KEYS.length).toBeGreaterThan(120);
  for(const id of COMPLETE_MAPS)expect(mapParity(ENGLISH_MAPS[id],SPANISH.maps?.[id]),id).toEqual([]);
 });
});
describe('Front SC9: the Spanish strings pass the es-419 lints (src/i18n/lint/)',()=>{
 it('identical only with a reason, glossary terms, names and forbidden words, usted, claims, glyphs, ¿? ¡!, placeholders, no HTML, digits, NFC, no invisible characters, and every allowance still needed',()=>{
  const all=pairs(),findings=lintPairs(all,PROFILE,DATA);
  expect(all.length).toBeGreaterThan(6000);
  expect(describeFindings(errorsOf(findings))).toEqual([]);
  expect(allowances(all,PROFILE,DATA)).toEqual([]);
  const ratios=describeFindings(reportsOf(findings));
  if(ratios.length)console.info(`Length ratio outside 0.7–1.6 in grapheme clusters (reported for the reviewer, not a failure):\n${ratios.join('\n')}`);
 });
});
