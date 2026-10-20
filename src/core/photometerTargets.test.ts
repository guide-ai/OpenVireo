import{projectResource}from'./projectMetadata';
import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import packetSource from '../../data/photometry/pleiades-target-fields.json';
const packet=projectResource(packetSource);

import vectors from '../../data/photometry/pleiades-target-vectors.json';

import {LEGACY_PLEIADES_PHOTOMETER_TARGETS as PLEIADES_PHOTOMETER_TARGETS,photometerTarget,buildPhotometerTargetField,PINNED_PLEIADES_V_TARGET,buildPinnedPleiadesField,PINNED_PLEIADES_V_DOMAIN} from './photometerField';
import {buildPinnedPleiadesUbvField,drawPinnedPleiadesUbv,type PhotometerFilter} from './photometerUbvField';
describe('three original Pleiades target identities and complete fields',()=>{
 it('retains original hotlist order, exact coordinates and distinct hotlist/native names; hashes every new admitted original row',()=>{
  expect(PLEIADES_PHOTOMETER_TARGETS.map(t=>[t.hotlistRecord,t.hotlistLabel,t.catalogId])).toEqual([[0,'01799-01442','N2230.DAT@144496'],[1,'01803-00478','N2230.DAT@145877'],[4,'01803-01585','N2230.DAT@147993']]);
  for(const t of packet.targets)for(const f of t.fields)for(const row of f.admitted)expect(createHash('sha256').update(Buffer.from(row.rawHex,'hex')).digest('hex')).toBe(row.recordSha256);
  expect(Object.isFrozen(photometerTarget('N2230.DAT@144496').pointing)).toBe(true);
 });
 it('keeps the prior default and strict V-only field contract unchanged',()=>{
  expect(PINNED_PLEIADES_V_TARGET.catalogId).toBe('N2230.DAT@145877');expect(buildPhotometerTargetField(PINNED_PLEIADES_V_TARGET.catalogId,'object')).toEqual(buildPinnedPleiadesField(PINNED_PLEIADES_V_DOMAIN,'object'));expect(()=>buildPinnedPleiadesField({...PINNED_PLEIADES_V_DOMAIN,targetId:'N2230.DAT@144496'},'object')).toThrow();
 });
 it.each(PLEIADES_PHOTOMETER_TARGETS)('replays a complete original field at both pointings for $hotlistLabel',t=>{
  const object=buildPhotometerTargetField(t.catalogId,'object'),sky=buildPhotometerTargetField(t.catalogId,'sky');expect(object.selected.id).toBe(t.catalogId);expect(object.selected.ra).toBe(t.pointing.ra);expect(object.selected.dec).toBe(t.pointing.dec);expect(object.neighbors.map(s=>s.id)).toEqual([t.catalogId]);expect(sky.neighbors).toEqual([]);expect(sky.selected.id).toBe(t.catalogId);expect(object.selectedDistancePixels).toBe(0);expect(sky.selectedDistancePixels).toBeCloseTo(187.2,8);expect(sky.centralFraction).toBe(0);
  const f=packet.targets.find(p=>p.target.catalogId===t.catalogId);if(f)for(const field of f.fields){expect(field.absenceCertificates.map(c=>c.recordsChecked)).toEqual([31147,2269,24069,183]);expect(field.absenceCertificates.every(c=>!c.allPositionMatches.length)).toBe(true);expect(field.wholeBandAdmissionMatches&&field.exactRationalAdmissionMatches&&field.adjacentKeyControlsMatch).toBe(true);expect(field.band.recordCount).toBe(1065481);}
 });
 it.each(vectors.sequences)('matches independent UBV component counts and random draws for $targetId seed $initialSeed',v=>{
  let seed=v.initialSeed;for(const p of v.pairs){for(const kind of ['sky','object']as const){const r=drawPinnedPleiadesUbv(kind,p.filter as PhotometerFilter,seed,v.targetId);for(const key of ['sourceCount','skyCount','totalPhotonCount','seed','draws']as const)expect(r[key]).toBe(p[kind][key]);seed=r.seed;}}
 });
 it('agrees with independent Single-color linear flux and stays within the existing mean/count domain',()=>{
  for(const t of PLEIADES_PHOTOMETER_TARGETS)for(const f of ['U','B','V']as const){const actual=buildPinnedPleiadesUbvField('object',f,t.catalogId),reference=Number(vectors.means[t.catalogId as keyof typeof vectors.means][f].source);expect(Math.abs(actual.sourceMean-reference)).toBeLessThan(reference*1e-7);expect(actual.sourceMean).toBeLessThan(1e6);expect(actual.skyMean).toBeGreaterThan(0);}
 });
 it('rejects unsupported, malformed and merely similarly named sources, and arbitrary pointing',()=>{
  for(const id of ['01803-00478','N2230-01442','N2230.DAT@0144496','N2230.DAT@146960','',null])expect(()=>buildPhotometerTargetField(id as string,'object')).toThrow();expect(()=>buildPhotometerTargetField('N2230.DAT@144496','else' as 'object')).toThrow();
 });
});
