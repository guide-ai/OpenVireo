import {test,expect,type Page} from '@playwright/test';
import witness from '../src/help/helpAll.witness.json' with {type:'json'};
// Re-pinned 2026-10-31 (Front S2 round 3, D2): Classify now opens at VIREO's 3700–4700 Å (the page's one spectrometer range) instead of 3900–4500 Å; windows, readings and tick positions follow that view.

// Front H (docs/CLEA-HELP.md): VIREO's Help in every window that has one, the main and radio Help menus, Websites, About,
// the Exit Observatory reminder and the Spectral Line Table. Expected rows and texts are copied from the bundled original
// files (public/original/help); window → index mapping from analysis/front-h-help/RECOVERY.md.
const id=(p:Page,t:string)=>p.getByTestId(t);
async function firstTopic(page:Page,prefix:string,firstRow:string,topic:string,caption:string,text:string){
 await id(page,`${prefix}-open`).click();
 const rows=id(page,`${prefix}-topic-list`).getByRole('option');
 await expect(rows.first()).toHaveText(firstRow);
 await rows.filter({hasText:topic}).first().dblclick();
 const w=id(page,`${prefix}-window`);
 await expect(w.getByRole('heading',{name:caption})).toBeFocused();
 await expect(id(page,`${prefix}-topic-text`)).toContainText(text);
 await id(page,`${prefix}-topic-menu`).click();await id(page,`${prefix}-close-topic`).click();
 await expect(w).toHaveCount(0);await expect(id(page,`${prefix}-open`)).toBeFocused();
}

test('each instrument window opens its own VIREO help index',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await firstTopic(page,'telescope-help','-Telescope Controls-','"Tracking"','Help - "Tracking"','');
 await firstTopic(page,'camera-help','-Taking CCD Images-','Set Exposure','Help - Set Exposure','exposure');
 // The rows each index shows, from the witness (analysis/front-h-help/tools/help_all_witness.py).
 for(const [route,prefix,list] of [['#photometer','photo-help','PHOTOHLP.LST'],['#spectrometer','spectrometer-index-help','SPECHLP.LST'],['#classification','class-help','CLASSHLP.LST'],
  ['#spectrum','measure-help','MEASHLP.LST'],['#lss-wedge','wedge-help','WDGPLTHLP.LST'],['#pulsar-analysis','pulsar-analysis-help','PLSANHLP.LST']] as const){
  await page.goto('/'+route);
  await id(page,`${prefix}-open`).click();
  const expected=(witness.lists as Record<string,{rows:string[];topics:{index:number}[]}>)[list];
  const rows=id(page,`${prefix}-topic-list`).getByRole('option');
  await expect(rows).toHaveCount(expected.rows.length);await expect(rows.first()).toHaveText(expected.rows[0]);
  const at=expected.topics[0].index;await rows.nth(at).dblclick();
  await expect(id(page,`${prefix}-window`).getByRole('heading',{name:`Help - ${expected.rows[at].trim()}`})).toBeVisible();
 }
});

// Open topic A, then topic B from the topic list: other windows push both ([A, B], Back enabled); pulsar analysis pushes
// neither (0x56e634 leaves THelpWin+0x56c unset), so Back stays disabled. No PULSRANL.TXT topic has a related-topic link.
async function twoTopics(page:Page,prefix:string,a:string,b:string){
 await id(page,`${prefix}-open`).click();
 await id(page,`${prefix}-topic-list`).getByRole('option',{name:a}).dblclick();
 await expect(id(page,`${prefix}-window`)).toBeVisible();
 await id(page,`${prefix}-topic-menu`).click();await id(page,`${prefix}-window`).getByRole('button',{name:'Show Help Topics...'}).click();
 await id(page,`${prefix}-topic-list`).getByRole('option',{name:b}).dblclick();
 await expect(id(page,`${prefix}-window`).getByRole('heading',{name:`Help - ${b}`})).toBeVisible();
}
test('pulsar analysis does not add its topics to the Back history (0x56e634); other windows do',async({page})=>{
 await page.goto('/#pulsar-analysis');
 await twoTopics(page,'pulsar-analysis-help','Load Recorded Pulsar Data','Save Recorded Pulsar Data');
 await expect(id(page,'pulsar-analysis-help-back')).toBeDisabled();
 const photo=(witness.lists as Record<string,{rows:string[];topics:{index:number}[]}>)['PHOTOHLP.LST'];
 const [a,b]=photo.topics.slice(0,2).map(t=>photo.rows[t.index].trim());
 await page.goto('/#photometer');
 await twoTopics(page,'photo-help',a,b);
 await expect(id(page,'photo-help-back')).toBeEnabled();
 await id(page,'photo-help-back').click();
 await expect(id(page,'photo-help-window').getByRole('heading',{name:`Help - ${a}`})).toBeVisible();
});

