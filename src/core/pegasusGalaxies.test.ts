import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import vectors from '../../data/hubble/pegasus-independent-vectors.json';
import cached from '../../data/hubble/pegasus-cached-provenance.json';
import provenance from '../../data/hubble/pegasus-field-provenance.json';
import snapshot from '../../data/hubble/pinned-pegasus-field.json';
import pegasusTargets from '../../data/hubble/pegasus-targets.json';
import references from '../../data/hubble/pegasus-distance-references.json';
import source from '../../data/hubble/galaxy-source.json';
import {activateGalaxy,createGalaxyExposure,galaxyDefinition,galaxyPolicyDefinition,pauseGalaxy,replayGalaxy,startGalaxy,tickGalaxy,verifiedGalaxyConfiguration,galaxyTelescopeIndex} from './galaxyExposure';
import {GALAXY_FIELD_REGISTRY,buildPinnedGalaxyPopulation,galaxyDomainFor} from './pinnedGalaxyField';
import {buildPinnedPegasusPopulation,PEGASUS_FIELD_DOMAIN} from './pinnedPegasusField';
import {galaxyDistanceReference,galaxyIdentity,GALAXY_TARGETS} from './galaxyIdentity';
import {galaxyCatalogAxes,catalogGalaxyMagnitude} from './galaxyCatalogAxes';
import {galaxyStampGeometry,paintAdaptedGalaxy} from './galaxyScene';
import {galaxyTargetTelescopeSupported} from './galaxyTelescope';
import {selectCatalogObject} from './objectSelection';
import {roundNearestEven} from './numericPolicy';
import {parseGalaxySession,serializeGalaxySession} from '../io/galaxySession';
import {HUBBLE_HOT_LIST,hubbleRowStatus} from './hubbleHotList';
const sha=(b:Uint8Array|Uint8ClampedArray)=>createHash('sha256').update(new Uint8Array(b.buffer,b.byteOffset,b.byteLength)).digest('hex');
const relative=(a:number,b:number)=>Math.abs(a/b-1);
const ids=['NGC 7499','NGC 7501','NGC 7503'] as const,BASE='NGC 7501',HI_PEG_STAR='N0000.DAT@1141949';
// Operator-independent seeds and tick splits: determinism/replay trajectories, not independent expected-count vectors.
const trajectories:readonly {seed:number;deltas:readonly number[]}[]=[{seed:1,deltas:[1000]},{seed:2,deltas:Array(10).fill(100)},{seed:4294967295,deltas:[16,17,16,17,934]},{seed:123456789,deltas:Array(10).fill(1000)},{seed:2037932076,deltas:[1,999,0,1000]}];
const vector=(id:string)=>vectors.targets.find(v=>v.id===id)!;
describe('Pegasus NGC 7501 field: stars, QSO/photo absence, HI Peg false merge, galaxy cleanup (0.4 m only)',()=>{
 it('preserves the original vector computation binding and verifies the metadata-only snapshot rebinding',()=>{
  expect(vectors.UTC).toBe('2026-10-27T15:37:22.221170+00:00');
  expect(vectors.computedAgainstFieldSnapshotSHA256).toBe('47c6dc0a9453489c408db8978f289db08b26e8bf5c1e690d67cb0f8b98fcb1dd');
  expect(vectors.fieldSnapshotSHA256).toBe(provenance.fieldSnapshotSHA256);expect(vectors).not.toHaveProperty('sourceSnapshotSHA256');
  expect(vectors.snapshotBinding.unchangedNumericalPayloadSHA256).toMatch(/^[a-f0-9]{64}$/);
 });

 it('reproduces the 140-star, four-galaxy population in the recorded record-0 domain only',()=>{
  const field=buildPinnedPegasusPopulation(PEGASUS_FIELD_DOMAIN);
  expect(field.stars.map(s=>s.id)).toEqual(snapshot.expectedFinalIds);expect(field.stars).toHaveLength(vectors.stars);
  expect(field.galaxies.map(g=>[g.id,g.recordIndex])).toEqual([['70593',23032],['NGC 7499',23036],['NGC 7501',23041],['NGC 7503',23045]]);expect(field.galaxies).toHaveLength(vectors.galaxies);
  // The HI Peg position match keeps its original catalogue star record and order (unsupported class, false time update).
  const hiPeg=field.stars.find(s=>s.id===HI_PEG_STAR)!,read=snapshot.bands[0].reads.find(r=>r.index===1141949)!;
  expect(field.stars.indexOf(hiPeg)).toBe(8);expect(hiPeg.type).toBe(0);expect(hiPeg.rawHex).toBe(read.rawHex);
  for(const domain of [{...PEGASUS_FIELD_DOMAIN,telescopeRecord:1},{...PEGASUS_FIELD_DOMAIN,telescopeRecord:2},{...PEGASUS_FIELD_DOMAIN,pointing:{...PEGASUS_FIELD_DOMAIN.pointing,dec:PEGASUS_FIELD_DOMAIN.pointing.dec+1e-9}},{...PEGASUS_FIELD_DOMAIN,options:'modified'},{...PEGASUS_FIELD_DOMAIN,dynamicContext:'present'}])expect(()=>buildPinnedPegasusPopulation(domain)).toThrow();
  // The earlier builder requires zero-match absence certificates and cannot certify this variable field.
  expect(()=>buildPinnedGalaxyPopulation(PEGASUS_FIELD_DOMAIN)).toThrow();
  expect(galaxyDomainFor(BASE)).toEqual(PEGASUS_FIELD_DOMAIN);expect(()=>galaxyDomainFor(BASE,1)).toThrow();expect(()=>galaxyDomainFor(BASE,2)).toThrow();
 });
 it('binds the compact-GSC reads, absence certificates and stage witnesses to the recorded sources',()=>{
  expect(snapshot.domain).toEqual(provenance.domain);expect(snapshot.regionIds).toEqual([582,583,1161]);expect(snapshot.bandOrder).toEqual(['N0000','N0730']);
  const key=roundNearestEven(snapshot.area.minimumRa*1e7);expect(key).toBe(231498902);
  for(const [i,band] of snapshot.bands.entries()){
   const file=provenance.sources.find(s=>s.archiveMember.endsWith(`/GSC/${band.name}.DAT`))!;
   expect(band.key).toBe(key);expect(band.recordCount*27).toBe(file.bytes);expect(band.reads).toHaveLength([1644,1605][i]);
  }
  expect(snapshot.initialStarIds.filter(id=>id.startsWith('N0000')).length).toBe(46);expect(snapshot.initialStarIds.filter(id=>id.startsWith('N0730')).length).toBe(98);
  expect(snapshot.absenceCertificates.map(c=>[c.file,c.recordsChecked,c.allPositionMatches.length])).toEqual([['CLEA_QSO.DAT',2269,0],['GLIMAGES.LST',183,0]]);
  expect(snapshot.absenceCertificates[0].sha256).toBe(provenance.sources.find(s=>s.archiveMember.endsWith('/CLEA_QSO.DAT'))!.sha256);
  expect(snapshot.galaxyRead.sourceAdmissionIds).toEqual([23032,23036,23041,23045]);expect(snapshot.galaxyRead.wholeFileAdmissionMatches).toBe(true);
  // Exactly the four cleanup witnesses remove stars; the variable stage removes none.
  const removed=snapshot.mergeWitnesses.flatMap(w=>w.removed);
  expect(removed).toEqual(['N0730.DAT@1032764','N0730.DAT@1033014','N0730.DAT@1033088','N0730.DAT@1033201']);expect(snapshot.variableMergeWitness.removed).toEqual([]);
  expect(snapshot.initialStarIds.filter(id=>!removed.includes(id))).toEqual(snapshot.expectedFinalIds);
  // 70593: runner prune (gap ≤ 0.006) with no star within 30″; the three targets delete the star at the saved index.
  const [g70593,...targets]=snapshot.mergeWitnesses;
  expect(g70593.bestDistanceDegrees*3600).toBeGreaterThanOrEqual(30);expect(Math.abs(g70593.secondDistanceDegrees-g70593.bestDistanceDegrees)).toBeLessThanOrEqual(.006);
  for(const w of targets){expect(w.bestDistanceDegrees*3600).toBeLessThan(30);expect(w.removed).toEqual([w.resolvedSavedId]);}
 });
});
describe('Pegasus acquisition definitions and Hubble.HTL rows',()=>{
 it('registers the fresh NGC 7501 and the cached NGC 7499/7503 views on record 0 only',()=>{
  expect(GALAXY_FIELD_REGISTRY.find(d=>d.id===BASE)).toEqual({kind:'fresh',id:BASE});
  expect(GALAXY_FIELD_REGISTRY.filter(d=>d.kind==='cached'&&d.baseId===BASE).map(d=>d.kind==='cached'?[d.id,d.baseId,d.recordIndex,d.telescopeRecords]:[])).toEqual([['NGC 7499',BASE,23036,[0]],['NGC 7503',BASE,23045,[0]]]);
  for(const t of pegasusTargets){
   const d=galaxyDefinition(t.id);expect(d.policyId).toBe(t.policyId);expect(galaxyPolicyDefinition(t.policyId)).toBe(d);expect(d.fieldSnapshotSHA256).toBe(provenance.fieldSnapshotSHA256);expect(d.sourceSnapshotSHA256).toBe(provenance.sourceSnapshotSHA256);
   expect(d.domain).toMatchObject({...PEGASUS_FIELD_DOMAIN,telescopeRecord:0});expect(d.calibration).toEqual(provenance.calibration);expect(galaxyIdentity(t.id)).toMatchObject({stars:140,galaxies:4});
  }
  expect(galaxyDefinition(BASE).target).toMatchObject({id:BASE,recordIndex:23041,ra:PEGASUS_FIELD_DOMAIN.pointing.ra,dec:PEGASUS_FIELD_DOMAIN.pointing.dec});
  for(const t of cached.targets){const d=galaxyDefinition(t.id),view=(d.domain as unknown as {view:{policy:string;baseFieldId:string;pointing:{ra:number;dec:number}}}).view,identity=galaxyIdentity(t.id);
   expect(view).toEqual({policy:cached.viewPolicy,baseFieldId:BASE,pointing:{ra:identity.ra,dec:identity.dec}});expect(d.domain.pointing).toEqual(cached.baseFieldCenter);expect(()=>galaxyDomainFor(t.id)).toThrow();expect(()=>buildPinnedPegasusPopulation(d.domain)).toThrow();}
  // Front F appends extended Hubble.HTL targets after the Pegasus three (hubbleEngineTargets.ts).
  expect(GALAXY_TARGETS.map(t=>t.id).slice(5,8)).toEqual([...ids]);
 });
 it('Hubble.HTL entries 11–13 are supported on the 0.4 m only; their rounded coordinates are not the catalogue centres',()=>{
  for(const [i,id] of ids.entries()){const row=HUBBLE_HOT_LIST[10+i];
   expect(row).toMatchObject({id,supported:true,targetId:id,route:id===BASE?'fresh':'cached',telescopes:[0]});
   expect([0,1,2].map(index=>hubbleRowStatus(row,index))).toEqual(['available','telescope','telescope']);
   const identity=galaxyIdentity(id);expect({ra:row.ra,dec:row.dec}).not.toEqual({ra:identity.ra,dec:identity.dec});
  }
  expect(cached.targets.map(t=>[t.id,t.htlRow])).toEqual([['NGC 7499',10],['NGC 7503',12]]);
 });
 it('KPNO 0.9 m and Mayall 4 m are not claimed for any Pegasus target and are never substituted',()=>{
  for(const id of ids)for(const index of [1,2] as const){expect(galaxyTargetTelescopeSupported(id,index)).toBe(false);expect(()=>galaxyDefinition(id,index)).toThrow();expect(()=>verifiedGalaxyConfiguration(id,index)).toThrow();expect(()=>createGalaxyExposure(1,id,index)).toThrow();}
  for(const id of ids)expect(galaxyTargetTelescopeSupported(id,0)).toBe(true);
 });
 it('workbook V references are separate documented inputs, never measurements',()=>{
  expect(references.map(r=>[r.id,r.apparentV,r.source])).toEqual([['NGC 7499',14.1,'Hubble Data.xls · Sheet1!C12'],['NGC 7501',14.7,'Hubble Data.xls · Sheet1!C13'],['NGC 7503',14.4,'Hubble Data.xls · Sheet1!C14']]);
  for(const r of references){const ref=galaxyDistanceReference(r.id);expect(ref).toEqual(r);expect(Object.keys(ref).sort()).toEqual(['apparentV','id','sha256','source']);expect(ref.sha256).toBe(galaxyDistanceReference('36773').sha256);}
  for(const t of cached.targets)expect(galaxyDistanceReference(t.id)).toMatchObject({apparentV:t.apparentV,source:`Hubble Data.xls · ${t.workbookCell}`});
 });
});
describe('Pegasus views, slit, calibration and source against the frozen independent vectors',()=>{
 it('NGC 7501: fresh selection at (468,468) with distance 0, crop, slit level and mean bound',()=>{
  const c=verifiedGalaxyConfiguration(BASE),v=vector(BASE);
  expect(c.view).toBeNull();expect(c.field.stars).toHaveLength(140);expect(c.scene.galaxies.find(g=>g.id===BASE)).toMatchObject({x:468,y:468});expect(v.projectedPoint).toEqual([468,468]);
  const s=selectCatalogObject(c.scene,v.query[0],v.query[1]);expect(s.kind).toBe('galaxy');if(s.kind!=='galaxy')return;
  expect(s.object.id).toBe(BASE);expect(s.galaxy.distance).toBe(0);expect(s.galaxyRadius).toBe(v.selectionRadius);expect(s.star!.distance).toBeCloseTo(v.nearestStarDistance,9);
  expect(sha(c.viewport.rgb)).toBe(v.cropRGBSHA256);expect(c.pixelLevel).toBe(v.pixelLevel);expect(c.fraction).toBe(v.fraction);expect(c.fraction).toBe((v.pixelLevel/200)**2);expect(c.zeroPoint).toBe(4);
  expect(relative(c.instrumentMagnitude,v.instrumentMagnitude)).toBeLessThan(1e-12);expect(relative(c.amplitude.source,v.sourceAmplitude)).toBeLessThan(1e-12);
  const max=Math.max(...c.sourceMeans)*50*1000;expect(relative(max,v.maxSourceMean1000ms)).toBeLessThan(1e-12);expect(max).toBeLessThan(12);
 });
 for(const t of cached.targets)it(`${t.id}: cached pan of the fresh NGC 7501 view, slit selection, calibration and mean bound`,()=>{
  const base=verifiedGalaxyConfiguration(BASE),c=verifiedGalaxyConfiguration(t.id),v=vector(t.id),target=galaxyIdentity(t.id);
  expect(c.field.stars.map(s=>s.id)).toEqual(base.field.stars.map(s=>s.id));expect(c.field.galaxies).toEqual(base.field.galaxies);expect(c.scene.frame.center).toEqual(cached.baseFieldCenter);
  const view=c.view!;expect(view.pan.rect).toEqual(t.rect);expect(view.pan.rect).toEqual(v.rect);expect(view.pan.query).toEqual(t.anchor);expect([view.pan.query.x,view.pan.query.y]).toEqual(v.query);
  expect(468-view.pan.offset.x).toBeCloseTo(v.projectedPoint[0],9);expect(468-view.pan.offset.y).toBeCloseTo(v.projectedPoint[1],9);
  expect(view.pan.unrounded.left).toBeGreaterThan(0);expect(view.pan.unrounded.top).toBeGreaterThan(0);expect(view.pan.unrounded.left).toBeLessThan(624);expect(view.pan.unrounded.top).toBeLessThan(624);
  const s=view.selection;expect(s.kind).toBe('galaxy');if(s.kind!=='galaxy')return;
  expect(s.object.id).toBe(t.id);expect(s.galaxyRadius).toBe(t.selectionRadius);expect(s.galaxyRadius).toBe(v.selectionRadius);expect(s.galaxy.distance).toBeGreaterThan(0);expect(s.galaxy.distance).toBeCloseTo(v.nearestGalaxyDistance,9);expect(s.galaxy.distance).toBeLessThan(s.galaxyRadius);expect(s.star!.distance).toBeCloseTo(v.nearestStarDistance,9);
  const g=c.field.galaxies[view.targetIndex];expect([g.id,g.recordIndex,g.ra,g.dec,g.magnitude]).toEqual([target.id,target.recordIndex,target.ra,target.dec,target.magnitude]);
  // Copied, not re-rendered: where the panned rectangle overlaps the fresh NGC 7501 crop, the pixels are identical.
  const dx=t.rect.left-312,dy=t.rect.top-312;let compared=0;
  for(let y=0;y<312;y++)for(let x=0;x<312;x++){const bx=x+dx,by=y+dy;if(bx<0||by<0||bx>=312||by>=312)continue;const a=(y*312+x)*3,b=(by*312+bx)*3;if(c.viewport.rgb[a]!==base.viewport.rgb[b]||c.viewport.rgb[a+1]!==base.viewport.rgb[b+1]||c.viewport.rgb[a+2]!==base.viewport.rgb[b+2])throw new Error(`pixel ${x},${y}`);compared++;}
  expect(compared).toBe((312-Math.abs(dx))*(312-Math.abs(dy)));
  expect(sha(c.viewport.rgb)).toBe(v.cropRGBSHA256);expect(c.pixelLevel).toBe(v.pixelLevel);expect(c.fraction).toBe(v.fraction);expect(c.pixelLevel).toBe(t.pixelLevel);expect(c.zeroPoint).toBe(4);
  expect(relative(c.instrumentMagnitude,v.instrumentMagnitude)).toBeLessThan(1e-12);expect(relative(c.amplitude.source,v.sourceAmplitude)).toBeLessThan(1e-12);
  const max=Math.max(...c.sourceMeans)*50*1000;expect(relative(max,v.maxSourceMean1000ms)).toBeLessThan(1e-12);expect(relative(max,t.maxSourcePoissonMean)).toBeLessThan(1e-12);expect(max).toBeLessThan(12);
 });
 it('the HI Peg catalogue star is never the selected slit object of any target',()=>{
  for(const id of ids){const c=verifiedGalaxyConfiguration(id),v=vector(id),i=c.scene.stars.findIndex(s=>s.id===HI_PEG_STAR);expect(i).toBeGreaterThanOrEqual(0);
   const p=c.scene.stars[i],dx=v.query[0]-p.x,dy=v.query[1]-p.y,distance=Math.sqrt(dx*dx+dy*dy);
   expect(distance).toBeGreaterThanOrEqual(v.nearestStarDistance-1e-9);expect(distance).toBeGreaterThan(v.nearestGalaxyDistance);expect(distance).toBeGreaterThan(v.selectionRadius);}
 });
 it('uses the GLXYTMPL.SP fallback at 1 + catalogue Single z: all 600 channels inside the shifted 3650–7000 Å source',()=>{
  expect(source.matched).toBe(false);expect(cached.spectrumSource).toMatchObject({file:'GLXYSP.LST',rows:48,fallback:'GLXYTMPL.SP',matched:false,sourceRanges:[3650,7000]});
  for(const id of ids){expect(cached.spectrumSource.noExactFilenameMatches[id]).toEqual([]);expect(galaxyIdentity(id).sourceFile).toBe('GLXYTMPL.SP');
   const c=verifiedGalaxyConfiguration(id),g=c.field.galaxies.find(g=>g.id===id)!,factor=1+Math.fround(g.redshift);
   expect(c.wavelengths).toHaveLength(600);expect(c.wavelengths[0]).toBe(4000);expect(c.wavelengths.at(-1)).toBeCloseTo(4998.333333333333,9);
   expect(3650*factor).toBeLessThan(4000);expect(7000*factor).toBeGreaterThan(c.wavelengths.at(-1)!);expect(c.sourceValues.every(x=>x>0)).toBe(true);}
 });
 it('stamp geometry of all four field galaxies, including the supplied-axis 70593 neighbour',()=>{
  const field=verifiedGalaxyConfiguration(BASE).field;
  for(const v of vectors.geometry){const g=field.galaxies.find(g=>g.id===v.id)!,geometry=galaxyStampGeometry(g);
   expect([geometry.major,geometry.minor,geometry.level]).toEqual([v.major,v.minor,v.level]);expect(geometry.angle).toBeCloseTo(v.angle,12);expect(relative(catalogGalaxyMagnitude(g).magnitude,v.instrumentMagnitude)).toBeLessThan(1e-12);expect(galaxyCatalogAxes(g).fallback).toBe(false);}
  // 70593 (morphology 20, supplied axes): not an acquisition target; position angle 0 uses the Dec-derived angle, and the stamp
  // does not change under a ±1e-9 rad perturbation of that angle.
  const g=field.galaxies.find(g=>g.id==='70593')!;expect(g.morphology).toBe(20);expect(g.positionAngleDegrees).toBe(0);expect(g.majorArcminutes).toBeGreaterThan(0);expect(g.minorArcminutes).toBeGreaterThan(0);
  expect(()=>createGalaxyExposure(1,'70593')).toThrow();
  const blank={width:41,height:41,rgb:new Uint8Array(41*41*3)},stamp=(dec:number)=>sha(paintAdaptedGalaxy(blank,{...g,dec},{x:20,y:20}).image.rgb),step=1e-9/(2*Math.PI*1000);
  expect(stamp(g.dec+step)).toBe(stamp(g.dec));expect(stamp(g.dec-step)).toBe(stamp(g.dec));
 });
});
describe('Pegasus exposure journals',()=>{
 for(const id of ids)it(`${id}: five trajectories replay exactly and the v1 galaxy session rejects forged identity`,()=>{
  const policy=galaxyDefinition(id).policyId,other=pegasusTargets.find(t=>t.id!==id)!.policyId;
  for(const v of trajectories){
   let x=startGalaxy(activateGalaxy(createGalaxyExposure(v.seed,id)));for(const dt of v.deltas)x=tickGalaxy(x,dt);const paused=pauseGalaxy(x);
   expect(paused.policy).toBe(policy);expect(galaxyTelescopeIndex(paused)).toBe(0);expect(paused.exposure.counts).toHaveLength(600);expect(paused.exposure.counts.every(n=>Number.isInteger(n)&&n>=0)).toBe(true);
   expect(paused.exposure.elapsedMs).toBe(v.deltas.reduce((a,b)=>a+b,0));expect(replayGalaxy(v.seed,paused.events,id).exposure).toEqual(paused.exposure);
   const saved=JSON.parse(serializeGalaxySession(paused));expect(saved.version).toBe(1);expect(saved.fieldSnapshotSHA256).toBe(provenance.fieldSnapshotSHA256);expect(parseGalaxySession(saved).exposure).toEqual(paused.exposure);
   const changes:((j:any)=>void)[]=[j=>j.policy=other,j=>j.policy=galaxyDefinition('54876').policyId,j=>j.domain.telescopeRecord=1,j=>j.domain.pointing.dec+=1e-9,j=>j.fieldSnapshotSHA256='a'.repeat(64),j=>j.version=2,
    ...(id===BASE?[(j:any)=>j.domain.view={policy:cached.viewPolicy,baseFieldId:BASE,pointing:j.domain.pointing}]:[(j:any)=>delete j.domain.view,(j:any)=>j.domain.view.pointing.ra+=1e-9,(j:any)=>j.domain.view.baseFieldId='54876',(j:any)=>j.domain.pointing=j.domain.view.pointing])];
   for(const change of changes){const y=structuredClone(saved);change(y);expect(()=>parseGalaxySession(y)).toThrow();}
  }
  const counts=trajectories.map(v=>tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(v.seed,id))),1000).exposure.counts.join());expect(new Set(counts).size).toBeGreaterThan(1);
 });
 it('eight 120 s acquisitions at the 100 ms UI tick fit the unchanged 24000-event archive budget',()=>{
  // 1200 ticks + start + pause per acquisition; archive limit 12 snapshots and 24000 events are unchanged.
  let x=startGalaxy(activateGalaxy(createGalaxyExposure(1,BASE)));for(let i=0;i<1200;i++)x=tickGalaxy(x,100);const paused=pauseGalaxy(x);
  expect(paused.exposure.elapsedMs).toBe(120000);expect(paused.events).toHaveLength(1202);expect(8*paused.events.length).toBe(9616);expect(8*paused.events.length).toBeLessThanOrEqual(24000);
 });
});
