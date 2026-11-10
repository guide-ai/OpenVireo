/** Front SEO [W]: static HTML for search engines and link previews. The lab overview pages under /labs/, the sitemap, and the
 * extra <head> tags and pre-render content of index.html are built here from src/seo/labs.ts, so the pages, the sitemap and
 * the app's #lab= links share one list. Pure string functions; src/seo/vitePlugin.ts serves and emits them. The pages have no
 * script (JSON-LD is a data block, not executed) and no inline style, so the site's Content-Security-Policy covers them.
 * Front ES-SEO: every page is rendered for every language of src/seo/languages.ts (English at the root, Spanish under /es/,
 * whose home page /es/ is a static page), with hreflang alternates, Open Graph locales and a sitemap that lists them all. */
import {SITE_URL,labUrl} from './labs.ts';
import {ENGLISH,SEO_LANGUAGES,pathOf,type PageKey,type SeoLab,type SeoLanguage} from './languages.ts';

export const SITE_NAME='OpenVireo';
export const OG_IMAGE=ENGLISH.ogImage;

const esc=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** JSON for a <script type="application/ld+json"> block; "<" is escaped so no text can close the element. */
const ldJson=(value:unknown)=>JSON.stringify(value).replaceAll('<','\\u003c');

const CREDIT={
 '@type':'CreativeWork',name:'VIREO, the Virtual Educational Observatory',
 author:{'@type':'Organization',name:'Project CLEA, Gettysburg College',url:'https://public.gettysburg.edu/~marschal/clea/CLEAhome.html'},
 funder:[{'@type':'Organization',name:'National Science Foundation'},{'@type':'Organization',name:'Gettysburg College'}],
};

/** The same page in every language, as [hreflang, absolute URL] pairs: each language's codes, then x-default (English). */
export function alternates(key:PageKey):[string,string][]{
 return [...SEO_LANGUAGES.flatMap(l=>l.hreflang.map(h=>[h,SITE_URL+pathOf(l,key)] as [string,string])),['x-default',SITE_URL+pathOf(ENGLISH,key)]];
}

/** Canonical, hreflang, link-preview and icon tags shared by every page. */
export function sharedHead({key,title,description,language=ENGLISH}:{key:PageKey;title:string;description:string;language?:SeoLanguage}):string{
 const url=SITE_URL+pathOf(language,key);
 return [
  `<link rel="canonical" href="${url}"/>`,
  ...alternates(key).map(([h,href])=>`<link rel="alternate" hreflang="${h}" href="${href}"/>`),
  `<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>`,
  `<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>`,
  `<meta property="og:type" content="website"/>`,
  `<meta property="og:site_name" content="${SITE_NAME}"/>`,
  `<meta property="og:title" content="${esc(title)}"/>`,
  `<meta property="og:description" content="${esc(description)}"/>`,
  `<meta property="og:url" content="${url}"/>`,
  `<meta property="og:locale" content="${language.ogLocale}"/>`,
  ...SEO_LANGUAGES.filter(l=>l!==language).map(l=>`<meta property="og:locale:alternate" content="${l.ogLocale}"/>`),
  `<meta property="og:image" content="${SITE_URL}${language.ogImage}"/>`,
  `<meta property="og:image:width" content="1200"/>`,
  `<meta property="og:image:height" content="630"/>`,
  `<meta property="og:image:alt" content="${esc(language.ogImageAlt)}"/>`,
  `<meta name="twitter:card" content="summary_large_image"/>`,
 ].join('');
}

/** Extra <head> tags of index.html (the app, English home page). */
export function homeHead(title:string,description:string):string{
 const app={
  '@type':'WebApplication',name:SITE_NAME,url:SITE_URL+'/',description,
  applicationCategory:'EducationalApplication',operatingSystem:'Any (runs in a web browser)',inLanguage:'en',
  isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},isBasedOn:CREDIT,
 };
 // WebSite: Google reads the site name for search results from it (review 1 m7).
 const site={'@type':'WebSite',name:SITE_NAME,url:SITE_URL+'/'};
 return sharedHead({key:'home',title,description})+`<script type="application/ld+json">${ldJson({'@context':'https://schema.org','@graph':[app,site]})}</script>`;
}

/** Front HOME: the catalog keys of the welcome's lab cards (src/home/Welcome.tsx), by lab slug, in the /labs/ order. */
export const HOME_LAB_KEYS:Readonly<Record<SeoLab['slug'],string>>=Object.freeze({hubble:'home.hubble','large-scale-structure':'home.lss',
 'stellar-classification':'home.classification',pleiades:'home.pleiades','cluster-hr':'home.clusterHr',pulsars:'home.pulsars','object-x':'home.objectX'});

/** Content inside <div id="root"> before the app starts: what the site is and links to the lab pages. React replaces it.
 * Front HOME: it mirrors the observatory's welcome (src/home/Welcome.tsx) in English, from the same catalog keys: the h1, the
 * lead, the three facts and the seven labs with their one-line summaries, each linking to its /labs/ page. */
