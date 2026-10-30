import {test,expect,type Page} from '@playwright/test';
import witness from '../src/core/clusterHr.witness.json' with {type:'json'};
import detail from '../data/clusters/cluster-reference-detail.json' with {type:'json'};

// Front V2 review 1 fixes: keyboard route to Possible Cluster Member (M1), readable Clusters for Study rows (M2), CLEA Cluster
// Data print and Selection menu (L1, L2), native text positions (L3), observation Display/Print Data (L4).
const panel=(p:Page)=>p.locator('.cluster-database-lab');
const ID=witness.datasets['cluster-m67.json'].vBankFirst[0];
const NATIVE=(detail.points as unknown as Record<string,[string]>)[ID][0];
async function loadM67(p:Page){
 await p.goto('/#cluster-database');
 await panel(p).getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');
 await panel(p).getByRole('button',{name:'Load selected dataset',exact:true}).click();
 await expect(panel(p).getByTestId('db-hr-star-count')).toHaveText('# of Stars: 506');
}

test('keyboard only: choose a record, open Possible Cluster Member, use its menu, close and get focus back',async({page})=>{
 await loadM67(page);
 const chooser=panel(page).getByLabel('Reference point to inspect or exclude',{exact:true});
 await chooser.focus();await chooser.selectOption(ID);
 await page.keyboard.press('Tab');
 const open=panel(page).getByTestId('cluster-member-open');await expect(open).toBeFocused();
 await page.keyboard.press('Enter');
 const m=page.getByTestId('cluster-member');
 await expect(m.getByRole('heading',{name:'Possible Cluster Member'})).toBeFocused();
 await expect(m.getByTestId('cluster-member-id')).toHaveText(NATIVE);
 await expect(page.getByTestId('db-hr-marker')).toHaveCount(1);
 await page.keyboard.press('Tab');await expect(m.getByTestId('cluster-member-menu')).toBeFocused();
 await page.keyboard.press('Enter');await page.keyboard.press('Tab');
 await expect(m.getByTestId('cluster-member-add-hot-list')).toBeFocused();
 await page.keyboard.press('Escape');await expect(m.getByTestId('cluster-member-menu')).toBeFocused();
 await page.keyboard.press('Escape');await expect(m).toHaveCount(0);
 await expect(open).toBeFocused();
 await expect(panel(page).getByTestId('cluster-right-click-note')).toContainText('press "Possible Cluster Member…"');
});

for(const [width,scheme] of [[1440,'dark'],[320,'dark']] as const)
 test(`Clusters for Study rows are monospace and fully readable at ${width} px (${scheme})`,async({page})=>{
  await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:900});
  await page.goto('/#cluster-database');await panel(page).getByTestId('cluster-select-data').click();
  const list=page.getByTestId('cluster-list-lines');await expect(list.getByRole('option')).toHaveCount(22);
  const r=await list.evaluate(ul=>{const li=[...ul.querySelectorAll('li')];const cs=getComputedStyle(li[11]);
   return {mono:/mono|Menlo|Consolas|Courier/i.test(getComputedStyle(ul).fontFamily),ellipsis:cs.textOverflow,full:li.every(l=>l.scrollWidth<=l.clientWidth+1),
    scrolls:ul.scrollWidth>ul.clientWidth,charWidth:li[6].getBoundingClientRect().width/li[6].textContent!.length};});
  expect(r.mono).toBe(true);expect(r.ellipsis).not.toBe('ellipsis');expect(r.full).toBe(true);
  if(width===320)expect(r.scrolls).toBe(true);
  await expect(list.getByRole('option').nth(11)).toHaveText('30 Doradus (LMC)         05 39 00.0   -69 06 00     450    Many(!) OB *s & SGs');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 });

test('CLEA Cluster Data hides the Selection menu and prints the student page with the laboratory line',async({page})=>{
 await loadM67(page);
 await panel(page).getByTestId('cluster-display-data').click();
 const w=page.getByTestId('cluster-report');await expect(w.getByRole('heading',{name:'CLEA Cluster Data'})).toBeVisible();
 await expect(w.getByTestId('cluster-report-selection-menu')).toHaveCount(0);
 await expect(w.getByTestId('cluster-report-selection')).toHaveCount(0);
 await w.getByTestId('cluster-report-list-menu').click();await w.getByTestId('cluster-report-print').click();
 await expect(page.getByRole('dialog').filter({hasText:'Laboratory Table Number (Not Recorded)'})).toBeVisible();
});

test('the cluster name and star count are right-aligned at the frame edge with VIREO\'s text tops',async({page})=>{
 await loadM67(page);
 for(const [id,y] of [['db-hr-name','15'],['db-hr-star-count','33']] as const){
  const t=page.getByTestId(id);
  await expect(t).toHaveAttribute('x','440');await expect(t).toHaveAttribute('y',y);
  await expect(t).toHaveAttribute('text-anchor','end');await expect(t).toHaveAttribute('dominant-baseline','hanging');
 }
});

test('observation Display/Print Data is visible and waits for plotted records (Front K2: the row writer is ported)',async({page})=>{
 await page.goto('/#cluster-database');
 const summary=page.getByText('HR diagram from saved observations',{exact:true});if(await summary.count())await summary.click();
 const b=page.getByTestId('cnhr-display-data');await expect(b).toBeVisible();await expect(b).toBeDisabled();
 // The Recorded Results list itself is covered by tests/cluster-k2-observation.spec.ts.
});
