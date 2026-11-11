import {type Browser,type Locator,type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {contextLocale,contextQuery} from '../fixtures/language';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {enterInstructorMode} from '../fixtures/instructor-mode';
import {PLR,HEADER,CONTROL} from '../fixtures/pulsar-saved-rows-controls';
import {paceDownload} from '../fixtures/download-pacing';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import {CAMERA_ES} from '../../src/i18n/es/maps/camera';
import {TOUR_ES} from '../../src/i18n/es/maps/tour';
import {OBSERVATORY_ES} from '../../src/i18n/es/maps/observatory';
import {TRANSLATED,e01e02Maps,e08Maps,textOf as ptText} from './languageText';
// Front ES0 (docs/I18N.md; user decision 3, 2026-11-09): the files the site writes stay exactly as VIREO or the web contract
// writes them, in English, whatever the screen language. Each export family is downloaded once in English and once in the
// dev-only pseudo-locale qps (?lang=qps: every catalog, map and vireo() string marked ⟦…⟧, accented and ~35 % longer), from the
// same deterministic path, and the two downloads must have the same file name and SHA-256, with no ⟦ in the qps bytes.
// Spanish (es-419) joins each family when its sub-front lands (ES1 onwards; ES2: the hot list HTL, the options file and the
// CCD camera FITS, whose screens it translates). Selectors go through `L`, which matches an English
// accessible name in both languages (the pseudo-locale only adds marks and padding and accents vowels).

// Front PT0 (plan front-i18n-pt-br.md §1.2 #15): every translated language of the registry joins as its fronts land (pt-BR from
// PT0, its `?lang=pt-BR` preview in an en-US browser before its release, tests/fixtures/language.ts). Its text comes from its own
// catalog (tests/i18n/languageText.ts), and its own letters must never reach a file.
type Locale='en'|'qps'|'es-419'|'pt-BR';
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
/** A translated language's letters that English text never has (Spanish á é í ó ú ñ ¿ ¡; Portuguese ã õ ç â ê ô à…). */
const LETTERS:Readonly<Record<string,RegExp>>=Object.fromEntries(TRANSLATED.map(t=>[t.tag,t.letters]));
const HTML_LANG:Readonly<Record<Locale,string>>={en:'en',qps:'en','es-419':'es-419','pt-BR':'pt-BR'};
/** The accessible-name matcher of an English text in this locale: its Spanish form in es-419 (which must exist), a language before
 * its release its own form or the English the page then shows (languageText.ts `text`), else `L`. */
const N=(locale:Locale,text:string)=>{if(locale==='pt-BR'){const t=TRANSLATED.find(x=>x.tag===locale)!;if(text==='Skip the tour')return exact(t.maps.tour.skip);if(text==='Save spectrum (.SSP)')return exact((e01e02Maps(locale).observatory as typeof OBSERVATORY_ES).spectrumSave.save);
 // Front PT1: a button whose English ends in “ ↗” is its catalog text plus the arrow the component adds, as for Spanish.
 // Front PT-REL: a released language's `text` throws for an English text it lacks (it no longer falls back), so look first.
 const has=(english:string)=>{try{t.text(english);return true;}catch{return false;}};
 const arrow=/ ↗$/.test(text)&&!has(text)?' ↗':'';return exact(t.text(arrow?text.slice(0,-2):text)+arrow);}if(locale!=='es-419')return L(text);const arrow=/ ↗$/.test(text)&&!SPANISH.has(text)?' ↗':'',spanish=SPANISH.get(arrow?text.slice(0,-2):text);if(!spanish)throw new Error(`No Spanish for “${text}”`);return exact(spanish+arrow);};
/** Front PT2: a Portuguese accessible name that starts with this English text's translation (a button whose name adds a glyph). */
const ptStart=(english:string)=>new RegExp(`^\\s*${ptText('pt-BR').text(english).replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')}`);
/** The variable-star catalog's 31,147 records as the screen writes them: Front PT-REL, Portuguese groups thousands with U+202F. */
const catalogCount=(locale:Locale)=>locale==='pt-BR'?'31\u202f147':'31,147';
const button=(p:Page,name:string,locale:Locale='en')=>p.getByRole('button',{name:N(locale,name)});
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
/** A fixed instant for every Date read (timers keep running), so exports that record "now" are comparable. */
const NOW=new Date('2026-11-02T15:04:05.678Z');

async function open(page:Page,locale:Locale,hash:string,clock:'fixed'|'real'='fixed'){
 if(clock==='fixed')await page.clock.setFixedTime(NOW);
 await page.goto(`/${contextQuery(locale)}#${hash}`);
 await expect(page.locator('html')).toHaveAttribute('lang',HTML_LANG[locale]);
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
  const context=await browser.newContext({baseURL,locale:contextLocale(locale),viewport:{width:1440,height:1050}}),page=await context.newPage();page.setDefaultTimeout(20_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   results[locale]=await flow(page,locale);
   if(locale==='qps')await expect(scope(page),'the pseudo-locale applied to this flow').toContainText('⟦');
   if(LETTERS[locale])await expect(page.locator('html')).toHaveAttribute('lang',HTML_LANG[locale]);
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
  if(LETTERS[locale])expect(mask(qps[family].bytes).toString('utf8'),`${family}: ${locale} text reached the file`).not.toMatch(LETTERS[locale]);
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
test.describe.configure({mode:'parallel'});

// Front ES3: the E01 analyser screens are translated, so these families also run in Spanish (es-419).
// Front PT2: the E01 and E02 families below (analyser, Observational Data, Hubble, star SSP, exposures, field spectrometer, LSS and
// wedge) also run in Brazilian Portuguese (pt-BR; its `?lang=pt-BR` preview until PT-REL, a pt-BR browser since): same names and SHA-256 as English, no Portuguese letter in the files.
test('spectrum analysis: measurement CSV, velocities CSV and the analysis session',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'spectrum');
  await page.getByLabel(N(locale,'Import spectrum')).setInputFiles({name:'identity-vector.csv',mimeType:'text/csv',buffer:SPECTRUM});
  // Front ES-REL review: the import hashes the file asynchronously and then clears the object field, so the name is typed only
  // after the file is in (a fill that raced it left the row "Unidentified" in one run).
  await expect(page.locator('.spectrum-route .file-identity')).toContainText('identity-vector.csv');
  await page.getByLabel(N(locale,'Object or reference')).fill('Identity vector');
  await page.getByLabel(N(locale,'z step per tick')).fill('0.015625');await button(page,'Apply step',locale).click();
  await page.getByRole('slider').focus();await page.getByRole('slider').press('ArrowRight');
  await page.getByRole('button',{name:locale==='es-419'?new RegExp(`^\\s*${SPANISH.get('Record measurement')}`):locale==='pt-BR'?ptStart('Record measurement'):/R[eé]c[oó]rd m[eé][aá]s[uú]r[eé]m[eé]nt/}).click();await button(page,'Save measurement',locale).click();
  await expect(page.locator('#measurement-log tbody tr')).toHaveCount(1);
  const measurements=await download(page,()=>button(page,'Export CSV ↓',locale).click());
  await page.getByText(N(locale,'Velocity analysis')).click();
  const velocities=await download(page,()=>button(page,'Export velocities CSV',locale).click());
  const session=await download(page,()=>button(page,'Save session',locale).first().click());
  return {measurements,velocities,session};
 },{},page=>page.locator('.spectrum-route'),['en','qps','es-419','pt-BR']);
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
  await page.goto(`/${contextQuery(locale)}#galaxy-exposure`);
  const skip=page.getByRole('button',{name:N(locale,'Skip the tour')});if(await skip.isVisible().catch(()=>false))await skip.click();
  await page.getByLabel(N(locale,'Acquisition galaxy')).selectOption('36747');
  await button(page,'Activate supported galaxy field',locale).click();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await button(page,'Start galaxy exposure',locale).click();
  await page.clock.runFor(1000);await button(page,'Pause exposure',locale).first().click();await page.clock.resume();
  await button(page,'Analyze acquired galaxy',locale).click();
  await page.getByLabel(N(locale,'z step per tick')).fill('.001');await button(page,'Apply step',locale).click();await page.getByRole('slider').fill('10');
  await page.getByRole('button',{name:locale==='es-419'?new RegExp(`^\\s*${SPANISH.get('Record measurement')}`):locale==='pt-BR'?ptStart('Record measurement'):/R[eé]c[oó]rd m[eé][aá]s[uú]r[eé]m[eé]nt/}).click();
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
 },{session:observatoryTimeMasked,resultsText:recordJdTextMasked,resultsCsv:recordJdCsvMasked},page=>page.locator('.spectrum-route'),['en','qps','es-419','pt-BR']);
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
 },{},page=>page.locator('.hubble-card'),['en','qps','es-419','pt-BR']);
});

