import {describe,expect,it} from 'vitest';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import en from '../en.json';
import es from './es.json';
import originals from './originals.json';
import glossary from './glossary.json';
import identical from './identical.json';
import lintAllowed from './lint-allowed.json';
import {SPANISH} from './index';
import {manualLimitText} from '../../core/slewLimit';
import {createI18n,type MessageKey} from '../catalog';
import {mapParity} from '../parity';
import {normalizeOriginal} from '../vireo';
import {MAP_IDS,type MapId} from '../maps';
import {APP_SHELL_MESSAGES_EN} from '../../components/AppShellMessages';
import {HELP_MENU_EN} from '../../help/HelpMessages';
import {HELP_VIEWER_EN} from '../../help/HelpViewerMessages';
import {WEB_HELP_EN} from '../../help/webHelp';
import {LANGUAGE_CHOICE_EN} from '../../components/LanguageChoiceMessages';
import {OBJECT_X_LAB_EN} from '../../objectx/ObjectXMessages';
import {POLISH_MESSAGES_EN} from '../../polish/PolishMessages';
import {PROJECT_LINKS_EN} from '../../help/projectLinks';
import {TOUR_EN} from '../../help/tour';
import {VARIABLE_STARS_EN} from '../../variables/VariableStarMessages';
import {CAMERA_MESSAGES_EN} from '../../camera/CameraMessages';
import {FIELD_INFO_MESSAGES_EN,FIELD_READ_DETAILS_EN,NAKED_EYE_MESSAGES_EN} from '../../observatory/FieldInfoMessages';
import {OBSERVATION_METADATA_EN} from '../../ObservationMetadataMessages';
import {OBSERVATORY_MESSAGES_EN} from '../../observatory/ObservatoryMessages';
import {QSO_LIST_MESSAGES_EN} from '../../observatory/QsoListMessages';
import {SOUND_MESSAGES_EN} from '../../sound/SoundMessages';
import {ENGINE_VIEW_EN} from '../../SpectrumEngineMessages';
import {SPECTRAL_RANGE_EN} from '../../SpectralRangeMessages';
import {WEDGE_MESSAGES_EN} from '../../components/WedgeMessages';

