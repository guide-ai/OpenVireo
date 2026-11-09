import {test,expect,type Page,type Locator} from '@playwright/test';
import es from '../../src/i18n/es/es.json' with {type:'json'};
import en from '../../src/i18n/en.json' with {type:'json'};
import originals from '../../src/i18n/es/originals.json' with {type:'json'};
import {ENGINE_VIEW_ES} from '../../src/i18n/es/maps/engineView';
import {SPECTRAL_RANGE_ES} from '../../src/i18n/es/maps/spectralRange';
import {OBSERVATORY_ES} from '../../src/i18n/es/maps/observatory';

// Front ES3 (docs/I18N.md): exercise E01, Hubble's law, in Spanish on a `?lang=es-419` preview load. One walk through the whole
// student flow runs in English, Spanish and the pseudo-locale: the Hubble lab guide (every disclosure open), the galaxy
// exposure and its Spectral Range dialog, the spectrum analyser (z step, the engine's Zoom dialog, Record measurement and VIREO's
// Observational Data, the measurement log, velocity analysis, the Hubble diagram with the VIREO recipe), the sky exposure, the
// star exposure with its .SSP save panel, and the spectrometer route.
// - Spanish: no visible text, option, accessible name, title or placeholder reads the same as in English, except the exact
//   identifiers in SAME and plain numbers with units (NUMERIC);
// - qps: every visible text is marked ⟦…⟧ (it goes through the catalog, a map or vireo()), with the same exceptions;
// - views that mirror a written file (`lang="en"`, F2) are left out of both comparisons.
type Lang='en'|'es-419'|'qps';
const O=originals as Record<string,string>,E=en as Record<string,string>,S=es as Record<string,string>;
/** Texts that read the same in both languages: catalogue designations, galaxy and field names, VIREO and source document
 * names, formats, symbols and units. Exact strings only: a caption left in English fails. */
const GALAXIES=['UM-I – 1','UM-I – 2','UM-I – 3','CorBor – 1','CorBor – 2','CorBor – 3','Peg – 1','Peg – 2','Peg – 3','Coma – 1','Coma – 2','Boo – 1','Boo – 2'];
const TARGETS:readonly (readonly [string,string])[]=[['36773','UM-I – 2'],['36747','UM-I – 1'],['54876','CorBor – 2'],['54875','CorBor – 1'],['54891','CorBor – 3'],['NGC 7499','Peg – 1'],['NGC 7501','Peg – 2'],
 ['NGC 7503','Peg – 3'],['36805','UM-I – 3'],['NGC 4874','Coma – 1'],['NGC 4889','Coma – 2'],['51976','Boo – 1'],['51975','Boo – 2']];