/** Front PT3: the Portuguese catalog the E03 family reads (the notebook's Edit button carries its row number). */
const PT_E03=TRANSLATED.find(x=>x.tag==='pt-BR')!.catalog as Readonly<Record<string,string>>;
// Front PT3: and in pt-BR (its `?lang=pt-BR` preview).
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
  await page.goto(`/${contextQuery(locale)}#classification`);
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
  await page.getByRole('button',{name:locale==='es-419'?exact(es['obs.edit'].replace('{id}','1')):locale==='pt-BR'?exact(PT_E03['obs.edit'].replace('{id}','1')):L('Edit observation result 1')}).click();await F('Observation remarks (up to 36 bytes)').fill('Edited remarks');await B('Record observation result').click();
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
  // Front PT3: the flow's own screen is Portuguese in pt-BR, so the family cannot pass by comparing English with English.
  if(locale==='pt-BR')await expect(page.locator('.classification-main h1')).toHaveText(PT_E03['class.title']);
  return {session,classification,investigation,notebook,editRecovery,editedNotebook,datUnchanged,datEdited,txtUnchanged,nativeCsv,imported,investigationAll};
 },{},page=>page.locator('.classification-main'),['en','qps','es-419','pt-BR']);
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
 },{},page=>page.locator('.htl-card'),['en','qps','es-419','pt-BR']);
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
 },{},page=>page.locator('.telescope-motion'),['en','qps','es-419','pt-BR']);
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
 },{},page=>page.getByTestId('fi-slist'),['en','qps','es-419','pt-BR']);
});

test('variable stars: Save Text › As Displayed',async({browser,baseURL})=>{
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'variable-stars');
  await expect(page.getByTestId('variable-count')).toContainText(catalogCount(locale),{timeout:20_000});
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
  await page.goto(`/${contextQuery(locale)}#spectrometer`);
  await page.getByRole('link',{name:N(locale,'Open supported star exposure')}).click();
  await button(page,'Activate supported star field',locale).click();await expect(page.getByTestId('star-phase')).toHaveText(N(locale,'Ready / paused'));
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await button(page,'Start star exposure',locale).click();
  await page.clock.runFor(1000);await button(page,'Pause exposure',locale).click();await expect(page.getByTestId('star-elapsed')).toHaveText('1000 ms');
  const panel=page.getByTestId('ob-spectrum-save');
  return {ssp:await download(page,()=>panel.getByRole('button',{name:N(locale,'Save spectrum (.SSP)')}).click())};
 },{},page=>page.getByTestId('ob-spectrum-save'),['en','qps','es-419','pt-BR']);
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
  await page.goto(`/${contextQuery(locale)}#galaxy-exposure`);
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
 },{},page=>page.locator('.sky-exposure-controls:visible').first(),['en','qps','es-419','pt-BR']);
});

