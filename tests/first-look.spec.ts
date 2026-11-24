import {test,expect,type Page} from '@playwright/test';

// Front NEWCOMER NC1 (user decision, 2026-11-24; plan analysis/front-plans/front-newcomer.md §2.1): the first look, a guided
// four-step walk in the observatory shown by the guide companion strip (core/firstLook.ts). It ends on VIREO's original library
// photograph and spectrum of M82, which the page labels as library material, never as a new exposure.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const strip=(page:Page)=>id(page,'guide-companion');
async function show(page:Page){
 await id(page,'guide-companion-show').click();
 await expect(id(page,'guide-companion-spot')).toBeVisible({timeout:15_000});
}
async function observatory(page:Page,query=''){
 await page.goto(`/${query}#observatory`);
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:20_000});
}

test('the band\'s Guide me starts the first look: four steps with only Show me where and the page, ending on M82\'s library photograph and spectrum and the lab list',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:1280,height:800});
 await observatory(page);
 await expect(strip(page)).toHaveCount(0);
 const start=page.getByRole('button',{name:'Guide me (about 3 min)',exact:true});
 await start.click();
 await expect(start).toHaveCount(0);
 await expect(strip(page)).toHaveAttribute('data-lab','first-look');await expect(strip(page)).toHaveAttribute('data-step','dome');
 await expect(id(page,'guide-companion-lab')).toHaveText('First look');await expect(id(page,'guide-companion-step')).toHaveText('Step 1 of 4');
 await expect(id(page,'guide-companion-next')).toHaveText('Open the dome');
 // A guide without a window and without an exercise: no Full guide, no Restart exercise.
 await expect(id(page,'guide-companion-full')).toHaveCount(0);await expect(id(page,'guide-companion-restart')).toHaveCount(0);
 // Step details: the observatory band's own help line.
 await id(page,'guide-companion-details-toggle').click();
 await expect(id(page,'guide-companion-details')).toHaveText('Reveal the catalog sky and enable the telescope controls.');
 await id(page,'guide-companion-details-toggle').click();

 // 1 · the dome.
 await show(page);
 const dome=id(page,'dome-open');await expect(dome).toBeFocused();
 await dome.click();
 await expect(strip(page)).toHaveAttribute('data-step','point');
 await expect(id(page,'guide-companion-next')).toHaveText('Choose M82 and point the telescope at it');
 await expect(page.locator('.first-steps li.current')).toContainText('2 · Choose and point');
 // 2 · M81 is preselected: Show me where outlines the picker first, then Point telescope once M82 is chosen.
 await show(page);
 const picker=page.locator('#target');await expect(picker).toBeFocused();
 await picker.selectOption('NGC3034');
 await show(page);
 const point=page.locator('#point-target');await expect(point).toBeFocused();
 await point.click();
 await expect(page.getByTestId('pointing-ra')).toHaveText('9.93000');
 await expect(strip(page)).toHaveAttribute('data-step','look');
 await expect(id(page,'guide-companion-next')).toHaveText('Look at it through the telescope');
 await expect(page.locator('.first-steps li.current')).toContainText('3 · Explore an instrument');
 // 3 · the telescope view shows VIREO's original library photograph of M82, labelled as such.
 await show(page);
 const telescope=page.locator('#to-telescope');await expect(telescope).toBeFocused();
 await telescope.click();
 const image=page.getByRole('img',{name:'Original CLEA library image of M82 · NGC 3034'});
 await expect(image).toBeVisible();
 await expect(page.locator('.reference-card')).toContainText('not new exposures taken in OpenVireo');
 await expect(strip(page)).toHaveAttribute('data-step','spectrum');
 await expect(id(page,'guide-companion-next')).toHaveText('Open its spectrum');
 await id(page,'guide-companion-details-toggle').click();
 await expect(id(page,'guide-companion-details')).toHaveText('Only some objects have a spectrum in VIREO\'s library; M82 has one. It is VIREO\'s original library spectrum, not a new observation.');
 await id(page,'guide-companion-details-toggle').click();
 await page.screenshot({path:test.info().outputPath('first-look-1280.png')});
 // 4 · the analyser shows VIREO's library spectrum, labelled as such.
 await show(page);
 const analyzer=page.locator('#open-analyzer');await expect(analyzer).toBeFocused();await expect(analyzer).toBeEnabled();
 await analyzer.click();
 await expect(page.locator('.library-context')).toContainText('NGC3034.SP');
 await expect(page.locator('.library-context')).toContainText('not a spectrum acquired by the web telescope');
 await expect(strip(page)).toHaveAttribute('data-step','done');await expect(strip(page)).toHaveAttribute('data-all-done','true');
 await expect(id(page,'guide-companion-next')).toHaveText('You have taken a first look. Choose a lab to go further.');
 await expect(id(page,'guide-companion-step')).toHaveCount(0);
 // The first look stays done once the spectrum was seen, whatever is pointed at next.
 await page.getByRole('button',{name:'← Return to observatory',exact:true}).click();
 await page.locator('#target').selectOption('NGC3031');
 await page.locator('#point-target').click();
 await expect(strip(page)).toHaveAttribute('data-step','done');
 // The closing line's Show me where: the welcome's lab list.
 await show(page);
 await expect(page).toHaveURL(/#home$/);
 await expect(page.locator('#home-labs')).toBeFocused();await expect(page.locator('#home-labs')).toBeInViewport();
 // Hide removes it.
 await id(page,'guide-companion-hide').click();
 await expect(strip(page)).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('an object without a library spectrum: the spectrum step points at the picker; a lab guide replaces the first look, and Help › Take a first look brings it back',async({page})=>{
 await observatory(page);
 await page.getByRole('button',{name:'Guide me (about 3 min)',exact:true}).click();
 await id(page,'dome-open').click();
 // M81 (preselected) has a photograph and no spectrum.
 await page.locator('#to-telescope').click();
 await expect(page.getByRole('img',{name:/Original CLEA library image of M81/})).toBeVisible();
 await expect(strip(page)).toHaveAttribute('data-step','spectrum');
 await expect(page.locator('#open-analyzer')).toHaveCount(0);
 await show(page);
 await expect(page.locator('#target')).toBeFocused();
 // Closing the dome takes the walk back to its first step.
 await page.getByRole('button',{name:'Close dome',exact:true}).click();
 await expect(strip(page)).toHaveAttribute('data-step','dome');
 // One strip: opening a lab guide replaces the first look.
 await page.locator('.portal-header nav').getByRole('button',{name:'Pulsar guide',exact:true}).click();
 const guide=page.locator('dialog.hubble-lab-dialog[open]');
 await expect(guide).toBeVisible();await page.keyboard.press('Escape');await expect(guide).toHaveCount(0);
 await expect(strip(page)).toHaveAttribute('data-lab','pulsars');
 await expect(page.getByRole('button',{name:'Guide me (about 3 min)',exact:true})).toBeVisible();
 // Help › Take a first look, from another page: the observatory and the first look again.
 await page.goto('/#spectrum');
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:20_000});
 await id(page,'main-help-menu').click();
 await page.locator('#main-help-first-look').click();
 await expect(page).toHaveURL(/#observatory$/);
 await expect(strip(page)).toHaveAttribute('data-lab','first-look');await expect(strip(page)).toHaveAttribute('data-step','dome');
});

