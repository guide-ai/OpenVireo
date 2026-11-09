import {test,expect,type Page,type Request,type Route} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {VIZIER_HOSTS,VIZIER_POLICY} from '../src/core/vizierNomad';

// Front SC6 (plan front-i18n-scripts.md §11.4 item 4; checklist docs/CHINA-CHECKLIST.md): the site must fail soft when the only
// hosts outside its own origin hang or fail, as they may from mainland China. Those hosts are the Web Analytics beacon script
// (static.cloudflareinsights.com), the beacon's report (cloudflareinsights.com) and the live camera query's VizieR mirrors.
// Every off-origin request is intercepted here (a catch-all aborts any host not named below); nothing leaves the machine.
//
// The beacon is not in the repository: Cloudflare Pages injects it at the edge when Web Analytics is on (docs/DEPLOY.md §7). On
// 2026-11-09 the live page's script tags were, in order: an inline script, the ld+json block, the app's
// `<script type="module" crossorigin src="/assets/index-….js">` and then
// `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='…'>`. This spec injects the same
// deferred tag (with a dummy token) just before </body> of the dev server's page, right after its module script
// (/src/main.tsx), so the beacon again comes after the app's module script.

const BEACON_SRC='https://static.cloudflareinsights.com/beacon.min.js';
const BEACON_TAG=`<script defer src='${BEACON_SRC}' data-cf-beacon='{"token": "sc6-test-not-a-token"}'></script>`;
const BEACON=/^https:\/\/static\.cloudflareinsights\.com\//,REPORT=/^https:\/\/cloudflareinsights\.com\//;
const VIZIER=new RegExp(`^https://(${Object.values(VIZIER_HOSTS).map(h=>h.replace(/\./g,'\\.')).join('|')})/`);
/** An authored stand-in for the beacon (not Cloudflare's script): it only posts to the report host, as the real beacon does. */
const BEACON_STUB="fetch('https://cloudflareinsights.com/cdn-cgi/rum',{method:'POST',body:'{}',keepalive:true}).catch(function(){});";
/** One of the bundled camera extracts (data/camera/extracts.json): nomad-184.7070+14.7974-r0.25. */
const EXTRACT='nomad-184.7070+14.7974-r0.25',EXTRACT_RA_HOURS='12.3138',EXTRACT_DEC='14.797389';

/** The live query's per-mirror timeout, read from src/io/cameraCatalog.ts (that module imports JSON without an import attribute,
 * which Node's loader refuses here). */
const CAMERA_CATALOG_TIMEOUT_MS=Number(/export const CAMERA_CATALOG_TIMEOUT_MS=([\d_]+);/.exec(readFileSync(new URL('../src/io/cameraCatalog.ts',import.meta.url),'utf8'))?.[1].replace(/_/g,''));
if(!(CAMERA_CATALOG_TIMEOUT_MS>0))throw new Error('CAMERA_CATALOG_TIMEOUT_MS not found in src/io/cameraCatalog.ts');

const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const camera=(p:Page)=>p.getByTestId('camera-control');
const status=(p:Page)=>p.getByTestId('camera-status');

/** Serves the dev page with the beacon tag Pages adds, and fails the test on any uncaught page error. Call it before any other
 * route: its catch-all is registered first, so the routes added later for the named hosts take priority over it. */
async function asPagesServesIt(page:Page,baseURL:string){
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const origin=new URL(baseURL).origin;
 await page.route(url=>url.origin!==origin&&!/^(data|blob|about):$/.test(url.protocol),route=>route.abort('blockedbyclient'));
 await page.route(url=>url.origin===origin&&url.pathname==='/',async route=>{
  const response=await route.fetch(),html=await response.text();
  expect(html).toContain('</body>');
  await route.fulfill({response,body:html.replace(/<\/body>(?![\s\S]*<\/body>)/,`${BEACON_TAG}</body>`)});
 });
 return errors;
}
/** A host that never answers. The requests stay pending until the page aborts them or closes. */
async function hang(page:Page,pattern:RegExp){
 const seen:Request[]=[],settled=new Set<Request>();
 page.on('requestfinished',r=>settled.add(r));page.on('requestfailed',r=>settled.add(r));
 await page.route(pattern,(route:Route)=>{seen.push(route.request());/* never answered */});
 return {seen,pending:()=>seen.filter(r=>!settled.has(r))};
}
async function refuse(page:Page,pattern:RegExp){
 const seen:Request[]=[];await page.route(pattern,route=>{seen.push(route.request());return route.abort('connectionrefused');});return seen;
}
/** Every request that leaves the local origin (data: and blob: URLs stay in the page). */
function offOrigin(page:Page,baseURL:string){
 const origin=new URL(baseURL).origin,urls:string[]=[];
 page.on('request',r=>{const u=r.url();if(!/^(data|blob):/.test(u)&&new URL(u).origin!==origin)urls.push(u);});return urls;
}
/** The observatory pointed at the bundled extract's field in the telescope view, tracking. */
async function trackedExtractField(page:Page){
 await page.goto('/#observatory',{waitUntil:'commit'});
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:30_000});
 await button(page,'Open dome ↗').click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(EXTRACT_RA_HOURS);await page.locator('#point-dec').fill(EXTRACT_DEC);
 await button(page,'Point to coordinates').click();
 await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
 if(!await button(page,'Turn tracking on').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Turn tracking on').click();
 await expect(button(page,'Start exposure')).toBeEnabled();
 await camera(page).getByLabel('Minutes').fill('0');await camera(page).getByLabel('Seconds').fill('1');
}

