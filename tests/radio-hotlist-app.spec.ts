import {test,expect,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Actual App flows of the radio Slew ▸ Hot List (docs/RADIO-ANTENNA.md "Hot list"): the HTL document shared with the
// observatory editor, radio Load, the RA insertion-order projection, View/Select → coordinate dialog → Cancel back to
// the list → OK, modality and focus. Synthetic HTL files written here byte by byte; no original HTL data. Expected
// orders are the chosen web contract (0x492728/0x590398 traced by hand), not native runtime oracles.
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
function rec(name:string,ra:number|Buffer,dec:number,remarks=''){
 const b=Buffer.alloc(86);b[0]=name.length;b.write(name,1,'latin1');(typeof ra==='number'?ext(ra):ra).copy(b,25);ext(dec).copy(b,35);b[45]=remarks.length;b.write(remarks,46,'latin1');return b;
}
/** RA80 1 + 2^-63: decodes to the Number 1 but orders after an exact 1. */
const HIGH=(()=>{const b=Buffer.alloc(10);b.writeBigUInt64LE(0x8000000000000001n,0);b.writeUInt16LE(0x3fff,8);return b;})();
/** File order Zeta, High, Twin, Twin, Mid → RA projection source indices [2, 3, 1, 4, 0]. */
const FIXTURE=Buffer.concat([rec('Zeta',23.5,10,'last'),rec('High',HIGH,20,'raw'),rec('Twin',1,30,'pair'),rec('Twin',1,30,'pair'),rec('Mid',12,-5,'middle')]);
const SHORT=Buffer.concat([rec('Alpha',2,15,'a'),rec('Beta',3,-15,'b')]);
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
 await press(nav(page,'Radio telescope'));await expect(heading(page,'Radio telescope control')).toBeFocused();
 await press(id(page,'radio-exercise'));await press(id(page,'radio-env-compiled'));
 await press(id(page,'radio-access'));await press(id(page,'radio-timer-deliver'));await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await press(id(page,'radio-switch'));await expect(id(page,'antenna-status')).toContainText('initialized');
 await press(id(page,'antenna-tracking'));await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
}
const rowSources=(page:Page)=>id(page,'antenna-hotlist-rows').locator('label').evaluateAll(rows=>rows.map(r=>Number(r.getAttribute('data-source-index'))));
const rowRadio=(page:Page,position:number)=>id(page,`antenna-hotlist-row-${position}`).locator('input');
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

