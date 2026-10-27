import {test,expect,type Locator,type Page} from '@playwright/test';
import{openHeaderTools}from'./fixtures/header-tools';
// Actual App flows of the Set Coordinates epoch choice (docs/RADIO-ANTENNA.md "Epoch of Input Coordinates", RA-EP-01..04):
// B1950.0 entry → recovered fixed-epoch conversion → J2000 stored target → confirmation note → slew/arrival, the converting
// reopen, Cancel drift, error boxes, browser history and the hot-list reset. Expected display fields of V1–V3 are the
// coordinator's synthetic vectors (app-reference-vectors.json, Decimal reference), not acquired observations or a native
// runtime oracle. Synthetic HTL bytes are written here.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const notice=(page:Page)=>id(page,'antenna-notice');
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
type Press=(target:Locator)=>Promise<void>;
const clickPress:Press=target=>target.click();
const tapPress:Press=target=>target.tap();
type Fields=readonly [string,string,string,string,string,string];
const FIELDS=['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'] as const;
async function enterCoordinates(page:Page,values:Fields){for(const [i,name] of FIELDS.entries())await id(page,`antenna-field-${name}`).fill(values[i]);}
async function expectFields(page:Page,values:Fields){for(const [i,name] of FIELDS.entries())await expect(id(page,`antenna-field-${name}`)).toHaveValue(values[i]);}
/** Radio route, compiled defaults, access tick, switch On and Tracking on. */
async function setupRadio(page:Page,press:Press=clickPress){
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await openHeaderTools(page);await press(nav(page,'Radio telescope'));await expect(heading(page,'Radio telescope control')).toBeFocused();
 await press(id(page,'radio-exercise'));await press(id(page,'radio-env-compiled'));
 await press(id(page,'radio-access'));await press(id(page,'radio-timer-deliver'));await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await press(id(page,'radio-switch'));await expect(id(page,'antenna-status')).toContainText('initialized');
 await press(id(page,'antenna-tracking'));await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
/** Canonical Extended of a finite binary64 (normal or +0), as the HTL codec writes it. */
function ext(value:number):Buffer{
 const b=Buffer.alloc(10);if(value===0)return b;
 const d=Buffer.alloc(8);d.writeDoubleLE(value);const bits=d.readBigUInt64LE(0),sign=Number(bits>>63n),e=Number(bits>>52n&0x7ffn),f=bits&((1n<<52n)-1n);
 b.writeBigUInt64LE((1n<<52n|f)<<11n,0);b.writeUInt16LE(sign<<15|e-1023+16383,8);return b;
}
function rec(name:string,ra:number,dec:number,remarks=''){
 const b=Buffer.alloc(86);b[0]=name.length;b.write(name,1,'latin1');ext(ra).copy(b,25);ext(dec).copy(b,35);b[45]=remarks.length;b.write(remarks,46,'latin1');return b;
}
const SHORT=Buffer.concat([rec('Alpha',2,15,'a'),rec('Beta',3,-15,'b')]);

test('V1: keyboard B1950 choice → converted confirmation → Yes → arrival; reopen converts, Escape keeps B1950, another open converts again',async({page})=>{
 await setupRadio(page);
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-epoch-0')).toBeChecked();
 await expect(id(page,'antenna-b1950-note')).toHaveCount(0);await expect(id(page,'antenna-b1950-reopen')).toHaveCount(0);
 await enterCoordinates(page,['1','0','0','30','0','0']);
 // The epoch radios are one keyboard group: an arrow key moves the choice; choosing converts nothing by itself.
 await id(page,'antenna-epoch-0').focus();await page.keyboard.press('ArrowDown');
 await expect(id(page,'antenna-epoch-1')).toBeChecked();await expect(id(page,'antenna-epoch-1')).toBeFocused();
 await expect(id(page,'antenna-b1950-note')).toContainText('original program’s fixed-epoch precession');await expect(id(page,'antenna-b1950-note')).toContainText('at or below about −89.427° becomes northern');await expect(id(page,'antenna-b1950-pole')).toHaveCount(0);
 await expect(id(page,'antenna-target')).toHaveAttribute('data-epoch','J2000');await expect(id(page,'antenna-field-raHours')).toHaveValue('1');
 // Held Enter in a field chooses OK once; its repeats do not answer the confirmation.
 await id(page,'antenna-field-decSeconds').focus();await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');
 await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope to RA 1h 2m 43.99s, Dec +30° 16′ 6.5″?');
 await expect(id(page,'antenna-notice-b1950')).toHaveText('Converted from your B1950.0 entry (OpenVireo note).');await expect(id(page,'antenna-notice-b1950')).not.toHaveAttribute('data-pole-sign-lost');
 await expect(id(page,'antenna-target')).toContainText('1h 2m 43.99s, +30° 16′ 6.5″');
 await id(page,'antenna-notice-yes').click();
 await expect(notice(page)).toHaveAttribute('data-kind','slew-complete',{timeout:20_000});
 await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 2 Mins 43.99 Secs');await expect(id(page,'antenna-dec')).toHaveText('+30 Degs 16 Mins 6.5 Secs');
 await id(page,'antenna-notice-ok').click();await expect(id(page,'antenna-set-coordinates')).toBeFocused();
 // Reopen: FormActivate converts the stored J2000 target to B1950 before the prefill and remembers the epoch.
 await id(page,'antenna-set-coordinates').click();
 await expectFields(page,['1','0','0.00','30','0','0.0']);await expect(id(page,'antenna-epoch-1')).toBeChecked();await expect(id(page,'antenna-epoch-1')).toBeEnabled();
 await expect(id(page,'antenna-b1950-reopen')).toContainText('With B1950.0 chosen, OK converts the fields to J2000.0, which can shift the target');
 await expect(id(page,'antenna-b1950-reopen')).toContainText('with J2000.0 chosen, OK stores the fields as J2000.0 without conversion');
 await expect(id(page,'antenna-b1950-reopen')).not.toContainText('keep the target');
 await expect(id(page,'antenna-target')).toHaveAttribute('data-epoch','B1950');
 await page.keyboard.press('Escape');await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-set-coordinates')).toBeFocused();
 await expect(id(page,'antenna-status')).toContainText('the B1950.0 values written when the dialog opened stay stored, and the next Set Coordinates converts them again as if they were J2000.0');
 await expect(id(page,'antenna-target')).toContainText('1h 0m 0.00s, +30° 0′ 0.0″');await expect(id(page,'antenna-target-b1950')).toBeVisible();
 await expect(id(page,'antenna-target-b1950')).toContainText('with J2000.0 chosen, OK stores them without conversion');
 await expect(id(page,'antenna-ra')).toHaveText('1 Hrs 2 Mins 43.99 Secs');// Cancel moved nothing
 // Another open treats the kept B1950 values as J2000 and converts them again (original drift).
 await id(page,'antenna-set-coordinates').click();await expectFields(page,['0','57','16.56','29','43','50.4']);
 await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-dialog')).toHaveCount(0);
 await expect(id(page,'antenna-target')).toContainText('0h 57m 16.56s, +29° 43′ 50.4″');
 await noOverflow(page);await page.screenshot({path:test.info().outputPath('radio-epoch-desktop.png'),fullPage:true});
});

test('V2: a southern polar entry is warned, survives an error box with its epoch, and is stored northern; No keeps it',async({page})=>{
 await setupRadio(page);
 await id(page,'antenna-set-coordinates').click();
 await enterCoordinates(page,['6','0','0','-89','40','x']);await id(page,'antenna-epoch-1').check();
 await id(page,'antenna-dialog-ok').click();await expect(notice(page)).toHaveAttribute('data-kind','dec-invalid');
 await page.keyboard.press('Escape');await expect(notice(page)).toHaveCount(0);
 await expect(id(page,'antenna-epoch-1')).toBeChecked();await expect(id(page,'antenna-field-decSeconds')).toHaveValue('x');
 await expect(id(page,'antenna-target')).toHaveAttribute('data-epoch','J2000');
 await id(page,'antenna-field-decSeconds').fill('0');
 await expect(id(page,'antenna-b1950-pole')).toContainText('northern (positive) J2000.0 Declination');
 await id(page,'antenna-dialog-ok').click();await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');
 await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope to RA 3h 22m 33.65s, Dec +89° 34′ 0.8″?');
 await expect(id(page,'antenna-notice-b1950')).toHaveAttribute('data-pole-sign-lost','true');await expect(id(page,'antenna-notice-b1950')).toContainText('lost its minus sign');
 await id(page,'antenna-notice-no').click();await expect(id(page,'antenna-status')).toContainText('Slew declined');
 await expect(id(page,'antenna-target')).toContainText('3h 22m 33.65s, +89° 34′ 0.8″');
 await id(page,'antenna-set-coordinates').click();await expectFields(page,['2','2','41.15','89','21','9.5']);await expect(id(page,'antenna-epoch-1')).toBeChecked();
 await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-dialog')).toHaveCount(0);
});

test('V3 wraps past 24 h; Back/Forward re-presents the draft without converting again; a hot-list selection resets to J2000',async({page})=>{
 await setupRadio(page);
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['23','59','0','0','0','0']);await id(page,'antenna-epoch-1').check();
 await id(page,'antenna-dialog-ok').click();
 await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope to RA 0h 1m 33.73s, Dec +0° 16′ 42.3″?');
 await id(page,'antenna-notice-no').click();
 await id(page,'antenna-set-coordinates').click();await expectFields(page,['23','59','0.00','0','0','0.0']);
 await id(page,'antenna-field-raMinutes').fill('58');
 // Browser history hides the route; the dialog state is kept and presented again, not activated again (WEB-EP-01).
 await page.goBack();await expect(heading(page,'Start with the sky.')).toBeVisible();await expect(id(page,'antenna-dialog')).toHaveCount(0);
 await page.goForward();await expect(id(page,'antenna-dialog')).toBeVisible();
 await expectFields(page,['23','58','0.00','0','0','0.0']);await expect(id(page,'antenna-epoch-1')).toBeChecked();
 await expect(id(page,'antenna-target')).toContainText('23h 59m 0.00s');
 await page.keyboard.press('Escape');await expect(id(page,'antenna-dialog')).toHaveCount(0);
 // Hot list: the selection clears the remembered B1950 choice (0x567bb1) and fixes J2000 with the group disabled.
 await id(page,'antenna-hotlist-file').setInputFiles({name:'short.htl',mimeType:'application/octet-stream',buffer:SHORT});
 await expect(id(page,'antenna-hotlist-source')).toHaveText('Shared list: short.htl, 2 rows.');
 await id(page,'antenna-hotlist-open').click();await id(page,'antenna-hotlist-select').click();
 await expect(id(page,'antenna-dialog')).toBeVisible();await expectFields(page,['2','0','0.00','15','0','0.0']);
 await expect(id(page,'antenna-epoch-0')).toBeChecked();await expect(id(page,'antenna-epoch-0')).toBeDisabled();await expect(id(page,'antenna-epoch-1')).toBeDisabled();
 await expect(id(page,'antenna-b1950-note')).toHaveCount(0);await expect(id(page,'antenna-b1950-reopen')).toHaveCount(0);await expect(id(page,'antenna-target')).toHaveAttribute('data-epoch','J2000');
 await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();
 await id(page,'antenna-hotlist-close').click();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
 // Set Coordinates afterwards: the epoch group is enabled again at J2000 and nothing is converted.
 await id(page,'antenna-set-coordinates').click();await expectFields(page,['2','0','0.00','15','0','0.0']);
 await expect(id(page,'antenna-epoch-0')).toBeChecked();await expect(id(page,'antenna-epoch-1')).toBeEnabled();await expect(id(page,'antenna-b1950-reopen')).toHaveCount(0);
 await id(page,'antenna-dialog-ok').click();await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope to RA 2h 0m 0.00s, Dec +15° 0′ 0.0″?');
 await expect(id(page,'antenna-notice-b1950')).toHaveCount(0);await id(page,'antenna-notice-no').click();
});