// Front ES3: the single-slit spectrometer at a free pointing (the spectrometer route) writes a counts CSV and an exposure
// session; NGC 4874 (Coma – 1) is pointed exactly, as tests/field-spectrometer.spec.ts does, and exposed one second on the page clock.
test('field spectrometer: Save counts CSV and Save exposure session at a free pointing',async({browser,baseURL})=>{
 test.setTimeout(400_000);
 await identical(browser,baseURL,async(page,locale)=>{
  page.setDefaultTimeout(90_000);
  await page.clock.install({time:NOW});
  await page.goto(`/${contextQuery(locale)}#observatory`);
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
 },{},page=>page.getByTestId('field-spectrometer'),['en','qps','es-419','pt-BR']);
});

test('CCD camera: Save image (FITS) and Save image (VIREO header) from the recorded VizieR answer',async({browser,baseURL})=>{
 test.setTimeout(120_000);
 const recorded=await readFile(new URL('../fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
 // Front ES9: the page clock is installed at a fixed instant and paused before the exposure (the FITS file name, DATE-OBS, MJD-OBS
 // and the pointing follow it; with the real clock a save could cross a second boundary), and the random stream is fixed
 // (fixedRandom below), so the whole files, pixels included, are compared without masks.
 const C=CAMERA_ES as unknown as Readonly<Record<string,string>>,NX=(locale:Locale,english:string,spanish:string)=>locale==='es-419'?exact(spanish):L(english);
 await identical(browser,baseURL,async(page,locale)=>{
  await page.route(/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/,route=>route.fulfill({status:200,contentType:'text/xml',body:recorded}));
  await fixedRandom(page);await page.clock.install({time:NOW});
  await page.goto(`/${contextQuery(locale)}#observatory`);
  const skip=page.getByRole('button',{name:N(locale,'Skip the tour')});if(await skip.isVisible().catch(()=>false))await skip.click();
  await button(page,'Open dome ↗',locale).click();await page.getByLabel(N(locale,'Target')).selectOption('N0000.DAT@14428');
  await button(page,'Point telescope ↗',locale).click();await button(page,'Switch to telescope view ↗',locale).click();
  await page.clock.pauseAt(new Date(NOW.getTime()+600_000));
  if(!await button(page,'Start observatory clock',locale).isVisible())await page.getByText(N(locale,'Observatory clock & spectral tracking')).click();
  await button(page,'Start observatory clock',locale).click();await button(page,'Turn tracking on',locale).click();
  const camera=page.getByTestId('camera-control');
  await camera.getByLabel(locale==='es-419'?new RegExp(`^\\s*${SPANISH.get('Filter')}`):/F[ií]lt[eé]r/).selectOption('2');
  await exposePaused(page,locale,NX,C);
  const fits=await download(page,()=>camera.getByRole('button',{name:N(locale,'Save image (FITS)')}).click());
  const native=await download(page,()=>camera.getByRole('button',{name:N(locale,'Save image (VIREO header)')}).click());
  return {fits,native};
 },{fits:fitsWhole,native:fitsWhole},page=>page.getByTestId('camera-control'),['en','qps','es-419']);
});

test('radio telescope: Download capture as .PLR of a model-generated recording',async({browser,baseURL})=>{
 test.setTimeout(180_000);
 const id=(page:Page,testId:string)=>page.getByTestId(testId);
 const flush=async(page:Page)=>{for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));};
 const advance=async(page:Page,ms:number)=>{for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}};
 const tool=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name:L(name)});
 await identical(browser,baseURL,async(page,locale)=>{
  await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
  await page.goto(`/${contextQuery(locale)}#pulsar-analysis`);await expect(id(page,'pulsar-none')).toBeVisible();
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
// (es-419: an es-MX browser since ES-REL, the `?lang=es-419` preview before it). The three downloads must be byte-identical (decision 3: files stay English).
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
  await page.goto(`/${contextQuery(locale)}#lss-survey`);
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
  const investigation=await download(page,()=>toolbar.getByRole('button',{name:locale==='es-419'?exact(es['project.save']):locale==='pt-BR'?exact(ptText('pt-BR').catalog['project.save']!):L('Save investigation')}).click());
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
 },{},page=>page.locator('.lss-main'),['en','qps','es-419','pt-BR']);
});

test('the shell toolbar: Save investigation is byte-identical in English, qps, Spanish and Brazilian Portuguese',async({browser,baseURL})=>{
 const files:Record<string,File>={};
 for(const locale of ['en','qps','es-419','pt-BR'] as const){
  const context=await browser.newContext({baseURL,locale:contextLocale(locale),viewport:{width:1440,height:1050}}),page=await context.newPage();page.setDefaultTimeout(20_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.clock.setFixedTime(NOW);await page.goto(`/${contextQuery(locale)}#observatory`);
   const toolbar=page.locator('.investigation-toolbar');await expect(toolbar).toBeVisible({timeout:15_000});
   if(locale==='qps')await expect(toolbar,'the pseudo-locale applied').toContainText('⟦');
   const own=TRANSLATED.find(t=>t.tag===locale);
   if(own){await expect(page.locator('html')).toHaveAttribute('lang',own.entry.htmlLang);await expect(toolbar).toContainText(own.catalog['project.title']);}
   const name=own?own.catalog['project.save']:L('Save investigation');
   files[locale]=await download(page,()=>toolbar.getByRole('button',{name,exact:typeof name==='string'||undefined}).click());
  }finally{await context.close();}
  expect(errors,locale).toEqual([]);
 }
 for(const locale of ['qps','es-419','pt-BR'])expect([files[locale].name,sha(files[locale].bytes)],locale).toEqual([files.en.name,sha(files.en.bytes)]);
 for(const f of Object.values(files)){expect(f.bytes.includes('⟦')).toBe(false);for(const letters of Object.values(LETTERS))expect(f.bytes.toString('utf8')).not.toMatch(letters);}
});

