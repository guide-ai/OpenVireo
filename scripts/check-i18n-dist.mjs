// Front ES0 (docs/I18N.md): the dev-only pseudo-locale (src/i18n/pseudo.ts, ?lang=qps) must not reach the production build.
// Every text file under dist/ (the app, the lab pages, the sitemap, the original text resources) is searched for the
// pseudo-locale mark ⟦ in any form: the character itself, a ⟦ escape (any case) or an HTML character reference.
// Front ES-SPLIT (docs/I18N.md, "Spanish: the chunk split by route area"): each split language (src/i18n/languages.json) is a
// core module and one module per route area, plus shared modules (scripts/i18n-split.mjs plans them). Each module's text is in
// exactly one chunk that holds no other module's text, no other file carries the language's text, index.html loads none of them
// and its static imports reach none, and each module is within its size budget.
// Usage: node scripts/check-i18n-dist.mjs [distDir]   (default: dist)
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {CORE,ROOT,loadLanguages,planLanguage,sourceGraph} from './i18n-split.mjs';
const dist=process.argv[2]??'dist',offenders=[],warnings=[];
const TEXT=/\.(?:js|mjs|css|html?|xml|txt|json|svg|map|webmanifest|lst|htl|dat|sp|lnl|obs|pls)$/i;
const MARK=/⟦|\\u27e6|\\u\{27e6\}|&#x27e6;|&#10214;/i;
const files=[];
(function walk(dir){for(const name of readdirSync(dir)){const file=join(dir,name);
 if(statSync(file).isDirectory()){walk(file);continue;}
 if(/^pseudo-/.test(name))offenders.push(`${file}: pseudo-locale chunk`);
 if(TEXT.test(name))files.push({file,name,text:readFileSync(file,'utf8')});}})(dist);
for(const f of files)if(MARK.test(f.text))offenders.push(`${f.file}: contains the pseudo-locale mark ⟦`);
const gzip=(text)=>gzipSync(Buffer.from(text),{level:9}).length,kb=(n)=>(n/1000).toFixed(1);
const html=readFileSync(join(dist,'index.html'),'utf8');
const inAssets=(f)=>f.file.startsWith(join(dist,'assets'));

// Front ES-HELP: the Spanish help files (src/i18n/es/help, one chunk each, fetched only when the help viewer opens that file) are
// their own chunks: each is recognised by the SHA-256 of the VIREO original it records, must not be loaded or preloaded by
// index.html, and may share phrases with the catalog. All 38 must be present.
const helpIds=[...readFileSync(join(ROOT,'src','help','helpFiles.ts'),'utf8').matchAll(/^ '([^']+)':file\('[^']+','[^']+',\d+,'([0-9a-f]{64})'/gm)].map(m=>({key:m[1],sha:m[2]}));
// A help chunk is named after its module (CAMHLP.LST-<hash>.js) and holds the SHA-256 of that file's original (review N10: matched
// by the chunk's own name, since OBJXHLP.LST and TOOLSHLP.LST have byte-identical originals and so one SHA-256).
const HELP_CHUNK=/^([A-Za-z]+\.(?:LST|TXT|OBS|PLS|LNL))-[\w-]+\.js$/,helpChunks=new Map();
for(const f of files.filter(inAssets)){const m=HELP_CHUNK.exec(f.name),id=m&&helpIds.find(h=>h.key===m[1].toUpperCase());if(id&&f.text.includes(id.sha))helpChunks.set(f.name,f);}
for(const name of helpChunks.keys())if(html.includes(name))offenders.push(`index.html loads or preloads the Spanish help chunk ${name}`);
if(helpChunks.size!==helpIds.length)offenders.push(`expected ${helpIds.length} Spanish help chunks, found ${helpChunks.size}`);
const HELP_BUDGET={warn:25_000,fail:40_000};
for(const f of helpChunks.values()){const g=gzip(f.text);if(g>HELP_BUDGET.fail)offenders.push(`${f.name}: ${kb(g)} KB gzip is over the 40 KB budget of a help chunk`);else if(g>HELP_BUDGET.warn)warnings.push(`the help chunk ${f.name} is ${kb(g)} KB gzip, over 25 KB`);}
const helpGzip=[...helpChunks.values()].reduce((n,f)=>n+gzip(f.text),0),helpRaw=[...helpChunks.values()].reduce((n,f)=>n+Buffer.byteLength(f.text),0);

