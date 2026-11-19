// Front HI0 (plan analysis/front-plans/front-i18n-hi.md §1.2 #1; docs/I18N.md "Hindi: the folder, the digit notice and the shell
// (HI0)"): real Hindi, not the qps-deva stress, under the pinned test fonts of playwright.scripts.config.ts. The main suite's
// fonts have no Devanagari face (its text checks hold, its layout checks would measure tofu), so Hindi's layout is checked here.
// HI0 walks the shell it translated, at 320 and 1440 px: the welcome, the observatory's chrome and header menu, every tour step,
// the language dialog, the instructor-mode confirmation and the About box; each later HI front adds its area's routes and dialogs.
// Each step asserts Devanagari on screen, layoutProblems() and verticalInkProblems() (tests/fixtures/layoutProblems.ts), and the
// face that draws Devanagari (Noto Sans Devanagari: no tofu, no fallback). Geometric checks only; no pixel screenshots.
import {test,expect,type Page} from '@playwright/test';
import {HINDI_TEXT as H} from '../i18n/languageText';
import {layoutProblems,verticalInkProblems} from '../fixtures/layoutProblems';

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
 test(`real Hindi at ${width} px: the welcome, the observatory chrome, the header menu, the tour, the language and instructor dialogs and About lay out without overflow, clipping or cut ink, drawn by Noto Sans Devanagari`,async({page})=>{
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
  expect([...problems].map(([p,step])=>`${step}: ${p}`),'layout problems under real Hindi').toEqual([]);
 });
