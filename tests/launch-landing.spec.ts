import {test,expect,type Page} from '@playwright/test';
import en from '../src/i18n/en.json' with {type:'json'};
import {openHeaderTools} from './fixtures/header-tools';

// Front LAUNCH-1: "Explore the sky" lands on the sky. The field with Open dome and the target card come first; the telescope
// profiles, the camera, Multi-Spec and the motion panel follow. Every "turn tracking on" message offers "Show tracking control",
// which opens the clock bar and focuses Turn tracking on/off without pressing it; the Pleiades guide's list step opens Original
// hot lists with Load exercise list (PLEIADES.HTL) focused.
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const skyH1=(page:Page)=>page.getByRole('heading',{level:1,name:'Start with the sky.',exact:true});
const asVisitor=(page:Page)=>page.addInitScript(()=>{Object.defineProperty(Navigator.prototype,'webdriver',{configurable:true,get:()=>false});});
const trackButton=(page:Page)=>page.getByTestId('running-clock-track-button');

for(const [width,height] of [[1440,900],[375,812]] as const){
 test(`Explore the sky shows the sky field and Open dome on the first screen at ${width} px; the instruments follow`,async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width,height});
  await page.goto('/');
  await page.getByRole('region',{name:en['home.title']}).getByRole('button',{name:en['home.explore'],exact:true}).click();
  await expect(skyH1(page)).toBeFocused({timeout:30000});
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await expect(button(page,en['sky.open'])).toBeInViewport({ratio:1});
  await expect(page.locator('.sky-card')).toBeInViewport();
  // On a desktop the dome cover's own Open dome and the target card's heading are on the first screen too.
  if(width===1440){
   await expect(button(page,`${en['sky.open']} ↗`)).toBeInViewport({ratio:1});
   await expect(page.getByRole('heading',{name:en['sky.targetTitle'],exact:true})).toBeInViewport({ratio:1});
  }
  // The settings and instruments are below the sky field, in this order.
  await expect(page.locator('.ms-card')).toBeAttached({timeout:30000});
  const order=await page.evaluate(()=>{const main=document.querySelector('.sky-card')?.closest('main');
   return ['.first-steps','.sky-card','[data-testid="optical-telescope"]','[data-testid="camera-control"]','.ms-card','.telescope-motion']
    .map(s=>{const el=main?.querySelector(s);return el?Math.round(el.getBoundingClientRect().top+scrollY):null;});});
  expect(order.every(v=>v!==null)).toBe(true);
  expect([...order as number[]].sort((a,b)=>a-b)).toEqual(order);
  await expect(page.getByTestId('optical-telescope')).not.toBeInViewport();
  await button(page,`${en['sky.open']} ↗`).click();
  await expect(button(page,en['sky.close'])).toBeVisible();
 });
}

test('a "turn tracking on" message offers Show tracking control, which opens the clock bar and focuses the tracking button',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#observatory');await expect(skyH1(page)).toBeVisible({timeout:30000});
 const details=page.getByTestId('running-clock-details');
 await expect(details).not.toHaveAttribute('open','');
 // Tracking is the first thing VIREO's instrument access asks for (src/core/instrumentAccess.ts), so the shortcut is there at once.
 const camera=page.getByTestId('camera-control');
 await expect(page.getByTestId('camera-status')).toContainText('turn tracking on.');await expect(camera.getByTestId('tracking-shortcut')).toBeVisible();
 await button(page,`${en['sky.open']} ↗`).click();
 await page.getByLabel('Target',{exact:true}).selectOption('N0000.DAT@14428');
 await button(page,'Point telescope ↗').click();
 await page.getByRole('group',{name:'Field of view'}).getByRole('button',{name:'Telescope · 15′',exact:true}).click();
 // Tracking off: the camera and Multi-Spec say so and offer the shortcut.
 await expect(page.getByTestId('camera-status')).toContainText('turn tracking on.');
 const shortcut=camera.getByTestId('tracking-shortcut');
 await expect(shortcut).toHaveText(en['runningClock.shortcut']);
 await expect(page.getByTestId('ms-access-status')).toHaveText(en['multispec.blocked.tracking']);
 await expect(page.locator('.ms-card').getByTestId('tracking-shortcut')).toBeVisible();
 await shortcut.click();
 await expect(details).toHaveAttribute('open','');
 await expect(trackButton(page)).toBeFocused();await expect(trackButton(page)).toHaveText(en['runningClock.trackingOn']);
 await expect(trackButton(page)).toBeInViewport({ratio:1});
 // Navigation only: tracking is still off until the student presses the button.
 await expect(page.getByTestId('running-clock-tracking')).toHaveText(en['runningClock.untracked']);
 await page.keyboard.press('Enter');
 await expect(page.getByTestId('running-clock-tracking')).toHaveText(en['runningClock.tracked']);
 await expect(page.getByTestId('tracking-shortcut')).toHaveCount(0);
 await expect(page.getByTestId('camera-status')).not.toContainText('turn tracking on.');
 // The shortcut from the Multi-Spec card, with the bar closed again.
 await page.keyboard.press('Enter');await expect(page.getByTestId('running-clock-tracking')).toHaveText(en['runningClock.untracked']);
 await details.locator('summary').click();await expect(details).not.toHaveAttribute('open','');
 await page.locator('.ms-card').getByTestId('tracking-shortcut').click();
 await expect(details).toHaveAttribute('open','');await expect(trackButton(page)).toBeFocused();
 expect(errors).toEqual([]);
});

