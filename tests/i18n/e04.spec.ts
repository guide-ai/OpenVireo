import {type Page,type Locator} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,langQuery} from '../fixtures/language';
import {layoutProblems,type LayoutOptions} from '../fixtures/layoutProblems';
import en from '../../src/i18n/en.json' with {type:'json'};
import {PLEIADES_ADMITTED_ROWS} from '../../src/core/pleiadesHotList';
import {TRANSLATED,e04e05Maps,type LanguageText} from './languageText';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT4: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, originals and maps, never
// hard-coded text). The Spanish tests keep their titles and assertions; a language before its release (pt-BR) runs the same checks
// under its own titles in its `?lang=` preview, which beats the es-MX browser language. English and qps run once.

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
type Lang='en'|'qps'|LanguageText;
/** A test title: Spanish keeps its ES6 title; another language names itself and its preview. */
const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
const E=en as Record<string,string>;
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
const SAME=new Set<string>([
 // Formats, names, symbols and units.
 'VIREO','OpenVireo','SHA-256','JSON','HTL','PLEIADES.HTL','GSC','UNKNOWN','B−V','m−M','pc','mag','JD','UT','#','?','↗','×','—','✳','·','px','h','°','arcmin',
 // Front PT4: Spanish's identical No moved to SAME_IN (below).
 // The telescope names of the bundled optical profiles (identifiers, as on the observatory).
 '0.4m (16") Telescope','KPNO 0.9m (36") Telescope','KPNO 4m (158") Mayall Telescope',
 // The badge of the fixed bench (band letters and a telescope name; identical.json ph.fixed).
 'U / B / V · 0.4m (16") Telescope','U / B / V · KPNO 4m (158") Mayall Telescope',
 // The observatory's eyebrow head (as on the observatory, ES2) and the note this walk types into the notebook.
 'VIREO ·','first night',
]);
/** The observatory's target picker options (catalogue galaxies and the Hubble.HTL targets, as in observatory.spec.ts). */
const PICKER=/^(?:M\d+ · )?NGC \d+[A-Z]?$|^(?:\d{5}|NGC \d+) · (?:UM-I|Boo|CorBor|Peg|Coma) - \d$/;
/** A PLEIADES.HTL star label or a compact GSC name (01799-01442, N2230-01627) or a catalogue record id (N2230.DAT@144496). */
const STAR=/^(?:\d{5}-\d{5}|N\d{4}-\d{5}|[NS]\d{4}\.DAT@\d+)$/;
/** A hash (with or without its SHA-256 label); the guide's source file line (identical.json pleiadesLab.sourceFile); a printed
 * spectral label of the standards table, kept as printed (B5, A0, and BO, AO… with the letter O of the 2008 manual). */
const RECORDED=/^(?:SHA-256 )?[0-9a-f]{64}$|^PLEIADES\.HTL · \d+ bytes · SHA-256 [0-9a-f]{64}$|^[OBAFGKM][\dO](?:\.\d)?(?:\s?V)?$/;
/** A number with its unit or symbol, and nothing else that could be a word. */
const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×/()[\]–%=→≈hms]*\d[-+−±\d\s.,:;°′″'"·×/()[\]–%=→≈hms]*(?:\s*(?:Å|km\/s|Mpc|ms|mag|h|s|m|JD|UT|pc|px|°|arcmin))*\s*$/;
/** Front PT4: texts of the walk that are the same words in one language (its identical.json, with a reason each): Spanish's No
 * (VIREO's No button, ES6's SAME), Portuguese's OK (VIREO's OK button, as Windows pt-BR writes it). */
const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'es-419':new Set(['No']),'pt-BR':new Set(['OK'])};
const same=(text:string,L?:LanguageText)=>(L!==undefined&&(SAME_IN[L.tag]?.has(text)??false))||SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text)||STAR.test(text)||PICKER.test(text);
const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const MARK='[⟦⟧·\\s]*';
const pseudo=(text:string)=>new RegExp(`^${MARK}${[...text].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join(MARK)}${MARK}$`);
const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** A catalog key's text in this language (every E04 key: the walk fails on a missing one). */
const textIn=(L:LanguageText,key:string)=>{const C=L.catalog as Record<string,string>;if(!Object.hasOwn(C,key))throw new Error(`No ${L.entry.englishName} for ${key}`);return C[key];};
/** The accessible name of a catalog key in this language. */
const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(lang==='qps')return pseudo(fill(E[key],params));return exact(fill(textIn(lang,key),params));};
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
const vireoOf=(L:LanguageText)=>(text:string,context?:string)=>{const O=L.originals,key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();if(context!==undefined&&Object.hasOwn(O,`${context}|${key}`))return O[`${context}|${key}`];
 return Object.hasOwn(O,key)?/^\s*/.exec(text)![0]+O[key]+/\s*$/.exec(text)![0]:text;};
