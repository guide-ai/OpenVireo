import {test,expect,type Page} from '@playwright/test';
import en from '../src/i18n/en.json' with {type:'json'};

// Front LAZY-OBS: the welcome (`/`) loads only the app shell; the observatory's code, catalogs, sky data, GSC tiles, spectra and
// instruments load on the first action that needs them, which the app then performs (src/home/appGate.ts). The heavy list below
// is what the welcome loaded before this front (docs/RENDER-BUDGET.md, "Front LAZY-OBS"): the app module itself, every bundled
// data module (/data/…), every original resource (/original/…: hot lists, GSC tiles, spectra, images) and the camera catalogs,
// and the observatory's instrument modules. Dev server URLs (/src/…) and production chunk names (/assets/Name-hash.js) both match.
const HEAVY=[/^\/data\//,/^\/original\//,/^\/camera\//,/\/(src\/|assets\/)OpenVireo[-.]/,/\/src\/(SpectrumInstrument|CameraControl|OpticalTelescope|Spectrometer)\.tsx$/,/\/src\/core\/sky\.ts$/];
const heavy=(url:string)=>{const path=new URL(url).pathname;return HEAVY.some(r=>r.test(path));};
function recordRequests(page:Page){const urls:string[]=[];page.on('request',r=>urls.push(r.url()));return urls;}
const welcomeH1=(page:Page)=>page.getByRole('heading',{level:1,name:en['home.title'],exact:true});
const skyH1=(page:Page)=>page.getByRole('heading',{level:1,name:'Start with the sky.',exact:true});
const welcome=(page:Page)=>page.getByRole('region',{name:en['home.title']});
async function settledWelcome(page:Page,path='/'){
 await page.goto(path);await expect(welcomeH1(page)).toBeVisible({timeout:30000});
 await page.waitForLoadState('networkidle');
}

test('the welcome requests no observatory code or data; Explore the sky loads it and the observatory works',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const urls=recordRequests(page);
 await settledWelcome(page);
 expect(urls.filter(heavy),'the welcome must not load the observatory').toEqual([]);
 const before=urls.length;
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await expect(page).toHaveURL(/#observatory$/);await expect(skyH1(page)).toBeFocused({timeout:30000});
 // The app and its data are now fetched.
 const later=urls.slice(before);
 expect(later.some(u=>/OpenVireo/.test(u))).toBe(true);
 await expect.poll(()=>urls.slice(before).filter(heavy).length).toBeGreaterThan(5);
 // The observatory works as before: open the dome, choose a target, point, and the telescope view builds the field.
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await page.getByLabel('Target',{exact:true}).selectOption('N0000.DAT@14428');
 await page.getByRole('button',{name:'Point telescope ↗',exact:true}).click();
 await page.getByRole('button',{name:'Switch to telescope view ↗',exact:true}).click();
 await expect(page.getByTestId('camera-control')).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);expect(errors).toEqual([]);
});

