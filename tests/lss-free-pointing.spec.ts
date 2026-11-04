import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {openHeaderTools,clickHeaderTool} from './fixtures/header-tools';

// Front LSSFREE (analysis/front-lssfree/RECOVERY.md): in the LSS exercise VIREO's Record Z (0x58383c) puts any loaded spectrum
// into the LSS list. The student points the telescope at a star (N0000-01634, on no hot-list row), takes its spectrum on the
// Spectrometer page, analyses it, records it near z = 0, and keeps it through Save and Restore. No catalogue value is asserted.
async function startLssExercise(page:Page){
 await openHeaderTools(page);await page.getByTestId('lss-lab-open').click();
 const guide=page.getByRole('dialog',{name:'Mapping large-scale structure'});await expect(guide).toBeVisible();
 await guide.getByRole('button',{name:'Close LSS guide',exact:true}).click();
}
async function pointAndUse(page:Page,ra:string,dec:string){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await page.getByRole('button',{name:/^Telescope/}).click();
 if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();
 await page.goto('/#spectrometer');await expect(page.getByTestId('field-spectrometer')).toBeVisible({timeout:30000});
 await expect(page.getByTestId('field-spec-use')).toBeEnabled({timeout:20000});await page.getByTestId('field-spec-use').click();
}
async function exposeAndAnalyze(page:Page){
 const acquisition=page.getByTestId('field-spec-acquisition');await expect(acquisition).toBeVisible({timeout:90000});
 await expect(page.getByTestId('field-spec-access')).toHaveAttribute('data-access','ready',{timeout:30000});
 await acquisition.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await acquisition.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(async()=>expect(Number(await page.getByTestId('field-spec-total').textContent())).toBeGreaterThan(0)).toPass({timeout:20000});
 await acquisition.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await page.getByTestId('field-spec-analyze').click();await expect(page).toHaveURL(/#spectrum$/);
}
async function save(page:Page){const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();return readFile((await(await d).path())!);}

test('E02 free pointing: a star from the Spectrometer page is recorded in the LSS list and survives Save and Restore',async({page,browser})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await startLssExercise(page);
 await pointAndUse(page,'2.5125473','0.25592');
 await expect(page.getByTestId('field-spec-object')).toContainText('N0000.DAT@63282',{timeout:90000});
 await exposeAndAnalyze(page);
 // The analyser says where Record measurement goes in the LSS exercise (one-line web adaptation).
 await expect(page.getByTestId('spectrum-lss-free-note')).toBeVisible();
 await page.getByLabel('z step per tick').fill('0.0001');await page.getByRole('button',{name:'Apply step',exact:true}).click();
 const slider=page.getByRole('slider');await slider.focus();await slider.press('ArrowRight');
 await page.getByRole('button',{name:/Record measurement/}).click();
 // The LSS page opens VIREO's Measured Redshift Data dialog for the star (ID as VIREO's proposed file name gives it back).
 await expect(page).toHaveURL(/#lss-survey$/);
 const dialog=page.getByRole('dialog',{name:'Measured Redshift Data'});await expect(dialog).toBeVisible();
 await expect(page.getByTestId('lss-dialog-free')).toBeVisible();await expect(page.locator('#lss-object')).toHaveValue('N0000-01634');
 const z=Number(await page.getByTestId('lss-dialog-z').inputValue());expect(z).toBeGreaterThan(0);expect(z).toBeLessThan(.001);
 await page.getByTestId('lss-dialog-velocity').fill((299792.458*z).toFixed(2));await page.getByLabel('Remarks',{exact:true}).fill('free star');
 await page.getByRole('button',{name:'OK',exact:true}).click();await expect(dialog).toBeHidden();
 const results=page.getByTestId('lss-results');await expect(results).toContainText('N0000-01634');await expect(results).toContainText('free star');
 await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
 const before=await results.innerText();
 // Save writes the v34 wrapper; a fresh page restores the record by replaying the exposure from the tiles.
 const saved=await save(page),v=JSON.parse(saved.toString());
 expect(v.version).toBe(34);expect(v.lssFree.records[0]).toMatchObject({at:1,object:'N0000-01634',remarks:'free star'});
 const context=await browser.newContext(),fresh=await context.newPage();await fresh.goto('/');
 await fresh.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'lss.json',mimeType:'application/json',buffer:saved});
 await expect(fresh.getByText('Session restored.',{exact:false})).toBeAttached({timeout:90000});
 await clickHeaderTool(fresh,'LSS survey');await expect(fresh.getByTestId('lss-record-count')).toHaveText('1 records');
 expect(await fresh.getByTestId('lss-results').innerText()).toBe(before);
 await context.close();
 expect(errors).toEqual([]);
});

test('outside the LSS exercise the analyser keeps its own log for a Spectrometer-page spectrum (web adaptation)',async({page})=>{
 test.setTimeout(180000);
 await pointAndUse(page,'2.5125473','0.25592');await exposeAndAnalyze(page);
 await expect(page.getByTestId('spectrum-lss-free-note')).toHaveCount(0);
 await page.getByLabel('z step per tick').fill('0.0001');await page.getByRole('button',{name:'Apply step',exact:true}).click();
 await page.getByRole('button',{name:/Record measurement/}).click();
 await expect(page).toHaveURL(/#spectrum$/);await expect(page.getByRole('dialog',{name:'Measured Redshift Data'})).toHaveCount(0);
});
