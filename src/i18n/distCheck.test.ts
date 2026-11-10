import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll,describe,expect,it} from 'vitest';
import {PARTIAL} from '../../tests/fixtures/i18n/partial';
import {HELP_FILES} from '../help/helpFiles';
import {LANGUAGES} from './languages';
import es from './es/es.json';
// @ts-expect-error Build script (plain JS), as in split.test.ts.
import {checkI18nDist} from '../../scripts/check-i18n-dist.mjs';
// @ts-expect-error Build script (plain JS).
import {languageDir,planLanguage,sourceGraph} from '../../scripts/i18n-split.mjs';
// Front SC8 (docs/I18N.md, "Script groundwork: the language registry, detection and selector (SC8)"): scripts/check-i18n-dist.mjs
// accepts a partial language before its release, and tells two languages apart. The dist/ here is synthetic: each language chunk
// holds its module's texts as the real build's chunk does (the catalog subset, its map sources and, in the core, the originals),
// under the plugin's chunk names. A real `npm run build` with the fixture in the registry was run once for this front (docs/I18N.md).
type Language=typeof PARTIAL;
type Module={name:string;keys:string[];maps:string[];originals:boolean;empty:boolean};
const root=path.resolve(import.meta.dirname,'../..'),graph=sourceGraph(root),scratch=mkdtempSync(path.join(tmpdir(),'openvireo-sc8-dist-'));
afterAll(()=>rmSync(scratch,{recursive:true,force:true}));
let serial=0;
/** A second fixture language in the scratch directory (its `path` is relative to the checkout, as the registry's would be). */
function language(tag:string,catalog:Record<string,string>):Language{
 const dir=path.join(scratch,tag);mkdirSync(dir,{recursive:true});
 writeFileSync(path.join(dir,'c.json'),JSON.stringify(catalog));writeFileSync(path.join(dir,'originals.json'),'{}');
 writeFileSync(path.join(dir,'index.ts'),`export const B=Object.freeze({language:'${tag}',messages:{},maps:Object.freeze({}),originals:{}});\n`);
 return {...PARTIAL,tag,dir:tag.toLowerCase(),catalog:'c.json',path:path.relative(root,dir),match:[tag.slice(0,3)]};
}
/** A dist/ with an English entry that loads each language's core by import(), and one chunk per non-empty module. */
function dist(languages:readonly Language[],extra:(assets:string,html:{text:string})=>void=()=>{}):string{
 const out=path.join(scratch,`dist-${serial++}`),assets=path.join(out,'assets');mkdirSync(assets,{recursive:true});
 const name=(tag:string,module:string)=>`i18n-${tag}-${module.replace(/\+/g,'_')}-${(tag+module).replace(/\W/g,'').slice(0,8).padEnd(8,'x')}.js`;
 let entry='const n=1;';
 for(const l of languages){
  const plan=planLanguage(l,root,graph) as {modules:Module[];catalog:Record<string,string>;manifest:Record<string,{file:string}>};
  const originals=readFileSync(path.join(root,languageDir(l),'originals.json'),'utf8');
  for(const m of plan.modules.filter(m=>!m.empty)){
   const own=Object.fromEntries(m.keys.map(k=>[k,plan.catalog[k]]));
   const areas=m.name==='core'?plan.modules.filter(x=>x.name!=='core'&&!x.empty).map(x=>`import("./${name(l.tag,x.name)}");`).join(''):'';
   writeFileSync(path.join(assets,name(l.tag,m.name)),`${areas}export default ${JSON.stringify(own)};${m.maps.map(id=>readFileSync(path.join(root,plan.manifest[id].file),'utf8')).join('\n')}${m.originals?originals:''}`);
  }
  entry+=`const l${serial}=()=>import("./${name(l.tag,'core')}");`;
 }
 writeFileSync(path.join(assets,'index-AAAAAAAA.js'),entry);
 const html={text:'<!doctype html><script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script>'};
 extra(assets,html);writeFileSync(path.join(out,'index.html'),html.text);
 return out;
}
const check=(out:string,languages:readonly Language[])=>checkI18nDist(out,{root,languages,graph}) as {offenders:string[];warnings:string[];reports:{tag:string;sizes:Map<string,unknown>}[]};

