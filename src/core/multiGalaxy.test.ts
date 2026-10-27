import workbook from '../../data/hubble/workbook-examples.json';
import {galaxyDistanceReference} from './galaxyIdentity';
import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import first from '../../data/hubble/galaxy-36747-vectors.json';
import second from '../../data/hubble/galaxy-54876-vectors.json';
import {createGalaxyExposure,activateGalaxy,startGalaxy,tickGalaxy,pauseGalaxy,verifiedGalaxyConfiguration,galaxyDefinition} from './galaxyExposure';
import {parseGalaxySession,serializeGalaxySession} from '../io/galaxySession';
import {galaxyCatalogAxes,catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import {galaxyStampGeometry} from './galaxyScene';
describe('multiple independently pinned original Hubble fields',()=>{
 it('keeps documented V references separate from model shifts and student results',()=>{for(const id of ['36773','36747','54876']){const r=galaxyDistanceReference(id),w=workbook.rows.find(w=>w.targetId===id)!;expect(r.apparentV).toBe(w.apparentV);expect(r.source).toBe(`Hubble Data.xls · Sheet1!C${w.worksheetRow}`);expect(r.sha256).toBe(workbook.sha256);expect(Object.keys(r).sort()).toEqual(['apparentV','id','sha256','source']);}});
 for(const [id,fixture,stars,galaxies] of [['36747',first,109,7],['54876',second,141,6]] as const){
  it(`${id}: complete population, adapted crop, spectrum and five independent count trajectories`,()=>{
   const c=verifiedGalaxyConfiguration(id);expect(c.field.stars).toHaveLength(stars);expect(c.field.galaxies).toHaveLength(galaxies);
   expect(c.scene.galaxies.find(g=>g.id===id)).toMatchObject({x:468,y:468});expect(c.pixelLevel).toBe(fixture.raster.slitLevel);expect(c.fraction).toBe(fixture.raster.fraction);expect(createHash('sha256').update(c.viewport.rgb).digest('hex')).toBe(fixture.raster.cropSHA256);
   for(const check of fixture.sourceChecks){expect(c.sourceValues[check.bin]).toBeCloseTo(Number(check.valueDecimal),11);expect(c.sourceMeans[check.bin]).toBeCloseTo(Number(check.meanDecimal),16);}
   for(const v of fixture.vectors){let s=startGalaxy(activateGalaxy(createGalaxyExposure(v.seed,id)));for(const dt of v.deltas)s=tickGalaxy(s,dt);expect(s.exposure.counts).toEqual(v.counts);expect(s.exposure).toMatchObject({sourceTotal:v.sourceTotal,skyTotal:v.skyTotal,seed:v.finalSeed,draws:v.draws});const saved=JSON.parse(serializeGalaxySession(pauseGalaxy(s)));expect(parseGalaxySession(saved).policy).toBe(galaxyDefinition(id).policyId);saved.policy=galaxyDefinition('36773').policyId;expect(()=>parseGalaxySession(saved)).toThrow();}
  });
 }
 it('preserves reversed equal-coordinate insertion and the observed zero-axis branch without Single narrowing',()=>{
  const galaxies=verifiedGalaxyConfiguration('54876').field.galaxies;expect(galaxies.slice(-2).map(g=>g.id)).toEqual(['54891','54890']);
  const zero=galaxies.find(g=>g.id==='54868')!;expect(galaxyCatalogAxes(zero)).toEqual({major:.5,minor:.3,ratio:.6,fallback:true});expect(catalogGalaxyMagnitude(zero).minorArcminutes).toBe(.3);expect(catalogGalaxyMagnitude(zero).minorArcminutes).not.toBe(Math.fround(.3));expect(galaxyStampGeometry(zero)).toMatchObject({major:5,minor:3,level:11});
  expect(()=>galaxyCatalogAxes({...zero,morphology:20})).toThrow();expect(()=>createGalaxyExposure(1,'54890')).toThrow();
 });
});
