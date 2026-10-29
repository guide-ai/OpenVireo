import {expect,type Page} from '@playwright/test';
/** Front L2: Measured Redshift Data takes a typed velocity (accepted within 1 % of c·z, as the original). Types c·z for the z the
 * dialog shows, then OK. */
export async function okWithVelocity(page:Page){
 const dialog=page.getByRole('dialog',{name:'Measured Redshift Data'});await expect(dialog).toBeVisible();
 const z=Number(await page.getByTestId('lss-dialog-z').inputValue());
 await page.getByTestId('lss-dialog-velocity').fill(String(Math.round(299792.458*z*100)/100));
 await page.getByRole('button',{name:'OK',exact:true}).click();
}
