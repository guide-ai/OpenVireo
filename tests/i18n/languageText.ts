import en from '../../src/i18n/en.json' with {type:'json'};
import es from '../../src/i18n/es/es.json' with {type:'json'};
import esOriginals from '../../src/i18n/es/originals.json' with {type:'json'};
import pt from '../../src/i18n/pt-br/pt-br.json' with {type:'json'};
import ptOriginals from '../../src/i18n/pt-br/originals.json' with {type:'json'};
import {APP_SHELL_ES} from '../../src/i18n/es/maps/appShell';
import {HELP_MENU_ES} from '../../src/i18n/es/maps/helpMenu';
import {PROJECT_LINKS_ES} from '../../src/i18n/es/maps/projectLinks';
import {TOUR_ES} from '../../src/i18n/es/maps/tour';
import {LANGUAGE_CHOICE_ES} from '../../src/i18n/es/maps/languageChoice';
import {APP_SHELL_PT} from '../../src/i18n/pt-br/maps/appShell';
import {HELP_MENU_PT} from '../../src/i18n/pt-br/maps/helpMenu';
import {PROJECT_LINKS_PT} from '../../src/i18n/pt-br/maps/projectLinks';
import {TOUR_PT} from '../../src/i18n/pt-br/maps/tour';
import {LANGUAGE_CHOICE_PT} from '../../src/i18n/pt-br/maps/languageChoice';
import {CAMERA_ES} from '../../src/i18n/es/maps/camera';
import {FIELD_INFO_ES} from '../../src/i18n/es/maps/fieldInfo';
import {FIELD_READ_DETAILS_ES} from '../../src/i18n/es/maps/fieldReadDetails';
import {NAKED_EYE_ES} from '../../src/i18n/es/maps/nakedEye';
import {OBJECT_X_LAB_ES} from '../../src/i18n/es/maps/objectXLab';
import {OBSERVATION_METADATA_ES} from '../../src/i18n/es/maps/observationMetadata';
import {OBSERVATORY_ES} from '../../src/i18n/es/maps/observatory';
import {POLISH_ES} from '../../src/i18n/es/maps/polish';
import {QSO_LIST_ES} from '../../src/i18n/es/maps/qsoList';
import {SOUND_ES} from '../../src/i18n/es/maps/sound';
import {VARIABLE_STARS_ES} from '../../src/i18n/es/maps/variableStars';
import {CAMERA_PT} from '../../src/i18n/pt-br/maps/camera';
import {FIELD_INFO_PT} from '../../src/i18n/pt-br/maps/fieldInfo';
import {FIELD_READ_DETAILS_PT} from '../../src/i18n/pt-br/maps/fieldReadDetails';
import {NAKED_EYE_PT} from '../../src/i18n/pt-br/maps/nakedEye';
import {OBJECT_X_LAB_PT} from '../../src/i18n/pt-br/maps/objectXLab';
import {OBSERVATION_METADATA_PT} from '../../src/i18n/pt-br/maps/observationMetadata';
import {OBSERVATORY_PT} from '../../src/i18n/pt-br/maps/observatory';
import {POLISH_PT} from '../../src/i18n/pt-br/maps/polish';
import {QSO_LIST_PT} from '../../src/i18n/pt-br/maps/qsoList';
import {SOUND_PT} from '../../src/i18n/pt-br/maps/sound';
import {VARIABLE_STARS_PT} from '../../src/i18n/pt-br/maps/variableStars';
import fr from '../../src/i18n/fr/fr.json' with {type:'json'};
import frOriginals from '../../src/i18n/fr/originals.json' with {type:'json'};
import {APP_SHELL_FR} from '../../src/i18n/fr/maps/appShell';
import {HELP_MENU_FR} from '../../src/i18n/fr/maps/helpMenu';
import {PROJECT_LINKS_FR} from '../../src/i18n/fr/maps/projectLinks';
import {TOUR_FR} from '../../src/i18n/fr/maps/tour';
import {LANGUAGE_CHOICE_FR} from '../../src/i18n/fr/maps/languageChoice';
import {OBJECT_X_LAB_FR} from '../../src/i18n/fr/maps/objectXLab';
import {POLISH_FR} from '../../src/i18n/fr/maps/polish';
import {VARIABLE_STARS_FR} from '../../src/i18n/fr/maps/variableStars';
import {CAMERA_FR} from '../../src/i18n/fr/maps/camera';
import {FIELD_INFO_FR} from '../../src/i18n/fr/maps/fieldInfo';
import {FIELD_READ_DETAILS_FR} from '../../src/i18n/fr/maps/fieldReadDetails';
import {NAKED_EYE_FR} from '../../src/i18n/fr/maps/nakedEye';
import {OBSERVATION_METADATA_FR} from '../../src/i18n/fr/maps/observationMetadata';
import {OBSERVATORY_FR} from '../../src/i18n/fr/maps/observatory';
import {QSO_LIST_FR} from '../../src/i18n/fr/maps/qsoList';
import {SOUND_FR} from '../../src/i18n/fr/maps/sound';
import {LANGUAGES,failureNotice,type LanguageEntry} from '../../src/i18n/languages';
import type {Translation} from '../../src/i18n/maps';
import type {APP_SHELL_MESSAGES_EN} from '../../src/components/AppShellMessages';
import type {HELP_MENU_EN} from '../../src/help/HelpMessages';
import type {PROJECT_LINKS_EN} from '../../src/help/projectLinks';
import type {TOUR_EN} from '../../src/help/tour';
import type {LANGUAGE_CHOICE_EN} from '../../src/components/LanguageChoiceMessages';

