// Front ES-SEO (docs/SEO.md): renders a language's link-preview image (1200×630 PNG) from its row of src/seo/languages.ts
// (ogImage, ogImageText), with the design of public/og-image.png: an original drawing (the favicon, a dark sky with seeded
// stars, the language's text); no CLEA image is used. Local tool only: Playwright's Chromium renders a page built here, with
// no network request (every request is aborted). Text is set in DejaVu Sans, so run it with the project's test fontconfig, e.g.
//   FONTCONFIG_FILE=…/fonts.conf node scripts/render-og-image.mjs es-419            → public/og-image-es.png
//   node scripts/render-og-image.mjs en /tmp/check.png                               (English, to compare with the original)
// The English image predates this script and is not re-rendered: pass an output path for English.
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
import {SEO_LANGUAGES} from '../src/seo/languages.ts';

const [tag,out]=process.argv.slice(2);
const language=SEO_LANGUAGES.find(l=>l.tag===tag);
if(!language)throw new Error(`usage: node scripts/render-og-image.mjs <${SEO_LANGUAGES.map(l=>l.tag).join('|')}> [out.png]`);
if(language.tag==='en'&&!out)throw new Error('public/og-image.png is the original English image; give an output path to render English elsewhere.');
const target=out??new URL(`../public${language.ogImage}`,import.meta.url).pathname;
const esc=(text)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const icon=readFileSync(new URL('../public/favicon.svg',import.meta.url),'utf8');

// Stars from a fixed seed (mulberry32), so a render is repeatable.
let seed=0x0b2430;
const random=()=>{seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
const stars=Array.from({length:150},()=>{const r=random()<0.85?0.8+random()*0.6:1.4+random()*0.8;return `<circle cx="${(random()*1200).toFixed(1)}" cy="${(random()*630).toFixed(1)}" r="${r.toFixed(2)}" fill="#e7f0ee" fill-opacity="${(0.25+random()*0.6).toFixed(2)}"/>`;}).join('');

const html=`<!doctype html><html lang="${language.tag}"><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;font-family:'DejaVu Sans',sans-serif;color:#eef4f2;
 background:radial-gradient(circle at 1010px 600px,#1a5a48 0,#174a3f 180px,rgba(23,74,63,0) 330px),linear-gradient(160deg,#0b2430 0%,#0d2a33 45%,#123b3a 100%)}
svg.sky{position:absolute;inset:0}
.brand{position:absolute;left:84px;top:96px;display:flex;align-items:center;gap:22px;font-weight:700;font-size:40px}
.brand svg{width:84px;height:84px}
h1{position:absolute;left:84px;top:232px;width:1040px;font-size:62px;line-height:1.13;font-weight:700;letter-spacing:.5px}
.lines{position:absolute;left:84px;top:396px;width:1040px;font-size:29px;line-height:1.5;color:#a9bfc4}
.site{position:absolute;left:84px;top:530px;font-size:28px;font-weight:700;color:#d6efe5}
</style></head><body><svg class="sky" width="1200" height="630">${stars}</svg>
<div class="brand">${icon}<span>OpenVireo</span></div>
<h1>${esc(language.ogImageText.title)}</h1>
<div class="lines">${language.ogImageText.lines.map(l=>`<div>${esc(l)}</div>`).join('')}</div>
<div class="site">openvireo.space</div></body></html>`;

const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.route('**/*',route=>route.abort());
 await page.setContent(html);
 // The title must fit in two lines and the text lines in one each, or the layout overlaps.
 const fit=await page.evaluate(()=>({title:Math.round(document.querySelector('h1').getBoundingClientRect().height),lines:[...document.querySelectorAll('.lines div')].map(d=>Math.round(d.getBoundingClientRect().height))}));
 if(fit.title>150||fit.lines.some(h=>h>45))throw new Error(`text does not fit: ${JSON.stringify(fit)}`);
 writeFileSync(target,await page.screenshot({type:'png'}));
 console.log(`wrote ${target}`);
}finally{await browser.close();}
