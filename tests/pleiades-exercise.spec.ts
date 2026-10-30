import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool,openHeaderTools}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PLEIADES_ADMITTED_ROWS,PLEIADES_HOT_LIST,PLEIADES_HTL} from '../src/core/pleiadesHotList';
// The bundled original is compared only by size and SHA-256; its bytes are never printed or diffed. Photometer values come
// from the running App and the learner's typed transcriptions: no catalog magnitude or new numeric oracle is asserted.
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const restored='Investigation restored. Included tools were validated together. Exposure segments are stopped and deactivated; activate explicitly before continuing.';
const pause=async(page:Page)=>page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
async function open(page:Page,clock=true){if(clock)await page.clock.install();await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();if(clock)await pause(page);}
async function hotList(page:Page){await page.getByRole('heading',{name:'Original hot lists',exact:true}).click();}
const loadButton=(page:Page)=>page.getByRole('button',{name:'Load exercise list (PLEIADES.HTL)',exact:true});
async function loadExercise(page:Page){await loadButton(page).click();await expect(page.locator('#htl-rows option')).toHaveCount(24);}
async function pointRow(page:Page,index:number){await page.locator('#htl-rows').selectOption(String(index));await page.getByRole('button',{name:'Point to HTL selection',exact:true}).click();}
async function toPhotometer(page:Page,clock:boolean,click:()=>Promise<void>){if(clock)await page.clock.resume();await click();await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();if(clock)await pause(page);}
const navPhotometer=(page:Page)=>clickHeaderTool(page,'Pleiades photometry');
const navObservatory=async(page:Page)=>{await clickHeaderTool(page,'Observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();};
const activate=(page:Page)=>page.getByRole('button',{name:'Activate Pleiades photometer',exact:true});
// The readout shows at most 9 fraction digits (Photometer.tsx num); rows 12 and 22 have longer HTL coordinates. Exact equality
// of the pointing itself is what data-access='ready' checks.
const shown=(v:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:9,useGrouping:false}).format(v);
async function readout(page:Page,p:Readonly<{ra:number;dec:number}>){await expect(page.getByTestId('photo-telescope-ra')).toHaveText(shown(p.ra));await expect(page.getByTestId('photo-telescope-dec')).toHaveText(shown(p.dec));await expect(page.getByTestId('photo-telescope-access')).toHaveAttribute('data-access','ready');}
async function run(page:Page){await page.getByRole('button',{name:'Start integration',exact:true}).click();await page.clock.runFor(3000);await expect(page.getByTestId('photo-phase')).toHaveText('Integration complete');}
async function record(page:Page,band:string,value:string){await page.getByRole('button',{name:'Add notebook entry',exact:true}).click();const input=page.getByLabel(`Your transcribed ${band} magnitude`,{exact:true});await expect(input).toHaveValue('');await input.fill(value);await page.getByRole('button',{name:'Confirm notebook entry',exact:true}).click();}
async function measure(page:Page,band:'V'|'B'){await page.getByLabel('Photometer filter',{exact:true}).selectOption(band);await run(page);const shown=(await page.getByTestId('photo-magnitude').textContent())!;expect(Number.isFinite(Number(shown))).toBe(true);const typed=Number(shown).toFixed(3);await record(page,band,typed);return typed;}
async function lastOption(page:Page,label:string){return (await page.getByLabel(label,{exact:true}).locator('option').last().getAttribute('value'))!;}
async function saveInvestigation(page:Page){const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();return readFile((await(await wait).path())!);}
async function guide(page:Page){await openHeaderTools(page);await page.getByTestId('pleiades-lab-open').click();await expect(page.getByTestId('pleiades-lab-dialog')).toBeVisible();}
const step=(page:Page,name:string)=>page.getByTestId(`pleiades-lab-step-${name}`);

test('nondefault row 1 (01799-01442) is measured as N2230.DAT@144496, then all 24 stars with own B/V transcriptions, manual fit and Save/fresh Restore',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);await hotList(page);await loadExercise(page);
 const asset=await readFile(new URL('../public/original/hotlists/PLEIADES.HTL',import.meta.url));expect(asset.length).toBe(PLEIADES_HTL.bytes);expect(sha(asset)).toBe(PLEIADES_HTL.sha256);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save HTL file',exact:true}).click();const listBytes=await readFile((await(await download).path())!);expect(listBytes.length).toBe(PLEIADES_HTL.bytes);expect(sha(listBytes)).toBe(PLEIADES_HTL.sha256);
 await expect(page.getByTestId('htl-exercise-row')).toContainText('PLEIADES.HTL entry 1:');
 const navigation=await page.getByLabel('Target',{exact:true}).inputValue();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await pointRow(page,0);
 await expect(page.getByTestId('pointing-ra')).toHaveText('3.68833');await expect(page.getByTestId('pointing-dec')).toHaveText('23.96667');await expect(page.getByLabel('Target',{exact:true})).toHaveValue(navigation);
 const card=page.getByTestId('pleiades-point-card');await expect(card).toHaveAttribute('data-admitted','true');await expect(card).toContainText('01799-01442');
 await guide(page);await expect(step(page,'list')).toHaveAttribute('data-done','true');await expect(step(page,'point')).toHaveAttribute('data-done','true');await page.keyboard.press('Escape');
 await toPhotometer(page,true,()=>card.getByRole('button',{name:'Measure with photometer',exact:true}).click());
 await expect(page.getByTestId('photo-pointed-row')).toHaveAttribute('data-pointed','admitted');await activate(page).click();
 const select=page.getByLabel('Photometry target',{exact:true});await expect(select).toHaveValue('N2230.DAT@144496');await readout(page,PLEIADES_ADMITTED_ROWS[0]);await expect(page.getByTestId('photo-phase')).toHaveText('Ready');
 await page.getByLabel('Seconds per integration',{exact:true}).selectOption('1');await page.getByLabel('Number of integrations',{exact:true}).selectOption('3');
 // Fresh V and B sky at this star's own sky position: the telescope follows the Sky/Object choice inside the photometer.
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');await expect(page.getByTestId('photo-telescope-dec')).not.toHaveText('23.96667');await expect(page.getByTestId('photo-telescope-access')).toHaveAttribute('data-access','ready');
 for(const band of ['V','B']as const){await page.getByLabel('Photometer filter',{exact:true}).selectOption(band);await run(page);}
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');
 for(const [i,row] of PLEIADES_ADMITTED_ROWS.entries()){
  if(i>0)await select.selectOption(row.catalogId);await expect(select).toHaveValue(row.catalogId);await readout(page,row);
  const v=await measure(page,'V'),b=await measure(page,'B');
  await page.getByLabel('Saved B reading',{exact:true}).selectOption(await lastOption(page,'Saved B reading'));await page.getByLabel('Saved V reading',{exact:true}).selectOption(await lastOption(page,'Saved V reading'));
  await page.getByRole('button',{name:'Calculate B−V',exact:true}).click();await expect(page.getByTestId('photo-manual-bv')).toHaveText(String(Number((Number(b)-Number(v)).toFixed(3))));
 }
 await expect(page.locator('.photometer-notebook tbody tr')).toHaveCount(48);
 await guide(page);await expect(step(page,'sample')).toHaveAttribute('data-done','true');await expect(page.getByTestId('pleiades-lab-coverage')).toContainText('24 of 24');await expect(step(page,'distance')).toHaveAttribute('data-done','false');await page.getByTestId('pleiades-lab-close').click();
 await page.getByLabel('Your vertical shift m−M (mag)',{exact:true}).fill('5.5');await page.getByRole('button',{name:'Confirm manual cluster fit',exact:true}).click();await expect(page.getByTestId('pleiades-distance-pc')).toHaveText('125.892541');await expect(page.getByTestId('pleiades-manual-point')).toHaveCount(24);
 await guide(page);await expect(page.getByTestId('pleiades-lab-counts')).toHaveText('Guide steps done: 8/8');await expect(page.getByTestId('pleiades-lab-observations')).toBeVisible();await expect(page.getByTestId('pleiades-lab-next')).toHaveAttribute('data-next','save');await expect(step(page,'save')).toHaveAttribute('data-done','false');await page.getByTestId('pleiades-lab-close').click();
 await page.screenshot({path:'test-results/pleiades-exercise-desktop.png',fullPage:true});
 const bytes=await saveInvestigation(page),json=JSON.parse(bytes.toString()),last=PLEIADES_ADMITTED_ROWS.at(-1)!;
 expect(json.version).toBe(17);expect(json.observing.context.selectedId).toBe(navigation);expect(json.observing.context.pointing).toEqual({ra:last.ra,dec:last.dec});expect(json.photometry.events.length).toBeLessThanOrEqual(256);
 await page.clock.resume();await page.reload();await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();await pause(page);
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'pleiades.json',mimeType:'application/json',buffer:bytes});await expect(page.getByText(restored,{exact:true})).toBeVisible();
 await expect(page.locator('.photometer-notebook tbody tr')).toHaveCount(48);await expect(page.getByTestId('pleiades-confirmed-modulus')).toHaveText('5.5');await expect(page.getByTestId('photo-phase')).toHaveText(/Inactive/);
 await guide(page);for(const name of ['measure','record','color','sample','distance'])await expect(step(page,name)).toHaveAttribute('data-done','true');await expect(step(page,'list')).toHaveAttribute('data-done','false');await page.getByTestId('pleiades-lab-close').click();
 expect(await saveInvestigation(page)).toEqual(bytes);
 await activate(page).click();await expect(select).toHaveValue(last.catalogId);await readout(page,last);await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeDisabled();
 expect(errors).toEqual([]);
});

