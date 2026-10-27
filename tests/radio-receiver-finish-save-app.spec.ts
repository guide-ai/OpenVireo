import {test,expect,type Locator,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
// Actual App flows of R-RX17 (docs/RADIO-FINISH-SAVE.md): Record → Receive → Stop → Identify → Properties → the finish Save
// question → Yes → the Radio-owned finish Save dialog → Choose → only a verified read-back ends the finish (one release of the
// capture lease, the route stays Radio, Pulsar Analysis is not opened). The recording is a model-generated capture, not an
// observation; the catalog and the PLR text are synthetic. Expected strings are the chosen web contract, not native oracles; no
// native Save dialog, OS picker, native continuation or CLEA behaviour is witnessed here.
// SYNTHETIC PICKER: no native OS dialog is driven. The init script below (copied from tests/radio-receiver-record-save-app.spec.ts)
// replaces window.showSaveFilePicker with a function marked __synthetic that returns REAL FileSystemFileHandle objects of this
// test's own fresh origin-private file system (navigator.storage.getDirectory()), named by the test. The product then uses the
// browser's real createWritable/write/close/getFile stream APIs on them (wrapped only to log calls and, for names the test marks,
// to hold or fail a stage or flip one read-back byte), and the product (not the fixture) aborts and settles its own streams.
// Every Choose is preceded by assertSynthetic. No user or native file, no grantPermissions, no browser flags or settings.
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
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
/** Route change by the location hash: the App header is inert while a radio box is presented, as history navigation would be. */
const hashTo=async(page:Page,hash:'#pulsar-analysis'|'#radio-control')=>{await page.evaluate(h=>{location.hash=h;},hash);await flush(page);};
/** The test's own probe of the browser API (not the product's data-support): secure context, a callable
 *  showSaveFilePicker and FileSystemFileHandle.prototype.createWritable. No picker is called. */
const saveCapable=(page:Page)=>page.evaluate(()=>window.isSecureContext===true&&typeof (window as {showSaveFilePicker?:unknown}).showSaveFilePicker==='function'
 &&typeof FileSystemFileHandle==='function'&&'createWritable' in FileSystemFileHandle.prototype);

// ---- Synthetic picker over this test's OPFS (copied from tests/radio-receiver-record-save-app.spec.ts).
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
  s.raw.set(name,write);
  stream.write=async data=>{s.log.push(`write:${name}`);await gate('write',name);if(failing('write',name))throw new DOMException('synthetic write failure','QuotaExceededError');return write(data);};
  // A synthetic close failure rejects before the real close and does NOT abort: only the product's own cleanup settles the stream.
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
   if(p.truncate){const ws=await create.call(h);await ws.close();}
   if(p.reject)throw new DOMException('synthetic picker result',p.reject);
   return h;
  })();
 };
 (picker as unknown as {__synthetic:boolean}).__synthetic=true;
 Object.defineProperty(window,'showSaveFilePicker',{value:removePicker?undefined:picker,configurable:true,writable:true});
},remove);
const shim=(page:Page)=>page.evaluate(()=>{const s=(window as unknown as {__saveShim:Shim}).__saveShim;return {calls:s.calls,events:[...s.events],options:[...s.options],log:[...s.log]};});
/** Every Choose is preceded by this check of the synthetic mark, so the product never reaches a real picker. */
const assertSynthetic=async(page:Page)=>expect(await page.evaluate(()=>(window as unknown as {showSaveFilePicker?:{__synthetic?:boolean}}).showSaveFilePicker?.__synthetic)).toBe(true);
const plan=(page:Page,p:Plan)=>page.evaluate(q=>{(window as unknown as {__saveShim:Shim}).__saveShim.plans.push(q);},p);
const holdAt=(page:Page,stage:'write'|'close'|'getFile',name:string)=>page.evaluate(k=>{(window as unknown as {__saveShim:Shim}).__saveShim.holds.add(k);},`${stage}:${name}`);
const failAt=(page:Page,stage:'write'|'close'|'getFile',name:string)=>page.evaluate(k=>{(window as unknown as {__saveShim:Shim}).__saveShim.fails.add(k);},`${stage}:${name}`);
const tamper=(page:Page,name:string)=>page.evaluate(n=>{(window as unknown as {__saveShim:Shim}).__saveShim.tamper.add(n);},name);
const waiting=(page:Page,stage:string,name:string)=>expect.poll(()=>page.evaluate(k=>(window as unknown as {__saveShim:Shim}).__saveShim.waiting.has(k),`${stage}:${name}`)).toBe(true);
const release=(page:Page,stage:string,name:string)=>page.evaluate(k=>{const s=(window as unknown as {__saveShim:Shim}).__saveShim,r=s.waiting.get(k)!;s.waiting.delete(k);r();},`${stage}:${name}`);
const clearLog=(page:Page)=>page.evaluate(()=>{(window as unknown as {__saveShim:Shim}).__saveShim.log.length=0;});
/** Whether the last real stream created for name still accepts an (empty) unwrapped write; an aborted stream rejects it. */
const rawWritable=(page:Page,name:string)=>page.evaluate(async n=>{
 const w=(window as unknown as {__saveShim:Shim}).__saveShim.raw.get(n);if(!w)throw new Error(`no real stream for ${n}`);
 try{await w(new Uint8Array(0));return true;}catch{return false;}
},name);
/** The bytes of a test-owned OPFS file, read with the unwrapped getFile. */
const opfs=(page:Page,name:string)=>page.evaluate(async n=>{
 const s=(window as unknown as {__saveShim:Shim}).__saveShim,h=await (await navigator.storage.getDirectory()).getFileHandle(n);
 return Array.from(new Uint8Array(await (await s.rawGetFile.call(h)).arrayBuffer()));
},name).then(a=>Buffer.from(a));
/** An existing test-owned OPFS file with the given text. */
const seed=(page:Page,name:string,text:string)=>page.evaluate(async([n,t])=>{
 const h=await (await navigator.storage.getDirectory()).getFileHandle(n,{create:true}),ws=await h.createWritable();await ws.write(t);await ws.close();
},[name,text] as const);

