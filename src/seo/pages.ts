/** Front SEO [W]: static HTML for search engines and link previews. The lab overview pages under /labs/, the sitemap, and the
 * extra <head> tags and pre-render content of index.html are built here from src/seo/labs.ts, so the pages, the sitemap and
 * the app's #lab= links share one list. Pure string functions; src/seo/vitePlugin.ts serves and emits them. The pages have no
 * script (JSON-LD is a data block, not executed) and no inline style, so the site's Content-Security-Policy covers them. */
import {LABS,SITE_URL,labLink,labUrl,type Lab} from './labs.ts';

export const SITE_NAME='OpenVireo';
export const OG_IMAGE='/og-image.png';
const OG_IMAGE_ALT='OpenVireo: CLEA VIREO astronomy labs in your browser';

const esc=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/** JSON for a <script type="application/ld+json"> block; "<" is escaped so no text can close the element. */
const ldJson=(value:unknown)=>JSON.stringify(value).replaceAll('<','\\u003c');

const CREDIT={
 '@type':'CreativeWork',name:'VIREO, the Virtual Educational Observatory',
 author:{'@type':'Organization',name:'Project CLEA, Gettysburg College',url:'https://public.gettysburg.edu/~marschal/clea/CLEAhome.html'},
 funder:[{'@type':'Organization',name:'National Science Foundation'},{'@type':'Organization',name:'Gettysburg College'}],
};

/** Canonical, link-preview and icon tags shared by every page. `path` starts with "/". */
export function sharedHead({path,title,description}:{path:string;title:string;description:string}):string{
 const url=SITE_URL+path;
 return [
  `<link rel="canonical" href="${url}"/>`,
  `<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>`,
  `<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>`,
  `<meta property="og:type" content="website"/>`,
  `<meta property="og:site_name" content="${SITE_NAME}"/>`,
  `<meta property="og:title" content="${esc(title)}"/>`,
  `<meta property="og:description" content="${esc(description)}"/>`,
  `<meta property="og:url" content="${url}"/>`,
  `<meta property="og:image" content="${SITE_URL}${OG_IMAGE}"/>`,
  `<meta property="og:image:width" content="1200"/>`,
  `<meta property="og:image:height" content="630"/>`,
  `<meta property="og:image:alt" content="${esc(OG_IMAGE_ALT)}"/>`,
  `<meta name="twitter:card" content="summary_large_image"/>`,
 ].join('');
}

/** Extra <head> tags of index.html (the app). */
export function homeHead(title:string,description:string):string{
 const app={
  '@type':'WebApplication',name:SITE_NAME,url:SITE_URL+'/',description,
  applicationCategory:'EducationalApplication',operatingSystem:'Any (runs in a web browser)',inLanguage:'en',
  isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},isBasedOn:CREDIT,
 };
 // WebSite: Google reads the site name for search results from it (review 1 m7).
 const site={'@type':'WebSite',name:SITE_NAME,url:SITE_URL+'/'};
 return sharedHead({path:'/',title,description})+`<script type="application/ld+json">${ldJson({'@context':'https://schema.org','@graph':[app,site]})}</script>`;
}

/** Content inside <div id="root"> before the app starts: what the site is and links to the lab pages. React replaces it. */
export function homeBoot(description:string):string{
 return `<div class="seo-boot"><h1>${SITE_NAME}</h1><p>${esc(description)}</p><p>Loading the observatory…</p>`+
  `<nav aria-label="Labs"><ul>${LABS.map(l=>`<li><a href="${labUrl(l.slug)}">${esc(l.name)}</a></li>`).join('')}</ul></nav></div>`;
}

const ABOUT=`OpenVireo is a free, non-commercial web reconstruction of VIREO, the Virtual Educational Observatory of Project CLEA `+
 `(Gettysburg College, supported by the National Science Foundation and Gettysburg College). It is based on the original `+
 `program's recovered behaviour and uses the original data files with credit. It is not the original program and is not `+
 `affiliated with Project CLEA. The app labels its known web adaptations.`;

function page({path,title,description,body,ld}:{path:string;title:string;description:string;body:string;ld:unknown}):string{
 return `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>`+
  `<meta name="theme-color" content="#0b2430"/><meta name="color-scheme" content="light dark"/>`+
  `<title>${esc(title)}</title><meta name="description" content="${esc(description)}"/>`+
  sharedHead({path,title,description})+
  `<link rel="stylesheet" href="/labs/labs.css"/><script type="application/ld+json">${ldJson(ld)}</script></head>`+
  `<body><header class="top"><a class="brand" href="/"><span aria-hidden="true">✳</span> ${SITE_NAME}</a>`+
  `<nav aria-label="Site"><a href="/labs/">All labs</a><a class="open" href="/">Open the observatory</a></nav></header>`+
  `<main>${body}</main>`+
  `<footer><p>${esc(ABOUT)}</p><p>Runs in a modern web browser on Windows, Mac, Linux or Chromebook. Nothing to install, no account.</p></footer>`+
  `</body></html>\n`;
}

