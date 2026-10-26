import {test,expect,type FileChooser,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
// Actual App flows of R-RX18 (docs/PULSAR-LOAD-SAVE.md): a receiver capture → Save No → Pulsar Analysis → Load → the unsaved
// question (E9) → Yes → the verified web Save → a separate Load choice → a fresh Choose click → the dedicated chooser → the strict
// read, SHA-256 and import. The recording is a model-generated capture, not an observation; the catalog and the PLR text are
// synthetic. Expected strings are the chosen web contract, not native oracles. No native Save dialog, OS file chooser, native
// continuation, cancel delivery or CLEA behaviour is witnessed here.
// SYNTHETIC PICKER: no native OS dialog is driven. The init script below (copied from tests/radio-receiver-save-verified-app.spec.ts)
// replaces window.showSaveFilePicker with a function marked __synthetic that returns REAL FileSystemFileHandle objects of this
// test's own fresh origin-private file system (navigator.storage.getDirectory()), named by the test; the product uses the real
// createWritable/write/close/getFile stream APIs on them. Every Save Choose is preceded by assertSynthetic. The LOAD chooser is
// Playwright's intercepted `filechooser` event of the product's own <input type=file> (its element identity is checked); no OS
// chooser opens, and whether a real browser fires the input's `cancel` event is not established here (the test dispatches it).
// Test-only hooks: a hold of File.arrayBuffer for files named held-* (released normally or by a test-owned rejection), and a
// one-shot hold of crypto.subtle.digest.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const textFits=(page:Page,testId:string)=>expect.poll(()=>id(page,testId).evaluate(el=>{
 const r=document.createRange();r.selectNodeContents(el);const w=document.documentElement.clientWidth,rects=Array.from(r.getClientRects());
 return rects.length>0&&rects.every(b=>b.left>=0&&b.right<=w);
}),`text of ${testId} fits`).toBe(true);
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
/** The chooser's input attribute, read through a type-safe Element guard (null for a non-Element node). */
const chooserAttr=(c:FileChooser,name:string)=>c.element().evaluate((el,n)=>el instanceof Element?el.getAttribute(n):null,name);

