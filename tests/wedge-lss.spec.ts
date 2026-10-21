import{test,expect,type Page}from'@playwright/test';
// Scoped N06/E02 LSS wedge flows. Until the coordinator mounts WedgeLab in App these
// run against the owned harness (docs/WEDGE-PLOT.md) via OPENVIREO_WEDGE_HARNESS_URL.
// All files below are synthetic test vectors, not CLEA observations or original saves.
const harness=process.env.OPENVIREO_WEDGE_HARNESS_URL;
test.skip(!harness,'OPENVIREO_WEDGE_HARNESS_URL is not set; the wedge panel is not mounted in App yet.');
const HEADER='Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments';
const DEG='°';
const row=(id:string,ra:string,dec:string,v:string,c='synthetic')=>id.padEnd(11)+'  4321.5000 '+ra+' '+dec+' '+v+' '+c;
const latin1=(s:string)=>Buffer.from(Uint8Array.from(s,ch=>ch.charCodeAt(0)));
const txt=(name:string,...lines:string[])=>({name,mimeType:'text/plain',buffer:latin1(lines.join('\r\n')+'\r\n')});
const A=txt('lss_a.txt',HEADER,row('SYN-001','13h30m00.0s','+29'+DEG+"30'00\"",'6000.0'),row('SYN-002','12h00m00.0s','+28'+DEG+"00'00\"",'11991.7'),row('SYN-003','16h00m00.0s','+27'+DEG+"00'00\"",'5995.8'),row('SYN-BAD','12:30:00','+27'+DEG+"00'00\"",'4000.0'));
const B=txt('lss_b.TXT',HEADER,row('SYN-101','14h00m00.0s','+30'+DEG+"00'00\"",'3000.0'),row('SYN-102','15h00m00.0s','+30'+DEG+"00'00\"",'9000.0'));
const open=async(page:Page)=>{await page.goto(harness!);await expect(page.getByTestId('wedge-lab')).toBeVisible();};
const load=async(page:Page,file:ReturnType<typeof txt>)=>page.getByTestId('wedge-file').setInputFiles(file);
const notice=(page:Page)=>page.getByTestId('wedge-notice');

