import {test,expect,type Browser,type CDPSession,type Locator,type Page,type TestInfo} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Actual App flows of R-RX5 Align (docs/RADIO-RECEIVER-ALIGN.md) on the #radio-control route: the live Align button and
// indicator, the per-window Move up/down controls, the card order (data-order and the DOM order of the cards), no remount on a
// reorder, the Add reset with the stale indicator, close/re-add and main reopen, Receive/Stop/Record with the finish dialogs,
// the close box and the Record prompt, a touch drag ended by a dispatched second input, a hidden route, a project operation,
// viewports, keyboard, Save investigation bytes and reload. No harness and no product debug hook: only the rendered App, its
// data attributes, browser history, the browser clock control, the test-only read hold, test-only expando/listener probes
// and Chromium CDP touch input (synthetic browser input, not OS multitouch). The catalog and PLR text are synthetic fixtures,
// never CLEA observations; expected strings are the chosen web contract, not native oracles. Align arranges windows only.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const restore=(page:Page,name:string,text:string)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text,'utf8')});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json=any;
/** Phase 1 item 1.5: a file written while Radio is mounted is v23, which wraps the unchanged v≤22 investigation in `base` and
 * keeps the Radio part separately (with its consistency digest); an older file has no Radio part. Returns both parts. */
function investigationParts(saved:Buffer):{base:Json;radio:Json}{
 const f:Json=JSON.parse(saved.toString('utf8'));
 if(f.version!==23){expect(f.version).toBeLessThanOrEqual(22);expect(Object.hasOwn(f,'radio')).toBe(false);return {base:f,radio:null};}
 expect(Object.keys(f).sort()).toEqual(['base','format','numericalPolicy','radio','radioDigestSHA256','radioPolicy','version']);
 expect(f.numericalPolicy).toBe('Number_x87_equivalence_unvalidated');expect(f.radioPolicy).toBe('OpenVireo radio investigation 1');
 expect(f.base.version).toBeLessThanOrEqual(22);
 expect(createHash('sha256').update(JSON.stringify(f.radio)).digest('hex')).toBe(f.radioDigestSHA256);
 return {base:f.base,radio:f.radio};
}
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
const CATALOG=[{primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'},{primaryName:'J1200-3000',legacyName:'B1157-29',ra:'180',dec:'-30'}].map(line).join('\r\n')+'\r\n';
const PLR=["'SYNTH',25,1",'400.00,1400.00,0','1.0,2.0,1.0','50000.5,0.01',...Array.from({length:50},(_,i)=>`${i},10,0`)].join('\r\n')+'\r\n';
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
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-heading-0')).toBeFocused();
}
const toAnalysis=async(page:Page)=>{await nav(page,'Radio data').click();await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);};
const toRadio=async(page:Page)=>{await nav(page,'Radio telescope').click();await expect(id(page,'receiver-workspace')).toBeVisible();await flush(page);};
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}
const finish=(page:Page)=>id(page,'receiver-record-finish');
const cards=(page:Page)=>page.locator('[data-testid^="receiver-card-"]');
/** The card order as the session reports it (data-order) and as the DOM actually has it (top to bottom). */
async function expectOrder(page:Page,order:string){
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-order',order);
 await expect.poll(()=>cards(page).evaluateAll(els=>els.map(e=>e.getAttribute('data-testid')!.replace('receiver-card-','')).join(','))).toBe(order);
}
const align=(page:Page)=>id(page,'receiver-align');
const pressed=(page:Page,on:boolean)=>expect(align(page)).toHaveAttribute('aria-pressed',String(on));
/** Test-only expando on each base canvas element: a remount would create elements without it. */
const tagCanvases=(page:Page,slots:readonly number[])=>page.evaluate(s=>{for(const k of s)(document.querySelector(`[data-testid="receiver-canvas-${k}"]`) as HTMLCanvasElement&{__rx5?:number}).__rx5=k;},slots);
const canvasTags=(page:Page,slots:readonly number[])=>page.evaluate(s=>s.map(k=>(document.querySelector(`[data-testid="receiver-canvas-${k}"]`) as HTMLCanvasElement&{__rx5?:number}).__rx5??null),slots);
const canvasPixels=(page:Page,slots:readonly number[])=>page.evaluate(s=>s.map(k=>(document.querySelector(`[data-testid="receiver-canvas-${k}"]`) as HTMLCanvasElement).toDataURL()),slots);
const readout=(page:Page,slot:number)=>id(page,`receiver-mark-readout-${slot}`);
async function expectMarks(page:Page,slot:number,first:number,second:number){
 await expect(readout(page,slot)).toHaveAttribute('data-mark-first',String(first));await expect(readout(page,slot)).toHaveAttribute('data-mark-second',String(second));
}
async function columnPoint(page:Page,slot:number,column:number){
 const overlay=id(page,`receiver-overlay-${slot}`);await overlay.scrollIntoViewIfNeeded();
 const box=(await overlay.boundingBox())!;return {x:box.x+(column+0.5)*box.width/401,y:box.y+box.height/2};
}
type Point={x:number;y:number;id:number};
const touch=(cdp:CDPSession,type:'touchStart'|'touchMove'|'touchEnd'|'touchCancel',points:readonly Point[])=>
 cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({x:p.x,y:p.y,id:p.id}))});
