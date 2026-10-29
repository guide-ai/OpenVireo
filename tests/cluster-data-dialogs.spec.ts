import{test,expect,type Page}from'@playwright/test';
// Front K (docs/CLUSTER-DATA-DIALOGS.md): File › Cluster Data... → TClstrDlgForm1, View/Select → TClstrListForm1, OK → TClstrRptForm1
// (AL = 1). Expected lines are the recovered contract over the published cluster fields, not native runtime oracles.
const id=(page:Page,t:string)=>page.getByTestId(t);
async function observatory(page:Page){await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();}
async function openDialog(page:Page){await id(page,'fi-file-menu').click();await id(page,'cluster-data-menu').click();await expect(id(page,'cd-dialog')).toBeVisible();}
const DISTANCES=[/\bparsecs?\b/i,/Distance Modulus/,/millions/i,/MS TO/,/\(V-Mv\)/];

test('student path: list → Get Selection Data → OK gives the RA-sorted finding list; hot-list items; no catalogue distances',async({page})=>{
 await observatory(page);await openDialog(page);
 await expect(id(page,'cd-limit')).toHaveValue('20.0');await expect(id(page,'cd-type-1')).toBeChecked();await expect(id(page,'cd-sort-1')).toBeChecked();
 await expect(id(page,'cd-type-0')).toBeDisabled();await expect(id(page,'cd-use-telescope')).toBeDisabled();
 await id(page,'cd-file').click();await id(page,'cd-view-select').click();
 const lines=id(page,'cd-study-lines');await expect(lines).toContainText('Star Clusters with sufficient data for HR Diagrams, other studies.');
 await expect(lines).toContainText('NGC 752                  01 57 48.0   +37 41 00    75   Old cluster');
 await lines.getByText('NGC 752',{exact:false}).first().dblclick();await expect(id(page,'cd-study-list')).toHaveCount(0);
 await expect(id(page,'cd-name')).toHaveValue('NGC 752');await expect(id(page,'cd-raHours')).toHaveValue('1');await expect(id(page,'cd-raSeconds')).toHaveValue('48.00');await expect(id(page,'cd-diameter')).toHaveValue('75.0');
 await id(page,'cd-ok').click();
 const report=id(page,'cluster-data-lines');await expect(report).toBeVisible({timeout:15000});
 await expect(id(page,'cluster-data-line-0')).toHaveText('Cluster Name/ID: NGC 752');await expect(id(page,'cluster-data-line-1')).toHaveText(/^\d+ Stars$/);
 await expect(id(page,'cluster-data-line-3')).toHaveText('List sorted by Right Ascension.');
 await expect(id(page,'cluster-data-line-5')).toHaveText('Name/ID           Right Ascn. Declination ');
 const text=await report.innerText();for(const r of DISTANCES)expect(text).not.toMatch(r);
 await id(page,'cluster-data-line-7').click();await id(page,'cluster-data-selection-menu').click();await id(page,'cluster-data-add').click();
 await expect(id(page,'fi-box')).toContainText('Added to Current Hot List.');
});

test('arbitrary centres are refused with a typed reason; validation literals; Edit Mode unlocks Type and Sort',async({page})=>{
 await observatory(page);await openDialog(page);
 await id(page,'cd-diameter').fill('x');await id(page,'cd-ok').click();await expect(id(page,'fi-box')).toContainText('Diameter is Invalid!');await id(page,'fi-box').getByRole('button').click();
 await id(page,'cd-diameter').fill('0');await id(page,'cd-ok').click();await expect(id(page,'fi-box')).toContainText('Cluster Diameter is Zero!');await id(page,'fi-box').getByRole('button').click();
 await id(page,'cd-diameter').fill('30');await id(page,'cd-ok').click();
 await expect(id(page,'cluster-data-reason')).toContainText('only the 16 published cluster fields');
 await page.locator('.telescope-motion').getByTestId('ob-options').click();await id(page,'ob-options-edit-mode').check();await id(page,'ob-options-ok').click();
 await openDialog(page);await expect(id(page,'cd-type-0')).toBeEnabled();
 await id(page,'cd-file').click();await id(page,'cd-view-select').click();
 await expect(id(page,'cd-study-edit-note')).toBeVisible();const list=await id(page,'cd-study-lines').innerText();for(const r of DISTANCES)expect(list).not.toMatch(r);
 await id(page,'cd-study-lines').getByText('M 67 (NGC 2682)').dblclick();
 // FormActivate re-runs after the list closes and re-reads Type/Sort from the record [I], so they are chosen now.
 await id(page,'cd-type-0').check();await id(page,'cd-sort-0').check();await id(page,'cd-limit').fill('25');await id(page,'cd-ok').click();
 await expect(id(page,'cluster-data-line-0')).toHaveText('Cluster Name/ID: M 67 (NGC 2682)',{timeout:15000});await expect(id(page,'cluster-data-line-1')).toHaveText('506 Stars');
 await expect(id(page,'cluster-data-lines')).toContainText('List sorted by apparent magnitude (V).');
});

