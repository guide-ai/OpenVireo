import type {LocaleBundle} from '../catalog';
import messages from './ru.json';
import originals from './originals.json';
import {APP_SHELL_RU} from './maps/appShell';
import {HELP_MENU_RU} from './maps/helpMenu';
import {LANGUAGE_CHOICE_RU} from './maps/languageChoice';
import {OBJECT_X_LAB_RU} from './maps/objectXLab';
import {POLISH_RU} from './maps/polish';
import {PROJECT_LINKS_RU} from './maps/projectLinks';
import {TOUR_RU} from './maps/tour';
import {VARIABLE_STARS_RU} from './maps/variableStars';
import {CAMERA_RU} from './maps/camera';
import {FIELD_INFO_RU} from './maps/fieldInfo';
import {FIELD_READ_DETAILS_RU} from './maps/fieldReadDetails';
import {NAKED_EYE_RU} from './maps/nakedEye';
import {OBSERVATION_METADATA_RU} from './maps/observationMetadata';
import {OBSERVATORY_RU} from './maps/observatory';
import {QSO_LIST_RU} from './maps/qsoList';
import {SOUND_RU} from './maps/sound';
import {ENGINE_VIEW_RU} from './maps/engineView';
import {SPECTRAL_RANGE_RU} from './maps/spectralRange';
import {WEDGE_RU} from './maps/wedge';
import {CLUSTER_HR_RU} from './maps/clusterHr';
import {CLUSTER_DATA_RU} from './maps/clusterData';
import {RADIO_ANTENNA_RU} from './maps/radioAntenna';
import {RADIO_FINISH_SAVE_RU} from './maps/radioFinishSave';
import {RADIO_R1_RU} from './maps/radioR1';
import {RADIO_RECORD_SAVE_RU} from './maps/radioRecordSave';
import {PULSAR_RU} from './maps/pulsar';
import {SAVED_ROWS_RU} from './maps/pulsarSavedRows';
import {LOAD_SAVE_RU} from './maps/pulsarLoadSave';
import {OBJECT_X_GUIDE_RU} from './maps/objectXGuide';
import {OBJECT_X_MEASURE_RU} from './maps/objectXMeasure';
import {OBJECT_X_SESSION_RU} from './maps/objectXSession';
import {HELP_VIEWER_RU} from './maps/helpViewer';
import {WEB_HELP_RU} from './maps/webHelp';
/** Front RU0 [W]: the Russian (ru) bundle (docs/I18N.md, "Russian: plural families, the folder, lints and shell (RU0)"; plan
 * analysis/front-plans/front-i18n-ru.md). RU0 translated the shell, RU1 the observatory and all of VIREO's originals, RU2 exercises
 * E01 and E02, RU3 exercise E03, RU4 exercises E04 and E05, RU5 the radio telescope, RU6 exercises E06 and E08, RU-HELP the help
 * viewer and OpenVireo’s own help, with its help files in src/i18n/ru/help. It was partial until its release (RU0–RU-HELP, behind a
 * `?lang=ru` preview); since Front RU-REL (src/i18n/languages.json `released:true`) every ru and ru-* browser opens it, and its
 * catalog and every map are complete (src/i18n/ru/ru.test.ts). Its catalog may hold the plural forms en.json lacks
  * (`.few`, `.many`: src/i18n/plural.ts pluralFormBase). The production build
 * splits it by route area like the other languages (scripts/i18n-split.mjs parses this manifest); Vitest imports it whole.
 * Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes and provenance are
 * unchanged. */
export const RUSSIAN:LocaleBundle=Object.freeze({
 language:'ru',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_RU,helpMenu:HELP_MENU_RU,languageChoice:LANGUAGE_CHOICE_RU,objectXLab:OBJECT_X_LAB_RU,polish:POLISH_RU,projectLinks:PROJECT_LINKS_RU,tour:TOUR_RU,variableStars:VARIABLE_STARS_RU,
  camera:CAMERA_RU,fieldInfo:FIELD_INFO_RU,fieldReadDetails:FIELD_READ_DETAILS_RU,nakedEye:NAKED_EYE_RU,observationMetadata:OBSERVATION_METADATA_RU,observatory:OBSERVATORY_RU,qsoList:QSO_LIST_RU,sound:SOUND_RU,
  engineView:ENGINE_VIEW_RU,spectralRange:SPECTRAL_RANGE_RU,wedge:WEDGE_RU,clusterHr:CLUSTER_HR_RU,clusterData:CLUSTER_DATA_RU,radioAntenna:RADIO_ANTENNA_RU,radioFinishSave:RADIO_FINISH_SAVE_RU,radioR1:RADIO_R1_RU,radioRecordSave:RADIO_RECORD_SAVE_RU,
  pulsar:PULSAR_RU,pulsarSavedRows:SAVED_ROWS_RU,pulsarLoadSave:LOAD_SAVE_RU,objectXGuide:OBJECT_X_GUIDE_RU,objectXMeasure:OBJECT_X_MEASURE_RU,objectXSession:OBJECT_X_SESSION_RU,
  helpViewer:HELP_VIEWER_RU,webHelp:WEB_HELP_RU}),
 originals,
});
