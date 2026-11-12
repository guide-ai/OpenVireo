// Front RT5 and RT6 (plan analysis/front-plans/front-i18n-rtl.md § 1, § 2, the RT5 and RT6 rows of § 9; docs/I18N.md "RTL
// groundwork: logical CSS and direction-aware placement (RT5, RT6)"): the page mirrors under <html dir="rtl"> and the data does
// not. (1) English, Spanish, Portuguese and French (preview) compute the same value of every property src/theme/rtl.css declares
// with and without the sheet, on the home page and every route at 320 and 1440 px, as SC3 checks scripts.css (routes.scripts.ts).
// (2) Under the dev-only qps-rtl: the sidebar, page bar, its menus, a dialog's close button and a form's popup menu are on the
// mirrored side, and the tour card goes left of the sidebar; plots, the sky map, canvases, sliders, the spectrum's ◀ ▶ buttons and
// the antenna pad (East left of West) keep English's direction, and VIREO's native hot-list rows keep their byte order. Geometric checks only; the full RTL route walk is RT7's.
import {test,expect,type Page} from '@playwright/test';
import en from '../../src/i18n/en.json' with {type:'json'};
import {pseudoRtl} from '../../src/i18n/pseudoRtl';
import {fileURLToPath} from 'node:url';

const ROUTES=['observatory','spectrum','spectrometer','sky-exposure','star-exposure','galaxy-exposure','classification','photometer','cluster-database','pulsar-analysis','radio-control','lss-wedge','lss-survey','object-x','variable-stars','images'] as const;
const id=(page:Page,t:string)=>page.getByTestId(t);
test.describe.configure({mode:'parallel'});
test.use({actionTimeout:15_000});

async function settle(page:Page){
 await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
}
async function load(page:Page,lang:string,hash:string){
 await page.goto('about:blank');await page.goto(`/?lang=${lang}${hash?'#'+hash:''}`);
 await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:30_000});
 await settle(page);
}

