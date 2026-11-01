import vectors from '../../data/hubble/galaxy-exposure-vectors.json';
import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {GALAXY_DOMAIN,buildPinnedGalaxyPopulation} from './pinnedGalaxyField';
import {createGalaxyExposure,activateGalaxy,startGalaxy,tickGalaxy,pauseGalaxy,resetGalaxy,verifiedGalaxyConfiguration} from './galaxyExposure';
import {parseGalaxySession,serializeGalaxySession} from '../io/galaxySession';
import {galaxyStampGeometry} from './galaxyScene';
describe('bounded Hubble galaxy field and acquired counts',()=>{
 it('replays original population, geometry and source before assigning amplitudes',()=>{
  const c=verifiedGalaxyConfiguration();expect(c.field.stars).toHaveLength(114);expect(c.field.galaxies).toHaveLength(6);
  expect(c.scene.galaxies.find(g=>g.id==='36773')).toMatchObject({x:468,y:468});
  expect(c.field.stars.some(s=>s.id==='N5230.DAT@332615')).toBe(false);
  const g=c.field.galaxies.find(g=>g.id==='36773')!;expect(galaxyStampGeometry(g)).toMatchObject({major:4,minor:4,level:10});
  expect(c.wavelengths[0]).toBe(4000);expect(c.wavelengths.at(-1)).toBeCloseTo(4998.333333333333);
  expect(c.fraction).toBeGreaterThan(0);expect(c.sourceValues.every(v=>v>0)).toBe(true);
  expect(c.pixelLevel).toBe(vectors.raster.slitLevel);expect(c.fraction).toBe(vectors.raster.fraction);expect(createHash('sha256').update(c.viewport.rgb).digest('hex')).toBe(vectors.raster.cropSHA256);for(const x of vectors.sourceChecks){expect(c.sourceValues[x.bin]).toBeCloseTo(Number(x.valueDecimal),11);expect(c.sourceMeans[x.bin]).toBeCloseTo(Number(x.meanDecimal),16);}
  expect(()=>buildPinnedGalaxyPopulation({...GALAXY_DOMAIN,pointing:{...GALAXY_DOMAIN.pointing,ra:11}})).toThrow();
 });
 it('retains all integer bins and RNG across pause/replay/reset; rejects policy and cached counts',()=>{
  const initial=createGalaxyExposure(1),running=startGalaxy(activateGalaxy(initial));let s=running;for(let i=0;i<10;i++)s=tickGalaxy(s,100);s=pauseGalaxy(s);
  const restored=parseGalaxySession(JSON.parse(serializeGalaxySession(s)));expect(restored.exposure).toEqual(s.exposure);expect(restored.armed).toBe(false);
  for(const v of vectors.vectors){let x=startGalaxy(activateGalaxy(createGalaxyExposure(v.seed)));for(const dt of v.deltas)x=tickGalaxy(x,dt);expect(x.exposure.counts).toEqual(v.counts);expect(x.exposure).toMatchObject({sourceTotal:v.sourceTotal,skyTotal:v.skyTotal,draws:v.draws,seed:v.finalSeed});}
  const reset=resetGalaxy(s);expect(reset.exposure.seed).toBe(s.exposure.seed);expect(reset.exposure.counts.every(n=>n===0)).toBe(true);
  const saved=JSON.parse(serializeGalaxySession(s));for(const change of [(v:any)=>v.domain.minimum=3700,(v:any)=>v.policy='x',(v:any)=>v.counts=[1],(v:any)=>v.sourceSnapshotSHA256='a'.repeat(64)]){const x=structuredClone(saved);change(x);expect(()=>parseGalaxySession(x)).toThrow();}
 });
});
describe('Front S3: the Hubble route on every dialog range',()=>{
 it('a range without the galaxy\'s spectrum is the typed refusal; another range gives a #R policy; the cache stays bounded',async()=>{
  const {galaxyRangeRefusal,createGalaxyExposure,galaxySpectralRange,galaxyRangedCacheKeys,RANGED_CACHE_SIZE}=await import('./galaxyExposure');
  expect(galaxyRangeRefusal('36773',0,{minimum:3500,maximum:3600})).toBe('spectrum-range');
  expect(galaxyRangeRefusal('36773',0,{minimum:3600,maximum:4600})).toBeNull();
  const s=createGalaxyExposure(1,'36773',0,{minimum:3600,maximum:4600});expect(s.policy.endsWith('#R3600-4600')).toBe(true);expect(galaxySpectralRange(s)).toEqual({minimum:3600,maximum:4600});
  let built=0;for(let a=3600;a<=4500;a+=100)for(let b=a+100;b<=5600;b+=100){const r={minimum:a,maximum:b};if(galaxyRangeRefusal('36773',0,r))continue;createGalaxyExposure(1,'36773',0,r);built++;}
  // S3 review 1 L2: the cache holds the most recent RANGED_CACHE_SIZE configurations; the oldest are evicted first.
  const keys=galaxyRangedCacheKeys();expect(built).toBeGreaterThan(RANGED_CACHE_SIZE);expect(keys).toHaveLength(RANGED_CACHE_SIZE);
  expect(keys.at(-1)).toBe('36773:0:4500-5600');expect(keys.some(k=>k.startsWith('36773:0:3600-'))).toBe(false);
  // A hit moves its entry to the newest end.
  const oldest=keys[0];createGalaxyExposure(1,'36773',0,{minimum:Number(oldest.split(':')[2].split('-')[0]),maximum:Number(oldest.split('-').at(-1))});expect(galaxyRangedCacheKeys().at(-1)).toBe(oldest);
 },300000);
});

