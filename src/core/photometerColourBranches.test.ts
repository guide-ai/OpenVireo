import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {attenuatePhotometerMagnitude,combinePhotometerMagnitudes,preparePhotometerBands} from './photometerSource';
import {galaxyColours} from './catalogObject';

// Front PHTILED (analysis/front-phtiled/RECOVERY.md §5): the colour branches of Start 0x4ffa30. The selected object's B−V and U−B
// are added only when below Single 30.0 (0x4ffc39, 0x4ffcb4); a neighbour's are added with no test (0x4ffe46..0x4ffed9).
describe('Start 0x4ffa30 colour branches',()=>{
 it('a colour of 30 or more skips its term for the selected object: B = R = V, U = I = B',()=>{
  const f=.5,att=(m:number)=>attenuatePhotometerMagnitude(m,f);
  const noBv=preparePhotometerBands({v:10,bMinusV:30,uMinusB:.25,fraction:f},[]);
  expect([noBv.b,noBv.r,noBv.v]).toEqual([att(10),att(10),att(10)]);expect(noBv.u).toBe(att(10.25));expect(noBv.i).toBe(att(9.75));
  const noUb=preparePhotometerBands({v:10,bMinusV:.5,uMinusB:32.767,fraction:f},[]);
  expect([noUb.u,noUb.i,noUb.b]).toEqual([att(10.5),att(10.5),att(10.5)]);expect(noUb.r).toBe(att(9.5));
 });
 it('a neighbour\'s colours are summed with no test, so a colour ≥ 30 leaves about 30 mag fainter light in that band',()=>{
  const star={v:10,bMinusV:.5,uMinusB:.25,fraction:.5},n={v:11,bMinusV:30,uMinusB:.125,fraction:1};
  const alone=preparePhotometerBands(star,[]),blend=preparePhotometerBands(star,[n]);
  expect(blend.v).toBe(combinePhotometerMagnitudes(11,alone.v));
  expect(blend.b).toBe(combinePhotometerMagnitudes(41,alone.b));expect(blend.u).toBe(combinePhotometerMagnitudes(41.125,alone.u));
  expect(blend.b).toBeLessThan(alone.b);expect(alone.b-blend.b).toBeLessThan(1e-9);
 });
 it('the bundled catalogues reach none of these branches: every QSO and every galaxy morphology has colours below 30',()=>{
  const q=readFileSync('public/original/catalogs/CLEA_QSO.DAT'),g=readFileSync('public/original/catalogs/CLEA_GLX.DAT');
  let qsos=0;for(let o=0;o+52<=q.length;o+=52){expect(q.readFloatLE(o+0x26)).toBeLessThan(30);expect(q.readFloatLE(o+0x2a)).toBeLessThan(30);qsos++;}
  const morphologies=new Set<number>();for(let o=0;o+59<=g.length;o+=59)morphologies.add(g.readInt8(o+34));
  for(const t of morphologies){const c=galaxyColours(t);expect(c,`T ${t}`).not.toBeNull();expect(c!.bv).toBeLessThan(30);expect(c!.ub).toBeLessThan(30);}
  expect(qsos).toBe(2269);expect([...morphologies].sort((a,b)=>a-b)).toEqual([-9,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,15,16,20]);
 });
});
