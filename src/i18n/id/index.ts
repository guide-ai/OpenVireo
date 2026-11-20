import type {LocaleBundle} from '../catalog';
import messages from './id.json';
import originals from './originals.json';
import {APP_SHELL_ID} from './maps/appShell';
import {HELP_MENU_ID} from './maps/helpMenu';
import {LANGUAGE_CHOICE_ID} from './maps/languageChoice';
import {OBJECT_X_LAB_ID} from './maps/objectXLab';
import {POLISH_ID} from './maps/polish';
import {PROJECT_LINKS_ID} from './maps/projectLinks';
import {TOUR_ID} from './maps/tour';
import {VARIABLE_STARS_ID} from './maps/variableStars';
import {CAMERA_ID} from './maps/camera';
import {FIELD_INFO_ID} from './maps/fieldInfo';
import {FIELD_READ_DETAILS_ID} from './maps/fieldReadDetails';
import {NAKED_EYE_ID} from './maps/nakedEye';
import {OBSERVATION_METADATA_ID} from './maps/observationMetadata';
import {OBSERVATORY_ID} from './maps/observatory';
import {QSO_LIST_ID} from './maps/qsoList';
import {SOUND_ID} from './maps/sound';
import {ENGINE_VIEW_ID} from './maps/engineView';
import {SPECTRAL_RANGE_ID} from './maps/spectralRange';
import {WEDGE_ID} from './maps/wedge';
import {CLUSTER_HR_ID} from './maps/clusterHr';
import {CLUSTER_DATA_ID} from './maps/clusterData';
/** Front ID0 [W]: the Indonesian (id) bundle (docs/I18N.md, "Indonesian: the folder, lints and shell (ID0)"; plan
 * analysis/front-plans/front-i18n-id.md). Partial until its release (ID0–ID-HELP, behind a `?lang=id` preview): ID0 translates the
 * shell, the welcome and the header menu names, ID1 the observatory and all of VIREO's originals, ID2 exercises E01 and E02, ID3 exercise E03, ID4 exercises E04 and E05; later ID fronts add the observatory, the exercises, the radio telescope and the
 * help. The production build splits it by route area like the other languages (scripts/i18n-split.mjs parses this manifest);
 * Vitest imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes
 * and provenance are unchanged. */
export const INDONESIAN:LocaleBundle=Object.freeze({
 language:'id',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_ID,helpMenu:HELP_MENU_ID,languageChoice:LANGUAGE_CHOICE_ID,objectXLab:OBJECT_X_LAB_ID,polish:POLISH_ID,projectLinks:PROJECT_LINKS_ID,tour:TOUR_ID,variableStars:VARIABLE_STARS_ID,
  camera:CAMERA_ID,fieldInfo:FIELD_INFO_ID,fieldReadDetails:FIELD_READ_DETAILS_ID,nakedEye:NAKED_EYE_ID,observationMetadata:OBSERVATION_METADATA_ID,observatory:OBSERVATORY_ID,qsoList:QSO_LIST_ID,sound:SOUND_ID,
  engineView:ENGINE_VIEW_ID,spectralRange:SPECTRAL_RANGE_ID,wedge:WEDGE_ID,clusterHr:CLUSTER_HR_ID,clusterData:CLUSTER_DATA_ID}),
 originals,
});