const SAME=new Set<string>([
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
const RECORDED=/^(?:SHA-256 )?(?:[0-9a-f]{12}|[0-9a-f]{14}|[0-9a-f]{64})$|^Hubble Data\.xls · Sheet1!(?:C\d+|D\d+ × I2)$|^catalog-(?:galaxy|star)-[\w@.-]+-[0-9a-f]{12}\.sp$/;
/** A number with its unit or symbol, and nothing else that could be a word. */
const NUMERIC=/^[-+−±\d\s.,:;°′″·×/()[\]–%=]*\d[-+−±\d\s.,:;°′″·×/()[\]–%=]*(?:\s*(?:Å|km\/s(?:\/Mpc)?|Mpc|ms|mag|h|s|m|JD|z))*\s*$/;
const same=(text:string)=>SAME.has(text)||NUMERIC.test(text)||RECORDED.test(text);
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const ACCENTED:Readonly<Record<string,string>>={a:'aá',e:'eé',i:'ií',o:'oó',u:'uú',A:'AÁ',E:'EÉ',I:'IÍ',O:'OÓ',U:'UÚ'};
const MARK='[⟦⟧·\\s]*';
const pseudo=(text:string)=>new RegExp(`^${MARK}${[...text].map(c=>ACCENTED[c]?`[${ACCENTED[c]}]`:/\s/.test(c)?'\\s+':c.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')).join(MARK)}${MARK}$`);
const exact=(text:string)=>new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&').replace(/\s+/g,'\\s+')}\\s*$`);
/** The accessible name of a catalog key in this language. */
const fill=(text:string,params:Readonly<Record<string,string>>)=>text.replace(/\{(\w+)\}/g,(m,k:string)=>params[k]??m);
const N=(lang:Lang,key:string,params:Readonly<Record<string,string>>={})=>{if(!Object.hasOwn(E,key))throw new Error(key);if(lang==='en')return exact(fill(E[key],params));if(lang==='qps')return pseudo(fill(E[key],params));if(!Object.hasOwn(S,key))throw new Error(`No Spanish for ${key}`);return exact(fill(S[key],params));};
const button=(scope:Page|Locator,lang:Lang,key:string)=>scope.getByRole('button',{name:N(lang,key)});

async function open(page:Page,lang:Lang,hash='galaxy-exposure'){
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.clock.install();page.setDefaultTimeout(20_000);
 await page.goto(`/?lang=${lang}#${hash}`);
 await expect(page.locator('html')).toHaveAttribute('lang',lang==='es-419'?'es-419':'en');
 await expect(button(page,lang,'galaxyExposure.activate')).toBeVisible({timeout:20_000});
}
/** Visible text nodes, option texts, accessible names, titles and placeholders outside the header and outside native
 * `lang="en"` views. */
const texts=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[];
 const shown=(el:Element)=>{for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden||e.getAttribute('aria-hidden')==='true')return false;if(e.tagName==='DETAILS'&&!(e as HTMLDetailsElement).open&&el.closest('summary')?.parentElement!==e&&e!==el)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const skipped=(el:Element)=>el.closest('.portal-header,script,style,[data-testid=site-tour]')!==null||el.closest('[lang=en]:not(html)')!==null;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:Node|null;
 while((n=walker.nextNode())){const el=n.parentElement;if(!el||el.tagName==='OPTION')continue;const t=n.textContent?.trim();if(t&&/[A-Za-z]{2}/.test(t)&&!skipped(el)&&shown(el))out.push(t);}
 for(const select of document.querySelectorAll('select'))if(!skipped(select)&&shown(select))for(const o of select.options){const t=o.text.trim();if(t&&/[A-Za-z]{2}/.test(t))out.push(`@option:${t}`);}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder]'))if(!skipped(el)&&shown(el))for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a)?.trim();if(v&&/[A-Za-z]{2}/.test(v))out.push(`@${a}:${v}`);}
 return out;
});
const bare=(text:string)=>text.replace(/^@[a-z-]+:/,'');
const openAll=(scope:Locator)=>scope.evaluate(el=>{for(const d of el.querySelectorAll('details'))(d as HTMLDetailsElement).open=true;});
const tool=async(page:Page,lang:Lang,key:string)=>{
 const toggle=page.locator('.portal-header .tools-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.portal-header nav').getByRole('button',{name:N(lang,key)}).click();
};

/** The walk through E01. Each step leaves the screen in the state its texts are read in. */
const STEPS:readonly (readonly [string,(page:Page,lang:Lang)=>Promise<void>])[]=[
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
  await page.getByRole('button',{name:/^\s*[⟦]?\s*T[eé]l[eé]sc[oó]p[eéi]/}).first().click();
  if(!await button(page,lang,'runningClock.trackingOn').isVisible())await page.getByText(N(lang,'runningClock.title')).click();
  if(await button(page,lang,'runningClock.trackingOn').isVisible())await button(page,lang,'runningClock.trackingOn').click();
  await tool(page,lang,'spectrometer.nav');await expect(id(page,'field-spec-use')).toBeEnabled({timeout:60_000});await id(page,'field-spec-use').click();
  await expect(id(page,'field-spec-acquisition')).toBeVisible({timeout:90_000});await expect(id(page,'field-spec-access')).toHaveAttribute('data-access','ready',{timeout:30_000});await openAll(page.locator('body'));}],
 ['field spectrometer exposure paused',async(page,lang)=>{const a=id(page,'field-spec-acquisition');await button(a,lang,'fieldSpec.activate').click();await button(a,lang,'fieldSpec.start').click();
  await page.clock.runFor(1000);await button(a,lang,'fieldSpec.pause').click();await openAll(page.locator('body'));}],
];
async function walk(page:Page,lang:Lang,each:(step:string)=>Promise<void>){
 await open(page,lang);
 for(const [step,run] of STEPS){await run(page,lang);await page.waitForTimeout(200);await each(step);}
}

