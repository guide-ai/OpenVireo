import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {CONTROL,HEADER,PLR,ROW_A,ROW_B} from './fixtures/pulsar-saved-rows-controls';
// Actual App flows of R-RX12 (docs/PULSAR-RESULTS-APPEND.md, AP-01..AP-33): appending the confirmed measurement list to a chosen
// saved-results file as a NEW download from the rendered #pulsar-analysis route. No harness and no product debug hook: the
// rendered App, browser history, hash routes, the browser clock control and test-only init scripts (a file-read hold, a File
// read-method counter and a URL.createObjectURL counter/failure switch). Targets are synthetic; the two golden targets are copied by hand from the independent
// pre-implementation files (their SHA-256 values below are those files' values, not computed from product code). Receiver
// recordings are model-generated captures, not observations. A browser download event is not proof that a file was saved.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const file=(name:string,text:string,mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(text,'latin1')});
const sha=(text:string|Buffer)=>createHash('sha256').update(typeof text==='string'?Buffer.from(text,'latin1'):text).digest('hex');
const settle=(page:Page)=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,100))));
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,act:()=>Promise<unknown>){const next=page.waitForEvent('download');await act();const d=await next;return {name:d.suggestedFilename(),bytes:await readFile((await d.path())!)};}
const hash=(page:Page,route:string)=>page.evaluate(r=>{location.hash=r;},route);

const urlProbe=(page:Page)=>page.addInitScript(()=>{
 const w=window as unknown as{__urls:number;__failUrl:boolean};w.__urls=0;w.__failUrl=false;
 const create=URL.createObjectURL.bind(URL);
 URL.createObjectURL=(o:Blob|MediaSource)=>{if(w.__failUrl)throw new Error('synthetic download failure');w.__urls++;return create(o);};
});
const urls=(page:Page)=>page.evaluate(()=>(window as unknown as{__urls:number}).__urls);
const failUrls=(page:Page,on:boolean)=>page.evaluate(v=>{(window as unknown as{__failUrl:boolean}).__failUrl=v;},on);
const holdReads=(page:Page)=>page.addInitScript(()=>{
 type Hold={release:()=>void};const w=window as unknown as{__held:Map<string,Hold>};w.__held=new Map();
 const read=Blob.prototype.arrayBuffer;
 Blob.prototype.arrayBuffer=function(this:Blob){
  if(!(this instanceof File&&this.name.startsWith('held-')))return read.call(this);
  const self=this,name=this.name;return new Promise<ArrayBuffer>((resolve,reject)=>w.__held.set(name,{release:()=>{read.call(self).then(resolve,reject);}}));
 };
});
/** Test-only counter of every Blob read method called on a File, by file name; the original method then runs unchanged. */
const readProbe=(page:Page)=>page.addInitScript(()=>{
 const w=window as unknown as{__reads:Record<string,number>};w.__reads={};
 const proto=Blob.prototype as unknown as Record<'arrayBuffer'|'text'|'stream',(this:Blob)=>unknown>;
 for(const method of ['arrayBuffer','text','stream'] as const){
  const original=proto[method];
  proto[method]=function(this:Blob){if(this instanceof File)w.__reads[this.name]=(w.__reads[this.name]??0)+1;return original.call(this);};
 }
});
const reads=(page:Page,name:string)=>page.evaluate(n=>(window as unknown as{__reads:Record<string,number>}).__reads[n]??0,name);
const held=(page:Page,name:string)=>expect.poll(()=>page.evaluate(n=>(window as unknown as{__held:Map<string,unknown>}).__held.has(n),name)).toBe(true);
const release=(page:Page,name:string)=>page.evaluate(n=>{const m=(window as unknown as{__held:Map<string,{release:()=>void}>}).__held,h=m.get(n)!;m.delete(n);h.release();},name);

// ----------------------------------------------------------------------------------------------- golden targets (hand-copied)
const LF_TARGET='"",""\n"Table Number:  1 "\n\n"  learner  "\n\n'+HEADER+'\n'+ROW_A+'\n'+ROW_B+'\n';
const LF_SHA='bb906de92e4b739ef13ceea1a3a4b1293f15eeb8cf785a7c32883d7c0c88aced';
const CRLF_TARGET=['"opaque date","opaque time"','"Table Number: "','','',HEADER,ROW_A,ROW_B].map(l=>l+'\r\n').join('');
const CRLF_SHA='7d761927fa53c501c2c7981c5eb359bab6c06d317a57d049b88191217d4c2a5b';

