// Front REL1 [W]: smoke test of the production build (dist/) served by `wrangler pages dev` on loopback, which applies
// dist/_headers as Cloudflare Pages does. Run with playwright.pages.config.ts (docs/DEPLOY.md, "Prueba local"); the normal
// suite does not pick up *.pages.ts. No request leaves the machine: every non-loopback request is aborted, and the VizieR
// requests are answered with the recorded response tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml (CDS, 2026-10-27).
import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {VIZIER_POLICY} from '../../src/core/vizierNomad';
// @ts-expect-error The planner is a plain JS script (scripts/i18n-split.mjs), as tests import scripts/audit-ui-messages.mjs.
import {loadLanguages,planLanguage} from '../../scripts/i18n-split.mjs';

const VIZIER=/^https:\/\/vizier\.(?:idia\.ac\.za|cds\.unistra\.fr|cfa\.harvard\.edu)\//;
// The tiles and the whole file, as docs/LOCAL-RESOURCES.json records them (src/io/bundledOrbitFile.test.ts checks the loader's copy).
const manifest=JSON.parse(await readFile(new URL('../../docs/LOCAL-RESOURCES.json',import.meta.url),'utf8')) as {files:{path:string;sha256:string}[];assembled:{name:string;bytes:number;sha256:string;tiles:string[]}[]};
const MPC=manifest.assembled.find(a=>a.name==='ObjX_MPC.CMO')!;
const MPC_TILES=MPC.tiles.map(t=>({path:t.replace(/^public/,''),sha256:manifest.files.find(f=>f.path===t)!.sha256}));
const recorded=readFile(new URL('../fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});

type Problems={console:string[];errors:string[];csp:string[];external:string[];language:string[];tags:string[]};
const LANGUAGES=loadLanguages() as {tag:string}[];
/** Front ES-SPLIT: the module in a language chunk's name (i18n-<tag>-<module>-<hash>.js; a shared module's `+` is written `_`).
 * Front PT-REL: any registered language's chunk; `tags` records whose. */
const LANGUAGE_CHUNK=new RegExp(`/assets/i18n-(${LANGUAGES.map(l=>l.tag).join('|')})-([a-z_]+)-[\\w-]{8}\\.js$`);
/** Records console errors and warnings, page errors and CSP violations, and aborts every request that is not to this server. */
async function watch(page:Page,base:string):Promise<Problems>{
 const p:Problems={console:[],errors:[],csp:[],external:[],language:[],tags:[]};
 page.on('request',r=>{const m=LANGUAGE_CHUNK.exec(new URL(r.url()).pathname);if(m){p.tags.push(m[1]);p.language.push(m[2].replace(/_/g,'+'));}});
 await page.context().route(url=>!url.href.startsWith(base),route=>{p.external.push(route.request().url());return route.abort('blockedbyclient');});
 await page.addInitScript(()=>{
  const w=window as unknown as {__csp:string[]};w.__csp=[];
  document.addEventListener('securitypolicyviolation',e=>{w.__csp.push(`${e.effectiveDirective} ${e.blockedURI}`);});
  // Front ES0 review 1: src/boot.ts must settle the UI language before any text is built. Count the writes of the active-language
  // holder (src/i18n/active.ts) and the reads that found it empty; a read before boot would show here and as boot's console error.
  // Front ES-SPLIT: after the first write (boot's activation) every write is a route area's text arriving or failing: the same
  // language, with one more area each time.
  const key=Symbol.for('openvireo.i18n.active'),l=window as unknown as {__languageSets:number;__languageEarlyReads:number;__languageChanges:string[]};let held:{language?:string;areas?:Map<string,string>}|undefined;l.__languageSets=0;l.__languageEarlyReads=0;l.__languageChanges=[];
  Object.defineProperty(globalThis,key,{configurable:true,get(){if(held===undefined)l.__languageEarlyReads++;return held;},set(value){
   l.__languageSets++;
   if(held!==undefined&&(value?.language!==held.language||(value?.areas?.size??0)!==(held.areas?.size??0)+1))l.__languageChanges.push(`${String(held.language)}>${String(value?.language)} areas ${held.areas?.size??0}>${value?.areas?.size??0}`);
   held=value;
  }});
 });
 page.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&/Content.Security.Policy|Permissions.Policy|Refused to/i.test(m.text())))p.console.push(`${m.type()}: ${m.text()}`);});
 page.on('pageerror',e=>p.errors.push(e.message));
 return p;
}
const violations=(page:Page)=>page.evaluate(()=>(window as unknown as {__csp:string[]}).__csp);
/** How often the active-language holder was set and read while still empty (see watch). Boot sets it once and nothing reads it
 * first; Front ES-SPLIT: then each route area adds one write, of the same language with one more area (`changes` lists any other). */
const language=(page:Page)=>page.evaluate(()=>{const l=window as unknown as {__languageSets:number;__languageEarlyReads:number;__languageChanges:string[]};return {sets:l.__languageSets,earlyReads:l.__languageEarlyReads,changes:l.__languageChanges};});

