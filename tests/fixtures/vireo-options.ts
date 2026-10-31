import {expect,type Page} from '@playwright/test';
/** Front R4c: set VIREO's session options (Options dialog on the telescope-motion card, which needs the dome open) and come
 * back to the current route without a reload, so the page session keeps them. Keys are the dialog's test ids. */
export async function setVireoOptions(page:Page,change:Readonly<Record<string,boolean>>){
 const back=await page.evaluate(()=>location.hash);
 await page.evaluate(()=>{location.hash='observatory';});
 await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 const dome=page.getByRole('button',{name:'Open dome ↗',exact:true});if(await dome.isVisible())await dome.click();
 await page.locator('.telescope-motion').getByTestId('ob-options').click();
 for(const [k,on] of Object.entries(change))await page.getByTestId(`ob-options-${k}`).setChecked(on);
 await page.getByTestId('ob-options-ok').click();await expect(page.getByTestId('ob-options-dialog')).toBeHidden();
 await page.evaluate(h=>{location.hash=h;},back);
}
