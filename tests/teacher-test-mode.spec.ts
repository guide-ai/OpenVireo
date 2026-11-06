import{test,expect,type Page}from'@playwright/test';
import{readFile}from'node:fs/promises';
import{enterInstructorMode,leaveInstructorMode}from'./fixtures/instructor-mode';
// Front T3 (analysis/front-plans/front-teacher.md §T3; docs/OPTICAL-OPTIONS.md): Test Mode, TestBox1 (record+0x27c8 →
// env+0x2e7c, compiled off 0x5a2ac5). In instructor mode the options dialog turns it on; then the CCD exposure ends at its first
// 1000 ms tick (0x512b39) and a programmed slew jumps to the target without the confirmation (0x539a1d → 0x539c4c); Leave turns it
// off [W]. Every CDS/VizieR request is intercepted with the recorded response (tests/fixtures/vizier, CDS 2026-10-27) moved onto
// the pointing, as in camera-exposure.spec.ts.
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;
const recorded=readFile(new URL('./fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const card=(p:Page)=>p.locator('.telescope-motion');
const camera=(p:Page)=>p.getByTestId('camera-control');
function onPointing(xml:string){const dRa=.4987684*15-56.75,dDec=.03628-24.12;
 return xml.replace(/<TD>(0?56\.7\d+)<\/TD>/g,(_,v:string)=>`<TD>${(Number(v)+dRa).toFixed(7)}</TD>`).replace(/<TD>\+?(24\.1\d+)<\/TD>/g,(_,v:string)=>`<TD>+${(Number(v)+dDec).toFixed(7)}</TD>`);}
async function trackedField(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await button(page,'Open dome ↗').click();await page.getByLabel('Target',{exact:true}).selectOption('N0000.DAT@14428');
 await button(page,'Point telescope ↗').click();await button(page,'Switch to telescope view ↗').click();
 if(!await button(page,'Start observatory clock').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button(page,'Start observatory clock').click();await button(page,'Turn tracking on').click();
}
async function setTestMode(page:Page,on:boolean){
 await enterInstructorMode(page);await card(page).getByTestId('ob-options').click();await expect(id(page,'ob-options-dialog')).toBeVisible();
 const box=id(page,'ob-options-test-mode');await expect(box).not.toBeChecked();
 await expect(id(page,'ob-options-test-mode-note')).toContainText('only the waiting goes');
 await expect(id(page,'ob-options-others')).not.toContainText('Test Mode');
 await expect(id(page,'ob-options-teacher-deferred')).toContainText('Test Mode (radio)');
 if(on)await box.check();
 await page.screenshot({path:test.info().outputPath('test-mode-option.png')});
 await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
}
async function coords(page:Page,ra:string,dec:string){
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);
}

test('instructor Test Mode: a 30 s CCD exposure ends at its first tick, a programmed slew jumps without confirmation, Leave turns it off',async({page})=>{
 const body=onPointing((await recorded).toString('utf8'));await page.route(CDS,route=>route.fulfill({status:200,contentType:'text/xml',body}));
 await trackedField(page);
 await expect(id(page,'motion-test-mode')).toHaveCount(0);
 await setTestMode(page,true);
 await expect(id(page,'motion-test-mode')).toBeVisible();
 // CCD: 30 s requested, ready long before 30 s (the image is built from the requested seconds: Vitest testMode.test.ts).
 await camera(page).getByLabel(/Ask VizieR live/).check();
 await camera(page).getByLabel('Minutes').fill('0');await camera(page).getByLabel('Seconds').fill('30');
 const started=Date.now();await button(page,'Start exposure').click();
 await expect(id(page,'camera-status')).toHaveText('Image ready.',{timeout:15_000});
 expect(Date.now()-started).toBeLessThan(15_000);
 await expect(id(page,'camera-canvas')).toBeVisible();
 await page.screenshot({path:test.info().outputPath('test-mode-ccd.png')});
 // Slew: no confirmation dialog and no motion; the pointing is the target at once.
 await coords(page,'0.6','0.5');
 await card(page).getByRole('button',{name:'Slew to coordinate draft',exact:true}).click();
 await expect(page.getByRole('button',{name:'Start programmed slew',exact:true})).toHaveCount(0);
 await expect(id(page,'pointing-ra')).toHaveText('0.60000');await expect(id(page,'pointing-dec')).toHaveText('0.50000');
 await expect(id(page,'motion-phase')).not.toContainText('Telescope moving');
 await card(page).screenshot({path:test.info().outputPath('test-mode-motion.png')});
 // Leave turns Test Mode off [W]: the slew asks for confirmation again, and the option is off when instructor mode reopens.
 await leaveInstructorMode(page);await expect(id(page,'motion-test-mode')).toHaveCount(0);
 await coords(page,'0.5','0.25');await card(page).getByRole('button',{name:'Slew to coordinate draft',exact:true}).click();
 await expect(page.getByRole('button',{name:'Start programmed slew',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Cancel slew',exact:true}).click();
 await expect(id(page,'pointing-ra')).toHaveText('0.60000');
 await setTestMode(page,false);
});
