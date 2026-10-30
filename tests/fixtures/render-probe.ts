/** Front Perf: counts the React components each commit renders, through a stub React DevTools hook (dev build only).
 * The walk follows React DevTools' own rule: a subtree whose child pointer did not change was not visited; a component
 * counts when it is new or carries the PerformedWork flag (1). Counts are deterministic for a given flow; times are not
 * and are only reported. Plan analysis/front-plans/front-perf.md; docs/RENDER-BUDGET.md. */
import type {Page} from '@playwright/test';

export type RenderTally=Readonly<{commits:number;components:number;byName:Readonly<Record<string,number>>}>;

function installHook(){
 const w=window as unknown as Record<string,unknown>;
 type Fiber={tag:number;type:unknown;flags:number;child:Fiber|null;sibling:Fiber|null;alternate:Fiber|null};
 const tally={commits:0,components:0,byName:{} as Record<string,number>};
 const name=(f:Fiber)=>{const t=f.type as {displayName?:string;name?:string;type?:{displayName?:string;name?:string};render?:{displayName?:string;name?:string}}|null;
  if(!t)return '?';if(typeof t==='function'){const fn=t as {displayName?:string;name?:string};return fn.displayName||fn.name||'anonymous';}const i=t.type??t.render;return t.displayName||i?.displayName||i?.name||'anonymous';};
 const component=(f:Fiber)=>f.tag===0||f.tag===1||f.tag===11||f.tag===14||f.tag===15;
 function walk(next:Fiber,prev:Fiber|null,mount:boolean){
  if(component(next)&&(mount||!prev||(next.flags&1))){tally.components++;const n=name(next);tally.byName[n]=(tally.byName[n]??0)+1;}
  if(!mount&&prev&&next.child===prev.child)return;
  for(let c=next.child;c;c=c.sibling)walk(c,c.alternate,mount||!c.alternate);
 }
 w.__openVireoRenders=tally;
 w.__REACT_DEVTOOLS_GLOBAL_HOOK__={supportsFiber:true,renderers:new Map(),inject:()=>1,checkDCE(){},onScheduleFiberRoot(){},onCommitFiberUnmount(){},onPostCommitFiberRoot(){},
  onCommitFiberRoot(_id:number,root:{current:Fiber}){tally.commits++;walk(root.current,root.current.alternate,!root.current.alternate);}};
}
/** Call before the first navigation. */
export async function installRenderProbe(page:Page){await page.addInitScript(installHook);}
/** Zeroes the tally (a page that has not loaded yet starts at zero on its own). */
export async function resetRenders(page:Page){await page.evaluate(()=>{const t=(window as unknown as {__openVireoRenders?:{commits:number;components:number;byName:Record<string,number>}}).__openVireoRenders;if(t){t.commits=0;t.components=0;t.byName={};}});}
export async function readRenders(page:Page):Promise<RenderTally>{return page.evaluate(()=>JSON.parse(JSON.stringify((window as unknown as {__openVireoRenders:RenderTally}).__openVireoRenders)));}
/** Renders caused by `act`, after the page settles (no commit for `quietMs`). */
export async function rendersOf(page:Page,act:()=>Promise<void>,quietMs=400):Promise<RenderTally>{
 await resetRenders(page);await act();
 let last=-1;for(;;){await page.waitForTimeout(quietMs);const n=(await readRenders(page)).commits;if(n===last)break;last=n;}
 return readRenders(page);
}
