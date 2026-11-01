import {test,expect} from '@playwright/test';

// Front WebKit QA (2026-10-31, cause 1): WebKit ignores focus() on an element made visible in the same task unless its layout is
// read first. The app installs src/focusAfterLayout.ts in WebKit, so in every engine a dialog's field and a just-shown button take
// focus in the same task as showModal() or the change that shows them. The unpatched focus() is kept on the prototype, and the test also
// records what it does in each engine.
test('focus() lands on a field of a dialog opened in the same task and on a just-shown button, in every engine',async({page,browserName})=>{
 await page.goto('/');await expect(page.locator('h1').first()).toBeVisible();
 const r=await page.evaluate(()=>{
  const original=(HTMLElement.prototype as unknown as Record<symbol,unknown>)[Symbol.for('openvireo.focusAfterLayout.original')] as ((this:HTMLElement)=>void)|undefined;
  const run=(focus:(el:HTMLElement)=>void)=>{
   const dialog=document.createElement('dialog'),input=document.createElement('input');dialog.append(input);document.body.append(dialog);
   const box=document.createElement('div'),button=document.createElement('button');box.hidden=true;button.textContent='OK';box.append(button);document.body.append(box);
   dialog.showModal();focus(input);const inDialog=document.activeElement===input;dialog.close();
   box.hidden=false;focus(button);const shown=document.activeElement===button;
   dialog.remove();box.remove();return {inDialog,shown};
  };
  return {installed:typeof original==='function',patched:run(el=>el.focus()),unpatched:original?run(el=>original.call(el)):null};
 });
 // Installed in WebKit only (navigator.vendor 'Apple…'); Chromium and Firefox keep their native focus().
 expect(r.installed).toBe(browserName==='webkit');
 expect(r.patched).toEqual({inDialog:true,shown:true});
 test.info().annotations.push({type:'unpatched focus()',description:`${browserName}: ${JSON.stringify(r.unpatched)}`});
 // Review L3: radio rings follow the input modality, so a mouse click shows none and arrow keys show one in every engine.
 const modality=()=>page.evaluate(()=>document.documentElement.dataset.inputModality);
 await page.mouse.click(5,5);expect(await modality()).toBe('pointer');
 await page.keyboard.press('Tab');expect(await modality()).toBe('keyboard');
 await page.mouse.click(5,5);expect(await modality()).toBe('pointer');
});