// ---- (1) Left-to-right pages do not see rtl.css -----------------------------------------------------------------------------
const SHEET='/src/theme/rtl.css';
for(const lang of ['en','es-419','pt-BR','fr'] as const)for(const width of [320,1440] as const)
test(`${lang} at ${width} px computes the same styles with and without rtl.css, on the home page and every route`,async({page})=>{
 test.setTimeout(300_000);
 const declaredProps=()=>page.evaluate(sheetId=>{
  const sheet=[...document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]')].find(s=>s.dataset.viteDevId!.endsWith(sheetId))?.sheet;
  if(!sheet)throw new Error('rtl.css is not on the page');
  const declared=(rules:CSSRuleList):string[]=>[...rules].flatMap(r=>r instanceof CSSStyleRule?[...r.style]:r instanceof CSSGroupingRule?declared(r.cssRules):[]);
  return [...new Set(declared(sheet.cssRules))].sort();
 },SHEET);
 // Each element's box and its computed values of the properties the sheet declares.
 const snapshot=(props:readonly string[])=>page.evaluate(props=>
  [document.documentElement,document.body,...document.body.querySelectorAll('*')].map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();
   return `${e.tagName.toLowerCase()}.${typeof e.className==='string'?e.className:''} ${r.x},${r.y},${r.width},${r.height} `+props.map(p=>`${p}:${s.getPropertyValue(p)}`).join(';');}),props);
 const withoutSheet=()=>page.evaluate(sheetId=>{
  const sheet=[...document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]')].filter(s=>s.dataset.viteDevId!.endsWith(sheetId));
  if(sheet.length!==1)throw new Error(`rtl.css found ${sheet.length} times`);
  (window as unknown as {removedSheet:[Node,Node|null,Node]}).removedSheet=[sheet[0].parentNode!,sheet[0].nextSibling,sheet[0]];sheet[0].remove();
 },SHEET);
 const restoreSheet=()=>page.evaluate(()=>{const [parent,next,node]=(window as unknown as {removedSheet:[Node,Node|null,Node]}).removedSheet;parent.insertBefore(node,next);});
 const same=(a:readonly string[],b:readonly string[])=>a.join('\n')===b.join('\n');
 for(const route of ['',...ROUTES]){
  await page.setViewportSize({width,height:width===320?700:1000});
  await load(page,lang,route);
  if(width<600){const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();}
  // The lazy shell parts (routes.scripts.ts, Front RTL-1): the Multi-Spec card, and the selector and View original option where shown.
  // Front LAZY-OBS: the welcome ('') is the shell alone, which never loads the observatory and so has no Multi-Spec card.
  await expect(id(page,'ms-card')).toHaveCount(route?1:0,{timeout:30_000});
  if(lang!=='fr')for(const part of ['language-choice','language-originals-choice'])await expect(id(page,part),part).toHaveCount(1,{timeout:30_000});
  expect(await page.evaluate(()=>[document.documentElement.lang,document.documentElement.dir])).toEqual([lang==='fr'?'fr':lang,'ltr']);
  const props=await declaredProps();expect(props.length,props.join()).toBeGreaterThanOrEqual(12);
  let before=await snapshot(props),stable=false;
  for(let i=0;i<20&&!stable;i++){await settle(page);const again=await snapshot(props);stable=same(again,before);before=again;}
  expect(stable,`${lang} ${width} #${route}: the page settles before the comparison`).toBe(true);
  let after:string[]=[],bracketed=false;
  for(let attempt=0;attempt<5&&!bracketed;attempt++){
   await withoutSheet();after=await snapshot(props);await restoreSheet();
   const again=await snapshot(props);bracketed=same(again,before);before=again;
  }
  expect(bracketed,`${lang} ${width} #${route}: the page with the sheet stays the same around the comparison`).toBe(true);
  expect(after.length).toBe(before.length);
  const changed=before.flatMap((v,i)=>v===after[i]?[]:[`${v} → ${after[i]}`]);
  expect(changed,`${lang} ${width} #${route}: elements whose computed style rtl.css changed`).toEqual([]);
 }
});

// ---- (2) Under qps-rtl: the page mirrors, the data does not -------------------------------------------------------------------
type Box={left:number;right:number;top:number;bottom:number;width:number};
const box=(page:Page,selector:string)=>page.locator(selector).first().evaluate((e):Box=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};});
const dir=(page:Page,selector:string)=>page.locator(selector).first().evaluate(e=>getComputedStyle(e).direction);
/** A native row's characters in screen order, left to right (spaces dropped), and the same text in byte order: equal when the
 * row keeps its byte order. A right-to-left paragraph would move a row's leading digits (a pulsar ID, a row number) to its end. */
const visualOrder=(page:Page,selector:string)=>page.locator(selector).first().evaluate(e=>{
 const range=document.createRange(),chars:[string,number][]=[];
 const walk=(n:Node)=>{if(n.nodeType===3){const t=n as Text;for(let i=0;i<t.length;i++){if(/\s/.test(t.data[i]))continue;range.setStart(t,i);range.setEnd(t,i+1);chars.push([t.data[i],range.getBoundingClientRect().left]);}}else n.childNodes.forEach(walk);};
 walk(e);return {screen:chars.sort((a,b)=>a[1]-b[1]).map(c=>c[0]).join(''),bytes:e.textContent!.replace(/\s/g,'')};});

