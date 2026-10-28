import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool,openHeaderTools}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PLEIADES_ADMITTED_ROWS,PLEIADES_HTL} from '../src/core/pleiadesHotList';
// Phase 1 item 1.9: the learner's own confirmed photometer B/V pairs in the live Data from Observations view. Photometer values
// come from the running App and the learner's typed transcriptions; the deliberately typed V 9.875 / B 10.125 pair is an authored
// transcription, not an answer. Pixels are computed here from hard-coded native frame constants (independent of the app helper).
// The bundled original list is compared only by size and SHA-256; its bytes are never printed or diffed.
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const restored='Investigation restored. Included tools were validated together. Exposure segments are stopped and deactivated; activate explicitly before continuing.';
const labels={modulus:'Trial apparent modulus V−Mv · 0–15, step 0.01',ebv:'Trial color excess E(B−V) · 0–2.50, step 0.01',age:'Trial log10(age/yr) · 7.80–10.25, step 0.05',model:'Trial metallicity model',note:'Your interpretation of the trial fit (optional)',correction:'Apply the original optional extinction correction to distance'};
const sliders={modulus:'Slider: apparent modulus V−Mv',ebv:'Slider: color excess E(B−V)'};
// Native frame 0x542480 constants: left 80, top 15, 120 px per B−V magnitude from −0.5, 28 px per V magnitude from 2.
const frameX=(bv:number)=>(bv+.5)*120+80,frameY=(v:number)=>(v-2)*28+15;
const SEVEN='N2230.DAT@148460',NOTE='My own by-eye trial of my Pleiades pairs.';
const ownLines=['Cluster: Pleiades exercise · my confirmed B/V','','From ZAMS fit:','  V-Mv = 5.50','  E(B-V) = 0.04','  Estimated Cluster Distance: 119 Parsecs','','Isochrone Model Parameters:','  Metallicity: [Z=0.019, Y=0.273] (Solar Values)','  Log(Age/yrs): 8.00','  Estimated Cluster Age: 100 Million Years','  (B-V) Adjustment: 0.00'].join('\n');
const pause=async(page:Page)=>page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
async function open(page:Page,hash='#observatory'){await page.clock.install();await page.goto('/'+hash);if(hash==='#observatory')await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();else await expect(page.getByRole('heading',{name:'Star-cluster database laboratory',exact:true})).toBeVisible();await pause(page);}
/** Lazy routes load with the clock running; it is paused again before any integration. */
async function withClock(page:Page,action:()=>Promise<void>){await page.clock.resume();await action();await pause(page);}
async function toPhotometer(page:Page,click?:()=>Promise<void>){await withClock(page,async()=>{await(click??(()=>clickHeaderTool(page,'Pleiades photometry')))();await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();});}
async function toDatabase(page:Page){await withClock(page,async()=>{await clickHeaderTool(page,'Cluster database');await expect(page.getByRole('heading',{name:'Star-cluster database laboratory',exact:true})).toBeVisible();});}
const ownView=(page:Page)=>page.locator('section[aria-labelledby="own-hr-native-cluster-title"]');
// The photometer route only (the database laboratory shares the photometer-main layout class).
const photometerRoute=(page:Page)=>page.locator('main.photometer-main:not(.cluster-database-lab)');
async function openOwn(page:Page){await withClock(page,async()=>{await page.getByTestId('own-hr-summary').click();await expect(ownView(page).getByRole('heading',{name:'HR diagram from your own Pleiades observations',exact:true})).toBeVisible();});}
const activate=(page:Page)=>page.getByRole('button',{name:'Activate Pleiades photometer',exact:true});
const ready=(page:Page)=>expect(page.getByTestId('photo-telescope-access')).toHaveAttribute('data-access','ready');
async function run(page:Page){await ready(page);await page.getByRole('button',{name:'Start integration',exact:true}).click();await page.clock.runFor(3000);await expect(page.getByTestId('photo-phase')).toHaveText('Integration complete');}
async function record(page:Page,band:string,value:string){await page.getByRole('button',{name:'Add notebook entry',exact:true}).click();const input=page.getByLabel(`Your transcribed ${band} magnitude`,{exact:true});await expect(input).toHaveValue('');await input.fill(value);await page.getByRole('button',{name:'Confirm notebook entry',exact:true}).click();}
/** Reads through one band; types the given transcription, or the displayed magnitude to three decimals. */
async function measure(page:Page,band:'V'|'B',typed?:string){await page.getByLabel('Photometer filter',{exact:true}).selectOption(band);await run(page);const shown=(await page.getByTestId('photo-magnitude').textContent())!;expect(Number.isFinite(Number(shown))).toBe(true);const value=typed??Number(shown).toFixed(3);await record(page,band,value);return value;}
async function lastOption(page:Page,label:string){return (await page.getByLabel(label,{exact:true}).locator('option').last().getAttribute('value'))!;}
async function color(page:Page){await page.getByLabel('Saved B reading',{exact:true}).selectOption(await lastOption(page,'Saved B reading'));await page.getByLabel('Saved V reading',{exact:true}).selectOption(await lastOption(page,'Saved V reading'));await page.getByRole('button',{name:'Calculate B−V',exact:true}).click();}
async function skies(page:Page){await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');for(const band of ['V','B']as const){await page.getByLabel('Photometer filter',{exact:true}).selectOption(band);await run(page);}}
/** Bench path without a hot list: Activate moves the telescope to the bench target's field (existing behaviour). */
async function benchPairs(page:Page,pairs:readonly Readonly<{target:string;v:string;b:string;color?:boolean}>[]){
 await toPhotometer(page);await activate(page).click();await ready(page);await skies(page);
 const select=page.getByLabel('Photometry target',{exact:true});
 for(const p of pairs){
  if(await select.inputValue()!==p.target)await select.selectOption(p.target);else await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');
  await expect(select).toHaveValue(p.target);await measure(page,'V',p.v);await measure(page,'B',p.b);
  if(p.color!==false){await color(page);await expect(page.getByTestId('photo-manual-bv')).toHaveText(String(Number(p.b)-Number(p.v)));}
 }
}
const A='N2230.DAT@145877',B='N2230.DAT@144496';
async function trial(page:Page,age='8.00'){const o=ownView(page);await o.getByLabel(labels.modulus,{exact:true}).fill('5.50');await o.getByLabel(labels.ebv,{exact:true}).fill('0.04');await o.getByLabel(labels.age,{exact:true}).fill(age);await o.getByLabel(labels.model,{exact:true}).selectOption('4');await o.getByLabel(labels.correction,{exact:true}).check();await expect(o.getByTestId('own-hr-native-isochrone')).toHaveCount(1);}
async function saveInvestigation(page:Page){const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();return readFile((await(await wait).path())!);}
const restoreInvestigation=(page:Page,bytes:Buffer,name='own-hr.json')=>page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:bytes});
const duplicateIds=(page:Page)=>page.evaluate(()=>{const seen=new Map<string,number>();for(const e of document.querySelectorAll('[id]'))seen.set(e.id,(seen.get(e.id)??0)+1);return [...seen].filter(([id,n])=>n>1&&/native|own-hr|^db-|cluster|photo-|cnhr/.test(id)).map(([id])=>id);});
const noOverflow=(page:Page)=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);

