import {test,expect,type Locator,type Page,type TestInfo} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Actual App flows of the RA-13 radio clock (docs/RADIO-ANTENNA.md): explicit web UT scenario, compiled radio longitude,
// manual and nominal 1000 ms ticks, Tracking/drift, slews, modality, hidden route/panel, project busy, range end and
// formats. No harness and no product debug hook: only the rendered App, its test-only raw data attributes and file-read
// holds. Values are the chosen web contract (binary64 WEB-CLOCK-01), not native oracles or acquired observations.
// The controlled browser clock is installed only after every lazy tool used has loaded. It does not run React's
// MessageChannel scheduler, so time advances one interval at a time with a flush after each, as one delivery per
// committed input requires (WEB-TIMER-01/02).
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const toolbar=(page:Page)=>page.locator('.investigation-toolbar');
const press=(info:TestInfo,target:Locator)=>info.project.name==='touch-375'?target.tap():target.click();
const focusable=(target:Locator)=>target.evaluate(el=>{(el as HTMLElement).focus();return document.activeElement===el;});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function flushTasks(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
/** Advance the controlled clock by `count` steps of `stepMs`, letting React commit after each. */
async function advance(page:Page,count:number,stepMs=1000){for(let i=0;i<count;i++){await page.clock.runFor(stepMs);await flushTasks(page);}}
const file=(name:string,text:string,mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(text,'latin1')});
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const restore=(page:Page,name:string,text:string)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles(file(name,text,'application/json'));
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
 expect(createHash('sha256').update(JSON.stringify(next.radio)).digest('hex')).toBe(next.radioDigestSHA256);
 return next.radio;
}
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

const T0=Date.UTC(2000,0,1,12),LON='-1.393499963671317';
/** Raw binary64 attributes (String(number) round-trips exactly). */
const raw=async(page:Page,testId:string,attribute:string)=>Number(await id(page,testId).getAttribute(attribute));
const ra=(page:Page)=>raw(page,'antenna-ra','data-ra-hours'),lst=(page:Page)=>raw(page,'antenna-clock-lst','data-lst-hours');
const ha=(page:Page)=>raw(page,'antenna-hour-angle','data-ha-hours'),ut=(page:Page)=>raw(page,'antenna-clock-ut','data-ut-ms');
/** 0x4bad9c port policy (normalizeRaHours), restated for the raw-number checks. */
const normalize=(x:number)=>{let r=x-Math.trunc(x/24)*24;if(r<0)r+=24;return r===24?0:r;};

async function openRadio(page:Page,info:TestInfo){
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await press(info,nav(page,'Radio telescope'));await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-control')).toBeVisible();
}
/** Explicit compiled-default selection, manual access tick and switch On; Tracking stays off (first FormActivate). */
async function setupRadio(page:Page,info:TestInfo){
 await press(info,id(page,'radio-exercise'));await press(info,id(page,'radio-env-compiled'));
 await press(info,id(page,'radio-access'));await press(info,id(page,'radio-timer-deliver'));await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await press(info,id(page,'radio-switch'));await expect(id(page,'antenna-status')).toContainText('initialized');await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
}
async function supplyClock(page:Page,info:TestInfo,utc='2000-01-01T12:00:00'){
 await id(page,'radio-clock-utc').fill(utc);await press(info,id(page,'radio-clock-apply'));await expect(id(page,'radio-clock-applied')).toHaveText(`${utc} UT`);
 await press(info,id(page,'radio-clock-longitude'));await expect(id(page,'radio-clock-lon')).toHaveAttribute('data-longitude-radians',LON);
}
/** Loaded routes first; then a paused controlled clock. */
async function controlledClock(page:Page){await page.clock.install();await page.clock.pauseAt(Date.now()+60_000);await flushTasks(page);}
const FIELDS=['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'] as const;
async function enterCoordinates(page:Page,values:readonly [string,string,string,string,string,string]){for(const [i,name] of FIELDS.entries())await id(page,`antenna-field-${name}`).fill(values[i]);}
const notice=(page:Page)=>id(page,'antenna-notice');

