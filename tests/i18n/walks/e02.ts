import type {LayoutOptions} from '../../fixtures/layoutProblems';
import {type Page,type Locator} from '@playwright/test';
import {expect} from '../../fixtures/area-tripwire';
import {langQuery} from '../../fixtures/language';
import {readFile} from 'node:fs/promises';
import en from '../../../src/i18n/en.json' with {type:'json'};
import {enterInstructorMode} from '../../fixtures/instructor-mode';
import {type LanguageText} from '../languageText';
import {isPseudo,pseudoName,htmlLangOf,type Pseudo} from '../../fixtures/pseudoNames';

// Front SC12 (docs/I18N.md): the walk of tests/i18n/e02.spec.ts and the helpers it needs, moved here unchanged in behaviour so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales; the spec's header describes it.
export type Lang='en'|Pseudo|LanguageText;
export const E=en as Record<string,string>;
export const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
/** A test title: Spanish keeps its ES4 title; another language names itself and its tag. */
export const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
export const SAME=new Set<string>([
 // Formats, names, symbols and units.
 'VIREO','OpenVireo','SHA-256','CSV','JSON','SSP','TXT','(.TXT)','z','Z','V','Dec','Dec (°)','JD','#','?','↗','×','—','✳','·','km/s','V (km/s)','V / Z','Z(=V/C)','V(km/sec)',
 'V binary32','Z binary32','px','h','°',
 // The telescope names of the bundled optical profiles (identifiers, as on the observatory).
 '0.4m (16") Telescope','KPNO 0.9m (36") Telescope','KPNO 4m (158") Mayall Telescope',
 // Record identity as written in the student's files and the wedge's receipts (WEDGE_OWN_RECORDS_NAME), the LSS field lists' file
 // names, the LSS results file name, the catalogue galaxy ids of field 1 and the original line list's labels (GLXYLNS.LST).
 'OpenVireo LSS records','LSS_Redshifts.TXT','LSS_Galaxy_Data.TXT','bad.txt','bad.csv','LSSFields.LST','CLEA_GLX.DAT',
 'K Line','H Line','G Band','K Line (Ca II)','H Line (Ca II + H)','G Band (Blend)',
]);
/** Galaxy ids from the field lists (catalogue designations, e.g. 12021+3127, NGC 4080, IC 3046, UGC 7085, CGCG 158-084). */
export const GALAXY=/^(?:\d{5}[+-]\d{4}|(?:NGC|IC|UGC|CGCG|MCG|MRK|KUG)\s?\d[\d+-]*(?:\s?[A-Z\d-]{1,4})?|A\d[\d+-]*)$/;
/** A hash (with or without its SHA-256 label), a binary32 bit pattern, the print date (en-US numbers in every language), a saved .TXT line (the wedge's Saved line), a field list file name
 * or the saved file's header. */
export const RECORDED=/^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{8}$|^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d\d:\d\d [AP]M$|^\S.{10}\s+\d{4}\.\d{6}\s+\d+h\d\dm\d\d\.\ds|^LSS_Field0\d\.HTL$|^Object ID +MJD\(Days\)/;
/** A number with its unit or symbol, and nothing else that could be a word. */
export const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×/()[\]–%=→hms]*\d[-+−±\d\s.,:;°′″'"·×/()[\]–%=→hms]*(?:\s*(?:Å|km\/s|Mpc|ms|mag|h|s|m|JD|z|px|°))*\s*$/;
/** Texts that are the same words in one language (its identical.json, with a reason each). */
export const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={
 // The same word in Spanish (identical.json): a row status and VIREO's No button.
 'es-419':new Set(['Observable','No']),
 // The same words in Portuguese: VIREO's OK and the wedge's Pixel (x, y).
 'pt-BR':new Set(['OK','Pixel (x, y)']),
 // Front FR2: the same words in French (identical.json): VIREO's OK, Options..., Style, Minimum and Maximum; the survey's Action
 // column and Observable status; the wedge's Point (6000.5) separator and Pixel (x, y).
 fr:new Set(['OK','Options...','Style','Minimum','Maximum','Action','Observable','Point (6000.5)','Pixel (x, y)']),
};
/** Front FR2: patterns of texts that are the same words in one language: French writes the field selector's option as English does,
 * the recorded LSSFields.LST item and «({rows} galaxies)» (identical.json `catalog:lss.fieldOption`). */
export const SAME_PATTERN_IN:Readonly<Record<string,RegExp>>={fr:/^Survey\s+Field\s+\d\s.*\(\d+\s+galaxies\)\s*$/s};
export const same=(text:string,L?:LanguageText)=>SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text)||GALAXY.test(text)||(L!==undefined&&((SAME_IN[L.tag]?.has(text)??false)||(SAME_PATTERN_IN[L.tag]?.test(text)??false)));
export const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
/** Front SC12: an English text's name in any pseudo-locale (qps and the script variants; tests/fixtures/pseudoNames.ts). */
export const pseudo=pseudoName;
export const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
export const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** The accessible name of a catalog key in this language. */
export const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(isPseudo(lang))return pseudo(E[key],params);const C=lang.catalog;if(!Object.hasOwn(C,key))throw new Error(`No ${lang.entry.englishName} for ${key}`);return exact(fill(C[key],params));};
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
export const vireoOf=(L:LanguageText)=>(text:string,context?:string)=>{const O=L.originals,key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();if(context!==undefined&&Object.hasOwn(O,`${context}|${key}`))return O[`${context}|${key}`];
 return Object.hasOwn(O,key)?/^\s*/.exec(text)![0]+O[key]+/\s*$/.exec(text)![0]:text;};