test('complete flow: plot data, load, inspect, options, add/clear/cancel and export',async({page},info)=>{
 await open(page);
 await expect(page.getByTestId('wedge-status')).toHaveText('No LSS data loaded.');
 const persistence=page.getByTestId('wedge-persistence');
 await expect(persistence).toBeVisible();await expect(persistence).toContainText('not included in Save investigation');await expect(persistence).toContainText('reloaded or closed');
 await page.getByTestId('wedge-plot-data').click();
 await expect(notice(page)).toContainText('No data to plot');
 await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 0');
 await load(page,A);
 await expect(notice(page)).toContainText('Saved observations file "lss_a.txt" loaded.');
 await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(4);
 await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 3');
 await expect(page.getByTestId('wedge-excluded')).toContainText('1 record is not plotted');
 await expect(page.getByTestId('wedge-row-3')).toContainText('Spelling not admitted here');
 // Velocity grid default: three rings labelled 4000/8000/12000 and RA labels 12..16.
 await expect(page.locator('.wedge-text text[data-role="ring-label"]')).toHaveText(['4000','8000','12000']);
 await expect(page.locator('.wedge-text text[data-role="ra-label"]')).toHaveText(['12','13','14','15','16']);
 const p0=page.getByTestId('wedge-point-0');
 await expect(p0).toHaveAttribute('data-x','353');await expect(p0).toHaveAttribute('data-y','288');await expect(p0).toHaveAttribute('r','1');
 await p0.click({force:true});
 await expect(page.getByTestId('wedge-detail-pixel')).toHaveText('353, 288');
 await expect(page.getByTestId('wedge-details')).toContainText('SYN-001');
 await expect(page.getByTestId('wedge-row-0')).toHaveClass(/selected/);
 await expect(page.getByTestId('wedge-selection')).toBeVisible();
 // Recovered TColor schemes: navy/yellow/white display, white/black/black print scheme.
 await expect(page.getByTestId('wedge-background')).toHaveAttribute('fill','#000080');
 await expect(page.locator('.wedge-grid')).toHaveAttribute('stroke','#ffff00');await expect(p0).toHaveAttribute('stroke','#ffffff');
 await page.screenshot({path:info.outputPath('desktop-velocity.png'),fullPage:true});
 await page.getByTestId('wedge-scheme').selectOption('1');
 await expect(page.getByTestId('wedge-background')).toHaveAttribute('fill','#ffffff');await expect(p0).toHaveAttribute('stroke','#000000');
 await page.getByTestId('wedge-scheme').selectOption('0');

 // Options: Cancel and Escape discard; OK commits.
 await page.getByTestId('wedge-options-open').click();
 const dlg=page.getByTestId('wedge-options');await expect(dlg).toBeVisible();
 await expect(page.getByTestId('wedge-grid-0')).toBeFocused();
 await page.getByTestId('wedge-grid-2').check();await page.getByTestId('wedge-options-cancel').click();
 await expect(dlg).toHaveCount(0);await expect(page.getByTestId('wedge-options-open')).toBeFocused();
 await expect(page.locator('.wedge-text text[data-role="ring-label"]')).toHaveCount(3);
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-size-5').check();await page.keyboard.press('Escape');
 await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','1');
 await page.getByTestId('wedge-options-open').click();
 await page.getByTestId('wedge-grid-1').check();await page.getByTestId('wedge-size-3').check();await page.getByTestId('wedge-style-1').check();
 await page.getByTestId('wedge-options-ok').click();
 await expect(page.locator('.wedge-text text[data-role="ring-label"]')).toHaveText(['0.01','0.02','0.03','0.04']);
 await expect(page.locator('.wedge-text text[data-role="axis-title"]')).toHaveText('Z(=V/C)');
 await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','3');await expect(page.getByTestId('wedge-point-0')).toHaveClass(/filled/);
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-2').check();await page.getByTestId('wedge-options-ok').click();
 await expect(page.locator('.wedge-grid path')).toHaveCount(1);await expect(page.locator('.wedge-text text[data-role="ra-label"]')).toHaveText(['12','16']);

 // Second file: Retain Current Data? → Yes adds.
 await load(page,B);
 const prompt=page.getByTestId('wedge-prompt');
 await expect(prompt).toHaveAttribute('data-stage','retain');await expect(prompt).toContainText('Retain Current Data?');
 await expect(page.getByTestId('wedge-prompt-yes')).toBeFocused();await expect(page.getByTestId('wedge-file')).toBeDisabled();
 await page.getByTestId('wedge-prompt-yes').click();
 await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(6);await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 5');
 // No → Confirm Deletion! → No keeps data and reports "Data was not loaded."
 await load(page,B);await page.getByTestId('wedge-prompt-no').click();
 await expect(prompt).toHaveAttribute('data-stage','confirm-delete');await expect(prompt).toContainText('Are you SURE you want to delete your current data?');
 await page.getByTestId('wedge-prompt-no').click();
 await expect(notice(page)).toContainText('Data was not loaded.');await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(6);
 // Cancel keeps data.
 await load(page,B);await page.getByTestId('wedge-prompt-cancel').click();
 await expect(notice(page)).toHaveAttribute('data-cause','cancel');await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(6);
 // No → Yes replaces.
 await load(page,B);await page.getByTestId('wedge-prompt-no').click();await page.getByTestId('wedge-prompt-yes').click();
 await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(2);await expect(page.getByTestId('wedge-row-0')).toContainText('SYN-101');
 await page.getByTestId('wedge-sources').evaluate(e=>(e.parentElement as HTMLDetailsElement).open=true);
 await expect(page.getByTestId('wedge-sources').locator('li')).toHaveCount(3);

 const download=page.waitForEvent('download');await page.getByTestId('wedge-export').click();
 const d=await download;expect(d.suggestedFilename()).toBe('openvireo-lss-wedge-points.csv');
 const csv=await (await import('node:fs/promises')).readFile(await d.path(),'latin1');
 expect(csv.split('\r\n')[0]).toMatch(/^schema,record,source_file,source_sha256/);expect(csv).toContain('openvireo-lss-wedge-points/1,1,lss_b.TXT');
 expect(csv).toMatch(/,[0-9a-f]{64},/);
});