// Front PT0 (plan front-i18n-pt-br.md §6): the translated languages' own text for the language-parameterised specs, read from each
// language's sources (src/i18n/<dir>/), so a spec names `L.catalog['sky.title']` instead of a hard-coded Spanish literal. A language
// before its release (pt-BR) is partial: `text` falls back to the English, as the page does. Each PT front adds the maps its area
// needs. Static imports only: Playwright cannot glob, and the bundles' index.ts files import JSON without an import attribute.
export type ShellMaps=Readonly<{
 appShell:Translation<typeof APP_SHELL_MESSAGES_EN>;helpMenu:Translation<typeof HELP_MENU_EN>;projectLinks:Translation<typeof PROJECT_LINKS_EN>;
 tour:Translation<typeof TOUR_EN>;languageChoice:Translation<typeof LANGUAGE_CHOICE_EN>;
}>;
/** Front FR0 (plan front-i18n-fr.md §1.2 #1): the areas a language-parameterised spec covers. A language runs a spec only once that
 * spec's area is complete for it (`done`), so registering a language before its release (French) does not run the walks of areas it
 * has not translated yet. Each front adds its area to its language's `done`. */
export type Area='shell'|'observatory'|'e01'|'e02'|'e03'|'e04'|'e05'|'radio'|'e06'|'e08'|'help';
export const AREAS:readonly Area[]=['shell','observatory','e01','e02','e03','e04','e05','radio','e06','e08','help'];
export type LanguageText=Readonly<{
 tag:string;entry:LanguageEntry;
 /** The areas whose specs this language runs (every area for a released language). */
 done:ReadonlySet<Area>;
 /** The catalog (partial before the release) and VIREO's originals. */
 catalog:Readonly<Record<string,string>>;originals:Readonly<Record<string,string>>;
 maps:ShellMaps;
 /** Front PT1: the language's maps that the observatory walk renders (tests/i18n/observatory.spec.ts), shell maps included. Only
  * their text leaves are read. */
 observatoryMaps:readonly unknown[];
 /** Letters of this language that English text never has: one in a written file means the screen language reached it. */
 letters:RegExp;
 /** The query that opens this language in its own browser (tests/fixtures/language.ts contextLocale): none for a released language
  * (Spanish since ES-REL, Brazilian Portuguese since PT-REL). */
 query:string;
 /** An English catalog text in this language: its translation, or the English itself where a partial language has none. */
 text:(english:string)=>string;
 notices:Readonly<{language:ReturnType<typeof failureNotice>&{};area:ReturnType<typeof failureNotice>&{}}>;
}>;
const E=en as Record<string,string>;
function language(tag:string,catalog:Record<string,string>,originals:Record<string,string>,maps:ShellMaps,observatoryMaps:readonly unknown[],letters:RegExp,query:string,done:readonly Area[]=AREAS):LanguageText{
 const entry=LANGUAGES.find(l=>l.tag===tag)!,byEnglish=new Map(Object.entries(E).filter(([k])=>Object.hasOwn(catalog,k)).map(([k,v])=>[v,catalog[k]]));
 const text=(english:string)=>{const v=byEnglish.get(english);if(v!==undefined)return v;if(entry.released)throw new Error(`No ${entry.englishName} for “${english}”`);return english;};
 if(entry.released&&done.length!==AREAS.length)throw new Error(`tests/i18n/languageText.ts: ${tag} is released, so every area is done`);
 return Object.freeze({tag,entry,done:new Set(done),catalog,originals,maps,observatoryMaps,letters,query,text,notices:{language:failureNotice('language',tag)!,area:failureNotice('area',tag)!}});
}
export const SPANISH_TEXT=language('es-419',es,esOriginals,{appShell:APP_SHELL_ES,helpMenu:HELP_MENU_ES,projectLinks:PROJECT_LINKS_ES,tour:TOUR_ES,languageChoice:LANGUAGE_CHOICE_ES},
 [APP_SHELL_ES,CAMERA_ES,FIELD_INFO_ES,FIELD_READ_DETAILS_ES,HELP_MENU_ES,LANGUAGE_CHOICE_ES,NAKED_EYE_ES,OBJECT_X_LAB_ES,OBSERVATION_METADATA_ES,OBSERVATORY_ES,POLISH_ES,PROJECT_LINKS_ES,QSO_LIST_ES,SOUND_ES,TOUR_ES,VARIABLE_STARS_ES],/[áéíóúñ¿¡]/,'');