test('the observatory list and its edit appear in RA insertion order; file order, Undo and bytes stay untouched',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await openObservatoryHtl(page);await opticalInput(page).setInputFiles(htlFile('fixture.htl',FIXTURE));await expect(opticalRows(page)).toHaveCount(5);
 await page.getByRole('button',{name:'Edit HTL selection',exact:true}).click();await page.getByLabel('HTL remarks',{exact:true}).fill('edited');
 await page.getByRole('button',{name:'Apply HTL edit',exact:true}).click();const edited=await saveOptical(page);
 expect(edited.subarray(86)).toEqual(FIXTURE.subarray(86));await expect(page.getByRole('button',{name:'Undo last HTL change',exact:true})).toBeEnabled();
 const pointing=await id(page,'pointing-ra').textContent(),target=await page.getByLabel('Target',{exact:true}).inputValue();
 await setupRadio(page);
 await expect(id(page,'antenna-hotlist-source')).toHaveText('Shared list: fixture.htl, 5 rows.');
 await expect(id(page,'antenna-hotlist-add')).toBeDisabled();await expect(id(page,'antenna-hotlist-menu')).not.toContainText('Save Updated');
 await expect(id(page,'antenna-hotlist-open')).toHaveText('Slew ▸ "Hot List" ▸ View/Select from List...');
 await id(page,'antenna-hotlist-open').click();
 await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();expect(await rowSources(page)).toEqual([2,3,1,4,0]);
 await expect(id(page,'antenna-hotlist-row-1')).toHaveText('1 · Twin · pair · RA 1 h · Dec 30°');
 await expect(id(page,'antenna-hotlist-row-3')).toHaveText('3 · High · raw · RA 1 h · Dec 20°');
 await expect(id(page,'antenna-hotlist-row-5')).toHaveText('5 · Zeta · edited · RA 23.5 h · Dec 10°');
 await expect(rowRadio(page,1)).toBeChecked();await expect(rowRadio(page,1)).toBeFocused();
 // THotListForm1 DFM captions (form, SlewtoSelection1, Close1); no recovery-status text in the window.
 const dialog=id(page,'antenna-hotlist-dialog');
 await expect(dialog.getByRole('heading',{level:3})).toHaveText('Select Object for Observation');
 await expect(page.getByRole('dialog',{name:'Select Object for Observation'})).toBeVisible();
 await expect(id(page,'antenna-hotlist-select')).toHaveText('Slew to Selection');await expect(id(page,'antenna-hotlist-close')).toHaveText('Close');
 await expect(dialog).not.toContainText('not decoded');
 await page.screenshot({path:'test-results/radio-hotlist-desktop.png'});
 // Application modality: App header inert, options Apply refused, panel controls inert.
 expect(await page.locator('.portal-header').evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 await expect(id(page,'antenna-radio-options-apply')).toBeDisabled();
 expect(await id(page,'radio-panel-window').evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 await id(page,'antenna-hotlist-close').click();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);await expect(id(page,'antenna-hotlist-open')).toBeFocused();
 await expect(id(page,'antenna-status')).toHaveText('Hot list closed; nothing changed.');
 await nav(page,'Observatory').click();
 await expect(opticalRows(page)).toHaveText(['1 · Zeta · edited','2 · High · raw','3 · Twin · pair','4 · Twin · pair','5 · Mid · middle']);
 await expect(page.getByRole('button',{name:'Undo last HTL change',exact:true})).toBeEnabled();expect(await saveOptical(page)).toEqual(edited);
 await expect(id(page,'pointing-ra')).toHaveText(pointing!);await expect(page.getByLabel('Target',{exact:true})).toHaveValue(target);
 const origin=new URL(page.url()).origin;expect(requests.filter(url=>!url.startsWith(origin)&&!url.startsWith('blob:')&&!url.startsWith('data:'))).toEqual([]);
});

test('radio Load replaces the shared list like Open; invalid files keep it; an optical draft locks Load',async({page})=>{
 await openObservatoryHtl(page);await opticalInput(page).setInputFiles(htlFile('fixture.htl',FIXTURE));
 await page.getByRole('button',{name:'Remove HTL selection',exact:true}).click();await expect(page.getByRole('button',{name:'Undo last HTL change',exact:true})).toBeEnabled();
 await setupRadio(page);
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('radio.htl',SHORT));
 await expect(id(page,'antenna-hotlist-status')).toContainText('Hot list loaded from radio.htl: 2 rows.');
 await expect(id(page,'antenna-hotlist-source')).toHaveText('Shared list: radio.htl, 2 rows.');
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('bad.htl',Buffer.alloc(85)));
 await expect(id(page,'antenna-hotlist-error')).toHaveText('Invalid HTL layout: expected a headerless sequence of 86-byte records. The current list was kept.');
 const nan=Buffer.from(SHORT);nan.writeUInt16LE(0x7fff,33);await id(page,'antenna-hotlist-file').setInputFiles(htlFile('nan.htl',nan));
 await expect(id(page,'antenna-hotlist-error')).toContainText('HTL row 1:');await expect(id(page,'antenna-hotlist-source')).toHaveText('Shared list: radio.htl, 2 rows.');
 await nav(page,'Observatory').click();
 await expect(opticalRows(page)).toHaveText(['1 · Alpha · a','2 · Beta · b']);await expect(page.getByText('Opened file: radio.htl',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Undo last HTL change',exact:true})).toBeDisabled();expect(await saveOptical(page)).toEqual(SHORT);
 // An open Edit draft locks radio Load (declared web policy); Cancel unlocks it. The draft survives the route change.
 await page.getByRole('button',{name:'Edit HTL selection',exact:true}).click();await page.getByLabel('HTL remarks',{exact:true}).fill('draft');
 await nav(page,'Radio telescope').click();
 await expect(id(page,'antenna-hotlist-load')).toBeDisabled();await expect(id(page,'antenna-hotlist-load-blocked')).toHaveAttribute('data-reason','draft');
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('other.htl',FIXTURE));
 await expect(id(page,'antenna-hotlist-status')).toHaveText('Apply or Cancel the observatory Hot List edit first; nothing was loaded.');
 await nav(page,'Observatory').click();await expect(page.getByLabel('HTL remarks',{exact:true})).toHaveValue('draft');
 await page.getByRole('button',{name:'Cancel HTL edit',exact:true}).click();await expect(opticalRows(page)).toHaveCount(2);
 await nav(page,'Radio telescope').click();await expect(id(page,'antenna-hotlist-load')).toBeEnabled();await expect(id(page,'antenna-hotlist-load-blocked')).toHaveCount(0);
 // Reload clears the temporary document on both views.
 await page.reload();await expect(heading(page,'Radio telescope control')).toBeVisible();
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();await id(page,'radio-switch').click();
 await expect(id(page,'antenna-hotlist-source')).toContainText('No hot list is loaded.');
});

