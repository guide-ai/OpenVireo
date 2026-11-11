import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import {TRANSLATED,e04e05Maps} from './languageText';
import {title,same,id,N,vireoOf,texts,bare,walk,LAYOUT} from './walks/e04';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT4: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, originals and maps, never
// hard-coded text). The Spanish tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser (Front PT-REL: an anonymous
// describe per language sets its browser locale, tests/fixtures/language.ts contextLocale). English and qps run once.

// Front ES6 (docs/I18N.md): exercise E04, Pleiades photometry, in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk through the
// student flow runs in English, Spanish and the pseudo-locale: the observatory's exercise list and pointing card, the Pleiades guide,
// the photometer (activation, sky and target readings through V and B, a running series, the notebook entry, VIREO's Record/Review
// with Observational Data and its Data Saved, Telescope has Moved! and Data Not Saved! boxes, B−V for two stars, the aperture dialog,
// the free-pointing input error, Save photometer session), the Pleiades colour–magnitude analysis (invalid shift, preview, confirmed
// fit, the value tables), the photometer at a free pointing read from the GSC tiles with VIREO's "Reading Sky!" question, and the
// Mayall domain explanation.
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and plain numbers with units, star labels, hashes and catalogue record ids (narrow regexes);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) and the cluster model-fit section (`.native-cluster`, ES7's area: the
//   photometer route also renders the own-observation HR fit) are left out of both comparisons.

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const C=L.catalog as Record<string,string>;
 test(title(L,'E04 reads differently in Spanish from English: list, guide, photometer, VIREO boxes, analysis, free pointing and Mayall domain','E04 reads differently in <L> (<tag>) from English: list, guide, photometer, VIREO boxes, analysis, free pointing and Mayall domain'),async({browser})=>{
 test.setTimeout(420_000);
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
 // The target selector's options: the language's wording around the recorded PLEIADES.HTL labels (Spanish: « · entrada N de la
 // lista de objetos original», read from ph.targetOption).
 const options=[...seen.own.get('activated')!].filter(t=>/^@option:(?:\d{5}|N\d{4})-\d{5} · /.test(t));
 expect(options.length).toBeGreaterThanOrEqual(24);
 const wording=new RegExp(C['ph.targetOption'].replace(/^\{label\}/,'').replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace('\\{number\\}','\\d+'));
 for(const o of options)expect(o).toMatch(wording);
 });
});

