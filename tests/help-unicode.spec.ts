import {test,expect,type Page} from '@playwright/test';
import {foldHelpText,helpTopicBodyText,parseHelpListText} from '../src/core/cleaHelp';
import {REMINDER_SELECT,reminderBoxTextOf} from '../src/help/mainHelp';
import {JA} from './fixtures/help-unicode/ja';
import {HI} from './fixtures/help-unicode/hi';
import {RU} from './fixtures/help-unicode/ru';

// Front SC7 (docs/I18N.md, "Script groundwork: Unicode help (SC7)"): VIREO's shared help viewer with a translated help set in
// Japanese, Devanagari and Cyrillic script (test-only stand-ins, tests/fixtures/help-unicode) on the help harness
// (tests/harness/help.tsx, dev server only). Expected rows come from the same text parsers the viewer uses, so these check the
// viewer's wiring (loading, wrapping, links, search, print, the original view, the reminder), not the parsers again.
const id=(p:Page,t:string)=>p.getByTestId(t);
const SETS={ja:{texts:JA,related:'関連項目'},hi:{texts:HI,related:'संबंधित विषय'},ru:{texts:RU,related:'СВЯЗАННЫЕ ТЕМЫ'}} as const;
type SetId=keyof typeof SETS;
const shown=(r:string)=>r===''?' ':r;
async function open(page:Page,set:SetId|'none'){
 await page.goto(`/__harness/help/${set==='none'?'':`?set=${set}`}`);
 await id(page,'uh-open').click();
 await expect(id(page,'uh-topic-list')).toBeVisible();
}
/** Opens the topic `title` (a topic row's title, without its indent) from the topic list. */
async function topic(page:Page,title:string){
 await id(page,'uh-topic-list').getByRole('option',{name:title,exact:true}).dblclick();
 await expect(id(page,'uh-window').getByRole('heading',{name:`Help - ${title}`})).toBeFocused();
}
const titles=(set:SetId)=>parseHelpListText(SETS[set].texts['CAMHLP.LST']).map(r=>r.title);
const bodyOf=(set:SetId,title:string)=>helpTopicBodyText(SETS[set].texts['CAMHLP.TXT'],title,SETS[set].related)!;
/** The fourth section ("Take Exposure" in VIREO): the one with an over-long line and five related topics. */
const section=(set:SetId)=>{const lines=SETS[set].texts['CAMHLP.TXT'].split('\n'),h=lines.flatMap((l,i)=>l.startsWith('**')?[i]:[]);
 return {title:lines[h[3]].slice(2,-2),lines:lines.slice(h[3]+1,h[4])};};

for(const set of Object.keys(SETS) as SetId[])test(`${set}: the index, a wrapped topic, a related link, Back and the original view`,async({page})=>{
 await open(page,set);
 await expect(page.locator('html')).toHaveAttribute('lang',{ja:'ja',hi:'hi',ru:'ru'}[set]);
 const rows=id(page,'uh-topic-list').getByRole('option');
 await expect(rows).toHaveText(titles(set).map(shown));
 await expect(id(page,'uh-topics-view-label')).toHaveText('Translation: an OpenVireo web adaptation (not CLEA\'s)');
 const {title:take,lines}=section(set),body=bodyOf(set,take);
 expect(body.rows.length).toBeGreaterThan(lines.length+2);// some lines were wrapped
 await topic(page,take);
 const text=id(page,'uh-topic-text').getByRole('option');
 await expect(text).toHaveText(body.rows.map(shown));
 // The last related topic (VIREO's "Save Image", the index's sixth row) opens on double-click, and Back returns.
 const save=titles(set)[5].trim(),link=body.rows.findIndex((r,i)=>i>body.relatedIndex&&r.trim()===save);
 expect(link).toBeGreaterThan(body.relatedIndex);
 await text.nth(link).dblclick();
 await expect(id(page,'uh-window').getByRole('heading',{name:`Help - ${save}`})).toBeFocused();
 await id(page,'uh-back').click();
 await expect(id(page,'uh-window').getByRole('heading',{name:`Help - ${take}`})).toBeVisible();
 // VIREO's exact original, and back.
 await id(page,'uh-view-switch').click();
 await expect(id(page,'uh-window').getByRole('heading',{name:'Help - Take Exposure'})).toBeVisible();
 await expect(id(page,'uh-topic-text')).toHaveAttribute('lang','en');
 await expect(id(page,'uh-topic-text')).toContainText('To take an exposure using the CCD and IR cameras:');
 await id(page,'uh-view-switch').click();
 await expect(id(page,'uh-window').getByRole('heading',{name:`Help - ${take}`})).toBeVisible();
 await expect(text).toHaveText(body.rows.map(shown));
});