test('a lab card on the welcome loads the app, opens its guide, and the guide reaches the observatory and points',async({page})=>{
 test.setTimeout(120000);
 const urls=recordRequests(page);
 await settledWelcome(page);expect(urls.filter(heavy)).toEqual([]);
 await welcome(page).getByRole('button',{name:en['home.pleiades'],exact:true}).click();
 const guide=page.getByTestId('pleiades-lab-dialog');await expect(guide).toBeVisible({timeout:30000});
 await guide.getByRole('button',{name:en['pleiadesLab.goObservatory'],exact:true}).first().click();
 await expect(page).toHaveURL(/#observatory$/);await expect(skyH1(page)).toBeVisible();
 // The Pleiades exercise list, the dome and a pointing at its first row (PLEIADES.HTL entry 1).
 await page.getByRole('heading',{name:'Original hot lists',exact:true}).click();
 await page.getByRole('button',{name:'Load exercise list (PLEIADES.HTL)',exact:true}).click();await expect(page.locator('#htl-rows option')).toHaveCount(24);
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await page.locator('#htl-rows').selectOption('0');await page.getByRole('button',{name:'Point to HTL selection',exact:true}).click();
 await expect(page.getByTestId('pointing-ra')).toHaveText('3.68833');await expect(page.getByTestId('pointing-dec')).toHaveText('23.96667');
 await expect(page.getByTestId('pleiades-point-card')).toHaveAttribute('data-admitted','true');
});

test('#lab= and other addresses load the app at once; the welcome keeps the shell until it is needed',async({page})=>{
 test.setTimeout(120000);
 const urls=recordRequests(page);
 await page.goto('/#lab=hubble');await expect(page.locator('dialog[open]')).toContainText('Your Hubble investigation',{timeout:30000});
 expect(urls.some(heavy)).toBe(true);await expect(page).toHaveURL(/#observatory$/);
 await page.keyboard.press('Escape');await expect(skyH1(page)).toBeVisible();
 // Back to the welcome after the app is in: the app's own welcome, with no shell and no loading line.
 await page.locator('.portal-brand').click();await expect(welcomeH1(page)).toBeVisible();
 await expect(page.getByTestId('welcome-shell')).toHaveCount(0);await expect(page.getByTestId('app-loading')).toHaveCount(0);
 // A direct load of another page.
 await page.goto('about:blank');urls.length=0;
 // As when the app was a static import, its first render comes before the load event (src/appEntry.ts): specs and scripts that
 // act right after page.goto see the page, not an empty root.
 await page.goto('/#spectrum');expect(await page.locator('[data-route="spectrum"][aria-current="page"]').count()).toBeGreaterThan(0);
 expect(urls.some(heavy)).toBe(true);
 // Back and Forward from the welcome shell to another page load the app, which shows that page.
 await page.goto('about:blank');await settledWelcome(page);await page.evaluate(()=>{location.hash='#observatory';});
 await expect(skyH1(page)).toBeVisible({timeout:30000});
 await page.goBack();await expect(welcomeH1(page)).toBeVisible();
});

test('Save and Restore investigation from the welcome shell load the app and work as before; the focus stays on More',async({page})=>{
 test.setTimeout(120000);
 await settledWelcome(page);
 const download=page.waitForEvent('download');
 await page.getByTestId('investigation-save').click();
 const saved=await (await download).path();
 expect(saved).toBeTruthy();
 await page.goto('about:blank');
 const urls=recordRequests(page);
 await settledWelcome(page);expect(urls.filter(heavy)).toEqual([]);
 await page.getByTestId('investigation-more').click();
 const chooser=page.waitForEvent('filechooser');await page.getByTestId('investigation-restore').click();
 await (await chooser).setFiles(saved!);
 await expect(page.getByText(/^Investigation restored\./).first()).toBeVisible({timeout:30000});
 await expect(page.getByTestId('investigation-more')).toBeFocused();
});

test('a guide card keeps its focus across the swap: closing the guide returns to the card',async({page})=>{
 await settledWelcome(page);
 const card=welcome(page).getByRole('button',{name:en['home.objectX'],exact:true});
 await card.click();await expect(page.locator('dialog[open]')).toContainText('The quest for Object X',{timeout:30000});
 await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);
 await expect(card).toBeFocused();
});

test('while the app loads the welcome says so; if it cannot be loaded, the site-updated notice offers Reload',async({page})=>{
 test.setTimeout(90000);
 let release=()=>{};const held=new Promise<void>(r=>{release=r;});
 await page.route(/\/src\/OpenVireo\.tsx/,async route=>{await held;await route.continue();});
 await settledWelcome(page);
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await expect(page.getByTestId('app-loading')).toHaveText(en['home.loadingObservatory']);
 await expect(page.getByTestId('welcome-shell')).toHaveAttribute('aria-busy','true');
 release();await expect(skyH1(page)).toBeFocused({timeout:30000});
 await page.unroute(/\/src\/OpenVireo\.tsx/);
 // A fresh page whose app chunk fails (an old tab after a redeploy).
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('about:blank');await page.route(/\/src\/OpenVireo\.tsx/,route=>route.abort('failed'));
 await settledWelcome(page);
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await expect(page.getByTestId('site-updated')).toBeVisible({timeout:30000});
 await expect(page.getByTestId('recovery-reload')).toBeVisible();await expect(welcomeH1(page)).toBeVisible();
});
