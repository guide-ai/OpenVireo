import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale,langQuery} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import {TRANSLATED,e01e02Maps} from './languageText';
import {title,SAME_IN,same,id,N,vireoOf,texts,bare,walk,LAYOUT} from './walks/e02';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT2: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, maps and originals, never
// hard-coded text). The Spanish tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser (Front PT-REL: an anonymous
// describe per language sets its browser locale, tests/fixtures/language.ts contextLocale). English and qps run once.
// Front ES4 (docs/I18N.md): exercise E02, Large-Scale Structure, in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk through the
// whole student flow runs in English, Spanish and the pseudo-locale: the LSS guide, the survey (field list, row statuses, pointing,
// exposure, the measurement panel, Record Z and VIREO's Measured Redshift Data with its refusal and its Z Measurement Saved box,
// Save Data (.TXT)), the wedge with the student's own records (Options, the Load Saved Data prompts and notices, a selected row,
// Print Wedge Plot), and the instructor's LSS Galaxy Data (Edit Mode: the region dialog, its Input Error and Search Results
// boxes and the Retain Current Data? prompt).
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and plain numbers with units, hashes and saved file lines (narrow regexes);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) are left out of both comparisons.

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});test(title(L,'E02 reads differently in Spanish from English: guide, survey, Measured Redshift Data, wedge and LSS Galaxy Data','E02 reads differently in <L> (<tag>) from English: guide, survey, Measured Redshift Data, wedge and LSS Galaxy Data'),async({browser})=>{
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
 // The field selector's options: this language's wording around the recorded LSSFields.LST items (Spanish « (N galaxias)»).
 const options=[...seen.own.get('field list loaded')!].filter(t=>t.startsWith('@option:'));
 expect(options.length).toBeGreaterThanOrEqual(10);
 const around=L.catalog['lss.fieldOption']!.replace('{item}','').replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace('\\{rows\\}','\\d+');
 const galaxies=/\(\{rows\} (\S+)\)$/.exec(L.catalog['lss.fieldOption']!)![1]!.slice(0,5);
 for(const o of options.filter(o=>new RegExp(`\\d ${galaxies}`).test(o)))expect(o).toMatch(new RegExp(`${around}$`));
});});

