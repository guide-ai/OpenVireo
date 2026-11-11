import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import en from '../../src/i18n/en.json' with {type:'json'};
import es from '../../src/i18n/es/es.json' with {type:'json'};
import {TRANSLATED,type LanguageText} from './languageText';
import {title,SAME,same,id,open,texts,walk,LAYOUT,multiSpecWalk} from './walks/observatory';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT1: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, maps and originals, never
// hard-coded text). The Spanish tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser (Front PT-REL: an anonymous
// describe per language sets its browser locale, tests/fixtures/language.ts contextLocale). English and qps run once.
// Front ES2 (docs/I18N.md): the optical observatory, its VIREO menus and its File, Slew, Site and options dialogs in Spanish in an
// `es-*` browser (a `?lang=es-419` preview load before ES-REL). The same walk through the observatory runs in English, Spanish and the pseudo-locale:
// - Spanish: no visible text, accessible name or title reads the same as in English, except identifiers (SAME);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), except identifiers;
// - native views that mirror a written file (`lang="en"`, F2) are left out of both comparisons and keep a Spanish caption.

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const C=L.catalog as Record<string,string>,O=L.originals;

 test(title(L,'the observatory walk reads differently in Spanish from English: menus, dialogs, boxes and option names','the observatory walk reads differently in <L> (<tag>) from English: menus, dialogs, boxes and option names'),async({browser})=>{
  test.setTimeout(240_000);
  const seen:Record<'en'|'own',Map<string,Set<string>>>={en:new Map(),own:new Map()};
  for(const lang of ['en','own'] as const){
   const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await walk(page,lang==='en'?'en':L,async step=>{seen[lang].set(step,new Set(await texts(page)));});
   expect(errors,lang==='en'?'en':L.tag).toEqual([]);await page.close();
  }
  const english=new Set([...seen.en.values()].flatMap(s=>[...s]));
  const left:string[]=[];
  for(const [step,list] of seen.own)for(const t of list)if(english.has(t)&&!same(t.replace(/^@[a-z-]+:/,''),L))left.push(`${step}: ${t}`);
  expect(left).toEqual([]);
  const own=[...seen.own.values()].flatMap(s=>[...s]);
  // A few fixed forms of the final VIREO menu glossary, as they appear on screen.
  for(const t of [O['Optical Simulation Options'],O['Limit Slewing'],O['Restrict Scope Access'],O['Set Date/Time, ID'],O['CLEA Star Field Data'],C['sky.close']])expect(own.some(s=>s===t||s.startsWith(`${t} `)),t).toBe(true);
 });
});

