// Front REL1 [W]: public/_headers (Cloudflare Pages) must match what the code needs: the inline scripts of index.html and the
// print <style> elements by hash, the live VizieR hosts, and cache rules that never combine with each other.
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {VIZIER_POLICY} from './core/vizierNomad';
import {printPageSizeCss} from './core/lightCurvePrint';
import {documentMessages} from './i18n/html';

const text=(p:string)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
/** Pages _headers: a rule is an unindented URL line followed by indented "Name: value" lines; # starts a comment. */
function rules(source:string){
 const out:{path:string;headers:[string,string][]}[]=[];
 for(const line of source.split('\n')){
  if(!line.trim()||line.trimStart().startsWith('#'))continue;
  if(!/^\s/.test(line)){out.push({path:line.trim(),headers:[]});continue;}
  const m=/^\s+([A-Za-z-]+):\s*(.+)$/.exec(line);if(!m||!out.length)throw new Error(`bad line: ${line}`);
  out.at(-1)!.headers.push([m[1],m[2].trim()]);
 }
 return out;
}
const all=rules(text('public/_headers'));
const header=(path:string,name:string)=>all.find(r=>r.path===path)?.headers.find(([n])=>n.toLowerCase()===name.toLowerCase())?.[1];
const csp=header('/*','Content-Security-Policy')!;
const directive=(name:string)=>csp.split(';').map(d=>d.trim().split(/\s+/)).find(d=>d[0]===name)?.slice(1)??null;
const sha=(s:string)=>`'sha256-${createHash('sha256').update(s,'utf8').digest('base64')}'`;

describe('public/_headers for the static release',()=>{
 it('stays within the Pages limits (100 rules, 2000 characters a line)',()=>{
  expect(all.length).toBeLessThanOrEqual(100);
  for(const line of text('public/_headers').split('\n'))expect(line.length).toBeLessThanOrEqual(2000);
 });
 it('allows each inline script of index.html by its hash, and nothing inline otherwise',()=>{
  // JSON-LD blocks (Front SEO) are data that browsers never run, so CSP does not apply to them; only runnable scripts count.
  const inline=[...documentMessages(text('index.html')).matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  expect(inline.length).toBeGreaterThan(0);
  // Exactly these hashes: one per inline script, none left over from an earlier version.
  expect(directive('script-src')!.filter(x=>x.startsWith("'sha256-")).sort()).toEqual([...new Set(inline.map(sha))].sort());
  for(const d of ['script-src','style-src'])expect(directive(d)).not.toContain("'unsafe-inline'");
  expect(directive('script-src')).not.toContain("'unsafe-eval'");
 });
 it('allows the print-preview <style> elements by hash',()=>{
  expect(directive('style-src')!.filter(x=>x.startsWith("'sha256-")).sort()).toEqual((['portrait','landscape'] as const).map(o=>sha(printPageSizeCss(o))).sort());
 });
 it('lets the live camera query reach exactly the hosts it tries, plus the analytics beacon',()=>{
  const connect=directive('connect-src')!;
  expect(connect.filter(s=>s.startsWith('https://')).sort()).toEqual([...VIZIER_POLICY.liveHosts.map(h=>`https://${h}`),'https://cloudflareinsights.com'].sort());
  expect(directive('script-src')).toContain('https://static.cloudflareinsights.com');
  expect([directive('default-src'),directive('frame-ancestors'),directive('base-uri')]).toEqual([["'none'"],["'none'"],["'none'"]]);
 });
 it('sets the other security headers once, for every path',()=>{
  expect(header('/*','X-Content-Type-Options')).toBe('nosniff');
  expect(header('/*','Referrer-Policy')).toBe('same-origin');
  expect(header('/*','Permissions-Policy')).toMatch(/camera=\(\).*geolocation=\(\).*microphone=\(\)/);
 });
 it('caches hashed bundles for a year, byte-exact data for a day, and revalidates the page',()=>{
  expect(header('/*','Cache-Control')).toBeUndefined();// rules combine: a Cache-Control here would merge into every path
  expect(header('/assets/*','Cache-Control')).toBe('public, max-age=31536000, immutable');
  for(const p of ['/original/*','/camera/*'])expect(header(p,'Cache-Control')).toBe('public, max-age=86400, stale-while-revalidate=604800');
  for(const p of ['/','/index.html','/labs/*','/es/*','/pt-br/*','/fr/*','/sitemap.xml','/robots.txt'])expect(header(p,'Cache-Control')).toBe('no-cache');
 });
 it('labels as text only plain-ASCII originals, with one Content-Type rule a path (Front LAUNCH-3)',()=>{
  // Pages matches a rule as an anchored pattern whose `*` is a greedy splat; a header set by two matching rules is joined
  // with a comma, so no file may meet two Content-Type rules.
  const typed=all.filter(r=>r.headers.some(([n])=>n.toLowerCase()==='content-type'));
  const pattern=(path:string)=>new RegExp(`^${path.split('*').map(s=>s.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')).join('.*')}$`);
  const root=new URL('../public/',import.meta.url),files:string[]=[];
  (function walk(dir:string){for(const e of readdirSync(new URL(dir,root),{withFileTypes:true}))e.isDirectory()?walk(`${dir}${e.name}/`):files.push(`${dir}${e.name}`);})('');
  const labelled=files.filter(f=>{
   const hits=typed.filter(r=>pattern(r.path).test(`/${f}`));expect(hits.length,f).toBeLessThanOrEqual(1);
   if(hits.length)expect(hits[0].headers.find(([n])=>n.toLowerCase()==='content-type')![1],f).toBe('text/plain; charset=utf-8');
   return hits.length===1;
  });
  for(const f of labelled){
   // Printable ASCII, tab, CR and LF; a DOS end-of-file byte (0x1A) may close the file. Then utf-8 is a true charset.
   const bytes=readFileSync(new URL(f,root)),body=bytes.at(-1)===0x1a?bytes.subarray(0,-1):bytes;
   expect(body.every(b=>b===9||b===10||b===13||(b>=32&&b<127)),f).toBe(true);
  }
  // Every template, list, line list and the pulsar catalog is reached, and the binary originals are not.
  expect(labelled.sort()).toEqual(files.filter(f=>f.startsWith('original/')&&(/\.(SP|SPI|LST|LNL|obs)$/.test(f)||f==='original/radio/Pulsars.dat')).sort());
  expect(labelled.length).toBeGreaterThan(190);
  for(const f of ['original/orbit/ObjX_MPC.CMO.sav','original/catalogs/CLEA_GLX.DAT','original/variables/CLEA_VStrs.dat','original/hotlists/Hubble.HTL','original/gsc/N0000/000.bin'])expect(labelled,f).not.toContain(f);
 });
});
