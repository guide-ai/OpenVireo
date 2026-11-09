// Front REL1 [W]: smoke test of the production build (dist/) served by `wrangler pages dev` on loopback, which applies
// dist/_headers as Cloudflare Pages does. Run with playwright.pages.config.ts (docs/DEPLOY.md, "Prueba local"); the normal
// suite does not pick up *.pages.ts. No request leaves the machine: every non-loopback request is aborted, and the VizieR
// requests are answered with the recorded response tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml (CDS, 2026-10-27).
import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {VIZIER_POLICY} from '../../src/core/vizierNomad';

const VIZIER=/^https:\/\/vizier\.(?:idia\.ac\.za|cds\.unistra\.fr|cfa\.harvard\.edu)\//;
// The tiles and the whole file, as docs/LOCAL-RESOURCES.json records them (src/io/bundledOrbitFile.test.ts checks the loader's copy).
const manifest=JSON.parse(await readFile(new URL('../../docs/LOCAL-RESOURCES.json',import.meta.url),'utf8')) as {files:{path:string;sha256:string}[];assembled:{name:string;bytes:number;sha256:string;tiles:string[]}[]};
const MPC=manifest.assembled.find(a=>a.name==='ObjX_MPC.CMO')!;
const MPC_TILES=MPC.tiles.map(t=>({path:t.replace(/^public/,''),sha256:manifest.files.find(f=>f.path===t)!.sha256}));
const recorded=readFile(new URL('../fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});

type Problems={console:string[];errors:string[];csp:string[];external:string[]};
/** Records console errors and warnings, page errors and CSP violations, and aborts every request that is not to this server. */
async function watch(page:Page,base:string):Promise<Problems>{
 const p:Problems={console:[],errors:[],csp:[],external:[]};
 await page.context().route(url=>!url.href.startsWith(base),route=>{p.external.push(route.request().url());return route.abort('blockedbyclient');});
 await page.addInitScript(()=>{
  const w=window as unknown as {__csp:string[]};w.__csp=[];
  document.addEventListener('securitypolicyviolation',e=>{w.__csp.push(`${e.effectiveDirective} ${e.blockedURI}`);});
  // Front ES0 review 1: src/boot.ts must settle the UI language before any text is built. Count the writes of the active-language
  // holder (src/i18n/active.ts) and the reads that found it empty; a read before boot would show here and as boot's console error.
  const key=Symbol.for('openvireo.i18n.active'),l=window as unknown as {__languageSets:number;__languageEarlyReads:number};let held:unknown;l.__languageSets=0;l.__languageEarlyReads=0;
  Object.defineProperty(globalThis,key,{configurable:true,get(){if(held===undefined)l.__languageEarlyReads++;return held;},set(value){l.__languageSets++;held=value;}});
 });
 page.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&/Content.Security.Policy|Permissions.Policy|Refused to/i.test(m.text())))p.console.push(`${m.type()}: ${m.text()}`);});
 page.on('pageerror',e=>p.errors.push(e.message));
 return p;
}
const violations=(page:Page)=>page.evaluate(()=>(window as unknown as {__csp:string[]}).__csp);
/** How often the active-language holder was set and read while still empty (see watch). Boot sets it once and nothing reads it first. */
const language=(page:Page)=>page.evaluate(()=>{const l=window as unknown as {__languageSets:number;__languageEarlyReads:number};return {sets:l.__languageSets,earlyReads:l.__languageEarlyReads};});

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
 expect(await whole.text()).toContain('This address is not part of OpenVireo.');
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
 ['#observatory','Observatory'],['#spectrum','Hubble analysis (spectrum measuring)'],['#galaxy-exposure','Hubble galaxy exposure'],
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
 expect(await language(page)).toEqual({sets:1,earlyReads:0});
});

test('Front ES0: the language is settled once, by boot, before any text, also for a ?lang=es-419 preview (English in ES0)',async({page,baseURL})=>{
 const p=await watch(page,baseURL!);
 await page.goto('/?lang=es-419#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.lang)).toBe('en');
 expect(await language(page)).toEqual({sets:1,earlyReads:0});
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
 // The shell stays: header, navigation and the investigation toolbar.
 await expect(page.locator('button[data-route="observatory"]')).toBeVisible();
 await expect(page.getByRole('heading',{name:'One investigation backup'})).toBeVisible();
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
