import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Front K2.1/K2.2: observation-mode Display/Print Data and right click → Observational Data. Two synthetic records
// (analysis/front-k2/B-obs-mode-click.md §5, exact dyadic values; not observations).
const DAT=Buffer.from('07537461722030370000000000000000000000007083e34000000000000000f0004000000000000000c103400000000000000000000000000000000000ae024000000000000000a4024000000000000000000000000000000000000000000100000000000000000000000010506c656961646573206669656c6420410000000000000000000000000000000000000000054f62732d3200000000000000000000000000007883e340000000000000808d024000000000000000bd02c000000000000000b8024000000000000080ab024000000000000080a00240000000000000009a024000000000000000940240014811fe020000403c00c05a450a636865636b20737461720000000000000000000000000000000000000000000000000000','hex');
const LINES=[
 'Object ID    MJD(Days)      RA           Dec      U      B      V      R      I         Z      Spectrum     Comments',
 'Star 07     4982.000000   3h45m00.0s  24°07\'30"        10.875 10.250                                        Pleiades field A',
 'Obs-2       4982.250000   8h50m37.5s -11°48\'45" 11.500 10.719 10.031  9.625  9.250   1.172E-02 G2V          check star',
];
async function open(page:Page){
 await page.goto('/#cluster-database');const summary=page.getByText('HR diagram from saved observations',{exact:true});if(await summary.count())await summary.click();
 await page.getByLabel('Load saved observation results (DAT)',{exact:true}).setInputFiles({name:'k2.dat',mimeType:'application/octet-stream',buffer:DAT});
 await page.getByRole('button',{name:'Add to current results',exact:true}).click();
 await page.getByRole('button',{name:'Plot data from observations',exact:true}).click();
 await expect(page.getByTestId('cnhr-count')).toHaveText('# of Stars: 2');
}
/** A right click at plot pixel (x + 0.5, y + 0.5) of the SVG's own coordinates. */
async function rightClick(page:Page,x:number,y:number){
 await page.getByTestId('cnhr-plot').scrollIntoViewIfNeeded();
 const p=await page.getByTestId('cnhr-plot').evaluate((svg,[x,y])=>{const m=(svg as SVGSVGElement).getScreenCTM()!;const q=new DOMPoint(x+0.5,y+0.5).matrixTransform(m);return {x:q.x,y:q.y};},[x,y]);
 await page.mouse.click(p.x,p.y,{button:'right'});
}

test('Display/Print Data lists the records with VIREO\'s row writer; Save Text gives the same lines',async({page})=>{
 await open(page);
 await page.getByTestId('cnhr-display-data').click();
 await expect(page.getByRole('heading',{name:'Recorded Results - Computed Magnitudes'})).toBeVisible();
 for(const [i,line] of LINES.entries())await expect(page.getByTestId(`cnhr-results-line-${i}`)).toHaveText(line);
 await page.getByTestId('cnhr-results-list-menu').click();await page.getByTestId('cnhr-results-save-menu').click();
 const download=page.waitForEvent('download');await page.getByTestId('cnhr-results-save-displayed').click();const d=await download;
 expect(d.suggestedFilename()).toBe('Observations.TXT');
 expect((await readFile(await d.path())).toString('latin1')).toBe(LINES.map(l=>l+'\r\n').join(''));
 await page.getByTestId('fi-box').getByRole('button').click();
 await page.getByTestId('cnhr-results-list-menu').click();await page.getByTestId('cnhr-results-print').click();
 await expect(page.getByTestId('fi-print-lines')).toHaveText(LINES.join('\n'));
 await page.getByTestId('fi-print-close').click();
});

test('right click opens Observational Data for the nearest record; Cancel clears the marker, OK stores the remarks',async({page})=>{
 await open(page);
 await rightClick(page,215,246);// E1's drawn pixel
 const d=page.getByTestId('cnhr-obs-data');
 await expect(d).toBeVisible();
 await expect(d.getByTestId('cnhr-obs-data-id')).toHaveValue('Star 07');
 await expect(d.getByTestId('cnhr-obs-data-jd')).toHaveValue('2454982.000000');
 await expect(d.getByTestId('cnhr-obs-data-ra')).toHaveValue('03h 45m 00.00s');
 await expect(d.getByTestId('cnhr-obs-data-dec')).toHaveValue('+24° 07\' 30.0"');
 await expect(d.getByTestId('cnhr-obs-data-v')).toHaveValue('    10.250');
 await expect(d.getByTestId('cnhr-obs-data-u')).toHaveValue('');
 await expect(page.getByTestId('cnhr-selected')).toHaveAttribute('data-record','1');
 await d.getByTestId('cnhr-obs-data-cancel').click();
 await expect(d).toHaveCount(0);await expect(page.getByTestId('cnhr-selected')).toHaveCount(0);

 await rightClick(page,222,240);// E2's drawn pixel
 await expect(d.getByTestId('cnhr-obs-data-id')).toHaveValue('Obs-2');
 await expect(d.getByTestId('cnhr-obs-data-sp')).toHaveValue('G2V');
 await expect(d.getByTestId('cnhr-obs-data-z')).toHaveValue('1.172E-02');
 await expect(d.getByTestId('cnhr-obs-data-vel')).toHaveValue('3.500E+03');
 await expect(d.getByTestId('cnhr-obs-data-i')).toHaveValue('     9.250');
 await d.getByTestId('cnhr-obs-data-remarks').fill('rechecked');
 await d.getByTestId('cnhr-obs-data-ok').click();
 await expect(d).toHaveCount(0);await expect(page.getByTestId('cnhr-selected')).toHaveAttribute('data-record','2');
 await page.getByTestId('cnhr-display-data').click();
 await expect(page.getByTestId('cnhr-results-line-2')).toHaveText(LINES[2].replace('check star','rechecked'));
});
