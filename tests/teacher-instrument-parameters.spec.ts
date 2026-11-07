import{test,expect,type Page}from'@playwright/test';
import{enterInstructorMode}from'./fixtures/instructor-mode';
// Front T6 (analysis/front-plans/front-teacher.md §T6; analysis/front-teacher/t6/RECOVERY.md; docs/OPTICAL-OPTIONS.md): the
// Photometer and Spectrometer tabs' parameter edits. OKBtnClick 0x5a6068 converts them with StrToFloat in one try; an EConvertError
// shows "Numeric Conversion Error!…" / "Non-Numeric Value!" (0x5a6bac / 0x5a6bf0) and keeps the dialog open (ModalResult := 0).
// The photometer reads BaseCount per callback (0x501506). Expected values are the web contract (seeded draws), not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
async function integrate(page:Page){await page.getByRole('button',{name:'Start integration',exact:true}).click();await expect(id(page,'photo-phase')).toHaveText('Integration complete',{timeout:20000});}
async function pair(page:Page){await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');await integrate(page);await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');await integrate(page);}
async function openOptions(page:Page){
 await page.evaluate(()=>{location.hash='observatory';});await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 const dome=page.getByRole('button',{name:'Open dome ↗',exact:true});if(await dome.isVisible())await dome.click();
 await enterInstructorMode(page);await page.locator('.telescope-motion').getByTestId('ob-options').click();await expect(id(page,'ob-options-dialog')).toBeVisible();
}
async function toPhotometer(page:Page){await page.evaluate(()=>{location.hash='photometer';});await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible({timeout:15000});}

test('an instructor sets the photometer Base Photon Count: VIREO\'s conversion box, uncertified readings with about twice the counts, Reset restores',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#photometer');await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 // Compiled values: the very reading photometer.spec.ts pins (seed 1, legacy single callback), with no label.
 await pair(page);await expect(id(page,'photo-counts')).toHaveText('552');await expect(id(page,'photo-magnitude')).toHaveText('9.647121003');
 await expect(id(page,'photo-uncertified')).toHaveCount(0);await expect(id(page,'photo-parameters-note')).toHaveCount(0);

 // A compiled reading in the context the instructor's will have (the activation after visiting the observatory).
 await openOptions(page);await id(page,'ob-options-dialog').getByRole('button',{name:'Cancel',exact:true}).click();await expect(id(page,'ob-options-dialog')).toBeHidden();
 await toPhotometer(page);await pair(page);await expect(id(page,'photo-uncertified')).toHaveCount(0);
 const base=Number(await id(page,'photo-counts').textContent()),m0=Number(await id(page,'photo-magnitude').textContent());expect(base).toBeGreaterThan(100);
 // The tabs show the seven edits with FormActivate's texts, no longer as read-only rows or a deferred item.
 await openOptions(page);
 const photo=id(page,'ob-options-tab-photometer'),spec=id(page,'ob-options-tab-spectrometer');
 await expect(id(page,'ob-options-param-baseMagnitude')).toHaveValue('6.0');await expect(id(page,'ob-options-param-skyMagnitude')).toHaveValue('16.00');
 await expect(id(page,'ob-options-param-baseCount')).toHaveValue('1000');await expect(id(page,'ob-options-param-photometerTimerMs')).toHaveValue('100');
 await expect(id(page,'ob-options-param-spectrometerSkyMagnitude')).toHaveValue('19.00');await expect(id(page,'ob-options-param-spectrometerBaseCount')).toHaveValue('50');
 await expect(id(page,'ob-options-param-spectrometerTimerMs')).toHaveValue('1');
 await expect(photo.locator('dt',{hasText:'Base Photon Count'})).toHaveCount(0);await expect(spec.locator('dt',{hasText:'Timer Wait (ms)'})).toHaveCount(0);
 await expect(photo).toContainText('Count for base magnitude.');await expect(spec).toContainText('Spectrometer time interval in milliseconds.');
 await expect(id(page,'ob-options-teacher-deferred')).toContainText('Parameter editing (General tab)');

 // Not a number: VIREO's box; the dialog stays open, nothing is applied, and focus comes back to OK.
 await id(page,'ob-options-param-baseCount').fill('two thousand');await id(page,'ob-options-ok').click();
 const box=id(page,'ob-options-parameter-error');await expect(box).toBeVisible();
 await expect(box.getByRole('heading')).toHaveText('Non-Numeric Value!');
 await expect(id(page,'ob-options-parameter-error-text')).toHaveText('Numeric Conversion Error!\n\nVerify Values of Numeric Parameters.',{useInnerText:true});
 await box.screenshot({path:test.info().outputPath('parameter-error-box.png')});
 await id(page,'ob-options-parameter-error-ok').click();await expect(box).toHaveCount(0);
 await expect(id(page,'ob-options-dialog')).toBeVisible();await expect(id(page,'ob-options-ok')).toBeFocused();

 await id(page,'ob-options-param-baseCount').fill('2000');
 await expect(id(page,'ob-options-parameters-uncertified')).toContainText('Photometer › Base Photon Count');
 await photo.scrollIntoViewIfNeeded();await photo.screenshot({path:test.info().outputPath('photometer-tab-parameters.png')});
 await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();

 // The photometer measures with VIREO's formula (mean × BaseCount): about twice the counts, the same V scale, labelled.
 await toPhotometer(page);await expect(id(page,'photo-parameters-note')).toContainText('Photometer › Base Photon Count');
 await pair(page);
 await expect(id(page,'photo-uncertified')).toHaveAttribute('data-reason','uncertified-parameter');
 await expect(id(page,'photo-uncertified')).toContainText('Base Photon Count 2000');
 const counts=Number(await id(page,'photo-counts').textContent()),v=Number(await id(page,'photo-magnitude').textContent());
 expect(counts).toBeGreaterThan(base*1.6);expect(counts).toBeLessThan(base*2.4);expect(Math.abs(v-m0)).toBeLessThan(.15);
 await page.locator('.photometer-main').screenshot({path:test.info().outputPath('photometer-uncertified.png')});

 // Reset restores the compiled values; the next readings carry no label.
 await openOptions(page);await id(page,'ob-options-reset').click();await id(page,'ob-options-reset-box-yes').click();
 await expect(id(page,'ob-options-param-baseCount')).toHaveValue('1000');await expect(id(page,'ob-options-parameters-uncertified')).toHaveCount(0);
 await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
 await toPhotometer(page);await expect(id(page,'photo-parameters-note')).toHaveCount(0);
 await pair(page);await expect(id(page,'photo-uncertified')).toHaveCount(0);
 const again=Number(await id(page,'photo-counts').textContent());expect(again).toBeLessThan(base*1.4);expect(again).toBeGreaterThan(base*.6);
 expect(errors).toEqual([]);
});