test('row 1 and all 24 own pairs reach Data from Observations: own (0.25, 9.875) at native pixels 170/235.5, manual trial report, confirm, Save and fresh-context Restore',async({page,browser,baseURL})=>{
 test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const seven=PLEIADES_ADMITTED_ROWS.find(r=>r.catalogId===SEVEN);expect(seven).toBeDefined();expect(PLEIADES_ADMITTED_ROWS).toHaveLength(24);
 await open(page);await page.getByRole('heading',{name:'Original hot lists',exact:true}).click();await page.getByRole('button',{name:'Load exercise list (PLEIADES.HTL)',exact:true}).click();await expect(page.locator('#htl-rows option')).toHaveCount(24);
 const asset=await readFile(new URL('../public/original/hotlists/PLEIADES.HTL',import.meta.url));expect(asset.length).toBe(PLEIADES_HTL.bytes);expect(sha(asset)).toBe(PLEIADES_HTL.sha256);
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await page.locator('#htl-rows').selectOption('0');await page.getByRole('button',{name:'Point to HTL selection',exact:true}).click();
 const card=page.getByTestId('pleiades-point-card');await expect(card).toHaveAttribute('data-admitted','true');await expect(card).toContainText('01799-01442');
 await toPhotometer(page,()=>card.getByRole('button',{name:'Measure with photometer',exact:true}).click());await activate(page).click();
 const select=page.getByLabel('Photometry target',{exact:true});await expect(select).toHaveValue(B);await ready(page);
 await page.getByLabel('Seconds per integration',{exact:true}).selectOption('1');await page.getByLabel('Number of integrations',{exact:true}).selectOption('3');
 await skies(page);await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');
 for(const [i,row] of PLEIADES_ADMITTED_ROWS.entries()){
  if(i>0)await select.selectOption(row.catalogId);await expect(select).toHaveValue(row.catalogId);
  const own=row.catalogId===SEVEN,v=await measure(page,'V',own?'9.875':undefined),b=await measure(page,'B',own?'10.125':undefined);await color(page);
  await expect(page.getByTestId('photo-manual-bv')).toHaveText(String(Number((Number(b)-Number(v)).toFixed(3))));
  // The acquired color is never the plotted value: star 7 plots only the learner's typed pair.
  if(own){await expect(page.getByTestId('photo-manual-bv')).toHaveText('0.25');expect(await page.getByTestId('photo-acquired-bv').textContent()).not.toBe('0.25');}
 }
 await expect(page.locator('.photometer-notebook tbody tr')).toHaveCount(48);
 await page.getByLabel('Your vertical shift m−M (mag)',{exact:true}).fill('5.5');await page.getByRole('button',{name:'Confirm manual cluster fit',exact:true}).click();await expect(page.getByTestId('pleiades-distance-pc')).toHaveText('125.892541');
 await openHeaderTools(page);await page.getByTestId('pleiades-lab-open').click();await expect(page.getByTestId('pleiades-lab-counts')).toHaveText('Guide steps done: 8/8');await expect(page.getByTestId('pleiades-lab-observations')).toBeVisible();await page.getByTestId('pleiades-lab-close').click();
 // Explicit handoff: the photometer is released synchronously (no draw), and the own view opens with its summary focused.
 const seed=await page.getByTestId('photo-seed').textContent();await expect(page.getByTestId('photo-phase')).toHaveText('Integration complete');
 await withClock(page,async()=>{await page.getByTestId('photo-open-hr').click();await expect(ownView(page)).toBeVisible();});
 await expect(page.getByTestId('own-hr-disclosure')).toHaveAttribute('open','');await expect(page.getByTestId('own-hr-summary')).toBeFocused();
 const o=ownView(page);await expect(o.getByTestId('own-hr-pairs')).toHaveText('Your confirmed pairs: 24 of 24 admitted stars.');await expect(o.getByTestId('own-hr-source')).toContainText('never used');await expect(o.getByTestId('own-hr-adaptation')).toContainText('Adaptation:');
 const point=o.locator(`[data-testid=own-hr-native-observed-point][data-target="${SEVEN}"]`);await expect(point).toHaveAttribute('cx',String(frameX(.25)));await expect(point).toHaveAttribute('cy',String(frameY(9.875)));expect([frameX(.25),frameY(9.875)]).toEqual([170,235.5]);
 const rows=o.getByTestId('own-hr-pair');await expect(rows).toHaveCount(24);expect((await rows.evaluateAll(r=>r.map(e=>e.getAttribute('data-target')!))).sort()).toEqual(PLEIADES_ADMITTED_ROWS.map(r=>r.catalogId).sort());
 const outside=await o.locator('[data-testid=own-hr-pair][data-outside=true]').count();await expect(o.getByTestId('own-hr-native-observed-point')).toHaveCount(24-outside);
 const row7=o.locator(`[data-testid=own-hr-pair][data-target="${SEVEN}"]`);for(const text of ['9.875','10.125','0.25','B reading',SEVEN])await expect(row7).toContainText(text);await expect(row7).not.toHaveAttribute('data-outside','true');
 // No catalog/DAT identity in the own view; reference and DAT identifiers stay separate.
 await expect(o.getByTestId('native-observed-point')).toHaveCount(0);await expect(o.getByTestId('db-hr-report')).toHaveCount(0);expect(await duplicateIds(page)).toEqual([]);
 await toPhotometer(page);await expect(page.getByTestId('photo-phase')).toHaveText(/Inactive/);await expect(page.getByTestId('photo-seed')).toHaveText(seed!);await toDatabase(page);
 // Manual trial by text and keyboard (the E(B−V) slider), for this explicitly chosen trial only; no answer is supplied.
 await o.getByLabel(labels.modulus,{exact:true}).fill('5.50');const ebv=o.getByLabel(sliders.ebv,{exact:true});await expect(ebv).toHaveAttribute('aria-valuetext','not set');await ebv.focus();await page.keyboard.press('Home');await expect(o.getByLabel(labels.ebv,{exact:true})).toHaveValue('0.00');
 for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');await expect(o.getByLabel(labels.ebv,{exact:true})).toHaveValue('0.04');await expect(o.getByTestId('own-hr-slider-ebv')).toHaveText('0.04');
 await o.getByLabel(labels.age,{exact:true}).fill('8.00');await o.getByLabel(labels.model,{exact:true}).selectOption('4');await o.getByLabel(labels.correction,{exact:true}).check();await expect(o.getByTestId('own-hr-native-isochrone')).toHaveCount(1);
 await expect(o.getByTestId('own-hr-native-preview')).toContainText('100 Myr · 119.124201 pc · applied A_V=0.12 mag');
 await o.getByText('View/Print Parameters',{exact:true}).click();await expect(o.getByTestId('own-hr-hr-report-kind')).toHaveText('Current trial (unconfirmed)');await expect.poll(()=>o.getByTestId('own-hr-hr-report').textContent()).toBe(ownLines);
 await expect(o.getByRole('button',{name:'Print this report',exact:true})).toHaveCount(0);
 await o.getByLabel(labels.note,{exact:true}).fill(NOTE);await o.getByRole('button',{name:'Confirm chosen model fit',exact:true}).click();
 await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveText('8');await expect(o.getByTestId('own-hr-native-confirmed-distance')).toHaveText('119.124201');await expect(o.getByTestId('own-hr-native-confirmed-interpretation')).toHaveText(NOTE);await expect(o.getByTestId('own-hr-refused')).toHaveCount(0);
 await expect(o.getByTestId('own-hr-hr-report-kind')).toHaveText('Confirmed result');expect(await o.getByTestId('own-hr-hr-report').textContent()).toBe(ownLines);await expect(o.getByText('Confirmed against 24 of your confirmed B/V pairs',{exact:false})).toBeVisible();
 // The photometer's own model-fit section shows the same single confirmation.
 await toPhotometer(page);await expect(photometerRoute(page).getByTestId('native-confirmed-logage')).toHaveText('8');await expect(photometerRoute(page).getByTestId('native-confirmed-interpretation')).toHaveText(NOTE);await toDatabase(page);
 await o.getByLabel(labels.age,{exact:true}).fill('8.05');await expect(o.getByTestId('own-hr-hr-report-kind')).toHaveText('Current trial (unconfirmed)');await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveText('8');
 const lab=page.locator('.cluster-database-lab'),guide=page.getByTestId('cluster-lab-dialog');await lab.getByTestId('cluster-lab-open').click();
 await expect(guide.getByTestId('cluster-lab-counts')).toHaveText('0 of 5 database steps show an action or result.');await expect(guide.getByTestId('cluster-lab-own-pairs')).toHaveText('Your confirmed photometer pairs: 24 of 24 admitted stars.');await expect(guide.getByTestId('cluster-lab-own-fit')).toHaveAttribute('data-confirmed','true');await guide.getByTestId('cluster-lab-close').click();
 await page.screenshot({path:'test-results/pleiades-hr-observations-desktop.png',fullPage:true});
 const bytes=await saveInvestigation(page),json=JSON.parse(bytes.toString()),text=bytes.toString();
 expect(json.version).toBe(17);expect(json.photometry.version).toBe(11);/* owner 11: the history names the variable-field targets (rows 3, 5, 10) */expect(json.photometry.events.length).toBeLessThanOrEqual(256);expect(json.editingPolicy).toBe('OpenVireo-editing-workspace-v3');expect(json.editing.photometry.nativeClusterDraft.logAge).toBe('8.05');
 expect(json.photometry.events.filter((e:{type:string})=>e.type==='nativeClusterFit')).toEqual([{type:'nativeClusterFit',modulusTicks:550,ebvTicks:4,ageIndex:4,modelIndex:4,offsetTicks:0,extinctionCorrected:true,interpretation:NOTE}]);
 for(const s of ['own-hr','ownHr','my confirmed B/V','Data from Observations'])expect(text).not.toContain(s);
 const context=await browser.newContext({baseURL}),other=await context.newPage();
 try{other.on('pageerror',e=>errors.push(e.message));await open(other,'#cluster-database');await withClock(other,async()=>{await restoreInvestigation(other,bytes);await expect(other.getByText(restored,{exact:true})).toBeVisible();});
  await openOwn(other);const r=ownView(other);await expect(r.getByTestId('own-hr-pairs')).toHaveText('Your confirmed pairs: 24 of 24 admitted stars.');
  const p=r.locator(`[data-testid=own-hr-native-observed-point][data-target="${SEVEN}"]`);await expect(p).toHaveAttribute('cx','170');await expect(p).toHaveAttribute('cy','235.5');
  await expect(r.getByTestId('own-hr-native-confirmed-logage')).toHaveText('8');await expect(r.getByTestId('own-hr-native-confirmed-interpretation')).toHaveText(NOTE);await expect(r.getByLabel(labels.age,{exact:true})).toHaveValue('8.05');await expect(r.getByLabel(labels.note,{exact:true})).toHaveValue(NOTE);
  expect(await saveInvestigation(other)).toEqual(bytes);
  await toPhotometer(other);await expect(other.getByTestId('photo-phase')).toHaveText(/Inactive/);await activate(other).click();await expect(other.getByLabel('Photometry target',{exact:true})).toHaveValue(PLEIADES_ADMITTED_ROWS.at(-1)!.catalogId);await expect(other.getByRole('button',{name:'Start integration',exact:true})).toBeDisabled();
 }finally{await context.close();}
 expect(errors).toEqual([]);
});

