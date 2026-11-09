// Front ES0 (docs/I18N.md): how much has Spanish, per en.json key prefix, per pickMessages map and for VIREO's literals.
// Reads src/i18n/es/es.json, src/i18n/es/maps/<id>.ts and src/i18n/es/originals.json when they exist (from ES1; 0 % in ES0).
// Usage: node scripts/i18n-coverage.mjs
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),es=path.join(root,'src/i18n/es');
const json=(file,fallback)=>existsSync(file)?JSON.parse(readFileSync(file,'utf8')):fallback;
const en=json(path.join(root,'src/i18n/en.json'),{}),spanish=json(path.join(es,'es.json'),{}),originals=json(path.join(es,'originals.json'),{});
const prefixes=new Map();for(const key of Object.keys(en)){const p=key.split('.')[0],row=prefixes.get(p)??{total:0,done:0};row.total++;if(typeof spanish[key]==='string')row.done++;prefixes.set(p,row);}
const pct=(done,total)=>total?`${(100*done/total).toFixed(1)} %`:'—';
let done=0;for(const r of prefixes.values())done+=r.done;
console.log(`en.json: ${done}/${Object.keys(en).length} keys (${pct(done,Object.keys(en).length)})`);
for(const [p,r] of [...prefixes].sort((a,b)=>b[1].total-a[1].total))if(r.done<r.total)console.log(`  ${p.padEnd(28)} ${String(r.done).padStart(4)}/${String(r.total).padEnd(4)} ${pct(r.done,r.total)}`);
// Map ids are the first argument of pickMessages('id', …) in the *Messages.ts files.
const ids=[];(function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){if(item.name!=='node_modules')scan(file);continue;}
 if(/Messages\.ts$/.test(item.name))for(const m of readFileSync(file,'utf8').matchAll(/pickMessages\('([\w-]+)'/g))ids.push(m[1]);}})(path.join(root,'src'));
const mapsDone=ids.filter(id=>existsSync(path.join(es,'maps',`${id}.ts`)));
console.log(`*Messages.ts maps: ${mapsDone.length}/${ids.length} (${pct(mapsDone.length,ids.length)})${ids.length>mapsDone.length?`; missing: ${ids.filter(id=>!mapsDone.includes(id)).sort().join(', ')}`:''}`);
const receipts=json(path.join(root,'src/i18n/vireo-literals.json'),[]),pending=receipts.filter(r=>r.reason.startsWith('pending-translation')).reduce((n,r)=>n+r.count,0);
console.log(`VIREO originals: ${Object.keys(originals).length} translated; ${pending} render sites or module literals still pending (src/i18n/vireo-literals.json)`);
