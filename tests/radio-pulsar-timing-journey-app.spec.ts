import {test,expect,type FileChooser,type Locator,type Page,type TestInfo} from '@playwright/test';
import{clickHeaderTool,openHeaderTools}from'./fixtures/header-tools';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
// R-RX24 (docs/RADIO-PULSAR-TIMING-JOURNEY.md): one connected learner journey in the actual App. Exercise, options and an
// explicit radio UT → a SYNTHETIC test-owned catalog row → a programmed slew onto its decoded coordinates (pointing readout
// and source in beam checked) → three receivers at 400/600/800 MHz → Record/Receive/Stop → Identify → Properties → No →
// the capture downloaded and checked in Node (peak positions, spacing and channel shifts) → MANUAL period and
// inter-frequency readings with the existing cursors → Record/Review → a planned write failure that keeps the work → the
// verified web Save into this test's own OPFS → the saved bytes loaded back in the same tab and after a page reload, where
// the same cursor pixels reproduce the readings. Desktop (mouse) and 320 px (touch plus keyboard fine adjustment).
// SYNTHETIC: the catalog row (SYNTHETIC24 / SYNTH001, P 0.49 s, Pdot 0, DM 10, width 12.5 ms, flux 1000 mJy) is test data, not
// an original row; the capture is model output of the receiver simulation, not an observation. Expected period and delays are
// exact rationals derived here from those parameters; no product scientific function is imported or used as an oracle. The
// Node peak finder only checks the downloaded bytes before the readings are trusted and drives where the learner's manual
// cursors go; it is not a product feature. No native Save dialog or OS chooser: the Save picker is the synthetic shim below
// over REAL OPFS handles of this test's own origin, and the Load chooser is Playwright's intercepted `filechooser` event.
// A download or a chooser selection is never counted as a verified write. Expected strings are the chosen web contract, not
// native oracles. Helpers are copied from tests/radio-receiver-record-app.spec.ts, tests/radio-receiver-app.spec.ts,
// tests/radio-receiver-record-save-app.spec.ts, tests/pulsar-load-save-app.spec.ts and tests/pulsar-manual-timing-app.spec.ts.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const storage=(page:Page)=>page.evaluate(()=>[Object.keys(localStorage).sort(),Object.keys(sessionStorage).sort()]);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
/** Fake time in 200 ms steps (five 40 ms receiver ticks), letting React commit between steps. */
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}

// ---- Synthetic Save picker over this test's OPFS (trimmed copy of tests/radio-receiver-record-save-app.spec.ts): REAL
// FileSystemFileHandle objects from navigator.storage.getDirectory(), named by the test; one marked write can fail.
type Plan={name:string};
type Shim={synthetic:true;calls:number;events:(string|null)[];plans:Plan[];log:string[];fails:Set<string>;rawGetFile:(this:FileSystemFileHandle)=>Promise<File>};
type Stream={write:(data:unknown)=>Promise<void>;close:()=>Promise<void>;abort:(reason?:unknown)=>Promise<void>};
const installShim=(page:Page)=>page.addInitScript(()=>{
 const w=window as unknown as {__saveShim:Shim};
 const proto=FileSystemFileHandle.prototype as unknown as {createWritable:(this:FileSystemFileHandle,...a:unknown[])=>Promise<Stream>;getFile:(this:FileSystemFileHandle)=>Promise<File>};
 const create=proto.createWritable,getFile=proto.getFile;
 const s:Shim={synthetic:true,calls:0,events:[],plans:[],log:[],fails:new Set(),rawGetFile:getFile};
 w.__saveShim=s;
 proto.createWritable=async function(this:FileSystemFileHandle,...args:unknown[]){
  const name=this.name;s.log.push(`createWritable:${name}`);
  const stream=await create.apply(this,args);
  const write=stream.write.bind(stream),close=stream.close.bind(stream),abort=stream.abort.bind(stream);
  stream.write=async data=>{s.log.push(`write:${name}`);if(s.fails.delete(`write:${name}`))throw new DOMException('synthetic write failure','QuotaExceededError');return write(data);};
  stream.close=async()=>{s.log.push(`close:${name}`);return close();};
  stream.abort=async reason=>{s.log.push(`abort:${name}`);return abort(reason);};
  return stream;
 };
 proto.getFile=async function(this:FileSystemFileHandle){s.log.push(`getFile:${this.name}`);return getFile.call(this);};
 const picker=function(){
  s.calls++;s.events.push((window as unknown as {event?:Event}).event?.type??null);
  const p=s.plans.shift();
  if(!p)return Promise.reject(new DOMException('no synthetic plan','AbortError'));
  return (async()=>(await navigator.storage.getDirectory()).getFileHandle(p.name,{create:true}))();
 };
 (picker as unknown as {__synthetic:boolean}).__synthetic=true;
 Object.defineProperty(window,'showSaveFilePicker',{value:picker,configurable:true,writable:true});
});
const shim=(page:Page)=>page.evaluate(()=>{const s=(window as unknown as {__saveShim:Shim}).__saveShim;return {calls:s.calls,events:[...s.events],log:[...s.log]};});
/** Checked before every Save Choose: the product may call only the synthetic picker. */
const assertSynthetic=async(page:Page)=>expect(await page.evaluate(()=>(window as unknown as {showSaveFilePicker?:{__synthetic?:boolean}}).showSaveFilePicker?.__synthetic)).toBe(true);
const plan=(page:Page,p:Plan)=>page.evaluate(q=>{(window as unknown as {__saveShim:Shim}).__saveShim.plans.push(q);},p);
const failAt=(page:Page,name:string)=>page.evaluate(k=>{(window as unknown as {__saveShim:Shim}).__saveShim.fails.add(k);},`write:${name}`);
const clearLog=(page:Page)=>page.evaluate(()=>{(window as unknown as {__saveShim:Shim}).__saveShim.log.length=0;});
/** The bytes of a test-owned OPFS file, read with the unwrapped getFile. */
const opfs=(page:Page,name:string)=>page.evaluate(async n=>{
 const s=(window as unknown as {__saveShim:Shim}).__saveShim,h=await (await navigator.storage.getDirectory()).getFileHandle(n);
 return Array.from(new Uint8Array(await (await s.rawGetFile.call(h)).arrayBuffer()));
},name).then(a=>Buffer.from(a));
/** Every intercepted file chooser of this page, in order (no OS chooser opens). */
function choosers(page:Page){const list:FileChooser[]=[];page.on('filechooser',c=>{list.push(c);});return list;}
const chooserAttr=(c:FileChooser,name:string)=>c.element().evaluate((el,n)=>el instanceof Element?el.getAttribute(n):null,name);

