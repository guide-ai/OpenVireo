import {test,expect,type Locator,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Actual App flows of R-RX6 (docs/RADIO-PULSAR-PARAMETERS.md PP-05/PP-11, WEB-PP-LIST-*, WEB-PP-ACT-01, WEB-PP-CUR-01,
// WEB-PP-FIND-02′/04, WEB-PP-PRES-02): the Pulsar Parameters reference Open only reads the receiver session's shared source
// buffer, Find seeds from that buffer, and the receivers' picker runs (Receiver Open, clock reassociation) write it and move
// the window's shared list cursor. The menu item is never shown in these flows, so File ▸ Pulsar List... (R-RX8, the third
// writer, WEB-PP-LIST-04) is exercised in tests/radio-pulsar-list-command-app.spec.ts. No harness and no product debug hook: the rendered App, its data attributes, browser history,
// the browser clock control, the test-only read hold, a test-only foreign <dialog> and programmatic clicks on controls that
// are inert behind a surface (to exercise the handler-time gates). The catalog is synthetic (no original rows); expected
// strings are the chosen web contract, not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json=any;
/** Phase 1 item 1.5: once Radio is used, Save writes v23, which wraps the unchanged v≤22 investigation in `base` and keeps the
 * Radio part separately (with its consistency digest). The base must equal the earlier file exactly; returns the Radio part. */
function radioPart(saved:Buffer,before:Buffer):Json{
 const next:Json=JSON.parse(saved.toString('utf8')),old:Json=JSON.parse(before.toString('utf8'));
 expect(old.version).toBeLessThanOrEqual(22);expect(next.version).toBe(23);
 expect(Object.keys(next).sort()).toEqual(['base','format','numericalPolicy','radio','radioDigestSHA256','radioPolicy','version']);
 expect(next.numericalPolicy).toBe('Number_x87_equivalence_unvalidated');expect(next.radioPolicy).toBe('OpenVireo radio investigation 1');
 expect(next.base,'unrelated investigation unchanged').toEqual(old);
 expect(sha(JSON.stringify(next.radio))).toBe(next.radioDigestSHA256);
 return next.radio;
}
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
/** Fake time in 200 ms steps (five 40 ms receiver ticks), letting React commit between steps. */
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
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
const release=(page:Page,name:string)=>page.evaluate(n=>{const m=(window as unknown as{__held:Map<string,{release:()=>void}>}).__held,h=m.get(n)!;m.delete(n);h.release();},name);

// ---- Synthetic catalog in the fixed-column layout (radioPulsarCatalog.ts PULSAR_CATALOG_COLUMNS), RA column in degrees.
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
// Records 1 and 2 are far away. A (record 3) is near the first pointing (RA 0 h, Dec = compiled latitude ≈ 38.43°); B (record
// 4, RA 0h16m) is 4° east with DM 3 (distance 100 at the compiled density). At the first pointing the picker ends its cursor on
// the tail (loop 2 reaches B), so a receiver association leaves the shared cursor on record 4 while A is shown. At RA 0h08m,
// Dec 38°24' no record is within 2.0 (a miss for the limit-2 picker): A is ≈ 2.23 and B ≈ 2.55 away, both inside the clock's
// 5.0, so a limit-2 write at Open would clear the name the receivers use.
const ROWS:readonly Row[]=[
 {primaryName:'J0600+1000',legacyName:'B0557+10',ra:'90',dec:'10'},
 {primaryName:'J1200-3000',legacyName:'B1157-29',ra:'180',dec:'-30'},
 {primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'},
 {primaryName:'J0016+3824',legacyName:'B0013+38',ra:'4',dec:'38.4',s4c:'3.0'},
];
const CATALOG=ROWS.map(line).join('\r\n')+'\r\n';
const UT='2026-10-24T12:00:00';
const MISS=['0','8','0','38','24','0'],AT_B=['0','16','0','38','24','0'];

/** The fake clock runs until the lazily loaded routes have rendered (their chunks do not load under a paused clock); the
 * radio route then pauses it, and every later step advances it explicitly. */
async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
}
async function radioRoute(page:Page){
 await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
async function switchOnTracking(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
async function loadCatalog(page:Page,name='synthetic-list.dat'){
 await id(page,'pulsar-ref-file').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
}
async function applyClock(page:Page){
 await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${UT} UT`);
 await id(page,'radio-clock-longitude').click();await expect(id(page,'antenna-clock-tick')).toBeEnabled();
}
async function setup(page:Page){await startApp(page);await radioRoute(page);await switchOnTracking(page);await loadCatalog(page);}
async function openReceiver(page:Page){
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-heading-0')).toBeFocused();
}
async function openWindow(page:Page){
 await id(page,'pulsar-params-open').click();await expect(id(page,'pulsar-params-window')).toBeVisible();await expect(id(page,'pulsar-params-heading')).toBeFocused();
}
/** Set Coordinates → OK → Yes, then the slew to arrival and its box. */
async function slewTo(page:Page,values:readonly string[]){
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await id(page,`antenna-field-${name}`).fill(values[i]);
 await id(page,'antenna-dialog-ok').click();await flush(page);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flush(page);
 for(let i=0;i<300&&await id(page,'antenna-notice').count()===0;i++)await advance(page,200);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');await id(page,'antenna-notice-ok').click();await flush(page);
}
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}
const position=async(page:Page)=>Number(await id(page,'receiver-sweep-0').getAttribute('data-position'));
const exactText=(page:Page,testId:string)=>id(page,testId).evaluate(el=>el.textContent);
const field=(page:Page,name:string)=>id(page,`pulsar-params-field-${name}`);
const win=(page:Page)=>id(page,'pulsar-params-window');
/** The window's pointer (form+0x45c), shown record and shared cursor. */
async function windowAt(page:Page,index:number,shown:number,cursor:number){
 await expect(win(page)).toHaveAttribute('data-index',String(index));await expect(win(page)).toHaveAttribute('data-shown',String(shown));
 await expect(win(page)).toHaveAttribute('data-cursor',String(cursor));
}
/** A programmatic click: reaches the handler of a control that is inert behind a surface (no user interaction is claimed). */
const clickBehind=(page:Page,testId:string)=>id(page,testId).evaluate(el=>(el as HTMLButtonElement).click());
async function findSeed(page:Page,expected:string){
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-dialog')).toBeVisible();await expect(id(page,'pulsar-find-query')).toHaveValue(expected);
 await page.keyboard.press('Escape');await expect(id(page,'pulsar-find-dialog')).toHaveCount(0);
}

test('Open only reads the shared buffer: initial before and after activation, the Receiver Open name afterwards, kept at a miss pointing; Find seeds from it; no clock; Save keeps the buffer and catalog values, not the window; reload empties',async({page})=>{
 await startApp(page);const before=await save(page);await radioRoute(page);await loadCatalog(page);
 // WEB-PP-LIST-02: before the antenna's first activation the activation reads the initial buffer.
 await openWindow(page);
 await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','none');
 await expect(id(page,'pulsar-params-seed')).toHaveText('At Open, the receivers’ shared source name was empty, so the window opened at the first record. Open did not change it.');
 await expect(id(page,'pulsar-params-position')).toHaveText('Record 1 of 4');await windowAt(page,0,0,0);
 await findSeed(page,'');
 await id(page,'pulsar-params-exit').click();await expect(id(page,'pulsar-params-open')).toBeFocused();
 // After the activation with no receiver: still the initial buffer, so the head; no picker runs (A is within 2.0 here).
 await switchOnTracking(page);
 await openWindow(page);
 await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','none');
 await expect(field(page,'j2000')).toHaveValue('J0600+1000');await windowAt(page,0,0,0);
 await findSeed(page,'');
 await id(page,'pulsar-params-exit').click();
 // Receiver Open writes A; Open then reads it. No radio clock reading, so Date stays empty.
 await openReceiver(page);
 await openWindow(page);
 await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','name');
 await expect(id(page,'pulsar-params-seed')).toHaveText('At Open, the receivers’ shared source name was J0001+3826: the window opened at the first record whose J2000 name contains it, or at the first record if none does. Open did not change that name.');
 await expect(field(page,'j2000')).toHaveValue('J0001+3826');await windowAt(page,2,2,2);
 await expect(field(page,'date')).toHaveValue('');await expect(id(page,'pulsar-params-derived-issues')).toContainText('No radio clock reading');
 await findSeed(page,'B2358+38');
 await id(page,'pulsar-params-exit').click();
 // At the miss pointing Open still reads A: it does not run the limit-2 picker and does not clear the name.
 await slewTo(page,MISS);
 await openWindow(page);
 await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','name');await expect(id(page,'pulsar-params-seed')).toContainText('J0001+3826');
 await expect(field(page,'j2000')).toHaveValue('J0001+3826');await windowAt(page,2,2,2);
 await findSeed(page,'B2358+38');
 await id(page,'pulsar-params-exit').click();
 // Save (v23): the other tools unchanged; the Radio part keeps the supplied catalog as values (never as the recorded original),
 // the shared source buffer A, the open receiver's window settings and the miss pointing. The Pulsar Parameters window is not
 // saved, and nothing is stored in the browser: a reload without Restore empties the catalog.
 const pointing={ra:Number(await id(page,'antenna-ra').getAttribute('data-ra-hours')),dec:Number(await id(page,'antenna-dec').getAttribute('data-dec-degrees'))};
 const w=radioPart(await save(page),before).workspace;
 expect(w.catalog).toMatchObject({kind:'supplied',name:'synthetic-list.dat',bytes:Buffer.byteLength(CATALOG,'latin1'),sha256:sha(Buffer.from(CATALOG,'latin1')),rows:4});
 expect(w.catalog.records.map((r:Json)=>[r.primaryName,r.legacyName])).toEqual(ROWS.map(r=>[r.primaryName,r.legacyName]));
 expect(w.receivers.sourceBuffer).toMatchObject({primaryNameCleared:false,record:{primaryName:'J0001+3826',legacyName:'B2358+38'}});
 expect(w.receivers.windows[0]).not.toBeNull();expect(w.receivers.windows.slice(1)).toEqual([null,null]);
 expect(w.antenna).toMatchObject({activated:true,tracking:true,pointing});
 await page.clock.resume();await page.reload();await clickHeaderTool(page,'Radio telescope');await expect(id(page,'radio-control')).toBeVisible();
 await expect(id(page,'pulsar-ref-none')).toBeVisible();await expect(win(page)).toHaveCount(0);await expect(id(page,'pulsar-params-open')).toBeDisabled();
});

test('Open refusals are checked at the press and change nothing: a foreign <dialog>, an antenna dialog, the receiver close box; a late read disables Open',async({page})=>{
 await holdReads(page);await setup(page);
 // A held read: Open is disabled and the read's cancellation leaves the catalog; nothing is opened.
 await id(page,'pulsar-ref-file').setInputFiles({name:'held-late.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});await held(page,'held-late.dat');
 await expect(id(page,'pulsar-params-open')).toBeDisabled();await expect(id(page,'pulsar-params-open-reason')).toHaveText('Wait for the catalog read to finish, or cancel it.');
 await id(page,'pulsar-ref-cancel').click();await release(page,'held-late.dat');await expect(win(page)).toHaveCount(0);
 await openReceiver(page);
 // The window opens with A in the buffer; its Find memory stays empty until Find opens.
 await openWindow(page);await expect(field(page,'j2000')).toHaveValue('J0001+3826');
 // Move the pointing to a limit-2 miss: an accepted Open still reads A, which a Find with an empty memory shows.
 await slewTo(page,MISS);
 // 1. A foreign modal <dialog> (test-only element).
 await page.evaluate(()=>{const d=document.createElement('dialog');d.id='foreign-test-dialog';d.textContent='foreign';document.body.append(d);d.showModal();});
 await clickBehind(page,'pulsar-params-open');
 await expect(id(page,'pulsar-params-open-status')).toHaveAttribute('data-reason','modal');
 await page.evaluate(()=>{const d=document.getElementById('foreign-test-dialog') as HTMLDialogElement;d.close();d.remove();});
 // 2. The receiver close box (slot 1 while slot 2 exists): the read-only receiver gate refuses before any window change.
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();await id(page,'receiver-add').click();await expect(id(page,'receiver-card-2')).toBeVisible();
 await id(page,'receiver-close-1').click();await expect(id(page,'receiver-close-box')).toBeVisible();
 await expect(id(page,'pulsar-params-card')).toHaveAttribute('inert','');
 await clickBehind(page,'pulsar-params-open');
 await expect(id(page,'pulsar-params-open-status')).toHaveAttribute('data-reason','close-box-open');
 await expect(id(page,'pulsar-params-open-status')).toHaveText('Dismiss the receiver message first. Open did nothing.');
 await id(page,'receiver-close-box-ok').click();await expect(id(page,'receiver-close-box')).toHaveCount(0);
 // 3. The antenna's Set Coordinates dialog (the card is inert; the handler still refuses).
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 await expect(id(page,'pulsar-params-card')).toHaveAttribute('inert','');
 await clickBehind(page,'pulsar-params-open');await expect(id(page,'pulsar-params-open-status')).toHaveAttribute('data-reason','modal');
 await id(page,'antenna-dialog-cancel').click();await flush(page);
 // Nothing changed: the window was not re-activated and Find still seeds the buffer's A.
 await expect(field(page,'j2000')).toHaveValue('J0001+3826');await windowAt(page,2,2,2);
 await findSeed(page,'B2358+38');
 // An accepted Open at the miss pointing keeps A and its seed; after Exit (the Find memory is lost) Find still seeds it.
 await id(page,'pulsar-params-exit').click();await openWindow(page);
 await expect(id(page,'pulsar-params-open-status')).toHaveText('');await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','name');
 await expect(field(page,'j2000')).toHaveValue('J0001+3826');await windowAt(page,2,2,2);
 await findSeed(page,'B2358+38');
});

test('shared cursor: Receiver Open and a clock tick move it; Next/Prev follow it; a Find miss restores the pointer without redisplay; Reset uses it; a hidden Find keeps its draft',async({page})=>{
 await setup(page);await applyClock(page);
 // Open before any receiver reads the initial buffer: the head.
 await openWindow(page);await windowAt(page,0,0,0);await expect(id(page,'pulsar-params-cursor-note')).toHaveCount(0);
 await expect(field(page,'distance')).toHaveValue('1000');
 // Receiver Open runs the picker: its loop ends on the tail, so the shared cursor moves to record 4 while record 1 stays shown.
 await openReceiver(page);
 await windowAt(page,0,0,3);await expect(id(page,'pulsar-params-position')).toHaveText('Record 1 of 4');
 await expect(id(page,'pulsar-params-cursor-note')).toHaveText('Prev and Next continue from record 4 (J0016+3824), not from the record shown: the receiver’s source association (Receiver Open or a clock tick) moved the shared list cursor. Nothing was redrawn.');
 await expect(id(page,'pulsar-params-next')).toHaveAttribute('aria-describedby',/.+/);
 // Next: the cursor is at the tail although record 1 is shown, so the original beeps and nothing moves.
 await id(page,'pulsar-params-next').click();await expect(id(page,'pulsar-params-boundary')).toHaveAttribute('data-boundary','last');
 await expect(id(page,'pulsar-params-boundary')).toContainText('the shared list cursor is at the last record');await windowAt(page,0,0,3);
 // Find seeds live from the buffer Receiver Open wrote; a miss makes the cursor saved at OK (record 4) the pointer; nothing is redrawn.
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-query')).toHaveValue('B2358+38');
 await id(page,'pulsar-find-query').fill('zzz');await id(page,'pulsar-find-ok').click();await expect(id(page,'pulsar-params-notice')).toHaveAttribute('data-kind','not-found');
 await page.keyboard.press('Escape');await expect(id(page,'pulsar-params-find')).toBeFocused();
 await windowAt(page,3,0,3);await expect(field(page,'j2000')).toHaveValue('J0600+1000');await expect(field(page,'distance')).toHaveValue('1000');
 await expect(id(page,'pulsar-params-pointer-note')).toHaveText('Update and Reset compute Period and Distance for record 4 (J0016+3824): the failed Find returned to the shared list cursor, but the record shown (record 1) was not redrawn.');
 // Reset computes for the pointer record (DM 3 → 100) while the shown DM stays record 1's.
 await id(page,'pulsar-params-reset').click();await expect(field(page,'distance')).toHaveValue('100');await expect(field(page,'dm')).toHaveValue('30.00');
 // Prev steps from the cursor and displays: the three agree again.
 await id(page,'pulsar-params-prev').click();await windowAt(page,2,2,2);
 await expect(id(page,'pulsar-params-cursor-note')).toHaveCount(0);await expect(id(page,'pulsar-params-pointer-note')).toHaveCount(0);
 await expect(field(page,'distance')).toHaveValue('1000');
 // The radio clock runs: with Find open and the route hidden, a completed tick reassociates and moves the cursor.
 await id(page,'radio-clock-start').click();await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 await id(page,'pulsar-params-find').click();await id(page,'pulsar-find-query').fill('kept');
 await page.goBack();await expect(id(page,'pulsar-find-dialog')).toHaveCount(0);
 await advance(page,2200);
 await page.goForward();await expect(id(page,'pulsar-find-dialog')).toBeVisible();await expect(id(page,'pulsar-find-query')).toHaveValue('kept');
 await expect(id(page,'pulsar-find-query')).toBeFocused();
 // Cancel commits nothing and keeps the cursor the tick moved; Next then reports the tail.
 await page.keyboard.press('Escape');await windowAt(page,2,2,3);await expect(id(page,'pulsar-params-cursor-note')).toContainText('record 4 (J0016+3824)');
 await id(page,'pulsar-params-next').click();await expect(id(page,'pulsar-params-boundary')).toHaveAttribute('data-boundary','last');
});

test('receivers: Open keeps title and sweep; at a limit-2 miss while receiving it neither clears nor rebuilds the profile; armed Record keeps the Receiver Open name; a Record dialog refuses Open',async({page})=>{
 await setup(page);await applyClock(page);await openReceiver(page);
 const title=await exactText(page,'receiver-heading-0');expect(title).toContain('Pulsar B2358+38');
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');await advance(page,400);
 await expect(id(page,'receiver-source')).toHaveText('Profile source: J0001+3826');
 // Same name: no title change and no rebuild; the sweep goes on.
 const p0=await position(page);await openWindow(page);await advance(page,200);
 expect(await exactText(page,'receiver-heading-0')).toBe(title);await expect(id(page,'receiver-source')).toHaveText('Profile source: J0001+3826');
 expect(await position(page)).not.toBe(p0);await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');
 await id(page,'pulsar-params-exit').click();
 // A limit-2 miss pointing while receiving (A ≈ 2.23 away): Open reads A and writes nothing, so the profile source, title and
 // sweep stay and no tick error appears.
 await slewTo(page,MISS);
 await openWindow(page);await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','name');await expect(field(page,'j2000')).toHaveValue('J0001+3826');
 await advance(page,400);
 expect(await exactText(page,'receiver-source')).toBe('Profile source: J0001+3826');expect(await exactText(page,'receiver-heading-0')).toBe(title);
 await expect(id(page,'receiver-tick-error')).toHaveCount(0);await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');
 const p1=await position(page);await advance(page,400);expect(await position(page)).not.toBe(p1);
 await id(page,'pulsar-params-exit').click();
 await id(page,'receiver-mode').click();await flush(page);await untilFinished(page);
 // Armed Record at B: Open reads (and keeps) A, so the next Receive header takes A's legacy name from Receiver Open (the Identify draft).
 await slewTo(page,AT_B);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await openWindow(page);await expect(id(page,'pulsar-params-seed')).toContainText('J0001+3826');await expect(field(page,'j2000')).toHaveValue('J0001+3826');
 await expect(id(page,'receiver-record-disp')).toHaveText('On');await id(page,'pulsar-params-exit').click();
 await id(page,'receiver-mode').click();await flush(page);await advance(page,600);
 await id(page,'receiver-mode').click();await flush(page);await untilFinished(page);
 await expect(id(page,'receiver-record-finish')).toHaveAttribute('data-stage','identify');
 await expect(id(page,'receiver-record-identify-input')).toHaveValue('B2358+38');
 // The Identify dialog (an ARIA dialog div, not a native <dialog>) is modal over the windows: Open is refused and opens nothing.
 await clickBehind(page,'pulsar-params-open');
 await expect(id(page,'pulsar-params-open-status')).toHaveAttribute('data-reason','record-dialog-open');
 await expect(id(page,'pulsar-params-open-status')).toHaveText('Answer the receiver’s Record dialog first. Open did nothing.');
 await expect(win(page)).toHaveCount(0);await expect(id(page,'receiver-record-identify-input')).toHaveValue('B2358+38');
});

test('keyboard Open with a held Enter acts once and focuses the heading; notes fit 1440/390/375/320 without overflow; screenshots',async({page},info)=>{
 await setup(page);await applyClock(page);
 await id(page,'pulsar-params-open').focus();
 await page.keyboard.down('Enter');await expect(id(page,'pulsar-params-heading')).toBeFocused();
 await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect(win(page)).toHaveCount(1);await expect(id(page,'pulsar-find-dialog')).toHaveCount(0);await windowAt(page,0,0,0);
 await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','none');
 await openReceiver(page);await expect(id(page,'pulsar-params-cursor-note')).toBeVisible();
 // Keyboard-only Find miss: the pointer note appears and Reset is described by it.
 await id(page,'pulsar-params-find').focus();await page.keyboard.press('Enter');await expect(id(page,'pulsar-find-query')).toBeFocused();
 await page.keyboard.press('Control+A');await page.keyboard.type('zzz');await page.keyboard.press('Enter');
 await expect(id(page,'pulsar-params-notice')).toBeVisible();await page.keyboard.press('Enter');await expect(id(page,'pulsar-params-find')).toBeFocused();
 await expect(id(page,'pulsar-params-pointer-note')).toBeVisible();
 const pointerNote=await id(page,'pulsar-params-pointer-note').getAttribute('id');
 await expect(id(page,'pulsar-params-reset')).toHaveAttribute('aria-describedby',pointerNote!);
 for(const width of [1440,390,375,320]){
  await page.setViewportSize({width,height:width>500?1050:844});await flush(page);await noOverflow(page);
  await id(page,'pulsar-params-card').screenshot({path:info.outputPath(`pulsar-list-card-${width}.png`)});
 }
 await page.screenshot({path:info.outputPath('pulsar-list-320.png'),fullPage:true});
});
