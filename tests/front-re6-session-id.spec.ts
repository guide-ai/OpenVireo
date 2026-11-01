import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import{clickHeaderTool}from'./fixtures/header-tools';
// Front RE6: one Set Date/Time ID for the whole page (VIREO's ShortString 0x5bc1e4, written by TUTTimeDlg OK 0x4fdf0c and
// prefilled at FormActivate 0x4fdcf5). The observatory dialog now offers the ID field; its OK, the radio dialog's OK and the
// Object X lab's ID field all write the same ID, and each dialog opens with it.
test.describe.configure({timeout:180_000});
async function observatoryDate(page:Page){
 await page.evaluate(()=>{location.hash='observatory';});await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15_000});
 if(!await page.getByTestId('ob-set-date').isVisible())await page.getByText('Site clock · fixed UT scenario',{exact:true}).click();
 await page.getByTestId('ob-set-date').click();await expect(page.getByTestId('ob-date-dialog')).toBeVisible();
}
const labId=(page:Page)=>page.locator('[data-testid=objectx-lab] input').first();
async function lab(page:Page){await page.evaluate(()=>{location.hash='object-x';});await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible({timeout:30_000});}

test('observatory dialog writes the shared ID (empty → UNKNOWN, kept when the date fails); the lab and the radio dialog follow, and back',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15_000});
 await observatoryDate(page);
 await expect(page.getByTestId('ob-date-id')).toHaveValue('');await expect(page.getByTestId('ob-date-dialog')).toContainText('ID # of Unknown Object');
 // OK writes the ID before checking the date: an invalid date keeps the dialog open but the ID is already stored.
 await page.getByTestId('ob-date-id').fill('A17');await page.getByTestId('ob-date-date').fill('2026/02/30');await page.getByTestId('ob-date-ok').click();
 await expect(page.getByTestId('ob-date-error')).toBeVisible();await page.getByTestId('ob-date-error').getByRole('button',{name:'OK'}).click();
 await page.getByTestId('ob-date-dialog').getByRole('button',{name:'Cancel'}).click();
 await lab(page);await expect(labId(page)).toHaveValue('A17');
 // The lab's own field writes the same ID: the observatory dialog opens with it.
 await labId(page).fill('B5');
 await observatoryDate(page);await expect(page.getByTestId('ob-date-id')).toHaveValue('B5');
 // Empty → UNKNOWN (0x4fe078).
 await page.getByTestId('ob-date-id').fill('');await page.getByTestId('ob-date-ok').click();await expect(page.getByTestId('ob-date-dialog')).toBeHidden();
 await lab(page);await expect(labId(page)).toHaveValue('UNKNOWN');
 // Radio Set Date/Time opens with the shared ID, and its OK writes it back.
 await labId(page).fill('C9');
 await clickHeaderTool(page,'Radio telescope');await expect(page.getByTestId('radio-control')).toBeVisible();
 await page.getByTestId('radio-exercise').click();await page.getByTestId('radio-clock-utc').fill('2009-06-01T04:05:06');await page.getByTestId('radio-clock-apply').click();
 await page.getByTestId('radio-date-menu').click();await expect(page.getByTestId('radio-date-field-id')).toHaveValue('C9');
 await page.getByTestId('radio-date-field-id').fill('D2');await page.getByTestId('radio-date-dialog').getByRole('button',{name:'OK'}).click();
 await expect(page.getByTestId('radio-date-stored')).toHaveAttribute('data-stored-id','D2');
 await lab(page);await expect(labId(page)).toHaveValue('D2');
 await observatoryDate(page);await expect(page.getByTestId('ob-date-id')).toHaveValue('D2');
});

// RE6 closure N1: a restored radio ID never overwrites a restored Object X ID; it only seeds an empty store.
async function radioDialogId(page:Page,id:string){
 await clickHeaderTool(page,'Radio telescope');await expect(page.getByTestId('radio-control')).toBeVisible();
 await page.getByTestId('radio-exercise').click();await page.getByTestId('radio-clock-utc').fill('2009-06-01T04:05:06');await page.getByTestId('radio-clock-apply').click();
 await page.getByTestId('radio-date-menu').click();await page.getByTestId('radio-date-field-id').fill(id);await page.getByTestId('radio-date-dialog').getByRole('button',{name:'OK'}).click();
 await expect(page.getByTestId('radio-date-stored')).toHaveAttribute('data-stored-id',id);
}
async function saveInvestigation(page:Page){const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();return readFile((await (await d).path())!);}
async function restoreInvestigation(page:Page,buffer:Buffer){
 await page.reload();await expect(page.getByRole('button',{name:'Save investigation',exact:true})).toBeVisible({timeout:30_000});
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'re6-id.json',mimeType:'application/json',buffer});
 await expect(page.getByText(/^Investigation restored\./)).toBeVisible({timeout:60_000});
}
test('restore: the Object X lab keeps its own ID although the radio file holds another; with no Object X data the radio ID seeds the store',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15_000});
 await radioDialogId(page,'RA');
 await lab(page);await expect(labId(page)).toHaveValue('RA');await labId(page).fill('LB');
 const both=await saveInvestigation(page);
 await restoreInvestigation(page,both);await lab(page);await expect(labId(page)).toHaveValue('LB');
 await observatoryDate(page);await expect(page.getByTestId('ob-date-id')).toHaveValue('LB');
 // Reverse: a file with the radio ID and no Object X investigation.
 await page.goto('/#observatory');await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15_000});
 await radioDialogId(page,'RC');
 const radioOnly=await saveInvestigation(page);expect(JSON.stringify(JSON.parse(radioOnly.toString()))).toContain('"RC"');
 await restoreInvestigation(page,radioOnly);
 await observatoryDate(page);await expect(page.getByTestId('ob-date-id')).toHaveValue('RC');
 await page.getByTestId('ob-date-dialog').getByRole('button',{name:'Cancel'}).click();
 await lab(page);await expect(labId(page)).toHaveValue('RC');
});
