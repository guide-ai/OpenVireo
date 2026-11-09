// Front ES0 (docs/I18N.md): which source files render each en.json key, so translation batches can be cut per component.
// Static `t('key')` calls first; keys built at run time (template or variable keys) are assigned by prefix to the files that
// use other keys with the same first segment. Usage: node scripts/i18n-areas.mjs [--json]
import {parseSync} from 'rolldown/utils';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const en=JSON.parse(readFileSync(path.join(root,'src/i18n/en.json'),'utf8'));
const files=new Map();// key -> Set(file)
function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);
 if(item.isDirectory()){if(item.name!=='i18n')scan(file);continue;}
 if(!/\.tsx?$/.test(file)||/\.test\.ts$/.test(file))continue;
 const relative=path.relative(root,file),text=readFileSync(file,'utf8'),result=parseSync(relative,text);
 (function walk(node){if(!node||typeof node!=='object')return;
  if(node.type==='Literal'&&typeof node.value==='string'&&Object.hasOwn(en,node.value)){if(!files.has(node.value))files.set(node.value,new Set());files.get(node.value).add(relative);}
  for(const[k,v]of Object.entries(node))if(!['loc','comments'].includes(k)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
 })(result.program);
}}
scan(path.join(root,'src'));
const byPrefix=new Map();for(const [key,set] of files){const p=key.split('.')[0];if(!byPrefix.has(p))byPrefix.set(p,new Set());for(const f of set)byPrefix.get(p).add(f);}
const out={},counts={static:0,prefix:0,unassigned:0};
for(const key of Object.keys(en)){
 if(files.has(key)){out[key]={via:'static',files:[...files.get(key)].sort()};counts.static++;continue;}
 const p=byPrefix.get(key.split('.')[0]);
 if(p){out[key]={via:'prefix',files:[...p].sort()};counts.prefix++;}else{out[key]={via:'unassigned',files:[]};counts.unassigned++;}
}
for(const v of Object.values(out))v.area=v.files.length===1?v.files[0]:v.files.length?'common':'unassigned';
if(process.argv.includes('--json'))console.log(JSON.stringify(out,null,1));
else{
 const areas=new Map();for(const v of Object.values(out))areas.set(v.area,(areas.get(v.area)??0)+1);
 console.log(`en.json keys: ${Object.keys(en).length} (static ${counts.static}, by prefix ${counts.prefix}, unassigned ${counts.unassigned})`);
 for(const [area,n] of [...areas].sort((a,b)=>b[1]-a[1]))console.log(`${String(n).padStart(5)}  ${area}`);
}
