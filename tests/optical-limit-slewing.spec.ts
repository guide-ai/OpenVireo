import{test,expect,type Page}from'@playwright/test';
const card=(p:Page)=>p.locator('.telescope-motion');
const LAT=39.84027778;
async function open(page:Page){await page.clock.install();await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();}
async function coords(page:Page,ra:number,dec:number){if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();await page.locator('#point-ra').fill(String(ra));await page.locator('#point-dec').fill(String(dec));await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();}
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}
async function lst(page:Page){await page.getByText('Site clock · fixed UT scenario',{exact:true}).click();const v=Number((await page.getByTestId('site-clock-sidereal').textContent())!.replace(' h',''));await page.getByText('Site clock · fixed UT scenario',{exact:true}).click();return v;}
async function limit(page:Page,on:boolean){await card(page).getByTestId('ob-options').click();const box=page.getByTestId('ob-options-limit');await expect(box).not.toBeChecked();if(on)await box.check();await page.getByTestId('ob-options-ok').click();}
const wrap=(h:number)=>((h%24)+24)%24;

test('Limit Slewing is off by default; on, it refuses a programmed slew below the horizon and stops a manual move',async({page})=>{
 await open(page);const t=await lst(page);
 // Off: a below-horizon target reaches the normal confirmation.
 await coords(page,wrap(t),0);await tracking(page);
 await card(page).getByTestId('ob-set-coordinates').click();await page.getByTestId('ob-sky-raHours').fill(String(Math.floor(wrap(t+12))));await page.getByTestId('ob-sky-decDegrees').fill('-30');await page.getByTestId('ob-sky-ok').click();
 await expect(page.getByRole('button',{name:'Start programmed slew',exact:true})).toBeVisible();await page.getByRole('button',{name:'Cancel slew',exact:true}).click();
 await limit(page,true);
 await card(page).getByTestId('ob-set-coordinates').click();await page.getByTestId('ob-sky-ok').click();
 const box=page.getByTestId('motion-limit-box');await expect(box.getByRole('heading',{name:'Cannot Perform Slew'})).toBeVisible();await expect(box).toContainText('Target Coordinates are Below the Horizon!');
 await box.getByRole('button',{name:'OK'}).click();await expect(page.getByRole('button',{name:'Start programmed slew',exact:true})).toBeHidden();
 // Manual: on the meridian 11° up, holding South stops at the 10° horizon with the native box.
 await coords(page,wrap(t),LAT-79);await card(page).getByLabel('Manual motion multiplier',{exact:true}).selectOption('4');
 const south=card(page).getByRole('button',{name:'Hold South',exact:true});await south.focus();await page.keyboard.down('Space');await page.clock.runFor(5000);await page.keyboard.up('Space');
 await expect(page.getByTestId('motion-limit-box')).toContainText('The Scope Has Reached the South Horizon Limit!');await expect(page.getByTestId('motion-limit-box').getByRole('heading',{name:'Slew Limit Reached!'})).toBeVisible();
 const dec=Number(await page.getByTestId('pointing-dec').textContent());expect(dec).toBeLessThan(LAT-79);expect(dec).toBeGreaterThan(LAT-80.2);
 await page.getByTestId('motion-limit-box').getByRole('button',{name:'OK'}).click();
});

test('with Limit Slewing on, tracking a setting target turns the drive off at the horizon',async({page})=>{
 await open(page);const t=await lst(page);await limit(page,true);
 // Dec 0 at an hour angle where the altitude is 10.02°: west of the meridian, it sets within about 10 s of clock time.
 const phi=LAT*Math.PI/180,ha=Math.acos(Math.sin(10.02*Math.PI/180)/Math.cos(phi))*12/Math.PI;
 await coords(page,wrap(t-ha),0);await tracking(page);
 await page.getByRole('button',{name:'Start observatory clock',exact:true}).click();
 for(let i=0;i<40&&!await page.getByTestId('motion-limit-box').isVisible();i++)await page.clock.runFor(1000);
 await expect(page.getByTestId('motion-limit-box')).toContainText('The Scope Has Reached the Western Limit!');await expect(page.getByTestId('motion-limit-box').getByRole('heading',{name:'Horizon Limit Reached!'})).toBeVisible();
 await page.getByTestId('motion-limit-box').getByRole('button',{name:'OK'}).click();
 await expect(page.getByTestId('running-clock-tracking')).toHaveText('Tracking off · RA drifts while clock runs');
});

