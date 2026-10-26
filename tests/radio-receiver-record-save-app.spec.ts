import {test,expect,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Actual App flows of R-RX16 (docs/RADIO-RECORD-SAVE.md): a receiver capture → Save No → Pulsar Analysis, then Radio Record on the
// unsaved capture → the unsaved question → Yes → the Radio-owned Save dialog → Choose → the erase question. The recording is a
// model-generated capture, not an observation; the catalog and the PLR text are synthetic. Expected strings are the chosen web
// contract, not native oracles; no native Save dialog, OS picker or CLEA behaviour is witnessed here.
// SYNTHETIC PICKER: no native OS dialog is driven. The init script below (the same shim as tests/radio-receiver-save-verified-app.spec.ts)
// replaces window.showSaveFilePicker with a function marked __synthetic that returns REAL FileSystemFileHandle objects of this
// test's own fresh origin-private file system (navigator.storage.getDirectory()), named by the test. The product then uses the
// real createWritable/write/close/getFile stream APIs on them, and the product (not the fixture) aborts and settles its own
// streams. Test-only wrappers can hold or fail a stage, or flip one read-back byte, for names the test marks; unmarked calls go
// to the browser unchanged. No user or native file, no grantPermissions, no browser flags or settings.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
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

// ---- Synthetic picker over this test's OPFS (copied from tests/radio-receiver-save-verified-app.spec.ts).
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
/** Every test checks the synthetic mark before it lets the product call the picker. */
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
const PLR=["'SYNTH',25,1",'400.00,1400.00,0','1.0,2.0,1.0','50000.5,0.01',...Array.from({length:50},(_,i)=>`${i},10,0`)].join('\r\n')+'\r\n';
const UT='2026-10-24T12:00:00';
const NOT_WRITTEN='Data Not Written to File';
const ANALYSIS_BUSY='Record refused: Pulsar Analysis has an open dialog or a file being read. Finish it first; nothing was erased.';
const SUPERSEDED='Record refused: the current pulsar data changed after the question was asked. Nothing was erased; Record is off.';
/** Failure and cancel texts never claim that the chosen destination is untouched. */
const FALSE_COMFORT=/nothing (was|has been) written|file is unchanged|was not changed|unchanged/i;

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
const toAnalysis=async(page:Page)=>{await nav(page,'Radio data').click();await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);};
const toRadio=async(page:Page)=>{await nav(page,'Radio telescope').click();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);};
const finish=(page:Page)=>id(page,'receiver-record-finish');
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}
/** A capture committed through Identify and Properties, then Save No: the unsaved memory capture is shown in Pulsar Analysis. */
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
const prompt=(page:Page)=>id(page,'receiver-record-prompt');
const saveBox=(page:Page)=>id(page,'receiver-record-save');
const alert=(page:Page)=>id(page,'receiver-record-save-alert');
const status=(page:Page)=>id(page,'receiver-record-save-status');
const choose=(page:Page)=>id(page,'receiver-record-save-choose');
const back=(page:Page)=>id(page,'receiver-record-save-back');
/** Radio Record on the unsaved capture, then Yes: the Save dialog with Back focused and no picker call. */
async function openRadioSave(page:Page){
 await id(page,'receiver-record').click();await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');
 const calls=(await shim(page)).calls;
 await id(page,'receiver-record-yes').click();
 await expect(saveBox(page)).toBeVisible();await expect(back(page)).toBeFocused();
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
// ---- Analysis Save helpers (copied from tests/radio-receiver-save-verified-app.spec.ts).
const analysisSave=(page:Page)=>id(page,'pulsar-save-capture-dialog');
const openSave=async(page:Page)=>{await id(page,'pulsar-save-capture').click();await expect(analysisSave(page)).toBeVisible();await expect(id(page,'pulsar-raw-export-cancel')).toBeFocused();};
// ---- Project-operation helpers (copied from tests/radio-receiver-audition-app.spec.ts under distinct names). Test-only hold:
// arrayBuffer() of a File named held-* waits until releaseRestore(name). Product code is unchanged.
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const saveInvestigation=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
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

test('Yes opens the Radio Save dialog without a picker; Choose writes and reads back, then the erase question asks with Cancel focused; OK erases',async({page})=>{
 await installShim(page);
 const points=await captureToAnalysis(page,'PSR B2358+38');
 await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
 await toRadio(page);
 await id(page,'receiver-record').click();
 await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');
 // The test's own runtime probe, independent of the product's data-support: a secure context, the synthetic picker in place and
 // the browser's real writable file stream API (the picker is the shim; the streams are this Chromium's own).
 expect(await page.evaluate(()=>window.isSecureContext)).toBe(true);await assertSynthetic(page);
 expect(await page.evaluate(()=>typeof FileSystemFileHandle==='function'&&'createWritable' in FileSystemFileHandle.prototype
  &&typeof FileSystemWritableFileStream==='function')).toBe(true);
 await expect(id(page,'receiver-record-yes')).toBeEnabled();await expect(id(page,'receiver-record-yes-reason')).toHaveAttribute('data-support','ok');
 await expect(id(page,'receiver-record-yes-reason')).toContainText('not the original Save dialog');
 await expect(id(page,'receiver-record-yes-reason')).toContainText('Web default button: Cancel');
 await expect(id(page,'receiver-record-cancel')).toBeFocused();
 await id(page,'receiver-record-yes').click();
 await expect(saveBox(page)).toBeVisible();await expect(back(page)).toBeFocused();
 expect((await shim(page)).calls).toBe(0);
 // The byte is armed (no refresh yet: the indicator still says Off), nothing is erased, every card is behind the dialog.
 await expect(id(page,'receiver-record-state')).toHaveAttribute('data-armed','true');await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await expect(id(page,'receiver-card-0')).toHaveAttribute('inert','');await expect(page.locator('.portal-header')).toHaveAttribute('inert','');
 await expect(id(page,'receiver-record-save-scope')).toContainText(`${points} rows`);
 await expect(id(page,'receiver-record-save-loss-samples')).toContainText(`of ${Number(points)*3} samples change`);
 await expect(id(page,'receiver-record-save-origin')).toContainText('not an observation');
 await expect(id(page,'receiver-record-save-warning')).toContainText('can replace or empty it');await expect(id(page,'receiver-record-save-warning')).toContainText('cannot restore');
 await expect(id(page,'receiver-record-save-how')).toContainText('does not watch the file');
 await expect(id(page,'receiver-record-save-intro')).toContainText('Nothing is erased or armed from here');
 await plan(page,{name:'radio-copy.PLR'});await assertSynthetic(page);
 await choose(page).click();
 await expect(prompt(page)).toHaveAttribute('data-kind','erase');await expect(prompt(page)).toHaveAttribute('data-verified','true');
 await expect(id(page,'receiver-record-erase-verified')).toContainText('“radio-copy.PLR”');await expect(id(page,'receiver-record-erase-verified')).toContainText('OK still erases');
 await expect(id(page,'receiver-record-prompt-text')).toHaveText('Deleting Previously Recorded Data From Memory');
 // Asynchronous arrival: the web default is Cancel here, not the native default OK.
 await expect(id(page,'receiver-record-cancel')).toBeFocused();
 const s=await shim(page);
 expect(s.calls).toBe(1);expect(s.events).toEqual(['click']);
 expect(JSON.parse(s.options[0])).toEqual({suggestedName:'openvireo-model-capture.PLR',types:[{description:'.PLR',accept:{'application/octet-stream':['.PLR']}}]});
 expect(s.log).toEqual(['createWritable:radio-copy.PLR','write:radio-copy.PLR','close:radio-copy.PLR','getFile:radio-copy.PLR']);
 const saved=await opfs(page,'radio-copy.PLR'),l=lines(saved);
 expect(saved.toString('latin1').endsWith('\r\n')).toBe(true);expect(l.pop()).toBe('');expect(l.length).toBe(Number(points)+4);
 expect(l[0]).toBe("'PSR B2358+38',100,0");for(const row of l.slice(4))expect(row).toMatch(SAMPLE_ROW);
 await expect(id(page,'receiver-status-0')).toContainText('Verified copy saved as “radio-copy.PLR”');
 // The erase question stays latent on a hidden route; Pulsar Analysis shows the receipt on the same, unchanged data.
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: radio-copy.PLR');await expect(id(page,'pulsar-prop-file')).toHaveText('radio-copy.PLR');
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points);await expect(id(page,'pulsar-memory-origin')).toContainText('not an observation');
 await hashTo(page,'#radio-control');await expect(prompt(page)).toHaveAttribute('data-kind','erase');
 await expect(id(page,'receiver-record-erase-verified')).toBeVisible();await expect(id(page,'receiver-record-cancel')).toBeFocused();
 await id(page,'receiver-record-ok').click();
 await expect(prompt(page)).toHaveCount(0);await expect(id(page,'receiver-record-disp')).toHaveText('On');await expect(id(page,'receiver-record-armed')).toBeVisible();
 await toAnalysis(page);
 await expect(id(page,'pulsar-data-notice')).toHaveAttribute('data-kind','empty');await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);
 // Disarm: the lease is released; the file stays as written (nothing deletes it).
 await toRadio(page);await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 expect((await opfs(page,'radio-copy.PLR')).equals(saved)).toBe(true);
});