/** Set Coordinates → entry in B1950.0 → OK → No: the B1950 choice is remembered and the converted J2000 target is stored. */
async function declineB1950(page:Page,values:Fields){
 await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,values);await id(page,'antenna-epoch-1').check();
 await id(page,'antenna-dialog-ok').click();await expect(notice(page)).toHaveAttribute('data-kind','confirm-slew');
}
test.describe('reopen guidance at 375 px',()=>{
 test.use({viewport:{width:375,height:812}});
 test('lost-minus note follows the current fields; a reopen that lost a southern sign is warned truthfully until Cancel or a hot-list selection',async({page})=>{
  await setupRadio(page);
  // D2: a stored Dec just above −1° is prefilled as −1 0 0.0 (carry): no lost-minus note.
  await declineB1950(page,['6','0','0','-0','59','59.97']);await id(page,'antenna-notice-no').click();
  await id(page,'antenna-set-coordinates').click();await expectFields(page,['6','0','0.00','-1','0','0.0']);
  await expect(id(page,'antenna-b1950-reopen')).toBeVisible();await expect(id(page,'antenna-b1950-reopen-sign')).toHaveCount(0);
  await id(page,'antenna-dialog-cancel').click();
  // A real prefill loss: the note shows for 0, disappears once -0 is typed, and OK then keeps the Dec southern.
  await declineB1950(page,['1','0','0','-0','30','0']);await id(page,'antenna-notice-no').click();
  await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-field-decDegrees')).toHaveValue('0');
  await expect(id(page,'antenna-b1950-reopen-sign')).toContainText('If you intend a southern Declination, type -0');
  const dialog=id(page,'antenna-dialog'),signId=await id(page,'antenna-b1950-reopen-sign').getAttribute('id');
  expect((await dialog.getAttribute('aria-describedby'))!.split(' ')).toContain(signId);
  await id(page,'antenna-field-decMinutes').fill('-30');await expect(id(page,'antenna-b1950-reopen-sign')).toHaveCount(0);// already southern
  await id(page,'antenna-field-decMinutes').fill('30');await expect(id(page,'antenna-b1950-reopen-sign')).toBeVisible();
  await id(page,'antenna-field-decDegrees').fill('-0');await expect(id(page,'antenna-b1950-reopen-sign')).toHaveCount(0);
  expect((await dialog.getAttribute('aria-describedby'))!.split(' ')).not.toContain(signId);
  await id(page,'antenna-dialog-ok').click();await expect(id(page,'antenna-notice-text')).toContainText('Dec −0° ');
  await id(page,'antenna-notice-no').click();
  // D3: −89° 24′ B1950 is outside the cap at OK, but its J2000 target is inside: the next open stores a northern B1950 target.
  await id(page,'antenna-set-coordinates').click();await enterCoordinates(page,['12','0','0','-89','24','0']);await id(page,'antenna-epoch-1').check();
  await expect(id(page,'antenna-b1950-pole')).toHaveCount(0);await expect(id(page,'antenna-b1950-pole-status')).toHaveAttribute('aria-live','polite');
  await id(page,'antenna-dialog-ok').click();await expect(id(page,'antenna-notice-text')).toContainText('Dec −89° 40′ 42.2″');
  await expect(id(page,'antenna-notice-b1950')).not.toHaveAttribute('data-pole-sign-lost');
  await id(page,'antenna-notice-no').click();
  await id(page,'antenna-set-coordinates').click();await expectFields(page,['12','0','0.00','89','24','0.0']);
  const pole=id(page,'antenna-b1950-reopen-pole');
  await expect(pole).toContainText('dropped the stored target’s southern sign');await expect(pole).toContainText('OK uses the fields and epoch currently entered');
  await expect(id(page,'antenna-b1950-pole')).toHaveCount(0);
  expect((await dialog.getAttribute('aria-describedby'))!.split(' ')).toContain(await pole.getAttribute('id'));
  await expect(id(page,'antenna-target')).toContainText('12h 0m 0.00s, +89° 24′ 0.0″');
  // Editing the Dec south or choosing J2000 changes neither the warning (it is about the stored target) nor the target.
  await id(page,'antenna-field-decDegrees').fill('-89');await id(page,'antenna-epoch-0').check();
  await expect(id(page,'antenna-b1950-reopen')).toBeVisible();await expect(id(page,'antenna-b1950-reopen')).toContainText('with J2000.0 chosen, OK stores the fields as J2000.0 without conversion');
  await expect(id(page,'antenna-target-b1950')).toContainText('With B1950.0 chosen, OK converts the entered fields to J2000.0');
  await expect(pole).toBeVisible();await expect(pole).not.toContainText('northern fields');await expect(pole).toContainText('Cancel keeps that northern B1950.0 target');
  await expect(id(page,'antenna-target')).toContainText('+89° 24′ 0.0″');await expect(id(page,'antenna-target')).toHaveAttribute('data-epoch','B1950');
  await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-dialog')).toHaveCount(0);
  await expect(id(page,'antenna-target')).toContainText('12h 0m 0.00s, +89° 24′ 0.0″');
  await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-b1950-reopen')).toBeVisible();await expect(pole).toHaveCount(0);
  await id(page,'antenna-dialog-cancel').click();
  // A hot-list selection opens a fixed J2000 dialog without the warning.
  await id(page,'antenna-hotlist-file').setInputFiles({name:'short.htl',mimeType:'application/octet-stream',buffer:SHORT});
  await id(page,'antenna-hotlist-open').click();await id(page,'antenna-hotlist-select').click();
  await expect(id(page,'antenna-dialog')).toBeVisible();await expect(pole).toHaveCount(0);await expect(id(page,'antenna-b1950-reopen-sign')).toHaveCount(0);
  await noOverflow(page);
 });
});

