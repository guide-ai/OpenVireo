import{projectResource}from'./projectMetadata';
import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import packetSource from '../../data/photometry/pinned-pleiades-v.json';
const packet=projectResource(packetSource);

import vectors from '../../data/photometry/field-vectors.json';

import provenance from '../../data/photometry/field-provenance.json';

import {PINNED_PLEIADES_V_DOMAIN as domain,PINNED_PLEIADES_V_TARGET as target,PhotometerFieldError,queryPhotometerNeighbors,buildPinnedPleiadesField,simulatePinnedPleiadesVPair} from './photometerField';
import {poissonDraw} from './acquisition';

describe('native photometer neighbor producer and pinned original Pleiades field',()=>{
 it('pins fixture hashes and the decoded Extended margin instead of a guessed decimal literal',()=>{
  const constant=provenance.constants.find(c=>c.address==='0x59ad54')!;
  expect(constant.value).toBe(.0025);expect(packet.geometry.queryMarginDegrees).toBe(constant.value);
  expect(constant.numerator).toBe('11805916207174113035');expect(constant.denominator).toBe('4722366482869645213696');
  for(const a of provenance.generatedArtifacts)expect(createHash('sha256').update(readFileSync(new URL('../../'+a.path,import.meta.url))).digest('hex')).toBe(a.sha256);
 });
 it('retains central, order, duplicates, second collection and inclusive radius+.0025 boundary',()=>{
  const center={ra:0,dec:0},a={...center,id:'central'},b={ra:0,dec:.0025,id:'boundary'},c={ra:0,dec:.002500001,id:'outside'},d={ra:24,dec:0,id:'wrap'};
  const result=queryPhotometerNeighbors(center,0,[a,b,c],[d,a]);
  expect(result.map(x=>x.id)).toEqual(['central','boundary','wrap','central']);
  expect(result[0]).not.toBe(a);expect(Object.isFrozen(result[0])).toBe(true);
 });
 it('rejects incomplete/invalid dense inputs and bounded-work violations rather than truncating',()=>{
  const p={ra:0,dec:0};
  for(const radius of [-1,NaN,Infinity,1.001])expect(()=>queryPhotometerNeighbors(p,radius,[],[])).toThrow();
  expect(()=>queryPhotometerNeighbors(p,0,new Array(1),[])).toThrow();
  expect(()=>queryPhotometerNeighbors(p,0,Array(10001).fill(p),[])).toThrow();
  expect(()=>queryPhotometerNeighbors(p,0,[{ra:25,dec:0}],[])).toThrow();
  expect(()=>queryPhotometerNeighbors({ra:0,dec:91},0,[],[])).toThrow();
 });
 it('replays native band search, region enumeration and all admitted sources at both pointings',()=>{
  const object=buildPinnedPleiadesField(domain,'object'),sky=buildPinnedPleiadesField(domain,'sky');
  expect(object.stars.map(s=>s.nativeName)).toEqual(['N2230-00836','N2230-00954','N2230-00478']);
  expect(sky.stars.map(s=>s.nativeName)).toEqual(['N2230-00836','N2230-00954','N2230-00584','N2230-00478']);
  expect(object.neighbors.map(s=>s.id)).toEqual([target.catalogId]);expect(sky.neighbors).toEqual([]);
  expect(object.selected.id).toBe(target.catalogId);expect(sky.selected.id).toBe(target.catalogId);
  expect(object.selectedDistancePixels).toBe(0);expect(sky.selectedDistancePixels).toBeCloseTo(187.2,8);
  expect(Object.isFrozen(object.stars)).toBe(true);expect(Object.isFrozen(object.selected)).toBe(true);
 });
 it('binds original names/coordinates and exact native Single UBV, preserving the different hotlist prefix',()=>{
  const s=buildPinnedPleiadesField(domain,'object').selected;
  expect(target.hotlistRecord).toBe(1);expect(target.hotlistLabel).toBe('01803-00478');expect(s.nativeName).toBe('N2230-00478');
  expect({ra:s.ra,dec:s.dec}).toEqual(target.pointing);
  expect(s.magnitude).toBe(9.470000267028809);expect(s.photometry2Single).toBe(.47999998927116394);expect(s.photometry3Single).toBe(.009999999776482582);
  for(const f of packet.fields)for(const r of f.admitted)expect(createHash('sha256').update(Buffer.from(r.rawHex,'hex')).digest('hex')).toBe(r.recordSha256);
 });
 it('requires the exact declared fresh profile and never certifies another field/telescope/history',()=>{
  for(const changed of [{baseFieldArcminutes:15},{telescopeRecord:1},{exerciseMode:0},{history:'resumed'},{apertureSelector:11},{seeingDiskSingle:2},{filters:['B']},{secondsPerIntegration:1},{integrations:2},{preparedZeroPoint:4},{extra:undefined}])expect(()=>buildPinnedPleiadesField({...domain,...changed},'object')).toThrow(PhotometerFieldError);
  expect(()=>buildPinnedPleiadesField(null,'object')).toThrow();
  expect(()=>buildPinnedPleiadesField(domain,'other' as 'sky')).toThrow();
  const copy=structuredClone(domain);expect(buildPinnedPleiadesField(copy,'object').stars).toHaveLength(3);
  expect(Object.isFrozen(domain.filters)).toBe(true);
 });
 it('has whole-original-file absence witnesses, not an isolation claim based on distance',()=>{
  expect(packet.sources).toHaveLength(9);expect(packet.sources.every(s=>/^[a-f0-9]{64}$/.test(s.sha256))).toBe(true);
  for(const f of packet.fields){
   expect(f.regionIds).toEqual([1803]);expect(f.bandOrder).toEqual(['N2230']);
   expect(f.absenceCertificates.map(c=>c.recordsChecked)).toEqual([31147,2269,24069,183]);
   expect(f.absenceCertificates.every(c=>c.allPositionMatches.length===0)).toBe(true);
   expect(f.wholeBandAdmissionMatches&&f.exactRationalAdmissionMatches&&f.adjacentKeyControlsMatch).toBe(true);
   expect(f.band.recordCount).toBe(1065481);
  }
 });
 it('matches independent analytic aperture/flux and preserves the nonzero sky source sentinel',()=>{
  const object=buildPinnedPleiadesField(domain,'object'),sky=buildPinnedPleiadesField(domain,'sky');
  expect(object.centralFraction).toBeCloseTo(Number(vectors.means.centralFraction),7);
  expect(object.sourceMean).toBeCloseTo(Number(vectors.means.objectSourceMean),4);
  expect(object.skyMean).toBeCloseTo(Number(vectors.means.skyMean),13);
  expect(sky.centralFraction).toBe(0);expect(sky.sourceMagnitude).toBe(30);
  expect(sky.sourceMean).toBeCloseTo(Number(vectors.means.skySourceMean),18);expect(sky.sourceMean).toBeGreaterThan(0);
 });
 it.each(vectors.pairs)('links source then sky random draws and reduction for seed $seed against an independent reference',v=>{
  const result=simulatePinnedPleiadesVPair(domain,v.seed);
  for(const key of ['sky','object'] as const){
   const actual=result[key],expected=v[key];
   for(const field of ['sourceCount','skyCount','totalPhotonCount','seed','draws'] as const)expect(actual[field]).toBe(expected[field]);
   expect(actual.nativeBaseCountSum).toBe(1000);expect(actual.timerWaitMs).toBe(100);
  }
  expect(result.object.initialSeed).toBe(result.sky.seed);
  expect(result.reduction.integrationSeconds).toBe(.1);expect(result.reduction.baseCountRate).toBe(10000);
  expect(result.reduction.netCountRate).toBe(v.netCountRate);expect(result.reduction.status).toBe('available');
  expect(result.reduction.magnitude).toBeCloseTo(Number(v.magnitude),12);
  expect(result.reduction.magnitude).not.toBe(Number(vectors.means.catalogVSingle));
  expect(result.kind).toContain('not an original observation');
 });
 it('exposes the rare nonzero source count at zero aperture and preserves channel attribution',()=>{
  const result=simulatePinnedPleiadesVPair(domain,vectors.rareSkySourceSeed);
  expect(result.sky.sourceCount).toBe(1);
  const wrongZeroSource=poissonDraw(0,vectors.rareSkySourceSeed);
  expect(wrongZeroSource.value).toBe(0);
  const wrongSky=poissonDraw(Number(vectors.means.skyMean),wrongZeroSource.seed);
  expect(wrongSky.value).toBe(1);expect(result.sky.skyCount).toBe(0);
  // This particular control happens to preserve total and final seed while
  // moving one photon between channels. Do not assert a stream difference.
  expect(wrongSky.seed).toBe(result.sky.seed);
 });
 it('replays deterministically, rejects invalid seeds and does not mutate a supplied profile',()=>{
  const copy=structuredClone(domain),before=structuredClone(copy);
  const result=simulatePinnedPleiadesVPair(copy,42);expect(simulatePinnedPleiadesVPair(copy,42)).toEqual(result);expect(copy).toEqual(before);
  expect(Object.isFrozen(result)).toBe(true);expect(Object.isFrozen(result.object)).toBe(true);
  for(const seed of [-1,.5,2**32,NaN])expect(()=>simulatePinnedPleiadesVPair(domain,seed)).toThrow();
 });
});
