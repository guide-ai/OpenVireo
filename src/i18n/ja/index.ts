import type {LocaleBundle} from '../catalog';
import messages from './ja.json';
import originals from './originals.json';
import {APP_SHELL_JA} from './maps/appShell';
import {HELP_MENU_JA} from './maps/helpMenu';
import {LANGUAGE_CHOICE_JA} from './maps/languageChoice';
import {OBJECT_X_LAB_JA} from './maps/objectXLab';
import {POLISH_JA} from './maps/polish';
import {PROJECT_LINKS_JA} from './maps/projectLinks';
import {TOUR_JA} from './maps/tour';
import {VARIABLE_STARS_JA} from './maps/variableStars';
import {CAMERA_JA} from './maps/camera';
import {FIELD_INFO_JA} from './maps/fieldInfo';
import {FIELD_READ_DETAILS_JA} from './maps/fieldReadDetails';
import {NAKED_EYE_JA} from './maps/nakedEye';
import {OBSERVATION_METADATA_JA} from './maps/observationMetadata';
import {OBSERVATORY_JA} from './maps/observatory';
import {QSO_LIST_JA} from './maps/qsoList';
import {SOUND_JA} from './maps/sound';
import {ENGINE_VIEW_JA} from './maps/engineView';
import {SPECTRAL_RANGE_JA} from './maps/spectralRange';
import {WEDGE_JA} from './maps/wedge';
import {CLUSTER_HR_JA} from './maps/clusterHr';
import {CLUSTER_DATA_JA} from './maps/clusterData';
import {RADIO_ANTENNA_JA} from './maps/radioAntenna';
import {RADIO_FINISH_SAVE_JA} from './maps/radioFinishSave';
import {RADIO_R1_JA} from './maps/radioR1';
import {RADIO_RECORD_SAVE_JA} from './maps/radioRecordSave';
import {PULSAR_JA} from './maps/pulsar';
import {SAVED_ROWS_JA} from './maps/pulsarSavedRows';
import {LOAD_SAVE_JA} from './maps/pulsarLoadSave';
import {OBJECT_X_GUIDE_JA} from './maps/objectXGuide';
import {OBJECT_X_MEASURE_JA} from './maps/objectXMeasure';
import {OBJECT_X_SESSION_JA} from './maps/objectXSession';
import {HELP_VIEWER_JA} from './maps/helpViewer';
import {WEB_HELP_JA} from './maps/webHelp';
/** Front JA0 [W]: the Japanese (ja) bundle (docs/I18N.md, "Japanese: the folder, lints and shell (JA0)"; plan
 * analysis/front-plans/front-i18n-ja.md). Partial until its release, behind a `?lang=ja` preview: JA0 translates the shell, and the
 * later JA fronts the observatory with all of VIREO's originals (JA1), the exercises (JA2–JA6) and the help (JA-HELP). The
 * production build splits it by route area like the other languages (scripts/i18n-split.mjs parses this manifest); Vitest imports it
 * whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes and provenance are
 * unchanged. */
export const JAPANESE:LocaleBundle=Object.freeze({
 language:'ja',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_JA,helpMenu:HELP_MENU_JA,languageChoice:LANGUAGE_CHOICE_JA,objectXLab:OBJECT_X_LAB_JA,polish:POLISH_JA,projectLinks:PROJECT_LINKS_JA,tour:TOUR_JA,variableStars:VARIABLE_STARS_JA,
  camera:CAMERA_JA,fieldInfo:FIELD_INFO_JA,fieldReadDetails:FIELD_READ_DETAILS_JA,nakedEye:NAKED_EYE_JA,observationMetadata:OBSERVATION_METADATA_JA,observatory:OBSERVATORY_JA,qsoList:QSO_LIST_JA,sound:SOUND_JA,
  engineView:ENGINE_VIEW_JA,spectralRange:SPECTRAL_RANGE_JA,wedge:WEDGE_JA,clusterHr:CLUSTER_HR_JA,clusterData:CLUSTER_DATA_JA,
  radioAntenna:RADIO_ANTENNA_JA,radioFinishSave:RADIO_FINISH_SAVE_JA,radioR1:RADIO_R1_JA,radioRecordSave:RADIO_RECORD_SAVE_JA,
  pulsar:PULSAR_JA,pulsarSavedRows:SAVED_ROWS_JA,pulsarLoadSave:LOAD_SAVE_JA,objectXGuide:OBJECT_X_GUIDE_JA,objectXMeasure:OBJECT_X_MEASURE_JA,objectXSession:OBJECT_X_SESSION_JA,
  helpViewer:HELP_VIEWER_JA,webHelp:WEB_HELP_JA}),
 originals,
});