/** Front PT4: the Portuguese catalog the E04 and E05 families click and check. */
const PT_E04=TRANSLATED.find(x=>x.tag==='pt-BR')!.catalog as Readonly<Record<string,string>>;
// Front ES6: the E04 flow (Pleiades photometry) in English, qps and Spanish: the photometer session JSON, VIREO's Record/Review rows
// shown by Display/Print Data and written with Save Text and Comma Delimit, and the saved investigation. The page clock is paused at
// a fixed instant before activation and only moves by runFor until the last file is written; nothing is masked (each record's JD is
// the observatory clock's, which stands still). Front PT4: and in pt-BR (its `?lang=pt-BR` preview).
test('E04 Pleiades photometry: photometer session, Observational Results text and CSV, investigation',async({browser,baseURL})=>{
 test.setTimeout(180_000);
 const id=(page:Page,testId:string)=>page.getByTestId(testId);
 const T=(locale:Locale,key:string)=>locale==='es-419'?exact((es as Record<string,string>)[key]):locale==='pt-BR'?exact(PT_E04[key]!):L((en as Record<string,string>)[key]);
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
  const investigation=await download(page,()=>toolbar.getByRole('button',{name:locale==='es-419'?exact(es['project.save']):locale==='pt-BR'?exact(PT_E04['project.save']!):L('Save investigation')}).click());
  // Front PT4: the flow's own screen is Portuguese in pt-BR, so the family cannot pass by comparing English with English.
  if(locale==='pt-BR')await expect(main.getByRole('heading',{level:1})).toHaveText(PT_E04['ph.title']!);
  return {session,resultsText,resultsCsv,investigation};
 },{},page=>page.locator('.photometer-main'),['en','qps','es-419','pt-BR']);
});

// Front ES8a: the radio telescope route is translated. From #radio-control a student captures a model-generated recording
// (Record, Receive, Stop, Identify, data properties, Save No), then on the pulsar analysis downloads the raw capture (.PLR), records
// one manual reading and runs VIREO's Save Recorded Measurements (the native text with its US-format date/time header), and finally
// saves the whole investigation (the radio configuration, clock and capture). Every file is byte-identical in English, qps and
// Spanish (Front PT5: and Brazilian Portuguese, whose route heading is checked so the run cannot compare English with English). The page clock is installed at a fixed instant, the lazily loaded routes render while it runs, then it is paused and only
// runFor moves it, so the capture, the native header's date and time and the investigation's radio clock are the same in every
// run: nothing is masked.
test('radio telescope (ES8a): raw capture .PLR, native Save Recorded Measurements and the investigation, in English, qps, Spanish and pt-BR',async({browser,baseURL})=>{
 test.setTimeout(240_000);
 const id=(page:Page,testId:string)=>page.getByTestId(testId);
 const flush=async(page:Page)=>{for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));};
 const advance=async(page:Page,ms:number)=>{for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}};
 await identical(browser,baseURL,async(page,locale)=>{
  await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
  await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
  const lang=contextQuery(locale);
  await page.goto(`/${lang}#pulsar-analysis`);await expect(id(page,'pulsar-none')).toBeVisible({timeout:20_000});
  await page.goto(`/${lang}#radio-control`);await expect(id(page,'radio-exercise')).toBeVisible({timeout:20_000});
  await expect(page.locator('html')).toHaveAttribute('lang',HTML_LANG[locale]);
  if(locale==='pt-BR')await expect(page.getByRole('heading',{level:1,name:ptText('pt-BR').catalog['radioRoute.title'],exact:true})).toBeVisible();
  await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
  await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
  await id(page,'radio-switch').click();await id(page,'antenna-tracking').click();await flush(page);
  await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-receiver.dat',mimeType:'text/plain',buffer:Buffer.from(RECEIVER_CATALOG,'latin1')});
  await expect(id(page,'pulsar-ref-rows')).toBeVisible();
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
  const plr=await download(page,()=>id(page,'pulsar-raw-export-download').click());await paceDownload(page);
  if(await id(page,'pulsar-raw-export-dialog').isVisible())await id(page,'pulsar-raw-export-cancel').click();
  await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
  await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill('ES8a reading');await id(page,'pulsar-record-ok').click();await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
  await id(page,'pulsar-save').click();await expect(id(page,'pulsar-native-dialog')).toHaveAttribute('data-step','dialog');
  await id(page,'pulsar-native-name').fill('radio');await id(page,'pulsar-native-save').click();await expect(id(page,'pulsar-native-dialog')).toHaveAttribute('data-step','verify');
  const native=await download(page,()=>id(page,'pulsar-native-ok').click());await paceDownload(page);
  await expect(id(page,'pulsar-native-dialog')).toHaveCount(0);
  const toolbar=page.locator('.investigation-toolbar');
  const name=locale==='es-419'?es['project.save']:locale==='pt-BR'?ptText('pt-BR').catalog['project.save']:L('Save investigation');
  const investigation=await download(page,()=>toolbar.getByRole('button',{name,exact:typeof name==='string'||undefined}).click());
  return {plr,native,investigation};
 },{},page=>page.getByTestId('radio-route'),['en','qps','es-419','pt-BR']);
});