// ---- Synthetic picker over this test's OPFS (copied from tests/radio-receiver-save-verified-app.spec.ts), plus the read holds.
type Plan={name:string;truncate?:boolean;reject?:'AbortError'|'SecurityError';throwSync?:boolean};
type Shim={synthetic:true;calls:number;events:(string|null)[];plans:Plan[];log:string[];holds:Set<string>;waiting:Map<string,()=>void>;fails:Set<string>};
type Stream={write:(data:unknown)=>Promise<void>;close:()=>Promise<void>;abort:(reason?:unknown)=>Promise<void>};
type Holds={held:Map<string,(fail?:boolean)=>void>;digestHold:boolean;digestWaiting:(()=>void)|null;digests:number};
const installShim=(page:Page,remove=false)=>page.addInitScript(removePicker=>{
 const w=window as unknown as {__saveShim:Shim;__holds:Holds};
 const proto=FileSystemFileHandle.prototype as unknown as {createWritable:(this:FileSystemFileHandle,...a:unknown[])=>Promise<Stream>;getFile:(this:FileSystemFileHandle)=>Promise<File>};
 const create=proto.createWritable,getFile=proto.getFile;
 const s:Shim={synthetic:true,calls:0,events:[],plans:[],log:[],holds:new Set(),waiting:new Map(),fails:new Set()};
 w.__saveShim=s;
 const gate=(stage:string,name:string)=>{const key=`${stage}:${name}`;if(!s.holds.has(key))return Promise.resolve();s.holds.delete(key);return new Promise<void>(r=>s.waiting.set(key,r));};
 proto.createWritable=async function(this:FileSystemFileHandle,...args:unknown[]){
  const name=this.name;s.log.push(`createWritable:${name}`);
  const stream=await create.apply(this,args);
  const write=stream.write.bind(stream),close=stream.close.bind(stream),abort=stream.abort.bind(stream);
  stream.write=async data=>{s.log.push(`write:${name}`);await gate('write',name);if(s.fails.delete(`write:${name}`))throw new DOMException('synthetic write failure','QuotaExceededError');return write(data);};
  stream.close=async()=>{s.log.push(`close:${name}`);await gate('close',name);return close();};
  stream.abort=async reason=>{s.log.push(`abort:${name}`);return abort(reason);};
  return stream;
 };
 proto.getFile=async function(this:FileSystemFileHandle){const name=this.name;s.log.push(`getFile:${name}`);await gate('getFile',name);return getFile.call(this);};
 const picker=function(){
  s.calls++;s.events.push((window as unknown as {event?:Event}).event?.type??null);
  const p=s.plans.shift();
  if(!p)return Promise.reject(new DOMException('no synthetic plan','AbortError'));
  if(p.throwSync)throw new DOMException('synthetic picker refusal','SecurityError');
  return (async()=>{
   const dir=await navigator.storage.getDirectory();
   const h=await dir.getFileHandle(p.name,{create:true});
   if(p.truncate){const ws=await create.call(h);await ws.close();}
   if(p.reject)throw new DOMException('synthetic picker result',p.reject);
   return h;
  })();
 };
 (picker as unknown as {__synthetic:boolean}).__synthetic=true;
 Object.defineProperty(window,'showSaveFilePicker',{value:removePicker?undefined:picker,configurable:true,writable:true});
 // Read holds: File.arrayBuffer of a file named held-* waits for release (or a test-owned synthetic rejection); the next digest
 // waits when digestHold is set.
 const h:Holds={held:new Map(),digestHold:false,digestWaiting:null,digests:0};w.__holds=h;
 const read=Blob.prototype.arrayBuffer;
 Blob.prototype.arrayBuffer=function(this:Blob){
  if(!(this instanceof File&&this.name.startsWith('held-')))return read.call(this);
  const self=this,name=this.name;return new Promise<ArrayBuffer>((resolve,reject)=>h.held.set(name,fail=>{if(fail)reject(new DOMException('synthetic read failure','NotReadableError'));else read.call(self).then(resolve,reject);}));
 };
 const subtle=SubtleCrypto.prototype as unknown as {digest:(this:unknown,...a:unknown[])=>Promise<ArrayBuffer>};
 const digest=subtle.digest;
 subtle.digest=function(this:unknown,...args:unknown[]){
  h.digests++;
  if(!h.digestHold)return digest.apply(this,args);
  h.digestHold=false;const self=this;
  return new Promise<ArrayBuffer>((resolve,reject)=>{h.digestWaiting=()=>{digest.apply(self,args).then(resolve,reject);};});
 };
},remove);
const shim=(page:Page)=>page.evaluate(()=>{const s=(window as unknown as {__saveShim:Shim}).__saveShim;return {calls:s.calls,events:[...s.events],log:[...s.log]};});
const assertSynthetic=async(page:Page)=>expect(await page.evaluate(()=>(window as unknown as {showSaveFilePicker?:{__synthetic?:boolean}}).showSaveFilePicker?.__synthetic)).toBe(true);
const plan=(page:Page,p:Plan)=>page.evaluate(q=>{(window as unknown as {__saveShim:Shim}).__saveShim.plans.push(q);},p);
const holdAt=(page:Page,stage:'write'|'close'|'getFile',name:string)=>page.evaluate(k=>{(window as unknown as {__saveShim:Shim}).__saveShim.holds.add(k);},`${stage}:${name}`);
const waiting=(page:Page,stage:string,name:string)=>expect.poll(()=>page.evaluate(k=>(window as unknown as {__saveShim:Shim}).__saveShim.waiting.has(k),`${stage}:${name}`)).toBe(true);
const release=(page:Page,stage:string,name:string)=>page.evaluate(k=>{const s=(window as unknown as {__saveShim:Shim}).__saveShim,r=s.waiting.get(k)!;s.waiting.delete(k);r();},`${stage}:${name}`);
const heldRead=(page:Page,name:string)=>expect.poll(()=>page.evaluate(n=>(window as unknown as {__holds:Holds}).__holds.held.has(n),name)).toBe(true);
const releaseRead=(page:Page,name:string)=>page.evaluate(n=>{const m=(window as unknown as {__holds:Holds}).__holds.held,r=m.get(n)!;m.delete(n);r();},name);
/** Rejects a held read with a synthetic NotReadableError (test-owned; no real file or OS read failure). */
const rejectRead=(page:Page,name:string)=>page.evaluate(n=>{const m=(window as unknown as {__holds:Holds}).__holds.held,r=m.get(n)!;m.delete(n);r(true);},name);
const holdDigest=(page:Page)=>page.evaluate(()=>{(window as unknown as {__holds:Holds}).__holds.digestHold=true;});
const digestWaiting=(page:Page)=>expect.poll(()=>page.evaluate(()=>(window as unknown as {__holds:Holds}).__holds.digestWaiting!==null)).toBe(true);
const releaseDigest=(page:Page)=>page.evaluate(()=>{const h=(window as unknown as {__holds:Holds}).__holds,r=h.digestWaiting!;h.digestWaiting=null;r();});
/** Every intercepted file chooser of this page, in order (Playwright's `filechooser` event; no OS chooser opens). */
function choosers(page:Page){const list:FileChooser[]=[];page.on('filechooser',c=>{list.push(c);});return list;}

