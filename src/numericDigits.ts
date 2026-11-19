// Front HI0 (docs/I18N.md, "The digit notice"; decision of 2026-11-09 and the coordinator's C1 of 2026-11-19): every number the
// site reads is written with the digits 0–9 (VIREO's files, the catalogs, the typed inputs), and a field never converts other
// digits. A Hindi keyboard types ०–९, a Japanese or Chinese input method in full-width mode ０–９, an Arabic one ٠–٩; such a
// value fails the field's own check (Number('१२') is NaN) with a message that does not say why. The notice
// (src/components/DigitNotice.tsx) says why, in the page's language, and changes nothing else: the value stays as typed and
// every field keeps its own check. This module is the pure half.

/** A decimal digit (Unicode Nd) other than ASCII 0–9: Devanagari ०–९, full-width ０–９, Arabic-Indic ٠–٩, Bengali ০–৯… */
const FOREIGN_DIGIT=/(?![0-9])\p{Nd}/gu;
/** At most this many distinct digits are quoted back in the notice. */
export const QUOTED_DIGITS=6;

/** The distinct non-ASCII decimal digits of `text`, in the order they first appear (at most QUOTED_DIGITS), or '' if none. */
export function foreignDigits(text:string):string{
 const seen:string[]=[];
 for(const m of text.matchAll(FOREIGN_DIGIT)){if(!seen.includes(m[0]))seen.push(m[0]);if(seen.length===QUOTED_DIGITS)break;}
 return seen.join('');
}

/** The input types whose text the notice watches: single-line text entry. Every typed number on the site is one of these
 * (`type=number`, or a text field with or without `inputmode`); free-text fields are watched too, since every file the site
 * writes reads digits as 0–9. Email, URL and password fields are not text the site reads as numbers. */
export const WATCHED_TYPES:ReadonlySet<string>=new Set(['text','search','number','tel']);
/** A field opts out with this attribute on itself or an ancestor, for text in which other digits are meant. None does today
 * (src/numericDigitsAudit.test.ts pins the list). */
export const OPT_OUT_ATTRIBUTE='data-any-digits';

/** Duck-typed so the pure tests need no DOM. */
export type FieldLike=Readonly<{tagName:string;type:string;readOnly:boolean;disabled:boolean;closest:(selector:string)=>unknown}>;
/** The event target as a watched field, or null. */
export function watchedField<T extends FieldLike>(target:T|EventTarget|null):T|null{
 if(!target||typeof (target as FieldLike).tagName!=='string')return null;
 const f=target as T;
 if(f.tagName!=='INPUT'||!WATCHED_TYPES.has(f.type)||f.readOnly||f.disabled)return null;
 return f.closest(`[${OPT_OUT_ATTRIBUTE}]`)?null:f;
}

/** What an input event inserts: its data, or the pasted or dropped plain text. */
export const insertedText=(e:Readonly<{data:string|null;dataTransfer:DataTransfer|null}>)=>e.data??e.dataTransfer?.getData('text/plain')??'';
