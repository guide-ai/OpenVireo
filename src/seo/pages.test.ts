// Front SEO: the static lab pages, the sitemap and the home page's extra tags are built from one list (src/seo/labs.ts).
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {LABS,LAB_SLUGS,SITE_URL,labFromHash,labUrl} from './labs';
import en from '../i18n/en.json' with {type:'json'};
import es from '../i18n/es/es.json' with {type:'json'};
import pt from '../i18n/pt-br/pt-br.json' with {type:'json'};
import {OBJECT_X_LAB_EN} from '../objectx/ObjectXMessages';
import {POLISH_MESSAGES} from '../polish/PolishMessages';
import {HOME_LAB_KEYS,LABS_INDEX_DESCRIPTION,SITEMAP_PATHS,homeBoot,homeHead,labPage,labsIndexPage,sitemap,staticSeoFiles} from './pages';
import {documentMessages} from '../i18n/html';

const attr=(html:string,re:RegExp)=>re.exec(html)?.[1];
const ld=(html:string)=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));

describe('lab overview pages',()=>{
 it('cover the seven student exercises once each, with unique slugs, titles and descriptions',()=>{
  expect(LABS.map(l=>l.exercise)).toEqual(['E01','E02','E03','E04','E05','E06','E08']);
  for(const key of ['slug','title','description','heading'] as const)expect(new Set(LABS.map(l=>l[key])).size).toBe(LABS.length);
 });
 it('keep titles and descriptions within what search results show',()=>{
  for(const l of LABS){expect(l.title.length).toBeLessThanOrEqual(65);expect(l.description.length).toBeGreaterThanOrEqual(110);expect(l.description.length).toBeLessThanOrEqual(160);}
  expect(LABS_INDEX_DESCRIPTION.length).toBeLessThanOrEqual(160);expect(en['app.description'].length).toBeLessThanOrEqual(160);
 });
 it('say in every search snippet that the site is a reconstruction, never an official or equivalent CLEA product (review 1 m2)',()=>{
  for(const l of LABS)expect(l.description).toContain('free web reconstruction of');
  expect(en['app.description']).toMatch(/^Unofficial free web reconstruction/);expect(LABS_INDEX_DESCRIPTION).toContain('rebuilt');
  for(const text of [...LABS.map(l=>l.description),LABS_INDEX_DESCRIPTION,en['app.description']])expect(text).not.toMatch(/web version|official CLEA|any computer|in any browser/i);
 });
 it("use the slug list the app reads, and name each guide as the app's Guides menu does",()=>{
  expect(LABS.map(l=>l.slug)).toEqual([...LAB_SLUGS]);
  const menu:Record<string,string>={hubble:en['lab.nav'],'large-scale-structure':en['lssLab.nav'],'stellar-classification':en['classLab.nav'],pleiades:en['pleiadesLab.nav'],'cluster-hr':POLISH_MESSAGES.clusterGuide.nav,pulsars:en['pulsarLab.nav'],'object-x':OBJECT_X_LAB_EN.guideNav};
  for(const l of LABS)expect(l.guide).toBe(menu[l.slug]);
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
 it('lists the home page, the index and each lab page as absolute addresses, in English, Spanish (ES-SEO) and then Brazilian Portuguese (PT-SEO)',()=>{
  const xml=sitemap(),locs=[...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m=>m[1]);
  expect(locs).toEqual(SITEMAP_PATHS.map(p=>SITE_URL+p));expect(locs).toHaveLength(3*(2+LABS.length));
  expect(SITEMAP_PATHS.slice(0,2+LABS.length)).toEqual(['/','/labs/',...LABS.map(l=>labUrl(l.slug))]);
 });
 it('every sitemap page except the English home page (the app) is an emitted file, and every emitted page is in the sitemap',()=>{
  const files=staticSeoFiles();
  for(const p of SITEMAP_PATHS.slice(1))expect(files[`${p.slice(1)}index.html`],p).toBeDefined();
  expect(Object.keys(files).filter(f=>f.endsWith('.html')).map(f=>`/${f.replace(/index\.html$/,'')}`).sort()).toEqual([...SITEMAP_PATHS.slice(1)].sort());
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
  const graph=ld(served)[0]['@graph'];
  expect(graph[0]).toMatchObject({'@type':'WebApplication',url:`${SITE_URL}/`,isAccessibleForFree:true});
  expect(graph[0].isBasedOn.funder.map((f:{name:string})=>f.name)).toEqual(['National Science Foundation','Gettysburg College']);
  expect(graph[1]).toEqual({'@type':'WebSite',name:'OpenVireo',url:`${SITE_URL}/`});
  expect(served).not.toContain('OPENVIREO_SEO');
 });
 it('shows crawlable text and links to every lab inside #root until the app starts',()=>{
  const root=/<div id="root">([\s\S]*?)<\/div><script/.exec(served)![1];
  for(const l of LABS)expect(root).toContain(`href="${labUrl(l.slug)}"`);
  expect(homeBoot(en)).toContain(`<h1>${en['home.title']}</h1>`);expect(root).not.toMatch(/style=|<style|<script/);expect(homeHead('t','d')).toContain('og:title" content="t"');
 });
 it('the icons and preview image it names exist',()=>{
  for(const f of ['favicon.svg','favicon.ico','apple-touch-icon.png','og-image.png'])expect(readFileSync(new URL(`../../public/${f}`,import.meta.url)).length).toBeGreaterThan(100);
  const png=readFileSync(new URL('../../public/og-image.png',import.meta.url));
  expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([1200,630]);
 });
});

// Front HOME: the pre-render mirrors the observatory's welcome (src/home/Welcome.tsx) in English, from the same catalog keys.
describe('home pre-render (Front HOME)',()=>{
 const boot=homeBoot(en);
 it('says what the site is: the welcome h1, lead and three facts, once each',()=>{
  expect(boot.match(/<h1>/g)).toHaveLength(1);
  for(const key of ['home.title','home.lead','home.factInstall','home.factFree','home.factFaithful','home.labsHeading'] as const)expect(boot).toContain(en[key]);
  expect(en['home.factInstall']).toMatch(/no Windows and no virtual machine/);expect(en['home.factInstall']).toMatch(/Mac, Windows, Linux or a Chromebook/);
  expect(en['home.factFaithful']).toMatch(/^An unofficial reconstruction/);
  // Front HOME review 1 (finding 5, SEO review m2): the h1 or the lead says it is unofficial in every language, and the h1 is
  // never just the third party's product name.
  for(const [lang,m,word] of [['en',en,/unofficial/],['es-419',es,/no oficial/],['pt-BR',pt,/não oficial/]] as const){
   expect(`${m['home.title']} ${m['home.lead']}`,lang).toMatch(word);expect(m['home.title'],lang).toMatch(/rebuilt|reconstruíd|reconstruid/);}
  expect(en['home.lead']).toMatch(/^OpenVireo is an unofficial web reconstruction of VIREO/);
 });
 it('lists the seven labs with their one-line summaries, each linking to its /labs/ page in the /labs/ order',()=>{
  const links=[...boot.matchAll(/<li><a href="([^"]+)">([^<]+)<\/a>: ([^<]+)<\/li>/g)];
  expect(links.map(m=>m[1])).toEqual(LABS.map(l=>labUrl(l.slug)));
  expect(Object.keys(HOME_LAB_KEYS)).toEqual([...LAB_SLUGS]);
  links.forEach((m,i)=>{const k=HOME_LAB_KEYS[LABS[i].slug] as keyof typeof en;expect(m[2]).toBe(en[k]);expect(m[3]).toBe(en[`${k}Summary` as keyof typeof en]);
   expect(en[`${k}Summary` as keyof typeof en].length).toBeLessThanOrEqual(120);});
  expect(en['home.objectXSummary']).toMatch(/star.*galaxy.*quasar.*pulsar.*asteroid/);
 });
 it('is plain escaped HTML with no inline style or script, and never claims to be CLEA\'s',()=>{
  expect(boot).not.toMatch(/style=|<style|<script|on[a-z]+=/);
  const evil=homeBoot({...en,'home.title':'<b>"x" & y</b>'});
  expect(evil).toContain('<h1>&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;</h1>');
  expect(()=>homeBoot({})).toThrow(/home\.eyebrow/);
  const text=Object.entries(en).filter(([k])=>k.startsWith('home.')).map(([,v])=>v).join(' ');
  expect(text).not.toMatch(/official CLEA|endorsed|equivalent|student|teacher|class(room)?\b|homework/i);
 });
 it('sends every static page\'s Open the observatory link to the exploration page, not to the welcome (review 1 finding 4)',()=>{
  const files=staticSeoFiles(),pages=Object.entries(files).filter(([f])=>f.endsWith('.html'));
  expect(pages.length).toBeGreaterThan(10);
  for(const [f,html] of pages){
   const opens=[...html.matchAll(/<a class="(?:open|button)" href="([^"]+)">/g)].map(m=>m[1]).filter(h=>!h.includes('#lab='));
   expect(opens.length,f).toBeGreaterThan(0);
   for(const h of opens)expect(h,f).toMatch(/^\/(\?lang=[a-zA-Z0-9-]+)?#observatory$/);
  }
 });
});
