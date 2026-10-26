import {test,expect,type Locator,type Page,type TestInfo} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {CONTROL,PLR,ROW_A,ROW_C} from './fixtures/pulsar-saved-rows-controls';
// Actual App flows of the bounded integration (docs/RADIO-SAVED-ROWS-INTEGRATION.md): the supplied saved-row viewer in its
// #pulsar-analysis disclosure and the #radio-control route, with the host's route, project-busy and modal ownership.
// No harness and no product debug hook: only the rendered App, browser history and test-only file-read holds installed
// by addInitScript. Fixtures are synthetic UI controls, not observations, not CLEA output and not a writer oracle.
// Flows use the real browser scheduler except explicit controlled-clock lifecycle checks after lazy tools load.
// Nominal 100 ms ticks are the chosen web contract, not Windows timing.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const header=(page:Page)=>page.locator('.portal-header'),toolbar=(page:Page)=>page.locator('.investigation-toolbar');
const file=(name:string,text:string,mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(text,'latin1')});
const sha=(text:string)=>createHash('sha256').update(Buffer.from(text,'latin1')).digest('hex');
const settle=(page:Page)=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,100))));
/** Let React commit without advancing the controlled page clock; close test ports after each task. */
async function flushTasks(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
/** Tap on the touch project, click on desktop: the same App controls through both input paths. */
const press=(info:TestInfo,target:Locator)=>info.project.name==='touch-375'?target.tap():target.click();
/** Whether programmatic focus can land on the element (false behind a native modal dialog or under inert). */
const focusable=(target:Locator)=>target.evaluate(el=>{(el as HTMLElement).focus();return document.activeElement===el;});
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const restore=(page:Page,name:string,text:string)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles(file(name,text,'application/json'));

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

// ----------------------------------------------------------------------------------------------- PLR and saved rows
async function loadPlr(page:Page){
 await id(page,'pulsar-file').setInputFiles(file('synthetic-e2e.plr',PLR,'application/octet-stream'));
 await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));await id(page,'pulsar-properties-close').click();
}
/** One manual measurement through the existing keyboard cursor access and the native Record dialog. */
async function recordManual(page:Page,comment:string){
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
}
async function expectManual(page:Page,count:number,comment:string){
 await expect(id(page,'pulsar-count')).toHaveText(`${count} recorded measurements`);await expect(id(page,'pulsar-sha')).toHaveText(sha(PLR));
 await id(page,'pulsar-review').click();await expect(id(page,'pulsar-entry-1')).toContainText(comment);
 await expect(page.locator('[data-testid^="pulsar-entry-"]')).toHaveCount(count);await id(page,'pulsar-review-cancel').click();
 await expect(id(page,'pulsar-review-dialog')).toHaveCount(0);
}
const disclosure=(page:Page)=>id(page,'saved-rows-disclosure');
const toggleDisclosure=(page:Page)=>disclosure(page).locator('summary').click();
const choose=(page:Page,name:string,text:string)=>id(page,'saved-rows-file').setInputFiles(file(name,text));
async function useFile(page:Page,name='control.csv',text=CONTROL){
 await choose(page,name,text);await expect(id(page,'saved-rows-candidate')).toBeVisible();await id(page,'saved-rows-use').click();
 await expect(id(page,'saved-rows-identity-name')).toHaveText(name);
}
const selectedRow=(page:Page)=>page.locator('[data-testid^="saved-rows-row-"][aria-selected="true"]');
const findDialog=(page:Page)=>id(page,'saved-rows-find-dialog');
async function runFind(page:Page,query:string|null,button:'saved-rows-from-top'|'saved-rows-from-cursor'|'saved-rows-find-cancel',caseDependent?:boolean){
 await id(page,'saved-rows-find').click();await expect(findDialog(page)).toBeVisible();
 if(query!==null)await id(page,'saved-rows-query').fill(query);
 if(caseDependent!==undefined)await id(page,'saved-rows-case').setChecked(caseDependent);
 await id(page,button).click();await expect(findDialog(page)).toHaveCount(0);
}
const CANCEL_KEPT='The file in use, its selection and the Find text are unchanged. A checked file that was waiting for Use when this read started was replaced by it and is not restored.';
const inactiveCancel=(name:string)=>`Reading ${name} was cancelled because the viewer was made inactive. ${CANCEL_KEPT}`;

