import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseHtl} from '../core/hotList';
import {buildTargetCatalog} from '../core/targetCatalog';
import {objectXCatalogMask} from './objectXMask';

// Front QA1 (2026-10-31, E08 identity hint): the catalogue name mask is the same set whatever the hidden target is.
describe('objectXCatalogMask',()=>{
 const rows=parseHtl(new Uint8Array(readFileSync('public/original/hotlists/ObjectX.HTL')));
 const list=rows.map(r=>({ra:r.ra,dec:r.dec}));
 const {catalog}=buildTargetCatalog({star:'',galaxy:(_i,l)=>l});
 const masked=(hidden:{ra:number;dec:number}|null,l=list as typeof list|null)=>{const m=objectXCatalogMask(l,hidden);return catalog.filter(o=>m(o)).map(o=>o.id);};
 // QA1 review 1 L3: the hidden target is always its own ObjectX.HTL row (ObjectXLab's objectXTargets), so the mask is the
 // list's alone; a position off the list (not something the app passes) changes nothing either.
 it('masks the same catalogue entries for every ObjectX.HTL target',()=>{
  const base=masked(list[0]);
  expect(base.length).toBeGreaterThan(0);
  for(const r of list)expect(masked(r)).toEqual(base);
  expect(masked({ra:(list[0].ra+3)%24,dec:0})).toEqual(base);
 });
 it('masks nothing without a target and everything before ObjectX.HTL is read',()=>{
  expect(masked(null)).toEqual([]);
  expect(masked(list[0],null)).toHaveLength(catalog.length);
 });
});
