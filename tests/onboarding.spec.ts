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
 // Focus is on the step card, named by its number and title and described by its text (review 1 S6).
 await expect(id(page,'site-tour-card')).toBeFocused();
 await expect(id(page,'site-tour-card')).toHaveAccessibleName('Step 1 of 4 Welcome to OpenVireo');
 await expect(id(page,'site-tour-card')).toHaveAccessibleDescription(/short tour shows where things are/);
 // The page under the tour is dimmed, not blurred, so the outlined part stays readable (review 1 B1).
 expect(await tour.evaluate(d=>getComputedStyle(d,'::backdrop').backdropFilter)).toBe('none');
 // Front NEWCOMER NC2: four steps (welcome, save, help, start).
 for(const step of ['save','help','start']){
  await id(page,'site-tour-next').click();
  await expect(tour).toHaveAttribute('data-step',step);await expect(id(page,'site-tour-card')).toBeFocused();
  await expect(id(page,'site-tour-spot')).toBeVisible();
  // Skip, Back and Next share one line, and Back and Next one height (the site-wide primary button's margin once pushed Next
  // below Back).
  if(step==='save'){
   const [skip,back,next]=await Promise.all(['site-tour-skip','site-tour-back','site-tour-next'].map(t=>id(page,t).boundingBox()));
   const mid=(b:{y:number;height:number}|null)=>b?b.y+b.height/2:NaN;
   expect(Math.abs(mid(back)-mid(next))).toBeLessThan(1);expect(Math.abs(mid(skip)-mid(next))).toBeLessThan(1);
   expect(Math.abs((back?.height??0)-(next?.height??-9))).toBeLessThan(1);
   // Front HEADER: the save step outlines Save investigation and More in the page bar.
   await expect.poll(async()=>{const spot=await id(page,'site-tour-spot').boundingBox(),actions=await id(page,'investigation-actions').boundingBox();
    return !!(spot&&actions&&spot.x<=actions.x&&spot.y<=actions.y&&spot.x+spot.width>=actions.x+actions.width&&spot.y+spot.height>=actions.y+actions.height);}).toBe(true);
  }
  // The help step outlines the Help button.
  if(step==='help')await expect.poll(async()=>{const spot=await id(page,'site-tour-spot').boundingBox(),help=await id(page,'main-help-menu').boundingBox();
   return !!(spot&&help&&spot.x<=help.x&&spot.y<=help.y&&spot.x+spot.width>=help.x+help.width&&spot.y+spot.height>=help.y+help.height);}).toBe(true);
 }
 // The last step asks how to start, outlines the guides' menu section and offers two named choices and a plain close; no Skip.
 const card=id(page,'site-tour-card');
 await expect(card).toHaveAccessibleName('Step 4 of 4 How would you like to start?');
 await expect(card).toHaveAccessibleDescription(/on a phone it is behind the Menu button/);
 await expect.poll(async()=>{const spot=await id(page,'site-tour-spot').boundingBox(),guides=await page.locator('[data-nav-group="guides"]').boundingBox();
  return !!(spot&&guides&&spot.x<=guides.x&&spot.y<=guides.y&&spot.x+spot.width>=guides.x+guides.width);}).toBe(true);
 await expect(card.getByRole('button',{name:'Take a first look (about 3 min)'})).toBeVisible();
 await expect(card.getByRole('button',{name:'Choose a lab'})).toBeVisible();
 await expect(id(page,'site-tour-skip')).toHaveCount(0);
 // Keyboard order on the last card: the two choices, then Back, then Start exploring.
 await page.keyboard.press('Tab');await expect(page.locator('#site-tour-first-look')).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('#site-tour-choose-lab')).toBeFocused();
 await page.keyboard.press('Tab');await expect(id(page,'site-tour-back')).toBeFocused();
 await page.keyboard.press('Tab');await expect(id(page,'site-tour-next')).toBeFocused();
 await id(page,'site-tour-back').click();await expect(tour).toHaveAttribute('data-step','help');
 await id(page,'site-tour-next').click();await expect(id(page,'site-tour-next')).toHaveText('Start exploring');
 await id(page,'site-tour-next').click();
 await expect(tour).toHaveCount(0);await expect(id(page,'main-help-menu')).toBeFocused();
 await expect(id(page,'guide-companion')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('openvireo.tour.v1'))).toBe('done');
 await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await page.waitForTimeout(1200);await expect(tour).toHaveCount(0);
 // Help repeats it.
 await id(page,'main-help-menu').click();await id(page,'main-help-tour').click();
 await expect(tour).toBeVisible();await expect(tour).toContainText('Step 1 of 4');
 await page.keyboard.press('Escape');await expect(tour).toHaveCount(0);await expect(id(page,'main-help-menu')).toBeFocused();
});

