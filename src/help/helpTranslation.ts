import {uiLanguage} from '../i18n';
import {languageEntry} from '../i18n/languages';
import type {HelpFileIdentity} from './helpFiles';
/** Front ES-HELP [W]: the Spanish (es-419) web adaptation of VIREO's help files, authored in VIREO's own file format in
 * src/i18n/es/help/<NAME>.ts (`{language, sourceName, sourceSha256, text}`; sourceSha256 is the SHA-256 of the original it was
 * translated from). Each module is its own chunk, fetched only when the help viewer opens that file, never with the main Spanish
 * chunk. The viewer feeds the text, as Latin-1 bytes, to the same parsers as the original (core/cleaHelp.ts), so nothing changes
 * there. Not CLEA's text; the original bytes, hashes and provenance are unchanged.
 * Front SC8: any registered language whose src/i18n/languages.json entry has `help` translates them, in
 * src/i18n/<dir>/help/<NAME>.ts; each module names its `language` (the loader refuses another language's module, and
 * scripts/check-i18n-dist.mjs counts each language's help chunks by it). */
export type HelpView='translation'|'original';
type Module=Readonly<{language:string;sourceName:string;sourceSha256:string;text:string}>;
const loaders=import.meta.glob<Module>('../i18n/*/help/*.ts');
/** The language of this load when it translates the help files. */
const helpLanguage=()=>{const l=languageEntry(uiLanguage());return l?.help?l:undefined;};
/** The viewer's marker of a "Related Topics" line (core/cleaHelp.ts helpTopicBody) in VIREO's original files. */
export const RELATED_MARKER='RELATED TOPICS';
/** The marker in each view: the original's, or that of this load's language (its registry entry's `help.related`). */
export const relatedMarker=(view:HelpView):string=>view==='translation'?helpLanguage()?.help?.related??RELATED_MARKER:RELATED_MARKER;
/** The translation is offered when this load's language translates the help files. */
export const helpTranslationOffered=():boolean=>!!helpLanguage();
export class HelpTranslationError extends Error{constructor(readonly file:string){super(`Help translation: ${file}`);this.name='HelpTranslationError';}}
/** The translated text of `file` as Latin-1 bytes, refused when its recorded source is not the bundled original. */
export async function loadHelpTranslation(file:HelpFileIdentity):Promise<Uint8Array>{
 const language=helpLanguage(),load=language&&loaders[`../i18n/${language.dir}/help/${file.name.toUpperCase()}.ts`];
 if(!language||!load)throw new HelpTranslationError(file.name);
 return helpTranslationBytes(await load(),file,language.tag);
}
/** A translation module's text as Latin-1 bytes; refused when it names another language, source file or SHA-256, or has a
 * character above U+00FF. */
export function helpTranslationBytes(m:Module,file:HelpFileIdentity,language:string):Uint8Array{
 if(m.language!==language||m.sourceName!==file.name||m.sourceSha256!==file.sha256||typeof m.text!=='string')throw new HelpTranslationError(file.name);
 const bytes=new Uint8Array(m.text.length);
 for(let i=0;i<m.text.length;i++){const c=m.text.charCodeAt(i);if(c>255)throw new HelpTranslationError(file.name);bytes[i]=c;}
 return bytes;
}
