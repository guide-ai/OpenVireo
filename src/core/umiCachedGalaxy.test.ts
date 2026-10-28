import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import umi from '../../data/hubble/umi-cached-provenance.json';
import python from '../../data/hubble/umi-independent-vectors.json';
import snapshot from '../../data/hubble/pinned-galaxy-field.json';
import {verifiedGalaxyConfiguration,galaxyDefinition,galaxyPolicyDefinition,createGalaxyExposure} from './galaxyExposure';
import {galaxyTelescopeIndex,galaxyTargetTelescopeSupported,isCachedGalaxyTarget} from './galaxyTelescope';
import {galaxyIdentity,galaxyDistanceReference} from './galaxyIdentity';
import {GALAXY_FIELD_REGISTRY,galaxyDomainFor} from './pinnedGalaxyField';
import {HUBBLE_HOT_LIST,hubbleRowStatus} from './hubbleHotList';
import {HUBBLE_EXTENDED_TARGETS,hubbleExtendedPolicyTelescope} from './hubbleEngineTargets';
import {isCachedGalaxyId} from './observingWorkspace';
const sha=(v:NodeJS.ArrayBufferView)=>createHash('sha256').update(v).digest('hex');
describe('Front F M1: UM-I – 3 (36805) as a cached pan of the verified 36773 field',()=>{
 const t=umi.targets[0];
 it('records the base field, target row and the independent Python pan geometry',()=>{
  expect(umi.baseFieldSnapshotSHA256).toBe(galaxyDefinition('36773').fieldSnapshotSHA256);expect(umi.baseFieldCenter).toEqual(snapshot.domain.pointing);
  expect(HUBBLE_HOT_LIST[t.htlRow]).toMatchObject({id:'36805',remarks:'UM-I - 3',recordSha256:t.htlRecordSHA256,catalogIndex:t.recordIndex});
  // 36805 is in the verified population and the base field's whole-list photograph check is empty.
  expect(snapshot.galaxies.map(g=>g.recordIndex)).toContain(12127);
  expect(snapshot.absenceCertificates.find(c=>c.file==='GLIMAGES.LST')!.allPositionMatches).toEqual([]);
  expect(python.rect).toEqual(t.rect);expect(python.query).toEqual(t.anchor);expect(python.unrounded).toEqual(t.unroundedPan);expect(python.selectionDistance).toBe(t.selectionDistance);
  expect(python.target).toMatchObject({ra:galaxyIdentity('36805').ra,dec:galaxyIdentity('36805').dec});
  // Guard 0x53af28 on the unrounded values: strict 0 < left, top < 624, with margin.
  expect(t.unroundedPan.left).toBeGreaterThan(0);expect(t.unroundedPan.top).toBeGreaterThan(0);expect(t.unroundedPan.left).toBeLessThan(624);expect(t.unroundedPan.top).toBeLessThan(624);
 });
 it('prepares through the recovered cached-pan gates on the 0.4 m only',()=>{
  const c=verifiedGalaxyConfiguration('36805',0);
  expect(c.view!.pan.rect).toEqual(t.rect);expect(c.view!.selection.kind==='galaxy'&&c.view!.selection.object.id).toBe('36805');
  expect([c.pixelLevel,c.fraction]).toEqual([t.pixelLevel,t.fraction]);expect(c.amplitude.source).toBe(t.sourceAmplitude);
  expect(Math.max(...c.sourceMeans)*50*1000).toBeLessThan(12);
  expect(sha(c.viewport.rgb)).toBe('5ad3c3583ed6afcf0c5e5d95b7c33878b87b5744f280b5108c2c99f42cd268ae');
  expect([0,1,2].map(i=>galaxyTargetTelescopeSupported('36805',i))).toEqual([true,false,false]);expect(()=>verifiedGalaxyConfiguration('36805',1)).toThrow();expect(()=>galaxyDomainFor('36805')).toThrow();
  expect([0,1,2].map(i=>hubbleRowStatus(HUBBLE_HOT_LIST[2],i))).toEqual(['available','telescope','telescope']);
  const d=galaxyDefinition('36805');expect(galaxyPolicyDefinition(t.policyId)).toBe(d);expect(galaxyTelescopeIndex(createGalaxyExposure(1,'36805'))).toBe(0);expect(hubbleExtendedPolicyTelescope(t.policyId)).toBe(0);
  expect(GALAXY_FIELD_REGISTRY.find(r=>r.id==='36805')).toEqual({kind:'cached',id:'36805',baseId:'36773',recordIndex:12127,telescopeRecords:[0]});
  // Not a CorBor (v24) cached target: it is carried by the v29 extended table only.
  expect(isCachedGalaxyTarget('36805')).toBe(false);expect(isCachedGalaxyId('36805')).toBe(false);expect(HUBBLE_EXTENDED_TARGETS.map(x=>x.id)).toContain('36805');
  expect(galaxyDistanceReference('36805')).toMatchObject({apparentV:15.4,source:'Hubble Data.xls · Sheet1!C4'});
 });
});
