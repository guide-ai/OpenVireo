import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE} from '../fixtures/language';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import {LANGUAGE_STORAGE_KEY} from '../../src/i18n/locale';

// Front ES-SEO (user decision 8 of 2026-11-09; docs/I18N.md, "Spanish: search pages"): the static Spanish home page /es/ and
// the Spanish lab pages /es/labs/, served by the dev server as the build writes them to dist/. These tests run in an English
// (en-US) browser unless they say otherwise: a Spanish page opens the app in Spanish through `?lang=es-419` (that load only,
// never stored), and every Spanish page links its English version.
const stored=(page:import('@playwright/test').Page)=>page.evaluate(key=>{try{return localStorage.getItem(key);}catch{return 'unreadable';}},LANGUAGE_STORAGE_KEY);

test('/es/ is a static Spanish page; Abrir el observatorio opens the app in Spanish without storing a choice, and English goes back',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/es/');
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');
 await expect(page).toHaveTitle('OpenVireo: prácticas de astronomía de CLEA VIREO en español');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Prácticas de astronomía de CLEA VIREO, en tu navegador');
 await expect(page.locator('.cards a')).toHaveCount(7);
 await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href','https://openvireo.space/');
 await page.getByRole('link',{name:'Abrir el observatorio'}).first().click();
 await expect(page.getByRole('heading',{level:1,name:es['sky.title']})).toBeVisible({timeout:15_000});
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');
 expect(new URL(page.url()).search).toBe('?lang=es-419');expect(await stored(page)).toBeNull();
 // An English browser opening the plain address afterwards still gets English (nothing was stored).
 await page.goto('/');await expect(page.getByRole('heading',{level:1,name:en['sky.title']})).toBeVisible({timeout:15_000});
 await page.goto('/es/');await page.getByRole('navigation',{name:'Sitio'}).getByRole('link',{name:'English'}).click();
 await expect(page.getByRole('heading',{level:1,name:en['sky.title']})).toBeVisible({timeout:15_000});
 expect(new URL(page.url()).search).toBe('?lang=en');
 expect(errors).toEqual([]);
});

test('a Spanish browser that follows English from /es/ gets English, as ?lang=en beats the browser language',async({browser})=>{
 const context=await browser.newContext({locale:SPANISH_LOCALE});const page=await context.newPage();
 await page.goto('/es/');await page.getByRole('navigation',{name:'Sitio'}).getByRole('link',{name:'English'}).click();
 await expect(page.getByRole('heading',{level:1,name:en['sky.title']})).toBeVisible({timeout:15_000});
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await context.close();
});

for(const {slug,guide} of [{slug:'pulsars',guide:es['pulsarLab.title']},{slug:'object-x',guide:'En busca del Objeto X'}])
 test(`/es/labs/${slug}/: Abrir la práctica opens that guide in Spanish and leaves ?lang=es-419 without the #lab= link`,async({page})=>{
  await page.goto(`/es/labs/${slug}/`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://openvireo.space/es/labs/${slug}/`);
  await page.getByRole('link',{name:'Abrir la práctica'}).click();
  const dialog=page.locator('dialog[open]');
  await expect(dialog).toBeVisible({timeout:15_000});await expect(dialog).toContainText(guide);
  await expect(page.locator('html')).toHaveAttribute('lang','es-419');
  await expect.poll(()=>page.evaluate(()=>[location.search,location.hash])).toEqual(['?lang=es-419','']);
  expect(await stored(page)).toBeNull();
 });

test('the Spanish cluster lab link opens the Spanish cluster database guide and keeps ?lang=es-419',async({page})=>{
 await page.goto('/es/labs/cluster-hr/');await page.getByRole('link',{name:'Abrir la práctica'}).click();
 await expect(page.locator('dialog[open]')).toContainText(es['clusterLab.title'],{timeout:15_000});
 await expect.poll(()=>page.evaluate(()=>[location.search,location.hash])).toEqual(['?lang=es-419','#cluster-database']);
});

test('the dev server, like Pages, redirects /es, /es/labs and /es/labs/<slug> to the trailing-slash address',async({request})=>{
 for(const path of ['/es','/es/labs','/es/labs/hubble']){const r=await request.get(path,{maxRedirects:0});expect([r.status(),r.headers().location]).toEqual([308,`${path}/`]);}
});

test('the Spanish and English lab pages link each other; the Spanish index lists the seven Spanish lab pages',async({page})=>{
 await page.goto('/labs/hubble/');
 await page.getByRole('link',{name:'Español'}).click();
 await expect(page).toHaveURL(/\/es\/labs\/hubble\/$/);await expect(page.getByRole('heading',{level:1})).toHaveText('La ley de Hubble: la relación entre corrimiento al rojo y distancia');
 await page.getByRole('navigation',{name:'Sitio'}).getByRole('link',{name:'English'}).click();
 await expect(page).toHaveURL(/\/labs\/hubble\/$/);await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.goto('/es/labs/');
 const cards=page.locator('.cards a');await expect(cards).toHaveCount(7);
 for(const href of await cards.evaluateAll(as=>as.map(a=>(a as HTMLAnchorElement).getAttribute('href'))))expect(href).toMatch(/^\/es\/labs\/[a-z-]+\/$/);
});

test('in Spanish, the observatory footer links the Spanish labs index in a new tab',async({browser})=>{
 const context=await browser.newContext({locale:SPANISH_LOCALE});const page=await context.newPage();
 await page.goto('/#observatory');
 const link=page.getByRole('link',{name:`${es['sky.labsLink']} ${es['sky.labsLinkNewTab']}`});
 await expect(link).toHaveAttribute('href','/es/labs/',{timeout:15_000});await expect(link).toHaveAttribute('target','_blank');
 const [tab]=await Promise.all([context.waitForEvent('page'),link.click()]);
 await expect(tab).toHaveURL(/\/es\/labs\/$/);await expect(tab.getByRole('heading',{level:1})).toHaveText('Prácticas de astronomía en tu navegador');
 await context.close();
});

test('the Spanish pages fit a 320 px screen without horizontal scrolling',async({page})=>{
 await page.setViewportSize({width:320,height:700});
 for(const path of ['/es/','/es/labs/','/es/labs/object-x/','/es/labs/stellar-classification/']){
  await page.goto(path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth),path).toBeLessThanOrEqual(320);
 }
});
