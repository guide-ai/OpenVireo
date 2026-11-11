import {type Page,type Request} from '@playwright/test';
import {test,expect} from '../fixtures/area-tripwire';
import {PORTUGUESE_LOCALE,SPANISH_LOCALE} from '../fixtures/language';
import en from '../../src/i18n/en.json' with {type:'json'};
import es from '../../src/i18n/es/es.json' with {type:'json'};
import {WEDGE_ES} from '../../src/i18n/es/maps/wedge';
import {APP_SHELL_ES} from '../../src/i18n/es/maps/appShell';
import {HELP_VIEWER_ES} from '../../src/i18n/es/maps/helpViewer';
// @ts-expect-error The planner is a plain JS script (scripts/i18n-split.mjs), as tests import scripts/audit-ui-messages.mjs.
import {loadLanguages,planLanguage} from '../../scripts/i18n-split.mjs';
import {FRENCH_TEXT,PORTUGUESE_TEXT} from './languageText';
// Front ES-REL: Spanish by the browser language alone (tests/fixtures/language.ts).
test.use({locale:SPANISH_LOCALE});

// Front ES-SPLIT (docs/I18N.md, "Spanish: the chunk split by route area"): on the dev server, where the tripwire is on, a Spanish
// load fetches the core module only, each area route fetches its area and shared modules once (in parallel with its own
// JavaScript), and no text is read before its area arrives (that would throw, reach the route's error notice and log a console
// error). An area that fails or does not arrive leaves that route in English with a bilingual notice; English fetches nothing.
type Module={name:string;kind:string;shared:string[];empty?:boolean};
type Plan={modules:Module[];keyModule:Record<string,string>;mapModule:Record<string,string>};
const planOf=(tag:string)=>planLanguage(loadLanguages().find((l:{tag:string})=>l.tag===tag)) as Plan;
const plan=planOf('es-419');
const S=es as Record<string,string>,E=en as Record<string,string>;
/** The modules an area route fetches: the area and its shared modules. */
const modulesOf=(area:string)=>{const m=plan.modules.find(x=>x.name===area)!;return [area,...m.shared].sort();};
const id=(page:Page,testId:string)=>page.getByTestId(testId);
type Route={hash:string;area:string;file:string;ready:(page:Page)=>Promise<void>};
const heading=(key:string)=>async(page:Page)=>{await expect(page.getByRole('heading',{level:1,name:S[key],exact:true})).toBeVisible({timeout:30_000});};
const ROUTES:Route[]=[
 {hash:'classification',area:'classification',file:'/src/ClassificationLab.tsx',ready:heading('class.title')},
 {hash:'cluster-database',area:'cluster',file:'/src/ClusterDatabaseLab.tsx',ready:async page=>{await expect(page.getByRole('heading',{name:S['db.title'],exact:true})).toBeVisible({timeout:30_000});}},
 {hash:'photometer',area:'photometer',file:'/src/Photometer.tsx',ready:async page=>{await expect(page.getByRole('heading',{name:S['ph.title'],exact:true})).toBeVisible({timeout:30_000});}},
 {hash:'pulsar-analysis',area:'pulsar',file:'/src/components/PulsarAnalysis.tsx',ready:async page=>{await expect(id(page,'pulsar-analysis')).toBeVisible({timeout:30_000});}},
 {hash:'radio-control',area:'radio',file:'/src/components/RadioTelescopeRoute.tsx',ready:async page=>{await expect(id(page,'radio-route')).toBeVisible({timeout:30_000});}},
 {hash:'lss-survey',area:'lss',file:'/src/LssSurvey.tsx',ready:async page=>{await expect(page.getByRole('heading',{name:S['lss.title'],exact:true})).toBeVisible({timeout:30_000});}},
 {hash:'lss-wedge',area:'lss',file:'/src/components/WedgeLab.tsx',ready:async page=>{await expect(id(page,'wedge-persistence')).toHaveText(WEDGE_ES.persistenceNote,{timeout:30_000});}},
 {hash:'galaxy-exposure',area:'exposure',file:'/src/GalaxyExposure.tsx',ready:async page=>{await expect(page.getByRole('heading',{name:S['galaxyExposure.title'],exact:true})).toBeVisible({timeout:30_000});}},
 {hash:'sky-exposure',area:'exposure',file:'/src/SkyExposure.tsx',ready:async page=>{await expect(page.getByRole('button',{name:S['skyExposure.startSkyExposure'],exact:true})).toBeVisible({timeout:30_000});}},
 {hash:'star-exposure',area:'exposure',file:'/src/StarExposure.tsx',ready:async page=>{await expect(page.getByRole('heading',{name:S['starExposure.title'],exact:true})).toBeVisible({timeout:30_000});}},
 {hash:'images',area:'fits',file:'/src/FitsImageLab.tsx',ready:heading('fits.title')},
];

