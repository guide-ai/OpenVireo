import {test,expect,type Page} from '@playwright/test';

// Front V2 M4: File › Print of the HR diagram (0x542f44 / 0x542fc8) as a print preview of the recovered page body.
const panel=(p:Page)=>p.locator('.cluster-database-lab');
async function loadM67(p:Page){
 await p.goto('/#cluster-database');
 await panel(p).getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');
 await panel(p).getByRole('button',{name:'Load selected dataset',exact:true}).click();
 await expect(panel(p).getByTestId('db-hr-star-count')).toHaveText('# of Stars: 506');
}

test('HR Print shows the recovered page body in both VIREO layouts, never the print-job title',async({page})=>{
 await loadM67(page);
 await page.getByLabel('Trial apparent modulus V−Mv · 0–15, step 0.01',{exact:true}).fill('9.5');
 await page.getByTestId('db-hr-print-open').click();
 const preview=page.getByTestId('db-hr-print'),body=page.getByTestId('db-hr-print-body');
 await expect(preview.getByRole('heading',{name:'Print — Color-Magnitude Diagram'})).toBeVisible();
 await expect(body.locator('p')).toHaveText([/     Laboratory Table Number \(Not Recorded\)$/,'[student and lab text entered in VIREO: not recovered on this site]',
  'Fit of Zero-Age Main Sequence:','V - Mv = 9.50','E(B-V) = 0.03','Color-Magnitude Diagram']);
 await expect(preview).not.toContainText('CLEA Cluster Exercise');
 await expect(page.getByTestId('cluster-hr-print-image').locator('circle')).toHaveCount(506);
 await preview.getByLabel('Landscape').check();
 await expect(body).toContainText('(Screen Image Printed on Next Page)');
 await expect(page.getByTestId('db-hr-print-page2')).toHaveText('[student and lab text entered in VIREO: not recovered on this site] - Page 2');
 // Printing uses the cluster print scope and cleans it up.
 await page.evaluate(()=>{window.print=()=>{(window as unknown as {scope:string|null}).scope=document.documentElement.getAttribute('data-print-scope');window.dispatchEvent(new Event('afterprint'));};});
 await preview.getByRole('button',{name:'Print…'}).click();
 expect(await page.evaluate(()=>(window as unknown as {scope:string|null}).scope)).toBe('cluster-hr');
 await expect(page.locator('html')).not.toHaveAttribute('data-print-scope');
 await page.getByTestId('db-hr-print-close').click();await expect(preview).toHaveCount(0);
 await expect(page.getByTestId('db-hr-print-open')).toBeFocused();
});

test('without a ZAMS fit (V−Mv blank) the page has no ZAMS block',async({page})=>{
 await loadM67(page);
 await page.getByTestId('db-hr-print-open').click();
 await expect(page.getByTestId('db-hr-print-body').locator('p')).toHaveCount(3);
 await expect(page.getByTestId('db-hr-print-body')).not.toContainText('Fit of Zero-Age Main Sequence');
});
