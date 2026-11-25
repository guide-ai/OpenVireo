import {test,expect,type Locator,type Page} from '@playwright/test';
import en from '../src/i18n/en.json' with {type:'json'};
import ja from '../src/i18n/ja/ja.json' with {type:'json'};

// Front NEWCOMER NC7 (user decision of 2026-11-24; plan analysis/front-plans/front-newcomer.md §2.7): the guides' technical terms
// are buttons (help/glossary.tsx) that open a one-line definition (components/TermPopover.tsx), drawn inside the guide window or
// the companion strip's Step details. Press, Enter or Space opens; Escape, a second press or a press elsewhere closes; the focus
// stays on the term; nothing opens on hover; each window ends with «Words used in this guide».
const guideWindow=(page:Page)=>page.locator('dialog.hubble-lab-dialog[open]');
const popover=(page:Page)=>page.getByTestId('term-popover');
async function openGuide(page:Page,lab:string,query=''){
 await page.goto(`/${query}#lab=${lab}`);
 await expect(guideWindow(page)).toBeVisible({timeout:30_000});
}
/** The popover is inside the viewport and inside `container`. */
async function inside(page:Page,container:Locator){
 const box=(await popover(page).boundingBox())!,view=page.viewportSize()!;
 expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
 expect(box.x+box.width).toBeLessThanOrEqual(view.width+0.5);expect(box.y+box.height).toBeLessThanOrEqual(view.height+0.5);
 expect(await container.evaluate((c,p)=>c.contains(p),await popover(page).elementHandle())).toBe(true);
}

test('a term in a guide window: press, a second press, Escape and a press elsewhere; the focus stays; Words used in this guide',async({page})=>{
 await openGuide(page,'large-scale-structure');
 const term=guideWindow(page).locator('#lss-lab-why button.term');
 await expect(term).toHaveText('redshifts');await expect(term).toHaveAttribute('data-term','redshift');
 await expect(term).toHaveAttribute('aria-expanded','false');
 // No opening on hover.
 await term.hover();await expect(popover(page)).toHaveCount(0);
 await term.click();
 await expect(popover(page)).toBeVisible();
 await expect(popover(page)).toHaveText(en['term.redshift']+'×');
 await expect(popover(page)).toHaveAccessibleName('Definition of redshifts');
 await expect(term).toHaveAttribute('aria-expanded','true');
 await expect(term).toHaveAccessibleDescription(en['term.redshift']);
 await expect(term).toBeFocused();
 await inside(page,guideWindow(page));
 // A second press closes it.
 await term.click();await expect(popover(page)).toHaveCount(0);await expect(term).toHaveAttribute('aria-expanded','false');
 // Enter opens, Escape closes the definition only: the guide window stays open and the term keeps the focus.
 await term.focus();await page.keyboard.press('Enter');await expect(popover(page)).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(popover(page)).toHaveCount(0);await expect(guideWindow(page)).toBeVisible();await expect(term).toBeFocused();
 // Space opens; a press elsewhere closes; the next Escape closes the window.
 await page.keyboard.press('Space');await expect(popover(page)).toBeVisible();
 await guideWindow(page).locator('h2').click();await expect(popover(page)).toHaveCount(0);
 // Words used in this guide: folded at the end of the window, one entry per marked term, in the glossary's order.
 const words=guideWindow(page).locator('details.lab-terms');
 await expect(words.locator('summary')).toHaveText(en['term.wordsHeading']);
 await expect(words).not.toHaveAttribute('open');
 await words.locator('summary').click();
 await expect(words.locator('li')).toHaveText([en['term.caHK'],en['term.absorptionLine'],en['term.redshift'],en['term.spectrum']]);
 // Printing opens it with the window's other folded parts (help/printDetails.ts).
 await words.locator('summary').click();await expect(words).not.toHaveAttribute('open');
 await page.evaluate(()=>dispatchEvent(new Event('beforeprint')));await expect(words).toHaveAttribute('open','');
 await page.evaluate(()=>dispatchEvent(new Event('afterprint')));await expect(words).not.toHaveAttribute('open');
 await page.keyboard.press('Escape');await expect(guideWindow(page)).toHaveCount(0);
});

