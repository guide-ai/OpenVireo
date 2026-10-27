import type{Page}from'@playwright/test';
/** Headless Chromium (chromium_headless_shell-1248) silently drops a download when a page starts more than ten within
 * about a second: in a bare page with no app code, eleven fast anchor downloads lose the 11th, and the same loop at 400 ms
 * spacing loses none. Specs that download many files in a row wait here before each click, so a dropped event cannot hide
 * or fake an app result. The pacing changes only test timing, never the bytes or the assertions. */
const GAP_MS=150,last=new WeakMap<Page,number>();
export async function paceDownload(page:Page){const wait=(last.get(page)??0)+GAP_MS-Date.now();if(wait>0)await page.waitForTimeout(wait);last.set(page,Date.now());}
