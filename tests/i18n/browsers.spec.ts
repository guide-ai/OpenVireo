import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {contextLocale} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import en from '../../src/i18n/en.json' with {type:'json'};
import {TRANSLATED,helpText} from './languageText';

// Front ES-REL (plan, ES-REL item: "a WebKit and Firefox smoke"): the released language path in any engine. The suite runs it
// in Chromium; for the release it was also run with `--browser=firefox` and `--browser=webkit` (docs/I18N.md, ES-REL). An es-MX
// browser opens Spanish (boot, the core module, a route area, a lazy dialog, the help viewer), the selector changes and stores the
// language, an en-US browser stays English, and the Spanish home and a lab lay out at 320 px. Front PT-REL: this file was
// es-browsers.spec.ts; each released language runs the same smoke in its own browser (es-MX, pt-BR), its text read from its own
// sources (tests/i18n/languageText.ts), the Spanish titles unchanged.
const id=(page:Page,t:string)=>page.getByTestId(t);
async function open(page:Page,hash:string,save:string){
 await page.goto(`/#${hash}`);await expect(page.locator('.investigation-toolbar')).toContainText(save,{timeout:30_000});
}
const LAYOUT={skip:'[lang=en]:not(html)',explainOverflow:true} as const;

test('an en-US browser opens English, with the selector',async({page})=>{
 await open(page,'observatory',en['project.save']);
 await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.getByRole('heading',{level:1,name:en['sky.title']})).toBeVisible();
 await expect(id(page,'language-select')).toHaveValue('en');
});

for(const L of TRANSLATED.filter(l=>l.entry.released)){
const C=L.catalog,name=L.tag==='es-419'?'Spanish':L.entry.englishName,W=helpText(L.tag).webHelp;
test.describe(`in a ${name} browser`,()=>{
 test.use({locale:contextLocale(L.tag)});
 test(`${name} opens by the browser language: home, a lab area, a lazy dialog and the help viewer; the selector switches to English and back`,async({page})=>{
  test.setTimeout(120_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page,'observatory',C['project.save']);
  await expect(page.locator('html')).toHaveAttribute('lang',L.entry.htmlLang);await expect(page).toHaveTitle(C['app.documentTitle']);
  await expect(page.getByRole('heading',{level:1,name:C['sky.title']})).toBeVisible();
  // A route area (its text arrives with the route) and a lazily loaded dialog that reads vireo() and the maps.
  await open(page,'classification',C['project.save']);await expect(page.locator('h1:visible').first()).toBeVisible();
  await expect(page.locator('.class-controls label[for=class-source]')).toHaveText(C['classLink.source']);
  await open(page,'observatory',C['project.save']);
  await page.locator('.sky-card .card-heading > button').click();
  await id(page,'ob-set-coordinates').click();await expect(id(page,'ob-sky-coords').getByRole('heading')).toHaveText(L.originals['Enter Sky Coordinates for Slew']);
  await page.keyboard.press('Escape');
  // OpenVireo's help viewer.
  await id(page,'main-help-menu').click();await id(page,'main-help-web').click();
  await expect(id(page,'web-help')).toBeVisible();await expect(id(page,'web-help')).toContainText(W.groups[0].title);
  await page.keyboard.press('Escape');
  // The selector: to English (stored), then back.
  await id(page,'language-select').selectOption('en');await expect(id(page,'language-confirm')).toContainText(L.maps.languageChoice.title);
  await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
  await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('.investigation-toolbar')).toContainText(en['project.save']);
  expect(await page.evaluate(()=>localStorage.getItem('openvireo-language'))).toBe('en');
  await id(page,'language-select').selectOption(L.tag);
  await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
  await expect(page.locator('html')).toHaveAttribute('lang',L.entry.htmlLang);await expect(page.locator('.investigation-toolbar')).toContainText(C['project.save']);
  expect(errors).toEqual([]);
 });
 test(`at 320 px the ${name} home and the classification lab lay out without overflow or clipping`,async({page})=>{
  await page.addInitScript(()=>{try{localStorage.setItem('openvireo.tour.v1','done');}catch{/* about:blank */}});
  await page.setViewportSize({width:320,height:700});
  const problems:string[]=[];
  for(const hash of ['observatory','classification']){
   await open(page,hash,C['project.save']);await page.waitForLoadState('networkidle');
   await page.evaluate(async()=>{await document.fonts.ready;});
   for(const p of await layoutProblems(page,LAYOUT))problems.push(`${hash}: ${p}`);
  }
  expect(problems).toEqual([]);
 });
});
}
