import{test,expect,type Page}from'@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import{readFile}from'node:fs/promises';
const card=(p:Page)=>p.locator('.telescope-motion');
async function save(page:Page){const event=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();return readFile((await(await event).path())!);}
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}

test('daily use: date, site, options, hot list slew, add current, Save and fresh Restore',async({page})=>{
 await page.clock.install();await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 // Tonight's date (UT) and a student site override.
 await page.getByText('Site clock · fixed UT scenario',{exact:true}).click();
 await page.getByTestId('ob-set-date').click();await page.getByTestId('ob-date-date').fill('2026/10/28');await page.getByTestId('ob-date-time').fill('02:00:00');await page.getByTestId('ob-date-ok').click();
 await expect(page.getByTestId('site-clock-ut')).toHaveText('2026-10-28 02:00:00 UT');
 await page.getByTestId('ob-site-parameters').click();await page.getByTestId('ob-station-name').fill('Classroom roof');await page.getByTestId('ob-station-horizon').fill('0');await page.getByTestId('ob-station-ok').click();
 await expect(page.getByTestId('ob-site-status')).toContainText('Classroom roof');
 // Hot list: load Hubble.HTL, pick a visible row and slew.
 await page.getByText('Original hot lists',{exact:true}).click();await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await expect(page.getByText('HTL rows loaded: 13.')).toBeVisible();
 await tracking(page);
 await card(page).getByTestId('ob-view-select').click();await page.getByTestId('ob-hotlist-row-1').click();await page.getByTestId('ob-hotlist-slew').click();await page.getByTestId('ob-sky-ok').click();
 await page.getByRole('button',{name:'Start programmed slew',exact:true}).click();await page.clock.runFor(30000);await expect(page.getByTestId('motion-phase')).toContainText('Programmed slew finished');
 // Add the current position to the list.
 await card(page).getByTestId('ob-add-current').click();await page.getByTestId('ob-entry-id').fill('Tonight 1');await page.getByTestId('ob-entry-ok').click();
 await expect(page.getByTestId('ob-info-box')).toContainText('Object Tonight 1 added to Observation List.');await page.getByTestId('ob-info-box').getByRole('button',{name:'OK'}).click();
 await expect(page.getByText('HTL targets · 14')).toBeVisible();
 // Options: Limit Slewing on (kept by Save).
 await card(page).getByTestId('ob-options').click();await page.getByTestId('ob-options-limit').check();await page.getByTestId('ob-options-ok').click();
 // Save: v26 outermost with the options and the override.
 const bytes=await save(page),v=JSON.parse(bytes.toString());
 expect(v.version).toBe(26);expect(v.observatory.options).toEqual({limitSlewing:true});expect(v.observatory.siteOverrides['0'].name).toBe('Classroom roof');
 // Fresh page, restore.
 await page.clock.resume();await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'day.json',mimeType:'application/json',buffer:bytes});
 await expect(page.getByRole('status').filter({hasText:/restored/i}).first()).toBeVisible({timeout:15000});
 await clickHeaderTool(page,'Observatory');const dome=page.getByRole('button',{name:'Open dome ↗',exact:true});if(await dome.isVisible())await dome.click();
 await page.getByText('Site clock · fixed UT scenario',{exact:true}).click();await expect(page.getByTestId('ob-site-status')).toContainText('Classroom roof');
 await card(page).getByTestId('ob-options').click();await expect(page.getByTestId('ob-options-limit')).toBeChecked();await page.keyboard.press('Escape');
 // A file without v26 resets to the compiled defaults.
 const plain=JSON.parse(bytes.toString()).base;
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'plain.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plain))});
 await expect(page.getByTestId('ob-site-status')).toContainText('compiled site',{timeout:15000});
});
