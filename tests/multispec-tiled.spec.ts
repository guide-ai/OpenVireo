import{test,expect,type Page,type Locator}from'@playwright/test';

// Front G G4b (analysis/front-plans/front-g-gsc.md §11): Multi-Spec at any pointing. VIREO builds the instrument field at every
// pointing (0x53be70) and gates Multi-Spec selection by mode, not pointing (MouseDown 0x53cfa8); the field here is assembled from
// the compact GSC tiles. N5230-00946 (11 44 42.9 +55 22 43): a star at control (156, 156) (src/io/multiSpecTiled.test.ts).
// No catalogue value is asserted.
test.describe.configure({timeout:240_000});
const card=(p:Page)=>p.getByTestId('ms-card');
async function observatory(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();
}
async function point(page:Page,ra:string,dec:string){
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);
 await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await expect(page.getByTestId('pointing-dec')).toHaveText(new RegExp('^'+dec.slice(0,5).replace('.','\\.')),{timeout:30000});
 await page.getByRole('button',{name:/^Telescope/}).click();
}
async function editMode(page:Page){await page.locator('.telescope-motion').getByTestId('ob-options').click();await page.getByTestId('ob-options-edit-mode').check();await page.getByTestId('ob-options-ok').click();}
async function access(page:Page){
 await card(page).scrollIntoViewIfNeeded();await card(page).getByTestId('ms-access').click();
 const box=page.getByTestId('ms-box');await box.getByRole('button',{name:'OK',exact:true}).click();await expect(box).toHaveCount(0);
}
async function at(field:Locator,x:number,y:number){const b=(await field.boundingBox())!;await field.click({position:{x:(x+.5)*b.width/312,y:(y+.5)*b.height/312}});}

test('Edit Mode at an arbitrary pointing: the tiled field is shown, a star is selected and its spectrum exposed',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await observatory(page);await point(page,'11.74525','55.37861111');await editMode(page);await access(page);
 const field=page.getByTestId('ms-field');await expect(field).toBeVisible({timeout:90000});await expect(field).toHaveAttribute('data-armed','true');
 await at(field,156,156);await expect(page.getByTestId('ms-marker-1')).toBeVisible();
 await page.getByTestId('ms-minutes').fill('0.05');await page.getByTestId('ms-init').click();await expect(page.getByTestId('ms-objects')).toHaveText('1');
 await page.getByTestId('ms-go').click();await expect(page.getByTestId('ms-clock')).toHaveAttribute('data-colour','green',{timeout:20000});
 await page.getByTestId('ms-item-0').click();await page.getByTestId('ms-show').click();
 const spectrum=page.getByTestId('ms-spectrum');await expect(spectrum.getByTestId('ms-plot')).toBeVisible({timeout:60000});
 await card(page).screenshot({path:'test-results/multispec-tiled.png'});
 expect(errors).toEqual([]);
});
test('without Edit Mode or mode 0 the tiled field is shown but clicks select nothing (VIREO gates by mode)',async({page})=>{
 await observatory(page);await point(page,'11.74525','55.37861111');await access(page);
 const field=page.getByTestId('ms-field');await expect(field).toBeVisible({timeout:90000});await expect(field).toHaveAttribute('data-armed','false');
 await at(field,156,156);await expect(page.locator('[data-testid^=ms-marker-]')).toHaveCount(0);
});
test('near an Object X position no tiled field is built',async({page})=>{
 // 3C 273 (an ObjectX.HTL QSO): the field would reveal the hidden identity.
 await observatory(page);await point(page,'12.485194444444444','2.0522222222222224');await access(page);
 await expect(page.getByTestId('ms-field-status')).toHaveText('Not available near an unrevealed Object X target: the record would show its identity before the exercise reveals it.',{timeout:30000});
 await expect(page.getByTestId('ms-field')).toHaveCount(0);
});
