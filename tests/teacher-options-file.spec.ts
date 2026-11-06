import{test,expect,type Page}from'@playwright/test';
import{readFile}from'node:fs/promises';
import{enterInstructorMode,leaveInstructorMode}from'./fixtures/instructor-mode';
// Front T2 (analysis/front-plans/front-teacher.md §T2; analysis/front-teacher/t2/RECOVERY.md; docs/OPTICAL-OPTIONS.md):
// Demonstration Mode (DemoBox, record+0x27c6 stored inverted) is kept in this browser only and opens instructor mode at page
// load, as FormCreate 0x587c50..0x587c73 opens the gate [W storage]; Save Updates (OK, then the writer 0x5a4644) downloads the
// web options file with a zero-length password; Load reads it back with VIREO's checks (0x5a3534, 0x5a183c). Expected strings
// are the recovered literals and the chosen web contract, not native oracles. No real password appears here.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const card=(p:Page)=>p.locator('.telescope-motion');
const storageKeys=(page:Page)=>page.evaluate(()=>Object.keys(localStorage));
async function observatory(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await button(page,'Open dome ↗').click();await page.getByLabel('Target',{exact:true}).selectOption('N0000.DAT@14428');
 await button(page,'Point telescope ↗').click();await button(page,'Switch to telescope view ↗').click();
}
async function openOptions(page:Page){
 await card(page).getByTestId('ob-options').click();await expect(id(page,'ob-options-dialog')).toBeVisible();
}
async function ok(page:Page){await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();}

