import {test,expect,type Page}from '@playwright/test';
import {readFile}from 'node:fs/promises';
async function activate(page:Page){await page.getByRole('button',{name:'Activate supported star field',exact:true}).click();await expect(page.getByTestId('star-phase')).toHaveText('Ready / paused');}
async function start(page:Page){await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Start star exposure',exact:true}).click();await expect(page.getByTestId('star-phase')).toHaveText('Exposing');}
async function acquire(page:Page){await page.clock.install();await page.goto('/#spectrometer');await page.getByRole('link',{name:'Open supported star exposure',exact:true}).click();await expect(page.getByRole('heading',{name:'Catalog star exposure',exact:true})).toBeVisible();await activate(page);}

test('the student saves the acquired star spectrum as SSP with the recovered writer and prints only that spectrum',async({page})=>{
 await acquire(page);
 const panel=page.getByTestId('ob-spectrum-save'),save=panel.getByRole('button',{name:'Save spectrum (.SSP)',exact:true}),print=panel.getByRole('button',{name:'Print spectrum',exact:true});
 await expect(save).toBeDisabled();await start(page);await expect(save).toBeDisabled();
 await page.clock.runFor(1000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();await expect(page.getByTestId('star-elapsed')).toHaveText('1000 ms');
 await expect(save).toBeEnabled();
 const event=page.waitForEvent('download');await save.click();const download=await event;
 expect(download.suggestedFilename()).toMatch(/^openvireo-star-.*\.ssp$/);
 const bytes=await readFile((await download.path())!),text=bytes.toString('latin1'),lines=text.split('\r\n');
 expect(text.startsWith('*SpHdr* ')).toBe(true);expect(lines.filter(Boolean)).toHaveLength(601);
 expect(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(text)).toBe(true);
 await expect(panel.getByRole('status')).toContainText('Spectrum saved as');
 // Repeat saves of the same paused exposure are byte-identical (starSpectrumBytes, no re-normalization).
 const again=page.waitForEvent('download');await save.click();expect(await readFile((await (await again).path())!)).toEqual(bytes);
 await page.evaluate(()=>{(window as unknown as {printed:number}).printed=0;window.print=()=>{(window as unknown as {printed:number}).printed++;};});
 await print.click();
 expect(await page.evaluate(()=>(window as unknown as {printed:number}).printed)).toBe(1);
 await expect(page.locator('html')).toHaveAttribute('data-print-scope','star-spectrum');
 await page.emulateMedia({media:'print'});
 await expect(page.getByTestId('ob-spectrum-print')).toBeVisible();await expect(page.getByRole('heading',{name:'Catalog star exposure',exact:true})).toBeHidden();
 await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
 await expect(page.locator('html')).not.toHaveAttribute('data-print-scope','star-spectrum');
 await expect(page.getByTestId('ob-spectrum-print')).toBeHidden();
});

test('save and print stay usable at 320px',async({page})=>{
 await page.setViewportSize({width:320,height:760});await acquire(page);await start(page);await page.clock.runFor(500);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 const panel=page.getByTestId('ob-spectrum-save');await panel.scrollIntoViewIfNeeded();
 await expect(panel.getByRole('button',{name:'Save spectrum (.SSP)',exact:true})).toBeEnabled();
 const box=await panel.boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(320);
});
