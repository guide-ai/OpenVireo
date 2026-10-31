import {test,expect,type Page} from '@playwright/test';

// Front S2 (analysis/front-plans/front-s2-range.md §6.1): VIREO's one spectrometer range, shared by the star, sky and Object X
// routes and read by Multi-Spec; off the default, Object X refuses every target alike and Multi-Spec is refused [W].
const id=(p:Page,t:string)=>p.getByTestId(t);
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const go=(p:Page,hash:string)=>p.evaluate(h=>{location.hash=h;},hash);
async function setRange(p:Page,opener:string,min:number,max:number){
 await id(p,opener).click();const warn=id(p,'spectral-range-warning');if(await warn.count())await id(p,'spectral-range-warning-ok').click();
 await id(p,'spectral-range-min').fill(String(min));await id(p,'spectral-range-max').fill(String(max));await id(p,'spectral-range-ok').click();
}
test('one range for the star and sky routes; the sky counts do not depend on it',async({page})=>{
 await page.clock.install();await page.goto('/#star-exposure');
 await setRange(page,'star-spectral-range-open',5,15);await expect(id(page,'star-spectral-range')).toHaveText('Spectrometer range: 4000.0–5000.0 Å (600 bins).');
 await go(page,'#sky-exposure');await expect(id(page,'sky-spectral-range')).toHaveText('Spectrometer range: 4000.0–5000.0 Å (600 bins).');
 await button(page,'Activate supported sky field').click();await expect(id(page,'sky-phase')).toHaveText('Ready / paused');
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await button(page,'Start sky exposure').click();
 await page.clock.runFor(1000);await button(page,'Pause exposure').click();
 await expect(id(page,'sky-elapsed')).toHaveText('1000 ms');await expect(id(page,'sky-total')).toHaveText('29');// as at 3700–4700 (sky-exposure.spec)
 // Default from the sky route (the warning first: the exposure has counts) sets the star route back too.
 await id(page,'sky-spectral-range-open').click();await expect(id(page,'spectral-range-warning')).toBeVisible();await id(page,'spectral-range-warning-ok').click();
 await id(page,'spectral-range-default').click();await id(page,'spectral-range-ok').click();
 await expect(id(page,'sky-spectral-range')).toHaveText('Spectrometer range: 3700.0–4700.0 Å (600 bins).');await expect(id(page,'sky-total')).toHaveText('0');
 // The star route's own exposure keeps the range it was taken on; its next new exposure starts on the shared one.
 await go(page,'#star-exposure');await expect(id(page,'star-spectral-range')).toHaveText('Spectrometer range: 4000.0–5000.0 Å (600 bins).');
 await button(page,'New seeded exposure').click();await expect(id(page,'star-spectral-range')).toHaveText('Spectrometer range: 3700.0–4700.0 Å (600 bins).');
});
test('off the default, Object X refuses every target with the same text and Multi-Spec is refused',async({page})=>{
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 await expect(id(page,'objectx-target').locator('option')).toHaveCount(18);
 await page.locator('[data-testid=objectx-lab] input').first().fill('7');
 await setRange(page,'objectx-spectral-range-open',5,15);
 const texts:string[]=[];
 for(const code of ['X-NTFB6','X-ZATDM','X-PRNJS']){// a star, a galaxy and a QSO row
  await id(page,'objectx-target').selectOption(code);await button(page,'Place the slit on the object').click();
  await expect(id(page,'objectx-spectrum-range')).toBeVisible();texts.push(await id(page,'objectx-spectrum-status').innerText());
 }
 expect(new Set(texts).size).toBe(1);expect(texts[0]).toContain('not yet verified');
 await go(page,'#observatory');await expect(id(page,'ms-range-block').first()).toContainText('4000.0–5000.0');
});
// Review 1 closure gap (L1): the restore paths set the page's range.
async function exposeStar(p:Page){
 await button(p,'Activate supported star field').click();await button(p,'Start star exposure').click();
 await p.clock.runFor(1000);await button(p,'Pause exposure').click();
}
test('an investigation restore takes its exposures\' range; a star restored from the analyser sets it too',async({page})=>{
 await page.clock.install();await page.goto('/#star-exposure');
 await setRange(page,'star-spectral-range-open',5,15);await exposeStar(page);
 const d=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();
 const saved=await (await d).path();
 await page.reload();await go(page,'#sky-exposure');await expect(id(page,'sky-spectral-range')).toHaveText('Spectrometer range: 3700.0–4700.0 Å (600 bins).');
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles(saved!);
 await go(page,'#sky-exposure');await expect(id(page,'sky-spectral-range')).toHaveText('Spectrometer range: 4000.0–5000.0 Å (600 bins).',{timeout:30000});
 // Back to the default from the sky route, then the analyser's "restore this acquisition" brings the star's range back.
 await setRange(page,'sky-spectral-range-open',2,12);await expect(id(page,'sky-spectral-range')).toHaveText('Spectrometer range: 3700.0–4700.0 Å (600 bins).');
 await go(page,'#star-exposure');await button(page,'Analyze acquired star').click();await expect(page).toHaveURL(/#spectrum$/);
 await button(page,'Restore this acquisition in the telescope').click();await expect(page).toHaveURL(/#star-exposure$/);
 // The sky route now shows its own new exposure (default); the Object X row, which has no exposure, shows the page's range.
 await go(page,'#object-x');await expect(id(page,'objectx-spectral-range')).toHaveText('Spectrometer range: 4000.0–5000.0 Å (600 bins).',{timeout:30000});
});