test('saved rows in the actual PLR route: separate lazy disclosure, candidate/reject/discard/reimport, exact download, recovered Find and held keys; manual PLR work unchanged',async({page},info)=>{
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
 await loadPlr(page);await recordManual(page,'manual kept');
 await expect(disclosure(page)).not.toHaveAttribute('open');await expect(id(page,'saved-rows')).toHaveCount(0);// lazy: not mounted before first use
 await press(info,disclosure(page).locator('summary'));
 await expect(id(page,'saved-rows')).toBeVisible();await expect(id(page,'saved-rows')).toHaveAttribute('data-active','true');
 await expect(disclosure(page)).toContainText('It is not included in Save investigation and is not restored from an investigation file; reloading the page empties it.');
 await expect(id(page,'saved-rows-separate')).toContainText('does not change the current recording');await expect(id(page,'saved-rows-separate')).toContainText('Save investigation does not include them');
 // Candidate: inspected, not in use until Use; Discard keeps nothing; a rejection leaves the file in use.
 await choose(page,'control.csv',CONTROL);
 await expect(id(page,'saved-rows-candidate-identity-sha')).toHaveText(sha(CONTROL));await expect(id(page,'saved-rows-candidate-identity-rows')).toHaveText('4 (3 with a file name column, 1 without)');
 await expect(id(page,'saved-rows-none')).toBeVisible();
 await id(page,'saved-rows-discard').click();await expect(id(page,'saved-rows-status')).toHaveText('Checked file discarded. The file in use is unchanged.');
 await expect(id(page,'saved-rows-candidate')).toHaveCount(0);await expect(id(page,'saved-rows-none')).toBeVisible();
 await useFile(page);await expect(id(page,'saved-rows-identity-sha')).toHaveText(sha(CONTROL));await expect(id(page,'saved-rows-find')).toBeFocused();
 // The recovered column names keep their case under the App's global table style (not "FREQ (MHZ)").
 expect(await page.locator('.psr-table thead th').allInnerTexts()).toEqual(['Select','#','Line','Object','Freq (MHz)','Gain (Rel)','Ref (Secs)','Vert (Secs)','Horz (Rel)','Start (JD)','Comments','Data Pts','Del T (msec)','Aperture (M)','File Name']);
 await choose(page,'mixed.csv',CONTROL.replace('"Ben Student"\r\n','"Ben Student"\n'));
 await expect(id(page,'saved-rows-rejection')).toContainText('File not used: mixed.csv. The file in use is unchanged.');await expect(id(page,'saved-rows-rejection')).toContainText('Line 5.');
 await id(page,'saved-rows-dismiss').click();await expect(id(page,'saved-rows-identity-name')).toHaveText('control.csv');
 // Recovered Find: From Top, lowercased memory, From Cursor duplicate, no wrap, cancel keeps memory, case quirk, empty query.
 await runFind(page,'B0329.PLR','saved-rows-from-top');await expect(selectedRow(page)).toHaveAttribute('data-testid','saved-rows-row-0');
 await expect(id(page,'saved-rows-status')).toHaveText('Found in row 1.');
 await id(page,'saved-rows-find').click();await expect(id(page,'saved-rows-query')).toHaveValue('b0329.plr');
 // The native Find dialog is topmost: the App header cannot take focus behind it.
 await expect(page.locator('dialog:modal')).toHaveCount(1);expect(await focusable(nav(page,'Observatory'))).toBe(false);
 await id(page,'saved-rows-from-cursor').click();await expect(selectedRow(page)).toHaveAttribute('data-testid','saved-rows-row-1');
 await runFind(page,null,'saved-rows-from-cursor');
 await expect(id(page,'saved-rows-notice-body')).toHaveText('"b0329.plr" Not Found.');await expect(id(page,'saved-rows-notice-ok')).toBeFocused();
 await page.keyboard.press('Escape');await expect(id(page,'saved-rows-notice')).toHaveCount(0);await expect(selectedRow(page)).toHaveAttribute('data-testid','saved-rows-row-1');
 await runFind(page,'D:\\DATA','saved-rows-from-top',true);await expect(selectedRow(page)).toHaveAttribute('data-testid','saved-rows-row-3');
 await expect(id(page,'saved-rows-selected-text')).toHaveText(ROW_C);
 await runFind(page,'something else','saved-rows-find-cancel',false);await expect(id(page,'saved-rows-status')).toHaveText('Find cancelled.');
 await id(page,'saved-rows-find').click();await expect(id(page,'saved-rows-query')).toHaveValue('d:\\data');await expect(id(page,'saved-rows-case')).toBeChecked();
 await id(page,'saved-rows-find-cancel').click();
 await runFind(page,'','saved-rows-from-top',false);
 await expect(id(page,'saved-rows-status')).toHaveText('The search text is empty: nothing was searched and the selection is unchanged.');await expect(selectedRow(page)).toHaveAttribute('data-testid','saved-rows-row-3');
 // Held keys: one held Enter searches once and its repeats do not dismiss the notice; one held Escape closes one layer.
 await id(page,'saved-rows-find').click();await id(page,'saved-rows-query').fill('nowhere');
 await page.keyboard.down('Enter');await expect(id(page,'saved-rows-notice-ok')).toBeFocused();
 for(let i=0;i<3;i++)await page.keyboard.down('Enter');
 await page.keyboard.up('Enter');await expect(id(page,'saved-rows-notice-body')).toHaveText('"nowhere" Not Found.');
 await page.keyboard.down('Escape');await expect(id(page,'saved-rows-notice')).toHaveCount(0);await page.keyboard.down('Escape');await page.keyboard.up('Escape');
 await expect(findDialog(page)).toHaveCount(0);await expect(id(page,'saved-rows-find')).toBeFocused();
 // Exact original bytes; a repeated import of the same file needs Use again.
 const bytes=await download(page,id(page,'saved-rows-download'));expect(bytes.equals(Buffer.from(CONTROL,'latin1'))).toBe(true);
 await choose(page,'control.csv',CONTROL);await expect(id(page,'saved-rows-candidate')).toBeVisible();await expect(id(page,'saved-rows-identity-sha')).toHaveText(sha(CONTROL));
 await id(page,'saved-rows-use').click();await expect(id(page,'saved-rows-candidate')).toHaveCount(0);await expect(selectedRow(page)).toHaveAttribute('data-testid','saved-rows-row-0');
 await expect(id(page,'saved-rows-selected-text')).toHaveText(ROW_A);
 // The manual PLR recording, cursors and recorded list are unchanged by the viewer.
 await expectManual(page,1,'manual kept');await noOverflow(page);
 await page.screenshot({path:info.outputPath('saved-rows-route.png'),fullPage:true});
});

