import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
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
 await page.getByRole('button',{name:'Record Z',exact:true}).click();await page.getByLabel('Remarks',{exact:true}).fill(remarks);await page.getByRole('button',{name:'OK',exact:true}).click();
 await page.clock.resume();
}
async function survey(page:Page){await page.getByRole('button',{name:'LSS survey',exact:true}).click();await expect(page.getByRole('heading',{name:'Large-scale structure survey',exact:true})).toBeVisible();}
test('E02 Save (v27) → fresh context Restore → records replayed, description kept, observing continues',async({page,browser})=>{
 test.setTimeout(180000);
 await page.clock.install();await page.goto('/');await survey(page);await load(page,'1');
 await acquireAndRecord(page,1,'20','first galaxy');
 await page.getByLabel('Describe the structure you see (not graded)',{exact:true}).fill('A wall near 12 h?');
 const saved=await save(page),data=JSON.parse(saved.toString());
 expect(data.version).toBe(27);expect(data.lss.records).toHaveLength(1);expect(data.lss.records[0].journal.events.length).toBeGreaterThan(10);expect(data.lssDigestSHA256).toMatch(/^[a-f0-9]{64}$/);
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
 const again=JSON.parse((await save(fresh)).toString());expect(again.lss.records.map((r:{remarks:string})=>r.remarks)).toEqual(['first galaxy','second galaxy']);
 expect(errors).toEqual([]);await context.close();
 // Tampered z and an over-budget record list are refused; the survey keeps its records.
 const tampered=JSON.parse(saved.toString());tampered.lss.records[0].zHex='3d000000';
 await restore(page,Buffer.from(JSON.stringify(tampered)));
 await expect(page.getByText('Could not restore this session: invalid format, content, numerical state or size. The current analysis was kept.')).toBeAttached({timeout:30000});
 const heavy=JSON.parse(saved.toString());heavy.lss.records=Array.from({length:251},(_,i)=>({...heavy.lss.records[0],id:i+1}));
 await restore(page,Buffer.from(JSON.stringify(heavy)));
 await expect(page.getByText('Could not restore this session: invalid format, content, numerical state or size. The current analysis was kept.')).toBeAttached({timeout:30000});
 await survey(page);await expect(page.getByTestId('lss-record-count')).toHaveText('1 records');
});
