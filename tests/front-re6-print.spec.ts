import {test,expect} from '@playwright/test';
// Front RE6 review 1 M2: VIREO's print body 0x510294 on the star route at the default 3700–4700 Å range labels every 100 Å up to
// 4700 (λ ≤ the configured λmax, 0x51055e), and the RA/Dec lines show the telescope pointing.
test('star route print body: labels 3700…4700 at the default range, pointing lines, black vector chart',async({page})=>{
 await page.clock.install();await page.goto('/#spectrometer');await page.getByRole('link',{name:'Open supported star exposure',exact:true}).click();
 await page.getByRole('button',{name:'Activate supported star field',exact:true}).click();await expect(page.getByTestId('star-phase')).toHaveText('Ready / paused');
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.getByRole('button',{name:'Start star exposure',exact:true}).click();
 await page.clock.runFor(1000);await page.getByRole('button',{name:'Pause exposure',exact:true}).click();
 const body=page.getByTestId('ob-spectrum-print-body');await expect(body).toHaveCount(1);
 expect(await body.locator('text[data-role=label]').allTextContents()).toEqual(['3700','3800','3900','4000','4100','4200','4300','4400','4500','4600','4700']);
 await expect(body.locator('text[data-role=label]').last()).toHaveAttribute('x','609');
 await expect(body.locator('text[data-role=ra]')).toHaveText(/^Right Ascension: +0h 29m 55\.\d\ds$/);
 await expect(body.locator('text[data-role=dec]')).toHaveText(/^Declination: +0° 02' 10\.\d"$/);
 await expect(page.getByTestId('ob-spectrum-print-trace')).toHaveAttribute('points',/^26,-?\d+ /);
});