// ---- SYNTHETIC catalog row in the fixed-column layout of tests/radio-receiver-app.spec.ts (RA column in raw degrees).
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
// Reference catalog values (never learner measurements): P = 0.49 s exactly 49 samples of dt = 4 s / 400; Pdot 0; DM 10;
// equal fluxes so the pulse height does not depend on frequency; 1000 mJy so the centre sample (area 2Φ(0.942) − 1 ≈ 0.654)
// stands well above its neighbours (≈ 0.171 each) and the background.
const PRIMARY='SYNTHETIC24',LEGACY='SYNTH001';
const CATALOG=[{primaryName:PRIMARY,legacyName:LEGACY,ra:'0.25',dec:'38.4',x2a:'0.49',x34:'0.0',s4c:'10.0',s50:'12.5',s54:'1000.0',s58:'1000.0',s5c:'1000.0'}].map(line).join('\r\n')+'\r\n';
/** Decoded source coordinates: raw 0.25° × 24/360 = 1/60 h = 0h01m00s; Dec +38.4° = +38°24′00″. */
const SOURCE_RA_HOURS=1/60,SOURCE_DEC_DEGREES=38.4,SLEW=['0','1','0','38','24','0'] as const;
const UT='2026-10-24T12:00:00';
const NOT_WRITTEN='Data Not Written to File';
const FAIL_NAME='rrx24-fail.PLR',SAVE_NAME='rrx24-journey.PLR';
const SAMPLE_ROW=/^-?\d+\.\d{3},-?\d+\.\d{3},-?\d+\.\d{3}$/;

// ---- Independent goldens (exact integer arithmetic on the synthetic parameters; dt = 1/100 s at H = 4 with 400 points).
const PERIOD_SAMPLES=49;// P/dt = 0.49/0.01
const PERIODS=6,PERIOD_SPAN=PERIODS*PERIOD_SAMPLES;// 294 samples between the period cursors
/** Delay relative to 400 MHz in samples, D·(1/400² − 1/f²)/dt with D = DM·4150 = 41500: num/den exactly. */
const delaySamples=(f:number)=>({num:10*4150*100*(f*f-400*400),den:400*400*f*f});
const D600=delaySamples(600),D800=delaySamples(800);
// 600 MHz: 83/576 s = 2075/144 samples → Round 14; 800 MHz: 249/1280 s = 1245/64 samples → Round 19. Higher arrives earlier.
const SHIFT600=14,SHIFT800=19,DELAY600=83/576,DELAY800=249/1280;
/** Readout text of a cursor on native pixel px at zoom 1 (px × 0.01 s, 6 decimals), built from integers. */
const timeText=(px:number)=>`${Math.floor(px/100)}.${String(px%100).padStart(2,'0')}0000`;

/** One sample per pixel at zoom 1: the fake clock runs until both lazily loaded routes have rendered, then pauses. */
async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();await expect(id(page,'pulsar-none')).toBeVisible();
 await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
/** Phase 1 composition: the synthetic catalog and this journey's UT are supplied FIRST, then Start pulsar exercise runs the
 * remaining setup (exercise, compiled inputs, access and its manual tick, switch, activation, Tracking, longitude). Start
 * must keep both supplied values: the catalog stays the synthetic file (no bundled fetch replaces it) and the UT stays. */
