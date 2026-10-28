import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {clickHeaderTool} from './fixtures/header-tools';
import {paceDownload} from './fixtures/download-pacing';

// Front V: catalog search (web adaptation) → Variable Star Data (TVStarListForm1) → Simulated Light Curve (TLtCrvDsplyForm1).
// Expected texts and pixels come from the Python witness (src/core/variableStars.controls.json), not from the app.
type Case={index:number;name:string;lines:string[];linesAfterDefault:string[];periodZero:boolean;plot:{faintBound:number;brightBound:number;curveY?:number[]}};
const witness=JSON.parse(await readFile(new URL('../src/core/variableStars.controls.json',import.meta.url),'utf8')) as {cases:Case[]};
const byName=(name:string)=>witness.cases.find(c=>c.name===name)!;

async function openRoute(page:Page){
 await page.goto('/');
 await clickHeaderTool(page,'Variable stars');
 await expect(page).toHaveURL(/#variable-stars$/);
 await expect(page.getByRole('heading',{name:'Variable stars and light curves',level:1})).toBeVisible();
 await expect(page.getByTestId('variable-count')).toContainText('31,147 matching records',{timeout:20_000});
}
async function openRecord(page:Page,name:string){
 await page.getByTestId('variable-name').fill(name);
 await page.getByRole('button',{name:`Open ${name}`,exact:true}).click();
 await expect(page.getByTestId('vstar-list-window')).toBeVisible();
}

test('search, open a record and display its simulated light curve',async({page})=>{
 await openRoute(page);
 await expect(page.getByTestId('variable-adaptation')).toContainText('Catalog Object');
 await page.getByTestId('variable-type').selectOption('DCEP');
 await expect(page.getByTestId('variable-count')).toContainText('Showing the first 100 of 440');
 await page.getByTestId('variable-type').selectOption('');
 const c=byName('del Cep');
 await openRecord(page,'del Cep');
 await expect(page.getByTestId('vstar-lines')).toHaveText(c.lines.join('\n'));
 await page.getByTestId('vstar-data-menu').click();
 await page.getByTestId('vstar-display-curve').click();
 const svg=page.getByTestId('light-curve-svg');
 await expect(svg).toBeVisible();
 await expect(svg).toHaveAttribute('data-faint-bound',String(c.plot.faintBound));
 await expect(svg).toHaveAttribute('data-bright-bound',String(c.plot.brightBound));
 const points=await svg.locator('polyline').getAttribute('points');
 expect(points!.split(' ').map(p=>Number(p.split(',')[1]))).toEqual(c.plot.curveY);
 await expect(svg.locator('text',{hasText:/^del Cep$/})).toHaveCount(1);
 await expect(svg.locator('text',{hasText:/^V mag$/})).toHaveCount(1);
 await expect(svg.locator('text',{hasText:/^Phase$/})).toHaveCount(1);
 await expect(page.getByTestId('light-curve-unavailable')).toHaveCount(0);
 // List Type Codes only toggles its own check mark.
 await page.getByTestId('vstar-data-menu').click();
 await expect(page.getByTestId('vstar-type-codes')).toHaveAttribute('aria-checked','true');
 await page.getByTestId('vstar-type-codes').click();
 await expect(page.getByTestId('vstar-type-codes')).toHaveAttribute('aria-checked','false');
 await expect(page.getByTestId('vstar-lines')).toHaveText(c.lines.join('\n'));
 // File › Exit closes the light curve; Data › Close closes both windows.
 await page.getByTestId('curve-file-menu').click();await page.getByTestId('curve-exit').click();
 await expect(page.getByTestId('light-curve-window')).toHaveCount(0);
 await page.getByTestId('vstar-data-menu').click();await page.getByTestId('vstar-close').click();
 await expect(page.getByTestId('vstar-list-window')).toHaveCount(0);
});

test('a record without a period shows the axes and the typed reason, not a curve',async({page})=>{
 await openRoute(page);
 const c=witness.cases.find(x=>x.periodZero)!;
 await openRecord(page,c.name);
 await page.getByTestId('vstar-data-menu').click();await page.getByTestId('vstar-display-curve').click();
 const svg=page.getByTestId('light-curve-svg');
 await expect(svg.locator('[data-part=box]')).toHaveCount(1);
 await expect(svg.locator('polyline')).toHaveCount(0);
 await expect(page.getByTestId('light-curve-unavailable')).toHaveAttribute('data-reason','period-zero');
});

test('a zero M-m/D becomes 0.50 in the list after the light curve is opened, as in VIREO',async({page})=>{
 await openRoute(page);
 const c=witness.cases.find(x=>x.lines[9].endsWith('0.00')&&!x.periodZero)!;
 await openRecord(page,c.name);
 await expect(page.getByTestId('vstar-lines')).toHaveText(c.lines.join('\n'));
 await page.getByTestId('vstar-data-menu').click();await page.getByTestId('vstar-display-curve').click();
 await expect(page.getByTestId('vstar-lines')).toHaveText(c.lines.join('\n'));// the open list is not refreshed
 await page.getByRole('button',{name:`Open ${c.name}`,exact:true}).click();
 await expect(page.getByTestId('vstar-lines')).toHaveText(c.linesAfterDefault.join('\n'));
 await expect(page.getByTestId('vstar-rise-defaulted')).toBeVisible();
});

test('Save Text › As Displayed downloads the list lines with CRLF',async({page})=>{
 await openRoute(page);
 const c=byName('RR Lyr');
 await openRecord(page,'RR Lyr');
 await page.getByTestId('vstar-data-menu').click();await page.getByTestId('vstar-save-menu').click();
 await paceDownload(page);
 const d=page.waitForEvent('download');await page.getByTestId('vstar-save-displayed').click();
 const download=await d;
 expect(download.suggestedFilename()).toBe('RR_Lyr.TXT');
 const bytes=await readFile((await download.path())!);
 expect(bytes.toString('latin1')).toBe(c.lines.map(l=>l+'\r\n').join(''));
 await expect(page.getByTestId('vstar-notice')).toHaveText('Report Text Written to RR_Lyr.TXT.');
});

test('Help shows the VarTypeHlp.TXT sections and Print opens a preview',async({page})=>{
 await openRoute(page);
 await openRecord(page,'del Cep');
 await page.getByTestId('vstar-help').click();
 const help=page.getByTestId('vstar-help-panel');
 await expect(help.getByRole('heading',{level:4})).toHaveText(['Pulsating Variable Types','Rotating Variable Types','Eruptive Variable Types','Explosive/Cataclysmic Variable Types','Eclipsing Variable Types']);
 await expect(help).toContainText('DCEP/CEP    Classical Cepheids');
 await page.getByTestId('vstar-data-menu').click();await page.getByTestId('vstar-display-curve').click();
 await page.getByTestId('curve-file-menu').click();await page.getByTestId('curve-print').click();
 const preview=page.getByTestId('variable-print-preview');
 await expect(preview).toBeVisible();
 await expect(preview).toContainText('CLEA Exercise "VIREO - The VIRtual Educational Observatory" - Simulated Light Curve');
 await expect(preview).toContainText('(Screen Image Printed on Next Page)');
 await expect(page.getByTestId('variable-print-svg').locator('polyline')).toHaveAttribute('stroke','#000000');
 await page.getByTestId('variable-print-close').click();
 await expect(preview).toHaveCount(0);
});

test('works at 320 px without horizontal page scroll',async({page})=>{
 await page.setViewportSize({width:320,height:800});
 await openRoute(page);
 await openRecord(page,'omi Cet');
 await page.getByTestId('vstar-data-menu').click();await page.getByTestId('vstar-display-curve').click();
 await expect(page.getByTestId('light-curve-svg')).toBeVisible();
 const box=await page.getByTestId('light-curve-svg').boundingBox();
 expect(box!.width).toBeLessThanOrEqual(320);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await page.getByTestId('variable-guide').locator('summary').click();
 await expect(page.getByTestId('variable-guide')).toContainText('not an observation');
});
