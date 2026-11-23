import {test,expect,type Page} from '@playwright/test';
import {clickHeaderTool} from './fixtures/header-tools';

// Front GUIDE-COMPANION (user decision, 2026-11-23; plan analysis/front-plans/front-guide-companion.md): after a guide's window is
// closed, its current step stays in a strip at the bottom of every page (components/GuideCompanion.tsx). Show me where goes to
// the step's page and outlines its control; Step details shows the guide's text; Full guide opens the window again; Hide
// removes the strip. The strip follows the guide's own progress and judges nothing.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const strip=(page:Page)=>id(page,'guide-companion');
const guideWindow=(page:Page)=>page.locator('dialog.hubble-lab-dialog[open]');
/** Opens a guide as the /labs/ pages do (#lab=<slug>), then closes its window. */
async function openGuide(page:Page,lab:string,query=''){
 await page.goto(`/${query}#lab=${lab}`);
 await expect(guideWindow(page)).toBeVisible({timeout:30_000});
}
async function closeGuide(page:Page){await page.keyboard.press('Escape');await expect(guideWindow(page)).toHaveCount(0);}
async function show(page:Page){
 await id(page,'guide-companion-show').click();
 await expect(id(page,'guide-companion-spot')).toBeVisible({timeout:15_000});
}
const box=async(page:Page,testId:string)=>(await id(page,testId).boundingBox())!;

