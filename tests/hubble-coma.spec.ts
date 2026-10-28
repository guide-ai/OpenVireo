import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
// Front F M3/M4: Coma – 1 (NGC 4874) and Coma – 2 (NGC 4889, own NGC4889.SP) through the original Hubble.HTL, the exact catalogue
// centre and a fresh general-field-engine field with the recovered QSO merge (0.4 m and 4 m), saved in the v29 wrapper.
// operator-chosen workflow inputs; the V value is typed by the operator from the workbook reference, never prefilled.
const TS=[{id:'NGC 4874',row:3,remarks:'Coma - 1',V:'12.9',cell:'C5',position:'24'},{id:'NGC 4889',row:4,remarks:'Coma - 2',V:'12.5',cell:'C6',position:'22'}];let T=TS[0];
async function download(page:Page,name:string){const d=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await d).path())!);}
async function openHotList(page:Page){const title=page.locator('#htl-title');if(!await page.locator('.htl-card details').evaluate(d=>(d as HTMLDetailsElement).open))await title.click();}
async function loadHubble(page:Page){await openHotList(page);await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await expect(page.locator('#htl-rows option')).toHaveCount(13);}
async function pointRow(page:Page,row:number){await page.locator('#htl-rows').selectOption(String(row));await page.locator('.htl-card details>button.primary-button').click();}
async function tracking(page:Page){if(await page.getByRole('button',{name:'Turn tracking on',exact:true,includeHidden:true}).count()){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.locator('.running-clock details summary').click();await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}}
async function toGalaxy(page:Page){
 await pointRow(page,T.row);const card=page.getByTestId('hubble-point-card');
 await expect(card).toHaveAttribute('data-pointing','htl');await expect(card).toHaveAttribute('data-status','available');await expect(card).toContainText(`Hubble.HTL entry ${T.row+1} · ${T.id} · ${T.remarks}`);
 await card.getByRole('button',{name:'Use exact catalogue centre',exact:true}).click();await expect(card).toHaveAttribute('data-pointing','exact');
 const toScope=page.getByRole('button',{name:'Switch to telescope view ↗',exact:true});if(await toScope.isVisible())await toScope.click();await tracking(page);
 await page.getByRole('button',{name:'Acquire supported galaxy',exact:true}).click();
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:30000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.getByLabel('Acquisition galaxy')).toHaveValue(T.id);await expect(page.getByTestId(`galaxy-engine-adaptation-${T.id.replace(/ /g,'-')}`)).toBeVisible({timeout:30000});
}
async function toGalaxyFromCard(page:Page){const card=page.getByTestId('hubble-point-card');await card.getByRole('button',{name:'Use exact catalogue centre',exact:true}).click();const toScope=page.getByRole('button',{name:'Switch to telescope view ↗',exact:true});if(await toScope.isVisible())await toScope.click();await tracking(page);await page.getByRole('button',{name:'Acquire supported galaxy',exact:true}).click();await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:30000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));}
async function acquire(page:Page){
 await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click({timeout:30000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();await page.clock.runFor(2000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();await expect(page.getByTestId('galaxy-elapsed')).toHaveText('2000 ms');
 const source=await page.getByTestId('galaxy-source-total').textContent();expect(Number(source)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Analyze acquired galaxy',exact:true}).click();await expect(page.getByTestId('z-value')).toHaveText('+0.000000');
 await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText(T.id);
 await page.getByLabel('z step per tick').fill('.001');await page.getByRole('button',{name:'Apply step',exact:true}).click();await page.getByRole('slider').fill(T.position);
 await page.getByRole('button',{name:/Record measurement/}).click();await page.getByRole('button',{name:'Save measurement',exact:true}).click();
 return source!;
}
test('Hubble.HTL → Coma – 1/2 engine fields → manual z → Hubble → Save (v29), fresh Restore, resume',async({page})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await loadHubble(page);const sources:string[]=[];
 for(const [i,t] of TS.entries()){T=t;if(i>0){await page.clock.resume();await clickHeaderTool(page,'Observatory');await openHotList(page);}await toGalaxy(page);sources.push(await acquire(page));}
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(2);
 await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText('NGC4889.SP');
 await page.getByText('Hubble diagram & distances',{exact:true}).click();await page.getByRole('button',{name:'Add saved measurements',exact:true}).click();await page.getByLabel('Distance and summary recipe').selectOption('vireo');
 for(const [i,t] of TS.entries()){const n=i+1;await expect(page.getByLabel(`Apparent V magnitude · row ${n}`,{exact:true})).toBeEmpty();await page.getByLabel(`Apparent V magnitude · row ${n}`,{exact:true}).fill(t.V);await page.getByLabel(`Apparent magnitude source · row ${n}`,{exact:true}).fill(`Hubble Data.xls · Sheet1!${t.cell}`);await page.getByLabel(`VIREO target identification · row ${n}`,{exact:true}).selectOption(t.id);}
 await expect(page.getByTestId('hubble-value')).toBeVisible();const value=await page.getByTestId('hubble-value').textContent();
 const saved=await download(page,'Save session'),data=JSON.parse(saved.toString());
 expect(data.version).toBe(29);expect(data.extendedGalaxies['0:NGC 4874'].source.kind).toBe('archive');expect(data.extendedGalaxies['0:NGC 4889'].source.kind).toBe('archive');
 expect(data.base.acquisitions.map((a:any)=>a.journal.policy)).toEqual(['openvireo-engine-galaxy-NGC4874-r0-v1','openvireo-engine-galaxy-NGC4889-r0-v1']);
 await page.reload();await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'coma.json',mimeType:'application/json',buffer:saved});
 // Restoring prepares the engine fields first (catalogue and evidence checks), so validation takes a few seconds.
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(2,{timeout:60000});await page.getByText('Hubble diagram & distances',{exact:true}).click();await expect(page.getByTestId('hubble-value')).toHaveText(value!);
 await page.getByRole('button',{name:'Inspect acquisition for measurement 2',exact:true}).click();await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText('NGC 4889');await page.getByRole('button',{name:'Restore this acquisition in the telescope',exact:true}).click();
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:30000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.getByLabel('Acquisition galaxy')).toHaveValue('NGC 4889');await expect(page.getByTestId('galaxy-source-total')).toHaveText(sources[1]);
 expect(errors).toEqual([]);
});
test('Coma – 1 on the 4 m is acquirable; on the KPNO 0.9 m it is reported (mean bound), never acquired',async({page})=>{T=TS[0];
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');
 await page.getByLabel('Telescope profile to inspect or select').selectOption('1');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await loadHubble(page);await pointRow(page,3);
 await expect(page.getByTestId('hubble-point-card')).toHaveAttribute('data-status','telescope');
 await page.clock.resume();await clickHeaderTool(page,'Galaxy exposure');await page.getByLabel('Acquisition galaxy').selectOption('NGC 4874');
 await expect(page.locator('[data-galaxy-telescope="1"]').getByTestId('galaxy-telescope-unsupported-NGC 4874')).toBeVisible();
 await clickHeaderTool(page,'Observatory');await page.getByLabel('Telescope profile to inspect or select').selectOption('2');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await openHotList(page);await pointRow(page,3);await expect(page.getByTestId('hubble-point-card')).toHaveAttribute('data-status','available');
 await toGalaxyFromCard(page);await acquire(page);await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText('NGC 4874');
 expect(errors).toEqual([]);
});
test('a failing catalogue load is an explicit, retryable notice, never a substitute field',async({page})=>{
 await page.route('**/original/catalogs/CLEA_QSO.DAT',route=>route.fulfill({status:200,body:Buffer.alloc(117988)}));
 await page.goto('/#galaxy-exposure');await page.getByLabel('Acquisition galaxy').selectOption('NGC 4874');
 await expect(page.locator('[data-galaxy-telescope="0"] [data-galaxy-panel="NGC 4874"]').getByTestId('galaxy-engine-error')).toBeVisible();await expect(page.getByRole('button',{name:'Activate supported galaxy field',exact:true})).toHaveCount(0);
 await page.unroute('**/original/catalogs/CLEA_QSO.DAT');await page.locator('[data-galaxy-telescope="0"] [data-galaxy-panel="NGC 4874"]').getByRole('button',{name:'Try again',exact:true}).click();
 await expect(page.getByRole('button',{name:'Activate supported galaxy field',exact:true})).toBeVisible({timeout:30000});
});
test('320 px: Coma – 1 row to acquisition without horizontal scrolling',async({page})=>{T=TS[0];
 test.setTimeout(60000);
 await page.setViewportSize({width:320,height:800});await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await loadHubble(page);
 await toGalaxy(page);await acquire(page);await expect(page.locator('#measurement-log')).toContainText(T.id);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/hubble-coma-mobile.png',fullPage:true});
});