test('all 24 rows: every row is admitted since 2026-10-28; each of the 24 admitted rows activates its own target at its pointing',async({page})=>{
 test.setTimeout(120000);await open(page,false);await hotList(page);await loadExercise(page);await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 let first=true;
 for(const row of PLEIADES_HOT_LIST.filter(r=>!r.admitted)){
  await pointRow(page,row.index);const card=page.getByTestId('pleiades-point-card');await expect(card).toHaveAttribute('data-admitted','false');await expect(card.getByRole('button')).toHaveCount(0);await expect(page.getByTestId('pleiades-point-unavailable')).toBeVisible();
  await toPhotometer(page,false,()=>navPhotometer(page));if(first){await expect(page.getByTestId('photo-orchestration')).toBeVisible();first=false;}
  await expect(page.getByTestId('photo-pointed-row')).toHaveAttribute('data-pointed','blocked');await expect(activate(page)).toBeDisabled();await expect(page.getByTestId('photo-phase')).toHaveText(/Inactive/);
  // No photometer state exists yet, so nothing (no event) can be saved.
  await expect(page.getByRole('button',{name:'Save photometer session',exact:true})).toBeDisabled();await navObservatory(page);
 }
 for(const row of PLEIADES_ADMITTED_ROWS){
  await pointRow(page,row.index);const card=page.getByTestId('pleiades-point-card');await expect(card).toHaveAttribute('data-admitted','true');
  await toPhotometer(page,false,()=>card.getByRole('button',{name:'Measure with photometer',exact:true}).click());
  await activate(page).click();await expect(page.getByLabel('Photometry target',{exact:true})).toHaveValue(row.catalogId);await readout(page,row);await navObservatory(page);
 }
 await toPhotometer(page,false,()=>navPhotometer(page));const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Save photometer session',exact:true}).click();
 const raw=JSON.parse((await readFile((await(await wait).path())!)).toString()) as {events:{type:string;targetId?:string}[]};
 expect(raw.events.filter(e=>e.type==='activate')).toHaveLength(24);expect(raw.events.filter(e=>e.type==='target').map(e=>e.targetId)).toEqual(PLEIADES_ADMITTED_ROWS.map(r=>r.catalogId));
});