// ---- App helpers copied from tests/radio-receiver-save-verified-app.spec.ts.
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
const NOT_WRITTEN='Data Not Written to File';
/** A synthetic PLR text (not a CLEA recording). */
const PLR=Buffer.from(["'SYNTH LOAD',25,1",'400.00,1400.00,0','1.0,0,1.0','50000.5,0.01','0,10,0','1,10,0'].join('\r\n')+'\r\n','latin1');
const plrFile=(name:string,buffer=PLR)=>({name,mimeType:'application/octet-stream',buffer});

async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();await expect(id(page,'pulsar-none')).toBeVisible();
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
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
 // A 'No Data' capture is current but not presented (WEB-REC-NODATA): its notice shows instead of the memory section.
 await expect(id(page,name==='No Data'?'pulsar-data-notice':'pulsar-memory')).toBeVisible();await flush(page);
 return points;
}
/** One confirmed measurement of panel 1 (a keyboard cursor step, then Record). */
async function recordOne(page:Page,comment:string){
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
}
const saveDialog=(page:Page)=>id(page,'pulsar-save-capture-dialog');
const readyDialog=(page:Page)=>id(page,'pulsar-load-save-dialog');
const status=(page:Page)=>id(page,'pulsar-status');
/** Load → the unsaved question → Yes: the flow's Save dialog, with no picker call and no file chooser. */
async function yesToSave(page:Page,seen:FileChooser[]){
 const calls=(await shim(page)).calls,before=seen.length;
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();await expect(id(page,'pulsar-load-cancel')).toBeFocused();
 await id(page,'pulsar-load-yes').click();
 await expect(id(page,'pulsar-load-dialog')).toHaveCount(0);await expect(saveDialog(page)).toBeVisible();
 await expect(id(page,'pulsar-load-save-intro')).toContainText('nothing is loaded automatically');await expect(id(page,'pulsar-raw-export-cancel')).toBeFocused();
 await flush(page);expect((await shim(page)).calls).toBe(calls);expect(seen.length).toBe(before);
}
/** Save Choose of the flow, verified: the Save dialog closes and the Load choice opens with Cancel focused; no chooser opens. */
async function saveToReady(page:Page,name:string,seen:FileChooser[]){
 const before=seen.length;
 await plan(page,{name});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(saveDialog(page)).toHaveCount(0);await expect(readyDialog(page)).toBeVisible();await expect(id(page,'pulsar-load-save-cancel')).toBeFocused();
 await expect(id(page,'pulsar-load-save-verified')).toContainText(`saved as “${name}”`);
 await flush(page);expect(seen.length).toBe(before);
}
/** A fresh Choose click: exactly one new chooser, for the dedicated input of the new invocation. */
async function choose(page:Page,seen:FileChooser[]){
 const before=seen.length;
 await id(page,'pulsar-load-save-choose').click();
 await expect.poll(()=>seen.length).toBe(before+1);
 const c=seen[seen.length-1];
 expect(await chooserAttr(c,'data-testid')).toBe('pulsar-load-save-file');
 await expect(readyDialog(page)).toHaveAttribute('data-phase','choosing');
 return c;
}
const memoryKept=async(page:Page,file:string)=>{
 await expect(id(page,'pulsar-memory')).toBeVisible();await expect(id(page,'pulsar-file-name')).toHaveCount(0);
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText(`Last verified copy: ${file}`);
};