const button=(scope:Page|Locator,lang:Lang,key:string)=>scope.getByRole('button',{name:N(lang,key)});

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header, outside native `lang="en"`
 * views and outside the cluster model-fit section (ES7). */
const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>el.closest('.portal-header,[data-i18n-shell],script,style,[data-testid=site-tour],.native-cluster')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const select of document.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 for(const t of document.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 return out;
});
const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
const tool=async(page:Page,lang:Lang,key:string)=>{
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.portal-header nav').getByRole('button',{name:N(lang,key)}).click();
};
const main=(page:Page)=>page.locator('.photometer-main');
/** One completed integration on the paused clock (1 s × 3 integrations). */
async function integrate(page:Page,lang:Lang){await button(main(page),lang,'ph.start').click();await page.clock.runFor(3100);await expect(id(page,'photo-phase')).toHaveText(N(lang,'ph.complete'));}
/** Add notebook entry for the last reading, typing the displayed magnitude to three decimals. */
async function record(page:Page,lang:Lang){const shown=(await id(page,'photo-magnitude').textContent())!;await button(main(page),lang,'ph.record').click();
 await page.locator('#photo-manual').fill(Number(shown).toFixed(3));await page.locator('#photo-note').fill('first night');await page.locator('dialog[aria-labelledby=photo-entry-title] button[type=submit]').click();
 await expect(page.locator('dialog[aria-labelledby=photo-entry-title]')).toBeHidden();}
async function color(page:Page,lang:Lang){for(const band of ['b','v']){const select=page.locator(`#photo-${band}-reading`);await select.selectOption((await select.locator('option').last().getAttribute('value'))!);}
 await button(main(page),lang,'ph.calculateColor').click();await expect(id(page,'photo-manual-bv')).toBeVisible();}
const SKY_FIELD={ra:'11.74525',dec:'55.38861111'},STAR_FIELD={ra:'11.74525',dec:'55.37861111'};
async function benchPoint(page:Page,p:{ra:string;dec:string}){
 await page.locator('#photo-point-ra').fill(p.ra);await page.locator('#photo-point-dec').fill(p.dec);await id(page,'photo-point-telescope').click();
 await expect(id(page,'photo-telescope-dec')).toHaveText(p.dec.replace(/0+$/,''),{timeout:20_000});
}
/** The field at the telescope pointing is read: a GSC target, no read in progress, and the bench field equals the pointing. */
async function tiledReady(page:Page){await expect(page.locator('#photo-target')).toHaveValue(/^gsc:/,{timeout:60_000});await expect(id(page,'photo-tiled-status')).toHaveCount(0,{timeout:60_000});
 await expect(id(page,'photo-telescope-access')).toHaveAttribute('data-access','ready',{timeout:60_000});}
async function tiledIntegrate(page:Page,lang:Lang){await button(main(page),lang,'ph.start').click();await expect(button(main(page),lang,'ph.start')).toBeEnabled({timeout:30_000});}

