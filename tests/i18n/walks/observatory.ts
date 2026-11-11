import type {LayoutOptions} from '../../fixtures/layoutProblems';
import {type Page} from '@playwright/test';
import {expect} from '../../fixtures/area-tripwire';
import {langQuery} from '../../fixtures/language';
import {type LanguageText} from '../languageText';
import {htmlLangOf,isPseudo,pseudoName,pseudoStart,type Pseudo} from '../../fixtures/pseudoNames';
import en from '../../../src/i18n/en.json' with {type:'json'};

// Front SC12 (docs/I18N.md): the walk of tests/i18n/observatory.spec.ts and the helpers it needs, moved here unchanged in behaviour so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales; the spec's header describes it.
export type Lang='en'|Pseudo|LanguageText;
/** A test title: Spanish keeps its ES2 title; another language names itself and its tag. */
export const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
/** Texts that are the same in both languages: VIREO's catalogue, telescope, site and camera names, units, formats and numbers.
 * Only these exact names and the catalogue designations below pass, so a VIREO caption such as "Exit Observatory" or
 * "Request 1.0 Meter Telescope" left in English fails (review 1, C4). Option texts of the visible selects are checked too. */
export const SAME=new Set(['General','No','Min','HH:MM:SS','J2000.0','B1950.0','E','S','N','mm','VIREO ·','NF, B, V, R, I','CLEA_IR1','Site CH350 003B Back-Illuminated',
 'Gettysburg College Observatory','Kitt Peak National Observatory','0.4m (16") Telescope','KPNO 0.9m (36") Telescope','KPNO 4m (158") Mayall Telescope','Dec:','B-V:','U-B:','Z:','GCVS','QSO','NVO','Project CLEA','Angstroms','?','↗','×','—','✳']);
export const IDENTIFIER=/^(?:[-+−\d\s.,:;°′″'"hmsHMS·×/()–#<>≤≥%]+|.*\b(?:NGC|PSR|HD|GSC|UM-I|CorBor|Peg|Coma|Boo)\b.*|M\d+ · .*|(?:RA|Dec|AR):\s+[-+\d].*|\d{4}-\d\d-\d\d .*UT|\d{1,2}\/\d{1,2}\/\d{4}, .*|\S+\.(?:HTL|DAT|LST|TXT|SSP|FITS))$/;
/** Front PT1: VIREO's and OpenVireo's texts that are the same words in another language (its identical.json, with a reason each):
 * Portuguese writes OK, Longitude, Latitude, Altitude, Zoom… as English does. Spanish adds none (ES2's SAME is unchanged). */
export const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set(['OK','Longitude:','Latitude:','Altitude:','Longitude','Latitude','Altitude','Zoom','Item','Cursor','Pulsar','Min:','Multi-Spec']),
 // Front FR1: French writes OK, Options, Longitude, Latitude, Altitude, Horizon, Minutes, Zoom, Multi-Spec… as English does
 // (src/i18n/fr/identical.json); a label with a colon differs («Longitude :», U+202F before the colon).
 fr:new Set(['OK','Gain (e⁻/ADU)','Pulsars','Options','Options...','Options…','Longitude','Latitude','Altitude','Horizon','Minutes','Minimum','Maximum','Confirmation','Zoom','Pulsar','Mode','Type','Style','Source','Site...','Deg','Sec','Min','CCD','IR','Multi-Spec','Classification','Portrait','Radio','Radio...'])};
/** SAME texts another language does translate: Portuguese writes the General tab «Geral» and the longitude letter E «L» (Leste);
 * French writes the General tab «Général» (its longitude letter E is Est, the same). */
export const NOT_SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set(['General','E']),fr:new Set(['General'])};
export const same=(text:string,L?:LanguageText)=>(L===undefined||!(NOT_SAME_IN[L.tag]?.has(text)??false))&&(SAME.has(text)||IDENTIFIER.test(text)||(L!==undefined&&(SAME_IN[L.tag]?.has(text)??false)));
export const id=(page:Page,testId:string)=>page.getByTestId(testId);

