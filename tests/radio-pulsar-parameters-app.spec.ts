import {test,expect,type Locator,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {env} from 'node:process';
// Actual App flows of the Pulsar Parameters utility on the #radio-control route (docs/RADIO-PULSAR-PARAMETERS.md, WEB-PP-*):
// reference catalog admission (invalid, too large, cancel, route change, project operation, reimport), the read-only
// window, Prev/Next ends, Update/Reset with the sequential partial store, Find (seed, substring, miss, Cancel, retained
// query, keyboard), modality and yielding to an antenna box, Exit/reopen, Save investigation bytes, reload and a 390 px
// layout. No harness and no product debug hook: only the rendered App, browser history, the test-only read hold and, in the
// yielding test, Playwright's controlled clock.
// The catalog below is synthetic (no original rows); expected strings are the chosen web contract, not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const header=(page:Page)=>page.locator('.portal-header'),toolbar=(page:Page)=>page.locator('.investigation-toolbar');
const layer=(page:Page)=>id(page,'pulsar-params-layer');
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}
const save=(page:Page)=>download(page,page.getByRole('button',{name:'Save investigation',exact:true}));
const restore=(page:Page,name:string,text:string)=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text,'utf8')});
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
async function hostReleased(page:Page){await expect(header(page)).not.toHaveAttribute('inert');await expect(toolbar(page)).not.toHaveAttribute('inert');await expect(layer(page)).toHaveAttribute('data-modal-presented','false');}
async function hostHeld(page:Page){await expect(header(page)).toHaveAttribute('inert','');await expect(toolbar(page)).toHaveAttribute('inert','');await expect(layer(page)).toHaveAttribute('data-modal-presented','true');}

