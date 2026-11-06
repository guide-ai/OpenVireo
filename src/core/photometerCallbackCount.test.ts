import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import contract from '../../data/photometry/callback-count-contract.json';
import provenance from '../../data/photometry/integration-provenance.json';
import {x87PhotometerCallbacksPerPeriod} from './photometerCallbackCount';
import {photometerCallbacksPerPeriod,COMPILED_PHOTOMETER_PARAMETERS,type PhotometerParameters} from './instrumentParameters';
import {photometerTiming,requiredPhotometerCallbacks,PHOTOMETER_SECONDS} from './photometerIntegration';
import {createPhotometer,photometerEvent as event,photometerCallbackCountMatters,releasePhotometer,replayPhotometer,type PhotometerEvent,type PhotometerState} from './photometer';
import {CALLBACK_COUNT_CONTRACT_SHA256,CALLBACK_COUNT_PHOTOMETER_POLICY,photometerJournalVersion,photometerJournalText} from './photometerJournal';
import {parsePhotometerSession,serializePhotometerSession} from '../io/photometerSession';
import {photometerMaximumCallbacks,photometerParameterExclusion,type PhotometerFilter} from './photometerUbvField';
import {PLEIADES_PHOTOMETER_TARGETS} from './photometerField';
import {photometerTelescopeTargets} from './photometerTelescope';
import reference from '../../data/photometry/callback-count-reference.json';

const sha=(p:string)=>createHash('sha256').update(readFileSync(new URL(p,import.meta.url))).digest('hex');
const ties=new Map(contract.tieUndercounts.map(r=>[`${r.seconds}:${r.timerMs}`,r]));
const label=(s:number)=>s===.1?'0.1':String(s);
/** Front PHCALLBACK: the owner 4–17 path, a history without 'callbackCount', replayed one event at a time. */
const legacyEvent=(s:PhotometerState,e:PhotometerEvent)=>replayPhotometer(s.seedAtStart,[...s.events,e]);

describe('Front PHCALLBACK: VIREO\'s Extended elapsed period count',()=>{
 it('pins the contract and its seconds table, which equals the integration contract\'s Extended fractions',()=>{
  expect(sha('../../data/photometry/callback-count-contract.json')).toBe(CALLBACK_COUNT_CONTRACT_SHA256);
  expect(CALLBACK_COUNT_PHOTOMETER_POLICY).toBe(contract.browserPolicy.ownerPolicy);
  expect(contract.numerics).toMatchObject({controlWord:'0x1332',address:'0x5ae024',precisionBits:64,rounding:'nearest-even'});
  expect(contract.secondsTable.map(e=>e.address)).toEqual(provenance.secondsTable.map(e=>e.address));
  for(const [i,e] of contract.secondsTable.entries()){
   const b=Buffer.from(e.bytes,'hex'),m=b.readBigUInt64LE(0),ex=b.readUInt16LE(8)-16383-63,[num,den]=provenance.secondsTable[i]!.fraction.split('/').map(BigInt);
   expect(createHash('sha256').update(b).digest('hex')).toBe(provenance.secondsTable[i]!.sha256);
   // m·2^ex = num/den
   expect(ex>=0?m<<BigInt(ex)===num!*(1n):m*(den??1n)===num!<<BigInt(-ex)).toBe(true);
  }
 });
 it('reproduces the independent witnesses\' 40000-row table byte for byte (Timer 1..10000 × 0.1/1/10/100 s)',()=>{
  const lines=['seconds,timerMs,callbacks'];
  for(const s of PHOTOMETER_SECONDS)for(let t=1;t<=10000;t++){
   const n=x87PhotometerCallbacksPerPeriod(s,t),nominal=Math.ceil(Math.round(s*1000)/t),tie=ties.get(`${s}:${t}`);
   expect(n).toBe(tie?tie.callbacks:nominal);if(tie)expect(tie.nominal).toBe(nominal);
   lines.push(`${label(s)},${t},${n}`);
  }
  expect(createHash('sha256').update(lines.join('\n')+'\n').digest('hex')).toBe(contract.witnesses.fullTableSHA256);
 },60000);
 it('the compiled 100 ms: 100 s takes 1001 callbacks, 0.1/1/10 s are unchanged; the instructor ties are one more than ⌈1000·s/T⌉',()=>{
  expect(PHOTOMETER_SECONDS.map(s=>photometerCallbacksPerPeriod(s,100,true))).toEqual([1,10,100,1001]);
  expect(PHOTOMETER_SECONDS.map(s=>photometerCallbacksPerPeriod(s,100))).toEqual([1,10,100,1000]);
  expect(requiredPhotometerCallbacks(photometerTiming(100,5),100,true)).toBe(5005);expect(requiredPhotometerCallbacks(photometerTiming(100,5))).toBe(5000);
  expect(contract.tieUndercounts).toHaveLength(18);
  for(const r of contract.tieUndercounts){expect(photometerCallbacksPerPeriod(r.seconds,r.timerMs,true)).toBe(r.callbacks);expect(photometerCallbacksPerPeriod(r.seconds,r.timerMs)).toBe(r.nominal);}
  expect(()=>x87PhotometerCallbacksPerPeriod(2,100)).toThrow(RangeError);expect(()=>x87PhotometerCallbacksPerPeriod(1,0)).toThrow(RangeError);expect(()=>x87PhotometerCallbacksPerPeriod(1,10001)).toThrow(RangeError);
 });
 it('the full-domain count guard uses 5 × the exact 100 s period and no bundled target\'s decision changes',()=>{
  expect(photometerMaximumCallbacks()).toBe(5000);expect(photometerMaximumCallbacks(undefined,true)).toBe(5005);
  expect(photometerMaximumCallbacks({...COMPILED_PHOTOMETER_PARAMETERS,timerMs:20},true)).toBe(25005);expect(photometerMaximumCallbacks({...COMPILED_PHOTOMETER_PARAMETERS,timerMs:20})).toBe(25000);
  for(const telescope of [0,1,2] as const)for(const t of photometerTelescopeTargets(telescope))
   expect(photometerParameterExclusion(t.catalogId,telescope,COMPILED_PHOTOMETER_PARAMETERS,true)).toBe(photometerParameterExclusion(t.catalogId,telescope,COMPILED_PHOTOMETER_PARAMETERS,false));
  expect(PLEIADES_PHOTOMETER_TARGETS).toHaveLength(24);
 });
});

