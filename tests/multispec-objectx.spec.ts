import{test,expect,type Page,type Locator}from'@playwright/test';
import{readFileSync}from'node:fs';
import{readFile}from'node:fs/promises';
import{paceDownload}from'./fixtures/download-pacing';

// Front M (M4): Multi-Spec in the Object X lab (exercise mode 1: clicks armed). Before the reveal no ObjectX.HTL identifier or
// remark and no catalogue name of the field reaches the DOM (Information included), the .SSP names (Show Object ID on) or the
// Save All zip entries; after the reveal the names return. Target: ObjectX.HTL row 10 (no other Object X position within
// 2° + 0.375°, so the reveal unmasks the field).
test.describe.configure({timeout:240_000});
const HTL=readFileSync(new URL('../public/original/hotlists/ObjectX.HTL',import.meta.url));
const short=(at:number)=>HTL.subarray(at+1,at+1+HTL[at]).toString('latin1').trim();
const SECRETS=Array.from({length:HTL.length/86},(_,i)=>[short(i*86),short(i*86+45)]).flat().filter(Boolean);
const ENGINE=[/\.DAT@/,/A00000\d\d/i,/\.BMP/i,/NGC ?\d{4}/,/GLXYSP|QSOSpect|JSPEC2/,/\b(quasar|QSO|galaxy|star)\b/i,/objectx-row/];
const CODE='X-3V2SL';
const word=(s:string)=>new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^\\w])`);
const branch=(p:Page)=>p.getByTestId('objectx-branch-multispec');
async function at(field:Locator,x:number,y:number){const b=(await field.boundingBox())!;await field.click({position:{x:(x+.5)*b.width/312,y:(y+.5)*b.height/312}});}
async function ok(page:Page){const box=page.getByTestId('ms-box');await box.getByRole('button',{name:'OK',exact:true}).click();await expect(box).toHaveCount(0);}
async function download(page:Page,click:()=>Promise<void>){await paceDownload(page);const d=page.waitForEvent('download');await click();const e=await d;return {name:e.suggestedFilename(),bytes:await readFile((await e.path())!)};}
function zipNames(b:Buffer){const out:string[]=[];let o=0;while(b.readUInt32LE(o)===0x04034b50){const size=b.readUInt32LE(o+18),n=b.readUInt16LE(o+26);out.push(b.subarray(o+30,o+30+n).toString('latin1'));o+=30+n+size;}return out;}
const html=(p:Page)=>branch(p).evaluate(n=>n.innerHTML+' '+(n.textContent??''));
/** Open every spectrum and read its Information lines (the dialog is modal: one at a time). */
async function informations(page:Page,count:number){
 const out:string[][]=[];
 await page.getByTestId('ms-open-all').click();await expect(page.getByTestId('ms-spectrum')).toHaveCount(count);
 for(let i=0;i<count;i++){
  const s=page.getByTestId('ms-spectrum').nth(i);
  await expect.poll(async()=>await s.getByTestId('ms-plot').count()?'plot':await s.getByTestId('ms-spectrum-status').innerText(),{timeout:90_000}).not.toBe('Computing this spectrum…');
  if(await s.getByTestId('ms-information').isDisabled()){out.push([await s.getByTestId('ms-spectrum-status').innerText()]);continue;}
  await s.getByTestId('ms-information').click();const info=page.getByTestId('ms-info');
  out.push(await info.locator('li').allInnerTexts());await info.getByRole('button',{name:'OK',exact:true}).click();await expect(info).toHaveCount(0);
 }
 return out;
}

test('Object X: before the reveal nothing names the target or its neighbours; after the reveal names return',async({page})=>{
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 await expect(page.getByTestId('objectx-target').locator('option')).toHaveCount(18);
 await page.locator('[data-testid=objectx-lab] input').first().fill('7');
 await expect(branch(page).getByTestId('ms-objectx-status')).toHaveText('Choose a target first.');
 await page.getByTestId('objectx-target').selectOption(CODE);
 await branch(page).getByTestId('ms-access').click();await ok(page);
 await expect(page.getByTestId('ms-armed')).toHaveText('Object selection is on (Object X).');
 const field=branch(page).getByTestId('ms-field');await expect(field).toBeVisible({timeout:90_000});await expect(field).toHaveAttribute('data-armed','true');
 // Show Object ID on: names must still stay out of list items, captions, file names and the zip.
 await page.getByTestId('ms-show-id').check();await page.getByTestId('ms-show-mag').check();
 await expect(page.getByTestId('ms-masked-note')).toBeVisible();
 // The target at the centre, three neighbours, one sky fibre.
 for(const [x,y] of [[156,156],[100,100],[220,90],[60,250],[300,4]])await at(field,x,y);
 const n=await page.locator('[data-testid^=ms-marker-]').count();expect(n).toBeGreaterThanOrEqual(4);
 await page.getByTestId('ms-minutes').fill('0.05');await page.getByTestId('ms-init').click();await page.getByTestId('ms-go').click();
 await expect(page.getByTestId('ms-list')).toBeVisible({timeout:20_000});
 for(let i=0;i<n;i++)await expect(page.getByTestId(`ms-item-${i}`)).toHaveText(`  (${i+1})  `);
 const before=await informations(page,n);
 expect(before[0][0]).toBe('Object: ObjX-7');
 for(const lines of before){
  expect(lines.some(l=>/^V Magnitude|^Spectral Type|^Galaxy Type|^Spectrum: |^Z: /.test(l)),lines.join('|')).toBe(false);
  expect(lines[0]).toMatch(/^(Object: ObjX-7|Object: Name hidden during Object X|Object: Sky|No measurable spectrum for this fibre\.)$/);
 }
 const captions=await page.getByTestId('ms-spectrum-caption').allInnerTexts();
 const ready=page.getByTestId('ms-spectrum').filter({has:page.getByTestId('ms-plot')});
 const ssp=await download(page,()=>ready.first().getByTestId('ms-save').click());expect(ssp.name).toMatch(/^MSpec_\d+\.SSP$/);
 const zip=await download(page,()=>page.getByTestId('ms-save-all').click());const entries=zipNames(zip.bytes);
 expect(entries.length).toBeGreaterThan(0);for(const e of entries)expect(e).toMatch(/^MSpec_\d+\.SSP$/);
 const beforeText=[await html(page),...before.flat(),...captions,ssp.name,...entries].join('\n');
 expect(SECRETS.filter(s=>word(s).test(beforeText))).toEqual([]);expect(ENGINE.filter(r=>r.test(beforeText)).map(String)).toEqual([]);
 await page.getByTestId('ms-close-all').click();
 // Reveal: the names come back (Information, list items and file names with Show Object ID).
 await page.getByRole('radio',{name:'quasar (QSO)'}).check();
 await page.getByRole('button',{name:'Reveal the identity',exact:true}).click();await page.getByRole('button',{name:'Reveal the identity',exact:true}).click();
 await expect(page.getByTestId('objectx-reveal')).toBeVisible();
 await expect(page.getByTestId('ms-masked-note')).toHaveCount(0,{timeout:20_000});
 const after=await informations(page,n);
 expect(after[0][0]).not.toBe('Object: ObjX-7');expect(after[0][0]).toMatch(/^Object: \S/);
 expect(after.some(lines=>lines.some(l=>l.startsWith('V Magnitude: ')))).toBe(true);
 const names=after.map(l=>l[0]).filter(l=>l.startsWith('Object: ')&&l!=='Object: Sky').map(l=>l.slice(8));
 expect(names.length).toBeGreaterThan(0);
 await expect(page.getByTestId('ms-item-0')).toHaveText(new RegExp(`^  \\(1\\)  ${names[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
 // None of these catalogue names was shown before the reveal.
 for(const name of names)expect(beforeText.includes(name),name).toBe(false);
 const named=await download(page,()=>page.getByTestId('ms-spectrum').first().getByTestId('ms-save').click());expect(named.name).toBe(`${names[0]}.SSP`.replace(/[^\x20-\x7e]|[\\/:*?"<>|]/g,'_'));
});
