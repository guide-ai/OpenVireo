import{test,expect,type Page}from'@playwright/test';
import{readFileSync}from'node:fs';
import{clickHeaderTool}from'./fixtures/header-tools';
import{enterInstructorMode,leaveInstructorMode}from'./fixtures/instructor-mode';// Front T1: the options open only in instructor mode
// Front R5 (analysis/front-plans/front-r5.md): Edit Mode's hot-list rows and List › Save, the Preferences gate it opens, the
// options Reset and Limit Slewing under Edit Mode. Expected values are the recovered literals and the chosen web contract.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const card=(p:Page)=>p.locator('.telescope-motion');
async function observatory(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
async function coords(page:Page,ra:string,dec:string){if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();}
async function addRows(page:Page){
 for(const [ra,dec,remark] of [['1','20','first'],['3','30','second']]){await coords(page,ra,dec);await card(page).getByTestId('ob-add-current').click();await id(page,'ob-entry-id').fill(`RA${ra}`);await id(page,'ob-entry-remarks').fill(remark);await id(page,'ob-entry-ok').click();await id(page,'ob-info-box').getByRole('button',{name:'OK'}).click();}
}
async function setEditMode(page:Page,on:boolean){
 await enterInstructorMode(page);await card(page).getByTestId('ob-options').click();const box=id(page,'ob-options-edit-mode');
 if(on)await box.check();else await box.uncheck();await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
}

test('Edit Mode shows full hot-list rows in View/Select, Search and Print; Save needs Edit Mode and downloads the HTL',async({page})=>{
 await observatory(page);await addRows(page);
 await card(page).getByTestId('ob-view-select').click();const rows=id(page,'ob-hotlist-rows');
 await expect(id(page,'ob-hotlist-native-1')).toHaveText(/^ {3}1 /);
 await expect(id(page,'ob-hotlist-save')).toBeDisabled();
 // An edit enables Save (0x591652), but outside Edit Mode it only explains (0x591ad2).
 await rows.getByRole('radio').nth(1).check();await id(page,'ob-hotlist-edit').click();await id(page,'ob-entry-remarks').fill('edited');await id(page,'ob-entry-ok').click();
 await expect(id(page,'ob-hotlist-save')).toBeEnabled();await id(page,'ob-hotlist-save').click();
 const box=id(page,'ob-info-box');await expect(box).toContainText('Edit Mode Required!');await expect(box).toContainText('You must be in Edit Mode to save a new or modified Hot List.');
 await box.getByRole('button',{name:'OK'}).click();await id(page,'ob-hotlist-close').click();
 await setEditMode(page,true);
 await card(page).getByTestId('ob-view-select').click();
 await expect(id(page,'ob-hotlist-native-1')).toHaveText(/^RA1 {21}/);await expect(id(page,'ob-hotlist-native-1')).toContainText('first');
 await expect(id(page,'ob-hotlist-native-2')).toContainText('edited');
 await id(page,'ob-hotlist-search').click();await id(page,'ob-hotlist-query').fill('RA3');await page.keyboard.press('Enter');
 await expect(id(page,'ob-hotlist-found')).toContainText('row 2');
 await id(page,'ob-hotlist-print').click();await expect(id(page,'ob-hotlist-print-line-1')).toContainText('RA1');await expect(id(page,'ob-hotlist-print-line-2')).toContainText('edited');
 await page.keyboard.press('Escape');await expect(id(page,'ob-hotlist-print-preview')).toHaveCount(0);
 await expect(id(page,'ob-hotlist-save')).toBeEnabled();
 const download=page.waitForEvent('download');await id(page,'ob-hotlist-save').click();const file=await download;
 expect(file.suggestedFilename()).toBe('HotList.HTL');
 const bytes=readFileSync(await file.path());expect(bytes.length).toBe(2*86);expect(bytes.subarray(1,4).toString('latin1')).toBe('RA1');
 await expect(box).toContainText('Observation List File Saved');await expect(box).toContainText('Observation list saved in HotList.HTL');
 await box.getByRole('button',{name:'OK'}).click();await expect(id(page,'ob-hotlist-save')).toBeEnabled();
 await id(page,'ob-hotlist-close').click();
 // Edit Mode off again: the ordinal rows, and Save disabled at the next show.
 await setEditMode(page,false);await card(page).getByTestId('ob-view-select').click();
 await expect(id(page,'ob-hotlist-native-1')).toHaveText(/^ {3}1 /);await expect(id(page,'ob-hotlist-save')).toBeDisabled();
});

test('Reset asks, restores the compiled values into the dialog, and Cancel keeps the values from before; Edit Mode holds Limit Slewing off',async({page})=>{
 await observatory(page);
 const open=async()=>{await enterInstructorMode(page);await card(page).getByTestId('ob-options').click();await expect(id(page,'ob-options-dialog')).toBeVisible();};
 await open();await id(page,'ob-options-limit').check();await id(page,'ob-options-fast-scope-change').check();await id(page,'ob-options-fast-slewing').uncheck();await id(page,'ob-options-ok').click();
 await open();await expect(id(page,'ob-options-limit')).toBeChecked();
 await expect(id(page,'ob-options-teacher-deferred').locator('li')).toHaveCount(11);// Front T1: 12 − strict VO + 5 typed items; Front T2: − Demonstration Mode; Front T4: − Detect Sky, Set E(B-V); Front T5: − Restrict Scope Access, Request Time (Front T6 narrows 'parameters', same count)
 await expect(id(page,'ob-options-reset')).toHaveAttribute('title','Restore All Options to Default Values');
 await id(page,'ob-options-reset').click();const q=id(page,'ob-options-reset-box');
 await expect(q).toContainText('Are You Sure?');await expect(q).toContainText('Resetting all options to default values');
 await id(page,'ob-options-reset-box-no').click();await expect(q).toHaveCount(0);await expect(id(page,'ob-options-dialog')).toBeVisible();
 await expect(id(page,'ob-options-limit')).toBeChecked();await expect(id(page,'ob-options-fast-scope-change')).toBeChecked();
 await id(page,'ob-options-reset').click();await id(page,'ob-options-reset-box-yes').click();
 await expect(id(page,'ob-options-limit')).not.toBeChecked();await expect(id(page,'ob-options-fast-scope-change')).not.toBeChecked();await expect(id(page,'ob-options-fast-slewing')).toBeChecked();await expect(id(page,'ob-options-edit-mode')).not.toBeChecked();
 await id(page,'ob-options-dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 await open();await expect(id(page,'ob-options-limit')).toBeChecked();await expect(id(page,'ob-options-fast-scope-change')).toBeChecked();await expect(id(page,'ob-options-fast-slewing')).not.toBeChecked();
 // Edit Mode disables and clears Limit Slewing (EditModeBoxClick 0x5a6edc); OK stores it off.
 await id(page,'ob-options-edit-mode').check();await expect(id(page,'ob-options-limit')).toBeDisabled();await expect(id(page,'ob-options-limit')).not.toBeChecked();
 await expect(id(page,'ob-options-limit-edit-mode')).toBeVisible();
 await id(page,'ob-options-ok').click();
 await open();await expect(id(page,'ob-options-limit')).toBeDisabled();await id(page,'ob-options-edit-mode').uncheck();await expect(id(page,'ob-options-limit')).toBeEnabled();await expect(id(page,'ob-options-limit')).not.toBeChecked();
 await id(page,'ob-options-reset').click();await id(page,'ob-options-reset-box-yes').click();await id(page,'ob-options-ok').click();
 await open();await expect(id(page,'ob-options-fast-scope-change')).not.toBeChecked();await expect(id(page,'ob-options-fast-slewing')).toBeChecked();await expect(id(page,'ob-options-edit-mode')).not.toBeChecked();
});

test('Edit Mode and the radio Preferences share the page\'s one instructor gate (Front T1): it stays open with Edit Mode off and Leave closes it',async({page})=>{
 await observatory(page);
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','not-supplied');
 await clickHeaderTool(page,'Observatory');await setEditMode(page,true);
 await clickHeaderTool(page,'Radio telescope');const gate=id(page,'radio-access-gate');
 // Edit Mode is reached only with the gate open (instructor mode), so the gate keeps the instructor source.
 await expect(gate).toHaveAttribute('data-source','instructor');await expect(gate).toContainText('Instructor mode');
 await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-parent')).toBeVisible();
 await id(page,'radio-access-parent-cancel').click();await expect(id(page,'radio-access-parent')).toHaveCount(0);
 await clickHeaderTool(page,'Observatory');await setEditMode(page,false);
 await clickHeaderTool(page,'Radio telescope');await expect(gate).toHaveAttribute('data-source','instructor');
 await leaveInstructorMode(page);await expect(gate).toHaveAttribute('data-source','not-supplied');
 await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-refusal')).toBeVisible();
});

test('review 1 M2: an exercise guide sets VIREO\'s exercise byte: LSS shows full rows, and Edit/Delete need Edit Mode outside exercise 0',async({page})=>{
 await observatory(page);await addRows(page);
 const guide=async(testId:string)=>{const {openHeaderTools}=await import('./fixtures/header-tools');await openHeaderTools(page);await id(page,testId).click();await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);};
 // No guide (exercise 0): numbered rows, Edit and Delete enabled.
 await card(page).getByTestId('ob-view-select').click();await expect(id(page,'ob-hotlist-native-1')).toHaveText(/^ {3}1 /);await expect(id(page,'ob-hotlist-edit')).toBeEnabled();await id(page,'ob-hotlist-close').click();
 // LSS (exercise 5): full rows (fill 0x59066b); Edit/Delete follow Edit Mode (off).
 await guide('lss-lab-open');
 await card(page).getByTestId('ob-view-select').click();await expect(id(page,'ob-hotlist-native-1')).toHaveText(/^RA1 {21}/);
 await expect(id(page,'ob-hotlist-edit')).toBeDisabled();await expect(id(page,'ob-hotlist-delete')).toBeDisabled();await id(page,'ob-hotlist-close').click();
 // Object X (exercise 1): numbered rows, Edit/Delete disabled; Edit Mode enables them and shows full rows.
 await guide('objectx-lab-open');
 await card(page).getByTestId('ob-view-select').click();await expect(id(page,'ob-hotlist-native-1')).toHaveText(/^ {3}1 /);await expect(id(page,'ob-hotlist-edit')).toBeDisabled();await id(page,'ob-hotlist-close').click();
 await setEditMode(page,true);
 await card(page).getByTestId('ob-view-select').click();await expect(id(page,'ob-hotlist-native-1')).toHaveText(/^RA1 {21}/);await expect(id(page,'ob-hotlist-edit')).toBeEnabled();
});
