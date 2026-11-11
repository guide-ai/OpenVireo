import {afterEach,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import en from './en.json';
import spanishOriginals from './es/originals.json';
import baseline from '../../tests/fixtures/p01-scientific-baseline.json';
import {activateLocale,createI18n,fixed,formatNumber,scientific,t,uiDirection,uiLanguage,type MessageKey} from './index';
import {decideLocale,HTML_DIR,HTML_LANG,type LocaleInputs} from './locale';
import {isPseudoLocale,selectorShown} from './languages';
import {pickedMessages} from './registry';
import {mapParity} from './parity';
import {pluralLanguage} from './plural';
import {PSEUDO_CLOSE,PSEUDO_OPEN,pseudoMark} from './pseudo';
import {pseudoRtl} from './pseudoRtl';
import {isPseudoScriptLanguage,PSEUDO_SCRIPT,pseudoScriptBundle} from './pseudoScripts';
import {settleLanguage,type Settled} from './settle';
import {vireo,vireoMenuItem} from './vireo';
import {createMeasurement,measurementCsv} from '../core/spectrum';
import {hubbleAnalysisCsv,workbookExampleRows} from '../core/hubbleAnalysis';

// Front RTL-1 (RT2; docs/I18N.md "RTL groundwork…"; plan front-i18n-rtl.md § 5.1): the dev-only right-to-left pseudo-locale.
const strings=Object.values(en).filter(Boolean);
const inner=(text:string)=>text.slice(PSEUDO_OPEN.length,-PSEUDO_CLOSE.length);
const maps=import.meta.glob<Record<string,unknown>>('../**/*Messages.ts',{eager:true});
const mapLeaves=()=>{const out:string[]=[];const walk=(v:unknown)=>{if(typeof v==='string'){if(v)out.push(v);}else if(v&&typeof v==='object')for(const x of Object.values(v))walk(x);};for(const english of pickedMessages().values())walk(english);return out;};
const originals=Object.keys(spanishOriginals).map(k=>k.replace(/^[A-Za-z]\w*\|/,''));
/** Bidi controls: LRM, RLM, ALM, the embeddings and overrides, the isolates. */
const BIDI_CONTROL=/[‎‏؜‪-‮⁦-⁩]/u;
const ARABIC_LETTER=/\p{sc=Arabic}/u;
const HARAKA=/[َِّ]/u;
const NON_JOINING='اوردزذ';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
afterEach(()=>{activateLocale(null);});

describe('Front RTL-1: the qps-rtl transform',()=>{
 it('marks every string once, is deterministic and idempotent, leaves the empty string alone, and writes no bidi control',()=>{
  expect(pseudoRtl('')).toBe('');
  for(const s of [...strings,...originals]){
   const out=pseudoRtl(s);
   expect(out.startsWith(PSEUDO_OPEN)&&out.endsWith(PSEUDO_CLOSE),s).toBe(true);
   expect(inner(out).includes(PSEUDO_OPEN)||inner(out).includes(PSEUDO_CLOSE)).toBe(false);
   expect(pseudoRtl(s)).toBe(out);expect(pseudoRtl(out)).toBe(out);
   expect(BIDI_CONTROL.test(out),s).toBe(false);
  }
 });
 it('keeps placeholders, numbers, acronyms, file names and parenthesised text in Latin; turns every other English word Arabic',()=>{
  expect(pseudoRtl('Open the Telescope')).toMatch(/^⟦\p{sc=Arabic}+ \p{sc=Arabic}+ [\p{sc=Arabic}\p{M}]+⟧$/u);
  const out=inner(pseudoRtl('Saved Hubble.HTL, {n} stars of NGC 4565 at 12.5 km/s; 1,234.5 in M82 (Original VIREO name)? <b>Done</b>'));
  expect(out).toMatch(/^\S+ Hubble\.HTL، \{n\} \S+ \S+ NGC 4565 \S+ 12\.5 km\/s؛ 1,234\.5 \S+ M82 \(Original VIREO name\)؟ <b>\S+<\/b>$/u);
  expect(out.replace(/Hubble\.HTL|\{n\}|NGC|4565|12\.5|km\/s|1,234\.5|M82|\(Original VIREO name\)|<\/?b>/g,'')).not.toMatch(/[A-Za-z0-9]/);
  expect(inner(pseudoRtl('Saving... 3 of 4…'))).toMatch(/^\S+\.\.\. 3 \S+ 4…$/u);
  expect(inner(pseudoRtl('{a} {b} 12 34'))).toBe('{a} {b} 12 34');
  expect(inner(pseudoRtl('CCD HTL QSOs'))).toBe('CCD HTL QSOs');
  // Over the catalog, the map leaves and the VIREO originals: placeholders, the digit runs, line breaks, outer spacing and
  // non-ASCII letters (Å, Δ, σ) are kept in order; every letter written is Arabic, Latin or one of the English's own.
  const leaves=mapLeaves();expect(leaves.length).toBeGreaterThan(800);expect(originals.length).toBeGreaterThan(400);
  const problems:string[]=[],same=(what:string,a:unknown,b:unknown,where:string)=>{if(JSON.stringify(a)!==JSON.stringify(b))problems.push(`${where}: ${what}`);};
  for(const s of [...strings,...leaves,...originals]){
   const out=inner(pseudoRtl(s)),where=JSON.stringify(s);
   same('placeholders',out.match(/\{\w+\}|<\/?[A-Za-z][\w-]*>/g),s.match(/\{\w+\}|<\/?[A-Za-z][\w-]*>/g),where);
   same('digits',out.match(/[0-9]+/g),s.match(/[0-9]+/g),where);
   same('decimal points',out.match(/[0-9][.:][0-9]/g),s.match(/[0-9][.:][0-9]/g),where);
   same('line breaks',out.match(/[\r\n]/g),s.match(/[\r\n]/g),where);
   same('outer spacing',[/^\s*/.exec(out)![0],/\s*$/.exec(out)![0]],[/^\s*/.exec(s)![0],/\s*$/.exec(s)![0]],where);
   same('other letters',[...out].filter(c=>/[\p{L}\p{M}]/u.test(c)&&!ARABIC_LETTER.test(c)&&!HARAKA.test(c)&&c>'\x7f'),[...s].filter(c=>/[\p{L}\p{M}]/u.test(c)&&c>'\x7f'),where);
  }
  expect(problems.slice(0,10)).toEqual([]);
 });
 it('is word-stable whatever the case, and only , ; ? become Arabic punctuation (never inside a number)',()=>{
  const word=inner(pseudoRtl('Telescope'));
  expect(inner(pseudoRtl('Telescope centered')).startsWith(word+' ')).toBe(true);expect(inner(pseudoRtl('Open the Telescope')).endsWith(' '+word)).toBe(true);
  expect(inner(pseudoRtl('file'))).toBe(inner(pseudoRtl('File')));
  expect(inner(pseudoRtl('a, b; c? d. e: f!'))).toMatch(/^\S+، \S+؛ \S+؟ \S+\. \S+: \S+!$/u);
  expect(inner(pseudoRtl('1,234 12:30 0.5'))).toBe('1,234 12:30 0.5');
 });
 it('round(1.25 n) Arabic letters for an English word of n, a non-joiner about one letter in four, a haraka in about one word in four',()=>{
  const words=[...new Set(strings.flatMap(s=>s.match(/\b[A-Za-z]+\b/g)??[]))].filter(w=>!/^[A-Z]{2,}s?$/.test(w));
  const out=words.map(w=>inner(pseudoRtl(w)));
  for(const [i,w] of words.entries())expect([...out[i]].filter(c=>ARABIC_LETTER.test(c)&&!HARAKA.test(c)).length,w).toBe(Math.max(1,Math.round(1.25*w.length)));
  const letters=out.join('').replace(/[َِّ]/gu,'');
  const nonJoining=[...letters].filter(c=>NON_JOINING.includes(c)).length/letters.length;
  expect(nonJoining).toBeGreaterThan(.2);expect(nonJoining).toBeLessThan(.3);
  const marked=out.filter(w=>HARAKA.test(w)).length/out.length;expect(marked).toBeGreaterThan(.2);expect(marked).toBeLessThan(.3);
  for(const mark of ['َ','ِ','َّ'])expect(out.join(''),mark).toContain(mark);
  // Every joining form occurs: a dual-joining letter between two others (medial), after a non-joiner (initial), before one (final),
  // and alone after a non-joiner at a word's end (isolated).
  const all=out.join(' '),J='بتثجحخسشصضطظعغفقكلمنهي',N=`[${NON_JOINING}]`;
  expect(all).toMatch(new RegExp(`[${J}][${J}][${J}]`,'u'));expect(all).toMatch(new RegExp(`${N}[${J}][${J}]`,'u'));
  expect(all).toMatch(new RegExp(`[${J}][${J}]${N}`,'u'));expect(all).toMatch(new RegExp(`${N}[${J}]\\p{M}*(?= )`,'u'));
 });
});

describe('Front RTL-1: qps-rtl as a UI language (dev server and tests only)',()=>{
 const decide=(over:Partial<LocaleInputs>)=>decideLocale({param:null,stored:null,languages:['en-US'],dev:false,...over});
 it('is offered only through ?lang= in the dev server and tests, never from storage or the browser, and shows no selector',()=>{
  expect(isPseudoScriptLanguage('qps-rtl')).toBe(true);expect(isPseudoLocale('qps-rtl')).toBe(true);expect(PSEUDO_SCRIPT['qps-rtl']).toBe(pseudoRtl);
  expect(decide({param:'qps-rtl',dev:true})).toBe('qps-rtl');expect(decide({param:'qps-rtl'})).toBe('en');
  expect(decide({stored:'qps-rtl',dev:true})).toBe('en');expect(decide({languages:['ar'],dev:true})).toBe('en');expect(decide({languages:['ar-EG']})).toBe('en');
  for(const junk of ['qps-RTL','qps-ar','ar','he','fa'])expect(decide({param:junk,dev:true}),junk).toBe('en');
  expect(HTML_LANG['qps-rtl']).toBe('ar');expect(HTML_DIR['qps-rtl']).toBe('rtl');expect(selectorShown('qps-rtl')).toBe(false);
  // Plurals and numbers: English rules (qps-rtl is not a BCP 47 tag; Arabic's six plural forms wait for a real catalog).
  expect(pluralLanguage('qps-rtl')).toBe('en');
 });
 it('settles a load synchronously with <html lang="ar" dir="rtl"> and the transformed title',()=>{
  const lang:string[]=[],dir:string[]=[],titles:string[]=[],errors:unknown[]=[];
  const settled=settleLanguage({search:'?lang=qps-rtl',stored:()=>null,languages:['en-US'],dev:true,bundleFor:l=>isPseudoScriptLanguage(l)?pseudoScriptBundle(l):null,setLang:x=>{lang.push(x);},setDir:x=>{dir.push(x);},setTitle:x=>{titles.push(x);},error:e=>{errors.push(e);}}) as Settled;
  expect(settled).toEqual({language:'qps-rtl',failed:null});expect([lang,dir,errors]).toEqual([['ar'],['rtl'],[]]);
  expect(titles).toEqual([pseudoRtl(en['app.documentTitle'])]);expect(uiDirection()).toBe('rtl');
 });
 it('gives a complete catalog the strict check accepts, and transforms t, every picked map and vireo() like the other pseudo-locales',()=>{
  const bundle=pseudoScriptBundle('qps-rtl');
  expect(()=>createI18n(bundle.messages,'ar',{fallback:false})).not.toThrow();
  activateLocale(bundle);expect(uiLanguage()).toBe('qps-rtl');
  // Front RT4: in this right-to-left load each parameter is isolated (FSI…PDI, src/i18n/bidi.test.ts).
  expect(t('sky.pointed',{target:'M82'})).toBe(pseudoRtl(en['sky.pointed']).replace('{target}','\u2068M82\u2069'));
  // A text with no Arabic letter of its own ("{value}°", "CCD") is isolated left to right as a whole (U+2066 before the marker).
  for(const key of Object.keys(en) as MessageKey[])if(en[key])expect((t as (k:MessageKey,v?:Record<string,string>)=>string)(key,Object.fromEntries([...en[key].matchAll(/\{(\w+)\}/g)].map(m=>[m[1],'x']))).replace(/^\s*\u2066/,'').startsWith(PSEUDO_OPEN)).toBe(true);
  expect(vireo('&Print Sky Image...')).toBe(pseudoRtl('&Print Sky Image...'));expect(vireoMenuItem('&File')).toBe(pseudoRtl('File')+'…');
  expect(Object.keys(maps).length).toBeGreaterThan(20);
  for(const [id,english] of pickedMessages())expect(mapParity(english,bundle.deriveMap!(english)),id).toEqual([]);
  const derived=bundle.deriveMap!(Object.freeze({a:'Open dome',f:(n:number)=>`${n} stars`}));
  expect(derived.a).toBe(pseudoRtl('Open dome'));expect(derived.f(2)).toBe(pseudoMark('2 stars'));
 });
 it('keeps the decimal point and the export bytes (decisions 3 and 4)',()=>{
  const values=[1234.5,12345.5,1e-10,-0.5,0,Number.NaN,98765.4321],shown=()=>values.map(v=>[formatNumber(v),fixed(v,3),scientific(v,4),scientific(v,4,true)]);
  const english=shown();
  activateLocale(pseudoScriptBundle('qps-rtl'));expect(shown()).toEqual(english);
  const m=createMeasurement(1,'Operator <b>σ</b> {target}','retained σ.csv','a'.repeat(64),{base:.015625,position:0,factor:1,step:.001},'GLXYLNS.LST');
  expect(sha(measurementCsv([m]))).toBe(baseline.nodeSHA256.measurement);
  expect(sha(hubbleAnalysisCsv({recipeId:'workbook',rows:workbookExampleRows()},[]))).toBe(baseline.nodeSHA256.workbook);
  expect(sha(hubbleAnalysisCsv({recipeId:'vireo',rows:workbookExampleRows()},[]))).toBe(baseline.nodeSHA256.vireo);
 });
});
