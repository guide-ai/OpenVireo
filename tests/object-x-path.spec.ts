import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {clickHeaderTool} from './fixtures/header-tools';
import {saveOffline} from './fixtures/offline-save';
import {parseFitsImage} from '../src/core/fitsImage';
import {angularSeparationArcsec,skyToPixel,tanWcsFromCards} from '../src/core/astrometryMeasure';
import {findOrbitRecord,readOrbitRecord} from '../src/core/orbitFile';
import {astrometricPosition,elementsFromState} from '../src/core/ephemeris';

// E08 Object X route (#object-x). Every CDS/VizieR request is intercepted with the recorded response
// tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml (CDS, 2026-10-27; its rows lie off this field, so the images hold the
// background, the asteroids placed by the ephemeris and noise). The motion check (review 2 M5) predicts the target's pixel on
// each saved image from the bundled orbit file and the image's own header, then compares the measured rate and position angle
// with the ephemeris.
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;// every VizieR mirror the camera may ask
const recorded=readFile(new URL('./fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
/** Every ObjectX.HTL identifier and remark (ShortString[24] at 0, ShortString[40] at 45 of each 86-byte row). */
const HTL=readFileSync(new URL('../public/original/hotlists/ObjectX.HTL',import.meta.url));
const short=(at:number)=>HTL.subarray(at+1,at+1+HTL[at]).toString('latin1').trim();
const ROWS=Array.from({length:HTL.length/86},(_,i)=>[short(i*86),short(i*86+45)] as const);
const IDS=ROWS.map(r=>r[0]),SECRETS=ROWS.flat();
/** objectXCode('(433) Eros') — FNV-1a of the identifier (src/core/objectXLab.ts). */
const EROS_CODE='X-UZOBN';

/** Identifiers and remarks found as whole words in the Object X route (outside the original asteroid list), its guide or the
 * camera. Other tools of the app legitimately show some of these names (the observatory's galaxies, the pulsar hot list). */
async function leaks(page:Page){
 const texts=await page.evaluate(()=>['objectx-lab','objectx-guide','camera-control'].map(id=>{
  const n=document.querySelector(`[data-testid=${id}]`);if(!n)return '';const c=n.cloneNode(true) as HTMLElement;
  c.querySelectorAll('[data-testid=objectx-asteroid-list]').forEach(x=>x.remove());return c.innerHTML+' '+c.textContent;}));
 const word=(s:string)=>new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^\\w])`);
 // The camera's shared text may use a kind word ("Star positions…"); only identifiers count there.
 return [...SECRETS.filter(s=>word(s).test(texts[0]+' '+texts[1])),...IDS.filter(s=>word(s).test(texts[2]))];
}
async function openLab(page:Page){
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 await expect(page.getByTestId('objectx-target').locator('option')).toHaveCount(18);
}
async function exposeHere(page:Page,seconds:string,minutes='0'){
 const camera=page.getByTestId('camera-control');
 await camera.getByLabel(/Ask VizieR live/).check();await camera.getByLabel('Minutes').fill(minutes);await camera.getByLabel('Seconds').fill(seconds);
 await camera.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(page.getByTestId('camera-status')).toHaveText('Exposing…');
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:120_000});
}

test('hidden identity, two images of the target with asteroids, measure, answer, reveal, save and restore',async({page})=>{
 test.setTimeout(240_000);
 const body=await recorded;await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await openLab(page);
 // M1: no identifier or remark in the Object X route, guide or camera before the reveal.
 expect(await leaks(page)).toEqual([]);
 await page.getByLabel('ID # of your unknown object (from the lab sheet or instructor)').fill('42');
 await page.getByTestId('objectx-target').selectOption(EROS_CODE);
 await expect(page.getByTestId('objectx-coordinates')).toHaveText('X-UZOBN — Coordinates (J2000): RA 22 43 19.26, Dec -08 02 23.6');
 await button(page,'Set the observatory clock').click();
 await expect(page.getByText('Observatory clock set to 2009-06-01 04:00:00 UT.')).toBeVisible();
 // As the original after Set Date/Time, the asteroid list is built by itself (review 2 M1).
 await expect(page.getByTestId('objectx-list-status')).toContainText('Observable asteroids on 2009-06-01 04:00:00 UT',{timeout:20_000});
 expect(await leaks(page)).toEqual([]);
 await page.screenshot({path:test.info().outputPath('object-x-start.png'),fullPage:true});

 // Observatory: the coordinates are copied; the student opens the dome, points, tracks.
 await button(page,'Copy the coordinates to the observatory').click();
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();
 if(!await button(page,'Point to coordinates').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await button(page,'Point to coordinates').click();
 // The plain view switch keeps the typed coordinates ("Switch to telescope view ↗" points at the selected catalogue object).
 await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
 await expect(page.locator('.pointing-readout').first()).toContainText('22.72202');
 const startClock=async()=>{if(!await button(page,'Start observatory clock').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();await button(page,'Start observatory clock').click();};
 await startClock();await button(page,'Turn tracking on').click();
 await exposeHere(page,'0','1');
 // 45 minutes later: the student sets the clock again; the list is rebuilt for the new time and tracking stays on.
 await clickHeaderTool(page,'Object X');
 await page.getByLabel('Observation date and time (UT)').fill('2009-06-01T04:45:00');await button(page,'Set the observatory clock').click();
 await expect(page.getByTestId('objectx-list-status')).toContainText('Observable asteroids on 2009-06-01 04:45:00 UT',{timeout:20_000});
 await clickHeaderTool(page,'Observatory');await startClock();
 await exposeHere(page,'0','1');
 expect(await leaks(page)).toEqual([]);

 await clickHeaderTool(page,'Object X');
 const images=page.getByTestId('objectx-images').locator('li');
 await expect(images).toHaveCount(2);
 await expect(images.first()).toContainText('ObjX-42-01');await expect(images.nth(1)).toContainText('ObjX-42-02');
 await expect(page.getByTestId('objectx-image-movers-0')).toContainText(/[1-9]\d* asteroids? in the field box/);
 await expect(page.getByTestId('objectx-image-movers-1')).toContainText(/[1-9]\d* asteroids? in the field box/);
 // Save both images as the original names them (review 2 L4) and read their headers in Node.
 const fits:Buffer[]=[];
 for(const label of ['ObjX-42-01','ObjX-42-02']){
  const d=page.waitForEvent('download');await button(page,`Save ${label}.FIT`).click();const dl=await d;
  expect(dl.suggestedFilename()).toBe(`${label}.FIT`);fits.push(await readFile((await dl.path())!));
 }
 // Prediction from the bundled orbit file at mid-exposure, through each image's own WCS.
 const sav=new Uint8Array(readFileSync(new URL('../public/original/orbit/ObjX_MPC.CMO.sav',import.meta.url)));
 const eros=elementsFromState(readOrbitRecord(sav,findOrbitRecord(sav,{number:'433'})!));
 const predicted=fits.map(bytes=>{
  const image=parseFitsImage(new Uint8Array(bytes)),card=(k:string)=>Number(image.cards.find(c=>c.startsWith(k.padEnd(8)+'='))!.slice(10).split('/')[0]);
  const jd=card('MJD-OBS')+2400000.5,mid=jd+card('EXPTIME')/2/86400,p=astrometricPosition(eros,mid);
  return {jd,sky:{raHours:p.raHours,decDeg:p.decDeg},pixel:skyToPixel(tanWcsFromCards(image.cards),{raHours:p.raHours,decDeg:p.decDeg})};
 });
 const hours=(predicted[1].jd-predicted[0].jd)*24;expect(hours).toBeGreaterThan(0.7);
 const rate=angularSeparationArcsec(predicted[0].sky,predicted[1].sky)/hours;
 expect(rate).toBeGreaterThan(50);expect(rate).toBeLessThan(60);// Eros ≈ 54.7″/h at the default date
 const dRa=(predicted[1].sky.raHours-predicted[0].sky.raHours)*15*3600*Math.cos(predicted[0].sky.decDeg*Math.PI/180),dDec=(predicted[1].sky.decDeg-predicted[0].sky.decDeg)*3600;
 const pa=(Math.atan2(dRa,dDec)*180/Math.PI+360)%360;

 await button(page,'Measure positions').click();
 const canvas=page.getByTestId('objectx-measure-canvas');await expect(canvas).toBeVisible();
 const viewport=page.getByTestId('objectx-measure-viewport');
 const cursor=async()=>{const m=/x (\d+), y (\d+)/.exec((await page.getByTestId('objectx-cursor').textContent())??'')!;return {x:Number(m[1]),y:Number(m[2])};};
 async function moveTo(x:number,y:number){
  for(const [axis,plus,minus] of [['x','ArrowRight','ArrowLeft'],['y','ArrowDown','ArrowUp']] as const){
   let d=Math.round(axis==='x'?x:y)-(await cursor())[axis];
   while(Math.abs(d)>=10){await page.keyboard.press(`Shift+${d>0?plus:minus}`);d-=Math.sign(d)*10;}
   while(d!==0){await page.keyboard.press(d>0?plus:minus);d-=Math.sign(d);}
  }
 }
 for(const [k,frame] of ['Image 1: ObjX-42-01','Image 2: ObjX-42-02'].entries()){
  await page.getByRole('button',{name:frame}).click();await viewport.focus();
  await moveTo(predicted[k].pixel.x,predicted[k].pixel.y);await page.keyboard.press('Enter');
 }
 const rows=page.getByTestId('objectx-measurements').locator('tbody tr');
 await expect(rows).toHaveCount(2);await expect(rows.first()).toContainText('header WCS');
 const motion=/Motion: ([\d.]+)″\/h toward position angle ([\d.]+)°/.exec((await page.getByTestId('objectx-motion').textContent())??'');
 expect(motion).not.toBeNull();
 // Tolerance: a centroid within about 1 px (1.07″) on each image over 0.75 h is about ±3″/h; allowed ±6″/h and ±8°.
 expect(Math.abs(Number(motion![1])-rate)).toBeLessThan(6);
 const dpa=Math.abs(((Number(motion![2])-pa)+540)%360-180);expect(dpa).toBeLessThan(8);
 await page.screenshot({path:test.info().outputPath('object-x-measure.png'),fullPage:true});

 // Answer and reveal.
 await page.getByTestId('objectx-answer').getByLabel('asteroid').check();
 await page.getByLabel('Describe your evidence').fill('A source near the centre moved about 55″ per hour between the two images.');
 expect(await leaks(page)).toEqual([]);
 await button(page,'Reveal the identity').click();await button(page,'Reveal the identity').click();
 await expect(page.getByTestId('objectx-reveal')).toContainText('Object: (433) Eros — Asteroid');
 await expect(page.getByTestId('objectx-reveal')).toContainText('Your answer is right: it is an asteroid.');
 // The answer is frozen at the reveal (review 2 M2).
 await expect(page.getByTestId('objectx-answer').getByLabel('star')).toBeDisabled();
 await page.screenshot({path:test.info().outputPath('object-x-reveal.png'),fullPage:true});

 // Save (v28) offline: its replay reuses the orbit file the list was built from (Front F2), then restore in a fresh page.
 const saved=await saveOffline(page,async()=>{const download=page.waitForEvent('download');await button(page,'Save investigation').click();return (await download).path();});const text=await readFile(saved!,'utf8'),json=JSON.parse(text);
 expect(json.version).toBe(28);expect(json.objectX.target).toBe(EROS_CODE);expect(json.objectX.exposures).toHaveLength(2);expect(json.objectX.log).toHaveLength(2);
 expect(json.objectX.exposures[0].pairs).toBeGreaterThan(0);
 const fresh=await page.context().newPage();await openLab(fresh);
 await fresh.getByLabel('Restore investigation JSON').setInputFiles({name:'objx.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await expect(fresh.getByTestId('objectx-images').locator('li')).toHaveCount(2,{timeout:20_000});
 await expect(fresh.getByTestId('objectx-images').locator('li').first()).toContainText('not loaded — open its saved FITS file');
 await expect(fresh.getByTestId('objectx-reveal')).toContainText('(433) Eros');
 await expect(fresh.getByTestId('objectx-list-status')).toContainText('Observable asteroids on 2009-06-01 04:45:00 UT',{timeout:20_000});
 // Reopening the saved files binds them back by SHA-256, and the marks and motion come back.
 await fresh.getByTestId('objectx-open-fits').setInputFiles(fits.map((buffer,i)=>({name:`ObjX-42-0${i+1}.FIT`,mimeType:'application/fits',buffer})));
 await expect(fresh.getByTestId('objectx-motion')).toContainText('″/h toward position angle');
 expect(json.objectX.exposures.map((e:{orbitFile:string})=>e.orbitFile)).toEqual(['ObjX_MPC.CMO.sav','ObjX_MPC.CMO.sav']);
});

test('the radio and spectrometer branches, the guide, and light/dark at desktop and 320 px never name the object',async({page})=>{
 await openLab(page);
 await page.getByTestId('objectx-target').selectOption('X-Z2YY7');
 await button(page,'Place the slit on the object').click();
 await expect(page.getByTestId('objectx-spectrum-unavailable')).toContainText('No measurable spectrum at this position',{timeout:60_000});
 await clickHeaderTool(page,'Object X guide');
 const guide=page.getByTestId('objectx-guide');await expect(guide).toBeVisible();
 await expect(guide.getByTestId('objectx-guide-step-target')).toHaveAttribute('data-done','true');
 await expect(guide.getByTestId('objectx-guide-step-clock')).toHaveAttribute('data-done','false');
 await expect(guide.getByTestId('objectx-guide-counts')).toContainText('1 of 10 steps');
 expect(await leaks(page)).toEqual([]);
 await guide.getByRole('button',{name:'Close Object X guide'}).click();
 await button(page,'Open the radio telescope').click();
 await expect(page).toHaveURL(/#radio-control$/);
 expect(await leaks(page)).toEqual([]);
 for(const scheme of ['light','dark'] as const)for(const width of [1440,320]){
  await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:900});
  await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
  await clickHeaderTool(page,'Object X');
  await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
  await page.getByTestId('objectx-target').selectOption('X-Z2YY7');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${scheme} ${width}px overflow`).toBe(true);
  // Themed surfaces: the branch cards follow the theme's raised surface.
  const bg=await page.getByTestId('objectx-branch-radio').evaluate(e=>getComputedStyle(e).backgroundColor);
  const raised=await page.evaluate(()=>{const p=document.createElement('div');p.style.background='var(--ov-surface-raised)';document.body.append(p);const c=getComputedStyle(p).backgroundColor;p.remove();return c;});
  expect(bg).toBe(raised);
  expect(await leaks(page)).toEqual([]);
  await page.screenshot({path:test.info().outputPath(`object-x-${scheme}-${width}.png`),fullPage:width===320?false:true});
 }
});

