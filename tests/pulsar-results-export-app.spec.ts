import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {HEADER,PLR} from './fixtures/pulsar-saved-rows-controls';
// Actual App flows of R-RX10 (docs/PULSAR-RESULTS-EXPORT.md): the fresh-format export of the confirmed measurement list from
// the rendered #pulsar-analysis route, an imported 12-column flow and a receiver memory capture → Identify → Properties → No →
// manual Record → 11-column flow, and an imported row held back by a receiver capture lease (armed, then committed). No harness and no product debug hook: the rendered App, browser history, hash routes, the
// browser clock control and test-only init scripts (a file-read hold and a URL.createObjectURL counter/failure switch).
// The PLR text and the catalog are synthetic; receiver recordings are model-generated captures, not observations. Expected
// strings are the chosen web contract, not native oracles; a browser download event is not proof that a file was saved.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const file=(name:string,text:string,mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(text,'latin1')});
const sha=(text:string)=>createHash('sha256').update(Buffer.from(text,'latin1')).digest('hex');
const settle=(page:Page)=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,100))));
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,act:()=>Promise<unknown>){const next=page.waitForEvent('download');await act();const d=await next;return {name:d.suggestedFilename(),bytes:await readFile((await d.path())!)};}
const hash=(page:Page,route:string)=>page.evaluate(r=>{location.hash=r;},route);
/** The test's own probe of the browser API (not the product's data-support): secure context, a callable
 *  showSaveFilePicker and FileSystemFileHandle.prototype.createWritable. No picker is called. */
const browserSaveCapable=(page:Page)=>page.evaluate(()=>window.isSecureContext===true&&typeof (window as {showSaveFilePicker?:unknown}).showSaveFilePicker==='function'
 &&typeof FileSystemFileHandle==='function'&&'createWritable' in FileSystemFileHandle.prototype);

/** Test-only: counts URL.createObjectURL calls and can make them throw (a synthetic browser download error). Product code is unchanged. */
const urlProbe=(page:Page)=>page.addInitScript(()=>{
 const w=window as unknown as{__urls:number;__failUrl:boolean};w.__urls=0;w.__failUrl=false;
 const create=URL.createObjectURL.bind(URL);
 URL.createObjectURL=(o:Blob|MediaSource)=>{if(w.__failUrl)throw new Error('synthetic download failure');w.__urls++;return create(o);};
});
const urls=(page:Page)=>page.evaluate(()=>(window as unknown as{__urls:number}).__urls);
const failUrls=(page:Page,on:boolean)=>page.evaluate(v=>{(window as unknown as{__failUrl:boolean}).__failUrl=v;},on);
/** Test-only hold: arrayBuffer() of a File named held-* waits until release(name). Product code is unchanged. */
const holdReads=(page:Page)=>page.addInitScript(()=>{
 type Hold={release:()=>void};const w=window as unknown as{__held:Map<string,Hold>};w.__held=new Map();
 const read=Blob.prototype.arrayBuffer;
 Blob.prototype.arrayBuffer=function(this:Blob){
  if(!(this instanceof File&&this.name.startsWith('held-')))return read.call(this);
  const self=this,name=this.name;return new Promise<ArrayBuffer>((resolve,reject)=>w.__held.set(name,{release:()=>{read.call(self).then(resolve,reject);}}));
 };
});
const held=(page:Page,name:string)=>expect.poll(()=>page.evaluate(n=>(window as unknown as{__held:Map<string,unknown>}).__held.has(n),name)).toBe(true);