test('no default radio time: nothing ticks until a UT and the compiled longitude are applied; invalid UT and Cancel keep the applied value; first tick points RA at LST',async({page},info)=>{
 await openRadio(page,info);
 await expect(id(page,'radio-route-scenario-clock')).toContainText('no time is taken from this computer or from the observatory clock');
 await expect(id(page,'radio-clock-applied')).toHaveText('Not supplied');await expect(id(page,'radio-clock-state')).toContainText('No radio UT applied');
 await setupRadio(page,info);
 await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-clock-unsupplied')).toBeVisible();
 await expect(id(page,'antenna-clock-tick')).toBeDisabled();await expect(id(page,'antenna-clock-none')).toBeVisible();await expect(id(page,'antenna-hour-angle')).toContainText('0.000000 h');
 await press(info,id(page,'radio-clock-start'));await expect(id(page,'radio-clock-status')).toHaveText('Apply a UT first; no default time is used.');
 await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','false');
 // Invalid UT text is refused; Cancel restores the applied value (none yet, then the applied one).
 for(const bad of ['2000-13-01T00:00:00','2100-01-01T00:00:00','2000-01-01 12:00']){
  await id(page,'radio-clock-utc').fill(bad);await press(info,id(page,'radio-clock-apply'));
  await expect(id(page,'radio-clock-status')).toContainText('not a valid');await expect(id(page,'radio-clock-applied')).toHaveText('Not supplied');
 }
 await press(info,id(page,'radio-clock-cancel'));await expect(id(page,'radio-clock-utc')).toHaveValue('');
 await id(page,'radio-clock-utc').fill('2000-01-01T12:00:00');await id(page,'radio-clock-utc').press('Enter');
 await expect(id(page,'radio-clock-applied')).toHaveText('2000-01-01T12:00:00 UT');await expect(id(page,'antenna-clock-tick')).toBeDisabled();
 await press(info,id(page,'radio-clock-start'));await expect(id(page,'radio-clock-status')).toHaveText('Apply the compiled radio longitude first.');
 await id(page,'radio-clock-utc').fill('1999-01-01T00:00:00');await press(info,id(page,'radio-clock-cancel'));await expect(id(page,'radio-clock-utc')).toHaveValue('2000-01-01T12:00:00');
 await press(info,id(page,'radio-clock-longitude'));await expect(id(page,'radio-clock-lon')).toContainText(`${LON} rad, east positive`);
 await expect(id(page,'radio-clock-state')).toHaveText('Paused at 2000-01-01T12:00:00.000Z (scenario time).');
 const dec=await id(page,'antenna-dec').textContent();
 await press(info,id(page,'antenna-clock-tick'));
 await expect(id(page,'antenna-clock-ut')).toHaveAttribute('data-ut-ms',String(T0));await expect(id(page,'antenna-clock-jd')).toHaveText('2451545.000000');
 expect(await ra(page)).toBe(await lst(page));expect(await ha(page)).toBe(0);await expect(id(page,'antenna-dec')).toHaveText(dec!);
 expect(await lst(page)).toBeGreaterThan(13.37);expect(await lst(page)).toBeLessThan(13.38);
 await expect(id(page,'antenna-clock-lst')).toContainText('h');await expect(id(page,'antenna-clock-unsupplied')).toHaveCount(0);
 await noOverflow(page);
 // 320 px: the new card itself must not overflow (the rest of the App is outside this increment); screenshot for inspection.
 await page.setViewportSize({width:320,height:800});
 await expect.poll(()=>id(page,'radio-route-clock').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(0);
 await page.screenshot({path:info.outputPath('radio-clock-320.png'),fullPage:true});
});

test('Tracking holds RA and copies HA; the running 1000 ms clock drifts RA by the LST change with Tracking off; Pause stops scenario time',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await supplyClock(page,info);await controlledClock(page);
 await press(info,id(page,'antenna-tracking'));await press(info,id(page,'antenna-clock-tick'));await flushTasks(page);
 expect(await ra(page)).toBe(0);expect(await ha(page)).toBe(await lst(page));
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 await advance(page,10);
 expect(await ut(page)).toBe(T0+10_000);expect(await ra(page)).toBe(0);expect(await ha(page)).toBe(await lst(page));
 await press(info,id(page,'antenna-tracking'));await flushTasks(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
 const l1=await lst(page),h1=await ha(page);
 await advance(page,60);
 const l2=await lst(page),r2=await ra(page);
 expect(await ut(page)).toBe(T0+70_000);expect(r2).toBe(normalize(l2-h1));expect(await ha(page)).toBe(h1);
 expect(Math.abs(r2-(l2-l1))).toBeLessThan(1e-12);expect(r2).toBeGreaterThan(0.0167);expect(r2).toBeLessThan(0.0168);// ≈ 60 s of sidereal time
 await press(info,id(page,'radio-clock-pause'));await flushTasks(page);await expect(id(page,'radio-clock-state')).toHaveText('Paused at 2000-01-01T12:01:10.000Z (scenario time).');
 await advance(page,5);expect(await ut(page)).toBe(T0+70_000);expect(await ra(page)).toBe(r2);
});

test('ticks continue under the coordinate dialog and the boxes; the clock card is inert behind them; slew, stop/resume and arrival keep HA bookkeeping; RA drifts from the target after Tracking off',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await supplyClock(page,info);
 await press(info,id(page,'antenna-tracking'));await controlledClock(page);
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-field-raHours')).toBeFocused();
 await expect(id(page,'radio-route-clock')).toHaveAttribute('inert','');expect(await focusable(id(page,'radio-clock-utc'))).toBe(false);
 expect(await focusable(id(page,'radio-clock-pause'))).toBe(false);await expect(id(page,'antenna-field-raHours')).toBeFocused();
 await advance(page,3);// the admitted clocktimer ticks while the modal dialog is open
 expect(await ut(page)).toBe(T0+3000);await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-field-raHours')).toBeFocused();
 await enterCoordinates(page,['0','30','0','35','0','0']);await id(page,'antenna-dialog-ok').click();await flushTasks(page);
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');
 await advance(page,2);expect(await ut(page)).toBe(T0+5000);await expect(id(page,'antenna-notice-yes')).toBeFocused();
 await id(page,'antenna-notice-yes').click();await flushTasks(page);await expect(id(page,'radio-route-clock')).not.toHaveAttribute('inert');
 await advance(page,3,100);await expect(id(page,'antenna-motion')).toContainText('Slewing');
 // Stop question: the slew pauses, the clock keeps ticking; No resumes.
 await id(page,'antenna-set-coordinates').click();await flushTasks(page);await expect(notice(page)).toHaveAttribute('data-kind','stop-slew');
 await expect(id(page,'radio-route-clock')).toHaveAttribute('inert','');
 const paused=await id(page,'antenna-ticks').textContent(),before=await ut(page);
 await advance(page,15,100);expect(await ut(page)).toBe(before+1000);await expect(id(page,'antenna-ticks')).toHaveText(paused!);
 await id(page,'antenna-notice-no').click();await flushTasks(page);
 for(let i=0;i<40&&await notice(page).count()===0;i++)await advance(page,1,100);
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');await id(page,'antenna-notice-ok').click();await flushTasks(page);
 await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 30 Mins 0.00 Secs');
 await advance(page,5);expect(await ra(page)).toBe(0.5);expect(await ha(page)).toBe((await lst(page))-0.5);// Tracking on: copy branch
 await press(info,id(page,'antenna-tracking'));await flushTasks(page);const h=await ha(page);
 await advance(page,30);const r=await ra(page);expect(r).toBe(normalize((await lst(page))-h));expect(r).toBeGreaterThan(0.5);expect(r).toBeLessThan(0.5+0.01);
 await expect(id(page,'antenna-dec')).toHaveText('+35 Degs 0 Mins 0.0 Secs');
});