test('failures and refusals stay in the Save dialog as alerts: no erase question, no receipt; Back → Cancel keeps the data unsaved',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await seed(page,'existing.PLR','KEEP ME\r\n');
 await toRadio(page);await openRadioSave(page);
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
  await expect(saveBox(page)).toBeVisible();await expect(prompt(page)).toHaveCount(0);
  await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
  if(stage!==null)await expect(alert(page)).toContainText('cannot restore');
  const log=(await shim(page)).log;
  if(stage==='write')expect(log).toEqual([`createWritable:${p.name}`,`write:${p.name}`,`abort:${p.name}`]);
  // The product aborts after the rejected close (the fixture does not), so the real stream is no longer writable; the file's
  // contents are not asserted (no rollback or durability claim).
  if(stage==='close'){expect(log).toEqual([`createWritable:${p.name}`,`write:${p.name}`,`close:${p.name}`,`abort:${p.name}`]);expect(await rawWritable(page,p.name)).toBe(false);}
 }
 // The cancelled choice emptied the existing file, as a browser may; the alert does not hide it.
 expect((await opfs(page,'existing.PLR')).byteLength).toBe(0);
 // A name without .PLR: not written by the product; Choose again is a new click and a new picker call.
 await seed(page,'notes.txt','MY NOTES\r\n');await clearLog(page);
 await plan(page,{name:'notes.txt',truncate:true});await assertSynthetic(page);
 await choose(page).click();
 await expect(alert(page)).toHaveAttribute('data-code','extension');await expect(alert(page)).toContainText('may already have created or emptied');
 await expect(choose(page)).toHaveText('Choose again…');expect((await shim(page)).log).toEqual([]);
 const s=await shim(page);expect(s.calls).toBe(8);expect(s.events).toEqual(Array(8).fill('click'));
 // Back (explicit) → the unsaved question, Cancel focused; Enter there keeps the data and turns Record off.
 await back(page).click();
 await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');await expect(id(page,'receiver-record-cancel')).toBeFocused();
 await expect(id(page,'receiver-status-0')).toContainText('may already have been created, emptied or changed');
 await page.keyboard.press('Enter');
 await expect(prompt(page)).toHaveCount(0);await expect(id(page,'receiver-status-0')).toHaveText('Record cancelled; the previous data is kept.');
 await expect(id(page,'receiver-record-state')).toHaveAttribute('data-armed','false');
 await toAnalysis(page);
 await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);await expect(id(page,'pulsar-memory')).toBeVisible();
 // No → erase is still explicit: the unsaved question returns, its No asks the erase question, whose Cancel keeps the data.
 await toRadio(page);await id(page,'receiver-record').click();await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');
 await id(page,'receiver-record-no').click();await expect(prompt(page)).toHaveAttribute('data-kind','erase');await expect(prompt(page)).not.toHaveAttribute('data-verified','true');
 await expect(id(page,'receiver-record-ok')).toBeFocused();await id(page,'receiver-record-cancel').click();
 await toAnalysis(page);await expect(id(page,'pulsar-memory')).toBeVisible();await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
});

