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
/** Front ZH0 [W]: the Simplified Chinese (zh-Hans) bundle (docs/I18N.md, "Simplified Chinese: the folder, lints and shell (ZH0)").
 * Partial until its release (src/i18n/languages.json `released:false`): only a `?lang=zh-Hans` preview reaches it, and every string
 * it lacks is English. The production build splits it by route area like the other languages (scripts/i18n-split.mjs parses this
 * manifest); Vitest imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's
 * bytes, hashes and provenance are unchanged. */
export const CHINESE_SIMPLIFIED:LocaleBundle=Object.freeze({
 language:'zh-Hans',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_ZH_HANS,helpMenu:HELP_MENU_ZH_HANS,languageChoice:LANGUAGE_CHOICE_ZH_HANS,objectXLab:OBJECT_X_LAB_ZH_HANS,polish:POLISH_ZH_HANS,projectLinks:PROJECT_LINKS_ZH_HANS,tour:TOUR_ZH_HANS,variableStars:VARIABLE_STARS_ZH_HANS}),
 originals,
});
