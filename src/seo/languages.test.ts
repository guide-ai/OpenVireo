// Front ES-SEO: the per-language table of the static search pages (src/seo/languages.ts), the translated pages under their
// prefixes, and the hreflang alternates that join every page with its translations (user decision 8 of 2026-11-09, AGENTS.md).
// Front PT-SEO: the Spanish checks generalised per language (Brazilian Portuguese under /pt-br/): the texts through each
// language's lint profile and glossary, the dist-marker guard for every language, and the expected alternates.
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {LABS,SITE_URL,labUrl,labsIndexUrl,SEO_PATH_PREFIX} from './labs';
import {ENGLISH,SEO_LANGUAGES,pathOf,type PageKey,type SeoLanguage} from './languages';
import {alternates,labPage,labsIndexPage,languageHomePage,sitemap,staticSeoFiles} from './pages';
import {documentMessages} from '../i18n/html';
import en from '../i18n/en.json' with {type:'json'};
import esGlossary from '../i18n/es/glossary.json' with {type:'json'};
import ptGlossary from '../i18n/pt-br/glossary.json' with {type:'json'};
import {OBJECT_X_LAB_ES} from '../i18n/es/maps/objectXLab';
import {LANGUAGES,languageEntry} from '../i18n/languages';
import {PROFILES,type ProfileId} from '../i18n/lint/profiles';
import {claim,describeFindings,digits,glossary,glossaryFrom,html,invisible,markPairs,normalization,placeholders,quotes,register,typography,type Finding,type Glossary,type LocaleProfile,type Pair} from '../i18n/lint/rules';

const TRANSLATED=SEO_LANGUAGES.slice(1);
const SPANISH=SEO_LANGUAGES.find(l=>l.tag==='es-419')!,PORTUGUESE=SEO_LANGUAGES.find(l=>l.tag==='pt-BR')!;
const attr=(html:string,re:RegExp)=>re.exec(html)?.[1];
const attrs=(html:string,re:RegExp)=>[...html.matchAll(re)].map(m=>m[1]);
const ld=(html:string)=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
const files=staticSeoFiles();
/** Every page: the emitted static pages and index.html as Vite serves it, by site path. */
const PAGES:Record<string,string>={'/':documentMessages(readFileSync(new URL('../../index.html',import.meta.url),'utf8')),
 ...Object.fromEntries(Object.entries(files).filter(([f])=>f.endsWith('.html')).map(([f,html])=>[`/${f.replace(/index\.html$/,'')}`,html]))};
