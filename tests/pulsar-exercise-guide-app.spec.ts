import {test,expect,type Browser,type Locator,type Page,type Route,type TestInfo} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
// Phase 1 student pulsar exercise (docs/PULSAR-MANUAL-TIMING.md, "Student pulsar exercise"): Start pulsar exercise, the bundled
// Pulsars.dat, the Pulsar guide and the Radio research notes, in the actual App. No harness or product debug hook: only the
// rendered App, its data attributes, the browser clock control and Playwright request routing of the one same-origin asset
// (to hold, fail or corrupt it); no OS dialog or user file. The synthetic catalog rows are test data in the fixed-column layout
// of tests/radio-receiver-app.spec.ts. The real path uses the bundled original catalog and checks its source row against the
// values recorded in the research file ORIGINAL-CATALOG-CONTROLS.json (line 34: 0332+5434 / 0329+54); those are catalog
// REFERENCE values, never observations, and the capture is receiver-model output. Expected numbers are computed here from those
// reference strings and the sampling interval; no product scientific function is imported. The Node peak search only checks the
// downloaded bytes and drives where the manual cursors go; it is not a product feature. Helpers are copied from
// tests/radio-pulsar-timing-journey-app.spec.ts. Written, not run, by the implementer.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const storage=(page:Page)=>page.evaluate(()=>[Object.keys(localStorage).sort(),Object.keys(sessionStorage).sort()]);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}

const BUNDLED_PATH='**/original/radio/Pulsars.dat';
const BUNDLED={bytes:285692,sha256:'ba94ee94c359e2afd4acce940266d69983d24a93893719cca20d3e23ef3dceaa',rows:'558'};
const SCENARIO_UT='2000-01-01T12:00:00';
/** The compiled radio longitude as the clock card's data attribute prints it (radioClock.ts RA-03, exact binary64). */
const COMPILED_LONGITUDE='-1.393499963671317';

// ---- SYNTHETIC catalog rows (layout of tests/radio-receiver-app.spec.ts; RA column in raw degrees).
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
const SYNTH_LEGACY='SYNTH001',SYNTH_FILE='synthetic-guide.dat';
const SYNTH_CATALOG=[{primaryName:'SYNTHETIC24',legacyName:SYNTH_LEGACY,ra:'0.25',dec:'38.4',x2a:'0.49',x34:'0.0',s4c:'10.0',s50:'12.5',s54:'1000.0',s58:'1000.0',s5c:'1000.0'}].map(line).join('\r\n')+'\r\n';
/** Decoded synthetic source: raw 0.25° = 0h01m00s; Dec +38°24′00″. */
const SYNTH_SLEW=['0','1','0','38','24','0'] as const;

// ---- ORIGINAL reference row (research ORIGINAL-CATALOG-CONTROLS.json, Pulsars.dat line 34). Catalog references, not observations.
const ORIGINAL={primary:'0332+5434',legacy:'0329+54',rawRADegrees:'53.2472789876',decDegrees:'54.5786792745',p0:'0.7145186639799999684',pdot:'2.04959000E-15',
 epochOffsetDays:'40621.000000',dm:'26.77600'} as const;
const DT=0.01;// s: interval 10.00 ms at H = 4 with 400 points (Properties is checked below)
const F_LOW=400,F_HIGH=500;