test('hiding the route during a held write abandons the attempt; the shared claim refuses Analysis Save and Download until the product cleanup settles',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await toRadio(page);await openRadioSave(page);
 await holdAt(page,'write','hidden.PLR');await plan(page,{name:'hidden.PLR'});await assertSynthetic(page);await clearLog(page);
 await choose(page).click();
 await waiting(page,'write','hidden.PLR');await expect(status(page)).toHaveAttribute('data-code','writing');
 await expect(choose(page)).toHaveAttribute('aria-disabled','true');await expect(back(page)).toHaveAttribute('aria-disabled','true');
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();
 // Analysis Save during the radio tail: the dialog opens, but Choose is refused before any picker call.
 const calls=(await shim(page)).calls;
 await id(page,'pulsar-save-capture').click();await expect(id(page,'pulsar-save-capture-dialog')).toBeVisible();
 // No picker plan is queued: this guarded request must stop before the picker, leaving no unused name for the later retry.
 await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(id(page,'pulsar-raw-export-alert')).toHaveAttribute('data-code','not-ready');expect((await shim(page)).calls).toBe(calls);
 await expect(id(page,'pulsar-raw-export-alert')).toContainText('from the Radio Record question');
 await id(page,'pulsar-raw-export-cancel').click();await expect(id(page,'pulsar-save-capture-dialog')).toHaveCount(0);
 // The raw download is refused the same way (no download is requested).
 await id(page,'pulsar-raw-export').click();await expect(id(page,'pulsar-raw-export-dialog')).toBeVisible();
 let downloads=0;page.on('download',()=>{downloads++;});
 await id(page,'pulsar-raw-export-download').click();await expect(id(page,'pulsar-raw-export-alert')).toHaveAttribute('data-code','not-ready');
 await expect(id(page,'pulsar-raw-export-alert')).toContainText('from the Radio Record question');
 await flush(page);expect(downloads).toBe(0);
 await id(page,'pulsar-raw-export-cancel').click();await expect(id(page,'pulsar-raw-export-dialog')).toHaveCount(0);
 // Back on Radio while the stream is still held: abandoned, Choose and Back inert.
 await hashTo(page,'#radio-control');await expect(saveBox(page)).toBeVisible();
 await expect(alert(page)).toHaveAttribute('data-code','abandoned');await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
 await expect(status(page)).toHaveAttribute('data-code','busy');await expect(status(page)).toContainText('waiting for its file stream to close');
 await expect(choose(page)).toHaveAttribute('aria-disabled','true');await expect(back(page)).toHaveAttribute('aria-disabled','true');
 // FORCED MOUSE CLICK: `force` can skip non-essential actionability checks, including the hit-target check
 // (https://playwright.dev/docs/actionability#forcing-actions). Test-owned capture listeners prove each actual click
 // reaches the intended button; unchanged dialog/picker assertions then witness that the product guards refuse it.
 await page.evaluate(()=>{
  const log:string[]=[];(window as unknown as {__rx16ForcedClickWitness:string[]}).__rx16ForcedClickWitness=log;
  for(const testId of ['receiver-record-save-back','receiver-record-save-choose']){
   const button=document.querySelector(`[data-testid="${testId}"]`);if(!button)throw new Error('missing guarded button');
   button.addEventListener('click',()=>log.push(testId),{capture:true,once:true});
  }
 });
 await back(page).click({force:true});await choose(page).click({force:true});
 expect(await page.evaluate(()=>(window as unknown as {__rx16ForcedClickWitness:string[]}).__rx16ForcedClickWitness))
  .toEqual(['receiver-record-save-back','receiver-record-save-choose']);
 await page.keyboard.press('Escape');await flush(page);
 await expect(saveBox(page)).toBeVisible();expect((await shim(page)).calls).toBe(calls);
 await release(page,'write','hidden.PLR');
 await expect(status(page)).toHaveText('');await expect(choose(page)).not.toHaveAttribute('aria-disabled','true');
 await expect(back(page)).not.toHaveAttribute('aria-disabled','true');
 expect((await shim(page)).log).toEqual(['createWritable:hidden.PLR','write:hidden.PLR','abort:hidden.PLR']);
 await expect(alert(page)).toHaveAttribute('data-code','abandoned');await expect(prompt(page)).toHaveCount(0);
 // Nothing was marked; Back works again; the Analysis Save works again after the release.
 await back(page).click();await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');await id(page,'receiver-record-cancel').click();
 await toAnalysis(page);await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);
 await id(page,'pulsar-save-capture').click();await plan(page,{name:'after-tail.PLR'});await assertSynthetic(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(id(page,'pulsar-save-capture-dialog')).toHaveCount(0);await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: after-tail.PLR');
});

