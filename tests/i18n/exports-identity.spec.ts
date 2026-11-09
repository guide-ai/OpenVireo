import {test,expect,type Browser,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {enterInstructorMode} from '../fixtures/instructor-mode';
import {PLR} from '../fixtures/pulsar-saved-rows-controls';
// Front ES0 (docs/I18N.md; user decision 3, 2026-11-09): the files the site writes stay exactly as VIREO or the web contract
// writes them, in English, whatever the screen language. Each export family is downloaded once in English and once in the
// dev-only pseudo-locale qps (?lang=qps: every catalog, map and vireo() string marked ⟦…⟧, accented and ~35 % longer), from the
// same deterministic path, and the two downloads must have the same file name and SHA-256, with no ⟦ in the qps bytes.
// Spanish (es-419) joins each family when its sub-front lands (ES1 onwards). Selectors go through `L`, which matches an English
// accessible name in both languages (the pseudo-locale only adds marks and padding and accents vowels).

type Locale='en'|'qps';
type File=Readonly<{name:string;bytes:Buffer}>;
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const MARK='[⟦⟧·\\s]*';
/** An exact accessible-name matcher for English text that also matches its pseudo-localized form. */
const L=(text:string)=>new RegExp(`^${MARK}${[...text].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join(MARK)}${MARK}$`);
const button=(p:Page,name:string)=>p.getByRole('button',{name:L(name)});
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
/** A fixed instant for every Date read (timers keep running), so exports that record "now" are comparable. */
const NOW=new Date('2026-11-02T15:04:05.678Z');

async function open(page:Page,locale:Locale,hash:string,clock:'fixed'|'real'='fixed'){
 if(clock==='fixed')await page.clock.setFixedTime(NOW);
 await page.goto(`/${locale==='qps'?'?lang=qps':''}#${hash}`);
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 if(locale==='qps')await expect.poll(()=>page.title()).toMatch(/^⟦/);
 const skip=page.getByRole('button',{name:'Skip the tour'});// the first-visit tour (src/help/tour.ts, still English in ES0)
 if(await skip.isVisible().catch(()=>false))await skip.click();
}
async function download(page:Page,click:()=>Promise<void>):Promise<File>{
 const event=page.waitForEvent('download');await click();const d=await event;
 return {name:d.suggestedFilename(),bytes:await readFile((await d.path())!)};
}
/** Runs `flow` in a fresh English context and a fresh qps context and compares every file it returns. `scope` is the flow's own
 * part of the page: in qps it must show at least one ⟦, so a route where the pseudo-locale silently did not apply cannot pass by
 * comparing English with English. `masks` hides documented run-dependent values (wall clock, random stream) before hashing. */
async function identical(browser:Browser,baseURL:string|undefined,flow:(page:Page,locale:Locale)=>Promise<Record<string,File>>,masks:Readonly<Record<string,(b:Buffer)=>Buffer>>,scope:(page:Page)=>Locator){
 const results:Partial<Record<Locale,Record<string,File>>>={};
 for(const locale of ['en','qps'] as const){
  const context=await browser.newContext({baseURL,locale:'en-US',viewport:{width:1440,height:1050}}),page=await context.newPage();page.setDefaultTimeout(20_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   results[locale]=await flow(page,locale);
   if(locale==='qps')await expect(scope(page),'the pseudo-locale applied to this flow').toContainText('⟦');
  }finally{await context.close();}
  expect(errors,locale).toEqual([]);
 }
 const en=results.en!,qps=results.qps!;
 expect(Object.keys(qps)).toEqual(Object.keys(en));
 for(const [family,file] of Object.entries(en)){
  expect(file.bytes.length,family).toBeGreaterThan(0);
  expect(qps[family].name,family).toBe(file.name);
  expect(qps[family].bytes.includes('⟦'),`${family}: a pseudo-locale mark reached the file`).toBe(false);
  const mask=masks[family]??((b:Buffer)=>b);
  if(process.env.ES0_DUMP&&sha(mask(qps[family].bytes))!==sha(mask(file.bytes))){const {writeFile}=await import('node:fs/promises');await writeFile(`${process.env.ES0_DUMP}/${family}.en`,file.bytes);await writeFile(`${process.env.ES0_DUMP}/${family}.qps`,qps[family].bytes);}
  expect(sha(mask(qps[family].bytes)),`${family}: ${file.name}`).toBe(sha(mask(file.bytes)));
 }
}
const SPECTRUM=Buffer.from('3700,.2\n4000,.5\n4700,.9');
/** A one-pulsar receiver catalog in the Pulsars.dat column layout (synthetic, as tests/radio-receiver-raw-export-app.spec.ts). */
const RECEIVER_CATALOG=(()=>{
 const COLUMNS={primaryName:[0,12],legacyName:[12,8],ra:[20,16],dec:[62,16],x2a:[208,22],x34:[240,16],x3e:[266,14],s48:[336,8],s4c:[350,14],s50:[410,10],s54:[430,8],s58:[438,8],s5c:[446,8]} as const;
 const row:Record<keyof typeof COLUMNS,string>={primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4',x2a:'0.5',x34:'1.0E-15',x3e:'50000.0',s48:'28.2',s4c:'30.0',s50:'12.5',s54:'14.0',s58:'9.0',s5c:'3.0'};
 const chars=Array.from({length:454},()=>' ');
 for(const [field,[start,width]] of Object.entries(COLUMNS) as [keyof typeof COLUMNS,readonly [number,number]][]){const text=row[field],cell=field==='primaryName'||field==='legacyName'?text.padEnd(width):text.padStart(width);for(let i=0;i<width;i++)chars[start+i]=cell[i];}
 return chars.join('')+'\r\n';
})();
/** A camera image depends on wall-clock time and the web random stream (docs/CAMERA-EXPOSURE.md: DATE-OBS, MJD-OBS, the drifting
 * pointing RA/CRVAL1 and CAMSEED, which drives every pixel). Only the header is compared, with the values of those cards masked;
 * every other card, keyword, comment and the END block must be byte-identical. */
const TIMED_CARDS=new Set(['DATE-OBS','MJD-OBS','RA','DEC','CRVAL1','CRVAL2','CAMSEED']);
/** An Object X spectrum CSV: the counts come from a real-time exposure and the web random stream, so only the header, the
 * wavelength column and the row count are compared. */
const countsMasked=(bytes:Buffer)=>Buffer.from(bytes.toString('latin1').replace(/^([^,\r\n]+),\d+(?=\r\n)/gm,'$1,<counts>'),'latin1');
/** A saved investigation with kept Object X spectra: each spectrum's replay seed (the web random stream) and its exposure events
 * (real-time ticks) are run-dependent, so they are reduced to the seed's presence and the distinct event kinds. Every other
 * field, the labels and codes included, is compared as written. */
function objectXReplayMasked(bytes:Buffer):Buffer{
 const doc=JSON.parse(bytes.toString('utf8')) as {objectXSpectra?:{seedAtReset?:unknown;events?:{kind:string}[]}[]};
 for(const s of doc.objectXSpectra??[]){s.seedAtReset=typeof s.seedAtReset;s.events=[...new Set((s.events??[]).map(e=>e.kind))].sort().map(kind=>({kind}));}
 return Buffer.from(JSON.stringify(doc),'utf8');
}
function fitsHeader(bytes:Buffer):Buffer{
 const cards:string[]=[];
 for(let at=0;at+80<=bytes.length;at+=80){const card=bytes.subarray(at,at+80).toString('latin1');const key=card.slice(0,8).trim();cards.push(TIMED_CARDS.has(key)?`${card.slice(0,10)}<masked>`:card);if(key==='END')break;}
 return Buffer.from(cards.join('\n'),'latin1');
}

test.describe.configure({mode:'parallel'});

test('spectrum analysis: measurement CSV, velocities CSV and the analysis session',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'spectrum');
  await page.getByLabel(L('Import spectrum')).setInputFiles({name:'identity-vector.csv',mimeType:'text/csv',buffer:SPECTRUM});
  await page.getByLabel(L('Object or reference')).fill('Identity vector');
  await page.getByLabel(L('z step per tick')).fill('0.015625');await button(page,'Apply step').click();
  await page.getByRole('slider').focus();await page.getByRole('slider').press('ArrowRight');
  await page.getByRole('button',{name:/R[eé]c[oó]rd m[eé][aá]s[uú]r[eé]m[eé]nt/}).click();await button(page,'Save measurement').click();
  await expect(page.locator('#measurement-log tbody tr')).toHaveCount(1);
  const measurements=await download(page,()=>button(page,'Export CSV ↓').click());
  await page.getByText(L('Velocity analysis')).click();
  const velocities=await download(page,()=>button(page,'Export velocities CSV').click());
  const session=await download(page,()=>button(page,'Save session').first().click());
  return {measurements,velocities,session};
 },{},page=>page.locator('.spectrum-route'));
});

