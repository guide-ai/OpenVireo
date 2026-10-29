import {test,expect,type Page} from '@playwright/test';

// Front S (S5, docs/SPECTRUM-ENGINE-VIEW.md): the measuring engine's Zoom ("Set Wavelength Range"), ◀ / ▶ and the cursor
// readout, recovered statically (analysis/front-s-spectroscopy/RE-difference-and-engine-zoom.md Part 2).
const id=(p:Page,t:string)=>p.getByTestId(t);
async function open(page:Page){await page.goto('/#spectrum');await expect(page.getByRole('heading',{name:'Measure redshift.'})).toBeVisible();}
async function at(page:Page,fx:number,fy:number){const b=(await id(page,'engine-plot').boundingBox())!;return {x:b.x+b.width*(60+860*fx)/960,y:b.y+b.height*(56+250*fy)/360};}

test('Zoom chooses a 100 Å window from the start of the spectrum; the arrows move it 100 Å',async({page})=>{
 await open(page);
 await expect(id(page,'engine-window')).toHaveText('Window 3700.0–4700.0 Å');
 await expect(id(page,'engine-pan-left')).toBeDisabled();await expect(id(page,'engine-pan-right')).toBeDisabled();
 await id(page,'engine-zoom').click();
 const dialog=id(page,'engine-zoom-dialog');await expect(dialog.getByRole('heading',{name:'Set Wavelength Range'})).toBeVisible();
 await id(page,'engine-zoom-max').fill('3');await expect(id(page,'engine-zoom-max-value')).toHaveText('4000.0');
 // The minimum pushes the maximum up to stay 100 Å apart.
 await id(page,'engine-zoom-min').fill('5');await expect(id(page,'engine-zoom-max-value')).toHaveText('4300.0');
 await id(page,'engine-zoom-reset').click();await expect(id(page,'engine-zoom-min-value')).toHaveText('3700.0');await expect(id(page,'engine-zoom-max-value')).toHaveText('4700.0');
 await id(page,'engine-zoom-min').fill('2');await id(page,'engine-zoom-max').fill('5');await id(page,'engine-zoom-ok').click();
 await expect(dialog).toHaveCount(0);await expect(id(page,'engine-zoom')).toBeFocused();
 await expect(id(page,'engine-window')).toHaveText('Window 3900.0–4200.0 Å');
 await id(page,'engine-pan-left').click();await id(page,'engine-pan-left').click();
 await expect(id(page,'engine-window')).toHaveText('Window 3700.0–4000.0 Å');await expect(id(page,'engine-pan-left')).toBeDisabled();
 // Cancel and Escape leave the window as it was.
 await id(page,'engine-zoom').click();await id(page,'engine-zoom-max').fill('9');await page.keyboard.press('Escape');
 await expect(id(page,'engine-window')).toHaveText('Window 3700.0–4000.0 Å');
});

test('the readout shows the observed wavelength and the cursor height; right-click or N finds the nearest comparison line',async({page})=>{
 await open(page);
 const p=await at(page,0.5,0.5);await page.mouse.move(p.x,p.y);await page.mouse.down();
 const q=await at(page,0.25,0.25);await page.mouse.move(q.x,q.y);await page.mouse.up();
 await expect(id(page,'engine-readout-wavelength')).toHaveText('3950.0');await expect(id(page,'engine-readout-intensity')).toHaveText('0.750');
 await expect(id(page,'engine-cursor')).toHaveCount(1);
 await id(page,'engine-plot').focus();await page.keyboard.press('ArrowRight');
 await expect(id(page,'engine-readout-wavelength')).toHaveText('3951.7');
 // H (3968.49 Å, 16.8 Å away) is nearer 3951.7 Å than K (3933.68 Å, 18.0 Å away).
 await page.keyboard.press('n');await expect(id(page,'engine-nearest-result')).toHaveText('Nearest comparison line: H Line (Ca II + H) at 3968.49 Å.');
 await expect(page.locator('tr.engine-selected')).toContainText('H Line');
 const far=await at(page,0.95,0.5);await page.mouse.click(far.x,far.y,{button:'right'});
 await expect(id(page,'engine-nearest-result')).toHaveText('No comparison line within 100 Å of the cursor.');
 // Zoom or pan clears the readout.
 await id(page,'engine-zoom').click();await id(page,'engine-zoom-ok').click();
 await expect(id(page,'engine-readout-wavelength')).toHaveCount(0);await expect(id(page,'engine-cursor')).toHaveCount(0);
});

test('the engine controls fit a 320 px screen in the dark theme',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.setViewportSize({width:320,height:800});
 await open(page);await id(page,'engine-zoom').click();await expect(id(page,'engine-zoom-dialog')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
