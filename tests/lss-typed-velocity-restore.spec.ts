import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {clickHeaderTool} from './fixtures/header-tools';
import {saveOffline} from './fixtures/offline-save';

// Front QA1 (2026-10-31, E02): the student types a measured velocity that differs from c·z (accepted within 1 %, as VIREO
// 0x57cec8); Save (v31) and a fresh-context Restore must bring back the typed value, not c·z.
async function save(page:Page){const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();return readFile((await(await d).path())!);}
async function survey(page:Page){await clickHeaderTool(page,'LSS survey');await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();}
test('E02: a typed velocity survives Save and Restore in a fresh context',async({page,browser})=>{
 test.setTimeout(180000);
 await page.clock.install();await page.goto('/#observatory');await survey(page);
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Load selected list',exact:true}).click();await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:30000});
 await page.getByTestId('lss-row-1').getByRole('button',{name:'Point and view',exact:true}).click();
 await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start exposure',exact:true}).click();await page.clock.runFor(1500);
 await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill('20');
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await page.getByLabel('Remarks',{exact:true}).fill('typed');
 const z=Number(await page.getByTestId('lss-dialog-z').inputValue()),cz=299792.458*z,typed=Math.round(cz)+Math.max(1,Math.round(cz*0.004));
 await page.getByTestId('lss-dialog-velocity').fill(String(typed));await page.getByRole('button',{name:'OK',exact:true}).click();
 await page.clock.resume();
 const results=page.getByTestId('lss-results');await expect(results).toContainText('typed');
 const before=await results.innerText();expect(before).toContain(String(typed));
 await page.getByLabel('Describe the structure you see (not graded)',{exact:true}).fill('A wall?');
 await page.getByRole('button',{name:'Plot my records in the wedge',exact:true}).click();await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 1');
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-1').check();await page.getByTestId('wedge-options-ok').click();
 await survey(page);
 const saved=await saveOffline(page,()=>save(page));expect(JSON.parse(saved.toString()).version).toBeGreaterThanOrEqual(31);
 const context=await browser.newContext(),fresh=await context.newPage();
 await fresh.clock.install();await fresh.goto('/#observatory');
 await fresh.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'lss.json',mimeType:'application/json',buffer:saved});
 await expect(fresh.getByText('Session restored.',{exact:false})).toBeAttached({timeout:30000});
 await survey(fresh);await expect(fresh.getByTestId('lss-record-count')).toHaveText('1 records');
 expect(await fresh.getByTestId('lss-results').innerText()).toBe(before);
 await context.close();
});
test('E02: the same after a reload of the page itself (online save, no fake clock on restore)',async({page})=>{
 test.setTimeout(180000);
 await page.clock.install();await page.goto('/#observatory');await survey(page);
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Load selected list',exact:true}).click();await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:30000});
 await page.getByTestId('lss-row-1').getByRole('button',{name:'Point and view',exact:true}).click();
 await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start exposure',exact:true}).click();await page.clock.runFor(1500);
 await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill('20');
 await page.getByRole('button',{name:'Record Z',exact:true}).click();
 // As the walk-through: a wrong velocity and an empty one are refused first (the dialog stays open), then 5996.
 const dialog=page.getByRole('dialog',{name:'Measured Redshift Data'});
 await page.getByTestId('lss-dialog-velocity').fill('6300');await page.getByRole('button',{name:'OK',exact:true}).click();
 if(await page.getByRole('alertdialog').count())await page.getByRole('alertdialog').getByRole('button').first().click();
 await expect(dialog).toBeVisible();
 await page.getByTestId('lss-dialog-velocity').fill('');await page.getByRole('button',{name:'OK',exact:true}).click();
 if(await page.getByRole('alertdialog').count())await page.getByRole('alertdialog').getByRole('button').first().click();
 await expect(dialog).toBeVisible();
 await page.getByTestId('lss-dialog-velocity').fill('5996');await page.getByRole('button',{name:'OK',exact:true}).click();
 await page.clock.resume();
 const results=page.getByTestId('lss-results');await expect(results).toContainText('5996');
 const before=await results.innerText();
 const saved=await save(page);
 await page.reload();
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'lss.json',mimeType:'application/json',buffer:saved});
 await expect(page.getByText('Session restored.',{exact:false})).toBeAttached({timeout:30000});
 await survey(page);expect(await page.getByTestId('lss-results').innerText()).toBe(before);
});
