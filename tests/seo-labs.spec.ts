import {test,expect} from '@playwright/test';

// Front SEO (user request, 2026-11-08): the static lab overview pages under /labs/ and their "Open the lab" links, which open
// the lab's guide in the app as its Guides menu button does. The dev server serves the same pages the build writes to dist/.
const GUIDES=[
 {slug:'hubble',title:'Your Hubble investigation'},
 {slug:'large-scale-structure',title:'Mapping large-scale structure'},
 {slug:'stellar-classification',title:'Classify a practice star'},
 {slug:'pleiades',title:'Your Pleiades photometry'},
 {slug:'pulsars',title:'Pulsar timing guide'},
 {slug:'object-x',title:'The quest for Object X'},
] as const;

test('a lab page is plain HTML with its own title, and Open the lab opens that guide in the observatory',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/labs/pulsars/');
 await expect(page).toHaveTitle('Radio astronomy of pulsars lab (CLEA VIREO) · OpenVireo');
 await expect(page.getByRole('heading',{level:1})).toHaveText('Radio astronomy of pulsars');
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://openvireo.space/labs/pulsars/');
 await page.getByRole('link',{name:'Open the lab'}).click();
 const guide=page.locator('dialog[open]');
 await expect(guide).toBeVisible({timeout:15000});await expect(guide).toContainText('Pulsar timing guide');
 // The one-time link is gone, so a reload or a copied address shows the plain observatory.
 await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('');
 await page.keyboard.press('Escape');await expect(guide).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await expect(page.locator('dialog[open]')).toHaveCount(0);
 expect(errors).toEqual([]);
});

for(const {slug,title} of GUIDES)test(`#lab=${slug} opens its guide`,async({page})=>{
 await page.goto(`/#lab=${slug}`);
 const guide=page.locator('dialog[open]');
 await expect(guide).toBeVisible({timeout:15000});await expect(guide).toContainText(title);await expect(guide).toHaveCount(1);
});

test('#lab=cluster-hr opens the cluster database with its guide; an unknown lab leaves the observatory as it is',async({page})=>{
 await page.goto('/#lab=cluster-hr');
 await expect(page.locator('dialog[open]')).toBeVisible({timeout:15000});
 await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('#cluster-database');
 await page.goto('/#lab=nope');await page.reload();
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('the labs index, sitemap and robots.txt link every lab; the observatory footer links the index',async({page,request})=>{
 await page.goto('/labs/');
 const cards=page.locator('.cards a');await expect(cards).toHaveCount(7);
 const xml=await (await request.get('/sitemap.xml')).text();
 for(const href of await cards.evaluateAll(as=>as.map(a=>(a as HTMLAnchorElement).getAttribute('href'))))expect(xml).toContain(`https://openvireo.space${href}</loc>`);
 expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://openvireo.space/sitemap.xml');
 await page.goto('/#observatory');await page.getByRole('link',{name:'About the seven labs'}).click();
 await expect(page).toHaveURL(/\/labs\/$/);await expect(page.getByRole('heading',{level:1})).toHaveText('Astronomy labs in your browser');
});

test('a lab page fits a 320 px screen without horizontal scrolling',async({page})=>{
 await page.setViewportSize({width:320,height:700});
 for(const path of ['/labs/','/labs/object-x/']){
  await page.goto(path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 }
});
