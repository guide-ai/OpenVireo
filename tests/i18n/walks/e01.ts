import type {LayoutOptions} from '../../fixtures/layoutProblems';
import {type Page,type Locator} from '@playwright/test';
import {expect} from '../../fixtures/area-tripwire';
import {langQuery} from '../../fixtures/language';
import en from '../../../src/i18n/en.json' with {type:'json'};
import {type LanguageText} from '../languageText';
import {isPseudo,pseudoName,htmlLangOf,type Pseudo,pseudoStart} from '../../fixtures/pseudoNames';

// Front SC12 (docs/I18N.md): the walk of tests/i18n/e01.spec.ts and the helpers it needs, moved here unchanged in behaviour so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales; the spec's header describes it.
export type Lang='en'|Pseudo|LanguageText;
export const E=en as Record<string,string>;
export const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
/** A test title: Spanish keeps its ES3 title; another language names itself and its tag. */
export const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
/** Texts that read the same in both languages: catalogue designations, galaxy and field names, VIREO and source document
 * names, formats, symbols and units. Exact strings only: a caption left in English fails. */
export const GALAXIES=['UM-I – 1','UM-I – 2','UM-I – 3','CorBor – 1','CorBor – 2','CorBor – 3','Peg – 1','Peg – 2','Peg – 3','Coma – 1','Coma – 2','Boo – 1','Boo – 2'];
export const TARGETS:readonly (readonly [string,string])[]=[['36773','UM-I – 2'],['36747','UM-I – 1'],['54876','CorBor – 2'],['54875','CorBor – 1'],['54891','CorBor – 3'],['NGC 7499','Peg – 1'],['NGC 7501','Peg – 2'],
 ['NGC 7503','Peg – 3'],['36805','UM-I – 3'],['NGC 4874','Coma – 1'],['NGC 4889','Coma – 2'],['51976','Boo – 1'],['51975','Boo – 2']];
export const SAME=new Set<string>([
 // Formats, names, symbols and units.
 'VIREO','OpenVireo','SHA-256','CSV','JSON','SSP','Multi-Spec','Cursor','z','c z','V','B','U','R','I','V:','B:','U:','R:','I:','Z:','?','↗','×','—','✳','◀','▶','·','km/s','km/s/Mpc','Mpc,','ms','v/D · km/s/Mpc',
 'v = c z · c = 299792.458 km/s','D = 10^((V − M + 5) / 5) / 1,000,000 Mpc',
 // Hubble.HTL target ids and galaxy labels (source identity, F6), the original workbook's row names and the VIREO star target.
 ...GALAXIES,...TARGETS.map(([id])=>id),...TARGETS.map(([id,label])=>`${id} · ${label}`),...TARGETS.map(([id,label])=>`${label} · ${id}`),
 'UM-I - 1','UM-I - 2','UM-I - 3','Coma-1','Coma-2','Boo-1','Boo-2','CB-1','CB-2','CB-3','Peg-1','Peg-2','Peg-3','N0000.DAT@14428','catalog-galaxy-acquisition',
 // The source documents as recorded (HUBBLE_SOURCES).
 'Hubble Data.xls · Sheet1!C2:J16','Vireo Manual.pdf · Hubble exercise, 13 designated targets','The Hubble Redshift Distance Relation · 24 Nov 2008, pp. 11–12',
 // VIREO's galaxy line list as the original GLXYLNS.LST names its lines (data, shown as recorded).
 'K Line','H Line','G Band','K Line (Ca II)','H Line (Ca II + H)','G Band (Blend)',
]);
/** A hash (with or without its SHA-256 label), a workbook cell reference, or a downloaded acquisition file name. */
export const RECORDED=/^(?:SHA-256 )?(?:[0-9a-f]{12}|[0-9a-f]{14}|[0-9a-f]{64})$|^Hubble Data\.xls · Sheet1!(?:C\d+|D\d+ × I2)$|^catalog-(?:galaxy|star)-[\w@.-]+-[0-9a-f]{12}\.sp$/;
/** A number with its unit or symbol, and nothing else that could be a word. */
export const NUMERIC=/^[-+−±\d\s.,:;°′″·×/()[\]–%=]*\d[-+−±\d\s.,:;°′″·×/()[\]–%=]*(?:\s*(?:Å|km\/s(?:\/Mpc)?|Mpc|ms|mag|h|s|m|JD|z))*\s*$/;
/** Front PT2: texts that are the same words in another language (its identical.json, with a reason each). Spanish adds none. */
export const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set(['OK','Zoom','v · km/s · float32']),
 // Front FR2: the same words in French (src/i18n/fr/identical.json): VIREO's OK and Zoom, the velocity column's format, the
 // analyser's edition line (names), the Hubble axis (distance, a unit) and VIREO's Classification (FR1's identical original).
 fr:new Set(['OK','Zoom','v · km/s · float32','VIREO / HUBBLE','Distance · Mpc','Classification'])};
