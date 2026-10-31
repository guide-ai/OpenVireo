import {describe,expect,it} from 'vitest';
import {createPhotometer,photometerEvent as step,photometerStructReading,releasePhotometer,replayPhotometer,type PhotometerEvent,type PhotometerState} from './photometer';
import {photometerNativeApply,photometerNativeData,photometerNativeMerge,photometerStructRecordable,photometerStructUnrecorded,type PhotometerNativeRecordEvent} from './photometerNativeRecord';
import {photometerJournalVersion} from './photometerJournal';
import {pleiadesExerciseSummary} from './pleiadesLab';
import {observationalDataFields} from './clusterNativeHrSelect';
import {recordedResultsLines} from './recordedResults';
import {clusterNativeHrPlot} from './clusterNativeObservationHr';
import {parsePhotometerSession,serializePhotometerSession} from '../io/photometerSession';
import {parseObservationType} from './observationResults';

// Front P3 (analysis/front-p3/RESEARCH.md §2–§4): VIREO's Record/Review over the reading struct, through 0x54a73c.
const complete=(s:PhotometerState)=>step(step(s,{type:'start'}),{type:'complete'});
function band(s:PhotometerState,filter:'B'|'V'){if(s.filter!==filter)s=step(s,{type:'filter',filter});s=complete(step(s,{type:'point',kind:'sky'}));return complete(step(s,{type:'point',kind:'object'}));}
const input={id:'HII 1234',jd:2455000.25,ra:3.75,dec:24.1,timeDependent:false};
const rec=(s:PhotometerState,ok:boolean,over:Partial<PhotometerNativeRecordEvent>={}):PhotometerState=>step(s,{type:'nativeRecord',readingId:photometerStructReading(s)!.id,...input,ok,remarks:'',spectralCode:0,...over});

describe('photometer reading struct (Start 0x4fffd4, completion 0x5016bf)',()=>{
 it('one slot per Start; a sky reading is not recordable; Start resets the struct; activation starts a new context [W]',()=>{
  let s=step(createPhotometer(42),{type:'activate'});s=complete(s);
  expect(photometerStructReading(s)?.kind).toBe('sky');expect(photometerStructRecordable(photometerStructReading(s),s.native)).toBe(false);
  s=complete(step(s,{type:'point',kind:'object'}));const r=photometerStructReading(s)!;
  expect(r.kind).toBe('object');expect(photometerStructUnrecorded(r,s.native)).toBe(true);
  const m=photometerNativeMerge(s.native,r,input);expect(m.rows[0]!.bands).toEqual([0,0,r.reduction!.magnitude,0,0]);
  expect(photometerStructReading(step(s,{type:'filter',filter:'B'}))?.id).toBe(r.id);
  expect(photometerStructReading(step(s,{type:'start'}))).toBeNull();
  expect(photometerStructReading(step(releasePhotometer(s),{type:'activate'}))).toBeNull();
 });
});

