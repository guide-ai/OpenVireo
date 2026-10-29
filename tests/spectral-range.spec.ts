import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// Front S (S1, docs/SPECTRAL-RANGE.md): VIREO's Spectrometer Wavelength Range dialog on the star route (static reading of
// CLEA_VEO.exe, analysis/front-s-spectroscopy/RE-spectral-range.md).
const id=(p:Page,t:string)=>p.getByTestId(t);
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
async function expose(page:Page){
 await button(page,'Activate supported star field').click();await button(page,'Start star exposure').click();
 await page.clock.runFor(1000);await button(page,'Pause exposure').click();
}
test('the range dialog warns about an unsaved spectrum, applies on OK and the next exposure uses the new grid',async({page})=>{
 await page.clock.install();await page.goto('/#star-exposure');
 await expect(id(page,'star-spectral-range')).toHaveText('Spectrometer range: 3700.0–4700.0 Å (600 bins).');
 await expose(page);
 await button(page,'Spectral Range...').click();
 const warning=id(page,'spectral-range-warning');await expect(warning.getByRole('heading',{name:'Spectrometer Will Clear!'})).toBeVisible();
 await expect(warning).toContainText('You will lose the current spectrum if you change the spectral range now!');
 // Cancel keeps everything.
 await warning.getByRole('button',{name:'Cancel'}).click();await expect(warning).toHaveCount(0);
 await button(page,'Spectral Range...').click();await id(page,'spectral-range-warning-ok').click();
 const dialog=id(page,'spectral-range-dialog');await expect(dialog.getByRole('heading',{name:'Spectrometer Wavelength Range'})).toBeVisible();
 await expect(id(page,'spectral-range-min-value')).toHaveText('3700.0');await expect(id(page,'spectral-range-max-value')).toHaveText('4700.0');
 // The maximum pushes the minimum down to keep 100 Å; Default restores 3700–4700.
 await id(page,'spectral-range-max').fill('3');await expect(id(page,'spectral-range-min-value')).toHaveText('3700.0');await expect(id(page,'spectral-range-max-value')).toHaveText('3800.0');
 await id(page,'spectral-range-max').fill('2');await expect(id(page,'spectral-range-min-value')).toHaveText('3600.0');
 await id(page,'spectral-range-default').click();await expect(id(page,'spectral-range-max-value')).toHaveText('4700.0');
 await id(page,'spectral-range-min').fill('5');await id(page,'spectral-range-max').fill('15');await id(page,'spectral-range-ok').click();
 await expect(id(page,'star-spectral-range')).toHaveText('Spectrometer range: 4000.0–5000.0 Å (600 bins).');
 await expect(page.getByTestId('star-total')).toHaveText('0');
 await expose(page);
 const d=page.waitForEvent('download');await button(page,'Save spectrum (.SSP)').click();
 const lines=(await readFile((await (await d).path())!,'latin1')).split('\r\n');
 expect(lines[1]).toMatch(/^4000\.00 /);expect(lines[600]).toMatch(/^4998\.33 /);
 // Classify admits it (it overlaps 3500–7400 Å by far more than 100 Å).
 await button(page,'Classify acquired star').click();
 await expect(button(page,'Review classification')).toBeEnabled();
});
