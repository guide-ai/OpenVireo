// Front SEO: the static lab pages, the sitemap and the home page's extra tags are built from one list (src/seo/labs.ts).
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {LABS,SITE_URL,labFromHash,labUrl} from './labs';
import {SITEMAP_PATHS,homeBoot,homeHead,labPage,labsIndexPage,sitemap,staticSeoFiles} from './pages';
import {documentMessages} from '../i18n/html';

const attr=(html:string,re:RegExp)=>re.exec(html)?.[1];
const ld=(html:string)=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));

describe('lab overview pages',()=>{
 it('cover the seven student exercises once each, with unique slugs, titles and descriptions',()=>{
  expect(LABS.map(l=>l.exercise)).toEqual(['E01','E02','E03','E04','E05','E06','E08']);
  for(const key of ['slug','title','description','heading'] as const)expect(new Set(LABS.map(l=>l[key])).size).toBe(LABS.length);
 });
 it('keep titles and descriptions within what search results show',()=>{
  for(const l of LABS){expect(l.title.length).toBeLessThanOrEqual(70);expect(l.description.length).toBeGreaterThanOrEqual(110);expect(l.description.length).toBeLessThanOrEqual(160);}
 });
 it('each page has its own title, description, canonical address, one h1, the lab link and valid JSON-LD',()=>{
  for(const l of LABS){
   const html=labPage(l);
   expect(attr(html,/<title>([^<]*)<\/title>/)).toBe(l.title.replaceAll('&','&amp;'));
   expect(attr(html,/<link rel="canonical" href="([^"]*)"/)).toBe(`${SITE_URL}/labs/${l.slug}/`);
   expect(attr(html,/<meta property="og:url" content="([^"]*)"/)).toBe(`${SITE_URL}/labs/${l.slug}/`);
   expect(html.match(/<h1>/g)).toHaveLength(1);
   expect(html).toContain(`href="/#lab=${l.slug}"`);
   expect(html).toContain('It is not the original program');
   const [data]=ld(html);expect(data['@graph'][0]).toMatchObject({'@type':'LearningResource',url:`${SITE_URL}/labs/${l.slug}/`,isAccessibleForFree:true});
   // No runnable script and no inline style: the site's CSP (script-src/style-src without 'unsafe-inline') covers the page.
   expect(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'')).not.toMatch(/<script|style=|<style/);
  }
 });
 it('escape text and keep JSON-LD from closing its element',()=>{
  const html=labPage({...LABS[0],intro:'a < b & "c"',learn:['</script><x>']});
  expect(html).toContain('a &lt; b &amp; &quot;c&quot;');
  expect(html).not.toContain('</script><x>');expect(ld(html)[0]['@graph'][0].teaches).toEqual(['</script><x>']);
 });
 it('the index lists every lab page',()=>{
  const html=labsIndexPage();for(const l of LABS)expect(html).toContain(`href="${labUrl(l.slug)}"`);
 });
});

describe('#lab= links',()=>{
 it('name a known lab exactly',()=>{
  for(const l of LABS)expect(labFromHash(`#lab=${l.slug}`)).toBe(l.slug);
  for(const h of ['','#lab=','#lab=nope','#lab=hubble/x','#observatory','lab=hubble','#LAB=hubble'])expect(labFromHash(h)).toBeNull();
 });
});

describe('sitemap and files',()=>{
 it('lists the home page, the index and each lab page as absolute addresses',()=>{
  const xml=sitemap(),locs=[...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m=>m[1]);
  expect(locs).toEqual(SITEMAP_PATHS.map(p=>SITE_URL+p));expect(locs).toHaveLength(2+LABS.length);
 });
 it('every sitemap page except the home page is an emitted file',()=>{
  const files=staticSeoFiles();
  for(const p of SITEMAP_PATHS.slice(1))expect(files[`${p.slice(1)}index.html`]).toBeDefined();
  expect(files['sitemap.xml']).toBe(sitemap());
 });
 it('robots.txt points to the sitemap',()=>{
  expect(readFileSync(new URL('../../public/robots.txt',import.meta.url),'utf8')).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
 });
});

describe('index.html',()=>{
 const served=documentMessages(readFileSync(new URL('../../index.html',import.meta.url),'utf8'));
 it('carries the canonical, preview and icon tags and the WebApplication JSON-LD',()=>{
  expect(served).toContain(`<link rel="canonical" href="${SITE_URL}/"/>`);
  expect(served).toContain('<meta property="og:image" content="https://openvireo.space/og-image.png"/>');
  expect(served).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>');
  expect(ld(served)[0]).toMatchObject({'@type':'WebApplication',url:`${SITE_URL}/`,isAccessibleForFree:true});
  expect(served).not.toContain('OPENVIREO_SEO');
 });
 it('shows crawlable text and links to every lab inside #root until the app starts',()=>{
  const root=/<div id="root">([\s\S]*?)<\/div><script/.exec(served)![1];
  for(const l of LABS)expect(root).toContain(`href="${labUrl(l.slug)}"`);
  expect(homeBoot('x')).toContain('<h1>OpenVireo</h1>');expect(homeHead('t','d')).toContain('og:title" content="t"');
 });
 it('the icons and preview image it names exist',()=>{
  for(const f of ['favicon.svg','apple-touch-icon.png','og-image.png'])expect(readFileSync(new URL(`../../public/${f}`,import.meta.url)).length).toBeGreaterThan(100);
  const png=readFileSync(new URL('../../public/og-image.png',import.meta.url));
  expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([1200,630]);
 });
});