test('the page, a hashed bundle and an original file carry the release headers',async({request,baseURL})=>{
 const page=await request.get('/');expect(page.status()).toBe(200);
 const h=page.headers(),csp=h['content-security-policy'];
 expect(csp).toContain("default-src 'none'");expect(csp).toContain("frame-ancestors 'none'");
 expect([h['x-content-type-options'],h['referrer-policy'],h['x-frame-options']]).toEqual(['nosniff','same-origin','DENY']);
 expect(h['permissions-policy']).toContain('camera=()');expect(h['permissions-policy']).toContain('geolocation=()');
 expect(h['cache-control']).toBe('no-cache');
 const html=await page.text(),asset=/src="(\/assets\/index-[\w-]+\.js)"/.exec(html)![1];
 const js=await request.get(asset);expect(js.status()).toBe(200);
 expect(js.headers()['cache-control']).toBe('public, max-age=31536000, immutable');expect(js.headers()['content-security-policy']).toBe(csp);
 const htl=await request.get('/original/hotlists/Hubble.HTL');expect(htl.status()).toBe(200);
 expect(htl.headers()['cache-control']).toBe('public, max-age=86400, stale-while-revalidate=604800');
 expect(htl.headers()['x-content-type-options']).toBe('nosniff');
 const tile=await request.get('/original/orbit/ObjX_MPC/000.bin');expect(tile.status()).toBe(200);
 expect(tile.headers()['cache-control']).toBe('public, max-age=86400, stale-while-revalidate=604800');
 // The whole 31 MB file is not deployed. With dist/404.html Pages answers a missing path with 404 (no SPA fallback: the app
 // routes by #hash), so a missing original can never pass for a 200 page.
 const whole=await request.get('/original/orbit/ObjX_MPC.CMO');
 expect([whole.status(),whole.headers()['content-type']]).toEqual([404,'text/html; charset=utf-8']);
 const notFound=await whole.text();expect(notFound).toContain('This address is not part of OpenVireo.');
 // Front ES-REL: the 404 page is bilingual; Front PT-REL: trilingual.
 expect(notFound).toContain('Esta dirección no forma parte de OpenVireo.');expect(notFound).toContain('Este endereço não faz parte do OpenVireo.');
 expect(baseURL).toMatch(/^http:\/\/127\.0\.0\.1:63\d\d$/);// playwright.pages.config.ts admits only 6300–6398
});

test('the live camera query may reach exactly the VizieR hosts it tries; other hosts are refused by the policy',async({page,baseURL})=>{
 const p=await watch(page,baseURL!),body=await recorded;
 await page.route(VIZIER,route=>route.fulfill({status:200,contentType:'text/xml',headers:{'access-control-allow-origin':'*'},body}));
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 const status=await page.evaluate(async hosts=>{
  const out:Record<string,string>={};
  for(const h of hosts)try{out[h]=String((await fetch(`https://${h}/viz-bin/conesearch/I/297/out?RA=1&DEC=2&SR=0.01`)).status);}catch(e){out[h]=String(e);}
  return out;
 },[...VIZIER_POLICY.liveHosts,'vizier.cfa.harvard.edu']);
 expect(status).toEqual({'vizier.idia.ac.za':'200','vizier.cds.unistra.fr':'200','vizier.cfa.harvard.edu':'TypeError: Failed to fetch'});
 // CfA is never tried live (VIZIER_POLICY.liveHosts) and the policy refuses it before any request.
 expect(await violations(page)).toEqual(['connect-src https://vizier.cfa.harvard.edu/viz-bin/conesearch/I/297/out?RA=1&DEC=2&SR=0.01']);
 expect(p.external.filter(u=>!VIZIER.test(u))).toEqual([]);
});

test('a live camera exposure goes through the policy with the recorded VizieR answer',async({page,baseURL})=>{
 test.setTimeout(120_000);
 const p=await watch(page,baseURL!),seen:string[]=[];
 // The recorded Pleiades rows moved onto the tracked pointing (as tests/camera-exposure.spec.ts does).
 const dRa=.4987684*15-56.75,dDec=.03628-24.12,body=(await recorded).toString('utf8')
  .replace(/<TD>(0?56\.7\d+)<\/TD>/g,(_,v:string)=>`<TD>${(Number(v)+dRa).toFixed(7)}</TD>`).replace(/<TD>\+?(24\.1\d+)<\/TD>/g,(_,v:string)=>`<TD>+${(Number(v)+dDec).toFixed(7)}</TD>`);
 await page.route(VIZIER,route=>{seen.push(route.request().url());return route.fulfill({status:200,contentType:'text/xml',headers:{'access-control-allow-origin':'*'},body});});
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();await page.getByLabel('Target',{exact:true}).selectOption('N0000.DAT@14428');
 await button(page,'Point telescope ↗').click();await button(page,'Switch to telescope view ↗').click();
 if(!await button(page,'Start observatory clock').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Start observatory clock').click();await button(page,'Turn tracking on').click();
 const camera=page.getByTestId('camera-control');
 await camera.getByLabel(/Ask VizieR live/).check();await camera.getByLabel('Minutes').fill('0');await camera.getByLabel('Seconds').fill('2');
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:60_000});
 await expect(page.getByTestId('camera-canvas')).toBeVisible();
 expect(seen.map(u=>new URL(u).origin)).toEqual(['https://vizier.idia.ac.za']);
 expect([p.console,p.errors,await violations(page)]).toEqual([[],[],[]]);
 expect(p.external.filter(u=>!VIZIER.test(u))).toEqual([]);
});

