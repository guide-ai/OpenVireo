import {type Page,type Locator} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,langQuery} from '../fixtures/language';
import {layoutProblems,type LayoutOptions} from '../fixtures/layoutProblems';
import {readFileSync} from 'node:fs';
import {enterInstructorMode} from '../fixtures/instructor-mode';
import en from '../../src/i18n/en.json' with {type:'json'};
import {TRANSLATED,radioMaps,type LanguageText} from './languageText';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT5: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, originals and radio maps,
// never hard-coded text). The Spanish tests keep their titles and assertions; a language before its release (pt-BR) runs the same
// checks under its own titles in its `?lang=` preview, which beats the es-MX browser language. English and qps run once.
// Front ES8a (docs/I18N.md): the radio telescope route (#radio-control) in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk runs
// in English, Spanish and the pseudo-locale: the route page and its scenario, the exercise menu, the scenario inputs, Radio access
// and its timer, the Radio switch and VIREO's control panel (Tracking, Set Coordinates with the B1950.0 entry, the slew question,
// the empty hot list box), the student options refusal (USER OPTIONS!), in instructor mode the Optical and Radio Simulation
// Options with the radio Site dialog, the bundled Pulsars.dat with Pulsar Parameters and its Find dialog and not-found box, the
// radio clock, Set Observation Date/Time, ID with its error box, the receiver with two added channels and the Cannot Close
// Receiver box, Record armed, a capture, Identify, the data properties, the Save question and the unsaved-data question.
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and the narrow patterns below (pulsar names, Pulsars.dat field values, numbers with units, hashes);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) are left out of both comparisons.
// Recorded data stays English: pulsar names (B/J), the Pulsars.dat values shown in Pulsar Parameters, file names and hashes.
type Lang='en'|'qps'|LanguageText;
/** A test title: Spanish keeps its ES8a title; another language names itself and its preview. */
const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
const E=en as Record<string,string>;
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
const SAME=new Set<string>([
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
const RECORDED=/^(?:[BJ]?\d{4}[+-−]\d{2,4}[A-Z]?)$|^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{12}$|^[\w.-]+\.(?:dat|DAT|HTL|PLR|txt|TXT|json)$/;
const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*(?:\s*(?:MHz|ms|s|K|h|m|px|UT|Z|°|mJy|pc\/cm\^3|rad|×))*\s*$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?(?: UT)?$/;
/** Front PT5: texts of the walk that are the same words in another language (its identical.json or originals, with a reason
 * each), and shared SAME entries that are Spanish words only, which that language must translate. Spanish's set is unchanged. */
const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set(['OK','Longitude','Latitude','Altitude','Pulsar'])};
const NOT_SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set(['Radio','Radio...','E','No','no','Hrs'])};
/** Front PT5: the receiver's Record Save dialog also renders texts of the pulsar analysis map (`pulsar`, through
 * createPulsarTranslator), which Portuguese translates in PT6 (E06), as ES8a waited for ES8b. Until then only these keys may read
 * as English in pt-BR, only on that step; remove the list when PT6 merges (its test then fails if a key is still English). */
const TODO_PT6_PULSAR_KEYS=['pulsar.rawExport.scope','pulsar.rawExport.format','pulsar.rawExport.inactive','pulsar.rawExport.inactiveNone','pulsar.rawExport.loss.heading',
 'pulsar.rawExport.loss.header','pulsar.rawExport.loss.headerNone','pulsar.rawExport.loss.samples','pulsar.rawExport.loss.memory','pulsar.save.how','pulsar.save.extensionRule',
 'pulsar.save.origin','pulsar.save.warning','pulsar.save.choose','pulsar.save.chooseAgain','pulsar.save.refusal.stale'] as const;
