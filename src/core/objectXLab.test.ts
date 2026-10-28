import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {parseHtl} from './hotList';
import {INITIAL_OBJECT_X_LAB_SUMMARY,OBJECT_X_KINDS,OBJECT_X_LAB_STEPS,OBJECT_X_ROW_KINDS,objectXCode,objectXDataLabel,objectXLabProgress,objectXTargets,revealObjectX} from './objectXLab';

const list=parseHtl(new Uint8Array(readFileSync('public/original/hotlists/ObjectX.HTL')));
describe('Object X targets (hidden identity)',()=>{
 it('gives every ObjectX.HTL row a distinct opaque code and a known kind',()=>{
  const targets=objectXTargets(list);
  expect(targets).toHaveLength(17);expect(new Set(targets.map(t=>t.code)).size).toBe(17);
  for(const t of targets){expect(t.code).toMatch(/^X-[0-9A-Z]{5}$/);expect(Object.keys(t).sort()).toEqual(['code','dec','ra']);}
  for(const r of list)expect(OBJECT_X_KINDS).toContain(OBJECT_X_ROW_KINDS[r.id.trim()]);
  // Sorted by code, not file order (which groups kinds).
  expect(targets.map(t=>t.code)).toEqual([...targets.map(t=>t.code)].sort());
  const json=JSON.stringify(targets);for(const r of list){expect(json).not.toContain(r.id.trim());expect(json).not.toContain(r.remarks.trim());}
 });
 it('reveals identifier, remark and kind only on request',()=>{
  expect(revealObjectX(list,objectXCode('(433) Eros'))).toEqual({id:'(433) Eros',remarks:'Asteroid',kind:'asteroid'});
  expect(revealObjectX(list,objectXCode('1919+21'))?.kind).toBe('pulsar');
  expect(revealObjectX(list,'X-00000')).toBeNull();
 });
 it('labels data ObjX-<ID> or UNKNOWN, as the original',()=>{
  expect(objectXDataLabel('42')).toBe('ObjX-42');expect(objectXDataLabel('  ')).toBe('UNKNOWN');expect(objectXDataLabel('UNKNOWN')).toBe('UNKNOWN');
  expect(objectXDataLabel('x'.repeat(30))).toBe('ObjX-'+'x'.repeat(18));
 });
});
describe('Object X guide progress',()=>{
 it('counts steps from the lab, with "measure" done by a motion or a non-moving answer',()=>{
  expect(Object.values(objectXLabProgress(INITIAL_OBJECT_X_LAB_SUMMARY).done).every(d=>!d)).toBe(true);
  const s={...INITIAL_OBJECT_X_LAB_SUMMARY,target:true,clockSet:true,listBuilt:true,images:3,imagesOfTarget:2,answered:true};
  expect(objectXLabProgress(s,'asteroid').done.measure).toBe(false);
  expect(objectXLabProgress(s,'pulsar').done.measure).toBe(true);
  expect(objectXLabProgress({...s,motionMeasured:true},'asteroid').done).toMatchObject({target:true,clock:true,list:true,image:true,repeat:true,measure:true,classify:true,describe:false});
  expect(OBJECT_X_LAB_STEPS).toHaveLength(10);
 });
});
