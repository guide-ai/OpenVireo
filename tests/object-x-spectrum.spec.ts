import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';

// E08 spectrometer branch (Front F API wired under D5) from the student path: a star, a galaxy and a QSO are observed, kept,
// saved and restored. Before the reveal nothing names the object, its kind or a catalogue record: not the page, not the CSV
// downloads, not the saved investigation. Unavailable results read the same for every kind.
const HTL=readFileSync(new URL('../public/original/hotlists/ObjectX.HTL',import.meta.url));
const short=(at:number)=>HTL.subarray(at+1,at+1+HTL[at]).toString('latin1').trim();
const SECRETS=Array.from({length:HTL.length/86},(_,i)=>[short(i*86),short(i*86+45)]).flat().filter(Boolean);
// Engine-side names that must never reach the student before the reveal.
const ENGINE=[/\.DAT@/,/A00000\d\d/i,/\.BMP/i,/NGC ?\d{4}/,/GLXYSP|QSOSpect|JSPEC2/,/\b(quasar|QSO|galaxy|star)\b/i];
const CODES={star:'X-NTFB6',galaxy:'X-ZATDM',qso:'X-PRNJS'} as const;// ObjectX.HTL rows 9, 8, 1
const NEUTRAL='No measurable spectrum at this position with this telescope.';
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const word=(s:string)=>new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^\\w])`);
/** Secrets in a text; `generic` lists fixed help sentences that name the kinds generically (not the object). */
function leaksIn(text:string,generic:readonly string[]=[]){
 let t=text;for(const g of generic)t=t.split(g).join('');
 return [...SECRETS.filter(s=>word(s).test(t)),...ENGINE.filter(r=>r.test(t)).map(String)];
}
const HELP=['Stars, galaxies and quasars are told apart by their spectra.'];
async function openLab(page:Page){
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 await expect(page.getByTestId('objectx-target').locator('option')).toHaveCount(18);
 await page.locator('[data-testid=objectx-lab] input').first().fill('7');
}
async function branchText(page:Page){return page.getByTestId('objectx-branch-spectrum').evaluate(n=>n.innerHTML+' '+n.textContent);}
async function labText(page:Page){return page.getByTestId('objectx-lab').evaluate(n=>{const c=n.cloneNode(true) as HTMLElement;c.querySelectorAll('[data-testid=objectx-asteroid-list]').forEach(x=>x.remove());return c.innerHTML+' '+(c.textContent??'');});}
async function pageLeaks(page:Page){
 // The lab's answer choices list the five kinds for the student to pick from; the branch must not name them.
 const lab=await labText(page);
 return [...leaksIn(await branchText(page),HELP),...SECRETS.filter(s=>word(s).test(lab))];
}
async function slit(page:Page,code:string,telescope:string){
 await page.getByTestId('objectx-target').selectOption(code);
 await page.getByTestId('objectx-spectrum-telescope').selectOption({label:telescope});
 await button(page,'Place the slit on the object').click();
 await expect(page.getByTestId('objectx-spectrum-status')).not.toHaveText('Loading the spectrometer data…',{timeout:90_000});
}
async function expose(page:Page){
 await button(page,'Start spectrum').click();
 await expect(async()=>{const t=await page.getByTestId('objectx-spectrum-progress').textContent();expect(Number(/total counts (\d+)/.exec(t??'')?.[1]??0)).toBeGreaterThan(0);}).toPass({timeout:20_000});
 // A bright object may already have reached the signal-to-noise limit (the exposure then stops by itself).
 const stop=button(page,'Stop spectrum');if(await stop.isEnabled())await stop.click();await expect(stop).toBeDisabled();
}
test.describe.configure({timeout:240_000});
test('star, galaxy and QSO from the student path: observed, kept, downloaded, saved and restored without naming the object',async({page})=>{
 await openLab(page);
 const ready:string[]=[],csv:string[]=[];
 for(const [kind,code] of Object.entries(CODES)){
  await slit(page,code,'4.0 m');
  await expect(page.getByTestId('objectx-spectrum-status'),kind).toHaveText('ObjX-7: slit on the object with the 4.0 m telescope. Start the spectrum.');
  // The kept list grows from kind to kind; the rest of the branch must read the same.
  ready.push(await page.getByTestId('objectx-branch-spectrum').evaluate(n=>{const c=n.cloneNode(true) as HTMLElement;c.querySelector('[data-testid=objectx-spectra]')?.remove();return c.innerHTML;}));
  await expose(page);
  await button(page,'Keep this spectrum').click();
  const n=ready.length,label=`ObjX-7-S0${n}`;
  await expect(page.getByTestId('objectx-spectra').locator('li')).toHaveCount(n);
  await expect(page.getByTestId('objectx-spectrum-plot')).toHaveAttribute('aria-label',`Spectrum of ${label}: counts per channel from 3700 to 4700 Å`);
  const d=page.waitForEvent('download');await button(page,`Save ${label} spectrum (CSV)`).click();const dl=await d;
  expect(dl.suggestedFilename()).toBe(`${label}.csv`);const text=await readFile((await dl.path())!,'utf8');csv.push(text);
  expect(text.startsWith('wavelength_A,counts\r\n3700,')).toBe(true);expect(text.trim().split('\r\n')).toHaveLength(601);
  expect(leaksIn(text),kind).toEqual([]);expect(await pageLeaks(page),kind).toEqual([]);
  // Front S (S6): Save .SSP through the shared writer; the file and its header carry the label, the given coordinates and 0.000.
  const s=page.waitForEvent('download');await button(page,'Save spectrum (.SSP)').click();const sd=await s;
  expect(sd.suggestedFilename()).toBe(`${label}.ssp`);const ssp=await readFile((await sd.path())!,'latin1'),lines=ssp.split('\r\n');
  expect(lines[0]).toMatch(new RegExp(`^\\*SpHdr\\* ${label},-?\\d+\\.\\d{6},-?\\d+\\.\\d{5},0\\.000$`));expect(lines.filter(Boolean)).toHaveLength(601);expect(lines[1]).toMatch(/^3700\.00 /);
  expect(leaksIn(ssp),kind).toEqual([]);
 }
 // Before the exposure the branch read identically for the three kinds.
 expect(new Set(ready).size).toBe(1);
 // The saved investigation (v29: the kept spectra) names no object, kind or record before the reveal.
 const d=page.waitForEvent('download');await button(page,'Save investigation').click();
 const text=await readFile((await (await d).path())!,'utf8'),json=JSON.parse(text);
 expect(json.version).toBe(29);expect(json.base.version).toBe(28);expect(json.objectXSpectra.map((s:{label:string;code:string;telescope:number})=>[s.label,s.code,s.telescope])).toEqual([['ObjX-7-S01',CODES.star,2],['ObjX-7-S02',CODES.galaxy,2],['ObjX-7-S03',CODES.qso,2]]);
 // No object name or remark anywhere in the file; nothing engine-side in the Object X parts. The rest of the session holds fixed
 // app-wide fields that are the same for every object (the empty extended Hubble banks, the observing "star" bank, the
 // observatory's default selection and the analyzer's reference mode); only those may match the generic patterns.
 expect(SECRETS.filter(s=>word(s).test(text))).toEqual([]);
 expect(leaksIn(JSON.stringify([json.objectXSpectra,json.base.objectX]))).toEqual([]);
 const FIXED=/"[02]:NGC 48(74|89)"|"star": \{|"selectedId": "NGC3031"|"reference": "galaxy"/g;
 expect(leaksIn(text.replace(FIXED,''))).toEqual([]);
 // Restore in a fresh page: the kept spectra are rebuilt from their journals.
 const fresh=await page.context().newPage();await openLab(fresh);
 await fresh.getByLabel('Restore investigation JSON').setInputFiles({name:'objx.json',mimeType:'application/json',buffer:Buffer.from(text)});
 await expect(fresh.getByTestId('objectx-spectra').locator('li')).toHaveCount(3,{timeout:90_000});
 for(const [i,label] of ['ObjX-7-S01','ObjX-7-S02','ObjX-7-S03'].entries()){
  await button(fresh,`Show ${label}`).click();
  await expect(fresh.getByTestId('objectx-spectrum-plot')).toHaveAttribute('aria-label',`Spectrum of ${label}: counts per channel from 3700 to 4700 Å`,{timeout:60_000});
  const d2=fresh.waitForEvent('download');await button(fresh,`Save ${label} spectrum (CSV)`).click();
  expect(await readFile((await (await d2).path())!,'utf8'),label).toBe(csv[i]);// the same counts, rebuilt from the journal
 }
 expect(await pageLeaks(fresh)).toEqual([]);
});
test('unavailable results read the same for star, galaxy, QSO and pulsar; switching telescope clears the slit',async({page})=>{
 await openLab(page);
 const texts:string[]=[];
 for(const code of [CODES.star,CODES.galaxy,'X-3V2SL','X-Z2YY7']){// on the 0.4 m: row 9, row 8, 3C 273 (row 10), a pulsar (row 0)
  await slit(page,code,'0.4 m');
  await expect(page.getByTestId('objectx-spectrum-unavailable')).toHaveText(NEUTRAL);
  texts.push(await branchText(page));expect(await pageLeaks(page)).toEqual([]);
 }
 expect(new Set(texts).size).toBe(1);
 await page.getByTestId('objectx-spectrum-telescope').selectOption({label:'4.0 m'});
 await expect(page.getByTestId('objectx-spectrum-unavailable')).toHaveCount(0);
 await slit(page,'X-Z2YY7','4.0 m');await expect(page.getByTestId('objectx-spectrum-unavailable')).toHaveText(NEUTRAL);
});
test('the spectrometer at 320 px and in dark mode: no overflow, themed surface, no names',async({page})=>{
 for(const scheme of ['dark','light'] as const)for(const width of [320,1440]){
  await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:900});
  await openLab(page);await slit(page,CODES.galaxy,'4.0 m');await expose(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${scheme} ${width}px overflow`).toBe(true);
  const box=await page.getByTestId('objectx-spectrum-plot').boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(width);
  const bg=await page.getByTestId('objectx-branch-spectrum').evaluate(e=>getComputedStyle(e).backgroundColor);
  const raised=await page.evaluate(()=>{const p=document.createElement('div');p.style.background='var(--ov-surface-raised)';document.body.append(p);const c=getComputedStyle(p).backgroundColor;p.remove();return c;});
  expect(bg).toBe(raised);
  expect(await pageLeaks(page)).toEqual([]);
  await page.getByTestId('objectx-branch-spectrum').screenshot({path:test.info().outputPath(`object-x-spectrum-${scheme}-${width}.png`)});
 }
});