const crumbs=(items:{name:string;path:string}[])=>({
 '@type':'BreadcrumbList',itemListElement:items.map((it,i)=>({'@type':'ListItem',position:i+1,name:it.name,item:SITE_URL+it.path})),
});

export function labPage(lab:Lab):string{
 const path=labUrl(lab.slug),others=LABS.filter(l=>l!==lab);
 const body=`<nav class="crumbs" aria-label="Breadcrumb"><a href="/">${SITE_NAME}</a> › <a href="/labs/">Labs</a> › <span aria-current="page">${esc(lab.name)}</span></nav>`+
  `<p class="eyebrow">Lab based on a CLEA VIREO exercise</p><h1>${esc(lab.heading)}</h1><p class="lead">${esc(lab.intro)}</p>`+
  `<p class="cta"><a class="button" href="${labLink(lab.slug)}">Open the lab</a> <span>Opens the observatory with the ${esc(lab.guide)}. Free, no sign-up.</span></p>`+
  `<section><h2>What you do</h2><ol>${lab.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></section>`+
  `<section><h2>What you learn</h2><ul>${lab.learn.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></section>`+
  `<section><h2>Other labs</h2><ul class="others">${others.map(l=>`<li><a href="${labUrl(l.slug)}">${esc(l.name)}</a></li>`).join('')}</ul></section>`;
 const ld={'@context':'https://schema.org','@graph':[
  {'@type':'LearningResource',name:lab.heading,description:lab.description,url:SITE_URL+path,inLanguage:'en',
   learningResourceType:'Interactive lab',educationalLevel:['High school','Undergraduate'],isAccessibleForFree:true,
   teaches:[...lab.learn],isBasedOn:CREDIT,isPartOf:{'@type':'WebSite',name:SITE_NAME,url:SITE_URL+'/'}},
  crumbs([{name:SITE_NAME,path:'/'},{name:'Labs',path:'/labs/'},{name:lab.name,path}]),
 ]};
 return page({path,title:lab.title,description:lab.description,body,ld});
}

export const LABS_INDEX_TITLE='CLEA VIREO astronomy labs online · OpenVireo';
export const LABS_INDEX_DESCRIPTION="Seven CLEA VIREO labs rebuilt for the browser: Hubble's law, large-scale structure, stellar spectra, Pleiades, cluster HR diagrams, pulsars and Object X.";

export function labsIndexPage():string{
 const body=`<nav class="crumbs" aria-label="Breadcrumb"><a href="/">${SITE_NAME}</a> › <span aria-current="page">Labs</span></nav>`+
  `<p class="eyebrow">CLEA VIREO labs</p><h1>Astronomy labs in your browser</h1>`+
  `<p class="lead">Each lab follows one of the student exercises of VIREO, Project CLEA's virtual observatory. You observe with virtual telescopes and instruments, measure your own data and draw your own conclusions.</p>`+
  `<ul class="cards">${LABS.map(l=>`<li><a href="${labUrl(l.slug)}"><strong>${esc(l.name)}</strong><span>${esc(l.description)}</span></a></li>`).join('')}</ul>`+
  `<p class="cta"><a class="button" href="/">Open the observatory</a></p>`;
 const ld={'@context':'https://schema.org','@graph':[
  {'@type':'ItemList',name:'CLEA VIREO labs',itemListElement:LABS.map((l,i)=>({'@type':'ListItem',position:i+1,name:l.name,url:SITE_URL+labUrl(l.slug)}))},
  crumbs([{name:SITE_NAME,path:'/'},{name:'Labs',path:'/labs/'}]),
 ]};
 return page({path:'/labs/',title:LABS_INDEX_TITLE,description:LABS_INDEX_DESCRIPTION,body,ld});
}

/** Every page a search engine should know about, as site paths. */
export const SITEMAP_PATHS=Object.freeze(['/','/labs/',...LABS.map(l=>labUrl(l.slug))]);

export function sitemap():string{
 return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
  SITEMAP_PATHS.map(p=>`  <url><loc>${SITE_URL}${p}</loc></url>\n`).join('')+`</urlset>\n`;
}

/** Output files, by their path in dist/ (and in the dev server). */
export function staticSeoFiles():Record<string,string>{
 const files:Record<string,string>={'labs/index.html':labsIndexPage(),'sitemap.xml':sitemap()};
 for(const lab of LABS)files[`labs/${lab.slug}/index.html`]=labPage(lab);
 return files;
}
