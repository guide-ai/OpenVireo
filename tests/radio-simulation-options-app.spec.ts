import {test,expect,type Locator,type Page,type TestInfo} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Actual App flows of R-RX9 (docs/RADIO-SIMULATION-OPTIONS.md): the explicit compiled numeric branch, the full Radio
// Simulation Options form (nine numbers, ordered OK, failure prefix, whole Cancel), the projection at the Preferences close
// onto the antenna options, the receivers' live options and the panel diameter, and the ownership guards. Only the rendered
// App, its data attributes, the browser clock control and programmatic clicks on controls behind a surface; no harness and
// no product debug hook. The catalog is synthetic (no original rows); expected strings are the chosen web contract, not
// native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
/** A programmatic click: reaches the handler of a control behind a surface or a disabled one (no user interaction is claimed). */
const clickBehind=(page:Page,testId:string)=>id(page,testId).evaluate(el=>{el.removeAttribute('disabled');(el as HTMLButtonElement).click();});

// ---- Synthetic catalog (the fixed-column layout of radioPulsarCatalog.ts, as in tests/radio-access-options-app.spec.ts).
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
const CATALOG=[{primaryName:'J0600+1000',legacyName:'B0557+10',ra:'90',dec:'10'},{primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'}].map(line).join('\r\n')+'\r\n';
const UT='2026-10-24T12:00:00';

async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
}
async function radioRoute(page:Page){
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
async function switchOnTracking(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
async function loadCatalog(page:Page){
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-rx9.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
}
async function applyClock(page:Page){
 await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${UT} UT`);
 await id(page,'radio-clock-longitude').click();await expect(id(page,'antenna-clock-tick')).toBeEnabled();
}

// ---- Radio configuration helpers.
const numeric=(page:Page)=>id(page,'radio-access-numeric'),full=(page:Page)=>id(page,'radio-options-full'),failure=(page:Page)=>id(page,'radio-options-failure');
const field=(page:Page,f:string)=>id(page,`radio-options-field-${f}`);
async function demonstration(page:Page){await id(page,'radio-access-demo').click();await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','demonstration');}
async function optIn(page:Page,host=true){
 await id(page,`radio-access-numeric-optin-${host}`).click();
 await expect(numeric(page)).toHaveAttribute('data-authority','compiled-branch');await expect(numeric(page)).toHaveAttribute('data-host-predicate',String(host));
}
async function openFull(page:Page){
 await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-parent')).toBeVisible();
 await id(page,'radio-access-radio').click();await expect(full(page)).toBeVisible();await expect(field(page,'horizon90c')).toBeFocused();
}
async function fullOk(page:Page,outer:'ok'|'cancel'='cancel'){
 await id(page,'radio-access-child-ok').click();await expect(full(page)).toHaveCount(0);
 await id(page,`radio-access-parent-${outer}`).click();await expect(id(page,'radio-access-parent')).toHaveCount(0);
}
const ACTIVATION={horizon90c:'10.0',aperture916:'100',baseSlew91a:'50',background928:'5',beamWidth92c:'0.00',temperature930:'50.0',gain924:'1.00',soundSync91e:'0.76500',sampleRate922:'5512'};
const DFM_ORDER=Object.keys(ACTIVATION);

test('startup: no numeric authority, the Access-only child, the panel scenario and diameter editor stay as before (positive control)',async({page})=>{
 await startApp(page);await radioRoute(page);
 await expect(numeric(page)).toHaveAttribute('data-authority','absent');await expect(id(page,'radio-access-numeric-authority')).toContainText('Not supplied');
 await expect(id(page,'radio-access-numeric-values')).toHaveCount(0);
 await expect(id(page,'antenna-radio-options')).toBeVisible();await expect(id(page,'radio-route-scenario-options')).toHaveAttribute('data-managed','false');
 await expect(id(page,'radio-env-diameter')).toBeEnabled();await expect(id(page,'radio-env-diameter-managed')).toHaveCount(0);
 await id(page,'radio-env-diameter').fill('64');await id(page,'radio-env-apply').click();await expect(id(page,'radio-env-diameter-current')).toHaveText('64');
 await id(page,'radio-env-clear').click();await expect(id(page,'radio-env-diameter-current')).not.toHaveText('64');
 await demonstration(page);
 await id(page,'radio-access-preferences').click();await id(page,'radio-access-radio').click();
 await expect(id(page,'radio-access-child')).toBeVisible();await expect(full(page)).toHaveCount(0);await expect(id(page,'radio-access-checkbox')).toBeFocused();
 await id(page,'radio-access-child-cancel').click();await id(page,'radio-access-parent-cancel').click();
 await expect(id(page,'radio-access-numeric-report')).toHaveCount(0);
});

test('opt-in names what to restore (panel diameter, Limit Slewing), then takes ownership; legacy diameter writes and the scenario are shielded, same task included',async({page})=>{
 await startApp(page);await radioRoute(page);
 // The panel diameter is not supplied at startup: refused, nothing changed, the remedy named.
 await id(page,'radio-access-numeric-optin-true').click();
 await expect(id(page,'radio-access-numeric-status')).toHaveAttribute('data-outcome','refused-consumers-differ');
 await expect(id(page,'radio-access-numeric-mismatches').locator('li')).toHaveAttribute('data-mismatch','panel-diameter');
 await expect(id(page,'radio-access-numeric-mismatches')).toContainText('Use compiled defaults: diameter 100');
 await expect(numeric(page)).toHaveAttribute('data-authority','absent');
 await id(page,'radio-env-compiled').click();await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 // The panel's Limit Slewing scenario changed the antenna options: refused again.
 await id(page,'antenna-radio-options-limit').check();await id(page,'antenna-radio-options-apply').click();
 await expect(id(page,'antenna-radio-options-current')).toHaveAttribute('data-limits','true');
 await id(page,'radio-access-numeric-optin-false').click();
 await expect(id(page,'radio-access-numeric-mismatches').locator('li')).toHaveAttribute('data-mismatch','antenna-options');
 await id(page,'antenna-radio-options-limit').uncheck();await id(page,'antenna-radio-options-apply').click();
 await expect(id(page,'antenna-radio-options-current')).toHaveAttribute('data-limits','false');
 // Same task: the opt-in and a diameter Apply of a draft typed before it. The route shield (and the panel's ref) keep 100.
 await id(page,'radio-env-diameter').fill('123');
 await page.evaluate(()=>{
  (document.querySelector('[data-testid="radio-access-numeric-optin-false"]') as HTMLButtonElement).click();
  const apply=document.querySelector('[data-testid="radio-env-apply"]') as HTMLButtonElement;apply.removeAttribute('disabled');apply.click();
 });
 await flush(page);
 await expect(numeric(page)).toHaveAttribute('data-authority','compiled-branch');await expect(id(page,'radio-access-numeric-status')).toHaveAttribute('data-outcome','authority-applied');
 await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 // The pending valid draft (123) is neither shown nor applied while managed: the editor shows the current diameter.
 await expect(id(page,'radio-env-diameter')).toHaveValue('100');await expect(id(page,'radio-env-diameter')).toHaveAttribute('aria-invalid','false');
 // UI ownership: the scenario is withdrawn, the diameter editor and its buttons are disabled with the note; other inputs stay usable.
 await expect(id(page,'antenna-radio-options')).toHaveCount(0);await expect(id(page,'radio-route-scenario-options')).toHaveAttribute('data-managed','true');
 for(const t of ['radio-env-diameter','radio-env-apply','radio-env-cancel','radio-env-clear'])await expect(id(page,t),t).toBeDisabled();
 await expect(id(page,'radio-env-diameter-managed')).toHaveText(/^Change antenna aperture in Radio Simulation Options/);
 await id(page,'radio-env-option').check();await expect(id(page,'radio-env-option')).toBeChecked();
 await id(page,'radio-env-dome').selectOption('1');await expect(id(page,'radio-env-dome')).toHaveValue('1');
 // Programmatic bypasses of the disabled Clear and the preset keep the diameter; the preset still sets the access option.
 await clickBehind(page,'radio-env-clear');await flush(page);await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 await id(page,'radio-env-compiled').click();await expect(id(page,'radio-env-option')).not.toBeChecked();await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 // A second opt-in is refused; the record values are the compiled ones with the 0.92 branch.
 await expect(id(page,'radio-access-numeric-optin-true')).toHaveCount(0);
 await expect(id(page,'radio-access-numeric-soundSync91e')).toHaveAttribute('data-root','0.9200000166893005');
 await expect(id(page,'radio-access-numeric-aperture916')).toHaveAttribute('data-env','100');
 await expect(id(page,'radio-access-numeric-report')).toContainText('Nothing applied yet');
});

test('an invalid diameter draft keeps its absent-mode error; the hand-over to the numeric authority withdraws it and shows the current diameter',async({page})=>{
 await startApp(page);await radioRoute(page);
 // Absent positive control: Apply validates, Cancel restores, typing clears the error.
 await id(page,'radio-env-compiled').click();await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 await id(page,'radio-env-diameter').fill('abc');await id(page,'radio-env-apply').click();
 await expect(id(page,'radio-env-error')).toBeVisible();await expect(id(page,'radio-env-diameter')).toHaveAttribute('aria-invalid','true');
 await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 await id(page,'radio-env-cancel').click();await expect(id(page,'radio-env-diameter')).toHaveValue('100');await expect(id(page,'radio-env-error')).toHaveCount(0);
 await id(page,'radio-env-diameter').fill('abc');await id(page,'radio-env-apply').click();await expect(id(page,'radio-env-error')).toBeVisible();
 await id(page,'radio-env-diameter').fill('abcd');await expect(id(page,'radio-env-error')).toHaveCount(0);await expect(id(page,'radio-env-diameter')).toHaveAttribute('aria-invalid','false');
 // Invalid draft pending, then the opt-in: no stale alert or invalid mark, the disabled editor shows the current diameter.
 await id(page,'radio-env-apply').click();await expect(id(page,'radio-env-error')).toBeVisible();
 await optIn(page,false);
 await expect(id(page,'radio-env-error')).toHaveCount(0);
 await expect(id(page,'radio-env-diameter')).toHaveValue('100');await expect(id(page,'radio-env-diameter')).toHaveAttribute('aria-invalid','false');
 for(const t of ['radio-env-diameter','radio-env-apply','radio-env-cancel','radio-env-clear'])await expect(id(page,t),t).toBeDisabled();
 await expect(id(page,'radio-env-diameter-current')).toHaveText('100');await expect(id(page,'radio-access-numeric-aperture916')).toHaveAttribute('data-env','100');
});

test('keyboard opt-in: a refusal keeps the focused button; an applied opt-in moves focus once to the section heading; route return does not refocus it',async({page})=>{
 await startApp(page);await radioRoute(page);
 const sectionHeading=numeric(page).locator('h3').first();
 // Refused (negative control): the button stays and keeps focus.
 await id(page,'radio-access-numeric-optin-true').focus();await page.keyboard.press('Enter');
 await expect(id(page,'radio-access-numeric-status')).toHaveAttribute('data-outcome','refused-consumers-differ');
 await expect(id(page,'radio-access-numeric-optin-true')).toBeFocused();await expect(sectionHeading).not.toBeFocused();
 // Applied: the focused button is removed; focus goes to the heading (visible ring), not to the document body.
 await id(page,'radio-env-compiled').click();await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 await id(page,'radio-access-numeric-optin-true').focus();await page.keyboard.press('Enter');
 await expect(id(page,'radio-access-numeric-status')).toHaveAttribute('data-outcome','authority-applied');await expect(numeric(page)).toHaveAttribute('data-authority','compiled-branch');
 await expect(sectionHeading).toBeFocused();
 expect(await sectionHeading.evaluate(el=>el.matches(':focus-visible'))).toBe(true);
 expect(await sectionHeading.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
 await page.keyboard.press('Shift+Tab');await expect(id(page,'radio-access-recipient').locator(':focus')).toHaveCount(1);
 // Route hide/show: the one-shot request was consumed; route entry focuses the page heading as before.
 await page.evaluate(()=>{location.hash='#pulsar-analysis';});await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();
 await flush(page);await expect(sectionHeading).not.toBeFocused();
});

test('programmatic focused opt-in (focus then click in one task) moves focus to the section heading: positive control for the yield tests',async({page})=>{
 await startApp(page);await radioRoute(page);await id(page,'radio-env-compiled').click();
 const sectionHeading=numeric(page).locator('h3').first();
 await expect(id(page,'radio-env-diameter-current')).toHaveText('100');await expect(numeric(page)).toHaveAttribute('data-authority','absent');
 expect(await page.evaluate(()=>{
  const b=document.querySelector('[data-testid="radio-access-numeric-optin-true"]') as HTMLButtonElement;b.focus();const pre=document.activeElement===b;b.click();return pre;
 })).toBe(true);
 await flush(page);
 await expect(numeric(page)).toHaveAttribute('data-authority','compiled-branch');await expect(numeric(page)).toHaveAttribute('data-host-predicate','true');
 await expect(id(page,'radio-access-numeric-status')).toHaveAttribute('data-outcome','authority-applied');
 await expect(id(page,'radio-access-numeric-optin-true')).toHaveCount(0);
 // Focus only; :focus-visible after programmatic focus is browser heuristics (the keyboard test checks the visible ring).
 await expect(sectionHeading).toBeFocused();
});

test('an opt-in clicked while another control has focus leaves focus on that control',async({page})=>{
 await startApp(page);await radioRoute(page);await id(page,'radio-env-compiled').click();
 const sectionHeading=numeric(page).locator('h3').first();
 await expect(id(page,'radio-env-diameter-current')).toHaveText('100');await expect(numeric(page)).toHaveAttribute('data-authority','absent');
 await expect(id(page,'radio-env-dome')).toBeEnabled();
 // The button is never focused, so no focus request is made (this does not isolate the focus-elsewhere guard).
 expect(await page.evaluate(()=>{
  const dome=document.querySelector('[data-testid="radio-env-dome"]') as HTMLSelectElement;dome.focus();const pre=document.activeElement===dome;
  (document.querySelector('[data-testid="radio-access-numeric-optin-true"]') as HTMLButtonElement).click();return pre;
 })).toBe(true);
 await flush(page);
 await expect(numeric(page)).toHaveAttribute('data-authority','compiled-branch');await expect(numeric(page)).toHaveAttribute('data-host-predicate','true');
 await expect(id(page,'radio-access-numeric-status')).toHaveAttribute('data-outcome','authority-applied');
 await expect(id(page,'radio-env-dome')).toBeFocused();await expect(sectionHeading).not.toBeFocused();
});

test('opt-in focus yields to Preferences opened in the same task: the dialog keeps focus, which returns to its opener, never to the heading',async({page})=>{
 await startApp(page);await radioRoute(page);await id(page,'radio-env-compiled').click();await demonstration(page);
 const sectionHeading=numeric(page).locator('h3').first();
 await page.evaluate(()=>{
  const b=document.querySelector('[data-testid="radio-access-numeric-optin-true"]') as HTMLButtonElement;b.focus();b.click();
  (document.querySelector('[data-testid="radio-access-preferences"]') as HTMLButtonElement).click();
 });
 await flush(page);
 await expect(numeric(page)).toHaveAttribute('data-authority','compiled-branch');await expect(id(page,'radio-access-parent')).toBeVisible();
 await expect(id(page,'radio-access-radio')).toBeFocused();await expect(sectionHeading).not.toBeFocused();
 await id(page,'radio-access-parent-cancel').click();await expect(id(page,'radio-access-parent')).toHaveCount(0);
 await expect(id(page,'radio-access-preferences')).toBeFocused();await expect(sectionHeading).not.toBeFocused();
});

test('opt-in focus yields to a foreign <dialog> opened in the same task',async({page})=>{
 await startApp(page);await radioRoute(page);await id(page,'radio-env-compiled').click();
 const sectionHeading=numeric(page).locator('h3').first();
 await page.evaluate(()=>{
  const b=document.querySelector('[data-testid="radio-access-numeric-optin-true"]') as HTMLButtonElement;b.focus();b.click();
  const d=document.createElement('dialog');d.dataset.testid='foreign-dialog';d.textContent='x';document.body.append(d);d.showModal();
 });
 await flush(page);
 await expect(numeric(page)).toHaveAttribute('data-authority','compiled-branch');
 expect(await page.evaluate(()=>(document.querySelector('[data-testid="foreign-dialog"]') as HTMLDialogElement).open)).toBe(true);
 await expect(sectionHeading).not.toBeFocused();
 await page.evaluate(()=>{const d=document.querySelector('[data-testid="foreign-dialog"]') as HTMLDialogElement;d.close();d.remove();});
});

test('activation texts, focus and selection on Horizon Limit, the Tab cycle; read-only controls; Escape cancels one level',async({page})=>{
 await startApp(page);await radioRoute(page);await id(page,'radio-env-compiled').click();await optIn(page);await demonstration(page);await openFull(page);
 for(const [f,v] of Object.entries(ACTIVATION))await expect(field(page,f),f).toHaveValue(v);
 expect(await field(page,'horizon90c').evaluate(el=>{const i=el as HTMLInputElement;return [i.selectionStart,i.selectionEnd];})).toEqual([0,4]);
 await expect(id(page,'radio-options-flag-limitSlewing')).not.toBeChecked();await expect(id(page,'radio-options-flag-fastSlewing')).toBeChecked();
 await expect(id(page,'radio-access-checkbox')).not.toBeChecked();
 for(const k of ['plotPulsars93c','hotListFile93d','hotListExact93e','testMode940'])await expect(id(page,`radio-options-readonly-${k}`)).not.toBeChecked();
 await expect(id(page,'radio-options-readonly-soundFeatures93f')).toBeChecked();await expect(id(page,'radio-options-readonly-soundFeatures93f')).toBeDisabled();
 await expect(id(page,'radio-options-readonly-pulsarId939')).toHaveAttribute('data-value','1');await expect(id(page,'radio-options-readonly-telescopeType938')).toHaveAttribute('data-value','0');
 await expect(id(page,'radio-options-files')).toBeDisabled();await expect(id(page,'radio-options-site')).toBeDisabled();
 // Tab: the nine fields in DFM order, Limit Slewing, Fast Slewing, Access Pulsar List, OK, Cancel, then back to Horizon.
 const order=[...DFM_ORDER.slice(1).map(f=>`radio-options-field-${f}`),'radio-options-flag-limitSlewing','radio-options-flag-fastSlewing','radio-access-checkbox','radio-access-child-ok','radio-access-child-cancel','radio-options-field-horizon90c'];
 for(const t of order){await page.keyboard.press('Tab');await expect(id(page,t),t).toBeFocused();}
 await page.keyboard.press('Shift+Tab');await expect(id(page,'radio-access-child-cancel')).toBeFocused();
 for(const card of ['radio-access-card','radio-route-clock','pulsar-params-card','radio-route-panel-wrapper'])await expect(id(page,card)).toHaveAttribute('inert');
 await page.keyboard.press('Escape');await expect(full(page)).toHaveCount(0);await expect(id(page,'radio-access-parent')).toBeVisible();await expect(id(page,'radio-access-radio')).toBeFocused();
 await expect(id(page,'radio-access-last')).toHaveAttribute('data-value','false');
});

test('invalid aperture: a fresh Enter opens the box; the same press, held Enter and repeats do not dismiss it; prefix written, env unchanged; Cancel restores',async({page})=>{
 await startApp(page);await radioRoute(page);await id(page,'radio-env-compiled').click();await optIn(page);await demonstration(page);await openFull(page);
 await field(page,'horizon90c').fill('20');await field(page,'aperture916').fill('1,5');await field(page,'baseSlew91a').fill('70');
 await field(page,'aperture916').focus();await page.keyboard.down('Enter');
 await expect(failure(page)).toBeVisible();
 await expect(failure(page)).toHaveAttribute('data-field','aperture916');await expect(failure(page)).toHaveAttribute('data-kind','grammar');await expect(failure(page)).toHaveAttribute('data-position','1');
 await expect(id(page,'radio-options-failure-title')).toHaveText('Non-Numeric Value!');await expect(id(page,'radio-options-failure-text')).toContainText('Antenna Aperture: “1,5”');
 await expect(id(page,'radio-options-failure-written')).toContainText('and Horizon Limit. Antenna Aperture and the fields after it (Base Slew Rate,');
 await expect(id(page,'radio-options-failure-note')).toContainText('Numeric Conversion Error!');await expect(id(page,'radio-options-failure-note')).toContainText('not established');
 await expect(id(page,'radio-options-failure-ok')).toBeFocused();await expect(full(page)).toHaveAttribute('inert');
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await flush(page);await expect(failure(page)).toBeVisible();// repeats of the held key
 await page.keyboard.up('Enter');
 // Root holds the flags and the horizon; the aperture and the later fields keep their values; env (the panel's copy) is unchanged.
 const radians=String(20*0.017453292519943295);
 await expect(id(page,'radio-access-numeric-horizon90c')).toHaveAttribute('data-root',radians);await expect(id(page,'radio-access-numeric-horizon90c')).toHaveAttribute('data-env','0.17453292519943295');
 await expect(id(page,'radio-access-numeric-aperture916')).toHaveAttribute('data-root','100');await expect(id(page,'radio-access-numeric-baseSlew91a')).toHaveAttribute('data-root','50');
 await expect(id(page,'radio-access-last')).toHaveAttribute('data-value','unknown');
 await page.keyboard.press('Enter');await expect(failure(page)).toHaveCount(0);await expect(field(page,'aperture916')).toBeFocused();
 await expect(field(page,'aperture916')).toHaveValue('1,5');
 // Enter on the OK button activates it; Escape on the box dismisses only the box, and focus returns to that button.
 await id(page,'radio-access-child-ok').focus();await page.keyboard.press('Enter');await expect(failure(page)).toBeVisible();await expect(id(page,'radio-options-failure-ok')).toBeFocused();
 await page.keyboard.press('Escape');await expect(failure(page)).toHaveCount(0);await expect(full(page)).toBeVisible();await expect(id(page,'radio-access-child-ok')).toBeFocused();
 await id(page,'radio-access-child-cancel').click();await expect(full(page)).toHaveCount(0);
 await expect(id(page,'radio-access-numeric-horizon90c')).toHaveAttribute('data-root','0.17453292519943295');await expect(id(page,'radio-access-last')).toHaveAttribute('data-value','false');
 // Over-long edits are refused and named, never truncated.
 await id(page,'radio-access-radio').click();await expect(full(page)).toBeVisible();
 await field(page,'gain924').fill('1'.repeat(64));await expect(field(page,'gain924')).toHaveValue('1'.repeat(64));
 await field(page,'gain924').fill('1'.repeat(65));await expect(field(page,'gain924')).toHaveValue('1'.repeat(64));
 await expect(id(page,'radio-options-field-refusal')).toHaveAttribute('data-field','gain924');await expect(id(page,'radio-options-field-refusal')).toContainText('at most 64 characters');
 await id(page,'radio-access-child-cancel').click();await id(page,'radio-access-parent-cancel').click();
});

test('valid OK then outer Cancel projects the horizon, limits, maximum index and base slew onto the antenna; the altitude limit follows (80 refuses, −90 passes)',async({page})=>{
 await startApp(page);await radioRoute(page);await switchOnTracking(page);await applyClock(page);
 await id(page,'antenna-clock-tick').click();await flush(page);
 await expect(id(page,'antenna-options')).toContainText('maximum rate index 5, rate base 50');await expect(id(page,'antenna-rate')).toContainText('Index 4');
 await optIn(page);await demonstration(page);await openFull(page);
 await field(page,'horizon90c').fill('80');await field(page,'baseSlew91a').fill('60');
 await id(page,'radio-options-flag-limitSlewing').check();await id(page,'radio-options-flag-fastSlewing').uncheck();
 await id(page,'radio-access-child-ok').click();await expect(full(page)).toHaveCount(0);
 // Nothing is applied at the child OK: the panel still has the compiled options.
 await expect(id(page,'antenna-options')).toContainText('Limit Slewing off');await expect(id(page,'radio-access-numeric-limitSlewing93a')).toHaveAttribute('data-env','false');
 await id(page,'radio-access-parent-cancel').click();await flush(page);
 await expect(id(page,'radio-access-numeric-report')).toHaveAttribute('data-antenna','applied');await expect(id(page,'radio-access-numeric-report')).toHaveAttribute('data-receiver','unchanged');
 await expect(id(page,'radio-access-numeric-report')).toHaveAttribute('data-panel','unchanged');
 await expect(id(page,'radio-access-numeric-report-antenna')).toContainText('Limit Slewing, Horizon Limit, Fast Slewing, Base Slew Rate');
 await expect(id(page,'antenna-options')).toContainText('Limit Slewing on, horizon limit 80.000000°');await expect(id(page,'antenna-options')).toContainText('maximum rate index 4, rate base 60');
 await expect(id(page,'radio-route-scenario-options')).toContainText('highest slew-rate index 4, base slew rate 60');
 // Fast Slewing off: the Slew Rate stops at index 4.
 await expect(id(page,'antenna-rate-up')).toBeEnabled();await id(page,'antenna-rate-up').click();await flush(page);await expect(id(page,'antenna-rate')).toContainText('Index 4');
 // Dec +20° at HA ≈ 0 (altitude ≈ 71.6°) is below the 80° limit: the recovered box, nothing moves.
 const lst=Number(await id(page,'antenna-clock-lst').getAttribute('data-lst-hours'));
 const h=Math.trunc(lst),m=Math.trunc((lst-h)*60),s=((lst-h)*60-m)*60;
 const request=async(dec:string)=>{
  await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
  for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await id(page,`antenna-field-${name}`).fill([String(h),String(m),s.toFixed(9),dec,'0','0'][i]);
  await id(page,'antenna-dialog-ok').click();await flush(page);
 };
 await request('20');await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','altitude-limit-request');await id(page,'antenna-notice-ok').click();await flush(page);
 await openFull(page);await expect(field(page,'horizon90c')).toHaveValue('80.0');await expect(id(page,'radio-options-flag-fastSlewing')).not.toBeChecked();
 await field(page,'horizon90c').fill('-90');await fullOk(page,'ok');
 await expect(id(page,'antenna-options')).toContainText('horizon limit -90.000000°');
 await request('-60');await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-no').click();await flush(page);
});

test('receivers: an open receiver keeps its caption until Receive start; an armed Record refuses the live copy while the antenna still applies',async({page})=>{
 await startApp(page);await radioRoute(page);await switchOnTracking(page);await loadCatalog(page);await applyClock(page);
 await optIn(page);await demonstration(page);
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();
 await expect(id(page,'receiver-heading-0')).toContainText('Aperture: 100');
 await openFull(page);await field(page,'aperture916').fill('200');await field(page,'gain924').fill('2');await fullOk(page);
 await expect(id(page,'radio-access-numeric-report')).toHaveAttribute('data-receiver','applied');await expect(id(page,'radio-access-numeric-report')).toHaveAttribute('data-panel','applied');
 await expect(id(page,'radio-access-numeric-report-panel')).toContainText('100 → 200');await expect(id(page,'radio-env-diameter-current')).toHaveText('200');
 await expect(id(page,'radio-access-numeric-receiver')).toHaveAttribute('data-dish','200');await expect(id(page,'radio-access-numeric-receiver')).toHaveAttribute('data-provenance','supplied-record');
 // No redraw at the copy: the caption keeps the old aperture; Receive start refreshes it.
 await expect(id(page,'receiver-heading-0')).toContainText('Aperture: 100');
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-heading-0')).toContainText('Aperture: 200');
 await id(page,'receiver-mode').click();for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 // Armed Record: the receiver copy is refused (lease), the antenna options are still applied, the stored record keeps the value.
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await openFull(page);await field(page,'aperture916').fill('300');await field(page,'baseSlew91a').fill('40');await fullOk(page);
 await expect(id(page,'radio-access-numeric-report')).toHaveAttribute('data-receiver','refused-record-lease');await expect(id(page,'radio-access-numeric-report')).toHaveAttribute('data-antenna','applied');
 await expect(id(page,'radio-access-numeric-report-receiver')).toContainText('not applied while Record is armed');
 await expect(id(page,'radio-access-numeric-aperture916')).toHaveAttribute('data-env','300');await expect(id(page,'radio-access-numeric-receiver')).toHaveAttribute('data-dish','200');
 await expect(id(page,'radio-env-diameter-current')).toHaveText('300');await expect(id(page,'antenna-options')).toContainText('rate base 40');
 await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-heading-0')).toContainText('Aperture: 200');
});

test('Sound Sync clamps to 1.00000, the Word keeps its low bits, no sound is produced; reload resets the authority',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as unknown as {__audio:number;AudioContext?:unknown;webkitAudioContext?:unknown};w.__audio=0;
  for(const k of ['AudioContext','webkitAudioContext'] as const){const C=w[k] as (new (...a:unknown[])=>object)|undefined;if(C)w[k]=new Proxy(C,{construct(t,a){w.__audio++;return Reflect.construct(t,a);}});}
 });
 await startApp(page);await radioRoute(page);await id(page,'radio-env-compiled').click();await optIn(page,false);await demonstration(page);await openFull(page);
 await expect(field(page,'soundSync91e')).toHaveValue('0.92000');
 await field(page,'soundSync91e').fill('1.5');await field(page,'sampleRate922').fill('70000');await field(page,'beamWidth92c').fill('0.123');await fullOk(page);
 await expect(id(page,'radio-access-numeric-soundSync91e')).toHaveAttribute('data-root','1');await expect(id(page,'radio-access-numeric-sampleRate922')).toHaveAttribute('data-root','4464');
 await expect(id(page,'radio-access-numeric-report')).toHaveAttribute('data-receiver','applied');
 await id(page,'radio-access-preferences').click();await id(page,'radio-access-radio').click();
 await expect(field(page,'soundSync91e')).toHaveValue('1.00000');await expect(field(page,'sampleRate922')).toHaveValue('4464');await expect(field(page,'beamWidth92c')).toHaveValue('0.12');
 await id(page,'radio-access-child-cancel').click();await id(page,'radio-access-parent-cancel').click();
 expect(await page.evaluate(()=>(window as unknown as {__audio:number}).__audio)).toBe(0);
 await page.clock.resume();await page.reload();await nav(page,'Radio telescope').click();await expect(numeric(page)).toHaveAttribute('data-authority','absent');
 await expect(id(page,'antenna-radio-options')).toBeVisible();await expect(id(page,'radio-env-diameter')).toBeEnabled();
});

test('guards: card branches refused behind the dialog and a foreign <dialog>; route hide/show keeps drafts and the failure box',async({page})=>{
 await startApp(page);await radioRoute(page);await id(page,'radio-env-compiled').click();await demonstration(page);
 // Behind the card's own parent dialog: the programmatic click changes nothing.
 await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-parent')).toBeVisible();
 await clickBehind(page,'radio-access-numeric-optin-true');await flush(page);await expect(numeric(page)).toHaveAttribute('data-authority','absent');
 await id(page,'radio-access-parent-cancel').click();
 // Behind a foreign native modal dialog.
 await page.evaluate(()=>{const d=document.createElement('dialog');d.dataset.testid='foreign-dialog';d.textContent='x';document.body.append(d);d.showModal();});
 await clickBehind(page,'radio-access-numeric-optin-true');await flush(page);await expect(numeric(page)).toHaveAttribute('data-authority','absent');
 await page.evaluate(()=>{const d=document.querySelector('[data-testid="foreign-dialog"]') as HTMLDialogElement;d.close();d.remove();});
 // Positive control: the same click is admitted with nothing open.
 await clickBehind(page,'radio-access-numeric-optin-true');await flush(page);await expect(numeric(page)).toHaveAttribute('data-authority','compiled-branch');
 await openFull(page);await field(page,'temperature930').fill('hot');await field(page,'gain924').fill('3');await id(page,'radio-access-child-ok').click();
 await expect(failure(page)).toHaveAttribute('data-field','temperature930');await expect(failure(page)).toHaveAttribute('data-position','8');
 await expect(id(page,'radio-options-failure-written')).toContainText('Beam Width. Detector Temperature keeps its value.');
 await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-pending','true');await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','true');
 await expect(id(page,'radio-access-numeric-gain924')).toHaveAttribute('data-root','3');await expect(id(page,'radio-access-numeric-temperature930')).toHaveAttribute('data-root','50');
 // The box is application-modal: its backdrop rightly intercepts a pointer click on the portal nav. The route change is
 // therefore an external stimulus (the browser's location hash, as from the address bar or history), not a click through it.
 await page.evaluate(()=>{location.hash='#pulsar-analysis';});await expect(page).toHaveURL(/#pulsar-analysis$/);
 await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
 await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-pending','false');await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','false');
 await expect(failure(page)).toHaveCount(0);
 await page.evaluate(()=>{location.hash='#radio-control';});await expect(page).toHaveURL(/#radio-control$/);
 await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-pending','true');await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','true');
 await expect(failure(page)).toBeVisible();await expect(id(page,'radio-options-failure-ok')).toBeFocused();
 await expect(failure(page)).toHaveAttribute('data-field','temperature930');await expect(failure(page)).toHaveAttribute('data-position','8');
 await expect(id(page,'radio-access-numeric-gain924')).toHaveAttribute('data-root','3');await expect(id(page,'radio-access-numeric-temperature930')).toHaveAttribute('data-root','50');
 await id(page,'radio-options-failure-ok').click();await expect(field(page,'temperature930')).toHaveValue('hot');await expect(field(page,'gain924')).toHaveValue('3');
 await expect(id(page,'radio-access-numeric-gain924')).toHaveAttribute('data-root','3');
 await field(page,'temperature930').fill('45');await fullOk(page,'ok');
 await expect(id(page,'radio-access-numeric-temperature930')).toHaveAttribute('data-env','45');await expect(id(page,'radio-access-last')).toHaveAttribute('data-value','true');
});

for(const width of [1440,390,375,320])test(`layout without overflow at ${width} px with 64-character invalid drafts`,async({page},info:TestInfo)=>{
 await page.setViewportSize({width,height:900});
 await startApp(page);await radioRoute(page);await id(page,'radio-env-compiled').click();await optIn(page);
 await numeric(page).scrollIntoViewIfNeeded();await noOverflow(page);
 await page.screenshot({path:info.outputPath(`radio-numeric-card-${width}.png`)});
 await demonstration(page);await openFull(page);
 for(const f of DFM_ORDER)await field(page,f).fill('-'.repeat(32)+'x'.repeat(32));
 for(const f of DFM_ORDER){await field(page,f).scrollIntoViewIfNeeded();await expect(field(page,f)).toBeInViewport();}
 await noOverflow(page);await page.screenshot({path:info.outputPath(`radio-options-full-${width}.png`)});
 await id(page,'radio-access-child-ok').click();await expect(failure(page)).toBeVisible();await noOverflow(page);
 const box=await failure(page).boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(width);
 await page.screenshot({path:info.outputPath(`radio-options-failure-${width}.png`)});
 await page.keyboard.press('Escape');await id(page,'radio-access-child-cancel').click();await id(page,'radio-access-parent-cancel').click();
 for(const testId of ['radio-access-card','radio-access-numeric','radio-env']){const b=await id(page,testId).boundingBox();expect(b,testId).not.toBeNull();expect(b!.x+b!.width,testId).toBeLessThanOrEqual(width);}
});

test('A/B: Save investigation bytes unchanged; File ▸ Pulsar List still works under the numeric authority',async({page})=>{
 // Both saves at the same paused clock instant, so only the investigation content is compared.
 await startApp(page);await radioRoute(page);const before=await save(page);
 await id(page,'radio-env-compiled').click();await optIn(page);await demonstration(page);
 // Access Pulsar List on through the full form, before the panel's first activation.
 await openFull(page);await id(page,'radio-access-checkbox').check();await field(page,'aperture916').fill('120');await fullOk(page);
 await expect(id(page,'radio-access-env')).toHaveAttribute('data-value','true');
 await id(page,'radio-exercise').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await expect(id(page,'radio-access-menu')).toHaveAttribute('data-availability','shown-enabled');
 await expect(id(page,'radio-id-caption')).toHaveText('120 Meter Radio Telescope');
 const after=await save(page);expect(after.equals(before)).toBe(true);
 await loadCatalog(page);await applyClock(page);
 await id(page,'radio-access-pulsar-list').click();await flush(page);
 await expect(id(page,'radio-access-list-status')).toHaveAttribute('data-outcome',/^(hit|miss)$/);
 await expect(id(page,'pulsar-params-window')).toBeVisible();
});