// ----------------------------------------------------------------------------------------------- PLR helpers
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
async function reviewCells(page:Page){
 await id(page,'pulsar-review').click();await expect(id(page,'pulsar-review-dialog')).toBeVisible();
 const rows=page.locator('[data-testid^="pulsar-entry-"]');const out:string[][]=[];
 for(let i=0;i<await rows.count();i++)out.push((await rows.nth(i).locator('td').allInnerTexts()).slice(3));
 await id(page,'pulsar-review-cancel').click();await expect(id(page,'pulsar-review-dialog')).toHaveCount(0);
 return out;
}
function rowOf(c:string[]){
 const [object,freq,gain,ref,vert,horiz,start,comment,points,interval,aperture,fileName]=c,q=(v:string)=>v==='—'?'""':v;
 return [`"${object}"`,freq,gain,q(ref),q(vert),q(horiz),start,`"${comment}"`,points,interval,aperture,...(fileName===''?[]:[`"${fileName}"`])].join(',');
}
const dialog=(page:Page)=>id(page,'pulsar-append-dialog');
const chooser=(page:Page)=>id(page,'pulsar-append-file');
async function openAppend(page:Page){await id(page,'pulsar-append').click();await expect(dialog(page)).toBeVisible();await expect(chooser(page)).toBeFocused();}
async function chooseTarget(page:Page,name:string,text:string){
 await chooser(page).setInputFiles(file(name,text,'text/csv'));
 await expect(id(page,'pulsar-append-target-name')).toHaveText(name);await expect(id(page,'pulsar-append-target-sha')).toHaveText(sha(text));
}
const REQUESTED=(source:string,old:number,added:number)=>`Download of pulsar-results-appended.csv requested: ${old} rows from ${source}, then ${added} recorded measurements (${old+added} rows). ${source} itself was not changed. Your browser decides whether and where the new file is saved. The list is still marked as not saved.`;
/** A change event delivered to an input without the chooser: a scripted selection, not a user path. */
const forceChange=(page:Page,testId:string,name:string,text:string)=>id(page,testId).evaluate((el:HTMLInputElement,[t,n])=>{
 const dt=new DataTransfer();if(n)dt.items.add(new File([t],n));el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));
},[text,name] as const);
const viewerFind=async(page:Page,query:string)=>{
 await id(page,'saved-rows-find').click();await id(page,'saved-rows-query').fill(query);await id(page,'saved-rows-from-top').click();await expect(id(page,'saved-rows-find-dialog')).toHaveCount(0);
};

