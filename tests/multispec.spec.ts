import{test,expect,type Page,type Locator}from'@playwright/test';
import{readFile}from'node:fs/promises';
import{paceDownload}from'./fixtures/download-pacing';

// Front M (M3): the multi-object spectrometer from the observatory's instrument choice (Access, as recovered), with object
// selection armed by Edit Mode (decision D1), at the exact Hubble Coma – 2 (NGC 4889) pointing of the bundled engine pack.
// Selection points (raster = control + 312) are pinned in src/io/multiSpec.test.ts: NGC 4889 at (468, 468), a star at
// (457, 485), a star on an approved jspect2 template at (447, 346), the sky at (312, 620).
test.describe.configure({timeout:180_000});
const card=(p:Page)=>p.getByTestId('ms-card');
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}
async function editMode(page:Page){await page.locator('.telescope-motion').getByTestId('ob-options').click();await page.getByTestId('ob-options-edit-mode').check();await page.getByTestId('ob-options-ok').click();}
async function pointComa2(page:Page){
 await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill('13.002305555555555');await page.locator('#point-dec').fill('27.9775');
 await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await expect(page.getByTestId('pointing-dec')).toHaveText(/^27\.97/,{timeout:30000});
}
async function at(field:Locator,x:number,y:number,button:'left'|'right'='left'){const b=(await field.boundingBox())!;await field.click({button,position:{x:(x+.5)*b.width/312,y:(y+.5)*b.height/312}});}
async function okBox(page:Page,text:string|RegExp){const box=page.getByTestId('ms-box');await expect(page.getByTestId('ms-box-text')).toHaveText(text);await box.getByRole('button',{name:'OK',exact:true}).click();await expect(box).toHaveCount(0);}
async function answer(page:Page,text:string|RegExp,yes:boolean){const box=page.getByTestId('ms-box');await expect(page.getByTestId('ms-box-text')).toHaveText(text);await box.getByRole('button',{name:yes?'Yes':'No',exact:true}).click();await expect(box).toHaveCount(0);}
async function download(page:Page,click:()=>Promise<void>){await paceDownload(page);const d=page.waitForEvent('download');await click();const e=await d;return {name:e.suggestedFilename(),bytes:await readFile((await e.path())!)};}
/** Names and sizes of a STORE zip's local entries. */
function zipEntries(b:Buffer){const out:{name:string;size:number;data:Buffer}[]=[];let o=0;while(b.readUInt32LE(o)===0x04034b50){expect(b.readUInt16LE(o+8)).toBe(0);const size=b.readUInt32LE(o+18),n=b.readUInt16LE(o+26),name=b.subarray(o+30,o+30+n).toString('latin1');out.push({name,size,data:b.subarray(o+30+n,o+30+n+size)});o+=30+n+size;}return out;}