// ----------------------------------------------------------------------------------------------- PLR helpers
async function loadPlr(page:Page){
 await id(page,'pulsar-file').setInputFiles(file('synthetic-e2e.plr',PLR,'application/octet-stream'));
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));await id(page,'pulsar-properties-close').click();
}
/** One manual measurement through the existing keyboard cursor access and the Record dialog. */
async function recordManual(page:Page,comment:string){
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
}
/** Review cells (object … file) of every confirmed row, read from the rendered Review dialog, which is then cancelled. */
async function reviewCells(page:Page){
 await id(page,'pulsar-review').click();await expect(id(page,'pulsar-review-dialog')).toBeVisible();
 const rows=page.locator('[data-testid^="pulsar-entry-"]');const out:string[][]=[];
 for(let i=0;i<await rows.count();i++)out.push((await rows.nth(i).locator('td').allInnerTexts()).slice(3));
 await id(page,'pulsar-review-cancel').click();await expect(id(page,'pulsar-review-dialog')).toHaveCount(0);
 return out;
}
/** The row a confirmed measurement must export as, built from its Review cells ('—' is a blank reading, written '""'). */
function rowOf(c:string[]){
 const [object,freq,gain,ref,vert,horiz,start,comment,points,interval,aperture,fileName]=c,q=(v:string)=>v==='—'?'""':v;
 return [`"${object}"`,freq,gain,q(ref),q(vert),q(horiz),start,`"${comment}"`,points,interval,aperture,...(fileName===''?[]:[`"${fileName}"`])].join(',');
}
const dialog=(page:Page)=>id(page,'pulsar-export-dialog');
const field=(page:Page,name:string)=>id(page,`pulsar-export-${name}`);
async function openExport(page:Page){await id(page,'pulsar-export').click();await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toBeFocused();}
async function fillExport(page:Page,values:Partial<Record<'date'|'time'|'table'|'name1'|'name2'|'name3'|'name4',string>>){for(const [k,v] of Object.entries(values))await field(page,k).fill(v!);}
const REQUESTED=(n:number)=>`Download of pulsar-results.csv requested with ${n} recorded measurements. Your browser decides whether and where it is saved. The list is still marked as not saved, and nothing else changed.`;
/** A change event delivered to the file input without the chooser: a scripted selection, not a user path. */
const forceChange=(page:Page,name:string,text:string)=>id(page,'pulsar-file').evaluate((el:HTMLInputElement,[t,n])=>{
 const dt=new DataTransfer();dt.items.add(new File([t],n));el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));
},[text,name] as const);

