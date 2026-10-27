import {test,expect,type Browser,type Locator,type Page,type Route,type TestInfo} from '@playwright/test';
import{clickHeaderTool,openHeaderTools}from'./fixtures/header-tools';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
// Phase 1 item 1.5 (docs/PULSAR-MANUAL-TIMING.md): Save investigation keeps the Radio workspace, the capture and the confirmed
// pulsar measurements, and Restore investigation brings them back in a NEW browser context, paused and idle. Actual App only:
// the rendered App, its data attributes, the browser clock control, Playwright request routing of the one same-origin catalog
// asset (to count, fail or hold it) and the toolbar's own download and file input. No harness, product hook or OS dialog.
// The real path uses the bundled original Pulsars.dat and the reference row 0332+5434 / 0329+54 (catalog REFERENCE values,
// never observations); the capture is receiver-model output. The protection test uses a test-owned SYNTHETIC .PLR text.
// Expected values are the existing model's own readouts compared before and after the restore (a web restore contract), not
// an equivalence claim with the original program. Helpers are copied from tests/pulsar-exercise-guide-app.spec.ts.
// Validation runs are executed and recorded by the coordinator, not here.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const toolbar=(page:Page)=>page.locator('.investigation-toolbar');
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const storage=(page:Page)=>page.evaluate(()=>[Object.keys(localStorage).sort(),Object.keys(sessionStorage).sort()]);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const saveInvestigation=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const restoreInvestigation=(page:Page,name:string,buffer:Buffer)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer});
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json=any;

const BUNDLED_PATH='**/original/radio/Pulsars.dat';
const BUNDLED={bytes:285692,sha256:'ba94ee94c359e2afd4acce940266d69983d24a93893719cca20d3e23ef3dceaa',rows:'558'};
const NOT_WRITTEN='Data Not Written to File';
const ORIGINAL={primary:'0332+5434',legacy:'0329+54'} as const;
const MAX_SESSION_BYTES=16*1024*1024+4096;
const FORBIDDEN_KEYS=['written','lease','output','timer','audio','dialog','draft'];
function keysOf(v:Json,out=new Set<string>()):Set<string>{if(v&&typeof v==='object'){for(const [k,x] of Object.entries(v)){out.add(k);keysOf(x,out);}}return out;}

