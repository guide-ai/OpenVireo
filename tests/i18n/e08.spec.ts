import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale,langQuery} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import {TRANSLATED,textOf,e08Maps,type LanguageText} from './languageText';
import {Lang,title,CDS,RECORDED_VIZIER,STAR_CODE,EROS_CODE,same,id,exact,LE,vireoOf,mapButton,texts,bare,lab,go,walk,LAYOUT} from './walks/e08';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT6: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, originals and Object X and
// camera maps, never hard-coded text). The Spanish tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser (Front PT-REL: an anonymous
// describe per language sets its browser locale, tests/fixtures/language.ts contextLocale), including the hidden
// identity checks. English and qps run once.
// Front ES9 (docs/I18N.md): exercise E08, Object X, and the CCD/IR camera in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk
// through the student flow runs in English, Spanish and the pseudo-locale: the Object X guide, the lab (ID, code, the reveal
// refusal, the date refusal, the spectrometer with a kept spectrum and the neutral unavailable message, the clock and the asteroid
// list), the observatory with the CCD camera (live VizieR replaced by the recorded CDS response, two images 45 minutes apart),
// the camera's Information window and the IR camera panel, the Object X card on the radio route, the images, the measuring tool
// (its two refusals, a reference star, blinking), the answer and the reveal, and the saved-images route (a synthetic FITS, the
// pixel refusal, the palette and the camera information).
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and the narrow patterns below (object codes, ObjX labels, file names, catalogue data, hashes, numbers);
// - qps: every visible text is marked ⟦…⟧, with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2: the camera information lines) are left out of both comparisons;
// - before the reveal no ObjectX.HTL identifier or remark appears in the Object X route, its guide or the camera, in any language.

/** The verdict for each kind, wrong answer, in each language (the article agrees with the kind). */
const VERDICTS:Readonly<Record<string,readonly string[]>>={
 'es-419':['Es una estrella.','Es una galaxia.','Es un cuásar (QSO).','Es un púlsar.','Es un asteroide.'],
 'pt-BR':['É uma estrela.','É uma galáxia.','É um quasar (QSO).','É um pulsar.','É um asteroide.'],
};
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const LS=e08Maps(L.tag).objectXLab;
 test(title(L,'E08 reads differently in Spanish from English: guide, lab, spectrometer, camera, measuring tool, reveal and saved images','E08 reads differently in <L> (<tag>) from English: guide, lab, spectrometer, camera, measuring tool, reveal and saved images'),async({browser})=>{
 test.setTimeout(480_000);
 const seen:Record<'en'|'own',Map<string,Set<string>>>={en:new Map(),own:new Map()};
 for(const lang of ['en','own'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await walk(page,lang==='en'?'en':L,async(step,root)=>{seen[lang].set(step,new Set(await texts(page,root)));});
  expect(errors,lang==='en'?'en':L.tag).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();
 for(const [step,list] of seen.own)for(const t of list)if(english.has(bare(t))&&!same(bare(t),L)&&!left.has(t))left.set(t,step);
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 // The orbit file and telescope options and the answer kinds are in the language (the file names stay as written).
 const lab=[...seen.own.get('Object X lab')!];
 for(const name of [LS.orbitNames['ObjX_MPC.CMO.sav'],LS.orbitNames['ObjX_MPC.CMO'],LS.targetChoose])expect(lab).toContain(`@option:${name}`);
 for(const kind of Object.values(LS.kinds))expect(lab).toContain(kind);
 // The reveal and its verdict (an asteroid, the right answer) read in the language with the right article.
 expect([...seen.own.get('answer revealed')!]).toContain(LS.verdict(true,LS.kinds.asteroid,'asteroid'));
 expect(Object.entries(LS.kinds).map(([k,name])=>LS.verdict(false,name,k))).toEqual(VERDICTS[L.tag]);
 });
});

test('qps: every text of the E08 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(420_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async(step,root)=>{for(const t of await texts(page,root))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

// ES9 review: the route reads the same for every target before the reveal. With a star target and an asteroid target, the
// lab's and the guide's texts (and the observatory's sky-view toolbar after Copy the coordinates) are equal once the object code
// and the coordinates line are removed (the spectrometer is not prepared, so its state is the same). Front PT6: in every language.
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const LS=e08Maps(L.tag).objectXLab,GS=e08Maps(L.tag).objectXGuide;
 test(title(L,'Spanish: before the reveal the Object X route reads the same for a star target and an asteroid target','<L> (<tag>): before the reveal the Object X route reads the same for a star target and an asteroid target'),async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 const body=await RECORDED_VIZIER;await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.goto(`/${langQuery(L.tag)}#object-x`);await expect(page.locator('html')).toHaveAttribute('lang',L.entry.htmlLang);
 await expect(id(page,'objectx-target').locator('option')).toHaveCount(18,{timeout:30_000});
 await lab(page).getByLabel(exact(LS.idLabel)).fill('42');
 // The coordinates line (LS.targetCoords) starts with the same word in Spanish and Portuguese.
 const coordinates=new RegExp(`^(?:— )?${LS.targetCoords('','').replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/ AR ,.*$/,'')} `);
 const read=async(code:string)=>{
  await go(page,'#object-x');await id(page,'objectx-target').selectOption(code);await expect(id(page,'objectx-coordinates')).toContainText(code);
  await page.waitForTimeout(300);
  const own=[...await texts(page,'[data-testid=objectx-lab]'),...await page.evaluate(()=>[document.querySelector('[data-testid=objectx-guide]')?.textContent??''])]
   .filter(t=>!/^(?:— )?Coordenadas \(J2000\): /.test(t)&&!coordinates.test(t));
  await mapButton(lab(page),L,LE.pointObservatory,m=>m.objectXLab.pointObservatory).click();await expect(page.locator('.sky-view').first()).toBeVisible();await page.waitForTimeout(300);
  const sky=await page.locator('.sky-toolbar').first().textContent();
  // The chosen code is replaced; the code list (both codes, as options) is the same for both.
  return [...own,sky??''].map(t=>/^@option:/.test(t)?t:t.replaceAll(code,'<code>'));
 };
 const star=await read(STAR_CODE),asteroid=await read(EROS_CODE);
 expect(star).toContain(LS.scope);expect(star.join('\n')).toContain(GS.steps.measure[1]);
 expect(asteroid.filter(t=>!star.includes(t)),'only for the asteroid').toEqual([]);expect(star.filter(t=>!asteroid.includes(t)),'only for the star').toEqual([]);expect(asteroid).toEqual(star);
 });
});

