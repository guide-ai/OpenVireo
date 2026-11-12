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

// Front LAZY-OBS review 1 (docs/SEO.md, "Resolution").
const hold=async(page:Page)=>{let release=()=>{};const held=new Promise<void>(r=>{release=r;});
 await page.route(/\/src\/OpenVireo\.tsx/,async route=>{await held;await route.continue();});return release;};

test('review finding 3: Tools › Results Editors from the welcome shell still open and focus their editor',async({page})=>{
 test.setTimeout(90000);
 await settledWelcome(page);
 await page.getByTestId('results-observational').click();
 await expect(page).toHaveURL(/#spectrum$/,{timeout:30000});
 await expect(page.locator('.own-results-card')).toHaveAttribute('open','');await expect(page.locator('.own-results-card>summary')).toBeFocused();
 await page.goto('about:blank');await settledWelcome(page);
 await page.getByTestId('results-pulsar').click();
 await expect(page).toHaveURL(/#pulsar-analysis$/,{timeout:30000});
 const pulsar=page.getByTestId('saved-rows-disclosure');
 await expect(pulsar).toHaveAttribute('open','',{timeout:30000});await expect(pulsar.locator('summary').first()).toBeFocused();
});

test('review finding 4: the language dialog on the welcome shell offers no Save (nothing to save yet); after the app it does',async({page})=>{
 await settledWelcome(page);
 await page.getByTestId('language-select').selectOption('es-419');
 const dialog=page.getByTestId('language-confirm');await expect(dialog).toBeVisible();
 await expect(dialog.getByTestId('language-save')).toHaveCount(0);await expect(dialog.getByTestId('language-change')).toBeVisible();
 await expect(page.getByTestId('welcome-shell')).toHaveCount(1);
 await dialog.getByTestId('language-cancel').click();await expect(dialog).toHaveCount(0);
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();await expect(skyH1(page)).toBeVisible({timeout:30000});
 await page.getByTestId('language-select').selectOption('es-419');
 await expect(page.getByTestId('language-confirm').getByTestId('language-save')).toBeVisible();
});

test('review finding 5: after a failed fetch of the app, the next click tries again',async({page})=>{
 test.setTimeout(90000);
 let fail=true;
 await page.route(/\/src\/OpenVireo\.tsx/,route=>fail?route.abort('internetdisconnected'):route.continue());
 await settledWelcome(page);
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await expect(page.getByTestId('site-updated')).toBeVisible({timeout:30000});
 fail=false;
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await expect(skyH1(page)).toBeFocused({timeout:30000});await expect(page.getByTestId('site-updated')).toHaveCount(0);
});

test('review finding 6: a direct load whose app cannot be fetched shows the notice, not the welcome',async({page})=>{
 await page.route(/\/src\/OpenVireo\.tsx/,route=>route.abort('failed'));
 await page.goto('/#observatory');
 await expect(page.getByTestId('site-updated')).toBeVisible({timeout:30000});
 await expect(page.getByTestId('app-failed')).toBeVisible();
 await expect(welcomeH1(page)).toHaveCount(0);await expect(page.locator('[aria-current="page"]')).toHaveCount(0);
});

test('review finding 8: while the app loads, intents run in order; an address reached last wins; a chosen Restore is kept',async({page})=>{
 test.setTimeout(120000);
 // Explore, then a lab card: the observatory, then the Pleiades guide over it.
 let release=await hold(page);await settledWelcome(page);
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await welcome(page).getByRole('button',{name:en['home.pleiades'],exact:true}).click();
 release();
 await expect(page.getByTestId('pleiades-lab-dialog')).toBeVisible({timeout:30000});await expect(page).toHaveURL(/#observatory$/);
 // Explore, then an address typed during the load: the address wins.
 await page.unrouteAll();await page.goto('about:blank');release=await hold(page);await settledWelcome(page);
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await page.evaluate(()=>{location.hash='#pulsar-analysis';});
 release();
 await expect(page.locator('[data-route="pulsar-analysis"][aria-current="page"]').first()).toBeVisible({timeout:30000});
 await expect(page).toHaveURL(/#pulsar-analysis$/);
 // A Restore with its chosen file, then a click: the restore is performed.
 await page.unrouteAll();await page.goto('about:blank');await settledWelcome(page);
 const download=page.waitForEvent('download');await page.getByTestId('investigation-save').click();const saved=await (await download).path();
 await page.goto('about:blank');release=await hold(page);await settledWelcome(page);
 await page.getByTestId('investigation-more').click();
 const chooser=page.waitForEvent('filechooser');await page.getByTestId('investigation-restore').click();await (await chooser).setFiles(saved!);
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 release();
 await expect(page.getByText(/^Investigation restored\./).first()).toBeVisible({timeout:30000});
});

test('review finding 7: on a phone, Instructor mode from the Tools menu returns the focus to its item after Cancel',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await settledWelcome(page);
 await page.locator('.portal-header .tools-toggle').click();
 await page.getByTestId('instructor-mode-open').click();
 const confirm=page.getByTestId('instructor-mode-confirm');await expect(confirm).toBeVisible({timeout:30000});
 await confirm.getByTestId('instructor-mode-confirm-cancel').click();await expect(confirm).toHaveCount(0);
 await expect(page.getByTestId('instructor-mode-open')).toBeFocused();
 // A guide of the phone menu: Escape closes it and the focus goes back to its button, as from the app's own welcome.
 await page.goto('about:blank');await settledWelcome(page);
 await page.locator('.portal-header .tools-toggle').click();await page.getByTestId('pleiades-lab-open').click();
 await expect(page.getByTestId('pleiades-lab-dialog')).toBeVisible({timeout:30000});
 await page.keyboard.press('Escape');await expect(page.getByTestId('pleiades-lab-dialog')).toBeHidden();
 await expect(page.getByTestId('pleiades-lab-open')).toBeFocused();
});

test('review finding 9: the loading line is in a live region that exists before it appears',async({page})=>{
 const release=await hold(page);await settledWelcome(page);
 await expect(page.getByTestId('app-loading-region')).toHaveAttribute('role','status');await expect(page.getByTestId('app-loading')).toHaveCount(0);
 await welcome(page).getByRole('button',{name:en['home.explore'],exact:true}).click();
 await expect(page.getByTestId('app-loading-region').getByTestId('app-loading')).toHaveText(en['home.loadingObservatory']);
 release();await expect(skyH1(page)).toBeVisible({timeout:30000});
});