test('the spectrometer Help is in the windows where students take spectra (TSpectrometer)',async({page})=>{
 const spec=(witness.lists as Record<string,{rows:string[]}>)['SPECHLP.LST'];
 for(const [route,prefix] of [['#star-exposure','star-spectrometer-help'],['#galaxy-exposure','galaxy-spectrometer-help']]){
  await page.goto('/'+route);
  // Visited routes stay mounted but hidden; the role query sees only this route's button.
  const open=page.getByRole('button',{name:'Help for the spectrometer',exact:true});
  await expect(open).toHaveCount(1);await expect(open).toHaveAttribute('data-testid',`${prefix}-open`);await open.click();
  await expect(page.getByTestId(`${prefix}-topic-list`).getByRole('option').first()).toHaveText(spec.rows[0]);
  await page.keyboard.press('Escape');await expect(open).toBeFocused();
 }
});

test('main window Help offers OpenVireo\'s own help, the tour, Websites and About; VIREO\'s main-window help is gone (Front WebHelp, Onboarding)',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await expect(id(page,'page-bar-help').getByTestId('main-help-menu')).toHaveAccessibleName('Help menu of the observatory');
 await id(page,'main-help-menu').click();
 const items=id(page,'page-bar-help').locator('.fi-menu-list > button');
 await expect(items).toHaveText(['Help topics…?','Take the tour of the site','Websites ›','About OpenVireo and privacy']);
 await expect(id(page,'main-help-web')).toHaveAttribute('aria-keyshortcuts','?');
 await expect(page.getByTestId('main-help-menu-topics')).toHaveCount(0);await expect(page.getByTestId('main-help-about')).toHaveCount(0);
 await id(page,'main-help-web').click();
 const help=id(page,'web-help');await expect(help).toBeVisible();
 await expect(help.getByRole('heading',{name:'OpenVireo help'})).toBeVisible();
 await expect(id(page,'web-help-topic')).toHaveAttribute('data-topic','welcome');
 await expect(id(page,'web-help-topic')).not.toContainText('Log In');
 await id(page,'web-help-topics').getByRole('button',{name:'Coming from VIREO (Windows)'}).click();
 await expect(id(page,'web-help-topic').getByRole('heading',{name:'Coming from VIREO (Windows)'})).toBeFocused();
 await expect(id(page,'web-help-topics').getByRole('button',{name:'Coming from VIREO (Windows)'})).toHaveAttribute('aria-current','true');
 await expect(id(page,'web-help-topic').getByRole('row',{name:/File › Run Exercise/})).toContainText('Exercise guides');
 await id(page,'web-help-topic').getByRole('button',{name:'Saving your work'}).click();
 await expect(id(page,'web-help-topic')).toHaveAttribute('data-topic','saving');
 await page.keyboard.press('Escape');await expect(help).toHaveCount(0);await expect(id(page,'main-help-menu')).toBeFocused();
 // The ? key opens Help topics from anywhere except a text field.
 await page.getByRole('heading',{name:'Start with the sky.'}).click();await page.keyboard.press('?');await expect(help).toBeVisible();
 await page.keyboard.press('Escape');await expect(help).toHaveCount(0);
 await page.getByLabel('Search catalog',{exact:true}).fill('M8');await page.keyboard.press('?');
 await expect(help).toHaveCount(0);
});