const finger=async(page:Page,slot:number,column:number,fingerId:number):Promise<Point>=>{const p=await columnPoint(page,slot,column);return {x:p.x,y:p.y,id:fingerId};};
const newContext=(browser:Browser,info:TestInfo,hasTouch=false)=>browser.newContext({baseURL:info.project.use.baseURL,viewport:info.project.use.viewport,hasTouch});

test('Align on/off with 0, 1 and 2 channel windows: Off moves nothing at once, Off reorders without remount, On snaps back and re-stacks',async({page})=>{
 await startApp(page);await setupReceiver(page);
 const disp=id(page,'receiver-align-disp');
 // No channel window: Align is live and on, the single card is at both edges.
 await expect(align(page)).toBeEnabled();await pressed(page,true);await expect(disp).toHaveText('Yes');
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-align','on');await expectOrder(page,'0');
 await expect(id(page,'receiver-align-note')).toContainText('Align is on');
 await expect(id(page,'receiver-window-position-0')).toHaveText('Window 1 of 1 in the column.');
 for(const d of ['up','down'])await expect(id(page,`receiver-move-${d}-0`)).toHaveAttribute('aria-disabled','true');
 await expect(id(page,'receiver-move-up-0')).toHaveAccessibleName('Move up: Receiver 1 window');
 await id(page,'receiver-move-up-0').click({force:true});
 await expect(id(page,'receiver-status-0')).toHaveText('This window is already at the edge of the column.');
 await align(page).click();await pressed(page,false);await expect(disp).toHaveText('No');await expect(align(page)).toBeFocused();
 await expect(id(page,'receiver-status-0')).toHaveText('Align off: the windows stay where they are.');
 await expect(id(page,'receiver-align-note')).toHaveAttribute('data-on','false');await expect(id(page,'receiver-align-stale')).toHaveCount(0);
 await align(page).click();await pressed(page,true);await expect(disp).toHaveText('Yes');
 await expect(id(page,'receiver-status-0')).toHaveText('Align on: the channel windows are stacked below the main receiver window.');
 // One channel window: On snaps a move back at once; Off moves nothing until a move; On re-stacks.
 await id(page,'receiver-add').click();await expect(id(page,'receiver-heading-1')).toBeFocused();await expectOrder(page,'0,1');
 await expect(id(page,'receiver-card-1')).toHaveAttribute('data-stacked','true');
 await id(page,'receiver-move-up-1').click();await expectOrder(page,'0,1');await expect(id(page,'receiver-move-up-1')).toBeFocused();
 await expect(id(page,'receiver-status-1')).toHaveText('Align is on, so the windows returned to the stack below Receiver 1. Turn Align off to rearrange them.');
 await align(page).click();await pressed(page,false);await expectOrder(page,'0,1');await expect(id(page,'receiver-card-1')).not.toHaveAttribute('data-stacked','true');
 await id(page,'receiver-move-up-1').click();await expectOrder(page,'1,0');await expect(id(page,'receiver-move-up-1')).toBeFocused();
 await expect(id(page,'receiver-status-1')).toHaveText('Receiver 2 window moved to position 1 of 2.');
 await expect(id(page,'receiver-card-1')).toHaveAttribute('data-rank','1');await expect(id(page,'receiver-window-position-0')).toHaveText('Window 2 of 2 in the column.');
 await align(page).click();await pressed(page,true);await expectOrder(page,'0,1');
 // Two channel windows: marks and canvas elements survive a reorder (same instances, no Paint, bitmaps kept).
 await id(page,'receiver-add').click();await expect(id(page,'receiver-heading-2')).toBeFocused();await expectOrder(page,'0,1,2');
 // WCAG 2.2 SC 2.5.3: each Move name starts with its rendered visible text.
 for(const s of [0,1,2])for(const [dir,text] of [['up','Move up'],['down','Move down']] as const){
  const b=id(page,`receiver-move-${dir}-${s}`);await expect(b).toHaveText(text);
  await expect(b).toHaveAccessibleName(new RegExp(`^${(await b.textContent())!}:`));
  await expect(b).toHaveAccessibleName(`${text}: Receiver ${s+1} window`);}
 for(const s of [0,1,2]){const input=id(page,`receiver-mark-position-${s}`);await input.fill(String(50+s*10));await input.press('Enter');await expectMarks(page,s,50+s*10,-1);}
 await tagCanvases(page,[0,1,2]);const pixels=await canvasPixels(page,[0,1,2]);
 const labels=await Promise.all([0,1,2].map(s=>readout(page,s).getAttribute('data-label-first')));
 await align(page).click();await expectOrder(page,'0,1,2');
 await id(page,'receiver-move-up-2').click();await expectOrder(page,'0,2,1');
 await id(page,'receiver-move-up-2').click();await expectOrder(page,'2,0,1');
 await expect(id(page,'receiver-move-up-2')).toBeFocused();await expect(id(page,'receiver-move-up-2')).toHaveAttribute('aria-disabled','true');
 await expect(id(page,'receiver-status-2')).toHaveText('Receiver 3 window moved to position 1 of 3.');
 await id(page,'receiver-move-down-0').click();await expectOrder(page,'2,1,0');await expect(id(page,'receiver-move-down-0')).toBeFocused();
 expect(await canvasTags(page,[0,1,2])).toEqual([0,1,2]);expect(await canvasPixels(page,[0,1,2])).toEqual(pixels);
 for(const s of [0,1,2]){await expectMarks(page,s,50+s*10,-1);await expect(readout(page,s)).toHaveAttribute('data-label-first',labels[s]!);}
 await align(page).click();await pressed(page,true);await expectOrder(page,'0,1,2');await expect(align(page)).toBeFocused();
 expect(await canvasTags(page,[0,1,2])).toEqual([0,1,2]);expect(await canvasPixels(page,[0,1,2])).toEqual(pixels);
});

