import{test,expect}from'@playwright/test';
import{headerTool}from'./fixtures/header-tools';
// UI redesign (presentation only): phone "Tools" disclosure and the System/Light/Dark theme switch.

test('phone Tools menu is a keyboard disclosure: Escape returns focus, choosing a route closes it',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#observatory');
 const toggle=page.locator('.portal-header').getByRole('button',{name:'Tools',exact:true});
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(headerTool(page,'Observatory')).toBeHidden();
 await toggle.focus();await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');
 for(const name of['Observatory','Radio telescope','Spectrum analyzer','Saved images','Classification guide'])await expect(headerTool(page,name)).toBeVisible();
 await expect(page.getByRole('group',{name:'Exercise guides'})).toBeVisible();
 await page.keyboard.press('Tab');await expect(headerTool(page,'Observatory')).toBeFocused();
 await page.keyboard.press('Escape');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toBeFocused();await expect(headerTool(page,'Observatory')).toBeHidden();
 await toggle.click();await headerTool(page,'Spectrometer').click();
 await expect(toggle).toHaveAttribute('aria-expanded','false');expect(new URL(page.url()).hash).toBe('#spectrometer');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('phone Tools menu closes when a guide step changes the page and when the window widens',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#observatory');
 const toggle=page.locator('.portal-header').getByRole('button',{name:'Tools',exact:true});
 await toggle.click();await headerTool(page,'Hubble lab guide').click();
 const guide=page.getByRole('dialog',{name:'Your Hubble investigation',exact:true});await expect(guide).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await guide.getByRole('button',{name:'Go to galaxy exposure',exact:true}).click();
 expect(new URL(page.url()).hash).toBe('#galaxy-exposure');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(headerTool(page,'Observatory')).toBeHidden();
 await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await page.setViewportSize({width:800,height:844});await expect(toggle).toBeHidden();await page.setViewportSize({width:390,height:844});
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(headerTool(page,'Observatory')).toBeHidden();
});

test('wide screens show every tool group without a Tools button',async({page})=>{
 for(const width of[1440,800]){await page.setViewportSize({width,height:900});await page.goto('/#observatory');
  await expect(page.locator('.portal-header').getByRole('button',{name:'Tools',exact:true})).toBeHidden();
  for(const group of['Optical observatory','Radio observatory','Analysis','Files','Exercise guides'])await expect(page.getByRole('group',{name:group})).toBeVisible();}
});

test('theme switch forces light or dark, survives reload, and System follows the browser',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.goto('/#observatory');
 const theme=()=>page.evaluate(()=>document.documentElement.dataset.theme??null);
 const bg=()=>page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
 await expect(page.getByRole('radio',{name:'System'})).toBeChecked();expect(await theme()).toBeNull();const systemDark=await bg();
 await page.getByRole('radio',{name:'Light'}).check();expect(await theme()).toBe('light');expect(await bg()).not.toBe(systemDark);
 await page.reload();await expect(page.getByRole('radio',{name:'Light'})).toBeChecked();expect(await theme()).toBe('light');
 await page.getByRole('radio',{name:'Dark'}).check();expect(await bg()).toBe(systemDark);
 await page.getByRole('radio',{name:'System'}).check();expect(await theme()).toBeNull();
 await page.reload();expect(await theme()).toBeNull();expect(await page.evaluate(()=>localStorage.getItem('openvireo-theme'))).toBeNull();
});
