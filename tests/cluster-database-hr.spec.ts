import{test,expect,type Page}from'@playwright/test';import{readFile}from'node:fs/promises';
import contract from'../data/photometry/cluster-comparison-contract.json'with{type:'json'};
import dor from'../data/photometry/cluster-reference-30dor.json'with{type:'json'};
const labels={modulus:'Trial apparent modulus V−Mv · 0–15, step 0.01',ebv:'Trial color excess E(B−V) · 0–2.50, step 0.01',age:'Trial log10(age/yr) · 7.80–10.25, step 0.05',model:'Trial metallicity model',offset:'Extra isochrone B−V offset · −1–1, step 0.01',note:'Your interpretation of the trial fit (optional)',correction:'Apply the original optional extinction correction to distance'};
const sliders={modulus:'Slider: apparent modulus V−Mv',ebv:'Slider: color excess E(B−V)',age:'Slider: log10(age/yr)',offset:'Slider: extra isochrone B−V offset'};
const info=(id:string)=>contract.clusters.find(c=>c.id===id)!;
const panel=(p:Page)=>p.locator('.cluster-database-lab'),choice=(p:Page)=>panel(p).getByLabel('Reference point to inspect or exclude',{exact:true});
const guide=(p:Page)=>p.getByTestId('cluster-lab-dialog'),report=(p:Page)=>panel(p).getByTestId('db-hr-report'),reportText=(p:Page)=>report(p).textContent();
const restored='Investigation restored. Included tools were validated together. Exposure segments are stopped and deactivated; activate explicitly before continuing.';
// Independent control:hard-coded native frame on stored source values(not the app helper).
const inFrame=(p:{bMinusV:number;v:number})=>p.bMinusV>=-.5&&p.bMinusV<=2.5&&p.v>=2&&p.v<=18;
const OUTSIDE_30DOR=['S6730.DAT@56750','S6730.DAT@57359','S6730.DAT@58515'];
async function open(p:Page){await p.goto('/#cluster-database');await expect(panel(p).getByRole('heading',{name:'Star-cluster database laboratory',exact:true})).toBeVisible();}
async function load(p:Page,id:string){const c=info(id);await panel(p).getByLabel('Reference cluster dataset',{exact:true}).selectOption(id);await panel(p).getByRole('button',{name:'Load selected dataset',exact:true}).click();await expect(panel(p).getByTestId('cluster-reference-count')).toHaveText(`${c.name} reference dataset loaded: ${c.rows} catalog points with B−V. No photons or notebook readings were created.`);}
async function save(p:Page){const d=p.waitForEvent('download');await p.getByRole('button',{name:'Save investigation',exact:true}).click();return readFile((await(await d).path())!);}
async function restore(p:Page,bytes:Buffer,name='hr.json'){await p.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:bytes});}
async function exclude(p:Page,id:string){await choice(p).selectOption(id);await panel(p).getByRole('button',{name:'Exclude selected point…',exact:true}).click();await p.getByRole('button',{name:'Confirm point exclusion',exact:true}).click();await expect(p.getByRole('dialog')).toHaveCount(0);}
async function counts(p:Page,done:number){await panel(p).getByTestId('cluster-lab-open').click();await expect(guide(p)).toBeVisible();await expect(guide(p).getByTestId('cluster-lab-counts')).toHaveText(`${done} of 5 database steps show an action or result.`);}
async function closeGuide(p:Page){await guide(p).getByTestId('cluster-lab-close').click();await expect(guide(p)).toBeHidden();}
const m67Lines=(name:string)=>['Cluster: '+name,'','From ZAMS fit:','  V-Mv = 9.50','  E(B-V) = 0.03','  Estimated Cluster Distance: 762 Parsecs','','Isochrone Model Parameters:','  Metallicity: [Z=0.019, Y=0.273] (Solar Values)','  Log(Age/yrs): 9.60','  Estimated Cluster Age: 3981 Million Years','  (B-V) Adjustment: 0.00'].join('\n');

