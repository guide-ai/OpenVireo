import{test,expect,type Page}from'@playwright/test';
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const frame=async(p:Page)=>p.evaluate(async()=>{for(let i=0;i<4;i++)await new Promise<void>(r=>requestAnimationFrame(()=>r()));});
for(const width of[1440,360])test(`a previous modal close cannot cancel a new inline Next load at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/#classification');await expect(button(page,'Review classification')).toBeEnabled();
 // Capture a real queued close notification, then deliver it after the next operation starts.
 await page.evaluate(()=>{const w=window as any;w.heldProgramClose=0;w.holdProgramClose=true;document.addEventListener('close',e=>{if(w.holdProgramClose&&e.target instanceof HTMLDialogElement&&e.target.classList.contains('program-list-modal')){w.heldProgramClose++;e.stopImmediatePropagation();}},true);});
 await button(page,'Program List').click();await page.keyboard.press('Escape');await expect(button(page,'Program List')).toBeFocused();await expect.poll(()=>page.evaluate(()=>(window as any).heldProgramClose)).toBe(1);
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);let requests=0;await page.route('**/original/classification/A0000014.SP',async route=>{requests++;await gate;try{await route.abort();}catch{/* An explicitly cancelled request may already be gone. */}});
 await button(page,'Next on List').focus();await page.keyboard.press('Enter');await expect(button(page,'Cancel program-list load')).toBeFocused();await expect.poll(()=>requests).toBe(1);
 await page.evaluate(()=>{(window as any).holdProgramClose=false;document.querySelector('.program-list-modal')!.dispatchEvent(new Event('close'));});await frame(page);
 await expect(button(page,'Cancel program-list load')).toBeFocused();await expect(page.getByLabel('Practice object',{exact:true})).toHaveValue('u1');
 await page.keyboard.press('Enter');release();await expect(button(page,'Next on List')).toBeFocused();await expect(button(page,'Cancel program-list load')).not.toBeVisible();await expect(page.getByLabel('Practice object',{exact:true})).toHaveValue('u1');
});
test('closing the currently open Program List still cancels its pending verified load',async({page})=>{
 await page.goto('/#classification');await expect(button(page,'Review classification')).toBeEnabled();let release!:()=>void;const gate=new Promise<void>(r=>release=r);await page.route('**/original/classification/A0000014.SP',async route=>{await gate;try{await route.abort();}catch{/* Current modal cancellation is expected. */}});
 await button(page,'Program List').click();await page.getByLabel('Program-list practice',{exact:true}).selectOption('u2');await button(page,'Load selected practice').click();await expect(button(page,'Cancel program-list load')).toBeFocused();
 await page.locator('.program-list-modal').evaluate((d:HTMLDialogElement)=>d.close());await expect(button(page,'Next on List')).toBeEnabled();release();await frame(page);await expect(button(page,'Cancel program-list load')).not.toBeVisible();await expect(page.getByLabel('Practice object',{exact:true})).toHaveValue('u1');
});