test('refusals keep current data: extension, header, blank line and oversize',async({page})=>{
 await open(page);await load(page,A);await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(4);
 await load(page,{...A,name:'lss_a.dat'});
 await expect(notice(page)).toContainText('LSS observation files must be in text format.');await expect(notice(page)).toContainText('Data was not loaded.');
 await load(page,txt('notes.txt','Results of something','x'));
 await expect(notice(page)).toContainText('File notes.txt does not contain LSS redshift data!');
 await load(page,{name:'blank.txt',mimeType:'text/plain',buffer:latin1(HEADER+'\r\n'+row('S','13h0m0s','+1'+DEG+"0'0\"",'1')+'\r\n\r\n')});
 await expect(notice(page)).toContainText('empty line');
 await load(page,{name:'big.txt',mimeType:'text/plain',buffer:Buffer.alloc(512*1024+1,0x41)});
 await expect(notice(page)).toContainText('larger than this page accepts');
 await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(4);await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 3');
 await page.getByTestId('wedge-notice-dismiss').click();await expect(notice(page)).toHaveCount(0);
});

test('a cancelled read never lands late and the same file can be read again',async({page})=>{
 await page.addInitScript(()=>{const original=Blob.prototype.arrayBuffer;const gate:{release?:()=>void}={};(window as unknown as{__wedgeGate:typeof gate}).__wedgeGate=gate;
  Blob.prototype.arrayBuffer=function(this:Blob){const self=this;return new Promise<ArrayBuffer>(resolve=>{gate.release=()=>{void original.call(self).then(resolve);};});};});
 await open(page);await load(page,A);
 await expect(page.getByTestId('wedge-status')).toHaveText('Reading lss_a.txt…');await expect(page.getByTestId('wedge-plot-data')).toBeDisabled();
 await page.getByTestId('wedge-cancel-read').click();
 await expect(page.getByTestId('wedge-status')).toHaveText('No LSS data loaded.');
 await page.evaluate(()=>(window as unknown as{__wedgeGate:{release?:()=>void}}).__wedgeGate.release?.());
 await page.waitForTimeout(200);
 await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(0);await expect(notice(page)).toHaveCount(0);
 await load(page,A);await page.evaluate(()=>(window as unknown as{__wedgeGate:{release?:()=>void}}).__wedgeGate.release?.());
 await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(4);
});

test('mobile layout keeps the plot, table and dialogs usable without page overflow',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});
 await open(page);await load(page,A);await load(page,B);
 await expect(page.getByTestId('wedge-prompt-yes')).toBeInViewport();await page.getByTestId('wedge-prompt-yes').click();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);expect(overflow).toBeLessThanOrEqual(0);
 const box=await page.getByTestId('wedge-svg').boundingBox();expect(box!.width).toBeLessThanOrEqual(390);expect(box!.width).toBeGreaterThan(300);
 await page.getByTestId('wedge-row-1').getByRole('button').click();await expect(page.getByTestId('wedge-details')).toContainText('SYN-002');
 await page.getByTestId('wedge-options-open').click();
 for(const id of['wedge-grid-0','wedge-size-5','wedge-options-ok'])await expect(page.getByTestId(id)).toBeVisible();
 await page.screenshot({path:info.outputPath('mobile-options.png')});
 await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await expect(page.getByTestId('wedge-options').locator(':focus')).toHaveCount(1);
 await page.getByTestId('wedge-options-ok').click();
 await expect(page.getByTestId('wedge-persistence')).toBeVisible();
 await page.screenshot({path:info.outputPath('mobile-plot.png'),fullPage:true});
});