// Each tool and exercise route, opened fresh: no CSP violation, console error or page error, and nothing external.
const ROUTES:readonly (readonly [string,string])[]=[
 ['#home','Welcome (Front HOME)'],['#observatory','Observatory'],['#spectrum','Hubble analysis (spectrum measuring)'],['#galaxy-exposure','Hubble galaxy exposure'],
 ['#lss-survey','Large-scale structure survey'],['#lss-wedge','LSS wedge plot'],['#classification','Stellar classification'],
 ['#photometer','Pleiades photometry'],['#cluster-database','Cluster HR diagrams'],['#radio-control','Radio telescope (pulsars)'],
 ['#pulsar-analysis','Pulsar analysis'],['#object-x','Object X'],['#spectrometer','Spectrometer'],['#star-exposure','Star exposure'],
 ['#sky-exposure','Sky exposure'],['#images','FITS images'],['#variable-stars','Variable stars'],
];
for(const [hash,name] of ROUTES)test(`${name} (${hash}) opens with no policy violation or error`,async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.goto(`/${hash}`);await page.waitForLoadState('networkidle');
 await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible();
 if(hash==='#spectrum'){await page.getByText('Hubble diagram & distances',{exact:true}).click();await page.waitForLoadState('networkidle');}
 await page.waitForTimeout(500);
 expect({console:p.console,errors:p.errors,csp:await violations(page),external:p.external}).toEqual({console:[],errors:[],csp:[],external:[]});
 expect(await language(page)).toEqual({sets:1,earlyReads:0,changes:[]});
 expect(p.language,'English fetches no language chunk').toEqual([]);
});

// Front ES-SPLIT: every route of the production build in Spanish: it fetches the core and exactly its area's modules
// (scripts/i18n-split.mjs), the language is activated once and then extended once per area, and nothing logs an error (a text
// read before its area is answered in English and logged, since ES-REL made the catalog complete). Front ES-REL: in an es-MX
// browser with no ?lang=, as a Spanish visitor arrives (the preview link keeps its own test below).
type Plan={modules:{name:string;shared:string[];empty?:boolean}[]};
const planOf=(tag:string)=>planLanguage(LANGUAGES.find(l=>l.tag===tag)) as Plan;
const plan=planOf('es-419');
const AREA_OF:Readonly<Record<string,string>>={'#classification':'classification','#cluster-database':'cluster','#photometer':'photometer','#pulsar-analysis':'pulsar',
 '#radio-control':'radio','#lss-survey':'lss','#lss-wedge':'lss','#galaxy-exposure':'exposure','#star-exposure':'exposure','#sky-exposure':'exposure','#images':'fits',
 '#spectrometer':'exposure'};// the field spectrometer at the default pointing
const modulesOf=(area:string|undefined,from:Plan=plan)=>{if(!area)return [];const m=from.modules.find(x=>x.name===area)!;return [area,...m.shared].sort();};
test.describe('in a Spanish browser (es-MX)',()=>{
test.use({locale:'es-MX'});
for(const [hash,name] of ROUTES)test(`Front ES-SPLIT: ${name} (${hash}) in Spanish fetches the core and its area only, with no error`,async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.goto(`/${hash}`);await page.waitForLoadState('networkidle');
 await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');
 await expect(page.locator('[data-testid=route-error],[data-testid=site-updated],[data-testid=area-failure],[data-testid=language-failure]')).toHaveCount(0);
 await page.waitForTimeout(500);
 expect({console:p.console,errors:p.errors,csp:await violations(page),external:p.external}).toEqual({console:[],errors:[],csp:[],external:[]});
 const area=AREA_OF[hash],modules=modulesOf(area);
 expect(p.language[0]).toBe('core');expect(p.language.slice(1).sort()).toEqual(modules);
 expect(await language(page)).toEqual({sets:area?2:1,earlyReads:0,changes:[]});
});
// Front ES-REL: the browser language alone opens Spanish, with the selector shown and its stylesheet allowed by the release CSP.
test('Front ES-REL: an es-MX browser opens Spanish without ?lang=, with the selector, under the release CSP',async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Empieza por el cielo.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.lang)).toBe('es-419');
 await expect(page).toHaveTitle('OpenVireo · Prácticas de astronomía de CLEA VIREO en tu navegador');
 await expect(page.getByTestId('language-choice')).toBeVisible();await expect(page.getByTestId('language-select')).toHaveValue('es-419');
 await page.waitForLoadState('networkidle');expect(p.language).toEqual(['core']);
 expect(await language(page)).toEqual({sets:1,earlyReads:0,changes:[]});
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});
});

