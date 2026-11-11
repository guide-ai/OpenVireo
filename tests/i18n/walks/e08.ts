import type {LayoutOptions} from '../../fixtures/layoutProblems';
import {type Page,type Locator} from '@playwright/test';
import {expect} from '../../fixtures/area-tripwire';
import {langQuery} from '../../fixtures/language';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {syntheticFits} from '../../fixtures/fits';
import en from '../../../src/i18n/en.json' with {type:'json'};
import {e08Maps,type LanguageText,type E08Maps} from '../languageText';
import {isPseudo,pseudoName,htmlLangOf,type Pseudo,pseudoStart} from '../../fixtures/pseudoNames';

// Front SC12 (docs/I18N.md): the walk of tests/i18n/e08.spec.ts and the helpers it needs, moved here unchanged in behaviour so
// tests/scripts/walks.scripts.ts can run it under the script pseudo-locales; the spec's header describes it.
export type Lang='en'|Pseudo|LanguageText;
/** A test title: Spanish keeps its ES9 title; another language names itself and its tag. */
export const title=(L:LanguageText,es:string,other:string)=>L.tag==='es-419'?es:other.replaceAll('<L>',L.entry.englishName).replaceAll('<tag>',L.tag);
export const tagOf=(lang:Lang)=>typeof lang==='string'?lang:lang.tag;
export const E=en as Record<string,string>;
export const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;// every VizieR mirror the camera may ask
export const RECORDED_VIZIER=readFile(new URL('../../fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
/** Every ObjectX.HTL identifier and remark (ShortString[24] at 0, ShortString[40] at 45 of each 86-byte row). */
export const HTL=readFileSync(new URL('../../../public/original/hotlists/ObjectX.HTL',import.meta.url));
export const short=(at:number)=>HTL.subarray(at+1,at+1+HTL[at]).toString('latin1').trim();
export const ROWS=Array.from({length:HTL.length/86},(_,i)=>[short(i*86),short(i*86+45)] as const);
export const IDS=ROWS.map(r=>r[0]),SECRETS=ROWS.flat();
/** objectXCode of a star row (ObjectX.HTL row 9) and of (433) Eros (src/core/objectXLab.ts). */
export const STAR_CODE='X-NTFB6',EROS_CODE='X-UZOBN';
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
export const SAME=new Set<string>([
 'VIREO','OpenVireo','SHA-256','CSV','FITS','JSON','SSP','UT','Å','×','·','—','✳','↗','?','px','Dec','Dec:','Multi-Spec','NOMAD','USNO-B1','VizieR',
 // The orbit file whose web name is only its file name, source and year.
 'ObjX_AST.CMO (Lowell, 2009)',
 // The synthetic FITS the walk opens, and the recorded VizieR answer's catalogue name.
 'synthetic.fit',
 // VIREO's camera names as they appear in its information lines and FITS headers (identifiers, ES2).
 'CLEA_IR1','Site CH350 003B Back-Illuminated',
 // Keyboard keys; the observatory's product line; the student's typed description.
 'Shift','Enter','VIREO ·','It moved.',
]);
/** An Object X code, an ObjX label of the student's data (an image, a kept spectrum), a file name the walk reads or writes, a
 * hash, a telescope or VIREO profile name, an UT date, a catalogue URL or query, or a seed. */
export const RECORDED=/^X-[0-9A-Z]{5}$|^ObjX-42(?:-\d\d|-S\d\d)?(?:\.FIT|\.SSP|\.csv)?$|^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{12}$|^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(?::\d\d)? ?(?:UT)?$|^https?:\/\/\S+$|^(?:KPNO )?\d(?:\.\d)?m \(\d+"\) .*Telescope$|^\S+\.(?:FIT|fit|SSP|HTL|DAT|CMO|sav)$/;
/** A number with its unit or symbol, and nothing else that could be a word. */
export const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*(?:\s*(?:Å|ms|px|×|m|s|UT|h|e⁻\/ADU|″\/h|″))*\s*$/;
/** The observatory's target picker options: galaxy catalogue names and Hubble.HTL ids with their labels (ES2, ES3). */
export const TARGET=/^(?:M\d+ · )?NGC \d+(?: · (?:Coma|Peg) - \d)?$|^\d{5} · (?:UM-I|Boo|CorBor|Coma) - \d$/;
/** Rows that are only data: an image (its ObjX label, UT, filter letters and seconds), a kept spectrum (label, telescope,
 * seconds) and the cursor readout (the same words in Spanish). */
export const ROW=/^ObjX-42-\d\d: \d{4}-\d\d-\d\d \d\d:\d\d:\d\d UT(?:, [A-Z]{1,2}, \d+ s)?$|^ObjX-42-S\d\d: \d\.\d m, \d+\.\d s$|^Cursor x \d+, y \d+$/;
/** Front PT6: texts of the walk that are the same words in another language (its identical.json, with a reason each): the answer
 * kinds «quasar (QSO)» and «pulsar» are the IAU OAE pt-BR words. */
export const SAME_IN:Readonly<Record<string,ReadonlySet<string>>>={'pt-BR':new Set<string>(['quasar (QSO)','pulsar'])};
export const same=(text:string,L?:LanguageText)=>{
 if(L!==undefined&&(SAME_IN[L.tag]?.has(text)??false))return true;
 if(ROW.test(text)||TARGET.test(text)||SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text))return true;
 let m=/^(.+): (.+)$/.exec(text);if(m&&RECORDED.test(m[1])&&NUMERIC.test(m[2]))return true;// "ObjX-42-S01: 4.0 m, 2.0 s"
 m=/^(.+) · (.+)$/.exec(text);return !!m&&(SAME.has(m[1])||RECORDED.test(m[1]))&&(SAME.has(m[2])||RECORDED.test(m[2])||NUMERIC.test(m[2]));
};
export const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
/** Front SC12: an English text's name in any pseudo-locale (qps and the script variants; tests/fixtures/pseudoNames.ts). */
export const pseudo=pseudoName;
export const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
export const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** The accessible name of a catalog key in this language. */
export const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(isPseudo(lang))return pseudo(E[key],params);const S=lang.catalog as Record<string,string>;if(!Object.hasOwn(S,key))throw new Error(`No ${lang.entry.englishName} for ${key}`);return exact(fill(S[key],params));};
/** A map string of this language: `pick` reads it from the language's E08 maps. */
export type Pick=(m:E08Maps)=>string;
/** The accessible name of a map string (its English value, or the language's) in this language. */
export const Mx=(lang:Lang,english:string,pick:Pick)=>lang==='en'?exact(english):isPseudo(lang)?pseudo(english):exact(pick(e08Maps(lang.tag)));
/** The English map strings the walk clicks or reads (restated: the app's map modules cannot load outside the page; the English
 * walk fails if one drifts from src/objectx/ObjectXMessages.ts or src/camera/CameraMessages.ts). */
export const LE={guideNav:'Object X guide',title:'The quest for Object X',idLabel:'ID # of your unknown object (from the lab sheet or instructor)',reveal:'Reveal the identity',revealConfirm:'Reveal now? Your answer stays as it is.',
 dateLabel:'Observation date and time (UT)',setClock:'Set the observatory clock',dateInvalid:'Enter a date and time as YYYY-MM-DDTHH:MM:SS between 1900 and 2099.',spectrumPrepare:'Place the slit on the object',
 spectrumStart:'Start spectrum',spectrumStop:'Stop spectrum',spectrumKeep:'Keep this spectrum',openRadio:'Open the radio telescope',pointObservatory:'Copy the coordinates to the observatory',
 describeLabel:'Describe your evidence',kinds:{asteroid:'asteroid'}} as const;
export const G={return:'Return'} as const;
export const X={title:'Measure positions',measure:'Measure at cursor',roleReference:'Reference star',refInvalid:'Enter the reference star RA as h m s and Dec as ° ′ ″.',blinkStart:'Blink',blinkStop:'Stop blinking',rangeLow:'Low cut',errors:{range:'The low cut must be below the high cut.'}} as const;
export const C={minutes:'Minutes',seconds:'Seconds',start:'Start exposure',statusDone:'Image ready.',cameraNames:{ccd:'CCD camera',ir:'IR camera (J, H, K)'}} as const;
/** vireo() of a load in this language, as src/i18n/vireo.ts computes it (the literal when there is no original). */
export const vireoOf=(L:LanguageText)=>(text:string)=>{const O=L.originals,key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();return Object.hasOwn(O,key)?O[key]:key;};
export const button=(scope:Page|Locator,lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>scope.getByRole('button',{name:N(lang,key,params)});
export const mapButton=(scope:Page|Locator,lang:Lang,english:string,pick:Pick)=>scope.getByRole('button',{name:Mx(lang,english,pick)});

/** Visible text nodes, option texts, accessible names, titles and placeholders inside `root`, outside the header and outside
 * native `lang="en"` views. */
export const texts=(page:Page,root='body')=>page.evaluate(root=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;if(e.tagName==='DIALOG'&&!(e as HTMLDialogElement).open)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>el.closest('.portal-header,[data-i18n-shell],script,style,[data-testid=site-tour]')!==null||el.closest('[lang=en]:not(html)')!==null;
 for(const scope of document.querySelectorAll(root)){
  const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n:Node|null;
  while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
  for(const select of scope.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
  for(const el of [scope,...scope.querySelectorAll('[aria-label],[title],[placeholder]')])if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
  for(const t of scope.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 }
 return out;
},root);
export const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
export const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
export const lab=(page:Page)=>id(page,'objectx-lab');
export const camera=(page:Page)=>id(page,'camera-control');
export const go=async(page:Page,hash:string)=>{await page.evaluate(h=>{location.hash=h;},hash);};

/** What could reveal the object before the reveal, in any language:
 * - an ObjectX.HTL identifier or remark as a whole word in the Object X route (outside the asteroid list) or its guide. The
 *   remarks are English data, so in Spanish this is in effect an identifier check;
 * - an identifier in the camera, the observatory's sky view (where `namesHidden` shows), the spectrometer and photometer ID
 *   readouts (where `hiddenName` shows) and the radio route's Object X card and hot list (`hiddenRowName`). The camera's shared
 *   text may use a kind word, and the observatory's target picker legitimately lists catalogue galaxies, so only identifiers count
 *   there (tests/object-x-path.spec.ts);
 * - a verdict sentence («Es una…», «Tu respuesta es correcta», «É uma…», «Sua resposta está certa», "It is a…", "Your answer is
 *   right") anywhere in the lab. */
export async function leaks(page:Page){
 const found=await page.evaluate(()=>{
  const read=(selector:string)=>[...document.querySelectorAll(selector)].map(n=>{const c=n.cloneNode(true) as HTMLElement;
   c.querySelectorAll('[data-testid=objectx-asteroid-list], [data-testid=objectx-asteroid-list-closed]').forEach(x=>x.remove());return c.innerHTML+' '+c.textContent;}).join(' ');
  return {lab:read('[data-testid=objectx-lab]')+' '+read('[data-testid=objectx-guide]'),labText:document.querySelector('[data-testid=objectx-lab]')?.textContent??'',
   shared:read('[data-testid=camera-control], .sky-view, .spec-readout, [data-testid=objectx-radio-card], [data-testid$=hot-list], [data-testid*=hotlist]')};
 });
 const word=(s:string)=>new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^\\w])`);
 const verdict=/\bEs (?:una|un) |Tu respuesta es correcta|(?:^|[^\p{L}])É (?:uma|um) |Sua resposta está certa|\bIt is an? |Your answer is right/u;
 return [...SECRETS.filter(s=>word(s).test(found.lab)),...IDS.filter(s=>word(s).test(found.shared)),...(verdict.test(found.labText)?[`verdict: ${verdict.exec(found.labText)![0]}`]:[])];
}
export async function expose(page:Page,lang:Lang){
 const c=camera(page);
 await c.getByLabel(typeof lang!=='string'?new RegExp('^\\s*'+e08Maps(lang.tag).camera.sourceLive.slice(0,20).replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')):pseudoStart('Ask VizieR live')).check();
 await c.getByLabel(Mx(lang,C.minutes,m=>m.camera.minutes)).fill('0');await c.getByLabel(Mx(lang,C.seconds,m=>m.camera.seconds)).fill('1');
 await mapButton(c,lang,C.start,m=>m.camera.start).click();
 await expect(id(page,'camera-status')).toHaveText(Mx(lang,C.statusDone,m=>m.camera.statusDone),{timeout:120_000});
}
export async function startClockAndTrack(page:Page,lang:Lang){
 if(!await button(page,lang,'runningClock.start').isVisible())await page.getByText(N(lang,'runningClock.title')).click();
 await button(page,lang,'runningClock.start').click();
 const tracking=button(page,lang,'runningClock.trackingOn');if(await tracking.isVisible())await tracking.click();
}
export async function setClock(page:Page,lang:Lang,utc:string,shown:string){
 await lab(page).getByLabel(Mx(lang,LE.dateLabel,m=>m.objectXLab.dateLabel)).fill(utc);await mapButton(lab(page),lang,LE.setClock,m=>m.objectXLab.setClock).click();
 await expect(id(page,'objectx-list-status')).toContainText(shown,{timeout:60_000});
}
export const measureCard=(page:Page)=>page.locator('section.objectx-measure');

/** The walk through E08. Each step leaves the screen in the state its texts are read in; a step may name the part of the page
 * whose texts are read (the radio route belongs to another front, so only its Object X card is read). */
export const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>,string?])[]=[
 ['Object X guide',async(page,lang)=>{const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  await page.locator('.portal-header nav').getByRole('button',{name:Mx(lang,LE.guideNav,m=>m.objectXLab.guideNav)}).click();await expect(id(page,'objectx-guide')).toBeVisible();}],
 ['Object X lab',async(page,lang)=>{await mapButton(id(page,'objectx-guide'),lang,G.return,m=>m.objectXGuide.return).click();await expect(id(page,'objectx-guide')).toBeHidden();
  await expect(id(page,'objectx-target').locator('option')).toHaveCount(18,{timeout:30_000});await openAll(lab(page));}],
 ['reveal needs an answer',async(page,lang)=>{await lab(page).getByLabel(Mx(lang,LE.idLabel,m=>m.objectXLab.idLabel)).fill('42');await id(page,'objectx-target').selectOption(STAR_CODE);
  await mapButton(lab(page),lang,LE.reveal,m=>m.objectXLab.reveal).click();await expect(lab(page).locator('fieldset [role=status]').first()).toBeVisible();}],
 ['date refused',async(page,lang)=>{await lab(page).getByLabel(Mx(lang,LE.dateLabel,m=>m.objectXLab.dateLabel)).fill('2009-13-01T04:00:00');await mapButton(lab(page),lang,LE.setClock,m=>m.objectXLab.setClock).click();
  await expect(lab(page).locator('fieldset [role=status]').first()).toHaveText(Mx(lang,LE.dateInvalid,m=>m.objectXLab.dateInvalid));}],
 ['spectrum ready',async(page,lang)=>{await id(page,'objectx-spectrum-telescope').selectOption('2');await mapButton(lab(page),lang,LE.spectrumPrepare,m=>m.objectXLab.spectrumPrepare).click();
  await expect(mapButton(lab(page),lang,LE.spectrumStart,m=>m.objectXLab.spectrumStart)).toBeEnabled({timeout:90_000});}],
 ['spectrum kept',async(page,lang)=>{await mapButton(lab(page),lang,LE.spectrumStart,m=>m.objectXLab.spectrumStart).click();
  await expect(async()=>{const t=await id(page,'objectx-spectrum-progress').textContent();expect(Number(/(\d+)\D*$/.exec(t??'')?.[1]??0)).toBeGreaterThan(0);}).toPass({timeout:20_000});
  const stop=mapButton(lab(page),lang,LE.spectrumStop,m=>m.objectXLab.spectrumStop);if(await stop.isEnabled())await stop.click();await expect(stop).toBeDisabled();
  await mapButton(lab(page),lang,LE.spectrumKeep,m=>m.objectXLab.spectrumKeep).click();await expect(id(page,'objectx-spectra').locator('li')).toHaveCount(1);await openAll(lab(page));}],
 ['spectrum unavailable',async(page,lang)=>{await id(page,'objectx-target').selectOption(EROS_CODE);await mapButton(lab(page),lang,LE.spectrumPrepare,m=>m.objectXLab.spectrumPrepare).click();
  await expect(id(page,'objectx-spectrum-unavailable')).toBeVisible({timeout:90_000});}],
 ['clock set and asteroid list',async(page,lang)=>{await setClock(page,lang,'2009-06-01T04:00:00','2009-06-01 04:00:00');}],
 ['radio card',async(page,lang)=>{await mapButton(lab(page),lang,LE.openRadio,m=>m.objectXLab.openRadio).click();await expect(id(page,'objectx-radio-card')).toBeVisible();},'[data-testid=objectx-radio-card]'],
 ['observatory pointed',async(page,lang)=>{await go(page,'#object-x');await mapButton(lab(page),lang,LE.pointObservatory,m=>m.objectXLab.pointObservatory).click();
  await expect(camera(page)).toBeVisible();
  const dome=page.getByRole('button',{name:typeof lang!=='string'?exact((lang.catalog as Record<string,string>)['sky.open']+' ↗'):pseudo(E['sky.open']+' ↗')});await dome.click();
  if(!await button(page,lang,'sky.pointCoordinates').isVisible())await page.getByText(N(lang,'sky.coordinates')).click();
  await button(page,lang,'sky.pointCoordinates').click();
  await page.getByRole('group',{name:N(lang,'sky.view')}).getByRole('button',{name:N(lang,'sky.telescope')}).click();
  await startClockAndTrack(page,lang);await openAll(camera(page));}],
 ['IR camera panel',async(page,lang)=>{await camera(page).getByLabel(Mx(lang,C.cameraNames.ir,m=>m.camera.cameraNames.ir)).check();await expect(id(page,'camera-ir-adaptation')).toBeVisible();await openAll(camera(page));}],
 ['first CCD image',async(page,lang)=>{await camera(page).getByLabel(Mx(lang,C.cameraNames.ccd,m=>m.camera.cameraNames.ccd)).check();await expose(page,lang);await openAll(camera(page));}],
 ['camera Information window',async page=>{await id(page,'camera-information-open').click();await expect(id(page,'camera-live-information')).toBeVisible();}],
 ['second CCD image',async(page,lang)=>{await id(page,'camera-live-information-close').click();await expect(id(page,'camera-live-information')).toBeHidden();
  await go(page,'#object-x');await setClock(page,lang,'2009-06-01T04:45:00','2009-06-01 04:45:00');
  await go(page,'#observatory');await startClockAndTrack(page,lang);await expose(page,lang);await openAll(camera(page));}],
 ['images listed',async page=>{await go(page,'#object-x');await expect(id(page,'objectx-images').locator('li')).toHaveCount(2);await openAll(lab(page));}],
 ['measure positions',async(page,lang)=>{await page.locator('section[aria-labelledby=objectx-measure] .button-row button').filter({hasText:lang==='en'?exact(X.title):isPseudo(lang)?pseudo(X.title):exact(e08Maps(lang.tag).objectXMeasure.title)}).click();
  await expect(id(page,'objectx-measure-canvas')).toBeVisible();}],
 ['target measured',async(page,lang)=>{await mapButton(measureCard(page),lang,X.measure,m=>m.objectXMeasure.measure).click();await expect(id(page,'objectx-measurements').locator('tbody tr')).toHaveCount(1);}],
 ['reference star refused',async(page,lang)=>{await measureCard(page).getByLabel(Mx(lang,X.roleReference,m=>m.objectXMeasure.roleReference)).check();await mapButton(measureCard(page),lang,X.measure,m=>m.objectXMeasure.measure).click();
  await expect(measureCard(page).locator('[role=alert]')).toHaveText(Mx(lang,X.refInvalid,m=>m.objectXMeasure.refInvalid));}],
 ['cuts refused',async(page,lang)=>{await measureCard(page).getByLabel(Mx(lang,X.rangeLow,m=>m.objectXMeasure.rangeLow)).fill('1e30');await mapButton(measureCard(page),lang,X.measure,m=>m.objectXMeasure.measure).click();
  await expect(measureCard(page).locator('[role=alert]')).toHaveText(Mx(lang,X.errors.range,m=>m.objectXMeasure.errors.range));}],
 ['blinking',async(page,lang)=>{await mapButton(measureCard(page),lang,X.blinkStart,m=>m.objectXMeasure.blinkStart).click();await expect(mapButton(measureCard(page),lang,X.blinkStop,m=>m.objectXMeasure.blinkStop)).toBeVisible();}],
 ['reveal asked',async(page,lang)=>{await mapButton(measureCard(page),lang,X.blinkStop,m=>m.objectXMeasure.blinkStop).click();
  await id(page,'objectx-answer').getByLabel(Mx(lang,LE.kinds.asteroid,m=>m.objectXLab.kinds.asteroid)).check();await lab(page).getByLabel(Mx(lang,LE.describeLabel,m=>m.objectXLab.describeLabel)).fill('It moved.');
  await mapButton(lab(page),lang,LE.reveal,m=>m.objectXLab.reveal).click();await expect(lab(page).getByText(Mx(lang,LE.revealConfirm,m=>m.objectXLab.revealConfirm))).toBeVisible();}],
 // PT6 review: the answer chosen and the reveal question open, the last state before the reveal, has its own identity check.
 ['answer revealed',async page=>{
  await lab(page).locator('fieldset .button-row button.primary-button').click();await expect(id(page,'objectx-reveal')).toBeVisible();await openAll(lab(page));}],
 ['saved images',async(page,lang)=>{await go(page,'#images');await expect(page.getByRole('heading',{level:1,name:N(lang,'fits.title')})).toBeVisible();
  await page.getByLabel(N(lang,'fits.file')).setInputFiles({name:'synthetic.fit',mimeType:'application/octet-stream',buffer:syntheticFits()});
  await expect(id(page,'fits-pixel')).toBeVisible();await openAll(page.locator('main.fits-lab'));}],
 ['pixel refused',async(page,lang)=>{await page.getByLabel(N(lang,'fits.x')).fill('a');await button(page,lang,'fits.select').click();await expect(page.locator('main.fits-lab [role=alert]')).toBeVisible();}],
 ['palette',async(page,lang)=>{await button(page,lang,'palette.open').click();await expect(page.locator('dialog.camera-palette-dialog')).toBeVisible();}],
 ['camera information',async(page,lang)=>{await page.keyboard.press('Escape');await expect(page.locator('dialog.camera-palette-dialog')).toBeHidden();
  await button(page,lang,'cameraInfo.ccd').click();await expect(page.locator('dialog.camera-information-dialog[open]')).toBeVisible();}],
];
export async function walk(page:Page,lang:Lang,each:(step:string,root:string)=>Promise<void>){
 const body=await RECORDED_VIZIER;await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(30_000);
 await page.goto(`/${langQuery(tagOf(lang))}#object-x`);
 await expect(page.locator('html')).toHaveAttribute('lang',htmlLangOf(lang));
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 await expect(lab(page)).toBeVisible({timeout:30_000});
 for(const [step,run,root] of STEPS){
  await run(page,lang);await page.waitForTimeout(200);
  if(!/revealed|saved images|pixel|palette|camera information$/.test(step))expect(await leaks(page),`${tagOf(lang)} ${step}: identity leaked`).toEqual([]);
  await each(step,root??'body');
 }
}

/** Front SC9: the layout check of tests/fixtures/layoutProblems.ts (no local copy), with the options that keep this spec's
 * checks: its old copy was the fixture's default. Run with the CI's DejaVu fonts (docs/I18N.md). */
export const LAYOUT:LayoutOptions={};