test('Hubble analysis: Hubble CSV and the Hubble session from the original workbook example',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'spectrum');
  await page.getByText(L('Hubble diagram & distances')).click();
  await button(page,'Load original workbook example').click();
  await page.getByLabel(L('Distance and summary recipe')).selectOption('vireo');
  await expect(page.locator('.hubble-card').getByTestId('hubble-value')).toHaveText('52.49829 km/s/Mpc');
  const csv=await download(page,()=>button(page,'Export Hubble CSV').click());
  const session=await download(page,()=>button(page,'Save Hubble session').click());
  return {csv,session};
 },{},page=>page.locator('.hubble-card'));
});

test('classification: investigation, classification CSV, observation notebook and native TXT/CSV',async({browser,baseURL})=>{
 // The canonical 3-band counts layout of tests/native-csv-export.spec.ts (authored, not an original observation).
 const header='Object ID    MJD(Days)      RA           Dec    '+['U','B','V'].map(f=>'     '+f+'    ').join('')+'     Z      Spectrum     Comments';
 const row='OWN-TXT'.padEnd(12)+'1179.125000 '+' 05h03m04.5s '+'-06°07\'08" '+Array(3).fill('100.0'.padStart(9)+' ').join('')+'0.125'.padStart(11)+' '+'G2V'.padEnd(12)+' Original, comment with spaces';
 const txt=Buffer.from(`${header}\r\n${row}\r\n${row}\r\n`,'latin1');
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'classification');await expect(button(page,'Review classification')).toBeEnabled();
  await page.getByLabel(L('Proposed spectral type')).fill('My independent type');
  await page.getByLabel(L('Features and reasoning')).fill('Independent reasoning retained throughout export');
  await button(page,'Review classification').click();await button(page,'Save classification').click();
  await button(page,'Open observation results').click();
  await page.getByLabel(L('Observation spectral type (up to 12 bytes)')).fill('G2V');await button(page,'Record observation result').click();
  const investigation=await download(page,()=>button(page,'Save complete investigation').first().click());
  const classification=await download(page,()=>button(page,'Export classification CSV').click());
  const notebook=await download(page,()=>button(page,'Export observation notebook').click());
  await page.getByLabel(L('Inspect native results TXT (up to 512 KiB, 1000 rows)')).setInputFiles({name:'identity.txt',mimeType:'text/plain',buffer:txt});
  await expect(button(page,'Preview native CSV from TXT')).toBeEnabled();
  const unchanged=await download(page,()=>button(page,'Download unchanged TXT bytes').click());
  await button(page,'Preview native CSV from TXT').click();
  const nativeCsv=await download(page,()=>button(page,'Download generated native CSV').click());
  return {investigation,classification,notebook,unchanged,nativeCsv};
 },{},page=>page.locator('.classification-main'));
});

