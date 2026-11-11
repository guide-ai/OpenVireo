import {type Page,type Locator} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale,langQuery} from '../fixtures/language';
import {layoutProblems,type LayoutOptions} from '../fixtures/layoutProblems';
import {HEADER,CONTROL,PLR} from '../fixtures/pulsar-saved-rows-controls';
import en from '../../src/i18n/en.json' with {type:'json'};
import {TRANSLATED,textOf,e06Maps,type LanguageText} from './languageText';
import {PULSAR_REVIEW_BUTTONS,PULSAR_REVIEW_LITERALS} from '../../src/core/pulsarReview';
import {PULSAR_REVIEW_EDIT_DFM,PULSAR_REVIEW_EDIT_LITERALS} from '../../src/core/pulsarReviewEdit';
import {PULSAR_NATIVE_SAVE_TEXT as NS} from '../../src/core/pulsarNativeSave';
import {PULSAR_ACTIVATE_LITERALS as ACTIVATE} from '../../src/core/pulsarAnalysis';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT6: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, originals and pulsar maps,
// never hard-coded text). The Spanish tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser (Front PT-REL: an anonymous
// describe per language sets its browser locale, tests/fixtures/language.ts contextLocale). English and qps run once.
// Front ES8b (docs/I18N.md): exercise E06, the recorded pulsar analysis, in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk
// through the student flow runs in English, Spanish and the pseudo-locale: the empty route, the Pulsar guide, the supplied saved
// measurement file viewer (candidate, in use, Find, not found, refusal), a recording that has no rows (VIREO's "No Current Data to
// Analyze"), a loaded .PLR with its properties, the display controls, the print preview in both orientations, a manual
// measurement with the record dialog and its comment refusal, Review with Find, the comment editor, the delete question and the
// "No Item Selected!" notice, VIREO's Save with every question, the export and append dialogs and the clear questions.
// A second test follows a receiver capture (model data) into the analysis page: the raw .PLR download dialog, the verified Save
// dialog and the Load question.
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and the narrow patterns below (data read from the recording, file names, hashes, numbers with units);
// - qps: every visible text is marked ⟦…⟧, with the same exceptions;
// - the radio telescope route (receiver, access options, pulsar parameters: Front ES8a) is only crossed to make the capture;
//   its texts are not compared here. radioR1.findNote (the Find note under Review, ES8a's map) is compared like the rest.
// Recorded data stays English: the pulsar name of the recording, the stored header and rows of the saved-measurement file, the
// file names and the Review table's cells.
type Lang='en'|'qps'|LanguageText;
/** A test title: Spanish keeps its ES8b title; another language names itself and its tag. */
const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
const E=en as Record<string,string>;
/** Translated languages only: product and format names, units, symbols, and (SAME_IN) the words that read the same in that
 * language (its identical.json, with a reason each). The qps walk marks them all. */
const IDENTICAL=new Set<string>([
 'VIREO','OpenVireo','SHA-256','CSV','PLR','JSON','#','—','×','·','MHz','ms','px','CR LF','LF',
]);
const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={
 'es-419':new Set(['Bytes','Zoom','Horizontal','Panel','Vertical (s)','No']),
 // Portuguese also keeps VIREO's OK (Windows pt-BR; identical.json `original:OK`).
 'pt-BR':new Set(['Bytes','Zoom','Horizontal','Vertical (s)','OK']),
};
/** "Panel {n}" is the same in Spanish; Portuguese says «Painel {n}». */
const PANEL_IN:Readonly<Record<string,RegExp>>={'es-419':/^Panel \d$/};
/** Both walks: data of the synthetic recording and files (names, identities, comments) shown as stored, outside the `lang="en"`
 * file mirrors that texts() skips. */