test('no deadlock: an Analysis dialog kept on its hidden route does not block the Radio Save; the erase OK is then refused and the receipt kept',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await id(page,'pulsar-properties-close').click();await recordManual(page,'kept');
 await toRadio(page);await openRadioSave(page);
 // While the Save dialog waits, the Analysis Clear question is opened and left open on its hidden route (analysis modal).
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();
 await id(page,'pulsar-clear').click();await expect(id(page,'pulsar-clear-dialog')).toBeVisible();
 await hashTo(page,'#radio-control');await expect(saveBox(page)).toBeVisible();
 await plan(page,{name:'busy.PLR'});await assertSynthetic(page);
 await choose(page).click();
 await expect(prompt(page)).toHaveAttribute('data-kind','erase');await expect(id(page,'receiver-record-cancel')).toBeFocused();
 await id(page,'receiver-record-ok').click();
 await expect(id(page,'receiver-status-0')).toHaveText(ANALYSIS_BUSY);await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-clear-dialog')).toBeVisible();await id(page,'pulsar-clear-cancel').click();
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: busy.PLR');await expect(id(page,'pulsar-memory')).toBeVisible();
 // Record again: +0x97 is set now, so only the erase question (native default OK when reached directly).
 await toRadio(page);await id(page,'receiver-record').click();
 await expect(prompt(page)).toHaveAttribute('data-kind','erase');await expect(prompt(page)).not.toHaveAttribute('data-verified','true');
 await expect(id(page,'receiver-record-ok')).toBeFocused();await id(page,'receiver-record-cancel').click();
 await toAnalysis(page);await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: busy.PLR');
});

