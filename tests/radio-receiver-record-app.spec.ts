import {test,expect,type Locator,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
// Actual App flows of R-RX4 (docs/RADIO-RECEIVER-RECORD.md): Record → Receive → Stop → Identify → modal Properties → Save
// question → No → the existing manual Pulsar Analysis on the shared current dataset, with the erase prompts against an
// imported file and a memory recording, the analysis Load prompt, the capture lease, the late-read refusal, latent dialogs,
// FormCreate disarm, the main close, the 1601 bound, keyboard and viewports. No harness or product debug hook: the rendered
// App, browser history, the browser clock control and the test-only read hold. The catalog and the PLR text are synthetic;
// recordings are model-generated captures, not observations; expected strings are the chosen web contract, not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const sha=(text:string)=>createHash('sha256').update(Buffer.from(text,'latin1')).digest('hex');
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
/** The test's own probe of the browser API (not the product's data-support): secure context, a callable
 *  showSaveFilePicker and FileSystemFileHandle.prototype.createWritable. No picker is called. */
const saveCapable=(page:Page)=>page.evaluate(()=>window.isSecureContext===true&&typeof (window as {showSaveFilePicker?:unknown}).showSaveFilePicker==='function'
 &&typeof FileSystemFileHandle==='function'&&'createWritable' in FileSystemFileHandle.prototype);

// ---- Synthetic catalog (same fixed-column layout as tests/radio-receiver-app.spec.ts) and a synthetic PLR text.
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
const CATALOG=[{primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'}].map(line).join('\r\n')+'\r\n';
const PLR=["'SYNTH',25,1",'400.00,1400.00,0','1.0,2.0,1.0','50000.5,0.01',...Array.from({length:50},(_,i)=>`${i},10,0`)].join('\r\n')+'\r\n';
const plrFile=(name:string,text=PLR)=>({name,mimeType:'application/octet-stream',buffer:Buffer.from(text,'latin1')});
const UT='2026-10-24T12:00:00';

/** The fake clock runs until both lazily loaded routes have rendered (their chunks do not load under a paused clock). */
async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();await expect(id(page,'pulsar-none')).toBeVisible();
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
async function setupReceiver(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-receiver.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
 await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await id(page,'radio-clock-longitude').click();
 await openReceiver(page);
}
async function openReceiver(page:Page){
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
}
const toAnalysis=async(page:Page)=>{await nav(page,'Radio data').click();await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);};
const toRadio=async(page:Page)=>{await nav(page,'Radio telescope').click();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);};
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}
const finish=(page:Page)=>id(page,'receiver-record-finish');
/** Record (armed), Receive, a short capture, Stop, the sweep finish: Identify is presented. */
async function captureToIdentify(page:Page,ms=600){
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await expect(id(page,'receiver-status-0')).toHaveText('Record armed (Record indicator On).');
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-record-capturing')).toBeVisible();
 await advance(page,ms);
 await id(page,'receiver-mode').click();await flush(page);
 await untilFinished(page);
 await expect(finish(page)).toHaveAttribute('data-stage','identify');
}
/** Identify OK, Properties OK, Save No: returns the Properties point count; the analysis route is shown. */
async function identifyToAnalysis(page:Page,name?:string){
 if(name!==undefined)await id(page,'receiver-record-identify-input').fill(name);
 await id(page,'receiver-record-identify-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','properties');
 const points=await id(page,'receiver-record-prop-points').textContent();
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 return points!;
}
/** One manual measurement on panel 1 through the keyboard cursor access and the Record dialog. */
async function recordManual(page:Page,comment:string){
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
}

test('Record → Receive → Stop → Identify (40-char refusal) → modal Properties → No → manual analysis with cursors, Record, Review and Edit',async({page})=>{
 await startApp(page);await setupReceiver(page);
 await captureToIdentify(page);
 // While receiving armed the vertical and frequency controls were locked (RC-REC-09); now the finish re-enabled them.
 await expect(id(page,'receiver-vertical-up-0')).toBeEnabled();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 const input=id(page,'receiver-record-identify-input');
 await expect(input).toBeFocused();await expect(input).toHaveValue('B2358+38');
 await expect(finish(page)).toContainText('Identify Recorded Object');await expect(finish(page)).toContainText('Enter/Verify Name or ID of Object');
 await input.fill('x'.repeat(41));await id(page,'receiver-record-identify-ok').click();
 await expect(id(page,'receiver-record-identify-refusal')).toHaveText('The name has more than 40 characters. Shorten it; it is not cut.');
 await expect(finish(page)).toHaveAttribute('data-stage','identify');await expect(input).toHaveValue('x'.repeat(41));
 await input.fill('PSR B2358+38');await input.press('Enter');
 await expect(finish(page)).toHaveAttribute('data-stage','properties');
 await expect(id(page,'receiver-record-prop-object')).toHaveText('PSR B2358+38');await expect(id(page,'receiver-record-prop-file')).toHaveText('Data Not Written to File');
 await expect(id(page,'receiver-record-prop-interval')).toHaveText('10.00');await expect(id(page,'receiver-record-prop-aperture')).toHaveText('100');
 await expect(id(page,'receiver-record-prop-receiver-1')).toContainText('600.00');await expect(id(page,'receiver-record-prop-receiver-2')).toHaveText('2');
 const points=await id(page,'receiver-record-prop-points').textContent();expect(Number(points)).toBeGreaterThan(0);
 await id(page,'receiver-record-properties-ok').click();
 await expect(finish(page)).toHaveAttribute('data-stage','save');await expect(id(page,'receiver-record-save-text')).toContainText('("No" -> Open Analysis Window)');
 // R-RX17 Yes opens the finish web Save only where the browser offers the save file picker (otherwise it is disabled with its
 // reason); Cancel stays the web default either way. Yes is not pressed here (tests/radio-receiver-finish-save-app.spec.ts covers it).
 const capable=await saveCapable(page);
 await expect(id(page,'receiver-record-save-yes-reason')).toHaveAttribute('data-support',capable?'ok':/^(insecure-context|no-api)$/);
 if(capable)await expect(id(page,'receiver-record-save-yes')).toBeEnabled();else await expect(id(page,'receiver-record-save-yes')).toBeDisabled();
 await expect(id(page,'receiver-record-save-yes-reason')).toContainText('Web default button: Cancel');
 await expect(id(page,'receiver-record-save-yes-reason')).not.toContainText('not ported');
 await expect(id(page,'receiver-record-save-cancel')).toBeFocused();
 await id(page,'receiver-record-save-no').click();
 // The existing manual analysis on the memory recording: no file identity, no download or SHA-256.
 await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-memory-origin')).toContainText('not an observation');await expect(id(page,'pulsar-memory-rows')).toHaveText(points!);
 await expect(id(page,'pulsar-download')).toHaveCount(0);await expect(id(page,'pulsar-sha')).toHaveCount(0);await expect(id(page,'pulsar-file-name')).toHaveCount(0);
 await expect(id(page,'pulsar-properties')).toBeVisible();await expect(id(page,'pulsar-prop-file')).toHaveText('Data Not Written to File');
 await expect(id(page,'pulsar-prop-points')).toHaveText(points!);await expect(id(page,'pulsar-prop-object')).toHaveText('PSR B2358+38');
 await expect(id(page,'pulsar-panel-1')).toContainText('600.00 MHz');await expect(id(page,'pulsar-panel-2-not-recorded')).toBeVisible();
 await id(page,'pulsar-properties-close').click();
 await recordManual(page,'first pulse');
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await id(page,'pulsar-review').click();
 const row=id(page,'pulsar-entry-1');await expect(row).toContainText('PSR B2358+38');await expect(row).toContainText('first pulse');
 await expect(row.locator('td').last()).toHaveText('');// 11-column memory row: no file field
 await id(page,'pulsar-review-edit').click();await expect(id(page,'pulsar-review-editor')).toBeVisible();
 await id(page,'pulsar-review-edit-comment').fill('edited, kept');await id(page,'pulsar-review-edit-comment').press('Enter');
 await expect(id(page,'pulsar-review-editor')).toHaveCount(0);await id(page,'pulsar-review-ok').click();
 await id(page,'pulsar-review').click();await expect(id(page,'pulsar-entry-1')).toContainText('edited, kept');await id(page,'pulsar-review-cancel').click();
 // A second capture → No: the confirmed list and Review (count-based) stay available.
 await toRadio(page);await expect(id(page,'receiver-record')).toBeEnabled();
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','unsaved');
 await id(page,'receiver-record-no').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','erase');
 await id(page,'receiver-record-ok').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await advance(page,400);await id(page,'receiver-mode').click();await untilFinished(page);
 await identifyToAnalysis(page);
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');await expect(id(page,'pulsar-review')).toBeEnabled();
 await expect(id(page,'pulsar-prop-object')).toHaveText('B2358+38');
 // Nothing persists across a reload.
 await page.clock.resume();await page.reload();await expect(id(page,'pulsar-none')).toBeVisible();await expect(id(page,'pulsar-count')).toHaveCount(0);
});