// ---- App helpers copied from tests/radio-receiver-record-save-app.spec.ts.
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
const KEPT='Finished. The recording stays the current pulsar data.';
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
/** From an open main receiver: Record, Receive for ms, Stop, the sweep finish, Identify OK (optional name), Properties OK: the finish
 *  Save question is presented with Cancel focused. Returns the Properties point count. ms = 0 stops before the first tick. */
async function captureFromReceiver(page:Page,name?:string,ms=600){
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await flush(page);await advance(page,ms);await id(page,'receiver-mode').click();await flush(page);
 await untilFinished(page);await expect(finish(page)).toHaveAttribute('data-stage','identify');
 if(name!==undefined)await id(page,'receiver-record-identify-input').fill(name);
 await id(page,'receiver-record-identify-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','properties');
 const points=(await id(page,'receiver-record-prop-points').textContent())!;
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await expect(id(page,'receiver-record-save-cancel')).toBeFocused();
 return points;
}
async function captureToQuestion(page:Page,name?:string,ms=600){await startApp(page);await setupReceiver(page);return captureFromReceiver(page,name,ms);}
const box=(page:Page)=>id(page,'receiver-finish-save');
const alert=(page:Page)=>id(page,'receiver-finish-save-alert');
const status=(page:Page)=>id(page,'receiver-finish-save-status');
const choose=(page:Page)=>id(page,'receiver-finish-save-choose');
const back=(page:Page)=>id(page,'receiver-finish-save-back');
const yes=(page:Page)=>id(page,'receiver-record-save-yes');
/** Yes of the finish question: the finish Save dialog with Back focused and no picker call. */
async function openFinishSave(page:Page){
 const calls=(await shim(page)).calls;
 await yes(page).click();
 await expect(box(page)).toBeVisible();await expect(back(page)).toBeFocused();
 expect((await shim(page)).calls).toBe(calls);
}
/** One manual measurement on panel 1 (copied from tests/radio-receiver-record-app.spec.ts), so Clear asks its unsaved question. */
async function recordManual(page:Page,comment:string){
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
}
const lines=(bytes:Buffer)=>bytes.toString('latin1').split('\r\n');
const SAMPLE_ROW=/^-?\d+\.\d{3},-?\d+\.\d{3},-?\d+\.\d{3}$/;
// ---- Project-operation helpers (copied from tests/radio-receiver-record-save-app.spec.ts). Test-only hold: arrayBuffer() of a
// File named held-* waits until releaseRestore(name). Product code is unchanged.
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const saveInvestigation=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const toolbar=(page:Page)=>page.locator('.investigation-toolbar');
const holdRestoreReads=(page:Page)=>page.addInitScript(()=>{
 type Hold={release:()=>void};const w=window as unknown as{__held:Map<string,Hold>};w.__held=new Map();
 const read=Blob.prototype.arrayBuffer;
 Blob.prototype.arrayBuffer=function(this:Blob){
  if(!(this instanceof File&&this.name.startsWith('held-')))return read.call(this);
  const self=this,name=this.name;return new Promise<ArrayBuffer>((resolve,reject)=>w.__held.set(name,{release:()=>{read.call(self).then(resolve,reject);}}));
 };
});
const restoreHeld=(page:Page,name:string)=>expect.poll(()=>page.evaluate(n=>(window as unknown as{__held:Map<string,unknown>}).__held.has(n),name)).toBe(true);
const releaseRestore=(page:Page,name:string)=>page.evaluate(n=>{const m=(window as unknown as{__held:Map<string,{release:()=>void}>}).__held,h=m.get(n)!;m.delete(n);h.release();},name);
/** Whether the restore file's read has started (it is held); false when Restore was refused before reading it. */
const restoreRead=(page:Page,name:string)=>page.evaluate(n=>(window as unknown as{__held:Map<string,unknown>}).__held.has(n),name);
/** Pulsar Analysis while the finish holds the committed capture lease: Load disabled, the lease shown, no picker reachable. */
async function analysisLeased(page:Page){
 await expect(id(page,'pulsar-file')).toBeDisabled();await expect(id(page,'pulsar-leased')).toHaveAttribute('data-phase','committed');
}

