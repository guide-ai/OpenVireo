import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import {readFile} from 'node:fs/promises';
import {okWithVelocity} from './fixtures/lss-velocity';
import {saveOffline} from './fixtures/offline-save';
// Front T: records made in the app carry the field's frozen observatory-clock JD, so a save is a v30 wrapper around the v27 layer.
// Front L2: v31 (native dialog record ids) wraps v30 (frozen field JDs), which wraps the v27 LSS layer.
const lssLayer=(d:{version:number;base?:unknown;lss?:unknown}):any=>(d.version===31||d.version===30?lssLayer(d.base as {version:number}):d);// eslint-disable-line @typescript-eslint/no-explicit-any
// M8: E02 records survive Save (session v27) and a fresh-context Restore that replays every journal; the student then keeps
// observing. Tampered and over-budget files are refused without changing the current survey.
async function save(page:Page){const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();return readFile((await(await d).path())!);}
async function restore(page:Page,buffer:Buffer,name='lss.json'){await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer});}
async function load(page:Page,field:string){await page.getByLabel('Survey field',{exact:true}).selectOption(field);await page.getByRole('button',{name:'Load selected list',exact:true}).click();await expect(page.getByTestId('lss-rows')).toBeVisible({timeout:30000});}
async function acquireAndRecord(page:Page,row:number,position:string,remarks:string){
 await page.getByTestId(`lss-row-${row}`).getByRole('button',{name:'Point and view',exact:true}).click();
 await page.getByRole('button',{name:'Activate spectrometer',exact:true}).click();
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.getByRole('button',{name:'Start exposure',exact:true}).click();await page.clock.runFor(1500);
 await page.getByRole('button',{name:'Pause exposure',exact:true}).click();await expect(page.getByTestId('lss-elapsed')).toHaveText('1500 ms');
 await page.getByLabel('z step',{exact:true}).fill('.001');await page.getByRole('button',{name:'Set step',exact:true}).click();await page.getByLabel('Shift',{exact:true}).fill(position);
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await page.getByLabel('Remarks',{exact:true}).fill(remarks);await okWithVelocity(page);
 await page.clock.resume();
}
async function survey(page:Page){await clickHeaderTool(page,'LSS survey');await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();}
test('E02 Save (v30 over v27) → fresh context Restore → records replayed, description kept, observing continues',async({page,browser})=>{
 test.setTimeout(180000);
 await page.clock.install();await page.goto('/');await survey(page);await load(page,'1');
 await acquireAndRecord(page,1,'20','first galaxy');
 await page.getByLabel('Describe the structure you see (not graded)',{exact:true}).fill('A wall near 12 h?');
 // Offline (Front F2): the replay reuses the verified CLEA_GLX.DAT, GLXYSP.LST, CLEA_QSO.DAT and GLIMAGES.LST.
 const saved=await saveOffline(page,()=>save(page)),data=JSON.parse(saved.toString());
 expect(data.version).toBe(31);expect(data.lssNativeDialogIds).toEqual([1]);expect(data.base.version).toBe(30);expect(data.base.lssFieldJds).toHaveLength(1);expect(lssLayer(data).version).toBe(27);expect(lssLayer(data).lss.records).toHaveLength(1);expect(lssLayer(data).lss.journals).toHaveLength(1);expect(lssLayer(data).lss.journals[0].events).toMatch(/^s 100\*15 p$/);expect(lssLayer(data).lssDigestSHA256).toMatch(/^[a-f0-9]{64}$/);
 // Fresh browser context: nothing in memory, restore from the file.
 const context=await browser.newContext(),fresh=await context.newPage();const errors:string[]=[];fresh.on('pageerror',e=>errors.push(e.message));
 await fresh.clock.install();await fresh.goto('/');await restore(fresh,saved);
 await expect(fresh.getByText('Session restored. The current spectrum and measurement arithmetic were checked.')).toBeAttached({timeout:30000});
 await survey(fresh);await expect(fresh.getByTestId('lss-record-count')).toHaveText('1 records');
 await expect(fresh.getByTestId('lss-results')).toContainText('first galaxy');
 await expect(fresh.getByLabel('Describe the structure you see (not graded)',{exact:true})).toHaveValue('A wall near 12 h?');
 await expect(fresh.getByRole('button',{name:'Plot my records in the wedge',exact:true})).toBeEnabled();
 await fresh.clock.resume();await load(fresh,'1');await acquireAndRecord(fresh,2,'25','second galaxy');
 await expect(fresh.getByTestId('lss-record-count')).toHaveText('2 records');
 const again=JSON.parse((await save(fresh)).toString());expect(lssLayer(again).lss.records.map((r:{remarks:string})=>r.remarks)).toEqual(['first galaxy','second galaxy']);
 expect(errors).toEqual([]);await context.close();
 // Tampered z and an over-budget record list are refused; the survey keeps its records.
 const tampered=JSON.parse(saved.toString());lssLayer(tampered).lss.records[0].zHex='3d000000';
 await restore(page,Buffer.from(JSON.stringify(tampered)));
 await expect(page.getByText('Could not restore this session: invalid format, content, numerical state or size. The current analysis was kept.')).toBeAttached({timeout:30000});
 const heavy=JSON.parse(saved.toString());lssLayer(heavy).lss.records=Array.from({length:251},(_,i)=>({...lssLayer(heavy).lss.records[0],id:i+1}));
 await restore(page,Buffer.from(JSON.stringify(heavy)));
 await expect(page.getByText('Could not restore this session: invalid format, content, numerical state or size. The current analysis was kept.')).toBeAttached({timeout:30000});
 await survey(page);await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
});
test('wedge options restore with the survey; restore drops the wedge’s own LSS points so a re-plot never duplicates them',async({page,browser})=>{
 test.setTimeout(180000);
 await page.clock.install();await page.goto('/');await survey(page);await load(page,'1');await acquireAndRecord(page,1,'20','one');
 await page.getByRole('button',{name:'Plot my records in the wedge',exact:true}).click();await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 1');
 await page.getByTestId('wedge-options-open').click();await page.getByTestId('wedge-grid-1').check();await page.getByTestId('wedge-size-3').check();await page.getByTestId('wedge-style-1').check();await page.getByTestId('wedge-options-ok').click();
 const saved=await save(page);expect(lssLayer(JSON.parse(saved.toString())).lss.wedgeOptions).toEqual({grid:1,pointSize:3,pointStyle:1});
 // Same page: restore clears the plotted own points; one re-plot gives one point, not two.
 await restore(page,saved);await expect(page.getByText('Session restored. The current spectrum and measurement arithmetic were checked.')).toBeAttached({timeout:30000});await clickHeaderTool(page,'LSS data');await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 0');
 await survey(page);await page.getByRole('button',{name:'Plot my records in the wedge',exact:true}).click();await expect(page.getByTestId('wedge-count')).toHaveText('Points Plotted: 1');
 await expect(page.getByTestId('wedge-point-0')).toHaveAttribute('r','3');await expect(page.getByTestId('wedge-point-0')).toHaveClass(/filled/);
 // Fresh context: the options come back with the file.
 const context=await browser.newContext(),fresh=await context.newPage();await fresh.goto('/');await restore(fresh,saved);
 await expect(fresh.getByText('Session restored. The current spectrum and measurement arithmetic were checked.')).toBeAttached({timeout:30000});
 await survey(fresh);await expect(fresh.getByTestId('lss-record-count')).toHaveText('1 records');
 await fresh.getByRole('button',{name:'Plot my records in the wedge',exact:true}).click();await expect(fresh.getByTestId('wedge-count')).toHaveText('Points Plotted: 1');
 await expect(fresh.locator('.wedge-text text[data-role="axis-title"]')).toHaveText('Z(=V/C)');await expect(fresh.getByTestId('wedge-point-0')).toHaveAttribute('r','3');
 // A file without wedge options resets them to the defaults.
 const plain=JSON.parse(saved.toString());lssLayer(plain).lss.wedgeOptions=null;
 const resaved=await (async()=>{await restore(fresh,Buffer.from(JSON.stringify(plain)));return true;})();expect(resaved).toBe(true);
 await expect(fresh.getByText('Session restored. The current spectrum and measurement arithmetic were checked.')).toBeAttached({timeout:30000});
 await clickHeaderTool(fresh,'LSS data');await fresh.getByTestId('wedge-options-open').click();await expect(fresh.getByTestId('wedge-grid-0')).toBeChecked();await expect(fresh.getByTestId('wedge-size-1')).toBeChecked();
 await context.close();
});
test('the description refuses pasted control characters inline and Save keeps working',async({page})=>{
 await page.goto('/#lss-survey');const box=page.getByLabel('Describe the structure you see (not graded)',{exact:true});
 await box.fill('Line one\nline two');await box.fill('bad\u0001text');
 await expect(page.getByText('The description cannot contain control characters other than line breaks and tabs.')).toBeVisible();await expect(box).toHaveValue('Line one\nline two');
 const data=JSON.parse((await save(page)).toString());expect(lssLayer(data).lss.description).toBe('Line one\nline two');
});
