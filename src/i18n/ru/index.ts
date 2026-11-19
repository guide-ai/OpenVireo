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
/** Front RU0 [W]: the Russian (ru) bundle (docs/I18N.md, "Russian: plural families, the folder, lints and shell (RU0)"). Partial until
 * its release (src/i18n/languages.json `released:false`): only a `?lang=ru` preview reaches it, and every string it lacks is English.
 * Its catalog may hold the plural forms en.json lacks (`.few`, `.many`: src/i18n/plural.ts pluralFormBase). The production build
 * splits it by route area like the other languages (scripts/i18n-split.mjs parses this manifest); Vitest imports it whole.
 * Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes and provenance are
 * unchanged. */
export const RUSSIAN:LocaleBundle=Object.freeze({
 language:'ru',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_RU,helpMenu:HELP_MENU_RU,languageChoice:LANGUAGE_CHOICE_RU,objectXLab:OBJECT_X_LAB_RU,polish:POLISH_RU,projectLinks:PROJECT_LINKS_RU,tour:TOUR_RU,variableStars:VARIABLE_STARS_RU}),
 originals,
});
