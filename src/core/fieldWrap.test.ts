import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {admitFieldGalaxies,fieldGuardPositions,fieldAreaWraps,fieldQsoMatches,fieldSubAreas,FieldEngineError,freshFieldArea,orderedFieldVariables,QSO_LAST_RA_BELOW_12} from './fieldEngine';
import {nativeNonwrappedRegionOverlap,nativeRegionIds,nativeRegionOverlap} from './pinnedNativeField';
import {nativePhotographInArea} from './lssLists';
import {GLX_CATALOG} from './glxCatalog';
import {packCovers,type FieldPack} from './fieldPack';
import {CATALOG_MAXIMUM_RA} from './catalogMerge';

// Front G G1b (analysis/front-g-gsc/RE-wrap-polar-consumers.md §G-RE1, §G-RE2): fields across 0 h and near the poles, by the
// recovered rules of 0x53be70, 0x5978c0, 0x597ac8, 0x5987e4/0x59677c, 0x598acc and 0x596b1c.
const glx=new Uint8Array(readFileSync('public/original/catalogs/CLEA_GLX.DAT'));
const qso=new Uint8Array(readFileSync('public/original/catalogs/CLEA_QSO.DAT'));
const area=(minimumRa:number,maximumRa:number,minimumDec:number,maximumDec:number)=>({minimumRa,maximumRa,minimumDec,maximumDec,limitingMagnitude:20});

describe('area folding (0x53be70)',()=>{
 it('folds each RA bound once, leaves Dec unclamped, and types as polar only a folded bound outside 0..24 h (a web limit)',()=>{
  const a=freshFieldArea({ra:0.01,dec:30}),hr=.375/(Math.cos(30*Math.PI/180)*15);
  expect(a.minimumRa).toBe(0.01-hr+24);expect(a.maximumRa).toBe(0.01+hr);expect(fieldAreaWraps(a)).toBe(true);
  const b=freshFieldArea({ra:23.99,dec:-30});expect(b.maximumRa).toBe(23.99+hr-24);expect(fieldAreaWraps(b)).toBe(true);
  expect(fieldAreaWraps(freshFieldArea({ra:12,dec:0}))).toBe(false);
  // Dec 89.7: half-width 4.77 h. Around RA 6 the bounds stay in 0..24; around RA 3 the minimum folds (3 − 4.77 + 24) and the
  // field wraps. The Dec bounds pass +90 unclamped.
  const p=freshFieldArea({ra:6,dec:89.7});expect(p.maximumDec).toBeCloseTo(90.075,12);expect(fieldAreaWraps(p)).toBe(false);
  expect(fieldAreaWraps(freshFieldArea({ra:3,dec:89.7}))).toBe(true);
  // Polar only when a folded bound leaves 0..24 (review 1 L1). At RA 3 h that needs a half-width above 27 h (|Dec| > 89.947°);
  // half-widths of 12–24 h are ported (the folded interval is VIREO's, not the sky's).
  for(const dec of [89.95,89.99,90,-89.99,-90])expect(()=>freshFieldArea({ra:3,dec}),String(dec)).toThrow(new FieldEngineError('polar'));
  const odd=freshFieldArea({ra:3,dec:89.9});// half-width 14.32 h: [12.68, 17.32], not containing RA 3 h
  expect(odd.minimumRa).toBeCloseTo(12.676,3);expect(odd.maximumRa).toBeCloseTo(17.324,3);expect(fieldAreaWraps(odd)).toBe(false);
  expect(fieldAreaWraps(freshFieldArea({ra:12,dec:89.93}))).toBe(true);
  for(const p of [{ra:24,dec:0},{ra:-1,dec:0},{ra:1,dec:90.1},{ra:NaN,dec:0}])expect(()=>freshFieldArea(p)).toThrow(new FieldEngineError('input'));
 });
 it('splits a wrapped area into [min, 24] then [0, max] (0x597ac8) and leaves others whole',()=>{
  const a=freshFieldArea({ra:0.01,dec:30});
  expect(fieldSubAreas(a)).toEqual([{...a,maximumRa:24},{...a,minimumRa:0}]);
  const b=freshFieldArea({ra:12,dec:30});expect(fieldSubAreas(b)).toEqual([b]);
 });
});