// Front PT-REL: Brazilian Portuguese is released. Every route of the production build in a pt-BR browser, with no ?lang=, fetches
// the Portuguese core and exactly its area's modules (no area is empty for a released language), settles once, then extends once
// per area, and logs nothing; the home shows the selector under the release CSP; and on screen Portuguese groups thousands with
// U+202F (user decision of 2026-11-10) where English and Spanish keep the comma.
const ptPlan=planOf('pt-BR');
test.describe('in a Brazilian Portuguese browser (pt-BR)',()=>{
test.use({locale:'pt-BR'});
for(const [hash,name] of ROUTES)test(`Front PT-REL: ${name} (${hash}) in Portuguese fetches the core and its area only, with no error`,async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));
 await page.goto(`/${hash}`);await page.waitForLoadState('networkidle');
 await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang','pt-BR');
 await expect(page.locator('[data-testid=route-error],[data-testid=site-updated],[data-testid=area-failure],[data-testid=language-failure]')).toHaveCount(0);
 await page.waitForTimeout(500);
 expect({console:p.console,errors:p.errors,csp:await violations(page),external:p.external}).toEqual({console:[],errors:[],csp:[],external:[]});
 const area=AREA_OF[hash],modules=modulesOf(area,ptPlan);
 expect(p.language[0]).toBe('core');expect(p.language.slice(1).sort()).toEqual(modules);expect(new Set(p.tags)).toEqual(new Set(['pt-BR']));
 expect(await language(page)).toEqual({sets:area?2:1,earlyReads:0,changes:[]});
});
test('Front PT-REL: a pt-BR browser opens Portuguese without ?lang=, with the selector offering three languages, under the release CSP',async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Comece pelo céu.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.lang)).toBe('pt-BR');
 await expect(page).toHaveTitle('OpenVireo · Práticas de astronomia do CLEA VIREO no seu navegador');
 await expect(page.getByTestId('language-choice')).toBeVisible();await expect(page.getByTestId('language-select')).toHaveValue('pt-BR');
 await expect(page.getByTestId('language-select').locator('option')).toHaveText(['English','Español','Português (Brasil)']);
 await page.waitForLoadState('networkidle');expect(p.language).toEqual(['core']);expect(p.tags).toEqual(['pt-BR']);
 expect(await language(page)).toEqual({sets:1,earlyReads:0,changes:[]});
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});
});
for(const [locale,lang,count] of [['pt-PT','pt-BR','31\u202f147'],['pt','pt-BR','31\u202f147'],['es-MX','es-419','31,147'],['en-US','en','31,147']] as const)test(`Front PT-REL: a ${locale} browser opens ${lang}; the variable-star catalog count reads ${count.replace('\u202f','\\u202f')}`,async({browser})=>{
 const page=await browser.newPage({locale});
 await page.goto('/#variable-stars');await expect(page.locator('html')).toHaveAttribute('lang',lang,{timeout:20_000});
 // The scope's literal count, and the result line's count from the map's formatter (31,147 records match an empty search).
 await expect(page.locator('p:visible',{hasText:'CLEA_VStrs.dat'})).toContainText(`CLEA_VStrs.dat, ${count}`,{timeout:20_000});
 await expect(page.getByTestId('variable-count')).toContainText(count);
 await page.close();
});

