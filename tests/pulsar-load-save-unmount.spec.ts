import {test,expect,type FileChooser,type Locator,type Page} from '@playwright/test';
// R-RX18 WEB-RX18-08 (docs/PULSAR-LOAD-SAVE.md): a REAL unmount of the Pulsar Analysis panel while a Load after Save flow read or
// a Save attempt is pending. The App keeps its panel mounted, so the unmount is driven by a TEST-ONLY host
// (tests/fixtures/pulsar-load-save-unmount-host.ts), imported through the Vite dev server after the real App has loaded. The host
// owns its own dataset, which survives the child's unmount, and shows read-only monitors of it. Every locator is scoped to that host.
// The capture is SYNTHETIC (public pure constructors), not observed CLEA data and not a receiver simulation run.
// SYNTHETIC PICKER: no native OS dialog is driven. The init script (copied from tests/pulsar-load-save-app.spec.ts) replaces
// window.showSaveFilePicker with a function marked __synthetic that returns REAL FileSystemFileHandle objects of this test's own
// origin-private file system; every Save Choose is preceded by assertSynthetic. The Load chooser is Playwright's intercepted
// `filechooser` event of the product's own dedicated <input type=file> (its identity and host are checked); no OS chooser opens.
// Test-only hooks: a hold of File.arrayBuffer for files named held-*, a one-shot hold of crypto.subtle.digest, and test-owned
// completion counters of both, so a late continuation is known to have run before the assertions. Expected values are this web
// contract, not native oracles; no native-equivalence claim.
const HOST='pulsar-unmount-host';
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}

