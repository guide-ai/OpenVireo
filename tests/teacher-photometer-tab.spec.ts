import{test,expect,type Page}from'@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';
import{enterInstructorMode,leaveInstructorMode}from'./fixtures/instructor-mode';
import{setVireoOptions}from'./fixtures/vireo-options';
// Front T4 (analysis/front-plans/front-teacher.md §T4; analysis/front-teacher/t4/RECOVERY.md; docs/OPTICAL-OPTIONS.md): the
// options dialog's Photometer-tab boxes. Set E(B-V) (SetEBmVBox, record+0x27dc → env+0x2e90, compiled on 0x5a2a55): VIREO's
// ShowZAMS1Click gate 0x543a32–0x543a75 fixes a database cluster's E(B−V) at Round(E·100) and disables its slider. Detect Sky
// (DtctSkyBox, record+0x27cf → env+0x2e83 → TPhotometer+0x6b1, compiled off 0x5a2af6): FormActivate 0x4ff94c sets Sky exactly
// when the selected star has no light in the aperture and disables the Object/Sky slider. Expected strings are the recovered
// literals and the chosen web contract, not native oracles.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const db=(p:Page)=>p.locator('.cluster-database-lab');
const EBV='Trial color excess E(B−V) · 0–2.50, step 0.01',EBV_SLIDER='Slider: color excess E(B−V)';
async function load(p:Page,cluster:string,count:string){
 await db(p).getByLabel('Reference cluster dataset',{exact:true}).selectOption(cluster);await db(p).getByRole('button',{name:'Load selected dataset',exact:true}).click();
 await expect(id(p,'cluster-reference-count')).toContainText(count);
}

test('Set E(B-V): on by default the database E(B−V) is the catalogue value and locked; an instructor turns it off and on',async({page})=>{
 await page.goto('/#cluster-database');await expect(page.getByRole('heading',{name:'Star-cluster database laboratory',exact:true})).toBeVisible();
 // Student, compiled default: Load prefills the gate's value (Round(0.03·100) = 3 ticks) and the field and slider are locked.
 await load(page,'m67','506 catalog points');const b=db(page);
 await expect(b.getByLabel(EBV,{exact:true})).toHaveValue('0.03');await expect(b.getByLabel(EBV,{exact:true})).not.toBeEditable();
 await expect(b.getByLabel(EBV,{exact:true})).toHaveAttribute('aria-describedby','cluster-ebv-gate-note');// review 1 L3
 await expect(b.getByLabel(EBV_SLIDER,{exact:true})).toBeDisabled();await expect(b.getByLabel(EBV_SLIDER,{exact:true})).toHaveValue('3');
 await expect(id(page,'cluster-ebv-gate-note')).toHaveAttribute('data-set-ebmv','on');await expect(id(page,'cluster-ebv-gate-note')).toContainText('read-only');
 await expect(b.getByRole('button',{name:'Use catalog E(B−V) = 0.03',exact:true})).toBeVisible();
 // The other trial fields stay the student's.
 await b.getByLabel('Trial apparent modulus V−Mv · 0–15, step 0.01',{exact:true}).fill('9.50');await expect(b.getByTestId('native-zams')).toHaveCount(1);
 await b.screenshot({path:test.info().outputPath('set-ebmv-on.png')});

 // The instructor sees both boxes live on the Photometer tab, no longer as read-only rows or deferred items.
 await page.evaluate(()=>{location.hash='observatory';});await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await enterInstructorMode(page);await page.locator('.telescope-motion').getByTestId('ob-options').click();
 const tab=id(page,'ob-options-tab-photometer');
 await expect(tab.getByTestId('ob-options-set-ebmv')).toBeChecked();await expect(tab.getByTestId('ob-options-detect-sky')).not.toBeChecked();
 await expect(tab).toContainText('Set E(B-V) to correct value for ZAMS fitting.');await expect(tab).toContainText('Auto-detect sky.');
 await expect(tab.locator('dt',{hasText:'Detect Sky'})).toHaveCount(0);await expect(tab.locator('dt',{hasText:'Set E(B-V)'})).toHaveCount(0);
 await expect(id(page,'ob-options-teacher-deferred')).not.toContainText('Detect Sky');await expect(id(page,'ob-options-teacher-deferred')).not.toContainText('Set E(B-V)');
 await expect(id(page,'ob-options-set-ebmv-note')).toContainText('0x543a32');
 await tab.scrollIntoViewIfNeeded();await tab.screenshot({path:test.info().outputPath('photometer-tab-options.png')});
 await tab.getByTestId('ob-options-set-ebmv').uncheck();await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
 await page.evaluate(()=>{location.hash='cluster-database';});await expect(b.getByLabel(EBV,{exact:true})).toBeVisible();

 // Off: VIREO copies nothing. The field and slider are free, there is no catalogue button, and a new notebook starts blank.
 await expect(b.getByLabel(EBV,{exact:true})).toBeEditable();await expect(b.getByLabel(EBV_SLIDER,{exact:true})).toBeEnabled();
 await expect(id(page,'cluster-ebv-gate-note')).toHaveAttribute('data-set-ebmv','off');
 await expect(b.getByRole('button',{name:/^Use catalog E\(B−V\)/})).toHaveCount(0);
 await load(page,'hyades','Hyades');await expect(b.getByLabel(EBV,{exact:true})).toHaveValue('');await expect(b.getByText(/notebook: the catalog E\(B−V\) =/)).toHaveCount(0);
 await b.getByLabel(EBV,{exact:true}).fill('0.05');await expect(id(page,'cluster-reddening-source')).toContainText('your manual input');
 // Leave keeps the option (it sets up the students' lab); the student still chooses E(B−V).
 await leaveInstructorMode(page);await expect(b.getByLabel(EBV,{exact:true})).toBeEditable();

 // On again: the manual value stays visible but locked until the catalogue button applies the gate.
 await setVireoOptions(page,{'set-ebmv':true});
 await expect(b.getByLabel(EBV,{exact:true})).toHaveValue('0.05');await expect(b.getByLabel(EBV,{exact:true})).not.toBeEditable();
 await b.getByRole('button',{name:'Use catalog E(B−V) = 0',exact:true}).click();await expect(b.getByLabel(EBV,{exact:true})).toHaveValue('0');
 await expect(id(page,'cluster-reddening-source')).toContainText('catalog preset');
});

