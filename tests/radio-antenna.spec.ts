import {test,expect,type Page} from '@playwright/test';
// I06 radio antenna flows (TRadioLab Tracking/Slew Rate/Set Coordinates, TSkyCoordsDlg,
// SlewTimer2 slew, stop/resume, close/reopen), standalone panel contract. These run against an owned
// harness via OPENVIREO_RADIO_HARNESS_URL and skip otherwise; the panel's actual App route (#radio-control)
// is covered by tests/radio-saved-rows-app.spec.ts. They check the chosen implementation contract, not
// original runtime behavior.
const harness=process.env.OPENVIREO_RADIO_HARNESS_URL;
test.skip(!harness,'OPENVIREO_RADIO_HARNESS_URL is not set; App flows are covered by tests/radio-saved-rows-app.spec.ts.');
const id=(page:Page,testId:string)=>page.getByTestId(testId);
/** WEB wording: a start raises the index to the options maximum only where it is lower (a kept higher index stays). */
const SLEW_STARTED='Slew started at the rate shown under Slew Rate: the start raised the index to the options maximum where the index was lower, and kept a higher index unchanged.';
const notice=(page:Page)=>id(page,'antenna-notice');

/** Main window: exercise, compiled defaults (diameter 100, access option 0), access, scope timer tick, switch On. */
async function openPanel(page:Page,query=''){
 await page.goto(harness!+query);await expect(id(page,'radio-control')).toBeVisible();
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();
 await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await id(page,'radio-switch').click();await expect(id(page,'radio-panel-window')).toBeVisible();
 await expect(id(page,'antenna-status')).toContainText('initialized');
}
async function enterCoordinates(page:Page,values:readonly [string,string,string,string,string,string]){
 const names=['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'];
 for(const [i,name] of names.entries())await id(page,`antenna-field-${name}`).fill(values[i]);
}

test('Tracking → Set Coordinates → validation → confirmation → programmed slew → arrival',async({page})=>{
 await openPanel(page);
 await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText(/^\+38 Degs \d+ Mins \d+\.\d Secs$/);
 await expect(id(page,'antenna-rate')).toHaveText('Index 4: 500 arcsec per slew-timer tick');
 const setCoordinates=id(page,'antenna-set-coordinates');
 await expect(setCoordinates).toHaveText('Slew ▸ Set Coordinates...');await expect(setCoordinates).toBeDisabled();await expect(id(page,'antenna-menu-disabled')).toBeVisible();
 await expect(id(page,'antenna-rate-up')).toBeDisabled();
 await id(page,'antenna-tracking').click();await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');await expect(id(page,'antenna-tracking')).toHaveAttribute('aria-pressed','true');
 await expect(setCoordinates).toBeEnabled();await expect(id(page,'antenna-receiver')).toContainText('Receiver button: enabled.');
 await setCoordinates.click();
 const dialog=id(page,'antenna-dialog');await expect(dialog).toBeVisible();await expect(dialog).toContainText('Enter Sky Coordinates for Slew');await expect(dialog).toContainText('Epoch of Input Coordinates');
 await expect(id(page,'antenna-field-raHours')).toBeFocused();await expect(id(page,'antenna-field-raHours')).toHaveValue('0');await expect(id(page,'antenna-field-decDegrees')).toHaveValue('38');
 await expect(id(page,'antenna-epoch-0')).toBeChecked();
 await page.keyboard.type('25');await expect(id(page,'antenna-field-raHours')).toHaveValue('25');// RAHrEd text was selected
 await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');await expect(notice(page)).toContainText('0 to 24 hours');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await expect(id(page,'antenna-status')).toContainText('Right Ascension rejected');
 await page.keyboard.press('Escape');await expect(notice(page)).toHaveCount(0);await expect(dialog).toBeVisible();await expect(id(page,'antenna-dialog-ok')).toBeFocused();
 await expect(id(page,'antenna-field-raHours')).toHaveValue('25');// the edit survives the error box
 await enterCoordinates(page,['1','0','0','30','0','0']);
 await id(page,'antenna-field-decSeconds').press('Enter');// OK is the Default button
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope to RA 1h 0m 0.00s, Dec +30° 0′ 0.0″?');
 await expect(id(page,'antenna-notice-yes')).toBeFocused();await page.keyboard.press('Escape');await expect(notice(page)).toBeVisible();// Yes/No ignores Escape
 await page.keyboard.press('Enter');
 await expect(id(page,'antenna-status')).toHaveText(SLEW_STARTED);
 await expect(id(page,'antenna-rate')).toHaveText('Index 5: 5000 arcsec per slew-timer tick');await expect(id(page,'antenna-rate-down')).toBeDisabled();
 await expect(id(page,'antenna-manual')).toContainText('disabled');
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete',{timeout:15_000});
 await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+30 Degs 0 Mins 0.0 Secs');
 await id(page,'antenna-notice-ok').click();await expect(notice(page)).toHaveCount(0);await expect(setCoordinates).toBeFocused();
 await expect(id(page,'antenna-rate-down')).toBeEnabled();await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');
 // Re-entering the same coordinates: no-slew warning, nothing moves.
 await setCoordinates.click();await expect(id(page,'antenna-field-raHours')).toHaveValue('1');await expect(id(page,'antenna-field-decSeconds')).toHaveValue('0.0');
 await id(page,'antenna-dialog-ok').click();await expect(notice(page)).toHaveAttribute('data-kind','no-slew-needed');
 await id(page,'antenna-notice-ok').click();await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 0 Mins 0.00 Secs');
});

