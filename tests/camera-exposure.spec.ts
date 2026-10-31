import {test,expect,type Page,type Request} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Every CDS/VizieR request is intercepted: the recorded response is tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml
// (CDS, 2026-10-27). Synthetic documents below are authored test inputs, not VizieR output.
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;// every VizieR mirror the camera may ask
const recorded=readFile(new URL('./fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const overflow='<?xml version="1.0"?><VOTABLE version="1.4"><INFO name="QUERY_STATUS" value="OVERFLOW"/><RESOURCE><TABLE><FIELD name="NOMAD1"/></TABLE></RESOURCE></VOTABLE>';
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const camera=(p:Page)=>p.getByTestId('camera-control');

async function trackedField(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();await page.getByLabel('Target',{exact:true}).selectOption('N0000.DAT@14428');
 await button(page,'Point telescope ↗').click();await button(page,'Switch to telescope view ↗').click();
 if(!await button(page,'Start observatory clock').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Start observatory clock').click();await button(page,'Turn tracking on').click();
 await expect(button(page,'Start exposure')).toBeEnabled();
}
async function exposure(page:Page,minutes:string,seconds:string){
 await camera(page).getByLabel('Minutes').fill(minutes);await camera(page).getByLabel('Seconds').fill(seconds);
}
function watch(page:Page){const seen:Request[]=[];page.on('request',r=>{if(CDS.test(r.url()))seen.push(r);});return seen;}

test('the camera waits for a tracked, pointed telescope and explains why',async({page})=>{
 await page.goto('/#observatory');
 await expect(button(page,'Start exposure')).toBeDisabled();
 await expect(page.getByTestId('camera-status')).toContainText('The camera needs the telescope ready');
});
test('static mode never contacts CDS; a field without a bundled extract makes no image',async({page})=>{
 const seen=watch(page);await trackedField(page);await exposure(page,'0','30');
 await expect(page.getByTestId('camera-static-hint')).toHaveText('No bundled extract covers this pointing. Choose the live VizieR option to image it.');
 await button(page,'Start exposure').click();
 // Reported at Start, not after the 30 s countdown.
 await expect(page.getByTestId('camera-status')).toContainText('There is no bundled extract for this field',{timeout:2_000});
 await expect(camera(page)).toHaveAttribute('data-phase','idle');
 await expect(page.getByTestId('camera-canvas')).toHaveCount(0);
 expect(seen).toHaveLength(0);
});
test('live mode sends only RA, DEC and SR and builds an image from the recorded response',async({page})=>{
 const seen=watch(page);await trackedField(page);const body=await recorded;
 await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await camera(page).getByLabel(/Ask VizieR live/).check();await exposure(page,'0','2');
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toHaveText('Exposing…');
 await expect(page.getByTestId('camera-countdown')).toContainText('of 2 s left.');
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:15_000});
 await expect(page.getByTestId('camera-canvas')).toBeVisible();
 expect(seen).toHaveLength(1);
 const url=new URL(seen[0].url());
 expect(url.origin+url.pathname).toBe('https://vizier.idia.ac.za/viz-bin/conesearch/I/297/out');
 expect([...url.searchParams.keys()]).toEqual(['RA','DEC','SR']);expect(url.searchParams.get('SR')).toBe('0.23');
 await camera(page).getByText('Exposure details').click();
 await expect(page.getByTestId('camera-detail-catalog')).toHaveText('NOMAD');
 await expect(page.getByTestId('camera-detail-source')).toContainText('Live VizieR query answered by vizier.idia.ac.za');
 await expect(page.getByTestId('camera-detail-rows')).toHaveText('4 / 1 / 0');
 // Front G merge: every pointing now has a field population (tiled here), and this field holds no variable star.
 await expect(page.getByTestId('camera-detail-field-objects')).toHaveAttribute('data-status','none');
 await page.screenshot({path:test.info().outputPath('camera-live.png'),fullPage:false});
});
test('Front C5W: when the IDIA mirror cannot be reached, the live query falls back to CDS and names it',async({page})=>{
 const seen=watch(page);await trackedField(page);const body=await recorded;
 await page.route(CDS,route=>new URL(route.request().url()).hostname==='vizier.idia.ac.za'?route.abort('connectionrefused'):route.fulfill({status:200,contentType:'text/xml',body}));
 await camera(page).getByLabel(/Ask VizieR live/).check();await exposure(page,'0','1');
 await button(page,'Start exposure').click();await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:15_000});
 expect(seen.map(r=>new URL(r.url()).hostname)).toEqual(['vizier.idia.ac.za','vizier.cds.unistra.fr']);
 await camera(page).getByText('Exposure details').click();
 await expect(page.getByTestId('camera-detail-source')).toContainText('Live VizieR query answered by vizier.cds.unistra.fr');
});
test('CCD I asks USNO-B1 (I/284), never NOMAD',async({page})=>{
 const seen=watch(page);await trackedField(page);
 await page.route(CDS,route=>route.abort('connectionrefused'));
 await camera(page).getByLabel(/Ask VizieR live/).check();await camera(page).getByLabel('Filter').selectOption('4');await exposure(page,'0','1');
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toContainText('No VizieR mirror could be reached',{timeout:15_000});
 expect(new URL(seen[0].url()).pathname).toBe('/viz-bin/conesearch/I/284/out');
});
test('unreachable or incomplete catalogs make no image and say so',async({page})=>{
 await trackedField(page);await camera(page).getByLabel(/Ask VizieR live/).check();await exposure(page,'0','1');
 await page.route(CDS,route=>route.abort('timedout'));
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toContainText('The camera does not invent a star field',{timeout:15_000});
 await page.unroute(CDS);await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body:overflow}));
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toContainText('The catalog response is incomplete',{timeout:15_000});
 await expect(page.getByTestId('camera-canvas')).toHaveCount(0);
});
test('Stop cancels a long exposure and the pending request; keyboard use at 320 px',async({page})=>{
 await page.setViewportSize({width:320,height:800});
 const seen=watch(page);await trackedField(page);
 let aborted=false;await page.route(CDS,()=>{/* never answer */});page.on('requestfailed',r=>{if(CDS.test(r.url()))aborted=true;});
 await camera(page).getByLabel(/Ask VizieR live/).check();await exposure(page,'0','30');
 await button(page,'Start exposure').focus();await page.keyboard.press('Enter');
 await expect(page.getByTestId('camera-status')).toHaveText('Exposing…');
 await expect(camera(page).getByLabel('Seconds')).toBeDisabled();
 await button(page,'Stop').focus();await page.keyboard.press('Enter');
 await expect(page.getByTestId('camera-status')).toHaveText('Exposure stopped. No image was made.');
 await expect(button(page,'Start exposure')).toBeEnabled();
 expect(seen).toHaveLength(1);await expect.poll(()=>aborted).toBe(true);
 const overflowX=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
 expect(overflowX).toBe(false);
});
test('Save image writes a FITS file that reopens under Saved images with the same bytes',async({page})=>{
 await trackedField(page);const body=await recorded;
 await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await camera(page).getByLabel(/Ask VizieR live/).check();await camera(page).getByLabel('Filter').selectOption('2');await exposure(page,'0','1');
 await button(page,'Start exposure').click();await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:15_000});
 const download=page.waitForEvent('download');await button(page,'Save image (FITS)').click();const d=await download;
 expect(d.suggestedFilename()).toMatch(/^OpenVireo-CCD-\d{8}-\d{6}-V\.fit$/);
 const bytes=await readFile((await d.path())!);expect(bytes.length%2880).toBe(0);
 const header=bytes.subarray(0,2880).toString('latin1');
 expect(header.startsWith('SIMPLE  =                    T')).toBe(true);expect(header).toContain("FILTER  = 'V       '");expect(header).toContain("CATALOG = 'NOMAD   '");
 // Front R1: VIREO's own keyword writer 0x523218 (cards, order, no data padding), the second button.
 const nativeDownload=page.waitForEvent('download');await button(page,'Save image (VIREO header)').click();const n=await nativeDownload;
 expect(n.suggestedFilename()).toBe('UNKNOWN-01.FIT');
 const native=await readFile((await n.path())!);expect(native.length).toBe(2880+1024*1024*4);
 const nh=native.subarray(0,2880).toString('latin1');
 expect(nh.slice(80*5,80*8)).toMatch(/^OBJECT  = 'UNKNOWN '\s+\/\s*ORIGIN  = 'CLEA Simulation'    \/\s*DATE    = '\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d'/);
 expect(nh).toContain("FILTER  = 'V       '           /");expect(nh).toContain("INSTRUME= 'CCD Camera'");expect(nh).not.toContain('CATALOG');
 // Front RE5 (RE5 review 1 L1, M2): with a Set Date/Time ID from the Object X lab, the file and OBJECT become ObjX-<ID> (Save 0x522c28,
 // header 0x5239f8); an ID that FITS cannot hold (non-ASCII) is refused with a message and nothing is downloaded.
 const objectXId=async(id:string)=>{await page.evaluate(()=>{location.hash='#object-x';});await page.getByLabel('ID # of your unknown object (from the lab sheet or instructor)').fill(id);await page.evaluate(()=>{location.hash='#observatory';});await expect(camera(page)).toBeVisible();};
 await objectXId('42');
 const idDownload=page.waitForEvent('download');await button(page,'Save image (VIREO header)').click();const withId=await idDownload;
 expect(withId.suggestedFilename()).toBe('ObjX-42-01.FIT');expect((await readFile((await withId.path())!)).subarray(80*5,80*6).toString('latin1')).toMatch(/^OBJECT  = 'ObjX-42 '/);
 await objectXId('María');let downloaded=false;page.on('download',()=>{downloaded=true;});
 await button(page,'Save image (VIREO header)').click();await expect(page.getByTestId('camera-save-error')).toContainText('only plain ASCII');expect(downloaded).toBe(false);
 await objectXId('');
 await page.goto('/#images');
 await page.getByLabel('Open float32 FITS image (up to 5 MiB)',{exact:true}).setInputFiles({name:d.suggestedFilename(),mimeType:'application/octet-stream',buffer:bytes});
 await expect(page.locator('.fits-lab')).toContainText('1024 × 1024 pixels');
 await expect(page.locator('.fits-lab')).toContainText(createHash('sha256').update(bytes).digest('hex'));
});
test('a dense field of 10,001 catalog rows still makes an image, built off the main thread',async({page})=>{
 await trackedField(page);
 // AUTHORED grid of 10,001 stars around the current pointing (not VizieR output).
 await page.route(CDS,route=>{
  const u=new URL(route.request().url()),ra=Number(u.searchParams.get('RA')),dec=Number(u.searchParams.get('DEC'));
  const f=['NOMAD1','RAJ2000','DEJ2000','pmRA','pmDE','Bmag','Vmag','Rmag','Jmag','Hmag','Kmag'];
  const rows=Array.from({length:10001},(_,i)=>`<TR><TD>g${i}</TD><TD>${(ra+((i%101)/101-0.5)*0.25).toFixed(6)}</TD><TD>${(dec+(Math.floor(i/101)/100-0.5)*0.25).toFixed(6)}</TD><TD>0</TD><TD>0</TD><TD/><TD/><TD>${(15+(i%60)/10).toFixed(2)}</TD><TD/><TD/><TD/></TR>`).join('');
  return route.fulfill({status:200,contentType:'text/xml',body:`<?xml version="1.0"?><VOTABLE version="1.4"><INFO name="MaxTuples" value="50000"/><RESOURCE><TABLE>${f.map(x=>`<FIELD name="${x}"/>`).join('')}<DATA><TABLEDATA>${rows}</TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`});
 });
 await camera(page).getByLabel(/Ask VizieR live/).check();await exposure(page,'0','1');
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:30_000});
 await camera(page).getByText('Exposure details').click();
 await expect(page.getByTestId('camera-detail-rows')).toContainText('10001 / 10001 /');
});
test('Stop during image building keeps the page responsive and makes no image',async({page})=>{
 await trackedField(page);
 await page.route(CDS,route=>{
  const u=new URL(route.request().url()),ra=Number(u.searchParams.get('RA')),dec=Number(u.searchParams.get('DEC'));
  const f=['NOMAD1','RAJ2000','DEJ2000','pmRA','pmDE','Bmag','Vmag','Rmag','Jmag','Hmag','Kmag'];
  const rows=Array.from({length:40000},(_,i)=>`<TR><TD>g${i}</TD><TD>${(ra+((i%200)/200-0.5)*0.25).toFixed(6)}</TD><TD>${(dec+(Math.floor(i/200)/200-0.5)*0.25).toFixed(6)}</TD><TD>0</TD><TD>0</TD><TD/><TD/><TD>14</TD><TD/><TD/><TD/></TR>`).join('');
  return route.fulfill({status:200,contentType:'text/xml',body:`<?xml version="1.0"?><VOTABLE version="1.4"><RESOURCE><TABLE>${f.map(x=>`<FIELD name="${x}"/>`).join('')}<DATA><TABLEDATA>${rows}</TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`});
 });
 await camera(page).getByLabel(/Ask VizieR live/).check();await exposure(page,'0','1');
 await button(page,'Start exposure').click();
 await expect(page.getByTestId('camera-status')).toHaveText('Building the image…',{timeout:20_000});
 const t=Date.now();await button(page,'Stop').click();
 await expect(page.getByTestId('camera-status')).toHaveText('Exposure stopped. No image was made.');
 expect(Date.now()-t).toBeLessThan(1500);
 await expect(page.getByTestId('camera-canvas')).toHaveCount(0);
});
test('exposures of 60 min or longer are refused in the form (VIREO: 0x512244, ExpClock.Minutes setter 0x4fcbc8)',async({page})=>{
 // Re-pinned 2026-10-30 (Front RE5): the recovered maximum is 59 min 59 s; 60 min 0 s was accepted before.
 await trackedField(page);await exposure(page,'60','0');
 await expect(button(page,'Start exposure')).toBeDisabled();
 await expect(camera(page).getByRole('alert')).toContainText('between 1 s and 59 min 59 s');
 await exposure(page,'59','59');await expect(button(page,'Start exposure')).toBeEnabled();
});

