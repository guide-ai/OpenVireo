import {activateLocale,earlyTextRequests,noteLanguageFailure} from './active';
import type {LocaleBundle} from './catalog';
import {decideLocale,HTML_LANG,htmlDir,type TextDirection,type UiLanguage} from './locale';
import {LANGUAGES,languageEntry,type LanguageEntry} from './languages';
/** Front ES0 [W]: what src/boot.ts does once per load, with the page reached through `page` so tests can run it (docs/I18N.md).
 * Decide the language, get its bundle, activate it, set <html lang>, <html dir> (Front RTL-1) and the title. A bundle that cannot be loaded, built or
 * validated is logged and replaced by English: a broken translation never blanks the page. Text requested before this ran is
 * reported (it would have stayed English; see earlyTextRequests).
 * Front ES1: a bundle may arrive asynchronously (the Spanish chunk, src/i18n/es/index.ts). Then settleLanguage returns a
 * promise, nothing is activated until the chunk is in, and src/main.tsx renders the app only after it settles. */
export type SettlePage=Readonly<{
 search:string;
 stored:()=>string|null;
 languages:readonly string[];
 dev:boolean;
 bundleFor:(language:UiLanguage)=>LocaleBundle|null|Promise<LocaleBundle|null>;
 /** "View original (English)" for VIREO's menus and dialogs (decision 9): vireo() returns the original literals. */
 originals?:()=>boolean;
 setLang:(lang:string)=>void;
 /** Front RTL-1 (RT1): sets <html dir> to the settled language's direction (ltr for every language today). Optional, so the
  * tests that do not look at it need not pass it. */
 setDir?:(dir:TextDirection)=>void;
 setTitle:(title:string)=>void;
 error:(message:string,detail?:unknown)=>void;
 /** Resolves after `ms` (default setTimeout); tests pass their own. */
 wait?:(ms:number)=>Promise<void>;
 /** The registered languages (src/i18n/languages.ts); tests pass their own. */
 registry?:readonly LanguageEntry[];
}>;
/** The settled language, and the language that was asked for but could not be used (its chunk failed, timed out or did not
 * validate), or null. The shell shows that language's failure notice when it is set (ES1 review 1, C1; src/i18n/languages.ts). */
export type Settled=Readonly<{language:UiLanguage;failed:UiLanguage|null}>;
/** How long a translated load waits for its chunk before it shows English (ES1 review 1, C4). */
export const LANGUAGE_TIMEOUT_MS=10_000;
const FAILED='OpenVireo: the language bundle could not be used; English is used.';
export function settleLanguage(page:SettlePage):Settled|Promise<Settled>{
 let stored:string|null=null;try{stored=page.stored();}catch{stored=null;}
 const wanted=decideLocale({param:new URLSearchParams(page.search).get('lang'),stored,languages:page.languages,registry:page.registry,dev:page.dev});
 let source:LocaleBundle|null|Promise<LocaleBundle|null>;
 try{source=page.bundleFor(wanted);}catch(error){page.error(FAILED,error);return finish(page,null,wanted,true);}
 if(!(source instanceof Promise))return finish(page,source,wanted,source===null);
 // The chunk races a timeout. Whichever settles first decides once: a chunk that arrives later is never activated.
 const wait=page.wait??((ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms)));
 const timeout=wait(LANGUAGE_TIMEOUT_MS).then(()=>{throw new Error(`the ${wanted} chunk did not arrive within ${LANGUAGE_TIMEOUT_MS} ms`);});
 return Promise.race([source,timeout]).then(bundle=>finish(page,bundle,wanted,bundle===null),error=>{page.error(FAILED,error);return finish(page,null,wanted,true);});
}
function finish(page:SettlePage,loaded:LocaleBundle|null,wanted:UiLanguage,missing:boolean):Settled{
 let bundle=loaded,language:UiLanguage,failed:UiLanguage|null=missing&&wanted!=='en'?wanted:null;
 let originals=false;try{originals=!!page.originals?.();}catch{originals=false;}
 if(bundle&&originals)bundle=Object.freeze({...bundle,originals:{},deriveOriginal:undefined});
 try{language=activateLocale(bundle);}
 catch(error){page.error(FAILED,error);bundle=null;language=activateLocale(null);if(wanted!=='en')failed=wanted;}
 noteLanguageFailure(failed);
 const early=earlyTextRequests();
 if(early)page.error(`OpenVireo: ${early} text request(s) ran before the language was settled and stayed English.`);
 page.setLang(languageEntry(language,page.registry??LANGUAGES)?.htmlLang??HTML_LANG[language]??'en');
 // The activated language's, as for <html lang>: a right-to-left load whose chunk failed is English and ltr.
 page.setDir?.(htmlDir(language,page.registry??LANGUAGES));
 const title=bundle?.messages['app.documentTitle'];if(title)page.setTitle(title);
 return Object.freeze({language,failed});
}