async function startApp(page:Page,at='2026-10-24T00:00:00Z'){
 await page.clock.install({time:new Date(at)});
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise-start')).toBeVisible();
 await page.clock.pauseAt(new Date(new Date(at).getTime()+600_000));await flush(page);
}
async function start(page:Page){await id(page,'radio-exercise-start').click();await flush(page);}
async function waitRecorded(page:Page){
 await expect(id(page,'radio-exercise-catalog')).toHaveAttribute('data-catalog','recorded');
 await expect(id(page,'pulsar-ref-identity')).toHaveAttribute('data-recorded','true');
 await expect(id(page,'pulsar-ref-sha')).toHaveText(BUNDLED.sha256);await expect(id(page,'pulsar-ref-bytes')).toHaveText(String(BUNDLED.bytes));
 await expect(id(page,'pulsar-ref-rows')).toHaveText(BUNDLED.rows);await expect(id(page,'pulsar-ref-name')).toHaveText('Pulsars.dat');
}
async function loadSynthetic(page:Page){
 await id(page,'pulsar-ref-file').setInputFiles({name:SYNTH_FILE,mimeType:'text/plain',buffer:Buffer.from(SYNTH_CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
}
/** Readouts that Start may write; compared for idempotence, refusals and the two installed clocks. */
const radioSnapshot=async(page:Page)=>({
 applied:await id(page,'radio-clock-applied').textContent(),lon:await id(page,'radio-clock-lon').getAttribute('data-longitude-radians'),
 draft:await id(page,'radio-clock-utc').inputValue(),idCaption:await id(page,'radio-id-caption').textContent(),
 ra:await id(page,'antenna-ra').getAttribute('data-ra-hours'),dec:await id(page,'antenna-dec').getAttribute('data-dec-degrees'),
 tracking:await id(page,'antenna-tracking-state').textContent(),clock:await id(page,'radio-clock-state').textContent(),
 catalog:await id(page,'radio-exercise-catalog').getAttribute('data-catalog'),sha:await id(page,'pulsar-ref-sha').count()?await id(page,'pulsar-ref-sha').textContent():null,
 setup:await id(page,'radio-exercise-card').getAttribute('data-setup'),
});
type GuideState={next:string|null;done:Record<string,string|null>};
async function guide(page:Page):Promise<GuideState>{
 await id(page,'pulsar-lab-open').click();const dialog=id(page,'pulsar-lab-dialog');await expect(dialog).toBeVisible();
 const done:Record<string,string|null>={};
 for(const step of ['setup','catalog','point','channels','capture','period','delay','investigation','save'])done[step]=await id(page,`pulsar-lab-step-${step}`).getAttribute('data-done');
 const next=await id(page,'pulsar-lab-next').getAttribute('data-next');
 await id(page,'pulsar-lab-close').click();await expect(dialog).toBeHidden();
 return {next,done};
}
/** No visible "+0x…" diagnostic inside a region (the research notes may hold them collapsed). */
const noVisibleOffsets=(scope:Locator)=>expect(scope.getByText(/\+0x[0-9a-f]/i).filter({visible:true})).toHaveCount(0);
async function slewTo(page:Page,values:readonly string[]){
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await id(page,`antenna-field-${name}`).fill(values[i]);
 await id(page,'antenna-dialog-ok').click();await flush(page);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flush(page);
 for(let i=0;i<400&&await id(page,'antenna-notice').count()===0;i++)await advance(page,200);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');await id(page,'antenna-notice-ok').click();await flush(page);
}
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}
const shot=async(page:Page,info:TestInfo,label:string)=>{await noOverflow(page);await info.attach(`pulsar-guide-${label}.png`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});};

// ---------------------------------------------------------------------------------------------------- Start and guide
for(const [label,viewport] of [['desktop 1440',{width:1440,height:1050}],['mobile 320',{width:320,height:568}]] as const){
 test.describe(label,()=>{
  test.use({viewport});
  test('Start from scratch: texts, collapsed research notes, bundled catalog, idempotent second Start, guide by keyboard',async({page},info)=>{
   test.setTimeout(120_000);
   const assets:string[]=[];page.on('request',r=>{if(r.url().includes('/original/radio/'))assets.push(new URL(r.url()).pathname);});
   await startApp(page);const before=await storage(page);
   // Texts: the stale "not available" claims are gone, the technical notes start collapsed and hold no default-visible offsets.
   const scope=page.locator('[data-testid="radio-route"]').locator('xpath=ancestor::main').locator('.observatory-heading p');
   await expect(scope).toContainText('Record captures that signal for Pulsar Analysis');await expect(scope).not.toContainText('nothing is recorded or measured here');
   const notes=id(page,'radio-research-notes');
   expect(await notes.evaluate(el=>(el as HTMLDetailsElement).open)).toBe(false);
   await expect(id(page,'radio-route-scenario-gates')).toBeHidden();await expect(id(page,'radio-clock-limits')).toBeHidden();
   await expect(id(page,'radio-route-persistence')).toBeVisible();
   await expect(id(page,'radio-route-scenario-gates')).toContainText('Available: receiver Record with Identify and Properties, and Align');
   await expect(id(page,'radio-route-scenario-gates')).not.toContainText('receiver recording, sound, pulsar identification and Align');
   for(const region of ['radio-exercise-card','radio-route-scenario','radio-route-clock','radio-route-date'])await noVisibleOffsets(id(page,region));
   await expect(id(page,'radio-exercise-reason')).toHaveText('Available. Pressing it again later changes nothing that is already set up.');
   await expect(id(page,'radio-exercise-adaptation')).toContainText(SCENARIO_UT);
   expect(await guide(page)).toEqual({next:'setup',done:{setup:'false',catalog:'false',point:'false',channels:'false',capture:'false',period:'false',delay:'false',investigation:'false',save:'false'}});
   expect(assets,'no catalog request before Start').toEqual([]);
   await shot(page,info,`before-start-${viewport.width}`);

   await start(page);
   await expect(id(page,'radio-exercise-status')).toHaveAttribute('data-kind','started');await expect(id(page,'radio-exercise-card')).toHaveAttribute('data-setup','true');
   await expect(id(page,'radio-clock-applied')).toHaveText(`${SCENARIO_UT} UT`);await expect(id(page,'radio-clock-lon')).toHaveAttribute('data-longitude-radians',COMPILED_LONGITUDE);
   await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
   await expect(id(page,'antenna-ra')).toHaveAttribute('data-ra-hours','0');
   await expect(id(page,'radio-date-reason')).toHaveAttribute('data-reason','activation-reached');
   await waitRecorded(page);
   await noVisibleOffsets(id(page,'radio-route-panel-wrapper'));
   expect(assets,'exactly one same-origin request for the bundled file').toEqual(['/original/radio/Pulsars.dat']);
   await expect(id(page,'pulsar-ref-bundled')).toBeDisabled();
   expect(await guide(page)).toEqual({next:'point',done:{setup:'true',catalog:'true',point:'false',channels:'false',capture:'false',period:'false',delay:'false',investigation:'false',save:'false'}});

   // A second Start changes nothing and fetches nothing.
   const after=await radioSnapshot(page);
   await start(page);
   await expect(id(page,'radio-exercise-status')).toHaveText('Already set up: nothing changed.');
   expect(await radioSnapshot(page)).toEqual(after);expect(assets).toHaveLength(1);

   // Research notes open on demand.
   await notes.locator('summary').click();await expect(id(page,'radio-route-scenario-gates')).toBeVisible();await expect(id(page,'radio-clock-limits')).toBeVisible();
   await notes.locator('summary').click();await expect(id(page,'radio-route-scenario-gates')).toBeHidden();

   // Guide by keyboard: Enter on the header button opens it with Close focused; Escape closes it.
   await id(page,'pulsar-lab-open').focus();await page.keyboard.press('Enter');
   await expect(id(page,'pulsar-lab-dialog')).toBeVisible();await expect(id(page,'pulsar-lab-close')).toBeFocused();
   // Phase 1 item 1.5: the backup is available (no "not complete" claim) and the counts have eight required steps.
   await expect(id(page,'pulsar-lab-backup')).toHaveAttribute('data-backup','available');await expect(id(page,'pulsar-lab-counts')).toHaveText('2 of 8 pulsar steps done.');
   await expect(id(page,'pulsar-lab-delay-formula')).toHaveText('delay [s] = 4150 × DM × (1/f_low² − 1/f_high²), with f in MHz and DM in pc/cm³');
   await expect(id(page,'pulsar-lab-add-disarms')).toBeVisible();await noVisibleOffsets(id(page,'pulsar-lab-dialog'));
   await shot(page,info,`guide-${viewport.width}`);
   await page.keyboard.press('Escape');await expect(id(page,'pulsar-lab-dialog')).toBeHidden();
   // The PLR route text no longer says radio acquisition is unavailable.
   await nav(page,'Radio data').click();await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
   const plrScope=page.locator('.observatory-heading p').filter({hasText:'Measure a pulsar recording by hand'});
   await expect(plrScope).toBeVisible();await expect(page.getByText('Radio acquisition is not available here.')).toHaveCount(0);
   expect(await storage(page)).toEqual(before);
  });
 });
}

test('Start under two different installed clock times gives the same state; storage is unchanged',async({browser})=>{
 test.setTimeout(120_000);
 const run=async(b:Browser,at:string)=>{
  const context=await b.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();
  try{await startApp(page,at);const before=await storage(page);await start(page);await waitRecorded(page);
   const snap=await radioSnapshot(page);expect(await storage(page)).toEqual(before);return snap;}finally{await context.close();}
 };
 const a=await run(browser,'2026-10-24T00:00:00Z'),b=await run(browser,'2031-03-05T17:43:21Z');
 expect(a).toEqual(b);
 expect(a).toMatchObject({applied:`${SCENARIO_UT} UT`,lon:COMPILED_LONGITUDE,ra:'0',tracking:'Tracking on',catalog:'recorded',sha:BUNDLED.sha256,setup:'true'});
});

test('Start keeps a custom UT and a user catalog (no bundled request) and is refused while Set Coordinates is open or a hold is active',async({page})=>{
 test.setTimeout(120_000);
 const assets:string[]=[];page.on('request',r=>{if(r.url().includes('/original/radio/'))assets.push(r.url());});
 await startApp(page);
 await loadSynthetic(page);
 await id(page,'radio-clock-utc').fill('2026-10-24T12:00:00');await id(page,'radio-clock-apply').click();
 await start(page);
 await expect(id(page,'radio-exercise-status')).toHaveAttribute('data-kind','started');
 await expect(id(page,'radio-clock-applied')).toHaveText('2026-10-24T12:00:00 UT');
 await expect(id(page,'pulsar-ref-name')).toHaveText(SYNTH_FILE);await expect(id(page,'pulsar-ref-identity')).toHaveAttribute('data-recorded','false');
 await expect(id(page,'radio-exercise-catalog')).toHaveAttribute('data-catalog','supplied');
 await flush(page);expect(assets,'a supplied catalog is never replaced, so nothing is fetched').toEqual([]);

 // An open Set Coordinates dialog: Start is unavailable (inert card, disabled button, named reason) and nothing changes.
 const snap=await radioSnapshot(page);
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 await expect(id(page,'radio-exercise-start')).toBeDisabled();await expect(id(page,'radio-exercise-reason')).toHaveAttribute('data-reason','modal');
 await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-dialog')).toHaveCount(0);
 expect(await radioSnapshot(page)).toEqual(snap);

 // A held manual slew (pointer held on N, fake clock paused so no step is delivered): Start is unavailable with the hold reason.
 const north=id(page,'antenna-manual-north');await north.scrollIntoViewIfNeeded();const box=(await north.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await flush(page);
 await expect(north).toHaveAttribute('data-held','true');
 await expect(id(page,'radio-exercise-start')).toBeDisabled();await expect(id(page,'radio-exercise-reason')).toHaveAttribute('data-reason','hold');
 await page.mouse.up();await flush(page);await expect(north).not.toHaveAttribute('data-held','true');
 await expect(id(page,'radio-exercise-start')).toBeEnabled();
 await start(page);await expect(id(page,'radio-exercise-status')).toHaveText('Already set up: nothing changed.');
 const after=await radioSnapshot(page);expect({...after,dec:snap.dec,ra:snap.ra}).toEqual(snap);
});

test('bundled catalog: a hash failure is shown with a retry; cancel and a route change discard late results; a loaded catalog is never replaced',async({page})=>{
 test.setTimeout(120_000);
 await startApp(page);
 // 1. Same size, other bytes: refused by SHA-256 before any parse; no catalog; Retry and the file selector stay available.
 await page.route(BUNDLED_PATH,route=>route.fulfill({status:200,contentType:'application/octet-stream',body:Buffer.alloc(BUNDLED.bytes,0x20)}));
 await start(page);
 await expect(id(page,'radio-exercise-catalog')).toHaveAttribute('data-error','sha256');await expect(id(page,'radio-exercise-catalog')).toHaveAttribute('role','alert');
 await expect(id(page,'pulsar-ref-status')).toHaveAttribute('data-kind','bundled-error');await expect(id(page,'pulsar-ref-none')).toBeVisible();
 await expect(id(page,'antenna-receiver')).toHaveAttribute('data-reason','no-catalog');
 await expect(id(page,'radio-exercise-catalog-retry')).toBeVisible();await expect(id(page,'pulsar-ref-load')).toBeEnabled();
 await page.unroute(BUNDLED_PATH);

 // 2. A held request cancelled with Cancel catalog read: the late response is discarded.
 let release:()=>void=()=>{};
 const hold=async(route:Route)=>{await new Promise<void>(r=>{release=r;});try{await route.continue();}catch{/* the page already aborted it */}};
 await page.route(BUNDLED_PATH,hold);
 await id(page,'radio-exercise-catalog-retry').click();
 await expect(id(page,'radio-exercise-catalog')).toHaveAttribute('data-catalog','reading');
 await id(page,'pulsar-ref-cancel').click();await expect(id(page,'pulsar-ref-status')).toHaveAttribute('data-kind','cancelled');
 release();await flush(page);await page.waitForTimeout(300);await flush(page);
 await expect(id(page,'pulsar-ref-none')).toBeVisible();await expect(id(page,'radio-exercise-catalog')).toHaveAttribute('data-catalog','none');

 // 3. A held request and a route change: hiding the route cancels it; the late response is discarded.
 await id(page,'pulsar-ref-bundled').click();await expect(id(page,'radio-exercise-catalog')).toHaveAttribute('data-catalog','reading');
 await nav(page,'Radio data').click();await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
 release();await flush(page);await page.waitForTimeout(300);
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await flush(page);
 await expect(id(page,'pulsar-ref-status')).toHaveAttribute('data-kind','cancelled');await expect(id(page,'pulsar-ref-none')).toBeVisible();
 await page.unroute(BUNDLED_PATH);

 // 4. Start again (setup already complete) loads the verified bundled file.
 await start(page);await expect(id(page,'radio-exercise-status')).toHaveText('Already set up: nothing changed.');
 await waitRecorded(page);await expect(id(page,'radio-exercise-catalog-retry')).toHaveCount(0);
 // 5. A loaded catalog is never replaced: the bundled button is disabled and Start fetches nothing more.
 const later:string[]=[];page.on('request',r=>{if(r.url().includes('/original/radio/'))later.push(r.url());});
 await expect(id(page,'pulsar-ref-bundled')).toBeDisabled();await start(page);await flush(page);expect(later).toEqual([]);
 await waitRecorded(page);
});

test('Add disarms Record: the warning appears only while Record is armed and the guide repeats it',async({page},info)=>{
 test.setTimeout(180_000);
 await startApp(page);await loadSynthetic(page);await start(page);
 await slewTo(page,SYNTH_SLEW);
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();
 await expect(id(page,'receiver-heading-0')).toContainText(`Pulsar ${SYNTH_LEGACY}`);
 await expect(id(page,'receiver-add-disarms')).toHaveCount(0);await expect(id(page,'receiver-add')).not.toHaveAttribute('aria-describedby',/.+/);
 expect((await guide(page)).done.point).toBe('true');
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 const note=id(page,'receiver-add-disarms');await expect(note).toBeVisible();
 const describedBy=(await id(page,'receiver-add').getAttribute('aria-describedby'))!;expect(describedBy).toBe(await note.getAttribute('id'));
 await id(page,'pulsar-lab-open').click();await expect(id(page,'pulsar-lab-armed')).toBeVisible();await id(page,'pulsar-lab-close').click();
 await shot(page,info,'add-disarms');
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();
 await expect(id(page,'receiver-record-disp')).toHaveText('Off');await expect(note).toHaveCount(0);
 await id(page,'pulsar-lab-open').click();await expect(id(page,'pulsar-lab-armed')).toHaveCount(0);await id(page,'pulsar-lab-close').click();
});

test('Start after a manual Radio switch keeps Tracking off, says setup is incomplete and names Tracking; Tracking alone then completes setup',async({page})=>{
 test.setTimeout(120_000);
 await startApp(page);
 // The learner presses the existing controls by hand up to the Radio switch (first FormActivate), without Tracking.
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await expect(id(page,'radio-exercise-reason')).toContainText('press Tracking');
 // Start does the remaining setup but keeps the learner's Tracking off: incomplete, never reported as success.
 await start(page);await waitRecorded(page);
 const status=id(page,'radio-exercise-status');
 await expect(status).toHaveAttribute('data-kind','incomplete');await expect(status).toContainText('press Tracking in the control panel');
 await expect(status).toContainText('Steps done now: 2; already done and kept: 7.');
 await expect(id(page,'antenna-tracking-state')).not.toHaveText('Tracking on');
 await expect(id(page,'radio-exercise-card')).toHaveAttribute('data-setup','false');
 await expect(id(page,'radio-clock-applied')).toHaveText(`${SCENARIO_UT} UT`);
 const g=await guide(page);expect(g.next).toBe('setup');expect(g.done).toMatchObject({setup:'false',catalog:'true'});
 await id(page,'pulsar-lab-open').click();
 await expect(id(page,'pulsar-lab-next')).toHaveAttribute('data-tracking-off','true');await expect(id(page,'pulsar-lab-next')).toContainText('press Tracking in the control panel');
 await id(page,'pulsar-lab-close').click();
 // Tracking alone completes setup; no second Start is needed.
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await expect(id(page,'radio-exercise-card')).toHaveAttribute('data-setup','true');
 await expect(status).toHaveAttribute('data-kind','started');await expect(status).toHaveText('Setup complete. Next: point the telescope at a pulsar (see Pulsar guide).');
 expect(await guide(page)).toMatchObject({next:'point',done:{setup:'true'}});
 await id(page,'pulsar-lab-open').click();await expect(id(page,'pulsar-lab-next')).not.toHaveAttribute('data-tracking-off',/.*/);await id(page,'pulsar-lab-close').click();
 // Tracking turned off again: Start changes nothing and still names Tracking.
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).not.toHaveText('Tracking on');
 await expect(id(page,'radio-exercise-reason')).toContainText('press Tracking');
 const snap=await radioSnapshot(page);
 await start(page);
 await expect(status).toHaveAttribute('data-kind','incomplete');await expect(status).toContainText('Steps done now: 0;');
 expect(await radioSnapshot(page)).toEqual(snap);
 // Mirror case: a successful Start must not keep claiming setup after the learner switches Tracking off.
 await id(page,'antenna-tracking').click();await start(page);await expect(status).toHaveAttribute('data-kind','started');
 await expect(status).toHaveText('Already set up: nothing changed.');
 await id(page,'antenna-tracking').click();await expect(id(page,'radio-exercise-card')).toHaveAttribute('data-setup','false');
 await expect(status).toHaveAttribute('data-kind','incomplete');await expect(status).toContainText('press Tracking in the control panel');
 await expect(status).not.toContainText('Already set up');await expect(status).not.toContainText('Exercise set up');
 await id(page,'antenna-tracking').click();await expect(status).toHaveAttribute('data-kind','started');
 await expect(status).toHaveText('Already set up: nothing changed.');
});

// ---------------------------------------------------------------------------------------------------- real bundled catalog path
const timeText=(px:number)=>`${Math.floor(px/100)}.${String(px%100).padStart(2,'0')}0000`;
async function clickPixel(page:Page,n:number,px:number,button:'left'|'right'){
 const plot=id(page,`pulsar-plot-${n}`);await plot.scrollIntoViewIfNeeded();
 const box=(await plot.boundingBox())!,height=Number((await plot.getAttribute('viewBox'))!.split(' ')[3]);
 await page.mouse.move(box.x+(px+.5)*box.width/400,box.y+(10+.5)*box.height/height);await page.mouse.down({button});await page.mouse.up({button});
}
type Dialog={panel:number;frequency:string;reference:string;vertical:string;comment:string};
async function recordAll(page:Page,object:string,dialogs:readonly Dialog[]){
 await id(page,'pulsar-record').click();const dialog=id(page,'pulsar-record-dialog');
 for(const d of dialogs){
  await expect(dialog.getByRole('heading')).toHaveText(`Record measurement: ${object} (receiver ${d.panel})`);
  for(const [k,v] of [['frequency',d.frequency],['reference',d.reference],['vertical',d.vertical]] as const)await expect(id(page,`pulsar-record-${k}`)).toHaveText(v);
  await id(page,'pulsar-comment').fill(d.comment);await id(page,'pulsar-record-ok').click();
 }
 await expect(dialog).toHaveCount(0);
}
/** Node-only check of the downloaded capture: local maxima above half the channel maximum (two recorded channels). */
function peaksOf(bytes:Buffer){
 const l=bytes.toString('latin1').split('\r\n');expect(l.pop()).toBe('');
 const rows=l.slice(4).map(r=>r.split(',').map(Number));
 const channels=[0,1].map(c=>{
  const v=rows.map(r=>r[c]),threshold=Math.max(...v)/2,peaks:number[]=[];
  for(let r=0;r<v.length;r++){if(v[r]<threshold||(r>0&&!(v[r]>v[r-1]))||(r<v.length-1&&!(v[r]>=v[r+1])))continue;peaks.push(r);}
  return peaks;
 });
 return {header:l.slice(0,4),rows,channels};
}

test.describe('desktop 1440 (mouse), original catalog',()=>{
 test.use({viewport:{width:1440,height:1050}});
 test('original 0332+5434 / 0329+54 from the bundled Pulsars.dat: point, 400/500 MHz capture, manual period and delay, guide marks and Clear',async({page},info)=>{
  test.setTimeout(300_000);
  await startApp(page);await start(page);await waitRecorded(page);
  // The student looks up the named source and reads P, DM and coordinates in the actual reference window.
  await id(page,'pulsar-params-open').click();await expect(id(page,'pulsar-params-window')).toBeVisible();
  await id(page,'pulsar-params-find').click();await id(page,'pulsar-find-j2000').check();
  await id(page,'pulsar-find-query').fill(ORIGINAL.primary);await id(page,'pulsar-find-ok').click();
  await expect(id(page,'pulsar-params-field-j2000')).toHaveValue(ORIGINAL.primary);
  await expect(id(page,'pulsar-params-field-b1950')).toHaveValue(ORIGINAL.legacy);
  expect(Number(await id(page,'pulsar-params-field-period').inputValue())).toBeCloseTo(Number(ORIGINAL.p0),10);
  // The source-backed reference display rounds DM to 2 decimals; it is not a timing measurement.
  await expect(id(page,'pulsar-params-field-dm')).toHaveValue('26.78');
  const coordinates=await Promise.all(['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].map(f=>id(page,`pulsar-params-field-${f}`).inputValue()));
  await id(page,'pulsar-params-exit').click();await expect(id(page,'pulsar-params-window')).toHaveCount(0);
  const raHours=Number(ORIGINAL.rawRADegrees)*24/360,decDegrees=Number(ORIGINAL.decDegrees);
  await slewTo(page,coordinates);
  const ra=Number(await id(page,'antenna-ra').getAttribute('data-ra-hours')),dec=Number(await id(page,'antenna-dec').getAttribute('data-dec-degrees'));
  const offset=Math.hypot((ra-raHours)*15*Math.cos(decDegrees*Math.PI/180),dec-decDegrees);
  expect(offset,'pointing offset from the reference position (degrees)').toBeLessThanOrEqual(0.05);
  await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();
  await expect(id(page,'receiver-heading-0')).toContainText(`Pulsar ${ORIGINAL.legacy}`);await expect(id(page,'receiver-heading-0')).not.toContainText('No Pulsar in Beam!');
  // One channel BEFORE Record (Add disarms Record), then 400 / 500 MHz.
  await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();
  for(let i=0;i<2;i++)await id(page,'receiver-frequency-down-0').click();
  await id(page,'receiver-frequency-down-1').click();
  await expect(id(page,'receiver-frequency-value-0')).toHaveText('400.00');await expect(id(page,'receiver-frequency-value-1')).toHaveText('500.00');
  for(const slot of [0,1])await expect(id(page,`receiver-horizontal-value-${slot}`)).toHaveText('4.0');
  expect((await guide(page)).next).toBe('capture');

  // Capture: Record → Receive → Stop → Identify → Properties → No.
  await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
  await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-record-capturing')).toBeVisible();
  await expect(id(page,'receiver-source')).toHaveText(`Profile source: ${ORIGINAL.primary}`);
  await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
  await untilFinished(page);await expect(id(page,'receiver-tick-error')).toHaveCount(0);
  const finish=id(page,'receiver-record-finish');
  await expect(finish).toHaveAttribute('data-stage','identify');await expect(id(page,'receiver-record-identify-input')).toHaveValue(ORIGINAL.legacy);
  await id(page,'receiver-record-identify-ok').click();await expect(finish).toHaveAttribute('data-stage','properties');
  await expect(id(page,'receiver-record-prop-object')).toHaveText(ORIGINAL.legacy);await expect(id(page,'receiver-record-prop-interval')).toHaveText('10.00');
  const points=Number(await id(page,'receiver-record-prop-points').textContent());expect(points).toBeGreaterThanOrEqual(392);
  await expect(id(page,'receiver-record-prop-receiver-1').locator('td').first()).toHaveText('400.00');
  await expect(id(page,'receiver-record-prop-receiver-2').locator('td').first()).toHaveText('500.00');
  await id(page,'receiver-record-properties-ok').click();await id(page,'receiver-record-save-no').click();
  // Let the first lazy analysis import render under a running host clock, as it does for a student. The radio UT stays paused.
  await page.clock.resume();await expect(id(page,'pulsar-memory')).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));await flush(page);
  await expect(id(page,'radio-clock-applied')).toHaveText(`${SCENARIO_UT} UT`);
  await expect(id(page,'pulsar-memory')).toBeVisible();await expect(id(page,'pulsar-memory-origin')).toContainText('not an observation');
  await id(page,'pulsar-properties-close').click();

  // The capture bytes, checked in Node before the cursors are trusted.
  await id(page,'pulsar-raw-export').click();await expect(id(page,'pulsar-raw-export-dialog')).toBeVisible();
  const capture=await download(page,id(page,'pulsar-raw-export-download'));
  const parsed=peaksOf(capture),[c1,c2]=parsed.channels;
  expect(parsed.header[0].startsWith(`'${ORIGINAL.legacy}',`)).toBe(true);
  expect(parsed.header[1].split(',').map(Number).slice(0,2)).toEqual([F_LOW,F_HIGH]);
  expect(Number(parsed.header[3].split(',')[1])).toBe(DT);
  // Resolved profile (width ≪ P): peaks every 71 or 72 samples (P/dt ≈ 71.45), the 500 MHz pulses 25 samples earlier.
  for(const [n,ch] of [c1,c2].entries()){
   expect(ch.length,`channel ${n+1} peaks`).toBeGreaterThanOrEqual(5);
   for(const gap of ch.slice(1).map((p,i)=>p-ch[i]))expect([71,72],`channel ${n+1} spacing`).toContain(gap);
  }
  // Reference values (strings from the original row) and the explicit scenario UT: no product function is used.
  const jd=2440587.5+Date.UTC(2000,0,1,12)/86_400_000,delta=(jd-(Number(ORIGINAL.epochOffsetDays)+2400000))*86400;
  const catalogP=Number(ORIGINAL.p0)+Number(ORIGINAL.pdot)*delta,dm=Number(ORIGINAL.dm);
  const continuousDelay=4150*dm*(1/F_LOW**2-1/F_HIGH**2);// ≈ 0.25002 s ≈ 25.002 samples
  expect(Math.abs(continuousDelay-0.25002)).toBeLessThan(1e-5);

  // Manual period: reference on a 400 MHz pulse, vertical N pulses later on the same panel (inside the zoom-1 window).
  const limit=Math.min(points,400),firstPulse=c1.findIndex(p=>p>=1),a=c1[firstPulse];
  const later=c1.slice(firstPulse+1).filter(p=>p<limit),N=later.length,v=later[N-1];
  expect(N,'periods between the period cursors').toBeGreaterThanOrEqual(4);
  await clickPixel(page,1,a,'right');await expect(id(page,'pulsar-reference')).toHaveText(timeText(a));
  await clickPixel(page,1,v,'left');await expect(id(page,'pulsar-vertical-value-1')).toHaveText(timeText(v));
  const ref=timeText(a);
  await recordAll(page,ORIGINAL.legacy,[{panel:1,frequency:'400.00',reference:ref,vertical:timeText(v),comment:'period N pulses'}]);
  const measuredP=(Number(timeText(v))-Number(ref))/N;
  expect(Math.abs(measuredP-catalogP),'manual period vs catalog P: within dt/N').toBeLessThanOrEqual(DT/N+1e-12);

  // Manual delay: the same pulse at 400 and 500 MHz with the shared reference.
  const b=c1.find(p=>p-25>=1&&p<limit)!,q=c2.reduce((best,p)=>Math.abs(p-(b-25))<Math.abs(best-(b-25))?p:best,c2[0]);
  expect(Math.abs(q-(b-25)),'500 MHz counterpart near 25 samples earlier').toBeLessThanOrEqual(1);
  await clickPixel(page,1,b,'left');await clickPixel(page,2,q,'left');
  await expect(id(page,'pulsar-reference')).toHaveText(ref);
  await recordAll(page,ORIGINAL.legacy,[
   {panel:1,frequency:'400.00',reference:ref,vertical:timeText(b),comment:'400 MHz pulse'},
   {panel:2,frequency:'500.00',reference:ref,vertical:timeText(q),comment:'500 MHz counterpart'},
  ]);
  await expect(id(page,'pulsar-count')).toHaveText('3 recorded measurements');
  const measuredDelay=(b-q)*DT;
  expect(Math.abs(measuredDelay-continuousDelay),'manual 400→500 MHz delay vs DM: within half a sample').toBeLessThanOrEqual(DT/2);

  // Guide: readings recorded (not judged); Save investigation is the eighth required step and is not done yet (Phase 1 item 1.5).
  const g=await guide(page);
  expect(g).toEqual({next:'investigation',done:{setup:'true',catalog:'true',point:'true',channels:'true',capture:'true',period:'true',delay:'true',investigation:'false',save:'false'}});
  await id(page,'pulsar-lab-open').click();await expect(id(page,'pulsar-lab-status-delay')).toHaveText('Reading recorded (not checked for correctness)');
  await expect(id(page,'pulsar-lab-counts')).toHaveText('7 of 8 pulsar steps done.');
  await expect(id(page,'pulsar-lab-investigation-note')).toHaveAttribute('data-investigation','none');
  await expect(id(page,'pulsar-lab-status-investigation')).toHaveText('Not yet for this capture and these rows.');
  await shot(page,info,'original-guide');await id(page,'pulsar-lab-close').click();

  // Closing the receivers un-checks pointing and channels, but the recorded capture and readings keep Next forward.
  await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();
  await id(page,'receiver-close-0').click();await expect(page.locator('[data-testid^="receiver-card-"]')).toHaveCount(0);
  expect(await guide(page)).toEqual({next:'investigation',done:{setup:'true',catalog:'true',point:'false',channels:'false',capture:'true',period:'true',delay:'true',investigation:'false',save:'false'}});
  await nav(page,'Radio data').click();await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
  await expect(id(page,'pulsar-count')).toHaveText('3 recorded measurements');

  // Clear un-checks period and delay; the capture stays.
  await id(page,'pulsar-clear').click();await id(page,'pulsar-clear-discard').click();await id(page,'pulsar-clear-yes').click();
  await expect(id(page,'pulsar-count')).toHaveText(/^0\D/);
  const cleared=await guide(page);
  expect(cleared.next).toBe('period');expect(cleared.done).toMatchObject({capture:'true',period:'false',delay:'false'});
  await info.attach('pulsar-original-readings.json',{body:JSON.stringify({source:'reference row of the recorded Pulsars.dat (not an observation)',reference:ORIGINAL,
   capture:'receiver model output',points,pointingOffsetDegrees:offset,a,v,N,b,q,measuredPeriodSeconds:measuredP,catalogPeriodSeconds:catalogP,
   measuredDelaySeconds:measuredDelay,continuousDelaySeconds:continuousDelay,captureSha256:createHash('sha256').update(capture).digest('hex')},null,1),contentType:'application/json'});
 });
});
