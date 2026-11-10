// Front ES-SEO: the per-language table of the static search pages (src/seo/languages.ts), the Spanish pages under /es/, and the
// hreflang alternates that join every page with its translations (user decision 8 of 2026-11-09, AGENTS.md).
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {LABS,SITE_URL,labUrl,labsIndexUrl,SEO_PATH_PREFIX} from './labs';
import {ENGLISH,SEO_LANGUAGES,pathOf,type PageKey,type SeoLanguage} from './languages';
import {alternates,labPage,labsIndexPage,languageHomePage,sitemap,staticSeoFiles} from './pages';
import {documentMessages} from '../i18n/html';
import en from '../i18n/en.json' with {type:'json'};
import es from '../i18n/es/es.json' with {type:'json'};
import glossary from '../i18n/es/glossary.json' with {type:'json'};
import originals from '../i18n/es/originals.json' with {type:'json'};
import uiLanguages from '../i18n/languages.json' with {type:'json'};

const SPANISH=SEO_LANGUAGES.find(l=>l.tag==='es-419')!;
const attr=(html:string,re:RegExp)=>re.exec(html)?.[1];
const attrs=(html:string,re:RegExp)=>[...html.matchAll(re)].map(m=>m[1]);
const ld=(html:string)=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
const files=staticSeoFiles();
/** Every page: the emitted static pages and index.html as Vite serves it, by site path. */
const PAGES:Record<string,string>={'/':documentMessages(readFileSync(new URL('../../index.html',import.meta.url),'utf8')),
 ...Object.fromEntries(Object.entries(files).filter(([f])=>f.endsWith('.html')).map(([f,html])=>[`/${f.replace(/index\.html$/,'')}`,html]))};
