import {test,expect,type Page} from '@playwright/test';
import {clickHeaderTool} from './fixtures/header-tools';

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
 // QA1 review 1 H3: VIREO keeps the Asteroid List disabled in Object X unless Edit Mode is on; the same closed note for every kind.
 await expect(page.getByTestId('objectx-list-status')).toContainText('Observable asteroids on',{timeout:30_000});
 const asteroidList={rows:await page.getByTestId('objectx-asteroid-list').count(),note:await page.getByTestId('objectx-asteroid-list-closed').textContent()};
 await button(page,'Copy the coordinates to the observatory').click();
 // QA1 review 1 L6: five pages in one test; under parallel load the route switch can exceed the 5 s default.
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:20_000});
 await button(page,'Open dome ↗').click();
 if(!await button(page,'Point to coordinates').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await button(page,'Point to coordinates').click();
 await expect(page.getByTestId('sky-names-hidden')).toHaveText('Names hidden during Object X.');
 const picker=await page.locator('#target option').allTextContents();
 await page.locator('.telescope-motion').getByTestId('ob-options').click();await page.getByTestId('ob-options-virtual-observatory').check();await page.getByTestId('ob-options-ok').click();
 await page.getByTestId('fi-file-menu').click();await page.getByTestId('qso-menu').click();await page.getByTestId('qso-ok').click();
 const lines=page.getByTestId('qso-list-lines');await expect(lines).toBeVisible();
 return {picker,qso:await lines.innerText(),asteroidList};
}

test('the lists shown during an unrevealed Object X target do not depend on its kind',async({context})=>{
 test.setTimeout(240_000);
 const seen:Record<string,Awaited<ReturnType<typeof listsFor>>>={};
 for(const [kind,id] of Object.entries(KINDS)){const page=await context.newPage();seen[kind]=await listsFor(page,id);await page.close();}
 const base=seen.star;
 expect(base.picker.length).toBeGreaterThan(10);
 expect(base.picker.join('\n')).not.toMatch(/NGC 2403|NGC 4262|NGC 4449|NGC 4631|3C 273/);
 expect(base.asteroidList).toEqual({rows:0,note:'As in VIREO, the Asteroid List stays closed during Object X (it opens only in Edit Mode). New images still include the observable asteroids.'});
 for(const kind of Object.keys(KINDS)){expect(seen[kind].picker,`${kind} picker`).toEqual(base.picker);expect(seen[kind].qso,`${kind} QSO List`).toEqual(base.qso);expect(seen[kind].asteroidList,`${kind} asteroid list`).toEqual(base.asteroidList);}
});

/** QA1 review 1 H1: what the sky map draws in the finder and telescope views at one Object X target (catalogue rings and labels,
 * as positions relative to the crosshair). */
async function skyMapAt(page:Page,code:string){
 await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible({timeout:20_000});
 await page.getByTestId('objectx-target').selectOption(code);
 await button(page,'Set the observatory clock').click();
 await button(page,'Copy the coordinates to the observatory').click();
 await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:20_000});
 await button(page,'Open dome ↗').click();
 if(!await button(page,'Point to coordinates').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
 await button(page,'Point to coordinates').click();
 await expect(page.getByTestId('sky-names-hidden')).toHaveText('Names hidden during Object X.');
 const drawn=async()=>page.getByTestId('sky-map').evaluate(svg=>[...svg.querySelectorAll('.sky-object')].map(g=>{const c=g.querySelector('circle')!;return `${c.getAttribute('cx')},${c.getAttribute('cy')} ${g.textContent}`;}));
 const views:Record<string,string[]>={};
 for(const view of ['Finder · 2.5°','Telescope · 15′']){
  await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:view,exact:true}).click();
  await expect(page.getByTestId('sky-map')).toBeVisible();views[view]=await drawn();
 }
 return views;
}

test('QA1 review 1 H1: the sky map at an unrevealed target looks the same for all 17 ObjectX.HTL targets (no masked rings)',async({context})=>{
 test.setTimeout(600_000);
 const page0=await context.newPage();await page0.goto('/#object-x');
 const codes=await page0.evaluate(`(async()=>{const lab=await import('/src/core/objectXLab.ts'),hl=await import('/src/core/hotList.ts');
  const rows=hl.parseHtl(new Uint8Array(await (await fetch('/original/hotlists/ObjectX.HTL')).arrayBuffer()));return rows.map(r=>[r.id.trim(),lab.objectXCode(r.id.trim())]);})()`) as [string,string][];
 await page0.close();
 expect(codes).toHaveLength(17);
 const seen=new Map<string,Record<string,string[]>>();
 for(const [id,code] of codes){const page=await context.newPage();seen.set(id,await skyMapAt(page,code));await page.close();}
 // Every HTL area is masked alike, so nothing catalogue-drawn may appear in either view at any target.
 for(const [id,views] of seen)expect(views,id).toEqual({'Finder · 2.5°':[],'Telescope · 15′':[]});
});

test('QA1 review 1 H3: in Edit Mode the Asteroid List opens during Object X, as VIREO enables it (0x58b3cb..0x58b3e9)',async({page})=>{
 test.setTimeout(120_000);
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:20_000});
 await button(page,'Open dome ↗').click();
 await page.locator('.telescope-motion').getByTestId('ob-options').click();await page.getByTestId('ob-options-edit-mode').check();await page.getByTestId('ob-options-ok').click();
 // In-app navigation: Edit Mode is page state (Front O, not saved), so a reload would lose it.
 await clickHeaderTool(page,'Object X');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible({timeout:20_000});
 const code=await page.evaluate(`import('/src/core/objectXLab.ts').then(m=>m.objectXCode('(433) Eros'))`) as string;
 await page.getByTestId('objectx-target').selectOption(code);await button(page,'Set the observatory clock').click();
 await expect(page.getByTestId('objectx-list-status')).toContainText('Observable asteroids on',{timeout:30_000});
 await expect(page.getByTestId('objectx-asteroid-list')).toBeVisible();await expect(page.getByTestId('objectx-asteroid-list-closed')).toHaveCount(0);
});