test('qps: every text of the E04 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(360_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

const MOVED_HEAD='You have not recorded your current readings for "',SAVED_TEXT='Current readings added to results list.  View/Print/Save list under "Tools" -> "Results Editors" -> "Observational Results" on main Window.';
/** VIREO's captions on each step, in English (View original) or in this load's Spanish. */
const captions=(page:Page,T:(original:string,context?:string)=>string):Record<string,()=>Promise<void>>=>({
 'activated':async()=>{await expect(page.locator('.photometer-id span')).toHaveText(T('Object:'));await expect(id(page,'photo-id-text')).toHaveText(T('Telescope'));
  await expect(id(page,'photo-record-review')).toHaveText(T('Record/Review'));},
 // The guide switched Show Object ID on, so a sky reading's IDText reads Sky and a star's its name (data).
 'sky V':async()=>{await expect(id(page,'photo-id-text')).toHaveText(T('Sky'));},
 'star V':async()=>{await expect(id(page,'photo-id-text')).toHaveText(/^(?:\d{5}|N\d{4})-\d{5}$/);},
 'Observational Data':async()=>{await expect(id(page,'photo-obs-data').locator('h2').first()).toHaveText(T('Observational Data'));},
 'Data Saved':async()=>{const b=id(page,'photo-data-saved');await expect(b.locator('h3')).toHaveText(T('Data Saved'));await expect(b.locator('p')).toHaveText(T(SAVED_TEXT));
  await expect(b.getByRole('button')).toHaveText(T('OK'));},
 'Telescope has Moved!':async()=>{const b=id(page,'photo-moved');await expect(b.locator('h3')).toHaveText(T('Telescope has Moved!'));
  const lines=await b.locator('p').allTextContents();expect(lines).toHaveLength(3);
  expect(lines[0]).toMatch(new RegExp(`^${T(MOVED_HEAD,'fragment').replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')}(?:\\d{5}|N\\d{4})-\\d{5}${T('".','fragment').replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')}$`));
  expect(lines.slice(1)).toEqual([T('If you do not record them now, you cannot access them later.'),T('Record current readings?')]);
  await expect(b.getByRole('button')).toHaveText([T('Yes'),T('No')]);},
 'Data Not Saved!':async()=>{const b=id(page,'photo-not-saved');await expect(b.locator('h3')).toHaveText(T('Data Not Saved!'));await expect(b.locator('p')).toHaveText(T('Current Readings Cleared!'));
  await expect(b.getByRole('button')).toHaveText(T('OK'));},
 'B−V of the first star':async()=>{await expect(id(page,'photo-native-results')).toHaveText(T('Display/Print Data'));},
 'Reading Sky!':async()=>{const b=id(page,'photo-sky-replace');await expect(b.locator('h3')).toHaveText(T('Reading Sky!'));
  await expect(b.locator('p')).toHaveText(T('Are you sure you want to replace a sky reading with one that may be invalid?'));await expect(b.getByRole('button')).toHaveText([T('Yes'),T('No')]);},
});

// "View original (English)" (decision 9): with the stored option on, every VIREO caption of the walk is VIREO's English, checked
// one by one, and no Spanish original appears anywhere; OpenVireo's own web text stays Spanish.
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const C=L.catalog as Record<string,string>,O=L.originals,vireoIn=vireoOf(L),M=e04e05Maps(L.tag);
 test(title(L,'View original (English) on: every VIREO caption in the E04 walk reads in English, the web text stays Spanish','View original (English) on: every VIREO caption in the E04 walk reads in English, the web text stays <L>'),async({page})=>{
 test.setTimeout(360_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const leaves=(v:unknown):string[]=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(leaves):[];
 const web=new Set([...Object.values(C),...[M.spectralRange,M.observatory,M.polish,M.camera,M.sound].flatMap(leaves),...Object.keys(O)].map(plain));
 const translated=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>t);
 const left=new Map<string,string>();
 await walk(page,L,async step=>{
  for(const t of await texts(page))if(translated.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  // Web text around the VIREO captions stays in the language.
  if(step==='activated')await expect(page.getByRole('heading',{name:N(L,'ph.title')})).toBeVisible();
  if(step==='Data Saved')await expect(id(page,'photo-record-review-help')).toHaveText(C['ph.nativeRecordHelp']);
  if(step==='Telescope has Moved!')await expect(id(page,'photo-phase')).toHaveText(C['ph.complete']);
  if(step==='Reading Sky!')await expect(id(page,'photo-telescope-access')).toHaveText(C['ph.access.ready']);
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 });

 test(title(L,'Spanish: every VIREO caption in the E04 walk is its Spanish original; English shows the originals unchanged','<L> (<tag>): every VIREO caption in the E04 walk is its <L> original; English shows the originals unchanged'),async({browser})=>{
 test.setTimeout(420_000);
 for(const lang of ['own','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,(t,context)=>lang==='en'?t:vireoIn(t,context));
  await walk(page,lang==='en'?'en':L,async step=>{await checks[step]?.();});
  await page.close();
 }
 // Every caption the walk checks has a translation in this language (or is a word it keeps: OK in Portuguese).
 for(const t of ['Object:','Telescope','Record/Review','Sky','Observational Data','Data Saved',SAVED_TEXT,'Telescope has Moved!','If you do not record them now, you cannot access them later.','Record current readings?','Yes','Data Not Saved!','Current Readings Cleared!','Display/Print Data','Reading Sky!','Are you sure you want to replace a sky reading with one that may be invalid?'])expect(vireoIn(t),t).not.toBe(t);
 expect(vireoIn(MOVED_HEAD,'fragment')).not.toBe(MOVED_HEAD);
 });
});

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish E04 screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> E04 screens lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(420_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 // ES6_LAYOUT_LANG=en|qps walks that reference instead (a debugging aid; the language's own test title is kept).
 await walk(page,(process.env.ES6_LAYOUT_LANG as 'en'|'qps'|undefined)??L,async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  await page.screenshot({path:test.info().outputPath(`${L.tag}-e04-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});});
