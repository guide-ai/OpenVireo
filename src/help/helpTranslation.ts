import {uiLanguage} from '../i18n';
import type {HelpFileIdentity} from './helpFiles';
/** Front ES-HELP [W]: the Spanish (es-419) web adaptation of VIREO's help files, authored in VIREO's own file format in
 * src/i18n/es/help/<NAME>.ts (`{sourceName, sourceSha256, text}`; sourceSha256 is the SHA-256 of the original it was translated
 * from). Each module is its own chunk, fetched only when the help viewer opens that file, never with the main Spanish chunk.
 * The viewer feeds the text, as Latin-1 bytes, to the same parsers as the original (core/cleaHelp.ts), so nothing changes
 * there. Not CLEA's text; the original bytes, hashes and provenance are unchanged. */
export type HelpView='translation'|'original';
type Module=Readonly<{sourceName:string;sourceSha256:string;text:string}>;
const loaders=import.meta.glob<Module>('../i18n/es/help/*.ts');
/** The viewer's marker of a "Related Topics" line (core/cleaHelp.ts helpTopicBody) in each view. */
export const RELATED_MARKER:Readonly<Record<HelpView,string>>=Object.freeze({original:'RELATED TOPICS',translation:'TEMAS RELACIONADOS'});
/** The translation is offered when this load is Spanish. */
export const helpTranslationOffered=():boolean=>uiLanguage()==='es-419';
export class HelpTranslationError extends Error{constructor(readonly file:string){super(`Help translation: ${file}`);this.name='HelpTranslationError';}}
/** The translated text of `file` as Latin-1 bytes, refused when its recorded source is not the bundled original. */
export async function loadHelpTranslation(file:HelpFileIdentity):Promise<Uint8Array>{
 const load=loaders[`../i18n/es/help/${file.name.toUpperCase()}.ts`];
 if(!load)throw new HelpTranslationError(file.name);
 return helpTranslationBytes(await load(),file);
}
/** A translation module's text as Latin-1 bytes; refused when it names another source file or SHA-256, or has a character
 * above U+00FF. */
export function helpTranslationBytes(m:Module,file:HelpFileIdentity):Uint8Array{
 if(m.sourceName!==file.name||m.sourceSha256!==file.sha256||typeof m.text!=='string')throw new HelpTranslationError(file.name);
 const bytes=new Uint8Array(m.text.length);
 for(let i=0;i<m.text.length;i++){const c=m.text.charCodeAt(i);if(c>255)throw new HelpTranslationError(file.name);bytes[i]=c;}
 return bytes;
}