test('qps-rtl at 1440 px: the sidebar, page bar and its menu mirror; the tour card goes left of the sidebar',async({page})=>{
 test.setTimeout(120_000);
 await page.setViewportSize({width:1440,height:1000});
 await load(page,'qps-rtl','observatory');
 expect(await page.evaluate(()=>[document.documentElement.lang,document.documentElement.dir,getComputedStyle(document.body).direction])).toEqual(['ar','rtl','rtl']);
 const view=await page.evaluate(()=>document.documentElement.clientWidth);
 // The fixed sidebar is on the right, and the body's padding makes room for it there.
 const side=await box(page,'.portal-header');
 expect(Math.abs(side.right-view)).toBeLessThan(1);expect(side.left).toBeGreaterThan(view/2);
 const pad=await page.evaluate(()=>{const s=getComputedStyle(document.body);return [s.paddingLeft,s.paddingRight];});
 expect(pad[0]).toBe('0px');expect(parseFloat(pad[1])).toBeCloseTo(side.width,0);
 // The sidebar's border is on its inline end (the left), and its menu buttons' text starts at the right.
 expect(await page.locator('.portal-header').evaluate(e=>{const s=getComputedStyle(e);return [s.borderLeftWidth,s.borderRightWidth];})).toEqual(['1px','0px']);
 expect(await page.locator('.portal-header nav button').first().evaluate(e=>getComputedStyle(e).textAlign)).toBe('start');
 // Page bar: the place (section › page) at the right, the tools at the left; the separator points to the page (flipped).
 const place=await box(page,'.page-bar-place'),tools=await box(page,'.page-bar-tools');
 expect(place.left).toBeGreaterThan(tools.right);
 const section=await box(page,'.page-bar-section'),pageName=await box(page,'.page-bar-page');
 expect(section.left).toBeGreaterThan(pageName.right);
 expect(await page.locator('.page-bar-separator').evaluate(e=>getComputedStyle(e).transform)).toBe('matrix(-1, 0, 0, 1, 0, 0)');
 // The More menu opens below its button, aligned with its left (inline-end) edge.
 await page.locator('.page-bar .investigation-more').click();
 const more=await box(page,'.page-bar .investigation-more'),list=await box(page,'.page-bar .fi-menu-list');
 expect(Math.abs(list.left-more.left)).toBeLessThan(1.5);
 await page.keyboard.press('Escape');
 // A collapsed section's chevron points to its label's end (left): rotate(90deg), English's -90deg mirrored.
 const toggle=page.locator('.portal-header nav .nav-group-toggle').first();
 await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','false');
 // (After its .15 s transition.)
 await expect.poll(()=>toggle.locator('.nav-group-chevron').evaluate(e=>getComputedStyle(e).transform)).toBe('matrix(0, 1, -1, 0, 0, 0)');
 await toggle.click();
 // The tour (the site skips it in automated browsers: present as a visitor, as tests/onboarding.spec.ts does): the sections step
 // outlines the sidebar, and the card goes on the target's inline-end side, its left.
 await page.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'webdriver',{configurable:true,get:()=>false});});
 await load(page,'qps-rtl','observatory');
 await expect(id(page,'site-tour')).toBeVisible({timeout:15_000});
 await id(page,'site-tour-next').click();await expect(id(page,'site-tour')).toHaveAttribute('data-step','sections');
 const card=id(page,'site-tour-card');
 await expect(card).toHaveAttribute('data-side','left');
 // (The outline moves with a .2 s transition.)
 await expect.poll(async()=>{const c=await box(page,'[data-testid=site-tour-card]'),spot=await box(page,'[data-testid=site-tour-spot]');return c.right<=spot.left&&spot.right>1400;}).toBe(true);
 // Skip comes first in reading order, at the right; Next last, at the left (the row may wrap with the longer text).
 const skip=await box(page,'[data-testid=site-tour-skip]'),next=await box(page,'[data-testid=site-tour-next]'),row=await box(page,'.site-tour-actions');
 // The row packs toward its end, the left (justify-content:flex-end), as English packs toward the right.
 expect(Math.abs(next.left-row.left)).toBeLessThan(1);expect(skip.left).toBeGreaterThan(next.left);expect(skip.right).toBeGreaterThan(next.right);
});

