import {describe,expect,it} from 'vitest';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {PROFILES} from './profiles';
import {describeFindings,errorsOf,lintPair,pluralForms} from './rules';
import {unisolatedMapValues} from './mapIsolates';
import {LANGUAGES,textDirection} from '../languages';
import {pluralCategories} from '../plural';
import {REPOSITORY_ROOT} from '../sourceScan';

// Front RT8 (docs/I18N.md "RTL groundwork: RTL lint profiles and direction plumbing (RT8, RT9)"; plan front-i18n-rtl.md § 3.2–3.4,
// § 4 and the RT8 row of § 9): what the mutation fixtures (fixtures.ts, run by rules.test.ts) do not show by themselves.
const rules=(id:'ar'|'he'|'fa',text:string,en='x')=>errorsOf(lintPair({id:'x',en,text},PROFILES[id])).map(f=>f.rule);

describe('Front RT8: the right-to-left profiles',()=>{
 it('Arabic needs six plural forms, Hebrew three and Persian two, as Intl.PluralRules gives them',()=>{
  expect(PROFILES.ar.pluralCategories).toEqual(['zero','one','two','few','many','other']);
  expect(PROFILES.he.pluralCategories).toEqual(pluralCategories('he'));expect(PROFILES.fa.pluralCategories).toEqual(['one','other']);
  const forms=(cats:readonly string[])=>Object.fromEntries(cats.map(c=>[`rows.${c}`,`${c} form`]));
  expect(pluralForms(forms(['zero','one','two','few','many','other']),['rows'],PROFILES.ar)).toEqual([]);
  expect(describeFindings(pluralForms(forms(['one','other']),['rows'],PROFILES.ar))).toEqual(['zero','two','few','many'].map(c=>`catalog:rows: [plural] lacks the ${c} form (Arabic needs zero, one, two, few, many, other)`));
  // An optional category does not exist for Arabic: each of the six is selected by real counts (0, 1, 2, 3–10, 11–99, 100+).
  expect(PROFILES.ar.optionalPluralCategories).toBeUndefined();
 });
 it('lets the right-to-left order rules pass what reads correctly: unsigned ranges, versions, times, codes and words',()=>{
  for(const text of ['المدى 3700–4700 Å','الإصدار 1.64.1','الساعة 12:30:45','الهدف 0332+5434','نجم من {a} إلى {b}','النسبة {ratio}٪'])expect(rules('ar',text),text).not.toContain('typography');
  // A hyphen between Latin letters is no sign (a format token), and «{a} و{b}» is no range.
  expect(rules('ar','التنسيق YYYY-MM-DD')).not.toContain('typography');expect(rules('ar','{a} و{b}')).not.toContain('typography');
  for(const text of ['المدى {min}-{max}','المدى «A1» – «A2»','عند ±{error}','عند +54 درجة','في 11-24-2008'])expect(rules('ar',text),text).toContain('typography');
 });
 it('reads Arabic punctuation and the claim rule in both directions',()=>{
  expect(rules('ar','افتح ?lang=ar')).not.toContain('typography');// a URL query is no question mark
  expect(rules('ar','افتح الملف؛ ثم احفظه')).not.toContain('typography');expect(rules('ar','افتح الملف; ثم احفظه')).toContain('typography');
  for(const text of ['ترجمة غير رسمية','هذه ليست ترجمة رسمية','هذه ليست الترجمة الرسمية','ليست ترجمة CLEA'])expect(rules('ar',text),text).not.toContain('claim');
  for(const text of ['ترجمة رسمية','الترجمة الرسمية','ترجمة CLEA الرسمية'])expect(rules('ar',text),text).toContain('claim');
  for(const text of ['ترجمه غیررسمی','ترجمه رسمی نیست'])expect(rules('fa',text),text).not.toContain('claim');
 });
 it('allows the non-joiner only inside Persian words, and no joiner in Arabic or Hebrew',()=>{
  expect(rules('fa','می\u200cکنید')).not.toContain('invisible');expect(rules('fa','\u200cکنید')).toContain('invisible');
  expect(rules('ar','می\u200cکنید')).toContain('invisible');expect(rules('he','א\u200cב')).toContain('invisible');
 });
});

const MAP_SOURCE=(body:string)=>`import {iso} from '../../bidi';\nexport const M=Object.freeze({${body}});\n`;
describe('Front RT8: iso() around every value of a right-to-left map function',()=>{
 it('passes a map whose functions isolate each value, and strings with no value',()=>{
  expect(unisolatedMapValues('ok.ts',MAP_SOURCE([
   "title:'قائمة الأهداف'",
   "count:(n:number)=>`${iso(n)} نجمة`",
   "file:(f:string)=>'الملف '+iso(f)+'.'",
   "pair:(a:number,b:number)=>`من ${iso(a)} إلى ${iso(b)}`",
   "range:(a:number,b:number)=>iso(`${a}–${b}`)",
   "nested:{fit:(x:number)=>`المطابقة ${iso(x.toFixed(1))}%`}",
  ].join(',')))).toEqual([]);
 });
 it('reports each value a template or a concatenation puts into text without iso()',()=>{
  expect(unisolatedMapValues('bad.ts',MAP_SOURCE([
   "count:(n:number)=>`${n} نجمة`",
   "file:(f:string)=>'الملف '+f",
   "both:(a:number,b:string)=>`${iso(a)} في ${b.toUpperCase()}`",
   "nested:{fit:function(x:number){return 'المطابقة '+x.toFixed(1)+'%';}}",
  ].join(',')))).toEqual([
   'M/count · ${n}','M/file · +f','M/both · ${b.toUpperCase()}','M/nested/fit · +x.toFixed(1)',
  ]);
 });
 const mapFiles=(dir:string)=>{const d=path.join(REPOSITORY_ROOT,'src/i18n',dir,'maps');return existsSync(d)?readdirSync(d).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).map(f=>path.join(d,f)):[];};
 it('holds for every registered right-to-left language (none today)',()=>{
  const rtl=LANGUAGES.filter(l=>textDirection(l.tag)==='rtl');
  expect(rtl.map(l=>l.tag)).toEqual([]);// groundwork only (user, 2026-11-10): the first one is checked here with no change to this test
  const problems=rtl.flatMap(l=>mapFiles(l.dir).flatMap(file=>unisolatedMapValues(file,readFileSync(file,'utf8')).map(x=>`${l.tag} ${path.basename(file)} › ${x}`)));
  expect(problems).toEqual([]);
 });
 it('would catch a left-to-right map written the same way: Spanish maps put their values in plainly',()=>{
  const file=mapFiles('es').find(f=>f.endsWith('objectXLab.ts'))!;
  expect(unisolatedMapValues(file,readFileSync(file,'utf8'))).toContain('OBJECT_X_LAB_ES/targetCoords · ${ra}');
 });
});
