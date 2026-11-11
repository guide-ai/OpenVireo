import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale} from '../fixtures/language';
import {readFileSync} from 'node:fs';
import witness from '../../src/help/helpAll.witness.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import {translatedFor,helpText} from './languageText';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT-HELP: the spec runs for every translated language that translates the help files (tests/i18n/languageText.ts: its own
// catalog, originals, help viewer and web help maps, and the few help-file words it looks for), never hard-coded text. The Spanish
// tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser
// (Front PT-REL: the language loop's anonymous describe sets its browser locale, tests/fixtures/language.ts contextLocale).
// Front ES-HELP (docs/I18N.md): VIREO's help files in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). Every window's Help opens the
// translation (a web adaptation, labelled as such), "Ver original (inglés)" shows VIREO's exact English (the bundled file's own
// rows and text), the translation's search ignores accents, the Spectral Line Table is Spanish, and the windows fit at 320 and
// 1440 px. Run under a DejaVu-only fontconfig for the layout checks (see the ES-HELP section of docs/I18N.md).
const id=(p:Page,t:string)=>p.getByTestId(t);
const lists=witness.lists as Record<string,{rows:string[];topics:{index:number}[]}>;
const original=(path:string)=>readFileSync(new URL(`../../public/original/${path}`,import.meta.url),'latin1').split(/\r?\n/);
const WINDOWS=[['#observatory','telescope-help','OBSRVHLP.LST'],['#observatory','camera-help','CAMHLP.LST'],['#cluster-database','cluster-help','HRANALHLP.LST'],
 ['#photometer','photo-help','PHOTOHLP.LST'],['#spectrometer','spectrometer-index-help','SPECHLP.LST'],['#classification','class-help','CLASSHLP.LST'],
 ['#spectrum','measure-help','MEASHLP.LST'],['#lss-wedge','wedge-help','WDGPLTHLP.LST'],['#pulsar-analysis','pulsar-analysis-help','PLSANHLP.LST']] as const;
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
async function noHorizontalScroll(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
}
const HELP_LANGUAGES=translatedFor('help').filter(l=>l.entry.help);
if(!HELP_LANGUAGES.some(l=>l.tag==='es-419'))throw new Error('tests/i18n/help.spec.ts: Spanish has no help files');

for(const L of HELP_LANGUAGES)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
/** A test title: Spanish keeps its ES-HELP title; another language names itself. */
const title=(es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName);
/** A route of this language: a released language by its browser language, a language before its release by its `?lang=` preview. */
const at=(path:string)=>path.replace(/^\/(?=#|$)/,`/${L.query}`);
/** A catalog key's text on this language's load (English until the area's sub-front translates it). */
const tr=(key:keyof typeof en)=>(L.catalog as Record<string,string>)[key]??en[key];
/** A VIREO literal in this language (src/i18n/<dir>/originals.json). */
const vireo=(key:string)=>L.originals[key]??key;
const H=helpText(L.tag),V=H.helpViewer;
const LABEL=V.translationLabel;

test(title('every instrument window opens its help in Spanish, and "Ver original (inglés)" shows VIREO\'s exact English',
 'every instrument window opens its help in <L>, and View original shows VIREO\'s exact English'),async({page})=>{
 test.setTimeout(120000);
 for(const [route,prefix,list] of WINDOWS){
  await page.goto('about:blank');// a hash-only change would keep the previous window's open dialog
  await page.goto(at(`/${route}`));
  if(prefix==='cluster-help'){// the cluster window's Help needs a loaded dataset (tests/cluster-hr-help.spec.ts)
   const lab=page.locator('.cluster-database-lab');
   await lab.getByLabel(tr('db.choose'),{exact:true}).selectOption('m67');await lab.getByRole('button',{name:tr('db.load'),exact:true}).click();
  }
  await id(page,`${prefix}-open`).click({timeout:20000});
  const topics=id(page,`${prefix}-topics`),rows=id(page,`${prefix}-topic-list`).getByRole('option'),expected=lists[list].rows;
  await expect(rows).toHaveCount(expected.length);
  // Translated rows: not VIREO's English, and labelled as a web adaptation.
  const spanishFirst=(await rows.first().textContent())!;
  expect(spanishFirst,list).not.toBe(expected[0]);
  await expect(id(page,`${prefix}-topics-view-label`)).toHaveText(LABEL);
  // Open the first topic in the language: the caption is VIREO's "Help - " in that language.
  const topicAt=lists[list].topics[0].index,spanishTitle=((await rows.nth(topicAt).textContent())!).trim();
  await rows.nth(topicAt).dblclick();
  const window=id(page,`${prefix}-window`);
  await expect(window.getByRole('heading',{name:`${vireo('Help -')} ${spanishTitle}`})).toBeVisible();
  const spanishText=(await id(page,`${prefix}-topic-text`).textContent())!;
  // View original: the same topic, VIREO's exact English rows and text.
  await id(page,`${prefix}-view-switch`).click();
  await expect(id(page,`${prefix}-view-label`)).toHaveText(V.originalLabel);
  await expect(id(page,`${prefix}-topic-text`)).toHaveAttribute('lang','en');
  expect(await id(page,`${prefix}-topic-text`).textContent()).not.toBe(spanishText);
  await id(page,`${prefix}-topic-menu`).click();await window.getByRole('button',{name:new RegExp(`${escape(vireo('Show Help Topics...').replace(/\.\.\.$/,''))}|Show Help Topics`)}).click();
  await expect(rows).toHaveCount(expected.length);await expect(id(page,`${prefix}-topic-list`)).toHaveAttribute('lang','en');
  expect((await rows.allTextContents()).map(t=>t.replace(/\u00a0/g,' ')),list).toEqual(expected.map(r=>r===''?' ':r));
  await expect(topics).toBeVisible();
 }
});

test(title('the radio Help menu opens PULSRHLP in Spanish, and its original is VIREO\'s','the radio Help menu opens PULSRHLP in <L>, and its original is VIREO\'s'),async({page})=>{
 await page.goto(at('/#radio-control'));
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'radio-panel-window')).toBeVisible();
 await id(page,'radio-help-menu').click();await id(page,'radio-help-menu-topics').click();
 const rows=id(page,'radio-help-topic-list').getByRole('option'),expected=lists['PULSRHLP.LST'].rows;
 await expect(rows).toHaveCount(expected.length);await expect(rows.first()).toHaveText(H.pulsarFirstRow);
 await expect(id(page,'radio-help-topics-view-label')).toHaveText(LABEL);
 await id(page,'radio-help-topics-view-switch').click();
 await expect(rows.first()).toHaveText(expected[0]);await expect(id(page,'radio-help-topic-list')).toHaveAttribute('lang','en');
});