export function homeBoot(m:Readonly<Record<string,string>>):string{
 const text=(key:string)=>{const v=m[key];if(typeof v!=='string')throw new Error(`homeBoot: no text for ${key}`);return esc(v);};
 return `<div class="seo-boot"><p class="eyebrow">${text('home.eyebrow')}</p><h1>${text('home.title')}</h1><p>${text('home.lead')}</p>`+
  `<ul aria-label="${text('home.factsLabel')}"><li>${text('home.factInstall')}</li><li>${text('home.factFree')}</li><li>${text('home.factFaithful')}</li></ul>`+
  `<h2>${text('home.labsHeading')}</h2><nav aria-label="Labs"><ul class="labs">${ENGLISH.labs.map(l=>`<li><a href="${labUrl(l.slug)}">${text(HOME_LAB_KEYS[l.slug])}</a>: ${text(HOME_LAB_KEYS[l.slug]+'Summary')}</li>`).join('')}</ul></nav>`+
  `<p>Loading the observatory…</p></div>`;
}

/** The links to this page in the other languages, each named in its own language. A home page that is the app (English) is
 * linked with `?lang=<tag>`, so a reader with a Spanish browser or stored choice who asks for English gets English there. */
const languageLinks=(language:SeoLanguage,key:PageKey)=>SEO_LANGUAGES.filter(l=>l!==language)
 .map(l=>`<a href="${esc(key==='home'&&!l.home?`/?lang=${l.tag}`:pathOf(l,key))}" hreflang="${l.tag}" lang="${l.tag}">${esc(l.ui.languageName)}</a>`).join('');

function page({key,title,description,body,ld,language}:{key:PageKey;title:string;description:string;body:string;ld:unknown;language:SeoLanguage}):string{
 const ui=language.ui;
 return `<!doctype html>\n<html lang="${language.tag}"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>`+
  `<meta name="theme-color" content="#0b2430"/><meta name="color-scheme" content="light dark"/>`+
  `<title>${esc(title)}</title><meta name="description" content="${esc(description)}"/>`+
  sharedHead({key,title,description,language})+
  `<link rel="stylesheet" href="/labs/labs.css"/><script type="application/ld+json">${ldJson(ld)}</script></head>`+
  `<body><header class="top"><a class="brand" href="${pathOf(language,'home')}"><span aria-hidden="true">✳</span> ${SITE_NAME}</a>`+
  `<nav aria-label="${esc(ui.siteNav)}"><a href="${pathOf(language,'labs')}">${esc(ui.allLabs)}</a>${languageLinks(language,key)}<a class="open" href="${esc(language.app)}">${esc(ui.openObservatory)}</a></nav></header>`+
  `<main>${body}</main>`+
  `<footer><p>${esc(ui.about)}</p><p>${esc(ui.platform)}</p></footer>`+
  `</body></html>\n`;
}

const crumbs=(items:{name:string;path:string}[])=>({
 '@type':'BreadcrumbList',itemListElement:items.map((it,i)=>({'@type':'ListItem',position:i+1,name:it.name,item:SITE_URL+it.path})),
});
const crumbNav=(language:SeoLanguage,items:{name:string;path:string}[],current:string)=>
 `<nav class="crumbs" aria-label="${esc(language.ui.breadcrumb)}">${items.map(it=>`<a href="${it.path}">${esc(it.name)}</a> › `).join('')}<span aria-current="page">${esc(current)}</span></nav>`;
/** The app address that opens a lab's guide (#lab=<slug>) in this language. */
export const openLabHref=(language:SeoLanguage,slug:SeoLab['slug'])=>`${language.app}#lab=${slug}`;

export function labPage(lab:SeoLab,language:SeoLanguage=ENGLISH):string{
 const ui=language.ui,path=pathOf(language,lab.slug),home=pathOf(language,'home'),labs=pathOf(language,'labs');
 const others=language.labs.filter(l=>l.slug!==lab.slug);
 const body=crumbNav(language,[{name:SITE_NAME,path:home},{name:ui.labsCrumb,path:labs}],lab.name)+
  `<p class="eyebrow">${esc(ui.labEyebrow)}</p><h1>${esc(lab.heading)}</h1><p class="lead">${esc(lab.intro)}</p>`+
  `<p class="cta"><a class="button" href="${esc(openLabHref(language,lab.slug))}">${esc(ui.openLab)}</a> <span>${esc(ui.openLabNote(lab.slug))}</span></p>`+
  `<section><h2>${esc(ui.whatYouDo)}</h2><ol>${lab.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></section>`+
  `<section><h2>${esc(ui.whatYouLearn)}</h2><ul>${lab.learn.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></section>`+
  `<section><h2>${esc(ui.otherLabs)}</h2><ul class="others">${others.map(l=>`<li><a href="${pathOf(language,l.slug)}">${esc(l.name)}</a></li>`).join('')}</ul></section>`;
 const ld={'@context':'https://schema.org','@graph':[
  {'@type':'LearningResource',name:lab.heading,description:lab.description,url:SITE_URL+path,inLanguage:language.tag,
   learningResourceType:ui.learningResourceType,educationalLevel:[...ui.educationalLevel],isAccessibleForFree:true,
   teaches:[...lab.learn],isBasedOn:CREDIT,isPartOf:{'@type':'WebSite',name:SITE_NAME,url:SITE_URL+'/'}},
  crumbs([{name:SITE_NAME,path:home},{name:ui.labsCrumb,path:labs},{name:lab.name,path}]),
 ]};
 return page({key:lab.slug,title:lab.title,description:lab.description,body,ld,language});
}

