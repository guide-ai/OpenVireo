import {test,expect,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {HEADER,PLR} from './fixtures/pulsar-saved-rows-controls';
// Front F3: Results › Save Recorded Measurements (Save2Click 0x56ef60, writer 0x56feac) in the rendered #pulsar-analysis route.
// The PLR text is synthetic. Expected texts are VIREO's recovered literals; the date/time format is the approved US web choice
// and the folder is the web adaptation (the files this Save wrote in this window). A download event is not proof of a save.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const file=(name:string,text:string,mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(text,'latin1')});
const sha=(text:string)=>createHash('sha256').update(Buffer.from(text,'latin1')).digest('hex');
async function download(page:Page,act:()=>Promise<unknown>){const next=page.waitForEvent('download');await act();const d=await next;return {name:d.suggestedFilename(),text:(await readFile((await d.path())!)).toString('latin1')};}
async function loadPlr(page:Page){
 await id(page,'pulsar-file').setInputFiles(file('synthetic-e2e.plr',PLR,'application/octet-stream'));
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));await id(page,'pulsar-properties-close').click();
}
async function recordManual(page:Page,comment:string){
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
}
const native=(page:Page)=>id(page,'pulsar-native-dialog');
async function saveAs(page:Page,name:string){
 await id(page,'pulsar-save').click();await expect(native(page)).toHaveAttribute('data-step','dialog');
 await expect(native(page)).toContainText('Select File Name for Data Save');
 await id(page,'pulsar-native-name').fill(name);await id(page,'pulsar-native-save').click();
}

test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date(2026,9,30,15,7,42));});

test('F3: Record → Save → Verify writes the native file (US date/time, CR LF); Save again → exists → No appends, Cancel auto-names 001.CSV',async({page})=>{
 await page.goto('/#pulsar-analysis');await loadPlr(page);
 await expect(id(page,'pulsar-save')).toBeDisabled();
 await recordManual(page,'first');
 await expect(id(page,'pulsar-save')).toBeEnabled();
 await saveAs(page,'run');
 await expect(native(page)).toHaveAttribute('data-step','verify');
 await expect(id(page,'pulsar-native-text')).toHaveText('Writing Data to run.CSV');
 const first=await download(page,()=>id(page,'pulsar-native-ok').click());
 expect(first.name).toBe('run.CSV');
 const lines=first.text.split('\r\n');
 expect(lines.slice(0,5)).toEqual(['"10-30-2026","3:07:42 PM"','"Table Number: "','','',HEADER]);
 expect(lines).toHaveLength(7);expect(lines[5]).toContain('"first"');expect(lines[6]).toBe('');
 // After the writer: Record and Save off, Review on, the pending reading cleared, the list kept.
 await expect(native(page)).toHaveCount(0);
 await expect(id(page,'pulsar-status')).toHaveText('Saved 1 measurements to run.CSV (download started).');
 await expect(id(page,'pulsar-save')).toBeDisabled();await expect(id(page,'pulsar-record')).toBeDisabled();await expect(id(page,'pulsar-review')).toBeEnabled();
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // A saved list: Clear asks only the confirmation.
 await id(page,'pulsar-clear').click();await expect(id(page,'pulsar-clear-dialog')).toContainText('Clear List of All Current Measurements?');
 await id(page,'pulsar-clear-no').click();
 // A second measurement, saved to the same name: the folder knows run.CSV (case-insensitively); No appends every list row, as
 // VIREO does (the list is never cleared by Save).
 await recordManual(page,'second');
 await saveAs(page,'RUN.csv');
 await expect(native(page)).toHaveAttribute('data-step','exists');
 await expect(id(page,'pulsar-native-text')).toContainText('The File RUN.csv Already Exists.');
 await expect(id(page,'pulsar-native-text')).toContainText('"No" => Append To Existing Data');
 await id(page,'pulsar-native-no').click();
 await expect(id(page,'pulsar-native-text')).toHaveText('Appending Data to RUN.csv');
 const appended=await download(page,()=>id(page,'pulsar-native-ok').click());
 expect(appended.name).toBe('RUN.csv');
 const more=appended.text.split('\r\n');
 expect(more.slice(0,6)).toEqual(lines.slice(0,6));
 expect(more).toHaveLength(9);expect(more[6]).toContain('"first"');expect(more[7]).toContain('"second"');
 await expect(id(page,'pulsar-status')).toHaveText('Appended 2 measurements to RUN.csv; the whole file was downloaded again.');
 // Cancel on the exists question picks the next free automatic name and shows the dialog again.
 await recordManual(page,'third');
 await saveAs(page,'run');
 await id(page,'pulsar-native-cancel').click();
 await expect(native(page)).toHaveAttribute('data-step','dialog');await expect(id(page,'pulsar-native-name')).toHaveValue('001.CSV');
 await id(page,'pulsar-native-save').click();
 await expect(id(page,'pulsar-native-text')).toHaveText('Writing Data to 001.CSV');
 // Verify Cancel writes nothing.
 await id(page,'pulsar-native-cancel').click();await expect(native(page)).toHaveCount(0);
 await expect(id(page,'pulsar-save')).toBeEnabled();
});

