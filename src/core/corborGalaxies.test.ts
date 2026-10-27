import independentVectors from '../../data/hubble/corbor-independent-vectors.json';
import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import cached from '../../data/hubble/corbor-cached-provenance.json';
import workbook from '../../data/hubble/workbook-examples.json';
import source from '../../data/hubble/galaxy-source.json';
import oldVectors from '../../data/hubble/galaxy-exposure-vectors.json';
import first from '../../data/hubble/galaxy-36747-vectors.json';
import second from '../../data/hubble/galaxy-54876-vectors.json';
import {activateGalaxy,createGalaxyExposure,galaxyDefinition,galaxyPolicyDefinition,pauseGalaxy,replayGalaxy,startGalaxy,tickGalaxy,verifiedGalaxyConfiguration,galaxyTelescopeIndex} from './galaxyExposure';
import {GALAXY_FIELD_REGISTRY,buildPinnedGalaxyPopulation,galaxyDomainFor,type NativeGalaxy} from './pinnedGalaxyField';
import {galaxyDistanceReference,GALAXY_TARGETS} from './galaxyIdentity';
import {galaxyCatalogAxes} from './galaxyCatalogAxes';
import {galaxyStampGeometry,paintAdaptedGalaxy} from './galaxyScene';
import {galaxyTargetTelescopeSupported} from './galaxyTelescope';
import {parseGalaxySession,serializeGalaxySession} from '../io/galaxySession';
import {HUBBLE_HOT_LIST} from './hubbleHotList';
const targets=GALAXY_TARGETS;
const sha=(b:Uint8Array|Uint8ClampedArray)=>createHash('sha256').update(b).digest('hex');
const relative=(a:number,b:number)=>Math.abs(a/b-1);
// Operator-independent seeds and tick splits; these are determinism/replay trajectories, not independent expected-count vectors.
const trajectories:readonly {seed:number;deltas:readonly number[]}[]=[{seed:1,deltas:[1000]},{seed:2,deltas:Array(10).fill(100)},{seed:4294967295,deltas:[16,17,16,17,934]},{seed:123456789,deltas:Array(10).fill(1000)},{seed:2037932076,deltas:[1,999,0,1000]}];
describe('CorBor – 1/3 through the recovered cached-pan view of the verified 54876 field (0.4 m only)',()=>{
 it('registers only verified descriptors and keeps the base field domain unchanged',()=>{
  expect(GALAXY_FIELD_REGISTRY.map(d=>d.id).sort()).toEqual(GALAXY_TARGETS.map(t=>t.id).sort());
  expect(GALAXY_FIELD_REGISTRY.filter(d=>d.kind==='cached').map(d=>d.kind==='cached'?[d.id,d.baseId,d.recordIndex]:[])).toEqual([['54875','54876',18485],['54891','54876',18493]]);
  for(const t of cached.targets){
   expect(()=>galaxyDomainFor(t.id)).toThrow();const d=galaxyDefinition(t.id);
   expect(d.domain.pointing).toEqual(cached.baseFieldCenter);expect(d.domain).toMatchObject({...galaxyDomainFor('54876'),view:{policy:cached.viewPolicy,baseFieldId:'54876'}});
   const view=(d.domain as unknown as {view:{pointing:{ra:number;dec:number}}}).view,target=targets.find(x=>x.id===t.id)!;
   expect(view.pointing).toEqual({ra:target.ra,dec:target.dec});expect(view.pointing).not.toEqual(cached.baseFieldCenter);
   const htl=HUBBLE_HOT_LIST[t.htlRow];expect(htl.id).toBe(t.id);expect(view.pointing).not.toEqual({ra:htl.ra,dec:htl.dec});
   expect(d.fieldSnapshotSHA256).toBe(galaxyDefinition('54876').fieldSnapshotSHA256);expect(d.policyId).toBe(target.policyId);expect(galaxyPolicyDefinition(t.policyId)).toBe(d);
   expect(()=>buildPinnedGalaxyPopulation(d.domain)).toThrow();expect(()=>buildPinnedGalaxyPopulation({...galaxyDomainFor('54876'),pointing:view.pointing})).toThrow();
  }
 });
 for(const t of cached.targets)it(`${t.id}: base cache, pan rectangle, slit selection, calibration, source and five trajectories`,()=>{
  const base=verifiedGalaxyConfiguration('54876'),c=verifiedGalaxyConfiguration(t.id),target=targets.find(x=>x.id===t.id)!;
  expect(c.field.stars).toHaveLength(141);expect(c.field.galaxies.map(g=>g.id)).toEqual(['54868','54870','54876','54875','54891','54890']);
  expect(c.field.stars.map(s=>s.id)).toEqual(base.field.stars.map(s=>s.id));expect(c.field.galaxies).toEqual(base.field.galaxies);expect(c.scene.frame.center).toEqual(cached.baseFieldCenter);
  const view=c.view!;expect(view.pan.rect).toEqual(t.rect);expect(view.pan.query).toEqual(t.anchor);expect(view.pan.unrounded.left).toBeGreaterThan(0);expect(view.pan.unrounded.top).toBeLessThan(624);
  const s=view.selection;expect(s.kind).toBe('galaxy');if(s.kind!=='galaxy')return;
  expect(s.object.id).toBe(t.id);expect(s.galaxyRadius).toBe(3);expect(s.galaxy.distance).toBeGreaterThan(0);expect(s.galaxy.distance).toBeCloseTo(t.selectionDistance,9);expect(s.galaxy.distance).toBeLessThan(s.galaxyRadius);
  const g=c.field.galaxies[view.targetIndex] as NativeGalaxy;expect([g.id,g.recordIndex,g.ra,g.dec,g.magnitude]).toEqual([target.id,target.recordIndex,target.ra,target.dec,target.magnitude]);
  if(t.id==='54891'){const twin=c.field.galaxies[view.targetIndex+1];expect(twin.id).toBe('54890');expect([twin.ra,twin.dec]).toEqual([g.ra,g.dec]);expect(c.scene.galaxies[view.targetIndex+1]).toMatchObject({x:c.scene.galaxies[view.targetIndex].x,y:c.scene.galaxies[view.targetIndex].y});}
  // Copied, not re-rendered: where the panned rectangle overlaps the fresh 54876 crop, the pixels are identical.
  const dx=t.rect.left-312,dy=t.rect.top-312;let compared=0;
  for(let y=0;y<312;y++)for(let x=0;x<312;x++){const bx=x+dx,by=y+dy;if(bx<0||by<0||bx>=312||by>=312)continue;const a=(y*312+x)*3,b=(by*312+bx)*3;if(c.viewport.rgb[a]!==base.viewport.rgb[b])throw new Error(`pixel ${x},${y}`);compared++;}
  expect(compared).toBe((312-Math.abs(dx))*(312-Math.abs(dy)));expect(sha(c.viewport.rgb)).not.toBe(sha(base.viewport.rgb));
  expect(c.pixelLevel).toBe(t.pixelLevel);expect(c.fraction).toBe(t.fraction);expect(c.fraction).toBe((t.pixelLevel/200)**2);expect(c.zeroPoint).toBe(4);
  expect(relative(c.amplitude.source,t.sourceAmplitude)).toBeLessThan(1e-12);const max=Math.max(...c.sourceMeans)*50*1000;expect(relative(max,t.maxSourcePoissonMean)).toBeLessThan(1e-12);expect(max).toBeLessThan(12);
  // Fallback template at 1+catalogue Single z: all 600 channels inside the shifted 3650..7000 Å source, no continuation.
  expect(source.matched).toBe(false);expect(cached.spectrumSource.matched).toBe(false);expect(c.wavelengths).toHaveLength(600);expect(c.wavelengths[0]).toBe(4000);expect(c.wavelengths.at(-1)).toBeCloseTo(4998.333333333333,9);
  const factor=1+Math.fround(g.redshift);expect(3650*factor).toBeLessThan(4000);expect(7000*factor).toBeGreaterThan(c.wavelengths.at(-1)!);expect(c.sourceValues.every(v=>v>0)).toBe(true);
  // Stamp geometry: radius max(3, 0.2′·20.8/2) = 3; CorBor – 3 minor radius is the exact half tie 1.5 → nearest-even 2.
  const geometry=galaxyStampGeometry(g);expect(geometry.major).toBe(3);expect(geometry.minor).toBe(t.id==='54891'?2:3);if(t.id==='54891')expect(3*galaxyCatalogAxes(g).ratio).toBe(1.5);
  // Position angle 0: Dec-derived angle; the stamp does not change under a ±1e-9 rad perturbation.
  const blank={width:41,height:41,rgb:new Uint8Array(41*41*3)},stamp=(dec:number)=>sha(paintAdaptedGalaxy(blank,{...g,dec},{x:20,y:20}).image.rgb),step=1e-9/(2*Math.PI*1000);
  expect(stamp(g.dec+step)).toBe(stamp(g.dec));expect(stamp(g.dec-step)).toBe(stamp(g.dec));
  for(const v of trajectories){
   let x=startGalaxy(activateGalaxy(createGalaxyExposure(v.seed,t.id)));for(const dt of v.deltas)x=tickGalaxy(x,dt);const paused=pauseGalaxy(x);
   expect(paused.policy).toBe(t.policyId);expect(galaxyTelescopeIndex(paused)).toBe(0);expect(paused.exposure.counts).toHaveLength(600);expect(paused.exposure.counts.every(n=>Number.isInteger(n)&&n>=0)).toBe(true);
   expect(paused.exposure.elapsedMs).toBe(v.deltas.reduce((a,b)=>a+b,0));
   expect(replayGalaxy(v.seed,paused.events,t.id).exposure).toEqual(paused.exposure);
   const saved=JSON.parse(serializeGalaxySession(paused));expect(saved.version).toBe(1);expect(saved.fieldSnapshotSHA256).toBe(cached.baseFieldSnapshotSHA256);expect(parseGalaxySession(saved).exposure).toEqual(paused.exposure);
   for(const change of [(j:any)=>j.policy=galaxyDefinition('54876').policyId,(j:any)=>j.policy=cached.targets.find(o=>o.id!==t.id)!.policyId,(j:any)=>j.domain.pointing=j.domain.view.pointing,(j:any)=>delete j.domain.view,(j:any)=>j.domain.view.pointing.dec+=1e-9,(j:any)=>j.fieldSnapshotSHA256='a'.repeat(64),(j:any)=>j.version=2]){const y=structuredClone(saved);change(y);expect(()=>parseGalaxySession(y)).toThrow();}
  }
  const counts=trajectories.map(v=>{let x=startGalaxy(activateGalaxy(createGalaxyExposure(v.seed,t.id)));x=tickGalaxy(x,1000);return x.exposure.counts.join();});expect(new Set(counts).size).toBeGreaterThan(1);
 });
 it('KPNO 0.9 m and Mayall 4 m are not claimed for the new targets and are never substituted',()=>{
  for(const t of cached.targets)for(const index of [1,2] as const){expect(galaxyTargetTelescopeSupported(t.id,index)).toBe(false);expect(()=>galaxyDefinition(t.id,index)).toThrow();expect(()=>verifiedGalaxyConfiguration(t.id,index)).toThrow();expect(()=>createGalaxyExposure(1,t.id,index)).toThrow();}
  for(const id of ['36773','36747','54876'])for(const index of [0,1,2])expect(galaxyTargetTelescopeSupported(id,index)).toBe(true);
 });
 it('workbook V references are separate reference inputs, never measurements',()=>{
  for(const t of cached.targets){const r=galaxyDistanceReference(t.id),w=workbook.rows.find(w=>w.targetId===t.id)!;expect(r.apparentV).toBe(w.apparentV);expect(r.apparentV).toBe(t.apparentV);expect(r.source).toBe(`Hubble Data.xls · ${t.workbookCell}`);expect(`Sheet1!C${w.worksheetRow}`).toBe(t.workbookCell);expect(Object.keys(r).sort()).toEqual(['apparentV','id','sha256','source']);}
 });
 it('the old three keep their fresh distance-0 view, crops, levels and fixtures',()=>{
  for(const [id,fixture] of [['36773',oldVectors],['36747',first],['54876',second]] as const){
   const c=verifiedGalaxyConfiguration(id);expect(c.view).toBeNull();expect(c.scene.galaxies.find(g=>g.id===id)).toMatchObject({x:468,y:468});
   expect(c.pixelLevel).toBe(fixture.raster.slitLevel);expect(c.fraction).toBe(fixture.raster.fraction);expect(sha(c.viewport.rgb)).toBe(fixture.raster.cropSHA256);
   for(const v of fixture.vectors){let x=startGalaxy(activateGalaxy(createGalaxyExposure(v.seed,id)));for(const dt of v.deltas)x=tickGalaxy(x,dt);expect(x.exposure.counts).toEqual(v.counts);}
  }
 });
 it('matches ten independently computed baseline-field trajectories with distinct initial/final seeds',()=>{
  for(const row of independentVectors.targets){
   const c=verifiedGalaxyConfiguration(row.id);expect(sha(c.viewport.rgb)).toBe(row.cropSHA256);
   for(const v of row.trajectories){let s=startGalaxy(activateGalaxy(createGalaxyExposure(v.initialSeed,row.id)));for(const dt of v.deltas)s=tickGalaxy(s,dt);s=pauseGalaxy(s);const e=s.exposure;
    expect({elapsedMs:e.elapsedMs,sourceTotal:e.sourceTotal,skyTotal:e.skyTotal,seed:e.seed,draws:e.draws,countsJsonSHA256:createHash('sha256').update(JSON.stringify(e.counts)).digest('hex')}).toEqual({elapsedMs:v.elapsedMs,sourceTotal:v.sourceTotal,skyTotal:v.skyTotal,seed:v.seed,draws:v.draws,countsJsonSHA256:v.countsJsonSHA256});
   }
  }
 });

});