test('a guide link invoked while integrating releases the photometer with no draw; the direct button is disabled while running',async({page})=>{
 test.setTimeout(120000);await open(page);await toPhotometer(page);await activate(page).click();await ready(page);await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');
 const seed=await page.getByTestId('photo-seed').textContent();await page.getByRole('button',{name:'Start integration',exact:true}).click();
 // The clock stays paused, so the integration is still running when the link is used.
 await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeDisabled();await expect(page.getByTestId('photo-phase')).not.toHaveText(/Inactive|Integration complete/);
 await expect(page.getByTestId('photo-open-hr')).toBeDisabled();
 // The link releases synchronously; only afterwards does the clock run for the lazy view.
 await openHeaderTools(page);await page.getByTestId('pleiades-lab-open').click();await page.getByTestId('pleiades-lab-observations').click();await withClock(page,async()=>{await expect(page.getByTestId('own-hr-summary')).toBeVisible();});
 await expect(page.getByTestId('pleiades-lab-dialog')).toBeHidden();await expect(page.getByTestId('own-hr-disclosure')).toHaveAttribute('open','');await expect(page.getByTestId('own-hr-summary')).toBeFocused();
 await expect(ownView(page).getByTestId('own-hr-pairs')).toHaveText('Your confirmed pairs: 0 of 24 admitted stars.');await expect(ownView(page).getByTestId('own-hr-empty')).toBeVisible();
 // A later timer cannot draw: the integration was stopped and deactivated before the view changed.
 await page.clock.runFor(3000);await toPhotometer(page);await expect(page.getByTestId('photo-phase')).toHaveText(/Inactive/);await expect(page.getByTestId('photo-seed')).toHaveText(seed!);await expect(page.getByTestId('photo-magnitude')).toHaveText('—');
 // The cluster guide link opens the same view (already on its route).
 await toDatabase(page);await page.locator('.cluster-database-lab').getByTestId('cluster-lab-open').click();await page.getByTestId('cluster-lab-own-open').click();await expect(page.getByTestId('cluster-lab-dialog')).toBeHidden();await expect(page.getByTestId('own-hr-summary')).toBeFocused();
});