test('saved-row host ownership: disclosure close, route change and project busy cancel a read; Find survives Back/Forward; Lab guide and PLR Record stay topmost; the App sink follows the logical session',async({page})=>{
 await holdReads(page);
 await page.goto('/#pulsar-analysis');await loadPlr(page);await recordManual(page,'manual kept');
 await toggleDisclosure(page);await useFile(page);await runFind(page,'B0531','saved-rows-from-top');await expect(selectedRow(page)).toHaveAttribute('data-testid','saved-rows-row-2');
 const status=id(page,'saved-rows-status');
 const unchanged=async()=>{await expect(id(page,'saved-rows-identity-name')).toHaveText('control.csv');await expect(id(page,'saved-rows-identity-sha')).toHaveText(sha(CONTROL));
  await expect(selectedRow(page)).toHaveAttribute('data-testid','saved-rows-row-2');await expect(id(page,'saved-rows-candidate')).toHaveCount(0);await expect(id(page,'saved-rows-reading')).toHaveCount(0);};
 // Closing the disclosure makes the viewer inactive: the running read is cancelled and its late result ignored.
 await choose(page,'held-one.csv',CONTROL);await held(page,'held-one.csv');await expect(id(page,'saved-rows-reading')).toBeVisible();
 await toggleDisclosure(page);await expect(id(page,'saved-rows')).toHaveAttribute('data-active','false');await expect(status).toHaveText(inactiveCancel('held-one.csv'));
 await release(page,'held-one.csv');await settle(page);await toggleDisclosure(page);await expect(id(page,'saved-rows')).toHaveAttribute('data-active','true');
 await unchanged();await expect(status).toHaveText(inactiveCancel('held-one.csv'));
 // Leaving the route does the same.
 await choose(page,'held-two.csv',CONTROL);await held(page,'held-two.csv');await nav(page,'Observatory').click();await expect(id(page,'saved-rows')).toHaveAttribute('data-active','false');
 await release(page,'held-two.csv');await settle(page);await nav(page,'Radio data').click();await expect(status).toHaveText(inactiveCancel('held-two.csv'));await unchanged();
 // A project operation does the same; Cancel ends it and nothing in the viewer changes.
 await choose(page,'held-three.csv',CONTROL);await held(page,'held-three.csv');
 await restore(page,'held-restore.json','{}');await held(page,'held-restore.json');
 await expect(toolbar(page).getByText('Validating the investigation. Observing and editing controls are paused.')).toBeVisible();
 await expect(id(page,'saved-rows')).toHaveAttribute('data-active','false');await expect(status).toHaveText(inactiveCancel('held-three.csv'));
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();
 await expect(toolbar(page).getByText('Pending investigation operation cancelled. Confirmed work in every tool was kept.')).toBeVisible();
 await release(page,'held-three.csv');await release(page,'held-restore.json');await settle(page);
 await expect(id(page,'saved-rows')).toHaveAttribute('data-active','true');await unchanged();await expect(toolbar(page).locator('[role="alert"]')).toHaveCount(0);
 // Find draft across browser history: the session is kept while hidden and presented again on return, with focus.
 await expect(id(page,'saved-rows-session')).toHaveCount(0);
 await id(page,'saved-rows-find').click();await id(page,'saved-rows-query').fill('B1919');await expect(id(page,'saved-rows-session')).toHaveText('Saved measurement file viewer (supplied file) · Find session open');
 await page.goBack();await expect(id(page,'saved-rows')).toBeHidden();await expect(page.locator('dialog:modal')).toHaveCount(0);await expect(heading(page,'Start with the sky.')).toBeFocused();
 await page.goForward();await expect(findDialog(page)).toBeVisible();await expect(id(page,'saved-rows-query')).toHaveValue('B1919');await expect(id(page,'saved-rows-query')).toBeFocused();
 await expect(page.locator('dialog:modal')).toHaveCount(1);await expect(heading(page,'Recorded pulsar analysis')).not.toBeFocused();
 // A foreign native dialog (Hubble lab guide) opened elsewhere stays topmost on return; the Find waits, then returns with its draft.
 await page.goBack();await nav(page,'Hubble lab guide').click();await expect(page.locator('dialog[aria-labelledby="hubble-lab-heading"]')).toHaveAttribute('open','');
 await page.goForward();await expect(id(page,'saved-rows')).toBeVisible();await expect(findDialog(page)).toHaveCount(1);await expect(findDialog(page)).not.toBeVisible();
 await expect(id(page,'saved-rows-session')).toBeVisible();await expect(page.locator('dialog:modal')).toHaveCount(1);
 await page.keyboard.press('Escape');await expect(page.locator('dialog[aria-labelledby="hubble-lab-heading"]')).not.toHaveAttribute('open','');
 await expect(findDialog(page)).toBeVisible();await expect(id(page,'saved-rows-query')).toHaveValue('B1919');await expect(id(page,'saved-rows-query')).toBeFocused();
 await id(page,'saved-rows-from-top').click();await expect(selectedRow(page)).toHaveAttribute('data-testid','saved-rows-row-3');await expect(id(page,'saved-rows-session')).toHaveCount(0);
 // Coexistence: a Find session started behind the open PLR Record dialog (a scripted click, which the inert page would
 // not deliver to a user) waits; the PLR dialog stays open, focused and usable, and the Find dialog opens after it.
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill('second, recorded while Find waited');
 await id(page,'saved-rows-find').dispatchEvent('click');
 await expect(id(page,'saved-rows-session')).toBeVisible();await expect(findDialog(page)).not.toBeVisible();
 await expect(id(page,'pulsar-record-dialog')).toBeVisible();await expect(id(page,'pulsar-comment')).toBeFocused();await expect(page.locator('dialog:modal')).toHaveCount(1);
 await page.keyboard.press('Enter');await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
 await expect(findDialog(page)).toBeVisible();await expect(id(page,'saved-rows-query')).toBeFocused();
 await id(page,'saved-rows-find-cancel').click();await expect(id(page,'saved-rows-session')).toHaveCount(0);
 await expectManual(page,2,'manual kept');
});

