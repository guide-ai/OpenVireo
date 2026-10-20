import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

test('import, recovered control transitions, cancelled record and CSV export', async ({ page }) => {
  await page.goto('/#spectrum');
  await expect(page.getByRole('heading', { name: 'Measure redshift.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Record measurement/ })).toBeDisabled();
  // Explicit adapter validation vector. Not a simulated or original CLEA observation.
  const inputBytes = Buffer.from('wavelength,intensity\n3700,0.25\n4000,0.5\n4700,0.75\n');
  await page.getByLabel('Import spectrum', { exact: true }).setInputFiles({ name: 'numeric-control.csv', mimeType: 'text/csv', buffer: inputBytes });
  await expect(page.getByRole('button', { name: /Record measurement/ })).toBeDisabled();
  await page.getByLabel('Object or reference').fill('Validation vector');
  await page.getByLabel('z step per tick').fill('0.0009765625');
  await page.getByRole('button', { name: 'Apply step', exact: true }).click();
  await expect(page.getByRole('button', { name: /Record measurement/ })).toBeEnabled();
  const slider = page.getByRole('slider'); await slider.focus();
  for (let i = 0; i < 12; i++) await slider.press('ArrowRight');
  const before = await page.getByTestId('z-value').textContent();
  await page.getByRole('button', { name: 'Coarse ×10' }).click(); await expect(page.getByTestId('z-value')).toHaveText(before!);
  await page.getByRole('button', { name: 'Recenter control' }).click(); await expect(page.getByTestId('z-value')).toHaveText(before!);
  await page.getByRole('button', { name: /Record measurement/ }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: /Export CSV/ })).toBeDisabled();
  await page.getByRole('button', { name: /Record measurement/ }).click(); await page.getByRole('button', { name: 'Save measurement', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Validation vector', exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: /Export CSV/ }).click();
  const download = await downloadEvent; expect(download.suggestedFilename()).toBe('openvireo-measurements.csv');
  const stream = await download.createReadStream(); const parts: Buffer[] = []; for await (const part of stream!) parts.push(part);
  const csv = Buffer.concat(parts).toString().split('\r\n');
  expect(csv[0]).toBe('schema,id,object,file,sha256,z_number,z_float32,z_float32_hex,analyst_step,base,position,factor,reference,numerical_policy');
  expect(csv[1].split(',')).toEqual(['2', '1', '"Validation vector"', '"numeric-control.csv"', createHash('sha256').update(inputBytes).digest('hex'), '0.01171875', '0.01171875', '3c400000', '0.0009765625', '0.01171875', '0', '10', '"GLXYLNS.LST"', 'Number_x87_equivalence_unvalidated']);
  await page.getByRole('button', { name: 'About this version ↗' }).click(); await expect(page.getByRole('heading', { name: 'A traceable reconstruction.' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog', {name:'A traceable reconstruction.'})).not.toBeVisible();
});

test('reset visibly invalidates the analyst step and selecting the active factor is a no-op', async ({ page }) => {
  await page.goto('/#spectrum');
  const step = page.getByLabel('z step per tick');
  await step.fill('0.0009765625'); await page.getByRole('button', { name: 'Apply step', exact: true }).click();
  const slider = page.getByRole('slider'); await slider.focus();
  for (let i = 0; i < 4; i++) await slider.press('ArrowRight');
  await page.getByRole('button', { name: 'Fine ×1' }).click(); await expect(slider).toHaveValue('4');
  await page.getByLabel('Import spectrum', { exact: true }).setInputFiles({ name: 'reset-test.csv', mimeType: 'text/csv', buffer: Buffer.from('3700,.2\n4000,.4\n4700,.6') });
  await page.getByRole('heading', { name: 'File ready' }).waitFor();
  await expect(step).toBeEmpty(); await expect(slider).toBeDisabled();
  await step.fill('0.001'); await page.getByRole('button', { name: 'Apply step', exact: true }).click();
  await page.getByRole('button', { name: 'New adjustment · z = 0' }).click();
  await expect(step).toBeEmpty(); await expect(slider).toBeDisabled();
});

test('tiny z remains visible and storage rounding to zero is explicit', async ({ page }) => {
  await page.goto('/#spectrum');
  await page.getByLabel('Import spectrum', { exact: true }).setInputFiles({ name: 'precision-test.csv', mimeType: 'text/csv', buffer: Buffer.from('3700,.2\n4000,.4\n4700,.6') });
  await page.getByRole('heading', { name: 'File ready' }).waitFor();
  await page.getByLabel('z step per tick').fill('1e-50'); await page.getByRole('button', { name: 'Apply step', exact: true }).click();
  await page.getByRole('slider').focus(); await page.getByRole('slider').press('ArrowRight');
  await expect(page.getByTestId('z-value')).toHaveText('+1.00000000e-50');
  await page.getByRole('button', { name: /Record measurement/ }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('rounds to 0');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('the rendered curve retains a one-sample absorption feature', async ({ page }) => {
  await page.goto('/#spectrum');
  const rows = Array.from({ length: 3600 }, (_, i) => `${3700 + i * .25},${i === 1 ? .1 : .9}`);
  await page.getByLabel('Import spectrum', { exact: true }).setInputFiles({ name: 'render-regression.csv', mimeType: 'text/csv', buffer: Buffer.from(rows.join('\n')) });
  await page.getByRole('heading', { name: 'File ready' }).waitFor();
  const points = await page.locator('.observed-curve').getAttribute('points');
  expect(Math.max(...points!.split(' ').map(p => Number(p.split(',')[1])))).toBe(281);
});

test('rejects invalid imports and remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/#spectrum');
  await page.getByLabel('Import spectrum', { exact: true }).setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from('4000,2\n4001,1') });
  await expect(page.getByRole('alert')).toContainText('normalize'); await expect(page.getByRole('button', { name: /Record measurement/ })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('recording rejects z that would round to minus one in float32',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#spectrum');
  await page.getByLabel('Import spectrum',{exact:true}).setInputFiles({name:'boundary.csv',mimeType:'text/csv',buffer:Buffer.from('3700,.2\n4000,.4\n4700,.6')});
  await page.getByRole('heading',{name:'File ready'}).waitFor();
  await page.getByLabel('z step per tick').fill('0.0099999999');await page.getByRole('button',{name:'Apply step',exact:true}).click();
  await page.getByRole('slider').focus();await page.getByRole('slider').press('Home');
  await page.getByRole('button',{name:/Record measurement/}).click();
  await expect(page.getByRole('alert')).toContainText('rounds to −1 as float32');
  await expect(page.getByRole('button',{name:/Export CSV/})).toBeDisabled();
  expect(errors).toEqual([]);
});