test('Yes opens only the verified Save; a verified copy offers a separate Load choice; a fresh Choose loads through the strict reader',async({page})=>{
 await installShim(page);const seen=choosers(page);
 const points=await captureToAnalysis(page,'PSR B2358+38');
 await recordOne(page,'before load');
 const zoom0=await id(page,'pulsar-zoom').textContent();
 await id(page,'pulsar-zoom-in').click();const zoom1=await id(page,'pulsar-zoom').textContent();expect(zoom1).not.toBe(zoom0);
 // The question offers Yes with its web reason; Cancel stays the web default.
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-yes-reason')).toHaveAttribute('data-support','ok');
 await expect(id(page,'pulsar-load-yes')).toBeEnabled();await expect(id(page,'pulsar-load-yes-reason')).toContainText('Nothing is loaded by Yes');
 await id(page,'pulsar-load-cancel').click();await expect(id(page,'pulsar-load-dialog')).toHaveCount(0);
 await yesToSave(page,seen);
 await expect(status(page)).toContainText('Save first: the verified web Save opened.');
 await saveToReady(page,'load-first.PLR',seen);
 const s=await shim(page);expect(s.calls).toBe(1);expect(s.events).toEqual(['click']);
 expect(s.log).toEqual(['createWritable:load-first.PLR','write:load-first.PLR','close:load-first.PLR','getFile:load-first.PLR']);
 // RX18-12: the verified capture is still the current data: origin, rows, receipt, zoom, cursor reading and list unchanged.
 await memoryKept(page,'load-first.PLR');await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 await expect(id(page,'pulsar-zoom')).toHaveText(zoom1!);await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await expect(id(page,'pulsar-load-save-verified')).toContainText('still the current pulsar data');
 await expect(status(page)).toContainText('Choose the recording to load in the next step');
 // A fresh Choose click opens exactly one chooser, the dedicated input; a valid PLR then loads.
 const c=await choose(page,seen);
 await c.setFiles(plrFile('chosen.PLR'));
 await expect(readyDialog(page)).toHaveCount(0);
 await expect(id(page,'pulsar-file-name')).toHaveText('chosen.PLR');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 await expect(id(page,'pulsar-memory')).toHaveCount(0);await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);
 // The list is kept and the view resets as with No (zoom back to its initial readout, Properties shown).
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');await expect(id(page,'pulsar-zoom')).toHaveText(zoom0!);
 await expect(id(page,'pulsar-properties')).toBeVisible();await expect(id(page,'pulsar-prop-object')).toHaveText('SYNTH LOAD');
 expect(seen.length).toBe(1);expect((await shim(page)).calls).toBe(1);
});

test('unsupported Save API: Yes is disabled with its reason and does nothing; No still loads after a fresh choice',async({page})=>{
 await installShim(page,true);const seen=choosers(page);
 await captureToAnalysis(page);
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 await expect(id(page,'pulsar-load-yes-reason')).toHaveAttribute('data-support','no-api');
 await expect(id(page,'pulsar-load-yes')).toBeDisabled();await expect(id(page,'pulsar-load-yes-reason')).toContainText('does not offer the save file picker');
 await id(page,'pulsar-load-yes').evaluate(el=>(el as HTMLButtonElement).click());await flush(page);
 await expect(id(page,'pulsar-load-dialog')).toBeVisible();await expect(saveDialog(page)).toHaveCount(0);expect(seen.length).toBe(0);
 const next=page.waitForEvent('filechooser');await id(page,'pulsar-load-no').click();
 await (await next).setFiles(plrFile('after-no.PLR'));
 await expect(id(page,'pulsar-file-name')).toHaveText('after-no.PLR');
});

test('a canonical preview refusal keeps the data: Choose is disabled and Save Cancel ends the flow',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page,"O'Neil");
 await yesToSave(page,seen);
 await expect(id(page,'pulsar-raw-export-problem')).toHaveAttribute('data-code','name-apostrophe');
 await expect(id(page,'pulsar-save-capture-choose')).toBeDisabled();
 await id(page,'pulsar-raw-export-cancel').click();
 await expect(saveDialog(page)).toHaveCount(0);await expect(readyDialog(page)).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeFocused();
 await expect(status(page)).toContainText('Load cancelled after Save was closed.');
 await expect(id(page,'pulsar-memory')).toBeVisible();await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
 expect((await shim(page)).calls).toBe(0);expect(seen.length).toBe(0);
});

test('a "No Data" capture is not presented: Yes refuses with a reason and keeps the question',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page,'No Data');
 await expect(id(page,'pulsar-data-notice')).toHaveAttribute('data-kind','reserved-name');
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 const loadStatus=id(page,'pulsar-load-dialog').getByRole('status');
 await expect(loadStatus).toHaveCount(1);await expect(loadStatus).toHaveAttribute('aria-live','polite');
 await expect(loadStatus).not.toContainText('does not present the current data');
 await id(page,'pulsar-load-yes').click();
 await expect(id(page,'pulsar-load-dialog')).toBeVisible();await expect(saveDialog(page)).toHaveCount(0);
 // The refusal is announced in the open question itself (the main status is inert behind the modal).
 await expect(loadStatus).toContainText('does not present the current data');
 await expect(id(page,'pulsar-load-yes')).toBeEnabled();
 await expect(status(page)).toContainText('does not present the current data');
 await id(page,'pulsar-load-cancel').click();expect((await shim(page)).calls).toBe(0);
});

