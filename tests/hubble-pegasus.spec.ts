import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
import {recordMeasurement,sessionBase} from './fixtures/record-measurement';
// Phase 2 B2: NGC 7499 / 7501 / 7503 (Pegasus) through the original Hubble.HTL, the exact catalogue centre, the fresh NGC 7501
// field and its cached-pan views (0.4 m only), then all eight supported targets in one investigation. Alignment positions,
// steps and seeds are operator-chosen workflow inputs, not expected redshifts; V values are typed by the operator from the
// documented workbook references, never prefilled.
type Target=Readonly<{id:string;V:string;cell:string;position:string;row?:number;remarks?:string}>;
const pegasus:readonly Target[]=[{id:'NGC 7499',row:10,remarks:'Peg - 1',V:'14.1',cell:'C12',position:'30'},{id:'NGC 7501',row:11,remarks:'Peg - 2',V:'14.7',cell:'C13',position:'35'},{id:'NGC 7503',row:12,remarks:'Peg - 3',V:'14.4',cell:'C14',position:'40'}];
const earlier:readonly Target[]=[{id:'36747',V:'15.6',cell:'C2',position:'10'},{id:'36773',V:'15.8',cell:'C3',position:'15'},{id:'54876',V:'16.0',cell:'C9',position:'20'},{id:'54875',V:'16.9',cell:'C10',position:'45'},{id:'54891',V:'16.3',cell:'C11',position:'50'}];
const all=[...pegasus,...earlier];
async function download(page:Page,name:string){const d=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await d).path())!);}
async function press(page:Page,name:string){const b=page.getByRole('button',{name,exact:true});await b.focus();await page.keyboard.press('Enter');}
async function openHotList(page:Page){const title=page.locator('#htl-title');if(!await page.locator('.htl-card details').evaluate(d=>(d as HTMLDetailsElement).open))await title.click();}
async function loadHubble(page:Page){await openHotList(page);await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await expect(page.locator('#htl-rows option')).toHaveCount(13);}
async function pointRow(page:Page,row:number){await page.locator('#htl-rows').selectOption(String(row));await page.locator('.htl-card details>button.primary-button').click();}
async function tracking(page:Page){if(await page.getByRole('button',{name:'Turn tracking on',exact:true,includeHidden:true}).count()){if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.locator('.running-clock details summary').click();await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();}}
const slug=(id:string)=>id.replace(/ /g,'-');
async function toGalaxy(page:Page,t:Target,keyboard=false){
 await pointRow(page,t.row!);const card=page.getByTestId('hubble-point-card');
 await expect(card).toHaveAttribute('data-pointing','htl');await expect(card).toHaveAttribute('data-status','available');await expect(card).toContainText(`Hubble.HTL entry ${t.row!+1} · ${t.id} · ${t.remarks}`);await expect(card).toContainText('cannot start an acquisition');
 await expect(page.getByTestId('htl-hubble-row')).toContainText(`supported acquisition target ${t.id}`);
 // The rounded HTL pointing does not certify acquisition.
 const early=page.getByRole('button',{name:'Acquire supported galaxy',exact:true});if(await early.count())await expect(early).toBeDisabled();
 if(keyboard)await press(page,'Use exact catalogue centre');else await card.getByRole('button',{name:'Use exact catalogue centre',exact:true}).click();
 await expect(card).toHaveAttribute('data-pointing','exact');await expect(card.getByRole('button',{name:'Use exact catalogue centre',exact:true})).toBeDisabled();
 const toScope=page.getByRole('button',{name:'Switch to telescope view ↗',exact:true});if(await toScope.isVisible())await toScope.click();await tracking(page);
 if(keyboard)await press(page,'Acquire supported galaxy');else await page.getByRole('button',{name:'Acquire supported galaxy',exact:true}).click();
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.getByLabel('Acquisition galaxy')).toHaveValue(t.id);await expect(page.getByTestId(`galaxy-pegasus-adaptation-${slug(t.id)}`)).toBeVisible();await expect(page.getByTestId(`galaxy-cached-adaptation-${t.id}`)).toHaveCount(0);
}
async function measure(page:Page,t:Target){
 await press(page,'Analyze acquired galaxy');await expect(page.getByTestId('z-value')).toHaveText('+0.000000');await expect(page.getByRole('slider')).toBeDisabled();
 await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText(t.id);
 await page.getByLabel('z step per tick').fill('.001');await page.getByRole('button',{name:'Apply step',exact:true}).click();await page.getByRole('slider').fill(t.position);
 await recordMeasurement(page);
}
async function acquire(page:Page,t:Target,keyboard=false){
 if(keyboard)await press(page,'Activate supported galaxy field');else await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 if(keyboard)await press(page,'Start galaxy exposure');else await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();
 await page.clock.runFor(2000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();await expect(page.getByTestId('galaxy-elapsed')).toHaveText('2000 ms');
 const source=await page.getByTestId('galaxy-source-total').textContent();expect(Number(source)).toBeGreaterThan(0);
 await measure(page,t);return source!;
}
test('Hubble.HTL → exact centre → Pegasus acquisitions, then all eight targets → manual z → own Hubble fit → Save v25, fresh Restore, resume',async({page})=>{
 test.setTimeout(240000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await loadHubble(page);
 const sources=new Map<string,string>();
 for(const [i,t] of pegasus.entries()){if(i>0){await page.clock.resume();await clickHeaderTool(page,'Observatory');await openHotList(page);}await toGalaxy(page,t,i===1);sources.set(t.id,await acquire(page,t,i===1));}
 // The five earlier targets through the acquisition selector on the same 0.4 m.
 for(const t of earlier){await page.clock.resume();await clickHeaderTool(page,'Galaxy exposure');await page.getByLabel('Acquisition galaxy',{exact:true}).selectOption(t.id);sources.set(t.id,await acquire(page,t));}
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(8);for(const t of all)await expect(page.locator('#measurement-log')).toContainText(t.id);
 await page.getByText('Hubble diagram & distances',{exact:true}).click();await page.getByRole('button',{name:'Add saved measurements',exact:true}).click();await page.getByLabel('Distance and summary recipe').selectOption('vireo');
 for(const [i,t] of all.entries()){const n=i+1;await expect(page.getByLabel(`Apparent V magnitude · row ${n}`,{exact:true})).toBeEmpty();await expect(page.getByLabel(`Apparent magnitude source · row ${n}`,{exact:true})).toBeEmpty();
  await page.getByLabel(`Apparent V magnitude · row ${n}`,{exact:true}).fill(t.V);await page.getByLabel(`Apparent magnitude source · row ${n}`,{exact:true}).fill(`Hubble Data.xls · Sheet1!${t.cell}`);await page.getByLabel(`VIREO target identification · row ${n}`,{exact:true}).selectOption(t.id);}
 await expect(page.getByTestId('hubble-value')).toBeVisible();await expect(page.getByTestId('hubble-fit')).toBeVisible();await expect(page.locator('.hubble-point')).toHaveCount(8);const value=await page.getByTestId('hubble-value').textContent();
 const saved=await download(page,'Save session'),data=sessionBase(JSON.parse(saved.toString()));
 expect(data.version).toBe(25);expect(Object.keys(data.pegasusGalaxies)).toEqual(['NGC 7499','NGC 7501','NGC 7503']);expect(data.base.version).toBe(24);
 let inner=data.base.base;while(!inner.acquisitions)inner=inner.base;expect(inner.acquisitions).toHaveLength(8);expect(inner.measurements.map((m:any)=>m.origin.targetId)).toEqual(all.map(t=>t.id));
 await page.reload();await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'pegasus.json',mimeType:'application/json',buffer:saved});
 await expect(page.locator('#measurement-log tbody tr')).toHaveCount(8);await page.getByText('Hubble diagram & distances',{exact:true}).click();await expect(page.getByTestId('hubble-value')).toHaveText(value!);await expect(page.locator('.hubble-point')).toHaveCount(8);
 // A corrupt v25 file is refused atomically; the restored investigation stays.
 const corrupt={...data,pegasusBaseFieldSHA256:'a'.repeat(64)};await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'corrupt.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});
 await expect(page.getByRole('alert').first()).toBeVisible();await expect(page.locator('#measurement-log tbody tr')).toHaveCount(8);await expect(page.getByTestId('hubble-value')).toHaveText(value!);
 // Resume NGC 7503 (cached view) from its archived acquisition.
 await page.getByRole('button',{name:'Inspect acquisition for measurement 3',exact:true}).click();await expect(page.getByLabel('Galaxy acquisition provenance')).toContainText('NGC 7503');await page.getByRole('button',{name:'Restore this acquisition in the telescope',exact:true}).click();
 await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible({timeout:15000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await expect(page.getByLabel('Acquisition galaxy')).toHaveValue('NGC 7503');await expect(page.getByTestId('galaxy-source-total')).toHaveText(sources.get('NGC 7503')!);await expect(page.getByTestId('galaxy-phase')).toHaveText('Deactivated');
 await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();await page.clock.runFor(100);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();await expect(page.getByTestId('galaxy-elapsed')).toHaveText('2100 ms');
 // The fresh NGC 7501 bank is untouched by the NGC 7503 resume; a different-target journal is refused by its panel.
 const journal=await download(page,'Save galaxy session JSON');await page.getByLabel('Acquisition galaxy').selectOption('NGC 7501');
 await expect(page.getByTestId('galaxy-elapsed')).toHaveText('2000 ms');await expect(page.getByTestId('galaxy-source-total')).toHaveText(sources.get('NGC 7501')!);const before=await page.getByTestId('galaxy-total').textContent();
 await page.getByLabel('Restore galaxy session JSON (up to 2 MiB) · NGC 7501',{exact:true}).setInputFiles({name:'wrong-target.json',mimeType:'application/json',buffer:journal});await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByTestId('galaxy-total')).toHaveText(before!);
 expect(errors).toEqual([]);
});
test('Pegasus on other telescopes: explicit notices, no switch; cancelled Hubble.HTL load keeps the current list',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await openHotList(page);
 let release=()=>{};const held=new Promise<void>(r=>{release=r;});
 await page.route('**/original/hotlists/Hubble.HTL',async route=>{await held;await route.continue().catch(()=>{});});
 await page.getByRole('button',{name:'Load original Hubble.HTL',exact:true}).click();await page.locator('.htl-card .button-row').first().locator('button').last().click();release();
 await page.waitForTimeout(300);await expect(page.locator('#htl-rows')).toHaveCount(0);await page.unroute('**/original/hotlists/Hubble.HTL');
 await loadHubble(page);
 for(const index of ['1','2']){
  await page.getByLabel('Telescope profile to inspect or select').selectOption(index);await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
  await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await openHotList(page);
  for(const t of pegasus){await pointRow(page,t.row!);await expect(page.getByTestId('hubble-point-card')).toHaveAttribute('data-status','telescope');await expect(page.getByTestId('hubble-point-telescope')).toContainText('only on the 0.4m telescope');await expect(page.getByTestId('htl-hubble-row')).toContainText('supported only on the 0.4m telescope');}
  await page.clock.resume();await clickHeaderTool(page,'Galaxy exposure');
  for(const t of pegasus){await page.getByLabel('Acquisition galaxy').selectOption(t.id);await expect(page.locator(`[data-galaxy-telescope="${index}"]`).getByTestId(`galaxy-telescope-unsupported-${t.id}`)).toBeVisible();await expect(page.locator(`[data-galaxy-telescope="${index}"] [data-galaxy-panel="${t.id}"] button`)).toHaveCount(0);}
  await clickHeaderTool(page,'Observatory');await expect(page.getByLabel('Telescope profile to inspect or select')).toHaveValue(index);
 }
 expect(errors).toEqual([]);
});
test('320 px mobile: Hubble.HTL row to the NGC 7501 acquisition by keyboard without horizontal scrolling',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:320,height:800});await page.clock.install();await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await loadHubble(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await toGalaxy(page,pegasus[1],true);await acquire(page,pegasus[1],true);await expect(page.locator('#measurement-log')).toContainText('NGC 7501');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/hubble-pegasus-mobile.png',fullPage:true});
});
