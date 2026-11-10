import {test,expect,type Page} from '@playwright/test';
import en from '../src/i18n/en.json' with {type:'json'};
import es from '../src/i18n/es/es.json' with {type:'json'};
import pt from '../src/i18n/pt-br/pt-br.json' with {type:'json'};

// Front HOME (user decision, 2026-11-10): `/` opens the welcome, its own page (`home`): what the site is, three facts, one
// button to the free-exploration page (`#observatory`, unchanged) and the seven labs as cards that open their guides through the
// Guides menu's own openers. The first-visit tour moved to the exploration page.
const welcome=(page:Page)=>page.getByRole('region',{name:en['home.title']});
const h1=(page:Page,name=en['home.title'])=>page.getByRole('heading',{level:1,name,exact:true});
const LABS=[
 {slug:'hubble',name:en['home.hubble'],title:'Your Hubble investigation'},
 {slug:'large-scale-structure',name:en['home.lss'],title:'Mapping large-scale structure'},
 {slug:'stellar-classification',name:en['home.classification'],title:'Classify a practice star'},
 {slug:'pleiades',name:en['home.pleiades'],title:'Your Pleiades photometry'},
 {slug:'cluster-hr',name:en['home.clusterHr'],title:'Ages and distances of star clusters'},
 {slug:'pulsars',name:en['home.pulsars'],title:'Pulsar timing guide'},
 {slug:'object-x',name:en['home.objectX'],title:'The quest for Object X'},
] as const;
/** The Guides menu button of each lab (the sidebar's Exercise guides section). */
const MENU:Record<string,string>={hubble:en['lab.nav'],'large-scale-structure':en['lssLab.nav'],'stellar-classification':en['classLab.nav'],pleiades:en['pleiadesLab.nav'],'cluster-hr':'Cluster HR guide',pulsars:en['pulsarLab.nav'],'object-x':'Object X guide'};

test('/ opens the welcome: what the site is, three facts, the explore button and the seven labs, without the observatory',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(h1(page)).toBeVisible({timeout:15000});
 const w=welcome(page);
 await expect(w.getByText(en['home.lead'])).toBeVisible();
 const facts=w.getByRole('list',{name:en['home.factsLabel']}).getByRole('listitem');
 await expect(facts).toHaveText([en['home.factInstall'],en['home.factFree'],en['home.factFaithful']]);
 const cards=w.getByRole('list',{name:en['home.labsHeading']}).getByRole('button');
 await expect(cards).toHaveCount(7);
 for(const [i,l] of LABS.entries()){await expect(cards.nth(i)).toHaveAccessibleName(l.name);await expect(cards.nth(i)).toHaveAccessibleDescription(en[`home.${({hubble:'hubble','large-scale-structure':'lss','stellar-classification':'classification',pleiades:'pleiades','cluster-hr':'clusterHr',pulsars:'pulsars','object-x':'objectX'} as const)[l.slug]}Summary`]);}
 await expect(w.getByRole('button',{name:en['home.explore'],exact:true})).toBeVisible();
 await expect(page.getByTestId('page-bar-place')).toHaveText(en['home.pageName']);
 // The exploration page is not shown: no first steps, no telescope, no observatory heading.
 await expect(page.locator('.first-steps')).toBeHidden();await expect(page.getByRole('button',{name:'Open dome ↗',exact:true})).toBeHidden();
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeHidden();
 // Compact: the seven cards fit the first screen at 1440 × 1050.
 expect((await cards.nth(6).boundingBox())!.y+(await cards.nth(6).boundingBox())!.height).toBeLessThan(1050);
 await expect(page.getByRole('alert')).toHaveCount(0);expect(errors).toEqual([]);
});

for(const lab of LABS)test(`the ${lab.slug} card opens the same guide as its Guides menu button`,async({page})=>{
 await page.goto('/');await expect(h1(page)).toBeVisible({timeout:15000});
 await welcome(page).getByRole('button',{name:lab.name,exact:true}).click();
 const guide=page.locator('dialog[open]');
 await expect(guide).toContainText(lab.title,{timeout:15000});await expect(guide).toHaveCount(1);
 const fromCard={hash:await page.evaluate(()=>location.hash),text:(await guide.innerText()).slice(0,200)};
 await page.keyboard.press('Escape');await expect(guide).toHaveCount(0);
 // The menu button of the same lab, from a fresh welcome, gives the same guide and the same page.
 await page.goto('about:blank');await page.goto('/');await expect(h1(page)).toBeVisible({timeout:15000});
 await page.locator('[data-nav-group="guides"]').getByRole('button',{name:MENU[lab.slug],exact:true}).click();
 await expect(guide).toContainText(lab.title,{timeout:15000});
 expect({hash:await page.evaluate(()=>location.hash),text:(await guide.innerText()).slice(0,200)}).toEqual(fromCard);
});

