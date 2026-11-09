import {activateLocale,earlyTextRequests} from './active';
import type {LocaleBundle} from './catalog';
import {decideLocale,HTML_LANG,SPANISH_RELEASED,type UiLanguage} from './locale';
/** Front ES0 [W]: what src/boot.ts does once per load, with the page reached through `page` so tests can run it (docs/I18N.md).
 * Decide the language, get its bundle, activate it, set <html lang> and the title. A bundle that cannot be loaded, built or
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
 setTitle:(title:string)=>void;
 error:(message:string,detail?:unknown)=>void;
}>;
const FAILED='OpenVireo: the language bundle could not be used; English is used.';
export function settleLanguage(page:SettlePage):UiLanguage|Promise<UiLanguage>{
 let stored:string|null=null;try{stored=page.stored();}catch{stored=null;}
 const wanted=decideLocale({param:new URLSearchParams(page.search).get('lang'),stored,languages:page.languages,released:SPANISH_RELEASED,dev:page.dev});
 let source:LocaleBundle|null|Promise<LocaleBundle|null>;
 try{source=page.bundleFor(wanted);}catch(error){page.error(FAILED,error);return finish(page,null);}
 if(source instanceof Promise)return source.then(bundle=>finish(page,bundle),error=>{page.error(FAILED,error);return finish(page,null);});
 return finish(page,source);
}
function finish(page:SettlePage,loaded:LocaleBundle|null):UiLanguage{
 let bundle=loaded,language:UiLanguage;
 let originals=false;try{originals=!!page.originals?.();}catch{originals=false;}
 if(bundle&&originals)bundle=Object.freeze({...bundle,originals:{},deriveOriginal:undefined});
 try{language=activateLocale(bundle);}
 catch(error){page.error(FAILED,error);bundle=null;language=activateLocale(null);}
 const early=earlyTextRequests();
 if(early)page.error(`OpenVireo: ${early} text request(s) ran before the language was settled and stayed English.`);
 page.setLang(HTML_LANG[language]);
 const title=bundle?.messages['app.documentTitle'];if(title)page.setTitle(title);
 return language;
}
