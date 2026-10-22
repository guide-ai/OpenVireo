import{test,expect,type Page}from'@playwright/test';
// Synthetic supplied-file UI controls; no observed sources or acquisition model.
// These inspect DOM focus, viewport and live-region text in Chromium; they are not NVDA/VoiceOver runs.
const url=process.env.OPENVIREO_WEDGE_HARNESS_URL;test.skip(!url,'Requires the standalone wedge harness; integration navigation is verified separately.');const data=Buffer.from('Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments\r\nSYN-FOCUS    4321.5000 13h30m00.0s +29°30\'00" 6000.0 synthetic\r\n','latin1');const f=(name='focus.txt')=>({name,mimeType:'text/plain',buffer:data});
async function gate(page:Page){await page.addInitScript(()=>{const orig=Blob.prototype.arrayBuffer;const g:{on:boolean,release:(()=>void)[]}={on:false,release:[]};(window as unknown as{__fg:typeof g}).__fg=g;Blob.prototype.arrayBuffer=function(this:Blob){if(!g.on)return orig.call(this);const self=this;return new Promise<ArrayBuffer>(resolve=>g.release.push(()=>{void orig.call(self).then(resolve);}));};});await page.goto(url!);await page.getByTestId('wedge-lab').waitFor();}
const arm=(page:Page)=>page.evaluate(()=>(window as unknown as{__fg:{on:boolean}}).__fg.on=true);
const release=(page:Page)=>page.evaluate(()=>(window as unknown as{__fg:{release:(()=>void)[]}}).__fg.release.splice(0).forEach(fn=>fn()));