for(const width of [375,320])test.describe(`touch ${width}`,()=>{
 test.use({viewport:{width,height:812},hasTouch:true});
 test('taps through a B1950 entry, the confirmation and the converting reopen without horizontal scrolling',async({page})=>{
  await setupRadio(page,tapPress);
  await id(page,'antenna-set-coordinates').tap();await enterCoordinates(page,['1','0','0','30','0','0']);
  await id(page,'antenna-epoch-1').tap();await expect(id(page,'antenna-epoch-1')).toBeChecked();await expect(id(page,'antenna-b1950-note')).toBeVisible();await noOverflow(page);
  await id(page,'antenna-dialog-ok').tap();await expect(id(page,'antenna-notice-text')).toHaveText('Slew the telescope to RA 1h 2m 43.99s, Dec +30° 16′ 6.5″?');
  await expect(id(page,'antenna-notice-b1950')).toBeVisible();await noOverflow(page);
  await id(page,'antenna-notice-no').tap();
  await id(page,'antenna-set-coordinates').tap();await expectFields(page,['1','0','0.00','30','0','0.0']);await expect(id(page,'antenna-b1950-reopen')).toBeVisible();
  await noOverflow(page);await id(page,'antenna-dialog').screenshot({path:test.info().outputPath(`radio-epoch-touch-${width}.png`)});
  // Recorded, not asserted: vertical scrolling of the dialog is supported at these widths.
  const size=await id(page,'antenna-dialog').evaluate(el=>({scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}));
  test.info().annotations.push({type:`reopen dialog ${width}px`,description:`scrollHeight ${size.scrollHeight}, clientHeight ${size.clientHeight}`});
  console.log(`reopen dialog ${width}px: scrollHeight ${size.scrollHeight}, clientHeight ${size.clientHeight}`);
  await id(page,'antenna-dialog-cancel').tap();await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-target-b1950')).toBeVisible();
 });
});