test('30 Doradus native frame draws606 of609, lists3 outside rows separately from pupil exclusions and keeps every source row',async({page})=>{
 expect(dor).toHaveLength(609);expect(dor.filter(p=>!inFrame(p)).map(p=>p.id)).toEqual(OUTSIDE_30DOR);
 await open(page);await counts(page,0);await expect(guide(page).getByTestId('cluster-lab-step-load')).toHaveAttribute('data-next','true');
 // Item1.9: the own-observation route is live status with a link, never a pending text and never a counted step.
 await expect(guide(page).getByTestId('cluster-lab-pending')).toHaveCount(0);await expect(guide(page).getByTestId('cluster-lab-own-pairs')).toHaveText('Your confirmed photometer pairs: 0 of 24 admitted stars.');
 await expect(guide(page).getByTestId('cluster-lab-own-fit')).toHaveAttribute('data-confirmed','false');await expect(guide(page).getByTestId('cluster-lab-own-open')).toBeVisible();await expect(guide(page).getByTestId('cluster-lab-step-save')).toHaveCount(0);await expect(guide(page).getByTestId('cluster-lab-step-own')).toHaveCount(0);
 await guide(page).getByTestId('cluster-lab-continue').click();await expect(guide(page)).toBeHidden();await expect(panel(page).getByLabel('Reference cluster dataset',{exact:true})).toBeFocused();
 const c=info('30dor'),b=panel(page);await load(page,'30dor');
 await expect(b.getByLabel(labels.ebv,{exact:true})).toHaveValue(String(c.presetEbvTicks/100));await expect(b.getByTestId('cluster-reddening-source')).toContainText(`original ${c.name} catalog preset`);await expect(b.getByText(`New ${c.name} notebook: the catalog E(B−V) =`)).toBeVisible();
 for(const k of['modulus','age','model']as const)await expect(b.getByLabel(labels[k],{exact:true})).toHaveValue('');
 await expect(b.locator('.db-hr-scroll svg')).toHaveAttribute('viewBox','0 0 470 500');await expect(b.getByTestId('native-observed-point')).toHaveCount(606);
 await expect(b.getByTestId('db-hr-drawn-count')).toHaveText('Drawn inside the fixed native axes: 606. Outside these axes (not drawn; listed in the values table): 3.');
 await b.getByText('Inspect all reference data values',{exact:true}).click();const rows=b.locator('details').first().locator('tbody tr');await expect(rows).toHaveCount(609);
 expect(await rows.locator('td:first-child').allTextContents()).toEqual(dor.map(p=>p.id));await expect(b.locator('tr[data-outside=true] td:first-child')).toHaveText(OUTSIDE_30DOR);await expect(b.locator('tr[data-outside=true]').first()).toContainText('Included · outside the fixed native axes');
 await counts(page,2);await expect(guide(page).getByTestId('cluster-lab-step-inspect')).toHaveAttribute('data-done','true');await closeGuide(page);
 // An outside row can be inspected and excluded;it was never drawn,so only the pupil's count changes.
 await choice(page).selectOption(OUTSIDE_30DOR[0]!);await expect(b.getByTestId('cluster-selected-point')).toContainText('Included · outside the fixed native axes');await exclude(page,OUTSIDE_30DOR[0]!);
 await expect(b.getByTestId('cluster-point-selection-count')).toHaveText('Included: 608 · excluded: 1 · original dataset: 609');await expect(b.getByTestId('native-observed-point')).toHaveCount(606);await expect(b.getByTestId('db-hr-drawn-count')).toContainText('606. Outside these axes (not drawn; listed in the values table): 2.');
 await expect(rows).toHaveCount(609);await expect(rows.filter({hasText:OUTSIDE_30DOR[0]!})).toContainText('Excluded by you · outside the fixed native axes');
 const inside=dor.find(inFrame)!.id;await exclude(page,inside);await expect(b.getByTestId('native-observed-point')).toHaveCount(605);await expect(rows.filter({hasText:inside})).toContainText('Excluded by you');await expect(rows.filter({hasText:inside})).not.toContainText('outside');
 await b.getByRole('button',{name:'Restore all excluded points',exact:true}).click();await expect(b.getByTestId('native-observed-point')).toHaveCount(606);await expect(b.getByTestId('db-hr-drawn-count')).toContainText(': 3.');
 await b.screenshot({path:'test-results/cluster-database-hr-30dor.png'});
});