// Front ES9: exercise E08 (Object X) and the CCD camera in English, qps and Spanish (Front PT6: and Brazilian Portuguese, whose
// lab heading is checked, and whose investigation before the reveal must equal English's, so it names no target either). The page clock is installed at a fixed
// instant and paused before every step that records a time (the spectrum's ticks, each camera exposure); it runs only while the
// asteroid list is computed and the spectrometer data loads, and is then paused again at a later fixed instant, and again after
// the observatory clock is paused for the last time (Save investigation yields with setTimeout(0)), so every JD, UT
// label, file name and header card is the same in every run (the observatory clock's committed time in the investigation is
// masked: it runs in 200 ms steps during each exposure, as many as the camera worker's real latency needs). crypto.getRandomValues is replaced (Uint32Array only) by a fixed
// xorshift stream, so the camera seed (CAMSEED, every pixel) and the spectrum's replay seed are the same too.
// Recorded data stays as written: the Object X code, the ObjX-42 labels, the ObjectX.HTL identifier and remark after the reveal,
// the recorded VizieR (NOMAD) rows and the orbit-file designations.
/** A fixed random stream for this page (main thread only: the camera and spectrum seeds are drawn there). */
const fixedRandom=(page:Page)=>page.addInitScript(()=>{let s=0x2545f491;const real=crypto.getRandomValues.bind(crypto);
 crypto.getRandomValues=(<T extends ArrayBufferView|null>(a:T):T=>{if(a instanceof Uint32Array){for(let i=0;i<a.length;i++){s^=s<<13;s^=s>>>17;s^=s<<5;a[i]=s>>>0;}return a;}return real(a as never) as T;}) as typeof crypto.getRandomValues;});
/** A FITS file compared whole: its header cards as text (so the Spanish-letter check reads only the header) and the SHA-256 of
 * the data that follows; no card or pixel is masked. */
function fitsWhole(bytes:Buffer):Buffer{
 let end=0;for(let at=0;at+80<=bytes.length;at+=80)if(bytes.subarray(at,at+8).toString('latin1')==='END     '){end=Math.ceil((at+80)/2880)*2880;break;}
 if(!end)throw new Error('no END card');
 return Buffer.from(`${bytes.subarray(0,end).toString('latin1')}\n${sha(bytes.subarray(end))}`,'latin1');
}
/** The observatory clock's committed time in a saved investigation (`base.base.observing.clockDrive.elapsedMS`): the clock runs
 * during each exposure in 200 ms steps whose number follows the camera worker's real latency, so that one value is masked; every
 * other field is compared as written. */
function clockElapsedMasked(bytes:Buffer):Buffer{
 const doc=JSON.parse(bytes.toString('utf8')) as {base?:{base?:{observing?:{clockDrive?:{elapsedMS?:unknown}}}}};
 const drive=doc.base?.base?.observing?.clockDrive;if(!drive||!('elapsedMS' in drive))throw new Error('no clockDrive.elapsedMS to mask');drive.elapsedMS='<masked>';
 return Buffer.from(JSON.stringify(doc),'utf8');
}
/** One CCD exposure of 1 s from the recorded VizieR answer, with the page clock paused: it advances in 200 ms steps only until
 * the image is ready (the image's JD and pointing are those of Start). */
