import {test,expect,type Locator,type Page} from '@playwright/test';
// I06 antenna timer lifecycle, browser option profile and timer-vs-user routing. Runs against the owned
// harness (OPENVIREO_RADIO_HARNESS_URL) and skips otherwise, like the other radio specs. Timed cases use
// Playwright's fake browser clock: it is paused, advanced in small steps, and React is flushed after each
// step, so tick counts follow the nominal 100 ms browser schedule. That is the chosen web contract, not a
// claim about Windows TTimer/WM_TIMER timing. window.__radioHarness is the harness host (lifted states).
const harness=process.env.OPENVIREO_RADIO_HARNESS_URL;
test.skip(!harness,'OPENVIREO_RADIO_HARNESS_URL is not set; radio panel is not mounted in App yet.');
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const notice=(page:Page)=>id(page,'antenna-notice');
const ticks=(page:Page)=>id(page,'antenna-ticks');
const tickText=(n:number)=>`Slew-timer ticks in this slew: ${n}`;
type HarnessApi={counts:{control:number;antenna:number};outcomes:string[];setOptions:(patch:Record<string,unknown>)=>void;setEnvironment:(patch:Record<string,unknown>)=>void;
 /** Replaces fields of the lifted antenna state (a malformed or restored host state). Required by the tests that use it. */
 patchAntenna?:(patch:Record<string,unknown>)=>void;unmount:()=>void};
const host=<T,>(page:Page,fn:(api:HarnessApi)=>T)=>page.evaluate(`(${fn.toString()})(window.__radioHarness)`) as Promise<T>;
/** A configured harness must provide patchAntenna: a missing hook fails the test instead of skipping it silently. */
async function requirePatchHook(page:Page){
 expect(await host(page,api=>typeof api.patchAntenna),'the configured radio harness must expose window.__radioHarness.patchAntenna').toBe('function');
}

/** Lets React render, commit and run passive effects (scheduled through MessageChannel, which the fake clock does not control). */
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0);}));}
/** Advances the paused fake clock in steps of at most 10 ms, flushing React after each step. */
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=10){await page.clock.runFor(Math.min(10,ms-t));await flush(page);}}
const overflow=(page:Page)=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
/** The 375 px layout check, independent of the Playwright project name: resize to 375 px, check that the page does not
 * overflow horizontally and that the given element fits, then restore the project's viewport. */
async function check375(page:Page,element:Locator){
 const before=page.viewportSize();await page.setViewportSize({width:375,height:812});await flush(page);
 expect(page.viewportSize()?.width).toBe(375);expect(await overflow(page)).toBeLessThanOrEqual(0);
 await expect(element).toBeVisible();const box=await element.boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(375);
 if(before)await page.setViewportSize(before);await flush(page);
}

async function openPanel(page:Page,query=''){
 await page.clock.install({time:new Date('2026-10-22T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-22T01:00:00Z'));
 await page.goto(harness!+query);await expect(id(page,'radio-control')).toBeVisible();
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();
 await id(page,'radio-timer-deliver').click();await id(page,'radio-switch').click();await flush(page);
}
async function enterCoordinates(page:Page,values:readonly string[]){
 for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await id(page,`antenna-field-${name}`).fill(values[i]);
}
/** Tracking on, Set Coordinates 1 h / +30°, OK, Yes: the slew starts at fake time T0 with 0 ticks. */
async function startSlew(page:Page,query=''){
 await openPanel(page,query);await id(page,'antenna-tracking').click();await id(page,'antenna-set-coordinates').click();
 await enterCoordinates(page,['1','0','0','30','0','0']);await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();await flush(page);
 await expect(ticks(page)).toHaveText(tickText(0));
}

test.describe('SlewTimer2 ownership: unrelated changes do not postpone callbacks',()=>{
 test('ten Tracking clicks 40 ms apart keep the nominal 100 ms cadence and the latest Tracking state',async({page})=>{
  await startSlew(page);
  for(let n=0;n<10;n++){await advance(page,40);await id(page,'antenna-tracking').click();await flush(page);}
  await advance(page,50);// T0 + 450 ms: callbacks at 100, 200, 300 and 400 ms
  await expect(ticks(page)).toHaveText(tickText(4));
  await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');// ten toggles; every tick read the latest state
 });
 test('control without actions: the same clock stepping gives the same four callbacks',async({page})=>{
  await startSlew(page);await advance(page,450);await expect(ticks(page)).toHaveText(tickText(4));
 });
 test('a callback reads the latest committed state: Tracking off and a rate change survive the next tick',async({page})=>{
  await startSlew(page);
  await advance(page,40);await id(page,'antenna-tracking').click();await flush(page);// off: Set Coordinates hidden
  await advance(page,20);await id(page,'antenna-tracking').click();await flush(page);// on again: RateSpin enabled (original quirk)
  await advance(page,10);await id(page,'antenna-rate-down').click();await flush(page);
  await expect(id(page,'antenna-rate')).toHaveText('Index 4: 500 arcsec per slew-timer tick');
  await advance(page,40);// T0 + 110 ms
  await expect(ticks(page)).toHaveText(tickText(1));
  await expect(id(page,'antenna-rate')).toHaveText('Index 4: 500 arcsec per slew-timer tick');await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
  await id(page,'antenna-tracking').click();await flush(page);await advance(page,100);
  await expect(ticks(page)).toHaveText(tickText(2));await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
  await expect(id(page,'antenna-set-coordinates')).toBeDisabled();
 });
 test('closing the panel keeps the timer running while hidden; reopening shows the progress',async({page})=>{
  await startSlew(page);await advance(page,150);await expect(ticks(page)).toHaveText(tickText(1));
  await id(page,'radio-panel-close').click();await flush(page);await expect(id(page,'radio-panel-window')).toHaveCount(0);
  await advance(page,300);
  await id(page,'radio-switch').click();await flush(page);await expect(ticks(page)).toHaveText(tickText(4));
 });
 test('stop question pauses; No starts a fresh 100 ms registration; Yes stops for good',async({page})=>{
  await startSlew(page);await advance(page,150);
  await id(page,'antenna-set-coordinates').click();await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','stop-slew');
  await advance(page,500);await expect(ticks(page)).toHaveText(tickText(1));// paused: no callback
  await id(page,'antenna-notice-no').click();await flush(page);
  await advance(page,90);await expect(ticks(page)).toHaveText(tickText(1));
  await advance(page,20);await expect(ticks(page)).toHaveText(tickText(2));
  await id(page,'antenna-set-coordinates').click();await flush(page);await id(page,'antenna-notice-yes').click();await flush(page);
  const dec=await id(page,'antenna-dec').textContent();
  await advance(page,500);await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');await expect(ticks(page)).toHaveCount(0);
  await expect(id(page,'antenna-dec')).toHaveText(dec!);
  await expect.poll(()=>host(page,api=>api.outcomes.filter(o=>o==='slew-tick').length)).toBe(2);
 });
 test('rapid pause/resume leaves exactly one registration (no duplicate callbacks)',async({page})=>{
  await startSlew(page);
  for(let n=0;n<4;n++){await id(page,'antenna-set-coordinates').click();await flush(page);await id(page,'antenna-notice-no').click();await flush(page);}
  await advance(page,250);await expect(ticks(page)).toHaveText(tickText(2));
 });
 test('reentry: a new slew starts its own run; the stopped run delivers nothing late',async({page})=>{
  await startSlew(page);await advance(page,150);
  await id(page,'antenna-set-coordinates').click();await flush(page);await id(page,'antenna-notice-yes').click();await flush(page);
  await advance(page,30);
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','20','0','0']);
  await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();await flush(page);
  await expect(ticks(page)).toHaveText(tickText(0));
  await advance(page,250);await expect(ticks(page)).toHaveText(tickText(2));
 });
 test('unmount cancels the registration: no host transition arrives afterwards',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await startSlew(page);await advance(page,150);
  const before=await host(page,api=>{api.unmount();return api.counts.antenna;});
  await advance(page,1000);
  expect(await host(page,api=>api.counts.antenna)).toBe(before);expect(errors).toEqual([]);
 });
});

