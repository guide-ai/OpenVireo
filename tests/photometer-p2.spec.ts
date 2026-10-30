import{test,expect,type Page}from'@playwright/test';
import{readFile}from'node:fs/promises';
// Front P2: apertures 5..150 (slider, number field, Default, PageUp), the R and I filters, and their owner 13/14 sessions.
async function open(page:Page){await page.clock.install();await page.goto('/#photometer');await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();}
async function run(page:Page,ms=100){await page.getByRole('button',{name:'Start integration',exact:true}).click();await page.clock.runFor(ms);await expect(page.getByTestId('photo-phase')).toHaveText('Integration complete');}
async function save(page:Page){const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save photometer session',exact:true}).click();return readFile((await(await d).path())!);}

test('size 150 through the slider and number field, an R reading at it, and an owner-14 session that restores exactly',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 await page.getByRole('button',{name:'Change aperture',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Photometer aperture',exact:true}),size=dialog.getByLabel('Aperture size',{exact:true}),slider=dialog.getByLabel('Aperture size slider',{exact:true});
 await expect(size).toHaveValue('10');
 await slider.focus();await page.keyboard.press('PageUp');await expect(size).toHaveValue('20');
 await size.fill('151');await expect(dialog.getByTestId('photo-aperture-draft')).toHaveText('Enter a whole size from 5 to 150.');await expect(dialog.getByRole('button',{name:'Apply aperture',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Default size 10',exact:true}).click();await expect(size).toHaveValue('10');
 await size.fill('150');await expect(dialog.getByTestId('photo-aperture-draft')).toHaveText('Size 150 · diameter 0.965 arcmin');
 await dialog.getByRole('button',{name:'Apply aperture',exact:true}).click();await expect(page.getByTestId('photo-aperture')).toContainText('Size 150');
 await page.getByLabel('Photometer filter',{exact:true}).selectOption('R');
 await expect(page.getByLabel('Photometer filter',{exact:true}).locator('option')).toHaveText(['U','B','V','R','I']);
 await run(page);await expect(page.getByTestId('photo-sky-origin')).toContainText('aperture size 150');
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');await run(page);
 expect(Number(await page.getByTestId('photo-counts').innerText())).toBeGreaterThan(0);await expect(page.getByTestId('photo-magnitude')).not.toHaveText('—');
 const raw=await save(page);const wire=JSON.parse(raw.toString());expect(wire.version).toBe(14);expect(wire.riContractSHA256).toMatch(/^[0-9a-f]{64}$/);expect(wire.apertureDomainContractSHA256).toMatch(/^[0-9a-f]{64}$/);
 expect(wire.events).toContainEqual({type:'aperture',selector:150});expect(wire.events).toContainEqual({type:'filter',filter:'R'});
 await page.getByLabel('Restore photometer session',{exact:true}).setInputFiles({name:'p2.json',mimeType:'application/json',buffer:raw});
 await expect(page.getByTestId('photo-aperture')).toContainText('Size 150');expect(await save(page)).toEqual(raw);
 expect(errors).toEqual([]);
});

test('at 360 px the aperture dialog fits and Escape keeps the size',async({page})=>{
 await page.setViewportSize({width:360,height:780});await page.emulateMedia({colorScheme:'dark'});await open(page);
 await page.getByRole('button',{name:'Change aperture',exact:true}).click();
 await page.getByLabel('Aperture size',{exact:true}).fill('75');await page.screenshot({path:'test-results/photometer-p2-aperture-mobile.png'});
 const box=await page.getByRole('dialog',{name:'Photometer aperture',exact:true}).boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(360);
 await page.keyboard.press('Escape');await expect(page.getByTestId('photo-aperture')).toContainText('Size 10');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