test('qps: every text of the E02 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

/** VIREO's captions on each step, in English (View original) or in this load's Spanish. */
const captions=(page:Page,T:(original:string,context?:string)=>string):Record<string,()=>Promise<void>>=>({
 'measurement panel':async()=>{await expect(page.locator('.lss-measure button.primary-button')).toHaveText(T('Record Z'));},
 'Measured Redshift Data':async()=>{const d=page.locator('dialog.lss-dialog[open]');await expect(d.locator('h2')).toHaveText(T('Measured Redshift Data'));
  // VIREO's Object: and Remarks: without their colon (the web form of the labels).
  await expect(d.locator('label[for=lss-object]')).toHaveText(T('Object:').replace(/:$/,''));await expect(d.locator('label[for=lss-remarks]')).toHaveText(T('Remarks:').replace(/:$/,''));
  await expect(d.locator('label[for=lss-jd]')).toHaveText(T('Observation Time (JD)'));await expect(d.locator('label[for=lss-z]')).toHaveText(T('Redshift (Z):'));
  await expect(d.locator('label[for=lss-velocity]')).toHaveText(T('Velocity (km/sec):'));await expect(d.locator('legend')).toHaveText([T('Right Ascension'),T('Declination')]);
  await expect(d.locator('.sky-actions button')).toHaveText([T('OK'),T('Cancel')]);},
 'velocity refusal':async()=>{await expect(page.locator('#lss-dialog-error')).toHaveText(`${T('Velocity Error!')} ${T('Velocity is incorrect or missing!\r\nYou must supply a valid velocity for plotting.').replace(/\r\n/g,' ')}`);},
 'velocity invalid':async()=>{await expect(page.locator('#lss-dialog-error')).toHaveText(T('Velocity calculation is invalid!'));},
 'redshift recorded':async()=>{await expect(page.locator('.observatory-feedback [role=status]')).toContainText(`${T('Z Measurement Saved')}: ${T('Z Measurement added to results list.\r\n\r\nSave, plot, view list under "Tools"->\r\n"Results Editors"->"Observational \r\nResults" on main Window.').replace(/\s*\r\n\s*/g,' ')}`);
  await expect(id(page,'lss-results-txt')).toHaveText(`${T('Save Data')} (.TXT)`);await expect(id(page,'lss-results-txt')).toHaveAttribute('title',T('Save Reshift Measurements in Text File'));},
 'wedge with own records':async()=>{const w=id(page,'wedge-lab');await expect(w.locator('h2').first()).toHaveText(T('LSS Wedge Plot'));
  await expect(id(page,'wedge-plot-data')).toHaveText(T('Plot Data'));await expect(id(page,'wedge-options-open')).toHaveText(T('Options...'));await expect(id(page,'wedge-print')).toHaveText(T('Print Wedge Plot...'));
  await expect(id(page,'wedge-count')).toHaveText(`${T('Points Plotted: ')}1`);await expect(w.locator('svg text[data-role=ra-title]')).toHaveText(T('RA (Hours)'));
  await expect(w.locator('svg text[data-role=axis-title]')).toHaveText('V(km/sec)');},
 'wedge options':async()=>{const d=id(page,'wedge-options');await expect(d.locator('h3')).toHaveText(T('Wedge Plot Options'));
  await expect(d.locator('legend')).toHaveText([T('Grid Type'),T('Plotted Points'),T('Size'),T('Style'),T('Auto Plot Parameters')]);
  await expect(d.locator('label.wedge-radio')).toHaveText([T('Velocity'),T('Red Shift (Z)'),T('No Grid'),'1','2','3','4','5',T('Open','pointStyle'),T('Filled','pointStyle'),T('Auto Plot On')]);
  await expect(id(page,'wedge-options-ok')).toHaveText(T('OK'));await expect(id(page,'wedge-options-cancel')).toHaveText(T('Cancel'));},
 'Retain Current Data?':async()=>{const p=id(page,'wedge-prompt');await expect(p.locator('h3')).toHaveText(T('Retain Current Data?'));
  await expect(p.locator('.wedge-pre')).toHaveText(T('Do you want to add the file data to your current data?\r\n\r\n"Yes" - Add to current data.\r\n"No" - Clear current data.').replace(/\r\n/g,'\n'));
  await expect(p.getByRole('button')).toHaveText([T('Yes'),T('No'),T('Cancel')]);},
 'Confirm Deletion!':async()=>{const p=id(page,'wedge-prompt');await expect(p.locator('h3')).toHaveText(T('Confirm Deletion!'));
  await expect(p.locator('.wedge-pre')).toHaveText(T('Are you SURE you want to delete your current data?'));await expect(p.getByRole('button')).toHaveText([T('Yes'),T('No')]);},
 'Saved Data Loaded':async()=>{await expect(id(page,'wedge-notice').locator('p')).toHaveText(`${T('Saved Data Loaded')} ${T('Saved observations file "','fragment')}LSS_Redshifts.TXT${T('" loaded.','fragment')}`);},
 'TXT Files Only':async()=>{await expect(id(page,'wedge-notice').locator('p')).toHaveText([`${T('TXT Files Only')} ${T('LSS observation files must be in text format.')}`,`${T('No Data Loaded')} ${T('Data was not loaded.')}`]);},
 'No Data Loaded!':async()=>{await expect(id(page,'wedge-notice').locator('p').first()).toHaveText(`${T('No Data Loaded!')} ${T('File ','fragment')}bad.txt${T(' does not contain LSS redshift data!','fragment')}`);},
 'Print Wedge Plot':async()=>{await expect(id(page,'wedge-print-preview').locator('.web-print-header.ob-native')).toHaveText(T('LSS Wedge Plot'));},
 'LSS Galaxy Data (Edit Mode)':async()=>{await expect(id(page,'lss-region-open')).toHaveText(T('LSS Galaxy Data...'));await expect(page.locator('#lss-dialog-title')).toHaveCount(0);},
 'Extract LSS Galaxy Data for Region':async()=>{await expect(page.locator('#lss-region-title')).toHaveText(T('Extract LSS Galaxy Data for Region'));
  await expect(page.locator('.lss-region-grid thead th')).toHaveText(['',T('Minimum'),T('Maximum')]);
  await expect(page.locator('.lss-region-grid tbody th')).toHaveText([T('Right Ascension (Hrs):'),T('Declination (Degs):'),T('Redshift (Z):')]);
  await expect(id(page,'lss-region-raMin')).toHaveAccessibleName(`${T('Right Ascension (Hrs):')} ${T('Minimum')}`);
  await expect(id(page,'lss-region-ok')).toHaveText(T('OK'));await expect(id(page,'lss-region-ok').locator('xpath=following-sibling::button')).toHaveText(T('Cancel'));},
 'Input Error!':async()=>{const b=id(page,'lss-region-box');await expect(b.locator('h2')).toHaveText(T('Input Error!'));await expect(b.locator('p')).toHaveText(T('Parameters are inconsistant!'));await expect(b.getByRole('button')).toHaveText(T('OK'));},
 'non-numeric data':async()=>{const b=id(page,'lss-region-box');await expect(b.locator('h2')).toHaveText(T('Input Error!'));await expect(b.locator('p')).toHaveText(T('Parameters contain non-numeric data!'));},
 'Search Results':async()=>{const b=id(page,'lss-region-box');await expect(b.locator('h2')).toHaveText(T('Search Results'));
  const lines=(await b.locator('p').textContent())!.split('\n');expect(lines[0]).toBe(`${T('Galaxy Records Searched: ')}24069`);
  expect(lines[1]).toMatch(/\d+$/);expect(lines[1].startsWith(T('Galaxies Found in Region: '))).toBe(true);expect(lines[2].startsWith(T('Range in Z: '))).toBe(true);},
 'region Retain Current Data?':async()=>{const b=id(page,'lss-region-box');await expect(b.locator('h2')).toHaveText(T('Retain Current Data?'));
  await expect(b.getByRole('button')).toHaveText([T('Yes'),T('No'),T('Cancel')]);},
});

// "View original (English)" (decision 9): with the stored option on, every VIREO caption of the walk is VIREO's English, checked
// one by one, and no Spanish original appears anywhere; OpenVireo's own web text stays Spanish.
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});test(title(L,'View original (English) on: every VIREO caption in the E02 walk reads in English, the web text stays Spanish','View original (English) on: every VIREO caption in the E02 walk reads in English, the web text stays <L>'),async({page})=>{
 const O=L.originals,M=e01e02Maps(L.tag);
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const leaves=(v:unknown):string[]=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(leaves):[];
 const web=new Set([...Object.values(L.catalog),...[M.wedge,M.spectralRange,M.observatory,M.polish].flatMap(leaves),...Object.keys(O)].map(plain));
 const spanish=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>t);
 const left=new Map<string,string>();
 await walk(page,L,async step=>{
  for(const t of await texts(page))if(spanish.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  // Web text around the VIREO captions stays Spanish.
  if(step==='LSS survey')await expect(page.getByRole('heading',{name:N(L,'lss.title')})).toBeVisible();
  if(step==='wedge with own records')await expect(id(page,'wedge-persistence')).toHaveText((M.wedge as {persistenceNote:string}).persistenceNote);
  if(step==='Measured Redshift Data')await expect(page.locator('#lss-velocity-help')).toHaveText(L.catalog['lss.dialog.velocityHelp']!);
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});});

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});test(title(L,'Spanish: every VIREO caption in the E02 walk is its Spanish original; English shows the originals unchanged','<L> (<tag>): every VIREO caption in the E02 walk is its <L> original; English shows the originals unchanged'),async({browser})=>{
 test.setTimeout(300_000);
 for(const lang of [L,'en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,(t,context)=>lang==='en'?t:vireoOf(L)(t,context));
  await walk(page,lang,async step=>{await checks[step]?.();if(lang==='en')await expect(page.locator('.native-mirror-caption')).toHaveCount(0);});
  await page.close();
 }
});});

