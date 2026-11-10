import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import en from '../src/i18n/en.json' with {type:'json'};

// Front HEADER (user decision, 2026-11-10; plan analysis/front-plans/front-header.md): the page bar at the top of the content area.
// Save investigation is one visible click; Restore investigation JSON and "What a backup includes" are in the More menu beside it;
// the language selector and Help sit at its right. It replaces the investigation card and Help's place in the sidebar.
const id=(page:Page,testId:string)=>page.getByTestId(testId);
const bar=(page:Page)=>id(page,'page-bar');
async function open(page:Page,hash='observatory'){
 await page.goto(`/#${hash}`);
 await expect(page.locator('h1:visible').first()).toBeVisible({timeout:20_000});
 await expect(id(page,'language-choice')).toBeVisible();
}
type Box={x:number;y:number;width:number;height:number};
const overlap=(a:Box,b:Box)=>a.x+a.width>b.x+.5&&b.x+b.width>a.x+.5&&a.y+a.height>b.y+.5&&b.y+b.height>a.y+.5;
const inside=(r:Box,w:number,h:number)=>r.x>=-.5&&r.y>=-.5&&r.x+r.width<=w+.5&&r.y+r.height<=h+.5;
const controls=(page:Page)=>Promise.all(['investigation-save','investigation-more','language-select','main-help-menu'].map(async t=>(await id(page,t).boundingBox())!));

test('at 1440 px the bar is one row: the current page\'s section and name, Save, More, the language and Help; Help left the sidebar',async({page})=>{
 await open(page);
 await expect(page.locator('.portal-header').getByTestId('main-help-menu')).toHaveCount(0);
 await expect(page.locator('.portal-header').getByTestId('language-select')).toHaveCount(0);
 await expect(page.locator('.portal-header').getByTestId('language-originals')).toBeVisible();
 await expect(bar(page).getByTestId('main-help-menu')).toBeVisible();await expect(bar(page).getByTestId('language-select')).toBeVisible();
 for(const [hash,section,name] of [['observatory','Optical observatory','Observatory'],['pulsar-analysis','Radio observatory','Radio data'],['classification','Analysis','Stellar classification'],['images','Files','Saved images']] as const){
  await open(page,hash);
  // The place reads the sidebar's own labels: the current page's button and its section.
  const current=page.locator('.portal-header nav button[aria-current="page"]');await expect(current).toHaveText(name);
  await expect(id(page,'page-bar-place')).toHaveText(`${section} ${name}`);
  await expect(page.locator(`.portal-header [data-nav-group] .nav-group-label`,{hasText:section})).toHaveCount(1);
 }
 await open(page);
 const [place,...rest]=[(await id(page,'page-bar-place').boundingBox())!,...await controls(page)];
 const mid=(b:Box)=>b.y+b.height/2;
 for(const c of rest){expect(Math.abs(mid(c)-mid(place))).toBeLessThan(4);expect(c.height).toBeGreaterThanOrEqual(36);}
 for(let i=0;i<rest.length;i++){expect(overlap(place,rest[i]),`place/${i}`).toBe(false);for(let j=i+1;j<rest.length;j++)expect(overlap(rest[i],rest[j]),`${i}/${j}`).toBe(false);}
 const view=page.viewportSize()!;
 await id(page,'investigation-more').click();expect(inside((await id(page,'investigation-menu').boundingBox())!,view.width,view.height)).toBe(true);
 await id(page,'main-help-menu').click();await expect(id(page,'investigation-menu')).toHaveCount(0);
 expect(inside((await bar(page).locator('.fi-menu-list').boundingBox())!,view.width,view.height)).toBe(true);
});

test('keyboard: the bar follows the sidebar; More opens with Enter, Tab reaches its items, Escape closes it on More; a press outside or Help closes it',async({page})=>{
 await open(page);
 await id(page,'language-originals').focus();
 for(const t of ['investigation-save','investigation-more','language-select','main-help-menu']){await page.keyboard.press('Tab');await expect(id(page,t)).toBeFocused();}
 await id(page,'investigation-more').focus();await page.keyboard.press('Enter');
 await expect(id(page,'investigation-more')).toHaveAttribute('aria-expanded','true');
 await expect(id(page,'investigation-menu')).toHaveAccessibleName('More investigation actions');
 await page.keyboard.press('Tab');await expect(id(page,'investigation-restore')).toBeFocused();
 await page.keyboard.press('Tab');await expect(id(page,'investigation-backup-help').locator('summary')).toBeFocused();
 await page.keyboard.press('Escape');await expect(id(page,'investigation-menu')).toHaveCount(0);await expect(id(page,'investigation-more')).toBeFocused();
 // Tab out of the open menu closes it.
 await page.keyboard.press('Enter');await expect(id(page,'investigation-menu')).toBeVisible();
 await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await expect(id(page,'language-select')).toBeFocused();
 await expect(id(page,'investigation-menu')).toHaveCount(0);
 // A press outside closes it; opening Help closes More and opening More closes Help.
 await id(page,'investigation-more').click();await expect(id(page,'investigation-menu')).toBeVisible();
 await page.locator('h1:visible').first().click();await expect(id(page,'investigation-menu')).toHaveCount(0);
 await id(page,'investigation-more').click();await id(page,'main-help-menu').click();
 await expect(id(page,'investigation-menu')).toHaveCount(0);await expect(id(page,'main-help-web')).toBeVisible();
 await id(page,'investigation-more').click();await expect(id(page,'main-help-web')).toHaveCount(0);await expect(id(page,'investigation-menu')).toBeVisible();
 await page.keyboard.press('Escape');await expect(id(page,'investigation-more')).toBeFocused();
});