test('Yes opens the finish Save without a picker; one Choose writes, closes and reads back; the finish ends on Radio with no Analysis and Load free',async({page})=>{
 await installShim(page);
 const points=await captureToQuestion(page,'PSR B2358+38');
 // The test's own probe, independent of the product's data-support: a secure context, the synthetic picker and the real stream API.
 expect(await page.evaluate(()=>window.isSecureContext)).toBe(true);await assertSynthetic(page);
 expect(await page.evaluate(()=>typeof FileSystemFileHandle==='function'&&'createWritable' in FileSystemFileHandle.prototype
  &&typeof FileSystemWritableFileStream==='function')).toBe(true);
 await expect(yes(page)).toBeEnabled();await expect(yes(page)).toHaveAttribute('aria-haspopup','dialog');
 const reason=id(page,'receiver-record-save-yes-reason');
 await expect(reason).toHaveAttribute('data-support','ok');await expect(reason).toContainText('not the original Save dialog');
 await expect(reason).toContainText('ends this finish');await expect(reason).toContainText('Web default button: Cancel');
 await openFinishSave(page);
 await expect(id(page,'receiver-record-save')).toHaveCount(0);// not the R-RX16 arming dialog
 await expect(id(page,'receiver-card-0')).toHaveAttribute('inert','');await expect(page.locator('.portal-header')).toHaveAttribute('inert','');
 await expect(box(page).locator('h3')).toHaveText('Save the new recording (web Save with verification)');
 await expect(id(page,'receiver-finish-save-intro')).toContainText('Only a verified copy ends the finish');
 await expect(id(page,'receiver-finish-save-intro')).toContainText('Pulsar Analysis is not opened');
 await expect(id(page,'receiver-finish-save-scope')).toContainText(`${points} rows`);
 await expect(id(page,'receiver-finish-save-loss-samples')).toContainText(`of ${Number(points)*3} samples change`);
 await expect(id(page,'receiver-finish-save-origin')).toContainText('not an observation');
 await expect(id(page,'receiver-finish-save-warning')).toContainText('can replace or empty it');
 await expect(back(page)).toHaveText('Back to the finish question');
 // The dialog keeps the capture lease: on the hidden route Load is disabled; back on Radio the same dialog returns.
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();await analysisLeased(page);
 await hashTo(page,'#radio-control');await expect(box(page)).toBeVisible();await expect(back(page)).toBeFocused();
 expect((await shim(page)).calls).toBe(0);
 await plan(page,{name:'finish-copy.PLR'});await assertSynthetic(page);
 await choose(page).click();
 await expect(box(page)).toHaveCount(0);await expect(finish(page)).toHaveCount(0);
 await expect(heading(page,'Radio telescope control')).toBeVisible();await expect(id(page,'receiver-record')).toBeFocused();
 await expect(id(page,'receiver-status-0')).toContainText('Verified copy saved as “finish-copy.PLR”');
 await expect(id(page,'receiver-status-0')).toContainText('Pulsar Analysis was not opened');
 const s=await shim(page);
 expect(s.calls).toBe(1);expect(s.events).toEqual(['click']);
 expect(JSON.parse(s.options[0])).toEqual({suggestedName:'openvireo-model-capture.PLR',types:[{description:'.PLR',accept:{'application/octet-stream':['.PLR']}}]});
 expect(s.log).toEqual(['createWritable:finish-copy.PLR','write:finish-copy.PLR','close:finish-copy.PLR','getFile:finish-copy.PLR']);
 const saved=await opfs(page,'finish-copy.PLR'),l=lines(saved);
 expect(saved.toString('latin1').endsWith('\r\n')).toBe(true);expect(l.pop()).toBe('');expect(l.length).toBe(Number(points)+4);
 expect(l[0]).toBe("'PSR B2358+38',100,0");for(const row of l.slice(4))expect(row).toMatch(SAMPLE_ROW);
 // Pulsar Analysis (opened by the learner now): the same memory capture, marked written, lease released, Load asks nothing.
 await toAnalysis(page);
 await expect(id(page,'pulsar-prop-file')).toHaveText('finish-copy.PLR');await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: finish-copy.PLR');
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points);await expect(id(page,'pulsar-memory-origin')).toContainText('not an observation');
 await expect(id(page,'pulsar-leased')).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeEnabled();
 const chooser=page.waitForEvent('filechooser');await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toHaveCount(0);
 await (await chooser).setFiles([]);await flush(page);await expect(id(page,'pulsar-memory')).toBeVisible();
 // The next Record asks only the erase question (+0x97 set); Cancel keeps the data and the file is untouched by it.
 await toRadio(page);await id(page,'receiver-record').click();
 await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','erase');await id(page,'receiver-record-cancel').click();
 expect((await opfs(page,'finish-copy.PLR')).equals(saved)).toBe(true);expect((await shim(page)).calls).toBe(1);
});