test('Load choice Cancel keeps the capture, receipt, cursors and list; afterwards the ordinary saved-file Load applies (no question)',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);await recordOne(page,'kept');
 const vertical=await id(page,'pulsar-vertical-value-1').textContent();
 await yesToSave(page,seen);await saveToReady(page,'kept.PLR',seen);
 await id(page,'pulsar-load-save-cancel').click();
 await expect(readyDialog(page)).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeFocused();
 await expect(status(page)).toContainText('Load cancelled. Nothing was loaded; the current recording keeps its verified copy');
 await memoryKept(page,'kept.PLR');await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await expect(id(page,'pulsar-vertical-value-1')).toHaveText(vertical!);
 // RX18-35: outside the flow the ordinary rule applies unchanged: saved data asks nothing and the chooser loads directly.
 const next=page.waitForEvent('filechooser');await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toHaveCount(0);
 await (await next).setFiles(plrFile('ordinary.PLR'));await expect(id(page,'pulsar-file-name')).toHaveText('ordinary.PLR');
});

test('a dispatched input cancel consumes the grant while written=true: its late change, the generic input and an empty selection load nothing',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 await yesToSave(page,seen);await saveToReady(page,'cancel.PLR',seen);
 // The input's standard cancel event (dispatched here; native delivery is browser-dependent) returns to the choice.
 const c=await choose(page,seen);
 await id(page,'pulsar-load-save-file').evaluate(el=>el.dispatchEvent(new Event('cancel',{bubbles:true})));
 await expect(readyDialog(page)).toHaveAttribute('data-phase','ready');await expect(status(page)).toContainText('No file chosen. Nothing was loaded');
 // The cancelled invocation's late change (the same node, still attached) is silent and loads nothing, although the data is saved.
 await c.setFiles(plrFile('late-after-cancel.PLR'));await flush(page);
 await expect(readyDialog(page)).toBeVisible();await memoryKept(page,'cancel.PLR');
 await expect(status(page)).toContainText('No file chosen. Nothing was loaded');
 // The generic Load input (disabled under the dialog) given a file by script is refused unread.
 await id(page,'pulsar-file').evaluate(el=>{const i=el as HTMLInputElement,dt=new DataTransfer();dt.items.add(new File(["'X',1,0\r\n"],'generic.PLR'));i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect(id(page,'pulsar-load-save-status')).toContainText('finish or cancel the Load after Save first');await memoryKept(page,'cancel.PLR');
 // An empty selection consumes a new grant; the same node's later file is then silent too.
 const d=await choose(page,seen);
 await d.setFiles([]);
 await expect(readyDialog(page)).toHaveAttribute('data-phase','ready');await expect(status(page)).toContainText('No file chosen');
 await d.setFiles(plrFile('late-after-empty.PLR'));await flush(page);await memoryKept(page,'cancel.PLR');
 expect(seen.length).toBe(2);
});

test('double click opens one chooser; Choose again supersedes: the old node is detached and its change cannot load or replace the new file',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 await yesToSave(page,seen);await saveToReady(page,'twice.PLR',seen);
 await id(page,'pulsar-load-save-choose').dblclick();
 await expect.poll(()=>seen.length).toBe(1);await flush(page);expect(seen.length).toBe(1);
 const first=seen[0],firstInvocation=await chooserAttr(first,'data-invocation');
 const second=await choose(page,seen);
 const secondInvocation=await chooserAttr(second,'data-invocation');
 expect(Number(secondInvocation)).toBeGreaterThan(Number(firstInvocation));
 expect(await first.element().evaluate(el=>el.isConnected)).toBe(false);
 // The old node's change (delivered by script to the detached node) reaches nothing.
 await first.element().evaluate(el=>{const i=el as HTMLInputElement,dt=new DataTransfer();dt.items.add(new File(['bad'],'old-node.PLR'));i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));});
 await flush(page);await memoryKept(page,'twice.PLR');await expect(readyDialog(page)).toHaveAttribute('data-phase','choosing');
 await second.setFiles(plrFile('new-node.PLR'));
 await expect(id(page,'pulsar-file-name')).toHaveText('new-node.PLR');
 await first.element().evaluate(el=>{const i=el as HTMLInputElement,dt=new DataTransfer();dt.items.add(new File(['bad'],'old-node-late.PLR'));i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));});
 await flush(page);await expect(id(page,'pulsar-file-name')).toHaveText('new-node.PLR');
});

test('Save phase: arming is refused while the flow is open; hiding the route ends the flow and its Save stays a standalone Save',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 // Save phase: hide → the flow ends; the Save dialog stays as a standalone Save (no intro), Record is refused meanwhile.
 await yesToSave(page,seen);
 await page.goBack();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await page.goForward();await expect(saveDialog(page)).toBeVisible();await expect(id(page,'pulsar-load-save-intro')).toHaveCount(0);
 await plan(page,{name:'standalone.PLR'});await assertSynthetic(page);await id(page,'pulsar-save-capture-choose').click();
 await expect(saveDialog(page)).toHaveCount(0);await expect(readyDialog(page)).toHaveCount(0);await expect(id(page,'pulsar-save-capture')).toBeFocused();
 await memoryKept(page,'standalone.PLR');expect(seen.length).toBe(0);
});

