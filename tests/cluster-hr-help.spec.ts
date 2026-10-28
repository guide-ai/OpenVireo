import {test,expect,type Page} from '@playwright/test';
import contract from '../data/photometry/cluster-comparison-contract.json' with {type:'json'};

// Front V2 M1: VIREO HR Help (HRAnalHlp.LST/.TXT) through the recovered help viewer. Expected rows come from the witness
// (src/core/cleaHelp.witness.json), not from the app.
const panel=(p:Page)=>p.locator('.cluster-database-lab');
const help=(p:Page)=>p.getByTestId('cluster-help');
async function loadM67(p:Page){
 const c=contract.clusters.find(x=>x.id==='m67')!;
 await p.goto('/#cluster-database');
 await panel(p).getByLabel('Reference cluster dataset',{exact:true}).selectOption('m67');
 await panel(p).getByRole('button',{name:'Load selected dataset',exact:true}).click();
 await expect(panel(p).getByTestId('cluster-reference-count')).toContainText(`${c.rows} catalog points`);
}
async function openTopics(p:Page){
 await p.getByTestId('cluster-help-open').click();
 const list=p.getByTestId('cluster-help-topics');await expect(list).toBeVisible();
 await expect(list.getByRole('heading',{name:'Select Help Topic'})).toBeVisible();
 return list;
}
async function topicsMenu(p:Page,item:string){await p.getByTestId('cluster-help-topics-menu').click();await p.getByTestId(item).click();}
async function topicMenu(p:Page,item:string){await p.getByTestId('cluster-help-topic-menu').click();await p.getByTestId(item).click();}

test('Help lists the 18 index rows, finds a topic, reads it, follows a related topic and goes back',async({page})=>{
 await loadM67(page);
 const list=await openTopics(page);
 const options=list.getByRole('option');
 await expect(options).toHaveCount(18);
 await expect(options.nth(0)).toHaveText('-Load/Plot Data-');
 await expect(options.nth(9)).toHaveText('  -Display/Fit Isochrone-');
 // Find Topic: exact title, case-insensitive.
 await topicsMenu(page,'cluster-help-find-topic');
 await page.getByTestId('cluster-help-search-query').fill('fit zero-age main sequence');
 await page.getByTestId('cluster-help-search-top').click();
 await expect(options.nth(7)).toHaveAttribute('aria-selected','true');
 // A substring is not a title: VIREO's "Not Found" box.
 await topicsMenu(page,'cluster-help-find-topic');
 await page.getByTestId('cluster-help-search-query').fill('Fit Zero');
 await page.getByTestId('cluster-help-search-top').click();
 const box=page.getByTestId('cluster-help-message');
 await expect(box).toContainText('String Not Found');await expect(box).toContainText('"Fit Zero" Not Found.');
 await box.getByRole('button',{name:'OK'}).click();
 await topicsMenu(page,'cluster-help-read-topic');
 const win=page.getByTestId('cluster-help-window');
 await expect(win.getByRole('heading',{name:'Help - Fit Zero-Age Main Sequence'})).toBeVisible();
 await expect(win.getByRole('option')).toHaveCount(26);
 await expect(page.getByTestId('cluster-help-back')).toBeDisabled();
 // A related-topic row opens that topic; Back returns.
 await win.getByRole('option',{name:'Display Zero-Age Main Sequence'}).dblclick();
 await expect(win.getByRole('heading',{name:'Help - Display Zero-Age Main Sequence'})).toBeVisible();
 await page.getByTestId('cluster-help-back').click();
 await expect(win.getByRole('heading',{name:'Help - Fit Zero-Age Main Sequence'})).toBeVisible();
 await expect(page.getByTestId('cluster-help-back')).toBeDisabled();
 // Search Text selects the row that contains the text.
 await topicMenu(page,'cluster-help-search-text');
 await page.getByTestId('cluster-help-search-query').fill('slider');
 await page.getByTestId('cluster-help-search-top').click();
 await expect(win.locator('[aria-selected=true]')).toHaveCount(1);
 // Print Topic: the page body only.
 await page.evaluate(()=>{window.print=()=>{};});
 await topicMenu(page,'cluster-help-print-topic');
 const preview=page.getByTestId('cluster-help-print');
 await expect(preview).toContainText('Laboratory Table Number (Not Recorded)');
 await expect(preview).toContainText('CLEA Exercise "VIREO - The VIRtual Educational Observatory" - ');
 await expect(preview).toContainText('[student and lab text entered in VIREO: not recovered on this site]');
 await expect(preview).toContainText('Help - Fit Zero-Age Main Sequence');
 await page.getByTestId('cluster-help-print-close').click();await expect(preview).toHaveCount(0);
 await topicMenu(page,'cluster-help-close-topic');
 await expect(win).toHaveCount(0);await expect(page.getByTestId('cluster-help-open')).toBeFocused();
});

test('a heading row answers with VIREO\'s box, a separator does nothing, and Escape closes the topic list',async({page})=>{
 await loadM67(page);
 const list=await openTopics(page),options=list.getByRole('option');
 await options.nth(0).dblclick();
 const box=page.getByTestId('cluster-help-message');
 await expect(box).toContainText('Topic Heading');await expect(box).toContainText('Select a Topic Under "-Load/Plot Data-"');
 await box.getByRole('button',{name:'OK'}).click();
 await options.nth(4).dblclick();
 await expect(list.getByRole('status')).toHaveText('No topic on this line (VIREO beeps here).');
 // Keyboard: arrows move, Enter reads.
 await options.nth(1).click();await list.getByRole('listbox').press('ArrowDown');await list.getByRole('listbox').press('Enter');
 await expect(page.getByTestId('cluster-help-window').getByRole('heading',{name:'Help - Load Data from Cluster Database'})).toBeVisible();
 await openTopics(page);await page.keyboard.press('Escape');
 await expect(page.getByTestId('cluster-help-topics')).not.toBeVisible();
});

test('Help refuses files that do not match their recorded SHA-256',async({page})=>{
 await page.route('**/original/cluster-help/HRAnalHlp.TXT',route=>route.fulfill({status:200,body:Buffer.alloc(7557,0x41)}));
 await loadM67(page);
 await page.getByTestId('cluster-help-open').click();
 await expect(help(page).getByRole('alert')).toContainText('did not match their recorded size and SHA-256');
 await expect(page.getByTestId('cluster-help-topics')).toHaveCount(0);
});

test('Help works at 320 px and in the dark theme',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:320,height:800});
 await loadM67(page);
 const list=await openTopics(page);
 await list.getByRole('option').nth(16).dblclick();
 await expect(page.getByTestId('cluster-help-window').getByRole('heading',{name:'Help - Display/Print Cluster Age/Distance Parameters'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
