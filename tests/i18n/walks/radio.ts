import type {LayoutOptions} from '../../fixtures/layoutProblems';
import {type Page,type Locator} from '@playwright/test';
import {test,expect} from '../../fixtures/area-tripwire';
import {langQuery} from '../../fixtures/language';
import {enterInstructorMode} from '../../fixtures/instructor-mode';
import en from '../../../src/i18n/en.json' with {type:'json'};
import {type LanguageText} from '../languageText';
import {isPseudo,pseudoName,htmlLangOf,type Pseudo} from '../../fixtures/pseudoNames';

// Front SC12 (docs/I18N.md): the walk of tests/i18n/radio.spec.ts and the helpers it needs, moved here unchanged in behaviour so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales; the spec's header describes it.
export type Lang='en'|Pseudo|LanguageText;
/** A test title: Spanish keeps its ES8a title; another language names itself and its tag. */
export const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
export const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
export const E=en as Record<string,string>;
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
export const SAME=new Set<string>([
 'VIREO','OpenVireo','SHA-256','UT','UTC','MJD','JD','MHz','K','ms','px','J2000.0','B1950.0','Pulsars.dat','Pulsars.HTL','PEpoch (MJD):','HH:MM:SS',
 'S400:','S600:','S1400:','Radio','Radio...','N','S','E','#','?','·','—','✳','↗','×','▸','›',
 // The same word in Spanish (VIREO's No and Min, the web's «no» and «Bytes»).
 'No','no','Min','Hrs','Bytes',
 // VIREO's stored ID when the field is empty (UNKNOWN_ID, recorded data), quoted in the date error box.
 '“UNKNOWN”',
 // The test's own typed values and the bundled catalog's first rows as recorded.
 'NOPE',
]);
/** A pulsar name (B0329+54, J0332+5434, 0329+54) or a Pulsars.dat value, a hash, a file name, or a number with its unit. */
export const RECORDED=/^(?:[BJ]?\d{4}[+-−]\d{2,4}[A-Z]?)$|^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{12}$|^[\w.-]+\.(?:dat|DAT|HTL|PLR|txt|TXT|json)$/;
export const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*(?:\s*(?:MHz|ms|s|K|h|m|px|UT|Z|°|mJy|pc\/cm\^3|rad|×))*\s*$/;
export const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?(?: UT)?$/;
/** Front PT5: texts of the walk that are the same words in another language (its identical.json or originals, with a reason
 * each), and shared SAME entries that are Spanish words only, which that language must translate. Spanish's set is unchanged. */
export const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set(['OK','Longitude','Latitude','Altitude','Pulsar']),
 // Front FR5: French (identical.json: VIREO's OK, Longitude, Latitude, Altitude, Pulsar, Options, Site..., Horizon, Type and Mode
 // are the same words in French, and the web's «Second», the second of two marks).
 fr:new Set(['OK','Longitude','Latitude','Altitude','Pulsar','Options','Site...','Horizon','Type','Mode','Second'])};
export const NOT_SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set(['Radio','Radio...','E','No','no','Hrs']),
 // Front FR5: Spanish-only words French translates (Non, non, h, Octets); Radio, Radio... and E (Est) are the same in French.
 fr:new Set(['No','no','Hrs','Bytes'])};
export const same=(text:string,L?:LanguageText)=>{
 if(L!==undefined&&(SAME_IN[L.tag]?.has(text)??false))return true;
 if(L!==undefined&&(NOT_SAME_IN[L.tag]?.has(text)??false))return false;
 return SAME.has(text)||RECORDED.test(text)||NUMERIC.test(text)||ISO.test(text);
};
export const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
/** Front SC12: an English text's name in any pseudo-locale (qps and the script variants; tests/fixtures/pseudoNames.ts). */
export const pseudo=pseudoName;
export const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
/** The accessible name of a catalog key in this language. */
export const N=(lang:Lang,key:string)=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(E[key]);if(isPseudo(lang))return pseudo(E[key]);const C=lang.catalog as Record<string,string>;if(!Object.hasOwn(C,key))throw new Error(`no ${lang.entry.englishName} for ${key}`);return exact(C[key]);};
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
export const normal=(text:string)=>text.replace(/&(&?)/g,(_,d:string)=>d).trim();
export const vireoOf=(L:LanguageText)=>(text:string)=>{const key=normal(text);return Object.hasOwn(L.originals,key)?L.originals[key]:key;};
export const esc=(text:string)=>text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&');

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native
 * `lang="en"` views. */