test('Edit Mode at Coma – 2: Access, select 2 stars + 1 galaxy + 1 sky, remove, Init/Go/Stop, list, Scan, Information, Save, Save All, Clear All',async({page})=>{
 await page.clock.install();
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await tracking(page);
 // Before pointing, Access is blocked with the native gate's reason.
 await expect(card(page).getByTestId('ms-access')).toBeDisabled();await expect(page.getByTestId('ms-access-status')).toHaveText(/^Access blocked/);
 await pointComa2(page);await page.getByRole('button',{name:/^Telescope/}).click();await editMode(page);
 await expect(page.getByTestId('em-caption')).toContainText('hubble-engine-coma',{timeout:30000});
 await card(page).scrollIntoViewIfNeeded();
 await card(page).getByTestId('ms-access').click();
 await okBox(page,'Click on objects in Telescope Display to select.\n\nRight-click selected object to remove.');
 await expect(page.getByTestId('ms-control').getByRole('heading',{name:'CLEA Multi-Channel Spectrometer Control'})).toBeVisible();
 // Front P: Print Selection Field (0x52a78c) only calls Print Sky Image (0x53f934), the observatory's web print.
 await page.getByTestId('ms-print-field').click();await expect(page.getByTestId('print-sky')).toContainText('VIREO Optical Telescope Control Panel');await page.getByTestId('print-sky-close').click();await expect(page.getByTestId('ms-print-field')).toBeFocused();
 await expect(page.getByTestId('ms-minutes')).toHaveValue('1.00');await expect(page.getByTestId('ms-led')).toHaveAttribute('data-on','true');
 await expect(page.getByTestId('ms-armed')).toHaveText('Object selection is on: Edit Mode is on.');
 const field=page.getByTestId('ms-field');await expect(field).toBeVisible({timeout:60000});await expect(field).toHaveAttribute('data-armed','true');
 await expect(page.getByTestId('ms-init')).toBeDisabled();
 for(const [x,y] of [[156,156],[145,173],[135,34],[0,308],[300,4]])await at(field,x,y);
 for(let n=1;n<=5;n++)await expect(page.getByTestId(`ms-marker-${n}`)).toBeVisible();
 // A second click on a selected object adds nothing (the 1 px rule); right-click removes after the native question.
 await at(field,156,156);await expect(page.locator('[data-testid^=ms-marker-]')).toHaveCount(5);
 await at(field,300,4,'right');await answer(page,'Remove Selection #5 ?\n\n(Remaining Selections Will Be Re-Numbered.)',true);
 await expect(page.locator('[data-testid^=ms-marker-]')).toHaveCount(4);
 // Init: an invalid entry first, then 0.05 minutes = 3 s.
 await page.getByTestId('ms-minutes').fill('abc');await page.getByTestId('ms-init').click();await okBox(page,'Exposure Time must be numeric, > 0!');
 await page.getByTestId('ms-minutes').fill('0.05');await page.getByTestId('ms-init').click();
 await expect(page.getByTestId('ms-objects')).toHaveText('4');await expect(page.getByTestId('ms-clock')).toHaveText('0:03');await expect(page.getByTestId('ms-go')).toBeEnabled();
 // Go on the page clock: one tick, Stop asks (No resumes), then the exposure finishes by itself.
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByTestId('ms-go').click();await expect(page.getByTestId('ms-clock')).toHaveAttribute('data-colour','red');await expect(page.getByTestId('ms-stop')).toBeEnabled();
 await page.clock.runFor(1000);await expect(page.getByTestId('ms-clock')).toHaveText('0:02');
 await page.getByTestId('ms-stop').click();await answer(page,'Do You Want to Terminate the Current Exposure?',false);
 await page.clock.runFor(2000);await expect(page.getByTestId('ms-clock')).toHaveText('0:00');await expect(page.getByTestId('ms-clock')).toHaveAttribute('data-colour','green');
 await page.clock.resume();
 // The list form: four items, no names (Show Object ID off).
 const list=page.getByTestId('ms-list');await expect(list.getByRole('heading',{name:'Spectra From Multi-channel Spectrometer'})).toBeVisible();
 for(let i=0;i<4;i++)await expect(page.getByTestId(`ms-item-${i}`)).toHaveText(`  (${i+1})  `);
 // Show spectrum 1 (the galaxy) and read its Information.
 await page.getByTestId('ms-item-0').click();await page.getByTestId('ms-show').click();
 const spectrum=page.getByTestId('ms-spectrum');await expect(spectrum).toHaveCount(1);await expect(page.getByTestId('ms-spectrum-caption')).toHaveText('(1)');
 await expect(spectrum.getByTestId('ms-plot')).toBeVisible({timeout:60000});
 expect(await spectrum.locator('polyline').getAttribute('points').then(p=>p!.split(' ').length)).toBe(400);
 await card(page).screenshot({path:'test-results/multispec-desktop.png'});
 await spectrum.getByTestId('ms-information').click();
 const info=page.getByTestId('ms-info');await expect(info.getByRole('heading',{name:'Spectrum Information'})).toBeVisible();
 await expect(page.getByTestId('ms-info-line-0')).toHaveText('Object: NGC 4889');await expect(info).toContainText('Exposure: 3.0 Seconds');await expect(info).toContainText('Avg. Photons per Channel: ');
 await expect(info).toContainText('Galaxy Type: ');await expect(info).toContainText('Z: hidden (instructor value)');
 await info.getByRole('button',{name:'OK',exact:true}).click();await expect(info).toHaveCount(0);
 // Print preview reuses the scoped print-preview pattern.
 await spectrum.getByTestId('ms-print').click();const preview=page.getByTestId('ms-print-preview');await expect(preview).toBeVisible();
 await expect(page.getByTestId('ms-print-line-0')).toHaveText('Object: (1) ');await page.getByTestId('ms-print-close').click();await expect(preview).toHaveCount(0);
 // Save: MSpec_1.SSP, 400 headerless lines; the list item gets its "*".
 const ssp=await download(page,()=>spectrum.getByTestId('ms-save').click());
 expect(ssp.name).toBe('MSpec_1.SSP');const lines=ssp.bytes.toString('latin1').split('\r\n');expect(lines).toHaveLength(401);expect(lines[400]).toBe('');
 expect(lines[0]).toMatch(/^3700\.00 \d\.\d{6}$/);expect(lines.slice(0,400).every(l=>/^\d{4}\.\d{2} \d\.\d{6}$/.test(l))).toBe(true);
 await expect(page.getByTestId('ms-item-0')).toHaveText('  (1)  *');
 await spectrum.getByTestId('ms-spectrum-exit').click();await expect(spectrum).toHaveCount(0);
 // Scan at 1 s: one spectrum at a time, wrapping through the list.
 await page.getByTestId('ms-item-0').click();await page.getByTestId('ms-scan').click();
 await expect(page.getByTestId('ms-scan-stop')).toBeEnabled();await expect(page.getByTestId('ms-spectrum-caption')).toHaveText('(1)');
 await expect(page.getByTestId('ms-spectrum-caption')).toHaveText('(2)',{timeout:5000});await expect(page.getByTestId('ms-spectrum')).toHaveCount(1);
 await page.getByTestId('ms-scan-stop').click();await expect(page.getByTestId('ms-scan')).toBeEnabled();
 await page.getByTestId('ms-close-all').click();await expect(page.getByTestId('ms-spectrum')).toHaveCount(0);
 // Save All: one STORE zip of the unsaved spectra (2, 3, 4), byte-exact .SSP files.
 await expect(page.getByTestId('ms-save-all')).toBeEnabled({timeout:60000});
 const zip=await download(page,()=>page.getByTestId('ms-save-all').click());expect(zip.name).toBe('MultiSpec_Spectra.zip');
 const entries=zipEntries(zip.bytes);expect(entries.map(e=>e.name)).toEqual(['MSpec_2.SSP','MSpec_3.SSP','MSpec_4.SSP']);
 for(const e of entries)expect(e.data.toString('latin1').split('\r\n')).toHaveLength(401);
 for(let i=0;i<4;i++)await expect(page.getByTestId(`ms-item-${i}`)).toHaveText(`  (${i+1})  *`);
 // Select Objects again: spectra already taken cannot be removed.
 await page.getByTestId('ms-select').click();await expect(page.getByTestId('ms-led')).toHaveAttribute('data-on','true');
 await at(field,145,173,'right');await okBox(page,'You Cannot Remove This Object!');
 // Clear All asks first; No keeps the list, Yes empties it.
 await page.getByTestId('ms-clear-all').click();await answer(page,'By cleaing this list you will lose any spectra you have not saved!\n\nContinue?',false);await expect(page.getByTestId('ms-item-0')).toBeVisible();
 await page.getByTestId('ms-clear-all').click();await answer(page,/^By cleaing this list/,true);await expect(page.locator('[data-testid^=ms-item-]')).toHaveCount(0);
});