test('on a phone, Help is in the top bar (outside Tools), and its help fits the screen',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await expect(id(page,'main-help-menu')).toBeVisible();
 await expect(page.getByRole('banner').getByRole('button',{name:'Tools'})).toHaveAttribute('aria-expanded','false');
 await id(page,'main-help-menu').click();await id(page,'main-help-web').click();
 const help=id(page,'web-help');await expect(help).toBeVisible();
 expect(await help.evaluate(d=>d.scrollWidth<=d.clientWidth&&d.getBoundingClientRect().right<=window.innerWidth)).toBe(true);
 await id(page,'web-help-close').click();await expect(help).toHaveCount(0);await expect(id(page,'main-help-menu')).toBeFocused();
 // With the Tools panel open, Escape in the help closes only the help (review 1 S1).
 await page.getByRole('banner').getByRole('button',{name:'Tools'}).click();
 await id(page,'main-help-menu').click();await id(page,'main-help-web').click();await expect(help).toBeVisible();
 await page.keyboard.press('Escape');await expect(help).toHaveCount(0);await expect(id(page,'main-help-menu')).toBeFocused();
 await expect(page.getByRole('banner').getByRole('button',{name:'Tools'})).toHaveAttribute('aria-expanded','true');
});

test('main window Help: Websites; File › Exit Observatory shows VIREO\'s reminder',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 // Websites: links open a new tab only on click; NVO has no equivalent page.
 await id(page,'main-help-menu').click();await id(page,'main-help-websites').click();
 for(const [k,href] of [['twoMass','https://irsa.ipac.caltech.edu/Missions/2mass.html'],['clea','https://public.gettysburg.edu/~marschal/clea/CLEAhome.html'],['nvo','https://heasarc.gsfc.nasa.gov/navo/summary/about_navo.html']]){
  const a=id(page,`help-website-${k}`);await expect(a).toHaveAttribute('href',href);await expect(a).toHaveAttribute('target','_blank');await expect(a).toHaveAttribute('rel','noopener noreferrer');
 }
 await page.keyboard.press('Escape');await expect(id(page,'main-help-menu')).toBeFocused();
 // Exit Observatory: the reminder box; Cancel keeps the exercise, OK explains that the tab can now be closed.
 await id(page,'fi-file-menu').click();await id(page,'ob-exit').click();
 const box=id(page,'exit-reminder');await expect(box.getByRole('heading',{name:'** Exercise Finished? **'})).toBeVisible();
 await expect(id(page,'exit-reminder-text')).toContainText('Are you SURE you have completely finished this exercise?');
 await expect(id(page,'exit-reminder-text')).toContainText('Select "OK" to Quit Exercise, "Cancel" to Continue.');
 await id(page,'exit-reminder-cancel').click();await expect(box).toHaveCount(0);await expect(id(page,'fi-file-menu')).toBeFocused();
 await id(page,'fi-file-menu').click();await id(page,'ob-exit').click();await id(page,'exit-reminder-ok').click();
 await expect(id(page,'exit-reminder-done')).toContainText('close this browser tab');
});

test('the main Help menu is in the app header on every route; the reminder falls back to VIREO\'s Yes/No question',async({page})=>{
 await page.goto('/#object-x');
 await id(page,'main-help-menu').click();await id(page,'main-help-web').click();
 await expect(id(page,'web-help-topic')).toHaveAttribute('data-topic','welcome');
 await page.keyboard.press('Escape');
 await page.route('**/original/help/Reminder.obs',r=>r.fulfill({status:404,body:''}));
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await id(page,'fi-file-menu').click();await id(page,'ob-exit').click();
 await expect(id(page,'exit-quit-question')).toHaveText('Are You Sure You Want to Quit This Exercise?');
 await expect(id(page,'exit-quit-no')).toBeFocused();await id(page,'exit-quit-yes').click();
 await expect(id(page,'exit-reminder-done')).toBeVisible();
});

test('Classification › Spectral Line Table opens a line\'s help by its name, as VIREO does',async({page})=>{
 await page.goto('/#classification');
 await id(page,'spl-open').click();
 const rows=id(page,'spl-rows').getByRole('option');await expect(rows).toHaveCount(30);
 await expect(rows.first()).toHaveText('3759.87   O III');
 await rows.filter({hasText:'4026.19'}).dblclick();
 const h=id(page,'spl-help-text');
 await expect(h.getByRole('option').first()).toHaveText('* He I *');
 // 4026.19 He I shows the first He I section (3819.61): "Strongest in B stars with maximum around B2".
 await expect(h).toContainText('Strongest in B stars with maximum');
 await expect(id(page,'spl-help').getByRole('heading',{name:'Spectral Line Help'})).toBeFocused();
 await id(page,'spl-help-close').click();await expect(id(page,'spl-rows')).toBeFocused();
 // A failed SPECLNS.TXT fetch reports the help file only; the line list stays open.
 await page.route('**/original/help/SPECLNS.TXT',r=>r.abort());
 await page.reload();await id(page,'spl-open').click();
 await id(page,'spl-rows').getByRole('option').first().dblclick();
 await expect(id(page,'spl-message')).toContainText('SPECLNS.TXT');await expect(id(page,'spl-rows')).toBeVisible();
});