/** Front PT2: Portuguese writes the measurement log's bit pattern as English does («bits 3c23d70a»; Spanish «patrón de bits»). */
export const RECORDED_IN:Readonly<Record<string,RegExp>>={'pt-BR':/^bits [0-9a-f]{8}$/};
export const same=(text:string,L?:LanguageText)=>SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text)||(L!==undefined&&((SAME_IN[L.tag]?.has(text)??false)||(RECORDED_IN[L.tag]?.test(text)??false)));
export const id=(page:Page,testId:string)=>page.getByTestId(testId);
/** Front SC12: an English text's name in any pseudo-locale (qps and the script variants; tests/fixtures/pseudoNames.ts). */
export const pseudo=pseudoName;
export const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
/** The accessible name of a catalog key in this language. */
export const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
export const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(isPseudo(lang))return pseudo(E[key],params);const C=lang.catalog;if(!Object.hasOwn(C,key))throw new Error(`No ${lang.entry.englishName} for ${key}`);return exact(fill(C[key],params));};
export const button=(scope:Page|Locator,lang:Lang,key:string)=>scope.getByRole('button',{name:N(lang,key)});

export async function open(page:Page,lang:Lang,hash='galaxy-exposure'){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install();page.setDefaultTimeout(20_000);
 await page.goto(`/${langQuery(tagOf(lang))}#${hash}`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
 await expect(button(page,lang,'galaxyExposure.activate')).toBeVisible({timeout:20_000});
}
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
 return out;
});
export const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
export const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
export const tool=async(page:Page,lang:Lang,key:string)=>{
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.portal-header nav').getByRole('button',{name:N(lang,key)}).click();
};