/** The walk through E04. Each step leaves the screen in the state its texts are read in. */
const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
 // The Mayall profile selected in the Observatory (before the exercise list, which restricts the telescopes): the domain explanation.
 ['Mayall domain explanation',async(page,lang)=>{await page.locator('#optical-profile').selectOption('2');await button(page,lang,'optical.apply').click();
  await tool(page,lang,'ph.nav');await expect(page.locator('.photometer-domain')).toBeVisible();await openAll(main(page));}],
 ['exercise list and pointing card',async(page,lang)=>{await tool(page,lang,'sky.observatory');await page.locator('#optical-profile').selectOption('0');await button(page,lang,'optical.apply').click();
  const dome=page.getByRole('button',{name:new RegExp(N(lang,'sky.open').source.replace(/\$$/,'').concat(' ↗$'))});if(await dome.isVisible())await dome.click();
  await page.getByRole('heading',{name:N(lang,'htl.title')}).click();await button(page,lang,'htl.exerciseLoad').click();await expect(page.locator('#htl-rows option')).toHaveCount(24);
  await page.locator('#htl-rows').selectOption('0');await button(page,lang,'htl.point').click();await expect(id(page,'pleiades-point-card')).toHaveAttribute('data-admitted','true',{timeout:20_000});}],
 ['Pleiades guide',async(page,lang)=>{await tool(page,lang,'pleiadesLab.nav');const guide=id(page,'pleiades-lab-dialog');await expect(guide).toBeVisible();await openAll(guide);}],
 ['photometer',async(page,lang)=>{await id(page,'pleiades-lab-close').click();await button(id(page,'pleiades-point-card'),lang,'pleiadesPoint.open').click();
  await expect(page.getByRole('heading',{name:N(lang,'ph.title')})).toBeVisible();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await openAll(main(page));}],
 ['activated',async(page,lang)=>{await button(main(page),lang,'ph.activate').click();await expect(id(page,'photo-phase')).toHaveText(N(lang,'ph.ready'));
  await page.locator('#photo-seconds').selectOption('1');await page.locator('#photo-repeats').selectOption('3');await openAll(main(page));}],
 ['sky V',async(page,lang)=>{await page.locator('#photo-pointing').selectOption('sky');await page.locator('#photo-filter').selectOption('V');await integrate(page,lang);}],
 ['series running',async(page,lang)=>{await page.locator('#photo-filter').selectOption('B');await button(main(page),lang,'ph.start').click();await page.clock.runFor(1500);await expect(id(page,'photo-phase')).toHaveText(N(lang,'ph.running'));}],
 ['sky B',async(page,lang)=>{await page.clock.runFor(1600);await expect(id(page,'photo-phase')).toHaveText(N(lang,'ph.complete'));}],
 ['star V',async(page,lang)=>{await page.locator('#photo-pointing').selectOption('object');await page.locator('#photo-filter').selectOption('V');await integrate(page,lang);}],
 ['notebook entry',async(page,lang)=>{await button(main(page),lang,'ph.record').click();await expect(page.locator('dialog[aria-labelledby=photo-entry-title]')).toBeVisible();}],
 ['Observational Data',async(page,lang)=>{await page.locator('dialog[aria-labelledby=photo-entry-title]').getByRole('button').first().click();await record(page,lang);
  await id(page,'photo-record-review').click();await expect(id(page,'photo-obs-data')).toBeVisible();}],
 ['Data Saved',async page=>{await id(page,'photo-obs-data-sp').fill('B8V');await id(page,'photo-obs-data-ok').click();await expect(id(page,'photo-data-saved')).toBeVisible();}],
 ['Telescope has Moved!',async(page,lang)=>{await id(page,'photo-data-saved-ok').click();await page.locator('#photo-filter').selectOption('B');await integrate(page,lang);
  await button(main(page),lang,'ph.start').click();await expect(id(page,'photo-moved')).toBeVisible();}],
 ['Data Not Saved!',async page=>{await id(page,'photo-moved-no').click();await expect(id(page,'photo-not-saved')).toBeVisible();}],
 ['B−V of the first star',async(page,lang)=>{await id(page,'photo-not-saved-ok').click();await page.clock.runFor(3100);await expect(id(page,'photo-phase')).toHaveText(N(lang,'ph.complete'));
  await record(page,lang);await color(page,lang);}],
 ['B−V of the second star',async(page,lang)=>{await page.locator('#photo-target').selectOption(PLEIADES_ADMITTED_ROWS[1].catalogId);
  for(const band of ['V','B']){await page.locator('#photo-filter').selectOption(band);await integrate(page,lang);await record(page,lang);}await color(page,lang);}],
 ['invalid shift',async(page,lang)=>{await openAll(page.locator('.pleiades-analysis').first());await page.locator('#pleiades-modulus').fill('abc');await expect(page.locator('.pleiades-analysis [role=alert]').first()).toHaveText(N(lang,'pa.invalid'));}],
 ['shift preview',async page=>{await page.locator('#pleiades-modulus').fill('5.5');await expect(id(page,'pleiades-overlay')).toBeVisible();}],
 ['confirmed fit',async(page,lang)=>{await button(page.locator('.pleiades-analysis').first(),lang,'pa.confirm').click();await expect(id(page,'pleiades-confirmed-modulus')).toHaveText('5.5');await openAll(main(page));}],
 ['aperture dialog',async(page,lang)=>{await button(main(page),lang,'ph.apertureChange').click();const d=page.locator('dialog[aria-labelledby=photo-aperture-title]');await expect(d).toBeVisible();
  await page.locator('#photo-aperture-size').fill('200');await expect(id(page,'photo-aperture-draft')).toHaveText(N(lang,'ph.apertureInvalid',{min:'5',max:'150'}));}],
 ['free pointing input error',async(page,lang)=>{await button(page.locator('dialog[aria-labelledby=photo-aperture-title]'),lang,'ph.apertureCancel').click();
  await page.locator('#photo-point-ra').fill('abc');await id(page,'photo-point-telescope').click();await expect(main(page).locator('.observatory-feedback [role=alert]')).toHaveText(N(lang,'ph.tiledPointInvalid'));}],
 ['photometer session saved',async(page,lang)=>{const d=page.waitForEvent('download');await button(main(page),lang,'ph.save').click();await d;await expect(main(page).locator('.observatory-feedback [role=status]')).toHaveText(N(lang,'ph.saved'));}],
 // A free pointing (G3b), read from the compact GSC tiles: the timers run from here on.
 // Save released the context, so Use the telescope pointing activates the photometer where the telescope now points.
 ['free pointing field',async(page,lang)=>{await page.clock.resume();
  await benchPoint(page,SKY_FIELD);await button(main(page),lang,'ph.tiledUse').click();await tiledReady(page);
  await page.locator('#photo-seconds').selectOption('0.1');await page.locator('#photo-repeats').selectOption('1');await page.locator('#photo-pointing').selectOption('sky');await tiledIntegrate(page,lang);
  await benchPoint(page,STAR_FIELD);await tiledReady(page);await openAll(main(page));}],
 ['Reading Sky!',async(page,lang)=>{await button(main(page),lang,'ph.start').click();await expect(id(page,'photo-sky-replace')).toBeVisible();}],
 ['sky reading kept',async(page,lang)=>{await id(page,'photo-sky-replace-no').click();await expect(main(page).locator('.observatory-feedback [role=status]')).toHaveText(N(lang,'ph.skyReplaceNo'));}],
];
async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#observatory`);
 await expect(page.locator('html')).toHaveAttribute('lang',typeof lang==='string'?'en':lang.entry.htmlLang);
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 for(const [step,run] of STEPS){await run(page,lang);await page.waitForTimeout(200);await each(step);}
}

