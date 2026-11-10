// Front ES0 (docs/I18N.md): the dev-only pseudo-locale (src/i18n/pseudo.ts, ?lang=qps) must not reach the production build.
// Every text file under dist/ (the app, the lab pages, the sitemap, the original text resources) is searched for the
// pseudo-locale mark ⟦ in any form: the character itself, a ⟦ escape (any case) or an HTML character reference.
// Front ES-SPLIT (docs/I18N.md, "Spanish: the chunk split by route area"): each split language (src/i18n/languages.json) is a
// core module and one module per route area, plus shared modules (scripts/i18n-split.mjs plans them). Each module's text is in
// exactly one chunk that holds no other module's text, no other file carries the language's text, index.html loads none of them
// and its static imports reach none, and each module is within its size budget.
// Front SC8 (docs/I18N.md, "Script groundwork: the language registry, detection and selector (SC8)"): for many languages, some
// before their release and partial. The help chunks are counted per language (38 for each language whose registry entry has
// `help`, recognised by the `language` their module names, 0 for the others); a text that another language's sources also hold
// is no marker (it cannot tell the two apart); an empty area of a partial language has no chunk; and a module of a language before
// its release that has no marker text yet is found by its chunk name, with a warning (a released language still fails). A
// language's own static pages (an .html file under dist/<pagePath>/, its registry entry's path: es/ for es-419) may carry that
// language's text, never another language's; every other file, and every .js file, keeps the rule.
// Usage: node scripts/check-i18n-dist.mjs [distDir]   (default: dist)
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {CORE,ROOT,languageDir,loadLanguages,planLanguage,sourceGraph} from './i18n-split.mjs';
const TEXT=/\.(?:js|mjs|css|html?|xml|txt|json|svg|map|webmanifest|lst|htl|dat|sp|lnl|obs|pls)$/i;
const MARK=/⟦|\\u27e6|\\u\{27e6\}|&#x27e6;|&#10214;/i;
const gzip=(text)=>gzipSync(Buffer.from(text),{level:9}).length,kb=(n)=>(n/1000).toFixed(1);
const escape=(s)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Front ES1 review 1 and ES2: a minifier writes a string as "…", '…' or `…` (a template keeps real line feeds and writes CR as \r),
// so each marker is looked for in all three forms.
const quoted=(v)=>{const json=JSON.stringify(v).slice(1,-1);return [json,json.replace(/\\"/g,'"').replace(/'/g,"\\'"),v.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${').replace(/\r/g,'\\r')];};
// A map literal or an original is a marker when it has a letter outside ASCII (review: any script of languages.json, not only
// Spanish letters; a language written in ASCII alone finds its map-only modules by no marker and fails loudly, never silently)
// and no English source names it: the single-quoted literals of src/ outside the language directories, and en.json's values.
// Import and export-from lines are left out (their paths are not text).
const LETTER_OUTSIDE_ASCII=/(?![\x00-\x7f])\p{L}/u;
const LITERAL=/'((?:[^'\\\n]|\\.)*)'/g;
const literalsOf=(source)=>[...source.replace(/^(?:import|export) [^\n]* from '[^']*';?$/gm,'').matchAll(LITERAL)].map(x=>x[1].replace(/\\'/g,"'"));
// KB gzip at level 9, multiplied by the language's budgetFactor (docs/I18N.md).
const BUDGET={core:{warn:120_000,fail:150_000},module:{warn:60_000,fail:90_000},sum:{warn:300_000,fail:360_000}};
const HELP_BUDGET={warn:25_000,fail:40_000};
// A help chunk is named after its module (CAMHLP.LST-<hash>.js) and holds the SHA-256 of that file's original (review N10: matched
// by the chunk's own name, since OBJXHLP.LST and TOOLSHLP.LST have byte-identical originals and so one SHA-256).
const HELP_CHUNK=/^([A-Za-z]+\.(?:LST|TXT|OBS|PLS|LNL))-[\w-]+\.js$/;

