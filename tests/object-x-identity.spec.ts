import {test,expect,type Page} from '@playwright/test';
import {clickHeaderTool} from './fixtures/header-tools';

// E08 hidden identity in the instruments (review 2 H1): with an unrevealed Object X target, pointing the observatory at its
// coordinates must not name it — no ObjectX.HTL identifier or remark and no catalogue name within 2° of it — in the sky map,
// the finder and telescope fields, the target card, notices or the spectrometer. One target of each kind.
const KINDS={star:'N6000-00685',galaxy:'NGC 4631',qso:'3C 273.0',pulsar:'0329+54',asteroid:'(433) Eros'} as const;
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const word=(s:string)=>new RegExp(`(^|[^\\w])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^\\w])`);

/** Text an instrument shows: everything in the active route except <select> option lists (the target picker lists the whole
 * catalogue by name, not tied to the target's coordinates), plus the sky map's SVG labels. */
async function shownText(page:Page){
 return page.evaluate(()=>{
  const roots=[...document.querySelectorAll('main, .portal-header, .investigation-toolbar, dialog[open]')].filter(e=>(e as HTMLElement).offsetParent!==null||e.tagName==='DIALOG');
  return roots.map(r=>{const c=r.cloneNode(true) as HTMLElement;c.querySelectorAll('select, [data-testid=objectx-asteroid-list]').forEach(n=>n.remove());return c.textContent??'';}).join('\n')
   +'\n'+[...document.querySelectorAll('[data-testid=sky-map] text')].map(t=>t.textContent).join('\n');
 });
}

for(const [kind,id] of Object.entries(KINDS)){
 test(`no instrument names the hidden ${kind} target`,async({page})=>{
  test.setTimeout(90_000);
  await page.goto('/#object-x');await expect(page.getByRole('heading',{name:'The quest for Object X'})).toBeVisible();
  // Codes and nearby catalogue names are computed in the page from the app's own modules (as the app computes them).
  const {code,nearby,remark}=await page.evaluate(`(async()=>{
   const id=${JSON.stringify(id)};
   const lab=await import('/src/core/objectXLab.ts'),cat=await import('/src/core/targetCatalog.ts'),eph=await import('/src/core/ephemeris.ts');
   const hl=await import('/src/core/hotList.ts'),bytes=new Uint8Array(await (await fetch('/original/hotlists/ObjectX.HTL')).arrayBuffer());
   const row=hl.parseHtl(bytes).find(r=>r.id.trim()===id);
   const {catalog}=cat.buildTargetCatalog({star:()=>'',galaxy:(i,l)=>l});
   const nearby=catalog.filter(o=>eph.separationDegrees(o.ra,o.dec,row.ra,row.dec)<=lab.OBJECT_X_HIDE_DEGREES).flatMap(o=>[o.label,o.id]);
   return {code:lab.objectXCode(id),nearby,remark:row.remarks.trim()};
  })()`) as {code:string;nearby:string[];remark:string};
  const secrets=[...new Set([id,remark,...nearby].filter(s=>s&&s.length>1))];
  // Kind words such as "Star" or "Galaxy" are generic UI words elsewhere; for one-word remarks only the identifier and
  // catalogue names are checked outside Object X itself.
  const strong=secrets.filter(s=>s!==remark||/\s/.test(s)||/\d/.test(s));
  const leaks=async()=>{const text=await shownText(page);return strong.filter(s=>word(s).test(text));};
  await page.getByTestId('objectx-target').selectOption(code);
  await button(page,'Set the observatory clock').click();
  await button(page,'Copy the coordinates to the observatory').click();
  await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible();
  await button(page,'Open dome ↗').click();
  if(!await button(page,'Point to coordinates').isVisible())await page.getByText('Enter coordinates',{exact:true}).click();
  await button(page,'Point to coordinates').click();
  await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Finder · 2.5°',exact:true}).click();
  await expect(page.getByTestId('sky-map')).toBeVisible();
  expect(await leaks(),'finder').toEqual([]);
  await page.locator('.sky-view').first().screenshot({path:test.info().outputPath(`identity-${kind}-finder.png`)});
  // The galaxy has its own catalogue entry in the field: drawn unnamed, with the one-line note.
  if(kind==='galaxy'){expect(nearby).toContain('NGC 4631');await expect(page.getByTestId('sky-names-hidden')).toHaveText('Names hidden during Object X.');}
  await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
  expect(await leaks(),'telescope').toEqual([]);
  // R3-L1: the target picker leaves out every catalogue entry near the hidden object.
  const options=(await page.locator('#target option').allTextContents()).join('\n');
  expect(strong.filter(s=>s!==id&&word(s).test(options)),'target picker').toEqual([]);
  await page.locator('.sky-view').first().screenshot({path:test.info().outputPath(`identity-${kind}.png`)});
  // Point the catalogue picker's own target too, if it is near (the target card and notices hide its name).
  await clickHeaderTool(page,'Spectrometer');
  expect(await leaks(),'spectrometer').toEqual([]);
  await clickHeaderTool(page,'Observatory');
  // After the reveal names may show again.
  await clickHeaderTool(page,'Object X');
  await page.getByTestId('objectx-answer').getByLabel(kind==='qso'?'quasar (QSO)':kind).check();
  await button(page,'Reveal the identity').click();await button(page,'Reveal the identity').click();
  await expect(page.getByTestId('objectx-reveal')).toContainText(id);
  await clickHeaderTool(page,'Observatory');
  await expect(page.getByTestId('sky-names-hidden')).toHaveCount(0);
 });
}
