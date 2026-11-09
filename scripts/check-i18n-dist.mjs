// Front ES0 (docs/I18N.md): the dev-only pseudo-locale (src/i18n/pseudo.ts, ?lang=qps) must not reach the production build.
// Every text file under dist/ (the app, the lab pages, the sitemap, the original text resources) is searched for the
// pseudo-locale mark ⟦ in any form: the character itself, a ⟦ escape (any case) or an HTML character reference.
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
if(offenders.length){console.error(`The build carries development language code:\n${offenders.join('\n')}`);process.exit(1);}
console.log(`Build is free of the pseudo-locale (${scanned} text files searched).`);
