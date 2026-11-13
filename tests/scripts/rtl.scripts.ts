// Front RT7 (plan analysis/front-plans/front-i18n-rtl.md § 5.2 and the RT7 row of § 9; docs/I18N.md "RTL groundwork: the RTL walk
// (RT7)"): the site under the dev-only right-to-left pseudo-locale `qps-rtl` (<html lang="ar" dir="rtl">) and the pinned test fonts of
// playwright.scripts.config.ts. At 320 and 1440 px the walk opens the home page and every route of src/components/routePages.ts, the
// header menu (the phone Tools panel at 320 px), the page bar's More and Help menus and Help › Websites, the options dialog, the hot
// list and its popup menu, both help viewers, About and every step of the tour, and after each step asserts (and no page error):
// - `<html lang="ar" dir="rtl">` and the pseudo marker ⟦;
// - layoutProblems() and verticalInkProblems() (tests/fixtures/layoutProblems.ts), as SC3's walk does for the script variants;
// - islandProblems() and mirrorProblems() (tests/fixtures/bidiProblems.ts): the islands of src/theme/rtl.css compute ltr, every
//   [lang] element its language's direction, and the sidebar, page bar, its menus, dialog close buttons and the tour card sit on
//   the mirrored side;
// - ltrRunProblems() (RT4): no isolate the runtime wrote is drawn out of order, anywhere; text outside the runtime (numbers and
//   English rendered straight into elements, composed English) is drawn left to right, or is listed in KNOWN;
// - below 600 px, the brand and the Tools button of the phone header do not overlap.
// Problems that need a later front are listed in KNOWN with the file and the owner; an entry that stops appearing fails, so a fix is
// noticed. The deep per-exercise walks run under qps-rtl in walks.scripts.ts with the same checks. Geometric checks only.
import {readFileSync} from 'node:fs';
import {test,expect,type Page} from '@playwright/test';
import en from '../../src/i18n/en.json' with {type:'json'};
import {pseudoRtl} from '../../src/i18n/pseudoRtl';
import {layoutProblems,verticalInkProblems} from '../fixtures/layoutProblems';
import {islandProblems,ltrRunProblems,mirrorProblems,rtlIslandSelectors} from '../fixtures/bidiProblems';
import * as OBS from '../i18n/walks/observatory';
import {RTL_SITES,knownProblem,type RtlOwner,type RtlSite,type RtlSiteName} from '../fixtures/rtlKnown';
import {translatedFor} from '../i18n/languageText';
import {contextLocale} from '../fixtures/language';

type Width=320|1440;
const src=(p:string)=>readFileSync(new URL(`../../src/${p}`,import.meta.url),'utf8');
/** The routes of src/components/routePages.ts (its `Route` type), without the welcome, which the walk opens first. */
const ROUTES=(/export type Route=([^;]+);/.exec(src('components/routePages.ts'))?.[1].match(/'[\w-]+'/g)??[]).map(s=>s.slice(1,-1)).filter(r=>r!=='home');
const ISLANDS=rtlIslandSelectors(src('theme/rtl.css'));
const id=(page:Page,t:string)=>page.getByTestId(t);
test.describe.configure({mode:'parallel'});
test.use({actionTimeout:15_000});

/** Known problems (tests/fixtures/rtlKnown.ts names each site's file, owner and reason): one entry per width set, exact step and
 * site, each required where it was measured. The step-by-step lists are in docs/I18N.md (RT7). */
type Known=Readonly<{widths:readonly Width[];step:string;problem:RegExp;file:string;owner:RtlOwner;why:string;literal?:true}>;
const at=(widths:readonly Width[],steps:string|readonly string[],...sites:readonly RtlSiteName[]):Known[]=>
 (typeof steps==='string'?[steps]:steps).flatMap(step=>sites.map(name=>{const site:RtlSite=RTL_SITES[name];return {widths,step,problem:site.problem,file:site.file,owner:site.owner,why:site.why,...(site.literal?{literal:true as const}:{})};}));
const BOTH=[320,1440] as const;
const KNOWN:readonly Known[]=[
 // Front LAUNCH-2: the star exposure's draws (drawsOf) and the catalog literals of the spectrometer, star exposure and classification
 // moved behind closed Research notes, so the walk no longer sees them; they are not fixed (RT8/RT12 still own them).
 ...at(BOTH,'spectrum','zValue','stepFactor'),...at(BOTH,'lss-survey','txtSuffix'),...at(BOTH,'variable-stars','variableResults'),
 ...at(BOTH,['photometer','radio-control','object-x'],'catalogLiteral'),
 ...at(BOTH,['help viewer (VIREO topics)','help viewer (VIREO topic)'],'helpRows'),...at([320],'help viewer (VIREO topics)','helpNote'),
 ...at([320],'home','brand'),
];