test('qps-rtl: a form\'s popup menu opens from the pointer toward the inline end; a dialog\'s close button is at its left',async({page})=>{
 test.setTimeout(120_000);
 for(const width of [1440,320] as const){
  await page.setViewportSize({width,height:width===320?700:1000});
  await load(page,'qps-rtl','observatory');
  // The hot list (as routes.scripts.ts): open the dome, point, add two entries, show the list, then a context menu on its rows.
  if(width<600){const t=page.locator('.portal-header .tools-toggle');if(await t.getAttribute('aria-expanded')==='true')await t.click();}
  await page.getByRole('button',{name:pseudoRtl(en['sky.open']),exact:true}).click();
  if(!await page.locator('#point-ra').isVisible())await page.getByText(pseudoRtl(en['sky.coordinates']),{exact:true}).click();
  await page.locator('#point-ra').fill('1');await page.locator('#point-dec').fill('20');
  await page.getByRole('button',{name:pseudoRtl(en['sky.pointCoordinates']),exact:true}).click();
  for(const name of ['A','B']){
   await page.locator('.telescope-motion').getByTestId('ob-add-current').click();await id(page,'ob-entry-id').fill(name);await id(page,'ob-entry-ok').click();
   await id(page,'ob-info-box').getByRole('button').first().click();await expect(id(page,'ob-info-box')).toHaveCount(0);
  }
  await page.locator('.telescope-motion').getByTestId('ob-view-select').click();
  const rows=id(page,'ob-hotlist-rows');await expect(rows).toBeVisible();
  // VIREO's native row keeps its byte order (an LTR island: it starts with the row number).
  {const o=await visualOrder(page,'[data-testid=ob-hotlist-native-1]');expect(o.screen).toBe(o.bytes);}
  const at=await rows.evaluate(el=>{const r=el.getBoundingClientRect(),x=Math.min(r.right,innerWidth)-40,y=r.top+4;
   el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:x,clientY:y}));return {x,y};});
  const menu=id(page,'popup-menu');await expect(menu).toBeVisible();
  const m=await box(page,'[data-testid=popup-menu]');
  // Its right edge at the pointer when there is room on the left; otherwise 4 px inside the viewport.
  if(at.x-m.width>=4)expect(Math.abs(m.right-at.x),`${width}: right edge ${m.right} at the pointer ${at.x}`).toBeLessThan(1);
  else expect(Math.abs(m.left-4)).toBeLessThan(1);
  expect(m.left).toBeGreaterThanOrEqual(3.5);expect(m.right).toBeLessThanOrEqual(width+.5);
  expect(await menu.locator('button').first().evaluate(e=>getComputedStyle(e).textAlign)).toBe('start');
  // (Chromium gives a keyboard-opened context menu (Shift+F10) a position inside the list, so the menu opens there as from a
  // pointer; the list's top-right corner for an event without one is popupPlacement.test.ts's.)
  await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);
  // The hot list window's own close button sits at its left (the dialog's inline end).
  const close=page.locator('dialog[open] .dialog-close').first();
  if(await close.count()){const d=await box(page,'dialog[open]'),b=await box(page,'dialog[open] .dialog-close');expect(b.left-d.left).toBeLessThan(d.right-b.right);}
  await page.keyboard.press('Escape');await expect(rows).toBeHidden();
 }
});

