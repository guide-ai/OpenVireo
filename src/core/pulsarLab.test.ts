import {describe,expect,it} from 'vitest';
import {
 EMPTY_PULSAR_MEASUREMENT_SUMMARY,INITIAL_RADIO_EXERCISE_SUMMARY,PULSAR_LAB_REQUIRED_STEPS,PULSAR_LAB_STEPS,pulsarInvestigationState,pulsarLabProgress,pulsarListStamp,pulsarMeasurementSummary,
 samePulsarMeasurementSummary,sameRadioExerciseSummary,
 type PulsarRecordingKey,type PulsarRowFields,type RadioExerciseSummary,
} from './pulsarLab';

const KEY:PulsarRecordingKey={object:'0329+54',start:'51544.50000000',points:'400',intervalMs:'10.00',aperture:'100'};
const row=(frequency:string,reference:string|null,vertical:string|null,key:PulsarRecordingKey=KEY):PulsarRowFields=>({...key,frequency,reference,vertical});
const summary=(rows:readonly PulsarRowFields[],data:'none'|'memory'|'file'='memory',verifiedCopy=false)=>pulsarMeasurementSummary({data,verifiedCopy,key:data==='none'?null:KEY,rows});
const RADIO_READY:RadioExerciseSummary={setup:true,catalog:'recorded',sourceInBeam:'Pulsar 0329+54',receivers:2,frequencies:2,record:'idle',trackingOff:false};

describe('pulsarMeasurementSummary (readings recorded, not judged)',()=>{
 it('counts only rows of the presented recording, and only timed rows for period and delay',()=>{
  const other={...KEY,start:'51544.60000000'};
  const s=summary([row('400.00','0.100000',null),row('400.00',null,'1.000000'),row('400.00','0.100000','3.670000',other)]);
  expect(s).toEqual({data:'memory',verifiedCopy:false,confirmed:2,timedRows:0,delayFrequencies:0});
 });
 it('a period needs one same-recording row with a reference and a vertical time',()=>{
  expect(summary([row('400.00','0.100000','3.670000')])).toMatchObject({confirmed:1,timedRows:1,delayFrequencies:1});
 });
 it('a delay needs timed rows that share the origin (reference) at different recorded frequencies',()=>{
  // Same frequency twice: not a frequency comparison.
  expect(summary([row('400.00','0.100000','0.800000'),row('400.00','0.100000','1.510000')]).delayFrequencies).toBe(1);
  // Different frequencies but different origins: not one comparison.
  expect(summary([row('400.00','0.100000','0.800000'),row('500.00','0.200000','0.550000')]).delayFrequencies).toBe(1);
  // Same origin, two frequencies: recorded (whether it is the same pulse is the learner's judgement).
  expect(summary([row('400.00','0.100000','0.800000'),row('500.00','0.100000','0.550000')]).delayFrequencies).toBe(2);
  expect(summary([row('400.00','0.1','0.8'),row('600.00','0.1','0.66'),row('800.00','0.1','0.61')]).delayFrequencies).toBe(3);
 });
 it('no presented data gives the empty summary whatever rows remain',()=>{
  expect(summary([row('400.00','0.1','0.8')],'none')).toBe(EMPTY_PULSAR_MEASUREMENT_SUMMARY);
 });
 it('compares summaries by value',()=>{
  expect(samePulsarMeasurementSummary(summary([]),summary([]))).toBe(true);
  expect(samePulsarMeasurementSummary(summary([]),summary([],'file'))).toBe(false);
  expect(sameRadioExerciseSummary(RADIO_READY,{...RADIO_READY})).toBe(true);
  expect(sameRadioExerciseSummary(RADIO_READY,{...RADIO_READY,record:'armed'})).toBe(false);
  expect(sameRadioExerciseSummary(RADIO_READY,{...RADIO_READY,trackingOff:true})).toBe(false);
 });
});