// ------------------------------------------------------------------------------------------------------ radio route
const FIELDS=['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'] as const;
async function enterCoordinates(page:Page,values:readonly [string,string,string,string,string,string]){for(const [i,name] of FIELDS.entries())await id(page,`antenna-field-${name}`).fill(values[i]);}
const notice=(page:Page)=>id(page,'antenna-notice');
const presented=(page:Page)=>id(page,'radio-control');
async function openRadio(page:Page,info:TestInfo){
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await press(info,nav(page,'Radio telescope'));await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-control')).toBeVisible();
}
/** Explicit compiled-default selection, access with the manual access tick, switch On, Tracking on. */
async function setupRadio(page:Page,info:TestInfo){
 await press(info,id(page,'radio-exercise'));await press(info,id(page,'radio-env-compiled'));await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 await press(info,id(page,'radio-access'));await press(info,id(page,'radio-timer-deliver'));await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await press(info,id(page,'radio-switch'));await expect(id(page,'antenna-status')).toContainText('initialized');
 await press(info,id(page,'antenna-tracking'));await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
async function startSlew(page:Page,values:readonly [string,string,string,string,string,string]){
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,values);await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await expect(notice(page)).toHaveCount(0);
}
/** Test-only focusin log, installed once per page (H1:text, data-testid, else TAG:text). It observes the App and changes nothing. */
const recordFocus=(page:Page)=>page.evaluate(()=>{const w=window as unknown as{__radioFocusEvents:string[]};w.__radioFocusEvents=[];document.addEventListener('focusin',event=>{const el=event.target;if(el instanceof HTMLElement&&w.__radioFocusEvents.length<50)w.__radioFocusEvents.push(el.tagName==='H1'?`H1:${el.textContent}`:el.getAttribute('data-testid')??`${el.tagName}:${el.textContent?.trim()}`);});});
const focusEvents=(page:Page)=>page.evaluate(()=>(window as unknown as{__radioFocusEvents:string[]}).__radioFocusEvents);
async function hostReleased(page:Page){await expect(header(page)).not.toHaveAttribute('inert');await expect(toolbar(page)).not.toHaveAttribute('inert');await expect(presented(page)).toHaveAttribute('data-modal-presented','false');}
async function hostHeld(page:Page){await expect(header(page)).toHaveAttribute('inert','');await expect(toolbar(page)).toHaveAttribute('inert','');await expect(presented(page)).toHaveAttribute('data-modal-presented','true');}

