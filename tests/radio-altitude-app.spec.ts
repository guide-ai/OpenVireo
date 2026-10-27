import {test,expect,type Locator,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Actual App flows of the RA-12 altitude limit (WEB-ALT-01..03; docs/RADIO-ANTENNA.md "Altitude limit (RA-12)"). Only the
// rendered App, its raw data attributes and test-only clock/download wrappers. The radio clock is the explicit paused web
// scenario (2000-01-01T12:00:00 UT, compiled longitude), so every reading is the same fixed instant. Altitudes quoted in
// comments are closed forms of the native formula (HA ≈ 0: alt = 90° − |lat − Dec|, lat ≈ 38.43°); they are the chosen web
// contract, not native oracles. Synthetic browser stimuli are not Windows or native witnesses.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
async function flushTasks(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,count:number,stepMs=100){for(let i=0;i<count;i++){await page.clock.runFor(stepMs);await flushTasks(page);}}
async function controlledClock(page:Page){await page.clock.install();await page.clock.pauseAt(Date.now()+60_000);await flushTasks(page);}
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json=any;
/** Phase 1 item 1.5: once Radio is used, Save writes v23, which wraps the unchanged v≤22 investigation in `base` and keeps the
 * Radio part separately (with its consistency digest). The base must equal the earlier file exactly; returns the Radio part. */
function radioPart(file:Buffer,before:Buffer):Json{
 const next:Json=JSON.parse(file.toString('utf8')),old:Json=JSON.parse(before.toString('utf8'));
 expect(old.version).toBeLessThanOrEqual(22);expect(next.version).toBe(23);
 expect(Object.keys(next).sort()).toEqual(['base','format','numericalPolicy','radio','radioDigestSHA256','radioPolicy','version']);
 expect(next.numericalPolicy).toBe('Number_x87_equivalence_unvalidated');expect(next.radioPolicy).toBe('OpenVireo radio investigation 1');
 expect(next.base,'unrelated investigation unchanged').toEqual(old);
 expect(createHash('sha256').update(JSON.stringify(next.radio)).digest('hex')).toBe(next.radioDigestSHA256);
 return next.radio;
}
const raw=async(page:Page,testId:string,attribute:string)=>Number(await id(page,testId).getAttribute(attribute));
const ra=(page:Page)=>raw(page,'antenna-ra','data-ra-hours'),dec=(page:Page)=>raw(page,'antenna-dec','data-dec-degrees');
const lst=(page:Page)=>raw(page,'antenna-clock-lst','data-lst-hours'),ha=(page:Page)=>raw(page,'antenna-hour-angle','data-ha-hours');
const position=async(page:Page)=>({ra:await ra(page),dec:await dec(page),ha:await ha(page)});
const pad=(page:Page,d:'north'|'south'|'east'|'west')=>id(page,`antenna-manual-${d}`);
const notice=(page:Page)=>id(page,'antenna-notice');

async function openRadio(page:Page){
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-control')).toBeVisible();
}
/** Compiled defaults, manual access tick, switch On (first FormActivate: Tracking off, RA 0, Dec = latitude). */
async function setupRadio(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();
 await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
}
async function trackingOn(page:Page){await id(page,'antenna-tracking').click();await flushTasks(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');}
async function supplyClock(page:Page,utc='2000-01-01T12:00:00'){
 await id(page,'radio-clock-utc').fill(utc);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${utc} UT`);
 await id(page,'radio-clock-longitude').click();await expect(id(page,'antenna-clock-tick')).toBeEnabled();
}
/** Radio options scenario: draft Limit Slewing on, then Apply. */
async function applyLimits(page:Page,on=true){
 const box=id(page,'antenna-radio-options-limit');if(on)await box.check();else await box.uncheck();
 await id(page,'antenna-radio-options-apply').click();await flushTasks(page);
 await expect(id(page,'antenna-radio-options-current')).toHaveAttribute('data-limits',String(on));
}
async function holdMouse(page:Page,target:Locator){
 await target.scrollIntoViewIfNeeded();const box=(await target.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await flushTasks(page);
}
/** Hours or degrees as dialog fields: whole, minutes, seconds with nine decimals (|error| ≤ 5e-10 s, far inside every margin used here). */
function fieldsOf(value:number,extraSeconds=0):[string,string,string]{
 const a=Math.abs(value),whole=Math.trunc(a),minutes=Math.trunc((a-whole)*60),seconds=((a-whole)*60-minutes)*60+extraSeconds;
 return [(value<0?'-':'')+String(whole),String(minutes),seconds.toFixed(9)];
}
const FIELDS=['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'] as const;
async function request(page:Page,values:readonly string[]){
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 for(const [i,name] of FIELDS.entries())await id(page,`antenna-field-${name}`).fill(values[i]);
 await id(page,'antenna-dialog-ok').click();await flushTasks(page);
}
async function untilArrival(page:Page){
 for(let i=0;i<120&&await notice(page).count()===0;i++)await advance(page,1);
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');await id(page,'antenna-notice-ok').click();await flushTasks(page);
}

test('radio options scenario: draft, Cancel/Escape, the hold and dialog guards, Apply; limits without a clock refuse requests and manual steps; Save keeps them only in the Radio part, a reload does not',async({page})=>{
 await page.goto('/#observatory');const before=await save(page);
 await clickHeaderTool(page,'Radio telescope');await setupRadio(page);await trackingOn(page);
 await expect(id(page,'radio-route-scenario-options')).toContainText('Limit Slewing off');
 await expect(id(page,'antenna-radio-options-caption')).toHaveText('Radio Simulation Options');
 await expect(id(page,'antenna-radio-options-horizon')).toContainText('10.000000°');
 await expect(id(page,'antenna-radio-options-horizon')).toHaveAttribute('data-radians','0.17453292519943295');
 await expect(id(page,'antenna-options')).toContainText('Limit Slewing off');
 const limit=id(page,'antenna-radio-options-limit'),current=id(page,'antenna-radio-options-current');
 await limit.check();await expect(current).toHaveAttribute('data-limits','false');// a draft only
 await id(page,'antenna-radio-options-cancel').click();await expect(limit).not.toBeChecked();await expect(id(page,'antenna-radio-options-status')).toContainText('unchanged');
 await limit.check();await limit.press('Escape');await expect(limit).not.toBeChecked();await expect(current).toHaveAttribute('data-limits','false');
 // Declared web guard: no Apply while a hold is latched (limits off: the hold itself runs as before).
 await holdMouse(page,pad(page,'north'));await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 await expect(id(page,'antenna-radio-options-apply')).toBeDisabled();await expect(id(page,'antenna-radio-options-blocked')).toContainText('Release the held');
 await page.mouse.up();await flushTasks(page);await expect(id(page,'antenna-radio-options-apply')).toBeEnabled();
 await applyLimits(page);
 await expect(id(page,'antenna-radio-options-status')).toContainText('Limit Slewing on');await expect(id(page,'antenna-options')).toContainText('Limit Slewing on');
 // G3: no accepted clock reading, so manual steps are refused and the pad says why.
 await expect(pad(page,'north')).toBeDisabled();await expect(id(page,'antenna-manual-limit')).toContainText('accepted radio clock tick');
 // G2: a request without a reading stores the coordinates and stops; nothing moves and no box opens.
 const d0=await dec(page);
 await request(page,['3','0','0','20','0','0']);
 await expect(id(page,'antenna-status')).toContainText('no radio UT is supplied');await expect(notice(page)).toHaveCount(0);
 await expect(id(page,'antenna-target')).toContainText('3h 0m 0.00s');expect(await dec(page)).toBe(d0);
 // Declared web guard: the options fieldset is disabled while the coordinate dialog is open; Cancel keeps everything.
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 await expect(id(page,'antenna-radio-options-apply')).toBeDisabled();await expect(id(page,'antenna-radio-options-blocked')).toContainText('Finish the open dialog');
 await id(page,'antenna-dialog-cancel').click();await flushTasks(page);await expect(id(page,'antenna-radio-options-apply')).toBeEnabled();
 await expect(current).toHaveAttribute('data-limits','true');
 // Save investigation (v23) keeps the unrelated investigation unchanged and the applied limits, the stored target and the
 // unmoved pointing in its Radio part; nothing is stored in the browser, so a reload without Restore returns to the defaults.
 const saved=radioPart(await save(page),before).workspace;
 expect(saved.options.limitsEnabled).toBe(true);expect(saved.antenna).toMatchObject({activated:true,tracking:true,target:{ra:3,dec:20},pointing:{dec:d0}});
 await page.reload();await page.goto('/#observatory');await clickHeaderTool(page,'Radio telescope');await setupRadio(page);
 await expect(id(page,'antenna-radio-options-current')).toHaveAttribute('data-limits','false');await expect(id(page,'antenna-options')).toContainText('Limit Slewing off');
});

test('clock tick with Tracking on below the limit: Tracking off with a 0x10 box, buttons kept, drift continuation; back on at the zenith is undecided',async({page})=>{
 await openRadio(page);await setupRadio(page);await applyLimits(page);await supplyClock(page);await trackingOn(page);
 // FormActivate pointing (RA 0, Dec = latitude) at LST ≈ 13.4 h: HA ≈ 13.4 h, altitude ≈ −11°.
 await id(page,'antenna-clock-tick').click();await flushTasks(page);
 await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-tracking');await expect(id(page,'antenna-notice-note')).toContainText('flags 0x10');
 await expect(id(page,'antenna-notice-ok')).toBeFocused();await expect(notice(page)).toHaveAttribute('role','alertdialog');
 const l=await lst(page);expect(l).toBeGreaterThan(12);expect(l).toBeLessThan(15);// sanity for the chosen scenario
 // Two phases: the tick's own outcome while the box is open, then the dismissal's (the status line names the last action).
 await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');await expect(id(page,'antenna-status')).toContainText('Tracking was turned off');
 await page.keyboard.press('Escape');await flushTasks(page);await expect(notice(page)).toHaveCount(0);
 await expect(id(page,'antenna-status')).toHaveText('Message closed.');await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
 // 0x565140 is not called: N/S/E/W and Set Coordinates stay enabled; the drift branch put RA at LST − HA (0).
 await expect(id(page,'antenna-manual')).toContainText('enabled');await expect(id(page,'antenna-set-coordinates')).toBeEnabled();
 expect(await ra(page)).toBe(l);
 // Tracking on again: HA 0 at Dec = latitude is the zenith, which WEB-ALT-01 does not decide: the tick changes nothing.
 await trackingOn(page);await id(page,'antenna-clock-tick').click();await flushTasks(page);
 await expect(id(page,'antenna-status')).toContainText('refused by a browser limit');await expect(notice(page)).toHaveCount(0);
 await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
});

test('requests and the manual hold at HA ≈ 0: below-limit box with focus return, zenith browser box, slew to −41.4°, S fails without motion and re-fails',async({page})=>{
 await openRadio(page);await setupRadio(page);await applyLimits(page);await supplyClock(page);await controlledClock(page);
 await id(page,'antenna-clock-tick').click();await flushTasks(page);// Tracking off: drift branch, RA := LST
 const l=await lst(page),latDeg=await dec(page);expect(await ra(page)).toBe(l);
 await trackingOn(page);
 const raFields=fieldsOf(l);
 // Dec −60° at HA ≈ 0: altitude ≈ −8.4°. Native 0x10 box; the target is stored and nothing moves.
 await request(page,[...raFields,'-60','0','0']);
 await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-request');await expect(id(page,'antenna-notice-note')).toContainText('flags 0x10');
 await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await page.keyboard.press('Escape');await flushTasks(page);await expect(notice(page)).toHaveCount(0);
 await expect(id(page,'antenna-set-coordinates')).toBeFocused();expect(await dec(page)).toBe(latDeg);
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-field-decDegrees')).toHaveValue('-60');await id(page,'antenna-dialog-cancel').click();await flushTasks(page);
 // The zenith (Dec = latitude + 0.001″, HA ≈ 0): browser box, target stored, nothing moves.
 await request(page,[...raFields,...fieldsOf(latDeg,0.001)]);
 await expect(notice(page)).toHaveAttribute('data-kind','altitude-undecided');await expect(id(page,'antenna-notice-note')).toContainText('Browser limit');
 await id(page,'antenna-notice-ok').click();await flushTasks(page);expect(await dec(page)).toBe(latDeg);
 // Dec −41.4° at HA ≈ 0: altitude ≈ 10.2°, passes; the programmed slew runs without per-step altitude checks.
 await request(page,[...raFields,'-41','24','0']);
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flushTasks(page);
 await untilArrival(page);expect(await dec(page)).toBe(-41.4);
 // Hold S: the proposed −42.79° (altitude ≈ 8.8°) fails on the first tick; the hold ends and nothing moves.
 await holdMouse(page,pad(page,'south'));await advance(page,1);
 // The box names the held button's direction code +0x53d by its full name, as the native "…South Horizon Limit!" box.
 await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-manual');await expect(id(page,'antenna-notice-text')).toContainText('South horizon limit');
 await expect(id(page,'antenna-notice-text')).not.toContainText('S button');
 await expect(pad(page,'south')).not.toHaveAttribute('data-held','true');expect(await dec(page)).toBe(-41.4);
 await expect(id(page,'antenna-status')).toContainText('stopped at the horizon limit');
 await page.mouse.up();await flushTasks(page);await advance(page,2);expect(await dec(page)).toBe(-41.4);await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-manual');
 await id(page,'antenna-notice-ok').click();await flushTasks(page);
 // Tracking is on, so 0x5651cc leaves N/S/E/W enabled; a fresh press re-fails without moving (the stale owner was dropped).
 await expect(pad(page,'south')).toBeEnabled();
 await holdMouse(page,pad(page,'south'));await advance(page,1);
 await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-manual');expect(await dec(page)).toBe(-41.4);
 await page.mouse.up();await flushTasks(page);await id(page,'antenna-notice-ok').click();await flushTasks(page);
 // N moves away from the limit as usual.
 await holdMouse(page,pad(page,'north'));await advance(page,1);await page.mouse.up();await flushTasks(page);
 expect(await dec(page)).toBe(-41.4+5000*0.0002777777777777778);
});

test('WEB-ALT-02: a running-clock failure behind the slew confirmation turns Tracking off and keeps that box; Yes slews and Tracking stays off',async({page})=>{
 await openRadio(page);await setupRadio(page);await applyLimits(page);await supplyClock(page);await controlledClock(page);
 await id(page,'radio-clock-start').click();await flushTasks(page);await trackingOn(page);
 // No tick has anchored the FormActivate pointing (RA 0, Dec = latitude, HA 0). The request for 13 h, 0° reads HA ≈ 0.37 h
 // (altitude ≈ 51°) and passes; the first running tick then sees the tracked pointing at HA ≈ 13.4 h (altitude ≈ −11°).
 await request(page,['13','0','0','0','0','0']);
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await expect(id(page,'antenna-notice-yes')).toBeFocused();
 await advance(page,10);// one nominal 1000 ms clock tick
 await expect(notice(page)).toHaveCount(1);await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await expect(id(page,'antenna-notice-yes')).toBeFocused();
 await expect(id(page,'antenna-status')).toContainText('opens no second');await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
 expect(await ra(page)).toBe(await lst(page));// 0x56561f precedes the box; the drift continuation used the stored HA 0
 // Yes does not re-check (0x566f74..); the slew runs and arrives, and the native Tracking off is not lost.
 await id(page,'antenna-notice-yes').click();await flushTasks(page);
 await untilArrival(page);expect(await dec(page)).toBe(0);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
 await advance(page,10);await expect(notice(page)).toHaveCount(0);
});

test('a running-clock failure over the open coordinate dialog shows its box above it; Escape keeps the dialog and its draft; Cancel leaves Tracking off',async({page})=>{
 await openRadio(page);await setupRadio(page);await applyLimits(page);await supplyClock(page);await controlledClock(page);
 await id(page,'radio-clock-start').click();await flushTasks(page);await trackingOn(page);
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 await id(page,'antenna-field-raHours').fill('5');
 await advance(page,10);// first running tick: HA ≈ 13.4 h at Dec = latitude (altitude ≈ −11°) fails
 await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-tracking');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await expect(id(page,'antenna-status')).toContainText('Tracking was turned off');await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
 await page.keyboard.press('Escape');await flushTasks(page);await expect(notice(page)).toHaveCount(0);
 await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-field-raHours')).toHaveValue('5');
 await expect(id(page,'antenna-status')).toHaveText('Message closed.');
 await id(page,'antenna-dialog-cancel').click();await flushTasks(page);await expect(id(page,'antenna-dialog')).toHaveCount(0);
 // 0x565140 is not called: Set Coordinates stays enabled with Tracking off.
 await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');await expect(id(page,'antenna-set-coordinates')).toBeEnabled();
});

test('a pole step refused at the horizon limit: only the N/S orientation changes, RA/Dec/HA stay, the pole note says so',async({page})=>{
 await openRadio(page);await setupRadio(page);await supplyClock(page);await controlledClock(page);await trackingOn(page);
 // Limit Slewing off: slew to 0 h, −89° 30′ (about 94 slew-timer ticks).
 await request(page,['0','0','0','-89','30','0']);
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flushTasks(page);
 await untilArrival(page);expect(await dec(page)).toBe(-89.5);
 // Limit Slewing on and one clock tick with Tracking on: HA ≈ 13.4 h at −89.5° (altitude ≈ −39°) fails. Tracking turns off,
 // the buttons keep their state (0x565140 not called) and the drift continuation keeps HA 0.
 await applyLimits(page);await id(page,'antenna-clock-tick').click();await flushTasks(page);
 await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-tracking');await id(page,'antenna-notice-ok').click();await flushTasks(page);
 await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');await expect(pad(page,'south')).toBeEnabled();
 const before=await position(page);expect(before.ha).toBe(0);expect(before.dec).toBe(-89.5);
 await expect(pad(page,'north')).toHaveText('N');await expect(pad(page,'south')).toHaveText('S');await expect(id(page,'antenna-pole')).toHaveCount(0);
 // Hold S: the proposed step crosses the south pole (HA 12 h, ≈ −89.1°: altitude ≈ −39°) and fails. As in the original
 // (flag 0x565f3d and captions 0x565f8c..0x565fc9 before the predicate at 0x56600c) only the orientation changes.
 await holdMouse(page,pad(page,'south'));await advance(page,1);
 await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-manual');await expect(id(page,'antenna-notice-text')).toContainText('South horizon limit');
 expect(await position(page)).toEqual(before);
 await expect(pad(page,'south')).toHaveText('N');await expect(pad(page,'north')).toHaveText('S');
 await page.mouse.up();await flushTasks(page);await id(page,'antenna-notice-ok').click();await flushTasks(page);
 await expect(id(page,'antenna-pole')).toContainText('without moving the telescope');await expect(id(page,'antenna-pole')).not.toContainText('Declination was reflected');
 // 0x5651cc with Tracking off disables N/S/E/W.
 await expect(pad(page,'south')).toBeDisabled();expect(await position(page)).toEqual(before);
});

test('held Space: a horizon-limit box opened during a key-owned hold is not answered by the key repeat and release; fresh Space, Enter and Escape answer it',async({page})=>{
 await openRadio(page);await setupRadio(page);await applyLimits(page);await supplyClock(page);await controlledClock(page);
 await id(page,'antenna-clock-tick').click();await flushTasks(page);await trackingOn(page);
 await request(page,[...fieldsOf(await lst(page)),'-41','24','0']);
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flushTasks(page);
 await untilArrival(page);expect(await dec(page)).toBe(-41.4);
 // Space on the focused S button owns the hold; its first tick (proposed −42.79°, altitude ≈ 8.8°) fails and OK takes focus.
 await pad(page,'south').focus();await page.keyboard.down('Space');await flushTasks(page);await expect(pad(page,'south')).toHaveAttribute('data-held','true');
 await advance(page,1);
 await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-manual');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 // The still-held key repeats onto OK (a second keyboard.down sends repeat=true) and is then released: the box stays open.
 await page.keyboard.down('Space');await flushTasks(page);await page.keyboard.up('Space');await flushTasks(page);
 await expect(notice(page)).toHaveCount(1);await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-manual');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 expect(await dec(page)).toBe(-41.4);
 // A fresh Space press activates the focused OK as usual.
 await page.keyboard.press('Space');await flushTasks(page);await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-status')).toHaveText('Message closed.');
 // Enter and Escape on the same box still answer OK.
 for(const key of ['Enter','Escape']){
  await holdMouse(page,pad(page,'south'));await advance(page,1);await page.mouse.up();await flushTasks(page);
  await expect(notice(page)).toHaveAttribute('data-kind','altitude-limit-manual');await expect(id(page,'antenna-notice-ok')).toBeFocused();
  await page.keyboard.press(key);await flushTasks(page);await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-status')).toHaveText('Message closed.');
 }
 expect(await dec(page)).toBe(-41.4);
});

test('mobile 390 px: the below-limit box fits the viewport and answers OK',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await openRadio(page);await setupRadio(page);await applyLimits(page);await supplyClock(page);
 await id(page,'antenna-clock-tick').click();await flushTasks(page);await trackingOn(page);
 await request(page,[...fieldsOf(await lst(page)),'-60','0','0']);
 const box=(await id(page,'antenna-notice').boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
 await id(page,'antenna-notice-ok').click();await flushTasks(page);await expect(notice(page)).toHaveCount(0);
});
