import {test,expect,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Actual App flows of the manual N/S/E/W hold (RA-16..RA-18, WEB-MANUAL-01..04; docs/RADIO-ANTENNA.md). No harness and no
// product debug hook: only the rendered App, its raw data attributes and test-only event/interval/file-read wrappers.
// Expected values restate the recovered operations in binary64 (K, 15, 90, ±180, 12); they are the chosen web contract,
// not native oracles. Synthetic events (window blur, visibilitychange, a foreign <dialog>, CDP touches, held intervals,
// releasePointerCapture) are browser stimuli, not Windows or native witnesses. The pointer log only observes. The controlled clock is installed after the lazy route loaded and
// does not run React's MessageChannel scheduler, so time advances one interval at a time with a flush after each.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const toolbar=(page:Page)=>page.locator('.investigation-toolbar');
async function flushTasks(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,count:number,stepMs=100){for(let i=0;i<count;i++){await page.clock.runFor(stepMs);await flushTasks(page);}}
async function controlledClock(page:Page){await page.clock.install();await page.clock.pauseAt(Date.now()+60_000);await flushTasks(page);}
const file=(name:string,text:string,mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(text,'latin1')});
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const restore=(page:Page,name:string,text:string)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles(file(name,text,'application/json'));
const holdReads=(page:Page)=>page.addInitScript(()=>{
 type Hold={release:()=>void};const w=window as unknown as{__held:Map<string,Hold>};w.__held=new Map();
 const read=Blob.prototype.arrayBuffer;
 Blob.prototype.arrayBuffer=function(this:Blob){
  if(!(this instanceof File&&this.name.startsWith('held-')))return read.call(this);
  const self=this,name=this.name;return new Promise<ArrayBuffer>((resolve,reject)=>w.__held.set(name,{release:()=>{read.call(self).then(resolve,reject);}}));
 };
});
const held=(page:Page,name:string)=>expect.poll(()=>page.evaluate(n=>(window as unknown as{__held:Map<string,unknown>}).__held.has(n),name)).toBe(true);
const releaseRead=(page:Page,name:string)=>page.evaluate(n=>{const m=(window as unknown as{__held:Map<string,{release:()=>void}>}).__held,h=m.get(n)!;m.delete(n);h.release();},name);

const T0=Date.UTC(2000,0,1,12),K=0.0002777777777777778;
const raw=async(page:Page,testId:string,attribute:string)=>Number(await id(page,testId).getAttribute(attribute));
const ra=(page:Page)=>raw(page,'antenna-ra','data-ra-hours'),dec=(page:Page)=>raw(page,'antenna-dec','data-dec-degrees');
const ha=(page:Page)=>raw(page,'antenna-hour-angle','data-ha-hours'),lst=(page:Page)=>raw(page,'antenna-clock-lst','data-lst-hours'),ut=(page:Page)=>raw(page,'antenna-clock-ut','data-ut-ms');
/** 0x4bad9c port policy (normalizeRaHours), restated for the raw-number checks. */
const normalize=(x:number)=>{let r=x-Math.trunc(x/24)*24;if(r<0)r+=24;return r===24?0:r;};
const pad=(page:Page,d:'north'|'south'|'east'|'west')=>id(page,`antenna-manual-${d}`);

