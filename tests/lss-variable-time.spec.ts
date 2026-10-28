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
