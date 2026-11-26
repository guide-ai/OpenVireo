import {test,expect,type Page} from '@playwright/test';
import {clickHeaderTool} from './fixtures/header-tools';
import en from '../src/i18n/en.json' with {type:'json'};

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

test('the strip appears when a guide\'s window is closed, follows the work, and Show me where, Step details, Full guide and Hide do what they say',async({page})=>{
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
 await expect(id(page,'guide-companion-next')).toHaveText('Set up the radio telescope');
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
 // A page that focuses its own heading a moment later (a route that finishes showing late) takes neither the focus nor the
 // scroll away from the control.
 await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('h1')].find(h=>h.closest('[hidden]')===null&&h.getClientRects().length>0)!.focus());
 await expect(start).toBeFocused();await expect(start).toBeInViewport();
 // The student's next press ends the outline, and the work moves the strip on by itself.
 await start.click();
 await expect(id(page,'guide-companion-spot')).toHaveCount(0);
 await expect(strip(page)).toHaveAttribute('data-step','point',{timeout:30_000});
 await expect(id(page,'guide-companion-step')).toHaveText('Step 3 of 9');
 await expect(id(page,'guide-companion-next')).toHaveText('Point at a pulsar');
 await show(page);await expect(id(page,'pulsar-params-open')).toBeFocused();
 // Step details: the guide's own text for the step.
 const toggle=id(page,'guide-companion-details-toggle');
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(id(page,'guide-companion-details')).toHaveCount(0);
 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-expanded','true');
 // Front NEWCOMER NC3: the line is the step title; Step details start with the guide's "Next:" line, then the step's text.
 await expect(id(page,'guide-companion-details').locator('p').first()).toHaveText('Next: point the telescope at a pulsar and press Receiver.');
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

