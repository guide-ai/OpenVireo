import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Camera -> Object X wiring on the test-only host tests/fixtures/object-x-camera-host.ts: the real CameraControl calls
// extraSources(jd, seconds) with the values captured at Start, and a pair the composer skips reaches the Object X image list
// through onImage with its typed reason. VizieR traffic is the recorded response (CDS, 2026-10-27).
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;// every VizieR mirror the camera may ask
const recorded=readFile(new URL('./fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));

test('the camera passes (jd, seconds) and a skipped moving pair shows in the Object X images with its reason',async({page})=>{
 const body=await recorded;await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await page.goto('/');await expect(page.locator('h1').first()).toBeVisible();
 // The app's own observatory camera shares the radio-group name; detach the app so only the host's camera is in the page.
 await page.evaluate(()=>document.getElementById('root')?.remove());
 await page.evaluate(`import(${JSON.stringify('/tests/fixtures/object-x-camera-host.ts')}).then(m=>{m.mountObjectXCameraHost();})`);
 const host=page.getByTestId('objectx-camera-host'),camera=host.getByTestId('camera-control');
 await camera.getByLabel(/Ask VizieR live/).check();await camera.getByLabel('Minutes').fill('0');await camera.getByLabel('Seconds').fill('2');
 await camera.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(camera.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:30_000});
 expect(JSON.parse(await host.getByTestId('host-extra-calls').textContent()??'[]')).toEqual([2454983.5+4/24,2]);
 await camera.getByText('Exposure details').click();
 await expect(camera.getByTestId('camera-detail-skipped')).toContainText('far outside the field');
 const images=host.getByTestId('objectx-images').locator('li');await expect(images).toHaveCount(1);
 await expect(host.getByTestId('objectx-image-skipped-0')).toHaveText('Not drawn: 1 far outside the detector.');
});
test('an IR exposure draws through the same hook but adds nothing to the Object X session',async({page})=>{
 const jhk=await readFile(new URL('./fixtures/vizier/authored-nomad-jhk-control.xml',import.meta.url));
 await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body:jhk}));
 await page.goto('/');await expect(page.locator('h1').first()).toBeVisible();
 await page.evaluate(()=>document.getElementById('root')?.remove());
 await page.evaluate(`import(${JSON.stringify('/tests/fixtures/object-x-camera-host.ts')}).then(m=>{m.mountObjectXCameraHost();})`);
 const host=page.getByTestId('objectx-camera-host'),camera=host.getByTestId('camera-control');
 await camera.getByLabel('IR camera (J, H, K)').check();
 await camera.getByLabel(/Ask VizieR live/).check();await camera.getByLabel('Minutes').fill('0');await camera.getByLabel('Seconds').fill('2');
 await camera.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(camera.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:30_000});
 expect(JSON.parse(await host.getByTestId('host-extra-calls').textContent()??'[]')).toEqual([2454983.5+4/24,2]);
 await expect(host.getByTestId('host-objectx-snapshot')).toHaveText('{"exposures":0,"images":0,"listJd":null}');
 await expect(host.getByTestId('objectx-images').locator('li')).toHaveCount(0);
});