test('stop question pauses the slew; No resumes, Yes stops; cancel and late ticks change nothing',async({page})=>{
 await openPanel(page,'?manualTick=1');
 await id(page,'antenna-tracking').click();await id(page,'antenna-set-coordinates').click();
 await enterCoordinates(page,['1','0','0','30','0','0']);await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();
 const tick=id(page,'antenna-tick');
 for(let i=0;i<3;i++)await tick.click();
 await expect(id(page,'antenna-ticks')).toHaveText('Slew-timer ticks in this slew: 3');
 const decAfter3=await id(page,'antenna-dec').textContent();
 await id(page,'antenna-set-coordinates').click();
 await expect(notice(page)).toHaveAttribute('data-kind','stop-slew');await expect(tick).toHaveCount(0);await expect(id(page,'antenna-status')).toContainText('paused');
 await id(page,'antenna-notice-no').click();await expect(id(page,'antenna-status')).toHaveText('Slew resumed.');
 await tick.click();await expect(id(page,'antenna-ticks')).toHaveText('Slew-timer ticks in this slew: 4');
 await expect(id(page,'antenna-dec')).not.toHaveText(decAfter3!);
 await id(page,'antenna-set-coordinates').click();await id(page,'antenna-notice-yes').click();
 await expect(id(page,'antenna-status')).toHaveText('Slew stopped at the current position.');await expect(tick).toHaveCount(0);
 await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');await expect(id(page,'antenna-rate-up')).toBeEnabled();
 const ra=await id(page,'antenna-ra').textContent(),dec=await id(page,'antenna-dec').textContent();
 await expect(id(page,'antenna-target')).toContainText('1h 0m 0.00s, +30° 0′ 0.0″');
 // Reopen: the dialog shows the stored target; Escape cancels without storing or moving.
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-field-decDegrees')).toHaveValue('30');
 await id(page,'antenna-field-raHours').fill('7');await page.keyboard.press('Escape');
 await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-status')).toContainText('cancelled');
 await expect(id(page,'antenna-ra')).toHaveText(ra!);await expect(id(page,'antenna-dec')).toHaveText(dec!);await expect(id(page,'antenna-target')).toContainText('1h 0m');
});