async function exposePaused(page:Page,locale:Locale,name:(locale:Locale,english:string,spanish:string)=>RegExp,camera:Readonly<Record<string,string>>){
 const c=page.getByTestId('camera-control');
 await c.getByLabel(locale==='es-419'||locale==='pt-BR'?new RegExp(`^\\s*${camera.sourceLive.slice(0,20)}`):/[AÁ]sk V[ií]z[ií][eé]R l[ií]v[eé]/).check();
 await c.getByLabel(name(locale,CAMERA_EN.minutes,camera.minutes)).fill('0');await c.getByLabel(name(locale,CAMERA_EN.seconds,camera.seconds)).fill('1');
 await c.getByRole('button',{name:name(locale,CAMERA_EN.start,camera.start)}).click();
 const status=page.getByTestId('camera-status'),done=name(locale,CAMERA_EN.statusDone,camera.statusDone);
 // The worker and the routed catalogue answer take real time: step the paused clock for up to 90 real seconds.
 for(const start=Date.now();Date.now()-start<90_000&&!done.test((await status.textContent())??'');){await page.clock.runFor(200);await page.waitForTimeout(20);}
 await expect(status).toHaveText(done);
}
test('E08 Object X and the CCD camera: spectrum CSV and SSP, image FITS, camera FITS and VIREO-header FITS, saved-image download, investigations before and after the reveal',async({browser,baseURL})=>{
 test.setTimeout(300_000);
 const recorded=await readFile(new URL('../fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
 const NX=(locale:Locale,english:string,translated:string)=>locale==='es-419'||locale==='pt-BR'?exact(translated):L(english);
 await identical(browser,baseURL,async(page,locale)=>{
  page.setDefaultTimeout(30_000);
  // The language's Object X lab and camera maps (Spanish's for en and qps, whose names go through `L`).
  const LS=e08Maps(locale==='pt-BR'?'pt-BR':'es-419').objectXLab,C=e08Maps(locale==='pt-BR'?'pt-BR':'es-419').camera as unknown as Readonly<Record<string,string>>;
  const save=async(click:()=>Promise<void>)=>{await paceDownload(page);return download(page,click);};
  const lab=page.getByTestId('objectx-lab'),B=(english:string,spanish:string)=>lab.getByRole('button',{name:NX(locale,english,spanish)});
  await page.route(/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/,route=>route.fulfill({status:200,contentType:'text/xml',body:recorded}));
  await fixedRandom(page);await page.clock.install({time:NOW});
  await page.goto(`/${contextQuery(locale)}#object-x`);
  const skip=page.getByRole('button',{name:N(locale,'Skip the tour')});if(await skip.isVisible().catch(()=>false))await skip.click();
  await expect(page.getByTestId('objectx-target').locator('option')).toHaveCount(18,{timeout:30_000});
  if(locale==='pt-BR')await expect(page.getByRole('heading',{level:1,name:LS.title,exact:true})).toBeVisible();
  await lab.getByLabel(NX(locale,'ID # of your unknown object (from the lab sheet or instructor)',LS.idLabel)).fill('42');
  // A kept spectrum of a star target (ObjectX.HTL row 9, not named before the reveal): 2 s of ticks with the clock paused.
  await page.getByTestId('objectx-target').selectOption('X-NTFB6');await page.getByTestId('objectx-spectrum-telescope').selectOption('2');
  await B('Place the slit on the object',LS.spectrumPrepare).click();await expect(B('Start spectrum',LS.spectrumStart)).toBeEnabled({timeout:90_000});
  await page.clock.pauseAt(new Date(NOW.getTime()+600_000));
  await B('Start spectrum',LS.spectrumStart).click();await page.clock.runFor(2000);await B('Stop spectrum',LS.spectrumStop).click();
  await B('Keep this spectrum',LS.spectrumKeep).click();await expect(page.getByTestId('objectx-spectra').locator('li')).toHaveCount(1);
  const spectrumCsv=await save(()=>B('Save ObjX-42-S01 spectrum (CSV)',LS.spectrumSaveCsv('ObjX-42-S01')).click());
  const spectrumSsp=await save(()=>page.getByTestId('objectx-branch-spectrum').getByRole('button',{name:N(locale,'Save spectrum (.SSP)')}).click());
  // The asteroid target, the clock and the list (computed with the clock running), then the first image at 04:00 UT.
  await page.getByTestId('objectx-target').selectOption('X-UZOBN');
  const setClock=async(utc:string,at:number)=>{await page.clock.resume();await lab.getByLabel(NX(locale,'Observation date and time (UT)',LS.dateLabel)).fill(utc);await B('Set the observatory clock',LS.setClock).click();
   await expect(page.getByTestId('objectx-list-status')).toContainText(utc.replace('T',' '),{timeout:60_000});await page.clock.pauseAt(new Date(NOW.getTime()+at));};
  await setClock('2009-06-01T04:00:00',1_200_000);
  await B('Copy the coordinates to the observatory',LS.pointObservatory).click();
  await button(page,'Open dome ↗',locale).click();
  if(!await button(page,'Point to coordinates',locale).isVisible())await page.getByText(N(locale,'Enter coordinates')).click();
  await button(page,'Point to coordinates',locale).click();
  await page.getByRole('group',{name:N(locale,'Field of view')}).getByRole('button',{name:N(locale,'Telescope · 15′')}).click();
  const startClock=async()=>{if(!await button(page,'Start observatory clock',locale).isVisible())await page.getByText(N(locale,'Observatory clock & spectral tracking')).click();await button(page,'Start observatory clock',locale).click();
   const tracking=button(page,'Turn tracking on',locale);if(await tracking.isVisible())await tracking.click();};
  await startClock();await exposePaused(page,locale,NX,C);
  const camera=page.getByTestId('camera-control');
  const cameraFits=await save(()=>camera.getByRole('button',{name:NX(locale,CAMERA_EN.save,C.save)}).click());
  const cameraNative=await save(()=>camera.getByRole('button',{name:NX(locale,CAMERA_EN.saveNative,C.saveNative)}).click());
  // The second image 45 minutes later.
  await page.evaluate(()=>{location.hash='#object-x';});await setClock('2009-06-01T04:45:00',1_800_000);
  await page.evaluate(()=>{location.hash='#observatory';});await startClock();await exposePaused(page,locale,NX,C);
  // The observatory clock is paused (its committed elapsed time goes into the investigation), then the page clock runs again:
  // Save investigation recomputes the asteroid lists in slices that yield with setTimeout(0), and nothing after this point
  // records a time.
  await button(page,'Pause observatory clock',locale).click();await page.clock.resume();
  await page.evaluate(()=>{location.hash='#object-x';});await expect(page.getByTestId('objectx-images').locator('li')).toHaveCount(2);
  const image1=await save(()=>B('Save ObjX-42-01.FIT',LS.saveFits('ObjX-42-01')).click());
  const image2=await save(()=>B('Save ObjX-42-02.FIT',LS.saveFits('ObjX-42-02')).click());
  const toolbar=page.locator('.investigation-toolbar'),saveInvestigation=()=>toolbar.getByRole('button',{name:locale==='es-419'?exact(es['project.save']):locale==='pt-BR'?exact(ptText('pt-BR').catalog['project.save']!):L('Save investigation')}).click();
  const investigation=await save(saveInvestigation);
  // Answer, describe and reveal; the investigation keeps the answer and the reveal.
  await page.getByTestId('objectx-answer').getByLabel(NX(locale,'asteroid',LS.kinds.asteroid)).check();
  await lab.getByLabel(NX(locale,'Describe your evidence',LS.describeLabel)).fill('It moved about 55″/h.');
  await B('Reveal the identity',LS.reveal).click();await lab.locator('fieldset .button-row button.primary-button').click();await expect(page.getByTestId('objectx-reveal')).toBeVisible();
  const revealed=await save(saveInvestigation);
  // Saved images: the first image opened and downloaded unchanged.
  await page.evaluate(()=>{location.hash='#images';});
  await page.getByLabel(N(locale,'Open float32 FITS image (up to 5 MiB)')).setInputFiles({name:image1.name,mimeType:'application/octet-stream',buffer:image1.bytes});
  await expect(page.getByTestId('fits-pixel')).toBeVisible();
  const inspected=await save(()=>button(page,'Download unchanged FITS bytes',locale).click());
  expect(inspected.bytes.equals(image1.bytes)).toBe(true);expect(image2.bytes.equals(image1.bytes)).toBe(false);
  return {spectrumCsv,spectrumSsp,cameraFits,cameraNative,image1,image2,investigation,revealed,inspected};
 },{cameraFits:fitsWhole,cameraNative:fitsWhole,image1:fitsWhole,image2:fitsWhole,inspected:fitsWhole,investigation:clockElapsedMasked,revealed:clockElapsedMasked},page=>page.getByTestId('objectx-lab'),['en','qps','es-419','pt-BR']);
});

// Front ES8b: exercise E06, the recorded pulsar analysis. The files of its flows stay VIREO's English in en, qps and es-419:
// VIREO's own Save (the written results file and the appended one, US date and time, "Table Number" line), the typed-header
// export, the append file, the original recording bytes, the saved-measurement viewer's original file. The page clock is
// fixed and nothing is masked. (The raw .PLR download of a model capture and the investigation that holds it are ES8a's family.)
// Front PT6: and in pt-BR (its `?lang=pt-BR` preview), whose route heading is checked.
test('E06 pulsar analysis: native Save and its append, the export, the append file, the original recording and the viewer download',async({browser,baseURL})=>{
 test.setTimeout(240_000);
 const id=(page:Page,testId:string)=>page.getByTestId(testId);
 const TARGET=['"10-30-2026","3:07:42 PM"','"Table Number: "','','',HEADER].map(l=>l+'\r\n').join('')+'"PSR B0329+54",408.00,1.000,0.123456,"",5.0000E-01,49999.12345678,"older",1000,10.00,26\r\n';
 const record=async(page:Page,comment:string)=>{
  await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();
  await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
 };
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'pulsar-analysis');
  if(locale==='pt-BR')await expect(page.getByRole('heading',{level:1,name:ptText('pt-BR').catalog['plr.routeTitle'],exact:true})).toBeVisible();
  await id(page,'pulsar-file').setInputFiles({name:'synthetic-e2e.plr',mimeType:'application/octet-stream',buffer:Buffer.from(PLR,'latin1')});
  await expect(id(page,'pulsar-sha')).toHaveText(sha(Buffer.from(PLR,'latin1')));await id(page,'pulsar-properties-close').click();
  const original=await download(page,()=>id(page,'pulsar-download').click());
  await record(page,'first');
  await id(page,'pulsar-save').click();await id(page,'pulsar-native-name').fill('run');await id(page,'pulsar-native-save').click();
  await expect(id(page,'pulsar-native-dialog')).toHaveAttribute('data-step','verify');
  const nativeSave=await download(page,()=>id(page,'pulsar-native-ok').click());
  await record(page,'second');
  await id(page,'pulsar-save').click();await id(page,'pulsar-native-name').fill('RUN.csv');await id(page,'pulsar-native-save').click();
  await expect(id(page,'pulsar-native-dialog')).toHaveAttribute('data-step','exists');await id(page,'pulsar-native-no').click();
  await expect(id(page,'pulsar-native-dialog')).toHaveAttribute('data-step','verify');
  const nativeAppend=await download(page,()=>id(page,'pulsar-native-ok').click());
  await id(page,'pulsar-export').click();await expect(id(page,'pulsar-export-dialog')).toBeVisible();
  for(const [k,v] of Object.entries({date:'25/10/2026',time:'16:00:00',table:'7',name1:'Observer A'}))await id(page,`pulsar-export-${k}`).fill(v);
  const exported=await download(page,()=>id(page,'pulsar-export-download').click());
  await id(page,'pulsar-append').click();await id(page,'pulsar-append-file').setInputFiles({name:'target.csv',mimeType:'text/plain',buffer:Buffer.from(TARGET,'latin1')});await expect(id(page,'pulsar-append-target')).toBeVisible();
  const appended=await download(page,()=>id(page,'pulsar-append-download').click());
  await id(page,'saved-rows-disclosure').locator('summary').first().click();
  await id(page,'saved-rows-file').setInputFiles({name:'control.csv',mimeType:'text/plain',buffer:Buffer.from(CONTROL,'latin1')});await id(page,'saved-rows-use').click();
  const viewer=await download(page,()=>id(page,'saved-rows-download').click());
  return {original,nativeSave,nativeAppend,exported,appended,viewer};
 },{},page=>page.getByTestId('pulsar-analysis'),['en','qps','es-419','pt-BR']);
});

