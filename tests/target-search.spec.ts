import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function save(page:Page){const event=page.waitForEvent('download');await page.getByRole('button',{name:'Save investigation',exact:true}).click();return readFile((await(await event).path())!);}
const target=(page:Page)=>page.getByLabel('Target',{exact:true});
const search=(page:Page)=>page.getByRole('searchbox',{name:'Search catalog',exact:true});

test('filtering and selecting preserve pointing and the running clock until explicit Point',async({page})=>{
  await page.clock.install();await page.goto('/#observatory');await expect(search(page)).toBeVisible();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await expect(target(page).locator('option')).toHaveCount(200);
  await page.getByRole('button',{name:'Open dome ↗',exact:true}).click();await target(page).selectOption('NGC3034');await page.getByRole('button',{name:'Point telescope ↗',exact:true}).click();
  await page.getByText('Observatory clock & spectral tracking',{exact:true}).click();await page.getByRole('button',{name:'Turn tracking on',exact:true}).click();await page.getByRole('button',{name:'Start observatory clock',exact:true}).click();await page.clock.runFor(100);
  await search(page).fill('Coma 1');await expect(page.getByTestId('target-search-status')).toHaveText('1 matching target.');await expect(target(page)).toHaveValue('NGC3034');await expect(target(page).locator('option')).toHaveCount(2);await expect(target(page).locator('optgroup')).toHaveCount(2);
  await page.clock.runFor(100);await expect(page.getByTestId('running-clock-elapsed')).toHaveText('200');await expect(page.getByTestId('pointing-ra')).toHaveText('9.93000');
  await target(page).selectOption('NGC4874');await expect(page.getByTestId('pointing-ra')).toHaveText('9.93000');await page.getByRole('button',{name:'Point telescope ↗',exact:true}).click();await expect(page.getByTestId('pointing-ra')).toHaveText('12.99309');await expect(page.getByTestId('pointing-dec')).toHaveText('27.96000');
  const before=await save(page);await search(page).fill('no such target 123456');await expect(page.getByTestId('target-search-status')).toContainText('No matching targets');await expect(target(page)).toHaveValue('NGC4874');await expect(target(page).locator('option')).toHaveCount(1);expect(await save(page)).toEqual(before);
  await page.getByRole('button',{name:'Clear search',exact:true}).click();await expect(search(page)).toBeFocused();await expect(target(page).locator('option')).toHaveCount(200);await expect(target(page)).toHaveValue('NGC4874');await page.clock.resume();
  await page.locator('.observatory-controls .target-card').screenshot({path:'test-results/target-search-desktop.png'});
});

