// Front SC3 (plan analysis/front-plans/front-i18n-scripts.md § 2–4; docs/I18N.md "Script groundwork: fonts, line breaking
// and the route walk"): the site under the dev-only script-stress pseudo-locales (qps-cjk → ja, qps-deva → hi, qps-cyrl → ru)
// and the pinned test fonts of playwright.scripts.config.ts. For each variant at 320 and 1440 px the walk opens the home page,
// the 16 routes, the header menu, the options dialog, a popup menu, both help viewers and the About box, and asserts the pseudo marker,
// layoutProblems() and verticalInkProblems() (tests/fixtures/layoutProblems.ts). Problems that need a file this front may not
// edit are listed in KNOWN with the file and the reason, for SC11; an entry that no longer matches fails, so a fix is noticed.
// Also: the computed stacks and the platform faces of src/theme/scripts.css per language, the Han-unification probe (§ 2.2),
// and a check of the ink detector itself on controlled boxes. Geometric checks only; no pixel screenshots.
import {test,expect,type Page} from '@playwright/test';
import en from '../../src/i18n/en.json' with {type:'json'};
import {PSEUDO_SCRIPT} from '../../src/i18n/pseudoScripts';
import type {PseudoScriptLanguage} from '../../src/i18n/locale';
import {layoutProblems,verticalInkProblems} from '../fixtures/layoutProblems';

type Width=320|1440;
const VARIANTS=['qps-cjk','qps-deva','qps-cyrl'] as const satisfies readonly PseudoScriptLanguage[];
/** src/OpenVireo.tsx `Route`. */
const ROUTES=['observatory','spectrum','spectrometer','sky-exposure','star-exposure','galaxy-exposure','classification','photometer','cluster-database','pulsar-analysis','radio-control','lss-wedge','lss-survey','object-x','variable-stars','images'] as const;
const id=(page:Page,t:string)=>page.getByTestId(t);
// The walks are independent page sessions: spread them over the workers (CI gates the deploy on this config).
test.describe.configure({mode:'parallel'});
// A step that cannot act fails within seconds instead of spending the whole walk's budget.
test.use({actionTimeout:15_000});

/** Known problems, each with the file that must change and why it is not changed here (SC3 edits only scripts.css and its
 * tests; component, canvas and English CSS fixes are SC11's). `variants`/`widths` limit where it is expected.
 * `fontDependent`: the problem is within 2 px of the check's threshold and depends on a font file that differs between this
 * machine and CI (Noto Sans Devanagari, DejaVu; docs/I18N.md SC1), so it is tolerated where listed but not required. */
type Known=Readonly<{variants:readonly PseudoScriptLanguage[];widths:readonly Width[];step:string;problem:RegExp;file:string;why:string;fontDependent?:true}>;
// Front SC11 fixed the four SC3 entries (the rotated y-axis titles of PleiadesAnalysis.tsx and NativeClusterAnalysis.tsx under
// qps-cjk, the spectrum x-axis titles of SpectrumInstrument.tsx and ClassificationLab.tsx under qps-deva) with src/plotTextFit.ts.
const KNOWN:readonly Known[]=[];

async function settle(page:Page){
 await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
}
async function load(page:Page,variant:PseudoScriptLanguage,hash:string){
 // A full load each time (a change of #hash alone keeps the page and its state).
 await page.goto('about:blank');await page.goto(`/?lang=${variant}${hash?'#'+hash:''}`);
 await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:30_000});
 await settle(page);
}
/** Opens the header's tool panel at phone width (it is always shown from 600 px). */
async function headerTools(page:Page){
 const toggle=page.locator('.portal-header .tools-toggle');
 if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
}
/** With the dome open: adds two hot-list entries and shows the hot list. Add Current needs a pointing: point to coordinates
 * first, as tests/front-p-polish.spec.ts does. */