test('failures and refusals stay in the finish Save dialog with the lease held; Back → Cancel keeps the data unsaved and Load Yes stays gated',async({page})=>{
 await installShim(page);
 await captureToQuestion(page);
 await seed(page,'existing.PLR','KEEP ME\r\n');
 await openFinishSave(page);
 const attempts:readonly (readonly [string,Plan,'write'|'close'|'getFile'|'tamper'|null,string])[]=[
  ['cancel',{name:'existing.PLR',truncate:true,reject:'AbortError'},null,'picker-cancelled'],
  ['async refusal',{name:'refused.PLR',reject:'SecurityError'},null,'picker-refused'],
  ['sync refusal',{name:'sync.PLR',throwSync:true},null,'picker-refused'],
  ['write',{name:'write-fail.PLR'},'write','write-failed'],
  ['close',{name:'close-fail.PLR'},'close','close-failed'],
  ['read-back',{name:'read-fail.PLR'},'getFile','readback-failed'],
  ['tamper',{name:'tamper.PLR'},'tamper','mismatch'],
 ];
 for(const [label,p,stage,code] of attempts){
  if(stage==='tamper')await tamper(page,p.name);else if(stage)await failAt(page,stage,p.name);
  await plan(page,p);await assertSynthetic(page);await clearLog(page);
  await choose(page).click();
  await expect(alert(page),label).toHaveAttribute('data-code',code);
  await expect(box(page)).toBeVisible();await expect(finish(page)).toHaveCount(0);
  await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
  if(stage!==null)await expect(alert(page)).toContainText('cannot restore');
  const log=(await shim(page)).log;
  if(stage==='write')expect(log).toEqual([`createWritable:${p.name}`,`write:${p.name}`,`abort:${p.name}`]);
  if(stage==='close'){expect(log).toEqual([`createWritable:${p.name}`,`write:${p.name}`,`close:${p.name}`,`abort:${p.name}`]);expect(await rawWritable(page,p.name)).toBe(false);}
 }
 expect((await opfs(page,'existing.PLR')).byteLength).toBe(0);// the cancelled choice emptied it, as a browser may
 // A name without .PLR: not written by the product; Choose again is a new click and a new picker call.
 await clearLog(page);await plan(page,{name:'notes.txt',truncate:true});await assertSynthetic(page);
 await choose(page).click();
 await expect(alert(page)).toHaveAttribute('data-code','extension');await expect(choose(page)).toHaveText('Choose again…');expect((await shim(page)).log).toEqual([]);
 const s=await shim(page);expect(s.calls).toBe(8);expect(s.events).toEqual(Array(8).fill('click'));
 // Every failure kept the lease: Load is still disabled on the hidden route.
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();await analysisLeased(page);
 await hashTo(page,'#radio-control');await expect(box(page)).toBeVisible();
 // Back → the finish question with Cancel focused; Enter there ends the finish and keeps the data unsaved.
 await back(page).click();
 await expect(finish(page)).toHaveAttribute('data-stage','save');await expect(id(page,'receiver-record-save-cancel')).toBeFocused();
 await expect(id(page,'receiver-status-0')).toContainText('may already have been created, emptied or changed');
 await page.keyboard.press('Enter');
 await expect(finish(page)).toHaveCount(0);await expect(id(page,'receiver-status-0')).toHaveText(KEPT);
 await toAnalysis(page);
 await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeEnabled();
 // Since R-RX18 the Load question's Yes follows the test's own capability probe; it is not pressed here, so no picker is called.
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 const capable=await saveCapable(page);
 await expect(id(page,'pulsar-load-yes-reason')).toHaveAttribute('data-support',capable?'ok':/^(insecure-context|no-api)$/);
 if(capable)await expect(id(page,'pulsar-load-yes')).toBeEnabled();else await expect(id(page,'pulsar-load-yes')).toBeDisabled();
 await expect(id(page,'pulsar-load-cancel')).toBeFocused();
 await id(page,'pulsar-load-cancel').click();expect((await shim(page)).calls).toBe(8);
});

