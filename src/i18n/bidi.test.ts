import {afterEach,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import en from './en.json';
import baseline from '../../tests/fixtures/p01-scientific-baseline.json';
import {RTL} from '../../tests/fixtures/i18n/registry';
import {activateLocale,fixed,formatNumber,scientific,t,uiDirection,type LocaleBundle,type MessageKey} from './index';
import {BIDI_CONTROLS,FSI,iso,LRI,ltrText,PDI,plotText} from './bidi';
import {firstStrongIsolate,isolateMap,ltrIsolate} from './isolates';
import {pickedMessages,resolveMessages} from './registry';
import {vireo,vireoList,vireoMenuItem} from './vireo';
import {pseudoBundle,pseudoMark} from './pseudo';
import {pseudoRtl} from './pseudoRtl';
import {PSEUDO_SCRIPT,pseudoScriptBundle} from './pseudoScripts';
import {settleLanguage,type Settled} from './settle';
import {readSource,REPOSITORY_ROOT,sourceFiles,walk,type AstNode} from './sourceScan';
import {createMeasurement,measurementCsv} from '../core/spectrum';
import {hubbleAnalysisCsv,workbookExampleRows} from '../core/hubbleAnalysis';

// Front RT4 (docs/I18N.md "RTL groundwork: the bidi runtime (RT4)"; plan front-i18n-rtl.md § 3.2, § 4): isolates added at runtime,
// only in right-to-left loads.
type Render=(key:MessageKey,values?:Readonly<Record<string,string|number>>)=>string;
const render=t as Render;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const names=(text:string)=>[...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))];
/** Values that bidi breaks without isolation: a sign, a coordinate, a file name, a unit, an English menu item, an Arabic name. */
const SAMPLES=['-12.5','12h 30m 45s','+26° 42′','Hubble.HTL','12.5 km/s','Save As…','نجم',''];
const sample=(key:MessageKey,i=0)=>Object.fromEntries(names(en[key]).map((n,j)=>[n,SAMPLES[(i+j)%SAMPLES.length]]));
const ar=(over:Partial<LocaleBundle>={}):LocaleBundle=>Object.freeze({language:'ar',messages:{'app.name':'أوبن فيريو','sky.pointed':'التلسكوب موجه نحو {target}.'},...over});
afterEach(()=>{activateLocale(null);});

describe('Front RT4: the isolates (src/i18n/isolates.ts)',()=>{
 it('wraps the text between its outer white space, and leaves empty and white-space-only text alone',()=>{
  expect([FSI,LRI,PDI]).toEqual(['\u2068','\u2066','\u2069']);
  expect(firstStrongIsolate('-12.5')).toBe('\u2068-12.5\u2069');expect(ltrIsolate('Save As…')).toBe('\u2066Save As…\u2069');
  expect(ltrIsolate('  RA:  ')).toBe('  \u2066RA:\u2069  ');expect(ltrIsolate('a\r\nb ')).toBe('\u2066a\r\nb\u2069 ');
  for(const blank of ['',' ','\r\n'])expect([firstStrongIsolate(blank),ltrIsolate(blank)]).toEqual([blank,blank]);
  for(const c of ['\u200e','\u200f','\u061c','\u202a','\u202e','\u2066','\u2069'])expect(BIDI_CONTROLS.test(c),c).toBe(true);
  expect(BIDI_CONTROLS.test('⟦نص⟧ -12.5 Hubble.HTL «Å»')).toBe(false);
 });
 it('isolateMap keeps the shape (keys, arrays, arity, frozenness) and wraps strings and function results as asked',()=>{
  const english=Object.freeze({a:'Open dome',b:'',list:Object.freeze(['One','Two']),n:3,f:(n:number,file:string)=>`${n} stars in ${file}`,g:()=>['x'],deep:Object.freeze({c:'Close'})});
  const all=isolateMap(english,{strings:true}),data=isolateMap(english,{strings:false});
  expect(all.a).toBe(`${LRI}Open dome${PDI}`);expect(all.b).toBe('');expect(all.list).toEqual([`${LRI}One${PDI}`,`${LRI}Two${PDI}`]);expect(all.n).toBe(3);
  expect(all.deep.c).toBe(`${LRI}Close${PDI}`);expect(all.f.length).toBe(2);expect(all.f(2,'Hubble.HTL')).toBe(`${LRI}2 stars in Hubble.HTL${PDI}`);expect(all.g()).toEqual(['x']);
  expect([Object.isFrozen(all),Object.isFrozen(all.list),Object.isFrozen(all.deep)]).toEqual([true,true,true]);
  expect(data.a).toBe('Open dome');expect(data.list).toEqual(['One','Two']);expect(data.f(2,'x')).toBe(`${LRI}2 stars in x${PDI}`);
 });
});