test('M67 text/slider trial never invents inputs or confirms;report follows the visible trial with762 parsecs and3981 Myr;print cleans up',async({page})=>{
 await open(page);await load(page,'m67');const b=panel(page),name=info('m67').name;
 await b.getByText('View/Print Parameters',{exact:true}).click();await expect(b.getByTestId('db-hr-report-kind')).toHaveText('Current trial (unconfirmed)');expect(await reportText(page)).toBe('Cluster: '+name);await expect(b.getByTestId('db-hr-report-empty')).toBeVisible();
 const modulus=b.getByLabel(sliders.modulus,{exact:true}),ebv=b.getByLabel(sliders.ebv,{exact:true}),age=b.getByLabel(sliders.age,{exact:true});
 await expect(modulus).toHaveAttribute('aria-valuetext','not set');await expect(b.getByTestId('db-slider-modulus')).toHaveText('— not set');await expect(ebv).toHaveValue('3');await expect(b.getByTestId('db-slider-ebv')).toHaveText('0.03');await expect(b.getByTestId('db-slider-offset')).toHaveText('0.00');
 await modulus.focus();await page.keyboard.press('End');await expect(b.getByLabel(labels.modulus,{exact:true})).toHaveValue('15.00');await page.keyboard.press('ArrowLeft');await expect(b.getByLabel(labels.modulus,{exact:true})).toHaveValue('14.99');
 for(const k of['age','model']as const)await expect(b.getByLabel(labels[k],{exact:true})).toHaveValue('');await expect(age).toHaveAttribute('aria-valuetext','not set');await expect(b.getByTestId('cluster-reddening-source')).toContainText('original M 67');
 await b.getByLabel(labels.modulus,{exact:true}).fill('9.50');await expect(modulus).toHaveValue('950');await expect(modulus).toHaveAttribute('aria-valuetext','9.50');
 await b.getByLabel(labels.age,{exact:true}).fill('9.6x');await expect(b.getByLabel(labels.age,{exact:true})).toHaveValue('9.6x');await expect(age).toHaveAttribute('aria-valuetext','not set');
 await age.focus();await page.keyboard.press('End');await expect(b.getByLabel(labels.age,{exact:true})).toHaveValue('10.25');await page.keyboard.press('Home');await expect(b.getByLabel(labels.age,{exact:true})).toHaveValue('7.80');await b.getByLabel(labels.age,{exact:true}).fill('9.60');await expect(age).toHaveValue('36');
 await b.getByLabel(labels.model,{exact:true}).selectOption('4');await b.getByLabel(labels.correction,{exact:true}).check();await expect(b.getByTestId('native-isochrone')).toHaveCount(1);
 await expect(b.getByTestId('native-confirmed-logage')).toHaveCount(0);await expect(b.getByTestId('cluster-reddening-source')).toContainText('Unapplied reddening source: original M 67');
 await expect(b.getByTestId('db-hr-report-kind')).toHaveText('Current trial (unconfirmed)');await expect.poll(()=>reportText(page)).toBe(m67Lines(name));
 await page.evaluate(()=>{window.print=()=>{(window as unknown as{printedWithClass:boolean}).printedWithClass=document.documentElement.classList.contains('printing-db-hr');window.dispatchEvent(new Event('afterprint'));};});
 await b.getByRole('button',{name:'Print this report',exact:true}).click();expect(await page.evaluate(()=>(window as unknown as{printedWithClass:boolean}).printedWithClass)).toBe(true);await expect(page.locator('html')).not.toHaveClass(/printing-db-hr/);
 await page.evaluate(()=>{window.print=()=>{throw new Error('blocked by test');};});await b.getByRole('button',{name:'Print this report',exact:true}).click();await expect(b.getByText('The browser could not start printing. The report above is unchanged.',{exact:true})).toBeVisible();await expect(page.locator('html')).not.toHaveClass(/printing-db-hr/);
 await counts(page,3);await expect(guide(page).getByTestId('cluster-lab-next')).toHaveAttribute('data-next','inspect');await closeGuide(page);
 await b.getByLabel(labels.note,{exact:true}).fill('My own M67 turnoff comparison by eye.');await b.getByRole('button',{name:'Confirm chosen model fit',exact:true}).click();await expect(b.getByTestId('native-confirmed-logage')).toHaveText('9.6');
 await expect(b.getByTestId('db-hr-report-kind')).toHaveText('Confirmed result');expect(await reportText(page)).toBe(m67Lines(name));
 await b.getByText('Inspect all reference data values',{exact:true}).click();await counts(page,5);await expect(guide(page).getByTestId('cluster-lab-next')).toHaveAttribute('data-next','preserve');await expect(guide(page).getByTestId('cluster-lab-continue')).toHaveCount(0);await expect(guide(page).getByTestId('cluster-lab-preserve')).toContainText('Save investigation');await closeGuide(page);
 // Moving E writes only E, marks it manual and leaves the confirmation in place until a new explicit confirmation.
 await ebv.focus();await page.keyboard.press('ArrowRight');await expect(b.getByLabel(labels.ebv,{exact:true})).toHaveValue('0.04');await expect(b.getByTestId('cluster-reddening-source')).toContainText('your manual input');await expect(b.getByTestId('native-confirmed-ebv')).toHaveText('0.03');
 await expect(b.getByTestId('db-hr-report-kind')).toHaveText('Current trial (unconfirmed)');await expect.poll(()=>reportText(page)).toContain('  E(B-V) = 0.04');
 await b.getByRole('button',{name:'Discard unapplied model trial',exact:true}).click();await expect(b.getByTestId('db-hr-report-kind')).toHaveText('Confirmed result');expect(await reportText(page)).toBe(m67Lines(name));
 await b.screenshot({path:'test-results/cluster-database-hr-m67.png'});
});