test('radio telescope route: explicit compiled-default scenario, access, Tracking, invalid coordinates, epoch choice, Cancel, confirm, stop and resume; a presented box owns the App header and toolbar',async({page},info)=>{
 await openRadio(page,info);
 await expect(id(page,'radio-route-scenario-options')).toContainText('recovered compiled defaults');await expect(id(page,'radio-route-scenario-options')).toContainText('maximum rate index 5, rate base 50');
 await expect(id(page,'radio-route-scenario-options')).toContainText('the current classroom configuration is not known');
 await expect(id(page,'radio-route-scenario-access')).toContainText('below 8000 ms');await expect(id(page,'radio-route-scenario-slew')).toContainText('nominal 100 ms browser interval');
 await expect(id(page,'radio-route-scenario-gates')).toContainText('or in B1950.0 converted with the original fixed-epoch precession');await expect(id(page,'radio-route-scenario-gates')).not.toContainText('B1950.0 input');
 await expect(id(page,'radio-route-scenario-gates')).not.toContainText('the hot list and pulsar');
 await expect(id(page,'radio-route-scenario-gates')).toContainText('Available: receiver Record with Identify and Properties, and Align of the receiver windows.');
 await expect(id(page,'radio-route-scenario-gates')).toContainText('the hot list’s Add Current Item and Save from this panel (disabled; their enabling code is not recovered)');
 // Phase 1 item 1.5 (intentional change): Save investigation now includes the Radio workspace.
 await expect(id(page,'radio-route-persistence')).toContainText('Save investigation includes the setup');
 await expect(id(page,'radio-env-diameter-current')).toHaveText('Not supplied');await expect(id(page,'radio-switch')).toBeDisabled();
 await expect(id(page,'radio-env').getByText('The recovered compiled default is 100, used when no options file loads; the value in a current classroom configuration is not known, so supply it explicitly.',{exact:false})).toBeVisible();
 // Access waits for the manual access tick and needs the explicitly supplied diameter.
 await press(info,id(page,'radio-exercise'));await press(info,id(page,'radio-access'));await expect(id(page,'radio-status')).toHaveText('Radio telescope access requested.');
 await press(info,id(page,'radio-timer-deliver'));await expect(id(page,'radio-status')).toContainText('Supply the dish diameter first');
 await press(info,id(page,'radio-env-compiled'));await press(info,id(page,'radio-timer-deliver'));await expect(id(page,'radio-status')).toHaveText('Scope timer completed: radio telescope accessed.');
 await press(info,id(page,'radio-switch'));await expect(id(page,'antenna-status')).toContainText('initialized');
 await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-options')).toContainText('maximum rate index 5, rate base 50');
 await expect(id(page,'antenna-set-coordinates')).toBeDisabled();await press(info,id(page,'antenna-tracking'));await hostReleased(page);
 // The coordinate dialog: presented, it owns focus and makes the App header and toolbar inert.
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-field-raHours')).toBeFocused();
 await hostHeld(page);expect(await focusable(nav(page,'Observatory'))).toBe(false);expect(await focusable(page.getByRole('button',{name:'Save investigation',exact:true}))).toBe(false);
 const target=await id(page,'antenna-target').textContent();
 await page.keyboard.type('25');await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await page.keyboard.press('Escape');await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-field-raHours')).toHaveValue('25');
 await enterCoordinates(page,['5','0','0','-90','1','0']);await id(page,'antenna-dialog-ok').click();await expect(notice(page)).toHaveAttribute('data-kind','dec-invalid');await id(page,'antenna-notice-ok').click();
 // Choosing B1950.0 shows the conversion note but converts nothing by itself; back to J2000 and Cancel (no OK, no flag).
 await id(page,'antenna-field-decMinutes').fill('0');await id(page,'antenna-epoch-1').check();await expect(id(page,'antenna-b1950-note')).toBeVisible();
 await expect(id(page,'antenna-target')).toHaveText(target!);await id(page,'antenna-epoch-0').check();await expect(id(page,'antenna-b1950-note')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-status')).toContainText('cancelled');
 await expect(id(page,'antenna-target')).toHaveText(target!);await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');await hostReleased(page);
 // Confirm a supported J2000 slew; the start wording names the rate actually used.
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['4','0','0','0','0','0']);await id(page,'antenna-field-decSeconds').press('Enter');
 await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope to RA 4h 0m 0.00s, Dec +0° 0′ 0.0″?');await hostHeld(page);
 await id(page,'antenna-notice-yes').click();await hostReleased(page);
 await expect(id(page,'antenna-status')).toHaveText('Slew started at the rate shown under Slew Rate: the start raised the index to the options maximum where the index was lower, and kept a higher index unchanged.');
 await expect(id(page,'antenna-rate')).toHaveText('Index 5: 5000 arcsec per slew-timer tick');await expect(id(page,'antenna-motion')).toContainText('Slewing');
 // Stop question pauses; No resumes; Yes stops for good and no late tick moves the telescope.
 await id(page,'antenna-set-coordinates').click();await expect(notice(page)).toHaveAttribute('data-kind','stop-slew');await hostHeld(page);
 await id(page,'antenna-notice-no').click();await expect(id(page,'antenna-status')).toHaveText('Slew resumed.');
 await id(page,'antenna-set-coordinates').click();await id(page,'antenna-notice-yes').click();await expect(id(page,'antenna-status')).toHaveText('Slew stopped at the current position.');
 const ra=await id(page,'antenna-ra').textContent(),dec=await id(page,'antenna-dec').textContent();
 await page.waitForTimeout(400);// absence check: no SlewTimer2 callback may move the stopped telescope
 await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');await expect(id(page,'antenna-ticks')).toHaveCount(0);
 await expect(id(page,'antenna-ra')).toHaveText(ra!);await expect(id(page,'antenna-dec')).toHaveText(dec!);await hostReleased(page);
 await noOverflow(page);await page.screenshot({path:info.outputPath('radio-route-stopped.png'),fullPage:true});
});

test('radio route: a hidden-route slew arrives in the background without taking focus or inerting another route; pending dialog and box return on Back/Forward; About and Lab guide stay topmost',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);
 // A short slew (0 h / +38.4° → 0.5 h / +35°), then another route while it runs.
 await startSlew(page,['0','30','0','35','0','0']);await nav(page,'Observatory').click();await expect(heading(page,'Start with the sky.')).toBeFocused();
 await expect.poll(()=>id(page,'antenna-ra').textContent()).toBe('0 Hrs 30 Mins 0.00 Secs');// the hidden route kept slewing
 await expect(id(page,'antenna-dec')).toHaveText('+35 Degs 0 Mins 0.0 Secs');
 await expect(notice(page)).toHaveCount(0);await hostReleased(page);await expect(heading(page,'Start with the sky.')).toBeFocused();
 await expect(page.locator('.observatory-main').first()).not.toHaveAttribute('inert');
 await nav(page,'Radio telescope').click();
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');await expect(id(page,'antenna-notice-ok')).toBeFocused();await hostHeld(page);
 await expect(heading(page,'Radio telescope control')).not.toBeFocused();
 await id(page,'antenna-notice-ok').click();await hostReleased(page);await expect(id(page,'antenna-set-coordinates')).toBeFocused();
 // A pending coordinate dialog with a draft across Back/Forward.
 await id(page,'antenna-set-coordinates').click();await id(page,'antenna-field-raHours').fill('7');
 await page.goBack();await expect(id(page,'radio-control')).toBeHidden();await expect(id(page,'antenna-dialog')).toHaveCount(0);await hostReleased(page);
 await expect(heading(page,'Start with the sky.')).toBeFocused();
 await page.goForward();await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-field-raHours')).toHaveValue('7');await expect(id(page,'antenna-field-raHours')).toBeFocused();
 await hostHeld(page);await expect(heading(page,'Radio telescope control')).not.toBeFocused();
 // About (native) opened elsewhere stays topmost on return; the dialog is presented after it closes.
 await page.goBack();await page.getByRole('button',{name:'What works in this version ↗',exact:true}).click();await expect(page.locator('dialog:modal')).toHaveCount(1);
 await page.goForward();await expect(id(page,'radio-control')).toBeVisible();await expect(id(page,'antenna-dialog')).toHaveCount(0);
 await expect(presented(page)).toHaveAttribute('data-modal-presented','false');await expect(header(page)).not.toHaveAttribute('inert');
 await page.keyboard.press('Escape');await expect(page.locator('dialog:modal')).toHaveCount(0);
 await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-field-raHours')).toHaveValue('7');await expect(id(page,'antenna-field-raHours')).toBeFocused();await hostHeld(page);
 // An error box over the dialog, then the Hubble lab guide: both radio surfaces wait and return, one layer per Escape.
 await id(page,'antenna-field-raHours').fill('25');await id(page,'antenna-dialog-ok').click();await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');
 await page.goBack();await nav(page,'Hubble lab guide').click();await expect(page.locator('dialog[aria-labelledby="hubble-lab-heading"]')).toHaveAttribute('open','');
 await page.goForward();await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(notice(page)).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.locator('dialog:modal')).toHaveCount(0);
 await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');await expect(id(page,'antenna-notice-ok')).toBeFocused();await expect(id(page,'antenna-dialog')).toBeVisible();
 await page.keyboard.press('Escape');await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-field-raHours')).toHaveValue('25');
 await expect(id(page,'antenna-field-raHours')).toBeFocused();// the dialog presented under the box takes focus when the box closes
 await page.keyboard.press('Escape');await expect(id(page,'antenna-dialog')).toHaveCount(0);await hostReleased(page);
 // RC-11 hidden panel window: closing it during a slew keeps the slew; the arrival box is presented on the visible route.
 await startSlew(page,['0','45','0','33','0','0']);await press(info,id(page,'radio-panel-close'));
 await expect(id(page,'radio-panel-window')).toHaveCount(0);await expect(id(page,'radio-switch')).toHaveAttribute('aria-checked','false');
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');await hostHeld(page);await id(page,'antenna-notice-ok').click();await hostReleased(page);
 await press(info,id(page,'radio-switch'));await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 45 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+33 Degs 0 Mins 0.0 Secs');
 await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await noOverflow(page);await page.screenshot({path:info.outputPath('radio-route-after-history.png'),fullPage:true});
});

