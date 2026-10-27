import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {clickHeaderTool} from './fixtures/header-tools';

// E08 Object X route (#object-x). Every CDS/VizieR request is intercepted with the recorded response
// tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml (CDS, 2026-10-27; its rows lie off this field, so the images hold the
// background, the asteroids placed by the ephemeris and noise). Exposures are a few seconds long: a long exposure of a fast
// object currently fails in the composer (known limit, front C).
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|cdsarc|unistra\.fr/;
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
async function exposeHere(page:Page,seconds:string){
 const camera=page.getByTestId('camera-control');
 await camera.getByLabel(/Ask CDS\/VizieR live/).check();await camera.getByLabel('Minutes').fill('0');await camera.getByLabel('Seconds').fill(seconds);
 await camera.getByRole('button',{name:'Start exposure',exact:true}).click();
 await expect(page.getByTestId('camera-status')).toHaveText('Exposing…');
 await expect(page.getByTestId('camera-status')).toHaveText('Image ready.',{timeout:60_000});
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
 await button(page,'Build the asteroid list for the observatory date').click();
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
 if(!await button(page,'Start observatory clock').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Start observatory clock').click();
 await button(page,'Turn tracking on').click();
 // 30 s: the target (V ≈ 14 here) stands out of the noise on the 0.4 m.
 await exposeHere(page,'30');
 await exposeHere(page,'30');
 expect(await leaks(page)).toEqual([]);

 await clickHeaderTool(page,'Object X');
 const images=page.getByTestId('objectx-images').locator('li');
 await expect(images).toHaveCount(2);
 await expect(images.first()).toContainText('ObjX-42-01');await expect(images.nth(1)).toContainText('ObjX-42-02');
 await expect(page.getByTestId('objectx-image-movers-0')).toContainText(/[1-9]\d* asteroids? in the field box/);
 await button(page,'Measure positions').click();
 const canvas=page.getByTestId('objectx-measure-canvas');await expect(canvas).toBeVisible();
 // The target sits at the field centre (pointed at its own coordinates): measure it on both images through the header WCS.
 const viewport=page.getByTestId('objectx-measure-viewport');
 for(const frame of ['Image 1: ObjX-42-01','Image 2: ObjX-42-02']){
  await page.getByRole('button',{name:frame}).click();await viewport.focus();
  const at=async()=>(await page.getByTestId('objectx-cursor').textContent())??'';
  // Move the cursor once from (1,1) to (513,513); it stays there on the second image.
  if(frame.startsWith('Image 1')){
   for(let i=0;i<51;i++){await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowDown');}
   for(let i=0;i<2;i++){await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');}
  }
  expect(await at()).toBe('Cursor x 513, y 513');
  await page.keyboard.press('Enter');
 }
 await expect(page.getByTestId('objectx-measurements').locator('tbody tr')).toHaveCount(2);
 await expect(page.getByTestId('objectx-measurements').locator('tbody tr').first()).toContainText('header WCS');
 await expect(page.getByTestId('objectx-motion')).toContainText('″/h toward position angle');
 // Both marks are on the target (the object's coordinates, 22 43 19.26 −08 02 23.6), not on a noise peak.
 const rows=page.getByTestId('objectx-measurements').locator('tbody tr');
 for(const i of [0,1]){
  const cells=await rows.nth(i).locator('td').allTextContents();
  const [h,m,sec]=cells[4].split(' ').map(Number),[d,dm,ds]=cells[5].replace('-','').split(' ').map(Number);
  const dra=((h*3600+m*60+sec)-(22*3600+43*60+19.26))*15*Math.cos(8.04*Math.PI/180),ddec=-(d*3600+dm*60+ds)+(8*3600+2*60+23.6);
  expect(Math.hypot(dra,ddec)).toBeLessThan(4);
 }
 await page.screenshot({path:test.info().outputPath('object-x-measure.png'),fullPage:true});

 // Answer and reveal.
 await page.getByTestId('objectx-answer').getByLabel('asteroid').check();
 await page.getByLabel('Describe your evidence').fill('A source at the centre moved between the two images.');
 expect(await leaks(page)).toEqual([]);
 await button(page,'Reveal the identity').click();await button(page,'Reveal the identity').click();
 await expect(page.getByTestId('objectx-reveal')).toContainText('Object: (433) Eros — Asteroid');
 await expect(page.getByTestId('objectx-reveal')).toContainText('Your answer is right: it is a asteroid.');
 await page.screenshot({path:test.info().outputPath('object-x-reveal.png'),fullPage:true});

 // Save (v28) and restore in a fresh page.
 const download=page.waitForEvent('download');await button(page,'Save investigation').click();
 const saved=await (await download).path();const text=await readFile(saved!,'utf8'),json=JSON.parse(text);
 expect(json.version).toBe(28);expect(json.objectX.target).toBe(EROS_CODE);expect(json.objectX.exposures).toHaveLength(2);expect(json.objectX.log).toHaveLength(2);
 expect(json.objectX.exposures[0].pairs).toBeGreaterThan(0);
 const fresh=await page.context().newPage();await openLab(fresh);
 await fresh.getByLabel('Restore investigation JSON').setInputFiles({name:'objx.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await expect(fresh.getByTestId('objectx-images').locator('li')).toHaveCount(2,{timeout:20_000});
 await expect(fresh.getByTestId('objectx-images').locator('li').first()).toContainText('not loaded — open its saved FITS file');
 await expect(fresh.getByTestId('objectx-reveal')).toContainText('(433) Eros');
 await expect(fresh.getByTestId('objectx-list-status')).toContainText('Observable asteroids on 2009-06-01 04:00:00 UT',{timeout:20_000});
});

test('the radio and spectrometer branches, the guide, and light/dark at desktop and 320 px never name the object',async({page})=>{
 await openLab(page);
 await page.getByTestId('objectx-target').selectOption('X-Z2YY7');
 await expect(page.getByTestId('objectx-spectrum-unavailable')).toContainText('Not available yet');
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
