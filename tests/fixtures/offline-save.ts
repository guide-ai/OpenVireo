import {expect,type Page} from '@playwright/test';
/** Front F2 (closure R1): runs a Save with the network gone. Every HTTP request is aborted and recorded (route-based, so Vite's
 * HMR socket stays up), and none may happen: Save must reuse the code and the verified data files the tab already has.
 * The session code is loaded first, as the analyzer's idle preload does (tests that install a fake clock never reach it;
 * tests/session-chunk.spec.ts covers the preload itself). */
export async function saveOffline<T>(page:Page,save:()=>Promise<T>):Promise<T>{
 await page.evaluate(async()=>{const m=await import('/src/io/analysisSession.ts' as string) as {preloadSaveModules:()=>Promise<unknown>};await m.preloadSaveModules();});
 const requests:string[]=[];
 await page.route('**/*',route=>{requests.push(route.request().url());return route.abort('internetdisconnected');});
 try{const result=await save();expect(requests,'requests made while offline').toEqual([]);return result;}
 finally{await page.unroute('**/*');}
}