test('an arrival box appearing while the UT field has focus owns focus; OK returns it to Set Coordinates, not behind the box',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await supplyClock(page,info);await press(info,id(page,'antenna-tracking'));
 // About 25 nominal 100 ms slew ticks: the UT field takes focus well before the arrival, which comes within the default wait.
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','35','0','0']);await id(page,'antenna-dialog-ok').click();
 await id(page,'antenna-notice-yes').click();await expect(notice(page)).toHaveCount(0);
 await id(page,'radio-clock-utc').focus();await expect(id(page,'radio-clock-utc')).toBeFocused();
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 expect(await focusable(id(page,'radio-clock-utc'))).toBe(false);
 await page.keyboard.press('Enter');await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-set-coordinates')).toBeFocused();
 await expect(id(page,'radio-clock-utc')).toHaveValue('2000-01-01T12:00:00');await expect(id(page,'radio-clock-applied')).toHaveText('2000-01-01T12:00:00 UT');
});

test('the clock keeps ticking with the panel window closed and the route hidden; on return the readout shows the current tick',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await supplyClock(page,info);await controlledClock(page);
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await advance(page,2);
 await press(info,id(page,'radio-panel-close'));await flushTasks(page);await expect(id(page,'radio-panel-window')).toHaveCount(0);
 await press(info,nav(page,'Observatory'));await flushTasks(page);await expect(id(page,'radio-control')).toBeHidden();
 await advance(page,30);
 await press(info,nav(page,'Radio telescope'));await flushTasks(page);await press(info,id(page,'radio-switch'));await flushTasks(page);
 await expect(id(page,'radio-panel-window')).toBeVisible();
 expect(await ut(page)).toBe(T0+32_000);expect(await ra(page)).toBe(await lst(page));// Tracking off, HA 0 since activation
});

