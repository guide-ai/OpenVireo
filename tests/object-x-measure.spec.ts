import {expect,test,type Page} from '@playwright/test';
// X3 component test for src/ObjectXMeasure.tsx on the test-only host tests/fixtures/object-x-measure-host.ts (authored synthetic
// FITS, not CLEA data). The component is mounted by the #object-x route in X4.
const HOST='objectx-measure-host';
async function openHost(page:Page){
 await page.goto('/');await expect(page.locator('h1').first()).toBeVisible();
 await page.evaluate(`import(${JSON.stringify('/tests/fixtures/object-x-measure-host.ts')}).then(m=>{m.mountObjectXMeasureHost();})`);
 const host=page.getByTestId(HOST);await expect(host).toHaveCount(1);return host;
}
const log=async(host:ReturnType<Page['getByTestId']>)=>JSON.parse(await host.getByTestId('host-log').textContent()??'[]') as [number,string,number,number][];

test('keyboard measures at the cursor and the header WCS solves the mark',async({page})=>{
 const host=await openHost(page),viewport=host.getByTestId('objectx-measure-viewport');
 await viewport.focus();
 await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowRight');
 await page.keyboard.press('Shift+ArrowDown');await page.keyboard.press('Shift+ArrowDown');await page.keyboard.press('Shift+ArrowDown');await page.keyboard.press('Shift+ArrowDown');
 for(let i=0;i<2;i++)await page.keyboard.press('ArrowDown');
 await expect(host.getByTestId('objectx-cursor')).toHaveText('Cursor x 51, y 43');
 await page.keyboard.press('Enter');
 const marks=await log(host);expect(marks).toHaveLength(1);expect(marks[0].slice(0,2)).toEqual([0,'target']);
 expect(Math.hypot(marks[0][2]-50.25,marks[0][3]-41.6)).toBeLessThan(0.1);
 await expect(host.getByTestId('objectx-measurements').locator('tbody tr').first()).toContainText('header WCS');
});

test('a click measures on the image shown, and two images give the motion',async({page})=>{
 const host=await openHost(page),canvas=host.getByTestId('objectx-measure-canvas');
 const clickPixel=async(x:number,y:number)=>{const box=(await canvas.boundingBox())!;await canvas.click({position:{x:(x-0.5)*box.width/96,y:(y-0.5)*box.height/80}});};
 await clickPixel(50,42);
 await host.getByRole('button',{name:'Image 2: t2'}).click();await expect(canvas).toHaveAttribute('data-shown','1');
 await clickPixel(53,46);
 const marks=await log(host);expect(marks.map(m=>m[0])).toEqual([0,1]);
 expect(Math.hypot(marks[1][2]-53.25,marks[1][3]-45.6)).toBeLessThan(0.1);
 // 6 px north at 1.2″/px in 1 h.
 await expect(host.getByTestId('objectx-motion')).toContainText('7.20″/h toward position angle 0.0°');
});

test('blinking alternates the images, unaligned until two reference stars are marked on each',async({page})=>{
 const host=await openHost(page),canvas=host.getByTestId('objectx-measure-canvas');
 await expect(host.getByTestId('objectx-blink-mode')).toContainText('raw frames');
 await host.getByRole('radio',{name:'Reference star'}).check();
 await host.getByLabel('Catalogue RA (h m s)').fill('22 43 19');await host.getByLabel('Catalogue Dec (° ′ ″)').fill('-08 02 24');
 const clickPixel=async(x:number,y:number)=>{const box=(await canvas.boundingBox())!;await canvas.click({position:{x:(x-0.5)*box.width/96,y:(y-0.5)*box.height/80}});};
 await clickPixel(20,16);await clickPixel(76,22);
 await host.getByRole('button',{name:'Image 2: t2'}).click();
 await clickPixel(23,14);await clickPixel(79,20);
 await expect(host.getByTestId('objectx-blink-mode')).toContainText('aligned on the first two reference stars');
 await host.getByLabel('Blink interval (ms)').fill('100');
 await host.getByRole('button',{name:'Blink'}).click();
 const seen=new Set<string>();
 for(let i=0;i<20&&seen.size<2;i++){seen.add(await canvas.getAttribute('data-shown')??'');await page.waitForTimeout(60);}
 expect([...seen].sort()).toEqual(['0','1']);
 await expect(host.getByRole('button',{name:'Measure at cursor'})).toBeDisabled();
 await host.getByRole('button',{name:'Stop blinking'}).click();
 await expect(host.getByRole('button',{name:'Measure at cursor'})).toBeEnabled();
});
