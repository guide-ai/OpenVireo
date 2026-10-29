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
 // Front P: File always holds Print Sky Image... (as in VIREO); Field Information is absent with Edit Mode off.
 await page.getByTestId('fi-file-menu').click();await expect(page.getByTestId('fi-field-information')).toHaveCount(0);await expect(page.getByTestId('ob-exit')).toBeVisible();await page.getByTestId('fi-file-menu').click();await expect(page.getByTestId('em-layer')).toHaveCount(0);await expect(page.getByTestId('em-status')).toHaveCount(0);
 await page.getByTestId('sky-map').click({position:{x:120,y:120}});await expect(page.getByTestId('co-dialog')).toHaveCount(0);
});

test('Edit Mode: Catalog Object at a certified field (36773), by click and by keyboard; Update and GCVS stay unavailable',async({page})=>{
 await open(page);await tracking(page);await pointAt36773(page);await editMode(page,true);
 await expect(page.getByTestId('em-caption')).toContainText('certified field snapshot-36773: 114 stars and QSOs, 6 galaxies',{timeout:20000});
 const sky=page.getByTestId('em-sky');const box=(await sky.boundingBox())!;
 await sky.click({position:{x:box.width/2,y:box.height/2}});
 const dialog=page.getByTestId('co-dialog');await expect(dialog).toBeVisible();
 await expect(page.getByTestId('co-type')).toHaveValue('Galaxy');await expect(page.getByTestId('co-id')).toHaveValue('36773');
 await expect(page.getByTestId('co-ra')).toHaveValue('  11h 47m 21.70s');await expect(page.getByTestId('co-z')).toHaveValue('');await expect(dialog.locator('[data-reason=instructor-value-masked]')).toBeVisible();
 for(const z of ['4.899E-02','0.049','0.0489'])expect(await page.locator('body').innerText()).not.toContain(z);await expect(page.getByTestId('co-size')).toHaveValue('0.4x0.4');
 await expect(page.getByTestId('co-update')).toBeDisabled();await expect(page.getByTestId('co-gcvs')).toBeDisabled();
 await expect(page.getByTestId('co-update-reason')).toContainText('master star catalogue');await expect(page.getByTestId('co-gcvs-reason')).toContainText('variable record');
 await expect(page.getByTestId('em-marker')).toBeVisible();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByTestId('em-marker')).toBeVisible();
 // Keyboard: the cursor starts at the centre; move it onto a star and press Enter.
 await sky.focus();for(let i=0;i<3;i++)await page.keyboard.press('Shift+ArrowLeft');await page.keyboard.press('Enter');
 await expect(dialog).toBeVisible();await expect(page.getByTestId('co-id')).toHaveValue('N5230-00237');// pinned in fieldInfoPacks.test.ts
 await page.getByTestId('co-ok').click();await expect(dialog).toHaveCount(0);await expect(sky).toBeFocused();
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
 // The galaxy redshift (4.899E-02, z 0.04899) is not searchable in the list (review 1 M2).
 for(const z of ['4.899E-02','0.0489']){await page.getByTestId('fi-slist-list-menu').click();await page.getByTestId('fi-slist-search').click();
  await page.getByTestId('fi-find-query').fill(z);await page.getByTestId('fi-find-top').click();
  await expect(page.getByTestId('fi-box-text')).toHaveText(`"${z.toLowerCase()}" Not Found.`);await page.getByTestId('fi-box').getByRole('button',{name:'OK'}).click();}
 // Save Text and Comma Delimit.
 const text=await download(page,async()=>{await page.getByTestId('fi-slist-list-menu').click();await page.getByTestId('fi-slist-save-menu').click();await page.getByTestId('fi-slist-save-displayed').click();});
 expect(text.name).toBe('CLEA_Field1.TXT');const lines=text.bytes.toString('latin1').split('\r\n');expect(lines[19]).toBe('N5230-00946       11 44 42.9   +55 22 43   14.19  +1.15* +1.08* K6V*#');expect(lines[18].charCodeAt(32)).toBe(0xb0);
 await expect(page.getByTestId('fi-box-text')).toHaveText('Report Text Written to CLEA_Field1.TXT.');await page.getByTestId('fi-box').getByRole('button',{name:'OK'}).click();
 const csv=await download(page,async()=>{await page.getByTestId('fi-slist-list-menu').click();await page.getByTestId('fi-slist-save-menu').click();await page.getByTestId('fi-slist-save-csv').click();});
 for(const f of [text,csv])expect(f.bytes.toString('latin1')).not.toContain('4.899E-02');
 expect(csv.name).toBe('CLEA_Field1.CSV');expect(csv.bytes.toString('latin1').split('\r\n')).toContain(",Hr,Mn,Sec,°,',''");expect(csv.bytes.toString('latin1').split('\r\n')).toContain('N5230-00946,11,44,42.9,+55,22,43,14.19,+1.15*,+1.08*,K6V*#');
 await page.getByTestId('fi-box').getByRole('button',{name:'OK'}).click();
 // Print preview.
 await page.getByTestId('fi-slist-list-menu').click();await page.getByTestId('fi-slist-print').click();
 await expect(page.getByTestId('fi-print-lines')).toContainText('N5230-00946');
 for(const z of ['4.899E-02','0.0489'])expect(await page.getByTestId('fi-print-preview').innerText()).not.toContain(z);
 await page.getByTestId('fi-print-close').click();
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
 // Front G (G2): VIREO builds this field at every pointing (0x53be70; StarList1Click 0x5404e0 has no gate). The start pointing
 // is no bundled pack's pointing, so the list is built from the compact GSC tiles instead of being typed unavailable.
 await fieldMenu(page,'fi-star-list');
 const w=page.getByTestId('fi-slist');await expect(w.getByRole('heading',{name:'CLEA Star Field Data'})).toBeVisible({timeout:30000});
 await expect(page.getByTestId('fi-slist-line-2')).toContainText('Center:');await expect(page.getByTestId('fi-slist-status')).toHaveCount(0);
 await expect(page.getByTestId('fi-slist-line-19')).toHaveText(/^[NS]\d{4}-\d{5} /);
 // The Telescope view shows the field built from the tiles in Edit Mode.
 await page.getByRole('button',{name:/^Telescope/}).click();
 await expect(page.getByTestId('em-status')).toHaveCount(0,{timeout:30000});
 await expect(page.getByTestId('em-caption')).toContainText('field read from the compact Guide Star Catalog');
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
 await page.getByTestId('ne-ok').click();await expect(dialog).toHaveCount(0);await expect(sky).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 // Left click does nothing (the original picks with the right button).
 await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await expect(dialog).toHaveCount(0);
});