async function settle(page:Page){
 await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
}
async function load(page:Page,hash:string){
 await page.goto('about:blank');await page.goto(`/?lang=qps-rtl${hash?'#'+hash:''}`);
 await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:30_000});
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:30_000});
 await settle(page);
}
const toolsToggle=(page:Page)=>page.locator('.portal-header .tools-toggle');
async function headerTools(page:Page,open:boolean){
 const t=toolsToggle(page);
 if(await t.isVisible()&&(await t.getAttribute('aria-expanded')==='true')!==open)await t.click();
}
/** routes.scripts.ts's hot list: point, add two entries, show the list. */
async function showHotList(page:Page){
 const L=pseudoRtl;
 if(!await page.locator('#point-ra').isVisible())await page.getByText(L(en['sky.coordinates']),{exact:true}).click();
 await page.locator('#point-ra').fill('1');await page.locator('#point-dec').fill('20');
 await page.getByRole('button',{name:L(en['sky.pointCoordinates']),exact:true}).click();
 for(const name of ['A','B']){
  await page.locator('.telescope-motion').getByTestId('ob-add-current').click();await id(page,'ob-entry-id').fill(name);await id(page,'ob-entry-ok').click();
  await id(page,'ob-info-box').getByRole('button').first().click();await expect(id(page,'ob-info-box')).toHaveCount(0);
 }
 await page.locator('.telescope-motion').getByTestId('ob-view-select').click();
 await expect(id(page,'ob-hotlist-rows')).toBeVisible();
}
const LAYOUT={skip:'[lang=en]:not(html)',crossingExempt:'.popup-menu',dialogs:'dialog[open],[role=dialog][aria-modal=true],[role=alertdialog][aria-modal=true]',topDialog:true,controls:'button,label,legend,h1,h2,h3,h4,select,input,summary,th,dt',explainOverflow:true} as const;

/** Every check of one step, as "kind: problem" strings. */
async function stepProblems(page:Page):Promise<string[]>{
 const out:string[]=[];
 const [lang,dir]=await page.evaluate(()=>[document.documentElement.lang,document.documentElement.dir]);
 if(lang!=='ar'||dir!=='rtl')out.push(`html lang="${lang}" dir="${dir}", not ar/rtl`);
 const scope=page.locator('dialog[open]').last();
 if(!(await (await scope.count()?scope:page.locator('body')).innerText()).includes('⟦'))out.push('no pseudo marker ⟦: the text shown is not translated');
 for(const p of await layoutProblems(page,LAYOUT))out.push(`layout: ${p}`);
 for(const p of await verticalInkProblems(page))out.push(`ink: ${p}`);
 for(const p of await islandProblems(page,ISLANDS))out.push(`direction: ${p}`);
 for(const p of await mirrorProblems(page))out.push(`mirror: ${p}`);
 for(const p of await ltrRunProblems(page))out.push(`bidi ${p.kind}: “${p.run}” in ${p.where}`);
 // The phone header (below 600 px): the brand and the Tools button share one row and must not overlap (RT5's starting point).
 out.push(...await page.evaluate(()=>{
  const brand=document.querySelector('.portal-brand')?.getBoundingClientRect(),tools=document.querySelector('.portal-header .tools-toggle');
  const t=tools&&getComputedStyle(tools).display!=='none'?tools.getBoundingClientRect():null;
  return brand&&t&&brand.width&&t.width&&brand.left<t.right-.5&&t.left<brand.right-.5&&brand.top<t.bottom&&t.top<brand.bottom
   ?[`header: the brand (${Math.round(brand.left)}–${Math.round(brand.right)}) overlaps the Tools button (${Math.round(t.left)}–${Math.round(t.right)})`]:[];
 }));
 return out;
}