describe('Front SC8: scripts/check-i18n-dist.mjs with a partial language before its release',()=>{
 it('accepts the fixture: its core and its one area are found by their texts, its empty areas have no chunk, it has no help',()=>{
  const result=check(dist([PARTIAL]),[PARTIAL]);
  expect(result.offenders).toEqual([]);expect(result.warnings).toEqual([]);
  expect([...result.reports[0].sizes.keys()]).toEqual(['core','fits']);
 });
 it('fails its text outside its chunk, a chunk for an empty area, a preloaded core, and help chunks it does not have',()=>{
  const stray=check(dist([PARTIAL],a=>writeFileSync(path.join(a,'index-AAAAAAAA.js'),`${readFileSync(path.join(a,'index-AAAAAAAA.js'),'utf8')}"Konservi la esploron ĉi tie";`)),[PARTIAL]);
  expect(stray.offenders.some(o=>/1 qaa-XA core text\(s\) outside the core chunk/.test(o)),stray.offenders.join('\n')).toBe(true);
  const empty=check(dist([PARTIAL],a=>writeFileSync(path.join(a,'i18n-qaa-XA-radio-ZZZZZZZZ.js'),'export default {};')),[PARTIAL]);
  expect(empty.offenders).toEqual(['qaa-XA radio is empty but has the chunk i18n-qaa-XA-radio-ZZZZZZZZ.js']);
  const preloaded=check(dist([PARTIAL],(_,html)=>{html.text+='<link rel="modulepreload" href="/assets/i18n-qaa-XA-core-qaaXAcor.js">';}),[PARTIAL]);
  expect(preloaded.offenders).toContain('index.html loads or preloads the qaa-XA chunk i18n-qaa-XA-core-qaaXAcor.js');
  const helped={...PARTIAL,help:{related:'RILATAJ TEMOJ'}};
  expect(check(dist([PARTIAL]),[helped]).offenders).toEqual([`expected ${Object.keys(HELP_FILES).length} qaa-XA help chunks, one per help file; found 0 for 0 files`]);
 });
 it('counts help chunks by the language their module names: one that names no registered language fails',()=>{
  const id=HELP_FILES['CAMHLP.LST'];
  const help=(text:string)=>(a:string)=>writeFileSync(path.join(a,'CAMHLP.LST-HHHHHHHH.js'),text);
  expect(check(dist([PARTIAL],help(`const e="es-419",t="CAMHLP.LST",n="${id.sha256}",r="x";export{e as language};`)),[PARTIAL]).offenders)
   .toEqual(['the help chunk CAMHLP.LST-HHHHHHHH.js names no registered language, not exactly one']);
  expect(check(dist([PARTIAL],help(`const e="qaa-XA",t="CAMHLP.LST",n="${id.sha256}",r="x";export{e as language};`)),[PARTIAL]).offenders)
   .toEqual(['expected 0 qaa-XA help chunks, one per help file (its registry entry has no help); found 1 for 1 files']);
 });
 it('does not take a text that another language also has as a marker (two languages share «Konservi la esploron ĉi tie»)',()=>{
  const other=language('qab-XB',{'project.save':'Konservi la esploron ĉi tie','sky.title':'Komencu per la ĉielo nun ĉi tie'});
  const out=dist([PARTIAL,other]);
  expect(readFileSync(path.join(out,'assets','i18n-qab-XB-core-qabXBcor.js'),'utf8')).toContain('Konservi la esploron ĉi tie');
  const result=check(out,[PARTIAL,other]);
  expect(result.offenders).toEqual([]);expect(result.reports.map(r=>r.tag)).toEqual(['qaa-XA','qab-XB']);
 });
 it('finds a module that has no marker text yet by its chunk name, with a warning, for a language before its release',()=>{
  const short=language('qac-XC',{'project.save':'Konservi la esploron ĉi tie','fits.title':'Bildo ĉi'});
  const result=check(dist([short]),[short]);
  expect(result.offenders).toEqual([]);
  expect(result.warnings).toEqual(['qac-XC fits has no marker text yet; its chunk i18n-qac-XC-fits-qacXCfit.js is found by its name only']);
 });
 it('lets a language\'s own static pages (dist/<pagePath>/….html) carry its text: dist/es/ may, dist/labs/ and an English chunk may not',()=>{
  // Spanish as registered, without its help files (this synthetic dist has none).
  const spanish={...LANGUAGES.find(l=>l.tag==='es-419')!,help:undefined} as Language;
  expect(spanish.pagePath).toBe('es');
  const marker=es['project.save'],page=`<!doctype html><html lang="es-419"><h1>${marker}</h1></html>`;
  const put=(file:string,text:string)=>(assets:string)=>{const full=path.join(path.dirname(assets),file);mkdirSync(path.dirname(full),{recursive:true});writeFileSync(full,text);};
  const at=(file:string)=>put(file,page);
  expect(check(dist([spanish]),[spanish]).offenders).toEqual([]);
  expect(check(dist([spanish],at('es/x/index.html')),[spanish]).offenders).toEqual([]);
  expect(check(dist([spanish],at('es/labs/hubble/index.html')),[spanish]).offenders).toEqual([]);
  const labs=check(dist([spanish],at('labs/x/index.html')),[spanish]).offenders;
  expect(labs).toHaveLength(1);expect(labs[0]).toMatch(/labs\/x\/index\.html: 1 es-419 core text\(s\) outside the core chunk/);
  const js=check(dist([spanish],a=>writeFileSync(path.join(a,'index-AAAAAAAA.js'),`${readFileSync(path.join(a,'index-AAAAAAAA.js'),'utf8')}"${marker}";`)),[spanish]).offenders;
  expect(js).toHaveLength(1);expect(js[0]).toMatch(/index-AAAAAAAA\.js: 1 es-419 core text\(s\) outside the core chunk/);
  // Under its path a .js file keeps the rule, and another language's text is refused on a language's pages.
  const script=check(dist([spanish],put('es/x.js',`"${marker}"`)),[spanish]).offenders;
  expect(script).toHaveLength(1);expect(script[0]).toMatch(/es\/x\.js: 1 es-419 core text/);
  const other=check(dist([spanish,PARTIAL],put('es/y/index.html','<p>Konservi la esploron ĉi tie</p>')),[spanish,PARTIAL]).offenders;
  expect(other).toHaveLength(1);expect(other[0]).toMatch(/es\/y\/index\.html: 1 qaa-XA core text/);
  // SC8 review: a pagePath that is not one segment exempts nothing and fails ('.' would otherwise exempt every page).
  const dot={...spanish,pagePath:'.'} as Language,dotted=check(dist([dot],at('labs/x/index.html')),[dot]).offenders;
  expect(dotted[0]).toBe('es-419: pagePath "." is not one lower-case path segment');expect(dotted[1]).toMatch(/labs\/x\/index\.html: 1 es-419 core text/);
 },180_000);
});
