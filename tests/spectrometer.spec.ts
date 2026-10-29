import { test, expect } from '@playwright/test';
import{openHeaderTools}from'./fixtures/header-tools';
// Front P retired the #spectrometer source-profile preview (M82/Coma1/Coma2, "Acquisition unavailable"); the route is now an
// index of the verified spectrometer routes (docs/POLISH-FRONT-P.md).

test('Open spectrometer from a pointed galaxy reaches the spectrometer index, which links to the real routes',async({page})=>{
  let previews=0;page.on('request',r=>{if(/\/original\/spectra\/(GLXYTMPL|NGC\d+)\.SP$/.test(r.url())&&new URL(page.url()).hash==='#spectrometer')previews++;});
  await page.goto('/');
  await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
  await page.getByLabel('Target',{exact:true}).selectOption('NGC4874');
  await page.getByRole('button',{name:'Switch to telescope view ↗',exact:true}).click();
  await page.getByRole('button',{name:'Open spectrometer ↗',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Where to take a spectrum'})).toBeFocused();
  await expect(page.getByRole('button',{name:'Spectrometer',exact:true})).toHaveAttribute('aria-current','page');
  const routes=page.getByTestId('spectrometer-routes');
  await expect(routes.getByRole('link')).toHaveText(['Catalog star exposure','Galaxy exposure','LSS survey','Object X','Multi-Spec','Spectrum analyzer','Classification']);
  await expect(page.getByText(/Exposure acquisition is pending|Acquisition unavailable|Prepare a source spectrum/)).toHaveCount(0);
  await expect(page.getByTestId('prepared-source-curve')).toHaveCount(0);expect(previews).toBe(0);
  await routes.getByRole('link',{name:'Galaxy exposure'}).click();await expect.poll(()=>new URL(page.url()).hash).toBe('#galaxy-exposure');
});

test('the spectrometer index fits a phone and returns to the observatory',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/#observatory');
  await openHeaderTools(page);await page.locator('.portal-header nav').getByRole('button',{name:'Spectrometer',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Where to take a spectrum'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Open supported sky exposure'})).toBeVisible();await expect(page.getByRole('link',{name:'Open supported star exposure'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'.local/qa/openvireo-spectrometer-index-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'← Return to observatory',exact:true}).click();await expect.poll(()=>new URL(page.url()).hash).toBe('#observatory');
});
