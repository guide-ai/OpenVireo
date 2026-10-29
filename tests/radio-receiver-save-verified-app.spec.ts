import {test,expect,type Locator,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
// Actual App flows of R-RX15 (docs/PULSAR-SAVE-VERIFIED.md): Record → Receive → Stop → Identify → Properties → Save No → Pulsar
// Analysis → "Save capture as .PLR (verified)…". The recording is a model-generated capture, not an observation; the catalog is
// synthetic.
// SYNTHETIC PICKER: no native OS dialog is driven. The init script below replaces window.showSaveFilePicker with a function
// marked __synthetic that returns REAL FileSystemFileHandle objects of this test's own fresh origin-private file system
// (navigator.storage.getDirectory()), named by the test. The product then uses the real createWritable/write/close/getFile
// stream APIs on them. Test-only wrappers can hold or fail a stage, or flip one read-back byte, for names the test marks;
// unmarked calls go to the browser unchanged. No user or native file, no grantPermissions, no browser flags or settings.
// Expected strings are the chosen web contract, not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
/** The element's actual text lines (a Range over its contents), not its box, lie inside the viewport. */
const textFits=(page:Page,testId:string)=>expect.poll(()=>id(page,testId).evaluate(el=>{
 const r=document.createRange();r.selectNodeContents(el);const w=document.documentElement.clientWidth,rects=Array.from(r.getClientRects());
 return rects.length>0&&rects.every(b=>b.left>=0&&b.right<=w);
}),`text of ${testId} fits`).toBe(true);
/** Explains an overflow failure only: visible elements whose box passes the viewport's right edge. */
const offenders=(page:Page)=>page.evaluate(()=>{
 const w=document.documentElement.clientWidth;
 return Array.from(document.querySelectorAll('body *')).filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&b.height>0&&b.right>w;})
  .map(el=>el.getAttribute('data-testid')??`${el.tagName.toLowerCase()}${(el.getAttribute('class')??'').split(/\s+/).filter(Boolean).map(c=>`.${c}`).join('')}`).slice(0,40);
});
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();const d=await next;return {name:d.suggestedFilename(),bytes:await readFile((await d.path())!)};}
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
/** The test's own probe of the browser API (not the product's data-support): secure context, a callable
 *  showSaveFilePicker and FileSystemFileHandle.prototype.createWritable. No picker is called. */
const saveCapable=(page:Page)=>page.evaluate(()=>window.isSecureContext===true&&typeof (window as {showSaveFilePicker?:unknown}).showSaveFilePicker==='function'
 &&typeof FileSystemFileHandle==='function'&&'createWritable' in FileSystemFileHandle.prototype);

// ---- Synthetic picker over this test's OPFS.
type Plan={name:string;truncate?:boolean;reject?:'AbortError'|'SecurityError';throwSync?:boolean};
type Shim={synthetic:true;calls:number;events:(string|null)[];options:string[];plans:Plan[];log:string[];holds:Set<string>;waiting:Map<string,()=>void>;fails:Set<string>;
 tamper:Set<string>;rawGetFile:(this:FileSystemFileHandle)=>Promise<File>;raw:Map<string,(data:unknown)=>Promise<void>>};
