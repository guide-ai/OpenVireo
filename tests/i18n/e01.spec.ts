import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale,langQuery} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import {enterInstructorMode} from '../fixtures/instructor-mode';
import {translatedFor,e01e02Maps} from './languageText';
import {E,title,same,id,N,button,texts,bare,tool,walk,LAYOUT} from './walks/e01';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT2: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, maps and originals, never
// hard-coded text). The Spanish tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser (Front PT-REL: an anonymous
// describe per language sets its browser locale, tests/fixtures/language.ts contextLocale). English and qps run once.
// Front ES3 (docs/I18N.md): exercise E01, Hubble's law, in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk through the whole
// student flow runs in English, Spanish and the pseudo-locale: the Hubble lab guide (every disclosure open), the galaxy
// exposure and its Spectral Range dialog, the spectrum analyser (z step, the engine's Zoom dialog, Record measurement and VIREO's
// Observational Data, the measurement log, velocity analysis, the Hubble diagram with the VIREO recipe), the sky exposure, the
// star exposure with its .SSP save panel, and the spectrometer route.
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and plain numbers with units (NUMERIC);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) are left out of both comparisons.

for(const L of translatedFor('e01'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});test(title(L,'E01 reads differently in Spanish from English: guide, exposures, analyser, Observational Data, velocities and Hubble diagram','E01 reads differently in <L> (<tag>) from English: guide, exposures, analyser, Observational Data, velocities and Hubble diagram'),async({browser})=>{
 test.setTimeout(300_000);
 const seen:Record<'en'|'own',Map<string,Set<string>>>={en:new Map(),own:new Map()};
 for(const lang of ['en','own'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await walk(page,lang==='en'?'en':L,async step=>{seen[lang].set(step,new Set(await texts(page)));});
  expect(errors,lang==='en'?'en':L.tag).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();// each text once, with the first step that shows it
 for(const [step,list] of seen.own)for(const t of list)if(english.has(bare(t))&&!same(bare(t),L)&&!left.has(t))left.set(t,step);
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});});

test('qps: every text of the E01 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

// "View original (English)" (decision 9): with the stored option on, the whole walk shows no Spanish translation of a VIREO
// original (the Observational Data dialog, the Spectral Range dialog and its warning, the engine's Zoom, the spectrometer
// readout), while OpenVireo's own web text stays Spanish.
for(const L of translatedFor('e01'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});test(title(L,'View original (English) on: every VIREO name in the E01 walk reads in English, the web text stays Spanish','View original (English) on: every VIREO name in the E01 walk reads in English, the web text stays <L>'),async({page})=>{
 const O=L.originals,M=e01e02Maps(L.tag);
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const leaves=(v:unknown):string[]=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(leaves):[];
 // OpenVireo's own Spanish (catalog and maps) may coincide with a Spanish original; those are web text, not a translated original.
 const web=new Set([...Object.values(L.catalog),...[M.engineView,M.spectralRange,M.observatory].flatMap(leaves),...Object.keys(O)].map(plain));
 const spanish=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)));
 const left=new Map<string,string>();
 const checks:Record<string,()=>Promise<void>>={
  'engine Zoom dialog':async()=>{await expect(id(page,'engine-zoom')).toHaveText('Zoom');await expect(id(page,'engine-zoom-dialog').getByRole('heading')).toHaveText('Set Wavelength Range');},
  'Observational Data':async()=>{const d=id(page,'hubble-obsdata');await expect(d.getByRole('heading')).toHaveText('Observational Data');await expect(id(page,'hubble-obsdata-ok')).toHaveText('OK');
   // Review: the field captions explicitly, since a generic check skips originals that coincide with catalog text.
   for(const caption of ['Object:','Observation Time (JD)','Right Ascension:','Declination:','Sp.Type:','Redshift (Z):','Velocity (V):','Remarks:'])await expect(d.locator('label',{hasText:caption}).first()).toHaveText(caption);
   await expect(d.locator('legend')).toHaveText('Observed Magnitudes');await expect(id(page,'hubble-obsdata-cancel')).toHaveText('Cancel');},
  'Spectral Range warning':async()=>{await expect(id(page,'spectral-range-warning').getByRole('heading')).toHaveText('Spectrometer Will Clear!');},
  'Spectral Range dialog':async()=>{await expect(id(page,'spectral-range-dialog').getByRole('heading')).toHaveText('Spectrometer Wavelength Range');await expect(id(page,'spectral-range-default')).toHaveText('Default');},
 };
 await walk(page,L,async step=>{
  for(const t of await texts(page))if(spanish.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 await expect(page.getByRole('link',{name:N(L,'starExposure.open')})).toBeVisible();// web text: still Spanish
});});

test('the E01 walk in English is unchanged: VIREO\'s captions are the originals and no native caption appears',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 const checks:Record<string,()=>Promise<void>>={
  'Hubble lab guide':async()=>{await expect(page.getByRole('heading',{name:E['lab.title'],exact:true})).toBeVisible();},
  'engine Zoom dialog':async()=>{await expect(id(page,'engine-zoom')).toHaveText('Zoom');await expect(id(page,'engine-zoom-dialog').getByRole('heading')).toHaveText('Set Wavelength Range');},
  'Observational Data':async()=>{await expect(id(page,'hubble-obsdata').getByRole('heading')).toHaveText('Observational Data');await expect(id(page,'hubble-obsdata-cancel')).toHaveText('Cancel');},
  'Spectral Range dialog':async()=>{await expect(id(page,'spectral-range-dialog').getByRole('heading')).toHaveText('Spectrometer Wavelength Range');await expect(id(page,'spectral-range-default')).toHaveText('Default');},
 };
 await walk(page,'en',async step=>{await checks[step]?.();await expect(page.locator('.native-mirror-caption')).toHaveCount(0);});
});

