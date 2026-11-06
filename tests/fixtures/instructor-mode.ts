import {expect,type Page} from '@playwright/test';
import {openHeaderTools} from './header-tools';

/** Front T1: Optical Simulation Options and the radio Preferences open only in instructor mode (the web form of VIREO's
 * Demonstration Mode gate, page session only). Turns it on from the header item and its confirmation at any width; does nothing
 * when the banner already shows. Call it before opening the options; a reload closes the mode again. */
export async function enterInstructorMode(page:Page){
 const banner=page.getByTestId('instructor-mode-banner');
 if(await banner.isVisible())return;
 const toggle=page.locator('.portal-header .tools-toggle'),folded=await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true';
 await openHeaderTools(page);
 await page.getByTestId('instructor-mode-open').click();
 await page.getByTestId('instructor-mode-confirm-on').click();
 await expect(page.getByTestId('instructor-mode-confirm')).toHaveCount(0);await expect(banner).toBeVisible();
 if(folded&&await toggle.getAttribute('aria-expanded')==='true')await toggle.click();
}

/** Leave instructor mode from its banner. */
export async function leaveInstructorMode(page:Page){
 await page.getByTestId('instructor-mode-leave').click();await expect(page.getByTestId('instructor-mode-banner')).toHaveCount(0);
}