for(const L of TRANSLATED){
 const C=L.catalog as Record<string,string>;
 test(title(L,'E04 reads differently in Spanish from English: list, guide, photometer, VIREO boxes, analysis, free pointing and Mayall domain','E04 reads differently in <L> (<tag> preview) from English: list, guide, photometer, VIREO boxes, analysis, free pointing and Mayall domain'),async({browser})=>{
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
}

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
for(const L of TRANSLATED){
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

 test(title(L,'Spanish: every VIREO caption in the E04 walk is its Spanish original; English shows the originals unchanged','<L> (<tag> preview): every VIREO caption in the E04 walk is its <L> original; English shows the originals unchanged'),async({browser})=>{
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
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy skipped the native cluster mirror and the scrolling Pleiades plots, exempted the photometer table from
 * the crossing check and reported a crossing inside a sideways scroller too. Run with the CI's DejaVu fonts (docs/I18N.md). */
const LAYOUT:LayoutOptions={skip:'.portal-header,[lang=en]:not(html),.native-cluster',crossingExempt:'.photometer-table',svgSkip:'.native-cluster,.pleiades-chart-scroll,.photometer-field',crossingInScrollers:true};
for(const L of TRANSLATED)for(const width of [320,1440])test(title(L,`at ${width} px the Spanish E04 screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> E04 screens lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(420_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 // ES6_LAYOUT_LANG=en|qps walks that reference instead (a debugging aid; the language's own test title is kept).
 await walk(page,(process.env.ES6_LAYOUT_LANG as 'en'|'qps'|undefined)??L,async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  await page.screenshot({path:test.info().outputPath(`${L.tag}-e04-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});
