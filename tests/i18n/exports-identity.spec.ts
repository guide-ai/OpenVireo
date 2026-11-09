import {test,expect,type Browser,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {enterInstructorMode} from '../fixtures/instructor-mode';
import {PLR} from '../fixtures/pulsar-saved-rows-controls';
import {paceDownload} from '../fixtures/download-pacing';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import {CAMERA_ES} from '../../src/i18n/es/maps/camera';
import {TOUR_ES} from '../../src/i18n/es/maps/tour';
import {OBSERVATORY_ES} from '../../src/i18n/es/maps/observatory';
// Front ES0 (docs/I18N.md; user decision 3, 2026-11-09): the files the site writes stay exactly as VIREO or the web contract
// writes them, in English, whatever the screen language. Each export family is downloaded once in English and once in the
// dev-only pseudo-locale qps (?lang=qps: every catalog, map and vireo() string marked ⟦…⟧, accented and ~35 % longer), from the
// same deterministic path, and the two downloads must have the same file name and SHA-256, with no ⟦ in the qps bytes.
// Spanish (es-419) joins each family when its sub-front lands (ES1 onwards; ES2: the hot list HTL, the options file and the
// CCD camera FITS, whose screens it translates). Selectors go through `L`, which matches an English
// accessible name in both languages (the pseudo-locale only adds marks and padding and accents vowels).

type Locale='en'|'qps'|'es-419';
type File=Readonly<{name:string;bytes:Buffer}>;
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const MARK='[⟦⟧·\\s]*';
/** An exact accessible-name matcher for English text that also matches its pseudo-localized form. */
const L=(text:string)=>new RegExp(`^${MARK}${[...text].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join(MARK)}${MARK}$`);
/** Front ES2: English text to its Spanish form, from the catalog and the camera map (the strings these flows click; the
 * English camera texts are listed here because the app's map module cannot load outside the page). */
const CAMERA_EN={sourceLive:'Ask VizieR live (sends only RA, Dec and search radius; tries the IDIA mirror, then CDS)',filter:'Filter',minutes:'Minutes',seconds:'Seconds',start:'Start exposure',statusDone:'Image ready.',save:'Save image (FITS)',saveNative:'Save image (VIREO header)'} as const;
const SPANISH=(()=>{
 const out=new Map<string,string>();
 for(const [key,text] of Object.entries(en))if(Object.hasOwn(es,key))out.set(text,(es as Record<string,string>)[key]);
 for(const [key,text] of Object.entries(CAMERA_EN))out.set(text,(CAMERA_ES as unknown as Record<string,string>)[key]);
 out.set('Skip the tour',TOUR_ES.skip);
 out.set('Save spectrum (.SSP)',OBSERVATORY_ES.spectrumSave.save);// Front ES3: the route spectrum save panel
 return out;
})();
const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
/** The accessible-name matcher of an English text in this locale: its Spanish form in es-419 (which must exist), else `L`. */
const N=(locale:Locale,text:string)=>{if(locale!=='es-419')return L(text);const arrow=/ ↗$/.test(text)&&!SPANISH.has(text)?' ↗':'',spanish=SPANISH.get(arrow?text.slice(0,-2):text);if(!spanish)throw new Error(`No Spanish for “${text}”`);return exact(spanish+arrow);};
const button=(p:Page,name:string,locale:Locale='en')=>p.getByRole('button',{name:N(locale,name)});
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
/** A fixed instant for every Date read (timers keep running), so exports that record "now" are comparable. */
const NOW=new Date('2026-11-02T15:04:05.678Z');

async function open(page:Page,locale:Locale,hash:string,clock:'fixed'|'real'='fixed'){
 if(clock==='fixed')await page.clock.setFixedTime(NOW);
 await page.goto(`/${locale==='en'?'':`?lang=${locale}`}#${hash}`);
 await expect(page.locator('html')).toHaveAttribute('lang',locale==='es-419'?'es-419':'en');
 if(locale==='qps')await expect.poll(()=>page.title()).toMatch(/^⟦/);
 const skip=page.getByRole('button',{name:N(locale,'Skip the tour')});// the first-visit tour (translated since ES1)
 if(await skip.isVisible().catch(()=>false))await skip.click();
}
async function download(page:Page,click:()=>Promise<void>):Promise<File>{
 const event=page.waitForEvent('download');await click();const d=await event;
 return {name:d.suggestedFilename(),bytes:await readFile((await d.path())!)};
}
/** Runs `flow` in a fresh English context and a fresh qps context and compares every file it returns. `scope` is the flow's own
 * part of the page: in qps it must show at least one ⟦, so a route where the pseudo-locale silently did not apply cannot pass by
 * comparing English with English. `masks` hides documented run-dependent values (wall clock, random stream) before hashing. */
async function identical(browser:Browser,baseURL:string|undefined,flow:(page:Page,locale:Locale)=>Promise<Record<string,File>>,masks:Readonly<Record<string,(b:Buffer)=>Buffer>>,scope:(page:Page)=>Locator,
 /** Front ES2: the families whose screens are translated also run in Spanish (es-419), and must match English the same way. */
 locales:readonly Locale[]=['en','qps']){
 const results:Partial<Record<Locale,Record<string,File>>>={};
 for(const locale of locales){
  const context=await browser.newContext({baseURL,locale:'en-US',viewport:{width:1440,height:1050}}),page=await context.newPage();page.setDefaultTimeout(20_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   results[locale]=await flow(page,locale);
   if(locale==='qps')await expect(scope(page),'the pseudo-locale applied to this flow').toContainText('⟦');
   if(locale==='es-419')await expect(page.locator('html')).toHaveAttribute('lang','es-419');
  }finally{await context.close();}
  expect(errors,locale).toEqual([]);
 }
 const english=results.en!;
 for(const locale of locales.filter(l=>l!=='en')){const qps=results[locale]!;
 expect(Object.keys(qps)).toEqual(Object.keys(english));
 for(const [family,file] of Object.entries(english)){
  expect(file.bytes.length,family).toBeGreaterThan(0);
  expect(qps[family].name,family).toBe(file.name);
  expect(qps[family].bytes.includes('⟦'),`${family}: a pseudo-locale mark reached the file`).toBe(false);
  const mask=masks[family]??((b:Buffer)=>b);
  // Spanish text in a file (checked on the compared part, so binary image data is left out).
  if(locale==='es-419')expect(mask(qps[family].bytes).toString('utf8'),`${family}: Spanish reached the file`).not.toMatch(/[áéíóúñ¿¡]/);
  if(process.env.ES0_DUMP&&sha(mask(qps[family].bytes))!==sha(mask(file.bytes))){const {writeFile}=await import('node:fs/promises');await writeFile(`${process.env.ES0_DUMP}/${family}.en`,file.bytes);await writeFile(`${process.env.ES0_DUMP}/${family}.qps`,qps[family].bytes);}
  expect(sha(mask(qps[family].bytes)),`${family}: ${file.name}`).toBe(sha(mask(file.bytes)));
 }}
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
/** Front ES3 review: an analysis session after an acquisition records the observatory clock's elapsed time and the observation
 * record's JD, which follow real time between the steps (the analyser and the next route need running timers, so the page clock
 * cannot stay fixed). Only those two values are masked; every other field is compared as written. */
function observatoryTimeMasked(bytes:Buffer):Buffer{
 const doc=JSON.parse(bytes.toString('utf8')) as {base?:{observing?:{clockDrive?:{elapsedMS?:unknown}}};observations?:[unknown,{jd?:unknown}][]};
 const drive=doc.base?.observing?.clockDrive;if(drive&&'elapsedMS' in drive)drive.elapsedMS='<masked>';
 for(const o of doc.observations??[])if(o[1]&&'jd' in o[1])o[1].jd='<masked>';
 return Buffer.from(JSON.stringify(doc),'utf8');
}
/** Front ES3 closure: the own Observational Results text and CSV write that record's JD (6 decimals, about 86 ms) as
 * `record_jd`, which follows real time between the steps too. Only that value is masked: the `record_jd:` line of the text and the
 * last field (record_jd) of each CSV data row; every other byte, the CSV header included, is compared as written. */
const masked=(text:string,what:string)=>{if(!text.includes('<masked>'))throw new Error(`${what}: no record_jd to mask`);return Buffer.from(text,'latin1');};
const recordJdTextMasked=(bytes:Buffer)=>masked(bytes.toString('latin1').replace(/^(record_jd: )\d+\.\d{6}(?=\r?$)/gm,'$1<masked>'),'results text');
const recordJdCsvMasked=(bytes:Buffer)=>masked(bytes.toString('latin1').replace(/^(?!schema,)(.*,)\d+\.\d{6}(?=\r?$)/gm,'$1<masked>'),'results CSV');
function fitsHeader(bytes:Buffer):Buffer{
 const cards:string[]=[];
 for(let at=0;at+80<=bytes.length;at+=80){const card=bytes.subarray(at,at+80).toString('latin1');const key=card.slice(0,8).trim();cards.push(TIMED_CARDS.has(key)?`${card.slice(0,10)}<masked>`:card);if(key==='END')break;}
 return Buffer.from(cards.join('\n'),'latin1');
}

test.describe.configure({mode:'parallel'});

// Front ES3: the E01 analyser screens are translated, so these families also run in Spanish (es-419).
test('spectrum analysis: measurement CSV, velocities CSV and the analysis session',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'spectrum');
  await page.getByLabel(N(locale,'Import spectrum')).setInputFiles({name:'identity-vector.csv',mimeType:'text/csv',buffer:SPECTRUM});
  await page.getByLabel(N(locale,'Object or reference')).fill('Identity vector');
  await page.getByLabel(N(locale,'z step per tick')).fill('0.015625');await button(page,'Apply step',locale).click();
  await page.getByRole('slider').focus();await page.getByRole('slider').press('ArrowRight');
  await page.getByRole('button',{name:locale==='es-419'?new RegExp(`^\\s*${SPANISH.get('Record measurement')}`):/R[eé]c[oó]rd m[eé][aá]s[uú]r[eé]m[eé]nt/}).click();await button(page,'Save measurement',locale).click();
  await expect(page.locator('#measurement-log tbody tr')).toHaveCount(1);
  const measurements=await download(page,()=>button(page,'Export CSV ↓',locale).click());
  await page.getByText(N(locale,'Velocity analysis')).click();
  const velocities=await download(page,()=>button(page,'Export velocities CSV',locale).click());
  const session=await download(page,()=>button(page,'Save session',locale).first().click());
  return {measurements,velocities,session};
 },{},page=>page.locator('.spectrum-route'),['en','qps','es-419']);
});