test.describe('supported web option profile (browser limit, not original options validation)',()=>{
 for(const [query,reason] of [['?rateBase=0','antenna-profile-rate-not-advancing'],['?rateBase=-50','antenna-profile-rate-not-advancing'],
  ['?maxRateIndex=8','antenna-profile-ra-step'],['?latitude=100','antenna-profile-initial-declination'],['?latitude=1.7976931348623157e308','antenna-profile-initial-declination']] as const)
  test(`unsupported options ${query} refuse activation with scoped feedback`,async({page})=>{
   await openPanel(page,query);
   await expect(id(page,'antenna-profile')).toContainText('Browser limit');await expect(id(page,reason)).toBeVisible();
   await expect(id(page,'antenna-status')).toContainText('supported profile');
   await expect(id(page,'antenna-controls')).toHaveCount(0);
   await advance(page,500);await expect(id(page,'antenna-controls')).toHaveCount(0);
   expect(await host(page,api=>api.counts.antenna)).toBe(0);
  });
 test('a supported profile restored by the host activates normally @mobile',async({page})=>{
  await openPanel(page,'?maxRateIndex=8');await expect(id(page,'antenna-profile-ra-step')).toContainText('index 7');
  await check375(page,id(page,'antenna-profile'));
  await host(page,api=>api.setOptions({maxRateIndex:6}));await flush(page);
  await expect(id(page,'antenna-profile')).toHaveCount(0);await expect(id(page,'antenna-controls')).toBeVisible();
  await expect(id(page,'antenna-rate')).toHaveText('Index 4: 500 arcsec per slew-timer tick');
 });
 test('edge profile maxRateIndex 6 (largest supported with base 50) completes a slew',async({page})=>{
  await startSlew(page,'?maxRateIndex=6');await expect(id(page,'antenna-rate')).toHaveText('Index 6: 50000 arcsec per slew-timer tick');
  for(let i=0;i<40&&!(await notice(page).count());i++)await advance(page,100);
  await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');
  await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+30 Degs 0 Mins 0.0 Secs');
 });
 test('host options changing mid-run gate the timer and keep every value; a valid profile resumes',async({page})=>{
  await startSlew(page);await advance(page,250);await expect(ticks(page)).toHaveText(tickText(2));
  const ra=await id(page,'antenna-ra').textContent(),dec=await id(page,'antenna-dec').textContent(),target=await id(page,'antenna-target').textContent();
  await host(page,api=>api.setOptions({rateBase:0}));await flush(page);
  await expect(id(page,'antenna-profile-rate-not-advancing')).toBeVisible();
  await advance(page,500);
  await expect(ticks(page)).toHaveText(tickText(2));await expect(id(page,'antenna-ra')).toHaveText(ra!);await expect(id(page,'antenna-dec')).toHaveText(dec!);
  await expect(id(page,'antenna-target')).toHaveText(target!);await expect(id(page,'antenna-motion')).toContainText('Slewing');
  await id(page,'antenna-tracking').click();await expect(id(page,'antenna-status')).toContainText('supported profile');
  await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
  await host(page,api=>api.setOptions({rateBase:50}));await flush(page);
  await expect(id(page,'antenna-profile')).toHaveCount(0);
  await advance(page,110);await expect(ticks(page)).toHaveText(tickText(3));
 });
 test('under unsupported options the running slew can still be stopped',async({page})=>{
  await startSlew(page);await advance(page,150);
  await host(page,api=>api.setOptions({latitudeRadians:100}));await flush(page);
  await id(page,'antenna-set-coordinates').click();await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','stop-slew');
  await id(page,'antenna-notice-yes').click();await flush(page);await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');
  await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-status')).toContainText('supported profile');
 });
});