test('Front ES1: a ?lang=es-419 preview fetches the Spanish chunk, shows the Spanish shell and settles the language once, before any text',async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.goto('/?lang=es-419#observatory');await expect(page.getByRole('heading',{name:'Empieza por el cielo.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.lang)).toBe('es-419');
 await expect(page).toHaveTitle('OpenVireo · Prácticas de astronomía de CLEA VIREO en tu navegador');
 await expect(page.locator('.investigation-toolbar')).toContainText('Guardar investigación');
 await expect(page.getByTestId('language-choice')).toBeVisible();
 expect(p.language).toEqual(['core']);// Front ES-SPLIT: the language's core module only
 expect(await language(page)).toEqual({sets:1,earlyReads:0,changes:[]});
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

// Front ES2: the production observatory in Spanish: its menus and dialogs (lazy chunks that read vireo() and the maps) open in
// Spanish, and the language is still settled once, before any text.
test('Front ES2: the observatory in a ?lang=es-419 preview opens its Slew and File dialogs in Spanish',async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.goto('/?lang=es-419#observatory');await expect(page.getByRole('heading',{name:'Empieza por el cielo.'})).toBeVisible();
 await page.locator('.sky-card .card-heading > button').click();
 await page.getByTestId('ob-set-coordinates').click();await expect(page.getByTestId('ob-sky-coords').getByRole('heading')).toHaveText('Coordenadas del cielo para mover el telescopio');
 await page.keyboard.press('Escape');
 await page.getByTestId('fi-file-menu').click();await expect(page.getByTestId('print-sky-menu')).toHaveText('Imprimir imagen del cielo...');
 await page.getByTestId('print-sky-menu').click();await page.keyboard.press('Escape');
 await page.waitForLoadState('networkidle');
 expect(await language(page)).toEqual({sets:1,earlyReads:0,changes:[]});
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

// ES2 review 1: with View original (English) on, the production observatory shows VIREO's names in English (menus and the
// Sky Coordinates dialog) while OpenVireo's web text stays Spanish, and the language is still settled once.
test('Front ES2: View original (English) in a ?lang=es-419 preview shows VIREO\'s observatory names in English',async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.addInitScript(()=>localStorage.setItem('openvireo-vireo-originals','1'));
 await page.goto('/?lang=es-419#observatory');await expect(page.getByRole('heading',{name:'Empieza por el cielo.'})).toBeVisible();
 await page.locator('.sky-card .card-heading > button').click();
 await expect(page.getByTestId('ob-set-coordinates')).toHaveText('Set Coordinates…');await expect(page.getByTestId('fi-file-menu')).toHaveText('File');
 await page.getByTestId('ob-set-coordinates').click();await expect(page.getByTestId('ob-sky-coords').getByRole('heading')).toHaveText('Enter Sky Coordinates for Slew');
 await page.keyboard.press('Escape');await expect(page.locator('.sky-card .card-heading > button')).toHaveText('Cerrar la cúpula');
 await page.waitForLoadState('networkidle');
 expect(await language(page)).toEqual({sets:1,earlyReads:0,changes:[]});
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

test('Front ES1: an English load (also ?lang=qps or ?lang=bogus) never fetches a Spanish chunk; since ES-REL it shows the selector',async({page,baseURL})=>{
 const p=await watch(page,baseURL!),fetched:string[]=[];page.on('request',r=>{if(/\/assets\/i18n-[\w-]+-[\w-]+\.js$/.test(r.url()))fetched.push(r.url());});
 // Front ES-REL: the selector is shown on every load (its small chunk and stylesheet, under the release CSP); the pseudo-locale
 // and any other ?lang= value show English.
 for(const query of ['','?lang=qps','?lang=bogus']){
  await page.goto(`/${query}#observatory`);await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();await page.waitForLoadState('networkidle');
  expect(fetched,query).toEqual([]);await expect(page.getByTestId('language-choice')).toBeVisible();await expect(page.getByTestId('language-select')).toHaveValue('en');await expect(page.getByTestId('language-failure')).toHaveCount(0);
  expect(await language(page),query).toEqual({sets:1,earlyReads:0,changes:[]});
 }
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

test('Help › About OpenVireo and privacy shows the privacy notice and the credits',async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.goto('/#object-x');await page.getByTestId('main-help-menu').click();await page.getByTestId('main-help-site-about').click();
 const about=page.getByTestId('about-dialog');await expect(about).toBeVisible();
 const privacy=page.getByTestId('about-privacy');
 for(const s of ['No cookies and no accounts','saved only on your computer','Cloudflare Web Analytics','only the field\'s sky coordinates and radius','only when you click them'])await expect(privacy).toContainText(s);
 const credits=page.getByTestId('about-credits');
 for(const s of ['Project CLEA, Gettysburg College','National Science Foundation and Gettysburg College','ATNF Pulsar Catalogue'])await expect(credits).toContainText(s);
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

test('selecting ObjX_MPC.CMO loads its three tiles, whose assembly has the whole file\'s SHA-256, and builds the list',async({page,baseURL})=>{
 test.setTimeout(180_000);
 const p=await watch(page,baseURL!),requested:string[]=[];
 page.on('request',r=>{if(r.url().includes('/original/orbit/'))requested.push(new URL(r.url()).pathname);});
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 await page.getByRole('combobox',{name:'Orbit file',exact:true}).selectOption('ObjX_MPC.CMO');
 await button(page,'Build the asteroid list for the observatory date').click();
 await expect(page.getByTestId('objectx-list-status')).toContainText('Observable asteroids on',{timeout:150_000});
 expect(requested).toEqual(MPC_TILES.map(t=>t.path));
 // The same bytes, as served: each tile and the concatenation.
 const served=await page.evaluate(async paths=>{
  const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
  const parts=await Promise.all(paths.map(async p=>new Uint8Array(await (await fetch(p)).arrayBuffer())));
  const whole=new Uint8Array(parts.reduce((s,x)=>s+x.byteLength,0));let o=0;for(const x of parts){whole.set(x,o);o+=x.byteLength;}
  return {tiles:await Promise.all(parts.map(async x=>hex(await crypto.subtle.digest('SHA-256',x)))),bytes:whole.byteLength,sha256:hex(await crypto.subtle.digest('SHA-256',whole))};
 },MPC_TILES.map(t=>t.path));
 expect([MPC.bytes,MPC.sha256]).toEqual([30989466,'b41e03f14dcef5a54dea67e156e0e7cf2b654432a85bf6d10611ed8e6d25802e']);
 expect(served).toEqual({tiles:MPC_TILES.map(t=>t.sha256),bytes:MPC.bytes,sha256:MPC.sha256});
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

test('a print preview\'s @page <style> elements pass the policy by their hashes, in both orientations',async({page,baseURL})=>{
 test.setTimeout(90_000);
 const p=await watch(page,baseURL!),id=(t:string)=>page.getByTestId(t);
 await page.goto('/#variable-stars');
 await expect(id('variable-count')).toContainText('31,147 matching records',{timeout:30_000});
 await id('variable-name').fill('del Cep');await button(page,'Open del Cep').click();
 await id('vstar-data-menu').click();await id('vstar-display-curve').click();await expect(id('light-curve-svg')).toBeVisible();
 await id('curve-file-menu').click();await id('curve-print').click();
 const preview=id('variable-print-preview');await expect(preview).toBeVisible();
 await expect(preview.locator('style')).toHaveJSProperty('textContent','@page{size:portrait}');
 await preview.getByLabel('Landscape').check();
 await expect(preview.locator('style')).toHaveJSProperty('textContent','@page{size:landscape}');
 // An applied @page rule is visible through the CSSOM; a blocked <style> element has no sheet.
 expect(await preview.locator('style').evaluate(s=>(s as HTMLStyleElement).sheet?.cssRules.length??0)).toBe(1);
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

/** Opens the dome and points the 0.4 m at RA/Dec (hours, degrees) in the telescope view, tracking on. */
async function pointAt(page:Page,ra:number,dec:number){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(String(ra));await page.locator('#point-dec').fill(String(dec));
 await button(page,'Point to coordinates').click();
 await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
 if(!await button(page,'Turn tracking on').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Turn tracking on').click();
}
// The bundled C5W extract public/camera/vizier/nomad-184.7070+14.7974-r0.25.xml (as tests/ir-camera.spec.ts uses it).
const EXTRACT_RA=184.707/15,EXTRACT_DEC=14.797389;

test('review 1 L6: a static camera exposure from a bundled extract passes the policy and contacts no other host',async({page,baseURL})=>{
 test.setTimeout(120_000);
 const p=await watch(page,baseURL!);await pointAt(page,EXTRACT_RA,EXTRACT_DEC);
 const camera=page.getByTestId('camera-control');
 await expect(camera.getByLabel(/Bundled extracts/)).toBeChecked();
 await camera.getByLabel('Minutes').fill('0');await camera.getByLabel('Seconds').fill('2');
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:90_000});
 await camera.getByText('Exposure details',{exact:true}).click();
 await expect(page.getByTestId('camera-detail-source')).toContainText('Bundled extract nomad-184.7070+14.7974-r0.25 (recorded');
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

test('review 1 M1: a module worker that cannot be loaded ends the exposure with a typed failure, not a hang',async({page,baseURL})=>{
 test.setTimeout(120_000);
 const p=await watch(page,baseURL!);let blocked=0;
 await page.route(/\/assets\/cameraWorker-[\w-]+\.js$/,route=>{blocked++;return route.fulfill({status:404,contentType:'text/html; charset=utf-8',body:'<!doctype html><title>Not found</title>'});});
 await pointAt(page,EXTRACT_RA,EXTRACT_DEC);
 const camera=page.getByTestId('camera-control');
 await camera.getByLabel('Minutes').fill('0');await camera.getByLabel('Seconds').fill('2');
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toContainText('No image was made',{timeout:60_000});
 expect(blocked).toBeGreaterThan(0);
 expect([p.errors,await violations(page),p.external]).toEqual([[],[],[]]);
});

test('review 1 L6: Sound Effects play their verified WAV bytes from blob: URLs under media-src',async({page,baseURL})=>{
 test.setTimeout(60_000);
 const p=await watch(page,baseURL!);
 await page.addInitScript(()=>{const log:string[]=[];(window as unknown as {__played:string[]}).__played=log;
  document.addEventListener('playing',e=>{const a=e.target;if(a instanceof HTMLAudioElement&&a.dataset.sound)log.push(`${a.dataset.sound} ${a.currentSrc.split(':')[0]}`);},true);});
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await page.getByTestId('sound-effects-toggle').check();
 await button(page,'Open dome ↗').click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {__played:string[]}).__played),{timeout:20_000}).toContain('GARDOOR.WAV blob');
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

test('review 1 L6: File › Print Sky Image opens its preview with no policy violation',async({page,baseURL})=>{
 const p=await watch(page,baseURL!),id=(t:string)=>page.getByTestId(t);
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill('12.5');await page.locator('#point-dec').fill('12.4');await button(page,'Point to coordinates').click();
 await id('fi-file-menu').click();await id('print-sky-menu').click();
 await expect(id('print-sky')).toBeVisible();await expect(id('print-sky-picture').locator('svg')).toHaveCount(1);
 await expect(id('print-sky-footer')).toContainText('Right Ascension:  12h 30m 00.0s');
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

test('review 1 M1: after a redeploy, a route whose old chunk is gone shows the update notice; the shell and other work stay',async({page,baseURL})=>{
 test.setTimeout(90_000);
 const p=await watch(page,baseURL!);let blocked=0;
 // As Pages answers a hashed chunk that a new deployment no longer has: its 404 page.
 await page.route(/\/assets\/ObjectXLab-[\w-]+\.js$/,route=>{blocked++;return route.fulfill({status:404,contentType:'text/html; charset=utf-8',body:'<!doctype html><title>Not found</title>'});});
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill('12.5');await page.locator('#point-dec').fill('12.4');// unsaved observatory input
 await page.locator('button[data-route="object-x"]').click();
 const notice=page.getByTestId('site-updated');
 await expect(notice).toBeVisible({timeout:20_000});
 await expect(notice).toContainText('A new version of OpenVireo was published');
 await expect(notice).toContainText('Save your investigation first, then reload the page');
 // A site update is not a bug: no Report a problem link here (only a route error offers one, Front Project Links).
 await expect(notice.getByTestId('recovery-report')).toHaveCount(0);
 expect(blocked).toBeGreaterThan(0);
 // The shell stays: header, navigation and the page bar with the investigation backup (Front HEADER: its h2 is gone).
 await expect(page.locator('button[data-route="observatory"]')).toBeVisible();
 await expect(page.getByRole('region',{name:'Investigation, language and help'}).getByRole('button',{name:'Save investigation',exact:true})).toBeVisible();
 // Save investigation from the notice is the toolbar's own save (a downloaded backup).
 const download=page.waitForEvent('download');await notice.getByTestId('recovery-save').click();
 expect((await download).suggestedFilename()).toMatch(/\.json$/);
 // The other routes kept their state.
 await page.locator('button[data-route="observatory"]').click();
 await expect(page.locator('#point-ra')).toHaveValue('12.5');await expect(page.locator('#point-dec')).toHaveValue('12.4');
 // Reload loads the current version (here the chunk is served again).
 await page.unroute(/\/assets\/ObjectXLab-[\w-]+\.js$/);
 await page.locator('button[data-route="object-x"]').click();await notice.getByTestId('recovery-reload').click();
 await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible({timeout:20_000});
 expect([p.errors,await violations(page),p.external]).toEqual([[],[],[]]);
 expect(p.console.some(m=>/Failed to fetch dynamically imported module/.test(m))).toBe(true);
});

test('Front SEO: the lab pages, sitemap and robots.txt are served with the release headers and pass the policy',async({page,request,baseURL})=>{
 for(const [path,type] of [['/labs/','text/html'],['/labs/hubble/','text/html'],['/labs/labs.css','text/css'],['/sitemap.xml','application/xml'],['/robots.txt','text/plain'],['/og-image.png','image/png'],['/favicon.svg','image/svg+xml']] as const){
  const r=await request.get(path);expect(r.status(),path).toBe(200);expect(r.headers()['content-type'],path).toContain(type);
  expect(r.headers()['content-security-policy'],path).toContain("default-src 'none'");
  if(!/\.(png|svg)$/.test(path))expect(r.headers()['cache-control'],path).toBe('no-cache');
 }
 const p=await watch(page,baseURL!);
 await page.goto('/labs/object-x/');await expect(page.getByRole('heading',{level:1})).toHaveText('Object X: what is it?');
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.querySelector('.button')!).borderRadius)).toBe('8px');// the stylesheet applied
 await page.getByRole('link',{name:'Open the lab'}).click();
 await expect(page.locator('dialog[open]')).toContainText('The quest for Object X',{timeout:20_000});
 expect([p.errors,p.console,await violations(page),p.external]).toEqual([[],[],[],[]]);
});

// Front ES-SEO: the Spanish search pages under /es/ are served like the English ones, every page names its translations
// (hreflang), and a Spanish lab page opens the app in Spanish in an English browser under the release policy. Front PT-SEO: the
// same for the Brazilian Portuguese pages under /pt-br/ (the Spanish test keeps its title), and the home pages' alternates name
// all three languages (Portuguese as pt-BR and pt).
const SEO_SMOKE=[
 {tag:'es-419',prefix:'/es',image:'/og-image-es.png',openLab:'Abrir la práctica',guide:'En busca del Objeto X',title:'Front ES-SEO: the Spanish pages, their preview image and the hreflang links are served with the release headers'},
 {tag:'pt-BR',prefix:'/pt-br',image:'/og-image-pt-br.png',openLab:'Abrir a prática',guide:'Em busca do Objeto X',title:'Front PT-SEO: the Brazilian Portuguese pages, their preview image and the hreflang links are served with the release headers'},
] as const;
for(const L of SEO_SMOKE)test(L.title,async({page,request,baseURL})=>{
 for(const [path,type] of [[`${L.prefix}/`,'text/html'],[`${L.prefix}/labs/`,'text/html'],[`${L.prefix}/labs/pulsars/`,'text/html'],[L.image,'image/png']] as const){
  const r=await request.get(path);expect(r.status(),path).toBe(200);expect(r.headers()['content-type'],path).toContain(type);
  expect(r.headers()['content-security-policy'],path).toContain("default-src 'none'");
  if(type==='text/html')expect(r.headers()['cache-control'],path).toBe('no-cache');
 }
 for(const path of [L.prefix,`${L.prefix}/labs/hubble`]){const r=await request.get(path,{maxRedirects:0});expect(r.status(),path).toBe(308);expect(new URL(r.headers().location,baseURL).pathname,path).toBe(`${path}/`);}
 const alternates=(html:string)=>[...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map(m=>`${m[1]} ${m[2]}`);
 const home=['en https://openvireo.space/','es https://openvireo.space/es/','pt-BR https://openvireo.space/pt-br/','pt https://openvireo.space/pt-br/','x-default https://openvireo.space/'];
 expect(alternates(await (await request.get('/')).text())).toEqual(home);expect(alternates(await (await request.get(`${L.prefix}/`)).text())).toEqual(home);
 const sitemap=await (await request.get('/sitemap.xml')).text();expect(sitemap).toContain(`<loc>https://openvireo.space${L.prefix}/labs/pulsars/</loc>`);
 const p=await watch(page,baseURL!);
 await page.goto(`${L.prefix}/labs/object-x/`);await expect(page.locator('html')).toHaveAttribute('lang',L.tag);
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.querySelector('.button')!).borderRadius)).toBe('8px');
 await page.getByRole('link',{name:L.openLab}).click();
 await expect(page.locator('dialog[open]')).toContainText(L.guide,{timeout:20_000});
 await expect(page.locator('html')).toHaveAttribute('lang',L.tag);
 expect([p.errors,p.console,await violations(page),p.external]).toEqual([[],[],[],[]]);
 expect(p.language[0]).toBe('core');expect(new Set(p.tags)).toEqual(new Set([L.tag]));
 const held=await language(page);expect([held.earlyReads,held.changes]).toEqual([0,[]]);
});

// Front ES-HELP: a translated help file is its own chunk, fetched only when the viewer opens it, under the release policy; "Ver
// original (inglés)" then fetches VIREO's bundled file. Front PT-HELP: the same for the Brazilian Portuguese help set in its
// ?lang=pt-BR preview (both sets have chunks of the same names, so the fetched chunks' own language is checked too).
const HELP_SMOKE=[
 {tag:'es-419',title:'Front ES-HELP: a ?lang=es-419 help viewer fetches only its translated help chunks and switches to the original',label:'Traducción: adaptación web de OpenVireo (no es de CLEA)',text:'Para cargar un espectro'},
 {tag:'pt-BR',title:'Front PT-HELP: a ?lang=pt-BR help viewer fetches only its translated help chunks and switches to the original',label:'Tradução: adaptação web do OpenVireo (não é do CLEA)',text:'Para carregar um espectro'},
 // Front FR-HELP: the French help set in its ?lang=fr preview (U+202F before the colon, as the fixer writes it).
 {tag:'fr',title:'Front FR-HELP: a ?lang=fr help viewer fetches only its translated help chunks and switches to the original',label:'Traduction : adaptation web d’OpenVireo (ce n’est pas un texte du CLEA)',text:'Pour charger un spectre'},
] as const;
for(const h of HELP_SMOKE)test(h.title,async({page,baseURL})=>{
 const p=await watch(page,baseURL!),help:string[]=[],languages:Promise<string>[]=[];
 page.on('response',r=>{const m=/\/assets\/([A-Z]+\.(?:LST|TXT|OBS|PLS|LNL))-[\w-]+\.js$/.exec(r.url());if(m){help.push(m[1]);languages.push(r.text().then(t=>/^var \w+=`([\w-]+)`/.exec(t)?.[1]??'?'));}});
 await page.goto(`/?lang=${h.tag}#classification`);
 await page.getByTestId('class-help-open').click({timeout:20_000});
 await expect(page.getByTestId('class-help-topics-view-label')).toHaveText(h.label);
 expect(help).toEqual(['CLASSHLP.LST']);
 await page.getByTestId('class-help-topic-list').getByRole('option').nth(1).dblclick();
 await expect(page.getByTestId('class-help-topic-text')).toContainText(h.text);
 expect(help).toEqual(['CLASSHLP.LST','CLASSHLP.TXT']);
 expect(await Promise.all(languages)).toEqual([h.tag,h.tag]);
 await page.getByTestId('class-help-view-switch').click();
 await expect(page.getByTestId('class-help-topic-text')).toHaveAttribute('lang','en');
 expect([p.console,p.errors,await violations(page),p.external]).toEqual([[],[],[],[]]);
});
