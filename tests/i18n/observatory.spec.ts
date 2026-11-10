import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,langQuery} from '../fixtures/language';
import {layoutProblems,type LayoutOptions} from '../fixtures/layoutProblems';
import en from '../../src/i18n/en.json' with {type:'json'};
import es from '../../src/i18n/es/es.json' with {type:'json'};
import {TRANSLATED,type LanguageText} from './languageText';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT1: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, maps and originals, never
// hard-coded text). The Spanish tests keep their titles and assertions; a language before its release (pt-BR) runs the same checks
// under its own titles in its `?lang=` preview, which beats the es-MX browser language. English and qps run once.
// Front ES2 (docs/I18N.md): the optical observatory, its VIREO menus and its File, Slew, Site and options dialogs in Spanish in an
// `es-*` browser (a `?lang=es-419` preview load before ES-REL). The same walk through the observatory runs in English, Spanish and the pseudo-locale:
// - Spanish: no visible text, accessible name or title reads the same as in English, except identifiers (SAME);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), except identifiers;
// - native views that mirror a written file (`lang="en"`, F2) are left out of both comparisons and keep a Spanish caption.
type Lang='en'|'qps'|LanguageText;
/** A test title: Spanish keeps its ES2 title; another language names itself and its preview. */
const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
/** Texts that are the same in both languages: VIREO's catalogue, telescope, site and camera names, units, formats and numbers.
 * Only these exact names and the catalogue designations below pass, so a VIREO caption such as "Exit Observatory" or
 * "Request 1.0 Meter Telescope" left in English fails (review 1, C4). Option texts of the visible selects are checked too. */
const SAME=new Set(['General','No','Min','HH:MM:SS','J2000.0','B1950.0','E','S','N','mm','VIREO ·','NF, B, V, R, I','CLEA_IR1','Site CH350 003B Back-Illuminated',
 'Gettysburg College Observatory','Kitt Peak National Observatory','0.4m (16") Telescope','KPNO 0.9m (36") Telescope','KPNO 4m (158") Mayall Telescope','Dec:','B-V:','U-B:','Z:','GCVS','QSO','NVO','Project CLEA','Angstroms','?','↗','×','—','✳']);
const IDENTIFIER=/^(?:[-+−\d\s.,:;°′″'"hmsHMS·×/()–#<>≤≥%]+|.*\b(?:NGC|PSR|HD|GSC|UM-I|CorBor|Peg|Coma|Boo)\b.*|M\d+ · .*|(?:RA|Dec|AR):\s+[-+\d].*|\d{4}-\d\d-\d\d .*UT|\d{1,2}\/\d{1,2}\/\d{4}, .*|\S+\.(?:HTL|DAT|LST|TXT|SSP|FITS))$/;
/** Front PT1: VIREO's and OpenVireo's texts that are the same words in another language (its identical.json, with a reason each):
 * Portuguese writes OK, Longitude, Latitude, Altitude, Zoom… as English does. Spanish adds none (ES2's SAME is unchanged). */
const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set(['OK','Longitude:','Latitude:','Altitude:','Longitude','Latitude','Altitude','Zoom','Item','Cursor','Pulsar','Min:','Multi-Spec'])};
/** SAME texts another language does translate: Portuguese writes the General tab «Geral» and the longitude letter E «L» (Leste). */
const NOT_SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set(['General','E'])};
const same=(text:string,L?:LanguageText)=>(L===undefined||!(NOT_SAME_IN[L.tag]?.has(text)??false))&&(SAME.has(text)||IDENTIFIER.test(text)||(L!==undefined&&(SAME_IN[L.tag]?.has(text)??false)));
const id=(page:Page,testId:string)=>page.getByTestId(testId);