export const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>el.closest('.portal-header,[data-i18n-shell],script,style,[data-testid=site-tour],[data-testid=instructor-mode-banner]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const select of document.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 for(const t of document.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 return out;
});
export const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
export const main=(page:Page)=>page.locator('main.observatory-main').filter({has:page.getByTestId('radio-route')});
export const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
export const UT='2026-10-24T12:00:00';
/** Receiving until the sweep finishes (the page clock runs). */
export async function untilFinished(page:Page){await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false',{timeout:30_000});}

/** The walk through the radio telescope route. Each step leaves the screen in the state its texts are read in. */
export const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
 ['radio route',async page=>{await openAll(main(page));}],
 ['exercise entered',async page=>{await id(page,'radio-exercise').click();}],
 ['scenario inputs',async page=>{await id(page,'radio-env-compiled').click();}],
 ['access requested',async page=>{await id(page,'radio-access').click();await expect(id(page,'radio-timer')).toBeVisible();}],
 ['access delivered',async page=>{await id(page,'radio-timer-deliver').click();await expect(id(page,'radio-switch')).toBeEnabled();}],
 ['radio clock',async page=>{await id(page,'radio-clock-utc').fill(UT);await id(page,'radio-clock-apply').click();await id(page,'radio-clock-longitude').click();await expect(id(page,'radio-date-menu')).toBeEnabled();}],
 ['Set Date/Time, ID',async page=>{await id(page,'radio-date-menu').click();await expect(id(page,'radio-date-dialog')).toBeVisible();}],
 ['date error',async page=>{await id(page,'radio-date-field-date').fill('2026/13/45');await id(page,'radio-date-ok').click();await expect(id(page,'radio-date-error')).toBeVisible();}],
 ['control panel',async page=>{await id(page,'radio-date-error-ok').click();await id(page,'radio-date-cancel').click();await id(page,'radio-switch').click();await expect(id(page,'radio-panel-window')).toBeVisible();await openAll(main(page));}],
 ['tracking on',async page=>{await id(page,'antenna-tracking').click();}],
 ['hot list empty',async page=>{await id(page,'antenna-hotlist-open').click();await expect(id(page,'antenna-notice')).toBeVisible();}],
 ['Set Coordinates',async page=>{await id(page,'antenna-notice-ok').click();await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();}],
 ['B1950 entry',async page=>{await id(page,'antenna-epoch-1').check();}],
 ['slew question',async page=>{for(const [f,v] of [['raHours','3'],['raMinutes','29'],['raSeconds','0'],['decDegrees','54'],['decMinutes','0'],['decSeconds','0']] as const)await id(page,`antenna-field-${f}`).fill(v);
  await id(page,'antenna-dialog-ok').click();await expect(id(page,'antenna-notice')).toBeVisible();}],
 ['slew declined',async page=>{await id(page,'antenna-notice-no').click();await expect(id(page,'antenna-notice')).toHaveCount(0);}],
 ['options refused',async page=>{await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-refusal')).toBeVisible();}],
 ['Optical Simulation Options',async page=>{await id(page,'radio-access-refusal-ok').click();await enterInstructorMode(page);await id(page,'radio-access-numeric-optin-true').click();await expect(id(page,'radio-access-numeric')).toHaveAttribute('data-authority','compiled-branch');
  await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-parent')).toBeVisible();}],
 ['Radio Simulation Options',async page=>{await id(page,'radio-access-radio').click();await expect(id(page,'radio-options-full')).toBeVisible();await openAll(id(page,'radio-options-full'));}],
 ['radio Site',async page=>{await id(page,'radio-options-site').click();await expect(id(page,'radio-station-dialog')).toBeVisible();}],
 ['options closed',async page=>{await id(page,'radio-station-cancel').click();await id(page,'radio-access-child-cancel').click();await id(page,'radio-access-parent-cancel').click();await expect(id(page,'radio-access-parent')).toHaveCount(0);await openAll(main(page));}],
 ['reference catalog',async page=>{await id(page,'pulsar-ref-bundled').click();await expect(id(page,'pulsar-ref-rows')).toBeVisible({timeout:30_000});}],
 ['Pulsar Parameters',async page=>{await id(page,'pulsar-params-open').click();await expect(id(page,'pulsar-params-window')).toBeVisible();}],
 ['Find Pulsar',async page=>{await id(page,'pulsar-params-find').click();await expect(id(page,'pulsar-find-dialog')).toBeVisible();}],
 ['pulsar not found',async page=>{await id(page,'pulsar-find-query').fill('NOPE');await id(page,'pulsar-find-ok').click();await expect(id(page,'pulsar-params-notice')).toBeVisible();}],
 ['Pulsar Parameters closed',async page=>{await id(page,'pulsar-params-notice-ok').click();await id(page,'pulsar-params-exit').click();await expect(id(page,'pulsar-params-window')).toHaveCount(0);}],
 ['receiver',async page=>{await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();await openAll(main(page));}],
 ['channels added',async page=>{await id(page,'receiver-add').click();await expect(id(page,'receiver-card-1')).toBeVisible();await id(page,'receiver-add').click();await expect(id(page,'receiver-card-2')).toBeVisible();}],
 ['Cannot Close Receiver',async page=>{await id(page,'receiver-close-1').click();await expect(id(page,'receiver-close-box')).toBeVisible();}],
 ['record armed',async page=>{await id(page,'receiver-close-box-ok').click();await id(page,'receiver-close-2').click();await id(page,'receiver-close-1').click();await expect(id(page,'receiver-card-1')).toHaveCount(0);
  await id(page,'receiver-record').click();}],
 ['receiving',async page=>{await id(page,'receiver-mode').click();await expect(id(page,'receiver-record-capturing')).toBeVisible();await page.waitForTimeout(800);}],
 ['Identify',async page=>{await id(page,'receiver-mode').click();await untilFinished(page);await expect(id(page,'receiver-record-finish')).toHaveAttribute('data-stage','identify');}],
 ['data properties',async page=>{await id(page,'receiver-record-identify-ok').click();await expect(id(page,'receiver-record-finish')).toHaveAttribute('data-stage','properties');}],
 ['Save question',async page=>{await id(page,'receiver-record-properties-ok').click();await expect(id(page,'receiver-record-finish')).toHaveAttribute('data-stage','save');}],
 ['mark placed',async page=>{await id(page,'receiver-record-save-cancel').click();await expect(id(page,'receiver-record-finish')).toHaveCount(0);
  await id(page,'receiver-mark-position-0').fill('200');await id(page,'receiver-mark-place-0').click();await expect(id(page,'receiver-mark-label-first-0')).toContainText('200');}],
 ['unsaved data question',async page=>{await id(page,'receiver-record').click();await expect(id(page,'receiver-record-prompt-text')).toBeVisible();}],
 ['Record Save dialog',async page=>{await id(page,'receiver-record-yes').click();await expect(id(page,'receiver-record-save')).toBeVisible();}],
];
export async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#radio-control`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
 await expect(id(page,'radio-exercise')).toBeVisible({timeout:30_000});
 for(const [step,run] of STEPS){await test.step(step,()=>run(page,lang));await page.waitForTimeout(150);await each(step);}
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy also took modal alert dialogs, checked inside the topmost one and checked dt; the fixture adds the
 * plot-text check. Run with the CI's DejaVu fonts (docs/I18N.md). */
export const LAYOUT:LayoutOptions={dialogs:'dialog[open],[role=dialog][aria-modal=true],[role=alertdialog][aria-modal=true]',topDialog:true,controls:'button,label,legend,h1,h2,h3,h4,select,input,summary,th,dt'};
