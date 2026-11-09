import type {LocaleBundle} from '../catalog';
import messages from './es.json';
import originals from './originals.json';
import {APP_SHELL_ES} from './maps/appShell';
import {HELP_MENU_ES} from './maps/helpMenu';
import {LANGUAGE_CHOICE_ES} from './maps/languageChoice';
import {OBJECT_X_LAB_ES} from './maps/objectXLab';
import {POLISH_ES} from './maps/polish';
import {PROJECT_LINKS_ES} from './maps/projectLinks';
import {TOUR_ES} from './maps/tour';
import {VARIABLE_STARS_ES} from './maps/variableStars';
/** Front ES1 [W]: the Spanish (es-419) bundle, a chunk of its own that src/boot.ts loads only for a Spanish load
 * (docs/I18N.md). Before ES-REL it is partial: the catalog and the maps hold the sub-fronts merged so far, and every missing
 * string stays English. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes,
 * hashes and provenance are unchanged. */
export const SPANISH:LocaleBundle=Object.freeze({
 language:'es-419',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_ES,helpMenu:HELP_MENU_ES,languageChoice:LANGUAGE_CHOICE_ES,objectXLab:OBJECT_X_LAB_ES,polish:POLISH_ES,projectLinks:PROJECT_LINKS_ES,tour:TOUR_ES,variableStars:VARIABLE_STARS_ES}),
 originals,
});
