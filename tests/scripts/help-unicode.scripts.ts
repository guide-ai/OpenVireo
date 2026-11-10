// Front SC7 (docs/I18N.md, "Script groundwork: Unicode help (SC7)"): VIREO's help viewer with a translated help set in Japanese,
// Devanagari and Cyrillic script (test-only stand-ins, tests/fixtures/help-unicode) on the help harness (tests/harness/help.tsx),
// under the pinned test fonts of playwright.scripts.config.ts, at 320 and 1440 px: the topic list, a topic with wrapped lines
// and a long unbroken word, its print preview and the Exit Observatory reminder lay out without overflow, clipping or cut ink
// (layoutProblems and verticalInkProblems of tests/fixtures/layoutProblems.ts, with the options of the SC3 route walk), and the
// help text is drawn in the script's own face. Geometric checks only; no pixel screenshots.
import {test,expect,type Page} from '@playwright/test';
import {layoutProblems,verticalInkProblems} from '../fixtures/layoutProblems';

const SETS=[
 {set:'ja',lang:'ja',topic:'露光の開始',face:/Noto Sans CJK JP/},
 {set:'hi',lang:'hi',topic:'एक्सपोज\u093cर लें',face:/Noto Sans Devanagari/},
 {set:'ru',lang:'ru',topic:'Начать экспозицию',face:/DejaVu Sans/},
] as const;
const LAYOUT={skip:'[lang=en]:not(html)',dialogs:'dialog[open],[role=dialog][aria-modal=true],[role=alertdialog][aria-modal=true]',topDialog:true,controls:'button,label,legend,h1,h2,h3,h4,select,input,summary,th,dt',explainOverflow:true} as const;
const id=(page:Page,t:string)=>page.getByTestId(t);
test.describe.configure({mode:'parallel'});
test.use({actionTimeout:15_000});

async function settle(page:Page){
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
}
/** The platform faces that drew a node's glyphs (DevTools CSS.getPlatformFontsForNode), as in tests/scripts/fonts.scripts.ts. */
async function facesOf(page:Page,selector:string):Promise<string[]>{
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const {root}=await cdp.send('DOM.getDocument',{depth:-1});
 const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
 const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
 await cdp.detach();
 return fonts.map(f=>f.familyName);
}

for(const {set,lang,topic,face} of SETS)for(const width of [320,1440] as const)
 test(`${set} at ${width} px: the topic list, a wrapped topic, its print preview and the reminder lay out without overflow, clipping or cut ink`,async({page})=>{
  await page.setViewportSize({width,height:width===320?700:1000});
  const problems=new Map<string,string>();
  const check=async(step:string)=>{
   await settle(page);
   for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
   for(const p of await verticalInkProblems(page))if(!problems.has(p))problems.set(p,step);
  };
  await page.goto(`/__harness/help/?set=${set}`);
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await id(page,'uh-open').click();
  await expect(id(page,'uh-topic-list')).toBeVisible();
  await check('topic list');
  await id(page,'uh-topic-list').getByRole('option',{name:topic,exact:true}).dblclick();
  await expect(id(page,'uh-window').getByRole('heading',{name:`Help - ${topic}`})).toBeVisible();
  await check('topic');
  expect(await facesOf(page,'[data-testid=uh-topic-text] li:nth-child(2)')).toEqual(expect.arrayContaining([expect.stringMatching(face)]));
  await id(page,'uh-topic-menu').click();await id(page,'uh-print-topic').click();
  await expect(id(page,'uh-print')).toBeVisible();
  await check('print preview');
  await id(page,'uh-print-close').click();
  await id(page,'uh-exit').click();
  await expect(id(page,'exit-reminder-text')).toBeVisible();
  await check('exit reminder');
  expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
 });