for(const width of [320,1440] as const)
 test(`qps-rtl at ${width} px: home, every route, the menus, the options, a popup menu, both help viewers, About and the tour mirror, keep their islands and read left to right where they must`,async({page})=>{
  test.setTimeout(420_000);
  await page.setViewportSize({width,height:width===320?700:1000});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const problems=new Map<string,string>();
  const check=async(step:string)=>{await settle(page);for(const p of await stepProblems(page))if(!problems.has(p))problems.set(p,step);};
  expect(ROUTES.length).toBe(16);
  await load(page,'');await check('home');
  for(const r of ROUTES){await load(page,r);await check(r);}
  await load(page,'observatory');
  // The header menu (folded behind Tools below 600 px).
  await headerTools(page,true);await check('header menu');await headerTools(page,false);
  // The page bar's More and Help menus.
  await id(page,'investigation-more').click();await expect(id(page,'investigation-menu')).toBeVisible();await check('More menu');
  await page.keyboard.press('Escape');await expect(id(page,'investigation-menu')).toHaveCount(0);
  await id(page,'main-help-menu').click();await expect(id(page,'main-help-web')).toBeVisible();await check('Help menu');
  await id(page,'main-help-websites').click();await expect(id(page,'help-websites-note')).toBeVisible();await check('Help › Websites');
  await page.keyboard.press('Escape');await expect(id(page,'main-help-web')).toBeHidden();
  // The options dialog: instructor mode (no password), the dome open, then Options.
  await headerTools(page,true);
  await id(page,'instructor-mode-open').click();await id(page,'instructor-mode-confirm-on').click();
  await expect(id(page,'instructor-mode-banner')).toBeVisible();
  await headerTools(page,false);
  await page.getByRole('button',{name:pseudoRtl(en['sky.open']),exact:true}).click();
  await page.locator('.telescope-motion').getByTestId('ob-options').click();
  await expect(id(page,'ob-options-dialog')).toBeVisible();await check('options dialog');
  await page.keyboard.press('Escape');await expect(id(page,'ob-options-dialog')).toBeHidden();
  // A form's popup menu at the hot list's rows (RT6 places it from the pointer toward the inline end).
  await showHotList(page);await check('hot list');
  await id(page,'ob-hotlist-rows').evaluate(el=>{const r=el.getBoundingClientRect();
   el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:Math.min(r.right,innerWidth)-40,clientY:r.top+4}));});
  const menu=id(page,'popup-menu');await expect(menu).toBeVisible();await check('popup menu');
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
  await page.keyboard.press('Escape');await expect(id(page,'about-dialog')).toBeHidden();
  // The tour, every step (started from Help: the first-visit start is skipped in automated browsers).
  await id(page,'main-help-menu').click();await id(page,'main-help-tour').click();
  const tour=id(page,'site-tour');await expect(tour).toBeVisible();
  for(let i=1;;i++){
   // (The outline moves with a .2 s transition.)
   await page.waitForTimeout(300);await check(`tour step ${i} (${await tour.getAttribute('data-step')})`);
   const next=id(page,'site-tour-next');if(!await id(page,'site-tour-skip').count()){await next.click();break;}
   await next.click();
  }
  await expect(tour).toHaveCount(0);

  expect(errors,'page errors').toEqual([]);
  const known=KNOWN.filter(k=>k.widths.includes(width));
  // (knownProblem: an isolate the bidi runtime wrote is never known, and a literal site's run must be written in src.)
  const matches=(k:Known,p:string,step:string)=>k.step===step&&knownProblem(k,p);
  expect([...problems].filter(([p,step])=>!known.some(k=>matches(k,p,step))).map(([p,step])=>`${step}: ${p}`),'problems not in KNOWN').toEqual([]);
  expect(known.filter(k=>![...problems].some(([p,step])=>matches(k,p,step))).map(k=>`${k.step}: ${k.problem} (${k.file}) no longer appears: remove it from KNOWN`),'KNOWN problems that disappeared').toEqual([]);
 });