test('hiding the route during a held write abandons the attempt for good; lease and claim stay held until the product cleanup, then Back → Cancel releases',async({page})=>{
 await installShim(page);
 await captureToQuestion(page);
 await openFinishSave(page);
 await holdAt(page,'write','hidden.PLR');await plan(page,{name:'hidden.PLR'});await assertSynthetic(page);await clearLog(page);
 await choose(page).click();
 await waiting(page,'write','hidden.PLR');await expect(status(page)).toHaveAttribute('data-code','writing');
 await expect(choose(page)).toHaveAttribute('aria-disabled','true');await expect(back(page)).toHaveAttribute('aria-disabled','true');
 await expect(id(page,'receiver-finish-save-pending')).toBeVisible();
 // Pulsar Analysis during the radio tail: Load disabled by the lease; no Save or Download can reach a picker.
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();await analysisLeased(page);
 const calls=(await shim(page)).calls;
 // The lease disables both raw openers (PulsarAnalysis rawDisabled includes `leased`): present, disabled, never clicked.
 await expect(id(page,'pulsar-save-capture')).toHaveCount(1);await expect(id(page,'pulsar-save-capture')).toBeDisabled();
 await expect(id(page,'pulsar-raw-export')).toHaveCount(1);await expect(id(page,'pulsar-raw-export')).toBeDisabled();
 expect((await shim(page)).calls).toBe(calls);
 // Back on Radio while the stream is still held: abandoned, never resumed; Choose and Back inert.
 await hashTo(page,'#radio-control');await expect(box(page)).toBeVisible();
 await expect(alert(page)).toHaveAttribute('data-code','abandoned');await expect(alert(page)).toContainText('still holds the data');
 await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
 await expect(status(page)).toHaveAttribute('data-code','busy');await expect(status(page)).toContainText('waiting for its file stream to close');
 await expect(choose(page)).toHaveAttribute('aria-disabled','true');await expect(back(page)).toHaveAttribute('aria-disabled','true');
 // FORCED MOUSE CLICK: `force` skips only actionability checks such as receiving events
 // (https://playwright.dev/docs/actionability#forcing-actions); it is no guarantee that a click arrives. Test-owned capture
 // listeners witness that each click actually reached the intended button; the unchanged dialog and picker count then witness
 // that the product's guards refused it.
 await page.evaluate(()=>{
  const log:string[]=[];(window as unknown as {__rx17ForcedClickWitness:string[]}).__rx17ForcedClickWitness=log;
  for(const testId of ['receiver-finish-save-back','receiver-finish-save-choose']){
   const button=document.querySelector(`[data-testid="${testId}"]`);if(!button)throw new Error('missing guarded button');
   button.addEventListener('click',()=>log.push(testId),{capture:true,once:true});
  }
 });
 await back(page).click({force:true});await choose(page).click({force:true});
 expect(await page.evaluate(()=>(window as unknown as {__rx17ForcedClickWitness:string[]}).__rx17ForcedClickWitness))
  .toEqual(['receiver-finish-save-back','receiver-finish-save-choose']);
 await page.keyboard.press('Escape');await flush(page);
 await expect(box(page)).toBeVisible();await expect(finish(page)).toHaveCount(0);expect((await shim(page)).calls).toBe(calls);
 await release(page,'write','hidden.PLR');
 await expect(status(page)).toHaveText('');await expect(choose(page)).not.toHaveAttribute('aria-disabled','true');
 await expect(back(page)).not.toHaveAttribute('aria-disabled','true');
 expect((await shim(page)).log).toEqual(['createWritable:hidden.PLR','write:hidden.PLR','abort:hidden.PLR']);
 await expect(alert(page)).toHaveAttribute('data-code','abandoned');await expect(box(page)).toBeVisible();
 // The settled dead attempt released nothing but its own output claim: the capture lease is still held, nothing is marked.
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();await analysisLeased(page);
 await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);
 await hashTo(page,'#radio-control');await expect(box(page)).toBeVisible();
 await back(page).click();await expect(finish(page)).toHaveAttribute('data-stage','save');await id(page,'receiver-record-save-cancel').click();
 await expect(finish(page)).toHaveCount(0);await expect(id(page,'receiver-status-0')).toHaveText(KEPT);
 await toAnalysis(page);await expect(id(page,'pulsar-file')).toBeEnabled();await expect(id(page,'pulsar-leased')).toHaveCount(0);
 await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
});