const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
async function open(page:Page,lang:Lang){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.goto(`/${langQuery(tagOf(lang))}#observatory`);
 await expect(page.locator('html')).toHaveAttribute('lang',typeof lang==='string'?'en':lang.entry.htmlLang);
 await expect(page.locator('.sky-card')).toBeVisible({timeout:15_000});
}
/** Visible text nodes, accessible names and titles outside the header and outside native `lang="en"` views, with their place. */
const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 // The exit reminder is VIREO's Reminder.obs help file, translated with the other help files in ES-HELP.
 const skipped=(el:Element)=>el.closest('.portal-header,script,style,[data-testid=site-tour],[data-testid^=exit-reminder]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const t=n.textContent?.trim(),el=n.parentElement;if(t&&el&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!el.closest('.portal-header')&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 return out;
});
const close=async(page:Page)=>{await page.keyboard.press('Escape');await page.waitForTimeout(150);};
/** The walk: the observatory, Slew, Site, File, Tools and Exit, the student options box, then in instructor mode the options
 * dialog with Reset, Edit Mode and Virtual Observatory, File › Field Information (star list, GCVS variables) and the QSO List. */
const STEPS:readonly (readonly [string,(page:Page)=>Promise<void>])[]=[
 ['observatory',async()=>{}],
 ['dome open',async page=>{await page.locator('.sky-card .card-heading > button').click();await expect(id(page,'ob-set-coordinates')).toBeEnabled();}],
 ['Slew › Set Coordinates',async page=>{await id(page,'ob-set-coordinates').click();await expect(id(page,'ob-sky-coords')).toBeVisible();}],
 ['Slew › Hot List › View/Select (empty)',async page=>{await close(page);await id(page,'ob-view-select').click();await expect(id(page,'ob-hotlist-box')).toBeVisible();}],
 ['Slew › Add Current Item/Position',async page=>{await close(page);await id(page,'ob-add-current').click();await expect(id(page,'ob-entry-id')).toBeVisible({timeout:10_000});}],
 ['Set Date/Time',async page=>{await close(page);const d=page.locator('details:has([data-testid=ob-set-date])').first();if(await d.count())await d.evaluate(e=>{(e as HTMLDetailsElement).open=true;});await id(page,'ob-set-date').click();await expect(id(page,'ob-date-dialog')).toBeVisible();}],
 ['Site Parameters',async page=>{await close(page);await id(page,'ob-site-parameters').click();await expect(id(page,'ob-station-dialog')).toBeVisible();}],
 ['Site Information and its print',async page=>{await close(page);await id(page,'ob-site-information').click();await id(page,'ob-site-info-print').click();await expect(id(page,'ob-site-info-print-preview')).toBeVisible();}],
 ['File menu and Print Sky Image',async page=>{await close(page);await close(page);await id(page,'fi-file-menu').click();await id(page,'print-sky-menu').click();}],
 ['Tools menu',async page=>{await close(page);await id(page,'ob-tools-menu').click();await expect(id(page,'hst-menu')).toBeVisible();}],
 ['File › Exit Observatory',async page=>{await close(page);await id(page,'fi-file-menu').click();await id(page,'ob-exit').click();}],
 ['options closed to students',async page=>{await close(page);await page.locator('.telescope-motion').getByTestId('ob-options').click();await expect(id(page,'ob-user-options-title')).toBeVisible();}],
 ['Optical Simulation Options',async page=>{
  await close(page);const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  await id(page,'instructor-mode-open').click();await id(page,'instructor-mode-confirm-on').click();if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')==='true')await toggle.click();
  await page.locator('.telescope-motion').getByTestId('ob-options').click();await expect(id(page,'ob-options-dialog')).toBeVisible();}],
 ['options Reset box',async page=>{await id(page,'ob-options-reset').click();await expect(id(page,'ob-options-reset-box')).toBeVisible();}],
 ['Edit Mode and Virtual Observatory on',async page=>{await close(page);await id(page,'ob-options-edit-mode').check();const yes=page.locator('[data-testid$=-yes]:visible').first();if(await yes.count())await yes.click();
  await id(page,'ob-options-virtual-observatory').check();await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();}],
 ['File › Field Information › Star Data List',async page=>{await id(page,'fi-file-menu').click();await id(page,'fi-field-information').click();await id(page,'fi-star-list').click();await expect(id(page,'fi-slist-lines')).toBeVisible({timeout:15_000});
  await id(page,'fi-slist-list-menu').click();}],
 ['File › Field Information › Variable Stars › GCVS',async page=>{await close(page);await id(page,'fi-file-menu').click();await id(page,'fi-field-information').click();await id(page,'fi-variable-stars').click();await id(page,'fi-variables-gcvs').click();
  await expect(id(page,'fi-vlist')).toBeVisible({timeout:15_000});}],
 ['File › QSO List',async page=>{await close(page);await id(page,'fi-file-menu').click();await id(page,'qso-menu').click();await page.locator('[data-testid=qso-ok],[data-testid=qso-dialog-ok]').first().click();
  await expect(id(page,'qso-list')).toBeVisible({timeout:15_000});}],
];
async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await open(page,lang);
 for(const [step,run] of STEPS){await run(page);await page.waitForTimeout(250);await each(step);}
}

