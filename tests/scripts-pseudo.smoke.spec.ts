import {test,expect} from '@playwright/test';
import en from '../src/i18n/en.json' with {type:'json'};
import {PSEUDO_SCRIPT} from '../src/i18n/pseudoScripts';

// Front SC2 (docs/I18N.md; plan front-i18n-scripts.md §4): each dev-only script-stress pseudo-locale renders the home page with
// the real <html lang> of its script, transformed text and no language selector; English is unchanged. The layout walks under
// these variants belong to SC3 (tests/scripts/, playwright.scripts.config.ts).
// Front RTL-1 (RT1, RT2): every load sets <html dir> (ltr today); the right-to-left pseudo-locale qps-rtl renders with
// <html lang="ar" dir="rtl">, so the page mirrors. Its route walk is RT7's.
const VARIANTS=[['qps-cjk','ja','ltr',/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]/u],['qps-deva','hi','ltr',/\p{sc=Devanagari}/u],['qps-cyrl','ru','ltr',/\p{sc=Cyrillic}/u],['qps-rtl','ar','rtl',/\p{sc=Arabic}/u]] as const;
for(const [language,tag,dir,script] of VARIANTS)test(`?lang=${language} renders the home page in its script with <html lang="${tag}" dir="${dir}">`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`/?lang=${language}#observatory`);await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:15_000});
 await expect(page.locator('html')).toHaveAttribute('lang',tag);await expect(page.locator('html')).toHaveAttribute('dir',dir);
 await expect(page).toHaveTitle(PSEUDO_SCRIPT[language](en['app.documentTitle']));
 const text=await page.locator('body').innerText();
 expect(text).toContain('⟦');expect(text).toMatch(script);
 await expect(page.getByTestId('language-choice')).toHaveCount(0);
 // The direction reaches the page; what mirrors and what stays an LTR island is RT5's, checked by RT7's walk.
 expect(await page.evaluate(()=>getComputedStyle(document.body).direction)).toBe(dir);
 expect(errors).toEqual([]);
});
test('English is unchanged beside the script pseudo-locales',async({page})=>{
 await page.goto('/#observatory');await expect(page.locator('.investigation-toolbar')).toBeVisible({timeout:15_000});
 await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('html')).toHaveAttribute('dir','ltr');
 await expect(page).toHaveTitle(en['app.documentTitle']);
 expect(await page.locator('body').innerText()).not.toMatch(/⟦|[\p{sc=Han}\p{sc=Devanagari}\p{sc=Cyrillic}\p{sc=Arabic}]/u);
});
