// Front ES0 (docs/I18N.md): the dev-only pseudo-locale (src/i18n/pseudo.ts, ?lang=qps) must not reach the production build.
// Every text file under dist/ (the app, the lab pages, the sitemap, the original text resources) is searched for the
// pseudo-locale mark ⟦ in any form: the character itself, a ⟦ escape (any case) or an HTML character reference.
// Front ES1: the Spanish catalog's and maps' text appears in exactly one chunk, which index.html does not load or preload.
// Usage: node scripts/check-i18n-dist.mjs [distDir]   (default: dist)
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
const dist=process.argv[2]??'dist',offenders=[];
const TEXT=/\.(?:js|mjs|css|html?|xml|txt|json|svg|map|webmanifest|lst|htl|dat|sp|lnl|obs|pls)$/i;
const MARK=/⟦|\\u27e6|\\u\{27e6\}|&#x27e6;|&#10214;/i;
let scanned=0;
function walk(dir){
 for(const name of readdirSync(dir)){
  const file=join(dir,name);
  if(statSync(file).isDirectory()){walk(file);continue;}
  if(/^pseudo-/.test(name))offenders.push(`${file}: pseudo-locale chunk`);
  if(!TEXT.test(name))continue;
  scanned++;if(MARK.test(readFileSync(file,'utf8')))offenders.push(`${file}: contains the pseudo-locale mark ⟦`);
 }
}
walk(dist);
// Front ES1: Spanish lives only in its own chunk (src/i18n/es/index.ts), which index.html neither loads nor preloads; every other
// file is free of the Spanish catalog's text, so English visitors never download Spanish.
const spanish=JSON.parse(readFileSync(join(import.meta.dirname,'..','src','i18n','es','es.json'),'utf8')),english=JSON.parse(readFileSync(join(import.meta.dirname,'..','src','i18n','en.json'),'utf8'));
const SPANISH_LETTERS=/[áéíóúñ¿¡ÁÉÍÓÚÑ]/;
// The catalog's own strings, and (ES1 review 1) the Spanish map and originals texts: the single-quoted literals of
// src/i18n/es/maps/*.ts and the values of originals.json that carry Spanish letters.
const mapsDir=join(import.meta.dirname,'..','src','i18n','es','maps'),mapTexts=[];
for(const name of readdirSync(mapsDir))for(const m of readFileSync(join(mapsDir,name),'utf8').matchAll(/'((?:[^'\\\n]|\\.)*)'/g)){const text=m[1].replace(/\\'/g,"'");if(text.length>=12&&SPANISH_LETTERS.test(text))mapTexts.push(text);}
const originals=JSON.parse(readFileSync(join(import.meta.dirname,'..','src','i18n','es','originals.json'),'utf8'));
for(const v of Object.values(originals))if(v.length>=8&&SPANISH_LETTERS.test(v))mapTexts.push(v);
// Front ES2: a minifier writes a string as "…", '…' or `…` (a template keeps real line feeds and writes CR as \r), so each
// marker is looked for in all three forms.
const quoted=(v)=>{const json=JSON.stringify(v).slice(1,-1);return [json,json.replace(/\\"/g,'"').replace(/'/g,"\\'"),v.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${').replace(/\r/g,'\\r')];};
const markers=[...new Set([...Object.entries(spanish).filter(([k,v])=>v!==english[k]&&v.length>=16).map(([,v])=>v),...mapTexts])].map(quoted);
const html=readFileSync(join(dist,'index.html'),'utf8'),spanishFiles=[];
(function scan(dir){for(const name of readdirSync(dir)){const file=join(dir,name);if(statSync(file).isDirectory()){scan(file);continue;}
 if(!TEXT.test(name))continue;const text=readFileSync(file,'utf8'),hits=markers.filter(forms=>forms.some(m=>text.includes(m))).length;if(hits)spanishFiles.push({file,name,hits});}})(dist);
// Front ES-HELP: the Spanish help files (src/i18n/es/help, one chunk each, fetched only when the help viewer opens that file) are
// their own chunks: each is recognised by the SHA-256 of the VIREO original it records, must not be loaded or preloaded by
// index.html, and may share phrases with the catalog. All 38 must be present.
const helpIds=[...readFileSync(join(import.meta.dirname,'..','src','help','helpFiles.ts'),'utf8').matchAll(/^ '([^']+)':file\('[^']+','[^']+',\d+,'([0-9a-f]{64})'/gm)].map(m=>({key:m[1],sha:m[2]}));
// A help chunk is named after its module (CAMHLP.LST-<hash>.js) and holds the SHA-256 of that file's original (review N10: matched
// by the chunk's own name, since OBJXHLP.LST and TOOLSHLP.LST have byte-identical originals and so one SHA-256).
const HELP_CHUNK=/^([A-Za-z]+\.(?:LST|TXT|OBS|PLS|LNL))-[\w-]+\.js$/,helpChunks=new Map(),helpAll=[];
(function w(dir){for(const n of readdirSync(dir)){const q=join(dir,n);if(statSync(q).isDirectory()){w(q);continue;}
 const m=HELP_CHUNK.exec(n),id=m&&helpIds.find(h=>h.key===m[1].toUpperCase());
 if(id&&readFileSync(q,'utf8').includes(id.sha)){helpChunks.set(n,id.key);helpAll.push(q);}}})(join(dist,'assets'));
for(const name of helpChunks.keys())if(html.includes(name))offenders.push(`index.html loads or preloads the Spanish help chunk ${name}`);
if(helpAll.length!==helpIds.length)offenders.push(`expected ${helpIds.length} Spanish help chunks, found ${helpAll.length}`);
const helpGzip=helpAll.reduce((n,q)=>n+gzipSync(readFileSync(q),{level:9}).length,0),helpRaw=helpAll.reduce((n,q)=>n+statSync(q).size,0);
const bundle=spanishFiles.filter(f=>/\.js$/.test(f.name)&&f.hits===markers.length&&!helpChunks.has(f.name));
if(bundle.length!==1)offenders.push(`expected one Spanish chunk holding the whole catalog, found ${bundle.length}`);
for(const f of spanishFiles)if(!bundle.includes(f)&&!helpChunks.has(f.name))offenders.push(`${f.file}: Spanish text outside the Spanish chunk (${f.hits} strings)`);
for(const f of bundle)if(html.includes(f.name))offenders.push(`index.html loads or preloads the Spanish chunk ${f.name}`);
// ES2 review 1: a size budget for the Spanish chunk (a Spanish load waits for it before the first render). Above 150 KB gzip
// it warns; above 250 KB gzip it fails. Whether to split it per area is decided at ES5, from measured first-render times on a
// throttled connection (docs/I18N.md).
const BUDGET={warn:150_000,fail:250_000};
const sizes=bundle.map(f=>({name:f.name,gzip:gzipSync(readFileSync(f.file),{level:9}).length}));
for(const f of sizes){
 if(f.gzip>BUDGET.fail)offenders.push(`${f.name}: ${(f.gzip/1000).toFixed(1)} KB gzip is over the 250 KB budget for the Spanish chunk`);
 else if(f.gzip>BUDGET.warn)console.warn(`Warning: the Spanish chunk ${f.name} is ${(f.gzip/1000).toFixed(1)} KB gzip, over 150 KB (split decided at ES5).`);
}
if(offenders.length){console.error(`The build carries development language code:\n${offenders.join('\n')}`);process.exit(1);}
console.log(`Build is free of the pseudo-locale (${scanned} text files searched); Spanish is only in ${sizes.map(f=>`${f.name} (${(f.gzip/1000).toFixed(1)} KB gzip)`).join(', ')}, which index.html does not load; ${helpAll.length} Spanish help chunks (${(helpRaw/1000).toFixed(1)} KB raw, ${(helpGzip/1000).toFixed(1)} KB gzip in all) are fetched only by the help viewer.`);
