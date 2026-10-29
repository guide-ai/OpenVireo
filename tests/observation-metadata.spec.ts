import {test,expect,type Page} from '@playwright/test';

// Front S (S4, docs/OBSERVATION-RESULTS.md): Observational Data for a spectrum loaded from a file takes the object ID from the
// file name, JD from the file's last change and RA/Dec from the *SpHdr* pointing (static reading of CLEA_VEO.exe,
// analysis/front-s-spectroscopy/RE-observational-data-metadata.md). Photometry and Z stay empty.
const ssp=()=>Buffer.from('*SpHdr* Header name,12.5,-2.5\n'+Array.from({length:600},(_,i)=>`${3700+i*2} ${i===1?'.5':'1'}`).join('\n')+'\n');
async function ready(page:Page){await expect(page.getByRole('button',{name:'Review classification',exact:true})).toBeEnabled();}

test('a loaded .SSP shows its file-name ID, file-time JD and header pointing; the record keeps them',async({page})=>{
 await page.goto('/#classification');await ready(page);
 await page.getByLabel('Import SP or SSP for visual classification (up to 2 MiB)',{exact:true}).setInputFiles({name:'star_HD1234.ssp',mimeType:'text/plain',buffer:ssp()});
 await ready(page);
 await page.getByRole('button',{name:'Open observation results',exact:true}).click();
 const dialog=page.locator('.observation-dialog');await expect(dialog).toBeVisible();
 await expect(page.getByTestId('observation-object')).toHaveText('HD1234');// not the header's "Header name"
 await expect(page.getByTestId('observation-jd')).toHaveText(/^24\d{5}\.\d{6}$/);
 await expect(page.getByTestId('observation-ra')).toHaveText('12h 30m 00.00s');
 await expect(page.getByTestId('observation-dec')).toHaveText(`-02° 30' 00.0"`);
 for(const id of ['observation-photometry','observation-z','observation-velocity'])await expect(page.getByTestId(id)).toHaveText('(empty)');
 await dialog.getByLabel('Spectral type').fill('G2V');
 await page.getByRole('button',{name:'Record observation result',exact:true}).click();
 await expect(page.getByTestId('observation-row-meta')).toContainText("RA 12h 30m 00.00s · Dec -02° 30' 00.0\"");
});

test('a spectrum classified directly from the star exposure has the header pointing and no file time',async({page})=>{
 await page.clock.install();await page.goto('/#star-exposure');
 await page.getByRole('button',{name:'Activate supported star field',exact:true}).click();
 await page.getByRole('button',{name:'Start star exposure',exact:true}).click();await page.clock.runFor(1000);
 await page.getByRole('button',{name:'Classify acquired star',exact:true}).click();await ready(page);
 await page.getByRole('button',{name:'Open observation results',exact:true}).click();
 await expect(page.getByTestId('observation-object')).toHaveText('DAT_14428');// the save-file stem, openvireo-star-N0000_DAT_14428.ssp (review L5)
 await expect(page.getByTestId('observation-jd')).toHaveText('(empty)');
 await expect(page.getByTestId('observation-ra')).toHaveText(/^\d{2}h \d{2}m \d{2}\.\d{2}s$/);
 await expect(page.getByTestId('observation-dec')).toHaveText(/^[+-]\d{2}° \d{2}' \d{2}\.\d"$/);
});
