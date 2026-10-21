import{test,expect,type Page}from'@playwright/test';
import{createHash}from'node:crypto';
import{readFile}from'node:fs/promises';
// Synthetic format/control vector. No original recording, acquisition or writer witness.
const TEXT=["'SYNTHETIC ROUTE',40,1",'430,1420,0','1,2,1','50000.125,0.5',...Array.from({length:120},(_,i)=>`${i%20},10,0`)].join('\r\n')+'\r\n';
const file=(name='route-control.plr',text=TEXT)=>({name,mimeType:'application/octet-stream',buffer:Buffer.from(text,'ascii')});
const digest=createHash('sha256').update(TEXT,'ascii').digest('hex');
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
async function open(page:Page){await page.goto('/#pulsar-analysis');await expect(page.getByRole('heading',{level:1,name:'Recorded pulsar analysis'})).toBeVisible();await expect(page.getByTestId('pulsar-analysis')).toHaveAttribute('data-active','true');}
async function load(page:Page){await page.getByTestId('pulsar-file').setInputFiles(file());await expect(page.getByTestId('pulsar-sha')).toHaveText(digest);await page.getByTestId('pulsar-properties-close').click();}
async function record(page:Page,comment:string){await page.getByTestId('pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('0.500000');await page.getByTestId('pulsar-record').click();await page.getByTestId('pulsar-comment').fill(comment);await page.getByTestId('pulsar-record-ok').click();}

test('actual Radio data route retains manual records across navigation and copies original bytes; reload matches visible persistence warning',async({page},info)=>{
 await open(page);await load(page);await expect(page.getByTestId('pulsar-persistence')).toContainText('not part of Save investigation');await record(page,'kept across navigation');
 await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
 await nav(page,'Observatory').click();await expect(page.getByTestId('pulsar-analysis')).toBeHidden();await expect(page.getByTestId('pulsar-analysis')).toHaveAttribute('data-active','false');
 await nav(page,'Radio data').click();await expect(page.getByRole('heading',{level:1,name:'Recorded pulsar analysis'})).toBeFocused();
 await expect(page.getByTestId('pulsar-sha')).toHaveText(digest);await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
 await page.getByTestId('pulsar-review').click();await expect(page.getByTestId('pulsar-entry-1')).toContainText('kept across navigation');await expect(page.getByTestId('pulsar-entry-1')).toContainText('0.500000');
 const download=page.waitForEvent('download');await page.getByTestId('pulsar-download').click();const d=await download;expect(await readFile((await d.path())!)).toEqual(Buffer.from(TEXT,'ascii'));
 await page.screenshot({path:info.outputPath('integrated-radio-desktop.png'),fullPage:true});await page.reload();await expect(page.getByTestId('pulsar-none')).toBeVisible();
});

test('real route deactivation stops held pan and a late file read while keeping confirmed measurements',async({page})=>{
 await page.addInitScript(()=>{const original=Blob.prototype.arrayBuffer;Blob.prototype.arrayBuffer=function(this:Blob){return this instanceof File&&this.name.includes('slow')?new Promise<ArrayBuffer>(resolve=>setTimeout(()=>resolve(original.call(this)),700)):original.call(this);};});
 await open(page);await load(page);await record(page,'stable before hiding');await page.clock.install();await page.clock.pauseAt(Date.now()+60_000);await page.getByTestId('pulsar-rate-1').check();
 const button=page.getByTestId('pulsar-pan-right'),box=(await button.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.clock.runFor(100);await expect(page.getByTestId('pulsar-window-start')).toHaveText('1.000');
 await page.evaluate(()=>{location.hash='observatory';});await expect(page.getByTestId('pulsar-analysis')).toHaveAttribute('data-active','false');await page.clock.runFor(800);await page.mouse.up();await nav(page,'Radio data').click();await page.clock.runFor(500);await expect(page.getByTestId('pulsar-window-start')).toHaveText('1.000');
 await page.getByTestId('pulsar-file').setInputFiles(file('slow-route.plr',TEXT.replace('SYNTHETIC ROUTE','LATE ROUTE')));await expect(page.getByTestId('pulsar-reading')).toBeVisible();await nav(page,'Observatory').click();await page.clock.runFor(800);await nav(page,'Radio data').click();
 await expect(page.getByTestId('pulsar-sha')).toHaveText(digest);await expect(page.getByTestId('pulsar-file-name')).toHaveText('route-control.plr');await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');await expect(page.getByTestId('pulsar-reading')).toHaveCount(0);
});

test('mobile browser back/forward preserves an unconfirmed record draft and restores modal focus; cancel and clear remain reversible',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#observatory');await nav(page,'Radio data').click();await load(page);
 await page.getByTestId('pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('0.500000');await page.getByTestId('pulsar-record').click();await page.getByTestId('pulsar-comment').fill('draft before history');
 await page.goBack();await expect(page.getByTestId('pulsar-analysis')).toBeHidden();await page.goForward();await expect(page.getByTestId('pulsar-record-dialog')).toBeVisible();await expect(page.getByTestId('pulsar-comment')).toHaveValue('draft before history');await expect(page.getByTestId('pulsar-comment')).toBeFocused();
 await page.keyboard.press('Escape');await page.getByTestId('pulsar-record').click();await expect(page.getByTestId('pulsar-comment')).toHaveValue('');await page.getByTestId('pulsar-comment').fill('confirmed mobile');await page.getByTestId('pulsar-record-ok').click();await page.getByTestId('pulsar-clear').click();
 await page.goBack();await page.goForward();await expect(page.getByTestId('pulsar-clear-cancel')).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('integrated-radio-mobile.png'),fullPage:true});
});


// Synthetic saved LSS lines; no acquired observations or native writer witness.
const LSS_HEADER='Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments';
const lss=(name='route-lss.txt',id='ROUTE-A')=>({name,mimeType:'text/plain',buffer:Buffer.from(LSS_HEADER+'\r\n'+id.padEnd(11)+'  4321.5000 13h30m00.0s +29°30\'00" 6000.0 route synthetic\r\n','latin1')});
const rows=(page:Page)=>page.locator('[data-testid^="wedge-row-"]');
async function openWedge(page:Page){await page.goto('/#lss-wedge');await expect(page.getByRole('heading',{level:1,name:'Large-scale structure wedge'})).toBeVisible();await expect(page.getByTestId('wedge-lab')).toBeVisible();}

test('actual LSS data route retains confirmed plot, options, row and source receipt across navigation; reload follows warning',async({page},info)=>{
 await openWedge(page);await page.getByTestId('wedge-file').setInputFiles(lss());await expect(rows(page)).toHaveCount(1);
 await page.getByTestId('wedge-row-0').getByRole('button').click();await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-1').check();await page.getByTestId('wedge-size-3').check();await page.getByTestId('wedge-options-ok').click();
 await expect(page.getByTestId('wedge-persistence')).toContainText('not included in Save investigation');await nav(page,'Radio data').click();await nav(page,'LSS data').click();
 await expect(page.getByRole('heading',{level:1,name:'Large-scale structure wedge'})).toBeFocused();await expect(rows(page)).toHaveCount(1);await expect(page.getByTestId('wedge-details')).toContainText('ROUTE-A');await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','3');
 const download=page.waitForEvent('download');await page.getByTestId('wedge-export').click();const d=await download,csv=await readFile((await d.path())!,'utf8');expect(csv).toContain(createHash('sha256').update(lss().buffer).digest('hex'));expect(csv).toContain(',false,route,plotted,');await expect(page.getByTestId('wedge-details')).toContainText('route synthetic');
 await page.screenshot({path:info.outputPath('integrated-lss-desktop.png'),fullPage:true});await page.reload();await expect(page.getByTestId('wedge-status')).toHaveText('No LSS data loaded.');
});

test('actual LSS navigation cancels late reads, import consent and option drafts without losing confirmed rows',async({page})=>{
 await page.addInitScript(()=>{const original=Blob.prototype.arrayBuffer;const gate:{release?:()=>void}={};(window as unknown as{__routeLss:typeof gate}).__routeLss=gate;Blob.prototype.arrayBuffer=function(this:Blob){if(!(this instanceof File)||!this.name.includes('slow'))return original.call(this);const self=this;return new Promise<ArrayBuffer>(resolve=>{gate.release=()=>{void original.call(self).then(resolve);};});};});
 await openWedge(page);await page.getByTestId('wedge-file').setInputFiles(lss());await expect(rows(page)).toHaveCount(1);
 await page.getByTestId('wedge-file').setInputFiles(lss('slow-route.txt','LATE'));await expect(page.getByTestId('wedge-cancel-read')).toBeVisible();await nav(page,'Observatory').click();
 await page.evaluate(()=>(window as unknown as{__routeLss:{release?:()=>void}}).__routeLss.release?.());await nav(page,'LSS data').click();await expect(rows(page)).toHaveCount(1);await expect(page.getByTestId('wedge-row-0')).toContainText('ROUTE-A');await expect(page.getByTestId('wedge-prompt')).toHaveCount(0);
 await page.getByTestId('wedge-file').setInputFiles(lss('second.txt','ROUTE-B'));await expect(page.getByTestId('wedge-prompt')).toBeVisible();await nav(page,'Observatory').click();await nav(page,'LSS data').click();await expect(page.getByTestId('wedge-prompt')).toHaveCount(0);await expect(rows(page)).toHaveCount(1);
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-size-5').check();await page.evaluate(()=>{location.hash='observatory';});await expect(page.getByTestId('wedge-lab')).toBeHidden();await nav(page,'LSS data').click();await expect(page.getByTestId('wedge-options')).toHaveCount(0);await page.getByTestId('wedge-options-open').click();await expect(page.getByTestId('wedge-size-1')).toBeChecked();await page.keyboard.press('Escape');
});

test('mobile LSS history and keyboard options remain usable and cancel replacement preserves source data',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#observatory');await nav(page,'LSS data').click();await page.getByTestId('wedge-file').setInputFiles(lss());await expect(rows(page)).toHaveCount(1);
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-2').check();await page.getByTestId('wedge-options-ok').click();await page.getByTestId('wedge-options-open').click();await page.keyboard.press('Shift+Tab');await expect(page.getByTestId('wedge-options').locator(':focus')).toHaveCount(1);await page.keyboard.press('Escape');
 await page.goBack();await expect(page.getByTestId('wedge-lab')).toBeHidden();await page.goForward();await expect(rows(page)).toHaveCount(1);
 await page.getByTestId('wedge-file').setInputFiles(lss('replacement.txt','ROUTE-B'));await page.getByTestId('wedge-prompt-no').click();await expect(page.getByTestId('wedge-prompt')).toHaveAttribute('data-stage','confirm-delete');await page.keyboard.press('Escape');await expect(rows(page)).toHaveCount(1);await expect(page.getByTestId('wedge-file')).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('integrated-lss-mobile.png'),fullPage:true});
});


test('all tools remain reachable without document overflow across the navigation breakpoints',async({page},info)=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 for(const width of[1440,1251,1250,780,600,521,520,360,320]){
  await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const name of['Observatory','Radio data','LSS data','Hubble lab guide'])await expect(nav(page,name)).toBeInViewport();
 }
 await expect(page.getByText('Back up spectrum analysis, classification work and pending edits, photometry and current exposure segments. Radio data and LSS plotting workspaces stay only in this open window. Save/restore stops observing activity; restored tools require explicit activation.',{exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('integrated-navigation-320.png'),fullPage:true});
});
