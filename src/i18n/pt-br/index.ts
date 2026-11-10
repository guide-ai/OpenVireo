import type {LocaleBundle} from '../catalog';
import messages from './pt-br.json';
import originals from './originals.json';
import {APP_SHELL_PT} from './maps/appShell';
import {CAMERA_PT} from './maps/camera';
import {FIELD_INFO_PT} from './maps/fieldInfo';
import {FIELD_READ_DETAILS_PT} from './maps/fieldReadDetails';
import {HELP_MENU_PT} from './maps/helpMenu';
import {LANGUAGE_CHOICE_PT} from './maps/languageChoice';
import {NAKED_EYE_PT} from './maps/nakedEye';
import {OBJECT_X_LAB_PT} from './maps/objectXLab';
import {OBSERVATION_METADATA_PT} from './maps/observationMetadata';
import {OBSERVATORY_PT} from './maps/observatory';
import {POLISH_PT} from './maps/polish';
import {PROJECT_LINKS_PT} from './maps/projectLinks';
import {QSO_LIST_PT} from './maps/qsoList';
import {SOUND_PT} from './maps/sound';
import {TOUR_PT} from './maps/tour';
import {VARIABLE_STARS_PT} from './maps/variableStars';
import {ENGINE_VIEW_PT} from './maps/engineView';
import {SPECTRAL_RANGE_PT} from './maps/spectralRange';
import {WEDGE_PT} from './maps/wedge';
import {CLUSTER_HR_PT} from './maps/clusterHr';
import {CLUSTER_DATA_PT} from './maps/clusterData';
import {RADIO_ANTENNA_PT} from './maps/radioAntenna';
import {RADIO_FINISH_SAVE_PT} from './maps/radioFinishSave';
import {RADIO_R1_PT} from './maps/radioR1';
import {RADIO_RECORD_SAVE_PT} from './maps/radioRecordSave';
import {PULSAR_PT} from './maps/pulsar';
import {SAVED_ROWS_PT} from './maps/pulsarSavedRows';
import {LOAD_SAVE_PT} from './maps/pulsarLoadSave';
import {OBJECT_X_GUIDE_PT} from './maps/objectXGuide';
import {OBJECT_X_MEASURE_PT} from './maps/objectXMeasure';
import {OBJECT_X_SESSION_PT} from './maps/objectXSession';
import {HELP_VIEWER_PT} from './maps/helpViewer';
import {WEB_HELP_PT} from './maps/webHelp';
/** Front PT0 [W]: the Brazilian Portuguese (pt-BR) bundle (docs/I18N.md, "Brazilian Portuguese: the folder, lints and shell
 * (PT0)"). Partial until its release (src/i18n/languages.json `released:false`): only a `?lang=pt-BR` preview reaches it, and
 * every string it lacks is English. The production build splits it by route area like Spanish (scripts/i18n-split.mjs parses
 * this manifest); Vitest imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and
 * CLEA's bytes, hashes and provenance are unchanged. */
export const PORTUGUESE:LocaleBundle=Object.freeze({
 language:'pt-BR',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_PT,camera:CAMERA_PT,fieldInfo:FIELD_INFO_PT,fieldReadDetails:FIELD_READ_DETAILS_PT,helpMenu:HELP_MENU_PT,languageChoice:LANGUAGE_CHOICE_PT,nakedEye:NAKED_EYE_PT,objectXLab:OBJECT_X_LAB_PT,observationMetadata:OBSERVATION_METADATA_PT,observatory:OBSERVATORY_PT,polish:POLISH_PT,projectLinks:PROJECT_LINKS_PT,qsoList:QSO_LIST_PT,sound:SOUND_PT,tour:TOUR_PT,variableStars:VARIABLE_STARS_PT,engineView:ENGINE_VIEW_PT,spectralRange:SPECTRAL_RANGE_PT,wedge:WEDGE_PT,clusterHr:CLUSTER_HR_PT,clusterData:CLUSTER_DATA_PT,
  radioAntenna:RADIO_ANTENNA_PT,radioFinishSave:RADIO_FINISH_SAVE_PT,radioR1:RADIO_R1_PT,radioRecordSave:RADIO_RECORD_SAVE_PT,
  pulsar:PULSAR_PT,pulsarSavedRows:SAVED_ROWS_PT,pulsarLoadSave:LOAD_SAVE_PT,objectXGuide:OBJECT_X_GUIDE_PT,objectXMeasure:OBJECT_X_MEASURE_PT,objectXSession:OBJECT_X_SESSION_PT,
  helpViewer:HELP_VIEWER_PT,webHelp:WEB_HELP_PT}),
 originals,
});
