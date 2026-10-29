import {test,expect,type Page} from '@playwright/test';
import witness from '../src/help/helpAll.witness.json' with {type:'json'};

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
 for(const [route,prefix,list] of [['#photometer','photo-help','PHOTOHLP.LST'],['#spectrometer','spectrometer-help','SPECHLP.LST'],['#classification','class-help','CLASSHLP.LST'],
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

test('pulsar analysis does not add its first topic to the Back history (0x56e634)',async({page})=>{
 await page.goto('/#pulsar-analysis');
 await id(page,'pulsar-analysis-help-open').click();
 await id(page,'pulsar-analysis-help-topic-list').getByRole('option',{name:'Load Recorded Pulsar Data'}).dblclick();
 await expect(id(page,'pulsar-analysis-help-back')).toBeDisabled();
});

test('main window Help: Topics, Websites and About; File › Exit Observatory shows VIREO\'s reminder',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await id(page,'main-help-menu').click();await id(page,'main-help-topics').click();
 const rows=id(page,'main-help-topic-list').getByRole('option');
 await expect(rows.first()).toHaveText('-Getting Started-');await expect(rows.nth(1)).toHaveText('Log In');
 await rows.filter({hasText:'Select Exercise'}).dblclick();
 await expect(id(page,'main-help-topic-text')).toContainText('select "File"->"Run Exercise"');
 await id(page,'main-help-topic-menu').click();await id(page,'main-help-close-topic').click();
 await expect(id(page,'main-help-menu')).toBeFocused();
 // Websites: links open a new tab only on click; NVO has no equivalent page.
 await id(page,'main-help-menu').click();await id(page,'main-help-websites').click();
 for(const [k,href] of [['twoMass','https://irsa.ipac.caltech.edu/Missions/2mass.html'],['clea','http://public.gettysburg.edu/~marschal/clea/CLEAhome.html']]){
  const a=id(page,`help-website-${k}`);await expect(a).toHaveAttribute('href',href);await expect(a).toHaveAttribute('target','_blank');await expect(a).toHaveAttribute('rel','noopener noreferrer');
 }
 await expect(id(page,'help-website-nvo')).toContainText('http://www.us-vo.org');await expect(id(page,'help-website-nvo').locator('a')).toHaveCount(0);
 await page.keyboard.press('Escape');
 await id(page,'main-help-menu').click();await id(page,'main-help-about').click();
 await expect(id(page,'help-about')).toContainText('VIREO - The VIRtual Educational Observatory');await expect(id(page,'help-about-version')).toHaveText('Version 1.504');
 await id(page,'help-about').getByRole('button',{name:'OK'}).click();await expect(id(page,'main-help-menu')).toBeFocused();
 // Exit Observatory: the reminder box; Cancel keeps the exercise, OK explains that the tab can now be closed.
 await id(page,'fi-file-menu').click();await id(page,'ob-exit').click();
 const box=id(page,'exit-reminder');await expect(box.getByRole('heading',{name:'** Exercise Finished? **'})).toBeVisible();
 await expect(id(page,'exit-reminder-text')).toContainText('Are you SURE you have completely finished this exercise?');
 await expect(id(page,'exit-reminder-text')).toContainText('Select "OK" to Quit Exercise, "Cancel" to Continue.');
 await id(page,'exit-reminder-cancel').click();await expect(box).toHaveCount(0);await expect(id(page,'fi-file-menu')).toBeFocused();
 await id(page,'fi-file-menu').click();await id(page,'ob-exit').click();await id(page,'exit-reminder-ok').click();
 await expect(id(page,'exit-reminder-done')).toContainText('close this browser tab');
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
});

test('Help fits a 320 px screen in the dark theme',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:320,height:800});
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await id(page,'main-help-menu').click();await id(page,'main-help-topics').click();
 await id(page,'main-help-topic-list').getByRole('option',{name:'Log In'}).dblclick();
 await expect(id(page,'main-help-window')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('radio lab Help: Topics opens PULSRHLP.LST and About This Exercise shows its version',async({page})=>{
 await page.goto('/#radio-control');
 await id(page,'radio-exercise').click();await id(page,'radio-env-compiled').click();await id(page,'radio-access').click();await id(page,'radio-timer-deliver').click();
 await id(page,'radio-switch').click();await expect(id(page,'radio-panel-window')).toBeVisible();
 await id(page,'radio-help-menu').click();await id(page,'radio-help-topics').click();
 const rows=id(page,'radio-help-topic-list').getByRole('option');
 await expect(rows.first()).toHaveText('-Basic Operations-');
 await rows.filter({hasText:'Radio Telescope Controls'}).dblclick();
 await expect(id(page,'radio-help-window').getByRole('heading',{name:'Help - Radio Telescope Controls'})).toBeFocused();
 await id(page,'radio-help-topic-menu').click();await id(page,'radio-help-close-topic').click();
 await id(page,'radio-help-menu').click();await id(page,'radio-help-about').click();
 await expect(id(page,'help-about-version')).toHaveText('Version 1.001-32');
});
