import {afterEach,describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import en from '../i18n/en.json';
import {activateLocale,uiDirection} from '../i18n';
import type {LocaleBundle,MessageKey} from '../i18n/catalog';
import {LRI,PDI,RLI} from '../i18n/isolates';
import {LANGUAGES,directionWithin,type LanguageEntry} from '../i18n/languages';
import {RTL,releasing} from '../../tests/fixtures/i18n/registry';
import {LanguageSelect,dialogLanguageName} from './LanguageChoice';

// Front RT9 (docs/I18N.md "RTL groundwork: RTL lint profiles and direction plumbing (RT8, RT9)"; plan front-i18n-rtl.md § 7): `dir` on
// the selector's options and the reload dialog's language name, from the registry's `direction`. No right-to-left language is
// registered, so the right-to-left side uses the test registry's Arabic, Hebrew and Persian (tests/fixtures/i18n/registry.ts RTL).
const english=(language:string):LocaleBundle=>Object.freeze({language,messages:{...en} as Record<MessageKey,string>});
const WITH_RTL:readonly LanguageEntry[]=releasing([...LANGUAGES,...RTL],'ar','he','fa');
const select=(registry?:readonly LanguageEntry[])=>renderToStaticMarkup(createElement(LanguageSelect,{onSave:()=>{},...(registry?{registry}:{})}));
/** Each option as [value, dir or '-']. */
const optionDirs=(html:string)=>[...html.matchAll(/<option ([^>]*)>/g)].map(([,a])=>[/value="([^"]*)"/.exec(a)![1],/ dir="([^"]*)"/.exec(a)?.[1]??'-']);
afterEach(()=>{activateLocale(null);});

describe('Front RT9: the direction of an element in another language',()=>{
 it('directionWithin: the language\'s own direction only where it differs from the page\'s',()=>{
  for(const tag of ['en',...LANGUAGES.map(l=>l.tag)])expect(directionWithin(tag,'ltr'),tag).toBeUndefined();
  for(const l of RTL){expect(directionWithin(l.tag,'ltr',WITH_RTL),l.tag).toBe('rtl');expect(directionWithin(l.tag,'rtl',WITH_RTL),l.tag).toBeUndefined();}
  for(const tag of ['en','es-419','pt-BR','fr'])expect(directionWithin(tag,'rtl',WITH_RTL),tag).toBe('ltr');
 });
 it('dialogLanguageName isolates a name only when it runs the other way from the page',()=>{
  expect(dialogLanguageName('Español','es-419','ltr')).toBe('Español');
  expect(dialogLanguageName('English','en','ltr')).toBe('English');
  expect(dialogLanguageName('العربية (Arabic)','ar','ltr',WITH_RTL)).toBe(`${RLI}العربية (Arabic)${PDI}`);
  expect(dialogLanguageName('English','en','rtl',WITH_RTL)).toBe(`${LRI}English${PDI}`);
  expect(dialogLanguageName('فارسی (Persian)','fa','rtl',WITH_RTL)).toBe('فارسی (Persian)');
 });
});

describe('Front RT9: the selector\'s options',()=>{
 it('in a left-to-right page with left-to-right languages: no dir anywhere, as before',()=>{
  expect(uiDirection()).toBe('ltr');
  const html=select();
  expect(html).not.toContain(' dir=');
  expect(optionDirs(html)).toEqual([['en','-'],...LANGUAGES.filter(l=>l.released).map(l=>[l.tag,'-'])]);
 });
 it('in a left-to-right page, a released right-to-left language\'s option carries dir="rtl" beside its lang',()=>{
  const html=select(WITH_RTL);
  expect(optionDirs(html)).toEqual([['en','-'],...WITH_RTL.filter(l=>l.released).map(l=>[l.tag,l.direction==='rtl'?'rtl':'-'])]);
  expect(html).toContain('<option value="ar" lang="ar" dir="rtl" data-testid="language-ar">العربية (Arabic)</option>');
 });
 it('in a right-to-left page, every left-to-right option carries dir="ltr"',()=>{
  activateLocale(english('ar'),WITH_RTL);
  expect(uiDirection()).toBe('rtl');
  expect(optionDirs(select(WITH_RTL))).toEqual([['en','ltr'],...WITH_RTL.filter(l=>l.released).map(l=>[l.tag,l.direction==='rtl'?'-':'ltr'])]);
 });
});