async function startApp(page:Page,at='2026-10-24T00:00:00Z'){
 await page.clock.install({time:new Date(at)});
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise-start')).toBeVisible();
 await page.clock.pauseAt(new Date(new Date(at).getTime()+600_000));await flush(page);
}
async function start(page:Page){await id(page,'radio-exercise-start').click();await flush(page);}
async function waitRecorded(page:Page){
 await expect(id(page,'radio-exercise-catalog')).toHaveAttribute('data-catalog','recorded');
 await expect(id(page,'pulsar-ref-identity')).toHaveAttribute('data-recorded','true');await expect(id(page,'pulsar-ref-sha')).toHaveText(BUNDLED.sha256);
}
/** Radio readouts compared before Save and after Restore. */
const radioSnapshot=async(page:Page)=>({
 applied:await id(page,'radio-clock-applied').textContent(),lon:await id(page,'radio-clock-lon').getAttribute('data-longitude-radians'),
 draft:await id(page,'radio-clock-utc').inputValue(),idCaption:await id(page,'radio-id-caption').textContent(),
 ra:await id(page,'antenna-ra').getAttribute('data-ra-hours'),dec:await id(page,'antenna-dec').getAttribute('data-dec-degrees'),
 tracking:await id(page,'antenna-tracking-state').textContent(),clock:await id(page,'radio-clock-state').textContent(),
 catalog:await id(page,'radio-exercise-catalog').getAttribute('data-catalog'),sha:await id(page,'pulsar-ref-sha').textContent(),rows:await id(page,'pulsar-ref-rows').textContent(),
 setup:await id(page,'radio-exercise-card').getAttribute('data-setup'),
});
type GuideState={next:string|null;done:Record<string,string|null>;counts:string|null;investigation:string|null};
async function guide(page:Page):Promise<GuideState>{
 await openHeaderTools(page);await id(page,'pulsar-lab-open').click();const dialog=id(page,'pulsar-lab-dialog');await expect(dialog).toBeVisible();
 const done:Record<string,string|null>={};
 for(const step of ['setup','catalog','point','channels','capture','period','delay','investigation','save'])done[step]=await id(page,`pulsar-lab-step-${step}`).getAttribute('data-done');
 const next=await id(page,'pulsar-lab-next').getAttribute('data-next'),counts=await id(page,'pulsar-lab-counts').textContent();
 const investigation=await id(page,'pulsar-lab-status-investigation').textContent();
 await expect(id(page,'pulsar-lab-backup')).toHaveAttribute('data-backup','available');
 await id(page,'pulsar-lab-close').click();await expect(dialog).toBeHidden();
 return {next,done,counts,investigation};
}
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
/** Node-only check of the downloaded capture: local maxima above half the channel maximum (drives where the manual cursors go). */
function peaksOf(bytes:Buffer){
 const l=bytes.toString('latin1').split('\r\n');expect(l.pop()).toBe('');
 const rows=l.slice(4).map(r=>r.split(',').map(Number));
 return [0,1].map(c=>{
  const v=rows.map(r=>r[c]),threshold=Math.max(...v)/2,peaks:number[]=[];
  for(let r=0;r<v.length;r++){if(v[r]<threshold||(r>0&&!(v[r]>v[r-1]))||(r<v.length-1&&!(v[r]>=v[r+1])))continue;peaks.push(r);}
  return peaks;
 });
}
async function reviewCells(page:Page){
 await id(page,'pulsar-review').click();await expect(id(page,'pulsar-review-dialog')).toBeVisible();
 const rows=page.locator('[data-testid^="pulsar-entry-"]'),out:string[][]=[];
 for(let i=0;i<await rows.count();i++)out.push(await rows.nth(i).locator('td').allInnerTexts());
 await id(page,'pulsar-review-cancel').click();await expect(id(page,'pulsar-review-dialog')).toHaveCount(0);
 return out;
}
const analysisReadouts=async(page:Page)=>({reference:await id(page,'pulsar-reference').textContent(),
 vertical:[await id(page,'pulsar-vertical-value-1').textContent(),await id(page,'pulsar-vertical-value-2').textContent()],count:await id(page,'pulsar-count').textContent(),
 zoom:await id(page,'pulsar-zoom').textContent(),rows:await id(page,'pulsar-memory-rows').textContent(),capture:await id(page,'pulsar-memory-capture').textContent()});
const shot=async(page:Page,info:TestInfo,label:string)=>{await noOverflow(page);await info.attach(`investigation-${label}.png`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});};

/** A fresh context that restores `bytes` from the toolbar; counts its catalog requests and page errors. */
async function restoredContext(browser:Browser,info:TestInfo,bytes:Buffer,viewport:{width:number;height:number}){
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport,acceptDownloads:true});
 const page=await context.newPage(),catalogRequests:string[]=[],errors:string[]=[];
 page.on('request',r=>{if(r.url().includes('/original/radio/'))catalogRequests.push(new URL(r.url()).pathname);});page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();const before=await storage(page);
 await restoreInvestigation(page,'openvireo-session.json',bytes);
 await expect(toolbar(page).getByText('Investigation restored.',{exact:false})).toBeVisible({timeout:30_000});
 return {context,page,catalogRequests,errors,before};
}

