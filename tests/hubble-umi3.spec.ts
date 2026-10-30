import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
import {recordMeasurement,sessionBase} from './fixtures/record-measurement';
// Front F M1: UM-I – 3 (36805) through the original Hubble.HTL, the exact catalogue centre and the recovered cached-pan view of
// the verified UM-I – 2 field (0.4 m only), saved in the v29 extended-target wrapper. Alignment positions, steps and seeds are
// operator-chosen workflow inputs; the V value is typed by the operator from the workbook reference, never prefilled.
const T={id:'36805',row:2,remarks:'UM-I - 3',V:'15.4',cell:'C4',position:'50'};
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
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.getByLabel('Acquisition galaxy')).toHaveValue(T.id);await expect(page.getByTestId(`galaxy-umi-adaptation-${T.id}`)).toBeVisible();
}
async function acquire(page:Page){
 await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();await page.clock.runFor(2000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();await expect(page.getByTestId('galaxy-elapsed')).toHaveText('2000 ms');
 const source=await page.getByTestId('galaxy-source-total').textContent();expect(Number(source)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Analyze acquired galaxy',exact:true}).click();await expect(page.getByTestId('z-value')).toHaveText('+0.000000');
 await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText(T.id);
 await page.getByLabel('z step per tick').fill('.001');await page.getByRole('button',{name:'Apply step',exact:true}).click();await page.getByRole('slider').fill(T.position);
 await recordMeasurement(page);
 return source!;
}
test('Hubble.HTL → UM-I – 3 cached pan → manual z → Hubble → Save (v29), fresh Restore, resume',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await loadHubble(page);await toGalaxy(page);const source=await acquire(page);
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(1);await expect(page.locator('#measurement-log')).toContainText(T.id);
 await page.getByText('Hubble diagram & distances',{exact:true}).click();await page.getByRole('button',{name:'Add saved measurements',exact:true}).click();await page.getByLabel('Distance and summary recipe').selectOption('vireo');
 await expect(page.getByLabel('Apparent V magnitude · row 1',{exact:true})).toBeEmpty();
 await page.getByLabel('Apparent V magnitude · row 1',{exact:true}).fill(T.V);await page.getByLabel('Apparent magnitude source · row 1',{exact:true}).fill(`Hubble Data.xls · Sheet1!${T.cell}`);await page.getByLabel('VIREO target identification · row 1',{exact:true}).selectOption(T.id);
 const saved=await download(page,'Save session'),data=sessionBase(JSON.parse(saved.toString()));
 expect(data.version).toBe(29);expect(data.extendedPolicy).toBe('openvireo-hubble-extended-targets-v29');expect(data.extendedGalaxies['0:36805'].source.kind).toBe('archive');
 expect(data.base.acquisitions).toHaveLength(1);expect(data.base.hubble.rows[0].input).toMatchObject({targetId:T.id,apparentVText:T.V,magnitudeSource:`Hubble Data.xls · Sheet1!${T.cell}`});expect(data.base.measurements.map((m:any)=>m.origin.targetId)).toEqual([T.id]);
 await page.reload();await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'umi3.json',mimeType:'application/json',buffer:saved});
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(1,{timeout:30000});
 await page.getByRole('button',{name:'Inspect acquisition for measurement 1',exact:true}).click();await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText(T.id);await page.getByRole('button',{name:'Restore this acquisition in the telescope',exact:true}).click();
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.getByLabel('Acquisition galaxy')).toHaveValue(T.id);await expect(page.getByTestId('galaxy-source-total')).toHaveText(source);
 await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();await page.clock.runFor(100);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();await expect(page.getByTestId('galaxy-elapsed')).toHaveText('2100 ms');
 expect(errors).toEqual([]);
});
test('UM-I – 3 on the KPNO 0.9 m is reported, never acquired, and the telescope is not switched',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');
 await page.getByLabel('Telescope profile to inspect or select').selectOption('1');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await loadHubble(page);await pointRow(page,T.row);
 await expect(page.getByTestId('hubble-point-card')).toHaveAttribute('data-status','telescope');await expect(page.getByTestId('hubble-point-telescope')).toContainText('only on the 0.4m telescope');
 await page.clock.resume();await clickHeaderTool(page,'Galaxy exposure');await page.getByLabel('Acquisition galaxy').selectOption(T.id);
 await expect(page.locator('[data-galaxy-telescope="1"]').getByTestId(`galaxy-telescope-unsupported-${T.id}`)).toBeVisible();
 await clickHeaderTool(page,'Observatory');await expect(page.getByLabel('Telescope profile to inspect or select')).toHaveValue('1');
 expect(errors).toEqual([]);
});
test('320 px: UM-I – 3 row to acquisition without horizontal scrolling',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:320,height:800});await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await loadHubble(page);
 await toGalaxy(page);await acquire(page);await expect(page.locator('#measurement-log')).toContainText(T.id);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/hubble-umi3-mobile.png',fullPage:true});
});
