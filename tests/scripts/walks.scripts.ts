// Front SC12 (plan analysis/front-plans/front-i18n-scripts.md § 4 item 5; docs/I18N.md "Script groundwork: exports and deep
// walks under the script pseudo-locales (SC10, SC12)"): every exercise's full walk, the same function its language-parameterised
// spec runs (tests/i18n/walks/: E01–E06, E08, the observatory and its Multi-Spec windows, the radio telescope, and the help windows),
// under the dev-only script pseudo-locales and the pinned test fonts of playwright.scripts.config.ts. After each step:
// - the pseudo marker: every visible text, option, accessible name, title and placeholder that still has Latin letters is marked
//   ⟦…⟧, outside the spec's own identifiers and native English mirrors (the spec's qps check, with its `texts` and `same`);
// - layoutProblems() with the spec's own options (overflow, clipping, crossing, plot text) and verticalInkProblems() (glyph ink
//   cut by a clipping box), both of tests/fixtures/layoutProblems.ts;
// - no page error during the walk.
// Every variant runs every check at 320 and 1440 px. Front RT7: now that RT5 mirrors the page, qps-rtl runs the whole layout check
// too (SC12 asserted only "clipped" before mirroring), and after each step also the right-to-left checks of tests/fixtures/
// bidiProblems.ts: the islands of src/theme/rtl.css and every [lang] element compute their direction, the sidebar, page bar, menus,
// dialog close buttons and tour card are on the mirrored side, and text that must read left to right is drawn so (ltrRunProblems;
// an isolate the runtime wrote is never in KNOWN). Problems found are listed in KNOWN with the file and the reason (for qps-rtl,
// tests/fixtures/rtlKnown.ts names the site, file and owner); an entry that stops appearing fails, so a fix is noticed.
import {test,expect,type Page} from '@playwright/test';
import {layoutProblems,verticalInkProblems,type LayoutOptions} from '../fixtures/layoutProblems';
import {SCRIPT_PSEUDO,type ScriptPseudo} from '../fixtures/pseudoNames';
import {islandProblems,ltrRunProblems,mirrorProblems,rtlIslandSelectors} from '../fixtures/bidiProblems';
import {RTL_SITES,knownProblem,type RtlSite,type RtlSiteName} from '../fixtures/rtlKnown';
import {readFileSync} from 'node:fs';
import * as E01 from '../i18n/walks/e01';
import * as E02 from '../i18n/walks/e02';
import * as E03 from '../i18n/walks/e03';
import * as E04 from '../i18n/walks/e04';
import * as E05 from '../i18n/walks/e05';
import * as E06 from '../i18n/walks/e06';
import * as E08 from '../i18n/walks/e08';
import * as OBS from '../i18n/walks/observatory';
import * as RADIO from '../i18n/walks/radio';
import * as HELP from '../i18n/walks/help';

type Width=320|1440;
type Each=(step:string,root?:string)=>Promise<void>;
/** One walk: how it runs, which of its texts are left unmarked, and its spec's layout options. */
type Walk=Readonly<{name:string;timeout:number;run:(page:Page,lang:ScriptPseudo,each:Each)=>Promise<void>;unmarked:(page:Page,step:string,root:string)=>Promise<string[]>;layout:LayoutOptions}>;
/** A print preview's date and time in the page language (src/i18n/screenDate.ts screenDateTime: ja 2026/11/10 22:47:44, hi
 * 9/11/2026, 7:00:15 am, ru 10.11.2026, 22:48:09, ar 10‏/11‏/2026، 10:48:21 م), and the rest of its line. The specs' qps checks
 * exempt the same line in English's format (it is data: the time of the print, before VIREO's own title). */