test('Explore the sky opens the exploration page; Back and the brand link return to the welcome; #observatory opens it directly',async({page})=>{
 await page.goto('/');await expect(h1(page)).toBeVisible({timeout:15000});
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await expect(page).toHaveURL(/#observatory$/);
 await expect(h1(page,'Start with the sky.')).toBeFocused();await expect(page.locator('.first-steps')).toBeVisible();
 await expect(page.getByTestId('page-bar-place')).toHaveText('Optical observatory Observatory');
 await expect(welcome(page)).toBeHidden();
 await page.goBack();await expect(h1(page)).toBeVisible();await expect(h1(page)).toBeFocused();
 await page.goForward();await expect(h1(page,'Start with the sky.')).toBeVisible();
 await page.locator('.portal-brand').click();await expect(h1(page)).toBeVisible();await expect(page).toHaveURL(/#home$/);
 await page.goto('about:blank');await page.goto('/#observatory');
 await expect(h1(page,'Start with the sky.')).toBeVisible({timeout:15000});await expect(welcome(page)).toBeHidden();
 await page.goto('about:blank');await page.goto('/#home');await expect(h1(page)).toBeVisible({timeout:15000});
});

test('the welcome fits a 320 px screen without horizontal scrolling, one card per row',async({page})=>{
 await page.setViewportSize({width:320,height:800});
 await page.goto('/');await expect(h1(page)).toBeVisible({timeout:15000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const cards=welcome(page).getByRole('list',{name:en['home.labsHeading']}).getByRole('button');
 const [a,b]=[(await cards.nth(0).boundingBox())!,(await cards.nth(1).boundingBox())!];
 expect(b.y).toBeGreaterThan(a.y+a.height-1);expect(a.x+a.width).toBeLessThanOrEqual(320);
});

for(const [query,cat] of [['?lang=es-419',es],['?lang=pt-BR',pt]] as const)test(`the welcome is translated under ${query}`,async({page})=>{
 await page.goto(`/${query}`);await expect(h1(page,cat['home.title'])).toBeVisible({timeout:30000});
 const w=page.getByRole('region',{name:cat['home.title']});
 await expect(w.getByRole('list',{name:cat['home.factsLabel']}).getByRole('listitem')).toHaveText([cat['home.factInstall'],cat['home.factFree'],cat['home.factFaithful']]);
 await expect(w.getByRole('button',{name:cat['home.objectX'],exact:true})).toHaveAccessibleDescription(cat['home.objectXSummary']);
 await expect(page.getByTestId('page-bar-place')).toHaveText(cat['home.pageName']);
 await w.getByRole('button',{name:cat['home.explore'],exact:true}).click();
 await expect(page.getByRole('heading',{level:1,name:cat['sky.title']})).toBeFocused();
});

// The site skips its first-visit aids in automated browsers (navigator.webdriver), so these tests present a visitor's browser.
const asVisitor=(page:Page)=>page.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'webdriver',{configurable:true,get:()=>false});});
test('the first-visit tour waits for the exploration page: not on the welcome, then once there',async({page})=>{
 await asVisitor(page);
 await page.goto('/');await expect(h1(page)).toBeVisible({timeout:15000});
 await page.waitForTimeout(1500);await expect(page.getByTestId('site-tour')).toHaveCount(0);
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await expect(page.getByTestId('site-tour')).toBeVisible();await expect(page.getByTestId('site-tour')).toContainText('Step 1 of 6');
 // Every step's part is on the exploration page.
 for(const sel of ['.portal-header nav','[data-nav-group="guides"]','.first-steps','[data-testid="investigation-actions"]','.page-bar .help-trigger'])await expect(page.locator(sel).first()).toBeVisible();
});

test('a visitor arriving through #lab= gets the guide and no tour, even on reaching the exploration page',async({page})=>{
 await asVisitor(page);
 await page.goto('/#lab=pulsars');await expect(page.locator('dialog[open]')).toContainText('Pulsar timing guide',{timeout:15000});
 await page.keyboard.press('Escape');await page.locator('.portal-brand').click();await expect(h1(page)).toBeVisible();
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();await expect(h1(page,'Start with the sky.')).toBeVisible();
 await page.waitForTimeout(1500);await expect(page.getByTestId('site-tour')).toHaveCount(0);
});
