import {describe,it,expect} from 'vitest';
import fixtures from '../../data/feature-width/analytic-fixtures.json';
import {FEATURE_POLICY,EMPTY_FEATURES,FEATURE_ENVELOPE,emptyFeatureDraft,featureDomain,featureRegion,regionFromDraft,readFeatures,measureFeature,recordFeature} from './featureWidth';
import {INITIAL_CLASSIFICATION,PRACTICE_FEATURE_DOMAINS,readClassificationState} from './classification';
const flat=(f:number)=>[3900,4200,4500].map(wavelength=>({wavelength,intensity:f}));
const region={left:4100,center:4150,right:4200,leftContinuum:1,rightContinuum:1};
describe('bounded recovered equivalent width',()=>{
 it('matches external independently derived rational/logarithmic fixtures',()=>{for(const v of fixtures.vectors){const samples=fixtures.coordinates.map((wavelength,i)=>({wavelength,intensity:v.flux[i]}));const r=measureFeature(samples,v);expect(r.converged).toBe(true);expect(Math.abs(r.width-Number(v.expectedWidth))).toBeLessThan(v.absoluteTolerance);}});
 it('matches independent constant, emission and quadratic analytic areas without flux clipping',()=>{
  expect(measureFeature(flat(.5),region)).toMatchObject({width:50,centerFlux:.5,iterations:3,converged:true,evaluations:5});
  expect(measureFeature(flat(1),{...region,leftContinuum:.5,rightContinuum:.5}).width).toBe(-100);
  const q=[{wavelength:3900,intensity:1},{wavelength:4200,intensity:.8},{wavelength:4500,intensity:1}],r=measureFeature(q,{...region,center:4200,right:4300});expect(r.width).toBeCloseTo(1040/27,10);expect(r.centerFlux).toBe(.8);expect(r.iterations).toBe(3);
 });
 it('uses the recovered linear continuum and refinement rather than raw area or a flat continuum',()=>{
  const r=measureFeature(flat(.5),{...region,leftContinuum:.5});expect(r.width).toBeCloseTo(100-100*Math.log(2),3);expect(r.converged).toBe(true);expect(r.iterations).toBeGreaterThan(3);
 });
 it('preserves the strict relative-zero nonconvergence and exposes a real delta instead of the native overwritten error',()=>{
  const r=measureFeature(flat(1),region);expect(r).toMatchObject({width:0,converged:false,iterations:20,evaluations:524289,lastDelta:0});
 });
 it('explicitly reconstructs endpoint coordinates for this path instead of integrating the plotted printed grid',()=>{
  const samples=[{wavelength:3900,intensity:1},{wavelength:4000,intensity:.8},{wavelength:4500,intensity:1}];expect(measureFeature(samples,{...region,center:4200,right:4300}).width).toBeCloseTo(1040/27,10);
 });
 it('rejects continuum zero/reversal, invalid center, non-finite or outside domain without consuming randomness',()=>{
  for(const input of [{...region,leftContinuum:0},{...region,rightContinuum:2},{...region,center:region.left},{...region,left:4300},{...region,center:NaN}])expect(()=>measureFeature(flat(.5),input)).toThrow();
  expect(()=>measureFeature([{wavelength:4150,intensity:1},{wavelength:4200,intensity:1},{wavelength:4250,intensity:1}],region)).toThrow(/domain/);
 });
 it('bounds source-bound manual drafts/records and never accepts a portable computed result',()=>{
  const draft={...emptyFeatureDraft('u1'),center:'4150',left:'4100',right:'4200',leftContinuum:'1',rightContinuum:'1'},r=regionFromDraft(draft),w={policy:FEATURE_POLICY,drafts:[draft],records:[{...r,unknownId:'u1',id:1}]};expect(readFeatures(w,['u1'])).toEqual(w);expect(regionFromDraft({...draft,leftContinuum:'.5'}).leftContinuum).toBe(.5);expect(()=>readFeatures({...w,width:50},['u1'])).toThrow();expect(()=>readFeatures(w,['u2'])).toThrow();expect(()=>readFeatures({...w,drafts:[draft,draft]},['u1','u2'])).toThrow();expect(()=>readFeatures({...w,records:[...w.records,...w.records]},['u1'])).toThrow();expect(()=>regionFromDraft({...draft,center:''})).toThrow();expect(readFeatures(EMPTY_FEATURES,['u1'])).toEqual(EMPTY_FEATURES);
 });
});
describe('source-bound EW domain: own grid ∩ 3500–7400 Å (phase1 item 1.10a)',()=>{
 // SYNTHETIC flat grid over the whole envelope; not an original or acquired spectrum.
 const wide=[3500,5450,7400].map(wavelength=>({wavelength,intensity:.5})),beyond={left:4800,center:4860,right:4920,leftContinuum:1,rightContinuum:1};
 it('accepts regions beyond 4500 Å with the unchanged integrator and rejects the envelope edges',()=>{
  expect(measureFeature(wide,beyond)).toMatchObject({width:60,centerFlux:.5,converged:true});
  expect(FEATURE_ENVELOPE).toEqual({minimum:3500,maximum:7400});
  for(const bad of[{...beyond,left:3499},{...beyond,right:7401}])expect(()=>featureRegion(bad)).toThrow();
  expect(featureRegion({...beyond,left:3500,right:7400})).toEqual({...beyond,left:3500,right:7400});
  expect(featureDomain(3510,7427.2)).toEqual({minimum:3510,maximum:7400});expect(featureDomain(3700,4698.33)).toEqual({minimum:3700,maximum:4698.33});expect(()=>featureDomain(7400,7427.2)).toThrow();
  expect(()=>featureRegion(beyond,{minimum:3700,maximum:4698.33})).toThrow();
 });
 it('checks practice records against each practice domain and keeps the old ID-array API',()=>{
  expect(PRACTICE_FEATURE_DOMAINS.u1).toEqual({minimum:3510,maximum:7400});
  const r={...beyond,id:1,unknownId:'u1'},w={policy:FEATURE_POLICY,drafts:[],records:[r]};
  expect(readFeatures(w,['u1'],PRACTICE_FEATURE_DOMAINS)).toEqual(w);expect(readFeatures(w,['u1'])).toEqual(w);
  expect(()=>readFeatures({...w,records:[{...r,left:3505}]},['u1'],PRACTICE_FEATURE_DOMAINS)).toThrow();
  expect(()=>readFeatures(w,['u1'],{})).toThrow();
  expect(recordFeature(EMPTY_FEATURES,'u1',beyond,['u1'],PRACTICE_FEATURE_DOMAINS).records).toEqual([r]);
  const state=(records:unknown[])=>({...INITIAL_CLASSIFICATION,features:{policy:FEATURE_POLICY,drafts:[],records}});
  expect(()=>readClassificationState(state([{center:3550,left:3505,leftContinuum:1,right:3600,rightContinuum:1,id:1,unknownId:'u1'}]))).toThrow();
  expect(readClassificationState(state([{center:6600,left:6500,leftContinuum:1,right:6700,rightContinuum:1,id:1,unknownId:'u1'}])).features!.records).toHaveLength(1);
 });
 it('round-trips a legacy narrow 3900–4500 Å workspace byte-for-byte',()=>{
  const legacy={...INITIAL_CLASSIFICATION,line:4,features:{policy:FEATURE_POLICY,drafts:[{unknownId:'u1',center:'4150',left:'4100',leftContinuum:'1',right:'4200',rightContinuum:'1'}],records:[{center:4150,left:4100,leftContinuum:.9,right:4200,rightContinuum:.8,id:1,unknownId:'u1'},{center:4300,left:3900,leftContinuum:1,right:4500,rightContinuum:1,id:2,unknownId:'u3'}]}};
  expect(JSON.stringify(readClassificationState(JSON.parse(JSON.stringify(legacy))))).toBe(JSON.stringify(legacy));
 });
});