test('a term in the companion strip’s Step details opens there, and closing Step details closes it',async({page})=>{
 await openGuide(page,'stellar-classification');
 await page.keyboard.press('Escape');await expect(guideWindow(page)).toHaveCount(0);
 await page.getByTestId('guide-companion-details-toggle').click();
 const details=page.getByTestId('guide-companion-details'),term=details.locator('button.term[data-term="spectrum"]');
 await expect(term).toHaveText('spectra');
 await term.click();
 await expect(popover(page)).toHaveText(en['term.spectrum']+'×');
 await inside(page,details);
 // Escape closes the definition first, then Step details.
 await page.keyboard.press('Escape');await expect(popover(page)).toHaveCount(0);await expect(details).toBeVisible();
 await term.click();await expect(popover(page)).toBeVisible();
 await page.getByTestId('guide-companion-details-toggle').click();
 await expect(details).toHaveCount(0);await expect(popover(page)).toHaveCount(0);
});

// Review N1: a definition never outlives its term. When the step's text is replaced (the page moves the step on and React draws
// new terms) or the term is removed, the definition closes and the old term reads aria-expanded="false" again; Escape then goes
// on to the window, as nothing is open.
test('the definition closes when its term is replaced or removed, and Escape is not taken once nothing is open',async({page})=>{
 await openGuide(page,'cluster-hr');
 const step=guideWindow(page).locator('[data-testid="cluster-lab-step-trial"]');
 await step.locator('summary').click();
 const term=step.locator('button.term[data-term="isochrone"]');
 await term.click();await expect(popover(page)).toBeVisible();
 // Replaced: a new button where the old one was (as a re-render with a new key draws it).
 await term.evaluate(el=>{(window as unknown as {oldTerm:Element}).oldTerm=el;const copy=el.cloneNode(true) as Element;copy.setAttribute('aria-expanded','false');el.replaceWith(copy);});
 await expect(popover(page)).toHaveCount(0);
 expect(await page.evaluate(()=>(window as unknown as {oldTerm:Element}).oldTerm.getAttribute('aria-expanded'))).toBe('false');
 // Removed.
 const again=step.locator('button.term[data-term="metallicity"]');
 await again.click();await expect(popover(page)).toBeVisible();
 await again.evaluate(el=>el.remove());
 await expect(popover(page)).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(guideWindow(page)).toHaveCount(0);
});

test('in the strip, a definition closes when Step details move to another step',async({page})=>{
 await openGuide(page,'stellar-classification');
 await page.keyboard.press('Escape');await expect(guideWindow(page)).toHaveCount(0);
 await page.getByTestId('guide-companion-details-toggle').click();
 const details=page.getByTestId('guide-companion-details'),term=details.locator('button.term[data-term="spectrum"]');
 await term.click();await expect(popover(page)).toBeVisible();
 // The step's text changes under the open definition (as when the guide moves on): its term is gone.
 await details.evaluate(el=>{for(const b of el.querySelectorAll('button.term'))b.replaceWith(document.createTextNode(b.textContent??''));});
 await expect(popover(page)).toHaveCount(0);
 await expect(details).toBeVisible();
});

test('at 375 px the definition fits the screen; the close button closes it',async({page})=>{
 await page.setViewportSize({width:375,height:740});
 await openGuide(page,'cluster-hr');
 const step=guideWindow(page).locator('[data-testid="cluster-lab-step-trial"]');
 await step.locator('summary').click();
 const term=step.locator('button.term[data-term="isochrone"]');
 await term.scrollIntoViewIfNeeded();await term.click();
 await expect(popover(page)).toHaveText(en['term.isochrone']+'×');
 await inside(page,guideWindow(page));
 expect((await popover(page).boundingBox())!.width).toBeLessThanOrEqual(375*0.9+1);
 await popover(page).getByRole('button',{name:en['term.close']}).click();
 await expect(popover(page)).toHaveCount(0);
});

test('Japanese: the term is the Japanese word, with the Japanese definition',async({page})=>{
 await openGuide(page,'large-scale-structure','?lang=ja');
 const term=guideWindow(page).locator('#lss-lab-why button.term');
 await expect(term).toHaveText('赤方偏移');
 await term.click();
 await expect(popover(page)).toHaveText(ja['term.redshift']+'×');
 await expect(popover(page)).toHaveAccessibleName('赤方偏移の定義');
 await inside(page,guideWindow(page));
});

test('right to left (qps-rtl): the pseudo-locale marks the term and the definition stays on screen',async({page})=>{
 await openGuide(page,'large-scale-structure','?lang=qps-rtl');
 const term=guideWindow(page).locator('#lss-lab-why button.term');
 await expect(term).toHaveAttribute('data-term','redshift');
 await term.click();
 await expect(popover(page)).toBeVisible();
 await inside(page,guideWindow(page));
});