test('320px: empty, unconfirmed and one-pair gating; a recalculated pair clears the fit; a stale confirmation is refused and keeps the trial',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:320,height:800});await open(page);await toDatabase(page);await openOwn(page);const o=ownView(page),confirm=o.getByRole('button',{name:'Confirm chosen model fit',exact:true});
 await expect(o.getByTestId('own-hr-pairs')).toHaveText('Your confirmed pairs: 0 of 24 admitted stars.');await expect(o.getByTestId('own-hr-empty')).toBeVisible();await expect(o.getByTestId('own-hr-minimum')).toContainText('two or more pairs');
 await trial(page);await expect(confirm).toBeDisabled();
 // A recorded V and B without Calculate B−V is not a pair.
 await benchPairs(page,[{target:A,v:'9.5',b:'10',color:false}]);await toDatabase(page);await expect(o.getByTestId('own-hr-pairs')).toContainText('0 of 24');await expect(confirm).toBeDisabled();
 await toPhotometer(page);await color(page);await expect(page.getByTestId('photo-manual-bv')).toHaveText('0.5');await toDatabase(page);
 await expect(o.getByTestId('own-hr-pairs')).toContainText('1 of 24');await expect(o.getByTestId('own-hr-pair')).toHaveCount(1);await expect(confirm).toBeDisabled();
 await toPhotometer(page);await activate(page).click();await skies(page);await page.getByLabel('Photometry target',{exact:true}).selectOption(B);await measure(page,'V','10.25');await measure(page,'B','11');await color(page);await expect(page.getByTestId('photo-manual-bv')).toHaveText('0.75');
 await toDatabase(page);await expect(o.getByTestId('own-hr-pairs')).toContainText('2 of 24');await expect(o.getByTestId('own-hr-native-observed-point')).toHaveCount(2);await expect(confirm).toBeEnabled();
 await confirm.click();await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveText('8');await expect(o.getByText('Confirmed against 2 of your confirmed B/V pairs',{exact:false})).toBeVisible();
 // An identical recalculation in the photometer clears the confirmation (existing core rule).
 await toPhotometer(page);await page.getByRole('button',{name:'Calculate B−V',exact:true}).click();await toDatabase(page);await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveCount(0);
 // Synthetic race: the photometer recalculates the same pair and the own view confirms from its previous render in the same
 // task. The numbers are identical, but the source is not: the confirmation is refused and the typed trial is kept.
 await trial(page,'8.05');await o.getByLabel(labels.note,{exact:true}).fill('Stale attempt');await expect(confirm).toBeEnabled();
 await page.evaluate(()=>{const calc=[...document.querySelectorAll<HTMLButtonElement>('main.photometer-main:not(.cluster-database-lab) button')].find(b=>b.textContent==='Calculate B−V')!;calc.click();document.querySelector<HTMLButtonElement>('#own-hr-native-confirm')!.click();});
 await expect(o.getByTestId('own-hr-refused')).toBeVisible();await expect(o.getByTestId('own-hr-confirm-error')).toHaveCount(0);await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveCount(0);await expect(o.getByLabel(labels.age,{exact:true})).toHaveValue('8.05');await expect(o.getByLabel(labels.note,{exact:true})).toHaveValue('Stale attempt');
 await toPhotometer(page);await expect(photometerRoute(page).getByTestId('native-confirmed-logage')).toHaveCount(0);await toDatabase(page);
 // From the current render the same trial confirms.
 await confirm.click();await expect(o.getByTestId('own-hr-refused')).toHaveCount(0);await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveText('8.05');
 // Keyboard slider, scrollable chart region and the pairs table stay within a 320px page.
 const modulus=o.getByLabel(sliders.modulus,{exact:true});await modulus.focus();await page.keyboard.press('ArrowLeft');await expect(o.getByLabel(labels.modulus,{exact:true})).toHaveValue('5.49');
 const region=o.getByRole('region',{name:'Scrollable native cluster model diagram',exact:true});await region.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>region.evaluate(e=>e.scrollLeft>0)).toBe(true);
 expect(await noOverflow(page)).toBe(true);await o.screenshot({path:'test-results/pleiades-hr-observations-320.png'});
});