describe('region overlap wrap branch (0x5978c0)',()=>{
 it('equals the nonwrapped branch for an ordinary area and uses the 12 h rule for a wrapped one',()=>{
  const r=(minimumRa:number,maximumRa:number)=>({minimumRa,maximumRa,minimumDec:0,maximumDec:10});
  const ordinary=area(5,6,1,2);for(const reg of [r(4,5),r(4,5.0001),r(5.9,7),r(6,7)])expect(nativeRegionOverlap(ordinary,reg)).toBe(nativeNonwrappedRegionOverlap(ordinary,reg));
  const w=area(23.9,0.1,1,2);
  expect(nativeRegionOverlap(w,r(0,0.5))).toBe(true);// starts below 12 h: max 0.1 > 0
  expect(nativeRegionOverlap(w,r(0.1,0.5))).toBe(false);// strict
  expect(nativeRegionOverlap(w,r(23.5,24))).toBe(true);// starts at or above 12 h: min 23.9 < 24
  expect(nativeRegionOverlap(w,r(23.5,23.9))).toBe(false);
  // The 12 h rule, not geometry: a region 11.9..12.5 starts below 12 h, so it is tested only against max (0.1 > 11.9 fails) and
  // is not selected although the area's min..24 side (12.2..24) overlaps it.
  expect(nativeRegionOverlap(area(12.2,0.1,1,2),r(11.9,12.5))).toBe(false);
  expect(nativeRegionOverlap(area(12.2,0.1,1,2),r(12,12.5))).toBe(true);
  expect(nativeRegionOverlap(w,{...r(0,0.5),minimumDec:2,maximumDec:3})).toBe(false);// Dec strict in both branches
 });
 it('selects the regions on both sides of 0 h, and a pole-crossing area is accepted',()=>{
  const ids=nativeRegionIds(freshFieldArea({ra:0.005,dec:10}));expect(ids.length).toBeGreaterThan(1);
  expect(nativeRegionIds(freshFieldArea({ra:3,dec:89.8})).length).toBeLessThanOrEqual(12);
 });
});

