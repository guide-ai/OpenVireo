import type{Page}from'@playwright/test';

/** On phones (<600px) the header tools fold behind the "Tools" disclosure. Opens it when the toggle
 * is shown and closed; on wider screens the toggle is hidden and this does nothing. */
export async function openHeaderTools(page:Page){
 const toggle=page.locator('.portal-header .tools-toggle');
 if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
}

/** Header tool button by its unchanged accessible name. */
export const headerTool=(page:Page,name:string)=>page.locator('.portal-header nav').getByRole('button',{name,exact:true});

/** Click a header tool at any width: opens the phone menu first when needed. */
export async function clickHeaderTool(page:Page,name:string){
 await openHeaderTools(page);
 await headerTool(page,name).click();
}

/** Touch variant of clickHeaderTool for specs that drive the page with taps. */
export async function tapHeaderTool(page:Page,name:string){
 const toggle=page.locator('.portal-header .tools-toggle');
 if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.tap();
 await headerTool(page,name).tap();
}
