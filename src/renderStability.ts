/** Front Perf: helpers that let React.memo skip children whose inputs did not change, without changing what any handler
 * does. Plan analysis/front-plans/front-perf.md §3; render budget docs/RENDER-BUDGET.md. */
import {useInsertionEffect,useRef,useState} from 'react';

type Handlers=Record<string,(...args:never[])=>unknown>;
/** Stable wrappers for a fixed set of handlers: each wrapper always calls the handler from the latest render, so a handler
 * sees the same state at call time as an inline arrow would. The key set must not change between renders. The wrappers
 * must not be called during render (event handlers and effects only); the latest closures are installed before any
 * layout effect or event can run. */
export function useStableHandlers<T extends Handlers>(handlers:T):T{
 const latest=useRef(handlers);
 useInsertionEffect(()=>{latest.current=handlers;});
 const [stable]=useState(()=>Object.freeze(Object.fromEntries(Object.keys(handlers).map(k=>[k,(...args:never[])=>(latest.current[k] as (...a:never[])=>unknown)(...args)]))) as T);
 return stable;
}
/** Equality by value for plain JSON data (progress summaries and similar): two values are equal when they serialise the
 * same. Only for data without functions, Maps, Sets, undefined-vs-missing distinctions or non-finite numbers. */
export function sameData(a:unknown,b:unknown):boolean{return a===b||JSON.stringify(a)===JSON.stringify(b);}
/** The handler props K of a component's props P, required, for `useStableHandlers<StableProps<…>>({...})`. */
export type StableProps<P,K extends keyof P>={[k in K]-?:NonNullable<P[k]>};
/** A React.memo comparator: props in `byValue` are compared with sameData (plain data rebuilt each render, such as a frozen
 * site record); props in `ignored` are not compared (only for a prop the child reads in a render that another prop's change
 * always causes; each use says why); every other prop by identity. */
export function propsEqual<P extends object>(byValue:readonly (keyof P)[],ignored:readonly (keyof P)[]=[]):(a:Readonly<P>,b:Readonly<P>)=>boolean{
 return (a,b)=>{const keys=new Set([...Object.keys(a),...Object.keys(b)] as (keyof P)[]);
  for(const k of keys){if(ignored.includes(k))continue;if(byValue.includes(k)?!sameData(a[k],b[k]):!Object.is(a[k],b[k]))return false;}return true;};
}
