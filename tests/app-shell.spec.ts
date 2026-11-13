import{test,expect}from'@playwright/test';
import{headerTool}from'./fixtures/header-tools';
import en from'../src/i18n/en.json'with{type:'json'};
import es from'../src/i18n/es/es.json'with{type:'json'};
import pt from'../src/i18n/pt-br/pt-br.json'with{type:'json'};
import fr from'../src/i18n/fr/fr.json'with{type:'json'};
import{APP_SHELL_ES}from'../src/i18n/es/maps/appShell';
import{APP_SHELL_PT}from'../src/i18n/pt-br/maps/appShell';
import{APP_SHELL_FR}from'../src/i18n/fr/maps/appShell';
// UI redesign (presentation only): phone "Menu" disclosure ("Tools" in English until Front LAUNCH-2) and the System/Light/Dark theme switch.

test('phone Tools menu is a keyboard disclosure: Escape returns focus, choosing a route closes it',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#observatory');
 const toggle=page.locator('.portal-header').getByRole('button',{name:'Menu',exact:true});
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(headerTool(page,'Observatory')).toBeHidden();
 await toggle.focus();await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');
 for(const name of['Observatory','Radio telescope','Spectrum analyzer','Saved images','Classification guide'])await expect(headerTool(page,name)).toBeVisible();
 await expect(page.getByRole('group',{name:'Exercise guides'})).toBeVisible();
 // Front Onboarding: each section's name is a disclosure button, first in the panel.
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Optical observatory',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(headerTool(page,'Observatory')).toBeFocused();
 await page.keyboard.press('Escape');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toBeFocused();await expect(headerTool(page,'Observatory')).toBeHidden();
 await toggle.click();await headerTool(page,'Spectrometer').click();
 await expect(toggle).toHaveAttribute('aria-expanded','false');expect(new URL(page.url()).hash).toBe('#spectrometer');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('phone Tools menu closes when a guide step changes the page and when the window widens',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#observatory');
 const toggle=page.locator('.portal-header').getByRole('button',{name:'Menu',exact:true});
 await toggle.click();await headerTool(page,'Hubble lab guide').click();
 const guide=page.getByRole('dialog',{name:'Your Hubble investigation',exact:true});await expect(guide).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await guide.getByRole('button',{name:'Go to galaxy exposure',exact:true}).click();
 expect(new URL(page.url()).hash).toBe('#galaxy-exposure');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(headerTool(page,'Observatory')).toBeHidden();
 await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await page.setViewportSize({width:800,height:844});await expect(toggle).toBeHidden();await expect(page.locator('.portal-header')).not.toHaveClass(/tools-open/);await page.setViewportSize({width:390,height:844});
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(headerTool(page,'Observatory')).toBeHidden();
});

test('wide screens show every tool group without a Tools button',async({page})=>{
 for(const width of[1440,800]){await page.setViewportSize({width,height:900});await page.goto('/#observatory');
  await expect(page.locator('.portal-header').getByRole('button',{name:'Menu',exact:true})).toBeHidden();
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

// Front LAUNCH-2: Skip to content is the page's first stop for the keyboard, shown only while focused; it moves focus to the shown
// page's heading (past the sidebar and the page bar) without changing the address. In every language, at desktop and phone widths.
for(const [lang,name,heading] of [['en','Skip to content',en['sky.title']],['es-419',APP_SHELL_ES.skipToContent,es['sky.title']],['pt-BR',APP_SHELL_PT.skipToContent,pt['sky.title']],['fr',APP_SHELL_FR.skipToContent,fr['sky.title']]] as const)
 for(const width of[1440,375])test(`${lang} at ${width} px: Skip to content is the first Tab stop and moves focus to the page heading`,async({page})=>{
  await page.setViewportSize({width,height:800});await page.goto(`/?lang=${lang}#observatory`);
  await expect(page.getByRole('heading',{level:1,name:heading,exact:true})).toBeVisible({timeout:30000});
  const skip=page.getByTestId('skip-to-content');
  await expect(skip).toHaveText(name);
  const hidden=await skip.boundingBox();expect(hidden===null||hidden.y+hidden.height<=0).toBe(true);
  await page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();document.body.removeAttribute('tabindex');});
  await page.keyboard.press('Tab');await expect(skip).toBeFocused();await expect(skip).toBeInViewport({ratio:1});
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{level:1,name:heading,exact:true})).toBeFocused();
  expect(new URL(page.url()).hash).toBe('#observatory');
 });

test('Skip to content on the welcome and on another page lands in that page\'s main content',async({page})=>{
 await page.goto('/');await expect(page.getByTestId('skip-to-content')).toBeAttached();
 await page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();document.body.removeAttribute('tabindex');});await page.keyboard.press('Tab');await expect(page.getByTestId('skip-to-content')).toBeFocused();await page.keyboard.press('Enter');
 expect(await page.evaluate(()=>{const a=document.activeElement;return !!a&&!!a.closest('main')&&a.getClientRects().length>0;})).toBe(true);
 await page.goto('/#cluster-database');await expect(page.getByRole('heading',{level:1}).first()).toBeVisible({timeout:30000});
 await page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();document.body.removeAttribute('tabindex');});await page.keyboard.press('Tab');await page.keyboard.press('Enter');
 expect(await page.evaluate(()=>{const a=document.activeElement;return !!a&&!!a.closest('main')&&a.getClientRects().length>0;})).toBe(true);
 expect(new URL(page.url()).hash).toBe('#cluster-database');
});

// Front LAUNCH-2: the footer credits Project CLEA, Gettysburg College and NSF, and About & privacy opens Help › About OpenVireo and privacy.
test('the welcome footer credits Project CLEA and opens About & privacy',async({page})=>{
 await page.goto('/');
 const footer=page.locator('footer').filter({hasText:en['sky.attribution']});
 await expect(footer).toBeVisible();await expect(footer).toContainText('Project CLEA');await expect(footer).toContainText('Gettysburg College / NSF');
 await expect(footer).not.toContainText('local educational research');
 await footer.getByRole('button',{name:en['sky.aboutPrivacy'],exact:true}).click();
 const about=page.getByTestId('about-dialog');await expect(about).toBeVisible();await expect(about.getByTestId('about-privacy')).toBeVisible();
 await page.keyboard.press('Escape');await expect(about).toBeHidden();
 await page.goto('/#observatory');await expect(page.getByRole('heading',{level:1,name:en['sky.title'],exact:true})).toBeVisible({timeout:30000});
 const own=page.locator('[data-testid="footer-about"]:visible');await own.click();await expect(page.getByTestId('about-dialog')).toBeVisible();
});