async function showHotList(page:Page,L:(english:string)=>string){
 if(!await page.locator('#point-ra').isVisible())await page.getByText(L(en['sky.coordinates']),{exact:true}).click();
 await page.locator('#point-ra').fill('1');await page.locator('#point-dec').fill('20');
 await page.getByRole('button',{name:L(en['sky.pointCoordinates']),exact:true}).click();
 for(const name of ['A','B']){
  await page.locator('.telescope-motion').getByTestId('ob-add-current').click({timeout:15_000});await id(page,'ob-entry-id').fill(name);await id(page,'ob-entry-ok').click();
  await id(page,'ob-info-box').getByRole('button').first().click();await expect(id(page,'ob-info-box')).toHaveCount(0);
 }
 await page.locator('.telescope-motion').getByTestId('ob-view-select').click();
 await expect(id(page,'ob-hotlist-rows')).toBeVisible();
}
/** Opens the hot list's popup menu (src/polish/PopupMenu.tsx) with a context-menu event 2 px inside a corner of its rows (for the
 * bottom-right, the corner nearest the viewport's, where the first placement is clamped), and returns the event's position and
 * the rendered box. A dispatched event: a right-click there waits on the window's open animation, and the menu reads only the
 * event's position. */
async function openHotListPopup(page:Page,corner:'top-left'|'bottom-right'){
 const event=await id(page,'ob-hotlist-rows').evaluate((el,corner)=>{const r=el.getBoundingClientRect();
  const [x,y]=corner==='top-left'?[r.left+2,r.top+2]:[Math.min(r.right,innerWidth)-2,Math.min(r.bottom,innerHeight)-2];
  el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:x,clientY:y}));return {x,y};},corner);
 const menu=id(page,'popup-menu');await expect(menu).toBeVisible();
 const box=await menu.evaluate(m=>{const r=m.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,items:m.querySelectorAll('[role=menuitem]').length};});
 return {menu,event,box};
}
const LAYOUT={skip:'[lang=en]:not(html)',crossingExempt:'.popup-menu',dialogs:'dialog[open],[role=dialog][aria-modal=true],[role=alertdialog][aria-modal=true]',topDialog:true,controls:'button,label,legend,h1,h2,h3,h4,select,input,summary,th,dt',explainOverflow:true} as const;