/** Checks dist/ for the pseudo-locale and for each registered language's chunks. Returns the offenders (any one fails the
 * build), the warnings and what the report prints. `languages` and `root` default to the registry and this checkout; tests pass
 * a fixture language and a synthetic dist. */
export function checkI18nDist(dist,{root=ROOT,languages=loadLanguages(root),graph=sourceGraph(root)}={}){
 const offenders=[],warnings=[],files=[];
 (function walk(dir){for(const name of readdirSync(dir)){const file=join(dir,name);
  if(statSync(file).isDirectory()){walk(file);continue;}
  if(/^pseudo-/.test(name))offenders.push(`${file}: pseudo-locale chunk`);
  if(TEXT.test(name))files.push({file,name,text:readFileSync(file,'utf8')});}})(dist);
 for(const f of files)if(MARK.test(f.text))offenders.push(`${f.file}: contains the pseudo-locale mark ⟦`);
 const html=readFileSync(join(dist,'index.html'),'utf8');
 const inAssets=(f)=>f.file.startsWith(join(dist,'assets'));

 // Front ES-HELP: a language's help files (src/i18n/<dir>/help, one chunk each, fetched only when the help viewer opens that file)
 // are their own chunks: each is recognised by the SHA-256 of the VIREO original it records, must not be loaded or preloaded by
 // index.html, and may share phrases with the catalog. Front SC8: a chunk belongs to the language whose tag its module names
 // (`language`), and each language with `help` has one for each of the 38 files.
 const helpIds=[...readFileSync(join(root,'src','help','helpFiles.ts'),'utf8').matchAll(/^ '([^']+)':file\('[^']+','[^']+',\d+,'([0-9a-f]{64})'/gm)].map(m=>({key:m[1],sha:m[2]}));
 const helpChunks=new Map(),helpByLanguage=new Map(languages.map(l=>[l.tag,[]]));
 const namesTag=(text,tag)=>[`"${tag}"`,`'${tag}'`,`\`${tag}\``].some(form=>text.includes(form));
 for(const f of files.filter(inAssets)){const m=HELP_CHUNK.exec(f.name),id=m&&helpIds.find(h=>h.key===m[1].toUpperCase());if(!id||!f.text.includes(id.sha))continue;
  helpChunks.set(f.name,f);
  const owners=languages.filter(l=>namesTag(f.text,l.tag));
  if(owners.length!==1){offenders.push(`the help chunk ${f.name} names ${owners.length?owners.map(l=>l.tag).join(' and '):'no registered language'}, not exactly one`);continue;}
  helpByLanguage.get(owners[0].tag).push(f);}
 for(const name of helpChunks.keys())if(html.includes(name))offenders.push(`index.html loads or preloads the help chunk ${name}`);
 for(const l of languages){
  const found=helpByLanguage.get(l.tag),expected=l.help?helpIds.length:0,names=new Set(found.map(f=>HELP_CHUNK.exec(f.name)[1].toUpperCase()));
  if(found.length!==expected||names.size!==expected)offenders.push(`expected ${expected} ${l.tag} help chunks, one per help file${l.help?'':' (its registry entry has no help)'}; found ${found.length} for ${names.size} files`);
 }
 for(const f of helpChunks.values()){const g=gzip(f.text);if(g>HELP_BUDGET.fail)offenders.push(`${f.name}: ${kb(g)} KB gzip is over the 40 KB budget of a help chunk`);else if(g>HELP_BUDGET.warn)warnings.push(`the help chunk ${f.name} is ${kb(g)} KB gzip, over 25 KB`);}

 // The scripts index.html loads, and everything they import statically (a dynamic import(…) is not followed).
 const assets=new Map(files.filter(f=>inAssets(f)&&/\.js$/.test(f.name)).map(f=>[f.name,f]));
 const closure=new Set(),todo=[...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map(m=>m[1]);
 while(todo.length){const name=todo.pop();if(closure.has(name)||!assets.has(name))continue;closure.add(name);
  for(const m of assets.get(name).text.matchAll(/(?:^|[;\s})])import\s*(?:[^"'`();]*?from\s*)?["']\.\/([^"']+\.js)["']/g))todo.push(m[1]);}
 if(!closure.size)offenders.push('index.html loads no script under /assets/');

 const en=JSON.parse(readFileSync(join(root,'src','i18n','en.json'),'utf8')),reports=[];
 const languageDirs=languages.map(l=>`${languageDir(l)}/`);
 const englishTexts=new Set(Object.values(en));
 for(const f of graph.keys())if(!languageDirs.some(d=>f.startsWith(d)))for(const v of literalsOf(readFileSync(join(root,f),'utf8')))englishTexts.add(v);
 // Every language's plan and texts first: a marker of one language must be a text that no other language's sources hold (SC8).
 const plans=[];
 for(const language of languages){
  const plan=planLanguage(language,root,graph);
  if(plan.problems.length){offenders.push(...plan.problems.map(p=>`${language.tag} plan: ${p}`));continue;}
  // The texts of each module: its catalog values, the single-quoted literals of its map files and (core) the originals' values.
  const originals=Object.values(JSON.parse(readFileSync(join(root,languageDir(language),'originals.json'),'utf8')));
  const texts=new Map(plan.modules.map(m=>{
   const maps=[],sources=m.maps.map(id=>readFileSync(join(root,plan.manifest[id].file),'utf8'));
   for(const source of sources)maps.push(...literalsOf(source));
   return [m.name,{catalog:m.keys.map(k=>plan.catalog[k]),maps,originals:m.originals?originals:[],sources}];
  }));
  plans.push({language,plan,texts,all:new Set([...texts.values()].flatMap(t=>[...t.catalog,...t.maps,...t.originals]))});
 }
 for(const {language,plan,texts} of plans){
  const tag=language.tag,factor=language.budgetFactor??1,released=language.released===true;
  const otherTexts=new Set(plans.filter(p=>p.language!==language).flatMap(p=>[...p.all]));
  const modules=plan.modules.filter(m=>!m.empty);
  // Markers: catalog values that differ from English (16+ characters), map literals (12+) and originals (8+) with a letter
  // outside ASCII that no English source names, and none that another language's sources also hold. A marker of two modules is
  // not used.
  const candidates=new Map(),add=(v,name)=>{if(otherTexts.has(v))return;if(!candidates.has(v))candidates.set(v,new Set());candidates.get(v).add(name);};
  for(const m of modules){const t=texts.get(m.name);
   m.keys.forEach((k,i)=>{if(t.catalog[i]!==en[k]&&t.catalog[i].length>=16)add(t.catalog[i],m.name);});
   for(const v of t.maps)if(v.length>=12&&LETTER_OUTSIDE_ASCII.test(v)&&!englishTexts.has(v))add(v,m.name);
   for(const v of t.originals)if(v.length>=8&&LETTER_OUTSIDE_ASCII.test(v)&&!englishTexts.has(v))add(v,m.name);}
  const markers=new Map(modules.map(m=>[m.name,[]]));
  for(const [v,owners] of candidates)if(owners.size===1)markers.get([...owners][0]).push({text:v,forms:quoted(v)});
  // Which files carry which module's markers (the help chunks may share phrases with the catalog, as ES-HELP recorded; the
  // language's own static pages, dist/<pagePath>/….html, are its text by design).
  // SC8 review: one lower-case path segment only ('.', '..', 'a/b' or '' would exempt other pages; src/i18n/languages.test.ts also
  // refuses the site's own directories).
  if(language.pagePath!==undefined&&!/^[a-z0-9-]+$/.test(language.pagePath))offenders.push(`${tag}: pagePath ${JSON.stringify(language.pagePath)} is not one lower-case path segment`);
  const ownPages=/^[a-z0-9-]+$/.test(language.pagePath??'')?join(dist,language.pagePath)+sep:null;
  const holders=new Map();
  for(const f of files){if(helpChunks.has(f.name)||(ownPages&&/\.html?$/i.test(f.name)&&f.file.startsWith(ownPages)))continue;
   const hits=new Map();for(const [name,list] of markers){const found=list.filter(m=>m.forms.some(form=>f.text.includes(form)));if(found.length)hits.set(name,found);}
   if(hits.size)holders.set(f,hits);}
  const chunkName=(name)=>`i18n-${tag}-${name.replace(/\+/g,'_')}-`;
  // Front PT3: another language's chunk (named i18n-<tag>-<module>-) is never this language's, and in it a marker may appear only
  // inside a longer text of that chunk's own module, as within one language below (Portuguese «Campo de velocidade» holds
  // Spanish «Campo de velocidad»). Returns that module's text, or null for a file that is no other language's chunk.
  const foreign=(f)=>{for(const p of plans){if(p.language===language)continue;
   for(const [name,t] of p.texts)if(f.name.startsWith(`i18n-${p.language.tag}-${name.replace(/\+/g,'_')}-`))return [...t.catalog,...t.sources,...t.originals].join('\n');}
   return null;};
  // Each module's markers are all in one JS chunk named after it. A module of a language before its release that has no marker
  // yet (a partial catalog's short or English-equal texts) is found by its name only.
  const chunkOf=new Map();
  for(const m of modules){
   const list=markers.get(m.name);
   if(!list.length){
    const named=[...assets.values()].filter(f=>f.name.startsWith(chunkName(m.name)));
    if(released||named.length!==1){offenders.push(`${tag} ${m.name}: no marker text to find its chunk${released?'':` (and ${named.length} chunks by its name)`}`);continue;}
    warnings.push(`${tag} ${m.name} has no marker text yet; its chunk ${named[0].name} is found by its name only`);chunkOf.set(m.name,named[0]);continue;
   }
   const full=[...holders].filter(([f,hits])=>hits.get(m.name)?.length===list.length&&foreign(f)===null).map(([f])=>f);
   if(full.length!==1||!/\.js$/.test(full[0].name)){offenders.push(`${tag} ${m.name}: expected one chunk holding all ${list.length} of its markers, found ${full.length}`);continue;}
   chunkOf.set(m.name,full[0]);
   if(!full[0].name.startsWith(chunkName(m.name)))offenders.push(`${tag} ${m.name}: its chunk is named ${full[0].name}`);
  }
  // An empty area of a partial language has no chunk: the core resolves it inline.
  for(const m of plan.modules.filter(m=>m.empty))for(const f of assets.values())if(f.name.startsWith(chunkName(m.name)))offenders.push(`${tag} ${m.name} is empty but has the chunk ${f.name}`);
  // No language text elsewhere, and each chunk holds exactly one module: another module's marker may appear in a file only as part
  // of a longer text of that file's own module (a short sentence inside a long one).
  const languageFiles=new Set(chunkOf.values()),ownerOf=new Map([...chunkOf].map(([n,f])=>[f,n]));
  const joined=new Map([...texts].map(([name,t])=>[name,[...t.catalog,...t.sources,...t.originals].join('\n')]));
  for(const [f,hits] of holders){const own=ownerOf.get(f),other=own?null:foreign(f);
   for(const [name,found] of hits){if(name===own)continue;
    const stray=found.filter(m=>!(own&&joined.get(own).includes(m.text))&&!(other!==null&&other.includes(m.text)));
    if(stray.length)offenders.push(`${f.file}: ${stray.length} ${tag} ${name} text(s) outside the ${name} chunk (${JSON.stringify(stray[0].text.slice(0,60))})`);}}
  // Not loaded at start: index.html neither loads nor preloads a language chunk, and its scripts' static imports reach none.
  for(const f of languageFiles){
   if(html.includes(f.name))offenders.push(`index.html loads or preloads the ${tag} chunk ${f.name}`);
   if(closure.has(f.name))offenders.push(`the scripts index.html loads import the ${tag} chunk ${f.name} statically`);
  }
  // Where each chunk's name appears: the core only as the target of the loaders' import(); an area only in the core; a shared
  // module only in the core and in its areas' chunks.
  const core=chunkOf.get(CORE);
  for(const [name,chunk] of chunkOf){
   const allowed=new Set([core,...modules.filter(m=>m.kind==='area'&&m.shared.includes(name)).map(m=>chunkOf.get(m.name))]);
   for(const f of files){if(f===chunk||!f.text.includes(chunk.name))continue;
    if(name!==CORE){if(!allowed.has(f))offenders.push(`${f.file} names the ${tag} ${name} chunk`);continue;}
    const uses=[...f.text.matchAll(new RegExp(escape(chunk.name),'g'))];
    // The loader's import(`./…`), and the same file in Vite's preload list of that import (__vite__mapDeps: "assets/…").
    if(languageFiles.has(f)||uses.some(x=>!/(?:import\(\s*["'`]\.\/|["'`]assets\/)$/.test(f.text.slice(Math.max(0,x.index-24),x.index))))offenders.push(`${f.file} names the ${tag} core chunk other than in the loader's import()`);
   }
  }
  // Budgets (gzip level 9), scaled by the language's budgetFactor.
  const sizes=new Map([...chunkOf].map(([name,f])=>[name,{name:f.name,raw:Buffer.byteLength(f.text),gzip:gzip(f.text)}]));
  const check=(what,size,budget)=>{if(size>budget.fail*factor)offenders.push(`${tag} ${what}: ${kb(size)} KB gzip is over the ${kb(budget.fail*factor)} KB budget`);else if(size>budget.warn*factor)warnings.push(`${tag} ${what} is ${kb(size)} KB gzip, over ${kb(budget.warn*factor)} KB`);};
  for(const [name,s] of sizes)check(name===CORE?'core':name,s.gzip,name===CORE?BUDGET.core:BUDGET.module);
  const sum=[...sizes.values()].reduce((n,s)=>n+s.gzip,0);check('sum of its modules',sum,BUDGET.sum);
  reports.push({tag,plan,sizes,sum,help:helpByLanguage.get(tag)});
 }
 return {offenders,warnings,reports,files};
}

/** The lines the build prints. */
export function reportLines({reports,files}){
 const out=[`Build is free of the pseudo-locale (${files.length} text files searched).`];
 for(const {tag,plan,sizes,sum,help} of reports){
  out.push(`${tag}: ${sizes.size} chunks, ${kb(sum)} KB gzip in all; index.html loads none, and each holds one module's text only:`);
  for(const m of plan.modules){const s=sizes.get(m.name);out.push(s?`  ${m.name.padEnd(24)} ${kb(s.gzip).padStart(6)} KB gzip ${kb(s.raw).padStart(7)} KB raw  ${s.name}`:`  ${m.name.padEnd(24)} empty: no text yet, no chunk`);}
  out.push(`  extra download per route (its area and shared modules, on top of the core): ${plan.declared.map(a=>{const m=plan.modules.find(x=>x.name===a);return `${a} ${kb([a,...m.shared].reduce((n,x)=>n+(sizes.get(x)?.gzip??0),0))}`;}).join(', ')} KB`);
  if(help.length)out.push(`${help.length} ${tag} help chunks (${kb(help.reduce((n,f)=>n+Buffer.byteLength(f.text),0))} KB raw, ${kb(help.reduce((n,f)=>n+gzip(f.text),0))} KB gzip in all) are fetched only by the help viewer.`);
 }
 return out;
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
 const result=checkI18nDist(process.argv[2]??'dist');
 for(const w of result.warnings)console.warn(`Warning: ${w}.`);
 if(result.offenders.length){console.error(`The build carries development or misplaced language code:\n${result.offenders.join('\n')}`);process.exit(1);}
 for(const line of reportLines(result))console.log(line);
}