test.describe('desktop 1440, original catalog',()=>{
 test.use({viewport:{width:1440,height:1050}});
 test('Save then Restore in a new browser context: the same capture bytes, rows, readouts, source, pointing and paused clock; a fourth row makes the step pending again',async({page,browser},info)=>{
  test.setTimeout(300_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
  await startApp(page);await start(page);await waitRecorded(page);
  // The student finds the named source in Pulsar Parameters, slews to it and opens two receivers at 400 and 500 MHz.
  await id(page,'pulsar-params-open').click();await id(page,'pulsar-params-find').click();await id(page,'pulsar-find-j2000').check();
  await id(page,'pulsar-find-query').fill(ORIGINAL.primary);await id(page,'pulsar-find-ok').click();
  await expect(id(page,'pulsar-params-field-j2000')).toHaveValue(ORIGINAL.primary);
  const coordinates=await Promise.all(['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].map(f=>id(page,`pulsar-params-field-${f}`).inputValue()));
  await id(page,'pulsar-params-exit').click();
  await slewTo(page,coordinates);
  await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-heading-0')).toContainText(`Pulsar ${ORIGINAL.legacy}`);
  await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();
  for(let i=0;i<2;i++)await id(page,'receiver-frequency-down-0').click();
  await id(page,'receiver-frequency-down-1').click();
  await expect(id(page,'receiver-frequency-value-0')).toHaveText('400.00');await expect(id(page,'receiver-frequency-value-1')).toHaveText('500.00');
  // Capture: Record → Receive → Stop → Identify → Properties → No.
  await id(page,'receiver-record').click();await id(page,'receiver-mode').click();await flush(page);await advance(page,600);
  await id(page,'receiver-mode').click();await flush(page);await untilFinished(page);
  await id(page,'receiver-record-identify-ok').click();await id(page,'receiver-record-properties-ok').click();await id(page,'receiver-record-save-no').click();
  await page.clock.resume();await expect(id(page,'pulsar-memory')).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));await flush(page);
  await id(page,'pulsar-properties-close').click();
  const points=Number(await id(page,'pulsar-memory-rows').textContent());
  // The capture bytes A, then three manual rows (period and the 400/500 MHz delay), as in the guide journey.
  await id(page,'pulsar-raw-export').click();const rawA=await download(page,id(page,'pulsar-raw-export-download'));
  const [c1,c2]=peaksOf(rawA),limit=Math.min(points,400),a=c1.find(p=>p>=1)!,v=c1.filter(p=>p>a&&p<limit).at(-1)!;
  await clickPixel(page,1,a,'right');await clickPixel(page,1,v,'left');const ref=timeText(a);
  await recordAll(page,ORIGINAL.legacy,[{panel:1,frequency:'400.00',reference:ref,vertical:timeText(v),comment:'period N pulses'}]);
  const b=c1.find(p=>p-25>=1&&p<limit)!,q=c2.reduce((best,p)=>Math.abs(p-(b-25))<Math.abs(best-(b-25))?p:best,c2[0]);
  await clickPixel(page,1,b,'left');await clickPixel(page,2,q,'left');
  await recordAll(page,ORIGINAL.legacy,[{panel:1,frequency:'400.00',reference:ref,vertical:timeText(b),comment:'400 MHz pulse'},
   {panel:2,frequency:'500.00',reference:ref,vertical:timeText(q),comment:'500 MHz counterpart'}]);
  await expect(id(page,'pulsar-count')).toHaveText('3 recorded measurements');
  const cells=await reviewCells(page),readouts=await analysisReadouts(page);
  // Guide before Save: seven of eight; the investigation step is the next one (no arbitrary checkmark).
  expect(await guide(page)).toMatchObject({next:'investigation',counts:'7 of 8 pulsar steps done.',done:{investigation:'false',save:'false'},
   investigation:'Not yet for this capture and these rows.'});
  await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeFocused();
  const radio=await radioSnapshot(page);await clickHeaderTool(page,'Radio data');
  const storageBefore=await storage(page);

  // Save investigation: inspect the downloaded artifact in Node.
  const saved=await saveInvestigation(page);
  await expect(toolbar(page).getByText('Investigation saved.',{exact:false})).toBeVisible();
  const file:Json=JSON.parse(saved.toString('utf8'));
  expect(file.version).toBe(23);expect(file.numericalPolicy).toBe('Number_x87_equivalence_unvalidated');expect(file.radioPolicy).toBe('OpenVireo radio investigation 1');
  expect(file.base.version).toBeLessThanOrEqual(22);
  expect(sha(JSON.stringify(file.radio)),'consistency digest of the canonical radio part').toBe(file.radioDigestSHA256);
  expect(file.radio.workspace.catalog).toEqual({kind:'recorded',name:'Pulsars.dat',bytes:BUNDLED.bytes,sha256:BUNDLED.sha256,rows:558});
  expect(file.radio.data.kind).toBe('memory');expect(file.radio.data.samples).toHaveLength(3*points);expect(file.radio.data.frequencies).toEqual([400,500,null]);
  expect(file.radio.analysis.list).toHaveLength(3);expect(file.radio.analysis.view).not.toBeNull();
  expect(file.radio.workspace.receivers.windows.map((w:Json)=>w?.frequencyMHz??null)).toEqual([400,500,null]);
  const keys=keysOf(file);for(const k of FORBIDDEN_KEYS)expect(keys.has(k),`no ${k} key`).toBe(false);
  // The guide marks the prepared file for exactly this capture and these rows; a download is not a confirmed write.
  expect(await guide(page)).toMatchObject({counts:'8 of 8 pulsar steps done.',done:{investigation:'true'},
   investigation:'File prepared and download started for this capture and these confirmed rows (not a confirmed write).'});
  expect(await storage(page)).toEqual(storageBefore);expect(errors).toEqual([]);

  // A NEW browser context restores the file from the toolbar.
  const fresh=await restoredContext(browser,info,saved,{width:1440,height:1050});
  try{
   const p=fresh.page;
   expect(fresh.catalogRequests,'exactly one request: the bundled catalog re-fetched and re-checked').toEqual(['/original/radio/Pulsars.dat']);
   await clickHeaderTool(p,'Radio telescope');await expect(heading(p,'Radio telescope control')).toBeVisible();
   await expect(id(p,'radio-restored-note')).toBeVisible();await expect(id(p,'radio-restored-adaptation')).toContainText('not a native file format');
   expect(await radioSnapshot(p)).toEqual(radio);
   await expect(id(p,'radio-route-clock')).toHaveAttribute('data-running','false');await expect(id(p,'radio-clock-state')).toContainText('Paused');
   await expect(p.locator('[data-testid^="receiver-card-"]')).toHaveCount(0);await expect(id(p,'receiver-workspace')).toHaveAttribute('data-timer','false');
   await expect(id(p,'receiver-restored-window-1')).toHaveAttribute('data-frequency','400');await expect(id(p,'receiver-restored-window-2')).toHaveAttribute('data-frequency','500');
   // The shared source buffer was restored: Pulsar Parameters Open finds the same source (read only).
   await id(p,'pulsar-params-open').click();await expect(id(p,'pulsar-params-field-j2000')).toHaveValue(ORIGINAL.primary);
   await expect(id(p,'pulsar-params-seed')).toHaveAttribute('data-seed','name');await id(p,'pulsar-params-exit').click();
   // Pulsar Analysis: the same capture, rows, view and bytes; never marked as written.
   await clickHeaderTool(p,'Radio data');await expect(heading(p,'Recorded pulsar analysis')).toBeVisible();
   await expect(id(p,'pulsar-memory')).toBeVisible();await expect(id(p,'pulsar-restored-note')).toBeVisible();
   expect(await analysisReadouts(p)).toEqual(readouts);expect(await reviewCells(p)).toEqual(cells);
   await id(p,'pulsar-properties-open').click();await expect(id(p,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);await id(p,'pulsar-properties-close').click();
   await id(p,'pulsar-raw-export').click();const rawB=await download(p,id(p,'pulsar-raw-export-download'));
   expect(rawB.equals(rawA),'raw .PLR bytes after the restore equal the bytes before Save').toBe(true);
   expect(await guide(p)).toMatchObject({done:{setup:'true',catalog:'true',capture:'true',period:'true',delay:'true',investigation:'true',save:'false'},
    investigation:'Restored from an investigation file for this capture and these confirmed rows.'});
   // Restore → re-Save BEFORE any receiver is opened: the restored 400/500 settings, the capture and the rows are kept.
   const resavedBytes=await saveInvestigation(p),resaved:Json=JSON.parse(resavedBytes.toString('utf8'));
   await expect(toolbar(p).getByText('Investigation saved.',{exact:false})).toBeVisible();
   expect(resaved.radio.workspace.receivers.windows.map((w:Json)=>w?.frequencyMHz??null)).toEqual([400,500,null]);
   expect(resaved.radio.workspace.receivers.windows).toEqual(file.radio.workspace.receivers.windows);
   expect(resaved.radio.data).toEqual(file.radio.data);expect(resaved.radio.analysis.list).toEqual(file.radio.analysis.list);
   // That re-saved file restores in another NEW context with the same settings, readouts, rows and raw .PLR bytes. There the
   // learner opens only the main receiver (Save: live 400 plus the pending 500), then closes it: the web policy discards the
   // restored settings of that window and every later one, so the next Save stores none.
   const second=await restoredContext(browser,info,resavedBytes,{width:1440,height:1050});
   try{
    const s=second.page;
    await clickHeaderTool(s,'Radio telescope');await expect(heading(s,'Radio telescope control')).toBeVisible();
    expect(await radioSnapshot(s)).toEqual(radio);
    await expect(id(s,'receiver-restored-window-1')).toHaveAttribute('data-frequency','400');await expect(id(s,'receiver-restored-window-2')).toHaveAttribute('data-frequency','500');
    await clickHeaderTool(s,'Radio data');await expect(heading(s,'Recorded pulsar analysis')).toBeVisible();await expect(id(s,'pulsar-memory')).toBeVisible();
    expect(await analysisReadouts(s)).toEqual(readouts);expect(await reviewCells(s)).toEqual(cells);
    await id(s,'pulsar-raw-export').click();const rawC=await download(s,id(s,'pulsar-raw-export-download'));
    expect(rawC.equals(rawA),'raw .PLR bytes after Restore → re-Save → Restore equal the bytes before the first Save').toBe(true);
    await clickHeaderTool(s,'Radio telescope');await id(s,'antenna-receiver-button').click();await expect(id(s,'receiver-card-0')).toBeVisible();
    await expect(id(s,'receiver-frequency-value-0')).toHaveText('400.00');await expect(s.locator('[data-testid^="receiver-card-"]')).toHaveCount(1);
    const partial:Json=JSON.parse((await saveInvestigation(s)).toString('utf8'));
    expect(partial.radio.workspace.receivers.windows.map((w:Json)=>w?.frequencyMHz??null)).toEqual([400,500,null]);
    expect(partial.radio.data).toEqual(file.radio.data);expect(partial.radio.analysis.list).toEqual(file.radio.analysis.list);
    await id(s,'receiver-close-0').click();await expect(s.locator('[data-testid^="receiver-card-"]')).toHaveCount(0);
    const closed:Json=JSON.parse((await saveInvestigation(s)).toString('utf8'));
    expect(closed.radio.workspace.receivers.windows).toEqual([null,null,null]);
    expect(closed.radio.data).toEqual(file.radio.data);expect(closed.radio.analysis.list).toEqual(file.radio.analysis.list);
    expect(second.errors).toEqual([]);
   }finally{await second.context.close();}
   // The restored receiver settings apply at the learner's own Open and Add, before any Receive; nothing starts by itself.
   await clickHeaderTool(p,'Radio telescope');await id(p,'antenna-receiver-button').click();await expect(id(p,'receiver-card-0')).toBeVisible();
   await expect(id(p,'receiver-frequency-value-0')).toHaveText('400.00');await expect(id(p,'receiver-heading-0')).toContainText(`Pulsar ${ORIGINAL.legacy}`);
   await id(p,'receiver-add').click();await expect(id(p,'receiver-frequency-value-1')).toHaveText('500.00');
   await expect(id(p,'receiver-workspace')).toHaveAttribute('data-timer','false');await expect(id(p,'receiver-record-disp')).toHaveText('Off');
   // A fourth row: the restored file no longer covers the list, so the investigation step is pending until a new Save.
   await clickHeaderTool(p,'Radio data');
   const w=c1.filter(x=>x>v&&x<limit)[0]??c1.filter(x=>x<limit).at(-2)!;
   await clickPixel(p,1,w,'left');
   await recordAll(p,ORIGINAL.legacy,[{panel:1,frequency:'400.00',reference:ref,vertical:timeText(w),comment:'after restore'}]);
   await expect(id(p,'pulsar-count')).toHaveText('4 recorded measurements');
   expect(await guide(p)).toMatchObject({next:'investigation',done:{investigation:'false'},investigation:'Not yet for this capture and these rows.'});
   const again:Json=JSON.parse((await saveInvestigation(p)).toString('utf8'));
   expect(again.radio.analysis.list).toHaveLength(4);expect((await guide(p)).done.investigation).toBe('true');
   expect(await storage(p)).toEqual(fresh.before);expect(fresh.errors).toEqual([]);
   await shot(p,info,'restored-1440');
  }finally{await fresh.context.close();}

  // The same bytes restore at 320 and 390 px with the key readouts and no horizontal overflow.
  for(const viewport of [{width:320,height:568},{width:390,height:844}]){
   const small=await restoredContext(browser,info,saved,viewport);
   try{
    const p=small.page;
    await clickHeaderTool(p,'Radio telescope');await expect(id(p,'radio-restored-note')).toBeVisible();
    await expect(id(p,'radio-clock-applied')).toHaveText(radio.applied!);await expect(id(p,'antenna-ra')).toHaveAttribute('data-ra-hours',radio.ra!);
    await shot(p,info,`restored-radio-${viewport.width}`);
    await clickHeaderTool(p,'Radio data');await expect(id(p,'pulsar-count')).toHaveText('3 recorded measurements');
    await expect(id(p,'pulsar-reference')).toHaveText(readouts.reference!);
    await shot(p,info,`restored-analysis-${viewport.width}`);expect(small.errors).toEqual([]);
   }finally{await small.context.close();}
  }
 });
});

// ------------------------------------------------------------------------------------------------ ordinary environment edits
const SAVED_RADIO_NOTE='A running Radio clock and the Radio panel timers were only held during Save and continue without catching up';
const savedJson=async(page:Page)=>{const bytes=await saveInvestigation(page);await expect(toolbar(page).getByText('Investigation saved.',{exact:false})).toBeVisible();return {bytes,file:JSON.parse(bytes.toString('utf8')) as Json};};
async function restoredRadio(page:Page,diameter:string){
 await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeVisible();await expect(id(page,'radio-restored-note')).toBeVisible();
 await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','false');await expect(id(page,'radio-clock-state')).toContainText('Paused');
 await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');await expect(id(page,'radio-env-diameter-current')).toHaveText(diameter);
 await expect(page.locator('[data-testid^="receiver-card-"]')).toHaveCount(0);
}

test('ordinary environment edits after Start never block Save; a running Radio clock keeps running; same-page and fresh-context restores come back paused with the saved caption and current diameter',async({page,browser},info)=>{
 test.setTimeout(180_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
 await startApp(page);await start(page);await waitRecorded(page);
 await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 // Diameter 64 applied after access: the caption keeps the diameter it was written with.
 await id(page,'radio-env-diameter').fill('64');await id(page,'radio-env-apply').click();await expect(id(page,'radio-env-diameter-current')).toHaveText('64');
 await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await id(page,'radio-clock-start').click();await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 const first=await savedJson(page);
 await expect(toolbar(page).getByText(SAVED_RADIO_NOTE,{exact:false})).toBeVisible();
 await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 expect(first.file.radio.workspace.environment.dishDiameterMeters).toBe(64);expect(first.file.radio.workspace.control.idCaption).toEqual({kind:'radio',diameterMeters:100});
 // Clear, then Save again.
 await id(page,'radio-env-clear').click();await expect(id(page,'radio-env-diameter-current')).not.toHaveText('64');
 const cleared=await savedJson(page);expect(cleared.file.radio.workspace.environment.dishDiameterMeters).toBeNull();
 // Switch off, then toggle the other-Window-items flag, then Save again: the menu flag keeps the value of the switch-off.
 await id(page,'radio-switch').click();await expect(id(page,'radio-switch-caption')).toHaveText('Off');
 await id(page,'radio-env-other').check();await expect(id(page,'radio-env-other')).toBeChecked();
 const off=await savedJson(page);
 expect(off.file.radio.workspace.control).toMatchObject({radioPanelShown:false,radioSwitchActive:false,windowMenuEnabled:false});
 expect(off.file.radio.workspace.environment.otherWindowItemsVisible).toBe(true);
 await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 // The first file restored in the SAME page while the Radio clock runs: paused, caption 100, current diameter 64.
 await restoreInvestigation(page,'first.json',first.bytes);
 await expect(toolbar(page).getByText('Investigation restored.',{exact:false})).toBeVisible({timeout:30_000});
 await restoredRadio(page,'64');
 expect(errors).toEqual([]);
 // The same file in a fresh context.
 const fresh=await restoredContext(browser,info,first.bytes,{width:1440,height:1050});
 try{await restoredRadio(fresh.page,'64');expect(fresh.errors).toEqual([]);}finally{await fresh.context.close();}
 // A second page: immediate access (access option on, dome 1), then dome 0; Save succeeds and the file restores.
 const other=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1440,height:1050},acceptDownloads:true});
 try{
  const q=await other.newPage(),qErrors:string[]=[];q.on('pageerror',e=>qErrors.push(String(e)));
  await startApp(q);
  await id(q,'radio-exercise').click();await id(q,'radio-env-dome').selectOption('1');await id(q,'radio-env-option').check();
  await id(q,'radio-env-diameter').fill('100');await id(q,'radio-env-apply').click();await expect(id(q,'radio-env-diameter-current')).toHaveText('100');
  await id(q,'radio-access').click();await expect(id(q,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
  await id(q,'radio-env-dome').selectOption('0');await expect(id(q,'radio-env-dome')).toHaveValue('0');
  const immediate=await savedJson(q);
  expect(immediate.file.radio.workspace.control).toMatchObject({radioScopeByte:3,scopeTimerIntervalMs:null});
  expect(immediate.file.radio.workspace.environment).toMatchObject({domeByte:0,accessOptionByte:true});
  await restoreInvestigation(q,'immediate.json',immediate.bytes);
  await expect(toolbar(q).getByText('Investigation restored.',{exact:false})).toBeVisible({timeout:30_000});
  await clickHeaderTool(q,'Radio telescope');await expect(id(q,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');await expect(id(q,'radio-env-dome')).toHaveValue('0');
  expect(qErrors).toEqual([]);
 }finally{await other.close();}
});

// ------------------------------------------------------------------------------------------------ protections and legacy
/** SYNTHETIC test-owned .PLR text (not a CLEA recording). */
const PLR=Buffer.from(["'SYNTH INV',25,1",'400.00,1400.00,0','1.0,0,1.0','50000.5,0.01','0,10,0','1,10,0','2,10,0'].join('\r\n')+'\r\n','latin1');
async function recordOne(page:Page,comment:string,count:number){
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-count')).toHaveText(`${count} recorded measurements`);
}
const failed=(page:Page)=>expect(toolbar(page).getByRole('alert')).toContainText('could not be restored');
async function kept(page:Page){
 await expect(id(page,'pulsar-count')).toHaveText('2 recorded measurements');await expect(id(page,'pulsar-file-name')).toHaveText('synthetic-inv.PLR');
 await expect(id(page,'pulsar-restored-note')).toHaveCount(0);
}

test('protections: unsafe Save is refused; tampered, wrong catalog, failed, cancelled and oversized restores change nothing; an old base file leaves Radio and rows untouched',async({page})=>{
 test.setTimeout(240_000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
 await startApp(page);await start(page);await waitRecorded(page);
 // (f) Record armed: Save is refused with the capture reason and nothing is downloaded; after disarming Save works.
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 let downloads=0;page.on('download',()=>{downloads++;});
 await page.getByRole('button',{name:'Save investigation',exact:true}).click();
 await expect(toolbar(page).getByRole('alert')).toContainText('Nothing was saved: a receiver Record is armed');await flush(page);expect(downloads).toBe(0);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 const armedThenSaved:Json=JSON.parse((await saveInvestigation(page)).toString('utf8'));expect(armedThenSaved.version).toBe(23);
 await id(page,'receiver-close-0').click();
 // Setup for the restore checks: a synthetic PLR with one confirmed row, saved as V; then a second row (the state to keep).
 await clickHeaderTool(page,'Radio data');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
 await page.clock.resume();
 await id(page,'pulsar-file').setInputFiles({name:'synthetic-inv.PLR',mimeType:'application/octet-stream',buffer:PLR});
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));await id(page,'pulsar-properties-close').click();
 await recordOne(page,'one',1);
 const V=await saveInvestigation(page),v:Json=JSON.parse(V.toString('utf8'));
 expect(v.radio.data).toMatchObject({kind:'file',fileName:'synthetic-inv.PLR',sha256:sha(PLR),text:PLR.toString('latin1')});
 await recordOne(page,'two',2);
 // (a) The .PLR text edited without updating the digest.
 const a=structuredClone(v);a.radio.data.text=a.radio.data.text.replace('2,10,0','2,11,0');
 await restoreInvestigation(page,'tampered.json',Buffer.from(JSON.stringify(a)));await failed(page);await kept(page);
 // (b) The declared catalog SHA-256 altered, digest recomputed: the identity is not the recorded original.
 const b=structuredClone(v);b.radio.workspace.catalog.sha256='0'.repeat(64);b.radioDigestSHA256=sha(JSON.stringify(b.radio));
 await restoreInvestigation(page,'catalog.json',Buffer.from(JSON.stringify(b)));await failed(page);await kept(page);
 // (h) A confirmed row's number text replaced by non-numeric text, digest recomputed: the digest is consistent, but the row is
 // not what the record formatter writes, so nothing is restored and the current capture, rows and readouts stay.
 const cellsKept=await reviewCells(page);
 for(const field of ['frequency','points']){
  const h=structuredClone(v);h.radio.analysis.list[0].fields[field]='not-a-number';h.radioDigestSHA256=sha(JSON.stringify(h.radio));
  await restoreInvestigation(page,`row-${field}.json`,Buffer.from(JSON.stringify(h)));await failed(page);await kept(page);
  await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));expect(await reviewCells(page)).toEqual(cellsKept);
 }
 // (c) The bundled catalog is unavailable during the restore.
 await page.route(BUNDLED_PATH,route=>route.fulfill({status:404,body:''}));
 await restoreInvestigation(page,'unavailable.json',V);await failed(page);await kept(page);
 await page.unroute(BUNDLED_PATH);
 // (d) The catalog request is held and the learner cancels: releasing it later changes nothing.
 let release:()=>void=()=>{},requested=false;
 await page.route(BUNDLED_PATH,async(route:Route)=>{requested=true;await new Promise<void>(r=>{release=r;});try{await route.continue();}catch{/* aborted */}});
 await restoreInvestigation(page,'held.json',V);await expect.poll(()=>requested).toBe(true);
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();
 await expect(toolbar(page).getByText('Pending investigation operation cancelled.',{exact:false})).toBeVisible();
 release();await flush(page);await page.waitForTimeout(500);await flush(page);await kept(page);
 await page.unroute(BUNDLED_PATH);
 // (e) A file one byte over the investigation limit is refused before it is read.
 await restoreInvestigation(page,'oversized.json',Buffer.alloc(MAX_SESSION_BYTES+1,0x20));await failed(page);await kept(page);
 // (g) The v≤22 base extracted from V restores the other tools and leaves Radio and the current rows untouched.
 await restoreInvestigation(page,'base.json',Buffer.from(JSON.stringify(v.base)));
 await expect(toolbar(page).getByText('Investigation restored.',{exact:false})).toBeVisible();await kept(page);
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'radio-restored-note')).toHaveCount(0);await expect(id(page,'radio-exercise-card')).toHaveAttribute('data-setup','true');
 // Positive control: V itself restores the one-row state (the catalog re-fetched), with no pending dialog or capture.
 await restoreInvestigation(page,'v.json',V);await expect(toolbar(page).getByText('Investigation restored.',{exact:false})).toBeVisible({timeout:30_000});
 await clickHeaderTool(page,'Radio data');await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await expect(id(page,'pulsar-file-name')).toHaveText('synthetic-inv.PLR');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 expect(errors).toEqual([]);
});

test('legacy: a file without a Radio part (v≤22) still saves and restores as before when Radio was never used',async({page})=>{
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 const plain:Json=JSON.parse((await saveInvestigation(page)).toString('utf8'));
 expect(plain.version).toBeLessThanOrEqual(22);expect(keysOf(plain).has('radio')).toBe(false);
 await restoreInvestigation(page,'plain.json',Buffer.from(JSON.stringify(plain)));
 await expect(toolbar(page).getByText('Investigation restored.',{exact:false})).toBeVisible();
 await clickHeaderTool(page,'Radio data');await expect(id(page,'pulsar-none')).toBeVisible();await expect(id(page,'pulsar-restored-note')).toHaveCount(0);
});