test('hot list: Save HTL file after adding a target',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'observatory');
  await page.getByRole('heading',{name:L('Original hot lists')}).click();
  await button(page,'New HTL list').click();await button(page,'Add HTL target').click();
  await page.getByLabel(L('HTL identifier')).fill('Student 1');await page.getByLabel(L('HTL remarks')).fill('manual coordinates');
  await page.getByLabel(L('HTL right ascension · hours')).fill('23.75');await page.getByLabel(L('HTL declination · degrees')).fill('-30');
  await button(page,'Apply HTL edit').click();await expect(page.locator('#htl-rows option')).toHaveCount(1);
  return {htl:await download(page,()=>button(page,'Save HTL file').click())};
 },{},page=>page.locator('.htl-card'));
});

test('options file: Save Updates writes VEO_OPTS.json',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'observatory');
  await button(page,'Open dome ↗').click();await page.getByLabel(L('Target')).selectOption('N0000.DAT@14428');
  await button(page,'Point telescope ↗').click();await button(page,'Switch to telescope view ↗').click();
  await enterInstructorMode(page);
  await page.locator('.telescope-motion').getByTestId('ob-options').click();await expect(page.getByTestId('ob-options-dialog')).toBeVisible();
  await page.getByTestId('ob-options-test-mode').check();await page.getByTestId('ob-options-show-object-id').check();
  return {options:await download(page,()=>page.getByTestId('ob-options-save').click())};
 },{},page=>page.locator('.telescope-motion'));
});

