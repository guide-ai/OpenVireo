import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Review 3 L2: before camera extracts ship, the v28 replay of a static-catalogue exposure (src/io/objectXImage.ts) must give
// the same FITS bytes as the camera's own static path. The dev server's extract index is routed to ONE SYNTHETIC extract over
// the recorded VizieR response (tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml, CDS 2026-10-27); it is test data, not a
// bundled extract. The real CameraControl (Worker composer) takes and saves the image; the page then replays its recipe.
const xmlPromise=readFile(new URL('./fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;// every VizieR mirror the camera may ask

test('replayStaticExposure gives the camera static path\'s FITS bytes for the same recipe',async({page})=>{
 const xml=await xmlPromise,sha=createHash('sha256').update(xml).digest('hex');
 const extract={id:'synthetic-pleiades-test',catalog:'I/297',raDegrees:56.75,decDegrees:24.12,radiusDegrees:1,file:'synthetic-pleiades-test.xml',sha256:sha,bytes:xml.length,recordedAt:'2026-10-27',request:'https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.75&DEC=24.12&SR=1',host:'vizier.cds.unistra.fr'};
 await page.route('**/data/camera/extracts.json?import*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`export const extracts=${JSON.stringify([extract])};export default {about:'synthetic test index',extracts};`}));
 await page.route('**/camera/vizier/synthetic-pleiades-test.xml',route=>route.fulfill({status:200,contentType:'text/xml',body:xml}));
 const cds:string[]=[];page.on('request',r=>{if(CDS.test(r.url()))cds.push(r.url());});
 await page.goto('/');await expect(page.locator('h1').first()).toBeVisible();
 await page.evaluate(()=>document.getElementById('root')?.remove());
 await page.evaluate(`import(${JSON.stringify('/tests/fixtures/object-x-static-host.ts')}).then(m=>{m.mountObjectXStaticHost();})`);
 const camera=page.getByTestId('objectx-static-host').getByTestId('camera-control');
 await camera.getByLabel('Minutes').fill('0');await camera.getByLabel('Seconds').fill('5');
 await camera.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(camera.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:60_000});
 const download=page.waitForEvent('download');await camera.getByRole('button',{name:'Save image (FITS)'}).click();
 const saved=await readFile((await (await download).path())!);
 const image=JSON.parse((await page.getByTestId('static-host-image').textContent())!);
 expect(image.source.mode).toBe('static');expect(image.source.extractId).toBe('synthetic-pleiades-test');
 const replay=await page.evaluate(`(async()=>{
  const m=await import('/src/io/objectXImage.ts');const i=${JSON.stringify(image)};
  const r=await m.replayStaticExposure(i.recipe,i.jd,[]);if(!r.ok)return {ok:false,reason:r.reason};
  return {ok:true,bytes:Array.from(r.fits),catalogSha256:r.catalogSha256,extractId:r.extractId};
 })()`) as {ok:boolean;reason?:string;bytes:number[];catalogSha256:string;extractId:string};
 expect(replay.ok,replay.reason).toBe(true);
 expect(replay.catalogSha256).toBe(sha);expect(replay.extractId).toBe('synthetic-pleiades-test');
 const replayed=Buffer.from(replay.bytes);
 expect(replayed.length).toBe(saved.length);
 expect(createHash('sha256').update(replayed).digest('hex')).toBe(createHash('sha256').update(saved).digest('hex'));
 expect(cds).toEqual([]);
});
