import{test,expect,type Page}from'@playwright/test';
const card=(p:Page)=>p.locator('.telescope-motion');
async function open(page:Page){await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();}
async function coords(page:Page,ra:string,dec:string){if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();}

test('Add Current Item/Position adds the identified object or the position to the shared list',async({page})=>{
 await open(page);
 await page.getByRole('button',{name:'Point telescope ↗',exact:true}).click();
 await card(page).getByTestId('ob-add-current').click();
 const dialog=page.getByTestId('ob-entry');await expect(dialog.getByRole('heading',{name:'Add/Edit Hot List Entry'})).toBeVisible();
 const id=await page.getByTestId('ob-entry-id').inputValue();expect(id).not.toMatch(/-acquisition$|@/);
 await page.getByTestId('ob-entry-ok').click();
 await expect(page.getByTestId('ob-info-box')).toContainText(id?`Object ${id.slice(0,24)} added to Observation List.`:'Position added to Observation List.');
 await page.getByTestId('ob-info-box').getByRole('button',{name:'OK'}).click();
 // Front R4: any pointing names the nearest object within 350 px of the instrument field (0x59a0fc), here a GSC star; the remark is
 // its kind because no exercise guide was opened (exercise code 0).
 await coords(page,'3.25','-20.5');
 await card(page).getByTestId('ob-add-current').click();
 await expect(page.getByTestId('ob-entry-id')).toHaveValue('S1500-00805');await expect(page.getByTestId('ob-entry-remarks')).toHaveValue('Star');
 await page.getByTestId('ob-entry-cancel').click();
 // A field that cannot be loaded (its GSC tiles refused here): no object, so the ID starts empty.
 await page.route('**/original/gsc/**',r=>r.abort());
 await coords(page,'3.25','62.5');
 await card(page).getByTestId('ob-add-current').click();
 await expect(page.getByTestId('ob-entry-id')).toHaveValue('');await expect(page.getByTestId('ob-entry-remarks')).toHaveValue('');await expect(page.getByTestId('ob-entry-raHours')).toHaveValue('3');await expect(page.getByTestId('ob-entry-raMinutes')).toHaveValue('15');await expect(page.getByTestId('ob-entry-decDegrees')).toHaveValue('62');await expect(page.getByTestId('ob-entry-decMinutes')).toHaveValue('30');
 await page.getByTestId('ob-entry-raHours').fill('25');await page.getByTestId('ob-entry-ok').click();
 await expect(page.getByTestId('ob-entry-error')).toContainText('Right Ascension is Invalid!');await page.getByTestId('ob-entry-error').getByRole('button',{name:'OK'}).click();
 await page.getByTestId('ob-entry-raHours').fill('3');await page.getByTestId('ob-entry-ok').click();
 // A blank ID is allowed for Add Current (native "Position added…").
 await expect(page.getByTestId('ob-info-box')).toContainText('Position added to Observation List.');await page.getByTestId('ob-info-box').getByRole('button',{name:'OK'}).click();
 // Both rows are in the shared list (window and editor).
 await card(page).getByTestId('ob-view-select').click();await expect(page.getByTestId('ob-hotlist').getByRole('heading',{name:'New Hot List File'})).toBeVisible();
 await expect(page.getByTestId('ob-hotlist-rows').getByRole('radio')).toHaveCount(2);await page.keyboard.press('Escape');
 await page.getByText('Original hot lists',{exact:true}).click();await expect(page.getByText('HTL targets · 2')).toBeVisible();
});

test('the HTL editor accepts h/m/s and d/m/s entry through the original Add/Edit fields',async({page})=>{
 await open(page);await page.getByText('Original hot lists',{exact:true}).click();
 await page.getByRole('button',{name:'New HTL list',exact:true}).click();await page.getByRole('button',{name:'Add HTL target',exact:true}).click();
 await page.getByTestId('htl-sexagesimal').click();
 await page.getByTestId('htl-entry-id').fill('Vega');await page.getByTestId('htl-entry-raHours').fill('18');await page.getByTestId('htl-entry-raMinutes').fill('36');await page.getByTestId('htl-entry-raSeconds').fill('56.3');
 await page.getByTestId('htl-entry-decDegrees').fill('38');await page.getByTestId('htl-entry-decMinutes').fill('47');await page.getByTestId('htl-entry-decSeconds').fill('1.3');
 await page.getByTestId('htl-entry-decSeconds').press('Enter');await expect(page.getByTestId('htl-entry')).toBeHidden();
 await expect(page.locator('#htl-id')).toHaveValue('Vega');expect(Number(await page.locator('#htl-ra').inputValue())).toBeCloseTo(18+36/60+56.3/3600,12);expect(Number(await page.locator('#htl-dec').inputValue())).toBeCloseTo(38+47/60+1.3/3600,12);
 await page.getByRole('button',{name:'Apply HTL edit',exact:true}).click();await expect(page.getByText('HTL targets · 1')).toBeVisible();
});

