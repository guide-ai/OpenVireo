import {test,expect,type Page} from '@playwright/test';
import {clickHeaderTool} from './fixtures/header-tools';
import {enterInstructorMode,leaveInstructorMode} from './fixtures/instructor-mode';
// Front T11a (analysis/front-teacher/t11a/RECOVERY.md): radio Preferences › Radio... › Site... opens TStationDlg on the radio
// site of the radio options object (SiteBtnClick 0x5a9810); the panel's copy reaches the antenna latitude and the radio
// clock longitude at the Preferences close; the Horizon edit is discarded and the form is not reactivated (review 1 H1/H2);
// an instructor site is labelled uncertified and does not block the guided pulsar exercise (M1); Reset returns to the
// compiled values. Only the rendered App and its data attributes; expected values are the chosen
// web contract, not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
const D2R=Math.PI/180,COMPILED_LAT='0.6707300315414209',COMPILED_LON='-1.393499963671317';
const NEW_LAT=(30+25/60+48/3600)*D2R;

async function radioRoute(page:Page){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();
 await clickHeaderTool(page,'Radio telescope');await expect(heading(page,'Radio telescope control')).toBeFocused();
 // The lazily loaded route must render before the fake clock pauses (closure L2).
 await expect(id(page,'radio-route')).toBeVisible();await expect(id(page,'radio-env-compiled')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
}
/** Instructor mode, then the compiled numeric branch (Site... needs it: only there does the Preferences close project). */
async function instructorWithAuthority(page:Page){
 await id(page,'radio-env-compiled').click();await expect(id(page,'radio-env-diameter-current')).toHaveText('100');
 await enterInstructorMode(page);await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','instructor');
 await id(page,'radio-access-numeric-optin-true').click();await expect(id(page,'radio-access-numeric')).toHaveAttribute('data-authority','compiled-branch');
}
async function openSite(page:Page){
 await id(page,'radio-access-preferences').click();await id(page,'radio-access-radio').click();
 await expect(id(page,'radio-options-full')).toBeVisible();
 await expect(id(page,'radio-options-site')).toBeEnabled();await expect(id(page,'radio-options-site')).toHaveAttribute('title','Set location & time parameters.');
 await id(page,'radio-options-site').click();
 await expect(id(page,'radio-station-dialog')).toBeVisible();await expect(id(page,'radio-station-name')).toBeFocused();
 await expect(id(page,'radio-options-full')).toHaveAttribute('inert','');
}

test('Site... edits the radio site: the change reaches the antenna and the clock, is labelled uncertified, does not block Start, and Reset restores it',async({page})=>{
 await radioRoute(page);
 // Startup: compiled site, no label; without the numeric authority the Access-only child has no Site... button.
 await expect(id(page,'radio-site-uncertified')).toHaveCount(0);
 await enterInstructorMode(page);
 await id(page,'radio-access-preferences').click();await id(page,'radio-access-radio').click();
 await expect(id(page,'radio-access-child')).toBeVisible();await expect(id(page,'radio-options-site')).toHaveCount(0);
 await id(page,'radio-access-child-cancel').click();await id(page,'radio-access-parent-cancel').click();
 await leaveInstructorMode(page);
 await instructorWithAuthority(page);
 await expect(id(page,'radio-access-site-status')).toHaveAttribute('data-site','compiled');
 await expect(id(page,'radio-access-site-latitudeRadians')).toHaveAttribute('data-env',COMPILED_LAT);

 await openSite(page);
 // The same TStationDlg fields as the observatory, prefilled from the radio record (FormCreate OB-ST-02).
 await expect(id(page,'radio-station-name')).toHaveValue('NRAO - Greenbank, WV');
 await expect(id(page,'radio-station-lngDeg')).toHaveValue('79');await expect(id(page,'radio-station-ew-1')).toBeChecked();
 await expect(id(page,'radio-station-latDeg')).toHaveValue('38');await expect(id(page,'radio-station-latMin')).toHaveValue('25');await expect(id(page,'radio-station-latSec')).toHaveValue('48.00');
 await expect(id(page,'radio-station-ns-0')).toBeChecked();await expect(id(page,'radio-station-horizon')).toHaveValue('10.0');
 await expect(id(page,'radio-station-altitude')).toHaveValue('836.0');await expect(id(page,'radio-station-utLocal')).toHaveValue('5.0');
 // An invalid latitude shows Input Error! and keeps the dialog.
 await id(page,'radio-station-latDeg').fill('95');await id(page,'radio-station-ok').click();
 await expect(id(page,'radio-station-error')).toBeVisible();await expect(id(page,'radio-station-error-text')).toHaveText('Latitude is Invalid!');
 await page.keyboard.press('Escape');await expect(id(page,'radio-station-error')).toHaveCount(0);await expect(id(page,'radio-station-dialog')).toBeVisible();
 // An unconfirmed form edit survives the dialog (no FormActivate after TStationDlg, review 1 H2).
 await page.keyboard.press('Escape');await expect(id(page,'radio-station-dialog')).toHaveCount(0);await expect(id(page,'radio-options-site')).toBeFocused();
 await id(page,'radio-options-field-baseSlew91a').fill('60');await id(page,'radio-options-site').click();await expect(id(page,'radio-station-dialog')).toBeVisible();
 // A valid one: OK stores it; a Horizon above 90° is accepted and discarded (never copied back, review 1 H1/L1).
 await id(page,'radio-station-latDeg').fill('30');await id(page,'radio-station-name').fill('Test site');await id(page,'radio-station-horizon').fill('120');
 await id(page,'radio-station-ok').click();
 await expect(id(page,'radio-station-dialog')).toHaveCount(0);await expect(id(page,'radio-options-full')).not.toHaveAttribute('inert','');
 await expect(id(page,'radio-options-site')).toBeFocused();
 await expect(id(page,'radio-options-field-horizon90c')).toHaveValue('10.0');await expect(id(page,'radio-options-field-baseSlew91a')).toHaveValue('60');
 await expect(id(page,'radio-access-site-outcome')).toHaveAttribute('data-outcome','site-ok');
 // Not applied yet: the object changed, the panel's copy did not.
 await expect(id(page,'radio-access-site-latitudeRadians')).toHaveAttribute('data-root',String(NEW_LAT));
 await expect(id(page,'radio-access-site-latitudeRadians')).toHaveAttribute('data-env',COMPILED_LAT);
 await id(page,'radio-access-child-ok').click();await id(page,'radio-access-parent-ok').click();await expect(id(page,'radio-access-parent')).toHaveCount(0);
 await expect(id(page,'radio-access-numeric-horizon90c')).toHaveAttribute('data-env',String(10*D2R));

 // Applied at the Preferences close: the antenna latitude, the clock longitude (re-parsed 79°50'30.00"), the label.
 await expect(id(page,'radio-access-site-latitudeRadians')).toHaveAttribute('data-env',String(NEW_LAT));
 await expect(id(page,'radio-access-site-name')).toHaveAttribute('data-env','Test site');
 await expect(id(page,'radio-access-numeric-antenna')).toHaveAttribute('data-latitude',String(NEW_LAT));
 await expect(id(page,'radio-access-numeric-report')).toHaveAttribute('data-antenna','applied');
 await expect(id(page,'radio-access-numeric-report-antenna')).toContainText('Latitude');
 await expect(id(page,'radio-access-numeric-report-clock')).toHaveAttribute('data-clock','applied');
 await expect(id(page,'radio-clock-lon')).toHaveAttribute('data-longitude-radians',String(-(79+50/60+30/3600)*D2R));
 await expect(id(page,'radio-access-site-status')).toHaveAttribute('data-site','non-default');
 await expect(id(page,'radio-site-uncertified')).toBeVisible();await expect(id(page,'radio-site-uncertified')).toContainText('Test site');
 // The guided exercise is not blocked (M1); its activation points Dec at the site latitude (RA-04) and it keeps the site longitude.
 await id(page,'radio-exercise-start').click();await flush(page);
 await expect(id(page,'radio-exercise-status')).toHaveAttribute('data-kind','started');await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await expect(id(page,'radio-clock-lon')).toHaveAttribute('data-longitude-radians',String(-(79+50/60+30/3600)*D2R));
 const dec=Number(await id(page,'antenna-dec').getAttribute('data-dec-degrees'));expect(Math.abs(dec-(30+25/60+48/3600))).toBeLessThan(1e-9);
 // Leave keeps the values.
 await leaveInstructorMode(page);await expect(id(page,'radio-site-uncertified')).toBeVisible();
 await expect(id(page,'radio-access-site-latitudeRadians')).toHaveAttribute('data-env',String(NEW_LAT));

 // Reset (instructor mode is not needed for this card action) returns the five site fields and applies them.
 await id(page,'radio-access-site-reset').click();
 await expect(id(page,'radio-access-site-outcome')).toHaveAttribute('data-outcome','site-reset');
 await expect(id(page,'radio-access-site-status')).toHaveAttribute('data-site','compiled');
 await expect(id(page,'radio-access-site-latitudeRadians')).toHaveAttribute('data-env',COMPILED_LAT);
 await expect(id(page,'radio-access-site-name')).toHaveAttribute('data-root','NRAO - Greenbank, WV');
 await expect(id(page,'radio-access-numeric-antenna')).toHaveAttribute('data-latitude',COMPILED_LAT);
 await expect(id(page,'radio-clock-lon')).toHaveAttribute('data-longitude-radians',COMPILED_LON);
 await expect(id(page,'radio-site-uncertified')).toHaveCount(0);
 await id(page,'radio-access-site-reset').click();await expect(id(page,'radio-access-site-outcome')).toHaveAttribute('data-outcome','site-reset-unchanged');
});

test('Site... Cancel and Escape change nothing; Radio Cancel after a Site OK restores the earlier site; the dialog fits a phone',async({page})=>{
 await radioRoute(page);await instructorWithAuthority(page);
 await openSite(page);
 await id(page,'radio-station-latDeg').fill('12');await id(page,'radio-station-cancel').click();
 await expect(id(page,'radio-station-dialog')).toHaveCount(0);await expect(id(page,'radio-access-site-outcome')).toHaveAttribute('data-outcome','site-cancelled');
 await expect(id(page,'radio-access-site-latitudeRadians')).toHaveAttribute('data-root',COMPILED_LAT);
 // Site OK at −30°, then Radio Cancel: the activation snapshot (taken before Site...) brings the earlier site back.
 await id(page,'radio-options-site').click();await id(page,'radio-station-latDeg').fill('30');await id(page,'radio-station-latMin').fill('0');await id(page,'radio-station-latSec').fill('0');
 await id(page,'radio-station-ns-1').check();await id(page,'radio-station-ok').click();
 await expect(id(page,'radio-access-site-latitudeRadians')).toHaveAttribute('data-root',String(-30*D2R));
 await id(page,'radio-access-child-cancel').click();await expect(id(page,'radio-access-site-latitudeRadians')).toHaveAttribute('data-root',COMPILED_LAT);
 await id(page,'radio-access-radio').click();await expect(id(page,'radio-options-full')).toBeVisible();
 await id(page,'radio-options-site').click();await expect(id(page,'radio-station-dialog')).toBeVisible();
 await expect(id(page,'radio-station-latDeg')).toHaveValue('38');
 await page.keyboard.press('Escape');await expect(id(page,'radio-station-dialog')).toHaveCount(0);await expect(id(page,'radio-options-full')).toBeVisible();
 await id(page,'radio-access-child-cancel').click();await id(page,'radio-access-parent-cancel').click();
 await expect(id(page,'radio-access-site-status')).toHaveAttribute('data-site','compiled');await expect(id(page,'radio-site-uncertified')).toHaveCount(0);
 for(const width of [390,320]){
  await page.setViewportSize({width,height:800});
  await id(page,'radio-access-preferences').click();await id(page,'radio-access-radio').click();await id(page,'radio-options-site').click();
  await expect(id(page,'radio-station-dialog')).toBeVisible();await noOverflow(page);
  await id(page,'radio-station-cancel').click();await id(page,'radio-access-child-cancel').click();await id(page,'radio-access-parent-cancel').click();
 }
});
