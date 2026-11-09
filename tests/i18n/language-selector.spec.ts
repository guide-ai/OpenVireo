import {test,expect,type Page} from '@playwright/test';
import es from '../../src/i18n/es/es.json' with {type:'json'};

// Front ES1 (docs/I18N.md; user decisions 1, 5 and 9 of 2026-11-09): the English / Español selector at the foot of the header
// menu, its reload confirmation, storage failure, the pre-release gate and the "View original (English)" option.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
async function open(page:Page,query:string,hash='observatory'){
 await page.goto(`/${query}#${hash}`);await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:15_000});
}
const blockStorageWrites=(page:Page)=>page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError');};});

test('before the release the selector appears only on a ?lang= load; production without ?lang shows none',async({page})=>{
 const lazy:string[]=[];page.on('request',r=>{if(r.url().includes('LanguageChoice'))lazy.push(r.url());});
 await open(page,'');
 await expect(id(page,'language-choice')).toHaveCount(0);expect(lazy).toEqual([]);
 await open(page,'?lang=en');
 await expect(id(page,'language-choice')).toBeVisible();await expect(id(page,'language-en')).toBeChecked();
 await expect(page.locator('[data-testid="language-choice"] legend')).toHaveText('Idioma / Language');
});

test('Cancel keeps the page, its language and its address; nothing is stored',async({page})=>{
 await open(page,'?lang=en','spectrum');
 await id(page,'language-es-419').check();
 const dialog=id(page,'language-confirm');await expect(dialog).toBeVisible();await expect(id(page,'language-cancel')).toBeFocused();
 await expect(dialog).toContainText('The page will reload in Español, on the same page of the site.');
 await expect(dialog).toContainText('Work that is only on screen is lost');await expect(dialog).toContainText('Files you saved on your computer are not affected');
 await expect(id(page,'language-preview')).toBeVisible();await expect(id(page,'language-not-remembered')).toHaveCount(0);
 await id(page,'language-cancel').click();await expect(dialog).toHaveCount(0);
 await expect(id(page,'language-en')).toBeChecked();await expect(page.locator('html')).toHaveAttribute('lang','en');
 expect(new URL(page.url()).search).toBe('?lang=en');expect(new URL(page.url()).hash).toBe('#spectrum');
 expect(await page.evaluate(()=>localStorage.getItem('openvireo-language'))).toBeNull();
 // Escape cancels too.
 await id(page,'language-es-419').check();await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 await expect(id(page,'language-en')).toBeChecked();
});

test('Save investigation in the dialog downloads the investigation; Change and reload opens the same page in Spanish',async({page})=>{
 await open(page,'?lang=en','spectrum');
 await id(page,'language-es-419').check();
 const download=page.waitForEvent('download');await id(page,'language-save').click();
 expect((await download).suggestedFilename()).toMatch(/\.json$/);await expect(id(page,'language-confirm')).toBeVisible();
 await Promise.all([page.waitForURL(/lang=es-419/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');expect(new URL(page.url()).hash).toBe('#spectrum');
 await expect(page.locator('.investigation-toolbar')).toContainText(es['project.save']);
 await expect(id(page,'language-es-419')).toBeChecked();
 expect(await page.evaluate(()=>localStorage.getItem('openvireo-language'))).toBe('es-419');
 // And back to English, with the dialog in Spanish.
 await id(page,'language-en').check();
 await expect(id(page,'language-confirm')).toContainText('¿Cambiar el idioma?');await expect(id(page,'language-confirm')).toContainText('La página se volverá a cargar en English');
 await Promise.all([page.waitForURL(/lang=en/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','en');
});

test('when this browser cannot store the choice, the dialog says so and the change still applies through the address',async({page})=>{
 await blockStorageWrites(page);await open(page,'?lang=en');
 await id(page,'language-es-419').check();
 await expect(id(page,'language-not-remembered')).toHaveText('This browser does not let OpenVireo store the choice, so it applies to this page load only.');
 await Promise.all([page.waitForURL(/lang=es-419/),id(page,'language-change').click()]);
 await expect(page.locator('html')).toHaveAttribute('lang','es-419');
});

test('"View original (English)" is stored and applies at the next load: VIREO\'s menu names show in English, OpenVireo\'s text stays Spanish',async({page})=>{
 await open(page,'?lang=es-419');
 await expect(id(page,'main-help-menu')).toContainText('Ayuda');
 await id(page,'language-originals').check();
 await expect(id(page,'language-originals-note')).toContainText('Se aplica la próxima vez que se cargue la página.');
 await expect(id(page,'main-help-menu')).toContainText('Ayuda');// not before the next load
 expect(await page.evaluate(()=>localStorage.getItem('openvireo-vireo-originals'))).toBe('1');
 await page.reload();await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:15_000});
 await expect(id(page,'main-help-menu')).toContainText('Help');await expect(id(page,'main-help-menu')).toHaveAccessibleName('Menú de Ayuda del observatorio');
 await expect(page.locator('.investigation-toolbar')).toContainText(es['project.save']);
 await id(page,'language-originals').uncheck();await page.reload();await expect(id(page,'main-help-menu')).toContainText('Ayuda',{timeout:15_000});
});