type Stream={write:(data:unknown)=>Promise<void>;close:()=>Promise<void>;abort:(reason?:unknown)=>Promise<void>};
const installShim=(page:Page,remove=false)=>page.addInitScript(removePicker=>{
 const w=window as unknown as {__saveShim:Shim};
 const proto=FileSystemFileHandle.prototype as unknown as {createWritable:(this:FileSystemFileHandle,...a:unknown[])=>Promise<Stream>;getFile:(this:FileSystemFileHandle)=>Promise<File>};
 const create=proto.createWritable,getFile=proto.getFile;
 const s:Shim={synthetic:true,calls:0,events:[],options:[],plans:[],log:[],holds:new Set(),waiting:new Map(),fails:new Set(),tamper:new Set(),rawGetFile:getFile,raw:new Map()};
 w.__saveShim=s;
 const gate=(stage:string,name:string)=>{const key=`${stage}:${name}`;if(!s.holds.has(key))return Promise.resolve();s.holds.delete(key);return new Promise<void>(r=>s.waiting.set(key,r));};
 const failing=(stage:string,name:string)=>s.fails.delete(`${stage}:${name}`);
 proto.createWritable=async function(this:FileSystemFileHandle,...args:unknown[]){
  const name=this.name;s.log.push(`createWritable:${name}`);
  const stream=await create.apply(this,args);
  const write=stream.write.bind(stream),close=stream.close.bind(stream),abort=stream.abort.bind(stream);
  s.raw.set(name,write);// the unwrapped write, so a test can probe whether this real stream is still writable
  stream.write=async data=>{s.log.push(`write:${name}`);await gate('write',name);if(failing('write',name))throw new DOMException('synthetic write failure','QuotaExceededError');return write(data);};
  // A synthetic close failure rejects before the real close and does NOT abort: the real stream stays writable unless the
  // product's own cleanup settles it.
  stream.close=async()=>{s.log.push(`close:${name}`);await gate('close',name);if(failing('close',name))throw new DOMException('synthetic close failure','InvalidStateError');return close();};
  stream.abort=async reason=>{s.log.push(`abort:${name}`);return abort(reason);};
  return stream;
 };
 proto.getFile=async function(this:FileSystemFileHandle){
  const name=this.name;s.log.push(`getFile:${name}`);await gate('getFile',name);
  if(failing('getFile',name))throw new DOMException('synthetic read failure','NotReadableError');
  const file=await getFile.call(this);
  if(!s.tamper.has(name))return file;
  const b=new Uint8Array(await file.arrayBuffer());b[0]^=1;return new File([b],file.name);
 };
 const picker=function(options:unknown){
  s.calls++;s.events.push((window as unknown as {event?:Event}).event?.type??null);s.options.push(JSON.stringify(options));
  const p=s.plans.shift();
  if(!p)return Promise.reject(new DOMException('no synthetic plan','AbortError'));
  if(p.throwSync)throw new DOMException('synthetic picker refusal','SecurityError');
  return (async()=>{
   const dir=await navigator.storage.getDirectory();
   const h=await dir.getFileHandle(p.name,{create:true});
   // Like a real save picker, the selection itself may empty the chosen file before anything resolves.
   if(p.truncate){const ws=await create.call(h);await ws.close();}
   if(p.reject)throw new DOMException('synthetic picker result',p.reject);
   return h;
  })();
 };
 (picker as unknown as {__synthetic:boolean}).__synthetic=true;
 Object.defineProperty(window,'showSaveFilePicker',{value:removePicker?undefined:picker,configurable:true,writable:true});
},remove);
const shim=(page:Page)=>page.evaluate(()=>{const s=(window as unknown as {__saveShim:Shim}).__saveShim;return {calls:s.calls,events:[...s.events],options:[...s.options],log:[...s.log]};});
/** Every test checks the synthetic mark before it lets the product call the picker. */
const assertSynthetic=async(page:Page)=>expect(await page.evaluate(()=>(window as unknown as {showSaveFilePicker?:{__synthetic?:boolean}}).showSaveFilePicker?.__synthetic)).toBe(true);
const plan=(page:Page,p:Plan)=>page.evaluate(q=>{(window as unknown as {__saveShim:Shim}).__saveShim.plans.push(q);},p);
const holdAt=(page:Page,stage:'write'|'close'|'getFile',name:string)=>page.evaluate(k=>{(window as unknown as {__saveShim:Shim}).__saveShim.holds.add(k);},`${stage}:${name}`);
const failAt=(page:Page,stage:'write'|'close'|'getFile',name:string)=>page.evaluate(k=>{(window as unknown as {__saveShim:Shim}).__saveShim.fails.add(k);},`${stage}:${name}`);
const tamper=(page:Page,name:string)=>page.evaluate(n=>{(window as unknown as {__saveShim:Shim}).__saveShim.tamper.add(n);},name);
const waiting=(page:Page,stage:string,name:string)=>expect.poll(()=>page.evaluate(k=>(window as unknown as {__saveShim:Shim}).__saveShim.waiting.has(k),`${stage}:${name}`)).toBe(true);
const release=(page:Page,stage:string,name:string)=>page.evaluate(k=>{const s=(window as unknown as {__saveShim:Shim}).__saveShim,r=s.waiting.get(k)!;s.waiting.delete(k);r();},`${stage}:${name}`);
/** Whether the last real stream created for name still accepts an (empty) unwrapped write; an aborted stream rejects it. */
const rawWritable=(page:Page,name:string)=>page.evaluate(async n=>{
 const w=(window as unknown as {__saveShim:Shim}).__saveShim.raw.get(n);if(!w)throw new Error(`no real stream for ${n}`);
 try{await w(new Uint8Array(0));return true;}catch{return false;}
},name);
const clearLog=(page:Page)=>page.evaluate(()=>{(window as unknown as {__saveShim:Shim}).__saveShim.log.length=0;});
/** The bytes of a test-owned OPFS file, read with the unwrapped getFile. */
const opfs=(page:Page,name:string)=>page.evaluate(async n=>{
 const s=(window as unknown as {__saveShim:Shim}).__saveShim,h=await (await navigator.storage.getDirectory()).getFileHandle(n);
 return Array.from(new Uint8Array(await (await s.rawGetFile.call(h)).arrayBuffer()));
},name).then(a=>Buffer.from(a));
/** An existing test-owned OPFS file with the given text. */
const seed=(page:Page,name:string,text:string)=>page.evaluate(async([n,t])=>{
 const h=await (await navigator.storage.getDirectory()).getFileHandle(n,{create:true}),ws=await h.createWritable();await ws.write(t);await ws.close();
},[name,text] as const);

