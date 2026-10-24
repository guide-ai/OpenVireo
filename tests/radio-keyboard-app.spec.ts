import {test,expect,type CDPSession,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Actual App flows of the RA-19 keyboard table (FormKeyDown/FormKeyUp, WEB-KEY-02/03; docs/RADIO-ANTENNA.md). No harness
// and no product debug hook: only the rendered App, its raw data attributes and test-only listeners/wrappers. Expected
// values restate the recovered operations in binary64 (K, 15, 90, ±180, 12); they are the chosen web contract, not native
// oracles. Playwright key presses, CDP key events, synthetic window blur/visibilitychange and a foreign <dialog> are browser
// stimuli, not physical-keyboard, Windows or native witnesses. The key log only observes (a window bubble listener).
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
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
type D='north'|'south'|'east'|'west';
const pad=(page:Page,d:D)=>id(page,`antenna-manual-${d}`);
const tracking=(page:Page)=>id(page,'antenna-tracking');

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
async function trackingOn(page:Page){await tracking(page).click();await flushTasks(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');}
async function supplyClock(page:Page,utc='2000-01-01T12:00:00'){
 await id(page,'radio-clock-utc').fill(utc);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${utc} UT`);
 await id(page,'radio-clock-longitude').click();await expect(id(page,'antenna-clock-tick')).toBeEnabled();
}
async function applyLimits(page:Page){
 await id(page,'antenna-radio-options-limit').check();await id(page,'antenna-radio-options-apply').click();await flushTasks(page);
 await expect(id(page,'antenna-radio-options-current')).toHaveAttribute('data-limits','true');
}
async function holdMouse(page:Page,target:Locator){
 await target.scrollIntoViewIfNeeded();const box=(await target.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await flushTasks(page);
}
const FIELDS=['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'] as const;
async function slewTo(page:Page,values:readonly string[]){
 await id(page,'antenna-set-coordinates').click();for(const [i,name] of FIELDS.entries())await id(page,`antenna-field-${name}`).fill(values[i]);
 await id(page,'antenna-dialog-ok').click();await flushTasks(page);await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');
 await id(page,'antenna-notice-yes').click();await flushTasks(page);
}
async function untilArrival(page:Page){
 for(let i=0;i<120&&await id(page,'antenna-notice').count()===0;i++)await advance(page,1);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');await id(page,'antenna-notice-ok').click();await flushTasks(page);
}
/** Hours or degrees as dialog fields (nine-decimal seconds), as in the altitude spec. */
function fieldsOf(value:number):[string,string,string]{
 const a=Math.abs(value),whole=Math.trunc(a),minutes=Math.trunc((a-whole)*60),seconds=((a-whole)*60-minutes)*60;
 return [(value<0?'-':'')+String(whole),String(minutes),seconds.toFixed(9)];
}
/** Key down/up on the focused element with the queued React work flushed. A second down of a held key is a repeat. */
async function keyDown(page:Page,key:string){await page.keyboard.down(key);await flushTasks(page);}
async function keyUp(page:Page,key:string){await page.keyboard.up(key);await flushTasks(page);}
/** Chromium CDP numeric-keypad stimulus (key digit/'.', keypad code, location 3): Playwright's keyboard sends Numpad8 as
 * ArrowUp (KEYPAD/KEY-STIMULUS-CONTROL). Not a physical keyboard, NumLock or Windows witness. */
const PAD_KEYS={Numpad2:'2',Numpad4:'4',Numpad5:'5',Numpad6:'6',Numpad8:'8',NumpadDecimal:'.'} as const;
async function padKey(page:Page,cdp:CDPSession,type:'rawKeyDown'|'keyUp',code:keyof typeof PAD_KEYS){
 const key=PAD_KEYS[code];await cdp.send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:key==='.'?110:96+Number(key),isKeypad:true});await flushTasks(page);
}
type KeyEntry={type:string;key:string;code:string;location:number;prevented:boolean;target:string|null};
/** Test-only key log: window bubble listeners (after React's root listener), at most 400 entries. It changes nothing. */
const recordKeys=(page:Page)=>page.evaluate(()=>{
 const w=window as unknown as{__keys:KeyEntry[]};w.__keys=[];
 for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{
  const k=e as KeyboardEvent;if(w.__keys.length>=400)return;
  w.__keys.push({type,key:k.key,code:k.code,location:k.location,prevented:k.defaultPrevented,target:k.target instanceof Element?k.target.closest('[data-testid]')?.getAttribute('data-testid')??null:null});
 });
});
const keyLog=(page:Page)=>page.evaluate(()=>(window as unknown as{__keys:KeyEntry[]}).__keys);
const lastKey=async(page:Page,type:string,code:string)=>{const e=(await keyLog(page)).filter(x=>x.type===type&&x.code===code).at(-1);expect(e,`${type} ${code} logged`).toBeDefined();return e!;};
const notHeld=async(page:Page)=>{for(const d of ['north','south','east','west'] as const)await expect(pad(page,d)).not.toHaveAttribute('data-held');await expect(id(page,'antenna-motion')).not.toHaveAttribute('data-manual');};

test('letters: refused with Tracking off; a press from Tracking moves focus to that button and holds it; repeats do not restart; the release stops',async({page})=>{
 await openRadio(page);await setupRadio(page);await recordKeys(page);
 await tracking(page).focus();await keyDown(page,'n');
 await expect(id(page,'antenna-status')).toHaveText('That direction button is disabled; nothing changed.');
 await expect(tracking(page)).toBeFocused();await notHeld(page);await keyUp(page,'n');
 expect((await lastKey(page,'keydown','KeyN')).prevented).toBe(true);// an admitted table key, refused by the core
 await page.keyboard.press('Enter');await flushTasks(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');await expect(tracking(page)).toBeFocused();
 await controlledClock(page);
 await expect(id(page,'antenna-manual-keys')).toContainText('keypad 4 (E), 8 or the decimal key (N), 2 (S) or 6 (W)');
 await expect(id(page,'antenna-manual-keys')).toContainText('while a hold started with one of these keys runs');
 const n=500*K,e=500*K/15,d0=await dec(page),r0=await ra(page);
 await keyDown(page,'n');
 await expect(pad(page,'north')).toBeFocused();await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 await expect(id(page,'antenna-motion')).toContainText('the N button is held');
 for(const d of ['south','east','west'] as const)await expect(pad(page,d)).toBeDisabled();
 expect(await dec(page)).toBe(d0);// no immediate step at the press
 await advance(page,3);let expected=((d0+n)+n)+n;expect(await dec(page)).toBe(expected);
 await keyDown(page,'n');// auto-repeat: no new press, the hold continues
 await advance(page,1);expected+=n;expect(await dec(page)).toBe(expected);
 await keyUp(page,'n');await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');await notHeld(page);
 await advance(page,2);expect(await dec(page)).toBe(expected);await expect(pad(page,'north')).toBeFocused();
 // From a focused direction button another key moves focus to its own button (the one it disables otherwise).
 await keyDown(page,'s');await expect(pad(page,'south')).toBeFocused();await expect(pad(page,'south')).toHaveAttribute('data-held','true');await expect(pad(page,'north')).toBeDisabled();
 await advance(page,1);expected+=-n;await keyUp(page,'s');expect(await dec(page)).toBe(expected);
 await keyDown(page,'E');await expect(pad(page,'east')).toBeFocused();await advance(page,1);await keyUp(page,'E');expect(await ra(page)).toBe(r0+e);
 await keyDown(page,'w');await expect(pad(page,'west')).toBeFocused();await advance(page,2);await keyUp(page,'w');expect(await ra(page)).toBe(normalize(normalize((r0+e)+(-e))+(-e)));
 await advance(page,2);expect(await dec(page)).toBe(expected);
});

test('cross release: N held, S released: hold ends through S, which stays disabled with a visible reason; pointer and key presses on S are refused; another release recovers',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 const n=500*K,d0=await dec(page);
 await tracking(page).focus();await keyDown(page,'n');await advance(page,1);
 await keyDown(page,'s');// latched: FormKeyDown exits; no focus move
 await expect(pad(page,'north')).toBeFocused();await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 await keyUp(page,'s');
 await expect(id(page,'antenna-status')).toContainText('Manual slew stopped by releasing another direction’s key');await notHeld(page);
 const d1=await dec(page);expect(d1).toBe(d0+n);await advance(page,2);expect(await dec(page)).toBe(d1);
 await expect(pad(page,'south')).toBeDisabled();await expect(pad(page,'south')).toHaveAttribute('data-left-disabled','true');
 for(const d of ['north','east','west'] as const)await expect(pad(page,d)).toBeEnabled();
 await expect(id(page,'antenna-rate-up')).toBeEnabled();await expect(id(page,'antenna-set-coordinates')).toBeEnabled();
 await expect(id(page,'antenna-manual')).toHaveAttribute('data-left-disabled','south');await expect(id(page,'antenna-manual')).toContainText('enabled except the S button');
 await expect(id(page,'antenna-manual-leftover')).toHaveAttribute('data-direction','south');await expect(id(page,'antenna-manual-leftover')).toContainText('press and release another enabled direction button');
 await expect(id(page,'antenna-manual-leftover')).not.toContainText('Tracking off and on');
 await expect(id(page,'antenna-manual-limit').locator('li[data-refusal="manual-unavailable"]')).toContainText('left disabled by a key release');
 await expect(id(page,'antenna-manual-limit').locator('li[data-refusal="manual-unavailable"]')).not.toContainText('Tracking');
 await expect(pad(page,'south')).toHaveAttribute('aria-describedby',/leftover/);
 // The still-held N key's release finds no latch.
 await keyUp(page,'n');await advance(page,2);expect(await dec(page)).toBe(d1);
 await holdMouse(page,pad(page,'south'));await advance(page,2);await page.mouse.up();await flushTasks(page);expect(await dec(page)).toBe(d1);await notHeld(page);
 await tracking(page).focus();await keyDown(page,'s');await expect(id(page,'antenna-status')).toHaveText('That direction button is disabled; nothing changed.');
 await expect(tracking(page)).toBeFocused();await keyUp(page,'s');await advance(page,1);expect(await dec(page)).toBe(d1);
 // Recovery: a normal press and release of another button (E) enables all four again.
 await keyDown(page,'e');await expect(pad(page,'east')).toBeFocused();await keyUp(page,'e');
 await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');
 for(const d of ['north','south','east','west'] as const)await expect(pad(page,d)).toBeEnabled();
 await expect(id(page,'antenna-manual-leftover')).toHaveCount(0);await expect(pad(page,'south')).not.toHaveAttribute('data-left-disabled');
 await expect(id(page,'antenna-manual')).toContainText('N/S/E/W buttons: enabled.');
});

test('Tracking off: the clock call follows the released key: E held → N release no clock; N held → E release RA := LST − HA',async({page})=>{
 await openRadio(page);await setupRadio(page);await supplyClock(page);await trackingOn(page);await controlledClock(page);
 await slewTo(page,['0','0','0','40','0','0']);
 await tracking(page).click();await flushTasks(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
 await untilArrival(page);expect(await ha(page)).toBe(0);await expect(pad(page,'east')).toBeEnabled();
 const e=5000*K/15,n=5000*K;
 await tracking(page).focus();await keyDown(page,'e');await expect(pad(page,'east')).toBeFocused();await advance(page,2);
 expect(await ra(page)).toBe((0+e)+e);expect(await ha(page)).toBe((0-e)-e);
 await keyDown(page,'n');await keyUp(page,'n');
 await expect(id(page,'antenna-status')).toContainText('releasing another direction’s key');
 await expect(id(page,'antenna-clock-none')).toBeVisible();// NBtnMouseUp has no ClocktimerTimer call
 expect(await ra(page)).toBe((0+e)+e);expect(await ha(page)).toBe((0-e)-e);
 await expect(pad(page,'north')).toBeDisabled();await expect(id(page,'antenna-manual-leftover')).toHaveAttribute('data-direction','north');
 await keyUp(page,'e');await advance(page,2);expect(await ra(page)).toBe((0+e)+e);
 // S pressed and released through itself enables N again (no tick, nothing moves).
 await keyDown(page,'s');await keyUp(page,'s');await expect(pad(page,'north')).toBeEnabled();await expect(id(page,'antenna-manual-leftover')).toHaveCount(0);
 const d0=await dec(page);
 await keyDown(page,'n');await expect(pad(page,'north')).toBeFocused();await advance(page,1);expect(await dec(page)).toBe(d0+n);
 await keyDown(page,'e');await keyUp(page,'e');// E MouseUp with Tracking off calls ClocktimerTimer
 await expect(id(page,'antenna-status')).toContainText('releasing another direction’s key');
 expect(await ut(page)).toBe(T0);expect(await ha(page)).toBe((0-e)-e);expect(await ra(page)).toBe(normalize((await lst(page))-((0-e)-e)));
 await expect(pad(page,'east')).toBeDisabled();await expect(id(page,'antenna-manual-leftover')).toHaveAttribute('data-direction','east');
 await keyUp(page,'n');await advance(page,2);expect(await dec(page)).toBe(d0+n);
});

test('keypad digits (CDP numeric stimulus): 4 E, 6 W, 8/decimal N, 2 S hold; keypad 5, the digit row, arrows, F4/F8 and NumLock-off keypad do nothing and are not consumed',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);await recordKeys(page);
 const cdp=await page.context().newCDPSession(page);
 const n=500*K,e=500*K/15,d0=await dec(page),r0=await ra(page);
 await tracking(page).focus();await padKey(page,cdp,'rawKeyDown','Numpad8');
 await expect(pad(page,'north')).toBeFocused();await expect(pad(page,'north')).toHaveAttribute('data-held','true');await advance(page,1);await padKey(page,cdp,'keyUp','Numpad8');
 expect(await dec(page)).toBe(d0+n);await notHeld(page);
 expect(await lastKey(page,'keydown','Numpad8')).toMatchObject({key:'8',location:3,prevented:true});
 expect(await lastKey(page,'keyup','Numpad8')).toMatchObject({key:'8',location:3,prevented:true});
 await padKey(page,cdp,'rawKeyDown','NumpadDecimal');await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 expect(await lastKey(page,'keydown','NumpadDecimal')).toMatchObject({key:'.',location:3});await padKey(page,cdp,'keyUp','NumpadDecimal');
 await padKey(page,cdp,'rawKeyDown','Numpad2');await expect(pad(page,'south')).toHaveAttribute('data-held','true');await padKey(page,cdp,'keyUp','Numpad2');
 await padKey(page,cdp,'rawKeyDown','Numpad4');await expect(pad(page,'east')).toBeFocused();await expect(pad(page,'east')).toHaveAttribute('data-held','true');
 expect(await lastKey(page,'keydown','Numpad4')).toMatchObject({key:'4',location:3});
 await advance(page,1);await padKey(page,cdp,'keyUp','Numpad4');const rE=normalize(r0+e);expect(await ra(page)).toBe(rE);
 await padKey(page,cdp,'rawKeyDown','Numpad6');await expect(pad(page,'west')).toBeFocused();await expect(pad(page,'west')).toHaveAttribute('data-held','true');
 expect(await lastKey(page,'keydown','Numpad6')).toMatchObject({key:'6',location:3});
 await advance(page,1);await padKey(page,cdp,'keyUp','Numpad6');const rW=normalize(rE+(-e));expect(await ra(page)).toBe(rW);
 await advance(page,1);expect(await ra(page)).toBe(rW);expect(await dec(page)).toBe(d0+n);
 // Keypad 5 (numeric '5', VK 101, not Playwright's Clear): the native 0x65 no-op, not consumed.
 await tracking(page).focus();await padKey(page,cdp,'rawKeyDown','Numpad5');await advance(page,1);await notHeld(page);await padKey(page,cdp,'keyUp','Numpad5');
 await expect(tracking(page)).toBeFocused();
 expect(await lastKey(page,'keydown','Numpad5'),'Numpad5 keydown').toMatchObject({key:'5',location:3,prevented:false});
 expect(await lastKey(page,'keyup','Numpad5'),'Numpad5 keyup').toMatchObject({key:'5',location:3,prevented:false});
 for(const key of ['Digit8','ArrowUp','F4','F8']){
  await tracking(page).focus();await keyDown(page,key);await advance(page,1);await notHeld(page);await keyUp(page,key);
  await expect(tracking(page)).toBeFocused();
  expect((await lastKey(page,'keydown',key)).prevented,`${key} keydown`).toBe(false);expect((await lastKey(page,'keyup',key)).prevented,`${key} keyup`).toBe(false);
 }
 expect(await ra(page)).toBe(rW);expect(await dec(page)).toBe(d0+n);
 // NumLock off (Chromium CDP stimulus): the keypad 8 position reports ArrowUp; no hold, not consumed.
 await cdp.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'ArrowUp',code:'Numpad8',windowsVirtualKeyCode:38,isKeypad:true});await flushTasks(page);
 await advance(page,1);await notHeld(page);
 await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'Numpad8',windowsVirtualKeyCode:38,isKeypad:true});await flushTasks(page);
 const off=(await keyLog(page)).filter(x=>x.code==='Numpad8'&&x.key==='ArrowUp');
 expect(off.map(x=>[x.type,x.prevented])).toEqual([['keydown',false],['keyup',false]]);
 test.info().annotations.push({type:'cdp-numlock-off-location',description:`observed KeyboardEvent.location ${off[0].location} for the CDP NumLock-off stimulus`});
 expect(await dec(page)).toBe(d0+n);
});

test('modifiers: Ctrl/Alt/Meta+N start nothing and are not consumed; Shift+N holds; a modifier pressed during the hold never blocks the release; the physical key releases after a mapping change',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);await recordKeys(page);
 const n=500*K,d0=await dec(page);
 for(const modifier of ['Control','Alt','Meta']){
  await tracking(page).focus();await keyDown(page,modifier);await keyDown(page,'n');await advance(page,1);await notHeld(page);
  expect((await lastKey(page,'keydown','KeyN')).prevented,modifier).toBe(false);
  await keyUp(page,'n');await keyUp(page,modifier);await expect(tracking(page)).toBeFocused();
 }
 expect(await dec(page)).toBe(d0);
 // Explicit uppercase N with Shift held (Playwright's down('n') keeps key 'n' under Shift; KEY-STIMULUS-CONTROL).
 await keyDown(page,'Shift');await keyDown(page,'N');await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 expect(await lastKey(page,'keydown','KeyN')).toMatchObject({key:'N',location:0,prevented:true});
 await advance(page,1);await keyUp(page,'N');await notHeld(page);await keyUp(page,'Shift');expect(await dec(page)).toBe(d0+n);
 // Control pressed while N is held: the N release still ends the hold.
 await tracking(page).focus();await keyDown(page,'n');await keyDown(page,'Control');await advance(page,1);await keyUp(page,'n');
 await notHeld(page);await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');await keyUp(page,'Control');
 const d1=await dec(page);expect(d1).toBe((d0+n)+n);
 // Keypad 8 held, then its key-up reports ArrowUp (NumLock turned off meanwhile; CDP stimulus): the physical code releases.
 const cdp=await page.context().newCDPSession(page);
 await tracking(page).focus();await padKey(page,cdp,'rawKeyDown','Numpad8');await expect(pad(page,'north')).toHaveAttribute('data-held','true');await advance(page,1);
 await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'Numpad8',windowsVirtualKeyCode:38,isKeypad:true});await flushTasks(page);
 await notHeld(page);await expect(id(page,'antenna-status')).toHaveText('Manual slew stopped.');
 expect(await lastKey(page,'keyup','Numpad8')).toMatchObject({key:'ArrowUp',location:3});
 const d2=await dec(page);expect(d2).toBe(d1+n);await advance(page,2);expect(await dec(page)).toBe(d2);
 await padKey(page,cdp,'keyUp','Numpad8');await advance(page,1);expect(await dec(page)).toBe(d2);// a late numeric key-up: no owner, nothing
});

test('scope: the keys do nothing in text fields, the coordinate dialog, Set Coordinates, Slew Rate, the body, the radio switch or under a foreign dialog',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);await recordKeys(page);
 const d0=await dec(page),r0=await ra(page);
 const check=async()=>{await advance(page,1);await notHeld(page);expect(await dec(page)).toBe(d0);expect(await ra(page)).toBe(r0);};
 for(const field of ['radio-clock-utc','radio-env-diameter']){
  await id(page,field).fill('');await id(page,field).focus();await keyDown(page,'n');await keyUp(page,'n');await check();
  await expect(id(page,field)).toHaveValue('n');await id(page,field).fill('');
 }
 for(const control of ['antenna-set-coordinates','antenna-rate-up']){
  await id(page,control).focus();await keyDown(page,'n');await check();await keyUp(page,'n');
  expect((await lastKey(page,'keydown','KeyN')).prevented,control).toBe(false);
 }
 await page.evaluate(()=>(document.activeElement as HTMLElement|null)?.blur());await keyDown(page,'s');await check();await keyUp(page,'s');
 expect((await lastKey(page,'keydown','KeyS')).target).toBeNull();
 // The main Radio switch keeps its own OnKeyPress (#13 only): a letter is ignored there and starts no hold.
 const checked=await id(page,'radio-switch').getAttribute('aria-checked');
 await id(page,'radio-switch').focus();await keyDown(page,'n');await keyUp(page,'n');await check();
 await expect(id(page,'radio-switch')).toHaveAttribute('aria-checked',checked!);
 // The coordinate dialog: typed text stays typed, nothing moves.
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 await id(page,'antenna-field-raHours').fill('');await id(page,'antenna-field-raHours').focus();await keyDown(page,'w');await keyUp(page,'w');
 await expect(id(page,'antenna-field-raHours')).toHaveValue('w');await check();
 await id(page,'antenna-dialog-cancel').click();await flushTasks(page);await expect(id(page,'antenna-dialog')).toHaveCount(0);
 // A foreign modal <dialog> makes the page inert: the key reaches the dialog.
 await page.evaluate(()=>{const d=document.createElement('dialog');d.id='foreign-test-dialog';d.textContent='foreign';document.body.append(d);d.showModal();});
 await keyDown(page,'n');await check();await keyUp(page,'n');
 await page.evaluate(()=>{const d=document.getElementById('foreign-test-dialog') as HTMLDialogElement;d.close();d.remove();});await flushTasks(page);
 // Back inside the scope the same key holds.
 await tracking(page).focus();await keyDown(page,'n');await expect(pad(page,'north')).toHaveAttribute('data-held','true');await keyUp(page,'n');await notHeld(page);
});

test('cancellation without resume: Tab out of the scope, window blur and a hidden page; moving inside the scope keeps the hold; late releases are harmless; a fresh press works',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 const n=500*K;let d=await dec(page);
 // Shift+Tab from N reaches Tracking (inside the scope): the hold continues; Tab back to N, then Tab out cancels.
 await tracking(page).focus();await keyDown(page,'n');await advance(page,1);d+=n;
 await page.keyboard.press('Shift+Tab');await flushTasks(page);await expect(tracking(page)).toBeFocused();
 await expect(pad(page,'north')).toHaveAttribute('data-held','true');await advance(page,1);d+=n;expect(await dec(page)).toBe(d);
 await page.keyboard.press('Tab');await flushTasks(page);await expect(pad(page,'north')).toBeFocused();await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 await page.keyboard.press('Tab');await flushTasks(page);
 await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','key-scope-left');await expect(id(page,'antenna-manual-cancelled')).toContainText('focus left Tracking');
 await notHeld(page);await advance(page,2);expect(await dec(page)).toBe(d);
 await keyDown(page,'n');await advance(page,1);expect(await dec(page)).toBe(d);// a repeat outside the scope
 await keyUp(page,'n');await advance(page,1);expect(await dec(page)).toBe(d);
 const causes:[string,()=>Promise<unknown>,string][]=[
  ['window-blur',()=>page.evaluate(()=>window.dispatchEvent(new Event('blur'))),'window lost focus'],
  ['page-hidden',()=>page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));}),'page was hidden'],
 ];
 for(const [reason,cause,text] of causes){
  await tracking(page).focus();await keyDown(page,'s');await expect(pad(page,'south')).toHaveAttribute('data-held','true');await advance(page,1);d+=-n;
  await cause();await flushTasks(page);
  await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason',reason);await expect(id(page,'antenna-manual-cancelled')).toContainText(text);
  if(reason==='page-hidden')await page.evaluate(()=>{delete (document as unknown as {visibilityState?:string}).visibilityState;});
  await notHeld(page);await advance(page,2);expect(await dec(page)).toBe(d);
  await keyDown(page,'s');await advance(page,1);expect(await dec(page)).toBe(d);// the repeat never resumes
  await keyUp(page,'s');await advance(page,1);expect(await dec(page)).toBe(d);
 }
 await tracking(page).focus();await keyDown(page,'s');await advance(page,1);await keyUp(page,'s');d+=-n;expect(await dec(page)).toBe(d);
});

test('cancellation without resume: a foreign dialog, Back and a held restore; no key or leftover state is saved',async({page})=>{
 await holdReads(page);await page.goto('/#observatory');const before=await save(page);
 await nav(page,'Radio telescope').click();await setupRadio(page);await trackingOn(page);await controlledClock(page);
 const n=500*K;let d=await dec(page);
 // Foreign <dialog>: showModal moves focus out of the scope synchronously, before the dialog observer: both are cancellations.
 await tracking(page).focus();await keyDown(page,'n');await advance(page,1);d+=n;
 await page.evaluate(()=>{const dlg=document.createElement('dialog');dlg.id='foreign-test-dialog';dlg.textContent='foreign';document.body.append(dlg);dlg.showModal();});await flushTasks(page);
 expect(['key-scope-left','modal']).toContain(await id(page,'antenna-manual-cancelled').getAttribute('data-reason'));
 await advance(page,2);expect(await dec(page)).toBe(d);await keyUp(page,'n');
 await page.evaluate(()=>{const dlg=document.getElementById('foreign-test-dialog') as HTMLDialogElement;dlg.close();dlg.remove();});await flushTasks(page);
 await advance(page,2);expect(await dec(page)).toBe(d);await notHeld(page);
 // Back: the route becomes inactive.
 await tracking(page).focus();await keyDown(page,'n');await advance(page,1);d+=n;
 await page.goBack();await flushTasks(page);await expect(id(page,'radio-control')).toBeHidden();
 await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','route-inactive');
 await advance(page,2);expect(await dec(page)).toBe(d);await keyUp(page,'n');
 await page.goForward();await flushTasks(page);await expect(id(page,'radio-control')).toBeVisible();await notHeld(page);await advance(page,2);expect(await dec(page)).toBe(d);
 // A held restore (project operation): cancelled; a key press while it runs starts nothing.
 await tracking(page).focus();await keyDown(page,'n');await advance(page,1);d+=n;
 await restore(page,'held-keyboard.json',before.toString('utf8'));await held(page,'held-keyboard.json');await flushTasks(page);
 await expect(id(page,'antenna-manual-cancelled')).toHaveAttribute('data-reason','host-busy');
 await advance(page,2);expect(await dec(page)).toBe(d);await keyUp(page,'n');
 await tracking(page).focus();await keyDown(page,'n');await advance(page,2);expect(await dec(page)).toBe(d);await notHeld(page);await keyUp(page,'n');
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await flushTasks(page);
 await releaseRead(page,'held-keyboard.json');await flushTasks(page);
 // A fresh press works; a cross release leaves S disabled; the saved investigation bytes are unchanged.
 await tracking(page).focus();await keyDown(page,'n');await advance(page,1);d+=n;await keyDown(page,'s');await keyUp(page,'s');await keyUp(page,'n');
 expect(await dec(page)).toBe(d);await expect(pad(page,'south')).toHaveAttribute('data-left-disabled','true');
 await page.clock.resume();
 expect((await save(page)).equals(before)).toBe(true);
});

test('owner isolation: a mouse or Space hold ignores table keys; a table hold ignores the mouse and Space',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 const n=500*K;let d=await dec(page);
 // Mouse holds N (declared deviation: natively an S KeyUp would release it through SBtnMouseUp).
 await holdMouse(page,pad(page,'north'));await keyDown(page,'s');await keyUp(page,'s');await keyDown(page,'n');await keyUp(page,'n');
 await advance(page,2);d+=n;d+=n;expect(await dec(page)).toBe(d);await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 await page.mouse.up();await flushTasks(page);await notHeld(page);await expect(pad(page,'south')).not.toHaveAttribute('data-left-disabled');
 // Space holds N: table keys change nothing.
 await pad(page,'north').focus();await keyDown(page,'Space');await keyDown(page,'s');await keyUp(page,'s');await keyDown(page,'e');await keyUp(page,'e');
 await advance(page,1);d+=n;expect(await dec(page)).toBe(d);await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 await keyUp(page,'Space');await notHeld(page);
 // A table key holds N: the mouse on N and Space on N change nothing; the N key release ends it.
 await tracking(page).focus();await keyDown(page,'n');await advance(page,1);d+=n;
 await holdMouse(page,pad(page,'north'));await page.mouse.up();await flushTasks(page);
 await pad(page,'north').focus();await keyDown(page,'Space');await keyUp(page,'Space');
 await advance(page,1);d+=n;expect(await dec(page)).toBe(d);await expect(pad(page,'north')).toHaveAttribute('data-held','true');
 await keyUp(page,'n');await notHeld(page);await advance(page,1);expect(await dec(page)).toBe(d);
});

test('limits: no clock refuses the key press; a horizon failure during an S key hold opens the box, the held key cannot answer it, OK and a fresh press work',async({page})=>{
 await openRadio(page);await setupRadio(page);await applyLimits(page);await trackingOn(page);
 await tracking(page).focus();await keyDown(page,'n');
 await expect(id(page,'antenna-status')).toContainText('need an accepted radio clock tick first');await expect(tracking(page)).toBeFocused();await notHeld(page);await keyUp(page,'n');
 // As in the altitude spec: the first clock tick with Tracking off (drift branch, RA := LST), then Tracking on.
 await tracking(page).click();await flushTasks(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking off');
 await supplyClock(page);await controlledClock(page);
 await id(page,'antenna-clock-tick').click();await flushTasks(page);expect(await ra(page)).toBe(await lst(page));
 await trackingOn(page);
 await id(page,'antenna-set-coordinates').click();for(const [i,v] of [...fieldsOf(await lst(page)),'-41','24','0'].entries())await id(page,`antenna-field-${FIELDS[i]}`).fill(v);
 await id(page,'antenna-dialog-ok').click();await flushTasks(page);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flushTasks(page);
 await untilArrival(page);expect(await dec(page)).toBe(-41.4);
 // S from −41.4° at HA ≈ 0: the proposed −42.79° (altitude ≈ 8.8°) fails on the first tick.
 await tracking(page).focus();await keyDown(page,'s');await expect(pad(page,'south')).toHaveAttribute('data-held','true');
 await advance(page,1);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','altitude-limit-manual');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await keyDown(page,'s');await keyUp(page,'s');// the repeat and the release reach OK, outside the key scope
 await expect(id(page,'antenna-notice')).toHaveCount(1);await expect(id(page,'antenna-notice-ok')).toBeFocused();expect(await dec(page)).toBe(-41.4);
 await expect(id(page,'antenna-manual-cancelled')).toHaveCount(0);
 await page.keyboard.press('Enter');await flushTasks(page);await expect(id(page,'antenna-notice')).toHaveCount(0);
 await tracking(page).focus();await keyDown(page,'n');await advance(page,1);await keyUp(page,'n');
 expect(await dec(page)).toBe(-41.4+5000*K);
});

test('pole: after a crossing the N key still holds the original N button, now captioned S',async({page})=>{
 await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
 await slewTo(page,['0','0','0','89','30','0']);await untilArrival(page);expect(await dec(page)).toBe(89.5);
 await tracking(page).focus();await keyDown(page,'n');await advance(page,1);await keyUp(page,'n');
 const x=89.5+5000*K;expect(await dec(page)).toBe(180-x);expect(await ra(page)).toBe(12);
 await expect(pad(page,'north')).toHaveText('S');await expect(pad(page,'south')).toHaveText('N');
 await tracking(page).focus();await keyDown(page,'n');
 await expect(pad(page,'north')).toHaveAttribute('data-held','true');await expect(pad(page,'north')).toBeFocused();await expect(id(page,'antenna-motion')).toContainText('the S button is held');
 await advance(page,1);await keyUp(page,'n');expect(await dec(page)).toBe((180-x)-5000*K);
});

test.describe('touch device with a hardware keyboard (375 px)',()=>{
 test.use({viewport:{width:375,height:812},hasTouch:true});
 test('letters hold and cross-release; the leftover note is visible and the panel does not overflow',async({page},info)=>{
  await openRadio(page);await setupRadio(page);await trackingOn(page);await controlledClock(page);
  const n=500*K,d0=await dec(page);
  await tracking(page).focus();await keyDown(page,'n');await expect(pad(page,'north')).toBeFocused();await advance(page,1);
  await keyDown(page,'w');await keyUp(page,'w');await keyUp(page,'n');
  expect(await dec(page)).toBe(d0+n);await expect(pad(page,'west')).toBeDisabled();
  await id(page,'antenna-manual-leftover').scrollIntoViewIfNeeded();await expect(id(page,'antenna-manual-leftover')).toBeVisible();
  await expect(id(page,'antenna-manual-leftover')).toContainText('W button');
  await expect.poll(()=>id(page,'radio-panel-window').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(0);
  await id(page,'antenna-controls').screenshot({path:info.outputPath('radio-keyboard-375.png')});
 });
});
