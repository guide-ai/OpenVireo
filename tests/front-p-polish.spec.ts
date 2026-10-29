import{test,expect,type Page}from'@playwright/test';
import{createHash}from'node:crypto';
import{clickHeaderTool,openHeaderTools}from'./fixtures/header-tools';
// Front P (docs/POLISH-FRONT-P.md): About, bundled Pulsars.HTL, the three web prints, Results Editors aliases, Comparison
// Clear, Terminate Current Slew?, camera Field Size, the hot-list popup, RA-ordered Add Current and the #spectrometer index.
// Expected values are the chosen web contract, not native runtime oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const card=(p:Page)=>p.locator('.telescope-motion');
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
async function stubPrint(page:Page){await page.evaluate(()=>{(window as unknown as {printed:string[]}).printed=[];window.print=()=>{(window as unknown as {printed:string[]}).printed.push(document.documentElement.getAttribute('data-print-scope')??'');};});}
const printed=(page:Page)=>page.evaluate(()=>(window as unknown as {printed:string[]}).printed);
async function observatory(page:Page,clock=false){
 if(clock)await page.clock.install();
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 if(clock)await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
async function coords(page:Page,ra:string,dec:string,point=true){if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);if(point)await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();}
async function tracking(page:Page){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}

test('About shows the TAboutBox captions, current status and credits',async({page})=>{
 await page.goto('/#observatory');await page.getByRole('button',{name:'What works in this version ↗'}).click();
 const about=id(page,'about-dialog');await expect(about).toBeVisible();
 const native=id(page,'about-native');
 for(const text of['About This Exercise','Contemporary Laboratory Experiences in Astronomy','VIREO - The VIRtual Educational Observatory','Version 0.5','Copyright © 1999-2011 CLEA','All Rights Reserved'])await expect(native).toContainText(text);
 await expect(about).not.toContainText('three-galaxy');await expect(about).not.toContainText('Redistribution permissions are pending');
 await expect(id(page,'about-works')).toContainText('13 galaxies');await expect(id(page,'about-credits')).toContainText('Gettysburg College');await expect(id(page,'about-credits')).toContainText('ATNF Pulsar Catalogue');
 await page.keyboard.press('Escape');await expect(about).toBeHidden();
});

test('radio Slew › Hot List loads the bundled Pulsars.HTL (size and SHA-256 checked) and lists its 8 pulsars',async({page})=>{
 const bytes:Buffer[]=[];page.on('response',async r=>{if(r.url().endsWith('/original/hotlists/Pulsars.HTL'))bytes.push(await r.body());});
 await page.goto('/#observatory');await openHeaderTools(page);await page.locator('.portal-header nav').getByRole('button',{name:'Radio telescope',exact:true}).click();
 await expect(heading(page,'Radio telescope control')).toBeFocused();
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await expect(id(page,'antenna-hotlist-pulsars-note')).toContainText('Pulsars.HTL');
 await id(page,'antenna-hotlist-load-pulsars').click();
 await expect(id(page,'antenna-hotlist-status')).toContainText('Pulsars.HTL');await expect(id(page,'antenna-hotlist-source')).toContainText('8');
 expect(bytes).toHaveLength(1);expect(createHash('sha256').update(bytes[0]).digest('hex')).toBe('9dfba54887a0bf493ca665f53e69f48c13f3a54f7aa4f878912914468e28a439');
 await id(page,'antenna-hotlist-open').click();await expect(id(page,'antenna-hotlist-rows').locator('label')).toHaveCount(8);
 await expect(id(page,'antenna-hotlist-rows')).toContainText('0531+21');
});

