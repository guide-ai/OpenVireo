import {describe,it,expect} from 'vitest';
import vectors from '../../data/photometry/reduction-vectors.json';
import {MAX_PHOTOMETER_COUNT,PhotometryReductionError,photometerApertureFactor,reducePhotometerSky,reducePhotometerObject,photometricBMinusV} from './photometryReduction';
const object={totalPhotonCount:1200,integrations:1,secondsPerIntegration:10,apertureSelector:10,nativeBaseCountSum:1000,zeroPointMagnitude:20,skyAtReferenceAperture:20};
describe('bounded supplied photometer reduction',()=>{
 it('matches independent exact/70-digit analytic vectors including area scaling and raw-count SNR',()=>{
  for(const v of vectors.vectors){const r=reducePhotometerObject(v.input);expect(r.status).toBe('available');for(const [key,expected] of Object.entries(v.expected)){const actual=r[key as keyof typeof r];expect(typeof actual).toBe('number');expect(Math.abs((actual as number)-Number(expected))).toBeLessThanOrEqual(Math.max(1e-12,Math.abs(Number(expected))*2e-15));}}
 });
 it('uses the base-count accumulator rather than milliseconds or seconds as the normalizer',()=>{
  // Supplied algebraic counts, NOT acquired CLEA observations. The original
  // default is1000 base counts per callback,100 ms per callback: ten callbacks
  // therefore normalize by10000 base counts, independently of1000 ms elapsed.
  const r=reducePhotometerObject({...object,totalPhotonCount:12000,secondsPerIntegration:1,nativeBaseCountSum:10000,skyAtReferenceAperture:2000});
  expect(r).toMatchObject({status:'available',baseCountRate:10000,netCountRate:10000,ratio:1,magnitude:20});
  expect(reducePhotometerObject({...object,totalPhotonCount:12000,secondsPerIntegration:1,nativeBaseCountSum:1000,skyAtReferenceAperture:2000}).magnitude).toBe(17.5);
 });
 it('normalizes sky to the reference area and preserves supplied reading inputs',()=>{
  const input=Object.freeze({totalPhotonCount:168100,integrations:1,secondsPerIntegration:100,apertureSelector:20}),r=reducePhotometerSky(input);
  expect(r.skyAtReferenceAperture).toBeCloseTo(441,12);expect(r.meanCountRate).toBe(1681);expect(Object.isFrozen(r)).toBe(true);expect(input.totalPhotonCount).toBe(168100);
  expect(reducePhotometerSky({...input,totalPhotonCount:0}).skyAtReferenceAperture).toBe(0);expect(photometerApertureFactor(10)).toBe(1);
 });
 it('requires supplied sky, counter and calibration rather than inventing a magnitude',()=>{
  expect(reducePhotometerObject({...object,skyAtReferenceAperture:null})).toMatchObject({status:'missing-sky',magnitude:null,netCountRate:null});
  for(const nativeBaseCountSum of [0,-1,.5,NaN,Infinity,MAX_PHOTOMETER_COUNT+1])expect(()=>reducePhotometerObject({...object,nativeBaseCountSum})).toThrow(PhotometryReductionError);
  for(const zeroPointMagnitude of [NaN,Infinity])expect(()=>reducePhotometerObject({...object,zeroPointMagnitude})).toThrow(/calibration/);
  for(const skyAtReferenceAperture of [-1,NaN,Infinity])expect(()=>reducePhotometerObject({...object,skyAtReferenceAperture})).toThrow(/sky/);
 });
 it('withholds nonpositive net counts and the zero magnitude sentinel boundary',()=>{
  expect(reducePhotometerObject({...object,skyAtReferenceAperture:120})).toMatchObject({status:'nonpositive-net',netCountRate:0,magnitude:null});
  expect(reducePhotometerObject({...object,totalPhotonCount:0})).toMatchObject({status:'nonpositive-net',magnitude:null,nativeDisplaySnr:0});
  expect(reducePhotometerObject({...object,zeroPointMagnitude:0})).toMatchObject({status:'zero-magnitude-boundary',magnitude:null,ratio:1});
 });
 it('validates native integer count bounds and documented integration choices',()=>{
  expect(reducePhotometerObject({...object,totalPhotonCount:MAX_PHOTOMETER_COUNT,nativeBaseCountSum:MAX_PHOTOMETER_COUNT}).status).toBe('available');
  for(const totalPhotonCount of [-1,.1,NaN,Infinity,MAX_PHOTOMETER_COUNT+1])expect(()=>reducePhotometerSky({...object,totalPhotonCount})).toThrow(/counts/);
  for(const integrations of [0,6,1.5,NaN])expect(()=>reducePhotometerSky({...object,integrations})).toThrow(/integration/);
  for(const secondsPerIntegration of [0,2,NaN,Infinity])expect(()=>reducePhotometerSky({...object,secondsPerIntegration})).toThrow(/integration/);
  for(const secondsPerIntegration of [.1,1,10,100])for(const integrations of [1,5])expect(reducePhotometerSky({...object,secondsPerIntegration,integrations}).integrationSeconds).toBe(secondsPerIntegration*integrations);
 });
 it('rejects adapter-domain and arithmetic overflow instead of silently clipping',()=>{
  for(const a of [-1,1.5,NaN,Infinity,1_000_001])expect(()=>photometerApertureFactor(a)).toThrow(/aperture/);
  expect(photometerApertureFactor(0)).toBeCloseTo(1/441,15);expect(photometerApertureFactor(1_000_000)).toBeGreaterThan(1);
  expect(()=>reducePhotometerObject({...object,apertureSelector:20,skyAtReferenceAperture:Number.MAX_VALUE})).toThrow(/overflow/);
  expect(Object.isFrozen(reducePhotometerObject(object))).toBe(true);
 });
 it('derives only manually supplied B minus V, including negative/zero values, without rounding or extinction',()=>{
  expect(photometricBMinusV(12.34,11.96)).toBeCloseTo(.38,13);expect(photometricBMinusV(0,.1)).toBe(-.1);expect(photometricBMinusV(0,0)).toBe(0);
  for(const pair of [[null,12],[12,null],[NaN,12],[12,Infinity]] as const)expect(()=>photometricBMinusV(pair[0],pair[1])).toThrow(/color/);
  expect(()=>photometricBMinusV(Number.MAX_VALUE,-Number.MAX_VALUE)).toThrow(/overflow/);
 });
});