test('late reads after Cancel, a route change, an antenna dialog or a hidden page are ignored',async({page})=>{
 await holdReads(page);await openObservatoryHtl(page);await setupRadio(page);
 const none='No hot list is loaded. Load an HTL file here or open one in the observatory Hot List editor; no default list is provided.';
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('held-1.htl',FIXTURE));await held(page,'held-1.htl');
 await expect(id(page,'antenna-hotlist-status')).toHaveText('Reading held-1.htl…');await expect(id(page,'antenna-hotlist-load')).toBeDisabled();
 await id(page,'antenna-hotlist-cancel-load').click();await expect(id(page,'antenna-hotlist-status')).toHaveText('Hot list load cancelled; the current list was kept.');
 await release(page,'held-1.htl');await expect(id(page,'antenna-hotlist-source')).toHaveText(none);
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('held-2.htl',FIXTURE));await held(page,'held-2.htl');
 await nav(page,'Observatory').click();await release(page,'held-2.htl');await expect(opticalRows(page)).toHaveCount(0);
 await nav(page,'Radio telescope').click();await expect(id(page,'antenna-hotlist-source')).toHaveText(none);
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('held-3.htl',FIXTURE));await held(page,'held-3.htl');
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();await release(page,'held-3.htl');
 await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-hotlist-source')).toHaveText(none);
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('held-4.htl',FIXTURE));await held(page,'held-4.htl');
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 await release(page,'held-4.htl');await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});});
 await expect(id(page,'antenna-hotlist-status')).toHaveText('Hot list load cancelled; the current list was kept.');await expect(id(page,'antenna-hotlist-source')).toHaveText(none);
 // A completed read still works afterwards.
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('held-5.htl',SHORT));await held(page,'held-5.htl');await release(page,'held-5.htl');
 await expect(id(page,'antenna-hotlist-source')).toHaveText('Shared list: held-5.htl, 2 rows.');
});

