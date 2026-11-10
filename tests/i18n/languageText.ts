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
export type LanguageText=Readonly<{
 tag:string;entry:LanguageEntry;
 /** The catalog (partial before the release) and VIREO's originals. */
 catalog:Readonly<Record<string,string>>;originals:Readonly<Record<string,string>>;
 maps:ShellMaps;
 /** Front PT1: the language's maps that the observatory walk renders (tests/i18n/observatory.spec.ts), shell maps included. Only
  * their text leaves are read. */
 observatoryMaps:readonly unknown[];
 /** Letters of this language that English text never has: one in a written file means the screen language reached it. */
 letters:RegExp;
 /** The query that opens this language in a browser of another language (the specs' es-MX browser): none for Spanish there. */
 query:string;
 /** An English catalog text in this language: its translation, or the English itself where a partial language has none. */
 text:(english:string)=>string;
 notices:Readonly<{language:ReturnType<typeof failureNotice>&{};area:ReturnType<typeof failureNotice>&{}}>;
}>;
const E=en as Record<string,string>;
function language(tag:string,catalog:Record<string,string>,originals:Record<string,string>,maps:ShellMaps,observatoryMaps:readonly unknown[],letters:RegExp,query:string):LanguageText{
 const entry=LANGUAGES.find(l=>l.tag===tag)!,byEnglish=new Map(Object.entries(E).filter(([k])=>Object.hasOwn(catalog,k)).map(([k,v])=>[v,catalog[k]]));
 const text=(english:string)=>{const v=byEnglish.get(english);if(v!==undefined)return v;if(entry.released)throw new Error(`No ${entry.englishName} for “${english}”`);return english;};
 return Object.freeze({tag,entry,catalog,originals,maps,observatoryMaps,letters,query,text,notices:{language:failureNotice('language',tag)!,area:failureNotice('area',tag)!}});
}
export const SPANISH_TEXT=language('es-419',es,esOriginals,{appShell:APP_SHELL_ES,helpMenu:HELP_MENU_ES,projectLinks:PROJECT_LINKS_ES,tour:TOUR_ES,languageChoice:LANGUAGE_CHOICE_ES},
 [APP_SHELL_ES,CAMERA_ES,FIELD_INFO_ES,FIELD_READ_DETAILS_ES,HELP_MENU_ES,LANGUAGE_CHOICE_ES,NAKED_EYE_ES,OBJECT_X_LAB_ES,OBSERVATION_METADATA_ES,OBSERVATORY_ES,POLISH_ES,PROJECT_LINKS_ES,QSO_LIST_ES,SOUND_ES,TOUR_ES,VARIABLE_STARS_ES],/[áéíóúñ¿¡]/,'');
export const PORTUGUESE_TEXT=language('pt-BR',pt,ptOriginals,{appShell:APP_SHELL_PT,helpMenu:HELP_MENU_PT,projectLinks:PROJECT_LINKS_PT,tour:TOUR_PT,languageChoice:LANGUAGE_CHOICE_PT},
 [APP_SHELL_PT,CAMERA_PT,FIELD_INFO_PT,FIELD_READ_DETAILS_PT,HELP_MENU_PT,LANGUAGE_CHOICE_PT,NAKED_EYE_PT,OBJECT_X_LAB_PT,OBSERVATION_METADATA_PT,OBSERVATORY_PT,POLISH_PT,PROJECT_LINKS_PT,QSO_LIST_PT,SOUND_PT,TOUR_PT,VARIABLE_STARS_PT],/[ãõçâêôàáéíóú]/i,'?lang=pt-BR');
/** Every translated language of the registry, in its order (a test fails if a registered language has no text here). */
export const TRANSLATED:readonly LanguageText[]=Object.freeze([SPANISH_TEXT,PORTUGUESE_TEXT]);
export const textOf=(tag:string):LanguageText=>{const t=TRANSLATED.find(l=>l.tag===tag);if(!t)throw new Error(`No test text for ${tag}`);return t;};
if(LANGUAGES.some(l=>!TRANSLATED.some(t=>t.tag===l.tag)))throw new Error('tests/i18n/languageText.ts: a registered language has no test text');
