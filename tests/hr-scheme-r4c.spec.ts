import{test,expect,type Page}from'@playwright/test';
import{setVireoOptions}from'./fixtures/vireo-options';
// Front R4c (analysis/front-plans/front-r4c.md §1; dossier B §1–§2): the HR plot uses VIREO's schemes. Monochrome Displays is read
// when the view is shown (FormShow 0x542175); Print uses Print in Color xor 1 and then Monochrome Displays (0x542f44), and the
// print dialog's Cancel writes nothing.
const panel=(p:Page)=>p.locator('.cluster-database-lab'),plot=(p:Page)=>p.getByTestId('db-hr-plot');
async function m67(p:Page){
 await p.goto('/#cluster-database');await expect(panel(p).getByRole('heading',{name:'Star-cluster database laboratory',exact:true})).toBeVisible();
 await panel(p).getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');await panel(p).getByRole('button',{name:'Load selected dataset',exact:true}).click();
 await expect(plot(p)).toBeVisible({timeout:20000});
}
const bg=(p:Page)=>plot(p).locator('rect.hr-background').evaluate(e=>getComputedStyle(e).fill);

test('colour by default; Monochrome applies at the next show; Print follows Print in Color and Cancel writes nothing',async({page})=>{
 await m67(page);
 await expect(plot(page)).toHaveAttribute('data-scheme','colour');await expect.poll(()=>bg(page)).toBe('rgb(0, 0, 128)');
 expect(await plot(page).locator('.db-hr-axis').evaluate(e=>getComputedStyle(e).stroke)).toBe('rgb(255, 255, 0)');
 // Monochrome on: the route is hidden while the option changes, so the next show reads it.
 await setVireoOptions(page,{'monochrome-displays':true});
 await expect(plot(page)).toHaveAttribute('data-scheme','mono');await expect.poll(()=>bg(page)).toBe('rgb(255, 255, 255)');
 // Print dialog cancelled: nothing changes. Print in Color is off, so the copy is B&W.
 await page.getByTestId('db-hr-print-open').click();
 await expect(page.getByTestId('cluster-hr-print-svg')).toHaveAttribute('data-scheme','mono');
 await page.keyboard.press('Escape');await expect(page.getByTestId('db-hr-print')).toHaveCount(0);
 // Print in Color on and Monochrome off while the view is hidden: shown again it is colour, the print is colour.
 await setVireoOptions(page,{'monochrome-displays':false,'print-in-color':true});
 await expect(plot(page)).toHaveAttribute('data-scheme','colour');
 await page.getByTestId('db-hr-print-open').click();
 const copy=page.getByTestId('cluster-hr-print-svg');await expect(copy).toHaveAttribute('data-scheme','colour');
 expect(await copy.locator('rect.hr-background').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(0, 0, 128)');
 await page.evaluate(()=>{window.print=()=>{window.dispatchEvent(new Event('afterprint'));};});
 await page.getByTestId('db-hr-print-print').click();await page.getByTestId('db-hr-print-close').click();
 await expect(plot(page)).toHaveAttribute('data-scheme','colour');
});