test('project operations: Save refuses during a slew and then adds the Radio part (base unchanged); an old file, a restore error and busy keep work; busy pauses slew ticks without catch-up; reload resets',async({page},info)=>{
 await holdReads(page);
 await page.goto('/#observatory');const before=await save(page);
 await press(info,nav(page,'Radio data'));await loadPlr(page);await recordManual(page,'manual across tools');await toggleDisclosure(page);await useFile(page);
 await press(info,nav(page,'Radio telescope'));await setupRadio(page,info);
 // Every tool used below is loaded before installing the clock: freezing React's lazy load would test the scheduler instead.
 await page.clock.install();await page.clock.pauseAt(Date.now()+60_000);
 await startSlew(page,['4','0','0','0','0','0']);await flushTasks(page);
 // Phase 1 item 1.5 (intentional change): Save investigation now includes the Radio workspace and the PLR measurements, so
 // it refuses while the telescope slews; nothing is downloaded and the slew continues.
 let downloads=0;page.on('download',()=>{downloads++;});
 await page.getByRole('button',{name:'Save investigation',exact:true}).click();
 await expect(toolbar(page).locator('[role="alert"]')).toContainText('Nothing was saved: the telescope is slewing');
 await flushTasks(page);expect(downloads).toBe(0);
 // Busy (a held restore): slew ticks pause and are not caught up after Cancel.
 await expect(id(page,'antenna-ticks')).toBeVisible();
 await restore(page,'held-restore.json',before.toString('utf8'));await held(page,'held-restore.json');
 await expect(page.locator('[data-testid="radio-route"]').locator('xpath=ancestor::div[@inert]')).toHaveCount(1);
 const paused=await id(page,'antenna-ticks').textContent();
 // 630 ms busy is not a multiple of the 100 ms period (the paused clock registered the interval when busy began): an
 // interval kept with its callbacks skipped would fire 70 ms after Cancel, a fresh registration only after 100 ms.
 await page.clock.runFor(630);await flushTasks(page);// no callback while busy
 await expect(id(page,'antenna-ticks')).toHaveText(paused!);
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await flushTasks(page);
 const count=(text:string|null)=>Number(/(\d+)$/.exec(text??'')?.[1]);const start=count(paused);
 await page.clock.runFor(99);await flushTasks(page);expect(count(await id(page,'antenna-ticks').textContent())).toBe(start);
 await page.clock.runFor(1);await flushTasks(page);expect(count(await id(page,'antenna-ticks').textContent())).toBe(start+1);// a fresh 100 ms registration, exactly one tick and no catch-up
 await release(page,'held-restore.json');await flushTasks(page);await expect(toolbar(page).locator('[role="alert"]')).toHaveCount(0);
 // Restore error, then a real restore of the earlier file: both keep the radio state and the saved rows.
 await id(page,'antenna-set-coordinates').click();await id(page,'antenna-notice-yes').click();await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');
 await page.clock.resume();// later restore/reload checks use the real scheduler, including lazy tools after reload
 const ra=await id(page,'antenna-ra').textContent(),dec=await id(page,'antenna-dec').textContent();
 await restore(page,'broken.json','not an investigation');await expect(toolbar(page).getByRole('alert')).toHaveText('The investigation could not be restored. Confirmed work in every tool was kept.');
 await restore(page,'same-investigation.json',before.toString('utf8'));await expect(toolbar(page).getByText('Investigation restored.',{exact:false})).toBeVisible();
 await expect(id(page,'antenna-ra')).toHaveText(ra!);await expect(id(page,'antenna-dec')).toHaveText(dec!);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await press(info,nav(page,'Radio data'));await expect(id(page,'saved-rows-identity-sha')).toHaveText(sha(CONTROL));await expectManual(page,1,'manual across tools');
 // The old (v≤22) file left Radio and the measurements untouched; Save now adds them (v23) with the unrelated base unchanged.
 // The supplied saved-row viewer is still not part of it.
 const saved=JSON.parse((await save(page)).toString('utf8'));
 expect(saved.version).toBe(23);expect(saved.base).toEqual(JSON.parse(before.toString('utf8')));
 expect(saved.radio.data).toMatchObject({kind:'file',fileName:'synthetic-e2e.plr',sha256:sha(PLR)});expect(saved.radio.analysis.list).toHaveLength(1);
 expect(saved.radio.analysis.list[0].fields.comment).toBe('manual across tools');expect(JSON.stringify(saved.radio)).not.toContain('control.csv');
 // Reload: both temporary workspaces start empty, as their notices say.
 await page.reload();await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();await expect(id(page,'pulsar-none')).toBeVisible();
 await expect(id(page,'saved-rows')).toHaveCount(0);await toggleDisclosure(page);await expect(id(page,'saved-rows-none')).toBeVisible();
 await nav(page,'Radio telescope').click();await expect(id(page,'radio-switch')).toBeDisabled();await expect(id(page,'antenna-controls')).toHaveCount(0);
});


