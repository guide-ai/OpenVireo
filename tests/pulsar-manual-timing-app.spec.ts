import {test,expect,type Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {HEADER} from './fixtures/pulsar-saved-rows-controls';
// Actual App flows of R-RX19 (docs/PULSAR-MANUAL-TIMING.md): the optional manual timing guide of the rendered #pulsar-analysis
// route and the existing manual cursor, Record, Review and Export paths it describes. No harness and no product debug hook.
// SYNTHETIC test-owned PLR vectors with hand-placed peaks (value 50 on zero rows, dt 0.01 s): not CLEA data, not model output,
// no noise. Expected strings are hand-written literals of the chosen web contract (not computed by product code and not native
// oracles); a browser download event is not proof that a file was saved.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const heading=(page:Page,name:string)=>page.getByRole('heading',{level:1,name,includeHidden:true});
const file=(name:string,text:string)=>({name,mimeType:'application/octet-stream',buffer:Buffer.from(text,'latin1')});
const sha=(text:string)=>createHash('sha256').update(Buffer.from(text,'latin1')).digest('hex');
const noOverflow=(page:Page)=>expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
async function download(page:Page,act:()=>Promise<unknown>){const next=page.waitForEvent('download');await act();const d=await next;return {name:d.suggestedFilename(),bytes:await readFile((await d.path())!)};}
const storage=(page:Page)=>page.evaluate(()=>[Object.keys(localStorage).sort(),Object.keys(sessionStorage).sort()]);

// ----------------------------------------------------------------------------------------------- synthetic vectors
const START='60000.50000000';
/** Header plus `rows` rows; column c is 50.000 at the rows listed in peaks[c], 0.000 elsewhere. */
function plr(name:string,highest:number,freqs:string,gains:string,peaks:readonly (readonly number[])[],rows=400){
 const lines=[`'${name}',40,${highest}`,freqs,gains,`${START},0.01000`];
 for(let r=0;r<rows;r++)lines.push([0,1,2].map(c=>peaks[c].includes(r)?'50.000':'0.000').join(','));
 return lines.join('\r\n')+'\r\n';
}
// Repeated peaks per channel; channel 2 and 3 repeat the pattern 20 and 40 rows later (hand-placed counterparts).
const TIMING=plr('SYNTHETIC TIMING',2,'400.00,600.00,800.00','1.000,1.000,1.000',[[50,150,250],[70,170,270],[90,190,290]]);
const ONE=plr('SYNTHETIC ONE CHANNEL',0,'400.00,0,0','1.000,0,0',[[50,150,250],[],[]]);
const NO_ROWS=plr('SYNTHETIC NO ROWS',2,'400.00,600.00,800.00','1.000,1.000,1.000',[[],[],[]],0);
const TIMING_FILE='synthetic-timing.plr';

const GUIDE_NO_DATA='Nothing to measure yet: no recorded data points are shown (no data, or data without rows).';
const GUIDE_ONE='This data has one recorded receiver. Readings in that panel are possible, but a comparison between receivers needs at least two. Panels beyond the highest recorded receiver are not measurements.';

async function open(page:Page){await page.goto('/#pulsar-analysis');await expect(heading(page,'Recorded pulsar analysis')).toBeVisible();}
async function load(page:Page,name:string,text:string){
 await id(page,'pulsar-file').setInputFiles(file(name,text));
 await expect(id(page,'pulsar-sha')).toHaveText(sha(text));
}
const closeProperties=async(page:Page)=>{await id(page,'pulsar-properties-close').click();await expect(id(page,'pulsar-properties')).toHaveCount(0);};
/**
 * One mouse click at the centre of native pixel (px, row) of panel n. The plot is scrolled into view first, because the
 * mouse uses viewport coordinates. The viewBox starts at −0.5, so pixel i covers client offsets [i, i + 1)·width/400.
 */
async function clickPixel(page:Page,n:number,px:number,row:number,button:'left'|'right'){
 const plot=id(page,`pulsar-plot-${n}`);await plot.scrollIntoViewIfNeeded();
 const box=(await plot.boundingBox())!;
 const height=Number((await plot.getAttribute('viewBox'))!.split(' ')[3]);
 await page.mouse.move(box.x+(px+.5)*box.width/400,box.y+(row+.5)*box.height/height);
 await page.mouse.down({button});await page.mouse.up({button});
}
/** Touch tap at the centre of native pixel (px, row) of panel n (scrolled into view first). */
async function tapPixel(page:Page,n:number,px:number,row:number){
 const plot=id(page,`pulsar-plot-${n}`);await plot.scrollIntoViewIfNeeded();
 const box=(await plot.boundingBox())!;
 const height=Number((await plot.getAttribute('viewBox'))!.split(' ')[3]);
 await page.touchscreen.tap(box.x+(px+.5)*box.width/400,box.y+(row+.5)*box.height/height);
}
const trace=(page:Page,n:number)=>id(page,`pulsar-trace-${n}`).getAttribute('points').then(p=>p!.split(' '));
/** Record dialog fields (start … horizontal), the heading and the comment, then OK. */
async function recordOne(page:Page,expected:Record<'heading'|'start'|'frequency'|'gain'|'reference'|'vertical'|'horizontal',string>,comment:string){
 const dialog=id(page,'pulsar-record-dialog');await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading')).toHaveText(expected.heading);
 for(const k of ['start','frequency','gain','reference','vertical','horizontal'] as const)await expect(id(page,`pulsar-record-${k}`)).toHaveText(expected[k]);
 await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
}
/** Review cells (object … file) of every confirmed row, read from the rendered Review dialog, which is then cancelled. */
async function reviewCells(page:Page){
 await id(page,'pulsar-review').click();await expect(id(page,'pulsar-review-dialog')).toBeVisible();
 const rows=page.locator('[data-testid^="pulsar-entry-"]');const out:string[][]=[];
 for(let i=0;i<await rows.count();i++)out.push((await rows.nth(i).locator('td').allInnerTexts()).slice(3));
 await id(page,'pulsar-review-cancel').click();await expect(id(page,'pulsar-review-dialog')).toHaveCount(0);
 return out;
}
const disabledControls=(page:Page)=>page.locator('[data-testid="pulsar-analysis"] :is(button,input):disabled').evaluateAll(els=>els.map(e=>e.getAttribute('data-testid')??e.outerHTML));
/** Everything a guide toggle must leave alone. */
async function snapshot(page:Page){
 const plots:string[]=[];for(const n of [1,2,3])plots.push(await id(page,`pulsar-plot-${n}`).evaluate(el=>el.outerHTML));
 return {plots,panels:await page.locator('.plr-panels').innerText(),reference:await id(page,'pulsar-reference').innerText(),count:await id(page,'pulsar-count').innerText(),
  pending:await page.locator('[data-testid^="pulsar-pending-"]').count(),sha:await id(page,'pulsar-sha').innerText(),record:await id(page,'pulsar-record').isEnabled(),
  disabled:await disabledControls(page),storage:await storage(page)};
}

test('RX19-1/2: Properties of the synthetic vector: 10.00 msec between points, 400/600/800 MHz, three recorded receivers; the guide names the units',async({page})=>{
 await open(page);
 // No data: the guide explains the prerequisite.
 await expect(id(page,'pulsar-none')).toBeVisible();await expect(id(page,'pulsar-guide-availability')).toHaveText(GUIDE_NO_DATA);
 await load(page,TIMING_FILE,TIMING);
 await expect(id(page,'pulsar-properties')).toBeVisible();
 await expect(id(page,'pulsar-prop-object')).toHaveText('SYNTHETIC TIMING');
 await expect(id(page,'pulsar-prop-interval')).toHaveText('10.00');
 await expect(id(page,'pulsar-properties')).toContainText('Time interval between data points (msec)');
 await expect(id(page,'pulsar-prop-points')).toHaveText('400');
 await expect(id(page,'pulsar-prop-start')).toHaveText(START);
 for(const [n,freq] of [[1,'400.00'],[2,'600.00'],[3,'800.00']] as const)
  await expect(id(page,`pulsar-prop-receiver-${n}`).locator('td')).toHaveText([freq,'1.000']);
 await closeProperties(page);
 // Three recorded receivers: no availability note; the hand-placed peaks are drawn at their own columns (base − 50).
 await expect(id(page,'pulsar-guide-availability')).toHaveCount(0);
 for(const n of [1,2,3])await expect(id(page,`pulsar-panel-${n}-not-recorded`)).toHaveCount(0);
 expect(await trace(page,1)).toEqual(expect.arrayContaining(['50,69','150,69','250,69']));
 expect(await trace(page,2)).toEqual(expect.arrayContaining(['70,74','170,74','270,74']));
 expect(await trace(page,3)).toEqual(expect.arrayContaining(['90,74','190,74','290,74']));
 await id(page,'pulsar-guide-summary').click();await expect(id(page,'pulsar-guide')).toHaveAttribute('open','');
 await expect(id(page,'pulsar-guide-units')).toHaveText('Properties shows frequencies in MHz and the time between data points in milliseconds (msec). Cursor readings and the window are in seconds from the start of the data.');
 await expect(id(page,'pulsar-guide-provenance')).toContainText('not a recovered native guide or algorithm');
 await expect(id(page,'pulsar-guide-cursors')).toContainText('The horizontal readout is a relative strength, not a time.');
});

test('RX19-3: same channel: reference on the first ch1 pulse (pointer), vertical cursor on the later ch1 pulse (pointer + keyboard), recorded with comment',async({page})=>{
 await open(page);await load(page,TIMING_FILE,TIMING);await closeProperties(page);
 // Start away from the guide's state: horizontal mode and the primary input on the reference cursor.
 await id(page,'pulsar-horizontal-1').click();await expect(id(page,'pulsar-horizontal-1')).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('the reference cursor (right button)',{exact:true}).check();
 await expect(page.getByLabel('the reference cursor (right button)',{exact:true})).toBeChecked();
 // Follow the guide: primary input on the panel cursor, then the panel's vertical readout.
 await page.getByLabel('the panel cursor (left button)',{exact:true}).check();
 await expect(page.getByLabel('the panel cursor (left button)',{exact:true})).toBeChecked();
 await id(page,'pulsar-vertical-1').click();
 await expect(id(page,'pulsar-vertical-1')).toHaveAttribute('aria-pressed','true');await expect(id(page,'pulsar-horizontal-1')).toHaveAttribute('aria-pressed','false');
 // Reference: right button at pixel 50 (row 50 at zoom 1) → 50 × 0.01 s.
 await clickPixel(page,1,50,10,'right');
 await expect(id(page,'pulsar-reference')).toHaveText('0.500000');
 await expect(id(page,'pulsar-rline-1')).toHaveAttribute('x1','50');
 // Vertical: left button one pixel before the later pulse, then one Right arrow press onto it.
 await clickPixel(page,1,149,10,'left');await expect(id(page,'pulsar-vertical-value-1')).toHaveText('1.490000');
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-vertical-value-1')).toHaveText('1.500000');await expect(id(page,'pulsar-vline-1')).toHaveAttribute('x1','150');
 await expect(id(page,'pulsar-reference')).toHaveText('0.500000');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();
 for(const n of [2,3])await expect(id(page,`pulsar-pending-${n}`)).toHaveCount(0);
 await id(page,'pulsar-record').click();
 await recordOne(page,{heading:'Record measurement: SYNTHETIC TIMING (receiver 1)',start:START,frequency:'400.00',gain:'1.000',reference:'0.500000',vertical:'1.500000',horizontal:'0.0000E+00'},'ch1 successive pulse');
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // The zero horizontal reading is stored blank ('—' in Review).
 expect(await reviewCells(page)).toEqual([['SYNTHETIC TIMING','400.00','1.000','0.500000','1.500000','—',START,'ch1 successive pulse','400','10.00','40',TIMING_FILE]]);
 await expect(id(page,'pulsar-sha')).toHaveText(sha(TIMING));
});

test('RX19-4/8: two recorded channels: one reference, corresponding features, two Record dialogs; Review and the exported CSV keep exact values',async({page})=>{
 await open(page);await load(page,TIMING_FILE,TIMING);await closeProperties(page);
 await clickPixel(page,1,50,10,'right');
 await clickPixel(page,1,150,10,'left');await clickPixel(page,2,170,10,'left');
 await expect(id(page,'pulsar-vertical-value-1')).toHaveText('1.500000');await expect(id(page,'pulsar-vertical-value-2')).toHaveText('1.700000');
 await expect(id(page,'pulsar-reference')).toHaveText('0.500000');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();await expect(id(page,'pulsar-pending-2')).toBeVisible();await expect(id(page,'pulsar-pending-3')).toHaveCount(0);
 await id(page,'pulsar-record').click();
 await recordOne(page,{heading:'Record measurement: SYNTHETIC TIMING (receiver 1)',start:START,frequency:'400.00',gain:'1.000',reference:'0.500000',vertical:'1.500000',horizontal:'0.0000E+00'},'ch1 feature');
 await recordOne(page,{heading:'Record measurement: SYNTHETIC TIMING (receiver 2)',start:START,frequency:'600.00',gain:'1.000',reference:'0.500000',vertical:'1.700000',horizontal:'0.0000E+00'},'ch2 chosen counterpart');
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);await expect(id(page,'pulsar-count')).toHaveText('2 recorded measurements');
 const cells=await reviewCells(page);
 expect(cells).toEqual([
  ['SYNTHETIC TIMING','400.00','1.000','0.500000','1.500000','—',START,'ch1 feature','400','10.00','40',TIMING_FILE],
  ['SYNTHETIC TIMING','600.00','1.000','0.500000','1.700000','—',START,'ch2 chosen counterpart','400','10.00','40',TIMING_FILE],
 ]);
 // Export with test-typed metadata.
 await id(page,'pulsar-export').click();await expect(id(page,'pulsar-export-dialog')).toBeVisible();
 await id(page,'pulsar-export-date').fill('26/10/2026');await id(page,'pulsar-export-time').fill('09:30:00');
 await id(page,'pulsar-export-table').fill('19');await id(page,'pulsar-export-name1').fill('Timing Learner');
 const got=await download(page,()=>id(page,'pulsar-export-download').click());
 expect(got.name).toBe('pulsar-results.csv');
 const lines=got.bytes.toString('latin1').split('\r\n');
 const ROW1=`"SYNTHETIC TIMING",400.00,1.000,0.500000,1.500000,"",${START},"ch1 feature",400,10.00,40,"${TIMING_FILE}"`;
 const ROW2=`"SYNTHETIC TIMING",600.00,1.000,0.500000,1.700000,"",${START},"ch2 chosen counterpart",400,10.00,40,"${TIMING_FILE}"`;
 expect(lines).toEqual(['"26/10/2026","09:30:00"','"Table Number: 19"','','"Timing Learner"','',HEADER,ROW1,ROW2,'']);
 // Field by field: frequency (MHz), reference and vertical (s), start, interval in msec (not seconds), object and file.
 for(const [row,freq,vert] of [[lines[6],'400.00','1.500000'],[lines[7],'600.00','1.700000']] as const){
  const f=row.split(',');expect(f).toHaveLength(12);
  expect([f[0],f[1],f[3],f[4],f[5],f[6],f[9],f[11]]).toEqual(['"SYNTHETIC TIMING"',freq,'0.500000',vert,'""',START,'10.00',`"${TIMING_FILE}"`]);
 }
 await expect(id(page,'pulsar-export-dialog')).toHaveCount(0);
 await expect(id(page,'pulsar-count')).toHaveText('2 recorded measurements');
 expect(await reviewCells(page)).toEqual(cells);
 await expect(id(page,'pulsar-sha')).toHaveText(sha(TIMING));
});

