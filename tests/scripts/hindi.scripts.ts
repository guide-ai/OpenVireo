// Front HI0 (plan analysis/front-plans/front-i18n-hi.md §1.2 #1; docs/I18N.md "Hindi: the folder, the digit notice and the shell
// (HI0)"): real Hindi, not the qps-deva stress, under the pinned test fonts of playwright.scripts.config.ts. The main suite's
// fonts have no Devanagari face (its text checks hold, its layout checks would measure tofu), so Hindi's layout is checked here.
// HI0 walks the shell it translated, at 320 and 1440 px: the welcome, the observatory's chrome and header menu, every tour step,
// the language dialog, the instructor-mode confirmation and the About box. HI1 adds the observatory: the open dome, Set Date/Time,
// Site Information, Enter Sky Coordinates for Slew, the options dialog, the hot-list entry form, the hot list with its popup menu
// and File › Field Information › Star Data List (Edit Mode). HI2 adds the E01 and E02 walks (tests/i18n/walks/e01.ts, e02.ts:
// the exposures, the analyser and its spectrum axes, Observational Data, the Hubble diagram, the LSS survey and the wedge), HI3 the E03 walk
// (tests/i18n/walks/e03.ts: the classifier, its panes and dialogs), each step checked here under the real Devanagari face. Each later HI front adds its area's routes and dialogs.
// Each step asserts Devanagari on screen, layoutProblems() and verticalInkProblems() (tests/fixtures/layoutProblems.ts), and the
// face that draws Devanagari (Noto Sans Devanagari: no tofu, no fallback). Geometric checks only; no pixel screenshots.
import {test,expect,type Page} from '@playwright/test';
import {HINDI_TEXT as H} from '../i18n/languageText';
import {layoutProblems,verticalInkProblems,type LayoutOptions} from '../fixtures/layoutProblems';
import {walk as walkE01,LAYOUT as LAYOUT_E01} from '../i18n/walks/e01';
import {walk as walkE02,LAYOUT as LAYOUT_E02} from '../i18n/walks/e02';
import {walk as walkE03,LAYOUT as LAYOUT_E03} from '../i18n/walks/e03';
import {walk as walkE04,LAYOUT as LAYOUT_E04} from '../i18n/walks/e04';
import {walk as walkE05,LAYOUT as LAYOUT_E05} from '../i18n/walks/e05';
import {walk as walkRadio,LAYOUT as LAYOUT_RADIO} from '../i18n/walks/radio';
import {walk as walkE06,LAYOUT as LAYOUT_E06} from '../i18n/walks/e06';
import {walk as walkE08,LAYOUT as LAYOUT_E08} from '../i18n/walks/e08';

type Width=320|1440;
const id=(page:Page,t:string)=>page.getByTestId(t);
test.describe.configure({mode:'parallel'});
test.use({actionTimeout:15_000});
const LAYOUT={skip:'[lang=en]:not(html)',crossingExempt:'.popup-menu',dialogs:'dialog[open],[role=dialog][aria-modal=true],[role=alertdialog][aria-modal=true]',topDialog:true,controls:'button,label,legend,h1,h2,h3,h4,select,input,summary,th,dt',explainOverflow:true} as const;
const DEVANAGARI=/[ऀ-ॿ]/u;

