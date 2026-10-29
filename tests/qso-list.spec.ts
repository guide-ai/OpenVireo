import{test,expect,type Page}from'@playwright/test';
import{readFile}from'node:fs/promises';
import{paceDownload}from'./fixtures/download-pacing';

// Front O2 (docs/QSO-LIST-HST.md): File › QSO List (TQSOListDlg, TQSORptForm1) behind the Virtual Observatory option, and Tools › HST Image Archive (external link opened only on click, user decision 2026-10-28).
const card=(p:Page)=>p.locator('.telescope-motion');
async function open(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
async function option(page:Page,id:'ob-options-edit-mode'|'ob-options-virtual-observatory',on:boolean){
 await card(page).getByTestId('ob-options').click();const box=page.getByTestId(id);
 if(on)await box.check();else await box.uncheck();await page.getByTestId('ob-options-ok').click();
}
const editMode=(page:Page,on:boolean)=>option(page,'ob-options-edit-mode',on);
const virtualObservatory=(page:Page,on:boolean)=>option(page,'ob-options-virtual-observatory',on);
async function qsoMenu(page:Page){await page.getByTestId('fi-file-menu').click();await page.getByTestId('qso-menu').click();await expect(page.getByTestId('qso-options')).toBeVisible();}
async function download(page:Page,click:()=>Promise<void>){await paceDownload(page);const d=page.waitForEvent('download');await click();const e=await d;return {name:e.suggestedFilename(),bytes:await readFile((await e.path())!)};}
const box=(p:Page)=>p.getByTestId('fi-box');

test('File › QSO List appears only with Virtual Observatory on (VObsBox, default off; review 1 M1)',async({page})=>{
 await open(page);
 // Front P: File always holds Print Sky Image..., as in VIREO; QSO List is absent with Virtual Observatory off.
 await page.getByTestId('fi-file-menu').click();await expect(page.getByTestId('print-sky-menu')).toBeVisible();await expect(page.getByTestId('qso-menu')).toHaveCount(0);await page.getByTestId('fi-file-menu').click();
 await card(page).getByTestId('ob-options').click();await expect(page.getByTestId('ob-options-virtual-observatory')).not.toBeChecked();
 await expect(page.getByTestId('ob-options-virtual-observatory-note')).toContainText('not saved');await expect(page.getByTestId('ob-options-others')).not.toContainText('Virtual Observatory');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await editMode(page,true);await page.getByTestId('fi-file-menu').click();await expect(page.getByTestId('fi-field-information')).toBeVisible();await expect(page.getByTestId('qso-menu')).toHaveCount(0);
 await page.getByTestId('fi-file-menu').click();await editMode(page,false);
 await virtualObservatory(page,true);await page.getByTestId('fi-file-menu').click();await expect(page.getByTestId('qso-menu')).toBeVisible();await expect(page.getByTestId('fi-field-information')).toHaveCount(0);
 // The menu does not depend on the dome (review 1 L1).
 await page.getByTestId('fi-file-menu').click();await page.getByRole('button',{name:'Close dome',exact:true}).click();await expect(page.getByTestId('fi-file-menu')).toBeEnabled();await expect(page.getByTestId('ob-tools-menu')).toBeEnabled();
});

test('student path: options defaults, invalid limit, list without z or Object X rows, Search, Save Text, Print, hot list',async({page})=>{
 await open(page);await virtualObservatory(page,true);await qsoMenu(page);
 const dialog=page.getByTestId('qso-options');
 await expect(dialog.getByRole('heading',{name:'Options for QSO List'})).toBeVisible();
 await expect(page.getByTestId('qso-limit')).toHaveValue('20.00');await expect(page.getByTestId('qso-sort-1')).toBeDisabled();await expect(page.getByTestId('qso-sort-0')).toBeChecked();
 await page.getByTestId('qso-limit').fill('abc');await page.getByTestId('qso-ok').click();
 await expect(box(page).getByRole('heading',{name:'Numeric Error!'})).toBeVisible();await expect(page.getByTestId('fi-box-text')).toHaveText('Invalid Magnitude Limit');
 await box(page).getByRole('button',{name:'OK'}).click();await expect(dialog).toBeVisible();
 await page.getByTestId('qso-limit').fill('13');await page.getByTestId('qso-limit').press('Enter');
 const w=page.getByTestId('qso-list');await expect(w.getByRole('heading',{name:'CLEA QSO Data'})).toBeVisible({timeout:20000});
 await expect(page.getByTestId('qso-list-line-0')).toHaveText('10 QSOs to magnitude 13.00, sorted by magnitude.');
 await expect(page.getByTestId('qso-list-line-3')).toHaveText('Name/ID           Right Ascn. Declination    V   ');
 await expect(page.getByTestId('qso-list-line-5')).toHaveText('1WGA J0820.1+3728 08 20 07.7   +37 28 39   11.80  ');
 await expect(page.getByTestId('qso-withheld')).toContainText('Object X');
 const body=await w.innerText();for(const s of ['3C 273','0.082','(+0.27)'])expect(body).not.toContain(s);// 3C 273.0 (V 12.85) is an Object X target
 // Search: a miss shows the native box.
 await page.getByTestId('qso-list-list-menu').click();await page.getByTestId('qso-list-search').click();
 await page.getByTestId('fi-find-query').fill('3C 273');await page.getByTestId('fi-find-top').click();
 await expect(page.getByTestId('fi-box-text')).toHaveText('"3c 273" Not Found.');await box(page).getByRole('button',{name:'OK'}).click();
 // Save Text (As Displayed); Comma Delimit is disabled.
 await page.getByTestId('qso-list-list-menu').click();await page.getByTestId('qso-list-save-menu').click();await expect(page.getByTestId('qso-list-save-csv')).toBeDisabled();await page.getByTestId('qso-list-list-menu').click();
 const text=await download(page,async()=>{await page.getByTestId('qso-list-list-menu').click();await page.getByTestId('qso-list-save-menu').click();await page.getByTestId('qso-list-save-displayed').click();});
 expect(text.name).toBe('QSO Data.TXT');const lines=text.bytes.toString('latin1').split('\r\n');
 expect(lines[0]).toBe('10 QSOs to magnitude 13.00, sorted by magnitude.');expect(lines[4].charCodeAt(32)).toBe(0xb0);expect(lines[14]).toBe('RXS J12252+3213   12 25 13.0   +32 14 01   13.00  ');
 await expect(page.getByTestId('fi-box-text')).toHaveText('Report Text Written to QSO Data.TXT.');await box(page).getByRole('button',{name:'OK'}).click();
 // Print preview: the student branch adds the table-number line.
 await page.getByTestId('qso-list-list-menu').click();await page.getByTestId('qso-list-print').click();
 await expect(page.getByTestId('fi-print-date')).toContainText('     Laboratory Table Number (Not Recorded)');await expect(page.getByTestId('fi-print-lines')).toContainText('WPVS 97');
 await page.getByTestId('fi-print-close').click();
 // Selection: header rows select nothing; a data row goes to the hot list with its raw catalogue name.
 await page.getByTestId('qso-list-line-2').click();await expect(page.getByTestId('qso-list-selection')).toHaveText('Select a QSO row first.');
 await page.getByTestId('qso-list-line-6').click();await expect(page.getByTestId('qso-list-selection')).toHaveText('2 / 10');
 await page.getByTestId('qso-list-selection-menu').click();await page.getByTestId('qso-list-add').click();
 await expect(page.getByTestId('fi-box-text')).toHaveText('Object WPVS 97           Added to Current Hot List.');await box(page).getByRole('button',{name:'OK'}).click();
 await page.getByTestId('ob-view-select').click();await expect(page.getByText(/WPVS 97/).first()).toBeVisible();
});

test('Edit Mode: Sort Options enabled, Z and colour columns; leaving Edit Mode resets the sort',async({page})=>{
 await open(page);await virtualObservatory(page,true);await editMode(page,true);await qsoMenu(page);
 await expect(page.getByTestId('qso-sort-1')).toBeEnabled();await page.getByTestId('qso-sort-2').check();await page.getByTestId('qso-ok').click();
 await expect(page.getByTestId('qso-list-line-0')).toHaveText('2266 QSOs to magnitude 17.50, sorted by Z(descending).',{timeout:20000});
 await expect(page.getByTestId('qso-list-line-2')).toHaveText('"(...)" indicates an assigned mean color.');
 await expect(page.getByTestId('qso-list-line-4')).toHaveText('Name/ID           Right Ascn. Declination    Z       V      B-V      U-B   ');
 await expect(page.getByTestId('qso-list-line-6')).toHaveText('APM 08279+5255    08 31 41.6   +52 45 18   3.911   15.20  (+0.27)  (-0.69)  ');
 expect(await page.getByTestId('qso-list').innerText()).not.toMatch(/3C 273\.0|HE 0353-3919|HS 1603\+3820/);
 // RA sort appends nothing after "sorted by" (as in VIREO).
 await qsoMenu(page);await page.getByTestId('qso-sort-3').check();await page.getByTestId('qso-ok').click();
 await expect(page.getByTestId('qso-list-line-0')).toHaveText('2266 QSOs to magnitude 17.50, sorted by ');
 // An invalid limit still stores the sort (_DoneExcept, review 1 L2).
 await qsoMenu(page);await page.getByTestId('qso-sort-1').check();await page.getByTestId('qso-limit').fill('x');await page.getByTestId('qso-ok').click();
 await box(page).getByRole('button',{name:'OK'}).click();await page.getByTestId('qso-cancel').click();
 await qsoMenu(page);await expect(page.getByTestId('qso-sort-1')).toBeChecked();await page.getByTestId('qso-cancel').click();
 await editMode(page,false);await qsoMenu(page);
 await expect(page.getByTestId('qso-sort-1')).toBeDisabled();await expect(page.getByTestId('qso-sort-0')).toBeChecked();await page.getByTestId('qso-cancel').click();
 await expect(page.getByTestId('qso-options')).toHaveCount(0);
});

test('Tools › HST Image Archive: an external link to the current archive page, requested only on click',async({page,context})=>{
 const requests:string[]=[];context.on('request',r=>{if(/hubblesite|nasa\.gov|stsci/i.test(r.url()))requests.push(r.url());});
 await context.route(/hubblesite\.org|science\.nasa\.gov/,r=>r.fulfill({status:200,contentType:'text/html',body:'<title>stub</title>'}));
 await open(page);await page.getByTestId('ob-tools-menu').click();
 const link=page.getByTestId('hst-menu');
 await expect(link).toHaveAttribute('href','https://hubblesite.org/resource-gallery/images');await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noopener noreferrer');
 await expect(page.getByTestId('hst-note')).toContainText('http://hubblesite.org/newscenter/archive/browse/');
 expect(requests).toEqual([]);
 const popup=context.waitForEvent('page');await link.click();const tab=await popup;await tab.waitForLoadState();
 expect(tab.url()).toBe('https://hubblesite.org/resource-gallery/images');expect(requests).toEqual(['https://hubblesite.org/resource-gallery/images']);
 expect(await tab.evaluate(()=>window.opener)).toBeNull();
});

test('fail closed: without ObjectX.HTL the QSO list is not shown',async({page})=>{
 await page.route('**/original/hotlists/ObjectX.HTL',r=>r.abort());
 await open(page);await virtualObservatory(page,true);await qsoMenu(page);await page.getByTestId('qso-ok').click();
 await expect(page.getByTestId('qso-list-status').locator('[data-reason=object-x-positions]')).toBeVisible({timeout:20000});
 await expect(page.getByTestId('qso-list')).toHaveCount(0);expect(await page.locator('body').innerText()).not.toContain('QSOs to magnitude');
});

test('QSO List and HST menu at 320 px in dark mode: no horizontal page scroll',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:320,height:800});
 await open(page);await virtualObservatory(page,true);await qsoMenu(page);
 const d=await page.getByTestId('qso-options').boundingBox();expect(d!.x).toBeGreaterThanOrEqual(0);expect(d!.x+d!.width).toBeLessThanOrEqual(320);
 await page.getByTestId('qso-ok').click();await expect(page.getByTestId('qso-list-line-0')).toBeVisible({timeout:20000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await page.getByTestId('ob-tools-menu').click();
 const h=await page.getByTestId('hst-note').boundingBox();expect(h!.x).toBeGreaterThanOrEqual(0);expect(h!.x+h!.width).toBeLessThanOrEqual(320);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