test('View/Select → second duplicate → Cancel back to the list → OK → Yes → arrival, without optical side effects',async({page})=>{
 await openObservatoryHtl(page);await opticalInput(page).setInputFiles(htlFile('fixture.htl',FIXTURE));await page.locator('#htl-rows').selectOption('4');
 const pointing=await id(page,'pointing-ra').textContent(),target=await page.getByLabel('Target',{exact:true}).inputValue(),bytes=await saveOptical(page);
 await setupRadio(page);
 await id(page,'antenna-hotlist-open').click();await rowRadio(page,2).click();
 await expect(rowRadio(page,2)).toBeChecked();await expect(id(page,'antenna-hotlist-row-2')).toHaveAttribute('data-source-index','3');
 await id(page,'antenna-hotlist-select').click();
 await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-field-raHours')).toBeFocused();
 for(const [name,value] of [['raHours','1'],['raMinutes','0'],['raSeconds','0.00'],['decDegrees','30'],['decMinutes','0'],['decSeconds','0.0']] as const)await expect(id(page,`antenna-field-${name}`)).toHaveValue(value);
 await expect(id(page,'antenna-epoch-0')).toBeChecked();await expect(id(page,'antenna-dialog-hotlist-origin')).toBeVisible();
 // Slew1 path (0x567bc5..0x567bc9): J2000 with the epoch group disabled.
 await expect(id(page,'antenna-epoch-0')).toBeDisabled();await expect(id(page,'antenna-epoch-1')).toBeDisabled();await expect(id(page,'antenna-b1950-note')).toHaveCount(0);
 await expect(id(page,'antenna-target')).toContainText('1h 0m 0.00s, +30° 0′ 0.0″');
 await id(page,'antenna-dialog-cancel').click();
 await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();await expect(rowRadio(page,2)).toBeChecked();await expect(rowRadio(page,2)).toBeFocused();
 await expect(id(page,'antenna-target')).toContainText('1h 0m 0.00s, +30° 0′ 0.0″');
 await id(page,'antenna-hotlist-row-2').dblclick();
 await expect(id(page,'antenna-dialog')).toBeVisible();
 await expect(id(page,'antenna-epoch-0')).toBeChecked();await expect(id(page,'antenna-epoch-0')).toBeDisabled();await expect(id(page,'antenna-epoch-1')).toBeDisabled();
 await expect(id(page,'antenna-b1950-note')).toHaveCount(0);
 await id(page,'antenna-dialog-ok').click();
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();
 await expect(id(page,'antenna-hotlist-open')).toBeFocused();
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete',{timeout:20_000});await id(page,'antenna-notice-ok').click();
 await expect(id(page,'antenna-hotlist-open')).toBeFocused();
 await expect(id(page,'antenna-ra')).toHaveAttribute('data-ra-hours','1');await expect(id(page,'antenna-dec')).toHaveAttribute('data-dec-degrees','30');
 // The ordinary Set Coordinates path (RA-07, DL = 1) still enables the epoch choice.
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();await expect(id(page,'antenna-dialog-hotlist-origin')).toHaveCount(0);
 await expect(id(page,'antenna-epoch-0')).toBeEnabled();await expect(id(page,'antenna-epoch-1')).toBeEnabled();
 await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-dialog')).toHaveCount(0);
 await nav(page,'Observatory').click();
 await expect(id(page,'pointing-ra')).toHaveText(pointing!);await expect(page.getByLabel('Target',{exact:true})).toHaveValue(target);
 await expect(page.locator('#htl-rows')).toHaveValue('4');expect(await saveOptical(page)).toEqual(bytes);
});

test('arrow keys and clicks keep the remembered row across Close and reopen (ListBox1KeyUp/MouseUp +0x588)',async({page})=>{
 await openObservatoryHtl(page);await opticalInput(page).setInputFiles(htlFile('fixture.htl',FIXTURE));await setupRadio(page);
 const target=await id(page,'antenna-target').textContent();
 await id(page,'antenna-hotlist-open').click();await expect(rowRadio(page,1)).toBeChecked();await expect(rowRadio(page,1)).toBeFocused();
 await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
 await expect(rowRadio(page,3)).toBeChecked();await expect(rowRadio(page,3)).toBeFocused();
 await page.keyboard.press('Escape');await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);await expect(id(page,'antenna-hotlist-open')).toBeFocused();
 await id(page,'antenna-hotlist-open').click();await expect(rowRadio(page,3)).toBeChecked();await expect(rowRadio(page,3)).toBeFocused();
 await rowRadio(page,4).click();await expect(rowRadio(page,4)).toBeChecked();
 await id(page,'antenna-hotlist-close').click();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
 await id(page,'antenna-hotlist-open').click();await expect(rowRadio(page,4)).toBeChecked();await expect(rowRadio(page,4)).toBeFocused();
 await expect(id(page,'antenna-target')).toHaveText(target!);await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-notice')).toHaveCount(0);
 await id(page,'antenna-hotlist-close').click();await expect(id(page,'antenna-target')).toHaveText(target!);
});

