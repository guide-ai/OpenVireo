import {afterEach,describe,expect,it} from 'vitest';
import en from './en.json';
import {activateLocale,uiDirection,uiLanguage} from './index';
import type {LocaleBundle,MessageKey} from './catalog';
import {LANGUAGES,matchLanguage,optionLabel,textDirection,type LanguageEntry} from './languages';
import {HTML_DIR,HTML_LANG,htmlDir} from './locale';
import {settleLanguage,type SettlePage,type Settled} from './settle';
import {PARTIAL} from '../../tests/fixtures/i18n/partial';
import {PLANNED,RTL} from '../../tests/fixtures/i18n/registry';

// Front RTL-1 (RT1; docs/I18N.md "RTL groundwork…"; plan front-i18n-rtl.md § 7): the optional `direction` of the language
// registry and <html dir>. Every language today is left to right, so nothing changes for English, Spanish or Portuguese but
// the attribute itself; the right-to-left fixture languages (tests/fixtures/i18n/registry.ts RTL) exercise the other side.
/** The direction Intl gives a tag (Node 22 has the `textInfo` getter; newer engines `getTextInfo()`). */
const intlDirection=(tag:string):string=>{const l=new Intl.Locale(tag) as Intl.Locale&{getTextInfo?:()=>{direction:string};textInfo?:{direction:string}};return (l.getTextInfo?.()??l.textInfo)!.direction;};
const problems=(registry:readonly LanguageEntry[])=>registry.flatMap(l=>{
 const out:string[]=[];
 if(l.direction!==undefined&&l.direction!=='ltr'&&l.direction!=='rtl')out.push(`${l.tag}: direction ${String(l.direction)}`);
 if((l.direction??'ltr')!==intlDirection(l.htmlLang))out.push(`${l.tag}: direction ${l.direction??'ltr (absent)'} but Intl gives ${l.htmlLang} ${intlDirection(l.htmlLang)}`);
 return out;
});
afterEach(()=>{activateLocale(null);});

describe('Front RTL-1: the registry direction',()=>{
 it('is optional, ltr or rtl, and equals the direction Intl gives each <html lang>, in the registry and the fixtures',()=>{
  expect(problems(LANGUAGES)).toEqual([]);expect(problems(PLANNED)).toEqual([]);expect(problems(RTL)).toEqual([]);expect(problems([PARTIAL])).toEqual([]);
  // No language today sets it: absent means ltr, and the existing `dir` stays the folder name.
  expect(LANGUAGES.filter(l=>Object.hasOwn(l,'direction')).map(l=>l.tag)).toEqual([]);
  expect(LANGUAGES.map(l=>[l.tag,l.dir,textDirection(l.tag)])).toEqual(LANGUAGES.map(l=>[l.tag,l.dir,'ltr']));
  // A mistake fails: Arabic marked ltr, Spanish marked rtl, an unknown value.
  const wrong=(l:LanguageEntry,direction:unknown)=>({...l,direction}) as LanguageEntry;
  expect(problems([wrong(RTL[0],'ltr'),wrong(LANGUAGES[0],'rtl'),wrong(RTL[1],'RTL')])).toEqual([
   'ar: direction ltr but Intl gives ar rtl','es-419: direction rtl but Intl gives es-419 ltr','he: direction RTL','he: direction RTL but Intl gives he rtl']);
  expect(problems([{...RTL[0],direction:undefined} as LanguageEntry])).toEqual(['ar: direction ltr (absent) but Intl gives ar rtl']);
 });
 it('textDirection: a registered language\'s own, ltr when absent, for English and outside the registry',()=>{
  for(const tag of ['en','es-419','pt-BR','qps','qps-rtl','ar','','constructor'])expect(textDirection(tag),tag).toBe('ltr');
  for(const l of RTL)expect(textDirection(l.tag,[...LANGUAGES,...RTL]),l.tag).toBe('rtl');
  expect(textDirection('es-419',[...LANGUAGES,...RTL])).toBe('ltr');
 });
 it('the fixtures detect as the plan says (ar every region, he and iw, fa) and show their autonyms with the English name',()=>{
  const registry=[...PLANNED,...RTL];
  for(const [tag,want] of [['ar','ar'],['ar-EG','ar'],['ar-SA','ar'],['AR-ma','ar'],['he-IL','he'],['iw','he'],['iw-IL','he'],['fa-IR','fa'],['fa-AF','fa'],['ur','none'],['ps','none'],['ckb','none'],['yi','none']] as const)
   expect(matchLanguage(tag,registry)?.tag??'none',tag).toBe(want);
  expect(RTL.map(optionLabel)).toEqual(['العربية (Arabic)','עברית (Hebrew)','فارسی (Persian)']);
 });
});

