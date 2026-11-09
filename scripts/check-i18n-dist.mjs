// Front ES0 (docs/I18N.md): the dev-only pseudo-locale (src/i18n/pseudo.ts, ?lang=qps) must not reach the production build.
// Every text file under dist/ (the app, the lab pages, the sitemap, the original text resources) is searched for the
// pseudo-locale mark ⟦ in any form: the character itself, a ⟦ escape (any case) or an HTML character reference.
// Front ES1: the Spanish catalog's and maps' text appears in exactly one chunk, which index.html does not load or preload.
// Usage: node scripts/check-i18n-dist.mjs [distDir]   (default: dist)
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
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
const markers=[...new Set([...Object.entries(spanish).filter(([k,v])=>v!==english[k]&&v.length>=16).map(([,v])=>v),...mapTexts])].map(v=>JSON.stringify(v).slice(1,-1));
const html=readFileSync(join(dist,'index.html'),'utf8'),spanishFiles=[];
(function scan(dir){for(const name of readdirSync(dir)){const file=join(dir,name);if(statSync(file).isDirectory()){scan(file);continue;}
 if(!TEXT.test(name))continue;const text=readFileSync(file,'utf8'),hits=markers.filter(m=>text.includes(m)).length;if(hits)spanishFiles.push({file,name,hits});}})(dist);
const bundle=spanishFiles.filter(f=>/\.js$/.test(f.name)&&f.hits===markers.length);
if(bundle.length!==1)offenders.push(`expected one Spanish chunk holding the whole catalog, found ${bundle.length}`);
for(const f of spanishFiles)if(!bundle.includes(f))offenders.push(`${f.file}: Spanish text outside the Spanish chunk (${f.hits} strings)`);
for(const f of bundle)if(html.includes(f.name))offenders.push(`index.html loads or preloads the Spanish chunk ${f.name}`);
if(offenders.length){console.error(`The build carries development language code:\n${offenders.join('\n')}`);process.exit(1);}
console.log(`Build is free of the pseudo-locale (${scanned} text files searched); Spanish is only in ${bundle.map(f=>f.name).join(', ')}, which index.html does not load.`);