for(const variant of VARIANTS)for(const width of [320,1440] as const)
 test(`${variant} at ${width} px: home, the 16 routes, the menu, the options, a popup menu, both help viewers and About lay out without overflow, clipping or cut ink`,async({page})=>{
  test.setTimeout(300_000);
  await page.setViewportSize({width,height:width===320?700:1000});
  const L=PSEUDO_SCRIPT[variant];
  const problems=new Map<string,string>();
  /** Marker inside the topmost dialog when one is open, else on the page; then both checks. */
  const check=async(step:string)=>{
   await settle(page);
   const scope=page.locator('dialog[open]').last();
   const text=await (await scope.count()?scope:page.locator('body')).innerText();
   if(!text.includes('⟦'))problems.set('no pseudo marker ⟦: the text shown is not translated',step);
   for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
   for(const p of await verticalInkProblems(page))if(!problems.has(p))problems.set(p,step);
  };
  await load(page,variant,'');await check('home');
  for(const r of ROUTES){await load(page,variant,r);await check(r);}
  // The header menu (folded behind Tools below 600 px; every section starts open in an automated browser).
  await load(page,variant,'observatory');await headerTools(page);await check('header menu');
  // The options dialog: instructor mode (no password), the dome open, then Options.
  await id(page,'instructor-mode-open').click();await id(page,'instructor-mode-confirm-on').click();
  await expect(id(page,'instructor-mode-banner')).toBeVisible();
  if(width<600&&await page.locator('.portal-header .tools-toggle').getAttribute('aria-expanded')==='true')await page.locator('.portal-header .tools-toggle').click();
  await page.getByRole('button',{name:L(en['sky.open']),exact:true}).click();
  await page.locator('.telescope-motion').getByTestId('ob-options').click();
  await expect(id(page,'ob-options-dialog')).toBeVisible();await check('options dialog');
  await page.keyboard.press('Escape');await expect(id(page,'ob-options-dialog')).toBeHidden();
  // A form's popup menu (src/polish/PopupMenu.tsx), opened at the bottom-right corner of the hot list's rows, where its
  // position is clamped: it must stay inside the viewport with its longer labels.
  await showHotList(page,L);const {menu,box:at}=await openHotListPopup(page,'bottom-right');
  if(at.left<0||at.top<0||at.right>at.width+.5||at.bottom>at.height+.5)problems.set(`popup menu leaves the viewport (${Math.round(at.left)}–${Math.round(at.right)} × ${Math.round(at.top)}–${Math.round(at.bottom)} in ${at.width} × ${at.height})`,'popup menu');
  await check('popup menu');
  await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(id(page,'ob-hotlist-rows')).toBeHidden();
  // OpenVireo's help viewer.
  await id(page,'main-help-menu').click();await id(page,'main-help-web').click();
  await expect(id(page,'web-help')).toBeVisible();await check('help viewer (OpenVireo)');
  await page.keyboard.press('Escape');await expect(id(page,'web-help')).toHaveCount(0);
  // VIREO's help viewer: the telescope's topic list, then its first topic.
  await id(page,'telescope-help-open').click();
  const topics=id(page,'telescope-help-topic-list');await expect(topics).toBeVisible();await check('help viewer (VIREO topics)');
  await topics.getByRole('option').filter({hasNotText:/^-/}).first().dblclick();
  await expect(id(page,'telescope-help-window')).toBeVisible({timeout:15_000});await check('help viewer (VIREO topic)');
  await id(page,'telescope-help-topic-menu').click();await id(page,'telescope-help-close-topic').click();
  await expect(id(page,'telescope-help-window')).toHaveCount(0);
  // The About box.
  await id(page,'main-help-menu').click();await id(page,'main-help-site-about').click();
  await expect(id(page,'about-dialog')).toBeVisible();await check('About box');

  const known=KNOWN.filter(k=>k.variants.includes(variant)&&k.widths.includes(width));
  const unexpected=[...problems].filter(([p,step])=>!known.some(k=>(k.step===step)&&k.problem.test(p))).map(([p,step])=>`${step}: ${p}`);
  const stale=known.filter(k=>!k.fontDependent&&![...problems].some(([p,step])=>k.step===step&&k.problem.test(p))).map(k=>`${k.step}: ${k.problem} (${k.file}) no longer appears: remove it from KNOWN`);
  expect(unexpected,'layout problems not in KNOWN').toEqual([]);
  expect(stale,'KNOWN problems that disappeared').toEqual([]);
 });

// ---- Fonts: src/theme/scripts.css in the running app, under the test fonts -------------------------------------------------
type PlatformFont={familyName:string;postScriptName:string;glyphCount:number};
/** The platform faces that drew an element's text (DevTools CSS.getPlatformFontsForNode, as tests/scripts/fonts.scripts.ts). */
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
/** Text that is neither Latin, Cyrillic, digits nor general punctuation is drawn by `face` (and by nothing else but DejaVu). */
const SCRIPT_TEXT={ja:'望遠鏡で観測',  'zh-Hans':'用望远镜观测','zh-Hant':'用望遠鏡觀測',hi:'दूरबीन से मापें'} as const;
const FACE={ja:'Noto Sans CJK JP','zh-Hans':'Noto Sans CJK SC','zh-Hant':'Noto Sans CJK TC',hi:'Noto Sans Devanagari'} as const;
const MONO_FACE={ja:'Noto Sans Mono CJK JP','zh-Hans':'Noto Sans Mono CJK SC','zh-Hant':'Noto Sans Mono CJK TC',hi:'Noto Sans Devanagari'} as const;
/** A probe inserted into the running app (so the real sheets apply), under <html lang>. */
async function probe(page:Page,lang:string,text:string,nested=''){
 await page.evaluate(([lang,text,nested])=>{
  document.getElementById('sc3-probe')?.remove();document.documentElement.lang=lang;
  const div=document.createElement('div');div.id='sc3-probe';
  // The same text as a paragraph, a button (weight 550), code (the mono stack) and a dialog's hard-coded Tahoma stack.
  div.innerHTML=`<p id="sc3-p"></p><button id="sc3-b" type="button"></button><code id="sc3-c"></code><span id="sc3-n" class="ob-native"></span><p id="sc3-nested">${nested}</p>`;
  for(const id of ['sc3-p','sc3-b','sc3-c','sc3-n'])div.querySelector('#'+id)!.textContent=text;
  document.body.prepend(div);
 },[lang,text,nested] as const);
}
const tokenStack=async(page:Page,name:string)=>page.evaluate(n=>getComputedStyle(document.documentElement).getPropertyValue(n),name);