type Watch={language:{name:string;at:number}[];finished:Map<string,number>;problems:string[]};
/** Records the language modules a page requests (in order, with the time), when each route module finished, console errors and
 * page errors. The tour is marked done, so nothing covers the page. */
async function watch(page:Page,tag='es-419',dir='es',catalog='es.json'):Promise<Watch>{
 const w:Watch={language:[],finished:new Map(),problems:[]},start=Date.now();
 await page.addInitScript(()=>{try{localStorage.setItem('openvireo.tour.v1','done');}catch{/* about:blank has no storage */}});
 const module=new RegExp(`openvireo-i18n/i18n-${tag}-([\\w+%-]+)`),whole=new RegExp(`/src/i18n/${dir}/(?:index\\.ts|${catalog.replace('.','\\.')})`);
 const name=(r:Request)=>module.exec(decodeURIComponent(r.url()))?.[1];
 page.on('request',r=>{const n=name(r);if(n)w.language.push({name:n,at:Date.now()-start});if(whole.test(r.url()))w.problems.push(`whole bundle requested: ${r.url()}`);});
 page.on('requestfinished',r=>{const path=new URL(r.url()).pathname;if(!w.finished.has(path))w.finished.set(path,Date.now()-start);});
 page.on('console',m=>{if(m.type()==='error')w.problems.push(`console: ${m.text()}`);});
 page.on('pageerror',e=>w.problems.push(`pageerror: ${e.message}`));
 return w;
}
const names=(w:Watch)=>w.language.map(r=>r.name);
async function noRouteError(page:Page){await expect(page.locator('[data-testid=route-error],[data-testid=site-updated]')).toHaveCount(0);}

// Front ES-REL: an English browser (en-US), with no ?lang=, as an English visitor arrives.
test.describe('in an English browser',()=>{
 test.use({locale:'en-US'});
 test('English fetches no language module on the home page or on any area route',async({page})=>{
  test.setTimeout(240_000);
  const w=await watch(page);
  await page.goto('/#observatory');await expect(page.getByRole('heading',{level:1,name:E['sky.title']})).toBeVisible({timeout:30_000});
  for(const r of ROUTES){await page.goto('about:blank');await page.goto(`/#${r.hash}`);await page.waitForLoadState('networkidle');await noRouteError(page);}
  expect(names(w)).toEqual([]);expect(w.problems).toEqual([]);
 });
});

test('a Spanish home page fetches only the core module, and the shell is Spanish',async({page})=>{
 const w=await watch(page);
 await page.goto('/#observatory');await expect(page.getByRole('heading',{level:1,name:S['sky.title']})).toBeVisible({timeout:30_000});
 await expect(page.locator('.investigation-toolbar')).toContainText(S['project.save']);
 await page.waitForLoadState('networkidle');
 expect(names(w)).toEqual(['core']);expect(w.problems).toEqual([]);
});

for(const r of ROUTES)test(`#${r.hash} fetches the ${r.area} area once, with its route, and reads no text before it arrives`,async({page})=>{
 test.setTimeout(120_000);
 const w=await watch(page);
 await page.goto(`/#${r.hash}`);
 await r.ready(page);await page.waitForLoadState('networkidle');await noRouteError(page);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');
 const fetched=names(w);
 expect(fetched[0]).toBe('core');
 expect(fetched.slice(1).sort(),`${r.hash} fetched ${fetched.join(', ')}`).toEqual(modulesOf(r.area));
 // The area starts while its route's own module is still loading (both are fetched together by lazyArea).
 const routeDone=w.finished.get(r.file),areaStart=w.language.find(x=>x.name===r.area)!.at;
 expect(routeDone,`${r.file} was fetched`).toBeDefined();expect(areaStart).toBeLessThanOrEqual(routeDone!);
 expect(w.problems).toEqual([]);
});

