import {test,expect,type Page} from '@playwright/test';

// Front Project Links (user decision, 2026-11-08): the GitHub source code and Report a problem links. They open GitHub in a new
// tab only when clicked; the tests check the links and never open GitHub.
const repo='https://github.com/guide-ai/OpenVireo';
const issuePage=async(link:ReturnType<Page['getByTestId']>)=>{const url=new URL((await link.getAttribute('href'))!);
 return {path:url.origin+url.pathname,keys:[...url.searchParams.keys()],body:url.searchParams.get('body')??''};};

test('the header has Source code and Report a problem; the report names the current page',async({page})=>{
 await page.goto('/#observatory');await expect(page.getByRole('heading',{name:'Start with the sky.'})).toBeVisible({timeout:15000});
 const links=page.getByTestId('project-links');
 await expect(links).toHaveAccessibleName('OpenVireo on GitHub');
 const source=page.getByTestId('project-repo'),report=page.getByTestId('project-report');
 await expect(source).toHaveAttribute('href',repo);
 for(const link of [source,report]){await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noopener noreferrer');}
 await expect(source).toHaveAccessibleName('Source code (opens GitHub in a new tab)');
 await expect(report).toHaveAccessibleName('Report a problem (opens GitHub in a new tab)');
 let issue=await issuePage(report);
 expect(issue.path).toBe(`${repo}/issues/new`);expect(issue.keys).toEqual(['body']);expect(issue.body).toContain('#observatory');
 await page.locator('button[data-route="radio-control"]').click();
 await expect.poll(async()=>(await issuePage(report)).body).toContain('#radio-control');
 issue=await issuePage(report);expect(issue.body).not.toContain('#observatory');
});

test('Help lists the same two links, with the current page in the report',async({page})=>{
 await page.goto('/#spectrum');await page.getByTestId('main-help-menu').click();
 const source=page.getByTestId('main-help-repo'),report=page.getByTestId('main-help-report');
 await expect(source).toBeVisible();await expect(source).toHaveAttribute('href',repo);
 await expect(report).toBeVisible();expect((await issuePage(report)).body).toContain('#spectrum');
 for(const link of [source,report])await expect(link).toHaveAttribute('rel','noopener noreferrer');
 // An address that is not a route (an in-page anchor, or crafted text) does not reach the issue: it names the menu's page.
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{location.hash='Line1%0A**Steps**';});await page.getByTestId('main-help-menu').click();
 const body=(await issuePage(page.getByTestId('main-help-report'))).body;
 expect(body).not.toContain('Line1');expect(body).toMatch(/#[a-z-]+\n/);
});

test('on a phone the links are in the Tools panel and fit the screen',async({page})=>{
 await page.setViewportSize({width:320,height:640});
 await page.goto('/#observatory');await page.locator('.tools-toggle').click();
 for(const t of ['project-repo','project-report']){
  const box=await page.getByTestId(t).boundingBox();
  expect(box&&box.x>=0&&box.x+box.width<=320&&box.height>=40,t).toBe(true);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('between the phone and wide layouts the status line never runs under Help',async({page})=>{
 for(const width of [600,700,900,1099]){
  await page.setViewportSize({width,height:700});await page.goto('/#observatory');
  const [status,help]=await Promise.all([page.locator('.portal-status').boundingBox(),page.locator('.portal-help').boundingBox()]);
  expect(status&&help,String(width)).toBeTruthy();
  const overlap=!(status!.x+status!.width<=help!.x||status!.y+status!.height<=help!.y||status!.y>=help!.y+help!.height);
  expect(overlap,`${width}px`).toBe(false);
  // The footer column (links, instructor mode, theme) never runs into the brand and Help (review 1).
  const [top,footer]=await Promise.all([page.locator('.portal-help').boundingBox(),page.locator('.portal-footer').boundingBox()]);
  expect(top!.x+top!.width,`${width}px`).toBeLessThanOrEqual(footer!.x);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth),`${width}px`).toBeLessThanOrEqual(width);
 }
});