test('Restore from the More menu opens the file picker, keeps focus on More and restores into the bar; a held restore disables Save and Restore and offers Cancel',async({page})=>{
 await open(page);
 const download=page.waitForEvent('download');await id(page,'investigation-save').click();
 const bytes=await readFile((await(await download).path())!);
 await expect(bar(page).locator('> [role=status]',{hasText:'Investigation saved.'})).toBeVisible();
 await id(page,'investigation-more').click();
 const chooser=page.waitForEvent('filechooser');await id(page,'investigation-restore').click();
 const picker=await chooser;await expect(id(page,'investigation-menu')).toHaveCount(0);await expect(id(page,'investigation-more')).toBeFocused();
 await picker.setFiles({name:'saved.json',mimeType:'application/json',buffer:bytes});
 await expect(bar(page).locator('> [role=status]',{hasText:'Investigation restored.'})).toBeVisible();await expect(bar(page).locator('> [role=alert]')).toHaveCount(0);
 // Held restore (the arrayBuffer hold of observing-workspace.spec.ts): the bar stays usable for Cancel.
 await page.evaluate(()=>{const original=File.prototype.arrayBuffer;File.prototype.arrayBuffer=async function(){const b=await original.call(this);if(this.name==='held.json')await new Promise<void>(resolve=>Object.defineProperty(window,'releaseHeld',{value:resolve,configurable:true}));return b;};});
 await page.getByLabel('Restore investigation JSON',{exact:true}).setInputFiles({name:'held.json',mimeType:'application/json',buffer:bytes});
 await expect(bar(page).locator('> [role=status]').first()).toHaveText(en['project.busy']);
 await expect(id(page,'investigation-save')).toBeDisabled();
 await id(page,'investigation-more').click();await expect(id(page,'investigation-restore')).toBeDisabled();
 const cancel=bar(page).getByRole('button',{name:en['classLink.cancel'],exact:true});await expect(cancel).toBeVisible();
 await expect(bar(page)).not.toHaveAttribute('inert');
 // The busy line can stay until the held read ends (the analyzer's own busy state); the cancelled notice is shown at once.
 await cancel.click();await expect(bar(page).locator('> [role=status]',{hasText:en['project.cancelled']})).toBeVisible();
 await page.evaluate(()=>(window as unknown as {releaseHeld:()=>void}).releaseHeld());
 await expect(id(page,'investigation-save')).toBeEnabled();await expect(cancel).toHaveCount(0);
 await expect(bar(page).locator('> [role=status]')).toHaveText(en['project.cancelled']);
});

test('"What a backup includes" in the More menu shows the backup scope',async({page})=>{
 await open(page);
 await id(page,'investigation-more').click();
 await expect(id(page,'investigation-menu').locator('> button')).toHaveText([en['project.restore']]);
 const help=id(page,'investigation-backup-help');await expect(help.locator('summary')).toHaveText('What a backup includes');
 await help.locator('summary').click();await expect(help.locator('p')).toHaveText(en['project.toolbarHelp']);
});