// ---- Synthetic picker over this test's OPFS and the read holds (copied from tests/pulsar-load-save-app.spec.ts), plus counters.
type Plan={name:string};
type Shim={synthetic:true;calls:number;plans:Plan[];log:string[];holds:Set<string>;waiting:Map<string,()=>void>};
type Stream={write:(data:unknown)=>Promise<void>;close:()=>Promise<void>;abort:(reason?:unknown)=>Promise<void>};
type Holds={held:Map<string,()=>void>;settled:number;digestHold:boolean;digestWaiting:(()=>void)|null;digests:number;digestSettled:number};
const installShim=(page:Page)=>page.addInitScript(()=>{
 const w=window as unknown as {__saveShim:Shim;__holds:Holds};
 const proto=FileSystemFileHandle.prototype as unknown as {createWritable:(this:FileSystemFileHandle,...a:unknown[])=>Promise<Stream>;getFile:(this:FileSystemFileHandle)=>Promise<File>};
 const create=proto.createWritable,getFile=proto.getFile;
 const s:Shim={synthetic:true,calls:0,plans:[],log:[],holds:new Set(),waiting:new Map()};
 w.__saveShim=s;
 const gate=(stage:string,name:string)=>{const key=`${stage}:${name}`;if(!s.holds.has(key))return Promise.resolve();s.holds.delete(key);return new Promise<void>(r=>s.waiting.set(key,r));};
 proto.createWritable=async function(this:FileSystemFileHandle,...args:unknown[]){
  const name=this.name;s.log.push(`createWritable:${name}`);
  const stream=await create.apply(this,args);
  const write=stream.write.bind(stream),close=stream.close.bind(stream),abort=stream.abort.bind(stream);
  stream.write=async data=>{s.log.push(`write:${name}`);await gate('write',name);return write(data);};
  stream.close=async()=>{s.log.push(`close:${name}`);await gate('close',name);return close();};
  stream.abort=async reason=>{s.log.push(`abort:${name}`);return abort(reason);};
  return stream;
 };
 proto.getFile=async function(this:FileSystemFileHandle){const name=this.name;s.log.push(`getFile:${name}`);await gate('getFile',name);return getFile.call(this);};
 const picker=function(){
  s.calls++;
  const p=s.plans.shift();
  if(!p)return Promise.reject(new DOMException('no synthetic plan','AbortError'));
  return (async()=>{const dir=await navigator.storage.getDirectory();return dir.getFileHandle(p.name,{create:true});})();
 };
 (picker as unknown as {__synthetic:boolean}).__synthetic=true;
 Object.defineProperty(window,'showSaveFilePicker',{value:picker,configurable:true,writable:true});
 // Read holds: File.arrayBuffer of a file named held-* waits for release; the next digest waits when digestHold is set. The counters
 // increase after the real operation settled and its promise was resolved, so the product's continuation is queued behind it.
 const h:Holds={held:new Map(),settled:0,digestHold:false,digestWaiting:null,digests:0,digestSettled:0};w.__holds=h;
 const read=Blob.prototype.arrayBuffer;
 Blob.prototype.arrayBuffer=function(this:Blob){
  if(!(this instanceof File&&this.name.startsWith('held-')))return read.call(this);
  const self=this,name=this.name;
  return new Promise<ArrayBuffer>((resolve,reject)=>h.held.set(name,()=>{read.call(self).then(b=>{resolve(b);h.settled++;},e=>{reject(e);h.settled++;});}));
 };
 const subtle=SubtleCrypto.prototype as unknown as {digest:(this:unknown,...a:unknown[])=>Promise<ArrayBuffer>};
 const digest=subtle.digest;
 subtle.digest=function(this:unknown,...args:unknown[]){
  h.digests++;
  if(!h.digestHold)return digest.apply(this,args);
  h.digestHold=false;const self=this;
  return new Promise<ArrayBuffer>((resolve,reject)=>{h.digestWaiting=()=>{digest.apply(self,args).then(b=>{resolve(b);h.digestSettled++;},e=>{reject(e);h.digestSettled++;});};});
 };
});
const shimLog=(page:Page)=>page.evaluate(()=>[...(window as unknown as {__saveShim:Shim}).__saveShim.log]);
const assertSynthetic=async(page:Page)=>expect(await page.evaluate(()=>(window as unknown as {showSaveFilePicker?:{__synthetic?:boolean}}).showSaveFilePicker?.__synthetic)).toBe(true);
const plan=(page:Page,p:Plan)=>page.evaluate(q=>{(window as unknown as {__saveShim:Shim}).__saveShim.plans.push(q);},p);
const holdAt=(page:Page,stage:'write',name:string)=>page.evaluate(k=>{(window as unknown as {__saveShim:Shim}).__saveShim.holds.add(k);},`${stage}:${name}`);
const waiting=(page:Page,stage:string,name:string)=>expect.poll(()=>page.evaluate(k=>(window as unknown as {__saveShim:Shim}).__saveShim.waiting.has(k),`${stage}:${name}`)).toBe(true);
const release=(page:Page,stage:string,name:string)=>page.evaluate(k=>{const s=(window as unknown as {__saveShim:Shim}).__saveShim,r=s.waiting.get(k)!;s.waiting.delete(k);r();},`${stage}:${name}`);
const holds=(page:Page)=>page.evaluate(()=>{const h=(window as unknown as {__holds:Holds}).__holds;return {settled:h.settled,digests:h.digests,digestSettled:h.digestSettled};});
const heldRead=(page:Page,name:string)=>expect.poll(()=>page.evaluate(n=>(window as unknown as {__holds:Holds}).__holds.held.has(n),name)).toBe(true);
const releaseRead=(page:Page,name:string)=>page.evaluate(n=>{const m=(window as unknown as {__holds:Holds}).__holds.held,r=m.get(n)!;m.delete(n);r();},name);
const holdDigest=(page:Page)=>page.evaluate(()=>{(window as unknown as {__holds:Holds}).__holds.digestHold=true;});
const digestWaiting=(page:Page)=>expect.poll(()=>page.evaluate(()=>(window as unknown as {__holds:Holds}).__holds.digestWaiting!==null)).toBe(true);
const releaseDigest=(page:Page)=>page.evaluate(()=>{const h=(window as unknown as {__holds:Holds}).__holds,r=h.digestWaiting!;h.digestWaiting=null;r();});
function choosers(page:Page){const list:FileChooser[]=[];page.on('filechooser',c=>{list.push(c);});return list;}
/** Uncaught page errors and console errors of the whole test. */
function errors(page:Page){const list:string[]=[];page.on('pageerror',e=>{list.push(`pageerror: ${e.message}`);});page.on('console',m=>{if(m.type()==='error')list.push(`console: ${m.text()}`);});return list;}