test('an unpointed bench Activate moves to the named field; motion releases, and Activate after the student moves keeps that pointing (VIREO FormActivate)',async({page})=>{
 test.setTimeout(90000);await open(page,false);
 await expect(page.getByTestId('pleiades-point-card')).toHaveCount(0);
 await toPhotometer(page,false,()=>navPhotometer(page));await expect(page.getByTestId('photo-pointed-row')).toHaveAttribute('data-pointed','none');await expect(page.getByTestId('photo-telescope-access')).toHaveAttribute('data-access','finder');await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeDisabled();
 await activate(page).click();await expect(page.getByLabel('Photometry target',{exact:true})).toHaveValue('N2230.DAT@145877');await expect(page.getByTestId('photo-telescope-access')).toHaveAttribute('data-access','ready');
 const ra=(await page.getByTestId('photo-telescope-ra').textContent())!,dec=(await page.getByTestId('photo-telescope-dec').textContent())!;
 await navObservatory(page);await expect(page.getByTestId('pleiades-point-card')).toHaveCount(0);await page.locator('.field-controls').getByRole('button',{name:'North',exact:true}).click();
 await toPhotometer(page,false,()=>navPhotometer(page));await expect(page.getByTestId('photo-phase')).toHaveText(/Inactive/);await expect(page.getByTestId('photo-telescope-access')).toHaveAttribute('data-access','pointing');await expect(page.getByTestId('photo-telescope-dec')).not.toHaveText(dec);
 // G3 review 1 M1: FormActivate (0x4ff8b0) never slews. The student moved the telescope, so Activate stays there and reads the
 // field at that pointing from the tiles (a measurement there never counts toward E04).
 const movedDec=(await page.getByTestId('photo-telescope-dec').textContent())!;
 await activate(page).click();await expect(page.getByTestId('photo-telescope-dec')).toHaveText(movedDec);await expect(page.getByTestId('photo-telescope-ra')).toHaveText(ra);
 await expect(async()=>{const target=await page.getByLabel('Photometry target',{exact:true}).inputValue(),status=await page.getByTestId('photo-tiled-status').count();expect(target.startsWith('gsc:')||status>0).toBe(true);}).toPass({timeout:60000});
});