// Front ES3 review: an acquired catalogue galaxy recorded through VIREO's Observational Data (typed velocity, Sp.Type and
// remarks) writes the measurement CSV and analysis session, the own Observational Results text and CSV, the acquired SSP and the
// analysis spectrum. One second of exposure on the page clock from a fixed instant; only the observatory clock's elapsed time and
// the record's JD are masked (observatoryTimeMasked, recordJdTextMasked, recordJdCsvMasked), because they follow real time.
test('E01 measurement through Observational Data: measurement CSV, session, results text/CSV, acquired SSP and analysis spectrum',async({browser,baseURL})=>{
 test.setTimeout(180_000);
 await identical(browser,baseURL,async(page,locale)=>{
  page.setDefaultTimeout(30_000);
  await page.clock.install({time:NOW});
  await page.goto(`/${locale==='en'?'':`?lang=${locale}`}#galaxy-exposure`);
  const skip=page.getByRole('button',{name:N(locale,'Skip the tour')});if(await skip.isVisible().catch(()=>false))await skip.click();
  await page.getByLabel(N(locale,'Acquisition galaxy')).selectOption('36747');
  await button(page,'Activate supported galaxy field',locale).click();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await button(page,'Start galaxy exposure',locale).click();
  await page.clock.runFor(1000);await button(page,'Pause exposure',locale).first().click();await page.clock.resume();
  await button(page,'Analyze acquired galaxy',locale).click();
  await page.getByLabel(N(locale,'z step per tick')).fill('.001');await button(page,'Apply step',locale).click();await page.getByRole('slider').fill('10');
  await page.getByRole('button',{name:locale==='es-419'?new RegExp(`^\\s*${SPANISH.get('Record measurement')}`):/R[eé]c[oó]rd m[eé][aá]s[uú]r[eé]m[eé]nt/}).click();
  const dialog=page.getByTestId('hubble-obsdata');await expect(dialog).toBeVisible();
  await page.getByTestId('hubble-obsdata-vel').fill('2997.92');await page.getByTestId('hubble-obsdata-sp').fill('G5');await page.getByTestId('hubble-obsdata-remarks').fill('typed, with comma');
  await page.getByTestId('hubble-obsdata-ok').click();await expect(dialog).toHaveCount(0);
  await expect(page.locator('#measurement-log tbody tr')).toHaveCount(1);
  const measurements=await download(page,()=>button(page,'Export CSV ↓',locale).click());
  const session=await download(page,()=>button(page,'Save session',locale).first().click());
  await page.locator('.own-results-card').evaluate(d=>{(d as HTMLDetailsElement).open=true;});
  const resultsText=await download(page,()=>button(page,'Download results text',locale).click());
  const resultsCsv=await download(page,()=>button(page,'Download results CSV',locale).click());
  const ssp=await download(page,()=>button(page,'Download acquired SSP',locale).click());
  const spectrum=await download(page,()=>button(page,'Download analysis spectrum',locale).click());
  return {measurements,session,resultsText,resultsCsv,ssp,spectrum};
 },{session:observatoryTimeMasked,resultsText:recordJdTextMasked,resultsCsv:recordJdCsvMasked},page=>page.locator('.spectrum-route'),['en','qps','es-419']);
});