test('mobile keyboard search distinguishes the original and supported acquisition identities',async({page})=>{
  await page.setViewportSize({width:360,height:800});await page.goto('/#observatory');await search(page).fill('36773');await expect(page.getByTestId('target-search-status')).toHaveText('2 matching targets.');
  await expect(target(page).locator('option[value="36773"]')).toHaveCount(1);await expect(target(page).locator('option[value="36773-acquisition"]')).toHaveCount(1);
  const before=await page.getByTestId('pointing-ra').textContent();await target(page).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(target(page)).toHaveValue('36773-acquisition');await expect(page.getByTestId('pointing-ra')).toHaveText(before!);
  await search(page).focus();await page.keyboard.press('Escape');await expect(search(page)).toHaveValue('');await expect(target(page).locator('option')).toHaveCount(200);
  await search(page).fill('Ｍ８２');await expect(page.getByTestId('target-search-status')).toHaveText('1 matching target.');await expect(target(page).locator('option[value="NGC3034"]')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.observatory-controls .target-card').screenshot({path:'test-results/target-search-mobile.png'});
});

test('failed and cancelled imports preserve filter and full21 manual work; successful reimport resets only the filter',async({page})=>{
  const capture=JSON.parse(await readFile(new URL('../data/photometry/pre-photometer-mayall-fixture.json',import.meta.url),'utf8'));
  await page.goto('/#observatory');const input=page.getByLabel('Restore investigation JSON',{exact:true});await expect(input).toBeEnabled();await input.setInputFiles({name:'saved21.json',mimeType:'application/json',buffer:Buffer.from(capture.full21.text)});await expect(page.getByText(/Investigation restored\. Included tools/)).toBeVisible();
  const before=await save(page),selected=await target(page).inputValue();await search(page).fill('<script>alert(1)</script>');await expect(target(page)).toHaveValue(selected);await expect(page.getByTestId('target-search-status')).toContainText('No matching targets');expect(await save(page)).toEqual(before);
  await input.setInputFiles([]);await expect(search(page)).toHaveValue('<script>alert(1)</script>');expect(await save(page)).toEqual(before);
  const bad=JSON.parse(before.toString());bad.clusterSelectionSHA256='bad';await input.setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.getByRole('alert').filter({hasText:'Confirmed work in every tool was kept'})).toBeVisible();await expect(search(page)).toHaveValue('<script>alert(1)</script>');expect(await save(page)).toEqual(before);
  await expect(input).toBeEnabled();await input.setInputFiles({name:'current.json',mimeType:'application/json',buffer:before});await expect(search(page)).toHaveValue('');await expect(target(page)).toHaveValue(selected);expect(await save(page)).toEqual(before);
  await page.reload();await expect(input).toBeEnabled();await input.setInputFiles({name:'current.json',mimeType:'application/json',buffer:before});await expect(page.getByText(/Investigation restored\. Included tools/)).toBeVisible();await expect(search(page)).toHaveValue('');expect(await save(page)).toEqual(before);
});


test('busy restore cancellation by the toolbar and hidden tab retains filter and confirmed work',async({page})=>{
 const capture=JSON.parse(await readFile(new URL('../data/photometry/pre-photometer-mayall-fixture.json',import.meta.url),'utf8'));
 await page.goto('/#observatory');const input=page.getByLabel('Restore investigation JSON',{exact:true});await expect(input).toBeEnabled();await input.setInputFiles({name:'saved21.json',mimeType:'application/json',buffer:Buffer.from(capture.full21.text)});await expect(page.getByText(/Investigation restored\. Included tools/)).toBeVisible();const bytes=await save(page);
 await page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=async function(){const result=await original.call(this);if(this.name==='late-search.json')await new Promise<void>(resolve=>Object.defineProperty(window,'continueSearchRestore',{value:resolve,configurable:true}));return result;};});
 for(const cancel of ['toolbar','hidden']){
  await search(page).fill('Coma 1');await expect(input).toBeEnabled();await input.setInputFiles({name:'late-search.json',mimeType:'application/json',buffer:bytes});await expect.poll(()=>page.evaluate(()=>typeof(window as unknown as {continueSearchRestore?:unknown}).continueSearchRestore)).toBe('function');
  if(cancel==='toolbar')await page.getByRole('button',{name:'Cancel pending save/restore',exact:true}).click();else await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.getByText('Pending investigation operation cancelled. Confirmed work in every tool was kept.',{exact:true})).toBeVisible();await page.evaluate(()=>{(window as unknown as {continueSearchRestore:()=>void}).continueSearchRestore();delete(window as unknown as {continueSearchRestore?:unknown}).continueSearchRestore;Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});});
  await expect(search(page)).toHaveValue('Coma 1');expect(await save(page)).toEqual(bytes);
 }
});

test('committed text stays bounded without splitting Unicode or interrupting IME composition',async({page})=>{
 await page.goto('/#observatory');await search(page).fill('x'.repeat(79)+'😀');await expect(search(page)).toHaveValue('x'.repeat(79));
 await search(page).fill('x'.repeat(79));await search(page).evaluate(input=>{input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;setter.call(input,'x'.repeat(79)+'あいう');input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText',data:'あいう'}));});await expect(search(page)).toHaveValue('x'.repeat(79)+'あいう');
 await search(page).evaluate(input=>input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'あいう'})));await expect(search(page)).toHaveValue('x'.repeat(79)+'あ');
});
