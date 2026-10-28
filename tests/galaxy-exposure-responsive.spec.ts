import {test,expect,type Page} from '@playwright/test';
// Review 2 finding 1 / review 4 item 2: opening Galaxy exposure must not block the page, and an engine target (Coma – 1) is prepared
// off the main thread only when it is selected.
// Main-thread marker: evaluateField places a performance mark ('openvireo:field-evaluation') on the timeline of the thread that runs
// it; a Worker's marks never appear on the page. The page must see none while the Coma field is prepared, and the positive control
// (an LSS list, evaluated on the page) must produce some, so the check can fail.
// Long tasks: always asserted with a generous 2 s bound (the earlier synchronous preparation blocked for about 10.6 s; one
// synchronous field preparation alone takes about 500 ms; measured 114–142 ms idle and up to 265 ms under heavy load).
const MARK='openvireo:field-evaluation',BOUND_MS=2000;
const marks=(page:Page)=>page.evaluate(m=>performance.getEntriesByName(m,'mark').length,MARK);
test('Galaxy exposure prepares engine targets in a Worker, only on selection, without long main-thread tasks',async({page})=>{
 test.setTimeout(120_000);
 await page.addInitScript(()=>{const w=window as unknown as {__long:number[]};w.__long=[];new PerformanceObserver(l=>{for(const e of l.getEntries())w.__long.push(e.duration);}).observe({type:'longtask',buffered:true});});
 const workers:string[]=[];page.on('worker',w=>workers.push(w.url()));
 await page.goto('/#galaxy-exposure');await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:30_000});
 await page.waitForTimeout(1500);
 expect(workers.filter(u=>/hubbleEngineWorker/.test(u))).toEqual([]);// nothing is prepared until an engine target is selected
 const before=await marks(page);
 await page.evaluate(()=>{(window as unknown as {__long:number[]}).__long=[];});
 await page.getByLabel('Acquisition galaxy').selectOption('NGC 4874');
 const panel=page.locator('[data-galaxy-telescope="0"] [data-galaxy-panel="NGC 4874"]');
 await expect(panel.getByTestId('galaxy-engine-loading')).toHaveCount(0,{timeout:60_000});
 await expect(page.getByTestId('galaxy-engine-adaptation-NGC-4874')).toBeVisible();
 expect(workers.filter(u=>/hubbleEngineWorker/.test(u))).toHaveLength(1);// the field was prepared in the Worker
 expect(await marks(page)).toBe(before);// and no field evaluation ran on the page
 const select=await page.evaluate(()=>(window as unknown as {__long:number[]}).__long.slice());
 test.info().annotations.push({type:'long tasks (ms)',description:JSON.stringify(select.map(Math.round))});
 expect(Math.max(0,...select)).toBeLessThan(BOUND_MS);
 // Positive control: the LSS survey evaluates its rows on the page, so the marker does move there.
 await page.goto('/#lss-survey');await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible({timeout:30_000});
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Load selected list',exact:true}).click();
 await expect(page.locator('[data-testid^="lss-row-"]')).toHaveCount(23,{timeout:60_000});
 await expect.poll(()=>marks(page),{timeout:30_000}).toBeGreaterThan(0);
});
