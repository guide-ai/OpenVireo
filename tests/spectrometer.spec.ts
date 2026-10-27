import { test, expect } from '@playwright/test';
import{clickHeaderTool,openHeaderTools}from'./fixtures/header-tools';

test('pointed Coma1 reaches source preparation with explicit continuation and preserves the observation gate',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
  await page.getByLabel('Target',{exact:true}).selectOption('NGC4874');
  await page.getByRole('button',{name:'Switch to telescope view ↗',exact:true}).click();
  await page.getByRole('button',{name:'Open spectrometer ↗',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Prepare a source spectrum.'})).toBeFocused();
  await expect(page.getByRole('button',{name:'Spectrometer',exact:true})).toHaveAttribute('aria-current','page');
  await expect(page.getByTestId('source-file')).toHaveText('GLXYTMPL.SP');
  await expect(page.getByText('Redshifted template with continuation',{exact:true})).toBeVisible();
  await expect(page.getByText('4,671.13 K',{exact:true})).toBeVisible();
  const curve=page.getByTestId('prepared-source-curve');await expect(curve).toBeVisible();
  const original=(await curve.getAttribute('points'))!.split(' ');expect(original).toHaveLength(600);
  await expect(page.getByRole('button',{name:'Acquisition unavailable',exact:true})).toBeDisabled();
  await expect(page.getByText(/A pointed navigation target is not yet a verified object under the slit/)).toBeVisible();
  await page.getByText('Repeatable source preparation',{exact:true}).click();
  await expect(page.getByText('Random draws during preparation: 23',{exact:true})).toBeVisible();
  for(const invalid of ['not-a-seed','0x10','1e3','0b11','0o7','2.0']){
    await page.getByLabel('Preview seed',{exact:true}).fill(invalid);
    await expect(page.getByRole('alert')).toContainText('Enter an integer preview seed');await expect(curve).toHaveCount(0);
  }
  await page.getByLabel('Preview seed',{exact:true}).fill('2');await expect(curve).toBeVisible();
  const changed=(await curve.getAttribute('points'))!.split(' ');
  // Chart scaling changes with its maximum, so compare relative intensities
  // through path shape only where the same fixed SP maximum remains dominant.
  expect(changed[0]).not.toBe(original[0]);expect(changed[599]).toBe(original[599]);
  await page.screenshot({path:'.local/qa/openvireo-spectrometer-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'← Return to observatory',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeFocused();
  await expect(page.getByLabel('Target',{exact:true})).toHaveValue('NGC4874');
  await page.getByRole('button',{name:'Close dome',exact:true}).click();
  await clickHeaderTool(page,'Spectrometer');
  await expect(page.getByRole('heading',{name:'Point the telescope to begin',exact:true})).toBeVisible();await expect(curve).toHaveCount(0);
});

test('source integrity failure leaves no curve or acquired counts; mobile navigation remains usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/original/spectra/GLXYTMPL.SP',route=>route.fulfill({status:200,body:'0 1\n1 1\n2 1\n',contentType:'text/plain'}));
  await page.goto('/');
  // UI redesign: on phones the tools fold behind the Tools menu; open it, then the Spectrometer tool must be visible.
  await openHeaderTools(page);await expect(page.getByRole('button',{name:'Spectrometer',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
  await page.getByLabel('Target',{exact:true}).selectOption('NGC4874');
  await page.getByRole('button',{name:'Switch to telescope view ↗',exact:true}).click();
  await page.getByRole('button',{name:'Open spectrometer ↗',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveText('The original source file could not be verified. No profile was prepared.');
  await expect(page.getByTestId('prepared-source-curve')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Acquisition unavailable',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'.local/qa/openvireo-spectrometer-mobile.png',fullPage:true});
});

test('the matched source remains readable on a narrow screen and consumes no preparation randomness',async({page})=>{
  let requests=0;page.on('request',request=>{if(request.url().endsWith('/original/spectra/NGC3034.SP'))requests++;});
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
  await page.getByLabel('Target',{exact:true}).selectOption('NGC3034');
  await page.getByRole('button',{name:'Switch to telescope view ↗',exact:true}).click();
  await page.getByRole('button',{name:'Open spectrometer ↗',exact:true}).click();
  await expect(page.getByTestId('source-file')).toHaveText('NGC3034.SP');
  await expect(page.getByTestId('prepared-source-curve')).toBeVisible();
  const minimumLabelHeight=await page.locator('.source-spectrum text').evaluateAll(nodes=>Math.min(...nodes.map(node=>node.getBoundingClientRect().height)));
  expect(minimumLabelHeight).toBeGreaterThanOrEqual(9.5);
  await page.getByText('Repeatable source preparation',{exact:true}).click();
  await expect(page.getByText('Random draws during preparation: 0',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'← Return to observatory',exact:true}).click();
  await page.getByRole('button',{name:'Open spectrometer ↗',exact:true}).click();
  await expect(page.getByTestId('source-file')).toHaveText('NGC3034.SP');expect(requests).toBe(1);
  await page.screenshot({path:'.local/qa/openvireo-spectrometer-mobile-ready.png',fullPage:true});
});
