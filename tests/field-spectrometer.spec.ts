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
 // Re-pinned 2026-10-31 (Front L4): this naked-eye star was mean-bound on the 0.4 m (the former web bound 12); it is acquirable now.
 await expect(page.getByTestId('field-spec-reasons')).toHaveCount(0);await expect(page.getByTestId('field-spec-acquisition')).toBeVisible();
 expect(errors).toEqual([]);
});
test('Front MEANBOUND: Sirius (S1500.DAT@213830), mean-bound before, is acquired on the 0.4 m and stops at the S/N limit',async({page})=>{
 test.setTimeout(150000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 // Its largest per-1000-ms mean on the 0.4 m is 7.6·10⁶ (above the former 10⁶; analysis/front-meanbound/RECOVERY.md §5).
 await pointAndUse(page,'6.752464','-16.71611');
 await expect(page.getByTestId('field-spec-object')).toContainText('S1500.DAT@213830',{timeout:90000});
 await expect(page.getByTestId('field-spec-reasons')).toHaveCount(0);
 const acquisition=page.getByTestId('field-spec-acquisition');await expect(acquisition).toBeVisible();
 await expect(page.getByTestId('field-spec-access')).toHaveAttribute('data-access','ready',{timeout:30000});
 await acquisition.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await acquisition.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(async()=>expect(Number(await page.getByTestId('field-spec-total').textContent())).toBeGreaterThan(6e8)).toPass({timeout:30000});
 expect(errors).toEqual([]);
});
test('Front F4: a newly bundled photograph is drawn, and the page fetches only the photograph its field names (NGC 891)',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[],photographs:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{const m=/\/original\/images\/([^/?]+\.bmp)$/i.exec(new URL(r.url()).pathname);if(m)photographs.push(m[1]);});
 await open(page);
 // GLIMAGES.LST row 22: NGC 891 at 2.37581 h, +42.3461°; before Front F4 (user approval of 2026-11-02) this field stopped at
 // photographic-image.
 await pointAndUse(page,'2.37581','42.3461');
 await expect(page.getByTestId('field-spec-field')).toBeVisible({timeout:90000});
 await expect(page.getByTestId('field-spec-object')).toContainText('NGC 891');
 await expect(page.getByTestId('field-spec-reasons')).toHaveCount(0);await expect(page.getByTestId('field-spec-acquisition')).toBeVisible();
 expect([...new Set(photographs)]).toEqual(['NGC891.BMP']);
 expect(errors).toEqual([]);
});
test('Front AXISMERGE: a field whose galaxy cleanup VIREO cannot finish names the access violation (NGC 4907, CLEA_GLX.DAT record 15000)',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 // analysis/front-axismerge/RECOVERY.md: pointed at CLEA_GLX.DAT record 15000, the cleanup 0x5980cc of NGC 4907 meets a nil GetAt
 // (its nearest star was the runner-pruned list's last record); VIREO faults at 0x59814e. The web types the field.
 await pointAndUse(page,'12.985416666666667','27.85361111111111');
 const reasons=page.getByTestId('field-spec-reasons');
 await expect(reasons).toHaveAttribute('data-reasons',/merge-access-violation/,{timeout:90000});
 await expect(reasons).toContainText('Access violation');await expect(reasons).not.toContainText('precision boundary');
 await expect(page.getByTestId('field-spec-acquisition')).toHaveCount(0);
 expect(errors).toEqual([]);
});
test('near an Object X position the field is masked',async({page})=>{
 test.setTimeout(120000);await open(page);
 // 3C 273 (an ObjectX.HTL QSO): the field would reveal the hidden identity.
 await pointAndUse(page,'12.485194444444444','2.0522222222222224');
 await expect(page.getByTestId('field-spec-status')).toHaveAttribute('data-reason','object-x-hidden',{timeout:60000});
});
// Re-pinned 2026-10-31 (Front S3): the galaxy is observed off the default (galaxyRangeAll witness), with its grid on the range.
test('Front S2/S3: the range opener on the field spectrometer; a galaxy is observed off the default and again at Default',async({page})=>{
 test.setTimeout(180000);await open(page);
 await pointAndUse(page,'12.99311111111111','27.959722222222222');
 await expect(page.getByTestId('field-spec-field')).toBeVisible({timeout:90000});
 await page.getByTestId('field-spec-range-open').click();
 await page.getByTestId('spectral-range-min').fill('5');await page.getByTestId('spectral-range-max').fill('15');await page.getByTestId('spectral-range-ok').click();
 await expect(page.getByTestId('field-spec-range')).toHaveText('Spectrometer range: 4000.0–5000.0 Å (600 bins).');
 await expect(page.getByTestId('field-spec-field')).toBeVisible({timeout:90000});await expect(page.getByTestId('field-spec-status')).toHaveCount(0);
 await expect(page.getByTestId('field-spec-acquisition')).toBeVisible();
 await page.getByTestId('field-spec-range-open').click();await page.getByTestId('spectral-range-default').click();await page.getByTestId('spectral-range-ok').click();
 await expect(page.getByTestId('field-spec-field')).toBeVisible({timeout:90000});await expect(page.getByTestId('field-spec-acquisition')).toBeVisible();
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
// Front G G4c: the field spectrum's outputs (Save .SSP, Print, Classify, Analyze) and its part of the investigation (v33).
test('G4c: Save .SSP, Classify and Analyze take the field spectrum; the investigation keeps and restores it byte-identically',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);
 await pointAndUse(page,'12.99311111111111','27.959722222222222');
 const acquisition=page.getByTestId('field-spec-acquisition');await expect(acquisition).toBeVisible({timeout:90000});
 await expect(page.getByTestId('field-spec-access')).toHaveAttribute('data-access','ready',{timeout:30000});
 await expect(page.getByTestId('ob-spectrum-save-button')).toHaveCount(0);
 await acquisition.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await acquisition.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(async()=>expect(Number(await page.getByTestId('field-spec-total').textContent())).toBeGreaterThan(0)).toPass({timeout:20000});
 await acquisition.getByRole('button',{name:'Pause exposure',exact:true}).click();
 const total=await page.getByTestId('field-spec-total').textContent(),object=(await page.getByTestId('field-spec-object').textContent())!;
 // Save .SSP: the recovered writer, header object = the slit's record, file named after it.
 const d=page.waitForEvent('download');await page.getByTestId('ob-spectrum-save-button').click();const ssp=await d;
 expect(ssp.suggestedFilename()).toMatch(/^field-[A-Za-z0-9-]+\.ssp$/);
 const sspText=await readFile((await ssp.path())!,'latin1'),lines=sspText.split('\r\n');expect(lines.length).toBeGreaterThan(600);
 expect(lines[0]).toMatch(/^\*SpHdr\* NGC 4874,/);expect(object).toContain('NGC 4874');
 await expect(page.getByTestId('ob-spectrum-print-button')).toBeEnabled();
 // Save investigation: the v33 part holds the exposure; restoring it brings the same field and counts back.
 const inv=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();
 const investigation=await readFile((await (await inv).path())!);const v=JSON.parse(investigation.toString());
 expect(v.version).toBe(33);expect(v.fieldSpectrum.policy).toMatch(/^openvireo-field-spectrum-v1:12\.99311111111111,27\.959722222222222:T0/);
 // Classify takes the spectrum as an imported .SSP.
 await page.getByTestId('field-spec-classify').click();
 await expect(page).toHaveURL(/#classification$/);
 await page.evaluate(()=>{location.hash='spectrometer';});await expect(page.getByTestId('field-spec-acquisition')).toBeVisible();
 // Analyze opens it in the spectrum analyser.
 await page.getByTestId('field-spec-analyze').click();
 await expect(page).toHaveURL(/#spectrum$/);
 await page.evaluate(()=>{location.hash='spectrometer';});
 await page.getByTestId('field-spec-acquisition').getByRole('button',{name:'Cancel and discard',exact:true}).click();
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'restore.json',mimeType:'application/json',buffer:investigation});
 await expect(page.getByTestId('field-spec-total')).toHaveText(total!,{timeout:90000});
 const again=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();
 expect(await readFile((await (await again).path())!)).toEqual(investigation);
 expect(errors).toEqual([]);
});
test('Front S2 review 1 L2: OK on an unchanged range restarts the exposure, after the recovered warning',async({page})=>{
 test.setTimeout(180000);await open(page);
 await pointAndUse(page,'12.99311111111111','27.959722222222222');
 const acquisition=page.getByTestId('field-spec-acquisition');await expect(acquisition).toBeVisible({timeout:90000});
 await expect(page.getByTestId('field-spec-access')).toHaveAttribute('data-access','ready',{timeout:30000});
 await acquisition.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await acquisition.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(async()=>expect(Number(await page.getByTestId('field-spec-total').textContent())).toBeGreaterThan(0)).toPass({timeout:20000});
 await acquisition.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await page.getByTestId('field-spec-range-open').click();
 await expect(page.getByTestId('spectral-range-warning')).toBeVisible();await page.getByTestId('spectral-range-warning-ok').click();
 await page.getByTestId('spectral-range-ok').click();
 await expect(page.getByTestId('field-spec-acquisition')).toBeVisible({timeout:90000});await expect(page.getByTestId('field-spec-total')).toHaveText('0');
});
test('Front S2 review 1 M1: a field star on 3600–3700 Å saves its .SSP from its own grid',async({page})=>{
 test.setTimeout(180000);await open(page);
 await pointAndUse(page,String(11+44/60+42.9/3600),String(55+22/60+43/3600));
 await expect(page.getByTestId('field-spec-field')).toHaveAttribute('data-kind','star',{timeout:90000});
 await page.getByTestId('field-spec-range-open').click();
 await page.getByTestId('spectral-range-min').fill('1');await page.getByTestId('spectral-range-max').fill('2');await page.getByTestId('spectral-range-ok').click();
 await expect(page.getByTestId('field-spec-range')).toHaveText('Spectrometer range: 3600.0–3700.0 Å (600 bins).',{timeout:90000});
 const acquisition=page.getByTestId('field-spec-acquisition');await expect(acquisition).toBeVisible({timeout:90000});
 await expect(page.getByTestId('field-spec-access')).toHaveAttribute('data-access','ready',{timeout:30000});
 await acquisition.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await acquisition.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(async()=>expect(Number(await page.getByTestId('field-spec-total').textContent())).toBeGreaterThan(0)).toPass({timeout:20000});
 await acquisition.getByRole('button',{name:'Pause exposure',exact:true}).click();
 const d=page.waitForEvent('download');await page.getByTestId('ob-spectrum-save-button').click();
 const lines=(await readFile((await (await d).path())!,'latin1')).split('\r\n');
 expect(lines[1]).toMatch(/^3600\.00 /);expect(lines[600]).toMatch(/^3699\.83 /);
});
