import {describe,expect,it} from 'vitest';
import {SKY_LABEL_GAP,SKY_SAME_RING,multiSpecNumberBaseline,skyLabelBaseline,skyLabelX,skyLabelXs} from './overlayLabels';

describe('sky-map label placement (Front SKY-LABELS, web overlay)',()=>{
 it('keeps a label that fits on the right of its ring, unchanged',()=>{
  expect(skyLabelX(350,120,700)).toBe(350+SKY_LABEL_GAP);
  expect(skyLabelX(700-SKY_LABEL_GAP-120,120,700)).toBe(700-120);
 });
 it('draws a label at the right edge left of its ring, ending 13 units before it (Coma-1 at x≈691.8)',()=>{
  const x=skyLabelX(691.8128,140,700);
  expect(x+140).toBeCloseTo(691.8128-SKY_LABEL_GAP,10);
  expect(x).toBeGreaterThanOrEqual(0);
 });
 it('flips only when the left has more room; a label wider than both sides is kept inside the view, over its ring',()=>{
  expect(skyLabelX(300,690,700)).toBe(10);
  expect(skyLabelX(400,690,700)).toBe(0);
  expect(skyLabelX(20,400,700)).toBe(33);// fits on the right
  expect(skyLabelX(200,600,700)).toBe(100);// right has more room, but 213+600 leaves the view: start at 700−600
  expect(skyLabelX(600,700,700)).toBe(0);
  expect(skyLabelX(350,900,700)).toBe(0);// wider than the view: starts at the left edge
 });
 it('a flipped label never leaves the left edge, for any ring and width',()=>{
  for(let x=0;x<=700;x+=6.25)for(const w of [1,40,120,205,337,338,500,699,700])
   {const s=skyLabelX(x,w,700);expect(s).toBeGreaterThanOrEqual(0);expect(s+w).toBeLessThanOrEqual(700+1e-9);
    if(x+SKY_LABEL_GAP+w<=700)expect(s).toBe(x+SKY_LABEL_GAP);}
 });
 it('one unit past the edge flips; exactly at the edge does not',()=>{
  expect(skyLabelX(600,87,700)).toBe(613);
  expect(skyLabelX(600,88,700)).toBe(600-13-88);
 });
 it('places the labels on one ring as a group, by the widest, so they still start at the same x (the Coma-1 pair)',()=>{
  const rings=[{x:691.8128,y:399,width:105},{x:350.3091,y:349.2222,width:105},{x:691.0923,y:399.7778,width:205},{x:350,y:350,width:205}];
  const xs=skyLabelXs(rings,700);
  expect(xs[0]).toBeCloseTo(691.8128-SKY_LABEL_GAP-205,10);
  expect(xs[2]).toBeCloseTo(691.0923-SKY_LABEL_GAP-205,10);
  expect(xs[1]).toBeCloseTo(363.3091,10);// the Coma-2 pair fits: unchanged
  expect(xs[3]).toBe(363);
 });
 it('groups rings within SKY_SAME_RING on both axes, transitively, and no farther',()=>{
  expect(skyLabelXs([{x:690,y:10,width:5},{x:690+SKY_SAME_RING,y:10,width:400}],700)[0]).toBe(690-13-400);
  expect(skyLabelXs([{x:500,y:10,width:5},{x:500+SKY_SAME_RING+.01,y:10,width:400}],700)[0]).toBe(513);
  expect(skyLabelXs([{x:500,y:10,width:5},{x:500,y:10+SKY_SAME_RING+.01,width:400}],700)[0]).toBe(513);
  expect(skyLabelXs([{x:500,y:10,width:5},{x:502.5,y:10,width:5},{x:505,y:10,width:400}],700)[0]).toBe(500-13-400);
 });
 it('a group whose short label would fit still flips with its wide one; unmeasured labels (width 0) never move',()=>{
  expect(skyLabelXs([{x:600,y:10,width:10},{x:600,y:10,width:120}],700)).toEqual([600-13-120,600-13-120]);
  expect(skyLabelXs([{x:695,y:10,width:0}],700)).toEqual([708]);
 });
 it('decides a group once, so rings that straddle the edge threshold are not split across their ring',()=>{
  // alone, the ring at 600 fits (613+87=700) and the one at 602 flips (615+87>700)
  expect(skyLabelX(600,87,700)).toBe(613);expect(skyLabelX(602,87,700)).toBe(602-13-87);
  expect(skyLabelXs([{x:600,y:10,width:87},{x:602,y:10,width:87}],700)).toEqual([600-13-87,602-13-87]);
 });
 it('a masked or unmeasured ring (width 0) joins no group: it cannot link two drawn rings or move them',()=>{
  const xs=skyLabelXs([{x:500,y:10,width:5},{x:502.5,y:10,width:0},{x:505,y:10,width:400}],700);
  expect(xs).toEqual([513,515.5,505-13-400]);
 });
 it('labels of unrelated rings are placed independently',()=>{
  expect(skyLabelXs([{x:690,y:100,width:50},{x:100,y:100,width:50},{x:690,y:110,width:5}],700)).toEqual([690-13-50,113,690-13-5]);
 });
});

describe('sky-map label baseline (Front SKY-LABELS, web overlay)',()=>{
 it('is y+4 when the measured box fits, and unmoved when not measured',()=>{
  for(const y of [9,100,350,693])expect(skyLabelBaseline(y,700,13,3)).toBe(y+4);
  expect(skyLabelBaseline(0,700,0,0)).toBe(4);expect(skyLabelBaseline(699,700,0,0)).toBe(703);
 });
 it('keeps the whole font box inside the view near the top and bottom edges',()=>{
  for(const [a,d] of [[10,3],[13,3],[15,4]])for(let y=0;y<=700;y+=.5)
   {const b=skyLabelBaseline(y,700,a,d);expect(b-a).toBeGreaterThanOrEqual(0);expect(b+d).toBeLessThanOrEqual(700);}
  expect(skyLabelBaseline(2,700,13,3)).toBe(13);expect(skyLabelBaseline(699,700,13,3)).toBe(697);
 });
});

describe('Multi-Spec selection number baseline (Front SKY-LABELS [W])',()=>{
 it('is y+4 away from the edges',()=>{
  for(const y of [7,100,156,305])expect(multiSpecNumberBaseline(y,312,11)).toBe(y+4);
 });
 it('stays at least one font size from the top, so a selection at y=4 keeps the whole number',()=>{
  expect(multiSpecNumberBaseline(4,312,11)).toBe(11);
  expect(multiSpecNumberBaseline(0,312,11)).toBe(11);
 });
 it('stays 3 units above the bottom edge',()=>{
  expect(multiSpecNumberBaseline(311,312,11)).toBe(309);
  expect(multiSpecNumberBaseline(306,312,11)).toBe(309);
 });
});