test('a dataset change after the Record press makes Yes superseded: Record off, nothing erased, no dialog',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await toRadio(page);
 await id(page,'receiver-record').click();await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');
 // Load a file in Pulsar Analysis meanwhile (its own unsaved question → No → chooser).
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 await expect(id(page,'pulsar-load-yes')).toBeDisabled();// E9 stays gated
 const chooser=page.waitForEvent('filechooser');await id(page,'pulsar-load-no').click();
 await (await chooser).setFiles({name:'later.plr',mimeType:'application/octet-stream',buffer:Buffer.from(PLR,'latin1')});
 await expect(id(page,'pulsar-file-name')).toHaveText('later.plr');
 await hashTo(page,'#radio-control');await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');
 await id(page,'receiver-record-yes').click();
 await expect(prompt(page)).toHaveCount(0);await expect(saveBox(page)).toHaveCount(0);
 await expect(id(page,'receiver-status-0')).toHaveText(SUPERSEDED);await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await expect(id(page,'receiver-record')).toBeFocused();
 expect((await shim(page)).calls).toBe(0);
 await toAnalysis(page);await expect(id(page,'pulsar-file-name')).toHaveText('later.plr');await expect(id(page,'pulsar-memory')).toHaveCount(0);
});

test('a Load in Pulsar Analysis while the verified erase question waits: the note goes, Cancel stays the default, OK is refused superseded',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await toRadio(page);await openRadioSave(page);
 await plan(page,{name:'noted.PLR'});await assertSynthetic(page);
 await choose(page).click();
 await expect(prompt(page)).toHaveAttribute('data-kind','erase');await expect(id(page,'receiver-record-erase-verified')).toContainText('“noted.PLR”');
 await expect(id(page,'receiver-record-cancel')).toBeFocused();
 // The receipt makes the data saved, so Load asks nothing and the chooser opens from the same click.
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();
 const chooser=page.waitForEvent('filechooser');await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toHaveCount(0);
 await (await chooser).setFiles({name:'later.plr',mimeType:'application/octet-stream',buffer:Buffer.from(PLR,'latin1')});
 await expect(id(page,'pulsar-file-name')).toHaveText('later.plr');
 // Back on Radio: the same question, reached asynchronously (Cancel default, data-verified), but the receipt it named is gone.
 await hashTo(page,'#radio-control');await expect(prompt(page)).toHaveAttribute('data-kind','erase');
 await expect(id(page,'receiver-record-erase-verified')).toHaveCount(0);await expect(id(page,'receiver-record-erase-default')).toBeVisible();
 await expect(id(page,'receiver-record-cancel')).toBeFocused();await expect(prompt(page)).toHaveAttribute('data-verified','true');
 await expect(prompt(page)).not.toContainText('marked as written');
 // The card may retain its success result, but it must describe that previous capture historically, not claim the replacement is memory data.
 await expect(id(page,'receiver-status-0')).toContainText('was marked as written at the time of the check');
 await expect(id(page,'receiver-status-0')).not.toContainText('The recording is marked as written');
 await expect(id(page,'receiver-status-0')).not.toContainText('still a model-generated recording held in this tab');
 await id(page,'receiver-record-ok').click();
 await expect(prompt(page)).toHaveCount(0);
 await expect(id(page,'receiver-status-0')).toHaveText(SUPERSEDED);await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 expect((await shim(page)).calls).toBe(1);
 await toAnalysis(page);await expect(id(page,'pulsar-file-name')).toHaveText('later.plr');await expect(id(page,'pulsar-memory')).toHaveCount(0);
});