describe('Front RT4: nothing changes in a left-to-right load',()=>{
 it('every key, map leaf and VIREO original of English, Spanish, Portuguese and the LTR pseudo-locales is byte-identical to the plain substitution, with no bidi control',async()=>{
  const {SPANISH}=await import('./es/index'),{PORTUGUESE}=await import('./pt-br/index');
  await import('../help/tour');await import('../help/webHelp');await import('../help/projectLinks');
  const bundles:(LocaleBundle|null)[]=[null,SPANISH,PORTUGUESE,pseudoBundle(),pseudoScriptBundle('qps-cjk'),pseudoScriptBundle('qps-deva'),pseudoScriptBundle('qps-cyrl')];
  const originals=[...new Set([...Object.keys(SPANISH.originals!),...Object.keys(PORTUGUESE.originals!)])];
  expect(originals.length).toBeGreaterThan(700);
  for(const bundle of bundles){
   const language=bundle?.language??'en';activateLocale(bundle);expect(uiDirection(),language).toBe('ltr');
   const messages={...en,...bundle?.messages} as Record<MessageKey,string>;
   for(const [i,key] of (Object.keys(en) as MessageKey[]).entries()){
    const values=sample(key,i),out=render(key,values);
    expect(out,`${language} ${key}`).toBe(messages[key].replace(/\{(\w+)\}/g,(_,n:string)=>String(values[n])));
   }
   for(const [id,english] of pickedMessages()){
    const resolved=resolveMessages(id,english as never) as unknown;
    if(bundle?.maps&&Object.hasOwn(bundle.maps,id))expect(resolved,`${language} ${id}`).toBe(bundle.maps[id]);
    else if(!bundle)expect(resolved,id).toBe(english);
    const leaves:string[]=[];const walk=(v:unknown)=>{if(typeof v==='string')leaves.push(v);else if(v&&typeof v==='object')for(const x of Object.values(v))walk(x);};walk(resolved);
    expect(leaves.filter(s=>BIDI_CONTROLS.test(s)),`${language} ${id}`).toEqual([]);
   }
   for(const text of originals){
    const plain=text.replace(/^[A-Za-z]\w*\|/,''),context=/^([A-Za-z]\w*)\|/.exec(text)?.[1];
    const shown=vireo(plain,context);expect(BIDI_CONTROLS.test(shown),`${language} ${text}`).toBe(false);
    if(!bundle)expect(shown).toBe(plain);
    expect(BIDI_CONTROLS.test(vireoMenuItem(plain,context))).toBe(false);
   }
   for(const v of SAMPLES)expect([iso(v),plotText(v),ltrText(v)]).toEqual([v,v,v]);
   expect(iso(-12.5)).toBe('-12.5');
  }
  // "View original (English)" (src/i18n/settle.ts drops the originals) shows VIREO's literals exactly.
  for(const bundle of [SPANISH,PORTUGUESE]){
   activateLocale(Object.freeze({...bundle,originals:{},deriveOriginal:undefined}));
   for(const text of originals.filter(k=>!/^[A-Za-z]\w*\|/.test(k)))expect(vireo(text)).toBe(text);
   expect(vireoMenuItem('Save &As...')).toBe('Save As…');expect(vireoList(['OK','Cancel'])).toEqual(['OK','Cancel']);
  }
 });
});

