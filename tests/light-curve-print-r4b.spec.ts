import {test,expect,type Page} from '@playwright/test';
// Front R4b (analysis/front-plans/front-r4b.md §1; dossier analysis/front-r4/B-mono-color-portrait.md §1, §4a): the light-curve
// window is in colour until its first Print, prints in colour only with Print in Color, then keeps Monochrome Displays as of
// that print for the session; portrait keeps the plot on page 1, landscape moves it to page 2.
const id=(p:Page,t:string)=>p.getByTestId(t);
const route=(page:Page,hash:string)=>page.evaluate(h=>{location.hash=h;},hash);
async function setOptions(page:Page,change:Readonly<Record<string,boolean>>){
 await route(page,'#observatory');
 const card=page.locator('.telescope-motion');
 await card.getByTestId('ob-options').click();
 for(const [k,on] of Object.entries(change))await id(page,`ob-options-${k}`).setChecked(on);
 await id(page,'ob-options-ok').click();await expect(id(page,'ob-options-dialog')).toBeHidden();
}
async function openCurve(page:Page){
 await route(page,'#variable-stars');
 await expect(id(page,'variable-count')).toContainText('31,147 matching records',{timeout:20_000});
 await id(page,'variable-name').fill('del Cep');
 await page.getByRole('button',{name:'Open del Cep',exact:true}).click();
 await id(page,'vstar-data-menu').click();await id(page,'vstar-display-curve').click();
 await expect(id(page,'light-curve-svg')).toBeVisible();
}
async function printCurve(page:Page){await id(page,'curve-file-menu').click();await id(page,'curve-print').click();await expect(id(page,'variable-print-preview')).toBeVisible();}
const scheme=(page:Page,t:string)=>id(page,t).getAttribute('data-scheme');

test('the light curve stays in colour until the first Print, then keeps Monochrome Displays as of that print',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
 await setOptions(page,{'monochrome-displays':true});
 await openCurve(page);
 // Monochrome Displays is on, but the form has not printed yet: colour (flag +0x404 starts 0).
 expect(await scheme(page,'light-curve-svg')).toBe('colour');
 await expect(id(page,'light-curve-svg').locator('rect').first()).toHaveAttribute('fill','#000080');
 await printCurve(page);
 // Print in Color off: the page prints in black on white.
 expect(await scheme(page,'variable-print-svg')).toBe('mono');
 await expect(id(page,'variable-print-svg').locator('polyline')).toHaveAttribute('stroke','#000000');
 await id(page,'variable-print-close').click();
 expect(await scheme(page,'light-curve-svg')).toBe('mono');
 // Exit and reopen: the single form keeps its flag.
 await id(page,'curve-file-menu').click();await id(page,'curve-exit').click();
 await id(page,'vstar-data-menu').click();await id(page,'vstar-display-curve').click();
 expect(await scheme(page,'light-curve-svg')).toBe('mono');
 // Changing the options alone changes nothing until the next print.
 await setOptions(page,{'monochrome-displays':false,'print-in-color':true});
 await route(page,'#variable-stars');
 expect(await scheme(page,'light-curve-svg')).toBe('mono');
 await printCurve(page);
 expect(await scheme(page,'variable-print-svg')).toBe('colour');
 await expect(id(page,'variable-print-svg').locator('polyline')).toHaveAttribute('stroke','#ffff00');
 await id(page,'variable-print-close').click();
 expect(await scheme(page,'light-curve-svg')).toBe('colour');
});

test('portrait keeps title and plot on page 1; landscape adds the next-page line, page 2 and an @page size',async({page})=>{
 await page.goto('/#variable-stars');
 await openCurve(page);await printCurve(page);
 const preview=id(page,'variable-print-preview');
 await expect(preview).toHaveAttribute('data-orientation','portrait');
 await expect(id(page,'variable-print-page2')).toHaveCount(0);
 await expect(id(page,'variable-print-title')).toHaveText('CLEA Exercise "VIREO - The VIRtual Educational Observatory"');
 await expect(preview.locator('style')).toHaveJSProperty('textContent','@page{size:portrait}');
 await preview.getByLabel('Landscape').check();
 await expect(id(page,'variable-print-next-page')).toHaveText('(Screen Image Printed on Next Page)');
 await expect(id(page,'variable-print-page2').getByTestId('variable-print-title')).toBeVisible();
 await expect(id(page,'variable-print-page2').getByTestId('variable-print-svg')).toBeVisible();
 await expect(preview.locator('style')).toHaveJSProperty('textContent','@page{size:landscape}');
});