// The scripts index.html loads, and everything they import statically (a dynamic import(…) is not followed).
const assets=new Map(files.filter(f=>inAssets(f)&&/\.js$/.test(f.name)).map(f=>[f.name,f]));
const closure=new Set(),todo=[...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map(m=>m[1]);
while(todo.length){const name=todo.pop();if(closure.has(name)||!assets.has(name))continue;closure.add(name);
 for(const m of assets.get(name).text.matchAll(/(?:^|[;\s})])import\s*(?:[^"'`();]*?from\s*)?["']\.\/([^"']+\.js)["']/g))todo.push(m[1]);}
if(!closure.size)offenders.push('index.html loads no script under /assets/');

// Front ES1 review 1 and ES2: a minifier writes a string as "…", '…' or `…` (a template keeps real line feeds and writes CR as \r),
// so each marker is looked for in all three forms.
const quoted=(v)=>{const json=JSON.stringify(v).slice(1,-1);return [json,json.replace(/\\"/g,'"').replace(/'/g,"\\'"),v.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${').replace(/\r/g,'\\r')];};
const SPANISH_LETTERS=/[áéíóúñ¿¡ÁÉÍÓÚÑ]/;
// KB gzip at level 9, multiplied by the language's budgetFactor (docs/I18N.md).
const BUDGET={core:{warn:120_000,fail:150_000},module:{warn:60_000,fail:90_000},sum:{warn:300_000,fail:360_000}};
const en=JSON.parse(readFileSync(join(ROOT,'src','i18n','en.json'),'utf8')),graph=sourceGraph(ROOT),reports=[];
const escape=(s)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
for(const language of loadLanguages(ROOT)){
 const plan=planLanguage(language,ROOT,graph),tag=language.tag,factor=language.budgetFactor??1;
 if(plan.problems.length){offenders.push(...plan.problems.map(p=>`${tag} plan: ${p}`));continue;}
 // The texts of each module: its catalog values, the single-quoted literals of its map files and (core) the originals' values.
 const originals=Object.values(JSON.parse(readFileSync(join(ROOT,'src','i18n',language.dir,'originals.json'),'utf8')));
 const texts=new Map(plan.modules.map(m=>{
  const maps=[],sources=m.maps.map(id=>readFileSync(join(ROOT,plan.manifest[id].file),'utf8'));
  for(const source of sources)for(const x of source.matchAll(/'((?:[^'\\\n]|\\.)*)'/g))maps.push(x[1].replace(/\\'/g,"'"));
  return [m.name,{catalog:m.keys.map(k=>plan.catalog[k]),maps,originals:m.originals?originals:[],sources}];
 }));
 // Markers: catalog values that differ from English (16+ characters), map literals (12+) and originals (8+) with Spanish
 // letters. A marker of two modules is not used.
 const candidates=new Map(),add=(v,name)=>{if(!candidates.has(v))candidates.set(v,new Set());candidates.get(v).add(name);};
 for(const m of plan.modules){const t=texts.get(m.name);
  m.keys.forEach((k,i)=>{if(t.catalog[i]!==en[k]&&t.catalog[i].length>=16)add(t.catalog[i],m.name);});
  for(const v of t.maps)if(v.length>=12&&SPANISH_LETTERS.test(v))add(v,m.name);
  for(const v of t.originals)if(v.length>=8&&SPANISH_LETTERS.test(v))add(v,m.name);}
 const markers=new Map(plan.modules.map(m=>[m.name,[]]));
 for(const [v,owners] of candidates)if(owners.size===1)markers.get([...owners][0]).push({text:v,forms:quoted(v)});
 // Which files carry which module's markers (the help chunks may share phrases with the catalog, as ES-HELP recorded).
 const holders=new Map();
 for(const f of files){if(helpChunks.has(f.name))continue;
  const hits=new Map();for(const [name,list] of markers){const found=list.filter(m=>m.forms.some(form=>f.text.includes(form)));if(found.length)hits.set(name,found);}
  if(hits.size)holders.set(f,hits);}
 // Each module's markers are all in one JS chunk named after it.
 const chunkOf=new Map();
 for(const m of plan.modules){
  const list=markers.get(m.name);
  if(!list.length){offenders.push(`${tag} ${m.name}: no marker text to find its chunk`);continue;}
  const full=[...holders].filter(([,hits])=>hits.get(m.name)?.length===list.length).map(([f])=>f);
  if(full.length!==1||!/\.js$/.test(full[0].name)){offenders.push(`${tag} ${m.name}: expected one chunk holding all ${list.length} of its markers, found ${full.length}`);continue;}
  chunkOf.set(m.name,full[0]);
  if(!full[0].name.startsWith(`i18n-${tag}-${m.name.replace(/\+/g,'_')}-`))offenders.push(`${tag} ${m.name}: its chunk is named ${full[0].name}`);
 }
 // No language text elsewhere, and each chunk holds exactly one module: another module's marker may appear in a file only as part
 // of a longer text of that file's own module (a short sentence inside a long one).
 const languageFiles=new Set(chunkOf.values()),ownerOf=new Map([...chunkOf].map(([n,f])=>[f,n]));
 const joined=new Map([...texts].map(([name,t])=>[name,[...t.catalog,...t.sources,...t.originals].join('\n')]));
 for(const [f,hits] of holders){const own=ownerOf.get(f);
  for(const [name,found] of hits){if(name===own)continue;
   const stray=found.filter(m=>!(own&&joined.get(own).includes(m.text)));
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
  const allowed=new Set([core,...plan.modules.filter(m=>m.kind==='area'&&m.shared.includes(name)).map(m=>chunkOf.get(m.name))]);
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
 reports.push({tag,plan,sizes,sum});
}
for(const w of warnings)console.warn(`Warning: ${w}.`);
if(offenders.length){console.error(`The build carries development or misplaced language code:\n${offenders.join('\n')}`);process.exit(1);}
console.log(`Build is free of the pseudo-locale (${files.length} text files searched).`);
for(const {tag,plan,sizes,sum} of reports){
 console.log(`${tag}: ${sizes.size} chunks, ${kb(sum)} KB gzip in all; index.html loads none, and each holds one module's text only:`);
 for(const m of plan.modules){const s=sizes.get(m.name);console.log(`  ${m.name.padEnd(24)} ${kb(s.gzip).padStart(6)} KB gzip ${kb(s.raw).padStart(7)} KB raw  ${s.name}`);}
 console.log(`  extra download per route (its area and shared modules, on top of the core): ${plan.declared.map(a=>{const m=plan.modules.find(x=>x.name===a);return `${a} ${kb([a,...m.shared].reduce((n,x)=>n+sizes.get(x).gzip,0))}`;}).join(', ')} KB`);
}
console.log(`${helpChunks.size} Spanish help chunks (${kb(helpRaw)} KB raw, ${kb(helpGzip)} KB gzip in all) are fetched only by the help viewer.`);
