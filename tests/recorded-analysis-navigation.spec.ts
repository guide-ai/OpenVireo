import{test,expect,type Page}from'@playwright/test';
import{createHash}from'node:crypto';
import{readFile}from'node:fs/promises';
// Synthetic format/control vector. No original recording, acquisition or writer witness.
const TEXT=["'SYNTHETIC ROUTE',40,1",'430,1420,0','1,2,1','50000.125,0.5',...Array.from({length:120},(_,i)=>`${i%20},10,0`)].join('\r\n')+'\r\n';
const file=(name='route-control.plr',text=TEXT)=>({name,mimeType:'application/octet-stream',buffer:Buffer.from(text,'ascii')});
const digest=createHash('sha256').update(TEXT,'ascii').digest('hex');
const nav=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});
const HEADER_TOOLS=['Observatory','Spectrometer','Spectrum analyzer','Sky exposure','Star exposure','Galaxy exposure','Stellar classification','Pleiades photometry','Cluster database','Radio data','LSS data','Saved images','Hubble lab guide'];
const TOOLBAR_HELP='Back up supported spectrum/Hubble and classification work, pending edits, photometry, exposure segments, cluster database/comparison/selection, and optical/observatory context. This is not a backup of every tool or view setting. For example, imported program lists, other-source width results, saved-text inspection, native-list receipts, FITS images, observation HR, Radio and LSS remain separate; follow each tool\'s persistence and export notice. Save/restore stops observing activity; restored observing tools require activation.';
const PLR_LATE='An earlier read finished after it was replaced or cancelled, and was ignored.';
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
 // The held read cannot resolve before runFor: the paused fake clock owns its 700 ms timer.
 await page.getByTestId('pulsar-file').setInputFiles(file('slow-route.plr',TEXT.replace('SYNTHETIC ROUTE','LATE ROUTE')));await expect(page.getByTestId('pulsar-reading')).toBeVisible();await nav(page,'Observatory').click();
 await expect(page.getByTestId('pulsar-status')).toHaveText('Reading cancelled. The current analysis is unchanged.');
 await page.clock.runFor(800);
 // Observes at least one of the two discard guards for a valid stale file; the separate invalid-file case isolates the earlier guard.
 await expect(page.getByTestId('pulsar-status')).toHaveText(PLR_LATE);await nav(page,'Radio data').click();
 await expect(page.getByTestId('pulsar-sha')).toHaveText(digest);await expect(page.getByTestId('pulsar-file-name')).toHaveText('route-control.plr');await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');await expect(page.getByTestId('pulsar-reading')).toHaveCount(0);await expect(page.getByTestId('pulsar-status')).toHaveText(PLR_LATE);
});

test('an invalid stale Radio file is discarded before admission can replace errors or confirmed work',async({page})=>{
 await page.addInitScript(()=>{const original=Blob.prototype.arrayBuffer;Blob.prototype.arrayBuffer=function(this:Blob){return this instanceof File&&this.name==='invalid-slow.plr'?new Promise<ArrayBuffer>(resolve=>setTimeout(()=>resolve(original.call(this)),700)):original.call(this);};});
 await open(page);await load(page);await record(page,'kept before invalid late input');await page.clock.install();await page.clock.pauseAt(Date.now()+60_000);
 await page.getByTestId('pulsar-file').setInputFiles(file('invalid-slow.plr','not a recording'));await expect(page.getByTestId('pulsar-reading')).toBeVisible();await nav(page,'Observatory').click();
 await expect(page.getByTestId('pulsar-status')).toHaveText('Reading cancelled. The current analysis is unchanged.');await page.clock.runFor(800);await expect(page.getByTestId('pulsar-status')).toHaveText(PLR_LATE);
 await nav(page,'Radio data').click();await expect(page.getByTestId('pulsar-sha')).toHaveText(digest);await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');await expect(page.getByTestId('pulsar-rejection')).toHaveCount(0);
});