test('an admitted row outside the selected telescope domain is not offered for measurement and blocks activation with no event and no fallback',async({page})=>{
 test.setTimeout(90000);await open(page,false);await page.getByLabel('Telescope profile to inspect or select').selectOption('2');await page.getByRole('button',{name:'Use this telescope',exact:true}).click();
 // With no photometer state yet the target list shows the selected Mayall domain.
 await toPhotometer(page,false,()=>navPhotometer(page));
 let excluded=null as null|typeof PLEIADES_ADMITTED_ROWS[number];
 for(const row of PLEIADES_ADMITTED_ROWS)if(await page.getByLabel('Photometry target',{exact:true}).locator(`option[value="${row.catalogId}"]`).isDisabled()){excluded=row;break;}
 expect(excluded).not.toBeNull();
 await navObservatory(page);await hotList(page);await loadExercise(page);await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await pointRow(page,excluded!.index);
 // The original admitted identity is kept, but the selected Mayall profile cannot measure it: no Measure button is offered.
 const card=page.getByTestId('pleiades-point-card');await expect(card).toHaveAttribute('data-admitted','true');await expect(card).toHaveAttribute('data-status','telescope');
 await expect(card.getByRole('button',{name:'Measure with photometer',exact:true})).toHaveCount(0);await expect(page.getByTestId('pleiades-point-telescope')).toContainText('Mayall');await expect(page.getByTestId('pleiades-point-telescope')).toContainText('0.4m telescope');
 await expect(page.getByTestId('htl-exercise-row')).toContainText(`PLEIADES.HTL entry ${excluded!.index+1}:`);await expect(page.getByTestId('htl-exercise-row')).toContainText('outside the checked photometer domain');
 await guide(page);await expect(step(page,'list')).toHaveAttribute('data-done','true');await expect(step(page,'point')).toHaveAttribute('data-done','false');await expect(page.getByTestId('pleiades-lab-next')).toHaveAttribute('data-next','point');
 await expect(page.getByTestId('pleiades-lab-step-sample')).toContainText('All 24 are measurable only with the 0.4m telescope');await page.keyboard.press('Escape');
 // Ordinary navigation still reaches the photometer, whose existing Activate guard blocks the pointed row.
 await toPhotometer(page,false,()=>navPhotometer(page));
 await expect(page.getByTestId('photo-pointed-row')).toHaveAttribute('data-pointed','blocked');await expect(page.getByTestId('photo-pointed-row')).toContainText('outside the checked domain');await expect(activate(page)).toBeDisabled();await expect(page.getByTestId('photo-phase')).toHaveText(/Inactive/);
 await expect(page.getByRole('button',{name:'Save photometer session',exact:true})).toBeDisabled();
});

