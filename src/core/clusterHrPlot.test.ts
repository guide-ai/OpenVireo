import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import contract from '../../data/photometry/cluster-comparison-contract.json';
import witness from './clusterHr.witness.json';
import {CLUSTER_HR_IMAGE,clusterHrCurvePixel,clusterHrIsochronePolyline,clusterHrPixel,clusterHrPixelInFrame,clusterHrPlotModel,clusterHrZamsPolyline,roundHalfEven} from './clusterHrPlot';

// Witness: research analysis/front-v2-cluster-hr/tools/hr_witness.py (pinned below); a second implementation of the same
// static reading, so it checks the port, not the reading.
type Point={id:string;bMinusV:number;v:number};
const data=(file:string)=>JSON.parse(readFileSync(new URL(`../../data/photometry/${file}`,import.meta.url),'utf8')) as Point[];
type W={count:number;outsideFrame:{id:string;x:number;y:number}[];outsideBitmap:string[]};
const datasets=witness.datasets as Record<string,W>;

describe('database HR plot extent (0x542bf4, Display1 496×506 [I])',()=>{
 it('pins the witness script',()=>{expect(witness.source.witnessSha256).toBe('bf571685bab2099e3d52d8cf45b408b5ab475d2c024c00ae390accadaaa3b85c');});
 it('draws every point with no frame clip; the out-of-frame and off-bitmap points equal the witness for all 16 datasets',()=>{
  expect(Object.keys(datasets)).toHaveLength(16);
  let outside=0,off=0;
  for(const [file,w] of Object.entries(datasets)){
   const pts=data(file),model=clusterHrPlotModel(pts);
   expect(pts).toHaveLength(w.count);expect(model.drawn).toBe(w.count);expect(model.countLabel).toBe(`# of Stars: ${w.count}`);
   expect(model.points.filter(p=>!p.inFrame).map(p=>({id:p.point.id,x:p.x,y:p.y})),file).toEqual(w.outsideFrame);
   expect(model.points.filter(p=>!p.onImage).map(p=>p.point.id),file).toEqual(w.outsideBitmap);
   outside+=model.outsideFrame;off+=model.offImage;
  }
  expect([outside,off]).toEqual([9,4]);
 });
 it('rounds half to even on the stored Single values',()=>{
  expect([roundHalfEven(2.5),roundHalfEven(3.5),roundHalfEven(-2.5),roundHalfEven(-0.4)]).toEqual([2,4,-2,0]);
  expect(Object.is(roundHalfEven(-0.4),-0)).toBe(false);
  // B−V 0.0125 → (0.0125 Single + 0.5)·120 = 61.5000004… rounds up; the Single matters.
  expect(clusterHrPixel({bMinusV:0.0125,v:2})).toEqual({x:142,y:15});
  expect(clusterHrPixel({bMinusV:-0.5,v:18})).toEqual({x:80,y:463});
  expect(clusterHrPixelInFrame({x:80,y:463})).toBe(true);expect(clusterHrPixelInFrame({x:79,y:463})).toBe(false);
  expect(CLUSTER_HR_IMAGE).toEqual({width:496,height:506});
 });
 it('keeps only in-frame ZAMS nodes (0x543940) and every isochrone node',()=>{
  const nodes=[{color:-0.6,v:5},{color:0,v:5},{color:3,v:10},{color:1,v:10},{color:1,v:19}];
  expect(clusterHrZamsPolyline(nodes)).toEqual([{x:140,y:99},{x:260,y:239}]);
  expect(clusterHrIsochronePolyline(nodes).map(p=>p.x)).toEqual([68,140,500,260,260]);
  expect(clusterHrCurvePixel({color:0.0125,v:2})).toEqual({x:141,y:15});// binary64 (not Single): 61.4999… → 61
 });
});

describe('Set E(B-V) gate arithmetic (0x543a32–0x543a75, option +0x2e90, compiled default 1)',()=>{
 it('Round(E Single × 100) is the catalogue preset tick for all 16 clusters',()=>{
  expect(contract.clusters).toHaveLength(16);
  for(const c of contract.clusters)expect(roundHalfEven(Math.fround(c.catalogEbvSingle)*100),c.id).toBe(c.presetEbvTicks);
 });
});
