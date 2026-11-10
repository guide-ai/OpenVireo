// Front ES1 (docs/I18N.md; plan §5.2–5.3): the translation batch pipeline for en.json.
//   node scripts/i18n-batch.mjs extract --area <file or key prefix>[,…] [--limit 250] [--out batch.json]
//     Writes the untranslated keys of that area (scripts/i18n-areas.mjs: the files that render each key, or a key prefix such
//     as `sky.`) as {about, items:[{id, en, params, usedIn:[file:line], kind:'catalog', maxLengthHint}]}, grouped by component
//     so a dialog is translated in one sitting. The translator (an agent) reads the usedIn sites, the glossary
//     (src/i18n/es/glossary.json) and the style in its `about`, and fills `es` in each item.
//   node scripts/i18n-batch.mjs merge batch.json
//     Checks every item (a known key, a non-empty string, the same {params} as the English) and writes the values into
//     src/i18n/es/es.json in en.json's order. Then run `npx vitest run src/i18n/es` (parity, glossary lint, identical text,
//     ¿ ¡ pairing, glyphs, no HTML, length ratios) and hand the batch to the independent reviewer agent.
// Maps (src/i18n/es/maps/<id>.ts) are typed TypeScript and are translated by hand against their English map.
// Front SC8: `--lang <tag>` (default es-419) works on any registered language (src/i18n/languages.json): its catalog and
// glossary in src/i18n/<dir>/. A Spanish batch keeps its `es` field; another language's items carry `target`.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {keyAreas,ROOT as root} from './i18n-areas.mjs';
import {languageDir,loadLanguages} from './i18n-split.mjs';
const read=(f)=>JSON.parse(readFileSync(f,'utf8'));
const params=(s)=>[...new Set([...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))].sort();
const [command,...rest]=process.argv.slice(2);
const option=(name,fallback)=>{const i=rest.indexOf(`--${name}`);return i>=0?rest[i+1]:fallback;};
function fail(message){console.error(message);process.exit(1);}
const tag=option('lang','es-419'),language=loadLanguages(root).find(l=>l.tag===tag)??fail(`${tag} is not in src/i18n/languages.json`);
const dir=path.join(root,languageDir(language)),esFile=path.join(dir,language.catalog),field=tag==='es-419'?'es':'target';
const catalogName=path.relative(root,esFile);
if(command==='extract'){
 const wanted=(option('area','')||fail('extract needs --area <file or key prefix>[,…]')).split(',').map(s=>s.trim()).filter(Boolean);
 const limit=Number(option('limit','250')),en=read(path.join(root,'src/i18n/en.json')),es=read(esFile),areas=keyAreas(root);
 const matches=(key)=>wanted.some(w=>key.startsWith(w)||areas[key].files.some(f=>f.includes(w)));
 const keys=Object.keys(en).filter(k=>!Object.hasOwn(es,k)&&matches(k)).sort((a,b)=>(areas[a].files[0]??'').localeCompare(areas[b].files[0]??'')||a.localeCompare(b)).slice(0,limit);
 const glossary=existsSync(path.join(dir,'glossary.json'))?read(path.join(dir,'glossary.json')):{about:''};
 const batch={about:`${language.englishName} (${tag}) batch for ${wanted.join(', ')}. ${glossary.about} Fill "${field}" in every item; keep {params} exactly; do not translate file names, catalogue identifiers, units or VIREO names that the glossary keeps.`,
  items:keys.map(id=>({id,en:en[id],params:params(en[id]),usedIn:areas[id].usedIn.length?areas[id].usedIn:areas[id].files,kind:'catalog',maxLengthHint:Math.ceil(en[id].length*1.35),[field]:''}))};
 const out=option('out',null),text=JSON.stringify(batch,null,1)+'\n';
 if(out)writeFileSync(out,text);else process.stdout.write(text);
 console.error(`${keys.length} untranslated key(s) extracted.`);
}else if(command==='merge'){
 const file=rest.find(a=>!a.startsWith('--')&&a!==tag)??fail('merge needs a batch file'),batch=read(file),en=read(path.join(root,'src/i18n/en.json')),es=read(esFile),problems=[];
 for(const item of batch.items??[]){
  if(!Object.hasOwn(en,item.id))problems.push(`${item.id}: not an en.json key`);
  else if(typeof item[field]!=='string'||!item[field].trim())problems.push(`${item.id}: no ${language.englishName}`);
  else if(params(item[field]).join('|')!==params(en[item.id]).join('|'))problems.push(`${item.id}: {params} differ`);
 }
 if(problems.length)fail(`Nothing merged:\n${problems.join('\n')}`);
 for(const item of batch.items)es[item.id]=item[field];
 const ordered=Object.fromEntries(Object.keys(en).filter(k=>Object.hasOwn(es,k)).map(k=>[k,es[k]]));
 writeFileSync(esFile,JSON.stringify(ordered,null,1)+'\n');
 console.log(`${batch.items.length} item(s) merged into ${catalogName}. Next: npx vitest run ${path.relative(root,dir)}, then the reviewer agent.`);
}else fail('Usage: node scripts/i18n-batch.mjs extract --area <file or key prefix>[,…] [--limit 250] [--out batch.json] [--lang <tag>] | merge batch.json [--lang <tag>]');