// N5230-00946 (11 44 42.9 +55 22 43) and a sky position 0.01° north of it, as in photometer-tiled.spec.ts.
const STAR={ra:'11.74525',dec:'55.37861111'},SKY={ra:'11.74525',dec:'55.38861111'};
async function pointObservatory(page:Page,p:{ra:string;dec:string}){
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(p.ra);await page.locator('#point-dec').fill(p.dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
 await page.getByRole('button',{name:/^Telescope/}).click();
}
const ready=async(page:Page)=>{
 await expect(page.getByText(/^Field at the telescope pointing: the nearest star is /)).toBeVisible({timeout:60000});
 await expect(id(page,'photo-telescope-access')).toHaveAttribute('data-access','ready',{timeout:20000});
};
async function benchPoint(page:Page,p:{ra:string;dec:string}){
 await page.locator('#photo-point-ra').fill(p.ra);await page.locator('#photo-point-dec').fill(p.dec);await id(page,'photo-point-telescope').click();
 await expect(id(page,'photo-telescope-dec')).toHaveText(p.dec.replace(/0+$/,''),{timeout:20000});
}
async function integrate(page:Page){await page.getByRole('button',{name:'Start integration',exact:true}).click();await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeEnabled({timeout:30000});}

test('Detect Sky: the photometer reads Object on the star and Sky off it by itself, with the choice locked',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await enterInstructorMode(page);await setVireoOptions(page,{'detect-sky':true});
 // Activated on the star: VIREO's off branch would keep Sky (the slider's position); Detect Sky reads Object.
 await pointObservatory(page,STAR);
 await clickHeaderTool(page,'Pleiades photometry');await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();await ready(page);
 const pointing=page.getByLabel('Photometer pointing',{exact:true});
 await expect(pointing).toHaveValue('object');await expect(pointing).toBeDisabled();await expect(id(page,'photo-detect-sky')).toBeVisible();
 // Off the star: Sky, without any choice by the student; a sky reading there.
 await benchPoint(page,SKY);await ready(page);await expect(pointing).toHaveValue('sky');await integrate(page);
 await expect(page.getByTestId('photo-sky-origin')).toBeVisible();
 // Back on the star: Object again, and an object reading follows with no "Reading Sky!" question.
 await benchPoint(page,STAR);await ready(page);await expect(pointing).toHaveValue('object');await integrate(page);
 await expect(id(page,'photo-sky-replace')).not.toBeVisible();await expect(page.getByRole('button',{name:'Add notebook entry',exact:true})).toBeEnabled();
 await page.screenshot({path:test.info().outputPath('detect-sky.png')});
 // Turning it off frees the choice only at the next activation (review 1 L2; see the next test).
 expect(errors).toEqual([]);
});

test('Detect Sky is read at activation (review 1 L2): turning it on or off changes the lock only at the next activation',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await pointObservatory(page,STAR);
 await clickHeaderTool(page,'Pleiades photometry');await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 const activate=page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}),pointing=page.getByLabel('Photometer pointing',{exact:true});
 // Option off (compiled): the activation on the star keeps the slider at Sky (0x4ff987) and the choice is the student's.
 await activate.click();await ready(page);await expect(pointing).toHaveValue('sky');await expect(pointing).toBeEnabled();await expect(id(page,'photo-detect-sky')).toHaveCount(0);
 // Turned on meanwhile: nothing is claimed until the photometer is activated again (leaving the bench released it).
 await setVireoOptions(page,{'detect-sky':true});await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 await expect(id(page,'photo-detect-sky')).toHaveCount(0);
 await activate.click();await ready(page);await expect(pointing).toHaveValue('object');await expect(pointing).toBeDisabled();await expect(id(page,'photo-detect-sky')).toBeVisible();
 // Turned off: the last activation's lock stays until the next activation, which frees the choice again.
 await setVireoOptions(page,{'detect-sky':false});await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 // (The web activation declares Sky and the off branch keeps it on the star, as at the first activation.)
 await activate.click();await ready(page);await expect(id(page,'photo-detect-sky')).toHaveCount(0);await expect(pointing).toBeEnabled();await expect(pointing).toHaveValue('sky');
 await pointing.selectOption('object');await expect(pointing).toHaveValue('object');
 expect(errors).toEqual([]);
});
