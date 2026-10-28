import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
// Front F M5: Boötes – 1 (51976) and Boötes – 2 (51975), RS Boo outside the view, start-time continuation, through the original Hubble.HTL, the exact catalogue
// centre and a fresh general-field-engine field with the recovered QSO merge (0.4 m and 4 m), saved in the v29 wrapper.
// operator-chosen workflow inputs; the V value is typed by the operator from the workbook reference, never prefilled.
const TS=[{id:'51976',row:5,remarks:'Boo - 1',V:'18.5',cell:'C7',position:'60'},{id:'51975',row:6,remarks:'Boo - 2',V:'17.6',cell:'C8',position:'65'}];let T=TS[0];
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
test('Hubble.HTL → Boötes – 1/2 engine fields (start-time continuation) → manual z → Hubble → Save (v29), fresh Restore, resume',async({page})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await loadHubble(page);const sources:string[]=[];
 for(const [i,t] of TS.entries()){T=t;if(i>0){await page.clock.resume();await clickHeaderTool(page,'Observatory');await openHotList(page);}await toGalaxy(page);await expect(page.getByTestId(`galaxy-continuation-adaptation-${T.id}`)).toBeVisible();await expect(page.locator(`[data-galaxy-telescope="0"] [data-galaxy-panel="${T.id}"]`).getByTestId('galaxy-catalogue-reference')).toBeAttached();sources.push(await acquire(page));}
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(2);
 
 await page.getByText('Hubble diagram & distances',{exact:true}).click();await page.getByRole('button',{name:'Add saved measurements',exact:true}).click();await page.getByLabel('Distance and summary recipe').selectOption('vireo');
 for(const [i,t] of TS.entries()){const n=i+1;await expect(page.getByLabel(`Apparent V magnitude · row ${n}`,{exact:true})).toBeEmpty();await page.getByLabel(`Apparent V magnitude · row ${n}`,{exact:true}).fill(t.V);await page.getByLabel(`Apparent magnitude source · row ${n}`,{exact:true}).fill(`Hubble Data.xls · Sheet1!${t.cell}`);await page.getByLabel(`VIREO target identification · row ${n}`,{exact:true}).selectOption(t.id);}
 await expect(page.getByTestId('hubble-value')).toBeVisible();const value=await page.getByTestId('hubble-value').textContent();
 const saved=await download(page,'Save session'),data=JSON.parse(saved.toString());
 expect(data.version).toBe(29);expect(data.extendedGalaxies['0:51976'].source.kind).toBe('archive');expect(data.extendedGalaxies['0:51975'].source.kind).toBe('archive');
 expect(data.base.acquisitions.map((a:any)=>a.journal.policy)).toEqual(['openvireo-engine-galaxy-51976-r0-v1','openvireo-engine-galaxy-51975-r0-v1']);
 await page.reload();await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'bootes.json',mimeType:'application/json',buffer:saved});
 // Restoring prepares the engine fields first (catalogue and evidence checks), so validation takes a few seconds.
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(2,{timeout:60000});await page.getByText('Hubble diagram & distances',{exact:true}).click();await expect(page.getByTestId('hubble-value')).toHaveText(value!);
 await page.getByRole('button',{name:'Inspect acquisition for measurement 2',exact:true}).click();await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText('51975');await page.getByRole('button',{name:'Restore this acquisition in the telescope',exact:true}).click();
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:30000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.getByLabel('Acquisition galaxy')).toHaveValue('51975');await expect(page.getByTestId('galaxy-source-total')).toHaveText(sources[1]);
 expect(errors).toEqual([]);
});