/** Advances in 100 ms steps until the arrival box opens. */
async function runToArrival(page:Page){
 for(let i=0;i<60&&!(await notice(page).count());i++)await advance(page,100);
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');
}
/** A: maxRateIndex 6, base 50. The slew to 1 h / +30° raises the index to 6 (50000) and keeps it after arrival. */
async function afterA(page:Page){
 await startSlew(page,'?maxRateIndex=6');await runToArrival(page);await id(page,'antenna-notice-ok').click();await flush(page);
 await expect(id(page,'antenna-rate')).toHaveText('Index 6: 50000 arcsec per slew-timer tick');
}
const RATE_REFUSED='That slew rate is outside the browser’s supported profile; nothing changed. See the slew-rate limit note.';

test.describe('rates kept from earlier host options (state-context browser limit)',()=>{
 test('A → B: RateDown applies the native index 5, OK is refused inside the dialog, a second RateDown recovers @mobile',async({page})=>{
  await afterA(page);
  await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
  await expect(id(page,'antenna-profile')).toHaveCount(0);await expect(id(page,'antenna-rate-limit')).toHaveCount(0);// both records are supported
  await id(page,'antenna-rate-down').click();await flush(page);
  await expect(id(page,'antenna-rate')).toHaveText('Index 5: 324100 arcsec per slew-timer tick');
  await expect(id(page,'antenna-rate-limit-start')).toContainText('one Right Ascension step would be 6.002 h');
  await id(page,'antenna-set-coordinates').click();
  const dialog=id(page,'antenna-dialog');
  await expect(dialog.getByTestId('antenna-dialog-limit')).toHaveCount(0);// the prefill 1 h / +30° is the pointing: OK warns, it does not start
  await enterCoordinates(page,['2','0','0','25','0','0']);
  await expect(dialog.getByTestId('antenna-dialog-limit')).toContainText('stored rate 324100 arcsec per tick (index 5)');
  await id(page,'antenna-dialog-ok').click();await flush(page);
  await expect(dialog).toBeVisible();await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-field-decDegrees')).toHaveValue('25');
  await expect(id(page,'antenna-status')).toHaveText(RATE_REFUSED);
  await check375(page,dialog.getByTestId('antenna-dialog-limit'));
  await id(page,'antenna-dialog-cancel').click();await flush(page);
  await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 0 Mins 0.00 Secs');
  await id(page,'antenna-rate-down').click();await flush(page);
  await expect(id(page,'antenna-rate')).toHaveText('Index 4: 32410 arcsec per slew-timer tick');await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
  await id(page,'antenna-set-coordinates').click();await expect(dialog.getByTestId('antenna-dialog-limit')).toHaveCount(0);
  await expect(id(page,'antenna-field-raHours')).toHaveValue('1');// the refused OK stored nothing: the prefill is still 1 h / +30°
  await enterCoordinates(page,['2','0','0','25','0','0']);await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();await flush(page);
  await runToArrival(page);
  await expect(id(page,'antenna-ra')).toHaveText('2 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+25 Degs 0 Mins 0.0 Secs');
  expect(await host(page,api=>api.outcomes.filter(o=>o==='rate-unsupported'||o==='options-unsupported').length)).toBe(0);// refusals are not host transitions
 });
 test('host switches to B while the confirmation is open: Yes is refused with the reason inside the box; No keeps the coordinates @mobile',async({page})=>{
  await afterA(page);
  await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
  await id(page,'antenna-rate-down').click();await flush(page);// index 5 (324100) under B
  await host(page,api=>api.setOptions({maxRateIndex:6,rateBase:50}));await flush(page);// under A a start raises the index again
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','25','0','0']);await id(page,'antenna-dialog-ok').click();await flush(page);
  await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await expect(notice(page).getByTestId('antenna-notice-limit')).toHaveCount(0);
  await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
  await expect(notice(page).getByTestId('antenna-notice-limit')).toContainText('Yes is refused');
  await expect(notice(page).getByTestId('antenna-notice-limit')).toContainText('stored rate 324100');
  await check375(page,notice(page).getByTestId('antenna-notice-limit'));
  await id(page,'antenna-notice-yes').click();await flush(page);
  await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await expect(id(page,'antenna-status')).toHaveText(RATE_REFUSED);
  await advance(page,300);await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');await expect(ticks(page)).toHaveCount(0);
  await id(page,'antenna-notice-no').click();await flush(page);
  await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-target')).toContainText('2h 0m 0.00s');await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 0 Mins 0.00 Secs');
 });
 test('compatible option change: the kept index 6 drives the next slew and RateDown uses the new options',async({page})=>{
  await afterA(page);
  await host(page,api=>api.setOptions({maxRateIndex:5}));await flush(page);await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','25','0','0']);await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();await flush(page);
  await expect(id(page,'antenna-rate')).toHaveText('Index 6: 50000 arcsec per slew-timer tick');// 5 > 6 is false: the start keeps it
  await runToArrival(page);await id(page,'antenna-notice-ok').click();await flush(page);
  await id(page,'antenna-rate-down').click();await flush(page);await expect(id(page,'antenna-rate')).toHaveText('Index 5: 5000 arcsec per slew-timer tick');
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
 });
 test('restored stored rate during a slew: Dec continues, the switch to RA is not delivered, the reason is shown, Stop and RateSpin recover',async({page})=>{
  await startSlew(page);await advance(page,150);await expect(ticks(page)).toHaveText(tickText(1));
  await requirePatchHook(page);
  await host(page,api=>api.patchAntenna!({rateIndex:8,rate:5_000_000}));await flush(page);
  // Pending: the rate is read only at the Dec→RA switch; the Dec callbacks keep their fixed step.
  await expect(id(page,'antenna-rate-limit-stored')).toContainText('stored rate 5000000 arcsec per tick (index 8)');
  await expect(id(page,'antenna-rate-limit-stored')).toContainText('When Declination is reached');
  await expect(id(page,'antenna-suspended')).toHaveCount(0);await expect(id(page,'antenna-profile')).toHaveCount(0);
  const status=await id(page,'antenna-status').textContent();
  // 38.4° → 30° at 5000 arcsec per tick: Dec arrives on tick 7; the switch callback (tick 8) is never delivered.
  await advance(page,1500);
  await expect(ticks(page)).toHaveText(tickText(7));await expect(id(page,'antenna-dec')).toHaveText('+30 Degs 0 Mins 0.0 Secs');
  await expect(id(page,'antenna-motion')).toHaveText('Slewing in Declination (original status text not decoded).');
  await expect(id(page,'antenna-suspended')).toBeVisible();
  const before=await host(page,api=>api.counts.antenna);await advance(page,500);
  await expect(ticks(page)).toHaveText(tickText(7));expect(await host(page,api=>api.counts.antenna)).toBe(before);
  await expect(id(page,'antenna-status')).toHaveText(status!);// no refused callback was delivered: the timer is not registered
  expect(await host(page,api=>api.outcomes.filter(o=>o==='slew-tick').length)).toBe(7);
  await id(page,'antenna-set-coordinates').click();await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','stop-slew');
  await id(page,'antenna-notice-no').click();await flush(page);await advance(page,300);await expect(ticks(page)).toHaveText(tickText(7));
  await id(page,'antenna-set-coordinates').click();await flush(page);await id(page,'antenna-notice-yes').click();await flush(page);
  await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');await expect(id(page,'antenna-suspended')).toHaveCount(0);
  await expect(id(page,'antenna-rate-limit-start')).toContainText('index 8');
  await id(page,'antenna-rate-down').click();await flush(page);await expect(id(page,'antenna-rate')).toHaveText('Index 7: 500000 arcsec per slew-timer tick');
  await expect(id(page,'antenna-rate-limit-start')).toContainText('index 7');
  await id(page,'antenna-rate-down').click();await flush(page);await expect(id(page,'antenna-rate')).toHaveText('Index 6: 50000 arcsec per slew-timer tick');
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
  await id(page,'antenna-set-coordinates').click();await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();await flush(page);
  await runToArrival(page);
  await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+30 Degs 0 Mins 0.0 Secs');
 });
 test('unsupported options while the dialog and then the confirmation are open: reasons inside each, OK/Yes refused, recovery and Stop @mobile',async({page})=>{
  await openPanel(page);await id(page,'antenna-tracking').click();await id(page,'antenna-set-coordinates').click();
  await enterCoordinates(page,['1','0','0','30','0','0']);
  const dialog=id(page,'antenna-dialog');
  await host(page,api=>api.setOptions({rateBase:0}));await flush(page);
  await expect(dialog.getByTestId('antenna-dialog-limit')).toContainText('OK is refused');await expect(dialog.getByTestId('antenna-dialog-limit')).toContainText('Rate base 0');
  await check375(page,dialog.getByTestId('antenna-dialog-limit'));
  await id(page,'antenna-dialog-ok').click();await flush(page);
  await expect(dialog).toBeVisible();await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-field-raHours')).toHaveValue('1');
  await expect(id(page,'antenna-status')).toContainText('supported profile');
  await host(page,api=>api.setOptions({rateBase:50}));await flush(page);await expect(dialog.getByTestId('antenna-dialog-limit')).toHaveCount(0);
  await id(page,'antenna-dialog-ok').click();await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');
  await host(page,api=>api.setOptions({rateBase:0}));await flush(page);
  await expect(notice(page).getByTestId('antenna-notice-limit')).toContainText('Rate base 0');
  await id(page,'antenna-notice-yes').click();await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await expect(ticks(page)).toHaveCount(0);
  await host(page,api=>api.setOptions({rateBase:50}));await flush(page);await expect(notice(page).getByTestId('antenna-notice-limit')).toHaveCount(0);
  await id(page,'antenna-notice-yes').click();await flush(page);await expect(ticks(page)).toHaveText(tickText(0));
  await advance(page,150);await expect(ticks(page)).toHaveText(tickText(1));
  await host(page,api=>api.setOptions({rateBase:0}));await flush(page);await expect(id(page,'antenna-suspended')).toBeVisible();
  await advance(page,300);await expect(ticks(page)).toHaveText(tickText(1));
  await id(page,'antenna-set-coordinates').click();await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','stop-slew');
  await id(page,'antenna-notice-yes').click();await flush(page);await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');
 });
});