test('Front C5W: the default bundled-extract mode images an Object X field without asking any mirror and never names it',async({page})=>{
 test.setTimeout(180_000);
 const asked:string[]=[];page.on('request',r=>{if(CDS.test(r.url()))asked.push(r.url());});
 await openLab(page);
 await page.getByLabel('ID # of your unknown object (from the lab sheet or instructor)').fill('42');
 await page.getByTestId('objectx-target').selectOption(EROS_CODE);
 await button(page,'Set the observatory clock').click();
 await button(page,'Copy the coordinates to the observatory').click();
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();
 if(!await button(page,'Point to coordinates').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await button(page,'Point to coordinates').click();
 await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
 if(!await button(page,'Start observatory clock').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Start observatory clock').click();await button(page,'Turn tracking on').click();
 const camera=page.getByTestId('camera-control');
 await expect(camera.getByLabel(/Bundled extracts/)).toBeChecked();
 await camera.getByLabel('Minutes').fill('0');await camera.getByLabel('Seconds').fill('1');
 await camera.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:120_000});
 await camera.getByText('Exposure details').click();
 await expect(page.getByTestId('camera-detail-source')).toContainText('Bundled extract nomad-340.8302-08.0399-r0.25 (recorded');
 await expect(page.getByTestId('camera-detail-source')).toContainText('from vizier.idia.ac.za');
 expect(asked).toEqual([]);expect(await leaks(page)).toEqual([]);
});