for(const L of TRANSLATED){
 const C=L.catalog as Record<string,string>,O=L.originals;

 test(title(L,'the observatory walk reads differently in Spanish from English: menus, dialogs, boxes and option names','the observatory walk reads differently in <L> (<tag> preview) from English: menus, dialogs, boxes and option names'),async({browser})=>{
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
}

test('qps: every text of the observatory walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(180_000);page.setViewportSize({width:1440,height:1000});
 const left:string[]=[];
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(t.replace(/^@[a-z-]+:/,'')))left.push(`${step}: ${t}`);});
 expect([...new Set(left)]).toEqual([]);
});

for(const L of TRANSLATED){
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
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy checked every open dialog, menu and sub-menu with these controls (eachDialog); the fixture adds the
 * page's own controls and plot text. Run with the CI's DejaVu fonts (docs/I18N.md). */
const LAYOUT:LayoutOptions={eachDialog:{dialogs:'dialog[open],[role=dialog],[role=alertdialog],[role=group].fi-menu-list,[role=group].fi-submenu,.ob-dialog',controls:'button,label,legend,h2,h3,dt,dd,small,p'}};

for(const L of TRANSLATED)for(const width of [320,1440])test(title(L,`at ${width} px the Spanish observatory dialogs, menus and the options dialog lay out without overflow or clipping`,`at ${width} px the <L> observatory dialogs, menus and the options dialog lay out without overflow or clipping`),async({page})=>{
 test.setTimeout(180_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems:string[]=[];
 await walk(page,L,async step=>{for(const p of await layoutProblems(page,LAYOUT))problems.push(`${step}: ${p}`);
  if(['Optical Simulation Options','File › Field Information › Star Data List','Site Parameters'].includes(step))await page.screenshot({path:test.info().outputPath(`${L.tag}-observatory-${width}-${step.replace(/\W+/g,'-')}.png`)});});
 expect([...new Set(problems)]).toEqual([]);
});

test('the walk in English is unchanged: the native caption is absent and the VIREO captions are the originals',async({page})=>{
 await open(page,'en');
 await page.locator('.sky-card .card-heading > button').click();
 await expect(page.locator('.sky-card .card-heading > button')).toHaveText(en['sky.close']);
 await id(page,'ob-set-coordinates').click();await expect(id(page,'ob-sky-coords').getByRole('heading')).toHaveText('Enter Sky Coordinates for Slew');
 await expect(page.locator('.native-mirror-caption')).toHaveCount(0);
});

// Review 1: the Multi-Spec windows (Control, its boxes, the spectra list, a spectrum, its Information and its print) in Spanish,
// on the exact Hubble Coma – 2 pointing with Edit Mode, as tests/multispec.spec.ts does, with a 3 s exposure on the page clock.
async function multiSpecWalk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 // By key, as the Spanish walk read es[key]; a language before its release falls back to the English it then shows.
 const T=(key:keyof typeof en)=>typeof lang==='string'?en[key]:lang.catalog[key]??lang.text(en[key]);
 await page.clock.install();await open(page,lang);
 await page.locator('.sky-card .card-heading > button').click();
 if(!await page.getByRole('button',{name:T('runningClock.trackingOn'),exact:true}).isVisible())await page.getByText(T('runningClock.title'),{exact:true}).click();
 if(await page.getByRole('button',{name:T('runningClock.start'),exact:true}).isVisible())await page.getByRole('button',{name:T('runningClock.start'),exact:true}).click();
 await page.getByRole('button',{name:T('runningClock.trackingOn'),exact:true}).click();
 await page.getByText(T('sky.coordinates'),{exact:true}).click();
 await page.locator('#point-ra').fill('13.002305555555555');await page.locator('#point-dec').fill('27.9775');
 await page.getByRole('button',{name:T('sky.pointCoordinates'),exact:true}).click();await expect(id(page,'pointing-dec')).toHaveText(/^27\.97/,{timeout:30_000});
 await page.getByRole('button',{name:/^(Telescope|Telescopio|Telescópio) ·/}).click();
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible())await toggle.click();
 await id(page,'instructor-mode-open').click();await id(page,'instructor-mode-confirm-on').click();if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')==='true')await toggle.click();
 await page.locator('.telescope-motion').getByTestId('ob-options').click();await id(page,'ob-options-edit-mode').check();await id(page,'ob-options-ok').click();
 await expect(id(page,'em-caption')).toContainText('hubble-engine-coma',{timeout:30_000});
 const card=id(page,'ms-card');await card.scrollIntoViewIfNeeded();await card.getByTestId('ms-access').click();
 await expect(id(page,'ms-box')).toBeVisible();await each('Multi-Spec select hint box');await id(page,'ms-box').getByRole('button').first().click();
 const field=id(page,'ms-field');await expect(field).toBeVisible({timeout:60_000});await expect(field).toHaveAttribute('data-armed','true');
 const at=async(x:number,y:number,button:'left'|'right'='left')=>{const b=(await field.boundingBox())!;await field.click({button,position:{x:(x+.5)*b.width/312,y:(y+.5)*b.height/312}});};
 for(const [x,y] of [[156,156],[145,173],[300,4]] as const)await at(x,y);
 await each('Multi-Spec Control with selections');
 await at(300,4,'right');await expect(id(page,'ms-box')).toBeVisible();await each('Multi-Spec remove question');await id(page,'ms-box').getByRole('button').first().click();
 await id(page,'ms-minutes').fill('0.05');await id(page,'ms-init').click();await expect(id(page,'ms-go')).toBeEnabled();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await id(page,'ms-go').click();await page.clock.runFor(4000);
 await expect(id(page,'ms-clock')).toHaveAttribute('data-colour','green');await page.clock.resume();
 await expect(id(page,'ms-list')).toBeVisible();await each('Multi-Spec spectra list');
 await id(page,'ms-item-0').click();await id(page,'ms-show').click();await expect(id(page,'ms-spectrum').getByTestId('ms-plot')).toBeVisible({timeout:60_000});
 await each('Multi-Spec spectrum display');
 await id(page,'ms-spectrum').getByTestId('ms-information').click();await expect(id(page,'ms-info')).toBeVisible();await each('Multi-Spec Spectrum Information');
 await id(page,'ms-info').getByRole('button').first().click();
 await id(page,'ms-spectrum').getByTestId('ms-print').click();await expect(id(page,'ms-print-preview')).toBeVisible();await each('Multi-Spec print preview');
 await id(page,'ms-print-close').click();
}
for(const L of TRANSLATED)test(title(L,'Multi-Spec in Spanish: Control, boxes, spectra list, spectrum, Information and print read differently from English','Multi-Spec in <L> (<tag> preview): Control, boxes, spectra list, spectrum, Information and print read differently from English'),async({browser})=>{
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
});
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
for(const L of TRANSLATED)for(const width of [320,1440])test(title(L,`at ${width} px the Spanish Multi-Spec windows lay out without overflow or clipping`,`at ${width} px the <L> Multi-Spec windows lay out without overflow or clipping`),async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems:string[]=[],KNOWN=knownFor(L);
 await multiSpecWalk(page,L,async step=>{for(const p of await layoutProblems(page,LAYOUT))problems.push(`${step}: ${p}`);
  if(/list|Information/.test(step))await page.screenshot({path:test.info().outputPath(`${L.tag}-multispec-${width}-${step.replace(/\W+/g,'-')}.png`)});});
 const found=[...new Set(problems)];
 expect(found.filter(p=>!KNOWN.some(k=>k.test(p)))).toEqual([]);
 expect(KNOWN.filter(k=>!found.some(p=>k.test(p))).map(String),'a known problem no longer appears: remove it from MULTISPEC_KNOWN').toEqual([]);
});
