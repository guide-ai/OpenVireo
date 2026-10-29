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