test('host inactivity drops a pending read, import consent and options draft but keeps confirmed work',async({page},info)=>{
 // Arm-able gate: while armed, Blob.arrayBuffer waits for release (a slow read).
 await page.addInitScript(()=>{const original=Blob.prototype.arrayBuffer;const gate:{armed:boolean;release?:()=>void}={armed:false};(window as unknown as{__wedgeGate:typeof gate}).__wedgeGate=gate;
  Blob.prototype.arrayBuffer=function(this:Blob){if(!gate.armed)return original.call(this);const self=this;return new Promise<ArrayBuffer>(resolve=>{gate.release=()=>{void original.call(self).then(resolve);};});};});
 const gate=(armed:boolean)=>page.evaluate(a=>{(window as unknown as{__wedgeGate:{armed:boolean}}).__wedgeGate.armed=a;},armed);
 const release=()=>page.evaluate(()=>(window as unknown as{__wedgeGate:{release?:()=>void}}).__wedgeGate.release?.());
 const rows=page.locator('[data-testid^="wedge-row-"]'),hide=page.getByTestId('host-hide'),busy=page.getByTestId('host-busy');
 await page.goto(harness!+'?host=1');await expect(page.getByTestId('wedge-lab')).toBeVisible();
 // Confirmed work: one file, a selection and committed options (Z grid, size 3).
 await load(page,A);await expect(rows).toHaveCount(4);
 await page.getByTestId('wedge-row-0').getByRole('button').click();
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-1').check();await page.getByTestId('wedge-size-3').check();await page.getByTestId('wedge-options-ok').click();
 const confirmed=async()=>{
  await expect(rows).toHaveCount(4);await expect(page.getByTestId('wedge-row-0')).toHaveClass(/selected/);await expect(page.getByTestId('wedge-details')).toContainText('SYN-001');
  await expect(page.locator('.wedge-text text[data-role="ring-label"]')).toHaveText(['0.01','0.02','0.03','0.04']);await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','3');
  await expect(page.getByTestId('wedge-status')).toHaveText('4 records from 1 file.');await expect(page.getByTestId('wedge-prompt')).toHaveCount(0);await expect(page.getByTestId('wedge-options')).toHaveCount(0);
 };
 // 1. Hidden during a read; the read then completes late; shown again.
 await gate(true);await load(page,B);await expect(page.getByTestId('wedge-status')).toHaveText('Reading lss_b.TXT…');
 await hide.check();await expect(page.getByTestId('wedge-lab')).toBeHidden();
 await release();await page.waitForTimeout(200);
 await hide.uncheck();await confirmed();
 await expect(notice(page)).toHaveAttribute('data-cause','suspended');await expect(notice(page)).toContainText('lss_b.TXT');await expect(notice(page)).toContainText('nothing from it was added');
 await gate(false);
 // 2. Visible project operation while "Retain Current Data?" is open: controls disabled, prompt dropped.
 await load(page,B);await expect(page.getByTestId('wedge-prompt')).toHaveAttribute('data-stage','retain');
 await busy.check();
 await expect(page.getByTestId('wedge-prompt')).toHaveCount(0);
 for(const id of['wedge-file','wedge-plot-data','wedge-options-open','wedge-export','wedge-notice-dismiss'])await expect(page.getByTestId(id)).toBeDisabled();
 await expect(page.getByTestId('wedge-row-1').getByRole('button')).toBeDisabled();
 await page.getByTestId('wedge-point-1').click({force:true});await expect(page.getByTestId('wedge-row-0')).toHaveClass(/selected/);
 await page.screenshot({path:info.outputPath('host-busy.png'),fullPage:true});
 await busy.uncheck();await confirmed();await expect(notice(page)).toHaveAttribute('data-cause','suspended');
 // 3. Hidden at the second stage ("Confirm Deletion!"): nothing is deleted.
 await load(page,B);await page.getByTestId('wedge-prompt-no').click();await expect(page.getByTestId('wedge-prompt')).toHaveAttribute('data-stage','confirm-delete');
 await hide.check();await hide.uncheck();await confirmed();
 // 4. Hidden with an options draft: the draft is discarded, committed options remain.
 // The modal backdrop covers the simulated host checkbox, so the host change is dispatched programmatically.
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-2').check();await page.getByTestId('wedge-size-5').check();
 await hide.dispatchEvent('click');await expect(hide).toBeChecked();await expect(page.getByTestId('wedge-options')).toHaveCount(0);
 await hide.dispatchEvent('click');await expect(hide).not.toBeChecked();await confirmed();
 await page.getByTestId('wedge-options-open').click();await expect(page.getByTestId('wedge-grid-1')).toBeChecked();await expect(page.getByTestId('wedge-size-3')).toBeChecked();
 await page.getByTestId('wedge-options-cancel').click();
 // 5. Re-enabled: the same file loads again through the native prompt.
 await load(page,B);await page.getByTestId('wedge-prompt-yes').click();
 await expect(rows).toHaveCount(6);await expect(page.getByTestId('wedge-row-0')).toHaveClass(/selected/);
});