test('AP-01/18/31/32/33: LF golden target prefix kept byte for byte, rows in its line ending; PLR, list, pending reading, Review, viewer, Find and storage unchanged; the result reopens in the viewer',async({page},info)=>{
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
 await loadPlr(page);await recordManual(page,'first, with comma');await recordManual(page,'second');
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 const cells=await reviewCells(page);expect(cells).toHaveLength(2);
 // The saved-row viewer holds its own file, selection and Find memory.
 await id(page,'saved-rows-disclosure').locator('summary').click();
 await id(page,'saved-rows-file').setInputFiles(file('control.csv',CONTROL));await id(page,'saved-rows-use').click();
 await expect(id(page,'saved-rows-identity-name')).toHaveText('control.csv');await viewerFind(page,'B1919');
 const viewerText=await id(page,'saved-rows-selected-text').textContent();expect(viewerText).toContain('B1919');
 const plot=await id(page,'pulsar-plot-1').evaluate(el=>el.outerHTML);
 const storage=()=>page.evaluate(()=>[Object.keys(localStorage).sort(),Object.keys(sessionStorage).sort()]);const stored=await storage();
 await openAppend(page);
 await expect(id(page,'pulsar-append-scope')).toContainText('2 recorded measurements are added');await expect(id(page,'pulsar-append-scope')).toContainText('model-generated');
 await expect(id(page,'pulsar-append-consequence')).toContainText('a new file named pulsar-results-appended.csv');
 await expect(id(page,'pulsar-append-no-target')).toBeVisible();await expect(id(page,'pulsar-append-download')).toBeDisabled();
 await expect(id(page,'pulsar-append-counts')).toHaveText('2 recorded measurements will be added.');
 await expect(page.locator('dialog:modal')).toHaveCount(1);
 // AP-29: the read completes without moving focus off the chooser.
 await chooseTarget(page,'lf-target.csv',LF_TARGET);await expect(chooser(page)).toBeFocused();
 await expect(id(page,'pulsar-append-target-bytes')).toHaveText('393');await expect(id(page,'pulsar-append-target-sha')).toHaveText(LF_SHA);
 await expect(id(page,'pulsar-append-target-newline')).toHaveText('LF');await expect(id(page,'pulsar-append-target-rows')).toHaveText('2');
 await expect(id(page,'pulsar-append-counts')).toHaveText('2 rows from the file, then 2 recorded measurements: 4 rows.');
 const got=await download(page,()=>id(page,'pulsar-append-download').click());
 expect(got.name).toBe('pulsar-results-appended.csv');
 expect(sha(got.bytes.subarray(0,393))).toBe(LF_SHA);
 expect(got.bytes.subarray(393).toString('latin1')).toBe(rowOf(cells[0])+'\n'+rowOf(cells[1])+'\n');
 expect(got.bytes.includes(0x0d)).toBe(false);
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-append')).toBeFocused();
 await expect(id(page,'pulsar-status')).toHaveText(REQUESTED('lf-target.csv',2,2));
 // AP-18/32: nothing else changed.
 await expect(id(page,'pulsar-count')).toHaveText('2 recorded measurements');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));expect(await id(page,'pulsar-plot-1').evaluate(el=>el.outerHTML)).toBe(plot);
 expect(await reviewCells(page)).toEqual(cells);
 expect((await download(page,()=>id(page,'pulsar-download').click())).bytes.equals(Buffer.from(PLR,'latin1'))).toBe(true);
 await id(page,'pulsar-clear').click();await expect(id(page,'pulsar-clear-dialog')).toContainText('have not saved all your recorded measurements');
 await page.keyboard.press('Escape');await expect(id(page,'pulsar-clear-dialog')).toHaveCount(0);
 expect(await storage()).toEqual(stored);
 await expect(id(page,'saved-rows-identity-name')).toHaveText('control.csv');await expect(id(page,'saved-rows-selected-text')).toHaveText(viewerText!);
 await id(page,'saved-rows-find').click();await expect(id(page,'saved-rows-query')).toHaveValue('b1919');await id(page,'saved-rows-find-cancel').click();
 // AP-31: the new file reopens in the strict viewer, old then new rows.
 await id(page,'saved-rows-file').setInputFiles({name:'pulsar-results-appended.csv',mimeType:'text/csv',buffer:got.bytes});await id(page,'saved-rows-use').click();
 await expect(id(page,'saved-rows-identity-sha')).toHaveText(sha(got.bytes));
 // Row test ids are zero-based ordinals: four rows are 0..3.
 await expect(id(page,'saved-rows-row-3')).toBeVisible();await expect(id(page,'saved-rows-row-4')).toHaveCount(0);
 await viewerFind(page,'second');await expect(id(page,'saved-rows-selected-text')).toHaveText(rowOf(cells[1]));
 await page.screenshot({path:info.outputPath('results-append-after.png'),fullPage:true});
});

test('AP-02/03/04: CRLF golden prefix and a CRLF control with duplicates and 11/12-column rows keep every old row and use CR LF',async({page})=>{
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 const cells=await reviewCells(page);
 await openAppend(page);await chooseTarget(page,'crlf-target.csv',CRLF_TARGET);
 await expect(id(page,'pulsar-append-target-newline')).toHaveText('CRLF');await expect(id(page,'pulsar-append-target-bytes')).toHaveText('405');
 const a=await download(page,()=>id(page,'pulsar-append-download').click());
 expect(sha(a.bytes.subarray(0,405))).toBe(CRLF_SHA);expect(a.bytes.subarray(405).toString('latin1')).toBe(rowOf(cells[0])+'\r\n');
 await openAppend(page);await chooseTarget(page,'control.csv',CONTROL);
 await expect(id(page,'pulsar-append-counts')).toHaveText('4 rows from the file, then 1 recorded measurements: 5 rows.');
 const b=await download(page,()=>id(page,'pulsar-append-download').click());
 expect(b.bytes.toString('latin1')).toBe(CONTROL+rowOf(cells[0])+'\r\n');
 await expect(id(page,'pulsar-status')).toHaveText(REQUESTED('control.csv',4,1));
});

