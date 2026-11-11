import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import {writeFileSync} from 'node:fs';
import {translatedFor,e04e05Maps} from './languageText';
import {title,SAME_IN,same,id,N,vireoOf,texts,bare,walk,LAYOUT} from './walks/e05';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT4: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, originals and maps, never
// hard-coded text). The Spanish tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser (Front PT-REL: an anonymous
// describe per language sets its browser locale, tests/fixtures/language.ts contextLocale). English and qps run once.

// Front ES7 (docs/I18N.md): exercise E05, the cluster HR diagram and variable stars, in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One
// walk runs in English, Spanish and the pseudo-locale over the cluster guide, the reference database lab (dataset, point
// inspection, Possible Cluster Member, Select Cluster Data, Display/Print Data, exclusions, the native ZAMS/isochrone fit, the
// parameter report and its print preview, the help viewer), the own-observation HR panel, the saved-observation HR tool with
// Observational Data, File › Cluster Data… and the variable-star route.
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and the narrow patterns below (star names, cluster names, catalog and VIREO list lines);
// - qps: every visible text is marked ⟦…⟧, with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) are left out of both comparisons.
for(const L of translatedFor('e05'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 test(title(L,'E05 reads differently in Spanish from English','E05 reads differently in <L> (<tag>) from English'),async({browser})=>{
 test.setTimeout(360_000);
 const seen:Record<'en'|'own',Map<string,Set<string>>>={en:new Map(),own:new Map()};
 for(const lang of ['en','own'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{await walk(page,lang==='en'?'en':L,async step=>{seen[lang].set(step,new Set(await texts(page,step)));});}catch(e){console.log('FAILED at',[...seen[lang].keys()].pop(),lang==='en'?'en':L.tag);throw e;}
  expect(errors,lang==='en'?'en':L.tag).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();
 for(const [step,list] of seen.own)for(const t of list)if(english.has(bare(t))&&!same(bare(t),step,L)&&!left.has(t))left.set(t,step);
 if(process.env.E05_DUMP)writeFileSync(process.env.E05_DUMP,[...left].map(([t,step])=>`${step}: ${t}`).join('\n'));
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 });
});

test('qps: every text of the E05 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page,step))if(!/[⟦⟧]/.test(t)&&!same(bare(t),step)&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

const NO_SELECTION='Please select (highlight) an item on the list, then select "Selection" -> "Plot" from the menu.';
/** VIREO's captions on each step, in English (View original) or in this load's Spanish. Each is asserted by itself. */
const captions=(page:Page,T:(original:string)=>string):Record<string,()=>Promise<void>>=>({
 'dataset loaded':async()=>{await expect(id(page,'cluster-select-data')).toHaveText(T('Select Cluster Data...'));await expect(id(page,'cluster-display-data')).toHaveText(T('Display/Print Data'));await expect(id(page,'db-hr-print-open')).toHaveText(T('Print'));},
 'Possible Cluster Member':async()=>{const m=id(page,'cluster-member');await expect(m.getByRole('heading',{level:3})).toHaveText(T('Possible Cluster Member'));await expect(id(page,'cluster-member-menu')).toHaveText(T('Item'));
  const f=m.locator('.cluster-member-field span');for(const [i,c] of ['Cluster Name:','ID #:','RA:','V:','Dec:','B-V:','U-B:','Spectral Type:'].entries())await expect(f.nth(i)).toHaveText(T(c));
  await expect(id(page,'cluster-member-add-hot-list')).toHaveText(T('Add to Hot List'));await expect(id(page,'cluster-member-remove')).toHaveText(T('Remove from HR Diagram'));await expect(id(page,'cluster-member-exit')).toHaveText(T('Exit'));},
 'Remove from HR Diagram asked':async()=>{const q=id(page,'cluster-member-question');await expect(q.getByRole('heading')).toHaveText(T('Verify Removal from Plot'));
  await expect(q.locator('.cluster-hr-message')).toHaveText(T('Are you sure you want to remove this star from the HR diagram?\r\n\r\n(Restore via "File"->"Restore Removed Points")').replace(/\r\n/g,'\n'));
  await expect(q.locator('button').nth(0)).toHaveText(T('Yes'));await expect(q.locator('button').nth(1)).toHaveText(T('No'));},
 'Add to Hot List':async()=>{await expect(id(page,'cluster-entry').getByRole('heading').first()).toHaveText(T('Add/Edit Hot List Entry'));},
 'Select Cluster Data':async()=>{await expect(id(page,'cluster-list').getByRole('heading',{level:2})).toHaveText(T('Clusters for Study'));await expect(id(page,'cluster-list-list-menu')).toHaveText(T('List'));await expect(id(page,'cluster-list-print')).toHaveText(T('Print...'));await expect(id(page,'cluster-list-close')).toHaveText(T('Close'));await expect(id(page,'cluster-list-selection-menu')).toHaveText(T('Selection'));},
 'Plot with no selection':async()=>{const b=id(page,'cluster-list-box');await expect(b.getByRole('heading')).toHaveText(T('Information'));await expect(b.locator('p')).toHaveText(T(NO_SELECTION));},
 'Display/Print Data':async()=>{await expect(id(page,'cluster-report').getByRole('heading',{level:2})).toHaveText(T('CLEA Cluster Data'));},
 'HR print preview':async()=>{const p=id(page,'db-hr-print');await expect(p.getByRole('heading',{level:2})).toContainText(T('Color-Magnitude Diagram'));await expect(p.locator('[data-kind=date]')).toContainText(T('     Laboratory Table Number (Not Recorded)'));
  await expect(p.locator('[data-kind=zams]')).toHaveText(T('Fit of Zero-Age Main Sequence:'));await expect(p.locator('[data-kind=caption]')).toHaveText(T('Color-Magnitude Diagram'));},
 'cluster help':async()=>{await expect(id(page,'cluster-help-topics-menu')).toHaveText(T('Topics'));await expect(id(page,'cluster-help-topics').getByRole('heading',{level:2})).toHaveText(T('Select Help Topic'));},
 'observation HR tool':async()=>{await expect(page.locator('#cnhr-plot')).toHaveText(T('Load/Plot'));await expect(page.locator('#cnhr-report')).toHaveText(T('View/Print Parameters'));},
 'observation file added':async()=>{await expect(page.getByRole('heading',{name:T('Recorded Results - Computed Magnitudes')})).toBeVisible();},
 'Observational Data':async()=>{await expect(page.locator('dialog.obsd').getByRole('heading').first()).toHaveText(T('Observational Data'));},
 'variable star data':async()=>{await expect(id(page,'vstar-list-window').getByRole('heading',{level:2})).toHaveText(T('Variable Star Data'));await expect(id(page,'vstar-data-menu')).toHaveText(T('Data'));},
 'light curve':async()=>{await expect(id(page,'light-curve-window').getByRole('heading',{level:2})).toHaveText(T('Simulated Light Curve'));await expect(id(page,'curve-file-menu')).toHaveText(T('File'));await expect(id(page,'curve-exit')).toHaveText(T('Exit'));},
 'listing saved':async()=>{const b=id(page,'fi-box');await expect(b.getByRole('heading')).toHaveText(T('Text File Written'));await expect(id(page,'fi-box-text')).toHaveText(new RegExp(`^${esc(T('Report Text Written to '))} ?.+\\.TXT${esc(T('.'))}$`));},
 'parameter report':async()=>{await expect(id(page,'db-hr-report-print-preview')).toContainText(T('Cluster Age/Distance Parameters'));},
 'Recorded Results':async()=>{await expect(id(page,'cnhr-results').getByRole('heading',{level:2})).toHaveText(T('Recorded Results - Computed Magnitudes'));},
 'variable list saved':async()=>{await expect(id(page,'vstar-notice')).toHaveText(new RegExp(`^${esc(T('Report Text Written to '))} ?.+\\.TXT${esc(T('.'))}$`));},
 'variable list print preview':async()=>{await expect(id(page,'variable-print-date')).toContainText(T('     Laboratory Table Number ').trim());await expect(id(page,'variable-print-date')).toContainText(T('(Not Recorded)'));},
 'light curve print preview':async()=>{await expect(id(page,'variable-print-next-page')).toHaveText(T('(Screen Image Printed on Next Page)'));await expect(id(page,'variable-print-date')).toContainText(T('(Not Recorded)'));},
 'Cluster Data dialog':async()=>{const d=id(page,'cd-dialog');await expect(d.getByRole('heading').first()).toHaveText(T('Cluster Data Parameters'));await expect(id(page,'cd-view-select')).toHaveText(T('View/&Select Cluster from List'));await expect(id(page,'cd-add-to-list')).toHaveText(T('&Add Cluster to List'));
  for(const c of ['Cluster Name or ID','Cluster Center','Type of Listing','Sort By','Use Telescope Coordinates',"Diameter ('):",'Mag. Limit:','&Student (Finding List)'])await expect(d,c).toContainText(T(c));},
 'Cluster Data study list':async()=>{await expect(id(page,'cd-study-list').getByRole('heading').first()).toHaveText(T('Clusters for Study'));},
 'Cluster Data added to hot list':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('Confirmation'));},
 'Cluster Data hot list not saved':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('Current Hot List not Saved!'));},
 'Cluster Data new hot list':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('New Hot List Created'));await expect(id(page,'fi-box-text')).toHaveText(new RegExp(`^${esc(T('All stars from cluster ').trim())}\\s+NGC 752\\s+${esc(T(' placed in Hot List').trim())}$`));},
 'Cluster Data no stars':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('No Stars Found in Field!'));const t=id(page,'fi-box-text');await expect(t).toContainText(T('Possible Error in Field Parameters:'));for(const l of ['MinRA: ','MaxDec: ','LimitMag: '])await expect(t).toContainText(`${T(l).trim()} `);await expect(t).toContainText('5.000');},
 'Cluster Data invalid diameter':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('Input Error!'));await expect(id(page,'fi-box-text')).toHaveText(T('Diameter is Invalid!'));},
 'Cluster Data unsaved list':async()=>{await expect(id(page,'fi-box').getByRole('heading')).toHaveText(T('Cluster List not Saved!'));},
});
const esc=(text:string)=>text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&');
// "View original (English)" (decision 9): every VIREO caption of the walk is VIREO's English, checked one by one, and no Spanish
// original appears anywhere; OpenVireo's own web text stays Spanish.
for(const L of translatedFor('e05'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const C=L.catalog as Record<string,string>,O=L.originals,vireoIn=vireoOf(L),M=e04e05Maps(L.tag);
 test(title(L,'View original (English) on: every VIREO caption in the E05 walk reads in English, the web text stays Spanish','View original (English) on: every VIREO caption in the E05 walk reads in English, the web text stays <L>'),async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const web=new Set([...Object.values(C),...Object.keys(O)].map(plain));
 const translated=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>t.replace(/&(&?)/g,(_,d:string)=>d));
 const left=new Map<string,string>();
 await walk(page,L,async step=>{
  for(const t of await texts(page,step))if(translated.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  if(step==='cluster guide')await expect(page.getByRole('heading',{level:1,name:N(L,'db.title')})).toBeVisible();
  if(step==='dataset loaded')await expect(id(page,'cluster-reference-count')).toContainText('M 67');
  if(step==='Possible Cluster Member')await expect(id(page,'cluster-member').locator('p.cluster-hr-note').last()).toHaveText(M.clusterHr.memberRemoveNote);
  if(step==='observation HR tool')await expect(page.getByRole('heading',{name:N(L,'obsHr.title')})).toBeVisible();
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 });

 test(title(L,'Spanish: every VIREO caption in the E05 walk is its Spanish original; English shows the originals unchanged','<L> (<tag>): every VIREO caption in the E05 walk is its <L> original; English shows the originals unchanged'),async({browser})=>{
 test.setTimeout(360_000);
 for(const lang of ['own','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,t=>lang==='en'?t.replace(/&(&?)/g,(_,d:string)=>d):vireoIn(t));
  await walk(page,lang==='en'?'en':L,async step=>{await checks[step]?.();});
  await page.close();
 }
 for(const t of ['Possible Cluster Member','Item','Clusters for Study','Display/Print Data','Observational Data','Load/Plot','View/Print Parameters','Variable Star Data','Simulated Light Curve','Select Cluster Data...'])if(!(SAME_IN[L.tag]?.has(t)??false))expect(vireoIn(t),t).not.toBe(t);
 });
});

for(const L of translatedFor('e05'))test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish E05 screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> E05 screens lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(360_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 await walk(page,L,async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  await page.screenshot({path:test.info().outputPath(`${L.tag}-e05-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});});
