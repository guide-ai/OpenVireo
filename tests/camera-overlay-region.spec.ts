import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

// Front C6: the CCD overlay (form+0x412) from the loaded telescope field and the region record [0x5b5b30] as the catalogue bounds.
// Every VizieR request is answered with the recorded response (tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml, CDS 2026-10-27)
// with its rows moved onto the pointing; nothing is sent anywhere.
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;
const recorded=readFile(new URL('./fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const camera=(p:Page)=>p.getByTestId('camera-control');
/** NGC 5924, LSS Field 8: a galaxy field. */
const RA=15.365694444444445,DEC=31.221944444444443;

async function moved(ra:number,dec:number){
 const dRa=ra*15-56.75,dDec=dec-24.12;
 return (await recorded).toString('utf8').replace(/<TD>(0?56\.7\d+)<\/TD>/g,(_,v:string)=>`<TD>${(Number(v)+dRa).toFixed(7)}</TD>`).replace(/<TD>\+(24\.1\d+)<\/TD>/g,(_,v:string)=>`<TD>+${(Number(v)+dDec).toFixed(7)}</TD>`);
}
async function pointAt(page:Page,ra:number,dec:number){
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(String(ra));await page.locator('#point-dec').fill(String(dec));
 await button(page,'Point to coordinates').click();
}
async function view(page:Page,name:'Telescope · 15′'|'Finder · 2.5°'){await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name,exact:true}).click();}
async function ready(page:Page){
 await page.route(CDS,async route=>route.fulfill({status:200,contentType:'text/xml',body:await moved(RA,DEC)}));
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();await pointAt(page,RA,DEC);await view(page,'Telescope · 15′');
 if(!await button(page,'Turn tracking on').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Turn tracking on').click();
 await camera(page).getByLabel(/Ask VizieR live/).check();
 await camera(page).getByLabel('Minutes').fill('0');await camera(page).getByLabel('Seconds').fill('1');
}
async function expose(page:Page){
 await button(page,'Start exposure').click();await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:90_000});
 const details=camera(page).getByText('Exposure details',{exact:true});
 if(!await page.getByTestId('camera-detail-rows').isVisible())await details.click();
}

test('at a galaxy field the CCD adds VIREO\'s galaxy overlay (with its white last row and column) and selects within the loaded field',async({page})=>{
 test.setTimeout(180_000);
 await ready(page);await expose(page);
 const overlay=page.getByTestId('camera-detail-overlay');
 await expect(overlay).toHaveAttribute('data-status','run');
 const draws=Number((await overlay.textContent())!.match(/(\d+) pixels/)![1]);
 // The white last row and column alone give 2047 draws; the galaxies add more.
 expect(draws).toBeGreaterThan(2047);
 await expect(page.getByTestId('camera-detail-region')).toContainText('Dec 30.8469° to 31.5969°');
});

test('a telescope drifted inside the loaded field keeps its region; past the camera window the overlay is typed; a view change reloads',async({page})=>{
 test.setTimeout(240_000);
 await ready(page);
 // 0.24° north: still inside the 312-pixel cache (no reload), but the 380-pixel camera window leaves the 936² field.
 await pointAt(page,RA,DEC+.24);
 if(!await button(page,'Turn tracking on').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 if(await button(page,'Turn tracking on').isVisible())await button(page,'Turn tracking on').click();
 await expose(page);
 await expect(page.getByTestId('camera-detail-overlay')).toHaveAttribute('data-status','outside');
 await expect(page.getByTestId('camera-detail-region')).toContainText('Dec 30.8469° to 31.5969°');
 // Finder and back: VIREO's render reloads on a view change (scale +0x674), so the region is centred on the pointing again.
 await view(page,'Finder · 2.5°');await view(page,'Telescope · 15′');
 if(await button(page,'Turn tracking on').isVisible())await button(page,'Turn tracking on').click();
 await expose(page);
 await expect(page.getByTestId('camera-detail-region')).toContainText('Dec 31.0869° to 31.8369°');
 await expect(page.getByTestId('camera-detail-overlay')).not.toHaveAttribute('data-status','outside');
});

test('the IR camera has no overlay (VIREO: no overlay branch in TIRCam)',async({page})=>{
 test.setTimeout(180_000);
 await ready(page);
 await camera(page).getByLabel('IR camera (J, H, K)').check();
 await expose(page);
 await expect(page.getByTestId('camera-detail-overlay')).toHaveCount(0);
 await expect(page.getByTestId('camera-detail-region')).toBeVisible();
});
