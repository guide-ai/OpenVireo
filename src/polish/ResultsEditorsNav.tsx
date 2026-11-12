import {memo} from 'react';
import {RESULTS_EDITORS_LITERALS as R,POLISH_MESSAGES as PM} from './PolishMessages';
import {menuCaptionText} from '../core/radioControl';
import NavGroup from '../components/NavGroup';
import {vireo} from '../i18n/vireo';

type ResultsRoute='spectrum'|'pulsar-analysis';
let pendingReveal:(()=>void)|null=null;
/** Opens a disclosure on the route just shown (after the route's own focus/scroll handling) and focuses its summary. Front
 * LAZY-OBS (review 1, finding 3): from the welcome shell the route's page is not there yet (the app is still loading), so the
 * reveal waits until the disclosure is shown, then does the same two frames later; a newer reveal or 30 s cancel the wait. */
function reveal(selector:string){
 pendingReveal?.();
 const shown=()=>{const el=document.querySelector<HTMLDetailsElement>(selector);return el&&el.getClientRects().length>0?el:null;};
 const open=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const el=document.querySelector<HTMLDetailsElement>(selector);if(!el)return;
  el.open=true;el.scrollIntoView({block:'start'});el.querySelector<HTMLElement>('summary')?.focus({preventScroll:true});
 }));
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(document.querySelector(selector)&&(shown()||!document.querySelector('[data-testid="welcome-shell"]'))){open();return;}
  const observer=new MutationObserver(()=>{if(shown()){stop();open();}});
  const timer=setTimeout(()=>stop(),30000);
  const stop=()=>{observer.disconnect();clearTimeout(timer);if(pendingReveal===stop)pendingReveal=null;};
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});pendingReveal=stop;
 }));
}
/** Tools › Results Editors (TEnvironment1 DFM ResultsEditors1 [D]) as header aliases [W]: Observational Results opens the
 * analyzer's own observational results (Save Data, Display/Print/Save Text, Load Saved Data live there); Pulsar Results
 * opens the pulsar analysis' saved measurements (Review, Save, Clear). The editors themselves are unchanged. */
function ResultsEditorsNav({navigate}:{navigate:(route:ResultsRoute)=>void}){
 const go=(route:ResultsRoute,selector:string)=>{navigate(route);reveal(selector);};
 return <NavGroup id="results" label={vireo(menuCaptionText(R.resultsEditors))} title={PM.results.help}>
   {/* data-route only lets the phone header menu close on click (PortalHeader); these are aliases, never the current page. */}
   <button data-route="results-observational" data-testid="results-observational" onClick={()=>go('spectrum','.own-results-card')}>{vireo(menuCaptionText(R.observational))}</button>
   <button data-route="results-pulsar" data-testid="results-pulsar" onClick={()=>go('pulsar-analysis','[data-testid="saved-rows-disclosure"]')}>{vireo(menuCaptionText(R.pulsar))}</button>
 </NavGroup>;
}
// Front Perf: no state of its own depends on the shell; re-render only when its props change.
export default memo(ResultsEditorsNav);
