import {it,expect,describe} from 'vitest';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
import fields from '../../data/photometry/pleiades-variable-fields.json';
import vectors from '../../data/photometry/pleiades-variable-vectors.json';
import {PLEIADES_PHOTOMETER_TARGETS,VARIABLE_PHOTOMETER_FIELDS_SHA256,buildPhotometerTargetField,isVariableFieldPhotometerTarget} from './photometerField';
import {buildPinnedPleiadesUbvField} from './photometerUbvField';
import {createPhotometer,photometerEvent as event,releasePhotometer,replayPhotometer} from './photometer';
import {serializePhotometerSession,parsePhotometerSession} from '../io/photometerSession';
import {VARIABLE_FIELD_PHOTOMETER_POLICY} from './photometerJournal';
// Coordinator decision of 2026-10-28: PLEIADES.HTL rows 3, 5 and 10 join through the recovered no-effect variable merge
// (generator analysis/front-f-hubble-objectx/scripts/pleiades_variable_fields.py; independent means pleiades_variable_vectors.py).
const sha=(p:string)=>createHash('sha256').update(readFileSync(new URL(p,import.meta.url))).digest('hex');
const TARGETS=fields.targets.map(t=>t.target.catalogId);
describe('Pleiades variable-field targets',()=>{
 it('the bundled fields are the pinned ones; rows 3, 5, 10 are targets, row 12 stays an unvalidated association',()=>{
  expect(sha('../../data/photometry/pleiades-variable-fields.json')).toBe(VARIABLE_PHOTOMETER_FIELDS_SHA256);expect(vectors.fieldsSHA256).toBe(VARIABLE_PHOTOMETER_FIELDS_SHA256);
  expect(TARGETS).toEqual(['N2230.DAT@147896','N2230.DAT@148417','N2230.DAT@149159']);expect(fields.targets.map(t=>t.target.hotlistRecord)).toEqual([3,5,10]);
  expect(TARGETS.every(id=>isVariableFieldPhotometerTarget(id)&&PLEIADES_PHOTOMETER_TARGETS.some(t=>t.catalogId===id))).toBe(true);
  expect(fields.unavailableUpdates).toEqual([expect.objectContaining({hotlistRecord:12,reason:'unvalidated-pointing-association'})]);
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
  const text=serializePhotometerSession(s),json=JSON.parse(text);expect(json.version).toBe(11);expect(json.policy).toBe(VARIABLE_FIELD_PHOTOMETER_POLICY);expect(json.variableTargetFieldsSHA256).toBe(VARIABLE_PHOTOMETER_FIELDS_SHA256);
  expect(parsePhotometerSession(json)).toEqual(s);expect(replayPhotometer(s.seedAtStart,s.events)).toEqual(s);
  // A downgraded header is refused.
  expect(()=>parsePhotometerSession({...json,version:10})).toThrow();
 });
});
