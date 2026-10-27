import {test,expect,type Locator,type Page} from '@playwright/test';
import{clickHeaderTool,openHeaderTools}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
// Actual App flows of the radio hot-list Search (R-RX22, RA-HL-09, WEB-HL-09..11; docs/RADIO-ANTENNA.md "Hot list"). No
// harness. Synthetic HTL files written here byte by byte; no original HTL data. Expected rows were derived by hand from the
// Search1Click loop over the RA-HL-08 row texts below; they test the chosen web contract, not a native runtime oracle.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

/** Canonical Extended of a finite binary64 (normal or ±0), as the codec writes it. */
function ext(value:number):Buffer{
 const b=Buffer.alloc(10);
 if(value===0){if(Object.is(value,-0))b.writeUInt16LE(0x8000,8);return b;}
 const d=Buffer.alloc(8);d.writeDoubleLE(value);const bits=d.readBigUInt64LE(0),sign=Number(bits>>63n),e=Number(bits>>52n&0x7ffn),f=bits&((1n<<52n)-1n);
 b.writeBigUInt64LE((1n<<52n|f)<<11n,0);b.writeUInt16LE(sign<<15|e-1023+16383,8);return b;
}
function rec(name:string,ra:number,dec:number,remarks=''){
 const b=Buffer.alloc(86);b[0]=name.length;b.write(name,1,'latin1');ext(ra).copy(b,25);ext(dec).copy(b,35);b[45]=remarks.length;b.write(remarks,46,'latin1');return b;
}
/** File order Omega, Café, Twin, (empty ID), next → RA order Twin, next, Café, (empty ID), Omega (source indices [2, 4, 1, 3, 0]). */
const FIXTURE=Buffer.concat([rec('Omega',5,20,'last row'),rec('Café',3,-5,'µ°'),rec('Twin',1,30,'end'),rec('',4,0,'blank id'),rec('next',2,10,'pair')]);
const pad=(n:number)=>' '.repeat(n);
/** The recovered row texts (RA-HL-08) Search compares, hand-formatted. */
const ROWS=[
 `Twin${pad(20)}   1h 00m 00.00s   30° 00' 00.0"  end`,
 `next${pad(20)}   2h 00m 00.00s   10° 00' 00.0"  pair`,
 `Café${pad(20)}   3h 00m 00.00s   -5° 00' 00.0"  µ°`,
 `${pad(24)}   4h 00m 00.00s    0° 00' 00.0"  blank id`,
 `Omega${pad(19)}   5h 00m 00.00s   20° 00' 00.0"  last row`,
];
const SOLO=rec('Solo',6,0,'');
const htlFile=(name:string,buffer:Buffer)=>({name,mimeType:'application/octet-stream',buffer});

