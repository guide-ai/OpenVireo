import {test,expect} from '@playwright/test';
// Review 2 finding 1: opening Galaxy exposure must not block the page, and an engine target (Coma – 1) is prepared off the main
// thread only when it is selected.
// Structural checks (load-independent): the hubbleEngineWorker starts only on selection, and the page's own resource timeline
// (main thread only; a Worker has its own) never fetches the field engine, a field pack or CLEA_GLX/CLEA_QSO: the Worker does.
// Timing (load-sensitive, so asserted only in serial runs): the longest task when selecting the Coma target measured 114–142 ms
// on an idle machine and up to 265 ms under a load average near 28; one synchronous field preparation alone takes about 500 ms
// and the earlier synchronous path blocked for about 10.6 s. In parallel runs the values are only recorded as an annotation.
const BOUND_MS=300;
const ENGINE=/fieldEngine|hubbleEnginePrepare|hubbleEngineEntry|engine-(coma|bootes)\.json|CLEA_(GLX|QSO)\.DAT/i;
test('Galaxy exposure prepares engine targets in a Worker, only on selection, without long main-thread tasks',async({page})=>{
 test.setTimeout(120_000);
 await page.addInitScript(()=>{const w=window as unknown as {__long:number[]};w.__long=[];new PerformanceObserver(l=>{for(const e of l.getEntries())w.__long.push(e.duration);}).observe({type:'longtask',buffered:true});});
 const workers:string[]=[];page.on('worker',w=>workers.push(w.url()));
 const mainThreadEngine=()=>page.evaluate(src=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new RegExp(src,'i').test(n)),ENGINE.source);
 await page.goto('/');await expect(page.getByRole('button',{name:'Open dome ↗',exact:true})).toBeVisible({timeout:30_000});
 await page.waitForTimeout(1500);await page.evaluate(()=>{(window as unknown as {__long:number[]}).__long=[];});
 await page.goto('/#galaxy-exposure');await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:30_000});
 await page.waitForTimeout(1500);
 expect(workers.filter(u=>/hubbleEngineWorker/.test(u))).toEqual([]);// nothing is prepared until an engine target is selected
 const visit=await page.evaluate(()=>(window as unknown as {__long:number[]}).__long.slice());
 await page.evaluate(()=>{(window as unknown as {__long:number[]}).__long=[];});
 await page.getByLabel('Acquisition galaxy').selectOption('NGC 4874');
 const panel=page.locator('[data-galaxy-telescope="0"] [data-galaxy-panel="NGC 4874"]');
 await expect(panel.getByTestId('galaxy-engine-loading')).toHaveCount(0,{timeout:60_000});
 await expect(page.getByTestId('galaxy-engine-adaptation-NGC-4874')).toBeVisible();
 expect(workers.filter(u=>/hubbleEngineWorker/.test(u))).toHaveLength(1);// the field was prepared in the Worker
 expect(await mainThreadEngine()).toEqual([]);// and never on the page itself
 const select=await page.evaluate(()=>(window as unknown as {__long:number[]}).__long.slice());
 test.info().annotations.push({type:'long tasks (ms)',description:`visit ${JSON.stringify(visit.map(Math.round))}; select ${JSON.stringify(select.map(Math.round))}`});
 if(test.info().config.workers===1){expect(Math.max(0,...visit)).toBeLessThan(BOUND_MS);expect(Math.max(0,...select)).toBeLessThan(BOUND_MS);}
});