test('reverse ownership: a held Analysis Save refuses Radio Choose (not-ready) until its own cleanup settles; then the Radio Save works',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 // The Radio Save dialog is prepared first, with no attempt.
 await toRadio(page);await openRadioSave(page);
 // Then the Analysis Save starts and is held at its write.
 await hashTo(page,'#pulsar-analysis');await expect(id(page,'pulsar-analysis')).toBeVisible();
 await openSave(page);await holdAt(page,'write','analysis-held.PLR');await plan(page,{name:'analysis-held.PLR'});await assertSynthetic(page);await clearLog(page);
 await id(page,'pulsar-save-capture-choose').click();await waiting(page,'write','analysis-held.PLR');
 // Radio Choose during the Analysis tail: an ordinary click (it is not aria-disabled), refused before any picker call.
 await hashTo(page,'#radio-control');await expect(saveBox(page)).toBeVisible();
 const calls=(await shim(page)).calls;await assertSynthetic(page);
 await expect(choose(page)).not.toHaveAttribute('aria-disabled','true');
 await choose(page).click();
 await expect(id(page,'receiver-record-save-refusal')).toHaveAttribute('data-code','not-ready');
 await expect(id(page,'receiver-record-save-refusal')).toContainText('another save attempt is still finishing');
 expect((await shim(page)).calls).toBe(calls);await expect(prompt(page)).toHaveCount(0);await expect(saveBox(page)).toBeVisible();
 // The hidden Analysis attempt is dead; its own cleanup aborts the stream and then releases the shared claim.
 await release(page,'write','analysis-held.PLR');
 await expect.poll(async()=>(await shim(page)).log).toEqual(['createWritable:analysis-held.PLR','write:analysis-held.PLR','abort:analysis-held.PLR']);
 await clearLog(page);await plan(page,{name:'radio-after.PLR'});await assertSynthetic(page);
 await choose(page).click();
 await expect(prompt(page)).toHaveAttribute('data-kind','erase');await expect(id(page,'receiver-record-erase-verified')).toContainText('“radio-after.PLR”');
 await expect(id(page,'receiver-record-cancel')).toBeFocused();
 await id(page,'receiver-record-cancel').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 // The Analysis dialog kept its abandoned notice on its hidden route; closing it keeps the Radio receipt.
 await hashTo(page,'#pulsar-analysis');await expect(analysisSave(page)).toBeVisible();
 await expect(id(page,'pulsar-save-capture-alert')).toHaveAttribute('data-code','abandoned');
 await id(page,'pulsar-raw-export-cancel').click();await expect(analysisSave(page)).toHaveCount(0);
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: radio-after.PLR');await expect(id(page,'pulsar-memory')).toBeVisible();
});

test('DEFENSIVE HOST INJECTION: a project operation during a held Radio write abandons the attempt (busy) until the product cleanup settles',async({page})=>{
 // DEFENSIVE HOST INJECTION, NOT A USER-GESTURE WITNESS: the App header and toolbar are inert while the Radio Save is presented,
 // so an ordinary user cannot start a project operation there. This test sets the restore input's file programmatically to
 // exercise the defensive `busy` path only; it claims nothing about the original runtime. No product hook, no inert removal.
 await holdRestoreReads(page);await installShim(page);
 await captureToAnalysis(page);
 const bytes=await saveInvestigation(page);// the App's own investigation bytes (a known safe restore fixture)
 await toRadio(page);await openRadioSave(page);
 await holdAt(page,'write','busy-op.PLR');await plan(page,{name:'busy-op.PLR'});await assertSynthetic(page);await clearLog(page);
 await choose(page).click();await waiting(page,'write','busy-op.PLR');await expect(status(page)).toHaveAttribute('data-code','writing');
 const calls=(await shim(page)).calls;
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'held-restore.json',mimeType:'application/json',buffer:bytes});
 await restoreHeld(page,'held-restore.json');await expect(saveBox(page)).toHaveCount(0);
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await releaseRestore(page,'held-restore.json');await flush(page);
 await expect(saveBox(page)).toBeVisible();
 await expect(alert(page)).toHaveAttribute('data-code','abandoned');await expect(alert(page)).toContainText('a project operation started');
 await expect(alert(page)).not.toHaveText(FALSE_COMFORT);
 await expect(status(page)).toHaveAttribute('data-code','busy');
 await expect(choose(page)).toHaveAttribute('aria-disabled','true');await expect(back(page)).toHaveAttribute('aria-disabled','true');
 expect((await shim(page)).calls).toBe(calls);
 await release(page,'write','busy-op.PLR');
 await expect(status(page)).toHaveText('');
 expect((await shim(page)).log).toEqual(['createWritable:busy-op.PLR','write:busy-op.PLR','abort:busy-op.PLR']);
 await expect(prompt(page)).toHaveCount(0);
 await back(page).click();await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');await id(page,'receiver-record-cancel').click();
 await toAnalysis(page);await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
});