test('mobile browser back/forward preserves an unconfirmed record draft and restores modal focus; cancel and clear remain reversible',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#observatory');await nav(page,'Radio data').click();await load(page);
 await page.getByTestId('pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(page.getByTestId('pulsar-vertical-value-1')).toHaveText('0.500000');await page.getByTestId('pulsar-record').click();await page.getByTestId('pulsar-comment').fill('draft before history');
 await page.goBack();await expect(page.getByTestId('pulsar-analysis')).toBeHidden();await page.goForward();await expect(page.getByTestId('pulsar-record-dialog')).toBeVisible();await expect(page.getByTestId('pulsar-comment')).toHaveValue('draft before history');await expect(page.getByTestId('pulsar-comment')).toBeFocused();
 await expect(page.locator('dialog:modal')).toHaveCount(1);await expect(page.getByRole('heading',{level:1,name:'Recorded pulsar analysis',includeHidden:true})).not.toBeFocused();
 await page.keyboard.press('Escape');await page.getByTestId('pulsar-record').click();await expect(page.getByTestId('pulsar-comment')).toHaveValue('');await page.getByTestId('pulsar-comment').fill('confirmed mobile');await page.getByTestId('pulsar-record-ok').click();await page.getByTestId('pulsar-clear').click();
 await page.goBack();await page.goForward();await expect(page.getByTestId('pulsar-clear-cancel')).toBeFocused();await expect(page.locator('dialog:modal')).toHaveCount(1);await page.keyboard.press('Enter');await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('integrated-radio-mobile.png'),fullPage:true});
});

test('desktop Radio history return leaves focus with the reopened native dialog and focuses the route heading without one',async({page},info)=>{
 await open(page);await load(page);await record(page,'confirmed desktop');
 await nav(page,'Observatory').click();await nav(page,'Radio data').click();await expect(page.locator('dialog:modal')).toHaveCount(0);await expect(page.getByRole('heading',{level:1,name:'Recorded pulsar analysis'})).toBeFocused();
 await page.getByTestId('pulsar-clear').click();await expect(page.getByTestId('pulsar-clear-cancel')).toBeVisible();
 await page.goBack();await expect(page.getByTestId('pulsar-analysis')).toBeHidden();await expect(page.locator('dialog:modal')).toHaveCount(0);
 await page.goForward();await expect(page.getByTestId('pulsar-clear-cancel')).toBeFocused();await expect(page.locator('dialog:modal')).toHaveCount(1);
 expect(await page.evaluate(()=>document.activeElement?.tagName)).not.toBe('H1');
 await page.screenshot({path:info.outputPath('radio-history-clear-desktop.png'),fullPage:true});
 await page.keyboard.press('Enter');await expect(page.locator('dialog:modal')).toHaveCount(0);await expect(page.getByTestId('pulsar-count')).toHaveText('1 recorded measurements');
});


// Synthetic saved LSS lines; no acquired observations or native writer witness.
const LSS_HEADER='Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments';
const lss=(name='route-lss.txt',id='ROUTE-A')=>({name,mimeType:'text/plain',buffer:Buffer.from(LSS_HEADER+'\r\n'+id.padEnd(11)+'  4321.5000 13h30m00.0s +29°30\'00" 6000.0 route synthetic\r\n','latin1')});
const rows=(page:Page)=>page.locator('[data-testid^="wedge-row-"]');
async function openWedge(page:Page){await page.goto('/#lss-wedge');await expect(page.getByRole('heading',{level:1,name:'Large-scale structure wedge'})).toBeVisible();await expect(page.getByTestId('wedge-lab')).toBeVisible();}
type Gate={started:number;digests:number;release?:()=>Promise<void>};
/** Test-only page instrumentation (no product telemetry): reads of files named *slow* are held until
 * release(). release() resolves the held buffer and then acknowledges settlement: the reader's own reaction
 * was registered first, so the acknowledgment runs after its continuation; any SHA-256 digest that
 * continuation started is awaited, then the microtask queue, one scheduler message and one frame drain. */
async function holdSlowReads(page:Page){
 await page.addInitScript(()=>{
  const gate:Gate={started:0,digests:0};(window as unknown as{__routeLss:Gate}).__routeLss=gate;
  const subtle=crypto.subtle,digest=subtle.digest.bind(subtle),pending=new Set<Promise<unknown>>();
  subtle.digest=((...args:Parameters<SubtleCrypto['digest']>)=>{gate.digests++;const p=digest(...args);pending.add(p);void p.finally(()=>pending.delete(p));return p;}) as SubtleCrypto['digest'];
  const original=Blob.prototype.arrayBuffer;
  Blob.prototype.arrayBuffer=function(this:Blob){
   if(!(this instanceof File)||!this.name.includes('slow'))return original.call(this);
   const self=this;gate.started++;let resolve!:(b:ArrayBuffer)=>void;const held=new Promise<ArrayBuffer>(r=>{resolve=r;});
   gate.release=async()=>{resolve(await original.call(self));await held.then(()=>undefined);while(pending.size)await Promise.allSettled([...pending]);
    await new Promise(r=>setTimeout(r,0));await new Promise(r=>{const c=new MessageChannel();c.port1.onmessage=()=>r(undefined);c.port2.postMessage(0);});await new Promise(r=>requestAnimationFrame(()=>r(undefined)));};
   return held;
  };
 });
}
const gate=(page:Page)=>page.evaluate(()=>{const g=(window as unknown as{__routeLss:Gate}).__routeLss;return{started:g.started,digests:g.digests};});
const releaseHeld=(page:Page)=>page.evaluate(()=>(window as unknown as{__routeLss:Gate}).__routeLss.release!());
// Immediate (non-retrying) DOM reads, meaningful only after releaseHeld() acknowledged settlement.
const now=(page:Page)=>page.evaluate(()=>{const notice=document.querySelector<HTMLElement>('[data-testid="wedge-notice"]');return{rows:document.querySelectorAll('[data-testid^="wedge-row-"]').length,prompt:document.querySelectorAll('[data-testid="wedge-prompt"]').length,status:document.querySelector('[data-testid="wedge-status"]')?.textContent??'',notice:notice?`${notice.dataset.kind}/${notice.dataset.cause}`:null,noticeText:notice?.textContent??''};});
const SUSPENDED='Loading slow-route.txt stopped because this panel became inactive';

