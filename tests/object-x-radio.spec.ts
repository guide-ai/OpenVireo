import {test,expect,type Locator,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {clickHeaderTool} from './fixtures/header-tools';
import {parsePulsarCatalog} from '../src/core/radioPulsarCatalog';
import {separationDegrees} from '../src/core/ephemeris';
import {OBJECT_X_HIDE_DEGREES,objectXCode} from '../src/core/objectXLab';
import {parseHtl} from '../src/core/hotList';

// E08 pulsar branch (review 2 M4) in the actual App: an Object X object is chosen, the radio route shows its coordinates in
// the fields of Set Coordinates, the student starts the pulsar setup (bundled Pulsars.dat), slews there, opens the receiver and
// records. The three ObjectX.HTL pulsars must pulse at their catalogue period; a non-pulsar must not. While the identity is
// hidden, no pulsar name (ObjectX.HTL identifier or remark, or the Pulsars.dat names of rows within 2°) may appear in the
// radio route: the receivers are labelled "ObjX-<ID>" as in the original Object X (X0b). Fake clock, as the radio journey spec.
// The capture is model output of the receiver simulation, not an observation.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
async function flush(page:Page){for(let i=0;i<3;i++)await page.evaluate(()=>new Promise<void>(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(0);}));}
async function advance(page:Page,ms:number){for(let t=0;t<ms;t+=200){await page.clock.runFor(Math.min(200,ms-t));await flush(page);}}
async function download(page:Page,target:Locator){const next=page.waitForEvent('download');await target.click();return readFile((await(await next).path())!);}

