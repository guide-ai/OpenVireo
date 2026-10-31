import {test,expect,type Page} from '@playwright/test';
import {clickHeaderTool} from './fixtures/header-tools';
import {okWithVelocity} from './fixtures/lss-velocity';
// Front R4 (analysis/front-plans/front-r4.md R4.3; analysis/front-r4/D-wedge-time-dependent.md §1).
async function acquireAndRecord(page:Page,row:number,shift:string){
 await page.getByTestId(`lss-row-${row}`).getByRole('button',{name:'Point and view',exact:true}).click();
 await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start exposure',exact:true}).click();await page.clock.runFor(1500);
 await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill(shift);
 await page.getByRole('button',{name:'Record Z',exact:true}).click();
}
test('LSS Record Z OK: the 0x583b20 text before the wedge was shown; afterwards a silent whole-list re-plot (0x58383c); Cancel does nothing',async({page})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.goto('/');await clickHeaderTool(page,'LSS survey');
 const heading=page.getByRole('heading',{name:'Large-scale structure survey',exact:true});await expect(heading).toBeVisible();
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Load selected list',exact:true}).click();
 await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:30000});
 const status=page.locator('.lss-main .observatory-feedback [role=status]');
 await acquireAndRecord(page,1,'20');await okWithVelocity(page);await page.clock.resume();
 await expect(status).toContainText('Z Measurement Saved: Z Measurement added to results list. Save, plot, view list under "Tools"-> "Results Editors"->"Observational Results" on main Window.');
 await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
 // Show the wedge once (nothing handed over yet), then come back.
 await page.evaluate(()=>{location.hash='#lss-wedge';});await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 0');
 await page.evaluate(()=>{location.hash='#lss-survey';});await expect(heading).toBeVisible();
 // Cancel: no hand-over.
 await acquireAndRecord(page,2,'25');await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.clock.resume();
 await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await okWithVelocity(page);
 await expect(status).toContainText('the LSS wedge plot was redrawn with all your records');
 await expect(heading).toBeVisible();expect(await page.evaluate(()=>location.hash)).toBe('#lss-survey');// not brought forward
 await expect(page.getByRole('button',{name:'Plot my records in the wedge',exact:true})).toBeDisabled();
 await page.evaluate(()=>{location.hash='#lss-wedge';});await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 2');
 expect(errors).toEqual([]);
});
