import {test,expect,type Page} from '@playwright/test';

// Front QA1 (2026-10-31, E08 identity hint): VIREO gives the student only an identifier and coordinates. Masking only the
// catalogue entries near the hidden target made its own name vanish from the observatory's target list (target NGC 4631 →
// NGC 4631 missing, NGC 2403/4262/4449 still listed). The lists a student sees while a target is unrevealed must be the same
// whatever the target's kind: the target picker, the "Names hidden" note and the QSO List.
const KINDS={star:'N6000-00685',galaxy:'NGC 4631',qso:'3C 273.0',pulsar:'0329+54',asteroid:'(433) Eros'} as const;
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});

async function listsFor(page:Page,id:string){
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
 const code=await page.evaluate(`import('/src/core/objectXLab.ts').then(m=>m.objectXCode(${JSON.stringify(id)}))`) as string;
 await page.getByTestId('objectx-target').selectOption(code);
 await button(page,'Set the observatory clock').click();
 await button(page,'Copy the coordinates to the observatory').click();
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
 await button(page,'Open dome ↗').click();
 if(!await button(page,'Point to coordinates').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await button(page,'Point to coordinates').click();
 await expect(page.getByTestId('sky-names-hidden')).toHaveText('Names hidden during Object X.');
 const picker=await page.locator('#target option').allTextContents();
 await page.locator('.telescope-motion').getByTestId('ob-options').click();await page.getByTestId('ob-options-virtual-observatory').check();await page.getByTestId('ob-options-ok').click();
 await page.getByTestId('fi-file-menu').click();await page.getByTestId('qso-menu').click();await page.getByTestId('qso-ok').click();
 const lines=page.getByTestId('qso-list-lines');await expect(lines).toBeVisible();
 return {picker,qso:await lines.innerText()};
}

test('the lists shown during an unrevealed Object X target do not depend on its kind',async({context})=>{
 test.setTimeout(240_000);
 const seen:Record<string,Awaited<ReturnType<typeof listsFor>>>={};
 for(const [kind,id] of Object.entries(KINDS)){const page=await context.newPage();seen[kind]=await listsFor(page,id);await page.close();}
 const base=seen.star;
 expect(base.picker.length).toBeGreaterThan(10);
 expect(base.picker.join('\n')).not.toMatch(/NGC 2403|NGC 4262|NGC 4449|NGC 4631|3C 273/);
 for(const kind of Object.keys(KINDS)){expect(seen[kind].picker,`${kind} picker`).toEqual(base.picker);expect(seen[kind].qso,`${kind} QSO List`).toEqual(base.qso);}
});