const HTL=parseHtl(new Uint8Array(readFileSync(new URL('../public/original/hotlists/ObjectX.HTL',import.meta.url))));
const parsed=parsePulsarCatalog(new Uint8Array(readFileSync(new URL('../public/original/radio/Pulsars.dat',import.meta.url))));
if(!parsed.ok)throw Error('Pulsars.dat');
const CATALOG=parsed.catalog;
const row=(id:string)=>HTL.find(r=>r.id.trim()===id)!;
const word=(s:string)=>new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^\\w])`);
/** Every name that would identify the object: its HTL identifier and remark, and the catalogue names of rows near it. */
function secrets(id:string){
 const r=row(id),near=CATALOG.filter(c=>separationDegrees(c.ra,c.dec,r.ra,r.dec)<=OBJECT_X_HIDE_DEGREES);
 return {near,names:[...new Set([r.id.trim(),...(/\s/.test(r.remarks.trim())?[r.remarks.trim()]:[]),...near.flatMap(c=>[c.primaryName,c.legacyName])].filter(Boolean))]};
}
async function radioText(page:Page){
 return page.evaluate(()=>[...document.querySelectorAll('main, dialog[open], [role=dialog]')].filter(e=>(e as HTMLElement).offsetParent!==null||e.tagName==='DIALOG')
  .map(e=>{const c=e.cloneNode(true) as HTMLElement;c.querySelectorAll('select').forEach(n=>n.remove());return c.textContent??'';}).join('\n'));
}
/** Folded profile of one channel of a .PLR capture at period P (seconds): the strongest bin's z-score over the other bins
 * (noise alone gives about 2 for tens of bins; a pulse stands well above). */
function foldContrast(capture:Buffer,period:number){
 const l=capture.toString('latin1').split('\r\n').filter(Boolean),dt=Number(l[3].split(',')[1]);
 const v=l.slice(4).map(r=>Number(r.split(',')[0])),bins=Math.max(8,Math.round(period/dt)),sum=new Array(bins).fill(0),n=new Array(bins).fill(0);
 v.forEach((x,i)=>{const b=Math.floor(((i*dt)%period)/period*bins)%bins;sum[b]+=x;n[b]++;});
 const prof=sum.map((s,i)=>n[i]?s/n[i]:0).filter((_,i)=>n[i]),max=Math.max(...prof),rest=prof.filter(x=>x!==max);
 const mean=rest.reduce((a,b)=>a+b,0)/rest.length,sd=Math.sqrt(rest.reduce((a,b)=>a+(b-mean)**2,0)/rest.length);
 return {contrast:sd>0?(max-mean)/sd:0,rows:v.length,bins:prof.length};
}

async function observe(page:Page,htlId:string){
 await page.clock.install({time:new Date('2026-10-24T00:00:00Z')});
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 await expect(id(page,'objectx-target').locator('option')).toHaveCount(18);
 await page.getByLabel('ID # of your unknown object (from the lab sheet or instructor)').fill('42');
 await id(page,'objectx-target').selectOption(objectXCode(htlId));
 // Both lazily loaded radio routes render before the fake clock pauses (as tests/radio-pulsar-timing-journey-app.spec.ts).
 await clickHeaderTool(page,'Radio data');await expect(id(page,'pulsar-none')).toBeVisible();
 await clickHeaderTool(page,'Radio telescope');await expect(page.getByRole('heading',{level:1,name:'Radio telescope control'})).toBeVisible();
 await page.clock.pauseAt(new Date('2026-10-24T00:10:00Z'));await flush(page);
 // Hand-off: the coordinates in the fields of Set Coordinates.
 const card=id(page,'objectx-radio-coordinates');await expect(card).toBeVisible();
 const values=[...(await card.getAttribute('data-ra'))!.split(' '),...(await card.getAttribute('data-dec'))!.split(' ')];
 await id(page,'radio-exercise-start').click();await flush(page);
 await expect(id(page,'radio-exercise-status')).toHaveAttribute('data-kind','started',{timeout:15_000});
 await expect(id(page,'pulsar-ref-name')).toHaveText('Pulsars.dat');
 // R3-L1: the radio Slew ▸ Hot List shows rows near the object under the hidden label only. Worst case: the student loads
 // ObjectX.HTL itself (it is fetchable from this origin), which names every object.
 const pulsarsHtl=readFileSync(new URL('../public/original/hotlists/ObjectX.HTL',import.meta.url));
 await id(page,'antenna-hotlist-file').setInputFiles({name:'ObjectX.HTL',mimeType:'application/octet-stream',buffer:pulsarsHtl});
 await id(page,'antenna-hotlist-open').click();await expect(id(page,'antenna-hotlist-rows')).toBeVisible();
 const rowsText=(await id(page,'antenna-hotlist-rows').textContent())??'';
 const htlNear=parseHtl(new Uint8Array(pulsarsHtl)).filter(r=>separationDegrees(r.ra,r.dec,row(htlId).ra,row(htlId).dec)<=OBJECT_X_HIDE_DEGREES).map(r=>r.id.trim());
 // Identifiers and catalogue names only: a remark can be shared with a distant row (two galaxies have the same one).
 const remark=row(htlId).remarks.trim();
 expect([...secrets(htlId).names.filter(n=>n!==remark),...htlNear].filter(s=>word(s).test(rowsText)),'hot-list rows').toEqual([]);
 expect(htlNear).toContain(htlId);expect(rowsText).toContain('ObjX-42');
 await id(page,'antenna-hotlist-close').click();await expect(id(page,'antenna-hotlist-dialog')).toHaveCount(0);
 await id(page,'antenna-set-coordinates').click();await expect(id(page,'antenna-dialog')).toBeVisible();
 // R3-L3: the dialog opens pre-filled with the object's coordinates (the same values the card shows).
 for(const [i,name] of ['raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds'].entries())await expect(id(page,`antenna-field-${name}`)).toHaveValue(values[i]);
 await id(page,'antenna-dialog-ok').click();await flush(page);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','confirm-slew');await id(page,'antenna-notice-yes').click();await flush(page);
 for(let i=0;i<600&&await id(page,'antenna-notice').count()===0;i++)await advance(page,200);
 await expect(id(page,'antenna-notice')).toHaveAttribute('data-kind','slew-complete');await id(page,'antenna-notice-ok').click();await flush(page);
 const r=row(htlId),ra=Number(await id(page,'antenna-ra').getAttribute('data-ra-hours')),dec=Number(await id(page,'antenna-dec').getAttribute('data-dec-degrees'));
 expect(separationDegrees(ra,dec,r.ra,r.dec),'pointing on the object').toBeLessThan(0.05);
 await id(page,'antenna-receiver-button').click();await expect(id(page,'receiver-card-0')).toBeVisible();
}
async function record(page:Page){
 await id(page,'receiver-record').click();await expect(id(page,'receiver-record-disp')).toHaveText('On');
 await id(page,'receiver-mode').click();await flush(page);await expect(id(page,'receiver-record-capturing')).toBeVisible();
 await advance(page,600);await id(page,'receiver-mode').click();await flush(page);
 for(let i=0;i<80&&await id(page,'receiver-workspace').getAttribute('data-timer')==='true';i++)await advance(page,200);
 await expect(id(page,'receiver-workspace')).toHaveAttribute('data-timer','false');
 await expect(id(page,'receiver-record-finish')).toHaveAttribute('data-stage','identify');
}

for(const pulsar of ['0329+54','0450-18','1919+21']){
 test(`the hidden pulsar ${pulsar} pulses at its catalogue period and is never named in the radio route`,async({page})=>{
  test.setTimeout(180_000);
  const {near,names}=secrets(pulsar),source=near.find(c=>c.legacyName===pulsar)!;expect(source).toBeDefined();
  await observe(page,pulsar);
  // The receiver says a pulsar is in the beam, under the hidden-object label.
  await expect(id(page,'receiver-heading-0')).toContainText('Pulsar ObjX-42');
  await record(page);
  await expect(id(page,'receiver-record-identify-input')).toHaveValue('ObjX-42');
  await expect(id(page,'receiver-source')).toHaveText('Profile source: ObjX-42');
  const text=await radioText(page);expect(names.filter(s=>word(s).test(text)),'names in the radio route').toEqual([]);
  await id(page,'receiver-record-identify-ok').click();await expect(id(page,'receiver-record-finish')).toHaveAttribute('data-stage','properties');
  await expect(id(page,'receiver-record-prop-object')).toHaveText('ObjX-42');
  await id(page,'receiver-record-properties-ok').click();await id(page,'receiver-record-save-no').click();await flush(page);
  await expect(id(page,'pulsar-memory')).toBeVisible();await expect(id(page,'pulsar-prop-object')).toHaveText('ObjX-42');await id(page,'pulsar-properties-close').click();
  await id(page,'pulsar-raw-export').click();
  const capture=await download(page,id(page,'pulsar-raw-export-download'));
  expect(capture.toString('latin1').split('\r\n')[0]).toMatch(/^'ObjX-42',100,/);
  const {contrast,rows,bins}=foldContrast(capture,source.x2a);
  await test.info().attach(`fold-${pulsar}.json`,{body:JSON.stringify({period:source.x2a,contrast,rows,bins}),contentType:'application/json'});
  // Measured with seed and fake clock fixed: z = 26.2 (0329+54), 6.0 (0450-18), 9.6 (1919+21); noise alone about 2.1.
  expect(contrast,`folded profile z at P = ${source.x2a} s`).toBeGreaterThan(4.5);
  const after=await radioText(page);expect(names.filter(s=>word(s).test(after)),'names after recording').toEqual([]);
  await page.screenshot({path:test.info().outputPath(`radio-${pulsar.replace('+','p')}.png`),fullPage:false});
 });
}

test('a hidden non-pulsar shows no pulsar in the beam and no pulse',async({page})=>{
 test.setTimeout(180_000);
 const target='NGC 4631',{names}=secrets(target);
 await observe(page,target);
 await expect(id(page,'receiver-heading-0')).toContainText('No Pulsar in Beam!');
 await record(page);
 await id(page,'receiver-record-identify-ok').click();await id(page,'receiver-record-properties-ok').click();await id(page,'receiver-record-save-no').click();await flush(page);
  await expect(id(page,'pulsar-memory')).toBeVisible();await expect(id(page,'pulsar-prop-object')).toHaveText('ObjX-42');await id(page,'pulsar-properties-close').click();
 await id(page,'pulsar-raw-export').click();
 const capture=await download(page,id(page,'pulsar-raw-export-download'));
 // Folded at each HTL pulsar's period, the noise shows no pulse.
 for(const p of ['0329+54','0450-18','1919+21']){
  const period=CATALOG.find(c=>c.legacyName===p)!.x2a;expect(foldContrast(capture,period).contrast,`no pulse at ${p}'s period`).toBeLessThan(4);
 }
 const text=await radioText(page);expect(names.filter(s=>word(s).test(text))).toEqual([]);
});
