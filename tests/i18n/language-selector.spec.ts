import {type Browser,type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {PORTUGUESE_LOCALE,SPANISH_LOCALE} from '../fixtures/language';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import {FRENCH_TEXT,PORTUGUESE_TEXT} from './languageText';

// Front ES1 (docs/I18N.md; user decisions 1, 2, 5 and 9 of 2026-11-09): the English / Español selector at the foot of the header
// menu, its reload confirmation, storage failure and the "View original (English)" option. Front ES-REL: Spanish is released, so
// the browser language decides (any es-* opens Spanish, everything else English, only the first preference counts), a stored
// choice beats it, the `?lang=` link beats both, and the selector is shown on every load and remembers the choice in this browser.
// Front SC8: the selector is a native <select> over the language registry (src/i18n/languages.ts): English and every released
// language by its own name, each option in its own language.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const choose=(page:Page,tag:string)=>id(page,'language-select').selectOption(tag);
async function open(page:Page,query='',hash='observatory'){
 await page.goto(`/${query}#${hash}`);await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:15_000});
}
const blockStorageWrites=(page:Page)=>page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError');};});
const stored=(page:Page)=>page.evaluate(()=>localStorage.getItem('openvireo-language'));
/** A page whose browser reports `languages` (most preferred first), as navigator.languages does; Playwright's locale sets one. */
async function browserIn(browser:Browser,languages:readonly string[]):Promise<Page>{
 const page=await browser.newPage({locale:languages[0]?Intl.getCanonicalLocales(languages[0])[0]:'en-US'});
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
  // The selector is shown on every load since ES-REL, with the current language selected.
  await expect(id(page,'language-choice')).toBeVisible();await expect(id(page,'language-select')).toHaveValue(expected);
  await expect(page.getByRole('combobox',{name:'Idioma / Language'})).toBeVisible();
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

test('Front SC8: the selector lists English, Español and (since PT-REL) Português (Brasil), each named and marked in its own language, and works from the keyboard',async({page})=>{
 await open(page);
 const select=page.getByRole('combobox',{name:'Idioma / Language'});
 await expect(select.locator('option')).toHaveText(['English','Español','Português (Brasil)']);
 expect(await select.locator('option').evaluateAll(o=>o.map(x=>[(x as HTMLOptionElement).value,x.getAttribute('lang')]))).toEqual([['en','en'],['es-419','es-419'],['pt-BR','pt-BR']]);
 // Keyboard: focus the select and choose with the keyboard; the confirmation opens with Cancel focused, and Escape restores English.
 await select.focus();await expect(select).toBeFocused();
 await select.press('ArrowDown');
 if(!await id(page,'language-confirm').isVisible())await select.press('Enter');
 await expect(id(page,'language-confirm')).toBeVisible();await expect(id(page,'language-cancel')).toBeFocused();
 await page.keyboard.press('Escape');await expect(id(page,'language-confirm')).toHaveCount(0);await expect(select).toHaveValue('en');
});

// Front PT-REL (plan front-i18n-pt-br.md §4): Brazilian Portuguese is released. Every pt and pt-* browser (any case) opens it, as
// every es-* opens Spanish; Galician and a browser whose first language is another stay as they were; a stored choice and a
// `?lang=` link decide as for Spanish, and every load offers English, Español and Português (Brasil).
test('Front PT-REL: pt, pt-BR, pt-PT and PT-br browsers open Português (Brasil); the first preference decides; a stored pt-BR beats the browser',async({browser})=>{
 test.setTimeout(180_000);
 const P=PORTUGUESE_TEXT;
 for(const [languages,expected] of [[['pt-BR'],'pt-BR'],[['pt'],'pt-BR'],[['pt-PT'],'pt-BR'],[['PT-br'],'pt-BR'],[['pt-BR','es-MX'],'pt-BR'],[['en-US','pt-BR'],'en'],[['es-MX','pt-BR'],'es-419'],[['gl'],'en']] as const){
  const page=await browserIn(browser,languages);
  expect(await languageOf(page),languages.join(',')).toBe(expected);
  await expect(page.locator('.investigation-toolbar')).toContainText(expected==='pt-BR'?P.catalog['project.save']:expected==='es-419'?es['project.save']:en['project.save']);
  const select=id(page,'language-select');
  await expect(select.locator('option')).toHaveText(['English','Español','Português (Brasil)']);await expect(select).toHaveValue(expected);
  if(expected==='pt-BR'){await expect(page).toHaveTitle(P.catalog['app.documentTitle']);await expect(page.getByRole('combobox',{name:'Idioma / Language'})).toBeVisible();}
  await page.close();
 }
 // A stored choice beats the browser both ways, and ?lang= beats both for that load only.
 const spanish=await browserIn(browser,[SPANISH_LOCALE]);await seedChoice(spanish,'pt-BR');
 expect(await languageOf(spanish)).toBe('pt-BR');expect(await languageOf(spanish,'?lang=es-419')).toBe('es-419');expect(await stored(spanish)).toBe('pt-BR');
 await spanish.close();
 const portuguese=await browserIn(browser,['pt-BR']);await seedChoice(portuguese,'en');
 expect(await languageOf(portuguese)).toBe('en');await portuguese.close();
 // A change from Portuguese is stored (no longer a preview): the dialog is Portuguese, the page reloads at a clean address.
 const page=await browserIn(browser,['pt-BR']);
 await open(page,'','spectrum');
 await choose(page,'es-419');
 const dialog=id(page,'language-confirm');await expect(dialog).toContainText(P.maps.languageChoice.title);
 await expect(dialog).toContainText(P.maps.languageChoice.reload('Español'));await expect(id(page,'language-preview')).toHaveCount(0);
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');expect(await stored(page)).toBe('es-419');
 expect(new URL(page.url()).search).toBe('');expect(new URL(page.url()).hash).toBe('#spectrum');
 // And back to Portuguese from Spanish.
 await choose(page,'pt-BR');await expect(dialog).toContainText('Português (Brasil)');
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','pt-BR');expect(await stored(page)).toBe('pt-BR');
 await page.close();
});

// Front FR0 (plan front-i18n-fr.md §2): French is registered before its release. Only its `?lang=fr` preview reaches it and offers
// it; fr, fr-FR, fr-CA and FR-ch browsers and a stored fr get English with English, Español and Português (Brasil) only.
/** Review (FR0): the requests for French modules (the virtual i18n-fr-* chunks of the dev server, or src/i18n/fr/). */
function frenchRequests(page:Page):string[]{
 const out:string[]=[];page.on('request',r=>{if(/openvireo-i18n\/i18n-fr-|\/src\/i18n\/fr\//.test(r.url()))out.push(r.url());});return out;
}
test('Front FR0: only a ?lang=fr preview opens and offers Français; fr, fr-FR, fr-CA and FR-ch browsers and a stored fr get English',async({browser})=>{
 test.setTimeout(180_000);
 const F=FRENCH_TEXT;
 for(const languages of [['fr'],['fr-FR'],['fr-CA'],['FR-ch'],['fr-BE','es-MX']] as const){
  const page=await browserIn(browser,languages);const french=frenchRequests(page);
  expect(await languageOf(page),languages.join(',')).toBe('en');
  await expect(id(page,'language-select').locator('option')).toHaveText(['English','Español','Português (Brasil)']);
  expect(french,`${languages.join(',')}: no French module is fetched`).toEqual([]);
  await page.close();
 }
 const storedFr=await browserIn(browser,['fr-FR']);await seedChoice(storedFr,'fr');const storedFrench=frenchRequests(storedFr);
 expect(await languageOf(storedFr)).toBe('en');expect(storedFrench).toEqual([]);await storedFr.close();
 const page=await browserIn(browser,['en-US']);
 expect(await languageOf(page,'?lang=fr')).toBe('fr');
 await expect(page.locator('.investigation-toolbar')).toContainText(F.catalog['project.save']);await expect(page).toHaveTitle(F.catalog['app.documentTitle']);
 const select=page.getByRole('combobox',{name:F.maps.languageChoice.legend});
 await expect(select.locator('option')).toHaveText(['English','Español','Português (Brasil)','Français']);await expect(select).toHaveValue('fr');
 expect(await select.locator('option').evaluateAll(o=>o.map(x=>[(x as HTMLOptionElement).value,x.getAttribute('lang')]))).toEqual([['en','en'],['es-419','es-419'],['pt-BR','pt-BR'],['fr','fr']]);
 // A change on the preview stores nothing (SC8): the choice travels as ?lang=, and the dialog, in French, says so.
 await choose(page,'pt-BR');
 const dialog=id(page,'language-confirm');await expect(dialog).toContainText(F.maps.languageChoice.title);
 await expect(dialog).toContainText(F.maps.languageChoice.reload('Português (Brasil)'));await expect(id(page,'language-preview')).toHaveText(F.maps.languageChoice.preview);
 await Promise.all([page.waitForURL(/lang=pt-BR/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','pt-BR');expect(await stored(page)).toBeNull();
 await page.close();
});

test('Front FR0: on the ?lang=fr preview the keyboard steps across all four options without opening the dialog; Enter or leaving asks, Escape returns',async({page})=>{
 const F=FRENCH_TEXT;
 await open(page,'?lang=fr');await expect(page.locator('html')).toHaveAttribute('lang','fr');
 const select=page.getByRole('combobox',{name:F.maps.languageChoice.legend}),dialog=id(page,'language-confirm');
 await select.focus();await expect(select).toBeFocused();await expect(select).toHaveValue('fr');
 for(const [key,value] of [['ArrowUp','pt-BR'],['ArrowUp','es-419'],['ArrowUp','en'],['ArrowDown','es-419'],['ArrowDown','pt-BR'],['ArrowDown','fr'],['Home','en'],['End','fr'],['ArrowUp','pt-BR']] as const){
  await page.keyboard.press(key);await expect(select,key).toHaveValue(value);await expect(dialog,`${key} → ${value}`).toHaveCount(0);await expect(select).toBeFocused();
 }
 // Enter asks for the pending option, by its own name, in French; Cancel returns to French.
 await page.keyboard.press('Enter');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(F.maps.languageChoice.reload('Português (Brasil)'));await expect(id(page,'language-cancel')).toBeFocused();
 await id(page,'language-cancel').click();await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('fr');
 // Escape on the select drops a pending step; leaving the select with a pending step asks for it.
 await select.focus();await page.keyboard.press('Home');await expect(select).toHaveValue('en');
 await page.keyboard.press('Escape');await expect(select).toHaveValue('fr');await expect(dialog).toHaveCount(0);
 await select.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await expect(select).toHaveValue('es-419');await expect(dialog).toHaveCount(0);
 await page.keyboard.press('Tab');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(F.maps.languageChoice.reload('Español'));
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('fr');
 expect(await page.evaluate(()=>document.activeElement!==document.body&&document.activeElement!==null)).toBe(true);
 expect(new URL(page.url()).search).toBe('?lang=fr');expect(await stored(page)).toBeNull();
});

test.describe('in a Brazilian Portuguese browser',()=>{
 test.use({locale:PORTUGUESE_LOCALE});
test('Front PT0: the keyboard steps across all three options without opening the dialog; Enter or leaving asks, Escape returns',async({page})=>{
 // SC8 review: on Chromium and Firefox (Windows, Linux) an arrow on the closed select fired `change` at once, so the confirmation
 // opened on the first arrow and the option after the next one could not be reached. Now a step only marks the option pending.
 // Front PT-REL: in a pt-BR browser, which opens Portuguese with no `?lang=`.
 const P=PORTUGUESE_TEXT;
 await open(page);await expect(page.locator('html')).toHaveAttribute('lang','pt-BR');
 const select=page.getByRole('combobox',{name:'Idioma / Language'}),dialog=id(page,'language-confirm');
 await select.focus();await expect(select).toBeFocused();await expect(select).toHaveValue('pt-BR');
 for(const [key,value] of [['ArrowUp','es-419'],['ArrowUp','en'],['ArrowDown','es-419'],['ArrowDown','pt-BR'],['Home','en'],['End','pt-BR'],['ArrowUp','es-419'],['ArrowUp','en']] as const){
  await page.keyboard.press(key);await expect(select,key).toHaveValue(value);await expect(dialog,`${key} → ${value}`).toHaveCount(0);await expect(select).toBeFocused();
 }
 // Enter asks for the pending option, by its own name, in the current language; Cancel returns to Portuguese.
 await page.keyboard.press('Enter');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(P.maps.languageChoice.reload('English'));await expect(id(page,'language-cancel')).toBeFocused();
 await id(page,'language-cancel').click();await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('pt-BR');
 // Escape on the select drops a pending step.
 await select.focus();await page.keyboard.press('ArrowUp');await expect(select).toHaveValue('es-419');
 await page.keyboard.press('Escape');await expect(select).toHaveValue('pt-BR');await expect(dialog).toHaveCount(0);
 // Leaving the select with a pending step asks for it. Front WEBKIT-SELECT: this step returns to the option Escape just dropped, for
 // which WebKit fires no `change` (it compares with its last `change`, which the page's own reset does not move); the step is read
 // from the select's value instead, so Tab asks in WebKit too.
 await select.focus();await page.keyboard.press('ArrowUp');await expect(dialog).toHaveCount(0);
 await page.keyboard.press('Tab');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(P.maps.languageChoice.reload('Español'));
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('pt-BR');
 // PT0 review: the dialog opened between elements; closing it never leaves the focus on the body (Chromium returned it there).
 expect(await page.evaluate(()=>document.activeElement!==document.body&&document.activeElement!==null)).toBe(true);
 expect(new URL(page.url()).search).toBe('');expect(await stored(page)).toBeNull();
 // A pick from the list (selectOption, as a mouse or touch pick) still asks at once.
 await choose(page,'en');await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(select).toHaveValue('pt-BR');
 // WEBKIT-SELECT review: a real mouse press on the select after Escape dropped a step, then a pick of that same option, asks for
 // it once. Headless Chromium opens the list, where the arrow moves and Enter picks (asking at once); headless Firefox and WebKit
 // open none, so the arrow is a step that Enter asks for (WebKit's mouse press, like focus, resets its `change` record, so
 // `change` fires for the dropped option).
 await select.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('Escape');await expect(select).toHaveValue('pt-BR');
 const box=(await select.boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await page.keyboard.press('ArrowUp');await expect(dialog).toHaveCount(0);await page.keyboard.press('Enter');
 await expect(dialog).toHaveCount(1);await expect(dialog).toContainText(P.maps.languageChoice.reload('Español'));
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('pt-BR');
});
});

test('Cancel keeps the page, its language and its address; nothing is stored',async({page})=>{
 await open(page,'','spectrum');
 await choose(page,'es-419');
 const dialog=id(page,'language-confirm');await expect(dialog).toBeVisible();await expect(id(page,'language-cancel')).toBeFocused();
 await expect(dialog).toContainText('The page will reload in Español, on the same page of the site.');
 await expect(dialog).toContainText('Work that is only on screen is lost');await expect(dialog).toContainText('Files you saved on your computer are not affected');
 // The pre-release preview note is gone; storage works here, so nothing says the choice is not remembered.
 await expect(id(page,'language-preview')).toHaveCount(0);await expect(id(page,'language-not-remembered')).toHaveCount(0);
 await id(page,'language-cancel').click();await expect(dialog).toHaveCount(0);
 await expect(id(page,'language-select')).toHaveValue('en');await expect(page.locator('html')).toHaveAttribute('lang','en');
 expect(new URL(page.url()).search).toBe('');expect(new URL(page.url()).hash).toBe('#spectrum');
 expect(await stored(page)).toBeNull();
 // Escape cancels too.
 await choose(page,'es-419');await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 await expect(id(page,'language-select')).toHaveValue('en');expect(await stored(page)).toBeNull();
});

test('Save investigation in the dialog downloads the investigation; Change and reload stores the choice and opens the same page in Spanish',async({page})=>{
 await open(page,'','spectrum');
 await choose(page,'es-419');
 const download=page.waitForEvent('download');await id(page,'language-save').click();
 expect((await download).suggestedFilename()).toMatch(/\.json$/);await expect(id(page,'language-confirm')).toBeVisible();
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');
 // The stored choice decides, so the address stays clean.
 expect(new URL(page.url()).search).toBe('');expect(new URL(page.url()).hash).toBe('#spectrum');
 await expect(page.locator('.investigation-toolbar')).toContainText(es['project.save']);
 await expect(id(page,'language-select')).toHaveValue('es-419');expect(await stored(page)).toBe('es-419');
 // It is remembered at the next load of this browser.
 expect(await languageOf(page)).toBe('es-419');
 // And back to English, with the dialog in Spanish.
 await choose(page,'en');
 await expect(id(page,'language-confirm')).toContainText('¿Cambiar el idioma?');await expect(id(page,'language-confirm')).toContainText('La página se volverá a cargar en English');
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','en');expect(await stored(page)).toBe('en');
});

test('a change on a ?lang= load keeps the address deciding: the link parameter is updated as well as stored',async({page})=>{
 await open(page,'?lang=en');
 await choose(page,'es-419');
 await Promise.all([page.waitForURL(/lang=es-419/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');expect(await stored(page)).toBe('es-419');
});

test('when this browser cannot store anything, the change still applies through the address and both options say they are not stored',async({page})=>{
 await blockStorageWrites(page);await open(page);
 await choose(page,'es-419');
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