test('Hubble analysis: Hubble CSV and the Hubble session from the original workbook example',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'spectrum');
  await page.getByText(N(locale,'Hubble diagram & distances')).click();
  await button(page,'Load original workbook example',locale).click();
  await page.getByLabel(N(locale,'Distance and summary recipe')).selectOption('vireo');
  await expect(page.locator('.hubble-card').getByTestId('hubble-value')).toHaveText('52.49829 km/s/Mpc');
  const csv=await download(page,()=>button(page,'Export Hubble CSV',locale).click());
  const session=await download(page,()=>button(page,'Save Hubble session',locale).click());
  return {csv,session};
 },{},page=>page.locator('.hubble-card'),['en','qps','es-419']);
});

// Front ES5: every file a student can save on the E03 route, in English, qps and Spanish. The page clock is installed at NOW and
// paused before the acquisition's one-second exposure and stays paused (only runFor moves it), so the observation notebook's
// and the recovery copies' times and the observatory clock are the same in every run; nothing is masked.
test('E03 classification: session, CSV, width record, investigations, observation notebook and recoveries, DAT and TXT inspectors, imported spectrum',async({browser,baseURL})=>{
 test.setTimeout(240_000);
 // The canonical 3-band counts layout of tests/native-csv-export.spec.ts (authored, not an original observation).
 const header='Object ID    MJD(Days)      RA           Dec    '+['U','B','V'].map(f=>'     '+f+'    ').join('')+'     Z      Spectrum     Comments';
 const row='OWN-TXT'.padEnd(12)+'1179.125000 '+' 05h03m04.5s '+'-06°07\'08" '+Array(3).fill('100.0'.padStart(9)+' ').join('')+'0.125'.padStart(11)+' '+'G2V'.padEnd(12)+' Original, comment with spaces';
 const txt=Buffer.from(`${header}\r\n${row}\r\n${row}\r\n`,'latin1');
 const dat=readFileSync(new URL('../fixtures/observation-results-synthetic.dat',import.meta.url));
 await identical(browser,baseURL,async(page,locale)=>{
  page.setDefaultTimeout(30_000);
  // Headless Chromium drops the 11th of more than ten fast downloads (tests/fixtures/download-pacing.ts): pace each one.
  const save=async(click:()=>Promise<void>)=>{await paceDownload(page);return download(page,click);};const B=(name:string)=>button(page,name,locale),F=(name:string)=>page.getByLabel(N(locale,name));
  await page.clock.install({time:NOW});
  // The classification route loads (lazily, with its spectra) while the clock still runs; then the clock is paused for good.
  await page.goto(`/${locale==='en'?'':`?lang=${locale}`}#classification`);
  const skip=page.getByRole('button',{name:N(locale,'Skip the tour')});if(await skip.isVisible().catch(()=>false))await skip.click();
  await expect(B('Review classification')).toBeEnabled({timeout:30_000});
  await page.evaluate(()=>{location.hash='#star-exposure';});
  await B('Activate supported star field').click();await page.clock.pauseAt(new Date(NOW.getTime()+600_000));
  await B('Start star exposure').click();await page.clock.runFor(1000);await B('Pause exposure').click();await expect(page.getByTestId('star-elapsed')).toHaveText('1000 ms');
  await B('Classify acquired star').click();await expect(B('Review classification')).toBeEnabled();
  await page.locator('#class-source').selectOption('practice');await expect(page.locator('main.classification-main')).toHaveAttribute('aria-busy','false');await expect(B('Review classification')).toBeEnabled();
  await F('Proposed spectral type').fill('My independent type');await F('Features and reasoning').fill('Independent reasoning retained throughout export');
  await B('Review classification').click();await B('Save classification').click();
  for(const [label,value] of [['Feature center (Å)','4150'],['Left shoulder (Å)','4100'],['Left continuum intensity','.99'],['Right shoulder (Å)','4200'],['Right continuum intensity','.98']] as const)await F(label).fill(value);
  await B('Calculate equivalent width').click();await B('Save width measurement').click();await expect(page.locator('.feature-measurement ol li')).toHaveCount(1);
  await B('Open observation results').click();await F('Observation spectral type (up to 12 bytes)').fill('G2V');await F('Observation remarks (up to 36 bytes)').fill('First remarks');await B('Record observation result').click();
  const session=await save(()=>B('Save classification session').click());
  const classification=await save(()=>B('Export classification CSV').click());
  const investigation=await save(()=>B('Save complete investigation').first().click());
  const notebook=await save(()=>B('Export observation notebook').click());
  await page.getByRole('button',{name:locale==='es-419'?exact(es['obs.edit'].replace('{id}','1')):L('Edit observation result 1')}).click();await F('Observation remarks (up to 36 bytes)').fill('Edited remarks');await B('Record observation result').click();
  const editRecovery=await save(()=>B('Export edit recovery').click());
  const editedNotebook=await save(()=>B('Export observation notebook').click());
  await F('Import SP or SSP for visual classification (up to 2 MiB)').setInputFiles({name:'limited.sp',mimeType:'text/plain',buffer:Buffer.from('3900 .2\n4200 .8\n4500 .4\n')});
  await expect(page.locator('#class-source')).toHaveValue(/^imported:/);await expect(B('Review classification')).toBeEnabled();
  const imported=await save(()=>B('Download exact imported spectrum').click());
  await F('Inspect observation DAT (up to 144000 bytes, 1000 records)').setInputFiles({name:'synthetic-format-check.dat',mimeType:'application/octet-stream',buffer:dat});
  const datUnchanged=await save(()=>B('Download unchanged DAT bytes').click());
  await B('Edit selected DAT text fields').click();await F('DAT object label (up to 15 bytes)').fill('EDITED-OBJ');await B('Confirm DAT text changes').click();
  const datEdited=await save(()=>B('Download edited DAT copy').click());
  await F('Inspect native results TXT (up to 512 KiB, 1000 rows)').setInputFiles({name:'identity.txt',mimeType:'text/plain',buffer:txt});
  await expect(B('Preview native CSV from TXT')).toBeEnabled();
  const txtUnchanged=await save(()=>B('Download unchanged TXT bytes').click());
  await B('Preview native CSV from TXT').click();
  const nativeCsv=await save(()=>B('Download generated native CSV').click());
  const investigationAll=await save(()=>B('Save complete investigation').first().click());
  // The edits reached their files (so the families compare an edited copy, not the input twice).
  expect(datEdited.bytes.equals(datUnchanged.bytes)).toBe(false);expect(editedNotebook.bytes.equals(notebook.bytes)).toBe(false);expect(investigationAll.bytes.equals(investigation.bytes)).toBe(false);
  return {session,classification,investigation,notebook,editRecovery,editedNotebook,datUnchanged,datEdited,txtUnchanged,nativeCsv,imported,investigationAll};
 },{},page=>page.locator('.classification-main'),['en','qps','es-419']);
});

