import {type Page} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {SPANISH_LOCALE,contextLocale,langQuery} from '../fixtures/language';
import {layoutProblems} from '../fixtures/layoutProblems';
import {TRANSLATED,radioMaps} from './languageText';
import {title,same,id,N,normal,vireoOf,esc,texts,bare,STEPS,walk,LAYOUT} from './walks/radio';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front PT5: the spec runs for every translated language (tests/i18n/languageText.ts: its own catalog, originals and radio maps,
// never hard-coded text). The Spanish tests keep their titles and assertions; Brazilian Portuguese runs the same checks under its own titles in a pt-BR browser (Front PT-REL: an anonymous
// describe per language sets its browser locale, tests/fixtures/language.ts contextLocale). English and qps run once.
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

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const C=L.catalog as Record<string,string>;
 test(title(L,'the radio telescope reads differently in Spanish from English: route, control panel, options, Pulsar Parameters, clock, date and receiver','the radio telescope reads differently in <L> (<tag>) from English: route, control panel, options, Pulsar Parameters, clock, date and receiver'),async({browser})=>{
 test.setTimeout(360_000);
 const seen:Record<'en'|'own',Map<string,Set<string>>>={en:new Map(),own:new Map()};
 for(const lang of ['en','own'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await walk(page,lang==='en'?'en':L,async step=>{seen[lang].set(step,new Set(await texts(page)));});
  expect(errors,lang==='en'?'en':L.tag).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();// each text once, with the first step that shows it
 for(const [step,list] of seen.own)for(const t of list)if(english.has(bare(t))&&!same(bare(t),L)&&!left.has(t))left.set(t,step);
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 // The scenario selectors' options are in the language.
 const options=[...seen.own.get('control panel')!].filter(t=>t.startsWith('@option:'));
 expect(options).toContain(`@option:${C['radio.env.dome.0']}`);
 });
});

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

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
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

 test(title(L,'Spanish: every VIREO caption in the radio walk is its Spanish original; English shows the originals unchanged','<L> (<tag>): every VIREO caption in the radio walk is its <L> original; English shows the originals unchanged'),async({browser})=>{
 test.setTimeout(360_000);
 for(const lang of ['own','en'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const checks=captions(page,t=>lang==='en'?normal(t):vireoIn(t));
  await walk(page,lang==='en'?'en':L,async step=>{await checks[step]?.();});
  await page.close();
 }
 for(const t of ['VIREO Radio Telescope Control Panel','Tracking','Receiver','Radio Simulation Options','Pulsar Parameters','Find Pulsar Data','Identify Recorded Object','Save Data Now?','Cannot Close Receiver!','Record'])expect(vireoIn(t)).not.toBe(t);
 });
});

/** The receiver's drawn annotation and caption: only VIREO's unit words and title pieces change; numbers and names do not. */
for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});
 const V=vireoOf(L),sec=esc(V('Sec'));
 test(title(L,'the receiver caption, the drawn annotation and a mark label translate VIREO pieces only','<L> (<tag>): the receiver caption, the drawn annotation and a mark label translate VIREO pieces only'),async({page})=>{
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
});

for(const L of TRANSLATED)test.describe(()=>{test.use({locale:contextLocale(L.tag)});for(const width of [320,1440])test(title(L,`at ${width} px the Spanish radio telescope screens lay out without overflow, clipping or crossing`,`at ${width} px the <L> radio telescope screens lay out without overflow, clipping or crossing`),async({page})=>{
 test.setTimeout(360_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 // ES8A_LAYOUT_LANG=en|qps walks that reference instead (a debugging aid; the language's own test title is kept).
 await walk(page,(process.env.ES8A_LAYOUT_LANG as 'en'|'qps'|undefined)??L,async step=>{for(const p of await layoutProblems(page,LAYOUT))if(!problems.has(p))problems.set(p,step);
  await page.screenshot({path:test.info().outputPath(`${L.tag}-radio-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});});
