import{test,expect,type Page}from'@playwright/test';
// Front G5 (docs/SKY-FIELD-VIEW.md): the observatory sky view draws VIREO's own field for the finder and telescope views at any
// pointing, from the compact GSC tiles, and keeps the magnitude ≤ 12 preview with a typed reason where it cannot.
const id=(p:Page,t:string)=>p.getByTestId(t);
async function open(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
async function pointTo(page:Page,ra:string,dec:string){
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
}
test('finder and telescope views draw VIREO\'s field at an uncertified pointing; a missing photograph and an Object X neighbourhood keep the preview',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);
 // The start (M81, finder view): VIREO's finder field from the tiles.
 await expect(id(page,'sky-map')).toHaveAttribute('data-field','native',{timeout:30000});
 await expect(id(page,'sky-field-note')).toContainText(/VIREO’s Finder · 2\.5° view, drawn as VIREO draws it from its loaded 7\.5° field \([\d,]+ stars and \d+ galaxies\)/);
 await expect(id(page,'sky-field-canvas')).toBeVisible();
 // Telescope view at M81: its field holds NGC 3031's photograph, which is not published, so the preview stays with the reason.
 await page.getByRole('button',{name:/Switch to telescope view/}).click();
 await expect(id(page,'sky-field-note')).toContainText('photographic-image',{timeout:30000});await expect(id(page,'sky-map')).toHaveAttribute('data-field','preview');
 // An ordinary field (RA 5.5 h, Dec −5°): drawn.
 await pointTo(page,'5.5','-5');
 await expect(id(page,'sky-map')).toHaveAttribute('data-field','native',{timeout:30000});
 await expect(id(page,'sky-field-note')).toContainText(/VIREO’s Telescope · 15′ view, drawn as VIREO draws it from its loaded 0\.75° field \([\d,]+ stars/);
 // Near the Object X target NGC 2403: no field, the masked reason.
 await pointTo(page,'7.61','65.6');
 await expect(id(page,'sky-field-note')).toContainText('Object X',{timeout:30000});await expect(id(page,'sky-map')).toHaveAttribute('data-field','preview');
 expect(errors).toEqual([]);
});

// Front G5 review 1 L6: a pointing change while a build waits for its tiles cancels it; the view ends on the final field.
test('a pointing change mid-build ends on the final field',async({page})=>{
 test.setTimeout(90000);
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 await page.route('**/original/gsc/**',async route=>{await gate;await route.continue().catch(()=>{});});
 await open(page);
 await page.getByRole('button',{name:/Switch to telescope view/}).click();
 await pointTo(page,'5.5','-5');await expect(id(page,'sky-map')).toHaveAttribute('data-field','preview');
 await pointTo(page,'12.5','27');
 release();
 await expect(id(page,'sky-map')).toHaveAttribute('data-anchor','12.5,27',{timeout:30000});
 await expect(id(page,'sky-map')).toHaveAttribute('data-field','native');
});
