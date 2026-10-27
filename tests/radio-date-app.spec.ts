import {test,expect,type Locator,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
// Actual App flows of File ▸ Set Observation Date/Time, ID before radio activation (docs/RADIO-CONTROL.md, RC-12…RC-17,
// WEB-DATE-01…04): gate, captions and prefill, the early ID write, error boxes, Cancel, the clock application, the sticky
// activation latch, modality, route re-entry, a project operation cancelled by route return, the range-end gate closing
// while open, the panel's surfaces released by Back in the same commit, and narrow layouts. No harness and no product debug
// hook: only the rendered App, browser history, the test-only file-read hold and a test-only focusin log. Values are the
// chosen web contract, not native oracles; an 'unsupported' box is a browser limit, not a recovered native error.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const header=(page:Page)=>page.locator('.portal-header'),toolbar=(page:Page)=>page.locator('.investigation-toolbar');
const layer=(page:Page)=>id(page,'radio-date-layer');
const file=(name:string,text:string,mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(text,'latin1')});
const restore=(page:Page,name:string,text:string)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles(file(name,text,'application/json'));
/** Whether programmatic focus can land on the element (false under inert or behind a native modal dialog). */
const focusable=(target:Locator)=>target.evaluate(el=>{(el as HTMLElement).focus();return document.activeElement===el;});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const boxFits=(target:Locator)=>expect.poll(()=>target.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(0);
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

const menu=(page:Page)=>id(page,'radio-date-menu'),dialog=(page:Page)=>id(page,'radio-date-dialog'),box=(page:Page)=>id(page,'radio-date-error');
const field=(page:Page,name:'id'|'date'|'time')=>id(page,`radio-date-field-${name}`);
async function hostReleased(page:Page){await expect(header(page)).not.toHaveAttribute('inert');await expect(toolbar(page)).not.toHaveAttribute('inert');await expect(layer(page)).toHaveAttribute('data-modal-presented','false');}
async function hostHeld(page:Page){await expect(header(page)).toHaveAttribute('inert','');await expect(toolbar(page)).toHaveAttribute('inert','');await expect(layer(page)).toHaveAttribute('data-modal-presented','true');}
/** Test-only focusin log, installed once per page (H1:text, data-testid, else TAG:text). It observes the App and changes nothing. */
const recordFocus=(page:Page)=>page.evaluate(()=>{const w=window as unknown as{__radioFocusEvents:string[]};w.__radioFocusEvents=[];document.addEventListener('focusin',event=>{const el=event.target;if(el instanceof HTMLElement&&w.__radioFocusEvents.length<50)w.__radioFocusEvents.push(el.tagName==='H1'?`H1:${el.textContent}`:el.getAttribute('data-testid')??`${el.tagName}:${el.textContent?.trim()}`);});});
const focusEvents=(page:Page)=>page.evaluate(()=>(window as unknown as{__radioFocusEvents:string[]}).__radioFocusEvents);

async function openRadio(page:Page){
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-control')).toBeVisible();
}
async function applyUT(page:Page,utc:string){
 await id(page,'radio-clock-utc').fill(utc);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${utc} UT`);
}
/** Exercise entered and a paused UT applied: the item is available. */
async function ready(page:Page,utc='2009-06-01T04:05:06'){
 await openRadio(page);await id(page,'radio-exercise').click();await applyUT(page,utc);await expect(menu(page)).toBeEnabled();
}
async function openDialog(page:Page){await menu(page).click();await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toBeFocused();}
/** Access with the compiled defaults, the manual access tick and switch On (first FormActivate). */
async function switchOn(page:Page){
 await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
}

test('gate: exercise, then UT; exact captions, scenario prefill, empty ID, date field focused and selected; the whole App is behind the dialog; Cancel returns focus',async({page})=>{
 await openRadio(page);
 await expect(menu(page)).toHaveText('Set Observation Date/Time, ID...');
 await expect(menu(page)).toBeDisabled();await expect(id(page,'radio-date-reason')).toHaveAttribute('data-reason','exercise-required');
 await expect(id(page,'radio-date-reason')).toHaveText('Unavailable: choose Radio Astronomy of Pulsars first.');
 await id(page,'radio-exercise').click();
 await expect(menu(page)).toBeDisabled();await expect(id(page,'radio-date-reason')).toHaveAttribute('data-reason','ut-required');
 await applyUT(page,'2009-06-01T04:05:06');
 await expect(menu(page)).toBeEnabled();await expect(id(page,'radio-date-reason')).toHaveText('Available until the radio panel is first shown.');
 await expect(id(page,'radio-date-stored')).toHaveText('None written');await expect(id(page,'radio-date-stored')).toHaveAttribute('data-stored-id','');
 await hostReleased(page);
 await openDialog(page);
 await expect(page.getByRole('dialog',{name:'Set Date/Time, ID'})).toBeVisible();
 for(const text of ['ID # of Unknown Object','(From Lab Sheet or Instructor)','Get ID from lab sheet or instructor','Observation Date','YYYY/MM/DD','Enter full (4 digit) year','Universal Time (UTC)','HH:MM:SS','Use 24 hr format.'])
  await expect(dialog(page)).toContainText(text);
 await expect(page.getByLabel('ID # of Unknown Object',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('Observation Date',{exact:true})).toHaveValue('2009/06/01');
 await expect(page.getByLabel('Universal Time (UTC)',{exact:true})).toHaveValue('04:05:06');
 expect(await field(page,'date').evaluate(el=>[(el as HTMLInputElement).selectionStart,(el as HTMLInputElement).selectionEnd])).toEqual([0,10]);
 await expect(id(page,'radio-date-bounds')).toContainText('date and time up to 32 characters, ID up to 18');
 // Application-modal: App header and toolbar, the route cards and the whole panel are inert.
 await hostHeld(page);await expect(layer(page)).toHaveAttribute('data-modal-pending','true');
 for(const target of [nav(page,'Observatory'),id(page,'radio-clock-utc'),id(page,'radio-exercise'),id(page,'radio-env-compiled')])expect(await focusable(target)).toBe(false);
 await expect(id(page,'radio-route-date')).toHaveAttribute('inert','');await expect(id(page,'radio-route-scenario')).toHaveAttribute('inert','');
 await expect(id(page,'radio-route-clock')).toHaveAttribute('inert','');await expect(id(page,'radio-route-panel-wrapper')).toHaveAttribute('inert','');
 await field(page,'date').focus();
 // Tab stays inside: from Cancel to the first field (layout order, ID first).
 await id(page,'radio-date-cancel').focus();await page.keyboard.press('Tab');await expect(field(page,'id')).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(id(page,'radio-date-cancel')).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog(page)).toHaveCount(0);await expect(menu(page)).toBeFocused();
 await expect(id(page,'radio-date-status')).toHaveText('Set Date/Time, ID cancelled; the radio UT is unchanged.');
 await expect(id(page,'radio-clock-applied')).toHaveText('2009-06-01T04:05:06 UT');await expect(id(page,'radio-date-stored')).toHaveText('None written');
 await hostReleased(page);await expect(id(page,'radio-route-panel-wrapper')).not.toHaveAttribute('inert');
});

test('an invalid date writes the ID first: the box closes alone on Escape, the next Escape cancels, the ID stays and prefills the next open; Cancel without OK keeps it',async({page})=>{
 await ready(page);await openDialog(page);
 await field(page,'id').fill('A1');await field(page,'date').fill('2009/13/01');await id(page,'radio-date-ok').click();
 await expect(box(page)).toHaveAttribute('data-kind','error');await expect(box(page)).toHaveAttribute('data-reason','calendar');
 await expect(page.getByRole('alertdialog',{name:'Invalid date'})).toBeVisible();
 await expect(id(page,'radio-date-error-text')).toHaveText('“2009/13/01” is not a valid date: that month or day does not exist.');
 await expect(id(page,'radio-date-error-note')).toContainText('runtime-library wording is not reproduced');
 await expect(id(page,'radio-date-error-id')).toHaveText('The ID “A1” was written when OK was pressed; Cancel keeps it.');
 await expect(id(page,'radio-date-error-ok')).toBeFocused();await expect(dialog(page)).toHaveAttribute('inert','');await hostHeld(page);
 expect(await focusable(field(page,'date'))).toBe(false);
 await page.keyboard.press('Escape');await expect(box(page)).toHaveCount(0);await expect(dialog(page)).toBeVisible();
 await expect(id(page,'radio-date-ok')).toBeFocused();// the control that chose OK
 await expect(field(page,'date')).toHaveValue('2009/13/01');await expect(field(page,'id')).toHaveValue('A1');
 await page.keyboard.press('Escape');await expect(dialog(page)).toHaveCount(0);await expect(menu(page)).toBeFocused();await hostReleased(page);
 await expect(id(page,'radio-date-stored')).toHaveText('“A1”');await expect(id(page,'radio-date-stored')).toHaveAttribute('data-stored-id','A1');
 await expect(id(page,'radio-clock-applied')).toHaveText('2009-06-01T04:05:06 UT');// nothing applied
 // A fresh form: the stored ID and a new prefill from the scenario.
 await openDialog(page);await expect(field(page,'id')).toHaveValue('A1');await expect(field(page,'date')).toHaveValue('2009/06/01');await expect(field(page,'time')).toHaveValue('04:05:06');
 await field(page,'id').fill('B2');await id(page,'radio-date-cancel').click();await expect(dialog(page)).toHaveCount(0);await expect(menu(page)).toBeFocused();
 await expect(id(page,'radio-date-stored')).toHaveAttribute('data-stored-id','A1');
});

test('Enter in a field chooses OK once; Enter on the box closes only the box (held Enter does nothing more); the dialog stays open with its text',async({page})=>{
 await ready(page);await openDialog(page);
 await field(page,'date').fill('2009/06/01//');
 await page.keyboard.down('Enter');await expect(box(page)).toHaveAttribute('data-reason','trailing');await expect(id(page,'radio-date-error-ok')).toBeFocused();
 await page.keyboard.down('Enter');await expect(box(page)).toBeVisible();// auto-repeat ignored
 await page.keyboard.up('Enter');
 await page.keyboard.press('Enter');await expect(box(page)).toHaveCount(0);await expect(dialog(page)).toBeVisible();
 await expect(field(page,'date')).toBeFocused();await expect(field(page,'date')).toHaveValue('2009/06/01//');
 await expect(id(page,'radio-date-stored')).toHaveText('“UNKNOWN”');// empty ID written as UNKNOWN before the date failed
 // Held Escape: the first closes the dialog, the repeat does nothing to the focused menu item.
 await page.keyboard.down('Escape');await expect(dialog(page)).toHaveCount(0);await expect(menu(page)).toBeFocused();
 await page.keyboard.down('Escape');await page.keyboard.up('Escape');await expect(dialog(page)).toHaveCount(0);
 await expect(id(page,'radio-clock-applied')).toHaveText('2009-06-01T04:05:06 UT');
});

test('success keeps the running or paused clock and the longitude, changes nothing on the antenna before switch On; after On the clock reads the new UT and the item stays refused, also after closing the panel',async({page})=>{
 await openRadio(page);await id(page,'radio-exercise').click();await applyUT(page,'2000-01-01T12:00:00');
 await id(page,'radio-clock-longitude').click();const lon=await id(page,'radio-clock-lon').getAttribute('data-longitude-radians');expect(lon).toBe('-1.393499963671317');
 // Running: OK keeps it running from the new UT.
 await id(page,'radio-clock-start').click();await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');
 await openDialog(page);await expect(field(page,'date')).toHaveValue('2000/01/01');
 await field(page,'date').fill('2010/01/01');await field(page,'time').fill('00:00:00');await id(page,'radio-date-ok').click();
 await expect(dialog(page)).toHaveCount(0);await expect(menu(page)).toBeFocused();
 await expect(id(page,'radio-clock-applied')).toHaveText('2010-01-01T00:00:00 UT');await expect(id(page,'radio-clock-utc')).toHaveValue('2010-01-01T00:00:00');
 await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','true');await expect(id(page,'radio-clock-state')).toContainText('Running');
 await expect(id(page,'radio-clock-status')).toHaveText('UT applied from Set Date/Time, ID; the radio clock keeps running or stays paused as before.');
 await expect(id(page,'radio-date-status')).toHaveText('Observation date applied: the radio UT is now 2010-01-01T00:00:00 UT. The antenna is unchanged until the panel is switched on.');
 await expect(id(page,'radio-date-stored')).toHaveText('“UNKNOWN”');await expect(id(page,'radio-clock-lon')).toHaveAttribute('data-longitude-radians',lon!);
 // Paused: OK keeps it paused at the new UT; 1:00:00 PM is 13 h; the stored UNKNOWN prefills the ID.
 await id(page,'radio-clock-pause').click();await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','false');
 await openDialog(page);await expect(field(page,'id')).toHaveValue('UNKNOWN');await expect(field(page,'date')).toHaveValue('2010/01/01');
 await field(page,'id').fill(' Obj 7 ');await field(page,'time').fill('1:00:00 PM');await field(page,'time').press('Enter');
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'radio-route-clock')).toHaveAttribute('data-running','false');
 await expect(id(page,'radio-clock-state')).toHaveText('Paused at 2010-01-01T13:00:00.000Z (scenario time).');
 await expect(id(page,'radio-date-stored')).toHaveAttribute('data-stored-id',' Obj 7 ');
 // Nothing on the antenna before switch On: no panel window, no antenna outcome.
 await expect(id(page,'radio-panel-window')).toHaveCount(0);await expect(id(page,'antenna-status')).toHaveText('');
 await switchOn(page);
 await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');
 await id(page,'antenna-clock-tick').click();await expect(id(page,'antenna-clock-ut')).toHaveAttribute('data-ut-ms',String(Date.UTC(2010,0,1,13)));
 // Sticky latch: refused after On, after closing the panel (switch Off) and with the UT still applied.
 await expect(menu(page)).toBeDisabled();await expect(id(page,'radio-date-reason')).toHaveAttribute('data-reason','activation-reached');
 await expect(id(page,'radio-date-reason')).toContainText('the optical telescope’s longitude');
 await id(page,'radio-panel-close').click();await expect(id(page,'radio-panel-window')).toHaveCount(0);await expect(id(page,'radio-switch')).toHaveAttribute('aria-checked','false');
 await expect(menu(page)).toBeDisabled();await expect(id(page,'radio-date-reason')).toHaveAttribute('data-reason','activation-reached');
 await applyUT(page,'2011-01-01T00:00:00');await expect(menu(page)).toBeDisabled();
});

test('field bounds are refused at the field; unsupported time forms, host-year dates and out-of-range results open browser-limit boxes and still write the ID',async({page})=>{
 await ready(page);await openDialog(page);
 const refusal=id(page,'radio-date-field-refusal');
 await field(page,'id').fill('x'.repeat(18));await expect(field(page,'id')).toHaveValue('x'.repeat(18));await expect(refusal).toHaveText('');
 await field(page,'id').fill('y'.repeat(19));await expect(field(page,'id')).toHaveValue('x'.repeat(18));
 await expect(refusal).toHaveText('Edit refused: at most 18 characters.');await expect(refusal).toHaveAttribute('data-field','id');await expect(field(page,'id')).toHaveAttribute('aria-invalid','true');
 await field(page,'id').fill('Å1');await expect(field(page,'id')).toHaveValue('x'.repeat(18));await expect(refusal).toHaveText('Edit refused: only printable ASCII characters (space to ~) are accepted.');
 await field(page,'date').fill('2'.repeat(33));await expect(field(page,'date')).toHaveValue('2009/06/01');await expect(refusal).toHaveText('Edit refused: at most 32 characters.');
 await field(page,'time').fill('04:05:06 ü');await expect(field(page,'time')).toHaveValue('04:05:06');await expect(refusal).toHaveAttribute('data-field','time');
 await field(page,'id').fill(' A B ');await expect(refusal).toHaveText('');await expect(field(page,'id')).not.toHaveAttribute('aria-invalid');
 const cases:[string,string,string,string,string][]=[
  ['2009/06/01','1e1','time','form','The time “1e1” is outside this browser subset: hours, minutes and seconds must be whole numbers, without a decimal point or exponent.'],
  ['2009/06/01','12:30 PM','time','spelling','The time “12:30 PM” is outside this browser subset'],
  ['2009/06/01','1000001','time','large','each part must be at most 1000000 in size.'],
  ['09/06/01','04:05:06','date','host-year','“09/06/01” has only two numbers or a one- or two-digit year. The original would take the year from this computer’s clock, or reject such a date whatever that year is'],
  ['0009/06/01','04:05:06','range','domain','The resulting UT is outside the supported range 1900-01-01T00:00:00Z to 2099-12-31T23:59:59Z.'],
 ];
 for(const [date,time,f,reason,text] of cases){
  await field(page,'date').fill(date);await field(page,'time').fill(time);await id(page,'radio-date-ok').click();
  await expect(box(page)).toHaveAttribute('data-kind','unsupported');await expect(box(page)).toHaveAttribute('data-field',f);await expect(box(page)).toHaveAttribute('data-reason',reason);
  await expect(page.getByRole('alertdialog',{name:'Browser limit'})).toBeVisible();await expect(id(page,'radio-date-error-text')).toContainText(text);
  await expect(id(page,'radio-date-error-note')).toHaveText('Browser limit, not an error recovered from the original.');
  await page.keyboard.press('Escape');await expect(box(page)).toHaveCount(0);await expect(dialog(page)).toBeVisible();
 }
 await expect(id(page,'radio-date-stored')).toHaveAttribute('data-stored-id',' A B ');// spaces kept, written before parsing
 await expect(id(page,'radio-clock-applied')).toHaveText('2009-06-01T04:05:06 UT');
 // Whole-number edge accepted: 2099-12-31 23:59:59 is the last instant.
 await field(page,'date').fill(' 2099 / 12 / 31 / ');await field(page,'time').fill('23:59:59');await id(page,'radio-date-ok').click();
 await expect(dialog(page)).toHaveCount(0);await expect(id(page,'radio-clock-applied')).toHaveText('2099-12-31T23:59:59 UT');
});

test('route re-entry hides the open dialog without losing it and a project operation started elsewhere is cancelled by the return; it returns with focus on the date field; 320 px, 375 px and desktop layouts fit',async({page},info)=>{
 await holdReads(page);await ready(page);await openDialog(page);await hostHeld(page);
 await field(page,'id').fill('R1');await field(page,'time').fill('05:00:00');
 // Back: the dialog is not presented on another route and the App header is released.
 await page.goBack();await expect(id(page,'radio-control')).toBeHidden();await expect(dialog(page)).toHaveCount(0);await hostReleased(page);
 await expect(heading(page,'Start with the sky.')).toBeFocused();
 await page.goForward();await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toBeFocused();
 await expect(field(page,'id')).toHaveValue('R1');await expect(field(page,'time')).toHaveValue('05:00:00');
 await hostHeld(page);await expect(heading(page,'Radio telescope control')).not.toBeFocused();
 // A project operation started on another route: the return is a hashchange, which cancels it (OpenVireo cancels on
 // every route change), so the dialog comes back at once. Busy suppression has no normal App path (the toolbar is inert
 // while the dialog is presented; the route is inert while busy); it is checked only with a controlled route host.
 await page.goBack();await restore(page,'held-date.json','{}');await held(page,'held-date.json');
 await expect(page.getByRole('button',{name:'Cancel pending save/restore',exact:true})).toBeVisible();
 await page.goForward();await expect(id(page,'radio-control')).toBeVisible();
 await expect(page.getByRole('button',{name:'Cancel pending save/restore',exact:true})).toHaveCount(0);
 await expect(toolbar(page)).toContainText('Pending investigation operation cancelled.');
 await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toBeFocused();await expect(field(page,'id')).toHaveValue('R1');await hostHeld(page);
 await release(page,'held-date.json');await expect(dialog(page)).toBeVisible();await expect(field(page,'id')).toHaveValue('R1');
 // An error box over the dialog survives a route change too, and closes alone.
 await field(page,'date').fill('2009-06-01');await id(page,'radio-date-ok').click();await expect(box(page)).toHaveAttribute('data-reason','syntax');
 await page.goBack();await expect(box(page)).toHaveCount(0);await page.goForward();
 await expect(box(page)).toBeVisible();await expect(id(page,'radio-date-error-ok')).toBeFocused();
 await page.keyboard.press('Escape');await expect(box(page)).toHaveCount(0);await expect(field(page,'date')).toBeFocused();
 await field(page,'date').fill('2009/06/01');
 for(const [name,width,height] of [['320',320,800],['375',375,812],['desktop',1440,1050]] as const){
  await page.setViewportSize({width,height});
  await boxFits(dialog(page));await expect(id(page,'radio-date-ok')).toBeVisible();await expect(id(page,'radio-date-cancel')).toBeVisible();
  await expect.poll(()=>dialog(page).evaluate(el=>el.getBoundingClientRect().right<=document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`radio-date-dialog-${name}.png`),fullPage:true});
 }
 await id(page,'radio-date-ok').click();await expect(dialog(page)).toHaveCount(0);await hostReleased(page);
 await expect(id(page,'radio-clock-applied')).toHaveText('2009-06-01T05:00:00 UT');await expect(id(page,'radio-date-stored')).toHaveAttribute('data-stored-id','R1');
 for(const [name,width,height] of [['320',320,800],['375',375,812],['desktop',1440,1050]] as const){
  await page.setViewportSize({width,height});await boxFits(id(page,'radio-route-date'));
  await page.screenshot({path:info.outputPath(`radio-date-card-${name}.png`),fullPage:true});
 }
 await noOverflow(page);
});

test('a panel dialog or box hidden by Back releases the App in the same commit: the observatory heading takes focus; Forward presents it again without an intermediate route-heading focus',async({page})=>{
 const panel=id(page,'radio-control'),notice=id(page,'antenna-notice');
 await openRadio(page);await id(page,'radio-exercise').click();await switchOn(page);
 await id(page,'antenna-tracking').click();await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();await id(page,'antenna-field-raHours').fill('7');
 await expect(header(page)).toHaveAttribute('inert','');await expect(toolbar(page)).toHaveAttribute('inert','');await expect(panel).toHaveAttribute('data-modal-presented','true');
 await recordFocus(page);
 // The coordinate dialog.
 await page.goBack();await expect(panel).toBeHidden();await expect(id(page,'antenna-dialog')).toHaveCount(0);
 await expect(header(page)).not.toHaveAttribute('inert');await expect(toolbar(page)).not.toHaveAttribute('inert');
 await expect(heading(page,'Start with the sky.')).toBeFocused();
 let seen=(await focusEvents(page)).length;
 await page.goForward();await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-field-raHours')).toHaveValue('7');
 await expect(id(page,'antenna-field-raHours')).toBeFocused();await expect(header(page)).toHaveAttribute('inert','');
 expect((await focusEvents(page)).slice(seen).filter(e=>e.startsWith('H1:'))).toEqual([]);
 // The error box over the dialog.
 await id(page,'antenna-field-raHours').fill('25');await id(page,'antenna-dialog-ok').click();
 await expect(notice).toHaveAttribute('data-kind','ra-invalid');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await page.goBack();await expect(panel).toBeHidden();await expect(notice).toHaveCount(0);
 await expect(header(page)).not.toHaveAttribute('inert');await expect(toolbar(page)).not.toHaveAttribute('inert');
 await expect(heading(page,'Start with the sky.')).toBeFocused();
 seen=(await focusEvents(page)).length;
 await page.goForward();await expect(notice).toHaveAttribute('data-kind','ra-invalid');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await expect(header(page)).toHaveAttribute('inert','');
 expect((await focusEvents(page)).slice(seen).filter(e=>e.startsWith('H1:'))).toEqual([]);
 await page.keyboard.press('Escape');await expect(notice).toHaveCount(0);await expect(id(page,'antenna-field-raHours')).toHaveValue('25');
 await page.keyboard.press('Escape');await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-set-coordinates')).toBeFocused();
 await expect(header(page)).not.toHaveAttribute('inert');await expect(panel).toHaveAttribute('data-modal-presented','false');
});

/** A running clock 2 s before the range end with the dialog open; the stop closes the gate while it stays open. */
async function openAtRangeEnd(page:Page){
 await openRadio(page);await id(page,'radio-exercise').click();await applyUT(page,'2099-12-31T23:59:58');
 await id(page,'radio-clock-longitude').click();await id(page,'radio-clock-start').click();await openDialog(page);
 await expect(menu(page)).toBeDisabled();await expect(id(page,'radio-date-reason')).toHaveAttribute('data-reason','ut-domain');
 await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toBeFocused();
}
/** The focused Radio UT field applies a new UT and the item is offered again. */
async function recoverByUT(page:Page){
 await id(page,'radio-clock-utc').fill('2099-12-31T23:00:00');await id(page,'radio-clock-utc').press('Enter');
 await expect(id(page,'radio-clock-applied')).toHaveText('2099-12-31T23:00:00 UT');await expect(menu(page)).toBeEnabled();
}

test('the range-end gate closing while the dialog is open: Cancel returns focus to the Radio UT field (the item is disabled); a suppression moves no focus; nothing is written',async({page})=>{
 await openAtRangeEnd(page);
 // A suppression (another route) must not move focus to the UT field.
 await page.goBack();await expect(dialog(page)).toHaveCount(0);await expect(heading(page,'Start with the sky.')).toBeFocused();
 await page.goForward();await expect(dialog(page)).toBeVisible();await expect(field(page,'date')).toBeFocused();
 await id(page,'radio-date-cancel').click();await expect(dialog(page)).toHaveCount(0);
 await expect(id(page,'radio-date-status')).toHaveText('Set Date/Time, ID cancelled; the radio UT is unchanged.');
 await expect(id(page,'radio-clock-utc')).toBeFocused();await hostReleased(page);
 await expect(id(page,'radio-clock-applied')).toHaveText('2099-12-31T23:59:58 UT');await expect(id(page,'radio-date-stored')).toHaveText('None written');
 await recoverByUT(page);
});

test('the range-end gate closing while the dialog is open: OK closes it without writing the ID or the UT and returns focus to the Radio UT field',async({page})=>{
 await openAtRangeEnd(page);
 await field(page,'id').fill('UNCOMMITTED');await field(page,'date').fill('2099/12/31');await id(page,'radio-date-ok').click();
 await expect(dialog(page)).toHaveCount(0);await expect(box(page)).toHaveCount(0);
 await expect(id(page,'radio-date-status')).toHaveText('The dialog closed without applying a date because the item is no longer available.');
 await expect(id(page,'radio-clock-utc')).toBeFocused();await hostReleased(page);
 await expect(id(page,'radio-date-stored')).toHaveAttribute('data-stored-id','');
 await expect(id(page,'radio-clock-applied')).toHaveText('2099-12-31T23:59:58 UT');await expect(id(page,'radio-clock-state')).toContainText('Stopped: scenario time passed');
 await recoverByUT(page);
});