test('RX10-13/14/15/23/25/26/27: imported 12-column rows export exactly with typed metadata; pending readings, list, saved state and original bytes stay; the saved-row viewer reads the file',async({page},info)=>{
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
 await loadPlr(page);await recordManual(page,'first, with comma');await recordManual(page,'second');
 // A reading left unrecorded: it is not exported and stays pending.
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 const cells=await reviewCells(page);expect(cells).toHaveLength(2);
 const plot=await id(page,'pulsar-plot-1').evaluate(el=>el.outerHTML),panels=await page.locator('.plr-panels').innerText();
 const storage=()=>page.evaluate(()=>[Object.keys(localStorage).sort(),Object.keys(sessionStorage).sort()]);const stored=await storage();
 await expect(id(page,'pulsar-save')).toBeDisabled();
 await expect(id(page,'pulsar-save')).toHaveAccessibleDescription(/regional format.*not known for this site.*not implemented here/);
 // Opens on the first (empty) field; nothing is filled in; Tab wraps inside the dialog.
 await openExport(page);
 for(const name of ['date','time','table','name1','name2','name3','name4'])await expect(field(page,name)).toHaveValue('');
 await expect(id(page,'pulsar-export-scope')).toContainText('2 recorded measurements are exported');await expect(id(page,'pulsar-export-scope')).toContainText('model-generated');
 await expect(id(page,'pulsar-export-consequence')).toContainText('nothing is taken from this computer');
 await expect(page.locator('dialog:modal')).toHaveCount(1);
 for(const name of ['pulsar-export-time','pulsar-export-table','pulsar-export-name1','pulsar-export-name2','pulsar-export-name3','pulsar-export-name4','pulsar-export-download','pulsar-export-cancel','pulsar-export-date']){
  await page.keyboard.press('Tab');await expect(id(page,name)).toBeFocused();
 }
 await page.keyboard.press('Shift+Tab');await expect(id(page,'pulsar-export-cancel')).toBeFocused();
 await fillExport(page,{date:'25/10/2026',time:'16:00:00',table:'7',name1:'Observer A',name3:' Observer C '});
 await field(page,'table').focus();
 const got=await download(page,()=>page.keyboard.press('Enter'));
 expect(got.name).toBe('pulsar-results.csv');
 const text=got.bytes.toString('latin1');
 expect(text.endsWith('\r\n')).toBe(true);expect(text.split('\r\n').every(l=>!l.includes('\n')&&!l.includes('\r'))).toBe(true);
 expect(text.split('\r\n')).toEqual(['"25/10/2026","16:00:00"','"Table Number: 7"','','"Observer A"','" Observer C "','',HEADER,rowOf(cells[0]),rowOf(cells[1]),'']);
 expect(rowOf(cells[0])).toContain('"first, with comma"');expect(rowOf(cells[0]).endsWith(',"synthetic-e2e.plr"')).toBe(true);expect(rowOf(cells[1]).endsWith(',"synthetic-e2e.plr"')).toBe(true);
 // Nothing else changed; the request is not reported as a save.
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-export')).toBeFocused();
 await expect(id(page,'pulsar-status')).toHaveText(REQUESTED(2));
 await expect(id(page,'pulsar-count')).toHaveText('2 recorded measurements');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 expect(await id(page,'pulsar-plot-1').evaluate(el=>el.outerHTML)).toBe(plot);expect(await page.locator('.plr-panels').innerText()).toBe(panels);
 expect(await reviewCells(page)).toEqual(cells);
 expect((await download(page,()=>id(page,'pulsar-download').click())).bytes.equals(Buffer.from(PLR,'latin1'))).toBe(true);
 await expect(id(page,'pulsar-save')).toBeDisabled();
 await id(page,'pulsar-clear').click();await expect(id(page,'pulsar-clear-dialog')).toContainText('have not been saved');
 await page.keyboard.press('Escape');await expect(id(page,'pulsar-clear-dialog')).toHaveCount(0);
 expect(await storage()).toEqual(stored);
 // RX10-14: the downloaded file opens in the saved-row viewer in the same order; Find reaches the second row.
 await id(page,'saved-rows-disclosure').locator('summary').click();
 await id(page,'saved-rows-file').setInputFiles({name:'pulsar-results.csv',mimeType:'text/csv',buffer:got.bytes});
 await expect(id(page,'saved-rows-candidate')).toBeVisible();await id(page,'saved-rows-use').click();
 await expect(id(page,'saved-rows-identity-name')).toHaveText('pulsar-results.csv');await expect(id(page,'saved-rows-identity-sha')).toHaveText(createHash('sha256').update(got.bytes).digest('hex'));
 await expect(id(page,'saved-rows-row-1')).toBeVisible();await expect(id(page,'saved-rows-row-2')).toHaveCount(0);
 await expect(id(page,'saved-rows-selected-text')).toHaveText(rowOf(cells[0]));
 await id(page,'saved-rows-find').click();await id(page,'saved-rows-query').fill('second');await id(page,'saved-rows-from-top').click();
 await expect(id(page,'saved-rows-selected-text')).toHaveText(rowOf(cells[1]));
 // RX10-26: Save investigation carries none of the typed metadata; a reload starts empty.
 const investigation=(await download(page,()=>page.getByRole('button',{name:'Save investigation',exact:true}).click())).bytes.toString('utf8');
 for(const typed of ['25/10/2026','16:00:00','Observer A','Observer C','pulsar-results'])expect(investigation).not.toContain(typed);
 await page.screenshot({path:info.outputPath('results-export-after.png'),fullPage:true});
 await page.reload();await expect(id(page,'pulsar-none')).toBeVisible();await expect(id(page,'pulsar-export')).toHaveCount(0);await expect(dialog(page)).toHaveCount(0);
});