test('F3: unrecorded readings and a different extension follow the native questions; a bad name is refused; Clear can save first',async({page})=>{
 await page.goto('/#pulsar-analysis');await loadPlr(page);
 await recordManual(page,'kept');
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-save').click();
 await expect(native(page)).toHaveAttribute('data-step','unrecorded');
 await expect(native(page)).toContainText('Measurements Not Recorded!');
 await id(page,'pulsar-native-no').click();await expect(native(page)).toHaveCount(0);
 await id(page,'pulsar-save').click();await id(page,'pulsar-native-yes').click();
 await id(page,'pulsar-native-name').fill('notes.txt');await id(page,'pulsar-native-save').click();
 await expect(native(page)).toHaveAttribute('data-step','extension');
 await expect(native(page)).toContainText('Extension Not .CSV!');
 await id(page,'pulsar-native-yes').click();
 await expect(id(page,'pulsar-native-name')).toHaveValue('notes.txt');
 await id(page,'pulsar-native-name').fill('bad/name');await id(page,'pulsar-native-save').click();
 await expect(id(page,'pulsar-native-problem')).toBeVisible();
 await page.keyboard.press('Escape');await expect(native(page)).toHaveCount(0);
 // Clear with an unsaved list: "Yes, save first" runs Save; after it completes, Clear asks its confirmation.
 await id(page,'pulsar-clear').click();
 await expect(id(page,'pulsar-clear-dialog')).toContainText('Recorded Measurements Not Saved!');
 await id(page,'pulsar-clear-save').click();
 await expect(native(page)).toHaveAttribute('data-step','unrecorded');await id(page,'pulsar-native-yes').click();
 await id(page,'pulsar-native-name').fill('before-clear');await id(page,'pulsar-native-save').click();
 const saved=await download(page,()=>id(page,'pulsar-native-ok').click());
 expect(saved.name).toBe('before-clear.CSV');
 await expect(id(page,'pulsar-clear-dialog')).toContainText('Clear List of All Current Measurements?');
 await id(page,'pulsar-clear-yes').click();
 await expect(id(page,'pulsar-count')).toHaveText('0 recorded measurements');
});

// Front QA1 (2026-10-31, E06-1): the native Save clears the measurement record (0x56fe6c) but keeps the readouts, as in VIREO;
// Save investigation must still write that state, and Restore must bring it back with the list saved and Save disabled.
test('F3/QA1: after Save recorded measurements, Save investigation downloads the investigation and Restore brings it back',async({page,browser})=>{
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'kept');
 const before=await id(page,'pulsar-plot-1').locator('..').locator('..').innerText();
 await saveAs(page,'run');await download(page,()=>id(page,'pulsar-native-ok').click());
 await expect(id(page,'pulsar-save')).toBeDisabled();
 const next=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();
 const saved=await next;expect(saved.suggestedFilename()).toMatch(/\.json$/);
 const bytes=await readFile((await saved.path())!);
 const json=JSON.parse(bytes.toString('utf8'));
 const analysis=JSON.stringify(json).match(/"listSaved":(true|false)/);expect(analysis?.[1]).toBe('true');
 const fresh=await browser.newContext();const other=await fresh.newPage();
 await other.goto('/#pulsar-analysis');
 await other.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'openvireo-session.json',mimeType:'application/json',buffer:bytes});
 await expect(other.getByText('Investigation restored.',{exact:false})).toBeVisible({timeout:30_000});
 await expect(id(other,'pulsar-save')).toBeDisabled();
 expect(await id(other,'pulsar-plot-1').locator('..').locator('..').innerText()).toBe(before);
 await fresh.close();
});

// QA1 review 1 H4: after the native Save the student goes on measuring (the guide's delay step re-places the reference). Each of
// B (reference again), C (a new vertical) and D (then Record) must still save and restore: each field is checked alone.
test('QA1 review 1 H4: after Save recorded measurements, re-placing the reference, a new vertical and a Record still save',async({page,browser})=>{
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'kept');
 await saveAs(page,'run');await download(page,()=>id(page,'pulsar-native-ok').click());
 const saveInvestigation=async()=>{const next=page.waitForEvent('download',{timeout:15_000});await page.getByRole('button',{name:'Save investigation',exact:true}).click();
  const d=await next;expect(d.suggestedFilename()).toMatch(/\.json$/);return readFile((await d.path())!);};
 // B: the reference placed again with the right button.
 const plot=id(page,'pulsar-plot-1');await plot.scrollIntoViewIfNeeded();const box=(await plot.boundingBox())!;
 await page.mouse.move(Math.round(box.x+box.width*.3),Math.round(box.y+box.height*.3));await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});
 await expect(id(page,'pulsar-reference')).not.toHaveText('');
 await saveInvestigation();
 // C: a new vertical cursor on panel 1.
 await plot.focus();await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await saveInvestigation();
 // D: then Record.
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill('after save');await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
 const bytes=await saveInvestigation();
 const before=await plot.locator('..').locator('..').innerText();
 const fresh=await browser.newContext();const other=await fresh.newPage();
 await other.goto('/#pulsar-analysis');
 await other.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'openvireo-session.json',mimeType:'application/json',buffer:bytes});
 await expect(other.getByText('Investigation restored.',{exact:false})).toBeVisible({timeout:30_000});
 expect(await id(other,'pulsar-plot-1').locator('..').locator('..').innerText()).toBe(before);
 await fresh.close();
});