test('DEFENSIVE HOST INJECTION: Restore during a held finish write is refused before the file is read (capture); the owned write continues to its verified read-back',async({page})=>{
 // DEFENSIVE HOST INJECTION, NOT A USER-GESTURE WITNESS: the App header and toolbar are inert while the finish Save is presented,
 // so an ordinary user cannot start a project operation there. This test sets the restore input's file programmatically to
 // exercise the defensive path only; it claims nothing about the original runtime. No product hook, no inert removal.
 // Phase 1 item 1.5 preflight: while the finish holds the committed capture lease, Restore is refused with the capture reason
 // before its file is read, so no project operation or cancel span starts and the owned write is not abandoned. Only the
 // completed byte read-back marks the copy as verified; the refused Restore grants nothing.
 await holdRestoreReads(page);await installShim(page);
 await startApp(page);
 const bytes=await saveInvestigation(page);// the App's own investigation bytes (a known safe restore fixture)
 await setupReceiver(page);const points=await captureFromReceiver(page);
 await openFinishSave(page);
 await holdAt(page,'write','busy-op.PLR');await plan(page,{name:'busy-op.PLR'});await assertSynthetic(page);await clearLog(page);
 await choose(page).click();await waiting(page,'write','busy-op.PLR');await expect(status(page)).toHaveAttribute('data-code','writing');
 const calls=(await shim(page)).calls;
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'held-restore.json',mimeType:'application/json',buffer:bytes});
 await expect(toolbar(page).locator('[role="alert"]')).toHaveText('Nothing was changed: a receiver Record is armed, capturing or finishing. Finish or disarm it first.');
 await flush(page);
 expect(await restoreRead(page,'held-restore.json'),'the file was never read').toBe(false);
 await expect(toolbar(page).getByText('Cancel pending save/restore',{exact:true})).toHaveCount(0);
 // The same defensive injection for Save: the inert toolbar button is clicked programmatically (HTMLElement.click(), not a user
 // gesture). Save is refused with the capture reason before any project operation starts: no download and no Cancel span.
 const downloads:string[]=[];page.on('download',d=>downloads.push(d.suggestedFilename()));
 await page.evaluate(()=>{const b=Array.from(document.querySelectorAll<HTMLButtonElement>('.investigation-toolbar button')).find(x=>x.textContent==='Save investigation');
  if(!b)throw new Error('missing Save investigation');b.click();});
 await expect(toolbar(page).locator('[role="alert"]')).toHaveText('Nothing was saved: a receiver Record is armed, capturing or finishing. Finish or disarm it first.');
 await flush(page);expect(downloads,'no investigation download').toEqual([]);
 await expect(toolbar(page).getByText('Cancel pending save/restore',{exact:true})).toHaveCount(0);
 // The same pending writer: the dialog stays, still writing, its controls disabled, no extra picker and no early receipt.
 await expect(box(page)).toBeVisible();await expect(alert(page)).toHaveCount(0);
 await expect(status(page)).toHaveAttribute('data-code','writing');await expect(id(page,'receiver-finish-save-pending')).toBeVisible();
 await expect(choose(page)).toHaveAttribute('aria-disabled','true');await expect(back(page)).toHaveAttribute('aria-disabled','true');
 expect((await shim(page)).calls).toBe(calls);expect((await shim(page)).log).toEqual(['createWritable:busy-op.PLR','write:busy-op.PLR']);
 await expect(id(page,'receiver-status-0')).not.toContainText('Verified copy saved');
 // Release the original write: normal close and read-back; the verified copy ends the finish on Radio (one lease release).
 await release(page,'write','busy-op.PLR');
 await expect(box(page)).toHaveCount(0);await expect(finish(page)).toHaveCount(0);
 await expect(id(page,'receiver-status-0')).toContainText('Verified copy saved as “busy-op.PLR”');
 const s=await shim(page);
 expect(s.calls).toBe(calls);expect(s.log).toEqual(['createWritable:busy-op.PLR','write:busy-op.PLR','close:busy-op.PLR','getFile:busy-op.PLR']);
 const saved=await opfs(page,'busy-op.PLR'),l=lines(saved);
 expect(saved.toString('latin1').endsWith('\r\n')).toBe(true);expect(l.pop()).toBe('');expect(l.length).toBe(Number(points)+4);
 for(const row of l.slice(4))expect(row).toMatch(SAMPLE_ROW);
 // The current capture is kept and owns exactly this receipt; no stale restore replaced it and nothing is still being read.
 await toAnalysis(page);
 await expect(id(page,'pulsar-prop-file')).toHaveText('busy-op.PLR');await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: busy-op.PLR');
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points);await expect(id(page,'pulsar-restored-note')).toHaveCount(0);
 await expect(id(page,'pulsar-leased')).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeEnabled();
 expect(await restoreRead(page,'held-restore.json')).toBe(false);
 // Positive control: with the lease released (and Properties closed) the same Restore now reads its file; Cancel and the late
 // read change nothing.
 await id(page,'pulsar-properties-close').click();
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'held-restore.json',mimeType:'application/json',buffer:bytes});
 await restoreHeld(page,'held-restore.json');
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await releaseRestore(page,'held-restore.json');await flush(page);
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points);await expect(id(page,'pulsar-restored-note')).toHaveCount(0);
 await id(page,'pulsar-properties-open').click();await expect(id(page,'pulsar-prop-file')).toHaveText('busy-op.PLR');await id(page,'pulsar-properties-close').click();
 expect((await opfs(page,'busy-op.PLR')).equals(saved)).toBe(true);expect((await shim(page)).calls).toBe(calls);
});

// SYNTHETIC HOST DIALOG: a plain <dialog data-synthetic="true"> made by this test and opened with showModal(); it stands for a
// controlled host modal over the radio surfaces, not a native OS dialog.
const openHost=(page:Page,testId='synthetic-host-dialog')=>page.evaluate(t=>{const d=document.createElement('dialog');d.dataset.synthetic='true';d.setAttribute('data-testid',t);
 d.textContent='Synthetic host dialog (test-owned)';document.body.append(d);d.showModal();},testId);
const closeHost=async(page:Page,testId='synthetic-host-dialog')=>{
 await page.evaluate(t=>{const d=document.querySelector<HTMLDialogElement>(`dialog[data-synthetic="true"][data-testid="${t}"]`)!;d.close();d.remove();},testId);await flush(page);
};

