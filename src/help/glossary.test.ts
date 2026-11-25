import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,describe,expect,it} from 'vitest';
import en from '../i18n/en.json';
import {activateLocale,type LocaleBundle} from '../i18n';
import {LANGUAGES} from '../i18n/languages';
import {pseudoBundle} from '../i18n/pseudo';
import {PSEUDO_SCRIPT,pseudoScriptBundle} from '../i18n/pseudoScripts';
import {OBJECT_X_GUIDE_EN} from '../objectx/ObjectXMessages';
import {TERM_IDS,glossText,recordGlossKeys,termDefinition,termScope,wordsUsed,type TermId} from './glossary';
import {CONTROL_KEYS,ENGLISH_PATTERNS,EXTRA_NAMES,LANGUAGE_PATTERNS,UNSPACED,masked,matchTerms} from './glossaryPatterns';
import HubbleLabGuide from '../HubbleLabGuide';
import LssLabGuide from '../LssLabGuide';
import ObjectXLabGuide from '../ObjectXLabGuide';
import ClassificationLabGuide from '../ClassificationLabGuide';
import ClusterLabGuide from '../ClusterLabGuide';
import PulsarLabGuide from '../PulsarLabGuide';
import PleiadesLabGuide from '../PleiadesLabGuide';
import {hubbleLabProgress} from '../core/hubbleLab';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {INITIAL_LSS_LAB_SUMMARY,lssLabProgress} from '../core/lssLab';
import {INITIAL_OBJECT_X_LAB_SUMMARY,objectXLabProgress} from '../core/objectXLab';
import {EMPTY_CLASSIFICATION_EXERCISE_SUMMARY,classificationLabProgress} from '../core/classificationLab';
import {EMPTY_CLASSIFICATION_WORKSPACE} from '../core/classification';
import {clusterLabProgress,clusterOwnStatus} from '../core/clusterLab';
import {EMPTY_PULSAR_MEASUREMENT_SUMMARY,INITIAL_RADIO_EXERCISE_SUMMARY,pulsarLabProgress} from '../core/pulsarLab';
import {EMPTY_PLEIADES_EXERCISE_SUMMARY,pleiadesLabProgress} from '../core/pleiadesLab';
import {companionContent} from '../components/guideCompanionContent';
import TERMS_EN from '../i18n/terms.en.json';

// Front NEWCOMER NC7 (plan analysis/front-plans/front-newcomer.md §2.7, review M4; user decision of 2026-11-24): sixteen terms of
// the guides show a one-line textbook definition. This file regenerates every language's glossary snapshot from its patterns and
// compares it with the committed one; `OPENVIREO_REFRESH_PINS=1 npx vitest run src/help/glossary.test.ts` rewrites them (refused
// in CI), then review the git diff. The definitions' result words are checked in src/guideLead.test.ts.

type Catalog=Record<string,string>;
const ROOT=path.resolve(import.meta.dirname,'..');
const DIRS=LANGUAGES.map(l=>l.dir);
const E=en as Catalog;
const read=(file:string)=>JSON.parse(readFileSync(path.join(ROOT,file),'utf8')) as unknown;
const catalog=(dir:string):Catalog=>dir==='en'?E:read(`i18n/${dir}/${dir}.json`) as Catalog;
type Glossary={names:readonly {en:string;exact?:boolean;[lang:string]:unknown}[]};
const glossary=(dir:string)=>read(`i18n/${dir}/glossary.json`) as Glossary;
/** A glossary name's text in its own language (the one field besides `en` and `exact` that is not another language's). */
const ownName=(name:Glossary['names'][number])=>{const field=Object.keys(name).find(k=>k!=='en'&&k!=='exact');return typeof name[field!]==='string'?name[field!] as string:'';};
/** The texts never searched: VIREO control names, in the language and in English (a translation quotes VIREO's English names in
 * parentheses or brackets after its own: «Paramètres du pulsar (Pulsar Parameters)»), with «…» for «...», and CONTROL_KEYS' texts.
 * Exact names (whole-string ones in the lint) are names here too: none is a term, and «Find Pulsar…» must stay plain. */