test('RX19-5: the guide toggle changes nothing; zoom requantizes and restores under the existing contract; Reset clears cursors and pending and keeps the list',async({page})=>{
 await open(page);await load(page,TIMING_FILE,TIMING);await closeProperties(page);
 await clickPixel(page,1,50,10,'right');await clickPixel(page,1,150,10,'left');
 await id(page,'pulsar-record').click();await recordOne(page,{heading:'Record measurement: SYNTHETIC TIMING (receiver 1)',start:START,frequency:'400.00',gain:'1.000',reference:'0.500000',vertical:'1.500000',horizontal:'0.0000E+00'},'kept');
 await clickPixel(page,2,170,10,'left');await expect(id(page,'pulsar-pending-2')).toBeVisible();
 const before=await snapshot(page);
 await expect(id(page,'pulsar-guide')).not.toHaveAttribute('open');
 await id(page,'pulsar-guide-summary').click();await expect(id(page,'pulsar-guide')).toHaveAttribute('open','');
 await expect(id(page,'pulsar-guide-zoom')).toContainText('They add no information to the samples');
 expect(await snapshot(page)).toEqual(before);
 await id(page,'pulsar-guide-summary').click();await expect(id(page,'pulsar-guide')).not.toHaveAttribute('open');
 expect(await snapshot(page)).toEqual(before);
 // Zoom in (window 1 … 3 s at zoom 2): 1.5 s lies at pixel (1.5 − 1)·2/0.01 = 100; the 0.5 s reference is before the window,
 // so its line is hidden while its readout stays. Zoom out restores the zoom-1 window and both lines.
 const zoom=await id(page,'pulsar-zoom').innerText(),windowStart=await id(page,'pulsar-window-start').innerText();
 await id(page,'pulsar-zoom-in').click();
 await expect(id(page,'pulsar-zoom')).not.toHaveText(zoom);
 await expect(id(page,'pulsar-vline-1')).toHaveAttribute('x1','100');await expect(id(page,'pulsar-vertical-value-1')).toHaveText('1.500000');
 await expect(id(page,'pulsar-rline-1')).toHaveCount(0);await expect(id(page,'pulsar-reference')).toHaveText('0.500000');
 await id(page,'pulsar-zoom-out').click();
 await expect(id(page,'pulsar-zoom')).toHaveText(zoom);await expect(id(page,'pulsar-window-start')).toHaveText(windowStart);
 await expect(id(page,'pulsar-vline-1')).toHaveAttribute('x1','150');await expect(id(page,'pulsar-rline-1')).toHaveAttribute('x1','50');
 await expect(id(page,'pulsar-vertical-value-2')).toHaveText('1.700000');await expect(id(page,'pulsar-pending-2')).toBeVisible();
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // Reset: cursors and the unrecorded measurement go; the recorded list stays.
 await id(page,'pulsar-reset').click();
 for(const n of [1,2,3]){await expect(id(page,`pulsar-vline-${n}`)).toHaveCount(0);await expect(id(page,`pulsar-rline-${n}`)).toHaveCount(0);await expect(id(page,`pulsar-pending-${n}`)).toHaveCount(0);}
 await expect(id(page,'pulsar-record')).toBeDisabled();
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 await expect(id(page,'pulsar-sha')).toHaveText(sha(TIMING));
 expect(await storage(page)).toEqual(before.storage);
});

