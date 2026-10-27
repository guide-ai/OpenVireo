import{test,expect,type Page}from'@playwright/test';
async function open(page:Page){await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await page.getByText('Site clock · fixed UT scenario',{exact:true}).click();}
const runningClock=async(page:Page)=>{if(!await page.getByTestId('horizon-limit').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();};

test('Set Date/Time and Site Parameters drive the clocks and the horizon only; Site Information lists the site',async({page})=>{
 await open(page);
 await page.getByTestId('ob-set-date').click();
 await expect(page.getByTestId('ob-date-date')).toHaveValue('2000/01/01');await expect(page.getByTestId('ob-date-time')).toHaveValue('12:00:00');
 await page.getByTestId('ob-date-date').fill('2026/02/30');await page.getByTestId('ob-date-ok').click();
 await expect(page.getByTestId('ob-date-error')).toContainText('The date is not valid');await page.getByTestId('ob-date-error').getByRole('button',{name:'OK'}).click();
 await page.getByTestId('ob-date-date').fill('2026/10/27');await page.getByTestId('ob-date-time').fill('3:00:00');await page.getByTestId('ob-date-ok').click();
 await expect(page.getByTestId('site-clock-ut')).toHaveText('2026-10-27 03:00:00 UT');
 const local=await page.getByTestId('site-clock-local').textContent(),lst=await page.getByTestId('site-clock-sidereal').textContent();
 await runningClock(page);await expect(page.getByTestId('horizon-limit')).toHaveText('10.000000°');
 // Site Parameters: invalid longitude, then Greenwich with UT − local 0 and a 5° horizon.
 await page.getByTestId('ob-site-parameters').click();
 await expect(page.getByTestId('ob-station-name')).toHaveValue('Gettysburg College Observatory');await expect(page.getByTestId('ob-station-ew-1')).toBeChecked();
 await page.getByTestId('ob-station-lngDeg').fill('200');await page.getByTestId('ob-station-ok').click();
 await expect(page.getByTestId('ob-station-error')).toContainText('Longitude is Invalid!');await page.getByTestId('ob-station-error').getByRole('button',{name:'OK'}).click();
 await page.getByTestId('ob-station-name').fill('Greenwich test');await page.getByTestId('ob-station-lngDeg').fill('0');await page.getByTestId('ob-station-lngMin').fill('0');await page.getByTestId('ob-station-lngSec').fill('0');await page.getByTestId('ob-station-ew-0').check();
 await page.getByTestId('ob-station-utLocal').fill('0');await page.getByTestId('ob-station-horizon').fill('5');await page.getByTestId('ob-station-ok').click();
 await expect(page.getByTestId('ob-station-dialog')).toBeHidden();
 await expect(page.getByTestId('ob-site-status')).toContainText('Greenwich test');
 await expect(page.getByTestId('site-clock-local')).toHaveText('2026-10-27 03:00:00');expect(await page.getByTestId('site-clock-local').textContent()).not.toBe(local);
 expect(await page.getByTestId('site-clock-sidereal').textContent()).not.toBe(lst);
 await expect(page.getByTestId('horizon-limit')).toHaveText('5.000000°');
 // The telescope profile (used by acquisitions) still shows the compiled site.
 await page.getByText('Site information & optics',{exact:true}).click();
 await expect(page.locator('[data-optical-field="site"]')).toHaveText('Gettysburg College Observatory');await page.getByText('Site information & optics',{exact:true}).click();
 await page.getByTestId('ob-site-information').click();
 await expect(page.getByTestId('ob-site-info-lines')).toContainText('Site Name/ID: Greenwich test');await expect(page.getByTestId('ob-site-info-lines')).not.toContainText('Horizon Height');
 await page.keyboard.press('Escape');
 await page.getByTestId('ob-site-reset').click();await expect(page.getByTestId('site-clock-local')).toHaveText(local!);await expect(page.getByTestId('horizon-limit')).toHaveText('10.000000°');
});

test('site and date dialogs fit 320px',async({page})=>{
 await page.setViewportSize({width:320,height:720});await open(page);
 for(const [button,dialog] of [['ob-set-date','ob-date-dialog'],['ob-site-parameters','ob-station-dialog'],['ob-site-information','ob-site-info']]){
  await page.getByTestId(button).click();const box=await page.getByTestId(dialog).boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(320);await page.keyboard.press('Escape');await expect(page.getByTestId(dialog)).toBeHidden();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