/** Advances in 100 ms steps until Motion reports the RA phase (the Dec→RA switch has run). */
async function runToRaPhase(page:Page){
 for(let i=0;i<40&&(await id(page,'antenna-motion').textContent())?.startsWith('Slewing in Declination');i++)await advance(page,100);
 await expect(id(page,'antenna-motion')).toHaveText('Slewing in Right Ascension (original status text not decoded).');
}

test.describe('rate checks follow the step that actually reads the rate (phase, transit, instant)',()=>{
 test('RA phase: a RateSpin press under other options is applied natively; the fixed step completes the slew',async({page})=>{
  await afterA(page);
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['4','0','0','25','0','0']);await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();await flush(page);
  await runToRaPhase(page);
  await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
  await id(page,'antenna-tracking').click();await flush(page);await id(page,'antenna-tracking').click();await flush(page);// Tracking on enables RateSpin
  await id(page,'antenna-rate-down').click();await flush(page);
  await expect(id(page,'antenna-status')).toHaveText('Slew rate decreased.');// before: refused as rate-unsupported
  await expect(id(page,'antenna-rate')).toHaveText('Index 5: 324100 arcsec per slew-timer tick');
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);await expect(id(page,'antenna-suspended')).toHaveCount(0);
  await runToArrival(page);
  await expect(id(page,'antenna-ra')).toHaveText('4 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+25 Degs 0 Mins 0.0 Secs');
  await id(page,'antenna-notice-ok').click();await flush(page);
  await expect(id(page,'antenna-rate-limit-start')).toContainText('stored rate 324100');// the next programmed start still gates it
  await expect(id(page,'antenna-rate-limit-start')).toContainText('Choose another rate with the Slew Rate buttons');
 });
 test('Dec phase: a press the switch would read is refused with its reason; behind the stop question that reason is not listed',async({page})=>{
  await afterA(page);await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','25','0','0']);await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();await flush(page);
  await id(page,'antenna-tracking').click();await flush(page);await id(page,'antenna-tracking').click();await flush(page);
  await expect(id(page,'antenna-rate-limit-down')).toContainText('which the slew would read when Declination is reached');
  await id(page,'antenna-rate-down').click();await flush(page);
  await expect(id(page,'antenna-status')).toHaveText(RATE_REFUSED);await expect(id(page,'antenna-rate')).toHaveText('Index 6: 50000 arcsec per slew-timer tick');
  await id(page,'antenna-set-coordinates').click();await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','stop-slew');
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);// before: the down press was listed although it returns modal-open
  await id(page,'antenna-notice-no').click();await flush(page);await expect(id(page,'antenna-rate-limit-down')).toBeVisible();
  await runToArrival(page);await expect(id(page,'antenna-ra')).toHaveText('2 Hrs 0 Mins 0.00 Secs');
 });
 test('transit telescope: an RA-unsafe kept rate starts a Dec-only slew; switching transit off mid-run halts only at the switch @mobile',async({page})=>{
  await openPanel(page,'?transit=1&maxRateIndex=6');await expect(id(page,'antenna-tracking')).toHaveCount(0);
  const transitSlew=async(dec:string)=>{
   await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0',dec,'0','0']);await id(page,'antenna-dialog-ok').click();await flush(page);
   await expect(notice(page)).toHaveAttribute('data-kind','transit-dec-only');await id(page,'antenna-notice-ok').click();await flush(page);
   await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flush(page);
  };
  await transitSlew('20');await runToArrival(page);await id(page,'antenna-notice-ok').click();await flush(page);
  await expect(id(page,'antenna-rate')).toHaveText('Index 6: 50000 arcsec per slew-timer tick');
  await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
  await id(page,'antenna-rate-down').click();await flush(page);await expect(id(page,'antenna-rate')).toHaveText('Index 5: 324100 arcsec per slew-timer tick');
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);// before: 'start' refused on the 6.002 h RA step the transit slew never takes
  await transitSlew('-30');await expect(ticks(page)).toHaveText(tickText(0));
  await runToArrival(page);
  await expect(id(page,'antenna-dec')).toHaveText('−30 Degs 0 Mins 0.0 Secs');await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');
  await id(page,'antenna-notice-ok').click();await flush(page);
  // Mid-run host change: transit off before the first callback; the Dec callback runs, the switch is not delivered.
  await transitSlew('10');await host(page,api=>api.setOptions({transitTelescope:false}));await flush(page);
  await expect(id(page,'antenna-rate-limit-stored')).toContainText('When Declination is reached');await expect(id(page,'antenna-suspended')).toHaveCount(0);
  await check375(page,id(page,'antenna-rate-limit-stored'));
  await advance(page,600);await expect(ticks(page)).toHaveText(tickText(1));await expect(id(page,'antenna-dec')).toHaveText('+10 Degs 0 Mins 0.0 Secs');
  await expect(id(page,'antenna-suspended')).toBeVisible();
  await host(page,api=>api.setOptions({transitTelescope:true}));await flush(page);await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
  await runToArrival(page);await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');
 });
 test('transit panel with a kept Dec-unsafe rate: OK is refused and the note names the actual recovery (no Tracking button)',async({page})=>{
  await openPanel(page,'?transit=1');await requirePatchHook(page);
  await host(page,api=>api.patchAntenna!({rateIndex:7,rate:0}));await flush(page);
  const start=id(page,'antenna-rate-limit-start');
  await expect(start).toContainText('the step would be zero');await expect(start).toContainText('no Tracking button');
  await expect(start).toContainText('kept index 7');await expect(start).not.toContainText('Tracking on enables');
  // The prefill (+38° 25′ 48.0″) parses back to the pointing exactly: OK gives the no-slew warning, as no motion starts.
  await id(page,'antenna-set-coordinates').click();await id(page,'antenna-dialog-ok').click();await flush(page);
  await expect(notice(page)).toHaveAttribute('data-kind','no-slew-needed');await id(page,'antenna-notice-ok').click();await flush(page);
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['0','0','0','20','0','0']);await id(page,'antenna-dialog-ok').click();await flush(page);
  await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-status')).toHaveText(RATE_REFUSED);
  await expect(id(page,'antenna-field-decDegrees')).toHaveValue('20');
  await id(page,'antenna-dialog-cancel').click();await flush(page);
  // A supported record whose maximum exceeds the kept index: the start loop recomputes index 8 (base 1, 100000 arcsec).
  await host(page,api=>api.setOptions({maxRateIndex:8,rateBase:1}));await flush(page);
  await expect(id(page,'antenna-profile')).toHaveCount(0);await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
 });
 test('instant slew: no rate is read, so a kept RA-unsafe rate moves the telescope at once',async({page})=>{
  await openPanel(page,'?instant=1&maxRateIndex=6');await id(page,'antenna-tracking').click();
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['1','0','0','30','0','0']);await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();await flush(page);
  await expect(id(page,'antenna-rate')).toHaveText('Index 6: 50000 arcsec per slew-timer tick');
  await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
  await id(page,'antenna-rate-down').click();await flush(page);await expect(id(page,'antenna-rate')).toHaveText('Index 5: 324100 arcsec per slew-timer tick');
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','25','0','0']);await id(page,'antenna-dialog-ok').click();await flush(page);
  await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await expect(notice(page).getByTestId('antenna-notice-limit')).toHaveCount(0);
  // The host turns instant off while the confirmation is open: Yes would now start a programmed slew that reads the rate.
  await host(page,api=>api.setOptions({instantSlew:false}));await flush(page);
  await expect(notice(page).getByTestId('antenna-notice-limit')).toContainText('stored rate 324100');
  await id(page,'antenna-notice-yes').click();await flush(page);await expect(id(page,'antenna-status')).toHaveText(RATE_REFUSED);
  await host(page,api=>api.setOptions({instantSlew:true}));await flush(page);
  await id(page,'antenna-notice-yes').click();await flush(page);
  await expect(id(page,'antenna-status')).toHaveText('Telescope moved directly to the coordinates (instant-slew option).');
  await expect(id(page,'antenna-ra')).toHaveText('2 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+25 Degs 0 Mins 0.0 Secs');
 });
});

