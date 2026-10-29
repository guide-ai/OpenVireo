import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {okWithVelocity} from './fixtures/lss-velocity';
// E02 negatives and dialog edge cases (review 1: F1, F2, F9).
const delay=(page:Page,file:string,ms:number)=>page.route(`**/original/hotlists/${file}`,async r=>{await new Promise(done=>setTimeout(done,ms));await r.continue().catch(()=>{});});
async function open(page:Page){await page.goto('/#lss-survey');await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();await expect(page.getByLabel('Survey field',{exact:true})).toBeEnabled();}
async function load(page:Page,field:string){await page.getByLabel('Survey field',{exact:true}).selectOption(field);await page.getByRole('button',{name:'Load selected list',exact:true}).click();}
async function toDialog(page:Page,clock=true){
 await page.getByTestId('lss-row-1').getByRole('button',{name:'Point and view',exact:true}).click();
 await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 if(clock)await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start exposure',exact:true}).click();
 if(clock)await page.clock.runFor(1000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill('20');
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await expect(page.getByRole('dialog',{name:'Measured Redshift Data'})).toBeVisible();
}
test('field names come from LSSFields.LST; cancelled and superseded loads change nothing; a tampered list is refused',async({page})=>{
 await open(page);
 await expect(page.getByLabel('Survey field',{exact:true}).locator('option[value="3"]')).toHaveText('Survey Field 3 — centre RA 12.75 h, Dec 29° (25 galaxies)');
 await delay(page,'LSS_Field02.HTL',1500);await load(page,'2');
 await page.getByRole('button',{name:'Cancel loading',exact:true}).click();await expect(page.getByText('Loading cancelled; nothing changed.')).toBeVisible();
 await expect(page.getByTestId('lss-rows')).toHaveCount(0);
 // A late Field 2 answer never replaces the later Field 3 list.
 await load(page,'2');await page.getByRole('button',{name:'Cancel loading',exact:true}).click();await load(page,'3');
 await expect(page.locator('[data-testid^="lss-row-"]')).toHaveCount(25,{timeout:30000});await page.waitForTimeout(1800);
 await expect(page.locator('[data-testid^="lss-row-"]')).toHaveCount(25);await expect(page.getByTestId('lss-rows')).toContainText('Survey Field 3');
 // Neighbour row: the slit selects the coincident catalogue galaxy.
 await expect(page.getByTestId('lss-row-16')).toContainText('the slit selects the coincident catalogue galaxy NGC 4842');
 await page.route('**/original/hotlists/LSS_Field04.HTL',async r=>{const res=await r.fetch();const b=Buffer.from(await res.body());b[1]^=1;await r.fulfill({response:res,body:b});});
 await load(page,'4');await expect(page.getByRole('alert')).toHaveText('The field list could not be loaded or verified; nothing changed.');
 await expect(page.getByTestId('lss-rows')).toContainText('Survey Field 3');
});
test('the 0.9 m names its brightness limit per row; leaving mid-load does not leave a stale loading notice',async({page})=>{
 await open(page);await page.getByLabel('Telescope',{exact:true}).selectOption({label:'KPNO 0.9m (36") Telescope'});await load(page,'1');
 await expect(page.locator('[data-testid^="lss-row-"]')).toHaveCount(23,{timeout:30000});
 expect(await page.locator('[data-testid^="lss-row-"]',{hasText:"too bright for this telescope's verified exposure range"}).count()).toBeGreaterThan(0);
 await delay(page,'LSS_Field05.HTL',1500);await load(page,'5');await clickHeaderTool(page,'Observatory');
 await clickHeaderTool(page,'LSS survey');await expect(page.getByText('Loading cancelled; nothing changed.')).toBeVisible();
 await expect(page.getByText('Loading the field list, catalogue and field evidence…')).toHaveCount(0);
});
test('Record Z: a pasted Tab is refused inline, the app survives, Object is read-only, and leaving the route closes the dialog',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await open(page);await page.clock.resume();await load(page,'1');await expect(page.getByTestId('lss-row-1')).toBeVisible({timeout:30000});
 await toDialog(page);
 await expect(page.getByLabel('Object',{exact:true})).toHaveAttribute('readonly','');
 await page.getByLabel('Remarks',{exact:true}).fill('a\tb');
 await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Remarks cannot contain tabs, line breaks or other control characters.');
 await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();
 await page.getByLabel('Remarks',{exact:true}).fill('clean');await okWithVelocity(page);
 await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');await expect(page.getByTestId('lss-results')).toContainText('clean');
 // Open the dialog again, then leave by history: the dialog closes, adds nothing and the app stays usable.
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.evaluate(()=>{location.hash='#observatory';});await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'LSS survey',exact:true}).click({timeout:5000});
 await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
 expect(errors).toEqual([]);
});
