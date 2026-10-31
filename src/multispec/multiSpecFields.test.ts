import {describe,it,expect} from 'vitest';
import engineTargets from '../../data/hubble/engine-targets.json';
import {LSS_ROWS} from '../core/lssFields';
import {MULTISPEC_TILED_EXCEPTIONS,multiSpecAnchor} from './multiSpecFields';

// Front G G4b: the observatory Multi-Spec field is loaded at an anchor kept by VIREO's cached-field rule (core/fieldCache.ts).
describe('multiSpecAnchor',()=>{
 const p={ra:11.74525,dec:55.37861111},deg=(d:number)=>d/15/Math.cos(p.dec*Math.PI/180);
 it('keeps the anchor (same object) while the pointing stays within the 0.25° cache, and reloads past it',()=>{
  const a=multiSpecAnchor(null,p,2);expect(a).toEqual({pointing:p,telescope:2});
  expect(multiSpecAnchor(a,{ra:p.ra+deg(.2),dec:p.dec},2)).toBe(a);
  expect(multiSpecAnchor(a,{ra:p.ra,dec:p.dec-.2},2)).toBe(a);
  const moved={ra:p.ra+deg(.3),dec:p.dec};expect(multiSpecAnchor(a,moved,2)).toEqual({pointing:moved,telescope:2});
 });
 it('reloads on a telescope change; a certified pointing inside the cache keeps the anchor (review 1 L2), except at Boötes',()=>{
  const a=multiSpecAnchor(null,p,2);expect(multiSpecAnchor(a,p,0)).toEqual({pointing:p,telescope:0});
  const coma=engineTargets.targets.find(t=>t.id==='NGC 4889')!.pointing,near=multiSpecAnchor(null,{ra:coma.ra,dec:coma.dec+.1},1);
  expect(multiSpecAnchor(near,coma,1)).toBe(near);
  const lss=LSS_ROWS.find(r=>r.id==='NGC 4175')??LSS_ROWS[0],nearRow=multiSpecAnchor(null,{ra:lss.ra,dec:lss.dec+.1},0);
  expect(multiSpecAnchor(nearRow,{ra:lss.ra,dec:lss.dec},0)).toBe(nearRow);
  expect(MULTISPEC_TILED_EXCEPTIONS.length).toBe(2);
  for(const boo of MULTISPEC_TILED_EXCEPTIONS){
   const n=multiSpecAnchor(null,{ra:boo.ra,dec:boo.dec+.1},1),at=multiSpecAnchor(n,boo,1);
   expect(at).toEqual({pointing:boo,telescope:1});expect(multiSpecAnchor(at,{ra:boo.ra,dec:boo.dec+.1},1)).toBe(at);
  }
 });
});
