import {test,expect,type Page} from '@playwright/test';
import{clickHeaderTool}from'./fixtures/header-tools';

// Front G G3b (analysis/front-plans/front-g-gsc.md §10): the photometer wherever the telescope points, VIREO's way. The field is
// read from the compact GSC tiles; the student moves to a clean patch of sky for the sky reading and back to the star.
// N5230-00946 (11 44 42.9 +55 22 43) and a sky position 0.01° north of it. No catalogue value is asserted.
const STAR={ra:'11.74525',dec:'55.37861111'},SKY={ra:'11.74525',dec:'55.38861111'};
async function photometer(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await clickHeaderTool(page,'Pleiades photometry');await expect(page.getByRole('heading',{name:'Measure a listed star.'})).toBeVisible();
 await page.getByRole('button',{name:'Activate Pleiades photometer',exact:true}).click();
}
async function useHere(page:Page,p:{ra:string;dec:string}){
 await page.locator('#photo-point-ra').fill(p.ra);await page.locator('#photo-point-dec').fill(p.dec);await page.getByTestId('photo-point-telescope').click();
 await expect(page.getByTestId('photo-telescope-dec')).toHaveText(p.dec.replace(/0+$/,''),{timeout:20000});
 await expect(page.getByTestId('photo-use-pointing')).toBeEnabled({timeout:20000});await page.getByTestId('photo-use-pointing').click();
 await expect(page.getByText(/^Field at the telescope pointing: the nearest star is /)).toBeVisible({timeout:60000});
 await expect(page.getByTestId('photo-telescope-access')).toHaveAttribute('data-access','ready',{timeout:20000});
}
async function integrate(page:Page){await page.getByRole('button',{name:'Start integration',exact:true}).click();await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeEnabled({timeout:30000});}
test('sky at a clean pointing, then the star: an object reading from the tiles and VIREO\'s sky question',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await photometer(page);
 await useHere(page,SKY);
 await expect(page.getByLabel('Photometry target',{exact:true})).toHaveValue(/^gsc:/);
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');await integrate(page);
 await useHere(page,STAR);await expect(page.getByLabel('Photometry target',{exact:true})).toHaveValue(/^gsc:/);
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('object');await integrate(page);
 await expect(page.getByRole('button',{name:'Add notebook entry',exact:true})).toBeEnabled();
 // A second sky reading on the star asks first (VIREO's "Reading Sky!"); No keeps the old sky.
 await page.getByLabel('Photometer pointing',{exact:true}).selectOption('sky');
 await page.getByRole('button',{name:'Start integration',exact:true}).click();
 const dialog=page.getByTestId('photo-sky-replace');await expect(dialog.getByRole('heading',{name:'Reading Sky!'})).toBeVisible();
 await expect(dialog).toContainText('Are you sure you want to replace a sky reading with one that may be invalid?');
 await page.getByTestId('photo-sky-replace-no').click();await expect(page.getByText('The sky reading was kept; no new reading was started.')).toBeVisible();
 await page.getByRole('button',{name:'Start integration',exact:true}).click();await page.getByTestId('photo-sky-replace-yes').click();
 await expect(page.getByRole('button',{name:'Start integration',exact:true})).toBeEnabled({timeout:30000});
 expect(errors).toEqual([]);
});
test('a field VIREO\'s photometer cannot reproduce is typed: M31\'s core holds a galaxy',async({page})=>{
 test.setTimeout(120000);await photometer(page);
 await page.locator('#photo-point-ra').fill('0.7123');await page.locator('#photo-point-dec').fill('41.2692');await page.getByTestId('photo-point-telescope').click();
 await expect(page.getByTestId('photo-telescope-dec')).toHaveText('41.2692',{timeout:20000});
 await expect(page.getByTestId('photo-use-pointing')).toBeEnabled({timeout:20000});await page.getByTestId('photo-use-pointing').click();
 await expect(page.getByTestId('photo-tiled-status')).toHaveAttribute('data-status','error',{timeout:60000});
 await expect(page.getByTestId('photo-tiled-status')).toContainText('contains a galaxy');
});
