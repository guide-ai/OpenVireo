import {type Browser,type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {FRENCH_LOCALE,INDONESIAN_LOCALE,PORTUGUESE_LOCALE,SPANISH_LOCALE} from '../fixtures/language';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import {CHINESE_SIMPLIFIED_TEXT,FRENCH_TEXT,HINDI_TEXT,INDONESIAN_TEXT,JAPANESE_TEXT,PORTUGUESE_TEXT,RUSSIAN_TEXT} from './languageText';

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
/** Front FR-REL, ID-REL and HI-REL: the options every load offers, in registry order (the released languages). */
const RELEASED_OPTIONS=['English','Español','Português (Brasil)','Français','Bahasa Indonesia','हिन्दी (Hindi)'];
/** Their values and `lang` attributes. */
const RELEASED_VALUES=[['en','en'],['es-419','es-419'],['pt-BR','pt-BR'],['fr','fr'],['id','id'],['hi','hi']];
/** Seeds the stored choice once, before the first load of this page (later loads keep what the page stored). */
const seedChoice=(page:Page,value:string)=>page.addInitScript(v=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('openvireo-language',v);sessionStorage.setItem('seeded','1');}},value);
async function languageOf(page:Page,query=''){await open(page,query);return page.locator('html').getAttribute('lang');}