test('qps: every text of the observatory walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(180_000);page.setViewportSize({width:1440,height:1000});
 const left:string[]=[];
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(t.replace(/^@[a-z-]+:/,'')))left.push(`${step}: ${t}`);});
 expect([...new Set(left)]).toEqual([]);
});

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const C=L.catalog as Record<string,string>,O=L.originals;

 test(title(L,'a native list that mirrors its saved file stays English with a Spanish caption (F2)','a native list that mirrors its saved file stays English with a <L> caption (F2)'),async({page})=>{
 await open(page,L);
 await page.locator('.sky-card .card-heading > button').click();
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible())await toggle.click();
 await id(page,'instructor-mode-open').click();await id(page,'instructor-mode-confirm-on').click();
 await page.locator('.telescope-motion').getByTestId('ob-options').click();await id(page,'ob-options-edit-mode').check();
 const yes=page.locator('[data-testid$=-yes]:visible').first();if(await yes.count())await yes.click();await id(page,'ob-options-ok').click();
 await id(page,'fi-file-menu').click();await id(page,'fi-field-information').click();await id(page,'fi-star-list').click();
 const lines=id(page,'fi-slist-lines');await expect(lines).toBeVisible({timeout:15_000});
 await expect(lines).toHaveAttribute('lang','en');await expect(id(page,'fi-slist-mirror-caption')).toHaveText(C['nativeMirror.caption']);
 await expect(page.locator('[data-testid=fi-slist] h2')).toHaveText(O['CLEA Star Field Data']);
});

 test(title(L,'View original (English): VIREO\'s own texts come back in English at the next load, OpenVireo\'s web text stays Spanish','View original (English): VIREO\'s own texts come back in English at the next load, OpenVireo\'s web text stays <L>'),async({page})=>{
 const dateDialog=async()=>{
  await page.locator('.sky-card .card-heading > button').click();
  const d=page.locator('details:has([data-testid=ob-set-date])').first();if(await d.count())await d.evaluate(e=>{(e as HTMLDetailsElement).open=true;});
  await id(page,'ob-set-date').click();return id(page,'ob-date-dialog');
 };
 await open(page,L);
 let dialog=await dateDialog();
 await expect(dialog.getByRole('heading')).toHaveText(O['Set Date/Time, ID']);await expect(dialog).toContainText(O['Universal Time (UTC)']);
 // The option is read when the page loads: set it, and the open page is unchanged until the next load.
 await page.evaluate(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 await expect(dialog.getByRole('heading')).toHaveText(O['Set Date/Time, ID']);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',L.entry.htmlLang);
 dialog=await dateDialog();
 await expect(dialog.getByRole('heading')).toHaveText('Set Date/Time, ID');await expect(dialog).toContainText('Universal Time (UTC)');
 await expect(page.locator('.sky-card .card-heading > button')).toHaveText(C['sky.close']);// web text: still in the language
 await page.keyboard.press('Escape');
 await page.evaluate(()=>localStorage.removeItem('openvireo-vireo-originals'));
});

// Review 1, C1: with the option on, the whole walk shows no Spanish translation of a VIREO original (menus, buttons, boxes and
// dialog captions included), while OpenVireo's own web text stays Spanish.
 test(title(L,'View original (English) on: every VIREO name in the observatory walk reads in English, the web text stays Spanish','View original (English) on: every VIREO name in the observatory walk reads in English, the web text stays <L>'),async({page})=>{
 test.setTimeout(180_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'').replace(/(?: ›|…|\.\.\.)$/,'').trim();
 // OpenVireo's own Spanish (catalog and maps) and VIREO's English may coincide with a Spanish original («Minutos», «Min»).
 const leaves=(v:unknown):string[]=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(leaves):[];
 const web=new Set([...Object.values(C),...L.observatoryMaps.flatMap(leaves),...Object.keys(O)].map(bare)),spanish=new Set(Object.values(O).map(bare).filter(t=>!web.has(t)));
 const left:string[]=[];
 await walk(page,L,async step=>{for(const t of await texts(page))if(spanish.has(bare(t))&&!SAME.has(bare(t)))left.push(`${step}: ${t}`);});
 expect([...new Set(left)]).toEqual([]);
 for(const [testId,name] of [['ob-set-coordinates','Set Coordinates…'],['ob-view-select','View/Select from List…'],['ob-add-current','Add Current Item/Position to List…'],
  ['fi-file-menu','File'],['ob-tools-menu','Tools'],['ob-set-date','Set Date/Time…'],['ob-site-parameters','Site Parameters…'],['ob-site-information','Site Information…']] as const)
  await expect(id(page,testId)).toHaveText(name);
 await expect(page.locator('.telescope-motion').getByTestId('ob-options')).toHaveText('Optical Simulation Options…');
 await expect(page.locator('.sky-card .card-heading > button')).toHaveText(C['sky.close']);
 });
});