// Front ES1 (docs/I18N.md; plan §3.2 and §5.3 step 1): automatic checks of every Spanish string. They fail the batch; the
// independent reviewer agent then reads the strings in context. Length ratios outside 0.7–1.6 are reported, not failed.
const ENGLISH_MAPS:Partial<Record<MapId,unknown>>={appShell:APP_SHELL_MESSAGES_EN,camera:CAMERA_MESSAGES_EN,engineView:ENGINE_VIEW_EN,spectralRange:SPECTRAL_RANGE_EN,fieldInfo:FIELD_INFO_MESSAGES_EN,fieldReadDetails:FIELD_READ_DETAILS_EN,helpMenu:HELP_MENU_EN,languageChoice:LANGUAGE_CHOICE_EN,nakedEye:NAKED_EYE_MESSAGES_EN,objectXLab:OBJECT_X_LAB_EN,observationMetadata:OBSERVATION_METADATA_EN,observatory:OBSERVATORY_MESSAGES_EN,polish:POLISH_MESSAGES_EN,projectLinks:PROJECT_LINKS_EN,qsoList:QSO_LIST_MESSAGES_EN,sound:SOUND_MESSAGES_EN,tour:TOUR_EN,variableStars:VARIABLE_STARS_EN,wedge:WEDGE_MESSAGES_EN,helpViewer:HELP_VIEWER_EN,webHelp:WEB_HELP_EN};
/** The maps translated completely (ES1: the shell; ES2: the observatory; ES3: the E01 spectrometer maps; ES4: the wedge); the others are partial until their sub-front. */
const COMPLETE_MAPS:readonly MapId[]=['appShell','helpMenu','languageChoice','projectLinks','tour','camera','fieldInfo','fieldReadDetails','nakedEye','observationMetadata','observatory','polish','qsoList','sound','engineView','spectralRange','wedge','helpViewer','webHelp'];
/** ES1's area of en.json: the shell (header, menu, home and portal, toolbar, errors, instructor mode, document title). */
const SHELL_KEYS=(Object.keys(en) as MessageKey[]).filter(k=>/^(app|project|session|error|instructorMode)\./.test(k)||/\.nav$/.test(k)||['demonstrationMode.banner','sky.eyebrow','sky.title','sky.subtitle','sky.about','sky.local','sky.observatory','sky.analyzer','sky.step1','sky.step1Help','sky.step2','sky.step2Help','sky.step3','sky.step3Help','spectrum.tools','classLink.cancel'].includes(k));
/** The string literals of a TypeScript source (escapes decoded; template literals with substitutions skipped). */
export function stringLiterals(source:string):string[]{
 const out:string[]=[],ESC:Record<string,string>={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(c==='/'&&source[i+1]==='/'){i=source.indexOf('\n',i);if(i<0)break;continue;}
  if(c==='/'&&source[i+1]==='*'){i=source.indexOf('*/',i+2)+1;if(i<=0)break;continue;}
  if(c!=='\''&&c!=='"'&&c!=='`')continue;
  let value='',j=i+1,substituted=false;
  for(;j<source.length&&source[j]!==c;j++){
   if(source[j]==='\\'){const n=source[++j];if(n==='u'){const m=/^\{([0-9a-f]+)\}|^([0-9a-f]{4})/i.exec(source.slice(j+1))!;value+=String.fromCodePoint(parseInt(m[1]??m[2],16));j+=m[0].length;}else if(n==='\n'){/* line continuation */}else value+=ESC[n]??n;}
   else if(c==='`'&&source[j]==='$'&&source[j+1]==='{'){substituted=true;let depth=0;for(;j<source.length;j++){if(source[j]==='{')depth++;else if(source[j]==='}'&&--depth===0)break;}}
   else value+=source[j];
  }
  if(!substituted)out.push(value);
  i=j;
 }
 return out;
}
/** A sample argument that prints as «An» and acts as the number n+2 in comparisons and number methods (toFixed…). */
function sampleArgument(i:number):unknown{
 const text=`«A${i+1}»`;
 return new Proxy(Object(i+2),{get:(target,key)=>key===Symbol.toPrimitive?(hint:string)=>hint==='number'?i+2:text:key==='toString'||typeof key==='string'&&key.startsWith('to')?()=>text:Reflect.get(target,key)});
}
type Pair=Readonly<{id:string;en:string;es:string}>;
/** Every translated string with its English source: catalog values, map leaves (functions called with sample arguments) and originals. */
function pairs():Pair[]{
 const out:Pair[]=[];
 for(const [key,text] of Object.entries(es))out.push({id:`catalog:${key}`,en:en[key as MessageKey],es:text});
 const walk=(e:unknown,s:unknown,at:string)=>{
  if(typeof s==='string'&&typeof e==='string')out.push({id:at,en:e,es:s});
  else if(typeof s==='function'&&typeof e==='function'){
   // Front ES2: string arguments first; a function that formats numbers gets an argument that reads as «An» in text and as
   // a number in comparisons and number methods; one that takes a record or list gets plain numbers.
   for(const make of [(i:number)=>`«A${i+1}»`,sampleArgument,(i:number)=>i+2]){
    const args=Array.from({length:e.length},(_,i)=>make(i));
    try{out.push({id:at,en:String((e as (...a:unknown[])=>unknown)(...args)),es:String((s as (...a:unknown[])=>unknown)(...args))});break;}catch{/* next kind of argument */}
   }
  }
  else if(s&&typeof s==='object'&&e&&typeof e==='object')for(const k of Object.keys(s))walk((e as Record<string,unknown>)[k],(s as Record<string,unknown>)[k],`${at}.${k}`);
 };
 for(const [id,map] of Object.entries(SPANISH.maps??{}))walk(ENGLISH_MAPS[id as MapId],map,`map:${id}`);
 for(const [key,text] of Object.entries(originals))out.push({id:`original:${key}`,en:key,es:text});
 return out;
}
/** Forbidden words match with Unicode word boundaries (JavaScript's \\b is ASCII-only, so «abrí» or «móvil» would slip). */
const lower=(s:string)=>s.toLocaleLowerCase('es');
const WORD=(w:string)=>`(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`;
const FORBIDDEN=(glossary.forbidden as {words?:string[];es?:string;use:string}[]).map(f=>({label:f.words?`«${f.words.join('», «')}»`:`/${f.es}/`,use:f.use,words:f.words??null,pattern:new RegExp(f.words?f.words.map(WORD).join('|'):f.es!,'iu')}));
/** The forbidden words or patterns found in a string, less the words lint-allowed.json allows in that string. */
const ALLOWED=lintAllowed.entries as Record<string,{words:string[];reason:string}>;
export function forbiddenIn(id:string,text:string):string[]{
 const out:string[]=[];
 for(const f of FORBIDDEN){
  if(f.words){for(const w of f.words)if(new RegExp(WORD(w),'iu').test(text)&&!ALLOWED[id]?.words.some(a=>a.toLowerCase()===w.toLowerCase()))out.push(`«${w}», use ${f.use}`);}
  else if(f.pattern.test(text))out.push(`${f.label}, use ${f.use}`);
 }
 return out;
}
/** Unpaired ¿ ? or ¡ !: a closer that ends a question or exclamation (after a letter, digit, bracket, quote, … or a {param}, ES5) needs an
 * opener before it, and every opener needs a closer. A bare ? (a key, «?lang=») is not a closer. */
