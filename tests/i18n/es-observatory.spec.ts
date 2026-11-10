import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import originals from '../../src/i18n/es/originals.json' with {type:'json'};
import {APP_SHELL_ES} from '../../src/i18n/es/maps/appShell';
import {CAMERA_ES} from '../../src/i18n/es/maps/camera';
import {FIELD_INFO_ES} from '../../src/i18n/es/maps/fieldInfo';
import {FIELD_READ_DETAILS_ES} from '../../src/i18n/es/maps/fieldReadDetails';
import {HELP_MENU_ES} from '../../src/i18n/es/maps/helpMenu';
import {LANGUAGE_CHOICE_ES} from '../../src/i18n/es/maps/languageChoice';
import {NAKED_EYE_ES} from '../../src/i18n/es/maps/nakedEye';
import {OBJECT_X_LAB_ES} from '../../src/i18n/es/maps/objectXLab';
import {OBSERVATION_METADATA_ES} from '../../src/i18n/es/maps/observationMetadata';
import {OBSERVATORY_ES} from '../../src/i18n/es/maps/observatory';
import {POLISH_ES} from '../../src/i18n/es/maps/polish';
import {PROJECT_LINKS_ES} from '../../src/i18n/es/maps/projectLinks';
import {QSO_LIST_ES} from '../../src/i18n/es/maps/qsoList';
import {SOUND_ES} from '../../src/i18n/es/maps/sound';
import {TOUR_ES} from '../../src/i18n/es/maps/tour';
import {VARIABLE_STARS_ES} from '../../src/i18n/es/maps/variableStars';

// Front ES2 (docs/I18N.md): the optical observatory, its VIREO menus and its File, Slew, Site and options dialogs in Spanish on a
// `?lang=es-419` preview load. The same walk through the observatory runs in English, Spanish and the pseudo-locale:
// - Spanish: no visible text, accessible name or title reads the same as in English, except identifiers (SAME);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), except identifiers;
// - native views that mirror a written file (`lang="en"`, F2) are left out of both comparisons and keep a Spanish caption.
type Lang='en'|'es-419'|'qps';
const O=originals as Record<string,string>;
/** Texts that are the same in both languages: VIREO's catalogue, telescope, site and camera names, units, formats and numbers.
 * Only these exact names and the catalogue designations below pass, so a VIREO caption such as "Exit Observatory" or
 * "Request 1.0 Meter Telescope" left in English fails (review 1, C4). Option texts of the visible selects are checked too. */
const SAME=new Set(['General','No','Min','HH:MM:SS','J2000.0','B1950.0','E','S','N','mm','VIREO ·','NF, B, V, R, I','CLEA_IR1','Site CH350 003B Back-Illuminated',
 'Gettysburg College Observatory','Kitt Peak National Observatory','0.4m (16") Telescope','KPNO 0.9m (36") Telescope','KPNO 4m (158") Mayall Telescope','Dec:','B-V:','U-B:','Z:','GCVS','QSO','NVO','Project CLEA','Angstroms','?','↗','×','—','✳']);
const IDENTIFIER=/^(?:[-+−\d\s.,:;°′″'"hmsHMS·×/()–#<>≤≥%]+|.*\b(?:NGC|PSR|HD|GSC|UM-I|CorBor|Peg|Coma|Boo)\b.*|M\d+ · .*|(?:RA|Dec|AR):\s+[-+\d].*|\d{4}-\d\d-\d\d .*UT|\d{1,2}\/\d{1,2}\/\d{4}, .*|\S+\.(?:HTL|DAT|LST|TXT|SSP|FITS))$/;
const same=(text:string)=>SAME.has(text)||IDENTIFIER.test(text);
const id=(page:Page,testId:string)=>page.getByTestId(testId);

async function open(page:Page,lang:Lang){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.goto(`/?lang=${lang}#observatory`);
 await expect(page.locator('html')).toHaveAttribute('lang',lang==='es-419'?'es-419':'en');
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

test('the observatory walk reads differently in Spanish from English: menus, dialogs, boxes and option names',async({browser})=>{
 test.setTimeout(240_000);
 const seen:Record<'en'|'es-419',Map<string,Set<string>>>={en:new Map(),'es-419':new Map()};
 for(const lang of ['en','es-419'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await walk(page,lang,async step=>{seen[lang].set(step,new Set(await texts(page)));});
  expect(errors,lang).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s]));
 const left:string[]=[];
 for(const [step,list] of seen['es-419'])for(const t of list)if(english.has(t)&&!same(t.replace(/^@[a-z-]+:/,'')))left.push(`${step}: ${t}`);
 expect(left).toEqual([]);
 const spanish=[...seen['es-419'].values()].flatMap(s=>[...s]);
 // A few fixed forms of the final VIREO menu glossary, as they appear on screen.
 for(const t of [O['Optical Simulation Options'],O['Limit Slewing'],O['Restrict Scope Access'],O['Set Date/Time, ID'],O['CLEA Star Field Data'],es['sky.close']])expect(spanish.some(s=>s===t||s.startsWith(`${t} `)),t).toBe(true);
});

test('qps: every text of the observatory walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(180_000);page.setViewportSize({width:1440,height:1000});
 const left:string[]=[];
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(t.replace(/^@[a-z-]+:/,'')))left.push(`${step}: ${t}`);});
 expect([...new Set(left)]).toEqual([]);
});