test('review regression: a hidden-panel arrival returns switch focus without a held Enter toggling it',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await startSlew(page,['1','0','0','30','0','0']);
 await press(info,id(page,'radio-panel-close'));await expect(id(page,'radio-panel-window')).toHaveCount(0);
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await page.keyboard.down('Enter');await expect(notice(page)).toHaveCount(0);await expect(id(page,'radio-switch')).toBeFocused();await hostReleased(page);
 // Check EACH repeat: two unchecked toggles can return to the original value and hide a cascade.
 for(let i=0;i<2;i++){await page.keyboard.down('Enter');await expect(id(page,'radio-switch')).toHaveAttribute('aria-checked','false');await expect(id(page,'radio-panel-window')).toHaveCount(0);}
 await page.keyboard.up('Enter');await page.keyboard.press('Enter');await expect(id(page,'radio-switch')).toHaveAttribute('aria-checked','true');await expect(id(page,'radio-panel-window')).toBeVisible();
});

test('review regression: a closed-panel arrival reached on a hidden route returns focus from outside the panel to the live switch',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await startSlew(page,['1','0','0','30','0','0']);
 await press(info,id(page,'radio-panel-close'));await expect(id(page,'radio-panel-window')).toHaveCount(0);await expect(id(page,'radio-switch')).toBeFocused();
 await press(info,nav(page,'Observatory'));await expect(heading(page,'Start with the sky.')).toBeFocused();
 // The readout is unmounted with the panel window; the mounted status line names the actual background arrival.
 await expect(id(page,'antenna-status')).toHaveText('Slew complete.');await expect(notice(page)).toHaveCount(0);await hostReleased(page);
 await expect(heading(page,'Start with the sky.')).toBeFocused();
 await press(info,nav(page,'Radio telescope'));await expect(id(page,'antenna-notice-ok')).toBeFocused();await hostHeld(page);// box opened with focus outside the panel
 await recordFocus(page);await press(info,id(page,'antenna-notice-ok'));await expect(notice(page)).toHaveCount(0);
 await expect(id(page,'radio-switch')).toBeFocused();await hostReleased(page);expect(await focusEvents(page)).toEqual(['radio-switch']);
 await expect(id(page,'radio-switch')).toHaveAttribute('aria-checked','false');await expect(id(page,'radio-panel-window')).toHaveCount(0);
});

test('review regression: Cancel of a held restore on the radio route focuses no radio control',async({page},info)=>{
 await holdReads(page);await openRadio(page,info);await setupRadio(page,info);
 await restore(page,'held-cancel-focus.json','{}');await held(page,'held-cancel-focus.json');
 const route=page.locator('[data-testid="radio-route"]').locator('xpath=ancestor::div[@inert]');await expect(route).toHaveCount(1);
 const cancel=page.getByRole('button',{name:'Cancel pending save/restore',exact:true});await expect(cancel).toBeVisible();
 await recordFocus(page);await press(info,cancel);
 await expect(toolbar(page).getByText('Pending investigation operation cancelled. Confirmed work in every tool was kept.')).toBeVisible();
 await expect(route).toHaveCount(0);await settle(page);// busy ended and its passive effects ran: no box or window closed
 expect((await focusEvents(page)).filter(event=>event!=='BUTTON:Cancel pending save/restore')).toEqual([]);
 await expect(id(page,'antenna-set-coordinates')).not.toBeFocused();await expect(id(page,'radio-switch')).not.toBeFocused();
 await release(page,'held-cancel-focus.json');await flushTasks(page);await expect(toolbar(page).locator('[role="alert"]')).toHaveCount(0);
});

test('review regression: Back into the radio route with body focus focuses exactly its h1, with no intermediate radio focus',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await expect(id(page,'antenna-set-coordinates')).toBeEnabled();
 await press(info,nav(page,'Observatory'));await expect(heading(page,'Start with the sky.')).toBeFocused();
 await page.evaluate(()=>(document.activeElement as HTMLElement|null)?.blur());expect(await page.evaluate(()=>document.activeElement===document.body)).toBe(true);
 await recordFocus(page);await page.goBack();await expect(heading(page,'Radio telescope control')).toBeFocused();await settle(page);
 expect(await focusEvents(page)).toEqual(['H1:Radio telescope control']);await hostReleased(page);
});

