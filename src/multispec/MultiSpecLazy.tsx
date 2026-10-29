import {useEffect,useState,type ComponentProps,type ComponentType} from 'react';
import type MultiSpecObservatory from './MultiSpecObservatory';
import type MultiSpecObjectX from './MultiSpecObjectX';
// Front M: Multi-Spec loads its cores (field engine, spectra, formats) only when its card is shown.
// The chunk is loaded by a plain dynamic import whose completion sets state, not by React.lazy/Suspense: these cards are
// mounted on routes the student may not be viewing (the hidden observatory, the lazily loaded Object X lab), and React 19
// throttles successive Suspense reveals for 300 ms with setTimeout. A Multi-Spec reveal therefore delayed the reveal of the
// route actually shown (for example the lazily loaded Photometer) behind a page timer, which never fires while the page
// clock is paused. Here the card appears when its chunk arrives; nothing waits on a timer.
function deferred<P extends object>(load:()=>Promise<{default:ComponentType<P>}>){
 let loaded:ComponentType<P>|null=null,failure:{error:unknown}|null=null,pending:Promise<void>|null=null;
 const start=()=>pending??=load().then(m=>{loaded=m.default;},error=>{failure={error};});
 return function Deferred(props:P){
  const [,setSettled]=useState(false);
  useEffect(()=>{if(loaded||failure)return;let live=true;void start().then(()=>{if(live)setSettled(true);});return()=>{live=false;};},[]);
  if(failure)throw failure.error;// as a rejected React.lazy: the nearest error boundary handles it
  const Loaded=loaded;
  return Loaded?<Loaded {...props}/>:null;
 };
}
const Observatory=deferred<ComponentProps<typeof MultiSpecObservatory>>(()=>import('./MultiSpecObservatory'));
const ObjectX=deferred<ComponentProps<typeof MultiSpecObjectX>>(()=>import('./MultiSpecObjectX'));
export function MultiSpecObservatoryLazy(props:ComponentProps<typeof MultiSpecObservatory>){return <Observatory {...props}/>;}
export function MultiSpecObjectXLazy(props:ComponentProps<typeof MultiSpecObjectX>){return <ObjectX {...props}/>;}
