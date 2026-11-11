import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import {translatedFor} from './languageText';
import {title,P,E,same,id,N,vireoOf,texts,bare,programButton,walk,LAYOUT} from './walks/e03';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT3: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog and originals, never
// hard-coded text). The Spanish tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser (Front PT-REL: an anonymous
// describe per language sets its browser locale, tests/fixtures/language.ts contextLocale). English and qps run once.
// Front ES5 (docs/I18N.md): exercise E03, Spectral Classification, in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk through the
// student flow runs in English, Spanish and the pseudo-locale: the classification guide, the lab (source, Program List with its
// dialog, VIREO's No More Spectra end box, atlas and standard pairs, Standard − practice, the line table, the wavelength window,
// the four renderings with their reverse options, the normalized sampled difference, the range dialog and its refusal, the
// sampled flux readout, the comparison cursor, the manual equivalent width with its cursor, review dialog and record, the
// comparison marks, the classification review, record and refusal, an imported spectrum, an acquired star and the two restore
// refusals).
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and the narrow patterns below (star names, spectral types as data, SPECLNS.LNL line labels, atlas labels,
//   hashes, numbers with units);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) are left out of both comparisons.

for(const L of translatedFor('e03'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const C=L.catalog as Record<string,string>;
 test(title(L,'E03 reads differently in Spanish from English: guide, Program List, comparison, displays, width, records, import and acquisition','E03 reads differently in <L> (<tag>) from English: guide, Program List, comparison, displays, width, records, import and acquisition'),async({browser})=>{
 test.setTimeout(360_000);
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
 // The rendering selector's options are in the language; the atlas selector keeps the recorded atlas labels.
 const options=[...seen.own.get('classification lab')!].filter(t=>t.startsWith('@option:'));
 for(const key of ['photo.trace','sampledTrace.option','photo.photo','combined.option','class.bracket','class.difference'])expect(options).toContain(`@option:${C[key]}`);
 expect(options).toContain('@option:Main Sequence');
 });
});

test('qps: every text of the E03 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

/** VIREO's captions on each step, in English (View original) or in this load's language; `end` is the web sentence after the
 * No More Spectra box in that load. */
const captions=(page:Page,T:(original:string)=>string,end:string):Record<string,()=>Promise<void>>=>({
 'classification lab':async()=>{await expect(id(page,'spl-open')).toHaveText(T('Spectral Line &Table'));await expect(programButton(page,P.programList)).toHaveText(T(P.programList).replace(/\.\.\.$/,''));await expect(programButton(page,P.nextOnList)).toHaveText(T(P.nextOnList));},
 'observation results':async()=>{await expect(page.locator('#observation-dialog-title')).toHaveText(T('Observational Data'));},
 'observation edit':async()=>{await expect(page.locator('#observation-dialog-title')).toHaveText(T('Observational Data'));},
 // VIREO's Observational Data field captions for a loaded file (TObsRsltsDlg1, OBSERVATIONAL_DATA_LITERALS), in the web notebook.
 'imported spectrum observation':async()=>{const d=page.locator('dialog.observation-dialog');await expect(page.locator('#observation-dialog-title')).toHaveText(T('Observational Data'));
  await expect(d.locator('dt').nth(2)).toHaveText(T('Observation Time (JD)'));await expect(d.locator('dt').nth(3)).toHaveText(T('Right Ascension:'));await expect(d.locator('dt').nth(4)).toHaveText(T('Declination:'));
  await expect(d.locator('dt').nth(5)).toHaveText(T('Observed Magnitudes'));await expect(d.locator('dt').nth(6)).toHaveText(T('Redshift (Z):'));await expect(d.locator('dt').nth(7)).toHaveText(T('Velocity (V):'));},
 'No More Spectra':async()=>{await expect(page.locator('.classification-program [role=status]')).toHaveText(`${T(P.noMoreSpectra)}. ${T(P.endOfList)} ${end}`);},
});

for(const L of translatedFor('e03'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const C=L.catalog as Record<string,string>,O=L.originals,vireoIn=vireoOf(L);
// "View original (English)" (decision 9): with the stored option on, every VIREO caption of the walk is VIREO's English, checked
// one by one, and no translated original appears anywhere; OpenVireo's own web text stays in the language.
 test(title(L,'View original (English) on: every VIREO caption in the E03 walk reads in English, the web text stays Spanish','View original (English) on: every VIREO caption in the E03 walk reads in English, the web text stays <L>'),async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const web=new Set([...Object.values(C),...Object.keys(O)].map(plain));
 const translated=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>t.replace(/&(&?)/g,(_,d:string)=>d),C['program.end']);
 const left=new Map<string,string>();
 await walk(page,L,async step=>{
  for(const t of await texts(page))if(translated.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  // Web text around the VIREO captions stays in the language.
  if(step==='classification lab'){await expect(page.getByRole('heading',{level:1,name:N(L,'class.title')})).toBeVisible();await expect(page.locator('#classification-program-title')).toHaveText(C['program.title']);}
  if(step==='No More Spectra')await expect(page.locator('.classification-program [role=status]')).toContainText(C['program.end']);
  if(step==='imported spectrum observation')await expect(page.locator('dialog.observation-dialog p').first()).toHaveText(C['obs.temporary']);
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 });

 test(title(L,'Spanish: every VIREO caption in the E03 walk is its Spanish original; English shows the originals unchanged','<L> (<tag>): every VIREO caption in the E03 walk is its <L> original; English shows the originals unchanged'),async({browser})=>{
 test.setTimeout(360_000);
 for(const lang of ['own','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,t=>lang==='en'?t.replace(/&(&?)/g,(_,d:string)=>d):vireoIn(t),lang==='en'?E['program.end']:C['program.end']);
  await walk(page,lang==='en'?'en':L,async step=>{await checks[step]?.();});
  await page.close();
 }
 expect(vireoIn(P.programList)).not.toBe('Program List...');expect(vireoIn('Observational Data')).not.toBe('Observational Data');for(const t of ['Observation Time (JD)','Right Ascension:','Declination:','Observed Magnitudes','Redshift (Z):','Velocity (V):'])expect(vireoIn(t)).not.toBe(t);expect(vireoIn('Spectral Line &Table')).not.toBe('Spectral Line Table');expect(vireoIn(P.noMoreSpectra)).not.toBe(P.noMoreSpectra);
 });
});

for(const L of translatedFor('e03'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish E03 screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> E03 screens lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(360_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 // ES5_LAYOUT_LANG=en|qps walks that reference instead (a debugging aid; the language's own test title is kept).
 await walk(page,(process.env.ES5_LAYOUT_LANG as 'en'|'qps'|undefined)??L,async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  if(/guide|lab|Program|Spectra|practice|photo|traces|range|cursor|width|review|imported|acquired/.test(step))await page.screenshot({path:test.info().outputPath(`${L.tag}-e03-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});});