test('E01 reads differently in Spanish from English: guide, exposures, analyser, Observational Data, velocities and Hubble diagram',async({browser})=>{
 test.setTimeout(300_000);
 const seen:Record<'en'|'es-419',Map<string,Set<string>>>={en:new Map(),'es-419':new Map()};
 for(const lang of ['en','es-419'] as const){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await walk(page,lang,async step=>{seen[lang].set(step,new Set(await texts(page)));});
  expect(errors,lang).toEqual([]);await page.close();
 }
 const english=new Set([...seen.en.values()].flatMap(s=>[...s].map(bare)));
 const left=new Map<string,string>();// each text once, with the first step that shows it
 for(const [step,list] of seen['es-419'])for(const t of list)if(english.has(bare(t))&&!same(bare(t))&&!left.has(t))left.set(t,step);
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

test('qps: every text of the E01 walk is marked, outside identifiers and native mirrors',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 const left=new Map<string,string>();
 await walk(page,'qps',async step=>{for(const t of await texts(page))if(!/[⟦⟧]/.test(t)&&!same(bare(t))&&!left.has(t))left.set(t,step);});
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
});

// "View original (English)" (decision 9): with the stored option on, the whole walk shows no Spanish translation of a VIREO
// original (the Observational Data dialog, the Spectral Range dialog and its warning, the engine's Zoom, the spectrometer
// readout), while OpenVireo's own web text stays Spanish.
test('View original (English) on: every VIREO name in the E01 walk reads in English, the web text stays Spanish',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 const plain=(text:string)=>bare(text).replace(/(?: ›|…|\.\.\.)$/,'').trim();
 const leaves=(v:unknown):string[]=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(leaves):[];
 // OpenVireo's own Spanish (catalog and maps) may coincide with a Spanish original; those are web text, not a translated original.
 const web=new Set([...Object.values(S),...[ENGINE_VIEW_ES,SPECTRAL_RANGE_ES,OBSERVATORY_ES].flatMap(leaves),...Object.keys(O)].map(plain));
 const spanish=new Set(Object.values(O).map(plain).filter(t=>!web.has(t)));
 const left=new Map<string,string>();
 const checks:Record<string,()=>Promise<void>>={
  'engine Zoom dialog':async()=>{await expect(id(page,'engine-zoom')).toHaveText('Zoom');await expect(id(page,'engine-zoom-dialog').getByRole('heading')).toHaveText('Set Wavelength Range');},
  'Observational Data':async()=>{const d=id(page,'hubble-obsdata');await expect(d.getByRole('heading')).toHaveText('Observational Data');await expect(d).toContainText('Redshift (Z):');await expect(id(page,'hubble-obsdata-ok')).toHaveText('OK');},
  'Spectral Range warning':async()=>{await expect(id(page,'spectral-range-warning').getByRole('heading')).toHaveText('Spectrometer Will Clear!');},
  'Spectral Range dialog':async()=>{await expect(id(page,'spectral-range-dialog').getByRole('heading')).toHaveText('Spectrometer Wavelength Range');await expect(id(page,'spectral-range-default')).toHaveText('Default');},
 };
 await walk(page,'es-419',async step=>{
  for(const t of await texts(page))if(spanish.has(plain(t))&&!left.has(t))left.set(t,step);
  await checks[step]?.();
 });
 expect([...left].map(([t,step])=>`${step}: ${t}`)).toEqual([]);
 await expect(page.getByRole('link',{name:N('es-419','starExposure.open')})).toBeVisible();// web text: still Spanish
});

test('the E01 walk in English is unchanged: VIREO\'s captions are the originals and no native caption appears',async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width:1440,height:1000});
 const checks:Record<string,()=>Promise<void>>={
  'Hubble lab guide':async()=>{await expect(page.getByRole('heading',{name:E['lab.title'],exact:true})).toBeVisible();},
  'engine Zoom dialog':async()=>{await expect(id(page,'engine-zoom')).toHaveText('Zoom');await expect(id(page,'engine-zoom-dialog').getByRole('heading')).toHaveText('Set Wavelength Range');},
  'Observational Data':async()=>{await expect(id(page,'hubble-obsdata').getByRole('heading')).toHaveText('Observational Data');await expect(id(page,'hubble-obsdata-cancel')).toHaveText('Cancel');},
  'Spectral Range dialog':async()=>{await expect(id(page,'spectral-range-dialog').getByRole('heading')).toHaveText('Spectrometer Wavelength Range');await expect(id(page,'spectral-range-default')).toHaveText('Default');},
 };
 await walk(page,'en',async step=>{await checks[step]?.();await expect(page.locator('.native-mirror-caption')).toHaveCount(0);});
});

