/** Finding and outlining a part of the page (Front Onboarding [W], Front GUIDE-COMPANION [W]): shared by the first-visit tour
 * (components/SiteTour.tsx) and the guide companion's Show me where (components/GuideCompanion.tsx). `chooseCandidate` is pure;
 * the rest reads the document. */
import type {Box} from './tourPlacement';

/** The first element, in selector order, that is shown on screen. */
export function visibleTarget(selectors:readonly string[]):Element|null{
 for(const s of selectors){const el=document.querySelector(s);if(el){const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)return el;}}
 return null;
}
/** The visible window, without a classic scrollbar, so no outline or card goes under it. */
export function viewSize(){const d=document.documentElement;return {width:d.clientWidth||window.innerWidth,height:d.clientHeight||window.innerHeight};}
/** The target's box, clipped to the window, so a tall part (the sidebar menu) is outlined only where it is on screen. */
export function clippedBox(el:Element,view:{width:number;height:number}):Box|null{
 const r=el.getBoundingClientRect(),left=Math.max(r.left,0),top=Math.max(r.top,0),right=Math.min(r.right,view.width),bottom=Math.min(r.bottom,view.height);
 return right>left&&bottom>top?{left,top,width:right-left,height:bottom-top}:null;
}

/** What Show me where needs to know about an element that matched one of a step's selectors. */
export type CandidateState=Readonly<{
 /** Inside a route that is not shown (visited routes stay in the document, hidden). */
 hidden:boolean;
 /** A disabled control: it can be outlined, but an enabled candidate is preferred. */
 disabled:boolean;
 /** It has a box on screen. */
 visible:boolean;
 /** It has no box only because a `<details>` around it is closed; opening it shows the element. */
 collapsed:boolean;
}>;
/** The element Show me where outlines. `groups` holds, per selector and in the step's order, the elements that matched.
 * A step that is a short chain of actions lists its controls from the last action to the first, so the page's own enabled state
 * decides: the first candidate that can be shown and is enabled wins; when every one is disabled, the first that can be shown
 * (the outline then sits on the disabled control, beside the page's own explanation). Null when none can be shown. Pure. */
export function chooseCandidate<T>(groups:readonly (readonly T[])[],read:(el:T)=>CandidateState):T|null{
 let fallback:T|null=null;
 for(const group of groups)for(const el of group){
  const s=read(el);
  if(s.hidden||!(s.visible||s.collapsed))continue;
  if(!s.disabled)return el;
  fallback??=el;
 }
 return fallback;
}

const boxed=(el:Element)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
/** The closed `<details>` that hide `el`, innermost first. A `<summary>` (and what is in it) is shown while its own `<details>`
 * is closed, so that one does not count; nor does `el` itself when it is a `<details>`. */
const closedDetails=(el:Element):HTMLDetailsElement[]=>{
 const out:HTMLDetailsElement[]=[],summary=el.closest('summary');
 const from=summary?summary.parentElement:el;
 for(let d=from?.parentElement?.closest('details')??null;d;d=d.parentElement?.closest('details')??null)if(!d.open)out.push(d);
 return out;
};
function readCandidate(el:Element):CandidateState{
 const hidden=el.closest('[hidden]')!==null,visible=!hidden&&boxed(el);
 return {hidden,disabled:el.matches(':disabled')||el.closest('[aria-disabled="true"]')!==null,visible,collapsed:!hidden&&!visible&&closedDetails(el).length>0};
}
/** The control of a guide step on the current page: the chosen candidate, with any closed `<details>` around it opened (as the
 * hot-list and tracking shortcuts of the shell do). Null when no candidate is on the page yet. */
export function findGuideTarget(selectors:readonly string[]):Element|null{
 const el=chooseCandidate(selectors.map(s=>[...document.querySelectorAll(s)]),readCandidate);
 if(!el)return null;
 for(const d of closedDetails(el))d.open=true;
 return boxed(el)?el:null;
}
/** Waits for a guide step's control (a route that is still loading, a page that is still rendering): tries now, then on every
 * change of the document until `timeout` ms. `cancelled` ends the wait early. Resolves with the element, or null. */
export function waitForGuideTarget(selectors:readonly string[],timeout:number,cancelled:()=>boolean):Promise<Element|null>{
 return new Promise(resolve=>{
  const now=findGuideTarget(selectors);
  if(now||timeout<=0){resolve(now);return;}
  let done=false;
  const finish=(el:Element|null)=>{if(done)return;done=true;observer.disconnect();window.clearTimeout(timer);resolve(el);};
  const observer=new MutationObserver(()=>{if(cancelled()){finish(null);return;}const el=findGuideTarget(selectors);if(el)finish(el);});
  const timer=window.setTimeout(()=>finish(cancelled()?null:findGuideTarget(selectors)),timeout);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','open','aria-disabled']});
 });
}
/** Moves focus to a guide step's control: the element itself when it takes focus, else the first control inside it. */
export function focusGuideTarget(el:Element){
 const focusable='button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href],[tabindex]:not([tabindex="-1"])';
 const target=el.matches(focusable)?el:el.querySelector(focusable);
 if(target instanceof HTMLElement||target instanceof SVGElement)target.focus({preventScroll:true});
}