test('File › Print Sky Image previews the sky view with the pointing and prints only the preview',async({page})=>{
 await observatory(page);await coords(page,'12.5','12.4');
 await id(page,'fi-file-menu').click();await expect(id(page,'fi-field-information')).toHaveCount(0);await expect(id(page,'qso-menu')).toHaveCount(0);
 await id(page,'print-sky-menu').click();
 const preview=id(page,'print-sky');await expect(preview).toBeVisible();await expect(preview).toContainText('VIREO Optical Telescope Control Panel');
 await expect(id(page,'print-sky-header-1')).toHaveText('Pointing (J2000): RA 12 30 00.0  Dec +12 24 00.0');
 const svg=id(page,'print-sky-picture').locator('svg');await expect(svg).toHaveCount(1);
 // The clone's clip path is renamed so it never points at the live map's defs.
 const clip=await svg.locator('clipPath').getAttribute('id');expect(clip).toMatch(/^sky-clip-print/);
 expect(await svg.locator(`[clip-path="url(#${clip})"]`).count()).toBeGreaterThan(0);
 await stubPrint(page);await id(page,'print-sky-print').click();expect(await printed(page)).toEqual(['web-print']);
 await id(page,'print-sky-close').click();await expect(preview).toHaveCount(0);await expect(id(page,'fi-file-menu')).toBeFocused();
});

test('LSS Wedge Print uses the black-and-white scheme; Pulsar Print Window clones both panels inert',async({page})=>{
 await page.goto('/#lss-wedge');await id(page,'wedge-print').click();
 const wedge=id(page,'wedge-print-preview');await expect(wedge).toBeVisible();await expect(wedge).toContainText('LSS Wedge Plot');
 const bg=await id(page,'wedge-print-preview-picture').locator('svg rect').first().getAttribute('fill');expect(bg?.toLowerCase()).toBe('#ffffff');
 await id(page,'wedge-print-preview-close').click();await expect(wedge).toHaveCount(0);await expect(id(page,'wedge-print')).toBeFocused();
 const lines=[`'SYNTHETIC PRINT',40,1`,'400.00,600.00,0','1.000,1.000,0','60000.50000000,0.01000',...Array.from({length:60},(_,r)=>`${r===20?'50.000':'0.000'},${r===30?'50.000':'0.000'},0.000`)].join('\r\n')+'\r\n';
 await page.goto('/#pulsar-analysis');await id(page,'pulsar-file').setInputFiles({name:'synthetic-print.plr',mimeType:'application/octet-stream',buffer:Buffer.from(lines,'latin1')});
 await id(page,'pulsar-print-window').click();const pp=id(page,'pulsar-print-preview');await expect(pp).toContainText('Analyze Pulsar Data');
 const copy=id(page,'pulsar-print-preview-picture').locator('.plr-panels');await expect(copy).toHaveAttribute('inert','');await expect(copy.locator('svg.plr-plot')).toHaveCount(await page.locator('.plr-panels:not([inert]) svg.plr-plot').count());
 await stubPrint(page);await id(page,'pulsar-print-preview-print').click();expect(await printed(page)).toEqual(['web-print']);
 await page.keyboard.press('Escape');await expect(pp).toHaveCount(0);await expect(id(page,'pulsar-print-window')).toBeFocused();
});

test('Results Editors aliases open the pulsar saved measurements and the analyzer route',async({page})=>{
 await page.goto('/#observatory');await clickHeaderTool(page,'Pulsar Results');
 await expect.poll(()=>new URL(page.url()).hash).toBe('#pulsar-analysis');await expect(id(page,'saved-rows-disclosure')).toHaveAttribute('open','');
 await clickHeaderTool(page,'Observational Results');await expect.poll(()=>new URL(page.url()).hash).toBe('#spectrum');
});

test('Comparison Spectrum › Clear removes the lines until a list is chosen again',async({page})=>{
 await page.goto('/#spectrum');const markers=page.locator('svg.spectrum line.marker');await expect.poll(()=>markers.count()).toBeGreaterThan(0);
 await id(page,'comparison-clear').click();await expect(markers).toHaveCount(0);await expect(page.locator('#reference')).toHaveValue('');await expect(id(page,'comparison-clear')).toBeDisabled();
 await page.locator('#reference').selectOption('balmer');await expect(markers).toHaveCount(8);await expect(id(page,'comparison-clear')).toBeEnabled();
});

