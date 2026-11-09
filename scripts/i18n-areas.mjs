// Front ES0/ES1 (docs/I18N.md): which source files render each en.json key, so translation batches can be cut per component.
// Static `t('key')` uses first (with their lines); keys built at run time (template or variable keys) are assigned by prefix to
// the files that use other keys with the same first segment. A key used in one file belongs to that file's area; in two or more,
// to "common". Usage: node scripts/i18n-areas.mjs [--json]
import {parseSync} from 'rolldown/utils';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export const ROOT=path.resolve(import.meta.dirname,'..');
export function keyAreas(root=ROOT){
 const en=JSON.parse(readFileSync(path.join(root,'src/i18n/en.json'),'utf8'));
 const uses=new Map();// key -> [file:line]
 (function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);
  if(item.isDirectory()){if(item.name!=='i18n')scan(file);continue;}
  if(!/\.tsx?$/.test(file)||/\.test\.ts$/.test(file))continue;
  const relative=path.relative(root,file),text=readFileSync(file,'utf8'),result=parseSync(relative,text);
  (function walk(node){if(!node||typeof node!=='object')return;
   if(node.type==='Literal'&&typeof node.value==='string'&&Object.hasOwn(en,node.value)){if(!uses.has(node.value))uses.set(node.value,[]);uses.get(node.value).push(`${relative}:${text.slice(0,node.start).split('\n').length}`);}
   for(const[k,v]of Object.entries(node))if(!['loc','comments'].includes(k)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
  })(result.program);
 }})(path.join(root,'src'));
 const fileOf=(use)=>use.replace(/:\d+$/,'');
 const byPrefix=new Map();for(const [key,list] of uses){const p=key.split('.')[0];if(!byPrefix.has(p))byPrefix.set(p,new Set());for(const u of list)byPrefix.get(p).add(fileOf(u));}
 const out={};
 for(const key of Object.keys(en)){
  if(uses.has(key)){const files=[...new Set(uses.get(key).map(fileOf))].sort();out[key]={via:'static',files,usedIn:uses.get(key)};}
  else{const p=byPrefix.get(key.split('.')[0]);out[key]=p?{via:'prefix',files:[...p].sort(),usedIn:[]}:{via:'unassigned',files:[],usedIn:[]};}
  out[key].area=out[key].files.length===1?out[key].files[0]:out[key].files.length?'common':'unassigned';
 }
 return out;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
 const out=keyAreas();
 if(process.argv.includes('--json'))console.log(JSON.stringify(out,null,1));
 else{
  const counts={static:0,prefix:0,unassigned:0},areas=new Map();for(const v of Object.values(out)){counts[v.via]++;areas.set(v.area,(areas.get(v.area)??0)+1);}
  console.log(`en.json keys: ${Object.keys(out).length} (static ${counts.static}, by prefix ${counts.prefix}, unassigned ${counts.unassigned})`);
  for(const [area,n] of [...areas].sort((a,b)=>b[1]-a[1]))console.log(`${String(n).padStart(5)}  ${area}`);
 }
}