// Front S (S2): "save, then load" as one button. Classify receives the masked .SSP: its source is the label, and no object name,
// template or kind reaches the Classify page; Observational Data takes the label as the object ID.
// Review L6: one target of each spectroscopic kind (the masking does not depend on the kind).
for(const [kind,code] of Object.entries(CODES))test(`an Object X spectrum (${kind} target) opens in Classify under its label, without naming the object`,async({page})=>{
 await openLab(page);await slit(page,code,'4.0 m');await expose(page);
 await button(page,'Classify this spectrum').click();
 await expect(page).toHaveURL(/#classification$/);
 await expect(page.getByRole('button',{name:'Review classification',exact:true})).toBeEnabled();
 const main=page.locator('main.classification-main');
 const text=await main.evaluate(n=>n.innerHTML+' '+n.textContent);
 expect(text).toContain('ObjX-7.ssp');
 expect(SECRETS.filter(s=>word(s).test(text))).toEqual([]);expect(text).not.toMatch(/\.DAT@/);
 // Template file names: only those Classify always lists (its atlas), never one tied to this object.
 const names=(t:string)=>new Set([...t.matchAll(/A00000\d\d/gi)].map(m=>m[0].toUpperCase()));
 const fresh=await page.context().newPage();await fresh.goto('/#classification');await expect(fresh.getByRole('button',{name:'Review classification',exact:true})).toBeEnabled();
 const baseline=names(await fresh.locator('main.classification-main').evaluate(n=>n.innerHTML+' '+n.textContent));await fresh.close();
 expect([...names(text)].filter(n=>!baseline.has(n))).toEqual([]);
 await button(page,'Open observation results').click();await expect(page.getByTestId('observation-object')).toHaveText('ObjX-7');
});

// Front S (D4): until the reveal the header is masked (label, 0.000); after it, Save writes the catalog magnitude and the
// web record locator as the object [W] (VIREO's name per type is not recovered, U6). A file saved earlier is not rewritten, and the 600 data rows are the same.
test('after the reveal Save writes the revealed header; the earlier file and the data rows are unchanged',async({page})=>{
 await openLab(page);await slit(page,CODES.star,'4.0 m');await expose(page);
 const save=async()=>{const d=page.waitForEvent('download');await button(page,'Save spectrum (.SSP)').click();const dl=await d;return {name:dl.suggestedFilename(),path:(await dl.path())!};};
 const before=await save(),beforeText=await readFile(before.path,'latin1');
 expect(beforeText.split('\r\n')[0]).toMatch(/^\*SpHdr\* ObjX-7,.*,0\.000$/);
 await page.getByTestId('objectx-answer').getByLabel('star').check();
 await page.getByLabel('Describe your evidence').fill('Absorption lines of a cool star.');
 await button(page,'Reveal the identity').click();await button(page,'Reveal the identity').click();
 await expect(page.getByTestId('objectx-reveal')).toContainText('N3730-01103');
 await expect(button(page,'Save spectrum (.SSP)')).toBeEnabled();
 const after=await save(),afterText=await readFile(after.path,'latin1');
 expect(after.name).toBe(before.name);
 const [head,...rows]=afterText.split('\r\n');
 // The header object is the selected catalogue record as the engine names it (the star route writes the same form).
 expect(head).toMatch(/^\*SpHdr\* N3730\.DAT@\d+,-?\d+\.\d{6},-?\d+\.\d{5},\d+\.\d{3}$/);expect(head.endsWith(',0.000')).toBe(false);
 expect(rows).toEqual(beforeText.split('\r\n').slice(1));
 expect(await readFile(before.path,'latin1')).toBe(beforeText);
});