test('actual LSS data route retains confirmed plot, options, row and source receipt across navigation; reload follows warning',async({page},info)=>{
 await openWedge(page);await page.getByTestId('wedge-file').setInputFiles(lss());await expect(rows(page)).toHaveCount(1);
 await page.getByTestId('wedge-row-0').getByRole('button').click();await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-1').check();await page.getByTestId('wedge-size-3').check();await page.getByTestId('wedge-options-ok').click();
 await expect(page.getByTestId('wedge-persistence')).toContainText('not included in Save investigation');await nav(page,'Radio data').click();await nav(page,'LSS data').click();
 await expect(page.getByRole('heading',{level:1,name:'Large-scale structure wedge'})).toBeFocused();await expect(rows(page)).toHaveCount(1);await expect(page.getByTestId('wedge-details')).toContainText('ROUTE-A');await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','3');
 const download=page.waitForEvent('download');await page.getByTestId('wedge-export').click();const d=await download,csv=await readFile((await d.path())!,'utf8');expect(csv).toContain(createHash('sha256').update(lss().buffer).digest('hex'));expect(csv).toContain(',false,route,plotted,');await expect(page.getByTestId('wedge-details')).toContainText('route synthetic');
 await page.screenshot({path:info.outputPath('integrated-lss-desktop.png'),fullPage:true});await page.reload();await expect(page.getByTestId('wedge-status')).toHaveText('No LSS data loaded.');
});

test('positive control: a held LSS read released on the active route reaches consent by settlement acknowledgment',async({page})=>{
 await holdSlowReads(page);await openWedge(page);await page.getByTestId('wedge-file').setInputFiles(lss());await expect(rows(page)).toHaveCount(1);
 await page.getByTestId('wedge-file').setInputFiles(lss('slow-active.txt','ACTIVE'));await expect(page.getByTestId('wedge-cancel-read')).toBeVisible();expect((await gate(page)).started).toBe(1);
 const before=(await gate(page)).digests;await releaseHeld(page);
 // No retry: the acknowledgment alone must be enough to observe a completed late read.
 const seen=await now(page);expect(seen.prompt).toBe(1);expect(seen.rows).toBe(1);expect((await gate(page)).digests).toBe(before+1);
 await page.getByTestId('wedge-prompt-cancel').click();await expect(page.getByTestId('wedge-prompt')).toHaveCount(0);await expect(rows(page)).toHaveCount(1);await expect(page.getByTestId('wedge-row-0')).toContainText('ROUTE-A');
});