test('File › Cluster Data… on the observatory fetches the cluster area and opens in Spanish',async({page})=>{
 const w=await watch(page);
 await page.goto('/#observatory');
 await expect(page.locator('.sky-card .card-heading > button')).toBeVisible({timeout:30_000});await page.locator('.sky-card .card-heading > button').click();
 await id(page,'fi-file-menu').click();await id(page,'cluster-data-menu').click();
 await expect(id(page,'cd-dialog')).toBeVisible({timeout:30_000});await page.waitForLoadState('networkidle');
 expect(names(w)[0]).toBe('core');expect(names(w).slice(1).sort()).toEqual(modulesOf('cluster'));
 expect(plan.mapModule.clusterData).toBe('cluster');
 expect(w.problems).toEqual([]);
});

// The exports-identity walk (tests/i18n/exports-identity.spec.ts) at the Coma – 1 pointing, in Spanish.
const ES_TEXT=new Map<string,string>(Object.entries(E).filter(([k])=>Object.hasOwn(S,k)).map(([k,v])=>[v,S[k]]));
const spanish=(text:string)=>{const v=ES_TEXT.get(text);if(!v)throw new Error(`No Spanish for “${text}”`);return v;};
test('the field spectrometer at a field pointing fetches the exposure area and opens in Spanish',async({page})=>{
 test.setTimeout(180_000);
 const w=await watch(page);
 await page.goto('/#observatory');await expect(page.getByRole('heading',{level:1,name:S['sky.title']})).toBeVisible({timeout:30_000});
 await page.getByRole('button',{name:`${spanish('Open dome')} ↗`,exact:true}).click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText(spanish('Enter coordinates'),{exact:true}).click();
 await page.locator('#point-ra').fill('12.99311111111111');await page.locator('#point-dec').fill('27.959722222222222');
 await page.getByRole('button',{name:spanish('Point to coordinates'),exact:true}).click();
 await page.getByRole('button',{name:/^\s*Telescopio/}).first().click();
 if(!await page.getByRole('button',{name:spanish('Turn tracking on'),exact:true}).isVisible())await page.getByText(spanish('Observatory clock & spectral tracking'),{exact:true}).click();
 if(await page.getByRole('button',{name:spanish('Turn tracking on'),exact:true}).isVisible())await page.getByRole('button',{name:spanish('Turn tracking on'),exact:true}).click();
 expect(names(w)).toEqual(['core']);
 await page.evaluate(()=>{location.hash='#spectrometer';});
 await expect(id(page,'field-spec-use')).toBeEnabled({timeout:30_000});await expect(id(page,'field-spec-use')).toHaveText(S['fieldSpec.use']);
 await id(page,'field-spec-use').click();await expect(id(page,'field-spec-acquisition')).toBeVisible({timeout:90_000});
 await page.waitForLoadState('networkidle');
 expect(names(w)[0]).toBe('core');expect(names(w).slice(1).sort()).toEqual(modulesOf('exposure'));expect(w.problems).toEqual([]);
});

test('an area\'s help viewer, its print preview and a forced route error read no text before their area',async({page})=>{
 test.setTimeout(120_000);
 const w=await watch(page);
 await page.goto('/#classification');await ROUTES[0].ready(page);
 await id(page,'class-help-open').click();
 await expect(id(page,'class-help-topics-view-label')).toHaveText(HELP_VIEWER_ES.translationLabel);
 // The wedge print preview (an lss window).
 await page.goto('about:blank');await page.goto('/#lss-wedge');await ROUTES.find(r=>r.hash==='lss-wedge')!.ready(page);
 await id(page,'wedge-print').click();await expect(id(page,'wedge-print-preview')).toBeVisible();
 await id(page,'wedge-print-preview-close').click();await expect(id(page,'wedge-print-preview')).toHaveCount(0);
 expect(w.problems).toEqual([]);
 // A route whose JavaScript cannot be fetched (a redeploy) shows the shell's "site updated" notice, in Spanish (core text).
 await page.goto('about:blank');
 await page.route(/\/src\/FitsImageLab\.tsx/,route=>route.abort('failed'));
 await page.goto('/#images');
 await expect(id(page,'site-updated')).toBeVisible({timeout:30_000});
 await expect(id(page,'site-updated')).toContainText(APP_SHELL_ES.recovery!.updatedTitle!);
 // The failed route fetch logs its own console errors; no text was read before its area.
 expect(w.problems.filter(p=>/before its area/.test(p))).toEqual([]);
});