test('each script language gets its stack, its regional face and the Bold file; Russian and English keep the token stack',async({page})=>{
 await page.goto('/#observatory');await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});
 await probe(page,'en','Abc');
 const englishSans=await page.locator('#sc3-p').evaluate(e=>getComputedStyle(e).fontFamily);
 const englishMono=await page.locator('#sc3-c').evaluate(e=>getComputedStyle(e).fontFamily);
 expect(englishSans).toMatch(/^system-ui, -apple-system, "Segoe UI"/);
 for(const lang of ['ja','zh-Hans','zh-Hant','hi'] as const){
  await probe(page,lang,SCRIPT_TEXT[lang]);
  const family=await page.locator('#sc3-p').evaluate(e=>getComputedStyle(e).fontFamily);
  // Latin fonts first, then the script's own, then system-ui (scripts.css § 1; the exact lists are in scripts.test.ts).
  expect(family,lang).toMatch(new RegExp(`^-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", .*"${FACE[lang]}".*, system-ui, sans-serif$`));
  for(const [sel,face,bold] of [['#sc3-p',FACE[lang],false],['#sc3-b',FACE[lang],true],['#sc3-c',MONO_FACE[lang],false],['#sc3-n',FACE[lang],false]] as const){
   const fonts=await platformFonts(page,sel);
   const script=fonts.filter(f=>f.familyName!=='DejaVu Sans'&&f.familyName!=='DejaVu Sans Mono');
   expect(script.map(f=>f.familyName),`${lang} ${sel}`).toEqual([face]);
   // Buttons are weight 550: a named family reaches the Bold file (generic fallback stays Regular, docs/I18N.md SC1 (c)).
   expect(script[0].postScriptName,`${lang} ${sel}`).toMatch(bold?/-Bold$/:/-Regular$/);
  }
 }
 // Russian: the English stacks, Cyrillic from DejaVu.
 await probe(page,'ru','Телескоп');
 expect(await page.locator('#sc3-p').evaluate(e=>getComputedStyle(e).fontFamily)).toBe(englishSans);
 expect(await page.locator('#sc3-c').evaluate(e=>getComputedStyle(e).fontFamily)).toBe(englishMono);
 expect((await platformFonts(page,'#sc3-p')).map(f=>f.familyName)).toEqual(['DejaVu Sans']);
 expect(await tokenStack(page,'--ov-font-script')).toBe('');
});

test('nested text in another language gets its own language\'s face: autonyms on an English and on a Japanese page',async({page})=>{
 await page.goto('/#observatory');await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});
 const autonyms='<span id="a-ja" lang="ja">日本語</span> <span id="a-hans" lang="zh-Hans">简体中文</span> <span id="a-hant" lang="zh-Hant">繁體中文</span> <span id="a-hi" lang="hi">हिन्दी</span> <span id="a-ru" lang="ru">Русский</span>';
 for(const page$ of ['en','ja','zh-Hant'] as const){
  // On a Japanese page the Traditional autonym shares 體/中/文 with nothing Japanese drew here, and 中/文 with the Simplified one:
  // without a named family the first region's face would be reused (docs/I18N.md SC1 (a)).
  await probe(page,page$,'直骨','直骨'+autonyms);
  for(const [sel,face] of [['#a-ja','Noto Sans CJK JP'],['#a-hans','Noto Sans CJK SC'],['#a-hant','Noto Sans CJK TC'],['#a-hi','Noto Sans Devanagari']] as const)
   expect((await platformFonts(page,sel)).map(f=>f.familyName),`${page$} page, ${sel}`).toEqual([face]);
  // Russian (and English) text inside a script page keeps the page's stack: no rule sets a family on a nested non-script
  // language, so a native English mirror keeps the family of the dialog it sits in. Its letters come from the stack's first
  // font that has them: the Latin fonts it names first on a device that has one (none is among the test fonts, so here the
  // page's Latin face draws them: DejaVu on the English page, Noto Sans CJK on the others).
  expect((await platformFonts(page,'#a-ru')).map(f=>f.familyName),`${page$} page, #a-ru`).toEqual([page$==='en'?'DejaVu Sans':page$==='ja'?'Noto Sans CJK JP':'Noto Sans CJK TC']);
 }
});

