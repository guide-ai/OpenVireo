import {activateLocale,earlyTextRequests} from './active';
import type {LocaleBundle} from './catalog';
import {decideLocale,HTML_LANG,SPANISH_RELEASED,type UiLanguage} from './locale';
/** Front ES0 [W]: what src/boot.ts does once per load, with the page reached through `page` so tests can run it (docs/I18N.md).
 * Decide the language, get its bundle, activate it, set <html lang> and the title. A bundle that cannot be built or does not
 * validate is logged and replaced by English: a broken translation never blanks the page. Text requested before this ran is
 * reported (it would have stayed English; see earlyTextRequests). */
export type SettlePage=Readonly<{
 search:string;
 stored:()=>string|null;
 languages:readonly string[];
 dev:boolean;
 bundleFor:(language:UiLanguage)=>LocaleBundle|null;
 setLang:(lang:string)=>void;
 setTitle:(title:string)=>void;
 error:(message:string,detail?:unknown)=>void;
}>;
export function settleLanguage(page:SettlePage):UiLanguage{
 let stored:string|null=null;try{stored=page.stored();}catch{stored=null;}
 const wanted=decideLocale({param:new URLSearchParams(page.search).get('lang'),stored,languages:page.languages,released:SPANISH_RELEASED,dev:page.dev});
 let language:UiLanguage='en',bundle:LocaleBundle|null=null;
 try{bundle=page.bundleFor(wanted);language=activateLocale(bundle);}
 catch(error){page.error('OpenVireo: the language bundle could not be used; English is used.',error);bundle=null;language=activateLocale(null);}
 const early=earlyTextRequests();
 if(early)page.error(`OpenVireo: ${early} text request(s) ran before the language was settled and stayed English.`);
 page.setLang(HTML_LANG[language]);
 const title=bundle?.messages['app.documentTitle'];if(title)page.setTitle(title);
 return language;
}