// ---- App helpers copied from tests/radio-receiver-raw-export-app.spec.ts.
const COLUMNS={primaryName:[0,12],legacyName:[12,8],ra:[20,16],dec:[62,16],x2a:[208,22],x34:[240,16],x3e:[266,14],s48:[336,8],s4c:[350,14],s50:[410,10],s54:[430,8],s58:[438,8],s5c:[446,8]} as const;
type Row=Partial<Record<keyof typeof COLUMNS,string>>;
const BASE:Record<keyof typeof COLUMNS,string>={primaryName:'',legacyName:'',ra:'0',dec:'0',x2a:'0.5',x34:'1.0E-15',x3e:'50000.0',s48:'28.2',s4c:'30.0',s50:'12.5',s54:'14.0',s58:'9.0',s5c:'3.0'};
function line(row:Row):string{
 const chars=Array.from({length:454},()=>' ');
 for(const [field,[start,width]] of Object.entries(COLUMNS) as [keyof typeof COLUMNS,readonly [number,number]][]){
  const text=row[field]??BASE[field],cell=field==='primaryName'||field==='legacyName'?text.padEnd(width):text.padStart(width);
  for(let i=0;i<width;i++)chars[start+i]=cell[i];
 }
 return chars.join('');
}
const CATALOG=[{primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'}].map(line).join('\r\n')+'\r\n';
const UT='2026-10-24T12:00:00';
const FILE='openvireo-model-capture.PLR';
const NOT_WRITTEN='Data Not Written to File';
const ANALYSIS_BUSY='Record refused: Pulsar Analysis has an open dialog or a file being read. Finish it first; nothing was erased.';
/** Failure and cancel texts never claim that the chosen destination is untouched. */
const FALSE_COMFORT=/nothing (was|has been) written|file is unchanged|was not changed|unchanged/i;

async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();await expect(id(page,'pulsar-none')).toBeVisible();
 await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
async function setupReceiver(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-receiver.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
 await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await id(page,'radio-clock-longitude').click();
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
}
const toAnalysis=async(page:Page)=>{await clickHeaderTool(page,'Radio data');await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);};
const toRadio=async(page:Page)=>{await clickHeaderTool(page,'Radio telescope');await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);};
const finish=(page:Page)=>id(page,'receiver-record-finish');
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}
async function captureToAnalysis(page:Page,name?:string){
 await startApp(page);await setupReceiver(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await flush(page);await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
 await untilFinished(page);await expect(finish(page)).toHaveAttribute('data-stage','identify');
 if(name!==undefined)await id(page,'receiver-record-identify-input').fill(name);
 await id(page,'receiver-record-identify-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','properties');
 const points=(await id(page,'receiver-record-prop-points').textContent())!;
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-memory')).toBeVisible();await flush(page);
 return points;
}
const lines=(bytes:Buffer)=>bytes.toString('latin1').split('\r\n');
const SAMPLE_ROW=/^-?\d+\.\d{3},-?\d+\.\d{3},-?\d+\.\d{3}$/;
const dialog=(page:Page)=>id(page,'pulsar-save-capture-dialog');
const openSave=async(page:Page)=>{await id(page,'pulsar-save-capture').click();await expect(dialog(page)).toBeVisible();await expect(id(page,'pulsar-raw-export-cancel')).toBeFocused();};
/** One attempt that the product completes and verifies. */
async function saveAs(page:Page,name:string){
 await plan(page,{name});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-save-capture')).toBeFocused();
 await expect(id(page,'pulsar-status')).toContainText(`Verified copy saved as “${name}”`);
}
const alert=(page:Page)=>id(page,'pulsar-save-capture-alert');
const status=(page:Page)=>id(page,'pulsar-save-capture-status');

test('Save: the picker runs inside the click; write, close and an equal read-back mark the capture written without changing data, cursors or origin',async({page})=>{
 await installShim(page);
 const points=await captureToAnalysis(page,'PSR B2358+38');
 await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
 const gain=(await id(page,'pulsar-prop-receiver-1').locator('td').nth(1).textContent())!,start=(await id(page,'pulsar-prop-start').textContent())!;
 // Display state that the receipt must not reset: a zoom step and a pending cursor.
 await id(page,'pulsar-zoom-in').click();const zoom=await id(page,'pulsar-zoom').textContent();
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();const vertical=await id(page,'pulsar-vertical-value-1').textContent();
 await expect(id(page,'pulsar-save-capture-note')).toHaveAttribute('data-support','ok');
 await openSave(page);
 await expect(dialog(page).locator('h3')).toHaveText('Save capture as .PLR with verification');
 await expect(id(page,'pulsar-save-capture-warning')).toContainText('can replace or empty it');await expect(id(page,'pulsar-save-capture-warning')).toContainText('cannot restore');
 await expect(id(page,'pulsar-save-capture-how')).toContainText('does not watch the file');
 await expect(id(page,'pulsar-save-capture-extension')).toContainText('not a question about replacing a file');
 await expect(id(page,'pulsar-raw-export-loss-samples')).toContainText(`of ${Number(points)*3} samples change`);
 await expect(id(page,'pulsar-raw-export-download')).toHaveCount(0);
 await saveAs(page,'verified-copy.PLR');
 const s=await shim(page);
 expect(s.calls).toBe(1);expect(s.events).toEqual(['click']);
 const options=JSON.parse(s.options[0]) as Record<string,unknown>;
 expect(options).toEqual({suggestedName:FILE,types:[{description:'.PLR',accept:{'application/octet-stream':['.PLR']}}]});
 expect(s.log).toEqual(['createWritable:verified-copy.PLR','write:verified-copy.PLR','close:verified-copy.PLR','getFile:verified-copy.PLR']);
 // The file holds the R-RX14 layout of this capture (hand-checked shape; not a native oracle).
 const saved=await opfs(page,'verified-copy.PLR'),l=lines(saved);
 expect(saved.toString('latin1').endsWith('\r\n')).toBe(true);expect(l.pop()).toBe('');expect(l.length).toBe(Number(points)+4);
 expect(l[0]).toBe("'PSR B2358+38',100,0");expect(l[1]).toMatch(/^600\.00,0\.0,0\.0$/);expect(l[2]).toBe(`${gain},0.0,0.0`);expect(l[3]).toBe(`${start},0.01000`);
 for(const row of l.slice(4))expect(row).toMatch(SAMPLE_ROW);
 // The receipt: Properties shows the basename; the origin, rows, zoom and cursor stay; no file identity appears.
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: verified-copy.PLR');
 await expect(id(page,'pulsar-save-capture-last')).toContainText('does not watch the file');
 await expect(id(page,'pulsar-prop-file')).toHaveText('verified-copy.PLR');
 await expect(id(page,'pulsar-memory-origin')).toContainText('not an observation');await expect(id(page,'pulsar-memory-origin')).toContainText('written to a file and verified');
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points);await expect(id(page,'pulsar-memory')).toBeVisible();
 await expect(id(page,'pulsar-sha')).toHaveCount(0);await expect(id(page,'pulsar-download')).toHaveCount(0);await expect(id(page,'pulsar-file-name')).toHaveCount(0);
 await expect(id(page,'pulsar-zoom')).toHaveText(zoom!);await expect(id(page,'pulsar-pending-1')).toBeVisible();await expect(id(page,'pulsar-vertical-value-1')).toHaveText(vertical!);
 // A measurement row of the written memory capture still has no file field (+0x96 is not set by the writer).
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill('after save');await id(page,'pulsar-record-ok').click();
 await id(page,'pulsar-review').click();await expect(id(page,'pulsar-entry-1')).toContainText('after save');
 await expect(id(page,'pulsar-entry-1').locator('td').last()).toHaveText('');await id(page,'pulsar-review-cancel').click();
 // Download after Save: same bytes; the text and the receipt keep the verified status.
 await id(page,'pulsar-raw-export').click();await expect(id(page,'pulsar-raw-export-dialog')).toBeVisible();
 await expect(id(page,'pulsar-raw-export-consequence')).toContainText('keeps its last verified copy (verified-copy.PLR)');
 const got=await download(page,id(page,'pulsar-raw-export-download'));
 expect(got.name).toBe(FILE);expect(got.bytes.equals(saved)).toBe(true);
 await expect(id(page,'pulsar-status')).toContainText('keeps its last verified copy status (verified-copy.PLR)');
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: verified-copy.PLR');await expect(id(page,'pulsar-prop-file')).toHaveText('verified-copy.PLR');
 // Arming skips the unsaved question (+0x97 set); the erase question is unchanged. Cancel keeps everything.
 await toRadio(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','erase');
 await id(page,'receiver-record-cancel').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await toAnalysis(page);await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: verified-copy.PLR');
 // Load asks nothing now; the saved bytes load as ordinary file data, whose exact-byte Download is unchanged.
 const chooser=page.waitForEvent('filechooser');await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toHaveCount(0);
 await (await chooser).setFiles({name:'verified-copy.PLR',mimeType:'application/octet-stream',buffer:saved});
 await expect(id(page,'pulsar-file-name')).toHaveText('verified-copy.PLR');await expect(id(page,'pulsar-memory')).toHaveCount(0);
 await expect(id(page,'pulsar-save-capture')).toHaveCount(0);await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 const again=await download(page,id(page,'pulsar-download'));
 expect(again.name).toBe('verified-copy.PLR');expect(again.bytes.equals(saved)).toBe(true);
});

test('held close and read-back mark nothing early; reentry does nothing; close, read, write failures and a tampered read-back keep the prior receipt',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await openSave(page);await saveAs(page,'first.PLR');
 await expect(id(page,'pulsar-prop-file')).toHaveText('first.PLR');
 // Held close, then held read-back: the new name appears nowhere until the read-back is compared.
 await openSave(page);await holdAt(page,'close','held.PLR');await holdAt(page,'getFile','held.PLR');await plan(page,{name:'held.PLR'});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();
 await waiting(page,'close','held.PLR');await expect(status(page)).toHaveAttribute('data-code','closing');await expect(status(page)).toContainText('Closing “held.PLR”');
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: first.PLR');await expect(id(page,'pulsar-prop-file')).toHaveText('first.PLR');
 // Reentrant Save, Cancel and Escape while the claim is held change nothing and call no picker.
 const calls=(await shim(page)).calls;
 await id(page,'pulsar-save-capture-choose').evaluate(el=>(el as HTMLButtonElement).click());
 await id(page,'pulsar-raw-export-cancel').evaluate(el=>(el as HTMLButtonElement).click());
 await page.keyboard.press('Escape');await flush(page);
 await expect(dialog(page)).toBeVisible();expect((await shim(page)).calls).toBe(calls);await expect(status(page)).toHaveAttribute('data-code','closing');
 await release(page,'close','held.PLR');
 await waiting(page,'getFile','held.PLR');await expect(status(page)).toHaveAttribute('data-code','reading');
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: first.PLR');
 await release(page,'getFile','held.PLR');
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: held.PLR');
 // Failures: each is an alert, names the possible destination effects, never claims the target is untouched, and keeps the receipt.
 await openSave(page);
 for(const [kind,name,code] of [['close','close-fail.PLR','close-failed'],['getFile','read-fail.PLR','readback-failed'],['write','write-fail.PLR','write-failed'],['tamper','tamper.PLR','mismatch']] as const){
  if(kind==='tamper')await tamper(page,name);else await failAt(page,kind,name);
  await plan(page,{name});await assertSynthetic(page);await clearLog(page);
  await id(page,'pulsar-save-capture-choose').click();
  await expect(alert(page),name).toHaveAttribute('data-code',code);
  await expect(alert(page)).toContainText(name);await expect(alert(page)).toContainText('cannot restore');await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
  await expect(dialog(page)).toBeVisible();await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: held.PLR');
  const log=(await shim(page)).log;
  if(kind==='write')expect(log).toEqual([`createWritable:${name}`,`write:${name}`,`abort:${name}`]);
  // The product aborts after the rejected close (the fixture no longer does), so the real stream is no longer writable.
  // This is web-stream cleanup only; the file's contents are not asserted (no rollback or durability claim).
  if(kind==='close'){expect(log).toEqual([`createWritable:${name}`,`write:${name}`,`close:${name}`,`abort:${name}`]);expect(await rawWritable(page,name)).toBe(false);}
 }
 // The tampered read-back did not change the file: it holds the copy, but nothing marks it.
 expect((await opfs(page,'tamper.PLR')).equals(await opfs(page,'held.PLR'))).toBe(true);
 await id(page,'pulsar-raw-export-cancel').click();await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-save-capture')).toBeFocused();
 await expect(id(page,'pulsar-status')).toContainText('Save dialog closed.');await expect(id(page,'pulsar-status')).not.toHaveText(FALSE_COMFORT);
 await expect(id(page,'pulsar-prop-file')).toHaveText('held.PLR');
});