test('Add Cluster to List marks the list modified; closing asks to save and Save List is a typed reason',async({page})=>{
 await observatory(page);await openDialog(page);
 await id(page,'cd-name').fill('Mine');await id(page,'cd-diameter').fill('5');await id(page,'cd-file').click();await id(page,'cd-add-to-list').click();
 await id(page,'cd-file').click();await id(page,'cd-view-select').click();await expect(id(page,'cd-study-lines')).toContainText('Mine');
 // M2: an Add before the first View/Select leaves only the added cluster (FormShow loads only an empty list).
 await expect(id(page,'cd-study-lines')).not.toContainText('NGC 752');
 await page.keyboard.press('Escape');await expect(id(page,'fi-box')).toContainText('You have not saved your updated Cluster List.');await expect(id(page,'cd-dialog')).toBeVisible();
 await id(page,'cd-unsaved-yes').click();await expect(id(page,'fi-box')).toContainText('Save List is not available here');
});

async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}
async function pick(page:Page,name:string){await id(page,'cd-file').click();await id(page,'cd-view-select').click();await id(page,'cd-study-lines').getByText(name).first().dblclick();await expect(id(page,'cd-study-list')).toHaveCount(0);await expect(id(page,'cd-name')).toBeFocused();}

test('M1: a limit brighter than every star of the field answers VIREO\'s "No Stars Found in Field!" box',async({page})=>{
 await observatory(page);await openDialog(page);await pick(page,'NGC 752');await id(page,'cd-limit').fill('5.0');await id(page,'cd-ok').click();
 await expect(id(page,'fi-box')).toContainText('No Stars Found in Field!');await expect(id(page,'fi-box-text')).toContainText('Possible Error in Field Parameters:');await expect(id(page,'fi-box-text')).toContainText('LimitMag: 5.000');
 await id(page,'fi-box').getByRole('button').click();await expect(id(page,'cluster-data-reason')).toContainText('the rows of its previous query');await expect(id(page,'fi-file-menu')).toBeFocused();
});

test('Use Telescope Coordinates, Search, Start New / Entire hot lists, Print and Get Selection Data closing a modified list',async({page})=>{
 await observatory(page);await tracking(page);await openDialog(page);
 await expect(id(page,'cd-use-telescope')).toBeEnabled();await id(page,'cd-use-telescope').check();
 const ra=await page.getByTestId('pointing-ra').textContent();expect(ra).toBeTruthy();await expect(id(page,'cd-raHours')).toHaveJSProperty('readOnly',true);
 await id(page,'cd-use-telescope').uncheck();
 await id(page,'cd-file').click();await id(page,'cd-view-select').click();
 await id(page,'cd-study-list-menu').click();await id(page,'cd-study-search').click();await page.getByTestId('fi-find-query').fill('hyades');await page.getByTestId('fi-find-top').click();await expect(id(page,'cd-study-lines').getByRole('option',{selected:true})).toContainText('Hyades');
 await id(page,'cd-study-list-menu').click();await id(page,'cd-study-print').click();await expect(id(page,'cd-study-print-preview')).toContainText('Laboratory Table Number');await page.keyboard.press('Escape');
 await id(page,'cd-study-lines').getByText('M 34 (NGC 1039)').click();await id(page,'cd-study-selection-menu').click();await id(page,'cd-study-start').click();
 await expect(id(page,'fi-box')).toContainText('New Hot List Created - Object M 34 (NGC 1039) Added to New Hot List.');await id(page,'fi-box').getByRole('button').click();
 await id(page,'cd-study-lines').getByText('M 34 (NGC 1039)').dblclick();await expect(id(page,'cd-name')).toHaveValue('M 34 (NGC 1039)');
 await id(page,'cd-ok').click();await expect(id(page,'cluster-data-line-0')).toHaveText('Cluster Name/ID: M 34 (NGC 1039)',{timeout:15000});
 await id(page,'cluster-data-line-8').click();await id(page,'cluster-data-selection-menu').click();await id(page,'cluster-data-entire').click();
 await id(page,'cd-hot-unsaved-no').click();await expect(id(page,'fi-box')).toContainText('All stars from cluster M 34 (NGC 1039) placed in Hot List');
});

test('Get Selection Data on a modified list asks to save first (L1); 320 px dark',async({page})=>{
 await page.setViewportSize({width:320,height:800});await page.emulateMedia({colorScheme:'dark'});await observatory(page);await openDialog(page);
 await id(page,'cd-name').fill('Mine');await id(page,'cd-diameter').fill('5');await id(page,'cd-file').click();await id(page,'cd-add-to-list').click();
 await id(page,'cd-file').click();await id(page,'cd-view-select').click();await id(page,'cd-study-lines').getByText('Mine').dblclick();
 await expect(id(page,'fi-box')).toContainText('You have not saved your updated Cluster List.');await id(page,'cd-unsaved-no').click();
 await expect(id(page,'cd-study-list')).toHaveCount(0);await expect(id(page,'cd-name')).toHaveValue('Mine');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('L7: the File trigger has focus after the dialog closes by Cancel, Escape and OK',async({page})=>{
 await observatory(page);
 await openDialog(page);await id(page,'cd-cancel').click();await expect(id(page,'cd-dialog')).toHaveCount(0);await expect(id(page,'fi-file-menu')).toBeFocused();
 await openDialog(page);await page.keyboard.press('Escape');await expect(id(page,'cd-dialog')).toHaveCount(0);await expect(id(page,'fi-file-menu')).toBeFocused();
 await openDialog(page);await id(page,'cd-diameter').fill('30');await id(page,'cd-ok').click();await expect(id(page,'cd-dialog')).toHaveCount(0);await expect(id(page,'fi-file-menu')).toBeFocused();
});
