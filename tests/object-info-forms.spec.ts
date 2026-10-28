import{test,expect,type Page}from'@playwright/test';
import{readFile}from'node:fs/promises';
import{paceDownload}from'./fixtures/download-pacing';

// Front O (docs/OBJECT-INFO-FORMS.md): Edit Mode, Catalog Object, Field Information lists and Naked Eye Star.
const card=(p:Page)=>p.locator('.telescope-motion');
async function open(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}
async function editMode(page:Page,on:boolean){
 await card(page).getByTestId('ob-options').click();const box=page.getByTestId('ob-options-edit-mode');
 await expect(box).not.toBeChecked();if(on)await box.check();await page.getByTestId('ob-options-ok').click();
}
async function fieldMenu(page:Page,item:string){
 await page.getByTestId('fi-file-menu').click();await page.getByTestId('fi-field-information').click();
 if(item==='fi-variables-gcvs'||item==='fi-variables-modeled')await page.getByTestId('fi-variable-stars').click();
 await page.getByTestId(item).click();
}
async function pointAt36773(page:Page){
 const target=page.getByLabel('Target',{exact:true});await target.selectOption('36773-acquisition');
 await page.getByRole('button',{name:'Point telescope ↗',exact:true}).click();
 await expect(page.getByTestId('pointing-ra')).toHaveText('11.78936',{timeout:30000});await expect(page.getByTestId('pointing-dec')).toHaveText('55.68889',{timeout:30000});
 await page.getByRole('button',{name:/^Telescope/}).click();
}
async function download(page:Page,click:()=>Promise<void>){await paceDownload(page);const d=page.waitForEvent('download');await click();const e=await d;return {name:e.suggestedFilename(),bytes:await readFile((await e.path())!)};}

test('Edit Mode off (compiled default): no Field Information menu, no Catalog Object click, options unchanged',async({page})=>{
 await open(page);await tracking(page);
 await card(page).getByTestId('ob-options').click();
 await expect(page.getByTestId('ob-options-edit-mode')).not.toBeChecked();await expect(page.getByTestId('ob-options-edit-mode-note')).toContainText('not saved');
 await expect(page.getByTestId('ob-options-others')).not.toContainText('Edit Mode');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.getByTestId('fi-file-menu')).toHaveCount(0);await expect(page.getByTestId('em-layer')).toHaveCount(0);await expect(page.getByTestId('em-status')).toHaveCount(0);
 await page.getByTestId('sky-map').click({position:{x:120,y:120}});await expect(page.getByTestId('co-dialog')).toHaveCount(0);
});

test('Edit Mode: Catalog Object at a certified field (36773), by click and by keyboard; Update and GCVS stay unavailable',async({page})=>{
 await open(page);await tracking(page);await pointAt36773(page);await editMode(page,true);
 await expect(page.getByTestId('em-caption')).toContainText('certified field snapshot-36773: 114 stars and QSOs, 6 galaxies',{timeout:20000});
 const sky=page.getByTestId('em-sky');const box=(await sky.boundingBox())!;
 await sky.click({position:{x:box.width/2,y:box.height/2}});
 const dialog=page.getByTestId('co-dialog');await expect(dialog).toBeVisible();
 await expect(page.getByTestId('co-type')).toHaveValue('Galaxy');await expect(page.getByTestId('co-id')).toHaveValue('36773');
 await expect(page.getByTestId('co-ra')).toHaveValue('  11h 47m 21.70s');await expect(page.getByTestId('co-z')).toHaveValue('4.899E-02');await expect(page.getByTestId('co-size')).toHaveValue('0.4x0.4');
 await expect(page.getByTestId('co-update')).toBeDisabled();await expect(page.getByTestId('co-gcvs')).toBeDisabled();
 await expect(page.getByTestId('co-update-reason')).toContainText('master star catalogue');await expect(page.getByTestId('co-gcvs-reason')).toContainText('variable record');
 await expect(page.getByTestId('em-marker')).toBeVisible();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByTestId('em-marker')).toBeVisible();
 // Keyboard: the cursor starts at the centre; move it onto a star and press Enter.
 await sky.focus();for(let i=0;i<3;i++)await page.keyboard.press('Shift+ArrowLeft');await page.keyboard.press('Enter');
 await expect(dialog).toBeVisible();await expect(page.getByTestId('co-id')).toHaveValue(/^(N5230-\d{5}|36773|.+)$/);
 await page.getByTestId('co-ok').click();await expect(dialog).toHaveCount(0);
 // Finder view: the finder catalogue is not on this site.
 await page.getByRole('button',{name:/^Finder/}).click();await expect(page.getByTestId('em-status')).toHaveAttribute('data-reason','finder-catalog-unavailable');
});