/** Layout problems at this width: page overflow; dialogs that leave the viewport or scroll sideways; buttons, labels, selects,
 * inputs and headings that are clipped, cross their card or dialog, or leave the viewport; plot text outside its SVG. Run with
 * the CI's DejaVu fonts (docs/I18N.md). */
const layoutProblems=(page:Page)=>page.evaluate(()=>{
 const out:string[]=[],width=document.documentElement.clientWidth;
 const visible=(el:Element)=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return false;for(let e:Element|null=el;e;e=e.parentElement){if((e as HTMLElement).hidden)return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;}return true;};
 const name=(el:Element)=>`${el.tagName.toLowerCase()} “${(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,40)}”`;
 if(document.documentElement.scrollWidth>width)out.push(`page overflows horizontally (${document.documentElement.scrollWidth} > ${width})`);
 for(const d of document.querySelectorAll<HTMLElement>('dialog[open]')){const r=d.getBoundingClientRect();if(!r.width)continue;
  const id=d.getAttribute('data-testid')??d.className;
  if(r.left<-.5||r.right>width+.5)out.push(`${id} leaves the viewport (${Math.round(r.left)}–${Math.round(r.right)})`);
  if(d.scrollWidth>d.clientWidth+1&&getComputedStyle(d).overflowX!=='visible')out.push(`${id} scrolls horizontally`);}
 const root=document.querySelector('dialog[open]')??document.body;
 for(const c of root.querySelectorAll<HTMLElement>('button,label,legend,h1,h2,h3,h4,select,input,summary,th')){
  if(c.closest('.portal-header,[lang=en]:not(html)')||!visible(c))continue;
  const q=c.getBoundingClientRect(),cs=getComputedStyle(c);
  if(q.width<=2||(cs.clip!=='auto'&&cs.position==='absolute'))continue;// visually hidden (an accessible name only)
  // Inside a container that scrolls sideways on purpose (a wide table), leaving the viewport is that container's scrolling.
  let scroller=false;for(let e=c.parentElement;e&&e!==document.body;e=e.parentElement){const o=getComputedStyle(e).overflowX;if((o==='auto'||o==='scroll')&&e.scrollWidth>e.clientWidth){scroller=true;break;}}
  if(!scroller&&(q.left<-.5||q.right>width+.5))out.push(`${name(c)} leaves the viewport`);
  if(c.scrollWidth>c.clientWidth+1&&['hidden','clip'].includes(getComputedStyle(c).overflowX)&&!['INPUT','SELECT'].includes(c.tagName))out.push(`${name(c)} clipped`);
  const box=c.parentElement?.closest('dialog,.card,details,fieldset');
  if(box&&!c.closest('table,.table-scroll,[role=region]')){const b=box.getBoundingClientRect();if(q.right>b.right+1||q.left<b.left-1)out.push(`${name(c)} crosses its ${box.tagName.toLowerCase()}`);}
 }
 for(const t of root.querySelectorAll<SVGTextElement>('svg text')){if(!visible(t)||t.closest('[lang=en]:not(html)'))continue;
  const svg=t.ownerSVGElement!,b=svg.getBoundingClientRect(),q=t.getBoundingClientRect();
  if(q.left<b.left-1||q.right>b.right+1||q.top<b.top-1||q.bottom>b.bottom+1)out.push(`plot text “${t.textContent?.trim().slice(0,40)}” outside its plot (${[q.left-b.left,b.right-q.right,q.top-b.top,b.bottom-q.bottom].map(Math.round).join(', ')})`);}
 return out;
});
for(const width of [320,1440])test(`at ${width} px the Spanish E01 screens lay out without overflow, clipping or crossing`,async({page})=>{
 test.setTimeout(240_000);await page.setViewportSize({width,height:width===320?700:1000});
 const problems=new Map<string,string>();
 await walk(page,(process.env.ES3_LAYOUT_LANG as Lang|undefined)??'es-419',async step=>{for(const p of await layoutProblems(page))if(!problems.has(p))problems.set(p,step);
  if(/guide|analyser|Observational Data|Hubble diagram with|Spectral Range dialog|star exposure/.test(step))await page.screenshot({path:test.info().outputPath(`es-e01-${width}-${step.replace(/\W+/g,'-')}.png`),fullPage:false});
  if(/analyser/.test(step))await page.locator('svg.spectrum:visible').first().screenshot({path:test.info().outputPath(`es-e01-${width}-spectrum-plot.png`)});});
 expect([...problems].map(([p,step])=>`${step}: ${p}`)).toEqual([]);
});
