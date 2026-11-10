import {HELP_FILES,type HelpFileIdentity} from '../../../src/help/helpFiles';
import {HelpTranslationError,helpTranslationText,type HelpSet} from '../../../src/help/helpTranslation';
import {JA} from './ja';
import {HI} from './hi';
import {RU} from './ru';
/** Front SC7 (docs/I18N.md, "Script groundwork: Unicode help (SC7)"): test-only stand-in help sets in three scripts (Japanese,
 * Devanagari, Cyrillic), each translating three files (CAMHLP.LST, CAMHLP.TXT, Reminder.obs) as modules shaped like
 * src/i18n/<dir>/help/<NAME>.ts. Tags are from the ISO 639 local-use range qaa–qtz with the script subtag, so no real language is
 * added; `htmlLang` is the language whose :lang() rules (src/theme/scripts.css) a page in that script would get. Reached by
 * src/help/unicodeHelp.test.ts and, through HelpSetContext, the help harness (tests/harness/help.tsx). Never in the build. */
export type FixtureModule=Readonly<{language:string;sourceName:string;sourceSha256:string;text:string}>;
export type UnicodeHelpFixture=Readonly<{id:'ja'|'hi'|'ru';tag:string;htmlLang:string;related:string;modules:Readonly<Record<string,FixtureModule>>}>;
const modules=(tag:string,texts:Readonly<Record<string,string>>)=>Object.freeze(Object.fromEntries(Object.entries(texts).map(([key,text])=>
 [key,Object.freeze({language:tag,sourceName:HELP_FILES[key].name,sourceSha256:HELP_FILES[key].sha256,text})])));
export const UNICODE_HELP:readonly UnicodeHelpFixture[]=Object.freeze([
 Object.freeze({id:'ja',tag:'qaa-Jpan',htmlLang:'ja',related:'関連項目',modules:modules('qaa-Jpan',JA)}),
 Object.freeze({id:'hi',tag:'qab-Deva',htmlLang:'hi',related:'संबंधित विषय',modules:modules('qab-Deva',HI)}),
 Object.freeze({id:'ru',tag:'qac-Cyrl',htmlLang:'ru',related:'СВЯЗАННЫЕ ТЕМЫ',modules:modules('qac-Cyrl',RU)}),
] as const);
/** The fixture as the viewers' help set: each file through the production check (helpTranslationText); a file the fixture
 * does not translate fails as a missing module does, so the viewer falls back to VIREO's original with its note. */
export function fixtureHelpSet(f:UnicodeHelpFixture):HelpSet{
 return Object.freeze({tag:f.tag,related:f.related,load:async(file:HelpFileIdentity)=>{
  const m=f.modules[file.name.toUpperCase()];
  if(!m)throw new HelpTranslationError(file.name);
  return helpTranslationText(m,file,f.tag);
 }});
}