const opticalInput=(page:Page)=>page.getByLabel('Import original HTL file',{exact:true});
const opticalRows=(page:Page)=>page.locator('#htl-rows option');
async function saveOptical(page:Page){const next=page.waitForEvent('download');await page.getByRole('button',{name:'Save HTL file',exact:true}).click();return readFile((await(await next).path())!);}
async function openObservatoryHtl(page:Page){
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await page.getByRole('heading',{name:'Original hot lists',exact:true}).click();
}
type Press=(target:Locator)=>Promise<void>;
const clickPress:Press=target=>target.click();
const tapPress:Press=target=>target.tap();
/** Radio route, compiled defaults, access tick, switch On and Tracking on (the Slew menu is enabled with Tracking). */
async function setupRadio(page:Page,press:Press=clickPress){
 await openHeaderTools(page);await press(nav(page,'Radio telescope'));await expect(heading(page,'Radio telescope control')).toBeFocused();
 await press(id(page,'radio-exercise'));await press(id(page,'radio-env-compiled'));
 await press(id(page,'radio-access'));await press(id(page,'radio-timer-deliver'));await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await press(id(page,'radio-switch'));await expect(id(page,'antenna-status')).toContainText('initialized');
 await press(id(page,'antenna-tracking'));await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
/** Observatory Open of the fixture, then the radio route with the list opened (row 1 checked and focused). */
async function openList(page:Page,press:Press=clickPress){
 await openObservatoryHtl(page);await opticalInput(page).setInputFiles(htlFile('search.htl',FIXTURE));await expect(opticalRows(page)).toHaveCount(5);
 await setupRadio(page,press);
 await press(id(page,'antenna-hotlist-open'));await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();
}
const rowRadio=(page:Page,position:number)=>id(page,`antenna-hotlist-row-${position}`).locator('input');
const findDialog=(page:Page)=>id(page,'antenna-hotlist-search');
const query=(page:Page)=>id(page,'antenna-hotlist-search-query');
const foundRows=(page:Page)=>id(page,'antenna-hotlist-rows').locator('label[data-found]');
/** Opens Find, types the query (and Match case), then submits with the given button. */
async function search(page:Page,text:string,{mode='top',matchCase=false}:{mode?:'top'|'next';matchCase?:boolean}={}){
 await id(page,'antenna-hotlist-search-open').click();await expect(findDialog(page)).toBeVisible();
 await query(page).fill(text);
 const box=id(page,'antenna-hotlist-search-case');if(await box.isChecked()!==matchCase)await box.click();
 await id(page,`antenna-hotlist-search-${mode}`).click();await expect(findDialog(page)).toHaveCount(0);
}
async function expectFound(page:Page,position:number){
 await expect(foundRows(page)).toHaveCount(1);await expect(id(page,`antenna-hotlist-row-${position}`)).toHaveAttribute('data-found','true');
 await expect(rowRadio(page,position)).toBeFocused();
 await expect(id(page,'antenna-hotlist-found')).toContainText(`Search found row ${position}`);
}
async function expectMiss(page:Page,text:string){
 const notice=id(page,'antenna-notice');
 await expect(notice).toHaveAttribute('data-kind','hot-list-search-miss');
 await expect(notice.getByRole('heading')).toHaveText('String Not Found');
 expect(await id(page,'antenna-notice-text').textContent()).toBe(`"${text}" Not Found.`);
 expect(await id(page,'antenna-notice-text').innerText()).toBe(`"${text}" Not Found.`);
 await expect(id(page,'antenna-notice-note')).toHaveText('Original message box (flags 0x40) with its decoded original caption and text.');
 await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await id(page,'antenna-notice-ok').click();await expect(notice).toHaveCount(0);
 await expect(id(page,'antenna-hotlist-search-open')).toBeFocused();
}

test('a hit is highlighted, focused and not selected; Slew uses the remembered row until an explicit choice; nothing else changes',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await openObservatoryHtl(page);await opticalInput(page).setInputFiles(htlFile('search.htl',FIXTURE));
 const bytes=await saveOptical(page),pointing=await id(page,'pointing-ra').textContent();
 await setupRadio(page);
 const target=await id(page,'antenna-target').textContent();
 const ra=await id(page,'antenna-ra').getAttribute('data-ra-hours'),dec=await id(page,'antenna-dec').getAttribute('data-dec-degrees');
 await id(page,'antenna-hotlist-open').click();
 for(let i=1;i<=5;i++)expect(await id(page,`antenna-hotlist-native-${i}`).textContent()).toBe(ROWS[i-1]);
 await expect(rowRadio(page,1)).toBeChecked();
 // HS-11: the original caption as title, an empty query and Match case off, the field focused.
 await id(page,'antenna-hotlist-search-open').click();
 await expect(page.getByRole('dialog',{name:'Find Text String'})).toBeVisible();
 await expect(query(page)).toHaveValue('');await expect(query(page)).toBeFocused();await expect(id(page,'antenna-hotlist-search-case')).not.toBeChecked();
 await expect(query(page)).toHaveAttribute('maxlength','80');
 await query(page).fill('OMEGA');await page.keyboard.press('Enter');
 // HS-13: the last row is highlighted (reached through the join of rows 4 and 5); row 1 stays checked; no dialog or slew.
 await expect(findDialog(page)).toHaveCount(0);await expectFound(page,5);
 await expect(rowRadio(page,5)).not.toBeChecked();await expect(rowRadio(page,1)).toBeChecked();
 await expect(id(page,'antenna-hotlist-found')).toContainText('highlighted, not selected');
 await expect(id(page,'antenna-status')).toHaveText('Search found a row; it is highlighted, not selected.');
 await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-notice')).toHaveCount(0);
 await expect(id(page,'antenna-target')).toHaveText(target!);
 // HS-16: Slew before confirming uses the remembered row 1.
 await id(page,'antenna-hotlist-select').click();await expect(id(page,'antenna-field-raHours')).toHaveValue('1');
 // HS-17: the coordinate-dialog Cancel shows the list again and resets the Find state.
 await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();await expect(foundRows(page)).toHaveCount(0);
 await id(page,'antenna-hotlist-search-open').click();await expect(query(page)).toHaveValue('');await id(page,'antenna-hotlist-search-cancel').click();
 // HS-14: a click on the found row selects it; Slew then uses it.
 await search(page,'omega');await expectFound(page,5);
 await rowRadio(page,5).click();await expect(rowRadio(page,5)).toBeChecked();await expect(foundRows(page)).toHaveCount(0);
 await id(page,'antenna-hotlist-select').click();await expect(id(page,'antenna-field-raHours')).toHaveValue('5');await expect(id(page,'antenna-field-decDegrees')).toHaveValue('20');
 await id(page,'antenna-dialog-cancel').click();
 // A double-click on a found row selects it and slews.
 await search(page,'twin');await expectFound(page,1);await expect(rowRadio(page,1)).not.toBeChecked();
 await id(page,'antenna-hotlist-row-1').dblclick();await expect(id(page,'antenna-field-raHours')).toHaveValue('1');await expect(id(page,'antenna-field-decDegrees')).toHaveValue('30');
 await id(page,'antenna-dialog-cancel').click();await id(page,'antenna-hotlist-close').click();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
 // HS-18: pointing unchanged; the stored target holds only what explicit Slew to Selection wrote; the shared document,
 // its bytes and the observatory view are untouched and no request left the origin.
 await expect(id(page,'antenna-ra')).toHaveAttribute('data-ra-hours',ra!);await expect(id(page,'antenna-dec')).toHaveAttribute('data-dec-degrees',dec!);
 await expect(id(page,'antenna-hotlist-source')).toHaveText('Shared list: search.htl, 5 rows.');
 await clickHeaderTool(page,'Observatory');await expect(opticalRows(page)).toHaveCount(5);
 await expect(id(page,'pointing-ra')).toHaveText(pointing!);expect(await saveOptical(page)).toEqual(bytes);
 const origin=new URL(page.url()).origin;expect(requests.filter(url=>!url.startsWith(origin)&&!url.startsWith('blob:')&&!url.startsWith('data:'))).toEqual([]);
});

