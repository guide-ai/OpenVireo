import{test,expect,type Page}from'@playwright/test';
const card=(p:Page)=>p.locator('.telescope-motion');
async function open(page:Page){await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await page.getByText('Original hot lists',{exact:true}).click();await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await expect(page.getByText('HTL rows loaded: 13.')).toBeVisible();}

test('Print… previews the shown list and prints only the report',async({page})=>{
 await open(page);await card(page).getByTestId('ob-view-select').click();
 const win=page.getByTestId('ob-hotlist'),native=await win.locator('[data-testid^="ob-hotlist-native-"]').allTextContents();
 await win.getByTestId('ob-hotlist-print').click();
 const preview=page.getByTestId('ob-hotlist-print-preview');await expect(preview).toBeVisible();
 await expect(page.getByTestId('ob-hotlist-print-heading')).toHaveText('Hot List File: Hubble.HTL');
 await expect(preview.locator('[data-testid^="ob-hotlist-print-line-"]')).toHaveText(native);
 await expect(page.getByTestId('ob-hotlist-print-count')).toHaveText('13 rows');
 await expect(page.getByTestId('ob-hotlist-print-print')).toBeFocused();
 await page.evaluate(()=>{(window as unknown as {printed:number}).printed=0;window.print=()=>{(window as unknown as {printed:number}).printed++;};});
 await page.getByTestId('ob-hotlist-print-print').click();
 expect(await page.evaluate(()=>(window as unknown as {printed:number}).printed)).toBe(1);
 await expect(page.locator('html')).toHaveAttribute('data-print-scope','hot-list');
 await page.emulateMedia({media:'print'});
 await expect(page.getByTestId('ob-hotlist-print-report')).toBeVisible();await expect(page.getByTestId('ob-hotlist-print-print')).toBeHidden();await expect(win).toBeHidden();
 await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
 await expect(page.locator('html')).not.toHaveAttribute('data-print-scope','hot-list');
 // A throwing print keeps the preview with an error.
 await page.evaluate(()=>{window.print=()=>{throw new Error('no printer');};});
 await page.getByTestId('ob-hotlist-print-print').click();await expect(page.getByTestId('ob-hotlist-print-error')).toContainText('could not open printing');
 await page.keyboard.press('Escape');await expect(preview).toBeHidden();await expect(win).toBeVisible();
});

test('the print preview fits 320px',async({page})=>{
 await page.setViewportSize({width:320,height:720});await open(page);await card(page).getByTestId('ob-view-select').click();
 await page.getByTestId('ob-hotlist').getByTestId('ob-hotlist-print').click();const preview=page.getByTestId('ob-hotlist-print-preview');await expect(preview).toBeVisible();
 const box=await preview.boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(320);
 await page.getByTestId('ob-hotlist-print-close').click();await expect(preview).toBeHidden();
});
