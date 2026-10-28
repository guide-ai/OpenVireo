import {it,expect,describe} from 'vitest';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
import fields from '../../data/photometry/pleiades-variable-fields.json';
import vectors from '../../data/photometry/pleiades-variable-vectors.json';
import pointing from '../../data/photometry/pleiades-pointing-fields.json';
import pointingVectors from '../../data/photometry/pleiades-pointing-vectors.json';
import {photometerSeparation} from './photometerSource';
import {PLEIADES_PHOTOMETER_TARGETS,VARIABLE_PHOTOMETER_FIELDS_SHA256,POINTING_PHOTOMETER_FIELDS_SHA256,isPointingFieldPhotometerTarget,buildPhotometerTargetField,isVariableFieldPhotometerTarget} from './photometerField';
import {buildPinnedPleiadesUbvField} from './photometerUbvField';
import {createPhotometer,photometerEvent as event,releasePhotometer,replayPhotometer} from './photometer';
import {serializePhotometerSession,parsePhotometerSession} from '../io/photometerSession';
import {VARIABLE_FIELD_PHOTOMETER_POLICY} from './photometerJournal';
// Design: coordinator decision of 2026-10-28; resources: user approval of 2026-10-28 (AGENTS.md). PLEIADES.HTL rows 3, 5 and 10 join through the recovered no-effect variable merge
// (generator analysis/front-f-hubble-objectx/scripts/pleiades_variable_fields.py; independent means pleiades_variable_vectors.py).
const sha=(p:string)=>createHash('sha256').update(readFileSync(new URL(p,import.meta.url))).digest('hex');
const TARGETS=fields.targets.map(t=>t.target.catalogId);
describe('Pleiades variable-field targets',()=>{
 it('the bundled fields are the pinned ones; rows 3, 5, 10 are targets',()=>{
  expect(sha('../../data/photometry/pleiades-variable-fields.json')).toBe(VARIABLE_PHOTOMETER_FIELDS_SHA256);expect(vectors.fieldsSHA256).toBe(VARIABLE_PHOTOMETER_FIELDS_SHA256);
  expect(TARGETS).toEqual(['N2230.DAT@147896','N2230.DAT@148417','N2230.DAT@149159']);expect(fields.targets.map(t=>t.target.hotlistRecord)).toEqual([3,5,10]);
  expect(TARGETS.every(id=>isVariableFieldPhotometerTarget(id)&&PLEIADES_PHOTOMETER_TARGETS.some(t=>t.catalogId===id))).toBe(true);
  // Every variable is a no-effect false (class 3, period 0, word 0); row 10's first merge prunes a runner in the object field.
  const merges=fields.targets.flatMap(t=>t.fields.map(f=>[t.target.hotlistRecord,f.kind,f.variableMerges.map(m=>[m.hit,m.removed])]));
  expect(merges).toEqual([[3,'object',[[false,[]]]],[3,'sky',[[false,[]]]],[5,'object',[[false,[]],[true,[]]]],[5,'sky',[[false,[]],[true,[]]]],[10,'object',[[false,['N2230.DAT@149084']],[true,[]]]],[10,'sky',[[true,[]]]]]);
 });
 it.each(TARGETS)('%s: complete fields after the variable merges, central-only object, empty sky, independent UBV means',id=>{
  for(const kind of ['object','sky'] as const){
   const f=buildPhotometerTargetField(id,kind),fixture=fields.targets.find(t=>t.target.catalogId===id)!.fields.find(x=>x.kind===kind)!;
   expect(f.provenanceFile).toBe('pleiades-variable-fields.json');expect(f.stars.map(s=>s.id)).toEqual(fixture.mergedIds);
   expect(f.selected.id).toBe(id);expect(f.selectedDistancePixels).toBeCloseTo(kind==='object'?0:187.2,8);expect(f.neighbors.map(n=>n.id)).toEqual(kind==='object'?[id]:[]);
   for(const band of ['U','B','V'] as const){const actual=buildPinnedPleiadesUbvField(kind,band,id),m=vectors.means[id as keyof typeof vectors.means][band],mean=Number(kind==='sky'?m.skySource:m.source);
    expect(Math.abs(actual.sourceMean-mean)/mean).toBeLessThan(1e-12);expect(Math.abs(actual.skyMean-Number(m.sky))/Number(m.sky)).toBeLessThan(1e-12);}
  }
 });
 it('a history that names a variable-field target is owner 11 with the field proof; it round-trips and replays',()=>{
  let s=event(event(createPhotometer(42),{type:'activate'}),{type:'filter',filter:'V'});
  s=event(event(event(s,{type:'point',kind:'sky'}),{type:'start'}),{type:'complete'});
  s=event(event(s,{type:'target',targetId:TARGETS[2]}),{type:'point',kind:'object'});s=event(event(s,{type:'start'}),{type:'complete'});s=releasePhotometer(s);
  const text=serializePhotometerSession(s),json=JSON.parse(text);expect(json.version).toBe(11);expect(json.policy).toBe(VARIABLE_FIELD_PHOTOMETER_POLICY);expect(json.variableTargetFieldsSHA256).toBe(VARIABLE_PHOTOMETER_FIELDS_SHA256);expect(json.pointingTargetFieldsSHA256).toBe(POINTING_PHOTOMETER_FIELDS_SHA256);
  expect(parsePhotometerSession(json)).toEqual(s);expect(replayPhotometer(s.seedAtStart,s.events)).toEqual(s);
  // A downgraded header is refused.
  expect(()=>parsePhotometerSession({...json,version:10})).toThrow();
 });
});
const POINTED=pointing.targets.map(t=>t.target.catalogId);
describe('Pleiades pointing-association targets (recovered native selection at the exact HTL pointing)',()=>{
 it('rows 2, 7, 12, 14, 22: the pinned file, the selection evidence and no unvalidated row left',()=>{
  expect(sha('../../data/photometry/pleiades-pointing-fields.json')).toBe(POINTING_PHOTOMETER_FIELDS_SHA256);expect(pointingVectors.fieldsSHA256).toBe(POINTING_PHOTOMETER_FIELDS_SHA256);
  expect(pointing.targets.map(t=>t.target.hotlistRecord)).toEqual([2,7,12,14,22]);expect(POINTED.every(id=>isPointingFieldPhotometerTarget(id)&&PLEIADES_PHOTOMETER_TARGETS.some(t=>t.catalogId===id))).toBe(true);
  expect(PLEIADES_PHOTOMETER_TARGETS).toHaveLength(24);
  // The label suffix matches in every row; what differs is the pointing (rows 12, 22) and/or the sky field's nearest star (2, 7, 14, 22).
  expect(pointing.targets.every(t=>t.target.labelSuffixMatches)).toBe(true);
  expect(pointing.targets.map(t=>[t.target.hotlistRecord,t.target.pointing.ra===t.target.starPointing.ra&&t.target.pointing.dec===t.target.starPointing.dec,t.fields[1].selectedId===t.target.catalogId])).toEqual([[2,true,false],[7,true,false],[12,false,true],[14,true,false],[22,false,false]]);
 });
 it.each(POINTED)('%s: selected at the HTL pointing, offset-dependent aperture fraction, independent UBV means',id=>{
  const packet=pointing.targets.find(t=>t.target.catalogId===id)!;
  for(const kind of ['object','sky'] as const){
   const f=buildPhotometerTargetField(id,kind),fixture=packet.fields.find(x=>x.kind===kind)!;
   expect(f.provenanceFile).toBe('pleiades-pointing-fields.json');expect(f.pointing).toEqual(fixture.pointing);expect(f.selected.id).toBe(fixture.selectedId);
   expect(f.selectedDistancePixels).toBeCloseTo(fixture.selectedPixels,6);expect(f.neighbors.map(n=>n.id)).toEqual(kind==='object'?[id]:[]);
   if(kind==='object')expect(Math.abs(photometerSeparation(f.pointing.ra,f.pointing.dec,f.selected.ra,f.selected.dec)-Number(pointingVectors.offsets[id as keyof typeof pointingVectors.offsets].separationDegrees))).toBeLessThan(1e-18);
   for(const band of ['U','B','V'] as const){const actual=buildPinnedPleiadesUbvField(kind,band,id),m=pointingVectors.means[id as keyof typeof pointingVectors.means][band],mean=Number(kind==='sky'?m.skySource:m.source);
    expect(Math.abs(actual.sourceMean-mean)/mean).toBeLessThan(1e-12);}
  }
 });
});

describe('published N2230 reads stay inside the 24 photometer fields (user approval of 2026-10-28)',()=>{
 it('a whole 27-byte record only inside its own field area; every other read is an 8-byte position witness outside it',()=>{
  type Field={kind:string;area:{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number};band:{reads:{index:number;rawHex:string}[]}};
  let whole=0,witnesses=0;
  for(const file of [fields,pointing])for(const t of file.targets as unknown as {fields:Field[]}[])for(const f of t.fields)for(const r of f.band.reads){
   const b=Buffer.from(r.rawHex,'hex'),ra=b.readInt32LE(0)/10_000_000,dec=b.readInt32LE(4)/100_000,a=f.area;
   const inside=ra>=a.minimumRa&&ra<=a.maximumRa&&dec>=a.minimumDec&&dec<=a.maximumDec;
   expect([r.index,f.kind,r.rawHex.length]).toEqual([r.index,f.kind,inside?54:16]);inside?whole++:witnesses++;
  }
  expect(whole).toBeGreaterThan(0);expect(witnesses).toBeGreaterThan(whole);
 });
});
