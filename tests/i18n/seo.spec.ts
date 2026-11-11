import {test,expect} from '../fixtures/area-tripwire';
import {contextLocale} from '../fixtures/language';
import en from '../../src/i18n/en.json' with {type:'json'};
import {LANGUAGE_STORAGE_KEY} from '../../src/i18n/locale';
import {SEO_LANGUAGES,type SeoLanguage} from '../../src/seo/languages';
import {OBJECT_X_LAB_ES} from '../../src/i18n/es/maps/objectXLab';
import {OBJECT_X_LAB_PT} from '../../src/i18n/pt-br/maps/objectXLab';
import {textOf,type LanguageText} from './languageText';

// Front ES-SEO (user decision 8 of 2026-11-09; docs/I18N.md, "Spanish: search pages"): the static Spanish home page /es/ and
// the Spanish lab pages /es/labs/, served by the dev server as the build writes them to dist/. These tests run in an English
// (en-US) browser unless they say otherwise: a Spanish page opens the app in Spanish through `?lang=es-419` (that load only,
// never stored), and every Spanish page links its English version. Front PT-SEO: the spec (es-seo.spec.ts until then) runs for
// every language with search pages (src/seo/languages.ts), its texts read from that table and the language's sources; the
// Spanish tests keep their titles, and Brazilian Portuguese (/pt-br/) runs the same checks under its own.
const stored=(page:import('@playwright/test').Page)=>page.evaluate(key=>{try{return localStorage.getItem(key);}catch{return 'unreadable';}},LANGUAGE_STORAGE_KEY);
const OBJECT_X_GUIDE:Readonly<Record<string,string>>={'es-419':OBJECT_X_LAB_ES.title,'pt-BR':OBJECT_X_LAB_PT.title};
/** A test title: Spanish keeps its ES-SEO title; another language names itself and its prefix. */
const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<p>',SEO_LANGUAGES.find(s=>s.tag===L.tag)!.prefix);