test('a foreign modal during a held read-back: the receipt is recorded and the finish ends latent (one release); Record is focused once, after the last modal closes',async({page})=>{
 await installShim(page);
 await captureToQuestion(page);
 await openFinishSave(page);
 await holdAt(page,'getFile','foreign.PLR');await plan(page,{name:'foreign.PLR'});await assertSynthetic(page);
 await choose(page).click();await waiting(page,'getFile','foreign.PLR');
 await openHost(page);await expect(id(page,'synthetic-host-dialog')).toBeVisible();await expect(box(page)).toHaveCount(0);
 await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-pending','true');await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-presented','false');
 await release(page,'getFile','foreign.PLR');await flush(page);
 // The finish ended under the host dialog: no Record dialog is pending any more (the foreign modal blocks no owner).
 await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-pending','false');
 // WEB-RX17-10: no focus is taken while a modal is open, also when a second one is stacked and only the top one closes.
 await expect(id(page,'receiver-record')).not.toBeFocused();
 await openHost(page,'synthetic-host-dialog-2');await expect(id(page,'synthetic-host-dialog-2')).toBeVisible();
 await closeHost(page,'synthetic-host-dialog-2');await expect(id(page,'receiver-record')).not.toBeFocused();
 // The last modal closes: the one-shot Record focus of the verified exit.
 await closeHost(page);
 await expect(box(page)).toHaveCount(0);await expect(finish(page)).toHaveCount(0);
 await expect(id(page,'receiver-record')).toBeFocused();
 await expect(id(page,'receiver-status-0')).toContainText('Verified copy saved as “foreign.PLR”');
 // Consumed: a newer action (Align, which focuses itself) and a later unrelated modal never move focus back to Record.
 await id(page,'receiver-align').click();await expect(id(page,'receiver-align')).toBeFocused();
 await openHost(page,'synthetic-host-dialog-3');await expect(id(page,'synthetic-host-dialog-3')).toBeVisible();
 await closeHost(page,'synthetic-host-dialog-3');
 await expect(id(page,'receiver-align')).toBeFocused();await expect(id(page,'receiver-record')).not.toBeFocused();
 await toAnalysis(page);await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: foreign.PLR');
 await expect(id(page,'pulsar-file')).toBeEnabled();await expect(id(page,'pulsar-leased')).toHaveCount(0);
});

test('a route hide while a foreign modal covers a verified finish exit drops its Record focus for good',async({page})=>{
 await installShim(page);
 await captureToQuestion(page);
 await openFinishSave(page);
 await holdAt(page,'getFile','hidden-focus.PLR');await plan(page,{name:'hidden-focus.PLR'});await assertSynthetic(page);
 await choose(page).click();await waiting(page,'getFile','hidden-focus.PLR');
 await openHost(page);await expect(id(page,'synthetic-host-dialog')).toBeVisible();
 await release(page,'getFile','hidden-focus.PLR');await flush(page);
 await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-pending','false');
 // Hidden and shown again, both under the host dialog: the pending intent is dropped at the hide, not replayed on return.
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();
 await hashTo(page,'#radio-control');await expect(id(page,'receiver-card-0')).toBeVisible();
 await closeHost(page);await flush(page);
 await expect(id(page,'receiver-record')).not.toBeFocused();
 await expect(finish(page)).toHaveCount(0);await expect(id(page,'receiver-status-0')).toContainText('Verified copy saved as “hidden-focus.PLR”');
 // A later unrelated modal does not replay it either.
 await openHost(page,'synthetic-host-dialog-2');await closeHost(page,'synthetic-host-dialog-2');
 await expect(id(page,'receiver-record')).not.toBeFocused();
});