test('Front R2 review 1 H1/I1, closure M1: at NGC 5924 (LSS Field 8) a class 1/2 variable takes the tail catalog row and is drawn saturated',async({page})=>{
 test.setTimeout(120_000);
 // The recorded answer with its rows moved onto the pointing, so a catalog row is the tail the pass overwrites.
 const ra=15.365694444444445,dec=31.221944444444443,dRa=ra*15-56.75,dDec=dec-24.12;
 const body=(await recorded).toString('utf8').replace(/<TD>(0?56\.7\d+)<\/TD>/g,(_,v:string)=>`<TD>${(Number(v)+dRa).toFixed(7)}</TD>`).replace(/<TD>\+(24\.1\d+)<\/TD>/g,(_,v:string)=>`<TD>+${(Number(v)+dDec).toFixed(7)}</TD>`);
 await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(String(ra));await page.locator('#point-dec').fill(String(dec));
 await button(page,'Point to coordinates').click();
 await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
 if(!await button(page,'Turn tracking on').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Turn tracking on').click();
 await camera(page).getByLabel(/Ask VizieR live/).check();await exposure(page,'0','1');
 await button(page,'Start exposure').click();await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:60_000});
 await camera(page).getByText('Exposure details').click();
 const fo=page.getByTestId('camera-detail-field-objects');
 await expect(fo).toHaveAttribute('data-status','run');await expect(fo).toContainText('the star is drawn saturated');
 // Closure M1: VIREO's saturated star is drawn and clipped at the well, so many pixels share the brightest value.
 const peak=page.getByTestId('camera-detail-peak');await expect(peak).toContainText('65536');
 expect(Number(await peak.getAttribute('data-count'))).toBeGreaterThan(1000);
});

test('Front R2: at a certified field with a variable star the field-object pass runs; elsewhere it says why not',async({page})=>{
 test.setTimeout(120_000);
 const body=await recorded;await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 // The Boötes engine pack pointing (data/hubble/engine-bootes.json), whose certified field holds one TRUE-kept variable star.
 await page.locator('#point-ra').fill('14.545666666666667');await page.locator('#point-dec').fill('31.56361111111111');
 await button(page,'Point to coordinates').click();
 await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
 if(!await button(page,'Turn tracking on').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Turn tracking on').click();
 await camera(page).getByLabel(/Ask VizieR live/).check();await exposure(page,'0','1');
 await button(page,'Start exposure').click();await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:60_000});
 await camera(page).getByText('Exposure details').click();
 const fo=page.getByTestId('camera-detail-field-objects');
 await expect(fo).toHaveAttribute('data-status','run');await expect(fo).toContainText('1 in the field');
});
