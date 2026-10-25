import {test,expect,type Browser,type CDPSession,type Locator,type Page,type TestInfo} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Actual App flows of the manual receiver marks (docs/RADIO-RECEIVER-MARKS.md, R-RX3) on the #radio-control route. Only the
// rendered App, its data attributes, the browser clock control and, where named, test-only instrumentation: Canvas API
// recording of the base display, recorded DOM event order, a test-only foreign <dialog>, a visibilityState override, a
// synthetic window blur, the read hold and Chromium CDP touch input. CDP touch points are synthetic browser input, not real
// OS multitouch; no native-runtime reproduction is claimed. The catalog is synthetic; expected strings are the chosen web
// contract (declared binary64/dot policy), not native oracles; canvas pixels are checked only for presence.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const restore=(page:Page,name:string,text:string)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text,'utf8')});
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
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

// ---- Synthetic catalog (same fixed-column layout as tests/radio-receiver-app.spec.ts), RA column in degrees.
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
const UT='2026-10-24T12:00:00';

async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
}
async function radioRoute(page:Page){
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
async function switchOnTracking(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
async function loadCatalog(page:Page){
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-receiver.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
}
async function applyClock(page:Page){
 await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${UT} UT`);
 await id(page,'radio-clock-longitude').click();await expect(id(page,'antenna-clock-tick')).toBeEnabled();
}
async function setup(page:Page){await startApp(page);await radioRoute(page);await switchOnTracking(page);await loadCatalog(page);}
async function openReceiver(page:Page){
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-heading-0')).toBeFocused();
}
async function untilFinished(page:Page){
 for(let i=0;i<60&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}
/** Readout of a window: stored columns and the last drawn labels (data attributes of the readout). */
const readout=(page:Page,slot=0)=>id(page,`receiver-mark-readout-${slot}`);
async function expectMarks(page:Page,slot:number,first:number,second:number){
 await expect(readout(page,slot)).toHaveAttribute('data-mark-first',String(first));await expect(readout(page,slot)).toHaveAttribute('data-mark-second',String(second));
}
/** Viewport point of a logical column on a window's overlay (column centre; y in the display's middle). */
async function columnPoint(page:Page,slot:number,column:number){
 const overlay=id(page,`receiver-overlay-${slot}`);await overlay.scrollIntoViewIfNeeded();
 const box=(await overlay.boundingBox())!;return {x:box.x+(column+0.5)*box.width/401,y:box.y+box.height/2,box};
}
async function mouseTo(page:Page,slot:number,column:number,steps=1){const p=await columnPoint(page,slot,column);await page.mouse.move(p.x,p.y,{steps});}
/** Overlay pixel (logical coordinates) as [r, g, b, a]. */
const overlayPixel=(page:Page,slot:number,x:number,y:number)=>page.evaluate(([s,px,py])=>
 Array.from((document.querySelector(`[data-testid="receiver-overlay-${s}"]`) as HTMLCanvasElement).getContext('2d')!.getImageData(px,py,1,1).data),[slot,x,y] as const);
async function placeByKeyboard(page:Page,slot:number,which:'first'|'second',column:number){
 await id(page,`receiver-mark-select-${which}-${slot}`).check();
 const input=id(page,`receiver-mark-position-${slot}`);await input.fill(String(column));await input.press('Enter');
}

type CanvasRecord={__rxLines:number;__rxFills:number};
/** Test-only Canvas API instrumentation of the base display receiver-canvas-0: counted lineTo calls and full-canvas fills.
 * Product code is unchanged; the overlay canvas is not counted. */
const recordBaseCanvas=(page:Page)=>page.addInitScript(()=>{
 const w=window as unknown as CanvasRecord,mine=(c:HTMLCanvasElement)=>c.dataset.testid==='receiver-canvas-0';
 w.__rxLines=0;w.__rxFills=0;
 const proto=CanvasRenderingContext2D.prototype,line=proto.lineTo,fill=proto.fillRect;
 proto.lineTo=function(x,y){if(mine(this.canvas))w.__rxLines++;return line.call(this,x,y);};
 proto.fillRect=function(x,y,width,height){if(mine(this.canvas)&&x===0&&y===0&&width===401&&height===142)w.__rxFills++;return fill.call(this,x,y,width,height);};
});
const baseRecord=(page:Page)=>page.evaluate(()=>{const w=window as unknown as CanvasRecord;return {lines:w.__rxLines,fills:w.__rxFills};});
const resetBaseRecord=(page:Page)=>page.evaluate(()=>{const w=window as unknown as CanvasRecord;w.__rxLines=0;w.__rxFills=0;});

test('desktop: left drag places the first mark, right press the second; base display untouched; Clear twice; double-click sequence; Save bytes unchanged',async({page})=>{
 await recordBaseCanvas(page);await startApp(page);const before=await save(page);
 await radioRoute(page);await switchOnTracking(page);await loadCatalog(page);await openReceiver(page);
 await expect(id(page,`receiver-mark-position-0`)).toHaveValue('');await expectMarks(page,0,-1,-1);
 await expect(id(page,'receiver-notes')).not.toContainText('display marks');
 await expect(id(page,'receiver-seed-next')).toHaveText('Next reseed uses 2.');
 await flush(page);await resetBaseRecord(page);// after the mount Paint
 // Left drag 100 → 150 (snapshot 4 s at FormCreate): stored and drawn on the overlay only.
 await mouseTo(page,0,100);await page.mouse.down();
 await expectMarks(page,0,100,-1);await expect(id(page,'receiver-display-0')).toBeFocused();
 await mouseTo(page,0,150,5);await page.mouse.up();
 await expectMarks(page,0,150,-1);
 await expect(readout(page)).toHaveAttribute('data-label-first','1.50 Sec');await expect(readout(page)).toHaveAttribute('data-label-first-x','150');
 await expect(id(page,'receiver-status-0')).toHaveText('First mark set to column 150.');
 await expect(id(page,'receiver-mark-position-0')).toHaveValue('150');
 // First mark colour 0xffff00 under the BGR TColor reading [I]: cyan on the overlay.
 const [r,g,b]=await overlayPixel(page,0,150,70);expect(r).toBeLessThan(80);expect(g).toBeGreaterThan(200);expect(b).toBeGreaterThan(200);
 expect((await overlayPixel(page,0,100,70))[3]).toBe(0);// the earlier column is no longer drawn
 // Right press at 300: the second mark, whatever the selection; the context menu is suppressed only on the overlay.
 await page.evaluate(()=>{const w=window as unknown as{__menus:boolean[]};w.__menus=[];document.addEventListener('contextmenu',e=>w.__menus.push(e.defaultPrevented));});
 const p300=await columnPoint(page,0,300);await page.mouse.click(p300.x,p300.y,{button:'right'});
 await expectMarks(page,0,150,300);await expect(readout(page)).toHaveAttribute('data-label-second','3.00 Sec');
 await id(page,'receiver-heading-0').click({button:'right'});
 expect(await page.evaluate(()=>(window as unknown as{__menus:boolean[]}).__menus)).toEqual([true,false]);
 expect(await baseRecord(page)).toEqual({lines:0,fills:0});// no Paint, refresh or trace drawing during the gestures
 await expect(id(page,'receiver-seed-next')).toHaveText('Next reseed uses 2.');
 // Clear: the second marks first (one full Paint of this window), then the first, then nothing.
 await id(page,'receiver-mark-clear-0').click();await expectMarks(page,0,150,-1);
 await expect(id(page,'receiver-status-0')).toHaveText('Second mark cleared in windows 1.');await expect(id(page,'receiver-mark-clear-0')).toBeFocused();
 expect((await baseRecord(page)).fills).toBe(1);await expect(readout(page)).toHaveAttribute('data-label-second','');
 await id(page,'receiver-mark-clear-0').click();await expectMarks(page,0,-1,-1);expect((await baseRecord(page)).fills).toBe(2);
 await id(page,'receiver-mark-clear-0').click();await expect(id(page,'receiver-status-0')).toHaveText('No mark to clear in this window.');expect((await baseRecord(page)).fills).toBe(2);
 // Declared browser binding: double-click on the overlay. The browser's own sequence places the mark twice, then Clear runs.
 await page.evaluate(()=>{const w=window as unknown as{__order:string[]};w.__order=[];const o=document.querySelector('[data-testid="receiver-overlay-0"]')!;
  for(const t of ['pointerdown','pointerup','click','dblclick'])o.addEventListener(t,()=>w.__order.push(t));});
 const p200=await columnPoint(page,0,200);await page.mouse.dblclick(p200.x,p200.y);
 expect(await page.evaluate(()=>(window as unknown as{__order:string[]}).__order)).toEqual(['pointerdown','pointerup','click','pointerdown','pointerup','click','dblclick']);
 await expectMarks(page,0,-1,-1);await expect(id(page,'receiver-status-0')).toHaveText('First mark cleared.');expect((await baseRecord(page)).fills).toBe(3);
 expect((await save(page)).equals(before)).toBe(true);
});

test('stop boundary: no new mark until the finish; the label uses the sweep snapshot, not the live Horz value; Receive resets',async({page})=>{
 await setup(page);await openReceiver(page);await applyClock(page);
 await id(page,'receiver-horizontal-down-0').click();await expect(id(page,'receiver-horizontal-value-0')).toHaveText('2.0');
 await id(page,'receiver-mode').click();await flush(page);await advance(page,400);
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-sweep-0')).toHaveAttribute('data-stop-pending','true');
 await expect(id(page,'receiver-mark-position-0')).toBeDisabled();await expect(id(page,'receiver-mark-place-0')).toBeDisabled();
 await expect(id(page,'receiver-mark-timer-0')).toHaveText('Marks are available after the sweep finishes.');
 const p=await columnPoint(page,0,100);await page.mouse.click(p.x,p.y);
 await expect(id(page,'receiver-status-0')).toHaveText('Marks are available after the sweep finishes.');await expectMarks(page,0,-1,-1);
 await untilFinished(page);
 await expect(id(page,'receiver-mark-position-0')).toBeEnabled();await expect(id(page,'receiver-mark-timer-0')).toHaveText('');
 await placeByKeyboard(page,0,'first',100);
 await expectMarks(page,0,100,-1);await expect(readout(page)).toHaveAttribute('data-label-first','0.500 Sec');
 for(let i=0;i<3;i++)await id(page,'receiver-horizontal-up-0').click();
 await expect(id(page,'receiver-horizontal-value-0')).toHaveText('16.0');
 await expect(readout(page)).toHaveAttribute('data-label-first','0.500 Sec');// no repaint: the drawn label stays
 await id(page,'receiver-mark-position-0').press('ArrowUp');
 await expectMarks(page,0,101,-1);await expect(readout(page)).toHaveAttribute('data-label-first','0.505 Sec');// snapshot 2, not live 16
 await id(page,'receiver-mode').click();await flush(page);
 await expectMarks(page,0,-1,-1);await expect(readout(page)).toHaveAttribute('data-label-first','');await expect(id(page,'receiver-mark-position-0')).toBeDisabled();
});

test('channels: each window labels with its own snapshot; a collision in one channel keeps its mark and shows the requested label',async({page})=>{
 await setup(page);await openReceiver(page);await applyClock(page);
 for(let i=0;i<2;i++)await id(page,'receiver-horizontal-down-0').click();
 await expect(id(page,'receiver-horizontal-value-0')).toHaveText('1.0');
 await id(page,'receiver-mode').click();await flush(page);await advance(page,200);await id(page,'receiver-mode').click();await untilFinished(page);
 await id(page,'receiver-add').click();await id(page,'receiver-add').click();await expect(id(page,'receiver-card-2')).toBeVisible();
 await placeByKeyboard(page,2,'first',100);await expectMarks(page,2,100,-1);
 await placeByKeyboard(page,0,'second',100);
 await expectMarks(page,0,-1,100);await expectMarks(page,1,-1,100);await expectMarks(page,2,100,-1);
 await expect(readout(page,0)).toHaveAttribute('data-label-second','0.2500 Sec');// main snapshot 1 s
 await expect(readout(page,1)).toHaveAttribute('data-label-second','1.00 Sec');// child FormCreate snapshot 4 s
 await expect(readout(page,2)).toHaveAttribute('data-label-second','1.00 Sec');
 await expect(id(page,'receiver-mark-second-2')).toHaveText('Not set');
 expect(await id(page,'receiver-mark-label-second-2').evaluate(el=>el.textContent)).toBe('1.00 Sec (requested column 100)');
 await expect(id(page,'receiver-status-0')).toHaveText('Second mark set to column 100 in windows 1, 2; not moved in windows 3, where column 100 is the other mark\'s column. Their labels show the requested time.');
 // Clear from a child: every window's second mark, Painted in origin, main, other-child order.
 await id(page,'receiver-mark-clear-1').click();
 await expect(id(page,'receiver-status-1')).toHaveText('Second mark cleared in windows 2, 1, 3.');
 await expectMarks(page,0,-1,-1);await expectMarks(page,1,-1,-1);await expectMarks(page,2,100,-1);
 await expect(readout(page,2)).toHaveAttribute('data-label-first','1.00 Sec');// the Paint tail redrew the remaining first mark
 await expect(readout(page,2)).toHaveAttribute('data-label-second','');
 // Lifetime: a closed and re-added child starts unset.
 await id(page,'receiver-close-2').click();await id(page,'receiver-add').click();await expect(id(page,'receiver-card-2')).toBeVisible();await expectMarks(page,2,-1,-1);
 await expect(id(page,'receiver-mark-position-2')).toHaveValue('');
});

test('keyboard: Tab order, blank unset field, invalid draft kept, Enter/Place, Home/End, ArrowUp/Down, caret arrows, Escape, selection places nothing, Clear',async({page})=>{
 await setup(page);await openReceiver(page);
 await id(page,'receiver-close-0').focus();
 for(const t of ['receiver-mark-select-first-0','receiver-mark-position-0','receiver-mark-place-0','receiver-mark-clear-0']){await page.keyboard.press('Tab');await expect(id(page,t)).toBeFocused();}
 const input=id(page,'receiver-mark-position-0'),status=id(page,'receiver-status-0');
 await expect(input).toHaveValue('');await expect(input).toHaveAttribute('role','spinbutton');await expect(input).not.toHaveAttribute('aria-valuenow',/.*/);
 await input.focus();await page.keyboard.press('ArrowUp');
 await expect(status).toHaveText('Place this mark first: type a column and press Enter, or press Home or End.');await expectMarks(page,0,-1,-1);
 await input.fill('45x');await page.keyboard.press('Enter');
 await expect(status).toHaveText('Enter a whole column from 0 to 400. The marks are unchanged.');await expect(input).toHaveValue('45x');await expect(input).toHaveAttribute('aria-invalid','true');
 await page.keyboard.press('Escape');await expect(input).toHaveValue('');await expect(input).not.toHaveAttribute('aria-invalid','true');
 await input.fill('45');await page.keyboard.press('Enter');
 await expectMarks(page,0,45,-1);await expect(readout(page)).toHaveAttribute('data-label-first','0.45 Sec');await expect(input).toHaveAttribute('aria-valuenow','45');
 await page.keyboard.press('ArrowUp');await expectMarks(page,0,46,-1);
 await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await expectMarks(page,0,44,-1);
 await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');await expectMarks(page,0,44,-1);await expect(input).toHaveValue('44');
 await page.keyboard.press('Home');await expectMarks(page,0,0,-1);await expect(readout(page)).toHaveAttribute('data-label-first','0.00 Sec');
 await page.keyboard.press('End');await expectMarks(page,0,400,-1);await expect(readout(page)).toHaveAttribute('data-label-first','4.00 Sec');
 await page.keyboard.press('ArrowUp');await expect(status).toHaveText('The mark is already at the edge of the display.');await expectMarks(page,0,400,-1);
 // A held key acts once (auto-repeat ignored).
 await input.fill('200');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');await expectMarks(page,0,200,-1);
 await id(page,'receiver-mark-place-0').click();await expectMarks(page,0,200,-1);
 // Selecting Second creates nothing; the field shows the (unset) second.
 await id(page,'receiver-mark-select-first-0').focus();await page.keyboard.press('ArrowDown');
 await expect(id(page,'receiver-mark-select-second-0')).toBeChecked();await expectMarks(page,0,200,-1);await expect(input).toHaveValue('');
 await id(page,'receiver-mark-clear-0').focus();await page.keyboard.press('Enter');
 await expect(status).toHaveText('First mark cleared.');await expectMarks(page,0,-1,-1);await expect(id(page,'receiver-mark-clear-0')).toBeFocused();
});

test('cancellation (mouse): an antenna dialog, a foreign dialog, a held restore and route navigation end the drag and keep the last accepted mark',async({page})=>{
 await holdReads(page);await setup(page);const before=await save(page);await openReceiver(page);
 const drag=async(from:number,to:number)=>{await mouseTo(page,0,from);await page.mouse.down();await mouseTo(page,0,to,3);};
 const afterwards=async(column:number,kept:number)=>{await mouseTo(page,0,column,3);await page.mouse.up();await expectMarks(page,0,kept,-1);};
 // Set Coordinates opened without moving focus (dispatched click): the cards become inert and the drag ends.
 await drag(50,60);await expectMarks(page,0,60,-1);
 await id(page,'antenna-set-coordinates').dispatchEvent('click');await expect(id(page,'antenna-dialog')).toBeVisible();
 await expect(id(page,'receiver-card-0')).toHaveAttribute('inert','');
 await expect(id(page,'receiver-status-0')).toHaveText('Mark drag ended; the last accepted position is kept.');
 await afterwards(90,60);
 await id(page,'antenna-dialog-cancel').click();await flush(page);
 // A test-only foreign modal <dialog> of the page.
 await drag(70,80);await expectMarks(page,0,80,-1);
 await page.evaluate(()=>{const d=document.createElement('dialog');d.id='foreign-test-dialog';document.body.append(d);d.showModal();});
 await afterwards(120,80);
 await page.evaluate(()=>{const d=document.getElementById('foreign-test-dialog') as HTMLDialogElement;d.close();d.remove();});
 // A held restore is a project operation.
 await drag(100,110);
 await restore(page,'held-restore.json',before.toString('utf8'));await held(page,'held-restore.json');
 await afterwards(150,110);
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await release(page,'held-restore.json');await flush(page);
 await expectMarks(page,0,110,-1);// the project operation kept the temporary marks
 // Route navigation.
 await drag(130,140);await page.goBack();await expect(id(page,'radio-control')).toBeHidden();
 await page.mouse.move(10,10);await page.mouse.up();
 await page.goForward();await expect(id(page,'radio-control')).toBeVisible();await expectMarks(page,0,140,-1);
 // A fresh drag still works afterwards (no orphan lease).
 await drag(200,210);await page.mouse.up();await expectMarks(page,0,210,-1);
 expect((await save(page)).equals(before)).toBe(true);
});

/** A touch-enabled context with Chromium CDP touch input (synthetic browser input, not OS multitouch). Setup runs at the
 * default desktop size; toMobile then switches to 375 px. */
async function touchPage(browser:Browser,info:TestInfo){
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:info.project.use.viewport,hasTouch:true});
 const page=await context.newPage(),cdp=await context.newCDPSession(page);
 return {context,page,cdp};
}
async function toMobile(page:Page){await page.setViewportSize({width:375,height:812});await flush(page);}
type Point={x:number;y:number;id:number};
const touch=(cdp:CDPSession,type:'touchStart'|'touchMove'|'touchEnd'|'touchCancel',points:readonly Point[])=>
 cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({x:p.x,y:p.y,id:p.id}))});
const finger=async(page:Page,slot:number,column:number,fingerId:number):Promise<Point>=>{const p=await columnPoint(page,slot,column);return {x:p.x,y:p.y,id:fingerId};};

test('touch 375 px: a second finger cannot steal, move or end the drag; Escape, touchcancel, window blur and a hidden page end it',async({browser},info)=>{
 const {context,page,cdp}=await touchPage(browser,info);
 try{
  await setup(page);await openReceiver(page);await toMobile(page);
  await page.evaluate(()=>{const w=window as unknown as{__touchUps:boolean[]};w.__touchUps=[];
   document.addEventListener('pointerup',e=>{if(e.pointerType==='touch')w.__touchUps.push(e.isPrimary);},true);});
  // First finger at 100, second finger at 300 (ignored), the second lifts, the first moves to 150 and lifts.
  const a=await finger(page,0,100,1);await touch(cdp,'touchStart',[a]);await expectMarks(page,0,100,-1);
  const b=await finger(page,0,300,2);await touch(cdp,'touchStart',[a,b]);
  const b2=await finger(page,0,320,2);await touch(cdp,'touchMove',[a,b2]);
  // touchEnd lists the contacts that lift. The installed protocol comments say TouchEnd must have no points; the pinned Chromium accepts a selective list (observed). This is a driver/runtime fact, not portable CDP, OS or native parity; the guard below checks it.
  await touch(cdp,'touchEnd',[b2]);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as{__touchUps:boolean[]}).__touchUps),'secondary lifted, primary still down').toEqual([false]);
  await expectMarks(page,0,100,-1);
  const a2=await finger(page,0,150,1);await touch(cdp,'touchMove',[a2]);await expectMarks(page,0,150,-1);
  await touch(cdp,'touchEnd',[]);await expectMarks(page,0,150,-1);
  await expect(readout(page)).toHaveAttribute('data-label-first','1.50 Sec');
  // Second selected: touch places the second mark.
  await id(page,'receiver-mark-select-second-0').check();
  const s=await finger(page,0,250,3);await touch(cdp,'touchStart',[s]);await touch(cdp,'touchEnd',[]);await expectMarks(page,0,150,250);
  await id(page,'receiver-mark-select-first-0').check();
  const cancels:[string,()=>Promise<unknown>][]=[
   ['Escape',()=>page.keyboard.press('Escape')],
   ['touchcancel',()=>touch(cdp,'touchCancel',[])],
   ['window blur (synthetic)',()=>page.evaluate(()=>window.dispatchEvent(new Event('blur')))],
   ['hidden (test-only visibilityState override)',()=>page.evaluate(()=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'));
    delete (document as unknown as {visibilityState?:string}).visibilityState;
   })],
  ];
  let column=40;
  for(const [name,cancel] of cancels){
   const start=await finger(page,0,column,10);await touch(cdp,'touchStart',[start]);
   const moved=await finger(page,0,column+5,10);await touch(cdp,'touchMove',[moved]);await expectMarks(page,0,column+5,250);
   await cancel();await expect(id(page,'receiver-status-0'),name).toHaveText('Mark drag ended; the last accepted position is kept.');
   const late=await finger(page,0,column+60,10);
   if(name!=='touchcancel'){await touch(cdp,'touchMove',[late]);await touch(cdp,'touchEnd',[]);}
   await expectMarks(page,0,column+5,250);
   column+=20;
  }
  await noOverflow(page);
 }finally{await context.close();}
});

test('touch 375 px: a dispatched child Close and a dispatched Mode during a drag end it; Receive resets the marks',async({browser},info)=>{
 const {context,page,cdp}=await touchPage(browser,info);
 try{
  await setup(page);await openReceiver(page);await applyClock(page);
  await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();await toMobile(page);
  const c=await finger(page,1,60,1);await touch(cdp,'touchStart',[c]);await expectMarks(page,1,60,-1);
  await id(page,'receiver-close-1').dispatchEvent('click');await expect(id(page,'receiver-card-1')).toHaveCount(0);
  await touch(cdp,'touchEnd',[]);
  const m=await finger(page,0,70,2);await touch(cdp,'touchStart',[m]);await expectMarks(page,0,70,-1);
  await id(page,'receiver-mode').dispatchEvent('click');await flush(page);
  await expect(id(page,'receiver-mode-disp-0')).toHaveText('Receive');await expectMarks(page,0,-1,-1);
  const late=await finger(page,0,200,2);await touch(cdp,'touchMove',[late]);await touch(cdp,'touchEnd',[]);
  await expectMarks(page,0,-1,-1);await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','true');
 }finally{await context.close();}
});

test('viewports 1440/390/375/320: no overflow; edge presses reach columns 0 and 400; screenshots',async({page},info)=>{
 await setup(page);await openReceiver(page);
 for(const width of [1440,390,375,320]){
  await page.setViewportSize({width,height:width>500?1050:844});await flush(page);await noOverflow(page);
  const {box}=await columnPoint(page,0,0);
  await page.mouse.click(box.x+0.2,box.y+box.height/2);await expectMarks(page,0,0,-1);
  await page.mouse.click(box.x+box.width-0.2,box.y+box.height/2);await expectMarks(page,0,400,-1);
  await expect(readout(page)).toHaveAttribute('data-label-first','4.00 Sec');
  await id(page,'receiver-card-0').screenshot({path:info.outputPath(`receiver-marks-card-${width}.png`)});
  if(width!==390)await info.attach(`receiver-marks-${width}.png`,{body:await page.screenshot({path:info.outputPath(`receiver-marks-${width}.png`),fullPage:true}),contentType:'image/png'});
 }
 await page.setViewportSize({width:1440,height:1050});
 // Lifetime: closing the main and reopening starts unset; a reload resets everything.
 await id(page,'receiver-close-0').click();await openReceiver(page);await expectMarks(page,0,-1,-1);
 await page.clock.resume();await page.reload();await nav(page,'Radio telescope').click();await expect(id(page,'radio-control')).toBeVisible();
 await expect(page.locator('[data-testid^="receiver-card-"]')).toHaveCount(0);
});
