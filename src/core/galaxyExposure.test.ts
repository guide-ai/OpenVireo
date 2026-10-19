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