export function unpaired(text:string,open:string,close:string):string|null{
 let depth=0;
 for(let i=0;i<text.length;i++){
  if(text[i]===open)depth++;
  else if(text[i]===close&&/[\p{L}\d)»”…}]/u.test(text[i-1]??'')&&/[\s)»”.,;:]|$/.test(text[i+1]??'')){if(depth===0)return `${close} without ${open}`;depth--;}
 }
 return depth>0?`${open} without ${close}`:null;
}
const GLYPHS=['›','…','↗','▸','·','—','–','×','✳','?'];
describe('Front ES1 review 1: the lint catches what it must',()=>{
 it('finds usted, voseo, Spain-only words and unpaired ¿ ¡ with Unicode-aware boundaries',()=>{
  const hits=(text:string)=>FORBIDDEN.filter(f=>f.pattern.test(text)).map(f=>f.label);
  for(const bad of ['Haga clic aquí','Elija un objeto','Pulse el botón','Pulsá Aceptar','Abrí la cúpula','Guardá tu trabajo','Mirá esto','Guarde su trabajo','¿Tenés tiempo?','Copia su investigación','Usá el móvil','Abre el fichero'])expect(hits(bad),bad).not.toEqual([]);
  for(const good of ['Haz clic en el púlsar','Elige un objeto','Presiona el botón','Abre la cúpula','Guarda tu trabajo','Los púlsares','Su investigación no' ])if(good!=='Su investigación no')expect(hits(good),good).toEqual([]);
  // A word allowed for one string only (lint-allowed.json), never for others; every allowance names a reason and is used.
  expect(forbiddenIn('map:languageChoice.originalsNote','la próxima vez que se cargue la página')).toEqual([]);
  expect(forbiddenIn('catalog:other','la próxima vez que se cargue la página')).not.toEqual([]);
  expect(forbiddenIn('map:languageChoice.originalsNote','Haga clic')).not.toEqual([]);
  for(const [id,entry] of Object.entries(ALLOWED)){expect(entry.reason.length,id).toBeGreaterThan(20);expect(pairs().some(p=>p.id===id&&entry.words.every(w=>new RegExp(WORD(w),'iu').test(p.es))),`${id} still needs its allowance`).toBe(true);}
  expect(unpaired('¿Cambiar el idioma?','¿','?')).toBeNull();expect(unpaired('Cambiar el idioma?','¿','?')).toBe('? without ¿');expect(unpaired('¿Cambiar el idioma.','¿','?')).toBe('¿ without ?');
  expect(unpaired('presiona la tecla ? o abre ?lang=es','¿','?')).toBeNull();expect(unpaired('¡Listo!','¡','!')).toBeNull();expect(unpaired('¿Restaurar {file}?','¿','?')).toBeNull();expect(unpaired('Restaurar {file}?','¿','?')).toBe('? without ¿');expect(unpaired('¡Listo.','¡','!')).toBe('¡ without !');
 });
});
describe('Front ES1: the Spanish (es-419) catalog, maps and originals',()=>{
 it('the catalog is a valid partial catalog: known keys, the same {params}, strings only (fallback mode until ES-REL)',()=>{
  expect(()=>createI18n(es,'es-419',{fallback:true,numberLocale:'en-US'})).not.toThrow();
  for(const key of Object.keys(es))expect(Object.hasOwn(en,key),key).toBe(true);
 });
 it('every map has the English shape: the same keys, kinds, {params} and arities (complete for the shell maps)',()=>{
  for(const id of Object.keys(SPANISH.maps??{}))expect(MAP_IDS,id).toContain(id);
  for(const [id,map] of Object.entries(SPANISH.maps??{})){
   const english=ENGLISH_MAPS[id as MapId];expect(english,`${id}: English map registered in this test`).toBeDefined();
   expect(mapParity(english,map,'$',{partial:!COMPLETE_MAPS.includes(id as MapId)}),id).toEqual([]);
  }
 });
 it('originals are keyed by a normalised literal that exists in the source, so stale keys fail',()=>{
  const literals=new Set<string>();
  // Front ES2: a small tokenizer reads '…', "…" and `…` literals (without substitutions) with their escapes decoded and skips
  // comments, so \r\n texts and quotes inside other literals are read exactly.
  (function scan(dir:string){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()){if(!['i18n'].includes(e.name))scan(f);}else if(/\.tsx?$/.test(e.name)&&!/\.test\.ts$/.test(e.name))for(const text of stringLiterals(readFileSync(f,'utf8')))literals.add(normalizeOriginal(text));}})(path.resolve(import.meta.dirname,'../..'));
  // Front ES2: VIREO texts the core composes from literals (the manual slew-limit box) are keyed whole.
  for(const d of ['N','S','E','W'] as const)literals.add(manualLimitText(d));
  for(const key of Object.keys(originals))expect(literals.has(key.replace(/^[\w-]+\|/,'')),key).toBe(true);
  for(const key of Object.keys(originals))expect(normalizeOriginal(key),key).toBe(key);
 });
 it('the shell (ES1\'s area) is 100 % Spanish: catalog keys and the shell maps',()=>{
  expect(SHELL_KEYS.filter(k=>!Object.hasOwn(es,k))).toEqual([]);
  expect(SHELL_KEYS.length).toBeGreaterThan(120);
  for(const id of COMPLETE_MAPS)expect(mapParity(ENGLISH_MAPS[id],SPANISH.maps?.[id]),id).toEqual([]);
 });
 it('a Spanish string equals its English source only when identical.json gives the reason',()=>{
  const allowed=identical.entries as Record<string,string>;
  expect(pairs().filter(p=>p.es===p.en&&!Object.hasOwn(allowed,p.id)).map(p=>p.id)).toEqual([]);
  for(const [id,reason] of Object.entries(allowed))expect(reason.length,id).toBeGreaterThan(10);
 });
 it('follows the glossary: required Spanish terms and fixed names present, forbidden forms absent',()=>{
  const problems:string[]=[];
  for(const p of pairs()){
   if(p.es===p.en&&Object.hasOwn(identical.entries,p.id))continue;// an identifier or anchor kept on purpose (identical.json)
   for(const term of glossary.terms)if(new RegExp(term.en,'i').test(p.en.replace(/\{\w+\}/g,''))&&!new RegExp(term.es,'iu').test(p.es))problems.push(`${p.id}: "${term.en}" needs «${term.es}»`);
   // Front ES2: an "exact" name (one generic word: OK, File, Close…) applies only to a whole string; Spanish case follows the sentence.
   for(const name of glossary.names as {en:string;es:string;exact?:boolean;except?:Record<string,string>}[])if(!name.except?.[p.id]&&(name.exact?normalizeOriginal(p.en)===name.en:p.en.includes(name.en))&&!lower(p.es).includes(lower(name.es)))problems.push(`${p.id}: "${name.en}" must read «${name.es}»`);
   for(const hit of forbiddenIn(p.id,p.es))problems.push(`${p.id}: forbidden ${hit}`);
  }
  expect(problems).toEqual([]);
 });
 it('keeps the glyphs and every map placeholder, pairs ¿ ? and ¡ ! both ways, adds no HTML, and reports the length ratio',()=>{
  const problems:string[]=[],ratios:string[]=[];
  const count=(s:string,g:string)=>s.split(g).length-1;
  for(const p of pairs()){
   for(const g of GLYPHS)if(g!=='?'&&count(p.en,g)!==count(p.es,g))problems.push(`${p.id}: ${count(p.es,g)}×${g} instead of ${count(p.en,g)}`);
   // Front ES2: a 'fragment|' original is one piece of a VIREO text the core composes around data, so its marks pair across pieces.
   // Front ES3 review: a VIREO message quoted in English inside “…” (as the English quotes it) keeps its own ! and ?.
   const unquoted=p.es.replace(/“([^”]*)”/g,(m,q:string)=>p.en.includes(q)?'“”':m);
   if(!p.id.startsWith('original:fragment|'))for(const [open,close] of [['¿','?'],['¡','!']]){const issue=unpaired(unquoted,open,close);if(issue)problems.push(`${p.id}: ${issue}`);}
   // Map functions: every placeholder in the English output reaches the Spanish output.
   for(const arg of p.en.match(/«A\d+»/g)??[])if(!p.es.includes(arg))problems.push(`${p.id}: drops ${arg}`);
   if(/<\/?[a-z]/i.test(p.es)&&!/<\/?[a-z]/i.test(p.en))problems.push(`${p.id}: HTML`);
   const ratio=p.es.length/Math.max(1,p.en.length);if(p.en.length>12&&(ratio<.7||ratio>1.6))ratios.push(`${p.id} ${ratio.toFixed(2)}`);
  }
  expect(problems).toEqual([]);
  if(ratios.length)console.info(`Length ratio outside 0.7–1.6 (reported for the reviewer, not a failure):\n${ratios.join('\n')}`);
 });
 it('never claims to be CLEA\'s, and addresses the student as tú',()=>{
  for(const p of pairs()){expect(p.es,p.id).not.toMatch(/\b(usted|ustedes)\b/iu);expect(p.es,p.id).not.toMatch(/traducci[oó]n (oficial|de CLEA)/iu);}
 });
});