test('qps-rtl: plots, the sky map, canvases, sliders, the ◀ ▶ buttons, the antenna pad and native hot-list rows keep English\'s direction',async({page})=>{
 test.setTimeout(120_000);
 await page.setViewportSize({width:1440,height:1000});
 // The spectrum: its plot, the redshift slider and its end labels, and the pan buttons.
 await load(page,'qps-rtl','spectrum');
 expect(await dir(page,'body')).toBe('rtl');
 for(const s of ['svg','input[type=range]','.engine-buttons'])expect(await dir(page,s),s).toBe('ltr');
 const buttons=page.locator('.engine-buttons button');
 const labels=await buttons.evaluateAll(b=>b.map(e=>({text:e.textContent!.trim(),left:e.getBoundingClientRect().left})));
 const back=labels.find(l=>l.text==='◀'),forward=labels.find(l=>l.text==='▶');
 expect(back&&forward,JSON.stringify(labels)).toBeTruthy();expect(back!.left).toBeLessThan(forward!.left);
 // A slider grows to the right: from its minimum, ArrowRight raises it and a click near its right end sets it high. The route's
 // own sliders need a measurement first; one added to the right-to-left page takes the same island rule, and a control with
 // direction:rtl shows what the island prevents (Chromium reverses a right-to-left range).
 const probe=(id:string,style:string)=>page.evaluate(([id,style])=>{const i=document.createElement('input');i.type='range';i.min='0';i.max='10';i.id=id;i.setAttribute('style',style);document.body.prepend(i);},[id,style]);
 await probe('rtl-probe-island','');await probe('rtl-probe-control','direction:rtl');
 const steps=async(id:string)=>{const r=page.locator('#'+id);await r.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');const key=Number(await r.inputValue());
  const b=(await r.boundingBox())!;await page.mouse.click(b.x+b.width*.9,b.y+b.height/2);return {direction:await r.evaluate(e=>getComputedStyle(e).direction),key,click:Number(await r.inputValue())};};
 expect(await steps('rtl-probe-island')).toEqual({direction:'ltr',key:1,click:9});
 expect(await steps('rtl-probe-control')).toEqual({direction:'rtl',key:0,click:1});
 // The sky map and its canvas.
 await load(page,'qps-rtl','observatory');
 await page.getByRole('button',{name:pseudoRtl(en['sky.open']),exact:true}).click();
 for(const s of ['canvas','svg[role=application],.sky-map svg,svg'])expect(await dir(page,s),s).toBe('ltr');
 expect(await page.evaluate(()=>{const c=document.createElement('canvas');document.body.append(c);const d=c.getContext('2d')!.direction,s=getComputedStyle(c).direction;c.remove();return [d,s];})).toEqual(['inherit','ltr']);
 // The antenna pad: East left of West, North above South, as on VIREO's sky.
 await load(page,'qps-rtl','radio-control');
 // Compiled defaults, manual access and the switch on, by test id (tests/radio-manual-app.spec.ts setupRadio).
 for(const t of ['radio-exercise','radio-env-compiled','radio-access','radio-timer-deliver','radio-switch'])await id(page,t).click();
 const pad=page.locator('.antenna-manual-pad');await expect(pad).toBeVisible();
 expect(await dir(page,'.antenna-manual-pad')).toBe('ltr');
 const cells=Object.fromEntries(await pad.locator('button').evaluateAll(b=>b.map(e=>[getComputedStyle(e).gridRowStart,{area:getComputedStyle(e).gridRowStart,left:e.getBoundingClientRect().left,top:e.getBoundingClientRect().top}] as const)));
 expect(cells.n.top).toBeLessThan(cells.s.top);
 // East and West are shown once the antenna can move in azimuth; where they are, East is left of West.
 if(cells.e&&cells.w)expect(cells.e.left).toBeLessThan(cells.w.left);
 // The grid itself: column 1 is the left one, as in English (a right-to-left grid would put "e" at the right).
 expect(await pad.evaluate(e=>getComputedStyle(e).gridTemplateAreas)).toBe('". n ." "e . w" ". s ."');
 // The radio hot list's native rows keep their byte order: Pulsars.HTL's rows start with the pulsar's ID ("0320+39   3h 23m …").
 await id(page,'antenna-tracking').click();
 await id(page,'antenna-hotlist-file').setInputFiles(fileURLToPath(new URL('../../public/original/hotlists/Pulsars.HTL',import.meta.url)));
 await expect(id(page,'antenna-hotlist-source')).toContainText('Pulsars.HTL');
 await id(page,'antenna-hotlist-open').click();
 const row=await visualOrder(page,'[data-testid=antenna-hotlist-native-1]');expect(row.bytes).toMatch(/^0320\+39/);expect(row.screen).toBe(row.bytes);
 expect(await dir(page,'[data-testid=antenna-hotlist-native-1]')).toBe('ltr');
});
