// Front A (review 1 L3): an ordinary build (VITE_OPENVIREO_CLOUD unset) must contain no optional-cloud code or files.
// Usage: node scripts/check-cloud-free-dist.mjs [distDir]   (default: dist)
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

const dist=process.argv[2]??'dist';
if(process.env.VITE_OPENVIREO_CLOUD==='1'){console.log('Cloud build: cloud-free check skipped.');process.exit(0);}
const markers=['X-OpenVireo-CSRF','/auth/signout-all','#signin='];
const offenders=[];
function walk(dir){
 for(const name of readdirSync(dir)){
  const file=join(dir,name);
  if(statSync(file).isDirectory()){walk(file);continue;}
  if(/^CloudAccount-/.test(name)){offenders.push(`${file}: cloud chunk`);continue;}
  if(!/\.(?:js|css|html)$/.test(name))continue;
  const text=readFileSync(file,'utf8');
  for(const marker of markers)if(text.includes(marker))offenders.push(`${file}: contains ${marker}`);
 }
}
walk(join(dist,'assets'));
if(offenders.length){console.error(`Ordinary build contains optional-cloud code:\n${offenders.join('\n')}`);process.exit(1);}
console.log('Ordinary build is free of optional-cloud code.');