test('browser history hides the open list; an optical Remove appears on return at the remembered row without slewing (WEB-HL-08)',async({page})=>{
 await openObservatoryHtl(page);await opticalInput(page).setInputFiles(htlFile('fixture.htl',FIXTURE));await setupRadio(page);
 const target=await id(page,'antenna-target').textContent();
 const ra=await id(page,'antenna-ra').getAttribute('data-ra-hours'),dec=await id(page,'antenna-dec').getAttribute('data-dec-degrees');
 await id(page,'antenna-hotlist-open').click();await rowRadio(page,3).click();
 await expect(rowRadio(page,3)).toBeChecked();await expect(id(page,'antenna-hotlist-row-3')).toHaveAttribute('data-source-index','1');await expect(id(page,'antenna-hotlist-row-3')).toContainText('High');
 // Browser Back while the list is shown (the App header is inert): the list is hidden, not closed.
 await page.goBack();await expect(heading(page,'Start with the sky.')).toBeVisible();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
 await expect(opticalRows(page)).toHaveCount(5);
 await page.locator('#htl-rows').selectOption('1');await page.getByRole('button',{name:'Remove HTL selection',exact:true}).click();
 await expect(opticalRows(page)).toHaveText(['1 · Zeta · last','2 · Twin · pair','3 · Twin · pair','4 · Mid · middle']);
 const undo=page.getByRole('button',{name:'Undo last HTL change',exact:true});await expect(undo).toBeEnabled();
 // Forward: the recomputed projection (file order Zeta, Twin, Twin, Mid → [1, 2, 3, 0], traced by hand) at the remembered index.
 await page.goForward();await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();
 expect(await rowSources(page)).toEqual([1,2,3,0]);
 await expect(rowRadio(page,3)).toBeChecked();await expect(id(page,'antenna-hotlist-row-3')).toContainText('Mid');
 await expect(id(page,'antenna-target')).toHaveText(target!);
 await expect(id(page,'antenna-ra')).toHaveAttribute('data-ra-hours',ra!);await expect(id(page,'antenna-dec')).toHaveAttribute('data-dec-degrees',dec!);
 await expect(id(page,'antenna-dialog')).toHaveCount(0);await expect(id(page,'antenna-notice')).toHaveCount(0);
 // Only an explicit Slew to Selection writes the stored coordinates.
 await id(page,'antenna-hotlist-select').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 await expect(id(page,'antenna-field-raHours')).toHaveValue('12');await expect(id(page,'antenna-field-decDegrees')).toHaveValue('-5');
 // Leave through the dialogs (Cancel back to the list, then Close) before App navigation.
 await id(page,'antenna-dialog-cancel').click();await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();
 await id(page,'antenna-hotlist-close').click();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
 await expect(id(page,'antenna-ra')).toHaveAttribute('data-ra-hours',ra!);await expect(id(page,'antenna-dec')).toHaveAttribute('data-dec-degrees',dec!);
 await nav(page,'Observatory').click();await expect(opticalRows(page)).toHaveCount(4);await expect(undo).toBeEnabled();
});

