import { test,expect } from '@playwright/test';
// Front D3 review 1 (M1, L1): the analyzer's session code is a separate chunk (src/io/analysisSession.ts in the dev build).
// It is preloaded once the page is idle, so Save still works in an open tab that can no longer fetch it (offline, or a new
// deployment that removed the old hashed chunk). When it cannot be loaded at all, Save and Restore report a loading problem,
// never a problem with the student's work or file, and a later attempt loads it again.
const SESSION_CHUNK=/\/src\/io\/analysisSession\.ts/;
const saveSession=(page:import('@playwright/test').Page)=>page.getByRole('button',{name:'Save session',exact:true}).click();

test('Save works after the idle preload even when the session chunk can no longer be fetched',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 let inFlight=0,last=Date.now();
 page.on('request',()=>{inFlight++;last=Date.now();});
 for(const done of ['requestfinished','requestfailed'] as const)page.on(done,()=>{inFlight--;last=Date.now();});
 const preloaded=page.waitForResponse(r=>SESSION_CHUNK.test(r.url())&&r.ok());
 await page.goto('/#spectrum');
 await preloaded;// nothing was clicked: only the idle preload asks for the chunk
 // In the dev build every module is its own request: wait until the page has fetched nothing for 2 s.
 await expect.poll(()=>inFlight===0&&Date.now()-last>2_000,{timeout:20_000,intervals:[250]}).toBe(true);
 const blocked:string[]=[];await page.route(/\/src\//,route=>{blocked.push(route.request().url());return route.abort();});
 await page.getByLabel('Object or reference').fill('Offline save');
 const waiting=page.waitForEvent('download');await saveSession(page);
 const file=await waiting;expect(file.suggestedFilename()).toBe('openvireo-session.json');
 await expect(page.getByText('Session downloaded. Keep this file to restore your analysis later.',{exact:true})).toBeVisible();
 expect(blocked).toEqual([]);// the saved module was used; nothing new had to be fetched
 expect(errors).toEqual([]);
});

test('a session chunk that cannot be loaded is a loading problem in Save and Restore, and a later Save retries',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(SESSION_CHUNK,route=>route.abort());
 await page.goto('/#spectrum');
 await expect(page.getByLabel('Object or reference')).toBeVisible();
 let downloads=0;page.on('download',()=>downloads++);
 await saveSession(page);
 await expect(page.getByRole('alert')).toContainText('Could not load the part of OpenVireo that saves sessions (a loading problem, not a problem with your work).');
 await page.getByLabel('Restore analysis session',{exact:true}).setInputFiles({name:'openvireo-session.json',mimeType:'application/json',buffer:Buffer.from('{}')});
 await expect(page.getByRole('alert')).toContainText('Could not load the part of OpenVireo that restores sessions (a loading problem, not a problem with the file).');
 expect(downloads).toBe(0);
 await page.unroute(SESSION_CHUNK);
 const waiting=page.waitForEvent('download');await saveSession(page);
 expect((await waiting).suggestedFilename()).toBe('openvireo-session.json');
 expect(errors).toEqual([]);
});