/** A synthetic PLR text (not a CLEA recording), as in tests/pulsar-load-save-app.spec.ts. */
const PLR=Buffer.from(["'SYNTH LOAD',25,1",'400.00,1400.00,0','1.0,0,1.0','50000.5,0.01','0,10,0','1,10,0'].join('\r\n')+'\r\n','latin1');
const plrFile=(name:string)=>({name,mimeType:'application/octet-stream',buffer:PLR});

/** The real App first (another route than Pulsar Analysis, so its own panel is inactive), then the test-only host. */
async function openHost(page:Page):Promise<Locator>{
 await page.goto('/#pulsar-analysis');await expect(page.getByRole('heading',{level:1,name:'Recorded pulsar analysis',includeHidden:true})).toBeVisible();
 await page.locator('.portal-header nav').getByRole('button',{name:'Radio telescope',exact:true}).click();
 await expect(page.getByRole('heading',{level:1,name:'Radio telescope control',includeHidden:true})).toBeVisible();
 // A string expression, so the test transpiler never rewrites the browser's dynamic import.
 await page.evaluate(`import(${JSON.stringify('/tests/fixtures/pulsar-load-save-unmount-host.ts')}).then(m=>{m.mountUnmountHost();})`);
 const host=page.getByTestId(HOST);
 await expect(host).toHaveCount(1);
 return host;
}
const out=(host:Locator,name:string)=>host.getByTestId(`uh-${name}`);
/** Seed generation 1 with the synthetic memory capture, then mount the child panel on the host's owner. */
async function seedAndMount(host:Locator){
 await out(host,'seed').click();await expect(out(host,'seed-result')).toHaveText('ok');
 await expect(out(host,'generation')).toHaveText('1');await expect(out(host,'origin')).toHaveText('memory');await expect(out(host,'seeded')).toHaveText('true');
 await out(host,'mount').click();await expect(host.getByTestId('pulsar-analysis')).toHaveCount(1);await expect(host.getByTestId('pulsar-memory')).toBeVisible();
 await expect(out(host,'activity')).toHaveText('false/false');
}
/** Load → the unsaved question → Yes: the flow's Save dialog. */
async function yesToSave(host:Locator){
 await host.getByTestId('pulsar-file').click();await expect(host.getByTestId('pulsar-load-dialog')).toBeVisible();
 await host.getByTestId('pulsar-load-yes').click();
 await expect(host.getByTestId('pulsar-load-dialog')).toHaveCount(0);await expect(host.getByTestId('pulsar-save-capture-dialog')).toBeVisible();
}
/** The flow's verified Save, the Load choice, then a fresh Choose of the dedicated input inside this host. */
async function saveReadyChoose(page:Page,host:Locator,name:string,seen:FileChooser[]){
 await plan(page,{name});await assertSynthetic(page);
 await host.getByTestId('pulsar-save-capture-choose').click();
 await expect(host.getByTestId('pulsar-save-capture-dialog')).toHaveCount(0);await expect(host.getByTestId('pulsar-load-save-dialog')).toBeVisible();
 await expect(out(host,'receipt')).toHaveText(name);await expect(out(host,'claim')).toHaveText('null');
 const before=seen.length;
 await host.getByTestId('pulsar-load-save-choose').click();
 await expect.poll(()=>seen.length).toBe(before+1);
 const c=seen[seen.length-1];
 expect(await c.element().evaluate(el=>el instanceof Element?el.getAttribute('data-testid'):null)).toBe('pulsar-load-save-file');
 expect(await c.element().evaluate((el,id)=>el instanceof Element&&el.closest(`[data-testid="${id}"]`)!==null,HOST)).toBe(true);
 await expect(host.getByTestId('pulsar-load-save-dialog')).toHaveAttribute('data-phase','choosing');
 return c;
}
/**
 * Unmount the child through the host's own button. A dispatched click: while the Save dialog is modal the rest of the page,
 * this button included, is inert for user input, and the test needs the unmount in exactly that state.
 */
