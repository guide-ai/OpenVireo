// Front LAUNCH-3 [W]: public/_redirects sends language addresses people type (/pt/, /en/, /es-419/) to the pages that exist.
// The rules are matched here as Cloudflare Pages matches them (a `*` is a greedy splat, `:splat` its text, anchored at both
// ends); tests/release/pages-smoke.pages.ts checks the real answers under `wrangler pages dev`.
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {SEO_LANGUAGES,pathOf,type PageKey} from './languages';
import {staticSeoFiles} from './pages';

type Rule=Readonly<{from:string;to:string;status:number}>;
const RULES:readonly Rule[]=readFileSync(new URL('../../public/_redirects',import.meta.url),'utf8').split('\n')
 .filter(l=>l.trim()&&!l.trimStart().startsWith('#')).map(l=>{
  const parts=l.trim().split(/\s+/);if(parts.length!==3)throw new Error(`bad line: ${l}`);
  return {from:parts[0],to:parts[1],status:Number(parts[2])};
 });
const pattern=(from:string,flags='')=>new RegExp(`^${from.split('*').map(s=>s.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')).join('(?<splat>.*)')}$`,flags);
/** Where a path is sent, or null: the first matching rule, as Pages applies them. */
function redirect(path:string):string|null{
 for(const r of RULES){const m=pattern(r.from).exec(path);if(m)return r.to.replace(':splat',m.groups?.splat??'');}
 return null;
}
const KEYS:readonly PageKey[]=['home','labs',...SEO_LANGUAGES[0].labs.map(l=>l.slug)];
const byTag=(tag:string)=>SEO_LANGUAGES.find(l=>l.tag===tag)!;
/** Every path the build serves as a page or file: the generated SEO pages and the public/ tree (top level names). */
const servedPaths=[...Object.keys(staticSeoFiles()).map(f=>`/${f.replace(/index\.html$/,'')}`),...SEO_LANGUAGES.flatMap(l=>KEYS.map(k=>pathOf(l,k)))];
const publicTop=readdirSync(new URL('../../public',import.meta.url)).map(n=>`/${n}`);

describe('public/_redirects',()=>{
 it('holds only 301s, one splat at most, within the Pages limits',()=>{
  expect(RULES.length).toBeGreaterThan(0);expect(RULES.length).toBeLessThanOrEqual(100);
  for(const r of RULES){expect(r.status,r.from).toBe(301);expect(r.from.split('*').length,r.from).toBeLessThanOrEqual(2);expect(r.from.startsWith('/')&&r.to.startsWith('/'),r.from).toBe(true);}
 });
 it('sends /pt, /en and /es-419 with any page path to the same page of Brazilian Portuguese, English and Spanish',()=>{
  for(const [alias,tag] of [['/pt','pt-BR'],['/en','en'],['/es-419','es-419']] as const){
   const language=byTag(tag);
   expect(redirect(alias),alias).toBe(pathOf(language,'home'));
   for(const key of KEYS){
    const page=pathOf(language,key),own=pathOf(byTag('en'),key);
    expect(redirect(alias+own),alias+own).toBe(page);
    // Without the trailing slash Pages adds it after the redirect (a lab page is a directory), so it still ends on the page.
    if(own!=='/')expect(redirect(alias+own.slice(0,-1)),alias+own).toBe(page.slice(0,-1));
   }
  }
  expect(redirect('/pt/labs/nope/')).toBe('/pt-br/labs/nope/');// an unknown page then answers 404 at its Portuguese address
 });
 it('never names a served path, even matched without regard to case, so no page is hidden and no redirect loops',()=>{
  for(const r of RULES){
   for(const path of [...servedPaths,...publicTop])expect(pattern(r.from,'i').test(path),`${r.from} matches ${path}`).toBe(false);
   expect(existsSync(new URL(`../../public${r.from.replace(/\/?\*$/,'')}`,import.meta.url)),r.from).toBe(false);
  }
  // The destinations themselves are not redirected again.
  for(const r of RULES)expect(redirect(r.to.replace(':splat','')),r.to).toBeNull();
 });
 it('leaves the languages\' own addresses alone',()=>{
  for(const path of servedPaths)expect(redirect(path),path).toBeNull();
  for(const path of ['/es','/fr','/pt-br','/pt-BR','/english','/ptx/','/labs/pt/','/original/pt/x'])expect(redirect(path),path).toBeNull();
 });
});