const DATA=new Set<string>([
 'Pulsars.dat','CRLF','SYNTHETIC E2E','synthetic-e2e.plr','control.csv','bad.csv','run.CSV','run','first','second','first, with comma','target.csv','target-bad.csv',
 'PSR B2358+38','PSR B0329+54','PSR B0531+21','PSR B1919+21','Ada Student','Ben Student','Table Number: 3','10/22/2026, 9:41:07 AM',
]);
const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*(?:\s*(?:MHz|ms|s|m|px|bytes|Bytes))*\s*$/;
/** Recorded data, a SHA-256 hash or a number with its unit: the same in every language. */
const data=(text:string)=>DATA.has(text)||/^[0-9a-f]{64}$/.test(text)||NUMERIC.test(text);
/** What may read the same in the language as in English. */
const same=(text:string,L:LanguageText)=>IDENTICAL.has(text)||(SAME_IN[L.tag]?.has(text)??false)||(PANEL_IN[L.tag]?.test(text)??false)||data(text);
const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const MARK='[⟦⟧·\\s]*';
const esc=(c:string)=>c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&');
const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
const vireoOf=(L:LanguageText)=>(text:string,ctx?:string)=>{const O=L.originals,key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();if(ctx&&Object.hasOwn(O,`${ctx}|${key}`))return O[`${ctx}|${key}`];return Object.hasOwn(O,key)?O[key]:key;};
const plain=(text:string)=>text.replace(/&(&?)/g,(_,d:string)=>d);
/** The catalog or map text of a key in this language, with its parameters. */
const C=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{const src=typeof lang==='string'?E:lang.catalog;if(!Object.hasOwn(src,key))throw new Error(`${tagOf(lang)}: ${key}`);return fill(src[key],params);};
const Nm=(lang:Lang,key:string)=>{if(lang==='qps'){const t=E[key];return new RegExp(`^${MARK}${[...t].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':esc(c)).join(MARK)}${MARK}$`);}return exact(C(lang,key));};

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native `lang="en"`
 * views and the help panel (Front ES-HELP). */
const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;if(e.tagName==='DIALOG'&&!(e as HTMLDialogElement).open)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>el.closest('.portal-header,[data-i18n-shell],script,style,[data-testid=site-tour],[data-testid=pulsar-analysis-help]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const select of document.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 for(const t of document.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 return out;
});
const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
const tool=async(page:Page,lang:Lang,key:string)=>{
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.portal-header nav').getByRole('button',{name:Nm(lang,key)}).click();
};
const file=(name:string,text:string,mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(text,'latin1')});
const TARGET=['"10-30-2026","3:07:42 PM"','"Table Number: "','','',HEADER].map(l=>l+'\r\n').join('')+'"PSR B0329+54",408.00,1.000,0.123456,"",5.0000E-01,49999.12345678,"first",1000,10.00,26\r\n';
const main=(page:Page)=>id(page,'pulsar-analysis');
async function record(page:Page,comment:string){
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
}
const native=(page:Page)=>id(page,'pulsar-native-dialog');

