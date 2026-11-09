import type {LocaleBundle} from '../catalog';
import messages from './es.json';
import originals from './originals.json';
import {APP_SHELL_ES} from './maps/appShell';
import {CAMERA_ES} from './maps/camera';
import {ENGINE_VIEW_ES} from './maps/engineView';
import {SPECTRAL_RANGE_ES} from './maps/spectralRange';
import {FIELD_INFO_ES} from './maps/fieldInfo';
import {FIELD_READ_DETAILS_ES} from './maps/fieldReadDetails';
import {NAKED_EYE_ES} from './maps/nakedEye';
import {OBSERVATION_METADATA_ES} from './maps/observationMetadata';
import {OBSERVATORY_ES} from './maps/observatory';
import {QSO_LIST_ES} from './maps/qsoList';
import {SOUND_ES} from './maps/sound';
import {HELP_MENU_ES} from './maps/helpMenu';
import {HELP_VIEWER_ES} from './maps/helpViewer';
import {WEB_HELP_ES} from './maps/webHelp';
import {LANGUAGE_CHOICE_ES} from './maps/languageChoice';
import {OBJECT_X_LAB_ES} from './maps/objectXLab';
import {OBJECT_X_GUIDE_ES} from './maps/objectXGuide';
import {OBJECT_X_MEASURE_ES} from './maps/objectXMeasure';
import {OBJECT_X_SESSION_ES} from './maps/objectXSession';
import {POLISH_ES} from './maps/polish';
import {PROJECT_LINKS_ES} from './maps/projectLinks';
import {TOUR_ES} from './maps/tour';
import {VARIABLE_STARS_ES} from './maps/variableStars';
import {WEDGE_ES} from './maps/wedge';
import {RADIO_ANTENNA_ES} from './maps/radioAntenna';
import {RADIO_FINISH_SAVE_ES} from './maps/radioFinishSave';
import {RADIO_R1_ES} from './maps/radioR1';
import {RADIO_RECORD_SAVE_ES} from './maps/radioRecordSave';
/** Front ES1 [W]: the Spanish (es-419) bundle, a chunk of its own that src/boot.ts loads only for a Spanish load
 * (docs/I18N.md). Before ES-REL it is partial: the catalog and the maps hold the sub-fronts merged so far, and every missing
 * string stays English. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes,
 * hashes and provenance are unchanged. */
export const SPANISH:LocaleBundle=Object.freeze({
 language:'es-419',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_ES,camera:CAMERA_ES,engineView:ENGINE_VIEW_ES,fieldInfo:FIELD_INFO_ES,fieldReadDetails:FIELD_READ_DETAILS_ES,helpMenu:HELP_MENU_ES,languageChoice:LANGUAGE_CHOICE_ES,nakedEye:NAKED_EYE_ES,objectXGuide:OBJECT_X_GUIDE_ES,objectXLab:OBJECT_X_LAB_ES,objectXMeasure:OBJECT_X_MEASURE_ES,objectXSession:OBJECT_X_SESSION_ES,observationMetadata:OBSERVATION_METADATA_ES,observatory:OBSERVATORY_ES,polish:POLISH_ES,projectLinks:PROJECT_LINKS_ES,qsoList:QSO_LIST_ES,sound:SOUND_ES,spectralRange:SPECTRAL_RANGE_ES,tour:TOUR_ES,variableStars:VARIABLE_STARS_ES,wedge:WEDGE_ES,radioAntenna:RADIO_ANTENNA_ES,radioFinishSave:RADIO_FINISH_SAVE_ES,radioR1:RADIO_R1_ES,radioRecordSave:RADIO_RECORD_SAVE_ES,helpViewer:HELP_VIEWER_ES,webHelp:WEB_HELP_ES}),
 originals,
});
