import type {LayoutOptions} from '../../fixtures/layoutProblems';
import {type Page,type Locator} from '@playwright/test';
import {expect} from '../../fixtures/area-tripwire';
import {langQuery} from '../../fixtures/language';
import en from '../../../src/i18n/en.json' with {type:'json'};
import {PLEIADES_ADMITTED_ROWS} from '../../../src/core/pleiadesHotList';
import {type LanguageText} from '../languageText';
import {isPseudo,pseudoName,htmlLangOf,type Pseudo} from '../../fixtures/pseudoNames';

// Front SC12 (docs/I18N.md): the walk of tests/i18n/e04.spec.ts and the helpers it needs, moved here unchanged in behaviour so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales; the spec's header describes it.
export type Lang='en'|Pseudo|LanguageText;
/** A test title: Spanish keeps its ES6 title; another language names itself and its tag. */
export const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
export const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
export const E=en as Record<string,string>;
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
export const SAME=new Set<string>([
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
export const PICKER=/^(?:M\d+ · )?NGC \d+[A-Z]?$|^(?:\d{5}|NGC \d+) · (?:UM-I|Boo|CorBor|Peg|Coma) - \d$/;
/** A PLEIADES.HTL star label or a compact GSC name (01799-01442, N2230-01627) or a catalogue record id (N2230.DAT@144496). */
export const STAR=/^(?:\d{5}-\d{5}|N\d{4}-\d{5}|[NS]\d{4}\.DAT@\d+)$/;
/** A hash (with or without its SHA-256 label); the guide's source file line (identical.json pleiadesLab.sourceFile); a printed
 * spectral label of the standards table, kept as printed (B5, A0, and BO, AO… with the letter O of the 2008 manual). */
export const RECORDED=/^(?:SHA-256 )?[0-9a-f]{64}$|^PLEIADES\.HTL · \d+ bytes · SHA-256 [0-9a-f]{64}$|^[OBAFGKM][\dO](?:\.\d)?(?:\s?V)?$/;
/** A number with its unit or symbol, and nothing else that could be a word. */
export const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×/()[\]–%=→≈hms]*\d[-+−±\d\s.,:;°′″'"·×/()[\]–%=→≈hms]*(?:\s*(?:Å|km\/s|Mpc|ms|mag|h|s|m|JD|UT|pc|px|°|arcmin))*\s*$/;
/** Front PT4: texts of the walk that are the same words in one language (its identical.json, with a reason each): Spanish's No
 * (VIREO's No button, ES6's SAME), Portuguese's OK (VIREO's OK button, as Windows pt-BR writes it). French's (Front FR4): the
 * observatory's Minutes and Gain (e⁻/ADU), OK, and the confirmed fit's «Distance (pc)». */
export const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'es-419':new Set(['No']),'pt-BR':new Set(['OK']),fr:new Set(['Minutes','Gain (e⁻/ADU)','OK','Distance (pc)'])};
export const same=(text:string,L?:LanguageText)=>(L!==undefined&&(SAME_IN[L.tag]?.has(text)??false))||SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text)||STAR.test(text)||PICKER.test(text);
export const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
/** Front SC12: an English text's name in any pseudo-locale (qps and the script variants; tests/fixtures/pseudoNames.ts). */
export const pseudo=pseudoName;
export const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
export const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** A catalog key's text in this language (every E04 key: the walk fails on a missing one). */
export const textIn=(L:LanguageText,key:string)=>{const C=L.catalog as Record<string,string>;if(!Object.hasOwn(C,key))throw new Error(`No ${L.entry.englishName} for ${key}`);return C[key];};
/** The accessible name of a catalog key in this language. */
export const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(isPseudo(lang))return pseudo(E[key],params);return exact(fill(textIn(lang,key),params));};
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
export const vireoOf=(L:LanguageText)=>(text:string,context?:string)=>{const O=L.originals,key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();if(context!==undefined&&Object.hasOwn(O,`${context}|${key}`))return O[`${context}|${key}`];
 return Object.hasOwn(O,key)?/^\s*/.exec(text)![0]+O[key]+/\s*$/.exec(text)![0]:text;};
export const button=(scope:Page|Locator,lang:Lang,key:string)=>scope.getByRole('button',{name:N(lang,key)});

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header, outside native `lang="en"`
 * views and outside the cluster model-fit section (ES7). */
export const texts=(page:Page)=>page.evaluate(()=>{
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
export const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
export const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
export const tool=async(page:Page,lang:Lang,key:string)=>{
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.portal-header nav').getByRole('button',{name:N(lang,key)}).click();
};
export const main=(page:Page)=>page.locator('.photometer-main');
/** One completed integration on the paused clock (1 s × 3 integrations). */
export async function integrate(page:Page,lang:Lang){await button(main(page),lang,'ph.start').click();await page.clock.runFor(3100);await expect(id(page,'photo-phase')).toHaveText(N(lang,'ph.complete'));}
/** Add notebook entry for the last reading, typing the displayed magnitude to three decimals. */
export async function record(page:Page,lang:Lang){const shown=(await id(page,'photo-magnitude').textContent())!;await button(main(page),lang,'ph.record').click();
 await page.locator('#photo-manual').fill(Number(shown).toFixed(3));await page.locator('#photo-note').fill('first night');await page.locator('dialog[aria-labelledby=photo-entry-title] button[type=submit]').click();
 await expect(page.locator('dialog[aria-labelledby=photo-entry-title]')).toBeHidden();}
export async function color(page:Page,lang:Lang){for(const band of ['b','v']){const select=page.locator(`#photo-${band}-reading`);await select.selectOption((await select.locator('option').last().getAttribute('value'))!);}
 await button(main(page),lang,'ph.calculateColor').click();await expect(id(page,'photo-manual-bv')).toBeVisible();}
export const SKY_FIELD={ra:'11.74525',dec:'55.38861111'},STAR_FIELD={ra:'11.74525',dec:'55.37861111'};
export async function benchPoint(page:Page,p:{ra:string;dec:string}){
 await page.locator('#photo-point-ra').fill(p.ra);await page.locator('#photo-point-dec').fill(p.dec);await id(page,'photo-point-telescope').click();
 await expect(id(page,'photo-telescope-dec')).toHaveText(p.dec.replace(/0+$/,''),{timeout:20_000});
}
/** The field at the telescope pointing is read: a GSC target, no read in progress, and the bench field equals the pointing. */
export async function tiledReady(page:Page){await expect(page.locator('#photo-target')).toHaveValue(/^gsc:/,{timeout:60_000});await expect(id(page,'photo-tiled-status')).toHaveCount(0,{timeout:60_000});
 await expect(id(page,'photo-telescope-access')).toHaveAttribute('data-access','ready',{timeout:60_000});}
export async function tiledIntegrate(page:Page,lang:Lang){await button(main(page),lang,'ph.start').click();await expect(button(main(page),lang,'ph.start')).toBeEnabled({timeout:30_000});}

/** The walk through E04. Each step leaves the screen in the state its texts are read in. */
export const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
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
export async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#observatory`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 for(const [step,run] of STEPS){await run(page,lang);await page.waitForTimeout(200);await each(step);}
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy skipped the native cluster mirror and the scrolling Pleiades plots, exempted the photometer table from
 * the crossing check and reported a crossing inside a sideways scroller too. Run with the CI's DejaVu fonts (docs/I18N.md). */
export const LAYOUT:LayoutOptions={skip:'.portal-header,[lang=en]:not(html),.native-cluster',crossingExempt:'.photometer-table',svgSkip:'.native-cluster,.pleiades-chart-scroll,.photometer-field',crossingInScrollers:true};