/** The walk through E01. Each step leaves the screen in the state its texts are read in. */
export const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
 ['Hubble lab guide',async(page,lang)=>{await tool(page,lang,'lab.nav');const guide=page.locator('dialog[aria-labelledby=hubble-lab-heading]');await expect(guide).toBeVisible();await openAll(guide);}],
 ['galaxy exposure',async(page,lang)=>{const guide=page.locator('dialog[aria-labelledby=hubble-lab-heading]');await button(guide,lang,'lab.goExposure').click();await expect(guide).toBeHidden();
  await page.getByLabel(N(lang,'galaxyExposure.targetSelector')).selectOption('36747');await openAll(page.locator('body'));}],
 ['galaxy exposure running',async(page,lang)=>{await button(page,lang,'galaxyExposure.activate').click();await button(page,lang,'galaxyExposure.start').click();await page.clock.runFor(1000);
  await openAll(page.locator('body'));}],
 ['spectrum analyser with the acquired galaxy',async(page,lang)=>{
  await button(page,lang,'galaxyExposure.analyze').click();await expect(id(page,'z-value')).toBeVisible();
  await page.getByLabel(N(lang,'spectrum.stepLabel')).fill('.001');await button(page,lang,'spectrum.applyStep').click();await page.getByRole('slider').fill('10');await openAll(page.locator('.spectrum-route'));}],
 ['Hubble diagram from the workbook example',async(page,lang)=>{const card=page.locator('.hubble-card');await openAll(page.locator('body'));await button(card,lang,'hubble.loadExample').click();
  await card.locator('#hubble-recipe').selectOption('vireo');await expect(card.getByTestId('hubble-value')).toHaveText('52.49829 km/s/Mpc');await openAll(card);}],
 ['engine Zoom dialog',async page=>{const zoom=id(page,'engine-zoom');if(await zoom.isEnabled()){await zoom.click();await expect(id(page,'engine-zoom-dialog')).toBeVisible();}}],
 ['Observational Data',async(page,lang)=>{if(await id(page,'engine-zoom-dialog').isVisible())await page.keyboard.press('Escape');
  await page.getByRole('button',{name:new RegExp(N(lang,'spectrum.record').source.replace(/\$$/,'').concat(' ↗$'))}).click();await expect(id(page,'hubble-obsdata')).toBeVisible();}],
 ['measurement recorded',async page=>{const z=Number(await id(page,'hubble-obsdata-z').inputValue());await id(page,'hubble-obsdata-vel').fill(String(Math.round(299792.458*z*100)/100));
  await id(page,'hubble-obsdata-ok').click();await expect(id(page,'hubble-obsdata')).toHaveCount(0);await expect(page.locator('#measurement-log tbody tr')).toHaveCount(1);await openAll(page.locator('.spectrum-route'));}],
 ['Hubble diagram with the recorded measurement',async(page,lang)=>{const card=page.locator('.hubble-card');await button(card,lang,'hubble.clear').click();await button(card,lang,'hubble.addMeasurements').click();
  await card.getByLabel(N(lang,'hubble.apparentMagnitude',{id:'1'})).fill('15.6');await card.getByLabel(N(lang,'hubble.targetIdentity',{id:'1'})).selectOption('36747');await card.locator('#hubble-recipe').selectOption('workbook');await openAll(card);}],
 ['sky exposure',async(page,lang)=>{await tool(page,lang,'skyExposure.nav');await button(page,lang,'skyExposure.activateSupportedSkyField').click();await button(page,lang,'skyExposure.startSkyExposure').click();await page.clock.runFor(1000);
  await button(page,lang,'skyExposure.pauseExposure').first().click();await openAll(page.locator('body'));}],
 ['star exposure and its SSP save',async(page,lang)=>{await tool(page,lang,'starExposure.nav');await button(page,lang,'starExposure.activate').click();await button(page,lang,'starExposure.start').click();await page.clock.runFor(1000);
  await button(page,lang,'skyExposure.pauseExposure').first().click();await expect(id(page,'ob-spectrum-save')).toBeVisible();await openAll(page.locator('body'));}],
 ['Spectral Range warning',async page=>{await page.locator('[data-testid$=spectral-range-open]:visible').first().click();await expect(id(page,'spectral-range-warning')).toBeVisible();}],
 ['Spectral Range dialog',async page=>{await id(page,'spectral-range-warning-ok').click();await expect(id(page,'spectral-range-dialog')).toBeVisible();}],
 ['spectrometer route',async(page,lang)=>{await page.keyboard.press('Escape');await expect(id(page,'spectral-range-dialog')).toHaveCount(0);await tool(page,lang,'spectrometer.nav');await openAll(page.locator('body'));}],
 // The single-slit spectrometer at a free pointing (NGC 4874, Coma – 1, pointed exactly as tests/field-spectrometer.spec.ts does).
 ['field spectrometer at a free pointing',async(page,lang)=>{
  await tool(page,lang,'sky.observatory');const dome=page.getByRole('button',{name:new RegExp(N(lang,'sky.open').source.replace(/\$$/,'').concat(' ↗$'))});if(await dome.isVisible())await dome.click();// the star field opened it
  if(!await page.locator('#point-ra').isVisible())await page.getByText(N(lang,'sky.coordinates')).click();
  await page.locator('#point-ra').fill('12.99311111111111');await page.locator('#point-dec').fill('27.959722222222222');await button(page,lang,'sky.pointCoordinates').click();
  await page.getByRole('button',{name:new RegExp(/^\s*[⟦]?\s*T[eé]l[eé]sc[oó]p[eéi]/.source+'|'+pseudoStart('Telescope').source)}).first().click();
  if(!await button(page,lang,'runningClock.trackingOn').isVisible())await page.getByText(N(lang,'runningClock.title')).click();
  if(await button(page,lang,'runningClock.trackingOn').isVisible())await button(page,lang,'runningClock.trackingOn').click();
  await tool(page,lang,'spectrometer.nav');await expect(id(page,'field-spec-use')).toBeEnabled({timeout:60_000});await id(page,'field-spec-use').click();
  await expect(id(page,'field-spec-acquisition')).toBeVisible({timeout:90_000});await expect(id(page,'field-spec-access')).toHaveAttribute('data-access','ready',{timeout:30_000});await openAll(page.locator('body'));}],
 ['field spectrometer exposure paused',async(page,lang)=>{const a=id(page,'field-spec-acquisition');await button(a,lang,'fieldSpec.activate').click();await button(a,lang,'fieldSpec.start').click();
  await page.clock.runFor(1000);await button(a,lang,'fieldSpec.pause').click();await openAll(page.locator('body'));}],
];
export async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await open(page,lang);
 for(const [step,run] of STEPS){await run(page,lang);await page.waitForTimeout(200);await each(step);}
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy checked inside dialog[open] only and reported a crossing inside a sideways scroller too; the fixture
 * adds [role=dialog]/[role=alertdialog] boxes to the crossing check. Run with the CI's DejaVu fonts (docs/I18N.md). */
export const LAYOUT:LayoutOptions={dialogs:'dialog[open]',crossingInScrollers:true};