test('hot list: Save HTL file after adding a target',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'observatory');
  await page.getByRole('heading',{name:N(locale,'Original hot lists')}).click();
  await button(page,'New HTL list',locale).click();await button(page,'Add HTL target',locale).click();
  await page.getByLabel(N(locale,'HTL identifier')).fill('Student 1');await page.getByLabel(N(locale,'HTL remarks')).fill('manual coordinates');
  await page.getByLabel(N(locale,'HTL right ascension · hours')).fill('23.75');await page.getByLabel(N(locale,'HTL declination · degrees')).fill('-30');
  await button(page,'Apply HTL edit',locale).click();await expect(page.locator('#htl-rows option')).toHaveCount(1);
  return {htl:await download(page,()=>button(page,'Save HTL file',locale).click())};
 },{},page=>page.locator('.htl-card'),['en','qps','es-419']);
});

test('options file: Save Updates writes VEO_OPTS.json',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'observatory');
  await button(page,'Open dome ↗',locale).click();await page.getByLabel(N(locale,'Target')).selectOption('N0000.DAT@14428');
  await button(page,'Point telescope ↗',locale).click();await button(page,'Switch to telescope view ↗',locale).click();
  await enterInstructorMode(page);
  await page.locator('.telescope-motion').getByTestId('ob-options').click();await expect(page.getByTestId('ob-options-dialog')).toBeVisible();
  await page.getByTestId('ob-options-test-mode').check();await page.getByTestId('ob-options-show-object-id').check();
  return {options:await download(page,()=>page.getByTestId('ob-options-save').click())};
 },{},page=>page.locator('.telescope-motion'),['en','qps','es-419']);
});