describe('pulsarLabProgress (recomputed from state, no stored checkmarks)',()=>{
 it('starts at setup with nothing done; the investigation backup is available (Phase 1 item 1.5)',()=>{
  const p=pulsarLabProgress({radio:INITIAL_RADIO_EXERCISE_SUMMARY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0});
  expect(PULSAR_LAB_STEPS.every(s=>!p.done[s])).toBe(true);expect(p.next).toBe('setup');expect(p.investigationBackup).toBe('available');
  expect(PULSAR_LAB_REQUIRED_STEPS).toEqual(['setup','catalog','point','channels','capture','period','delay','investigation']);
 });
 it('advances in order from the state alone and un-checks when data or rows go away',()=>{
  const radio:RadioExerciseSummary={...INITIAL_RADIO_EXERCISE_SUMMARY,setup:true};
  expect(pulsarLabProgress({radio,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).next).toBe('catalog');
  expect(pulsarLabProgress({radio:{...radio,catalog:'reading'},analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).done.catalog).toBe(false);
  expect(pulsarLabProgress({radio:{...radio,catalog:'supplied'},analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).next).toBe('point');
  expect(pulsarLabProgress({radio:{...RADIO_READY,frequencies:1},analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).next).toBe('channels');
  expect(pulsarLabProgress({radio:RADIO_READY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).next).toBe('capture');
  const captured=summary([]);
  expect(pulsarLabProgress({radio:RADIO_READY,analysis:captured,captureRows:400}).next).toBe('period');
  const period=summary([row('400.00','0.1','3.67')]);
  expect(pulsarLabProgress({radio:RADIO_READY,analysis:period,captureRows:400}).next).toBe('delay');
  const both=summary([row('400.00','0.1','3.67'),row('400.00','0.2','0.8'),row('500.00','0.2','0.55')]);
  const all=pulsarLabProgress({radio:RADIO_READY,analysis:both,captureRows:400});
  expect(all.next).toBe('investigation');expect(all.done.investigation).toBe(false);expect(all.done.save).toBe(false);
  const saved=pulsarLabProgress({radio:RADIO_READY,analysis:both,captureRows:400,investigation:'prepared'});
  expect(saved.next).toBe('save');expect(saved.done.investigation).toBe(true);expect(saved.investigation).toBe('prepared');
  // Clearing the measurement list un-checks period and delay; losing the data un-checks capture too.
  expect(pulsarLabProgress({radio:RADIO_READY,analysis:captured,captureRows:400}).done.period).toBe(false);
  const gone=pulsarLabProgress({radio:RADIO_READY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0});
  expect([gone.done.capture,gone.done.period,gone.done.delay]).toEqual([false,false,false]);
 });
 it('a verified copy marks only the optional .PLR copy; it never marks the investigation step',()=>{
  const p=pulsarLabProgress({radio:RADIO_READY,analysis:summary([],'memory',true),captureRows:400});
  expect(p.done.save).toBe(true);expect(p.done.investigation).toBe(false);expect(p.investigation).toBe('none');
 });
 it('the investigation step needs a capture and a mark that still covers the current dataset and confirmed list',()=>{
  const both=summary([row('400.00','0.1','3.67'),row('400.00','0.2','0.8'),row('500.00','0.2','0.55')]);
  expect(pulsarLabProgress({radio:RADIO_READY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0,investigation:'restored'}).done.investigation).toBe(false);
  expect(pulsarLabProgress({radio:RADIO_READY,analysis:both,captureRows:400,investigation:'restored'}).investigation).toBe('restored');
  const data={},list=[{sequence:1,panel:0,fields:{object:'0329+54',comment:''}}];
  const mark={kind:'prepared' as const,data,generation:3,listStamp:pulsarListStamp(list)};
  expect(pulsarInvestigationState(mark,{data,generation:3,listStamp:pulsarListStamp(list)})).toBe('prepared');
  // A new capture (other object or generation), Clear, a fourth row or a comment edit invalidates it.
  expect(pulsarInvestigationState(mark,{data:{},generation:3,listStamp:mark.listStamp})).toBe('none');
  expect(pulsarInvestigationState(mark,{data,generation:4,listStamp:mark.listStamp})).toBe('none');
  expect(pulsarInvestigationState(mark,{data,generation:3,listStamp:pulsarListStamp([])})).toBe('none');
  expect(pulsarInvestigationState(mark,{data,generation:3,listStamp:pulsarListStamp([...list,{sequence:2,panel:1,fields:{object:'0329+54',comment:''}}])})).toBe('none');
  expect(pulsarInvestigationState(mark,{data,generation:3,listStamp:pulsarListStamp([{...list[0],fields:{object:'0329+54',comment:'edited'}}])})).toBe('none');
  expect(pulsarInvestigationState(null,{data,generation:3,listStamp:mark.listStamp})).toBe('none');
 });
 it('reports an armed Record so the guide can warn that Add disarms it',()=>{
  expect(pulsarLabProgress({radio:{...RADIO_READY,record:'armed'},analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).recordArmed).toBe(true);
 });
 it('reports Tracking off only while setup is incomplete',()=>{
  const off:RadioExerciseSummary={...INITIAL_RADIO_EXERCISE_SUMMARY,trackingOff:true};
  const p=pulsarLabProgress({radio:off,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0});
  expect(p.trackingOff).toBe(true);expect(p.next).toBe('setup');
  expect(pulsarLabProgress({radio:{...RADIO_READY,trackingOff:true},analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).trackingOff).toBe(false);
  expect(pulsarLabProgress({radio:INITIAL_RADIO_EXERCISE_SUMMARY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).trackingOff).toBe(false);
 });
 it('a capture and its readings keep Next forward when receivers close; marks still follow the live state',()=>{
  const closed:RadioExerciseSummary={...RADIO_READY,sourceInBeam:null,receivers:0,frequencies:0};
  const both=summary([row('400.00','0.1','3.67'),row('400.00','0.2','0.8'),row('500.00','0.2','0.55')]);
  const p=pulsarLabProgress({radio:closed,analysis:both,captureRows:400});
  expect(p.next).toBe('investigation');
  expect([p.done.point,p.done.channels]).toEqual([false,false]);
  expect([p.done.capture,p.done.period,p.done.delay]).toEqual([true,true,true]);
  // Clear still resets the measurement evidence.
  expect(pulsarLabProgress({radio:closed,analysis:summary([]),captureRows:400}).next).toBe('period');
  // Rows of another recording never count for the presented one.
  const other={...KEY,start:'51544.60000000'};
  const foreign=pulsarLabProgress({radio:closed,analysis:summary([row('400.00','0.1','3.67',other),row('400.00','0.2','0.8',other),row('500.00','0.2','0.55',other)]),captureRows:400});
  expect([foreign.done.period,foreign.done.delay]).toEqual([false,false]);expect(foreign.next).toBe('period');
  // Without a capture the live Radio steps lead again.
  expect(pulsarLabProgress({radio:closed,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).next).toBe('point');
  // Setup and catalog still lead with a capture (a loaded file after a page reload, as the R-RX24 journey checks).
  const reloaded=pulsarLabProgress({radio:INITIAL_RADIO_EXERCISE_SUMMARY,analysis:summary([row('400.00','0.1','3.67')],'file'),captureRows:400});
  expect(reloaded.next).toBe('setup');expect([reloaded.done.capture,reloaded.done.period]).toEqual([true,true]);
 });
});