test('a hanging beacon holds neither the home page nor an exercise: both render while it is still pending',async({page,baseURL})=>{
 test.setTimeout(90_000);
 const errors=await asPagesServesIt(page,baseURL!),beacon=await hang(page,BEACON),report=await hang(page,REPORT);
 const pages=[
  ['/',page.getByRole('heading',{name:'Start with the sky.'})],
  ['/#classification',page.getByRole('status').filter({hasText:'Original spectra verified.'})],
 ] as const;
 for(const [path,ready] of pages){
  // A fresh document for each path (a hash-only goto would stay in the same document).
  await page.goto('about:blank');const before=beacon.seen.length;
  // waitUntil 'commit': the browser's load event waits for the deferred beacon, so a default goto would wait with it.
  await page.goto(path,{waitUntil:'commit'});
  await expect(ready).toBeVisible({timeout:30_000});
  // The beacon was asked for and has still not answered, so the render above did not wait for it.
  expect(beacon.seen.length,path).toBe(before+1);
  expect(beacon.pending().filter(r=>beacon.seen.indexOf(r)>=before).map(r=>r.url()),path).toEqual([BEACON_SRC]);
  // Finding, pinned: the pending deferred script holds DOMContentLoaded (and so the load event), although the app is already
  // usable; a phone's loading bar may keep turning until the beacon request fails. This pins the browser's behaviour for a
  // pending deferred script, not anything about Cloudflare's injection.
  expect(await page.evaluate(()=>(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).domContentLoadedEventStart),path).toBe(0);
 }
 expect(report.seen).toHaveLength(0);
 expect(errors).toEqual([]);
});

for(const variant of ['beacon refused','report refused','report hangs'] as const){
 test(`${variant}: the home page and an exercise load with no uncaught error`,async({page,baseURL})=>{
  test.setTimeout(90_000);
  const errors=await asPagesServesIt(page,baseURL!),off=offOrigin(page,baseURL!);
  const beacon:Request[]=[];
  if(variant==='beacon refused')await page.route(BEACON,route=>{beacon.push(route.request());return route.abort('connectionrefused');});
  else await page.route(BEACON,route=>{beacon.push(route.request());return route.fulfill({status:200,contentType:'text/javascript',body:BEACON_STUB});});
  const report=variant==='report hangs'?(await hang(page,REPORT)).seen:await refuse(page,REPORT);
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:30_000});
  await expect.poll(()=>beacon.length).toBe(1);
  if(variant!=='beacon refused')await expect.poll(()=>report.length).toBe(1);
  await page.goto('about:blank');await page.goto('/#classification');
  await expect(page.getByRole('status').filter({hasText:'Original spectra verified.'})).toBeVisible({timeout:30_000});
  await expect.poll(()=>beacon.length).toBe(2);
  // The page itself contacts no other host.
  expect(off.filter(u=>!BEACON.test(u)&&!REPORT.test(u))).toEqual([]);
  expect(errors).toEqual([]);
 });
}