test('Help › Take a first look from the welcome loads the observatory with the first look',async({page})=>{
 await page.goto('/');
 await expect(page.getByTestId('welcome-shell')).toBeVisible({timeout:20_000});
 await id(page,'main-help-menu').click();
 await page.locator('#main-help-first-look').click();
 await expect(page).toHaveURL(/#observatory$/,{timeout:30_000});
 await expect(strip(page)).toHaveAttribute('data-lab','first-look',{timeout:30_000});
 await expect(id(page,'guide-companion-next')).toHaveText('Open the dome');
});

test('Spanish at 375 px: the first look in the visitor\'s language, inside the window and under half of it',async({page})=>{
 await page.setViewportSize({width:375,height:740});
 await observatory(page,'?lang=es-419');
 const start=page.getByRole('button',{name:'Guíame (unos 3 min)',exact:true});
 // Under the band, full width on a phone, and inside the window.
 const button=(await start.boundingBox())!;expect(button.x+button.width).toBeLessThanOrEqual(375.5);
 await page.screenshot({path:test.info().outputPath('first-look-band-375-es.png')});
 await start.click();
 await expect(id(page,'guide-companion-lab')).toHaveText('Primer vistazo');await expect(id(page,'guide-companion-step')).toHaveText('Paso 1 de 4');
 await expect(id(page,'guide-companion-next')).toHaveText('Abre la cúpula');
 await id(page,'dome-open').click();
 await expect(id(page,'guide-companion-next')).toHaveText('Elige M82 y apunta el telescopio hacia ella');
 const bar=(await strip(page).boundingBox())!;
 expect(bar.x).toBeGreaterThanOrEqual(0);expect(bar.x+bar.width).toBeLessThanOrEqual(375.5);
 expect(bar.y+bar.height).toBeLessThanOrEqual(740.5);expect(bar.height).toBeLessThanOrEqual(740*.45+1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 await show(page);await expect(page.locator('#target')).toBeFocused();
 await page.screenshot({path:test.info().outputPath('first-look-375-es.png')});
});

test('right to left: the band\'s button and the strip stay inside the window',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await observatory(page,'?lang=qps-rtl');
 await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 await page.locator('.first-look-start button').click();
 await expect(strip(page)).toHaveAttribute('data-lab','first-look');
 const bar=(await strip(page).boundingBox())!;
 expect(bar.x).toBeGreaterThanOrEqual(0);expect(bar.x+bar.width).toBeLessThanOrEqual(1280.5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});
