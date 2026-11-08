import {test,expect,type Page} from '@playwright/test';

// Front Onboarding: a visitor's first visit. The site skips its first-visit aids in automated browsers (navigator.webdriver), so
// these tests present themselves as an ordinary browser.
const asVisitor=(page:Page)=>page.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'webdriver',{configurable:true,get:()=>false});});
const id=(p:Page,t:string)=>p.getByTestId(t);
const home=async(page:Page)=>{await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});};
const section=(page:Page,name:string)=>page.getByRole('banner').getByRole('button',{name,exact:true});

test('the tour starts on the first visit, steps through the page, and does not start again',async({page})=>{
 await asVisitor(page);await home(page);
 const tour=id(page,'site-tour');await expect(tour).toBeVisible();
 await expect(tour.getByRole('heading',{name:'Welcome to OpenVireo'})).toBeFocused();
 await expect(tour).toContainText('Step 1 of 6');
 const expected=['sections','guides','observatory','save','help'];
 for(const step of expected){
  await id(page,'site-tour-next').click();
  await expect(tour).toHaveAttribute('data-step',step);
  await expect(id(page,'site-tour-spot')).toBeVisible();
 }
 // The last step outlines the Help button.
 await expect.poll(async()=>{const spot=await id(page,'site-tour-spot').boundingBox(),help=await id(page,'main-help-menu').boundingBox();
  return !!(spot&&help&&spot.x<=help.x&&spot.y<=help.y&&spot.x+spot.width>=help.x+help.width&&spot.y+spot.height>=help.y+help.height);}).toBe(true);
 await id(page,'site-tour-back').click();await expect(tour).toHaveAttribute('data-step','save');
 await id(page,'site-tour-next').click();await expect(id(page,'site-tour-next')).toHaveText('Start exploring');
 await id(page,'site-tour-next').click();
 await expect(tour).toHaveCount(0);await expect(id(page,'main-help-menu')).toBeFocused();
 expect(await page.evaluate(()=>localStorage.getItem('openvireo.tour.v1'))).toBe('done');
 await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await page.waitForTimeout(1200);await expect(tour).toHaveCount(0);
 // Help repeats it.
 await id(page,'main-help-menu').click();await id(page,'main-help-tour').click();
 await expect(tour).toBeVisible();await expect(tour).toContainText('Step 1 of 6');
 await page.keyboard.press('Escape');await expect(tour).toHaveCount(0);await expect(id(page,'main-help-menu')).toBeFocused();
});

test('Escape or Skip ends the tour for good',async({page})=>{
 await asVisitor(page);await home(page);
 await expect(id(page,'site-tour')).toBeVisible();
 await id(page,'site-tour-skip').click();await expect(id(page,'site-tour')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('openvireo.tour.v1'))).toBe('done');
});

test('menu sections: the current page\'s section and the guides start open, the rest closed; choices are remembered',async({page})=>{
 await asVisitor(page);await page.addInitScript(()=>localStorage.setItem('openvireo.tour.v1','done'));await home(page);
 for(const [name,open] of [['Optical observatory',true],['Radio observatory',false],['Analysis',false],['Results Editors',false],['Files',false],['Exercise guides',true]] as const)
  await expect(section(page,name),name).toHaveAttribute('aria-expanded',String(open));
 await expect(page.getByRole('banner').getByRole('button',{name:'Spectrum analyzer'})).toBeHidden();
 await section(page,'Analysis').click();
 await expect(section(page,'Analysis')).toHaveAttribute('aria-expanded','true');
 await expect(page.getByRole('banner').getByRole('button',{name:'Spectrum analyzer'})).toBeVisible();
 await section(page,'Exercise guides').click();await expect(page.getByRole('banner').getByRole('button',{name:'Hubble lab guide'})).toBeHidden();
 await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await expect(section(page,'Analysis')).toHaveAttribute('aria-expanded','true');
 await expect(section(page,'Exercise guides')).toHaveAttribute('aria-expanded','false');
 // Going to a page of a closed section opens it.
 await page.goto('/#radio-control');await expect(section(page,'Radio observatory')).toHaveAttribute('aria-expanded','true');
 await expect(page.getByRole('banner').getByRole('button',{name:'Radio telescope'})).toBeVisible();
});

test('on a phone the tour docks at the bottom and points at the Tools button',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await asVisitor(page);await home(page);
 const tour=id(page,'site-tour');await expect(tour).toBeVisible();
 await id(page,'site-tour-next').click();await expect(tour).toHaveAttribute('data-step','sections');
 // The outline moves with a short animation; wait until it surrounds Tools.
 await expect.poll(async()=>{const spot=await id(page,'site-tour-spot').boundingBox(),tools=await page.locator('.tools-toggle').boundingBox();
  return !!(spot&&tools&&spot.x<=tools.x&&spot.x+spot.width>=tools.x+tools.width);}).toBe(true);
 const card=await tour.locator('.site-tour-card').boundingBox();
 expect(card&&card.x>=0&&card.x+card.width<=375&&card.y+card.height<=812).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