async function openRadio(page:Page){
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-control')).toBeVisible();
}
/** Compiled defaults, manual access tick, switch On (first FormActivate: Tracking off, index 4, rate 500). */
async function setupRadio(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();
 await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
}
async function trackingOn(page:Page){await id(page,'antenna-tracking').click();await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');}
async function supplyClock(page:Page,utc='2000-01-01T12:00:00'){
 await id(page,'radio-clock-utc').fill(utc);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${utc} UT`);
 await id(page,'radio-clock-longitude').click();
}
/** Mouse down on the centre of a direction button and let the hold register. */
async function holdMouse(page:Page,target:Locator){
 await target.scrollIntoViewIfNeeded();const box=(await target.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await flushTasks(page);
}
type PointerEntry={type:string;pointerId:number;button:number;buttons:number;isPrimary:boolean;target:string|null};
/** Test-only pointer log: window capture listeners (drag pointermoves with button -1 are skipped), at most 200 entries.
 * Target is the closest [data-testid]. It observes the App and changes nothing. */
const recordPointers=(page:Page)=>page.evaluate(()=>{
 const w=window as unknown as{__pointers:PointerEntry[]};w.__pointers=[];
 const log=(e:Event)=>{
  const p=e instanceof PointerEvent?e:null,m=e instanceof MouseEvent?e:null;
  if((e.type==='pointermove'&&m?.button===-1)||w.__pointers.length>=200)return;
  const target=e.target instanceof Element?e.target.closest('[data-testid]')?.getAttribute('data-testid')??null:null;
  w.__pointers.push({type:e.type,pointerId:p?.pointerId??-1,button:m?.button??-1,buttons:m?.buttons??0,isPrimary:p?.isPrimary??false,target});
 };
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','click'])window.addEventListener(type,log,true);
});
const pointers=(page:Page)=>page.evaluate(()=>(window as unknown as{__pointers:PointerEntry[]}).__pointers);
/** The pointerId of the first logged pointerdown on a test id. */
async function downId(page:Page,testId:string){
 const entry=(await pointers(page)).find(e=>e.type==='pointerdown'&&e.target===testId);expect(entry,`a pointerdown on ${testId}`).toBeDefined();return entry!.pointerId;
}
/** Logged pointerup/pointercancel entries of one pointer. */
const endsOf=async(page:Page,pointerId:number)=>(await pointers(page)).filter(e=>(e.type==='pointerup'||e.type==='pointercancel')&&e.pointerId===pointerId);
const FIELDS=['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'] as const;
async function slewTo(page:Page,values:readonly [string,string,string,string,string,string]){
 await id(page,'antenna-set-coordinates').click();for(const [i,name] of FIELDS.entries())await id(page,`antenna-field-${name}`).fill(values[i]);
 await id(page,'antenna-dialog-ok').click();await flushTasks(page);await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');
 await id(page,'antenna-notice-yes').click();await flushTasks(page);
}
async function untilArrival(page:Page){
 for(let i=0;i<80&&await id(page,'antenna-notice').count()===0;i++)await advance(page,1);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');await id(page,'antenna-notice-ok').click();await flushTasks(page);
}

test('hold N: one step per 100 ms tick; others, Slew Rate and Set Coordinates disabled; Tracking changes nothing; release stops; a press under 100 ms moves nothing',async({page})=>{
 await openRadio(page);await setupRadio(page);
 // Tracking off after the first FormActivate: N/S/E/W disabled as in the original, with the reason shown.
 await expect(pad(page,'north')).toBeDisabled();await expect(id(page,'antenna-manual-limit')).toContainText('only while Tracking is on');
 await expect(id(page,'antenna-menu-disabled')).toContainText('while Tracking is off');
 await trackingOn(page);await controlledClock(page);
 await expect(id(page,'antenna-manual-limit')).toHaveCount(0);
 for(const d of ['north','south','east','west'] as const)await expect(pad(page,d)).toBeEnabled();
 const d0=await dec(page),r0=await ra(page),n=500*K;
 await holdMouse(page,pad(page,'north'));
 await expect(pad(page,'north')).toHaveAttribute('data-held','true');await expect(id(page,'antenna-motion')).toContainText('the N button is held');
 for(const d of ['south','east','west'] as const)await expect(pad(page,d)).toBeDisabled();
 await expect(id(page,'antenna-rate-up')).toBeDisabled();await expect(id(page,'antenna-rate-down')).toBeDisabled();await expect(id(page,'antenna-set-coordinates')).toBeDisabled();
 // The reason names the held button, not Tracking (Tracking is on).
 await expect(id(page,'antenna-menu-disabled')).toContainText('while an N/S/E/W button is held');await expect(id(page,'antenna-menu-disabled')).not.toContainText('Tracking is off');
 expect(await dec(page)).toBe(d0);// no immediate step at the press
 await advance(page,5);
 let expected=d0;for(let i=0;i<5;i++)expected+=n;
 expect(await dec(page)).toBe(expected);expect(await ra(page)).toBe(r0);
 // Tracking by keyboard while the mouse still holds N: DriveBtnClick returns at once (latch set).
 await id(page,'antenna-tracking').focus();await page.keyboard.press('Enter');await flushTasks(page);
 await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');await expect(id(page,'antenna-status')).toContainText('release it first');
 await advance(page,1);expected+=n;expect(await dec(page)).toBe(expected);// the pointer owner keeps the hold after focus moved
 await page.mouse.up();await flushTasks(page);
 await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');await expect(pad(page,'north')).not.toHaveAttribute('data-held');
 await expect(id(page,'antenna-menu-disabled')).toHaveCount(0);
 await advance(page,3);expect(await dec(page)).toBe(expected);
 for(const d of ['north','south','east','west'] as const)await expect(pad(page,d)).toBeEnabled();await expect(id(page,'antenna-rate-up')).toBeEnabled();
 // Shorter than one interval: nothing moves.
 await holdMouse(page,pad(page,'north'));await page.clock.runFor(50);await page.mouse.up();await flushTasks(page);await advance(page,2);
 expect(await dec(page)).toBe(expected);
 // A fresh press moves again; a click alone (no hold) does nothing.
 await holdMouse(page,pad(page,'south'));await advance(page,2);await page.mouse.up();await flushTasks(page);
 expected+=-n;expected+=-n;expect(await dec(page)).toBe(expected);
 await pad(page,'east').dispatchEvent('click');await advance(page,2);expect(await ra(page)).toBe(r0);
});

test('hold W wraps RA through 0 h; release outside the button releases (browser owner), unlike a native release beyond the edge',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 expect(await ra(page)).toBe(0);const w=(-500)*K/15;
 await holdMouse(page,pad(page,'west'));await advance(page,2);
 expect(await ra(page)).toBe(normalize(normalize(0+w)+w));expect(await ra(page)).toBe((0+w+24)+w);
 expect(await ha(page)).toBe((0-w)-w);
 // Move far right/down while held: still held (captured). Release there: released.
 const box=(await pad(page,'west').boundingBox())!;await page.mouse.move(box.x+box.width+200,box.y+box.height+120);await advance(page,1);
 const moved=await ra(page);expect(moved).toBe(((0+w+24)+w)+w);
 await page.mouse.up();await flushTasks(page);await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');
 await advance(page,3);expect(await ra(page)).toBe(moved);
});

test('pole crossing after a programmed slew to Dec +89°30′: Dec reflected, RA and HA +12 h, N/S captions swap',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 await slewTo(page,['0','0','0','89','30','0']);await untilArrival(page);
 expect(await dec(page)).toBe(89.5);expect(await ra(page)).toBe(0);expect(await ha(page)).toBe(0);
 await expect(id(page,'antenna-rate')).toContainText('Index 5: 5000');// the programmed start raised the index
 await holdMouse(page,pad(page,'north'));await advance(page,1);await page.mouse.up();await flushTasks(page);
 const x=89.5+5000*K;expect(await dec(page)).toBe(180-x);expect(await ra(page)).toBe(12);expect(await ha(page)).toBe(12);
 await expect(pad(page,'north')).toHaveText('S');await expect(pad(page,'south')).toHaveText('N');
 await expect(pad(page,'north')).toHaveAttribute('aria-label',/original N button/);await expect(id(page,'antenna-pole')).toBeVisible();
 // The same button now moves Dec down, away from the pole.
 await holdMouse(page,pad(page,'north'));await advance(page,1);await page.mouse.up();await flushTasks(page);
 expect(await dec(page)).toBe((180-x)-5000*K);expect(await ra(page)).toBe(12);
});

test('window blur and a hidden page cancel the hold without resume, even with the mouse still down; the later mouse-up does nothing',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 const n=500*K,d0=await dec(page);
 await holdMouse(page,pad(page,'north'));await advance(page,2);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await flushTasks(page);
 await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','window-blur');await expect(id(page,'antenna-status')).toContainText('Manual slew cancelled');
 const d1=await dec(page);expect(d1).toBe((d0+n)+n);
 await advance(page,3);expect(await dec(page)).toBe(d1);
 await page.mouse.up();await flushTasks(page);await advance(page,2);expect(await dec(page)).toBe(d1);
 await expect(id(page,'antenna-status')).toContainText('Manual slew cancelled');// the quiet idle path does not overwrite it
 // Hidden page.
 await holdMouse(page,pad(page,'north'));await advance(page,1);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 await flushTasks(page);await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','page-hidden');
 await page.evaluate(()=>{delete (document as unknown as {visibilityState?:string}).visibilityState;});
 const d2=await dec(page);expect(d2).toBe(d1+n);await advance(page,3);expect(await dec(page)).toBe(d2);
 await page.mouse.up();await flushTasks(page);await advance(page,2);expect(await dec(page)).toBe(d2);
});

test('a project operation cancels the hold; it does not resume after Cancel; Save bytes are unchanged and reload has no latch',async({page})=>{
 await holdReads(page);await page.goto('/#observatory');const before=await save(page);
 await nav(page,'Radio telescope').click();await setupRadio(page);await trackingOn(page);await controlledClock(page);
 await holdMouse(page,pad(page,'east'));await advance(page,2);
 await restore(page,'held-manual.json',before.toString('utf8'));await held(page,'held-manual.json');await flushTasks(page);
 await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','host-busy');
 const r=await ra(page);await advance(page,5);expect(await ra(page)).toBe(r);
 await page.mouse.up();await flushTasks(page);
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await flushTasks(page);
 await advance(page,5);expect(await ra(page)).toBe(r);await expect(pad(page,'east')).not.toHaveAttribute('data-held');
 await releaseRead(page,'held-manual.json');await flushTasks(page);await expect(toolbar(page).locator('[role="alert"]')).toHaveCount(0);
 await page.clock.resume();
 expect((await save(page)).equals(before)).toBe(true);// no manual or pole field in the investigation format
 await page.reload();await expect(heading(page,'Radio telescope control')).toBeVisible();
 await expect(id(page,'radio-switch')).toBeDisabled();await expect(pad(page,'north')).toHaveCount(0);
});

test('a foreign modal <dialog> cancels the hold; closing it does not resume',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 await holdMouse(page,pad(page,'north'));await advance(page,1);const d1=await dec(page);
 await page.evaluate(()=>{const d=document.createElement('dialog');d.id='foreign-test-dialog';d.textContent='foreign';document.body.append(d);d.showModal();});
 await flushTasks(page);await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','modal');
 await advance(page,3);expect(await dec(page)).toBe(d1);
 await page.evaluate(()=>{const d=document.getElementById('foreign-test-dialog') as HTMLDialogElement;d.close();d.remove();});
 await page.mouse.up();await flushTasks(page);await advance(page,3);expect(await dec(page)).toBe(d1);
});

test('keyboard: Space held on the focused button moves; auto-repeat is ignored; Tab away cancels; Enter press and release',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 const n=500*K,d0=await dec(page);
 await pad(page,'north').focus();await page.keyboard.down('Space');await flushTasks(page);
 await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 await advance(page,2);await page.keyboard.down('Space');await flushTasks(page);// repeat: no new press, the hold continues
 await advance(page,1);const d1=await dec(page);expect(d1).toBe(((d0+n)+n)+n);
 await page.keyboard.press('Tab');await flushTasks(page);
 await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','focus-lost');
 await advance(page,2);expect(await dec(page)).toBe(d1);
 await page.keyboard.up('Space');await flushTasks(page);await advance(page,2);expect(await dec(page)).toBe(d1);
 await pad(page,'south').focus();await page.keyboard.down('Enter');await flushTasks(page);await advance(page,2);await page.keyboard.up('Enter');await flushTasks(page);
 await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');expect(await dec(page)).toBe((d1+(-n))+(-n));
 await advance(page,2);expect(await dec(page)).toBe((d1+(-n))+(-n));
});

test('a programmed slew interlocks the pad (web refusal) even after Tracking off then on re-enables the original buttons',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 await slewTo(page,['3','0','0','20','0','0']);await expect(id(page,'antenna-motion')).toContainText('Slewing');
 await expect(pad(page,'north')).toBeDisabled();
 // The original disable comes from the slew start here, not from Tracking off (Tracking is on).
 await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 const unavailable=id(page,'antenna-manual-limit').locator('li[data-refusal="manual-unavailable"]');
 await expect(unavailable).toContainText('A programmed slew is running or paused');await expect(unavailable).not.toContainText('only while Tracking is on');
 await id(page,'antenna-tracking').click();await id(page,'antenna-tracking').click();await flushTasks(page);
 await expect(id(page,'antenna-manual')).toContainText('enabled');// 0x5651cc re-enabled N/S/E/W natively
 for(const d of ['north','south','east','west'] as const)await expect(pad(page,d)).toBeDisabled();
 await expect(id(page,'antenna-manual-limit')).toContainText('a programmed slew is running or paused');
});

test('Tracking off after a completed slew: the E release calls the clock tick (RA := LST − HA) and enables Set Coordinates; N does not call it',async({page})=>{
 await openRadio(page);await setupRadio(page);await supplyClock(page);await trackingOn(page);await controlledClock(page);
 await slewTo(page,['0','0','0','40','0','0']);
 await id(page,'antenna-tracking').click();await flushTasks(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
 await untilArrival(page);
 await expect(pad(page,'east')).toBeEnabled();await expect(id(page,'antenna-set-coordinates')).toBeDisabled();expect(await ha(page)).toBe(0);
 await expect(id(page,'antenna-menu-disabled')).toContainText('while Tracking is off');
 // N with Tracking off: no clock call.
 await holdMouse(page,pad(page,'north'));await advance(page,1);await page.mouse.up();await flushTasks(page);
 await expect(id(page,'antenna-clock-none')).toBeVisible();
 const e=5000*K/15;
 await holdMouse(page,pad(page,'east'));await advance(page,2);
 await expect(id(page,'antenna-menu-disabled')).toContainText('button is held');
 expect(await ra(page)).toBe((0+e)+e);expect(await ha(page)).toBe((0-e)-e);
 await page.mouse.up();await flushTasks(page);
 expect(await ut(page)).toBe(T0);expect(await ha(page)).toBe((0-e)-e);expect(await ra(page)).toBe(normalize((await lst(page))-((0-e)-e)));
 await expect(id(page,'antenna-set-coordinates')).toBeEnabled();// MouseUp enables Slew1 unconditionally (original quirk)
});

type HeldInterval={handle:number;ms:number;callback:()=>void};
type HeldIntervals={active:HeldInterval[];retired:HeldInterval[]};
/** Test-only interval wrapper (synthetic scheduling): 100 ms and 1000 ms registrations are recorded and NOT forwarded. */
const holdIntervals=(page:Page)=>page.evaluate(()=>{
 const w=window as unknown as{__intervals:HeldIntervals},registry:HeldIntervals={active:[],retired:[]};w.__intervals=registry;
 const set=window.setInterval.bind(window),clear=window.clearInterval.bind(window);let next=1_000_000_000;
 window.setInterval=((callback:TimerHandler,ms?:number,...args:unknown[])=>{
  if((ms===100||ms===1000)&&typeof callback==='function'){const handle=next++;registry.active.push({handle,ms,callback:()=>callback(...args)});return handle;}
  return set(callback,ms,...args);
 }) as typeof window.setInterval;
 window.clearInterval=((handle?:number)=>{
  const i=registry.active.findIndex(r=>r.handle===handle);
  if(i>=0){registry.retired.push(...registry.active.splice(i,1));return;}
  clear(handle);
 }) as typeof window.clearInterval;
});
const heldMs=(page:Page)=>page.evaluate(()=>(window as unknown as{__intervals:HeldIntervals}).__intervals.active.map(r=>r.ms));
const fireHeld=(page:Page,order:readonly number[])=>page.evaluate(o=>{
 const r=(window as unknown as{__intervals:HeldIntervals}).__intervals;
 for(const ms of o)for(const reg of r.active.filter(x=>x.ms===ms))reg.callback();
},[...order]);

test('manual and clock callbacks in the same task chain from the latest accepted state in either order',async({page})=>{
 await openRadio(page);await setupRadio(page);await supplyClock(page);await trackingOn(page);await controlledClock(page);await holdIntervals(page);
 await id(page,'radio-clock-start').click();await flushTasks(page);
 await holdMouse(page,pad(page,'east'));
 await expect.poll(async()=>{const ms=await heldMs(page);return ms.includes(100)&&ms.includes(1000);}).toBe(true);
 const e=500*K/15;
 // Clocktimer first (copy branch: HA := LST − RA), then the manual tick (RA += e, HA −= e), before React commits.
 await page.clock.runFor(1000);await fireHeld(page,[1000,100]);await flushTasks(page);
 expect(await ut(page)).toBe(T0+1000);expect(await ra(page)).toBe(0+e);expect(await ha(page)).toBe(((await lst(page))-0)-e);
 // The other order: manual tick, then the clock copies HA from the moved RA.
 await page.clock.runFor(1000);await fireHeld(page,[100,1000]);await flushTasks(page);
 expect(await ut(page)).toBe(T0+2000);expect(await ra(page)).toBe((0+e)+e);expect(await ha(page)).toBe((await lst(page))-((0+e)+e));
 await page.mouse.up();await flushTasks(page);await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');
 // A retired manual registration does nothing when fired late.
 const r=await ra(page);await page.evaluate(()=>{for(const reg of (window as unknown as{__intervals:HeldIntervals}).__intervals.retired)if(reg.ms===100)reg.callback();});
 await flushTasks(page);expect(await ra(page)).toBe(r);
 await id(page,'radio-clock-pause').click();
});

test('touch (Chromium CDP, 375 px): a second finger on S or on Tracking changes nothing; lifting the holding finger releases',async({browser,browserName,baseURL})=>{
 test.skip(browserName!=='chromium','Input.dispatchTouchEvent needs a Chromium CDP session');
 const context=await browser.newContext({baseURL,hasTouch:true,viewport:{width:375,height:812}});
 try{
  const page=await context.newPage();
  await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);await recordPointers(page);
  await pad(page,'south').scrollIntoViewIfNeeded();
  const centre=async(t:Locator)=>{const b=(await t.boundingBox())!;return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};};
  const n=await centre(pad(page,'north')),s=await centre(pad(page,'south'));
  for(const p of [n,s]){expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(812);}
  const cdp=await context.newCDPSession(page);
  const touch=(type:'touchStart'|'touchEnd'|'touchMove',points:{x:number;y:number;id:number}[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  // Calibration, not a protocol guarantee: the installed protocol comment documents TouchEnd without touch points. On the
  // calibrated Chromium (155.0.8059.84) a non-empty touchEnd ended exactly the listed contacts; the pointerup identities
  // below are checked on every run, so another backend fails here instead of testing something else.
  const version=browser.version(),calibration='CDP calibration: subset touchEnd did not end only S on this Chromium';
  const step=500*K,d0=await dec(page);
  await touch('touchStart',[{...n,id:1}]);await flushTasks(page);await expect(pad(page,'north')).toHaveAttribute('data-held','true');
  const nId=await downId(page,'antenna-manual-north');
  await advance(page,2);
  await touch('touchStart',[{...n,id:1},{...s,id:2}]);await flushTasks(page);// second finger on the disabled S
  const sId=await downId(page,'antenna-manual-south');
  await advance(page,1);
  await touch('touchEnd',[{...s,id:2}]);await flushTasks(page);// the second finger (S) lifts: no release
  await expect.poll(async()=>(await pointers(page)).filter(e=>e.type==='pointerup'&&e.pointerId===sId).length,{message:calibration}).toBe(1);
  expect(await endsOf(page,nId),calibration).toEqual([]);
  test.info().annotations.push({type:'cdp-touch-calibration',description:`Chromium ${version}: subset touchEnd ended the listed contact; protocol.d.ts documents TouchEnd without points; version-pinned, not cross-version or native parity`});
  await advance(page,1);
  expect(await dec(page)).toBe((((d0+step)+step)+step)+step);
  await expect(pad(page,'north')).toHaveAttribute('data-held','true');
  // Second finger on Tracking, at its current box (re-read; the held N contact does not move): DriveBtnClick is refused while latched.
  await expect(id(page,'antenna-status')).not.toContainText('release it first');
  const tr=await centre(id(page,'antenna-tracking'));expect(tr.y).toBeGreaterThan(0);expect(tr.y).toBeLessThan(812);
  await touch('touchStart',[{...n,id:1},{...tr,id:3}]);await flushTasks(page);
  const trId=await downId(page,'antenna-tracking');
  await touch('touchEnd',[{...tr,id:3}]);await flushTasks(page);
  await expect.poll(async()=>(await pointers(page)).some(e=>e.type==='pointerup'&&e.pointerId===trId&&e.target==='antenna-tracking'),{message:calibration}).toBe(true);
  expect(await endsOf(page,nId),calibration).toEqual([]);
  await expect(pad(page,'north')).toHaveAttribute('data-held','true');
  if((await pointers(page)).some(e=>e.type==='click'&&e.target==='antenna-tracking')){
   test.info().annotations.push({type:'secondary-touch-click',description:`synthesized on Chromium ${version}`});
   await expect(id(page,'antenna-status')).toContainText('release it first');
  }else{
   test.info().annotations.push({type:'secondary-touch-click',description:`not synthesized on Chromium ${version}; Drive no-op verified via keyboard Enter`});
   await id(page,'antenna-tracking').focus();await page.keyboard.press('Enter');await flushTasks(page);
   await expect(id(page,'antenna-status')).toContainText('release it first');
  }
  await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
  await touch('touchEnd',[]);await flushTasks(page);
  await expect.poll(async()=>(await pointers(page)).some(e=>e.type==='pointerup'&&e.pointerId===nId)).toBe(true);
  await expect(pad(page,'north')).not.toHaveAttribute('data-held');const d1=await dec(page);await advance(page,3);expect(await dec(page)).toBe(d1);
 }finally{await context.close();}
});

/** Owner pointermoves of a chorded left release (Pointer Events: button 0 with bit 0 of buttons clear). */
const chordReleases=async(page:Page,pointerId:number)=>(await pointers(page)).filter(e=>e.type==='pointermove'&&e.pointerId===pointerId&&e.button===0&&(e.buttons&1)===0);

test('chorded mouse: left released while right stays down releases (a pointermove, no pointerup) without resume; a left press during the chord starts no hold',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);await recordPointers(page);
 const n=500*K,d0=await dec(page);
 await holdMouse(page,pad(page,'north'));const nId=await downId(page,'antenna-manual-north');await advance(page,2);
 await page.mouse.down({button:'right'});await flushTasks(page);
 await expect(pad(page,'north')).toHaveAttribute('data-held','true');await advance(page,1);// the right press alone keeps the hold
 const d1=await dec(page);expect(d1).toBe(((d0+n)+n)+n);
 await page.mouse.up();await flushTasks(page);
 expect((await chordReleases(page,nId)).length).toBeGreaterThan(0);expect((await pointers(page)).filter(e=>e.type==='pointerup')).toEqual([]);
 await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');// RA-17 release, not a cancellation
 await expect(id(page,'antenna-manual-cancelled')).toHaveCount(0);await expect(pad(page,'north')).not.toHaveAttribute('data-held');
 await advance(page,3);expect(await dec(page)).toBe(d1);
 // Documented limit: a left press while right is still down arrives as a pointermove, not a pointerdown, and starts no hold.
 const before=(await pointers(page)).length;
 await page.mouse.down();await flushTasks(page);
 const chordPress=(await pointers(page)).slice(before);
 expect(chordPress.filter(e=>e.type==='pointerdown')).toEqual([]);expect(chordPress.some(e=>e.type==='pointermove'&&e.button===0&&(e.buttons&1)===1)).toBe(true);
 await expect(pad(page,'north')).not.toHaveAttribute('data-held');await advance(page,2);expect(await dec(page)).toBe(d1);
 await page.mouse.up();await page.mouse.up({button:'right'});await flushTasks(page);
 await expect(pad(page,'north')).not.toHaveAttribute('data-held');await advance(page,2);expect(await dec(page)).toBe(d1);
});

test('chorded mouse after a captured move outside the button: the left release still releases; the right release does not resume',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);await recordPointers(page);
 const w=(-500)*K/15;
 await holdMouse(page,pad(page,'west'));const wId=await downId(page,'antenna-manual-west');
 const box=(await pad(page,'west').boundingBox())!;await page.mouse.move(box.x+box.width+200,box.y+box.height+120);await advance(page,1);
 const moved=await ra(page);expect(moved).toBe(normalize(0+w));
 await page.mouse.down({button:'right'});await flushTasks(page);await expect(pad(page,'west')).toHaveAttribute('data-held','true');
 await page.mouse.up();await flushTasks(page);
 expect((await chordReleases(page,wId)).length).toBeGreaterThan(0);
 await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');await expect(pad(page,'west')).not.toHaveAttribute('data-held');
 await advance(page,3);expect(await ra(page)).toBe(moved);
 await page.mouse.up({button:'right'});await flushTasks(page);
 await expect(pad(page,'west')).not.toHaveAttribute('data-held');await advance(page,3);expect(await ra(page)).toBe(moved);
});

test('leaving the route (Back) cancels the hold; the hidden readout stays frozen; the later mouse-up and the return do not resume it',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 const n=500*K,d0=await dec(page);
 await holdMouse(page,pad(page,'north'));await advance(page,1);const d1=await dec(page);expect(d1).toBe(d0+n);
 await page.goBack();await flushTasks(page);await expect(id(page,'radio-control')).toBeHidden();
 await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','route-inactive');
 await advance(page,3);expect(await dec(page)).toBe(d1);// the route stays mounted: raw attributes are readable while hidden
 await page.mouse.up();await flushTasks(page);
 await page.goForward();await flushTasks(page);await expect(id(page,'radio-control')).toBeVisible();
 await expect(pad(page,'north')).not.toHaveAttribute('data-held');await advance(page,3);expect(await dec(page)).toBe(d1);
});

test('closing the panel window cancels the hold; the mouse-up and reopening the window do not resume it',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 const n=500*K,d0=await dec(page);
 await holdMouse(page,pad(page,'north'));await advance(page,1);const d1=await dec(page);expect(d1).toBe(d0+n);
 await id(page,'radio-panel-close').focus();await page.keyboard.press('Enter');await flushTasks(page);
 await expect(id(page,'radio-panel-window')).toHaveCount(0);await expect(id(page,'antenna-status')).toContainText('Manual slew cancelled');
 await page.mouse.up();await flushTasks(page);await advance(page,3);
 await id(page,'radio-switch').click();await flushTasks(page);await expect(id(page,'radio-panel-window')).toBeVisible();
 expect(await dec(page)).toBe(d1);await expect(pad(page,'north')).not.toHaveAttribute('data-held');
 await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','panel-closed');
 await advance(page,3);expect(await dec(page)).toBe(d1);
});

test('a real lost pointer capture cancels the hold (browser stimulus: releasePointerCapture); the later mouse-up does nothing',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);await recordPointers(page);
 const n=500*K,d0=await dec(page);
 await holdMouse(page,pad(page,'north'));const pid=await downId(page,'antenna-manual-north');await advance(page,1);
 expect(await pad(page,'north').evaluate((el,p)=>el.hasPointerCapture(p),pid)).toBe(true);
 await pad(page,'north').evaluate((el,p)=>el.releasePointerCapture(p),pid);
 // A 1 px move lets the browser process the pending capture change (a drag pointermove, button -1, not logged).
 const box=(await pad(page,'north').boundingBox())!;await page.mouse.move(box.x+box.width/2+1,box.y+box.height/2);await flushTasks(page);
 await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','pointer-cancel');
 const d1=await dec(page);expect(d1).toBe(d0+n);await advance(page,3);expect(await dec(page)).toBe(d1);
 await page.mouse.up();await flushTasks(page);await advance(page,2);expect(await dec(page)).toBe(d1);
 await expect(pad(page,'north')).not.toHaveAttribute('data-held');
});

test('running radio clock, Tracking off: the clock tick during an E hold copies HA; the E release chains the clock tick; no manual tick runs after it',async({page})=>{
 await openRadio(page);await setupRadio(page);await supplyClock(page);await trackingOn(page);await controlledClock(page);
 await slewTo(page,['0','0','0','40','0','0']);
 await id(page,'antenna-tracking').click();await flushTasks(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
 await untilArrival(page);
 let r=await ra(page),h=await ha(page);expect(r).toBe(0);expect(h).toBe(0);
 const e=5000*K/15;
 // Clock registration at P (UT T0); the hold 50 ms later, so the 100 ms and 1000 ms callbacks never coincide.
 await id(page,'radio-clock-start').click();await flushTasks(page);
 await page.clock.runFor(50);await flushTasks(page);
 await holdMouse(page,pad(page,'east'));
 for(let i=0;i<9;i++){await advance(page,1);r=normalize(r+e);h=h-e;}// manual ticks at P+150 … P+950
 expect(await ra(page)).toBe(r);expect(await ha(page)).toBe(h);await expect(id(page,'antenna-clock-none')).toBeVisible();
 // P+1000 clock tick while latched (copy branch: HA := LST − RA), then the P+1050 manual tick.
 const ra9=r;await advance(page,1);
 expect(await ut(page)).toBe(T0+1000);h=((await lst(page))-ra9)-e;r=normalize(ra9+e);
 expect(await ra(page)).toBe(r);expect(await ha(page)).toBe(h);
 await advance(page,1);r=normalize(r+e);h=h-e;expect(await ra(page)).toBe(r);expect(await ha(page)).toBe(h);
 // Release at P+1150 with Tracking off: RA-17 then RA-13 (RA := LST − HA, HA kept).
 await page.mouse.up();await flushTasks(page);await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');
 expect(await ut(page)).toBe(T0+1150);expect(await ha(page)).toBe(h);expect(await ra(page)).toBe(normalize((await lst(page))-h));
 // The next clock tick (P+2000) keeps HA: no manual tick ran after the release.
 await advance(page,10);
 expect(await ut(page)).toBe(T0+2000);expect(await ha(page)).toBe(h);expect(await ra(page)).toBe(normalize((await lst(page))-h));
 await id(page,'radio-clock-pause').click();await flushTasks(page);
});

test('layout: targets of at least 44 px, no document overflow at 1440 px, the radio panel fits at 375 and 320 px; screenshots',async({page},info)=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);
 for(const d of ['north','south','east','west'] as const){const b=(await pad(page,d).boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
 // DFM cross: N above S, E left of W.
 const [nb,sb,eb,wb]=await Promise.all((['north','south','east','west'] as const).map(async d=>(await pad(page,d).boundingBox())!));
 expect(nb.y).toBeLessThan(sb.y);expect(eb.x).toBeLessThan(wb.x);expect(eb.y).toBeGreaterThan(nb.y);expect(eb.y).toBeLessThan(sb.y);
 const noOverflow=()=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
 await noOverflow();await id(page,'antenna-controls').screenshot({path:info.outputPath('radio-manual-1440.png')});
 // The rest of the App at narrow widths is outside this increment: the radio panel itself must not overflow.
 for(const [width,height] of [[375,812],[320,800]] as const){
  await page.setViewportSize({width,height});
  await expect.poll(()=>id(page,'radio-control').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(0);
  await expect.poll(()=>id(page,'radio-panel-window').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(0);
  if(width===375)await page.screenshot({path:info.outputPath('radio-manual-375.png'),fullPage:true});
 }
 await pad(page,'north').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('radio-manual-320.png'),fullPage:true});
});
