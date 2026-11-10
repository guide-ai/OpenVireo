import {PSEUDO_CLOSE,PSEUDO_OPEN} from './pseudo';
/** Front RTL-1 (RT2) [dev server and tests only]: the right-to-left stress pseudo-locale `qps-rtl` (docs/I18N.md; plan
 * analysis/front-plans/front-i18n-rtl.md § 5.1). Like the other pseudo-locales every catalog, map and vireo() string is wrapped
 * in ⟦…⟧ and map functions have their result marked only (src/i18n/pseudoScripts.ts registers it beside qps-cjk, qps-deva and
 * qps-cyrl); its <html lang> is `ar` and its <html dir> `rtl` (src/i18n/locale.ts), so the page mirrors and `:lang(ar)` rules
 * apply. The transform:
 * - each ASCII word of n letters becomes round(1.25 n) Arabic letters (at least one), word-stable by a case-folded hash, mixing
 *   dual-joining letters with the non-joiners ا د ذ ر ز و so every joining form (isolated, initial, medial, final) occurs;
 *   about one word in four carries a haraka (fatha above, kasra below, or shadda with fatha stacked) for ink above and below;
 *   the plan's 0.9 letters per letter drew the catalog 1.00× as wide as the English in Chromium (100 px, test fonts); 1.25 draws
 *   it 1.25× (Noto Sans Arabic named first) to 1.29× (the site's token stack, where DejaVu Sans draws Arabic), the plan's
 *   1.2–1.3× target;
 * - kept in Latin, so the page carries the left-to-right runs real Arabic text will: `{params}` and `<tag>`-like placeholders,
 *   digits and the decimal point, ALL-CAPS tokens (HTL, CCD, NGC, QSO, QSOs), tokens with a digit or with an inner dot, slash or
 *   underscore (Hubble.HTL, km/s, M82, N0000.DAT), and the whole of a parenthesised group (the «Arabic (English VIREO name)»
 *   shape of the translations to come);
 * - `,` `;` `?` become ، ؛ ؟ (not inside a number); `.` and `…` are kept.
 * It writes no bidi control character (U+200E/F, U+061C, U+202A–E, U+2066–9): isolation is the bidi runtime's job (RT4), never
 * the text's. Pure, deterministic and idempotent, so specs compute expected names with it. No top-level calls. */

/** Kept parts, in order of priority: placeholders, a parenthesised group (innermost, one level), a number with its decimal
 * point, thousands separators or clock colons (1,234.5, 12:00), a token with an inner . / _ between letters or digits, a token
 * with a digit, an ALL-CAPS token of two letters or more (with a plural s: QSOs). Then a word to transform. */
const TOKEN=/(\{\w+\}|<\/?[A-Za-z][\w-]*>|\([^()]*\)|[0-9]+(?:[.,:][0-9]+)+|[A-Za-z0-9]+(?:[._/][A-Za-z0-9]+)+|[A-Za-z]*[0-9][A-Za-z0-9]*|(?<![A-Za-z])[A-Z]{2,}s?(?![A-Za-z]))|([A-Za-z]+)/g;
/** Dual-joining letters (they join on both sides) and the right-joining non-joiners, interleaved so the table index lands on a
 * non-joiner about one letter in four. */
const JOINING='بتثجحخسشصضطظعغفقكلمنهي';
const NON_JOINING='اوردزذ';
/** Fatha (above), kasra (below), shadda + fatha (two marks stacked above). */
const HARAKAT=['َ','ِ','َّ'];
const PUNCTUATION:Readonly<Record<string,string>>={',':'،',';':'؛','?':'؟'};
/** A deterministic hash of a word, case-folded, so `File`, `file` and `FILE`-like spellings share their shape. */
function hash(word:string):number{let h=7;for(let i=0;i<word.length;i++)h=(h*31+(word.charCodeAt(i)|32))%2147483647;return h;}
function arabicWord(word:string):string{
 const n=word.length,k=Math.max(1,Math.round(1.25*n)),h=hash(word);let out='';
 for(let i=0;i<k;i++){
  const c=(word.charCodeAt(Math.floor(i*n/k))|32)+i*7+h;
  // Every fourth position (shifted by the hash) is a non-joiner, the rest dual-joining: initial, medial and final forms all occur.
  out+=(i+h)%4===3?NON_JOINING[c%NON_JOINING.length]:JOINING[c%JOINING.length];
 }
 if(h%4===0){const at=Math.min(k-1,(h>>2)%k),letters=[...out];letters[at]+=HARAKAT[(h>>4)%HARAKAT.length];out=letters.join('');}
 return out;
}
function plain(text:string):string{
 // Kept tokens (numbers among them) are set aside first, so their own , ; ? stay as they are.
 const kept:string[]=[];
 const words=text.replace(TOKEN,(_,keep:string|undefined,word:string|undefined)=>{if(keep!==undefined){kept.push(keep);return '\uE000';}return arabicWord(word!);});
 let k=0;
 return words.replace(/[,;?]/g,c=>PUNCTUATION[c]).replace(/\uE000/g,()=>kept[k++]);
}
/** `qps-rtl`: Arabic letters with Latin placeholders, numbers, acronyms, file names and parenthesised originals kept. */
export function pseudoRtl(text:string):string{
 if(!text||(text.startsWith(PSEUDO_OPEN)&&text.endsWith(PSEUDO_CLOSE)))return text;
 return PSEUDO_OPEN+plain(text)+PSEUDO_CLOSE;
}
