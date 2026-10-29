import {POLISH_MESSAGES as PM} from './PolishMessages';

/** Header › Exercise guides › Cluster HR guide (Front P): the E05 guide lives inside the lazily loaded cluster database
 * (ClusterLabGuide in #cluster-database); this goes there and opens it once its button exists (at most ~5 s). */
export default function ClusterGuideNavButton({navigate}:{navigate:(route:'cluster-database')=>void}){
 function open(){
  navigate('cluster-database');
  const started=performance.now();
  const tick=()=>{const b=document.querySelector<HTMLButtonElement>('[data-testid="cluster-lab-open"]');
   if(b&&b.offsetParent!==null){b.click();return;}if(performance.now()-started<5000)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
 }
 return <button data-testid="cluster-lab-nav" onClick={open}>{PM.clusterGuide.nav}</button>;
}