async function setupRadio(page:Page){
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-rrx24.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
 await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${UT} UT`);
 await id(page,'radio-exercise-start').click();await flush(page);
 await expect(id(page,'radio-exercise-status')).toHaveAttribute('data-kind','started');await expect(id(page,'radio-exercise-card')).toHaveAttribute('data-setup','true');
 await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await expect(id(page,'radio-clock-applied')).toHaveText(`${UT} UT`);await expect(id(page,'antenna-clock-tick')).toBeEnabled();
 await expect(id(page,'pulsar-ref-name')).toHaveText('synthetic-rrx24.dat');await expect(id(page,'pulsar-ref-identity')).toHaveAttribute('data-recorded','false');
 await expect(id(page,'radio-exercise-catalog')).toHaveAttribute('data-catalog','supplied');
}
type GuideState={next:string|null;done:Record<string,string|null>};
/** Opens the Pulsar guide from the header, reads every step's state (recomputed from the App state), and closes it. */
async function guide(page:Page):Promise<GuideState>{
 await openHeaderTools(page);await id(page,'pulsar-lab-open').click();const dialog=id(page,'pulsar-lab-dialog');await expect(dialog).toBeVisible();
 const done:Record<string,string|null>={};
 for(const step of ['setup','catalog','point','channels','capture','period','delay','investigation','save'])done[step]=await id(page,`pulsar-lab-step-${step}`).getAttribute('data-done');
 const next=await id(page,'pulsar-lab-next').getAttribute('data-next');
 await id(page,'pulsar-lab-close').click();await expect(dialog).toBeHidden();
 return {next,done};
}
/** Set Coordinates → OK → Yes, then the slew to arrival and its box (tests/radio-receiver-app.spec.ts:92..100). */
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
const finish=(page:Page)=>id(page,'receiver-record-finish');
const cells=(row:Locator)=>row.locator('td').allInnerTexts();

// ---- Node-only check of the downloaded capture (never a product feature): rows, peaks per channel and their ratios.
type Channel={peaks:number[];minRatio:number;threshold:number};
function analyseCapture(bytes:Buffer){
 const l=bytes.toString('latin1').split('\r\n');
 expect(l.pop()).toBe('');
 const rows=l.slice(4).map(r=>{expect(r).toMatch(SAMPLE_ROW);return r.split(',').map(Number);});
 const channels:Channel[]=[0,1,2].map(c=>{
  const v=rows.map(r=>r[c]),threshold=Math.max(...v)/2,peaks:number[]=[];let minRatio=Infinity;
  for(let r=0;r<v.length;r++){
   if(v[r]<threshold||(r>0&&!(v[r]>v[r-1]))||(r<v.length-1&&!(v[r]>=v[r+1])))continue;
   peaks.push(r);
   const neighbour=Math.max(r>0?v[r-1]:0,r<v.length-1?v[r+1]:0);
   minRatio=Math.min(minRatio,neighbour>0?v[r]/neighbour:Infinity);
  }
  return {peaks,minRatio,threshold};
 });
 return {header:l.slice(0,4),rows,channels};
}

type Input='mouse'|'touch';
/** One mouse click at the centre of native pixel (px, row) of panel n (tests/pulsar-manual-timing-app.spec.ts). */
async function clickPixel(page:Page,n:number,px:number,row:number,button:'left'|'right'){
 const plot=id(page,`pulsar-plot-${n}`);await plot.scrollIntoViewIfNeeded();
 const box=(await plot.boundingBox())!;
 const height=Number((await plot.getAttribute('viewBox'))!.split(' ')[3]);
 await page.mouse.move(box.x+(px+.5)*box.width/400,box.y+(row+.5)*box.height/height);
 await page.mouse.down({button});await page.mouse.up({button});
}
/** Touch tap at the centre of native pixel (px, row) of panel n (tests/pulsar-manual-timing-app.spec.ts). */
async function tapPixel(page:Page,n:number,px:number,row:number){
 const plot=id(page,`pulsar-plot-${n}`);await plot.scrollIntoViewIfNeeded();
 const box=(await plot.boundingBox())!;
 const height=Number((await plot.getAttribute('viewBox'))!.split(' ')[3]);
 await page.touchscreen.tap(box.x+(px+.5)*box.width/400,box.y+(row+.5)*box.height/height);
}
/** Touch: the existing keyboard access steps the tapped cursor one pixel per arrow press onto px (at most two presses). */
async function fineAdjust(page:Page,n:number,kind:'reference'|'vertical',px:number){
 const readout=id(page,kind==='reference'?'pulsar-reference':`pulsar-vertical-value-${n}`);
 const text=(await readout.textContent())??'';expect(text,`${kind} after the tap`).toMatch(/^\d+\.\d{6}$/);
 const delta=px-Math.round(Number(text)*100);expect(Math.abs(delta),`${kind} tap within two pixels of ${px}`).toBeLessThanOrEqual(2);
 await id(page,`pulsar-plot-${n}`).focus();
 for(let i=0;i<Math.abs(delta);i++)await page.keyboard.press(`${kind==='reference'?'Shift+':''}${delta>0?'ArrowRight':'ArrowLeft'}`);
}
async function placeReference(page:Page,input:Input,n:number,px:number){
 if(input==='mouse')await clickPixel(page,n,px,10,'right');
 else{await id(page,'pulsar-primary-reference').check();await tapPixel(page,n,px,10);await fineAdjust(page,n,'reference',px);}
 await expect(id(page,'pulsar-reference')).toHaveText(timeText(px));
 for(const k of [1,2,3])await expect(id(page,`pulsar-rline-${k}`)).toHaveAttribute('x1',String(px));
}
async function placeVertical(page:Page,input:Input,n:number,px:number){
 if(input==='mouse')await clickPixel(page,n,px,10,'left');
 else{await id(page,'pulsar-primary-panel').check();await tapPixel(page,n,px-1,10);await fineAdjust(page,n,'vertical',px);}
 await expect(id(page,`pulsar-vertical-value-${n}`)).toHaveText(timeText(px));await expect(id(page,`pulsar-vline-${n}`)).toHaveAttribute('x1',String(px));
}
type Dialog=Readonly<{panel:number;frequency:string;gain:string;reference:string;vertical:string;comment:string}>;
/** Record, then each dialog in panel order: heading, start, frequency, gain, reference, vertical, horizontal, then the comment. */
async function recordAll(page:Page,input:Input,object:string,start:string,dialogs:readonly Dialog[],shot?:()=>Promise<void>){
 if(input==='mouse')await id(page,'pulsar-record').click();else{await id(page,'pulsar-record').focus();await page.keyboard.press('Enter');}
 const dialog=id(page,'pulsar-record-dialog');
 for(const [i,d] of dialogs.entries()){
  await expect(dialog).toBeVisible();await expect(dialog.getByRole('heading')).toHaveText(`Record measurement: ${object} (receiver ${d.panel})`);
  for(const [k,v] of [['start',start],['frequency',d.frequency],['gain',d.gain],['reference',d.reference],['vertical',d.vertical],['horizontal','0.0000E+00']] as const)
   await expect(id(page,`pulsar-record-${k}`),`dialog ${i+1} ${k}`).toHaveText(v);
  if(i===0&&shot)await shot();
  await expect(id(page,'pulsar-comment')).toBeFocused();await id(page,'pulsar-comment').fill(d.comment);
  if(input==='mouse')await id(page,'pulsar-record-ok').click();else await page.keyboard.press('Enter');
 }
 await expect(dialog).toHaveCount(0);
}
/** Review cells (object … file) of every confirmed row, read from the rendered Review dialog, which is then cancelled. */
async function reviewCells(page:Page){
 await id(page,'pulsar-review').click();await expect(id(page,'pulsar-review-dialog')).toBeVisible();
 const rows=page.locator('[data-testid^="pulsar-entry-"]');const out:string[][]=[];
 for(let i=0;i<await rows.count();i++)out.push((await rows.nth(i).locator('td').allInnerTexts()).slice(3));
 await id(page,'pulsar-review-cancel').click();await expect(id(page,'pulsar-review-dialog')).toHaveCount(0);
 return out;
}
const readouts=async(page:Page)=>({reference:await id(page,'pulsar-reference').textContent(),
 vertical:[await id(page,'pulsar-vertical-value-1').textContent(),await id(page,'pulsar-vertical-value-2').textContent(),await id(page,'pulsar-vertical-value-3').textContent()],
 count:await id(page,'pulsar-count').textContent()});
const saveDialog=(page:Page)=>id(page,'pulsar-save-capture-dialog');
const readyDialog=(page:Page)=>id(page,'pulsar-load-save-dialog');
/** Load → the unsaved question → Yes: the flow's Save dialog, with no picker call and no file chooser. */
async function yesToSave(page:Page,seen:FileChooser[]){
 const calls=(await shim(page)).calls,before=seen.length;
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();await expect(id(page,'pulsar-load-cancel')).toBeFocused();
 await id(page,'pulsar-load-yes').click();
 await expect(id(page,'pulsar-load-dialog')).toHaveCount(0);await expect(saveDialog(page)).toBeVisible();await expect(id(page,'pulsar-load-save-intro')).toBeVisible();
 await flush(page);expect((await shim(page)).calls).toBe(calls);expect(seen.length).toBe(before);
}
/** A fresh Choose click: exactly one new chooser, for the dedicated input of the flow. */
async function choose(page:Page,seen:FileChooser[]){
 const before=seen.length;
 await id(page,'pulsar-load-save-choose').click();
 await expect.poll(()=>seen.length).toBe(before+1);
 const c=seen[seen.length-1];
 expect(await chooserAttr(c,'data-testid')).toBe('pulsar-load-save-file');
 return c;
}

/** The whole journey; `input` selects mouse or touch (plus keyboard fine adjustment and keyboard Record). */
async function journey(page:Page,info:TestInfo,input:Input){
 const shot=async(label:string)=>{await noOverflow(page);await info.attach(`rrx24-${label}-${input}.png`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});};
 await installShim(page);const seen=choosers(page);
 await startApp(page);const storageBefore=await storage(page);
 await setupRadio(page);
 expect(await guide(page)).toEqual({next:'point',done:{setup:'true',catalog:'true',point:'false',channels:'false',capture:'false',period:'false',delay:'false',investigation:'false',save:'false'}});

 // 1. Pointing: slew onto the decoded source coordinates; the readout must match and the source must be in the beam.
 await slewTo(page,SLEW);
 const raHours=Number(await id(page,'antenna-ra').getAttribute('data-ra-hours')),decDegrees=Number(await id(page,'antenna-dec').getAttribute('data-dec-degrees'));
 const offset=Math.hypot((raHours-SOURCE_RA_HOURS)*15*Math.cos(SOURCE_DEC_DEGREES*Math.PI/180),decDegrees-SOURCE_DEC_DEGREES);
 expect(offset,'pointing offset from the decoded source (degrees)').toBeLessThanOrEqual(0.05);
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await expect(id(page,'receiver-heading-0')).toContainText(`Pulsar ${LEGACY}`);await expect(id(page,'receiver-heading-0')).not.toContainText('No Pulsar in Beam!');

 // 2. Three channels before arming (Add clears the recording byte): 400 / 600 / 800 MHz, H = 4.0 s.
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-2')).toBeVisible();
 for(let i=0;i<2;i++){await id(page,'receiver-frequency-down-0').click();await id(page,'receiver-frequency-up-2').click();}
 for(const [slot,freq] of [[0,'400.00'],[1,'600.00'],[2,'800.00']] as const){
  await expect(id(page,`receiver-frequency-value-${slot}`)).toHaveText(freq);await expect(id(page,`receiver-horizontal-value-${slot}`)).toHaveText('4.0');
 }
 expect((await guide(page)).next,'pointed with three frequencies: the capture is next').toBe('capture');

 // 3. Capture: Record → Receive → Stop → sweep finish; the profile source is the catalog row.
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await expect(id(page,'receiver-status-0')).toHaveText('Record armed (Record indicator On).');
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-record-capturing')).toBeVisible();
 await expect(id(page,'receiver-source')).toHaveText(`Profile source: ${PRIMARY}`);
 await advance(page,600);
 await id(page,'receiver-mode').click();await flush(page);
 await untilFinished(page);await expect(id(page,'receiver-tick-error')).toHaveCount(0);
 await expect(finish(page)).toHaveAttribute('data-stage','identify');
 await expect(id(page,'receiver-record-identify-input')).toHaveValue(LEGACY);
 await id(page,'receiver-record-identify-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','properties');
 await expect(id(page,'receiver-record-prop-object')).toHaveText(LEGACY);await expect(id(page,'receiver-record-prop-file')).toHaveText(NOT_WRITTEN);
 await expect(id(page,'receiver-record-prop-interval')).toHaveText('10.00');await expect(id(page,'receiver-record-prop-aperture')).toHaveText('100');
 const points=Number(await id(page,'receiver-record-prop-points').textContent());
 expect(points,'capture long enough for six periods inside the zoom-1 window').toBeGreaterThanOrEqual(392);
 const start=(await id(page,'receiver-record-prop-start').textContent())!;expect(start).toMatch(/^\d+\.\d{8}$/);
 const receivers:string[][]=[];
 for(const [n,freq] of [[1,'400.00'],[2,'600.00'],[3,'800.00']] as const){
  const c=await cells(id(page,`receiver-record-prop-receiver-${n}`));expect(c[0]).toBe(freq);expect(c[1]).toMatch(/^\d+\.\d{3}$/);receivers.push(c);
 }
 await shot('finish-properties');
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-memory')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-memory-origin')).toContainText('not an observation');await expect(id(page,'pulsar-memory-rows')).toHaveText(String(points));
 await expect(id(page,'pulsar-prop-object')).toHaveText(LEGACY);await expect(id(page,'pulsar-prop-start')).toHaveText(start);
 await expect(id(page,'pulsar-prop-interval')).toHaveText('10.00');await expect(id(page,'pulsar-prop-file')).toHaveText(NOT_WRITTEN);
 for(const n of [1,2,3])await expect(id(page,`pulsar-prop-receiver-${n}`).locator('td')).toHaveText(receivers[n-1]);
 await id(page,'pulsar-properties-close').click();

 // 4. Check the waveform before trusting it: the canonical download (not a save), parsed and searched in Node.
 await id(page,'pulsar-raw-export').click();await expect(id(page,'pulsar-raw-export-dialog')).toBeVisible();
 const capture=await download(page,id(page,'pulsar-raw-export-download'));
 await expect(id(page,'pulsar-raw-export-dialog')).toHaveCount(0);await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);
 const parsed=analyseCapture(capture),[c1,c2,c3]=parsed.channels;
 expect(parsed.header[0]).toBe(`'${LEGACY}',100,2`);
 expect(parsed.header[1].split(',').map(Number)).toEqual([400,600,800]);
 expect(Number(parsed.header[3].split(',')[1])).toBe(0.01);
 expect(parsed.rows.length).toBe(points);
 await info.attach(`rrx24-capture-peaks-${input}.json`,{body:JSON.stringify({rows:points,channels:parsed.channels},null,1),contentType:'application/json'});
 for(const [n,ch] of parsed.channels.entries()){
  expect(ch.peaks.length,`channel ${n+1} peaks`).toBeGreaterThanOrEqual(7);
  expect(ch.peaks.slice(1).map((p,i)=>p-ch.peaks[i]),`channel ${n+1} spacing`).toEqual(Array(ch.peaks.length-1).fill(PERIOD_SAMPLES));
  expect(ch.minRatio,`channel ${n+1} centre/neighbour`).toBeGreaterThanOrEqual(2.5);
 }
 // Exact goldens: the rationals reduce as stated, round to 14 and 19 samples, and every pulse is shifted by them.
 expect(D600.num*144).toBe(D600.den*2075);expect(D800.num*64).toBe(D800.den*1245);
 expect(Math.round(D600.num/D600.den)).toBe(SHIFT600);expect(Math.round(D800.num/D800.den)).toBe(SHIFT800);
 for(const [other,shift] of [[c2,SHIFT600],[c3,SHIFT800]] as const){
  for(const p of c1.peaks)if(p-shift>=0)expect(other.peaks,`ch1 pulse ${p} shifted by ${shift}`).toContain(p-shift);
  for(const q of other.peaks)if(q+shift<points)expect(c1.peaks,`counterpart of ${q}`).toContain(q+shift);
 }
 const a=c1.peaks.find(p=>p>=1)!,b=a+PERIOD_SAMPLES;
 expect(a+PERIOD_SPAN,'period cursor inside the zoom-1 window and the capture').toBeLessThan(Math.min(points,400));
 expect(c1.peaks).toContain(a+PERIOD_SPAN);expect(c1.peaks).toContain(b);expect(c2.peaks).toContain(b-SHIFT600);expect(c3.peaks).toContain(b-SHIFT800);

 // 5. Manual period: reference on a ch1 pulse, vertical cursor six pulses later; Record.
 const [g1,g2,g3]=receivers.map(r=>r[1]);
 await placeReference(page,input,1,a);
 await placeVertical(page,input,1,a+PERIOD_SPAN);
 await expect(id(page,'pulsar-pending-1')).toBeVisible();for(const n of [2,3])await expect(id(page,`pulsar-pending-${n}`)).toHaveCount(0);
 await shot('panels');
 const ref=timeText(a),period:Dialog={panel:1,frequency:'400.00',gain:g1,reference:ref,vertical:timeText(a+PERIOD_SPAN),comment:'ch1 six periods'};
 await recordAll(page,input,LEGACY,start,[period]);
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // Measured (manual) period vs the reference catalog period 0.49 s: exactly six periods of 49 samples at zoom 1.
 const measuredPeriod=(Number(period.vertical)-Number(period.reference))/PERIODS;
 expect(Math.abs(measuredPeriod-0.49)).toBeLessThan(1e-9);

 // 6. Manual inter-frequency delay: one ch1 pulse and its counterparts 14 and 19 samples earlier; three Record dialogs.
 await placeVertical(page,input,1,b);await placeVertical(page,input,2,b-SHIFT600);await placeVertical(page,input,3,b-SHIFT800);
 await expect(id(page,'pulsar-reference')).toHaveText(ref);
 for(const n of [1,2,3])await expect(id(page,`pulsar-pending-${n}`)).toBeVisible();
 const delays:Dialog[]=[
  {panel:1,frequency:'400.00',gain:g1,reference:ref,vertical:timeText(b),comment:'ch1 pulse'},
  {panel:2,frequency:'600.00',gain:g2,reference:ref,vertical:timeText(b-SHIFT600),comment:'ch2 counterpart'},
  {panel:3,frequency:'800.00',gain:g3,reference:ref,vertical:timeText(b-SHIFT800),comment:'ch3 counterpart'},
 ];
 await recordAll(page,input,LEGACY,start,delays,()=>shot('record-dialog'));
 await expect(id(page,'pulsar-count')).toHaveText('4 recorded measurements');
 const delay600=Number(delays[0].vertical)-Number(delays[1].vertical),delay800=Number(delays[0].vertical)-Number(delays[2].vertical);
 expect(Math.abs(delay600-SHIFT600/100)).toBeLessThan(1e-9);expect(Math.abs(delay800-SHIFT800/100)).toBeLessThan(1e-9);
 expect(Math.abs(delay600-DELAY600),'600 MHz: discrete minus continuous').toBeLessThan(0.005);
 expect(Math.abs(delay800-DELAY800),'800 MHz: discrete minus continuous').toBeLessThan(0.005);
 const all=[period,...delays];
 const row=(d:Dialog,comment:string,file:string)=>[LEGACY,d.frequency,d.gain,d.reference,d.vertical,'—',start,comment,String(points),'10.00','100',file];
 const memoryRows=all.map(d=>row(d,d.comment,''));
 expect(await reviewCells(page)).toEqual(memoryRows);
 const kept=await readouts(page);
 expect(kept).toEqual({reference:ref,vertical:[timeText(b),timeText(b-SHIFT600),timeText(b-SHIFT800)],count:'4 recorded measurements'});
 // Guide: readings recorded (not judged); no Save investigation yet, so the required investigation step is next; the
 // verified .PLR copy is optional and not counted.
 const recorded=await guide(page);
 expect(recorded).toEqual({next:'investigation',done:{setup:'true',catalog:'true',point:'true',channels:'true',capture:'true',period:'true',delay:'true',investigation:'false',save:'false'}});
 await openHeaderTools(page);await id(page,'pulsar-lab-open').click();
 await expect(id(page,'pulsar-lab-counts')).toHaveText('7 of 8 pulsar steps done.');
 await expect(id(page,'pulsar-lab-status-period')).toHaveText('Reading recorded (not checked for correctness)');
 await expect(id(page,'pulsar-lab-status-investigation')).toHaveText('Not yet for this capture and these rows.');
 await expect(id(page,'pulsar-lab-status-save')).toHaveText('No verified copy (optional step).');
 await expect(id(page,'pulsar-lab-backup')).toHaveAttribute('data-backup','available');await id(page,'pulsar-lab-close').click();

 // 7. A failed write keeps the work: Load → Yes → Save → a planned write failure; then Cancel ends the flow (no new behaviour).
 await yesToSave(page,seen);
 await failAt(page,FAIL_NAME);await plan(page,{name:FAIL_NAME});await assertSynthetic(page);await clearLog(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(id(page,'pulsar-save-capture-alert')).toHaveAttribute('data-code','write-failed');await expect(readyDialog(page)).toHaveCount(0);
 expect((await shim(page)).log).toEqual([`createWritable:${FAIL_NAME}`,`write:${FAIL_NAME}`,`abort:${FAIL_NAME}`]);
 await shot('save-dialog');
 expect(await readouts(page)).toEqual(kept);
 await id(page,'pulsar-raw-export-cancel').click();await expect(saveDialog(page)).toHaveCount(0);
 await expect(id(page,'pulsar-status')).toContainText('Load cancelled after Save was closed.');
 await expect(id(page,'pulsar-memory')).toBeVisible();await expect(id(page,'pulsar-save-capture-last')).toHaveCount(0);
 expect(await readouts(page)).toEqual(kept);expect(await reviewCells(page)).toEqual(memoryRows);

 // 8. Verified Save of the same flow path: write, close and an exact read-back; the Load choice opens, nothing is loaded.
 await yesToSave(page,seen);
 await plan(page,{name:SAVE_NAME});await assertSynthetic(page);await clearLog(page);
 await id(page,'pulsar-save-capture-choose').click();
 await expect(saveDialog(page)).toHaveCount(0);await expect(readyDialog(page)).toBeVisible();await expect(id(page,'pulsar-load-save-cancel')).toBeFocused();
 await expect(id(page,'pulsar-load-save-verified')).toContainText(`saved as “${SAVE_NAME}”`);
 const s=await shim(page);expect(s.events.every(e=>e==='click')).toBe(true);
 expect(s.log).toEqual([`createWritable:${SAVE_NAME}`,`write:${SAVE_NAME}`,`close:${SAVE_NAME}`,`getFile:${SAVE_NAME}`]);
 const saved=await opfs(page,SAVE_NAME);expect(saved.equals(capture),'OPFS bytes equal the earlier capture download').toBe(true);
 await expect(id(page,'pulsar-save-capture-last-file')).toHaveText(`Last verified copy: ${SAVE_NAME}`);
 expect(await readouts(page)).toEqual(kept);
 await shot('load-choice');

 // 9. Load the saved bytes back in the same tab through the flow's dedicated chooser; then reproduce every reading.
 const c=await choose(page,seen);
 await c.setFiles({name:SAVE_NAME,mimeType:'application/octet-stream',buffer:saved});
 await expect(readyDialog(page)).toHaveCount(0);
 await expect(id(page,'pulsar-file-name')).toHaveText(SAVE_NAME);await expect(id(page,'pulsar-sha')).toHaveText(sha(saved));
 await expect(id(page,'pulsar-bytes')).toHaveText(String(saved.byteLength));await expect(id(page,'pulsar-memory')).toHaveCount(0);
 expect((await download(page,id(page,'pulsar-download'))).equals(saved),'original-bytes download equals the OPFS bytes').toBe(true);
 await expect(id(page,'pulsar-properties')).toBeVisible();
 await expect(id(page,'pulsar-prop-object')).toHaveText(LEGACY);await expect(id(page,'pulsar-prop-start')).toHaveText(start);
 await expect(id(page,'pulsar-prop-interval')).toHaveText('10.00');await expect(id(page,'pulsar-prop-points')).toHaveText(String(points));
 await expect(id(page,'pulsar-prop-file')).toHaveText(SAVE_NAME);
 for(const n of [1,2,3])await expect(id(page,`pulsar-prop-receiver-${n}`).locator('td')).toHaveText(receivers[n-1]);
 await expect(id(page,'pulsar-count')).toHaveText('4 recorded measurements');await expect(id(page,'pulsar-reference')).toHaveText('');
 await id(page,'pulsar-properties-close').click();
 await placeReference(page,input,1,a);await placeVertical(page,input,1,a+PERIOD_SPAN);
 await recordAll(page,input,LEGACY,start,[{...period,comment:'reloaded period'}]);
 await placeVertical(page,input,1,b);await placeVertical(page,input,2,b-SHIFT600);await placeVertical(page,input,3,b-SHIFT800);
 await recordAll(page,input,LEGACY,start,delays.map(d=>({...d,comment:`reloaded ${d.panel}`})));
 await expect(id(page,'pulsar-count')).toHaveText('8 recorded measurements');
 const reloadedRows=all.map(d=>row(d,d===period?'reloaded period':`reloaded ${d.panel}`,SAVE_NAME));
 const review=await reviewCells(page);
 expect(review).toEqual([...memoryRows,...reloadedRows]);
 // Rows 5–8 differ from rows 1–4 only in the comment (index 7) and the File cell (index 11).
 for(let i=0;i<4;i++)expect(review[i+4].filter((_,k)=>k!==7&&k!==11)).toEqual(review[i].filter((_,k)=>k!==7&&k!==11));

 // 10. Page reload: the tab state is gone; the saved file is still in this test's OPFS and reproduces the period reading.
 await page.clock.resume();await page.reload();
 await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();await expect(id(page,'pulsar-none')).toBeVisible();await expect(id(page,'pulsar-count')).toHaveCount(0);
 const again=await opfs(page,SAVE_NAME);expect(again.equals(saved)).toBe(true);
 await id(page,'pulsar-file').setInputFiles({name:SAVE_NAME,mimeType:'application/octet-stream',buffer:again});
 await expect(id(page,'pulsar-sha')).toHaveText(sha(saved));await expect(id(page,'pulsar-prop-start')).toHaveText(start);
 await id(page,'pulsar-properties-close').click();
 await placeReference(page,input,1,a);await placeVertical(page,input,1,a+PERIOD_SPAN);
 await recordAll(page,input,LEGACY,start,[{...period,comment:'after page reload'}]);
 expect(await reviewCells(page)).toEqual([row(period,'after page reload',SAVE_NAME)]);
 // No stored checkmarks: after the reload the Radio setup is gone, while the reloaded file and its one timed row count again.
 const reloaded=await guide(page);
 expect(reloaded.next).toBe('setup');
 expect(reloaded.done).toMatchObject({setup:'false',catalog:'false',point:'false',channels:'false',capture:'true',period:'true',delay:'false',investigation:'false'});
 expect(await storage(page)).toEqual(storageBefore);
 await info.attach(`rrx24-readings-${input}.json`,{body:JSON.stringify({pointingOffsetDegrees:offset,points,start,a,b,period,delays,
  measuredPeriodSeconds:measuredPeriod,catalogPeriodSeconds:0.49,delay600Seconds:delay600,delay800Seconds:delay800,continuous600:DELAY600,continuous800:DELAY800,
  savedSha256:sha(saved),savedBytes:saved.byteLength},null,1),contentType:'application/json'});
}

test.describe('desktop 1440 (mouse)',()=>{
 test.use({viewport:{width:1440,height:1050}});
 test('R-RX24: slew, three-frequency capture, manual period and delay, failed then verified Save, reload in the tab and after a page reload',async({page},info)=>{
  test.setTimeout(300_000);
  await journey(page,info,'mouse');
 });
});

test.describe('mobile 320 (touch)',()=>{
 test.use({viewport:{width:320,height:568},hasTouch:true});
 test('R-RX24 at 320 px: the same journey with taps, keyboard fine adjustment and keyboard Record, without overflow',async({page},info)=>{
  test.setTimeout(300_000);
  await journey(page,info,'touch');
 });
});
