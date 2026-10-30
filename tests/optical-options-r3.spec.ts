import {test,expect,type Page} from '@playwright/test';
import {clickHeaderTool} from './fixtures/header-tools';
// Front R3: the ported Optical Simulation Options (analysis/front-plans/front-r3-options.md). They start from the compiled
// record, last for the page session, and change only what VIREO's own readers change.
const card=(p:Page)=>p.locator('.telescope-motion');
const id=(p:Page,t:string)=>p.getByTestId(t);
async function observatory(page:Page,clock=false){
 if(clock)await page.clock.install();
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 if(clock)await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 // The options dialog opens from the telescope-motion card, which is enabled with the dome open.
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
async function setOptions(page:Page,change:Readonly<Record<string,boolean>>){
 await card(page).getByTestId('ob-options').click();
 for(const [k,on] of Object.entries(change))await id(page,`ob-options-${k}`).setChecked(on);
 await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
}
const route=(page:Page,hash:string)=>page.evaluate(h=>{location.hash=h;},hash);

test('the dialog offers the ported options with their compiled states and shows the tab values read-only',async({page})=>{
 await observatory(page);await card(page).getByTestId('ob-options').click();
 for(const k of ['fast-slewing','infrared-camera'])await expect(id(page,`ob-options-${k}`)).toBeChecked();
 for(const k of ['fast-scope-change','compute-redshift-velocity','monochrome-displays','print-in-color'])await expect(id(page,`ob-options-${k}`)).not.toBeChecked();
 const others=id(page,'ob-options-others');await expect(others.getByRole('listitem')).toHaveCount(7);await expect(others).not.toContainText('Fast Slewing');
 await expect(id(page,'ob-options-tab-general')).toContainText('Finder Field (Degs)2.50');await expect(id(page,'ob-options-tab-ccd')).toContainText('Site CH350 003B Back-Illuminated');
 await expect(id(page,'ob-options-tab-ir')).toContainText('CLEA_IR1');await expect(id(page,'ob-options-tabs')).not.toContainText(/<input/);
 await expect(id(page,'ob-options-tabs').locator('input')).toHaveCount(0);await expect(id(page,'ob-options-tabs-note')).toContainText('not editable');
 // IRBoxMouseUp: unchecking Infrared Camera hides the IR tab at once (in the draft); Cancel keeps the option.
 await id(page,'ob-options-infrared-camera').uncheck();await expect(id(page,'ob-options-tab-ir')).toHaveCount(0);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await card(page).getByTestId('ob-options').click();await expect(id(page,'ob-options-infrared-camera')).toBeChecked();await expect(id(page,'ob-options-tab-ir')).toBeVisible();
 await id(page,'ob-options-dialog').screenshot({path:test.info().outputPath('options-dialog.png')});
 await id(page,'ob-options-tabs').scrollIntoViewIfNeeded();await id(page,'ob-options-dialog').screenshot({path:test.info().outputPath('options-tabs.png')});
});

test('Fast Scope Change keeps an open dome open on a telescope change; the compiled default closes it',async({page})=>{
 await observatory(page);
 const openDome=()=>page.getByRole('button',{name:'Open dome ↗',exact:true});
 await page.getByLabel('Telescope profile to inspect or select').selectOption('1');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 await expect(openDome()).toBeVisible();// default: closed by the change
 await openDome().click();await setOptions(page,{'fast-scope-change':true});
 await page.getByLabel('Telescope profile to inspect or select').selectOption('2');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 await expect(page.getByText('with Fast Scope Change on, the dome stayed open.',{exact:false})).toBeVisible();
 await expect(openDome()).toBeHidden();// still open
});

test('Infrared Camera off: the camera offers only the CCD and a selected IR camera returns to the CCD',async({page})=>{
 await observatory(page);
 const camera=id(page,'camera-control');
 await camera.getByLabel('IR camera (J, H, K)',{exact:true}).check();await expect(camera.getByRole('heading',{level:2})).toHaveText('IR camera');
 await setOptions(page,{'infrared-camera':false});
 await expect(camera.getByLabel('IR camera (J, H, K)',{exact:true})).toHaveCount(0);await expect(camera.getByRole('heading',{level:2})).not.toHaveText('IR camera');
 await setOptions(page,{'infrared-camera':true});await expect(camera.getByLabel('IR camera (J, H, K)',{exact:true})).toBeVisible();
});

test('Fast Slewing: a programmed slew runs at rate index 4, and at index 3 (half as far per tick) when unchecked',async({page})=>{
 await observatory(page,true);
 const coords=async(ra:string,dec:string,point=true)=>{if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);if(point)await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();};
 const tracking=async()=>{if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();};
 const travel=async()=>{
  await coords('.5','0');await tracking();await coords('.5','60',false);
  await card(page).getByRole('button',{name:'Slew to coordinate draft',exact:true}).click();await page.getByRole('button',{name:'Start programmed slew',exact:true}).click();
  await expect(id(page,'motion-phase')).toContainText(/Slewing|moving/i);
  await page.clock.runFor(100);const dec=Number(await id(page,'pointing-dec').textContent());
  await card(page).getByRole('button',{name:'Stop telescope motion',exact:true}).click();await expect(id(page,'motion-phase')).not.toContainText(/Slewing|moving/i);
  return dec;
 };
 const fast=await travel();await setOptions(page,{'fast-slewing':false});const slow=await travel();
 expect(fast).toBeGreaterThan(0);expect(slow).toBeGreaterThan(0);
 expect(fast/slow).toBeGreaterThan(1.6);expect(fast/slow).toBeLessThan(2.4);
});

