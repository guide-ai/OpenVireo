import{test,expect,type Page,type Locator}from'@playwright/test';

// Front MEANBOUND (analysis/front-meanbound/RECOVERY.md §6): at Coma – 1 (the NGC 4874 pointing) on the 4 m, the star N2230-01732
// (V 7.17, control point (166, 24) of the Telescope crop) was typed multispec-mean-bound (a channel mean of 1.6·10⁷ at 1 min, above
// the former 10⁶). It now gives a spectrum; after about 2 h 13 min its channels pass 2^31 and wrap as VIREO's Int32 channels do,
// with one web note.
test.describe.configure({timeout:300_000});
const card=(p:Page)=>p.getByTestId('ms-card');
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}
async function editMode(page:Page){await page.locator('.telescope-motion').getByTestId('ob-options').click();await page.getByTestId('ob-options-edit-mode').check();await page.getByTestId('ob-options-ok').click();}
async function at(field:Locator,x:number,y:number){const b=(await field.boundingBox())!;await field.click({position:{x:(x+.5)*b.width/312,y:(y+.5)*b.height/312}});}
async function okBox(page:Page){const box=page.getByTestId('ms-box');await box.getByRole('button',{name:'OK',exact:true}).click();await expect(box).toHaveCount(0);}
async function exposeBrightStar(page:Page,minutes:string,seconds:number){
 await page.clock.install();
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByLabel('Telescope profile to inspect or select',{exact:true}).selectOption('2');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await tracking(page);
 await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill('12.99311111111111');await page.locator('#point-dec').fill('27.959722222222222');
 await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await expect(page.getByTestId('pointing-dec')).toHaveText(/^27\.95/,{timeout:30000});
 await page.getByRole('button',{name:/^Telescope/}).click();await editMode(page);
 await expect(page.getByTestId('em-caption')).toContainText('hubble-engine-coma',{timeout:30000});
 await card(page).scrollIntoViewIfNeeded();await card(page).getByTestId('ms-access').click();await okBox(page);
 const field=page.getByTestId('ms-field');await expect(field).toBeVisible({timeout:60000});await expect(field).toHaveAttribute('data-armed','true');
 await at(field,166,24);await expect(page.getByTestId('ms-marker-1')).toBeVisible();
 await page.getByTestId('ms-minutes').fill(minutes);await page.getByTestId('ms-init').click();await expect(page.getByTestId('ms-go')).toBeEnabled();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByTestId('ms-go').click();await expect(page.getByTestId('ms-clock')).toHaveAttribute('data-colour','red');
 for(let left=seconds;left>0;left-=600)await page.clock.runFor(Math.min(600,left)*1000);
 await expect(page.getByTestId('ms-clock')).toHaveAttribute('data-colour','green',{timeout:60000});
 await page.clock.resume();
 await page.getByTestId('ms-item-0').click();await page.getByTestId('ms-show').click();
 const spectrum=page.getByTestId('ms-spectrum');await expect(spectrum.getByTestId('ms-plot')).toBeVisible({timeout:60000});
 await expect(spectrum.getByTestId('ms-spectrum-status')).toHaveCount(0);
 return spectrum;
}
test('a star typed mean-bound before has a spectrum at 1 min on the 4 m, with no wrap note',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const spectrum=await exposeBrightStar(page,'1',60);
 await expect(spectrum.getByTestId('ms-wrapped')).toHaveCount(0);
 expect(errors).toEqual([]);
});
test('a 140-minute exposure of the same star wraps its Int32 channels as VIREO does and says so in one note',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const spectrum=await exposeBrightStar(page,'140',8400);
 await expect(spectrum.getByTestId('ms-wrapped')).toHaveText(/32-bit integers.*wrap modulo 2³² as in VIREO; some channels may show negative or misleadingly small values/);
 await spectrum.screenshot({path:'test-results/multispec-meanbound-wrapped.png'});
 expect(errors).toEqual([]);
});