test('window blur does not cancel the dedicated grant; a hide while choosing ends the flow and withdraws it',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 await yesToSave(page,seen);await saveToReady(page,'blur.PLR',seen);
 // Blur and focus of the window (the chooser itself blurs the page) leave the grant: its file still loads.
 const c=await choose(page,seen);
 await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});await flush(page);
 await expect(readyDialog(page)).toHaveAttribute('data-phase','choosing');
 await c.setFiles(plrFile('after-blur.PLR'));await expect(id(page,'pulsar-file-name')).toHaveText('after-blur.PLR');
});

test('a hide while choosing ends the flow: arming is refused while it is open, and the withdrawn chooser node is gone',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 await yesToSave(page,seen);await saveToReady(page,'hide.PLR',seen);
 const c=await choose(page,seen);
 await page.goBack();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await page.goForward();await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(readyDialog(page)).toHaveCount(0);
 expect(await c.element().evaluate(el=>el.isConnected)).toBe(false);
 await memoryKept(page,'hide.PLR');
});

test('held reads: arrayBuffer and digest holds keep the gate; Cancel reading ends the flow; late results are silent and never replace a newer file',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);await recordOne(page,'held');
 // The non-modal Properties is closed before the flow, so no dialog of any kind is open while the file is read.
 await expect(id(page,'pulsar-properties')).toBeVisible();await id(page,'pulsar-properties-close').click();await expect(id(page,'pulsar-properties')).toHaveCount(0);
 await yesToSave(page,seen);await saveToReady(page,'held.PLR',seen);
 let c=await choose(page,seen);
 await c.setFiles(plrFile('held-a.PLR'));
 await heldRead(page,'held-a.PLR');
 await expect(readyDialog(page)).toHaveCount(0);await expect(id(page,'pulsar-reading')).toContainText('held-a.PLR');
 // The pending-read gate blocks the other commands synchronously (script clicks included).
 await expect(id(page,'pulsar-file')).toBeDisabled();await expect(id(page,'pulsar-record')).toBeDisabled();
 await id(page,'pulsar-export').evaluate(el=>(el as HTMLButtonElement).click());await expect(id(page,'pulsar-export-dialog')).toHaveCount(0);
 await id(page,'pulsar-clear').evaluate(el=>(el as HTMLButtonElement).click());await expect(id(page,'pulsar-clear-dialog')).toHaveCount(0);
 // RX18 reading: no modal is open; the flow still refuses core actions and the status names the read, not a dialog.
 expect(await page.locator('dialog:modal').count()).toBe(0);
 const vertical=await id(page,'pulsar-vertical-value-1').textContent();
 await id(page,'pulsar-reset').click();
 await expect(status(page)).toHaveText('Nothing changed: the chosen recording is still being read. Wait for reading to finish or press Cancel reading.');
 await expect(id(page,'pulsar-vertical-value-1')).toHaveText(vertical!);await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await id(page,'pulsar-cancel-read').click();
 await expect(status(page)).toHaveText('Reading cancelled. The current analysis is unchanged.');
 // Properties is reopened (the flow has ended) so the unchanged checks below see the same panel as before.
 await id(page,'pulsar-properties-open').click();await expect(id(page,'pulsar-properties')).toBeVisible();
 await memoryKept(page,'held.PLR');
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // The flow ended. The data is saved, so the ordinary Load chooser opens directly; a newer file loads.
 const next=page.waitForEvent('filechooser');await id(page,'pulsar-file').click();await (await next).setFiles(plrFile('newer.PLR'));
 await expect(id(page,'pulsar-file-name')).toHaveText('newer.PLR');const after=await status(page).textContent();
 // The obsolete flow read finishes now: silent, no late-discard text, and it does not replace the newer file.
 await releaseRead(page,'held-a.PLR');await flush(page);
 await expect(id(page,'pulsar-file-name')).toHaveText('newer.PLR');await expect(status(page)).toHaveText(after!);
 await expect(status(page)).not.toContainText('An earlier read finished');
});

test('a held digest then a hide: the flow read is dropped silently and the capture and receipt stay',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 await yesToSave(page,seen);await saveToReady(page,'digest.PLR',seen);
 const c=await choose(page,seen);
 await holdDigest(page);await c.setFiles(plrFile('digest-wait.PLR'));
 await digestWaiting(page);await expect(id(page,'pulsar-reading')).toContainText('digest-wait.PLR');
 await page.goBack();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await page.goForward();await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 const shown=await status(page).textContent();
 await releaseDigest(page);await flush(page);
 await memoryKept(page,'digest.PLR');await expect(id(page,'pulsar-reading')).toHaveCount(0);await expect(status(page)).toHaveText(shown!);
 await expect(readyDialog(page)).toHaveCount(0);
});