test('translated presentation captions reach the native prompts and options dialog',async({page},info)=>{
 await page.goto(harness!+'?lang=es');await expect(page.getByTestId('wedge-lab')).toBeVisible();
 await expect(page.getByRole('heading',{level:2})).toHaveText('Diagrama de cuña LSS');await expect(page.getByTestId('wedge-status')).toHaveText('Sin datos');
 await expect(page.getByText('Datos guardados',{exact:true})).toBeVisible();await expect(page.getByTestId('wedge-persistence')).toBeVisible();
 await load(page,A);await load(page,B);
 const prompt=page.getByTestId('wedge-prompt');
 await expect(prompt.getByRole('heading')).toHaveText('¿Conservar los datos actuales?');
 await expect(prompt.getByRole('button')).toHaveText(['Sí','No','Cancelar']);
 // Untranslated message bodies keep the verbatim original text.
 await expect(prompt).toContainText('Do you want to add the file data to your current data?');
 await page.screenshot({path:info.outputPath('translated-prompt.png'),fullPage:true});
 await page.getByTestId('wedge-prompt-no').click();await expect(prompt.getByRole('heading')).toHaveText('¡Confirmar borrado!');await expect(prompt.getByRole('button')).toHaveText(['Sí','No']);
 await page.getByTestId('wedge-prompt-yes').click();await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(2);
 await page.getByTestId('wedge-options-open').click();
 await expect(page.getByTestId('wedge-options').getByRole('heading')).toHaveText('Opciones del diagrama');await expect(page.getByTestId('wedge-options-ok')).toHaveText('Aceptar');
 await page.keyboard.press('Escape');
 // Text drawn inside the recovered figure stays native.
 await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 2');
});

// Regressions for the separate native /review of f491c22 (items 2, 3, 4 and 10).
const rows=(page:Page)=>page.locator('[data-testid^="wedge-row-"]');
const commitOptions=async(page:Page,grid:0|1|2,size:1|2|3|4|5)=>{
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-'+grid).check();await page.getByTestId('wedge-size-'+size).check();await page.getByTestId('wedge-options-ok').click();
 await expect(page.getByTestId('wedge-options')).toHaveCount(0);
};

test('options focus trap follows the checked radio of each group (one tab stop per group)',async({page})=>{
 await open(page);await load(page,A);await expect(rows(page)).toHaveCount(4);
 for(const grid of[1,2]as const){
  await commitOptions(page,grid,3);
  await page.getByTestId('wedge-options-open').click();
  const g=page.getByTestId('wedge-grid-'+grid);await expect(g).toBeFocused();
  // Shift+Tab from the first actual tab stop (the checked grid radio) wraps to Cancel.
  await page.keyboard.press('Shift+Tab');await expect(page.getByTestId('wedge-options-cancel')).toBeFocused();
  // Tab from the last stop wraps back to the checked grid radio, not to grid 0.
  await page.keyboard.press('Tab');await expect(g).toBeFocused();
  // Forward cycle: checked grid → checked size → checked style → OK → Cancel → checked grid.
  for(const id of['wedge-size-3','wedge-style-0','wedge-options-ok','wedge-options-cancel','wedge-grid-'+grid]){await page.keyboard.press('Tab');await expect(page.getByTestId(id)).toBeFocused();}
  // Backward cycle stays inside the dialog too.
  for(const id of['wedge-options-cancel','wedge-options-ok','wedge-style-0','wedge-size-3','wedge-grid-'+grid,'wedge-options-cancel']){await page.keyboard.press('Shift+Tab');await expect(page.getByTestId(id)).toBeFocused();}
  // Escape still discards the draft.
  await page.getByTestId('wedge-size-5').check();await page.keyboard.press('Escape');
  await expect(page.getByTestId('wedge-options')).toHaveCount(0);await expect(page.getByTestId('wedge-options-open')).toBeFocused();
  await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','3');
 }
});