test('imported file: erase Cancel keeps name, SHA-256 and download bytes; OK erases under the lease (Load disabled); a late held read is discarded',async({page})=>{
 await holdReads(page);await startApp(page);
 await toAnalysis(page);
 await id(page,'pulsar-file').setInputFiles(plrFile('route.plr'));await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 expect((await download(page,id(page,'pulsar-download'))).equals(Buffer.from(PLR,'latin1'))).toBe(true);
 await toRadio(page);await setupReceiver(page);
 // A saved file: only the erase question (flags 0x41, default OK); Escape is Cancel.
 await id(page,'receiver-record').click();
 const prompt=id(page,'receiver-record-prompt');await expect(prompt).toHaveAttribute('data-kind','erase');
 await expect(id(page,'receiver-record-prompt-text')).toHaveText('Deleting Previously Recorded Data From Memory');await expect(id(page,'receiver-record-ok')).toBeFocused();
 await expect(id(page,'radio-route-panel-wrapper')).toHaveAttribute('inert','');await expect(page.locator('.portal-header')).toHaveAttribute('inert','');
 await page.keyboard.press('Escape');await expect(prompt).toHaveCount(0);
 await expect(id(page,'receiver-record-disp')).toHaveText('Off');await expect(id(page,'receiver-record')).toBeFocused();
 await toAnalysis(page);
 await expect(id(page,'pulsar-file-name')).toHaveText('route.plr');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 expect((await download(page,id(page,'pulsar-download'))).equals(Buffer.from(PLR,'latin1'))).toBe(true);
 // A held read, then the route change cancels it; arming is then admitted.
 await id(page,'pulsar-file').setInputFiles(plrFile('held-late.plr'));await held(page,'held-late.plr');
 await toRadio(page);
 await id(page,'receiver-record').click();await id(page,'receiver-record-ok').click();
 await expect(id(page,'receiver-record-disp')).toHaveText('On');await expect(id(page,'receiver-record-armed')).toBeVisible();
 await toAnalysis(page);
 await expect(id(page,'pulsar-leased')).toBeVisible();await expect(id(page,'pulsar-file')).toBeDisabled();
 await expect(id(page,'pulsar-data-notice')).toHaveAttribute('data-kind','empty');await expect(id(page,'pulsar-data-notice')).toContainText('No Current Data to Analyze');
 await expect(id(page,'pulsar-sha')).toHaveCount(0);await expect(id(page,'pulsar-none')).toBeVisible();
 await release(page,'held-late.plr');await flush(page);
 await expect(id(page,'pulsar-status')).toHaveText('An earlier read finished after it was replaced or cancelled, and was ignored.');
 await expect(id(page,'pulsar-sha')).toHaveCount(0);await expect(id(page,'pulsar-leased')).toBeVisible();
 // Disarming releases the lease; Load is available again.
 await toRadio(page);await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await toAnalysis(page);await expect(id(page,'pulsar-leased')).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeEnabled();
});