test('bad, oversized and unreadable choices keep memory, receipt and list and end the flow',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);await recordOne(page,'bad');
 await yesToSave(page,seen);await saveToReady(page,'bad.PLR',seen);
 const c=await choose(page,seen);
 await c.setFiles(plrFile('bad.PLR',Buffer.from('not a recording\r\n','latin1')));
 await expect(id(page,'pulsar-rejection')).toContainText('Recording not loaded: bad.PLR');
 // The failed flow read clears its own status line; the rejection alert carries the reason.
 await expect(status(page)).toHaveText('');
 await expect(readyDialog(page)).toHaveCount(0);await memoryKept(page,'bad.PLR');await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // The flow ended: its old dedicated node is gone, and the ordinary saved-data rule applies to the next Load.
 expect(await c.element().evaluate(el=>el.isConnected)).toBe(false);
 const big=Buffer.alloc(2*1024*1024+1,0x41);
 const next=page.waitForEvent('filechooser');await id(page,'pulsar-file').click();await (await next).setFiles(plrFile('big.PLR',big));
 await expect(id(page,'pulsar-rejection')).toContainText('2 MiB');await memoryKept(page,'bad.PLR');
});

test('a held flow read that fails after a refused Reset: error shown, reading notice cleared, memory, receipt and list kept',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);await recordOne(page,'terminal');
 // As in the held-read case, Properties is closed first so no dialog of any kind is open while the file is read.
 await expect(id(page,'pulsar-properties')).toBeVisible();await id(page,'pulsar-properties-close').click();await expect(id(page,'pulsar-properties')).toHaveCount(0);
 await yesToSave(page,seen);await saveToReady(page,'terminal-copy.PLR',seen);
 const c=await choose(page,seen);
 await c.setFiles(plrFile('held-terminal-choice.PLR'));
 await heldRead(page,'held-terminal-choice.PLR');
 await expect(readyDialog(page)).toHaveCount(0);await expect(id(page,'pulsar-reading')).toContainText('held-terminal-choice.PLR');
 const notice='Nothing changed: the chosen recording is still being read. Wait for reading to finish or press Cancel reading.';
 const vertical=await id(page,'pulsar-vertical-value-1').textContent();
 await id(page,'pulsar-reset').click();
 await expect(status(page)).toHaveText(notice);
 await expect(id(page,'pulsar-vertical-value-1')).toHaveText(vertical!);await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // The held read now fails (test-owned synthetic rejection): the flow ends and its own reading notice is cleared.
 await rejectRead(page,'held-terminal-choice.PLR');await flush(page);
 await expect(id(page,'pulsar-rejection')).toContainText('Recording not loaded: held-terminal-choice.PLR');
 await expect(id(page,'pulsar-reading')).toHaveCount(0);
 await expect(status(page)).toHaveText('');
 await expect(readyDialog(page)).toHaveCount(0);
 expect(await c.element().evaluate(el=>el.isConnected)).toBe(false);
 await expect(id(page,'pulsar-file')).toBeEnabled();await expect(id(page,'pulsar-clear')).toBeEnabled();await expect(id(page,'pulsar-export')).toBeEnabled();
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // A second Reset is an ordinary action now: it never restores the reading notice.
 await id(page,'pulsar-reset').click();await flush(page);
 await expect(status(page)).not.toHaveText(notice);
 // Properties is reopened only after the terminal status checks, so the unchanged checks below see the same panel as before.
 await id(page,'pulsar-properties-open').click();await expect(id(page,'pulsar-properties')).toBeVisible();
 await memoryKept(page,'terminal-copy.PLR');
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
});

test('a host modal during the read-back: the receipt is recorded, the Save dialog closes and the Load choice waits until the host closes',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 await yesToSave(page,seen);
 // SYNTHETIC HOST DIALOG: a plain test-owned <dialog data-synthetic="true"> opened with showModal(); not a native OS dialog.
 await holdAt(page,'getFile','host.PLR');await plan(page,{name:'host.PLR'});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();await waiting(page,'getFile','host.PLR');
 await page.evaluate(()=>{const d=document.createElement('dialog');d.dataset.synthetic='true';d.setAttribute('data-testid','synthetic-host-dialog');
  const b=document.createElement('button');b.textContent='Host button';b.setAttribute('data-testid','synthetic-host-button');d.append(b);document.body.append(d);d.showModal();b.focus();});
 await release(page,'getFile','host.PLR');
 await expect(saveDialog(page)).toHaveCount(0);await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: host.PLR');
 await expect(readyDialog(page)).not.toBeVisible();await expect(id(page,'synthetic-host-button')).toBeFocused();
 // A script click on Choose while the host owns focus does nothing.
 await id(page,'pulsar-load-save-choose').evaluate(el=>(el as HTMLButtonElement).click());await flush(page);expect(seen.length).toBe(0);
 await page.evaluate(()=>{const d=document.querySelector<HTMLDialogElement>('dialog[data-synthetic="true"]')!;d.close();d.remove();});
 await expect(readyDialog(page)).toBeVisible();await expect(id(page,'pulsar-load-save-cancel')).toBeFocused();
});