export const PORTUGUESE_TEXT=language('pt-BR',pt,ptOriginals,{appShell:APP_SHELL_PT,helpMenu:HELP_MENU_PT,projectLinks:PROJECT_LINKS_PT,tour:TOUR_PT,languageChoice:LANGUAGE_CHOICE_PT},
 [APP_SHELL_PT,CAMERA_PT,FIELD_INFO_PT,FIELD_READ_DETAILS_PT,HELP_MENU_PT,LANGUAGE_CHOICE_PT,NAKED_EYE_PT,OBJECT_X_LAB_PT,OBSERVATION_METADATA_PT,OBSERVATORY_PT,POLISH_PT,PROJECT_LINKS_PT,QSO_LIST_PT,SOUND_PT,TOUR_PT,VARIABLE_STARS_PT],/[ãõçâêôàáéíóú]/i,'');
/** Front FR0: French before its release, behind `?lang=fr` (an en-US browser: tests/fixtures/language.ts contextLocale). FR0
 * translated the shell, FR1 the observatory and all of VIREO's originals, FR2 exercises E01 and E02, FR3 exercise E03, FR4 exercises E04 and E05, FR5 the radio telescope, FR-HELP the help files and help maps; FR6 adds its areas to `done` and
 * their maps below. Its letters include « » and U+202F, which English text never has. */