test('ja: search folds width and kana, Find Topic matches a half-width title, and Match case compares exactly',async({page})=>{
 await open(page,'ja');
 // Find Topic: "ccdかめらを閉じる" finds ＣＣＤカメラを閉じる.
 await id(page,'uh-topics-menu').click();await id(page,'uh-find-topic').click();
 await id(page,'cluster-help-search-query').fill('ccdかめらを閉じる');
 await expect(id(page,'cluster-help-search-note')).toBeVisible();
 await id(page,'cluster-help-search-top').click();
 await expect(id(page,'uh-topic-list').getByRole('option',{selected:true})).toHaveText('  ＣＣＤカメラを閉じる');
 await topic(page,'露光の開始');
 const rows=bodyOf('ja','露光の開始').rows,hit=rows.findIndex(r=>foldHelpText(r).includes('かめらと'));
 expect(hit).toBeGreaterThan(0);
 await id(page,'uh-topic-menu').click();await id(page,'uh-search-text').click();
 await id(page,'cluster-help-search-query').fill('かめらと');await id(page,'cluster-help-search-top').click();
 await expect(id(page,'uh-topic-text').getByRole('option',{selected:true})).toHaveText(rows[hit]);
 await id(page,'uh-topic-menu').click();await id(page,'uh-search-text').click();
 await id(page,'cluster-help-search-query').fill('かめらと');
 await id(page,'cluster-help-search').getByRole('checkbox').check();await id(page,'cluster-help-search-top').click();
 await expect(id(page,'cluster-help-message')).toContainText('"かめらと" Not Found.');
});

test('hi and ru: the nukta, case and ё are folded by the search',async({page})=>{
 for(const [set,title,query,expected] of [['hi','एक्सपोज\u093cर लें','एक्सपोजर टाइमर','एक्सपोज\u093cर टाइमर'],['ru','Установка усиления','ЕЁ ОСТАВЛЯЮТ','её оставляют']] as const){
  await open(page,set);await topic(page,title);
  await id(page,'uh-topic-menu').click();await id(page,'uh-search-text').click();
  await id(page,'cluster-help-search-query').fill(query);await id(page,'cluster-help-search-top').click();
  await expect(id(page,'uh-topic-text').getByRole('option',{selected:true})).toContainText(expected);
 }
});

test('ja: Print Topic lays out the Unicode rows; a topic in a file the set does not translate falls back to the original',async({page})=>{
 await open(page,'ja');await topic(page,'露光の開始');
 await id(page,'uh-topic-menu').click();await id(page,'uh-print-topic').click();
 const preview=id(page,'uh-print');
 await expect(preview).toBeVisible();
 const lines=preview.locator('.cluster-print-line');
 const rows=bodyOf('ja','露光の開始').rows;
 await expect(lines).toHaveCount(4+rows.length);
 await expect(lines.nth(3)).toHaveText('Help - 露光の開始');
 for(const i of [1,rows.length-2])await expect(lines.nth(4+i)).toHaveText(rows[i]);
 await id(page,'uh-print-close').click();await expect(preview).toHaveCount(0);
 // スライダースイッチ points into ObsrvHlp.txt, which the stand-in does not translate: VIREO's original opens, with the note.
 await id(page,'uh-topic-menu').click();await id(page,'uh-window').getByRole('button',{name:'Show Help Topics...'}).click();
 await id(page,'uh-topic-list').getByRole('option',{name:'スライダースイッチ',exact:true}).dblclick();
 await expect(id(page,'uh-window').getByRole('heading',{name:'Help - Slider Switches'})).toBeVisible();
 await expect(id(page,'uh-translation-error')).toBeVisible();
});

test('the Exit Observatory reminder shows the translated reminder; without a help set the viewer shows the originals only',async({page})=>{
 for(const set of ['ja','hi','ru'] as const){
  await page.goto(`/__harness/help/?set=${set}`);
  await id(page,'uh-exit').click();
  const box=reminderBoxTextOf(SETS[set].texts['REMINDER.OBS'],REMINDER_SELECT);
  await expect.poll(()=>id(page,'exit-reminder-text').evaluate(e=>e.textContent)).toBe(box);
  await id(page,'exit-reminder-view-switch').click();
  await expect(id(page,'exit-reminder-text')).toContainText('Are you SURE you have completely finished this exercise?');
 }
 await open(page,'none');
 await expect(id(page,'uh-topic-list').getByRole('option').first()).toHaveText('-Taking CCD Images-');
 await expect(id(page,'uh-topics-view')).toHaveCount(0);
});