test('no deadlock: an Analysis Clear question kept on its hidden route does not block the finish Save; the finish ends and the list is kept',async({page})=>{
 await installShim(page);
 // A first capture → No → one measurement, then a second capture to its finish question (the measurement list is kept).
 await captureToQuestion(page);
 await id(page,'receiver-record-save-no').click();await expect(id(page,'pulsar-memory')).toBeVisible();await flush(page);
 await id(page,'pulsar-properties-close').click();await recordManual(page,'kept');await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await toRadio(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','unsaved');
 await id(page,'receiver-record-no').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','erase');
 await id(page,'receiver-record-ok').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await advance(page,400);await id(page,'receiver-mode').click();await untilFinished(page);
 await id(page,'receiver-record-identify-input').fill('SECOND');await id(page,'receiver-record-identify-ok').click();
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await openFinishSave(page);
 // While the finish Save dialog waits, the Analysis Clear question is opened and left open on its hidden route (analysis modal).
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();await analysisLeased(page);
 await expect(id(page,'pulsar-properties')).toBeVisible();await expect(id(page,'pulsar-prop-object')).toHaveText('SECOND');await id(page,'pulsar-properties-close').click();
 await id(page,'pulsar-clear').click();await expect(id(page,'pulsar-clear-dialog')).toBeVisible();
 await hashTo(page,'#radio-control');await expect(box(page)).toBeVisible();
 await plan(page,{name:'busy.PLR'});await assertSynthetic(page);
 await choose(page).click();
 await expect(box(page)).toHaveCount(0);await expect(finish(page)).toHaveCount(0);await expect(id(page,'receiver-record')).toBeFocused();
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-clear-dialog')).toBeVisible();await id(page,'pulsar-clear-cancel').click();
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: busy.PLR');await expect(id(page,'pulsar-file')).toBeEnabled();
});

test('keyboard and gestures: double-click Yes calls no picker; Tab wraps; Escape is Back; a held Escape does not cascade into Cancel; Enter on Choose saves once',async({page})=>{
 await installShim(page);
 await captureToQuestion(page);
 // The second click of the double-click lands on whatever the new dialog shows there; Choose and Back ignore detail > 1.
 await yes(page).dblclick();
 await expect(box(page)).toBeVisible();await flush(page);expect((await shim(page)).calls).toBe(0);
 await back(page).focus();
 await page.keyboard.press('Tab');await expect(choose(page)).toBeFocused();
 await page.keyboard.press('Tab');await expect(back(page)).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(choose(page)).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(back(page)).toBeFocused();
 // Escape is Back: the finish question with Cancel focused; the finish is not cancelled.
 await page.keyboard.press('Escape');await expect(finish(page)).toHaveAttribute('data-stage','save');await expect(id(page,'receiver-record-save-cancel')).toBeFocused();
 // A held Escape from the dialog: its first press is Back, the repeats do not answer the question's Cancel.
 await yes(page).focus();await page.keyboard.press('Enter');await expect(box(page)).toBeVisible();await expect(back(page)).toBeFocused();
 await page.keyboard.down('Escape');await page.keyboard.down('Escape');await page.keyboard.down('Escape');await page.keyboard.up('Escape');await flush(page);
 await expect(finish(page)).toHaveAttribute('data-stage','save');await expect(id(page,'receiver-status-0')).not.toHaveText(KEPT);
 // A held Enter on Yes opens the dialog once; its repeats do not press Back or Choose.
 await yes(page).focus();
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');await flush(page);
 await expect(box(page)).toBeVisible();await expect(back(page)).toBeFocused();expect((await shim(page)).calls).toBe(0);
 // Enter on Choose: one picker call from that key's click; the finish ends with Record focused.
 await plan(page,{name:'keyboard.PLR'});await assertSynthetic(page);
 await choose(page).focus();await page.keyboard.press('Enter');
 await expect(finish(page)).toHaveCount(0);await expect(id(page,'receiver-record')).toBeFocused();
 const s=await shim(page);expect(s.calls).toBe(1);expect(s.events).toEqual(['click']);
 await toAnalysis(page);await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: keyboard.PLR');
});

test('a capture of 0 rows: the dialog shows the build problem with Choose disabled; Back → No opens Analysis with Load enabled',async({page})=>{
 await installShim(page);
 const points=await captureToQuestion(page,undefined,0);
 expect(points).toBe('0');
 await openFinishSave(page);
 await expect(id(page,'receiver-finish-save-problem')).toHaveAttribute('data-code','no-rows');await expect(choose(page)).toBeDisabled();
 await back(page).click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-file')).toBeEnabled();await expect(id(page,'pulsar-leased')).toHaveCount(0);
 expect((await shim(page)).calls).toBe(0);
});

test('unsupported browser API: Yes is disabled with its reason; a scripted click opens nothing; Escape answers Cancel',async({page})=>{
 await installShim(page,true);
 await captureToQuestion(page);
 await expect(yes(page)).toBeDisabled();
 const reason=id(page,'receiver-record-save-yes-reason');
 await expect(reason).toHaveAttribute('data-support','no-api');await expect(reason).toContainText('does not offer the save file picker');
 await expect(reason).toContainText('Web default button: Cancel');
 await yes(page).evaluate(el=>(el as HTMLButtonElement).click());await flush(page);await expect(box(page)).toHaveCount(0);
 await expect(id(page,'receiver-record-save-cancel')).toBeFocused();
 await page.keyboard.press('Escape');await expect(finish(page)).toHaveCount(0);await expect(id(page,'receiver-status-0')).toHaveText(KEPT);
 await toAnalysis(page);await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
});

test('layout: a 40-character capture and 120-character names wrap without overflow in the finish Save dialog and status at 1440, 375 and 320',async({page},info)=>{
 await installShim(page);
 await captureToQuestion(page,'X'.repeat(40));
 await openFinishSave(page);
 for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);await noOverflow(page);
  expect(await box(page).evaluate(el=>el.scrollWidth-el.clientWidth),`finish save dialog overflow at ${width}`).toBeLessThanOrEqual(0);
  await textFits(page,'receiver-finish-save-scope');await textFits(page,'receiver-finish-save-intro');
  await info.attach(`finish-save-dialog-${width}.png`,{body:await page.screenshot({path:info.outputPath(`finish-save-dialog-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
 const longTxt=`${'N'.repeat(120)}.txt`;
 await plan(page,{name:longTxt});await assertSynthetic(page);
 await choose(page).focus();await page.keyboard.press('Enter');
 await expect(alert(page)).toHaveAttribute('data-code','extension');await expect(alert(page)).toContainText(longTxt);
 await info.attach('finish-save-alert-offenders-320.json',{body:JSON.stringify(await offenders(page)),contentType:'application/json'});
 await noOverflow(page);
 expect(await box(page).evaluate(el=>el.scrollWidth-el.clientWidth),'finish save dialog overflow with a long alert at 320').toBeLessThanOrEqual(0);
 await textFits(page,'receiver-finish-save-alert');
 const longName=`${'L'.repeat(120)}.PLR`;
 await plan(page,{name:longName});await assertSynthetic(page);
 await choose(page).focus();await page.keyboard.press('Enter');
 await expect(finish(page)).toHaveCount(0);await expect(id(page,'receiver-status-0')).toContainText(longName);
 for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);
  await info.attach(`finish-save-status-offenders-${width}.json`,{body:JSON.stringify(await offenders(page)),contentType:'application/json'});
  await noOverflow(page);await textFits(page,'receiver-status-0');
  await info.attach(`finish-save-status-${width}.png`,{body:await page.screenshot({path:info.outputPath(`finish-save-status-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
});
