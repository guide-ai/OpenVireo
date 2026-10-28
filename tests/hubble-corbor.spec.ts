import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
// Phase 2 B1: CorBor – 1 (54875) and CorBor – 3 (54891) through the original Hubble.HTL, the exact catalogue centre and the
// recovered cached-pan view (0.4 m only). Alignment positions, steps and seeds are operator-chosen workflow inputs, not expected
// redshifts; V values are typed by the operator from the workbook references, never prefilled.
const targets=[{id:'54875',row:7,remarks:'CorBor - 1',V:'16.9',cell:'C10',position:'40'},{id:'54891',row:9,remarks:'CorBor - 3',V:'16.3',cell:'C11',position:'45'}];
async function download(page:Page,name:string){const d=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await d).path())!);}
async function press(page:Page,name:string|RegExp){const b=page.getByRole('button',{name,exact:typeof name==='string'});await b.focus();await page.keyboard.press('Enter');}
async function openHotList(page:Page){const title=page.locator('#htl-title');if(!await page.locator('.htl-card details').evaluate(d=>(d as HTMLDetailsElement).open))await title.click();}
async function loadHubble(page:Page){await openHotList(page);await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await expect(page.locator('#htl-rows option')).toHaveCount(13);}
async function pointRow(page:Page,row:number){await page.locator('#htl-rows').selectOption(String(row));await page.locator('.htl-card details>button.primary-button').click();}
async function tracking(page:Page){if(await page.getByRole('button',{name:'Turn tracking on',exact:true,includeHidden:true}).count()){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.locator('.running-clock details summary').click();await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}}
async function toGalaxy(page:Page,t:typeof targets[number],keyboard=false){
 await pointRow(page,t.row);const card=page.getByTestId('hubble-point-card');
 await expect(card).toHaveAttribute('data-pointing','htl');await expect(card).toHaveAttribute('data-status','available');await expect(card).toContainText(`Hubble.HTL entry ${t.row+1} · ${t.id} · ${t.remarks}`);await expect(card).toContainText('cannot start an acquisition');
 await expect(page.getByTestId('htl-hubble-row')).toContainText(`supported acquisition target ${t.id}`);
 // The rounded HTL pointing does not certify acquisition: no supported-galaxy acquisition is offered there.
 const early=page.getByRole('button',{name:'Acquire supported galaxy',exact:true});if(await early.count())await expect(early).toBeDisabled();
 if(keyboard)await press(page,'Use exact catalogue centre');else await card.getByRole('button',{name:'Use exact catalogue centre',exact:true}).click();
 await expect(card).toHaveAttribute('data-pointing','exact');await expect(card.getByRole('button',{name:'Use exact catalogue centre',exact:true})).toBeDisabled();
 const toScope=page.getByRole('button',{name:'Switch to telescope view ↗',exact:true});if(await toScope.isVisible())await toScope.click();await tracking(page);
 if(keyboard)await press(page,'Acquire supported galaxy');else await page.getByRole('button',{name:'Acquire supported galaxy',exact:true}).click();
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.getByLabel('Acquisition galaxy')).toHaveValue(t.id);await expect(page.getByTestId(`galaxy-cached-adaptation-${t.id}`)).toBeVisible();
}
async function acquire(page:Page,t:typeof targets[number],keyboard=false){
 if(keyboard)await press(page,'Activate supported galaxy field');else await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 if(keyboard)await press(page,'Start galaxy exposure');else await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();
 await page.clock.runFor(2000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();await expect(page.getByTestId('galaxy-elapsed')).toHaveText('2000 ms');
 const source=await page.getByTestId('galaxy-source-total').textContent();expect(Number(source)).toBeGreaterThan(0);
 await press(page,'Analyze acquired galaxy');await expect(page.getByTestId('z-value')).toHaveText('+0.000000');await expect(page.getByRole('slider')).toBeDisabled();
 await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText(t.id);if(t.id==='54891')await expect(page.getByLabel('Galaxy acquisition provenance')).not.toContainText('54890');
 await page.getByLabel('z step per tick').fill('.001');await page.getByRole('button',{name:'Apply step',exact:true}).click();await page.getByRole('slider').fill(t.position);
 await page.getByRole('button',{name:/Record measurement/}).click();await page.getByRole('button',{name:'Save measurement',exact:true}).click();
 return source!;
}
test('Hubble.HTL → exact centre → cached-pan acquisition of CorBor – 1 and – 3 → manual z → Hubble → Save, fresh Restore, resume',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await loadHubble(page);await pointRow(page,5);await expect(page.getByTestId('hubble-point-unavailable')).toContainText('variable-star and QSO merges');await expect(page.getByTestId('hubble-point-card').getByRole('button')).toHaveCount(0);
 const sources:string[]=[];
 for(const [i,t] of targets.entries()){if(i>0){await page.clock.resume();await clickHeaderTool(page,'Observatory');await openHotList(page);}await toGalaxy(page,t,i===1);sources.push(await acquire(page,t,i===1));}
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(2);await expect(page.locator('#measurement-log')).toContainText('54875');await expect(page.locator('#measurement-log')).toContainText('54891');
 await page.getByText('Hubble diagram & distances',{exact:true}).click();await page.getByRole('button',{name:'Add saved measurements',exact:true}).click();await page.getByLabel('Distance and summary recipe').selectOption('vireo');
 for(const [i,t] of targets.entries()){const n=i+1;await expect(page.getByLabel(`Apparent V magnitude · row ${n}`,{exact:true})).toBeEmpty();await expect(page.getByLabel(`Apparent magnitude source · row ${n}`,{exact:true})).toBeEmpty();
  await page.getByLabel(`Apparent V magnitude · row ${n}`,{exact:true}).fill(t.V);await page.getByLabel(`Apparent magnitude source · row ${n}`,{exact:true}).fill(`Hubble Data.xls · Sheet1!${t.cell}`);await page.getByLabel(`VIREO target identification · row ${n}`,{exact:true}).selectOption(t.id);}
 await expect(page.getByTestId('hubble-value')).toBeVisible();await expect(page.getByTestId('hubble-fit')).toBeVisible();await expect(page.locator('.hubble-point')).toHaveCount(2);const value=await page.getByTestId('hubble-value').textContent();
 const saved=await download(page,'Save session'),data=JSON.parse(saved.toString());expect(data.version).toBe(24);expect(data.cachedGalaxies).toHaveProperty('54875');expect(data.base.acquisitions).toHaveLength(2);expect(data.base.measurements.map((m:any)=>m.origin.targetId)).toEqual(['54875','54891']);
 await page.reload();await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'corbor.json',mimeType:'application/json',buffer:saved});
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(2);await page.getByText('Hubble diagram & distances',{exact:true}).click();await expect(page.getByTestId('hubble-value')).toHaveText(value!);
 await page.getByRole('button',{name:'Inspect acquisition for measurement 2',exact:true}).click();await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText('54891');await page.getByRole('button',{name:'Restore this acquisition in the telescope',exact:true}).click();
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.getByLabel('Acquisition galaxy')).toHaveValue('54891');await expect(page.getByTestId('galaxy-source-total')).toHaveText(sources[1]);await expect(page.getByTestId('galaxy-phase')).toHaveText('Deactivated');
 await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();await page.clock.runFor(100);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();await expect(page.getByTestId('galaxy-elapsed')).toHaveText('2100 ms');
 // Different-target journal: a 54891 galaxy session is refused by the 54875 panel without changing it.
 const journal=await download(page,'Save galaxy session JSON');await page.getByLabel('Acquisition galaxy').selectOption('54875');const before=await page.getByTestId('galaxy-total').textContent();
 await page.getByLabel('Restore galaxy session JSON (up to 2 MiB) · 54875',{exact:true}).setInputFiles({name:'wrong-target.json',mimeType:'application/json',buffer:journal});await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByTestId('galaxy-total')).toHaveText(before!);
 expect(errors).toEqual([]);
});
test('bundled Hubble.HTL failures keep the current list; cancel ignores a late result; other telescopes show an explicit notice',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await openHotList(page);
 for(const body of [Buffer.alloc(1118),Buffer.alloc(1117)]){await page.route('**/original/hotlists/Hubble.HTL',route=>route.fulfill({status:200,body}));await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await expect(page.locator('.htl-card [role="alert"]')).toContainText('Hubble.HTL could not be loaded');await expect(page.locator('#htl-rows')).toHaveCount(0);await page.unroute('**/original/hotlists/Hubble.HTL');}
 let release=()=>{};const held=new Promise<void>(r=>{release=r;});
 await page.route('**/original/hotlists/Hubble.HTL',async route=>{await held;await route.continue().catch(()=>{});});
 await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await page.locator('.htl-card .button-row').first().locator('button').last().click();release();
 await page.waitForTimeout(300);await expect(page.locator('#htl-rows')).toHaveCount(0);await page.unroute('**/original/hotlists/Hubble.HTL');
 await loadHubble(page);
 // KPNO 0.9 m: CorBor – 1 is reported, not acquired, and the telescope is not switched.
 await page.getByLabel('Telescope profile to inspect or select').selectOption('1');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await openHotList(page);await pointRow(page,7);await expect(page.getByTestId('hubble-point-card')).toHaveAttribute('data-status','telescope');await expect(page.getByTestId('hubble-point-telescope')).toContainText('only on the 0.4m telescope');await expect(page.getByTestId('htl-hubble-row')).toContainText('supported only on the 0.4m telescope');
 await page.clock.resume();await clickHeaderTool(page,'Galaxy exposure');await page.getByLabel('Acquisition galaxy').selectOption('54875');
 await expect(page.locator('[data-galaxy-telescope="1"]').getByTestId('galaxy-telescope-unsupported-54875')).toBeVisible();await expect(page.locator('[data-galaxy-telescope="1"] [data-galaxy-panel="54875"] button')).toHaveCount(0);
 await page.getByLabel('Acquisition galaxy').selectOption('54876');await expect(page.locator('[data-galaxy-telescope="1"] [data-galaxy-panel="54876"]').getByRole('button',{name:'Activate supported galaxy field',exact:true})).toBeVisible();
 await clickHeaderTool(page,'Observatory');await expect(page.getByLabel('Telescope profile to inspect or select')).toHaveValue('1');
 expect(errors).toEqual([]);
});
test('320 px mobile: Hubble.HTL row to CorBor – 1 acquisition without horizontal scrolling',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:320,height:800});await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await loadHubble(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await toGalaxy(page,targets[0],true);await acquire(page,targets[0],true);await expect(page.locator('#measurement-log')).toContainText('54875');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/hubble-corbor-mobile.png',fullPage:true});
});
