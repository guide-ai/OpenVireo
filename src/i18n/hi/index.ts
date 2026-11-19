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
/** Front HI0: the Hindi (hi) bundle (docs/I18N.md, "Hindi: the folder, the digit notice and the shell (HI0)"). Partial until its
 * release (src/i18n/languages.json `released:false`): only a `?lang=hi` preview reaches it, and every string it lacks is English.
 * The production build splits it by route area like the other languages (scripts/i18n-split.mjs parses this manifest); Vitest
 * imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes and
 * provenance are unchanged. */
export const HINDI:LocaleBundle=Object.freeze({
 language:'hi',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_HI,helpMenu:HELP_MENU_HI,languageChoice:LANGUAGE_CHOICE_HI,objectXLab:OBJECT_X_LAB_HI,polish:POLISH_HI,projectLinks:PROJECT_LINKS_HI,tour:TOUR_HI,variableStars:VARIABLE_STARS_HI}),
 originals,
});