async function unmountChild(host:Locator){
 await out(host,'unmount').evaluate(el=>{el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));});
 await expect(out(host,'child')).toHaveText('unmounted');
 await expect(host.getByTestId('pulsar-analysis')).toHaveCount(0);await expect(host.getByTestId('pulsar-reading')).toHaveCount(0);
}
/** The owner after an abandoned flow read: the seeded capture and its receipt unchanged, idle, no claim. */
async function ownerUnchanged(host:Locator,receipt:string){
 await expect(out(host,'generation')).toHaveText('1');await expect(out(host,'rows')).toHaveText('20');
 await expect(out(host,'origin')).toHaveText('memory');await expect(out(host,'seeded')).toHaveText('true');
 await expect(out(host,'receipt')).toHaveText(receipt);await expect(out(host,'claim')).toHaveText('null');
 await expect(out(host,'activity')).toHaveText('false/false');
}

test('unmount during a held flow arrayBuffer: the late read stops before SHA-256 and changes nothing on the surviving owner',async({page})=>{
 await installShim(page);const seen=choosers(page),errs=errors(page);
 const host=await openHost(page);await seedAndMount(host);
 await yesToSave(host);const c=await saveReadyChoose(page,host,'unmount-a.PLR',seen);
 await c.setFiles(plrFile('held-a.PLR'));
 await heldRead(page,'held-a.PLR');await expect(host.getByTestId('pulsar-reading')).toContainText('held-a.PLR');
 await expect(out(host,'activity')).toHaveText('false/true');
 const before=await holds(page);
 await unmountChild(host);
 // Withdrawn in the commit that removed the panel, before the read settles.
 await expect(out(host,'activity')).toHaveText('false/false');
 await releaseRead(page,'held-a.PLR');
 await expect.poll(async()=>(await holds(page)).settled).toBe(before.settled+1);
 await flush(page);
 await ownerUnchanged(host,'unmount-a.PLR');
 // No SHA-256 was started by the late continuation.
 expect((await holds(page)).digests).toBe(before.digests);
 expect(errs).toEqual([]);
});

test('unmount during a held flow digest: the late read imports nothing and the receipt stays',async({page})=>{
 await installShim(page);const seen=choosers(page),errs=errors(page);
 const host=await openHost(page);await seedAndMount(host);
 await yesToSave(host);const c=await saveReadyChoose(page,host,'unmount-b.PLR',seen);
 await holdDigest(page);await c.setFiles(plrFile('digest-wait.PLR'));
 await digestWaiting(page);await expect(host.getByTestId('pulsar-reading')).toContainText('digest-wait.PLR');
 await expect(out(host,'activity')).toHaveText('false/true');
 const before=await holds(page);
 await unmountChild(host);
 await expect(out(host,'activity')).toHaveText('false/false');
 await releaseDigest(page);
 await expect.poll(async()=>(await holds(page)).digestSettled).toBe(before.digestSettled+1);
 await flush(page);
 await ownerUnchanged(host,'unmount-b.PLR');
 expect(errs).toEqual([]);
});

test('unmount during a held Save write: the claim stays until the attempt aborts its stream, then exactly it is released; no receipt',async({page})=>{
 await installShim(page);const errs=errors(page);
 const host=await openHost(page);await seedAndMount(host);
 await yesToSave(host);
 const name='unmount-c.PLR';
 await plan(page,{name});await holdAt(page,'write',name);await assertSynthetic(page);
 await host.getByTestId('pulsar-save-capture-choose').click();
 await waiting(page,'write',name);
 const claim=await out(host,'claim').textContent();
 expect(claim).toMatch(/^analysis:\d+$/);
 await expect(out(host,'activity')).toHaveText('true/false');
 await unmountChild(host);
 // The modal session is withdrawn from the owner at once; the output claim is NOT released by the unmount itself.
 await expect(out(host,'activity')).toHaveText('false/false');
 await flush(page);
 await expect(out(host,'claim')).toHaveText(claim!);
 // The held write completes; the dead attempt aborts its open stream, never closes it, then releases exactly its own claim.
 await release(page,'write',name);
 await expect(out(host,'claim')).toHaveText('null');
 await flush(page);
 const log=await shimLog(page);
 expect(log).toContain(`abort:${name}`);expect(log).not.toContain(`close:${name}`);expect(log).not.toContain(`getFile:${name}`);
 await expect(out(host,'receipt')).toHaveText('');
 await expect(out(host,'generation')).toHaveText('1');await expect(out(host,'origin')).toHaveText('memory');await expect(out(host,'seeded')).toHaveText('true');
 expect(errs).toEqual([]);
});
