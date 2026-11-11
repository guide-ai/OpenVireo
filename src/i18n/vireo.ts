import {activeBundle} from './index';
import {current} from './active';
import {hasRtlLetter,ltrIsolate} from './isolates';
/** Front ES0 [W]: VIREO's own literals (DFM captions, menu items, MessageBox texts) stay byte-exact in src/core/, which never
 * imports the catalog. A render site that shows one on screen opts in with `vireo(LITERAL)`; file writers and the on-screen
 * mirrors of a written file never call it, so the same constant can feed a translated dialog and an English file
 * (docs/I18N.md; user decision 3, 2026-11-09). scripts/audit-ui-messages.mjs (`auditOriginals`) lists every unwrapped site. */

/** A VIREO menu item for this load, ending in the web's ellipsis: accelerators dropped, VIREO's '...' replaced by '…'. Front RT4: an
 * English item in a right-to-left load is isolated with its ellipsis ("Save As…", never "…Save As"). */
export const vireoMenuItem=(text:string,context?:string):string=>{
 const shown=original(text,context),item=normalizeOriginal(shown.text).replace(/(?:\.\.\.|…)$/,'')+'…';
 return shown.english?ltrIsolate(item):item;
};
/** A list of originals for this load (radio and option captions rendered with `.map`). */
export const vireoList=(texts:readonly string[],context?:string):string[]=>texts.map(text=>vireo(text,context));
/** The dictionary key of an original: single `&` accelerators removed, `&&` kept as `&`, trimmed. */
export const normalizeOriginal=(text:string):string=>text.replace(/&(&?)/g,(_,doubled:string)=>doubled).trim();
/** The translation of an original literal for this load, or the literal itself. `context` separates one English text that
 * needs two translations (the dictionary key is `context|original`, with the plain original as a fallback). */
export function vireo(text:string,context?:string):string{
 const shown=original(text,context);
 return shown.english?ltrIsolate(shown.text):shown.text;
}
/** What vireo() shows, and whether vireo() and vireoMenuItem isolate it left to right (Front RT4): in a right-to-left load, text
 * with no right-to-left letter of its own — VIREO's English (an original with no translation, every original under "View
 * original (English)") or a translation kept in Latin letters. A `fragment` piece is never isolated alone: it is joined to others
 * and to data in one sentence, which an isolate per piece would reorder in a right-to-left paragraph (the composed sentence takes
 * bidi.ts ltrText). */
function original(text:string,context?:string):Readonly<{text:string;english:boolean}>{
 const shown=lookup(text,context);
 return {text:shown,english:current().rtl&&context!=='fragment'&&!hasRtlLetter(shown)};
}
function lookup(text:string,context?:string):string{
 const bundle=activeBundle();if(!bundle)return text;
 const key=normalizeOriginal(text),originals=bundle.originals??{};
 // Front ES2: the literal's own leading and trailing spacing (a head such as 'RA:  ' that coordinates follow) is kept. A context
 // entry (`ctx|original`, e.g. a `fragment|` piece of one sentence) carries its own spacing and is returned as written
 // (ES2 review 1: «¿Quitar la selección #2?», not «… #2 ?»).
 const spaced=(translation:string)=>/^\s*/.exec(text)![0]+translation+/\s*$/.exec(text)![0];
 if(context!==undefined&&Object.hasOwn(originals,`${context}|${key}`))return originals[`${context}|${key}`];
 if(Object.hasOwn(originals,key))return spaced(originals[key]);
 return bundle.deriveOriginal?bundle.deriveOriginal(text):text;
}