test('retain/delete prompts: Escape cancels without deleting and focus returns to the enabled file input',async({page})=>{
 await open(page);await load(page,A);await expect(rows(page)).toHaveCount(4);
 const prompt=page.getByTestId('wedge-prompt'),file=page.getByTestId('wedge-file');
 const back=async(count:number)=>{await expect(prompt).toHaveCount(0);await expect(file).toBeEnabled();await expect(file).toBeFocused();await expect(rows(page)).toHaveCount(count);};
 // Escape at "Retain Current Data?" = Cancel: current data kept.
 await load(page,B);await expect(page.getByTestId('wedge-prompt-yes')).toBeFocused();
 await page.keyboard.press('Escape');await back(4);await expect(notice(page)).toHaveAttribute('data-cause','cancel');
 // Escape at "Confirm Deletion!" is the non-destructive answer (No): nothing is deleted.
 await load(page,B);await page.getByTestId('wedge-prompt-no').click();
 await expect(prompt).toHaveAttribute('data-stage','confirm-delete');await expect(page.getByTestId('wedge-prompt-yes')).toBeFocused();
 await page.keyboard.press('Escape');await back(4);await expect(notice(page)).toHaveAttribute('data-cause','declined');
 // Yes (keyboard) adds; focus returns once React has re-enabled the input.
 await load(page,B);await expect(page.getByTestId('wedge-prompt-yes')).toBeFocused();await page.keyboard.press('Enter');await back(6);await expect(notice(page)).toHaveAttribute('data-kind','loaded');
 // Cancel and No → No keep data.
 await load(page,B);await page.getByTestId('wedge-prompt-cancel').click();await back(6);
 await load(page,B);await page.getByTestId('wedge-prompt-no').click();await page.getByTestId('wedge-prompt-no').click();await back(6);
 // Double confirmation still replaces only after No → Yes.
 await load(page,B);await page.getByTestId('wedge-prompt-no').click();await page.getByTestId('wedge-prompt-yes').click();await back(2);
 await expect(page.getByTestId('wedge-row-0')).toContainText('SYN-101');
});

test('cancelling a read returns focus to the re-enabled file input',async({page})=>{
 await page.addInitScript(()=>{const original=Blob.prototype.arrayBuffer;const gate:{release?:()=>void}={};(window as unknown as{__wedgeGate:typeof gate}).__wedgeGate=gate;
  Blob.prototype.arrayBuffer=function(this:Blob){const self=this;return new Promise<ArrayBuffer>(resolve=>{gate.release=()=>{void original.call(self).then(resolve);};});};});
 await open(page);await load(page,A);
 await expect(page.getByTestId('wedge-file')).toBeDisabled();
 await page.getByTestId('wedge-cancel-read').focus();await page.keyboard.press('Enter');
 await expect(page.getByTestId('wedge-cancel-read')).toHaveCount(0);
 await expect(page.getByTestId('wedge-file')).toBeEnabled();await expect(page.getByTestId('wedge-file')).toBeFocused();
});

test('host inactivity at a prompt never moves focus to hidden or disabled controls',async({page})=>{
 await page.goto(harness!+'?host=1');await expect(page.getByTestId('wedge-lab')).toBeVisible();
 const hide=page.getByTestId('host-hide'),busy=page.getByTestId('host-busy'),prompt=page.getByTestId('wedge-prompt');
 await load(page,A);await expect(rows(page)).toHaveCount(4);
 // Visible project operation while "Retain Current Data?" is open: the host control keeps focus.
 await load(page,B);await expect(prompt).toHaveAttribute('data-stage','retain');
 await busy.focus();await page.keyboard.press('Space');await expect(busy).toBeChecked();
 await expect(prompt).toHaveCount(0);await expect(busy).toBeFocused();
 await page.keyboard.press('Space');await expect(busy).not.toBeChecked();
 await expect(page.getByTestId('wedge-file')).toBeEnabled();await expect(busy).toBeFocused();
 // Hidden route at "Confirm Deletion!": no focus is pulled into the hidden panel, nor on return.
 await load(page,B);await page.getByTestId('wedge-prompt-no').click();await expect(prompt).toHaveAttribute('data-stage','confirm-delete');
 await hide.focus();await page.keyboard.press('Space');await expect(page.getByTestId('wedge-lab')).toBeHidden();await expect(hide).toBeFocused();
 await page.keyboard.press('Space');await expect(page.getByTestId('wedge-lab')).toBeVisible();await expect(hide).toBeFocused();
 await expect(rows(page)).toHaveCount(4);await expect(notice(page)).toHaveAttribute('data-cause','suspended');
});