test('actual LSS navigation cancels late reads, import consent and option drafts without losing confirmed rows',async({page},info)=>{
 await holdSlowReads(page);await openWedge(page);await page.getByTestId('wedge-file').setInputFiles(lss());await expect(rows(page)).toHaveCount(1);
 await page.getByTestId('wedge-file').setInputFiles(lss('slow-route.txt','LATE'));await expect(page.getByTestId('wedge-cancel-read')).toBeVisible();expect((await gate(page)).started).toBe(1);
 await nav(page,'Observatory').click();await expect(page.getByTestId('wedge-lab')).toBeHidden();
 await expect(page.getByTestId('wedge-notice')).toHaveAttribute('data-cause','suspended');await expect(page.getByTestId('wedge-notice')).toContainText(SUSPENDED);
 const before=(await gate(page)).digests;await releaseHeld(page);
 const hidden=await now(page);expect(hidden).toMatchObject({prompt:0,rows:1,status:'1 record from 1 file.',notice:'not-loaded/suspended'});expect(hidden.noticeText).toContain(SUSPENDED);
 // Coverage label only: whether the abort stopped the released read before hashing. The state checks decide pass/fail.
 info.annotations.push({type:'late-read-path',description:(await gate(page)).digests===before?'aborted before hashing':'hashed after release (abort did not stop it)'});
 // A discrete click commits synchronously, so a stale pending consent would already render here.
 await nav(page,'LSS data').click();const shown=await now(page);expect(shown).toMatchObject({prompt:0,rows:1,status:'1 record from 1 file.',notice:'not-loaded/suspended'});
 await expect(page.getByTestId('wedge-row-0')).toContainText('ROUTE-A');
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

const header=(page:Page)=>page.locator('.portal-header'),toolbar=(page:Page)=>page.locator('.investigation-toolbar');
const save=(page:Page)=>toolbar(page).locator('.sky-actions button').first();
async function draftOptions(page:Page){await openWedge(page);await page.getByTestId('wedge-file').setInputFiles(lss());await expect(rows(page)).toHaveCount(1);await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-size-4').check();await expect(page.getByTestId('wedge-options')).toBeVisible();}
async function hostReleased(page:Page){await expect(header(page)).not.toHaveAttribute('inert');await expect(toolbar(page)).not.toHaveAttribute('inert');await expect(nav(page,'Observatory')).toBeEnabled();}

test('LSS Options: actual pointer clicks on header and toolbar hit the existing backdrop and keep the draft',async({page})=>{
 await draftOptions(page);
 for(const target of[nav(page,'Observatory'),nav(page,'Hubble lab guide'),save(page),page.locator('.portal-brand')]){
  const box=(await target.boundingBox())!;const x=box.x+box.width/2,y=box.y+box.height/2;
  expect(await page.evaluate(([x,y])=>document.elementFromPoint(x,y)?.className,[x,y] as const)).toBe('wedge-modal-backdrop');
  await page.mouse.click(x,y);
 }
 await expect(page.getByTestId('wedge-options')).toBeVisible();await expect(page.getByTestId('wedge-size-4')).toBeChecked();expect(new URL(page.url()).hash).toBe('#lss-wedge');
 await expect(toolbar(page).locator('[role="status"],[role="alert"]')).toHaveCount(0);await expect(page.locator('dialog[open]')).toHaveCount(0);
 await page.getByTestId('wedge-options-cancel').click();await expect(page.getByTestId('wedge-options')).toHaveCount(0);await hostReleased(page);await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','1');
});

test('LSS Options makes only the App header and investigation toolbar inert; Escape releases them and keeps committed options',async({page},info)=>{
 await draftOptions(page);
 // Behaviour first. Base 0066e30 accepted programmatic focus on toolbar Save, and Enter then saved and dropped the draft.
 // Programmatic focus (as an assistive tool or script would request) cannot land on host controls.
 const focusable=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('.portal-header a,.portal-header button,.investigation-toolbar button,.investigation-toolbar input')].map(el=>{el.focus();return document.activeElement===el;}));
 expect(focusable.length).toBeGreaterThan(14);expect(focusable.every(f=>!f)).toBe(true);
 await page.keyboard.press('Enter');await expect(page.getByTestId('wedge-size-4')).toBeChecked();await expect(page.getByTestId('wedge-size-4')).toBeFocused();await expect(toolbar(page).locator('[role="status"]')).toHaveCount(0);
 // Chromium accessibility tree (DevTools protocol): host controls are ignored, the dialog's are exposed. Not an NVDA/VoiceOver run.
 const ax=await page.context().newCDPSession(page);const exposed=async()=>{const{nodes}=await ax.send('Accessibility.getFullAXTree') as {nodes:{ignored:boolean;name?:{value?:string}}[]};return new Set(nodes.filter(n=>!n.ignored).map(n=>n.name?.value));};
 let names=await exposed();for(const name of['Save investigation','Observatory','Hubble lab guide'])expect(names.has(name),name).toBe(false);expect(names.has('OK')).toBe(true);
 await expect(header(page)).toHaveAttribute('inert','');await expect(toolbar(page)).toHaveAttribute('inert','');
 await expect(page.getByTestId('wedge-content')).toHaveAttribute('inert','');await expect(page.getByRole('heading',{level:1,name:'Large-scale structure wedge'})).not.toHaveAttribute('inert');
 await page.screenshot({path:info.outputPath('lss-options-host-inert-desktop.png'),fullPage:false});
 await page.getByTestId('wedge-size-4').focus();await page.keyboard.press('Escape');
 await expect(page.getByTestId('wedge-options')).toHaveCount(0);await hostReleased(page);await expect(page.getByTestId('wedge-options-open')).toBeFocused();
 await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','1');await expect(rows(page)).toHaveCount(1);
 names=await exposed();for(const name of['Save investigation','Observatory','Hubble lab guide'])expect(names.has(name),name).toBe(true);
 await save(page).focus();await expect(save(page)).toBeFocused();
});

test('LSS Options: Tab and Shift+Tab stay inside the dialog; OK commits and releases the host',async({page})=>{
 await draftOptions(page);
 const where=()=>page.evaluate(()=>{const a=document.activeElement;return a?.closest('[data-testid="wedge-options"]')?'dialog':a?.closest('.portal-header,.investigation-toolbar')?'host':'other';});
 for(const key of['Tab','Shift+Tab'])for(let i=0;i<9;i++){await page.keyboard.press(key);expect(await where()).toBe('dialog');}
 await page.getByTestId('wedge-options-ok').click();await expect(page.getByTestId('wedge-options')).toHaveCount(0);await hostReleased(page);
 await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','4');await expect(rows(page)).toHaveCount(1);
});

test('LSS Options: programmatic history while open still cancels the draft explicitly and releases the host',async({page})=>{
 await draftOptions(page);await expect(header(page)).toHaveAttribute('inert','');
 await page.evaluate(()=>{location.hash='observatory';});await expect(page.getByTestId('wedge-lab')).toBeHidden();await hostReleased(page);
 await expect(page.getByRole('heading',{level:1,name:'Start with the sky.'})).toBeFocused();
 await page.goBack();await expect(page.getByTestId('wedge-lab')).toBeVisible();await expect(page.getByTestId('wedge-options')).toHaveCount(0);await hostReleased(page);
 await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','1');await expect(rows(page)).toHaveCount(1);
 await page.getByTestId('wedge-options-open').click();await expect(page.getByTestId('wedge-size-1')).toBeChecked();await expect(header(page)).toHaveAttribute('inert','');
 await page.getByTestId('wedge-options-cancel').click();await hostReleased(page);
});

test('mobile LSS Options keeps the host inert until Escape and preserves source rows',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await draftOptions(page);
 await expect(header(page)).toHaveAttribute('inert','');await expect(toolbar(page)).toHaveAttribute('inert','');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('lss-options-host-inert-mobile.png'),fullPage:false});
 await page.keyboard.press('Escape');await hostReleased(page);await expect(page.getByTestId('wedge-options-open')).toBeFocused();await expect(rows(page)).toHaveCount(1);await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','1');
});


