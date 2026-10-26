import {test,expect,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Actual App flows of the R-RX13 web trace audition (docs/RADIO-RECEIVER-AUDITION.md) on the #radio-control route. No product
// debug hook: only the rendered App, its data attributes, the browser clock control, the test-only read hold, and a test-only
// init script that replaces the page's AudioContext constructor. By default it is a deterministic fake context (no device);
// mode real:true constructs the browser's own AudioContext and only spies on the calls (call-through). Nothing here claims
// that any sound was heard, nor any native CLEA audio, timing or waveform equivalence. Catalog and PLR text are synthetic.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const restore=(page:Page,name:string,text:string)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text,'utf8')});
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
const holdReads=(page:Page)=>page.addInitScript(()=>{
 type Hold={release:()=>void};const w=window as unknown as{__held:Map<string,Hold>};w.__held=new Map();
 const read=Blob.prototype.arrayBuffer;
 Blob.prototype.arrayBuffer=function(this:Blob){
  if(!(this instanceof File&&this.name.startsWith('held-')))return read.call(this);
  const self=this,name=this.name;return new Promise<ArrayBuffer>((resolve,reject)=>w.__held.set(name,{release:()=>{read.call(self).then(resolve,reject);}}));
 };
});
const held=(page:Page,name:string)=>expect.poll(()=>page.evaluate(n=>(window as unknown as{__held:Map<string,unknown>}).__held.has(n),name)).toBe(true);
const release=(page:Page,name:string)=>page.evaluate(n=>{const m=(window as unknown as{__held:Map<string,{release:()=>void}>}).__held,h=m.get(n)!;m.delete(n);h.release();},name);

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
const CATALOG=[{primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'},{primaryName:'J1200-3000',legacyName:'B1157-29',ra:'180',dec:'-30'}].map(line).join('\r\n')+'\r\n';
const PLR=["'SYNTH',25,1",'400.00,1400.00,0','1.0,2.0,1.0','50000.5,0.01',...Array.from({length:50},(_,i)=>`${i},10,0`)].join('\r\n')+'\r\n';
const UT='2026-10-24T12:00:00';

async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();await expect(id(page,'pulsar-none')).toBeVisible();
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
/** Tracking on, catalog loaded and clock applied, without a receiver window. */
async function prepareReceiver(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-receiver.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
 await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await id(page,'radio-clock-longitude').click();
}
async function openReceiver(page:Page){
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-heading-0')).toBeFocused();
}
async function setupReceiver(page:Page){await prepareReceiver(page);await openReceiver(page);}
const toAnalysis=async(page:Page)=>{await nav(page,'Radio data').click();await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);};
const toRadio=async(page:Page)=>{await nav(page,'Radio telescope').click();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);};
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}
// ---- Radio configuration helpers (copied from radio-simulation-options-app.spec.ts).
const numeric=(page:Page)=>id(page,'radio-access-numeric'),full=(page:Page)=>id(page,'radio-options-full');
const field=(page:Page,f:string)=>id(page,`radio-options-field-${f}`);
async function demonstration(page:Page){await id(page,'radio-access-demo').click();await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','demonstration');}
async function optIn(page:Page,host=true){
 await id(page,`radio-access-numeric-optin-${host}`).click();
 await expect(numeric(page)).toHaveAttribute('data-authority','compiled-branch');await expect(numeric(page)).toHaveAttribute('data-host-predicate',String(host));
}
async function openFull(page:Page){
 await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-parent')).toBeVisible();
 await id(page,'radio-access-radio').click();await expect(full(page)).toBeVisible();await expect(field(page,'horizon90c')).toBeFocused();
}
async function fullOk(page:Page,outer:'ok'|'cancel'='cancel'){
 await id(page,'radio-access-child-ok').click();await expect(full(page)).toHaveCount(0);
 await id(page,`radio-access-parent-${outer}`).click();await expect(id(page,'radio-access-parent')).toHaveCount(0);
}
/** Sets the live Radio Simulation Options Gain (+0x924) through the full Radio configuration form. */
async function setGain(page:Page,text:string){await openFull(page);await field(page,'gain924').fill(text);await fullOk(page);}

/** Receive, let a few frames run, Stop, and let the sweep finish. */
async function receiveAndFinish(page:Page){
 await id(page,'receiver-mode').click();await advance(page,400);await id(page,'receiver-mode').click();await untilFinished(page);
}

// ---- Test-only Web Audio instrumentation (init script; product code unchanged).
type Mode=Partial<{initial:string;ctor:boolean;buffer:boolean;connect:boolean;start:boolean;resume:'resolve'|'reject'|'never';close:'sync'|'reject'|'deferred';real:boolean}>;
const instrument=(page:Page,unsupported=false)=>page.addInitScript(no=>{
 type Any=Record<string,any>;// eslint-disable-line @typescript-eslint/no-explicit-any
 const w=window as unknown as Any;
 w.__mode={};w.__log=[];w.__ctx=[];w.__resume=[];w.__closeLater=[];
 const log=(s:string)=>{w.__log.push(s);};
 const Real=w.AudioContext;w.__hasReal=typeof Real==='function';
 delete w.webkitAudioContext;
 if(no){delete w.AudioContext;return;}
 class FakeCtx{
  state:string;destination={fake:true};onstatechange:(()=>void)|null=null;buffers:Any[]=[];sources:Any[]=[];
  constructor(readonly m:Any,readonly n:number){this.state=m.initial??'running';}
  set(s:string){this.state=s;this.onstatechange?.();}
  createBuffer(c:number,l:number,r:number){
   log(`createBuffer#${this.n}:${c},${l},${r}`);if(this.m.buffer)throw new Error('buffer');
   const b:Any={c,l,r,data:null,copyToChannel:(d:Float32Array)=>{b.data=Array.from(d);}};this.buffers.push(b);return b;
  }
  createBufferSource(){
   const n=this.n,m=this.m,dest=this.destination;
   const s:Any={buffer:null,onended:null,connect(d:unknown){log(`connect#${n}:${d===dest}`);if(m.connect)throw new Error('connect');},disconnect(){log(`disconnect#${n}`);},
    start(){log(`start#${n}`);if(m.start)throw new Error('start');},stop(){log(`stop#${n}`);}};
   this.sources.push(s);return s;
  }
  resume(){
   log(`resume#${this.n}`);const r=this.m.resume??'resolve';
   return new Promise<void>((res,rej)=>{if(r==='reject'){rej(new Error('blocked'));return;}const go=()=>{if(this.state!=='closed')this.set('running');res();};if(r==='resolve')go();else w.__resume.push(go);});
  }
  close(){
   log(`close#${this.n}`);const c=this.m.close??'sync';
   if(c==='reject')return Promise.reject(new Error('close'));
   if(c==='deferred')return new Promise<void>(res=>{w.__closeLater.push(()=>{this.set('closed');res();});});
   this.set('closed');return Promise.resolve();
  }
 }
 const spied=(n:number)=>{
  const ctx=new Real() as Any;
  for(const k of ['resume','close']){const f=ctx[k].bind(ctx);ctx[k]=(...a:unknown[])=>{log(`${k}#${n}`);return f(...a);};}
  const cb=ctx.createBuffer.bind(ctx);ctx.createBuffer=(c:number,l:number,r:number)=>{log(`createBuffer#${n}:${c},${l},${r}`);return cb(c,l,r);};
  const cs=ctx.createBufferSource.bind(ctx);
  ctx.createBufferSource=()=>{const s=cs();for(const k of ['start','stop','disconnect']){const f=s[k].bind(s);s[k]=(...a:unknown[])=>{log(`${k}#${n}`);return f(...a);};}return s;};
  return ctx;
 };
 class Audition{constructor(){
  const m={...w.__mode},n=w.__ctx.length+1;log(`ctor#${n}`);
  if(m.ctor)throw new Error('ctor');
  const ctx=m.real?spied(n):new FakeCtx(m,n);w.__ctx.push(ctx);return ctx;
 }}
 w.AudioContext=Audition;
},unsupported);
const setMode=(page:Page,m:Mode)=>page.evaluate(x=>{(window as unknown as{__mode:Mode}).__mode=x;},m);
type Audit={log:string[];states:string[];count:number};
const audit=(page:Page):Promise<Audit>=>page.evaluate(()=>{const w=window as unknown as{__log:string[];__ctx:{state:string}[]};return {log:[...w.__log],states:w.__ctx.map(c=>c.state),count:w.__ctx.length};});
const open=async(page:Page)=>(await audit(page)).states.filter(s=>s!=='closed').length;
const btn=(page:Page,slot:number)=>id(page,`receiver-audition-button-${slot}`);
const status=(page:Page,slot:number)=>id(page,`receiver-audition-status-${slot}`);
const group=(page:Page,slot:number)=>id(page,`receiver-audition-${slot}`);
const T={
 playing1:'Playing the stored trace of Receiver 1: columns 1 to 399, 997.5 ms.',playing2:'Playing the stored trace of Receiver 2: columns 0 to 399, 1000 ms.',
 starting:'Starting the audition…',user:'Sound stopped.',finished:'Audition finished.',replaced:"Sound stopped: another receiver's audition was requested.",
 changed:'Sound stopped: this receiver, its settings or its stored trace changed.',route:'Sound stopped: the Radio telescope route was hidden. It does not resume by itself.',
 page:'Sound stopped: the page was hidden. It does not resume by itself.',busy:'Sound stopped: a project operation started.',modal:'Sound stopped: a dialog or box opened over the receivers.',
 blocked:'The browser did not start the sound. Press the button again to retry.',pending:'The previous sound is still being released. Press the button again in a moment.',
 cleanupFailed:'The browser did not release the previous sound, so no new sound is started. Reload the page to use the audition again.',
 noTrace:'No stored trace yet: receive, then stop. A changed title also erases the stored trace, even when the display still shows it.',
 receiving:'Not available while receiving. Press Mode to stop and wait for the sweep to finish.',finishing:'Not available until the sweep finishes.',
 negativeGain:'This web audition does not support the negative Gain used to create this receiver. Its trace and data are unchanged. A changed Gain applies to a newly opened receiver.',
 missingRow:/^Column \d+ has no usable stored display value \(it may be missing or outside the display range\), so the trace cannot be auditioned\. Receiving again with the same settings may not resolve it\.$/,
};
const errorsOf=(page:Page)=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));return errors;};
/** Plays a slot and waits until it is shown as playing. */
async function play(page:Page,slot:number){await btn(page,slot).click();await expect(group(page,slot)).toHaveAttribute('data-phase','playing');}