test('Multi-Spec without Edit Mode: the form opens but clicks select nothing; 320 px and dark mode keep the page within the width',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await tracking(page);
 await pointComa2(page);await page.getByRole('button',{name:/^Telescope/}).click();
 await page.setViewportSize({width:320,height:800});
 await card(page).scrollIntoViewIfNeeded();await card(page).getByTestId('ms-access').click();await okBox(page,/^Click on objects/);
 await expect(page.getByTestId('ms-armed')).toHaveText(/^Object selection is off here/);
 const field=page.getByTestId('ms-field');await expect(field).toBeVisible({timeout:60000});await expect(field).toHaveAttribute('data-armed','false');
 await at(field,156,156);await expect(page.locator('[data-testid^=ms-marker-]')).toHaveCount(0);await expect(page.getByTestId('ms-init')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const bg=await card(page).evaluate(n=>getComputedStyle(n.querySelector('.ms-control')!).backgroundColor);expect(bg).not.toBe('rgb(255, 255, 255)');
 await page.screenshot({path:'test-results/multispec-320-dark.png',fullPage:false});
 await page.getByTestId('ms-close').click();await expect(page.getByTestId('ms-control')).toHaveCount(0);await expect(card(page).getByTestId('ms-access')).toBeEnabled();
});
test('Virtual Observatory (instructor, Front O2): mode 0 arms Multi-Spec selection without Edit Mode; off again disarms it',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await tracking(page);
 await pointComa2(page);await page.getByRole('button',{name:/^Telescope/}).click();
 const vo=async(on:boolean)=>{await page.locator('.telescope-motion').getByTestId('ob-options').click();const box=page.getByTestId('ob-options-virtual-observatory');if(on)await box.check();else await box.uncheck();await page.getByTestId('ob-options-ok').click();};
 await vo(true);
 await card(page).getByTestId('ms-access').click();await okBox(page,/^Click on objects/);
 const field=page.getByTestId('ms-field');await expect(field).toBeVisible({timeout:60000});await expect(field).toHaveAttribute('data-armed','true');
 await at(field,156,156);await expect(page.locator('[data-testid^=ms-marker-]')).toHaveCount(1);
 await vo(false);await expect(field).toHaveAttribute('data-armed','false');
});
