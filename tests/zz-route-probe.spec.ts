import {test} from '@playwright/test';
import {installRenderProbe,rendersOf} from './fixtures/render-probe';
const ROUTES=['observatory','spectrometer','sky-exposure','star-exposure','galaxy-exposure','photometer','radio-control','pulsar-analysis','spectrum','classification','cluster-database','lss-survey','lss-wedge','object-x','variable-stars','images'];
test('route probe',async({page})=>{
 test.setTimeout(400000);await installRenderProbe(page);
 await page.goto('/#observatory');await page.waitForTimeout(4000);
 for(const r of ROUTES){
  const nav=await rendersOf(page,async()=>{await page.locator(`[data-route="${r}"]`).first().click();await page.waitForTimeout(1500);},600);
  const input=page.locator(`main:visible input[type="text"]:visible:enabled, main:visible textarea:visible:enabled, main:visible input:not([type]):visible:enabled`).first();
  let key='no input';if(await input.count()){const label=await input.evaluate(e=>(e as HTMLInputElement).labels?.[0]?.textContent?.trim().slice(0,40)??e.getAttribute('aria-label')??'?');await input.click();const k=await rendersOf(page,()=>input.press('x'));key=`${k.components} (${label}) OpenVireo=${k.byName.OpenVireo??0}`;}
  console.log('ROUTE',r,'nav',nav.components,'key',key);
 }
});
