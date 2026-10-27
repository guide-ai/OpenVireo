import{test,expect,type Page}from'@playwright/test';
const card=(p:Page)=>p.locator('.telescope-motion');
async function open(page:Page){await page.clock.install();await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();}
async function coords(page:Page,ra:string,dec:string){if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();}
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}
async function fill(page:Page,v:[string,string,string,string,string,string]){const names=['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'];for(let i=0;i<6;i++)await page.getByTestId(`ob-sky-${names[i]}`).fill(v[i]);}

test('Set Coordinates seeds from the pointing, rejects invalid RA, and OK slews through the programmed confirmation',async({page})=>{
 await open(page);await coords(page,'5.5','-12.25');await tracking(page);
 await card(page).getByRole('button',{name:'Set Coordinates…',exact:true}).click();
 const dialog=page.getByTestId('ob-sky-coords');await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Enter Sky Coordinates for Slew'})).toBeVisible();
 await expect(page.getByTestId('ob-sky-raHours')).toBeFocused();
 await expect(page.getByTestId('ob-sky-raHours')).toHaveValue('5');await expect(page.getByTestId('ob-sky-raMinutes')).toHaveValue('30');await expect(page.getByTestId('ob-sky-decDegrees')).toHaveValue('-12');await expect(page.getByTestId('ob-sky-decMinutes')).toHaveValue('15');
 await fill(page,['25','0','0','10','0','0']);await page.getByTestId('ob-sky-ok').click();
 await expect(page.getByTestId('ob-sky-error')).toContainText('Right Ascension must be');
 await page.getByTestId('ob-sky-error').getByRole('button',{name:'OK',exact:true}).click();
 await expect(page.getByTestId('ob-sky-error')).toBeHidden();await expect(dialog).toBeVisible();
 await fill(page,['6','0','0','10','30','0']);await page.getByTestId('ob-sky-decSeconds').press('Enter');
 await expect(dialog).toBeHidden();
 await expect(page.getByText('Target RA 6 h · Dec 10.5°')).toBeVisible();
 await expect(page.getByTestId('motion-confirm-note')).toHaveText(/Slew Telescope to Target Coordinates\?\s+RA:\s+6h\s+00m\s+00\.00s\s+Dec:\s+10°\s+30'\s+00\.0"/);
 await page.getByRole('button',{name:'Start programmed slew',exact:true}).click();
 await page.clock.runFor(3000);
 await expect(page.getByTestId('motion-phase')).toContainText('Programmed slew finished');
 await expect(page.getByTestId('pointing-ra')).toHaveText('6.00000');await expect(page.getByTestId('pointing-dec')).toHaveText('10.50000');
 // Reopen: the stored target is kept, not the pointing.
 await card(page).getByRole('button',{name:'Set Coordinates…',exact:true}).click();
 await expect(page.getByTestId('ob-sky-raHours')).toHaveValue('6');await expect(page.getByTestId('ob-sky-decMinutes')).toHaveValue('30');
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
});

test('Set Coordinates is usable at 320px',async({page})=>{
 await page.setViewportSize({width:320,height:720});await open(page);await coords(page,'1','2');
 await card(page).getByRole('button',{name:'Set Coordinates…',exact:true}).click();
 const dialog=page.getByTestId('ob-sky-coords');await expect(dialog).toBeVisible();
 const box=await dialog.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(320);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await page.getByTestId('ob-sky-cancel').click();await expect(dialog).toBeHidden();
 await expect(page.getByTestId('pointing-ra')).toHaveText('1.00000');
});