test('failed and stale model fetches keep the typed trial;a stale model never reaches the diagram or report',async({page})=>{
 await open(page);await load(page,'m67');const b=panel(page);
 let seen=false,release:()=>Promise<void>=async()=>{};await page.route('**/native-isochrones-008*.json*',async r=>{seen=true;await new Promise<void>(resolve=>{release=async()=>{await r.continue();resolve();};});});
 await b.getByLabel(labels.modulus,{exact:true}).fill('9.50');await b.getByLabel(labels.age,{exact:true}).fill('9.60');await b.getByLabel(labels.model,{exact:true}).selectOption('3');await expect.poll(()=>seen).toBe(true);
 await b.getByText('View/Print Parameters',{exact:true}).click();await expect(b.getByText('Loading the selected original model…',{exact:true})).toBeVisible();await expect(b.getByTestId('native-isochrone')).toHaveCount(0);
 expect(await reportText(page)).toBe(['Cluster: '+info('m67').name,'','From ZAMS fit:','  V-Mv = 9.50','  E(B-V) = 0.03'].join('\n'));await expect(b.getByTestId('db-hr-report-no-isochrone')).toBeVisible();
 await b.getByLabel(labels.model,{exact:true}).selectOption('4');await expect(b.getByTestId('native-isochrone')).toHaveCount(1);await expect.poll(()=>reportText(page)).toContain('(Solar Values)');
 const late=page.waitForResponse(r=>/native-isochrones-008/.test(r.url())&&r.status()===200);await release();await(await late).finished();
 await expect(b.getByLabel(labels.model,{exact:true})).toHaveValue('4');expect(await reportText(page)).toContain('  Metallicity: [Z=0.019, Y=0.273] (Solar Values)');await expect(b.getByTestId('native-isochrone')).toHaveCount(1);await page.unroute('**/native-isochrones-008*.json*');
 await page.route('**/native-isochrones-030*.json*',r=>r.abort());const label5=(await b.getByLabel(labels.model,{exact:true}).locator('option[value="5"]').textContent())!;
 await b.getByLabel(labels.model,{exact:true}).selectOption('5');await expect(b.getByText('The selected model could not load. Retry the selected model; confirmed work is retained.',{exact:true})).toBeVisible();
 await expect(b.getByTestId('native-isochrone')).toHaveCount(0);expect(await reportText(page)).not.toContain('Isochrone Model Parameters');
 for(const[k,v]of[['modulus','9.50'],['ebv','0.03'],['age','9.60'],['model','5']]as const)await expect(b.getByLabel(labels[k],{exact:true})).toHaveValue(v);await expect(b.getByTestId('native-confirmed-logage')).toHaveCount(0);
 await page.unroute('**/native-isochrones-030*.json*');await b.getByRole('button',{name:'Retry selected model',exact:true}).click();await expect(b.getByTestId('native-isochrone')).toHaveCount(1);await expect.poll(()=>reportText(page)).toContain('  Metallicity: '+label5);
});

