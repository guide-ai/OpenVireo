import {activeBundle} from './index';
/** Front ES0 [W]: VIREO's own literals (DFM captions, menu items, MessageBox texts) stay byte-exact in src/core/, which never
 * imports the catalog. A render site that shows one on screen opts in with `vireo(LITERAL)`; file writers and the on-screen
 * mirrors of a written file never call it, so the same constant can feed a translated dialog and an English file
 * (docs/I18N.md; user decision 3, 2026-11-09). scripts/audit-ui-messages.mjs (`auditOriginals`) lists every unwrapped site. */

/** The dictionary key of an original: single `&` accelerators removed, `&&` kept as `&`, trimmed. */
export const normalizeOriginal=(text:string):string=>text.replace(/&(&?)/g,(_,doubled:string)=>doubled).trim();
/** The translation of an original literal for this load, or the literal itself. `context` separates one English text that
 * needs two translations (the dictionary key is `context|original`, with the plain original as a fallback). */
export function vireo(text:string,context?:string):string{
 const bundle=activeBundle();if(!bundle)return text;
 const key=normalizeOriginal(text),originals=bundle.originals??{};
 if(context!==undefined&&Object.hasOwn(originals,`${context}|${key}`))return originals[`${context}|${key}`];
 if(Object.hasOwn(originals,key))return originals[key];
 return bundle.deriveOriginal?bundle.deriveOriginal(text):text;
}
