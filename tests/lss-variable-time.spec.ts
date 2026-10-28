import {test,expect} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
// Front T: the LSS list freezes the observatory-clock JD when its fields are built (shown in the caption) and the TRUE-dispatch
// variable stars use it. F8 row 22 (NGC 5924) has S CrB in view: observable with the frozen time. F2 row 24 (DV Com hit, outside
// the view) is observable regardless of the time. The time is whatever the observatory clock gives; no value is asserted.
test('E02: the field list records its frozen JD; rows with TRUE variable stars are observable',async({page})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await clickHeaderTool(page,'LSS survey');
 for(const [field,row] of [['8',22],['2',24]] as const){
  await page.getByLabel('Survey field',{exact:true}).selectOption(field);
  await page.getByRole('button',{name:'Load selected list',exact:true}).click();
  await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:60000});
  await expect(page.getByTestId('lss-field-jd')).toHaveText(/field built at JD \d{7}\.\d{5} \(observatory clock/);
  await expect(page.getByTestId(`lss-row-${row}`)).toContainText('Observable');
  await expect(page.getByTestId(`lss-row-${row}`)).not.toContainText('variable');
 }
 expect(errors).toEqual([]);
});
async function setDate(page:import('@playwright/test').Page,date:string){
 if(page.url()==='about:blank')await page.goto('/#observatory');else await page.evaluate(()=>{location.hash='#observatory';});// a hash change keeps the clock
 await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 const dome=page.getByRole('button',{name:'Open dome ↗',exact:true});if(await dome.isVisible())await dome.click();
 if(!await page.getByTestId('ob-set-date').isVisible())await page.getByText('Site clock · fixed UT scenario',{exact:true}).click();
 await page.getByTestId('ob-set-date').click({timeout:20000});await page.getByTestId('ob-date-date').fill(date,{timeout:20000});await page.getByTestId('ob-date-time').fill('3:00:00');await page.getByTestId('ob-date-ok').click({timeout:20000});
}
async function loadF8(page:import('@playwright/test').Page){
 await clickHeaderTool(page,'LSS survey');
 await page.getByLabel('Survey field',{exact:true}).selectOption('8');await page.getByRole('button',{name:'Load selected list',exact:true}).click();
 await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:60000});
}
test('E02: a changed observatory clock freezes a different JD',async({page})=>{
 test.setTimeout(180000);
 await page.goto('/');await loadF8(page);
 const first=await page.getByTestId('lss-field-jd').textContent();
 await setDate(page,'2026/10/27');await expect(page.getByTestId('site-clock-ut')).toHaveText('2026-10-27 03:00:00 UT');
 await loadF8(page);await expect(page.getByTestId('lss-field-jd')).not.toHaveText(first!,{timeout:30000});
 await expect(page.getByTestId('lss-row-22')).toContainText('Observable');
});
// The no-time state cannot be reached in the browser: the observatory clock always yields a JD and Set Date refuses dates outside
// its 1900–2099 domain. variable-time-required and its text are covered by Vitest (fieldEngineTrueDispatch, lssInvestigation).
