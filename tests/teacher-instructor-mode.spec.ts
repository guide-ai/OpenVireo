import{test,expect,type Page}from'@playwright/test';
import{clickHeaderTool,openHeaderTools}from'./fixtures/header-tools';
import{enterInstructorMode,leaveInstructorMode}from'./fixtures/instructor-mode';
// Front T1 (analysis/front-plans/front-teacher.md §4.4; docs/OPTICAL-OPTIONS.md): the instructor-mode gate env+0x37d8. Options
// are closed to a student (Preferences1Click 0x5886c9 → the USER OPTIONS! box 0x588a84/0x588b70); the web instructor switch
// (the Demonstration Mode branch's write 0x587c6a, no password) opens them and the radio Preferences; Leave closes them and
// resets Edit Mode and Virtual Observatory [W]; a reload closes the gate. Expected strings are the recovered literals and the
// chosen web contract, not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const card=(p:Page)=>p.locator('.telescope-motion');
const USER_OPTIONS_TEXT='INSTRUCTOR := Many features of this software are controlled by\noption switches and parameters that enable you to tailor the\nexercise to your own needs and preferences.\n\nSee the technical documentation for details and instructions!';
async function observatory(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
async function optionsClosed(page:Page,shot?:string){
 await card(page).getByTestId('ob-options').click();
 const box=id(page,'ob-user-options');await expect(box).toBeVisible();await expect(id(page,'ob-options-dialog')).toBeHidden();
 await expect(id(page,'ob-user-options-title')).toHaveText('USER OPTIONS!');
 expect((await id(page,'ob-user-options-text').innerText()).replace(/\r/g,'')).toBe(USER_OPTIONS_TEXT);
 await expect(id(page,'ob-user-options-note')).toContainText('Instructor mode… in the page header opens them');
 if(shot)await page.screenshot({path:test.info().outputPath(shot)});
 await expect(id(page,'ob-user-options-ok')).toBeFocused();await page.keyboard.press('Escape');await expect(box).toHaveCount(0);
}
async function fileMenuHas(page:Page,testId:string,present:boolean){
 await id(page,'fi-file-menu').click();await expect(id(page,testId)).toHaveCount(present?1:0);await id(page,'fi-file-menu').click();
}

test('a student gets the USER OPTIONS! box; instructor mode opens the options and the radio Preferences; Leave closes them and resets Edit Mode and VO; reload closes the gate',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{const u=new URL(r.url());if(u.hostname!=='127.0.0.1')requests.push(r.url());});
 await observatory(page);
 await expect(id(page,'instructor-mode-banner')).toHaveCount(0);await expect(card(page).getByTestId('ob-options')).toHaveAttribute('data-gate','user-options-box');
 await optionsClosed(page,'user-options-box-desktop.png');
 // The radio card reads the same gate: closed, its Preferences shows the same box; it has no Demonstration button of its own.
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','not-supplied');await expect(id(page,'radio-access-demo')).toHaveCount(0);
 await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-refusal')).toBeVisible();await page.keyboard.press('Escape');await expect(id(page,'radio-access-refusal')).toHaveCount(0);
 await clickHeaderTool(page,'Observatory');
 // The confirmation says what it is; Cancel (and Escape) leave the gate closed.
 await id(page,'instructor-mode-open').click();const confirm=id(page,'instructor-mode-confirm');await expect(confirm).toBeVisible();
 await expect(confirm).toContainText("web form of VIREO's Demonstration Mode");await expect(id(page,'instructor-mode-not-a-lock')).toHaveText('It needs no password and it is not a lock: anyone using this browser can turn it on, so it protects nothing.');
 await expect(confirm).toContainText('It shows no answers.');await expect(confirm).toContainText('not saved in investigations');
 await expect(confirm.locator('input')).toHaveCount(0);// no password field
 await expect(id(page,'instructor-mode-confirm-cancel')).toBeFocused();
 await page.screenshot({path:test.info().outputPath('instructor-confirm-desktop.png')});
 await page.keyboard.press('Escape');await expect(confirm).toHaveCount(0);await expect(id(page,'instructor-mode-banner')).toHaveCount(0);
 await id(page,'instructor-mode-open').click();await id(page,'instructor-mode-confirm-cancel').click();await expect(id(page,'instructor-mode-banner')).toHaveCount(0);
 await optionsClosed(page);
 // On: the banner, a disabled header item, and the options dialog.
 await id(page,'instructor-mode-open').click();await id(page,'instructor-mode-confirm-on').click();
 const banner=id(page,'instructor-mode-banner');await expect(banner).toBeVisible();
 await expect(banner.locator('p')).toHaveText("Instructor mode (web):VIREO's Demonstration Mode gate. No password; it is not a lock.");
 await expect(id(page,'instructor-mode-open')).toBeDisabled();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:test.info().outputPath('instructor-banner-desktop.png')});
 await card(page).getByTestId('ob-options').click();await expect(id(page,'ob-options-dialog')).toBeVisible();await expect(id(page,'ob-user-options')).toHaveCount(0);
 await expect(id(page,'ob-options-teacher-deferred')).not.toContainText('Virtual Observatory (instructor-only)');await expect(id(page,'ob-options-teacher-deferred')).toContainText('Password');
 await id(page,'ob-options-edit-mode').check();await id(page,'ob-options-virtual-observatory').check();await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
 await fileMenuHas(page,'fi-field-information',true);await fileMenuHas(page,'qso-menu',true);
 // The radio Preferences opens under the same gate.
 await clickHeaderTool(page,'Radio telescope');await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','instructor');
 await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-parent')).toBeVisible();
 await id(page,'radio-access-parent-cancel').click();await expect(id(page,'radio-access-parent')).toHaveCount(0);
 // Leave (from any route): gate closed on both cards, Edit Mode and VO off.
 await leaveInstructorMode(page);await expect(id(page,'radio-access-gate')).toHaveAttribute('data-source','not-supplied');await expect(id(page,'instructor-mode-open')).toBeEnabled();
 await id(page,'radio-access-preferences').click();await expect(id(page,'radio-access-refusal')).toBeVisible();await page.keyboard.press('Escape');
 await clickHeaderTool(page,'Observatory');
 await fileMenuHas(page,'fi-field-information',false);await fileMenuHas(page,'qso-menu',false);
 await page.getByTestId('sky-map').click({position:{x:120,y:120}});await expect(id(page,'co-dialog')).toHaveCount(0);await expect(id(page,'em-layer')).toHaveCount(0);
 await optionsClosed(page);
 // Entering again shows Edit Mode and VO back at their compiled values.
 await enterInstructorMode(page);await card(page).getByTestId('ob-options').click();
 await expect(id(page,'ob-options-edit-mode')).not.toBeChecked();await expect(id(page,'ob-options-virtual-observatory')).not.toBeChecked();
 await id(page,'ob-options-dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 // Page session only: a reload closes the gate (nothing is stored).
 expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
 await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await expect(id(page,'instructor-mode-banner')).toHaveCount(0);
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await optionsClosed(page);
 expect(requests).toEqual([]);
});

test('the confirmation and the banner fit a 375 px phone; the header item is behind Tools',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await openHeaderTools(page);await id(page,'instructor-mode-open').click();await expect(id(page,'instructor-mode-confirm')).toBeVisible();
 const fits=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 expect(await fits()).toBe(true);
 const box=(await id(page,'instructor-mode-confirm').boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(375);
 await page.screenshot({path:test.info().outputPath('instructor-confirm-375.png')});
 await id(page,'instructor-mode-confirm-on').click();await page.locator('.portal-header .tools-toggle').click();
 const banner=id(page,'instructor-mode-banner');await expect(banner).toBeVisible();expect(await fits()).toBe(true);
 const b=(await banner.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(375);
 await page.screenshot({path:test.info().outputPath('instructor-banner-375.png')});
 await leaveInstructorMode(page);
});
