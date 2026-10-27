import {test,expect,type Download,type Locator,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import{paceDownload}from'./fixtures/download-pacing';
// Phase 1 items 1.12/1.11. Alignment positions and steps below are operator-chosen workflow controls, not expected galaxy redshifts.
async function bytes(d:Download){const stream=await d.createReadStream(),parts:Buffer[]=[];for await(const p of stream!)parts.push(p);return Buffer.concat(parts);}
async function download(page:Page,name:string,scope:Page|Locator=page){await paceDownload(page);const wait=page.waitForEvent('download');await scope.getByRole('button',{name,exact:true}).click();const d=await wait;return {name:d.suggestedFilename(),bytes:await bytes(d)};}
const card=(p:Page)=>p.locator('.own-results-card');
const restored='Session restored. The current spectrum and measurement arithmetic were checked.';
const actions=['Download results text','Download results CSV','Print results'];
function parseCsv(csv:string):string[][]{const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;for(let i=0;i<csv.length;i++){const c=csv[i];if(quoted){if(c==='"'){if(csv[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}else if(c==='\r'&&csv[i+1]==='\n'){row.push(cell);rows.push(row);row=[];cell='';i++;}else cell+=c;}return rows;}
function byId(csv:Buffer){const[h,...rows]=parseCsv(csv.toString());return new Map(rows.map(r=>[r[h.indexOf('id')],Object.fromEntries(h.map((k,i)=>[k,r[i]]))as Record<string,string>]));}
const float32=(hex:string)=>Buffer.from(hex,'hex').readFloatBE(0);
const hexOf=(value:number)=>{const b=Buffer.alloc(4);b.writeFloatBE(value);return b.toString('hex');};
// Only the OS print call is stubbed; the app's own scope, CSS and cleanup run unchanged.
async function stubPrint(page:Page){await page.addInitScript(()=>{const w=window as unknown as {printCalls:(string|null)[]};w.printCalls=[];window.print=()=>{w.printCalls.push(document.documentElement.getAttribute('data-print-scope'));};});}
const printCalls=(p:Page)=>p.evaluate(()=>(window as unknown as {printCalls:(string|null)[]}).printCalls.slice());
const scope=(p:Page)=>p.evaluate(()=>document.documentElement.getAttribute('data-print-scope'));
async function openResults(p:Page){await p.getByRole('button',{name:'View in Observational Results',exact:true}).click();await expect(card(p)).toHaveAttribute('open','');}
async function acquireGalaxy(page:Page,id:string){await page.getByLabel('Acquisition galaxy',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Activate supported galaxy field',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Start galaxy exposure',exact:true}).click();await page.clock.runFor(1000);await page.getByRole('button',{name:'Analyze acquired galaxy',exact:true}).click();await expect(page.getByTestId('z-value')).toHaveText('+0.000000');}
async function view(page:Page,name:string,heading:string){await clickHeaderTool(page,name);await page.clock.resume();await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));}
async function align(page:Page,position:string,label:string){await page.getByLabel('z step per tick').fill('.001');await page.getByRole('button',{name:'Apply step',exact:true}).click();await page.getByRole('slider').fill(position);await page.getByLabel('Object or reference',{exact:true}).fill(label);}
async function saveRecord(page:Page){await page.getByRole('button',{name:/Record measurement/}).click();await page.getByRole('button',{name:'Save measurement',exact:true}).click();}
async function importSynthetic(page:Page,name:string,object:string){await page.getByLabel('Import spectrum',{exact:true}).setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from('3700,.2\n4000,.5\n4700,.9')});await expect(page.getByRole('heading',{name:'File ready'})).toBeVisible();await page.getByLabel('Object or reference').fill(object);await page.getByLabel('z step per tick').fill('0.015625');await page.getByRole('button',{name:'Apply step',exact:true}).click();await page.getByRole('slider').focus();await page.getByRole('slider').press('ArrowRight');}
async function snapshot(page:Page){
  return {session:(await download(page,'Save session')).bytes,measurements:(await download(page,'Export CSV ↓')).bytes,velocities:(await download(page,'Export velocities CSV')).bytes,hubble:(await download(page,'Export Hubble CSV')).bytes,
    result:await page.locator('.hubble-result').textContent(),answer:await page.getByLabel('Your velocity · km/s',{exact:true}).inputValue(),log:await page.locator('#measurement-log tbody').textContent(),
    storage:await page.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))};
}
test.describe.serial('own confirmed results in Observational Results',()=>{
  let saved:Buffer,text:Buffer,csv:Buffer;
  test('two acquired galaxies, a star, an imported claim and signed zero reach read-only results, exports and scoped print',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await stubPrint(page);await page.clock.install();await page.goto('/#galaxy-exposure');
    await acquireGalaxy(page,'36747');
    // 1.11: technical exposure notes are folded; the model limit stays visible.
    const provenance=page.getByLabel('Galaxy acquisition provenance');await expect(provenance.getByText(/browser simulation using an adapted raster/)).toBeVisible();await expect(provenance.getByText(/Committed exposure: 1000 ms/)).toBeHidden();await expect(provenance.locator('details.research-notes')).not.toHaveAttribute('open','');
    await align(page,'10','My 36747 alignment');
    await page.getByRole('button',{name:/Record measurement/}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.locator('#measurement-log tbody tr')).toHaveCount(0);
    await page.getByRole('button',{name:/Record measurement/}).click();await expect(page.getByRole('dialog',{name:'Confirm measurement'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Confirm measurement'})).toBeHidden();await expect(page.locator('#measurement-log tbody tr')).toHaveCount(0);
    await openResults(page);await expect(card(page)).toContainText('No confirmed measurements yet');await expect(card(page).locator('tbody tr')).toHaveCount(0);for(const name of actions)await expect(card(page).getByRole('button',{name,exact:true})).toBeDisabled();
    await page.getByRole('button',{name:/Record measurement/}).click();const confirmed=(await page.locator('.confirm-value').textContent())!.replace('z = ','');await page.getByRole('button',{name:'Save measurement',exact:true}).click();
    await expect(card(page).getByTestId('own-z-1')).toHaveText(confirmed);
    await view(page,'Galaxy exposure','Acquire a Hubble galaxy.');await acquireGalaxy(page,'54876');await align(page,'25','My 54876 alignment');await saveRecord(page);
    await view(page,'Star exposure','Catalog star exposure');await page.getByRole('button',{name:'Activate supported star field',exact:true}).click();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Start star exposure',exact:true}).click();await page.clock.runFor(1000);await page.getByRole('button',{name:'Analyze acquired star',exact:true}).click();await align(page,'5','Star alignment');await saveRecord(page);
    await importSynthetic(page,'+cmd,"q".csv','=HYPERLINK("x")');await saveRecord(page);
    await page.getByRole('button',{name:'New adjustment · z = 0',exact:true}).click();await page.getByLabel('z step per tick').fill('1e-50');await page.getByRole('button',{name:'Apply step',exact:true}).click();await page.getByRole('slider').focus();await page.getByRole('slider').press('ArrowLeft');await page.getByLabel('Object or reference').fill('Signed zero vector');
    await page.getByRole('button',{name:/Record measurement/}).click();await expect(page.locator('.quantization-note')).toBeVisible();await expect(page.locator('.quantization-note')).toContainText('−0');await page.getByRole('button',{name:'Save measurement',exact:true}).click();
    // Unsaved work: a moved slider and a cancelled dialog never become results.
    await page.getByRole('slider').press('ArrowLeft');await page.getByRole('button',{name:/Record measurement/}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();
    const results=card(page);await expect(results.locator('tbody tr')).toHaveCount(5);await expect(page.locator('#measurement-log tbody tr')).toHaveCount(5);await expect(results.getByTestId('own-row-6')).toHaveCount(0);
    await expect(results.getByText(/Velocity is derived as v = c z/)).toBeVisible();await expect(results.getByText(/Object is the label you entered on each row/)).toBeVisible();await expect(results.locator('details.research-notes')).not.toHaveAttribute('open','');await expect(results.getByText(/stand in for the native results form/)).toBeHidden();
    for(const id of [1,2,3,4,5])await expect(results.getByTestId(`own-z-${id}`)).toHaveText((await page.locator('#measurement-log tbody tr').nth(id-1).locator('td').nth(3).textContent())!);
    for(const id of [1,2,4,5])await expect(results.getByTestId(`own-status-${id}`)).toHaveText('Derived · v = c z');
    await expect(results.getByTestId('own-status-3')).toHaveText('Excluded: stellar line alignment is not a galaxy velocity');await expect(results.getByTestId('own-v-3')).toHaveText('—');
    for(const id of [1,2,3])await expect(results.getByTestId(`own-binding-${id}`)).toContainText('Linked to archived acquisition');for(const id of [4,5])await expect(results.getByTestId(`own-binding-${id}`)).toHaveText('No acquisition link');
    await expect(results.getByTestId('own-row-1')).toContainText('Galaxy acquisition · 36747');await expect(results.getByTestId('own-row-2')).toContainText('Galaxy acquisition · 54876');await expect(results.getByTestId('own-row-4')).toContainText('Imported file · your claim');
    await expect(results.getByTestId('own-z-5')).toHaveText('−0.00000000');await expect(results.getByTestId('own-v-5')).toHaveText('−0.00000000');
    // Independent display control: the velocity analysis lists the same non-stellar rows.
    await page.getByText('Velocity analysis',{exact:true}).click();const velocity=page.locator('.velocity-card');await expect(velocity.getByText(/Convert saved redshift measurements/)).toBeVisible();await expect(velocity.getByText('v = c z · c = 299792.458 km/s',{exact:true})).toBeVisible();await expect(velocity.getByText(/historical v = cz convention/)).toBeVisible();
    await expect(velocity.getByText(/relativistic velocity, distance or Hubble constant/)).toBeVisible();await expect(velocity.getByText(/practice draft, separate from saved measurements/)).toBeVisible();
    await expect(velocity.getByText(/Investigation v10 preserves/)).toBeHidden();await velocity.getByText('Research notes',{exact:true}).click();await expect(velocity.getByText(/Investigation v10 preserves/)).toBeVisible();
    for(const[index,id]of[1,2,4,5].entries())await expect(results.getByTestId(`own-v-${id}`)).toHaveText((await velocity.locator('tbody tr').nth(index).locator('td').nth(3).textContent())!);
    await page.getByLabel('Your velocity · km/s',{exact:true}).fill('1234');
    await page.getByText('Hubble diagram & distances',{exact:true}).click();await page.getByRole('button',{name:'Add saved measurements',exact:true}).click();await expect(page.locator('.hubble-card').getByText(/Stellar acquisition measurements are excluded/)).toBeVisible();await expect(page.locator('.hubble-card').getByText(/Examples and working rows are kept in separate tables/)).toBeVisible();await expect(page.locator('.hubble-card').getByText(/seven significant digits/)).toBeHidden();
    await expect(page.locator('.session-boundary')).toBeVisible();await expect(page.locator('.session-card').getByText(/Save session includes current sky\/star\/galaxy/)).toBeHidden();
    const before=await snapshot(page);saved=before.session;const session=JSON.parse(before.session.toString());expect(session.measurements.map((m:{id:number})=>m.id)).toEqual([1,2,3,4,5]);
    // Read-only exports: deterministic bytes, legacy CSV cross-checks and an independent float32 calculation from the bits.
    const text1=await download(page,'Download results text',results),text2=await download(page,'Download results text',results);expect(text1.name).toBe('openvireo-own-results.txt');expect(text2.bytes).toEqual(text1.bytes);
    await expect(results.getByRole('status')).toContainText('The browser decides whether and where it is saved');
    const csv1=await download(page,'Download results CSV',results),csv2=await download(page,'Download results CSV',results);expect(csv1.name).toBe('openvireo-own-results.csv');expect(csv2.bytes).toEqual(csv1.bytes);text=text1.bytes;csv=csv1.bytes;
    const own=byId(csv1.bytes),log=byId(before.measurements),velocities=byId(before.velocities),archived=new Set(session.acquisitions.map((a:{id:string})=>a.id));
    expect([...own.keys()]).toEqual(['1','2','3','4','5']);
    for(const[id,o]of own){const m=log.get(id)!;for(const key of ['object','file','sha256','z_number','z_float32_hex','source_kind','acquisition_id','acquired_target_id','analyst_step','base','position','factor','reference'])expect(o[key],`${id}.${key}`).toBe(m[key]);
      if(o.velocity_status==='derived'){const v=velocities.get(id)!,expected=Math.fround(299792.458*float32(o.z_float32_hex));expect(v.status).toBe('derived');expect(o.velocity_float32_hex).toBe(v.velocity_float32_hex);expect(o.velocity_float32_hex).toBe(hexOf(expected));expect(Object.is(Number(o.velocity_float32_km_s),expected)).toBe(true);expect(Number(o.reference_cz_km_s)===Number(v.reference_cz_km_s)).toBe(true);}}
    for(const id of ['1','2','3']){expect(own.get(id)!.archive_binding).toBe('bound');expect(archived.has(own.get(id)!.acquisition_id)).toBe(true);}
    expect(own.get('1')!.acquired_target_id).toBe('36747');expect(own.get('2')!.acquired_target_id).toBe('54876');
    expect(own.get('3')).toMatchObject({source_kind:'catalog-star-acquisition',velocity_status:'stellar-excluded',velocity_float32_km_s:'',velocity_float32_hex:'',reference_cz_km_s:''});expect(velocities.has('3')).toBe(false);
    expect(own.get('4')).toMatchObject({source_kind:'imported-spectrum',archive_binding:'not-applicable',acquisition_id:'',object:'\'=HYPERLINK("x")',file:'\'+cmd,"q".csv'});
    expect(own.get('5')).toMatchObject({z_float32:'-0',z_float32_hex:'80000000',velocity_float32_km_s:'-0',velocity_float32_hex:'80000000',velocity_status:'derived'});expect(log.get('5')!.z_float32).toBe('0');
    expect(csv1.bytes.toString()).toContain('"\'=HYPERLINK(""x"")","\'+cmd,""q"".csv"');
    const plain=text1.bytes.toString();expect(plain).toContain('object: "=HYPERLINK(\\"x\\")"\nfile: "+cmd,\\"q\\".csv"');expect(plain).toContain('source_kind: imported-spectrum');expect(plain).toContain('archive_binding: not-applicable');expect(plain).toContain('velocity_status: stellar-excluded');expect(plain).toContain('z_float32: -0 (hex 80000000)');expect(plain).toContain('not a native CLEA results file');
    // Print: one OS call with the owned scope; print media shows only these results; afterprint and later interactions release it.
    for(const selector of ['.portal-header','.investigation-toolbar'])await expect(page.locator(selector)).toBeVisible();
    await results.getByRole('button',{name:'Print results',exact:true}).click();expect(await printCalls(page)).toEqual(['own-results']);expect(await scope(page)).toBe('own-results');await expect(results.getByRole('status')).toContainText('cannot confirm that anything was printed or saved');
    await page.emulateMedia({media:'print'});await expect(results.locator('table')).toBeVisible();
    for(const selector of ['.portal-header','.investigation-toolbar','#spectrum .topbar','.analyzer-sidebar','#measurement-log','#spectrum .velocity-card','#spectrum .hubble-card','#spectrum .session-card','#spectrum .controls','#spectrum footer','#spectrum .page-heading'])await expect(page.locator(selector)).toBeHidden();
    await expect(results.locator('.own-results-actions')).toBeHidden();await expect(results.locator('.research-notes')).toBeHidden();
    expect((await results.boundingBox())!.x).toBeLessThan(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/own-results-print.png',fullPage:true});
    await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));expect(await scope(page)).toBeNull();await expect(page.locator('#spectrum .topbar')).toBeVisible();await expect(page.locator('#measurement-log')).toBeVisible();
    await page.emulateMedia({media:'screen'});await expect(results.locator('.own-results-actions')).toBeVisible();for(const selector of ['.portal-header','.investigation-toolbar'])await expect(page.locator(selector)).toBeVisible();
    await results.getByRole('button',{name:'Print results',exact:true}).click();expect(await scope(page)).toBe('own-results');await page.locator('#spectrum h1').click();expect(await scope(page)).toBeNull();expect(await printCalls(page)).toEqual(['own-results','own-results']);
    // Keyboard activation: the Enter that opens printing precedes the listener, so only a later key releases the scope.
    await results.getByRole('button',{name:'Print results',exact:true}).press('Enter');expect(await printCalls(page)).toEqual(['own-results','own-results','own-results']);expect(await scope(page)).toBe('own-results');
    await page.keyboard.press('Shift');expect(await scope(page)).toBeNull();
    await page.evaluate(()=>{window.print=()=>{throw new Error('print blocked');};});await results.getByRole('button',{name:'Print results',exact:true}).click();await expect(results.getByRole('alert')).toContainText('could not open printing');expect(await scope(page)).toBeNull();
    await page.evaluate(()=>{const w=window as unknown as {printCalls:(string|null)[]};window.print=()=>{w.printCalls.push(document.documentElement.getAttribute('data-print-scope'));};document.documentElement.setAttribute('data-print-scope','other-owner');});
    await results.getByRole('button',{name:'Print results',exact:true}).click();await expect(results.getByRole('alert')).toContainText('Another print view is pending');expect(await scope(page)).toBe('other-owner');await page.locator('#spectrum h1').click();expect(await scope(page)).toBe('other-owner');expect(await printCalls(page)).toHaveLength(3);
    await page.evaluate(()=>document.documentElement.removeAttribute('data-print-scope'));
    await results.getByText('Research notes',{exact:true}).click();await expect(results.getByText(/stand in for the native results form/)).toBeVisible();
    // Nothing above changed the analysis, session, Hubble work, velocity draft, log or browser storage.
    const after=await snapshot(page);expect(after.session).toEqual(before.session);expect(after.measurements).toEqual(before.measurements);expect(after.velocities).toEqual(before.velocities);expect(after.hubble).toEqual(before.hubble);expect(after).toEqual(before);
    // A hidden route releases the owned scope without any pointer or key interaction.
    await results.getByRole('button',{name:'Print results',exact:true}).click();expect(await scope(page)).toBe('own-results');await page.evaluate(()=>{location.hash='#galaxy-exposure';});await page.clock.resume();await expect(page.getByRole('heading',{name:'Acquire a Hubble galaxy.',exact:true})).toBeVisible();expect(await scope(page)).toBeNull();
    expect(errors).toEqual([]);
  });
  test('fresh context restores byte-identical results and appends the next confirmed id',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#spectrum');
    await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'own-results.json',mimeType:'application/json',buffer:saved});await expect(page.getByText(restored,{exact:true})).toBeVisible();
    await openResults(page);await expect(card(page).locator('tbody tr')).toHaveCount(5);
    expect((await download(page,'Download results text',card(page))).bytes).toEqual(text);expect((await download(page,'Download results CSV',card(page))).bytes).toEqual(csv);
    await page.getByRole('button',{name:'Inspect acquisition for measurement 1',exact:true}).click();await saveRecord(page);
    await expect(card(page).locator('tbody tr')).toHaveCount(6);await expect(card(page).getByTestId('own-z-6')).toHaveText((await card(page).getByTestId('own-z-1').textContent())!);await expect(card(page).getByTestId('own-binding-6')).toHaveText((await card(page).getByTestId('own-binding-1').textContent())!);
    const appended=byId((await download(page,'Download results CSV',card(page))).bytes);expect(appended.get('6')).toMatchObject({acquisition_id:appended.get('1')!.acquisition_id,archive_binding:'bound',velocity_status:'derived'});
    const again=(await download(page,'Save session')).bytes;await page.reload();await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'appended.json',mimeType:'application/json',buffer:again});await expect(page.getByText(restored,{exact:true})).toBeVisible();
    await openResults(page);await expect(card(page).locator('tbody tr')).toHaveCount(6);await expect(card(page).getByTestId('own-row-6')).toBeVisible();expect(errors).toEqual([]);
  });
});
test('a restored oversized z stays listed as overflow while empty and busy states gate every export',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await stubPrint(page);await page.goto('/#spectrum');
  await openResults(page);await expect(page.locator('.own-results-card>summary')).toBeFocused();await expect(card(page)).toContainText('No confirmed measurements yet');for(const name of actions)await expect(card(page).getByRole('button',{name,exact:true})).toBeDisabled();
  await importSynthetic(page,'large.csv','Large supplied z');await saveRecord(page);for(const name of actions)await expect(card(page).getByRole('button',{name,exact:true})).toBeEnabled();
  const data=JSON.parse((await download(page,'Save session')).bytes.toString()),m=data.measurements[0];
  // Synthetic out-of-range control written into a real saved session; the stored hex is the float32 of that control.
  m.control.base=typeof m.control.base==='string'?'1e35':1e35;m.zFloat32Hex=hexOf(1e35+.015625);
  await page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=async function(this:File){const b=await original.call(this);if(this.name==='late.json')await new Promise<void>(resolve=>Object.defineProperty(window,'releaseLate',{value:resolve,configurable:true}));return b;};});
  await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'late.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await page.waitForFunction(()=>'releaseLate' in window);for(const name of actions)await expect(card(page).getByRole('button',{name,exact:true})).toBeDisabled();
  await page.evaluate(()=>(window as unknown as {releaseLate:()=>void}).releaseLate());await expect(page.getByText(restored,{exact:true})).toBeVisible();
  await expect(card(page).locator('tbody tr')).toHaveCount(1);await expect(card(page).getByTestId('own-status-1')).toHaveText('Unsupported: velocity exceeds the float32 range');await expect(card(page).getByTestId('own-v-1')).toHaveText('—');
  await page.getByText('Velocity analysis',{exact:true}).click();await expect(page.locator('.velocity-card').getByRole('cell',{name:'Outside supported range',exact:true})).toBeVisible();
  const row=byId((await download(page,'Download results CSV',card(page))).bytes).get('1')!;expect(row).toMatchObject({velocity_status:'overflow',velocity_float32_km_s:'',velocity_float32_hex:'',reference_cz_km_s:'',z_float32_hex:hexOf(1e35+.015625),source_kind:'imported-spectrum'});
  expect(await printCalls(page)).toEqual([]);expect(errors).toEqual([]);
});
test('an imported name and label with line-separator and bidi characters stay escaped in results text and raw in CSV',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#spectrum');
  const name='a\u2028b\u202ec\u0085.csv',object='Label \u2066x\u2069';
  await importSynthetic(page,name,object);await saveRecord(page);await openResults(page);
  const text=(await download(page,'Download results text',card(page))).bytes.toString();
  expect(text).not.toMatch(/[\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/);
  const field=(key:string)=>JSON.parse(text.split('\n').find(l=>l.startsWith(`${key}: `))!.slice(key.length+2));
  expect(field('file')).toBe(name);expect(field('object')).toBe(object);
  expect(byId((await download(page,'Download results CSV',card(page))).bytes).get('1')).toMatchObject({file:name,object});
  expect(errors).toEqual([]);
});
test('keyboard reaches every results control and narrow layouts scroll the table inside its region',async({page})=>{
  await page.setViewportSize({width:320,height:800});await page.goto('/#spectrum');await importSynthetic(page,'narrow.csv','A long object label for the narrow results table');await saveRecord(page);
  const open=page.getByRole('button',{name:'View in Observational Results',exact:true});await open.focus();await page.keyboard.press('Enter');await expect(page.locator('.own-results-card>summary')).toBeFocused();
  await page.keyboard.press('Tab');await expect(card(page).getByRole('region',{name:'Observational Results table, horizontally scrollable',exact:true})).toBeFocused();
  for(const name of actions){await page.keyboard.press('Tab');await expect(card(page).getByRole('button',{name,exact:true})).toBeFocused();}
  await page.keyboard.press('Tab');await expect(card(page).locator('.research-notes>summary')).toBeFocused();await page.keyboard.press('Enter');await expect(card(page).locator('.research-notes')).toHaveAttribute('open','');
  for(const width of [320,390]){await page.setViewportSize({width,height:800});await card(page).scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await card(page).locator('.own-results-scroll').evaluate(n=>n.scrollWidth>n.clientWidth)).toBe(true);await card(page).screenshot({path:`test-results/own-results-mobile-${width}.png`});}
});
