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
/** Front RU0 [W]: the Russian (ru) bundle (docs/I18N.md, "Russian: plural families, the folder, lints and shell (RU0)"; Front RU1 adds the
 * observatory and all of VIREO's originals; RU2 exercises E01 and E02; RU3 exercise E03; RU4 exercises E04 and E05). Partial until
 * its release (src/i18n/languages.json `released:false`): only a `?lang=ru` preview reaches it, and every string it lacks is English.
 * Its catalog may hold the plural forms en.json lacks (`.few`, `.many`: src/i18n/plural.ts pluralFormBase). The production build
 * splits it by route area like the other languages (scripts/i18n-split.mjs parses this manifest); Vitest imports it whole.
 * Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes and provenance are
 * unchanged. */
export const RUSSIAN:LocaleBundle=Object.freeze({
 language:'ru',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_RU,helpMenu:HELP_MENU_RU,languageChoice:LANGUAGE_CHOICE_RU,objectXLab:OBJECT_X_LAB_RU,polish:POLISH_RU,projectLinks:PROJECT_LINKS_RU,tour:TOUR_RU,variableStars:VARIABLE_STARS_RU,
  camera:CAMERA_RU,fieldInfo:FIELD_INFO_RU,fieldReadDetails:FIELD_READ_DETAILS_RU,nakedEye:NAKED_EYE_RU,observationMetadata:OBSERVATION_METADATA_RU,observatory:OBSERVATORY_RU,qsoList:QSO_LIST_RU,sound:SOUND_RU,
  engineView:ENGINE_VIEW_RU,spectralRange:SPECTRAL_RANGE_RU,wedge:WEDGE_RU,clusterHr:CLUSTER_HR_RU,clusterData:CLUSTER_DATA_RU}),
 originals,
});
