import type {LayoutOptions} from '../../fixtures/layoutProblems';
import {type Page,type Locator} from '@playwright/test';
import {expect} from '../../fixtures/area-tripwire';
import {langQuery} from '../../fixtures/language';
import {HEADER,CONTROL,PLR} from '../../fixtures/pulsar-saved-rows-controls';
import en from '../../../src/i18n/en.json' with {type:'json'};
import {type LanguageText} from '../languageText';
import {isPseudo,pseudoName,htmlLangOf,type Pseudo} from '../../fixtures/pseudoNames';

// Front SC12 (docs/I18N.md): the walk of tests/i18n/e06.spec.ts and the helpers it needs, moved here unchanged in behaviour so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales; the spec's header describes it.
export type Lang='en'|Pseudo|LanguageText;
/** A test title: Spanish keeps its ES8b title; another language names itself and its tag. */
export const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
export const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
export const E=en as Record<string,string>;
/** Translated languages only: product and format names, units, symbols, and (SAME_IN) the words that read the same in that
 * language (its identical.json, with a reason each). The qps walk marks them all. */
export const IDENTICAL=new Set<string>([
 'VIREO','OpenVireo','SHA-256','CSV','PLR','JSON','#','—','×','·','MHz','ms','px','CR LF','LF',
]);
export const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={
 'es-419':new Set(['Bytes','Zoom','Horizontal','Panel','Vertical (s)','No']),
 // Portuguese also keeps VIREO's OK (Windows pt-BR; identical.json `original:OK`).
 'pt-BR':new Set(['Bytes','Zoom','Horizontal','Vertical (s)','OK']),
};
/** "Panel {n}" is the same in Spanish; Portuguese says «Painel {n}». */
export const PANEL_IN:Readonly<Record<string,RegExp>>={'es-419':/^Panel \d$/};
/** Both walks: data of the synthetic recording and files (names, identities, comments) shown as stored, outside the `lang="en"`
 * file mirrors that texts() skips. */
export const DATA=new Set<string>([
 'Pulsars.dat','CRLF','SYNTHETIC E2E','synthetic-e2e.plr','control.csv','bad.csv','run.CSV','run','first','second','first, with comma','target.csv','target-bad.csv',
 'PSR B2358+38','PSR B0329+54','PSR B0531+21','PSR B1919+21','Ada Student','Ben Student','Table Number: 3','10/22/2026, 9:41:07 AM',
]);
export const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*(?:\s*(?:MHz|ms|s|m|px|bytes|Bytes))*\s*$/;
/** Recorded data, a SHA-256 hash or a number with its unit: the same in every language. */
export const data=(text:string)=>DATA.has(text)||/^[0-9a-f]{64}$/.test(text)||NUMERIC.test(text);
/** What may read the same in the language as in English. */
export const same=(text:string,L:LanguageText)=>IDENTICAL.has(text)||(SAME_IN[L.tag]?.has(text)??false)||(PANEL_IN[L.tag]?.test(text)??false)||data(text);
export const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
export const esc=(c:string)=>c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&');
export const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
export const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
export const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
export const vireoOf=(L:LanguageText)=>(text:string,ctx?:string)=>{const O=L.originals,key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();if(ctx&&Object.hasOwn(O,`${ctx}|${key}`))return O[`${ctx}|${key}`];return Object.hasOwn(O,key)?O[key]:key;};
export const plain=(text:string)=>text.replace(/&(&?)/g,(_,d:string)=>d);
/** The catalog or map text of a key in this language, with its parameters. */
export const C=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{const src=typeof lang==='string'?E:lang.catalog;if(!Object.hasOwn(src,key))throw new Error(`${tagOf(lang)}: ${key}`);return fill(src[key],params);};
export const Nm=(lang:Lang,key:string)=>{if(isPseudo(lang))return pseudoName(E[key]);return exact(C(lang,key));};

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native `lang="en"`
 * views and the help panel (Front ES-HELP). */
export const texts=(page:Page)=>page.evaluate(()=>{
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
export const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
export const tool=async(page:Page,lang:Lang,key:string)=>{
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.portal-header nav').getByRole('button',{name:Nm(lang,key)}).click();
};
export const file=(name:string,text:string,mimeType='text/plain')=>({name,mimeType,buffer:Buffer.from(text,'latin1')});
export const TARGET=['"10-30-2026","3:07:42 PM"','"Table Number: "','','',HEADER].map(l=>l+'\r\n').join('')+'"PSR B0329+54",408.00,1.000,0.123456,"",5.0000E-01,49999.12345678,"first",1000,10.00,26\r\n';
export const main=(page:Page)=>id(page,'pulsar-analysis');
export async function record(page:Page,comment:string){
 await id(page,'pulsar-plot-1').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 await expect(id(page,'pulsar-pending-1')).toBeVisible();
 await id(page,'pulsar-record').click();await id(page,'pulsar-comment').fill(comment);await id(page,'pulsar-record-ok').click();
 await expect(id(page,'pulsar-record-dialog')).toHaveCount(0);
}
export const native=(page:Page)=>id(page,'pulsar-native-dialog');

/** The walk through E06. Each step leaves the screen in the state its texts are read in. */
export const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
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
export async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>,steps:typeof STEPS=STEPS,setup:(page:Page,lang:Lang)=>Promise<void>=async()=>{},time:Date=new Date(2026,9,30,15,7,42)){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#pulsar-analysis`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 await expect(id(page,'pulsar-none')).toBeVisible({timeout:20_000});
 await setup(page,lang);
 for(const [step,run] of steps){await run(page,lang);await page.waitForTimeout(150);await each(step);}
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy named the elements that stick out when the page overflows. Run with the CI's DejaVu fonts
 * (docs/I18N.md). */
export const LAYOUT:LayoutOptions={explainOverflow:true};