test('picker cancel, asynchronous and synchronous refusal: one call each, no retry, no receipt, and an emptied destination is not hidden',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await seed(page,'existing.PLR','KEEP ME\r\n');
 await openSave(page);
 await plan(page,{name:'existing.PLR',truncate:true,reject:'AbortError'});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(alert(page)).toHaveAttribute('data-code','picker-cancelled');
 await expect(alert(page)).toContainText('may already have been created or emptied');await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
 expect((await opfs(page,'existing.PLR')).byteLength).toBe(0);// the synthetic selection emptied it, as a browser may
 await plan(page,{name:'refused.PLR',reject:'SecurityError'});
 await id(page,'pulsar-save-capture-choose').click();await expect(alert(page)).toHaveAttribute('data-code','picker-refused');
 await plan(page,{name:'sync.PLR',throwSync:true});
 await id(page,'pulsar-save-capture-choose').click();await expect(alert(page)).toHaveAttribute('data-code','picker-refused');
 await expect(alert(page)).toContainText('does not retry');await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
 await flush(page);
 const s=await shim(page);
 expect(s.calls).toBe(3);expect(s.events).toEqual(['click','click','click']);expect(s.log.filter(e=>e.startsWith('createWritable'))).toEqual(['createWritable:existing.PLR']);// the seed only
 await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);
 await id(page,'pulsar-raw-export-cancel').click();await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
 // Still unsaved: the Load question asks. Since R-RX18 its Yes follows the test's own capability probe (not pressed here).
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 const capable=await saveCapable(page);
 await expect(id(page,'pulsar-load-yes-reason')).toHaveAttribute('data-support',capable?'ok':/^(insecure-context|no-api)$/);
 if(capable)await expect(id(page,'pulsar-load-yes')).toBeEnabled();else await expect(id(page,'pulsar-load-yes')).toBeDisabled();
 await id(page,'pulsar-load-cancel').click();expect((await shim(page)).calls).toBe(3);
});