test('the tour\'s last step: Take a first look starts the first look; Choose a lab shows the welcome\'s lab list with the focus on it',async({page})=>{
 await asVisitor(page);await home(page);
 const tour=id(page,'site-tour');await expect(tour).toBeVisible();
 for(let i=0;i<3;i++)await id(page,'site-tour-next').click();
 await expect(tour).toHaveAttribute('data-step','start');
 await page.locator('#site-tour-first-look').click();
 await expect(tour).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('openvireo.tour.v1'))).toBe('done');
 // The first look's strip, on its first step, with the focus on its Show me where (as Help › Take a first look does here).
 await expect(id(page,'guide-companion')).toBeVisible();await expect(id(page,'guide-companion')).toContainText('Open the dome');
 await expect(id(page,'guide-companion-show')).toBeFocused();
 await expect(page).toHaveURL(/#observatory$/);
 // Taken again from Help: Choose a lab goes to the welcome, scrolled to the lab list, whose heading has the focus.
 await id(page,'main-help-menu').click();await id(page,'main-help-tour').click();await expect(tour).toBeVisible();
 for(let i=0;i<3;i++)await id(page,'site-tour-next').click();
 await page.locator('#site-tour-choose-lab').press('Enter');
 await expect(tour).toHaveCount(0);
 await expect(page).toHaveURL(/#home$/);
 const heading=page.locator('#home-labs');await expect(heading).toBeFocused();await expect(heading).toBeInViewport();
 await expect(page.getByRole('heading',{name:'The seven labs'})).toBeVisible();
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

test('on a phone the tour docks at the bottom, and its last step points at the Menu button it names',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await asVisitor(page);await home(page);
 const tour=id(page,'site-tour');await expect(tour).toBeVisible();
 for(let i=0;i<3;i++)await id(page,'site-tour-next').click();
 await expect(tour).toHaveAttribute('data-step','start');
 await expect(id(page,'site-tour-card')).toContainText('behind the Menu button');await expect(page.locator('.tools-toggle')).toHaveText('Menu');
 // The outline moves with a short animation; wait until it surrounds Menu.
 await expect.poll(async()=>{const spot=await id(page,'site-tour-spot').boundingBox(),tools=await page.locator('.tools-toggle').boundingBox();
  return !!(spot&&tools&&spot.x<=tools.x&&spot.x+spot.width>=tools.x+tools.width);}).toBe(true);
 const card=await tour.locator('.site-tour-card').boundingBox();
 expect(card&&card.x>=0&&card.x+card.width<=375&&card.y+card.height<=812).toBe(true);
 // Both choices fit inside the card.
 for(const choice of ['#site-tour-first-look','#site-tour-choose-lab']){const b=await page.locator(choice).boundingBox();
  expect(b&&card&&b.x>=card.x&&b.x+b.width<=card.x+card.width,choice).toBe(true);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
 // Choose a lab from the observatory on a phone: the welcome's lab list, focused and on screen.
 await page.locator('#site-tour-choose-lab').click();
 await expect(page.locator('#home-labs')).toBeFocused();await expect(page.locator('#home-labs')).toBeInViewport();
});

test('the tour does not interrupt a visitor who is already using the page',async({page})=>{
 await asVisitor(page);await page.goto('/#observatory');
 await page.getByLabel('Search catalog',{exact:true}).fill('M8');
 await page.waitForTimeout(1500);await expect(id(page,'site-tour')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('openvireo.tour.v1'))).toBeNull();
});

test('the ? key: not over an aria-modal panel, and the visitor can turn it off',async({page})=>{
 await page.goto('/#lss-wedge');await id(page,'wedge-options-open').click();
 await expect(page.locator('[aria-modal="true"]')).toBeVisible();
 await page.keyboard.press('?');await page.waitForTimeout(200);await expect(id(page,'web-help')).toHaveCount(0);
 await page.keyboard.press('Escape');
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await page.getByRole('heading',{name:'Start with the sky.'}).click();
 await page.keyboard.press('?');await expect(id(page,'web-help')).toBeVisible();
 await id(page,'web-help-topics').getByRole('button',{name:'Menus, keyboard and phones'}).click();
 await id(page,'web-help-key').uncheck();await page.keyboard.press('Escape');await expect(id(page,'web-help')).toHaveCount(0);
 await page.getByRole('heading',{name:'Start with the sky.'}).click();await page.keyboard.press('?');
 await page.waitForTimeout(200);await expect(id(page,'web-help')).toHaveCount(0);
 await page.reload();await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 await page.getByRole('heading',{name:'Start with the sky.'}).click();await page.keyboard.press('?');
 await page.waitForTimeout(200);await expect(id(page,'web-help')).toHaveCount(0);
 // Help topics… still opens it, and the switch turns the key back on.
 await id(page,'main-help-menu').click();await id(page,'main-help-web').click();
 await id(page,'web-help-topics').getByRole('button',{name:'Menus, keyboard and phones'}).click();
 await expect(id(page,'web-help-key')).not.toBeChecked();await id(page,'web-help-key').check();
 expect(await page.evaluate(()=>localStorage.getItem('openvireo.help-key.v1'))).toBeNull();
});