test('Next, the cross-row boundary, the last row and the decoded not-found box',async({page})=>{
 await openList(page);
 // HS-06: 'end next' starts inside row 1 (pos ≤ len); ' next' starts at the separator (pos = len + 1) → row 2.
 await search(page,'end next');await expectFound(page,1);
 await search(page,' next');await expectFound(page,2);
 // HS-04 analogue: Next after the highlight finds no later 'pair' → the decoded 0x40 box; the highlight stays.
 await search(page,'pair',{mode:'next'});await expectMiss(page,'pair');
 await expect(id(page,'antenna-hotlist-row-2')).toHaveAttribute('data-found','true');await expect(rowRadio(page,1)).toBeChecked();
 // The last row through the join of rows 4 and 5.
 await search(page,'last row');await expectFound(page,5);
 // HS-04: Next from the last row starts at Count: no wrap.
 await search(page,'last row',{mode:'next'});await expectMiss(page,'last row');
 // HS-03 (WEB-HL-09): with row 4 selected, Next starts on the last row as its first pass and selects it, never Count.
 await rowRadio(page,4).click();await expect(rowRadio(page,4)).toBeChecked();await expect(foundRows(page)).toHaveCount(0);
 await search(page,'last row',{mode:'next'});await expectFound(page,5);await expect(rowRadio(page,4)).toBeChecked();
 // HS-09: leading spaces of a row are skipped (the empty ID's 24 spaces), so '° 4h' joins row 3's end and row 4's start
 // and selects row 3 (pos = len), while '   4h' is not found anywhere.
 await search(page,'° 4h');await expectFound(page,3);
 await search(page,'   4h');await expectMiss(page,'   4h');
 // HS-02: a one-row list (radio Load replaces the shared list): Top's first pass is the last row.
 await id(page,'antenna-hotlist-close').click();
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('solo.htl',SOLO));await expect(id(page,'antenna-hotlist-source')).toHaveText('Shared list: solo.htl, 1 rows.');
 await id(page,'antenna-hotlist-open').click();await search(page,'SOLO');await expectFound(page,1);
});