test('dialog keeps focus inside, rejects Declination, converts B1950 (southern pole sign lost) and blocks the main window while modal',async({page})=>{
 await openPanel(page);await id(page,'antenna-tracking').click();await id(page,'antenna-set-coordinates').click();
 const first=id(page,'antenna-field-raHours'),cancel=id(page,'antenna-dialog-cancel');
 await cancel.focus();await page.keyboard.press('Tab');await expect(first).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(cancel).toBeFocused();
 // ShowModal disables the main window: even a scripted click on the switch is refused.
 await id(page,'radio-switch').dispatchEvent('click');
 await expect(id(page,'radio-switch')).toHaveAttribute('aria-checked','true');await expect(id(page,'antenna-status')).toContainText('Finish the open dialog');
 await expect(id(page,'antenna-dialog')).toBeVisible();
 await enterCoordinates(page,['5','0','0','-90','1','0']);await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','dec-invalid');await id(page,'antenna-notice-ok').click();
 await id(page,'antenna-field-decMinutes').fill('0');await id(page,'antenna-epoch-1').check();await expect(id(page,'antenna-b1950-note')).toBeVisible();
 // B1950 −90°: the polar branch (RA-EP-01) gives a northern J2000 Declination, as in the original; the dialog warns first.
 await expect(id(page,'antenna-b1950-pole')).toBeVisible();
 await id(page,'antenna-dialog-ok').click();await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');
 await expect(id(page,'antenna-notice-text')).toContainText('Dec +89° 43′');await expect(id(page,'antenna-notice-b1950')).toHaveAttribute('data-pole-sign-lost','true');
 await id(page,'antenna-notice-no').click();await expect(id(page,'antenna-target')).toContainText('+89° 43′');
 // Reopen converts the stored target to B1950 (epoch remembered); J2000 then takes the entry as typed.
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-epoch-1')).toBeChecked();await expect(id(page,'antenna-b1950-reopen')).toBeVisible();
 await id(page,'antenna-epoch-0').check();await enterCoordinates(page,['5','0','0','-90','0','0']);await id(page,'antenna-dialog-ok').click();
 await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope to RA 5h 0m 0.00s, Dec −90° 0′ 0.0″?');
 await id(page,'antenna-notice-no').click();await expect(id(page,'antenna-status')).toContainText('Slew declined');
 await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');
});

test('transit telescope: no Tracking button, Declination-only note with Cancel, RA unchanged',async({page})=>{
 await openPanel(page,'?transit=1');
 await expect(id(page,'antenna-tracking')).toHaveCount(0);await expect(id(page,'radio-panel-window')).toContainText('Meridian transit telescope');
 await expect(id(page,'antenna-options')).toContainText('transit on');
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['9','0','0','36','0','0']);await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','transit-dec-only');await page.keyboard.press('Escape');// OK/Cancel box: Escape = Cancel
 await expect(id(page,'antenna-status')).toContainText('Slew cancelled');
 await id(page,'antenna-set-coordinates').click();await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-ok').click();
 await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope in Declination to +36° 0′ 0.0″?');await id(page,'antenna-notice-yes').click();
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete',{timeout:10_000});
 await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+36 Degs 0 Mins 0.0 Secs');
});

