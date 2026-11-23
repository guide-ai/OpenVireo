import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {parseHtl} from './hotList';
import {INITIAL_OBJECT_X_LAB_SUMMARY,OBJECT_X_KINDS,OBJECT_X_LAB_STEPS,OBJECT_X_ON_TARGET_DEGREES,OBJECT_X_ROW_KINDS,objectXAim,objectXCameraListUse,objectXLaterClock,objectXCode,objectXDataLabel,objectXLabProgress,objectXTargets,revealObjectX} from './objectXLab';

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
 it('names the next action of the two imaging steps (Show me where only): copy the coordinates, point, expose; and first a later time for the second image',()=>{
  const ready={...INITIAL_OBJECT_X_LAB_SUMMARY,target:true,clockSet:true,listBuilt:true};
  expect(objectXLabProgress(INITIAL_OBJECT_X_LAB_SUMMARY).imageAction).toBeNull();
  expect((['elsewhere','entered','on-target'] as const).map(aim=>objectXLabProgress(ready,null,aim))).toMatchObject([{next:'image',imageAction:'copy'},{next:'image',imageAction:'point'},{next:'image',imageAction:'expose'}]);
  // With the aim unknown (no unrevealed target): whichever of pointing and exposing the page allows.
  expect(objectXLabProgress(ready).imageAction).toBe('any');expect(objectXLabProgress(ready,null,'unknown').imageAction).toBe('any');
  const one={...ready,images:1,imagesOfTarget:1};
  // The telescope is still on the field after the first image: the next action is the later time, not another exposure.
  expect((['elsewhere','entered','on-target'] as const).map(aim=>objectXLabProgress(one,null,aim).imageAction)).toEqual(['clock','clock','clock']);
  expect((['elsewhere','entered','on-target'] as const).map(aim=>objectXLabProgress({...one,laterClock:true},null,aim))).toMatchObject([{next:'repeat',imageAction:'copy'},{next:'repeat',imageAction:'point'},{next:'repeat',imageAction:'expose'}]);
  // Setting the later time makes the list stale: the guide is at "list" until it is rebuilt, with no imaging action.
  expect(objectXLabProgress({...one,laterClock:true,listBuilt:false},null,'on-target')).toMatchObject({next:'list',imageAction:null});
  expect(objectXLabProgress({...one,laterClock:true,images:2,imagesOfTarget:2},'asteroid')).toMatchObject({next:'measure',imageAction:null});
  // The marks do not depend on it.
  expect(objectXLabProgress(one,null,'elsewhere').done).toEqual(objectXLabProgress({...one,laterClock:true},null,'on-target').done);
 });
 it('aim: the telescope within the on-target radius, else the coordinate boxes holding exactly the target, else elsewhere',()=>{
  const target={ra:10.5,dec:20.25},far={ra:3,dec:-40},nan={ra:NaN,dec:NaN};
  expect(objectXAim(target,target,nan)).toBe('on-target');
  expect(objectXAim(target,{ra:target.ra,dec:target.dec+OBJECT_X_ON_TARGET_DEGREES*.9},nan)).toBe('on-target');
  expect(objectXAim(target,{ra:target.ra,dec:target.dec+OBJECT_X_ON_TARGET_DEGREES*1.1},nan)).toBe('elsewhere');
  expect(objectXAim(target,far,{ra:10.5,dec:20.25})).toBe('entered');
  // Typed by hand from the sexagesimal read-out (review: an exact match sent the student back to Copy): the same radius.
  expect(objectXAim(target,far,{ra:10.5001,dec:20.2499})).toBe('entered');
  expect(objectXAim(target,far,{ra:10.5,dec:20.25+OBJECT_X_ON_TARGET_DEGREES*1.1})).toBe('elsewhere');
  expect(objectXAim(target,far,nan)).toBe('elsewhere');
  // The telescope drifted off the field (clock running, tracking off) with the coordinates still entered: point again.
  expect(objectXAim(target,{ra:target.ra+.05,dec:target.dec},target)).toBe('entered');
  // No unrevealed target is known (none chosen, or revealed).
  expect(objectXAim(null,far,nan)).toBe('unknown');expect(objectXAim(null,target,target)).toBe('unknown');
 });
 it('a later clock is one set after every image of the target, wherever it was set',()=>{
  expect(objectXLaterClock([],2455000)).toBe(false);
  expect(objectXLaterClock([2454983.67],2454983.66)).toBe(false);expect(objectXLaterClock([2454983.67],2454983.67)).toBe(false);
  expect(objectXLaterClock([2454983.67],2454983.70)).toBe(true);
  expect(objectXLaterClock([2454983.67,2454983.72],2454983.70)).toBe(false);
  expect(objectXLaterClock([2454983.67],NaN)).toBe(false);
 });
});

describe('camera exposures and the Object X list',()=>{
 it('IR images read a current list but never build one, so they leave the Object X session unchanged',()=>{
  for(const clockSet of [false,true])for(const hasList of [false,true]){
   expect(objectXCameraListUse({camera:'ir',listCurrent:false,clockSet,hasList})).toBe('none');
   expect(objectXCameraListUse({camera:'ccd',listCurrent:false,clockSet,hasList})).toBe(clockSet||hasList?'build':'none');
   expect(objectXCameraListUse({camera:'ir',listCurrent:true,clockSet,hasList:true})).toBe('use');
   expect(objectXCameraListUse({camera:'ccd',listCurrent:true,clockSet,hasList:true})).toBe('use');
  }
 });
});