test('own confirmations until the existing photometer budget refuses: the own view reports the limit, keeps the trial, prior fit and pairs, and leaves no hidden photometer alert',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);await benchPairs(page,[{target:A,v:'9.5',b:'10'},{target:B,v:'10.25',b:'11'}]);
 const seed=await page.getByTestId('photo-seed').textContent();await expect(page.locator('.photometer-notebook tbody tr')).toHaveCount(4);
 await toDatabase(page);await openOwn(page);const o=ownView(page),confirm=o.getByRole('button',{name:'Confirm chosen model fit',exact:true});
 const failure=o.getByTestId('own-hr-confirm-error'),refused=o.getByTestId('own-hr-refused'),confirmed=o.getByTestId('own-hr-native-confirmed-interpretation');
 await trial(page);
 // Distinct maximum-length interpretations; the existing core event/byte admission decides when the journal is full.
 let last='',note='',limited=false;
 for(let i=0;i<256&&!limited;i++){
  note=String(i).padStart(4,'0')+'x'.repeat(496);expect(note).toHaveLength(500);
  for(const[k,v]of[['modulus','5.50'],['ebv','0.04'],['age','8.00']]as const)await o.getByLabel(labels[k],{exact:true}).fill(v);
  await o.getByLabel(labels.note,{exact:true}).fill(note);await expect(confirm).toBeEnabled();await confirm.click();
  await expect(failure.or(refused).or(confirmed.filter({hasText:note}))).toHaveCount(1,{timeout:10000});
  if(await failure.count()||await refused.count())limited=true;else last=note;
 }
 expect(limited).toBe(true);expect(last).not.toBe('');
 await expect(failure).toHaveAttribute('data-reason','limit');await expect(failure).toHaveText('The photometer session reached its callback, event or file-size limit. Save existing work before starting a new seeded session.');await expect(refused).toHaveCount(0);
 // The failed trial is kept as typed; the prior confirmed interpretation and the learner's pairs are unchanged.
 await expect(o.getByLabel(labels.note,{exact:true})).toHaveValue(note);for(const[k,v]of[['modulus','5.50'],['ebv','0.04'],['age','8.00'],['model','4']]as const)await expect(o.getByLabel(labels[k],{exact:true})).toHaveValue(v);
 await expect(confirmed).toHaveText(last);await expect(o.getByTestId('own-hr-hr-report-kind')).toHaveText('Current trial (unconfirmed)');
 await expect(o.getByTestId('own-hr-pairs')).toContainText('2 of 24');const rows=o.getByTestId('own-hr-pair');await expect(rows).toHaveCount(2);
 for(const[target,v,b]of[[A,'9.5','10'],[B,'10.25','11']]as const){const row=o.locator(`[data-testid=own-hr-pair][data-target="${target}"]`);await expect(row).toContainText(v);await expect(row).toContainText(b);}
 // The hidden photometer route gained no alert from the own-view failure.
 await expect(photometerRoute(page).locator('[role=alert]')).toHaveCount(0);
 await toPhotometer(page);await expect(photometerRoute(page).locator('[role=alert]')).toHaveCount(0);await expect(page.getByTestId('photo-seed')).toHaveText(seed!);
 await expect(page.locator('.photometer-notebook tbody tr')).toHaveCount(4);await expect(photometerRoute(page).getByTestId('native-confirmed-interpretation')).toHaveText(last);
 expect(errors).toEqual([]);
});

