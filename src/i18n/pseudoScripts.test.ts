import {afterEach,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import en from './en.json';
import spanishOriginals from './es/originals.json';
import baseline from '../../tests/fixtures/p01-scientific-baseline.json';
import {activateLocale,createI18n,fixed,formatNumber,scientific,t,uiLanguage,type MessageKey} from './index';
import {decideLocale,HTML_LANG,type LocaleInputs,type PseudoScriptLanguage} from './locale';
import {selectorShown} from './languages';
import {pickedMessages} from './registry';
import {mapParity} from './parity';
import {PSEUDO_CLOSE,PSEUDO_OPEN,pseudoMark} from './pseudo';
import {isPseudoScriptLanguage,PSEUDO_SCRIPT,pseudoCjk,pseudoCyrl,pseudoDeva,pseudoScriptBundle} from './pseudoScripts';
import {settleLanguage,type Settled} from './settle';
import {vireo,vireoMenuItem} from './vireo';
import {createMeasurement,measurementCsv} from '../core/spectrum';
import {hubbleAnalysisCsv,workbookExampleRows} from '../core/hubbleAnalysis';

// Front SC2 (docs/I18N.md; plan front-i18n-scripts.md §4): the dev-only script-stress pseudo-locales.
const LANGUAGES=['qps-cjk','qps-deva','qps-cyrl'] as const satisfies readonly PseudoScriptLanguage[];
const TAG={'qps-cjk':'ja','qps-deva':'hi','qps-cyrl':'ru'} as const;
/** The letters each variant may write outside its protected parts. */
const SCRIPT={'qps-cjk':/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}ー]/u,'qps-deva':/\p{sc=Devanagari}/u,'qps-cyrl':/\p{sc=Cyrillic}/u} as const;
const PROTECTED=/(\{\w+\}|<\/?[A-Za-z][\w-]*>)/;
const strings=Object.values(en).filter(Boolean);
const inner=(text:string)=>text.slice(PSEUDO_OPEN.length,-PSEUDO_CLOSE.length);
const outside=(text:string)=>text.split(PROTECTED).filter((_,i)=>!(i%2)).join('');
const protectedParts=(text:string)=>text.split(PROTECTED).filter((_,i)=>i%2);
/** Display columns: East Asian wide and full-width characters count 2. */
const columns=(text:string)=>[...text].reduce((n,c)=>n+(/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}ー。、：？！（）]/u.test(c)?2:1),0);
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
// Every `*Messages.ts` map registers itself with pickMessages when its module evaluates.
const maps=import.meta.glob<Record<string,unknown>>('../**/*Messages.ts',{eager:true});
/** Every string leaf of the registered English maps (map functions are only marked, so they have no leaves here). */
const mapLeaves=()=>{const out:string[]=[];const walk=(v:unknown)=>{if(typeof v==='string'){if(v)out.push(v);}else if(v&&typeof v==='object')for(const x of Object.values(v))walk(x);};for(const english of pickedMessages().values())walk(english);return out;};
/** VIREO originals as vireo() receives them: the keys of the Spanish originals dictionary, without their `context|` prefix. */
const originals=Object.keys(spanishOriginals).map(k=>k.replace(/^[A-Za-z]\w*\|/,''));
afterEach(()=>{activateLocale(null);});

