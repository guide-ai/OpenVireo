import {describe,expect,it} from 'vitest';
import {companionNow,HUBBLE_GUIDE_ITEMS} from './guideCompanion';
import {hubbleLabProgress,type HubbleLabProgress} from './hubbleLab';
import {EMPTY_HUBBLE} from './hubbleAnalysis';
import {INITIAL_LSS_LAB_SUMMARY,LSS_LAB_REPEAT_RECORDS,LSS_LAB_STEPS,lssLabProgress} from './lssLab';
import {INITIAL_OBJECT_X_LAB_SUMMARY,OBJECT_X_LAB_STEPS,objectXLabProgress} from './objectXLab';
import {EMPTY_CLASSIFICATION_EXERCISE_SUMMARY,classificationLabProgress} from './classificationLab';
import {EMPTY_CLASSIFICATION_WORKSPACE} from './classification';
import {clusterLabProgress} from './clusterLab';
import {EMPTY_PULSAR_MEASUREMENT_SUMMARY,INITIAL_RADIO_EXERCISE_SUMMARY,pulsarLabProgress,type RadioExerciseSummary} from './pulsarLab';
import {EMPTY_PLEIADES_EXERCISE_SUMMARY,pleiadesLabProgress} from './pleiadesLab';

const RADIO_READY:RadioExerciseSummary={setup:true,catalog:'recorded',sourceInBeam:'Pulsar 0329+54',receivers:2,frequencies:2,record:'idle',trackingOff:false};