/** One sky + object pair at the reference's settings, through `step` (live: exact; legacy: nominal). */
function pair(step:(s:PhotometerState,e:PhotometerEvent)=>PhotometerState,c:typeof reference.results[number]['case']){
 let s=event(createPhotometer(c.seed),{type:'activate'});
 s=event(event(s,{type:'target',targetId:c.targetId}),{type:'filter',filter:c.filter as PhotometerFilter});
 for(const [kind,[seconds,integrations]] of [['sky',c.sky],['object',c.object]] as const){
  s=event(event(s,{type:'point',kind}),{type:'timing',secondsPerIntegration:seconds,integrations});s=step(s,{type:'start'});
  let left=requiredPhotometerCallbacks(s.timing!,100,s.work!.exactCallbacks===true);while(left>0){const n=Math.min(left,5000);s=step(s,{type:'advance',callbacks:n});left-=n;}
 }
 return s;
}
describe('Front PHCALLBACK: sessions',()=>{
 it.each(reference.results)('new sessions count 1001 callbacks per 100 s (independent exact reference) and legacy replay keeps 1000: $case.targetId $case.filter',r=>{
  const exact=pair(event,r.case),legacy=pair(legacyEvent,r.case);
  for(const [s,ref] of [[exact,r.exact],[legacy,r.nominal]] as const){
   const object=s.current!,sky=s.readings.find(x=>x.id===object.skyReadingId)!;
   expect(sky.callback).toMatchObject({totalPhotonCount:ref.sky.totalPhotonCount,seed:ref.sky.seed,draws:ref.sky.draws,nativeBaseCountSum:ref.sky.nativeBaseCountSum});
   expect(object.callback).toMatchObject({sourceCount:ref.object.sourceCount,skyCount:ref.object.skyCount,totalPhotonCount:ref.object.totalPhotonCount,seed:ref.object.seed,draws:ref.object.draws,nativeBaseCountSum:ref.object.nativeBaseCountSum});
   expect(object.integration).toMatchObject({callbacks:ref.object.callbacks,periodCounts:ref.object.periodCounts});
   expect(object.reduction!.magnitude).toBeCloseTo(Number(ref.magnitudeDecimal),8);
  }
  expect(exact.callbackCount).toBe('x87');expect(legacy.callbackCount).toBeUndefined();
  expect(exact.events.filter(e=>e.type==='callbackCount')).toHaveLength(1);expect(exact.events[exact.events.findIndex(e=>e.type==='callbackCount')+1]?.type).toBe('start');
  expect(photometerJournalVersion(exact.events)).toBe(18);expect(photometerJournalVersion(legacy.events)).toBe(4);
  // Owner 18 writes and reads back, header pinning the contract; owner 4 stays byte-identical through its own writer.
  const e=releasePhotometer(exact),l=releasePhotometer(legacy),et=serializePhotometerSession(e),lt=serializePhotometerSession(l);
  expect(JSON.parse(et)).toMatchObject({version:18,policy:CALLBACK_COUNT_PHOTOMETER_POLICY,callbackCountContractSHA256:CALLBACK_COUNT_CONTRACT_SHA256});
  expect(JSON.parse(lt).version).toBe(4);expect(JSON.parse(lt).callbackCountContractSHA256).toBeUndefined();
  expect(parsePhotometerSession(JSON.parse(et))).toEqual(e);expect(parsePhotometerSession(JSON.parse(lt))).toEqual(l);
  expect(serializePhotometerSession(parsePhotometerSession(JSON.parse(lt)))).toBe(lt);expect(photometerJournalText(l.seedAtStart,l.events)).toBe(lt);
 });
 it('a 100 s period ends on the 1001st callback, whose photons and base count are counted; the reduction still divides by 100 s',()=>{
  let s=event(event(createPhotometer(42),{type:'activate'}),{type:'timing',secondsPerIntegration:100,integrations:1});s=event(s,{type:'start'});
  expect(s.work!.exactCallbacks).toBe(true);s=event(s,{type:'advance',callbacks:1000});expect(s.phase).toBe('running');expect(s.current).toBeNull();
  const before=s.work!.totalPhotonCount;s=event(s,{type:'advance',callbacks:1});expect(s.phase).toBe('complete');
  expect(s.current!.integration).toMatchObject({callbacks:1001,periodCounts:[s.current!.callback.totalPhotonCount]});expect(s.current!.callback.totalPhotonCount).toBeGreaterThan(before);
  expect(s.current!.callback.nativeBaseCountSum).toBe(1001000);expect(()=>event(s,{type:'advance',callbacks:1})).toThrow();
 });
 it('settings where both rules agree record nothing new: the history and its owner are byte-identical to before',()=>{
  for(const seconds of [.1,1,10]){let s=event(event(createPhotometer(42),{type:'activate'}),{type:'timing',secondsPerIntegration:seconds,integrations:2});
   expect(photometerCallbackCountMatters(s)).toBe(false);s=event(s,{type:'start'});expect(s.events.some(e=>e.type==='callbackCount')).toBe(false);expect(s.work!.exactCallbacks).toBeUndefined();
   s=event(s,{type:'advance',callbacks:requiredPhotometerCallbacks(s.timing!)});expect(s.phase).toBe('complete');expect(photometerJournalVersion(releasePhotometer(s).events)).toBe(4);}
 });
 it('instructor Timer ties: Timer 10 ms at 1 s takes 101 callbacks in a new session (owner 18) and 100 in an owner 17 history',()=>{
  const p:PhotometerParameters={...COMPILED_PHOTOMETER_PARAMETERS,timerMs:10};
  const base=event(event(event(createPhotometer(9),{type:'activate'}),{type:'timing',secondsPerIntegration:1,integrations:1}),{type:'parameters',...p});
  const run=(step:typeof event)=>{let s=step(base,{type:'start'});const n=requiredPhotometerCallbacks(s.timing!,10,s.work!.exactCallbacks===true);s=step(s,{type:'advance',callbacks:n});return s;};
  const exact=run(event),legacy=run(legacyEvent);
  expect(exact.current!.integration!.callbacks).toBe(101);expect(legacy.current!.integration!.callbacks).toBe(100);
  expect(exact.current!.callback.nativeBaseCountSum).toBe(101000);expect(photometerJournalVersion(exact.events)).toBe(18);expect(photometerJournalVersion(legacy.events)).toBe(17);
  // Timer 300 ms (T6 review L4) is not a tie: unchanged, no event.
  const p3=event(event(event(createPhotometer(9),{type:'activate'}),{type:'timing',secondsPerIntegration:1,integrations:1}),{type:'parameters',...p,timerMs:300});
  expect(photometerCallbackCountMatters(p3)).toBe(false);expect(requiredPhotometerCallbacks(p3.timing!,300,true)).toBe(4);
 });
 it('strict replay refuses a repeated, running or untimed declaration; the declaration is atomic with its Start',()=>{
  const timed=event(event(createPhotometer(42),{type:'activate'}),{type:'timing',secondsPerIntegration:100,integrations:1});
  const s=event(timed,{type:'start'});const i=s.events.findIndex(e=>e.type==='callbackCount');expect(i).toBeGreaterThan(0);
  expect(()=>replayPhotometer(42,[...s.events.slice(0,i+1),{type:'callbackCount'},...s.events.slice(i+1)])).toThrow();
  expect(()=>replayPhotometer(42,[...s.events,{type:'callbackCount'}])).toThrow();
  expect(()=>replayPhotometer(42,[{type:'activate'},{type:'callbackCount'}])).toThrow();
  expect(()=>replayPhotometer(42,[...s.events.slice(0,i),{type:'callbackCount',x:1} as unknown as PhotometerEvent])).toThrow();
  // A refused Start (sky missing for an object reading) records no declaration.
  const object=event(timed,{type:'point',kind:'object'});expect(()=>event(object,{type:'start'})).toThrow();expect(object.events.some(e=>e.type==='callbackCount')).toBe(false);
  // After the declaration, later Starts need no new event.
  let t=event(s,{type:'advance',callbacks:1001});t=event(t,{type:'start'});expect(t.events.filter(e=>e.type==='callbackCount')).toHaveLength(1);expect(t.work!.exactCallbacks).toBe(true);
 });
});