test('a project operation freezes the radio clock without catch-up; Save keeps the other tools unchanged and the radio clock in its Radio part; reload resets the scenario',async({page},info)=>{
 // `before` (v≤22, no Radio part) is the held Restore fixture: restoring it never replaces the Radio state.
 await holdReads(page);await page.goto('/#observatory');const before=await save(page);
 await press(info,nav(page,'Radio telescope'));await setupRadio(page,info);await supplyClock(page,info);await controlledClock(page);
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await advance(page,2);expect(await ut(page)).toBe(T0+2000);
 // v23 Radio part: the applied UT, the compiled longitude and the elapsed scenario time (the Save itself starts nothing).
 const running=radioPart(await save(page),before).workspace.clock;
 expect(running).toMatchObject({utc:'2000-01-01T12:00:00',longitudeRadians:Number(LON),limit:null});
 expect(running.elapsedMS).toBeGreaterThanOrEqual(2000);expect(running.elapsedMS).toBeLessThan(3000);
 await restore(page,'held-clock.json',before.toString('utf8'));await held(page,'held-clock.json');await flushTasks(page);
 await expect(page.locator('[data-testid="radio-route"]').locator('xpath=ancestor::div[@inert]')).toHaveCount(1);
 await page.clock.runFor(10_000);await flushTasks(page);expect(await ut(page)).toBe(T0+2000);
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await flushTasks(page);
 await page.clock.runFor(999);await flushTasks(page);expect(await ut(page)).toBe(T0+2000);
 await page.clock.runFor(1);await flushTasks(page);expect(await ut(page)).toBe(T0+3000);// fresh registration, frozen span not caught up
 await release(page,'held-clock.json');await flushTasks(page);await expect(toolbar(page).locator('[role="alert"]')).toHaveCount(0);
 await press(info,id(page,'radio-clock-pause'));await flushTasks(page);await page.clock.resume();
 // The frozen span is not caught up in the saved elapsed time either; the unrelated base is still the earlier file.
 const paused=radioPart(await save(page),before).workspace.clock;
 expect(paused).toMatchObject({utc:'2000-01-01T12:00:00',longitudeRadians:Number(LON),limit:null});
 expect(paused.elapsedMS).toBeGreaterThanOrEqual(3000);expect(paused.elapsedMS).toBeLessThan(4000);
 // Nothing is stored in the browser: a reload without Restore returns to the unsupplied scenario.
 await page.reload();await expect(heading(page,'Radio telescope control')).toBeVisible();
 await expect(id(page,'radio-clock-applied')).toHaveText('Not supplied');await expect(id(page,'radio-clock-utc')).toHaveValue('');await expect(id(page,'radio-switch')).toBeDisabled();
});