// Front ES2: the observatory's File › Field Information lists (Edit Mode) and the QSO List (Virtual Observatory) write the lines
// they show; the windows around them are translated, the files are not.
test('field information: Star Data List Save Text and Comma Delimit, QSO List Save Text',async({browser,baseURL})=>{
 test.setTimeout(120_000);
 const id=(page:Page,testId:string)=>page.getByTestId(testId);
 const ok=async(page:Page)=>{await id(page,'fi-box').getByRole('button').first().click();await expect(id(page,'fi-box')).toHaveCount(0);};
 const save=async(page:Page,list:string,kind:'displayed'|'csv')=>{const f=await download(page,async()=>{await id(page,`${list}-list-menu`).click();await id(page,`${list}-save-menu`).click();await id(page,`${list}-save-${kind}`).click();});await ok(page);return f;};
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'observatory');
  await page.locator('.sky-card .card-heading > button').click();
  await enterInstructorMode(page);await page.locator('.telescope-motion').getByTestId('ob-options').click();
  await id(page,'ob-options-edit-mode').check();await id(page,'ob-options-virtual-observatory').check();await id(page,'ob-options-ok').click();
  await id(page,'fi-file-menu').click();await id(page,'fi-field-information').click();await id(page,'fi-star-list').click();
  await expect(id(page,'fi-slist-line-2')).toBeVisible({timeout:20_000});
  const starText=await save(page,'fi-slist','displayed'),starCsv=await save(page,'fi-slist','csv');
  await id(page,'fi-file-menu').click();await id(page,'qso-menu').click();await page.locator('[data-testid=qso-ok],[data-testid=qso-dialog-ok]').first().click();
  await expect(id(page,'qso-list-line-2')).toBeVisible({timeout:20_000});
  return {starText,starCsv,qsoText:await save(page,'qso-list','displayed')};
 },{},page=>page.getByTestId('fi-slist'),['en','qps','es-419']);
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
  await page.goto(`/${locale==='en'?'':`?lang=${locale}`}#spectrometer`);
  await page.getByRole('link',{name:N(locale,'Open supported star exposure')}).click();
  await button(page,'Activate supported star field',locale).click();await expect(page.getByTestId('star-phase')).toHaveText(N(locale,'Ready / paused'));
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await button(page,'Start star exposure',locale).click();
  await page.clock.runFor(1000);await button(page,'Pause exposure',locale).click();await expect(page.getByTestId('star-elapsed')).toHaveText('1000 ms');
  const panel=page.getByTestId('ob-spectrum-save');
  return {ssp:await download(page,()=>panel.getByRole('button',{name:N(locale,'Save spectrum (.SSP)')}).click())};
 },{},page=>page.getByTestId('ob-spectrum-save'),['en','qps','es-419']);
});

// Front ES3: the galaxy, sky and star exposure routes of E01 write counts CSV and session JSON files; their screens are
// translated, the files are not. Each exposure runs one second on the page clock from a fixed instant.
test('E01 exposures: galaxy, sky and star counts CSV and session JSON',async({browser,baseURL})=>{
 test.setTimeout(120_000);
 const run=async(page:Page,locale:Locale,activate:string,start:string)=>{
  await button(page,activate,locale).click();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await button(page,start,locale).click();
  await page.clock.runFor(1000);await button(page,'Pause exposure',locale).first().click();
  await page.clock.resume();// the next route loads its configuration on timers
 };
 await identical(browser,baseURL,async(page,locale)=>{
  await page.clock.install({time:NOW});
  await page.goto(`/${locale==='en'?'':`?lang=${locale}`}#galaxy-exposure`);
  await run(page,locale,'Activate supported galaxy field','Start galaxy exposure');
  const galaxyCsv=await download(page,()=>button(page,'Save galaxy counts CSV',locale).click());
  const galaxyJson=await download(page,()=>button(page,'Save galaxy session JSON',locale).click());
  await page.evaluate(()=>{location.hash='#sky-exposure';});
  await run(page,locale,'Activate supported sky field','Start sky exposure');
  const skyCsv=await download(page,()=>button(page,'Save sky counts CSV',locale).click());
  const skyJson=await download(page,()=>button(page,'Save sky session JSON',locale).click());
  await page.evaluate(()=>{location.hash='#star-exposure';});
  await run(page,locale,'Activate supported star field','Start star exposure');
  const starCsv=await download(page,()=>button(page,'Save star counts CSV',locale).click());
  const starJson=await download(page,()=>button(page,'Save star session JSON',locale).click());
  return {galaxyCsv,galaxyJson,skyCsv,skyJson,starCsv,starJson};
 },{},page=>page.locator('.sky-exposure-controls:visible').first(),['en','qps','es-419']);
});