test('Off then Add turns Align on with a stale No indicator until a main refresh; close the highest and re-add; main close and reopen',async({page})=>{
 await startApp(page);await setupReceiver(page);
 await id(page,'receiver-add').click();await align(page).click();await pressed(page,false);
 await id(page,'receiver-move-up-1').click();await expectOrder(page,'1,0');
 // The child FormCreate writes Align := 1 and the layout stacks; AlignDisp is not refreshed (stored caption).
 await id(page,'receiver-add').click();await expect(id(page,'receiver-heading-2')).toBeFocused();await expectOrder(page,'0,1,2');
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-align','on');await pressed(page,true);
 await expect(id(page,'receiver-align-disp')).toHaveText('No');
 await expect(id(page,'receiver-align-stale')).toContainText('The Align indicator still shows No until the main window\'s next parameter refresh');
 await expect(id(page,'receiver-status-0')).toHaveText('Channel window added. Creating it turned Align on and stacked the windows, as the original window creation does. In this web version the Align indicator is not refreshed until the main window\'s next parameter refresh; whether the original refreshes it sooner is not established.');
 await id(page,'receiver-vertical-up-0').click();await expect(id(page,'receiver-align-disp')).toHaveText('Yes');await expect(id(page,'receiver-align-stale')).toHaveCount(0);
 // Off, rearrange, close the highest channel and add it again: Align on and stacked again.
 await align(page).click();await id(page,'receiver-move-up-2').click();await id(page,'receiver-move-up-2').click();await expectOrder(page,'2,0,1');
 // WEB-RX-ALIGN-CLOSE-01: Receiver 3 is the top card, Receiver 2 the bottom one; the refusal is by window number.
 await id(page,'receiver-close-1').click();const box=id(page,'receiver-close-box');await expect(box).toBeVisible();
 await expect(id(page,'receiver-close-box-text')).toHaveText('Close the Lowest Receiver First, or Close the Master Receiver to Close All.');
 await expect(id(page,'receiver-close-box-order')).toContainText('Close Receiver 3 first, wherever its card is in the column');
 await expect(box).toHaveAccessibleDescription(/^Close the Lowest Receiver First, or Close the Master Receiver to Close All\. Web note: .*Close Receiver 3 first/);
 await expect(id(page,'receiver-close-box-ok')).toBeFocused();
 await page.keyboard.press('Escape');await expect(box).toHaveCount(0);await expect(id(page,'receiver-close-1')).toBeFocused();
 await expectOrder(page,'2,0,1');await expect(id(page,'receiver-card-1')).toBeVisible();await expect(id(page,'receiver-workspace')).toHaveAttribute('data-align','off');
 await id(page,'receiver-close-2').click();await expect(id(page,'receiver-card-2')).toHaveCount(0);await expectOrder(page,'0,1');await expect(id(page,'receiver-add')).toBeFocused();
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-align','off');
 await id(page,'receiver-add').click();await expectOrder(page,'0,1,2');await expect(id(page,'receiver-workspace')).toHaveAttribute('data-align','on');
 await expect(id(page,'receiver-align-disp')).toHaveText('No');await expect(id(page,'receiver-align-stale')).toBeVisible();
 // Main close cascades; reopening creates a new main with Align on.
 await align(page).click();await id(page,'receiver-move-down-0').click();await expectOrder(page,'1,0,2');
 await id(page,'receiver-close-0').click();await expect(cards(page)).toHaveCount(0);await expect(id(page,'receiver-workspace')).toHaveAttribute('data-order','');
 await expect(id(page,'antenna-receiver-button')).toBeFocused();
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-heading-0')).toBeFocused();await expectOrder(page,'0');
 await pressed(page,true);await expect(id(page,'receiver-align-disp')).toHaveText('Yes');
});

