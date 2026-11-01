import{test,expect,type Page}from'@playwright/test';
import{readFile}from'node:fs/promises';
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

// Review 1 L2: an end-to-end CCD exposure at M31. Every VizieR request is answered with the recorded response
// (tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml) moved onto the pointing; nothing is sent anywhere. M31 alone sets no
// overlay gate (0x53b628 is skipped for it), so the exposure has no overlay.
const CDS=/vizier\.cds\.unistra\.fr|vizier\.cfa\.harvard\.edu|vizier\.idia\.ac\.za|cdsarc|unistra\.fr/;
const recorded=readFile(new URL('./fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url));
async function moved(ra:number,dec:number){
 const dRa=ra*15-56.75,dDec=dec-24.12;
 return (await recorded).toString('utf8').replace(/<TD>(0?56\.7\d+)<\/TD>/g,(_,v:string)=>`<TD>${(Number(v)+dRa).toFixed(7)}</TD>`).replace(/<TD>\+(24\.1\d+)<\/TD>/g,(_,v:string)=>`<TD>+${(Number(v)+dDec).toFixed(7)}</TD>`);
}
test('a CCD exposure at M31 is made, without an overlay',async({page})=>{
 test.setTimeout(180_000);const RA=0.7123,DEC=41.2692,button=(name:string)=>page.getByRole('button',{name,exact:true}),camera=page.getByTestId('camera-control');
 await page.route(CDS,async route=>route.fulfill({status:200,contentType:'text/xml',body:await moved(RA,DEC)}));
 await open(page);await pointTo(page,String(RA),String(DEC));
 await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
 await expect(id(page,'sky-m31-notice')).toBeVisible({timeout:30000});
 if(!await button('Turn tracking on').isVisible())await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();
 await button('Turn tracking on').click();
 await camera.getByLabel(/Ask VizieR live/).check();await camera.getByLabel('Minutes').fill('0');await camera.getByLabel('Seconds').fill('1');
 await button('Start exposure').click();await expect(id(page,'camera-status')).toHaveText('Image ready.',{timeout:90_000});
 if(!await id(page,'camera-detail-rows').isVisible())await camera.getByText('Exposure details',{exact:true}).click();
 await expect(id(page,'camera-detail-overlay')).toHaveAttribute('data-status','off');
});
