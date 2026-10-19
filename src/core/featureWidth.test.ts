import {describe,it,expect} from 'vitest';
import fixtures from '../../data/feature-width/analytic-fixtures.json';
import {FEATURE_POLICY,EMPTY_FEATURES,emptyFeatureDraft,regionFromDraft,readFeatures,measureFeature} from './featureWidth';
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