/** Add, Record, Receive (twice 400 ms), Stop, the finish, Identify OK, Properties (read), Save Cancel. interleave: Align and
 * moves while capturing and while finishing, and a press on the inert cards under the finish dialog. */
async function captureWithChild(page:Page,interleave:boolean){
 await startApp(page);await setupReceiver(page);
 await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-record-capturing')).toBeVisible();
 await advance(page,400);
 if(interleave){
  // Align is not gated while receiving (the receiving helper 0x575c6c does not touch it).
  await expect(align(page)).toBeEnabled();await align(page).click();await expect(id(page,'receiver-align-disp')).toHaveText('No');
  await id(page,'receiver-move-up-1').click();await expectOrder(page,'1,0');
  await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');await expect(id(page,'receiver-record-capturing')).toBeVisible();
 }
 await advance(page,400);
 if(interleave){await id(page,'receiver-move-down-1').click();await expectOrder(page,'0,1');await align(page).click();await pressed(page,true);await expectOrder(page,'0,1');}
 await id(page,'receiver-mode').click();await flush(page);
 if(interleave){await align(page).click();await id(page,'receiver-move-up-1').click();await expectOrder(page,'1,0');}
 await untilFinished(page);
 await expect(finish(page)).toHaveAttribute('data-stage','identify');
 if(interleave){
  // The finish dialog is modal over the cards: they are inert, and a dispatched press is refused by the session.
  for(const s of [0,1])await expect(id(page,`receiver-card-${s}`)).toHaveAttribute('inert','');
  await align(page).dispatchEvent('click');await id(page,'receiver-move-down-1').dispatchEvent('click');
  await expect(id(page,'receiver-status-1')).toHaveText('Answer the open Record dialog first.');
  await pressed(page,false);await expectOrder(page,'1,0');
 }
 await id(page,'receiver-record-identify-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','properties');
 const props:Record<string,string>={};
 for(const k of ['object','start','aperture','interval','points','file'])props[k]=(await id(page,`receiver-record-prop-${k}`).textContent())!;
 props.receivers=JSON.stringify(await page.locator('[data-testid^="receiver-record-prop-receiver-"]').allTextContents());
 await id(page,'receiver-record-properties-ok').click();await expect(finish(page)).toHaveAttribute('data-stage','save');
 await id(page,'receiver-record-save-cancel').click();await expect(finish(page)).toHaveCount(0);
 await expect(id(page,'receiver-status-0')).toHaveText('Finished. The recording stays the current pulsar data.');
 return props;
}