export const FRENCH_TEXT=language('fr',fr,frOriginals,{appShell:APP_SHELL_FR,helpMenu:HELP_MENU_FR,projectLinks:PROJECT_LINKS_FR,tour:TOUR_FR,languageChoice:LANGUAGE_CHOICE_FR},
 [APP_SHELL_FR,CAMERA_FR,FIELD_INFO_FR,FIELD_READ_DETAILS_FR,HELP_MENU_FR,LANGUAGE_CHOICE_FR,NAKED_EYE_FR,OBJECT_X_LAB_FR,OBSERVATION_METADATA_FR,OBSERVATORY_FR,POLISH_FR,PROJECT_LINKS_FR,QSO_LIST_FR,SOUND_FR,TOUR_FR,VARIABLE_STARS_FR],/[àâæçéèêëîïôœùûüÿ«»\u202f]/i,'?lang=fr',['shell','observatory','e01','e02','e03','e04','e05','radio','help']);
/** Every translated language of the registry, in its order (a test fails if a registered language has no text here). */
export const TRANSLATED:readonly LanguageText[]=Object.freeze([SPANISH_TEXT,PORTUGUESE_TEXT,FRENCH_TEXT]);
/** Front FR0: the languages that run the specs of `area` (those whose `done` has it), in registry order. */
export const translatedFor=(area:Area):readonly LanguageText[]=>TRANSLATED.filter(l=>l.done.has(area));
export const textOf=(tag:string):LanguageText=>{const t=TRANSLATED.find(l=>l.tag===tag);if(!t)throw new Error(`No test text for ${tag}`);return t;};
if(LANGUAGES.some(l=>!TRANSLATED.some(t=>t.tag===l.tag)))throw new Error('tests/i18n/languageText.ts: a registered language has no test text');

// Front PT2: the maps the E01 and E02 walks render beyond the observatory's (tests/i18n/e01.spec.ts, e02.spec.ts), per language. Only
// their text leaves are read (the View original tests' web text).
import {ENGINE_VIEW_ES} from '../../src/i18n/es/maps/engineView';
import {SPECTRAL_RANGE_ES} from '../../src/i18n/es/maps/spectralRange';
import {WEDGE_ES} from '../../src/i18n/es/maps/wedge';
import {ENGINE_VIEW_PT} from '../../src/i18n/pt-br/maps/engineView';
import {SPECTRAL_RANGE_PT} from '../../src/i18n/pt-br/maps/spectralRange';
import {WEDGE_PT} from '../../src/i18n/pt-br/maps/wedge';
import {ENGINE_VIEW_FR} from '../../src/i18n/fr/maps/engineView';
import {SPECTRAL_RANGE_FR} from '../../src/i18n/fr/maps/spectralRange';
import {WEDGE_FR} from '../../src/i18n/fr/maps/wedge';
export type E01E02Maps=Readonly<{engineView:unknown;spectralRange:unknown;wedge:unknown;observatory:unknown;polish:unknown}>;
export const E01_E02_MAPS:Readonly<Record<string,E01E02Maps>>=Object.freeze({
 'es-419':{engineView:ENGINE_VIEW_ES,spectralRange:SPECTRAL_RANGE_ES,wedge:WEDGE_ES,observatory:OBSERVATORY_ES,polish:POLISH_ES},
 'pt-BR':{engineView:ENGINE_VIEW_PT,spectralRange:SPECTRAL_RANGE_PT,wedge:WEDGE_PT,observatory:OBSERVATORY_PT,polish:POLISH_PT},
 // Front FR2: French (its ?lang=fr preview).
 fr:{engineView:ENGINE_VIEW_FR,spectralRange:SPECTRAL_RANGE_FR,wedge:WEDGE_FR,observatory:OBSERVATORY_FR,polish:POLISH_FR},
});
export const e01e02Maps=(tag:string):E01E02Maps=>{const m=E01_E02_MAPS[tag];if(!m)throw new Error(`No E01/E02 maps for ${tag}`);return m;};