test('held Escape and held Enter close one layer only and never open a chooser',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 // Held Escape in the flow's Save dialog: Save Cancel ends the flow; the repeats do nothing more.
 await yesToSave(page,seen);
 await page.keyboard.down('Escape');await page.keyboard.down('Escape');await page.keyboard.down('Escape');await page.keyboard.up('Escape');await flush(page);
 await expect(saveDialog(page)).toHaveCount(0);await expect(id(page,'pulsar-load-dialog')).toHaveCount(0);await expect(status(page)).toContainText('Load cancelled after Save was closed.');
 // Held Enter on the Load choice's default Cancel: one Cancel; the repeats on the Load control open no chooser.
 await yesToSave(page,seen);await saveToReady(page,'keys.PLR',seen);
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');await flush(page);
 await expect(readyDialog(page)).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeFocused();
 expect(seen.length).toBe(0);await memoryKept(page,'keys.PLR');
});

test('a failed Save keeps the data unsaved; after Cancel, Load → No still needs a fresh explicit choice',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 await yesToSave(page,seen);
 await plan(page,{name:'cancelled.PLR',reject:'AbortError'});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(id(page,'pulsar-save-capture-alert')).toHaveAttribute('data-code','picker-cancelled');await expect(readyDialog(page)).toHaveCount(0);
 await id(page,'pulsar-raw-export-cancel').click();await expect(status(page)).toContainText('Load cancelled after Save was closed.');
 await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);expect(seen.length).toBe(0);
 // No grant was left behind: a change delivered to the generic input without a click is refused while the question applies.
 await id(page,'pulsar-file').setInputFiles(plrFile('no-click.PLR'));
 await expect(status(page)).toContainText('use the Load control');await expect(id(page,'pulsar-memory')).toBeVisible();
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 const next=page.waitForEvent('filechooser');await id(page,'pulsar-load-no').click();
 await (await next).setFiles(plrFile('after-fail.PLR'));await expect(id(page,'pulsar-file-name')).toHaveText('after-fail.PLR');
});

test('a held write keeps the shared claim: Cancel and Escape do nothing until the attempt settles, then the Load choice opens',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page);
 await yesToSave(page,seen);
 await holdAt(page,'write','slow.PLR');await plan(page,{name:'slow.PLR'});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();await waiting(page,'write','slow.PLR');
 await id(page,'pulsar-raw-export-cancel').evaluate(el=>(el as HTMLButtonElement).click());await page.keyboard.press('Escape');await flush(page);
 await expect(saveDialog(page)).toBeVisible();await expect(id(page,'pulsar-load-save-intro')).toBeVisible();await expect(readyDialog(page)).toHaveCount(0);
 await expect(id(page,'pulsar-save-capture-status')).toHaveAttribute('data-code','writing');
 await release(page,'write','slow.PLR');
 await expect(readyDialog(page)).toBeVisible();await expect(id(page,'pulsar-load-save-cancel')).toBeFocused();
 // The claim was released only after the attempt settled: Choose now opens the chooser.
 await choose(page,seen);
});

test('layout: 120-character names in the Load choice fit at 1440, 375 and 320',async({page})=>{
 await installShim(page);const seen=choosers(page);
 await captureToAnalysis(page,'X'.repeat(40));
 const name=`${'n'.repeat(116)}.PLR`;
 await yesToSave(page,seen);await saveToReady(page,name,seen);
 for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);await noOverflow(page);
  expect(await readyDialog(page).evaluate(el=>el.scrollWidth-el.clientWidth),`dialog overflow at ${width}`).toBeLessThanOrEqual(0);
  await textFits(page,'pulsar-load-save-verified');await textFits(page,'pulsar-load-save-consequence');await textFits(page,'pulsar-load-save-status');
  await expect(id(page,'pulsar-load-save-choose')).toBeInViewport();await expect(id(page,'pulsar-load-save-cancel')).toBeInViewport();
 }
});