test.describe.configure({timeout:120_000});

test('silent until an admitted press; refusals while receiving or finishing; play and stop the main trace without changing the session',async({page})=>{
 const errors=errorsOf(page);await instrument(page);await startApp(page);await setupReceiver(page);
 expect((await audit(page)).count).toBe(0);
 await expect(btn(page,0)).toHaveAttribute('aria-disabled','true');await expect(btn(page,0)).toHaveText('Audition trace');
 await expect(btn(page,0)).toHaveAccessibleName('Audition trace: Receiver 1');
 await expect(id(page,'receiver-audition-reason-0')).toHaveText(T.noTrace);
 await btn(page,0).click({force:true});await expect(status(page,0)).toHaveText(T.noTrace);
 // Receiving and the pending stop: refused with the reason; nothing constructed. Focus stays on a focused button.
 await id(page,'receiver-mode').click();await advance(page,400);
 await btn(page,0).focus();await page.keyboard.press('Enter');await expect(status(page,0)).toHaveText(T.receiving);await expect(btn(page,0)).toBeFocused();
 await id(page,'receiver-mode').click();await expect(id(page,'receiver-sweep-0')).toHaveAttribute('data-stop-pending','true');
 await btn(page,0).click({force:true});await expect(status(page,0)).toHaveText(T.finishing);
 await untilFinished(page);
 expect((await audit(page)).count).toBe(0);
 await expect(btn(page,0)).not.toHaveAttribute('aria-disabled','true');await expect(group(page,0)).toHaveAttribute('data-available','true');
 const snapshot=async()=>({seed:await id(page,'receiver-seed-next').textContent(),position:await id(page,'receiver-sweep-0').getAttribute('data-position'),
  marks:await id(page,'receiver-mark-readout-0').evaluate(el=>[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>`${a.name}=${a.value}`).join(';')),
  canvas:await id(page,'receiver-canvas-0').evaluate(el=>(el as HTMLCanvasElement).toDataURL())});
 const before=await snapshot(),bytes=await save(page);
 // Keyboard press: one context, created in the gesture, with the 8000 Hz main buffer.
 await btn(page,0).focus();await page.keyboard.press('Enter');
 await expect(group(page,0)).toHaveAttribute('data-phase','playing');await expect(status(page,0)).toContainText(T.playing1);
 await expect(btn(page,0)).toHaveText('Stop sound');await expect(btn(page,0)).toHaveAccessibleName('Stop sound: Receiver 1');await expect(btn(page,0)).toBeFocused();
 const a=await audit(page);
 expect(a.count).toBe(1);expect(a.log).toEqual(['ctor#1','createBuffer#1:1,7980,8000','connect#1:true','start#1']);
 const pcm=await page.evaluate(()=>(window as unknown as{__ctx:{buffers:{data:number[]}[]}[]}).__ctx[0].buffers[0].data);
 expect(pcm).toHaveLength(7980);expect(pcm[0]).toBe(0);expect(pcm.at(-1)).toBe(0);
 expect(Math.max(...pcm.map(Math.abs))).toBeLessThanOrEqual(Math.fround(0.2));expect(Math.abs(pcm.reduce((s,v)=>s+v,0)/pcm.length)).toBeLessThan(0.01);
 // Stop: stop, disconnect, close; focus kept; no restart.
 await page.keyboard.press('Enter');await expect(status(page,0)).toHaveText(T.user);await expect(btn(page,0)).toBeFocused();
 expect((await audit(page)).log.slice(4)).toEqual(['stop#1','disconnect#1','close#1']);expect(await open(page)).toBe(0);
 await advance(page,3000);expect((await audit(page)).count).toBe(1);
 expect(await snapshot()).toEqual(before);expect((await save(page)).equals(bytes)).toBe(true);
 // A channel added after the sweep never received: refused.
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();
 await btn(page,1).click({force:true});await expect(status(page,1)).toHaveText(T.noTrace);expect((await audit(page)).count).toBe(1);
 expect(errors).toEqual([]);
});