for(const S of SEO_LANGUAGES.slice(1) as SeoLanguage[]){
 const L=textOf(S.tag),C=L.catalog,P=S.prefix,lang=`?lang=${S.tag}`;
 const site=(page:import('@playwright/test').Page)=>page.getByRole('navigation',{name:S.ui.siteNav});

 test(title(L,'/es/ is a static Spanish page; Abrir el observatorio opens the app in Spanish without storing a choice, and English goes back','<p>/ is a static <L> page; its Open the observatory opens the app in <L> without storing a choice, and English goes back'),async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${P}/`);
  await expect(page.locator('html')).toHaveAttribute('lang',S.tag);
  await expect(page).toHaveTitle(S.home!.title);
  await expect(page.getByRole('heading',{level:1})).toHaveText(S.home!.heading);
  await expect(page.locator('.cards a')).toHaveCount(7);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href','https://openvireo.space/');
  await page.getByRole('link',{name:S.ui.openObservatory}).first().click();
  await expect(page.getByRole('heading',{level:1,name:C['sky.title']})).toBeVisible({timeout:15_000});
  await expect(page.locator('html')).toHaveAttribute('lang',S.tag);
  expect(new URL(page.url()).search).toBe(lang);expect(new URL(page.url()).hash).toBe('#observatory');expect(await stored(page)).toBeNull();
  // An English browser opening the plain address afterwards still gets English (nothing was stored).
  await page.goto('/');await expect(page.getByRole('heading',{level:1,name:en['home.title']})).toBeVisible({timeout:15_000});
  await page.goto(`${P}/`);await site(page).getByRole('link',{name:'English'}).click();
  await expect(page.getByRole('heading',{level:1,name:en['home.title']})).toBeVisible({timeout:15_000});
  expect(new URL(page.url()).search).toBe('?lang=en');
  expect(errors).toEqual([]);
 });

 test(title(L,'a Spanish browser that follows English from /es/ gets English, as ?lang=en beats the browser language','a <L> browser that follows English from <p>/ gets English, as ?lang=en beats the browser language'),async({browser})=>{
  const context=await browser.newContext({locale:contextLocale(S.tag)});const page=await context.newPage();
  await page.goto(`${P}/`);await site(page).getByRole('link',{name:'English'}).click();
  await expect(page.getByRole('heading',{level:1,name:en['home.title']})).toBeVisible({timeout:15_000});
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await context.close();
 });

 for(const {slug,guide} of [{slug:'pulsars',guide:C['pulsarLab.title']},{slug:'object-x',guide:OBJECT_X_GUIDE[S.tag]}])
  test(title(L,`/es/labs/${slug}/: Abrir la práctica opens that guide in Spanish and leaves ?lang=es-419 without the #lab= link`,`<p>/labs/${slug}/: its Open the lab opens that guide in <L> and leaves ${lang} without the #lab= link`),async({page})=>{
   await page.goto(`${P}/labs/${slug}/`);
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://openvireo.space${P}/labs/${slug}/`);
   await page.getByRole('link',{name:S.ui.openLab}).click();
   const dialog=page.locator('dialog[open]');
   await expect(dialog).toBeVisible({timeout:15_000});await expect(dialog).toContainText(guide);
   await expect(page.locator('html')).toHaveAttribute('lang',S.tag);
   await expect.poll(()=>page.evaluate(()=>[location.search,location.hash])).toEqual([lang,'#observatory']);
   expect(await stored(page)).toBeNull();
  });

 test(title(L,'the Spanish cluster lab link opens the Spanish cluster database guide and keeps ?lang=es-419',`the <L> cluster lab link opens the <L> cluster database guide and keeps ${lang}`),async({page})=>{
  await page.goto(`${P}/labs/cluster-hr/`);await page.getByRole('link',{name:S.ui.openLab}).click();
  await expect(page.locator('dialog[open]')).toContainText(C['clusterLab.title'],{timeout:15_000});
  await expect.poll(()=>page.evaluate(()=>[location.search,location.hash])).toEqual([lang,'#cluster-database']);
 });

 test(title(L,'the dev server, like Pages, redirects /es, /es/labs and /es/labs/<slug> to the trailing-slash address','the dev server, like Pages, redirects <p>, <p>/labs and <p>/labs/<slug> to the trailing-slash address'),async({request})=>{
  for(const path of [P,`${P}/labs`,`${P}/labs/hubble`]){const r=await request.get(path,{maxRedirects:0});expect([r.status(),r.headers().location]).toEqual([308,`${path}/`]);}
 });

 test(title(L,'the Spanish and English lab pages link each other; the Spanish index lists the seven Spanish lab pages','the <L> and English lab pages link each other; the <L> index lists the seven <L> lab pages'),async({page})=>{
  await page.goto('/labs/hubble/');
  await page.getByRole('link',{name:S.ui.languageName,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`${P}/labs/hubble/$`));await expect(page.getByRole('heading',{level:1})).toHaveText(S.labs[0].heading);
  await site(page).getByRole('link',{name:'English'}).click();
  await expect(page).toHaveURL(/\/labs\/hubble\/$/);await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.goto(`${P}/labs/`);
  const cards=page.locator('.cards a');await expect(cards).toHaveCount(7);
  for(const href of await cards.evaluateAll(as=>as.map(a=>(a as HTMLAnchorElement).getAttribute('href'))))expect(href).toMatch(new RegExp(`^${P}/labs/[a-z-]+/$`));
  // Front PT-SEO: each translated page links the other translations too, named in their own language.
  for(const O of SEO_LANGUAGES.slice(1).filter(o=>o!==S))
   await expect(site(page).getByRole('link',{name:O.ui.languageName,exact:true})).toHaveAttribute('href',`${O.prefix}/labs/`);
 });

 test(title(L,'in Spanish, the observatory footer links the Spanish labs index in a new tab','in <L>, the observatory footer links the <L> labs index in a new tab'),async({browser})=>{
  const context=await browser.newContext({locale:contextLocale(S.tag)});const page=await context.newPage();
  await page.goto('/#observatory');
  const link=page.getByRole('link',{name:`${C['sky.labsLink']} ${C['sky.labsLinkNewTab']}`});
  await expect(link).toHaveAttribute('href',`${P}/labs/`,{timeout:15_000});await expect(link).toHaveAttribute('target','_blank');
  const [tab]=await Promise.all([context.waitForEvent('page'),link.click()]);
  await expect(tab).toHaveURL(new RegExp(`${P}/labs/$`));await expect(tab.getByRole('heading',{level:1})).toHaveText(S.labsIndex.heading);
  await context.close();
 });

 test(title(L,'the Spanish pages fit a 320 px screen without horizontal scrolling','the <L> pages fit a 320 px screen without horizontal scrolling'),async({page})=>{
  await page.setViewportSize({width:320,height:700});
  for(const path of [`${P}/`,`${P}/labs/`,`${P}/labs/object-x/`,`${P}/labs/stellar-classification/`,'/labs/hubble/']){
   await page.goto(path);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth),path).toBeLessThanOrEqual(320);
  }
 });
}