describe('variables, QSOs, galaxies and photographs of a wrapped field',()=>{
 const a=freshFieldArea({ra:0.01,dec:20});
 it('reads variables [min, 24] first, then [0, max], each in file order (0x5981a0 twice)',()=>{
  const v=[{ra:0.001,dec:20,magnitude:10,id:1},{ra:0.02,dec:20,magnitude:10,id:2},{ra:23.99,dec:20,magnitude:10,id:3},{ra:12,dec:20,magnitude:10,id:4},{ra:23.995,dec:20,magnitude:21,id:5}];
  expect(orderedFieldVariables(v,a).map(x=>x.id)).toEqual([3,1,2]);
 });
 it('admits QSOs from the 0 h side only while a record with max < RA < 12 h exists (0x5987e4)',()=>{
  // Pinned: the last CLEA_QSO.DAT RA below 12 h, in record (= RA) order.
  const v=new DataView(qso.buffer);let last=-1,previous=-1;
  for(let i=0;i<qso.byteLength/52;i++){const ra=v.getFloat64(i*52+0x12,true);expect(ra).toBeGreaterThanOrEqual(previous);previous=ra;if(ra<12)last=ra;}
  expect(QSO_LAST_RA_BELOW_12).toBe(last);
  const e=[{index:1,ra:0.005,dec:20},{index:2,ra:23.995,dec:20},{index:3,ra:0.5,dec:20}];
  expect(fieldQsoMatches(e,a)).toEqual([1]);
  // Without a stopping record (max at or above the last RA below 12 h) the scan reaches the min..24 side too.
  expect(fieldQsoMatches(e,area(23.99,11.996,0,30))).toEqual([1,2,3]);
  expect(fieldQsoMatches(e,area(0,0.01,0,30))).toEqual([1]);
 });
 it('pins the largest stored galaxy RA (53 records above 24 h; review 1 M1)',()=>{
  const v=new DataView(glx.buffer);let max=0,above=0;for(let i=0;i<GLX_CATALOG.records;i++){const ra=v.getFloat64(i*59,true);max=Math.max(max,ra);if(ra>24)above++;}
  expect(CATALOG_MAXIMUM_RA).toBe(max);expect(above).toBe(53);
 });
 it('keeps the 0 h-side QSOs of a wrapped field in the Front T guard (review 1 M2)',()=>{
  const e=[{index:1,ra:0.005,dec:20},{index:2,ra:23.995,dec:20},{index:3,ra:5,dec:20}],g=[{ra:23.99,dec:20}];
  expect(fieldGuardPositions(g,e,a)).toEqual([g[0],e[0]]);
  const plain=freshFieldArea({ra:5,dec:20});expect(fieldGuardPositions([],e,plain)).toEqual([e[2]]);
 });
 it('covers a wrapped area only with a coverage spanning RA 0..24 (review 1 L4)',()=>{
  const pointing={ra:0.01,dec:20},pack=(c:{minimumRa:number;maximumRa:number})=>({pointings:[pointing],coverage:{...c,minimumDec:19,maximumDec:21}}) as unknown as FieldPack;
  expect(packCovers(pack({minimumRa:0,maximumRa:24}),pointing,a)).toBe(true);
  expect(packCovers(pack({minimumRa:0,maximumRa:23.99}),pointing,a)).toBe(false);expect(packCovers(pack({minimumRa:23.9,maximumRa:24}),pointing,a)).toBe(false);
  const plain=freshFieldArea({ra:5,dec:20});expect(packCovers({...pack({minimumRa:4.9,maximumRa:5.1}),pointings:[{ra:5,dec:20}]} as FieldPack,{ra:5,dec:20},plain)).toBe(true);
 });
 it('reads galaxies in two passes: [0, max] from record 0, then from the RA index entry for min (0x598acc)',()=>{
  const w=area(23.8,0.3,-5,60),r=admitFieldGalaxies(glx,w),v=new DataView(glx.buffer);
  const ra=(i:number)=>v.getFloat64(i*59,true),dec=(i:number)=>v.getFloat64(i*59+8,true),mag=(i:number)=>v.getFloat32(i*59+24,true);
  const ok=(i:number)=>dec(i)>=-5&&dec(i)<=60&&!(Math.fround(mag(i))>Math.fround(20));
  const low=[],high=[];for(let i=0;i<GLX_CATALOG.records;i++){if(ra(i)<=0.3&&ok(i))low.push(i);if(ra(i)>=23.8&&ok(i))high.push(i);}
  expect(low.length).toBeGreaterThan(0);expect(high.length).toBeGreaterThan(0);
  expect(r.admission).toEqual([...low,...high]);
  // The list is the cursor insert of that read order: ascending RA overall from the 0 h side's last insert.
  expect(r.galaxies).toHaveLength(low.length+high.length);
  // A wrapped area whose minimum is below 12 h (a pole-folded field): pass 2 starts at the index entry for min and stops at
  // the first record below 12 h past max, so nothing from that side is admitted.
  const folded=admitFieldGalaxies(glx,area(10,5,80,91));
  for(const i of folded.admission)expect(ra(i)).toBeLessThanOrEqual(5);
 });
 it('matches photographs in a wrapped field by RA ≥ min or RA ≤ max, inclusive (0x596b1c)',()=>{
  const w=area(23.9,0.1,0,1);
  expect([0,0.1,23.9,23.95].map(ra=>nativePhotographInArea({ra,dec:0.5},w))).toEqual([true,true,true,true]);
  expect([0.10001,12,23.89].map(ra=>nativePhotographInArea({ra,dec:0.5},w))).toEqual([false,false,false]);
  expect(nativePhotographInArea({ra:5,dec:1},area(5,6,0,1))).toBe(true);
 });
});