export const button=(scope:Page|Locator,lang:Lang,key:string)=>scope.getByRole('button',{name:N(lang,key)});

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native
 * `lang="en"` views. */
export const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>el.closest('.portal-header,[data-i18n-shell],script,style,[data-testid=site-tour]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const select of document.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 for(const t of document.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 return out;
});
export const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
export const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
export const tool=async(page:Page,lang:Lang,key:string)=>{
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.portal-header nav').getByRole('button',{name:N(lang,key)}).click();
};
export const SEED_TXT='Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments\r\n';

export type Context={txt?:Buffer};
/** The walk through E02. Each step leaves the screen in the state its texts are read in. */
export const STEPS:readonly (readonly [string,(page:Page,lang:Lang,c:Context)=>Promise<void>])[]=[
 ['LSS lab guide',async(page,lang)=>{await tool(page,lang,'lssLab.nav');await expect(id(page,'lss-lab')).toBeVisible();}],
 ['LSS survey',async(page,lang)=>{await button(id(page,'lss-lab').locator('[data-testid=lss-lab-step-load]'),lang,'lssLab.goSurvey').click();await expect(id(page,'lss-lab')).toBeHidden();
  await expect(page.getByRole('heading',{name:N(lang,'lss.title')})).toBeVisible();await expect(page.locator('#lss-field')).toBeEnabled({timeout:30_000});}],
 ['field list loaded',async(page,lang)=>{await page.locator('#lss-field').selectOption('1');await button(page,lang,'lss.load').click();await expect(id(page,'lss-rows')).toBeVisible({timeout:30_000});
  await expect(page.locator('[data-testid^="lss-row-"]')).toHaveCount(23);}],
 ['exposure paused',async(page,lang)=>{await button(id(page,'lss-row-1'),lang,'lss.point').click();await button(page,lang,'lss.exposure.activate').click();
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await button(page,lang,'lss.exposure.start').click();
  await page.clock.runFor(2000);await button(page,lang,'lss.exposure.pause').click();await expect(id(page,'lss-elapsed')).toContainText('2000');await page.clock.resume();
  await openAll(page.locator('body'));}],
 ['measurement panel',async(page,lang)=>{await page.locator('#lss-step').fill('.001');await button(page,lang,'lss.measure.setStep').click();await page.locator('#lss-shift').fill('20');
  await expect(id(page,'lss-current-z')).toContainText('+0.020');}],
 ['Measured Redshift Data',async page=>{await page.locator('.lss-measure button.primary-button').click();await expect(page.locator('dialog.lss-dialog[open]')).toBeVisible();}],
 ['velocity refusal',async page=>{await page.locator('dialog.lss-dialog[open] button[type=submit]').click();await expect(page.locator('#lss-dialog-error')).toBeVisible();}],
 ['velocity invalid',async page=>{await id(page,'lss-dialog-velocity').fill('5000');await page.locator('dialog.lss-dialog[open] button[type=submit]').click();
  await expect(page.locator('#lss-dialog-error')).toBeVisible();}],
 ['redshift recorded',async page=>{const z=Number(await id(page,'lss-dialog-z').inputValue());await id(page,'lss-dialog-velocity').fill(String(Math.round(299792.458*z*100)/100));
  await page.locator('dialog.lss-dialog[open] button[type=submit]').click();await expect(page.locator('dialog.lss-dialog[open]')).toHaveCount(0);await expect(page.locator('[data-testid=lss-results] tbody tr')).toHaveCount(1);}],
 ['Save Data (.TXT)',async(page,_lang,c)=>{const d=page.waitForEvent('download');await id(page,'lss-results-txt').click();c.txt=await readFile((await(await d).path())!);}],
 ['wedge with own records',async(page,lang)=>{await button(page,lang,'lss.results.plot').click();await expect(id(page,'wedge-count')).toBeVisible({timeout:30_000});
  await expect(page.getByRole('heading',{level:1,name:N(lang,'wedge.routeTitle')})).toBeVisible();await openAll(page.locator('body'));}],
 ['wedge options',async page=>{await id(page,'wedge-options-open').click();await expect(id(page,'wedge-options')).toBeVisible();}],
 ['Retain Current Data?',async(page,_lang,c)=>{await id(page,'wedge-options-cancel').click();await expect(id(page,'wedge-options')).toHaveCount(0);
  await id(page,'wedge-file').setInputFiles({name:'LSS_Redshifts.TXT',mimeType:'text/plain',buffer:c.txt!});await expect(id(page,'wedge-prompt')).toHaveAttribute('data-stage','retain');}],
 ['Confirm Deletion!',async page=>{await id(page,'wedge-prompt-no').click();await expect(id(page,'wedge-prompt')).toHaveAttribute('data-stage','confirm-delete');}],
 ['Saved Data Loaded',async page=>{await id(page,'wedge-prompt-yes').click();await expect(id(page,'wedge-notice')).toHaveAttribute('data-kind','loaded');}],
 ['TXT Files Only',async page=>{await id(page,'wedge-notice-dismiss').click();await id(page,'wedge-file').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from(SEED_TXT)});
  await expect(id(page,'wedge-notice')).toHaveAttribute('data-cause','extension');}],
 ['No Data Loaded!',async page=>{await id(page,'wedge-notice-dismiss').click();await id(page,'wedge-file').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('hello\r\n')});
  await expect(id(page,'wedge-notice')).toHaveAttribute('data-cause','header');}],
 ['wedge row selected',async page=>{await id(page,'wedge-notice-dismiss').click();await id(page,'wedge-row-0').getByRole('button').click();await expect(id(page,'wedge-details')).toBeVisible();await openAll(page.locator('body'));}],
 ['Print Wedge Plot',async page=>{await id(page,'wedge-print').click();await expect(id(page,'wedge-print-preview')).toBeVisible();}],
 // LSS Galaxy Data shows only with Edit Mode (an instructor option, VIREO's LargeScaleStructure1Click).
 ['LSS Galaxy Data (Edit Mode)',async(page,lang)=>{await id(page,'wedge-print-preview-close').click();await tool(page,lang,'sky.observatory');
  const dome=page.getByRole('button',{name:new RegExp(N(lang,'sky.open').source.replace(/\$$/,'').concat(' ↗$'))});if(await dome.isVisible())await dome.click();
  await enterInstructorMode(page);await page.getByTestId('ob-options').first().click();await page.getByTestId('ob-options-edit-mode').check();await page.getByTestId('ob-options-ok').click();
  await tool(page,lang,'lss.nav');await expect(id(page,'lss-region-card')).toBeVisible();}],
 ['Extract LSS Galaxy Data for Region',async page=>{await id(page,'lss-region-open').click();await expect(id(page,'lss-region-ok')).toBeVisible();}],
 ['Input Error!',async page=>{await id(page,'lss-region-ok').click();await expect(id(page,'lss-region-box')).toBeVisible();}],
 ['non-numeric data',async page=>{await id(page,'lss-region-box').getByRole('button').click();await expect(id(page,'lss-region-box')).toBeHidden();
  await id(page,'lss-region-raMin').fill('abc');await id(page,'lss-region-ok').click();await expect(id(page,'lss-region-box')).toBeVisible();}],
 ['Search Results',async page=>{await id(page,'lss-region-box').getByRole('button').click();await expect(id(page,'lss-region-box')).toBeHidden();
  for(const [k,v] of [['raMin','12'],['raMax','12.5'],['decMin','27'],['decMax','29']])await id(page,`lss-region-${k}`).fill(v);
  await id(page,'lss-region-ok').click();await expect(id(page,'lss-region-box')).toContainText('24069',{timeout:30_000});}],
 ['region rows',async page=>{await id(page,'lss-region-box').getByRole('button').click();await expect(id(page,'lss-region-rows')).toBeVisible();}],
 ['region Retain Current Data?',async page=>{await id(page,'lss-region-open').click();await id(page,'lss-region-ok').click();await expect(id(page,'lss-region-box').getByRole('button')).toHaveCount(3);}],
];
export async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#lss-survey`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 const c:Context={};
 for(const [step,run] of STEPS){await run(page,lang,c);await page.waitForTimeout(200);await each(step);}
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy exempted the wedge table from the crossing check and reported a crossing inside a sideways scroller
 * too. Run with the CI's DejaVu fonts (docs/I18N.md). */
export const LAYOUT:LayoutOptions={crossingExempt:'.wedge-table-wrap',crossingInScrollers:true};