test('a receiver created with a negative Gain is refused with no context; a channel created with a very large Gain reports a missing value',async({page})=>{
 const errors=errorsOf(page);await instrument(page);await startApp(page);await prepareReceiver(page);
 await optIn(page);await demonstration(page);await setGain(page,'-1');
 await openReceiver(page);await receiveAndFinish(page);
 await expect(btn(page,0)).toHaveAttribute('aria-disabled','true');await expect(id(page,'receiver-audition-reason-0')).toHaveText(T.negativeGain);
 await btn(page,0).click({force:true});await expect(status(page,0)).toHaveText(T.negativeGain);await expect(group(page,0)).toHaveAttribute('data-phase','idle');
 expect((await audit(page)).count).toBe(0);
 // A later live Gain does not change the open receiver's cached gain; the new channel caches it in its own creation.
 await setGain(page,'1E30');await expect(id(page,'receiver-audition-reason-0')).toHaveText(T.negativeGain);
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();await receiveAndFinish(page);
 await expect(id(page,'receiver-audition-reason-0')).toHaveText(T.negativeGain);
 await expect(btn(page,1)).toHaveAttribute('aria-disabled','true');await expect(id(page,'receiver-audition-reason-1')).toHaveText(T.missingRow);
 await btn(page,1).click({force:true});await expect(status(page,1)).toHaveText(T.missingRow);
 expect((await audit(page)).count).toBe(0);
 expect(errors).toEqual([]);
});

