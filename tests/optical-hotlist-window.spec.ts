import{test,expect,type Page}from'@playwright/test';
const card=(p:Page)=>p.locator('.telescope-motion');
async function open(page:Page){await page.clock.install();await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();}
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}
async function loadHubble(page:Page){await page.getByText('Original hot lists',{exact:true}).click();await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await expect(page.getByText('HTL rows loaded: 13.')).toBeVisible();}

test('View/Select shows the original list in RA order, searches, and slews through the J2000-fixed coordinate dialog',async({page})=>{
 await open(page);await tracking(page);
 await card(page).getByTestId('ob-view-select').click();
 await expect(page.getByTestId('ob-hotlist-box')).toContainText('No items in Observation List!');
 await page.getByTestId('ob-hotlist-box').getByRole('button',{name:'OK',exact:true}).click();
 await loadHubble(page);
 await card(page).getByTestId('ob-view-select').click();
 const win=page.getByTestId('ob-hotlist');await expect(win.getByRole('heading',{name:'Hot List File: Hubble.HTL'})).toBeVisible();
 await expect(win.getByTestId('ob-hotlist-rows').getByRole('radio')).toHaveCount(13);
 const native=await win.locator('[data-testid^="ob-hotlist-native-"]').allTextContents();
 const ras=native.map(t=>{const m=/(\d+)h (\d+)m ([\d.]+)s/.exec(t)!;return +m[1]+ +m[2]/60+ +m[3]/3600;});
 for(let i=1;i<ras.length;i++)expect(ras[i]).toBeGreaterThanOrEqual(ras[i-1]);
 // Slew without a selection: the box, the list stays.
 await win.getByTestId('ob-hotlist-slew').click();await expect(page.getByTestId('ob-hotlist-box')).toContainText('No hot-list row is selected');
 await page.getByTestId('ob-hotlist-box').getByRole('button',{name:'OK',exact:true}).click();await expect(win).toBeVisible();
 // Search: miss then hit.
 await win.getByTestId('ob-hotlist-search').click();await page.getByTestId('ob-hotlist-query').fill('zzzz');await page.getByTestId('ob-hotlist-query').press('Enter');
 await expect(page.getByTestId('ob-hotlist-box')).toContainText('"zzzz" Not Found.');await page.getByTestId('ob-hotlist-box').getByRole('button',{name:'OK',exact:true}).click();
 const target=native[4].slice(4).trim().slice(0,12);expect(native[4].startsWith('   5')).toBe(true);
 await win.getByTestId('ob-hotlist-search').click();await page.getByTestId('ob-hotlist-query').fill(target);await page.getByTestId('ob-hotlist-query').press('Enter');
 await expect(page.getByTestId('ob-hotlist-found')).toContainText('Search found row');
 const foundRow=win.locator('[data-found]');await expect(foundRow).toHaveCount(1);
 const foundIndex=await foundRow.evaluate(e=>Number(e.getAttribute('data-testid')!.split('-').pop())-1);expect(native[foundIndex]).toContain(target);await foundRow.getByRole('radio').check();
 await win.getByTestId('ob-hotlist-slew').click();
 await expect(win).toBeHidden();
 const dialog=page.getByTestId('ob-sky-coords');await expect(dialog).toBeVisible();await expect(page.getByTestId('ob-sky-hotlist-origin')).toBeVisible();
 await expect(page.getByTestId('ob-sky-epoch-1')).toBeDisabled();
 // Cancel returns to the list; Slew again, then OK and confirm.
 await page.getByTestId('ob-sky-cancel').click();await expect(win).toBeVisible();
 await win.getByTestId('ob-hotlist-slew').click();await page.getByTestId('ob-sky-ok').click();
 await expect(page.getByTestId('motion-confirm-note')).toContainText('Slew Telescope to Target Coordinates?');await expect(page.getByTestId('motion-confirm-note')).not.toContainText('B1950');
 await page.getByRole('button',{name:'Start programmed slew',exact:true}).click();await page.clock.runFor(20000);
 await expect(page.getByTestId('motion-phase')).toContainText('Programmed slew finished');
 const m=/(\d+)h (\d+)m ([\d.]+)s/.exec(native[foundIndex])!;
 expect(Math.abs(Number(await page.getByTestId('pointing-ra').textContent())-(+m[1]+ +m[2]/60+ +m[3]/3600))).toBeLessThan(0.0001);
});

test('the hot-list window fits a 320px screen',async({page})=>{
 await page.setViewportSize({width:320,height:720});await open(page);await loadHubble(page);
 await card(page).getByTestId('ob-view-select').click();const win=page.getByTestId('ob-hotlist');await expect(win).toBeVisible();
 const box=await win.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(320);
 await win.getByTestId('ob-hotlist-row-1').click();await expect(win.getByTestId('ob-hotlist-row-1')).toHaveAttribute('data-checked','true');
 await page.keyboard.press('Escape');await expect(win).toBeHidden();
});
