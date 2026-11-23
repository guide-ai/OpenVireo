import {test as base} from '@playwright/test';
import {appendFileSync} from 'node:fs';
export * from '@playwright/test';

// Front GUIDE-COMPANION, audit harness (not a test of its own): run an existing whole-exercise walk with this `test` in place
// of Playwright's and it records, at every change, what the companion strip shows and which control Show me where would
// outline on the page shown. AUDIT_LAB is the guide to keep in use (its window is opened at load, as a /labs/ link does, and
// closed at once, and the walk's own first page is put back); AUDIT_OUT is the file the trace is appended to. Used by hand:
//   sed "s#@playwright/test#./fixtures/companion-audit#" tests/lss-guide.spec.ts > tests/zz-audit-lss.spec.ts
//   AUDIT_LAB=large-scale-structure AUDIT_OUT=<a scratch file> npx playwright test tests/zz-audit-lss.spec.ts
// and delete the copy and the trace afterwards (the copy is never committed).
const LAB=process.env.AUDIT_LAB??'',OUT=process.env.AUDIT_OUT??'';

export const test=base.extend({page:async({page},use,info)=>{
 if(LAB&&OUT){
  page.on('console',m=>{const text=m.text();if(text.startsWith('[AUDIT] '))appendFileSync(OUT,`${info.title.slice(0,48)}\t${text.slice(8)}\n`);});
  await page.addInitScript((lab:string)=>{
   if(window.top!==window)return;
   const first=location.hash;
   if(!first.startsWith('#lab='))history.replaceState(null,'',`${location.pathname}${location.search}#lab=${lab}`);
   let closed=false,last='',busy=false,again=false;
   const name=(el:Element)=>el.getAttribute('data-testid')??(el.id?`#${el.id}`:el.tagName.toLowerCase());
   async function probe(){
    if(busy){again=true;return;}
    busy=true;
    try{
     const dialog=document.querySelector<HTMLDialogElement>('dialog.hubble-lab-dialog[open]');
     if(!closed&&dialog){closed=true;dialog.close();if(!first.startsWith('#lab='))location.hash=first;}
     const strip=document.querySelector('[data-testid="guide-companion"]');
     if(strip){
      // @ts-expect-error the dev server's own modules, loaded in the page
      const [{GUIDE_TARGETS},{findGuideTarget}]=await Promise.all([import('/src/help/guideTargets.ts'),import('/src/help/spot.ts')]);
      const guide=strip.getAttribute('data-lab')!,target=strip.getAttribute('data-target')!,route=strip.getAttribute('data-route');
      const selectors:readonly string[]=GUIDE_TARGETS[guide]?.[target]??[],found=findGuideTarget(selectors);
      const here=location.hash.replace(/^#/,''),on=route===null?'any':here===route?'yes':'no';
      const line=JSON.stringify({step:strip.getAttribute('data-step'),target,n:strip.querySelector('[data-testid="guide-companion-step"]')?.textContent??'',route,here,on,
       found:selectors.length===0?'(no Show me where)':found?`${name(found.el)}${found.enabled?'':' [disabled]'}`:'NONE'});
      if(line!==last){last=line;console.log(`[AUDIT] ${line}`);}
     }
    }catch(error){console.log(`[AUDIT] {"error":${JSON.stringify(String(error))}}`);}
    busy=false;
    if(again){again=false;void probe();}
   }
   // A MutationObserver, not a timer: several walks install a fake clock.
   const start=()=>{new MutationObserver(()=>{void probe();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true});void probe();};
   if(document.documentElement)start();else document.addEventListener('readystatechange',start,{once:true});
  },LAB);
 }
 await use(page);
}});
