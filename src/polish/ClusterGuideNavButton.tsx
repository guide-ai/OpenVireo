import {memo} from 'react';
import {POLISH_MESSAGES as PM} from './PolishMessages';

/** The guide's own button inside the cluster database, once it is shown. */
const guideButton=()=>{const b=document.querySelector<HTMLButtonElement>('[data-testid="cluster-lab-open"]');return b&&b.offsetParent!==null?b:null;};
let pending:(()=>void)|null=null;
/** Header › Exercise guides › Cluster HR guide (Front P): the E05 guide lives inside the lazily loaded cluster database
 * (ClusterLabGuide in #cluster-database). This goes there and opens the guide as soon as the database has loaded, however
 * long that takes; leaving the route (or a newer click) cancels the wait. */
function ClusterGuideNavButton({navigate}:{navigate:(route:'cluster-database')=>void}){
 function open(){
  pending?.();navigate('cluster-database');
  const now=guideButton();if(now){now.click();return;}
  const observer=new MutationObserver(()=>{const b=guideButton();if(b){stop();b.click();}});
  const leave=()=>{if(location.hash!=='#cluster-database')stop();};
  const stop=()=>{observer.disconnect();window.removeEventListener('hashchange',leave);if(pending===stop)pending=null;};
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('hashchange',leave);pending=stop;
 }
 return <button data-testid="cluster-lab-nav" onClick={open}>{PM.clusterGuide.nav}</button>;
}
// Front Perf: no state of its own depends on the shell; re-render only when its props change.
export default memo(ClusterGuideNavButton);