const TODO_PT6_TAGS:ReadonlySet<string>=new Set(['pt-BR']);
// Read from the English map's source (importing it here would pull in the catalog without an import attribute).
const PULSAR_SOURCE=readFileSync(new URL('../../src/components/PulsarMessages.ts',import.meta.url),'utf8');
const TODO_PT6=TODO_PT6_PULSAR_KEYS.map(k=>{const m=new RegExp(`'${k.replace(/\./g,'\\.')}': '((?:[^'\\\\]|\\\\.)*)'`).exec(PULSAR_SOURCE);if(!m)throw new Error(k);
 const t=m[1].replace(/\\'/g,"'");return new RegExp(`^${t.split(/\{\w+\}/).map(p=>p.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join('[\\s\\S]*?')}$`);});
const pendingPt6=(text:string,L:LanguageText)=>TODO_PT6_TAGS.has(L.tag)&&TODO_PT6.some(p=>p.test(text));
const same=(text:string,L?:LanguageText)=>{
 if(L!==undefined&&(SAME_IN[L.tag]?.has(text)??false))return true;
 if(L!==undefined&&(NOT_SAME_IN[L.tag]?.has(text)??false))return false;
 return SAME.has(text)||RECORDED.test(text)||NUMERIC.test(text)||ISO.test(text);
};
const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const MARK='[⟦⟧·\\s]*';
const pseudo=(text:string)=>new RegExp(`^${MARK}${[...text].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join(MARK)}${MARK}$`);
const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
/** The accessible name of a catalog key in this language. */
const N=(lang:Lang,key:string)=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(E[key]);if(lang==='qps')return pseudo(E[key]);const C=lang.catalog as Record<string,string>;if(!Object.hasOwn(C,key))throw new Error(`no ${lang.entry.englishName} for ${key}`);return exact(C[key]);};
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
const normal=(text:string)=>text.replace(/&(&?)/g,(_,d:string)=>d).trim();
const vireoOf=(L:LanguageText)=>(text:string)=>{const key=normal(text);return Object.hasOwn(L.originals,key)?L.originals[key]:key;};
const esc=(text:string)=>text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&');

/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native
 * `lang="en"` views. */
const texts=(page:Page)=>page.evaluate(()=>{
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
const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
const main=(page:Page)=>page.locator('main.observatory-main').filter({has:page.getByTestId('radio-route')});
const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
const UT='2026-10-24T12:00:00';
/** Receiving until the sweep finishes (the page clock runs). */
async function untilFinished(page:Page){await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false',{timeout:30_000});}

/** The walk through the radio telescope route. Each step leaves the screen in the state its texts are read in. */
const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
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
async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#radio-control`);
 await expect(page.locator('html')).toHaveAttribute('lang',typeof lang==='string'?'en':lang.entry.htmlLang);
 await expect(id(page,'radio-exercise')).toBeVisible({timeout:30_000});
 for(const [step,run] of STEPS){await test.step(step,()=>run(page,lang));await page.waitForTimeout(150);await each(step);}
}

for(const L of TRANSLATED){
 const C=L.catalog as Record<string,string>;
 test(title(L,'the radio telescope reads differently in Spanish from English: route, control panel, options, Pulsar Parameters, clock, date and receiver','the radio telescope reads differently in <L> (<tag> preview) from English: route, control panel, options, Pulsar Parameters, clock, date and receiver'),async({browser})=>{
 test.setTimeout(360_000);
 const seen:Record<'en'|'own',Map<string,Set<string>>>={en:new Map(),own:new Map()};
 for(const lang of ['en','own'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await walk(page,lang==='en'?'en':L,async step=>{seen[lang].set(step,new Set(await texts(page)));});
  expect(errors,lang==='en'?'en':L.tag).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();// each text once, with the first step that shows it
 for(const [step,list] of seen.own)for(const t of list)if(english.has(bare(t))&&!same(bare(t),L)&&!(step==='Record Save dialog'&&pendingPt6(bare(t),L))&&!left.has(t))left.set(t,step);
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 // The scenario selectors' options are in the language.
 const options=[...seen.own.get('control panel')!].filter(t=>t.startsWith('@option:'));
 expect(options).toContain(`@option:${C['radio.env.dome.0']}`);
 });
}

test('qps: every text of the radio walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

/** VIREO's captions on each step, in English (View original, English) or in this load's Spanish. */
const captions=(page:Page,T:(original:string)=>string):Record<string,()=>Promise<void>>=>({
 'radio route':async()=>{await expect(id(page,'radio-save-recorded-data')).toHaveText(`${T('&File')} ▸ ${T('Save Recorded Data...')}`);},
 'exercise entered':async()=>{await expect(id(page,'radio-switch-panel-caption')).toHaveText(T('Telescope Control Panel'));},
 'control panel':async()=>{await expect(id(page,'antenna-form-caption')).toHaveText(T('VIREO Radio Telescope Control Panel'));await expect(id(page,'antenna-tracking')).toHaveText(T('Tracking'));
  await expect(id(page,'antenna-receiver-button')).toHaveText(T('Receiver'));await expect(id(page,'radio-switch-caption')).toHaveText(T('On'));},
 'hot list empty':async()=>{await expect(id(page,'antenna-notice').locator('h3')).toHaveText(T('Observation List Empty'));await expect(id(page,'antenna-notice-text')).toHaveText(T('No items in Observation List!'));
  await expect(id(page,'antenna-notice-ok')).toHaveText(T('OK'));},
 'Set Coordinates':async()=>{const d=id(page,'antenna-dialog');await expect(d.locator('h3')).toHaveText(T(' Enter Sky Coordinates for Slew'));await expect(d.locator('legend').first()).toHaveText(T('Right Ascension'));
  await expect(id(page,'antenna-dialog-ok')).toHaveText(T('&OK'));await expect(id(page,'antenna-dialog-cancel')).toHaveText(T('&Cancel'));},
 'slew question':async()=>{await expect(id(page,'antenna-notice-yes')).toHaveText(T('Yes'));await expect(id(page,'antenna-notice-no')).toHaveText(T('No'));},
 'options refused':async()=>{await expect(id(page,'radio-access-refusal-title')).toHaveText(T('USER OPTIONS!'));await expect(id(page,'radio-access-refusal-ok')).toHaveText(T('OK'));},
 'Optical Simulation Options':async()=>{const d=id(page,'radio-access-parent');await expect(d.locator('h3')).toHaveText(T('Optical Simulation Options'));await expect(id(page,'radio-access-radio')).toHaveText(T('&Radio...'));
  await expect(id(page,'radio-access-parent-ok')).toHaveText(T('&OK'));},
 'Radio Simulation Options':async()=>{const d=id(page,'radio-options-full');await expect(d.locator('h3').first()).toHaveText(T('Radio Simulation Options'));await expect(id(page,'radio-options-site')).toHaveText(T('&Site...'));
  await expect(id(page,'radio-options-site')).toHaveAttribute('title',(t=>t==='Set location  time parameters.'?'Set location & time parameters.':t)(T('Set location & time parameters.')));await expect(d).toContainText(T('Antenna Aperture'));await expect(d).toContainText(T('Pulsar Identification'));
  await expect(d).toContainText(T('Fully Steerable'));await expect(d).toContainText(T('Access Pulsar List'));},
 'Pulsar Parameters':async()=>{await expect(id(page,'pulsar-params-heading')).toHaveText(T('Pulsar Parameters'));await expect(id(page,'pulsar-params-find')).toHaveText(T('Find &Pulsar...'));
  await expect(id(page,'pulsar-params-next')).toHaveText(T('&Next'));await expect(id(page,'pulsar-params-window')).toContainText(T('Derived Quantities'));},
 'Find Pulsar':async()=>{const d=id(page,'pulsar-find-dialog');await expect(d.locator('h3')).toHaveText(T('Find Pulsar Data'));await expect(d).toContainText(T('Pulsar Name:'));await expect(id(page,'pulsar-find-ok')).toHaveText(T('&Ok'));},
 'pulsar not found':async()=>{await expect(id(page,'pulsar-params-notice-ok')).toHaveText(T('OK'));},
 'Set Date/Time, ID':async()=>{const d=id(page,'radio-date-dialog');await expect(d.locator('h3')).toHaveText(T('Set Date/Time, ID'));await expect(d).toContainText(T('ID # of Unknown Object'));
  await expect(id(page,'radio-date-ok')).toHaveText(T('OK'));await expect(id(page,'radio-date-cancel')).toHaveText(T('Cancel'));await expect(id(page,'radio-date-menu')).toHaveText(T('Set Observation &Date/Time, ID...'));},
 'receiver':async()=>{await expect(id(page,'receiver-heading-0')).toContainText(T('No Pulsar in Beam!'));await expect(id(page,'receiver-heading-0')).toContainText(T('   Aperture: '));await expect(id(page,'receiver-record')).toHaveText(T('Record'));await expect(id(page,'receiver-add')).toHaveText(T('Add Channel'));
  await expect(id(page,'receiver-mode-disp-0')).toHaveText(T('Stop'));},
 'Cannot Close Receiver':async()=>{const b=id(page,'receiver-close-box');await expect(b.locator('h3')).toHaveText(T('Cannot Close Receiver!'));
  await expect(id(page,'receiver-close-box-text')).toHaveText(T('Close the Lowest Receiver First, or Close the Master Receiver to Close All.'));await expect(id(page,'receiver-close-box-ok')).toHaveText(T('OK'));},
 'mark placed':async()=>{await expect(id(page,'receiver-mark-label-first-0')).toContainText(T(' Sec').trim());await expect(id(page,'receiver-mark-label-first-0')).not.toContainText(T(' Sec').trim()==='Sec'?'Seg':'Sec');},
 'record armed':async()=>{await expect(id(page,'receiver-record-disp')).toHaveText(T('On'));},
 'Identify':async()=>{const f=id(page,'receiver-record-finish');await expect(f.locator('h3')).toHaveText(T('Identify Recorded Object'));await expect(f).toContainText(T('Enter/Verify Name or ID of Object'));
  await expect(id(page,'receiver-record-identify-ok')).toHaveText(T('OK'));},
 'Save question':async()=>{const f=id(page,'receiver-record-finish');await expect(f.locator('h3')).toHaveText(T('Save Data Now?'));await expect(id(page,'receiver-record-save-yes')).toHaveText(T('Yes'));
  await expect(id(page,'receiver-record-save-text')).toHaveText(T('You must save your data if you don\'t plan to analyze it immediately.\r\n\r\nSave the current recorded data now?\r\n("No" -> Open Analysis Window)').replace(/\r\n/g,'\n'),{useInnerText:true});},
 'unsaved data question':async()=>{await expect(id(page,'receiver-record-prompt-text')).toHaveText(T('You have not saved your previously recorded data!  You will lose the previous data if you record now.\r\n\r\nSave previous data now?').replace(/\r\n/g,'\n'),{useInnerText:true});
  await expect(id(page,'receiver-record-cancel')).toHaveText(T('Cancel'));},
});

for(const L of TRANSLATED){
 const C=L.catalog as Record<string,string>,O=L.originals,R=radioMaps(L.tag),vireoIn=vireoOf(L);
// "View original (English)" (decision 9): with the stored option on, every VIREO caption of the walk is VIREO's English, checked
// one by one, and no translated original appears anywhere; OpenVireo's own web text stays in the language.
 test(title(L,'View original (English) on: every VIREO caption in the radio walk reads in English, the web text stays Spanish','View original (English) on: every VIREO caption in the radio walk reads in English, the web text stays <L>'),async({page})=>{
 test.setTimeout(300_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 // Web text (the catalog and the radio control panel's map) and VIREO's English keys are not translated originals.
 const web=new Set([...Object.values(C),...Object.values(R.radioAntenna),...Object.keys(O),...Object.keys(R.identical).filter(k=>k.startsWith('original:')).map(k=>k.slice(9))].map(plain));
 const translated=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>normal(t));
 const left=new Map<string,string>();
 await walk(page,L,async step=>{
  for(const t of await texts(page))if(translated.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  if(step==='radio route')await expect(page.getByRole('heading',{level:1,name:N(L,'radioRoute.title')})).toBeVisible();
  if(step==='control panel')await expect(id(page,'radio-panel-window').locator('h3').first()).toHaveText(C['radio.panel.heading']);
  if(step==='Record Save dialog')await expect(id(page,'receiver-record-save').locator('h3')).toHaveText(R.radioRecordSave['radioSave.heading']);
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 });

 test(title(L,'Spanish: every VIREO caption in the radio walk is its Spanish original; English shows the originals unchanged','<L> (<tag> preview): every VIREO caption in the radio walk is its <L> original; English shows the originals unchanged'),async({browser})=>{
 test.setTimeout(360_000);
 for(const lang of ['own','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,t=>lang==='en'?normal(t):vireoIn(t));
  await walk(page,lang==='en'?'en':L,async step=>{await checks[step]?.();});
  await page.close();
 }
 for(const t of ['VIREO Radio Telescope Control Panel','Tracking','Receiver','Radio Simulation Options','Pulsar Parameters','Find Pulsar Data','Identify Recorded Object','Save Data Now?','Cannot Close Receiver!','Record'])expect(vireoIn(t)).not.toBe(t);
 });
}

/** The receiver's drawn annotation and caption: only VIREO's unit words and title pieces change; numbers and names do not. */
for(const L of TRANSLATED){
 const V=vireoOf(L),sec=esc(V('Sec'));
 test(title(L,'the receiver caption, the drawn annotation and a mark label translate VIREO pieces only','<L> (<tag> preview): the receiver caption, the drawn annotation and a mark label translate VIREO pieces only'),async({page})=>{
 test.setTimeout(180_000);await page.setViewportSize({width:1440,height:1000});
 const drawn:string[]=[];
 await page.exposeFunction('__drawn',(t:string)=>{drawn.push(t);});
 await page.addInitScript(()=>{const f=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(this:CanvasRenderingContext2D,t:string,x:number,y:number,w?:number){(window as unknown as {__drawn:(t:string)=>void}).__drawn(String(t));return w===undefined?f.call(this,t,x,y):f.call(this,t,x,y,w);};});
 const upTo='receiver',steps=STEPS.findIndex(([s])=>s===upTo);
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(L.tag)}#radio-control`);await expect(id(page,'radio-exercise')).toBeVisible({timeout:30_000});
 for(const [,run] of STEPS.slice(0,steps+1))await run(page,L);
 // Spanish: /^(?:Receptor 1|¡No hay ningún púlsar en el haz!|Púlsar \S+)\s+Apertura: \d+ Metros/, built from the originals.
 await expect(id(page,'receiver-heading-0')).toHaveText(new RegExp(`^(?:${esc(V('Receiver'))} 1|${esc(V('No Pulsar in Beam!'))}|${esc(V('Pulsar'))} \\S+)\\s+${esc(V('Aperture:'))} \\d+ ${esc(V('Meters'))}`));
 // Through the capture to a placed mark: the annotation is drawn while receiving, the mark label after it.
 for(const [,run] of STEPS.slice(steps+1,STEPS.findIndex(([s])=>s==='mark placed')+1))await run(page,L);
 await expect.poll(()=>drawn.some(t=>new RegExp(`^\\d+\\.\\d ${sec} $`).test(t))).toBe(true);
 expect(drawn.some(t=>/ Sec /.test(t))).toBe(false);
 expect(drawn.some(t=>/^\d+\.\d{2} MHz {0,}$/.test(t))).toBe(true);
 // A mark's time label (RECEIVER_MARK_LITERALS ' Sec', drawn on the overlay and shown in the DOM): «Seg», never "Sec".
 await expect(id(page,'receiver-mark-label-first-0')).toContainText(new RegExp(`\\d ${sec} \\(`));await expect(id(page,'receiver-mark-label-first-0')).not.toContainText('Sec');
 await expect.poll(()=>drawn.some(t=>new RegExp(`^\\s*\\d+(?:\\.\\d+)? ${sec}$`).test(t))).toBe(true);
 expect(drawn.some(t=>/ Sec$/.test(t))).toBe(false);
 });
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy also took modal alert dialogs, checked inside the topmost one and checked dt; the fixture adds the
 * plot-text check. Run with the CI's DejaVu fonts (docs/I18N.md). */
const LAYOUT:LayoutOptions={dialogs:'dialog[open],[role=dialog][aria-modal=true],[role=alertdialog][aria-modal=true]',topDialog:true,controls:'button,label,legend,h1,h2,h3,h4,select,input,summary,th,dt'};
for(const L of TRANSLATED)for(const width of [320,1440])test(title(L,`at ${width} px the Spanish radio telescope screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> radio telescope screens lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(360_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 // ES8A_LAYOUT_LANG=en|qps walks that reference instead (a debugging aid; the language's own test title is kept).
 await walk(page,(process.env.ES8A_LAYOUT_LANG as 'en'|'qps'|undefined)??L,async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  await page.screenshot({path:test.info().outputPath(`${L.tag}-radio-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});
