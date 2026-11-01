import{test,expect,type Page}from'@playwright/test';
// Front C7 (analysis/front-plans/front-c7.md): VIREO paints M31's telescope field without NGC 224 (0x53b848 draws nothing) and only
// shows "Image Too Large!"; OpenVireo draws the field and shows that box as a notice. The finder view has no such routine.
const id=(p:Page,t:string)=>p.getByTestId(t);
async function open(page:Page){
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
}
async function pointTo(page:Page,ra:string,dec:string){
 if(!await page.locator('#point-ra').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await page.locator('#point-ra').fill(ra);await page.locator('#point-dec').fill(dec);await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
}
test('the telescope view at M31 draws the field and shows VIREO\'s "Image Too Large!" notice; elsewhere there is none',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page);
 await page.getByRole('button',{name:/Switch to telescope view/}).click();
 await pointTo(page,'0.71231','41.2692');
 await expect(id(page,'sky-map')).toHaveAttribute('data-field','native',{timeout:30000});
 const notice=id(page,'sky-m31-notice');
 await expect(notice).toContainText('Image Too Large!');await expect(notice).toContainText('M31 Image Too Large to Load!');await expect(notice).toContainText("Sorry about that. (We're working on it.)");
 await expect(id(page,'sky-field-note')).toContainText(/VIREO’s Telescope · 15′ view/);
 await pointTo(page,'5.5','-5');
 await expect(id(page,'sky-map')).toHaveAttribute('data-field','native',{timeout:30000});await expect(id(page,'sky-m31-notice')).toHaveCount(0);
 expect(errors).toEqual([]);
});
