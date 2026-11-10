import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import es from '../../src/i18n/es/es.json' with {type:'json'};
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front ES-REL (docs/I18N.md; plan §3.5 and the ES-REL item): the full 320 px sweep in Spanish. The exercise specs (es-e01…e08,
// es-radio, es-observatory, es-help) walk each exercise's guide and VIREO dialogs at 320 and 1440 px; this sweep adds every route
// as a student first lands on it, the header menu with the language selector and its confirmation, OpenVireo's help and the
// About box, in an es-MX browser at 320 × 700 under the DejaVu fontconfig. Each step must be Spanish (<html lang="es-419">) and
// pass layoutProblems() (tests/fixtures/layoutProblems.ts): no page overflow; no dialog outside the viewport; no button, label,
// select, input or heading clipped, crossing its card or dialog, or outside the viewport; no plot text outside its SVG. Native
// views that mirror a written file stay English and scroll by design (`[lang=en]`, F2) and are left out.
const id=(page:Page,t:string)=>page.getByTestId(t);
/** src/OpenVireo.tsx `Route`, as tests/scripts/routes.scripts.ts walks them. */
const ROUTES=['observatory','spectrum','spectrometer','sky-exposure','star-exposure','galaxy-exposure','classification','photometer','cluster-database','pulsar-analysis','radio-control','lss-wedge','lss-survey','object-x','variable-stars','images'] as const;
const LAYOUT={skip:'[lang=en]:not(html)',crossingExempt:'.popup-menu',dialogs:'dialog[open],[role=dialog][aria-modal=true],[role=alertdialog][aria-modal=true]',topDialog:true,controls:'button,label,legend,h1,h2,h3,h4,select,input,summary,th,dt',explainOverflow:true} as const;
async function settle(page:Page){
 await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
}
async function load(page:Page,hash:string){
 // A full load each time (a change of #hash alone keeps the page and its state).
 await page.goto('about:blank');await page.goto(`/${hash?'#'+hash:''}`);
 await expect(page.locator('.investigation-toolbar')).toContainText(es['project.save'],{timeout:30_000});
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:30_000});
 await settle(page);
}
async function openMenu(page:Page){
 const toggle=page.locator('.portal-header .tools-toggle');
 if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
}

test('at 320 px every Spanish route, the menu with the language selector, OpenVireo\'s help and About lay out without overflow or clipping',async({page})=>{
 test.setTimeout(360_000);
 await page.addInitScript(()=>{try{localStorage.setItem('openvireo.tour.v1','done');}catch{/* about:blank */}});
 await page.setViewportSize({width:320,height:700});
 const problems=new Map<string,string>();
 const check=async(step:string)=>{
  await settle(page);
  await expect(page.locator('html'),step).toHaveAttribute('lang','es-419');
  for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
 };
 await load(page,'');await check('home');
 for(const r of ROUTES){await load(page,r);await check(r);}
 // The header menu (folded behind its button at phone width), with the selector at its foot, and the selector's confirmation.
 await load(page,'observatory');await openMenu(page);
 await id(page,'language-choice').scrollIntoViewIfNeeded();await expect(id(page,'language-select')).toHaveValue('es-419');await check('header menu');
 await id(page,'language-select').selectOption('en');await expect(id(page,'language-confirm')).toBeVisible();await check('language confirmation');
 await id(page,'language-cancel').click();await expect(id(page,'language-confirm')).toHaveCount(0);
 // OpenVireo's own help and the About box.
 await load(page,'observatory');
 await id(page,'main-help-menu').click();await id(page,'main-help-web').click();
 await expect(id(page,'web-help')).toBeVisible();await check('help viewer (OpenVireo)');
 await page.keyboard.press('Escape');await expect(id(page,'web-help')).toHaveCount(0);
 await id(page,'main-help-menu').click();await id(page,'main-help-site-about').click();
 await expect(id(page,'about-dialog')).toBeVisible();await check('About box');
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});