test('an open analysis dialog refuses arming; unsaved memory data: Cancel keeps it, No → erase Cancel keeps it; the analysis Load prompt (Cancel, No → chooser)',async({page})=>{
 await startApp(page);await setupReceiver(page);
 await captureToIdentify(page);const points=await identifyToAnalysis(page);
 await recordManual(page,'kept');
 // The Clear question is a modal session; hiding the route keeps it, and arming is refused (WEB-REC-TXN).
 await id(page,'pulsar-clear').click();await expect(id(page,'pulsar-clear-dialog')).toBeVisible();
 await page.goBack();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await id(page,'receiver-record').click();
 await expect(id(page,'receiver-status-0')).toHaveText('Record refused: Pulsar Analysis has an open dialog or a file being read. Finish it first; nothing was erased.');
 await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await page.goForward();await expect(id(page,'pulsar-clear-dialog')).toBeVisible();await id(page,'pulsar-clear-cancel').click();
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await toRadio(page);
 // Unsaved memory data (flags 0x13): R-RX16 Yes opens the Radio web Save only where the browser offers the save file picker
 // (otherwise it is disabled with its reason); Cancel stays the web default either way. Yes is not pressed here
 // (tests/radio-receiver-record-save-app.spec.ts covers it).
 await id(page,'receiver-record').click();
 await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','unsaved');
 await expect(id(page,'receiver-record-prompt-text')).toContainText('You have not saved your previously recorded data!');
 // The product's data-support and Yes must agree with the test's own probe of this browser (either branch is valid).
 const capable=await saveCapable(page);
 await expect(id(page,'receiver-record-yes-reason')).toHaveAttribute('data-support',capable?'ok':/^(insecure-context|no-api)$/);
 if(capable)await expect(id(page,'receiver-record-yes')).toBeEnabled();else await expect(id(page,'receiver-record-yes')).toBeDisabled();
 await expect(id(page,'receiver-record-yes-reason')).toContainText('Web default button: Cancel');
 await expect(id(page,'receiver-record-cancel')).toBeFocused();await page.keyboard.press('Enter');
 await expect(id(page,'receiver-record-prompt')).toHaveCount(0);await expect(id(page,'receiver-status-0')).toHaveText('Record cancelled; the previous data is kept.');
 await id(page,'receiver-record').click();await id(page,'receiver-record-no').click();
 await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','erase');await id(page,'receiver-record-cancel').click();
 await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await toAnalysis(page);await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 // Load prompt (flags 0x13) for unsaved memory data: Cancel keeps it; No opens the chooser from the same gesture. R-RX18: Yes
 // opens the verified web Save only where this browser offers it (the test's own probe); it is not pressed here
 // (tests/pulsar-load-save-app.spec.ts covers it).
 await id(page,'pulsar-file').click();
 const load=id(page,'pulsar-load-dialog');await expect(load).toBeVisible();await expect(id(page,'pulsar-load-text')).toContainText('You have not saved your current pulsar data!');
 if(capable)await expect(id(page,'pulsar-load-yes')).toBeEnabled();else await expect(id(page,'pulsar-load-yes')).toBeDisabled();
 await expect(id(page,'pulsar-load-cancel')).toBeFocused();
 await page.keyboard.press('Escape');await expect(load).toHaveCount(0);await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 await id(page,'pulsar-file').click();await expect(load).toBeVisible();
 const chooser=page.waitForEvent('filechooser');await id(page,'pulsar-load-no').click();
 await (await chooser).setFiles(plrFile('after-memory.plr'));
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));await expect(id(page,'pulsar-memory')).toHaveCount(0);
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
});

test('latent finish dialogs on a hidden route keep the Identify draft; Escape keeps the name; Save Cancel stays; close and reopen shows Off',async({page})=>{
 await startApp(page);await setupReceiver(page);
 await id(page,'receiver-record').click();await id(page,'receiver-mode').click();await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
 await page.goBack();await expect(id(page,'receiver-workspace')).toBeHidden();
 await untilFinished(page);// the timer keeps running on the hidden route
 await expect(finish(page)).toHaveCount(0);await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-pending','false');
 await page.goForward();await expect(finish(page)).toHaveAttribute('data-stage','identify');
 await id(page,'receiver-record-identify-input').fill('X1');
 await page.goBack();await expect(finish(page)).toHaveCount(0);await page.goForward();
 await expect(id(page,'receiver-record-identify-input')).toHaveValue('X1');
 await page.keyboard.press('Escape');
 await expect(finish(page)).toHaveAttribute('data-stage','properties');await expect(id(page,'receiver-record-prop-object')).toHaveText('B2358+38');
 await id(page,'receiver-record-properties-ok').press('Enter');await expect(finish(page)).toHaveAttribute('data-stage','save');
 await page.keyboard.press('Enter');// the focused web default Cancel
 await expect(finish(page)).toHaveCount(0);await expect(id(page,'receiver-record')).toBeFocused();
 await expect(id(page,'receiver-status-0')).toHaveText('Finished. The recording stays the current pulsar data.');
 await expect(heading(page,'Radio telescope control')).toBeVisible();
 await id(page,'receiver-close-0').click();await openReceiver(page);
 await toAnalysis(page);await expect(id(page,'pulsar-prop-object')).toHaveText('B2358+38');await expect(id(page,'pulsar-memory')).toBeVisible();
});

