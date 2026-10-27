import {test,expect,type Page} from '@playwright/test';
// M7: the E02 guide checklist follows the student's own work and links to the survey and the wedge.
const step=(page:Page,s:string)=>page.getByTestId(`lss-lab-step-${s}`);
async function openGuide(page:Page){await page.getByTestId('lss-lab-open').click();await expect(page.getByRole('dialog',{name:'Mapping large-scale structure'})).toBeVisible();}
async function closeGuide(page:Page){await page.getByRole('dialog').getByRole('button',{name:'Close LSS guide',exact:true}).click();}
test('E02 guide: steps check off from loading, recording, plotting, describing and saving',async({page})=>{
 test.setTimeout(120000);
 await page.clock.install();await page.goto('/');await openGuide(page);
 for(const s of ['load','observe','record','repeat','wedge','describe','save'])await expect(step(page,s)).toHaveAttribute('data-done','false');
 await step(page,'load').getByRole('button',{name:'Go to the LSS survey',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Load selected list',exact:true}).click();await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:30000});
 await page.getByTestId('lss-row-1').getByRole('button',{name:'Point and view',exact:true}).click();
 await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start exposure',exact:true}).click();await page.clock.runFor(1000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill('20');
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await page.getByRole('button',{name:'OK',exact:true}).click();await page.clock.resume();
 await openGuide(page);
 for(const s of ['load','observe','record'])await expect(step(page,s)).toHaveAttribute('data-done','true');
 for(const s of ['repeat','wedge','describe','save'])await expect(step(page,s)).toHaveAttribute('data-done','false');
 await expect(page.getByTestId('lss-lab-counts')).toHaveText('3 of 7 steps · 1 records of 1 galaxies from 1 fields · 0 plotted in the wedge');
 await closeGuide(page);
 await page.getByLabel('Describe the structure you see (not graded)',{exact:true}).fill('One galaxy so far.');
 await page.getByRole('button',{name:'Plot my records in the wedge',exact:true}).click();await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 1');
 const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();await d;
 await openGuide(page);
 for(const s of ['wedge','describe','save'])await expect(step(page,s)).toHaveAttribute('data-done','true');
 await expect(step(page,'repeat')).toHaveAttribute('data-done','false');
 await step(page,'wedge').getByRole('button',{name:'Go to the wedge',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('E02 guide: five different galaxies complete the repeat step; repeated Record Z on one galaxy does not',async({page})=>{
 test.setTimeout(180000);
 await page.clock.install();await page.goto('/#lss-survey');
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Load selected list',exact:true}).click();await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:30000});
 const rows=[1,2,4,5,7];
 for(const [i,row] of rows.entries()){
  await page.getByTestId(`lss-row-${row}`).getByRole('button',{name:'Point and view',exact:true}).click();
  await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.getByRole('button',{name:'Start exposure',exact:true}).click();await page.clock.runFor(500);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
  await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill(String(20+i));
  await page.getByRole('button',{name:'Record Z',exact:true}).click();await page.getByRole('button',{name:'OK',exact:true}).click();
  if(i===0){for(let k=0;k<4;k++){await page.getByRole('button',{name:'Record Z',exact:true}).click();await page.getByRole('button',{name:'OK',exact:true}).click();}
   await openGuide(page);await expect(step(page,'repeat')).toHaveAttribute('data-done','false');await expect(page.getByTestId('lss-lab-counts')).toContainText('5 records of 1 galaxies');await closeGuide(page);}
  await page.clock.resume();
 }
 await openGuide(page);await expect(page.getByTestId('lss-lab-counts')).toContainText('9 records of 5 galaxies from 1 fields');await expect(step(page,'repeat')).toHaveAttribute('data-done','true');
 await expect(step(page,'repeat')).toContainText('a guide suggestion in this version, not an original requirement');
});
