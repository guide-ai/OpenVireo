/** Front ES-REL (docs/I18N.md; plan §3.3): Spanish is released, so the Spanish specs open Spanish with the browser language
 * alone. Each runs in an es-MX browser (`test.use({locale:SPANISH_LOCALE})`) and loads its routes without `?lang=`; English
 * reference runs in the same browser ask for English with `?lang=en` (the link parameter beats the browser language), and the
 * dev-only pseudo-locale with `?lang=qps`. Only the tests that check the preview link itself keep `?lang=es-419`. The English
 * suite keeps Playwright's `locale:'en-US'` from the configs. */
export const SPANISH_LOCALE='es-MX';
/** The query that opens `lang` in an es-MX browser: none for Spanish, `?lang=<lang>` for English and the pseudo-locales. */
export const langQuery=(lang:string):string=>lang==='es-419'?'':`?lang=${lang}`;
/** For a context made for one language: its browser language (es-MX for Spanish, en-US otherwise) and the query it needs (only
 * the pseudo-locales need one). */
export const contextLocale=(lang:string):string=>lang==='es-419'?SPANISH_LOCALE:'en-US';
export const contextQuery=(lang:string):string=>lang==='es-419'||lang==='en'?'':`?lang=${lang}`;