const NOTICE_EN='Part of the Spanish text could not be loaded; that part is shown in English. Reload to try again.';
const NOTICE_ES='No se pudo cargar parte del texto en español; esa parte se muestra en inglés. Recarga para intentarlo de nuevo.';
test('an area module that fails leaves its route in English with the bilingual notice; the shell stays Spanish',async({page})=>{
 const w=await watch(page);
 await page.route(/openvireo-i18n\/i18n-es-419-classification/,route=>route.abort('failed'));
 await page.goto('/#classification');
 await expect(page.getByRole('heading',{level:1,name:E['class.title'],exact:true})).toBeVisible({timeout:30_000});
 const notice=id(page,'area-failure');await expect(notice).toContainText(NOTICE_EN);await expect(notice.locator('[lang=es-419]')).toHaveText(NOTICE_ES);
 await expect(notice).toHaveAttribute('role','status');await expect(notice).toHaveCount(1);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');await expect(page.locator('.investigation-toolbar')).toContainText(S['project.save']);
 await noRouteError(page);
 expect(w.problems.filter(p=>!/area classification could not be loaded|Failed to fetch dynamically imported module|net::ERR_FAILED/.test(p))).toEqual([]);
});

test('an area module that does not arrive within 10 s leaves its route in English with the notice; a late part changes nothing',async({page})=>{
 const w=await watch(page);
 let release:(()=>void)|undefined;
 await page.route(/openvireo-i18n\/i18n-es-419-fits/,async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.continue().catch(()=>{});});
 await page.clock.install();
 await page.goto('/#images');
 await expect.poll(()=>release!==undefined,{timeout:30_000}).toBe(true);
 await expect(page.getByRole('heading',{level:1,name:S['fits.title']})).toHaveCount(0);// the route waits for its area
 await page.clock.runFor(10_000);
 await expect(page.getByRole('heading',{level:1,name:E['fits.title'],exact:true})).toBeVisible({timeout:30_000});
 await expect(id(page,'area-failure')).toContainText(NOTICE_ES);
 release!();await page.waitForTimeout(500);
 await expect(page.getByRole('heading',{level:1,name:E['fits.title'],exact:true})).toBeVisible();
 await expect(page.locator('.investigation-toolbar')).toContainText(S['project.save']);await noRouteError(page);
 expect(w.problems.filter(p=>!/area fits could not be loaded/.test(p))).toEqual([]);
});

test('View original (English) on an area route: VIREO\'s names in English, the area\'s web text Spanish',async({page})=>{
 const w=await watch(page);
 await page.addInitScript(()=>{try{localStorage.setItem('openvireo-vireo-originals','1');}catch{/* about:blank */}});
 await page.goto('/#classification');await ROUTES[0].ready(page);
 await expect(page.locator('#classification-program-title')).toHaveText(S['program.title']);
 await expect(id(page,'class-help-open')).toHaveText('Help');
 await page.waitForLoadState('networkidle');
 expect(names(w)[0]).toBe('core');expect(names(w).slice(1).sort()).toEqual(modulesOf('classification'));expect(w.problems).toEqual([]);
});

