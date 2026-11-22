import type {LocaleBundle} from '../catalog';
import messages from './zh-hans.json';
import originals from './originals.json';
import {APP_SHELL_ZH_HANS} from './maps/appShell';
import {HELP_MENU_ZH_HANS} from './maps/helpMenu';
import {LANGUAGE_CHOICE_ZH_HANS} from './maps/languageChoice';
import {OBJECT_X_LAB_ZH_HANS} from './maps/objectXLab';
import {POLISH_ZH_HANS} from './maps/polish';
import {PROJECT_LINKS_ZH_HANS} from './maps/projectLinks';
import {TOUR_ZH_HANS} from './maps/tour';
import {VARIABLE_STARS_ZH_HANS} from './maps/variableStars';
import {CAMERA_ZH_HANS} from './maps/camera';
import {FIELD_INFO_ZH_HANS} from './maps/fieldInfo';
import {FIELD_READ_DETAILS_ZH_HANS} from './maps/fieldReadDetails';
import {NAKED_EYE_ZH_HANS} from './maps/nakedEye';
import {OBSERVATION_METADATA_ZH_HANS} from './maps/observationMetadata';
import {OBSERVATORY_ZH_HANS} from './maps/observatory';
import {QSO_LIST_ZH_HANS} from './maps/qsoList';
import {SOUND_ZH_HANS} from './maps/sound';
import {ENGINE_VIEW_ZH_HANS} from './maps/engineView';
import {SPECTRAL_RANGE_ZH_HANS} from './maps/spectralRange';
import {WEDGE_ZH_HANS} from './maps/wedge';
import {CLUSTER_HR_ZH_HANS} from './maps/clusterHr';
import {CLUSTER_DATA_ZH_HANS} from './maps/clusterData';
/** Front ZH0 [W]: the Simplified Chinese (zh-Hans) bundle (docs/I18N.md, "Simplified Chinese: the folder, lints and shell (ZH0)").
 * Partial until its release (src/i18n/languages.json `released:false`): only a `?lang=zh-Hans` preview reaches it, and every string
 * it lacks is English. ZH0 translated the shell; ZH1 the observatory with its maps and all of VIREO's originals; ZH2 exercises E01 and E02; ZH3 exercise E03; ZH4 exercises E04 and E05. The production build splits it by route area like the other languages (scripts/i18n-split.mjs parses this
 * manifest); Vitest imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's
 * bytes, hashes and provenance are unchanged. */
export const CHINESE_SIMPLIFIED:LocaleBundle=Object.freeze({
 language:'zh-Hans',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_ZH_HANS,helpMenu:HELP_MENU_ZH_HANS,languageChoice:LANGUAGE_CHOICE_ZH_HANS,objectXLab:OBJECT_X_LAB_ZH_HANS,polish:POLISH_ZH_HANS,projectLinks:PROJECT_LINKS_ZH_HANS,tour:TOUR_ZH_HANS,variableStars:VARIABLE_STARS_ZH_HANS,
  camera:CAMERA_ZH_HANS,fieldInfo:FIELD_INFO_ZH_HANS,fieldReadDetails:FIELD_READ_DETAILS_ZH_HANS,nakedEye:NAKED_EYE_ZH_HANS,observationMetadata:OBSERVATION_METADATA_ZH_HANS,observatory:OBSERVATORY_ZH_HANS,qsoList:QSO_LIST_ZH_HANS,sound:SOUND_ZH_HANS,
  engineView:ENGINE_VIEW_ZH_HANS,spectralRange:SPECTRAL_RANGE_ZH_HANS,wedge:WEDGE_ZH_HANS,clusterHr:CLUSTER_HR_ZH_HANS,clusterData:CLUSTER_DATA_ZH_HANS}),
 originals,
});