test('case folding, remembered query, Cancel, empty submit and the reset on reopen',async({page})=>{
 await openList(page);
 await rowRadio(page,3).click();await expect(rowRadio(page,3)).toBeChecked();
 // HS-07: case-insensitive 'TWIN' finds 'Twin' and is remembered folded.
 await search(page,'TWIN');await expectFound(page,1);await expect(rowRadio(page,3)).toBeChecked();
 await id(page,'antenna-hotlist-search-open').click();await expect(query(page)).toHaveValue('twin');await expect(id(page,'antenna-hotlist-search-case')).not.toBeChecked();
 // The field's text is selected on open (Activate selects the edit text).
 expect(await query(page).evaluate(el=>{const i=el as HTMLInputElement;return [i.selectionStart,i.selectionEnd];})).toEqual([0,4]);
 await id(page,'antenna-hotlist-search-cancel').click();
 // With Match case 'TWIN' is not found and is remembered as typed.
 await search(page,'TWIN',{matchCase:true});await expectMiss(page,'TWIN');
 await id(page,'antenna-hotlist-search-open').click();await expect(query(page)).toHaveValue('TWIN');await expect(id(page,'antenna-hotlist-search-case')).toBeChecked();
 // HS-10: Cancel copies nothing.
 await query(page).fill('zzz');await id(page,'antenna-hotlist-search-case').click();await id(page,'antenna-hotlist-search-cancel').click();
 await expect(findDialog(page)).toHaveCount(0);await expect(id(page,'antenna-hotlist-search-open')).toBeFocused();
 await expect(id(page,'antenna-status')).toHaveText('Search cancelled; nothing changed.');
 await id(page,'antenna-hotlist-search-open').click();await expect(query(page)).toHaveValue('TWIN');await expect(id(page,'antenna-hotlist-search-case')).toBeChecked();
 // An empty submit searches nothing, opens no box and remembers '' and the check box.
 await query(page).fill('');await id(page,'antenna-hotlist-search-case').click();await id(page,'antenna-hotlist-search-next').click();
 await expect(findDialog(page)).toHaveCount(0);await expect(id(page,'antenna-notice')).toHaveCount(0);await expect(id(page,'antenna-hotlist-search-open')).toBeFocused();
 await expect(id(page,'antenna-hotlist-row-1')).toHaveAttribute('data-found','true');
 await id(page,'antenna-hotlist-search-open').click();await expect(query(page)).toHaveValue('');await expect(id(page,'antenna-hotlist-search-case')).not.toBeChecked();
 await query(page).fill('pair');await id(page,'antenna-hotlist-search-case').click();await id(page,'antenna-hotlist-search-cancel').click();
 // HS-17: Close and View/Select reset the query, the case flag and the highlight.
 await search(page,'café');await expectFound(page,3);
 await id(page,'antenna-hotlist-close').click();await id(page,'antenna-hotlist-open').click();
 await expect(foundRows(page)).toHaveCount(0);await expect(rowRadio(page,3)).toBeChecked();
 await id(page,'antenna-hotlist-search-open').click();await expect(query(page)).toHaveValue('');await expect(id(page,'antenna-hotlist-search-case')).not.toBeChecked();
 await id(page,'antenna-hotlist-search-cancel').click();
});

test('Space and arrow keys confirm from the focused found row (HS-15)',async({page})=>{
 await openList(page);
 await search(page,'pair');await expectFound(page,2);await expect(rowRadio(page,2)).not.toBeChecked();
 await page.keyboard.press('Space');await expect(rowRadio(page,2)).toBeChecked();await expect(foundRows(page)).toHaveCount(0);
 await search(page,'café');await expectFound(page,3);
 await page.keyboard.press('ArrowDown');await expect(rowRadio(page,4)).toBeChecked();await expect(rowRadio(page,4)).toBeFocused();await expect(foundRows(page)).toHaveCount(0);
 await id(page,'antenna-hotlist-select').click();await expect(id(page,'antenna-field-raHours')).toHaveValue('4');
 await id(page,'antenna-dialog-cancel').click();await id(page,'antenna-hotlist-close').click();
});