test('re-applying a UT while running pauses and the next tick jumps; the range end stops the clock at the last valid tick',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await supplyClock(page,info);await controlledClock(page);
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await advance(page,3);expect(await ut(page)).toBe(T0+3000);
 await id(page,'radio-clock-utc').fill('2010-06-01T00:00:00');await press(info,id(page,'radio-clock-apply'));await flushTasks(page);
 await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','false');await expect(id(page,'radio-clock-status')).toHaveText('UT applied; the radio clock is paused at it.');
 await advance(page,2);expect(await ut(page)).toBe(T0+3000);
 await press(info,id(page,'antenna-clock-tick'));await flushTasks(page);expect(await ut(page)).toBe(Date.UTC(2010,5,1));expect(await ra(page)).toBe(await lst(page));
 // Range end: 10 s before 2100, then 20 s of running time.
 await id(page,'radio-clock-utc').fill('2099-12-31T23:59:50');await press(info,id(page,'radio-clock-apply'));
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await advance(page,20);
 const last=Date.UTC(2099,11,31,23,59,59);
 await expect(id(page,'radio-clock-status')).toContainText('Radio clock stopped: scenario time passed 2099-12-31T23:59:59.999Z');
 await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','false');await expect(id(page,'radio-clock-state')).toContainText('Stopped');
 expect(await ut(page)).toBe(last);expect(await ra(page)).toBe(await lst(page));
 await expect(id(page,'antenna-clock-tick')).toBeDisabled();
 await expect(id(page,'antenna-clock-domain')).toBeVisible();await expect(id(page,'antenna-clock-unsupplied')).toHaveCount(0);
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await expect(id(page,'radio-clock-status')).toContainText('Apply a UT first');
 await advance(page,3);expect(await ut(page)).toBe(last);
});

test('with the clock running, held Enter and Escape still act on one radio surface at a time',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await supplyClock(page,info);await press(info,id(page,'antenna-tracking'));
 await press(info,id(page,'radio-clock-start'));
 await id(page,'antenna-set-coordinates').click();await id(page,'antenna-field-raHours').fill('25');
 await page.keyboard.down('Enter');await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await page.keyboard.down('Enter');await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');await page.keyboard.up('Enter');
 await expect.poll(()=>id(page,'antenna-clock-ut').getAttribute('data-ut-ms')).not.toBe(String(T0));// real 1000 ms ticks under the box
 await page.keyboard.down('Escape');await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-dialog')).toBeVisible();
 await page.keyboard.down('Escape');await expect(id(page,'antenna-dialog')).toBeVisible();await page.keyboard.up('Escape');
 await page.keyboard.press('Escape');await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-set-coordinates')).toBeFocused();
 await press(info,id(page,'radio-clock-pause'));
});

type HeldInterval={handle:number;ms:number;callback:()=>void};
type HeldIntervals={active:HeldInterval[];retired:HeldInterval[]};
/** Test-only interval wrapper (synthetic scheduling, not a Windows/native or Chrome throttling witness): 100 ms and
 * 1000 ms registrations are recorded under unique handles and NOT forwarded, so the test delivers them itself; clearing
 * one moves it to `retired`. Every other interval is forwarded to the controlled clock. */
const holdIntervals=(page:Page)=>page.evaluate(()=>{
 const w=window as unknown as{__intervals:HeldIntervals},registry:HeldIntervals={active:[],retired:[]};w.__intervals=registry;
 const set=window.setInterval.bind(window),clear=window.clearInterval.bind(window);let next=1_000_000_000;
 window.setInterval=((callback:TimerHandler,ms?:number,...args:unknown[])=>{
  if((ms===100||ms===1000)&&typeof callback==='function'){const handle=next++;registry.active.push({handle,ms,callback:()=>callback(...args)});return handle;}
  return set(callback,ms,...args);
 }) as typeof window.setInterval;
 window.clearInterval=((handle?:number)=>{
  const i=registry.active.findIndex(r=>r.handle===handle);
  if(i>=0){registry.retired.push(...registry.active.splice(i,1));return;}
  clear(handle);
 }) as typeof window.clearInterval;
});
const heldMs=(page:Page,list:'active'|'retired')=>page.evaluate(l=>(window as unknown as{__intervals:HeldIntervals}).__intervals[l].map(r=>r.ms),list);
/** Runs the held registrations of each interval in `order` inside one task (one evaluate), before React can commit. */
const fireHeld=(page:Page,order:readonly number[],list:'active'|'retired'='active')=>page.evaluate(([o,l])=>{
 const r=(window as unknown as{__intervals:HeldIntervals}).__intervals;
 for(const ms of o as number[])for(const reg of r[l as 'active'|'retired'].filter(x=>x.ms===ms))reg.callback();
},[order,list] as const);