for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish observatory dialogs, menus and the options dialog lay out without overflow or clipping`,`at ${width} px the <L> observatory dialogs, menus and the options dialog lay out without overflow or clipping`),async({page})=>{
 test.setTimeout(180_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems:string[]=[];
 await walk(page,L,async step=>{for(const p of await layoutProblems(page,LAYOUT))problems.push(`${step}: ${p}`);
  if(['Optical Simulation Options','File › Field Information › Star Data List','Site Parameters'].includes(step))await page.screenshot({path:test.info().outputPath(`${L.tag}-observatory-${width}-${step.replace(/\W+/g,'-')}.png`)});});
 expect([...new Set(problems)]).toEqual([]);
});});

test('the walk in English is unchanged: the native caption is absent and the VIREO captions are the originals',async({page})=>{
 await open(page,'en');
 await page.locator('.sky-card .card-heading > button').click();
 await expect(page.locator('.sky-card .card-heading > button')).toHaveText(en['sky.close']);
 await id(page,'ob-set-coordinates').click();await expect(id(page,'ob-sky-coords').getByRole('heading')).toHaveText('Enter Sky Coordinates for Slew');
 await expect(page.locator('.native-mirror-caption')).toHaveCount(0);
});

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});test(title(L,'Multi-Spec in Spanish: Control, boxes, spectra list, spectrum, Information and print read differently from English','Multi-Spec in <L> (<tag>): Control, boxes, spectra list, spectrum, Information and print read differently from English'),async({browser})=>{
 test.setTimeout(300_000);
 const seen:Record<'en'|'own',Map<string,Set<string>>>={en:new Map(),own:new Map()};
 for(const lang of ['en','own'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await multiSpecWalk(page,lang==='en'?'en':L,async step=>{seen[lang].set(step,new Set(await texts(page)));});
  expect(errors,lang==='en'?'en':L.tag).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s]));
 const left:string[]=[];
 for(const [step,list] of seen.own)for(const t of list)if(english.has(t)&&!same(t.replace(/^@[a-z-]+:/,''),L))left.push(`${step}: ${t}`);
 expect([...new Set(left)]).toEqual([]);
});});
/** Front SC9: problems the fixture's plot-text check found in the Multi-Spec walk at both widths, in English as well as Spanish,
 * are recorded here, not hidden: an entry that stops appearing fails the test, so the fix removes it. Front SKY-LABELS fixed
 * the two SC9 found (the Coma-1 sky-map labels past the 700-unit view, now drawn left of their ring, and the selection number
 * «3» cut at the top of the Multi-Spec field, whose baseline is now kept inside it; src/core/overlayLabels.ts), so none is
 * known. */
const MULTISPEC_KNOWN:readonly RegExp[]=[];
/** Front PT1: MULTISPEC_KNOWN as it reads in another language: the second sky-map label is built from that language's
 * sky.supportedGalaxyLabel (the Spanish label in an entry is replaced by the language's), so an entry removed above is removed
 * for every language. */
const esc=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const knownFor=(L:LanguageText)=>{
 const label=(C:Record<string,string>)=>C['sky.supportedGalaxyLabel'].replace('{id}','NGC 4874').replace('{label}','Coma – 1');
 return L.tag==='es-419'?MULTISPEC_KNOWN:MULTISPEC_KNOWN.map(k=>new RegExp(k.source.split(esc(label(es))).join(esc(label(L.catalog as Record<string,string>))),k.flags));
};
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish Multi-Spec windows lay out without overflow or clipping`,`at ${width} px the <L> Multi-Spec windows lay out without overflow or clipping`),async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems:string[]=[],KNOWN=knownFor(L);
 await multiSpecWalk(page,L,async step=>{for(const p of await layoutProblems(page,LAYOUT))problems.push(`${step}: ${p}`);
  if(/list|Information/.test(step))await page.screenshot({path:test.info().outputPath(`${L.tag}-multispec-${width}-${step.replace(/\W+/g,'-')}.png`)});});
 const found=[...new Set(problems)];
 expect(found.filter(p=>!KNOWN.some(k=>k.test(p)))).toEqual([]);
 expect(KNOWN.filter(k=>!found.some(p=>k.test(p))).map(String),'a known problem no longer appears: remove it from MULTISPEC_KNOWN').toEqual([]);
});});