test('Set Coordinates during a programmed slew asks Terminate Current Slew?; No continues, Yes stops',async({page})=>{
 await observatory(page,true);await coords(page,'.5','0');await tracking(page);await coords(page,'3','10',false);
 const start=async()=>{await card(page).getByRole('button',{name:'Slew to coordinate draft',exact:true}).click();await page.getByRole('button',{name:'Start programmed slew',exact:true}).click();await expect(id(page,'motion-phase')).toContainText(/Slewing|moving/i);};
 await start();
 await expect(id(page,'ob-set-coordinates')).toBeEnabled();await expect(id(page,'ob-view-select')).toBeDisabled();
 await id(page,'ob-set-coordinates').click();const box=id(page,'terminate-slew-box');await expect(box).toContainText('Slew Suspended');await expect(box).toContainText('Terminate Current Slew?');
 await expect(id(page,'ob-sky-coords')).toBeHidden();
 await id(page,'terminate-slew-box-no').click();await expect(box).toHaveCount(0);await expect(id(page,'ob-set-coordinates')).toBeFocused();await expect(id(page,'motion-phase')).toContainText(/Slewing|moving/i);
 await id(page,'ob-set-coordinates').click();await id(page,'terminate-slew-box-yes').click();await expect(box).toHaveCount(0);await expect(id(page,'ob-set-coordinates')).toBeFocused();
 await expect(id(page,'motion-phase')).not.toContainText(/Slewing|moving/i);await expect(id(page,'ob-set-coordinates')).toBeEnabled();
});

test('camera Field Size (Arc Min) follows the camera and the applied telescope',async({page})=>{
 await observatory(page);const size=id(page,'camera-field-size');await expect(size).toContainText('Field Size (Arc Min)');
 const read=async()=>[await id(page,'camera-field-width').textContent(),await id(page,'camera-field-height').textContent()];
 const ccd=await read();expect(ccd.every(v=>/^\d+\.\d\d$/.test(v??''))).toBe(true);
 await page.getByRole('radio',{name:'IR camera (J, H, K)'}).check();const ir=await read();expect(ir).not.toEqual(ccd);
});

test('hot-list popup, RA-ordered Add Current and the spectrometer index',async({page})=>{
 await observatory(page);
 for(const [ra,dec] of [['5','10'],['1','20'],['3','30']]){await coords(page,ra,dec);await card(page).getByTestId('ob-add-current').click();await id(page,'ob-entry-id').fill(`RA${ra}`);await id(page,'ob-entry-ok').click();await id(page,'ob-info-box').getByRole('button',{name:'OK'}).click();}
 await page.getByText('Original hot lists',{exact:true}).click();
 await expect(page.locator('#htl-rows option')).toHaveText([/RA1/,/RA3/,/RA5/]);// saved file order is RA order
 await card(page).getByTestId('ob-view-select').click();const rows=id(page,'ob-hotlist-rows');
 await rows.getByRole('radio').nth(1).check();await rows.click({button:'right'});
 const menu=id(page,'popup-menu');await expect(menu).toBeVisible();await expect(id(page,'popup-slew')).toBeFocused();
 await expect(id(page,'popup-edit')).toBeEnabled();await expect(id(page,'popup-delete')).toBeEnabled();await expect(id(page,'popup-undo')).toBeDisabled();
 await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);await expect(id(page,'ob-hotlist')).toBeVisible();
 await rows.click({button:'right'});await id(page,'popup-slew').click();await expect(id(page,'ob-sky-coords')).toBeVisible();
 await page.goto('/#spectrometer');await expect(heading(page,'Where to take a spectrum')).toBeVisible();
 await expect(id(page,'spectrometer-routes').getByRole('link')).toHaveCount(7);await expect(page.getByText('Exposure acquisition is pending')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Open supported star exposure'})).toBeVisible();
});

test('the Terminate question closes and returns focus to Set Coordinates when the slew arrives first',async({page})=>{
 await observatory(page,true);await coords(page,'.5','0');await tracking(page);await coords(page,'.5005','0',false);
 await card(page).getByRole('button',{name:'Slew to coordinate draft',exact:true}).click();await page.getByRole('button',{name:'Start programmed slew',exact:true}).click();
 await id(page,'ob-set-coordinates').click();await expect(id(page,'terminate-slew-box')).toBeVisible();
 await expect(async()=>{await page.clock.runFor(2_000);await expect(id(page,'terminate-slew-box')).toHaveCount(0,{timeout:100});}).toPass({timeout:20_000});await expect(id(page,'ob-set-coordinates')).toBeFocused();
});