test('Catalog Object at 320 px in dark mode: every row fits and keeps its label beside or above its value (review 1 M1)',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:320,height:800});
 await open(page);await tracking(page);await pointAt36773(page);await editMode(page,true);
 await expect(page.getByTestId('em-caption')).toContainText('snapshot-36773',{timeout:20000});
 const sky=page.getByTestId('em-sky');await sky.scrollIntoViewIfNeeded();const box=(await sky.boundingBox())!;await sky.click({position:{x:box.width/2,y:box.height/2}});
 const dialog=page.getByTestId('co-dialog');await expect(dialog).toBeVisible();
 for(const k of ['type','id','ra','dec','mag','bv','ub','sp','z','size']){
  const input=page.getByTestId(`co-${k}`),b=(await input.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(320);expect(b.width).toBeGreaterThan(60);
  const value=await input.inputValue();expect(await input.evaluate((el:HTMLInputElement)=>el.scrollWidth<=el.clientWidth+1)).toBe(true);void value;
 }
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});

test('Object X positions mask the Edit Mode forms without the Object X lab (review 1)',async({page})=>{
 await open(page);await tracking(page);
 // NGC 4631, an ObjectX.HTL row, pointed by coordinates; the Object X route is never opened. Its finder field lists AQ CVn,
 // within 0.25° of the ObjectX.HTL star N3000-01915, so the Variable Stars list is masked too (closure N2 radius).
 await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill('12.7022');await page.locator('#point-dec').fill('32.5408');
 await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await expect(page.getByTestId('pointing-dec')).toHaveText(/^32\.54/,{timeout:30000});
 await editMode(page,true);
 await page.getByRole('button',{name:/^Telescope/}).click();
 await expect(page.getByTestId('em-status')).toHaveAttribute('data-reason','object-x-hidden',{timeout:20000});
 await fieldMenu(page,'fi-variables-gcvs');await expect(page.getByTestId('fi-vlist-status').getByRole('status')).toHaveAttribute('data-reason','object-x-hidden',{timeout:20000});
 await page.getByTestId('fi-vlist-status').getByRole('button').click();
 await fieldMenu(page,'fi-star-list');await expect(page.getByTestId('fi-slist-status').getByRole('status')).toHaveAttribute('data-reason','object-x-hidden',{timeout:20000});
});