test('Monochrome Displays and Print in Color switch the wedge plot schemes (FormShow and Print1Click)',async({page})=>{
 await observatory(page);
 await route(page,'#lss-wedge');await expect(id(page,'wedge-background')).toHaveAttribute('fill','#000080');
 await page.getByTestId('wedge-print').click();await expect(id(page,'wedge-print-preview').getByTestId('wedge-background')).toHaveAttribute('fill','#ffffff');
 await id(page,'wedge-print-preview').getByRole('button',{name:'Close',exact:true}).click();
 await route(page,'#observatory');await setOptions(page,{'monochrome-displays':true,'print-in-color':true});
 await route(page,'#lss-wedge');await expect(id(page,'wedge-background').first()).toHaveAttribute('fill','#ffffff');
 await page.getByTestId('wedge-print').click();await expect(id(page,'wedge-print-preview').getByTestId('wedge-background')).toHaveAttribute('fill','#000080');
});

test('Compute Rdshft Vel.: the LSS Measured Redshift Data dialog opens with c·z filled in, and OK accepts it',async({page})=>{
 test.setTimeout(120_000);
 await page.clock.install();await observatory(page);await setOptions(page,{'compute-redshift-velocity':true});
 await clickHeaderTool(page,'LSS survey');await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Load selected list',exact:true}).click();await expect(id(page,'lss-rows')).toBeVisible({timeout:30000});
 await id(page,'lss-row-1').getByRole('button',{name:'Point and view',exact:true}).click();
 await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start exposure',exact:true}).click();await page.clock.runFor(1500);
 await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill('20');
 await page.getByRole('button',{name:'Record Z',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Measured Redshift Data'});await expect(dialog).toBeVisible();
 const z=Number(await id(page,'lss-dialog-z').inputValue()),v=await id(page,'lss-dialog-velocity').inputValue();
 expect(v).toMatch(/^\d\.\d{3}E\+\d{2}$/);expect(Math.abs(Number(v)-299792.458*z)/(299792.458*z)).toBeLessThan(0.01);
 await page.getByRole('button',{name:'OK',exact:true}).click();await expect(dialog).toBeHidden();
 await expect(id(page,'lss-record-count')).toHaveText('1 records');
});