test('all tools remain reachable without document overflow across the navigation breakpoints',async({page},info)=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 const buttons=page.locator('.portal-header nav button');await expect(buttons).toHaveText(HEADER_TOOLS);
 for(const width of[1440,1251,1250,780,600,521,520,360,320]){
  await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const name of HEADER_TOOLS){
   const button=nav(page,name);await expect(button,`${name} at ${width}px`).toBeInViewport({ratio:1});
   const box=(await button.boundingBox())!;
   expect(await page.evaluate(([x,y,name])=>{const hit=document.elementFromPoint(x,y);return hit?.closest('button')?.textContent===name;},[box.x+box.width/2,box.y+box.height/2,name] as const),`${name} hit-test at ${width}px`).toBe(true);
  }
 }
 await page.screenshot({path:info.outputPath('integrated-navigation-320.png'),fullPage:true});
});

test('toolbar backup caveat and temporary lab examples match visible persistence notices',async({page},info)=>{
 await page.goto('/#observatory');await expect(toolbar(page).getByText(TOOLBAR_HELP,{exact:true})).toBeVisible();
 // Four lab examples have their own visible notices. Other temporary scopes are covered by classification-program-import,classification-range,selected-source-width,native-text-results,native-result-list and native-result-clear-load specs; this is not a serialization test.
 await nav(page,'Saved images').click();await expect(page.getByText('Investigation and notebook files do not include this temporary image.',{exact:false})).toBeVisible();
 await nav(page,'Cluster database').click();await page.getByText('HR diagram from saved observations').click();await expect(page.getByText('This observation HR workspace is separate from Save investigation.',{exact:false})).toBeVisible();
 await nav(page,'Radio data').click();await load(page);await expect(page.getByTestId('pulsar-persistence')).toContainText('not part of Save investigation');
 await nav(page,'LSS data').click();await expect(page.getByTestId('wedge-persistence')).toContainText('not included in Save investigation');
 await page.setViewportSize({width:390,height:844});await expect(toolbar(page).getByText(TOOLBAR_HELP,{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await toolbar(page).screenshot({path:info.outputPath('toolbar-scope-mobile.png')});
});