test('variable stars: Save Text › As Displayed',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'variable-stars');
  await expect(page.getByTestId('variable-count')).toContainText('31,147',{timeout:20_000});
  await page.getByTestId('variable-name').fill('RR Lyr');await button(page,'Open RR Lyr').click();
  await expect(page.getByTestId('vstar-list-window')).toBeVisible();
  await page.getByTestId('vstar-data-menu').click();await page.getByTestId('vstar-save-menu').click();
  return {text:await download(page,()=>page.getByTestId('vstar-save-displayed').click())};
 },{},page=>page.getByTestId('vstar-list-window'));
});

test('pulsar analysis: the results CSV of two recorded measurements',async({browser,baseURL})=>{
 const id=(page:Page,testId:string)=>page.getByTestId(testId);
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'pulsar-analysis');
  await id(page,'pulsar-file').setInputFiles({name:'synthetic-e2e.plr',mimeType:'application/octet-stream',buffer:Buffer.from(PLR,'latin1')});
  await expect(id(page,'pulsar-sha')).toHaveText(createHash('sha256').update(Buffer.from(PLR,'latin1')).digest('hex'));await id(page,'pulsar-properties-close').click();
  for(const comment of ['first, with comma','second']){
   await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
   await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
  }
  await id(page,'pulsar-export').click();await expect(id(page,'pulsar-export-dialog')).toBeVisible();
  for(const [k,v] of Object.entries({date:'25/10/2026',time:'16:00:00',table:'7',name1:'Observer A'}))await id(page,`pulsar-export-${k}`).fill(v);
  return {results:await download(page,()=>id(page,'pulsar-export-download').click())};
 },{},page=>page.getByTestId('pulsar-analysis'));
});

test('star spectrometer: Save spectrum (.SSP) of a paused exposure',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await page.clock.install({time:NOW});
  await page.goto(`/${locale==='qps'?'?lang=qps':''}#spectrometer`);
  await page.getByRole('link',{name:L('Open supported star exposure')}).click();
  await button(page,'Activate supported star field').click();await expect(page.getByTestId('star-phase')).toHaveText(L('Ready / paused'));
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await button(page,'Start star exposure').click();
  await page.clock.runFor(1000);await button(page,'Pause exposure').click();await expect(page.getByTestId('star-elapsed')).toHaveText('1000 ms');
  const panel=page.getByTestId('ob-spectrum-save');
  return {ssp:await download(page,()=>panel.getByRole('button',{name:L('Save spectrum (.SSP)')}).click())};
 },{},page=>page.getByTestId('ob-spectrum-save'));
});