test('closing the panel during a slew turns the switch off; the slew finishes hidden and the panel reopens there',async({page})=>{
 await openPanel(page);await id(page,'antenna-tracking').click();await id(page,'antenna-set-coordinates').click();
 await enterCoordinates(page,['2','0','0','20','0','0']);await id(page,'antenna-dialog-ok').click();await id(page,'antenna-notice-yes').click();
 await id(page,'radio-panel-close').click();await expect(id(page,'radio-panel-window')).toHaveCount(0);
 await expect(id(page,'radio-switch')).toHaveAttribute('aria-checked','false');await expect(id(page,'radio-status')).toContainText('switch turned off');
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete',{timeout:15_000});await id(page,'antenna-notice-ok').click();
 await id(page,'radio-switch').click();await expect(id(page,'radio-panel-window')).toBeVisible();
 await expect(id(page,'antenna-ra')).toHaveText('2 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('+20 Degs 0 Mins 0.0 Secs');
 await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');// the form was hidden, not re-initialized
});

test('enforced limits stop at the clock gate without moving',async({page})=>{
 await openPanel(page,'?limits=1');await id(page,'antenna-tracking').click();await id(page,'antenna-set-coordinates').click();
 await enterCoordinates(page,['3','0','0','10','0','0']);await id(page,'antenna-dialog-ok').click();
 // limits-require-clock (RA-12 G2): the current wording names the missing radio UT; the old "sidereal clock" phrase is retired.
 await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-status')).toContainText('no radio UT is supplied');
 await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');await expect(id(page,'antenna-target')).toContainText('3h 0m 0.00s');
});

test('unsupported entries: browser box over the open dialog, nothing stored or moved; OK, Escape, Cancel and reentry @mobile',async({page})=>{
 await openPanel(page,'?manualTick=1');await id(page,'antenna-tracking').click();
 const ra0=await id(page,'antenna-ra').textContent(),dec0=await id(page,'antenna-dec').textContent();
 await id(page,'antenna-set-coordinates').click();const target0=await id(page,'antenna-target').textContent();
 // Exact algebra gives 2 h; the earlier binary64 accumulation admitted 1 h.
 await enterCoordinates(page,['9007199254740993','-540431955284459520','3600','10','0','0']);await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','ra-unsupported');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await expect(id(page,'antenna-notice-text')).toContainText('cancel each other');await expect(id(page,'antenna-notice-text')).toContainText('at or below 1000000');
 await expect(id(page,'antenna-notice-note')).toContainText('Browser limit, not an original message');
 await expect(id(page,'antenna-status')).toHaveText('Right Ascension entry not supported in this browser version; nothing was stored. Change it and choose OK again.');
 const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(await overflow()).toBeLessThanOrEqual(0);await expect(id(page,'antenna-notice-ok')).toBeInViewport();
 await expect(id(page,'antenna-target')).toHaveText(target0!);await expect(id(page,'antenna-ra')).toHaveText(ra0!);await expect(id(page,'antenna-dec')).toHaveText(dec0!);
 await page.keyboard.press('Enter');await expect(notice(page)).toHaveCount(0);
 await expect(id(page,'antenna-field-raHours')).toHaveValue('9007199254740993');await expect(id(page,'antenna-field-raMinutes')).toHaveValue('-540431955284459520');
 // Same RA with seconds 0 is exact 0 h by cancellation: refused too, not reported as a range error.
 await id(page,'antenna-field-raMinutes').fill('-540431955284459580');await id(page,'antenna-field-raSeconds').fill('0');await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','ra-unsupported');await page.keyboard.press('Escape');await expect(notice(page)).toHaveCount(0);
 // 24.000000000000001 h: outside the range by less than the precision, so neither admitted as 24 nor called invalid.
 await enterCoordinates(page,['24.000000000000001','0','0','10','0','0']);await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','ra-unsupported');await expect(id(page,'antenna-notice-text')).toContainText('less than the arithmetic precision');
 await id(page,'antenna-notice-ok').click();
 // A clear range error is still the original error box.
 await id(page,'antenna-field-raHours').fill('24.0001');await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');await expect(id(page,'antenna-notice-note')).toContainText('flags 0x10');await id(page,'antenna-notice-ok').click();
 // Dec: RA fine, Declination 90° plus 1e-12″ is refused for precision.
 await enterCoordinates(page,['1','0','0','90','0','1e-12']);await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','dec-unsupported');await expect(id(page,'antenna-notice-text')).toContainText('−90° to +90°');
 await expect(id(page,'antenna-status')).toContainText('Declination entry not supported');await id(page,'antenna-notice-ok').click();
 await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-dialog')).toHaveCount(0);
 await expect(id(page,'antenna-target')).toHaveText(target0!);await expect(id(page,'antenna-ra')).toHaveText(ra0!);await expect(id(page,'antenna-dec')).toHaveText(dec0!);
 await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');
 // Reentry shows the stored values; signed/noncanonical exact entries still work (25 h − 60 min = 24 h, −0° 30′ = −0.5°).
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-field-raHours')).toHaveValue('0');
 await enterCoordinates(page,['25','-60','0','-0','30','0']);await id(page,'antenna-dialog-ok').click();
 await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope to RA 24h 0m 0.00s, Dec −0° 30′ 0.0″?');
 await id(page,'antenna-notice-no').click();await expect(id(page,'antenna-target')).toContainText('24h 0m 0.00s, −0° 30′ 0.0″');
});

/** A held key: one fresh keydown followed by auto-repeat keydowns (KeyboardEvent.repeat = true), then keyup. */
async function holdKey(page:Page,key:string,repeats:number){
 for(let i=0;i<=repeats;i++)await page.keyboard.down(key);
 await page.keyboard.up(key);
}

test('held Enter in a coordinate field chooses OK once; auto-repeat never answers the confirmation @mobile',async({page})=>{
 await openPanel(page,'?manualTick=1');await id(page,'antenna-tracking').click();await id(page,'antenna-set-coordinates').click();
 await enterCoordinates(page,['1','0','0','30','0','0']);await id(page,'antenna-field-decSeconds').focus();
 await holdKey(page,'Enter',4);
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');await expect(id(page,'antenna-notice-yes')).toBeFocused();
 await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');await expect(id(page,'antenna-tick')).toHaveCount(0);
 await expect(id(page,'antenna-status')).toHaveText('Coordinates stored; confirm the slew.');
 await page.keyboard.press('Enter');// a fresh press answers the default button
 await expect(id(page,'antenna-status')).toHaveText(SLEW_STARTED);
});

test('held Enter on an invalid entry opens one error box; held Escape closes only that box',async({page})=>{
 await openPanel(page);await id(page,'antenna-tracking').click();await id(page,'antenna-set-coordinates').click();
 await id(page,'antenna-field-raHours').fill('25');
 await holdKey(page,'Enter',4);
 await expect(notice(page)).toHaveAttribute('data-kind','ra-invalid');await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await holdKey(page,'Escape',4);
 await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-dialog')).toBeVisible();
 await expect(id(page,'antenna-field-raHours')).toHaveValue('25');await expect(id(page,'antenna-status')).toHaveText('Message closed.');
 await page.keyboard.press('Escape');// a fresh Escape is Cancel
 await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-status')).toContainText('cancelled');
});

test('visual evidence screenshots (only when OPENVIREO_RADIO_SCREENSHOTS names a directory)',async({page})=>{
 const dir=process.env.OPENVIREO_RADIO_SCREENSHOTS;test.skip(!dir,'Screenshots are evidence captures, not assertions.');
 const shot=(name:string)=>page.screenshot({path:`${dir}/${name}.png`,fullPage:true});
 await openPanel(page,'?manualTick=1');await id(page,'antenna-tracking').click();await shot('desktop-1-panel-tracking');
 await id(page,'antenna-set-coordinates').click();
 await enterCoordinates(page,['9007199254740993','-540431955284459520','3600','22','0','52']);await id(page,'antenna-dialog-ok').click();await shot('desktop-2a-ra-unsupported');
 await id(page,'antenna-notice-ok').click();
 await enterCoordinates(page,['5','34','31.94','22','0','52']);await shot('desktop-2-dialog');
 await id(page,'antenna-dialog-ok').click();await shot('desktop-3-confirm');
 await id(page,'antenna-notice-yes').click();for(let i=0;i<4;i++)await id(page,'antenna-tick').click();await shot('desktop-4-slewing');
 await page.setViewportSize({width:375,height:812});await id(page,'antenna-set-coordinates').click();await shot('mobile-1-stop-question');
 await id(page,'antenna-notice-yes').click();await id(page,'antenna-set-coordinates').click();await shot('mobile-2-dialog');
 await enterCoordinates(page,['1','0','0','90','0','1e-12']);await id(page,'antenna-dialog-ok').click();await shot('mobile-3-dec-unsupported');
});

test('mobile: panel and coordinate dialog fit 375 px without horizontal overflow @mobile',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await openPanel(page,'?instant=1');await id(page,'antenna-tracking').click();
 const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(await overflow()).toBeLessThanOrEqual(0);
 for(const t of ['antenna-set-coordinates','antenna-tracking','antenna-rate-up','antenna-rate-down','radio-panel-close'])await expect(id(page,t)).toBeVisible();
 await id(page,'antenna-set-coordinates').click();expect(await overflow()).toBeLessThanOrEqual(0);
 for(const t of ['antenna-field-raHours','antenna-field-decSeconds','antenna-epoch-1','antenna-dialog-ok','antenna-dialog-cancel'])await expect(id(page,t)).toBeInViewport();
 await enterCoordinates(page,['12','30','0','-45','30','0']);await id(page,'antenna-dialog-ok').click();
 await id(page,'antenna-notice-yes').click();await expect(id(page,'antenna-status')).toContainText('instant-slew');
 await expect(id(page,'antenna-ra')).toHaveText('12 Hrs 30 Mins 0.00 Secs');await expect(id(page,'antenna-dec')).toHaveText('−45 Degs 30 Mins 0.0 Secs');
 expect(await overflow()).toBeLessThanOrEqual(0);
});

// Coordinator reproduction: after Yes, focus returns to Set Coordinates; its default
// button activation must not consume auto-repeat from that same held consent key.
test('held confirmation Enter cannot reopen Set Coordinates and pause the slew @mobile',async({page})=>{
 await openPanel(page,'?manualTick=1');await id(page,'antenna-tracking').click();await id(page,'antenna-set-coordinates').click();
 await enterCoordinates(page,['1','0','0','30','0','0']);await id(page,'antenna-dialog-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');
 await page.keyboard.down('Enter');await expect(notice(page)).toHaveCount(0);
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');
 await expect(notice(page)).toHaveCount(0);await expect(id(page,'antenna-motion')).toContainText('Slewing');
 await page.keyboard.up('Enter');await id(page,'antenna-set-coordinates').click();
 await expect(notice(page)).toHaveAttribute('data-kind','stop-slew');await id(page,'antenna-notice-yes').click();
 await expect(id(page,'antenna-motion')).toHaveText('Telescope stopped.');
});