test('Han unification: 令 and 化 draw the Japanese, Simplified and Traditional glyphs under ja, zh-Hans and zh-Hant',async({page})=>{
 // Measured, not compared with a stored image: the canvas ink box of each character in the probe's own computed font must equal
 // the ink box of the region's named face, and the three regions' boxes must differ (they do for 令 and 化 in Noto Sans CJK).
 await page.goto('/#observatory');await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});
 const ink=(lang:string,family?:string)=>page.evaluate(([lang,family])=>{
  document.documentElement.lang=lang;const p=document.createElement('p');p.textContent='令化';document.body.prepend(p);
  const cs=getComputedStyle(p),ctx=document.createElement('canvas').getContext('2d')!;
  ctx.font=`400 100px ${family?`"${family}"`:cs.fontFamily}`;p.remove();
  return [...'令化'].map(c=>{const m=ctx.measureText(c);return [m.actualBoundingBoxLeft,m.actualBoundingBoxRight,m.actualBoundingBoxAscent,m.actualBoundingBoxDescent].join('/');}).join(' ');
 },[lang,family] as const);
 const got:Record<string,string>={};
 for(const lang of ['ja','zh-Hans','zh-Hant'] as const){got[lang]=await ink(lang);expect(got[lang],lang).toBe(await ink(lang,FACE[lang]));}
 expect(new Set(Object.values(got)).size).toBe(3);
});

test('Russian hyphenation is an enhancement only: what this Chromium does with hyphens:auto is logged, nothing depends on it',async({page})=>{
 await page.goto('/?lang=qps-cyrl#observatory');await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});
 const heights=await page.evaluate(()=>{
  const p=document.createElement('p');p.style.cssText='width:120px;font-size:16px';p.textContent='Достопримечательности наблюдательной астрофизики';document.body.prepend(p);
  const auto=getComputedStyle(p).hyphens,h1=p.getBoundingClientRect().height;p.style.hyphens='manual';const h2=p.getBoundingClientRect().height;p.remove();return {auto,withRule:h1,manual:h2};
 });
 expect(heights.auto).toBe('auto');
 console.log(`hyphens:auto on Russian prose: ${heights.withRule===heights.manual?'no effect (no hyphenation dictionary in this Chromium)':'hyphenates'} (${heights.withRule} px vs ${heights.manual} px)`);
});