async function second(page:Page){await gate(page);await page.getByTestId('wedge-file').setInputFiles(f());await expect(page.getByTestId('wedge-row-0')).toBeVisible();await arm(page);await page.getByTestId('wedge-file').setInputFiles(f('second.txt'));await expect(page.getByTestId('wedge-file')).toBeDisabled();}
test('second-read consent respects deliberate panel focus',async({page})=>{await second(page);await page.getByTestId('wedge-scheme').focus();await release(page);await expect(page.getByTestId('wedge-prompt')).toBeVisible();await expect(page.getByTestId('wedge-scheme')).toBeFocused();});
test('second-read consent respects deliberate host focus',async({page})=>{await second(page);await page.evaluate(()=>{const x=document.createElement('button');x.id='host-focus';x.textContent='Host';document.body.prepend(x);x.focus();});await release(page);await expect(page.getByTestId('wedge-prompt')).toBeVisible();await expect(page.locator('#host-focus')).toBeFocused();await expect(page.getByTestId('wedge-status')).toContainText('Retain Current Data?');});
// Weak control (also passed before the moved-viewport guard): kept, but the offscreen case below is the guard.
test('second-read consent never scrolls back up to its button',async({page})=>{await second(page);await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));const y=await page.evaluate(()=>scrollY);expect(y).toBeGreaterThan(0);await release(page);await expect(page.getByTestId('wedge-prompt')).toBeVisible();await expect(page.getByTestId('wedge-prompt-yes')).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBeGreaterThanOrEqual(y-1);});
// Coordinator control (COORDINATOR-final-a11y-triage/ui.spec.ts): fails on both viewports when the `moved` guard is dropped (scroll-mutant.log).
test('moved viewport stays away from an offscreen consent instead of scrolling to focus it',async({page})=>{await second(page);await page.evaluate(()=>{document.documentElement.style.overflowAnchor='none';const filler=document.createElement('div');filler.style.height='4000px';filler.dataset.testid='scroll-fixture';document.body.append(filler);(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,2500);});const y=await page.evaluate(()=>scrollY);expect(y).toBe(2500);await release(page);await expect(page.getByTestId('wedge-prompt')).toBeVisible();await expect(page.getByTestId('wedge-prompt-yes')).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(y);await expect(page.getByTestId('wedge-prompt-yes')).not.toBeInViewport();});
test('a normal second load with lost focus reveals and focuses its consent',async({page})=>{await second(page);await page.evaluate(()=>(document.activeElement as HTMLElement)?.blur());await release(page);await expect(page.getByTestId('wedge-prompt-yes')).toBeFocused();await expect(page.getByTestId('wedge-prompt-yes')).toBeInViewport();});
test('retained focus announces the blocking consent at both stages in the existing live status',async({page})=>{
 await second(page);const status=page.getByTestId('wedge-status'),scheme=page.getByTestId('wedge-scheme');
 await scheme.focus();await release(page);await expect(page.getByTestId('wedge-prompt')).toBeVisible();await expect(scheme).toBeFocused();
 await expect(status).toHaveAttribute('role','status');await expect(status).toHaveAttribute('aria-live','polite');
 await expect(status).toContainText('1 record from 1 file.');await expect(status).toContainText('Retain Current Data?');
 // Scripted activation keeps focus on the select: the second stage is announced without taking it.
 await page.getByTestId('wedge-prompt-no').dispatchEvent('click');await expect(page.getByTestId('wedge-prompt')).toHaveAttribute('data-stage','confirm-delete');
 await expect(status).toContainText('Confirm Deletion!');await expect(status).not.toContainText('Retain Current Data?');await expect(scheme).toBeFocused();
 // Escape from the panel answers No (existing contract: focus then returns to the file input); the announcement goes, data stay.
 await page.keyboard.press('Escape');await expect(page.getByTestId('wedge-prompt')).toHaveCount(0);await expect(page.getByTestId('wedge-file')).toBeFocused();
 await expect(status).toHaveText('1 record from 1 file.');await expect(page.getByTestId('wedge-row-0')).toContainText('SYN-FOCUS');await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(1);
});
// Supersedes 'real options Escape preserves pending consent and restores its enabled default action' (4ec4a74).
// That case reached consent under the aria-modal Options dialog only through setInputFiles on the still-enabled
// input behind the backdrop. The input is now disabled, the background inert and onFile refuses, so that state
// cannot arise; this asserts the refusal while keeping the prior draft, confirmed-data and cancellation checks.
test('Options blocks background imports and keeps its draft, confirmed rows and Escape cancellation',async({page})=>{
 await gate(page);await page.getByTestId('wedge-file').setInputFiles(f());await expect(page.getByTestId('wedge-row-0')).toBeVisible();
 const rings=page.locator('.wedge-text text[data-role="ring-label"]'),file=page.getByTestId('wedge-file'),dialog=page.getByTestId('wedge-options');
 await expect(rings).toHaveText(['4000','8000','12000']);
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-1').check();
 await expect(file).toBeDisabled();await expect(page.getByTestId('wedge-content')).toHaveAttribute('inert','');await expect(dialog).not.toHaveAttribute('inert');
 // Both scripted routes are refused: Playwright's file chooser and a raw change event on the disabled input.
 await file.setInputFiles(f('blocked.txt'));
 await page.evaluate(bytes=>{const input=document.querySelector<HTMLInputElement>('[data-testid="wedge-file"]')!;const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(bytes)],'scripted.txt',{type:'text/plain'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},[...data]);
 await page.waitForTimeout(200);
 await expect(page.getByTestId('wedge-prompt')).toHaveCount(0);await expect(page.getByTestId('wedge-status')).toHaveText('1 record from 1 file.');await expect(page.getByTestId('wedge-notice')).not.toContainText('scripted.txt');
 await expect(dialog).toBeVisible();await expect(page.getByTestId('wedge-grid-1')).toBeChecked();
 await page.getByTestId('wedge-grid-1').focus();await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);await expect(page.getByTestId('wedge-options-open')).toBeFocused();await expect(rings).toHaveText(['4000','8000','12000']);
 await expect(page.getByTestId('wedge-content')).not.toHaveAttribute('inert');await expect(file).toBeEnabled();await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(1);
 // After Options closes, a real second load asks again and Escape cancels without deleting.
 await file.focus();await file.setInputFiles(f('second.txt'));await expect(page.getByTestId('wedge-prompt')).toBeVisible();await expect(page.getByTestId('wedge-prompt-yes')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByTestId('wedge-prompt')).toHaveCount(0);await expect(page.getByTestId('wedge-row-0')).toBeVisible();await expect(page.locator('[data-testid^="wedge-row-"]')).toHaveCount(1);
 await expect(page.getByTestId('wedge-notice')).toHaveAttribute('data-cause','cancel');
});
