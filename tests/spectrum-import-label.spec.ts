import {test,expect} from '@playwright/test';

// Front P3 review 1: the import cannot overwrite a label typed during the read, because the label cannot be typed then: while the
// file is read (Blob.arrayBuffer, held by the test) the page is inert. Once the import lands the field is editable again and keeps
// what is typed. (pleiades-sample's Firefox race was a fill into the inert field, which Playwright performs as a no-op.)
test('the label field is inert while an import is read and keeps a label typed after it lands',async({page})=>{
 await page.addInitScript(()=>{const orig=Blob.prototype.arrayBuffer,held:(()=>void)[]=[];(window as unknown as {__held:typeof held}).__held=held;
  Blob.prototype.arrayBuffer=function(this:Blob){const self=this;return new Promise<ArrayBuffer>(resolve=>held.push(()=>{void orig.call(self).then(resolve);}));};});
 await page.goto('/#spectrum');await expect(page.getByRole('heading',{name:'Measure redshift.'})).toBeVisible();
 await page.getByLabel('Import spectrum',{exact:true}).setInputFiles({name:'held.csv',mimeType:'text/csv',buffer:Buffer.from('3700 .2\n4000 .5\n4700 .4')});
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__held:unknown[]}).__held.length)).toBeGreaterThan(0);
 expect(await page.locator('#object').evaluate(i=>i.closest('[inert]')!==null)).toBe(true);
 await page.evaluate(()=>(window as unknown as {__held:(()=>void)[]}).__held.splice(0).forEach(f=>f()));
 await expect(page.locator('.file-identity')).toContainText('held.csv');
 expect(await page.locator('#object').evaluate(i=>i.closest('[inert]')!==null)).toBe(false);
 await page.getByLabel('Object or reference').fill('Typed after the read');
 await expect(page.getByLabel('Object or reference')).toHaveValue('Typed after the read');
});