export const LABS_INDEX_TITLE=ENGLISH.labsIndex.title;
export const LABS_INDEX_DESCRIPTION=ENGLISH.labsIndex.description;

const cards=(language:SeoLanguage)=>`<ul class="cards">${language.labs.map(l=>`<li><a href="${pathOf(language,l.slug)}"><strong>${esc(l.name)}</strong><span>${esc(l.description)}</span></a></li>`).join('')}</ul>`;

export function labsIndexPage(language:SeoLanguage=ENGLISH):string{
 const x=language.labsIndex,home=pathOf(language,'home'),labs=pathOf(language,'labs');
 const body=crumbNav(language,[{name:SITE_NAME,path:home}],language.ui.labsCrumb)+
  `<p class="eyebrow">${esc(x.eyebrow)}</p><h1>${esc(x.heading)}</h1><p class="lead">${esc(x.lead)}</p>`+cards(language)+
  `<p class="cta"><a class="button" href="${esc(language.app)}">${esc(language.ui.openObservatory)}</a></p>`;
 const ld={'@context':'https://schema.org','@graph':[
  {'@type':'ItemList',name:x.listName,itemListElement:language.labs.map((l,i)=>({'@type':'ListItem',position:i+1,name:l.name,url:SITE_URL+pathOf(language,l.slug)}))},
  crumbs([{name:SITE_NAME,path:home},{name:language.ui.labsCrumb,path:labs}]),
 ]};
 return page({key:'labs',title:x.title,description:x.description,body,ld,language});
}

/** The static home page of a language whose home is not the app (Spanish: /es/). It opens the app in its language through
 * `?lang=<tag>`, which applies to that load only (docs/I18N.md), and links the same page in the other languages. */
export function languageHomePage(language:SeoLanguage):string{
 const h=language.home;
 if(!h)throw new Error(`${language.tag}: its home page is the app`);
 const body=`<p class="eyebrow">${esc(h.eyebrow)}</p><h1>${esc(h.heading)}</h1><p class="lead">${esc(h.lead)}</p>`+
  `<p class="cta"><a class="button" href="${esc(language.app)}">${esc(language.ui.openObservatory)}</a> <span>${esc(h.note)}</span></p>`+
  `<section><h2>${esc(h.labsHeading)}</h2>${cards(language)}</section>`+
  `<section><h2>${esc(h.howHeading)}</h2><ul>${h.how.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></section>`;
 const ld={'@context':'https://schema.org','@graph':[{
  '@type':'WebApplication',name:SITE_NAME,url:SITE_URL+pathOf(language,'home'),description:h.description,
  applicationCategory:'EducationalApplication',operatingSystem:h.operatingSystem,inLanguage:language.tag,
  isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},isBasedOn:CREDIT,
 }]};
 return page({key:'home',title:h.title,description:h.description,body,ld,language});
}

const PAGE_KEYS:readonly PageKey[]=['home','labs',...ENGLISH.labs.map(l=>l.slug)];
/** Every page a search engine should know about, as [site path, page]: each language's pages in turn, English first. */
const SITEMAP=SEO_LANGUAGES.flatMap(l=>PAGE_KEYS.map(k=>[pathOf(l,k),k] as const));
export const SITEMAP_PATHS=Object.freeze(SITEMAP.map(([p])=>p));

export function sitemap():string{
 return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`+
  SITEMAP.map(([p,k])=>`  <url><loc>${SITE_URL}${p}</loc>${alternates(k).map(([h,href])=>`<xhtml:link rel="alternate" hreflang="${h}" href="${href}"/>`).join('')}</url>\n`).join('')+`</urlset>\n`;
}

/** Output files, by their path in dist/ (and in the dev server). */
export function staticSeoFiles():Record<string,string>{
 const files:Record<string,string>={'sitemap.xml':sitemap()};
 for(const language of SEO_LANGUAGES){
  const dir=language.prefix?`${language.prefix.slice(1)}/`:'';
  if(language.home)files[`${dir}index.html`]=languageHomePage(language);
  files[`${dir}labs/index.html`]=labsIndexPage(language);
  for(const lab of language.labs)files[`${dir}labs/${lab.slug}/index.html`]=labPage(lab,language);
 }
 return files;
}