// Front ES3: the single-slit spectrometer at a free pointing (the spectrometer route) writes a counts CSV and an exposure
// session; NGC 4874 (Coma – 1) is pointed exactly, as tests/field-spectrometer.spec.ts does, and exposed one second on the page clock.
test('field spectrometer: Save counts CSV and Save exposure session at a free pointing',async({browser,baseURL})=>{
 test.setTimeout(400_000);
 await identical(browser,baseURL,async(page,locale)=>{
  page.setDefaultTimeout(90_000);
  await page.clock.install({time:NOW});
  await page.goto(`/${locale==='en'?'':`?lang=${locale}`}#observatory`);
  const skip=page.getByRole('button',{name:N(locale,'Skip the tour')});if(await skip.isVisible().catch(()=>false))await skip.click();
  await button(page,'Open dome ↗',locale).click();
  if(!await page.locator('#point-ra').isVisible())await page.getByText(N(locale,'Enter coordinates')).click();
  await page.locator('#point-ra').fill('12.99311111111111');await page.locator('#point-dec').fill('27.959722222222222');await button(page,'Point to coordinates',locale).click();
  await page.getByRole('button',{name:/^\s*[⟦]?\s*T[eé]l[eé]sc[oó]p[eéi]/}).first().click();
  if(!await button(page,'Turn tracking on',locale).isVisible())await page.getByText(N(locale,'Observatory clock & spectral tracking')).click();
  if(await button(page,'Turn tracking on',locale).isVisible())await button(page,'Turn tracking on',locale).click();
  await page.evaluate(()=>{location.hash='#spectrometer';});
  await expect(page.getByTestId('field-spec-use')).toBeEnabled();await page.getByTestId('field-spec-use').click();
  const acquisition=page.getByTestId('field-spec-acquisition');await expect(acquisition).toBeVisible();
  await expect(page.getByTestId('field-spec-access')).toHaveAttribute('data-access','ready');
  await acquisition.getByRole('button',{name:N(locale,'Activate spectrometer')}).click();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await acquisition.getByRole('button',{name:N(locale,'Start exposure')}).click();
  await page.clock.runFor(1000);await acquisition.getByRole('button',{name:N(locale,'Pause exposure')}).click();await page.clock.resume();
  const csv=await download(page,()=>acquisition.getByRole('button',{name:N(locale,'Save counts CSV')}).click());
  const session=await download(page,()=>acquisition.getByRole('button',{name:N(locale,'Save exposure session')}).click());
  return {csv,session};
 },{},page=>page.getByTestId('field-spectrometer'),['en','qps','es-419']);
});