test('Add disarms with a stale On label until the main refresh; closing the main mid-capture makes the partial rows current',async({page})=>{
 await startApp(page);await setupReceiver(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();
 await expect(id(page,'receiver-status-0')).toContainText('cleared the recording byte');
 await expect(id(page,'receiver-record-disp')).toHaveText('On');await expect(id(page,'receiver-record-armed')).toHaveCount(0);
 await id(page,'receiver-vertical-up-0').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await flush(page);
 for(const t of ['receiver-vertical-up-0','receiver-frequency-up-1','receiver-frequency-step-down-0','receiver-record'])await expect(id(page,t)).toBeDisabled();
 await advance(page,400);
 const rows=Number(await id(page,'receiver-record-state').getAttribute('data-rows'));expect(rows).toBeGreaterThan(0);
 await id(page,'receiver-close-0').click();await expect(id(page,'receiver-card-0')).toHaveCount(0);
 await expect(id(page,'receiver-setup-status')).toContainText('the rows recorded so far are now the current pulsar data');
 await expect(finish(page)).toHaveCount(0);
 await toAnalysis(page);await expect(id(page,'pulsar-memory')).toBeVisible();
 expect(Number(await id(page,'pulsar-memory-rows').textContent())).toBeGreaterThanOrEqual(rows);
 await expect(id(page,'pulsar-prop-receiver-2')).toContainText('600.00');// both receivers recorded
});

test('H = 0.5: the 1601-row bound shows Data Buffer Filled first; keyboard-only dialogs ignore held keys; 1440/375/320 without overflow',async({page},info)=>{
 await startApp(page);await setupReceiver(page);
 for(let i=0;i<3;i++)await id(page,'receiver-horizontal-down-0').click();await expect(id(page,'receiver-horizontal-value-0')).toHaveText('0.5');
 await id(page,'receiver-record').focus();await page.keyboard.press('Enter');await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await advance(page,2400);
 await expect(id(page,'receiver-record-state')).toHaveAttribute('data-full','true');await expect(id(page,'receiver-record-state')).toHaveAttribute('data-rows','1601');
 await id(page,'receiver-mode').click();await untilFinished(page);
 await expect(finish(page)).toHaveAttribute('data-stage','full');
 await expect(id(page,'receiver-record-full-text')).toHaveText('Data Recording Was Terminated at 1600 Points.');await expect(id(page,'receiver-record-full-ok')).toBeFocused();
 await page.keyboard.press('Enter');await expect(finish(page)).toHaveAttribute('data-stage','identify');
 // Tab stays inside the dialog.
 await expect(id(page,'receiver-record-identify-input')).toBeFocused();
 for(const t of ['receiver-record-identify-ok','receiver-record-identify-cancel','receiver-record-identify-input']){await page.keyboard.press('Tab');await expect(id(page,t)).toBeFocused();}
 // A held Enter confirms Identify once; its repeats do not close Properties.
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect(finish(page)).toHaveAttribute('data-stage','properties');await expect(id(page,'receiver-record-prop-points')).toHaveText('1601');
 for(const [width,height] of [[375,812],[320,568],[1440,1050]] as const){
  await page.setViewportSize({width,height});await flush(page);await noOverflow(page);
  await info.attach(`record-properties-${width}.png`,{body:await page.screenshot({path:info.outputPath(`record-properties-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
 await id(page,'receiver-record-properties-ok').click();await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-memory-full')).toHaveText('Yes');await expect(id(page,'pulsar-prop-points')).toHaveText('1601');
 for(const [width,height] of [[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);await noOverflow(page);
  await info.attach(`record-analysis-${width}.png`,{body:await page.screenshot({path:info.outputPath(`record-analysis-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
});

// ---- fix1 regressions (QA1 F1/F2/F3). WEB transaction and layout policy of this implementation, not native VCL witnesses.
const LEASE_REJECTION='A receiver recording holds the current pulsar data';
const PROMPT_FIRST='Nothing was loaded: use the Load control, so the question about the unsaved current data can be answered first.';
const NO_FILE='No file chosen. The current analysis is unchanged.';
/** A change event delivered to the (disabled) chooser without any click: a scripted selection, not a user path. */
const forceChange=(page:Page,name:string)=>id(page,'pulsar-file').evaluate((el:HTMLInputElement,[text,n])=>{
 const dt=new DataTransfer();dt.items.add(new File([text],n));el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));
},[PLR,name] as const);

test('F1: the capture lease holds through Properties and the Save question; a forced change is refused; No and Cancel release it once',async({page})=>{
 await startApp(page);await setupReceiver(page);await captureToIdentify(page);
 await id(page,'receiver-record-identify-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','properties');
 await expect(id(page,'receiver-record-prop-object')).toHaveText('B2358+38');
 // Hide Radio while Properties is pending: the capture is current, Load stays disabled under the committed lease.
 await page.evaluate(()=>{location.hash='#pulsar-analysis';});await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-file')).toBeDisabled();await expect(id(page,'pulsar-leased')).toHaveAttribute('data-phase','committed');
 await expect(id(page,'pulsar-prop-object')).toHaveText('B2358+38');
 await forceChange(page,'forced-during-finish.plr');await flush(page);
 await expect(id(page,'pulsar-rejection')).toContainText(LEASE_REJECTION);
 await expect(id(page,'pulsar-memory')).toBeVisible();await expect(id(page,'pulsar-sha')).toHaveCount(0);await expect(id(page,'pulsar-prop-object')).toHaveText('B2358+38');
 await toRadio(page);await expect(finish(page)).toHaveAttribute('data-stage','properties');await expect(id(page,'receiver-record-prop-object')).toHaveText('B2358+38');
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await page.evaluate(()=>{location.hash='#pulsar-analysis';});await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-file')).toBeDisabled();await expect(id(page,'pulsar-leased')).toBeVisible();
 await toRadio(page);await expect(finish(page)).toHaveAttribute('data-stage','save');
 await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await expect(id(page,'pulsar-prop-object')).toHaveText('B2358+38');await expect(id(page,'pulsar-memory')).toBeVisible();
 await expect(id(page,'pulsar-file')).toBeEnabled();await expect(id(page,'pulsar-leased')).toHaveCount(0);
 // A second capture answered with Escape (Cancel) on the Save question also releases it.
 await toRadio(page);
 await id(page,'receiver-record').click();await id(page,'receiver-record-no').click();await id(page,'receiver-record-ok').click();
 await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await advance(page,400);await id(page,'receiver-mode').click();await untilFinished(page);
 await id(page,'receiver-record-identify-input').fill('SECOND');await id(page,'receiver-record-identify-ok').click();
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await page.keyboard.press('Escape');await expect(finish(page)).toHaveCount(0);
 await toAnalysis(page);await expect(id(page,'pulsar-file')).toBeEnabled();await expect(id(page,'pulsar-leased')).toHaveCount(0);
 await expect(id(page,'pulsar-prop-object')).toHaveText('SECOND');
});

test('F2: input cancel, an empty selection and a route change withdraw the Load grant; a later drop is refused; a fresh No loads',async({page})=>{
 await startApp(page);await setupReceiver(page);await captureToIdentify(page);const points=await identifyToAnalysis(page);
 const input=id(page,'pulsar-file'),load=id(page,'pulsar-load-dialog');
 const grant=async()=>{await input.click();await expect(load).toBeVisible();const chooser=page.waitForEvent('filechooser');await id(page,'pulsar-load-no').click();return chooser;};
 // An accepted file starts an asynchronous read: no pending read first, then the capture still shown, so a late load cannot pass.
 const refused=async()=>{
  await expect(id(page,'pulsar-reading')).toHaveCount(0);
  await expect(id(page,'pulsar-status')).toHaveText(PROMPT_FIRST);await expect(load).toHaveCount(0);
  await expect(id(page,'pulsar-memory-rows')).toHaveText(points);await expect(id(page,'pulsar-sha')).toHaveCount(0);
 };
 // No → chooser → the standard input cancel event (no change), then a selection without any click.
 await grant();await input.dispatchEvent('cancel');await flush(page);
 await expect(id(page,'pulsar-status')).toHaveText(NO_FILE);
 await input.setInputFiles(plrFile('after-cancel.plr'));await flush(page);await refused();
 // The next real click asks again (no stale skip); Cancel keeps the data.
 await input.click();await expect(load).toBeVisible();await id(page,'pulsar-load-cancel').click();await expect(load).toHaveCount(0);
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 // An empty selection consumes the grant.
 await(await grant()).setFiles([]);await flush(page);await expect(id(page,'pulsar-status')).toHaveText(NO_FILE);
 await input.setInputFiles(plrFile('after-empty.plr'));await flush(page);await refused();
 // Leaving and reentering the route withdraws an outstanding grant.
 await grant();await toRadio(page);await toAnalysis(page);
 await input.setInputFiles(plrFile('after-route.plr'));await flush(page);await refused();
 // A fresh explicit No grants one legitimate load.
 await(await grant()).setFiles(plrFile('fresh-confirmed.plr'));
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));await expect(id(page,'pulsar-file-name')).toHaveText('fresh-confirmed.plr');
 await expect(id(page,'pulsar-prop-object')).toHaveText('SYNTH');await expect(id(page,'pulsar-memory')).toHaveCount(0);
});

test('F3: a 40-character memory capture wraps without overflow at 1440, 375 and 320; the keyboard Record dialog stays inside',async({page})=>{
 await startApp(page);await setupReceiver(page);await captureToIdentify(page);
 const name='X'.repeat(40);await identifyToAnalysis(page,name);
 await expect(id(page,'pulsar-prop-object')).toHaveText(name);
 for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);await noOverflow(page);
  for(const target of ['pulsar-memory-origin','pulsar-memory-rows','pulsar-prop-object']){
   const box=await id(page,target).boundingBox();
   expect(box,target).not.toBeNull();expect(box!.width,`${target} at ${width}`).toBeGreaterThan(0);
   expect(box!.x,`${target} at ${width}`).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width,`${target} at ${width}`).toBeLessThanOrEqual(width);
  }
 }
 // Keyboard only at 320: cursor access, Record, the dialog fits, Enter confirms.
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').focus();await page.keyboard.press('Enter');
 const dialog=id(page,'pulsar-record-dialog');await expect(dialog).toBeVisible();await expect(id(page,'pulsar-comment')).toBeFocused();
 await expect(dialog.locator('h3')).toContainText(name);
 expect(await dialog.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(0);
 await noOverflow(page);
 await page.keyboard.type('wrapped');await page.keyboard.press('Enter');await expect(dialog).toHaveCount(0);
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
});

// ---- fix2 regressions (final review F4/N1). Web layout/status policy, not native VCL or GDI witnesses.
const PROPERTY_LABELS=[
 ['object','Object identification'],['start','Data start time (Julian Day Number − 2,400,000)'],['aperture','Telescope aperture (m)'],
 ['interval','Time interval between data points (msec)'],['points','Number of data points (per recorded receiver)'],['file','File name'],
] as const;
const PARTIAL='The main window closed while recording: the rows recorded so far are now the current pulsar data (web policy; no Identify or Properties).';
/** Properties geometry: the dialog client box and overflow, each dl pair (row, dt, dd boxes and the dd's line count) and the table. */
const propertiesGeometry=(page:Page)=>finish(page).evaluate((el:HTMLElement)=>{
 const box=(r:DOMRect)=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width});
 const rect=el.getBoundingClientRect(),left=rect.left+el.clientLeft;
 const pairs=Array.from(el.querySelectorAll('dl > div')).map(div=>{
  const dt=div.querySelector('dt')!,dd=div.querySelector('dd')!,range=document.createRange();range.selectNodeContents(dd);
  return {key:(dd.getAttribute('data-testid')??'').replace('receiver-record-prop-',''),label:dt.textContent??'',value:dd.textContent??'',
   row:box(div.getBoundingClientRect()),dt:box(dt.getBoundingClientRect()),dd:box(dd.getBoundingClientRect()),ddLines:range.getClientRects().length};
 });
 return {client:{left,right:left+el.clientWidth},overflow:el.scrollWidth-el.clientWidth,pairs,table:box(el.querySelector('table')!.getBoundingClientRect())};
});

