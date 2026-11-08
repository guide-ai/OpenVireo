// Front REL1 [W]: public/_headers (Cloudflare Pages) must match what the code needs: the inline scripts of index.html and the
// print <style> elements by hash, the live VizieR hosts, and cache rules that never combine with each other.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {VIZIER_POLICY} from './core/vizierNomad';
import {printPageSizeCss} from './core/lightCurvePrint';

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
  const inline=[...text('index.html').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  expect(inline.length).toBeGreaterThan(0);
  for(const s of inline)expect(directive('script-src')).toContain(sha(s));
  for(const d of ['script-src','style-src'])expect(directive(d)).not.toContain("'unsafe-inline'");
  expect(directive('script-src')).not.toContain("'unsafe-eval'");
 });
 it('allows the print-preview <style> elements by hash',()=>{
  for(const o of ['portrait','landscape'] as const)expect(directive('style-src')).toContain(sha(printPageSizeCss(o)));
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
  for(const p of ['/','/index.html'])expect(header(p,'Cache-Control')).toBe('no-cache');
 });
});