test('CCD camera: Save image (FITS) and Save image (VIREO header) from the recorded VizieR answer',async({browser,baseURL})=>{
 test.setTimeout(120_000);
 const recorded=await readFile(new URL('../fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
 await identical(browser,baseURL,async(page,locale)=>{
  await page.route(/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/,route=>route.fulfill({status:200,contentType:'text/xml',body:recorded}));
  await open(page,locale,'observatory','real');
  await button(page,'Open dome ↗',locale).click();await page.getByLabel(N(locale,'Target')).selectOption('N0000.DAT@14428');
  await button(page,'Point telescope ↗',locale).click();await button(page,'Switch to telescope view ↗',locale).click();
  if(!await button(page,'Start observatory clock',locale).isVisible())await page.getByText(N(locale,'Observatory clock & spectral tracking')).click();
  await button(page,'Start observatory clock',locale).click();await button(page,'Turn tracking on',locale).click();
  const camera=page.getByTestId('camera-control');
  const es419=locale==='es-419',spanish=(text:string)=>new RegExp(SPANISH.get(text)!.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').slice(0,12));
  await camera.getByLabel(es419?spanish(CAMERA_EN.sourceLive):/[AÁ]sk V[ií]z[ií][eé]R l[ií]v[eé]/).check();await camera.getByLabel(es419?new RegExp(`^\\s*${SPANISH.get('Filter')}`):/F[ií]lt[eé]r/).selectOption('2');
  await camera.getByLabel(es419?new RegExp(`^\\s*${SPANISH.get('Minutes')}`):/M[ií]n[uú]t[eé]s/).fill('0');await camera.getByLabel(es419?new RegExp(`^\\s*${SPANISH.get('Seconds')}`):/S[eé]c[oó]nds/).fill('1');
  await camera.getByRole('button',{name:N(locale,CAMERA_EN.start)}).click();
  await expect(page.getByTestId('camera-status')).toHaveText(N(locale,'Image ready.'),{timeout:15_000});
  const fits=await download(page,()=>camera.getByRole('button',{name:N(locale,'Save image (FITS)')}).click());
  const native=await download(page,()=>camera.getByRole('button',{name:N(locale,'Save image (VIREO header)')}).click());
  return {fits,native};
 },{fits:fitsHeader,native:fitsHeader},page=>page.getByTestId('camera-control'),['en','qps','es-419']);
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

// Front ES1: the shell is translated, and its toolbar's Save investigation writes a file, so this family also runs in Spanish
// (es-419, the `?lang=es-419` preview). The three downloads must be byte-identical (decision 3: files stay English).
// Front ES4: exercise E02. On the LSS survey a student saves the exposure's counts CSV and session JSON, the acquired spectrum
// (.SSP), the results CSV and VIREO's results .TXT (Save Data), the whole investigation with the survey and its description, and,
// after Plot, the wedge's points CSV; the wedge then reads the saved .TXT back (Load Saved Data) and writes its CSV again. With
// Edit Mode (an instructor option), LSS Galaxy Data writes LSS_Galaxy_Data.TXT. The page clock is paused at a fixed instant
// before the exposure and only moves by runFor until the investigation is saved; the wedge and LSS Galaxy Data files written after
// it resumes record no time (the region rows take the observatory clock's JD, which stands still), so nothing is masked.
test('E02 LSS survey and wedge: counts CSV, session, SSP, results CSV and TXT, investigation, wedge CSV and LSS Galaxy Data TXT',async({browser,baseURL})=>{
 test.setTimeout(240_000);
 await identical(browser,baseURL,async(page,locale)=>{
  page.setDefaultTimeout(30_000);
  await page.clock.install({time:NOW});
  await page.goto(`/${locale==='en'?'':`?lang=${locale}`}#lss-survey`);
  const skip=page.getByRole('button',{name:N(locale,'Skip the tour')});if(await skip.isVisible().catch(()=>false))await skip.click();
  await expect(page.locator('#lss-field')).toBeEnabled({timeout:30_000});await page.locator('#lss-field').selectOption('1');
  await button(page,'Load selected list',locale).click();await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:30_000});
  await page.getByTestId('lss-row-1').getByRole('button',{name:N(locale,'Point and view')}).click();
  await button(page,'Activate spectrometer',locale).click();
  await page.clock.pauseAt(new Date(NOW.getTime()+600_000));// a fixed instant (loading took less), then only runFor
  await button(page,'Start exposure',locale).click();await page.clock.runFor(2000);await button(page,'Pause exposure',locale).click();
  await expect(page.getByTestId('lss-elapsed')).toContainText('2000');
  const countsCsv=await download(page,()=>button(page,'Save counts (CSV)',locale).click());
  const session=await download(page,()=>button(page,'Save exposure session',locale).click());
  const ssp=await download(page,()=>page.getByTestId('ob-spectrum-save').getByRole('button',{name:N(locale,'Save spectrum (.SSP)')}).click());
  await page.locator('#lss-step').fill('.001');await button(page,'Set step',locale).click();await page.locator('#lss-shift').fill('20');
  await page.locator('.lss-measure button.primary-button').click();// Record Z (a VIREO caption)
  const z=Number(await page.getByTestId('lss-dialog-z').inputValue());await page.getByTestId('lss-dialog-velocity').fill(String(Math.round(299792.458*z*100)/100));
  await page.locator('#lss-remarks').fill('first, typed');await page.locator('dialog.lss-dialog[open] button[type=submit]').click();
  await expect(page.locator('[data-testid=lss-results] tbody tr')).toHaveCount(1);
  const resultsCsv=await download(page,()=>button(page,'Save results (CSV)',locale).click());
  const resultsTxt=await download(page,()=>page.getByTestId('lss-results-txt').click());
  await page.locator('#lss-description').fill('One galaxy so far.');
  const toolbar=page.locator('.investigation-toolbar');
  const investigation=await download(page,()=>toolbar.getByRole('button',{name:locale==='es-419'?exact(es['project.save']):L('Save investigation')}).click());
  await page.clock.resume();// the wedge's lazy route needs running timers; nothing written after this follows the clock (checked with --repeat-each)
  await button(page,'Plot my records in the wedge',locale).click();await expect(page.getByTestId('wedge-count')).toBeVisible({timeout:30_000});
  const wedgeCsv=await download(page,()=>page.getByTestId('wedge-export').click());
  await page.getByTestId('wedge-file').setInputFiles({name:resultsTxt.name,mimeType:'text/plain',buffer:resultsTxt.bytes});
  await page.getByTestId('wedge-prompt-yes').click();await expect(page.getByTestId('wedge-notice')).toHaveAttribute('data-kind','loaded');
  const wedgeLoadedCsv=await download(page,()=>page.getByTestId('wedge-export').click());
  // LSS Galaxy Data (Edit Mode, instructor).
  await page.evaluate(()=>{location.hash='#observatory';});
  const dome=page.getByRole('button',{name:N(locale,'Open dome ↗')});if(await dome.isVisible())await dome.click();
  await enterInstructorMode(page);await page.getByTestId('ob-options').first().click();await page.getByTestId('ob-options-edit-mode').check();await page.getByTestId('ob-options-ok').click();
  await page.evaluate(()=>{location.hash='#lss-survey';});await page.getByTestId('lss-region-open').click();
  for(const [k,v] of [['raMin','12'],['raMax','12.5'],['decMin','27'],['decMax','29']])await page.getByTestId(`lss-region-${k}`).fill(v);
  await page.getByTestId('lss-region-ok').click();await expect(page.getByTestId('lss-region-box')).toContainText('24069',{timeout:30_000});
  await page.getByTestId('lss-region-box').getByRole('button').click();
  const regionTxt=await download(page,()=>page.getByTestId('lss-region-txt').click());
  return {countsCsv,session,ssp,resultsCsv,resultsTxt,investigation,wedgeCsv,wedgeLoadedCsv,regionTxt};
 },{},page=>page.locator('.lss-main'),['en','qps','es-419']);
});

test('the shell toolbar: Save investigation is byte-identical in English, qps and Spanish',async({browser,baseURL})=>{
 const files:Record<string,File>={};
 for(const locale of ['en','qps','es-419'] as const){
  const context=await browser.newContext({baseURL,locale:'en-US',viewport:{width:1440,height:1050}}),page=await context.newPage();page.setDefaultTimeout(20_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.clock.setFixedTime(NOW);await page.goto(`/?lang=${locale}#observatory`);
   const toolbar=page.locator('.investigation-toolbar');await expect(toolbar).toBeVisible({timeout:15_000});
   if(locale==='qps')await expect(toolbar,'the pseudo-locale applied').toContainText('⟦');
   if(locale==='es-419'){await expect(page.locator('html')).toHaveAttribute('lang','es-419');await expect(toolbar).toContainText(es['project.title']);}
   const name=locale==='es-419'?es['project.save']:L('Save investigation');
   files[locale]=await download(page,()=>toolbar.getByRole('button',{name,exact:typeof name==='string'||undefined}).click());
  }finally{await context.close();}
  expect(errors,locale).toEqual([]);
 }
 for(const locale of ['qps','es-419'])expect([files[locale].name,sha(files[locale].bytes)],locale).toEqual([files.en.name,sha(files.en.bytes)]);
 for(const f of Object.values(files)){expect(f.bytes.includes('⟦')).toBe(false);expect(f.bytes.toString('utf8')).not.toMatch(/[áéíóúñ¿¡]/);}
});

// Front ES6: the E04 flow (Pleiades photometry) in English, qps and Spanish: the photometer session JSON, VIREO's Record/Review rows
// shown by Display/Print Data and written with Save Text and Comma Delimit, and the saved investigation. The page clock is paused at
// a fixed instant before activation and only moves by runFor until the last file is written; nothing is masked (each record's JD is
// the observatory clock's, which stands still).
test('E04 Pleiades photometry: photometer session, Observational Results text and CSV, investigation',async({browser,baseURL})=>{
 test.setTimeout(180_000);
 const id=(page:Page,testId:string)=>page.getByTestId(testId);
 const T=(locale:Locale,key:string)=>locale==='es-419'?exact((es as Record<string,string>)[key]):L((en as Record<string,string>)[key]);
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'photometer');
  const main=page.locator('.photometer-main'),press=(key:string)=>main.getByRole('button',{name:T(locale,key)}).click();
  await expect(main.getByRole('heading',{level:1})).toBeVisible({timeout:20_000});
  await page.clock.pauseAt(new Date(NOW.getTime()+600_000));
  const integrate=async()=>{await press('ph.start');await page.clock.runFor(3100);await expect(id(page,'photo-phase')).toHaveText(T(locale,'ph.complete'));};
  const record=async(value:string,note:string)=>{await press('ph.record');await page.locator('#photo-manual').fill(value);await page.locator('#photo-note').fill(note);
   await page.locator('dialog[aria-labelledby=photo-entry-title] button[type=submit]').click();await expect(page.locator('dialog[aria-labelledby=photo-entry-title]')).toBeHidden();};
  await press('ph.activate');await page.locator('#photo-seconds').selectOption('1');await page.locator('#photo-repeats').selectOption('3');
  for(const band of ['V','B']){await page.locator('#photo-pointing').selectOption('sky');await page.locator('#photo-filter').selectOption(band);await integrate();
   await page.locator('#photo-pointing').selectOption('object');await integrate();await record(band==='V'?'10.5':'11.25',`${band} typed`);
   await id(page,'photo-record-review').click();await id(page,'photo-obs-data-sp').fill('B8V');await id(page,'photo-obs-data-remarks').fill('Pleiades star');await id(page,'photo-obs-data-ok').click();
   if(band==='V')await id(page,'photo-data-saved-ok').click();await expect(id(page,'photo-obs-data')).toHaveCount(0);}
  for(const band of ['b','v']){const select=page.locator(`#photo-${band}-reading`);await select.selectOption((await select.locator('option').last().getAttribute('value'))!);}
  await press('ph.calculateColor');await expect(id(page,'photo-manual-bv')).toHaveText('0.75');
  const session=await download(page,()=>press('ph.save'));
  await id(page,'photo-native-results').click();await expect(id(page,'photo-native-list-lines')).toContainText('Pleiades star');
  const list=async(kind:'displayed'|'csv')=>{const f=await download(page,async()=>{await id(page,'photo-native-list-list-menu').click();await id(page,'photo-native-list-save-menu').click();await id(page,`photo-native-list-save-${kind}`).click();});
   await id(page,'fi-box').getByRole('button').first().click();await expect(id(page,'fi-box')).toHaveCount(0);return f;};
  const resultsText=await list('displayed'),resultsCsv=await list('csv');
  const toolbar=page.locator('.investigation-toolbar');
  const investigation=await download(page,()=>toolbar.getByRole('button',{name:locale==='es-419'?exact(es['project.save']):L('Save investigation')}).click());
  return {session,resultsText,resultsCsv,investigation};
 },{},page=>page.locator('.photometer-main'),['en','qps','es-419']);
});