export const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
export async function open(page:Page,lang:Lang){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.goto(`/${langQuery(tagOf(lang))}#observatory`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
 await expect(page.locator('.sky-card')).toBeVisible({timeout:15_000});
}
/** Visible text nodes, accessible names and titles outside the header and outside native `lang="en"` views, with their place. */
export const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 // The exit reminder is VIREO's Reminder.obs help file, translated with the other help files in ES-HELP.
 const skipped=(el:Element)=>el.closest('.portal-header,[data-i18n-shell],script,style,[data-testid=site-tour],[data-testid^=exit-reminder]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const t=n.textContent?.trim(),el=n.parentElement;if(t&&el&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!el.closest('.portal-header,[data-i18n-shell]')&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 return out;
});
export const close=async(page:Page)=>{await page.keyboard.press('Escape');await page.waitForTimeout(150);};
/** The walk: the observatory, Slew, Site, File, Tools and Exit, the student options box, then in instructor mode the options
 * dialog with Reset, Edit Mode and Virtual Observatory, File › Field Information (star list, GCVS variables) and the QSO List. */
export const STEPS:readonly (readonly [string,(page:Page)=>Promise<void>])[]=[
 // Front HOME review 1: the welcome (#home) is walked first, then the observatory.
 ['welcome',async page=>{await page.evaluate(()=>{location.hash='home';});await expect(page.locator('#home-title')).toBeVisible();}],
 ['observatory',async page=>{await page.evaluate(()=>{location.hash='observatory';});await expect(page.locator('.sky-card')).toBeVisible();}],
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
export async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await open(page,lang);
 for(const [step,run] of STEPS){await run(page);await page.waitForTimeout(250);await each(step);}
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy checked every open dialog, menu and sub-menu with these controls (eachDialog); the fixture adds the
 * page's own controls and plot text. Run with the CI's DejaVu fonts (docs/I18N.md). */
export const LAYOUT:LayoutOptions={eachDialog:{dialogs:'dialog[open],[role=dialog],[role=alertdialog],[role=group].fi-menu-list,[role=group].fi-submenu,.ob-dialog',controls:'button,label,legend,h2,h3,dt,dd,small,p'}};

// Review 1: the Multi-Spec windows (Control, its boxes, the spectra list, a spectrum, its Information and its print) in Spanish,
// on the exact Hubble Coma – 2 pointing with Edit Mode, as tests/multispec.spec.ts does, with a 3 s exposure on the page clock.
export async function multiSpecWalk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 // By key, as the Spanish walk read es[key]; a language before its release falls back to the English it then shows.
 // Front SC12: a pseudo-locale's name is a matcher (exact does not apply to it).
 const T=(key:keyof typeof en):string|RegExp=>isPseudo(lang)?pseudoName(en[key]):typeof lang==='string'?en[key]:lang.catalog[key]??lang.text(en[key]);
 await page.clock.install();await open(page,lang);
 await page.locator('.sky-card .card-heading > button').click();
 if(!await page.getByRole('button',{name:T('runningClock.trackingOn'),exact:true}).isVisible())await page.getByText(T('runningClock.title'),{exact:true}).click();
 if(await page.getByRole('button',{name:T('runningClock.start'),exact:true}).isVisible())await page.getByRole('button',{name:T('runningClock.start'),exact:true}).click();
 await page.getByRole('button',{name:T('runningClock.trackingOn'),exact:true}).click();
 await page.getByText(T('sky.coordinates'),{exact:true}).click();
 await page.locator('#point-ra').fill('13.002305555555555');await page.locator('#point-dec').fill('27.9775');
 await page.getByRole('button',{name:T('sky.pointCoordinates'),exact:true}).click();await expect(id(page,'pointing-dec')).toHaveText(/^27\.97/,{timeout:30_000});
 await page.getByRole('button',{name:new RegExp(/^(Telescope|Telescopio|Telescópio) ·/.source+'|'+pseudoStart('Telescope ·').source)}).click();
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