test('focus ownership: Cancel, an empty submit and a miss keep focus on Search; a repeated hit takes it again',async({page})=>{
 await openList(page);
 await search(page,'omega');await expectFound(page,5);
 await id(page,'antenna-hotlist-search-open').click();await expect(findDialog(page)).toBeVisible();await id(page,'antenna-hotlist-search-cancel').click();
 await expect(findDialog(page)).toHaveCount(0);await expect(id(page,'antenna-hotlist-search-open')).toBeFocused();
 await expect(id(page,'antenna-hotlist-row-5')).toHaveAttribute('data-found','true');
 await id(page,'antenna-hotlist-search-open').click();await query(page).fill('');await id(page,'antenna-hotlist-search-top').click();
 await expect(findDialog(page)).toHaveCount(0);await expect(id(page,'antenna-notice')).toHaveCount(0);await expect(id(page,'antenna-hotlist-search-open')).toBeFocused();
 await expect(id(page,'antenna-hotlist-row-5')).toHaveAttribute('data-found','true');
 await search(page,'nowhere');await expectMiss(page,'nowhere');
 await expect(id(page,'antenna-hotlist-row-5')).toHaveAttribute('data-found','true');await expect(rowRadio(page,1)).toBeChecked();
 await search(page,'omega');await expectFound(page,5);
});

/** HS-15 on the already checked row: browsers fire no click or change there, so the release confirms it explicitly. */
async function checkedRowSpace(page:Page){
 await openList(page);
 // The found row is the checked one: Space ends the highlight, keeps the row checked and focused, and opens nothing.
 await search(page,'twin');await expectFound(page,1);await expect(rowRadio(page,1)).toBeChecked();
 await page.keyboard.press('Space');
 await expect(foundRows(page)).toHaveCount(0);await expect(rowRadio(page,1)).toBeChecked();await expect(rowRadio(page,1)).toBeFocused();
 await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-notice')).toHaveCount(0);
 // Confirming the checked row ends a highlight on another row and does not check that row.
 await search(page,'pair');await expectFound(page,2);
 await rowRadio(page,1).focus();await page.keyboard.press('Space');
 await expect(foundRows(page)).toHaveCount(0);await expect(rowRadio(page,2)).not.toBeChecked();await expect(rowRadio(page,1)).toBeChecked();
 // A held Space acts once: no dialog, the list stays, and Slew to Selection still uses row 1.
 await search(page,'twin');await expectFound(page,1);
 await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.up('Space');
 await expect(foundRows(page)).toHaveCount(0);await expect(rowRadio(page,1)).toBeChecked();
 await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-notice')).toHaveCount(0);await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();
 await id(page,'antenna-hotlist-select').click();await expect(id(page,'antenna-field-raHours')).toHaveValue('1');
 await id(page,'antenna-dialog-cancel').click();await id(page,'antenna-hotlist-close').click();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
}
test('Space on the already checked row confirms it and ends the highlight, without a Slew',async({page})=>{await checkedRowSpace(page);});
test.describe('keyboard 375',()=>{
 test.use({viewport:{width:375,height:720}});
 test('Space on the already checked row confirms it at a narrow width',async({page})=>{await checkedRowSpace(page);await noOverflow(page);});
});

test('browser history: the Find draft is re-presented; a stale highlight is ignored and Next falls back to the remembered row',async({page})=>{
 await openList(page);
 await id(page,'antenna-hotlist-search-open').click();await query(page).fill('omega');
 await page.goBack();await expect(heading(page,'Start with the sky.')).toBeVisible();await expect(findDialog(page)).toHaveCount(0);await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
 await page.goForward();await expect(findDialog(page)).toBeVisible();await expect(query(page)).toHaveValue('omega');await expect(query(page)).toBeFocused();
 await page.keyboard.press('Enter');await expectFound(page,5);
 // Back, remove Omega (file row 0) in the observatory editor, Forward: the highlight names a row that no longer exists.
 await page.goBack();await expect(opticalRows(page)).toHaveCount(5);
 await page.locator('#htl-rows').selectOption('0');await page.getByRole('button',{name:'Remove HTL selection',exact:true}).click();await expect(opticalRows(page)).toHaveCount(4);
 await page.goForward();await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();
 await expect(foundRows(page)).toHaveCount(0);await expect(id(page,'antenna-hotlist-found')).toHaveText('');await expect(rowRadio(page,1)).toBeChecked();
 // Next from the remembered row 1 starts at row 2: 'next' is found there.
 await search(page,'next',{mode:'next'});await expectFound(page,2);
 await id(page,'antenna-hotlist-close').click();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
 await clickHeaderTool(page,'Observatory');await expect(page.getByRole('button',{name:'Undo last HTL change',exact:true})).toBeEnabled();
});