test('a name without .PLR is not written to; Choose again uses a new click and a new picker call',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await seed(page,'notes.txt','MY NOTES\r\n');
 await openSave(page);await clearLog(page);
 await plan(page,{name:'notes.txt',truncate:true});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(alert(page)).toHaveAttribute('data-code','extension');
 await expect(alert(page)).toContainText('“notes.txt” is not a name ending in .PLR with at least one character before it');await expect(alert(page)).toContainText('may already have created or emptied');
 await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
 expect((await shim(page)).log).toEqual([]);// no writable of the product; the picker's own emptying is the shim's
 expect((await opfs(page,'notes.txt')).byteLength).toBe(0);
 await expect(id(page,'pulsar-save-capture-choose')).toHaveText('Choose again…');await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);
 await saveAs(page,'notes.PLR');
 const s=await shim(page);expect(s.calls).toBe(2);expect(s.events).toEqual(['click','click']);
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: notes.PLR');
});

test('the name ".PLR" (no character before .PLR) is refused by the web stem rule: no product write, no receipt, and a new click can choose again',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await openSave(page);await clearLog(page);
 // ".PLR" is a test-owned OPFS basename picked by the synthetic picker, not an OS path.
 await plan(page,{name:'.PLR',truncate:true});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(alert(page)).toHaveAttribute('data-code','extension');
 await expect(alert(page)).toContainText('“.PLR” is not a name ending in .PLR with at least one character before it');
 await expect(alert(page)).not.toContainText('does not end in .PLR');
 await expect(alert(page)).toContainText('may already have created or emptied');await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
 expect((await shim(page)).log).toEqual([]);// no createWritable of the product; the picker's own emptying is the shim's
 expect((await opfs(page,'.PLR')).byteLength).toBe(0);
 await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);
 await id(page,'pulsar-raw-export-cancel').click();await expect(dialog(page)).toHaveCount(0);await expect(id(page,'pulsar-save-capture')).toBeFocused();
 await expect(id(page,'pulsar-status')).toContainText('Save dialog closed.');await expect(id(page,'pulsar-status')).not.toHaveText(FALSE_COMFORT);
 await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
 // Reopen: the same refusal, then Choose again with a stem.
 await openSave(page);
 await plan(page,{name:'.PLR'});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();await expect(alert(page)).toHaveAttribute('data-code','extension');
 await expect(id(page,'pulsar-save-capture-choose')).toHaveText('Choose again…');
 expect((await shim(page)).log).toEqual([]);
 await saveAs(page,'stem.PLR');
 const s=await shim(page);expect(s.calls).toBe(3);expect(s.events).toEqual(['click','click','click']);
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: stem.PLR');await expect(id(page,'pulsar-prop-file')).toHaveText('stem.PLR');
});

