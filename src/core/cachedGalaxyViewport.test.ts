import {describe,it,expect} from 'vitest';
import provenance from '../../data/hubble/corbor-cached-provenance.json';
import {CachedViewportError,cachedPanViewport,initializeFieldCache} from './cachedGalaxyViewport';
const code=(f:()=>unknown)=>{try{f();return 'ok';}catch(e){return e instanceof CachedViewportError?e.code:'other';}};
const config='record0|15\'|x3|nearest-center-stretch-v1',cache=initializeFieldCache(312,3,config),same={needsRefresh:false,configuration:config};
describe('recovered cached-pan viewport branch (0x53c198, 0x53c9d4, 0x53a6ca, guard 0x53af28, CopyRect 0x53a845)',()=>{
 it('initializes the recorded cache: 936 frame, anchor 468, fresh origin 312',()=>{
  expect(cache).toMatchObject({width:936,height:936,viewport:312,multiplier:3,anchor:{x:468,y:468},origin:{x:312,y:312}});
  const k=provenance.cache;expect([k.width,k.height,k.anchor.x,k.anchor.y,k.origin.x,k.origin.y,k.guardExclusiveMaximum,k.slitQueryOffset]).toEqual([cache.width,cache.height,cache.anchor.x,cache.anchor.y,cache.origin.x,cache.origin.y,(cache.multiplier-1)*cache.viewport,cache.viewport/2]);
  for(const bad of [()=>initializeFieldCache(311,3,config),()=>initializeFieldCache(312,1,config),()=>initializeFieldCache(312,3,''),()=>initializeFieldCache(0,3,config)])expect(code(bad)).toBe('cache');
 });
 it('the unpanned pointing reproduces the fresh crop and its slit query',()=>{
  const p=cachedPanViewport(cache,{x:468,y:468},same);expect(p.rect).toEqual({left:312,top:312,right:624,bottom:624});expect(p.query).toEqual({x:468,y:468});expect(p.offset).toEqual({x:0,y:0});
 });
 it('rounds nearest-even AFTER the strict guard on unrounded values; both exclusive edges are rejected',()=>{
  // left = 312 − (468 − x) = x − 156.
  expect(cachedPanViewport(cache,{x:156.5,y:468},same).rect.left).toBe(0);
  expect(cachedPanViewport(cache,{x:157.5,y:468},same).rect.left).toBe(2);
  expect(cachedPanViewport(cache,{x:779.5,y:468},same).rect).toMatchObject({left:624,right:936});
  for(const x of [156,155.999,780,780.001])expect(code(()=>cachedPanViewport(cache,{x,y:468},same))).toBe('guard');
  for(const y of [156,780])expect(code(()=>cachedPanViewport(cache,{x:468,y},same))).toBe('guard');
  expect(cachedPanViewport(cache,{x:156.000001,y:779.999999},same).rect).toEqual({left:0,top:624,right:312,bottom:936});
 });
 it('only the same configuration without a forced refresh may reuse the cache; nothing else is filled or recentred',()=>{
  expect(code(()=>cachedPanViewport(cache,{x:468,y:447.2},{needsRefresh:true,configuration:config}))).toBe('refresh');
  expect(code(()=>cachedPanViewport(cache,{x:468,y:447.2},{needsRefresh:false,configuration:'record1|15\'|x3|nearest-center-stretch-v1'}))).toBe('configuration');
  for(const p of [{x:NaN,y:468},{x:468,y:Infinity}])expect(code(()=>cachedPanViewport(cache,p,same))).toBe('pointing');
 });
 it('gate rectangles and slit queries for 54875 and 54891 follow from their projected exact centres',()=>{
  for(const t of provenance.targets){const p=cachedPanViewport(cache,{x:t.anchor.x+.2,y:t.anchor.y+.05},same);expect(p.rect).toEqual(t.rect);expect(p.query).toEqual(t.anchor);expect(p.query.x-p.rect.left).toBe(156);}
 });
});
