import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {setVireoOptions} from './fixtures/vireo-options';

// Front R4d: VIREO's spectrometer Object / App. Mag (V) boxes, Save default name and print lines follow Show Object ID / Show
// Object Mag (0x50df64, 0x50e00b, 0x50fb1c, 0x510954). Off (compiled): no boxes and the usual file names. Object X: nothing is
// named at any of the 17 ObjectX.HTL targets, whatever the options say.
test.describe.configure({timeout:600_000});
const HTL=readFileSync(new URL('../public/original/hotlists/ObjectX.HTL',import.meta.url));
const short=(at:number)=>HTL.subarray(at+1,at+1+HTL[at]).toString('latin1').trim();
const SECRETS=Array.from({length:HTL.length/86},(_,i)=>[short(i*86),short(i*86+45)]).flat().filter(Boolean);
const ENGINE=[/\.DAT@/,/A00000\d\d/i,/\.BMP/i,/NGC ?\d{4}/,/GLXYSP|QSOSpect|JSPEC2/,/\b(quasar|QSO|galaxy|star)\b/i];
const HELP=['Stars, galaxies and quasars are told apart by their spectra.'];
const word=(s:string)=>new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^\\w])`);
function leaksIn(text:string,generic:readonly string[]=[]){let t=text;for(const g of generic)t=t.split(g).join('');return [...SECRETS.filter(s=>word(s).test(t)),...ENGINE.filter(r=>r.test(t)).map(String)];}
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const HIDDEN='Name hidden during Object X';

async function starRoute(page:Page){
 await page.clock.install();await page.goto('/#spectrometer');await page.getByRole('link',{name:'Open supported star exposure',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Catalog star exposure',exact:true})).toBeVisible();
}
async function acquireStar(page:Page){
 await page.getByRole('button',{name:'Activate supported star field',exact:true}).click();await expect(page.getByTestId('star-phase')).toHaveText('Ready / paused');
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Start star exposure',exact:true}).click();
 await page.clock.runFor(1000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
}
async function saveSsp(page:Page){
 const panel=page.getByTestId('ob-spectrum-save'),save=panel.getByRole('button',{name:'Save spectrum (.SSP)',exact:true});await expect(save).toBeEnabled();
 const d=page.waitForEvent('download');await save.click();const dl=await d;return {name:dl.suggestedFilename(),bytes:await readFile((await dl.path())!)};
}

test('star route: off shows no boxes and keeps the web file name; on shows the name, V, Name.SSP and the print lines, same bytes',async({page})=>{
 await starRoute(page);
 await expect(page.getByTestId('spec-readout')).toHaveCount(0);
 await acquireStar(page);
 const off=await saveSsp(page);expect(off.name).toMatch(/^openvireo-star-.*\.ssp$/);
 await expect(page.getByTestId('ob-spectrum-print-object')).toHaveCount(0);
 // The Classification guide forces both options on, as VIREO's Stellar Spectra menu does; here they are set in the dialog.
 await setVireoOptions(page,{'show-object-id':true,'show-object-mag':true});
 await expect(page.getByRole('heading',{name:'Catalog star exposure',exact:true})).toBeVisible();
 const id=page.getByTestId('spec-readout-id'),mag=page.getByTestId('spec-readout-mag');
 await expect(id).not.toHaveText('Telescope',{timeout:60_000});
 const name=(await id.textContent())!;
 expect(name.length).toBeGreaterThanOrEqual(13);expect(name.trim()).toMatch(/^\S/);expect(name).not.toBe(HIDDEN);
 await expect(mag).toHaveText(/^ *\d+\.\d\d$/);expect((await mag.textContent())!.length).toBeGreaterThanOrEqual(6);
 await acquireStar(page);
 const on=await saveSsp(page);expect(on.name).toBe(`${name.trim()}.SSP`);
 // The header is not an option reader: the .SSP starts with the same header as the one saved with the options off.
 expect(on.bytes.toString('latin1').split('\r\n')[0]).toBe(off.bytes.toString('latin1').split('\r\n')[0]);
 await expect(page.getByTestId('ob-spectrum-print-object')).toHaveText(new RegExp(`^Object: ${name.trim()}\\nApparent Magnitude \\(V\\): ${(await mag.textContent())!.trim().replace('.','\\.')}$`));
 // Show Object Mag alone: the magnitude box stays, the Object box goes, Save is the web name again.
 await setVireoOptions(page,{'show-object-id':false});
 await expect(page.getByTestId('spec-readout-id')).toHaveCount(0);await expect(page.getByTestId('spec-readout-mag')).toHaveText(/\d+\.\d\d$/,{timeout:60_000});
});

test('sky route: the Object box reads Sky and the magnitude box is empty',async({page})=>{
 await page.goto('/#observatory');await setVireoOptions(page,{'show-object-id':true,'show-object-mag':true});
 await page.evaluate(()=>{location.hash='spectrometer';});
 await page.getByRole('link',{name:'Open supported sky exposure',exact:true}).click();
 await expect(page.getByTestId('spec-readout-id')).toHaveText('Sky');await expect(page.getByTestId('spec-readout-mag')).toHaveText('');
});

// Review 1 M1: VIREO reads the sky when the slit object's throughput 0x50f338 is 0 (0x50db1a). 0.001 h east of N0000.DAT@63282
// (beyond 0.00028 h) the engine reports slit-empty for that star: the boxes read Sky and an empty magnitude, not its name and V.
async function pointAndUse(page:Page,ra:string,dec:string){
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await page.getByRole('button',{name:/^Telescope/}).click();
 if(!await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 if(await page.getByRole('button',{name:'Turn tracking on',exact:true}).isVisible())await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();
 await page.evaluate(()=>{location.hash='spectrometer';});await expect(page.getByTestId('field-spectrometer')).toBeVisible({timeout:30_000});
 await expect(page.getByTestId('field-spec-use')).toBeEnabled({timeout:20_000});await page.getByTestId('field-spec-use').click();
}
test('field spectrometer: a star outside the slit is a sky reading (Sky, no magnitude); in the slit it is named',async({page})=>{
 await page.goto('/#observatory');await setVireoOptions(page,{'show-object-id':true,'show-object-mag':true});
 await pointAndUse(page,'2.5135473','0.25592');
 await expect(page.getByTestId('field-spec-reasons')).toHaveAttribute('data-reasons','slit-empty',{timeout:90_000});
 await expect(page.getByTestId('field-spec-object')).toContainText('N0000.DAT@63282');
 await expect(page.getByTestId('spec-readout-id')).toHaveText('Sky');await expect(page.getByTestId('spec-readout-mag')).toHaveText('');
 await page.evaluate(()=>{location.hash='observatory';});await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15_000});
 await pointAndUse(page,'2.5125473','0.25592');
 // After L4 an in-slit field can have no reasons at all, so the reasons line may be absent.
 await expect(page.getByTestId('field-spec-field')).toBeVisible({timeout:90_000});await expect(page.getByTestId('field-spec-reasons')).toHaveCount(0,{timeout:90_000});
 await expect(page.getByTestId('spec-readout-id')).toHaveText(/^ *N0000-01634$/,{timeout:60_000});await expect(page.getByTestId('spec-readout-mag')).toHaveText(/^ *6\.00$/);
});

test('Object X: at all 17 targets, with both options on, the boxes, Save name and header, print, CSV and Classify name nothing',async({page})=>{
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 const codes=await page.evaluate(`(async()=>{const lab=await import('/src/core/objectXLab.ts'),hl=await import('/src/core/hotList.ts');
  const rows=hl.parseHtl(new Uint8Array(await (await fetch('/original/hotlists/ObjectX.HTL')).arrayBuffer()));return lab.objectXTargets(rows).map(t=>t.code);})()`) as string[];
 expect(codes).toHaveLength(17);
 await setVireoOptions(page,{'show-object-id':true,'show-object-mag':true});
 await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 await page.locator('[data-testid=objectx-lab] input').first().fill('7');
 const branch=page.getByTestId('objectx-branch-spectrum');
 let exposed=0,classified=false;
 for(const code of codes){
  await page.getByTestId('objectx-target').selectOption(code);
  await page.getByTestId('objectx-spectrum-telescope').selectOption({label:'4.0 m'});
  await button(page,'Place the slit on the object').click();
  await expect(page.getByTestId('objectx-spectrum-status')).not.toHaveText('Loading the spectrometer data…',{timeout:90_000});
  await expect(page.getByTestId('objectx-spec-readout-id'),code).toHaveText(HIDDEN);await expect(page.getByTestId('objectx-spec-readout-mag'),code).toHaveText('');
  expect(leaksIn(await branch.evaluate(n=>n.innerHTML+' '+n.textContent),HELP),code).toEqual([]);
  const startButton=button(page,'Start spectrum');
  if(!await startButton.isVisible()||!await startButton.isEnabled())continue;
  await startButton.click();
  await expect(async()=>{const t=await page.getByTestId('objectx-spectrum-progress').textContent();expect(Number(/total counts (\d+)/.exec(t??'')?.[1]??0)).toBeGreaterThan(0);}).toPass({timeout:20_000});
  const stop=button(page,'Stop spectrum');if(await stop.isEnabled())await stop.click();await expect(stop).toBeDisabled();
  exposed++;
  const s=await saveSsp(page);expect(s.name,code).toBe('ObjX-7.ssp');
  const text=s.bytes.toString('latin1');expect(text.split('\r\n')[0],code).toMatch(/^\*SpHdr\* ObjX-7,-?\d+\.\d{6},-?\d+\.\d{5},0\.000$/);expect(leaksIn(text),code).toEqual([]);
  await expect(page.getByTestId('ob-spectrum-print-object')).toHaveCount(0);
  if(exposed===1){
   await button(page,'Keep this spectrum').click();
   const d=page.waitForEvent('download');await button(page,'Save ObjX-7-S01 spectrum (CSV)').click();const dl=await d;
   expect(dl.suggestedFilename()).toBe('ObjX-7-S01.csv');expect(leaksIn(await readFile((await dl.path())!,'utf8'))).toEqual([]);
  }
 }
 expect(exposed).toBeGreaterThanOrEqual(3);
 // Classify (one target; the masking does not depend on the kind): the file and the Observational Data ID are the label.
 for(const code of codes){
  await page.getByTestId('objectx-target').selectOption(code);await button(page,'Place the slit on the object').click();
  await expect(page.getByTestId('objectx-spectrum-status')).not.toHaveText('Loading the spectrometer data…',{timeout:90_000});
  const startButton=button(page,'Start spectrum');if(!await startButton.isVisible()||!await startButton.isEnabled())continue;
  await startButton.click();
  await expect(async()=>{const t=await page.getByTestId('objectx-spectrum-progress').textContent();expect(Number(/total counts (\d+)/.exec(t??'')?.[1]??0)).toBeGreaterThan(0);}).toPass({timeout:20_000});
  const stop=button(page,'Stop spectrum');if(await stop.isEnabled())await stop.click();await expect(stop).toBeDisabled();
  await button(page,'Classify this spectrum').click();await expect(page).toHaveURL(/#classification$/);
  const main=page.locator('main.classification-main');await expect(page.getByRole('button',{name:'Review classification',exact:true})).toBeEnabled({timeout:30_000});
  const text=await main.evaluate(n=>n.innerHTML+' '+n.textContent);expect(text).toContain('ObjX-7.ssp');
  expect(SECRETS.filter(s=>word(s).test(text))).toEqual([]);expect(text).not.toMatch(/\.DAT@/);
  await button(page,'Open observation results').click();await expect(page.getByTestId('observation-object')).toHaveText('ObjX-7');
  classified=true;break;
 }
 expect(classified).toBe(true);
});
