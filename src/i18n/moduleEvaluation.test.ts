import {describe,expect,it,vi} from 'vitest';
import {readdirSync} from 'node:fs';
import path from 'node:path';
// Front ES1 (docs/I18N.md, option c): a Spanish load evaluates every app module before its chunk is active, so no module may
// read text (t, a pickMessages string, a translator) when it evaluates. Each source module is imported fresh with no language
// settled; the tripwire (src/i18n/active.ts) throws on any such read. Modules that need a browser to evaluate fail for other
// reasons and are not counted here; the Spanish Playwright specs run the dev tripwire on the whole page.
const src=path.resolve(import.meta.dirname,'..');
const modules:string[]=[];
(function scan(dir:string){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()){if(e.name!=='cloud')scan(f);}else if(/\.tsx?$/.test(e.name)&&!/\.test\.ts$|\.d\.ts$|[wW]orker/.test(e.name))modules.push(f);}})(src);
describe('Front ES1: no module reads text when it evaluates',()=>{
 it('imports every source module before the language is settled without a text read',async()=>{
  const key=Symbol.for('openvireo.i18n.active'),global=globalThis as Record<symbol,unknown>,kept=global[key],reads:string[]=[];
  try{
   for(const file of modules){
    delete global[key];vi.resetModules();
    try{await import(file);}catch(error){const stack=String((error as Error).stack??error);if(/before src\/boot\.ts/.test(stack))reads.push(`${path.relative(src,file)}: ${stack.split('\n').filter(l=>/\/src\/(?!i18n\/)/.test(l))[0]?.trim()??''}`);}
   }
  }finally{global[key]=kept;vi.resetModules();}
  expect(modules.length).toBeGreaterThan(500);expect(reads).toEqual([]);
 },120_000);
});
