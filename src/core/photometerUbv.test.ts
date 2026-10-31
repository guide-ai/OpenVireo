import {describe,it,expect} from 'vitest';
import {createPhotometer,photometerEvent as step,releasePhotometer,photometerColor,type PhotometerState} from './photometer';
import {type PhotometerFilter} from './photometerUbvField';
const complete=(s:PhotometerState)=>step(step(s,{type:'start'}),{type:'complete'});
function readBand(s:PhotometerState,filter:PhotometerFilter){if(s.filter!==filter)s=step(s,{type:'filter',filter});s=step(s,{type:'point',kind:'sky'});s=complete(s);s=step(s,{type:'point',kind:'object'});return complete(s);}
function bands(){let s=step(createPhotometer(42),{type:'activate'});s=readBand(s,'V');s=step(s,{type:'record',readingId:2,value:8.1,note:'V entered manually'});s=readBand(s,'B');return step(s,{type:'record',readingId:4,value:9.2,note:'B entered manually'});}
describe('per-filter skies and confirmed acquired B−V',()=>{
 it('switching filter invalidates current reading and gates only the active bank, without consuming seed',()=>{
  let s=readBand(step(createPhotometer(42),{type:'activate'}),'V'),seed=s.seed;s=step(s,{type:'filter',filter:'B'});expect(s.current).toBeNull();expect(s.seed).toBe(seed);expect(s.sky).toBeNull();expect(s.skies.V?.id).toBe(1);expect(()=>step(s,{type:'start'})).toThrow('sky');
  s=step(s,{type:'filter',filter:'V'});expect(s.sky?.id).toBe(1);expect(step(s,{type:'start'}).phase).toBe('running');
 });
 it('blocks filter changes during a callback; Stop then change keeps old banks but never fabricates a reading',()=>{
  let s=step(step(createPhotometer(42),{type:'activate'}),{type:'start'});expect(()=>step(s,{type:'filter',filter:'B'})).toThrow();s=step(step(s,{type:'stop'}),{type:'filter',filter:'B'});expect(s.seed).toBe(42);expect(s.current).toBeNull();expect(s.readings).toEqual([]);expect(s.sky).toBeNull();
 });
 it('binds each object to its own filter sky and clears all banks on context release/reentry',()=>{
  let s=bands();s=readBand(s,'U');expect(s.readings.filter(r=>r.kind==='object').map(r=>[r.filter,r.skyReadingId,r.callback.totalPhotonCount])).toEqual([['V',1,552],['B',3,331],['U',5,354]]);expect([s.skies.U,s.skies.B,s.skies.V].every(Boolean)).toBe(true);expect([s.skies.R,s.skies.I]).toEqual([null,null]);s=releasePhotometer(s);expect(s.skies).toEqual({U:null,B:null,V:null,R:null,I:null});s=step(s,{type:'activate'});expect(s.filter).toBe('U');s=step(s,{type:'point',kind:'object'});expect(()=>step(s,{type:'start'})).toThrow('sky');
 });
 it('calculates acquired and manual colors separately from an explicit confirmed same-target B/V pair',()=>{
  const s=bands(),color=photometerColor(s,4,2);expect(color.acquired).toBeCloseTo(.559889252254527,12);expect(color.transcribed).toBeCloseTo(1.1,12);expect(color.targetId).toBe('N2230.DAT@145877');expect(s.color).toBeNull();expect(step(s,{type:'color',bReadingId:4,vReadingId:2}).color).toEqual(color);
 });
 it('rejects unconfirmed, sky, wrong-filter or foreign-target pairs rather than using catalog color',()=>{
  const s=bands();expect(()=>photometerColor({...s,entries:s.entries.slice(0,1)},4,2)).toThrow();for(const [b,v] of [[2,4],[3,2],[4,1],[99,2]])expect(()=>photometerColor(s,b,v)).toThrow();const changed={...s,readings:s.readings.map(r=>r.id===4?{...r,targetId:'another-target'}:r)};expect(()=>photometerColor(changed,4,2)).toThrow();
 });
 it('retains an explicitly identified historical pair across filter changes and release without selecting newer rows',()=>{
  let s=step(bands(),{type:'color',bReadingId:4,vReadingId:2}),color=s.color;s=step(s,{type:'filter',filter:'U'});expect(s.current).toBeNull();expect(s.color).toEqual(color);s=releasePhotometer(s);expect(photometerColor(s,4,2)).toEqual(color);expect(createPhotometer(42).color).toBeNull();
 });
});
