import {describe,it,expect} from 'vitest';
import {createPhotometer,photometerEvent as step,releasePhotometer,type PhotometerState} from './photometer';
import {EMPTY_PLEIADES_EXERCISE_SUMMARY,PLEIADES_SAMPLE_TARGETS,pleiadesExerciseSummary,pleiadesLabProgress,samePleiadesExerciseSummary} from './pleiadesLab';
// Real photometer transitions (seed 42, existing legacy callbacks); the manual values are authored transcriptions, not answers.
const A='N2230.DAT@145877',B='N2230.DAT@144496';
const complete=(s:PhotometerState)=>step(step(s,{type:'start'}),{type:'complete'});
function firstStar(){let s=step(createPhotometer(42),{type:'activate'});s=complete(s);s=step(s,{type:'point',kind:'object'});s=complete(s);
 const measuredV=s;s=step(s,{type:'record',readingId:2,value:9.647,note:''});s=step(s,{type:'filter',filter:'B'});s=step(s,{type:'point',kind:'sky'});s=complete(s);s=step(s,{type:'point',kind:'object'});s=complete(s);
 const measured=s;s=step(s,{type:'record',readingId:4,value:10.207,note:''});return {measuredV,measured,recorded:s,colored:step(s,{type:'color',bReadingId:4,vReadingId:2})};}
const progress=(s:PhotometerState|null,extra:Partial<{list:boolean;pointed:boolean;access:'ready'|'pointing'}>={})=>pleiadesLabProgress({list:extra.list??false,pointed:extra.pointed??false,photometer:pleiadesExerciseSummary(s,extra.access??'ready')});

describe('Pleiades E04 guide progress is derived only from real photometer state',()=>{
 it('measure, record and color follow acquired readings, manual entries and a confirmed B−V of the same star',()=>{
  const {measuredV,measured,recorded,colored}=firstStar();
  expect(progress(null).done.measure).toBe(false);expect(progress(measuredV).done.measure).toBe(false);
  expect(progress(measured).done).toMatchObject({measure:true,record:false,color:false});
  expect(progress(recorded).done).toMatchObject({measure:true,record:true,color:false});
  expect(progress(colored).done).toMatchObject({color:true,sample:false,distance:false});expect(progress(colored).colorTargets).toBe(1);
 });
 it('list/point/activate are live marks; once a measurement exists Next skips them, and save is never counted',()=>{
  const fresh=progress(null,{access:'pointing'});expect(fresh.next).toBe('list');expect(fresh.done.save).toBe(false);
  expect(progress(null,{list:true}).next).toBe('point');expect(progress(null,{list:true,pointed:true,access:'pointing'}).next).toBe('activate');
  const armed=step(createPhotometer(42),{type:'activate'});expect(progress(armed,{list:true}).done).toMatchObject({point:true,activate:true});expect(progress(armed,{list:true,access:'pointing'}).done.activate).toBe(false);
  const released=releasePhotometer(firstStar().colored),p=progress(released,{access:'pointing'});
  expect(p.done).toMatchObject({list:false,point:false,activate:false,measure:true});expect(p.next).toBe('sample');
 });
 it('a two-star fit is technically allowed but the sample counts only all 24 admitted stars; a new color clears the fit',()=>{
  let s=firstStar().colored;s=step(s,{type:'target',targetId:B});s=complete(s);s=step(s,{type:'record',readingId:5,value:10.758,note:''});s=step(s,{type:'filter',filter:'V'});s=complete(s);s=step(s,{type:'record',readingId:6,value:8.996,note:''});s=step(s,{type:'color',bReadingId:5,vReadingId:6});
  s=step(s,{type:'clusterFit',modulus:5.5});const fitted=progress(s);
  expect(fitted.colorTargets).toBe(2);expect(PLEIADES_SAMPLE_TARGETS).toBe(24);expect(fitted.done).toMatchObject({sample:false,distance:true});expect(fitted.next).toBe('sample');
  s=step(s,{type:'target',targetId:A});s=step(s,{type:'color',bReadingId:4,vReadingId:2});expect(progress(s).done.distance).toBe(false);
 });
 it('summaries compare by value so the photometer reports only changes',()=>{
  const {colored}=firstStar(),a=pleiadesExerciseSummary(colored,'ready'),b=pleiadesExerciseSummary(colored,'ready');
  expect(samePleiadesExerciseSummary(a,b)).toBe(true);expect(samePleiadesExerciseSummary(a,pleiadesExerciseSummary(colored,'pointing'))).toBe(false);
  expect(samePleiadesExerciseSummary(pleiadesExerciseSummary(null,'pointing'),EMPTY_PLEIADES_EXERCISE_SUMMARY)).toBe(true);
 });
});
