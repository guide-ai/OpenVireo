import{test,expect,type Page}from'@playwright/test';
import{openHeaderTools}from'./fixtures/header-tools';
import{enterInstructorMode}from'./fixtures/instructor-mode';
// Front T5 (analysis/front-plans/front-teacher.md §T5; analysis/front-teacher/t5/RECOVERY.md; docs/OPTICAL-OPTIONS.md): Restrict
// Scope Access (RstrctScpBox, record+0x27d1, compiled on 0x5a2b04) is copied into env+0x3840 by the Photometry, HR Diagrams and
// Stellar Spectra menus and cleared by Hubble, LSS and Object X; the menu updater 0x589bd8 then offers Access 1.0 / 4.0 m only
// through Request Time (0x58ba88). The page's scope stream is seeded by crypto.getRandomValues; it is pinned to 0 here, so the
// draws are VIREO's generator from RandSeed 0: 2.3e-10 (1.0 m granted, Random(12) = 0 → 12 uses), 0.861 (4.0 m refused),
// 0.203 (4.0 m granted). Expected strings are the recovered literals, not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
async function open(page:Page){
 await page.addInitScript(()=>{crypto.getRandomValues=(<T extends ArrayBufferView|null>(a:T)=>{if(a)new Uint8Array(a.buffer,a.byteOffset,a.byteLength).fill(0);return a;}) as typeof crypto.getRandomValues;});
 await page.clock.install();await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
}
async function guide(page:Page,which:'pleiades'|'hubble'){
 await openHeaderTools(page);
 if(which==='pleiades'){await id(page,'pleiades-lab-open').click();await id(page,'pleiades-lab-close').click();}
 else{await page.locator('.portal-header nav').getByRole('button',{name:'Hubble lab guide',exact:true}).click();const d=page.getByRole('dialog',{name:'Your Hubble investigation'});await expect(d).toBeVisible();await page.keyboard.press('Escape');await expect(d).toBeHidden();}
}
const card=(page:Page)=>id(page,'optical-telescope');
const choose=(page:Page,index:string)=>page.getByLabel('Telescope profile to inspect or select',{exact:true}).selectOption(index);
const use=(page:Page)=>card(page).getByRole('button',{name:'Use this telescope',exact:true});
async function box(page:Page,kind:string,caption:string,text:string|RegExp){
 const b=id(page,'scope-box');await expect(b).toHaveAttribute('data-kind',kind);await expect(id(page,'scope-box-caption')).toHaveText(caption);await expect(id(page,'scope-box-text')).toHaveText(text);return b;
}

