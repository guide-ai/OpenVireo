import {type Page,type Locator} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,langQuery} from '../fixtures/language';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {syntheticFits} from '../fixtures/fits';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import originals from '../../src/i18n/es/originals.json' with {type:'json'};
import {OBJECT_X_GUIDE_ES} from '../../src/i18n/es/maps/objectXGuide';
import {OBJECT_X_LAB_ES} from '../../src/i18n/es/maps/objectXLab';
import {OBJECT_X_MEASURE_ES} from '../../src/i18n/es/maps/objectXMeasure';
import {CAMERA_ES} from '../../src/i18n/es/maps/camera';
import {SOUND_ES} from '../../src/i18n/es/maps/sound';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front ES9 (docs/I18N.md): exercise E08, Object X, and the CCD/IR camera in Spanish in an `es-*` browser (a `?lang=es-419` preview load before ES-REL). One walk
// through the student flow runs in English, Spanish and the pseudo-locale: the Object X guide, the lab (ID, code, the reveal
// refusal, the date refusal, the spectrometer with a kept spectrum and the neutral unavailable message, the clock and the asteroid
// list), the observatory with the CCD camera (live VizieR replaced by the recorded CDS response, two images 45 minutes apart),
// the camera's Information window and the IR camera panel, the Object X card on the radio route, the images, the measuring tool
// (its two refusals, a reference star, blinking), the answer and the reveal, and the saved-images route (a synthetic FITS, the
// pixel refusal, the palette and the camera information).
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and the narrow patterns below (object codes, ObjX labels, file names, catalogue data, hashes, numbers);
// - qps: every visible text is marked ⟦…⟧, with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2: the camera information lines) are left out of both comparisons;
// - before the reveal no ObjectX.HTL identifier or remark appears in the Object X route, its guide or the camera, in any language.
type Lang='en'|'es-419'|'qps';
const O=originals as Record<string,string>,E=en as Record<string,string>,S=es as Record<string,string>;
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;// every VizieR mirror the camera may ask
const RECORDED_VIZIER=readFile(new URL('../fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
/** Every ObjectX.HTL identifier and remark (ShortString[24] at 0, ShortString[40] at 45 of each 86-byte row). */
const HTL=readFileSync(new URL('../../public/original/hotlists/ObjectX.HTL',import.meta.url));
const short=(at:number)=>HTL.subarray(at+1,at+1+HTL[at]).toString('latin1').trim();
const ROWS=Array.from({length:HTL.length/86},(_,i)=>[short(i*86),short(i*86+45)] as const);
const IDS=ROWS.map(r=>r[0]),SECRETS=ROWS.flat();
/** objectXCode of a star row (ObjectX.HTL row 9) and of (433) Eros (src/core/objectXLab.ts). */
const STAR_CODE='X-NTFB6',EROS_CODE='X-UZOBN';
/** Texts that read the same in both languages. Exact strings only: a caption left in English fails. */
const SAME=new Set<string>([
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
const RECORDED=/^X-[0-9A-Z]{5}$|^ObjX-42(?:-\d\d|-S\d\d)?(?:\.FIT|\.SSP|\.csv)?$|^(?:SHA-256 )?[0-9a-f]{64}$|^[0-9a-f]{12}$|^\d{4}-\d\d-\d\d[ T]\d\d:\d\d(?::\d\d)? ?(?:UT)?$|^https?:\/\/\S+$|^(?:KPNO )?\d(?:\.\d)?m \(\d+"\) .*Telescope$|^\S+\.(?:FIT|fit|SSP|HTL|DAT|CMO|sav)$/;
/** A number with its unit or symbol, and nothing else that could be a word. */
const NUMERIC=/^[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*\d[-+−±\d\s.,:;°′″'"·×÷/()[\]–%=→eE]*(?:\s*(?:Å|ms|px|×|m|s|UT|h|e⁻\/ADU|″\/h|″))*\s*$/;
/** The observatory's target picker options: galaxy catalogue names and Hubble.HTL ids with their labels (ES2, ES3). */
const TARGET=/^(?:M\d+ · )?NGC \d+(?: · (?:Coma|Peg) - \d)?$|^\d{5} · (?:UM-I|Boo|CorBor|Coma) - \d$/;
/** Rows that are only data: an image (its ObjX label, UT, filter letters and seconds), a kept spectrum (label, telescope,
 * seconds) and the cursor readout (the same words in Spanish). */
const ROW=/^ObjX-42-\d\d: \d{4}-\d\d-\d\d \d\d:\d\d:\d\d UT(?:, [A-Z]{1,2}, \d+ s)?$|^ObjX-42-S\d\d: \d\.\d m, \d+\.\d s$|^Cursor x \d+, y \d+$/;
const same=(text:string)=>{
 if(ROW.test(text)||TARGET.test(text)||SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text))return true;
 let m=/^(.+): (.+)$/.exec(text);if(m&&RECORDED.test(m[1])&&NUMERIC.test(m[2]))return true;// "ObjX-42-S01: 4.0 m, 2.0 s"
 m=/^(.+) · (.+)$/.exec(text);return !!m&&(SAME.has(m[1])||RECORDED.test(m[1]))&&(SAME.has(m[2])||RECORDED.test(m[2])||NUMERIC.test(m[2]));
};
const id=(page:Page|Locator,testId:string)=>page.getByTestId(testId);
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const MARK='[⟦⟧·\\s]*';
const pseudo=(text:string)=>new RegExp(`^${MARK}${[...text].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join(MARK)}${MARK}$`);
const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
/** The accessible name of a catalog key in this language. */
const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(lang==='qps')return pseudo(fill(E[key],params));if(!Object.hasOwn(S,key))throw new Error(`No Spanish for ${key}`);return exact(fill(S[key],params));};
/** The accessible name of a map string (its English and Spanish values) in this language. */
const Mx=(lang:Lang,english:string,spanish:string)=>lang==='en'?exact(english):lang==='qps'?pseudo(english):exact(spanish);
/** The English map strings the walk clicks or reads (restated: the app's map modules cannot load outside the page; the English
 * walk fails if one drifts from src/objectx/ObjectXMessages.ts or src/camera/CameraMessages.ts). */
const L={guideNav:'Object X guide',title:'The quest for Object X',idLabel:'ID # of your unknown object (from the lab sheet or instructor)',reveal:'Reveal the identity',revealConfirm:'Reveal now? Your answer stays as it is.',
 dateLabel:'Observation date and time (UT)',setClock:'Set the observatory clock',dateInvalid:'Enter a date and time as YYYY-MM-DDTHH:MM:SS between 1900 and 2099.',spectrumPrepare:'Place the slit on the object',
 spectrumStart:'Start spectrum',spectrumStop:'Stop spectrum',spectrumKeep:'Keep this spectrum',openRadio:'Open the radio telescope',pointObservatory:'Copy the coordinates to the observatory',
 describeLabel:'Describe your evidence',kinds:{asteroid:'asteroid'}} as const;
const G={return:'Return'} as const;
const X={title:'Measure positions',measure:'Measure at cursor',roleReference:'Reference star',refInvalid:'Enter the reference star RA as h m s and Dec as ° ′ ″.',blinkStart:'Blink',blinkStop:'Stop blinking',rangeLow:'Low cut',errors:{range:'The low cut must be below the high cut.'}} as const;
const C={minutes:'Minutes',seconds:'Seconds',start:'Start exposure',statusDone:'Image ready.',cameraNames:{ccd:'CCD camera',ir:'IR camera (J, H, K)'}} as const;
const LS=OBJECT_X_LAB_ES,GS=OBJECT_X_GUIDE_ES,XS=OBJECT_X_MEASURE_ES,CS=CAMERA_ES;
/** vireo() of a Spanish load, as src/i18n/vireo.ts computes it (the literal when there is no original). */
const vireoEs=(text:string)=>{const key=text.replace(/&(&?)/g,(_,d:string)=>d).trim();return Object.hasOwn(O,key)?O[key]:key;};
const button=(scope:Page|Locator,lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>scope.getByRole('button',{name:N(lang,key,params)});
const mapButton=(scope:Page|Locator,lang:Lang,english:string,spanish:string)=>scope.getByRole('button',{name:Mx(lang,english,spanish)});

/** Visible text nodes, option texts, accessible names, titles and placeholders inside `root`, outside the header and outside
 * native `lang="en"` views. */
const texts=(page:Page,root='body')=>page.evaluate(root=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;if(e.tagName==='DIALOG'&&!(e as HTMLDialogElement).open)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>el.closest('.portal-header,script,style,[data-testid=site-tour]')!==null||el.closest('[lang=en]:not(html)')!==null;
 for(const scope of document.querySelectorAll(root)){
  const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n:Node|null;
  while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
  for(const select of scope.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
  for(const el of [scope,...scope.querySelectorAll('[aria-label],[title],[placeholder]')])if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
  for(const t of scope.querySelectorAll('svg title'))if(!skipped(t)&&t.parentElement&&shown(t.parentElement)){const v=t.textContent?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@svg-title:${v}`);}
 }
 return out;
},root);
const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
const lab=(page:Page)=>id(page,'objectx-lab');
const camera=(page:Page)=>id(page,'camera-control');
const go=async(page:Page,hash:string)=>{await page.evaluate(h=>{location.hash=h;},hash);};

/** What could reveal the object before the reveal, in any language:
 * - an ObjectX.HTL identifier or remark as a whole word in the Object X route (outside the asteroid list) or its guide. The
 *   remarks are English data, so in Spanish this is in effect an identifier check;
 * - an identifier in the camera, the observatory's sky view (where `namesHidden` shows), the spectrometer and photometer ID
 *   readouts (where `hiddenName` shows) and the radio route's Object X card and hot list (`hiddenRowName`). The camera's shared
 *   text may use a kind word, and the observatory's target picker legitimately lists catalogue galaxies, so only identifiers count
 *   there (tests/object-x-path.spec.ts);
 * - a verdict sentence («Es una…», «Tu respuesta es correcta», "It is a…", "Your answer is right") anywhere in the lab. */
async function leaks(page:Page){
 const found=await page.evaluate(()=>{
  const read=(selector:string)=>[...document.querySelectorAll(selector)].map(n=>{const c=n.cloneNode(true) as HTMLElement;
   c.querySelectorAll('[data-testid=objectx-asteroid-list], [data-testid=objectx-asteroid-list-closed]').forEach(x=>x.remove());return c.innerHTML+' '+c.textContent;}).join(' ');
  return {lab:read('[data-testid=objectx-lab]')+' '+read('[data-testid=objectx-guide]'),labText:document.querySelector('[data-testid=objectx-lab]')?.textContent??'',
   shared:read('[data-testid=camera-control], .sky-view, .spec-readout, [data-testid=objectx-radio-card], [data-testid$=hot-list], [data-testid*=hotlist]')};
 });
 const word=(s:string)=>new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^\\w])`);
 const verdict=/\bEs (?:una|un) |Tu respuesta es correcta|\bIt is an? |Your answer is right/;
 return [...SECRETS.filter(s=>word(s).test(found.lab)),...IDS.filter(s=>word(s).test(found.shared)),...(verdict.test(found.labText)?[`verdict: ${verdict.exec(found.labText)![0]}`]:[])];
}
async function expose(page:Page,lang:Lang){
 const c=camera(page);
 await c.getByLabel(lang==='es-419'?new RegExp('^\\s*'+CS.sourceLive.slice(0,20).replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')):/[AÁ]sk V[ií]z[ií][eé]R l[ií]v[eé]/).check();
 await c.getByLabel(Mx(lang,C.minutes,CS.minutes)).fill('0');await c.getByLabel(Mx(lang,C.seconds,CS.seconds)).fill('1');
 await mapButton(c,lang,C.start,CS.start).click();
 await expect(id(page,'camera-status')).toHaveText(Mx(lang,C.statusDone,CS.statusDone),{timeout:120_000});
}
async function startClockAndTrack(page:Page,lang:Lang){
 if(!await button(page,lang,'runningClock.start').isVisible())await page.getByText(N(lang,'runningClock.title')).click();
 await button(page,lang,'runningClock.start').click();
 const tracking=button(page,lang,'runningClock.trackingOn');if(await tracking.isVisible())await tracking.click();
}
async function setClock(page:Page,lang:Lang,utc:string,shown:string){
 await lab(page).getByLabel(Mx(lang,L.dateLabel,LS.dateLabel)).fill(utc);await mapButton(lab(page),lang,L.setClock,LS.setClock).click();
 await expect(id(page,'objectx-list-status')).toContainText(shown,{timeout:60_000});
}
const measureCard=(page:Page)=>page.locator('section.objectx-measure');

/** The walk through E08. Each step leaves the screen in the state its texts are read in; a step may name the part of the page
 * whose texts are read (the radio route belongs to another front, so only its Object X card is read). */
const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>,string?])[]=[
 ['Object X guide',async(page,lang)=>{const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  await page.locator('.portal-header nav').getByRole('button',{name:Mx(lang,L.guideNav,LS.guideNav)}).click();await expect(id(page,'objectx-guide')).toBeVisible();}],
 ['Object X lab',async(page,lang)=>{await mapButton(id(page,'objectx-guide'),lang,G.return,GS.return).click();await expect(id(page,'objectx-guide')).toBeHidden();
  await expect(id(page,'objectx-target').locator('option')).toHaveCount(18,{timeout:30_000});await openAll(lab(page));}],
 ['reveal needs an answer',async(page,lang)=>{await lab(page).getByLabel(Mx(lang,L.idLabel,LS.idLabel)).fill('42');await id(page,'objectx-target').selectOption(STAR_CODE);
  await mapButton(lab(page),lang,L.reveal,LS.reveal).click();await expect(lab(page).locator('fieldset [role=status]').first()).toBeVisible();}],
 ['date refused',async(page,lang)=>{await lab(page).getByLabel(Mx(lang,L.dateLabel,LS.dateLabel)).fill('2009-13-01T04:00:00');await mapButton(lab(page),lang,L.setClock,LS.setClock).click();
  await expect(lab(page).locator('fieldset [role=status]').first()).toHaveText(Mx(lang,L.dateInvalid,LS.dateInvalid));}],
 ['spectrum ready',async(page,lang)=>{await id(page,'objectx-spectrum-telescope').selectOption('2');await mapButton(lab(page),lang,L.spectrumPrepare,LS.spectrumPrepare).click();
  await expect(mapButton(lab(page),lang,L.spectrumStart,LS.spectrumStart)).toBeEnabled({timeout:90_000});}],
 ['spectrum kept',async(page,lang)=>{await mapButton(lab(page),lang,L.spectrumStart,LS.spectrumStart).click();
  await expect(async()=>{const t=await id(page,'objectx-spectrum-progress').textContent();expect(Number(/(\d+)\D*$/.exec(t??'')?.[1]??0)).toBeGreaterThan(0);}).toPass({timeout:20_000});
  const stop=mapButton(lab(page),lang,L.spectrumStop,LS.spectrumStop);if(await stop.isEnabled())await stop.click();await expect(stop).toBeDisabled();
  await mapButton(lab(page),lang,L.spectrumKeep,LS.spectrumKeep).click();await expect(id(page,'objectx-spectra').locator('li')).toHaveCount(1);await openAll(lab(page));}],
 ['spectrum unavailable',async(page,lang)=>{await id(page,'objectx-target').selectOption(EROS_CODE);await mapButton(lab(page),lang,L.spectrumPrepare,LS.spectrumPrepare).click();
  await expect(id(page,'objectx-spectrum-unavailable')).toBeVisible({timeout:90_000});}],
 ['clock set and asteroid list',async(page,lang)=>{await setClock(page,lang,'2009-06-01T04:00:00','2009-06-01 04:00:00');}],
 ['radio card',async(page,lang)=>{await mapButton(lab(page),lang,L.openRadio,LS.openRadio).click();await expect(id(page,'objectx-radio-card')).toBeVisible();},'[data-testid=objectx-radio-card]'],
 ['observatory pointed',async(page,lang)=>{await go(page,'#object-x');await mapButton(lab(page),lang,L.pointObservatory,LS.pointObservatory).click();
  await expect(camera(page)).toBeVisible();
  const dome=page.getByRole('button',{name:lang==='es-419'?exact(S['sky.open']+' ↗'):pseudo(E['sky.open']+' ↗')});await dome.click();
  if(!await button(page,lang,'sky.pointCoordinates').isVisible())await page.getByText(N(lang,'sky.coordinates')).click();
  await button(page,lang,'sky.pointCoordinates').click();
  await page.getByRole('group',{name:N(lang,'sky.view')}).getByRole('button',{name:N(lang,'sky.telescope')}).click();
  await startClockAndTrack(page,lang);await openAll(camera(page));}],
 ['IR camera panel',async(page,lang)=>{await camera(page).getByLabel(Mx(lang,C.cameraNames.ir,CS.cameraNames.ir)).check();await expect(id(page,'camera-ir-adaptation')).toBeVisible();await openAll(camera(page));}],
 ['first CCD image',async(page,lang)=>{await camera(page).getByLabel(Mx(lang,C.cameraNames.ccd,CS.cameraNames.ccd)).check();await expose(page,lang);await openAll(camera(page));}],
 ['camera Information window',async page=>{await id(page,'camera-information-open').click();await expect(id(page,'camera-live-information')).toBeVisible();}],
 ['second CCD image',async(page,lang)=>{await id(page,'camera-live-information-close').click();await expect(id(page,'camera-live-information')).toBeHidden();
  await go(page,'#object-x');await setClock(page,lang,'2009-06-01T04:45:00','2009-06-01 04:45:00');
  await go(page,'#observatory');await startClockAndTrack(page,lang);await expose(page,lang);await openAll(camera(page));}],
 ['images listed',async page=>{await go(page,'#object-x');await expect(id(page,'objectx-images').locator('li')).toHaveCount(2);await openAll(lab(page));}],
 ['measure positions',async(page,lang)=>{await page.locator('section[aria-labelledby=objectx-measure] .button-row button').filter({hasText:lang==='en'?exact(X.title):lang==='qps'?pseudo(X.title):exact(XS.title)}).click();
  await expect(id(page,'objectx-measure-canvas')).toBeVisible();}],
 ['target measured',async(page,lang)=>{await mapButton(measureCard(page),lang,X.measure,XS.measure).click();await expect(id(page,'objectx-measurements').locator('tbody tr')).toHaveCount(1);}],
 ['reference star refused',async(page,lang)=>{await measureCard(page).getByLabel(Mx(lang,X.roleReference,XS.roleReference)).check();await mapButton(measureCard(page),lang,X.measure,XS.measure).click();
  await expect(measureCard(page).locator('[role=alert]')).toHaveText(Mx(lang,X.refInvalid,XS.refInvalid));}],
 ['cuts refused',async(page,lang)=>{await measureCard(page).getByLabel(Mx(lang,X.rangeLow,XS.rangeLow)).fill('1e30');await mapButton(measureCard(page),lang,X.measure,XS.measure).click();
  await expect(measureCard(page).locator('[role=alert]')).toHaveText(Mx(lang,X.errors.range,XS.errors.range));}],
 ['blinking',async(page,lang)=>{await mapButton(measureCard(page),lang,X.blinkStart,XS.blinkStart).click();await expect(mapButton(measureCard(page),lang,X.blinkStop,XS.blinkStop)).toBeVisible();}],
 ['answer revealed',async(page,lang)=>{await mapButton(measureCard(page),lang,X.blinkStop,XS.blinkStop).click();
  await id(page,'objectx-answer').getByLabel(Mx(lang,L.kinds.asteroid,LS.kinds.asteroid)).check();await lab(page).getByLabel(Mx(lang,L.describeLabel,LS.describeLabel)).fill('It moved.');
  await mapButton(lab(page),lang,L.reveal,LS.reveal).click();await expect(lab(page).getByText(Mx(lang,L.revealConfirm,LS.revealConfirm))).toBeVisible();
  await lab(page).locator('fieldset .button-row button.primary-button').click();await expect(id(page,'objectx-reveal')).toBeVisible();await openAll(lab(page));}],
 ['saved images',async(page,lang)=>{await go(page,'#images');await expect(page.getByRole('heading',{level:1,name:N(lang,'fits.title')})).toBeVisible();
  await page.getByLabel(N(lang,'fits.file')).setInputFiles({name:'synthetic.fit',mimeType:'application/octet-stream',buffer:syntheticFits()});
  await expect(id(page,'fits-pixel')).toBeVisible();await openAll(page.locator('main.fits-lab'));}],
 ['pixel refused',async(page,lang)=>{await page.getByLabel(N(lang,'fits.x')).fill('a');await button(page,lang,'fits.select').click();await expect(page.locator('main.fits-lab [role=alert]')).toBeVisible();}],
 ['palette',async(page,lang)=>{await button(page,lang,'palette.open').click();await expect(page.locator('dialog.camera-palette-dialog')).toBeVisible();}],
 ['camera information',async(page,lang)=>{await page.keyboard.press('Escape');await expect(page.locator('dialog.camera-palette-dialog')).toBeHidden();
  await button(page,lang,'cameraInfo.ccd').click();await expect(page.locator('dialog.camera-information-dialog[open]')).toBeVisible();}],
];
async function walk(page:Page,lang:Lang,each:(step:string,root:string)=>Promise<void>){
 const body=await RECORDED_VIZIER;await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});page.setDefaultTimeout(30_000);
 await page.goto(`/${langQuery(lang)}#object-x`);
 await expect(page.locator('html')).toHaveAttribute('lang',lang==='es-419'?'es-419':'en');
 await expect(page.locator('.portal-header nav')).toBeAttached({timeout:20_000});
 await expect(lab(page)).toBeVisible({timeout:30_000});
 for(const [step,run,root] of STEPS){
  await run(page,lang);await page.waitForTimeout(200);
  if(!/revealed|saved images|pixel|palette|camera information$/.test(step))expect(await leaks(page),`${lang} ${step}: identity leaked`).toEqual([]);
  await each(step,root??'body');
 }
}

test('E08 reads differently in Spanish from English: guide, lab, spectrometer, camera, measuring tool, reveal and saved images',async({browser})=>{
 test.setTimeout(480_000);
 const seen:Record<'en'|'es-419',Map<string,Set<string>>>={en:new Map(),'es-419':new Map()};
 for(const lang of ['en','es-419'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await walk(page,lang,async(step,root)=>{seen[lang].set(step,new Set(await texts(page,root)));});
  expect(errors,lang).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();
 for(const [step,list] of seen['es-419'])for(const t of list)if(english.has(bare(t))&&!same(bare(t))&&!left.has(t))left.set(t,step);
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 // The orbit file and telescope options and the answer kinds are Spanish (the file names stay as written).
 const lab=[...seen['es-419'].get('Object X lab')!];
 for(const name of [LS.orbitNames['ObjX_MPC.CMO.sav'],LS.orbitNames['ObjX_MPC.CMO'],LS.targetChoose])expect(lab).toContain(`@option:${name}`);
 for(const kind of Object.values(LS.kinds))expect(lab).toContain(kind);
 // The reveal and its verdict (an asteroid, the right answer) read in Spanish with the right article.
 expect([...seen['es-419'].get('answer revealed')!]).toContain(LS.verdict(true,LS.kinds.asteroid,'asteroid'));
 expect(Object.entries(LS.kinds).map(([k,name])=>LS.verdict(false,name,k))).toEqual(['Es una estrella.','Es una galaxia.','Es un cuásar (QSO).','Es un púlsar.','Es un asteroide.']);
});

test('qps: every text of the E08 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(420_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async(step,root)=>{for(const t of await texts(page,root))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

// ES9 review: the route reads the same for every target before the reveal. With a star target and an asteroid target, the
// lab's and the guide's texts (and the observatory's sky-view toolbar after Copy the coordinates) are equal once the object code
// and the coordinates line are removed (the spectrometer is not prepared, so its state is the same).
test('Spanish: before the reveal the Object X route reads the same for a star target and an asteroid target',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 const body=await RECORDED_VIZIER;await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.goto('/#object-x');await expect(id(page,'objectx-target').locator('option')).toHaveCount(18,{timeout:30_000});
 await lab(page).getByLabel(exact(LS.idLabel)).fill('42');
 const read=async(code:string)=>{
  await go(page,'#object-x');await id(page,'objectx-target').selectOption(code);await expect(id(page,'objectx-coordinates')).toContainText(code);
  await page.waitForTimeout(300);
  const own=[...await texts(page,'[data-testid=objectx-lab]'),...await page.evaluate(()=>[document.querySelector('[data-testid=objectx-guide]')?.textContent??''])]
   .filter(t=>!/^(?:— )?Coordenadas \(J2000\): /.test(t));
  await mapButton(lab(page),'es-419',L.pointObservatory,LS.pointObservatory).click();await expect(page.locator('.sky-view').first()).toBeVisible();await page.waitForTimeout(300);
  const sky=await page.locator('.sky-toolbar').first().textContent();
  // The chosen code is replaced; the code list (both codes, as options) is the same for both.
  return [...own,sky??''].map(t=>/^@option:/.test(t)?t:t.replaceAll(code,'<code>'));
 };
 const star=await read(STAR_CODE),asteroid=await read(EROS_CODE);
 expect(star).toContain(LS.scope);expect(star.join('\n')).toContain(GS.steps.measure[1]);
 expect(asteroid.filter(t=>!star.includes(t)),'only for the asteroid').toEqual([]);expect(star.filter(t=>!asteroid.includes(t)),'only for the star').toEqual([]);expect(asteroid).toEqual(star);
});

/** VIREO's captions on each step, in English (View original) or in this load's Spanish. */
const captions=(page:Page,T:(original:string)=>string):Record<string,()=>Promise<void>>=>({
 // TCCDCam File › Information... and its window (CAMERA_INFORMATION_CAPTIONS, the List menu's Print... and Close).
 'camera Information window':async()=>{const d=id(page,'camera-live-information');await expect(d.locator('h2')).toHaveText(T('CCD Camera Parameters'));
  await expect(id(page,'camera-live-information-print')).toHaveText(T('Print...'));await expect(id(page,'camera-live-information-close')).toHaveText(T('Close'));
  await expect(id(page,'camera-live-information-lines')).toHaveAttribute('aria-label',T('CCD Camera Parameters'));},
 'first CCD image':async()=>{await expect(id(page,'camera-information-open')).toHaveText(T('Information...'));},
 'camera information':async()=>{await expect(id(page,'camera-information-close')).toHaveText(T('Close'));await expect(id(page,'camera-information-print')).toHaveText(T('Print...'));},
 // The spectrometer branch: VIREO's Spectral Range... item (ES3) and TSpectrometer's Help button (Help1Click).
 'spectrum ready':async()=>{await expect(id(page,'objectx-spectral-range-open')).toHaveText(T('Spectral Range...'));await expect(id(page,'objectx-spectrometer-help-open')).toHaveText(T('Help'));},
});

// "View original (English)" (decision 9): with the stored option on, every VIREO caption of the walk is VIREO's English, checked
// one by one, and no Spanish original appears anywhere; OpenVireo's own web text stays Spanish.
test('View original (English) on: every VIREO caption in the E08 walk reads in English, the web text stays Spanish',async({page})=>{
 test.setTimeout(420_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 // Web text that happens to equal a VIREO caption's Spanish (the camera's Minutes, Seconds and Stop labels are the web's own:
 // TCCDCam has a Min/Sec switch and a Cancel button; the observatory's "Sound effects" card heading is web text).
 const mapStrings=(o:unknown):string[]=>typeof o==='string'?[o]:o&&typeof o==='object'?Object.values(o).flatMap(mapStrings):[];
 const web=new Set([...Object.values(S),...Object.keys(O),...mapStrings(CAMERA_ES),...mapStrings(SOUND_ES),...mapStrings(LS),...mapStrings(GS),...mapStrings(XS)].map(plain));
 const spanish=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)&&/[A-Za-z]{3}/.test(t)));
 const checks=captions(page,t=>t.replace(/&(&?)/g,(_,d:string)=>d));
 const left=new Map<string,string>();
 await walk(page,'es-419',async(step,root)=>{
  for(const t of await texts(page,root))if(spanish.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
  if(step==='Object X lab')await expect(page.getByRole('heading',{level:1,name:exact(LS.title)})).toBeVisible();
  if(step==='camera Information window')await expect(id(page,'camera-live-information').locator('p').first()).toHaveText(CS.informationNote);
  if(step==='camera information')await expect(page.locator('#camera-information-scope')).toHaveText(S['cameraInfo.authority']);
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

test('Spanish: every VIREO caption in the E08 walk is its Spanish original; English shows the originals unchanged',async({browser})=>{
 test.setTimeout(480_000);
 for(const lang of ['es-419','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,t=>lang==='en'?t.replace(/&(&?)/g,(_,d:string)=>d):vireoEs(t));
  await walk(page,lang,async step=>{await checks[step]?.();});
  await page.close();
 }
 for(const t of ['CCD Camera Parameters','Information...','Print...','Close','Spectral Range...','Help'])expect(vireoEs(t),t).not.toBe(t);
});

/** Layout problems at this width (as tests/i18n/es-e03.spec.ts): page overflow; dialogs that leave the viewport or scroll
 * sideways; controls and headings that are clipped, cross their card or dialog, or leave the viewport; plot text outside its
 * SVG. Run with the CI's DejaVu fonts (docs/I18N.md). */
const layoutProblems=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[],width=document.documentElement.clientWidth;
 const visible=(el:Element)=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const name=(el:Element)=>`${el.tagName.toLowerCase()} “${(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,40)}”`;
 if(document.documentElement.scrollWidth>width)out.push(`page overflows horizontally (${document.documentElement.scrollWidth} > ${width})`);
 for(const d of document.querySelectorAll<HTMLElement>('dialog[open],[role=dialog][aria-modal=true]')){const r=d.getBoundingClientRect();if(!r.width)continue;
  const id=d.getAttribute('data-testid')??d.className;
  if(r.left<-.5||r.right>width+.5)out.push(`${id} leaves the viewport (${Math.round(r.left)}–${Math.round(r.right)})`);
  if(d.scrollWidth>d.clientWidth+1&&getComputedStyle(d).overflowX!=='visible')out.push(`${id} scrolls horizontally`);}
 const root=document.querySelector('dialog[open],[role=dialog][aria-modal=true]')??document.body;
 for(const c of root.querySelectorAll<HTMLElement>('button,label,legend,h1,h2,h3,h4,select,input,summary,th')){
  if(c.closest('.portal-header,[lang=en]:not(html)')||!visible(c))continue;
  const q=c.getBoundingClientRect(),cs=getComputedStyle(c);
  if(q.width<=2||(cs.clip!=='auto'&&cs.position==='absolute'))continue;
  let scroller=false;for(let e=c.parentElement;e&&e!==document.body;e=e.parentElement){const o=getComputedStyle(e).overflowX;if((o==='auto'||o==='scroll')&&e.scrollWidth>e.clientWidth){scroller=true;break;}}
  if(!scroller&&(q.left<-.5||q.right>width+.5))out.push(`${name(c)} leaves the viewport`);
  if(c.scrollWidth>c.clientWidth+1&&['hidden','clip'].includes(getComputedStyle(c).overflowX)&&!['INPUT','SELECT'].includes(c.tagName))out.push(`${name(c)} clipped`);
  const box=c.parentElement?.closest('dialog,.card,details,fieldset,[role=dialog],[role=alertdialog]');
  if(box&&!scroller&&!c.closest('table,.table-scroll,[role=region]')){const b=box.getBoundingClientRect();if(q.right>b.right+1||q.left<b.left-1)out.push(`${name(c)} crosses its ${box.tagName.toLowerCase()}`);}
 }
 for(const t of root.querySelectorAll<SVGTextElement>('svg text')){if(!visible(t)||t.closest('[lang=en]:not(html)'))continue;
  const svg=t.ownerSVGElement!,b=svg.getBoundingClientRect(),q=t.getBoundingClientRect();
  if(q.left<b.left-1||q.right>b.right+1||q.top<b.top-1||q.bottom>b.bottom+1)out.push(`plot text “${t.textContent?.trim().slice(0,40)}” outside its plot ${svg.closest('figure,section')?.className??''} (${[q.left-b.left,b.right-q.right,q.top-b.top,b.bottom-q.bottom].map(Math.round).join(', ')})`);}
 return out;
});
for(const width of [320,1440])test(`at ${width} px the Spanish E08 screens lay out without overflow, clipping or crossing`,async({page})=>{
 test.setTimeout(480_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 await walk(page,(process.env.ES9_LAYOUT_LANG as Lang|undefined)??'es-419',async step=>{for(const p of await layoutProblems(page))if(!problems.has(p))problems.set(p,step);
  await page.screenshot({path:test.info().outputPath(`es-e08-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});