test('prefill only on a new explicit Load;reselection, discard, legacy blank19 and full Save/new-context Restore stay exact',async({page,browser,baseURL})=>{
 await open(page);await load(page,'m67');const b=panel(page);
 await b.getByLabel(labels.modulus,{exact:true}).fill('9.50');await b.getByLabel(labels.age,{exact:true}).fill('9.60');await b.getByLabel(labels.model,{exact:true}).selectOption('4');await b.getByLabel(labels.correction,{exact:true}).check();await b.getByRole('button',{name:'Confirm chosen model fit',exact:true}).click();await expect(b.getByTestId('native-confirmed-logage')).toHaveText('9.6');
 await b.getByLabel(labels.age,{exact:true}).fill('9.65');
 await load(page,'hyades');await expect(b.getByLabel(labels.ebv,{exact:true})).toHaveValue('0');await expect(b.getByTestId('cluster-reddening-source')).toContainText(`original ${info('hyades').name} catalog preset`);await expect(b.getByLabel(labels.modulus,{exact:true})).toHaveValue('');
 await b.getByRole('button',{name:'Discard unapplied model trial',exact:true}).click();await expect(b.getByLabel(labels.ebv,{exact:true})).toHaveValue('');
 await load(page,'m67');await expect(b.getByLabel(labels.age,{exact:true})).toHaveValue('9.65');await expect(b.getByTestId('native-confirmed-logage')).toHaveText('9.6');await expect(b.getByText(/notebook: the catalog E\(B−V\) =/)).toHaveCount(0);
 await load(page,'hyades');await expect(b.getByLabel(labels.ebv,{exact:true})).toHaveValue('');await expect(b.getByTestId('cluster-reddening-source')).toContainText('manual choice');
 const bytes=await save(page),raw=JSON.parse(bytes.toString());expect(raw.version).toBe(20);expect(raw.clusterComparison.notebooks.hyades).toEqual({draft:null,draftReddeningSource:'manual',fit:null});expect(raw.clusterComparison.notebooks.m67.draft.logAge).toBe('9.65');expect(raw.clusterComparison.notebooks.m67.fit.parameters.extinctionCorrected).toBe(true);
 const context=await browser.newContext({baseURL}),other=await context.newPage();
 try{await open(other);await restore(other,bytes);await expect(other.getByText(restored,{exact:true})).toBeVisible();expect(await save(other)).toEqual(bytes);
  const o=panel(other);await expect(o.getByTestId('cluster-reference-count')).toContainText('Hyades');await expect(o.getByLabel(labels.ebv,{exact:true})).toHaveValue('');
  await load(other,'m67');await expect(o.getByLabel(labels.age,{exact:true})).toHaveValue('9.65');await o.getByText('View/Print Parameters',{exact:true}).click();await expect(o.getByTestId('db-hr-report-kind')).toHaveText('Current trial (unconfirmed)');await expect.poll(()=>reportText(other)).toContain('  Log(Age/yrs): 9.65');
  await o.getByRole('button',{name:'Discard unapplied model trial',exact:true}).click();await expect(o.getByTestId('db-hr-report-kind')).toHaveText('Confirmed result');await expect.poll(()=>reportText(other)).toBe(m67Lines(info('m67').name));
 }finally{await context.close();}
 // An M67-only workspace with an intentionally blank(discarded)draft keeps the19 writer and stays blank after restore.
 await page.reload();await open(page);await load(page,'m67');await b.getByRole('button',{name:'Discard unapplied model trial',exact:true}).click();
 const blank19=await save(page),old=JSON.parse(blank19.toString());expect(old.version).toBe(19);expect(old.clusterDatabase).toEqual({pendingId:'m67',loaded:true,draft:null,draftReddeningSource:'manual',fit:null});
 await page.reload();await open(page);await restore(page,blank19,'blank19.json');await expect(page.getByText(restored,{exact:true})).toBeVisible();await expect(b.getByTestId('cluster-reference-count')).toContainText('506');await expect(b.getByLabel(labels.ebv,{exact:true})).toHaveValue('');expect(await save(page)).toEqual(blank19);
});