const KEYS:readonly PageKey[]=['home','labs',...LABS.map(l=>l.slug)];
const hreflangs=(html:string)=>[...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map(m=>[m[1],m[2]]);

describe('the language table',()=>{
 it('has English first (the x-default, whose home page is the app) and one row per language with its own path prefix',()=>{
  expect(SEO_LANGUAGES[0]).toBe(ENGLISH);expect(ENGLISH).toMatchObject({tag:'en',prefix:'',app:'/',home:null});
  expect(new Set(SEO_LANGUAGES.map(l=>l.tag)).size).toBe(SEO_LANGUAGES.length);
  expect(Object.keys(SEO_PATH_PREFIX)).toEqual(SEO_LANGUAGES.map(l=>l.tag));
  for(const l of SEO_LANGUAGES.slice(1)){
   expect(l.prefix).toBe(SEO_PATH_PREFIX[l.tag]);expect(l.prefix).toMatch(/^\/[a-z-]+$/);
   // A language gets search pages only once the app speaks it (src/i18n/languages.json; front SC8's registry may replace it).
   expect(uiLanguages.map(u=>u.tag)).toContain(l.tag);
   // hreflang: ISO 639-1 language, optional ISO 3166-1 alpha-2 region (Google's format; es-419's UN M.49 region is not one), same language as the tag.
   for(const h of l.hreflang){expect(h).toMatch(/^[a-z]{2}(?:-[A-Z]{2})?$/);expect(h.slice(0,2)).toBe(l.tag.slice(0,2));}
   expect(l.app).toBe(`/?lang=${l.tag}`);expect(l.home).not.toBeNull();
  }
 });
 it('gives every language the seven labs with the English slugs, exercise codes and number of steps',()=>{
  for(const l of SEO_LANGUAGES){
   expect(l.labs.map(x=>[x.slug,x.exercise])).toEqual(LABS.map(x=>[x.slug,x.exercise]));
   l.labs.forEach((x,i)=>{expect(x.steps).toHaveLength(LABS[i].steps.length);expect(x.learn).toHaveLength(LABS[i].learn.length);});
  }
 });
 it('names the pages of each language under its prefix; the app links a language without pages to the English ones',()=>{
  expect(KEYS.map(k=>pathOf(SPANISH,k))).toEqual(['/es/','/es/labs/',...LABS.map(l=>`/es/labs/${l.slug}/`)]);
  expect(KEYS.slice(1).map(k=>pathOf(ENGLISH,k))).toEqual(['/labs/',...LABS.map(l=>labUrl(l.slug))]);
  expect([labsIndexUrl(),labsIndexUrl('en'),labsIndexUrl('es-419'),labsIndexUrl('qps'),labsIndexUrl('pt-BR')]).toEqual(['/labs/','/labs/','/es/labs/','/labs/','/labs/']);
  expect(labUrl('pulsars','es-419')).toBe('/es/labs/pulsars/');
 });
 it("each language's preview image exists, is 1200×630 and is its own",()=>{
  expect(new Set(SEO_LANGUAGES.map(l=>l.ogImage)).size).toBe(SEO_LANGUAGES.length);
  for(const l of SEO_LANGUAGES){
   const png=readFileSync(new URL(`../../public${l.ogImage}`,import.meta.url));
   expect([png.readUInt32BE(16),png.readUInt32BE(20)],l.tag).toEqual([1200,630]);
  }
 });
});

describe('Spanish texts (es-419)',()=>{
 const pairs=():{id:string;en:string;es:string}[]=>{
  const out:{id:string;en:string;es:string}[]=[];
  LABS.forEach((e,i)=>{const s=SPANISH.labs[i];
   for(const k of ['name','title','description','heading','intro'] as const)out.push({id:`${e.slug}.${k}`,en:e[k],es:s[k]});
   e.steps.forEach((t,j)=>out.push({id:`${e.slug}.steps.${j}`,en:t,es:s.steps[j]}));
   e.learn.forEach((t,j)=>out.push({id:`${e.slug}.learn.${j}`,en:t,es:s.learn[j]}));
  });
  for(const [k,v] of Object.entries(ENGLISH.ui))if(typeof v==='string')out.push({id:`ui.${k}`,en:v,es:SPANISH.ui[k as keyof SeoLanguage['ui']] as string});
  for(const [k,v] of Object.entries(ENGLISH.labsIndex))out.push({id:`labsIndex.${k}`,en:v,es:SPANISH.labsIndex[k as keyof SeoLanguage['labsIndex']]});
  out.push({id:'ogImageAlt',en:ENGLISH.ogImageAlt,es:SPANISH.ogImageAlt},{id:'ogImageText.title',en:ENGLISH.ogImageText.title,es:SPANISH.ogImageText.title});
  ENGLISH.ogImageText.lines.forEach((t,j)=>out.push({id:`ogImageText.lines.${j}`,en:t,es:SPANISH.ogImageText.lines[j]}));
  return out;
 };
 /** Every Spanish string of the pages, with or without an English counterpart. */
 const spanish=()=>[...pairs().map(p=>p.es),SPANISH.ui.openLabNote('hubble'),...Object.values(SPANISH.home!).flat()];
 it('keep titles and descriptions within what search results show, unique, and say the site is a free web reconstruction',()=>{
  const pages=[...SPANISH.labs,SPANISH.labsIndex,SPANISH.home!];
  for(const p of pages){expect(p.title.length,p.title).toBeLessThanOrEqual(65);expect(p.title).toMatch(/ · OpenVireo$|^OpenVireo: /);
   expect(p.description.length,p.description).toBeGreaterThanOrEqual(110);expect(p.description.length,p.description).toBeLessThanOrEqual(160);}
  for(const l of SPANISH.labs)expect(l.description).toContain('Reconstrucción web gratuita');
  expect(SPANISH.home!.description).toMatch(/^Reconstrucción web gratuita y no oficial/);
  for(const key of ['title','description','heading','name'] as const)expect(new Set([...SPANISH.labs,...LABS].map(l=>l[key])).size).toBe(2*LABS.length);
 });
 it('follow the es-419 glossary (src/i18n/es/glossary.json): required terms, fixed names, no forbidden or Spain-only forms',()=>{
  const word=(w:string)=>new RegExp(`(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`,'iu');
  const problems:string[]=[];
  for(const p of pairs()){
   // "star cluster" is «cúmulo estelar» (the plan's glossary table, §5.1), so it does not also need «estrella».
   for(const term of glossary.terms)if(new RegExp(term.en,'i').test(term.es==='estrella'?p.en.replace(/\bstar clusters?\b/gi,'cluster'):p.en)&&!new RegExp(term.es,'iu').test(p.es))problems.push(`${p.id}: "${term.en}" needs «${term.es}»`);
   for(const name of glossary.names as {en:string;es:string;exact?:boolean}[])if((name.exact?p.en===name.en:p.en.includes(name.en))&&!p.es.toLowerCase().includes(name.es.toLowerCase()))problems.push(`${p.id}: "${name.en}" must read «${name.es}»`);
  }
  for(const text of spanish())for(const f of glossary.forbidden as {words?:string[];es?:string;use:string}[]){
   if(f.words){for(const w of f.words)if(word(w).test(text))problems.push(`«${w}» in «${text}», use ${f.use}`);}
   else if(new RegExp(f.es!,'iu').test(text))problems.push(`/${f.es}/ in «${text}», use ${f.use}`);
  }
  expect(problems).toEqual([]);
 });
 it('never present the translation as CLEA\'s and say it is OpenVireo\'s web adaptation',()=>{
  for(const text of spanish())expect(text).not.toMatch(/versión (?:oficial|web) de CLEA|traducción (?:oficial|de CLEA)|programa oficial/i);
  expect(SPANISH.ui.about).toContain('Este texto en español es una adaptación web hecha por OpenVireo, no un texto de CLEA.');
  expect(SPANISH.ui.about).toContain('No es el programa original ni está afiliado a Project CLEA.');
 });
 it('keep Spanish app text out of the English static pages (scripts/check-i18n-dist.mjs)',()=>{
  // The dist check (front SC8's) counts as text of a Spanish chunk any catalog value of 16+ characters that differs from English,
  // any single-quoted literal of 12+ characters with a letter outside ASCII in a Spanish map file, and any such original of 8+.
  // Since SC8, an .html file under the language's own `pagePath` (`es/`) may carry it, so the Spanish pages use the app's own lab
  // names; every other page must not. This mirrors the rule so a collision fails here first, naming the text (docs/I18N.md,
  // "Spanish: search pages").
  const outside=/(?![\x00-\x7f])\p{L}/u,maps=import.meta.glob('../i18n/es/maps/*.ts',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
  const markers=[
   ...Object.entries(es).filter(([k,v])=>v!==(en as Record<string,string>)[k]&&v.length>=16).map(([,v])=>v),
   ...Object.values(maps).flatMap(src=>[...src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map(m=>m[1].replace(/\\'/g,"'"))).filter(v=>v.length>=12&&outside.test(v)),
   ...Object.values(originals).filter(v=>v.length>=8&&outside.test(v)),
  ];
  expect(markers.length).toBeGreaterThan(1000);
  const found=Object.entries(PAGES).filter(([p])=>!p.startsWith('/es/')).flatMap(([p,html])=>markers.filter(m=>html.includes(m)).map(m=>`${p}: ${m}`));
  expect([...new Set(found)]).toEqual([]);
 });
});

describe('Spanish pages',()=>{
 it('are in Spanish, canonical to themselves, with Spanish previews, one h1, valid JSON-LD and no runnable script or inline style',()=>{
  for(const key of KEYS){
   const path=pathOf(SPANISH,key),html=PAGES[path];
   expect(html,path).toMatch(/^<!doctype html>\n<html lang="es-419"><head>/);
   expect(attr(html,/<link rel="canonical" href="([^"]*)"/)).toBe(SITE_URL+path);
   expect(attr(html,/<meta property="og:url" content="([^"]*)"/)).toBe(SITE_URL+path);
   expect(attr(html,/<meta property="og:locale" content="([^"]*)"/)).toBe('es_LA');
   expect(attrs(html,/<meta property="og:locale:alternate" content="([^"]*)"/g)).toEqual(['en_US']);
   expect(attr(html,/<meta property="og:image" content="([^"]*)"/)).toBe(`${SITE_URL}/og-image-es.png`);
   expect(html.match(/<h1>/g)).toHaveLength(1);
   expect(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'')).not.toMatch(/<script|style=|<style/);
   const graph=ld(html)[0]['@graph'];
   if(key==='labs')expect(graph[0].itemListElement.map((i:{url:string})=>i.url)).toEqual(LABS.map(l=>`${SITE_URL}/es/labs/${l.slug}/`));
   else{expect(graph[0].inLanguage).toBe('es-419');expect(graph[0].url).toBe(SITE_URL+path);}
   // Every link stays on the Spanish pages or opens the app in Spanish, except the one link to the English version.
   const links=attrs(html,/<a [^>]*href="([^"]*)"/g),english=attrs(html,/<a href="([^"]*)" hreflang="en" lang="en">English<\/a>/g);
   expect(english).toEqual([key==='home'?'/?lang=en':pathOf(ENGLISH,key)]);
   for(const href of links.filter(h=>!english.includes(h)))expect(href,`${path} → ${href}`).toMatch(/^\/es\/|^\/\?lang=es-419(?:#lab=[a-z-]+|#observatory)?$/);
  }
 });
 it("a lab page's Abrir la práctica opens the app in Spanish with that lab's guide; its JSON-LD is a Spanish LearningResource",()=>{
  for(const lab of SPANISH.labs){
   const html=labPage(lab,SPANISH);
   expect(html).toContain(`<a class="button" href="/?lang=es-419#lab=${lab.slug}">Abrir la práctica</a>`);
   expect(html).toContain(`<h1>${lab.heading}</h1>`);
   const [data]=ld(html);expect(data['@graph'][0]).toMatchObject({'@type':'LearningResource',name:lab.heading,learningResourceType:'Práctica interactiva',teaches:[...lab.learn]});
   expect(data['@graph'][1].itemListElement.map((i:{item:string})=>i.item)).toEqual([`${SITE_URL}/es/`,`${SITE_URL}/es/labs/`,`${SITE_URL}/es/labs/${lab.slug}/`]);
  }
 });
 it('/es/ is a static Spanish home page that opens the app in Spanish and lists every Spanish lab page',()=>{
  const html=languageHomePage(SPANISH);expect(PAGES['/es/']).toBe(html);
  expect(attr(html,/<title>([^<]*)<\/title>/)).toBe(SPANISH.home!.title);
  expect(html).toContain('<a class="button" href="/?lang=es-419#observatory">Abrir el observatorio</a>');// Front HOME review 1: the exploration page
  for(const l of LABS)expect(html).toContain(`href="/es/labs/${l.slug}/"`);
  expect(ld(html)[0]['@graph'][0]).toMatchObject({'@type':'WebApplication',url:`${SITE_URL}/es/`,inLanguage:'es-419',isAccessibleForFree:true});
  expect(()=>languageHomePage(ENGLISH)).toThrow();
  expect(labsIndexPage(SPANISH)).toBe(PAGES['/es/labs/']);
 });
 it('English pages link their Spanish version, named in Spanish, and keep their own English links',()=>{
  for(const key of KEYS.slice(1)){
   const html=PAGES[pathOf(ENGLISH,key)];
   expect(html).toMatch(/^<!doctype html>\n<html lang="en"><head>/);
   expect(attrs(html,/<a href="([^"]*)" hreflang="es-419" lang="es-419">Español<\/a>/g)).toEqual([pathOf(SPANISH,key)]);
   expect(attr(html,/<meta property="og:locale" content="([^"]*)"/)).toBe('en_US');
   expect(attr(html,/<meta property="og:image" content="([^"]*)"/)).toBe(`${SITE_URL}/og-image.png`);
  }
 });
});

describe('hreflang',()=>{
 it('every page names itself and each translation, with x-default on the English page, and the translations name it back',()=>{
  for(const key of KEYS){
   const expected=alternates(key);
   expect(expected).toEqual([['en',SITE_URL+pathOf(ENGLISH,key)],['es',SITE_URL+pathOf(SPANISH,key)],['x-default',SITE_URL+pathOf(ENGLISH,key)]]);
   for(const l of SEO_LANGUAGES){const html=PAGES[pathOf(l,key)];expect(hreflangs(html),pathOf(l,key)).toEqual(expected);}
  }
  expect(Object.keys(PAGES)).toHaveLength(SEO_LANGUAGES.length*KEYS.length);
 });
 it('the sitemap carries the same alternates for each address (xhtml:link)',()=>{
  const xml=sitemap();expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  const urls=[...xml.matchAll(/<url><loc>([^<]*)<\/loc>(.*?)<\/url>/g)];expect(urls).toHaveLength(SEO_LANGUAGES.length*KEYS.length);
  for(const [,loc,links] of urls){
   const path=loc.slice(SITE_URL.length),own=hreflangs(PAGES[path]);
   expect([...links.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map(m=>[m[1],m[2]]),path).toEqual(own);
  }
 });
});
