import { test, expect } from '@playwright/test';

test('a beginner can open the sky, point to M82 and inspect original resources without technical input',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page).toHaveTitle('OpenVireo · Open Virtual Educational Observatory');
  await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('button',{name:'Point telescope ↗',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
  await expect(page.locator('.first-steps li.current')).toContainText('2 · Choose and point');
  await expect(page.locator('.sky-view')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('.sky-caption')).toContainText('catalog points in this field');
  await expect(page.locator('.sky-caption')).not.toContainText('0 catalog points');
  await page.getByLabel('Target',{exact:true}).selectOption('NGC3034');
  await page.getByRole('button',{name:'Point telescope ↗',exact:true}).click();
  await expect(page.getByTestId('pointing-ra')).toHaveText('9.93000');
  await expect(page.getByTestId('pointing-dec')).toHaveText('69.68333');
  await page.getByRole('button',{name:'Switch to telescope view ↗',exact:true}).click();
  await expect(page.getByRole('button',{name:'Telescope · 15′',exact:true})).toHaveAttribute('aria-pressed','true');
  const image=page.getByRole('img',{name:'Original CLEA library image of M82 · NGC 3034'});
  await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((element:HTMLImageElement)=>element.naturalWidth)).toBe(376);
  await page.getByRole('button',{name:'Open spectrum analyzer ↗',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Measure redshift.'})).toBeVisible();
  await expect(page.locator('.library-context')).toContainText('NGC3034.SP');
  await expect(page.locator('.library-context')).toContainText('not a spectrum acquired by the web telescope');
  await expect(page.getByRole('button',{name:/Record measurement/})).toBeDisabled();
  await expect(page.locator('.legend')).toContainText('Library reference · display scaled');
  await expect(page.locator('.spectrum')).toContainText('Display level');
  await page.screenshot({path:'.local/qa/openvireo-analyzer-library.png',fullPage:true});
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button',{name:'← Return to observatory',exact:true}).click();
  await expect(page.getByTestId('pointing-ra')).toHaveText('9.93000');
  await expect(page.getByLabel('Target',{exact:true})).toHaveValue('NGC3034');
  await expect(page.getByRole('button',{name:'Close dome',exact:true})).toBeVisible();
  expect(errors).toEqual([]);await page.screenshot({path:'.local/qa/openvireo-observatory-desktop.png',fullPage:true});
});

test('coordinate validation, panning and mobile layout remain explicit',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await expect(page.getByRole('button',{name:'Spectrum analyzer',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
  await page.getByText('Enter coordinates',{exact:true}).click();
  await page.getByLabel('Right ascension · hours',{exact:true}).fill('24');
  await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('less than 24 hours');
  await page.getByLabel('Right ascension · hours',{exact:true}).fill('0.01');
  await page.getByLabel('Declination · degrees',{exact:true}).fill('0');
  await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
  await expect(page.getByTestId('pointing-ra')).toHaveText('0.01000');
  await page.getByRole('button',{name:'North',exact:true}).click();
  await expect(page.getByTestId('pointing-dec')).toHaveText('0.62500');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'.local/qa/openvireo-observatory-mobile.png',fullPage:true});
});

test('reference access follows actual pointing and remains stable when coordinates are resubmitted',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
  await page.getByRole('button',{name:'Telescope · 15′',exact:true}).click();
  await page.getByLabel('Target',{exact:true}).selectOption('NGC3034');
  await page.getByRole('button',{name:'Spectrum analyzer',exact:true}).click();
  await expect(page.locator('.library-context')).toHaveCount(0);
  await page.getByRole('button',{name:'← Return to observatory',exact:true}).click();
  await page.getByRole('button',{name:'Point telescope ↗',exact:true}).click();
  await expect(page.getByRole('button',{name:'Open spectrum analyzer ↗',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'North',exact:true}).click();
  await expect(page.locator('.reference-card')).toContainText('The selected target is in the field. Center it');
  await expect(page.locator('.reference-card img')).toHaveCount(0);
  await page.getByRole('button',{name:'Spectrum analyzer',exact:true}).click();
  await expect(page.locator('.library-context')).toHaveCount(0);
  await page.getByRole('button',{name:'← Return to observatory',exact:true}).click();
  await page.getByLabel('Target',{exact:true}).selectOption('NGC3031');
  await page.getByRole('button',{name:'Point telescope ↗',exact:true}).click();
  await page.getByText('Enter coordinates',{exact:true}).click();
  await expect(page.getByLabel('Right ascension · hours',{exact:true})).toHaveValue('9.926666667');
  await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
  await expect(page.locator('.first-steps li.current')).toContainText('3 · Explore an instrument');
  await expect(page.getByRole('img',{name:'Original CLEA library image of M81 · NGC 3031'})).toBeVisible();
});

test('scientific coordinate input preserves precision and browsing crosses zero hours',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
  await page.getByText('Enter coordinates',{exact:true}).click();
  const ra=page.getByLabel('Right ascension · hours',{exact:true}),dec=page.getByLabel('Declination · degrees',{exact:true});
  await ra.fill('23.999996');await dec.fill('0');await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
  await expect(ra).toHaveValue('23.999996');await dec.fill('1');await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);await expect(ra).toHaveValue('23.999996');
  await ra.fill('0.01');await dec.fill('0');await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
  await page.getByRole('button',{name:'West',exact:true}).click();await expect(page.getByTestId('pointing-ra')).toHaveText('23.96833');
  await page.getByRole('button',{name:'East',exact:true}).click();await expect(page.getByTestId('pointing-ra')).toHaveText('0.01000');
});

test('polar fields load only the appropriate declination band within a measured byte budget',async({page})=>{
  const transfers:Promise<{url:string;bytes:number}>[]=[];
  page.on('response',response=>{if(/\/original\/sky\/\d{2}\/35\.json$/.test(response.url()))transfers.push(response.body().then(body=>({url:response.url(),bytes:body.length})));});
  await page.goto('/');await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();
  await page.getByText('Enter coordinates',{exact:true}).click();
  await page.getByLabel('Right ascension · hours',{exact:true}).fill('0');
  await page.getByLabel('Declination · degrees',{exact:true}).fill('89.9');
  await page.getByRole('button',{name:'Point to coordinates',exact:true}).click();
  await expect(page.getByTestId('pointing-dec')).toHaveText('89.90000');
  await expect.poll(()=>transfers.length).toBe(24);
  await expect(page.locator('.sky-view')).toHaveAttribute('aria-busy','false');
  const loaded=await Promise.all(transfers);expect(new Set(loaded.map(tile=>tile.url)).size).toBe(24);
  expect(loaded.reduce((sum,tile)=>sum+tile.bytes,0)).toBeLessThan(100_000);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button',{name:'North',exact:true}).click();await expect(page.getByTestId('pointing-dec')).toHaveText('89.47500');
});