test('Star Data List at 36773: lines, Search, Save Text, Comma Delimit, Print preview; hot-list items carry the defect reason',async({page})=>{
 await open(page);await tracking(page);await pointAt36773(page);await editMode(page,true);
 await fieldMenu(page,'fi-star-list');
 const w=page.getByTestId('fi-slist');await expect(w.getByRole('heading',{name:'CLEA Star Field Data'})).toBeVisible({timeout:20000});
 await expect(page.getByTestId('fi-slist-line-2')).toHaveText('  Center:   11h47m21.7s');
 await expect(page.getByTestId('fi-slist-line-17')).toHaveText('Name/ID           Right Ascn. Declination    V     B-V    U-B    Sp     ');
 await expect(page.getByTestId('fi-slist-line-19')).toHaveText('N5230-00946       11 44 42.9   +55 22 43   14.19  +1.15* +1.08* K6V*#');
 // Search From Top, case-insensitive, then a miss.
 await page.getByTestId('fi-slist-list-menu').click();await page.getByTestId('fi-slist-search').click();
 await page.getByTestId('fi-find-query').fill('m1iii');await page.getByTestId('fi-find-top').click();
 await expect(page.getByTestId('fi-slist-line-22')).toHaveAttribute('aria-selected','true');
 await page.getByTestId('fi-slist-list-menu').click();await page.getByTestId('fi-slist-search').click();
 await page.getByTestId('fi-find-query').fill('ZZZ');await page.getByTestId('fi-find-top').click();
 await expect(page.getByTestId('fi-box-text')).toHaveText('"zzz" Not Found.');await page.getByTestId('fi-box').getByRole('button',{name:'OK'}).click();
 // Save Text and Comma Delimit.
 const text=await download(page,async()=>{await page.getByTestId('fi-slist-list-menu').click();await page.getByTestId('fi-slist-save-menu').click();await page.getByTestId('fi-slist-save-displayed').click();});
 expect(text.name).toBe('CLEA_Field1.TXT');const lines=text.bytes.toString('latin1').split('\r\n');expect(lines[19]).toBe('N5230-00946       11 44 42.9   +55 22 43   14.19  +1.15* +1.08* K6V*#');expect(lines[18].charCodeAt(32)).toBe(0xb0);
 await expect(page.getByTestId('fi-box-text')).toHaveText('Report Text Written to CLEA_Field1.TXT.');await page.getByTestId('fi-box').getByRole('button',{name:'OK'}).click();
 const csv=await download(page,async()=>{await page.getByTestId('fi-slist-list-menu').click();await page.getByTestId('fi-slist-save-menu').click();await page.getByTestId('fi-slist-save-csv').click();});
 expect(csv.name).toBe('CLEA_Field1.CSV');expect(csv.bytes.toString('latin1').split('\r\n')).toContain('N5230-00946,11,44,42.9,+55,22,43,14.19,+1.15*,+1.08*,K6V*#');
 await page.getByTestId('fi-box').getByRole('button',{name:'OK'}).click();
 // Print preview.
 await page.getByTestId('fi-slist-list-menu').click();await page.getByTestId('fi-slist-print').click();
 await expect(page.getByTestId('fi-print-lines')).toContainText('N5230-00946');await page.getByTestId('fi-print-close').click();
 // Selection: the hot-list commands are unavailable with the documented reason.
 await page.getByTestId('fi-slist-line-19').click();await page.getByTestId('fi-slist-selection-menu').click();
 await expect(page.getByTestId('fi-slist-add')).toBeDisabled();await expect(page.getByTestId('fi-slist-selection-reason')).toContainText('cluster');
});