test('Classification guide: visiting the page loads the first practice without counting it as the visitor\'s choice; choosing one moves the strip on, which takes back the focus the page dropped',async({page})=>{
 await openGuide(page,'stellar-classification');await closeGuide(page);
 await expect(strip(page)).toHaveAttribute('data-step','choose');await expect(id(page,'guide-companion-step')).toHaveText('Step 1 of 5');
 await id(page,'guide-companion-show').click();
 await expect(page).toHaveURL(/#classification$/);
 // The preselected practice loads and is verified, but step 1 waits for the visitor's own choice.
 await expect(page.getByRole('button',{name:'Review classification',exact:true})).toBeEnabled({timeout:30_000});
 await expect(strip(page)).toHaveAttribute('data-step','choose');await expect(id(page,'guide-companion-step')).toHaveText('Step 1 of 5');
 // The practice select was focused, then disabled while its spectra loaded: the focus is on the strip, never nowhere.
 expect(await page.evaluate(()=>document.activeElement?.tagName)).not.toBe('BODY');
 await show(page);await expect(page.locator('#class-practice')).toBeFocused();
 await page.locator('#class-practice').selectOption('u2');
 await expect(strip(page)).toHaveAttribute('data-step','compare',{timeout:30_000});await expect(id(page,'guide-companion-step')).toHaveText('Step 2 of 5');
 expect(await page.evaluate(()=>document.activeElement?.tagName)).not.toBe('BODY');
 await show(page);
 await expect(page.locator('#class-standard')).toBeFocused();
});

test('Classification guide: Restart exercise starts again at step 1, even though the preselected practice loads again',async({page})=>{
 await openGuide(page,'stellar-classification');await closeGuide(page);await show(page);
 await page.locator('#class-practice').selectOption('u2');
 await expect(strip(page)).toHaveAttribute('data-step','compare',{timeout:30_000});
 await id(page,'guide-companion-restart').click();await id(page,'guide-companion-restart-go').click();
 await expect(guideWindow(page)).toBeVisible({timeout:30_000});
 await expect(id(page,'classification-lab-next')).toHaveAttribute('data-next','choose');
 await id(page,'classification-lab-continue').click();await expect(guideWindow(page)).toHaveCount(0);
 await expect(page).toHaveURL(/#classification$/);
 await expect(page.getByRole('button',{name:'Review classification',exact:true})).toBeEnabled({timeout:30_000});
 await expect(strip(page)).toHaveAttribute('data-step','choose');await expect(id(page,'guide-companion-step')).toHaveText('Step 1 of 5');
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
 await expect(id(page,'guide-companion-next')).toHaveText('Inspect the data');
});

test('when every control of the step is disabled the first is outlined, and the outline and the focus move once the page enables one',async({page})=>{
 await openGuide(page,'large-scale-structure');await closeGuide(page);
 await show(page);
 const field=page.locator('#lss-field'),load=id(page,'lss-load-list');
 await expect(field).toBeFocused();await expect(load).toBeDisabled();
 // A list that loads slowly keeps the field selector disabled too (set here by hand; React does not write it back).
 await field.evaluate(el=>{(el as HTMLSelectElement).disabled=true;});
 await id(page,'guide-companion-show').click();
 await expect(id(page,'guide-companion-spot')).toBeVisible({timeout:15_000});
 const spot=await box(page,'guide-companion-spot'),button=(await load.boundingBox())!;
 expect(spot.y).toBeLessThan(button.y);expect(spot.y+spot.height).toBeGreaterThan(button.y+button.height);
 await field.evaluate(el=>{(el as HTMLSelectElement).disabled=false;});
 await expect(field).toBeFocused();
 const moved=await box(page,'guide-companion-spot'),select=(await field.boundingBox())!;
 expect(moved.y).toBeLessThan(select.y);expect(moved.y+moved.height).toBeGreaterThan(select.y+select.height);
 expect(moved.y+moved.height).toBeLessThan(button.y+button.height);
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

// Front NEWCOMER NC3 (review M7): a guide window printed while it is open prints its folded steps (and its other disclosures),
// and afterwards exactly those fold again; a More detail the visitor opened stays open. Chromium prints for real (page.pdf fires
// beforeprint and afterprint); Firefox and WebKit, run with --browser, receive the two events as the print dialog sends them.
// Review S1: the print layout itself is read under print media after beforeprint (printLayout): neither the window nor any
// ancestor may still clip its content, a folded step's text far below the window's screen height must be rendered, and the page
// behind the window must not be. (A first version read the text out of page.pdf(); CI's fonts made that reader miss passages,
// so the layout is checked instead, in every browser.)
/** Under print media, after beforeprint: what still clips the open guide window, which of `inside` it does not render, and
 * which of `outside` is still rendered outside it. Restores screen media and sends afterprint afterwards. */
async function printLayout(page:Page,inside:string[],outside:string[]){
 await page.emulateMedia({media:'print'});
 await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));
 const result=await page.evaluate(({inside,outside})=>{
  const norm=(s:string)=>s.replace(/\s+/g,'');
  const d=document.querySelector('dialog.hubble-lab-dialog[open]')!;
  const clipping:string[]=[];
  for(let el:Element|null=d;el&&el!==document.documentElement;el=el.parentElement){
   const s=getComputedStyle(el);
   if(s.maxHeight!=='none'||(s.overflowY!=='visible'&&el.scrollHeight>el.clientHeight+1))clipping.push(`${el.tagName.toLowerCase()}.${el.className}`);
  }
  /** The innermost elements under `root` whose text holds `text`, and whether one of them is rendered. */
  const rendered=(root:Element,text:string,skip?:Element)=>[...root.querySelectorAll('*')]
   .filter(el=>!(skip&&skip.contains(el))&&norm(el.textContent??'').includes(norm(text))&&![...el.children].some(c=>norm(c.textContent??'').includes(norm(text))))
   .some(el=>el.checkVisibility());
  return {clipping,missing:inside.filter(text=>!rendered(d,text)),behind:outside.filter(text=>rendered(document.body,text,d))};
 },{inside,outside});
 await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
 await page.emulateMedia({media:'screen'});
 return result;
}

test('a guide window printed while open prints every folded step, and folds the same ones again afterwards',async({page,browserName})=>{
 await openGuide(page,'pulsars');
 const dialog=guideWindow(page),closed=()=>dialog.evaluate(d=>d.querySelectorAll('details:not([open])').length);
 const folded=await closed();expect(folded).toBeGreaterThanOrEqual(8);
 const channels=id(page,'pulsar-lab-step-channels').locator('.lab-step-more');
 await channels.locator('summary').click();await expect(channels).toHaveAttribute('open','');
 expect(await closed()).toBe(folded-1);
 await page.evaluate(()=>{const w=window as unknown as {printedClosed:number};w.printedClosed=-1;addEventListener('beforeprint',()=>{w.printedClosed=document.querySelectorAll('dialog.hubble-lab-dialog[open] details:not([open])').length;});});
 if(browserName==='chromium')await page.pdf();
 else await page.evaluate(()=>{dispatchEvent(new Event('beforeprint'));dispatchEvent(new Event('afterprint'));});
 expect(await page.evaluate(()=>(window as unknown as {printedClosed:number}).printedClosed)).toBe(0);
 expect(await closed()).toBe(folded-1);
 // Steps 8 and 9 (folded, far below the window's screen height), the last section, and nothing of the page behind.
 expect(await printLayout(page,[en['pulsarLab.backup'],en['pulsarLab.step.save.optional'],en['pulsarLab.step.delay.formula'],en['pulsarLab.limits']],[en['sky.title']]))
  .toEqual({clipping:[],missing:[],behind:[]});
 expect(await closed()).toBe(folded-1);
 await expect(channels).toHaveAttribute('open','');
 await expect(id(page,'pulsar-lab-step-setup').locator('.lab-step-more')).toHaveAttribute('open','');
});

test('the printed Hubble guide holds its folded Save your work advice and its sources; the cluster guide, inside <main>, prints too',async({page})=>{
 await openGuide(page,'hubble');
 expect(await printLayout(page,[en['lab.saveHelp'],en['lab.sspHelp'],en['lab.limitsExtended']],[en['sky.title']])).toEqual({clipping:[],missing:[],behind:[]});
 await page.goto('about:blank');await openGuide(page,'cluster-hr');
 expect(await printLayout(page,[en['clusterLab.step.report.help'],en['clusterLab.limits']],[en['sky.title']])).toEqual({clipping:[],missing:[],behind:[]});
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

test('Restart exercise asks first, Cancel and Escape keep the work, and Restart loads the site again with the guide at its first step',async({page})=>{
 await openGuide(page,'large-scale-structure');await closeGuide(page);await show(page);
 await page.getByLabel('Survey field',{exact:true}).selectOption('1');await id(page,'lss-load-list').click();
 await expect(strip(page)).toHaveAttribute('data-step','observe',{timeout:30_000});
 const restart=id(page,'guide-companion-restart'),confirm=id(page,'guide-companion-restart-confirm');
 await expect(restart).toHaveText('Restart exercise');await expect(confirm).toHaveCount(0);
 // The confirmation says what is lost and how to keep it, and starts on Cancel.
 await restart.click();await expect(confirm).toBeVisible();await expect(confirm).toHaveAccessibleName('Restart this exercise?');
 await expect(confirm).toContainText('Everything you have not saved is lost');await expect(confirm).toContainText('Save investigation');
 await expect(id(page,'guide-companion-restart-cancel')).toBeFocused();
 // Cancel: nothing changed, and the focus is back on the strip's button.
 await id(page,'guide-companion-restart-cancel').click();await expect(confirm).toHaveCount(0);await expect(restart).toBeFocused();
 await expect(strip(page)).toHaveAttribute('data-step','observe');await expect(id(page,'lss-rows')).toBeVisible();
 // Escape answers Cancel too, and closes only the confirmation: Step details stays open. The keyboard opens it as the mouse does.
 await id(page,'guide-companion-details-toggle').click();await expect(id(page,'guide-companion-details')).toBeVisible();
 await restart.focus();await page.keyboard.press('Enter');await expect(confirm).toBeVisible();await page.keyboard.press('Escape');await expect(confirm).toHaveCount(0);await expect(restart).toBeFocused();
 await expect(id(page,'guide-companion-details')).toBeVisible();await expect(strip(page)).toHaveAttribute('data-step','observe');
 // Restart: a fresh load (the mark set on this window is gone) with the same guide's window open and no step done.
 await page.evaluate(()=>{(window as unknown as {beforeRestart?:boolean}).beforeRestart=true;});
 const entries=await page.evaluate(()=>history.length);
 await restart.click();await id(page,'guide-companion-restart-go').click();
 await expect(guideWindow(page)).toBeVisible({timeout:30_000});
 expect(await page.evaluate(()=>(window as unknown as {beforeRestart?:boolean}).beforeRestart)).toBeUndefined();
 // No entry is added to the tab's history: Back does not return to a copy of the lost work.
 expect(await page.evaluate(()=>history.length)).toBe(entries);
 await expect(page.getByRole('dialog',{name:'Mapping large-scale structure'})).toBeVisible();
 for(const s of ['load','observe'])await expect(id(page,`lss-lab-step-${s}`)).toHaveAttribute('data-done','false');
 await closeGuide(page);
 await expect(strip(page)).toHaveAttribute('data-lab','large-scale-structure');await expect(strip(page)).toHaveAttribute('data-step','load');
 await expect(id(page,'guide-companion-step')).toHaveText('Step 1 of 7');
 // The survey page itself starts again: no list is loaded.
 await show(page);await expect(page.getByLabel('Survey field',{exact:true})).toBeVisible();await expect(id(page,'lss-rows')).toHaveCount(0);
});

test('Restart exercise keeps the language of the page: the confirmation is translated and the reloaded guide is still in Spanish',async({page})=>{
 await openGuide(page,'pulsars','?lang=es-419');await closeGuide(page);
 await expect(id(page,'guide-companion-restart')).toHaveText('Reiniciar ejercicio');
 await id(page,'guide-companion-restart').click();
 const confirm=id(page,'guide-companion-restart-confirm');
 await expect(confirm).toHaveAccessibleName('¿Reiniciar este ejercicio?');await expect(confirm).toContainText('Guardar investigación');
 await expect(id(page,'guide-companion-restart-cancel')).toHaveText('Cancelar');
 await id(page,'guide-companion-restart-go').click();
 await expect(guideWindow(page)).toBeVisible({timeout:30_000});
 expect(new URL(page.url()).searchParams.get('lang')).toBe('es-419');
 await closeGuide(page);
 await expect(strip(page)).toHaveAccessibleName('Paso actual de la guía');await expect(id(page,'guide-companion-step')).toHaveText('Paso 1 de 9');
});

test('in Spanish the strip, its actions and the guide\'s line are translated',async({page})=>{
 await openGuide(page,'pulsars','?lang=es-419');await closeGuide(page);
 await expect(strip(page)).toHaveAccessibleName('Paso actual de la guía');
 await expect(id(page,'guide-companion-step')).toHaveText('Paso 1 de 9');
 await expect(id(page,'guide-companion-show')).toHaveText('Muéstrame dónde');
 await expect(id(page,'guide-companion-details-toggle')).toHaveText('Detalles del paso');
 await expect(id(page,'guide-companion-full')).toHaveText('Guía completa');
 await expect(id(page,'guide-companion-hide')).toHaveText('Ocultar');await expect(id(page,'guide-companion-hide')).toHaveAccessibleName('Ocultar esta guía');
 await expect(id(page,'guide-companion-next')).toHaveText('Configura el radiotelescopio');
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