test('slew and clock callbacks in the same task chain from the latest accepted state in either order; a retired callback does nothing',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await supplyClock(page,info);
 await press(info,id(page,'antenna-tracking'));await controlledClock(page);await holdIntervals(page);
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['0','30','0','30','0','0']);await id(page,'antenna-dialog-ok').click();await flushTasks(page);
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flushTasks(page);
 await expect.poll(async()=>{const ms=await heldMs(page,'active');return ms.includes(100)&&ms.includes(1000);}).toBe(true);
 const dec0=await id(page,'antenna-dec').textContent();
 // Round 1: the clocktimer first, then SlewTimer2, both before React commits.
 await page.clock.runFor(1000);await fireHeld(page,[1000,100]);await flushTasks(page);
 await expect(id(page,'antenna-ticks')).toHaveText(/: 1$/);await expect(id(page,'antenna-dec')).not.toHaveText(dec0!);
 expect(await ut(page)).toBe(T0+1000);expect(await ha(page)).toBe((await lst(page))-(await ra(page)));// Dec phase, Tracking on: copy branch
 const dec1=await id(page,'antenna-dec').textContent();
 // Round 2: the other order, with the route hidden.
 await press(info,nav(page,'Observatory'));await flushTasks(page);await expect(id(page,'radio-control')).toBeHidden();
 await page.clock.runFor(1000);await fireHeld(page,[100,1000]);await flushTasks(page);
 await press(info,nav(page,'Radio telescope'));await flushTasks(page);await expect(id(page,'radio-control')).toBeVisible();
 await expect(id(page,'antenna-ticks')).toHaveText(/: 2$/);await expect(id(page,'antenna-dec')).not.toHaveText(dec1!);
 expect(await ut(page)).toBe(T0+2000);expect(await ha(page)).toBe((await lst(page))-(await ra(page)));
 // Pause retires the clock registration; after Start, its late callback is ignored while the new one ticks.
 await press(info,id(page,'radio-clock-pause'));await flushTasks(page);expect(await heldMs(page,'retired')).toContain(1000);
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await page.clock.runFor(1000);
 await fireHeld(page,[1000],'retired');await flushTasks(page);expect(await ut(page)).toBe(T0+2000);
 await fireHeld(page,[1000]);await flushTasks(page);expect(await ut(page)).toBe(T0+3000);
 await press(info,id(page,'radio-clock-pause'));
});