test('spectrometer parameters: the exercise routes refuse them with a typed reason, and Reset lifts it',async({page})=>{
 test.setTimeout(120000);
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await expect(id(page,'ms-parameters-refused')).toHaveCount(0);
 await openOptions(page);await id(page,'ob-options-param-spectrometerSkyMagnitude').fill('20');await id(page,'ob-options-param-spectrometerTimerMs').fill('5');
 await expect(id(page,'ob-options-parameters-spectrometer-note')).toContainText('Multi-Spec');
 await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
 // Multi-Spec reads SpSky and SpTimer (0x52702c, 0x52728a): refused, with the edits named and Access disabled.
 const refused=id(page,'ms-parameters-refused');await expect(refused).toHaveAttribute('data-reason','uncertified-parameter');
 await expect(refused).toContainText('Spectrometer › Sky Magnitude (V), Spectrometer › Timer Wait (ms)');await expect(refused).toContainText('Optical Simulation Options…');await expect(id(page,'ms-card').getByTestId('ms-access')).toBeDisabled();
 // The values survive Leave and reopening the dialog.
 await page.getByTestId('instructor-mode-leave').click();await enterInstructorMode(page);await page.locator('.telescope-motion').getByTestId('ob-options').click();
 await expect(id(page,'ob-options-param-spectrometerSkyMagnitude')).toHaveValue('20.00');
 await id(page,'ob-options-reset').click();await id(page,'ob-options-reset-box-yes').click();await expect(id(page,'ob-options-param-spectrometerSkyMagnitude')).toHaveValue('19.00');
 await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();await expect(id(page,'ms-parameters-refused')).toHaveCount(0);
});

test('closure L7: an instructor Timer of 1 ms that overruns the session callback budget is named at the first Start',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await openOptions(page);await id(page,'ob-options-param-photometerTimerMs').fill('1');await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
 await toPhotometer(page);await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');
 await page.getByLabel('Seconds per integration',{exact:true}).selectOption('100');await page.getByLabel('Number of integrations',{exact:true}).selectOption('5');
 // 100 s × 5 at 1 ms = 500 000 callbacks, above the session's 100 000; the compiled 100 ms would need 5 000.
 await page.getByRole('button',{name:'Start integration',exact:true}).click();
 await expect(page.getByText(/^Start refused: with the instructor Timer Wait this series needs more photometer callbacks/).first()).toBeVisible();
 await expect(id(page,'photo-phase')).not.toHaveText('Integration complete');
 await page.getByRole('button',{name:'Start integration',exact:true}).click();// a retry says the same
 await expect(page.getByText(/^Start refused: with the instructor Timer Wait/).first()).toBeVisible();
 expect(errors).toEqual([]);
});