test(title('File › Exit Observatory shows the reminder in Spanish, and its original is VIREO\'s exact box text',
 'File › Exit Observatory shows the reminder in <L>, and its original is VIREO\'s exact box text'),async({page})=>{
 await page.goto(at('/#observatory'));
 await id(page,'fi-file-menu').click({timeout:20000});await id(page,'ob-exit').click();
 const box=id(page,'exit-reminder'),text=id(page,'exit-reminder-text');
 await expect(box.getByRole('heading',{name:vireo('** Exercise Finished? **')})).toBeVisible();
 await expect(text).toContainText(H.reminderQuestion);
 await expect(text).toContainText(vireo('Select "OK" to Quit Exercise, "Cancel" to Continue.'));
 await expect(id(page,'exit-reminder-view-label')).toHaveText(LABEL);
 await id(page,'exit-reminder-view-switch').click();
 await expect(text).toContainText('Are you SURE you have completely finished this exercise?');
 await expect(text).toContainText('Select "OK" to Quit Exercise, "Cancel" to Continue.');
 await expect(text).toHaveAttribute('lang','en');
 await id(page,'exit-reminder-cancel').click();await expect(box).toHaveCount(0);
});

test(title('a translation that cannot be loaded falls back to VIREO\'s original and says so (review S1)',
 'a <L> translation that cannot be loaded falls back to VIREO\'s original and says so'),async({page})=>{
 await page.route(new RegExp(`/i18n/${escape(L.entry.dir)}/help/CLASSHLP\\.LST\\.ts`),r=>r.abort());
 await page.goto(at('/#classification'));
 await id(page,'class-help-open').click({timeout:20000});
 await expect(id(page,'class-help-topics-translation-error')).toHaveText(V.translationError);
 const rows=id(page,'class-help-topic-list').getByRole('option');
 await expect(rows).toHaveCount(lists['CLASSHLP.LST'].rows.length);await expect(rows.first()).toHaveText(lists['CLASSHLP.LST'].rows[0]);
 await expect(id(page,'class-help-topics-view')).toHaveAttribute('data-view','original');
 await expect(id(page,'class-help-topic-list')).toHaveAttribute('lang','en');
});

test(title('the original view shows the bundled file\'s own text, and the translation comes back',
 'the original view shows the bundled file\'s own text, and the <L> translation comes back'),async({page})=>{
 await page.goto(at('/#classification'));
 await id(page,'class-help-open').click();
 await id(page,'class-help-topic-list').getByRole('option').nth(1).dblclick();
 await expect(id(page,'class-help-window')).toBeVisible();
 await expect(id(page,'class-help-view')).toHaveAttribute('data-view','translation');
 await id(page,'class-help-view-switch').click();
 await expect(id(page,'class-help-view')).toHaveAttribute('data-view','original');
 const text=original('help/CLASSHLP.TXT'),first=text.findIndex(l=>l==='**Load Spectrum**');
 const shown=await id(page,'class-help-topic-text').getByRole('option').allTextContents();
 const body=text.slice(first+1,first+1+12).map(l=>`  ${l}  `);
 expect(shown.slice(1,13).map(s=>s.trim())).toEqual(body.map(s=>s.trim()));
 await expect(id(page,'class-help-window').getByRole('heading')).toHaveText(`${vireo('Help -')} Load Spectrum`);
 await id(page,'class-help-view-switch').click();
 await expect(id(page,'class-help-view')).toHaveAttribute('data-view','translation');
 await expect(id(page,'class-help-topic-text')).toContainText(H.loadSpectrumText);
});

