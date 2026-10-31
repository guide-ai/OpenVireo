import{test,expect,type Page}from'@playwright/test';
// Front R4: Show Object ID / Show Object Mag (env+0x2e81/0x2e80) — the guides force them on as VIREO's exercise menus do, and the
// photometer's IDText (0x4ffa30) follows the option.
const card=(p:Page)=>p.locator('.telescope-motion');
async function photometer(page:Page){await page.clock.install();await page.goto('/#photometer');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();}
async function run(page:Page){await page.getByRole('button',{name:'Start integration',exact:true}).click();await page.clock.runFor(100);await expect(page.getByTestId('photo-phase')).toHaveText('Integration complete');}

test('the photometer IDText reads Telescope, then Unknown with the option off, then Sky and the star name once a guide forces it on',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await photometer(page);await expect(page.getByTestId('photo-id-text')).toHaveText('Telescope');
 await run(page);await expect(page.getByTestId('photo-id-text')).toHaveText('Unknown');
 // Header › Guides › Pleiades photometry stands in for VIREO's Photometry menu (0x58a3a2: Show Object ID := 1).
 await page.getByTestId('pleiades-lab-open').click();await page.keyboard.press('Escape');
 await run(page);await expect(page.getByTestId('photo-id-text')).toHaveText('Sky');
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');await expect(page.getByTestId('photo-id-text')).toHaveText(/^N2230-\d{5}$/);
 await run(page);await expect(page.getByTestId('photo-id-text')).toHaveText(/^N2230-\d{5}$/);
 expect(errors).toEqual([]);
});

test('the Options dialog shows the forced options checked; Show Object Mag only after a spectra, Hubble or LSS guide',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await card(page).getByTestId('ob-options').click();
 await expect(page.getByTestId('ob-options-show-object-id')).not.toBeChecked();await expect(page.getByTestId('ob-options-show-object-mag')).not.toBeChecked();await page.keyboard.press('Escape');
 await page.getByTestId('pleiades-lab-open').click();await page.keyboard.press('Escape');
 await card(page).getByTestId('ob-options').click();
 await expect(page.getByTestId('ob-options-show-object-id')).toBeChecked();await expect(page.getByTestId('ob-options-show-object-mag')).not.toBeChecked();await page.keyboard.press('Escape');
 await page.getByTestId('classification-lab-open').click();await page.keyboard.press('Escape');
 await card(page).getByTestId('ob-options').click();await expect(page.getByTestId('ob-options-show-object-mag')).toBeChecked();
 // The student may still switch them off (Options OK), as in VIREO.
 await page.getByTestId('ob-options-show-object-id').uncheck();await page.getByTestId('ob-options-ok').click();
 await card(page).getByTestId('ob-options').click();await expect(page.getByTestId('ob-options-show-object-id')).not.toBeChecked();
});
