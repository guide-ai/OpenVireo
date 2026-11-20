import type {LocaleBundle} from '../catalog';
import messages from './ja.json';
import originals from './originals.json';
import {APP_SHELL_JA} from './maps/appShell';
import {HELP_MENU_JA} from './maps/helpMenu';
import {LANGUAGE_CHOICE_JA} from './maps/languageChoice';
import {OBJECT_X_LAB_JA} from './maps/objectXLab';
import {POLISH_JA} from './maps/polish';
import {PROJECT_LINKS_JA} from './maps/projectLinks';
import {TOUR_JA} from './maps/tour';
import {VARIABLE_STARS_JA} from './maps/variableStars';
/** Front JA0 [W]: the Japanese (ja) bundle (docs/I18N.md, "Japanese: the folder, lints and shell (JA0)"; plan
 * analysis/front-plans/front-i18n-ja.md). Partial until its release, behind a `?lang=ja` preview: JA0 translates the shell, and the
 * later JA fronts the observatory with all of VIREO's originals (JA1), the exercises (JA2–JA6) and the help (JA-HELP). The
 * production build splits it by route area like the other languages (scripts/i18n-split.mjs parses this manifest); Vitest imports it
 * whole. Translations are web adaptations by OpenVireo; they never claim to be CLEA's, and CLEA's bytes, hashes and provenance are
 * unchanged. */
export const JAPANESE:LocaleBundle=Object.freeze({
 language:'ja',
 messages,
 maps:Object.freeze({appShell:APP_SHELL_JA,helpMenu:HELP_MENU_JA,languageChoice:LANGUAGE_CHOICE_JA,objectXLab:OBJECT_X_LAB_JA,polish:POLISH_JA,projectLinks:PROJECT_LINKS_JA,tour:TOUR_JA,variableStars:VARIABLE_STARS_JA}),
 originals,
});
