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
const KNOWN:readonly Known[]=[
 {variants:VARIANTS,widths:[320,1440],step:'help viewer (OpenVireo)',problem:/^no pseudo marker ⟦/,file:'src/help/webHelp.ts (OpenVireo help texts)',
  why:'Not yet in the catalog: receipted as pending-translation in src/i18n/vireo-literals.json and translated by its own help front (ES-HELP edits src/help/** now). The layout checks still run on it.'},
 {variants:['qps-cjk'],widths:[320,1440],step:'photometer',problem:/^plot text “⟦[^”]*⟧” outside its plot card pleiades-analysis \(-\d, \d+, \d+, \d+\)$/,file:'src/PleiadesAnalysis.tsx:24 (rotated y-axis title at translate(18 290))',
  why:'Rotated, the title\'s glyph box is as wide as the font\'s ascent; Noto Sans CJK\'s ascent (1.16 em) passes the 18 px offset, so the box crosses the SVG\'s left edge by 1–2 px. Needs a larger offset in the component (SC11).'},
 {variants:['qps-cjk'],widths:[320,1440],step:'photometer',problem:/^plot text “⟦[^”]*⟧” outside its plot card pleiades-analysis native-cluster \(-\d, \d+, \d+, \d+\)$/,file:'src/NativeClusterAnalysis.tsx (rotated y-axis title, same offset as PleiadesAnalysis)',
  why:'Same rotated-title offset as PleiadesAnalysis.tsx; the CJK ascent box crosses the left edge by 1–2 px (SC11).'},
 {variants:['qps-deva'],widths:[320,1440],fontDependent:true,step:'spectrum',problem:/^plot text “⟦.*· Å⟧” outside its plot instrument card \(\d+, \d+, \d+, -\d+\)$/,file:'src/SpectrumInstrument.tsx (x-axis title at a fixed y)',
  why:'Devanagari vowel signs below the baseline reach under the SVG bottom edge; the title needs a higher y or dominant-baseline in the component (SC11).'},
 {variants:['qps-deva'],widths:[320,1440],fontDependent:true,step:'classification',problem:/^plot text “⟦.*· Å⟧” outside its plot class-plot printed-trace \(\d+, \d+, \d+, -\d+\)$/,file:'src/ClassificationLab.tsx (shares the spectrum plot axis title at a fixed y)',
  why:'Same axis title as the spectrum plot; Devanagari descenders cross the SVG bottom edge (SC11).'},
];

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
  // Add Current needs a pointing: point to coordinates first, as tests/front-p-polish.spec.ts does.
  if(!await page.locator('#point-ra').isVisible())await page.getByText(L(en['sky.coordinates']),{exact:true}).click();
  await page.locator('#point-ra').fill('1');await page.locator('#point-dec').fill('20');
  await page.getByRole('button',{name:L(en['sky.pointCoordinates']),exact:true}).click();
  for(const name of ['A','B']){
   await page.locator('.telescope-motion').getByTestId('ob-add-current').click({timeout:15_000});await id(page,'ob-entry-id').fill(name);await id(page,'ob-entry-ok').click();
   await id(page,'ob-info-box').getByRole('button').first().click();await expect(id(page,'ob-info-box')).toHaveCount(0);
  }
  await page.locator('.telescope-motion').getByTestId('ob-view-select').click();
  const rows=id(page,'ob-hotlist-rows');await expect(rows).toBeVisible();
  // The context-menu event at the corner of the rows that is nearest the viewport's bottom-right (a right-click there waits on
  // the window's open animation; the menu reads only the event's position).
  await rows.evaluate(el=>{const r=el.getBoundingClientRect(),x=Math.min(r.right,innerWidth)-2,y=Math.min(r.bottom,innerHeight)-2;
   el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:x,clientY:y}));});
  const menu=id(page,'popup-menu');await expect(menu).toBeVisible();
  const at=await menu.evaluate(m=>{const r=m.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};});
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
for(const lang of ['en','es-419'] as const)for(const width of [320,1440] as const)
test(`${lang} at ${width} px computes the same styles with and without scripts.css, on the home page and every route`,async({page})=>{
 test.setTimeout(300_000);
 // Every element's computed values of the properties scripts.css sets, then the same after removing the sheet from the page.
 const snapshot=()=>page.evaluate(()=>{
  const props=['font-family','font-size','line-height','letter-spacing','text-transform','font-synthesis-weight','line-break','text-autospace','overflow-wrap','hyphens','height','min-height','grid-template-columns','white-space','text-align','min-width','--ov-font-sans','--ov-font-mono','--ov-font-script'];
  return [document.documentElement,document.body,...document.body.querySelectorAll('*')].map(e=>{const s=getComputedStyle(e);return `${e.tagName.toLowerCase()}.${typeof e.className==='string'?e.className:''} `+props.map(p=>`${p}:${s.getPropertyValue(p)}`).join(';');});
 });
 const withoutSheet=()=>page.evaluate(()=>{
  const sheet=[...document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]')].filter(s=>s.dataset.viteDevId!.endsWith('/src/theme/scripts.css'));
  if(sheet.length!==1)throw new Error(`scripts.css found ${sheet.length} times`);sheet[0].remove();
 });
 for(const route of ['',...ROUTES]){
  await page.setViewportSize({width,height:width===320?700:1000});
  // A full load each time: a change of #hash alone would keep the page whose sheet was removed.
  await page.goto('about:blank');await page.goto(`/?lang=${lang}${route?'#'+route:''}`);
  await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});await expect(page.locator('h1:visible').first()).toBeVisible({timeout:30_000});
  await settle(page);
  if(width<600)await headerTools(page);
  // The route may still be filling in (lazy parts, loaded files): take the snapshot once two in a row agree.
  let before=await snapshot();
  for(let i=0;i<20;i++){await settle(page);const again=await snapshot();if(again.join('\n')===before.join('\n'))break;before=again;}
  await withoutSheet();const after=await snapshot();
  expect(after.length,`${lang} ${width} ${route}`).toBe(before.length);
  // Each difference as "element property:before → property:after".
  const changed=before.flatMap((v,i)=>{if(v===after[i])return [];const a=v.split(';'),b=after[i].split(';');return [a.flatMap((x,j)=>x===b[j]?[]:[`${x} → ${b[j]}`]).join(', ')];});
  expect(changed,`${lang} ${width} #${route}: elements whose computed style scripts.css changed`).toEqual([]);
 }
});