test('the first-visit tour\'s observatory step offers Show tracking control, which ends the tour at the tracking button',async({page})=>{
 await asVisitor(page);
 await page.goto('/#observatory');await expect(skyH1(page)).toBeVisible({timeout:30000});
 const tour=page.getByTestId('site-tour');await expect(tour).toBeVisible();
 await expect(page.getByTestId('site-tour-tracking')).toHaveCount(0);
 for(let i=0;i<3;i++)await page.getByTestId('site-tour-next').click();
 await expect(tour).toHaveAttribute('data-step','observatory');
 await page.getByTestId('site-tour-tracking').click();
 await expect(tour).toHaveCount(0);
 await expect(page.getByTestId('running-clock-details')).toHaveAttribute('open','');await expect(trackButton(page)).toBeFocused();
 expect(await page.evaluate(()=>localStorage.getItem('openvireo.tour.v1'))).toBe('done');
});

test('the Pleiades guide\'s first step opens Original hot lists on the observatory with Load exercise list focused',async({page})=>{
 test.setTimeout(90000);
 // From another page: the guide's step goes to the observatory and opens the list there.
 await page.goto('/#spectrum');await expect(page.locator('[data-route="spectrum"][aria-current="page"]').first()).toBeVisible({timeout:30000});
 await openHeaderTools(page);await page.getByTestId('pleiades-lab-open').click();
 const guide=page.getByTestId('pleiades-lab-dialog');await expect(guide).toBeVisible();
 await expect(page.getByTestId('pleiades-lab-next')).toHaveAttribute('data-next','list');
 const step=page.getByTestId('pleiades-lab-step-list');
 await expect(step.getByRole('button',{name:en['pleiadesLab.goObservatory'],exact:true})).toHaveCount(0);
 await step.getByRole('button',{name:en['pleiadesLab.goHotList'],exact:true}).click();
 await expect(guide).toBeHidden();await expect(page).toHaveURL(/#observatory$/);
 await expect(page.getByTestId('htl-details')).toHaveAttribute('open','');
 const load=button(page,en['htl.exerciseLoad']);
 await expect(load).toBeFocused();await expect(load).toBeInViewport({ratio:1});
 await page.keyboard.press('Enter');await expect(page.locator('#htl-rows option')).toHaveCount(24);
 // Continue, with the list step done, now goes on to the next step (point), which is on the observatory too.
 await openHeaderTools(page);await page.getByTestId('pleiades-lab-open').click();
 await expect(page.getByTestId('pleiades-lab-step-list')).toHaveAttribute('data-done','true');
 await expect(page.getByTestId('pleiades-lab-next')).toHaveAttribute('data-next','point');
});

test('on a phone the Pleiades guide\'s Continue reaches the list button too',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:375,height:812});
 await page.goto('/#observatory');await expect(skyH1(page)).toBeVisible({timeout:30000});
 await openHeaderTools(page);await page.getByTestId('pleiades-lab-open').click();
 await page.getByTestId('pleiades-lab-continue').click();
 const load=button(page,en['htl.exerciseLoad']);
 await expect(load).toBeFocused();await expect(load).toBeInViewport({ratio:1});
});