/** A → B: after afterA (1 h / +30°, index 6) the host switches to B and RateDown gives the kept 5/324100 RA-unsafe rate. */
async function keptUnderB(page:Page){
 await afterA(page);await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
 await id(page,'antenna-rate-down').click();await flush(page);await expect(id(page,'antenna-rate')).toHaveText('Index 5: 324100 arcsec per slew-timer tick');
}
const MODAL_OPEN='Finish the open dialog or message first; nothing changed.';

test.describe('RA tolerance and modal feedback (the RA step is checked only where it would move the telescope)',()=>{
 test('RA tolerance: Dec-only and within-tolerance slews start under a kept RA-unsafe rate; the dialog reason follows the valid draft; no-motion warns @mobile',async({page})=>{
  await keptUnderB(page);
  const note=id(page,'antenna-rate-limit-start');
  await expect(note).toContainText('differs from the current pointing by more than 0.00001 h (0.036 s)');await expect(note).toContainText('Declination-only');
  await id(page,'antenna-set-coordinates').click();
  const limit=id(page,'antenna-dialog').getByTestId('antenna-dialog-limit');
  await expect(limit).toHaveCount(0);// the prefill is the pointing: OK would warn, not start
  await enterCoordinates(page,['2','0','0','25','0','0']);
  await expect(limit).toContainText('A slew to RA 2h 0m 0.00s, Dec +25° 0′ 0.0″');await expect(limit).toContainText('stored rate 324100');
  await check375(page,limit);
  await enterCoordinates(page,['1','0','0.037','20','0','0']);await expect(limit).toContainText('one Right Ascension step would be 6.002 h');// just outside the tolerance
  await enterCoordinates(page,['1','0','0.018','20','0','0']);await expect(limit).toHaveCount(0);// inside it: no RA step is taken
  await id(page,'antenna-field-raHours').fill('x');await expect(limit).toHaveCount(0);
  await id(page,'antenna-dialog-ok').click();await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');// its own refusal, not the rate's
  await id(page,'antenna-notice-ok').click();await flush(page);
  await id(page,'antenna-field-raHours').fill('1');await id(page,'antenna-dialog-ok').click();await flush(page);
  await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await expect(notice(page).getByTestId('antenna-notice-limit')).toHaveCount(0);
  await id(page,'antenna-notice-yes').click();await flush(page);await expect(id(page,'antenna-rate')).toHaveText('Index 5: 324100 arcsec per slew-timer tick');
  await runToArrival(page);await expect(id(page,'antenna-suspended')).toHaveCount(0);
  await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+20 Degs 0 Mins 0.0 Secs');
  await id(page,'antenna-notice-ok').click();await flush(page);
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['1','0','0','20','0','0']);await expect(limit).toHaveCount(0);
  await id(page,'antenna-dialog-ok').click();await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','no-slew-needed');
  await id(page,'antenna-notice-ok').click();await flush(page);await expect(id(page,'antenna-target')).toContainText('1h 0m 0.00s, +20° 0′ 0.0″');
  expect(await host(page,api=>api.outcomes.filter(o=>o==='slew-complete').length)).toBe(2);
 });
 test('transit switched off at a within-tolerance Dec→RA switch: the slew completes; an RA target still halts at the switch @mobile',async({page})=>{
  await openPanel(page,'?transit=1&maxRateIndex=6');
  const transitSlew=async(ra:readonly [string,string,string],dec:string)=>{
   await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,[...ra,dec,'0','0']);await id(page,'antenna-dialog-ok').click();await flush(page);
   await expect(notice(page)).toHaveAttribute('data-kind','transit-dec-only');await id(page,'antenna-notice-ok').click();await flush(page);
   await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flush(page);
  };
  await transitSlew(['2','0','0'],'20');await runToArrival(page);await id(page,'antenna-notice-ok').click();await flush(page);// RA stays 0 h
  await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
  await id(page,'antenna-rate-down').click();await flush(page);await expect(id(page,'antenna-rate')).toHaveText('Index 5: 324100 arcsec per slew-timer tick');
  await transitSlew(['0','0','0.018'],'10');await host(page,api=>api.setOptions({transitTelescope:false}));await flush(page);
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);// this switch ends within the tolerance: no RA step is taken
  await runToArrival(page);await expect(id(page,'antenna-suspended')).toHaveCount(0);
  await expect(id(page,'antenna-dec')).toHaveText('+10 Degs 0 Mins 0.0 Secs');await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');
  await id(page,'antenna-notice-ok').click();await flush(page);
  await host(page,api=>api.setOptions({transitTelescope:true}));await flush(page);
  await transitSlew(['2','0','0'],'0');await host(page,api=>api.setOptions({transitTelescope:false}));await flush(page);
  await expect(id(page,'antenna-rate-limit-stored')).toContainText('more than 0.00001 h');
  await advance(page,600);await expect(ticks(page)).toHaveText(tickText(1));await expect(id(page,'antenna-suspended')).toContainText('switch to Right Ascension');
  await check375(page,id(page,'antenna-suspended'));
 });
 test('inside the open dialog or confirmation the recovery says to Cancel or answer No first; then the enabled buttons recover @mobile',async({page})=>{
  await keptUnderB(page);
  const note=id(page,'antenna-rate-limit-start');
  await expect(note).toContainText('Choose another rate with the Slew Rate buttons');await expect(note).not.toContainText('first:');
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','25','0','0']);
  const limit=id(page,'antenna-dialog').getByTestId('antenna-dialog-limit');
  await expect(limit).toContainText('Cancel the coordinate dialog first: the Slew Rate and Tracking buttons behind it do nothing while it is open.');
  await id(page,'antenna-rate-down').dispatchEvent('click');await flush(page);// behind the modal: refused, nothing changes
  await expect(id(page,'antenna-status')).toHaveText(MODAL_OPEN);await expect(id(page,'antenna-rate')).toHaveText('Index 5: 324100 arcsec per slew-timer tick');
  await id(page,'antenna-dialog-cancel').click();await flush(page);
  await host(page,api=>api.setOptions({maxRateIndex:6,rateBase:50}));await flush(page);await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','25','0','0']);await id(page,'antenna-dialog-ok').click();await flush(page);
  await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');
  await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
  const boxLimit=notice(page).getByTestId('antenna-notice-limit');
  await expect(boxLimit).toContainText('Answer No on the slew confirmation first');await check375(page,boxLimit);
  await id(page,'antenna-rate-down').dispatchEvent('click');await flush(page);await expect(id(page,'antenna-status')).toHaveText(MODAL_OPEN);
  await id(page,'antenna-notice-no').click();await flush(page);
  await id(page,'antenna-rate-down').click();await flush(page);await expect(id(page,'antenna-rate')).toHaveText('Index 4: 32410 arcsec per slew-timer tick');
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);await expect(id(page,'antenna-target')).toContainText('2h 0m 0.00s');
 });
 test('live non-transit options on a transit-initialized panel: the recovery names the live alternatives and a Dec-only slew proceeds @mobile',async({page})=>{
  await openPanel(page,'?transit=1');await requirePatchHook(page);
  await host(page,api=>api.patchAntenna!({rateIndex:5,rate:324100}));await flush(page);// restored host state, not reachable through the UI
  await expect(id(page,'antenna-rate-limit')).toHaveCount(0);// transit: only the Dec step is read
  await host(page,api=>api.setOptions({transitTelescope:false}));await flush(page);
  const note=id(page,'antenna-rate-limit-start');
  await expect(note).toContainText('no Tracking button');await expect(note).toContainText('first initialized under transit-telescope options');
  await expect(note).toContainText('kept index 5');await expect(note).toContainText('transit telescope on');await expect(note).toContainText('within 0.00001 h');
  await expect(note).not.toContainText('only under');await check375(page,note);
  await expect(id(page,'radio-panel-window')).toContainText('Slews change Declination only while the transit option is on.');
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['0','0','0','20','0','0']);await id(page,'antenna-dialog-ok').click();await flush(page);
  await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flush(page);
  await runToArrival(page);await expect(id(page,'antenna-dec')).toHaveText('+20 Degs 0 Mins 0.0 Secs');await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');
  await id(page,'antenna-notice-ok').click();await flush(page);
  await host(page,api=>api.setOptions({transitTelescope:true}));await flush(page);await expect(id(page,'antenna-rate-limit')).toHaveCount(0);
 });
});