test('the first browser language decides: es, es-MX, es-ES and es-419 open Spanish; en-US, en-US then es-MX, de and none open English',async({browser})=>{
 test.setTimeout(120_000);
 for(const [languages,expected] of [[['es-MX'],'es-419'],[['es'],'es-419'],[['es-ES'],'es-419'],[['es-419','en'],'es-419'],[['en-US'],'en'],[['en-US','es-MX'],'en'],[['de-DE','es-MX'],'en'],[[],'en']] as const){
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

test('Front SC8: the selector lists English, Español, (since PT-REL) Português (Brasil), (since FR-REL) Français, (since ID-REL) Bahasa Indonesia and (since HI-REL) हिन्दी (Hindi), each named and marked in its own language, and works from the keyboard',async({page})=>{
 await open(page);
 const select=page.getByRole('combobox',{name:'Idioma / Language'});
 await expect(select.locator('option')).toHaveText(RELEASED_OPTIONS);
 expect(await select.locator('option').evaluateAll(o=>o.map(x=>[(x as HTMLOptionElement).value,x.getAttribute('lang')]))).toEqual(RELEASED_VALUES);
 // Keyboard: focus the select and choose with the keyboard; the confirmation opens with Cancel focused, and Escape restores English.
 await select.focus();await expect(select).toBeFocused();
 await select.press('ArrowDown');
 if(!await id(page,'language-confirm').isVisible())await select.press('Enter');
 await expect(id(page,'language-confirm')).toBeVisible();await expect(id(page,'language-cancel')).toBeFocused();
 await page.keyboard.press('Escape');await expect(id(page,'language-confirm')).toHaveCount(0);await expect(select).toHaveValue('en');
});

// Front PT-REL (plan front-i18n-pt-br.md §4): Brazilian Portuguese is released. Every pt and pt-* browser (any case) opens it, as
// every es-* opens Spanish; Galician and a browser whose first language is another stay as they were; a stored choice and a
// `?lang=` link decide as for Spanish, and every load offers the released languages (RELEASED_OPTIONS).
test('Front PT-REL: pt, pt-BR, pt-PT and PT-br browsers open Português (Brasil); the first preference decides; a stored pt-BR beats the browser',async({browser})=>{
 test.setTimeout(180_000);
 const P=PORTUGUESE_TEXT;
 for(const [languages,expected] of [[['pt-BR'],'pt-BR'],[['pt'],'pt-BR'],[['pt-PT'],'pt-BR'],[['PT-br'],'pt-BR'],[['pt-BR','es-MX'],'pt-BR'],[['en-US','pt-BR'],'en'],[['es-MX','pt-BR'],'es-419'],[['gl'],'en']] as const){
  const page=await browserIn(browser,languages);
  expect(await languageOf(page),languages.join(',')).toBe(expected);
  await expect(page.locator('.investigation-toolbar')).toContainText(expected==='pt-BR'?P.catalog['project.save']:expected==='es-419'?es['project.save']:en['project.save']);
  const select=id(page,'language-select');
  await expect(select.locator('option')).toHaveText(RELEASED_OPTIONS);await expect(select).toHaveValue(expected);
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

// Front FR0 (plan front-i18n-fr.md §2) registered French behind its `?lang=fr` preview; Front FR-REL released it. Every fr and fr-*
// browser (any case) opens it; frr, br and a browser whose first language is another stay as they were; a stored choice and a
// `?lang=` link decide as for the other languages, and every load offers the released languages (RELEASED_OPTIONS: Français since
// FR-REL, Bahasa Indonesia since ID-REL, हिन्दी (Hindi) since HI-REL).
test('Front FR-REL: fr, fr-FR, fr-CA, fr-BE and FR-ch browsers open Français; the first preference decides; a stored fr beats the browser',async({browser})=>{
 test.setTimeout(180_000);
 const F=FRENCH_TEXT,P=PORTUGUESE_TEXT;
 for(const [languages,expected] of [[['fr'],'fr'],[['fr-FR'],'fr'],[['fr-CA'],'fr'],[['fr-BE'],'fr'],[['FR-ch'],'fr'],[['fr-SN','es-MX'],'fr'],[['en-US','fr-FR'],'en'],[['es-MX','fr-FR'],'es-419'],[['pt-BR','fr-FR'],'pt-BR'],[['frr'],'en'],[['br'],'en']] as const){
  const page=await browserIn(browser,languages);
  expect(await languageOf(page),languages.join(',')).toBe(expected);
  await expect(page.locator('.investigation-toolbar')).toContainText(expected==='fr'?F.catalog['project.save']:expected==='pt-BR'?P.catalog['project.save']:expected==='es-419'?es['project.save']:en['project.save']);
  const select=id(page,'language-select');
  await expect(select.locator('option')).toHaveText(RELEASED_OPTIONS);await expect(select).toHaveValue(expected);
  if(expected==='fr'){
   await expect(page).toHaveTitle(F.catalog['app.documentTitle']);await expect(page.getByRole('combobox',{name:F.maps.languageChoice.legend})).toBeVisible();
   expect(await select.locator('option').evaluateAll(o=>o.map(x=>[(x as HTMLOptionElement).value,x.getAttribute('lang')]))).toEqual(RELEASED_VALUES);
  }
  await page.close();
 }
 // A stored choice beats the browser both ways, and ?lang= beats both for that load only.
 const portuguese=await browserIn(browser,['pt-BR']);await seedChoice(portuguese,'fr');
 expect(await languageOf(portuguese)).toBe('fr');expect(await languageOf(portuguese,'?lang=pt-BR')).toBe('pt-BR');expect(await stored(portuguese)).toBe('fr');
 await portuguese.close();
 const french=await browserIn(browser,['fr-FR']);await seedChoice(french,'en');
 expect(await languageOf(french)).toBe('en');await french.close();
 // A change from French is stored (no longer a preview): the dialog is French, the page reloads at a clean address.
 const page=await browserIn(browser,['fr-FR']);
 await open(page,'','spectrum');
 await choose(page,'pt-BR');
 const dialog=id(page,'language-confirm');await expect(dialog).toContainText(F.maps.languageChoice.title);
 await expect(dialog).toContainText(F.maps.languageChoice.reload('Português (Brasil)'));await expect(id(page,'language-preview')).toHaveCount(0);
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','pt-BR');expect(await stored(page)).toBe('pt-BR');
 expect(new URL(page.url()).search).toBe('');expect(new URL(page.url()).hash).toBe('#spectrum');
 // And back to French from Portuguese.
 await choose(page,'fr');await expect(dialog).toContainText('Français');
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','fr');expect(await stored(page)).toBe('fr');
 await page.close();
});

// Front ZH0 (plan front-i18n-zh.md §2): Simplified Chinese is registered before its release. Only its `?lang=zh-Hans` preview reaches
// it and offers it; zh, zh-CN, zh-SG, zh-Hans-TW and zh-TW browsers and a stored zh-Hans get English with the released options.
test('Front ZH0: only a ?lang=zh-Hans preview opens and offers 简体中文; zh, zh-CN, zh-SG, zh-Hans-TW and zh-TW browsers and a stored zh-Hans get English',async({browser})=>{
 test.setTimeout(180_000);
 const Z=CHINESE_SIMPLIFIED_TEXT;
 for(const languages of [['zh'],['zh-CN'],['zh-SG'],['zh-Hans-TW'],['zh-TW'],['zh-CN','fr-FR']] as const){
  const page=await browserIn(browser,languages);
  const requests:string[]=[];page.on('request',r=>{if(/i18n-zh-Hans|\/zh-hans\//.test(r.url()))requests.push(r.url());});
  expect(await languageOf(page),languages.join(',')).toBe('en');
  await expect(id(page,'language-select').locator('option')).toHaveText(RELEASED_OPTIONS);
  expect(requests,`${languages.join(',')}: no Chinese module is fetched`).toEqual([]);
  await page.close();
 }
 const storedZh=await browserIn(browser,['zh-CN']);await seedChoice(storedZh,'zh-Hans');
 const storedRequests:string[]=[];storedZh.on('request',r=>{if(/i18n-zh-Hans|\/zh-hans\//.test(r.url()))storedRequests.push(r.url());});
 expect(await languageOf(storedZh)).toBe('en');expect(storedRequests,'a stored zh-Hans fetches no Chinese module').toEqual([]);await storedZh.close();
 const page=await browserIn(browser,['en-US']);
 expect(await languageOf(page,'?lang=zh-Hans')).toBe('zh-Hans');
 await expect(page.locator('.investigation-toolbar')).toContainText(Z.catalog['project.save']);await expect(page).toHaveTitle(Z.catalog['app.documentTitle']);
 const select=page.getByRole('combobox',{name:Z.maps.languageChoice.legend});
 await expect(select.locator('option')).toHaveText([...RELEASED_OPTIONS,'简体中文 (Simplified Chinese)']);await expect(select).toHaveValue('zh-Hans');
 expect(await select.locator('option').evaluateAll(o=>o.map(x=>[(x as HTMLOptionElement).value,x.getAttribute('lang')]))).toEqual([...RELEASED_VALUES,['zh-Hans','zh-Hans']]);
 // A change on the preview stores nothing (SC8): the choice travels as ?lang=, and the dialog, in Chinese, says so.
 await choose(page,'fr');
 const dialog=id(page,'language-confirm');await expect(dialog).toContainText(Z.maps.languageChoice.title);
 await expect(dialog).toContainText(Z.maps.languageChoice.reload('Français'));await expect(id(page,'language-preview')).toHaveText(Z.maps.languageChoice.preview);
 await Promise.all([page.waitForURL(/lang=fr/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','fr');expect(await stored(page)).toBeNull();
 await page.close();
});

test.describe('in a French browser',()=>{
 test.use({locale:FRENCH_LOCALE});
test('Front FR-REL: the keyboard steps across all the options without opening the dialog; Enter or leaving asks, Escape returns',async({page})=>{
 const F=FRENCH_TEXT;
 await open(page);await expect(page.locator('html')).toHaveAttribute('lang','fr');
 const select=page.getByRole('combobox',{name:F.maps.languageChoice.legend}),dialog=id(page,'language-confirm');
 await select.focus();await expect(select).toBeFocused();await expect(select).toHaveValue('fr');
 for(const [key,value] of [['ArrowUp','pt-BR'],['ArrowUp','es-419'],['ArrowUp','en'],['ArrowDown','es-419'],['ArrowDown','pt-BR'],['ArrowDown','fr'],['ArrowDown','id'],['ArrowDown','hi'],['Home','en'],['End','hi'],['ArrowUp','id'],['ArrowUp','fr'],['ArrowUp','pt-BR']] as const){
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
 expect(new URL(page.url()).search).toBe('');expect(await stored(page)).toBeNull();
});
});

// Front ID0 (plan front-i18n-id.md §2) registered Indonesian before its release, as FR0 had French: only its `?lang=id` preview
// reached it. Front ID-REL released it: id, id-ID, ID-id and the withdrawn code in, in-ID open it; Malay (ms-MY) and Javanese (jv-ID)
// do not; the first preference decides; a stored choice beats the browser both ways.
test('Front ID-REL: id, id-ID, ID-id, in and in-ID browsers open Bahasa Indonesia; ms-MY and jv-ID do not; the first preference decides; a stored id beats the browser',async({browser})=>{
 test.setTimeout(180_000);
 const I=INDONESIAN_TEXT,F=FRENCH_TEXT;
 for(const [languages,expected] of [[['id'],'id'],[['id-ID'],'id'],[['ID-id'],'id'],[['in'],'id'],[['in-ID'],'id'],[['id-ID','es-MX'],'id'],[['en-US','id-ID'],'en'],[['es-MX','id-ID'],'es-419'],[['fr-FR','id-ID'],'fr'],[['ms-MY'],'en'],[['jv-ID'],'en']] as const){
  const page=await browserIn(browser,languages);
  expect(await languageOf(page),languages.join(',')).toBe(expected);
  await expect(page.locator('.investigation-toolbar')).toContainText(expected==='id'?I.catalog['project.save']:expected==='fr'?F.catalog['project.save']:expected==='es-419'?es['project.save']:en['project.save']);
  const select=id(page,'language-select');
  await expect(select.locator('option')).toHaveText(RELEASED_OPTIONS);await expect(select).toHaveValue(expected);
  if(expected==='id'){
   await expect(page).toHaveTitle(I.catalog['app.documentTitle']);await expect(page.getByRole('combobox',{name:I.maps.languageChoice.legend})).toBeVisible();
   expect(await select.locator('option').evaluateAll(o=>o.map(x=>[(x as HTMLOptionElement).value,x.getAttribute('lang')]))).toEqual(RELEASED_VALUES);
  }
  await page.close();
 }
 // A stored choice beats the browser both ways, and ?lang= beats both for that load only.
 const french=await browserIn(browser,['fr-FR']);await seedChoice(french,'id');
 expect(await languageOf(french)).toBe('id');expect(await languageOf(french,'?lang=fr')).toBe('fr');expect(await stored(french)).toBe('id');
 await french.close();
 const indonesian=await browserIn(browser,['id-ID']);await seedChoice(indonesian,'en');
 expect(await languageOf(indonesian)).toBe('en');await indonesian.close();
 // A change from Indonesian is stored (no longer a preview): the dialog is Indonesian, the page reloads at a clean address.
 const page=await browserIn(browser,['id-ID']);
 await open(page,'','spectrum');
 await choose(page,'fr');
 const dialog=id(page,'language-confirm');await expect(dialog).toContainText(I.maps.languageChoice.title);
 await expect(dialog).toContainText(I.maps.languageChoice.reload('Français'));await expect(id(page,'language-preview')).toHaveCount(0);
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','fr');expect(await stored(page)).toBe('fr');
 expect(new URL(page.url()).search).toBe('');expect(new URL(page.url()).hash).toBe('#spectrum');
 // And back to Indonesian from French.
 await choose(page,'id');await expect(dialog).toContainText('Bahasa Indonesia');
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','id');expect(await stored(page)).toBe('id');
 await page.close();
});

test.describe('in an Indonesian browser',()=>{
 test.use({locale:INDONESIAN_LOCALE});
test('Front ID-REL: the keyboard steps across all the options without opening the dialog; Enter or leaving asks, Escape returns',async({page})=>{
 const I=INDONESIAN_TEXT;
 await open(page);await expect(page.locator('html')).toHaveAttribute('lang','id');
 const select=page.getByRole('combobox',{name:I.maps.languageChoice.legend}),dialog=id(page,'language-confirm');
 await select.focus();await expect(select).toBeFocused();await expect(select).toHaveValue('id');
 for(const [key,value] of [['ArrowUp','fr'],['ArrowUp','pt-BR'],['ArrowUp','es-419'],['ArrowUp','en'],['ArrowDown','es-419'],['ArrowDown','pt-BR'],['ArrowDown','fr'],['ArrowDown','id'],['ArrowDown','hi'],['Home','en'],['End','hi'],['ArrowUp','id'],['ArrowUp','fr']] as const){
  await page.keyboard.press(key);await expect(select,key).toHaveValue(value);await expect(dialog,`${key} → ${value}`).toHaveCount(0);await expect(select).toBeFocused();
 }
 // Enter asks for the pending option, by its own name, in Indonesian; Cancel returns to Indonesian.
 await page.keyboard.press('Enter');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(I.maps.languageChoice.reload('Français'));await expect(id(page,'language-cancel')).toBeFocused();
 await id(page,'language-cancel').click();await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('id');
 // Escape on the select drops a pending step; leaving the select with a pending step asks for it.
 await select.focus();await page.keyboard.press('Home');await expect(select).toHaveValue('en');
 await page.keyboard.press('Escape');await expect(select).toHaveValue('id');await expect(dialog).toHaveCount(0);
 await select.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await expect(select).toHaveValue('es-419');await expect(dialog).toHaveCount(0);
 await page.keyboard.press('Tab');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(I.maps.languageChoice.reload('Español'));
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('id');
 expect(await page.evaluate(()=>document.activeElement!==document.body&&document.activeElement!==null)).toBe(true);
 expect(new URL(page.url()).search).toBe('');expect(await stored(page)).toBeNull();
});
});

// Front RU0 (plan front-i18n-ru.md §2): Russian is registered before its release. Only its `?lang=ru` preview reaches it and offers
// it, as «Русский (Russian)» (a non-Latin autonym takes its English name); ru, ru-RU, ru-UA and RU-ru browsers, a Ukrainian browser
// and a stored ru get English with the released options, and fetch no Russian module.
/** The requests for Russian modules (the virtual i18n-ru-* chunks of the dev server, or src/i18n/ru/). */
function russianRequests(page:Page):string[]{
 const out:string[]=[];page.on('request',r=>{if(/openvireo-i18n\/i18n-ru-|\/src\/i18n\/ru\//.test(r.url()))out.push(r.url());});return out;
}
test('Front RU0: only a ?lang=ru preview opens and offers Русский; ru, ru-RU, ru-UA, RU-ru and uk browsers and a stored ru get English',async({browser})=>{
 test.setTimeout(180_000);
 const R=RUSSIAN_TEXT;
 for(const languages of [['ru'],['ru-RU'],['ru-UA'],['RU-ru'],['uk','ru']] as const){
  const page=await browserIn(browser,languages);const russian=russianRequests(page);
  expect(await languageOf(page),languages.join(',')).toBe('en');
  await expect(id(page,'language-select').locator('option')).toHaveText(RELEASED_OPTIONS);
  expect(russian,`${languages.join(',')}: no Russian module is fetched`).toEqual([]);
  await page.close();
 }
 const storedRu=await browserIn(browser,['ru-RU']);await seedChoice(storedRu,'ru');const storedRussian=russianRequests(storedRu);
 expect(await languageOf(storedRu)).toBe('en');expect(storedRussian).toEqual([]);await storedRu.close();
 const page=await browserIn(browser,['en-US']);
 expect(await languageOf(page,'?lang=ru')).toBe('ru');
 await expect(page.locator('.investigation-toolbar')).toContainText(R.catalog['project.save']);await expect(page).toHaveTitle(R.catalog['app.documentTitle']);
 const select=page.getByRole('combobox',{name:R.maps.languageChoice.legend});
 await expect(select.locator('option')).toHaveText([...RELEASED_OPTIONS,'Русский (Russian)']);await expect(select).toHaveValue('ru');
 expect(await select.locator('option').evaluateAll(o=>o.map(x=>[(x as HTMLOptionElement).value,x.getAttribute('lang')]))).toEqual([...RELEASED_VALUES,['ru','ru']]);
 // A change on the preview stores nothing (SC8): the choice travels as ?lang=, and the dialog, in Russian, says so.
 await choose(page,'fr');
 const dialog=id(page,'language-confirm');await expect(dialog).toContainText(R.maps.languageChoice.title);
 await expect(dialog).toContainText(R.maps.languageChoice.reload('Français'));await expect(id(page,'language-preview')).toHaveText(R.maps.languageChoice.preview);
 await Promise.all([page.waitForURL(/lang=fr/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','fr');expect(await stored(page)).toBeNull();
 await page.close();
});

test('Front RU0: on the ?lang=ru preview the keyboard steps across all six options without opening the dialog; Enter or leaving asks, Escape returns',async({page})=>{
 const R=RUSSIAN_TEXT;
 await open(page,'?lang=ru');await expect(page.locator('html')).toHaveAttribute('lang','ru');
 const select=page.getByRole('combobox',{name:R.maps.languageChoice.legend}),dialog=id(page,'language-confirm');
 await select.focus();await expect(select).toBeFocused();await expect(select).toHaveValue('ru');
 for(const [key,value] of [['ArrowUp','hi'],['ArrowUp','id'],['ArrowUp','fr'],['ArrowUp','pt-BR'],['ArrowUp','es-419'],['ArrowUp','en'],['ArrowDown','es-419'],['ArrowDown','pt-BR'],['ArrowDown','fr'],['ArrowDown','id'],['ArrowDown','hi'],['ArrowDown','ru'],['Home','en'],['End','ru'],['ArrowUp','hi'],['ArrowUp','id'],['ArrowUp','fr']] as const){
  await page.keyboard.press(key);await expect(select,key).toHaveValue(value);await expect(dialog,`${key} → ${value}`).toHaveCount(0);await expect(select).toBeFocused();
 }
 // Enter asks for the pending option, by its own name, in Russian; Cancel returns to Russian.
 await page.keyboard.press('Enter');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(R.maps.languageChoice.reload('Français'));await expect(id(page,'language-cancel')).toBeFocused();
 await id(page,'language-cancel').click();await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('ru');
 // Escape on the select drops a pending step; leaving the select with a pending step asks for it.
 await select.focus();await page.keyboard.press('Home');await expect(select).toHaveValue('en');
 await page.keyboard.press('Escape');await expect(select).toHaveValue('ru');await expect(dialog).toHaveCount(0);
 await select.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await expect(select).toHaveValue('es-419');await expect(dialog).toHaveCount(0);
 await page.keyboard.press('Tab');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(R.maps.languageChoice.reload('Español'));
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('ru');
 expect(await page.evaluate(()=>document.activeElement!==document.body&&document.activeElement!==null)).toBe(true);
 expect(new URL(page.url()).search).toBe('?lang=ru');expect(await stored(page)).toBeNull();
});

test.describe('in a Brazilian Portuguese browser',()=>{
 test.use({locale:PORTUGUESE_LOCALE});
test('Front PT0: the keyboard steps across all the options without opening the dialog; Enter or leaving asks, Escape returns',async({page})=>{
 // Front FR-REL: four options since French's release; Front ID-REL: five (Bahasa Indonesia); Front HI-REL: six (हिन्दी (Hindi) last).
 // SC8 review: on Chromium and Firefox (Windows, Linux) an arrow on the closed select fired `change` at once, so the confirmation
 // opened on the first arrow and the option after the next one could not be reached. Now a step only marks the option pending.
 // Front PT-REL: in a pt-BR browser, which opens Portuguese with no `?lang=`.
 const P=PORTUGUESE_TEXT;
 await open(page);await expect(page.locator('html')).toHaveAttribute('lang','pt-BR');
 const select=page.getByRole('combobox',{name:'Idioma / Language'}),dialog=id(page,'language-confirm');
 await select.focus();await expect(select).toBeFocused();await expect(select).toHaveValue('pt-BR');
 for(const [key,value] of [['ArrowUp','es-419'],['ArrowUp','en'],['ArrowDown','es-419'],['ArrowDown','pt-BR'],['Home','en'],['End','hi'],['ArrowUp','id'],['ArrowUp','fr'],['ArrowUp','pt-BR'],['ArrowUp','es-419'],['ArrowUp','en']] as const){
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

// Front HI0 (plan front-i18n-hi.md §2) registered Hindi behind its `?lang=hi` preview; Front HI-REL released it. Every hi and hi-*
// browser (any case) opens it, as «हिन्दी (Hindi)» in its own lang; en-IN, Urdu, Marathi and a browser whose first language is another
// stay as they were; a stored choice and a `?lang=` link decide as for the other languages, and every load offers the six released.
test('Front HI-REL: hi, hi-IN, HI-in and hi-Latn browsers open हिन्दी (Hindi); the first preference decides; a stored hi beats the browser',async({browser})=>{
 test.setTimeout(180_000);
 const H=HINDI_TEXT,F=FRENCH_TEXT;
 for(const [languages,expected] of [[['hi'],'hi'],[['hi-IN'],'hi'],[['HI-in'],'hi'],[['hi-Latn'],'hi'],[['hi-IN','es-MX'],'hi'],[['en-IN','hi-IN'],'en'],[['en-US','hi-IN'],'en'],[['es-MX','hi-IN'],'es-419'],[['fr-FR','hi-IN'],'fr'],[['ur-IN'],'en'],[['mr'],'en'],[['ne'],'en']] as const){
  const page=await browserIn(browser,languages);
  expect(await languageOf(page),languages.join(',')).toBe(expected);
  await expect(page.locator('.investigation-toolbar')).toContainText(expected==='hi'?H.catalog['project.save']:expected==='fr'?F.catalog['project.save']:expected==='es-419'?es['project.save']:en['project.save']);
  const select=id(page,'language-select');
  await expect(select.locator('option')).toHaveText(RELEASED_OPTIONS);await expect(select).toHaveValue(expected);
  if(expected==='hi'){
   await expect(page).toHaveTitle(H.catalog['app.documentTitle']);await expect(page.getByRole('combobox',{name:H.maps.languageChoice.legend})).toBeVisible();
   expect(await select.locator('option').evaluateAll(o=>o.map(x=>[(x as HTMLOptionElement).value,x.getAttribute('lang')]))).toEqual(RELEASED_VALUES);
  }
  await page.close();
 }
 // A stored choice beats the browser both ways, and ?lang= beats both for that load only.
 const portuguese=await browserIn(browser,['pt-BR']);await seedChoice(portuguese,'hi');
 expect(await languageOf(portuguese)).toBe('hi');expect(await languageOf(portuguese,'?lang=pt-BR')).toBe('pt-BR');expect(await stored(portuguese)).toBe('hi');
 await portuguese.close();
 const hindi=await browserIn(browser,['hi-IN']);await seedChoice(hindi,'en');
 expect(await languageOf(hindi)).toBe('en');await hindi.close();
 // A change from Hindi is stored (no longer a preview): the dialog is Hindi, the page reloads at a clean address.
 const page=await browserIn(browser,['hi-IN']);
 await open(page,'','spectrum');
 await choose(page,'fr');
 const dialog=id(page,'language-confirm');await expect(dialog).toContainText(H.maps.languageChoice.title);
 await expect(dialog).toContainText(H.maps.languageChoice.reload('Français'));await expect(id(page,'language-preview')).toHaveCount(0);
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','fr');expect(await stored(page)).toBe('fr');
 expect(new URL(page.url()).search).toBe('');expect(new URL(page.url()).hash).toBe('#spectrum');
 // And back to Hindi from French: the French dialog names it by its autonym.
 await choose(page,'hi');await expect(dialog).toContainText('हिन्दी');
 await Promise.all([page.waitForEvent('load'),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','hi');expect(await stored(page)).toBe('hi');
 await page.close();
});

// Front JA0 (plan front-i18n-ja.md §2): Japanese is registered before its release. Only its `?lang=ja` preview reaches it and offers
// it, as «日本語 (Japanese)» (a non-Latin autonym carries its English name); ja, ja-JP and JA-jp browsers and a stored ja get English
// with the released options only.
test('Front JA0: only a ?lang=ja preview opens and offers 日本語 (Japanese); ja, ja-JP and JA-jp browsers and a stored ja get English',async({browser})=>{
 test.setTimeout(180_000);
 const J=JAPANESE_TEXT;
 // Nothing of Japanese is fetched there: neither its sources (src/i18n/ja/) nor a chunk (i18n-ja-*).
 const japaneseRequests=(page:Page)=>{const seen:string[]=[];page.on('request',r=>{if(/\/src\/i18n\/ja\/|i18n-ja-/.test(r.url()))seen.push(r.url());});return seen;};
 for(const languages of [['ja'],['ja-JP'],['JA-jp'],['ja-JP','es-MX']] as const){
  const page=await browserIn(browser,languages),seen=japaneseRequests(page);
  expect(await languageOf(page),languages.join(',')).toBe('en');
  await expect(id(page,'language-select').locator('option')).toHaveText(RELEASED_OPTIONS);
  await page.waitForLoadState('networkidle');expect(seen,languages.join(',')).toEqual([]);
  await page.close();
 }
 const storedJa=await browserIn(browser,['ja-JP']);await seedChoice(storedJa,'ja');const storedSeen=japaneseRequests(storedJa);
 expect(await languageOf(storedJa)).toBe('en');await storedJa.waitForLoadState('networkidle');expect(storedSeen).toEqual([]);await storedJa.close();
 const page=await browserIn(browser,['en-US']);
 expect(await languageOf(page,'?lang=ja')).toBe('ja');
 await expect(page.locator('.investigation-toolbar')).toContainText(J.catalog['project.save']);await expect(page).toHaveTitle(J.catalog['app.documentTitle']);
 const select=page.getByRole('combobox',{name:J.maps.languageChoice.legend});
 await expect(select.locator('option')).toHaveText([...RELEASED_OPTIONS,'日本語 (Japanese)']);await expect(select).toHaveValue('ja');
 expect(await select.locator('option').evaluateAll(o=>o.map(x=>[(x as HTMLOptionElement).value,x.getAttribute('lang')]))).toEqual([...RELEASED_VALUES,['ja','ja']]);
 // A change on the preview stores nothing (SC8): the choice travels as ?lang=, and the dialog, in Japanese, says so.
 await choose(page,'fr');
 const dialog=id(page,'language-confirm');await expect(dialog).toContainText(J.maps.languageChoice.title);
 await expect(dialog).toContainText(J.maps.languageChoice.reload('Français'));await expect(id(page,'language-preview')).toHaveText(J.maps.languageChoice.preview);
 await Promise.all([page.waitForURL(/lang=fr/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','fr');expect(await stored(page)).toBeNull();
 await page.close();
});

test('Front JA0: on the ?lang=ja preview the keyboard steps across all six options without opening the dialog; Enter asks, Escape returns',async({page})=>{
 const J=JAPANESE_TEXT;
 await open(page,'?lang=ja');await expect(page.locator('html')).toHaveAttribute('lang','ja');
 const select=page.getByRole('combobox',{name:J.maps.languageChoice.legend}),dialog=id(page,'language-confirm');
 await select.focus();await expect(select).toBeFocused();await expect(select).toHaveValue('ja');
 for(const [key,value] of [['ArrowUp','hi'],['ArrowUp','id'],['ArrowUp','fr'],['ArrowUp','pt-BR'],['ArrowUp','es-419'],['ArrowUp','en'],['ArrowDown','es-419'],['End','ja'],['Home','en'],['End','ja'],['ArrowUp','hi'],['ArrowUp','id'],['ArrowUp','fr']] as const){
  await page.keyboard.press(key);await expect(select,key).toHaveValue(value);await expect(dialog,`${key} → ${value}`).toHaveCount(0);await expect(select).toBeFocused();
 }
 await page.keyboard.press('Enter');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText(J.maps.languageChoice.reload('Français'));await expect(id(page,'language-cancel')).toBeFocused();
 await id(page,'language-cancel').click();await expect(dialog).toHaveCount(0);await expect(select).toHaveValue('ja');
 await select.focus();await page.keyboard.press('Home');await expect(select).toHaveValue('en');
 await page.keyboard.press('Escape');await expect(select).toHaveValue('ja');await expect(dialog).toHaveCount(0);
 expect(new URL(page.url()).search).toBe('?lang=ja');expect(await stored(page)).toBeNull();
});