// ---- The ink detector itself, on controlled boxes ---------------------------------------------------------------------------
test('verticalInkProblems reports cut ink and cut lines, and stays quiet on roomy, scrolled, collapsed and hidden text',async({page})=>{
 const deva='क़्र्यूँ ड्ढुं ट्ठू र्द्धि';// conjuncts that stack below the line (qps-deva's stress)
 const box=(id:string,style:string,text:string,lang='hi')=>`<div id="${id}" lang="${lang}" style="font:16px 'Noto Sans Devanagari','Noto Sans CJK JP',sans-serif;${style}">${text}</div>`;
 const run=async(html:string)=>{await page.setContent(`<!doctype html><html lang="en"><body style="margin:20px">${html}</body></html>`);await page.evaluate(()=>document.fonts.ready);return verticalInkProblems(page);};
 // Positive: a one-line box as tall as the font size, overflow hidden: the stacked vowel signs are cut below.
 expect(await run(box('tight','height:16px;line-height:16px;overflow:hidden;width:400px',deva))).toEqual([expect.stringMatching(/^div “क़्र्यूँ.*”: ink cut by div \(.*px below\)$/)]);
 // Positive: three lines in a two-line box that does not scroll: the third line is cut off.
 const cut=await run(box('cut','height:52px;line-height:26px;overflow:hidden;width:30px',Array(4).fill(deva).join(' ')));
 expect(await page.locator('#cut').evaluate(e=>e.scrollHeight>e.clientHeight+26)).toBe(true);// precondition: more lines than fit
 expect(cut.some(p=>/: line cut off by div \(line 5\d…/.test(p)),cut.join('\n')).toBe(true);
 // Negative: the same text with room.
 expect(await run(box('roomy','line-height:2;overflow:hidden;width:400px',deva))).toEqual([]);
 // Negative: lines scrolled out of a scrolling box can be scrolled to.
 expect(await run(box('scroll','height:60px;line-height:30px;overflow:auto;width:90px',Array(6).fill(deva).join(' ')))).toEqual([]);
 // Negative: a closed <details> and a visually hidden label are not drawn.
 expect(await run(`<details style="overflow:hidden;height:30px"><summary>s</summary>${box('in','height:8px;overflow:hidden',deva)}</details>`)).toEqual([]);
 expect(await run(`<span lang="hi" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${deva}</span>`)).toEqual([]);
 // Negative: native English mirrors are skipped by default.
 expect(await run(box('mirror','height:16px;line-height:16px;overflow:hidden',deva,'en'))).toEqual([]);
});

// ---- English and Spanish do not change ----------------------------------------------------------------------------------------
for(const width of [320,1440] as const)
test(`en at ${width} px: a popup menu that fits keeps its first placement; one that leaves the viewport is moved just inside; one taller than it scrolls`,async({page})=>{
 await page.setViewportSize({width,height:width===320?700:1000});
 await page.goto('/#observatory');await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});await settle(page);
 await page.getByRole('button',{name:en['sky.open'],exact:true}).click();await showHotList(page,s=>s);
 // The placement before SC3: a 224 px menu and 40 px per item (the hot list's menu also has a note, which that ignored).
 // Within 1 px: the layout snaps fractional event positions.
 const near=(got:number,want:number)=>expect(Math.abs(got-want),`${got} vs ${want}`).toBeLessThanOrEqual(1);
 const first=(x:number,y:number,b:{width:number;height:number;items:number})=>({left:Math.max(4,Math.min(x,b.width-224)),top:Math.max(4,Math.min(y,b.height-40*b.items-8))});
 // At the rows' top-left the menu fits: the old placement.
 const fits=await openHotListPopup(page,'top-left'),f=first(fits.event.x,fits.event.y,fits.box);
 expect(fits.box.right).toBeLessThanOrEqual(fits.box.width);expect(fits.box.bottom).toBeLessThanOrEqual(fits.box.height);
 near(fits.box.left,f.left);near(fits.box.top,f.top);
 await page.keyboard.press('Escape');await expect(fits.menu).toHaveCount(0);
 // At the bottom-right corner: where the old placement left the viewport, the menu now ends 4 px inside it; elsewhere it is
 // the old placement.
 const corner=await openHotListPopup(page,'bottom-right'),c=first(corner.event.x,corner.event.y,corner.box),b=corner.box;
 const h=b.bottom-b.top,w=b.right-b.left;
 near(b.top,c.top+h>b.height?b.height-4-h:c.top);
 near(b.left,c.left+w>b.width?b.width-4-w:c.left);
 expect(b.left).toBeGreaterThanOrEqual(4);expect(b.top).toBeGreaterThanOrEqual(4);
 await page.keyboard.press('Escape');await expect(corner.menu).toHaveCount(0);
 // In a viewport lower than the menu: capped to the viewport, scrolling, and the keyboard brings the last item into view.
 await page.setViewportSize({width,height:200});
 const low=await openHotListPopup(page,'top-left');
 near(low.box.top,4);near(low.box.bottom,low.box.height-4);
 expect(await low.menu.evaluate(m=>m.scrollHeight>m.clientHeight)).toBe(true);
 await page.keyboard.press('ArrowUp');await expect(id(page,'popup-slew')).not.toBeFocused();
 const last=await low.menu.evaluate(m=>{const f=document.activeElement!.getBoundingClientRect(),r=m.getBoundingClientRect();return f.top>=r.top-1&&f.bottom<=r.bottom+1;});
 expect(last,'the focused item is scrolled into the menu').toBe(true);
});