for(const width of[320,390])test(`${width}px: guide, native frame, keyboard sliders and report stay within the page`,async({page})=>{
 await page.setViewportSize({width,height:800});await open(page);await counts(page,0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await closeGuide(page);
 await load(page,'30dor');const b=panel(page);await expect(b.getByTestId('native-observed-point')).toHaveCount(606);
 const modulus=b.getByLabel(sliders.modulus,{exact:true});await modulus.focus();await page.keyboard.press('End');await expect(b.getByLabel(labels.modulus,{exact:true})).toHaveValue('15.00');await page.keyboard.press('ArrowLeft');await expect(modulus).toHaveValue('1499');
 await b.getByLabel(labels.modulus,{exact:true}).fill('18.10');await expect(modulus).toHaveAttribute('aria-valuetext','not set');await expect(b.getByLabel(labels.modulus,{exact:true})).toHaveValue('18.10');
 await b.getByLabel(sliders.offset,{exact:true}).focus();await page.keyboard.press('ArrowLeft');await expect(b.getByLabel('Extra isochrone B−V offset · −1–1, step 0.01',{exact:true})).toHaveValue('-0.01');
 // An unset offset takes its minimum only from an explicit Home or a completed press at the minimum.
 const offsetText=b.getByLabel(labels.offset,{exact:true}),offset=b.getByLabel(sliders.offset,{exact:true});await offsetText.fill('');await expect(offset).toHaveAttribute('aria-valuetext','not set');
 await offset.focus();await page.keyboard.press('Home');await expect(offsetText).toHaveValue('-1.00');await expect(offset).toHaveAttribute('aria-valuetext','-1.00');
 await offsetText.fill('');await expect(offset).toHaveAttribute('aria-valuetext','not set');const box=(await offset.boundingBox())!;await offset.click({position:{x:2,y:box.height/2}});await expect(offsetText).toHaveValue('-1.00');await expect(b.getByLabel(labels.modulus,{exact:true})).toHaveValue('18.10');
 const region=b.getByRole('region',{name:'Scrollable native cluster model diagram',exact:true});await region.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>region.evaluate(e=>e.scrollLeft>0)).toBe(true);
 await b.getByText('View/Print Parameters',{exact:true}).click();await expect(b.getByTestId('db-hr-report')).toBeVisible();await expect(b.getByTestId('native-confirmed-logage')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await b.screenshot({path:`test-results/cluster-database-hr-${width}.png`});
});

test('restore prunes guide witnesses of removed notebooks;a fresh M67 shows1 of5 until new actions, and a kept notebook keeps its own',async({page})=>{
 await open(page);const b=panel(page),m67=info('m67').name,hyades=info('hyades').name;
 await b.getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');const pending19=await save(page),raw=JSON.parse(pending19.toString());expect(raw.version).toBe(19);expect(raw.clusterDatabase.pendingId).toBe('m67');expect(raw.clusterDatabase.loaded).toBe(false);
 await load(page,'hyades');const hyadesOnly=await save(page);
 await load(page,'m67');await b.getByText('Inspect all reference data values',{exact:true}).click();await b.getByText('View/Print Parameters',{exact:true}).click();await counts(page,3);await closeGuide(page);
 // The unloaded19 restore removes M67 while preserving other dataset notebooks;old M67 marks must not return with its fresh notebook.
 await restore(page,pending19,'pending19.json');await expect(page.getByText(restored,{exact:true})).toBeVisible();await expect(b.getByTestId('cluster-reference-count')).toHaveCount(0);
 await load(page,'m67');await expect(b.getByText(`New ${m67} notebook: the catalog E(B−V) =`)).toBeVisible();
 await counts(page,1);await expect(guide(page).getByTestId('cluster-lab-next')).toHaveAttribute('data-next','inspect');for(const k of['inspect','report'])await expect(guide(page).getByTestId('cluster-lab-step-'+k)).not.toHaveAttribute('data-done','true');await closeGuide(page);
 // New explicit actions count again.
 await b.getByText('Inspect all reference data values',{exact:true}).click();await counts(page,2);await closeGuide(page);await b.getByText('View/Print Parameters',{exact:true}).click();await counts(page,3);await closeGuide(page);
 // Switch control:with the report still open, the newly active Hyades shows load and report.
 await load(page,'hyades');await counts(page,2);await expect(guide(page).getByTestId('cluster-lab-step-report')).toHaveAttribute('data-done','true');await closeGuide(page);
 // A Hyades-only restore removes M67 and keeps Hyades' own witness(same notebook key);the report is closed after remounting.
 await load(page,'m67');await restore(page,hyadesOnly,'hyades.json');await expect(b.getByTestId('cluster-reference-count')).toContainText(hyades);await expect(report(page)).toBeHidden();
 await counts(page,2);await expect(guide(page).getByTestId('cluster-lab-step-report')).toHaveAttribute('data-done','true');await expect(guide(page).getByTestId('cluster-lab-step-inspect')).not.toHaveAttribute('data-done','true');await closeGuide(page);
 await load(page,'m67');await expect(b.getByText(`New ${m67} notebook: the catalog E(B−V) =`)).toBeVisible();await counts(page,1);await closeGuide(page);
});

test('a notebook first created by Retry stays without the catalog E until the explicit catalog copy',async({page})=>{
 // Installed after the lab heading is visible and limited to fetches,so module loading is never intercepted.
 await open(page);const b=panel(page),name=info('m67').name,url='**/data/photometry/cluster-m67.json*';
 await page.route(url,r=>r.request().resourceType()==='fetch'?r.abort():r.fallback());
 await b.getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');await b.getByRole('button',{name:'Load selected dataset',exact:true}).click();await expect(b.getByRole('alert')).toContainText('could not load or verify');
 await page.unroute(url);await b.getByRole('button',{name:'Retry dataset load',exact:true}).click();await expect(b.getByTestId('cluster-reference-count')).toContainText('506');
 // Retry copies no E: modulus, E, age and model are blank;the existing offset and unchecked correction are unchanged.
 for(const k of['modulus','ebv','age','model']as const)await expect(b.getByLabel(labels[k],{exact:true})).toHaveValue('');
 await expect(b.getByLabel(sliders.ebv,{exact:true})).toHaveAttribute('aria-valuetext','not set');await expect(b.getByTestId('db-slider-offset')).toHaveText('0.00');await expect(b.getByLabel(labels.correction,{exact:true})).not.toBeChecked();
 await expect(b.getByTestId('cluster-reddening-source')).toContainText('manual choice');await expect(b.getByText(/notebook: the catalog E\(B−V\) =/)).toHaveCount(0);
 await expect(b.getByText('A notebook first created by Retry dataset load does not get this copy')).toBeVisible();await expect(b.getByText('A notebook first created by Retry dataset load (for example after a failed first load) gets no catalog E(B−V)')).toBeVisible();
 await b.getByRole('button',{name:'Use catalog E(B−V) = 0.03',exact:true}).click();await expect(b.getByLabel(labels.ebv,{exact:true})).toHaveValue('0.03');await expect(b.getByTestId('cluster-reddening-source')).toContainText(`Unapplied reddening source: original ${name}`);
 await expect(b.getByText('Catalog reddening copied into the trial. Confirm your chosen model separately.',{exact:true})).toBeVisible();await expect(b.getByLabel(labels.modulus,{exact:true})).toHaveValue('');await expect(b.getByTestId('native-confirmed-logage')).toHaveCount(0);
});

test('unset sliders take their minimum only from an explicit key or completed press;other fields, source and confirmation are kept',async({page})=>{
 await open(page);await load(page,'m67');const b=panel(page);
 await b.getByLabel(labels.modulus,{exact:true}).fill('9.50');await b.getByLabel(labels.age,{exact:true}).fill('9.60');await b.getByLabel(labels.model,{exact:true}).selectOption('4');await b.getByRole('button',{name:'Confirm chosen model fit',exact:true}).click();
 const fields=['modulus','ebv','age','offset']as const,minimum={modulus:'0.00',ebv:'0.00',age:'7.80',offset:'-1.00'};type Field=typeof fields[number];
 const text=(k:Field)=>b.getByLabel(labels[k],{exact:true}),range=(k:Field)=>b.getByLabel(sliders[k],{exact:true}),source=b.getByTestId('cluster-reddening-source');
 const confirmed=async()=>{await expect(b.getByTestId('native-confirmed-logage')).toHaveText('9.6');await expect(b.getByTestId('native-confirmed-modulus')).toHaveText('9.5');await expect(b.getByTestId('native-confirmed-ebv')).toHaveText('0.03');await expect(b.getByLabel(labels.model,{exact:true})).toHaveValue('4');await expect(b.getByLabel(labels.correction,{exact:true})).not.toBeChecked();};
 const unset=async(k:Field)=>{await expect(range(k)).toHaveAttribute('aria-valuetext','not set');await expect(range(k)).toHaveAttribute('data-unset','true');};
 const atMin=async(k:Field)=>{await expect(text(k)).toHaveValue(minimum[k]);await expect(range(k)).toHaveAttribute('aria-valuetext',minimum[k]);await expect(range(k)).not.toHaveAttribute('data-unset');};
 // Every minimum key on every field rewrites only that field;only an E(B−V) change makes the source manual.
 await confirmed();
 for(const key of['Home','ArrowLeft','ArrowDown','PageDown'])for(const k of fields){
  await text(k).fill('');await unset(k);const others=fields.filter(o=>o!==k),before=await Promise.all(others.map(o=>text(o).inputValue())),was=(await source.textContent())!;
  await range(k).focus();await page.keyboard.press(key);await atMin(k);
  for(const[i,o]of others.entries())await expect(text(o)).toHaveValue(before[i]!);
  if(k==='ebv')await expect(source).toContainText('your manual input');else await expect(source).toHaveText(was);await confirmed();
 }
 // Focus, blur and a modified key never set a value;non-normalized invalid text stays until an explicit action.
 await text('modulus').fill('');await range('modulus').focus();await unset('modulus');await page.keyboard.press('Control+Home');await unset('modulus');await text('age').focus();await unset('modulus');await expect(text('modulus')).toHaveValue('');
 await text('age').fill('9.6x');await range('age').focus();await text('modulus').focus();await expect(text('age')).toHaveValue('9.6x');await unset('age');await range('age').focus();await page.keyboard.press('Home');await atMin('age');
 // Already set sliders keep the browser's own behaviour.
 await text('modulus').fill('0.00');await range('modulus').focus();await page.keyboard.press('ArrowLeft');await expect(text('modulus')).toHaveValue('0.00');
 await text('modulus').fill('9.50');await range('modulus').focus();await page.keyboard.press('ArrowLeft');await expect(text('modulus')).toHaveValue('9.49');
 // A completed primary press at the minimum sets it for every field.
 for(const k of fields){await text(k).fill('');await unset(k);const box=(await range(k).boundingBox())!;await range(k).click({position:{x:2,y:box.height/2}});await atMin(k);}
 await confirmed();
 // A press that starts on the text field and ends over the slider is not a slider action.
 await text('modulus').fill('');await range('modulus').scrollIntoViewIfNeeded();const from=(await text('modulus').boundingBox())!,to=(await range('modulus').boundingBox())!;
 await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+2,to.y+to.height/2,{steps:5});await page.mouse.up();await unset('modulus');await expect(text('modulus')).toHaveValue('');
 // A cancelled press never commits;the same dispatched press without cancel does.
 const dispatch=(types:string[])=>range('modulus').evaluate((el,types)=>{const o={bubbles:true,isPrimary:true,pointerId:7,button:0,pointerType:'mouse'};for(const type of types)el.dispatchEvent(new PointerEvent(type,o));},types);
 await dispatch(['pointerdown','pointercancel','pointerup']);await unset('modulus');await expect(text('modulus')).toHaveValue('');
 await dispatch(['pointerdown','pointerup']);await atMin('modulus');await confirmed();
});

test('390px touch: a completed tap at an unset minimum sets only that slider',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,viewport:{width:390,height:800},hasTouch:true}),page=await context.newPage();
 try{await open(page);await load(page,'m67');const b=panel(page),age=b.getByLabel(sliders.age,{exact:true});
  await expect(age).toHaveAttribute('aria-valuetext','not set');const box=(await age.boundingBox())!;await age.tap({position:{x:2,y:box.height/2}});
  await expect(b.getByLabel(labels.age,{exact:true})).toHaveValue('7.80');await expect(b.getByLabel(labels.modulus,{exact:true})).toHaveValue('');await expect(b.getByLabel(labels.ebv,{exact:true})).toHaveValue('0.03');await expect(b.getByTestId('cluster-reddening-source')).toContainText('original '+info('m67').name);
 }finally{await context.close();}
});
