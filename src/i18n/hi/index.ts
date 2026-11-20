import type {LocaleBundle} from '../catalog';
import messages from './hi.json';
import originals from './originals.json';
import {APP_SHELL_HI} from './maps/appShell';
import {HELP_MENU_HI} from './maps/helpMenu';
import {LANGUAGE_CHOICE_HI} from './maps/languageChoice';
import {OBJECT_X_LAB_HI} from './maps/objectXLab';
import {POLISH_HI} from './maps/polish';
import {PROJECT_LINKS_HI} from './maps/projectLinks';
import {TOUR_HI} from './maps/tour';
import {VARIABLE_STARS_HI} from './maps/variableStars';
import {CAMERA_HI} from './maps/camera';
import {FIELD_INFO_HI} from './maps/fieldInfo';
import {FIELD_READ_DETAILS_HI} from './maps/fieldReadDetails';
import {NAKED_EYE_HI} from './maps/nakedEye';
import {OBSERVATION_METADATA_HI} from './maps/observationMetadata';
import {OBSERVATORY_HI} from './maps/observatory';
import {QSO_LIST_HI} from './maps/qsoList';
import {SOUND_HI} from './maps/sound';
import {ENGINE_VIEW_HI} from './maps/engineView';
import {SPECTRAL_RANGE_HI} from './maps/spectralRange';
import {WEDGE_HI} from './maps/wedge';
import {CLUSTER_HR_HI} from './maps/clusterHr';
import {CLUSTER_DATA_HI} from './maps/clusterData';
import {RADIO_ANTENNA_HI} from './maps/radioAntenna';
import {RADIO_FINISH_SAVE_HI} from './maps/radioFinishSave';
import {RADIO_R1_HI} from './maps/radioR1';
import {RADIO_RECORD_SAVE_HI} from './maps/radioRecordSave';
import {PULSAR_HI} from './maps/pulsar';
import {SAVED_ROWS_HI} from './maps/pulsarSavedRows';
import {LOAD_SAVE_HI} from './maps/pulsarLoadSave';
import {OBJECT_X_GUIDE_HI} from './maps/objectXGuide';
import {OBJECT_X_MEASURE_HI} from './maps/objectXMeasure';
import {OBJECT_X_SESSION_HI} from './maps/objectXSession';
import {HELP_VIEWER_HI} from './maps/helpViewer';
import {WEB_HELP_HI} from './maps/webHelp';
/** Front HI0: the Hindi (hi) bundle (docs/I18N.md, "Hindi: the folder, the digit notice and the shell (HI0)"; HI1 adds the
 * observatory's maps and all of VIREO's originals, HI2 exercises E01 and E02, HI3 exercise E03, HI4 exercises E04 and E05, HI5 the radio telescope, HI6 exercises E06 and E08, HI-HELP the help viewer and OpenVireo's own help; its help files are src/i18n/hi/help). Partial until its
 * release (src/i18n/languages.json `released:false`): only a `?lang=hi` preview reaches it, and every string it lacks is English.
 * The production build splits it by route area like the other languages (scripts/i18n-split.mjs parses this manifest); Vitest
 * imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes and
 * provenance are unchanged. */
export const HINDI:LocaleBundle=Object.freeze({
 language:'hi',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_HI,camera:CAMERA_HI,fieldInfo:FIELD_INFO_HI,fieldReadDetails:FIELD_READ_DETAILS_HI,helpMenu:HELP_MENU_HI,languageChoice:LANGUAGE_CHOICE_HI,nakedEye:NAKED_EYE_HI,objectXLab:OBJECT_X_LAB_HI,observationMetadata:OBSERVATION_METADATA_HI,observatory:OBSERVATORY_HI,polish:POLISH_HI,projectLinks:PROJECT_LINKS_HI,qsoList:QSO_LIST_HI,sound:SOUND_HI,tour:TOUR_HI,variableStars:VARIABLE_STARS_HI,engineView:ENGINE_VIEW_HI,spectralRange:SPECTRAL_RANGE_HI,wedge:WEDGE_HI,clusterHr:CLUSTER_HR_HI,clusterData:CLUSTER_DATA_HI,
  radioAntenna:RADIO_ANTENNA_HI,radioFinishSave:RADIO_FINISH_SAVE_HI,radioR1:RADIO_R1_HI,radioRecordSave:RADIO_RECORD_SAVE_HI,
  pulsar:PULSAR_HI,pulsarSavedRows:SAVED_ROWS_HI,pulsarLoadSave:LOAD_SAVE_HI,objectXGuide:OBJECT_X_GUIDE_HI,objectXMeasure:OBJECT_X_MEASURE_HI,objectXSession:OBJECT_X_SESSION_HI,
  helpViewer:HELP_VIEWER_HI,webHelp:WEB_HELP_HI}),
 originals,
});
