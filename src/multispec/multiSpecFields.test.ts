import {describe,it,expect} from 'vitest';
import engineTargets from '../../data/hubble/engine-targets.json';
import {multiSpecAnchor} from './multiSpecFields';

// Front G G4b: the observatory Multi-Spec field is loaded at an anchor kept by VIREO's cached-field rule (core/fieldCache.ts).
describe('multiSpecAnchor',()=>{
 const p={ra:11.74525,dec:55.37861111},deg=(d:number)=>d/15/Math.cos(p.dec*Math.PI/180);
 it('keeps the anchor (same object) while the pointing stays within the 0.25° cache, and reloads past it',()=>{
  const a=multiSpecAnchor(null,p,2);expect(a).toEqual({pointing:p,telescope:2});
  expect(multiSpecAnchor(a,{ra:p.ra+deg(.2),dec:p.dec},2)).toBe(a);
  expect(multiSpecAnchor(a,{ra:p.ra,dec:p.dec-.2},2)).toBe(a);
  const moved={ra:p.ra+deg(.3),dec:p.dec};expect(multiSpecAnchor(a,moved,2)).toEqual({pointing:moved,telescope:2});
 });
 it('reloads on a telescope change and when a certified pointing is reached exactly',()=>{
  const a=multiSpecAnchor(null,p,2);expect(multiSpecAnchor(a,p,0)).toEqual({pointing:p,telescope:0});
  const coma=engineTargets.targets.find(t=>t.id==='NGC 4889')!.pointing,near=multiSpecAnchor(null,{ra:coma.ra,dec:coma.dec+.1},1);
  expect(multiSpecAnchor(near,coma,1)).toEqual({pointing:coma,telescope:1});
  const at=multiSpecAnchor(near,coma,1);expect(multiSpecAnchor(at,{ra:coma.ra,dec:coma.dec+.1},1)).toBe(at);
 });
});
