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
