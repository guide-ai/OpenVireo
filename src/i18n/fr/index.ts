import type {LocaleBundle} from '../catalog';
import messages from './fr.json';
import originals from './originals.json';
import {APP_SHELL_FR} from './maps/appShell';
import {CAMERA_FR} from './maps/camera';
import {FIELD_INFO_FR} from './maps/fieldInfo';
import {FIELD_READ_DETAILS_FR} from './maps/fieldReadDetails';
import {HELP_MENU_FR} from './maps/helpMenu';
import {LANGUAGE_CHOICE_FR} from './maps/languageChoice';
import {NAKED_EYE_FR} from './maps/nakedEye';
import {OBJECT_X_LAB_FR} from './maps/objectXLab';
import {OBSERVATION_METADATA_FR} from './maps/observationMetadata';
import {OBSERVATORY_FR} from './maps/observatory';
import {POLISH_FR} from './maps/polish';
import {PROJECT_LINKS_FR} from './maps/projectLinks';
import {QSO_LIST_FR} from './maps/qsoList';
import {SOUND_FR} from './maps/sound';
import {TOUR_FR} from './maps/tour';
import {VARIABLE_STARS_FR} from './maps/variableStars';
import {ENGINE_VIEW_FR} from './maps/engineView';
import {SPECTRAL_RANGE_FR} from './maps/spectralRange';
import {WEDGE_FR} from './maps/wedge';
import {CLUSTER_HR_FR} from './maps/clusterHr';
import {CLUSTER_DATA_FR} from './maps/clusterData';
import {RADIO_ANTENNA_FR} from './maps/radioAntenna';
import {RADIO_FINISH_SAVE_FR} from './maps/radioFinishSave';
import {RADIO_R1_FR} from './maps/radioR1';
import {RADIO_RECORD_SAVE_FR} from './maps/radioRecordSave';
/** Front FR0 [W]: the French (fr) bundle (docs/I18N.md, "French: the folder, lints and shell (FR0)"; Front FR1 adds the observatory
 * and all of VIREO's originals, Front FR2 exercises E01 and E02, Front FR4 exercises E04 and E05, Front FR5 the radio telescope). Partial until its release
 * (src/i18n/languages.json `released:false`): only a `?lang=fr` preview reaches it, and every string it lacks is English. The
 * production build splits it by route area like Spanish and Portuguese (scripts/i18n-split.mjs parses this manifest); Vitest
 * imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes and
 * provenance are unchanged. */
export const FRENCH:LocaleBundle=Object.freeze({
 language:'fr',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_FR,camera:CAMERA_FR,fieldInfo:FIELD_INFO_FR,fieldReadDetails:FIELD_READ_DETAILS_FR,helpMenu:HELP_MENU_FR,languageChoice:LANGUAGE_CHOICE_FR,nakedEye:NAKED_EYE_FR,objectXLab:OBJECT_X_LAB_FR,observationMetadata:OBSERVATION_METADATA_FR,observatory:OBSERVATORY_FR,polish:POLISH_FR,projectLinks:PROJECT_LINKS_FR,qsoList:QSO_LIST_FR,sound:SOUND_FR,tour:TOUR_FR,variableStars:VARIABLE_STARS_FR,engineView:ENGINE_VIEW_FR,spectralRange:SPECTRAL_RANGE_FR,wedge:WEDGE_FR,clusterHr:CLUSTER_HR_FR,clusterData:CLUSTER_DATA_FR,
  radioAntenna:RADIO_ANTENNA_FR,radioFinishSave:RADIO_FINISH_SAVE_FR,radioR1:RADIO_R1_FR,radioRecordSave:RADIO_RECORD_SAVE_FR}),
 originals,
});
