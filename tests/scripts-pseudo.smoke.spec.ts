import {test,expect} from '@playwright/test';
import en from '../src/i18n/en.json' with {type:'json'};
import {PSEUDO_SCRIPT} from '../src/i18n/pseudoScripts';

// Front SC2 (docs/I18N.md; plan front-i18n-scripts.md §4): each dev-only script-stress pseudo-locale renders the home page with
// the real <html lang> of its script, transformed text and no language selector; English is unchanged. The layout walks under
// these variants belong to SC3 (tests/scripts/, playwright.scripts.config.ts).
const VARIANTS=[['qps-cjk','ja',/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]/u],['qps-deva','hi',/\p{sc=Devanagari}/u],['qps-cyrl','ru',/\p{sc=Cyrillic}/u]] as const;
for(const [language,tag,script] of VARIANTS)test(`?lang=${language} renders the home page in its script with <html lang="${tag}">`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`/?lang=${language}#observatory`);await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:15_000});
 await expect(page.locator('html')).toHaveAttribute('lang',tag);
 await expect(page).toHaveTitle(PSEUDO_SCRIPT[language](en['app.documentTitle']));
 const text=await page.locator('body').innerText();
 expect(text).toContain('⟦');expect(text).toMatch(script);
 await expect(page.getByTestId('language-choice')).toHaveCount(0);
 expect(errors).toEqual([]);
});
test('English is unchanged beside the script pseudo-locales',async({page})=>{
 await page.goto('/#observatory');await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:15_000});
 await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page).toHaveTitle(en['app.documentTitle']);
 expect(await page.locator('body').innerText()).not.toMatch(/⟦|[\p{sc=Han}\p{sc=Devanagari}\p{sc=Cyrillic}]/u);
});