test(title('the translation\'s search ignores accents; the original keeps VIREO\'s rule','the <L> translation\'s search ignores accents; the original keeps VIREO\'s rule'),async({page})=>{
 await page.goto(at('/#classification'));
 await id(page,'class-help-open').click();
 await id(page,'class-help-topic-list').getByRole('option',{name:H.searchRow}).dblclick();
 await id(page,'class-help-topic-menu').click();await id(page,'class-help-search-text').click();
 await expect(id(page,'cluster-help-search-note')).toBeVisible();
 await id(page,'cluster-help-search-query').fill(H.searchQuery);
 await id(page,'cluster-help-search-top').click();
 const hit=id(page,'class-help-topic-text').getByRole('option',{selected:true});
 await expect(hit).toContainText(H.searchHit);
 // Not found: VIREO's box text in the language, with the query as typed.
 await id(page,'class-help-topic-menu').click();await id(page,'class-help-search-text').click();
 await id(page,'cluster-help-search-query').fill('zzzqq');await id(page,'cluster-help-search-top').click();
 await expect(id(page,'cluster-help-message')).toContainText(`"zzzqq${vireo('" Not Found.')}`);
 await id(page,'cluster-help-message').getByRole('button').click();
 // The original view: VIREO's A-Z rule, so an accent is not ignored (and the note is not shown).
 await id(page,'class-help-view-switch').click();
 await id(page,'class-help-topic-menu').click();await id(page,'class-help-search-text').click();
 await expect(id(page,'cluster-help-search-note')).toHaveCount(0);
 await id(page,'cluster-help-search-query').fill('FINE TUNE');await id(page,'cluster-help-search-top').click();
 await expect(id(page,'class-help-topic-text').getByRole('option',{selected:true})).toContainText('fine tune');
});

test(title('the Spectral Line Table is Spanish, with its help, and the original view is VIREO\'s English',
 'the Spectral Line Table is <L>, with its help, and the original view is VIREO\'s English'),async({page})=>{
 await page.goto(at('/#classification'));
 await id(page,'spl-open').click();
 const rows=id(page,'spl-rows').getByRole('option');
 await expect(rows).toHaveCount(30);await expect(rows.first()).toHaveText('3759.87   O III');
 await expect(rows.nth(2)).toHaveText('3933.68   Ca II (K line)');// VIREO's line names are kept (review S2, as ES5's line table)
 await expect(id(page,'spl-view-label')).toHaveText(LABEL);
 await rows.nth(2).dblclick();
 await expect(id(page,'spl-help').getByRole('heading',{name:vireo('Spectral Line Help')})).toBeFocused();
 await expect(id(page,'spl-help-text')).toContainText(H.lineHelpText);
 await id(page,'spl-view-switch').click();
 await expect(rows.nth(2)).toHaveText('3933.68   Ca II (K line)');
 await rows.nth(2).dblclick();
 await expect(id(page,'spl-help-text')).toContainText('First visible around A0');
 await expect(id(page,'spl-close')).toHaveText(V.spectralLines.close);
});

test(title('OpenVireo\'s own help opens in Spanish','OpenVireo\'s own help opens in <L>'),async({page})=>{
 await page.goto(at('/'));
 await id(page,'main-help-menu').click();await id(page,'main-help-web').click();
 const dialog=id(page,'web-help');
 await expect(dialog.getByRole('heading',{name:H.webHelp.caption,level:2})).toBeVisible();
 await expect(id(page,'web-help-topics')).toContainText(H.webHelp.groups[0].title);
 await id(page,'web-help-topics').getByRole('button').nth(3).click();
 await expect(id(page,'web-help-topic')).toBeVisible();
});

for(const width of [320,1440])test(title(`help windows fit at ${width} px`,`<L> help windows fit at ${width} px`),async({page})=>{
 await page.setViewportSize({width,height:width===320?700:1050});
 await page.goto(at('/#classification'));
 await id(page,'class-help-open').click();
 await id(page,'class-help-topic-list').getByRole('option',{name:H.controlsRow}).dblclick();
 await expect(id(page,'class-help-window')).toBeVisible();
 await noHorizontalScroll(page);
 const shot=L.tag==='es-419'?'es':L.tag;
 await page.screenshot({path:`test-results/${shot}-help-${width}-topic.png`});
 await id(page,'class-help-topic-menu').click();await id(page,'class-help-close-topic').click();
 await id(page,'spl-open').click();
 await expect(id(page,'spl-list')).toBeVisible();await noHorizontalScroll(page);
 await id(page,'spl-rows').getByRole('option').nth(2).dblclick();
 await expect(id(page,'spl-help')).toBeVisible();await noHorizontalScroll(page);
 await id(page,'spl-help').scrollIntoViewIfNeeded();
 await page.screenshot({path:`test-results/${shot}-help-${width}-lines.png`});
});
});