describe('companionNow (the current step is each guide\'s own next step)',()=>{
 it('LSS: the first step not done, in list order, and "done" when every step is',()=>{
  const start=lssLabProgress(INITIAL_LSS_LAB_SUMMARY);
  expect(start.next).toBe('load');
  expect(companionNow({lab:'large-scale-structure',progress:start})).toEqual({lab:'large-scale-structure',step:'load',index:1,total:LSS_LAB_STEPS.length,allDone:false});
  const recorded=lssLabProgress({...INITIAL_LSS_LAB_SUMMARY,listLoaded:true,observed:true,records:1,galaxies:1,fields:1});
  expect(companionNow({lab:'large-scale-structure',progress:recorded})).toMatchObject({step:'repeat',index:4,allDone:false});
  // A later step done before an earlier one does not hide the earlier one.
  expect(lssLabProgress({...INITIAL_LSS_LAB_SUMMARY,described:true}).next).toBe('load');
  const all=lssLabProgress({listLoaded:true,observed:true,records:LSS_LAB_REPEAT_RECORDS,galaxies:LSS_LAB_REPEAT_RECORDS,fields:2,plotted:3,described:true,saved:true});
  expect(companionNow({lab:'large-scale-structure',progress:all})).toEqual({lab:'large-scale-structure',step:'done',index:7,total:7,allDone:true});
  // Saved goes back when a new record makes the saved file stale: the companion follows.
  expect(lssLabProgress({...all.summary,saved:false}).next).toBe('save');
 });
 it('Object X: the first step not done; a non-moving answer skips "measure" as in the guide',()=>{
  const start=objectXLabProgress(INITIAL_OBJECT_X_LAB_SUMMARY);
  expect(companionNow({lab:'object-x',progress:start})).toEqual({lab:'object-x',step:'target',index:1,total:OBJECT_X_LAB_STEPS.length,allDone:false});
  const imaged={...INITIAL_OBJECT_X_LAB_SUMMARY,target:true,clockSet:true,listBuilt:true,images:2,imagesOfTarget:2};
  expect(objectXLabProgress(imaged).next).toBe('measure');
  expect(objectXLabProgress({...imaged,answered:true},'pulsar').next).toBe('describe');
  const all=objectXLabProgress({...imaged,motionMeasured:true,answered:true,described:true,revealed:true,saved:true},'asteroid');
  expect(companionNow({lab:'object-x',progress:all})).toMatchObject({step:'done',index:10,total:10,allDone:true});
 });
 it('Hubble: its phase maps to one of the five list items; item 4 (keep the investigation) is never current',()=>{
  const now=(next:HubbleLabProgress['next'])=>companionNow({lab:'hubble',progress:{...hubbleLabProgress([],[],EMPTY_HUBBLE),next}});
  expect(now('acquire')).toEqual({lab:'hubble',step:'acquire',index:1,total:HUBBLE_GUIDE_ITEMS,allDone:false});
  expect(now('measure').index).toBe(2);
  expect([now('dataset').index,now('recipe').index,now('inputs').index]).toEqual([3,3,3]);
  expect(now('interpret')).toMatchObject({index:5,allDone:true});
  expect(companionNow({lab:'hubble',progress:hubbleLabProgress([],[],EMPTY_HUBBLE)}).step).toBe('acquire');
 });
 it('classification, cluster HR: their next step, and their closing state once every counted step is done',()=>{
  expect(companionNow({lab:'stellar-classification',progress:classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY)}))
   .toEqual({lab:'stellar-classification',step:'choose',index:1,total:5,allDone:false});
  const cluster=(s:Partial<Parameters<typeof clusterLabProgress>[0]>)=>companionNow({lab:'cluster-hr',progress:clusterLabProgress({loaded:false,inspected:false,validTrial:false,confirmed:false,reportOpened:false,...s})});
  expect(cluster({})).toEqual({lab:'cluster-hr',step:'load',index:1,total:5,allDone:false});
  expect(cluster({loaded:true,inspected:true})).toMatchObject({step:'trial',index:3});
  expect(cluster({loaded:true,inspected:true,validTrial:true,confirmed:true,reportOpened:true})).toEqual({lab:'cluster-hr',step:'preserve',index:5,total:5,allDone:true});
 });
 it('pulsars: follows the guide\'s skip rule (a capture is not sent back by the live receiver steps) and marks that go back',()=>{
  const now=(i:Parameters<typeof pulsarLabProgress>[0])=>companionNow({lab:'pulsars',progress:pulsarLabProgress(i)});
  expect(now({radio:INITIAL_RADIO_EXERCISE_SUMMARY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0})).toEqual({lab:'pulsars',step:'setup',index:1,total:9,allDone:false});
  expect(now({radio:RADIO_READY,analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0})).toMatchObject({step:'capture',index:5});
  // Closing the receivers clears the pointing mark: before a capture the companion goes back to "point".
  expect(now({radio:{...RADIO_READY,sourceInBeam:null,receivers:0,frequencies:0},analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:0}).step).toBe('point');
  // With a capture it does not.
  expect(now({radio:{...RADIO_READY,sourceInBeam:null,receivers:0,frequencies:0},analysis:EMPTY_PULSAR_MEASUREMENT_SUMMARY,captureRows:400}).step).toBe('period');
  const measured={data:'memory' as const,verifiedCopy:false,confirmed:2,timedRows:2,delayFrequencies:2};
  expect(now({radio:RADIO_READY,analysis:measured,captureRows:400}).step).toBe('investigation');
  expect(now({radio:RADIO_READY,analysis:measured,captureRows:400,investigation:'prepared'})).toEqual({lab:'pulsars',step:'save',index:9,total:9,allDone:true});
 });
 it('Pleiades: follows the guide\'s skip rule once a measurement exists',()=>{
  const now=(i:Parameters<typeof pleiadesLabProgress>[0])=>companionNow({lab:'pleiades',progress:pleiadesLabProgress(i)});
  expect(now({list:false,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY})).toEqual({lab:'pleiades',step:'list',index:1,total:9,allDone:false});
  expect(now({list:true,pointed:false,photometer:EMPTY_PLEIADES_EXERCISE_SUMMARY}).step).toBe('point');
  // After a reload the list and pointing marks start again, but a restored measurement is not sent back to them.
  expect(now({list:false,pointed:false,photometer:{...EMPTY_PLEIADES_EXERCISE_SUMMARY,measuredTargets:1}})).toMatchObject({step:'record',index:5});
 });
});