test('hot-list window Edit, Delete (with the native question) and one-level Undo change the shared list',async({page})=>{
 await observatory(page);
 for(const [ra,dec] of [['1','20'],['3','30']]){await coords(page,ra,dec);await card(page).getByTestId('ob-add-current').click();await id(page,'ob-entry-id').fill(`RA${ra}`);await id(page,'ob-entry-ok').click();await id(page,'ob-info-box').getByRole('button',{name:'OK'}).click();}
 await card(page).getByTestId('ob-view-select').click();const rows=id(page,'ob-hotlist-rows');
 await id(page,'ob-hotlist-edit').click();await expect(id(page,'ob-info-box')).toContainText('Please select an entry, using the left mouse button.');await expect(id(page,'ob-info-box')).toContainText('No Selection!');await id(page,'ob-info-box').getByRole('button',{name:'OK'}).click();
 await expect(id(page,'ob-hotlist-undo')).toBeDisabled();
 await rows.getByRole('radio').nth(1).check();await id(page,'ob-hotlist-edit').click();await expect(id(page,'ob-entry-id')).toHaveValue('RA3');
 await id(page,'ob-entry-id').fill('Edited');await id(page,'ob-entry-ok').click();await expect(rows).toContainText('Edited');
 await id(page,'ob-hotlist-undo').click();await expect(rows).toContainText('RA3');await expect(rows).not.toContainText('Edited');await expect(id(page,'ob-hotlist-undo')).toBeDisabled();
 await rows.getByRole('radio').nth(0).check();await id(page,'ob-hotlist-delete').click();
 const q=id(page,'ob-hotlist-delete-box');await expect(q).toContainText('Delete Highlighted Entry from List?');await id(page,'ob-hotlist-delete-box-no').click();await expect(rows.getByRole('radio')).toHaveCount(2);
 await id(page,'ob-hotlist-delete').click();await id(page,'ob-hotlist-delete-box-yes').click();await expect(rows.getByRole('radio')).toHaveCount(1);await expect(rows).not.toContainText('RA1');
 await id(page,'ob-hotlist-undo').click();await expect(rows.getByRole('radio')).toHaveCount(2);await expect(rows).toContainText('RA1');
});

test('the QSO list popup offers its Selection items only for a selected data row',async({page})=>{
 await observatory(page);
 // QSO list (TObjctListForm1 family): no popup without a selected data row; with one, the Selection items.
 await card(page).getByTestId('ob-options').click();await id(page,'ob-options-virtual-observatory').check();await id(page,'ob-options-ok').click();
 await id(page,'fi-file-menu').click();await id(page,'qso-menu').click();await id(page,'qso-ok').click();
 const lines=id(page,'qso-list-lines');await expect(lines).toBeVisible();
 await lines.click({button:'right'});await expect(id(page,'popup-menu')).toHaveCount(0);
 await id(page,'qso-list-line-6').click();await lines.click({button:'right'});await expect(id(page,'popup-qso-list-add')).toBeFocused();await expect(id(page,'popup-qso-list-start')).toBeVisible();
 await id(page,'popup-qso-list-add').click();await expect(id(page,'fi-box')).toContainText('Added');await id(page,'fi-box').getByRole('button').first().click();
 await id(page,'qso-list-list-menu').click();await id(page,'qso-list-close').click();
});

test('Site Information keeps Print and Close; the Cluster HR guide header entry opens the E05 guide',async({page})=>{
 await observatory(page);
 // Site Information: TInfoListForm1 with Search, Save Text and Edit hidden; Print and Close.
 await page.getByText('Site clock · fixed UT scenario',{exact:true}).click();await page.getByTestId('ob-site-information').click();await expect(id(page,'ob-site-info-close')).toBeVisible();
 await id(page,'ob-site-info-print').click();await expect(id(page,'ob-site-info-print-preview')).toContainText('Current Site & Telescope Parameters');
 await id(page,'ob-site-info-print-preview-close').click();await id(page,'ob-site-info-close').click();await expect(id(page,'ob-site-info')).toBeHidden();
 await clickHeaderTool(page,'Cluster HR guide');await expect.poll(()=>new URL(page.url()).hash).toBe('#cluster-database');
 await expect(page.getByRole('heading',{name:'Ages and distances of star clusters'})).toBeVisible({timeout:15000});
});