describe('Record/Review with Time-Dependent Data off and on (0x54a76f)',()=>{
 it('off: B then V of one star merge into one row; OK stores remarks and Sp; OK disables Record',()=>{
  let s=step(createPhotometer(42),{type:'activate'});s=band(s,'B');
  s=rec(s,true,{remarks:'first',spectralCode:parseObservationType('B8V')});
  expect(photometerStructRecordable(photometerStructReading(s),s.native)).toBe(false);
  expect(()=>rec(s,true)).toThrow('entry');
  s=band(s,'V');s=rec(s,true,{jd:2455001,ra:9,dec:9,remarks:'second'});
  expect(s.native!.rows).toHaveLength(1);const row=s.native!.rows[0]!;
  expect(row).toMatchObject({id:'HII 1234',time:2455000.25,ra:3.75,dec:24.1,kind:1,remarks:'second',spectralCode:0});
  expect(row.bands[1]).toBe(s.readings.find(r=>r.filter==='B'&&r.kind==='object')!.reduction!.magnitude);
  expect(row.bands[2]).toBe(s.readings.find(r=>r.filter==='V'&&r.kind==='object')!.reduction!.magnitude);
 });
 it('review 1 L1: a zero-magnitude reading is not unrecorded until its Record/Review is cancelled (0x501fab sets the flag regardless of the slot)',()=>{
  const zero={id:7,kind:'object' as const,filter:'V' as const,reduction:{status:'unavailable'}};
  const input={id:'UNKNOWN',jd:2451545,ra:3.79,dec:24.1,timeDependent:false};
  expect(photometerStructUnrecorded(zero,undefined)).toBe(false);
  const cancelled=photometerNativeApply(undefined,zero,{type:'nativeRecord',readingId:7,...input,ok:false,remarks:'',spectralCode:0} as PhotometerNativeRecordEvent);
  expect(cancelled.cancelled).toEqual([7]);expect(photometerStructUnrecorded(zero,cancelled)).toBe(true);
  const ok=photometerNativeApply(undefined,zero,{type:'nativeRecord',readingId:7,...input,ok:true,remarks:'',spectralCode:0} as PhotometerNativeRecordEvent);
  expect(ok).not.toHaveProperty('cancelled');expect(photometerStructUnrecorded(zero,ok)).toBe(false);
 });
 it('Cancel follows VIREO: the band stays, remarks and Sp are dropped, Record stays enabled; a re-Record with the option on duplicates the row',()=>{
  let s=band(step(createPhotometer(42),{type:'activate'}),'V');
  s=rec(s,false);
  expect(s.native!.rows).toHaveLength(1);expect(s.native!.rows[0]!.bands[2]).not.toBe(0);expect(s.native!.rows[0]!.remarks).toBe('');
  expect(photometerStructUnrecorded(photometerStructReading(s),s.native)).toBe(true);
  expect(()=>rec(s,false,{remarks:'typed'})).toThrow();
  expect(rec(s,false).native!.rows).toHaveLength(1);
  const dup=rec(s,true,{timeDependent:true,remarks:'again'});
  expect(dup.native!.rows.map(r=>r.remarks)).toEqual(['','again']);expect(dup.native!.rows[1]!.bands).toEqual(dup.native!.rows[0]!.bands);
 });
 it('rejects a record of another reading, while running, or with invalid text',()=>{
  const s=band(step(createPhotometer(42),{type:'activate'}),'V'),id=photometerStructReading(s)!.id;
  for(const e of [{readingId:id-1},{id:''},{id:'x'.repeat(16)},{remarks:'x'.repeat(37)},{jd:NaN},{ra:24},{spectralCode:-1}])expect(()=>rec(s,true,e)).toThrow();
  expect(()=>rec(step(s,{type:'start'}),true,{readingId:id})).toThrow();
 });
});

describe('owner 15, older owners and E04',()=>{
 it('a native record makes the journal owner 15 and round-trips byte-identically; the E04 counts do not move',()=>{
  let s=step(createPhotometer(42),{type:'activate'});s=band(s,'B');s=band(s,'V');
  const before=releasePhotometer(s);expect(photometerJournalVersion(before.events)).toBeLessThan(15);
  const recorded=releasePhotometer(rec(rec(s,false),true,{remarks:'ok'}));
  const text=serializePhotometerSession(recorded),parsed=JSON.parse(text);
  expect(parsed).toMatchObject({version:15,policy:'OpenVireo-photometer-native-record-v15'});
  const back=parsePhotometerSession(parsed);expect(back.native).toEqual(recorded.native);expect(serializePhotometerSession(back)).toBe(text);
  expect(replayPhotometer(42,recorded.events as PhotometerEvent[]).native).toEqual(recorded.native);
  expect(pleiadesExerciseSummary(recorded,'ready')).toEqual(pleiadesExerciseSummary(before,'ready'));
  expect(()=>parsePhotometerSession({...parsed,version:14,policy:'OpenVireo-photometer-R-I-v14'})).toThrow();
 });
});

describe('native rows as results records (0x54a91c, 0x5486a8, 0x542990)',()=>{
 it('the dialog, the Recorded Results list and the HR plot read the encoded rows',()=>{
  let s=step(createPhotometer(42),{type:'activate'});s=band(s,'B');s=rec(s,true,{remarks:'B only'});s=band(s,'V');s=rec(s,true,{remarks:'B and V'});
  const data=photometerNativeData(s.native!.rows),view=observationalDataFields(data,0);
  if(view.kind!=='ready')throw new Error('blocked');
  expect(view.fields).toMatchObject({id:'HII 1234',jd:'2455000.250000',ra:"03h 45m 00.00s",results:'Observed Magnitudes',remarks:'B and V',u:'',r:'',i:''});
  expect(view.fields.v.trim()).toBe(s.native!.rows[0]!.bands[2]!.toFixed(3));
  const lines=recordedResultsLines(data);expect(lines.kind==='ready'&&lines.lines.length).toBe(2);
  const plot=clusterNativeHrPlot(data);expect(plot.status==='plotted'&&plot.rows[0]!.status).toBe('plotted');
  const vOnly=photometerNativeData([{...s.native!.rows[0]!,bands:[0,0,9,0,0]}]),p2=clusterNativeHrPlot(vOnly);
  expect(p2.status==='plotted'&&p2.rows[0]!.status).toBe('skipped-b-zero');
 });
});
