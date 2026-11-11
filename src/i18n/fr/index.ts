import type {LocaleBundle} from '../catalog';
import messages from './fr.json';
import originals from './originals.json';
import {APP_SHELL_FR} from './maps/appShell';
import {HELP_MENU_FR} from './maps/helpMenu';
import {LANGUAGE_CHOICE_FR} from './maps/languageChoice';
import {OBJECT_X_LAB_FR} from './maps/objectXLab';
import {POLISH_FR} from './maps/polish';
import {PROJECT_LINKS_FR} from './maps/projectLinks';
import {TOUR_FR} from './maps/tour';
import {VARIABLE_STARS_FR} from './maps/variableStars';
/** Front FR0 [W]: the French (fr) bundle (docs/I18N.md, "French: the folder, lints and shell (FR0)"). Partial until its release
 * (src/i18n/languages.json `released:false`): only a `?lang=fr` preview reaches it, and every string it lacks is English. The
 * production build splits it by route area like Spanish and Portuguese (scripts/i18n-split.mjs parses this manifest); Vitest
 * imports it whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes and
 * provenance are unchanged. */
export const FRENCH:LocaleBundle=Object.freeze({
 language:'fr',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_FR,helpMenu:HELP_MENU_FR,languageChoice:LANGUAGE_CHOICE_FR,objectXLab:OBJECT_X_LAB_FR,polish:POLISH_FR,projectLinks:PROJECT_LINKS_FR,tour:TOUR_FR,variableStars:VARIABLE_STARS_FR}),
 originals,
});