test('AP-09..12/16/19/20: refused targets show their reason and never enable Download; a cancelled picker keeps the target; a failed replacement clears it',async({page})=>{
 await urlProbe(page);await readProbe(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 await openAppend(page);await chooseTarget(page,'good.csv',LF_TARGET);
 // AP-19: the picker's cancel and an empty selection change nothing. The browser fires the picker's cancel with bubbles:true and
 // cancelable:false (HTML show-picker); Playwright's dispatchEvent default would be cancelable and composed, which no picker sends.
 await chooser(page).dispatchEvent('cancel',{bubbles:true,cancelable:false,composed:false});await forceChange(page,'pulsar-append-file','','');await settle(page);
 await expect(dialog(page)).toBeVisible();await expect(id(page,'pulsar-append-target-name')).toHaveText('good.csv');await expect(id(page,'pulsar-append-download')).toBeEnabled();
 const bad:[string,string,string][]=[
  ['empty.csv','','empty'],['header.csv',LF_TARGET.replace('"Object"','"Objekt"'),'header'],['quote.csv',LF_TARGET.replace('"Table Number:  1 "','"Table Number:  1 ""'),'metadata-quote'],
  ['bare-cr.csv',LF_TARGET.replace('"",""\n','"",""\r'),'bare-cr'],['mixed.csv',LF_TARGET.replace('"",""\n','"",""\r\n'),'mixed-newlines'],['cut.csv',LF_TARGET.slice(0,-1),'unterminated'],
  ['scan.csv',LF_TARGET.slice(0,-10)+'\x0e'+LF_TARGET.slice(-9),'control'],['sub.csv',LF_TARGET.slice(0,-1)+'\x1a\n','control'],['tab.csv',LF_TARGET.replace('first, pulse','first,\tpulse'),'control'],
  ['recording.plr',PLR,'date-time'],['big.csv','x'.repeat(1_048_577),'too-large'],
 ];
 for(const [name,text,code] of bad){
  await chooser(page).setInputFiles(file(name,text,'text/csv'));
  await expect(id(page,'pulsar-append-rejection')).toHaveAttribute('data-code',code);await expect(id(page,'pulsar-append-rejection')).toContainText(`Not used as the results file: ${name}.`);
  // AP-20: the earlier target is gone, not silently kept.
  await expect(id(page,'pulsar-append-target')).toHaveCount(0);await expect(id(page,'pulsar-append-no-target')).toBeVisible();
  await expect(id(page,'pulsar-append-download')).toBeDisabled();
 }
 // AP-15: the oversize file is refused unread (no Blob read method is called on it); an ordinary refused file is read once.
 expect(await reads(page,'big.csv')).toBe(0);expect(await reads(page,'header.csv')).toBe(1);
 await id(page,'pulsar-append-download').dispatchEvent('click');await settle(page);expect(await urls(page)).toBe(0);
 await expect(dialog(page)).toBeVisible();await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 // A valid file again gives a target; the rejection is cleared.
 await chooseTarget(page,'good.csv',LF_TARGET);await expect(id(page,'pulsar-append-rejection')).toHaveCount(0);
});

test('AP-21/22/23/29: held reads are superseded, cancelled, closed or hidden; late results are ignored; Download stays disabled; focus is not stolen',async({page})=>{
 await holdReads(page);await urlProbe(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 await openAppend(page);await chooseTarget(page,'good.csv',LF_TARGET);
 // AP-22: a new selection clears the target synchronously and disables Download while it is read.
 await chooser(page).setInputFiles(file('held-1.csv',CRLF_TARGET,'text/csv'));await held(page,'held-1.csv');
 await expect(id(page,'pulsar-append-target')).toHaveCount(0);await expect(id(page,'pulsar-append-reading')).toContainText('Reading held-1.csv');
 await expect(id(page,'pulsar-append-download')).toBeDisabled();
 await id(page,'pulsar-append-download').evaluate((el:HTMLButtonElement)=>el.click());await id(page,'pulsar-append-download').dispatchEvent('click');
 await settle(page);expect(await urls(page)).toBe(0);
 // AP-21: a newer selection supersedes; the older result is ignored when it arrives.
 await chooser(page).setInputFiles(file('held-2.csv',LF_TARGET,'text/csv'));await held(page,'held-2.csv');
 await release(page,'held-1.csv');await settle(page);
 await expect(id(page,'pulsar-append-reading')).toContainText('Reading held-2.csv');await expect(id(page,'pulsar-append-target')).toHaveCount(0);
 // AP-29: focus on another control stays there when the read finishes.
 await id(page,'pulsar-append-cancel').focus();await release(page,'held-2.csv');
 await expect(id(page,'pulsar-append-target-name')).toHaveText('held-2.csv');await expect(id(page,'pulsar-append-cancel')).toBeFocused();
 // Cancel reading: the read is dropped and focus moves to the chooser.
 await chooser(page).setInputFiles(file('held-3.csv',LF_TARGET,'text/csv'));await held(page,'held-3.csv');
 await id(page,'pulsar-append-cancel-read').click();await expect(id(page,'pulsar-append-reading')).toHaveCount(0);await expect(chooser(page)).toBeFocused();
 // The notice is in the dialog's own status region, not in the main status that is inert behind the modal dialog.
 const notice=id(page,'pulsar-append-status');
 await expect(notice).toHaveAttribute('role','status');await expect(notice).toHaveText('Reading cancelled. No results file is chosen.');
 expect(await notice.evaluate(el=>el.closest('dialog')?.dataset.testid==='pulsar-append-dialog'&&el.closest('[inert]')===null)).toBe(true);
 await expect(id(page,'pulsar-status')).not.toContainText('Reading cancelled');
 await release(page,'held-3.csv');await settle(page);await expect(id(page,'pulsar-append-target')).toHaveCount(0);await expect(id(page,'pulsar-append-no-target')).toBeVisible();
 await expect(notice).toHaveText('Reading cancelled. No results file is chosen.');
 // Close: a reopened session never receives the earlier read.
 await chooser(page).setInputFiles(file('held-4.csv',LF_TARGET,'text/csv'));await held(page,'held-4.csv');
 await expect(notice).toHaveText('');
 await id(page,'pulsar-append-cancel').click();await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-append')).toBeFocused();
 await expect(id(page,'pulsar-status')).toHaveText('Append cancelled. Nothing was downloaded.');
 await openAppend(page);await expect(notice).toHaveText('');await release(page,'held-4.csv');await settle(page);
 await expect(id(page,'pulsar-append-target')).toHaveCount(0);await expect(id(page,'pulsar-append-reading')).toHaveCount(0);
 // AP-23: an owned target survives a hidden route; a read pending when the route is hidden is cancelled and its late result ignored.
 await chooseTarget(page,'kept.csv',LF_TARGET);
 await hash(page,'#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();await expect(page.locator('dialog:modal')).toHaveCount(0);
 await id(page,'pulsar-append-download').dispatchEvent('click');await settle(page);expect(await urls(page)).toBe(0);
 await hash(page,'#pulsar-analysis');await expect(dialog(page)).toBeVisible();await expect(chooser(page)).toBeFocused();
 await expect(id(page,'pulsar-append-target-name')).toHaveText('kept.csv');
 await chooser(page).setInputFiles(file('held-5.csv',LF_TARGET,'text/csv'));await held(page,'held-5.csv');
 await hash(page,'#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await release(page,'held-5.csv');await settle(page);
 await hash(page,'#pulsar-analysis');await expect(dialog(page)).toBeVisible();
 await expect(id(page,'pulsar-append-reading')).toHaveCount(0);await expect(id(page,'pulsar-append-target')).toHaveCount(0);
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');expect(await urls(page)).toBe(0);
});

test('AP-29: an accepted replacement while Download has focus keeps focus in the dialog',async({page})=>{
 await holdReads(page);await urlProbe(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 await openAppend(page);await chooseTarget(page,'good.csv',LF_TARGET);
 const downloadButton=id(page,'pulsar-append-download'),body=()=>page.evaluate(()=>document.activeElement===document.body);
 // A synthetic File change stands in for the drop/input path (a real OS drag is not tested).
 await downloadButton.focus();await expect(downloadButton).toBeFocused();
 await forceChange(page,'pulsar-append-file','held-f.csv',LF_TARGET);await held(page,'held-f.csv');
 await expect(chooser(page)).toBeFocused();expect(await body()).toBe(false);await expect(downloadButton).toBeDisabled();
 await release(page,'held-f.csv');await expect(id(page,'pulsar-append-target-name')).toHaveText('held-f.csv');await expect(chooser(page)).toBeFocused();
 // A synchronous oversize refusal, then the identical refusal again: focus stays in the dialog on the chooser.
 const big='x'.repeat(1_048_577);
 await downloadButton.focus();await expect(downloadButton).toBeFocused();
 await forceChange(page,'pulsar-append-file','big.csv',big);
 await expect(id(page,'pulsar-append-rejection')).toHaveAttribute('data-code','too-large');await expect(chooser(page)).toBeFocused();expect(await body()).toBe(false);
 await expect(downloadButton).toBeDisabled();
 await forceChange(page,'pulsar-append-file','big.csv',big);await settle(page);
 await expect(id(page,'pulsar-append-rejection')).toHaveAttribute('data-code','too-large');await expect(chooser(page)).toBeFocused();
 // Focus on another control is not moved by a selection.
 await id(page,'pulsar-append-cancel').focus();
 await forceChange(page,'pulsar-append-file','big.csv',big);await settle(page);
 await expect(id(page,'pulsar-append-rejection')).toHaveAttribute('data-code','too-large');await expect(id(page,'pulsar-append-cancel')).toBeFocused();
 await expect(dialog(page)).toBeVisible();expect(await urls(page)).toBe(0);
});

test('AP-25: a foreign modal blocks every append action; Append and Export exclude each other; nothing behind Append acts or loads',async({page})=>{
 await urlProbe(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 // Export open: Append cannot open.
 await id(page,'pulsar-export').click();await expect(id(page,'pulsar-export-dialog')).toBeVisible();await expect(id(page,'pulsar-append')).toBeDisabled();
 await id(page,'pulsar-append').dispatchEvent('click');await settle(page);await expect(dialog(page)).toHaveCount(0);
 await id(page,'pulsar-export-cancel').click();await expect(id(page,'pulsar-export-dialog')).toHaveCount(0);
 await openAppend(page);await chooseTarget(page,'kept.csv',LF_TARGET);await expect(id(page,'pulsar-export')).toBeDisabled();
 const zoom=await id(page,'pulsar-zoom').textContent(),vertical=await id(page,'pulsar-vertical-value-1').textContent();
 for(const target of ['pulsar-export','pulsar-record','pulsar-review','pulsar-clear','pulsar-properties-open','pulsar-reset','pulsar-zoom-in','pulsar-pan-right','pulsar-download','pulsar-append'])await id(page,target).dispatchEvent('click');
 await forceChange(page,'pulsar-file','other.plr',PLR.replace('SYNTHETIC E2E','OTHER'));await settle(page);
 for(const other of ['pulsar-export-dialog','pulsar-record-dialog','pulsar-review-dialog','pulsar-clear-dialog','pulsar-load-dialog','pulsar-properties','pulsar-reading'])await expect(id(page,other)).toHaveCount(0);
 await expect(id(page,'pulsar-zoom')).toHaveText(zoom!);await expect(id(page,'pulsar-vertical-value-1')).toHaveText(vertical!);
 await expect(id(page,'pulsar-status')).toHaveText('Nothing was loaded: finish or cancel the append dialog first.');
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));expect(await urls(page)).toBe(0);await expect(page.locator('dialog:modal')).toHaveCount(1);
 // A foreign native modal over the append dialog: scripted Download, target change, Cancel reading and Cancel do nothing.
 await page.evaluate(()=>{const d=document.createElement('dialog');d.dataset.testid='foreign-modal';const b=document.createElement('button');b.type='button';b.textContent='Foreign owner';b.dataset.testid='foreign-owner';d.append(b);document.body.append(d);d.showModal();b.focus();});
 await expect(id(page,'foreign-owner')).toBeFocused();
 await id(page,'pulsar-append-download').evaluate((el:HTMLButtonElement)=>el.click());
 await forceChange(page,'pulsar-append-file','replacement.csv',CRLF_TARGET);
 await id(page,'pulsar-append-cancel').evaluate((el:HTMLButtonElement)=>el.click());await settle(page);
 expect(await urls(page)).toBe(0);await expect(dialog(page)).toHaveCount(1);await expect(id(page,'foreign-owner')).toBeFocused();
 await expect(id(page,'pulsar-append-target-name')).toHaveText('kept.csv');await expect(id(page,'pulsar-append-reading')).toHaveCount(0);
 await page.evaluate(()=>{const d=document.querySelector<HTMLDialogElement>('[data-testid="foreign-modal"]')!;d.close();d.remove();});
 const got=await download(page,()=>id(page,'pulsar-append-download').click());
 expect(sha(got.bytes.subarray(0,393))).toBe(LF_SHA);expect(await urls(page)).toBe(1);
});

test('AP-26/27/28: reentry inside URL.createObjectURL gives one request; a browser error keeps the target for one retry; double click and held Enter request once',async({page})=>{
 await urlProbe(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 await openAppend(page);await chooseTarget(page,'a.csv',LF_TARGET);
 await page.evaluate(()=>{
  const w=window as unknown as{__reentered:boolean};w.__reentered=false;const inner=URL.createObjectURL.bind(URL);
  URL.createObjectURL=(o:Blob|MediaSource)=>{
   if(!w.__reentered){w.__reentered=true;for(const t of ['pulsar-append-download','pulsar-append-cancel','pulsar-export'])document.querySelector<HTMLButtonElement>(`[data-testid="${t}"]`)!.click();}
   return inner(o);
  };
 });
 const got=await download(page,()=>id(page,'pulsar-append-download').click());await settle(page);
 expect(await urls(page)).toBe(1);expect(got.name).toBe('pulsar-results-appended.csv');await expect(dialog(page)).toHaveCount(0);
 await expect(id(page,'pulsar-export-dialog')).toHaveCount(0);expect(await page.locator('a[download]').count()).toBe(0);
 await expect(id(page,'pulsar-status')).toHaveText(REQUESTED('a.csv',2,1));
 // AP-27: a synthetic browser error; the dialog, the target and the list stay; one retry works.
 await openAppend(page);await chooseTarget(page,'b.csv',CRLF_TARGET);
 await failUrls(page,true);await id(page,'pulsar-append-download').click();
 await expect(id(page,'pulsar-append-failure')).toHaveText('The download could not be started. The chosen file and the measurement list are unchanged; use Download to try again.');
 await expect(id(page,'pulsar-append-target-name')).toHaveText('b.csv');await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await failUrls(page,false);
 const retry=await download(page,()=>id(page,'pulsar-append-download').click());
 expect(sha(retry.bytes.subarray(0,405))).toBe(CRLF_SHA);expect(await urls(page)).toBe(2);
 // AP-28: two script clicks in one task give one artifact.
 await openAppend(page);await chooseTarget(page,'c.csv',LF_TARGET);
 const twice=page.waitForEvent('download');
 await page.evaluate(()=>{const b=document.querySelector<HTMLButtonElement>('[data-testid="pulsar-append-download"]')!;b.click();b.click();});
 await twice;await settle(page);expect(await urls(page)).toBe(3);await expect(dialog(page)).toHaveCount(0);
 // A held Enter requests once; its repeats neither request again nor reopen the dialog from the focused Append button.
 await openAppend(page);await chooseTarget(page,'d.csv',LF_TARGET);await id(page,'pulsar-append-download').focus();
 const once=page.waitForEvent('download');await page.keyboard.down('Enter');await once;
 await expect(id(page,'pulsar-append')).toBeFocused();
 for(let i=0;i<2;i++)await page.keyboard.down('Enter');
 await page.keyboard.up('Enter');await settle(page);
 expect(await urls(page)).toBe(4);await expect(dialog(page)).toHaveCount(0);
});

test('AP-29/30: Tab wraps, Escape closes one layer and returns focus; a long name and SHA stay usable at 1440, 390, 375 and 320 px',async({page},info)=>{
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 await openAppend(page);
 // Without a target Download is disabled and skipped.
 await page.keyboard.press('Tab');await expect(id(page,'pulsar-append-cancel')).toBeFocused();
 await page.keyboard.press('Tab');await expect(chooser(page)).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(id(page,'pulsar-append-cancel')).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-append')).toBeFocused();
 await expect(id(page,'pulsar-status')).toHaveText('Append cancelled. Nothing was downloaded.');
 const longName=`${'results-of-a-long-classroom-session-'.repeat(5)}final.csv`;
 await openAppend(page);await chooseTarget(page,longName,CRLF_TARGET);
 for(const name of ['pulsar-append-download','pulsar-append-cancel','pulsar-append-file']){await page.keyboard.press('Tab');await expect(id(page,name)).toBeFocused();}
 for(const [width,height] of [[1440,1050],[390,844],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await settle(page);await noOverflow(page);
  expect(await dialog(page).evaluate(el=>el.scrollWidth-el.clientWidth),`dialog at ${width}`).toBeLessThanOrEqual(0);
  for(const target of ['pulsar-append-download','pulsar-append-cancel','pulsar-append-file']){
   const el=id(page,target);await el.scrollIntoViewIfNeeded();await expect(el).toBeVisible();
   const box=await el.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
  }
  await info.attach(`results-append-${width}.png`,{body:await page.screenshot({path:info.outputPath(`results-append-${width}.png`)}),contentType:'image/png'});
 }
 const got=await download(page,()=>id(page,'pulsar-append-download').click());
 expect(got.name).toBe('pulsar-results-appended.csv');expect(got.name).not.toContain('classroom');
});

// ---------------------------------------------------------------- receiver capture lease (same synthetic catalog layout as tests/pulsar-results-export-app.spec.ts)
const COLUMNS={primaryName:[0,12],legacyName:[12,8],ra:[20,16],dec:[62,16],x2a:[208,22],x34:[240,16],x3e:[266,14],s48:[336,8],s4c:[350,14],s50:[410,10],s54:[430,8],s58:[438,8],s5c:[446,8]} as const;
type CatalogRow=Partial<Record<keyof typeof COLUMNS,string>>;
const BASE:Record<keyof typeof COLUMNS,string>={primaryName:'',legacyName:'',ra:'0',dec:'0',x2a:'0.5',x34:'1.0E-15',x3e:'50000.0',s48:'28.2',s4c:'30.0',s50:'12.5',s54:'14.0',s58:'9.0',s5c:'3.0'};
function catalogLine(row:CatalogRow):string{
 const chars=Array.from({length:454},()=>' ');
 for(const [name,[start,width]] of Object.entries(COLUMNS) as [keyof typeof COLUMNS,readonly [number,number]][]){
  const text=row[name]??BASE[name],cell=name==='primaryName'||name==='legacyName'?text.padEnd(width):text.padStart(width);
  for(let i=0;i<width;i++)chars[start+i]=cell[i];
 }
 return chars.join('');
}
const CATALOG=[{primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'}].map(catalogLine).join('\r\n')+'\r\n';
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
async function startReceiver(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();await expect(id(page,'pulsar-none')).toBeVisible();
 await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-receiver.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
 await id(page,'radio-clock-utc').fill('2026-10-24T12:00:00');await id(page,'radio-clock-apply').click();await id(page,'radio-clock-longitude').click();
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
}
const finish=(page:Page)=>id(page,'receiver-record-finish');

test('AP-24: Append is unavailable while a receiver capture holds the dataset (armed, then committed); after Save No it works, and a hidden append session makes Radio Record refuse',async({page})=>{
 await urlProbe(page);await startReceiver(page);
 await clickHeaderTool(page,'Radio data');await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await loadPlr(page);await recordManual(page,'held capture');
 const cells=await reviewCells(page);expect(cells).toHaveLength(1);
 const appendButton=id(page,'pulsar-append');await expect(appendButton).toBeEnabled();
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','erase');
 await id(page,'receiver-record-ok').click();await expect(id(page,'receiver-record-armed')).toBeVisible();
 await clickHeaderTool(page,'Radio data');await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-leased')).toHaveAttribute('data-phase','armed');
 await expect(appendButton).toBeDisabled();await appendButton.dispatchEvent('click');await flush(page);await expect(dialog(page)).toHaveCount(0);expect(await urls(page)).toBe(0);
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-record-capturing')).toBeVisible();
 await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(finish(page)).toHaveAttribute('data-stage','identify');
 await id(page,'receiver-record-identify-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','properties');
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await hash(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-leased')).toHaveAttribute('data-phase','committed');
 await expect(appendButton).toBeDisabled();await appendButton.dispatchEvent('click');await flush(page);await expect(dialog(page)).toHaveCount(0);expect(await urls(page)).toBe(0);
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await expect(finish(page)).toHaveAttribute('data-stage','save');await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-leased')).toHaveCount(0);await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');expect(await reviewCells(page)).toEqual(cells);
 await expect(appendButton).toBeEnabled();
 // A hidden append session with its target is the analysis's modal activity: Radio Record is refused and erases nothing.
 await openAppend(page);await chooseTarget(page,'kept.csv',LF_TARGET);
 await page.goBack();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);await expect(page.locator('dialog:modal')).toHaveCount(0);
 await id(page,'receiver-record').click();
 await expect(id(page,'receiver-status-0')).toHaveText('Record refused: Pulsar Analysis has an open dialog or a file being read. Finish it first; nothing was erased.');
 await page.goForward();await expect(dialog(page)).toBeVisible();await expect(id(page,'pulsar-append-target-name')).toHaveText('kept.csv');
 const got=await download(page,()=>id(page,'pulsar-append-download').click());
 expect(sha(got.bytes.subarray(0,393))).toBe(LF_SHA);expect(got.bytes.subarray(393).toString('latin1')).toBe(rowOf(cells[0])+'\n');expect(await urls(page)).toBe(1);
});