describe('Front SC2: the script-stress transforms',()=>{
 it('mark every string once, are deterministic and idempotent, and leave the empty string alone',()=>{
  for(const language of LANGUAGES){
   const text=PSEUDO_SCRIPT[language];expect(text('')).toBe('');
   for(const s of strings){
    const out=text(s);
    expect(out.startsWith(PSEUDO_OPEN)&&out.endsWith(PSEUDO_CLOSE),`${language}: ${s}`).toBe(true);
    expect(inner(out).includes(PSEUDO_OPEN)||inner(out).includes(PSEUDO_CLOSE)).toBe(false);
    expect(text(s)).toBe(out);expect(text(out)).toBe(out);
   }
  }
 });
 it('keep {params}, <placeholders>, digits, decimal points, line breaks and outer spacing; write no English letter',()=>{
  // Collected and compared once: 3 variants × (3581 catalog strings, the map leaves, the VIREO originals).
  const leaves=mapLeaves();expect(leaves.length).toBeGreaterThan(800);expect(originals.length).toBeGreaterThan(400);
  const problems:string[]=[],same=(what:string,a:unknown,b:unknown,where:string)=>{if(JSON.stringify(a)!==JSON.stringify(b))problems.push(`${where}: ${what}`);};
  for(const language of LANGUAGES)for(const s of [...strings,...leaves,...originals]){
   const out=inner(PSEUDO_SCRIPT[language](s)),rest=outside(out),where=`${language} ${JSON.stringify(s)}`;
   same('protected parts',protectedParts(out),protectedParts(s),where);
   same('digits',rest.match(/[0-9]+/g),outside(s).match(/[0-9]+/g),where);
   same('decimal points',rest.match(/[0-9][.,:][0-9]/g),outside(s).match(/[0-9][.,:][0-9]/g),where);
   same('line breaks',out.match(/[\r\n]/g),s.match(/[\r\n]/g),where);
   same('outer spacing',[/^\s*/.exec(out)![0],/\s*$/.exec(out)![0]],[/^\s*/.exec(s)![0],/\s*$/.exec(s)![0]],where);
   // No English letter is left, and every non-ASCII letter of the English (Å, Δ…) passes through unchanged and in order.
   same('letters outside the script',[...rest].filter(c=>/[\p{L}\p{M}]/u.test(c)&&!SCRIPT[language].test(c)),[...outside(s)].filter(c=>/[\p{L}\p{M}]/u.test(c)&&c>'\x7f'),where);
  }
  expect(problems.slice(0,10)).toEqual([]);
  expect(pseudoCjk('<value> Meter {n} of 12.5 m. Ready?')).toBe(`${PSEUDO_OPEN}<value>${pseudoCjk('Meter').slice(1,-1)}{n}${pseudoCjk('of').slice(1,-1)}12.5${pseudoCjk('m').slice(1,-1)}。${pseudoCjk('Ready').slice(1,-1)}？${PSEUDO_CLOSE}`);
 });
 it('are word-stable: a word becomes the same text in every string, whatever its case',()=>{
  for(const language of ['qps-deva','qps-cyrl'] as const){
   const text=PSEUDO_SCRIPT[language],word=inner(text('Telescope'));
   expect(inner(text('Telescope centered')).startsWith(word+' ')).toBe(true);expect(inner(text('Open the Telescope'))).toContain(' '+word);
  }
  expect(inner(pseudoCjk('Open the Telescope')).endsWith(inner(pseudoCjk('Telescope')))).toBe(true);
  expect(inner(pseudoCyrl('FILE'))).toBe(inner(pseudoCyrl('File')).toUpperCase());
  expect(inner(pseudoDeva('FILE'))).toBe(inner(pseudoDeva('file')));
 });
 it('qps-cjk: ⌈0.6 n⌉ full-width characters per word, no spaces next to them, full-width punctuation, about 1.2 times as wide',()=>{
  for(const word of ['a','to','Dome','Telescope','Spectrometer'])expect([...inner(pseudoCjk(word))].length).toBe(Math.ceil(.6*word.length));
  expect(inner(pseudoCjk('Open dome, please.'))).not.toMatch(/ /);
  expect(inner(pseudoCjk('(a): b? c! d, e.'))).toMatch(/^（.）：.？.！.、.。$/u);
  expect(inner(pseudoCjk('Saving...'))).toMatch(/…$/);
  expect(inner(pseudoCjk('{a} {b} 12 34'))).toBe('{a} {b} 12 34');
  // Kinsoku: small kana and ー occur, but never as the first character of a word.
  const all=strings.map(s=>inner(pseudoCjk(s))).join('');expect(all).toMatch(/[ゃゅょっァィゥェォャュョッー]/u);
  for(const word of ['Open','Telescope','Spectrometer','x','Measure'])expect(inner(pseudoCjk(word))).not.toMatch(/^[ゃゅょっァィゥェォャュョッー]/u);
  // Han characters that only Chinese uses, so a Japanese font stack must fall back.
  expect(all).toMatch(/[们这说门习]/u);
  const ratio=strings.reduce((n,s)=>n+columns(inner(pseudoCjk(s))),0)/strings.reduce((n,s)=>n+s.length,0);
  expect(ratio).toBeGreaterThan(1.05);expect(ratio).toBeLessThan(1.35);
 });
 it('qps-deva: a vowel sign above or below every syllable, a tall conjunct in about one word of three, । for the full stop',()=>{
  const syllables=(word:string)=>[...new Intl.Segmenter('hi',{granularity:'grapheme'}).segment(inner(pseudoDeva(word)))].length;
  for(const word of ['Dome','Telescope','Spectrometer'])expect(syllables(word)).toBeLessThanOrEqual(Math.ceil(.8*word.length));
  const words=[...new Set(strings.flatMap(s=>s.match(/[A-Za-z]+/g)??[]))],out=words.map(w=>inner(pseudoDeva(w)));
  expect(out.every(w=>/[ि-्ँ-ः़]/u.test(w))).toBe(true);
  const tall=out.filter(w=>/्/u.test(w)).length/out.length;expect(tall).toBeGreaterThan(.25);expect(tall).toBeLessThan(.42);
  for(const sign of ['ि','ी','े','ै','ु','ू','ृ','ँ','ं','़','र्'])expect(out.join(''),sign).toContain(sign);
  expect(inner(pseudoDeva('Done. Value 12.5...'))).toMatch(/^\S+। \S+ 12\.5\.\.\.$/u);
 });
 it('qps-cyrl: words about 25 % longer, an unbreakable word of min(24, 1.7 n) letters in about one word of 8+ letters in six, case kept',()=>{
  const words=[...new Set(strings.flatMap(s=>s.match(/[A-Za-z]+/g)??[]))];
  let long=0,eligible=0;const wrong:string[]=[];
  for(const word of words){
   const out=inner(pseudoCyrl(word)),n=word.length,regular=n+Math.round(.25*n);if(n>=8)eligible++;
   if(out.length>regular){long++;if(n<8||out.length!==Math.min(24,Math.round(1.7*n)))wrong.push(word);}
   else if(out.length!==regular)wrong.push(word);
  }
  expect(wrong).toEqual([]);expect(long/eligible).toBeGreaterThan(.12);expect(long/eligible).toBeLessThan(.22);
  for(const word of ['Help','Save','About','Close','Telescope'])expect(inner(pseudoCyrl(word)).length,word).toBe(word.length+Math.round(.25*word.length));
  expect(inner(pseudoCyrl('Close'))).toMatch(/^Ц[а-я]{5}$/u);expect(inner(pseudoCyrl('CLEA'))).toMatch(/^[А-ЯЁ]+$/u);
  const ratio=strings.reduce((n,s)=>n+inner(pseudoCyrl(s)).length,0)/strings.reduce((n,s)=>n+s.length,0);
  expect(ratio).toBeGreaterThan(1.18);expect(ratio).toBeLessThan(1.32);
 });
});