test('declared presentation units and the row-count label are translatable; figure text stays native',async({page})=>{
 await page.goto(harness!+'?lang=es');await expect(page.getByTestId('wedge-lab')).toBeVisible();
 await load(page,A);
 await expect(page.getByTestId('wedge-row-0')).toContainText('13.500000 hr');await expect(page.getByTestId('wedge-row-0')).toContainText('29.50000 grad');
 await page.getByTestId('wedge-row-0').getByRole('button').click();
 await expect(page.getByTestId('wedge-details')).toContainText('13.500000 hr');await expect(page.getByTestId('wedge-details')).toContainText('22.5000 grad');
 await load(page,B);await expect(page.getByTestId('wedge-prompt')).toContainText('2 filas');
 await page.keyboard.press('Escape');
 await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 3');
 await expect(page.locator('.wedge-text text[data-role="ra-label"]')).toHaveText(['12','13','14','15','16']);
});

test('the SVG arc paths for every grid are unchanged by the pure-core move',async({page})=>{
 // Golden d attributes: hand-normalised GDI direction points (see src/core/wedgePlot.test.ts), toFixed(3).
 const golden:Record<0|1|2,string[]>={
  0:['M 445 350 A 160 160 0 0 0 306.327 430.188','M 445 190 A 320 320 0 0 0 167.904 349.945','M 445 30 A 480 480 0 0 0 29.231 270.133'],
  1:['M 445 390 A 120 120 0 0 0 341.058 450.033','M 445 270 A 240 240 0 0 0 237.115 390.067','M 445 150 A 360 360 0 0 0 133.173 330.100','M 445 30 A 480 480 0 0 0 29.231 270.133'],
  2:['M 445 30 A 480 480 0 0 0 29.231 270.133'],
 };
 const paths=async()=>page.locator('.wedge-grid path').evaluateAll(ps=>ps.map(p=>p.getAttribute('d')));
 await open(page);
 expect(await paths()).toEqual(golden[0]);
 await commitOptions(page,1,1);expect(await paths()).toEqual(golden[1]);
 await commitOptions(page,2,1);expect(await paths()).toEqual(golden[2]);
 await commitOptions(page,0,1);expect(await paths()).toEqual(golden[0]);
});


for(const result of['success','header','transport']as const)test(`first ${result} read returns focus after its input is enabled`,async({page})=>{
 await page.addInitScript(mode=>{const original=Blob.prototype.arrayBuffer;(window as unknown as{__firstRead?:()=>void}).__firstRead=undefined;Blob.prototype.arrayBuffer=function(this:Blob){const self=this;return new Promise<ArrayBuffer>((resolve,reject)=>{(window as unknown as{__firstRead:()=>void}).__firstRead=()=>{if(mode==='transport')reject(new Error('synthetic local read failure'));else void original.call(self).then(resolve,reject);};});};},result);
 await open(page);const input=page.getByTestId('wedge-file');await input.focus();await load(page,result==='header'?txt('bad-first.txt','Not LSS'):A);await expect(input).toBeDisabled();
 await page.evaluate(()=>(window as unknown as{__firstRead?:()=>void}).__firstRead?.());await expect(input).toBeEnabled();await expect(input).toBeFocused();
 if(result==='success')await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(4);else{await expect(notice(page)).toHaveAttribute('data-kind','not-loaded');await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(0);}
});

test('Escape from enabled controls outside inline consent cancels each stage and preserves data',async({page})=>{
 await open(page);await load(page,A);await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(4);
 for(const stage of['retain','confirm-delete']){
  await load(page,B);if(stage==='confirm-delete')await page.getByTestId('wedge-prompt-no').click();await expect(page.getByTestId('wedge-prompt')).toHaveAttribute('data-stage',stage);
  await page.getByTestId('wedge-scheme').focus();await page.keyboard.press('Escape');await expect(page.getByTestId('wedge-prompt')).toHaveCount(0);await expect(page.getByTestId('wedge-file')).toBeFocused();await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(4);
  await expect(page.getByTestId('wedge-row-0')).toContainText('SYN-001');
 }
});
