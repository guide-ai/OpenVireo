import {test,expect,type Page,type Request} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {enterInstructorMode} from './fixtures/instructor-mode';
// Front T7 (analysis/front-plans/front-teacher.md §T7; analysis/front-teacher/t7/RECOVERY.md; docs/OPTICAL-OPTIONS.md): the CCD
// and IR tabs' parameters. OKBtnClick converts them after SpTimer (0x5a6522..0x5a695d) with T6's box; the camera reads them at its
// next Start: the image size and pixel size set the plane and, through the nominal field (0x53df24), the search radius; the bias is
// added to every background pixel (0x52164b). VizieR traffic is the recorded response moved onto the tracked pointing; expected
// values are the web contract, not native oracles.
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;
const recorded=readFile(new URL('./fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const id=(p:Page,t:string)=>p.getByTestId(t),button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true}),camera=(p:Page)=>p.getByTestId('camera-control');
function onPointing(xml:string){const dRa=.4987684*15-56.75,dDec=.03628-24.12;
 return xml.replace(/<TD>(0?5[67]\.\d{4,})<\/TD>/g,(_,v:string)=>`<TD>${(Number(v)+dRa).toFixed(7)}</TD>`).replace(/<TD>\+?(24\.1\d+)<\/TD>/g,(_,v:string)=>`<TD>+${(Number(v)+dDec).toFixed(7)}</TD>`);}
async function trackedField(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();await page.getByLabel('Target',{exact:true}).selectOption('N0000.DAT@14428');
 await button(page,'Point telescope ↗').click();await button(page,'Switch to telescope view ↗').click();
 if(!await button(page,'Start observatory clock').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Start observatory clock').click();await button(page,'Turn tracking on').click();
 await expect(button(page,'Start exposure')).toBeEnabled();
}
async function openOptions(page:Page){await enterInstructorMode(page);await page.locator('.telescope-motion').getByTestId('ob-options').click();await expect(id(page,'ob-options-dialog')).toBeVisible();}
async function expose(page:Page){
 await button(page,'Start exposure').click();await expect(id(page,'camera-status')).toHaveText('Image ready.',{timeout:30_000});
}

test('an instructor sets the CCD image size and bias: VIREO\'s box, a 512² image with half the radius, labelled; Reset restores',async({page})=>{
 test.setTimeout(180_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const seen:Request[]=[];page.on('request',r=>{if(CDS.test(r.url()))seen.push(r);});
 await trackedField(page);const body=onPointing((await recorded).toString('utf8'));
 await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await camera(page).getByLabel(/Ask VizieR live/).check();await camera(page).getByLabel('Minutes').fill('0');await camera(page).getByLabel('Seconds').fill('1');
 // Compiled values: VIREO's radius and plane, no label.
 await expose(page);expect(new URL(seen[0].url()).searchParams.get('SR')).toBe('0.23');
 await expect(id(page,'camera-canvas')).toHaveJSProperty('width',1024);await expect(id(page,'camera-uncertified')).toHaveCount(0);await expect(id(page,'camera-parameters-note')).toHaveCount(0);

 await openOptions(page);
 // FormActivate's texts (0x5a5b95..): ffFixed 1 Singles, IntToStr Integers; the IR cooling group is disabled with Liquid Nitrogen.
 await expect(id(page,'ob-options-camera-ccd-detector')).toHaveValue('Site CH350 003B Back-Illuminated');await expect(id(page,'ob-options-camera-ccd-width')).toHaveValue('1024');
 await expect(id(page,'ob-options-camera-ccd-readNoiseElectronsPerPixel')).toHaveValue('5.0');await expect(id(page,'ob-options-camera-ir-darkNoiseElectronsPerPixelSecond')).toHaveValue('0.7');
 await expect(id(page,'ob-options-camera-ir-cooling-thermoelectric')).toBeDisabled();await expect(id(page,'ob-options-camera-ir-cooling-liquidNitrogen')).toBeChecked();
 await expect(id(page,'ob-options-teacher-deferred')).toContainText('Parameter editing (General tab)');
 // The A/D spin buttons step 16 → 14 → 12 → 8 and back (0x5a6ffc / 0x5a70b4); the edit itself is read-only.
 const ad=id(page,'ob-options-camera-ccd-adBits');await expect(ad).toHaveAttribute('readonly','');
 for(const v of ['14','12',' 8',' 8']){await id(page,'ob-options-camera-ccd-ad-down').click();await expect(ad).toHaveValue(v);}
 for(const v of ['12','14','16','16']){await id(page,'ob-options-camera-ccd-ad-up').click();await expect(ad).toHaveValue(v);}
 // Liquid Nitrogen disables the CCD dark-noise edit (CoolGrpClick 0x5a6fb0); Thermoelectric enables it again.
 await id(page,'ob-options-camera-ccd-cooling-liquidNitrogen').check();await expect(id(page,'ob-options-camera-ccd-darkNoiseElectronsPerPixelSecond')).toBeDisabled();
 await id(page,'ob-options-camera-ccd-cooling-thermoelectric').check();await expect(id(page,'ob-options-camera-ccd-darkNoiseElectronsPerPixelSecond')).toBeEnabled();
 // Not a number: VIREO's box, nothing applied, focus back on OK.
 await id(page,'ob-options-camera-ccd-width').fill('wide');await id(page,'ob-options-ok').click();
 await expect(id(page,'ob-options-parameter-error')).toBeVisible();await expect(id(page,'ob-options-parameter-error').getByRole('heading')).toHaveText('Non-Numeric Value!');
 await id(page,'ob-options-parameter-error-ok').click();await expect(id(page,'ob-options-ok')).toBeFocused();
 await id(page,'ob-options-camera-ccd-width').fill('512');await id(page,'ob-options-camera-ccd-height').fill('512');await id(page,'ob-options-camera-ccd-biasElectronsPerPixel').fill('2000');
 await expect(id(page,'ob-options-camera-uncertified')).toContainText('CCD Camera › Image Size (Pixels): Width, CCD Camera › Image Size (Pixels): Height, CCD Camera › Bias (e/Pixel)');
 await id(page,'ob-options-tab-ccd').scrollIntoViewIfNeeded();await id(page,'ob-options-tab-ccd').screenshot({path:test.info().outputPath('ccd-tab.png')});
 await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();

 // The camera says so before Start, and the field size follows (9.13′ for 512 × 24 µm on the 0.4 m).
 await expect(id(page,'camera-parameters-note')).toContainText('not added to the Object X investigation');await expect(id(page,'camera-field-width')).toHaveText('9.13');
 await expose(page);
 expect(new URL(seen[1].url()).searchParams.get('SR')).toBe('0.11');
 await expect(id(page,'camera-canvas')).toHaveJSProperty('width',512);await expect(id(page,'camera-canvas')).toHaveJSProperty('height',512);
 await expect(id(page,'camera-uncertified')).toHaveAttribute('data-reason','uncertified-parameter');await expect(id(page,'camera-uncertified')).toContainText('CCD Camera › Bias (e/Pixel) 2000');
 await camera(page).getByText('Exposure details').click();await expect(id(page,'camera-detail-parameters')).toContainText('CCD Camera › Image Size (Pixels): Width = 512');
 await camera(page).screenshot({path:test.info().outputPath('camera-uncertified.png')});
 // Information lists the current record (0x512d5a), the FITS file carries the label.
 await id(page,'camera-information-open').click();await expect(id(page,'camera-live-information-lines')).toContainText('Image Size (pixels): 512 x 512');
 await expect(id(page,'camera-live-information')).toContainText('instructor');await id(page,'camera-live-information-close').click();
 const download=page.waitForEvent('download');await button(page,'Save image (FITS)').click();
 const fits=await readFile(await (await download).path()),header=fits.subarray(0,2880*2).toString('latin1');
 expect(header).toContain('COMMENT uncertified-parameter: instructor camera values');expect(header).toContain('CCD Camera > Bias (e/Pixel) = 2000');expect(header).toMatch(/NAXIS1  = +512/);

 // Reset restores the compiled records; the next image is VIREO's size and radius again, without a label.
 await openOptions(page);await id(page,'ob-options-reset').click();await id(page,'ob-options-reset-box-yes').click();
 await expect(id(page,'ob-options-camera-ccd-width')).toHaveValue('1024');await expect(id(page,'ob-options-camera-uncertified')).toHaveCount(0);
 await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();await expect(id(page,'camera-parameters-note')).toHaveCount(0);
 await expose(page);expect(new URL(seen[2].url()).searchParams.get('SR')).toBe('0.23');
 await expect(id(page,'camera-canvas')).toHaveJSProperty('width',1024);await expect(id(page,'camera-uncertified')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('a value outside the measured domain refuses the Start with its field; Leave keeps the values',async({page})=>{
 await trackedField(page);
 await openOptions(page);await id(page,'ob-options-camera-ccd-width').fill('2048');await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
 await camera(page).getByLabel(/Ask VizieR live/).check();await button(page,'Start exposure').click();
 await expect(id(page,'camera-status')).toContainText('CCD Camera › Image Size (Pixels): Width = 2048');await expect(camera(page)).toHaveAttribute('data-phase','idle');
 await page.getByTestId('instructor-mode-leave').click();await openOptions(page);await expect(id(page,'ob-options-camera-ccd-width')).toHaveValue('2048');
});

test('Object X: an image made with instructor camera values is not added to the investigation',async({page})=>{
 const body=await recorded;await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await page.goto('/');await expect(page.locator('h1').first()).toBeVisible();
 await page.evaluate(()=>document.getElementById('root')?.remove());
 await page.evaluate(`import(${JSON.stringify('/tests/fixtures/object-x-camera-host.ts')}).then(m=>{m.mountObjectXCameraHost({cameraBias:2000});})`);
 const host=page.getByTestId('objectx-camera-host'),cam=host.getByTestId('camera-control');
 await expect(cam.getByTestId('camera-parameters-note')).toBeVisible();
 await cam.getByLabel(/Ask VizieR live/).check();await cam.getByLabel('Minutes').fill('0');await cam.getByLabel('Seconds').fill('2');
 await cam.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(cam.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:30_000});
 await expect(cam.getByTestId('camera-uncertified')).toHaveAttribute('data-reason','uncertified-parameter');
 // The lab's hook was asked read-only (no list built, no pairs recorded) and no image reached the investigation.
 expect(JSON.parse(await host.getByTestId('host-extra-calls').textContent()??'[]')).toEqual([2454983.5+4/24,2,true]);
 await expect(host.getByTestId('host-objectx-snapshot')).toHaveText('{"exposures":0,"images":0,"listJd":null}');
 await expect(host.getByTestId('objectx-images').locator('li')).toHaveCount(0);
});
