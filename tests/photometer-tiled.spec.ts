import{readFile}from'node:fs/promises';
import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';

// Front G G3b (analysis/front-plans/front-g-gsc.md §10) and G3 review 1: the photometer wherever the telescope points, VIREO's
// way. The student points the telescope in the Observatory and activates the photometer there (FormActivate never slews); the
// field is read from the compact GSC tiles. N5230-00946 (11 44 42.9 +55 22 43) and a sky position 0.01° north of it. No
// catalogue value is asserted.
const STAR={ra:'11.74525',dec:'55.37861111'},SKY={ra:'11.74525',dec:'55.38861111'};
const card=(p:Page)=>p.locator('.telescope-motion');
async function observatory(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
async function pointObservatory(page:Page,p:{ra:string;dec:string}){
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(p.ra);await page.locator('#point-dec').fill(p.dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await page.getByRole('button',{name:/^Telescope/}).click();
}
async function photometerHere(page:Page){
 await clickHeaderTool(page,'Pleiades photometry');await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();
}
const ready=async(page:Page)=>{
 await expect(page.getByText(/^Field at the telescope pointing: the nearest star is /)).toBeVisible({timeout:60000});
 await expect(page.getByTestId('photo-telescope-access')).toHaveAttribute('data-access','ready',{timeout:20000});
};
async function benchPoint(page:Page,p:{ra:string;dec:string}){
 await page.locator('#photo-point-ra').fill(p.ra);await page.locator('#photo-point-dec').fill(p.dec);await page.getByTestId('photo-point-telescope').click();
 await expect(page.getByTestId('photo-telescope-dec')).toHaveText(p.dec.replace(/0+$/,''),{timeout:20000});
}
async function integrate(page:Page){await page.getByRole('button',{name:'Start integration',exact:true}).click();await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeEnabled({timeout:30000});}

test('Observatory pointing, then Activate: the photometer measures there; sky on a clean patch and VIREO\'s sky question',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await observatory(page);await pointObservatory(page,SKY);await photometerHere(page);
 // M1: Activate keeps the student's pointing and reads the field there, with no retyping.
 await ready(page);await expect(page.getByTestId('photo-telescope-dec')).toHaveText(SKY.dec.replace(/0+$/,''));
 await expect(page.getByLabel('Photometry target',{exact:true})).toHaveValue(/^gsc:/);
 await integrate(page);
 // Back to the star through the checked bench move; the field is read again at once.
 await benchPoint(page,STAR);await ready(page);
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');await integrate(page);
 await expect(page.getByRole('button',{name:'Add notebook entry',exact:true})).toBeEnabled();
 // M3: Sky chosen again on the star moved the slider since activation (+0x41d), so VIREO does not ask.
 // Front P3: the star reading was not recorded, so Start first asks VIREO's "Telescope has Moved!" (0x4fffd4); No clears it.
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');await page.getByRole('button',{name:'Start integration',exact:true}).click();
 await expect(page.getByTestId('photo-moved').getByRole('heading',{name:'Telescope has Moved!'})).toBeVisible();await page.getByTestId('photo-moved-no').click();
 await expect(page.getByTestId('photo-not-saved')).toContainText('Current Readings Cleared!');await page.getByTestId('photo-not-saved-ok').click();
 await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeEnabled({timeout:30000});
 await expect(page.getByTestId('photo-sky-replace')).not.toBeVisible();
 // Sky declared before moving onto the star: the move stands for returning to the form, which clears the flag, so VIREO asks.
 await benchPoint(page,SKY);await ready(page);await benchPoint(page,STAR);await ready(page);
 await page.getByRole('button',{name:'Start integration',exact:true}).click();
 const dialog=page.getByTestId('photo-sky-replace');await expect(dialog.getByRole('heading',{name:'Reading Sky!'})).toBeVisible();
 await expect(dialog).toContainText('Are you sure you want to replace a sky reading with one that may be invalid?');
 await page.getByTestId('photo-sky-replace-no').click();await expect(page.getByText('The sky reading was kept; no new reading was started.')).toBeVisible();
 await page.getByRole('button',{name:'Start integration',exact:true}).click();await page.getByTestId('photo-sky-replace-yes').click();
 await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeEnabled({timeout:30000});
 expect(errors).toEqual([]);
});
// Re-pinned 2026-11-05 (Front AXISMERGE): M31's core holds no GSC star in the photometer field, so VIREO's field build stops at
// 0x597c8a ("No Stars Found in Field!") before the galaxy load and keeps the previous field's galaxies; it was photometer-galaxy.
test('a field VIREO\'s photometer cannot reproduce is typed: M31\'s core holds no catalogue star',async({page})=>{
 test.setTimeout(120000);await observatory(page);await pointObservatory(page,{ra:'0.7123',dec:'41.2692'});await photometerHere(page);
 await expect(page.getByTestId('photo-telescope-dec')).toHaveText('41.2692');
 await expect(page.getByTestId('photo-tiled-status')).toHaveAttribute('data-status','error',{timeout:60000});
 await expect(page.getByTestId('photo-tiled-status')).toContainText('No Stars Found in Field!');
});
test('the bench move follows the Observatory\'s checks: Limit Slewing refuses below the horizon',async({page})=>{
 test.setTimeout(120000);await observatory(page);
 await card(page).getByTestId('ob-options').click();await page.getByTestId('ob-options-limit').check();await page.getByTestId('ob-options-ok').click();
 await pointObservatory(page,STAR);await photometerHere(page);await ready(page);
 await page.locator('#photo-point-ra').fill('0');await page.locator('#photo-point-dec').fill('-80');await page.getByTestId('photo-point-telescope').click();
 await expect(page.getByRole('alert')).toContainText('Limit Slewing refuses a position below the horizon');
 await expect(page.getByTestId('photo-telescope-dec')).toHaveText(STAR.dec.replace(/0+$/,''));
});
test('a Pleiades target calibrated by a sky taken at a tiled pointing says why it will not count (G3 closure N3)',async({page})=>{
 test.setTimeout(180000);await observatory(page);await pointObservatory(page,SKY);await photometerHere(page);await ready(page);
 await integrate(page);await expect(page.getByTestId('photo-tiled-sky-note')).toHaveCount(0);
 const target=page.getByLabel('Photometry target',{exact:true});
 const pleiades=await target.locator('option').evaluateAll(o=>(o as HTMLOptionElement[]).map(x=>x.value).find(v=>v&&!v.startsWith('gsc:')));
 await target.selectOption(pleiades!);
 await expect(page.getByTestId('photo-tiled-sky-note')).toContainText('do not count toward the Pleiades exercise');
});
// Front PHTILED (analysis/front-phtiled/RECOVERY.md): NGC 221 (M32, CLEA_GLX.DAT record 895). The centre selects the galaxy; VIREO reads
// it in Object mode with an aperture fraction from its catalogue size, and its Sky reading depends on the Telescope display (refused).
test('a galaxy at the pointing: sky on a star patch, the galaxy refused in Sky mode and measured in Object mode',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await observatory(page);await pointObservatory(page,SKY);await photometerHere(page);await ready(page);await integrate(page);
 const GALAXY={ra:'0.71161111',dec:'40.86527778'};await benchPoint(page,GALAXY);
 await expect(page.getByText('Field at the telescope pointing: the centre selects the galaxy NGC 221.',{exact:false})).toBeVisible({timeout:60000});
 await expect(page.getByTestId('photo-galaxy-mark')).toHaveCount(1);
 await expect(page.getByTestId('photo-tiled-limit')).toHaveAttribute('data-reason','photometer-galaxy-sky');
 await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeDisabled();
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');
 await expect(page.getByTestId('photo-tiled-limit')).toHaveCount(0);
 await integrate(page);
 await expect(page.getByRole('button',{name:'Add notebook entry',exact:true})).toBeEnabled();
 expect(errors).toEqual([]);
});
// Front PHVAR (analysis/front-phvar/RECOVERY.md): GM And (CLEA_VStrs.dat record 0, a Cepheid). Its brightness comes from VIREO's
// light-curve model at the observatory time frozen when the field is prepared; the session keeps that JD and restores the reading.
test('a variable star at the pointing is measured at the frozen observatory time, saved and restored',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await observatory(page);await pointObservatory(page,SKY);await photometerHere(page);await ready(page);await integrate(page);
 const GM_AND={ra:'0.000992922',dec:'35.362846359'};await benchPoint(page,GM_AND);
 await expect(page.getByText('Field at the telescope pointing: the nearest star is GM And.',{exact:true})).toBeVisible({timeout:60000});
 const frozen=page.getByTestId('photo-tiled-frozen-time');await expect(frozen).toContainText('Variable stars in this field are shown at the observatory time');
 const jd=(await frozen.textContent())!.match(/JD ([0-9.]+)/)![1];
 await expect(page.getByLabel('Photometry target',{exact:true})).toHaveValue(new RegExp(`^gsc:.*:JD`));
 await expect(page.getByText(/^Variable star GM And \(catalogue record CLEA_VStrs\.dat@0, which takes over the nearby compact GSC star /)).toBeVisible();
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');await integrate(page);
 await page.getByRole('button',{name:'Add notebook entry',exact:true}).click();await page.getByLabel('Your transcribed V magnitude',{exact:true}).fill('13');await page.getByRole('button',{name:'Confirm notebook entry',exact:true}).click();
 const counts=await page.getByTestId('photo-counts').textContent();
 await frozen.scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/photometer-variable.png'});
 // Save: owner 16, the field event carries the frozen JD.
 const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Save photometer session',exact:true}).click();
 const raw=await readFile((await(await wait).path())!),session=JSON.parse(raw.toString());
 expect(session.version).toBe(16);expect(session.events.filter((e:{type:string})=>e.type==='field').at(-1)).toEqual({type:'field',ra:Number(GM_AND.ra),dec:Number(GM_AND.dec),jd:Number(jd)});
 // Restore in a fresh page: the frame is rebuilt at the stored JD and the reading replays.
 await page.reload();await observatory(page);await clickHeaderTool(page,'Pleiades photometry');await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 await page.getByLabel('Restore photometer session',{exact:true}).setInputFiles({name:'variable.json',mimeType:'application/json',buffer:raw});
 await expect(page.getByText('Photometer session restored and replayed.',{exact:false})).toBeVisible({timeout:60000});
 await expect(page.locator('.photometer-notebook tbody tr')).toHaveCount(1);await expect(page.getByTestId('photo-counts')).toHaveText(counts!);
 const again=page.waitForEvent('download');await page.getByRole('button',{name:'Save photometer session',exact:true}).click();
 expect(await readFile((await(await again).path())!)).toEqual(raw);
 expect(errors).toEqual([]);
});
