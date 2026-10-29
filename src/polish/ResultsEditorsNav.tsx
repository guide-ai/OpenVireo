import {memo} from 'react';
import {RESULTS_EDITORS_LITERALS as R,POLISH_MESSAGES as PM} from './PolishMessages';
import {menuCaptionText} from '../core/radioControl';

type ResultsRoute='spectrum'|'pulsar-analysis';
/** Opens a disclosure on the route just shown (after the route's own focus/scroll handling) and focuses its summary. */
function reveal(selector:string){
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const el=document.querySelector<HTMLDetailsElement>(selector);if(!el)return;
  el.open=true;el.scrollIntoView({block:'start'});el.querySelector<HTMLElement>('summary')?.focus({preventScroll:true});
 }));
}
/** Tools › Results Editors (TEnvironment1 DFM ResultsEditors1 [D]) as header aliases [W]: Observational Results opens the
 * analyzer's own observational results (Save Data, Display/Print/Save Text, Load Saved Data live there); Pulsar Results
 * opens the pulsar analysis' saved measurements (Review, Save, Clear). The editors themselves are unchanged. */
function ResultsEditorsNav({navigate}:{navigate:(route:ResultsRoute)=>void}){
 const go=(route:ResultsRoute,selector:string)=>{navigate(route);reveal(selector);};
 return <div className="nav-group" role="group" aria-labelledby="nav-group-results" title={PM.results.help}>
  <span className="nav-group-label" id="nav-group-results">{menuCaptionText(R.resultsEditors)}</span>
  <div className="nav-group-items">
   {/* data-route only lets the phone header menu close on click (PortalHeader); these are aliases, never the current page. */}
   <button data-route="results-observational" data-testid="results-observational" onClick={()=>go('spectrum','.own-results-card')}>{menuCaptionText(R.observational)}</button>
   <button data-route="results-pulsar" data-testid="results-pulsar" onClick={()=>go('pulsar-analysis','[data-testid="saved-rows-disclosure"]')}>{menuCaptionText(R.pulsar)}</button>
  </div>
 </div>;
}
// Front Perf: no state of its own depends on the shell; re-render only when its props change.
export default memo(ResultsEditorsNav);