test('RX10-17/18/19/22: Escape and Cancel, invalid drafts, the oversize latch, repeated requests and a browser download error',async({page})=>{
 await urlProbe(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 // Escape and Cancel close one layer, return focus to Export and download nothing.
 await openExport(page);await field(page,'date').fill('draft');await page.keyboard.press('Escape');
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-export')).toBeFocused();await expect(id(page,'pulsar-status')).toHaveText('Export cancelled. Nothing was downloaded.');
 await openExport(page);await expect(field(page,'date')).toHaveValue('');await id(page,'pulsar-export-cancel').click();
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-export')).toBeFocused();expect(await urls(page)).toBe(0);
 // Invalid drafts stay visible and editable with their reasons; nothing is downloaded.
 await openExport(page);await id(page,'pulsar-export-download').click();
 await expect(id(page,'pulsar-export-alert')).toHaveAttribute('data-code','metadata');
 for(const name of ['date','time']){await expect(field(page,name)).toHaveAttribute('aria-invalid','true');await expect(id(page,`pulsar-export-problem-${name}`)).toHaveText('Required: type the text to write.');}
 await fillExport(page,{date:'a"b',time:'x\ty',table:'12345',name2:'N'.repeat(41),name4:'é'});
 await expect(id(page,'pulsar-export-problem-date')).toHaveText('Character 2 is a double quote, which this file cannot hold.');
 await expect(id(page,'pulsar-export-problem-time')).toContainText('Character 2 is not printable ASCII');
 await expect(id(page,'pulsar-export-problem-table')).toHaveText('5 characters: at most 4 fit. Nothing is cut, so shorten it.');
 await expect(id(page,'pulsar-export-problem-name2')).toHaveText('41 characters: at most 40 fit. Nothing is cut, so shorten it.');
 await expect(id(page,'pulsar-export-problem-name4')).toContainText('Character 1 is not printable ASCII');
 for(const name of ['date','time','table','name2','name4'])await expect(field(page,name)).toHaveAttribute('aria-invalid','true');
 await expect(field(page,'name1')).toHaveAttribute('aria-invalid','false');
 await id(page,'pulsar-export-download').click();await expect(id(page,'pulsar-export-alert')).toHaveAttribute('data-code','metadata');
 await expect(field(page,'date')).toHaveValue('a"b');await expect(field(page,'name2')).toHaveValue('N'.repeat(41));expect(await urls(page)).toBe(0);
 // Oversize latch: valid date, an over-long replacement is not taken, another field's edit does not clear it, and the old date is not downloaded.
 await fillExport(page,{date:'valid date',time:'t',table:'',name2:'',name4:''});await expect(id(page,'pulsar-export-alert')).toHaveCount(0);
 await field(page,'date').fill('x'.repeat(300));
 await expect(field(page,'date')).toHaveValue('valid date');await expect(field(page,'date')).toHaveAttribute('aria-invalid','true');
 await expect(id(page,'pulsar-export-problem-date')).toHaveText('Not taken: that edit had 300 characters, more than the 256 this field accepts. The previous text is kept. Edit this field again before downloading.');
 await field(page,'time').fill('later');await expect(id(page,'pulsar-export-problem-date')).toBeVisible();
 await id(page,'pulsar-export-download').click();await expect(id(page,'pulsar-export-alert')).toHaveAttribute('data-code','oversize');
 await settle(page);expect(await urls(page)).toBe(0);await expect(dialog(page)).toBeVisible();
 await field(page,'date').fill('new date');await expect(id(page,'pulsar-export-problem-date')).toHaveCount(0);await expect(id(page,'pulsar-export-alert')).toHaveCount(0);
 // RX10-22: a synthetic browser error keeps the dialog, the draft and every result; a new Download works.
 await failUrls(page,true);await id(page,'pulsar-export-download').click();
 await expect(id(page,'pulsar-export-failure')).toHaveText('The download could not be started. Your text and the measurement list are unchanged; use Download to try again.');
 await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toHaveValue('new date');await expect(field(page,'time')).toHaveValue('later');
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 await failUrls(page,false);
 const first=await download(page,()=>id(page,'pulsar-export-download').click());
 expect(first.bytes.toString('latin1').startsWith('"new date","later"\r\n"Table Number: "\r\n\r\n\r\n')).toBe(true);expect(await urls(page)).toBe(1);
 // RX10-19: two script clicks in one task give one artifact.
 await openExport(page);await fillExport(page,{date:'d',time:'t'});
 const twice=page.waitForEvent('download');
 await page.evaluate(()=>{const b=document.querySelector<HTMLButtonElement>('[data-testid="pulsar-export-download"]')!;b.click();b.click();});
 await twice;await settle(page);expect(await urls(page)).toBe(2);await expect(dialog(page)).toHaveCount(0);
 // A held Enter requests once; its repeats neither request again nor reopen the dialog from the focused Export button.
 await openExport(page);await fillExport(page,{date:'d',time:'t'});await field(page,'time').focus();
 const once=page.waitForEvent('download');await page.keyboard.down('Enter');await once;
 await expect(id(page,'pulsar-export')).toBeFocused();
 for(let i=0;i<2;i++)await page.keyboard.down('Enter');
 await page.keyboard.up('Enter');await settle(page);
 expect(await urls(page)).toBe(3);await expect(dialog(page)).toHaveCount(0);
 // A fresh repeat after reopening is allowed and starts empty.
 await openExport(page);await expect(field(page,'date')).toHaveValue('');await fillExport(page,{date:'again',time:'t'});
 await download(page,()=>id(page,'pulsar-export-download').click());expect(await urls(page)).toBe(4);
 await expect(id(page,'pulsar-status')).toHaveText(REQUESTED(1));
});

test('RX10-16/20/21/24: Export waits for Record, Review, Clear and reads; while open nothing behind it acts or loads; hidden route keeps the draft; narrow viewports',async({page},info)=>{
 await holdReads(page);await urlProbe(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'kept');
 const exportButton=id(page,'pulsar-export');await expect(exportButton).toBeEnabled();
 // Disabled while another dialog or a read is pending; a script click then opens nothing.
 await id(page,'pulsar-review').click();await expect(exportButton).toBeDisabled();await exportButton.dispatchEvent('click');await expect(dialog(page)).toHaveCount(0);
 await id(page,'pulsar-review-cancel').click();
 await id(page,'pulsar-clear').click();await expect(exportButton).toBeDisabled();await page.keyboard.press('Escape');await expect(id(page,'pulsar-clear-dialog')).toHaveCount(0);
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await id(page,'pulsar-record').click();
 await expect(id(page,'pulsar-record-dialog')).toBeVisible();await expect(exportButton).toBeDisabled();await id(page,'pulsar-record-cancel').click();
 await id(page,'pulsar-file').setInputFiles(file('held-read.plr',PLR,'application/octet-stream'));await held(page,'held-read.plr');
 await expect(exportButton).toBeDisabled();await exportButton.dispatchEvent('click');await expect(dialog(page)).toHaveCount(0);
 await id(page,'pulsar-cancel-read').click();await expect(exportButton).toBeEnabled();
 // With the dialog open, script clicks behind it change nothing and a delivered file is refused unread.
 const zoom=await id(page,'pulsar-zoom').textContent(),start=await id(page,'pulsar-window-start').textContent(),vertical=await id(page,'pulsar-vertical-value-1').textContent();
 await openExport(page);await field(page,'date').fill('kept draft');
 for(const target of ['pulsar-record','pulsar-review','pulsar-clear','pulsar-properties-open','pulsar-reset','pulsar-zoom-in','pulsar-pan-right','pulsar-download','pulsar-export'])await id(page,target).dispatchEvent('click');
 await forceChange(page,'other.plr',PLR.replace('SYNTHETIC E2E','OTHER'));await settle(page);
 for(const other of ['pulsar-record-dialog','pulsar-review-dialog','pulsar-clear-dialog','pulsar-load-dialog','pulsar-properties','pulsar-reading'])await expect(id(page,other)).toHaveCount(0);
 await expect(id(page,'pulsar-zoom')).toHaveText(zoom!);await expect(id(page,'pulsar-window-start')).toHaveText(start!);await expect(id(page,'pulsar-vertical-value-1')).toHaveText(vertical!);
 await expect(id(page,'pulsar-status')).toHaveText('Nothing was loaded: finish or cancel the export dialog first.');
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 expect(await urls(page)).toBe(0);await expect(page.locator('dialog:modal')).toHaveCount(1);await expect(field(page,'date')).toHaveValue('kept draft');
 // RX10-20: another route closes the dialog and keeps the draft; a script Download while hidden does nothing; return restores focus.
 await hash(page,'#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();await expect(page.locator('dialog:modal')).toHaveCount(0);
 await expect(dialog(page)).toHaveCount(1);await expect(dialog(page)).not.toBeVisible();// the session stays mounted, closed, while hidden
 await id(page,'pulsar-export-download').dispatchEvent('click');await settle(page);expect(await urls(page)).toBe(0);
 await hash(page,'#pulsar-analysis');await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toHaveValue('kept draft');await expect(field(page,'date')).toBeFocused();
 await expect(id(page,'pulsar-export-alert')).toHaveCount(0);
 // RX10-24: 64-character texts and 40-character names stay inside the page and the dialog; Download and Cancel stay reachable.
 await fillExport(page,{date:'D'.repeat(64),time:'T'.repeat(64),table:'TTTT',name1:'A'.repeat(40),name2:'B'.repeat(40),name3:'C'.repeat(40),name4:'E'.repeat(40)});
 for(const [width,height] of [[1440,1050],[390,844],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await settle(page);await noOverflow(page);
  expect(await dialog(page).evaluate(el=>el.scrollWidth-el.clientWidth),`dialog at ${width}`).toBeLessThanOrEqual(0);
  for(const target of ['pulsar-export-download','pulsar-export-cancel']){
   const button=id(page,target);await button.scrollIntoViewIfNeeded();await expect(button).toBeVisible();
   const box=await button.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
  }
  await info.attach(`results-export-${width}.png`,{body:await page.screenshot({path:info.outputPath(`results-export-${width}.png`)}),contentType:'image/png'});
 }
 const got=await download(page,()=>id(page,'pulsar-export-download').click());
 expect(got.bytes.toString('latin1').split('\r\n').slice(0,8)).toEqual([`"${'D'.repeat(64)}","${'T'.repeat(64)}"`,'"Table Number: TTTT"','',`"${'A'.repeat(40)}"`,`"${'B'.repeat(40)}"`,`"${'C'.repeat(40)}"`,`"${'E'.repeat(40)}"`,'']);
});

test('RX10 modal ownership: while a foreign native modal owns focus, scripted stale Download, edit and Cancel do nothing; after it closes one Download works',async({page})=>{
 await urlProbe(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 await openExport(page);await fillExport(page,{date:'kept date',time:'kept time'});
 // A host-style dialog opened over the export dialog, with focus on its own button.
 await page.evaluate(()=>{const d=document.createElement('dialog');d.dataset.testid='foreign-modal';const b=document.createElement('button');b.type='button';b.textContent='Foreign owner';b.dataset.testid='foreign-owner';d.append(b);document.body.append(d);d.showModal();b.focus();});
 await expect(page.locator('dialog:modal')).toHaveCount(2);await expect(id(page,'foreign-owner')).toBeFocused();
 // Scripted stale-action triggers (handlers forced from script, not ordinary clicks or typing).
 await id(page,'pulsar-export-download').evaluate((el:HTMLButtonElement)=>el.click());
 await field(page,'date').evaluate((el:HTMLInputElement)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,'forced edit');el.dispatchEvent(new Event('input',{bubbles:true}));});
 await id(page,'pulsar-export-cancel').evaluate((el:HTMLButtonElement)=>el.click());
 await settle(page);
 expect(await urls(page)).toBe(0);
 await expect(dialog(page)).toHaveCount(1);await expect(page.locator('dialog:modal')).toHaveCount(2);await expect(id(page,'foreign-owner')).toBeFocused();
 await expect(field(page,'date')).toHaveValue('kept date');await expect(field(page,'time')).toHaveValue('kept time');
 await expect(id(page,'pulsar-export-alert')).toHaveCount(0);await expect(id(page,'pulsar-export-failure')).toHaveCount(0);
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 // Positive control: with the foreign modal closed, the kept draft gives one download request.
 await page.evaluate(()=>{const d=document.querySelector<HTMLDialogElement>('[data-testid="foreign-modal"]')!;d.close();d.remove();});
 await expect(page.locator('dialog:modal')).toHaveCount(1);
 const got=await download(page,()=>id(page,'pulsar-export-download').click());
 expect(got.bytes.toString('latin1').startsWith('"kept date","kept time"\r\n')).toBe(true);expect(await urls(page)).toBe(1);
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-status')).toHaveText(REQUESTED(1));
});

test('RX10 synthetic reentry: Download, then Cancel, reentered synchronously inside URL.createObjectURL give one URL request; a browser error releases the claim for one retry',async({page})=>{
 await urlProbe(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'one');
 await openExport(page);await fillExport(page,{date:'d',time:'t'});
 // Test-only wrapper over the probe: its first call clicks Download and Cancel once from inside, then delegates. No recursion.
 await page.evaluate(()=>{
  const w=window as unknown as{__reentered:boolean};w.__reentered=false;const inner=URL.createObjectURL.bind(URL);
  URL.createObjectURL=(o:Blob|MediaSource)=>{
   if(!w.__reentered){w.__reentered=true;for(const t of ['pulsar-export-download','pulsar-export-cancel'])document.querySelector<HTMLButtonElement>(`[data-testid="${t}"]`)!.click();}
   return inner(o);
  };
 });
 const got=await download(page,()=>id(page,'pulsar-export-download').click());
 await settle(page);
 expect(await urls(page)).toBe(1);expect(got.name).toBe('pulsar-results.csv');expect(got.bytes.toString('latin1').startsWith('"d","t"\r\n')).toBe(true);
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-status')).toHaveText(REQUESTED(1));
 expect(await page.locator('a[download="pulsar-results.csv"]').count()).toBe(0);
 // A browser error inside the same boundary, with a reentered Download: the failure is shown, the draft kept, and the claim released.
 await openExport(page);await fillExport(page,{date:'retry date',time:'t'});
 await page.evaluate(()=>{
  const w=window as unknown as{__thrown:boolean};w.__thrown=false;const inner=URL.createObjectURL.bind(URL);
  URL.createObjectURL=(o:Blob|MediaSource)=>{
   if(!w.__thrown){w.__thrown=true;document.querySelector<HTMLButtonElement>('[data-testid="pulsar-export-download"]')!.click();throw new Error('synthetic download failure');}
   return inner(o);
  };
 });
 await id(page,'pulsar-export-download').click();
 await expect(id(page,'pulsar-export-failure')).toBeVisible();await settle(page);expect(await urls(page)).toBe(1);
 await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toHaveValue('retry date');await expect(field(page,'time')).toHaveValue('t');
 expect(await page.locator('a[download="pulsar-results.csv"]').count()).toBe(0);
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 const retry=await download(page,()=>id(page,'pulsar-export-download').click());
 expect(retry.bytes.toString('latin1').startsWith('"retry date","t"\r\n')).toBe(true);expect(await urls(page)).toBe(2);
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-status')).toHaveText(REQUESTED(1));
});

// ---------------------------------------------------------------- receiver memory capture (same synthetic catalog layout as tests/radio-receiver-record-app.spec.ts)
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

test('RX10 receiver flow: memory capture → Identify → Properties → No → manual Record exports an 11-column row; an open export makes Radio Record refuse; the finish Save Yes follows browser capability (not pressed); Load Yes follows browser capability (not pressed)',async({page})=>{
 await startReceiver(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-record-capturing')).toBeVisible();
 await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(finish(page)).toHaveAttribute('data-stage','identify');
 await id(page,'receiver-record-identify-input').fill('PSR B2358+38');await id(page,'receiver-record-identify-ok').click();
 await expect(finish(page)).toHaveAttribute('data-stage','properties');await id(page,'receiver-record-properties-ok').click();
 await expect(finish(page)).toHaveAttribute('data-stage','save');
 // R-RX17 WEB-RX17-01: the finish Save Yes follows the browser's capability, read by this test's own probe (a secure context, a
 // callable showSaveFilePicker and the real stream API), independent of the product's data-support. Never pressed here.
 const saveCapable=await page.evaluate(()=>window.isSecureContext&&typeof (window as unknown as {showSaveFilePicker?:unknown}).showSaveFilePicker==='function'
  &&typeof FileSystemFileHandle==='function'&&typeof (FileSystemFileHandle.prototype as unknown as {createWritable?:unknown}).createWritable==='function');
 const saveYes=id(page,'receiver-record-save-yes'),saveYesReason=id(page,'receiver-record-save-yes-reason');
 if(saveCapable){await expect(saveYes).toBeEnabled();await expect(saveYesReason).toHaveAttribute('data-support','ok');}
 else{await expect(saveYes).toBeDisabled();await expect(saveYesReason).toHaveAttribute('data-support',/^(insecure-context|no-api)$/);}
 await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-memory-origin')).toContainText('not an observation');const points=await id(page,'pulsar-memory-rows').textContent();
 await id(page,'pulsar-properties-close').click();
 await recordManual(page,'memory, kept');
 const cells=await reviewCells(page);expect(cells).toHaveLength(1);expect(cells[0][11]).toBe('');
 await openExport(page);await expect(id(page,'pulsar-export-scope')).toContainText('model-generated receiver recordings');
 await fillExport(page,{date:'session date',time:'session time',name2:'Lab pair'});
 const got=await download(page,()=>page.keyboard.press('Enter'));
 expect(got.name).toBe('pulsar-results.csv');
 const lines=got.bytes.toString('latin1').split('\r\n');
 expect(lines).toEqual(['"session date","session time"','"Table Number: "','','"Lab pair"','',HEADER,rowOf(cells[0]),'']);
 expect(lines[6].startsWith('"PSR B2358+38",')).toBe(true);expect(lines[6].endsWith(',"memory, kept",'+cells[0].slice(8,11).join(','))).toBe(true);// no file column
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points!);await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // A hidden export session is the analysis's modal activity: Radio Record is refused and erases nothing.
 await openExport(page);await field(page,'date').fill('waiting draft');
 await page.goBack();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);await expect(page.locator('dialog:modal')).toHaveCount(0);
 await id(page,'receiver-record').click();
 await expect(id(page,'receiver-status-0')).toHaveText('Record refused: Pulsar Analysis has an open dialog or a file being read. Finish it first; nothing was erased.');
 await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await page.goForward();await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toHaveValue('waiting draft');
 await id(page,'pulsar-export-cancel').click();await expect(dialog(page)).toHaveCount(0);
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points!);await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // RX10-27: the analysis Load prompt for unsaved memory data. Since R-RX18 its Yes (verified Save first) follows the test's own
 // capability probe; it is not pressed here, and Escape still cancels and keeps the data and the list.
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 if(await browserSaveCapable(page))await expect(id(page,'pulsar-load-yes')).toBeEnabled();else await expect(id(page,'pulsar-load-yes')).toBeDisabled();
 await page.keyboard.press('Escape');await expect(id(page,'pulsar-load-dialog')).toHaveCount(0);await expect(id(page,'pulsar-memory-rows')).toHaveText(points!);
});

