import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// Front G G4a (analysis/front-plans/front-g-gsc.md §11): the single-slit spectrometer wherever the telescope points, from the
// compact GSC tiles. NGC 4874 (Coma – 1) is pointed exactly (no exercise route is involved); no catalogue value is asserted.
async function open(page:Page){await page.goto('/#spectrometer');await expect(page.getByTestId('field-spectrometer')).toBeVisible({timeout:30000});}
async function pointAndUse(page:Page,ra:string,dec:string){
 await page.locator('#field-spec-ra').fill(ra);await page.locator('#field-spec-dec').fill(dec);await page.getByTestId('field-spec-point').click();
 await expect(page.getByTestId('field-spec-use')).toBeEnabled({timeout:20000});await page.getByTestId('field-spec-use').click();
}
test('a galaxy at any pointing: field from the tiles, exposure, counts, session save and restore',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);
 // The default 0.4 m profile: NGC 4874 is available there (data/hubble/engine-targets.json, telescope 0).
 await pointAndUse(page,'12.99311111111111','27.959722222222222');
 const field=page.getByTestId('field-spec-field');await expect(field).toBeVisible({timeout:90000});
 await expect(field).toHaveAttribute('data-kind',/galaxy|star|qso/);
 await expect(page.getByTestId('field-spec-object')).toContainText('In the slit:');
 const acquisition=page.getByTestId('field-spec-acquisition');
 await expect(acquisition).toBeVisible();await expect(page.getByTestId('field-spec-reasons')).toHaveCount(0);
 {
  await expect(page.getByTestId('field-spec-access')).toHaveAttribute('data-access','ready',{timeout:30000});
  await acquisition.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
  await acquisition.getByRole('button',{name:'Start exposure',exact:true}).click();
  await expect(async()=>expect(Number(await page.getByTestId('field-spec-total').textContent())).toBeGreaterThan(0)).toPass({timeout:20000});
  await acquisition.getByRole('button',{name:'Pause exposure',exact:true}).click();
  const total=await page.getByTestId('field-spec-total').textContent();
  const d=page.waitForEvent('download');await acquisition.getByRole('button',{name:'Save exposure session',exact:true}).click();
  const session=(await (await d).path())!;expect(JSON.parse(await readFile(session,'utf8')).policy).toMatch(/^openvireo-field-spectrum-v1:12\.99311111111111,27\.959722222222222:T[012]$/);
  await acquisition.getByRole('button',{name:'Cancel and discard',exact:true}).click().catch(()=>{});
  await page.getByLabel('Restore exposure session (this pointing and telescope)').setInputFiles(session);
  await expect(page.getByTestId('field-spec-total')).toHaveText(total!,{timeout:30000});
 }
 expect(errors).toEqual([]);
});
test('near an Object X position the field is masked',async({page})=>{
 test.setTimeout(120000);await open(page);
 // 3C 273 (an ObjectX.HTL QSO): the field would reveal the hidden identity.
 await pointAndUse(page,'12.485194444444444','2.0522222222222224');
 await expect(page.getByTestId('field-spec-status')).toHaveAttribute('data-reason','object-x-hidden',{timeout:60000});
});