test('empty list box, a shorter list after a selection and held Enter/Escape',async({page})=>{
 await openObservatoryHtl(page);await setupRadio(page);
 await id(page,'antenna-hotlist-open').click();
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','hot-list-empty');
 await expect(id(page,'antenna-notice')).toContainText('Observation List Empty');await expect(id(page,'antenna-notice-text')).toHaveText('No items in Observation List!');
 await id(page,'antenna-notice-ok').click();await expect(id(page,'antenna-hotlist-open')).toBeFocused();
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('empty.htl',Buffer.alloc(0)));await expect(id(page,'antenna-hotlist-source')).toHaveText('Shared list: empty.htl, 0 rows.');
 await id(page,'antenna-hotlist-open').click();await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','hot-list-empty');await id(page,'antenna-notice-ok').click();
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('fixture.htl',FIXTURE));
 await id(page,'antenna-hotlist-open').click();await rowRadio(page,5).click();await id(page,'antenna-hotlist-close').click();
 await id(page,'antenna-hotlist-file').setInputFiles(htlFile('short.htl',SHORT));await expect(id(page,'antenna-hotlist-source')).toHaveText('Shared list: short.htl, 2 rows.');
 await id(page,'antenna-hotlist-open').click();
 await expect(id(page,'antenna-hotlist-no-selection')).toHaveText('No row is selected: the remembered position 5 is not in this list.');
 await expect(id(page,'antenna-hotlist-rows').locator('input:checked')).toHaveCount(0);await expect(rowRadio(page,1)).toBeFocused();
 const target=await id(page,'antenna-target').textContent();
 await id(page,'antenna-hotlist-select').click();await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','hot-list-no-selection');
 expect(await id(page,'antenna-hotlist-dialog').evaluate(el=>(el as HTMLElement).inert)).toBe(true);
 await id(page,'antenna-notice-ok').click();await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();await expect(id(page,'antenna-hotlist-select')).toBeFocused();
 await expect(id(page,'antenna-target')).toHaveText(target!);
 // The Load item is inert behind the list.
 expect(await id(page,'antenna-hotlist-load').evaluate(el=>!!el.closest('[inert]'))).toBe(true);
 await page.keyboard.press('Escape');await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);await expect(id(page,'antenna-hotlist-open')).toBeFocused();
 // Held Enter opens the list once; held Escape closes it once and does not reopen or cascade.
 await page.keyboard.down('Enter');await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();await expect(id(page,'antenna-notice')).toHaveCount(0);await expect(id(page,'antenna-dialog')).toHaveCount(0);
 await page.keyboard.down('Escape');await page.keyboard.down('Escape');await page.keyboard.down('Escape');await page.keyboard.up('Escape');
 await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);await expect(id(page,'antenna-hotlist-open')).toBeFocused();await expect(id(page,'antenna-notice')).toHaveCount(0);
});

test.describe('touch 375',()=>{
 test.use({viewport:{width:375,height:812},hasTouch:true});
 test('taps choose rows of at least 44 px without horizontal scrolling',async({page})=>{
  await openObservatoryHtl(page);await setupRadio(page,tapPress);
  await id(page,'antenna-hotlist-file').setInputFiles(htlFile('fixture.htl',FIXTURE));
  await id(page,'antenna-hotlist-open').tap();await expect(id(page,'antenna-hotlist-dialog')).toBeVisible();await noOverflow(page);
  for(let i=1;i<=5;i++){const box=await id(page,`antenna-hotlist-row-${i}`).boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x+box!.width).toBeLessThanOrEqual(375);}
  await id(page,'antenna-hotlist-row-4').tap();await expect(rowRadio(page,4)).toBeChecked();
  await page.screenshot({path:'test-results/radio-hotlist-touch.png'});
  await id(page,'antenna-hotlist-select').tap();await expect(id(page,'antenna-field-raHours')).toHaveValue('12');await expect(id(page,'antenna-field-decDegrees')).toHaveValue('-5');
  await noOverflow(page);await id(page,'antenna-dialog-cancel').tap();await expect(rowRadio(page,4)).toBeChecked();
  await id(page,'antenna-hotlist-close').tap();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);await noOverflow(page);
 });
});
