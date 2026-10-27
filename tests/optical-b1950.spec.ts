import{test,expect,type Page}from'@playwright/test';
const card=(p:Page)=>p.locator('.telescope-motion');
async function open(page:Page){await page.clock.install();await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();}
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}
async function fill(page:Page,v:string[]){const names=['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'];for(let i=0;i<6;i++)await page.getByTestId(`ob-sky-${names[i]}`).fill(v[i]);}

test('a B1950.0 entry is precessed to J2000.0, labelled in the confirmation, and reopens converted back (V1)',async({page})=>{
 await open(page);await tracking(page);
 await card(page).getByTestId('ob-set-coordinates').click();
 await fill(page,['1','0','0','30','0','0']);await page.getByTestId('ob-sky-epoch-1').check();
 await expect(page.getByTestId('ob-sky-b1950-note')).toBeVisible();
 await page.getByTestId('ob-sky-ok').click();
 const note=page.getByTestId('motion-confirm-note');
 await expect(note).toContainText('(Input B1950.0 Coordinates Precessed to J2000.0.)');
 await expect(note).toHaveText(/RA:\s+1h\s+02m\s+43\.99s\s+Dec:\s+30°\s+16'\s+06\.5"/);
 await page.getByRole('button',{name:'Start programmed slew',exact:true}).click();await page.clock.runFor(20000);
 await expect(page.getByTestId('motion-phase')).toContainText('Programmed slew finished');
 await expect(page.getByTestId('pointing-ra')).toHaveText('1.04555');await expect(page.getByTestId('pointing-dec')).toHaveText('30.26849');
 // Reopen: flag still set, the stored J2000 target is shown converted back to B1950.0.
 await card(page).getByTestId('ob-set-coordinates').click();
 await expect(page.getByTestId('ob-sky-epoch-1')).toBeChecked();await expect(page.getByTestId('ob-sky-b1950-reopen')).toBeVisible();
 await expect(page.getByTestId('ob-sky-raHours')).toHaveValue('1');await expect(page.getByTestId('ob-sky-raSeconds')).toHaveValue('0.00');await expect(page.getByTestId('ob-sky-decDegrees')).toHaveValue('30');
 // Switching back to J2000 clears the flag on OK.
 await page.getByTestId('ob-sky-epoch-0').check();await fill(page,['2','0','0','10','0','0']);await page.getByTestId('ob-sky-ok').click();
 await expect(note).not.toContainText('B1950');await page.getByRole('button',{name:'Cancel slew',exact:true}).click();
 await card(page).getByTestId('ob-set-coordinates').click();await expect(page.getByTestId('ob-sky-epoch-0')).toBeChecked();
});