for(const [kind,name] of [['short','B2358+38'],['40-character','X'.repeat(40)]] as const){
 test(`F4: Properties keeps one label/value pair per row inside the dialog at 1440, 375 and 320 (${kind} name)`,async({page},info)=>{
  await startApp(page);await setupReceiver(page);await captureToIdentify(page);
  await id(page,'receiver-record-identify-input').fill(name);await id(page,'receiver-record-identify-ok').click();
  await expect(finish(page)).toHaveAttribute('data-stage','properties');
  const ok=id(page,'receiver-record-properties-ok');await expect(ok).toBeFocused();
  for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
   await page.setViewportSize({width,height});await flush(page);await noOverflow(page);
   const g=await propertiesGeometry(page),at=(what:string)=>`${what} at ${width}`;
   expect(g.overflow,at('dialog overflow')).toBeLessThanOrEqual(0);
   expect(g.pairs.map(p=>[p.key,p.label]),at('pairs')).toEqual(PROPERTY_LABELS.map(([k,l])=>[k,l]));
   const value=Object.fromEntries(g.pairs.map(p=>[p.key,p.value]));
   expect(value.object).toBe(name);expect(value.aperture).toBe('100');expect(value.interval).toBe('10.00');expect(value.file).toBe('Data Not Written to File');
   expect(value.points).toMatch(/^[1-9]\d*$/);expect(value.start).toMatch(/^\d+\.\d{8}$/);
   // Inside the client box (0.5 px for the integer clientLeft/clientWidth against fractional boxes).
   const inside=(b:{left:number;right:number;width:number},what:string)=>{
    expect(b.width,at(what)).toBeGreaterThan(0);
    expect(b.left,at(what)).toBeGreaterThanOrEqual(g.client.left-0.5);expect(b.right,at(what)).toBeLessThanOrEqual(g.client.right+0.5);
   };
   g.pairs.forEach((p,i)=>{
    inside(p.dt,`${p.key} dt`);inside(p.dd,`${p.key} dd`);
    expect(p.dd.top,at(`${p.key} dd below or beside its dt`)).toBeGreaterThanOrEqual(p.dt.top-0.5);
    if(i>0)expect(p.row.top,at(`${p.key} on its own row`)).toBeGreaterThanOrEqual(g.pairs[i-1].row.bottom-0.5);
    if(p.key!=='object')expect(p.ddLines,at(`${p.key} on one line`)).toBe(1);
   });
   inside(g.table,'table');
   await info.attach(`record-properties-${kind}-${width}.png`,{body:await page.screenshot({path:info.outputPath(`record-properties-${kind}-${width}.png`),fullPage:true}),contentType:'image/png'});
  }
  await expect(ok).toBeFocused();await page.keyboard.press('Enter');await expect(finish(page)).toHaveAttribute('data-stage','save');
  await page.keyboard.press('Escape');await expect(finish(page)).toHaveCount(0);
  await expect(id(page,'receiver-status-0')).toHaveText('Finished. The recording stays the current pulsar data.');
  await toAnalysis(page);await expect(id(page,'pulsar-prop-object')).toHaveText(name);
 });
}

