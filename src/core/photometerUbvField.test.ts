import{projectResource}from'./projectMetadata';
import {describe,it,expect} from 'vitest';
import {buildPinnedPleiadesUbvField,drawPinnedPleiadesUbv,PINNED_UBV_SKY,type PhotometerFilter} from './photometerUbvField';
import contractSource from '../../data/photometry/ubv-contract.json';
const contract=projectResource(contractSource);

import vectors from '../../data/photometry/ubv-vectors.json';

describe('pinned recovered UBV source and independent filter sky',()=>{
 it('uses original Single colors, exact retained sky offsets and common native zero point',()=>{
  expect(PINNED_UBV_SKY).toEqual({V:16,B:17,U:17.33});expect(contract.zeroPoint).toBe(9);expect(contract.nativeFilterIndices).toEqual({U:0,B:1,V:2});expect(contract.skyLiterals[1].numerator).toBe('12174851088648304067');
 });
 it('agrees with independent Decimal flux for each source/sky and preserves zero-aperture leakage',()=>{
  for(const band of ['V','B','U'] as const){const f=buildPinnedPleiadesUbvField('object',band),s=buildPinnedPleiadesUbvField('sky',band);expect(f.sourceMean).toBeCloseTo(Number(vectors.means[band].source),4);expect(f.skyMean).toBeCloseTo(Number(vectors.means[band].sky),12);expect(s.sourceMagnitude).toBe(30);expect(s.sourceMean).toBeCloseTo(Number(vectors.means[band].skySource),18);expect(s.sourceMean).toBeGreaterThan(0);}
 });
 it.each(vectors.sequences)('matches independent sequential V/B/U component counts and seed consumption for seed $seed',v=>{
  let seed=v.seed;
  for(const p of v.pairs)for(const kind of ['sky','object'] as const){const result=drawPinnedPleiadesUbv(kind,p.filter as PhotometerFilter,seed),expected=p[kind];for(const key of ['sourceCount','skyCount','totalPhotonCount','seed','draws'] as const)expect(result[key]).toBe(expected[key]);seed=result.seed;}
 });
 it('preserves a rare nonzero source photon at zero aperture in every supported filter',()=>{for(const f of ['U','B','V'] as const)expect(drawPinnedPleiadesUbv('sky',f,1298181734).sourceCount).toBe(1);});
 it('excludes R/I and unknown filter/pointing domains',()=>{
  for(const filter of ['R','I','b','',null])expect(()=>buildPinnedPleiadesUbvField('object',filter as PhotometerFilter)).toThrow();expect(()=>buildPinnedPleiadesUbvField('else' as 'object','B')).toThrow();
 });
});
