import {test,expect} from '@playwright/test';

// Front QA1 (2026-10-31): at 320 px the camera settings stack in a column; the camera-kind fieldsets kept flex-basis 100 %,
// which Firefox resolved against the column's height, so the "Camera" fieldset grew very tall and the next one was pushed
// sideways. Both fieldsets must hug their content and stay inside the card in every engine.
test('the CCD camera card stays compact and inside the page at 320 px',async({page})=>{
 await page.setViewportSize({width:320,height:800});
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:15000});
 const camera=page.getByTestId('camera-control');await camera.scrollIntoViewIfNeeded();
 const card=(await camera.boundingBox())!;
 const kinds=camera.locator('fieldset.camera-kind');expect(await kinds.count()).toBeGreaterThan(0);
 for(const box of await kinds.evaluateAll(n=>n.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,height:r.height};}))){
  expect(box.height).toBeLessThan(260);
  expect(box.x).toBeGreaterThanOrEqual(card.x-1);expect(box.right).toBeLessThanOrEqual(card.x+card.width+1);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