test('a foreign modal open when the read-back finishes: the receipt is recorded, the dialog stays, and its later Cancel or Escape does not deny the new mark',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 const opener=id(page,'pulsar-save-capture'),cancel=id(page,'pulsar-raw-export-cancel');
 // SYNTHETIC HOST DIALOG: a plain <dialog data-synthetic="true"> made by this test and opened with showModal(); it stands for a
 // controlled host modal over the Save dialog, not a native OS dialog. The file is a real test-owned OPFS file picked by the
 // synthetic picker.
 const openHost=()=>page.evaluate(()=>{const d=document.createElement('dialog');d.dataset.synthetic='true';d.setAttribute('data-testid','synthetic-host-dialog');
  d.textContent='Synthetic host dialog (test-owned)';document.body.append(d);d.showModal();});
 const closeHost=()=>page.evaluate(()=>{const d=document.querySelector<HTMLDialogElement>('dialog[data-synthetic="true"]')!;d.close();d.remove();});
 for(const [name,how] of [['foreign.PLR','click'],['foreign-esc.PLR','escape']] as const){
  await openSave(page);
  await holdAt(page,'getFile',name);await plan(page,{name});await assertSynthetic(page);
  await id(page,'pulsar-save-capture-choose').click();
  await waiting(page,'getFile',name);await expect(status(page)).toHaveAttribute('data-code','reading');
  await openHost();await expect(id(page,'synthetic-host-dialog')).toBeVisible();
  await release(page,'getFile',name);
  // The read-back matched: the receipt is recorded, but the Save dialog stays open under the host modal with a verified notice.
  await expect(status(page)).toHaveAttribute('data-code','verified');await expect(status(page)).toContainText(`Verified copy saved as “${name}”`);
  await expect(dialog(page)).toBeVisible();
  await expect(id(page,'pulsar-save-capture-last-file')).toHaveText(`Last verified copy: ${name}`);await expect(id(page,'pulsar-prop-file')).toHaveText(name);
  // While the host modal owns focus, a script Cancel does nothing.
  await cancel.evaluate(el=>(el as HTMLButtonElement).click());await flush(page);
  await expect(dialog(page)).toBeVisible();await expect(status(page)).toHaveAttribute('data-code','verified');
  await closeHost();await expect(id(page,'synthetic-host-dialog')).toHaveCount(0);
  if(how==='click')await cancel.click();else{await cancel.focus();await page.keyboard.press('Escape');}
  await expect(dialog(page)).toHaveCount(0);await expect(opener).toBeFocused();
  await expect(id(page,'pulsar-status')).toContainText('Save dialog closed.');await expect(id(page,'pulsar-status')).not.toContainText('No new copy was marked');
  await expect(id(page,'pulsar-status')).not.toHaveText(FALSE_COMFORT);
  await expect(id(page,'pulsar-save-capture-last-file')).toHaveText(`Last verified copy: ${name}`);await expect(id(page,'pulsar-prop-file')).toHaveText(name);
 }
});

