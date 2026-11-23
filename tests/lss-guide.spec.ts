import {test,expect,type Page} from '@playwright/test';
import{openHeaderTools}from'./fixtures/header-tools';
import {okWithVelocity} from './fixtures/lss-velocity';
// M7: the E02 guide checklist follows the student's own work and links to the survey and the wedge.
const step=(page:Page,s:string)=>page.getByTestId(`lss-lab-step-${s}`);
async function openGuide(page:Page){await openHeaderTools(page);await page.getByTestId('lss-lab-open').click();await expect(page.getByRole('dialog',{name:'Mapping large-scale structure'})).toBeVisible();}
async function closeGuide(page:Page){await page.getByRole('dialog').getByRole('button',{name:'Close LSS guide',exact:true}).click();}
/** The companion's Show me where under an installed clock: its two timer turns are run by hand. */
async function companionShow(page:Page){await page.getByTestId('guide-companion-show').click();await page.clock.runFor(50);await page.clock.runFor(50);await expect(page.getByTestId('guide-companion-spot')).toBeVisible();}
test('E02 guide: steps check off from loading, recording, plotting, describing and saving',async({page})=>{
 test.setTimeout(120000);
 await page.clock.install();await page.goto('/#observatory');await openGuide(page);
 for(const s of ['load','observe','record','repeat','wedge','describe','save'])await expect(step(page,s)).toHaveAttribute('data-done','false');
 await step(page,'load').getByRole('button',{name:'Go to the LSS survey',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Load selected list',exact:true}).click();await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:30000});
 await page.getByTestId('lss-row-1').getByRole('button',{name:'Point and view',exact:true}).click();
 await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start exposure',exact:true}).click();await page.clock.runFor(1000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill('20');
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await okWithVelocity(page);await page.clock.resume();
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
  // Front GUIDE-COMPANION: in the repeat step Show me where follows the galaxy in hand. The first galaxy is recorded and its
  // exposure and Record Z buttons are still enabled, so the next action is a row with no record; once that row is pointed at,
  // its own exposure, then its measurement.
  const strip=page.getByTestId('guide-companion'),second=i===1;
  if(second){await expect(strip).toHaveAttribute('data-step','repeat');await expect(page.locator('#lss-page')).toHaveAttribute('data-pointed-recorded','true');
   await companionShow(page);await expect(page.getByTestId('lss-row-2').getByRole('button',{name:'Point and view',exact:true})).toBeFocused();}
  await page.getByTestId(`lss-row-${row}`).getByRole('button',{name:'Point and view',exact:true}).click();
  if(second){await expect(page.locator('#lss-page')).not.toHaveAttribute('data-pointed-recorded');await companionShow(page);await expect(page.getByTestId('lss-acq-activate')).toBeFocused();}
  await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.getByRole('button',{name:'Start exposure',exact:true}).click();await page.clock.runFor(500);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
  if(second){await expect(page.locator('#lss-step')).toBeVisible();await companionShow(page);await expect(page.locator('#lss-step')).toBeFocused();await expect(strip).toHaveAttribute('data-step','repeat');}
  await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill(String(20+i));
  await page.getByRole('button',{name:'Record Z',exact:true}).click();await okWithVelocity(page);
  if(i===0){for(let k=0;k<4;k++){await page.getByRole('button',{name:'Record Z',exact:true}).click();await okWithVelocity(page);}
   await openGuide(page);await expect(step(page,'repeat')).toHaveAttribute('data-done','false');// Re-pinned 2026-10-30 (Front L3): with Time-Dependent Data off (VIREO's compiled default) the four extra Record Z on this galaxy
   // reuse its row (0x57c918): 1 record, not 5.
   await expect(page.getByTestId('lss-lab-counts')).toContainText('1 records of 1 galaxies');await closeGuide(page);}
  await page.clock.resume();
 }
 await openGuide(page);await expect(page.getByTestId('lss-lab-counts')).toContainText('5 records of 5 galaxies from 1 fields');
 // 9 records before Front L3 (re-pinned 2026-10-30).
 await expect(step(page,'repeat')).toHaveAttribute('data-done','true');
 await expect(step(page,'repeat')).toContainText('a guide suggestion in this version, not an original requirement');
});