test('review regression: Find to pending arrival yields focus directly to the box and retains the Find draft',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await startSlew(page,['1','0','0','30','0','0']);
 await press(info,nav(page,'Radio data'));await toggleDisclosure(page);await useFile(page);await id(page,'saved-rows-find').click();await id(page,'saved-rows-query').fill('kept across arrival');
 await expect.poll(()=>id(page,'antenna-ra').textContent()).toBe('1 Hrs 0 Mins 0.00 Secs');
 // The target RA can be shown one SlewTimer2 callback before the arrival: wait for the logical arrival while hidden.
 await expect(id(page,'antenna-status')).toHaveText('Slew complete.');
 await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');
 await expect(notice(page)).toHaveCount(0);
 await recordFocus(page);
 await page.goBack();await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 expect(await focusEvents(page)).toEqual(['antenna-notice-ok']);await id(page,'antenna-notice-ok').click();
 await press(info,nav(page,'Radio data'));await expect(findDialog(page)).toBeVisible();await expect(id(page,'saved-rows-query')).toHaveValue('kept across arrival');await page.keyboard.press('Escape');
});

test('review regression: Back after the target RA but before the arrival callback focuses the h1, then the box; the Find draft is kept',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);
 await press(info,nav(page,'Radio data'));await toggleDisclosure(page);await useFile(page);await press(info,nav(page,'Radio telescope'));
 // Every tool used below is loaded before installing the clock: freezing React's lazy load would test the scheduler instead.
 await page.clock.install();await page.clock.pauseAt(Date.now()+60_000);
 await startSlew(page,['1','0','0','30','0','0']);await flushTasks(page);
 await press(info,nav(page,'Radio data'));await flushTasks(page);await id(page,'saved-rows-find').click();await id(page,'saved-rows-query').fill('kept before arrival');
 // One nominal 100 ms SlewTimer2 callback at a time until the hidden readout shows the target RA.
 for(let i=0;i<80&&await id(page,'antenna-ra').textContent()!=='1 Hrs 0 Mins 0.00 Secs';i++){await page.clock.runFor(100);await flushTasks(page);}
 await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 0 Mins 0.00 Secs');
 await expect(id(page,'antenna-status')).not.toHaveText('Slew complete.');await expect(id(page,'antenna-motion')).toContainText('Slewing in Right Ascension');
 await expect(notice(page)).toHaveCount(0);
 await recordFocus(page);await page.goBack();await expect(heading(page,'Radio telescope control')).toBeFocused();
 await page.clock.runFor(100);await flushTasks(page);
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 expect(await focusEvents(page)).toEqual(['H1:Radio telescope control','antenna-notice-ok']);await id(page,'antenna-notice-ok').click();
 await press(info,nav(page,'Radio data'));await expect(findDialog(page)).toBeVisible();await expect(id(page,'saved-rows-query')).toHaveValue('kept before arrival');await page.keyboard.press('Escape');
});

test('actual App radio held Enter and Escape act on one surface at a time',async({page},info)=>{
 await openRadio(page,info);await setupRadio(page,info);await id(page,'antenna-set-coordinates').click();await id(page,'antenna-field-raHours').fill('25');
 await page.keyboard.down('Enter');await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await page.keyboard.down('Enter');await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');await page.keyboard.up('Enter');
 await page.keyboard.down('Escape');await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-dialog')).toBeVisible();
 await page.keyboard.down('Escape');await expect(id(page,'antenna-dialog')).toBeVisible();await page.keyboard.up('Escape');
 await page.keyboard.press('Escape');await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-set-coordinates')).toBeFocused();await hostReleased(page);
});

test('actual App hidden busy route pauses the admitted 1 ms access callback and resumes it once',async({page},info)=>{
 await holdReads(page);await page.goto('/#pulsar-analysis');await expect(id(page,'pulsar-file')).toBeVisible();const before=await save(page);
 await press(info,nav(page,'Radio telescope'));await expect(id(page,'radio-control')).toBeVisible();await press(info,id(page,'radio-exercise'));await press(info,id(page,'radio-env-compiled'));await id(page,'radio-env-option').check();
 // Loaded routes first: controlled browser timing tests registration ownership, not Windows timer delivery.
 await page.clock.install();await page.clock.pauseAt(Date.now()+60_000);await press(info,id(page,'radio-access'));await flushTasks(page);
 await expect(id(page,'radio-timer')).toHaveCount(1);const waiting=await id(page,'radio-id-caption').textContent();await press(info,nav(page,'Radio data'));
 await restore(page,'held-hidden-access.json',before.toString('utf8'));await held(page,'held-hidden-access.json');await flushTasks(page);
 await page.clock.runFor(25);await flushTasks(page);await expect(id(page,'radio-id-caption')).toHaveText(waiting!);await expect(id(page,'radio-timer')).toHaveCount(1);
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await flushTasks(page);await page.clock.runFor(1);await flushTasks(page);
 await expect(id(page,'radio-timer')).toHaveCount(0);await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await release(page,'held-hidden-access.json');await flushTasks(page);await page.clock.resume();await press(info,nav(page,'Radio telescope'));await expect(id(page,'radio-switch')).toBeEnabled();await expect(id(page,'radio-switch')).toHaveAttribute('aria-checked','false');
});