test('Receive, Stop and Record: Align and moves while capturing and finishing leave the recorded Properties unchanged (seeded control run)',async({page,browser},info)=>{
 // Control: its own context and fake clock, the same steps without Align or moves.
 const context=await newContext(browser,info);
 let control:Record<string,string>;
 try{control=await captureWithChild(await context.newPage(),false);}finally{await context.close();}
 expect(control).toMatchObject({object:'B2358+38',aperture:'100',interval:'10.00',file:'Data Not Written to File'});
 expect(Number(control.points)).toBeGreaterThan(0);
 const mixed=await captureWithChild(page,true);
 expect(mixed).toEqual(control);
 // After the finish the order and Off state stay; Align and moves work again.
 await expectOrder(page,'1,0');await expect(id(page,'receiver-workspace')).toHaveAttribute('data-align','off');
 await align(page).click();await pressed(page,true);await expectOrder(page,'0,1');
});

test('close box and Record prompt refuse Align and Move; a touch drag ended by a dispatched input releases its capture; hidden route and a project operation change nothing',async({browser},info)=>{
 const context=await newContext(browser,info,true);
 try{
  const page=await context.newPage(),cdp=await context.newCDPSession(page);
  await holdReads(page);await startApp(page);const before=await save(page);
  // An imported (saved) PLR makes Record ask the erase question.
  await toAnalysis(page);await id(page,'pulsar-file').setInputFiles({name:'route.plr',mimeType:'application/octet-stream',buffer:Buffer.from(PLR,'latin1')});
  await expect(id(page,'pulsar-file-name')).toHaveText('route.plr');
  await toRadio(page);await setupReceiver(page);
  await id(page,'receiver-add').click();await id(page,'receiver-add').click();await expectOrder(page,'0,1,2');
  // Close-refusal box: the cards are inert and a dispatched press is refused.
  await id(page,'receiver-close-1').click();await expect(id(page,'receiver-close-box')).toBeVisible();
  for(const s of [0,1,2])await expect(id(page,`receiver-card-${s}`)).toHaveAttribute('inert','');
  await align(page).dispatchEvent('click');await id(page,'receiver-move-up-2').dispatchEvent('click');
  await expect(id(page,'receiver-status-2')).toHaveText('Answer the open message first.');
  await pressed(page,true);await expectOrder(page,'0,1,2');
  await page.keyboard.press('Escape');await expect(id(page,'receiver-close-box')).toHaveCount(0);await expect(id(page,'receiver-close-1')).toBeFocused();
  // Record erase prompt: the same refusal.
  await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt')).toHaveAttribute('data-kind','erase');
  await expect(id(page,'receiver-card-0')).toHaveAttribute('inert','');
  await align(page).dispatchEvent('click');await id(page,'receiver-move-up-2').dispatchEvent('click');
  await expect(id(page,'receiver-status-2')).toHaveText('Answer the open Record dialog first.');
  await pressed(page,true);await expectOrder(page,'0,1,2');
  await page.keyboard.press('Escape');await expect(id(page,'receiver-record-prompt')).toHaveCount(0);await expect(id(page,'receiver-record-disp')).toHaveText('Off');
  // Touch drag on Receiver 2, then a dispatched Align press: the lease ends (marks kept) and the capture is released.
  // A capture set in pointerdown is only pending until the next pointer event (Pointer Events 3 §4.1.3.2, §9.2/9.3):
  // the first touchMove makes it active (gotpointercapture). Only an active capture fires lostpointercapture on release.
  await page.evaluate(()=>{const w=window as unknown as{__lost:string[];__got:string[];__down:number[]};w.__lost=[];w.__got=[];w.__down=[];
   document.addEventListener('pointerdown',e=>{w.__down.push(e.pointerId);},true);
   document.addEventListener('gotpointercapture',e=>{w.__got.push((e as PointerEvent).pointerType);},true);
   document.addEventListener('lostpointercapture',e=>{w.__lost.push((e as PointerEvent).pointerType);},true);});
  const a=await finger(page,1,59,1);await touch(cdp,'touchStart',[a]);await expectMarks(page,1,59,-1);
  await touch(cdp,'touchMove',[await finger(page,1,60,1)]);await expectMarks(page,1,60,-1);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as{__got:string[]}).__got)).toContain('touch');
  expect(await page.evaluate(()=>(window as unknown as{__lost:string[]}).__lost)).toEqual([]);
  await align(page).dispatchEvent('click');await pressed(page,false);
  await expect(id(page,'receiver-status-0')).toHaveText('Align off: the windows stay where they are.');
  // The capture was released by the press, before the finger lifts (the implicit release at touchEnd would come later).
  const late=await finger(page,1,200,1);await touch(cdp,'touchMove',[late]);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as{__lost:string[]}).__lost)).toContain('touch');
  await touch(cdp,'touchEnd',[]);await expectMarks(page,1,60,-1);
  // Touch drag on Receiver 3, then a dispatched Move up: the card moves, the drag ends, the mark stays.
  const b=await finger(page,2,90,2);await touch(cdp,'touchStart',[b]);await expectMarks(page,2,90,-1);
  // No move yet: the capture is only pending (hasPointerCapture true, no new gotpointercapture). After the Move no capture
  // remains on the overlay; which mechanism released it is not asserted.
  const captured=()=>id(page,'receiver-overlay-2').evaluate(el=>el.hasPointerCapture((window as unknown as{__down:number[]}).__down.at(-1)!));
  expect(await captured()).toBe(true);
  expect(await page.evaluate(()=>(window as unknown as{__got:string[]}).__got.length)).toBe(1);
  await id(page,'receiver-move-up-2').dispatchEvent('click');await expectOrder(page,'0,2,1');
  await expect.poll(captured).toBe(false);
  const b2=await finger(page,2,250,2);await touch(cdp,'touchMove',[b2]);await touch(cdp,'touchEnd',[]);await expectMarks(page,2,90,-1);
  // Hidden route: presses do nothing, and the order and Off state are kept when the route returns.
  await page.goBack();await expect(id(page,'radio-control')).toBeHidden();
  await align(page).dispatchEvent('click');await id(page,'receiver-move-up-1').dispatchEvent('click');
  await page.goForward();await expect(id(page,'radio-control')).toBeVisible();
  await pressed(page,false);await expectOrder(page,'0,2,1');await expect(id(page,'receiver-workspace')).toHaveAttribute('data-align','off');
  // A held restore is a project operation: Align and Move are not taken; afterwards they work.
  await restore(page,'held-restore.json',before.toString('utf8'));await held(page,'held-restore.json');
  await align(page).dispatchEvent('click');await id(page,'receiver-move-up-1').dispatchEvent('click');
  await pressed(page,false);await expectOrder(page,'0,2,1');
  await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await release(page,'held-restore.json');await flush(page);
  await align(page).click();await pressed(page,true);await expectOrder(page,'0,1,2');
 }finally{await context.close();}
});

