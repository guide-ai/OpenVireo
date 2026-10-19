import {describe,it,expect} from 'vitest';
import {createPhotometer,photometerEvent as step,releasePhotometer,replayPhotometer,MAX_PHOTOMETER_EVENTS,type PhotometerEvent} from './photometer';
const sky=()=>{let s=step(createPhotometer(42),{type:'activate'});s=step(s,{type:'start'});return step(s,{type:'complete'});};
const object=()=>{let s=step(sky(),{type:'point',kind:'object'});s=step(s,{type:'start'});return step(s,{type:'complete'});};
describe('fixed V photometer observing transitions',()=>{
 it('requires activation and fresh sky before an object integration',()=>{
  expect(()=>step(createPhotometer(42),{type:'start'})).toThrow();let s=step(createPhotometer(42),{type:'activate'});s=step(s,{type:'point',kind:'object'});expect(()=>step(s,{type:'start'})).toThrow('sky');
 });
 it('links independent known seed42 sky and target counts to their actual sky reading',()=>{
  const s=object();expect(s.readings.map(r=>r.callback.totalPhotonCount)).toEqual([1,552]);expect(s.current?.skyReadingId).toBe(1);expect(s.current?.reduction?.magnitude).toBeCloseTo(9.647121002870538,12);expect(s.seed).toBe(1705058);
 });
 it('Stop before the one callback consumes no random state and cannot fabricate completion; Start restarts',()=>{
  let s=step(createPhotometer(42),{type:'activate'});s=step(s,{type:'start'});const stopped=step(s,{type:'stop'});expect(stopped.seed).toBe(42);expect(stopped.current).toBeNull();expect(stopped.readings).toEqual([]);expect(()=>step(stopped,{type:'complete'})).toThrow();
  s=step(step(stopped,{type:'start'}),{type:'complete'});expect(s.current?.callback.totalPhotonCount).toBe(1);expect(s.seed).toBe(sky().seed);
 });
 it('release/reentry retains the audit trail and seed but invalidates sky including a return to telescope0',()=>{
  const acquired=object(),released=releasePhotometer(acquired);expect(released.sky).toBeNull();expect(released.seed).toBe(acquired.seed);expect(released.readings).toEqual(acquired.readings);expect(releasePhotometer(released)).toBe(released);
  let s=step(released,{type:'activate'});expect(s.current).toBeNull();s=step(s,{type:'point',kind:'object'});expect(()=>step(s,{type:'start'})).toThrow('sky');
 });
 it('refreshing sky replaces the sky link; stop/restart retains the last completed sky',()=>{
  let s=sky();s=step(s,{type:'start'});s=step(s,{type:'stop'});expect(s.sky?.id).toBe(1);s=step(step(s,{type:'start'}),{type:'complete'});expect(s.sky?.id).toBe(2);s=step(s,{type:'point',kind:'object'});s=step(step(s,{type:'start'}),{type:'complete'});expect(s.current?.skyReadingId).toBe(2);
 });
 it('manual notebook keeps the supplied transcription rather than catalog/computed answers and rejects duplicates',()=>{
  const s=object(),recorded=step(s,{type:'record',readingId:2,value:8.125,note:'Manual <b>text</b>'});expect(recorded.entries).toEqual([{readingId:2,value:8.125,note:'Manual <b>text</b>'}]);expect(recorded.current?.reduction).toEqual(s.current?.reduction);expect(s.entries).toEqual([]);expect(()=>step(recorded,{type:'record',readingId:2,value:9,note:''})).toThrow();expect(()=>step(s,{type:'record',readingId:1,value:9,note:''})).toThrow();
 });
 it('rejects invalid records, unsupported event payloads and changes while running',()=>{
  const s=object();for(const e of [{type:'record',readingId:2,value:NaN,note:''},{type:'record',readingId:2,value:9,note:'x'.repeat(501)},{type:'point',kind:'other'},{type:'start',counts:99},null])expect(()=>step(s,e as PhotometerEvent)).toThrow();
  const running=step(s,{type:'start'});expect(()=>step(running,{type:'point',kind:'sky'})).toThrow();expect(()=>step(running,{type:'record',readingId:2,value:9,note:''})).toThrow();
 });
 it('replays the immutable event journal and reserves capacity for safe Stop/release at the limit',()=>{
  const s=object();expect(replayPhotometer(42,s.events)).toEqual(s);expect(Object.isFrozen(s.current)).toBe(true);let busy=step(createPhotometer(1),{type:'activate'});
  while(busy.events.length<MAX_PHOTOMETER_EVENTS-3)busy=step(busy,{type:'point',kind:busy.pointing==='sky'?'object':'sky'});
  expect(()=>step(busy,{type:'start'})).toThrow('limit');expect(releasePhotometer(busy).armed).toBe(false);expect(()=>replayPhotometer(1,Array(MAX_PHOTOMETER_EVENTS+1).fill({type:'stop'}))).toThrow();
 });
});
