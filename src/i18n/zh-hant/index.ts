import type {LocaleBundle} from '../catalog';
import messages from './zh-hant.json';
import originals from './originals.json';
import {APP_SHELL_ZH_HANT} from './maps/appShell';
import {HELP_MENU_ZH_HANT} from './maps/helpMenu';
import {LANGUAGE_CHOICE_ZH_HANT} from './maps/languageChoice';
import {OBJECT_X_LAB_ZH_HANT} from './maps/objectXLab';
import {POLISH_ZH_HANT} from './maps/polish';
import {PROJECT_LINKS_ZH_HANT} from './maps/projectLinks';
import {TOUR_ZH_HANT} from './maps/tour';
import {VARIABLE_STARS_ZH_HANT} from './maps/variableStars';
import {CAMERA_ZH_HANT} from './maps/camera';
import {FIELD_INFO_ZH_HANT} from './maps/fieldInfo';
import {FIELD_READ_DETAILS_ZH_HANT} from './maps/fieldReadDetails';
import {NAKED_EYE_ZH_HANT} from './maps/nakedEye';
import {OBSERVATION_METADATA_ZH_HANT} from './maps/observationMetadata';
import {OBSERVATORY_ZH_HANT} from './maps/observatory';
import {QSO_LIST_ZH_HANT} from './maps/qsoList';
import {SOUND_ZH_HANT} from './maps/sound';
import {ENGINE_VIEW_ZH_HANT} from './maps/engineView';
import {SPECTRAL_RANGE_ZH_HANT} from './maps/spectralRange';
import {WEDGE_ZH_HANT} from './maps/wedge';
/** Front ZT0 [W]: the Traditional Chinese (zh-Hant, Taiwan) bundle (docs/I18N.md, "Traditional Chinese: the folder, lints and shell
 * (ZT0)"; plan analysis/front-plans/front-i18n-zh.md §6.3). Adapted from the reviewed Simplified Chinese with the English as the source
 * of truth (user decision of 2026-11-19), to Taiwan's standard. Partial until its release (src/i18n/languages.json `released:false`):
 * only a `?lang=zh-Hant` preview reaches it, and every string it lacks is English. ZT0 translated the shell, ZT1 the observatory
 * with its maps, all of VIREO's originals and exercises E01–E03; ZT2 and ZT-HELP add the rest. The production build splits it by route area like the other languages (scripts/i18n-split.mjs parses this manifest);
 * Vitest imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes
 * and provenance are unchanged. */
export const CHINESE_TRADITIONAL:LocaleBundle=Object.freeze({
 language:'zh-Hant',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_ZH_HANT,helpMenu:HELP_MENU_ZH_HANT,languageChoice:LANGUAGE_CHOICE_ZH_HANT,objectXLab:OBJECT_X_LAB_ZH_HANT,polish:POLISH_ZH_HANT,projectLinks:PROJECT_LINKS_ZH_HANT,tour:TOUR_ZH_HANT,variableStars:VARIABLE_STARS_ZH_HANT,
  camera:CAMERA_ZH_HANT,fieldInfo:FIELD_INFO_ZH_HANT,fieldReadDetails:FIELD_READ_DETAILS_ZH_HANT,nakedEye:NAKED_EYE_ZH_HANT,observationMetadata:OBSERVATION_METADATA_ZH_HANT,observatory:OBSERVATORY_ZH_HANT,qsoList:QSO_LIST_ZH_HANT,sound:SOUND_ZH_HANT,engineView:ENGINE_VIEW_ZH_HANT,spectralRange:SPECTRAL_RANGE_ZH_HANT,wedge:WEDGE_ZH_HANT}),
 originals,
});
