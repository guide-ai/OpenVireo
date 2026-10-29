/** Front Perf render budget (coordinator decision D1, 2026-10-29): component counts per scenario on the dev build, with a
 * small headroom. A count above its budget fails; times are never asserted. How to change a budget deliberately:
 * docs/RENDER-BUDGET.md. OPENVIREO_RENDER_REPORT=1 prints every scenario's count and its top components. */
import {test,expect,type Page} from '@playwright/test';
import {installRenderProbe,rendersOf,type RenderTally} from './fixtures/render-probe';

// Measured count → budget (count plus headroom). Keep in step with docs/RENDER-BUDGET.md.
const BUDGET={
 classificationLoad:350,
 classificationKey:80,
 classificationFill:80,
 classificationToSpectrum:80,
 analyzerKey:12,
 observatoryLoad:118,
 openDome:58,
} as const;
type Scenario=keyof typeof BUDGET;

function check(name:Scenario,t:RenderTally){
 if(process.env.OPENVIREO_RENDER_REPORT)console.log(`${name}: ${t.components} components in ${t.commits} commits (budget ${BUDGET[name]}); top ${
  Object.entries(t.byName).sort((a,b)=>b[1]-a[1]).slice(0,process.env.OPENVIREO_RENDER_REPORT==='all'?undefined:12).map(([k,v])=>`${k}×${v}`).join(', ')}`);
 expect(t.components,`${name} renders ${t.components} components; budget ${BUDGET[name]} (docs/RENDER-BUDGET.md)`).toBeLessThanOrEqual(BUDGET[name]);
}
const typeField=(page:Page)=>page.getByLabel('Proposed spectral type',{exact:true});

test('classification: load, keystroke, fill and route change stay within the render budget',async({page})=>{
 test.setTimeout(90000);await installRenderProbe(page);
 check('classificationLoad',await rendersOf(page,async()=>{await page.goto('/#classification');await typeField(page).waitFor({timeout:30000});},800));
 await typeField(page).click();
 check('classificationKey',await rendersOf(page,()=>typeField(page).press('x')));
 check('classificationFill',await rendersOf(page,()=>typeField(page).fill('Budget probe')));
 check('classificationToSpectrum',await rendersOf(page,async()=>{await page.locator('[data-route="spectrum"]').first().click();await page.getByLabel('Object or reference').first().waitFor();},800));
 const object=page.getByLabel('Object or reference').first();await object.click();
 check('analyzerKey',await rendersOf(page,()=>object.press('x')));
});

test('observatory: load and opening the dome stay within the render budget',async({page})=>{
 test.setTimeout(90000);await installRenderProbe(page);
 check('observatoryLoad',await rendersOf(page,async()=>{await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.',exact:true})).toBeVisible({timeout:30000});},800));
 check('openDome',await rendersOf(page,()=>page.getByRole('button',{name:'Open dome ↗',exact:true}).click()));
});