for(const lang of ['en','es-419','pt-BR'] as const)for(const width of [320,1440] as const)
test(`${lang} at ${width} px computes the same styles with and without scripts.css, on the home page and every route`,async({page})=>{
 test.setTimeout(300_000);
 // Every element's computed values of the properties scripts.css sets, then the same after removing the sheet from the page.
 // The properties are read from the sheet itself before it is removed, so a new declaration is covered without a list here.
 const declaredProps=()=>page.evaluate(()=>{
  const sheet=[...document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]')].find(s=>s.dataset.viteDevId!.endsWith('/src/theme/scripts.css'))?.sheet;
  if(!sheet)throw new Error('scripts.css is not on the page');
  const declared=(rules:CSSRuleList):string[]=>[...rules].flatMap(r=>r instanceof CSSStyleRule?[...r.style]:r instanceof CSSGroupingRule?declared(r.cssRules):[]);
  return [...new Set(declared(sheet.cssRules))].sort();
 });
 const snapshot=(props:readonly string[])=>page.evaluate(props=>
  [document.documentElement,document.body,...document.body.querySelectorAll('*')].map(e=>{const s=getComputedStyle(e);return `${e.tagName.toLowerCase()}.${typeof e.className==='string'?e.className:''} `+props.map(p=>`${p}:${s.getPropertyValue(p)}`).join(';');}),props);
 // Removes the sheet, keeping it on the window so that restoreSheet() can put the same node back where it was.
 const withoutSheet=()=>page.evaluate(()=>{
  const sheet=[...document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]')].filter(s=>s.dataset.viteDevId!.endsWith('/src/theme/scripts.css'));
  if(sheet.length!==1)throw new Error(`scripts.css found ${sheet.length} times`);
  (window as unknown as {removedSheet:[Node,Node|null,Node]}).removedSheet=[sheet[0].parentNode!,sheet[0].nextSibling,sheet[0]];sheet[0].remove();
 });
 const restoreSheet=()=>page.evaluate(()=>{const [parent,next,node]=(window as unknown as {removedSheet:[Node,Node|null,Node]}).removedSheet;parent.insertBefore(node,next);});
 const same=(a:readonly string[],b:readonly string[])=>a.join('\n')===b.join('\n');
 for(const route of ['',...ROUTES]){
  await page.setViewportSize({width,height:width===320?700:1000});
  // A full load each time: a change of #hash alone would keep the page whose sheet was removed.
  await page.goto('about:blank');await page.goto(`/?lang=${lang}${route?'#'+route:''}`);
  await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});await expect(page.locator('h1:visible').first()).toBeVisible({timeout:30_000});
  await settle(page);
  if(width<600)await headerTools(page);
  // Front RTL-1: parts of every page arrive as lazy chunks loaded in effects after the first render, and one could arrive after
  // the snapshots below agreed, adding its elements to the second only (en at 320 px counted 1890, then 1896 without the sheet,
  // in CI: the six elements of the Multi-Spec card, src/multispec/MultiSpecLazy.tsx, mounted in the observatory view that every
  // route keeps). The walk waits for the shell's lazy parts (that card, the language selector and the View original option,
  // all shown for English and Spanish on every route), and accepts a comparison only when the page with the sheet is the same
  // before and after it (the same node put back), so any other late change retries instead of failing or passing by chance.
  // Front LAZY-OBS: the welcome ('') is the shell alone, which never loads the observatory and so has no Multi-Spec card.
  for(const part of [...(route?['ms-card']:[]),'language-choice','language-originals-choice'])await expect(page.getByTestId(part),part).toHaveCount(1,{timeout:30_000});
  // The route may still be filling in (lazy parts, loaded files): take the snapshot once two in a row agree (and fail if they
  // never do, rather than compare a page that is still changing).
  const props=await declaredProps();expect(props.length,props.join()).toBeGreaterThanOrEqual(15);
  let before=await snapshot(props),stable=false;
  for(let i=0;i<20&&!stable;i++){await settle(page);const again=await snapshot(props);stable=same(again,before);before=again;}
  expect(stable,`${lang} ${width} #${route}: the page settles before the comparison`).toBe(true);
  let after:string[]=[],bracketed=false;
  for(let attempt=0;attempt<5&&!bracketed;attempt++){
   await withoutSheet();after=await snapshot(props);await restoreSheet();
   const again=await snapshot(props);bracketed=same(again,before);before=again;
   if(!bracketed)test.info().annotations.push({type:'retried',description:`${lang} ${width} #${route}: the page changed around the comparison (attempt ${attempt+1})`});
  }
  expect(bracketed,`${lang} ${width} #${route}: the page with the sheet stays the same around the comparison`).toBe(true);
  expect(after.length,`${lang} ${width} ${route}`).toBe(before.length);
  // Each difference as "element property:before → property:after".
  const changed=before.flatMap((v,i)=>{if(v===after[i])return [];const a=v.split(';'),b=after[i].split(';');return [a.flatMap((x,j)=>x===b[j]?[]:[`${x} → ${b[j]}`]).join(', ')];});
  expect(changed,`${lang} ${width} #${route}: elements whose computed style scripts.css changed`).toEqual([]);
 }
});