test('Front K2.5: a single click on a line moves the classification cursor to its pixel column and reselects the nearest line',async({page})=>{
 await page.goto('/#classification');
 await id(page,'spl-open').click();
 const rows=id(page,'spl-rows').getByRole('option');await expect(rows).toHaveCount(30);
 // Fe I 4143.878 lands on column 222 of the default 3700–4700 Å view (4144.00 Å), whose nearest line is Fe I 4143.878 itself.
 await rows.filter({hasText:'4143.88'}).click();
 await expect(id(page,'spl-cursor')).toContainText('Cursor @: 4144.00 Å');
 await expect(rows.filter({hasText:'Fe I'}).filter({hasText:'4143.88'})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('.class-marker').first()).toBeAttached();
 // A click on He I 4143.76 snaps to the same column (4144.00 Å) and reselects the nearest line, Fe I 4143.88 (review 1 L3;
 // review 3 M1: the reselection now moves away from the clicked row, so it is observable).
 await rows.filter({hasText:'He I'}).filter({hasText:'4143.76'}).click();
 await expect(id(page,'spl-cursor')).toContainText('Cursor @: 4144.00 Å');
 await expect(rows.filter({hasText:'Fe I'}).filter({hasText:'4143.88'})).toHaveAttribute('aria-selected','true');
 await expect(rows.filter({hasText:'He I'}).filter({hasText:'4143.76'})).toHaveAttribute('aria-selected','false');
 // A line left of the view draws no cursor. Every line of the table is inside the default 3700–4700 Å, so a 3900–4500 Å
 // window is applied first (O III 3759.87 then lies left of it).
 await page.locator('.classification-range summary').click();await page.getByLabel('Minimum display wavelength (Å)',{exact:true}).fill('3900');await page.getByLabel('Maximum display wavelength (Å)',{exact:true}).fill('4500');await page.getByRole('button',{name:'Apply display range',exact:true}).click();
 await rows.first().click();
 await expect(id(page,'spl-cursor')).toContainText('outside the displayed range');
});

test('Help fits a 320 px screen in the dark theme',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:320,height:800});
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 // Front HEADER: the Help button is in the page bar; the open menu and the help window stay within the screen.
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await id(page,'main-help-menu').click();
 const list=id(page,'page-bar-help').locator('.fi-menu-list');await expect(list).toBeVisible();
 expect(await list.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=320;})).toBe(true);
 await id(page,'main-help-web').click();await id(page,'web-help-topics').getByRole('button',{name:'Coming from VIREO (Windows)'}).click();
 await expect(id(page,'web-help-topic').getByRole('table')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 expect(await id(page,'web-help').evaluate(d=>d.getBoundingClientRect().right<=320)).toBe(true);
});

test('radio lab Help: Topics opens PULSRHLP.LST and About This Exercise shows its version',async({page})=>{
 await page.goto('/#radio-control');
 // Before the control panel (TRadioLab) is shown, its Help menu is disabled with a note.
 await expect(id(page,'radio-help-menu')).toBeDisabled();await expect(id(page,'radio-help-off')).toBeVisible();
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'radio-panel-window')).toBeVisible();
 await id(page,'radio-help-menu').click();await id(page,'radio-help-menu-topics').click();
 const rows=id(page,'radio-help-topic-list').getByRole('option');
 await expect(rows.first()).toHaveText('-Basic Operations-');
 await rows.filter({hasText:'Radio Telescope Controls'}).dblclick();
 // The topic text is fetched on demand: wait for the window, then for focus (it moves once the window has rendered).
 const heading=id(page,'radio-help-window').getByRole('heading',{name:'Help - Radio Telescope Controls'});
 await expect(heading).toBeVisible({timeout:15000});await expect(heading).toBeFocused({timeout:10000});
 await id(page,'radio-help-topic-menu').click();await id(page,'radio-help-close-topic').click();
 await id(page,'radio-help-menu').click();await id(page,'radio-help-about').click();
 await expect(id(page,'help-about').getByTestId('help-about-version')).toHaveText('Version 1.001-32');
});
