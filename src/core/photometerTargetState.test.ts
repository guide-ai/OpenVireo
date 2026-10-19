import {describe,it,expect} from 'vitest';
import vectors from '../../data/photometry/pleiades-target-vectors.json';
import {createPhotometer,photometerEvent as step,releasePhotometer,photometerColor,type PhotometerState} from './photometer';
const A='N2230.DAT@145877',B='N2230.DAT@144496',C='N2230.DAT@147993';
const complete=(s:PhotometerState)=>step(step(s,{type:'start'}),{type:'complete'});
function original(){let s=step(createPhotometer(42),{type:'activate'});s=complete(s);s=step(s,{type:'point',kind:'object'});s=complete(s);s=step(s,{type:'record',readingId:2,value:9.647,note:'A V'});s=step(s,{type:'filter',filter:'B'});s=step(s,{type:'point',kind:'sky'});s=complete(s);s=step(s,{type:'point',kind:'object'});s=complete(s);s=step(s,{type:'record',readingId:4,value:10.207,note:'A B'});return step(s,{type:'color',bReadingId:4,vReadingId:2});}
describe('target-separated observation journals, colors and filter sky references',()=>{
 it('target selection navigates its object field and invalidates current result without reseeding or clearing valid filter sky',()=>{
  const a=original(),b=step(a,{type:'target',targetId:B});expect(b.targetId).toBe(B);expect(b.pointing).toBe('object');expect(b.current).toBeNull();expect(b.seed).toBe(a.seed);expect(b.sky?.id).toBe(3);expect(b.sky?.fieldTargetId).toBe(A);expect(b.color).toBeNull();expect(b.entries).toEqual(a.entries);expect(()=>step(b,{type:'record',readingId:4,value:10,note:''})).toThrow();
  const acquired=complete(b);expect(acquired.current?.targetId).toBe(B);expect(acquired.current?.fieldTargetId).toBe(B);expect(acquired.current?.skyReadingId).toBe(3);expect(acquired.current?.callback.totalPhotonCount).toBe(200);
 });
 it('blocks an unsupported target and any slew during integration; missing/current-context sky remains required',()=>{
  let s=step(createPhotometer(42),{type:'activate'});expect(()=>step(s,{type:'target',targetId:'N2230.DAT@99'})).toThrow();s=step(s,{type:'target',targetId:B});expect(()=>step(s,{type:'start'})).toThrow('sky');s=step(s,{type:'point',kind:'sky'});s=step(s,{type:'start'});expect(()=>step(s,{type:'target',targetId:C})).toThrow();
 });
 it('prevents cross-object B/V pairs, keeps confirmed colors by object and restores only the selected object’s pair',()=>{
  let s=step(original(),{type:'target',targetId:B});s=complete(s);s=step(s,{type:'record',readingId:5,value:10.758,note:'B B'});expect(()=>photometerColor(s,5,2)).toThrow();expect(()=>step(s,{type:'color',bReadingId:4,vReadingId:2})).toThrow();s=step(s,{type:'filter',filter:'V'});s=complete(s);s=step(s,{type:'record',readingId:6,value:8.996,note:'B V'});s=step(s,{type:'color',bReadingId:5,vReadingId:6});const bColor=s.color;expect(bColor?.targetId).toBe(B);expect(Object.keys(s.colors).sort()).toEqual([A,B].sort());s=step(s,{type:'target',targetId:A});expect(s.color?.targetId).toBe(A);expect(s.color?.bReadingId).toBe(4);s=step(s,{type:'target',targetId:B});expect(s.color).toEqual(bColor);
 });
 it('matches independent shared-sky counts across three object slews, keeping every original sky and object identity',()=>{
  let s=step(createPhotometer(42),{type:'activate'});
  for(const v of vectors.sharedSkySequence){if(s.targetId!==v.targetId)s=step(s,{type:'target',targetId:v.targetId});if(s.filter!==v.filter)s=step(s,{type:'filter',filter:v.filter as 'V'|'B'});if(s.pointing!==v.kind)s=step(s,{type:'point',kind:v.kind as 'object'|'sky'});s=complete(s);for(const key of ['sourceCount','skyCount','totalPhotonCount','seed','draws']as const)expect(s.current?.callback[key]).toBe(v.callback[key]);if(v.magnitude!==null)expect(s.current?.reduction?.magnitude).toBeCloseTo(Number(v.magnitude),12);}
  expect(s.readings.filter(r=>r.kind==='sky').map(r=>r.fieldTargetId)).toEqual([A,A]);expect(s.readings.filter(r=>r.kind==='object').map(r=>r.targetId)).toEqual([A,A,B,B,C,C]);
 });
 it('release invalidates all skies for all targets, while historical object entries and pairs remain intact',()=>{
  let s=step(original(),{type:'target',targetId:C});s=releasePhotometer(s);expect(s.skies).toEqual({U:null,B:null,V:null});expect(s.colors[A]?.bReadingId).toBe(4);s=step(s,{type:'activate'});expect(s.targetId).toBe(C);s=step(s,{type:'point',kind:'object'});expect(()=>step(s,{type:'start'})).toThrow('sky');s=step(s,{type:'target',targetId:A});expect(s.color?.targetId).toBe(A);expect(()=>step(s,{type:'start'})).toThrow('sky');
 });
});