test('browser history: a retained hit behind a re-presented Find draft or miss box is not a new hit; Search keeps focus (R3)',async({page})=>{
 await openList(page);
 // Row 5 found while row 1 stays checked.
 await search(page,'omega');await expectFound(page,5);await expect(rowRadio(page,1)).toBeChecked();
 const retained=async()=>{
  await expect(foundRows(page)).toHaveCount(1);await expect(id(page,'antenna-hotlist-row-5')).toHaveAttribute('data-found','true');
  await expect(rowRadio(page,1)).toBeChecked();await expect(rowRadio(page,5)).not.toBeChecked();
  await expect(id(page,'antenna-hotlist-search-open')).toBeFocused();
 };
 // Back hides the open Find dialog; Forward re-presents the draft above a remounted list; Cancel returns to Search.
 await id(page,'antenna-hotlist-search-open').click();await query(page).fill('pair');
 await page.goBack();await expect(heading(page,'Start with the sky.')).toBeVisible();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
 await page.goForward();await expect(findDialog(page)).toBeVisible();await expect(query(page)).toHaveValue('pair');
 await id(page,'antenna-hotlist-search-cancel').click();await expect(findDialog(page)).toHaveCount(0);await retained();
 // Cancel copied nothing: the remembered query is still the one of the hit.
 await id(page,'antenna-hotlist-search-open').click();await expect(query(page)).toHaveValue('omega');await id(page,'antenna-hotlist-search-cancel').click();await retained();
 // A miss with the hit retained; Back/Forward re-present the box above a remounted list; OK returns to Search.
 await search(page,'zzz');await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','hot-list-search-miss');
 await page.goBack();await expect(heading(page,'Start with the sky.')).toBeVisible();await expect(id(page,'antenna-notice')).toHaveCount(0);
 await page.goForward();await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','hot-list-search-miss');
 await id(page,'antenna-notice-ok').click();await expect(id(page,'antenna-notice')).toHaveCount(0);await retained();
 // A genuine repeated hit still takes focus on its row.
 await search(page,'omega');await expectFound(page,5);await expect(rowRadio(page,1)).toBeChecked();await expect(rowRadio(page,5)).not.toBeChecked();
 await search(page,'pair');await expectFound(page,2);await expect(rowRadio(page,1)).toBeChecked();
});

test('modality, Tab trap and held Enter/Escape on the Find dialog',async({page})=>{
 await openList(page);
 await id(page,'antenna-hotlist-search-open').focus();
 // Held Enter on Search opens the dialog once and never submits.
 await page.keyboard.down('Enter');await expect(findDialog(page)).toBeVisible();await expect(query(page)).toBeFocused();
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect(findDialog(page)).toBeVisible();await expect(id(page,'antenna-notice')).toHaveCount(0);await expect(foundRows(page)).toHaveCount(0);
 // Application modality: header inert, the list inert, Options Apply refused.
 expect(await page.locator('.portal-header').evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 expect(await id(page,'antenna-hotlist-dialog').evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 await expect(id(page,'antenna-radio-options-apply')).toBeDisabled();
 for(let i=0;i<6;i++){
  await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>!!document.activeElement?.closest('[data-testid="antenna-hotlist-search"]'))).toBe(true);
 }
 // Held Escape cancels once; the list stays and Search has focus.
 await page.keyboard.down('Escape');await page.keyboard.down('Escape');await page.keyboard.down('Escape');await page.keyboard.up('Escape');
 await expect(findDialog(page)).toHaveCount(0);await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();await expect(id(page,'antenna-hotlist-search-open')).toBeFocused();
 await expect(id(page,'antenna-notice')).toHaveCount(0);
 // A fresh Escape then closes the list.
 await page.keyboard.press('Escape');await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);await expect(id(page,'antenna-hotlist-open')).toBeFocused();
});