test('the strip appears when a guide\'s window is closed, follows the work, and its four actions do what they say',async({page})=>{
 await page.goto('/#observatory');
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:20_000});
 await expect(strip(page)).toHaveCount(0);
 await page.locator('.portal-header nav').getByRole('button',{name:'Pulsar guide',exact:true}).click();
 await expect(guideWindow(page)).toBeVisible();
 // While the guide's own window is open the strip would repeat it.
 await expect(strip(page)).toBeHidden();
 await closeGuide(page);
 await expect(strip(page)).toBeVisible();
 await expect(strip(page)).toHaveAttribute('data-lab','pulsars');await expect(strip(page)).toHaveAttribute('data-step','setup');
 await expect(strip(page)).toHaveAccessibleName('Current step of the guide');
 await expect(id(page,'guide-companion-lab')).toHaveText('Pulsar guide');await expect(id(page,'guide-companion-step')).toHaveText('Step 1 of 9');
 await expect(id(page,'guide-companion-next')).toHaveText('Next: press Start pulsar exercise on the Radio telescope page.');
 await expect(id(page,'guide-companion-hide')).toHaveAccessibleName('Hide this guide');
 // Show me where: the step's page, its control focused and outlined; the page is not dimmed and still takes clicks.
 await show(page);
 await expect(page).toHaveURL(/#radio-control$/);
 const start=id(page,'radio-exercise-start');
 await expect(start).toBeFocused();await expect(start).toBeInViewport();
 const spot=await box(page,'guide-companion-spot'),target=await box(page,'radio-exercise-start');
 expect(spot.x).toBeLessThan(target.x);expect(spot.y).toBeLessThan(target.y);
 expect(spot.x+spot.width).toBeGreaterThan(target.x+target.width);expect(spot.y+spot.height).toBeGreaterThan(target.y+target.height);
 expect(await id(page,'guide-companion-spot').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
 // The student's next press ends the outline, and the work moves the strip on by itself.
 await start.click();
 await expect(id(page,'guide-companion-spot')).toHaveCount(0);
 await expect(strip(page)).toHaveAttribute('data-step','point',{timeout:30_000});
 await expect(id(page,'guide-companion-step')).toHaveText('Step 3 of 9');
 await expect(id(page,'guide-companion-next')).toHaveText('Next: point the telescope at a pulsar and press Receiver.');
 await show(page);await expect(id(page,'pulsar-params-open')).toBeFocused();
 // Step details: the guide's own text for the step.
 const toggle=id(page,'guide-companion-details-toggle');
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(id(page,'guide-companion-details')).toHaveCount(0);
 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(id(page,'guide-companion-details')).toContainText('For a first run, open Pulsar Parameters');
 await toggle.click();await expect(id(page,'guide-companion-details')).toHaveCount(0);
 // Escape closes Step details and leaves the focus on its button.
 await toggle.click();await expect(id(page,'guide-companion-details')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(id(page,'guide-companion-details')).toHaveCount(0);await expect(toggle).toBeFocused();await expect(strip(page)).toBeVisible();
 // Full guide: the same window, with the same progress, scrolled to the current step; closing it returns to the button.
 await id(page,'guide-companion-full').click();
 await expect(guideWindow(page)).toBeVisible();await expect(strip(page)).toBeHidden();
 await expect(id(page,'pulsar-lab-next')).toHaveAttribute('data-next','point');
 await expect(id(page,'pulsar-lab-step-point')).toBeInViewport();
 await closeGuide(page);
 await expect(id(page,'guide-companion-full')).toBeFocused();
 // Hide removes it and leaves the focus on the page's heading, not nowhere; opening a guide brings it back.
 await id(page,'guide-companion-hide').click();
 await expect(strip(page)).toHaveCount(0);
 expect(await page.evaluate(()=>{const el=document.activeElement!;return {tag:el.tagName,hidden:el.closest('[hidden]')!==null};})).toEqual({tag:'H1',hidden:false});
 await page.locator('.portal-header nav').getByRole('button',{name:'Pulsar guide',exact:true}).click();
 await closeGuide(page);
 await expect(strip(page)).toHaveAttribute('data-step','point');
});

test('the page bar\'s Help and More menus open over the strip in a short window: every item can be pressed',async({page})=>{
 await page.setViewportSize({width:1280,height:430});
 await openGuide(page,'pulsars');await closeGuide(page);
 await expect(strip(page)).toBeVisible();
 for(const [button,list] of [['main-help-menu','.page-bar .fi-menu-list'],['investigation-more','[data-testid="investigation-menu"]']] as const){
  await id(page,button).click();
  const menu=page.locator(list);await expect(menu).toBeVisible();
  // Every item that is on screen is the element under its own centre (nothing of the strip covers it).
  const covered=await menu.evaluate(el=>[...el.querySelectorAll<HTMLElement>('button,a')].filter(item=>{
   const r=item.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
   if(r.width===0||y<0||y>window.innerHeight)return false;
   const top=document.elementFromPoint(x,y);return !(top&&(top===item||item.contains(top)));
  }).map(item=>item.textContent));
  expect(covered,button).toEqual([]);
  await page.keyboard.press('Escape');
 }
});

const FIRST_STEPS=[
 ['hubble','Hubble lab guide','acquire','Step 1 of 5','galaxy-exposure'],
 ['large-scale-structure','LSS guide','load','Step 1 of 7','lss-survey'],
 ['object-x','Object X guide','target','Step 1 of 10','object-x'],
 ['cluster-hr','Cluster HR guide','load','Step 1 of 5','cluster-database'],
 ['pleiades','Pleiades lab guide','list','Step 1 of 9','observatory'],
] as const;
for(const [lab,name,step,counter,route] of FIRST_STEPS)test(`${name}: the strip shows its first step, and Show me where outlines a control on its page`,async({page})=>{
 await openGuide(page,lab);await closeGuide(page);
 await expect(strip(page)).toHaveAttribute('data-lab',lab);await expect(strip(page)).toHaveAttribute('data-step',step);
 await expect(id(page,'guide-companion-lab')).toHaveText(name);await expect(id(page,'guide-companion-step')).toHaveText(counter);
 await expect(id(page,'guide-companion-next')).not.toBeEmpty();
 await show(page);
 await expect(page).toHaveURL(new RegExp(`#${route}$`));
 await expect(id(page,'guide-companion-missing')).toBeHidden();
 // Focus is on a control of the shown page, inside the outline.
 const focus=await page.evaluate(()=>{const el=document.activeElement!,r=el.getBoundingClientRect();return {tag:el.tagName,hidden:el.closest('[hidden]')!==null,x:r.x,y:r.y,width:r.width,height:r.height};});
 expect(focus.tag).not.toBe('BODY');expect(focus.hidden).toBe(false);
 const spot=await box(page,'guide-companion-spot');
 expect(focus.x).toBeGreaterThanOrEqual(spot.x-1);expect(focus.y).toBeGreaterThanOrEqual(spot.y-1);
 expect(focus.x+focus.width).toBeLessThanOrEqual(spot.x+spot.width+1);expect(focus.y+focus.height).toBeLessThanOrEqual(spot.y+spot.height+1);
 // The strip never covers the focused control.
 const bar=await box(page,'guide-companion');
 expect(focus.y+focus.height).toBeLessThanOrEqual(bar.y+1);
});

test('Classification guide: visiting the page loads the first practice, so the strip moves on and takes back the focus the page dropped',async({page})=>{
 await openGuide(page,'stellar-classification');await closeGuide(page);
 await expect(strip(page)).toHaveAttribute('data-step','choose');await expect(id(page,'guide-companion-step')).toHaveText('Step 1 of 5');
 await id(page,'guide-companion-show').click();
 await expect(page).toHaveURL(/#classification$/);
 await expect(strip(page)).toHaveAttribute('data-step','compare',{timeout:30_000});await expect(id(page,'guide-companion-step')).toHaveText('Step 2 of 5');
 // The practice select was focused, then disabled while its spectra loaded: the focus is on the strip, never nowhere.
 expect(await page.evaluate(()=>document.activeElement?.tagName)).not.toBe('BODY');
 await show(page);
 await expect(page.locator('#class-standard')).toBeFocused();
});

test('LSS: loading a list moves the strip to the next step; opening another guide switches the strip',async({page})=>{
 await openGuide(page,'large-scale-structure');await closeGuide(page);
 await expect(id(page,'guide-companion-next')).toHaveText('Choose a field and load its list');
 await show(page);
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');
 await show(page);await expect(id(page,'lss-load-list')).toBeFocused();
 await id(page,'lss-load-list').click();
 await expect(strip(page)).toHaveAttribute('data-step','observe',{timeout:30_000});
 await expect(id(page,'guide-companion-step')).toHaveText('Step 2 of 7');
 await page.locator('.portal-header nav').getByRole('button',{name:'Classification guide',exact:true}).click();
 await closeGuide(page);
 await expect(strip(page)).toHaveAttribute('data-lab','stellar-classification');
 await expect(id(page,'guide-companion-lab')).toHaveText('Classification guide');
});

test('Cluster HR: from another page, Full guide goes to the cluster database and opens its guide\'s window; loading a dataset moves the strip',async({page})=>{
 await openGuide(page,'cluster-hr');await closeGuide(page);
 await expect(strip(page)).toHaveAttribute('data-step','load');
 await clickHeaderTool(page,'Observatory');
 await expect(page).toHaveURL(/#observatory$/);await expect(strip(page)).toBeVisible();
 await id(page,'guide-companion-full').click();
 await expect(page).toHaveURL(/#cluster-database$/);
 await expect(id(page,'cluster-lab-dialog')).toBeVisible();
 await closeGuide(page);
 await page.locator('#cluster-database-choice').selectOption({index:1});
 await show(page);await expect(id(page,'cluster-load')).toBeFocused();
 await id(page,'cluster-load').click();
 await expect(strip(page)).toHaveAttribute('data-step','inspect',{timeout:30_000});
 await expect(id(page,'guide-companion-next')).toHaveText('Next: open the reference data values or choose a point to inspect.');
});

test('a step whose control is not on the page yet says so, after waiting, and outlines nothing',async({page})=>{
 await openGuide(page,'pulsars');await closeGuide(page);
 await page.goto('/#radio-control');await expect(id(page,'radio-exercise-start')).toBeVisible({timeout:20_000});
 // The step's only control, taken off the page for this test.
 await id(page,'radio-exercise-start').evaluate(el=>el.removeAttribute('data-testid'));
 await id(page,'guide-companion-show').click();
 await expect(id(page,'guide-companion-missing')).toHaveText('That control is not on screen yet; it appears once an earlier action is done. You are on the right page.',{timeout:10_000});
 await expect(id(page,'guide-companion-spot')).toHaveCount(0);
});

for(const [width,height] of [[1280,800],[800,900],[375,740]] as const)test(`layout at ${width} px: the strip is inside the window, the page does not scroll sideways, and the page ends below it`,async({page})=>{
 await page.setViewportSize({width,height});
 await openGuide(page,'pleiades');await closeGuide(page);
 await expect(strip(page)).toBeVisible();
 const bar=await box(page,'guide-companion');
 expect(bar.x).toBeGreaterThanOrEqual(0);expect(bar.x+bar.width).toBeLessThanOrEqual(width+.5);
 expect(bar.y+bar.height).toBeLessThanOrEqual(height+.5);expect(bar.height).toBeLessThanOrEqual(height*.6+1);
 if(width<600)expect(bar.height).toBeLessThanOrEqual(height*.45+1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 // Every action is on screen and none is cut.
 for(const t of ['guide-companion-show','guide-companion-details-toggle','guide-companion-full','guide-companion-hide']){
  const b=await box(page,t);
  expect(b.x).toBeGreaterThanOrEqual(bar.x);expect(b.x+b.width).toBeLessThanOrEqual(bar.x+bar.width+.5);
  expect(await id(page,t).evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
 // From 1100 px the sidebar is fixed at the side: the strip sits beside it, not over it.
 if(width>=1100){const side=(await page.locator('.portal-header').boundingBox())!;expect(bar.x).toBeGreaterThanOrEqual(side.x+side.width);}
 // The end of the page is reachable above the strip.
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 const last=await page.evaluate(()=>{const routes=[...document.querySelectorAll('main')].filter(m=>m.getBoundingClientRect().height>0);return Math.max(...routes.map(m=>m.getBoundingClientRect().bottom));});
 expect(last).toBeLessThanOrEqual((await box(page,'guide-companion')).y+1);
});

test('the strip is not printed, and is inert while a window of the page is modal',async({page})=>{
 await openGuide(page,'large-scale-structure');await closeGuide(page);
 await page.emulateMedia({media:'print'});
 await expect(strip(page)).toBeHidden();
 await page.emulateMedia({media:'screen'});
 await expect(strip(page)).toBeVisible();await expect(strip(page)).not.toHaveAttribute('inert');
 await clickHeaderTool(page,'LSS data');
 await id(page,'wedge-options-open').click();await expect(id(page,'wedge-options')).toBeVisible();
 await expect(strip(page)).toHaveAttribute('inert','');
 await page.keyboard.press('Escape');
 await expect(strip(page)).not.toHaveAttribute('inert');
});

test('in Spanish the strip, its actions and the guide\'s line are translated',async({page})=>{
 await openGuide(page,'pulsars','?lang=es-419');await closeGuide(page);
 await expect(strip(page)).toHaveAccessibleName('Paso actual de la guía');
 await expect(id(page,'guide-companion-step')).toHaveText('Paso 1 de 9');
 await expect(id(page,'guide-companion-show')).toHaveText('Muéstrame dónde');
 await expect(id(page,'guide-companion-details-toggle')).toHaveText('Detalles del paso');
 await expect(id(page,'guide-companion-full')).toHaveText('Guía completa');
 await expect(id(page,'guide-companion-hide')).toHaveText('Ocultar');await expect(id(page,'guide-companion-hide')).toHaveAccessibleName('Ocultar esta guía');
 await expect(id(page,'guide-companion-next')).not.toContainText('Next:');
 await show(page);await expect(id(page,'radio-exercise-start')).toBeFocused();
});

test('right to left: the strip sits beside the sidebar on the other side and stays inside the window',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await openGuide(page,'pulsars','?lang=qps-rtl');await closeGuide(page);
 await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 const bar=await box(page,'guide-companion'),side=(await page.locator('.portal-header').boundingBox())!;
 expect(bar.x).toBeGreaterThanOrEqual(0);expect(bar.x+bar.width).toBeLessThanOrEqual(side.x+.5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});
