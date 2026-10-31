import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import{clickHeaderTool}from'./fixtures/header-tools';
import {okWithVelocity} from './fixtures/lss-velocity';
// Front L2 (docs/LSS-SURVEY.md): a formerly QSO-gated row acquires with the recovered QSO merge; .SSP Save / Print on the LSS
// and galaxy routes (recovered writer); the native LSS results .TXT; LSS Galaxy Data only with Edit Mode.
const WEDGE_HEADER='Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments';
async function lss(page:Page){
 await page.clock.install();await page.goto('/');await clickHeaderTool(page,'LSS survey');
 await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();
}
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
}
async function download(page:Page,click:()=>Promise<void>){const d=page.waitForEvent('download');await click();const e=await d;return {name:e.suggestedFilename(),bytes:await readFile((await e.path())!)};}

test('a formerly QSO-gated row (F1 row 3) acquires; its spectrum saves as .SSP and prints; results save as the native .TXT',async({page})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await lss(page);await page.clock.resume();await load(page,'1');
 await expect(page.getByTestId('lss-row-3')).toContainText('Observable');
 await acquire(page,3);
 const panel=page.getByTestId('ob-spectrum-save');await expect(panel.getByRole('button',{name:'Save spectrum (.SSP)',exact:true})).toBeEnabled();
 const ssp=await download(page,()=>panel.getByRole('button',{name:'Save spectrum (.SSP)',exact:true}).click());
 expect(ssp.name).toMatch(/^openvireo-lss-.*\.ssp$/);
 const lines=ssp.bytes.toString('latin1').split('\r\n');
 expect(lines[0]).toMatch(/^\*SpHdr\* [^,]{1,24},/);expect(lines.filter(Boolean)).toHaveLength(601);expect(lines[1]).toMatch(/^4000\.00 /);
 await page.evaluate(()=>{(window as unknown as {printed:number}).printed=0;window.print=()=>{(window as unknown as {printed:number}).printed++;};});
 await panel.getByRole('button',{name:'Print spectrum',exact:true}).click();
 expect(await page.evaluate(()=>(window as unknown as {printed:number}).printed)).toBe(1);
 // Front H2: the printed page starts with VIREO's header 0x58e860 (spectrometer print 0x510240), and the panel has SPECHLP Help.
 await expect(page.getByTestId('ob-spectrum-print-header')).toContainText('     VIREO - The VIRtual Educational Observatory');
 await expect(page.getByTestId('lss-spectrometer-help')).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
 // Record Z: the velocity is typed; outside 1 % of c·z, or blank, OK keeps the dialog with the original message. Then the .TXT.
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();
 await page.getByLabel('Shift',{exact:true}).fill('20');await page.getByRole('button',{name:'Record Z',exact:true}).click();
 await expect(page.getByTestId('lss-dialog-z')).toHaveValue('2.000E-02');await expect(page.getByTestId('lss-dialog-ra-h')).toHaveAttribute('readonly','');
 await page.getByRole('button',{name:'OK',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Velocity is incorrect or missing!');
 await page.getByTestId('lss-dialog-velocity').fill('5000');await page.getByRole('button',{name:'OK',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Velocity calculation is invalid!');await expect(page.getByTestId('lss-record-count')).toHaveText('0 records');
 await okWithVelocity(page);await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
 const txt=await download(page,()=>page.getByTestId('lss-results-txt').click());
 expect(txt.name).toBe('LSS_Redshifts.TXT');
 const rows=txt.bytes.toString('latin1').split('\r\n');
 expect(rows[0]).toBe(WEDGE_HEADER);expect(rows).toHaveLength(3);expect(rows[2]).toBe('');
 expect(rows[1]).toMatch(/^.{12}\d{4}\.\d{6} +\d+h\d\dm\d\d\.\ds +-?\d+°\d\d'\d\d" +\d\.\d{3}E\+\d\d $/);
 expect(errors).toEqual([]);
});

test('LSS Galaxy Data appears only with Edit Mode; validation boxes; extraction lists catalogue galaxies',async({page})=>{
 test.setTimeout(120000);
 await lss(page);await expect(page.getByTestId('lss-region-card')).toHaveCount(0);
 // Edit Mode is the observatory's Optical Options checkbox (Front O, not saved).
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await page.getByTestId('ob-options').first().click();await page.getByTestId('ob-options-edit-mode').check();await page.getByTestId('ob-options-ok').click();
 await page.goto('/#lss-survey');await expect(page.getByTestId('lss-region-card')).toBeVisible();
 await page.getByTestId('lss-region-open').click();
 const dialog=page.getByRole('dialog',{name:'Extract LSS Galaxy Data for Region'});await expect(dialog).toBeVisible();
 await expect(page.getByTestId('lss-region-raMin')).toHaveValue('0.00');await expect(page.getByTestId('lss-region-zMax')).toHaveValue('0.00E+00');
 await page.getByTestId('lss-region-ok').click();
 const box=page.getByTestId('lss-region-box');await expect(box).toContainText('Input Error!');await expect(box).toContainText('Parameters are inconsistant!');
 await box.getByRole('button',{name:'OK',exact:true}).click();
 await page.getByTestId('lss-region-raMin').fill('abc');await page.getByTestId('lss-region-ok').click();await expect(box).toContainText('Parameters contain non-numeric data!');
 await box.getByRole('button',{name:'OK',exact:true}).click();
 // Z bounds are disabled while catalogue z is masked (they would narrow searches to the E02 answers).
 await expect(page.getByTestId('lss-region-zMin')).toBeDisabled();await expect(page.getByTestId('lss-region-zMax')).toBeDisabled();
 await expect(page.getByTestId('lss-region-z-reason')).toContainText('Z range uses the masked catalogue redshift');
 for(const [k,v] of [['raMin','12'],['raMax','12.5'],['decMin','27'],['decMax','29']])await page.getByTestId(`lss-region-${k}`).fill(v);
 await page.getByTestId('lss-region-ok').click();
 await expect(box).toContainText('Search Results');await expect(box).toContainText('Galaxy Records Searched: 24069');
 // Catalogue z is the E02 answer: masked in the summary and the table; no number in a z/velocity cell.
 await expect(box).toContainText('Range in Z: hidden (instructor value)');await expect(box).not.toContainText(/E[+-]\d\d to/);
 await box.getByRole('button',{name:'OK',exact:true}).click();
 const n=await page.getByTestId('lss-region-rows').locator('tbody tr').count();expect(n).toBeGreaterThan(0);
 for(const cell of await page.getByTestId('lss-region-rows').locator('tbody tr td:nth-child(4), tbody tr td:nth-child(5)').allInnerTexts())expect(cell).not.toMatch(/\d/);
 const txt=await download(page,()=>page.getByTestId('lss-region-txt').click());expect(txt.name).toBe('LSS_Galaxy_Data.TXT');
 const lines=txt.bytes.toString('latin1').split('\r\n');expect(lines[0]).toBe(WEDGE_HEADER);expect(lines).toHaveLength(n+2);
 for(const l of lines.slice(1,-1))expect(l).toMatch(/" {12}$/);// V blank (natively unset), no remarks
 await expect(page.getByTestId('lss-region-count')).toHaveText(`${n} catalogue galaxies listed.`);
 // A second search asks Retain Current Data?; Cancel keeps the list.
 await page.getByTestId('lss-region-open').click();await expect(page.getByTestId('lss-region-raMax')).toHaveValue('12.50');
 await page.getByTestId('lss-region-ok').click();await expect(box).toContainText('Retain Current Data?');
 await box.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByTestId('lss-region-rows').locator('tbody tr')).toHaveCount(n);
});

test('the galaxy route saves its acquired spectrum as .SSP',async({page})=>{
 await page.clock.install();await page.goto('/');await clickHeaderTool(page,'Galaxy exposure');
 await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();await page.clock.runFor(1000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 const panel=page.getByTestId('ob-spectrum-save');
 const ssp=await download(page,()=>panel.getByRole('button',{name:'Save spectrum (.SSP)',exact:true}).click());
 expect(ssp.name).toBe('openvireo-galaxy-36773.ssp');
 const lines=ssp.bytes.toString('latin1').split('\r\n');expect(lines[0]).toMatch(/^\*SpHdr\* 36773,/);expect(lines.filter(Boolean)).toHaveLength(601);
});
