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
