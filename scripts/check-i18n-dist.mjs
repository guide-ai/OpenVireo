// Front ES0 (docs/I18N.md): the dev-only pseudo-locale (src/i18n/pseudo.ts, ?lang=qps) must not reach the production build.
// Usage: node scripts/check-i18n-dist.mjs [distDir]   (default: dist)
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const dist=process.argv[2]??'dist',offenders=[];
function walk(dir){
 for(const name of readdirSync(dir)){
  const file=join(dir,name);
  if(statSync(file).isDirectory()){walk(file);continue;}
  if(/^pseudo-/.test(name))offenders.push(`${file}: pseudo-locale chunk`);
  if(!/\.(?:js|css|html|xml|txt|json)$/.test(name))continue;
  if(readFileSync(file,'utf8').includes('⟦'))offenders.push(`${file}: contains the pseudo-locale mark ⟦`);
 }
}
walk(join(dist,'assets'));
for(const name of readdirSync(dist))if(/\.(?:html|xml|txt)$/.test(name)&&readFileSync(join(dist,name),'utf8').includes('⟦'))offenders.push(`${join(dist,name)}: contains ⟦`);
if(offenders.length){console.error(`The build carries development language code:\n${offenders.join('\n')}`);process.exit(1);}
console.log('Build is free of the pseudo-locale.');
