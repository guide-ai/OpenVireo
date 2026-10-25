import {test,expect,type Browser,type Locator,type Page,type TestInfo} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Actual App flows of R-RX7 (docs/RADIO-ACCESS-OPTIONS.md): the Preferences gate scenario, the partial Optical/Radio
// Simulation Options dialogs on one radio options object, the environment copy read by the panel, and the PulsarList1
// readout (first activation, Receiver Open disable, the 0x53a close recipient). PulsarList1Click is never delivered. No
// harness and no product debug hook: the rendered App, its data attributes, the browser clock control and programmatic
// clicks on controls behind a surface. The catalog is synthetic (no original rows); expected strings are the chosen web
// contract, not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
/** Fake time in 200 ms steps (five 40 ms receiver ticks), letting React commit between steps. */
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
/** A programmatic click: reaches the handler of a control behind a surface (no user interaction is claimed). */
const clickBehind=(page:Page,testId:string)=>id(page,testId).evaluate(el=>(el as HTMLButtonElement).click());

// ---- Synthetic catalog in the fixed-column layout (radioPulsarCatalog.ts PULSAR_CATALOG_COLUMNS), RA column in degrees;
// the same rows as tests/radio-pulsar-list-app.spec.ts (A near the first pointing; no record within 2.0 at MISS).
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
const ROWS:readonly Row[]=[
 {primaryName:'J0600+1000',legacyName:'B0557+10',ra:'90',dec:'10'},
 {primaryName:'J1200-3000',legacyName:'B1157-29',ra:'180',dec:'-30'},
 {primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'},
 {primaryName:'J0016+3824',legacyName:'B0013+38',ra:'4',dec:'38.4',s4c:'3.0'},
];
const CATALOG=ROWS.map(line).join('\r\n')+'\r\n';
const UT='2026-10-24T12:00:00';
const MISS=['0','8','0','38','24','0'];

/** The fake clock runs until the lazily loaded routes have rendered; the radio route then pauses it. */
async function startApp(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
}
async function radioRoute(page:Page){
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
/** The antenna's first activation (radio-switch) and Tracking. radio-access here is the panel's own Access menu (env+0x2e84). */
async function switchOnTracking(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
 await id(page,'antenna-tracking').click();await flush(page);await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
async function loadCatalog(page:Page){
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-access.dat',mimeType:'text/plain',buffer:Buffer.from(CATALOG,'latin1')});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
}
async function applyClock(page:Page){
 await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${UT} UT`);
 await id(page,'radio-clock-longitude').click();await expect(id(page,'antenna-clock-tick')).toBeEnabled();
}
async function openReceiver(page:Page){
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-heading-0')).toBeFocused();
}
async function closeMain(page:Page){
 await id(page,'receiver-close-0').click();await expect(id(page,'receiver-card-0')).toHaveCount(0);
}
/** Set Coordinates → OK → Yes, then the slew to arrival and its box. */
async function slewTo(page:Page,values:readonly string[]){
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await id(page,`antenna-field-${name}`).fill(values[i]);
 await id(page,'antenna-dialog-ok').click();await flush(page);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flush(page);
 for(let i=0;i<300&&await id(page,'antenna-notice').count()===0;i++)await advance(page,200);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');await id(page,'antenna-notice-ok').click();await flush(page);
}
/** Set Coordinates → OK → Yes only: the slew runs, its completion box comes later (untilArrival). */
async function beginSlew(page:Page,values:readonly string[]){
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await id(page,`antenna-field-${name}`).fill(values[i]);
 await id(page,'antenna-dialog-ok').click();await flush(page);await id(page,'antenna-notice-yes').click();await flush(page);
 await expect(id(page,'antenna-notice')).toHaveCount(0);
}
async function untilArrival(page:Page){
 for(let i=0;i<300&&await id(page,'antenna-notice').count()===0;i++)await advance(page,200);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');
}
/** No ancestor of the control (nor the control itself) is inert. */
const noInertAncestor=(page:Page,testId:string)=>id(page,testId).evaluate(el=>el.closest('[inert]')===null);
async function untilFinished(page:Page){
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
}

// ---- Radio configuration helpers.
const parent=(page:Page)=>id(page,'radio-access-parent'),child=(page:Page)=>id(page,'radio-access-child');
async function demonstration(page:Page){
 await id(page,'radio-access-demo').click();
 await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','demonstration');await expect(id(page,'radio-access-demo')).toBeDisabled();
}
/** Preferences → Radio... → Access Pulsar List → child OK → outer OK/Cancel (mouse). */
async function configure(page:Page,access:boolean,outer:'ok'|'cancel'='cancel'){
 await id(page,'radio-access-preferences').click();await expect(parent(page)).toBeVisible();
 await id(page,'radio-access-radio').click();await expect(child(page)).toBeVisible();
 await id(page,'radio-access-checkbox').setChecked(access);
 await id(page,'radio-access-child-ok').click();await expect(child(page)).toHaveCount(0);
 await id(page,`radio-access-parent-${outer}`).click();await expect(parent(page)).toHaveCount(0);
 await expect(id(page,'radio-access-env')).toHaveAttribute('data-value',String(access));
}
async function menuIs(page:Page,availability:string,event?:string){
 await expect(id(page,'radio-access-menu')).toHaveAttribute('data-availability',availability);
 if(event!==undefined)await expect(id(page,'radio-access-menu-event')).toHaveAttribute('data-event',event);
}
async function values(page:Page,root:string,env:string,last:string){
 await expect(id(page,'radio-access-root')).toHaveAttribute('data-value',root);await expect(id(page,'radio-access-env')).toHaveAttribute('data-value',env);
 await expect(id(page,'radio-access-last')).toHaveAttribute('data-value',last);
}
/** No File ▸ Pulsar List... command anywhere in the radio route, whatever the flags say. */
async function noCommand(page:Page){
 await expect(id(page,'radio-route').getByRole('button',{name:/Pulsar List/})).toHaveCount(0);
 await expect(id(page,'radio-access-not-delivered')).toContainText('Command not delivered');
}

test('closed gate: Preferences shows the recovered USER OPTIONS! box; OK, Escape and Enter close it; held keys; nothing changes',async({page})=>{
 await startApp(page);await radioRoute(page);
 await expect(id(page,'radio-access-card')).toBeVisible();await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','not-supplied');
 await expect(id(page,'radio-access-gate')).toContainText('Not supplied');
 await values(page,'false','false','unknown');await expect(id(page,'radio-access-last')).toHaveText('Unknown: its startup value was not recovered');
 await expect(id(page,'radio-access-origin')).toContainText('It is not a classroom value.');
 await menuIs(page,'hidden');await expect(id(page,'radio-access-menu-flags')).toHaveText('Enabled: False · Visible: False');
 await expect(id(page,'radio-access-menu')).toHaveAttribute('data-activation-seen','false');await noCommand(page);
 // Mouse: the box, its recovered literals, the cards behind it.
 await id(page,'radio-access-preferences').click();
 const box=id(page,'radio-access-refusal');await expect(box).toBeVisible();
 await expect(id(page,'radio-access-refusal-title')).toHaveText('USER OPTIONS!');
 await expect(id(page,'radio-access-refusal-text')).toContainText('INSTRUCTOR := Many features of this software are controlled by');
 await expect(id(page,'radio-access-refusal-text')).toContainText('See the technical documentation for details and instructions!');
 await expect(id(page,'radio-access-refusal-ok')).toBeFocused();
 for(const card of ['radio-access-card','radio-route-clock','radio-route-date','radio-route-scenario','pulsar-params-card','receiver-setup'])await expect(id(page,card)).toHaveAttribute('inert');
 await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','true');
 await id(page,'radio-access-refusal-ok').click();await expect(box).toHaveCount(0);
 await expect(id(page,'radio-access-preferences')).toBeFocused();
 await expect(id(page,'radio-access-status')).toHaveText('Instructor message closed. Nothing changed.');
 // Escape closes it.
 await id(page,'radio-access-preferences').click();await expect(box).toBeVisible();await page.keyboard.press('Escape');await expect(box).toHaveCount(0);
 await expect(id(page,'radio-access-preferences')).toBeFocused();
 // Keyboard with a held Enter: one box, the repeat does not close it; a fresh Enter does.
 await page.keyboard.down('Enter');await expect(box).toBeVisible();await expect(id(page,'radio-access-refusal-ok')).toBeFocused();
 await page.keyboard.down('Enter');await flush(page);await expect(box).toBeVisible();await page.keyboard.up('Enter');
 await page.keyboard.press('Enter');await expect(box).toHaveCount(0);await expect(id(page,'radio-access-preferences')).toBeFocused();
 await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','not-supplied');await values(page,'false','false','unknown');await menuIs(page,'hidden');
});

test('Demonstration gate and nested dialogs: Radio OK then outer Cancel applies; first activation shows; Receiver Open disables; TEnvironment1 close keeps it; TRadioLab close re-enables; reopening the existing receiver calls Open again',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);
 await demonstration(page);
 await expect(id(page,'radio-access-status')).toHaveText('Demonstration Mode gate applied for this session.');
 await expect(id(page,'radio-access-gate')).toContainText('Demonstration Mode gate applied');await expect(id(page,'radio-access-demo-note')).toContainText('Web scenario');
 // Preferences → the partial parent with Radio... focused.
 await id(page,'radio-access-preferences').click();await expect(parent(page)).toBeVisible();
 await expect(parent(page)).toContainText('Optical Simulation Options');await expect(parent(page)).toContainText('Partial web form');
 await expect(id(page,'radio-access-radio')).toBeFocused();await expect(id(page,'radio-access-radio')).toHaveText('Radio...');
 // Radio... → the child on the same object: the checkbox starts Off and has focus; the parent is blocked.
 await id(page,'radio-access-radio').click();await expect(child(page)).toBeVisible();await expect(child(page)).toContainText('Radio Simulation Options');
 await expect(id(page,'radio-access-checkbox')).toBeFocused();await expect(id(page,'radio-access-checkbox')).not.toBeChecked();
 await expect(parent(page)).toHaveAttribute('data-blocked','true');await expect(parent(page)).toHaveAttribute('inert');
 await id(page,'radio-access-checkbox').check();await values(page,'false','false','unknown');// Checked only, until OK
 await id(page,'radio-access-child-ok').click();await expect(child(page)).toHaveCount(0);
 await expect(id(page,'radio-access-radio')).toBeFocused();await expect(id(page,'radio-access-parent-status')).toHaveAttribute('data-status','radio-ok');
 await values(page,'true','false','true');
 // Outer Cancel still copies the object to the panel's copy.
 await id(page,'radio-access-parent-cancel').click();await expect(parent(page)).toHaveCount(0);await expect(id(page,'radio-access-preferences')).toBeFocused();
 await values(page,'true','true','true');
 await expect(id(page,'radio-access-status')).toHaveText('Options dialog closed with Cancel: the radio options object was still copied to the panel\'s copy, as in the original.');
 await menuIs(page,'hidden');await expect(id(page,'radio-access-menu-history')).toContainText('has not had its first activation');
 // First activation with the copy On: shown and enabled.
 await switchOnTracking(page);
 await menuIs(page,'shown-enabled','activation-shown');await expect(id(page,'radio-access-menu-flags')).toHaveText('Enabled: True · Visible: True');await noCommand(page);
 // Receiver Open (a source hit) disables it.
 await openReceiver(page);await menuIs(page,'shown-disabled','open-disabled');
 // Default recipient TEnvironment1: no handler, nothing changes.
 await expect(id(page,'radio-access-recipient')).toHaveAttribute('data-recipient','environment');
 await closeMain(page);await menuIs(page,'shown-disabled','close-environment');
 // [W] TRadioLab recipient: the recovered handler re-enables (visibility untouched).
 await openReceiver(page);await menuIs(page,'shown-disabled','open-disabled');
 await id(page,'radio-access-recipient-radio-lab').check();await expect(id(page,'radio-access-recipient')).toHaveAttribute('data-recipient','radio-lab');
 await closeMain(page);await menuIs(page,'shown-enabled','close-enabled');await noCommand(page);
 // A new Open disables again; with the copy turned Off, reopening the existing main window calls Open again (skipped).
 await openReceiver(page);await menuIs(page,'shown-disabled','open-disabled');
 await configure(page,false,'ok');
 await expect(id(page,'radio-access-status')).toContainText('that is not ported, so nothing was written');
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-heading-0')).toBeFocused();
 await menuIs(page,'shown-disabled','open-skipped');
 // With the copy Off the TRadioLab close changes nothing.
 await closeMain(page);await menuIs(page,'shown-disabled','close-skipped');
 await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','demonstration');
});

test('history: access turned on after the first activation keeps the item hidden across route hide/show; Open and a TRadioLab close only change Enabled',async({page})=>{
 await startApp(page);await radioRoute(page);
 await switchOnTracking(page);
 await menuIs(page,'hidden','activation-hidden');await expect(id(page,'radio-access-menu')).toHaveAttribute('data-activation-seen','true');
 await expect(id(page,'radio-access-menu-history')).toContainText('Decided at the radio panel\'s first activation only');
 await demonstration(page);await configure(page,true,'ok');
 await values(page,'true','true','true');await menuIs(page,'hidden');
 // Route hide/show: no new first activation.
 await nav(page,'Radio data').click();await expect(id(page,'pulsar-analysis')).toBeVisible();await flush(page);
 await nav(page,'Radio telescope').click();await expect(id(page,'radio-access-card')).toBeVisible();await flush(page);
 await menuIs(page,'hidden','activation-hidden');
 await loadCatalog(page);await openReceiver(page);await menuIs(page,'hidden','open-disabled');
 await id(page,'radio-access-recipient-radio-lab').check();await closeMain(page);
 await menuIs(page,'hidden-enabled','close-enabled');await expect(id(page,'radio-access-menu-flags')).toHaveText('Enabled: True · Visible: False');await noCommand(page);
 // Reload resets the whole session.
 await page.clock.resume();await page.reload();await nav(page,'Radio telescope').click();await expect(id(page,'radio-access-card')).toBeVisible();
 await values(page,'false','false','unknown');await menuIs(page,'hidden');await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','not-supplied');
 await expect(id(page,'radio-access-recipient')).toHaveAttribute('data-recipient','environment');
});

test('a limit-2 miss at Receiver Open also disables; a refused Open behind the dialog changes nothing',async({page})=>{
 await startApp(page);await radioRoute(page);await demonstration(page);await configure(page,true);
 await switchOnTracking(page);await loadCatalog(page);await applyClock(page);await menuIs(page,'shown-enabled','activation-shown');
 // Refused while the options dialog is open: the receiver button is gated; a programmatic click opens nothing.
 await id(page,'radio-access-preferences').click();await expect(parent(page)).toBeVisible();
 await expect(id(page,'antenna-receiver-button')).toBeDisabled();
 await clickBehind(page,'antenna-receiver-button');await flush(page);await expect(id(page,'receiver-card-0')).toHaveCount(0);
 await menuIs(page,'shown-enabled','activation-shown');
 await page.keyboard.press('Escape');await expect(parent(page)).toHaveCount(0);await expect(id(page,'radio-access-preferences')).toBeFocused();
 // At the miss pointing the picker finds nothing within 2.0; the paths converge and the item is disabled.
 await slewTo(page,MISS);await openReceiver(page);
 await menuIs(page,'shown-disabled','open-disabled');
});

test('child Cancel restores; Escape cancels one level only; a held Enter and a double click open one child; Tab is trapped; cards are inert; Pulsar Parameters is unaffected',async({page})=>{
 await startApp(page);await radioRoute(page);await loadCatalog(page);await demonstration(page);
 // Keyboard-only: Enter on the opener, then a held Enter on Radio...: one child.
 await id(page,'radio-access-preferences').focus();await page.keyboard.press('Enter');await expect(parent(page)).toBeVisible();
 await expect(id(page,'radio-access-radio')).toBeFocused();
 await page.keyboard.down('Enter');await expect(child(page)).toBeVisible();await expect(id(page,'radio-access-checkbox')).toBeFocused();
 await page.keyboard.down('Enter');await flush(page);await page.keyboard.up('Enter');
 await expect(child(page)).toHaveCount(1);await expect(id(page,'radio-access-checkbox')).not.toBeChecked();
 // Tab stays inside the child: checkbox → OK → Cancel → checkbox; Shift+Tab wraps back.
 await page.keyboard.press('Tab');await expect(id(page,'radio-access-child-ok')).toBeFocused();
 await page.keyboard.press('Tab');await expect(id(page,'radio-access-child-cancel')).toBeFocused();
 await page.keyboard.press('Tab');await expect(id(page,'radio-access-checkbox')).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(id(page,'radio-access-child-cancel')).toBeFocused();
 await id(page,'radio-access-checkbox').focus();await page.keyboard.press('Space');await expect(id(page,'radio-access-checkbox')).toBeChecked();
 // Every other radio surface is behind the dialogs.
 for(const card of ['radio-access-card','radio-route-clock','radio-route-date','pulsar-params-card','receiver-setup','radio-route-panel-wrapper'])await expect(id(page,card)).toHaveAttribute('inert');
 // Escape: the child cancels (snapshot restored, last result 0); the parent stays open.
 await page.keyboard.press('Escape');await expect(child(page)).toHaveCount(0);await expect(parent(page)).toBeVisible();
 await expect(id(page,'radio-access-radio')).toBeFocused();await expect(id(page,'radio-access-parent-status')).toHaveAttribute('data-status','radio-cancelled');
 await values(page,'false','false','false');
 // OK, then a reopened Cancel: the record keeps On, the last result is 0 (assignment).
 await id(page,'radio-access-radio').click();await id(page,'radio-access-checkbox').check();await id(page,'radio-access-child-ok').click();
 await values(page,'true','false','true');
 await id(page,'radio-access-radio').dblclick();await expect(child(page)).toHaveCount(1);await expect(id(page,'radio-access-checkbox')).toBeChecked();
 await id(page,'radio-access-child-cancel').click();await expect(child(page)).toHaveCount(0);await values(page,'true','false','false');
 // Escape on the parent: outer Cancel, the copy is applied; focus returns to the opener.
 await page.keyboard.press('Escape');await expect(parent(page)).toHaveCount(0);await expect(id(page,'radio-access-preferences')).toBeFocused();
 await values(page,'true','true','false');
 // The Pulsar Parameters Open behaves the same whatever the option says.
 await id(page,'pulsar-params-open').click();await expect(id(page,'pulsar-params-window')).toBeVisible();await expect(id(page,'pulsar-params-heading')).toBeFocused();
 await expect(id(page,'pulsar-params-position')).toHaveText('Record 1 of 4');
 await id(page,'pulsar-params-exit').click();
 await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','demonstration');
});

test('suppression: hidden by an antenna surface, the dialogs keep their state and take focus again; nothing moves focus meanwhile',async({page})=>{
 await startApp(page);await radioRoute(page);await switchOnTracking(page);await applyClock(page);await demonstration(page);
 // Start a slew, then open the dialogs before it completes: its completion box takes over.
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await id(page,`antenna-field-${name}`).fill(MISS[i]);
 await id(page,'antenna-dialog-ok').click();await flush(page);await id(page,'antenna-notice-yes').click();await flush(page);
 await expect(id(page,'antenna-notice')).toHaveCount(0);
 await id(page,'radio-access-preferences').click();await expect(parent(page)).toBeVisible();
 await id(page,'radio-access-radio').click();await id(page,'radio-access-checkbox').check();
 for(let i=0;i<300&&await id(page,'antenna-notice').count()===0;i++)await advance(page,200);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');
 await expect(child(page)).toHaveCount(0);await expect(parent(page)).toHaveCount(0);
 await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-pending','true');await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','false');
 // The yielded configuration does not put the panel (and so the antenna box) behind it.
 await expect(id(page,'radio-route-panel-wrapper')).not.toHaveAttribute('inert');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 expect(await noInertAncestor(page,'antenna-notice-ok')).toBe(true);
 await id(page,'antenna-notice-ok').click();await flush(page);
 // Presented again: the child keeps Checked and takes focus; the parent stays blocked behind it.
 await expect(child(page)).toBeVisible();await expect(id(page,'radio-access-checkbox')).toBeChecked();await expect(id(page,'radio-access-checkbox')).toBeFocused();
 await expect(parent(page)).toHaveAttribute('data-blocked','true');await expect(id(page,'radio-route-panel-wrapper')).toHaveAttribute('inert');
 await values(page,'false','false','unknown');
 await id(page,'radio-access-child-ok').click();await id(page,'radio-access-parent-ok').click();await values(page,'true','true','true');
 // First activation happened before: the late configuration does not show the item.
 await menuIs(page,'hidden','activation-hidden');
});

test('suppression, keyboard: Enter answers the antenna box over the yielded dialogs; the child returns checked and focused',async({page})=>{
 await startApp(page);await radioRoute(page);await switchOnTracking(page);await applyClock(page);await demonstration(page);
 await beginSlew(page,MISS);
 await id(page,'radio-access-preferences').focus();await page.keyboard.press('Enter');await expect(parent(page)).toBeVisible();
 await page.keyboard.press('Enter');await expect(child(page)).toBeVisible();await page.keyboard.press('Space');await expect(id(page,'radio-access-checkbox')).toBeChecked();
 await untilArrival(page);
 await expect(child(page)).toHaveCount(0);await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','false');
 await expect(id(page,'radio-route-panel-wrapper')).not.toHaveAttribute('inert');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 expect(await noInertAncestor(page,'antenna-notice-ok')).toBe(true);
 await page.keyboard.press('Enter');await flush(page);await expect(id(page,'antenna-notice')).toHaveCount(0);
 await expect(child(page)).toBeVisible();await expect(id(page,'radio-access-checkbox')).toBeChecked();await expect(id(page,'radio-access-checkbox')).toBeFocused();
 await expect(parent(page)).toHaveAttribute('data-blocked','true');await expect(id(page,'radio-route-panel-wrapper')).toHaveAttribute('inert');
 await values(page,'false','false','unknown');
 // Escape still cancels one level at a time.
 await page.keyboard.press('Escape');await expect(child(page)).toHaveCount(0);await expect(id(page,'radio-access-radio')).toBeFocused();await values(page,'false','false','false');
 await page.keyboard.press('Escape');await expect(parent(page)).toHaveCount(0);await expect(id(page,'radio-access-preferences')).toBeFocused();
});

test('closed gate: an antenna box over the USER OPTIONS! box is answered by keyboard; the box returns with OK focused and still changes nothing',async({page})=>{
 await startApp(page);await radioRoute(page);await switchOnTracking(page);await applyClock(page);
 await beginSlew(page,MISS);
 const box=id(page,'radio-access-refusal');
 await id(page,'radio-access-preferences').click();await expect(box).toBeVisible();await expect(id(page,'radio-access-refusal-ok')).toBeFocused();
 await untilArrival(page);
 await expect(box).toHaveCount(0);
 await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-pending','true');await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','false');
 await expect(id(page,'radio-route-panel-wrapper')).not.toHaveAttribute('inert');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 expect(await noInertAncestor(page,'antenna-notice-ok')).toBe(true);
 await page.keyboard.press('Enter');await flush(page);await expect(id(page,'antenna-notice')).toHaveCount(0);
 await expect(box).toBeVisible();await expect(id(page,'radio-access-refusal-ok')).toBeFocused();
 await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','true');await expect(id(page,'radio-route-panel-wrapper')).toHaveAttribute('inert');
 await page.keyboard.press('Enter');await expect(box).toHaveCount(0);await expect(id(page,'radio-access-preferences')).toBeFocused();
 await expect(id(page,'radio-access-status')).toHaveAttribute('data-outcome','user-options-dismissed');
 await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','not-supplied');await values(page,'false','false','unknown');
});

test('card actions dispatched behind a foreign native dialog are refused; after it closes the same actions apply',async({page})=>{
 await startApp(page);await radioRoute(page);
 // A page-level modal <dialog> (a browser-level foreign surface, not a product hook).
 await page.evaluate(()=>{const d=document.createElement('dialog');d.dataset.testid='foreign-dialog';d.textContent='Foreign dialog';document.body.append(d);d.showModal();});
 await expect(id(page,'foreign-dialog')).toBeVisible();
 await clickBehind(page,'radio-access-demo');await flush(page);
 await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','not-supplied');await expect(id(page,'radio-access-status')).not.toHaveAttribute('data-outcome');
 await clickBehind(page,'radio-access-recipient-radio-lab');await flush(page);
 await expect(id(page,'radio-access-recipient')).toHaveAttribute('data-recipient','environment');await expect(id(page,'radio-access-recipient-environment')).toBeChecked();
 // Positive control: the same programmatic clicks apply once the foreign dialog is closed.
 await page.evaluate(()=>{const d=document.querySelector<HTMLDialogElement>('[data-testid="foreign-dialog"]')!;d.close();d.remove();});
 await expect(id(page,'foreign-dialog')).toHaveCount(0);
 await clickBehind(page,'radio-access-demo');await flush(page);
 await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','demonstration');await expect(id(page,'radio-access-status')).toHaveAttribute('data-outcome','gate-opened');
 await clickBehind(page,'radio-access-recipient-radio-lab');await flush(page);
 await expect(id(page,'radio-access-recipient')).toHaveAttribute('data-recipient','radio-lab');await expect(id(page,'radio-access-recipient-radio-lab')).toBeChecked();
});

test('card actions dispatched behind the card\'s own USER OPTIONS! box or options dialogs are refused; after they close the action applies',async({page})=>{
 await startApp(page);await radioRoute(page);
 // Behind the USER OPTIONS! box: neither the gate scenario nor the recipient changes, and the status is not replaced.
 await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-refusal')).toBeVisible();
 await clickBehind(page,'radio-access-demo');await flush(page);
 await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','not-supplied');await expect(id(page,'radio-access-status')).not.toHaveAttribute('data-outcome');
 await clickBehind(page,'radio-access-recipient-radio-lab');await flush(page);
 await expect(id(page,'radio-access-recipient')).toHaveAttribute('data-recipient','environment');await expect(id(page,'radio-access-recipient-environment')).toBeChecked();
 await expect(id(page,'radio-access-refusal-ok')).toBeFocused();
 await page.keyboard.press('Escape');await expect(id(page,'radio-access-refusal')).toHaveCount(0);
 await expect(id(page,'radio-access-status')).toHaveAttribute('data-outcome','user-options-dismissed');
 // Behind the parent, then behind the child.
 await demonstration(page);
 await id(page,'radio-access-preferences').click();await expect(parent(page)).toBeVisible();
 await clickBehind(page,'radio-access-recipient-radio-lab');await flush(page);
 await expect(id(page,'radio-access-recipient')).toHaveAttribute('data-recipient','environment');await expect(id(page,'radio-access-recipient-environment')).toBeChecked();
 await id(page,'radio-access-radio').click();await expect(child(page)).toBeVisible();
 await clickBehind(page,'radio-access-recipient-radio-lab');await flush(page);
 await expect(id(page,'radio-access-recipient')).toHaveAttribute('data-recipient','environment');await expect(id(page,'radio-access-recipient-environment')).toBeChecked();
 await expect(id(page,'radio-access-checkbox')).toBeFocused();
 await page.keyboard.press('Escape');await expect(child(page)).toHaveCount(0);await page.keyboard.press('Escape');await expect(parent(page)).toHaveCount(0);
 await expect(id(page,'radio-access-status')).toHaveAttribute('data-outcome','preferences-closed-cancel');
 // Positive control: the same programmatic click applies with no surface open; the status is unchanged.
 await clickBehind(page,'radio-access-recipient-radio-lab');await flush(page);
 await expect(id(page,'radio-access-recipient')).toHaveAttribute('data-recipient','radio-lab');await expect(id(page,'radio-access-recipient-radio-lab')).toBeChecked();
 await expect(id(page,'radio-access-status')).toHaveAttribute('data-outcome','preferences-closed-cancel');
});

test('Record finish and the configuration both pending behind an antenna box: a real OK click gives focus to the Record dialog; the draft returns after it',async({page})=>{
 await startApp(page);await radioRoute(page);await switchOnTracking(page);await loadCatalog(page);await applyClock(page);await demonstration(page);
 await openReceiver(page);
 // Record → Receive → Stop; the sweep finishes later, behind the antenna box.
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await flush(page);await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
 // Without advancing the clock: start a slew and open the configuration child with a draft.
 await beginSlew(page,MISS);
 await id(page,'radio-access-preferences').click();await expect(parent(page)).toBeVisible();
 await id(page,'radio-access-radio').click();await expect(child(page)).toBeVisible();await id(page,'radio-access-checkbox').check();
 await untilArrival(page);
 for(let i=0;i<160&&await id(page,'receiver-record-layer').getAttribute('data-modal-pending')!=='true';i++)await advance(page,200);
 // Both surfaces wait behind the antenna box; the panel is not behind the yielded configuration.
 await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-pending','true');await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-presented','false');
 await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-pending','true');await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','false');
 await expect(id(page,'radio-route-panel-wrapper')).not.toHaveAttribute('inert');
 // A real click (no dispatched event): focus on the notice in this ordering is not asserted.
 await id(page,'antenna-notice-ok').click();await flush(page);
 const finish=id(page,'receiver-record-finish');
 await expect(finish).toBeVisible();await expect(id(page,'receiver-record-layer')).toHaveAttribute('data-modal-presented','true');
 await expect(child(page)).toHaveCount(0);await expect(id(page,'radio-access-layer')).toHaveAttribute('data-modal-presented','false');
 await expect(id(page,'receiver-record-identify-input')).toBeFocused();
 expect(await finish.evaluate(el=>el.contains(document.activeElement))).toBe(true);
 // Complete the Record dialog; then the configuration returns with its draft.
 await expect(finish).toHaveAttribute('data-stage','identify');
 await id(page,'receiver-record-identify-ok').click();await expect(finish).toHaveAttribute('data-stage','properties');
 await id(page,'receiver-record-properties-ok').click();await expect(finish).toHaveAttribute('data-stage','save');
 await id(page,'receiver-record-save-cancel').click();await expect(finish).toHaveCount(0);
 await expect(child(page)).toBeVisible();await expect(id(page,'radio-access-checkbox')).toBeChecked();await expect(id(page,'radio-access-checkbox')).toBeFocused();
 await expect(parent(page)).toHaveAttribute('data-blocked','true');
 await values(page,'false','false','unknown');
 await id(page,'radio-access-child-ok').click();await id(page,'radio-access-parent-cancel').click();await values(page,'true','true','true');
});

for(const width of [1440,390,375,320])test(`keyboard path and layout without overflow at ${width} px`,async({page},info:TestInfo)=>{
 await page.setViewportSize({width,height:900});
 await startApp(page);await radioRoute(page);
 await id(page,'radio-access-card').scrollIntoViewIfNeeded();await noOverflow(page);
 await page.screenshot({path:info.outputPath(`radio-access-card-${width}.png`)});
 await id(page,'radio-access-preferences').focus();await page.keyboard.press('Enter');await expect(id(page,'radio-access-refusal')).toBeVisible();await noOverflow(page);
 await page.screenshot({path:info.outputPath(`radio-access-refusal-${width}.png`)});
 await page.keyboard.press('Enter');await expect(id(page,'radio-access-refusal')).toHaveCount(0);
 await id(page,'radio-access-demo').focus();await page.keyboard.press('Enter');await expect(id(page,'radio-access-demo')).toBeDisabled();
 await id(page,'radio-access-preferences').focus();await page.keyboard.press('Enter');await expect(parent(page)).toBeVisible();await noOverflow(page);
 await page.screenshot({path:info.outputPath(`radio-access-parent-${width}.png`)});
 await page.keyboard.press('Enter');await expect(child(page)).toBeVisible();await noOverflow(page);
 await page.keyboard.press('Space');await expect(id(page,'radio-access-checkbox')).toBeChecked();
 await page.screenshot({path:info.outputPath(`radio-access-child-${width}.png`)});
 await page.keyboard.press('Tab');await expect(id(page,'radio-access-child-ok')).toBeFocused();await page.keyboard.press('Enter');
 await expect(child(page)).toHaveCount(0);await expect(id(page,'radio-access-radio')).toBeFocused();
 await page.keyboard.press('Tab');await expect(id(page,'radio-access-parent-ok')).toBeFocused();await page.keyboard.press('Enter');
 await expect(parent(page)).toHaveCount(0);await expect(id(page,'radio-access-preferences')).toBeFocused();
 await values(page,'true','true','true');await noOverflow(page);
 for(const testId of ['radio-access-card','radio-access-recipient','radio-access-menu']){
  const box=await id(page,testId).boundingBox();expect(box,testId).not.toBeNull();expect(box!.x+box!.width,testId).toBeLessThanOrEqual(width);
 }
});

/** One seeded receiver scenario (seed 1, fixed radio clock, synthetic catalog), with or without every configuration action
 * interleaved. Returns the observable receiver, cursor, Record and Save results. */
async function scenario(browser:Browser,info:TestInfo,withConfiguration:boolean){
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1440,height:1050},acceptDownloads:true});
 const page=await context.newPage();
 const step=async(action:()=>Promise<void>)=>{if(withConfiguration)await action();};
 try{
  await startApp(page);await radioRoute(page);
  await step(async()=>{
   await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-refusal')).toBeVisible();await page.keyboard.press('Escape');
   await demonstration(page);await configure(page,true,'ok');
  });
  await switchOnTracking(page);await loadCatalog(page);await applyClock(page);
  await step(async()=>{await id(page,'radio-access-recipient-radio-lab').check();await configure(page,false,'cancel');await configure(page,true,'cancel');});
  await openReceiver(page);
  await step(async()=>{
   await id(page,'radio-access-preferences').click();await id(page,'radio-access-radio').click();await id(page,'radio-access-checkbox').setChecked(false);
   await page.keyboard.press('Escape');await expect(child(page)).toHaveCount(0);await expect(id(page,'radio-access-radio')).toBeFocused();
   await page.keyboard.press('Escape');await expect(parent(page)).toHaveCount(0);
  });
  // Record → Receive → Stop → Identify → Properties.
  await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
  await id(page,'receiver-mode').click();await flush(page);await advance(page,600);await id(page,'receiver-mode').click();await flush(page);await untilFinished(page);
  const finish=id(page,'receiver-record-finish');await expect(finish).toHaveAttribute('data-stage','identify');
  const identify=await id(page,'receiver-record-identify-input').inputValue();
  await id(page,'receiver-record-identify-ok').click();await expect(finish).toHaveAttribute('data-stage','properties');
  const properties=await finish.innerText();
  await id(page,'receiver-record-properties-ok').click();await expect(finish).toHaveAttribute('data-stage','save');
  await id(page,'receiver-record-save-cancel').click();await expect(finish).toHaveCount(0);
  await step(async()=>{await configure(page,true,'ok');});
  const canvas=await id(page,'receiver-canvas-0').evaluate(c=>(c as HTMLCanvasElement).toDataURL());
  const observed={
   source:await id(page,'receiver-source').innerText(),title:await id(page,'receiver-heading-0').innerText(),
   sweep:await id(page,'receiver-sweep-0').getAttribute('data-position'),seed:await id(page,'receiver-seed-next').innerText(),identify,properties,canvas,
  };
  await id(page,'pulsar-params-open').click();await expect(id(page,'pulsar-params-window')).toBeVisible();
  const win=id(page,'pulsar-params-window');
  const cursor=[await win.getAttribute('data-index'),await win.getAttribute('data-shown'),await win.getAttribute('data-cursor'),await id(page,'pulsar-params-field-j2000').inputValue()];
  await id(page,'pulsar-params-exit').click();
  await closeMain(page);
  const saved=(await save(page)).toString('latin1');
  return {...observed,cursor,saved,menu:await id(page,'radio-access-menu').getAttribute('data-availability')};
 }finally{await context.close();}
}
test('preservation: the same seeded receiver scenario with and without every configuration action gives identical receiver, cursor, Record and Save results',async({browser},info)=>{
 test.setTimeout(240_000);
 const a=await scenario(browser,info,false),b=await scenario(browser,info,true);
 // The configuration only changed its own readout.
 expect(a.menu).toBe('hidden');expect(b.menu).toBe('shown-enabled');
 expect({...b,menu:a.menu}).toEqual(a);
 expect(a.source).toContain('J0001+3826');expect(a.identify).toBe('B2358+38');expect(a.properties).toContain('B2358+38');
});