async function settle(page:Page){
 await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
}
async function load(page:Page,hash:string){
 await page.goto('about:blank');await page.goto(`/${H.query}${hash?'#'+hash:''}`);
 await expect(page.locator('html')).toHaveAttribute('lang','hi',{timeout:30_000});
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:30_000});
 await settle(page);
}
type PlatformFont={familyName:string;glyphCount:number};
/** The platform faces that drew an element's text (DevTools CSS.getPlatformFontsForNode, as routes.scripts.ts). */
async function platformFonts(page:Page,selector:string):Promise<PlatformFont[]>{
 const cdp=await page.context().newCDPSession(page);
 try{
  await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const {root}=await cdp.send('DOM.getDocument',{depth:-1});
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
  expect(nodeId,selector).toBeTruthy();
  return (await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts as PlatformFont[];
 }finally{await cdp.detach();}
}
/** Opens the header's tool panel at phone width (it is always shown from 600 px). */
async function headerTools(page:Page){
 const toggle=page.locator('.portal-header .tools-toggle');
 if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
}
async function closeHeaderTools(page:Page){
 const toggle=page.locator('.portal-header .tools-toggle');
 if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')==='true')await toggle.click();
}

for(const width of [320,1440] as const satisfies readonly Width[])
 test(`real Hindi at ${width} px: the welcome, the header menu, the tour, the language and instructor dialogs, About and the observatory (dome, Set Date/Time, options, hot list) lay out without overflow, clipping or cut ink, drawn by Noto Sans Devanagari`,async({page})=>{
  test.setTimeout(300_000);
  await page.setViewportSize({width,height:width===320?700:1000});
  const problems=new Map<string,string>();
  const check=async(step:string)=>{
   await settle(page);
   const scope=page.locator('dialog[open]').last();
   const text=await (await scope.count()?scope:page.locator('body')).innerText();
   if(!DEVANAGARI.test(text))problems.set('no Devanagari on screen: the text shown is not Hindi',step);
   for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
   for(const p of await verticalInkProblems(page))if(!problems.has(p))problems.set(p,step);
  };
  await load(page,'');await check('welcome');
  // The welcome's heading: Devanagari from Noto Sans Devanagari, Latin (OpenVireo, CLEA) from DejaVu, nothing else.
  const faces=(await platformFonts(page,'h1')).map(f=>f.familyName).filter(f=>f!=='DejaVu Sans');
  expect(faces,'the faces that draw the welcome heading').toEqual(['Noto Sans Devanagari']);
  await load(page,'observatory');await check('observatory');
  await headerTools(page);await check('header menu');
  // The tour, from Help: each step with its card (the spotlight follows the part it names).
  await closeHeaderTools(page);
  await id(page,'main-help-menu').click();await id(page,'main-help-tour').click();
  const tour=id(page,'site-tour');await expect(tour).toBeVisible();
  for(let step=1;;step++){
   await check(`tour step ${step}`);
   const next=id(page,'site-tour-next');
   if(await next.textContent()===H.maps.tour.done){await next.click();break;}
   await next.click();
  }
  await expect(tour).toHaveCount(0);
  // The language dialog: choosing another language asks first (and Cancel keeps Hindi).
  await headerTools(page);
  await id(page,'language-select').selectOption('fr');
  await expect(id(page,'language-confirm')).toBeVisible();await check('language dialog');
  await id(page,'language-cancel').click();await expect(id(page,'language-confirm')).toBeHidden();
  // The instructor-mode confirmation.
  await id(page,'instructor-mode-open').click();await expect(id(page,'instructor-mode-confirm')).toBeVisible();
  await check('instructor mode confirmation');
  await id(page,'instructor-mode-confirm-cancel').click();await expect(id(page,'instructor-mode-confirm')).toBeHidden();
  await closeHeaderTools(page);
  // The About box.
  await id(page,'main-help-menu').click();await id(page,'main-help-site-about').click();
  await expect(id(page,'about-dialog')).toBeVisible();await check('About box');
  // Front HI1: the observatory. The dome open (the camera and Multi-Spec cards among the instruments).
  await load(page,'observatory');
  await page.getByRole('button',{name:H.catalog['sky.open'],exact:true}).click();await check('observatory, dome open');
  // Set Date/Time (VIREO's dialog), from the site clock.
  if(!await id(page,'ob-set-date').isVisible())await page.getByText(H.catalog['siteClock.title'],{exact:true}).click();
  await id(page,'ob-set-date').click();await expect(id(page,'ob-date-dialog')).toBeVisible();await check('Set Date/Time');
  await page.keyboard.press('Escape');await expect(id(page,'ob-date-dialog')).toBeHidden();
  // Site Information (VIREO's list window; its latitude letter reads «उ»/«द» beside the longitude's «पू»/«प»).
  await id(page,'ob-site-information').click();await expect(id(page,'ob-site-info-lines')).toBeVisible();
  await expect(id(page,'ob-site-info-lines')).not.toContainText(/\d" [NS]$/m);await check('Site Information');
  await id(page,'ob-site-info-close').click();await expect(id(page,'ob-site-info-lines')).toBeHidden();
  // Enter Sky Coordinates for Slew.
  await page.locator('.telescope-motion').getByTestId('ob-set-coordinates').click();await expect(id(page,'ob-sky-coords')).toBeVisible();await check('Enter Sky Coordinates for Slew');
  await page.keyboard.press('Escape');await expect(id(page,'ob-sky-coords')).toBeHidden();
  // The options dialog, in instructor mode.
  await headerTools(page);
  await id(page,'instructor-mode-open').click();await id(page,'instructor-mode-confirm-on').click();await expect(id(page,'instructor-mode-banner')).toBeVisible();
  await closeHeaderTools(page);
  await page.locator('.telescope-motion').getByTestId('ob-options').click();await expect(id(page,'ob-options-dialog')).toBeVisible();
  await check('options dialog');
  // Edit Mode on, for the Star Data List below.
  await id(page,'ob-options-edit-mode').check();const yes=page.locator('[data-testid$=-yes]:visible').first();if(await yes.count())await yes.click();
  await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
  // The hot list (two entries at a coordinate pointing) and its popup menu.
  if(!await page.locator('#point-ra').isVisible())await page.getByText(H.catalog['sky.coordinates'],{exact:true}).click();
  await page.locator('#point-ra').fill('1');await page.locator('#point-dec').fill('20');
  await page.getByRole('button',{name:H.catalog['sky.pointCoordinates'],exact:true}).click();
  for(const name of ['A','B']){
   await page.locator('.telescope-motion').getByTestId('ob-add-current').click({timeout:15_000});await id(page,'ob-entry-id').fill(name);await check('hot list entry');await id(page,'ob-entry-ok').click();
   await id(page,'ob-info-box').getByRole('button').first().click();await expect(id(page,'ob-info-box')).toHaveCount(0);
  }
  await page.locator('.telescope-motion').getByTestId('ob-view-select').click();await expect(id(page,'ob-hotlist-rows')).toBeVisible();await check('hot list');
  await id(page,'ob-hotlist-rows').evaluate(el=>{const r=el.getBoundingClientRect();el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:r.left+2,clientY:r.top+2}));});
  await expect(id(page,'popup-menu')).toBeVisible();await check('hot list popup menu');
  await page.keyboard.press('Escape');await expect(id(page,'popup-menu')).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(id(page,'ob-hotlist-rows')).toBeHidden();
  // File › Field Information › Star Data List (Edit Mode is on).
  await id(page,'fi-file-menu').click();await id(page,'fi-field-information').click();await id(page,'fi-star-list').click();
  await expect(id(page,'fi-slist-lines')).toBeVisible({timeout:20_000});await check('Star Data List');
  expect([...problems].map(([p,step])=>`${step}: ${p}`),'layout problems under real Hindi').toEqual([]);
 });