const withEllipsis=(list:readonly string[])=>list.flatMap(n=>n.includes('...')?[n,n.replaceAll('...','…')]:[n]).filter(Boolean);
const names=(dir:string):string[]=>{
 const controls=CONTROL_KEYS.map(k=>catalog(dir)[k]!).filter(Boolean);
 const english=DIRS.flatMap(d=>glossary(d).names.map(n=>n.en));
 if(dir==='en')return [...new Set(withEllipsis([...english,...controls]))];
 return [...new Set(withEllipsis([...glossary(dir).names.map(n=>ownName(n)),...english,...controls,...EXTRA_NAMES[dir]??[]]))];
};
const BUNDLES=Object.fromEntries(Object.entries(import.meta.glob<Record<string,LocaleBundle>>('../i18n/*/index.ts',{eager:true})).map(([file,module])=>[file.split('/')[2]!,Object.values(module)[0]!]));
/** A map string by its snapshot path (`objectXGuide.why`, `objectXGuide.steps.<step>.1`). */
function mapText(dir:string,key:string):string|undefined{
 const [id,...rest]=key.split('.');if(id!=='objectXGuide')return undefined;
 let value:unknown=dir==='en'?OBJECT_X_GUIDE_EN:BUNDLES[dir]?.maps?.objectXGuide;
 for(const part of rest)value=value&&typeof value==='object'?(value as Record<string,unknown>)[part]:undefined;
 return typeof value==='string'?value:undefined;
}
const text=(dir:string,key:string)=>Object.hasOwn(E,key)?catalog(dir)[key]:mapText(dir,key);

const ref={current:null},noop=()=>{};
/** Every key a gloss call names in the seven windows (first step and closing state) and in the strip's Step details. */
/** The seven windows (first step and closing state), as markup, in the active language. `objectX` false leaves out the Object X
 * window, whose map (pickMessages) keeps the language of its first use in a Vitest run. */