test('N1: closing the main after arming but before Receive claims no data and releases the lease; a mid-capture close still makes its rows current',async({page})=>{
 await startApp(page);await setupReceiver(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');await expect(id(page,'receiver-record-armed')).toBeVisible();
 await id(page,'receiver-close-0').click();await expect(id(page,'receiver-card-0')).toHaveCount(0);
 await expect(id(page,'receiver-setup-status')).toHaveText('Receiver window closed.');
 await expect(id(page,'receiver-setup-status')).not.toContainText('current pulsar data');
 await toAnalysis(page);
 await expect(id(page,'pulsar-none')).toBeVisible();await expect(id(page,'pulsar-memory')).toHaveCount(0);
 await expect(id(page,'pulsar-leased')).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeEnabled();
 // FormCreate clears the byte that the close left set; arming again is admitted only because the close released the lease.
 await toRadio(page);await openReceiver(page);await expect(id(page,'receiver-status-0')).toContainText('cleared the recording byte');
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await expect(id(page,'receiver-status-0')).toHaveText('Record armed (Record indicator On).');
 await id(page,'receiver-mode').click();await flush(page);await advance(page,400);
 const rows=Number(await id(page,'receiver-record-state').getAttribute('data-rows'));expect(rows).toBeGreaterThan(0);
 await id(page,'receiver-close-0').click();await expect(id(page,'receiver-card-0')).toHaveCount(0);
 await expect(id(page,'receiver-setup-status')).toHaveText(PARTIAL);
 await toAnalysis(page);await expect(id(page,'pulsar-memory')).toBeVisible();
 expect(Number(await id(page,'pulsar-memory-rows').textContent())).toBeGreaterThanOrEqual(rows);
 await expect(id(page,'pulsar-leased')).toHaveCount(0);await expect(id(page,'pulsar-file')).toBeEnabled();
});

// ---- R-RX11 regressions: the Load chooser joins the pending-read gate. Web policy (the native Load reads synchronously, so
// no event-order parity is claimed). The read and digest holds are test-only init scripts that control timing; the PLR text
// is synthetic and the recordings model-generated. Expected strings are the chosen web contract, not native oracles.
const LOADED='Recording loaded. The data properties are shown.';
const LATE='An earlier read finished after it was replaced or cancelled, and was ignored.';
const READ_CANCELLED='Reading cancelled. The current analysis is unchanged.';
type DigestHold={armed:boolean;release:(()=>void)|null};
/** Test-only hold: after armDigest, the next crypto.subtle.digest call waits until releaseDigest. Product code is unchanged. */
const holdDigest=(page:Page)=>page.addInitScript(()=>{
 const w=window as unknown as{__digest:DigestHold};w.__digest={armed:false,release:null};
 const digest=SubtleCrypto.prototype.digest;
 SubtleCrypto.prototype.digest=function(this:SubtleCrypto,algorithm:AlgorithmIdentifier,data:BufferSource){
  if(!w.__digest.armed)return digest.call(this,algorithm,data);
  w.__digest.armed=false;const self=this;
  return new Promise<ArrayBuffer>((resolve,reject)=>{w.__digest.release=()=>{digest.call(self,algorithm,data).then(resolve,reject);};});
 };
});
const armDigest=(page:Page)=>page.evaluate(()=>{(window as unknown as{__digest:DigestHold}).__digest.armed=true;});
const digestHeld=(page:Page)=>expect.poll(()=>page.evaluate(()=>(window as unknown as{__digest:DigestHold}).__digest.release!==null)).toBe(true);
const releaseDigest=(page:Page)=>page.evaluate(()=>{const d=(window as unknown as{__digest:DigestHold}).__digest,r=d.release!;d.release=null;r();});
/** A scripted change with any text (forceChange always delivers the valid PLR). */
const forceFile=(page:Page,name:string,text:string)=>id(page,'pulsar-file').evaluate((el:HTMLInputElement,[body,n])=>{
 const dt=new DataTransfer();dt.items.add(new File([body],n));el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));
},[text,name] as const);
/** Unsaved memory data with one confirmed measurement. */
async function memoryWithMeasurement(page:Page){
 await startApp(page);await setupReceiver(page);await captureToIdentify(page);const points=await identifyToAnalysis(page);
 await recordManual(page,'kept');await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 return points;
}
/** The real Load click → the unsaved-data prompt → No: resolves with the browser file chooser. */
async function loadNo(page:Page){
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 const chooser=page.waitForEvent('filechooser');await id(page,'pulsar-load-no').click();return chooser;
}
/** Ordinary pointer presses at the chooser label's text and at the (disabled) input itself, by page coordinates. */
async function pressDisabledChooser(page:Page){
 const input=id(page,'pulsar-file');
 const text=await input.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el.parentElement!.firstChild!);const b=range.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};});
 const box=(await input.boundingBox())!;
 await page.mouse.click(text.x,text.y);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await flush(page);
}

