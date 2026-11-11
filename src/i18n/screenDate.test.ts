import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {screenDateLocale,screenDateTime} from './screenDate';
import {sourceFiles} from './sourceScan';
// Front SC11: print and screen dates follow the page language, with Western digits and the Gregorian calendar.
const D=new Date(Date.UTC(2026,10,10,14,5,9));
const at=(language:string,browser:string)=>D.toLocaleString(screenDateLocale(language,browser),{timeZone:'UTC'});
describe('Front SC11: screenDateTime',()=>{
 it('keeps the browser format in English, with Western digits and the Gregorian calendar',()=>{
  expect(screenDateLocale('en','en-US')).toBe('en-US-u-ca-gregory-nu-latn');
  expect(at('en','en-US')).toBe(D.toLocaleString('en-US',{timeZone:'UTC'}));
  expect(at('en','en-GB')).toBe(D.toLocaleString('en-GB',{timeZone:'UTC'}));
  expect(at('qps','de-DE')).toBe(D.toLocaleString('de-DE',{timeZone:'UTC'}));
  // The RTL plan's cases: an English page in an Egyptian or Persian browser, and a Japanese browser set to the era calendar.
  expect(D.toLocaleString('ar-EG',{timeZone:'UTC'})).toMatch(/[٠-٩]/);
  expect(at('en','ar-EG')).not.toMatch(/[٠-٩۰-۹]/);expect(at('en','ar-EG')).toMatch(/2026/);
  expect(D.toLocaleString('fa-IR',{timeZone:'UTC'})).toMatch(/۱۴۰۵/);
  expect(at('en','fa-IR')).toMatch(/2026/);expect(at('en','fa-IR')).not.toMatch(/[۰-۹]/);
  expect(at('en','ja-JP-u-ca-japanese')).toMatch(/^2026\//);
 });
 it('writes other languages as the page language does, whatever the browser',()=>{
  expect(screenDateLocale('es-419','en-US')).toBe('es-419-u-ca-gregory-nu-latn');
  expect(screenDateLocale('pt-BR','ar-EG')).toBe('pt-BR-u-ca-gregory-nu-latn');
  expect(at('es-419','en-US')).toBe(D.toLocaleString('es-419',{timeZone:'UTC'}));
  expect(at('pt-BR','en-US')).toBe('10/11/2026, 14:05:09');
  for(const l of ['ja','hi','ru','ar','fa','he','zh-Hans'])expect(at(l,'en-US'),l).toMatch(/2026/);
  for(const l of ['hi','ar','fa'])expect(at(l,'en-US'),l).not.toMatch(/[०-९٠-٩۰-۹]/);
 });
 it('never throws on a tag Intl cannot read',()=>{
  expect(screenDateLocale('en','not a tag!')).toBe('en-US-u-ca-gregory-nu-latn');
  expect(typeof screenDateTime(D,'en')).toBe('string');
 });
 it('is the only way a component writes a date with the browser\'s locale (no bare toLocaleString())',()=>{
  const bare=sourceFiles().filter(f=>!f.endsWith('screenDate.ts')&&/\.toLocale(?:Date|Time)?String\(\s*(?:undefined\s*)?[,)]/.test(readFileSync(f,'utf8')));
  expect(bare).toEqual([]);
 });
});
