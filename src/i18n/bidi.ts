import {current} from './active';
import {firstStrongIsolate,ltrIsolate} from './isolates';
/** Front RT4 (docs/I18N.md "RTL groundwork: the bidi runtime"; plan analysis/front-plans/front-i18n-rtl.md § 3.2): the helpers that
 * isolate mixed-direction text in a right-to-left load and return their input unchanged in every other load, so English, Spanish
 * and Portuguese text is byte-identical. `t()` parameters, English fallbacks and VIREO originals are isolated by the runtime itself
 * (src/i18n/catalog.ts, vireo.ts, registry.ts); these are for the places it cannot see. They are presentation only: a file writer
 * never calls them (F1), and numbers keep `en-US` (src/i18n/index.ts formatNumber, fixed, scientific). */
export {BIDI_CONTROLS,FSI,LRI,PDI} from './isolates';

/** A value inside a right-to-left language's map function: `(n,file)=>\`${iso(n)} نجمة في ${iso(file)}\``. FSI…PDI in a
 * right-to-left load, so "-12.5" and "Hubble.HTL" keep their order; `String(value)` otherwise (the English maps never call it). */
export const iso=(value:string|number):string=>current().rtl?firstStrongIsolate(String(value)):String(value);
/** The text of an SVG `<text>` label in a plot (an LTR island, RT5): FSI…PDI in a right-to-left load, so an Arabic axis title reads
 * right to left in its own isolate while its `textAnchor` keeps the English geometry; unchanged otherwise. The sites are RT12's. */
export const plotText=(text:string):string=>current().rtl?firstStrongIsolate(text):text;
/** English text composed from several pieces (a VIREO sentence built from `fragment` originals and data, a caption joined to a
 * message) shown in a right-to-left load: LRI…PDI around the whole, so its pieces keep their English order; unchanged otherwise.
 * vireo() isolates each whole original itself; this is for the composed sites RT7's walk lists. */
export const ltrText=(text:string):string=>current().rtl?ltrIsolate(text):text;