test('R-RX11: during a held memory → PLR read the chooser is disabled through contents and SHA-256; presses open nothing; the file loads once',async({page},info)=>{
 await holdReads(page);await holdDigest(page);
 const points=await memoryWithMeasurement(page);
 const input=id(page,'pulsar-file'),load=id(page,'pulsar-load-dialog');
 await(await loadNo(page)).setFiles(plrFile('held-gate.plr'));await held(page,'held-gate.plr');
 await expect(id(page,'pulsar-reading')).toBeVisible();await expect(input).toBeDisabled();
 const chooserEnabledWhileReading=await input.isEnabled();
 const status=await id(page,'pulsar-status').textContent();
 let choosers=0;page.on('filechooser',()=>{choosers++;});
 // Contents phase: ordinary presses on the disabled label and input open no prompt, picker or modal and write no status.
 await pressDisabledChooser(page);
 await expect(load).toHaveCount(0);await expect(page.locator('dialog:modal')).toHaveCount(0);
 await expect(id(page,'pulsar-status')).toHaveText(status!);expect(choosers).toBe(0);
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 await info.attach('rrx11-chooser-disabled.png',{body:await page.screenshot({path:info.outputPath('rrx11-chooser-disabled.png'),fullPage:true}),contentType:'image/png'});
 // An unsaved scripted change without a new one-shot grant is refused as before; the read continues.
 await forceChange(page,'other.plr');await flush(page);
 await expect(id(page,'pulsar-status')).toHaveText(PROMPT_FIRST);await expect(id(page,'pulsar-reading')).toBeVisible();await expect(input).toBeDisabled();
 // SHA-256 phase: the contents are read, the digest is held; the gate still holds.
 await armDigest(page);await release(page,'held-gate.plr');await digestHeld(page);await flush(page);
 await expect(id(page,'pulsar-reading')).toBeVisible();await expect(input).toBeDisabled();
 await pressDisabledChooser(page);
 await expect(load).toHaveCount(0);await expect(page.locator('dialog:modal')).toHaveCount(0);expect(choosers).toBe(0);
 await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 await releaseDigest(page);await expect(id(page,'pulsar-reading')).toHaveCount(0);await flush(page);
 const probe={
  chooserEnabledWhileReading,
  loadPromptOpenedDuringRead:await load.count(),
  sourceStillMemory:await id(page,'pulsar-memory').count(),
  loadedIncomingFile:await id(page,'pulsar-file-name').filter({hasText:'held-gate.plr'}).count(),
  promptStillOpen:await page.locator('dialog:modal').count(),
 };
 await info.attach('rrx11-probe.json',{body:JSON.stringify(probe,null,1),contentType:'application/json'});
 expect(probe).toEqual({chooserEnabledWhileReading:false,loadPromptOpenedDuringRead:0,sourceStillMemory:0,loadedIncomingFile:1,promptStillOpen:0});
 await expect(id(page,'pulsar-file-name')).toHaveText('held-gate.plr');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 await expect(id(page,'pulsar-bytes')).toHaveText(String(Buffer.byteLength(PLR,'latin1')));
 await expect(id(page,'pulsar-status')).toHaveText(LOADED);await expect(id(page,'pulsar-properties')).toBeVisible();
 await expect(id(page,'pulsar-prop-object')).toHaveText('SYNTH');
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 expect((await download(page,id(page,'pulsar-download'))).equals(Buffer.from(PLR,'latin1'))).toBe(true);
 await expect(input).toBeEnabled();expect(choosers).toBe(0);
});

type Reentry={calls:number;enabledAtClick:boolean|null;prevented:boolean|null};
/** SYNTHETIC timing control, not original runtime: the only arrayBuffer wrapper of its test (no holdReads). The first
 *  arrayBuffer() of the File named `target` runs synchronously inside onFile, after setReading but before React renders the
 *  disabled chooser. From inside that call it records whether the input is still enabled, clicks it once, records whether
 *  the click's default was prevented (window bubble listener), and then holds the read in `__held` (same shape as holdReads,
 *  so held/release apply). Other files and later calls delegate to the original arrayBuffer untouched. */
const holdReentry=(page:Page,target:string)=>page.addInitScript(name=>{
 type Hold={release:()=>void};const w=window as unknown as{__held:Map<string,Hold>;__reentry:Reentry};
 w.__held=new Map();w.__reentry={calls:0,enabledAtClick:null,prevented:null};
 const read=Blob.prototype.arrayBuffer;
 Blob.prototype.arrayBuffer=function(this:Blob){
  if(!(this instanceof File&&this.name===name))return read.call(this);
  if(++w.__reentry.calls>1)return read.call(this);
  const input=document.querySelector<HTMLInputElement>('[data-testid="pulsar-file"]');
  if(input){
   w.__reentry.enabledAtClick=!input.disabled;
   const observe=(ev:Event)=>{if(ev.target===input)w.__reentry.prevented=ev.defaultPrevented;};
   window.addEventListener('click',observe);
   try{input.click();}finally{window.removeEventListener('click',observe);}
  }
  const self=this;return new Promise<ArrayBuffer>((resolve,reject)=>w.__held.set(name,{release:()=>{read.call(self).then(resolve,reject);}}));
 };
},target);
const reentry=(page:Page)=>page.evaluate(()=>(window as unknown as{__reentry:Reentry}).__reentry);

test('R-RX11 SYNTHETIC File.arrayBuffer reentry before render: a click on the still-enabled chooser is refused by the click-time check',async({page})=>{
 // Not a native, natural or ordinary-click race: the test's own arrayBuffer wrapper clicks the input from inside onFile's
 // first read call, before React has committed the disabled chooser, so the click reaches the handler with the DOM input
 // still enabled. Only the latest-ref read check stands between that click and the unsaved-data Load prompt.
 await holdReentry(page,'held-reentry.plr');
 const points=await memoryWithMeasurement(page);
 const input=id(page,'pulsar-file'),load=id(page,'pulsar-load-dialog');
 const chooser=await loadNo(page);
 const status=await id(page,'pulsar-status').textContent();
 let choosers=0;page.on('filechooser',()=>{choosers++;});
 await chooser.setFiles(plrFile('held-reentry.plr'));await held(page,'held-reentry.plr');
 // The click ran on an enabled DOM input and was refused (default prevented by the handler).
 expect(await reentry(page)).toEqual({calls:1,enabledAtClick:true,prevented:true});
 await flush(page);
 await expect(load).toHaveCount(0);await expect(page.locator('dialog:modal')).toHaveCount(0);expect(choosers).toBe(0);
 await expect(id(page,'pulsar-status')).toHaveText(status!);
 await expect(id(page,'pulsar-memory')).toBeVisible();await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // Now rendered: the chooser is disabled for the rest of the read.
 await expect(id(page,'pulsar-reading')).toBeVisible();await expect(input).toBeDisabled();
 await release(page,'held-reentry.plr');await expect(id(page,'pulsar-reading')).toHaveCount(0);await flush(page);
 await expect(id(page,'pulsar-file-name')).toHaveText('held-reentry.plr');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 await expect(id(page,'pulsar-bytes')).toHaveText(String(Buffer.byteLength(PLR,'latin1')));
 await expect(id(page,'pulsar-status')).toHaveText(LOADED);await expect(id(page,'pulsar-properties')).toBeVisible();
 await expect(id(page,'pulsar-memory')).toHaveCount(0);await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 expect(await reentry(page)).toEqual({calls:1,enabledAtClick:true,prevented:true});
 await expect(load).toHaveCount(0);await expect(input).toBeEnabled();expect(choosers).toBe(0);
});

