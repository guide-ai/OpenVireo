import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
import {okWithVelocity} from './fixtures/lss-velocity';
// E02 student path on real LSS fields: choose field → load the original list → per-row status → point → acquire under a
// controlled clock → measure z → Record Z (OK / Cancel / Escape) → results CSV → own records in the wedge. Steps, shifts and
// seeds are operator-chosen workflow inputs, not expected redshifts.
async function load(page:Page,field:string){
 await page.getByLabel('Survey field',{exact:true}).selectOption(field);
 await page.getByRole('button',{name:'Load selected list',exact:true}).click();
 await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:30000});
}
async function acquire(page:Page,row:number,ms=2000){
 await page.getByTestId(`lss-row-${row}`).getByRole('button',{name:'Point and view',exact:true}).click();
 await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start exposure',exact:true}).click();
 await page.clock.runFor(ms);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await expect(page.getByTestId('lss-elapsed')).toHaveText(`${ms} ms`);
 expect(Number(await page.getByTestId('lss-total').textContent())).toBeGreaterThan(0);
}
async function measure(page:Page,position:string){
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();
 await page.getByLabel('Shift',{exact:true}).fill(position);await expect(page.getByTestId('lss-current-z')).toContainText(`+0.0${position}`);
 await page.getByRole('button',{name:'Record Z',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Measured Redshift Data'})).toBeVisible();
}
test('E02: field list → statuses → acquire → Record Z OK/Cancel/Escape → CSV → own records in the wedge',async({page})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.goto('/');await clickHeaderTool(page,'LSS survey');
 await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();
 await page.clock.resume();await load(page,'1');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.locator('[data-testid^="lss-row-"]')).toHaveCount(23);
 await expect(page.getByTestId('lss-row-1')).toContainText('12021+3127');await expect(page.getByTestId('lss-row-1')).toContainText('Observable');
 // Front L2: row 3 was QSO-gated; with the recovered QSO merge it is observable on the 0.4 m.
 await expect(page.getByTestId('lss-row-3')).toContainText('Observable');await expect(page.getByTestId('lss-row-3').getByRole('button')).toBeEnabled();
 // Re-pinned 2026-10-30 (Front F3): row 9 (NGC 4150) is drawn from its approved photograph and is observable on the 0.4 m.
 await expect(page.getByTestId('lss-row-9')).toContainText('Observable');
 // Row 1: acquire, measure, Record Z → OK.
 await acquire(page,1);await measure(page,'20');
 await page.getByLabel('Remarks',{exact:true}).fill('first');await okWithVelocity(page);
 await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
 // Row 2: Cancel and Escape add nothing; then OK.
 await acquire(page,2);await measure(page,'25');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await expect(page.getByRole('dialog',{name:'Measured Redshift Data'})).toBeVisible();await page.keyboard.press('Escape');
 await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await okWithVelocity(page);
 await expect(page.getByTestId('lss-record-count')).toHaveText('2 records');
 await expect(page.getByTestId('lss-results').locator('tbody tr')).toHaveCount(2);
 await expect(page.getByTestId('lss-results')).toContainText('12021+3127');await expect(page.getByTestId('lss-results')).toContainText('NGC 4080');
 // Results CSV.
 const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save results (CSV)',exact:true}).click();
 const csv=(await readFile((await(await d).path())!)).toString().split('\r\n');
 expect(csv[0]).toMatch(/^schema,id,field,row,telescope_record,object,jd,ra_hours,dec_degrees,z_float32/);expect(csv).toHaveLength(4);
 expect(csv[1]).toContain(',1,1,0,"12021+3127",');expect(csv[1]).toContain(String(Math.fround(.02)));expect(csv[1]).toContain('"first"');
 // Own records into the wedge.
 await page.getByLabel('Describe the structure you see (not graded)',{exact:true}).fill('Two galaxies so far.');
 await page.clock.resume();await page.getByRole('button',{name:'Plot my records in the wedge',exact:true}).click();
 await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 2');
 await expect(page.getByTestId('wedge-sources')).toContainText('OpenVireo LSS records');
 // Back on the survey: nothing left to hand over; the description is kept.
 await clickHeaderTool(page,'LSS survey');
 await expect(page.getByRole('button',{name:'Plot my records in the wedge',exact:true})).toBeDisabled();
 await expect(page.getByLabel('Describe the structure you see (not graded)',{exact:true})).toHaveValue('Two galaxies so far.');
 expect(errors).toEqual([]);
});
test('E02 at 320 px: the route has no horizontal page scroll and the list stays keyboard reachable',async({page})=>{
 await page.setViewportSize({width:320,height:800});await page.goto('/#lss-survey');
 await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();
 await page.getByLabel('Survey field',{exact:true}).focus();await page.keyboard.press('ArrowDown');
 await page.getByLabel('Survey field',{exact:true}).selectOption('7');await page.getByRole('button',{name:'Load selected list',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-testid^="lss-row-"]')).toHaveCount(26,{timeout:30000});
 await expect(page.getByTestId('lss-row-4')).toContainText('bounded raster');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});