// Front Perf review 1 M1: a repoint during a CCD exposure keeps the exposure (tracking stays on); the asteroids added to the
// image are those around the pointing at Start, as the image itself is, not around the field the telescope was moved to.
test('a mid-exposure repoint keeps the asteroids of the Start pointing in that image',async({page})=>{
 test.setTimeout(240_000);
 const body=await recorded;await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await openLab(page);
 await page.getByLabel('ID # of your unknown object (from the lab sheet or instructor)').fill('42');
 await page.getByTestId('objectx-target').selectOption(EROS_CODE);
 await button(page,'Set the observatory clock').click();
 await expect(page.getByTestId('objectx-list-status')).toContainText('Observable asteroids on 2009-06-01 04:00:00 UT',{timeout:20_000});
 await button(page,'Copy the coordinates to the observatory').click();
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();
 if(!await button(page,'Point to coordinates').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await button(page,'Point to coordinates').click();
 await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
 if(!await button(page,'Start observatory clock').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Start observatory clock').click();await button(page,'Turn tracking on').click();
 const camera=page.getByTestId('camera-control');
 await camera.getByLabel(/Ask VizieR live/).check();await camera.getByLabel('Minutes').fill('1');await camera.getByLabel('Seconds').fill('0');
 await camera.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(page.getByTestId('camera-status')).toHaveText('Exposing…');
 // Repoint three degrees north while exposing: far outside the 15′ field, so no asteroid of the Start field is near it.
 await page.getByLabel('Declination · degrees',{exact:true}).fill('-5.04');
 await button(page,'Point to coordinates').click();
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:120_000});
 await clickHeaderTool(page,'Object X');
 await expect(page.getByTestId('objectx-images').locator('li')).toHaveCount(1);
 await expect(page.getByTestId('objectx-image-movers-0')).toContainText(/[1-9]\d* asteroids? in the field box/);
});