test('natural end, end guard, play-stop-play with a pending close, replacement and closing the main window',async({page})=>{
 const errors=errorsOf(page);await instrument(page);await startApp(page);await setupReceiver(page);
 await id(page,'receiver-add').click();await receiveAndFinish(page);
 // A dispatched ended: finished and closed, no restart.
 await play(page,0);
 await page.evaluate(()=>{(window as unknown as{__ctx:{sources:{onended:(()=>void)|null}[]}[]}).__ctx[0].sources[0].onended?.();});
 await expect(status(page,0)).toHaveText(T.finished);expect(await open(page)).toBe(0);
 // Without an ended event, the end guard finishes it (fake clock).
 await play(page,0);await advance(page,1800);await expect(group(page,0)).toHaveAttribute('data-phase','playing');
 await advance(page,400);await expect(status(page,0)).toHaveText(T.finished);expect(await open(page)).toBe(0);expect((await audit(page)).count).toBe(2);
 // Pending close: a new press is refused (no context, no queued start) until the close settles; then a fresh press plays.
 await setMode(page,{close:'deferred'});
 await play(page,0);await btn(page,0).click();await expect(status(page,0)).toHaveText(T.user);
 await btn(page,0).click();await expect(status(page,0)).toHaveText(T.pending);expect((await audit(page)).count).toBe(3);
 await advance(page,3000);expect((await audit(page)).count).toBe(3);await expect(group(page,0)).toHaveAttribute('data-phase','idle');
 await page.evaluate(()=>{for(const f of (window as unknown as{__closeLater:(()=>void)[]}).__closeLater.splice(0))f();});await flush(page);
 await setMode(page,{});
 await play(page,0);expect((await audit(page)).count).toBe(4);expect(await open(page)).toBe(1);
 // Replace: the main's context is closed before the channel's is constructed (the channel's context closes late).
 await setMode(page,{close:'deferred'});
 await btn(page,1).click();await expect(status(page,1)).toContainText(T.playing2);await expect(status(page,0)).toHaveText(T.replaced);
 const log=(await audit(page)).log;expect(log.indexOf('close#4')).toBeGreaterThan(-1);expect(log.indexOf('close#4')).toBeLessThan(log.indexOf('ctor#5'));
 expect(await open(page)).toBe(1);
 // Replace while the old close is pending: the old one stops, the new press is refused and nothing is constructed.
 await btn(page,0).click();await expect(status(page,1)).toHaveText(T.replaced);await expect(status(page,0)).toHaveText(T.pending);
 expect((await audit(page)).count).toBe(5);
 await page.evaluate(()=>{for(const f of (window as unknown as{__closeLater:(()=>void)[]}).__closeLater.splice(0))f();});await flush(page);
 await setMode(page,{});
 // Closing the main window (all windows) while playing stops it.
 await play(page,0);await id(page,'receiver-close-0').click();await expect(id(page,'receiver-card-0')).toHaveCount(0);
 expect(await open(page)).toBe(0);await advance(page,3000);expect((await audit(page)).count).toBe(6);
 expect(errors).toEqual([]);
});