test('viewports 320/375/1440 without overflow (a browser resize is not AL-RESIZE); keyboard order into the window group; held Enter moves or toggles once',async({page},info)=>{
 await startApp(page);await setupReceiver(page);
 await id(page,'receiver-add').click();await id(page,'receiver-add').click();
 await align(page).click();await id(page,'receiver-move-up-2').click();await expectOrder(page,'0,2,1');
 for(const width of [1440,375,320]){
  await page.setViewportSize({width,height:width>500?1050:844});await flush(page);await noOverflow(page);
  await expectOrder(page,'0,2,1');await expect(id(page,'receiver-workspace')).toHaveAttribute('data-align','off');await expect(id(page,'receiver-align-disp')).toHaveText('No');
  await id(page,'receiver-window-2').screenshot({path:info.outputPath(`receiver-align-window-${width}.png`)});
  // The close box with its web note stays readable; Receiver 2 is the bottom card here (order 0,2,1).
  await id(page,'receiver-close-1').click();const box=id(page,'receiver-close-box');await expect(box).toBeVisible();
  await expect(id(page,'receiver-close-box-order')).toBeVisible();await expect(id(page,'receiver-close-box-order')).toBeInViewport();await noOverflow(page);
  await info.attach(`receiver-close-box-${width}.png`,{body:await box.screenshot({path:info.outputPath(`receiver-close-box-${width}.png`)}),contentType:'image/png'});
  await page.keyboard.press('Escape');await expect(box).toHaveCount(0);await expect(id(page,'receiver-close-1')).toBeFocused();await expectOrder(page,'0,2,1');
  await info.attach(`receiver-align-${width}.png`,{body:await page.screenshot({path:info.outputPath(`receiver-align-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
 await page.setViewportSize({width:1440,height:1050});await flush(page);
 // The window group follows the mark controls (the native control TabOrder before it is unchanged).
 await id(page,'receiver-mark-clear-0').focus();
 await page.keyboard.press('Tab');await expect(id(page,'receiver-move-up-0')).toBeFocused();
 await expect(id(page,'receiver-move-up-0')).toHaveAttribute('aria-disabled','true');
 await page.keyboard.press('Tab');await expect(id(page,'receiver-move-down-0')).toBeFocused();
 // A held Enter moves once (auto-repeat ignored); focus stays on the pressed control after the DOM move.
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expectOrder(page,'2,0,1');await expect(id(page,'receiver-move-down-0')).toBeFocused();
 await align(page).focus();
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await pressed(page,true);await expectOrder(page,'0,1,2');await expect(align(page)).toBeFocused();
});

test('Save investigation keeps the receiver window settings but not Align or the card order; a reload resets Align and the order',async({page})=>{
 await startApp(page);const before=investigationParts(await save(page));
 await setupReceiver(page);
 await id(page,'receiver-add').click();await align(page).click();await id(page,'receiver-move-up-1').click();await expectOrder(page,'1,0');
 // The other tools are unchanged; the Radio part keeps the two windows' settings in receiver (slot) order, not the card order.
 const moved=await save(page),saved=investigationParts(moved);
 expect(saved.base).toEqual(before.base);
 expect(saved.radio.workspace.receivers.windows[0]).not.toBeNull();expect(saved.radio.workspace.receivers.windows[1]).not.toBeNull();
 expect(saved.radio.workspace.receivers.windows[2]).toBeNull();
 expect(JSON.stringify(saved.radio)).not.toMatch(/"(align|order)"/i);
 await align(page).click();await expectOrder(page,'0,1');
 // Align on and the original order: only excluded window positions changed, so the two successive files are byte-identical.
 expect((await save(page)).equals(moved)).toBe(true);
 await page.clock.resume();await page.reload();await nav(page,'Radio telescope').click();await expect(id(page,'radio-control')).toBeVisible();
 await expect(cards(page)).toHaveCount(0);await expect(id(page,'receiver-workspace')).toHaveAttribute('data-order','');
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-align','off');
});