test('Add Current fits 320px',async({page})=>{
 await page.setViewportSize({width:320,height:720});await open(page);await card(page).getByTestId('ob-add-current').click();
 await expect(page.getByTestId('ob-entry')).toBeVisible();const box=await page.getByTestId('ob-entry').boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(320);
 await page.getByTestId('ob-entry-cancel').click();await expect(page.getByTestId('ob-entry')).toBeHidden();
});

test('Add Current proposes the original catalog ID, never a web key (review F6)',async({page})=>{
 await open(page);await page.getByText('Original hot lists',{exact:true}).click();await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await expect(page.getByText('HTL rows loaded: 13.')).toBeVisible();
 await page.locator('#htl-rows').selectOption('1');await page.getByRole('button',{name:'Point to HTL selection',exact:true}).click();
 await page.getByRole('button',{name:'Use exact catalogue centre',exact:true}).click();
 await card(page).getByTestId('ob-add-current').click();await expect(page.getByTestId('ob-entry-id')).toHaveValue('36773');
 await page.getByTestId('ob-entry-cancel').click();
});

test('Front R2 (R1 review L5): an Edit left open while Add Current inserts a row above it still applies to its own row',async({page})=>{
 await open(page);await page.getByText('Original hot lists',{exact:true}).click();
 await page.getByRole('button',{name:'New HTL list',exact:true}).click();
 for(const [id,ra] of [['A','1'],['C','9']] as const){
  await page.getByRole('button',{name:'Add HTL target',exact:true}).click();
  await page.locator('#htl-id').fill(id);await page.locator('#htl-ra').fill(ra);await page.locator('#htl-dec').fill('0');
  await page.getByRole('button',{name:'Apply HTL edit',exact:true}).click();
 }
 await expect(page.getByText('HTL targets · 2')).toBeVisible();
 await page.locator('#htl-rows').selectOption({index:1});// C
 await page.getByRole('button',{name:'Edit HTL selection',exact:true}).click();await page.locator('#htl-id').fill('C-edited');
 // Another window adds X at RA 5: it goes between A and C (RA order), so C moves from row 2 to row 3.
 await coords(page,'5','0');await card(page).getByTestId('ob-add-current').click();
 await page.getByTestId('ob-entry-id').fill('X');await page.getByTestId('ob-entry-ok').click();
 await page.getByTestId('ob-info-box').getByRole('button',{name:'OK'}).click();
 await page.getByRole('button',{name:'Apply HTL edit',exact:true}).click();
 await expect(page.getByText('HTL targets · 3')).toBeVisible();
 const labels=await page.locator('#htl-rows option').allTextContents();
 expect(labels.map(l=>['A','X','C-edited','C'].find(n=>new RegExp(`(^|\\s)${n}(\\s|$)`).test(l)))).toEqual(['A','X','C-edited']);
});

test('Front R4: Add Current never names a hidden Object X target, even pointed at exactly (the leak OpenVireo.tsx:625 had)',async({page})=>{
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 await page.getByTestId('objectx-target').selectOption({index:1});
 await page.getByRole('button',{name:'Copy the coordinates to the observatory',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 // Show Object ID forced on by an exercise guide does not unmask it.
 await page.getByTestId('pleiades-lab-open').click();await page.keyboard.press('Escape');
 await card(page).getByTestId('ob-add-current').click();
 await expect(page.getByTestId('ob-entry-id')).toHaveValue('');await expect(page.getByTestId('ob-entry-remarks')).toHaveValue('');
});