test('a held investigation Restore disables the own view; after cancel its late completion changes nothing',async({page})=>{
 test.setTimeout(150000);await open(page);await benchPairs(page,[{target:A,v:'9.5',b:'10'},{target:B,v:'10.25',b:'11'}]);await toDatabase(page);await openOwn(page);const o=ownView(page);
 await trial(page);await o.getByRole('button',{name:'Confirm chosen model fit',exact:true}).click();await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveText('8');
 await o.getByLabel(labels.age,{exact:true}).fill('8.05');const saved=await saveInvestigation(page);await o.getByLabel(labels.age,{exact:true}).fill('8.10');
 await page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){return new Promise(resolve=>{(window as unknown as{releaseRead:()=>void}).releaseRead=()=>{File.prototype.arrayBuffer=original;void original.call(this).then(resolve);};});};});
 await restoreInvestigation(page,saved,'held.json');
 await expect(o.getByLabel(labels.age,{exact:true})).toBeDisabled();await expect(o.getByRole('button',{name:'Confirm chosen model fit',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();await expect(o.getByLabel(labels.age,{exact:true})).toBeEnabled();
 // Let the late read finish with page timers running; nothing may be applied.
 await page.clock.resume();await page.evaluate(()=>(window as unknown as{releaseRead:()=>void}).releaseRead());await page.waitForTimeout(1000);await pause(page);
 await expect(page.getByText(restored,{exact:true})).toHaveCount(0);await expect(o.getByLabel(labels.age,{exact:true})).toHaveValue('8.10');await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveText('8');
 // A completed Restore applies explicitly and the view follows the restored canonical state.
 await withClock(page,async()=>{await restoreInvestigation(page,saved,'again.json');await expect(page.getByText(restored,{exact:true})).toBeVisible();});await expect(o.getByLabel(labels.age,{exact:true})).toHaveValue('8.05');await expect(o.getByTestId('own-hr-pairs')).toContainText('2 of 24');
});

test('own model loads: a failed model keeps the trial and retries; a late model never replaces the newer choice',async({page})=>{
 test.setTimeout(90000);await open(page,'#cluster-database');await openOwn(page);const o=ownView(page);
 let seen=false,release:()=>Promise<void>=async()=>{};await page.route('**/native-isochrones-008*.json*',async r=>{seen=true;await new Promise<void>(resolve=>{release=async()=>{await r.continue();resolve();};});});
 await o.getByLabel(labels.modulus,{exact:true}).fill('5.50');await o.getByLabel(labels.ebv,{exact:true}).fill('0.04');await o.getByLabel(labels.age,{exact:true}).fill('8.00');await o.getByLabel(labels.model,{exact:true}).selectOption('3');await expect.poll(()=>seen).toBe(true);
 await expect(o.getByText('Loading the selected original model…',{exact:true})).toBeVisible();await expect(o.getByTestId('own-hr-native-isochrone')).toHaveCount(0);
 await o.getByLabel(labels.model,{exact:true}).selectOption('4');await expect(o.getByTestId('own-hr-native-isochrone')).toHaveCount(1);
 const late=page.waitForResponse(r=>/native-isochrones-008/.test(r.url())&&r.status()===200);await release();await(await late).finished();
 await expect(o.getByLabel(labels.model,{exact:true})).toHaveValue('4');await o.getByText('View/Print Parameters',{exact:true}).click();await expect.poll(()=>o.getByTestId('own-hr-hr-report').textContent()).toContain('(Solar Values)');await page.unroute('**/native-isochrones-008*.json*');
 await page.route('**/native-isochrones-030*.json*',r=>r.abort());await o.getByLabel(labels.model,{exact:true}).selectOption('5');
 await expect(o.getByText('The selected model could not load. Retry the selected model; confirmed work is retained.',{exact:true})).toBeVisible();await expect(o.getByTestId('own-hr-native-isochrone')).toHaveCount(0);
 for(const[k,v]of[['modulus','5.50'],['ebv','0.04'],['age','8.00'],['model','5']]as const)await expect(o.getByLabel(labels[k],{exact:true})).toHaveValue(v);
 await page.unroute('**/native-isochrones-030*.json*');await o.getByRole('button',{name:'Retry selected model',exact:true}).click();await expect(o.getByTestId('own-hr-native-isochrone')).toHaveCount(1);
 // No pairs: nothing can be confirmed however complete the trial is.
 await expect(o.getByRole('button',{name:'Confirm chosen model fit',exact:true})).toBeDisabled();
});

test('legacy raw6 photometer session: its pairs appear without a native fit and the raw bytes stay identical',async({page})=>{
 test.setTimeout(150000);await open(page);await benchPairs(page,[{target:A,v:'9.5',b:'10'},{target:B,v:'10.25',b:'11'}]);
 await page.getByLabel('Your vertical shift m−M (mag)',{exact:true}).fill('5.5');await page.getByRole('button',{name:'Confirm manual cluster fit',exact:true}).click();
 const save=async()=>{const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Save photometer session',exact:true}).click();return readFile((await(await wait).path())!);};
 const raw6=await save();expect(JSON.parse(raw6.toString()).version).toBe(6);
 await page.clock.resume();await page.reload();await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();await pause(page);
 await withClock(page,async()=>{await page.locator('#photo-file').setInputFiles({name:'raw6.json',mimeType:'application/json',buffer:raw6});await expect(page.locator('.photometer-notebook tbody tr')).toHaveCount(4);});
 await toDatabase(page);await openOwn(page);const o=ownView(page);await expect(o.getByTestId('own-hr-pairs')).toContainText('2 of 24');await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveCount(0);await expect(o.getByText('No native model fit is confirmed.',{exact:false})).toBeVisible();
 await toPhotometer(page);await expect(page.getByTestId('pleiades-confirmed-modulus')).toHaveText('5.5');expect(await save()).toEqual(raw6);
});

test('own fit, M67 reference fit and imported DAT results stay independent through Save and fresh Restore; no duplicate identifiers',async({page,browser,baseURL})=>{
 test.setTimeout(200000);await open(page);await benchPairs(page,[{target:A,v:'9.5',b:'10'},{target:B,v:'10.25',b:'11'}]);await toDatabase(page);
 const lab=page.locator('.cluster-database-lab');await lab.getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');await withClock(page,async()=>{await lab.getByRole('button',{name:'Load selected dataset',exact:true}).click();await expect(lab.getByTestId('cluster-reference-count')).toContainText('506');});
 await lab.getByLabel(labels.modulus,{exact:true}).fill('9.50');await lab.getByLabel(labels.age,{exact:true}).fill('9.60');await lab.getByLabel(labels.model,{exact:true}).selectOption('4');await lab.getByRole('button',{name:'Confirm chosen model fit',exact:true}).click();await expect(lab.getByTestId('native-confirmed-logage')).toHaveText('9.6');
 await openOwn(page);const o=ownView(page);await trial(page);await o.getByRole('button',{name:'Confirm chosen model fit',exact:true}).click();await expect(o.getByTestId('own-hr-native-confirmed-logage')).toHaveText('8');
 // Each confirmation leaves the other unchanged.
 await expect(lab.getByTestId('native-confirmed-logage')).toHaveText('9.6');await expect(lab.getByTestId('native-confirmed-ebv')).toHaveText('0.03');await expect(o.getByTestId('own-hr-native-confirmed-ebv')).toHaveText('0.04');
 // Synthetic 144-byte DAT format vector (not an observation): plotted only in its own workspace and downloaded byte-exactly.
 const record=(r:Readonly<{time:number;object:string;kind:number;v:number;b:number}>)=>{const ext=(value:number)=>{const out=Buffer.alloc(10);if(value===0)return out;const d=Buffer.alloc(8);d.writeDoubleLE(value,0);const bits=d.readBigUInt64LE(0),exp=Number(bits>>52n&0x7ffn),frac=bits&((1n<<52n)-1n);out.writeBigUInt64LE(1n<<63n|frac<<11n,0);out.writeUInt16LE(exp-1023+16383|Number(bits>>63n)<<15,8);return out;};const b=Buffer.alloc(144);b[0]=r.object.length;b.write(r.object,1,'latin1');b.writeDoubleLE(r.time,16);ext(r.b).copy(b,54);ext(r.v).copy(b,64);b[94]=r.kind;return b;};
 const dat=record({time:1.5,object:'HD 4',kind:1,v:8,b:9});
 await withClock(page,async()=>{await page.getByText('HR diagram from saved observations',{exact:true}).click();await expect(page.getByRole('heading',{name:'HR diagram from your observation results',exact:true})).toBeVisible();});
 await page.getByLabel('Load saved observation results (DAT)',{exact:true}).setInputFiles({name:'night.dat',mimeType:'application/octet-stream',buffer:dat});await page.getByRole('button',{name:'Add to current results',exact:true}).click();
 await page.getByRole('button',{name:'Plot data from observations',exact:true}).click();await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 1');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download current results (DAT)',exact:true}).click();expect((await readFile((await(await download).path())!)).equals(dat)).toBe(true);
 await expect(o.getByTestId('own-hr-pairs')).toContainText('2 of 24');await expect(o.getByTestId('own-hr-native-observed-point')).toHaveCount(2);
 await toPhotometer(page);expect(await duplicateIds(page)).toEqual([]);await toDatabase(page);
 const bytes=await saveInvestigation(page),raw=JSON.parse(bytes.toString()),text=bytes.toString();expect([19,20]).toContain(raw.version);
 expect(raw.base.photometry.events.filter((e:{type:string})=>e.type==='nativeClusterFit')).toHaveLength(1);for(const s of ['HD 4','night.dat','own-hr'])expect(text).not.toContain(s);
 const context=await browser.newContext({baseURL}),other=await context.newPage();
 try{await open(other,'#cluster-database');await withClock(other,async()=>{await restoreInvestigation(other,bytes);await expect(other.getByText(restored,{exact:true})).toBeVisible();});
  expect(await saveInvestigation(other)).toEqual(bytes);await openOwn(other);await expect(ownView(other).getByTestId('own-hr-native-confirmed-logage')).toHaveText('8');await expect(ownView(other).getByTestId('own-hr-native-confirmed-ebv')).toHaveText('0.04');
  const l=other.locator('.cluster-database-lab');await expect(l.getByTestId('cluster-reference-count')).toContainText('506');await expect(l.getByTestId('native-confirmed-logage')).toHaveText('9.6');await expect(l.getByTestId('native-confirmed-ebv')).toHaveText('0.03');
  // The DAT workspace is not part of the investigation.
  await withClock(other,async()=>{await other.getByText('HR diagram from saved observations',{exact:true}).click();await expect(other.getByTestId('cnhr-current')).toHaveText('Current results: 0 records in the original time/RA order.');});
 }finally{await context.close();}
});