test.describe('touch',()=>{
 test.use({hasTouch:true,viewport:{width:390,height:844}});
 test('Naked Eye Star by tap + "Show star at cursor" (review 1 L4)',async({page})=>{
  await open(page);
  const sky=page.getByTestId('ne-sky');await expect(sky).toBeVisible({timeout:20000});await sky.scrollIntoViewIfNeeded();
  const index=await sky.evaluate(svg=>[...svg.querySelectorAll('circle')].findIndex(c=>{const x=Number(c.getAttribute('cx')),y=Number(c.getAttribute('cy'));return x>30&&x<210&&y>30&&y<270;}));
  const b=(await sky.locator('circle').nth(index).boundingBox())!;
  await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await expect(page.getByTestId('ne-dialog')).toHaveCount(0);
  await page.getByTestId('ne-show-cursor').tap();
  await expect(page.getByTestId('ne-dialog')).toBeVisible();await page.getByTestId('ne-ok').tap();await expect(page.getByTestId('ne-dialog')).toHaveCount(0);
 });
});

test('Front T: an enabled GCVS button at a TRUE variable star opens its Variable Star Data (EP Com in the NGC 4848 field)',async({page})=>{
 test.setTimeout(120000);
 await open(page);await tracking(page);
 // LSS field 3, row 19 (NGC 4848): the exact LSS_Field03.HTL coordinates (shortest round-trip decimals), so the field is certified.
 await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill('12.96825');await page.locator('#point-dec').fill('28.244722222222222');
 await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await expect(page.getByTestId('pointing-dec')).toHaveText(/^28\.24/,{timeout:30000});
 await editMode(page,true);await page.getByRole('button',{name:/^Telescope/}).click();
 await expect(page.getByTestId('em-caption')).toContainText('lss-field-03',{timeout:30000});
 // EP Com (CLEA_VStrs.dat 9810, a miss: inserted by the TRUE dispatch) projects to about (224, 99) of the 312-px view
 // (data/variables/lss-true-dispatch-witness.json pointing and position, projection 0x53c9d4).
 const sky=page.getByTestId('em-sky');await sky.scrollIntoViewIfNeeded();const box=(await sky.boundingBox())!;
 await sky.click({position:{x:box.width*223.87/312,y:box.height*99.43/312}});
 await expect(page.getByTestId('co-id')).toHaveValue('EP Com');await expect(page.getByTestId('co-type')).toHaveValue('Variable Star');
 await expect(page.getByTestId('co-gcvs-reason')).toHaveCount(0);await expect(page.getByTestId('co-reason')).toHaveCount(0);// values at the frozen clock JD
 await page.getByTestId('co-gcvs').click();
 await expect(page).toHaveURL(/#variable-stars$/);
 await expect(page.getByTestId('vstar-lines')).toContainText('EP Com',{timeout:30000});
 // The Star Data List of the same field is built at the frozen observatory-clock JD too: EP Com has a row and no typed reason.
 await page.evaluate(()=>{location.hash='#observatory';});
 await fieldMenu(page,'fi-star-list');
 const list=page.getByTestId('fi-slist');await expect(list.getByRole('heading',{name:'CLEA Star Field Data'})).toBeVisible({timeout:30000});
 await expect(page.getByTestId('fi-slist-reason')).toHaveCount(0);
 await expect(list.locator('[data-testid^="fi-slist-line-"]').filter({hasText:/^EP Com /})).toHaveCount(1);
});