describe('Front RTL-1: <html dir>',()=>{
 it('HTML_DIR sits beside HTML_LANG: ltr for English, every registered language and qps, rtl only for the dev-only qps-rtl',()=>{
  expect(Object.keys(HTML_DIR).sort()).toEqual(Object.keys(HTML_LANG).sort());
  expect(HTML_DIR).toEqual({en:'ltr','es-419':'ltr','pt-BR':'ltr',qps:'ltr','qps-cjk':'ltr','qps-deva':'ltr','qps-cyrl':'ltr','qps-rtl':'rtl'});
  expect(htmlDir('ar',[...LANGUAGES,...RTL])).toBe('rtl');expect(htmlDir('ar')).toBe('ltr');expect(htmlDir('qps-rtl')).toBe('rtl');
  // A test registry's own entry decides over HTML_DIR (a registered tag marked rtl in a fixture).
  expect(htmlDir('es-419',LANGUAGES.map(l=>({...l,direction:'rtl' as const})))).toBe('rtl');
 });
 /** A settled load with the registry `registry`; `bundle` returns the language's bundle (or throws). */
 const settle=(search:string,registry:readonly LanguageEntry[],bundle:(language:string)=>LocaleBundle|null)=>{
  const lang:string[]=[],dir:string[]=[],errors:unknown[]=[];
  const page:SettlePage={search,stored:()=>null,languages:['en-US'],dev:false,registry,bundleFor:bundle,setLang:x=>{lang.push(x);},setDir:x=>{dir.push(x);},setTitle:()=>{},error:e=>{errors.push(e);}};
  return {settled:settleLanguage(page) as Settled,lang,dir,errors};
 };
 const english=(language:string):LocaleBundle=>Object.freeze({language,messages:{...en} as Record<MessageKey,string>});
 it('is set once per load from the activated language: ltr for English and each language today, rtl for an rtl language',()=>{
  expect(settle('',LANGUAGES,()=>null)).toMatchObject({settled:{language:'en',failed:null},lang:['en'],dir:['ltr'],errors:[]});
  for(const l of LANGUAGES)expect(settle(`?lang=${l.tag}`,LANGUAGES,english),l.tag).toMatchObject({settled:{language:l.tag,failed:null},lang:[l.htmlLang],dir:['ltr'],errors:[]});
  const registry=[...LANGUAGES,...RTL];
  expect(settle('?lang=ar',registry,english)).toMatchObject({settled:{language:'ar',failed:null},lang:['ar'],dir:['rtl'],errors:[]});
  expect(uiLanguage()).toBe('ar');
 });
 it('a right-to-left language whose bundle fails is English and ltr, as <html lang> is',()=>{
  const failed=settle('?lang=he',[...LANGUAGES,...RTL],()=>{throw new Error('chunk failed');});
  expect(failed).toMatchObject({settled:{language:'en',failed:'he'},lang:['en'],dir:['ltr']});expect(failed.errors).toHaveLength(1);
 });
 it('setDir is optional: a page without it settles as before',()=>{
  const lang:string[]=[];
  expect(settleLanguage({search:'',stored:()=>null,languages:['en-US'],dev:false,bundleFor:()=>null,setLang:x=>{lang.push(x);},setTitle:()=>{},error:()=>{}})).toEqual({language:'en',failed:null});
  expect(lang).toEqual(['en']);
 });
 it('uiDirection() is the direction of the active language (the same as <html dir>)',()=>{
  expect(uiDirection()).toBe('ltr');
  activateLocale(english('es-419'));expect(uiDirection()).toBe('ltr');
 });
});