test('a native list that mirrors its saved file stays English with a Spanish caption (F2)',async({page})=>{
 await open(page,'es-419');
 await page.locator('.sky-card .card-heading > button').click();
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible())await toggle.click();
 await id(page,'instructor-mode-open').click();await id(page,'instructor-mode-confirm-on').click();
 await page.locator('.telescope-motion').getByTestId('ob-options').click();await id(page,'ob-options-edit-mode').check();
 const yes=page.locator('[data-testid$=-yes]:visible').first();if(await yes.count())await yes.click();await id(page,'ob-options-ok').click();
 await id(page,'fi-file-menu').click();await id(page,'fi-field-information').click();await id(page,'fi-star-list').click();
 const lines=id(page,'fi-slist-lines');await expect(lines).toBeVisible({timeout:15_000});
 await expect(lines).toHaveAttribute('lang','en');await expect(id(page,'fi-slist-mirror-caption')).toHaveText(es['nativeMirror.caption']);
 await expect(page.locator('[data-testid=fi-slist] h2')).toHaveText(O['CLEA Star Field Data']);
});

test('View original (English): VIREO\'s own texts come back in English at the next load, OpenVireo\'s web text stays Spanish',async({page})=>{
 const dateDialog=async()=>{
  await page.locator('.sky-card .card-heading > button').click();
  const d=page.locator('details:has([data-testid=ob-set-date])').first();if(await d.count())await d.evaluate(e=>{(e as HTMLDetailsElement).open=true;});
  await id(page,'ob-set-date').click();return id(page,'ob-date-dialog');
 };
 await open(page,'es-419');
 let dialog=await dateDialog();
 await expect(dialog.getByRole('heading')).toHaveText(O['Set Date/Time, ID']);await expect(dialog).toContainText(O['Universal Time (UTC)']);
 // The option is read when the page loads: set it, and the open page is unchanged until the next load.
 await page.evaluate(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 await expect(dialog.getByRole('heading')).toHaveText(O['Set Date/Time, ID']);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','es-419');
 dialog=await dateDialog();
 await expect(dialog.getByRole('heading')).toHaveText('Set Date/Time, ID');await expect(dialog).toContainText('Universal Time (UTC)');
 await expect(page.locator('.sky-card .card-heading > button')).toHaveText(es['sky.close']);// web text: still Spanish
 await page.keyboard.press('Escape');
 await page.evaluate(()=>localStorage.removeItem('openvireo-vireo-originals'));
});

// Review 1, C1: with the option on, the whole walk shows no Spanish translation of a VIREO original (menus, buttons, boxes and
// dialog captions included), while OpenVireo's own web text stays Spanish.
test('View original (English) on: every VIREO name in the observatory walk reads in English, the web text stays Spanish',async({page})=>{
 test.setTimeout(180_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'').replace(/(?: ›|…|\.\.\.)$/,'').trim();
 // OpenVireo's own Spanish (catalog and maps) and VIREO's English may coincide with a Spanish original («Minutos», «Min»).
 const leaves=(v:unknown):string[]=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(leaves):[];
 const MAPS=[APP_SHELL_ES,CAMERA_ES,FIELD_INFO_ES,FIELD_READ_DETAILS_ES,HELP_MENU_ES,LANGUAGE_CHOICE_ES,NAKED_EYE_ES,OBJECT_X_LAB_ES,OBSERVATION_METADATA_ES,OBSERVATORY_ES,POLISH_ES,PROJECT_LINKS_ES,QSO_LIST_ES,SOUND_ES,TOUR_ES,VARIABLE_STARS_ES];
 const web=new Set([...Object.values(es as Record<string,string>),...MAPS.flatMap(leaves),...Object.keys(O)].map(bare)),spanish=new Set(Object.values(O).map(bare).filter(t=>!web.has(t)));
 const left:string[]=[];
 await walk(page,'es-419',async step=>{for(const t of await texts(page))if(spanish.has(bare(t))&&!SAME.has(bare(t)))left.push(`${step}: ${t}`);});
 expect([...new Set(left)]).toEqual([]);
 for(const [testId,name] of [['ob-set-coordinates','Set Coordinates…'],['ob-view-select','View/Select from List…'],['ob-add-current','Add Current Item/Position to List…'],
  ['fi-file-menu','File'],['ob-tools-menu','Tools'],['ob-set-date','Set Date/Time…'],['ob-site-parameters','Site Parameters…'],['ob-site-information','Site Information…']] as const)
  await expect(id(page,testId)).toHaveText(name);
 await expect(page.locator('.telescope-motion').getByTestId('ob-options')).toHaveText('Optical Simulation Options…');
 await expect(page.locator('.sky-card .card-heading > button')).toHaveText(es['sky.close']);
});

/** Layout problems in the open dialogs, menus and boxes: page overflow, content wider than its dialog, clipped controls and
 * dialogs or menus that leave the viewport. Run with the CI's DejaVu fonts (docs/I18N.md). */
const layoutProblems=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[],width=document.documentElement.clientWidth;
 if(document.documentElement.scrollWidth>width)out.push(`page overflows horizontally (${document.documentElement.scrollWidth} > ${width})`);
 for(const d of document.querySelectorAll<HTMLElement>('dialog[open],[role=dialog],[role=alertdialog],[role=group].fi-menu-list,[role=group].fi-submenu,.ob-dialog')){
  if(!d.offsetParent&&getComputedStyle(d).position!=='fixed')continue;const r=d.getBoundingClientRect();if(!r.width)continue;
  const name=d.getAttribute('data-testid')??d.className;
  if(r.left<-.5||r.right>width+.5)out.push(`${name} leaves the viewport (${Math.round(r.left)}–${Math.round(r.right)})`);
  if(d.scrollWidth>d.clientWidth+1&&getComputedStyle(d).overflowX!=='visible')out.push(`${name} scrolls horizontally`);
  for(const c of d.querySelectorAll<HTMLElement>('button,label,legend,h2,h3,dt,dd,small,p')){if(!c.offsetParent)continue;
   if(c.scrollWidth>c.clientWidth+1&&['hidden','clip'].includes(getComputedStyle(c).overflowX))out.push(`${name}: “${c.textContent?.trim().slice(0,40)}” clipped`);
   const q=c.getBoundingClientRect();if(q.width&&(q.right>r.right+1||q.left<r.left-1)&&getComputedStyle(d).overflowX!=='visible')out.push(`${name}: “${c.textContent?.trim().slice(0,40)}” crosses its dialog`);}
 }
 return out;
});