/** The walk through E06. Each step leaves the screen in the state its texts are read in. */
const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
 ['route without data',async page=>{await expect(id(page,'pulsar-none')).toBeVisible();await openAll(main(page));}],
 ['pulsar guide',async(page,lang)=>{await tool(page,lang,'pulsarLab.nav');await expect(id(page,'pulsar-lab-dialog')).toBeVisible();await openAll(id(page,'pulsar-lab-dialog'));}],
 ['guide closed',async page=>{await id(page,'pulsar-lab-close').click();await expect(id(page,'pulsar-lab-dialog')).toBeHidden();}],
 ['saved file candidate',async page=>{await id(page,'saved-rows-disclosure').locator('summary').first().click();await id(page,'saved-rows-file').setInputFiles(file('control.csv',CONTROL));await expect(id(page,'saved-rows-candidate')).toBeVisible();}],
 ['saved file in use',async page=>{await id(page,'saved-rows-use').click();await expect(id(page,'saved-rows-candidate')).toHaveCount(0);await id(page,'saved-rows-select-2').click();await expect(id(page,'saved-rows-selected')).toBeVisible();}],
 ['saved file find',async page=>{await id(page,'saved-rows-find').click();await expect(id(page,'saved-rows-find-dialog')).toBeVisible();}],
 ['saved file not found',async page=>{await id(page,'saved-rows-query').fill('zzzz');await id(page,'saved-rows-from-top').click();await expect(id(page,'saved-rows-notice')).toBeVisible();}],
 ['saved file refused',async page=>{await id(page,'saved-rows-notice-ok').click();await id(page,'saved-rows-file').setInputFiles(file('bad.csv','not a measurement file\r\n'));await expect(id(page,'saved-rows-rejection')).toBeVisible();}],
 ['recording loaded',async page=>{await id(page,'pulsar-file').setInputFiles(file('synthetic-e2e.plr',PLR,'application/octet-stream'));await expect(id(page,'pulsar-properties')).toBeVisible();await expect(id(page,'pulsar-sha')).toHaveText(/^[0-9a-f]{64}$/);}],
 ['properties closed',async page=>{await id(page,'pulsar-properties-close').click();await expect(id(page,'pulsar-properties')).toHaveCount(0);await openAll(main(page));}],
 ['print preview',async page=>{await id(page,'pulsar-print-window').click();await expect(id(page,'pulsar-print-preview')).toBeVisible();}],
 ['print landscape',async page=>{await id(page,'pulsar-print-landscape').check();await expect(id(page,'pulsar-print-preview-page2')).toBeVisible();}],
 ['print closed, measurement pending',async page=>{await id(page,'pulsar-print-preview-close').click();await expect(id(page,'pulsar-print-preview')).toHaveCount(0);
  await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(id(page,'pulsar-pending-1')).toBeVisible();await openAll(main(page));}],
 ['record dialog',async page=>{await id(page,'pulsar-record').click();await expect(id(page,'pulsar-record-dialog')).toBeVisible();}],
 ['comment refused',async page=>{await id(page,'pulsar-comment').fill('ñandú');await id(page,'pulsar-record-ok').click();await expect(id(page,'pulsar-comment')).toHaveAttribute('aria-invalid','true');}],
 ['measurement recorded',async page=>{await id(page,'pulsar-comment').fill('first');await id(page,'pulsar-record-ok').click();await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);await record(page,'second');}],
 ['review',async page=>{await id(page,'pulsar-review').click();await expect(id(page,'pulsar-review-dialog')).toBeVisible();}],
 ['review find',async page=>{await id(page,'pulsar-review-find').click();await expect(id(page,'pulsar-review-find-dialog')).toBeVisible();}],
 ['review find not found',async page=>{await id(page,'pulsar-review-find-query').fill('zzzz');await id(page,'pulsar-review-find-top').click();await expect(id(page,'pulsar-review-find-notice')).toBeVisible();}],
 ['review edit',async page=>{await id(page,'pulsar-review-find-notice-ok').click();await id(page,'pulsar-review-edit').click();await expect(id(page,'pulsar-review-editor')).toBeVisible();}],
 ['review delete question',async page=>{await id(page,'pulsar-review-edit-cancel').click();await expect(id(page,'pulsar-review-editor')).toHaveCount(0);await id(page,'pulsar-review-delete').click();await expect(id(page,'pulsar-review-confirm')).toBeVisible();}],
 ['review nothing selected',async page=>{await id(page,'pulsar-review-yes').click();await id(page,'pulsar-review-delete').click();await id(page,'pulsar-review-yes').click();
  await id(page,'pulsar-review-delete').click();await expect(id(page,'pulsar-review-notice')).toBeVisible();}],
 ['review cancelled',async page=>{await id(page,'pulsar-review-notice-ok').click();await id(page,'pulsar-review-cancel').click();await expect(id(page,'pulsar-review-dialog')).toHaveCount(0);await expect(id(page,'pulsar-count')).toBeVisible();}],
 ['save dialog',async page=>{await id(page,'pulsar-save').click();await expect(native(page)).toHaveAttribute('data-step','dialog');}],
 ['save name refused',async page=>{await id(page,'pulsar-native-name').fill('a:b');await id(page,'pulsar-native-save').click();await expect(id(page,'pulsar-native-problem')).toBeVisible();}],
 ['save verify',async page=>{await id(page,'pulsar-native-name').fill('run');await id(page,'pulsar-native-save').click();await expect(native(page)).toHaveAttribute('data-step','verify');}],
 ['saved',async page=>{await id(page,'pulsar-native-ok').click();await expect(native(page)).toHaveCount(0);await expect(id(page,'pulsar-status')).toContainText('run.CSV');}],
 ['save file exists',async page=>{await record(page,'third');await id(page,'pulsar-save').click();await id(page,'pulsar-native-name').fill('RUN.csv');await id(page,'pulsar-native-save').click();await expect(native(page)).toHaveAttribute('data-step','exists');}],
 ['save extension question',async page=>{await id(page,'pulsar-native-cancel').click();await expect(id(page,'pulsar-native-name')).toBeVisible();await id(page,'pulsar-native-name').fill('other.txt');await id(page,'pulsar-native-save').click();await expect(native(page)).toHaveAttribute('data-step','extension');}],
 ['save cancelled',async page=>{await id(page,'pulsar-native-cancel').click();await expect(native(page)).toHaveCount(0);}],
 ['export dialog',async page=>{await id(page,'pulsar-export').click();await expect(id(page,'pulsar-export-dialog')).toBeVisible();await id(page,'pulsar-export-date').fill('é');await id(page,'pulsar-export-download').click();await expect(id(page,'pulsar-export-alert')).toBeVisible();}],
 ['export cancelled',async page=>{await id(page,'pulsar-export-cancel').click();await expect(id(page,'pulsar-export-dialog')).toHaveCount(0);}],
 ['append dialog',async page=>{await id(page,'pulsar-append').click();await expect(id(page,'pulsar-append-dialog')).toBeVisible();}],
 ['append target refused',async page=>{await id(page,'pulsar-append-file').setInputFiles(file('target-bad.csv','nope\r\n'));await expect(id(page,'pulsar-append-rejection')).toBeVisible();}],
 ['append target chosen',async page=>{await id(page,'pulsar-append-file').setInputFiles(file('target.csv',TARGET));await expect(id(page,'pulsar-append-target')).toBeVisible();}],
 ['append cancelled',async page=>{await id(page,'pulsar-append-cancel').click();await expect(id(page,'pulsar-append-dialog')).toHaveCount(0);}],
 ['clear unsaved question',async page=>{await id(page,'pulsar-clear').click();await expect(id(page,'pulsar-clear-dialog')).toBeVisible();await expect(id(page,'pulsar-clear-unsaved-text')).toBeVisible();}],
 ['clear confirm question',async page=>{await id(page,'pulsar-clear-discard').click();await expect(id(page,'pulsar-clear-no')).toBeVisible();}],
 ['clear declined',async page=>{await id(page,'pulsar-clear-no').click();await expect(id(page,'pulsar-clear-dialog')).toHaveCount(0);}],
];
async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>,steps:typeof STEPS=STEPS,setup:(page:Page,lang:Lang)=>Promise<void>=async()=>{},time:Date=new Date(2026,9,30,15,7,42)){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#pulsar-analysis`);
 await expect(page.locator('html')).toHaveAttribute('lang',typeof lang==='string'?'en':lang.entry.htmlLang);
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 await expect(id(page,'pulsar-none')).toBeVisible({timeout:20_000});
 await setup(page,lang);
 for(const [step,run] of steps){await run(page,lang);await page.waitForTimeout(150);await each(step);}
}

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});test(title(L,'E06 reads differently in Spanish from English: guide, saved file viewer, recording, controls, print, records, Review, Save, export, append and clear','E06 reads differently in <L> (<tag>) from English: guide, saved file viewer, recording, controls, print, records, Review, Save, export, append and clear'),async({browser})=>{
 test.setTimeout(360_000);
 const seen:Record<'en'|'own',Map<string,Set<string>>>={en:new Map(),own:new Map()};
 for(const lang of ['en','own'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await walk(page,lang==='en'?'en':L,async step=>{seen[lang].set(step,new Set(await texts(page)));});
  expect(errors,lang==='en'?'en':L.tag).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();
 for(const [step,list] of seen.own)for(const t of list)if(english.has(bare(t))&&!same(bare(t),L)&&!left.has(t))left.set(t,step);
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});});