test('with every outside host hanging, a bundled camera field still makes an image and asks none of them',async({page,baseURL})=>{
 test.setTimeout(180_000);
 const errors=await asPagesServesIt(page,baseURL!),off=offOrigin(page,baseURL!);
 await hang(page,BEACON);await hang(page,REPORT);const vizier=await hang(page,VIZIER);
 await trackedExtractField(page);
 await expect(camera(page).getByLabel(/Bundled extracts/)).toBeChecked();
 await expect(page.getByTestId('camera-static-hint')).toHaveCount(0);
 await button(page,'Start exposure').click();
 await expect(status(page)).toHaveText('Image ready.',{timeout:120_000});
 await expect(page.getByTestId('camera-canvas')).toBeVisible();
 await camera(page).getByText('Exposure details',{exact:true}).click();
 await expect(page.getByTestId('camera-detail-source')).toContainText(`Bundled extract ${EXTRACT} (recorded`);
 expect(vizier.seen).toHaveLength(0);
 expect(off.filter(u=>!BEACON.test(u))).toEqual([]);
 expect(errors).toEqual([]);
});

test('live query, every mirror refused: the typed "could not be reached" message, after trying each mirror once',async({page,baseURL})=>{
 test.setTimeout(120_000);
 const errors=await asPagesServesIt(page,baseURL!);await hang(page,BEACON);
 const vizier=await refuse(page,VIZIER);
 await trackedExtractField(page);
 await camera(page).getByLabel(/Ask VizieR live/).check();
 const started=Date.now();await button(page,'Start exposure').click();
 await expect(status(page)).toHaveText('No image was made. No VizieR mirror could be reached. The camera does not invent a star field.',{timeout:30_000});
 // A refused connection is reported as soon as the exposure ends, not after the 30 s request timeout.
 expect(Date.now()-started).toBeLessThan(10_000);
 expect(vizier.map(r=>new URL(r.url()).hostname)).toEqual([...VIZIER_POLICY.liveHosts]);
 await expect(camera(page)).toHaveAttribute('data-phase','idle');
 await expect(button(page,'Start exposure')).toBeEnabled();
 await expect(page.getByTestId('camera-canvas')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('live query, every mirror hanging: each mirror gets its 30 s, then the typed timeout message; the page stays usable meanwhile',async({page,baseURL})=>{
 test.setTimeout(120_000);
 // The page's clock is installed (it runs normally) so the 30 s request timeouts can be skipped with fastForward.
 await page.clock.install();
 const errors=await asPagesServesIt(page,baseURL!);await hang(page,BEACON);
 const vizier=await hang(page,VIZIER),hosts=()=>vizier.seen.map(r=>new URL(r.url()).hostname);
 const [first,second]=VIZIER_POLICY.liveHosts;
 await trackedExtractField(page);
 await camera(page).getByLabel(/Ask VizieR live/).check();
 const now=()=>page.evaluate(()=>Date.now());
 await button(page,'Start exposure').click();
 await expect.poll(hosts).toEqual([first]);const asked=await now();
 await expect(status(page)).toHaveText('Waiting for the catalog…',{timeout:30_000});
 expect(hosts()).toEqual([first]);
 // About 5 s short of the first mirror's timeout (page time): still waiting on it, and the page answers. Stop is offered throughout.
 await page.clock.fastForward(asked+CAMERA_CATALOG_TIMEOUT_MS-5_000-await now());
 await expect(status(page)).toHaveText('Waiting for the catalog…');expect(hosts()).toEqual([first]);
 await expect(button(page,'Stop')).toBeEnabled();
 const clock=page.getByText('Observatory clock & spectral tracking',{exact:true}),panel=page.locator('details').filter({has:clock});
 const wasOpen=await panel.evaluate(d=>(d as HTMLDetailsElement).open);await clock.click();
 await expect.poll(()=>panel.evaluate(d=>(d as HTMLDetailsElement).open)).toBe(!wasOpen);
 // The first mirror times out and the query falls back to the second one.
 await page.clock.fastForward(6_000);
 await expect.poll(hosts).toEqual([first,second]);
 await expect(status(page)).toHaveText('Waiting for the catalog…');
 // The second mirror times out too: a typed, readable failure, and the camera is free again.
 await page.clock.fastForward(CAMERA_CATALOG_TIMEOUT_MS+2_000);
 await expect(status(page)).toHaveText('No image was made. No VizieR mirror answered in time. The camera does not invent a star field.',{timeout:15_000});
 await expect(camera(page)).toHaveAttribute('data-phase','idle');
 await expect(button(page,'Start exposure')).toBeEnabled();
 await expect(page.getByTestId('camera-canvas')).toHaveCount(0);
 expect(vizier.pending()).toEqual([]);
 expect(hosts()).toEqual([first,second]);
 expect(errors).toEqual([]);
});
