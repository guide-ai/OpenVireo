import {describe,it,expect} from 'vitest';
import vectors from '../../data/photometry/source-vectors.json';
import {photometerSeparation as separation,photometerNormalIntegral as integral,photometerPointFraction as point,attenuatePhotometerMagnitude as attenuate,combinePhotometerMagnitudes as combine,prepareKnownColorPhotometerUbv as prepare} from './photometerSource';
const star={v:10,bMinusV:.5,uMinusB:-.25,fraction:1};
describe('bounded recovered photometer point-source and neighbor preparation',()=>{
 it('matches independent analytic integrals at all safe lookup knots and off-grid interpolation',()=>{
  for(let i=0;i<100;i++)expect(Math.abs(integral(-5+i/10)-Number(vectors.knots[i]))).toBeLessThan(1e-7);
  const expected=(Number(vectors.knots[63])+Number(vectors.knots[64]))/2;expect(integral(1.35)).toBeCloseTo(expected,7);
  // A direct modern normal CDF would be0.5 here: native starts its table at-5.
  expect(integral(0)).toBeLessThan(.5-2e-7);
 });
 it('matches independent signed-aperture vectors without substituting a circular aperture or clipped source position',()=>{
  for(const v of vectors.points)expect(Math.abs(point(v.radius,v.separation,v.seeingScale)-Number(v.expected))).toBeLessThan(1e-7);
  expect(point(1,0,1)).toBeGreaterThan(.68);expect(point(1,0,1)).toBeLessThan(.69);
 });
 it('preserves tail policy, rejects the inclusive+5 unsafe table endpoint and exposes geometry errors',()=>{
  expect(integral(-6)).toBe(0);expect(integral(-5)).toBe(0);expect(integral(6)).toBe(1);expect(()=>integral(5)).toThrow(/boundary/);expect(()=>point(5,0,1)).toThrow(/boundary/);
  for(const x of [NaN,Infinity,-Infinity])expect(()=>integral(x)).toThrow();
  for(const args of [[-1,0,1],[1,-1,1],[1,0,0],[Infinity,0,1]] as const)expect(()=>point(args[0],args[1],args[2])).toThrow(/geometry/);
  expect(()=>point(Number.MAX_VALUE,Number.MAX_VALUE,Number.MIN_VALUE)).toThrow(/overflow/);
 });
 it('recovers wrapped flat separation with pointing-declination cosine and known exact geometric cases',()=>{
  expect(separation(0,0,24,0)).toBe(0);expect(separation(.1,0,23.9,0)).toBeCloseTo(3,12);
  expect(separation(0,60,.1,61)).toBeCloseTo(1.25,13);expect(separation(1,20,1,21)).toBe(1);
  for(const args of [[-1,0,0,0],[25,0,0,0],[0,91,0,0],[0,0,NaN,0]] as const)expect(()=>separation(args[0],args[1],args[2],args[3])).toThrow(/geometry/);
 });
 it('attenuates by supplied fraction and preserves the native zero-fraction30 sentinel',()=>{
  expect(attenuate(10,1)).toBe(10);expect(attenuate(10,.1)).toBe(12.5);expect(attenuate(-5,0)).toBe(30);
  for(const f of [-1,1.01,NaN,Infinity])expect(()=>attenuate(10,f)).toThrow(/fraction/);expect(()=>attenuate(NaN,1)).toThrow(/magnitude/);
 });
 it('combines light in logarithmic flux rather than averaging magnitudes',()=>{
  expect(combine(10,10)).toBeCloseTo(9.247425010840047,12);expect(combine(10,12.5)).toBeCloseTo(9.896518287104438,12);
  expect(()=>combine(-1000,1000)).toThrow(/overflow/);expect(()=>combine(1000,-1000)).toThrow(/overflow/);expect(()=>combine(1,NaN)).toThrow(/magnitude/);
 });
 it('matches independent per-band summed flux for ordered complete known-color neighbors',()=>{
  const r=prepare(vectors.blend.central,vectors.blend.neighbors);for(const k of ['u','b','v'] as const)expect(r[k]).toBeCloseTo(Number(vectors.blend.expected[k]),12);expect(r.includedNeighbors).toBe(2);expect(Object.isFrozen(r)).toBe(true);
  const input=Object.freeze({...star});expect(prepare(input,[])).toEqual({u:10.25,b:10.5,v:10,includedNeighbors:0});
 });
 it('requires known Single colors and a positive central fraction rather than cloning missing colors into a scientific result',()=>{
  for(const bad of [{...star,bMinusV:30},{...star,uMinusB:99}]){expect(()=>prepare(bad,[])).toThrow(/missing-color/);expect(()=>prepare(star,[bad])).toThrow(/missing-color/);}
  expect(()=>prepare({...star,fraction:0},[])).toThrow(/fraction/);expect(()=>prepare({...star,v:Number.MAX_VALUE},[])).toThrow(/magnitude/);
  const precise={...star,v:10.0000001};expect(prepare(precise,[]).v).toBe(Math.fround(precise.v));
 });
 it('skips zero-admission neighbors before color reading, bounds work and preserves arrays',()=>{
  const neighbors=Object.freeze([Object.freeze({...star,fraction:0,v:NaN,bMinusV:99})]);expect(prepare(star,neighbors)).toEqual(prepare(star,[]));expect(neighbors[0].v).toBeNaN();
  expect(()=>prepare(star,Array(10001).fill(star))).toThrow(/neighbors/);expect(()=>prepare(star,[{...star,fraction:-.1}])).toThrow(/fraction/);
 });
});