test('CCD camera: Save image (FITS) and Save image (VIREO header) from the recorded VizieR answer',async({browser,baseURL})=>{
 test.setTimeout(120_000);
 const recorded=await readFile(new URL('../fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
 await identical(browser,baseURL,async(page,locale)=>{
  await page.route(/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/,route=>route.fulfill({status:200,contentType:'text/xml',body:recorded}));
  await open(page,locale,'observatory','real');
  await button(page,'Open dome ↗').click();await page.getByLabel(L('Target')).selectOption('N0000.DAT@14428');
  await button(page,'Point telescope ↗').click();await button(page,'Switch to telescope view ↗').click();
  if(!await button(page,'Start observatory clock').isVisible())await page.getByText(L('Observatory clock & spectral tracking')).click();
  await button(page,'Start observatory clock').click();await button(page,'Turn tracking on').click();
  const camera=page.getByTestId('camera-control');
  await camera.getByLabel(/[AÁ]sk V[ií]z[ií][eé]R l[ií]v[eé]/).check();await camera.getByLabel(/F[ií]lt[eé]r/).selectOption('2');
  await camera.getByLabel(/M[ií]n[uú]t[eé]s/).fill('0');await camera.getByLabel(/S[eé]c[oó]nds/).fill('1');
  await button(page,'Start exposure').click();
  await expect(page.getByTestId('camera-status')).toHaveText(L('Image ready.'),{timeout:15_000});
  const fits=await download(page,()=>button(page,'Save image (FITS)').click());
  const native=await download(page,()=>button(page,'Save image (VIREO header)').click());
  return {fits,native};
 },{fits:fitsHeader,native:fitsHeader},page=>page.getByTestId('camera-control'));
});

test('Object X (identity still hidden): the kept spectrum CSV and the saved investigation',async({browser,baseURL})=>{
 test.setTimeout(240_000);
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'object-x','real');
  await expect(page.getByTestId('objectx-target').locator('option')).toHaveCount(18);
  await page.locator('[data-testid=objectx-lab] input').first().fill('7');
  await page.getByTestId('objectx-target').selectOption('X-NTFB6');// ObjectX.HTL row 9 (a star; not named before the reveal)
  await page.getByTestId('objectx-spectrum-telescope').selectOption('2');// 4.0 m
  await button(page,'Place the slit on the object').click();
  await expect(button(page,'Start spectrum')).toBeEnabled({timeout:90_000});
  await button(page,'Start spectrum').click();
  await expect(async()=>{const t=await page.getByTestId('objectx-spectrum-progress').textContent();expect(Number(/(\d+)\D*$/.exec(t??'')?.[1]??0)).toBeGreaterThan(0);}).toPass({timeout:20_000});
  const stop=button(page,'Stop spectrum');if(await stop.isEnabled())await stop.click();await expect(stop).toBeDisabled();
  await button(page,'Keep this spectrum').click();await expect(page.getByTestId('objectx-spectra').locator('li')).toHaveCount(1);
  const csv=await download(page,()=>button(page,'Save ObjX-7-S01 spectrum (CSV)').click());
  const investigation=await download(page,()=>button(page,'Save investigation').first().click());
  return {csv,investigation};
 },{csv:countsMasked,investigation:objectXReplayMasked},page=>page.getByTestId('objectx-lab'));
});

test('radio telescope: Download capture as .PLR of a model-generated recording',async({browser,baseURL})=>{
 test.setTimeout(180_000);
 const id=(page:Page,testId:string)=>page.getByTestId(testId);
 const flush=async(page:Page)=>{for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));};
 const advance=async(page:Page,ms:number)=>{for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}};
 const tool=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name:L(name)});
 await identical(browser,baseURL,async(page,locale)=>{
  await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
  await page.goto(`/${locale==='qps'?'?lang=qps':''}#pulsar-analysis`);await expect(id(page,'pulsar-none')).toBeVisible();
  await tool(page,'Radio telescope').click();await expect(id(page,'radio-exercise')).toBeVisible();
  await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
  await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
  await id(page,'radio-switch').click();await id(page,'antenna-tracking').click();await flush(page);
  await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-receiver.dat',mimeType:'text/plain',buffer:Buffer.from(RECEIVER_CATALOG,'latin1')});
  await id(page,'radio-clock-utc').fill('2026-10-24T12:00:00');await id(page,'radio-clock-apply').click();await id(page,'radio-clock-longitude').click();
  await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();
  await id(page,'receiver-record').click();
  await id(page,'receiver-mode').click();await flush(page);await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
  for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
  const finish=id(page,'receiver-record-finish');await expect(finish).toHaveAttribute('data-stage','identify');
  await id(page,'receiver-record-identify-input').fill('PSR B2358+38');await id(page,'receiver-record-identify-ok').click();
  await expect(finish).toHaveAttribute('data-stage','properties');await id(page,'receiver-record-properties-ok').click();
  await expect(finish).toHaveAttribute('data-stage','save');await id(page,'receiver-record-save-no').click();
  await expect(id(page,'pulsar-memory')).toBeVisible();await flush(page);
  await id(page,'pulsar-raw-export').click();await expect(id(page,'pulsar-raw-export-download')).toBeEnabled();
  return {plr:await download(page,()=>id(page,'pulsar-raw-export-download').click())};
 },{},page=>page.getByTestId('receiver-workspace'));
});
