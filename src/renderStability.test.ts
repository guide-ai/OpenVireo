// Front Perf review 1 L4: the contracts of src/renderStability.ts that about twenty memoised components rely on.
// No DOM environment is installed (node only), so useStableHandlers is exercised through react-dom/server: its key set,
// frozen identity and call-time forwarding to the handlers of the render. Commit-time updates (the insertion effect) are
// covered by the e2e flows and by tests/render-budget.spec.ts.
import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {propsEqual,sameData,useStableHandlers} from './renderStability';

describe('sameData',()=>{
 it('is true for identical values and equal plain data, false otherwise',()=>{
  const a={x:1,y:[1,2,{z:'s'}]};
  expect(sameData(a,a)).toBe(true);
  expect(sameData(a,{x:1,y:[1,2,{z:'s'}]})).toBe(true);
  expect(sameData(a,{x:1,y:[1,2,{z:'t'}]})).toBe(false);
  expect(sameData(null,null)).toBe(true);
  expect(sameData(1,'1')).toBe(false);
 });
 it('treats a different key order as different, which only costs a re-render (safe)',()=>{
  expect(sameData({a:1,b:2},{b:2,a:1})).toBe(false);
 });
});

describe('propsEqual',()=>{
 type P={site:{lat:number};fn:()=>void;n:number;ignored?:()=>number};
 const fn=()=>{};
 it('compares byValue props by value and every other prop by identity',()=>{
  const eq=propsEqual<P>(['site']);
  expect(eq({site:{lat:1},fn,n:1},{site:{lat:1},fn,n:1})).toBe(true);
  expect(eq({site:{lat:1},fn,n:1},{site:{lat:2},fn,n:1})).toBe(false);
  expect(eq({site:{lat:1},fn,n:1},{site:{lat:1},fn:()=>{},n:1})).toBe(false);
  expect(eq({site:{lat:1},fn,n:1},{site:{lat:1},fn,n:2})).toBe(false);
 });
 it('skips ignored props and notices props that appear or disappear',()=>{
  const eq=propsEqual<P>(['site'],['ignored']);
  expect(eq({site:{lat:1},fn,n:1,ignored:()=>1},{site:{lat:1},fn,n:1,ignored:()=>2})).toBe(true);
  const strict=propsEqual<P>(['site']);
  expect(strict({site:{lat:1},fn,n:1},{site:{lat:1},fn,n:1,ignored:()=>1})).toBe(false);
 });
});

describe('useStableHandlers',()=>{
 it('returns a frozen object with the same keys whose wrappers forward arguments to the handlers of the render',()=>{
  const calls:string[]=[];let stable:{a:(x:number)=>number;b:()=>string}|null=null;
  function Probe(){stable=useStableHandlers({a:(x:number)=>{calls.push('a'+x);return x*2;},b:()=>{calls.push('b');return 'ok';}});return null;}
  renderToString(createElement(Probe));
  const s=stable!;
  expect(Object.isFrozen(s)).toBe(true);expect(Object.keys(s)).toEqual(['a','b']);
  expect(s.a(21)).toBe(42);expect(s.b()).toBe('ok');expect(calls).toEqual(['a21','b']);
  expect(s.a).toBe(s.a);// a property read never builds a new wrapper
 });
});
