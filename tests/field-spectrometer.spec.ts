import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';

// Front G G4a (analysis/front-plans/front-g-gsc.md §11): the single-slit spectrometer wherever the telescope points, from the
// compact GSC tiles. NGC 4874 (Coma – 1) is pointed exactly (no exercise route is involved); no catalogue value is asserted.
async function open(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
// The telescope is pointed in the Observatory (its own checks apply); the spectrometer has no pointing control of its own.
async function pointAndUse(page:Page,ra:string,dec:string){
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await page.getByRole('button',{name:/^Telescope/}).click();
 // The spectral controls need tracking on, as in the Observatory's own instrument access.
 if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();
 await page.goto('/#spectrometer');await expect(page.getByTestId('field-spectrometer')).toBeVisible({timeout:30000});
 await expect(page.getByTestId('field-spec-use')).toBeEnabled({timeout:20000});await page.getByTestId('field-spec-use').click();
}
test('a galaxy at any pointing: field from the tiles, exposure, counts, session save and restore',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);
 // The default 0.4 m profile: NGC 4874 is available there (data/hubble/engine-targets.json, telescope 0).
 await pointAndUse(page,'12.99311111111111','27.959722222222222');
 const field=page.getByTestId('field-spec-field');await expect(field).toBeVisible({timeout:90000});
 await expect(field).toHaveAttribute('data-kind',/galaxy|star|qso/);
 await expect(page.getByTestId('field-spec-object')).toContainText('Nearest object, selected by the slit:');
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
  const session=(await (await d).path())!;expect(JSON.parse(await readFile(session,'utf8')).policy).toMatch(/^openvireo-field-spectrum-v1:12\.99311111111111,27\.959722222222222:T[012]:JD\d+(\.\d+)?$/);
  await acquisition.getByRole('button',{name:'Cancel and discard',exact:true}).click().catch(()=>{});
  await page.getByLabel('Restore exposure session (this pointing and telescope)').setInputFiles(session);
  await expect(page.getByTestId('field-spec-total')).toHaveText(total!,{timeout:30000});
  // Closure N2: a session from the same pointing and telescope at another observatory time restores; the page adopts the
  // session's field (its JD), as a new save shows.
  const original=JSON.parse(await readFile(session,'utf8')),otherJd=original.policy.replace(/:JD[^:]+$/,':JD2451546.25');
  const other=test.info().outputPath('other-time.json');await writeFile(other,JSON.stringify({...original,policy:otherJd},null,1)+'\n');
  await page.getByLabel('Restore exposure session (this pointing and telescope)').setInputFiles(other);
  await expect(page.getByTestId('field-spec-total')).toHaveText(total!,{timeout:30000});
  const again=page.waitForEvent('download');await page.getByTestId('field-spec-acquisition').getByRole('button',{name:'Save exposure session',exact:true}).click();
  expect(JSON.parse(await readFile((await (await again).path())!,'utf8')).policy).toBe(otherJd);
 }
 expect(errors).toEqual([]);
});
test('a naked-eye star whose spectral index is not a whole class gets its template (closure N1, N0000.DAT@63282)',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 await pointAndUse(page,'2.5125473','0.25592');
 await expect(page.getByTestId('field-spec-object')).toContainText('N0000.DAT@63282',{timeout:90000});
 await expect(page.getByTestId('field-spec-status')).toHaveCount(0);
 await expect(page.getByTestId('field-spec-reasons')).not.toContainText('spectral index');
 expect(errors).toEqual([]);
});
test('near an Object X position the field is masked',async({page})=>{
 test.setTimeout(120000);await open(page);
 // 3C 273 (an ObjectX.HTL QSO): the field would reveal the hidden identity.
 await pointAndUse(page,'12.485194444444444','2.0522222222222224');
 await expect(page.getByTestId('field-spec-status')).toHaveAttribute('data-reason','object-x-hidden',{timeout:60000});
});
test('a catalogue file that does not arrive is a retryable missing piece, not an internal error (G final closure N3)',async({page})=>{
 test.setTimeout(120000);
 // Only the field spectrometer's own load is refused: the Observatory does not read CLEA_GLX.DAT before the slit is used.
 await page.route('**/original/catalogs/CLEA_GLX.DAT',r=>r.abort('internetdisconnected'));
 await open(page);
 await pointAndUse(page,'12.99311111111111','27.959722222222222');
 const status=page.getByTestId('field-spec-status');
 await expect(status).toHaveAttribute('data-reason','field-tiles',{timeout:60000});
 await expect(status).not.toContainText('trying again will not help');
});
