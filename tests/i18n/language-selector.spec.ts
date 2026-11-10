import {type Browser,type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE} from '../fixtures/language';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};

// Front ES1 (docs/I18N.md; user decisions 1, 2, 5 and 9 of 2026-11-09): the English / Español selector at the foot of the header
// menu, its reload confirmation, storage failure and the "View original (English)" option. Front ES-REL: Spanish is released, so
// the browser language decides (any es-* opens Spanish, everything else English, only the first preference counts), a stored
// choice beats it, the `?lang=` link beats both, and the selector is shown on every load and remembers the choice in this browser.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
async function open(page:Page,query='',hash='observatory'){
 await page.goto(`/${query}#${hash}`);await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:15_000});
}
const blockStorageWrites=(page:Page)=>page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError');};});
const stored=(page:Page)=>page.evaluate(()=>localStorage.getItem('openvireo-language'));
/** A page whose browser reports `languages` (most preferred first), as navigator.languages does; Playwright's locale sets one. */
async function browserIn(browser:Browser,languages:readonly string[]):Promise<Page>{
 const page=await browser.newPage({locale:languages[0]||'en-US'});
 await page.addInitScript(list=>{Object.defineProperty(Navigator.prototype,'languages',{get:()=>Object.freeze([...list]),configurable:true});},[...languages]);
 return page;
}
/** Seeds the stored choice once, before the first load of this page (later loads keep what the page stored). */
const seedChoice=(page:Page,value:string)=>page.addInitScript(v=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('openvireo-language',v);sessionStorage.setItem('seeded','1');}},value);
async function languageOf(page:Page,query=''){await open(page,query);return page.locator('html').getAttribute('lang');}

test('the first browser language decides: es, es-MX, es-ES and es-419 open Spanish; en-US, en-US then es-MX, fr and none open English',async({browser})=>{
 test.setTimeout(120_000);
 for(const [languages,expected] of [[['es-MX'],'es-419'],[['es'],'es-419'],[['es-ES'],'es-419'],[['es-419','en'],'es-419'],[['en-US'],'en'],[['en-US','es-MX'],'en'],[['fr-FR','es-MX'],'en'],[[],'en']] as const){
  const page=await browserIn(browser,languages);
  expect(await languageOf(page),languages.join(',')).toBe(expected);
  await expect(page.locator('.investigation-toolbar')).toContainText(expected==='es-419'?es['project.save']:en['project.save']);
  // The selector is shown on every load since ES-REL, with the current language checked.
  await expect(id(page,'language-choice')).toBeVisible();await expect(id(page,expected==='es-419'?'language-es-419':'language-en')).toBeChecked();
  await expect(page.locator('[data-testid="language-choice"] legend')).toHaveText('Idioma / Language');
  await page.close();
 }
});

test('a stored choice beats the browser language, and a ?lang= link beats both for that load only',async({browser})=>{
 const spanishBrowser=await browserIn(browser,[SPANISH_LOCALE]);await seedChoice(spanishBrowser,'en');
 expect(await languageOf(spanishBrowser)).toBe('en');
 expect(await languageOf(spanishBrowser,'?lang=es-419')).toBe('es-419');expect(await stored(spanishBrowser)).toBe('en');
 expect(await languageOf(spanishBrowser)).toBe('en');
 await spanishBrowser.close();
 const englishBrowser=await browserIn(browser,['en-US']);await seedChoice(englishBrowser,'es-419');
 expect(await languageOf(englishBrowser)).toBe('es-419');
 expect(await languageOf(englishBrowser,'?lang=en')).toBe('en');
 // Anything else in storage or the address is ignored.
 await englishBrowser.evaluate(()=>localStorage.setItem('openvireo-language','ES-419'));
 expect(await languageOf(englishBrowser,'?lang=bogus')).toBe('en');
 await englishBrowser.close();
});