// Front PT0 (plan front-i18n-pt-br.md §6) checked here that a language before its release (its `?lang=pt-BR` preview, partial)
// fetched only its core and no chunk for an empty area; the qaa-XA fixture of src/i18n/partialLanguage.test.ts and split.test.ts
// keeps that case (and Front FR0 brings it back for French, at the end of this file). Front PT-REL: Brazilian Portuguese is released and complete, so a pt-BR browser, with no `?lang=`, fetches its
// core and, on each area route, exactly the area and shared modules its plan gives (no area is empty any more), with the route in
// Portuguese, no notice, no route error and no read before its area.
test.describe('in a Brazilian Portuguese browser',()=>{
 test.use({locale:PORTUGUESE_LOCALE});
 test('Brazilian Portuguese (released) fetches its core, and on each area route only that area\'s modules',async({page})=>{
  test.setTimeout(300_000);
  const P=PORTUGUESE_TEXT,ptPlan=planOf(P.tag),module=(name:string)=>ptPlan.modules.find(m=>m.name===name)!;
  const fetchedFor=(area:string)=>{const m=module(area);return m.empty?[]:[area,...m.shared].sort();};
  const w=await watch(page,P.tag,P.entry.dir,P.entry.catalog);
  await page.goto(`/${P.query}#observatory`);await expect(page.getByRole('heading',{level:1,name:P.catalog['sky.title']})).toBeVisible({timeout:30_000});
  await page.waitForLoadState('networkidle');
  expect(names(w)).toEqual(['core']);expect(w.problems).toEqual([]);
  const C={...E,...P.catalog};
  const ready:Record<string,(page:Page)=>Promise<void>>={
   'pulsar-analysis':async p=>{await expect(id(p,'pulsar-analysis')).toBeVisible({timeout:30_000});},
   'radio-control':async p=>{await expect(id(p,'radio-route')).toBeVisible({timeout:30_000});},
   'lss-wedge':async p=>{await expect(id(p,'wedge-persistence')).toBeVisible({timeout:30_000});},
   'sky-exposure':async p=>{await expect(p.getByRole('button',{name:C['skyExposure.startSkyExposure'],exact:true})).toBeVisible({timeout:30_000});},
  };
  const headingKey:Record<string,string>={classification:'class.title','cluster-database':'db.title',photometer:'ph.title','lss-survey':'lss.title','galaxy-exposure':'galaxyExposure.title','star-exposure':'starExposure.title',images:'fits.title'};
  const empty=ptPlan.modules.filter(m=>m.kind==='area'&&m.empty).map(m=>m.name);
  expect(empty,'a released language has no empty area').toEqual([]);
  for(const r of ROUTES){
   await page.goto('about:blank');w.language.length=0;
   await page.goto(`/${P.query}#${r.hash}`);
   await (ready[r.hash]??(async(p:Page)=>{await expect(p.getByRole('heading',{name:C[headingKey[r.hash]],exact:true})).toBeVisible({timeout:30_000});}))(page);
   await page.waitForLoadState('networkidle');await noRouteError(page);
   await expect(page.locator('html')).toHaveAttribute('lang',P.entry.htmlLang);await expect(id(page,'area-failure')).toHaveCount(0);
   await expect(page.locator('.investigation-toolbar')).toContainText(P.catalog['project.save']);
   const fetched=names(w);
   expect(fetched[0],r.hash).toBe('core');
   expect(fetched.slice(1).sort(),`${r.hash} fetched ${fetched.join(', ')}`).toEqual(fetchedFor(r.area));
   if(empty.includes(r.area))expect(fetched.slice(1),`${r.hash}: the empty ${r.area} area has no chunk`).toEqual([]);
  }
  expect(w.problems).toEqual([]);
 });
});

