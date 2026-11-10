import type {LocaleBundle} from '../catalog';
import messages from './pt-br.json';
import originals from './originals.json';
import {APP_SHELL_PT} from './maps/appShell';
import {HELP_MENU_PT} from './maps/helpMenu';
import {LANGUAGE_CHOICE_PT} from './maps/languageChoice';
import {OBJECT_X_LAB_PT} from './maps/objectXLab';
import {POLISH_PT} from './maps/polish';
import {PROJECT_LINKS_PT} from './maps/projectLinks';
import {TOUR_PT} from './maps/tour';
import {VARIABLE_STARS_PT} from './maps/variableStars';
/** Front PT0 [W]: the Brazilian Portuguese (pt-BR) bundle (docs/I18N.md, "Brazilian Portuguese: the folder, lints and shell
 * (PT0)"). Partial until its release (src/i18n/languages.json `released:false`): only a `?lang=pt-BR` preview reaches it, and
 * every string it lacks is English. The production build splits it by route area like Spanish (scripts/i18n-split.mjs parses
 * this manifest); Vitest imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and
 * CLEA's bytes, hashes and provenance are unchanged. */
export const PORTUGUESE:LocaleBundle=Object.freeze({
 language:'pt-BR',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_PT,helpMenu:HELP_MENU_PT,languageChoice:LANGUAGE_CHOICE_PT,objectXLab:OBJECT_X_LAB_PT,polish:POLISH_PT,projectLinks:PROJECT_LINKS_PT,tour:TOUR_PT,variableStars:VARIABLE_STARS_PT}),
 originals,
});
