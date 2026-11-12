import {describe,expect,it} from 'vitest';
import {LANGUAGES,textDirection,type LanguageEntry} from '../i18n/languages';
import {ENGLISH,SEO_LANGUAGES,seoDirection} from './languages';
import {labPage,labsIndexPage,languageHomePage,languageLinks,staticSeoFiles} from './pages';

// Front RT9 (docs/I18N.md "RTL groundwork: RTL lint profiles and direction plumbing (RT8, RT9)"; plan front-i18n-rtl.md § 7): the static
// pages' <html dir> and the `dir` of their language links come from the app's registry. No right-to-left language has pages (that is
// a later AR-SEO front), so the right-to-left side uses a test registry in which Spanish is marked right to left: a stand-in for the
// plumbing only, never a claim about Spanish.
const SPANISH_RTL:readonly LanguageEntry[]=LANGUAGES.map(l=>l.tag==='es-419'?{...l,direction:'rtl' as const}:l);
const SPANISH=SEO_LANGUAGES.find(l=>l.tag==='es-419')!,PORTUGUESE=SEO_LANGUAGES.find(l=>l.tag==='pt-BR')!;
const htmlTag=(page:string)=>/<html[^>]*>/.exec(page)![0];
/** The language links of a page as [hreflang, its dir attribute or '-']. */
const links=(page:string)=>[...page.matchAll(/<a href="[^"]*" hreflang="([^"]*)" lang="[^"]*"( dir="[^"]*")?>/g)].map(m=>[m[1],m[2]?.trim()??'-']);

describe('Front RT9: direction in the static pages',()=>{
 it('reads each row\'s direction from the registry: ltr for every language with pages today',()=>{
  for(const l of SEO_LANGUAGES)expect(seoDirection(l),l.tag).toBe(textDirection(l.tag));
  expect(SEO_LANGUAGES.map(l=>seoDirection(l))).toEqual(SEO_LANGUAGES.map(()=>'ltr'));
  expect(seoDirection(ENGLISH,SPANISH_RTL)).toBe('ltr');expect(seoDirection(SPANISH,SPANISH_RTL)).toBe('rtl');
 });
 it('writes no dir attribute in any page while every language is left to right (the pages are unchanged)',()=>{
  const files=Object.entries(staticSeoFiles()).filter(([f])=>f.endsWith('.html'));
  expect(files.length).toBeGreaterThan(20);
  for(const [file,page] of files)expect(page,file).not.toMatch(/ dir="/);
 });
 it('gives a right-to-left language\'s pages <html dir="rtl">, and the links to left-to-right languages dir="ltr"',()=>{
  const lab=SPANISH.labs[0];
  for(const page of [labPage(lab,SPANISH,SPANISH_RTL),labsIndexPage(SPANISH,SPANISH_RTL),languageHomePage(SPANISH,SPANISH_RTL)]){
   expect(htmlTag(page)).toBe('<html lang="es-419" dir="rtl">');
   expect(links(page)).toEqual([['en','dir="ltr"'],['pt-BR','dir="ltr"'],['fr','dir="ltr"']]);
  }
 });
 it('in a left-to-right page, only the link to the right-to-left language carries dir="rtl"',()=>{
  const page=labPage(ENGLISH.labs[0],ENGLISH,SPANISH_RTL);
  expect(htmlTag(page)).toBe('<html lang="en">');
  expect(links(page)).toEqual([['es-419','dir="rtl"'],['pt-BR','-'],['fr','-']]);
  expect(htmlTag(languageHomePage(PORTUGUESE,SPANISH_RTL))).toBe('<html lang="pt-BR">');
  expect(languageLinks(PORTUGUESE,'labs',SPANISH_RTL)).toContain('hreflang="es-419" lang="es-419" dir="rtl">Español</a>');
 });
});
