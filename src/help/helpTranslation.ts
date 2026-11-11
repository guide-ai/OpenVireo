import {createContext,useContext} from 'react';
import {uiLanguage} from '../i18n';
import {languageEntry,type LanguageEntry} from '../i18n/languages';
import type {HelpFileIdentity} from './helpFiles';
/** Front ES-HELP [W]: the Spanish (es-419) web adaptation of VIREO's help files, authored in VIREO's own file format in
 * src/i18n/es/help/<NAME>.ts (`{language, sourceName, sourceSha256, text}`; sourceSha256 is the SHA-256 of the original it was
 * translated from). Each module is its own chunk, fetched only when the help viewer opens that file, never with the main Spanish
 * chunk. Not CLEA's text; the original bytes, hashes and provenance are unchanged.
 * Front SC8: any registered language whose src/i18n/languages.json entry has `help` translates them, in
 * src/i18n/<dir>/help/<NAME>.ts; each module names its `language` (the loader refuses another language's module, and
 * scripts/check-i18n-dist.mjs counts each language's help chunks by it).
 * Front SC7 (docs/I18N.md, "Script groundwork: Unicode help (SC7)"): a translation is Unicode text in any script, read by the
 * `…Text` parsers of core/cleaHelp.ts, help/spectralLines.ts and help/mainHelp.ts; VIREO's originals stay bytes, read as
 * before. The viewers take their help set from `useHelpSet()`: this load's registry language, or a test fixture given through
 * `HelpSetContext` (tests/harness/help.tsx). */
export type HelpView='translation'|'original';
type Module=Readonly<{language:string;sourceName:string;sourceSha256:string;text:string}>;
/** A translated help set: its language tag, its "RELATED TOPICS" marker, and the verified text of each file it translates. */
export type HelpSet=Readonly<{tag:string;related:string;load:(file:HelpFileIdentity)=>Promise<string>}>;
/** A file as a viewer holds it: VIREO's original as its verified bytes, a translation as its verified Unicode text. */
export type HelpSource=Uint8Array|string;
const loaders=import.meta.glob<Module>('../i18n/*/help/*.ts');
export class HelpTranslationError extends Error{constructor(readonly file:string){super(`Help translation: ${file}`);this.name='HelpTranslationError';}}
/** The translated text of `file` in a registered language, refused when its recorded source is not the bundled original. */
async function loadHelpTranslation(language:LanguageEntry,file:HelpFileIdentity):Promise<string>{
 const load=loaders[`../i18n/${language.dir}/help/${file.name.toUpperCase()}.ts`];
 if(!load)throw new HelpTranslationError(file.name);
 return helpTranslationText(await load(),file,language.tag);
}
const sets=new Map<string,HelpSet>();
/** The help set of this load's language when it translates the help files (its registry entry's `help`), else undefined. */
export function registryHelpSet():HelpSet|undefined{
 const l=languageEntry(uiLanguage());
 if(!l?.help)return undefined;
 let set=sets.get(l.tag);
 if(!set){const language=l;set=Object.freeze({tag:l.tag,related:l.help.related,load:(file:HelpFileIdentity)=>loadHelpTranslation(language,file)});sets.set(l.tag,set);}
 return set;
}
/** Tests only: a help set that replaces the registry's for the viewers below it (null, the default: the registry's). */
export const HelpSetContext=createContext<HelpSet|null>(null);
/** The help set the viewers offer: the context's, or this load's language's (undefined: the originals only). */
export const useHelpSet=():HelpSet|undefined=>useContext(HelpSetContext)??registryHelpSet();
/** The viewer's marker of a "Related Topics" line (core/cleaHelp.ts helpTopicBody) in VIREO's original files. */
export const RELATED_MARKER='RELATED TOPICS';
/** A module's text, refused when it names another language, source file or SHA-256, is not a string, holds a lone surrogate,
 * or is not in Unicode Normalization Form C (the search fold and the seeks compare NFC text). Any script is accepted (Front SC7:
 * the former limit of U+00FF is gone; the Spanish and Portuguese texts stay Latin-1 by their own tests, Portuguese with U+202F
 * between thousands since PT-SEO). */
export function helpTranslationText(m:Module,file:HelpFileIdentity,language:string):string{
 if(m.language!==language||m.sourceName!==file.name||m.sourceSha256!==file.sha256||typeof m.text!=='string')throw new HelpTranslationError(file.name);
 if(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(m.text)||m.text.normalize('NFC')!==m.text)throw new HelpTranslationError(file.name);
 return m.text;
}