const KEYS:readonly PageKey[]=['home','labs',...LABS.map(l=>l.slug)];
const hreflangs=(html:string)=>[...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map(m=>[m[1],m[2]]);
/** The visible link to a language's version of the page, named in that language. */
const languageLink=(l:SeoLanguage)=>new RegExp(`<a href="([^"]*)" hreflang="${l.tag}" lang="${l.tag}">${l.ui.languageName.replace(/[()]/g,'\\$&')}</a>`,'g');

/** Per translated language: its lint profile (src/i18n/lint/profiles.ts) and glossary, and what its pages must say. */
type TextRules=Readonly<{profile:ProfileId;glossary:Glossary;
 /** The English a term is matched against, when the language's glossary reads a phrase differently. */
 english?:(en:string)=>string;
 /** Claims to be CLEA's or official, beyond the profile's own. */
 claims:RegExp;
 reconstruction:string;homeDescription:RegExp;adaptation:string;notOriginal:string;
 ogLocale:string;ogImage:string}>;
const TEXT_RULES:Readonly<Record<string,TextRules>>={
 'es-419':{profile:'es-419',glossary:glossaryFrom(esGlossary,'es'),
  // "star cluster" is «cúmulo estelar» (the plan's glossary table, §5.1), so it does not also need «estrella».
  english:t=>t.replace(/\bstar clusters?\b/gi,'cluster'),
  claims:/versión (?:oficial|web) de CLEA|traducción (?:oficial|de CLEA)|programa oficial/i,
  reconstruction:'Reconstrucción web gratuita',homeDescription:/^Reconstrucción web gratuita y no oficial/,
  adaptation:'Este texto en español es una adaptación web hecha por OpenVireo, no un texto de CLEA.',
  notOriginal:'No es el programa original ni está afiliado a Project CLEA.',ogLocale:'es_LA',ogImage:'/og-image-es.png'},
 'pt-BR':{profile:'pt-BR',glossary:glossaryFrom(ptGlossary,'pt'),
  claims:/vers[ãa]o (?:oficial|web) d[oa] (?:Project )?CLEA|tradução (?:oficial|d[oa] (?:Project )?CLEA)|programa oficial/i,
  reconstruction:'Reconstrução web gratuita',homeDescription:/^Reconstrução web gratuita e não oficial/,
  adaptation:'Este texto em português é uma adaptação web feita pelo OpenVireo, não um texto do CLEA.',
  notOriginal:'Não é o programa original nem tem vínculo com o Project CLEA.',ogLocale:'pt_BR',ogImage:'/og-image-pt-br.png'},
};
/** The framework's rules that read the meaning of a page text. Glyph parity and the length ratio are left out: the pages are free
 * prose written from the English, not interface strings (Spanish writes Hertzsprung-Russell with a hyphen). */
const RULES:readonly ((p:Pair,profile:LocaleProfile,data:{glossary:Glossary})=>Finding[])[]=[placeholders,html,glossary,register,claim,markPairs,quotes,typography,digits,normalization,invisible];

describe('the language table',()=>{
 it('has English first (the x-default, whose home page is the app) and one row per language with its own path prefix',()=>{
  expect(SEO_LANGUAGES[0]).toBe(ENGLISH);expect(ENGLISH).toMatchObject({tag:'en',prefix:'',app:'/',home:null});
  expect(SEO_LANGUAGES.map(l=>l.tag)).toEqual(['en','es-419','pt-BR']);
  expect(Object.keys(SEO_PATH_PREFIX)).toEqual(SEO_LANGUAGES.map(l=>l.tag));
  for(const l of TRANSLATED){
   // A language gets search pages only once the app speaks it, under its registry pagePath (the dist check exempts that path).
   const entry=languageEntry(l.tag);expect(entry?.released,l.tag).toBe(true);
   expect(l.prefix).toBe(SEO_PATH_PREFIX[l.tag]);expect(l.prefix).toBe(`/${entry!.pagePath}`);
   // hreflang: ISO 639-1 language, optional ISO 3166-1 alpha-2 region (Google's format; es-419's UN M.49 region is not one), same language as the tag.
   for(const h of l.hreflang){expect(h).toMatch(/^[a-z]{2}(?:-[A-Z]{2})?$/);expect(h.slice(0,2)).toBe(l.tag.slice(0,2));}
   expect(l.app).toBe(`/?lang=${l.tag}`);expect(l.home).not.toBeNull();
   expect([l.ogLocale,l.ogImage]).toEqual([TEXT_RULES[l.tag].ogLocale,TEXT_RULES[l.tag].ogImage]);
  }
  // Spanish is `es` (es-419 is no hreflang region); Brazilian Portuguese is `pt-BR` and also `pt`, the same page, because the
  // app opens pt-BR for every pt and pt-* browser. No code names two languages.
  expect(TRANSLATED.map(l=>l.hreflang)).toEqual([['es'],['pt-BR','pt']]);
  expect(new Set(SEO_LANGUAGES.flatMap(l=>l.hreflang)).size).toBe(SEO_LANGUAGES.flatMap(l=>l.hreflang).length);
 });
 it('gives every language the seven labs with the English slugs, exercise codes and number of steps',()=>{
  for(const l of SEO_LANGUAGES){
   expect(l.labs.map(x=>[x.slug,x.exercise])).toEqual(LABS.map(x=>[x.slug,x.exercise]));
   l.labs.forEach((x,i)=>{expect(x.steps).toHaveLength(LABS[i].steps.length);expect(x.learn).toHaveLength(LABS[i].learn.length);});
  }
 });
 it('names the pages of each language under its prefix; the app links a language without pages to the English ones',()=>{
  expect(KEYS.map(k=>pathOf(SPANISH,k))).toEqual(['/es/','/es/labs/',...LABS.map(l=>`/es/labs/${l.slug}/`)]);
  expect(KEYS.map(k=>pathOf(PORTUGUESE,k))).toEqual(['/pt-br/','/pt-br/labs/',...LABS.map(l=>`/pt-br/labs/${l.slug}/`)]);
  expect(KEYS.slice(1).map(k=>pathOf(ENGLISH,k))).toEqual(['/labs/',...LABS.map(l=>labUrl(l.slug))]);
  expect([labsIndexUrl(),labsIndexUrl('en'),labsIndexUrl('es-419'),labsIndexUrl('qps'),labsIndexUrl('pt-BR'),labsIndexUrl('fr')]).toEqual(['/labs/','/labs/','/es/labs/','/labs/','/pt-br/labs/','/labs/']);
  expect([labUrl('pulsars','es-419'),labUrl('pulsars','pt-BR')]).toEqual(['/es/labs/pulsars/','/pt-br/labs/pulsars/']);
 });
 it('keeps the Spanish texts that tests/i18n/seo.spec.ts reads from this table equal to the literals es-seo.spec.ts asserted (PT-SEO review)',()=>{
  expect([SPANISH.home!.title,SPANISH.home!.heading,SPANISH.ui.openObservatory,SPANISH.ui.siteNav,SPANISH.ui.openLab,SPANISH.ui.languageName,
   SPANISH.labs[0].heading,SPANISH.labsIndex.heading,OBJECT_X_LAB_ES.title]).toEqual(['OpenVireo: prácticas de astronomía de CLEA VIREO en español',
   'Prácticas de astronomía de CLEA VIREO, en tu navegador','Abrir el observatorio','Sitio','Abrir la práctica','Español',
   'La ley de Hubble: la relación entre corrimiento al rojo y distancia','Prácticas de astronomía en tu navegador','En busca del Objeto X']);
 });
 it("each language's preview image exists, is 1200×630 and is its own",()=>{
  expect(new Set(SEO_LANGUAGES.map(l=>l.ogImage)).size).toBe(SEO_LANGUAGES.length);
  for(const l of SEO_LANGUAGES){
   const png=readFileSync(new URL(`../../public${l.ogImage}`,import.meta.url));
   expect([png.readUInt32BE(16),png.readUInt32BE(20)],l.tag).toEqual([1200,630]);
  }
 });
});

/** Every translated string of a language's pages with its English source; the strings without one have an empty English (the
 * glossary's terms and names then do not apply, its forbidden forms and the profile's patterns do). */
function pairsOf(L:SeoLanguage):Pair[]{
 const out:Pair[]=[];
 LABS.forEach((e,i)=>{const s=L.labs[i];
  for(const k of ['name','title','description','heading','intro'] as const)out.push({id:`${e.slug}.${k}`,en:e[k],text:s[k]});
  e.steps.forEach((t,j)=>out.push({id:`${e.slug}.steps.${j}`,en:t,text:s.steps[j]}));
  e.learn.forEach((t,j)=>out.push({id:`${e.slug}.learn.${j}`,en:t,text:s.learn[j]}));
 });
 for(const [k,v] of Object.entries(ENGLISH.ui))if(typeof v==='string')out.push({id:`ui.${k}`,en:v,text:L.ui[k as keyof SeoLanguage['ui']] as string});
 for(const [k,v] of Object.entries(ENGLISH.labsIndex))out.push({id:`labsIndex.${k}`,en:v,text:L.labsIndex[k as keyof SeoLanguage['labsIndex']]});
 out.push({id:'ogImageAlt',en:ENGLISH.ogImageAlt,text:L.ogImageAlt},{id:'ogImageText.title',en:ENGLISH.ogImageText.title,text:L.ogImageText.title});
 ENGLISH.ogImageText.lines.forEach((t,j)=>out.push({id:`ogImageText.lines.${j}`,en:t,text:L.ogImageText.lines[j]}));
 out.push({id:'ui.openLabNote',en:'',text:L.ui.openLabNote('hubble')});
 L.ui.educationalLevel.forEach((t,j)=>out.push({id:`ui.educationalLevel.${j}`,en:'',text:t}));
 for(const [k,v] of Object.entries(L.home!))(Array.isArray(v)?v:[v]).forEach((t:string,j:number)=>out.push({id:`home.${k}${Array.isArray(v)?`.${j}`:''}`,en:'',text:t}));
 return out;
}

for(const L of TRANSLATED)describe(`${languageEntry(L.tag)!.englishName} texts (${L.tag})`,()=>{
 const R=TEXT_RULES[L.tag];
 it('keep titles and descriptions within what search results show, unique, and say the site is a free web reconstruction',()=>{
  const pages=[...L.labs,L.labsIndex,L.home!];
  for(const p of pages){expect(p.title.length,p.title).toBeLessThanOrEqual(65);expect(p.title).toMatch(/ · OpenVireo$|^OpenVireo: /);
   expect(p.description.length,p.description).toBeGreaterThanOrEqual(110);expect(p.description.length,p.description).toBeLessThanOrEqual(160);}
  for(const l of L.labs)expect(l.description).toContain(R.reconstruction);
  expect(L.home!.description).toMatch(R.homeDescription);
  for(const key of ['title','description','heading','name'] as const){
   expect(new Set(L.labs.map(l=>l[key])).size,key).toBe(LABS.length);
   L.labs.forEach((l,i)=>expect(l[key],key).not.toBe(LABS[i][key]));
  }
  // A search result names one page: no title, description or heading is shared with another language.
  for(const key of ['title','description','heading'] as const)expect(new Set(SEO_LANGUAGES.flatMap(x=>x.labs.map(l=>l[key]))).size,key).toBe(SEO_LANGUAGES.length*LABS.length);
 });
 it(`follow the ${L.tag} lint profile and glossary: required terms, fixed names, register, no forbidden or other-variant forms`,()=>{
  const profile=PROFILES[R.profile],data={glossary:R.glossary};
  const findings=pairsOf(L).flatMap(p=>RULES.flatMap(rule=>rule(R.english?{...p,en:R.english(p.en)}:p,profile,data))).filter(f=>f.severity==='error');
  expect(describeFindings(findings)).toEqual([]);
 });
 it('never present the translation as CLEA\'s, say it is OpenVireo\'s web adaptation and credit CLEA as the English pages do',()=>{
  for(const p of pairsOf(L))expect(p.text,p.id).not.toMatch(R.claims);
  expect(L.ui.about).toContain(R.adaptation);
  expect(L.ui.about).toContain(R.notOriginal);
  for(const name of ['Project CLEA','Gettysburg College','National Science Foundation'])expect(L.ui.about).toContain(name);
 });
});

describe('app text in the static pages (scripts/check-i18n-dist.mjs)',()=>{
 // The dist check (front SC8's) counts as text of a language's chunk any catalog value of 16+ characters that differs from
 // English, any single-quoted literal of 12+ characters with a letter outside ASCII in its map files, and any such original of 8+.
 // An .html file under the language's own `pagePath` (`es/`, `pt-br/`) may carry it, so those pages use the app's own lab names;
 // every other page (English, and every other language's) must not. This mirrors the rule, more strictly (no marker is dropped
 // for also being English or another language's text), so a collision fails here first, naming the text (docs/I18N.md,
 // "Spanish: search pages").
 const outside=/(?![\x00-\x7f])\p{L}/u;
 const json=import.meta.glob('../i18n/*/*.json',{import:'default',eager:true}) as Record<string,Record<string,string>>;
 const maps=import.meta.glob('../i18n/*/maps/*.ts',{query:'?raw',import:'default',eager:true}) as Record<string,string>;
 for(const entry of LANGUAGES)it(`${entry.tag}: its markers appear only on its own pages, /${entry.pagePath}/`,()=>{
  const catalog=json[`../i18n/${entry.dir}/${entry.catalog}`],originals=json[`../i18n/${entry.dir}/originals.json`];
  const markers=[
   ...Object.entries(catalog).filter(([k,v])=>v!==(en as Record<string,string>)[k]&&v.length>=16).map(([,v])=>v),
   ...Object.entries(maps).filter(([f])=>f.startsWith(`../i18n/${entry.dir}/maps/`)).flatMap(([,src])=>[...src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map(m=>m[1].replace(/\\'/g,"'"))).filter(v=>v.length>=12&&outside.test(v)),
   ...Object.values(originals).filter(v=>v.length>=8&&outside.test(v)),
  ];
  // Front FR0: a language before its release holds only its first fronts' text (French's shell: about 160 markers).
  expect(markers.length).toBeGreaterThan(entry.released?1000:100);
  const found=Object.entries(PAGES).filter(([p])=>!p.startsWith(`/${entry.pagePath}/`)).flatMap(([p,html])=>markers.filter(m=>html.includes(m)).map(m=>`${p}: ${m}`));
  expect([...new Set(found)]).toEqual([]);
 });
});

for(const L of TRANSLATED)describe(`${languageEntry(L.tag)!.englishName} pages (${L.prefix}/)`,()=>{
 const others=SEO_LANGUAGES.filter(l=>l!==L);
 it('are in their language, canonical to themselves, with their previews, one h1, valid JSON-LD and no runnable script or inline style',()=>{
  for(const key of KEYS){
   const path=pathOf(L,key),html=PAGES[path];
   expect(html,path).toMatch(new RegExp(`^<!doctype html>\\n<html lang="${L.tag}"><head>`));
   expect(attr(html,/<link rel="canonical" href="([^"]*)"/)).toBe(SITE_URL+path);
   expect(attr(html,/<meta property="og:url" content="([^"]*)"/)).toBe(SITE_URL+path);
   expect(attr(html,/<meta property="og:locale" content="([^"]*)"/)).toBe(L.ogLocale);
   expect(attrs(html,/<meta property="og:locale:alternate" content="([^"]*)"/g)).toEqual(others.map(l=>l.ogLocale));
   expect(attr(html,/<meta property="og:image" content="([^"]*)"/)).toBe(SITE_URL+L.ogImage);
   expect(html.match(/<h1>/g)).toHaveLength(1);
   expect(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'')).not.toMatch(/<script|style=|<style/);
   const graph=ld(html)[0]['@graph'];
   if(key==='labs')expect(graph[0].itemListElement.map((i:{url:string})=>i.url)).toEqual(LABS.map(l=>`${SITE_URL}${L.prefix}/labs/${l.slug}/`));
   else{expect(graph[0].inLanguage).toBe(L.tag);expect(graph[0].url).toBe(SITE_URL+path);}
   // Every link stays on the language's pages or opens the app in it, except one link to each other language's version, named
   // in that language (the English home is the app, linked with ?lang=en).
   const links=attrs(html,/<a [^>]*href="([^"]*)"/g),languageLinks=others.map(l=>attrs(html,languageLink(l)));
   expect(languageLinks,path).toEqual(others.map(l=>[key==='home'&&!l.home?`/?lang=${l.tag}`:pathOf(l,key)]));
   const own=new RegExp(`^${L.prefix}/|^/\\?lang=${L.tag}(?:#lab=[a-z-]+)?$`);
   for(const href of links.filter(h=>!languageLinks.flat().includes(h)))expect(href,`${path} → ${href}`).toMatch(own);
  }
 });
 it("a lab page's Open the lab opens the app in its language with that lab's guide; its JSON-LD is a LearningResource in it",()=>{
  for(const lab of L.labs){
   const html=labPage(lab,L);
   expect(html).toContain(`<a class="button" href="/?lang=${L.tag}#lab=${lab.slug}">${L.ui.openLab}</a>`);
   expect(html).toContain(`<h1>${lab.heading}</h1>`);
   const [data]=ld(html);
   expect(data['@graph'][0]).toMatchObject({'@type':'LearningResource',name:lab.heading,inLanguage:L.tag,learningResourceType:L.ui.learningResourceType,educationalLevel:[...L.ui.educationalLevel],teaches:[...lab.learn]});
   expect(data['@graph'][0].isBasedOn.author.name).toBe('Project CLEA, Gettysburg College');
   expect(data['@graph'][1].itemListElement.map((i:{item:string})=>i.item)).toEqual([`${SITE_URL}${L.prefix}/`,`${SITE_URL}${L.prefix}/labs/`,`${SITE_URL}${L.prefix}/labs/${lab.slug}/`]);
  }
 });
 it(`${L.prefix}/ is a static home page that opens the app in its language and lists every lab page`,()=>{
  const html=languageHomePage(L);expect(PAGES[`${L.prefix}/`]).toBe(html);
  expect(attr(html,/<title>([^<]*)<\/title>/)).toBe(L.home!.title);
  expect(html).toContain(`<a class="button" href="/?lang=${L.tag}">${L.ui.openObservatory}</a>`);
  for(const l of LABS)expect(html).toContain(`href="${L.prefix}/labs/${l.slug}/"`);
  expect(ld(html)[0]['@graph'][0]).toMatchObject({'@type':'WebApplication',url:`${SITE_URL}${L.prefix}/`,inLanguage:L.tag,isAccessibleForFree:true});
  expect(labsIndexPage(L)).toBe(PAGES[`${L.prefix}/labs/`]);
 });
});

describe('English pages',()=>{
 it('link each translated version, named in its language, and keep their English locale and preview; the English home is the app',()=>{
  expect(()=>languageHomePage(ENGLISH)).toThrow();
  for(const key of KEYS.slice(1)){
   const html=PAGES[pathOf(ENGLISH,key)];
   expect(html).toMatch(/^<!doctype html>\n<html lang="en"><head>/);
   for(const l of TRANSLATED)expect(attrs(html,languageLink(l)),l.tag).toEqual([pathOf(l,key)]);
   expect(attr(html,/<meta property="og:locale" content="([^"]*)"/)).toBe('en_US');
   expect(attrs(html,/<meta property="og:locale:alternate" content="([^"]*)"/g)).toEqual(['es_LA','pt_BR']);
   expect(attr(html,/<meta property="og:image" content="([^"]*)"/)).toBe(`${SITE_URL}/og-image.png`);
  }
 });
});

describe('hreflang',()=>{
 it('every page names itself and each translation, with x-default on the English page, and the translations name it back',()=>{
  for(const key of KEYS){
   const expected=alternates(key),[e,s,p]=[ENGLISH,SPANISH,PORTUGUESE].map(l=>SITE_URL+pathOf(l,key));
   expect(expected).toEqual([['en',e],['es',s],['pt-BR',p],['pt',p],['x-default',e]]);
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
