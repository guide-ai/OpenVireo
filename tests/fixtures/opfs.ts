import {test,type Page} from '@playwright/test';
/** Front WebKit QA (2026-10-31): the save specs drive the product's real createWritable/write/close/getFile path through a
 * synthetic showSaveFilePicker that hands out handles from the test's origin-private file system. Playwright's WebKit in the
 * official container cannot open that file system (navigator.storage.getDirectory() rejects with UnknownError), and Safari has
 * no showSaveFilePicker, where the product takes its fallback path. Those tests skip there, with this reason. */
export const OPFS_SKIP='Needs a writable origin-private file system for the synthetic save dialog; this engine provides none here (Front WebKit QA, 2026-10-31).';
let usable:boolean|undefined;
async function opfsWritable(page:Page):Promise<boolean>{
 if(usable!==undefined)return usable;
 const context=await page.context().browser()!.newContext(),probe=await context.newPage();
 try{
  await probe.goto(test.info().project.use.baseURL??'/');
  usable=await probe.evaluate(async()=>{try{const d=await navigator.storage.getDirectory(),h=await d.getFileHandle('__opfs-probe',{create:true}),w=await h.createWritable();await w.close();await d.removeEntry('__opfs-probe');return true;}catch{return false;}});
 }finally{await context.close();}
 return usable;
}
export async function skipWithoutOpfs(page:Page){test.skip(!await opfsWritable(page),OPFS_SKIP);}
