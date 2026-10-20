import{projectResource}from'./projectMetadata';
import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vectors from '../../data/hubble/kpno09-star-vectors.json';

import proofSource from '../../data/hubble/kpno09-star-provenance.json';
const proof=projectResource(proofSource);

import {buildPinnedKpno09StarPopulation,PINNED_KPNO09_STAR_DOMAIN} from './pinnedNativeField';
import {verifiedStarConfiguration,createStarExposure,activateStar,startStar,tickStar,deactivateStar,resetStar,starTelescopeIndex,KPNO09_STAR_PROOF_SHA256,starCountsCsv} from './starExposure';
const hash=(v:Uint8Array|Uint8ClampedArray)=>createHash('sha256').update(v).digest('hex');
describe('KPNO0.9m original fixed star acquisition',()=>{
 it('binds the exact original-calibration packet and complete independent whole-source population',()=>{
  expect(hash(readFileSync(new URL('../../data/hubble/kpno09-star-provenance.json',import.meta.url)))).toBe(KPNO09_STAR_PROOF_SHA256);
  expect(hash(readFileSync(new URL('../../data/hubble/kpno09-star-vectors.json',import.meta.url)))).toBe(proof.independentVectorsSHA256);
  const p=buildPinnedKpno09StarPopulation(PINNED_KPNO09_STAR_DOMAIN);expect(p.stars).toHaveLength(128);expect(p.regionIds).toEqual([3,10,4665,4672]);expect(p.domain.telescopeRecord).toBe(1);
  expect(()=>buildPinnedKpno09StarPopulation({...PINNED_KPNO09_STAR_DOMAIN,telescopeRecord:2})).toThrow();
 });
 it('repaints the recovered full raster, changes the native zero/sky amplitude and retains centered star slit admission',()=>{
  const c=verifiedStarConfiguration(1);expect(hash(c.viewport.rgb)).toBe(vectors.raster.cropSHA256);expect(c.pixelLevel).toBe(77);expect(c.fraction).toBe(1);expect(c.zeroPoint).toBe(6);expect(c.amplitude.sky).toBeCloseTo(0.00000630957344480193,19);expect(c.sourceMeans.length).toBe(600);for(const v of vectors.sourceChecks){expect(Math.abs(c.sourceValues[v.bin]-Number(v.valueDecimal))).toBeLessThan(1e-11);expect(Math.abs(c.sourceMeans[v.bin]-Number(v.meanDecimal))).toBeLessThan(1e-15);}expect(Math.max(...c.sourceMeans)*50*300).toBeLessThan(12);expect(Math.max(...c.sourceMeans)*50*1000).toBeGreaterThan(12);
  expect(verifiedStarConfiguration().pixelLevel).toBe(41);expect(verifiedStarConfiguration().zeroPoint).toBe(4);expect(()=>verifiedStarConfiguration(3 as 1)).toThrow();
 });
 it.each(vectors.vectors)('matches all600 independent Decimal100 counts/RNG for seed$seed and intervals$deltas',v=>{
  let s=startStar(activateStar(createStarExposure(v.seed,1)));for(const delta of v.deltas)s=tickStar(s,delta);
  expect(s.exposure.counts).toEqual(v.counts);expect(s.exposure.sourceTotal).toBe(v.sourceTotal);expect(s.exposure.skyTotal).toBe(v.skyTotal);expect(s.exposure.seed).toBe(v.finalSeed);expect(s.exposure.draws).toBe(v.draws);expect(starTelescopeIndex(s)).toBe(1);
 });
 it('rejects unsupported long intervals atomically, retains native RNG on reset and labels alternate CSV without retagging profile0',()=>{
  const running=tickStar(startStar(activateStar(createStarExposure(1,1))),100),before=JSON.stringify(running);expect(()=>tickStar(running,301)).toThrow();expect(()=>tickStar(running,1000)).toThrow();expect(JSON.stringify(running)).toBe(before);const stopped=deactivateStar(running),reset=resetStar(stopped);expect(reset.exposure.seed).toBe(stopped.exposure.seed);expect(reset.exposure.sourceMeans).toEqual(stopped.exposure.sourceMeans);expect(starCountsCsv(stopped)).toContain('telescope_record,telescope_zero_point,optical_profile_sha256,configuration_sha256');expect(starCountsCsv(deactivateStar(tickStar(startStar(activateStar(createStarExposure(1))),100)))).not.toContain('telescope_record');
 });
});