test('R-RX11 imported file: a newer scripted read still wins; Cancel reading and a read error lift the gate; focus returns to the chooser only from the page body',async({page},info)=>{
 await holdReads(page);await startApp(page);await toAnalysis(page);
 const input=id(page,'pulsar-file');
 await input.setInputFiles(plrFile('route.plr'));await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 // Latest read wins, unchanged: the older held read finishes late and is ignored.
 await input.setInputFiles(plrFile('held-old.plr'));await held(page,'held-old.plr');await expect(input).toBeDisabled();
 await forceChange(page,'fresh-new.plr');
 await expect(id(page,'pulsar-file-name')).toHaveText('fresh-new.plr');await expect(id(page,'pulsar-reading')).toHaveCount(0);await expect(input).toBeEnabled();
 await release(page,'held-old.plr');await flush(page);
 await expect(id(page,'pulsar-status')).toHaveText(LATE);await expect(id(page,'pulsar-file-name')).toHaveText('fresh-new.plr');
 // Cancel reading lifts the gate before another file is chosen.
 await input.setInputFiles(plrFile('held-cancel.plr'));await held(page,'held-cancel.plr');await expect(input).toBeDisabled();
 await id(page,'pulsar-cancel-read').click();
 await expect(input).toBeEnabled();await expect(id(page,'pulsar-status')).toHaveText(READ_CANCELLED);
 await release(page,'held-cancel.plr');await flush(page);
 await expect(id(page,'pulsar-status')).toHaveText(LATE);await expect(id(page,'pulsar-file-name')).toHaveText('fresh-new.plr');
 // A read error that started on the focused chooser lifts the gate and returns focus there.
 // TEST CONTROL: the focus owner while the chooser is disabled is recorded as observed; if it is not already the page body,
 // the test blurs it, so the release starts from unowned body focus and the return to the chooser is the product's one-shot
 // request, not focus the browser kept. This is no claim about where every browser leaves focus on a disabled input.
 await input.focus();await expect(input).toBeFocused();
 await forceFile(page,'held-bad.plr','not a recording\r\n');await held(page,'held-bad.plr');await expect(input).toBeDisabled();
 const pendingFocus=await page.evaluate(()=>{const a=document.activeElement;return a===null?'none':a===document.body?'body':(a as HTMLElement).dataset.testid??a.tagName;});
 await info.attach('rrx11-focus-while-reading.json',{body:JSON.stringify({pendingFocus}),contentType:'application/json'});
 if(pendingFocus!=='body')await page.evaluate(()=>{(document.activeElement as HTMLElement|null)?.blur();});
 await expect.poll(()=>page.evaluate(()=>document.activeElement===document.body)).toBe(true);await expect(input).not.toBeFocused();
 await release(page,'held-bad.plr');
 await expect(id(page,'pulsar-rejection')).toContainText('Recording not loaded: held-bad.plr.');
 await expect(input).toBeEnabled();await expect(input).toBeFocused();
 await expect(id(page,'pulsar-file-name')).toHaveText('fresh-new.plr');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 // A control the learner focused during the read keeps focus after the error.
 await input.focus();await forceFile(page,'held-bad-other.plr','not a recording\r\n');await held(page,'held-bad-other.plr');
 const other=id(page,'pulsar-properties-open');await other.focus();await expect(other).toBeFocused();
 await release(page,'held-bad-other.plr');
 await expect(id(page,'pulsar-rejection')).toContainText('Recording not loaded: held-bad-other.plr.');
 await expect(input).toBeEnabled();await flush(page);await expect(other).toBeFocused();
 await expect(id(page,'pulsar-file-name')).toHaveText('fresh-new.plr');
});

test('R-RX11 size refusal before the first await: the same oversize file twice from the focused chooser queues no refocus; Dismiss leaves focus on the page body',async({page})=>{
 // The size check runs synchronously before any read: the chooser is never rendered disabled, so the refusal requests no
 // focus restoration. A second identical rejection commits nothing; a stale request would focus the chooser on the next,
 // unrelated commit (the Dismiss below). Synthetic zero bytes over the bound, no real or original file.
 await startApp(page);await toAnalysis(page);
 const input=id(page,'pulsar-file');
 await input.setInputFiles(plrFile('route.plr'));await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 await id(page,'pulsar-properties-close').click();await expect(id(page,'pulsar-properties')).toHaveCount(0);
 await recordManual(page,'kept');await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // Counts delivered change events, so the second (identical) refusal is known to have run.
 await input.evaluate(el=>{const w=window as unknown as{__changes:number};w.__changes=0;el.addEventListener('change',()=>{w.__changes++;},true);});
 const big={name:'big-same.plr',mimeType:'application/octet-stream',buffer:Buffer.alloc(2*1024*1024+1)};
 await input.focus();await expect(input).toBeFocused();
 await input.setInputFiles(big);await flush(page);
 const rejection=id(page,'pulsar-rejection');await expect(rejection).toContainText('Recording not loaded: big-same.plr.');
 const first=await rejection.textContent();
 await expect(input).toBeFocused();
 await input.setInputFiles(big);await flush(page);
 expect(await page.evaluate(()=>(window as unknown as{__changes:number}).__changes)).toBe(2);
 await expect(rejection).toHaveText(first!);await expect(rejection).toHaveCount(1);
 await expect(input).toBeEnabled();await expect(id(page,'pulsar-reading')).toHaveCount(0);await expect(input).toBeFocused();
 await expect(id(page,'pulsar-file-name')).toHaveText('route.plr');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 await expect(id(page,'pulsar-bytes')).toHaveText(String(Buffer.byteLength(PLR,'latin1')));
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // Dismiss takes focus, then its removal leaves focus on the body; no queued request moves it to the chooser.
 await rejection.locator('button').click();await flush(page);
 await expect(rejection).toHaveCount(0);
 await expect(input).not.toBeFocused();
 await expect.poll(()=>page.evaluate(()=>document.activeElement===document.body)).toBe(true);
 await expect(id(page,'pulsar-file-name')).toHaveText('route.plr');await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 expect((await download(page,id(page,'pulsar-download'))).equals(Buffer.from(PLR,'latin1'))).toBe(true);
});