test('qps: every text of the E06 walk is marked, outside recorded data',async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!data(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

/** VIREO's captions on each step, in English (View original or the English load) or in this load's Spanish. */
const captions=(page:Page,tr:(original:string,ctx?:string)=>string):Record<string,()=>Promise<void>>=>({
 'print preview':async()=>{await expect(id(page,'pulsar-print-preview').locator('.ob-native')).toHaveText(tr('Analyze Pulsar Data'));await expect(id(page,'pulsar-print-preview-native-header')).toContainText(tr('Data Parameters:'));
  await expect(id(page,'pulsar-print-preview-native-header')).toContainText(`${tr('Object:')} SYNTHETIC E2E`);await expect(id(page,'pulsar-print-preview-native-header')).toContainText(`${tr('File Name:')} synthetic-e2e.plr`);
  await expect(id(page,'pulsar-print-preview-native-header')).toContainText(`${tr('Receiver')} 1: 430.00`);await expect(id(page,'pulsar-print-preview-native-header')).toContainText(tr('(Receiver Not Recorded)'));await expect(id(page,'pulsar-print-preview-native-header')).toContainText(tr('Receiver Gain (Relative):'));},
 'print landscape':async()=>{await expect(id(page,'pulsar-print-preview-native-header')).toContainText(tr('(Screen Image Printed on Next Page)'));await expect(id(page,'pulsar-print-preview-page2')).toContainText(tr(' - Page 2').trim());},
 'print closed, measurement pending':async()=>{await expect(id(page,'pulsar-print-window')).toHaveText(tr('Print Window...'));},
 'review':async()=>{const d=id(page,'pulsar-review-dialog');await expect(d.locator('h3').first()).toHaveText(tr(PULSAR_REVIEW_LITERALS.dialogCaption));
  await expect(id(page,'pulsar-review-find')).toHaveText(tr(PULSAR_REVIEW_BUTTONS.find).replace(/(?:\.\.\.|…)$/,'')+'…');await expect(id(page,'pulsar-review-edit')).toHaveText(tr(PULSAR_REVIEW_BUTTONS.edit).replace(/(?:\.\.\.|…)$/,'')+'…');
  await expect(id(page,'pulsar-review-delete')).toHaveText(tr(PULSAR_REVIEW_BUTTONS.delete));await expect(id(page,'pulsar-review-ok')).toHaveText(tr(PULSAR_REVIEW_BUTTONS.ok));await expect(id(page,'pulsar-review-cancel')).toHaveText(tr(PULSAR_REVIEW_BUTTONS.cancel));},
 'review find':async()=>{const d=id(page,'pulsar-review-find-dialog');await expect(d.locator('h3')).toHaveText(tr('Find Record Containing...'));await expect(d).toContainText(tr('Search String:'));await expect(d).toContainText(tr('Case Dependent'));await expect(d).toContainText(tr('Begin Search:'));
  await expect(id(page,'pulsar-review-find-top')).toHaveText(tr('From Top'));await expect(id(page,'pulsar-review-find-cursor')).toHaveText(tr('From Cursor'));await expect(id(page,'pulsar-review-find-cancel')).toHaveText(tr('Cancel'));},
 'review find not found':async()=>{await expect(id(page,'pulsar-review-find-notice').locator('h3')).toHaveText(tr('String Not Found'));await expect(id(page,'pulsar-review-find-notice-body')).toHaveText(`"zzzz${tr('" Not Found.')}`);},
 'review edit':async()=>{const d=id(page,'pulsar-review-editor');await expect(d.locator('h4')).toHaveText(tr(PULSAR_REVIEW_EDIT_LITERALS.formCaption));
  const dt=d.locator('dt');await expect(dt.nth(0)).toHaveText(tr(PULSAR_REVIEW_EDIT_DFM.julianDate));await expect(dt.nth(1)).toHaveText(tr(PULSAR_REVIEW_EDIT_DFM.frequency));await expect(dt.nth(2)).toHaveText(tr(PULSAR_REVIEW_EDIT_DFM.gain));
  await expect(d.locator('.plr-review-edit-readings-label')).toHaveText(tr(PULSAR_REVIEW_EDIT_DFM.readings));const l=d.locator('.plr-review-edit-readings label');
  await expect(l.nth(0)).toContainText(tr(PULSAR_REVIEW_EDIT_DFM.reference));await expect(l.nth(1)).toContainText(tr(PULSAR_REVIEW_EDIT_DFM.vertical));await expect(l.nth(2)).toContainText(tr(PULSAR_REVIEW_EDIT_DFM.horizontal));
  await expect(d.locator('label').filter({has:page.getByTestId('pulsar-review-edit-comment')})).toContainText(tr(PULSAR_REVIEW_EDIT_DFM.comment));await expect(id(page,'pulsar-review-edit-ok')).toHaveText(tr(PULSAR_REVIEW_EDIT_DFM.ok));await expect(id(page,'pulsar-review-edit-cancel')).toHaveText(tr(PULSAR_REVIEW_EDIT_DFM.cancel));},
 'review delete question':async()=>{const d=id(page,'pulsar-review-confirm');await expect(d.locator('h4')).toHaveText(tr(PULSAR_REVIEW_LITERALS.confirmationCaption));await expect(d.locator('p')).toHaveText(tr(PULSAR_REVIEW_LITERALS.confirmationText));},
 'review nothing selected':async()=>{const d=id(page,'pulsar-review-notice');await expect(d.locator('h4')).toHaveText(tr(PULSAR_REVIEW_LITERALS.noSelectionCaption));await expect(d.locator('p')).toHaveText(tr(PULSAR_REVIEW_LITERALS.noSelectionText));},
 'save dialog':async()=>{await expect(native(page).locator('h3')).toHaveText(tr(NS.dialogTitle));await expect(native(page).locator('p').first()).toContainText(tr(NS.filter));},
 'save verify':async()=>{await expect(native(page).locator('h3')).toHaveText(tr(NS.verifyCaption));await expect(id(page,'pulsar-native-text')).toHaveText(`${tr('Writing Data to ','fragment')}run.CSV`);},
 'save file exists':async()=>{await expect(native(page).locator('h3')).toHaveText(tr(NS.existsCaption));
  await expect(id(page,'pulsar-native-text')).toHaveText(`${tr('The File ','fragment')}RUN.csv${tr(NS.existsText('',p=>p).replace(/^The File /,''),'fragment')}`.replace(/\s+/g,' '));},
 'save extension question':async()=>{await expect(native(page).locator('h3')).toHaveText(tr(NS.extensionCaption));await expect(id(page,'pulsar-native-text')).toHaveText(tr(NS.extensionText));},
 'clear unsaved question':async()=>{await expect(id(page,'pulsar-clear-dialog').locator('strong')).toHaveText(tr(NS.clearUnsavedCaption));await expect(id(page,'pulsar-clear-unsaved-text')).toHaveText(tr(NS.clearUnsavedText));},
 'clear confirm question':async()=>{await expect(id(page,'pulsar-clear-dialog').locator('p').first()).toHaveText(tr(NS.clearConfirmText));},
});
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const S=L.catalog as Record<string,string>,O=L.originals,R=e06Maps(L.tag),M=R.pulsar as Record<string,string>,vireoIn=vireoOf(L);
 test(title(L,'View original (English) on: every VIREO caption in the E06 walk reads in English, the web text stays Spanish','View original (English) on: every VIREO caption in the E06 walk reads in English, the web text stays <L>'),async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plainText=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const web=new Set([...Object.values(S),...Object.values(M),...Object.values(R.pulsarSavedRows as Record<string,string>),...Object.values(R.pulsarLoadSave as Record<string,string>),...Object.keys(O)].map(plainText));
 const translated=new Set(Object.values(O).map(plainText).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,(t,ctx)=>ctx?t:plain(t).trim());
 const left=new Map<string,string>();
 await walk(page,L,async step=>{
  for(const t of await texts(page))if(translated.has(plainText(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  // Web text around the VIREO captions stays in the language.
  if(step==='route without data')await expect(page.getByRole('heading',{level:1,name:exact(S['plr.routeTitle'])})).toBeVisible();
  if(step==='save dialog')await expect(native(page).getByText(M['pulsar.nativeSave.fileName'],{exact:false})).toBeVisible();
  if(step==='review')await expect(id(page,'pulsar-review-dialog').locator('p.plr-help').first()).toHaveText(M['pulsar.review.note']);
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 });

 test(title(L,'Spanish: every VIREO caption in the E06 walk is its Spanish original; English shows the originals unchanged','<L> (<tag>): every VIREO caption in the E06 walk is its <L> original; English shows the originals unchanged'),async({browser})=>{
 test.setTimeout(360_000);
 for(const lang of ['own','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,(t,ctx)=>lang==='en'?(ctx?t:plain(t).trim()):vireoIn(t,ctx));
  await walk(page,lang==='en'?'en':L,async step=>{await checks[step]?.();});
  await page.close();
 }
 for(const t of [ACTIVATE.emptyCaption,ACTIVATE.emptyText,ACTIVATE.loadCaption,ACTIVATE.loadText,NS.nothingText,NS.nothingCaption,NS.unrecordedText,NS.unrecordedCaption,NS.dialogTitle,NS.filter,NS.extensionText,NS.extensionCaption,NS.existsCaption,NS.verifyCaption,NS.clearUnsavedText,NS.clearUnsavedCaption,NS.clearConfirmText,
  ...Object.values(PULSAR_REVIEW_LITERALS),...Object.values(PULSAR_REVIEW_BUTTONS).filter(t=>t!=='Cancel'),...Object.values(PULSAR_REVIEW_EDIT_LITERALS),...Object.values(PULSAR_REVIEW_EDIT_DFM).filter(t=>t!=='Cancel'&&t!=='OK'),
  'Find Record Containing...','Begin Search:','Print Window...','Analyze Pulsar Data','Data Parameters:','Receiver Gain (Relative):','(Data Not Written To File)','(Receiver Not Recorded)','File Name:','(Screen Image Printed on Next Page)'])expect(vireoIn(t),t).not.toBe(plain(t).trim());
 for(const [t,ctx] of [['The File ','fragment'],['Writing Data to ','fragment'],['Appending Data to ','fragment']] as const)expect(vireoIn(t,ctx),t).not.toBe(t.trim());
 // The exists box's pieces are concatenated around the file name (Spanish keeps VIREO's straight quotes; Portuguese uses “ ”).
 expect(vireoIn(NS.existsText('',p=>p).replace(/^The File /,''),'fragment')).toContain(L.tag==='es-419'?'"Cancelar"':`“${vireoIn('Cancel')}”`);
 });
});

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy named the elements that stick out when the page overflows. Run with the CI's DejaVu fonts
 * (docs/I18N.md). */
const LAYOUT:LayoutOptions={explainOverflow:true};
/** ES8B_LAYOUT_LANG=en|qps|<tag> runs the layout walk in another language (for comparison). */
const layoutLang=(L:LanguageText):Lang=>{const v=process.env.ES8B_LAYOUT_LANG;return !v?L:v==='en'||v==='qps'?v:textOf(v);};
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish E06 screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> E06 screens lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(360_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 await walk(page,layoutLang(L),async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  await page.screenshot({path:test.info().outputPath(`${L.tag==='es-419'?'es':L.tag}-e06-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});});

// ---------------------------------------------------------------------------------------------------------------------------
// A receiver capture (model data) followed into the analysis page: the raw .PLR download dialog, the verified Save dialog and
// the Load question with its Yes flow. The radio telescope route is crossed only to make the capture (ES8a translates it).
/** A one-pulsar receiver catalog in the Pulsars.dat column layout (synthetic, as tests/i18n/exports-identity.spec.ts). */
const RECEIVER_CATALOG=(()=>{
 const COLUMNS={primaryName:[0,12],legacyName:[12,8],ra:[20,16],dec:[62,16],x2a:[208,22],x34:[240,16],x3e:[266,14],s48:[336,8],s4c:[350,14],s50:[410,10],s54:[430,8],s58:[438,8],s5c:[446,8]} as const;
 const row:Record<keyof typeof COLUMNS,string>={primaryName:'J0001+3826',legacyName:'B2358+38',ra:'0.25',dec:'38.4',x2a:'0.5',x34:'1.0E-15',x3e:'50000.0',s48:'28.2',s4c:'30.0',s50:'12.5',s54:'14.0',s58:'9.0',s5c:'3.0'};
 const chars=Array.from({length:454},()=>' ');
 for(const [field,[start,width]] of Object.entries(COLUMNS) as [keyof typeof COLUMNS,readonly [number,number]][]){const text=row[field],cell=field==='primaryName'||field==='legacyName'?text.padEnd(width):text.padStart(width);for(let i=0;i<width;i++)chars[start+i]=cell[i]??' ';}
 return chars.join('')+'\r\n';
})();
const flush=async(page:Page)=>{for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));};
const advance=async(page:Page,ms:number)=>{for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}};
/** Makes the model capture on the radio page (English there, not compared) and returns to the analysis page. */
async function makeCapture(page:Page){
 await page.evaluate(()=>{location.hash='#radio-control';});
 await expect(id(page,'radio-exercise')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await id(page,'antenna-tracking').click();await flush(page);
 await id(page,'pulsar-ref-file').setInputFiles({name:'synthetic-receiver.dat',mimeType:'text/plain',buffer:Buffer.from(RECEIVER_CATALOG,'latin1')});
 await id(page,'radio-clock-utc').fill('2026-10-24T12:00:00');await id(page,'radio-clock-apply').click();await id(page,'radio-clock-longitude').click();
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();
 await id(page,'receiver-record').click();
 await id(page,'receiver-mode').click();await flush(page);await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 const finish=id(page,'receiver-record-finish');await expect(finish).toHaveAttribute('data-stage','identify');
 await id(page,'receiver-record-identify-input').fill('PSR B2358+38');await id(page,'receiver-record-identify-ok').click();
 await expect(finish).toHaveAttribute('data-stage','properties');await id(page,'receiver-record-properties-ok').click();
 await expect(finish).toHaveAttribute('data-stage','save');await id(page,'receiver-record-save-no').click();
 await page.evaluate(()=>{location.hash='#pulsar-analysis';});
 await expect(id(page,'pulsar-memory')).toBeVisible();await flush(page);
}
const MEMORY_STEPS:typeof STEPS=[
 ['receiver capture',async page=>{await openAll(main(page));await expect(id(page,'pulsar-memory')).toBeVisible();}],
 ['capture properties',async page=>{await expect(id(page,'pulsar-properties')).toBeVisible();}],
 ['raw download dialog',async page=>{await id(page,'pulsar-raw-export').click();await expect(id(page,'pulsar-raw-export-download')).toBeEnabled();}],
 ['raw download cancelled',async page=>{await id(page,'pulsar-raw-export-cancel').click();await expect(id(page,'pulsar-raw-export-download')).toHaveCount(0);}],
 ['verified save dialog',async page=>{await id(page,'pulsar-save-capture').click();await expect(id(page,'pulsar-save-capture-choose')).toBeVisible();}],
 ['verified save cancelled',async page=>{await page.keyboard.press('Escape');await expect(id(page,'pulsar-save-capture-choose')).toHaveCount(0);}],
 ['load question',async page=>{await id(page,'pulsar-file').click({force:true});await expect(id(page,'pulsar-load-dialog')).toBeVisible();}],
 ['load question yes',async page=>{await id(page,'pulsar-load-yes').click();await expect(id(page,'pulsar-save-capture-choose')).toBeVisible();}],
 ['load question cancelled',async page=>{await page.keyboard.press('Escape');await expect(id(page,'pulsar-save-capture-choose')).toHaveCount(0);}],
];
const captureSetup=async(page:Page)=>{await makeCapture(page);};
const memoryCaptions=(page:Page,tr:(original:string,ctx?:string)=>string):Record<string,()=>Promise<void>>=>({
 'capture properties':async()=>{await expect(id(page,'pulsar-prop-file')).toHaveText(tr('Data Not Written to File'));},
 'load question':async()=>{await expect(id(page,'pulsar-load-dialog').locator('h3')).toHaveText(tr(ACTIVATE.loadCaption));await expect(id(page,'pulsar-load-text')).toHaveText(tr(ACTIVATE.loadText));},
});

// qps runs with the Spanish test only (once).
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});test(title(L,'E06 receiver capture: the raw download, verified Save and Load question read differently in Spanish; qps marks every text','E06 receiver capture: the raw download, verified Save and Load question read differently in <L> (<tag>)'),async({browser})=>{
 test.setTimeout(420_000);
 const withQps=L.tag==='es-419',vireoIn=vireoOf(L);
 const seen:Record<'en'|'own'|'qps',Map<string,Set<string>>>={en:new Map(),own:new Map(),qps:new Map()};
 for(const lang of (withQps?['en','own','qps']:['en','own']) as readonly ('en'|'own'|'qps')[]){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const checks=lang==='qps'?{}:memoryCaptions(page,(t,ctx)=>lang==='en'?(ctx?t:plain(t).trim()):vireoIn(t,ctx));
  await walk(page,lang==='own'?L:lang,async step=>{seen[lang].set(step,new Set(await texts(page)));await checks[step]?.();},MEMORY_STEPS,captureSetup,new Date('2026-10-24T00:00:00Z'));
  expect(errors,lang==='own'?L.tag:lang).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();
 for(const [step,list] of seen.own)for(const t of list)if(english.has(bare(t))&&!same(bare(t),L)&&!left.has(t))left.set(t,step);
 expect([...left].map(([t,step])=>`${L.tag==='es-419'?'es':L.tag}: ${step}: ${t}`)).toEqual([]);
 const unmarked=new Map<string,string>();
 for(const [step,list] of seen.qps)for(const t of list)if(!/[⟦⟧]/.test(t)&&!data(bare(t))&&!unmarked.has(t))unmarked.set(t,step);
 expect([...unmarked].map(([t,step])=>`qps: ${step}: ${t}`)).toEqual([]);
});});