// ---- Front SC11: canvas labels (src/components/canvasLabel.ts, used by the radio receiver's two canvases) -----------------------
test('canvas labels take the script stack of the page language and a background that covers the ink; English and Russian keep bold 13px sans-serif and the 16 px band',async({page})=>{
 await page.goto('/#observatory');await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});
 const out=await page.evaluate(async()=>{
  const module='/src/components/canvasLabel.ts';// served by the dev server
  const {canvasLabel}=await import(module) as typeof import('../../src/components/canvasLabel');
  await document.fonts.ready;
  const run=(lang:string,text:string)=>{
   document.documentElement.lang=lang;
   const c=document.createElement('canvas');c.width=400;c.height=60;document.body.append(c);
   const ctx=c.getContext('2d')!,box=canvasLabel(ctx,text,10,20),m=ctx.measureText(text),font=ctx.font;c.remove();
   return {font,box,inkTop:20-m.actualBoundingBoxAscent,inkBottom:20+m.actualBoundingBoxDescent,inkWidth:m.width};
  };
  const r={en:run('en','Pulse 12'),ru:run('ru','Импульс 12'),ja:run('ja','望遠鏡で観測 12'),hi:run('hi','दूरबीन से मापें 12')};
  document.documentElement.lang='en';return r;
 });
 for(const k of ['en','ru'] as const){expect(out[k].font,k).toBe('bold 13px sans-serif');expect(out[k].box,k).toEqual({x:10,y:20,width:Math.ceil(out[k].inkWidth),height:16});}
 expect(out.ja.font).toContain('"Noto Sans CJK JP"');expect(out.ja.font).toMatch(/^bold 13px "Hiragino Sans"/);expect(out.ja.font).toMatch(/sans-serif$/);
 expect(out.hi.font).toMatch(/^bold 13px "Noto Sans Devanagari"/);
 for(const k of ['ja','hi'] as const){
  expect(out[k].box.y,`${k} covers the ink's top`).toBeLessThanOrEqual(Math.min(20,out[k].inkTop));
  expect(out[k].box.y+out[k].box.height,`${k} covers the ink's bottom`).toBeGreaterThanOrEqual(Math.max(36,out[k].inkBottom));
 }
});
