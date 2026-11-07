import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Front PHCALLBACK (data/photometry/callback-count-contract.json; analysis/front-phcallback/RECOVERY.md): VIREO's photometer period
// ends when the Extended elapsed sum of Timer/1000 (0x500a01, 0x5014ea) reaches the chosen seconds (0x5015cb); with the compiled
// 100 ms a 100 s period takes 1001 callbacks. New sessions record 'callbackCount' (owner 18); an earlier history keeps 1000.
async function open(page:Page){await page.clock.install();await page.goto('/#photometer');await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));}
async function save(page:Page){const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save photometer session',exact:true}).click();return readFile((await(await d).path())!);}
const id=(page:Page,testId:string)=>page.getByTestId(testId);

test('a new 100 s reading takes VIREO\'s 1001 callbacks (100.1 s), saves as owner 18 and replays; an earlier session keeps 1000, labelled',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();
 await page.getByLabel('Seconds per integration',{exact:true}).selectOption('100');await page.getByLabel('Number of integrations',{exact:true}).selectOption('1');
 await page.getByRole('button',{name:'Start integration',exact:true}).click();
 await page.clock.runFor(100000);
 await expect(id(page,'photo-series-callbacks')).toHaveText('1000 / 1001');await expect(id(page,'photo-series-time')).toHaveText('100 s');await expect(id(page,'photo-phase')).not.toHaveText('Integration complete');
 await page.clock.runFor(100);
 await expect(id(page,'photo-phase')).toHaveText('Integration complete');await expect(id(page,'photo-series-callbacks')).toHaveText('1001 / 1001');
 await expect(id(page,'photo-series-time')).toHaveText('100.1 s');await expect(id(page,'photo-series-periods')).toHaveText('1 / 1');await expect(id(page,'photo-legacy-count')).toHaveCount(0);
 const counts=await id(page,'photo-counts').textContent();
 const bytes=await save(page),raw=JSON.parse(bytes.toString());
 expect(raw.version).toBe(18);expect(raw.policy).toBe('OpenVireo-photometer-x87-callback-count-v18');expect(raw.callbackCountContractSHA256).toMatch(/^[0-9a-f]{64}$/);
 const types=raw.events.map((e:{type:string})=>e.type);expect(types[types.indexOf('callbackCount')+1]).toBe('start');
 expect(raw.events.filter((e:{type:string})=>e.type==='advance').map((e:{callbacks:number})=>e.callbacks)).toEqual([1001]);
 await page.locator('.photometer-series').screenshot({path:'test-results/photometer-callback-count.png'});
 await page.clock.resume();await page.reload();await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 await page.getByLabel('Restore photometer session',{exact:true}).setInputFiles({name:'owner18.json',mimeType:'application/json',buffer:bytes});
 await expect(id(page,'photo-counts')).toHaveText(counts!);await expect(id(page,'photo-series-callbacks')).toHaveText('1001 / 1001');expect(await save(page)).toEqual(bytes);

 // The same history as an owner 4 file (no 'callbackCount'), as the web wrote it before: the nominal 1000 callbacks.
 const header=['format','numericalPolicy','fieldSnapshotSHA256','ubvContractSHA256','targetFieldsSHA256','integrationContractSHA256'];
 const legacy={format:raw.format,version:4,policy:'OpenVireo-Pleiades-timed-observing-v4',...Object.fromEntries(header.slice(1).map(k=>[k,raw[k]])),seedAtStart:raw.seedAtStart,
  events:raw.events.filter((e:{type:string})=>e.type!=='callbackCount').map((e:{type:string})=>e.type==='advance'?{type:'advance',callbacks:1000}:e)};
 const legacyText=JSON.stringify(legacy,null,2)+'\n';
 await page.getByLabel('Restore photometer session',{exact:true}).setInputFiles({name:'owner4.json',mimeType:'application/json',buffer:Buffer.from(legacyText)});
 await expect(id(page,'photo-series-callbacks')).toHaveText('1000 / 1000');await expect(id(page,'photo-series-time')).toHaveText('100 s');
 await expect(id(page,'photo-legacy-count')).toContainText('nominal 1000 callbacks');await expect(id(page,'photo-legacy-count')).toContainText('takes 1001');
 await page.locator('.photometer-series').screenshot({path:'test-results/photometer-callback-count-legacy.png'});
 expect((await save(page)).toString()).toBe(legacyText);
 expect(errors).toEqual([]);
});