describe('Front RT4: a right-to-left load',()=>{
 it('settles a test registry\'s Arabic with <html dir="rtl"> and turns the runtime on; a failed chunk is English and ltr, with nothing isolated',()=>{
  const dir:string[]=[],page=(bundle:LocaleBundle|null)=>({search:'?lang=ar',stored:()=>null,languages:['en-US'],dev:false,registry:RTL,bundleFor:()=>bundle,setLang:()=>{},setDir:(x:string)=>{dir.push(x);},setTitle:()=>{},error:()=>{}});
  expect((settleLanguage(page(ar())) as Settled).language).toBe('ar');
  expect(t('sky.pointed',{target:'M82'})).toBe(`التلسكوب موجه نحو ${FSI}M82${PDI}.`);
  expect((settleLanguage(page(null)) as Settled)).toEqual({language:'en',failed:'ar'});
  expect(dir).toEqual(['rtl','ltr']);expect(t('sky.pointed',{target:'M82'})).toBe('Telescope centered on M82.');
 });
 it('t() isolates each parameter (FSI) and each English fallback key as a whole (LRI)',()=>{
  activateLocale(ar(),RTL);expect(uiDirection()).toBe('rtl');
  expect(t('app.name')).toBe('أوبن فيريو');
  for(const v of ['-12.5','12h 30m 45s','Hubble.HTL','نجم'])expect(t('sky.pointed',{target:v})).toBe(`التلسكوب موجه نحو ${FSI}${v}${PDI}.`);
  expect(t('sky.pointed',{target:''})).toBe('التلسكوب موجه نحو .');expect(t('sky.pointed',{target:-12.5})).toBe(`التلسكوب موجه نحو ${FSI}-12.5${PDI}.`);
  // A translated format with no Arabic letter is left to right as a whole ("NF: NOMAD R", not "R NOMAD :NF").
  activateLocale(ar({messages:{'sky.pointed':'{target}:'} as never}),RTL);expect(t('sky.pointed',{target:'NF'})).toBe(`${LRI}${FSI}NF${PDI}:${PDI}`);
  activateLocale(ar(),RTL);
  // An untranslated key is English: left to right as a whole, its parameters isolated inside.
  expect(t('project.save')).toBe(`${LRI}Save investigation${PDI}`);
  const key=(Object.keys(en) as MessageKey[]).find(k=>names(en[k]).length===1&&/^[A-Z]/.test(en[k])&&!en[k].startsWith('{'))!;
  const [name]=names(en[key]);
  expect(render(key,{[name]:'-12.5'})).toBe(LRI+en[key].replace(`{${name}}`,`${FSI}-12.5${PDI}`)+PDI);
 });
 it('vireo() isolates VIREO\'s English (untranslated, or every original under View original) and never a translation or a fragment piece',()=>{
  activateLocale(ar({originals:{CCD:'CCD',File:'ملف','Save As...':'حفظ باسم...','verb|Open':'افتح','fragment|Remove Selection #':'إزالة التحديد رقم '}}),RTL);
  expect(vireo('&File')).toBe('ملف');expect(vireo('Open','verb')).toBe('افتح');expect(vireo('Save As...')).toBe('حفظ باسم...');
  expect(vireoMenuItem('Save As...')).toBe('حفظ باسم…');
  expect(vireo('Close')).toBe(`${LRI}Close${PDI}`);expect(vireo('RA:  ')).toBe(`${LRI}RA:${PDI}  `);
  expect(vireo('CCD')).toBe(`${LRI}CCD${PDI}`);// a translation kept in Latin letters is left to right as a whole too
  expect(vireoMenuItem('Print Sky &Image...')).toBe(`${LRI}Print Sky Image…${PDI}`);expect(vireoMenuItem('&Options')).toBe(`${LRI}Options…${PDI}`);
  expect(vireoList(['OK','&File'])).toEqual([`${LRI}OK${PDI}`,'ملف']);
  expect(vireo('Remove Selection #','fragment')).toBe('إزالة التحديد رقم ');expect(vireo('?\r\n\r\n(Remaining Selections Will Be Re-Numbered.)','fragment')).toBe('?\r\n\r\n(Remaining Selections Will Be Re-Numbered.)');
  activateLocale(ar({originals:{},deriveOriginal:undefined}),RTL);// View original (English)
  expect(vireo('&File')).toBe(`${LRI}&File${PDI}`);expect(vireoMenuItem('Save As...')).toBe(`${LRI}Save As…${PDI}`);
  // qps-rtl derives every original (a translation, not isolated).
  activateLocale(pseudoScriptBundle('qps-rtl'));
  expect(vireo('&Print Sky Image...')).toBe(pseudoRtl('&Print Sky Image...'));expect(vireoMenuItem('&File')).toBe(pseudoRtl('File')+'…');
 });
 it('maps: an own leaf is the translation; English fallback leaves and function results are LRI; a derived map\'s function results too',()=>{
  const english=Object.freeze({title:'Sound effects',loading:'Loading the sound…',count:(n:number,file:string)=>`${n} stars in ${file}`});
  activateLocale(ar({maps:{sound:{title:'المؤثرات الصوتية'} as never}}),RTL);
  const partial=resolveMessages('sound',english as never) as unknown as typeof english;
  expect(partial.title).toBe('المؤثرات الصوتية');expect(partial.loading).toBe(`${LRI}Loading the sound…${PDI}`);expect(partial.count(2,'Hubble.HTL')).toBe(`${LRI}2 stars in Hubble.HTL${PDI}`);
  activateLocale(ar(),RTL);
  const missing=resolveMessages('sound',english as never) as unknown as typeof english;
  expect(missing.title).toBe(`${LRI}Sound effects${PDI}`);expect(missing.count(1,'x')).toBe(`${LRI}1 stars in x${PDI}`);
  activateLocale(pseudoScriptBundle('qps-rtl'));
  const derived=resolveMessages('sound',english as never) as unknown as typeof english;
  expect(derived.title).toBe(pseudoRtl('Sound effects'));expect(derived.count(2,'x')).toBe(pseudoMark(`${LRI}2 stars in x${PDI}`));
 });
 it('iso(), plotText() and ltrText() isolate only here',()=>{
  activateLocale(pseudoScriptBundle('qps-rtl'));
  expect(iso(-12.5)).toBe(`${FSI}-12.5${PDI}`);expect(iso('Hubble.HTL')).toBe(`${FSI}Hubble.HTL${PDI}`);expect(iso('')).toBe('');
  expect(plotText('طول الموجة · Å')).toBe(`${FSI}طول الموجة · Å${PDI}`);expect(ltrText('Star 12 moved')).toBe(`${LRI}Star 12 moved${PDI}`);
  // qps-rtl's catalog is complete and transformed: parameters isolated; a key is isolated left to right as a whole exactly when
  // its text has no Arabic letter of its own (a format such as "{value}°", an acronym), whatever its parameters hold.
  expect(t('sky.pointed',{target:'M82'})).toBe(pseudoRtl(en['sky.pointed']).replace('{target}',`${FSI}M82${PDI}`));
  expect(PSEUDO_SCRIPT['qps-rtl'](en['app.name'])).toBe(t('app.name'));
  let formats=0;
  for(const [i,key] of (Object.keys(en) as MessageKey[]).entries()){
   if(!en[key].trim())continue;
   const values=sample(key,i),own=pseudoRtl(en[key]),shown=own.replace(/\{(\w+)\}/g,(_,n:string)=>values[n]?`${FSI}${values[n]}${PDI}`:'');
   const latin=!/\p{sc=Arabic}/u.test(own.replace(/\{\w+\}/g,''));if(latin)formats++;
   expect(render(key,values),key).toBe(latin?ltrIsolate(shown):shown);
  }
  expect(formats).toBeGreaterThan(20);
 });
});