test('RX10 capture lease: an imported confirmed row cannot be exported while a receiver capture holds the dataset (armed, then committed at the Save question); after Save No releases it the same list exports',async({page})=>{
 await urlProbe(page);await startReceiver(page);
 // An imported 12-column confirmed row, recorded before arming. The clock stays paused, so only MessageChannel flushes are used.
 await clickHeaderTool(page,'Radio data');await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await loadPlr(page);await recordManual(page,'held capture');
 const cells=await reviewCells(page);expect(cells).toHaveLength(1);expect(cells[0][11]).toBe('synthetic-e2e.plr');
 const exportButton=id(page,'pulsar-export');await expect(exportButton).toBeEnabled();
 // Arming through the real receiver UI: the imported file asks only the erase question; OK takes the capture lease (armed).
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','erase');
 await id(page,'receiver-record-ok').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');await expect(id(page,'receiver-record-armed')).toBeVisible();
 // Armed lease: the confirmed list is retained, Export is disabled, and a stale script click opens no session and builds no artifact.
 await clickHeaderTool(page,'Radio data');await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-leased')).toHaveAttribute('data-phase','armed');await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await expect(exportButton).toBeDisabled();await exportButton.dispatchEvent('click');await flush(page);
 await expect(dialog(page)).toHaveCount(0);expect(await urls(page)).toBe(0);
 // Receive → Stop → Identify → Properties → the Save question; the committed lease is still held.
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-record-capturing')).toBeVisible();
 await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(finish(page)).toHaveAttribute('data-stage','identify');
 await id(page,'receiver-record-identify-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','properties');
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 // The radio route is left by its hash (its finish dialog keeps the header inert); the refusal repeats under the committed lease.
 await hash(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-leased')).toHaveAttribute('data-phase','committed');await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await expect(exportButton).toBeDisabled();await exportButton.dispatchEvent('click');await flush(page);
 await expect(dialog(page)).toHaveCount(0);expect(await urls(page)).toBe(0);
 // Genuine release by the existing Save No: the analysis opens, Load and Export are usable, and the same retained row exports.
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await expect(finish(page)).toHaveAttribute('data-stage','save');await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-leased')).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeEnabled();
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');expect(await reviewCells(page)).toEqual(cells);
 await expect(exportButton).toBeEnabled();
 await openExport(page);await fillExport(page,{date:'released date',time:'released time'});
 const got=await download(page,()=>id(page,'pulsar-export-download').click());
 expect(got.name).toBe('pulsar-results.csv');expect(await urls(page)).toBe(1);
 expect(got.bytes.toString('latin1').split('\r\n')).toEqual(['"released date","released time"','"Table Number: "','','',HEADER,rowOf(cells[0]),'']);
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-status')).toHaveText(REQUESTED(1));
});
