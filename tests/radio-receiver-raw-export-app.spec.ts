import {test,expect,type Locator,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
// Actual App flows of R-RX14 (docs/PULSAR-RAW-EXPORT.md): Record → Receive → Stop → Identify → Properties → Save No → Pulsar
// Analysis → "Download capture as .PLR". The recording is a model-generated capture, not an observation; the catalog is
// synthetic. Expected bytes and strings are the chosen web contract (toFixed digits, 0.0 inactive cells, CR LF), not a
// native writer oracle. Helpers are copied from tests/radio-receiver-record-app.spec.ts; the only test-only hooks are the
// read hold and the anchor/object-URL wrappers below, which control timing and failures without changing product code.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();const d=await next;return {name:d.suggestedFilename(),bytes:await readFile((await d.path())!)};}
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
const holdReads=(page:Page)=>page.addInitScript(()=>{
 type Hold={release:()=>void};const w=window as unknown as{__held:Map<string,Hold>};w.__held=new Map();
 const read=Blob.prototype.arrayBuffer;
 Blob.prototype.arrayBuffer=function(this:Blob){
  if(!(this instanceof File&&this.name.startsWith('held-')))return read.call(this);
  const self=this,name=this.name;return new Promise<ArrayBuffer>((resolve,reject)=>w.__held.set(name,{release:()=>{read.call(self).then(resolve,reject);}}));
 };
});
const held=(page:Page,name:string)=>expect.poll(()=>page.evaluate(n=>(window as unknown as{__held:Map<string,unknown>}).__held.has(n),name)).toBe(true);
/** The test's own probe of the browser API (not the product's data-support): secure context, a callable
 *  showSaveFilePicker and FileSystemFileHandle.prototype.createWritable. No picker is called. */
const saveCapable=(page:Page)=>page.evaluate(()=>window.isSecureContext===true&&typeof (window as {showSaveFilePicker?:unknown}).showSaveFilePicker==='function'
 &&typeof FileSystemFileHandle==='function'&&'createWritable' in FileSystemFileHandle.prototype);

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
const UT='2026-10-24T12:00:00';
const FILE='openvireo-model-capture.PLR';
const ANALYSIS_BUSY='Record refused: Pulsar Analysis has an open dialog or a file being read. Finish it first; nothing was erased.';

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
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
}
const toAnalysis=async(page:Page)=>{await nav(page,'Radio data').click();await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);};
const toRadio=async(page:Page)=>{await nav(page,'Radio telescope').click();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);};
const finish=(page:Page)=>id(page,'receiver-record-finish');
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}
/** Record, Receive, a short capture, Stop, Identify (optional name), Properties OK, Save No: the analysis shows the memory capture. */
async function captureToAnalysis(page:Page,name?:string){
 await startApp(page);await setupReceiver(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await flush(page);await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
 await untilFinished(page);await expect(finish(page)).toHaveAttribute('data-stage','identify');
 if(name!==undefined)await id(page,'receiver-record-identify-input').fill(name);
 await id(page,'receiver-record-identify-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','properties');
 const points=(await id(page,'receiver-record-prop-points').textContent())!;
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await id(page,'receiver-record-save-no').click();
 await expect(id(page,'pulsar-memory')).toBeVisible();await flush(page);
 return points;
}
const lines=(bytes:Buffer)=>bytes.toString('latin1').split('\r\n');
const SAMPLE_ROW=/^-?\d+\.\d{3},-?\d+\.\d{3},-?\d+\.\d{3}$/;

test('Download capture as .PLR: Cancel default, exact layout of the capture, nothing marked saved; the file re-imports as ordinary file data',async({page})=>{
 const points=await captureToAnalysis(page,'PSR B2358+38');
 const gain=(await id(page,'pulsar-prop-receiver-1').locator('td').nth(1).textContent())!;
 const start=(await id(page,'pulsar-prop-start').textContent())!;
 await expect(id(page,'pulsar-prop-interval')).toHaveText('10.00');
 const opener=id(page,'pulsar-raw-export');await expect(opener).toBeEnabled();
 await expect(id(page,'pulsar-raw-export-note')).toContainText('It is not the original Save');
 await opener.click();
 const dialog=id(page,'pulsar-raw-export-dialog');await expect(dialog).toBeVisible();
 await expect(id(page,'pulsar-raw-export-cancel')).toBeFocused();
 await expect(page.locator('.plr-main')).toHaveAttribute('inert','');
 await expect(id(page,'pulsar-raw-export-scope')).toHaveText(new RegExp(`^${points} rows of recording \\d+, named “PSR B2358\\+38”, with 1 recorded receivers\\.$`));
 await expect(id(page,'pulsar-raw-export-origin')).toContainText('model-generated');await expect(id(page,'pulsar-raw-export-origin')).toContainText(FILE);
 await expect(id(page,'pulsar-raw-export-origin')).toContainText('without this origin');
 await expect(id(page,'pulsar-raw-export-inactive')).toContainText('Receivers 2, 3 were not recorded');
 await expect(id(page,'pulsar-raw-export-consequence')).toContainText('not the original Save');
 await expect(id(page,'pulsar-raw-export-loss-samples')).toContainText(`of ${Number(points)*3} samples change`);
 await expect(id(page,'pulsar-raw-export-download')).toBeEnabled();
 const got=await download(page,id(page,'pulsar-raw-export-download'));
 expect(got.name).toBe(FILE);
 const text=got.bytes.toString('latin1'),l=lines(got.bytes);
 expect(text.endsWith('\r\n')).toBe(true);expect(text.replace(/\r\n/g,'')).not.toMatch(/[\r\n]/);
 expect(l.pop()).toBe('');expect(l.length).toBe(Number(points)+4);
 expect(l[0]).toBe("'PSR B2358+38',100,0");
 expect(l[1]).toMatch(/^600\.00,0\.0,0\.0$/);
 expect(l[2]).toBe(`${gain},0.0,0.0`);
 expect(l[3]).toBe(`${start},0.01000`);
 for(const row of l.slice(4))expect(row).toMatch(SAMPLE_ROW);
 await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
 await expect(id(page,'pulsar-status')).toContainText(`Download of ${FILE} requested with ${points} rows.`);
 // Nothing was marked saved: Properties, the rows, the receiver and Load questions are unchanged.
 await expect(id(page,'pulsar-prop-file')).toHaveText('Data Not Written to File');await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 await expect(id(page,'pulsar-download')).toHaveCount(0);await expect(id(page,'pulsar-sha')).toHaveCount(0);
 await toRadio(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','unsaved');
 // The Download left the capture unsaved, so Record still asks the unsaved question. R-RX16 Yes is available where the test's
 // probe finds the browser API (either branch is valid); it is not pressed here.
 const capable=await saveCapable(page);
 await expect(id(page,'receiver-record-yes-reason')).toHaveAttribute('data-support',capable?'ok':/^(insecure-context|no-api)$/);
 if(capable)await expect(id(page,'receiver-record-yes')).toBeEnabled();else await expect(id(page,'receiver-record-yes')).toBeDisabled();
 await expect(id(page,'receiver-record-yes-reason')).toContainText('Web default button: Cancel');
 await id(page,'receiver-record-cancel').click();await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await toAnalysis(page);await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 // Round trip: the Load question still asks (unsaved); No → the downloaded bytes load as an ordinary file.
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 // R-RX18: Yes (verified Save first) follows the same probe; it is not pressed here.
 await expect(id(page,'pulsar-load-yes-reason')).toHaveAttribute('data-support',capable?'ok':/^(insecure-context|no-api)$/);
 if(capable)await expect(id(page,'pulsar-load-yes')).toBeEnabled();else await expect(id(page,'pulsar-load-yes')).toBeDisabled();
 const chooser=page.waitForEvent('filechooser');await id(page,'pulsar-load-no').click();
 await (await chooser).setFiles({name:FILE,mimeType:'application/octet-stream',buffer:got.bytes});
 await expect(id(page,'pulsar-sha')).toHaveText(sha(got.bytes));await expect(id(page,'pulsar-file-name')).toHaveText(FILE);
 await expect(id(page,'pulsar-bytes')).toHaveText(String(got.bytes.byteLength));
 await expect(id(page,'pulsar-memory')).toHaveCount(0);await expect(id(page,'pulsar-raw-export')).toHaveCount(0);
 await expect(id(page,'pulsar-prop-points')).toHaveText(points);await expect(id(page,'pulsar-prop-object')).toHaveText('PSR B2358+38');
 // The imported file's exact-byte Download is unchanged.
 const again=await download(page,id(page,'pulsar-download'));
 expect(again.name).toBe(FILE);expect(again.bytes.equals(got.bytes)).toBe(true);
});

test('gates: a hidden-route dialog refuses arming and reopens; a held read disables the opener; a capture lease removes it',async({page})=>{
 await holdReads(page);
 const points=await captureToAnalysis(page);
 const opener=id(page,'pulsar-raw-export'),dialog=id(page,'pulsar-raw-export-dialog');
 await opener.click();await expect(dialog).toBeVisible();
 // Hidden route: the dialog closes, its session stays modal for the shared data, so arming is refused.
 await page.goBack();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);
 await id(page,'receiver-record').click();
 await expect(id(page,'receiver-status-0')).toHaveText(ANALYSIS_BUSY);await expect(id(page,'receiver-record-disp')).toHaveText('Off');
 await page.goForward();await expect(dialog).toBeVisible();await expect(id(page,'pulsar-raw-export-cancel')).toBeFocused();
 const got=await download(page,id(page,'pulsar-raw-export-download'));
 expect(got.name).toBe(FILE);expect(lines(got.bytes).length).toBe(Number(points)+5);
 await expect(dialog).toHaveCount(0);
 // A held read: the opener is disabled and a scripted click opens nothing and writes no status.
 await id(page,'pulsar-file').click();await expect(id(page,'pulsar-load-dialog')).toBeVisible();
 const chooser=page.waitForEvent('filechooser');await id(page,'pulsar-load-no').click();
 await (await chooser).setFiles({name:'held-raw.plr',mimeType:'application/octet-stream',buffer:Buffer.from(PLR,'latin1')});await held(page,'held-raw.plr');
 await expect(id(page,'pulsar-reading')).toBeVisible();await expect(opener).toBeDisabled();
 const status=await id(page,'pulsar-status').textContent();
 await opener.evaluate(el=>(el as HTMLButtonElement).click());await flush(page);
 await expect(dialog).toHaveCount(0);await expect(page.locator('dialog:modal')).toHaveCount(0);await expect(id(page,'pulsar-status')).toHaveText(status!);
 await id(page,'pulsar-cancel-read').click();await expect(opener).toBeEnabled();await expect(id(page,'pulsar-memory-rows')).toHaveText(points);
 // A capture lease (Record armed after the erase) clears the data: no opener is rendered.
 await toRadio(page);
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','unsaved');
 await id(page,'receiver-record-no').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','erase');
 await id(page,'receiver-record-ok').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await toAnalysis(page);
 await expect(id(page,'pulsar-leased')).toBeVisible();await expect(id(page,'pulsar-raw-export')).toHaveCount(0);await expect(id(page,'pulsar-memory')).toHaveCount(0);
});

type Hooks={reenter:boolean;failNext:boolean;clicks:number};
/** Test-only: the anchor click of a raw download can reenter Download and Cancel synchronously, and createObjectURL can throw once. */
const instrument=(page:Page)=>page.addInitScript(file=>{
 const w=window as unknown as{__raw:Hooks};w.__raw={reenter:false,failNext:false,clicks:0};
 const click=HTMLAnchorElement.prototype.click;
 HTMLAnchorElement.prototype.click=function(this:HTMLAnchorElement){
  if(this.download===file){
   w.__raw.clicks++;
   if(w.__raw.reenter){
    w.__raw.reenter=false;
    document.querySelector<HTMLButtonElement>('[data-testid="pulsar-raw-export-download"]')?.click();
    document.querySelector<HTMLButtonElement>('[data-testid="pulsar-raw-export-cancel"]')?.click();
   }
  }
  return click.call(this);
 };
 const create=URL.createObjectURL;
 URL.createObjectURL=function(obj:Blob|MediaSource){if(w.__raw.failNext){w.__raw.failNext=false;throw new Error('test-only failure');}return create.call(URL,obj);};
},FILE);
const hooks=(page:Page)=>page.evaluate(()=>(window as unknown as{__raw:Hooks}).__raw);
const setHook=(page:Page,key:'reenter'|'failNext')=>page.evaluate(k=>{(window as unknown as{__raw:Hooks}).__raw[k]=true;},key);

test('a failed browser request keeps the dialog for a retry; reentrant Download and Cancel inside the link click do nothing',async({page})=>{
 await instrument(page);
 const points=await captureToAnalysis(page);
 let downloads=0;page.on('download',()=>{downloads++;});
 const opener=id(page,'pulsar-raw-export'),dialog=id(page,'pulsar-raw-export-dialog');
 await opener.click();await expect(dialog).toBeVisible();
 await setHook(page,'failNext');await id(page,'pulsar-raw-export-download').click();await flush(page);
 await expect(id(page,'pulsar-raw-export-failure')).toBeVisible();await expect(dialog).toBeVisible();
 expect((await hooks(page)).clicks).toBe(0);expect(downloads).toBe(0);
 const retry=await download(page,id(page,'pulsar-raw-export-download'));
 expect(retry.name).toBe(FILE);expect((await hooks(page)).clicks).toBe(1);
 await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
 await expect(id(page,'pulsar-status')).toContainText(`requested with ${points} rows`);
 // Reentry: the click handler fires Download and Cancel synchronously once; exactly one link click and one download.
 await opener.click();await expect(dialog).toBeVisible();
 await setHook(page,'reenter');
 const once=await download(page,id(page,'pulsar-raw-export-download'));
 expect(once.bytes.equals(retry.bytes)).toBe(true);
 await flush(page);
 expect((await hooks(page)).clicks).toBe(2);expect(downloads).toBe(2);
 await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
 await expect(id(page,'pulsar-status')).toContainText(`requested with ${points} rows`);
 await expect(id(page,'pulsar-prop-file')).toHaveText('Data Not Written to File');
});

test('keyboard: Cancel default, Tab wraps, Escape returns focus; a 40-character name fits at 1440, 375 and 320',async({page},info)=>{
 const name='X'.repeat(40);await captureToAnalysis(page,name);
 const opener=id(page,'pulsar-raw-export'),dialog=id(page,'pulsar-raw-export-dialog');
 await opener.focus();await page.keyboard.press('Enter');await expect(dialog).toBeVisible();
 const cancel=id(page,'pulsar-raw-export-cancel'),dl=id(page,'pulsar-raw-export-download');
 await expect(cancel).toBeFocused();
 await page.keyboard.press('Tab');await expect(dl).toBeFocused();
 await page.keyboard.press('Tab');await expect(cancel).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(dl).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(cancel).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
 await expect(id(page,'pulsar-status')).toHaveText('Download as .PLR cancelled. Nothing was downloaded.');
 await page.keyboard.press('Enter');await expect(dialog).toBeVisible();await expect(cancel).toBeFocused();
 await expect(id(page,'pulsar-raw-export-scope')).toContainText(name);
 for(const [width,height] of [[1440,1050],[375,812],[320,568]] as const){
  await page.setViewportSize({width,height});await flush(page);await noOverflow(page);
  expect(await dialog.evaluate(el=>el.scrollWidth-el.clientWidth),`dialog overflow at ${width}`).toBeLessThanOrEqual(0);
  await info.attach(`raw-export-${width}.png`,{body:await page.screenshot({path:info.outputPath(`raw-export-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
 // Enter on the focused Cancel closes without a download.
 let downloads=0;page.on('download',()=>{downloads++;});
 await page.keyboard.press('Enter');await expect(dialog).toHaveCount(0);await flush(page);expect(downloads).toBe(0);
});