describe('Front RT4: numbers stay Western digits with the decimal point (plan § 4)',()=>{
 it('formatNumber, fixed and scientific print exactly what English prints in qps-rtl and a test Arabic load, and the export bytes stay',()=>{
  const values=[0,-0.5,7,999,1000,1234.5,-31147,12345.678,2400000,98765.4321,1e-10,6.02e23,Number.NaN,Number.POSITIVE_INFINITY];
  const options:Intl.NumberFormatOptions[]=[{},{useGrouping:false},{maximumFractionDigits:0},{minimumFractionDigits:5,maximumFractionDigits:5,useGrouping:false},{maximumFractionDigits:9},{style:'percent',maximumFractionDigits:0},{style:'percent',signDisplay:'always'},{notation:'scientific'},{notation:'compact'},{signDisplay:'exceptZero',minimumFractionDigits:2}];
  const all=()=>[...values.flatMap(v=>options.map(o=>formatNumber(v,o))),...values.flatMap(v=>[fixed(v,3),scientific(v,4),scientific(v,4,true)])];
  const english=all();expect(english.filter(s=>BIDI_CONTROLS.test(s)||/[٠-٩۰-۹٫٬−]/u.test(s))).toEqual([]);
  for(const [bundle,registry] of [[pseudoScriptBundle('qps-rtl'),undefined],[ar(),RTL]] as const){activateLocale(bundle,registry);expect(all(),bundle.language).toEqual(english);}
  const m=createMeasurement(1,'Operator <b>σ</b> {target}','retained σ.csv','a'.repeat(64),{base:.015625,position:0,factor:1,step:.001},'GLXYLNS.LST');
  expect(sha(measurementCsv([m]))).toBe(baseline.nodeSHA256.measurement);
  expect(sha(hubbleAnalysisCsv({recipeId:'workbook',rows:workbookExampleRows()},[]))).toBe(baseline.nodeSHA256.workbook);
 });
 it('no number formatter in src/ is given a locale other than en-US (an RTL tag would bring U+200E, U+2212 or other digits)',()=>{
  const found:string[]=[];let seen=0;
  // Allowed first arguments: catalog.ts's `locale` ('en-US') and `numberLocale` (always `locale` for a UI language: active.ts), and
  // a literal 'en-US'. screenDate.ts formats dates with `-u-nu-latn-ca-gregory` (Front SC11) and has its own test.
  const ALLOWED=/^(?:locale|numberLocale|'en-US'|"en-US")$/;
  const name=(n:unknown)=>(n as AstNode&{name?:string})?.name;
  for(const file of sourceFiles()){
   if(file==='src/i18n/screenDate.ts')continue;
   const {text,program}=readSource(file);
   walk(program,node=>{
    const callee=node.callee as AstNode&{object?:AstNode;property?:AstNode}|undefined;
    const numberFormat=node.type==='NewExpression'&&callee?.type==='MemberExpression'&&name(callee.object)==='Intl'&&name(callee.property)==='NumberFormat';
    const localeString=node.type==='CallExpression'&&callee?.type==='MemberExpression'&&name(callee.property)==='toLocaleString';
    if(!numberFormat&&!localeString)return;
    seen++;const [first]=(node.arguments as AstNode[]);const arg=first?text.slice(first.start,first.end):'';
    if(!ALLOWED.test(arg))found.push(`${file}: ${text.slice(node.start,Math.min(node.end,node.start+80))}`);
   });
  }
  expect(seen).toBeGreaterThan(5);
  expect(found).toEqual([]);
  // The UI languages' number locale is en-US whatever the language (active.ts passes `numberLocale:locale`).
  expect(readFileSync(path.join(REPOSITORY_ROOT,'src/i18n/active.ts'),'utf8').match(/numberLocale:locale/g)).toHaveLength(2);
 });
});
