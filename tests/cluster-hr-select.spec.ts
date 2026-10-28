import {test,expect,type Page} from '@playwright/test';
import witness from '../src/core/clusterHr.witness.json' with {type:'json'};

// Front V2 M3: right click on the database plot (0x543bfc / 0x544304) → Possible Cluster Member (TClstrStrForm1).
// The expected record of a probe pixel comes from the witness (analysis/front-v2-cluster-hr/tools/hr_witness.py).
const panel=(p:Page)=>p.locator('.cluster-database-lab');
const PROBE={x:0,y:414},PROBE_ID=witness.datasets['cluster-m67.json'].hitProbesSample['0,414'];
async function loadM67(p:Page){
 await p.goto('/#cluster-database');
 await panel(p).getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');
 await panel(p).getByRole('button',{name:'Load selected dataset',exact:true}).click();
 await expect(panel(p).getByTestId('db-hr-star-count')).toHaveText('# of Stars: 506');
}
/** Right click at a plot pixel (SVG user units → CSS pixels; +0.5 keeps the pointer inside that pixel). */
async function rightClick(p:Page,x:number,y:number){
 const svg=p.getByTestId('db-hr-plot');await svg.scrollIntoViewIfNeeded();
 const box=(await svg.boundingBox())!;
 await svg.click({button:'right',position:{x:(x+0.5)*box.width/496,y:(y+0.5)*box.height/506}});
}

test('a right click selects the nearest star in V-bank order and opens Possible Cluster Member; Remove asks VIREO\'s question',async({page})=>{
 await loadM67(page);
 await expect(panel(page).getByTestId('cluster-right-click-note')).toContainText('right-click a star');
 // A left click does nothing (VIREO reacts only to the right button).
 const svg=page.getByTestId('db-hr-plot');await svg.click({position:{x:10,y:10}});
 await expect(page.getByTestId('cluster-member')).toHaveCount(0);
 await rightClick(page,PROBE.x,PROBE.y);
 const w=page.getByTestId('cluster-member');
 await expect(w.getByRole('heading',{name:'Possible Cluster Member'})).toBeFocused();
 await expect(panel(page).getByLabel('Reference point to inspect or exclude',{exact:true})).toHaveValue(PROBE_ID);
 await expect(w.getByTestId('cluster-member-name')).toHaveText('M 67 (NGC 2682)');
 await expect(w.getByTestId('cluster-member-ra')).toHaveText(/^ {3}8h \d\dm \d\d\.\d\ds$/);
 await expect(w.getByTestId('cluster-member-dec')).toHaveText(/^ {2}11° \d\d' \d\d\.\d"$/);
 await expect(w.getByTestId('cluster-member-v')).toHaveText(/^\d+\.\d{3}$/);
 await expect(w.getByTestId('cluster-member-id')).toHaveText('not published');
 await expect(page.getByTestId('db-hr-marker')).toHaveCount(1);
 // Remove from HR Diagram: VIREO's question; No keeps the star, Yes removes it and hides the marker; the window stays.
 await w.getByTestId('cluster-member-menu').click();await w.getByTestId('cluster-member-remove').click();
 const q=w.getByTestId('cluster-member-question');
 await expect(q).toContainText('Verify Removal from Plot');
 await expect(q).toContainText('Are you sure you want to remove this star from the HR diagram?');
 await expect(q).toContainText('(Restore via "File"->"Restore Removed Points")');
 await q.getByRole('button',{name:'No'}).click();
 await expect(page.getByTestId('native-observed-point')).toHaveCount(506);
 await w.getByTestId('cluster-member-menu').click();await w.getByTestId('cluster-member-remove').click();
 await w.getByTestId('cluster-member-question').getByRole('button',{name:'Yes'}).click();
 await expect(page.getByTestId('native-observed-point')).toHaveCount(505);
 await expect(page.getByTestId('db-hr-marker')).toHaveCount(0);
 await expect(w.getByTestId('cluster-member-status')).toContainText('Removed from the HR diagram');
 await expect(panel(page).getByTestId('cluster-point-selection-count')).toHaveText('Included: 505 · excluded: 1 · original dataset: 506');
 // The hit test includes removed records (0x544304 has no removed-flag test): the same pixel finds the same star.
 await w.getByTestId('cluster-member-menu').click();await w.getByTestId('cluster-member-exit').click();
 await expect(w).toHaveCount(0);
 await rightClick(page,PROBE.x,PROBE.y);
 await expect(w.getByTestId('cluster-member-status')).toHaveText('This star is already removed from the plot.');
 await page.keyboard.press('Escape');await expect(w).toHaveCount(0);
 await panel(page).getByRole('button',{name:'Restore all excluded points',exact:true}).click();
 await expect(page.getByTestId('native-observed-point')).toHaveCount(506);
});

test('Possible Cluster Member fits a 320 px screen in the dark theme',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:320,height:800});
 await loadM67(page);
 await rightClick(page,PROBE.x,PROBE.y);
 const w=page.getByTestId('cluster-member');await expect(w).toBeVisible();
 const box=(await w.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