test('pending resume, late release, timeout, rejection, failures and a failed close (no page error)',async({page})=>{
 const errors=errorsOf(page);await instrument(page);await startApp(page);await setupReceiver(page);await receiveAndFinish(page);
 await setMode(page,{initial:'suspended',resume:'never'});
 await btn(page,0).click();await expect(group(page,0)).toHaveAttribute('data-phase','starting');await expect(status(page,0)).toHaveText(T.starting);
 await btn(page,0).click();await expect(status(page,0)).toHaveText(T.user);
 await btn(page,0).click();await expect(status(page,0)).toHaveText(T.starting);expect((await audit(page)).count).toBe(2);
 // The first context's held resume is released late: it starts nothing and does not overwrite the second status.
 await page.evaluate(()=>{(window as unknown as{__resume:(()=>void)[]}).__resume[0]();});await flush(page);
 await expect(status(page,0)).toHaveText(T.starting);expect((await audit(page)).count).toBe(2);
 // The second never settles: blocked after 2000 ms from the press, closed.
 await advance(page,1800);await expect(status(page,0)).toHaveText(T.starting);
 await advance(page,400);await expect(status(page,0)).toHaveText(T.blocked);expect(await open(page)).toBe(0);
 // A resume that resolves later in time plays (the end guard starts only then).
 await btn(page,0).click();await expect(status(page,0)).toHaveText(T.starting);
 await page.evaluate(()=>{(window as unknown as{__resume:(()=>void)[]}).__resume.at(-1)!();});
 await expect(status(page,0)).toContainText(T.playing1);await btn(page,0).click();
 await setMode(page,{initial:'suspended',resume:'reject'});await btn(page,0).click();await expect(status(page,0)).toHaveText(T.blocked);expect(await open(page)).toBe(0);
 const failures:[Mode,string][]=[
  [{ctor:true},'The browser could not open audio output. Nothing is playing.'],[{buffer:true},'The browser could not prepare the sound. Nothing is playing.'],
  [{connect:true},'The browser could not connect the sound to the audio output. Nothing is playing.'],[{start:true},'The browser could not start the sound. Nothing is playing.'],
 ];
 for(const [m,text] of failures){
  await setMode(page,m);await btn(page,0).click();await expect(status(page,0)).toHaveText(text);
  await expect(group(page,0)).toHaveAttribute('data-phase','idle');expect(await open(page)).toBe(0);
 }
 // A close that rejects leaving the context open: the guard refuses every further context.
 await setMode(page,{close:'reject'});await play(page,0);await btn(page,0).click();await flush(page);
 const count=(await audit(page)).count;
 await btn(page,0).click();await expect(status(page,0)).toHaveText(T.cleanupFailed);
 await btn(page,0).click();await expect(status(page,0)).toHaveText(T.cleanupFailed);expect((await audit(page)).count).toBe(count);
 expect(errors).toEqual([]);
});