test('hiding the route during a held write abandons the attempt: arming is refused meanwhile, the stream is aborted, nothing is marked, Save works again',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await openSave(page);await holdAt(page,'write','hidden.PLR');await plan(page,{name:'hidden.PLR'});await assertSynthetic(page);await clearLog(page);
 await id(page,'pulsar-save-capture-choose').click();
 await waiting(page,'write','hidden.PLR');await expect(status(page)).toHaveAttribute('data-code','writing');
 await page.goBack();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await id(page,'receiver-record').click();
 await expect(id(page,'receiver-status-0')).toHaveText(ANALYSIS_BUSY);await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await page.goForward();await expect(dialog(page)).toBeVisible();
 await expect(alert(page)).toHaveAttribute('data-code','abandoned');await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
 await expect(status(page)).toContainText('waiting for its file stream to close');
 // The claim is still held: a Save click calls no picker.
 const calls=(await shim(page)).calls;
 await id(page,'pulsar-save-capture-choose').click();await flush(page);expect((await shim(page)).calls).toBe(calls);
 await release(page,'write','hidden.PLR');
 await expect(status(page)).toHaveText('');
 const log=(await shim(page)).log;
 expect(log).toEqual(['createWritable:hidden.PLR','write:hidden.PLR','abort:hidden.PLR']);
 await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
 // The aborted stream left no lock: the same file can be written again.
 await saveAs(page,'hidden.PLR');
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: hidden.PLR');
});