// LSSFields.LST that cannot be read: VIREO's "File Error!" box (its caption and its prefix are VIREO's, the reason is the web's).
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const original of [false,true])test(title(L,`the LSS fields file error box ${original?'follows View original (English)':'reads in Spanish'}`,`the LSS fields file error box ${original?'follows View original (English) (<tag>)':'reads in <L> (<tag>)'}`),async({page})=>{
 await page.addInitScript(on=>{localStorage.setItem('openvireo.tour.v1','done');if(on)localStorage.setItem('openvireo-vireo-originals','1');},original);
 await page.route('**/original/hotlists/LSSFields.LST*',r=>r.abort());
 await page.goto(`/${langQuery(L.tag)}#lss-survey`);await expect(page.locator('html')).toHaveAttribute('lang',L.entry.htmlLang);
 const box=id(page,'lss-fields-error');await expect(box).toBeVisible({timeout:30_000});
 // Review: each caption must be a translated original, or a word the language keeps (SAME_IN: Portuguese OK), never the literal fallback.
 const T=(t:string)=>original?t:Object.hasOwn(L.originals,t)?L.originals[t]!:SAME_IN[L.tag]?.has(t)?t:`No ${L.entry.englishName} original for “${t}”`;
 await expect(box.locator('strong')).toHaveText(T('File Error!'));
 await expect(box.locator('p')).toHaveText(`${T('Cannot access LSS fields file')} /original/hotlists/LSSFields.LST\n\n${L.catalog['lss.fieldsError']}`);
 await expect(box.getByRole('button')).toHaveText(T('OK'));
});});

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish E02 screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> E02 screens (<tag>) lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 const override=process.env.ES4_LAYOUT_LANG;await walk(page,override==='en'||override==='qps'?override:L,async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  if(/guide|survey|Measured|refusal|recorded|wedge|Retain|Deletion|Loaded|Only|Region|Error|Results/.test(step))await page.screenshot({path:test.info().outputPath(`${L.tag}-e02-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});});