/** Front HI2 (HI3 adds E03, HI4 E04 and E05, HI5 the radio telescope, HI6 E06 and E08): an exercise walk (tests/i18n/walks/*.ts) under real Hindi: each step's layout with the walk's own options (the
 * header and English mirrors skipped, as there), its ink and Devanagari on screen. */
type Walk=(page:Page,lang:typeof H,each:(step:string)=>Promise<void>)=>Promise<void>;
const WALKS:readonly (readonly [string,Walk,LayoutOptions])[]=[['E01 (Hubble)',walkE01,LAYOUT_E01],['E02 (large-scale structure)',walkE02,LAYOUT_E02],['E03 (spectral classification)',walkE03,LAYOUT_E03],
 ['E04 (Pleiades photometry)',walkE04,LAYOUT_E04],['E05 (cluster H-R diagrams and variable stars)',walkE05,LAYOUT_E05],
 ['radio telescope',walkRadio,LAYOUT_RADIO],['E06 (pulsar analysis)',walkE06,LAYOUT_E06],['E08 (Object X)',walkE08 as Walk,LAYOUT_E08]];
for(const [name,walk,layout] of WALKS)for(const width of [320,1440] as const satisfies readonly Width[])
 test(`real Hindi at ${width} px: the ${name} walk lays out without overflow, clipping or cut ink`,async({page})=>{
  test.setTimeout(400_000);
  await page.setViewportSize({width,height:width===320?700:1000});
  const problems=new Map<string,string>();
  await walk(page,H,async step=>{
   await page.evaluate(async()=>{await document.fonts.ready;});
   const text=await page.locator('main').first().innerText();
   if(!DEVANAGARI.test(text))problems.set('no Devanagari on screen: the text shown is not Hindi',step);
   for(const p of await layoutProblems(page,layout))if(!problems.has(p))problems.set(p,step);
   for(const p of await verticalInkProblems(page))if(!problems.has(p))problems.set(p,step);
  });
  expect([...problems].map(([p,step])=>`${step}: ${p}`),`layout problems under real Hindi (${name})`).toEqual([]);
 });