/** VIREO's captions on each step, in English (View original) or in this load's language. */
const captions=(page:Page,T:(original:string)=>string):Record<string,()=>Promise<void>>=>({
 // TCCDCam File › Information... and its window (CAMERA_INFORMATION_CAPTIONS, the List menu's Print... and Close).
 'camera Information window':async()=>{const d=id(page,'camera-live-information');await expect(d.locator('h2')).toHaveText(T('CCD Camera Parameters'));
  await expect(id(page,'camera-live-information-print')).toHaveText(T('Print...'));await expect(id(page,'camera-live-information-close')).toHaveText(T('Close'));
  await expect(id(page,'camera-live-information-lines')).toHaveAttribute('aria-label',T('CCD Camera Parameters'));},
 'first CCD image':async()=>{await expect(id(page,'camera-information-open')).toHaveText(T('Information...'));},
 'camera information':async()=>{await expect(id(page,'camera-information-close')).toHaveText(T('Close'));await expect(id(page,'camera-information-print')).toHaveText(T('Print...'));},
 // The spectrometer branch: VIREO's Spectral Range... item (ES3) and TSpectrometer's Help button (Help1Click).
 'spectrum ready':async()=>{await expect(id(page,'objectx-spectral-range-open')).toHaveText(T('Spectral Range...'));await expect(id(page,'objectx-spectrometer-help-open')).toHaveText(T('Help'));},
});

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const S=L.catalog as Record<string,string>,O=L.originals,maps=e08Maps(L.tag),vireoIn=vireoOf(L);
// "View original (English)" (decision 9): with the stored option on, every VIREO caption of the walk is VIREO's English, checked
// one by one, and no translated original appears anywhere; OpenVireo's own web text stays in the language.
 test(title(L,'View original (English) on: every VIREO caption in the E08 walk reads in English, the web text stays Spanish','View original (English) on: every VIREO caption in the E08 walk reads in English, the web text stays <L>'),async({page})=>{
 test.setTimeout(420_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 // Web text that happens to equal a VIREO caption's translation (the camera's Minutes, Seconds and Stop labels are the web's own:
 // TCCDCam has a Min/Sec switch and a Cancel button; the observatory's "Sound effects" card heading is web text).
 const mapStrings=(o:unknown):string[]=>typeof o==='string'?[o]:o&&typeof o==='object'?Object.values(o).flatMap(mapStrings):[];
 const web=new Set([...Object.values(S),...Object.keys(O),...mapStrings(maps.camera),...mapStrings(maps.sound),...mapStrings(maps.objectXLab),...mapStrings(maps.objectXGuide),...mapStrings(maps.objectXMeasure)].map(plain));
 const translated=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>t.replace(/&(&?)/g,(_,d:string)=>d));
 const left=new Map<string,string>();
 await walk(page,L,async(step,root)=>{
  for(const t of await texts(page,root))if(translated.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  if(step==='Object X lab')await expect(page.getByRole('heading',{level:1,name:exact(maps.objectXLab.title)})).toBeVisible();
  if(step==='camera Information window')await expect(id(page,'camera-live-information').locator('p').first()).toHaveText(maps.camera.informationNote);
  if(step==='camera information')await expect(page.locator('#camera-information-scope')).toHaveText(S['cameraInfo.authority']);
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 });

 test(title(L,'Spanish: every VIREO caption in the E08 walk is its Spanish original; English shows the originals unchanged','<L> (<tag>): every VIREO caption in the E08 walk is its <L> original; English shows the originals unchanged'),async({browser})=>{
 test.setTimeout(480_000);
 for(const lang of ['own','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,t=>lang==='en'?t.replace(/&(&?)/g,(_,d:string)=>d):vireoIn(t));
  await walk(page,lang==='en'?'en':L,async step=>{await checks[step]?.();});
  await page.close();
 }
 for(const t of ['CCD Camera Parameters','Information...','Print...','Close','Spectral Range...','Help'])expect(vireoIn(t),t).not.toBe(t);
 });
});

/** ES9_LAYOUT_LANG=en|qps|<tag> runs the layout walk in another language (for comparison). */
const layoutLang=(L:LanguageText):Lang=>{const v=process.env.ES9_LAYOUT_LANG;return !v?L:v==='en'||v==='qps'?v:textOf(v);};
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish E08 screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> E08 screens lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(480_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 await walk(page,layoutLang(L),async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  await page.screenshot({path:test.info().outputPath(`${L.tag==='es-419'?'es':L.tag}-e08-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});});
