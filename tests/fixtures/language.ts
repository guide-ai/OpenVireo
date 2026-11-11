/** Front ES-REL (docs/I18N.md; plan §3.3): Spanish is released, so the Spanish specs open Spanish with the browser language
 * alone. Each runs in an es-MX browser (`test.use({locale:SPANISH_LOCALE})`) and loads its routes without `?lang=`; English
 * reference runs in the same browser ask for English with `?lang=en` (the link parameter beats the browser language), and the
 * dev-only pseudo-locale with `?lang=qps`. Only the tests that check the preview link itself keep `?lang=es-419`. The English
 * suite keeps Playwright's `locale:'en-US'` from the configs. */
import {isReleased} from '../../src/i18n/languages';
export const SPANISH_LOCALE='es-MX';
/** Front PT0: a browser language that opens each translated language once it is released (pt-BR since PT-REL). */
export const PORTUGUESE_LOCALE='pt-BR';
/** Front FR0: the browser language that opens French once it is released (FR-REL); before, French opens with `?lang=fr`. */
export const FRENCH_LOCALE='fr-FR';
const BROWSER_LOCALE:Readonly<Record<string,string>>={'es-419':SPANISH_LOCALE,'pt-BR':PORTUGUESE_LOCALE,fr:FRENCH_LOCALE};
/** The query that opens `lang` in its own browser (contextLocale: es-MX for Spanish, pt-BR for Brazilian Portuguese): none for a
 * released language, `?lang=<lang>` for English, the pseudo-locales and a language before its release (its preview). Front PT-REL:
 * the language-parameterised specs run each released language's tests in that language's browser (an anonymous describe with
 * `test.use({locale:contextLocale(L.tag)})`), so its pages open by the browser language alone, as ES-REL did for Spanish. */
export const langQuery=(lang:string):string=>lang!=='en'&&isReleased(lang)?'':`?lang=${lang}`;
/** For a context made for one language: its browser language (es-MX for Spanish, en-US otherwise) and the query it needs (only
 * the pseudo-locales need one). Front PT0: a language before its release (pt-BR) opens in an en-US browser with its `?lang=`
 * preview; once released, in its own browser language without a query. */
export const contextLocale=(lang:string):string=>isReleased(lang)?BROWSER_LOCALE[lang]??lang:'en-US';
export const contextQuery=(lang:string):string=>lang==='en'||isReleased(lang)?'':`?lang=${lang}`;
