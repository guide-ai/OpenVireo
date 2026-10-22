import {test,expect,type Page} from '@playwright/test';
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
type HarnessApi={counts:{control:number;antenna:number};outcomes:string[];setOptions:(patch:Record<string,unknown>)=>void;setEnvironment:(patch:Record<string,unknown>)=>void;unmount:()=>void};
const host=<T,>(page:Page,fn:(api:HarnessApi)=>T)=>page.evaluate(`(${fn.toString()})(window.__radioHarness)`) as Promise<T>;

/** Lets React render, commit and run passive effects (scheduled through MessageChannel, which the fake clock does not control). */
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r();c.port2.postMessage(0);}));}
/** Advances the paused fake clock in steps of at most 10 ms, flushing React after each step. */
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=10){await page.clock.runFor(Math.min(10,ms-t));await flush(page);}}

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
  const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(await overflow()).toBeLessThanOrEqual(0);
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