test('unsupported browser API: Save is disabled with its reason and Download still works, leaving the capture unsaved',async({page})=>{
 await installShim(page,true);
 const points=await captureToAnalysis(page);
 await expect(id(page,'pulsar-save-capture')).toBeDisabled();
 await expect(id(page,'pulsar-save-capture-note')).toHaveAttribute('data-support','no-api');
 await expect(id(page,'pulsar-save-capture-note')).toContainText('does not offer the save file picker');
 await id(page,'pulsar-save-capture').evaluate(el=>(el as HTMLButtonElement).click());await flush(page);
 await expect(dialog(page)).toHaveCount(0);
 await id(page,'pulsar-raw-export').click();
 const got=await download(page,id(page,'pulsar-raw-export-download'));
 expect(got.name).toBe(FILE);expect(lines(got.bytes).length).toBe(Number(points)+5);
 await expect(id(page,'pulsar-status')).toContainText('still not written to a file');await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
});

test('keyboard: Cancel default, Tab wraps, Escape returns focus, Enter on Choose calls the picker; long names (alert, status line, last copy, Properties) fit at 1440, 375 and 320',async({page},info)=>{
 await installShim(page);
 await captureToAnalysis(page,'X'.repeat(40));
 const opener=id(page,'pulsar-save-capture'),cancel=id(page,'pulsar-raw-export-cancel'),choose=id(page,'pulsar-save-capture-choose');
 await opener.focus();await page.keyboard.press('Enter');await expect(dialog(page)).toBeVisible();await expect(cancel).toBeFocused();
 await page.keyboard.press('Tab');await expect(choose).toBeFocused();
 await page.keyboard.press('Tab');await expect(cancel).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(choose).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(cancel).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog(page)).toHaveCount(0);await expect(opener).toBeFocused();
 await expect(id(page,'pulsar-status')).toContainText('Save dialog closed.');
 await page.keyboard.press('Enter');await expect(dialog(page)).toBeVisible();await expect(cancel).toBeFocused();
 for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);await noOverflow(page);
  expect(await dialog(page).evaluate(el=>el.scrollWidth-el.clientWidth),`dialog overflow at ${width}`).toBeLessThanOrEqual(0);
  await info.attach(`save-verified-dialog-${width}.png`,{body:await page.screenshot({path:info.outputPath(`save-verified-dialog-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
 // A long refused name: the extension alert wraps inside the dialog at 320.
 const longTxt=`${'N'.repeat(120)}.txt`;
 await plan(page,{name:longTxt});await assertSynthetic(page);
 await page.keyboard.press('Tab');await expect(choose).toBeFocused();await page.keyboard.press('Enter');
 await expect(alert(page)).toHaveAttribute('data-code','extension');await expect(alert(page)).toContainText(longTxt);
 await page.setViewportSize({width:320,height:568});await flush(page);
 await info.attach('save-verified-alert-offenders-320.json',{body:JSON.stringify(await offenders(page)),contentType:'application/json'});
 await noOverflow(page);
 expect(await dialog(page).evaluate(el=>el.scrollWidth-el.clientWidth),'dialog overflow with a long alert at 320').toBeLessThanOrEqual(0);
 await textFits(page,'pulsar-save-capture-alert');
 const longName=`${'L'.repeat(120)}.PLR`;
 await plan(page,{name:longName});await assertSynthetic(page);
 await expect(choose).toBeFocused();await page.keyboard.press('Enter');
 await expect(dialog(page)).toHaveCount(0);await expect(opener).toBeFocused();
 expect((await shim(page)).events).toEqual(['click','click']);
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText(`Last verified copy: ${longName}`);
 await expect(id(page,'pulsar-status')).toContainText(longName);
 for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);
  await info.attach(`save-verified-memory-offenders-${width}.json`,{body:JSON.stringify(await offenders(page)),contentType:'application/json'});
  await noOverflow(page);
  for(const target of ['pulsar-status','pulsar-save-capture-last-file','pulsar-prop-file'])await textFits(page,target);
  for(const target of ['pulsar-save-capture-last-file','pulsar-prop-file']){
   const box=await id(page,target).boundingBox();
   expect(box,target).not.toBeNull();expect(box!.x,`${target} at ${width}`).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width,`${target} at ${width}`).toBeLessThanOrEqual(width);
  }
  await info.attach(`save-verified-memory-${width}.png`,{body:await page.screenshot({path:info.outputPath(`save-verified-memory-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
});

test('Front R1: File ▸ Save Recorded Data... is enabled by the No answer and opens the analysis on its verified Save',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page,'PSR B2358+38');
 await toRadio(page);
 await expect(id(page,'radio-save-recorded-data')).toBeEnabled();await expect(id(page,'radio-save-recorded-data-row')).toContainText('runs the same save as the pulsar analysis Save');
 await id(page,'radio-save-recorded-data').click();
 await expect(id(page,'pulsar-analysis')).toBeVisible();await expect(id(page,'pulsar-save-capture')).toBeEnabled();
});