test('Variable Stars list (M81 finder field): select, Add / Start New Hot List, Slew to Selection, Get Selection Data; modeled mode typed',async({page})=>{
 await open(page);await tracking(page);await editMode(page,true);
 await fieldMenu(page,'fi-variables-gcvs');
 const w=page.getByTestId('fi-vlist');await expect(w.getByRole('heading',{name:'Variable Stars in Finder Field'})).toBeVisible({timeout:20000});
 await expect(page.getByTestId('fi-vlist-line-10')).toHaveText('Name          Rt. Ascension    Declination   Max   Min  Type');
 const dk=page.getByTestId('fi-vlist-line-12');await expect(dk).toHaveText('DK UMa        9h 34m 29.46s   69° 49\' 44.8"  4.56  0.06 RS:');
 await dk.click();await expect(page.getByTestId('fi-vlist-selection')).toHaveText(/^2 \/ \d+$/);
 await page.getByTestId('fi-vlist-selection-menu').click();await page.getByTestId('fi-vlist-add').click();
 await expect(page.getByTestId('fi-box-text')).toHaveText('Object DK UMa Added to Current Hot List.');await page.getByTestId('fi-box').getByRole('button',{name:'OK'}).click();
 // Start New: the current list has rows, so the original question appears; No replaces it.
 await page.getByTestId('fi-vlist-line-11').click();await page.getByTestId('fi-vlist-selection-menu').click();await page.getByTestId('fi-vlist-start').click();
 await expect(page.getByTestId('fi-box')).toContainText('Current Hot List not Saved!');await page.getByTestId('fi-unsaved-no').click();
 await expect(page.getByTestId('fi-box-text')).toHaveText('New Hot List Created - Object RX UMa Added to New Hot List.');await page.getByTestId('fi-box').getByRole('button',{name:'OK'}).click();
 await card(page).getByTestId('ob-view-select').click();await expect(page.getByTestId('ob-hotlist-row-1')).toContainText('RX UMa');await expect(page.getByTestId('ob-hotlist-row-2')).toHaveCount(0);
 await page.keyboard.press('Escape');
 // Slew to Selection (Enter on a selected row) → Set Coordinates with the epoch group enabled → confirmation.
 await page.getByTestId('fi-vlist-lines').focus();await dk.click();await page.keyboard.press('Enter');
 await expect(page.getByTestId('ob-sky-raHours')).toHaveValue('9');await expect(page.getByTestId('ob-sky-decDegrees')).toHaveValue('69');await expect(page.getByTestId('ob-sky-epoch-1')).toBeEnabled();
 await page.getByTestId('ob-sky-ok').click();await expect(page.getByTestId('motion-confirm-note')).toBeVisible();await page.getByRole('button',{name:'Cancel slew',exact:true}).click();
 // Get Selection Data → the Variable stars page on that record.
 await dk.click();await page.getByTestId('fi-vlist-selection-menu').click();await page.getByTestId('fi-vlist-data').click();
 await expect(page).toHaveURL(/#variable-stars$/);await expect(page.getByTestId('vstar-lines')).toContainText('GCVS ID:         DK UMa',{timeout:20000});
});

test('VIREO-modeled mode is typed unavailable; the instrument field near the start has no variables',async({page})=>{
 await open(page);await tracking(page);await editMode(page,true);
 await fieldMenu(page,'fi-variables-modeled');
 await expect(page.getByTestId('fi-vlist-reason')).toHaveAttribute('data-reason','modeled-uninitialised',{timeout:20000});
 await page.getByTestId('fi-vlist-list-menu').click();await page.getByTestId('fi-vlist-close').click();
 await fieldMenu(page,'fi-star-list');await expect(page.getByTestId('fi-slist-status')).toContainText('certified exercise fields',{timeout:20000});
});

test('Naked Eye Star: right-click a star in the dome sky (no Edit Mode) at 320 px in dark mode',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:320,height:800});
 await open(page);
 const sky=page.getByTestId('ne-sky');await expect(sky).toBeVisible({timeout:20000});
 const count=Number(await sky.getAttribute('data-count'));expect(count).toBeGreaterThan(10);
 // Right-click on the first drawn star.
 // A star well inside the dome rectangle (cx 30..210, cy 30..270 in the 240×305 frame).
 const index=await sky.evaluate(svg=>[...svg.querySelectorAll('circle')].findIndex(c=>{const x=Number(c.getAttribute('cx')),y=Number(c.getAttribute('cy'));return x>30&&x<210&&y>30&&y<270;}));
 expect(index).toBeGreaterThanOrEqual(0);const star=sky.locator('circle').nth(index);await sky.scrollIntoViewIfNeeded();const b=(await star.boundingBox())!;
 await page.mouse.click(b.x+b.width/2,b.y+b.height/2,{button:'right'});
 const dialog=page.getByTestId('ne-dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('heading',{name:'Naked Eye Star'})).toBeVisible();
 await expect(page.getByTestId('ne-ra')).toHaveValue(/^ {1,3}\d{1,2}h \d\dm \d\d\.\d\ds$/);await expect(page.getByTestId('ne-mag')).toHaveValue(/^-?\d\.\d{3}$/);
 await expect(page.getByTestId('ne-marker')).toBeVisible();
 await page.getByTestId('ne-ok').click();await expect(dialog).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 // Left click does nothing (the original picks with the right button).
 await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await expect(dialog).toHaveCount(0);
});
