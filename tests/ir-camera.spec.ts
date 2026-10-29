import {test,expect,type Page,type Request} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// C6 IR camera. Every VizieR request is intercepted with the AUTHORED J/H/K table
// tests/fixtures/vizier/authored-nomad-jhk-control.xml (not VizieR output, not an observation).
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;// every VizieR mirror the camera may ask
const jhk=readFile(new URL('./fixtures/vizier/authored-nomad-jhk-control.xml',import.meta.url));
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const camera=(p:Page)=>p.getByTestId('camera-control');
function watch(page:Page){const seen:Request[]=[];page.on('request',r=>{if(CDS.test(r.url()))seen.push(r);});return seen;}
async function trackedField(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();await page.getByLabel('Target',{exact:true}).selectOption('N0000.DAT@14428');
 await button(page,'Point telescope ↗').click();await button(page,'Switch to telescope view ↗').click();
 if(!await button(page,'Start observatory clock').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Start observatory clock').click();await button(page,'Turn tracking on').click();
 await expect(button(page,'Start exposure')).toBeEnabled();
}
const options=(p:Page,label:string)=>camera(p).getByLabel(label).locator('option').allTextContents();

test('the IR camera offers J/H/K and gains 1/2/4/8, credits 2MASS, and static mode contacts no host',async({page})=>{
 const seen=watch(page);await trackedField(page);
 await expect(camera(page).getByRole('heading',{name:'CCD camera'})).toBeVisible();
 await expect(camera(page).getByTestId('camera-ir-citation')).toHaveCount(0);
 await camera(page).getByLabel('IR camera (J, H, K)').check();
 await expect(camera(page).getByRole('heading',{name:'IR camera'})).toBeVisible();
 expect(await options(page,'Filter')).toEqual(['J','H','K']);
 expect(await options(page,'Gain (e⁻/ADU)')).toEqual(['1','2','4','8']);
 await expect(camera(page).getByTestId('camera-ir-citation')).toContainText('Two Micron All Sky Survey (2MASS; Skrutskie et al. 2006)');
 await expect(camera(page).getByTestId('camera-ir-adaptation')).toContainText('same 60-minute limit as the CCD');
 // The unrecovered IR exposure limit follows the CCD web bound.
 await camera(page).getByLabel('Minutes').fill('60');await camera(page).getByLabel('Seconds').fill('1');
 await expect(camera(page).getByRole('alert')).toContainText('between 1 s and 60 min');await expect(button(page,'Start exposure')).toBeDisabled();
 await camera(page).getByLabel('Minutes').fill('0');await camera(page).getByLabel('Seconds').fill('5');
 await expect(page.getByTestId('camera-static-hint')).toBeVisible();
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toContainText('There is no bundled extract for this field',{timeout:2_000});
 expect(seen).toHaveLength(0);
 // Back to CCD: the CCD filters and gains return.
 await camera(page).getByLabel('CCD camera',{exact:true}).check();
 expect(await options(page,'Filter')).toEqual(['NF (no filter)','B','V','R','I']);expect(await options(page,'Gain (e⁻/ADU)')).toEqual(['1','2','5']);
});
test('a live K exposure asks NOMAD with the IR radius, makes a 512² image and saves an IR FITS file',async({page})=>{
 const seen=watch(page);await trackedField(page);const body=await jhk;
 await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await camera(page).getByLabel('IR camera (J, H, K)').check();
 await camera(page).getByLabel(/Ask VizieR live/).check();
 await camera(page).getByLabel('Filter').selectOption({label:'K'});await camera(page).getByLabel('Gain (e⁻/ADU)').selectOption('8');
 await camera(page).getByLabel('Minutes').fill('0');await camera(page).getByLabel('Seconds').fill('1');
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:15_000});
 expect(seen).toHaveLength(1);
 const url=new URL(seen[0].url());
 expect(url.origin+url.pathname).toBe('https://vizier.idia.ac.za/viz-bin/conesearch/I/297/out');
 expect([...url.searchParams.keys()]).toEqual(['RA','DEC','SR']);expect(url.searchParams.get('SR')).toBe('0.19');
 await expect(page.getByTestId('camera-canvas')).toHaveAttribute('aria-label','IR image, filter K, 1 s.');
 expect(await page.getByTestId('camera-canvas').evaluate(c=>[(c as HTMLCanvasElement).width,(c as HTMLCanvasElement).height])).toEqual([512,512]);
 await camera(page).getByText('Exposure details').click();
 await expect(page.getByTestId('camera-detail-catalog')).toHaveText('NOMAD');
 // Four rows received, three with a K magnitude.
 await expect(page.getByTestId('camera-detail-rows')).toContainText('4 / 3 /');
 const download=page.waitForEvent('download');await button(page,'Save image (FITS)').click();const d=await download;
 expect(d.suggestedFilename()).toMatch(/^OpenVireo-IR-\d{8}-\d{6}-K\.fit$/);
 const bytes=await readFile((await d.path())!);expect(bytes.length%2880).toBe(0);
 const header=bytes.subarray(0,2880*2).toString('latin1');
 expect(header).toContain("INSTRUME= 'IR      '");expect(header).toContain("FILTER  = 'K       '");expect(header).toContain('NAXIS1  =                  512');
 expect(header).toContain('J/H/K: 2MASS via NOMAD (Skrutskie et al. 2006, AJ 131, 1163).');
 await page.goto('/#images');
 await page.getByLabel('Open float32 FITS image (up to 5 MiB)',{exact:true}).setInputFiles({name:d.suggestedFilename(),mimeType:'application/octet-stream',buffer:bytes});
 await expect(page.locator('.fits-lab')).toContainText('512 × 512 pixels');
 await expect(page.locator('.fits-lab')).toContainText(createHash('sha256').update(bytes).digest('hex'));
});
test('the 2MASS credit and IR note stay while an IR image is shown, even after choosing the CCD camera',async({page})=>{
 await trackedField(page);const body=await jhk;
 await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await camera(page).getByLabel('IR camera (J, H, K)').check();await camera(page).getByLabel(/Ask VizieR live/).check();
 await camera(page).getByLabel('Minutes').fill('0');await camera(page).getByLabel('Seconds').fill('1');
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:15_000});
 await camera(page).getByLabel('CCD camera',{exact:true}).check();
 await expect(page.getByTestId('camera-canvas')).toHaveAttribute('aria-label',/^IR image, filter J/);
 await expect(camera(page).getByTestId('camera-ir-citation')).toContainText('Two Micron All Sky Survey');
 await expect(camera(page).getByTestId('camera-ir-adaptation')).toBeVisible();
});
test('at 320 px the camera choice works from the keyboard without horizontal scrolling',async({page})=>{
 await page.setViewportSize({width:320,height:800});await trackedField(page);
 const ccd=camera(page).getByLabel('CCD camera',{exact:true});await ccd.focus();await page.keyboard.press('ArrowDown');
 await expect(camera(page).getByLabel('IR camera (J, H, K)')).toBeChecked();
 await expect(camera(page).getByRole('heading',{name:'IR camera'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 const box=await camera(page).boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(320);
});