for(const L of translatedFor('e01'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish E01 screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> E01 screens (<tag>) lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 const override=process.env.ES3_LAYOUT_LANG;await walk(page,override==='en'||override==='qps'?override:L,async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  if(/guide|analyser|Observational Data|Hubble diagram with|Spectral Range dialog|star exposure/.test(step))await page.screenshot({path:test.info().outputPath(`${L.tag}-e01-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});
  if(/analyser/.test(step))await page.locator('svg.spectrum:visible').first().screenshot({path:test.info().outputPath(`${L.tag}-e01-${width}-spectrum-plot.png`)});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});});

// Review: the spectrometer readout boxes (Show Object ID and Show Object Mag, turned on in instructor mode as an exercise menu
// does) on the star and sky routes: Spanish captions, and VIREO's English with View original (English) at the next load.
for(const L of translatedFor('e01'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const original of [false,true])test(title(L,`the spectrometer readout captions ${original?'follow View original (English)':'read in Spanish'}`,`the spectrometer readout captions ${original?'follow View original (English) (<tag>)':'read in <L> (<tag>)'}`),async({page})=>{
 const O=L.originals;
 test.setTimeout(120_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(on=>{localStorage.setItem('openvireo.tour.v1','done');if(on)localStorage.setItem('openvireo-vireo-originals','1');else localStorage.removeItem('openvireo-vireo-originals');},original);
 await page.goto(`/${langQuery(L.tag)}#observatory`);await expect(page.locator('html')).toHaveAttribute('lang',L.entry.htmlLang);
 const dome=page.getByRole('button',{name:new RegExp(N(L,'sky.open').source.replace(/\$$/,'').concat(' ↗$'))});await dome.click();
 await enterInstructorMode(page);await page.locator('.telescope-motion').getByTestId('ob-options').click();
 await id(page,'ob-options-show-object-id').check();await id(page,'ob-options-show-object-mag').check();await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
 const T=(en:string)=>original?en:O[en];
 await page.evaluate(()=>{location.hash='#star-exposure';});await button(page,L,'starExposure.activate').click();
 const star=id(page,'spec-readout');await expect(star).toBeVisible();
 await expect(star.locator('dt').nth(0)).toHaveText(T('Object:'));await expect(star.locator('dt').nth(1)).toHaveText(T('App. Mag (V):'));
 await expect(id(page,'spec-readout-id')).not.toHaveText(original?O['Telescope']:'Telescope');// the pending caption, if still shown, is in this load's language
 await page.evaluate(()=>{location.hash='#sky-exposure';});await button(page,L,'skyExposure.activateSupportedSkyField').click();
 await expect(page.locator('[data-testid=spec-readout-id]:visible')).toHaveText(T('Sky'));// the hidden star route keeps its own box
 await expect(button(page,L,'skyExposure.startSkyExposure')).toBeVisible();// web text: Spanish either way
});});

// Review (S2): at M31 (NGC 224) the observatory's telescope view and the single-slit spectrometer show VIREO's "Image Too Large!"
// box as a notice. Its caption and text are VIREO's (they follow View original); the adaptation line beside them is OpenVireo's
// own text and stays Spanish either way.
for(const L of translatedFor('e01'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const original of [false,true])test(title(L,`the M31 notice in Spanish: VIREO's box ${original?'in English with View original':'translated'}, the web line in Spanish`,`the M31 notice in <L> (<tag>): VIREO's box ${original?'in English with View original':'translated'}, the web line in <L>`),async({page})=>{
 const O=L.originals,M31="M31 Image Too Large to Load!\r\n\r\nSorry about that. (We're working on it.)";
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(on=>{localStorage.setItem('openvireo.tour.v1','done');if(on)localStorage.setItem('openvireo-vireo-originals','1');else localStorage.removeItem('openvireo-vireo-originals');},original);
 await page.goto(`/${langQuery(L.tag)}#observatory`);await expect(page.locator('html')).toHaveAttribute('lang',L.entry.htmlLang);
 await page.getByRole('button',{name:new RegExp(N(L,'sky.open').source.replace(/\$$/,'').concat(' ↗$'))}).click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText(N(L,'sky.coordinates')).click();
 await page.locator('#point-ra').fill('0.71231');await page.locator('#point-dec').fill('41.2692');await button(page,L,'sky.pointCoordinates').click();
 await page.getByRole('button',{name:new RegExp(`^\\s*${O['Telescope']} ·`)}).first().click();
 const caption=original?'Image Too Large!':O['Image Too Large!'],adaptation=L.catalog['sky.m31Adaptation'];
 const sky=id(page,'sky-m31-notice');await expect(sky).toBeVisible({timeout:60_000});
 await expect(sky.locator('strong')).toHaveText(caption);await expect(sky.locator('small')).toHaveText(adaptation);
 if(!await button(page,L,'runningClock.trackingOn').isVisible())await page.getByText(N(L,'runningClock.title')).click();
 if(await button(page,L,'runningClock.trackingOn').isVisible())await button(page,L,'runningClock.trackingOn').click();
 await tool(page,L,'spectrometer.nav');await expect(id(page,'field-spec-use')).toBeEnabled({timeout:60_000});await id(page,'field-spec-use').click();
 const notice=id(page,'field-spec-m31-notice');await expect(notice).toBeVisible({timeout:90_000});
 await expect(notice.locator('strong')).toHaveText(caption);await expect(notice.locator('small')).toHaveText(adaptation);
 await expect(notice).toContainText(original?'M31 Image Too Large to Load!':O[M31]!.split('\r\n')[0]!);
});});