// Front ES7: exercise E05. Every file a student can save on the cluster HR route, in English, qps and Spanish: the whole
// investigation after a confirmed fit (reference dataset, point exclusion, notebook), Display/Print Data's Save Text and Comma
// Delimit (the CLEA Cluster Data listing), the saved-observation DAT written back by the HR tool, its Recorded Results list's Save
// Text and Comma Delimit, File › Cluster Data…'s report (Save Text) and the two HTL files its hot-list items write,
// and, on the variable-star route,
// Save Text › As Displayed. The HR plot and the print previews are pictures, not files. The page
// clock is fixed at NOW (the investigation's save time), so nothing is masked. Front PT4: and in pt-BR (its `?lang=pt-BR` preview).
test('E05 cluster HR: investigation, cluster listing TXT and CSV, observation DAT, Recorded Results TXT and CSV; Cluster Data TXT and HTL; variable-star TXT',async({browser,baseURL})=>{
 test.setTimeout(240_000);
 const id=(page:Page,testId:string)=>page.getByTestId(testId);
 const dismiss=async(page:Page)=>{await id(page,'fi-box').getByRole('button').first().click();await expect(id(page,'fi-box')).toHaveCount(0);};
 const DAT=(()=>{const rec=(o:string,t:number,v:number,b:number)=>{const x=(value:number)=>{const out=Buffer.alloc(10),d=Buffer.alloc(8);d.writeDoubleLE(value,0);const bits=d.readBigUInt64LE(0),sign=Number(bits>>63n),exp=Number(bits>>52n&0x7ffn),frac=bits&((1n<<52n)-1n);out.writeBigUInt64LE(1n<<63n|frac<<11n,0);out.writeUInt16LE(exp-1023+16383|sign<<15,8);return out;};
  const r=Buffer.alloc(144);r[0]=o.length;r.write(o,1,'latin1');r.writeDoubleLE(t,16);x(b).copy(r,54);x(v).copy(r,64);r[94]=1;return r;};
  return Buffer.concat([rec('HD 3',3,12,12.25),rec('HD 1',1,10,10.5)]);})();
 await identical(browser,baseURL,async(page,locale)=>{
  await open(page,locale,'cluster-database');
  await page.locator('#cluster-database-choice').selectOption('m67');await button(page,'Load selected dataset',locale).click();
  await expect(id(page,'cluster-reference-count')).toBeVisible({timeout:30_000});
  const point=await page.locator('#cluster-point-choice option').nth(4).getAttribute('value');await page.locator('#cluster-point-choice').selectOption(point!);
  await button(page,'Exclude selected point…',locale).click();await button(page,'Confirm point exclusion',locale).click();
  await page.locator('#db-native-modulus').fill('9.5');await page.locator('#db-native-logage').fill('9.65');await page.locator('#db-native-model').selectOption('4');
  await page.locator('#db-native-interpretation').fill('E05 note');
  await expect(id(page,'native-preview')).toBeVisible({timeout:20_000});
  await button(page,'Confirm chosen model fit',locale).click();await expect(id(page,'native-confirmed-age')).toBeVisible();
  const toolbar=page.locator('.investigation-toolbar');const save=locale==='es-419'?es['project.save']:locale==='pt-BR'?PT_E04['project.save']!:L('Save investigation');
  // Front PT4: the flow's own screen is Portuguese in pt-BR, so the family cannot pass by comparing English with English.
  if(locale==='pt-BR')await expect(page.locator('main.cluster-database-lab').getByRole('heading',{level:1})).toHaveText(PT_E04['db.title']!);
  const investigation=await download(page,()=>toolbar.getByRole('button',{name:save,exact:typeof save==='string'||undefined}).click());
  await id(page,'cluster-display-data').click();await expect(id(page,'cluster-report')).toBeVisible({timeout:20_000});
  const saveListing=async(kind:'displayed'|'csv')=>{const f=await download(page,async()=>{await id(page,'cluster-report-list-menu').click();await id(page,'cluster-report-save-menu').click();await id(page,`cluster-report-save-${kind}`).click();});await dismiss(page);return f;};
  const listingText=await saveListing('displayed'),listingCsv=await saveListing('csv');
  await page.locator('details > summary').filter({hasText:N(locale,en['obsHr.workspaceSummary'])}).first().click();
  await page.getByLabel(N(locale,'Load saved observation results (DAT)')).setInputFiles({name:'night1.dat',mimeType:'application/octet-stream',buffer:DAT});
  await button(page,'Add to current results',locale).click();
  const observations=await download(page,()=>button(page,'Download current results (DAT)',locale).click());
  // Display/Print Data in observation mode: VIREO's Recorded Results list (RsltsListForm1), Save Text and Comma Delimit.
  await button(page,'Plot data from observations',locale).click();await id(page,'cnhr-display-data').click();await expect(id(page,'cnhr-results')).toBeVisible();
  const saveResults=async(kind:'displayed'|'csv')=>{const f=await download(page,async()=>{await id(page,'cnhr-results-list-menu').click();await id(page,'cnhr-results-save-menu').click();await id(page,`cnhr-results-save-${kind}`).click();});await dismiss(page);return f;};
  const resultsText=await saveResults('displayed'),resultsCsv=await saveResults('csv');
  await id(page,'cnhr-results-list-menu').click();await id(page,'cnhr-results-close').click();
  // File › Cluster Data… (#observatory): the CLEA Cluster Data report of NGC 752 (Save Text; its Comma Delimit answers VIREO's
  // "not available" box, a row being shorter than the column positions, so no file) and the HTL files its
  // hot-list items write: Yes in "Current Hot List not Saved!" downloads the current list (one added row), then the entire list.
  await open(page,locale,'observatory');await page.locator('.sky-card .card-heading > button').click();
  await id(page,'fi-file-menu').click();await id(page,'cluster-data-menu').click();await expect(id(page,'cd-dialog')).toBeVisible();
  await id(page,'cd-file').click();await id(page,'cd-view-select').click();await id(page,'cd-study-lines').getByText('NGC 752',{exact:false}).first().dblclick();
  await expect(id(page,'cd-study-list')).toHaveCount(0);await id(page,'cd-ok').click();await expect(id(page,'cluster-data-lines')).toBeVisible({timeout:30_000});
  const saveField=async(kind:'displayed')=>{const f=await download(page,async()=>{await paceDownload(page);await id(page,'cluster-data-list-menu').click();await id(page,'cluster-data-save-menu').click();await id(page,`cluster-data-save-${kind}`).click();});await dismiss(page);return f;};
  const fieldText=await saveField('displayed');
  await id(page,'cluster-data-line-7').click();await id(page,'cluster-data-selection-menu').click();await id(page,'cluster-data-add').click();await dismiss(page);
  const entire=async()=>{const f=await download(page,async()=>{await paceDownload(page);await id(page,'cluster-data-selection-menu').click();await id(page,'cluster-data-entire').click();await id(page,'cd-hot-unsaved-yes').click();});await dismiss(page);return f;};
  const hotListAdded=await entire(),hotListEntire=await entire();
  await open(page,locale,'variable-stars');
  await expect(id(page,'variable-count')).toContainText(catalogCount(locale),{timeout:20_000});
  await id(page,'variable-name').fill('RR Lyr');await page.locator('[data-testid=variable-results] tbody button').first().click();
  await expect(id(page,'vstar-list-window')).toBeVisible();
  await id(page,'vstar-data-menu').click();await id(page,'vstar-save-menu').click();
  const variableText=await download(page,()=>id(page,'vstar-save-displayed').click());
  return {investigation,listingText,listingCsv,observations,resultsText,resultsCsv,fieldText,hotListAdded,hotListEntire,variableText};
 },{},page=>page.getByTestId('variable-stars'),['en','qps','es-419','pt-BR']);
});