test('unsupported browser: the press says so and nothing else changes',async({page})=>{
 await instrument(page,true);await startApp(page);await setupReceiver(page);await receiveAndFinish(page);
 await btn(page,0).click();await expect(status(page,0)).toHaveText('This browser has no Web Audio support, so the audition is unavailable.');
 await expect(group(page,0)).toHaveAttribute('data-phase','idle');
});

test('while playing, route hide, page hidden, a project operation, dialogs, Vert. Gain, closing a channel and Mode stop it; ordinary updates do not',async({page})=>{
 const errors=errorsOf(page);await holdReads(page);await instrument(page);await startApp(page);const bytes=await save(page);
 await toAnalysis(page);await id(page,'pulsar-file').setInputFiles({name:'route.plr',mimeType:'application/octet-stream',buffer:Buffer.from(PLR,'latin1')});
 await expect(id(page,'pulsar-file-name')).toHaveText('route.plr');
 await toRadio(page);await setupReceiver(page);await id(page,'receiver-add').click();await id(page,'receiver-add').click();await receiveAndFinish(page);
 let contexts=0;
 const stoppedWith=async(slot:number,text:string)=>{
  await expect(status(page,slot)).toHaveText(text);await expect(group(page,slot)).toHaveAttribute('data-phase','idle');
  expect(await open(page)).toBe(0);contexts=(await audit(page)).count;
 };
 // Ordinary DOM changes (another card's mark and status) do not stop it.
 await play(page,0);await id(page,'receiver-mark-position-1').fill('120');await id(page,'receiver-mark-place-1').click();
 await expect(id(page,'receiver-mark-first-1')).toHaveText(/120/);await expect(group(page,0)).toHaveAttribute('data-phase','playing');
 await btn(page,0).click();await stoppedWith(0,T.user);
 // Route hidden: stopped; showing the route again does not replay.
 await play(page,0);await toAnalysis(page);expect(await open(page)).toBe(0);await toRadio(page);await stoppedWith(0,T.route);
 await advance(page,1000);expect((await audit(page)).count).toBe(contexts);
 // Page hidden (test-only visibilityState override).
 await play(page,1);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 await stoppedWith(1,T.page);
 await btn(page,1).click();await expect(status(page,1)).toHaveText('Not available now: the route is hidden, a project operation runs, a dialog or box is open, or the page is hidden.');
 expect((await audit(page)).count).toBe(contexts);
 await page.evaluate(()=>{delete (document as unknown as Record<string,unknown>).visibilityState;});
 // A project operation (held restore).
 await play(page,0);await restore(page,'held-restore.json',bytes.toString('utf8'));await held(page,'held-restore.json');await stoppedWith(0,T.busy);
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await release(page,'held-restore.json');await flush(page);
 // A foreign modal <dialog>.
 await play(page,0);
 await page.evaluate(()=>{const d=document.createElement('dialog');d.id='foreign';d.textContent='x';document.body.append(d);d.showModal();});
 await stoppedWith(0,T.modal);
 await page.evaluate(()=>{const d=document.getElementById('foreign') as HTMLDialogElement;d.close();d.remove();});
 // The close box and the Record prompt over the cards.
 await play(page,0);await id(page,'receiver-close-1').click();await expect(id(page,'receiver-close-box')).toBeVisible();await stoppedWith(0,T.modal);
 await page.keyboard.press('Escape');await expect(id(page,'receiver-close-box')).toHaveCount(0);
 await play(page,2);await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt')).toBeVisible();await stoppedWith(2,T.modal);
 await page.keyboard.press('Escape');await expect(id(page,'receiver-record-prompt')).toHaveCount(0);
 // A Vert. Gain step on the playing receiver.
 await play(page,1);await id(page,'receiver-vertical-up-1').click();await stoppedWith(1,T.changed);
 // Closing the playing channel: its card and audition status disappear, the sound is stopped.
 await play(page,2);await id(page,'receiver-close-2').click();await expect(id(page,'receiver-card-2')).toHaveCount(0);
 expect(await open(page)).toBe(0);
 // Mode (a new Receive) while the main plays.
 await play(page,0);await id(page,'receiver-mode').click();await stoppedWith(0,T.changed);
 await advance(page,1000);expect((await audit(page)).count).toBe(contexts);
 expect(errors).toEqual([]);
});

