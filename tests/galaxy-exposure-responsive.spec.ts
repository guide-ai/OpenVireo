import {test,expect} from '@playwright/test';
// Review 2 finding 1: opening Galaxy exposure must not block the page, and an engine target (Coma – 1) is prepared off the main
// thread only when it is selected. Long tasks are read from the browser's own Long Tasks API after the app has loaded.
// Bound: 300 ms. Measured longest task when selecting the Coma target: 114–142 ms on an idle machine, up to 265 ms while other
// processes kept the load average near 28. One synchronous field preparation alone takes about 500 ms (the earlier synchronous
// path blocked for about 10.6 s), so the bound still catches any preparation on the main thread.
const BOUND_MS=300;
test('first Galaxy exposure visit and selecting an engine target keep every long task under 300 ms',async({page})=>{
 test.setTimeout(120_000);
 await page.addInitScript(()=>{const w=window as unknown as {__long:number[]};w.__long=[];new PerformanceObserver(l=>{for(const e of l.getEntries())w.__long.push(e.duration);}).observe({type:'longtask',buffered:true});});
 const engineRequests:string[]=[];page.on('request',r=>{if(/CLEA_(GLX|QSO)\.DAT/i.test(r.url()))engineRequests.push(r.url());});
 await page.goto('/');await expect(page.getByRole('button',{name:'Open dome ↗',exact:true})).toBeVisible({timeout:30_000});
 await page.waitForTimeout(1500);await page.evaluate(()=>{(window as unknown as {__long:number[]}).__long=[];});
 await page.goto('/#galaxy-exposure');await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:30_000});
 await page.waitForTimeout(1500);
 expect(engineRequests).toEqual([]);// nothing for the engine targets until one is selected
 const visit=await page.evaluate(()=>(window as unknown as {__long:number[]}).__long.slice());
 await page.evaluate(()=>{(window as unknown as {__long:number[]}).__long=[];});
 await page.getByLabel('Acquisition galaxy').selectOption('NGC 4874');
 const panel=page.locator('[data-galaxy-telescope="0"] [data-galaxy-panel="NGC 4874"]');
 await expect(panel.getByTestId('galaxy-engine-loading')).toHaveCount(0,{timeout:60_000});
 await expect(page.getByTestId('galaxy-engine-adaptation-NGC-4874')).toBeVisible();
 const select=await page.evaluate(()=>(window as unknown as {__long:number[]}).__long.slice());
 test.info().annotations.push({type:'long tasks (ms)',description:`visit ${JSON.stringify(visit.map(Math.round))}; select ${JSON.stringify(select.map(Math.round))}`});
 expect(Math.max(0,...visit)).toBeLessThan(BOUND_MS);expect(Math.max(0,...select)).toBeLessThan(BOUND_MS);
});