test('the explicit exercise-list read honours cancel, drafts, navigation and hidden tabs; mobile keyboard and guide dialog',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:320,height:800});await open(page,false);await hotList(page);
 // Each delayed request is held until the page has cancelled it; a late continuation must not replace the list.
 let release=()=>{},hits=0;
 await page.route('**/original/hotlists/PLEIADES.HTL',async route=>{hits++;await new Promise<void>(resolve=>{release=resolve;});await route.continue().catch(()=>{});});
 await page.getByRole('button',{name:'New HTL list',exact:true}).click();
 await page.getByRole('button',{name:'Add HTL target',exact:true}).click();await expect(loadButton(page)).toBeDisabled();await page.getByRole('button',{name:'Cancel HTL edit',exact:true}).click();
 await loadButton(page).click();await expect.poll(()=>hits).toBe(1);await expect(loadButton(page)).toBeDisabled();await page.getByRole('button',{name:'Cancel HTL load',exact:true}).click();release();await expect(loadButton(page)).toBeEnabled();await expect(page.locator('#htl-rows option')).toHaveCount(0);
 await loadButton(page).click();await expect.poll(()=>hits).toBe(2);await clickHeaderTool(page,'Spectrum analyzer');release();await page.getByRole('button',{name:'← Return to observatory',exact:true}).click();await expect(page.locator('#htl-rows option')).toHaveCount(0);await expect(loadButton(page)).toBeEnabled();
 await loadButton(page).click();await expect.poll(()=>hits).toBe(3);await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});release();await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});});await expect(loadButton(page)).toBeEnabled();await expect(page.locator('#htl-rows option')).toHaveCount(0);
 await page.unroute('**/original/hotlists/PLEIADES.HTL');await loadExercise(page);
 await page.locator('#htl-rows').focus();await page.keyboard.press('End');await expect(page.locator('#htl-rows')).toHaveValue('23');await expect(page.getByTestId('htl-exercise-row')).toContainText('PLEIADES.HTL entry 24:');
 await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await expect(page.getByTestId('htl-exercise-row')).toContainText('measurable with the Pleiades photometer');/* row 2 is a target since 2026-10-28 */
 await openHeaderTools(page);await page.getByTestId('pleiades-lab-open').focus();await page.keyboard.press('Enter');await expect(page.getByTestId('pleiades-lab-close')).toBeFocused();await expect(page.getByTestId('pleiades-lab-step-list')).toHaveAttribute('data-done','true');await expect(page.getByTestId('pleiades-lab-e05')).toBeVisible();await expect(page.getByTestId('pleiades-lab-e05')).not.toContainText('not yet available');await expect(page.getByTestId('pleiades-lab-observations')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByTestId('pleiades-lab-dialog')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/pleiades-exercise-mobile.png',fullPage:true});
});
