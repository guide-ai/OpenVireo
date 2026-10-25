import {test,expect,type Browser,type Locator,type Page,type TestInfo} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Actual App flows of R-RX8 File ▸ Pulsar List... (docs/RADIO-PULSAR-PARAMETERS.md WEB-PP-LIST-04, docs/RADIO-ACCESS-OPTIONS.md
// WEB-ACC-LIST-01; acceptance cases C01–C25 of /tmp/clea-static-research/radio-rx8-list-command-20261025). No harness and no
// product debug hook: the rendered App, its data attributes, the browser clock control, the test-only read hold, a test-only
// foreign <dialog>, programmatic clicks on controls behind a surface and two clicks inside one page task (to exercise the
// handler-time gates on the latest state). The catalogs are synthetic (no original rows); expected strings are the chosen web
// contract, not native oracles. Also covered: a hit on a record with an empty J2000 name (C06b), the same-task positive
// with Access Off (C04b), an immediate positive after the antenna Cancel (C17) and a genuine repeated Enter on the command,
// seen by a test-only window listener (C19; Chromium's handling of Playwright keys, not OS delivery). Core-only cases (no App witness here): C13 detached main, C15 capture/stop/lease/tick
// error, C21 stale or missing owners, the date dialog under C17 (no App path to it with the item shown was exercised), and the
// exact limit/tie/RA-wrap vectors of C09/C10 (src/core/radioPulsarListCommand.test.ts and the selector tests).
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
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
/** A programmatic click: reaches the handler of a control behind a surface (no user interaction is claimed). */
const clickBehind=(page:Page,testId:string)=>id(page,testId).evaluate(el=>(el as HTMLButtonElement).click());
/** Two programmatic clicks in one page task: the second handler runs before React commits the first one's state. */
const sameTask=(page:Page,first:string,second:string)=>page.evaluate(([a,b])=>{
 const q=(t:string)=>document.querySelector<HTMLButtonElement>(`[data-testid="${t}"]`)!;q(a).click();q(b).click();
},[first,second] as const);
const exactText=(page:Page,testId:string)=>id(page,testId).evaluate(el=>el.textContent);

// ---- Synthetic catalogs in the fixed-column layout (radioPulsarCatalog.ts PULSAR_CATALOG_COLUMNS), RA column in degrees.
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
const text=(rows:readonly Row[])=>rows.map(line).join('\r\n')+'\r\n';
// The rows of tests/radio-pulsar-list-app.spec.ts: A (record 3) is the limit-2 hit at the first pointing (RA 0 h, Dec ≈ 38.43°);
// B (record 4) is the hit at AT_B; at MISS nothing is within 2.0 (A ≈ 2.23, B ≈ 2.55 on the recovered separation).
const CATALOG=text([
 {primaryName:'J0600+1000',legacyName:'B0557+10',ra:'90',dec:'10'},
 {primaryName:'J1200-3000',legacyName:'B1157-29',ra:'180',dec:'-30'},
 {primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'},
 {primaryName:'J0016+3824',legacyName:'B0013+38',ra:'4',dec:'38.4',s4c:'3.0'},
]);
// C06b: CATALOG with record 4's J2000 name empty (the parser admits it). At AT_B the hit copies its numbers and B1950 name
// B0013+38, but there is no J2000 name to look for, so the window shows the head (J0600+1000 / B0557+10).
const BLANK=text([
 {primaryName:'J0600+1000',legacyName:'B0557+10',ra:'90',dec:'10'},
 {primaryName:'J1200-3000',legacyName:'B1157-29',ra:'180',dec:'-30'},
 {primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'},
 {primaryName:'',legacyName:'B0013+38',ra:'4',dec:'38.4',s4c:'3.0'},
]);
// C07 prefix vector at the first pointing: A (RA 0.2 h) is in the RA window but ≈ 3.8 away; B (`J0000`) is the hit; C (RA
// 1.2 h) ends the run, so the picker's own end cursor is record 3, while the activation's literal substring scan for
// `J0000` stops at A (record 1).
const PREFIX=text([
 {primaryName:'J0000+01',legacyName:'B0000+01',ra:'3',dec:'38.4'},
 {primaryName:'J0000',legacyName:'B0000',ra:'0.25',dec:'38.4'},
 {primaryName:'J0001+00',legacyName:'B0001+00',ra:'18',dec:'38.4'},
]);
const UT='2026-10-24T12:00:00';
const MISS=['0','8','0','38','24','0'],AT_B=['0','16','0','38','24','0'];

async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
}
async function radioRoute(page:Page){
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
async function switchOnTracking(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
async function loadCatalog(page:Page,name='synthetic-command.dat',catalog=CATALOG){
 await id(page,'pulsar-ref-file').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(catalog,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
}
async function applyClock(page:Page){
 await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${UT} UT`);
 await id(page,'radio-clock-longitude').click();await expect(id(page,'antenna-clock-tick')).toBeEnabled();
}
async function openReceiver(page:Page){
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-heading-0')).toBeFocused();
}
async function slewTo(page:Page,values:readonly string[]){
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await id(page,`antenna-field-${name}`).fill(values[i]);
 await id(page,'antenna-dialog-ok').click();await flush(page);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flush(page);
 for(let i=0;i<300&&await id(page,'antenna-notice').count()===0;i++)await advance(page,200);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');await id(page,'antenna-notice-ok').click();await flush(page);
}
async function beginSlew(page:Page,values:readonly string[]){
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await id(page,`antenna-field-${name}`).fill(values[i]);
 await id(page,'antenna-dialog-ok').click();await flush(page);await id(page,'antenna-notice-yes').click();await flush(page);
 await expect(id(page,'antenna-notice')).toHaveCount(0);
}
async function untilArrival(page:Page){
 for(let i=0;i<300&&await id(page,'antenna-notice').count()===0;i++)await advance(page,200);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');
}
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}

// ---- Radio configuration and command helpers.
const parent=(page:Page)=>id(page,'radio-access-parent'),child=(page:Page)=>id(page,'radio-access-child');
async function configure(page:Page,access:boolean,outer:'ok'|'cancel'='ok'){
 await id(page,'radio-access-preferences').click();await expect(parent(page)).toBeVisible();
 await id(page,'radio-access-radio').click();await expect(child(page)).toBeVisible();
 await id(page,'radio-access-checkbox').setChecked(access);
 await id(page,'radio-access-child-ok').click();await expect(child(page)).toHaveCount(0);
 await id(page,`radio-access-parent-${outer}`).click();await expect(parent(page)).toHaveCount(0);
 await expect(id(page,'radio-access-env')).toHaveAttribute('data-value',String(access));
}
/** Demonstration gate, Access Pulsar List On before the first activation, then the activation: shown and enabled (T9). */
async function menuOn(page:Page){
 await id(page,'radio-access-demo').click();await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','demonstration');
 await configure(page,true);await switchOnTracking(page);
 await expect(id(page,'radio-access-menu')).toHaveAttribute('data-availability','shown-enabled');
}
const command=(page:Page)=>id(page,'radio-access-pulsar-list');
const win=(page:Page)=>id(page,'pulsar-params-window');
const field=(page:Page,name:string)=>id(page,`pulsar-params-field-${name}`);
async function outcome(page:Page,value:string){await expect(id(page,'radio-access-list-status')).toHaveAttribute('data-outcome',value);}
/** An admitted click by mouse: the window is shown and its heading takes focus. */
async function runCommand(page:Page){await command(page).click();await expect(win(page)).toBeVisible();await expect(id(page,'pulsar-params-heading')).toBeFocused();}
async function windowAt(page:Page,index:number,shown:number,cursor:number){
 await expect(win(page)).toHaveAttribute('data-index',String(index));await expect(win(page)).toHaveAttribute('data-shown',String(shown));
 await expect(win(page)).toHaveAttribute('data-cursor',String(cursor));
}
async function findSeed(page:Page,expected:string){
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-dialog')).toBeVisible();await expect(id(page,'pulsar-find-query')).toHaveValue(expected);
 await page.keyboard.press('Escape');await expect(id(page,'pulsar-find-dialog')).toHaveCount(0);
}
const menuState=async(page:Page)=>{
 const m=id(page,'radio-access-menu');
 return [await m.getAttribute('data-availability'),await m.getAttribute('data-enabled'),await m.getAttribute('data-visible'),await m.getAttribute('data-activation-seen'),
  await id(page,'radio-access-menu-event').getAttribute('data-event')];
};
/** Everything a receiver shows at a frozen clock (C11). */
const receiverState=async(page:Page)=>({
 heading:await exactText(page,'receiver-heading-0'),source:await exactText(page,'receiver-source'),sweep:await id(page,'receiver-sweep-0').getAttribute('data-position'),
 canvas:await id(page,'receiver-canvas-0').evaluate(c=>(c as HTMLCanvasElement).toDataURL()),seed:await exactText(page,'receiver-seed-next'),
 order:await id(page,'receiver-workspace').getAttribute('data-order'),timer:await id(page,'receiver-workspace').getAttribute('data-timer'),record:await exactText(page,'receiver-record-disp'),
});

test('C01/C05/C20/C23/C24: the command writes and activates; the reference Open only reads; no receiver; Find Cancel and Exit keep the write; Save bytes unchanged; reload resets',async({page})=>{
 await startApp(page);const before=await save(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);
 await expect(command(page)).toHaveText('Pulsar List...');await expect(command(page)).toBeEnabled();
 await expect(id(page,'pulsar-params-open')).toHaveText('Open Pulsar Parameters');
 await slewTo(page,AT_B);
 const seed=await exactText(page,'receiver-seed-next'),menu=await menuState(page);
 // C01: the reference Open at AT_B reads the initial buffer (head) and writes nothing.
 await id(page,'pulsar-params-open').click();await expect(id(page,'pulsar-params-heading')).toBeFocused();
 await windowAt(page,0,0,0);await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','none');await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-activation','open');
 await findSeed(page,'');
 // The command at the same pointing writes B and activates on it (the same window, reused).
 await runCommand(page);
 await outcome(page,'hit');await windowAt(page,3,3,3);await expect(field(page,'j2000')).toHaveValue('J0016+3824');
 await expect(id(page,'radio-access-list-status')).toContainText('the receivers\' shared source is now J0016+3824');
 await expect(id(page,'radio-access-list-status')).toContainText('record 4 (J0016+3824)');
 await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-activation','command');await expect(id(page,'pulsar-params-seed')).toContainText('had just set the receivers’ shared source name to J0016+3824');
 // C05/C23: no receiver was created, the seed count did not move, the menu flags and event are unchanged.
 await expect(id(page,'receiver-card-0')).toHaveCount(0);expect(await exactText(page,'receiver-seed-next')).toBe(seed);expect(await menuState(page)).toEqual(menu);
 // C20: Find seeds from the written buffer; Cancel and Exit do not undo it; the reference Open then reads B.
 await findSeed(page,'B0013+38');
 await id(page,'pulsar-params-exit').click();await expect(win(page)).toHaveCount(0);
 await id(page,'pulsar-params-open').click();await windowAt(page,3,3,3);await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-activation','open');
 await expect(id(page,'pulsar-params-seed')).toContainText('was J0016+3824');
 await id(page,'pulsar-params-exit').click();
 // C24: nothing reached Save investigation; reload resets the command, the window and the menu history.
 expect((await save(page)).equals(before)).toBe(true);
 await page.clock.resume();await page.reload();await nav(page,'Radio telescope').click();await expect(id(page,'radio-access-card')).toBeVisible();
 await expect(command(page)).toHaveCount(0);await expect(id(page,'radio-access-menu')).toHaveAttribute('data-availability','hidden');
 await expect(id(page,'pulsar-ref-none')).toBeVisible();await expect(win(page)).toHaveCount(0);
});

test('C07: prefix collision: the buffer takes J0000, the window shows J0000+01 and the final shared cursor stays on it',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page,'synthetic-prefix.dat',PREFIX);await menuOn(page);
 await runCommand(page);
 await outcome(page,'hit');await windowAt(page,0,0,0);await expect(field(page,'j2000')).toHaveValue('J0000+01');
 await expect(id(page,'radio-access-list-status')).toContainText('shared source is now J0000.');
 await expect(id(page,'radio-access-list-status')).toContainText('record 1 (J0000+01)');
 // No later picker notification: after further tasks and time the cursor is still the activation's.
 await flush(page);await advance(page,1000);await windowAt(page,0,0,0);await expect(id(page,'pulsar-params-cursor-note')).toHaveCount(0);
 // Find seeds from the written buffer (B's legacy name), not from the record shown.
 await findSeed(page,'B0000');
});

test('C06/C22: a miss clears the name (head, no Find seed); an invalid receiver seed and Tracking off do not refuse the command',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);
 await slewTo(page,AT_B);await runCommand(page);await outcome(page,'hit');await windowAt(page,3,3,3);
 await slewTo(page,MISS);
 await command(page).click();await outcome(page,'miss');await expect(id(page,'pulsar-params-heading')).toBeFocused();
 await windowAt(page,0,0,0);await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','none');
 await expect(id(page,'pulsar-params-seed')).toContainText('had just cleared');
 await findSeed(page,'');// the stale B1950 name behind the cleared J2000 name is not used
 await id(page,'pulsar-params-exit').click();await expect(win(page)).toHaveCount(0);
 // C22: an invalid seed text and Tracking off.
 await id(page,'receiver-seed').fill('abc');await expect(id(page,'receiver-seed')).toHaveAttribute('aria-invalid','true');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking')).toHaveAttribute('aria-pressed','false');
 const reason=await id(page,'antenna-receiver').getAttribute('data-reason'),next=await exactText(page,'receiver-seed-next');
 expect(reason).not.toBe('available');await expect(id(page,'antenna-receiver-button')).toBeDisabled();
 await runCommand(page);await outcome(page,'miss');
 await expect(id(page,'antenna-receiver')).toHaveAttribute('data-reason',reason!);expect(await exactText(page,'receiver-seed-next')).toBe(next);
 await expect(id(page,'receiver-card-0')).toHaveCount(0);await expect(id(page,'receiver-seed')).toHaveValue('abc');
});

test('C06b: a hit on a record with an empty J2000 name says so (head shown; a reused window keeps its stored Find query, a new one gets no seed); its legacy name reaches the Record header; a miss stays a miss',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page,'synthetic-blank.dat',BLANK);await menuOn(page);await applyClock(page);
 await configure(page,false);await openReceiver(page);
 // A named hit first (record 3 at the first pointing).
 await runCommand(page);await outcome(page,'hit');await windowAt(page,2,2,2);
 await expect(id(page,'pulsar-params-seed')).toContainText('had just set the receivers’ shared source name to J0001+3826');
 await findSeed(page,'B2358+38');
 await slewTo(page,AT_B);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');await flush(page);
 // The unnamed hit (record 4): the status and note follow the command's result, not the absent seed (a miss has none either).
 await runCommand(page);await outcome(page,'hit');
 await expect(id(page,'radio-access-list-status')).toHaveText('File ▸ Pulsar List...: the record selected for the current pointing has an empty J2000 name. Its data and B1950 name replaced the receivers\' shared source, but with no J2000 name to look for Pulsar Parameters shows the first record (J0600+1000). No receiver was opened, redrawn or reseeded.');
 await expect(id(page,'pulsar-params-seed')).toHaveText('File ▸ Pulsar List... had just copied a record with an empty J2000 name into the receivers’ shared source (its numbers and B1950 name included), so there was no name to look for and the window opened at the first record.');
 await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','none');await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-activation','command');
 await windowAt(page,0,0,0);await expect(field(page,'j2000')).toHaveValue('J0600+1000');await expect(field(page,'b1950')).toHaveValue('B0557+10');
 // Find shows the window's stored query when it is not empty, and only an empty one is seeded from the live buffer
 // (openPulsarFind). The same-catalog reuse keeps the memory, so the B2358+38 stored by the Find above stays: this is not a
 // seed from the unnamed record. Exit drops the memory; the same command then starts a new window whose empty query is
 // not seeded either (the J2000 name is empty, so the stale legacy name behind it is not used).
 await findSeed(page,'B2358+38');
 await id(page,'pulsar-params-exit').click();await expect(win(page)).toHaveCount(0);
 await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await runCommand(page);await outcome(page,'hit');
 await expect(id(page,'radio-access-list-status')).toHaveText('File ▸ Pulsar List...: the record selected for the current pointing has an empty J2000 name. Its data and B1950 name replaced the receivers\' shared source, but with no J2000 name to look for Pulsar Parameters shows the first record (J0600+1000). No receiver was opened, redrawn or reseeded.');
 await expect(id(page,'pulsar-params-seed')).toHaveText('File ▸ Pulsar List... had just copied a record with an empty J2000 name into the receivers’ shared source (its numbers and B1950 name included), so there was no name to look for and the window opened at the first record.');
 await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','none');await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-activation','command');
 await windowAt(page,0,0,0);await expect(field(page,'j2000')).toHaveValue('J0600+1000');await expect(field(page,'b1950')).toHaveValue('B0557+10');
 await findSeed(page,'');// a new window: no stale B2358+38 and no B0013+38
 await expect(id(page,'receiver-record-disp')).toHaveText('On');
 // Receive → Stop: the header name is the unnamed row's legacy name. Compatible with the copy; a clock reassociation during
 // the slew may already have written the same row, so this alone does not prove the command's exclusive causality (the
 // core vector C06b isolates the command's full copy).
 await id(page,'receiver-mode').click();await flush(page);await advance(page,600);await id(page,'receiver-mode').click();await flush(page);await untilFinished(page);
 await expect(id(page,'receiver-record-finish')).toHaveAttribute('data-stage','identify');await expect(id(page,'receiver-record-identify-input')).toHaveValue('B0013+38');
 await id(page,'receiver-record-identify-ok').click();await id(page,'receiver-record-properties-ok').click();await id(page,'receiver-record-save-cancel').click();
 await expect(id(page,'receiver-record-finish')).toHaveCount(0);
 // A miss keeps its own texts.
 await slewTo(page,MISS);
 await command(page).click();await outcome(page,'miss');
 await expect(id(page,'radio-access-list-status')).toHaveText('File ▸ Pulsar List...: no catalog source was selected for the current pointing, so only the shared source name was cleared (the rest of the previous source stays behind it). Pulsar Parameters shows the first record. No receiver was opened, redrawn or reseeded.');
 await expect(id(page,'pulsar-params-seed')).toHaveText('File ▸ Pulsar List... had just cleared the receivers’ shared source name (no source was selected), so the window opened at the first record.');
 // The status and note boxes fit at 320 px.
 await page.setViewportSize({width:320,height:844});await flush(page);await noOverflow(page);
 for(const testId of ['radio-access-list-status','pulsar-params-seed']){
  const box=await id(page,testId).boundingBox();expect(box,testId).not.toBeNull();expect(box!.x+box!.width,testId).toBeLessThanOrEqual(320);
 }
});

test('C03/C02: a Receiver Open earlier in the same task disables the item before the command runs; nothing is written; the item then renders disabled',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);
 await expect(id(page,'antenna-receiver-button')).toBeEnabled();
 await sameTask(page,'antenna-receiver-button','radio-access-pulsar-list');
 await expect(id(page,'receiver-card-0')).toBeVisible();await outcome(page,'menu-disabled');
 await expect(id(page,'radio-access-list-status')).toHaveText('The File ▸ Pulsar List... item is disabled. Nothing was changed.');
 await expect(win(page)).toHaveCount(0);
 await expect(id(page,'radio-access-menu')).toHaveAttribute('data-availability','shown-disabled');await expect(command(page)).toBeDisabled();
 // A programmatic click on the disabled button runs nothing.
 await clickBehind(page,'radio-access-pulsar-list');await flush(page);await expect(win(page)).toHaveCount(0);await outcome(page,'menu-disabled');
});

test('C04/C11/C14/C16: Access On then Off keeps the item enabled with a receiver; at a frozen clock only the shared source changes; armed Record takes the new name at the next Receive; the Identify dialog refuses',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);await applyClock(page);
 await configure(page,false);await expect(id(page,'radio-access-menu')).toHaveAttribute('data-availability','shown-enabled');
 await openReceiver(page);
 await expect(id(page,'radio-access-menu-event')).toHaveAttribute('data-event','open-skipped');await expect(command(page)).toBeEnabled();
 await slewTo(page,AT_B);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');await flush(page);
 const before=await receiverState(page),menu=await menuState(page);
 await runCommand(page);await outcome(page,'hit');await windowAt(page,3,3,3);await flush(page);
 // C11/C14: nothing changed at the click (the clock is paused): title, source, sweep, pixels, seed, card order, timer, Record On.
 expect(await receiverState(page)).toEqual(before);expect(await menuState(page)).toEqual(menu);
 await field(page,'date').fill('777');// an admitted command would reset this pending edit
 // C14: Receive → Stop: the capture header takes the buffer's new legacy name; Record never started or erased by itself.
 await id(page,'receiver-mode').click();await flush(page);await advance(page,600);await id(page,'receiver-mode').click();await flush(page);await untilFinished(page);
 await expect(id(page,'receiver-record-finish')).toHaveAttribute('data-stage','identify');await expect(id(page,'receiver-record-identify-input')).toHaveValue('B0013+38');
 // C16: the Identify dialog is modal over the windows: refused, nothing written or reactivated.
 await clickBehind(page,'radio-access-pulsar-list');await outcome(page,'record-dialog-open');
 await expect(id(page,'radio-access-list-status')).toHaveText('Answer the receiver\'s Record dialog first. Nothing was changed.');
 await expect(field(page,'date')).toHaveValue('777');await windowAt(page,3,3,3);
 await id(page,'receiver-record-identify-ok').click();await id(page,'receiver-record-properties-ok').click();await id(page,'receiver-record-save-cancel').click();
 await expect(id(page,'receiver-record-finish')).toHaveCount(0);
});

test('C04b: with Access Off, a Receiver Open earlier in the same task leaves the item enabled and the command is admitted on the latest session',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);
 await configure(page,false);await expect(id(page,'radio-access-menu')).toHaveAttribute('data-availability','shown-enabled');
 await expect(id(page,'antenna-receiver-button')).toBeEnabled();
 // Unlike C03 (item On, so the same-task Open disables it), Access Off makes the Open skip the menu step and the command
 // runs. A hit shows it used the session after that Open: the route re-reads sessionNow() before committing and the
 // receiver commit is a compare-and-swap, so a pre-Open snapshot would give prepare-failed or drop the receiver.
 await sameTask(page,'antenna-receiver-button','radio-access-pulsar-list');
 await expect(id(page,'receiver-card-0')).toBeVisible();await outcome(page,'hit');
 await expect(id(page,'radio-access-menu-event')).toHaveAttribute('data-event','open-skipped');
 await expect(id(page,'radio-access-menu')).toHaveAttribute('data-availability','shown-enabled');await expect(command(page)).toBeEnabled();
 await windowAt(page,2,2,2);await expect(field(page,'j2000')).toHaveValue('J0001+3826');
 await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-activation','command');
 await flush(page);await expect(id(page,'receiver-card-0')).toBeVisible();
 await findSeed(page,'B2358+38');
});

test('C12/C16: while receiving the click changes nothing, the next ticks follow the new name; the receiver close box refuses',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);await applyClock(page);
 await configure(page,false);await openReceiver(page);
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');await advance(page,400);
 await expect(id(page,'receiver-source')).toHaveText('Profile source: J0001+3826');
 await slewTo(page,AT_B);
 const title=await exactText(page,'receiver-heading-0'),source=await exactText(page,'receiver-source'),sweep=await id(page,'receiver-sweep-0').getAttribute('data-position');
 await runCommand(page);await outcome(page,'hit');await flush(page);
 // At the click (no tick has run): same title, source and sweep.
 expect(await exactText(page,'receiver-heading-0')).toBe(title);expect(await exactText(page,'receiver-source')).toBe(source);
 expect(await id(page,'receiver-sweep-0').getAttribute('data-position')).toBe(sweep);
 // The next ticks run the existing name coupling: the profile follows B and receiving goes on.
 await advance(page,400);
 await expect(id(page,'receiver-source')).toHaveText('Profile source: J0016+3824');await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');
 await id(page,'receiver-mode').click();await flush(page);await untilFinished(page);
 // C16: the close box (slot 1 while slot 2 exists).
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();await id(page,'receiver-add').click();await expect(id(page,'receiver-card-2')).toBeVisible();
 await field(page,'date').fill('777');
 await id(page,'receiver-close-1').click();await expect(id(page,'receiver-close-box')).toBeVisible();
 await clickBehind(page,'radio-access-pulsar-list');await outcome(page,'close-box-open');
 await expect(field(page,'date')).toHaveValue('777');await windowAt(page,3,3,3);
 await id(page,'receiver-close-box-ok').click();await expect(id(page,'receiver-close-box')).toHaveCount(0);
});

test('C17: a foreign <dialog>, an antenna dialog opened in the same task, the configuration dialog, Parameters Find and its box all refuse; the TRadioLab close re-enables the item',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);
 // Receiver Open disables; the explicit TRadioLab recipient re-enables at the main close (R-RX7 history, no receiver left).
 await openReceiver(page);await expect(command(page)).toBeDisabled();
 await id(page,'radio-access-recipient-radio-lab').check();await id(page,'receiver-close-0').click();await expect(id(page,'receiver-card-0')).toHaveCount(0);
 await expect(id(page,'radio-access-menu-event')).toHaveAttribute('data-event','close-enabled');await expect(command(page)).toBeEnabled();
 await runCommand(page);await outcome(page,'hit');await windowAt(page,2,2,2);
 await field(page,'date').fill('777');// an admitted command would reset this pending edit
 const unchanged=async(reason:string)=>{await outcome(page,reason);await expect(field(page,'date')).toHaveValue('777');await windowAt(page,2,2,2);};
 // A page-level foreign modal <dialog>.
 await page.evaluate(()=>{const d=document.createElement('dialog');d.dataset.testid='foreign-dialog';d.textContent='Foreign dialog';document.body.append(d);d.showModal();});
 await clickBehind(page,'radio-access-pulsar-list');await unchanged('modal');
 await page.evaluate(()=>{const d=document.querySelector<HTMLDialogElement>('[data-testid="foreign-dialog"]')!;d.close();d.remove();});
 // Set Coordinates opened earlier in the same task.
 await sameTask(page,'antenna-set-coordinates','radio-access-pulsar-list');
 await expect(id(page,'antenna-dialog')).toBeVisible();await unchanged('modal');
 await id(page,'antenna-dialog-cancel').click();await flush(page);await expect(id(page,'antenna-dialog')).toHaveCount(0);
 // Positive control right after that Cancel: the command is admitted at once and resets the pending edit.
 await runCommand(page);await outcome(page,'hit');await expect(field(page,'date')).not.toHaveValue('777');await windowAt(page,2,2,2);
 await field(page,'date').fill('777');
 // The configuration's own dialog.
 await id(page,'radio-access-preferences').click();await expect(parent(page)).toBeVisible();
 await clickBehind(page,'radio-access-pulsar-list');await unchanged('modal');
 await page.keyboard.press('Escape');await expect(parent(page)).toHaveCount(0);
 // Parameters Find, then its not-found box.
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-dialog')).toBeVisible();
 await clickBehind(page,'radio-access-pulsar-list');await unchanged('modal');
 await id(page,'pulsar-find-query').fill('zzz');await id(page,'pulsar-find-ok').click();await expect(id(page,'pulsar-params-notice')).toBeVisible();
 await clickBehind(page,'radio-access-pulsar-list');await outcome(page,'modal');await expect(field(page,'date')).toHaveValue('777');
 await page.keyboard.press('Escape');await expect(id(page,'pulsar-params-notice')).toHaveCount(0);
 // Positive control: with nothing open the same programmatic click is admitted and resets the pending edit.
 await clickBehind(page,'radio-access-pulsar-list');await outcome(page,'hit');await expect(field(page,'date')).not.toHaveValue('777');
});

test('C18: no catalog and a pending read refuse; a cancelled read keeps nothing written',async({page})=>{
 await holdReads(page);await startApp(page);await radioRoute(page);await menuOn(page);
 await command(page).click();await outcome(page,'no-catalog');await expect(win(page)).toHaveCount(0);
 // A first read is pending: still no admitted catalog. Its cancellation and late completion admit nothing.
 await id(page,'pulsar-ref-file').setInputFiles({name:'held-command.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});await held(page,'held-command.dat');
 await command(page).click();await outcome(page,'no-catalog');
 await id(page,'pulsar-ref-cancel').click();await release(page,'held-command.dat');await flush(page);
 await expect(id(page,'pulsar-ref-none')).toBeVisible();await command(page).click();await outcome(page,'no-catalog');await expect(win(page)).toHaveCount(0);
 // With an admitted catalog, a second pending read refuses (reading).
 await loadCatalog(page);
 await id(page,'pulsar-ref-file').setInputFiles({name:'held-second.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});await held(page,'held-second.dat');
 await command(page).click();await outcome(page,'reading');await expect(win(page)).toHaveCount(0);
 await id(page,'pulsar-ref-cancel').click();await release(page,'held-second.dat');await flush(page);
 await runCommand(page);await outcome(page,'hit');await windowAt(page,2,2,2);
});

test('C19/C25: keyboard with a held Enter acts once; repeat reuses the window (Find memory kept, Date reset); Tab and Escape; a hidden route and an antenna box refuse',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);await applyClock(page);
 await command(page).focus();
 await page.keyboard.down('Enter');await expect(id(page,'pulsar-params-heading')).toBeFocused();
 await outcome(page,'hit');await windowAt(page,2,2,2);
 const date=await field(page,'date').inputValue();expect(date).not.toBe('');
 // While Enter stays down: a recognizable pending edit, then focus back on the command, so the repeat targets it.
 await field(page,'date').fill('777');await command(page).focus();await expect(command(page)).toBeFocused();
 // Test-only bubbling listener on window (it runs after React's root handler, so defaultPrevented shows ignoreHeldKey's effect).
 await page.evaluate(()=>{
  type Seen={target:string|undefined;repeat:boolean;prevented:boolean};
  const w=window as unknown as{__enterSeen:Seen[];__enterListener:(e:KeyboardEvent)=>void};
  w.__enterSeen=[];
  w.__enterListener=e=>{if(e.key==='Enter')w.__enterSeen.push({target:(e.target as HTMLElement).dataset?.testid,repeat:e.repeat,prevented:e.defaultPrevented});};
  window.addEventListener('keydown',w.__enterListener);
 });
 // The repeat (Playwright sends repeat:true) reaches the command, is prevented and runs nothing: an admitted run would move
 // focus to the heading and reset the Date edit.
 await page.keyboard.down('Enter');await flush(page);
 expect(await page.evaluate(()=>(window as unknown as{__enterSeen:unknown[]}).__enterSeen)).toEqual([{target:'radio-access-pulsar-list',repeat:true,prevented:true}]);
 await expect(field(page,'date')).toHaveValue('777');await expect(command(page)).toBeFocused();await expect(win(page)).toHaveCount(1);
 await page.keyboard.up('Enter');await flush(page);
 await expect(field(page,'date')).toHaveValue('777');await expect(command(page)).toBeFocused();await expect(win(page)).toHaveCount(1);await windowAt(page,2,2,2);
 await page.evaluate(()=>{const w=window as unknown as{__enterListener:(e:KeyboardEvent)=>void};window.removeEventListener('keydown',w.__enterListener);});
 await id(page,'pulsar-params-heading').focus();
 // Tab from the heading reaches the window's Find; Escape in Find cancels and returns focus to Find.
 await page.keyboard.press('Tab');await expect(id(page,'pulsar-params-find')).toBeFocused();
 await page.keyboard.press('Enter');await expect(id(page,'pulsar-find-query')).toBeFocused();await expect(id(page,'pulsar-find-query')).toHaveValue('B2358+38');
 await page.keyboard.press('Escape');await expect(id(page,'pulsar-find-dialog')).toHaveCount(0);await expect(id(page,'pulsar-params-find')).toBeFocused();
 // A Find hit stores the query; a pending Date edit.
 await page.keyboard.press('Enter');await page.keyboard.press('Control+A');await page.keyboard.type('B0013');await page.keyboard.press('Enter');
 await windowAt(page,3,3,3);await field(page,'date').fill('777');
 // C19: the repeated command reuses the window: one window, Find memory kept, Date reset, activation again on A.
 await runCommand(page);await expect(win(page)).toHaveCount(1);await windowAt(page,2,2,2);await expect(field(page,'date')).toHaveValue(date);
 await findSeed(page,'B0013');
 // A hidden route refuses (inactive); the status is seen when the route is shown again.
 await field(page,'date').fill('777');
 await page.goBack();await expect(id(page,'pulsar-analysis')).toBeVisible();
 await clickBehind(page,'radio-access-pulsar-list');
 await page.goForward();await expect(id(page,'radio-access-card')).toBeVisible();
 await outcome(page,'inactive');await expect(field(page,'date')).toHaveValue('777');
 // An antenna box that arrives takes priority (modal).
 await beginSlew(page,MISS);await untilArrival(page);
 await clickBehind(page,'radio-access-pulsar-list');await outcome(page,'modal');await expect(field(page,'date')).toHaveValue('777');
 await id(page,'antenna-notice-ok').click();await flush(page);
});

test('C25: the command, its note and status and the activated window fit 1440/390/375/320 without overflow; screenshots',async({page},info:TestInfo)=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);
 await runCommand(page);await outcome(page,'hit');
 for(const width of [1440,390,375,320]){
  await page.setViewportSize({width,height:width>500?1050:844});await flush(page);await noOverflow(page);
  await id(page,'radio-access-card').scrollIntoViewIfNeeded();
  await id(page,'radio-access-card').screenshot({path:info.outputPath(`pulsar-list-command-card-${width}.png`)});
  await id(page,'pulsar-params-card').screenshot({path:info.outputPath(`pulsar-list-command-window-${width}.png`)});
  for(const testId of ['radio-access-pulsar-list','radio-access-command-note','radio-access-list-status','pulsar-params-seed']){
   const box=await id(page,testId).boundingBox();expect(box,testId).not.toBeNull();expect(box!.x+box!.width,`${testId} ${width}`).toBeLessThanOrEqual(width);
  }
 }
});

/** One seeded receiver Record scenario (seed 1, paused radio clock, synthetic catalog) with or without the command at the
 * Receiver Open pointing (it writes the same record A again) and its window opened and exited. */
async function scenario(browser:Browser,info:TestInfo,withCommand:boolean){
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1440,height:1050},acceptDownloads:true});
 const page=await context.newPage();
 try{
  await startApp(page);await radioRoute(page);await loadCatalog(page);await menuOn(page);await applyClock(page);
  await configure(page,false);await openReceiver(page);
  if(withCommand){await runCommand(page);await outcome(page,'hit');await windowAt(page,2,2,2);await id(page,'pulsar-params-exit').click();await expect(win(page)).toHaveCount(0);}
  await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
  await id(page,'receiver-mode').click();await flush(page);await advance(page,600);await id(page,'receiver-mode').click();await flush(page);await untilFinished(page);
  const finish=id(page,'receiver-record-finish');await expect(finish).toHaveAttribute('data-stage','identify');
  const identify=await id(page,'receiver-record-identify-input').inputValue();
  await id(page,'receiver-record-identify-ok').click();await expect(finish).toHaveAttribute('data-stage','properties');
  const properties=await finish.innerText();
  await id(page,'receiver-record-properties-ok').click();await id(page,'receiver-record-save-cancel').click();await expect(finish).toHaveCount(0);
  const state=await receiverState(page);
  const saved=(await save(page)).toString('latin1');
  return {state,identify,properties,saved,menu:await menuState(page)};
 }finally{await context.close();}
}
test('C24 A/B: the same seeded Record scenario with and without the command gives identical receiver, Record and Save investigation results',async({browser},info)=>{
 test.setTimeout(240_000);
 const a=await scenario(browser,info,false),b=await scenario(browser,info,true);
 expect(b).toEqual(a);expect(a.identify).toBe('B2358+38');expect(a.state.source).toBe('Profile source: J0001+3826');
});
