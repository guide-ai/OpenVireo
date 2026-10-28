import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';

// E08 spectrometer branch (Front F API wired under D5). Star, galaxy and QSO targets: the slit, the exposure and the plot never
// name the object, its kind or a catalogue record; unavailable results read the same for every kind.
const HTL=readFileSync(new URL('../public/original/hotlists/ObjectX.HTL',import.meta.url));
const short=(at:number)=>HTL.subarray(at+1,at+1+HTL[at]).toString('latin1').trim();
const SECRETS=Array.from({length:HTL.length/86},(_,i)=>[short(i*86),short(i*86+45)]).flat().filter(Boolean);
// Engine-side names that must never reach the page: catalogue records, templates, photographs, kind words in the branch.
const ENGINE=[/\.DAT@/,/A00000\d\d/i,/\.BMP/i,/NGC ?\d{4}/,/GLXYSP|QSOSpect|JSPEC2/,/\b(quasar|QSO|galaxy|star)\b/i];
const CODES={star:'X-NTFB6',galaxy:'X-ZATDM',qso:'X-PRNJS'} as const;// rows 9, 8, 1
async function openLab(page:Page){
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 await expect(page.getByTestId('objectx-target').locator('option')).toHaveCount(18);
 await page.locator('[data-testid=objectx-lab] input').first().fill('7');
}
async function branchText(page:Page){
 const html=await page.getByTestId('objectx-branch-spectrum').evaluate(n=>n.innerHTML+' '+n.textContent);
 // The fixed help sentence names the three kinds generically; check everything else.
 return html.replace('Stars, galaxies and quasars are told apart by their spectra.','');
}
async function leaks(page:Page){
 const t=await branchText(page),lab=await page.getByTestId('objectx-lab').evaluate(n=>{const c=n.cloneNode(true) as HTMLElement;c.querySelectorAll('[data-testid=objectx-asteroid-list]').forEach(x=>x.remove());return c.textContent??'';});
 return [...SECRETS.filter(s=>new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^\\w])`).test(lab)),...ENGINE.filter(r=>r.test(t)).map(String)];
}
async function slit(page:Page,code:string,telescope:string){
 await page.getByTestId('objectx-target').selectOption(code);
 await page.getByTestId('objectx-spectrum-telescope').selectOption({label:telescope});
 await page.getByRole('button',{name:'Place the slit on the object',exact:true}).click();
 await expect(page.getByTestId('objectx-spectrum-status')).not.toHaveText('Loading the spectrometer data…',{timeout:90_000});
}
test.describe.configure({timeout:180_000});
test('star, galaxy and QSO: a spectrum is recorded on the 4.0 m and nothing names the object',async({page})=>{
 await openLab(page);
 const ready:string[]=[];
 for(const [kind,code] of Object.entries(CODES)){
  await slit(page,code,'4.0 m');
  await expect(page.getByTestId('objectx-spectrum-status'),kind).toHaveText('ObjX-7: slit on the object with the 4.0 m telescope. Start the spectrum.');
  ready.push(await branchText(page));
  await page.getByRole('button',{name:'Start spectrum',exact:true}).click();
  await expect(async()=>{const t=await page.getByTestId('objectx-spectrum-progress').textContent();expect(Number(/total counts (\d+)/.exec(t??'')?.[1]??0)).toBeGreaterThan(0);}).toPass({timeout:20_000});
  // A bright object may already have reached the signal-to-noise limit (the exposure then stops by itself).
  const stop=page.getByRole('button',{name:'Stop spectrum',exact:true});if(await stop.isEnabled())await stop.click();
  await expect(stop).toBeDisabled();
  await expect(page.getByTestId('objectx-spectrum-plot')).toHaveAttribute('aria-label','Spectrum of ObjX-7: counts per channel from 3700 to 4700 Å');
  expect(await leaks(page),kind).toEqual([]);
 }
 // Before the exposure the branch reads identically for the three kinds.
 expect(new Set(ready).size).toBe(1);
});
test('unavailable results read the same for star, galaxy and QSO; switching telescope clears the slit',async({page})=>{
 await openLab(page);
 const texts:string[]=[];
 for(const code of [CODES.star,CODES.galaxy,'X-3V2SL']){// row 10 (QSO) is beyond the 0.4 m detector too
  await slit(page,code,'0.4 m');
  await expect(page.getByTestId('objectx-spectrum-unavailable')).toHaveText("The signal is beyond what this telescope's detector can record. Try another telescope.");
  texts.push(await branchText(page));expect(await leaks(page)).toEqual([]);
 }
 expect(new Set(texts).size).toBe(1);
 await page.getByTestId('objectx-spectrum-telescope').selectOption({label:'4.0 m'});
 await expect(page.getByTestId('objectx-spectrum-unavailable')).toHaveCount(0);
 // A pulsar's coordinates hold nothing this version can measure.
 await slit(page,'X-Z2YY7','4.0 m');
 await expect(page.getByTestId('objectx-spectrum-unavailable')).toHaveText('No spectrum can be recorded at these coordinates: the slit holds nothing this version can measure.');
 expect(await leaks(page)).toEqual([]);
});