test('the route stops the scenario at the range end before panel activation and while hidden; Pause past the end and a project freeze do not invent time; the panel then names the range end',async({page},info)=>{
 await holdReads(page);await page.goto('/#observatory');const before=await save(page);
 await press(info,nav(page,'Radio telescope'));await expect(heading(page,'Radio telescope control')).toBeFocused();
 await supplyClock(page,info,'2099-12-31T23:59:50');await controlledClock(page);
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await advance(page,5);
 await press(info,id(page,'radio-clock-pause'));await flushTasks(page);await expect(id(page,'radio-clock-state')).toHaveText('Paused at 2099-12-31T23:59:55.000Z (scenario time).');
 // Not activated and hidden: nothing reads the clock, the route's own deadline stops it.
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await advance(page,2);
 await press(info,nav(page,'Observatory'));await flushTasks(page);await advance(page,4);
 await press(info,nav(page,'Radio telescope'));await flushTasks(page);
 await expect(id(page,'radio-clock-state')).toContainText('Stopped');await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','false');
 await expect(id(page,'radio-clock-status')).toContainText('Radio clock stopped');
 // A project operation freezes the remaining 5 s: no stop while frozen, no catch-up afterwards.
 await id(page,'radio-clock-utc').fill('2099-12-31T23:59:50');await press(info,id(page,'radio-clock-apply'));
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);await advance(page,5);
 await restore(page,'held-range.json',before.toString('utf8'));await held(page,'held-range.json');await flushTasks(page);
 await page.clock.runFor(30_000);await flushTasks(page);
 await expect(id(page,'radio-clock-state')).toContainText('frozen');await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await flushTasks(page);
 await page.clock.runFor(4999);await flushTasks(page);await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 await page.clock.runFor(1);await flushTasks(page);
 await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','false');await expect(id(page,'radio-clock-state')).toContainText('Stopped');
 await release(page,'held-range.json');await flushTasks(page);await expect(toolbar(page).locator('[role="alert"]')).toHaveCount(0);
 // Activation afterwards: the panel names the range end, not a missing UT, and manufactures no reading.
 await page.clock.resume();await setupRadio(page,info);
 await expect(id(page,'antenna-clock-domain')).toBeVisible();await expect(id(page,'antenna-clock-domain')).toContainText('2099-12-31T23:59:59.999Z');
 await expect(id(page,'antenna-clock-unsupplied')).toHaveCount(0);await expect(id(page,'antenna-clock-none')).toBeVisible();await expect(id(page,'antenna-clock-tick')).toBeDisabled();
 await id(page,'radio-clock-utc').fill('2099-12-31T23:59:50');await press(info,id(page,'radio-clock-apply'));
 await expect(id(page,'antenna-clock-domain')).toHaveCount(0);await expect(id(page,'antenna-clock-unsupplied')).toHaveCount(0);await expect(id(page,'antenna-clock-tick')).toBeEnabled();
 // v23: the other tools unchanged; the Radio part keeps the re-applied UT, paused at it, with no range-end stop.
 const clock=radioPart(await save(page),before).workspace.clock;
 expect(clock).toEqual({utc:'2099-12-31T23:59:50',longitudeRadians:Number(LON),elapsedMS:0,limit:null});
});

test('a range-end deadline beyond the largest browser timeout is capped and re-armed instead of firing early',async({page},info)=>{
 // Synthetic: Playwright's controlled clock plus a test-only setTimeout recorder; not a Windows/native or real-browser
 // overflow witness. Playwright's clock.fastForward truncates its argument to int32 (`ticks | 0`), so every jump is at
 // most 2^31 − 1 ms; the recorder checks the cap and the re-arm actually registered by the route.
 const MAX=2_147_483_647,BEFORE_END=2_678_399_000;
 await openRadio(page,info);await supplyClock(page,info,'2099-12-01T00:00:00');await controlledClock(page);
 await page.evaluate(()=>{
  const delays:number[]=[],set=window.setTimeout.bind(window);(window as unknown as{__timeoutDelays:number[]}).__timeoutDelays=delays;
  window.setTimeout=((handler:TimerHandler,timeout?:number,...args:unknown[])=>{delays.push(Number(timeout??0));return set(handler,timeout,...args);}) as typeof window.setTimeout;
 });
 const delays=()=>page.evaluate(()=>(window as unknown as{__timeoutDelays:number[]}).__timeoutDelays.slice());
 await press(info,id(page,'radio-clock-start'));await flushTasks(page);
 // 31 days = 2 678 400 000 ms, above 2^31 − 1: Start registers the capped delay and nothing larger.
 const started=await delays();expect(started).toContain(MAX);expect(Math.max(...started)).toBeLessThanOrEqual(MAX);
 await page.clock.fastForward(MAX);await flushTasks(page);await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 // The capped timeout re-arms with the positive remainder, below the cap and beyond the next jump.
 const rearmed=(await delays()).slice(started.length);
 expect(rearmed.some(d=>d>BEFORE_END-MAX&&d<MAX)).toBe(true);expect(Math.max(0,...rearmed)).toBeLessThanOrEqual(MAX);
 await page.clock.fastForward(BEFORE_END-MAX);await flushTasks(page);await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 await page.clock.fastForward(2000);await flushTasks(page);
 await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','false');await expect(id(page,'radio-clock-state')).toContainText('Stopped');
});