for(const width of [320,375]){
 test.describe(`touch ${width}`,()=>{
  test.use({viewport:{width,height:720},hasTouch:true});
  test('Find controls of at least 44 px fit without horizontal scrolling; a tap confirms the found row',async({page})=>{
   await openList(page,tapPress);await noOverflow(page);
   await id(page,'antenna-hotlist-search-open').tap();await expect(findDialog(page)).toBeVisible();await noOverflow(page);
   const dialog=await findDialog(page).boundingBox();expect(dialog!.x).toBeGreaterThanOrEqual(0);expect(dialog!.x+dialog!.width).toBeLessThanOrEqual(width);
   for(const testId of ['antenna-hotlist-search-query','antenna-hotlist-search-top','antenna-hotlist-search-next','antenna-hotlist-search-cancel']){
    const box=await id(page,testId).boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
   }
   const check=await findDialog(page).locator('label.antenna-hotlist-search-case').boundingBox();expect(check!.height).toBeGreaterThanOrEqual(44);
   await query(page).fill('pair');await id(page,'antenna-hotlist-search-top').tap();
   await expect(findDialog(page)).toHaveCount(0);await expect(id(page,'antenna-hotlist-row-2')).toHaveAttribute('data-found','true');await expect(rowRadio(page,2)).not.toBeChecked();
   await noOverflow(page);await page.screenshot({path:`test-results/radio-hotlist-search-touch-${width}.png`});
   await id(page,'antenna-hotlist-row-2').tap();await expect(rowRadio(page,2)).toBeChecked();await expect(foundRows(page)).toHaveCount(0);
   await id(page,'antenna-hotlist-select').tap();await expect(id(page,'antenna-field-raHours')).toHaveValue('2');
   await id(page,'antenna-dialog-cancel').tap();await id(page,'antenna-hotlist-close').tap();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);await noOverflow(page);
  });
 });
}

test.describe('touch 320 long miss',()=>{
 test.use({viewport:{width:320,height:720},hasTouch:true});
 test('the miss box keeps the query spaces and wraps an 80-character query without horizontal scrolling',async({page})=>{
  await openList(page,tapPress);
  // MaxLength 80: three leading spaces (kept, HS-09) and one unbroken 77-character lowercase word no row contains.
  const long=`   ${'w'.repeat(77)}`;
  await search(page,long);
  const notice=id(page,'antenna-notice'),body=id(page,'antenna-notice-text');
  await expect(notice).toHaveAttribute('data-kind','hot-list-search-miss');
  expect(await body.innerText()).toBe(`"${long}" Not Found.`);
  // The dialog scrolls internally (overflow:auto), so the document check alone would miss an overflowing word.
  for(const box of [body,notice])expect(await box.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(0);
  const rect=await notice.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(320);
  await noOverflow(page);await page.screenshot({path:'test-results/radio-hotlist-search-miss-320.png'});
  await expectMiss(page,long);
 });
});

test.describe('keyboard 1440',()=>{
 test.use({viewport:{width:1440,height:900}});
 test('visible focus on the Find field and on the found row',async({page})=>{
  await openList(page);
  await id(page,'antenna-hotlist-search-open').focus();await page.keyboard.press('Enter');
  await expect(query(page)).toBeFocused();
  expect(await query(page).evaluate(el=>{const s=getComputedStyle(el);return `${s.outlineStyle} ${s.outlineWidth}`;})).toBe('solid 3px');
  await page.keyboard.type('blank');await page.keyboard.press('Enter');await expectFound(page,4);
  expect(await rowRadio(page,4).evaluate(el=>{const s=getComputedStyle(el);return `${s.outlineStyle} ${s.outlineWidth}`;})).toBe('solid 3px');
  await noOverflow(page);await page.screenshot({path:'test-results/radio-hotlist-search-1440.png'});
  await page.keyboard.press('Escape');await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);await expect(id(page,'antenna-hotlist-open')).toBeFocused();
 });
});