test('keyboard and gestures: double-click and held Enter on Yes call no picker; Tab wraps; Escape is Back; Enter on Choose calls the picker once',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await toRadio(page);
 await id(page,'receiver-record').click();await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');
 // The second click of the double-click lands on whatever the new dialog shows there; Choose and Back ignore detail > 1.
 await id(page,'receiver-record-yes').dblclick();
 await expect(saveBox(page)).toBeVisible();await flush(page);expect((await shim(page)).calls).toBe(0);
 // That second press may move focus to the page; the keyboard checks start from Back.
 await back(page).focus();
 // Tab stays inside: Choose and Back.
 await page.keyboard.press('Tab');await expect(choose(page)).toBeFocused();
 await page.keyboard.press('Tab');await expect(back(page)).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(choose(page)).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(back(page)).toBeFocused();
 // Escape is Back: the unsaved question with Cancel focused.
 await page.keyboard.press('Escape');await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');await expect(id(page,'receiver-record-cancel')).toBeFocused();
 // A held Enter on Yes opens the dialog once; its repeats do not press Back or Choose.
 await id(page,'receiver-record-yes').focus();
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');await flush(page);
 await expect(saveBox(page)).toBeVisible();await expect(back(page)).toBeFocused();expect((await shim(page)).calls).toBe(0);
 // Enter on Choose: one picker call from that key's click.
 await plan(page,{name:'keyboard.PLR'});await assertSynthetic(page);
 await choose(page).focus();await page.keyboard.press('Enter');
 await expect(prompt(page)).toHaveAttribute('data-kind','erase');await expect(id(page,'receiver-record-cancel')).toBeFocused();
 const s=await shim(page);expect(s.calls).toBe(1);expect(s.events).toEqual(['click']);
 // A held Enter on the focused Cancel answers it once; nothing is erased.
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect(prompt(page)).toHaveCount(0);await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await toAnalysis(page);await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: keyboard.PLR');await expect(id(page,'pulsar-memory')).toBeVisible();
});

test('a foreign modal during a held read-back: the receipt is recorded, the erase question waits latent and appears after it closes',async({page})=>{
 await installShim(page);
 await captureToAnalysis(page);
 await toRadio(page);await openRadioSave(page);
 // SYNTHETIC HOST DIALOG: a plain <dialog data-synthetic="true"> made by this test and opened with showModal(); it stands for a
 // controlled host modal over the radio surfaces, not a native OS dialog.
 const openHost=()=>page.evaluate(()=>{const d=document.createElement('dialog');d.dataset.synthetic='true';d.setAttribute('data-testid','synthetic-host-dialog');
  d.textContent='Synthetic host dialog (test-owned)';document.body.append(d);d.showModal();});
 const closeHost=()=>page.evaluate(()=>{const d=document.querySelector<HTMLDialogElement>('dialog[data-synthetic="true"]')!;d.close();d.remove();});
 await holdAt(page,'getFile','foreign.PLR');await plan(page,{name:'foreign.PLR'});await assertSynthetic(page);
 await choose(page).click();await waiting(page,'getFile','foreign.PLR');
 await openHost();await expect(id(page,'synthetic-host-dialog')).toBeVisible();await expect(saveBox(page)).toHaveCount(0);
 await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-pending','true');await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-presented','false');
 await release(page,'getFile','foreign.PLR');await flush(page);
 // Committed meanwhile; nothing is presented over the host dialog.
 await expect(prompt(page)).toHaveCount(0);
 await closeHost();
 await expect(prompt(page)).toHaveAttribute('data-kind','erase');await expect(id(page,'receiver-record-erase-verified')).toContainText('“foreign.PLR”');
 await expect(id(page,'receiver-record-cancel')).toBeFocused();
 await id(page,'receiver-record-cancel').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await toAnalysis(page);await expect(id(page,'pulsar-save-capture-last-file')).toHaveText('Last verified copy: foreign.PLR');
});