// Front FR0 (plan front-i18n-fr.md §1.2 #6): a language before its release is partial again. French's preview (`?lang=fr`, in an
// English browser) fetches its core, and each area route only the area modules its plan gives text to; an area with no text yet is
// empty, has no chunk and resolves at once, so its route shows English without a notice, a route error or a read before its area.
// With FR0's shell slice only `photometer` holds text (project.photometryCleared and project.photometryRestored, rendered by the
// photometer); later FR fronts fill the others. Front FR1: the observatory's maps and keys also give text to `classification`
// (the observationMetadata map) and `fits` (the cameraInfo.* keys the saved-image viewer shares). Front FR2 (E01 and E02) fills `exposure`
// and `lss` (and their shared `exposure+lss` module). Front FR3: E03 fills `classification` and its shared `classification+cluster`
// module, which the cluster routes also fetch, so `cluster` is no longer empty (as for pt-BR after PT3). Front FR5 (the radio
// telescope) fills `radio` and the shared `pulsar+radio` module (the radioR1 map, which Pulsar Analysis's File menu also shows), so
// `pulsar` fetches that module too and no area is empty any more; each route still fetches exactly its plan's modules, and an
// empty area (none now) would still have to fetch no chunk. FR-REL turns this back
// into a released-language test (as PT-REL did).
test.describe('a language before its release',()=>{
 test.use({locale:'en-US'});
 test('a partial language (French) fetches only its core, and no chunk for an empty area',async({page})=>{
  test.setTimeout(300_000);
  const P=FRENCH_TEXT,frPlan=planOf(P.tag),module=(name:string)=>frPlan.modules.find(m=>m.name===name)!;
  expect(P.entry.released,'FR-REL replaces this test').toBe(false);
  const fetchedFor=(area:string)=>{const m=module(area);return m.empty?[]:[area,...m.shared].sort();};
  const w=await watch(page,P.tag,P.entry.dir,P.entry.catalog);
  await page.goto(`/${P.query}#observatory`);await expect(page.getByRole('heading',{level:1,name:P.catalog['sky.title']})).toBeVisible({timeout:30_000});
  await page.waitForLoadState('networkidle');
  expect(names(w)).toEqual(['core']);expect(w.problems).toEqual([]);
  const C={...E,...P.catalog};
  const ready:Record<string,(page:Page)=>Promise<void>>={
   'pulsar-analysis':async p=>{await expect(id(p,'pulsar-analysis')).toBeVisible({timeout:30_000});},
   'radio-control':async p=>{await expect(id(p,'radio-route')).toBeVisible({timeout:30_000});},
   'lss-wedge':async p=>{await expect(id(p,'wedge-persistence')).toBeVisible({timeout:30_000});},
   'sky-exposure':async p=>{await expect(p.getByRole('button',{name:C['skyExposure.startSkyExposure'],exact:true})).toBeVisible({timeout:30_000});},
  };
  const headingKey:Record<string,string>={classification:'class.title','cluster-database':'db.title',photometer:'ph.title','lss-survey':'lss.title','galaxy-exposure':'galaxyExposure.title','star-exposure':'starExposure.title',images:'fits.title'};
  const empty=frPlan.modules.filter(m=>m.kind==='area'&&m.empty).map(m=>m.name);
  // FR1 review: pin the areas French gives text to (each FR front updates this list), so a lost or stray area fails here.
  expect(frPlan.modules.filter(m=>m.kind==='area'&&!m.empty).map(m=>m.name).sort(),'the areas with French text').toEqual(['classification','cluster','exposure','fits','lss','photometer','pulsar','radio']);
  // Front FR5: no area is empty any more (the pulsar area holds only the shared pulsar+radio module until FR6).
  expect(empty,'no area is empty after FR5').toEqual([]);
  for(const r of ROUTES){
   await page.goto('about:blank');w.language.length=0;
   await page.goto(`/${P.query}#${r.hash}`);
   await (ready[r.hash]??(async(p:Page)=>{await expect(p.getByRole('heading',{name:C[headingKey[r.hash]],exact:true})).toBeVisible({timeout:30_000});}))(page);
   await page.waitForLoadState('networkidle');await noRouteError(page);
   await expect(page.locator('html')).toHaveAttribute('lang',P.entry.htmlLang);await expect(id(page,'area-failure')).toHaveCount(0);
   await expect(page.locator('.investigation-toolbar')).toContainText(P.catalog['project.save']);
   const fetched=names(w);
   expect(fetched[0],r.hash).toBe('core');
   expect(fetched.slice(1).sort(),`${r.hash} fetched ${fetched.join(', ')}`).toEqual(fetchedFor(r.area));
   if(empty.includes(r.area))expect(fetched.slice(1),`${r.hash}: the empty ${r.area} area has no chunk`).toEqual([]);
  }
  expect(w.problems).toEqual([]);
 });
});
