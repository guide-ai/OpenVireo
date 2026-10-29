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
 await id(page,'terminate-slew-no').click();await expect(box).toHaveCount(0);await expect(id(page,'motion-phase')).toContainText(/Slewing|moving/i);
 await id(page,'ob-set-coordinates').click();await id(page,'terminate-slew-yes').click();await expect(box).toHaveCount(0);
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
 for(const k of['edit','delete','undo'])await expect(id(page,`popup-${k}`)).toBeDisabled();
 await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);await expect(id(page,'ob-hotlist')).toBeVisible();
 await rows.click({button:'right'});await id(page,'popup-slew').click();await expect(id(page,'ob-sky-coords')).toBeVisible();
 await page.goto('/#spectrometer');await expect(heading(page,'Where to take a spectrum')).toBeVisible();
 await expect(id(page,'spectrometer-routes').getByRole('link')).toHaveCount(6);await expect(page.getByText('Exposure acquisition is pending')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Open supported star exposure'})).toBeVisible();
});