test('E04 context: the 1.0 m needs Request Time; a granted request gives Access; a refusal waits 15 real minutes for the 4.0 m',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 // Free observatory (no exercise menu yet): env+0x3840 = 0, every telescope open.
 await expect(card(page)).toHaveAttribute('data-restricted','false');await expect(id(page,'scope-request-time')).toHaveCount(0);
 await guide(page,'pleiades');
 await expect(card(page)).toHaveAttribute('data-restricted','true');await expect(card(page)).toHaveAttribute('data-access','100');
 await expect(id(page,'scope-access-status')).toContainText('the 1.0 m and 4.0 m telescopes need Request Time');
 await choose(page,'1');await expect(use(page)).toBeDisabled();await expect(id(page,'scope-access-locked')).toContainText('Access 1.0 Meter is not offered in this exercise');
 await expect(id(page,'scope-request-1')).toHaveText('Request 1.0 Meter Telescope');await expect(id(page,'scope-request-2')).toBeEnabled();
 await card(page).screenshot({path:test.info().outputPath('scope-request-time.png')});
 // Granted: OK writes the uses and offers Access; the request item goes off.
 await id(page,'scope-request-1').click();
 await box(page,'time-awarded','Observing Time Awarded','Your request for observing time on the\nKPNO 0.9m (36") Telescope\nhas been granted.\n\nYou may use the telescope to obtain and record\ndata for 12 stars or other objects.');
 await page.screenshot({path:test.info().outputPath('scope-awarded.png')});
 await id(page,'scope-box-ok').click();await expect(id(page,'scope-box')).toHaveCount(0);
 await expect(card(page)).toHaveAttribute('data-access','110');await expect(card(page)).toHaveAttribute('data-uses','12,0');await expect(id(page,'scope-request-1')).toBeDisabled();
 await expect(use(page)).toBeEnabled();await use(page).click();await expect(page.locator('.optical-current')).toContainText('KPNO 0.9m');
 // Refused: the 0x10 box, the item off, and Timer4m's 15 minutes on the host clock bring it back.
 await id(page,'scope-request-2').click();
 await box(page,'request-denied','Telescope Not Available','Due to the high demand for time on the\nKPNO 4m (158") Mayall Telescope, your\nrequest cannot be granted at this time.\n\nYou may reapply for time on this\ntelescope in 15 Minutes.');
 await id(page,'scope-box-ok').click();await expect(id(page,'scope-request-2')).toBeDisabled();await expect(id(page,'scope-waiting-2')).toBeVisible();
 await page.clock.runFor(15*60000-1000);await expect(id(page,'scope-box')).toHaveCount(0);
 await page.clock.runFor(2000);
 await box(page,'accepting-requests','Accepting Observing Requests','You may reapply for time on the\nKPNO 4m (158") Mayall Telescope\nwhenever you wish.');
 await id(page,'scope-box-ok').click();await expect(id(page,'scope-request-2')).toBeEnabled();
 // Granted, then Cancel: nothing is committed and the request stays offered.
 await id(page,'scope-request-2').click();await box(page,'time-awarded','Observing Time Awarded',/has been granted\.[\s\S]*data for \d+ stars or other objects\./);
 await id(page,'scope-box-cancel').click();await expect(card(page)).toHaveAttribute('data-access','110');await expect(id(page,'scope-request-2')).toBeEnabled();
 // A new exercise menu runs 0x589bd8 again: Access 1.0 m goes off (the uses stay), Request comes back.
 await guide(page,'pleiades');await expect(card(page)).toHaveAttribute('data-access','100');await expect(card(page)).toHaveAttribute('data-uses','12,0');await expect(id(page,'scope-request-1')).toBeEnabled();
 expect(errors).toEqual([]);
});

test('the instructor turns Restrict Scope Access off; it applies at the next exercise menu, giving direct Access',async({page})=>{
 await open(page);await guide(page,'pleiades');await expect(card(page)).toHaveAttribute('data-restricted','true');
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await enterInstructorMode(page);await page.locator('.telescope-motion').getByTestId('ob-options').click();
 const box=id(page,'ob-options-restrict-scope-access');await expect(box).toBeChecked();
 await expect(id(page,'ob-options-dialog')).toContainText('If unchecked, all telescopes are always available.');
 await expect(id(page,'ob-options-others')).not.toContainText('Restrict Scope Access');await expect(id(page,'ob-options-teacher-deferred')).not.toContainText('Request Time');
 await expect(id(page,'ob-options-teacher-deferred')).toContainText('Scopes...');
 await box.uncheck();await id(page,'ob-options-ok').click();
 // VIREO copies the option at the exercise menu: still restricted until the guide is opened again.
 await expect(card(page)).toHaveAttribute('data-restricted','true');
 await guide(page,'pleiades');await expect(card(page)).toHaveAttribute('data-restricted','false');await expect(card(page)).toHaveAttribute('data-access','111');
 await expect(id(page,'scope-request-time')).toHaveCount(0);
 await choose(page,'2');await expect(use(page)).toBeEnabled();await use(page).click();await expect(page.locator('.optical-current')).toContainText('KPNO 4m');
 // Reset restores the compiled value (on). The telescope change closed the dome (0x58b528), which disables the menu.
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await page.locator('.telescope-motion').getByTestId('ob-options').click();await expect(id(page,'ob-options-restrict-scope-access')).not.toBeChecked();
 await id(page,'ob-options-reset').click();await id(page,'ob-options-reset-box-yes').click();await expect(id(page,'ob-options-restrict-scope-access')).toBeChecked();
});

test('the Hubble context stays unrestricted, even after a restricted exercise',async({page})=>{
 await open(page);await guide(page,'pleiades');await expect(card(page)).toHaveAttribute('data-restricted','true');
 await guide(page,'hubble');
 await expect(card(page)).toHaveAttribute('data-restricted','false');await expect(card(page)).toHaveAttribute('data-access','111');
 await expect(id(page,'scope-access-status')).toHaveText('All three telescopes are available here.');
 await choose(page,'2');await use(page).click();await expect(page.locator('.optical-current')).toContainText('KPNO 4m');
 await choose(page,'1');await use(page).click();await expect(page.locator('.optical-current')).toContainText('KPNO 0.9m');
});