test('Cancel keeps the page, its language and its address; nothing is stored',async({page})=>{
 await open(page,'','spectrum');
 await id(page,'language-es-419').check();
 const dialog=id(page,'language-confirm');await expect(dialog).toBeVisible();await expect(id(page,'language-cancel')).toBeFocused();
 await expect(dialog).toContainText('The page will reload in Español, on the same page of the site.');
 await expect(dialog).toContainText('Work that is only on screen is lost');await expect(dialog).toContainText('Files you saved on your computer are not affected');
 // The pre-release preview note is gone; storage works here, so nothing says the choice is not remembered.
 await expect(id(page,'language-preview')).toHaveCount(0);await expect(id(page,'language-not-remembered')).toHaveCount(0);
 await id(page,'language-cancel').click();await expect(dialog).toHaveCount(0);
 await expect(id(page,'language-en')).toBeChecked();await expect(page.locator('html')).toHaveAttribute('lang','en');
 expect(new URL(page.url()).search).toBe('');expect(new URL(page.url()).hash).toBe('#spectrum');
 expect(await stored(page)).toBeNull();
 // Escape cancels too.
 await id(page,'language-es-419').check();await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 await expect(id(page,'language-en')).toBeChecked();expect(await stored(page)).toBeNull();
});

test('Save investigation in the dialog downloads the investigation; Change and reload stores the choice and opens the same page in Spanish',async({page})=>{
 await open(page,'','spectrum');
 await id(page,'language-es-419').check();
 const download=page.waitForEvent('download');await id(page,'language-save').click();
 expect((await download).suggestedFilename()).toMatch(/\.json$/);await expect(id(page,'language-confirm')).toBeVisible();
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');
 // The stored choice decides, so the address stays clean.
 expect(new URL(page.url()).search).toBe('');expect(new URL(page.url()).hash).toBe('#spectrum');
 await expect(page.locator('.investigation-toolbar')).toContainText(es['project.save']);
 await expect(id(page,'language-es-419')).toBeChecked();expect(await stored(page)).toBe('es-419');
 // It is remembered at the next load of this browser.
 expect(await languageOf(page)).toBe('es-419');
 // And back to English, with the dialog in Spanish.
 await id(page,'language-en').check();
 await expect(id(page,'language-confirm')).toContainText('¿Cambiar el idioma?');await expect(id(page,'language-confirm')).toContainText('La página se volverá a cargar en English');
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','en');expect(await stored(page)).toBe('en');
});

test('a change on a ?lang= load keeps the address deciding: the link parameter is updated as well as stored',async({page})=>{
 await open(page,'?lang=en');
 await id(page,'language-es-419').check();
 await Promise.all([page.waitForURL(/lang=es-419/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');expect(await stored(page)).toBe('es-419');
});

test('when this browser cannot store anything, the change still applies through the address and both options say they are not stored',async({page})=>{
 await blockStorageWrites(page);await open(page);
 await id(page,'language-es-419').check();
 await expect(id(page,'language-not-remembered')).toHaveText('This browser does not let OpenVireo store the choice, so it applies to this page load only.');
 await expect(id(page,'language-preview')).toHaveCount(0);
 await Promise.all([page.waitForURL(/lang=es-419/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');
 await id(page,'language-originals').check();
 await expect(id(page,'language-originals-note')).toHaveText('Este navegador no permite a OpenVireo guardar esta opción.');
});

test.describe('in a Spanish browser',()=>{
 test.use({locale:SPANISH_LOCALE});
 test('"View original (English)" is stored and applies at the next load: VIREO\'s menu names show in English, OpenVireo\'s text stays Spanish',async({page})=>{
  await open(page);
  await expect(id(page,'main-help-menu')).toContainText('Ayuda');
  await id(page,'language-originals').check();
  await expect(id(page,'language-originals-note')).toContainText('Se aplica la próxima vez que se cargue la página.');
  await expect(id(page,'main-help-menu')).toContainText('Ayuda');// not before the next load
  expect(await page.evaluate(()=>localStorage.getItem('openvireo-vireo-originals'))).toBe('1');
  await page.reload();await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:15_000});
  await expect(id(page,'main-help-menu')).toContainText('Help');await expect(id(page,'main-help-menu')).toHaveAccessibleName('Menú de Ayuda del observatorio');
  await expect(page.locator('.investigation-toolbar')).toContainText(es['project.save']);
  await id(page,'language-originals').uncheck();await page.reload();await expect(id(page,'main-help-menu')).toContainText('Ayuda',{timeout:15_000});
 });
});