describe('Front SC2: the pseudo-locales as UI languages (dev server and tests only)',()=>{
 const decide=(over:Partial<LocaleInputs>)=>decideLocale({param:null,stored:null,languages:['en-US'],dev:false,...over});
 it('are offered only through ?lang= in the dev server and tests, never from storage or the browser, and show no selector',()=>{
  for(const language of LANGUAGES){
   expect(isPseudoScriptLanguage(language)).toBe(true);
   expect(decide({param:language,dev:true})).toBe(language);expect(decide({param:language})).toBe('en');
   expect(decide({stored:language,dev:true})).toBe('en');expect(decide({languages:[TAG[language]],dev:true})).toBe('en');
   expect(HTML_LANG[language]).toBe(TAG[language]);expect(selectorShown(language)).toBe(false);
  }
  for(const junk of ['qps-','qps-CJK','qps-latn','ja','hi','ru','constructor','__proto__'])expect(decide({param:junk,dev:true}),junk).toBe('en');
  expect(isPseudoScriptLanguage('qps')).toBe(false);expect(isPseudoScriptLanguage('toString')).toBe(false);
 });
 it('settle a load synchronously with <html lang> ja, hi or ru and the transformed title',()=>{
  for(const language of LANGUAGES){
   const lang:string[]=[],titles:string[]=[],errors:unknown[]=[];
   const settled=settleLanguage({search:`?lang=${language}`,stored:()=>null,languages:['en-US'],dev:true,bundleFor:l=>isPseudoScriptLanguage(l)?pseudoScriptBundle(l):null,setLang:x=>{lang.push(x);},setTitle:x=>{titles.push(x);},error:e=>{errors.push(e);}}) as Settled;
   expect(settled).toEqual({language,failed:null});expect(lang).toEqual([TAG[language]]);expect(errors).toEqual([]);
   expect(titles).toEqual([PSEUDO_SCRIPT[language](en['app.documentTitle'])]);
  }
 });
 it('give a complete catalog the strict check accepts, and transform t, every picked map and vireo() like qps',()=>{
  for(const language of LANGUAGES){
   const bundle=pseudoScriptBundle(language),text=PSEUDO_SCRIPT[language];
   expect(()=>createI18n(bundle.messages,TAG[language],{fallback:false})).not.toThrow();
   activateLocale(bundle);expect(uiLanguage()).toBe(language);
   expect(t('sky.pointed',{target:'M82'})).toBe(text(en['sky.pointed']).replace('{target}','M82'));
   for(const key of Object.keys(en) as MessageKey[])if(en[key])expect((t as (k:MessageKey,v?:Record<string,string>)=>string)(key,Object.fromEntries([...en[key].matchAll(/\{(\w+)\}/g)].map(m=>[m[1],'x']))).startsWith(PSEUDO_OPEN)).toBe(true);
   expect(vireo('&Print Sky Image...')).toBe(text('&Print Sky Image...'));expect(vireoMenuItem('&File')).toBe(text('File')+'…');
   expect(Object.keys(maps).length).toBeGreaterThan(20);expect(pickedMessages().size).toBeGreaterThan(20);
   for(const [id,english] of pickedMessages()){const derived=bundle.deriveMap!(english);expect(mapParity(english,derived),`${language} ${id}`).toEqual([]);}
   const english=Object.freeze({a:'Open dome',f:(n:number)=>`${n} stars`,list:Object.freeze(['One','Two']),n:3});
   const derived=bundle.deriveMap!(english);
   expect(derived.a).toBe(text('Open dome'));expect(derived.f(2)).toBe(pseudoMark('2 stars'));expect(derived.f.length).toBe(1);
   expect(derived.list).toEqual([text('One'),text('Two')]);expect(derived.n).toBe(3);expect(Object.isFrozen(derived)).toBe(true);
  }
 });
 it('keep the decimal point and the export bytes (decisions 3 and 4; plan §8 and §10)',()=>{
  const values=[1234.5,12345.5,1e-10,-0.5,0,Number.NaN,98765.4321],shown=()=>values.map(v=>[formatNumber(v),fixed(v,3),scientific(v,4),scientific(v,4,true)]);
  const english=shown();
  for(const language of LANGUAGES){
   activateLocale(pseudoScriptBundle(language));expect(shown()).toEqual(english);
   const m=createMeasurement(1,'Operator <b>σ</b> {target}','retained σ.csv','a'.repeat(64),{base:.015625,position:0,factor:1,step:.001},'GLXYLNS.LST');
   expect(sha(measurementCsv([m]))).toBe(baseline.nodeSHA256.measurement);
   expect(sha(hubbleAnalysisCsv({recipeId:'workbook',rows:workbookExampleRows()},[]))).toBe(baseline.nodeSHA256.workbook);
   expect(sha(hubbleAnalysisCsv({recipeId:'vireo',rows:workbookExampleRows()},[]))).toBe(baseline.nodeSHA256.vireo);
  }
 });
});