// Front PT4: the maps the E04 and E05 walks read beyond the catalog (tests/i18n/e04.spec.ts, e05.spec.ts), per language: the View
// original test's web text (E04) and the cluster HR tools' own notes (E05). Only their text leaves are read.
import {CLUSTER_HR_ES} from '../../src/i18n/es/maps/clusterHr';
import {CLUSTER_HR_PT} from '../../src/i18n/pt-br/maps/clusterHr';
import {CLUSTER_HR_FR} from '../../src/i18n/fr/maps/clusterHr';
import type {CLUSTER_HR_EN} from '../../src/clusters/ClusterHrMessages';
export type E04E05Maps=Readonly<{spectralRange:unknown;observatory:unknown;polish:unknown;camera:unknown;sound:unknown;clusterHr:Translation<typeof CLUSTER_HR_EN>}>;
export const E04_E05_MAPS:Readonly<Record<string,E04E05Maps>>=Object.freeze({
 'es-419':{spectralRange:SPECTRAL_RANGE_ES,observatory:OBSERVATORY_ES,polish:POLISH_ES,camera:CAMERA_ES,sound:SOUND_ES,clusterHr:CLUSTER_HR_ES},
 'pt-BR':{spectralRange:SPECTRAL_RANGE_PT,observatory:OBSERVATORY_PT,polish:POLISH_PT,camera:CAMERA_PT,sound:SOUND_PT,clusterHr:CLUSTER_HR_PT},
 // Front FR4: French (its ?lang=fr preview).
 fr:{spectralRange:SPECTRAL_RANGE_FR,observatory:OBSERVATORY_FR,polish:POLISH_FR,camera:CAMERA_FR,sound:SOUND_FR,clusterHr:CLUSTER_HR_FR},
});
export const e04e05Maps=(tag:string):E04E05Maps=>{const m=E04_E05_MAPS[tag];if(!m)throw new Error(`No E04/E05 maps for ${tag}`);return m;};
// Front PT5: the maps and identical texts the radio telescope walk reads beyond the catalog and originals (tests/i18n/radio.spec.ts),
// per language: the control panel's map and the receiver's Record Save map (their text is web text in the View original test),
// and identical.json's `original:` rows (VIREO texts kept the same in that language).
import {RADIO_ANTENNA_ES} from '../../src/i18n/es/maps/radioAntenna';
import {RADIO_RECORD_SAVE_ES} from '../../src/i18n/es/maps/radioRecordSave';
import {RADIO_ANTENNA_PT} from '../../src/i18n/pt-br/maps/radioAntenna';
import {RADIO_RECORD_SAVE_PT} from '../../src/i18n/pt-br/maps/radioRecordSave';
import {RADIO_ANTENNA_FR} from '../../src/i18n/fr/maps/radioAntenna';
import {RADIO_RECORD_SAVE_FR} from '../../src/i18n/fr/maps/radioRecordSave';
import esIdentical from '../../src/i18n/es/identical.json' with {type:'json'};
import ptIdentical from '../../src/i18n/pt-br/identical.json' with {type:'json'};
import frIdentical from '../../src/i18n/fr/identical.json' with {type:'json'};
import type {RADIO_ANTENNA_MESSAGES_EN} from '../../src/components/RadioAntennaMessages';
import type {RADIO_SAVE_MESSAGES_EN} from '../../src/components/RadioRecordSaveMessages';
export type RadioMaps=Readonly<{radioAntenna:Translation<typeof RADIO_ANTENNA_MESSAGES_EN>;radioRecordSave:Translation<typeof RADIO_SAVE_MESSAGES_EN>;identical:Readonly<Record<string,string>>}>;
export const RADIO_MAPS:Readonly<Record<string,RadioMaps>>=Object.freeze({
 'es-419':{radioAntenna:RADIO_ANTENNA_ES,radioRecordSave:RADIO_RECORD_SAVE_ES,identical:esIdentical.entries},
 'pt-BR':{radioAntenna:RADIO_ANTENNA_PT,radioRecordSave:RADIO_RECORD_SAVE_PT,identical:ptIdentical.entries},
 // Front FR5: French (its ?lang=fr preview).
 fr:{radioAntenna:RADIO_ANTENNA_FR,radioRecordSave:RADIO_RECORD_SAVE_FR,identical:frIdentical.entries},
});
export const radioMaps=(tag:string):RadioMaps=>{const m=RADIO_MAPS[tag];if(!m)throw new Error(`No radio maps for ${tag}`);return m;};
// Front PT6: the maps the E06 and E08 walks read beyond the catalog and originals (tests/i18n/e06.spec.ts, e08.spec.ts), per
// language: the pulsar analysis maps (the View original test's web text and the checks around the VIREO captions), and the Object X
// lab, guide and measuring maps with the camera and sound maps (the buttons the E08 walk clicks, the verdict, the web text).
import {PULSAR_ES} from '../../src/i18n/es/maps/pulsar';
import {SAVED_ROWS_ES} from '../../src/i18n/es/maps/pulsarSavedRows';
import {LOAD_SAVE_ES} from '../../src/i18n/es/maps/pulsarLoadSave';
import {OBJECT_X_GUIDE_ES} from '../../src/i18n/es/maps/objectXGuide';
import {OBJECT_X_MEASURE_ES} from '../../src/i18n/es/maps/objectXMeasure';
import {PULSAR_PT} from '../../src/i18n/pt-br/maps/pulsar';
import {SAVED_ROWS_PT} from '../../src/i18n/pt-br/maps/pulsarSavedRows';
import {LOAD_SAVE_PT} from '../../src/i18n/pt-br/maps/pulsarLoadSave';
import {OBJECT_X_GUIDE_PT} from '../../src/i18n/pt-br/maps/objectXGuide';
import {OBJECT_X_MEASURE_PT} from '../../src/i18n/pt-br/maps/objectXMeasure';
import type {PULSAR_MESSAGES_EN} from '../../src/components/PulsarMessages';
import type {SAVED_ROWS_MESSAGES_EN} from '../../src/components/PulsarSavedRowsMessages';
import type {LOAD_SAVE_MESSAGES_EN} from '../../src/components/PulsarLoadSaveMessages';
import type {OBJECT_X_GUIDE_EN,OBJECT_X_LAB_EN,OBJECT_X_MEASURE_EN} from '../../src/objectx/ObjectXMessages';
import type {CAMERA_MESSAGES_EN} from '../../src/camera/CameraMessages';
export type E06Maps=Readonly<{pulsar:Translation<typeof PULSAR_MESSAGES_EN>;pulsarSavedRows:Translation<typeof SAVED_ROWS_MESSAGES_EN>;pulsarLoadSave:Translation<typeof LOAD_SAVE_MESSAGES_EN>}>;
export const E06_MAPS:Readonly<Record<string,E06Maps>>=Object.freeze({
 'es-419':{pulsar:PULSAR_ES,pulsarSavedRows:SAVED_ROWS_ES,pulsarLoadSave:LOAD_SAVE_ES},
 'pt-BR':{pulsar:PULSAR_PT,pulsarSavedRows:SAVED_ROWS_PT,pulsarLoadSave:LOAD_SAVE_PT},
});
export const e06Maps=(tag:string):E06Maps=>{const m=E06_MAPS[tag];if(!m)throw new Error(`No E06 maps for ${tag}`);return m;};
export type E08Maps=Readonly<{objectXLab:Translation<typeof OBJECT_X_LAB_EN>;objectXGuide:Translation<typeof OBJECT_X_GUIDE_EN>;objectXMeasure:Translation<typeof OBJECT_X_MEASURE_EN>;camera:Translation<typeof CAMERA_MESSAGES_EN>;sound:unknown}>;
export const E08_MAPS:Readonly<Record<string,E08Maps>>=Object.freeze({
 'es-419':{objectXLab:OBJECT_X_LAB_ES,objectXGuide:OBJECT_X_GUIDE_ES,objectXMeasure:OBJECT_X_MEASURE_ES,camera:CAMERA_ES,sound:SOUND_ES},
 'pt-BR':{objectXLab:OBJECT_X_LAB_PT,objectXGuide:OBJECT_X_GUIDE_PT,objectXMeasure:OBJECT_X_MEASURE_PT,camera:CAMERA_PT,sound:SOUND_PT},
});
export const e08Maps=(tag:string):E08Maps=>{const m=E08_MAPS[tag];if(!m)throw new Error(`No E08 maps for ${tag}`);return m;};
// Front PT-HELP: what the help spec (tests/i18n/help.spec.ts) reads per language beyond the catalog and originals: the help
// viewer's map and OpenVireo's own help map, and the few words of the translated help files and their viewer that the spec looks
// for on screen (each is in that language's src/i18n/<dir>/help module or VIREO-name originals).
import {HELP_VIEWER_ES} from '../../src/i18n/es/maps/helpViewer';
import {WEB_HELP_ES} from '../../src/i18n/es/maps/webHelp';
import {HELP_VIEWER_PT} from '../../src/i18n/pt-br/maps/helpViewer';
import {WEB_HELP_PT} from '../../src/i18n/pt-br/maps/webHelp';
import {HELP_VIEWER_FR} from '../../src/i18n/fr/maps/helpViewer';
import {WEB_HELP_FR} from '../../src/i18n/fr/maps/webHelp';
import type {HELP_VIEWER_EN} from '../../src/help/HelpViewerMessages';
import type {WEB_HELP_EN} from '../../src/help/webHelp';
export type HelpText=Readonly<{
 helpViewer:Translation<typeof HELP_VIEWER_EN>;webHelp:Translation<typeof WEB_HELP_EN>;
 /** PULSRHLP.LST's first row as the viewer lists it, the Exit Observatory reminder's question line, and CLASSHLP's texts the
  * spec opens, searches and checks: the first words of Load Spectrum, the row and words of the search, the classification
  * window's Controls row, and SPECLNS.TXT's Ca II K line text. */
 pulsarFirstRow:string;reminderQuestion:string;loadSpectrumText:string;
 searchRow:RegExp;searchQuery:string;searchHit:string;controlsRow:RegExp;lineHelpText:string;
}>;
export const HELP_TEXT:Readonly<Record<string,HelpText>>=Object.freeze({
 'es-419':{helpViewer:HELP_VIEWER_ES,webHelp:WEB_HELP_ES,pulsarFirstRow:'-Operaciones básicas-',reminderQuestion:'¿SEGURO que terminaste por completo este ejercicio?',
  loadSpectrumText:'Para cargar un espectro',searchRow:/Medir y marcar/,searchQuery:'POSICION VERTICAL',searchHit:'posición vertical',controlsRow:/Controles/,lineHelpText:'Visible por primera vez alrededor de A0'},
 'pt-BR':{helpViewer:HELP_VIEWER_PT,webHelp:WEB_HELP_PT,pulsarFirstRow:'-Operações básicas-',reminderQuestion:'Você tem CERTEZA de que concluiu totalmente este exercício?',
  loadSpectrumText:'Para carregar um espectro',searchRow:/Medir e marcar/,searchQuery:'POSICAO VERTICAL',searchHit:'posição vertical',controlsRow:/Controles/,lineHelpText:'Visível pela primeira vez em torno de A0'},
 // Front FR-HELP: the search query types a straight apostrophe and no accent; the translation's fold finds «c’est … verticale».
 'fr':{helpViewer:HELP_VIEWER_FR,webHelp:WEB_HELP_FR,pulsarFirstRow:'-Opérations de base-',reminderQuestion:'Avez-vous VRAIMENT terminé complètement cet exercice\u202f?',
  loadSpectrumText:'Pour charger un spectre à classer',searchRow:/Mesurer et marquer/,searchQuery:"C'EST LA POSITION VERTICALE",searchHit:'c’est la position verticale',controlsRow:/Commandes/,lineHelpText:'Visible pour la première fois vers A0'},
});
export const helpText=(tag:string):HelpText=>{const m=HELP_TEXT[tag];if(!m)throw new Error(`No help text for ${tag}`);return m;};
