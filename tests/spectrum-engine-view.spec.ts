import {test,expect,type Page} from '@playwright/test';

// Front S (S5, docs/SPECTRUM-ENGINE-VIEW.md): the measuring engine's Zoom ("Set Wavelength Range"), ◀ / ▶ and the cursor
// readout, recovered statically (analysis/front-s-spectroscopy/RE-difference-and-engine-zoom.md Part 2).
const id=(p:Page,t:string)=>p.getByTestId(t);
async function open(page:Page){await page.goto('/#spectrum');await expect(page.getByRole('heading',{name:'Measure redshift.'})).toBeVisible();}
// Front QA1 (2026-10-31): Firefox delivers mouse presses at whole pixels and Chromium keeps the fraction, so the expected readout
// is the engine's own mapping (SpectrumInstrument native(), engineReadout) of the release point the page actually received, in the
// default 3700–4700 Å window.
async function released(page:Page){return id(page,'engine-plot').evaluate(n=>{const[x,y]=(window as unknown as{__up:[number,number]}).__up,r=n.getBoundingClientRect(),nx=((x-r.left)/r.width*960-60)/860*600,ny=((y-r.top)/r.height*360-56)/250*200;return{nx,wavelength:3700+nx*1000/600,intensity:(200-ny)/200};});}
// Presses go to the first whole pixel at or after the point (Firefox's client point is that pixel minus the scroll fraction), so
// the release is never short of 3950 Å and the one-pixel keyboard step stays nearer H than K in both engines.
async function at(page:Page,fx:number,fy:number){const b=(await id(page,'engine-plot').boundingBox())!,d=await page.evaluate(()=>({x:scrollX-visualViewport!.pageLeft,y:scrollY-visualViewport!.pageTop}));return {x:Math.ceil(b.x+b.width*(60+860*fx)/960+d.x),y:Math.ceil(b.y+b.height*(56+250*fy)/360+d.y)};}

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
 await page.evaluate(()=>addEventListener('pointerup',(e:PointerEvent)=>{(window as unknown as{__up:[number,number]}).__up=[e.clientX,e.clientY];},true));
 const p=await at(page,0.5,0.5);await page.mouse.move(p.x,p.y);await page.mouse.down();
 const q=await at(page,0.25,0.25);await page.mouse.move(q.x,q.y);await page.mouse.up();
 const got=await released(page);expect(got.wavelength).toBeGreaterThanOrEqual(3950-1e-9);expect(got.wavelength).toBeLessThan(3950+1000/600);
 await expect(id(page,'engine-readout-wavelength')).toHaveText(got.wavelength.toFixed(1));await expect(id(page,'engine-readout-intensity')).toHaveText(got.intensity.toFixed(3));
 await expect(id(page,'engine-cursor')).toHaveCount(1);
 await id(page,'engine-plot').focus();await page.keyboard.press('ArrowRight');
 await expect(id(page,'engine-readout-wavelength')).toHaveText((got.wavelength+1000/600).toFixed(1));
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