test('real AudioContext call-through: constructed in the press and closed by Stop (no audibility claim)',async({page})=>{
 const errors=errorsOf(page);await instrument(page);await startApp(page);
 expect(await page.evaluate(()=>(window as unknown as{__hasReal:boolean}).__hasReal),'this Chromium build must provide AudioContext').toBe(true);
 await setupReceiver(page);await receiveAndFinish(page);
 await setMode(page,{real:true});
 await btn(page,0).click();
 await expect(group(page,0)).toHaveAttribute('data-phase',/starting|playing/);
 const a=await audit(page);
 expect(a.count).toBe(1);expect(['running','suspended']).toContain(a.states[0]);
 expect(a.log.slice(0,3)).toEqual(['ctor#1','createBuffer#1:1,7980,8000','start#1']);
 await btn(page,0).click();await expect(status(page,0)).toHaveText(T.user);
 await expect.poll(async()=>(await audit(page)).states[0]).toBe('closed');
 expect((await audit(page)).log).toEqual(expect.arrayContaining(['stop#1','disconnect#1','close#1']));
 // A fresh press after the close settled builds a new real context.
 await btn(page,0).click();await expect(group(page,0)).toHaveAttribute('data-phase',/starting|playing/);expect((await audit(page)).count).toBe(2);
 await btn(page,0).click();await expect.poll(async()=>(await audit(page)).states[1]).toBe('closed');
 expect(errors).toEqual([]);
});

test('viewports 1440/375/320 without overflow; Tab after Move down; held Enter plays once; reload leaves no audio state',async({page},info)=>{
 await instrument(page);await startApp(page);await setupReceiver(page);await receiveAndFinish(page);
 await play(page,0);
 for(const width of [1440,375,320]){
  await page.setViewportSize({width,height:width>500?1050:844});await flush(page);await noOverflow(page);
  await group(page,0).scrollIntoViewIfNeeded();
  await info.attach(`receiver-audition-${width}.png`,{body:await group(page,0).screenshot({path:info.outputPath(`receiver-audition-${width}.png`)}),contentType:'image/png'});
 }
 await page.setViewportSize({width:1440,height:1050});await btn(page,0).click();await expect(status(page,0)).toHaveText(T.user);
 const count=(await audit(page)).count;
 await id(page,'receiver-move-down-0').focus();await page.keyboard.press('Tab');await expect(btn(page,0)).toBeFocused();
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect(group(page,0)).toHaveAttribute('data-phase','playing');expect((await audit(page)).count).toBe(count+1);await expect(btn(page,0)).toBeFocused();
 await page.clock.resume();await page.reload();await nav(page,'Radio telescope').click();await expect(id(page,'radio-control')).toBeVisible();
 await expect(page.locator('[data-testid^="receiver-audition-"]')).toHaveCount(0);expect((await audit(page)).count).toBe(0);
});