test('the mirror, island and language-direction checks find what they exist for, on a page made left to right again',async({page})=>{
 test.setTimeout(120_000);
 await page.setViewportSize({width:1440,height:1000});
 await load(page,'observatory');
 expect(await mirrorProblems(page)).toEqual([]);expect(await islandProblems(page,ISLANDS)).toEqual([]);
 // An island and a nested English element that an inline style turned right to left, and a nested Arabic element left to right.
 await page.evaluate(()=>{
  const div=document.createElement('div');div.id='rt7-probe';
  div.innerHTML='<svg width="20" height="20" style="direction:rtl"></svg><span lang="en" style="direction:rtl">Save As…</span><span lang="ar" dir="ltr">نص</span>';
  document.body.prepend(div);
 });
 expect(await islandProblems(page,ISLANDS)).toEqual([expect.stringMatching(/^island svg: svg computes rtl$/),expect.stringMatching(/^island \[lang=en\]: span computes rtl$/),
  expect.stringMatching(/^lang=en: span computes rtl, not ltr$/),expect.stringMatching(/^lang=ar: span computes ltr, not rtl$/)]);
 await page.evaluate(()=>document.getElementById('rt7-probe')!.remove());
 // The same page with dir="ltr": the sidebar goes back to the left, the page bar's place to the left of its tools, and the More
 // menu aligns with its button's right edge.
 await page.evaluate(()=>{document.documentElement.dir='ltr';});
 await id(page,'investigation-more').click();await expect(id(page,'investigation-menu')).toBeVisible();
 const found=await mirrorProblems(page);
 for(const p of [/^sidebar ends at \d+, not at the right edge 1440$/,/^content .* reaches under the sidebar/,/^page bar: place .* is not right of its tools/,/^investigation-menu starts at \d+, not at its button's left edge/])
  expect(found.some(f=>p.test(f)),`${p} in ${JSON.stringify(found)}`).toBe(true);
});

test('ltrRunProblems reads a range of two numbers and a locale\'s right-to-left date as correct, and still finds a signed range and a hyphenated date',async({page})=>{
 // (The last case: an RLM beside a hyphenated date does not make it a locale format; only digits, / . : , ، and RLM or ALM do.)
 const cases=['جاف 3700–4700 Å جاف','جاف 1992–93 جاف','10\u200f/11\u200f/2026، 10:48:21 م','جاف −1–1، جاف','جاف 2009-06-01 04:00 جاف','جاف 2009\u200f-06-01 جاف'];
 await page.setContent(`<!doctype html><html lang="ar" dir="rtl"><body style="font:16px sans-serif;width:600px">${cases.map((c,i)=>`<p data-testid="c${i}">${c}</p>`).join('')}</body></html>`);
 const found=(await ltrRunProblems(page)).map(p=>`${/\[(c\d)\]/.exec(p.where)?.[1]} ${p.run}`);
 expect(found).toEqual(['c3 −1–1','c4 2009-06-01','c5 2009\u200f-06-01']);
 // And the KNOWN guard: no site, however wide its pattern, accounts for an isolate the runtime wrote; a literal site needs src.
 expect(knownProblem({problem:/.*/},'bidi isolate: “12.5-” in p')).toBe(false);
 expect(knownProblem(RTL_SITES.catalogLiteral,'bidi run: “−21.4” in p')).toBe(true);
 expect(knownProblem(RTL_SITES.catalogLiteral,'bidi run: “−21.4317” in p')).toBe(false);
});

// ---- Left-to-right pages: the plot titles RT7 wraps in keepInsideSvg do not move ----------------------------------------------
// src/plotTextFit.ts moves a title only when it crosses its plot by more than half a pixel. RT7 wraps the spectrum's rotated y-axis
// title (SpectrumInstrument.tsx) and the Multi-Spec spectrum's (MultiSpecDisplay.tsx), which crossed the left edge under Noto Sans
// Arabic; in English, Spanish, Portuguese and French they fit, so their wrapper carries no transform and nothing moves.
const titleShifts=(page:Page,svg:string)=>page.locator(svg).first().evaluate(s=>[...s.querySelectorAll('text[transform^="rotate(-90"]')].map(t=>{
 const g=t.parentElement!;return g.tagName.toLowerCase()==='g'&&g.attributes.length===0?null:`${t.textContent}: ${g.tagName} ${g.getAttribute('transform')}`;}).filter(Boolean));
for(const width of [320,1440] as const)
 test(`en, es-419, pt-BR and fr at ${width} px: the y-axis titles RT7 keeps inside their plots stay where they were`,async({page,browser,baseURL})=>{
  test.setTimeout(480_000);
  await page.setViewportSize({width,height:width===320?700:1000});
  for(const lang of ['en','es-419','pt-BR','fr']){
   await page.goto('about:blank');await page.goto(`/?lang=${lang}#spectrum`);
   await expect(page.locator('svg.spectrum').first()).toBeVisible({timeout:30_000});await settle(page);
   expect(await titleShifts(page,'svg.spectrum'),`${lang} spectrum`).toEqual([]);
  }
  // The Multi-Spec display and its print (the observatory walk's Multi-Spec steps), in English and in every language whose
  // observatory is translated (RT7 review: VIREO's Relative Intensity is translated there, so its length differs), each in a
  // context of its own (the walk installs the page clock).
  const shifts:string[]=[],seen=new Set<string>();
  for(const lang of ['en' as const,...translatedFor('observatory')]){
   const tag=typeof lang==='string'?lang:lang.tag,context=await browser.newContext({baseURL,locale:contextLocale(tag),viewport:{width,height:width===320?700:1000}}),p=await context.newPage();
   await OBS.multiSpecWalk(p,lang,async step=>{if(/spectrum display|print preview/.test(step))for(const s of ['[data-testid=ms-spectrum] svg','.ms-print-report svg'])if(await p.locator(s).count()){seen.add(`${tag} ${step} ${s}`);shifts.push(...(await titleShifts(p,s)).map(x=>`${tag} ${step} ${x}`));}});
   await context.close();
  }
  // Each language: the display's plot, and in the print preview both the display's and the print's.
  expect(seen.size,[...seen].join('; ')).toBe(3*(1+translatedFor('observatory').length));
  expect(shifts).toEqual([]);
 });
