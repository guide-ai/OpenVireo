import {test,expect,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {env} from 'node:process';
// Actual App flows of the silent receiver monitor (docs/RADIO-RECEIVER-MONITOR.md, R-RX2) on the #radio-control route:
// Open/Activate/Receive/Stop at the sweep end/Close/reopen, Freq/Incr/Vert/Horz, channels and the close box, refusals and
// the persistent tick error, the catalog lock, a project operation, route hide/show, modality, keyboard, viewports and
// reload. No harness and no product debug hook: only the rendered App, its data attributes, the browser clock control and
// the test-only read hold, and, in one test, test-only Canvas API instrumentation (a temporarily unavailable 2D context and
// recorded segments); no normal-use or native-runtime reproduction is claimed. The catalog is synthetic (no original rows); expected strings are the chosen web contract, not
// native oracles, and canvas pixels are checked only for presence (no pixel parity is claimed).
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const restore=(page:Page,name:string,text:string)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text,'utf8')});
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
// A: near the first pointing (RA 0 h, Dec = compiled latitude ≈ 38.43°), P 0.5 s. B: 4° east, P 0.04 s, which the
// session suite pins to a poisson-mean-domain refusal at H = 4 (dt = 0.01 s) and to success at H = 8. C: far away.
const ROWS:readonly Row[]=[
 {primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'},
 {primaryName:'J0016+3824',legacyName:'B0013+38',ra:'4',dec:'38.4',x2a:'0.04'},
 {primaryName:'J1200-3000',legacyName:'B1157-29',ra:'180',dec:'-30'},
];
const CATALOG=ROWS.map(line).join('\r\n')+'\r\n';
const HEADING_A="Pulsar B2358+38   Aperture: 100 Meters    Beam (HPBW): 0 Deg 41.9'";
const UT='2026-10-24T12:00:00';

/** The fake clock runs until the lazily loaded radio route has rendered (its chunk does not load under a paused clock);
 * radioRoute then pauses it, and every later step advances it explicitly. */
async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
}
async function radioRoute(page:Page){
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
/** Exercise, compiled defaults, the manual access tick, switch On (first FormActivate) and Tracking on. */
async function switchOnTracking(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await expect(id(page,'antenna-receiver-button')).toBeDisabled();await expect(id(page,'antenna-receiver')).toHaveAttribute('data-reason','receiver-disabled');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
async function loadCatalog(page:Page,text=CATALOG){
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-receiver.dat',mimeType:'text/plain',buffer:Buffer.from(text,'latin1')});
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
const position=async(page:Page,slot=0)=>Number(await id(page,`receiver-sweep-${slot}`).getAttribute('data-position'));
const exactText=(page:Page,testId:string)=>id(page,testId).evaluate(el=>el.textContent);
const yellowPixels=(page:Page,slot:number)=>page.evaluate(s=>{
 const c=document.querySelector(`[data-testid="receiver-canvas-${s}"]`) as HTMLCanvasElement,d=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;
 let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>200&&d[i+1]>200&&d[i+2]<80)n++;return n;
},slot);
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
 for(let i=0;i<60&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}

test('Open → Receive → Stop at the sweep end → Close → reopen; labels, refusals, focus, canvas; Save bytes unchanged',async({page})=>{
 await startApp(page);const before=await save(page);
 await radioRoute(page);await switchOnTracking(page);
 await expect(id(page,'antenna-receiver-button')).toBeDisabled();await expect(id(page,'antenna-receiver')).toHaveAttribute('data-reason','no-catalog');
 await expect(id(page,'receiver-setup')).toContainText('not an observation');await expect(id(page,'receiver-seed')).toHaveValue('1');
 await loadCatalog(page);
 await expect(id(page,'antenna-receiver-button')).toBeEnabled();await expect(id(page,'antenna-receiver-button')).toHaveText('Receiver');
 await openReceiver(page);
 expect(await exactText(page,'receiver-heading-0')).toBe(HEADING_A);
 for(const [control,value] of [['frequency','600.00'],['frequency-step','100'],['vertical','1.00'],['horizontal','4.0']])
  await expect(id(page,`receiver-${control}-value-0`)).toHaveText(value);
 await expect(id(page,'receiver-mode-disp-0')).toHaveText('Stop');await expect(id(page,'receiver-align-disp')).toHaveText('Yes');await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 // R-RX4: Record is enabled while the main timer is off (docs/RADIO-RECEIVER-RECORD.md); R-RX5: Align is live and on.
 await expect(id(page,'receiver-align')).toBeEnabled();await expect(id(page,'receiver-align')).toHaveAttribute('aria-pressed','true');await expect(id(page,'receiver-record')).toBeEnabled();
 await expect(id(page,'receiver-seed')).toBeDisabled();await expect(id(page,'receiver-seed-next')).toHaveText('Next reseed uses 2.');
 await expect(id(page,'receiver-sweep-0')).toHaveText('No sweep yet.');
 // The display is painted at mount (teal background, green grid, baseline and annotation): no yellow trace yet.
 expect(await yellowPixels(page,0)).toBe(0);
 // Without a radio UT, Mode is refused and nothing changes.
 await id(page,'receiver-mode').click();
 await expect(id(page,'receiver-status-0')).toHaveText('Refused: a radio UT is needed. Apply a UT and the radio longitude under Radio clock scenario.');
 await expect(id(page,'receiver-mode-disp-0')).toHaveText('Stop');await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
 await applyClock(page);
 await id(page,'receiver-mode').click();await flush(page);
 await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');await expect(id(page,'receiver-mode')).toBeFocused();
 await expect(id(page,'receiver-source')).toHaveText('Profile source: J0001+3826');
 for(const t of ['receiver-horizontal-down-0','receiver-horizontal-up-0','receiver-add'])await expect(id(page,t)).toBeDisabled();
 for(const t of ['receiver-frequency-up-0','receiver-frequency-step-down-0','receiver-vertical-up-0'])await expect(id(page,t)).toBeEnabled();
 await advance(page,1000);
 const p1=await position(page);expect(p1).toBeGreaterThan(100);
 expect(await yellowPixels(page,0)).toBeGreaterThan(50);
 // Frequency while receiving: the value changes and the receiver keeps receiving.
 await id(page,'receiver-frequency-up-0').click();await expect(id(page,'receiver-frequency-value-0')).toHaveText('700.00');
 await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');
 // Stop: Mode stays focusable but aria-disabled until the sweep ends.
 await id(page,'receiver-mode').focus();await id(page,'receiver-mode').click();await flush(page);
 await expect(id(page,'receiver-mode')).toHaveAttribute('aria-disabled','true');await expect(id(page,'receiver-mode')).toBeFocused();
 await expect(id(page,'receiver-sweep-0')).toContainText('finishing the sweep');await expect(id(page,'receiver-mode-disp-0')).toHaveText('Stop');
 // A press on the aria-disabled Mode does nothing (force: Playwright treats aria-disabled as not actionable).
 await id(page,'receiver-mode').click({force:true});await expect(id(page,'receiver-sweep-0')).toHaveAttribute('data-stop-pending','true');
 await expect(id(page,'receiver-mode-disp-0')).toHaveText('Stop');await expect(id(page,'receiver-mode')).toBeFocused();
 await untilFinished(page);
 await expect(id(page,'receiver-mode')).not.toHaveAttribute('aria-disabled','true');
 for(const t of ['receiver-horizontal-up-0','receiver-add'])await expect(id(page,t)).toBeEnabled();
 const frozen=await position(page);await advance(page,400);expect(await position(page)).toBe(frozen);
 expect((await save(page)).equals(before)).toBe(true);
 // Close: focus to the Receiver button; reopen creates a fresh window with the next seed.
 await id(page,'receiver-close-0').click();await expect(id(page,'receiver-card-0')).toHaveCount(0);await expect(id(page,'antenna-receiver-button')).toBeFocused();
 await expect(id(page,'receiver-setup-status')).toHaveText('Receiver window closed.');await expect(id(page,'receiver-seed')).toBeEnabled();
 // Seeds 1 (Open) and 2 (first profile allocation) were used; the refused Mode used none.
 await expect(id(page,'receiver-seed-next')).toHaveText('Next reseed uses 3.');
 await openReceiver(page);await expect(id(page,'receiver-frequency-value-0')).toHaveText('600.00');await expect(id(page,'receiver-sweep-0')).toHaveText('No sweep yet.');
 expect((await save(page)).equals(before)).toBe(true);
});

test('Freq MHz 400..1400 with at-limit beeps, Freq Incr. 1..5, held Enter ignored; Receiver button outside the key scope',async({page})=>{
 await setup(page);await openReceiver(page);
 const value=id(page,'receiver-frequency-value-0'),status=id(page,'receiver-status-0');
 await id(page,'receiver-frequency-down-0').click();await id(page,'receiver-frequency-down-0').click();await expect(value).toHaveText('400.00');
 await id(page,'receiver-frequency-down-0').click();await expect(status).toHaveText('Frequency is at its limit (the original beeps).');await expect(value).toHaveText('400.00');
 for(let i=0;i<10;i++)await id(page,'receiver-frequency-up-0').click();
 await expect(value).toHaveText('1400.00');await expect(status).toHaveText('');
 await id(page,'receiver-frequency-up-0').click();await expect(status).toHaveText('Frequency is at its limit (the original beeps).');
 await id(page,'receiver-frequency-step-up-0').click();await expect(status).toHaveText('Frequency increment is at its limit (the original beeps).');
 for(let i=0;i<4;i++)await id(page,'receiver-frequency-step-down-0').click();
 await expect(id(page,'receiver-frequency-step-value-0')).toHaveText('0.01');
 await id(page,'receiver-frequency-down-0').click();await expect(value).toHaveText('1399.99');
 // A held Enter steps once (WEB-RX-KEY-01: auto-repeat is ignored).
 await id(page,'receiver-frequency-down-0').focus();
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect(value).toHaveText('1399.98');
 // DFM TabOrder of the main window controls (R-RX4 Record and R-RX5 Align are enabled).
 await id(page,'receiver-frequency-down-0').focus();
 const order=['receiver-frequency-up-0','receiver-frequency-step-down-0','receiver-frequency-step-up-0','receiver-vertical-down-0','receiver-vertical-up-0',
  'receiver-horizontal-down-0','receiver-horizontal-up-0','receiver-add','receiver-align','receiver-mode','receiver-record','receiver-close-0'];
 for(const t of order){await page.keyboard.press('Tab');await expect(id(page,t)).toBeFocused();}
 // The table key N on the Receiver button does nothing (outside the RA-19 key scope).
 const dec=await id(page,'antenna-dec').getAttribute('data-dec-degrees');
 await id(page,'antenna-receiver-button').focus();await page.keyboard.press('n');await advance(page,400);
 await expect(id(page,'antenna-dec')).toHaveAttribute('data-dec-degrees',dec!);await expect(id(page,'antenna-manual-held')).toHaveCount(0);
 await expect(id(page,'receiver-card-1')).toHaveCount(0);
});

test('channels: Add twice, close refusal box (Enter/Escape, focus, timer continues), children follow Mode, add-nothing after the finish, main close cascades',async({page})=>{
 await setup(page);await applyClock(page);await openReceiver(page);
 await id(page,'receiver-add').click();await expect(id(page,'receiver-heading-1')).toBeFocused();
 expect(await exactText(page,'receiver-heading-1')).toBe("Receiver 2 (Slave)   Aperture: 100 Meters    Beam (HPBW): 0 Deg 41.9'");
 await id(page,'receiver-add').click();await expect(id(page,'receiver-heading-2')).toBeFocused();
 await expect(id(page,'receiver-add')).toBeDisabled();
 for(const t of ['receiver-mode','receiver-add','receiver-align','receiver-record'])await expect(id(page,'receiver-card-2').getByTestId(t)).toHaveCount(0);
 await expect(id(page,'receiver-horizontal-down-2')).toHaveCount(0);await expect(id(page,'receiver-horizontal-value-2')).toHaveText('4.0');
 // Child frequency is independent of the main.
 await id(page,'receiver-frequency-up-2').click();await expect(id(page,'receiver-frequency-value-2')).toHaveText('700.00');await expect(id(page,'receiver-frequency-value-0')).toHaveText('600.00');
 await id(page,'receiver-mode').click();await flush(page);
 for(const s of [0,1,2])await expect(id(page,`receiver-mode-disp-${s}`)).toHaveText('Receive');
 await advance(page,400);
 // Slot 1 cannot close while slot 2 exists: the recovered box; Enter closes it; focus back on its Close button.
 await id(page,'receiver-close-1').click();
 const box=id(page,'receiver-close-box');await expect(box).toBeVisible();await expect(box).toContainText('Cannot Close Receiver!');
 await expect(id(page,'receiver-close-box-text')).toHaveText('Close the Lowest Receiver First, or Close the Master Receiver to Close All.');
 await expect(id(page,'receiver-close-box-ok')).toBeFocused();
 await expect(id(page,'radio-route-panel-wrapper')).toHaveAttribute('inert','');await expect(id(page,'receiver-card-0')).toHaveAttribute('inert','');
 await expect(id(page,'pulsar-params-card')).toHaveAttribute('inert','');await expect(id(page,'radio-route-clock')).toHaveAttribute('inert','');
 const during=await position(page);await advance(page,400);expect(await position(page)).not.toBe(during);// the timer keeps running
 await page.keyboard.press('Enter');await expect(box).toHaveCount(0);await expect(id(page,'receiver-close-1')).toBeFocused();
 await expect(id(page,'receiver-card-1')).toBeVisible();
 await id(page,'receiver-close-1').click();await expect(box).toBeVisible();await page.keyboard.press('Escape');await expect(box).toHaveCount(0);
 await expect(id(page,'receiver-close-1')).toBeFocused();await expect(id(page,'radio-route-panel-wrapper')).not.toHaveAttribute('inert','');
 // Stop, finish: children stop with the main; the main's Add is enabled again but no slot is free.
 await id(page,'receiver-mode').click();await untilFinished(page);
 for(const s of [0,1,2])await expect(id(page,`receiver-mode-disp-${s}`)).toHaveText('Stop');
 expect(await position(page,1)).toBe(await position(page,0));
 await expect(id(page,'receiver-add')).toBeEnabled();await id(page,'receiver-add').click();
 await expect(id(page,'receiver-status-0')).toHaveText('Both channel windows are open: nothing was added, as in the original.');
 await expect(page.locator('[data-testid^="receiver-card-"]')).toHaveCount(3);
 // Closing the lowest child first is allowed; focus goes to the enabled main Add.
 await id(page,'receiver-close-2').click();await expect(id(page,'receiver-card-2')).toHaveCount(0);await expect(id(page,'receiver-add')).toBeFocused();
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-2')).toBeVisible();
 // The main close cascades.
 await id(page,'receiver-close-0').click();await expect(page.locator('[data-testid^="receiver-card-"]')).toHaveCount(0);
 await expect(id(page,'antenna-receiver-button')).toBeFocused();
});

test('refusals: Receive at B is refused (poisson-mean-domain) and succeeds at H = 8; a coupling refusal persists, Stop stays pending, Close recovers',async({page})=>{
 await setup(page);await applyClock(page);
 // Programmed slew to B (RA 0h16m, Dec 38°24'), then Open picks B within the open limit.
 await slewTo(page,['0','16','0','38','24','0']);
 await openReceiver(page);await expect(id(page,'receiver-heading-0')).toContainText('Pulsar B0013+38');
 await id(page,'receiver-mode').click();
 await expect(id(page,'receiver-status-0')).toContainText('Refused: a negative or invalid mean reached the noise draw');
 await expect(id(page,'receiver-mode-disp-0')).toHaveText('Stop');await expect(id(page,'receiver-sweep-0')).toHaveText('No sweep yet.');
 await id(page,'receiver-horizontal-up-0').click();await expect(id(page,'receiver-horizontal-value-0')).toHaveText('8.0');
 await id(page,'receiver-mode').click();await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');
 await advance(page,400);expect(await position(page)).toBeGreaterThan(0);
 await id(page,'receiver-close-0').click();await expect(id(page,'receiver-card-0')).toHaveCount(0);
 // Back to A and Receive at H = 4, then a slew to B and a clock tick reassociate the source: the next frame rebuilds and is refused.
 await slewTo(page,['0','1','0','38','24','0']);
 await openReceiver(page);await expect(id(page,'receiver-heading-0')).toContainText('Pulsar B2358+38');
 await id(page,'receiver-mode').click();await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');await advance(page,400);
 // Modality: under the Set Coordinates dialog the card is inert and the sweep continues.
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 await expect(id(page,'receiver-card-0')).toHaveAttribute('inert','');
 const under=await position(page);await advance(page,400);expect(await position(page)).not.toBe(under);
 await id(page,'antenna-dialog-cancel').click();await flush(page);
 await slewTo(page,['0','16','0','38','24','0']);
 await id(page,'antenna-clock-tick').click();await flush(page);await advance(page,200);
 const alert=id(page,'receiver-tick-error');
 await expect(alert).toHaveAttribute('data-kind','poisson-mean-domain');
 await expect(alert).toContainText('Stop is accepted but stays pending while this error persists; closing the main receiver window recovers.');
 const stuck=await position(page);await advance(page,600);expect(await position(page)).toBe(stuck);
 await id(page,'receiver-mode').click();await expect(id(page,'receiver-mode-disp-0')).toHaveText('Stop');
 await expect(id(page,'receiver-mode')).toHaveAttribute('aria-disabled','true');await expect(id(page,'receiver-horizontal-up-0')).toBeDisabled();
 await advance(page,600);await expect(alert).toBeVisible();await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','true');
 await id(page,'receiver-close-0').click();await expect(alert).toHaveCount(0);await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
 await expect(id(page,'antenna-receiver-button')).toBeFocused();
});

test('catalog lock, project operation (timer cancelled, no catch-up), route hide/show keeps the trace, viewports, reload empties',async({page},info)=>{
 await holdReads(page);await setup(page);const before=await save(page);
 await applyClock(page);await openReceiver(page);
 // WEB-RX-CAT-01: Load is refused while a receiver exists; the Pulsar Parameters window still opens.
 await expect(id(page,'pulsar-ref-load')).toBeDisabled();
 await expect(id(page,'pulsar-ref-load-reason')).toHaveText('Close the receiver windows before loading another catalog.');
 await id(page,'pulsar-ref-file').setInputFiles({name:'again.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});// a chooser change is refused too
 await expect(id(page,'pulsar-ref-status')).toHaveText('A catalog cannot be loaded while a receiver window is open.');
 await id(page,'pulsar-params-open').click();await expect(id(page,'pulsar-params-window')).toBeVisible();await id(page,'pulsar-params-exit').click();
 await id(page,'receiver-mode').click();await advance(page,600);
 // A held restore is a project operation: the receiver timer is cancelled, the sweep does not move and resumes without catch-up.
 await restore(page,'held-restore.json',before.toString('utf8'));await held(page,'held-restore.json');
 const frozen=await position(page);await advance(page,2000);expect(await position(page)).toBe(frozen);
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await release(page,'held-restore.json');await flush(page);
 await advance(page,200);const resumed=await position(page);expect(resumed).not.toBe(frozen);
 expect(Math.abs(resumed-frozen)).toBeLessThan(60);// no catch-up of the 2 s gap (≈ 300 positions at H = 4)
 expect((await save(page)).equals(before)).toBe(true);
 // Route hidden and shown: still receiving; the canvas bitmap is retained.
 const pixels=await page.evaluate(()=>(document.querySelector('[data-testid="receiver-canvas-0"]') as HTMLCanvasElement).toDataURL().length);
 await page.goBack();await expect(id(page,'radio-control')).toBeHidden();
 const hidden=await position(page);await advance(page,400);await page.goForward();await expect(id(page,'radio-control')).toBeVisible();
 expect(await position(page)).not.toBe(hidden);await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');
 expect(await page.evaluate(()=>(document.querySelector('[data-testid="receiver-canvas-0"]') as HTMLCanvasElement).toDataURL().length)).toBeGreaterThan(pixels/2);
 // Viewports with no horizontal overflow; screenshots attached to the report.
 for(const width of [1440,390,375,320]){
  await page.setViewportSize({width,height:width>500?1050:844});await flush(page);await noOverflow(page);
  await id(page,'receiver-card-0').screenshot({path:info.outputPath(`receiver-card-${width}.png`)});
  if(width!==390)await info.attach(`receiver-${width}.png`,{body:await page.screenshot({path:info.outputPath(`receiver-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
 await page.setViewportSize({width:1440,height:1050});
 await id(page,'receiver-close-0').click();await expect(id(page,'pulsar-ref-load')).toBeEnabled();await expect(id(page,'pulsar-ref-load-reason')).toHaveText('');
 // Reload: nothing persists.
 await page.clock.resume();await page.reload();await nav(page,'Radio telescope').click();await expect(id(page,'radio-control')).toBeVisible();
 await expect(page.locator('[data-testid^="receiver-card-"]')).toHaveCount(0);await expect(id(page,'receiver-seed')).toHaveValue('1');await expect(id(page,'pulsar-ref-none')).toBeVisible();
});

type Segment={from:number[];to:number[]};
type CanvasRecord={__rxLines:Segment[];__rxFills:number;__rxSuppressCanvas:boolean};
/** Test-only Canvas API instrumentation of receiver-canvas-0: getContext('2d') returns null while __rxSuppressCanvas is
 * set; drawn segments and full-canvas fills are recorded. Product code is unchanged. */
const recordReceiverCanvas=(page:Page)=>page.addInitScript(()=>{
 const w=window as unknown as CanvasRecord,mine=(c:HTMLCanvasElement)=>c.dataset.testid==='receiver-canvas-0';
 w.__rxLines=[];w.__rxFills=0;w.__rxSuppressCanvas=false;
 const get=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:unknown[]){
  if(args[0]==='2d'&&mine(this)&&w.__rxSuppressCanvas)return null;
  return (get as (...a:unknown[])=>RenderingContext|null).apply(this,args);
 } as typeof get;
 const proto=CanvasRenderingContext2D.prototype,move=proto.moveTo,line=proto.lineTo,fill=proto.fillRect,pens=new WeakMap<CanvasRenderingContext2D,number[]>();
 proto.moveTo=function(x,y){pens.set(this,[x,y]);return move.call(this,x,y);};
 proto.lineTo=function(x,y){if(mine(this.canvas))w.__rxLines.push({from:pens.get(this)??[],to:[x,y]});return line.call(this,x,y);};
 proto.fillRect=function(x,y,width,height){if(mine(this.canvas)&&x===0&&y===0&&width===401&&height===142)w.__rxFills++;return fill.call(this,x,y,width,height);};
});
const resetCanvasRecord=(page:Page)=>page.evaluate(()=>{const w=window as unknown as CanvasRecord;w.__rxLines=[];w.__rxFills=0;});
const suppressCanvas=(page:Page,on:boolean)=>page.evaluate(v=>{(window as unknown as CanvasRecord).__rxSuppressCanvas=v;},on);
const canvasRecord=(page:Page)=>page.evaluate(()=>{const w=window as unknown as CanvasRecord;return {lines:w.__rxLines,fullFills:w.__rxFills};});
/** Open at H = 0.5 (Horz down ×3) and start receiving. */
async function receiveAtHalf(page:Page){
 await recordReceiverCanvas(page);await setup(page);await openReceiver(page);await applyClock(page);
 for(let i=0;i<3;i++)await id(page,'receiver-horizontal-down-0').click();
 await expect(id(page,'receiver-horizontal-value-0')).toHaveText('0.5');
 await id(page,'receiver-mode').click();await flush(page);
}

test('dropped-log repaint after a test-only unavailable 2D context: the next segment continues from the session pen, as in an unfaulted run',async({page,browser},info)=>{
 // Control: its own context and fake clock, 200 ms steps (React commits in between), so no fallback is reached.
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:info.project.use.viewport});
 let expected:Segment[];
 try{
  const control=await context.newPage();await receiveAtHalf(control);
  await resetCanvasRecord(control);await advance(control,2880);await control.clock.runFor(40);await flush(control);
  expect((await canvasRecord(control)).fullFills).toBe(0);
  expect(await position(control)).toBe(303);
  await resetCanvasRecord(control);await control.clock.runFor(40);await flush(control);
  expected=(await canvasRecord(control)).lines;
 }finally{await context.close();}
 expect(expected.length).toBeGreaterThan(0);
 // Faulted run: no canvas context for 2880 ms, so the bounded log drops unseen ops; the next commit takes the repaint branch.
 await receiveAtHalf(page);
 await resetCanvasRecord(page);await suppressCanvas(page,true);await page.clock.runFor(2880);await flush(page);
 await suppressCanvas(page,false);await page.clock.runFor(40);await flush(page);
 expect((await canvasRecord(page)).fullFills).toBe(1);
 expect(await position(page)).toBe(303);
 await resetCanvasRecord(page);await page.clock.runFor(40);await flush(page);
 const batch=(await canvasRecord(page)).lines;
 expect(batch.filter(s=>s.from[0]===640.5)).toEqual([]);
 expect(batch[0].from[0]).toBe(303.5);expect(batch[0].to).toEqual([304.5,110.5]);// endpoint of the retained before-fix evidence
 expect(batch).toEqual(expected);
});

// Optional original fixture: run with OPENVIREO_PULSARS_DAT; skipped by name when unset. Invariants only: no counts, rows
// or values from the file are asserted or embedded.
test('original Pulsars.dat (OPENVIREO_PULSARS_DAT; skipped when unset): open and receive at the first pointing',async({page})=>{
 test.skip(!env.OPENVIREO_PULSARS_DAT,'OPENVIREO_PULSARS_DAT is not set');
 const bytes=await readFile(env.OPENVIREO_PULSARS_DAT!);
 await startApp(page);await radioRoute(page);await switchOnTracking(page);
 await id(page,'pulsar-ref-file').setInputFiles({name:'Pulsars.dat',mimeType:'text/plain',buffer:bytes});await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
 await applyClock(page);await openReceiver(page);
 await expect(id(page,'receiver-heading-0')).toHaveText(/^(Pulsar \S+|No Pulsar in Beam!)\s+Aperture: 100 Meters\s+Beam \(HPBW\): 0 Deg 41\.9'$/);
 await id(page,'receiver-mode').click();await advance(page,600);
 await expect(id(page,'receiver-tick-error')).toHaveCount(0);expect(await position(page)).toBeGreaterThan(0);
});
