import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll,describe,expect,it} from 'vitest';
// @ts-expect-error Build script (plain JS), as in distCheck.test.ts.
import {checkI18nDist} from '../../scripts/check-i18n-dist.mjs';
// @ts-expect-error Build script (plain JS).
import {sourceGraph} from '../../scripts/i18n-split.mjs';
import {PSEUDO_SCRIPT} from './pseudoScripts';

// Front ES0 and Front RTL-1 review (docs/I18N.md): scripts/check-i18n-dist.mjs fails a build that carries a dev-only pseudo-locale,
// by its mark ⟦ or by one of its names (qps-cjk, qps-deva, qps-cyrl, qps-rtl, or any later qps-*), while the production code's own
// generic tests (`startsWith('qps-')`, `/^qps(?:-|$)/i`) stay allowed. The dist/ here is synthetic and has no language.
const root=path.resolve(import.meta.dirname,'../..'),graph=sourceGraph(root),scratch=mkdtempSync(path.join(tmpdir(),'openvireo-pseudo-dist-'));
afterAll(()=>rmSync(scratch,{recursive:true,force:true}));
let serial=0;
const check=(entry:string,files:Record<string,string>={})=>{
 const out=path.join(scratch,`dist-${serial++}`),assets=path.join(out,'assets');mkdirSync(assets,{recursive:true});
 writeFileSync(path.join(assets,'index-AAAAAAAA.js'),entry);
 for(const [name,text] of Object.entries(files)){mkdirSync(path.dirname(path.join(out,name)),{recursive:true});writeFileSync(path.join(out,name),text);}
 writeFileSync(path.join(out,'index.html'),'<!doctype html><script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script>');
 return (checkI18nDist(out,{root,languages:[],graph}) as {offenders:string[]}).offenders.map(o=>o.slice(out.length+1));
};

describe('scripts/check-i18n-dist.mjs: no dev-only pseudo-locale in the build',()=>{
 it('accepts the production code\'s generic pseudo-locale tests',()=>{
  expect(check(`const p=t=>t==="qps"||t.startsWith("qps-"),q=t=>/^qps(?:-|$)/i.test(t);export{p,q};`)).toEqual([]);
 });
 it('fails each pseudo-locale name, in any quoting and in any text file, and the mark ⟦',()=>{
  const names=Object.keys(PSEUDO_SCRIPT);expect(names).toEqual(['qps-cjk','qps-deva','qps-cyrl','qps-rtl']);
  for(const name of [...names,'qps-xyz'])for(const text of [`const l="${name}";`,`const l='${name}';`,'const l=`'+name+'`;',`location.search="?lang=${name}";`])
   expect(check(text),text).toEqual([`assets${path.sep}index-AAAAAAAA.js: names the dev-only pseudo-locale ${name}`]);
  expect(check('const n=1;',{'labs/index.html':'<a href="/?lang=qps-rtl">x</a>'})).toEqual([`labs${path.sep}index.html: names the dev-only pseudo-locale qps-rtl`]);
  // A chunk hash that holds qps- is no name: it follows the chunk's name or another hash character.
  expect(check('import("./area-qps-abcd.js");import("./area-Aqps-bcd.js");import("./area-B_qps-cd.js");')).toEqual([]);
  expect(check('const m="⟦x⟧";')).toEqual([`assets${path.sep}index-AAAAAAAA.js: contains the pseudo-locale mark ⟦`]);
 });
});
