import{projectResource}from'./projectMetadata';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vectors from '../../data/hubble/star-exposure-vectors.json';

import provenanceSource from '../../data/hubble/star-exposure-provenance.json';
const provenance=projectResource(provenanceSource);

import {parseStarSession,serializeStarSession,readStarSession,MAX_STAR_SESSION_BYTES} from '../io/starSession';
import {serializeSkySession} from '../io/skySession';
import {prepareNativeStarProfile} from './starProfiles';
import {describe,it,expect} from 'vitest';
import {createStarExposure,verifiedStarConfiguration,STAR_TARGET,STAR_DOMAIN,activateStar,startStar,tickStar,pauseStar,resetStar,starCountsCsv,replayStar} from './starExposure';
import {buildPinnedStarPopulation} from './pinnedNativeField';
import {skyCountsCsv} from './skyExposure';
describe('catalog star acquisition proof',()=>{
 it('reconstructs the complete separate field, original template, raster, selection and means',()=>{
  const c=verifiedStarConfiguration();expect(c.field.stars).toHaveLength(128);expect(c.field.galaxies).toHaveLength(0);expect(c.scene.stars.find(s=>s.id===STAR_TARGET.id)).toMatchObject({x:468,y:468});expect(c.viewport.width).toBe(312);expect(c.pixelLevel).toBeGreaterThan(0);expect(c.fraction).toBe(1);expect(c.sourceMeans).toHaveLength(600);expect(Math.max(...c.sourceMeans)*50000).toBeLessThan(12);expect(()=>buildPinnedStarPopulation({...STAR_DOMAIN,pointing:{ra:.5,dec:0}})).toThrow();
 });
 it('pins both bundled scientific snapshots and the recovered index-path binding',()=>{
  for(const [name,digest]of [['pinned-star-field.json',provenance.fieldSnapshotSHA256],['star-source.json',provenance.sourceSnapshotSHA256]])expect(createHash('sha256').update(readFileSync(new URL('../../data/hubble/'+name,import.meta.url))).digest('hex')).toBe(digest);
  expect(provenance.spectralIndexBinding.defaultPath).toBe('SPECTRA\\JSPECT2\\JSPEC2.SPI');expect(provenance.spectralIndexBinding.fileAlreadyOrdered).toBe(false);expect(provenance.spectralIndexBinding.exactMatchSortedRow).toBe(103);
 });
 it('matches the independent complete viewport and slit sum, including native level clamping',()=>{
  const c=verifiedStarConfiguration();expect(createHash('sha256').update(c.viewport.rgb).digest('hex')).toBe(vectors.raster.cropSHA256);expect(c.pixelLevel).toBe(vectors.raster.slitLevel);expect(provenance.rasterVerification.targetPaint).toEqual({stored:13,level:14,magnitudeSingle:STAR_TARGET.magnitudeSingle});expect(Math.max(...prepareNativeStarProfile(0))).toBe(255);
  for(const v of vectors.sourceChecks){expect(Math.abs(c.sourceValues[v.bin]-Number(v.valueDecimal))).toBeLessThan(1e-11);expect(Math.abs(c.sourceMeans[v.bin]-Number(v.meanDecimal))).toBeLessThan(1e-15);}
 });
 for(const v of vectors.vectors)it(`matches independent Decimal100 source+sky counts ${v.seed}/${v.deltas.join(',')}`,()=>{
  let s=startStar(activateStar(createStarExposure(v.seed)));for(const dt of v.deltas)s=tickStar(s,dt);s=pauseStar(s);expect(s.exposure.counts).toEqual(v.counts);expect(s.exposure.sourceTotal).toBe(v.sourceTotal);expect(s.exposure.skyTotal).toBe(v.skyTotal);expect(s.exposure.draws).toBe(v.draws);expect(s.exposure.seed).toBe(v.finalSeed);
 });
 it('bounds timing atomically and binds portable replay to object, source and field',async()=>{
  const active=startStar(activateStar(createStarExposure(1)));for(const d of [-1,.1,1001,Infinity])expect(()=>tickStar(active,d)).toThrow();expect(active.exposure.draws).toBe(0);
  const state=pauseStar(tickStar(active,100)),json=serializeStarSession(state),r=parseStarSession(JSON.parse(json));expect(r.armed).toBe(false);expect(r.exposure).toEqual(state.exposure);expect(starCountsCsv(r)).toBe(starCountsCsv(state));expect(()=>serializeSkySession(state)).toThrow();
  const original=JSON.parse(json)as Record<string,unknown>;for(const patch of [{counts:[1]},{sourceSnapshotSHA256:'changed'},{fieldSnapshotSHA256:'unknown'},{domain:{}},{events:[{kind:'start'}]},{events:[{kind:'start'},{kind:'tick',deltaMs:1001},{kind:'pause'}]}])expect(()=>parseStarSession({...original,...patch})).toThrow();
  await expect(readStarSession({size:MAX_STAR_SESSION_BYTES+1,arrayBuffer:()=>{throw Error('must not read');}}as unknown as File)).rejects.toThrow();
 });
 it('uses source then sky draws; pause/replay and reset retain their documented boundaries',()=>{
  let s=tickStar(startStar(activateStar(createStarExposure(1))),100);expect(s.exposure.sourceTotal).toBeGreaterThan(0);expect(s.exposure.counts.reduce((a,b)=>a+b,0)).toBe(s.exposure.sourceTotal+s.exposure.skyTotal);expect(s.exposure.draws).toBeGreaterThan(1200);s=pauseStar(s);expect(replayStar(1,s.events).exposure).toEqual(s.exposure);expect(starCountsCsv(s)).toContain('browser-catalog-star-exposure');expect(()=>skyCountsCsv(s)).toThrow();const seed=s.exposure.seed;s=resetStar(startStar(s));expect(s.seedAtReset).toBe(seed);expect(s.exposure.sourceTotal).toBe(0);expect(s.exposure.seed).toBe(seed);
 });
});