test('visual evidence screenshots: tolerance and modal feedback (only when OPENVIREO_RADIO_SCREENSHOTS names a directory)',async({page})=>{
 const dir=process.env.OPENVIREO_RADIO_SCREENSHOTS;test.skip(!dir,'Screenshots are evidence captures, not assertions.');
 const shot=(name:string)=>page.screenshot({path:`${dir}/${name}.png`,fullPage:true});
 await keptUnderB(page);await expect(id(page,'antenna-rate-limit-start')).toBeVisible();await shot('tolerance-desktop-1-start-note');
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','25','0','0']);await expect(id(page,'antenna-dialog-limit')).toBeVisible();
 await shot('tolerance-desktop-2-dialog-draft-limit');await page.setViewportSize({width:375,height:812});await shot('tolerance-375-2-dialog-draft-limit');
 await enterCoordinates(page,['1','0','0.018','20','0','0']);await expect(id(page,'antenna-dialog-limit')).toHaveCount(0);await shot('tolerance-375-3-dialog-within-tolerance');
 await page.setViewportSize({width:1440,height:1050});
 await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();await flush(page);await runToArrival(page);await shot('tolerance-desktop-4-dec-only-arrival');
});

test('visual evidence screenshots: cross-option limits (only when OPENVIREO_RADIO_SCREENSHOTS names a directory)',async({page})=>{
 const dir=process.env.OPENVIREO_RADIO_SCREENSHOTS;test.skip(!dir,'Screenshots are evidence captures, not assertions.');
 const shot=(name:string)=>page.screenshot({path:`${dir}/${name}.png`,fullPage:true});
 await afterA(page);await host(page,api=>api.setOptions({maxRateIndex:4,rateBase:3241}));await flush(page);
 await id(page,'antenna-rate-down').click();await flush(page);await expect(id(page,'antenna-rate-limit-start')).toBeVisible();
 await shot('cross-desktop-1-rate-limit-note');
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','25','0','0']);
 await expect(id(page,'antenna-dialog-limit')).toBeVisible();await shot('cross-desktop-2-dialog-limit');
 await page.setViewportSize({width:375,height:812});await shot('cross-375-2-dialog-limit');
 await id(page,'antenna-dialog-cancel').click();await page.setViewportSize({width:1440,height:1050});
 await host(page,api=>api.setOptions({maxRateIndex:6,rateBase:50}));await flush(page);
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['2','0','0','25','0','0']);await id(page,'antenna-dialog-ok').click();await flush(page);
 await host(page,api=>api.setOptions({rateBase:0}));await flush(page);await expect(id(page,'antenna-notice-limit')).toBeVisible();
 await shot('cross-desktop-3-confirm-limit');await page.setViewportSize({width:375,height:812});await shot('cross-375-3-confirm-limit');
 await page.setViewportSize({width:1440,height:1050});
 await host(page,api=>api.setOptions({rateBase:50}));await flush(page);await id(page,'antenna-notice-yes').click();await flush(page);await advance(page,50);
 await requirePatchHook(page);await host(page,api=>api.patchAntenna!({rateIndex:8,rate:5_000_000}));await flush(page);
 await expect(id(page,'antenna-rate-limit-stored')).toBeVisible();await shot('phase-desktop-5-stored-rate-pending');
 await advance(page,500);await expect(id(page,'antenna-suspended')).toBeVisible();// Dec (1 h / +30° → 2 h / +25°) arrives, the switch is not delivered
 await shot('cross-desktop-4-stored-rate-suspended');await page.setViewportSize({width:375,height:812});await shot('cross-375-4-stored-rate-suspended');
});

