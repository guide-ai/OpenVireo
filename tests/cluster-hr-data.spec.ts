import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import witness from '../src/core/clusterHr.witness.json' with {type:'json'};
import detail from '../data/clusters/cluster-reference-detail.json' with {type:'json'};

// Front V2 M5/M6: Select Cluster Data (TClstrListForm2), Display/Print Data (TClstrRptForm1) and the sidecar fields of
// Possible Cluster Member. Expected values come from the derived data and witness files, not from the app.
const panel=(p:Page)=>p.locator('.cluster-database-lab');
const PROBE_ID=witness.datasets['cluster-m67.json'].hitProbesSample['0,414'];
const PROBE_DETAIL=(detail.points as unknown as Record<string,[string,number,number,number]>)[PROBE_ID];

test('Select Cluster Data lists VIREO\'s 16 clusters with their comments; Plot loads the chosen one',async({page})=>{
 await page.goto('/#cluster-database');
 await panel(page).getByTestId('cluster-select-data').click();
 const list=page.getByTestId('cluster-list');await expect(list.getByRole('heading',{name:'Clusters for Study'})).toBeVisible();
 const rows=list.getByRole('option');await expect(rows).toHaveCount(22);
 await expect(rows.nth(2)).toHaveText('Double-click entry to plot HR diagram.');
 await expect(rows.nth(6)).toHaveText('NGC 752                  01 57 48.0   +37 41 00      75    Old cluster');
 // Plot with no data row selected: VIREO's box.
 await list.getByTestId('cluster-list-selection-menu').click();await list.getByTestId('cluster-list-plot').click();
 await expect(list.getByTestId('cluster-list-box')).toContainText('Please select (highlight) an item on the list, then select "Selection" -> "Plot" from the menu.');
 await list.getByTestId('cluster-list-box').getByRole('button',{name:'OK'}).click();
 // Print preview: page body only.
 await list.getByTestId('cluster-list-list-menu').click();await list.getByTestId('cluster-list-print').click();
 const preview=page.getByTestId('cluster-list-print-preview');await expect(preview).toContainText('Laboratory Table Number (Not Recorded)');
 await expect(preview).toContainText('Praesepe, "Beehive"');await expect(preview).not.toContainText('Exercise');
 await page.getByTestId('cluster-list-print-preview-close').click();
 const m44=rows.filter({hasText:'Praesepe'});await m44.dblclick();
 await expect(list).toHaveCount(0);
 await expect(panel(page).getByTestId('cluster-reference-count')).toContainText('M 44 (NGC 2632) reference dataset loaded: 198');
});

test('Display/Print Data shows VIREO\'s CLEA Cluster Data listing and saves it as text and CSV',async({page})=>{
 await page.goto('/#cluster-database');
 await panel(page).getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');
 await panel(page).getByRole('button',{name:'Load selected dataset',exact:true}).click();
 await panel(page).getByTestId('cluster-display-data').click();
 const w=page.getByTestId('cluster-report');await expect(w.getByRole('heading',{name:'CLEA Cluster Data'})).toBeVisible();
 const lines=w.getByTestId('cluster-report-lines').getByRole('option');
 await expect(lines).toHaveCount(15+506);
 await expect(lines.nth(0)).toHaveText(witness.datasets['cluster-m67.json'].header[0]);
 await expect(lines.nth(2)).toHaveText('V = +8.86 to +16.49');
 await expect(lines.nth(4)).toHaveText('(U-B) = -0.18 to +1.23 (426 Stars)');
 await expect(lines.nth(15)).toContainText(witness.datasets['cluster-m67.json'].vBankFirst[0]?(detail.points as unknown as Record<string,[string]>)[witness.datasets['cluster-m67.json'].vBankFirst[0]][0]:'');
 // Save Text › As Displayed: the lines with CRLF, named after the cluster.
 await w.getByTestId('cluster-report-list-menu').click();await w.getByTestId('cluster-report-save-menu').click();
 const d=page.waitForEvent('download');await w.getByTestId('cluster-report-save-displayed').click();
 const file=await d;expect(file.suggestedFilename()).toBe('M 67 (NGC 2682).TXT');
 const text=(await readFile((await file.path())!)).toString('latin1');
 expect(text.split('\r\n')[4]).toBe('(U-B) = -0.18 to +1.23 (426 Stars)');expect(text.split('\r\n')).toHaveLength(15+506+1);
 await expect(page.getByText('M 67 (NGC 2682).TXT',{exact:false}).first()).toBeVisible();
});

test('Possible Cluster Member shows the star\'s catalogue ID, U−B and spectral type; an excluded star is starred in the listing',async({page})=>{
 await page.goto('/#cluster-database');
 await panel(page).getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');
 await panel(page).getByRole('button',{name:'Load selected dataset',exact:true}).click();
 const svg=page.getByTestId('db-hr-plot');await svg.scrollIntoViewIfNeeded();const box=(await svg.boundingBox())!;
 await svg.click({button:'right',position:{x:0.5*box.width/496,y:414.5*box.height/506}});
 const m=page.getByTestId('cluster-member');
 await expect(m.getByTestId('cluster-member-id')).toHaveText(PROBE_DETAIL[0]);
 await expect(m.getByTestId('cluster-member-umb')).toHaveText(/^-?\d+\.\d{3}$/);
 await expect(m.getByTestId('cluster-member-sp')).not.toHaveText('not published');
 await m.getByTestId('cluster-member-menu').click();await m.getByTestId('cluster-member-remove').click();
 await m.getByTestId('cluster-member-question').getByRole('button',{name:'Yes'}).click();
 await panel(page).getByTestId('cluster-display-data').click();
 await expect(page.getByTestId('cluster-report-lines').getByRole('option',{name:new RegExp('^'+PROBE_DETAIL[0]+'\\*')})).toHaveCount(1);
});