const SCREEN_DATE=/^\u2068?\d{1,4}\u200f?[/.]\d{1,2}\u200f?[/.]\d{1,4}[,،]? \d{1,2}:\d\d:\d\d(?: ?(?:am|pm|ص|م))?(?:\s|$)/;
const passes=(t:string)=>/[⟦⟧]/.test(t)||SCREEN_DATE.test(t.replace(/^@[a-z-]+:/,''));
const WALKS:readonly Walk[]=[
 {name:'E01',timeout:300_000,run:E01.walk,unmarked:async page=>(await E01.texts(page)).filter(t=>!passes(t)&&!E01.same(E01.bare(t))),layout:E01.LAYOUT},
 {name:'E02',timeout:300_000,run:E02.walk,unmarked:async page=>(await E02.texts(page)).filter(t=>!passes(t)&&!E02.same(E02.bare(t))),layout:E02.LAYOUT},
 {name:'E03',timeout:360_000,run:E03.walk,unmarked:async page=>(await E03.texts(page)).filter(t=>!passes(t)&&!E03.same(E03.bare(t))),layout:E03.LAYOUT},
 {name:'E04',timeout:420_000,run:E04.walk,unmarked:async page=>(await E04.texts(page)).filter(t=>!passes(t)&&!E04.same(E04.bare(t))),layout:E04.LAYOUT},
 {name:'E05',timeout:360_000,run:E05.walk,unmarked:async(page,step)=>(await E05.texts(page,step)).filter(t=>!passes(t)&&!E05.same(E05.bare(t),step)),layout:E05.LAYOUT},
 {name:'E06',timeout:360_000,run:(page,lang,each)=>E06.walk(page,lang,each),unmarked:async page=>(await E06.texts(page)).filter(t=>!passes(t)&&!E06.data(E06.bare(t))),layout:E06.LAYOUT},
 {name:'E08',timeout:480_000,run:E08.walk,unmarked:async(page,_step,root)=>(await E08.texts(page,root)).filter(t=>!passes(t)&&!E08.same(E08.bare(t))),layout:E08.LAYOUT},
 {name:'observatory',timeout:240_000,run:OBS.walk,unmarked:async page=>(await OBS.texts(page)).filter(t=>!passes(t)&&!OBS.same(t.replace(/^@[a-z-]+:/,''))),layout:OBS.LAYOUT},
 {name:'Multi-Spec',timeout:300_000,run:OBS.multiSpecWalk,unmarked:async page=>(await OBS.texts(page)).filter(t=>!passes(t)&&!OBS.same(t.replace(/^@[a-z-]+:/,''))),layout:OBS.LAYOUT},
 {name:'radio',timeout:360_000,run:RADIO.walk,unmarked:async page=>(await RADIO.texts(page)).filter(t=>!passes(t)&&!RADIO.same(RADIO.bare(t))),layout:RADIO.LAYOUT},
 // The help viewers' chrome; the help files stay VIREO's English (lang="en", left out of every check) under a pseudo-locale.
 {name:'help',timeout:240_000,run:HELP.walk,unmarked:async page=>(await HELP.unmarkedHelpTexts(page)).filter(t=>!passes(t)),layout:{dialogs:'dialog[open],[role=dialog][aria-modal=true],[role=alertdialog][aria-modal=true]',topDialog:true}},
];
const ISLANDS=rtlIslandSelectors(readFileSync(new URL('../../src/theme/rtl.css',import.meta.url),'utf8'));

/** Known problems, each with the file that must change and why it is not changed here. `walks`, `variants` and `widths` limit
 * where it is expected; `fontDependent`: within 2 px of a threshold with a font file that differs between this machine and CI
 * (docs/I18N.md SC1), tolerated where listed but not required. */
type Known=Readonly<{walks:readonly string[];variants:readonly ScriptPseudo[];widths:readonly Width[];step:string|RegExp;problem:RegExp;file:string;why:string;fontDependent?:true;
 /** Front RT7 review: the run must be written literally in src (tests/fixtures/rtlKnown.ts knownProblem). */
 literal?:true}>;