test.describe('timer delivery is separate from user actions',()=>{
 test('host-controlled synthetic state: a pending 1 ms ScopeTimer completes access while the antenna dialog stays open',async({page})=>{
  // Not reachable through the isolated UI (the switch stays disabled until access) and not native GUI coverage.
  await page.goto(harness!+'?synthetic=scope-modal');
  const dialog=id(page,'antenna-dialog'),hours=id(page,'antenna-field-raHours');
  await expect(dialog).toBeVisible();await expect(hours).toBeFocused();await page.keyboard.type('7');
  await expect(id(page,'radio-id-caption')).toContainText('access requested');// dome byte 3 holds the timer
  await host(page,api=>api.setEnvironment({domeByte:0}));
  await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
  await expect(id(page,'radio-status')).toHaveText('Scope timer completed: radio telescope accessed.');
  await expect(dialog).toBeVisible();await expect(hours).toHaveValue('7');await expect(hours).toBeFocused();
  await expect(id(page,'antenna-status')).not.toContainText('Finish the open dialog');
  // User controls stay blocked by the open modal dialog.
  await id(page,'radio-access').dispatchEvent('click');
  await expect(id(page,'antenna-status')).toContainText('Finish the open dialog');await expect(id(page,'radio-status')).toHaveText('Scope timer completed: radio telescope accessed.');
 });
 test('fake clock: after the ScopeTimer completes access, no idle callback of the ending registration replaces its result',async({page})=>{
  await page.clock.install({time:new Date('2026-10-22T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-22T01:00:00Z'));
  await page.goto(harness!+'?synthetic=scope-modal');await expect(id(page,'antenna-field-raHours')).toBeFocused();
  // One runFor call without flushing first: React's commit and its passive-effect cleanup run as separate tasks
  // that can interleave with the 1 ms interval callbacks (the sequence that exposed the gap in a screenshot pass).
  await host(page,api=>api.setEnvironment({domeByte:0}));await page.clock.runFor(10);await flush(page);
  await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
  await expect(id(page,'radio-status')).toHaveText('Scope timer completed: radio telescope accessed.');
  expect(await host(page,api=>api.counts.control)).toBe(1);
 });
 test('fake clock: the arrival callback ends the registration; no idle tick replaces "Slew complete."',async({page})=>{
  await startSlew(page);
  // Long runFor calls without flushing in between, so commits and passive-effect cleanups interleave with callbacks.
  for(let i=0;i<20&&!(await notice(page).count());i++)await page.clock.runFor(1000);
  await flush(page);await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');await page.clock.runFor(1000);await flush(page);
  await expect(id(page,'antenna-status')).toHaveText('Slew complete.');
  expect(await host(page,api=>api.outcomes.filter(o=>o==='slew-complete').length)).toBe(1);
 });
});

test('visual evidence screenshots (only when OPENVIREO_RADIO_SCREENSHOTS names a directory)',async({page})=>{
 const dir=process.env.OPENVIREO_RADIO_SCREENSHOTS;test.skip(!dir,'Screenshots are evidence captures, not assertions.');
 const shot=(name:string)=>page.screenshot({path:`${dir}/${name}.png`,fullPage:true});
 await startSlew(page);await advance(page,250);await host(page,api=>api.setOptions({maxRateIndex:8,latitudeRadians:100}));await flush(page);
 await expect(id(page,'antenna-profile')).toBeVisible();await shot('lifecycle-desktop-1-profile-midrun');
 await page.setViewportSize({width:375,height:812});await shot('lifecycle-mobile-1-profile-midrun');
 await page.goto(harness!+'?synthetic=scope-modal');await expect(id(page,'antenna-field-raHours')).toBeFocused();await page.keyboard.type('7');await host(page,api=>api.setEnvironment({domeByte:0}));
 await advance(page,10);await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');await shot('lifecycle-mobile-2-scope-modal');
});

test.describe('held keys at arrival (actual behavior, no focus forcing)',()=>{
 for(const control of ['antenna-tracking','radio-switch'] as const)
  test(`held Enter answering the arrival box does not activate ${control}`,async({page},testInfo)=>{
   await startSlew(page);await id(page,control).click();await flush(page);
   const attr=control==='radio-switch'?'aria-checked':'aria-pressed',before=await id(page,control).getAttribute(attr);
   for(let i=0;i<40&&!(await notice(page).count());i++)await advance(page,100);
   await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');
   await page.keyboard.down('Enter');await flush(page);await expect(notice(page)).toHaveCount(0);
   const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,testId:document.activeElement?.getAttribute('data-testid')??null}));
   await testInfo.attach('actual-focus-after-arrival',{body:JSON.stringify({control,focus}),contentType:'application/json'});
   await page.keyboard.down('Enter');await page.keyboard.down('Enter');await flush(page);
   await expect(id(page,control)).toHaveAttribute(attr,before!);await page.keyboard.up('Enter');
  });
});