test('RX19-6: one recorded channel, zero rows and no data: honest availability; padding panels stay unmeasured; the guide enables nothing',async({page})=>{
 await open(page);
 await expect(id(page,'pulsar-guide-availability')).toHaveText(GUIDE_NO_DATA);
 // One recorded channel.
 await load(page,'synthetic-one-channel.plr',ONE);await closeProperties(page);
 await expect(id(page,'pulsar-guide-availability')).toHaveText(GUIDE_ONE);
 for(const n of [2,3])await expect(id(page,`pulsar-panel-${n}-not-recorded`)).toBeVisible();
 await clickPixel(page,2,170,10,'left');await clickPixel(page,3,190,10,'left');
 for(const n of [1,2,3])await expect(id(page,`pulsar-pending-${n}`)).toHaveCount(0);
 await expect(id(page,'pulsar-record')).toBeDisabled();
 const disabled=await disabledControls(page);
 await id(page,'pulsar-guide-summary').click();await expect(id(page,'pulsar-guide')).toHaveAttribute('open','');
 expect(await disabledControls(page)).toEqual(disabled);await expect(id(page,'pulsar-record')).toBeDisabled();
 // The recorded channel itself still measures.
 await clickPixel(page,1,150,10,'left');await expect(id(page,'pulsar-vertical-value-1')).toHaveText('1.500000');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 // Imported zero-row file: Properties (0 points) and three panels, nothing pending, Record disabled.
 await load(page,'synthetic-no-rows.plr',NO_ROWS);
 await expect(id(page,'pulsar-properties')).toBeVisible();await expect(id(page,'pulsar-prop-points')).toHaveText('0');
 await closeProperties(page);
 for(const n of [1,2,3])await expect(id(page,`pulsar-plot-${n}`)).toHaveCount(1);
 await expect(id(page,'pulsar-none')).toHaveCount(0);
 await expect(page.getByText('No Current Data to Analyze',{exact:true})).toHaveCount(0);
 await expect(id(page,'pulsar-guide-availability')).toHaveText(GUIDE_NO_DATA);
 await expect(page.locator('[data-testid^="pulsar-pending-"]')).toHaveCount(0);
 await clickPixel(page,1,150,10,'left');await expect(page.locator('[data-testid^="pulsar-pending-"]')).toHaveCount(0);
 await expect(id(page,'pulsar-record')).toHaveCount(1);await expect(id(page,'pulsar-record')).toBeDisabled();
 const empty=await disabledControls(page);
 await expect(id(page,'pulsar-guide')).toHaveAttribute('open','');
 await id(page,'pulsar-guide-summary').click();await id(page,'pulsar-guide-summary').click();
 expect(await disabledControls(page)).toEqual(empty);
 await expect(id(page,'pulsar-sha')).toHaveText(sha(NO_ROWS));
});