test('a student keeps empty storage; Demonstration Mode opens instructor mode at every load until it is unticked',async({page})=>{
 await observatory(page);
 expect(await storageKeys(page)).toEqual([]);
 await expect(card(page).getByTestId('ob-options')).toHaveAttribute('data-gate','user-options-box');
 await enterInstructorMode(page);await openOptions(page);
 const box=id(page,'ob-options-demonstration-mode');await expect(box).not.toBeChecked();
 await expect(id(page,'ob-options-demonstration-mode-note')).toContainText('anyone using it: it is not a lock');
 await expect(id(page,'ob-options-others')).not.toContainText('Demonstration Mode');
 await expect(id(page,'ob-options-teacher-deferred')).not.toContainText('Demonstration Mode');
 await box.check();await page.screenshot({path:test.info().outputPath('demonstration-mode-option.png')});
 await ok(page);
 expect(await page.evaluate(()=>localStorage.getItem('openvireo.demonstrationMode'))).toBe('1');
 // Reload: instructor mode is on without the confirmation (FormCreate's gate write), with the browser-wide line.
 await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await expect(id(page,'instructor-mode-banner')).toBeVisible();await expect(id(page,'instructor-mode-confirm')).toHaveCount(0);
 await expect(id(page,'instructor-mode-demonstration')).toContainText('Demonstration Mode is on in this browser');
 await id(page,'instructor-mode-banner').screenshot({path:test.info().outputPath('demonstration-mode-banner.png')});
 await page.setViewportSize({width:390,height:844});await id(page,'instructor-mode-banner').screenshot({path:test.info().outputPath('demonstration-mode-banner-phone.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.setViewportSize({width:1440,height:1050});
 // Leave closes it for this page only; the next load opens it again.
 await leaveInstructorMode(page);await page.reload();await expect(id(page,'instructor-mode-banner')).toBeVisible({timeout:15000});
 // Untick + OK: storage is empty again and the next load starts closed.
 await observatory(page);await openOptions(page);await expect(id(page,'ob-options-demonstration-mode')).toBeChecked();
 await id(page,'ob-options-demonstration-mode').uncheck();await ok(page);
 expect(await storageKeys(page)).toEqual([]);
 await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await expect(id(page,'instructor-mode-banner')).toHaveCount(0);
 await button(page,'Open dome ↗').click();await page.getByLabel('Target',{exact:true}).selectOption('N0000.DAT@14428');
 await button(page,'Point telescope ↗').click();await button(page,'Switch to telescope view ↗').click();
 await expect(card(page).getByTestId('ob-options')).toHaveAttribute('data-gate','user-options-box');
});

test('Save Updates downloads the options with an empty password; Load brings them back with VIREO\'s checks',async({page})=>{
 await observatory(page);await enterInstructorMode(page);await openOptions(page);
 await id(page,'ob-options-test-mode').check();await id(page,'ob-options-show-object-id').check();await id(page,'ob-options-fast-slewing').uncheck();
 await id(page,'ob-options-edit-mode').check();
 await expect(id(page,'ob-options-file-note')).toContainText('The file has no password');
 // The writer's Edit Mode box (0x5a54e8, MB_YESNO|MB_ICONSTOP): Yes saves.
 await id(page,'ob-options-save').click();const ask=id(page,'ob-options-save-edit-mode');await expect(ask).toBeVisible();
 await expect(ask).toContainText('Edit Mode is Set!');await expect(ask).toContainText('Are you sure you want to save these option settings?');
 await page.screenshot({path:test.info().outputPath('save-edit-mode-box.png')});
 const download=page.waitForEvent('download');await id(page,'ob-options-save-edit-mode-yes').click();
 const file=await download;expect(file.suggestedFilename()).toBe('VEO_OPTS.json');
 const saved=await file.path();const doc=JSON.parse(await readFile(saved,'utf8'));
 expect(doc.password).toBe('');expect(doc.version).toBe('1.504');
 expect(doc.parameters).toEqual({baseMagnitude:6,skyMagnitude:16,spectrometerSkyMagnitude:19,baseCount:1000,spectrometerBaseCount:50,photometerTimerMs:100,spectrometerTimerMs:1});// Front T6
 expect(doc.options).toMatchObject({testMode:true,showObjectId:true,fastSlewing:false,editMode:true,limitSlewing:false,demonstrationMode:false,virtualObservatory:false});
 await expect(id(page,'ob-options-dialog')).toBeHidden();// Save Updates applied the options as OK does
 expect(await storageKeys(page)).toEqual([]);
 // Leave resets Edit Mode and Test Mode [W]; Load brings the saved values back into the dialog, OK applies them.
 await leaveInstructorMode(page);await enterInstructorMode(page);await openOptions(page);
 await expect(id(page,'ob-options-test-mode')).not.toBeChecked();await expect(id(page,'ob-options-edit-mode')).not.toBeChecked();
 await id(page,'ob-options-load').setInputFiles(saved);
 await expect(id(page,'ob-options-loaded')).toHaveAttribute('data-source','web');await expect(id(page,'ob-options-loaded')).toContainText('OK applies them');
 await expect(id(page,'ob-options-test-mode')).toBeChecked();await expect(id(page,'ob-options-edit-mode')).toBeChecked();
 await expect(id(page,'ob-options-show-object-id')).toBeChecked();await expect(id(page,'ob-options-fast-slewing')).not.toBeChecked();
 await expect(id(page,'ob-options-not-applied')).toHaveCount(0);
 await id(page,'ob-options-file').screenshot({path:test.info().outputPath('load-web-file.png')});
 await ok(page);await openOptions(page);await expect(id(page,'ob-options-test-mode')).toBeChecked();
 // An obsolete version: VIREO's Version Error box text; the dialog keeps its options.
 await id(page,'ob-options-load').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...doc,version:'1.40',password:'SYNTHETIC-PATTERN'}))});
 await expect(id(page,'ob-options-file-error-caption')).toHaveText('Version Error');await expect(id(page,'ob-options-file-error-inferred')).toHaveCount(0);
 expect((await id(page,'ob-options-file-error-text').innerText()).replace(/\r/g,'')).toBe('Options File old.json is obsolete.\nProgram will continue with defaults or alternative file.');
 await expect(id(page,'ob-options-dialog')).not.toContainText('SYNTHETIC');await expect(id(page,'ob-options-test-mode')).toBeChecked();
 // A short native file: File Error with the read error.
 const native=Buffer.alloc(100);native[0]=5;native.write('1.504',1,'latin1');
 await id(page,'ob-options-load').setInputFiles({name:'VEO_OPTS.INI',mimeType:'application/octet-stream',buffer:native});
 await expect(id(page,'ob-options-file-error-caption')).toHaveText('File Error');
 await expect(id(page,'ob-options-file-error-text')).toContainText('Options File VEO_OPTS.INI is Invalid.');
 await expect(id(page,'ob-options-file-error-text')).toContainText('Read beyond end of file');await expect(id(page,'ob-options-file-error-inferred')).toContainText('inferred');
 await id(page,'ob-options-file').screenshot({path:test.info().outputPath('load-file-error.png')});
 // A full native stream with Restrict Scope Access off: loaded; since Front T5 the box is applied (unchecked), not listed.
 const full=Buffer.alloc(8506);full[0]=5;full.write('1.504',1,'latin1');
 const at=(n:number)=>8506-(0x27dc-n)-1;// the 21 option bytes +0x27c8..+0x27dc close the stream
 full[8506-22]=1;full[8506-45]=5;/* review 1 L1: a rate index other than 3/4 */for(const r of [0x27cb,0x27ce,0x27d2,0x27d3,0x27d7,0x27db,0x27dc])full[at(r)]=1;full[at(0x27c8)]=1;
 await id(page,'ob-options-load').setInputFiles({name:'VEO_OPTS.INI',mimeType:'application/octet-stream',buffer:full});
 await expect(id(page,'ob-options-loaded')).toHaveAttribute('data-source','native');
 await expect(id(page,'ob-options-not-applied')).not.toContainText('Restrict Scope Access');await expect(id(page,'ob-options-restrict-scope-access')).not.toBeChecked();await id(page,'ob-options-file').screenshot({path:test.info().outputPath('load-native-file.png')});await expect(id(page,'ob-options-not-applied')).toContainText('Parameters (General, CCD and IR tabs, Scopes…), file names, paths and addresses');
 // Front T6: the seven Photometer and Spectrometer fields are applied from the stream (here all zero bytes), not listed.
 await expect(id(page,'ob-options-param-baseMagnitude')).toHaveValue('0.0');await expect(id(page,'ob-options-param-spectrometerTimerMs')).toHaveValue('0');
 await expect(id(page,'ob-options-test-mode')).toBeChecked();await expect(id(page,'ob-options-edit-mode')).not.toBeChecked();await expect(id(page,'ob-options-fast-slewing')).not.toBeChecked();
 await expect(id(page,'ob-options-fast-slewing-rate')).toContainText('slew-rate index 5');await expect(id(page,'ob-options-resave-warning')).toContainText('compiled values');
 await id(page,'ob-options-dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 expect(await storageKeys(page)).toEqual([]);
});