test('unsupported browser API: Yes is disabled with its reason; No and Cancel still work and the capture stays unsaved',async({page})=>{
 await installShim(page,true);
 await captureToAnalysis(page);
 await toRadio(page);
 await id(page,'receiver-record').click();await expect(prompt(page)).toHaveAttribute('data-kind','unsaved');
 await expect(id(page,'receiver-record-yes')).toBeDisabled();
 await expect(id(page,'receiver-record-yes-reason')).toHaveAttribute('data-support','no-api');
 await expect(id(page,'receiver-record-yes-reason')).toContainText('does not offer the save file picker');
 await expect(id(page,'receiver-record-yes-reason')).toContainText('Web default button: Cancel');
 await id(page,'receiver-record-yes').evaluate(el=>(el as HTMLButtonElement).click());await flush(page);await expect(saveBox(page)).toHaveCount(0);
 await expect(id(page,'receiver-record-cancel')).toBeFocused();
 await id(page,'receiver-record-no').click();await expect(prompt(page)).toHaveAttribute('data-kind','erase');
 await id(page,'receiver-record-cancel').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await toAnalysis(page);await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
});

test('E4 and E9 stay gated: the finish Save question and the analysis Load question keep Yes disabled',async({page})=>{
 await installShim(page);
 await startApp(page);await setupReceiver(page);
 await id(page,'receiver-record').click();await id(page,'receiver-mode').click();await flush(page);await advance(page,400);await id(page,'receiver-mode').click();await flush(page);
 await untilFinished(page);await id(page,'receiver-record-identify-ok').click();await id(page,'receiver-record-properties-ok').click();
 await expect(finish(page)).toHaveAttribute('data-stage','save');
 await expect(id(page,'receiver-record-save-yes')).toBeDisabled();await expect(id(page,'receiver-record-save-yes-reason')).toContainText('not ported');
 await expect(id(page,'receiver-record-save-cancel')).toBeFocused();
 await id(page,'receiver-record-save-no').click();await expect(id(page,'pulsar-memory')).toBeVisible();await flush(page);
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 await expect(id(page,'pulsar-load-yes')).toBeDisabled();await id(page,'pulsar-load-cancel').click();
 expect((await shim(page)).calls).toBe(0);
});

test('layout: long names in the Save dialog alert and the verified erase note wrap without overflow at 1440, 375 and 320',async({page},info)=>{
 await installShim(page);
 await captureToAnalysis(page,'X'.repeat(40));
 await toRadio(page);await openRadioSave(page);
 for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);await noOverflow(page);
  expect(await saveBox(page).evaluate(el=>el.scrollWidth-el.clientWidth),`save dialog overflow at ${width}`).toBeLessThanOrEqual(0);
  await textFits(page,'receiver-record-save-scope');
  await info.attach(`radio-save-dialog-${width}.png`,{body:await page.screenshot({path:info.outputPath(`radio-save-dialog-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
 const longTxt=`${'N'.repeat(120)}.txt`;
 await plan(page,{name:longTxt});await assertSynthetic(page);
 await choose(page).focus();await page.keyboard.press('Enter');
 await expect(alert(page)).toHaveAttribute('data-code','extension');await expect(alert(page)).toContainText(longTxt);
 await info.attach('radio-save-alert-offenders-320.json',{body:JSON.stringify(await offenders(page)),contentType:'application/json'});
 await noOverflow(page);
 expect(await saveBox(page).evaluate(el=>el.scrollWidth-el.clientWidth),'save dialog overflow with a long alert at 320').toBeLessThanOrEqual(0);
 await textFits(page,'receiver-record-save-alert');
 const longName=`${'L'.repeat(120)}.PLR`;
 await plan(page,{name:longName});await assertSynthetic(page);
 await choose(page).focus();await page.keyboard.press('Enter');
 await expect(prompt(page)).toHaveAttribute('data-kind','erase');await expect(id(page,'receiver-record-erase-verified')).toContainText(longName);
 for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);
  await info.attach(`radio-save-erase-offenders-${width}.json`,{body:JSON.stringify(await offenders(page)),contentType:'application/json'});
  await noOverflow(page);
  expect(await prompt(page).evaluate(el=>el.scrollWidth-el.clientWidth),`erase prompt overflow at ${width}`).toBeLessThanOrEqual(0);
  await textFits(page,'receiver-record-erase-verified');
  await info.attach(`radio-save-erase-${width}.png`,{body:await page.screenshot({path:info.outputPath(`radio-save-erase-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
 await id(page,'receiver-record-cancel').click();await expect(prompt(page)).toHaveCount(0);
});
