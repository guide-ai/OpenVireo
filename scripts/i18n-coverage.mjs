// Front ES0/ES1 (docs/I18N.md): how much has Spanish, per area (the files that render each en.json key, scripts/i18n-areas.mjs),
// per key prefix, per pickMessages map and for VIREO's literals. Reads src/i18n/es/es.json, src/i18n/es/maps/<id>.ts and
// src/i18n/es/originals.json. Map leaves are counted by Vitest (src/i18n/es/es.test.ts checks the shell maps complete); here a
// map counts as started when its Spanish file exists. Usage: node scripts/i18n-coverage.mjs [--areas]
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {keyAreas,ROOT as root} from './i18n-areas.mjs';
const es=path.join(root,'src/i18n/es');
const json=(file,fallback)=>existsSync(file)?JSON.parse(readFileSync(file,'utf8')):fallback;
const en=json(path.join(root,'src/i18n/en.json'),{}),spanish=json(path.join(es,'es.json'),{}),originals=json(path.join(es,'originals.json'),{});
const pct=(done,total)=>total?`${(100*done/total).toFixed(1)} %`:'—';
const done=Object.keys(en).filter(k=>typeof spanish[k]==='string').length;
console.log(`en.json: ${done}/${Object.keys(en).length} keys (${pct(done,Object.keys(en).length)})`);
const areas=new Map();for(const [key,v] of Object.entries(keyAreas(root))){const row=areas.get(v.area)??{total:0,done:0};row.total++;if(typeof spanish[key]==='string')row.done++;areas.set(v.area,row);}
console.log('Per area (the file that renders the key, or common):');
const rows=[...areas].sort((a,b)=>b[1].done/b[1].total-a[1].done/a[1].total||b[1].total-a[1].total);
for(const [area,r] of process.argv.includes('--areas')?rows:rows.filter(([,r])=>r.done>0||r.total>=40))console.log(`  ${area.padEnd(52)} ${String(r.done).padStart(4)}/${String(r.total).padEnd(4)} ${pct(r.done,r.total)}`);
const prefixes=new Map();for(const key of Object.keys(en)){const p=key.split('.')[0],row=prefixes.get(p)??{total:0,done:0};row.total++;if(typeof spanish[key]==='string')row.done++;prefixes.set(p,row);}
console.log('Per key prefix (started ones):');
for(const [p,r] of [...prefixes].sort((a,b)=>b[1].total-a[1].total))if(r.done)console.log(`  ${p.padEnd(28)} ${String(r.done).padStart(4)}/${String(r.total).padEnd(4)} ${pct(r.done,r.total)}`);
const ids=[];(function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){if(item.name!=='node_modules')scan(file);continue;}
 if(/\.ts$/.test(item.name)&&!/\.test\.ts$/.test(item.name)&&!file.includes(`${path.sep}i18n${path.sep}`))for(const m of readFileSync(file,'utf8').matchAll(/pickMessages\('([\w-]+)'/g))ids.push(m[1]);}})(path.join(root,'src'));
const started=ids.filter(id=>existsSync(path.join(es,'maps',`${id}.ts`)));
console.log(`*Messages.ts maps: ${started.length}/${ids.length} started (${pct(started.length,ids.length)}); started: ${started.sort().join(', ')}`);
const receipts=json(path.join(root,'src/i18n/vireo-literals.json'),[]),pending=receipts.filter(r=>r.reason.startsWith('pending-translation')).reduce((n,r)=>n+r.count,0);
console.log(`VIREO originals: ${Object.keys(originals).length} translated; ${pending} render sites or module literals still pending (src/i18n/vireo-literals.json)`);