test('with Limit Slewing on, the immediate Point shortcuts are refused below the horizon',async({page})=>{
 await open(page);await coords(page,1,40);const before=await page.getByTestId('pointing-dec').textContent();
 await limit(page,true);
 await coords(page,0,-80);
 const box=page.getByTestId('motion-limit-box');await expect(box.getByRole('heading',{name:'Cannot Perform Slew'})).toBeVisible();
 await expect(box).toContainText('Target Coordinates are Below the Horizon!');await expect(box).toContainText('-80°');
 await box.getByRole('button',{name:'OK'}).click();await expect(box).toBeHidden();
 await expect(page.getByTestId('pointing-dec')).toHaveText(before!);
 await tracking(page);await expect(page.getByTestId('horizon-enforcement')).toContainText('Limit Slewing: on');
});

test('the Options dialog lists the other original options as text with recovered compiled states (review F8)',async({page})=>{
 await open(page);await card(page).getByTestId('ob-options').click();
 const list=page.getByTestId('ob-options-others');await expect(list.getByRole('checkbox')).toHaveCount(0);
 // Front O: Edit Mode, Front O2: Virtual Observatory, and Front R3's six ported options are live (non-persisted) check boxes,
 // so 7 of the 15 other options remain listed as text.
 await expect(list).not.toContainText('Fast Slewing');await expect(list.getByRole('listitem')).toHaveCount(6);// Front L3 (2026-10-30): Time-Dependent Data is live tooawait expect(list).not.toContainText('Edit Mode');await expect(list).not.toContainText('Virtual Observatory');
 await expect(page.getByTestId('ob-options-dialog').getByRole('checkbox')).toHaveCount(10);await expect(page.getByTestId('ob-options-fast-slewing')).toBeChecked();await expect(page.getByTestId('ob-options-edit-mode')).not.toBeChecked();await expect(page.getByTestId('ob-options-virtual-observatory')).not.toBeChecked();
});

test('a refused HTL Point leaves the selected target, the card and the pointing exactly as they were (review note 1)',async({page})=>{
 await open(page);await coords(page,1,40);await limit(page,true);
 const snapshot=async()=>({card:await page.locator('.target-coordinates').first().innerText(),cards:await page.locator('.target-card').allInnerTexts(),ra:await page.getByTestId('pointing-ra').textContent(),dec:await page.getByTestId('pointing-dec').textContent(),hubble:await page.getByTestId('hubble-point-card').count()});
 // NGC 5128 (catalog RA/Dec exactly) never rises above the 10° Gettysburg horizon.
 await page.getByText('Original hot lists',{exact:true}).click();await page.getByRole('button',{name:'New HTL list',exact:true}).click();await page.getByRole('button',{name:'Add HTL target',exact:true}).click();
 await page.getByLabel('HTL identifier',{exact:true}).fill('NGC5128');await page.getByLabel('HTL right ascension · hours',{exact:true}).fill('13.42433889');await page.getByLabel('HTL declination · degrees',{exact:true}).fill('-43.01911111');
 await page.getByRole('button',{name:'Apply HTL edit',exact:true}).click();
 const before=await snapshot();
 await page.getByRole('button',{name:'Point to HTL selection',exact:true}).click();
 const box=page.getByTestId('motion-limit-box');await expect(box.getByRole('heading',{name:'Cannot Perform Slew'})).toBeVisible();
 await box.getByRole('button',{name:'OK'}).click();await expect(box).toBeHidden();
 expect(await snapshot()).toEqual(before);
 expect(before.card).not.toContain('NGC 5128');
});