for(const width of [320,1440])test(`at ${width} px the Spanish observatory dialogs, menus and the options dialog lay out without overflow or clipping`,async({page})=>{
 test.setTimeout(180_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems:string[]=[];
 await walk(page,'es-419',async step=>{for(const p of await layoutProblems(page))problems.push(`${step}: ${p}`);
  if(['Optical Simulation Options','File › Field Information › Star Data List','Site Parameters'].includes(step))await page.screenshot({path:test.info().outputPath(`es-observatory-${width}-${step.replace(/\W+/g,'-')}.png`)});});
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
 const T=(key:keyof typeof en)=>lang==='es-419'?(es as Record<string,string>)[key]:en[key];
 await page.clock.install();await open(page,lang);
 await page.locator('.sky-card .card-heading > button').click();
 if(!await page.getByRole('button',{name:T('runningClock.trackingOn'),exact:true}).isVisible())await page.getByText(T('runningClock.title'),{exact:true}).click();
 if(await page.getByRole('button',{name:T('runningClock.start'),exact:true}).isVisible())await page.getByRole('button',{name:T('runningClock.start'),exact:true}).click();
 await page.getByRole('button',{name:T('runningClock.trackingOn'),exact:true}).click();
 await page.getByText(T('sky.coordinates'),{exact:true}).click();
 await page.locator('#point-ra').fill('13.002305555555555');await page.locator('#point-dec').fill('27.9775');
 await page.getByRole('button',{name:T('sky.pointCoordinates'),exact:true}).click();await expect(id(page,'pointing-dec')).toHaveText(/^27\.97/,{timeout:30_000});
 await page.getByRole('button',{name:/^(Telescope|Telescopio) ·/}).click();
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
test('Multi-Spec in Spanish: Control, boxes, spectra list, spectrum, Information and print read differently from English',async({browser})=>{
 test.setTimeout(300_000);
 const seen:Record<'en'|'es-419',Map<string,Set<string>>>={en:new Map(),'es-419':new Map()};
 for(const lang of ['en','es-419'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await multiSpecWalk(page,lang,async step=>{seen[lang].set(step,new Set(await texts(page)));});
  expect(errors,lang).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s]));
 const left:string[]=[];
 for(const [step,list] of seen['es-419'])for(const t of list)if(english.has(t)&&!same(t.replace(/^@[a-z-]+:/,'')))left.push(`${step}: ${t}`);
 expect([...new Set(left)]).toEqual([]);
});
for(const width of [320,1440])test(`at ${width} px the Spanish Multi-Spec windows lay out without overflow or clipping`,async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems:string[]=[];
 await multiSpecWalk(page,'es-419',async step=>{for(const p of await layoutProblems(page))problems.push(`${step}: ${p}`);
  if(/list|Information/.test(step))await page.screenshot({path:test.info().outputPath(`es-multispec-${width}-${step.replace(/\W+/g,'-')}.png`)});});
 expect([...new Set(problems)]).toEqual([]);
});