// ---- Synthetic catalog in the fixed-column layout (radioPulsarCatalog.ts PULSAR_CATALOG_COLUMNS).
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
// RA column in degrees (× 24 ÷ 360 gives hours). Index 1 is near the antenna's first pointing (RA 0 h, Dec = compiled latitude ≈ 38.43°).
const ROWS:readonly Row[]=[
 {primaryName:'J0600+1000',legacyName:'B0557+10',ra:'90',dec:'10'},
 {primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4'},
 {primaryName:'J1927+18',legacyName:'B1925+18',ra:'291.75',dec:'18.0'},
 {primaryName:'J2048-1616',legacyName:'B2045-16',ra:'312',dec:'-16.3',s4c:'3.0'},
];
const CATALOG=ROWS.map(line).join('\r\n')+'\r\n';
const OTHER=ROWS.slice(2).map(line).join('\r\n')+'\r\n';
const sha=(text:string)=>createHash('sha256').update(Buffer.from(text,'latin1')).digest('hex');
const catalogFile=(name:string,text:string)=>({name,mimeType:'text/plain',buffer:Buffer.from(text,'latin1')});
const choose=(page:Page,name:string,text=CATALOG)=>id(page,'pulsar-ref-file').setInputFiles(catalogFile(name,text));
async function loadCatalog(page:Page,name='synthetic-pulsars.dat',text=CATALOG){
 await choose(page,name,text);await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');
 await expect(id(page,'pulsar-ref-name')).toHaveText(name);await expect(id(page,'pulsar-ref-sha')).toHaveText(sha(text));
}
const field=(page:Page,name:string)=>id(page,`pulsar-params-field-${name}`);
const fieldsOf=async(page:Page,names:readonly string[])=>Object.fromEntries(await Promise.all(names.map(async n=>[n,await field(page,n).inputValue()])));
const findDialog=(page:Page)=>id(page,'pulsar-find-dialog'),notice=(page:Page)=>id(page,'pulsar-params-notice');
async function flushTasks(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}

async function openRadio(page:Page){
 await page.goto('/#observatory');await expect(heading(page,'Start with the sky.')).toBeVisible();
 await nav(page,'Radio telescope').click();await expect(heading(page,'Radio telescope control')).toBeFocused();await expect(id(page,'radio-control')).toBeVisible();
}
async function applyClock(page:Page,utc:string){
 await id(page,'radio-clock-utc').fill(utc);await id(page,'radio-clock-apply').click();await expect(id(page,'radio-clock-applied')).toHaveText(`${utc} UT`);
 await id(page,'radio-clock-longitude').click();
}
/** Exercise, compiled defaults, the manual access tick and switch On (first FormActivate: RA 0 h, Dec = latitude). */
async function switchOn(page:Page){
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await expect(id(page,'radio-id-caption')).toHaveText('100 Meter Radio Telescope');
 await id(page,'radio-switch').click();await expect(id(page,'antenna-status')).toContainText('initialized');
}
async function openWindow(page:Page){
 await id(page,'pulsar-params-open').click();await expect(id(page,'pulsar-params-window')).toBeVisible();await expect(id(page,'pulsar-params-heading')).toBeFocused();
}

test('admission, read-only window, Prev/Next ends, Update partial store and Reset, Exit/reopen; Save bytes unchanged; reload empties',async({page},info)=>{
 await page.goto('/#observatory');const before=await save(page);
 await nav(page,'Radio telescope').click();await expect(id(page,'radio-control')).toBeVisible();
 await expect(id(page,'pulsar-params-open')).toBeDisabled();await expect(id(page,'pulsar-params-open-reason')).toHaveText('Load a reference catalog first.');
 await expect(id(page,'pulsar-ref-none')).toBeVisible();
 await expect(id(page,'pulsar-params-persistence')).toContainText('not included in Save investigation');
 // An invalid file is refused before any catalog exists; a valid one shows its identity (user-supplied, not the original).
 await choose(page,'short.dat','J0000\r\n');
 await expect(id(page,'pulsar-ref-status')).toHaveText('short.dat was not accepted: line 1 is shorter than the 454 characters the columns need. The previous catalog is kept.');
 await expect(id(page,'pulsar-params-open')).toBeDisabled();
 await loadCatalog(page);
 await expect(id(page,'pulsar-ref-rows')).toHaveText('4');await expect(id(page,'pulsar-ref-bytes')).toHaveText(String(CATALOG.length));
 await expect(id(page,'pulsar-ref-identity')).toHaveAttribute('data-recorded','false');
 // Before activation and without a radio UT: the head record, no Date/Period, compiled density.
 await openWindow(page);
 await expect(id(page,'pulsar-params-heading')).toHaveText('Pulsar Parameters');
 for(const caption of ['B1950 Name:','J2000 Name:','J2000 Right Ascension:','Declination:','P (Secs):','PDot (S/S):','PEpoch (MJD):','Sky Bkgrnd (K):',
  'Dispersion (pc/cm^3):','Pls Width (ms):','Time Averaged Flux Densities (mJy):','Derived Quantities','Date (MJD):','Electron Density:','Period (S):','Distance (PC):'])
  await expect(id(page,'pulsar-params-window').getByText(caption,{exact:true})).toBeVisible();
 expect(await fieldsOf(page,['b1950','j2000','raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds','period','periodDot','epoch','sky','dm','width','s400','s600','s1400','date','density','derivedPeriod','distance']))
  .toEqual({b1950:'B0557+10',j2000:'J0600+1000',raHours:'6',raMinutes:'0',raSeconds:'0.00',decDegrees:'10',decMinutes:'0',decSeconds:'0.0',period:'0.500000000000',
   periodDot:'1.0000E-15',epoch:'50000.0000',sky:'28.2',dm:'30.00',width:'12.5',s400:'14.0',s600:'9.0',s1400:'3.0',date:'',density:'0.030',derivedPeriod:'',distance:'1000'});
 for(const name of ['j2000','period','epoch','dm','derivedPeriod','distance'])await expect(field(page,name)).toHaveAttribute('readonly','');
 await expect(id(page,'pulsar-params-update')).toBeDisabled();await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','none');
 await expect(id(page,'pulsar-params-seed')).toHaveText('At Open, the receivers’ shared source name was empty, so the window opened at the first record. Open did not change it.');
 await expect(id(page,'pulsar-params-derived-issues')).toContainText('No radio clock reading');
 // The file chooser is refused while the window is open; the catalog stays.
 await expect(id(page,'pulsar-ref-load')).toBeDisabled();await choose(page,'other.dat',OTHER);
 await expect(id(page,'pulsar-ref-status')).toHaveText('A catalog cannot be loaded while the Pulsar Parameters window is open.');await expect(id(page,'pulsar-ref-rows')).toHaveText('4');
 // Prev at the head: an accessible status, nothing moves.
 await id(page,'pulsar-params-prev').click();await expect(id(page,'pulsar-params-boundary')).toHaveAttribute('data-boundary','first');
 await expect(id(page,'pulsar-params-position')).toHaveText('Record 1 of 4');
 // A radio UT and longitude, then Reset: Date = JD − 2400000 (not MJD − 0.5) and the derived period.
 await applyClock(page,'2000-01-01T12:00:00');await id(page,'pulsar-params-reset').click();
 expect(await fieldsOf(page,['date','density','derivedPeriod','distance'])).toEqual({date:'51545.00000000',density:'0.030',derivedPeriod:'0.500000133488',distance:'1000'});
 await expect(id(page,'pulsar-params-derived-issues')).toHaveCount(0);
 // Update: success stores both and disables Update; Enter in a field acts only while Update is enabled.
 await field(page,'density').fill('0.06');await expect(id(page,'pulsar-params-update')).toBeEnabled();
 await field(page,'density').press('Enter');await expect(field(page,'distance')).toHaveValue('500');await expect(id(page,'pulsar-params-update')).toBeDisabled();
 // Sequential partial store: a good Date, then a bad Density: the box, Date kept, derived texts stale, Update enabled.
 await field(page,'date').fill('60000');await field(page,'density').fill('x');await id(page,'pulsar-params-update').click();
 await expect(notice(page)).toHaveAttribute('data-field','density');await expect(id(page,'pulsar-params-notice-ok')).toBeFocused();await hostHeld(page);
 await expect(id(page,'pulsar-params-notice-text')).toContainText('“x”');
 await expect(id(page,'pulsar-params-card')).toHaveAttribute('inert','');await expect(id(page,'radio-route-panel-wrapper')).toHaveAttribute('inert','');
 await page.keyboard.press('Escape');await expect(notice(page)).toHaveCount(0);await expect(field(page,'density')).toBeFocused();await hostReleased(page);
 expect(await fieldsOf(page,['date','density','derivedPeriod','distance'])).toEqual({date:'60000',density:'x',derivedPeriod:'0.500000133488',distance:'500'});
 await expect(id(page,'pulsar-params-update')).toBeEnabled();
 // Next displays the stored Date (the stale text is overwritten) and disables Update; Next stops at the tail.
 for(let i=0;i<3;i++)await id(page,'pulsar-params-next').click();
 await expect(id(page,'pulsar-params-position')).toHaveText('Record 4 of 4');await expect(field(page,'date')).toHaveValue('60000.00000000');
 await expect(field(page,'distance')).toHaveValue('50');// DM 3 / stored density 0.06
 await expect(id(page,'pulsar-params-update')).toBeDisabled();
 await id(page,'pulsar-params-next').click();await expect(id(page,'pulsar-params-boundary')).toHaveAttribute('data-boundary','last');await expect(field(page,'j2000')).toHaveValue('J2048-1616');
 // A bad Date stores nothing; the box returns focus to the Date field.
 await field(page,'date').fill('1e');await id(page,'pulsar-params-update').click();await expect(notice(page)).toHaveAttribute('data-field','date');
 await id(page,'pulsar-params-notice-ok').click();await expect(field(page,'date')).toBeFocused();
 await id(page,'pulsar-params-reset').click();await expect(field(page,'date')).toHaveValue('51545.00000000');
 // Help is authored and labelled as such.
 await id(page,'pulsar-params-help').click();await expect(id(page,'pulsar-params-help-text')).toContainText('not the original Help file');
 // Exit returns focus to Open; the catalog is kept and can be replaced now; reopen starts at the head again.
 await id(page,'pulsar-params-exit').click();await expect(id(page,'pulsar-params-window')).toHaveCount(0);await expect(id(page,'pulsar-params-open')).toBeFocused();
 await loadCatalog(page,'other.dat',OTHER);await expect(id(page,'pulsar-ref-rows')).toHaveText('2');
 await openWindow(page);await expect(field(page,'j2000')).toHaveValue('J1927+18');await expect(field(page,'date')).toHaveValue('51545.00000000');
 // Nothing reached the investigation format; other radio state is untouched.
 expect((await save(page)).equals(before)).toBe(true);
 await expect(id(page,'radio-clock-applied')).toHaveText('2000-01-01T12:00:00 UT');await expect(id(page,'radio-switch')).toBeDisabled();
 await noOverflow(page);await page.screenshot({path:info.outputPath('pulsar-params-desktop.png'),fullPage:true});
 await id(page,'pulsar-params-card').screenshot({path:info.outputPath('pulsar-params-card-desktop.png')});
 await page.reload();await nav(page,'Radio telescope').click();await expect(id(page,'pulsar-ref-none')).toBeVisible();
 await expect(id(page,'pulsar-params-window')).toHaveCount(0);await expect(id(page,'pulsar-params-open')).toBeDisabled();
});

test('Find: shared-name seed, B1950/J2000 substring, miss keeps the record, Cancel and Escape commit nothing, retained query; application-modal; Enter/Escape act once',async({page})=>{
 await openRadio(page);await switchOn(page);
 await id(page,'antenna-tracking').click();await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 await loadCatalog(page);
 // Receiver Open (the reachable writer) associates J0001+3826 at the first pointing; Open then reads that shared name.
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await expect(id(page,'receiver-heading-0')).toBeFocused();
 await openWindow(page);
 await expect(field(page,'j2000')).toHaveValue('J0001+3826');await expect(id(page,'pulsar-params-seed')).toHaveAttribute('data-seed','name');
 await expect(id(page,'pulsar-params-seed')).toHaveText('At Open, the receivers’ shared source name was J0001+3826: the window opened at the first record whose J2000 name contains it, or at the first record if none does. Open did not change that name.');
 // First open: B1950 checked and the seed's B1950 name, selected.
 await id(page,'pulsar-params-find').click();await expect(findDialog(page)).toBeVisible();await hostHeld(page);
 await expect(id(page,'pulsar-find-query')).toBeFocused();await expect(id(page,'pulsar-find-query')).toHaveValue('B2358+38');
 await expect(id(page,'pulsar-find-b1950')).toBeChecked();
 expect(await id(page,'pulsar-find-query').evaluate(el=>{const i=el as HTMLInputElement;return [i.selectionStart,i.selectionEnd];})).toEqual([0,8]);
 await expect(findDialog(page).getByText('Find Pulsar Data',{exact:true})).toBeVisible();
 await expect(id(page,'pulsar-params-card')).toHaveAttribute('inert','');await expect(id(page,'radio-route-clock')).toHaveAttribute('inert','');
 // Tab stays in the dialog.
 for(let i=0;i<6;i++)await page.keyboard.press('Tab');
 expect(await page.evaluate(()=>!!document.activeElement?.closest('[data-testid="pulsar-find-dialog"]'))).toBe(true);
 // Mid-name literal substring in B1950 names, chosen with Enter in the field.
 await id(page,'pulsar-find-query').fill('925+1');await id(page,'pulsar-find-query').press('Enter');
 await expect(findDialog(page)).toHaveCount(0);await expect(field(page,'j2000')).toHaveValue('J1927+18');await expect(id(page,'pulsar-params-find')).toBeFocused();await hostReleased(page);
 // A case miss: the box, the record kept; Enter closes only the box (held Enter does nothing more) and focus returns to Find.
 await field(page,'date').fill('123');
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-query')).toHaveValue('925+1');
 await id(page,'pulsar-find-query').fill('b2045');await id(page,'pulsar-find-ok').click();
 await expect(notice(page)).toHaveAttribute('data-kind','not-found');await expect(id(page,'pulsar-params-notice-text')).toHaveText('No B1950 Name contains “b2045”. The record shown before Find is kept.');
 await page.keyboard.down('Enter');await expect(notice(page)).toHaveCount(0);await expect(id(page,'pulsar-params-find')).toBeFocused();
 await page.keyboard.down('Enter');await expect(findDialog(page)).toHaveCount(0);await page.keyboard.up('Enter');
 await expect(field(page,'j2000')).toHaveValue('J1927+18');await expect(field(page,'date')).toHaveValue('123');// a miss displays nothing again
 // J2000: the query and mode are kept for the next open; Cancel and Escape commit neither.
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-query')).toHaveValue('b2045');
 await id(page,'pulsar-find-j2000').check();await id(page,'pulsar-find-query').fill('2048');await id(page,'pulsar-find-ok').click();
 await expect(field(page,'j2000')).toHaveValue('J2048-1616');await expect(field(page,'date')).not.toHaveValue('123');
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-j2000')).toBeChecked();await expect(id(page,'pulsar-find-query')).toHaveValue('2048');
 await id(page,'pulsar-find-query').fill('0600');await id(page,'pulsar-find-b1950').check();await id(page,'pulsar-find-cancel').click();
 await expect(id(page,'pulsar-params-find')).toBeFocused();await expect(field(page,'j2000')).toHaveValue('J2048-1616');
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-query')).toHaveValue('2048');await expect(id(page,'pulsar-find-j2000')).toBeChecked();
 await id(page,'pulsar-find-query').fill('0600');
 await page.keyboard.down('Escape');await expect(findDialog(page)).toHaveCount(0);await expect(id(page,'pulsar-params-find')).toBeFocused();
 await page.keyboard.down('Escape');await expect(id(page,'pulsar-params-window')).toBeVisible();await page.keyboard.up('Escape');
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-query')).toHaveValue('2048');await page.keyboard.press('Escape');
 // Over-long Find edits are refused, not truncated.
 await id(page,'pulsar-params-find').click();await id(page,'pulsar-find-query').fill('x'.repeat(65));
 await expect(id(page,'pulsar-find-refusal')).toContainText('refused');await expect(id(page,'pulsar-find-query')).toHaveValue('2048');await page.keyboard.press('Escape');
 // Reopen keeps the query; Exit forgets it: the next window seeds from the shared name again.
 await id(page,'pulsar-params-open').click();await expect(field(page,'j2000')).toHaveValue('J0001+3826');
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-query')).toHaveValue('2048');await page.keyboard.press('Escape');
 await id(page,'pulsar-params-exit').click();await openWindow(page);
 await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-query')).toHaveValue('B2358+38');await expect(id(page,'pulsar-find-b1950')).toBeChecked();
 await page.keyboard.press('Escape');await hostReleased(page);
 // The antenna was only read.
 await expect(id(page,'antenna-ra')).toHaveText('0 Hrs 0 Mins 0.00 Secs');
});

test('reads: Cancel, route change and a project operation cancel a held read and its late completion; too large and reimport keep or replace atomically',async({page})=>{
 await holdReads(page);await openRadio(page);await loadCatalog(page);
 // Cancel button.
 await choose(page,'held-a.dat',OTHER);await held(page,'held-a.dat');await expect(id(page,'pulsar-ref-status')).toHaveText('Reading held-a.dat…');
 await expect(id(page,'pulsar-params-open')).toBeDisabled();await expect(id(page,'pulsar-ref-load')).toBeDisabled();
 await id(page,'pulsar-ref-cancel').click();await expect(id(page,'pulsar-ref-status')).toHaveText('Reading held-a.dat was cancelled. The previous catalog is kept.');
 await release(page,'held-a.dat');await expect(id(page,'pulsar-ref-rows')).toHaveText('4');await expect(id(page,'pulsar-ref-name')).toHaveText('synthetic-pulsars.dat');
 // Route change.
 await choose(page,'held-b.dat',OTHER);await held(page,'held-b.dat');
 await page.goBack();await expect(id(page,'radio-control')).toBeHidden();await page.goForward();await expect(id(page,'radio-control')).toBeVisible();
 await expect(id(page,'pulsar-ref-status')).toHaveText('Reading held-b.dat was cancelled. The previous catalog is kept.');
 await release(page,'held-b.dat');await expect(id(page,'pulsar-ref-rows')).toHaveText('4');
 // A project operation (a held restore) on this route.
 await choose(page,'held-c.dat',OTHER);await held(page,'held-c.dat');
 await restore(page,'held-restore.json','{}');await held(page,'held-restore.json');
 await expect(id(page,'pulsar-ref-status')).toHaveText('Reading held-c.dat was cancelled. The previous catalog is kept.');
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await release(page,'held-c.dat');await release(page,'held-restore.json');
 await expect(id(page,'pulsar-ref-rows')).toHaveText('4');await expect(id(page,'pulsar-ref-sha')).toHaveText(sha(CATALOG));
 // Too large: refused before reading; the catalog stays.
 await choose(page,'big.dat','x'.repeat((1<<20)+1));
 await expect(id(page,'pulsar-ref-status')).toHaveText('big.dat is larger than 1048576 bytes and was not read. The previous catalog is kept.');await expect(id(page,'pulsar-ref-rows')).toHaveText('4');
 // A bad number names line and column; then a reimport of the same name replaces catalog and identity together.
 await choose(page,'bad.dat',line(ROWS[0])+'\r\n'+line({...ROWS[1],dec:'abc'})+'\r\n');
 await expect(id(page,'pulsar-ref-status')).toHaveText('bad.dat was not accepted: line 2, column dec: not a decimal number. The previous catalog is kept.');
 await loadCatalog(page,'synthetic-pulsars.dat',OTHER);await expect(id(page,'pulsar-ref-rows')).toHaveText('2');
 await loadCatalog(page,'synthetic-pulsars.dat',CATALOG);await expect(id(page,'pulsar-ref-rows')).toHaveText('4');
 await openWindow(page);await expect(field(page,'j2000')).toHaveValue('J0600+1000');
});

test('an antenna box arriving while Find is open takes over; Find returns with its draft and focus; Back hides and Forward restores the box',async({page})=>{
 await openRadio(page);await switchOn(page);await loadCatalog(page);
 // Every surface used below is rendered once before the clock is frozen; the slew then advances one nominal 100 ms tick at a time.
 await openWindow(page);await id(page,'pulsar-params-find').click();await id(page,'pulsar-find-cancel').click();await id(page,'pulsar-params-exit').click();
 await page.clock.install();await page.clock.pauseAt(Date.now()+60_000);await flushTasks(page);
 await id(page,'antenna-tracking').click();await expect(id(page,'antenna-tracking-state')).toHaveText('Tracking on');
 // A short programmed slew; Find opens while it runs.
 await id(page,'antenna-set-coordinates').click();
 for(const [name,value] of [['raHours','0'],['raMinutes','0'],['raSeconds','30'],['decDegrees','38'],['decMinutes','25'],['decSeconds','0']] as const)await id(page,`antenna-field-${name}`).fill(value);
 await id(page,'antenna-dialog-ok').click();await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();
 await openWindow(page);await id(page,'pulsar-params-find').click();await id(page,'pulsar-find-query').fill('kept');
 // The clock is paused: the slew is still running and no arrival box exists while the draft is typed.
 expect(await id(page,'antenna-notice').count()).toBe(0);await expect(id(page,'antenna-ticks')).toBeAttached();
 await expect(findDialog(page)).toBeVisible();await expect(id(page,'pulsar-find-query')).toHaveValue('kept');
 // At most 100 nominal SlewTimer2 callbacks (10 s simulated) until the arrival box appears.
 for(let i=0;i<100&&await id(page,'antenna-notice').count()===0;i++){await page.clock.runFor(100);await flushTasks(page);}
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete',{timeout:20_000});await expect(id(page,'antenna-notice-ok')).toBeFocused();
 await expect(findDialog(page)).toHaveCount(0);await expect(layer(page)).toHaveAttribute('data-modal-pending','true');
 await id(page,'antenna-notice-ok').click();
 await expect(findDialog(page)).toBeVisible();await expect(id(page,'pulsar-find-query')).toHaveValue('kept');await expect(id(page,'pulsar-find-query')).toBeFocused();await hostHeld(page);
 // A miss box survives a route change and closes alone.
 await id(page,'pulsar-find-ok').click();await expect(notice(page)).toHaveAttribute('data-kind','not-found');
 await page.goBack();await expect(notice(page)).toHaveCount(0);await hostReleased(page);await expect(heading(page,'Start with the sky.')).toBeFocused();
 await page.goForward();await expect(notice(page)).toBeVisible();await expect(id(page,'pulsar-params-notice-ok')).toBeFocused();await hostHeld(page);
 await page.keyboard.press('Escape');await expect(notice(page)).toHaveCount(0);await expect(id(page,'pulsar-params-find')).toBeFocused();await hostReleased(page);
});

test('390 px: keyboard-only load-to-Find path, no horizontal overflow; screenshots',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await openRadio(page);await loadCatalog(page);
 await id(page,'pulsar-params-open').focus();await page.keyboard.press('Enter');await expect(id(page,'pulsar-params-heading')).toBeFocused();
 await id(page,'pulsar-params-next').focus();await page.keyboard.press('Enter');await expect(id(page,'pulsar-params-position')).toHaveText('Record 2 of 4');
 await field(page,'density').focus();await page.keyboard.press('Control+A');await page.keyboard.type('0.1');await page.keyboard.press('Enter');
 await expect(field(page,'distance')).toHaveValue('300');
 await id(page,'pulsar-params-find').focus();await page.keyboard.press('Enter');await expect(id(page,'pulsar-find-query')).toBeFocused();
 await page.keyboard.type('045');await page.keyboard.press('Enter');await expect(field(page,'j2000')).toHaveValue('J2048-1616');
 await noOverflow(page);await page.screenshot({path:info.outputPath('pulsar-params-390.png'),fullPage:true});
 await id(page,'pulsar-params-card').screenshot({path:info.outputPath('pulsar-params-card-390.png')});
 await id(page,'pulsar-params-find').click();await expect(findDialog(page)).toBeVisible();
 await expect.poll(()=>findDialog(page).evaluate(el=>el.getBoundingClientRect().right<=document.documentElement.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('pulsar-find-390.png')});
});