for(const width of [320,375,600,1024]){
 test(`at ${width} px the bar fits: no overflow or overlap, phone-sized targets below 600 px, the place from 600 px`,async({page})=>{
  await page.setViewportSize({width,height:800});await open(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const boxes=await controls(page);
  for(let i=0;i<boxes.length;i++){
   expect(boxes[i].x).toBeGreaterThanOrEqual(0);expect(boxes[i].x+boxes[i].width).toBeLessThanOrEqual(width);
   expect(boxes[i].height).toBeGreaterThanOrEqual(width<600?40:36);
   for(let j=i+1;j<boxes.length;j++)expect(overlap(boxes[i],boxes[j]),`${i}/${j}`).toBe(false);
  }
  if(width<600)await expect(id(page,'page-bar-place')).toBeHidden();
  else{await expect(id(page,'page-bar-place')).toBeVisible();for(const b of boxes)expect(overlap((await id(page,'page-bar-place').boundingBox())!,b)).toBe(false);}
  await expect(id(page,'investigation-save')).toHaveAccessibleName('Save investigation');
  await expect(id(page,'investigation-more')).toHaveAccessibleName('More investigation actions');
  await expect(id(page,'main-help-menu')).toHaveAccessibleName('Help menu of the observatory');
  // Help shows only its icon below 360 px; More shows only its icon below 600 px.
  await expect(id(page,'main-help-menu').locator('.help-trigger-text')).toHaveCSS('position',width<360?'absolute':'static');
  await expect(id(page,'investigation-more').locator('.page-bar-more-text')).toHaveCSS('position',width<600?'absolute':'static');
  for(const menu of ['investigation-more','main-help-menu']){
   await id(page,menu).click();const list=bar(page).locator('.fi-menu-list');await expect(list).toBeVisible();
   const r=(await list.boundingBox())!;expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
   await page.keyboard.press('Escape');
  }
 });
}

// Pinned from 600 px up (user decision, 2026-11-10, after seeing the bar); a phone keeps it in the page flow.
for(const width of [375,1024,1440])test(`at ${width} px the bar ${width<600?'scrolls away with the page':'stays at the top of the viewport, above the content and its menus, and focus never lands under it'}`,async({page},info)=>{
 await page.setViewportSize({width,height:800});await open(page);
 const start=(await bar(page).boundingBox())!;
 await page.evaluate(()=>window.scrollTo(0,700));await page.waitForFunction(()=>window.scrollY>=700);
 const after=(await bar(page).boundingBox())!;
 if(width<600){expect(after.y).toBeLessThan(start.y-600);return;}
 expect(Math.abs(after.y-8)).toBeLessThan(1);expect(Math.abs(after.height-start.height)).toBeLessThan(1);
 // The bar paints above the content scrolled under it (its own controls are hit at their centres).
 for(const t of ['investigation-save','investigation-more','language-select','main-help-menu']){
  const b=(await id(page,t).boundingBox())!;
  expect(await page.evaluate(([x,y,t])=>document.elementFromPoint(x,y)?.closest(`[data-testid="${t}"]`)!==null,[b.x+b.width/2,b.y+b.height/2,t] as const),t).toBe(true);
 }
 // Its menus open inside the viewport, over the content.
 await id(page,'investigation-more').click();const menu=(await id(page,'investigation-menu').boundingBox())!;
 expect(menu.y).toBeGreaterThan(after.y);expect(menu.y+menu.height).toBeLessThanOrEqual(800);
 const restore=(await id(page,'investigation-restore').boundingBox())!;
 expect(await page.evaluate(([x,y])=>document.elementFromPoint(x,y)?.closest('[data-testid="investigation-restore"]')!==null,[restore.x+restore.width/2,restore.y+restore.height/2] as const)).toBe(true);
 await page.keyboard.press('Escape');
 // The page's scroll padding keeps a focused element below the bar (WCAG 2.4.11): the page's h1, scrolled out above, comes back under it.
 const h1=page.locator('h1:visible').first();await h1.focus();
 expect((await h1.boundingBox())!.y).toBeGreaterThanOrEqual(after.y+after.height);
 await page.evaluate(()=>window.scrollTo(0,700));await page.waitForFunction(()=>window.scrollY>=700);
 await page.screenshot({path:info.outputPath(`page-bar-pinned-${width}.png`)});
});

test('landmarks: one banner, a region named for the bar, and no heading before the page\'s h1',async({page})=>{
 for(const hash of ['observatory','spectrum','radio-control']){
  await open(page,hash);
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('region',{name:'Investigation, language and help',exact:true})).toHaveCount(1);
  // The shell adds no heading (the card's h2 is gone): none in the sidebar or the bar, and on a page with nothing above its
  // content the h1 is the first heading of #root (the observatory's clock card, above its h1, is the page's own).
  const before=await page.evaluate(()=>{const all=[...document.querySelectorAll<HTMLElement>('#root h1,#root h2,#root h3,#root h4,#root h5,#root h6')].filter(e=>e.offsetParent!==null);
   const h1=all.findIndex(e=>e.tagName==='H1');return {shell:all.filter(e=>e.closest('.portal-header,.page-bar')).length,first:all[0]?.tagName,h1};});
  expect(before.shell,hash).toBe(0);if(hash!=='observatory')expect(before.first,hash).toBe('H1');
 }
});

for(const scheme of ['light','dark'] as const)test(`screenshots of the bar at 320, 1024 and 1440 px (${scheme})`,async({page},info)=>{
 await page.emulateMedia({colorScheme:scheme});
 for(const width of [320,1024,1440]){
  await page.setViewportSize({width,height:800});await open(page);
  await bar(page).screenshot({path:info.outputPath(`page-bar-${scheme}-${width}.png`)});
 }
});