test('RX19-7: keyboard disclosure, touch with primary-as-reference, and no overflow at 320 and 1440',async({browser},info)=>{
 const context=await browser.newContext({hasTouch:true,viewport:{width:1440,height:900}});
 const page=await context.newPage();
 await open(page);await load(page,TIMING_FILE,TIMING);await closeProperties(page);
 // Keyboard: Tab from the last control of panel 3 reaches the summary; Enter opens and closes it.
 await id(page,'pulsar-factor-up-3').focus();await page.keyboard.press('Tab');
 await expect(id(page,'pulsar-guide-summary')).toBeFocused();
 await page.keyboard.press('Enter');await expect(id(page,'pulsar-guide')).toHaveAttribute('open','');
 await page.keyboard.press('Enter');await expect(id(page,'pulsar-guide')).not.toHaveAttribute('open');
 await page.keyboard.press('Enter');await expect(id(page,'pulsar-guide')).toHaveAttribute('open','');
 await expect(page.locator('[data-testid^="pulsar-pending-"]')).toHaveCount(0);
 // Touch: primary as reference, tap ch1 at pixel 60; then primary as panel cursor, tap ch1 at pixel 160.
 await id(page,'pulsar-primary-reference').check();
 await tapPixel(page,1,60,10);await expect(id(page,'pulsar-reference')).toHaveText('0.600000');
 await id(page,'pulsar-primary-panel').check();
 await tapPixel(page,1,160,10);await expect(id(page,'pulsar-vertical-value-1')).toHaveText('1.600000');
 await expect(id(page,'pulsar-reference')).toHaveText('0.600000');await expect(id(page,'pulsar-pending-1')).toBeVisible();
 // Keyboard Record of the touched reading.
 await id(page,'pulsar-record').focus();await page.keyboard.press('Enter');
 await expect(id(page,'pulsar-comment')).toBeFocused();await page.keyboard.type('touch reading');await page.keyboard.press('Enter');
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 // Layout with the guide open.
 await noOverflow(page);await page.screenshot({path:info.outputPath('manual-timing-1440.png'),fullPage:true});
 await page.setViewportSize({width:320,height:800});
 await noOverflow(page);await id(page,'pulsar-guide').scrollIntoViewIfNeeded();
 const summary=(await id(page,'pulsar-guide-summary').boundingBox())!;expect(summary.height).toBeGreaterThanOrEqual(40);
 await page.screenshot({path:info.outputPath('manual-timing-320.png'),fullPage:true});
 await context.close();
});