function renderWindows(objectX=true):string{
 const out:string[]=[],html=(el:ReactElement)=>{out.push(renderToStaticMarkup(el));};
 for(const closing of [false,true]){
  html(createElement(HubbleLabGuide,{dialogRef:ref,progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE),...closing?{next:'interpret' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop,version:'full' as const}));
  html(createElement(LssLabGuide,{dialogRef:ref,progress:{...lssLabProgress(INITIAL_LSS_LAB_SUMMARY),...closing?{next:'done' as const}:{}},onNavigate:noop,onNext:noop}));
  if(objectX)html(createElement(ObjectXLabGuide,{dialogRef:ref,progress:{...objectXLabProgress(INITIAL_OBJECT_X_LAB_SUMMARY),...closing?{next:'done' as const}:{}},onNavigate:noop,onNext:noop}));
  html(createElement(ClassificationLabGuide,{dialogRef:ref,progress:{...classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY),...closing?{next:'save' as const}:{}},onNavigate:noop,onNext:noop}));
  html(createElement(ClusterLabGuide,{dialogRef:ref,progress:clusterLabProgress({loaded:true,inspected:closing,validTrial:closing,confirmed:closing,reportOpened:closing}),cluster:null,onNavigate:noop,own:clusterOwnStatus(0,10,false),onNext:noop}));
  html(createElement(PulsarLabGuide,{dialogRef:ref,progress:{...pulsarLabProgress({radio:INITIAL_RADIO_EXERCISE_SUMMARY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}),...closing?{next:'save' as const}:{}},onNavigate:noop,onNext:noop}));
  html(createElement(PleiadesLabGuide,{dialogRef:ref,progress:{...pleiadesLabProgress({list:true,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY}),...closing?{next:'save' as const}:{}},onNavigate:noop,onNext:noop,onVersion:noop,version:'full' as const}));
 }
 return out.join('\n');
}
const glossedKeys=():string[]=>[...recordGlossKeys(()=>{renderWindows();})].sort();
type Snapshot=Record<string,[TermId,string,number][]>;
function snapshotOf(dir:string,keys:readonly string[]):Snapshot{
 const out:Snapshot={},englishNames=names('en'),own=dir==='en'?englishNames:names(dir),patterns=dir==='en'?ENGLISH_PATTERNS:LANGUAGE_PATTERNS[dir]!;
 for(const key of keys){
  const english=text('en',key),translated=text(dir,key);
  if(!english||!translated)continue;
  const found=matchTerms(TERM_IDS,english,englishNames,translated,own,patterns,UNSPACED.has(dir));
  if(found.length)out[key]=found;
 }
 return out;
}
const snapshotFile=(dir:string)=>dir==='en'?'i18n/terms.en.json':`i18n/${dir}/terms.json`;
const format=(s:Snapshot)=>`{\n${Object.entries(s).map(([k,v])=>` ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n}\n`;

describe('Front NEWCOMER NC7: the glossary snapshots',()=>{
 const keys=glossedKeys();
 it('the windows name the keys of their why-lines and step texts',()=>{
  for(const key of ['lab.why','lssLab.why','classLab.why','pleiadesLab.why','clusterLab.why','pulsarLab.why','objectXGuide.why','lssLab.help.record','clusterLab.step.trial.help','objectXGuide.steps.classify.1'])expect(keys).toContain(key);
  for(const key of keys)expect(text('en',key),key).toBeTruthy();
  // Formulas stay plain text.
  for(const key of ['pulsarLab.step.delay.formula','pulsarLab.step.period.formula','pleiadesLab.step.distance.formula'])expect(keys).not.toContain(key);
 });
 for(const dir of ['en',...DIRS])it(`${dir}: the committed snapshot is the one its patterns give`,()=>{
  const actual=snapshotOf(dir,keys),file=path.join(ROOT,snapshotFile(dir));
  if(process.env.OPENVIREO_REFRESH_PINS==='1'){
   if(process.env.CI)throw new Error('OPENVIREO_REFRESH_PINS=1 is refused in CI');
   writeFileSync(file,format(actual));
  }
  expect(readFileSync(file,'utf8')).toBe(format(actual));
  // Each matched text is in its string, at the recorded occurrence, and never inside quotes or a control name.
  for(const [key,entries] of Object.entries(actual))for(const [id,matched,n] of entries){
   const s=text(dir,key)!;let at=-1;for(let i=0;i<=n;i++)at=s.indexOf(matched,at+1);
   expect(at,`${dir} ${key} ${id}`).toBeGreaterThanOrEqual(0);
   expect(masked(s,dir==='en'?names('en'):names(dir),dir!=='en').slice(at,at+matched.length),`${dir} ${key} ${id}: «${matched}» is quoted or a name`).toBe(matched);
  }
 });
 it('every term but the HR diagram is marked in English, and every language marks each string’s terms where English does',()=>{
  const english=snapshotOf('en',keys),count=(s:Snapshot,id:TermId)=>Object.values(s).filter(v=>v.some(e=>e[0]===id)).length;
  for(const id of TERM_IDS.filter(id=>id!=='hrDiagram'))expect(count(english,id),id).toBeGreaterThan(0);
  expect(count(english,'hrDiagram'),'the guides name the HR diagram only as controls').toBe(0);
  // A miss would leave the word plain (never a wrong mark), but today every language marks all forty: keep it so.
  const pairs=(s:Snapshot)=>Object.entries(s).flatMap(([key,v])=>v.map(e=>`${key} ${e[0]}`)).sort();
  for(const dir of DIRS)expect(pairs(snapshotOf(dir,keys)),dir).toEqual(pairs(english));
 });
});

describe('Front NEWCOMER NC7: matching',()=>{
 const en=(english:string,names:readonly string[]=[])=>matchTerms(TERM_IDS,english,names,english,names,ENGLISH_PATTERNS,false);
 it('is key-gated: a language string is searched only for the terms its English string has',()=>{
  expect(matchTerms(TERM_IDS,'Open the analyser.',[],'Abre el espectro.',[],LANGUAGE_PATTERNS.es!,false)).toEqual([]);
  expect(matchTerms(TERM_IDS,'Open the spectrum.',[],'Abre el espectro.',[],LANGUAGE_PATTERNS.es!,false)).toEqual([['spectrum','espectro',0]]);
 });
 it('never marks quoted text or a control name, and keeps the occurrence after them',()=>{
  expect(en('Choose Calculate B−V, then read B−V.',['Calculate B−V'])).toEqual([['colorIndex','B−V',1]]);
  expect(en('Open “Spectrum Information” to see the spectrum.')).toEqual([['spectrum','spectrum',0]]);
  expect(matchTerms(TERM_IDS,'Use Calculate B−V.',['Calculate B−V'],'Нажмите «Вычислить B−V».',[],LANGUAGE_PATTERNS.ru!,false)).toEqual([]);
 });
 it('searches longer terms first: E(B−V) is reddening and the zero-age main sequence is ZAMS',()=>{
  expect(en('Shift with E(B−V).')).toEqual([['reddening','E(B−V)',0]]);
  expect(en('Fit the zero-age main sequence to the lower main sequence.')).toEqual([['zams','zero-age main sequence',0],['mainSequence','main sequence',1]]);
 });
 it('runs to the end of an inflected word, and keeps Chinese and Japanese matches exact',()=>{
  expect(matchTerms(TERM_IDS,'a measured redshift',[],'измеренное красное смещение',[],LANGUAGE_PATTERNS.ru!,false)).toEqual([['redshift','красное смещение',0]]);
  expect(matchTerms(TERM_IDS,'the spectra',[],'les spectres',[],LANGUAGE_PATTERNS.fr!,false)).toEqual([['spectrum','spectres',0]]);
  expect(matchTerms(TERM_IDS,'the spectral type and the spectrum',[],'スペクトル型とスペクトル',[],LANGUAGE_PATTERNS.ja!,true)).toEqual([['spectrum','スペクトル',1]]);
 });
});

const buttons=(node:ReactNode):string[]=>Array.isArray(node)?node.filter(isValidElement).map(e=>String((e.props as {'data-term':string})['data-term'])):[];
describe('Front NEWCOMER NC7: marking',()=>{
 afterEach(()=>{activateLocale(null);});
 it('marks a term once per scope, as a real button with aria-expanded, and collects the window’s terms',()=>{
  const found=new Set<string>(),step=termScope(found);
  const first=glossText(step,'lssLab.help.record',E['lssLab.help.record']!);
  expect(buttons(first)).toEqual(['caHK','absorptionLine']);
  expect(renderToStaticMarkup(createElement('p',null,first))).toContain(`<button type="button" class="term" aria-expanded="false" aria-description="${E['term.caHK']}" data-term="caHK">Ca II K and H lines</button>`);
  // First occurrence per step: a second string of the same step leaves an already marked term plain.
  const why=termScope(found);
  expect(buttons(glossText(why,'lab.why',E['lab.why']!))).toEqual(['spectrum']);
  expect(glossText(why,'lab.hubbleHelp',E['lab.hubbleHelp']!)).toBe(E['lab.hubbleHelp']);
  expect(buttons(glossText(termScope(),'lab.hubbleHelp',E['lab.hubbleHelp']!))).toEqual(['spectrum']);
  expect([...found]).toEqual(['caHK','absorptionLine','spectrum']);
  expect(renderToStaticMarkup(createElement('div',null,wordsUsed('w',found)))).toBe(`<div><details class="lab-terms" id="w"><summary>${E['term.wordsHeading']}</summary><ul><li data-term="caHK">${E['term.caHK']}</li><li data-term="absorptionLine">${E['term.absorptionLine']}</li><li data-term="spectrum">${E['term.spectrum']}</li></ul></details></div>`);
  expect(wordsUsed('w',new Set())).toBeNull();
  // Review N2: a window that marks the main sequence, the ZAMS or an isochrone lists the HR diagram they are defined through.
  expect(renderToStaticMarkup(createElement('div',null,wordsUsed('w',new Set(['isochrone','metallicity']))))).toContain(`<li data-term="hrDiagram">${E['term.hrDiagram']}</li><li data-term="isochrone">`);
  expect(renderToStaticMarkup(createElement('div',null,wordsUsed('w',new Set(['spectrum']))))).not.toContain('hrDiagram');
 });
 it('the companion strip’s Step details mark the same terms as the window (LSS record, Object X classify)',()=>{
  const lss=renderToStaticMarkup(createElement('div',null,companionContent({lab:'large-scale-structure',progress:{...lssLabProgress(INITIAL_LSS_LAB_SUMMARY),next:'record'}}).details));
  expect(lss).toContain('data-term="caHK"');expect(lss).toContain('data-term="absorptionLine"');
  const x=renderToStaticMarkup(createElement('div',null,companionContent({lab:'object-x',progress:{...objectXLabProgress(INITIAL_OBJECT_X_LAB_SUMMARY),next:'classify'}}).details));
  expect(x).toContain(`<button type="button" class="term" aria-expanded="false" aria-description="${E['term.spectrum']}" data-term="spectrum">spectrum</button>`);
 });
 it('leaves a string plain when the rendered text does not hold the matched word (a miss is never a wrong mark)',()=>{
  expect(glossText(termScope(),'lab.why','A different sentence.')).toBe('A different sentence.');
  expect(glossText(termScope(),'not.a.key','spectrum')).toBe('spectrum');
 });
 for(const dir of DIRS)it(`${dir}: the language marks its own words`,()=>{
  activateLocale(BUNDLES[dir]!);
  const s=read(snapshotFile(dir)) as Snapshot;
  for(const [key,entries] of Object.entries(s).slice(0,40)){
   const marked=buttons(glossText(termScope(),key,text(dir,key)!));
   expect(marked.sort(),`${dir} ${key}`).toEqual([...new Set(entries.map(e=>e[0]))].sort());
  }
 });
 // Review N5/N6: the windows render every string with its real parameters ({n}, {total}, {ut}, {file}); each mark the snapshot
 // records lands on its matched text there, and nothing else is marked.
 for(const dir of ['en',...DIRS])it(`${dir}: the rendered windows mark exactly the snapshot’s words, after parameter substitution`,()=>{
  if(dir!=='en')activateLocale(BUNDLES[dir]!);
  const html=renderWindows(dir==='en'),unescape=(s:string)=>s.replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  const rendered=new Set([...html.matchAll(/<button type="button" class="term"[^>]* data-term="(\w+)">([^<]*)<\/button>/gu)].map(m=>`${m[1]} ${unescape(m[2]!)}`));
  const snap=read(snapshotFile(dir)) as Snapshot,mapKey=(key:string)=>dir!=='en'&&key.startsWith('objectXGuide.');
  const expected=new Set(Object.entries(snap).filter(([key])=>!mapKey(key)).flatMap(([,v])=>v.map(e=>`${e[0]} ${e[1]}`)));
  expect([...rendered].sort()).toEqual([...expected].sort());
  // The Object X map strings, from the language's own map.
  for(const [key,entries] of Object.entries(snap).filter(([key])=>mapKey(key)))expect(buttons(glossText(termScope(),key,text(dir,key)!)).sort(),`${dir} ${key}`).toEqual(entries.map(e=>e[0]).sort());
 });
 // Review M4c: the pseudo-locales take the English snapshot through their own transform.
 const PSEUDO:readonly (readonly [string,LocaleBundle])[]=[['qps',pseudoBundle()],...(Object.keys(PSEUDO_SCRIPT) as (keyof typeof PSEUDO_SCRIPT)[]).map(l=>[l,pseudoScriptBundle(l)] as const)];
 for(const [name,bundle] of PSEUDO)it(`${name}: the English snapshot, through the pseudo-locale’s transform`,()=>{
  activateLocale(bundle);
  for(const key of ['lab.why','lssLab.why','clusterLab.step.trial.help']){
   const rendered=bundle.messages[key as keyof typeof bundle.messages]!,marked=buttons(glossText(termScope(),key,rendered));
   expect([...marked].sort(),`${name} ${key}`).toEqual([...new Set((TERMS_EN as Record<string,string[][]>)[key]!.map(e=>e[0]!))].sort());
  }
 });
});

describe('Front NEWCOMER NC7: the definitions',()=>{
 const KEYS=[...TERM_IDS.map(id=>`term.${id}`),'term.label','term.close','term.wordsHeading'];
 for(const dir of ['en',...DIRS])it(`${dir}: nineteen strings; each definition one line, with no digit (units such as pc/cm³ have none)`,()=>{
  const c=catalog(dir);
  for(const key of KEYS){expect(c[key],`${dir} ${key}`).toBeTruthy();if(dir!=='en')expect(c[key],`${dir} ${key}: untranslated`).not.toBe(E[key]);}
  expect(c['term.label']).toContain('{term}');
  for(const id of TERM_IDS){const d=c[`term.${id}`]!;expect(d,`${dir} ${id}`).not.toMatch(/[\n\r]/u);expect(d,`${dir} ${id}: a digit`).not.toMatch(/\p{Nd}/u);expect(d.length,`${dir} ${id}`).toBeLessThanOrEqual(250);}
 });
 it('termDefinition names each term’s key',()=>{for(const id of TERM_IDS)expect(termDefinition(id)).toBe(E[`term.${id}`]);});
});