const KNOWN:readonly Known[]=[
 {walks:['E02'],variants:['qps-cyrl'],widths:[320],step:'wedge row selected',problem:/^page overflows horizontally/,file:'src/components/Wedge.css (.wedge-details)',
  why:'The details list sizes its label column max-content, so a label never wraps: one long label (Dec (degrees, original rule) as a long Russian word) leaves the value column no room and the raw line pushes the page wider. A track that may shrink changes the English and Spanish phone layout, so it waits for the Russian front.'},
 {walks:['E06'],variants:['qps-cyrl','qps-rtl'],widths:[320],step:'recording loaded',problem:/^page overflows horizontally|^th “.*” leaves the viewport$/,file:'src/components/PulsarAnalysis.css (.plr-props-table), PulsarAnalysis.tsx',
  why:'The receiver properties table is not inside a sideways scroller, and an unbreakable header word (Frequency (MHz), Relative gain) widens it past 320 px. Wrapping it in .table-scroll or letting headers break changes the shared table markup; for the Russian front. Front RT7: qps-rtl\'s longer header word does the same (RT14 with the Russian fix).'},
 {walks:['radio'],variants:['qps-cyrl'],widths:[320],step:'Radio Simulation Options',problem:/^legend “.*” crosses its fieldset$/,file:'src/components/RadioAccessOptions.tsx, RadioControlPanel.css',
  why:'A legend (Pulsar Identification) with one unbreakable word is wider than its 320 px fieldset; legends do not wrap inside a word. Needs a break rule on the options dialog legends; for the Russian front.'},
 {walks:['radio'],variants:['qps-cyrl','qps-rtl'],widths:[320],step:'data properties',problem:/^receiver-record-finish scrolls horizontally$/,file:'src/components/RadioReceiverWindows.css ([data-testid=receiver-record-finish])',
  why:'The Record Data properties box scrolls sideways at 320 px: an unbreakable word in one of its rows is wider than the box. For the Russian front, with the legend above. Front RT7: under qps-rtl too (RT14 with the Russian fix).'},
 {walks:['Multi-Spec'],variants:['qps-cjk','qps-deva','qps-cyrl','qps-rtl'],widths:[320,1440],step:/^Multi-Spec (?:spectrum display|print preview)$/,problem:/^plot text “\u2066?⟦[01]\.0⟧\u2069?” outside its plot ms-(?:spectrum|print-report)/,file:'src/multispec/MultiSpecDisplay.tsx (the 1.0 and 0.0 axis labels, and the print copy)',fontDependent:true,
  why:'A pseudo-locale artifact: VIREO\'s 1.0 and 0.0 axis labels pass through vireo(), so every pseudo-locale wraps them in ⟦ ⟧, and the end-anchored label then starts 1–4 px left of the SVG. A real translation keeps 1.0. keepInsideSvg (src/plotTextFit.ts, SC11) would move them; left, as a pseudo-locale artifact (RT7 applied it to the y-axis title only). Tolerated, not required.'},
 // Front RT7: the rotated y-axis title's 1 px crossing under qps-cjk (SC12's tolerated entry here) is gone: MultiSpecDisplay.tsx now
 // wraps it in keepInsideSvg, which RT7 needed for qps-rtl's 2–4 px.
 {walks:['Multi-Spec'],variants:['qps-cjk'],widths:[320,1440],step:'Multi-Spec Control with selections',problem:/^plot text “3” outside its plot card ms-card \(\d+, \d+, -2,/,file:'src/core/overlayLabels.ts (the Multi-Spec field selection numbers)',fontDependent:true,
  why:'The selection number 3 at the top of the Multi-Spec field reaches 2 px above it under the ja stack: the baseline that SKY-LABELS keeps inside the field allows for the Latin ascent, not the taller one of the CJK fallback. Within 2 px: tolerated, not required.'},

 ...RTL_KNOWN(),
];

/** Front RT7: the deep walks' expected problems under qps-rtl (tests/fixtures/rtlKnown.ts names each site, file and owner). One entry
 * per walk, widths and exact step, so each one is required where it was measured (both widths unless a width is named). */
function RTL_KNOWN():Known[]{
 const both=[320,1440] as const;
 const at=(walk:string,widths:readonly Width[],steps:string|RegExp|readonly string[],...sites:readonly RtlSiteName[]):Known[]=>
  (typeof steps==='string'||steps instanceof RegExp?[steps]:steps).flatMap(step=>sites.map(name=>{const site:RtlSite=RTL_SITES[name];
   return {walks:[walk],variants:['qps-rtl'] as const,widths,step,problem:site.problem,file:site.file,why:site.why,...(site.fontDependent?{fontDependent:true as const}:{}),...(site.literal?{literal:true as const}:{})};}));
 const topics=['OBSRVHLP','CAMHLP','HRANALHLP','PHOTOHLP','SPECHLP','MEASHLP','WDGPLTHLP','PLSANHLP','PULSRHLP'].map(f=>`${f}.LST topics`);
 return [
  // Front LAUNCH-2: the galaxy's slit level (drawsOf) is behind Research notes, so the walk meets it where it opens every disclosure.
  ...at('E01',both,'Hubble lab guide','catalogLiteral'),...at('E01',both,'galaxy exposure','drawsOf'),...at('E01',both,['spectrometer route','star exposure and its SSP save'],'catalogLiteral'),
  ...at('E01',both,'spectrum analyser with the acquired galaxy','zValue','stepFactor','catalogLiteral'),
  ...at('E02',[320],['Retain Current Data?','Confirm Deletion!'],'wedgeStatus'),...at('E02',both,'Search Results','txtSuffix'),
  // The LSS survey (a lazily loaded part) renders its results button behind the lab guide or only once the survey opens: one
  // entry, required at either of the two steps.
  ...at('E02',both,/^LSS (?:lab guide|survey)$/,'txtSuffix'),
  ...at('E02',both,'exposure paused','catalogLiteral'),...at('E02',both,['wedge row selected','wedge with own records'],'wedgeData'),
  ...at('E03',both,['classification lab','normalized sampled difference','observation DAT inspected'],'catalogLiteral'),// LAUNCH-2: the guide's catalog literal is behind Research notes
  ...at('E03',both,'observation DAT inspected','nativeNumbers'),
  ...at('E04',both,'Mayall domain explanation','domainTable'),...at('E04',both,'confirmed fit','pleiadesPercent'),
  ...at('E04',both,['Mayall domain explanation','Pleiades guide','confirmed fit','free pointing input error','invalid shift'],'catalogLiteral'),
  ...at('E05',both,['Add to Hot List','dataset loaded','fit confirmed','observation HR tool','own observations HR'],'catalogLiteral'),
  ...at('E05',both,'Cluster Data report','listSelection'),...at('E05',both,'Possible Cluster Member','memberDec'),
  ...at('E05',both,'cluster help','helpRows'),...at('E05',[320],'cluster help','helpNote'),...at('E05',both,'fit confirmed','confirmedModel'),
  ...at('E05',both,'light curve print preview','printNote'),...at('E05',both,['observation HR tool','own observations HR'],'bvTitle'),
  ...at('E05',both,'observations plotted','cnhrRow'),...at('E05',both,'trial fit','trialTable'),...at('E05',both,['variable star data','variable stars'],'variableResults'),
  ...at('E06',both,['pulsar guide','review edit'],'catalogLiteral'),...at('E06',[1440],'recording loaded','pulsarName'),
  ...at('E06',[1440],'saved file candidate','savedRowsIdentity'),...at('E06',both,'saved file in use','savedRowsIdentity'),
  ...at('E08',both,['Object X guide','radio card'],'catalogLiteral'),...at('E08',both,'observatory pointed','pointingDec'),
  ...at('E08',both,'spectrum ready','objectXTicks'),...at('E08',both,'target measured','objectXMeasurements'),
  ...at('Multi-Spec',both,'Multi-Spec Control with selections','multiSpecNumber'),
  ...at('help',both,[...topics,...topics.map(t=>t.replace('topics','first topic')).filter(t=>!t.startsWith('PULSRHLP')),'CLASSHLP.LST topics','CLASSHLP.LST first topic','Spectral Line Table','Spectral Line Help'],'helpRows'),
  ...at('help',[320],topics,'helpNote'),...at('help',both,'MEASHLP.LST topics','zValue','stepFactor'),
  // Front LAUNCH-2: behind the classification and spectrometer help topics, their pages' catalog literals are behind Research notes.
  ...at('help',both,['HRANALHLP.LST topics','PULSRHLP.LST topics','OpenVireo help topic'],'catalogLiteral'),
  ...at('observatory',both,'Set Date/Time','siteClock','catalogLiteral'),...at('observatory',both,['Slew › Add Current Item/Position','Slew › Set Coordinates'],'catalogLiteral'),
  ...at('observatory',both,'Site Information and its print','siteLines'),
  ...at('observatory',both,'File › Exit Observatory','reminder'),...at('help',both,'Exit Observatory reminder','reminder'),
  ...at('radio',both,'B1950 entry','signBeforeParam'),...at('radio',both,['Optical Simulation Options','Set Coordinates','Set Date/Time, ID','radio route','receiver','slew question'],'catalogLiteral'),
 ];
}

test.describe.configure({mode:'parallel'});
// A step that cannot act fails within seconds instead of spending the whole walk's budget.
test.use({actionTimeout:20_000});

/** Front RT7: qps-rtl runs at both widths, as the others do (SC12 ran it at 320 px only before the page mirrored). */
const WIDTHS:Readonly<Record<ScriptPseudo,readonly Width[]>>={'qps-cjk':[320,1440],'qps-deva':[320,1440],'qps-cyrl':[320,1440],'qps-rtl':[320,1440]};
for(const walk of WALKS)for(const variant of SCRIPT_PSEUDO)for(const width of WIDTHS[variant])
 test(`${walk.name} under ${variant} at ${width} px: every step is marked and lays out without overflow, clipping or cut ink`,async({page})=>{
  test.setTimeout(walk.timeout);
  await page.setViewportSize({width,height:width===320?700:1000});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const problems=new Map<string,string>(),unmarked=new Map<string,string>();
  // A walk that cannot go on is recorded as a problem at the last step it completed (so KNOWN can hold it with its file).
  let last='(open)';
  await walk.run(page,variant,async(step,root='body')=>{
   last=step;
   await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
   for(const t of await walk.unmarked(page,step,root))if(!unmarked.has(t))unmarked.set(t,step);
   const rtl=variant==='qps-rtl'?[...(await islandProblems(page,ISLANDS)).map(p=>`direction: ${p}`),...(await mirrorProblems(page)).map(p=>`mirror: ${p}`),...(await ltrRunProblems(page)).map(p=>`bidi ${p.kind}: “${p.run}” in ${p.where}`)]:[];
   for(const p of [...await layoutProblems(page,walk.layout),...await verticalInkProblems(page),...rtl])if(!problems.has(p))problems.set(p,step);
  }).catch((e:unknown)=>{problems.set(`walk stopped: ${(e instanceof Error?e.message:String(e)).replace(/\u001b\[[0-9;]*m/g,'').split('\n')[0]}`,last);});
  expect(errors,'page errors').toEqual([]);
  expect([...unmarked].map(([t,step])=>`${step}: ${t}`),'texts that do not go through the catalog, a map or vireo()').toEqual([]);
  const known=KNOWN.filter(k=>k.walks.includes(walk.name)&&k.variants.includes(variant)&&k.widths.includes(width));
  // (knownProblem: an isolate the bidi runtime wrote is never known, and a literal site's run must be written in src.)
  const matches=(k:Known,p:string,step:string)=>(typeof k.step==='string'?k.step===step:k.step.test(step))&&knownProblem(k,p);
  expect([...problems].filter(([p,step])=>!known.some(k=>matches(k,p,step))).map(([p,step])=>`${step}: ${p}`),'layout problems not in KNOWN').toEqual([]);
  expect(known.filter(k=>!k.fontDependent&&![...problems].some(([p,step])=>matches(k,p,step))).map(k=>`${k.step}: ${k.problem} (${k.file}) no longer appears: remove it from KNOWN`),'KNOWN problems that disappeared').toEqual([]);
 });