test('RX19-8: Review Cancel and Export Cancel keep the list; the guide does not present a download as a saved file',async({page})=>{
 await open(page);await load(page,TIMING_FILE,TIMING);await closeProperties(page);
 await clickPixel(page,1,50,10,'right');await clickPixel(page,1,150,10,'left');
 await id(page,'pulsar-record').click();await recordOne(page,{heading:'Record measurement: SYNTHETIC TIMING (receiver 1)',start:START,frequency:'400.00',gain:'1.000',reference:'0.500000',vertical:'1.500000',horizontal:'0.0000E+00'},'cancel paths');
 const cells=await reviewCells(page);
 expect(cells).toEqual([['SYNTHETIC TIMING','400.00','1.000','0.500000','1.500000','—',START,'cancel paths','400','10.00','40',TIMING_FILE]]);
 await expect(id(page,'pulsar-status')).toHaveText('Review cancelled. The recorded measurements are unchanged.');
 await id(page,'pulsar-export').click();await expect(id(page,'pulsar-export-dialog')).toBeVisible();
 await id(page,'pulsar-export-date').fill('draft');await id(page,'pulsar-export-cancel').click();
 await expect(id(page,'pulsar-export-dialog')).toHaveCount(0);await expect(id(page,'pulsar-status')).toHaveText('Export cancelled. Nothing was downloaded.');
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
 expect(await reviewCells(page)).toEqual(cells);
 await id(page,'pulsar-guide-summary').click();
 await expect(id(page,'pulsar-guide-record')).toContainText('Export only requests a browser download and does not confirm that a file was saved.');
 // While a dialog is open the main region, and the guide in it, is inert.
 await id(page,'pulsar-review').click();await expect(id(page,'pulsar-review-dialog')).toBeVisible();
 await expect(page.locator('.plr-main')).toHaveAttribute('inert');
 await id(page,'pulsar-review-cancel').click();await expect(id(page,'pulsar-review-dialog')).toHaveCount(0);
 await expect(id(page,'pulsar-count')).toHaveText('1 recorded measurements');
});