// Optional original fixture: run with OPENVIREO_PULSARS_DAT; skipped by name when unset. The file is read by the test
// and handed to the browser chooser only; it is never written into the repository or the report.
test('original Pulsars.dat (OPENVIREO_PULSARS_DAT; skipped when unset): recorded identity, J2000 Find 1927+18',async({page})=>{
 test.skip(!env.OPENVIREO_PULSARS_DAT,'OPENVIREO_PULSARS_DAT is not set');
 const bytes=await readFile(env.OPENVIREO_PULSARS_DAT!);
 await openRadio(page);
 await id(page,'pulsar-ref-file').setInputFiles({name:'Pulsars.dat',mimeType:'text/plain',buffer:bytes});
 await expect(id(page,'pulsar-ref-status')).toHaveText('Catalog loaded.');await expect(id(page,'pulsar-ref-identity')).toHaveAttribute('data-recorded','true');
 await expect(id(page,'pulsar-ref-rows')).toHaveText('558');
 await openWindow(page);await id(page,'pulsar-params-find').click();await id(page,'pulsar-find-j2000').check();await id(page,'pulsar-find-query').fill('1927+18');
 await id(page,'pulsar-find-ok').click();await expect(id(page,'pulsar-params-window')).toHaveAttribute('data-index','452');
});
